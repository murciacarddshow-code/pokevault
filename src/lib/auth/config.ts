import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";

// NOTE: No PrismaAdapter here.
// PrismaAdapter + JWT strategy conflict in NextAuth v5:
//   - Adapter tries to persist sessions in DB
//   - JWT strategy stores everything in the cookie
//   - Together they fight over session management
// With JWT-only strategy we don't need the adapter at all.
// User/Account/Session tables remain in schema for future OAuth support.

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) return null;
        if (user.isBanned) throw new Error("BANNED");

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id:       user.id,
          email:    user.email ?? "",
          name:     user.name ?? user.username ?? "",
          image:    user.image ?? null,
          role:     user.role,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        if (user.id) token.id = user.id;
        token.role     = (user as any).role     ?? "USER";
        token.username = (user as any).username ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id       = (token.id       as string | undefined) ?? "";
      session.user.role     = (token.role     as string | undefined) ?? "USER";
      session.user.username = (token.username as string | null | undefined) ?? null;
      return session;
    },
  },
  // Explicitly set cookie name so getToken() in middleware finds it in production
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path:     "/",
        secure:   process.env.NODE_ENV === "production",
      },
    },
  },
});
