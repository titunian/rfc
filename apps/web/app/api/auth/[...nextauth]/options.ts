import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDb, isProductionDB } from "@/lib/db";
import { verificationCodes } from "@/lib/schema";
import { eq, and, gt } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      id: "email-otp",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null;
        if (!isProductionDB()) return null;

        const db = getDb();
        const email = credentials.email.toLowerCase();

        const [match] = await db
          .select()
          .from(verificationCodes)
          .where(
            and(
              eq(verificationCodes.email, email),
              eq(verificationCodes.code, credentials.code),
              gt(verificationCodes.expiresAt, new Date())
            )
          )
          .limit(1);

        if (!match) return null;

        // Delete used code
        await db
          .delete(verificationCodes)
          .where(eq(verificationCodes.id, match.id));

        return {
          id: email,
          email,
          name: email.split("@")[0],
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
