import { describe, it, expect } from "vitest";
import { validateAndRepairItinerary } from "@/lib/itinerary-validator";
import type { GeneratedItinerary, TripFormData, Place, Meal } from "@/types/trip";

// ---------------------------------------------------------------------------
// Fixtures
//
// BASE_FORM is a 3-day trip:
//   day1Floor    = max(07:00+60min=08:00, 08:00+30min=08:30) = 08:30 (510 min)
//   lastDayCeil  = min(22:00=1320, 23:59-90min=22:29=1349)  = 22:00 (1320 min)
//   Middle days  = floor 08:00 (480 min), ceiling 22:00 (1320 min)
// ---------------------------------------------------------------------------

const BASE_FORM: TripFormData = {
  destination: "Tokyo",
  arrivalDate: "2026-09-01",
  arrivalTime: "07:00",
  departureDate: "2026-09-03",
  departureTime: "23:59",
  numTravelers: 2,
  tripPurpose: "tourism",
  hotelName: "Hotel Test",
  hotelAddress: "1 Test St, Tokyo",
  checkInTime: "08:00",
  checkOutTime: "22:00",
  budgetLevel: "mid-range",
  interests: ["Art & Museums"],
  pace: "balanced",
  mustVisit: "",
  dietaryPrefs: [],
};

const SINGLE_DAY_FORM: TripFormData = {
  ...BASE_FORM,
  departureDate: "2026-09-01", // same day
};

function makePlace(overrides: Partial<Place>): Place {
  return {
    order: 1,
    name: "Test Place",
    type: "activity",
    best_time: "10:00 AM",
    duration_minutes: 90,
    description: "",
    tips: "",
    lat: 0,
    lng: 0,
    estimated_cost: "€0",
    ...overrides,
  };
}

function makeItinerary(days: GeneratedItinerary["days"]): GeneratedItinerary {
  return { trip_title: "Test Trip", estimated_budget: "€500", general_tips: [], days };
}

// Wrap places into Day 2 (middle day) of a 3-day trip so floor/ceiling are 480/1320.
function onDay2(places: Place[], meals: Meal[] = []): GeneratedItinerary {
  return makeItinerary([
    {
      day_number: 1,
      date: "2026-09-01",
      theme: "Day 1",
      daily_notes: "",
      places: [makePlace({ name: "Arrival Activity", best_time: "10:00 AM", type: "activity" })],
      meals: [],
    },
    { day_number: 2, date: "2026-09-02", theme: "Day 2", daily_notes: "", places, meals },
    {
      day_number: 3,
      date: "2026-09-03",
      theme: "Day 3",
      daily_notes: "",
      places: [makePlace({ name: "Departure Activity", best_time: "10:00 AM", type: "activity" })],
      meals: [],
    },
  ]);
}

// ---------------------------------------------------------------------------
// Window repair — place types moved to correct time slots
// ---------------------------------------------------------------------------

describe("time-window repair — museum", () => {
  it("moves a museum scheduled at 1:00 PM to the preferred morning window (9:30 AM)", () => {
    // Museum windows: morning 9:30–12:00 (preferred), afternoon 14:00–17:00.
    // 1:00 PM (780 min) is between the two windows → invalid.
    // pickStartTime picks morning preferred window first: candidate = max(570, 480) = 570.
    const itinerary = onDay2([
      makePlace({ name: "Tokyo National Museum", type: "museum", best_time: "1:00 PM", duration_minutes: 90 }),
    ]);

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);
    const repaired = result.repaired.days[1].places[0];

    expect(repaired.best_time).toBe("9:30 AM");
    expect(result.issues).toHaveLength(1);
    // 1:00 PM (780 min) is inside the 11 AM–3 PM midday band, so the validator
    // classifies it as midday_outdoor rather than generic wrong_window.
    expect(result.issues[0].type).toBe("midday_outdoor");
    expect(result.issues[0].repaired).toBe(true);
    expect(result.issues[0].place).toBe("Tokyo National Museum");
  });

  it("leaves a museum at 10:00 AM (valid morning window) unchanged", () => {
    // 10:00 AM = 600 min, inside 9:30–12:00 → no issue.
    const itinerary = onDay2([
      makePlace({ name: "Science Museum", type: "museum", best_time: "10:00 AM", duration_minutes: 90 }),
    ]);

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);

    expect(result.repaired.days[1].places[0].best_time).toBe("10:00 AM");
    // Rule 2 may produce 0 issues for this day; the only possible issues come from other days
    const day2Issues = result.issues.filter((i) => i.day === 2);
    expect(day2Issues).toHaveLength(0);
    expect(result.valid).toBe(true);
  });
});

