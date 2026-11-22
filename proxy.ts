import { NextResponse, type NextRequest } from "next/server";
import { findUserBySession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login" || pathname === "/register") return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (!findUserBySession(token)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  const secure = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(secure));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login).*)"],
};
