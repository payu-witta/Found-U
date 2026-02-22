"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useFeed } from "@/lib/hooks/use-items";
import { ItemGrid } from "@/components/items/item-grid";
import { Button } from "@/components/ui/button";

export default function FeedPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFeed();

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
      <div className="mb-4 flex items-center justify-end">
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
