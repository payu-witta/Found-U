import { apiClient } from "./client";

export interface UnreadCountResponse {
  unreadCount: number;
}

export function getUnreadNotificationCount(): Promise<UnreadCountResponse> {
  return apiClient<UnreadCountResponse>("/notifications/unread-count");
}

export function markNotificationRead(notificationId: string): Promise<{ id: string; read: boolean }> {
  return apiClient(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  return apiClient("/notifications/test", { method: "POST" });
}

export function deleteNotification(notificationId: string): Promise<{ id: string; deleted: boolean }> {
  return apiClient(`/notifications/${notificationId}`, {
    method: "DELETE",
  });
}

export function deleteAllNotifications(): Promise<{ deletedCount: number }> {
  return apiClient("/notifications/all", {
    method: "DELETE",
  });
}
