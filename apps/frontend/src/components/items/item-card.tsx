"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { timeAgo, truncate } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import type { Item } from "@/lib/types";

interface ItemCardProps {
  item: Item;
  index?: number;
}

export function ItemCard({ item, index = 0 }: ItemCardProps) {
  const category = CATEGORIES[item.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/item/${item.id}`}>
        <Card hoverable className="overflow-hidden">
          <div className="relative aspect-square">
            <Image
              src={item.image_url}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            <div className="absolute left-2 top-2">
              <Badge variant={item.type}>
                {item.type === "lost" ? "Lost" : "Found"}
              </Badge>
            </div>
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-gray-900 text-sm">
              {truncate(item.title, 40)}
            </h3>
            {category && (
              <span className="text-xs text-gray-500">
                {category.icon} {category.label}
              </span>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {truncate(item.location, 20)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(item.created_at)}
              </span>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
