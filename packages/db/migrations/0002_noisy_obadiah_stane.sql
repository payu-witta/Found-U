CREATE TABLE IF NOT EXISTS "claimed_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"original_item_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"location" varchar(255),
	"date_occurred" date,
	"image_url" text,
	"image_key" varchar(500),
	"thumbnail_url" text,
	"found_mode" "found_mode",
	"contact_email" varchar(255),
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"ai_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claimed_items_claim_id_unique" UNIQUE("claim_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ucard_lost_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"spire_id_hash" text NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claims" DROP CONSTRAINT "claims_item_id_items_id_fk";
--> statement-breakpoint
ALTER TABLE "claims" ALTER COLUMN "item_id" DROP NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claimed_items" ADD CONSTRAINT "claimed_items_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ucard_lost_reports" ADD CONSTRAINT "ucard_lost_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claimed_items_claim_idx" ON "claimed_items" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claimed_items_original_item_idx" ON "claimed_items" USING btree ("original_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ucard_lost_reports_user_idx" ON "ucard_lost_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ucard_lost_reports_status_idx" ON "ucard_lost_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ucard_lost_reports_spire_hash_idx" ON "ucard_lost_reports" USING btree ("spire_id_hash");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claims" ADD CONSTRAINT "claims_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
