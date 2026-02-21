"use client";

import { useQuery } from "@tanstack/react-query";
import { getMatches } from "@/lib/api/matches";

export function useMatches(itemId: string) {
  return useQuery({
    queryKey: ["matches", itemId],
    queryFn: () => getMatches(itemId),
    enabled: !!itemId,
  });
}
