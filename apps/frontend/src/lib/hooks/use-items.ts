"use client";

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getFeed,
  getItem,
  postLostItem,
  postFoundItem,
  getUserItems,
} from "@/lib/api/items";
import type { PostLostItemPayload, PostFoundItemPayload, FeedResponse } from "@/lib/types";

interface FeedFilters {
  type?: string;
  category?: string | null;
  location?: string | null;
  sort?: "newest" | "oldest";
}

export function useFeed(filters?: FeedFilters) {
  return useInfiniteQuery<FeedResponse>({
    queryKey: ["feed", filters?.type ?? "found", filters?.category, filters?.location, filters?.sort],
    queryFn: ({ pageParam }) =>
      getFeed({
        cursor: pageParam as string | undefined,
        type: filters?.type ?? "found",
        category: filters?.category,
        location: filters?.location,
        sort: filters?.sort,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
    initialPageParam: undefined as string | undefined,
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ["item", id],
    queryFn: () => getItem(id),
    enabled: !!id,
  });
}

export function usePostLostItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PostLostItemPayload) => postLostItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function usePostFoundItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PostFoundItemPayload) => postFoundItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useUserItems() {
  return useQuery({
    queryKey: ["userItems"],
    queryFn: getUserItems,
  });
}
