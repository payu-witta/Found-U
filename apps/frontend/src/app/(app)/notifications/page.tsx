"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, Radar, Shield, CheckCircle, TestTube } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { apiClient } from "@/lib/api/client";
import { sendTestNotification, markNotificationRead } from "@/lib/api/notifications";
import { timeAgo, cn } from "@/lib/utils";
import type { Notification } from "@/lib/types";

const isLocalDev = typeof window !== "undefined" && window.location?.hostname === "localhost";

const iconMap = {
  match_found: Radar,
  claim_update: Shield,
  item_resolved: CheckCircle,
  ucard_found: Shield,
};

function getNotificationHref(notif: Notification): string {
  if (notif.type === "ucard_found") return "/ucard";
  if (notif.item_id) return `/item/${notif.item_id}`;
  return "/feed";
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [testLoading, setTestLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      apiClient<{ notifications: Notification[] }>("/notifications"),
  });

  const notifications = data?.notifications ?? [];

  const handleNotificationClick = async (notif: Notification) => {
    const href = getNotificationHref(notif);
    if (!notif.read) {
      try {
        await markNotificationRead(notif.id);
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      } catch {
        // ignore
      }
    }
    router.push(href);
  };

  const handleSendTest = async () => {
    if (!isLocalDev) return;
    setTestLoading(true);
    try {
      await sendTestNotification();
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      toast.success("Test notification sent! Check the bell icon.");
    } catch {
      toast.error("Failed to send test notification.");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-50">
          <Bell className="h-5 w-5" />
          Notifications
        </h1>
        {isLocalDev && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendTest}
            disabled={testLoading}
            className="text-xs"
          >
            <TestTube className="mr-1 h-3 w-3" />
            {testLoading ? "Sending…" : "Send test notification"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
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
                <button
                  type="button"
                  onClick={() => handleNotificationClick(notif)}
                  className="w-full text-left"
                >
                  <Card
                    hoverable
                    className={cn(
                      "flex items-start gap-3 p-4",
                      !notif.read && "border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-950/40"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                        !notif.read
                          ? "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {notif.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{notif.message}</p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="mt-1 h-2 w-2 rounded-full bg-brand-600" />
                    )}
                  </Card>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
