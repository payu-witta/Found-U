"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useFeed } from "@/lib/hooks/use-items";
import { useUIStore } from "@/lib/store/ui-store";
import { ItemGrid } from "@/components/items/item-grid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BUILDINGS, CATEGORIES } from "@/lib/constants";

const selectClass =
  "min-w-[120px] appearance-none rounded-lg border border-gray-200 bg-white px-3 py-1.5 pr-8 text-sm text-gray-700 transition-colors duration-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-brand-500 dark:focus:ring-brand-500";

const typeFilters = [
  { key: "all" as const, label: "All" },
  { key: "lost" as const, label: "Lost" },
  { key: "found" as const, label: "Found" },
];

const sortOptions = [
  { key: "newest" as const, label: "Newest first" },
  { key: "oldest" as const, label: "Oldest first" },
];

export default function FeedPage() {
  const feedFilter = useUIStore((s) => s.feedFilter);
  const setFeedFilter = useUIStore((s) => s.setFeedFilter);
  const feedCategory = useUIStore((s) => s.feedCategory);
  const setFeedCategory = useUIStore((s) => s.setFeedCategory);
  const feedLocation = useUIStore((s) => s.feedLocation);
  const setFeedLocation = useUIStore((s) => s.setFeedLocation);
  const feedSort = useUIStore((s) => s.feedSort);
  const setFeedSort = useUIStore((s) => s.setFeedSort);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeed({
      type: feedFilter,
      category: feedCategory,
      location: feedLocation,
      sort: feedSort,
    });

  const observerRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      {/* Type filter tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            {typeFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFeedFilter(f.key)}
                className={cn(
                  "relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-300 ease-out",
                  feedFilter === f.key
                    ? "text-gray-900 dark:text-gray-100"
                    : "text-gray-500 transition-colors duration-200 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                )}
              >
                {feedFilter === f.key && (
                  <motion.div
                    layoutId="feedFilterPill"
                    className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-gray-700"
                    transition={{
                      type: "spring",
                      bounce: 0.15,
                      duration: 0.4,
                    }}
                    style={{ zIndex: 0 }}
                  />
                )}
                <span className="relative z-10">{f.label}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <select
              value={feedCategory ?? ""}
              onChange={(e) =>
                setFeedCategory(e.target.value || null)
              }
              className={selectClass}
            >
              <option value="">All categories</option>
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="relative">
            <select
              value={feedLocation ?? ""}
              onChange={(e) => setFeedLocation(e.target.value || null)}
              className={selectClass}
            >
              <option value="">All locations</option>
              {BUILDINGS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          </div>
          <div className="relative">
            <select
              value={feedSort}
              onChange={(e) =>
                setFeedSort(e.target.value as "newest" | "oldest")
              }
              className={selectClass}
            >
              {sortOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
        <div className="hidden md:flex md:gap-2">
          <Link href="/post/lost" className="transition-transform duration-200 hover:scale-[1.02]">
            <Button size="sm" variant="outline">
              Report Lost
            </Button>
          </Link>
          <Link href="/post/found" className="transition-transform duration-200 hover:scale-[1.02]">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Post Found
            </Button>
          </Link>
        </div>
      </div>

      <ItemGrid items={items} loading={isLoading} />

      {/* Infinite scroll sentinel */}
      <div ref={observerRef} className="h-10" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
        </div>
      )}
    </div>
  );
}
