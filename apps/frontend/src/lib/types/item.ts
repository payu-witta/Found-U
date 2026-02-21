import { z } from "zod";

export const ItemCategory = z.enum([
  "electronics",
  "clothing",
  "accessories",
  "keys",
  "wallet",
  "bag",
  "ucard",
  "water_bottle",
  "textbook",
  "other",
]);

export type ItemCategory = z.infer<typeof ItemCategory>;

export const ItemStatus = z.enum(["active", "matched", "claimed", "resolved"]);
export type ItemStatus = z.infer<typeof ItemStatus>;

export const ItemType = z.enum(["lost", "found"]);
export type ItemType = z.infer<typeof ItemType>;

export const FoundMode = z.enum(["left_at_location", "keeping"]);
export type FoundMode = z.infer<typeof FoundMode>;

export const ItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: ItemType,
  title: z.string(),
  description: z.string(),
  category: ItemCategory,
  location: z.string(),
  date_occurred: z.string(),
  image_url: z.string().url(),
  ai_metadata: z
    .object({
      detected_objects: z.array(z.string()).optional(),
      color: z.string().optional(),
      brand: z.string().optional(),
      condition: z.string().optional(),
    })
    .optional(),
  found_mode: FoundMode.optional(),
  contact_email: z.string().email().optional(),
  status: ItemStatus,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  user_display_name: z.string().optional(),
});

export type Item = z.infer<typeof ItemSchema>;

export const FeedResponseSchema = z.object({
  items: z.array(ItemSchema),
  next_cursor: z.string().nullable(),
  has_more: z.boolean(),
});

export type FeedResponse = z.infer<typeof FeedResponseSchema>;

export const VisionAnalysisSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: ItemCategory,
  detected_objects: z.array(z.string()),
  color: z.string().optional(),
  brand: z.string().optional(),
  condition: z.string().optional(),
});

export type VisionAnalysis = z.infer<typeof VisionAnalysisSchema>;

export interface PostLostItemPayload {
  image: File;
  title: string;
  description: string;
  category: ItemCategory;
  location: string;
  date_occurred: string;
}

export interface PostFoundItemPayload {
  image: File;
  title: string;
  description: string;
  category: ItemCategory;
  location: string;
  date_occurred: string;
  found_mode: FoundMode;
  contact_email?: string;
}
