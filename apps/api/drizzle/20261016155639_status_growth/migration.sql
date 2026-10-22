CREATE TABLE "cycle_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"start_date" date NOT NULL,
	"end_date" date,
	"symptoms_json" jsonb,
	"note" text,
	"privacy_level" text DEFAULT 'HIGH_PRIVATE' NOT NULL,
	"ai_policy" text DEFAULT 'NEVER' NOT NULL,
	CONSTRAINT "cycle_records_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "cycle_records_version_valid" CHECK ("version">0),
	CONSTRAINT "cycle_records_privacy_valid" CHECK ("privacy_level" in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')),
	CONSTRAINT "cycle_records_ai_valid" CHECK ("ai_policy" in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')),
	CONSTRAINT "cycle_range_valid" CHECK ("end_date" is null or "end_date">="start_date"),
	CONSTRAINT "cycle_privacy_minimum" CHECK ("privacy_level" in ('HIGH_PRIVATE','VAULT') and "ai_policy"='NEVER')
);
--> statement-breakpoint
CREATE TABLE "exercise_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"activity_type" text NOT NULL,
	"duration_minutes" integer,
	"note" text,
	"source_type" text,
	"source_id" uuid,
	"privacy_level" text DEFAULT 'PRIVATE' NOT NULL,
	"ai_policy" text DEFAULT 'EXPLICIT_ONLY' NOT NULL,
	CONSTRAINT "exercise_records_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "exercise_records_version_valid" CHECK ("version">0),
	CONSTRAINT "exercise_records_privacy_valid" CHECK ("privacy_level" in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')),
	CONSTRAINT "exercise_records_ai_valid" CHECK ("ai_policy" in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')),
	CONSTRAINT "exercise_range_valid" CHECK ("ended_at" is null or "ended_at">="started_at"),
	CONSTRAINT "exercise_duration_valid" CHECK ("duration_minutes" is null or "duration_minutes" between 1 and 4320),
	CONSTRAINT "exercise_records_source_pair" CHECK (("source_type" is null)=("source_id" is null))
);
--> statement-breakpoint
CREATE TABLE "learning_mistakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"source_type" text,
	"source_id" uuid,
	"mistake_description" text NOT NULL,
	"correct_understanding" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"privacy_level" text DEFAULT 'PRIVATE' NOT NULL,
	"ai_policy" text DEFAULT 'EXPLICIT_ONLY' NOT NULL,
	CONSTRAINT "learning_mistakes_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "learning_mistakes_version_valid" CHECK ("version">0),
	CONSTRAINT "learning_mistakes_privacy_valid" CHECK ("privacy_level" in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')),
	CONSTRAINT "learning_mistakes_ai_valid" CHECK ("ai_policy" in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')),
	CONSTRAINT "mistake_status_valid" CHECK ("status" in ('OPEN','REVIEWED','RESOLVED')),
	CONSTRAINT "learning_mistakes_source_pair" CHECK (("source_type" is null)=("source_id" is null))
);
--> statement-breakpoint
CREATE TABLE "learning_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"title" text NOT NULL,
	"source_kind" text,
	"source_ref" text,
	"reflection" text,
	"questions" text,
	"applications" text,
	"project_ideas" text,
	"created_by" text NOT NULL,
	"privacy_level" text DEFAULT 'PRIVATE' NOT NULL,
	"ai_policy" text DEFAULT 'EXPLICIT_ONLY' NOT NULL,
	CONSTRAINT "learning_records_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "learning_records_version_valid" CHECK ("version">0),
	CONSTRAINT "learning_records_privacy_valid" CHECK ("privacy_level" in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')),
	CONSTRAINT "learning_records_ai_valid" CHECK ("ai_policy" in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')),
	CONSTRAINT "learning_user_author" CHECK ("created_by"="owner_id"),
	CONSTRAINT "learning_kind_valid" CHECK ("source_kind" is null or "source_kind" in ('TEXT','URL','IMAGE','FILE','COURSE','ASSIGNMENT','OTHER'))
);
--> statement-breakpoint
CREATE TABLE "skill_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"skill_id" uuid NOT NULL,
	"evidence_type" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"note" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"privacy_level" text DEFAULT 'PRIVATE' NOT NULL,
	"ai_policy" text DEFAULT 'EXPLICIT_ONLY' NOT NULL,
	CONSTRAINT "skill_evidence_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "skill_evidence_version_valid" CHECK ("version">0),
	CONSTRAINT "skill_evidence_privacy_valid" CHECK ("privacy_level" in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')),
	CONSTRAINT "skill_evidence_ai_valid" CHECK ("ai_policy" in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')),
	CONSTRAINT "evidence_type_valid" CHECK ("evidence_type" in ('CONTACT','UNDERSTANDING','PRACTICE','INDEPENDENT','TRANSFER','OUTPUT')),
	CONSTRAINT "skill_evidence_source_pair" CHECK (("source_type" is null)=("source_id" is null))
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"state" text DEFAULT 'EXPOSED' NOT NULL,
	"description" text,
	"privacy_level" text DEFAULT 'NORMAL' NOT NULL,
	"ai_policy" text DEFAULT 'EXPLICIT_ONLY' NOT NULL,
	CONSTRAINT "skills_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "skills_version_valid" CHECK ("version">0),
	CONSTRAINT "skills_privacy_valid" CHECK ("privacy_level" in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')),
	CONSTRAINT "skills_ai_valid" CHECK ("ai_policy" in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')),
	CONSTRAINT "skill_state_valid" CHECK ("state" in ('EXPOSED','UNDERSTANDING','PRACTICING','INDEPENDENT','TRANSFER','PROVEN'))
);
--> statement-breakpoint
CREATE TABLE "sleep_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"sleep_start" timestamp with time zone NOT NULL,
	"wake_at" timestamp with time zone NOT NULL,
	"quality" integer,
	"note" text,
	"source_type" text,
	"source_id" uuid,
	"privacy_level" text DEFAULT 'PRIVATE' NOT NULL,
	"ai_policy" text DEFAULT 'EXPLICIT_ONLY' NOT NULL,
	CONSTRAINT "sleep_records_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "sleep_records_version_valid" CHECK ("version">0),
	CONSTRAINT "sleep_records_privacy_valid" CHECK ("privacy_level" in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')),
	CONSTRAINT "sleep_records_ai_valid" CHECK ("ai_policy" in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')),
	CONSTRAINT "sleep_range_valid" CHECK ("wake_at">"sleep_start" and "wake_at"-"sleep_start"<=interval '72 hours'),
	CONSTRAINT "sleep_quality_valid" CHECK ("quality" is null or "quality" between 1 and 5),
	CONSTRAINT "sleep_records_source_pair" CHECK (("source_type" is null)=("source_id" is null))
);
--> statement-breakpoint
CREATE TABLE "status_moments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mood" text,
	"custom_mood" text,
	"energy" integer,
	"stress" integer,
	"focus" integer,
	"body_state_json" jsonb,
	"note" text,
	"source_type" text,
	"source_id" uuid,
	"privacy_level" text DEFAULT 'PRIVATE' NOT NULL,
	"ai_policy" text DEFAULT 'EXPLICIT_ONLY' NOT NULL,
	CONSTRAINT "status_moments_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "status_moments_version_valid" CHECK ("version">0),
	CONSTRAINT "status_moments_privacy_valid" CHECK ("privacy_level" in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')),
	CONSTRAINT "status_moments_ai_valid" CHECK ("ai_policy" in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')),
	CONSTRAINT "status_mood_valid" CHECK ("mood" is null or "mood" in ('HAPPY','CALM','TIRED','ANXIOUS','SAD','OTHER')),
	CONSTRAINT "status_partial_nonempty" CHECK ("mood" is not null or "energy" is not null or "stress" is not null or "focus" is not null or "body_state_json" is not null or length(btrim(coalesce("note",'')))>0),
	CONSTRAINT "status_energy_valid" CHECK ("energy" is null or "energy" between 1 and 5),
	CONSTRAINT "status_stress_valid" CHECK ("stress" is null or "stress" between 1 and 5),
	CONSTRAINT "status_focus_valid" CHECK ("focus" is null or "focus" between 1 and 5),
	CONSTRAINT "status_moments_source_pair" CHECK (("source_type" is null)=("source_id" is null))
);
--> statement-breakpoint
CREATE TABLE "water_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amount_ml" integer NOT NULL,
	"privacy_level" text DEFAULT 'PRIVATE' NOT NULL,
	"ai_policy" text DEFAULT 'EXPLICIT_ONLY' NOT NULL,
	CONSTRAINT "water_records_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "water_records_version_valid" CHECK ("version">0),
	CONSTRAINT "water_records_privacy_valid" CHECK ("privacy_level" in ('NORMAL','PRIVATE','HIGH_PRIVATE','VAULT')),
	CONSTRAINT "water_records_ai_valid" CHECK ("ai_policy" in ('ALWAYS','WHEN_RELEVANT','EXPLICIT_ONLY','NEVER')),
	CONSTRAINT "water_amount_valid" CHECK ("amount_ml" between 1 and 10000)
);
--> statement-breakpoint
CREATE INDEX "cycle_records_owner_idx" ON "cycle_records" ("owner_id");--> statement-breakpoint
CREATE INDEX "exercise_records_owner_idx" ON "exercise_records" ("owner_id");--> statement-breakpoint
CREATE INDEX "learning_mistakes_owner_idx" ON "learning_mistakes" ("owner_id");--> statement-breakpoint
CREATE INDEX "learning_records_owner_idx" ON "learning_records" ("owner_id");--> statement-breakpoint
CREATE INDEX "skill_evidence_owner_idx" ON "skill_evidence" ("owner_id");--> statement-breakpoint
CREATE INDEX "skills_owner_idx" ON "skills" ("owner_id");--> statement-breakpoint
CREATE INDEX "sleep_records_owner_idx" ON "sleep_records" ("owner_id");--> statement-breakpoint
CREATE INDEX "status_moments_owner_idx" ON "status_moments" ("owner_id");--> statement-breakpoint
CREATE INDEX "water_records_owner_idx" ON "water_records" ("owner_id");--> statement-breakpoint
ALTER TABLE "cycle_records" ADD CONSTRAINT "cycle_records_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exercise_records" ADD CONSTRAINT "exercise_records_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_mistakes" ADD CONSTRAINT "learning_mistakes_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "learning_records" ADD CONSTRAINT "learning_records_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "skill_evidence" ADD CONSTRAINT "skill_evidence_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "skill_evidence" ADD CONSTRAINT "skill_evidence_owner_id_skill_id_skills_owner_id_id_fkey" FOREIGN KEY ("owner_id","skill_id") REFERENCES "skills"("owner_id","id");--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sleep_records" ADD CONSTRAINT "sleep_records_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "status_moments" ADD CONSTRAINT "status_moments_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "water_records" ADD CONSTRAINT "water_records_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "entity_links" DROP CONSTRAINT "entity_links_types_valid", ADD CONSTRAINT "entity_links_types_valid" CHECK ("from_type" in ('TASK','PROJECT','GOAL','VOYAGE','COURSE','ASSIGNMENT','FILE','PLACE','LEARNING_RECORD','LEARNING_MISTAKE','SKILL') and "to_type" in ('TASK','PROJECT','GOAL','VOYAGE','COURSE','ASSIGNMENT','FILE','PLACE','LEARNING_RECORD','LEARNING_MISTAKE','SKILL'));--> statement-breakpoint
ALTER TABLE "entity_links" DROP CONSTRAINT "entity_links_relation_valid", ADD CONSTRAINT "entity_links_relation_valid" CHECK ("relation_type" in ('BELONGS_TO','RELATED_TO','APPLIED_TO') and ("relation_type"<>'APPLIED_TO' or ("from_type"='LEARNING_RECORD' and "to_type"='PROJECT')));