import { apiClient } from "./client";
import type { User } from "@/lib/types";

export async function loginUser(token: string): Promise<User> {
  return apiClient<User>("/auth/login", {
    method: "POST",
    body: { token },
  });
}
