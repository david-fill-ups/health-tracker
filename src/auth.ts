import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "../auth.config";
import { logAudit } from "@/lib/audit";

// Strip session-related adapter methods so NextAuth v5 beta uses JWT sessions
// end-to-end. User and account management (createUser, linkAccount, etc.) still
// goes through Prisma so the createUser event and invitation logic still fires.
const { createSession, getSessionAndUser, updateSession, deleteSession, ...jwtAdapter } =
  PrismaAdapter(prisma) as ReturnType<typeof PrismaAdapter> & Record<string, unknown>;

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: jwtAdapter,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      // user is present on first sign-in (populated by the adapter's getUser/createUser)
      if (user?.id) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return;
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entityType: "User",
          entityId: user.id,
          metadata: { email: user.email },
        },
      });
      const pending = await prisma.profileInvitation.findMany({
        where: { email: user.email },
      });
      if (pending.length === 0) return;
      await prisma.$transaction([
        ...pending.map((inv) =>
          prisma.profileAccess.create({
            data: { profileId: inv.profileId, userId: user.id!, permission: inv.permission },
          })
        ),
        prisma.profileInvitation.deleteMany({ where: { email: user.email! } }),
      ]);
      await Promise.all(
        pending.map((inv) =>
          logAudit(user.id!, inv.profileId, "SHARE_PROFILE", "ProfileAccess", undefined, {
            grantedTo: user.email,
            permission: inv.permission,
            via: "invitation",
          })
        )
      );
    },
  },
});
