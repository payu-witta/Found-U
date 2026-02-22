"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { setBackendTokens, clearBackendTokens } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/constants";

export function BackendAuthSync() {
  const { data: session, status } = useSession();
  const didSync = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session || didSync.current) return;

    // Path 1: Server-side callback already got backend tokens
    if (session.backendAccessToken && session.backendRefreshToken) {
      setBackendTokens(session.backendAccessToken, session.backendRefreshToken);
      didSync.current = true;
      return;
    }

    // Path 2: Server-side callback failed — exchange Google ID token client-side
    const idToken = (session as any).idToken;
    if (!idToken) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });

        if (res.ok) {
          const data = await res.json();
          const result = data.data ?? data;
          if (result.accessToken && result.refreshToken) {
            setBackendTokens(result.accessToken, result.refreshToken);
            didSync.current = true;
          }
        } else {
          console.error("[FoundU] Client-side backend login failed:", res.status);
        }
      } catch (err) {
        console.error("[FoundU] Client-side backend login error:", err);
      }
    })();
  }, [session, status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      clearBackendTokens();
      didSync.current = false;
    }
  }, [status]);

  return null;
}
