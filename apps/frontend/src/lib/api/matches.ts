import { apiClient } from "./client";
import type { MatchesResponse } from "@/lib/types";

export async function getMatches(itemId: string): Promise<MatchesResponse> {
  return apiClient<MatchesResponse>(`/matches/${itemId}`);
}
