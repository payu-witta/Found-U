import { apiClient } from "./client";
import type { Item, FeedResponse, PostLostItemPayload, PostFoundItemPayload } from "@/lib/types";

export async function getFeed(cursor?: string, filter?: string): Promise<FeedResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  if (filter && filter !== "all") params.set("type", filter);
  const query = params.toString();
  return apiClient<FeedResponse>(`/items/feed${query ? `?${query}` : ""}`);
}

export async function getItem(id: string): Promise<Item> {
  return apiClient<Item>(`/items/${id}`);
}

export async function searchItems(query: string): Promise<{ items: Item[] }> {
  return apiClient<{ items: Item[] }>(
    `/items/search?q=${encodeURIComponent(query)}`
  );
}

export async function postLostItem(payload: PostLostItemPayload): Promise<Item> {
  const formData = new FormData();
  formData.append("image", payload.image);
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("category", payload.category);
  if (payload.spire_id) formData.append("spire_id", payload.spire_id);
  formData.append("location", payload.location);
  formData.append("date_occurred", payload.date_occurred);
  return apiClient<Item>("/items/lost", {
    method: "POST",
    body: formData,
  });
}

export async function postFoundItem(payload: PostFoundItemPayload): Promise<Item> {
  const formData = new FormData();
  formData.append("image", payload.image);
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("category", payload.category);
  if (payload.spire_id) formData.append("spire_id", payload.spire_id);
  formData.append("location", payload.location);
  formData.append("date_occurred", payload.date_occurred);
  formData.append("found_mode", payload.found_mode);
  if (payload.contact_email) formData.append("contact_email", payload.contact_email);
  return apiClient<Item>("/items/found", {
    method: "POST",
    body: formData,
  });
}

export async function getUserItems(): Promise<{ items: Item[] }> {
  return apiClient<{ items: Item[] }>("/items/me");
}
