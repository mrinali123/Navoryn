import { NextResponse, type NextRequest } from "next/server";
import { nanoid } from "nanoid";

// ---------------------------------------------------------------------------
// Auth-event logging for middleware
// ---------------------------------------------------------------------------
// Next.js middleware runs exclusively in the Edge Runtime, which does NOT
// support Node.js built-ins (streams, async_hooks, etc.) that pino depends on.
// We therefore cannot import from @/lib/logger here.
//
// Instead we emit structured JSON to the console, which Vercel captures and
// indexes identically to server-function logs.  The schema intentionally
// mirrors the pino JSON format (level/time/service/msg) so log aggregators
// can parse both sources uniformly.
//
// We only log when the middleware actually makes a routing decision (redirects)
// — pass-through requests are silent to avoid O(n) noise on every static asset
// or API preflight.

function edgeLog(
  level: "info" | "warn",
  data: Record<string, string>,
  msg: string
) {
  const entry = {
    level,
    time: new Date().toISOString(),
    service: "navoryn",
    ...data,
    msg,
  };
  if (level === "warn") console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

// ---------------------------------------------------------------------------

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) =>
      c.name.startsWith("sb-") &&
      c.name.endsWith("-auth-token") &&
      c.value.length > 0
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = isAuthenticated(request);

  // Protected routes — redirect unauthenticated users to sign-in.
  if (
    !authed &&
    (pathname.startsWith("/dashboard") || pathname.startsWith("/trips"))
  ) {
    const requestId = nanoid(10);
    edgeLog("warn", { requestId, path: pathname, event: "auth.unauthenticated" },
      "protected route accessed without session — redirecting to signin");
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  // Auth pages — redirect already-authenticated users to the dashboard.
  const AUTH_EXCEPTIONS = ["/auth/reset-password", "/auth/callback"];
  if (
    authed &&
    pathname.startsWith("/auth") &&
    !AUTH_EXCEPTIONS.some((p) => pathname.startsWith(p))
  ) {
    const requestId = nanoid(10);
    edgeLog("info", { requestId, path: pathname, event: "auth.already_authenticated" },
      "authenticated user on auth page — redirecting to dashboard");
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
