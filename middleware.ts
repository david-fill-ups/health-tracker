import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const { auth } = NextAuth(authConfig);

// Rate limiter instance — only created when Upstash env vars are present.
// Falls back to no-op so the app works without a Redis instance configured.
let ratelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    // 60 requests per minute per IP across all authenticated API routes.
    // The public /api/calendar route has its own stricter limit below.
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    prefix: "ht:api",
    analytics: false,
  });
}

export default auth(async function middleware(req: NextRequest) {
  if (ratelimit) {
    const isApi = req.nextUrl.pathname.startsWith("/api/");
    const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

    if (isApi && !isAuthApi) {
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        req.headers.get("x-real-ip") ??
        "anonymous";

      // Stricter limit for the public calendar endpoint (no session required)
      const isCalendar = req.nextUrl.pathname.startsWith("/api/calendar");
      const limiter = isCalendar
        ? new Ratelimit({
            redis: (ratelimit as Ratelimit & { redis: Redis }).redis,
            limiter: Ratelimit.slidingWindow(10, "1 m"),
            prefix: "ht:cal",
            analytics: false,
          })
        : ratelimit;

      const { success } = await limiter.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  // Protect all routes except static assets and Next.js internals
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