describe("time-window repair — bar", () => {
  it("moves a bar scheduled at 10:00 AM to 7:00 PM (preferred evening window)", () => {
    // Bar windows: evening 19:00–23:00 (preferred). 10:00 AM is entirely outside.
    // pickStartTime picks evening: candidate = max(1140, 480) = 1140.
    const itinerary = onDay2([
      makePlace({ name: "Shibuya Bar", type: "bar", best_time: "10:00 AM", duration_minutes: 120 }),
    ]);

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);
    const repaired = result.repaired.days[1].places[0];

    expect(repaired.best_time).toBe("7:00 PM");
    expect(result.issues[0].type).toBe("wrong_window");
    expect(result.issues[0].repaired).toBe(true);
  });
});

describe("time-window repair — nature (midday avoidance)", () => {
  it("moves a nature visit scheduled at noon to 8:00 AM and records a midday_outdoor issue", () => {
    // Nature windows: early morning 6:00–10:00 (preferred), late afternoon 16:00–18:30.
    // avoidMidday = true. Noon (720 min) is outside both windows AND in the 11 AM–3 PM band.
    // pickStartTime: early morning preferred, candidate = max(360, 480) = 480 → 8:00 AM.
    // ("beach" is defined in SCHEDULE_RULES but is not a valid PlaceType; "nature" has the same
    // avoidMidday behaviour and IS a valid PlaceType.)
    const itinerary = onDay2([
      makePlace({ name: "Yoyogi Park", type: "nature", best_time: "12:00 PM", duration_minutes: 90 }),
    ]);

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);
    const repaired = result.repaired.days[1].places[0];

    expect(repaired.best_time).toBe("8:00 AM");
    expect(result.issues[0].type).toBe("midday_outdoor");
    expect(result.issues[0].repaired).toBe(true);
  });
});

describe("time-window repair — landmark (midday avoidance)", () => {
  it("moves a landmark at 2:00 PM to 8:00 AM (early morning preferred window)", () => {
    // Landmark windows: early morning 6:00–9:30 (preferred), late afternoon 16:00–18:30 (preferred),
    // morning 9:30–11:00 (not preferred). avoidMidday=true.
    // 2:00 PM (840 min) is in the 11–15 midday band.
    // pickStartTime iterates preferred windows in order: early morning first.
    // candidate = max(360, 480) = 480, which is ≤ 570 (9:30 AM endMin) → 8:00 AM.
    const itinerary = onDay2([
      makePlace({ name: "Sensoji Temple", type: "landmark", best_time: "2:00 PM", duration_minutes: 90 }),
    ]);

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);
    const repaired = result.repaired.days[1].places[0];

    expect(repaired.best_time).toBe("8:00 AM");
    expect(result.issues[0].type).toBe("midday_outdoor");
  });
});

// ---------------------------------------------------------------------------
// Activity validity
// ---------------------------------------------------------------------------

