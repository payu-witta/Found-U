"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { searchItems } from "@/lib/api/items";
import { reverseImageSearch } from "@/lib/api/ai";

const SEARCH_DEBOUNCE_MS = 300;

export function useSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    if (query.length < 2) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchItems(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });
}

export function useReverseImageSearch() {
  return useMutation({
    mutationFn: (image: File) => reverseImageSearch(image),
  });
}
