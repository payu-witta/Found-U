import "next-auth";

declare module "next-auth" {
  interface Session {
    backendAccessToken?: string;
    backendRefreshToken?: string;
    backendUserId?: string;
    idToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendAccessToken?: string;
    backendRefreshToken?: string;
    backendUserId?: string;
    googleIdToken?: string;
  }
}
