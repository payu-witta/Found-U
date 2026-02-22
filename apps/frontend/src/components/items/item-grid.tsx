"use client";

import { ItemCard } from "./item-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PackageOpen } from "lucide-react";
import type { Item } from "@/lib/types";

interface ItemGridProps {
  items: Item[];
  loading?: boolean;
}

export function ItemGrid({ items, loading }: ItemGridProps) {
  if (loading) {
    return (
      <div className="grid justify-center gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,220px))]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[340px] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
          >
            <Skeleton className="h-[220px] rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen className="h-12 w-12" />}
        title="No items found"
        description="Items posted by the UMass community will appear here."
      />
    );
  }

  return (
    <div className="grid justify-center gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,220px))]">
      {items.map((item, i) => (
        <ItemCard key={item.id} item={item} index={i} />
      ))}
    </div>
  );
}
