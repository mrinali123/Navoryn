import { describe, it, expect } from "vitest";
import {
  runConstraintEngine,
  checkTravelFeasibility,
} from "@/lib/constraint-engine";
import type { GeneratedItinerary, Place } from "@/types/trip";
import type { TripFormData } from "@/types/trip";

// ---------------------------------------------------------------------------
// Minimal fixtures
//
// BASE_FORM uses early arrival (07:00) + late checkout (22:00) + late departure
// (23:59) so the day window [floor=08:30, ceiling=22:29] easily accommodates
// all test places.  We use type:"activity" (window 8:00–12:00 / 14:00–18:00)
// to avoid triggering midday / golden-hour rules that are specific to landmarks.
// ---------------------------------------------------------------------------

const BASE_FORM: TripFormData = {
  destination: "Paris",
  arrivalDate: "2026-08-01",
  arrivalTime: "07:00",        // floor = 07:00 + 60-min buffer = 08:00
  departureDate: "2026-08-01", // same-day trip keeps it simple
  departureTime: "23:59",      // ceiling = 23:59 − 90-min buffer = 22:29
  numTravelers: 2,
  tripPurpose: "tourism",
  hotelName: "Hotel Test",
  hotelAddress: "1 Rue Test, Paris",
  checkInTime: "08:00",        // 08:00 + 30-min buffer = 08:30 → this is the final floor
  checkOutTime: "22:00",       // ceiling from checkout = 22:00 → min(22:00, 22:29) = 22:00
  budgetLevel: "mid-range",
  interests: ["Art & Museums"],
  pace: "balanced",
  mustVisit: "",
  dietaryPrefs: [],
};

// All places use type "activity" — windows 08:00–12:00 (morning) and 14:00–18:00
// (afternoon), no avoidMidday rule, so times like "10:00 AM" and "2:00 PM" are valid.
function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    order: 1,
    name: "Eiffel Tower",
    type: "activity",
    best_time: "10:00 AM",
    duration_minutes: 90,
    description: "Test place",
    tips: "",
    lat: 48.8584,
    lng: 2.2945,
    estimated_cost: "€0",
    ...overrides,
  };
}

function makeItinerary(
  days: GeneratedItinerary["days"]
): GeneratedItinerary {
  return {
    trip_title: "Paris Test Trip",
    estimated_budget: "€500",
    general_tips: ["Stay hydrated"],
    days,
  };
}

/** A complete set of all three meals (used in most tests to isolate non-meal rules). */
const FULL_MEALS: NonNullable<GeneratedItinerary["days"][number]["meals"]> = [
  { meal_type: "breakfast", restaurant_name: "Café A", cuisine: "French", price_range: "Budget", specialty: "Croissant", area: "Hotel", best_for: "All" },
  { meal_type: "lunch",     restaurant_name: "Brasserie B", cuisine: "French", price_range: "Mid", specialty: "Steak", area: "Center", best_for: "All" },
  { meal_type: "dinner",    restaurant_name: "Bistro C", cuisine: "French", price_range: "Mid", specialty: "Duck", area: "Center", best_for: "All" },
];

// ---------------------------------------------------------------------------
// Rule 1 — Deduplication
// ---------------------------------------------------------------------------

