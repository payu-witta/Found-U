import { apiClient } from "./client";
import type { VisionAnalysis, Item } from "@/lib/types";

export async function analyzeImage(image: File): Promise<VisionAnalysis> {
  const formData = new FormData();
  formData.append("image", image);
  return apiClient<VisionAnalysis>("/ai/vision-analysis", {
    method: "POST",
    body: formData,
  });
}

export async function reverseImageSearch(image: File): Promise<{ items: Item[] }> {
  const formData = new FormData();
  formData.append("image", image);
  return apiClient<{ items: Item[] }>("/ai/reverse-image-search", {
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
