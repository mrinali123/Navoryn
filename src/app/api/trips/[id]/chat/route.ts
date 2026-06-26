import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";
import { getTripWithDays, saveChatMessage, getDailyMessageCount } from "@/lib/db/trips";
import { buildChatSystemPrompt } from "@/lib/prompts/chat-context";
import { withLogger, getLog } from "@/lib/with-logger";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const MAX_DAILY = 30;
const MAX_MESSAGE_LEN = 4_000;

export const POST = withLogger(
  "trips.chat",
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const log = getLog();
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      log.warn({ event: "auth.unauthorized" }, "unauthorized trip chat request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const {
        message,
        history = [],
        currentDay,
        // `silent` suppresses message persistence (background conflict checks),
        // but the rate limit is ALWAYS enforced regardless of this flag so that
        // clients cannot bypass the daily cap by flipping silent=true.
        silent = false,
      }: {
        message: string;
        history: { role: string; content: string }[];
        currentDay?: number;
        silent?: boolean;
      } = await request.json();

      if (!message?.trim()) {
        return NextResponse.json({ error: "Empty message" }, { status: 400 });
      }

      if (message.length > MAX_MESSAGE_LEN) {
        return NextResponse.json(
          { error: `Message must be ${MAX_MESSAGE_LEN} characters or fewer` },
          { status: 400 }
        );
      }

      // Rate limit is always checked — silent flag does NOT bypass it
      const count = await getDailyMessageCount(id, user.id);
      if (count >= MAX_DAILY) {
        log.warn(
          { userId: user.id, tripId: id, dailyCount: count, limit: MAX_DAILY, event: "rate_limit" },
          "trip chat rate limit hit"
        );
        return NextResponse.json(
          { error: `You've reached today's limit of ${MAX_DAILY} messages. Resets at midnight.` },
          { status: 429 }
        );
      }

      const trip = await getTripWithDays(id, user.id);
      if (!trip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
      }

      const systemPrompt = buildChatSystemPrompt(trip, currentDay);

      // Trim to last 10 messages to control token cost
      const trimmedHistory = history.slice(-10);

      const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...trimmedHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ];

      // Persist user message (skip for silent background checks to avoid
      // polluting the chat history shown to the user)
      if (!silent) {
        await saveChatMessage(id, user.id, "user", message);
      }

      const aiStart = performance.now();
      log.info(
        {
          userId: user.id,
          tripId: id,
          model: "llama-3.1-8b-instant",
          messageCount: messages.length,
          silent,
          maxTokens: 1024,
          event: "ai.request",
        },
        "groq trip chat request"
      );

      const stream = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      });

      log.info(
        { ttfb_ms: Math.round(performance.now() - aiStart), event: "ai.stream_start" },
        "groq stream opened"
      );

      let fullResponse = "";

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content ?? "";
              if (text) {
                fullResponse += text;
                controller.enqueue(new TextEncoder().encode(text));
              }
            }
            if (!silent && fullResponse) {
              await saveChatMessage(id, user.id, "assistant", fullResponse);
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
      log.error({ err: error, tripId: id, event: "request.error" }, "trip chat request failed");
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
);

export const DELETE = withLogger(
  "trips.chat.delete",
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const log = getLog();
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      log.warn({ event: "auth.unauthorized" }, "unauthorized clear chat request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await supabase
      .from("trip_chats")
      .delete()
      .eq("trip_id", id)
      .eq("user_id", user.id);

    log.info({ userId: user.id, tripId: id, event: "chat.cleared" }, "trip chat history cleared");

    return NextResponse.json({ ok: true });
  }
);
