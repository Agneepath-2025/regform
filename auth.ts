import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI || "";
const client = new MongoClient(uri);

// List of admin emails who can access the admin panel
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(client, {
    databaseName: process.env.DB_NAME || "agneepath",
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true, // Allow linking Google account to existing email
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Only allow admin emails to sign in
      if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
        return false;
      }

      // Allow OAuth account linking
      // This allows users who signed up with email/password to also use Google OAuth
      if (account?.provider === "google") {
        return true;
      }

      return true;
    },
    async session({ session, user }) {
      // Add user id to session
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
})
