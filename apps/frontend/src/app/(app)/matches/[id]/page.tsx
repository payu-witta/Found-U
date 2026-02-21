"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Radar } from "lucide-react";
import { useMatches } from "@/lib/hooks/use-matches";
import { MatchList } from "@/components/matches/match-list";

export default function MatchesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useMatches(id);

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-4 flex items-center gap-2">
        <Radar className="h-5 w-5 text-brand-600" />
        <h1 className="text-xl font-bold text-gray-900">AI Matches</h1>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        Top matches ranked by AI similarity score
      </p>

      <MatchList matches={data?.matches ?? []} loading={isLoading} />
    </div>
  );
}
