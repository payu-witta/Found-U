"use client";

import { MatchCard } from "./match-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Radar } from "lucide-react";
import type { Match } from "@/lib/types";

interface MatchListProps {
  matches: Match[];
  loading?: boolean;
}

export function MatchList({ matches, loading }: MatchListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex overflow-hidden rounded-xl border border-gray-200">
            <Skeleton className="h-24 w-24 rounded-none" />
            <div className="flex-1 space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={<Radar className="h-12 w-12" />}
        title="No matches yet"
        description="Our AI is constantly scanning for potential matches. Check back later!"
      />
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((match, i) => (
        <MatchCard key={match.id} match={match} index={i} />
      ))}
    </div>
  );
}
