export * from "./user";
export * from "./item";
export * from "./match";
export * from "./claim";

export interface Notification {
  id: string;
  user_id: string;
  type: "match_found" | "claim_update" | "item_resolved" | "ucard_found";
  title: string;
  message: string;
  item_id?: string;
  recovery_id?: string;
  read: boolean;
  created_at: string;
}
