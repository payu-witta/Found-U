import { API_BASE_URL } from "@/lib/constants";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Backend token storage ──────────────────────────────────────────────────────

let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let loginPromise: Promise<void> | null = null;

function loadTokens() {
  if (typeof window === "undefined") return;
  if (!cachedAccessToken) {
    cachedAccessToken = sessionStorage.getItem("foundu_access_token");
    cachedRefreshToken = sessionStorage.getItem("foundu_refresh_token");
  }
}

export function setBackendTokens(accessToken: string, refreshToken: string) {
  cachedAccessToken = accessToken;
  cachedRefreshToken = refreshToken;
  if (typeof window !== "undefined") {
    sessionStorage.setItem("foundu_access_token", accessToken);
    sessionStorage.setItem("foundu_refresh_token", refreshToken);
  }
}

export function clearBackendTokens() {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  loginPromise = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("foundu_access_token");
    sessionStorage.removeItem("foundu_refresh_token");
  }
}

// ── Ensure we have a backend token ─────────────────────────────────────────────
// If no token in cache/sessionStorage, grab the Google ID token from NextAuth
// session and exchange it for a backend JWT. This makes the flow self-healing:
// even if the server-side callback failed, the client recovers.

async function ensureBackendToken(): Promise<string | null> {
  loadTokens();
  if (cachedAccessToken) return cachedAccessToken;

  // Prevent multiple simultaneous login attempts
  if (loginPromise) {
    await loginPromise;
    return cachedAccessToken;
  }

  loginPromise = (async () => {
    try {
      const { getSession } = await import("next-auth/react");
      const session = await getSession();

      // First try: session already has backend tokens (from server-side callback)
      if (session?.backendAccessToken && session?.backendRefreshToken) {
        setBackendTokens(session.backendAccessToken, session.backendRefreshToken);
        return;
      }

      // Second try: we have a Google ID token — exchange it with the backend
      const idToken = (session as any)?.idToken;
      if (!idToken) {
        console.warn("[FoundU] No Google ID token in session — cannot authenticate with backend");
        return;
      }

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "unknown");
        console.error(`[FoundU] Backend login failed (${res.status}): ${err}`);
        return;
      }

      const data = await res.json();
      const result = data.data ?? data;
      if (result.accessToken && result.refreshToken) {
        setBackendTokens(result.accessToken, result.refreshToken);
      }
    } catch (err) {
      console.error("[FoundU] Backend auth error:", err);
    } finally {
      loginPromise = null;
    }
  })();

  await loginPromise;
  return cachedAccessToken;
}

// ── Refresh logic ──────────────────────────────────────────────────────────────

async function refreshBackendToken(): Promise<string | null> {
  loadTokens();
  if (!cachedRefreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: cachedRefreshToken }),
    });

    if (!response.ok) {
      clearBackendTokens();
      return null;
    }

    const data = await response.json();
    const tokens = data.data ?? data;
    setBackendTokens(tokens.accessToken, tokens.refreshToken);
    return tokens.accessToken;
  } catch {
    clearBackendTokens();
    return null;
  }
}

// ── API client ─────────────────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;

  // Ensure we have a backend JWT before making any request
  const token = await ensureBackendToken();

  const headers: Record<string, string> = {
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const doFetch = () =>
    fetch(`${API_BASE_URL}${endpoint}`, {
      ...rest,
      headers,
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    });

  let response = await doFetch();

  // If 401, try refreshing the token and retry once
  if (response.status === 401) {
    const newToken = await refreshBackendToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await doFetch();
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message =
      errorData?.error?.message ||
      errorData?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, errorData);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
