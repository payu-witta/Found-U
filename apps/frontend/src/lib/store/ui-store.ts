import { create } from "zustand";

export type FeedTypeFilter = "all" | "lost" | "found";
export type FeedSort = "newest" | "oldest";

interface UIState {
  feedFilter: FeedTypeFilter;
  setFeedFilter: (filter: FeedTypeFilter) => void;
  feedCategory: string | null;
  setFeedCategory: (category: string | null) => void;
  feedLocation: string | null;
  setFeedLocation: (location: string | null) => void;
  feedSort: FeedSort;
  setFeedSort: (sort: FeedSort) => void;
  isPostModalOpen: boolean;
  setPostModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  feedFilter: "all",
  setFeedFilter: (filter) => set({ feedFilter: filter }),
  feedCategory: null,
  setFeedCategory: (category) => set({ feedCategory: category }),
  feedLocation: null,
  setFeedLocation: (location) => set({ feedLocation: location }),
  feedSort: "newest",
  setFeedSort: (sort) => set({ feedSort: sort }),
  isPostModalOpen: false,
  setPostModalOpen: (open: boolean) => set({ isPostModalOpen: open }),
}));