describe("activity scheduling", () => {
  it("leaves an activity at 2:00 PM (valid afternoon window) unchanged", () => {
    // Activity windows: morning 8:00–12:00, afternoon 14:00–18:00.
    // 2:00 PM = 840 min, inside afternoon window.
    const itinerary = onDay2([
      makePlace({ name: "Tea Ceremony", type: "activity", best_time: "2:00 PM", duration_minutes: 60 }),
    ]);

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);

    expect(result.repaired.days[1].places[0].best_time).toBe("2:00 PM");
    const day2Issues = result.issues.filter((i) => i.day === 2);
    expect(day2Issues).toHaveLength(0);
  });

  it("pushes a second activity that overlaps the first to avoid conflict", () => {
    // Activity 1: 9:00 AM, 180 min → ends 12:00 + 15-min gap → cursor = 735
    // Activity 2: 10:00 AM (600 min) < cursor (735) → overlap
    // pickStartTime("activity", 735, 1320, 60): morning window max(480,735)=735 > 720 → skip;
    // afternoon window max(840,735)=840 fits → 2:00 PM.
    const itinerary = onDay2([
      makePlace({ order: 1, name: "Activity A", type: "activity", best_time: "9:00 AM", duration_minutes: 180 }),
      makePlace({ order: 2, name: "Activity B", type: "activity", best_time: "10:00 AM", duration_minutes: 60 }),
    ]);

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);
    const places = result.repaired.days[1].places;

    expect(places).toHaveLength(2);
    expect(places[0].best_time).toBe("9:00 AM");
    expect(places[1].best_time).toBe("2:00 PM");

    const overlapIssue = result.issues.find((i) => i.type === "overlap");
    expect(overlapIssue).toBeDefined();
    expect(overlapIssue?.repaired).toBe(true);
    expect(overlapIssue?.place).toBe("Activity B");
  });
});

// ---------------------------------------------------------------------------
// Multiple repairs in a single pass
// ---------------------------------------------------------------------------

