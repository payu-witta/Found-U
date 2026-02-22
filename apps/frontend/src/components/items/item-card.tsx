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
import { motionEase, motionTiming } from "@/lib/motion";

interface ItemCardProps {
  item: Item;
  index?: number;
}

export function ItemCard({ item, index = 0 }: ItemCardProps) {
  const category = CATEGORIES[item.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.035, 0.2),
        duration: motionTiming.base,
        ease: motionEase.out,
      }}
    >
      <Link href={`/item/${item.id}`}>
        <motion.div layoutId={`item-card-${item.id}`}>
          <Card hoverable className="overflow-hidden">
            <motion.div layoutId={`item-image-${item.id}`} className="relative aspect-square">
            <Image
              src={item.image_url}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            <div className="absolute left-2 top-2">
              <Badge variant="found">Found</Badge>
            </div>
            </motion.div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                {truncate(item.title, 40)}
              </h3>
              {category && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {category.icon} {category.label}
                </span>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
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
        </motion.div>
      </Link>
    </motion.div>
  );
}
