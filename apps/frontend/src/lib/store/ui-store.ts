import { create } from "zustand";

interface UIState {
  feedFilter: "all" | "lost" | "found";
  setFeedFilter: (filter: "all" | "lost" | "found") => void;
  isPostModalOpen: boolean;
  setPostModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  feedFilter: "all",
  setFeedFilter: (filter) => set({ feedFilter: filter }),
  isPostModalOpen: false,
  setPostModalOpen: (open) => set({ isPostModalOpen: open }),
}));
