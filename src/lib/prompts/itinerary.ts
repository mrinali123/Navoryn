import type { TripFormData } from "@/types/trip";
import {
  computeDay1Start,
  computeLastDayEnd,
  to12h,
  formatTime24,
} from "@/lib/itinerary-scheduler";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function getNumDays(arrival: string, departure: string): number {
  if (!arrival || !departure) return 1;
  const diff = Math.round(
    (new Date(departure).getTime() - new Date(arrival).getTime()) / 86_400_000
  );
  return Math.max(1, diff + 1);
}

const BUDGET_LABELS: Record<string, string> = {
  budget:      "budget ₹1.5k-3.5k/person/day",
  "mid-range": "mid-range ₹3.5k-8k/person/day",
  luxury:      "luxury ₹8k-25k+/person/day",
};

const PLACES_PER_DAY: Record<string, string> = {
  relaxed:  "2-3",
  balanced: "4-5",
  packed:   "5-6",
};

// ---------------------------------------------------------------------------
// System prompt — static, loaded once
// Kept compact: ~220 tokens vs the old ~734.
// Scheduling rules are also enforced programmatically in itinerary-validator.ts;
// the prompt just guides the model's initial choices.
// ---------------------------------------------------------------------------

export const ITINERARY_SYSTEM_PROMPT = `You are Navoryn, a travel planner. Return ONLY valid JSON — no markdown, no fences, no prose.

TIMING (enforce strictly per place type):
landmark: 6-9:30 AM or 4-6:30 PM | viewpoint: 5-7:30 AM or 5-7:30 PM (sunrise/sunset ONLY)
beach: 5:30-8 AM or 4:30-7 PM — NEVER 11 AM-3 PM | nature/park: 6-10 AM or 4-6:30 PM — NEVER 11 AM-3 PM
temple: 5:30-9 AM or 6-8 PM | museum: 9:30 AM-5 PM (fine at midday — it's indoor)
market: 5-9 PM | bar/nightlife: after 7 PM | shopping: 11 AM-8 PM
restaurant: breakfast 6-10:30 AM, lunch 11:30 AM-3 PM, dinner 6-10 PM | cafe: 7:30-11 AM or 2-5 PM
activity/adventure: 8 AM-noon or 2-6 PM

RULES:
- Include all activities in places[] — restaurants, cafes, bars, sightseeing, everything.
- Every place unique across all days. Real GPS coords (lat/lng). Costs in INR (1 USD=₹83, 1 EUR=₹90, 1 GBP=₹105).
- Group geographically close places on the same day. Schedule indoor places at midday.
- Every day must include exactly 3 restaurant entries: 1 breakfast (6-10:30 AM), 1 lunch (11:30 AM-3 PM), 1 dinner (6-10 PM). Use famous, named local restaurants at the destination.`;

// ---------------------------------------------------------------------------
// User prompt — per-trip, contains computed constraints + schema
// Target: ~380 tokens vs the old ~714.
// ---------------------------------------------------------------------------

export function buildItineraryUserPrompt(data: TripFormData): string {
  const numDays         = getNumDays(data.arrivalDate, data.departureDate);
  const day1FloorMins   = computeDay1Start(data);
  const lastDayCeilMins = computeLastDayEnd(data);
  const day1Start       = to12h(formatTime24(day1FloorMins));
  const lastDayEnd      = to12h(formatTime24(lastDayCeilMins));
  const isSingleDay     = numDays === 1;

  // Compact trip data line
  const tripLine = [
    `Destination: ${data.destination}`,
    `Hotel: ${data.hotelName}${data.hotelAddress ? `, ${data.hotelAddress}` : ""}`,
    `${data.numTravelers} traveler${data.numTravelers !== 1 ? "s" : ""}`,
    data.tripPurpose,
    BUDGET_LABELS[data.budgetLevel] ?? data.budgetLevel,
    `pace: ${data.pace} (${PLACES_PER_DAY[data.pace] ?? "4-5"} places/day)`,
  ].join(" | ");

  const optionalLines = [
    data.interests.length   ? `Interests: ${data.interests.join(", ")}`    : "",
    data.dietaryPrefs.length ? `Diet: ${data.dietaryPrefs.join(", ")}`      : "",
    data.mustVisit           ? `Must-visit: ${data.mustVisit}`              : "",
  ].filter(Boolean).join("\n");

  // Logistics — compact single block
  const arrivalStr   = data.arrivalTime   ? `${formatDate(data.arrivalDate)} ${to12h(data.arrivalTime)}`    : formatDate(data.arrivalDate);
  const departureStr = data.departureTime ? `${formatDate(data.departureDate)} ${to12h(data.departureTime)}` : formatDate(data.departureDate);

  // Conditional warnings — only when the constraint is non-trivial
  const afternoonArrival = day1FloorMins >= 14 * 60; // 2 PM or later
  const earlyDeparture   = lastDayCeilMins <= 11 * 60; // before 11 AM

  const warnings: string[] = [];
  if (afternoonArrival) {
    warnings.push(`⚠ Day 1 AFTERNOON ARRIVAL: first activity NOT BEFORE ${day1Start}. Fewer activities on Day 1 is correct.`);
  }
  if (earlyDeparture) {
    warnings.push(`⚠ ${isSingleDay ? "Day 1" : "Last day"} EARLY DEPARTURE: all activities DONE BY ${lastDayEnd}. Max 1-2 quick places.`);
  }

  // Compact JSON schema — one example day, single-line style
  // Removed: weather{}, meals[], quick_tips[], photo_tip
  // Reason: none of these are persisted in the DB (itinerary_days only stores places[]).
  // Dining (restaurants/cafes/bars) is included in places[] instead of a separate meals array.
  const schemaDay = `{"day_number":1,"date":"${data.arrivalDate}","theme":"","daily_notes":"","places":[{"order":1,"name":"","type":"landmark","best_time":"7:00 AM","duration_minutes":90,"description":"","tips":"","why_this_time":"","lat":0.0,"lng":0.0,"estimated_cost":"₹X per person"}]}`;

  return `${numDays}-day itinerary. Return ONLY the JSON object.

${tripLine}${optionalLines ? `\n${optionalLines}` : ""}
Arrival: ${arrivalStr} | Check-in: ${data.checkInTime ? to12h(data.checkInTime) : "open"} | Check-out: ${data.checkOutTime ? to12h(data.checkOutTime) : "open"} | Departure: ${departureStr}

HARD CONSTRAINTS (never violate):
Day 1 — no activity before: ${day1Start}
${isSingleDay ? "Day 1 (only day)" : "Last day"} — all activities finish by: ${lastDayEnd}
Middle days: 8:00 AM – 10:00 PM
${warnings.length ? warnings.join("\n") : ""}
{"trip_title":"","estimated_budget":"₹X-₹Y total for ${data.numTravelers} traveler${data.numTravelers !== 1 ? "s" : ""}","general_tips":["","",""],"days":[${schemaDay}]}`;
}

// Legacy alias — any callers that still import buildItineraryPrompt continue to work.
export function buildItineraryPrompt(data: TripFormData): string {
  return buildItineraryUserPrompt(data);
}

// ---------------------------------------------------------------------------
// Token estimation (1 token ≈ 4 chars — standard heuristic for English + JSON)
// ---------------------------------------------------------------------------
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