describe("Rule 1 — deduplication", () => {
  it("removes a duplicate place name within the same day", () => {
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Exploration",
        daily_notes: "",
        places: [
          makePlace({ order: 1, name: "Eiffel Tower", best_time: "10:00 AM" }),
          makePlace({ order: 2, name: "Eiffel Tower", best_time: "11:30 AM" }), // duplicate — should be removed
          makePlace({ order: 3, name: "Louvre Museum", best_time: "2:00 PM" }),
        ],
        meals: FULL_MEALS,
      },
    ]);

    const result = runConstraintEngine(itinerary, BASE_FORM);

    // After dedup, only 2 unique places remain
    expect(result.repaired.days[0].places).toHaveLength(2);
    expect(result.autoFixed).toBe(true);

    const dupViolation = result.violations.find((v) => v.rule === "no-duplicate-places");
    expect(dupViolation).toBeDefined();
    expect(dupViolation?.autoFixed).toBe(true);
    expect(dupViolation?.detail).toContain("Eiffel Tower");
  });

  it("is case-insensitive — treats 'eiffel tower' and 'Eiffel Tower' as the same place", () => {
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [
          makePlace({ order: 1, name: "Eiffel Tower", best_time: "10:00 AM" }),
          makePlace({ order: 2, name: "eiffel tower", best_time: "11:30 AM" }), // same after lowercasing
        ],
        meals: FULL_MEALS,
      },
    ]);

    const result = runConstraintEngine(itinerary, BASE_FORM);
    expect(result.repaired.days[0].places).toHaveLength(1);
  });

  it("preserves places with the same name across different days", () => {
    const form: TripFormData = { ...BASE_FORM, departureDate: "2026-08-02" };

    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [makePlace({ order: 1, name: "Seine River Walk", best_time: "10:00 AM" })],
        meals: FULL_MEALS,
      },
      {
        day_number: 2,
        date: "2026-08-02",
        theme: "Day 2",
        daily_notes: "",
        places: [makePlace({ order: 1, name: "Seine River Walk", best_time: "10:00 AM" })],
        meals: FULL_MEALS,
      },
    ]);

    const result = runConstraintEngine(itinerary, form);

    // Cross-day dedup is NOT applied — both days keep their place
    expect(result.repaired.days[0].places).toHaveLength(1);
    expect(result.repaired.days[1].places).toHaveLength(1);

    const dupViolations = result.violations.filter((v) => v.rule === "no-duplicate-places");
    expect(dupViolations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Rule 3 — Meal injection
// ---------------------------------------------------------------------------

describe("Rule 3 — meal injection", () => {
  it("injects all three meals when none are present", () => {
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [makePlace()],
        meals: [], // completely empty
      },
    ]);

    const result = runConstraintEngine(itinerary, BASE_FORM);
    const meals = result.repaired.days[0].meals ?? [];

    expect(meals).toHaveLength(3);
    const types = meals.map((m) => m.meal_type).sort();
    expect(types).toEqual(["breakfast", "dinner", "lunch"]);

    const mealViolations = result.violations.filter((v) => v.rule === "meal-completeness");
    expect(mealViolations).toHaveLength(3);
    expect(mealViolations.every((v) => v.autoFixed)).toBe(true);
  });

  it("injects only the missing meal when dinner is absent", () => {
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [makePlace()],
        meals: [
          { meal_type: "breakfast", restaurant_name: "Café", cuisine: "French", price_range: "Budget", specialty: "Croissant", area: "Hotel", best_for: "All" },
          { meal_type: "lunch",     restaurant_name: "Brasserie", cuisine: "French", price_range: "Mid", specialty: "Steak", area: "Center", best_for: "All" },
          // dinner intentionally missing
        ],
      },
    ]);

    const result = runConstraintEngine(itinerary, BASE_FORM);
    const meals = result.repaired.days[0].meals ?? [];

    expect(meals).toHaveLength(3);
    const injected = result.violations.find(
      (v) => v.rule === "meal-completeness" && v.detail.includes("dinner")
    );
    expect(injected).toBeDefined();
    expect(injected?.autoFixed).toBe(true);
  });

  it("does not inject meals when all three are already present", () => {
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [makePlace()],
        meals: FULL_MEALS,
      },
    ]);

    const result = runConstraintEngine(itinerary, BASE_FORM);
    const mealViolations = result.violations.filter((v) => v.rule === "meal-completeness");

    expect(mealViolations).toHaveLength(0);
    expect(result.repaired.days[0].meals).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Rule 4 — Structural integrity (empty day)
// ---------------------------------------------------------------------------

