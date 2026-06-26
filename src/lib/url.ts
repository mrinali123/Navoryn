const PRODUCTION_URL = "https://navoryn.vercel.app";

/**
 * Returns the app base URL for the current environment.
 *
 * Client-side: always uses window.location.origin — correct in any environment
 * without depending on env vars.
 *
 * Server-side: uses NEXT_PUBLIC_APP_URL env var, falls back to the hardcoded
 * production URL so emails are never broken by a missing or misconfigured env var.
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? PRODUCTION_URL;
}
