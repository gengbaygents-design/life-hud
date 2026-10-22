CREATE TABLE "archive_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"archive_type" text DEFAULT 'MOMENT' NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"voyage_id" uuid,
	"title" text NOT NULL,
	"summary" text,
	"privacy_level" text DEFAULT 'PRIVATE' NOT NULL,
	CONSTRAINT "archive_owner_id" UNIQUE("owner_id","id"),
	CONSTRAINT "archive_type" CHECK ("archive_type" in ('MOMENT','PERIOD')),
	CONSTRAINT "archive_privacy" CHECK ("privacy_level" in ('PRIVATE','HIGH_PRIVATE','VAULT')),
	CONSTRAINT "archive_period" CHECK ("period_end" is null or ("period_start" is not null and "period_end">="period_start")),
	CONSTRAINT "archive_title" CHECK (length(btrim("title")) between 1 and 200),
	CONSTRAINT "archive_version" CHECK ("version">0)
);
--> statement-breakpoint
CREATE TABLE "archive_entry_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"archive_entry_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"relation_type" text,
	CONSTRAINT "archive_source_unique" UNIQUE("archive_entry_id","source_type","source_id"),
	CONSTRAINT "archive_link_type" CHECK ("source_type" in ('TASK','ASSIGNMENT','EXAM','PROJECT','VOYAGE','COURSE','STATUS_MOMENT','LEARNING_RECORD','CLASS_SESSION','CAPTAIN_LOG'))
);
--> statement-breakpoint
CREATE TABLE "captain_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"body" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voyage_id" uuid,
	"privacy_level" text DEFAULT 'PRIVATE' NOT NULL,
	"ai_access_policy" text DEFAULT 'EXPLICIT_ONLY' NOT NULL,
	CONSTRAINT "captain_owner_id" UNIQUE("owner_id","id"),
	CONSTRAINT "captain_body" CHECK (length(btrim("body")) between 1 and 30000),
	CONSTRAINT "captain_privacy" CHECK ("privacy_level" in ('PRIVATE','HIGH_PRIVATE','VAULT')),
	CONSTRAINT "captain_ai" CHECK ("ai_access_policy" in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')),
	CONSTRAINT "captain_version" CHECK ("version">0)
);
--> statement-breakpoint
CREATE TABLE "notification_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"reminder_rule_id" uuid,
	"title" text NOT NULL,
	"body" text,
	"scheduled_for" timestamp with time zone NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"priority" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" text DEFAULT 'DELIVERED' NOT NULL,
	"silent" boolean DEFAULT false NOT NULL,
	CONSTRAINT "notification_owner_id" UNIQUE("owner_id","id"),
	CONSTRAINT "notification_delivery_once" UNIQUE("owner_id","dedupe_key"),
	CONSTRAINT "notification_status" CHECK ("status" in ('DELIVERED','READ','DISMISSED')),
	CONSTRAINT "notification_priority" CHECK ("priority" in ('P0','P1','P2','P3')),
	CONSTRAINT "notification_version" CHECK ("version">0)
);
--> statement-breakpoint
CREATE TABLE "reminder_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"source_type" text,
	"source_id" uuid,
	"schedule_type" text DEFAULT 'ONCE' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"cron_expression" text,
	"priority" text DEFAULT 'P2' NOT NULL,
	"time_zone" text DEFAULT 'Asia/Shanghai' NOT NULL,
	"quiet_start" text DEFAULT '23:30' NOT NULL,
	"quiet_end" text DEFAULT '07:30' NOT NULL,
	"quiet_hours_policy" text DEFAULT 'DEFER' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"next_trigger_at" timestamp with time zone,
	"logical_key" text NOT NULL,
	CONSTRAINT "reminder_owner_id" UNIQUE("owner_id","id"),
	CONSTRAINT "reminder_logical_key" UNIQUE("owner_id","logical_key"),
	CONSTRAINT "reminder_priority" CHECK ("priority" in ('P0','P1','P2','P3')),
	CONSTRAINT "reminder_status" CHECK ("status" in ('ACTIVE','FIRED','CANCELLED')),
	CONSTRAINT "reminder_once" CHECK ("schedule_type"='ONCE' and "cron_expression" is null),
	CONSTRAINT "reminder_source" CHECK (("source_type" is null and "source_id" is null) or ("source_type" in ('TASK','ASSIGNMENT','EXAM') and "source_id" is not null)),
	CONSTRAINT "reminder_quiet_policy" CHECK ("quiet_hours_policy" in ('DEFER','SILENT')),
	CONSTRAINT "reminder_version" CHECK ("version">0),
	CONSTRAINT "reminder_title" CHECK (length(btrim("title")) between 1 and 200),
	CONSTRAINT "reminder_pending_time" CHECK (("status"='ACTIVE' and "next_trigger_at" is not null) or ("status"<>'ACTIVE' and "next_trigger_at" is null))
);
--> statement-breakpoint
CREATE INDEX "archive_time" ON "archive_entries" ("owner_id","recorded_at");--> statement-breakpoint
CREATE INDEX "captain_time" ON "captain_logs" ("owner_id","recorded_at");--> statement-breakpoint
CREATE INDEX "notification_recent" ON "notification_instances" ("owner_id","generated_at");--> statement-breakpoint
CREATE INDEX "reminder_pending" ON "reminder_rules" ("next_trigger_at") WHERE "status"='ACTIVE' and "deleted_at" is null;--> statement-breakpoint
ALTER TABLE "archive_entries" ADD CONSTRAINT "archive_entries_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "archive_entries" ADD CONSTRAINT "archive_entries_owner_id_voyage_id_voyages_owner_id_id_fkey" FOREIGN KEY ("owner_id","voyage_id") REFERENCES "voyages"("owner_id","id");--> statement-breakpoint
ALTER TABLE "archive_entry_links" ADD CONSTRAINT "archive_entry_links_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "archive_entry_links" ADD CONSTRAINT "archive_entry_links_bpkKBesjtYJj_fkey" FOREIGN KEY ("owner_id","archive_entry_id") REFERENCES "archive_entries"("owner_id","id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "captain_logs" ADD CONSTRAINT "captain_logs_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "captain_logs" ADD CONSTRAINT "captain_logs_owner_id_voyage_id_voyages_owner_id_id_fkey" FOREIGN KEY ("owner_id","voyage_id") REFERENCES "voyages"("owner_id","id");--> statement-breakpoint
ALTER TABLE "notification_instances" ADD CONSTRAINT "notification_instances_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notification_instances" ADD CONSTRAINT "notification_instances_a7UrHqWc1hoP_fkey" FOREIGN KEY ("owner_id","reminder_rule_id") REFERENCES "reminder_rules"("owner_id","id");--> statement-breakpoint
ALTER TABLE "reminder_rules" ADD CONSTRAINT "reminder_rules_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;