"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { truncate } from "@/lib/utils";
import type { Match } from "@/lib/types";

interface MatchCardProps {
  match: Match;
  index?: number;
}

export function MatchCard({ match, index = 0 }: MatchCardProps) {
  const confidencePercent = Math.round(match.similarity_score * 100);
  const item = match.matched_item;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link href={`/item/${item.id}`}>
        <Card hoverable className="flex overflow-hidden">
          <div className="relative h-24 w-24 flex-shrink-0">
            <Image
              src={item.image_url}
              alt={item.title}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-1 flex-col justify-between p-3">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                {truncate(item.title, 30)}
              </h4>
              <p className="text-xs text-gray-500">
                {truncate(item.description, 60)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={item.type}>
                {item.type === "lost" ? "Lost" : "Found"}
              </Badge>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-brand-700">
                  {confidencePercent}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
