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
  postFoundItem,
  getUserItems,
} from "@/lib/api/items";
import type { PostFoundItemPayload, FeedResponse } from "@/lib/types";
import type { FeedParams } from "@/lib/api/items";

export function useFeed(params: Omit<FeedParams, "cursor">) {
  return useInfiniteQuery<FeedResponse>({
    queryKey: ["feed", params],
    queryFn: ({ pageParam }) =>
      getFeed({
        ...params,
        cursor: pageParam as string | undefined,
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
