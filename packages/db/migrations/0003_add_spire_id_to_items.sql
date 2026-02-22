ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "spire_id_hash" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "claimed_items" ADD COLUMN IF NOT EXISTS "spire_id_hash" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN IF EXISTS "spire_id";
--> statement-breakpoint
ALTER TABLE "claimed_items" DROP COLUMN IF EXISTS "spire_id";
