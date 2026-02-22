import { apiClient } from "./client";
import type { Item, FeedResponse, PostFoundItemPayload } from "@/lib/types";

export interface FeedParams {
  cursor?: string;
  type?: "found"; // Lost feature removed
  category?: string | null;
  location?: string | null;
  sort?: "newest" | "oldest";
}

export async function getFeed(params: FeedParams): Promise<FeedResponse> {
  const search = new URLSearchParams();
  if (params.cursor) search.set("cursor", params.cursor);
  if (params.type) search.set("type", params.type);
  if (params.category) search.set("category", params.category);
  if (params.location) search.set("location", params.location);
  if (params.sort && params.sort !== "newest") search.set("sort", params.sort);
  const query = search.toString();
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

export async function postFoundItem(payload: PostFoundItemPayload): Promise<Item> {
  const formData = new FormData();
  formData.append("image", payload.image);
  formData.append("title", payload.title);
  formData.append("description", payload.description);
  formData.append("category", payload.category);
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
