import type { WeatherDay, WeatherForecast, WeatherHour } from "@/types/weather";

export const WMO: Record<
  number,
  { icon: string; condition: string; isRain: boolean }
> = {
  0: { icon: "☀️", condition: "Clear sky", isRain: false },
  1: { icon: "🌤️", condition: "Mainly clear", isRain: false },
  2: { icon: "⛅", condition: "Partly cloudy", isRain: false },
  3: { icon: "☁️", condition: "Overcast", isRain: false },
  45: { icon: "🌫️", condition: "Fog", isRain: false },
  48: { icon: "🌫️", condition: "Rime fog", isRain: false },
  51: { icon: "🌦️", condition: "Light drizzle", isRain: true },
  53: { icon: "🌦️", condition: "Drizzle", isRain: true },
  55: { icon: "🌦️", condition: "Heavy drizzle", isRain: true },
  61: { icon: "🌧️", condition: "Slight rain", isRain: true },
  63: { icon: "🌧️", condition: "Rain", isRain: true },
  65: { icon: "🌧️", condition: "Heavy rain", isRain: true },
  71: { icon: "❄️", condition: "Slight snow", isRain: false },
  73: { icon: "❄️", condition: "Moderate snow", isRain: false },
  75: { icon: "❄️", condition: "Heavy snow", isRain: false },
  77: { icon: "🌨️", condition: "Snow grains", isRain: false },
  80: { icon: "🌦️", condition: "Slight showers", isRain: true },
  81: { icon: "🌧️", condition: "Showers", isRain: true },
  82: { icon: "🌧️", condition: "Violent showers", isRain: true },
  85: { icon: "🌨️", condition: "Snow showers", isRain: false },
  86: { icon: "🌨️", condition: "Heavy snow showers", isRain: false },
  95: { icon: "⛈️", condition: "Thunderstorm", isRain: true },
  96: { icon: "⛈️", condition: "Thunderstorm + hail", isRain: true },
  99: { icon: "⛈️", condition: "Thunderstorm + heavy hail", isRain: true },
};

export function getWeatherMeta(code: number) {
  return WMO[code] ?? WMO[0];
}

export function uvLabel(uv: number): { label: string; color: string } {
  if (uv < 3) return { label: "Low", color: "text-emerald-400" };
  if (uv < 6) return { label: "Moderate", color: "text-yellow-400" };
  if (uv < 8) return { label: "High", color: "text-orange-400" };
  if (uv < 11) return { label: "Very High", color: "text-red-400" };
  return { label: "Extreme", color: "text-purple-400" };
}

function parseTimeHour(timeStr: string): number | null {
  if (!timeStr) return null;
  const m24 = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (m24) return parseInt(m24[1]);
  const m12 = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (m12) {
    let h = parseInt(m12[1]);
    const meridiem = m12[3].toUpperCase();
    if (meridiem === "PM" && h !== 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    return h;
  }
  return null;
}

export function getWeatherForTime(
  hourly: WeatherHour[],
  date: string,
  timeStr: string
): WeatherHour | null {
  const h = parseTimeHour(timeStr);
  if (h === null) return null;
  const target = `${date}T${String(h).padStart(2, "0")}:00`;
  return hourly.find((x) => x.time === target) ?? null;
}

export async function geocodeDestination(
  destination: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Navoryn/1.0 travel-app" },
      cache: "no-store",
    });
    const data = await res.json();
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function fetchWeatherForecast(
  lat: number,
  lng: number
): Promise<WeatherForecast | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set(
      "hourly",
      "temperature_2m,weathercode,windspeed_10m,relativehumidity_2m,uv_index"
    );
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,weathercode");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "7");

    const res = await fetch(url.toString(), { cache: "no-store" });
    const j = await res.json();

    const daily: WeatherDay[] = (j.daily.time as string[]).map((date, i) => {
      const code: number = j.daily.weathercode[i] ?? 0;
      return {
        date,
        maxTemp: Math.round(j.daily.temperature_2m_max[i]),
        minTemp: Math.round(j.daily.temperature_2m_min[i]),
        weatherCode: code,
        ...getWeatherMeta(code),
      };
    });

    const hourly: WeatherHour[] = (j.hourly.time as string[]).map((time, i) => {
      const code: number = j.hourly.weathercode[i] ?? 0;
      return {
        time,
        temp: Math.round(j.hourly.temperature_2m[i]),
        weatherCode: code,
        humidity: j.hourly.relativehumidity_2m[i],
        windSpeed: Math.round(j.hourly.windspeed_10m[i]),
        uvIndex: j.hourly.uv_index[i] ?? 0,
        ...getWeatherMeta(code),
      };
    });

    return { lat, lng, daily, hourly, fetchedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
