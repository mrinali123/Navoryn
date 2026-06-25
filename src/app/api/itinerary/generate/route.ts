import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";
import { ITINERARY_SYSTEM_PROMPT, buildItineraryUserPrompt } from "@/lib/prompts/itinerary";
import { createTripWithItinerary } from "@/lib/db/trips";
import { stripGroqJson } from "@/lib/trip-utils";
import { runConstraintEngine, checkTravelFeasibility } from "@/lib/constraint-engine";
import type { TripFormData, GeneratedItinerary } from "@/types/trip";
import { withLogger, getLog } from "@/lib/with-logger";
import { estimateTokens } from "@/lib/prompts/itinerary";

// ---------------------------------------------------------------------------
// Model config
// ---------------------------------------------------------------------------

const GROQ_MODEL   = "llama-3.1-8b-instant";
// llama-3.1-8b-instant free tier: 6,000 TPM (tokens per request = input + max_tokens).
// Optimised prompt: ~600 tokens input. Max output for 7-day packed trip (no meals/weather): ~2,200 tokens.
// 600 + 3000 = 3,600 — comfortable margin below 6,000.
const MAX_TOKENS   = 3000;
const TEMPERATURE  = 0.4;  // lower = more deterministic JSON output
const MAX_ATTEMPTS = 2;    // retry once on parse failure before surfacing error
// Hard ceiling: abort if estimated request size approaches the TPM limit
const TPM_LIMIT    = 6000;
const TOKEN_GUARD  = 5500; // warn / block at 91% of limit

// ---------------------------------------------------------------------------
// SSE status messages
// ---------------------------------------------------------------------------

const STATUSES = [
  { message: "Mapping your destination...",        progress: 8  },
  { message: "Researching local highlights...",    progress: 20 },
  { message: "Planning optimal routes...",         progress: 35 },
  { message: "Curating dining recommendations...", progress: 50 },
  { message: "Scheduling activities by time...",   progress: 62 },
  { message: "Crafting your daily schedule...",    progress: 74 },
  { message: "Personalizing every detail...",      progress: 84 },
];

// ---------------------------------------------------------------------------
// Groq error helpers
// ---------------------------------------------------------------------------

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

function isRequestTooLarge(err: unknown): boolean {
  if (typeof err === "object" && err !== null && "status" in err) {
    return (err as { status: number }).status === 413;
  }
  if (err instanceof Error) {
    return err.message.includes("413") || err.message.toLowerCase().includes("request too large");
  }
  return false;
}

function extractWaitTime(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/try again in ([^.]+)/i);
  return match ? match[1].trim() : null;
}

// ---------------------------------------------------------------------------
// JSON repair — handles the full spectrum of Groq output issues
// ---------------------------------------------------------------------------

