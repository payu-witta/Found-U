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

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  if (session?.accessToken) {
    return { Authorization: `Bearer ${session.accessToken}` };
  }
  return {};
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers: customHeaders, ...rest } = options;
  const authHeaders = await getAuthHeaders();

  const headers: Record<string, string> = {
    ...authHeaders,
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      errorData?.message || `Request failed with status ${response.status}`,
      errorData
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
