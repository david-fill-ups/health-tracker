import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

// Strip session-related adapter methods so NextAuth v5 beta cannot fall back
// to database sessions — JWT strategy must be used end-to-end.
const { createSession, getSessionAndUser, updateSession, deleteSession, ...jwtAdapter } =
  PrismaAdapter(prisma) as ReturnType<typeof PrismaAdapter> & Record<string, unknown>;

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: jwtAdapter,
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      // Expose the user's DB id on the session object
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
