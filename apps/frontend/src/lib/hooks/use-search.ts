"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { searchItems } from "@/lib/api/items";
import { reverseImageSearch } from "@/lib/api/ai";

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => searchItems(query),
    enabled: query.length >= 2,
  });
}

export function useReverseImageSearch() {
  return useMutation({
    mutationFn: (image: File) => reverseImageSearch(image),
  });
}
