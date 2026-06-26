import pino from "pino";
import { AsyncLocalStorage } from "node:async_hooks";
import { nanoid } from "nanoid";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Single pino logger for the entire server-side application.
 *
 * In development: writes human-readable output via pino-pretty (worker thread).
 * In production: writes newline-delimited JSON — compatible with any log aggregator
 *   (Vercel log drain, Datadog, CloudWatch, Loki, etc.).
 *
 * The LOG_LEVEL env var overrides the default (debug in dev, info in prod).
 * Valid values: trace | debug | info | warn | error | fatal
 *
 * pino was chosen over winston/console because:
 * - It is ~10× faster (async, non-blocking I/O)
 * - It serializes Error objects (message + stack) correctly out of the box
 * - It supports child loggers so every log line carries request context
 *   without the caller having to pass a logger reference down the call stack
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  // Include a static "service" field on every log line for easy filtering.
  base: { service: "navoryn" },
  // ISO-8601 timestamps are machine-readable and supported by every aggregator.
  timestamp: pino.stdTimeFunctions.isoTime,
  // Serialize Error objects to { type, message, stack } instead of [Object].
  serializers: { err: pino.stdSerializers.err },
  // pino-pretty runs in a worker thread — no blocking in the main event loop.
  // The spread is a no-op in production (isDev === false).
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss.l",
        // pid and hostname clutter dev output; service is static.
        ignore: "pid,hostname",
      },
    },
  }),
});

// ---------------------------------------------------------------------------
// Per-request context via AsyncLocalStorage
// ---------------------------------------------------------------------------
// AsyncLocalStorage (Node.js built-in) propagates a value through the entire
// async call graph of a single request — Promises, stream callbacks, timers
// spawned within a `run()` scope all inherit the stored context automatically.
// This lets any code (db helpers, AI wrappers, etc.) call `getLog()` and get
// a logger that already carries the current requestId without threading it
// through every function signature.

export interface RequestStore {
  requestId: string;
  log: pino.Logger;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

/**
 * Returns the pino child logger scoped to the current request, or falls back
 * to the root logger when called outside a request context (e.g. cold-start
 * initialisation code).
 */
export function getLog(): pino.Logger {
  return requestContext.getStore()?.log ?? logger;
}

/**
 * Returns the requestId of the current request, or undefined when called
 * outside a request context.
 */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

/**
 * Generates a short, URL-safe, collision-resistant request ID (10 chars ≈
 * 50 bits of entropy — far more than enough for per-instance uniqueness).
 */
export function generateRequestId(): string {
  return nanoid(10);
}
