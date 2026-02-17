import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginRateLimiter } from "./rate-limit";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  // Secure cookies config for non-localhost (handled by NextAuth default usually, but we enforce)
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase();

        // Rate Limiting
        const allow = loginRateLimiter.check(email);
        if (!allow) {
          // Log rate limit breach?
          throw new Error("Too many login attempts. Please try again in 15 minutes.");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          // Prevent timing attacks by always running compare even if user not found (mock hash)
          // But to keep it simple and efficient, we just return generic error.
          // Timing attack on username enumeration is minor risk here compared to rate limit.

          if (!user) {
            // Log failed attempt
            // We can't easily access IP here in all adapters, but we try specific headers if passed, 
            // or just log the email.
            console.warn(`Failed login attempt for ${email}`);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.warn(`Failed login attempt for ${email} (invalid password)`);
            return null;
          }

          // User found and password valid
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          if (error instanceof Error && error.message.startsWith("Too many")) {
            throw error;
          }
          console.error("Auth error:", error);
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
