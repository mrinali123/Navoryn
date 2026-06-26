"use client";

import { useEffect, useState, useCallback } from "react";
import { openDB, type IDBPDatabase } from "idb";
import type { TripWithDays } from "@/types/trip";

const DB_NAME = "navoryn-offline";
const DB_VERSION = 1;
const STORE = "trips";

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    },
  });
}

export function useOfflineTrips() {
  const [cachedTrips, setCachedTrips] = useState<TripWithDays[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDb()
      .then((db) => db.getAll(STORE))
      .then((trips) => setCachedTrips(trips))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const cacheTrip = useCallback(async (trip: TripWithDays) => {
    try {
      const db = await getDb();
      await db.put(STORE, trip);
      setCachedTrips((prev) => {
        const without = prev.filter((t) => t.id !== trip.id);
        return [...without, trip];
      });
    } catch {}
  }, []);

  const removeTrip = useCallback(async (tripId: string) => {
    try {
      const db = await getDb();
      await db.delete(STORE, tripId);
      setCachedTrips((prev) => prev.filter((t) => t.id !== tripId));
    } catch {}
  }, []);

  return { cachedTrips, isLoading, cacheTrip, removeTrip };
}
