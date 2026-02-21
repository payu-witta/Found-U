"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useFeed } from "@/lib/hooks/use-items";
import { useUIStore } from "@/lib/store/ui-store";
import { ItemGrid } from "@/components/items/item-grid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const filters = [
  { key: "all", label: "All" },
  { key: "lost", label: "Lost" },
  { key: "found", label: "Found" },
] as const;

export default function FeedPage() {
  const feedFilter = useUIStore((s) => s.feedFilter);
  const setFeedFilter = useUIStore((s) => s.setFeedFilter);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeed(feedFilter);

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
      {/* Filter tabs */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFeedFilter(f.key)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                feedFilter === f.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="hidden md:flex md:gap-2">
          <Link href="/post/lost">
            <Button size="sm" variant="outline">
              Report Lost
            </Button>
          </Link>
          <Link href="/post/found">
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
