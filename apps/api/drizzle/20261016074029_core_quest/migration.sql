CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"from_type" text NOT NULL,
	"from_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"to_type" text NOT NULL,
	"to_id" uuid NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "entity_links_types_valid" CHECK ("from_type" in ('TASK','PROJECT','GOAL','VOYAGE') and "to_type" in ('TASK','PROJECT','GOAL','VOYAGE')),
	CONSTRAINT "entity_links_relation_valid" CHECK ("relation_type" in ('BELONGS_TO','RELATED_TO')),
	CONSTRAINT "entity_links_not_self" CHECK ("from_type" <> "to_type" or "from_id" <> "to_id"),
	CONSTRAINT "entity_links_metadata_bound" CHECK ("metadata" is null or octet_length("metadata"::text)<=4096),
	CONSTRAINT "entity_links_version_valid" CHECK ("version">0)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"horizon" text,
	"target_date" timestamp with time zone,
	CONSTRAINT "goals_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "goals_status_valid" CHECK ("status" in ('ACTIVE','COMPLETED','DROPPED')),
	CONSTRAINT "goals_version_valid" CHECK ("version">0),
	CONSTRAINT "goals_title_valid" CHECK (length(btrim("title")) between 1 and 255)
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"voyage_id" uuid,
	CONSTRAINT "projects_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "projects_status_valid" CHECK ("status" in ('ACTIVE','COMPLETED','ARCHIVED')),
	CONSTRAINT "projects_version_valid" CHECK ("version">0),
	CONSTRAINT "projects_title_valid" CHECK (length(btrim("title")) between 1 and 255),
	CONSTRAINT "projects_range_valid" CHECK ("end_at" is null or "start_at" is null or "end_at" >= "start_at")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'INBOX' NOT NULL,
	"importance" text DEFAULT 'NORMAL' NOT NULL,
	"planned_start" timestamp with time zone,
	"planned_end" timestamp with time zone,
	"due_at" timestamp with time zone,
	"estimated_minutes" integer,
	"actual_minutes" integer,
	"project_id" uuid,
	"source_type" text,
	"source_id" uuid,
	"completed_at" timestamp with time zone,
	CONSTRAINT "tasks_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "tasks_title_valid" CHECK (length(btrim("title")) between 1 and 255),
	CONSTRAINT "tasks_version_valid" CHECK ("version">0),
	CONSTRAINT "tasks_status_valid" CHECK ("status" in ('INBOX','PLANNED','ACTIVE','COMPLETED','DELAYED','DROPPED')),
	CONSTRAINT "tasks_importance_valid" CHECK ("importance" in ('LOW','NORMAL','HIGH')),
	CONSTRAINT "tasks_plan_range_valid" CHECK ("planned_end" is null or ("planned_start" is not null and "planned_end" >= "planned_start")),
	CONSTRAINT "tasks_estimate_valid" CHECK ("estimated_minutes" is null or "estimated_minutes" between 1 and 10080),
	CONSTRAINT "tasks_actual_valid" CHECK ("actual_minutes" is null or "actual_minutes" between 0 and 100000),
	CONSTRAINT "tasks_completion_valid" CHECK (("status" = 'COMPLETED') = ("completed_at" is not null)),
	CONSTRAINT "tasks_source_valid" CHECK (("source_type" is null and "source_id" is null) or ("source_type" is not null and "source_type" in ('PROJECT','GOAL','VOYAGE') and "source_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "voyages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"parent_voyage_id" uuid,
	"title" text NOT NULL,
	"voyage_type" text DEFAULT 'UNIVERSITY' NOT NULL,
	"primary_context" text DEFAULT 'UNIVERSITY' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"summary" text,
	"visual_seed" text,
	CONSTRAINT "voyages_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "voyages_parent_not_self" CHECK ("parent_voyage_id" is null or "parent_voyage_id" <> "id"),
	CONSTRAINT "voyages_status_valid" CHECK ("status" in ('ACTIVE','COMPLETED','ARCHIVED')),
	CONSTRAINT "voyages_version_valid" CHECK ("version">0),
	CONSTRAINT "voyages_title_valid" CHECK (length(btrim("title")) between 1 and 255),
	CONSTRAINT "voyages_type_valid" CHECK ("voyage_type" = 'UNIVERSITY'),
	CONSTRAINT "voyages_range_valid" CHECK ("end_at" is null or "end_at" >= "start_at")
);
--> statement-breakpoint
CREATE INDEX "audit_logs_owner_entity_idx" ON "audit_logs" ("owner_id","entity_type","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_links_semantic_unique" ON "entity_links" ("owner_id","from_type","from_id","relation_type","to_type","to_id") WHERE "deleted_at" is null;--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "outbox_events" ("available_at") WHERE "processed_at" is null;--> statement-breakpoint
CREATE INDEX "outbox_owner_idx" ON "outbox_events" ("owner_id","created_at");--> statement-breakpoint
CREATE INDEX "tasks_owner_status_idx" ON "tasks" ("owner_id","status","due_at","planned_start") WHERE "deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "voyages_active_university_unique" ON "voyages" ("owner_id") WHERE "deleted_at" is null and "status" = 'ACTIVE' and "voyage_type" = 'UNIVERSITY';--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "entity_links" ADD CONSTRAINT "entity_links_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_voyage_id_voyages_owner_id_id_fkey" FOREIGN KEY ("owner_id","voyage_id") REFERENCES "voyages"("owner_id","id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_id_project_id_projects_owner_id_id_fkey" FOREIGN KEY ("owner_id","project_id") REFERENCES "projects"("owner_id","id");--> statement-breakpoint
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_owner_id_parent_voyage_id_voyages_owner_id_id_fkey" FOREIGN KEY ("owner_id","parent_voyage_id") REFERENCES "voyages"("owner_id","id");