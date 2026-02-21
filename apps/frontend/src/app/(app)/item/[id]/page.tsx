"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Tag, Sparkles, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useItem } from "@/lib/hooks/use-items";
import { useMatches } from "@/lib/hooks/use-matches";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MatchList } from "@/components/matches/match-list";
import { CATEGORIES } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/utils";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: item, isLoading } = useItem(id);
  const { data: matchesData, isLoading: matchesLoading } = useMatches(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500">Item not found</p>
      </div>
    );
  }

  const category = CATEGORIES[item.category];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-xl">
        <Image
          src={item.image_url}
          alt={item.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute left-3 top-3">
          <Badge variant={item.type} className="text-sm">
            {item.type === "lost" ? "Lost" : "Found"}
          </Badge>
        </div>
        <div className="absolute right-3 top-3">
          <Badge variant={item.status}>{item.status}</Badge>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
        <p className="text-gray-600">{item.description}</p>

        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
          {category && (
            <span className="flex items-center gap-1">
              <Tag className="h-4 w-4" />
              {category.icon} {category.label}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {item.location}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(item.date_occurred)}
          </span>
        </div>

        <p className="text-xs text-gray-400">Posted {timeAgo(item.created_at)}</p>

        {/* AI Metadata */}
        {item.ai_metadata && (
          <Card className="p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Sparkles className="h-4 w-4 text-brand-600" />
              AI Analysis
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {item.ai_metadata.color && (
                <div>
                  <span className="text-gray-400">Color:</span>{" "}
                  <span className="text-gray-700">{item.ai_metadata.color}</span>
                </div>
              )}
              {item.ai_metadata.brand && (
                <div>
                  <span className="text-gray-400">Brand:</span>{" "}
                  <span className="text-gray-700">{item.ai_metadata.brand}</span>
                </div>
              )}
              {item.ai_metadata.condition && (
                <div>
                  <span className="text-gray-400">Condition:</span>{" "}
                  <span className="text-gray-700">{item.ai_metadata.condition}</span>
                </div>
              )}
              {item.ai_metadata.detected_objects &&
                item.ai_metadata.detected_objects.length > 0 && (
                  <div className="col-span-2">
                    <span className="text-gray-400">Detected:</span>{" "}
                    <span className="text-gray-700">
                      {item.ai_metadata.detected_objects.join(", ")}
                    </span>
                  </div>
                )}
            </div>
          </Card>
        )}

        {/* Claim button */}
        {item.status === "active" && (
          <Link href={`/claim/${item.id}`}>
            <Button className="w-full" size="lg">
              <Shield className="mr-2 h-4 w-4" />
              {item.type === "lost" ? "I Found This Item" : "This Is My Item"}
            </Button>
          </Link>
        )}

        {/* Matches */}
        <div className="pt-4">
          <h3 className="mb-3 text-lg font-bold text-gray-900">
            AI Matches
          </h3>
          <MatchList
            matches={matchesData?.matches ?? []}
            loading={matchesLoading}
          />
        </div>
      </div>
    </motion.div>
  );
}
