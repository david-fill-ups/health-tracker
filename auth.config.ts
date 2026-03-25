import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe auth config — no Prisma imports here.
 * Used by middleware.ts which runs on the Edge runtime.
 */
export const authConfig: NextAuthConfig = {
  providers: [Google],
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname.startsWith("/login");
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
      const isPublicCalendar = nextUrl.pathname.startsWith("/api/calendar");
      // Public routes: login page, auth API, calendar feed (token-protected)
      if (isApiAuth || isPublicCalendar) return true;
      if (isLoginPage) {
        // Redirect logged-in users away from login
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      // All other routes require auth
      return isLoggedIn;
    },
  },
};
