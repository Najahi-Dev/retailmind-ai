import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = ["/sign-in", "/api/auth", "/api/stripe"];

export function middleware(req: NextRequest) {
  const token = req.cookies.get("retailmind_token")?.value;
  const isPublic = publicRoutes.some((r) => req.nextUrl.pathname.startsWith(r));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (token && req.nextUrl.pathname === "/sign-in") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
