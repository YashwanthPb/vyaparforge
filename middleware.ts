import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - /login
     * - /api/auth/:path* (NextAuth routes)
     * - /_next/:path* (Next.js internals)
     * - /favicon.ico
     */
    "/((?!login|api/auth|_next|favicon\\.ico).*)",
  ],
};
