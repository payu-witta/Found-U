import { apiClient } from "./client";
import type { VisionAnalysis, Item } from "@/lib/types";

export async function analyzeImage(image: File): Promise<VisionAnalysis> {
  const formData = new FormData();
  formData.append("image", image);

  // Backend returns camelCase fields; map to the shape the forms expect
  const raw = await apiClient<Record<string, unknown>>("/ai/vision-analysis", {
    method: "POST",
    body: formData,
  });

  return {
    title: (raw.rawDescription as string)?.slice(0, 80) || "Unknown item",
    description: (raw.rawDescription as string) || "",
    category: ((raw.category as string)?.toLowerCase() as VisionAnalysis["category"]) || "other",
    detected_objects: (raw.detectedObjects as string[]) || [],
    color: Array.isArray(raw.colors) ? (raw.colors as string[]).join(", ") : undefined,
    brand: (raw.brand as string) || undefined,
    condition: (raw.condition as string) || undefined,
  };
}

export async function reverseImageSearch(image: File): Promise<{ items: Item[] }> {
  const formData = new FormData();
  formData.append("image", image);
  return apiClient<{ items: Item[] }>("/items/search/image", {
    method: "POST",
    body: formData,
  });
}

export async function matchUCard(image: File): Promise<{ match: Item | null; confidence: number }> {
  const formData = new FormData();
  formData.append("image", image);
  return apiClient<{ match: Item | null; confidence: number }>("/ai/ucard-match", {
    method: "POST",
    body: formData,
  });
}
