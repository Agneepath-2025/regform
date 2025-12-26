import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

// List of admin emails who can access the admin panel
// Using NEXTAUTH_ADMIN_EMAILS to avoid conflict with ADMIN_EMAILS used by Google Sheets
const ADMIN_EMAILS = (process.env.NEXTAUTH_ADMIN_EMAILS || "").split(",").map(e => e.trim());

export const { handlers, signIn, signOut, auth } = NextAuth({
  // No database adapter - admin sessions are JWT-only (not stored in DB)
  // This keeps admin authentication completely separate from regular user data
  session: {
    strategy: "jwt", // Use JWT tokens instead of database sessions
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Only allow admin emails to sign in
      // No database check needed - purely whitelist-based
      if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
        return false;
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      // Add user info to JWT token (stored client-side, not in DB)
      if (account && profile) {
        token.email = profile.email;
        token.name = profile.name;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user info from JWT to session object
      if (session.user && token) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
})
