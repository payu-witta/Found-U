ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "spire_id" varchar(8);
--> statement-breakpoint
ALTER TABLE "claimed_items" ADD COLUMN IF NOT EXISTS "spire_id" varchar(8);
