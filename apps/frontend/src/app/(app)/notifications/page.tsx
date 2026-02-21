"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, Radar, Shield, CheckCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { apiClient } from "@/lib/api/client";
import { timeAgo, cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";

const iconMap = {
  match_found: Radar,
  claim_update: Shield,
  item_resolved: CheckCircle,
};

export default function NotificationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      apiClient<{ notifications: Notification[] }>("/notifications"),
  });

  const notifications = data?.notifications ?? [];

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
        <Bell className="h-5 w-5" />
        Notifications
      </h1>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-gray-200 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title="No notifications"
          description="You'll be notified when there are matches or updates on your items."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => {
            const Icon = iconMap[notif.type] || Bell;
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={notif.item_id ? `/item/${notif.item_id}` : "#"}>
                  <Card
                    hoverable
                    className={cn(
                      "flex items-start gap-3 p-4",
                      !notif.read && "border-brand-200 bg-brand-50/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                        !notif.read
                          ? "bg-brand-100 text-brand-700"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {notif.title}
                      </p>
                      <p className="text-sm text-gray-500">{notif.message}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="mt-1 h-2 w-2 rounded-full bg-brand-600" />
                    )}
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
