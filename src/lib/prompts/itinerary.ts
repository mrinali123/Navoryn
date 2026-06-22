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

export function buildItineraryPrompt(data: TripFormData): string {
  const numDays = getNumDays(data.arrivalDate, data.departureDate);
  const arrivalLabel = formatDate(data.arrivalDate);
  const departureLabel = formatDate(data.departureDate);

  const pace: Record<string, string> = {
    relaxed: "3-4 places/day",
    balanced: "4-5 places/day",
    packed: "5-6 places/day",
  };

  const budget: Record<string, string> = {
    budget: "budget (₹1,500-₹3,500/person/day)",
    "mid-range": "mid-range (₹3,500-₹8,000/person/day)",
    luxury: "luxury (₹8,000-₹25,000+/person/day)",
  };

  return `You are Roamly, an expert travel planner. Generate a complete ${numDays}-day itinerary. Return ONLY valid JSON, no markdown, no explanations.

TRIP
Destination: ${data.destination}
Dates: ${arrivalLabel}${data.arrivalTime ? ` arriving ${data.arrivalTime}` : ""} to ${departureLabel}${data.departureTime ? ` departing ${data.departureTime}` : ""}
Travelers: ${data.numTravelers}, Purpose: ${data.tripPurpose}, Budget: ${budget[data.budgetLevel] || data.budgetLevel}
Pace: ${data.pace} — ${pace[data.pace] || data.pace}
Interests: ${data.interests.length > 0 ? data.interests.join(", ") : "general sightseeing"}${data.dietaryPrefs.length > 0 ? `\nDiet: ${data.dietaryPrefs.join(", ")}` : ""}${data.mustVisit ? `\nMust-visit: ${data.mustVisit}` : ""}
Hotel: ${data.hotelName}${data.hotelAddress ? `, ${data.hotelAddress}` : ""}${data.checkInTime ? `, check-in ${data.checkInTime}` : ""}${data.checkOutTime ? `, check-out ${data.checkOutTime}` : ""}

RULES
1. "places" array: sightseeing only (monuments, temples, museums, parks, viewpoints, markets as attractions). NEVER put restaurants here.
2. "meals" array: exactly 2 per day (lunch + dinner). Real, named restaurants only. Never repeat a restaurant.
3. Every sightseeing place must be unique across all days. Real GPS coordinates for ${data.destination}.
4. Schedule optimally: iconic monuments early morning (6-9 AM), museums mid-morning (9-11 AM), indoor venues at noon, parks/markets late afternoon (4-7 PM), illuminated sights evening.
5. Day 1: first activity must start AFTER arrival time${data.arrivalTime ? ` (${data.arrivalTime})` : ""} plus ~1 hour for travel/check-in. Do not schedule anything before the traveler has arrived and checked in.${data.checkInTime ? ` Hotel check-in is ${data.checkInTime}.` : ""} Last day: all activities must END before check-out${data.checkOutTime ? ` (${data.checkOutTime})` : ""} and departure${data.departureTime ? ` (${data.departureTime})` : ""}. Do not schedule anything that would conflict with packing and leaving.
6. All prices in INR (₹). Conversions: 1 USD=₹83, 1 EUR=₹90, 1 GBP=₹105, 1 AED=₹23.${data.mustVisit ? `\n7. Include ALL must-visit places: ${data.mustVisit}` : ""}

OUTPUT JSON:
{"trip_title":"Evocative title","estimated_budget":"₹X-₹Y total for ${data.numTravelers} traveler${data.numTravelers !== 1 ? "s" : ""}","general_tips":["tip1","tip2","tip3","tip4","tip5"],"days":[{"day_number":1,"date":"${data.arrivalDate}","theme":"Specific evocative theme","daily_notes":"1-2 practical sentences","weather":{"condition":"Sunny","temperature_high":"32°C","temperature_low":"22°C","uv_index":"High","humidity":"55%","wind":"Light, 12 km/h","sunrise":"6:12 AM","sunset":"7:34 PM","travel_advisory":"Specific advice for this destination and month","best_outdoor_hours":"6 AM-11 AM and 4 PM-7 PM"},"places":[{"order":1,"name":"Venue name","type":"landmark","best_time":"8:00 AM","time_of_day":"morning","duration_minutes":120,"description":"2-3 sentences why visit","tips":"One actionable tip","why_this_time":"Why this time is best","photo_tip":"Best photo spot","lat":0.0,"lng":0.0,"estimated_cost":"₹X per person"}],"meals":[{"meal_type":"lunch","suggested_time":"1:00 PM","restaurant_name":"Real restaurant name","cuisine":"Cuisine","price_range":"₹X-₹Y per person","specialty":"Dishes to order","area":"Neighbourhood","best_for":"Why this restaurant"},{"meal_type":"dinner","suggested_time":"8:00 PM","restaurant_name":"Real restaurant name","cuisine":"Cuisine","price_range":"₹X-₹Y per person","specialty":"Dishes to order","area":"Neighbourhood","best_for":"Why this restaurant"}],"quick_tips":["Actionable tip 1","Logistics tip","Etiquette tip","Money-saving tip"]}]}`;
}
