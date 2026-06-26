import { describe, it, expect, beforeEach, vi } from "vitest";
import { cacheTrip, getCachedTrip, getCachedTripsMeta } from "@/lib/offline-cache";
import type { TripWithDays } from "@/types/trip";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeTrip(id: string, title = "Test Trip"): TripWithDays {
  return {
    id,
    user_id: "user-1",
    destination: "Paris",
    trip_title: title,
    arrival_date: "2026-08-01",
    departure_date: "2026-08-05",
    hotel_name: "Hotel Test",
    hotel_address: "1 Rue Test, Paris",
    num_travelers: 2,
    trip_purpose: "tourism",
    budget_level: "mid-range",
    pace: "balanced",
    interests: [],
    dietary_prefs: [],
    must_visit: "",
    estimated_budget: "€500",
    general_tips: [],
    share_token: null,
    is_public: false,
    created_at: "2026-08-01T00:00:00Z",
    itinerary_days: [],
  };
}

const META_KEY = "navoryn-offline-trips";
const tripKey = (id: string) => `navoryn-offline-trip-${id}`;

beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// Save and retrieve
// ---------------------------------------------------------------------------

describe("cacheTrip / getCachedTrip", () => {
  it("stores a trip so it can be retrieved by id", () => {
    const trip = makeTrip("trip-1", "Paris Adventure");
    cacheTrip(trip);

    const retrieved = getCachedTrip("trip-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("trip-1");
    expect(retrieved!.trip_title).toBe("Paris Adventure");
  });

  it("returns null for a trip that was never cached (cache miss)", () => {
    expect(getCachedTrip("nonexistent-id")).toBeNull();
  });

  it("overwrites existing trip data when cached again with same id", () => {
    cacheTrip(makeTrip("trip-1", "Old Title"));
    cacheTrip(makeTrip("trip-1", "New Title"));

    const retrieved = getCachedTrip("trip-1");
    expect(retrieved!.trip_title).toBe("New Title");

    // Overwriting must not duplicate the meta entry
    expect(getCachedTripsMeta()).toHaveLength(1);
  });

  it("updates the meta entry in place when the same trip is cached twice", () => {
    cacheTrip(makeTrip("trip-1", "First"));
    cacheTrip(makeTrip("trip-1", "Second"));

    const meta = getCachedTripsMeta();
    expect(meta).toHaveLength(1);
    expect(meta[0].id).toBe("trip-1");
    expect(meta[0].title).toBe("Second");
  });
});

// ---------------------------------------------------------------------------
// Meta index
// ---------------------------------------------------------------------------

describe("getCachedTripsMeta", () => {
  it("returns an empty array when nothing is cached", () => {
    expect(getCachedTripsMeta()).toEqual([]);
  });

  it("returns one entry per unique trip", () => {
    cacheTrip(makeTrip("trip-a"));
    cacheTrip(makeTrip("trip-b"));
    cacheTrip(makeTrip("trip-c"));

    const meta = getCachedTripsMeta();
    expect(meta).toHaveLength(3);
    const ids = meta.map((m) => m.id);
    expect(ids).toContain("trip-a");
    expect(ids).toContain("trip-b");
    expect(ids).toContain("trip-c");
  });

  it("lists newest trip first (most recently cached at index 0)", () => {
    cacheTrip(makeTrip("trip-old"));
    cacheTrip(makeTrip("trip-new"));

    const meta = getCachedTripsMeta();
    expect(meta[0].id).toBe("trip-new");
    expect(meta[1].id).toBe("trip-old");
  });
});

// ---------------------------------------------------------------------------
// LRU eviction (MAX_CACHED = 15)
// ---------------------------------------------------------------------------

describe("LRU eviction", () => {
  it("evicts the oldest trip when the cache exceeds 15 entries", () => {
    // Add 16 trips in order: trip-0 (oldest) … trip-15 (newest).
    // After the 16th insertion, trip-0 must be evicted from both meta and localStorage.
    const trips = Array.from({ length: 16 }, (_, i) => makeTrip(`trip-${i}`));
    trips.forEach(cacheTrip);

    expect(getCachedTrip("trip-0")).toBeNull();
    expect(getCachedTripsMeta()).toHaveLength(15);
  });

  it("keeps the 15 most recently cached trips after eviction", () => {
    const trips = Array.from({ length: 16 }, (_, i) => makeTrip(`trip-${i}`));
    trips.forEach(cacheTrip);

    // trip-1 through trip-15 must all be retrievable
    for (let i = 1; i <= 15; i++) {
      expect(getCachedTrip(`trip-${i}`)).not.toBeNull();
    }
  });

  it("removes the evicted trip's data from localStorage", () => {
    const trips = Array.from({ length: 16 }, (_, i) => makeTrip(`trip-${i}`));
    trips.forEach(cacheTrip);

    expect(localStorage.getItem(tripKey("trip-0"))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Corrupted cache recovery
// ---------------------------------------------------------------------------

describe("corrupted cache recovery", () => {
  it("returns an empty meta array when the meta store contains invalid JSON", () => {
    localStorage.setItem(META_KEY, "NOT_VALID_JSON{{{{");
    expect(getCachedTripsMeta()).toEqual([]);
  });

  it("returns null when a cached trip's data is corrupt", () => {
    localStorage.setItem(tripKey("corrupt-id"), "bad{json}}}");
    expect(getCachedTrip("corrupt-id")).toBeNull();
  });

  it("continues working after recovering from a corrupt meta store", () => {
    localStorage.setItem(META_KEY, "broken");
    // cacheTrip should silently rebuild a clean meta
    expect(() => cacheTrip(makeTrip("trip-ok"))).not.toThrow();
    expect(getCachedTripsMeta()).toHaveLength(1);
  });
});