describe("Rule 4 — structural integrity", () => {
  it("sets needsReview and fails passed when a day has 0 places", () => {
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Empty Day",
        daily_notes: "",
        places: [], // nothing — cannot be auto-repaired
        meals: FULL_MEALS,
      },
    ]);

    const result = runConstraintEngine(itinerary, BASE_FORM);

    expect(result.needsReview).toBe(true);
    expect(result.passed).toBe(false);

    const structViolation = result.violations.find((v) => v.rule === "minimum-places");
    expect(structViolation).toBeDefined();
    expect(structViolation?.autoFixed).toBe(false);
  });

  it("passes with needsReview=false when all days have at least one place", () => {
    const form: TripFormData = { ...BASE_FORM, departureDate: "2026-08-02" };

    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [makePlace({ best_time: "10:00 AM" })],
        meals: FULL_MEALS,
      },
      {
        day_number: 2,
        date: "2026-08-02",
        theme: "Day 2",
        daily_notes: "",
        places: [makePlace({ best_time: "10:00 AM" })],
        meals: FULL_MEALS,
      },
    ]);

    const result = runConstraintEngine(itinerary, form);
    expect(result.needsReview).toBe(false);
    expect(result.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Rule 5 — Travel feasibility (post-geocoding)
// ---------------------------------------------------------------------------

describe("Rule 5 — travel feasibility", () => {
  it("flags consecutive places that are too far apart for the available time gap", () => {
    // Eiffel Tower → Palace of Versailles is ~20 km but the schedule gives only 10 min gap.
    // At 40 km/h city speed, 20 km needs ≥ 30 min — this must be flagged.
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [
          makePlace({ order: 1, name: "Eiffel Tower",        best_time: "9:00 AM",  duration_minutes: 120, lat: 48.8584, lng: 2.2945 }),
          makePlace({ order: 2, name: "Palace of Versailles", best_time: "11:10 AM", duration_minutes: 180, lat: 48.8048, lng: 2.1204 }),
        ],
      },
    ]);

    const issues = checkTravelFeasibility(itinerary);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].from).toBe("Eiffel Tower");
    expect(issues[0].to).toBe("Palace of Versailles");
    expect(issues[0].distanceKm).toBeGreaterThan(10);
  });

  it("does not flag walkable-distance places regardless of time gap", () => {
    // Louvre → Tuileries Garden is ~0.5 km — walking distance, always skip the check.
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [
          makePlace({ order: 1, name: "Louvre",           best_time: "9:00 AM",  duration_minutes: 120, lat: 48.8606, lng: 2.3376 }),
          makePlace({ order: 2, name: "Tuileries Garden", best_time: "11:30 AM", duration_minutes: 60,  lat: 48.8638, lng: 2.3275 }),
        ],
      },
    ]);

    const issues = checkTravelFeasibility(itinerary);
    expect(issues).toHaveLength(0);
  });

  it("skips places that have no geocoded coordinates", () => {
    // Places with lat=0, lng=0 are un-geocoded — should not raise feasibility issues.
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [
          makePlace({ order: 1, name: "Unknown A", best_time: "9:00 AM",  lat: 0, lng: 0 }),
          makePlace({ order: 2, name: "Unknown B", best_time: "10:00 AM", lat: 0, lng: 0 }),
        ],
      },
    ]);

    const issues = checkTravelFeasibility(itinerary);
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Integration — multiple rules firing together
// ---------------------------------------------------------------------------

