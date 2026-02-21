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

export function useFeed(filter?: string) {
  return useInfiniteQuery<FeedResponse>({
    queryKey: ["feed", filter],
    queryFn: ({ pageParam }) => getFeed(pageParam as string | undefined, filter),
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
