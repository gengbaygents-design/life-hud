CREATE TABLE "action_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"action_group_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"action_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"validation_result" text,
	"execution_result" jsonb,
	"reversible" boolean DEFAULT false NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "action_execution_group_position_unique" UNIQUE("action_group_id","position"),
	CONSTRAINT "action_execution_position_valid" CHECK ("position" between 0 and 3),
	CONSTRAINT "action_execution_status_valid" CHECK ("status" in ('PENDING','SUCCESS','FAILED','UNDONE','SKIPPED'))
);
--> statement-breakpoint
CREATE TABLE "action_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"source_conversation_id" uuid,
	"source_message_id" uuid,
	"request_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"status" text DEFAULT 'PROCESSING' NOT NULL,
	"mode" text,
	"risk_level" text DEFAULT 'R0' NOT NULL,
	"reply" text DEFAULT '' NOT NULL,
	"result" jsonb,
	"trace" jsonb,
	"undo_token" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "action_group_owner_request_unique" UNIQUE("owner_id","request_id"),
	CONSTRAINT "action_group_status_valid" CHECK ("status" in ('PROCESSING','SUCCESS','PARTIAL','FAILED','CLARIFICATION'))
);
--> statement-breakpoint
ALTER TABLE "ai_chats" ADD COLUMN "kind" text DEFAULT 'CHAT' NOT NULL;--> statement-breakpoint
CREATE INDEX "action_group_conversation_idx" ON "action_groups" ("source_conversation_id","created_at");--> statement-breakpoint
ALTER TABLE "action_executions" ADD CONSTRAINT "action_executions_action_group_id_action_groups_id_fkey" FOREIGN KEY ("action_group_id") REFERENCES "action_groups"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "action_groups" ADD CONSTRAINT "action_groups_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "action_groups" ADD CONSTRAINT "action_groups_source_conversation_id_ai_chats_id_fkey" FOREIGN KEY ("source_conversation_id") REFERENCES "ai_chats"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "action_groups" ADD CONSTRAINT "action_groups_source_message_id_ai_messages_id_fkey" FOREIGN KEY ("source_message_id") REFERENCES "ai_messages"("id") ON DELETE SET NULL;