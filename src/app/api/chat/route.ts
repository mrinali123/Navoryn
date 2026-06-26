import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";
import { withLogger, getLog } from "@/lib/with-logger";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const MAX_DAILY = 20;
const MAX_MESSAGE_LEN = 4_000;

const SYSTEM_PROMPT = `You are Navoryn AI, a friendly expert travel assistant. Help users plan trips, discover destinations, pack smarter, and travel better.

BEHAVIOUR:
- Be warm, enthusiastic, and concise
- Give practical, actionable travel advice
- Suggest real destinations and real experiences
- Keep responses under 200 words unless a detailed breakdown is explicitly requested
- Use bullet points for lists, prose for conversational replies
- Use travel emojis occasionally to keep it friendly ✈️ 🗺️ 🍽️
- If someone is ready to plan a specific trip, encourage them to use Navoryn's trip planner`;

export const POST = withLogger("chat", async (request: NextRequest) => {
  const log = getLog();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    log.warn({ event: "auth.unauthorized" }, "unauthorized chat request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("trip_chats")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "user")
    .is("trip_id", null)
    .gte("created_at", today.toISOString());

  if (typeof count === "number" && count >= MAX_DAILY) {
    log.warn(
      { userId: user.id, dailyCount: count, limit: MAX_DAILY, event: "rate_limit" },
      "daily chat limit reached"
    );
    return NextResponse.json(
      { error: "You've reached today's limit of 20 messages. Resets at midnight." },
      { status: 429 }
    );
  }

  try {
    const {
      message,
      history = [],
    }: { message: string; history: { role: string; content: string }[] } =
      await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Empty message" }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LEN) {
      return NextResponse.json(
        { error: `Message must be ${MAX_MESSAGE_LEN} characters or fewer` },
        { status: 400 }
      );
    }

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-8).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Log user message so rate limit persists across cold starts
    await supabase.from("trip_chats").insert({
      user_id: user.id,
      trip_id: null,
      role: "user",
      content: message,
    });

    const aiStart = performance.now();
    log.info(
      {
        userId: user.id,
        model: "llama-3.1-8b-instant",
        messageCount: messages.length,
        maxTokens: 512,
        event: "ai.request",
      },
      "groq request"
    );

    const stream = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      stream: true,
      max_tokens: 512,
      temperature: 0.7,
    });

    log.info(
      { ttfb_ms: Math.round(performance.now() - aiStart), event: "ai.stream_start" },
      "groq stream opened"
    );

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(new TextEncoder().encode(text));
          }
          log.info(
            { total_ms: Math.round(performance.now() - aiStart), event: "ai.stream_end" },
            "groq stream complete"
          );
        } catch (e) {
          log.error({ err: e, event: "ai.stream_error" }, "groq stream error");
          controller.error(e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    log.error({ err: error, event: "request.error" }, "chat request failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
