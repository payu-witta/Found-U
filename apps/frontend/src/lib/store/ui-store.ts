import { create } from "zustand";

interface UIState {
  feedCategory: string | null;
  setFeedCategory: (category: string | null) => void;
  feedLocation: string | null;
  setFeedLocation: (location: string | null) => void;
  feedSort: "newest" | "oldest";
  setFeedSort: (sort: "newest" | "oldest") => void;
  isPostModalOpen: boolean;
  setPostModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  feedCategory: null,
  setFeedCategory: (category) => set({ feedCategory: category }),
  feedLocation: null,
  setFeedLocation: (location) => set({ feedLocation: location }),
  feedSort: "newest",
  setFeedSort: (sort) => set({ feedSort: sort }),
  isPostModalOpen: false,
  setPostModalOpen: (open) => set({ isPostModalOpen: open }),
}));