function robustRepairJson(raw: string): string | null {
  // 1. Strip markdown code fences (```json ... ``` or ``` ... ```)
  let s = raw
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  // 2. Strip common preamble prose the model adds before the JSON
  //    e.g. "Sure! Here is the itinerary:\n{"
  const jsonStart = s.indexOf("{");
  if (jsonStart === -1) return null;
  s = s.slice(jsonStart);

  // 3. Greedy match — take from first { to last }
  //    This handles prose appended after the JSON
  const lastClose = s.lastIndexOf("}");
  if (lastClose !== -1) {
    s = s.slice(0, lastClose + 1);
  }

  // 4. Fix trailing commas before } or ] (common LLM mistake)
  //    Runs iteratively to handle nested cases
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s
      .replace(/,(\s*})/g, "$1")
      .replace(/,(\s*])/g, "$1");
  }

  // 5. Try parsing as-is
  try {
    JSON.parse(s);
    return s;
  } catch { /* fall through to bracket-closing repair */ }

  // 6. Bracket-closing repair for truncated JSON (hit max_tokens)
  //    Walk the string tracking open brackets; append closers in reverse
  const stack: string[] = [];
  let inStr = false;
  let esc   = false;

  for (const ch of s) {
    if (esc)             { esc = false; continue; }
    if (ch === "\\" && inStr) { esc = true; continue; }
    if (ch === '"')      { inStr = !inStr; continue; }
    if (inStr)           continue;
    if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  const repaired = s.trimEnd().replace(/,\s*$/, "") + stack.reverse().join("");
  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Geocoding
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeCity(
  destination: string
): Promise<{ lat: number; lng: number } | null> {
  const q = encodeURIComponent(destination);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=jsonv2&limit=1&accept-language=en`,
      {
        headers: { "User-Agent": "Roamly/1.0 (portfolio project)" },
        signal: AbortSignal.timeout(6_000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data[0]) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

const STREET_TYPES = new Set([
  "street", "road", "way", "path", "city", "country",
  "state", "county", "district", "region", "province",
]);

async function geocodePlaceAccurate(
  name: string,
  destination: string,
  cityCenter: { lat: number; lng: number } | null
): Promise<{ lat: number; lng: number } | null> {
  const parts = destination.split(",").map((s) => s.trim());
  const city    = parts[0];
  const country = parts.length > 1 ? parts[parts.length - 1] : "";

  const delta = 1.5; // ~150 km bounding box half-side
  const bboxParam = cityCenter
    ? `&bbox=${cityCenter.lng - delta},${cityCenter.lat - delta},${cityCenter.lng + delta},${cityCenter.lat + delta}`
    : "";

  const MAX_KM = 150;

  const queries = [
    `${name}, ${city}${country ? `, ${country}` : ""}`,
    `${name}, ${city}`,
    name,
  ];

  for (const q of queries) {
    const encoded = encodeURIComponent(q);
    const url = `https://photon.komoot.io/api/?q=${encoded}&limit=5&lang=en${bboxParam}`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Roamly/1.0" },
        signal: AbortSignal.timeout(6_000),
      });
      if (!res.ok) continue;

      const json: {
        features?: Array<{
          geometry: { coordinates: [number, number] };
          properties: { type?: string };
        }>;
      } = await res.json();

      if (!json.features?.length) continue;

      // Sort: non-street types first (prefer actual POI results)
      const sorted = [...json.features].sort((a, b) => {
        const aStreet = STREET_TYPES.has((a.properties?.type ?? "").toLowerCase()) ? 1 : 0;
        const bStreet = STREET_TYPES.has((b.properties?.type ?? "").toLowerCase()) ? 1 : 0;
        return aStreet - bStreet;
      });

      for (const feature of sorted) {
        const [lng, lat] = feature.geometry.coordinates;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) continue;

        if (cityCenter) {
          const distKm = haversineKm(cityCenter.lat, cityCenter.lng, lat, lng);
          if (distKm > MAX_KM) continue; // reject: too far from destination city
        }

        return { lat, lng };
      }
    } catch { continue; }
  }

  return null; // no confident match — never use AI coordinates
}

async function geocodeItinerary(
  itinerary: GeneratedItinerary,
  destination: string
): Promise<void> {
  // Get city center once for distance validation
  const cityCenter = await geocodeCity(destination);

  // Geocode all places in parallel; on failure mark as 0,0 (filtered out on map)
  await Promise.allSettled(
    itinerary.days.flatMap((day) =>
      day.places.map(async (place) => {
        const coords = await geocodePlaceAccurate(place.name, destination, cityCenter);
        place.lat = coords?.lat ?? 0;
        place.lng = coords?.lng ?? 0;
      })
    )
  );
}

// ---------------------------------------------------------------------------
// Core generation — calls Groq, parses JSON, retries on failure
// ---------------------------------------------------------------------------

