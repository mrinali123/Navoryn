import { NextResponse, type NextRequest } from "next/server";

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token") && c.value.length > 0
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = isAuthenticated(request);

  if (!authed && (pathname.startsWith("/dashboard") || pathname.startsWith("/trips"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  const AUTH_EXCEPTIONS = ["/auth/reset-password", "/auth/callback"];
  if (authed && pathname.startsWith("/auth") && !AUTH_EXCEPTIONS.some((p) => pathname.startsWith(p))) {
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