describe("Integration — multiple rules in one pass", () => {
  it("repairs duplicate AND injects missing meals in a single runConstraintEngine call", () => {
    // Rule 1 removes the duplicate; Rule 3 injects all three missing meals.
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [
          makePlace({ order: 1, name: "Louvre", best_time: "10:00 AM" }),
          makePlace({ order: 2, name: "Louvre", best_time: "11:00 AM" }), // duplicate
          makePlace({ order: 3, name: "Notre Dame", best_time: "2:00 PM" }),
        ],
        meals: [], // all missing
      },
    ]);

    const result = runConstraintEngine(itinerary, BASE_FORM);

    // Rule 1: duplicate removed
    expect(result.repaired.days[0].places).toHaveLength(2);
    const dupViolation = result.violations.find((v) => v.rule === "no-duplicate-places");
    expect(dupViolation?.autoFixed).toBe(true);

    // Rule 3: all three meals injected
    expect(result.repaired.days[0].meals).toHaveLength(3);
    const mealViolations = result.violations.filter((v) => v.rule === "meal-completeness");
    expect(mealViolations).toHaveLength(3);

    expect(result.autoFixed).toBe(true);
    expect(result.needsReview).toBe(false);
  });

  it("produces no violations for a fully valid itinerary", () => {
    // Activities at valid times, all three meals present, one place per day.
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [makePlace({ order: 1, name: "Eiffel Tower", best_time: "10:00 AM" })],
        meals: FULL_MEALS,
      },
    ]);

    const result = runConstraintEngine(itinerary, BASE_FORM);

    expect(result.needsReview).toBe(false);
    expect(result.autoFixed).toBe(false);
    expect(result.passed).toBe(true);
    // Rule 1 and Rule 3 produce no violations; Rule 2 may repair times but Rule 1/3 are zero.
    const rule1 = result.violations.filter((v) => v.rule === "no-duplicate-places");
    const rule3 = result.violations.filter((v) => v.rule === "meal-completeness");
    const rule4 = result.violations.filter((v) => v.rule === "minimum-places");
    expect(rule1).toHaveLength(0);
    expect(rule3).toHaveLength(0);
    expect(rule4).toHaveLength(0);
  });

  it("flags only the empty day as needsReview while leaving a valid day untouched", () => {
    // 2-day trip: day 1 is valid, day 2 is empty.
    const form: TripFormData = { ...BASE_FORM, departureDate: "2026-08-02" };

    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [makePlace({ order: 1, name: "Louvre", best_time: "10:00 AM" })],
        meals: FULL_MEALS,
      },
      {
        day_number: 2,
        date: "2026-08-02",
        theme: "Empty Day",
        daily_notes: "",
        places: [],
        meals: FULL_MEALS,
      },
    ]);

    const result = runConstraintEngine(itinerary, form);

    expect(result.needsReview).toBe(true);
    expect(result.passed).toBe(false);

    // Day 1 is untouched (still has its one place)
    expect(result.repaired.days[0].places).toHaveLength(1);

    // Only day 2 gets the minimum-places violation
    const structViolations = result.violations.filter((v) => v.rule === "minimum-places");
    expect(structViolations).toHaveLength(1);
    expect(structViolations[0].day).toBe(2);
  });

  it("repairs two duplicate pairs across two separate days independently", () => {
    const form: TripFormData = { ...BASE_FORM, departureDate: "2026-08-02" };

    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-08-01",
        theme: "Day 1",
        daily_notes: "",
        places: [
          makePlace({ order: 1, name: "Arc de Triomphe", best_time: "9:00 AM" }),
          makePlace({ order: 2, name: "Arc de Triomphe", best_time: "10:00 AM" }), // dup on day 1
        ],
        meals: FULL_MEALS,
      },
      {
        day_number: 2,
        date: "2026-08-02",
        theme: "Day 2",
        daily_notes: "",
        places: [
          makePlace({ order: 1, name: "Sacré-Cœur", best_time: "9:00 AM" }),
          makePlace({ order: 2, name: "Sacré-Cœur", best_time: "10:00 AM" }), // dup on day 2
        ],
        meals: FULL_MEALS,
      },
    ]);

    const result = runConstraintEngine(itinerary, form);

    expect(result.repaired.days[0].places).toHaveLength(1);
    expect(result.repaired.days[1].places).toHaveLength(1);

    const dupViolations = result.violations.filter((v) => v.rule === "no-duplicate-places");
    expect(dupViolations).toHaveLength(2);
    expect(dupViolations[0].day).toBe(1);
    expect(dupViolations[1].day).toBe(2);
  });
});
