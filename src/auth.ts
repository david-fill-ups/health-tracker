import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "../auth.config";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    session({ session, user }) {
      session.user.id = user.id;
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
    },
  },
});