describe("multiple repairs in one pass", () => {
  it("repairs museum at 1:00 PM and cafe at 7:00 PM independently on the same day", () => {
    // Sort by AI time: museum (780=1PM) processed before cafe (1140=7PM).
    // Museum: pickStartTime → 9:30 AM. cursor = 570+90+15 = 675.
    // Cafe (1140): 1140 not in [450-660] or [840-1020]. pickStartTime(675) → afternoon 840 → 2:00 PM.
    const itinerary = onDay2([
      makePlace({ order: 1, name: "Ueno Museum", type: "museum", best_time: "1:00 PM", duration_minutes: 90 }),
      makePlace({ order: 2, name: "Harajuku Cafe", type: "cafe", best_time: "7:00 PM", duration_minutes: 60 }),
    ]);

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);
    const places = result.repaired.days[1].places;

    expect(places).toHaveLength(2);
    expect(places[0].best_time).toBe("9:30 AM");
    expect(places[1].best_time).toBe("2:00 PM");

    const day2Issues = result.issues.filter((i) => i.day === 2);
    expect(day2Issues).toHaveLength(2);
    // Museum at 1 PM is in the midday band → midday_outdoor; cafe at 7 PM → wrong_window.
    // Both are auto-repaired regardless of the specific classification.
    expect(day2Issues.every((i) => i.repaired)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Day 1 arrival floor constraint
// ---------------------------------------------------------------------------

describe("Day 1 arrival floor", () => {
  it("moves an activity before the arrival floor to 8:30 AM and records before_arrival", () => {
    // SINGLE_DAY_FORM: arrivalTime 07:00 → floor = max(480, 510) = 510 = 8:30 AM.
    // Place at 7:00 AM (420 min) < floor (510) → before_arrival, moved to 8:30 AM.
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-09-01",
        theme: "Day 1",
        daily_notes: "",
        places: [makePlace({ name: "Early Visit", type: "activity", best_time: "7:00 AM", duration_minutes: 90 })],
        meals: [],
      },
    ]);

    const result = validateAndRepairItinerary(itinerary, SINGLE_DAY_FORM);
    const repaired = result.repaired.days[0].places[0];

    expect(repaired.best_time).toBe("8:30 AM");
    expect(result.issues[0].type).toBe("before_arrival");
    expect(result.issues[0].repaired).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Meal time repair
// ---------------------------------------------------------------------------

describe("meal time repair", () => {
  it("moves dinner suggested at 4:00 PM to the default 7:00 PM", () => {
    // Dinner window: 18:00–22:00. 4 PM (960 min) < 1080 → default = 19:00 = 7:00 PM.
    const itinerary = onDay2(
      [makePlace({ name: "Place", type: "activity", best_time: "10:00 AM" })],
      [
        {
          meal_type: "dinner",
          suggested_time: "4:00 PM",
          restaurant_name: "Test Restaurant",
          cuisine: "Local",
          price_range: "Mid",
          specialty: "Local Food",
          area: "Center",
          best_for: "All",
        },
      ]
    );

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);
    const dinner = result.repaired.days[1].meals?.find((m) => m.meal_type === "dinner");

    expect(dinner?.suggested_time).toBe("7:00 PM");
  });

  it("moves lunch suggested at 9:00 AM to the default 12:30 PM", () => {
    // Lunch window: 11:30–15:00. 9:00 AM (540 min) < 690 → default = 750 = 12:30 PM.
    const itinerary = onDay2(
      [makePlace({ name: "Place", type: "activity", best_time: "10:00 AM" })],
      [
        {
          meal_type: "lunch",
          suggested_time: "9:00 AM",
          restaurant_name: "Test Bistro",
          cuisine: "French",
          price_range: "Mid",
          specialty: "Steak",
          area: "Center",
          best_for: "All",
        },
      ]
    );

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);
    const lunch = result.repaired.days[1].meals?.find((m) => m.meal_type === "lunch");

    expect(lunch?.suggested_time).toBe("12:30 PM");
  });

  it("leaves a meal with a valid suggested_time unchanged", () => {
    // Lunch at 12:30 PM (750 min) is inside [690, 900] → no change.
    const itinerary = onDay2(
      [makePlace({ name: "Place", type: "activity", best_time: "10:00 AM" })],
      [
        {
          meal_type: "lunch",
          suggested_time: "12:30 PM",
          restaurant_name: "Valid Bistro",
          cuisine: "French",
          price_range: "Mid",
          specialty: "Salad",
          area: "Center",
          best_for: "All",
        },
      ]
    );

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);
    const lunch = result.repaired.days[1].meals?.find((m) => m.meal_type === "lunch");

    expect(lunch?.suggested_time).toBe("12:30 PM");
  });
});

// ---------------------------------------------------------------------------
// Fully valid itinerary — no changes
// ---------------------------------------------------------------------------

describe("fully valid itinerary", () => {
  it("produces no issues and valid=true when all schedules are already correct", () => {
    // All places in valid windows; no overlap; no constraint violations expected from Rule 2.
    const itinerary = makeItinerary([
      {
        day_number: 1,
        date: "2026-09-01",
        theme: "Day 1",
        daily_notes: "",
        places: [makePlace({ name: "A", type: "activity", best_time: "10:00 AM", duration_minutes: 90 })],
        meals: [],
      },
      {
        day_number: 2,
        date: "2026-09-02",
        theme: "Day 2",
        daily_notes: "",
        places: [
          makePlace({ name: "B", type: "museum", best_time: "10:00 AM", duration_minutes: 90 }),
          makePlace({ name: "C", type: "activity", best_time: "2:00 PM", duration_minutes: 60 }),
        ],
        meals: [],
      },
      {
        day_number: 3,
        date: "2026-09-03",
        theme: "Day 3",
        daily_notes: "",
        places: [makePlace({ name: "D", type: "activity", best_time: "10:00 AM", duration_minutes: 60 })],
        meals: [],
      },
    ]);

    const result = validateAndRepairItinerary(itinerary, BASE_FORM);

    expect(result.valid).toBe(true);
    expect(result.issueCount).toBe(0);
    expect(result.issues).toHaveLength(0);
  });
});
