export * from "./user";
export * from "./item";
export * from "./match";
export * from "./claim";

export interface Notification {
  id: string;
  user_id: string;
  type: "match_found" | "claim_update" | "item_resolved" | "ucard_found";
  subtype?: "claim_submitted" | "claim_approved";
  title: string;
  message: string;
  item_id?: string;
  lost_item_id?: string;
  claim_id?: string;
  recovery_id?: string;
  image_url?: string;
  read: boolean;
  created_at: string;
}
