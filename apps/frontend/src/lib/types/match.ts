import { z } from "zod";
import { ItemSchema } from "./item";

export const MatchSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  matched_item_id: z.string().uuid(),
  similarity_score: z.number().min(0).max(1),
  matched_item: ItemSchema,
  created_at: z.string().datetime(),
});

export type Match = z.infer<typeof MatchSchema>;

export const MatchesResponseSchema = z.object({
  matches: z.array(MatchSchema),
});

export type MatchesResponse = z.infer<typeof MatchesResponseSchema>;
