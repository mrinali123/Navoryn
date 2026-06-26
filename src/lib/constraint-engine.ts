/**
 * Constraint Engine — deterministic rule layer between AI output and DB save.
 *
 * Pipeline position: AFTER JSON parse → BEFORE geocoding → BEFORE DB write.
 *
 * Rules applied (in order):
 *   1. Deduplicate places  — same name twice in one day is removed
 *   2. Time windows        — delegates to itinerary-validator (scheduling repair)
 *   3. Meal completeness   — each day must have breakfast, lunch, dinner
 *   4. Structural check    — no day may end up with 0 places (flags needsReview)
 *
 * Post-geocoding rule (call checkTravelFeasibility after geocodeItinerary):
 *   5. Travel feasibility  — consecutive places that are physically unreachable in
 *                            the available time window are logged as warnings.
 */

import type { GeneratedItinerary, Meal } from "@/types/trip";
import type { TripFormData } from "@/types/trip";
import { validateAndRepairItinerary } from "@/lib/itinerary-validator";
import { parseTime, computeDay1Start, computeLastDayEnd } from "@/lib/itinerary-scheduler";

type MealType = "breakfast" | "lunch" | "dinner";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ConstraintViolation {
  rule: string;
  day: number;
  detail: string;
  autoFixed: boolean;
}

export interface ConstraintResult {
  /** true when no unfixable violations remain after all rules */
  passed: boolean;
  /** true when at least one day has 0 places and cannot be auto-repaired */
  needsReview: boolean;
  /** true when at least one issue was automatically corrected */
  autoFixed: boolean;
  violations: ConstraintViolation[];
  /** Human-readable list of every correction made — use for structured logging */
  fixLog: string[];
  repaired: GeneratedItinerary;
}