async function generateItinerary(
  groq: Groq,
  formData: TripFormData,
  attempt: number,
  log: ReturnType<typeof getLog>
): Promise<GeneratedItinerary> {
  const userPrompt = buildItineraryUserPrompt(formData);

  // ── Pre-flight token guard ────────────────────────────────────────────────
  const inputTokens   = estimateTokens(ITINERARY_SYSTEM_PROMPT) + estimateTokens(userPrompt);
  const totalEstimate = inputTokens + MAX_TOKENS;

  log.info(
    { inputTokens, maxTokens: MAX_TOKENS, totalEstimate, tpmLimit: TPM_LIMIT, event: "ai.token_estimate" },
    "token estimate before groq call"
  );

  if (totalEstimate > TOKEN_GUARD) {
    // This should not happen with the optimised prompt — log as error so we catch regressions
    log.error(
      { totalEstimate, tokenGuard: TOKEN_GUARD, tpmLimit: TPM_LIMIT, event: "ai.token_overflow" },
      "prompt would exceed token guard — aborting to avoid 413"
    );
    throw new Error(`Prompt too large (${totalEstimate} tokens, limit ${TPM_LIMIT}). Please shorten trip details.`);
  }

  log.info(
    { model: GROQ_MODEL, attempt, maxTokens: MAX_TOKENS, inputTokens, event: "ai.request" },
    "calling groq"
  );

  const modelStart = performance.now();

  // Stream the response to avoid gateway timeouts on longer trips
  const stream = await groq.chat.completions.create({
    model: GROQ_MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    stream: true,
    messages: [
      { role: "system", content: ITINERARY_SYSTEM_PROMPT },
      { role: "user",   content: userPrompt },
    ],
  });

  let fullText = "";
  for await (const chunk of stream) {
    fullText += chunk.choices[0]?.delta?.content ?? "";
  }

  const ms = Math.round(performance.now() - modelStart);
  log.info({ model: GROQ_MODEL, ms, chars: fullText.length, event: "ai.stream_end" }, "groq stream complete");

  if (!fullText.trim()) {
    throw new Error("Model returned an empty response.");
  }

  // ── JSON extraction ──────────────────────────────────────────────────────
  let jsonStr = stripGroqJson(fullText);
  if (!jsonStr) jsonStr = robustRepairJson(fullText);
  if (!jsonStr) {
    log.warn({ attempt, raw: fullText.slice(0, 300), event: "ai.bad_json" }, "could not extract JSON");
    throw new Error("The AI returned an unreadable format. Retrying…");
  }

  // ── Parse ────────────────────────────────────────────────────────────────
  let itinerary: GeneratedItinerary;
  try {
    itinerary = JSON.parse(jsonStr) as GeneratedItinerary;
  } catch (parseErr) {
    log.warn(
      { attempt, snippet: jsonStr.slice(0, 300), err: parseErr, event: "ai.parse_error" },
      "JSON.parse failed after repair"
    );
    throw new Error("Could not parse the generated itinerary. Retrying…");
  }

  if (!itinerary.days?.length) {
    throw new Error("Generated itinerary has no days. Retrying…");
  }

  return itinerary;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const POST = withLogger("itinerary.generate", async (request: NextRequest) => {
  const log      = getLog();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    log.warn({ event: "auth.unauthorized" }, "unauthorized itinerary request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: ≤ 2 trips per 30 seconds
  const windowStart = new Date(Date.now() - 30_000).toISOString();
  const { count } = await supabase
    .from("trips").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).gte("created_at", windowStart);

  if (typeof count === "number" && count >= 2) {
    log.warn({ userId: user.id, recentCount: count, event: "rate_limit" }, "rate limit hit");
    return NextResponse.json(
      { error: "Please wait a moment before generating another itinerary." },
      { status: 429 }
    );
  }

  const formData: TripFormData = await request.json();
  if (!formData.destination || !formData.arrivalDate || !formData.departureDate) {
    return NextResponse.json({ error: "Missing required trip fields." }, { status: 400 });
  }

  log.info(
    { userId: user.id, destination: formData.destination, event: "itinerary.start" },
    "itinerary generation started"
  );

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

  const encoder      = new TextEncoder();
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
      }, 3_000);

      const genStart = performance.now();

      try {
        // ── Generation with retry ──────────────────────────────────────────
        let itinerary: GeneratedItinerary | null = null;
        let lastErr: unknown = null;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            itinerary = await generateItinerary(groq, formData, attempt, log);
            break;
          } catch (err) {
            lastErr = err;

            if (isRateLimit(err)) {
              const wait = extractWaitTime(err);
              throw new Error(
                wait ? `AI is busy — try again in ${wait}.` : "AI is busy — try again in a moment."
              );
            }

            if (isRequestTooLarge(err)) {
              // 413 with the optimised prompt = something unexpected grew the prompt.
              // Don't retry — it will fail again. Surface immediately.
              throw new Error("Trip details are too long for the AI model. Try shortening the must-visit list or hotel address.");
            }

            if (attempt < MAX_ATTEMPTS) {
              log.warn(
                { attempt, reason: err instanceof Error ? err.message : String(err), event: "ai.retry" },
                "retrying generation"
              );
              send({ type: "status", message: "Retrying with a cleaner prompt…", progress: 40 });
              // Small pause before retry so we don't hammer the API
              await new Promise((r) => setTimeout(r, 1_500));
            }
          }
        }

        if (!itinerary) {
          const msg = lastErr instanceof Error ? lastErr.message : String(lastErr ?? "unknown error");
          // Clean up "Retrying…" suffix for the user-facing message
          throw new Error(msg.replace(/ Retrying…$/, "").trim() || "Generation failed after retries.");
        }

        clearInterval(statusInterval);

        // ── Constraint engine ──────────────────────────────────────────────
        send({ type: "status", message: "Validating schedule logic...", progress: 88 });

        let constraintResult = runConstraintEngine(itinerary, formData);

        // Log every auto-fix made by the engine
        for (const msg of constraintResult.fixLog) {
          log.warn({ event: "constraint.autofix" }, msg);
        }

        if (constraintResult.violations.length > 0) {
          log.warn(
            {
              violationCount: constraintResult.violations.length,
              violations: constraintResult.violations,
              event: "constraint.violations",
            },
            "constraint engine repaired itinerary violations"
          );
        } else {
          log.info({ event: "constraint.passed" }, "itinerary passed all constraint checks");
        }

        // If any day has 0 places the itinerary is structurally broken — try once more
        if (constraintResult.needsReview) {
          log.warn(
            { event: "constraint.regenerating" },
            "constraint engine flagged empty days — regenerating once"
          );
          send({ type: "status", message: "Refining your itinerary...", progress: 85 });

          try {
            const regenItinerary = await generateItinerary(groq, formData, MAX_ATTEMPTS + 1, log);
            constraintResult = runConstraintEngine(regenItinerary, formData);

            if (constraintResult.needsReview) {
              throw new Error(
                "Could not generate a complete itinerary. Please try again or adjust your trip details."
              );
            }
          } catch (regenErr) {
            if (
              regenErr instanceof Error &&
              regenErr.message.startsWith("Could not generate")
            ) {
              throw regenErr;
            }
            throw new Error(
              "Itinerary generation produced incomplete results. Please try again."
            );
          }
        }

        // ── Geocoding ──────────────────────────────────────────────────────
        send({ type: "status", message: "Pinning locations on the map...", progress: 92 });
        const geoStart = performance.now();
        await geocodeItinerary(constraintResult.repaired, formData.destination);
        log.info(
          { ms: Math.round(performance.now() - geoStart), event: "geocode.complete" },
          "geocoding complete"
        );

        // ── Post-geocoding travel feasibility check (warnings only) ────────
        const travelIssues = checkTravelFeasibility(constraintResult.repaired);
        if (travelIssues.length > 0) {
          for (const issue of travelIssues) {
            log.warn({ event: "constraint.travel_infeasible", ...issue }, issue.message);
          }
        }

        // ── Save ───────────────────────────────────────────────────────────
        send({ type: "status", message: "Saving your itinerary...", progress: 96 });
        const tripId = await createTripWithItinerary(formData, constraintResult.repaired, user.id);

        log.info(
          {
            tripId,
            totalMs:        Math.round(performance.now() - genStart),
            violationCount: constraintResult.violations.length,
            autoFixed:      constraintResult.autoFixed,
            event:          "itinerary.complete",
          },
          "itinerary saved"
        );
        send({ type: "complete", tripId, progress: 100 });

      } catch (err) {
        clearInterval(statusInterval);
        log.error(
          { err, ms: Math.round(performance.now() - genStart), event: "itinerary.error" },
          "itinerary generation failed"
        );
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type":     "text/event-stream",
      "Cache-Control":    "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection:         "keep-alive",
    },
  });
});
