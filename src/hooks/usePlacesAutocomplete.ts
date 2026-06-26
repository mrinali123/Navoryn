"use client";
import { useState, useCallback, useRef } from "react";

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lng: number;
  formattedAddress?: string;
  rating?: number;
}

export interface UsePlacesAutocompleteOptions {
  types: string[];              // "(cities)" | "lodging"
  location?: { lat: number; lng: number };
  radius?: number;
  debounceMs?: number;
}

// ── Nominatim types ────────────────────────────────────────────────────────────
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

// ── Photon types ───────────────────────────────────────────────────────────────
interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    osm_id?: number;
    osm_type?: string;
    type?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

async function searchCities(query: string, signal: AbortSignal): Promise<PlaceSuggestion[]> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;

  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "Navoryn/1.0 (travel-itinerary-app)" },
  });
  const data: NominatimResult[] = await res.json();

  return data.map((item) => {
    const mainText =
      item.address.city ||
      item.address.town ||
      item.address.village ||
      item.address.county ||
      item.display_name.split(",")[0].trim();

    const secondary = [item.address.state, item.address.country]
      .filter(Boolean)
      .join(", ");

    return {
      placeId: String(item.place_id),
      description: item.display_name,
      mainText,
      secondaryText: secondary,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    };
  });
}

async function searchLodging(
  query: string,
  signal: AbortSignal,
  location?: { lat: number; lng: number }
): Promise<PlaceSuggestion[]> {
  let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`;
  if (location) url += `&lat=${location.lat}&lon=${location.lng}`;

  const res = await fetch(url, { signal });
  const data: { features: PhotonFeature[] } = await res.json();

  return data.features
    .filter((f) => !!f.properties.name)
    .map((f) => {
      const p = f.properties;
      const addrParts = [p.housenumber, p.street, p.city, p.country].filter(Boolean);
      return {
        placeId: `${p.osm_type ?? ""}${p.osm_id ?? Math.random()}`,
        description: [p.name, ...addrParts].filter(Boolean).join(", "),
        mainText: p.name!,
        secondaryText: [p.street, p.city, p.country].filter(Boolean).join(", "),
        formattedAddress: addrParts.join(", "),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      };
    });
}

export function usePlacesAutocomplete({
  types,
  location,
  debounceMs = 500,
}: UsePlacesAutocompleteOptions) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable] = useState(false); // free APIs are always available
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isLodging = types.includes("lodging");

  const fetchSuggestions = useCallback(
    (query: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (query.length < 2) { setSuggestions([]); return; }

      timerRef.current = setTimeout(async () => {
        // Cancel any in-flight request
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const { signal } = abortRef.current;

        setLoading(true);
        try {
          const results = isLodging
            ? await searchLodging(query, signal, location)
            : await searchCities(query, signal);

          setSuggestions(results);
        } catch (err) {
          // Ignore abort errors
          if ((err as Error).name !== "AbortError") setSuggestions([]);
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [isLodging, location, debounceMs]
  );

  function clearSuggestions() {
    setSuggestions([]);
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }

  return { suggestions, loading, unavailable, fetchSuggestions, clearSuggestions };
}
