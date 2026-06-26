import type { TripWithDays } from "@/types/trip";

export interface CachedTripMeta {
  id: string;
  title: string;
  destination: string;
  arrival_date: string;
  departure_date: string;
  cachedAt: number;
}

const META_KEY = "navoryn-offline-trips";
const tripKey = (id: string) => `navoryn-offline-trip-${id}`;
const MAX_CACHED = 15;

export function cacheTrip(trip: TripWithDays): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(tripKey(trip.id), JSON.stringify(trip));

    const meta = getCachedTripsMeta();
    const idx = meta.findIndex((m) => m.id === trip.id);
    const entry: CachedTripMeta = {
      id: trip.id,
      title: trip.trip_title,
      destination: trip.destination,
      arrival_date: trip.arrival_date,
      departure_date: trip.departure_date,
      cachedAt: Date.now(),
    };

    if (idx >= 0) {
      meta[idx] = entry;
    } else {
      meta.unshift(entry);
      if (meta.length > MAX_CACHED) {
        const evicted = meta.splice(MAX_CACHED);
        evicted.forEach((m) => {
          try { localStorage.removeItem(tripKey(m.id)); } catch {}
        });
      }
    }
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {}
}

export function getCachedTripsMeta(): CachedTripMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as CachedTripMeta[]) : [];
  } catch {
    return [];
  }
}

export function getCachedTrip(id: string): TripWithDays | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(tripKey(id));
    return raw ? (JSON.parse(raw) as TripWithDays) : null;
  } catch {
    return null;
  }
}
