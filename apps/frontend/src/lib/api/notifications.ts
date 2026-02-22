import { apiClient } from "./client";

export interface UnreadCountResponse {
  unreadCount: number;
}

export function getUnreadNotificationCount(): Promise<UnreadCountResponse> {
  return apiClient<UnreadCountResponse>("/notifications/unread-count");
}

/** Dev only: create a test notification for the current user. */
export function sendTestNotification(): Promise<{ success: boolean; message: string }> {
  return apiClient("/notifications/test", { method: "POST" });
}