export interface TravelFeasibilityIssue {
  day: number;
  from: string;
  to: string;
  distanceKm: number;
  availableMinutes: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Rule 1 — Deduplicate places within the same day
// ---------------------------------------------------------------------------

function deduplicatePlaces(
  itinerary: GeneratedItinerary,
  violations: ConstraintViolation[],
  fixLog: string[]
): GeneratedItinerary {
  const days = itinerary.days.map((day) => {
    const seen = new Set<string>();
    const deduped = day.places.filter((place) => {
      const key = place.name.trim().toLowerCase();
      if (seen.has(key)) {
        violations.push({
          rule: "no-duplicate-places",
          day: day.day_number,
          detail: `Duplicate place removed: "${place.name}"`,
          autoFixed: true,
        });
        fixLog.push(`Day ${day.day_number}: Removed duplicate place "${place.name}"`);
        return false;
      }
      seen.add(key);
      return true;
    });
    return { ...day, places: deduped };
  });
  return { ...itinerary, days };
}

// ---------------------------------------------------------------------------
// Rule 3 — Each day must have breakfast, lunch, and dinner
// ---------------------------------------------------------------------------

const FALLBACK_MEAL_TEMPLATES: Record<MealType, Omit<Meal, "meal_type" | "suggested_time">> = {
  breakfast: {
    restaurant_name: "Local café",
    cuisine: "Local",
    price_range: "Budget-friendly",
    specialty: "Fresh local breakfast",
    area: "Near hotel",
    best_for: "All travelers",
  },
  lunch: {
    restaurant_name: "Local restaurant",
    cuisine: "Local",
    price_range: "Moderate",
    specialty: "Regional lunch specialties",
    area: "Near sightseeing area",
    best_for: "All travelers",
  },
  dinner: {
    restaurant_name: "Local restaurant",
    cuisine: "Local",
    price_range: "Moderate",
    specialty: "Regional dinner specialties",
    area: "City centre",
    best_for: "All travelers",
  },
};

const MEAL_DEFAULTS: Record<MealType, string> = {
  breakfast: "8:00 AM",
  lunch:     "12:30 PM",
  dinner:    "7:00 PM",
};

const MEAL_ORDER: Record<MealType, number> = { breakfast: 0, lunch: 1, dinner: 2 };

function ensureMealsComplete(
  itinerary: GeneratedItinerary,
  violations: ConstraintViolation[],
  fixLog: string[]
): GeneratedItinerary {
  const days = itinerary.days.map((day) => {
    const meals = Array.isArray(day.meals) ? [...day.meals] : [];
    const present = new Set(meals.map((m) => m.meal_type));

    const missing: MealType[] = (["breakfast", "lunch", "dinner"] as MealType[]).filter(
      (t) => !present.has(t)
    );

    for (const mealType of missing) {
      meals.push({
        meal_type: mealType,
        suggested_time: MEAL_DEFAULTS[mealType],
        ...FALLBACK_MEAL_TEMPLATES[mealType],
      });
      violations.push({
        rule: "meal-completeness",
        day: day.day_number,
        detail: `Missing ${mealType} — injected fallback at ${MEAL_DEFAULTS[mealType]}`,
        autoFixed: true,
      });
      fixLog.push(
        `Day ${day.day_number}: Injected fallback ${mealType} at ${MEAL_DEFAULTS[mealType]}`
      );
    }

    meals.sort((a, b) => (MEAL_ORDER[a.meal_type] ?? 0) - (MEAL_ORDER[b.meal_type] ?? 0));

    return { ...day, meals };
  });

  return { ...itinerary, days };
}

// ---------------------------------------------------------------------------
// Rule 4 — Structural integrity: no day may have 0 places after repair
//
// Exceptions (legitimate empty days — should NOT trigger regeneration):
//   • Day 1 when day1Floor ≥ 21:00 — the traveller arrives after 9 PM,
//     there is genuinely no time for activities.
//   • Last day when lastDayCeil ≤ 8:00 — the traveller departs before 8 AM,
//     there is genuinely no time for activities.
//   • Single-day trip where day1Floor ≥ lastDayCeil — the activity window is
//     inverted (e.g., arrive 2 PM, depart 1 PM same day → impossible window).
// ---------------------------------------------------------------------------

// Minutes-since-midnight thresholds for "travel day" detection
const LATE_ARRIVAL_FLOOR    = 21 * 60; // 9 PM
const EARLY_DEPARTURE_CEIL  =  8 * 60; // 8 AM

function checkStructuralIntegrity(
  itinerary: GeneratedItinerary,
  data: TripFormData,
  violations: ConstraintViolation[]
): boolean {
  const numDays     = itinerary.days.length;
  const day1Floor   = computeDay1Start(data);
  const lastDayCeil = computeLastDayEnd(data);

  let needsReview = false;

  for (const day of itinerary.days) {
    if (!day.places || day.places.length === 0) {
      const isDay1    = day.day_number === 1;
      const isLastDay = day.day_number === numDays;

      const isLateArrival     = isDay1    && day1Floor   >= LATE_ARRIVAL_FLOOR;
      const isEarlyDeparture  = isLastDay && lastDayCeil <= EARLY_DEPARTURE_CEIL;
      const isInvertedWindow  = isDay1    && isLastDay   && day1Floor >= lastDayCeil;

      if (isLateArrival || isEarlyDeparture || isInvertedWindow) {
        // Legitimate empty day — log as auto-resolved, do not block generation.
        const reason = isInvertedWindow
          ? `inverted activity window (floor ${day1Floor} ≥ ceil ${lastDayCeil})`
          : isLateArrival
          ? `late arrival (day 1 starts at ${day1Floor} min, ≥ threshold ${LATE_ARRIVAL_FLOOR})`
          : `early departure (last day ends at ${lastDayCeil} min, ≤ threshold ${EARLY_DEPARTURE_CEIL})`;
        violations.push({
          rule:      "minimum-places",
          day:       day.day_number,
          detail:    `Day ${day.day_number} has 0 places — accepted as travel day (${reason})`,
          autoFixed: true,
        });
      } else {
        violations.push({
          rule:      "minimum-places",
          day:       day.day_number,
          detail:    `Day ${day.day_number} has 0 scheduled places and cannot be auto-repaired`,
          autoFixed: false,
        });
        needsReview = true;
      }
    }
  }
  return needsReview;
}

// ---------------------------------------------------------------------------
// Rule 5 (post-geocoding) — Travel feasibility between consecutive places
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Conservative city travel speed assumption (taxi in traffic)
const MAX_CITY_SPEED_KMH = 40;

/**
 * Run after geocodeItinerary() — checks that consecutive places in a day are
 * physically reachable within the time gap the itinerary allocates.
 *
 * Returns warnings only — does not modify the itinerary.
 */
export function checkTravelFeasibility(itinerary: GeneratedItinerary): TravelFeasibilityIssue[] {
  const issues: TravelFeasibilityIssue[] = [];

  for (const day of itinerary.days) {
    const geocoded = day.places.filter((p) => p.lat && p.lng && p.lat !== 0 && p.lng !== 0);

    for (let i = 0; i < geocoded.length - 1; i++) {
      const a = geocoded[i];
      const b = geocoded[i + 1];

      const distKm = haversineKm(a.lat, a.lng, b.lat, b.lng);
      if (distKm < 1) continue; // walking distance — always fine

      const aEndMins   = parseTime(a.best_time) + (a.duration_minutes ?? 60);
      const bStartMins = parseTime(b.best_time);
      const gapMinutes = bStartMins - aEndMins;

      const minTravelMins = (distKm / MAX_CITY_SPEED_KMH) * 60;

      if (gapMinutes < minTravelMins) {
        issues.push({
          day:              day.day_number,
          from:             a.name,
          to:               b.name,
          distanceKm:       Math.round(distKm * 10) / 10,
          availableMinutes: Math.round(gapMinutes),
          message: `Day ${day.day_number}: "${a.name}" → "${b.name}" is ${Math.round(distKm)}km but only ${Math.round(gapMinutes)} min available (need ≥ ${Math.ceil(minTravelMins)} min at ${MAX_CITY_SPEED_KMH} km/h)`,
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all pre-save constraint rules against an AI-generated itinerary.
 *
 * Call order in the pipeline:
 *   1. runConstraintEngine()   → before geocoding, before DB write
 *   2. geocodeItinerary()
 *   3. checkTravelFeasibility() → logs warnings, does not block save
 */
export function runConstraintEngine(
  itinerary: GeneratedItinerary,
  data: TripFormData
): ConstraintResult {
  const violations: ConstraintViolation[] = [];
  const fixLog: string[] = [];
  let working = itinerary;

  // Rule 1: remove duplicate places
  working = deduplicatePlaces(working, violations, fixLog);

  // Rule 2: time window validation + scheduling repair (existing validator)
  const { repaired: timeRepaired, issues: timeIssues } = validateAndRepairItinerary(working, data);
  working = timeRepaired;

  for (const issue of timeIssues) {
    violations.push({
      rule: issue.type,
      day: issue.day,
      detail: issue.detail,
      autoFixed: issue.repaired,
    });
    if (issue.repaired) {
      fixLog.push(`Day ${issue.day}: ${issue.detail}`);
    }
  }

  // Rule 3: inject missing meals
  working = ensureMealsComplete(working, violations, fixLog);

  // Rule 4: flag empty days (triggers regeneration unless they are travel-day edges)
  const needsReview = checkStructuralIntegrity(working, data, violations);

  const unfixedViolations = violations.filter((v) => !v.autoFixed);

  return {
    passed:      unfixedViolations.length === 0,
    needsReview,
    autoFixed:   fixLog.length > 0,
    violations,
    fixLog,
    repaired:    working,
  };
}
