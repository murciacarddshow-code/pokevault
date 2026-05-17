import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
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
      session.user.id       = (token.id as string | undefined) ?? "";
      session.user.role     = (token.role     as string | undefined) ?? "USER";
      session.user.username = (token.username as string | null    | undefined) ?? null;
      return session;
    },
  },
});
