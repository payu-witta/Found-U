import { apiClient } from "./client";

export interface UnreadCountResponse {
  unreadCount: number;
}

export function getUnreadNotificationCount(): Promise<UnreadCountResponse> {
  return apiClient<UnreadCountResponse>("/notifications/unread-count");
}

/** Mark a notification as read. Keeps it in the list with read styling. */
export function markNotificationAsRead(id: string): Promise<{ id: string; read: boolean }> {
  return apiClient(`/notifications/${id}/read`, { method: "PATCH" });
}

/** Remove all read notifications. */
export function clearReadNotifications(): Promise<{ deleted: number }> {
  return apiClient("/notifications/read", { method: "DELETE" });
}

/** Dev only: create a test notification for the current user. */
export function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  return apiClient("/notifications/test", { method: "POST" });
}
