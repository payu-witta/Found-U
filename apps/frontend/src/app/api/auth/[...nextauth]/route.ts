import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        return profile?.email?.endsWith("@umass.edu") ?? false;
      }
      return false;
    },
    async jwt({ token, account }) {
      // On initial sign-in, store the Google ID token and try backend exchange
      if (account?.id_token) {
        // Always store the Google ID token as fallback for client-side login
        token.googleIdToken = account.id_token;

        try {
          const res = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: account.id_token }),
          });

          if (res.ok) {
            const data = await res.json();
            const result = data.data ?? data;
            token.backendAccessToken = result.accessToken;
            token.backendRefreshToken = result.refreshToken;
            token.backendUserId = result.user?.id;
            console.log("[FoundU] Backend login succeeded for", token.email);
          } else {
            const errText = await res.text().catch(() => "");
            console.error(`[FoundU] Backend login failed (${res.status}): ${errText}`);
          }
        } catch (err) {
          console.error("[FoundU] Backend login network error:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).backendAccessToken = token.backendAccessToken;
      (session as any).backendRefreshToken = token.backendRefreshToken;
      (session as any).backendUserId = token.backendUserId;
      // Expose Google ID token as fallback for client-side backend login
      (session as any).idToken = token.googleIdToken;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
