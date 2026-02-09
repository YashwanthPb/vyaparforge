import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("------------------------------");
        console.log("[AUTH] authorize() called");
        console.log("[AUTH] email:", credentials?.email);
        console.log("[AUTH] password provided:", !!credentials?.password);

        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] REJECTED: missing email or password");
          return null;
        }

        try {
          // Step 1: Find user by email
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          console.log("[AUTH] user found:", !!user);

          if (!user) {
            console.log("[AUTH] REJECTED: no user with that email");
            return null;
          }

          // Step 2: Compare password
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          console.log("[AUTH] password valid:", isPasswordValid);

          if (!isPasswordValid) {
            console.log("[AUTH] REJECTED: password mismatch");
            return null;
          }

          // Step 3: Return user object
          console.log("[AUTH] SUCCESS: returning user", user.email, user.role);
          console.log("------------------------------");
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("[AUTH] ERROR in authorize:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
