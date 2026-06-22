import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { buildItineraryPrompt } from "@/lib/prompts/itinerary";
import { createTripWithItinerary } from "@/lib/db/trips";
import { stripGroqJson } from "@/lib/trip-utils";
import type { TripFormData, GeneratedItinerary } from "@/types/trip";

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];
const GROQ_MODELS = [
  { id: "llama-3.1-8b-instant", maxTokens: 6000 },
  { id: "gemma2-9b-it",         maxTokens: 6000 },
];

function isRateLimit(err: unknown): boolean {
  if (typeof err === "object" && err !== null && "status" in err) {
    return (err as { status: number }).status === 429;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("429") || msg.includes("rate_limit") || msg.includes("too many request");
  }
  return false;
}

function isSkippable(err: unknown): boolean {
  if (typeof err === "object" && err !== null && "status" in err) {
    const s = (err as { status: number }).status;
    if (s === 401 || s === 403) return false;
    return true;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes("rate limit") || msg.includes("model") || msg.includes("context") || msg.includes("429");
  }
  return false;
}

function extractWaitTime(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/try again in ([^.]+)/i);
  return match ? match[1].trim() : null;
}

const STATUSES = [
  { message: "Mapping your destination...",        progress: 8  },
  { message: "Researching local highlights...",    progress: 20 },
  { message: "Planning optimal routes...",         progress: 35 },
  { message: "Curating dining recommendations...", progress: 50 },
  { message: "Adding weather context...",          progress: 62 },
  { message: "Crafting your daily schedule...",    progress: 74 },
  { message: "Personalizing every detail...",      progress: 84 },
];

function repairJson(raw: string): string | null {
  const s = raw.replace(/```(?:json)?\n?/g, "").replace(/```/g, "");
  const start = s.indexOf("{");
  if (start === -1) return null;
  let str = s.slice(start);
  const stack: string[] = [];
  let inStr = false, esc = false;
  for (const ch of str) {
    if (esc) { esc = false; continue; }
    if (ch === "\\" && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  str = str.trimEnd().replace(/,\s*$/, "");
  const candidate = str + stack.reverse().join("");
  try { JSON.parse(candidate); return candidate; } catch { return null; }
}

async function geocodePlace(name: string, destination: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${name}, ${destination}`);
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${q}&limit=1&lang=en`,
      { headers: { "User-Agent": "Roamly/1.0" }, signal: AbortSignal.timeout(4_000) }
    );
    if (!res.ok) return null;
    const json: { features?: Array<{ geometry: { coordinates: [number, number] } }> } = await res.json();
    if (!json.features?.length) return null;
    const [lng, lat] = json.features[0].geometry.coordinates;
    if (!lat || !lng) return null;
    return { lat, lng };
  } catch { return null; }
}

async function geocodeItinerary(itinerary: GeneratedItinerary, destination: string): Promise<void> {
  await Promise.all(
    itinerary.days.flatMap((day) =>
      day.places.map(async (place) => {
        const coords = await geocodePlace(place.name, destination);
        if (coords) { place.lat = coords.lat; place.lng = coords.lng; }
      })
    )
  );
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const windowStart = new Date(Date.now() - 30_000).toISOString();
  const { count } = await supabase
    .from("trips").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("created_at", windowStart);
  if (typeof count === "number" && count >= 2) {
    return NextResponse.json({ error: "Please wait a moment before generating another itinerary." }, { status: 429 });
  }

  const formData: TripFormData = await request.json();
  if (!formData.destination || !formData.arrivalDate || !formData.departureDate) {
    return NextResponse.json({ error: "Missing required trip fields." }, { status: 400 });
  }

  const prompt = buildItineraryPrompt(formData);
  const encoder = new TextEncoder();
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

  const readableStream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      let statusIdx = 0;
      send({ type: "status", ...STATUSES[0] });
      const statusInterval = setInterval(() => {
        statusIdx = Math.min(statusIdx + 1, STATUSES.length - 1);
        send({ type: "status", ...STATUSES[statusIdx] });
      }, 3_200);

      try {
        let fullText = "";
        let lastErr: unknown = null;
        let lastRateLimitErr: unknown = null;

        // ── Gemini first (1M TPM, 1500 RPD free) ─────────────────────────────
        if (process.env.GOOGLE_AI_API_KEY) {
          const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
          for (const modelName of GEMINI_MODELS) {
            try {
              const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
              });
              const result = await model.generateContent(prompt);
              fullText = result.response.text();
              if (fullText) break;
            } catch (err) {
              lastErr = err;
              if (isRateLimit(err)) lastRateLimitErr = err;
              console.warn(`[generate] gemini/${modelName} failed:`, err instanceof Error ? err.message : err);
              fullText = "";
            }
          }
        }

        // ── Groq fallback ─────────────────────────────────────────────────────
        if (!fullText) {
          for (const { id, maxTokens } of GROQ_MODELS) {
            try {
              const stream = await groq.chat.completions.create({
                model: id, max_tokens: maxTokens, temperature: 0.7,
                messages: [{ role: "user", content: prompt }],
                stream: true,
              });
              let text = "";
              for await (const chunk of stream) {
                text += chunk.choices[0]?.delta?.content ?? "";
              }
              if (text) { fullText = text; break; }
            } catch (err) {
              lastErr = err;
              if (isRateLimit(err)) lastRateLimitErr = err;
              if (!isSkippable(err)) throw err;
              console.warn(`[generate] groq/${id} failed, trying next`);
            }
          }
        }

        if (!fullText) {
          if (lastRateLimitErr) {
            const wait = extractWaitTime(lastRateLimitErr);
            throw new Error(wait ? `AI is busy. Try again in ${wait}.` : "AI is busy. Try again in a minute.");
          }
          const detail = lastErr instanceof Error ? lastErr.message : String(lastErr ?? "unknown");
          throw new Error(`Generation failed: ${detail}`);
        }

        clearInterval(statusInterval);

        let jsonStr = stripGroqJson(fullText);
        if (!jsonStr) jsonStr = repairJson(fullText);
        if (!jsonStr) throw new Error("Unexpected response format. Please try again.");

        let itinerary: GeneratedItinerary;
        try {
          itinerary = JSON.parse(jsonStr) as GeneratedItinerary;
        } catch {
          throw new Error("Unexpected response format. Please try again.");
        }
        if (!itinerary.days?.length) throw new Error("Generated itinerary has no days. Please try again.");

        send({ type: "status", message: "Pinning locations on the map...", progress: 90 });
        await geocodeItinerary(itinerary, formData.destination);

        send({ type: "status", message: "Saving your itinerary...", progress: 96 });
        const tripId = await createTripWithItinerary(formData, itinerary, user.id);
        send({ type: "complete", tripId, progress: 100 });

      } catch (err) {
        clearInterval(statusInterval);
        console.error("[generate] error:", err);
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
