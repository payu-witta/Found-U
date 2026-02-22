"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Bell, Radar, Shield, CheckCircle, TestTube, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { apiClient } from "@/lib/api/client";
import {
  sendTestNotification,
  markNotificationRead,
  deleteNotification,
  deleteAllNotifications,
} from "@/lib/api/notifications";
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
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const refreshNotifications = async () => {
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    await queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
  };

  const handleDeleteOne = async (notificationId: string) => {
    setDeletingId(notificationId);
    try {
      await deleteNotification(notificationId);
      await refreshNotifications();
      toast.success("Notification deleted.");
    } catch {
      toast.error("Failed to delete notification.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const result = await deleteAllNotifications();
      await refreshNotifications();
      toast.success(
        result.deletedCount > 0
          ? `Deleted ${result.deletedCount} notification${result.deletedCount === 1 ? "" : "s"}.`
          : "No notifications to delete."
      );
    } catch {
      toast.error("Failed to delete all notifications.");
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-50">
          <Bell className="h-5 w-5" />
          Notifications
        </h1>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            disabled={deletingAll || notifications.length === 0}
            className="text-xs"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            {deletingAll ? "Deleting…" : "Delete all"}
          </Button>
        </div>
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
                <Card
                  hoverable
                  className={cn(
                    "flex items-start gap-3 p-4",
                    !notif.read && "border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-950/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(notif)}
                    className="flex flex-1 items-start gap-3 text-left"
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
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                    onClick={() => handleDeleteOne(notif.id)}
                    disabled={deletingId === notif.id || deletingAll}
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
