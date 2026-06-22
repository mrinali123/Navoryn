import type { TripFormData } from "@/types/trip";

function formatDate(dateStr: string): string {
  if (!dateStr) return dateStr;
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function getNumDays(arrival: string, departure: string): number {
  if (!arrival || !departure) return 1;
  const a = new Date(arrival);
  const b = new Date(departure);
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return Math.max(1, diff + 1);
}

function addMinutes(time24: string, mins: number): string {
  const [h, m] = time24.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function to12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function buildItineraryPrompt(data: TripFormData): string {
  const numDays = getNumDays(data.arrivalDate, data.departureDate);
  const arrivalLabel = formatDate(data.arrivalDate);
  const departureLabel = formatDate(data.departureDate);

  // Compute hard start time for Day 1
  // Use the later of: (arrival + 60 min travel) or check-in time
  let day1Start = "09:00";
  if (data.arrivalTime) {
    const afterArrival = addMinutes(data.arrivalTime, 60);
    if (data.checkInTime && data.checkInTime > afterArrival) {
      day1Start = addMinutes(data.checkInTime, 30);
    } else {
      day1Start = afterArrival;
    }
  } else if (data.checkInTime) {
    day1Start = addMinutes(data.checkInTime, 30);
  }

  // Compute hard end time for last day
  // Use the earlier of: check-out time or (departure - 90 min)
  let lastDayEnd = "23:59";
  if (data.checkOutTime && data.departureTime) {
    const beforeDeparture = addMinutes(data.departureTime, -90);
    lastDayEnd = data.checkOutTime < beforeDeparture ? data.checkOutTime : beforeDeparture;
  } else if (data.checkOutTime) {
    lastDayEnd = data.checkOutTime;
  } else if (data.departureTime) {
    lastDayEnd = addMinutes(data.departureTime, -90);
  }

  const placesPerDay: Record<string, string> = {
    relaxed: "EXACTLY 2-3 sightseeing places",
    balanced: "EXACTLY 4-5 sightseeing places",
    packed: "EXACTLY 5-6 sightseeing places",
  };

  const budget: Record<string, string> = {
    budget: "budget (₹1,500-₹3,500/person/day)",
    "mid-range": "mid-range (₹3,500-₹8,000/person/day)",
    luxury: "luxury (₹8,000-₹25,000+/person/day)",
  };

  const isSingleDay = numDays === 1;

  return `You are Roamly, an expert travel planner. Generate a ${numDays}-day itinerary. Return ONLY valid JSON, no markdown.

TRIP
Destination: ${data.destination}
Dates: ${arrivalLabel} to ${departureLabel}
Travelers: ${data.numTravelers}, Purpose: ${data.tripPurpose}, Budget: ${budget[data.budgetLevel] || data.budgetLevel}
Interests: ${data.interests.length > 0 ? data.interests.join(", ") : "general sightseeing"}${data.dietaryPrefs.length > 0 ? `\nDiet: ${data.dietaryPrefs.join(", ")}` : ""}${data.mustVisit ? `\nMust-visit: ${data.mustVisit}` : ""}
Hotel: ${data.hotelName}${data.hotelAddress ? `, ${data.hotelAddress}` : ""}

HARD TIME CONSTRAINTS — NEVER VIOLATE:
- DAY 1: NO activity may start before ${to12h(day1Start)}. The traveler arrives at ${data.arrivalTime ? to12h(data.arrivalTime) : "unknown time"} and checks in at ${data.checkInTime ? to12h(data.checkInTime) : "unknown time"}. First activity starts at ${to12h(day1Start)} at the earliest.
- ${isSingleDay ? "ONLY DAY" : "LAST DAY"}: ALL activities must FINISH by ${to12h(lastDayEnd)}. Check-out is ${data.checkOutTime ? to12h(data.checkOutTime) : "unknown"}${data.departureTime ? `, departure is ${to12h(data.departureTime)}` : ""}. No activity may end after ${to12h(lastDayEnd)}.
- Middle days (if any): activities run 8:00 AM to 10:00 PM maximum.

PACE — STRICTLY FOLLOW:
Pace selected: ${data.pace} → ${placesPerDay[data.pace] || "4-5 places"} per day. Do not add more places than this limit.

RULES
1. "places" = sightseeing only (monuments, temples, museums, parks, viewpoints). NEVER restaurants.
2. "meals" = exactly 2 per day (lunch + dinner). Real named restaurants. Never repeat a restaurant.
3. Every sightseeing place unique across all days. Real GPS coordinates for ${data.destination}.
4. Optimal scheduling: monuments 6-9 AM, museums 9-11 AM, indoor at noon, parks/markets 4-7 PM, evening sights after 7 PM.
5. All prices in INR (₹). 1 USD=₹83, 1 EUR=₹90, 1 GBP=₹105, 1 AED=₹23.${data.mustVisit ? `\n6. Include ALL must-visit: ${data.mustVisit}` : ""}

OUTPUT JSON:
{"trip_title":"Title","estimated_budget":"₹X-₹Y total for ${data.numTravelers} traveler${data.numTravelers !== 1 ? "s" : ""}","general_tips":["tip1","tip2","tip3","tip4","tip5"],"days":[{"day_number":1,"date":"${data.arrivalDate}","theme":"Theme","daily_notes":"Notes","weather":{"condition":"Sunny","temperature_high":"32°C","temperature_low":"22°C","uv_index":"High","humidity":"55%","wind":"Light, 12 km/h","sunrise":"6:12 AM","sunset":"7:34 PM","travel_advisory":"Advice","best_outdoor_hours":"6 AM-11 AM and 4 PM-7 PM"},"places":[{"order":1,"name":"Name","type":"landmark","best_time":"8:00 AM","time_of_day":"morning","duration_minutes":120,"description":"Why visit","tips":"Tip","why_this_time":"Reason","photo_tip":"Photo tip","lat":0.0,"lng":0.0,"estimated_cost":"₹X per person"}],"meals":[{"meal_type":"lunch","suggested_time":"1:00 PM","restaurant_name":"Name","cuisine":"Type","price_range":"₹X-₹Y per person","specialty":"Dishes","area":"Area","best_for":"Why"},{"meal_type":"dinner","suggested_time":"8:00 PM","restaurant_name":"Name","cuisine":"Type","price_range":"₹X-₹Y per person","specialty":"Dishes","area":"Area","best_for":"Why"}],"quick_tips":["tip1","tip2","tip3","tip4"]}]}`;
}
