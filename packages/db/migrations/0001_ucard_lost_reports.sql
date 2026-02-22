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
ALTER TABLE "ucard_lost_reports" ADD CONSTRAINT "ucard_lost_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ucard_lost_reports_user_idx" ON "ucard_lost_reports" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ucard_lost_reports_status_idx" ON "ucard_lost_reports" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ucard_lost_reports_spire_hash_idx" ON "ucard_lost_reports" USING btree ("spire_id_hash");
