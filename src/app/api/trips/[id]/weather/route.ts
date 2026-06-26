import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  geocodeDestination,
  fetchWeatherForecast,
} from "@/lib/weather";
import type { WeatherForecast } from "@/types/weather";
import { withLogger, getLog } from "@/lib/with-logger";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export const GET = withLogger(
  "trips.weather",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const log = getLog();
    const { id } = await params;
    const supabase = await createClient();

    // Require authentication to prevent unauthenticated callers from triggering
    // external geocoding and weather API calls against arbitrary trip IDs.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      log.warn({ event: "auth.unauthorized" }, "unauthorized weather request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: trip } = await supabase
      .from("trips")
      .select("destination, weather_cache, weather_cache_updated_at, user_id, is_public")
      .eq("id", id)
      .single<{
        destination: string;
        weather_cache: WeatherForecast | null;
        weather_cache_updated_at: string | null;
        user_id: string;
        is_public: boolean;
      }>();

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Return cached data if still fresh
    if (
      trip.weather_cache &&
      trip.weather_cache_updated_at &&
      Date.now() - new Date(trip.weather_cache_updated_at).getTime() < CACHE_TTL_MS
    ) {
      log.debug({ tripId: id, event: "weather.cache_hit" }, "returning cached weather");
      return NextResponse.json(trip.weather_cache);
    }

    // Geocode destination
    const coords = await geocodeDestination(trip.destination);
    if (!coords) {
      log.warn(
        { tripId: id, destination: trip.destination, event: "weather.geocode_failed" },
        "could not geocode destination"
      );
      return NextResponse.json({ error: "Could not geocode destination" }, { status: 422 });
    }

    // Fetch from Open-Meteo
    const forecast = await fetchWeatherForecast(coords.lat, coords.lng);
    if (!forecast) {
      log.warn({ tripId: id, event: "weather.fetch_failed" }, "weather fetch failed");
      return NextResponse.json({ error: "Weather fetch failed" }, { status: 502 });
    }

    // Cache in Supabase
    await supabase
      .from("trips")
      .update({
        weather_cache: forecast,
        weather_cache_updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    log.info({ tripId: id, destination: trip.destination, event: "weather.fetched" }, "weather fetched and cached");
    return NextResponse.json(forecast);
  }
);
