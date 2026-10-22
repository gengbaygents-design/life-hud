CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"published_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"work_state" text DEFAULT 'NOT_STARTED' NOT NULL,
	"submission_state" text DEFAULT 'NOT_SUBMITTED' NOT NULL,
	"submitted_at" timestamp with time zone,
	"task_id" uuid CONSTRAINT "assignments_identity_0" UNIQUE,
	CONSTRAINT "assignments_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "assignments_version_valid" CHECK ("version">0),
	CONSTRAINT "assignment_work_valid" CHECK ("work_state" in ('NOT_STARTED','IN_PROGRESS','DONE')),
	CONSTRAINT "assignment_submission_valid" CHECK ("submission_state" in ('NOT_SUBMITTED','SUBMITTED') and ("submission_state"='SUBMITTED')=("submitted_at" is not null)),
	CONSTRAINT "assignment_distinct_task" CHECK ("task_id" is null or "task_id" <> "id")
);
--> statement-breakpoint
CREATE TABLE "class_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"course_id" uuid NOT NULL,
	"specific_date" date NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"time_zone" text DEFAULT 'Asia/Shanghai' NOT NULL,
	"place_id" uuid,
	CONSTRAINT "class_sessions_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "class_sessions_version_valid" CHECK ("version">0),
	CONSTRAINT "class_time_valid" CHECK ("end_time" > "start_time" and "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
CREATE TABLE "course_material_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"course_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"material_type" text,
	"label" text,
	CONSTRAINT "course_material_links_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "course_material_links_identity_0" UNIQUE("owner_id","course_id","file_id"),
	CONSTRAINT "course_material_links_version_valid" CHECK ("version">0)
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"semester_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"teacher" text,
	"credits" real,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	CONSTRAINT "courses_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "courses_version_valid" CHECK ("version">0),
	CONSTRAINT "course_credits_valid" CHECK ("credits" is null or "credits" between 0 and 100),
	CONSTRAINT "course_status_valid" CHECK ("status" in ('ACTIVE','COMPLETED','ARCHIVED'))
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"course_id" uuid NOT NULL,
	"status" text DEFAULT 'ENROLLED' NOT NULL,
	CONSTRAINT "enrollments_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "enrollments_identity_0" UNIQUE("owner_id","course_id"),
	CONSTRAINT "enrollments_version_valid" CHECK ("version">0),
	CONSTRAINT "enrollment_status_valid" CHECK ("status" in ('ENROLLED','COMPLETED','WITHDRAWN'))
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"exam_type" text,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"place_id" uuid,
	CONSTRAINT "exams_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "exams_version_valid" CHECK ("version">0),
	CONSTRAINT "exam_range_valid" CHECK ("end_at" is null or "end_at" >= "start_at")
);
--> statement-breakpoint
CREATE TABLE "core_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"key" text NOT NULL CONSTRAINT "core_files_identity_0" UNIQUE,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	CONSTRAINT "core_files_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "core_files_version_valid" CHECK ("version">0),
	CONSTRAINT "core_files_size_valid" CHECK ("size" between 0 and 20971520)
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"course_id" uuid NOT NULL,
	"assessment_type" text,
	"reference" text,
	"score" real,
	"max_score" real,
	"weight" real,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "grades_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "grades_version_valid" CHECK ("version">0),
	CONSTRAINT "grade_values_valid" CHECK (("score" is null or "score" >= 0) and ("max_score" is null or "max_score">0) and ("weight" is null or "weight" between 0 and 1) and ("score" is null or "max_score" is null or "score" <= "max_score"))
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"note" text,
	CONSTRAINT "places_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "places_version_valid" CHECK ("version">0)
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"owner_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"voyage_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	CONSTRAINT "semesters_owner_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "semesters_version_valid" CHECK ("version">0),
	CONSTRAINT "semester_range_valid" CHECK ("end_at" >= "start_at"),
	CONSTRAINT "semester_status_valid" CHECK ("status" in ('ACTIVE','COMPLETED','ARCHIVED'))
);
--> statement-breakpoint
CREATE INDEX "assignments_owner_idx" ON "assignments" ("owner_id");--> statement-breakpoint
CREATE INDEX "class_sessions_owner_idx" ON "class_sessions" ("owner_id");--> statement-breakpoint
CREATE INDEX "course_material_links_owner_idx" ON "course_material_links" ("owner_id");--> statement-breakpoint
CREATE INDEX "courses_owner_idx" ON "courses" ("owner_id");--> statement-breakpoint
CREATE INDEX "enrollments_owner_idx" ON "enrollments" ("owner_id");--> statement-breakpoint
CREATE INDEX "exams_owner_idx" ON "exams" ("owner_id");--> statement-breakpoint
CREATE INDEX "core_files_owner_idx" ON "core_files" ("owner_id");--> statement-breakpoint
CREATE INDEX "grades_owner_idx" ON "grades" ("owner_id");--> statement-breakpoint
CREATE INDEX "places_owner_idx" ON "places" ("owner_id");--> statement-breakpoint
CREATE INDEX "semesters_owner_idx" ON "semesters" ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_assignment_source_unique" ON "tasks" ("owner_id","source_id") WHERE "source_type"='ASSIGNMENT';--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_owner_id_course_id_courses_owner_id_id_fkey" FOREIGN KEY ("owner_id","course_id") REFERENCES "courses"("owner_id","id");--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_owner_id_task_id_tasks_owner_id_id_fkey" FOREIGN KEY ("owner_id","task_id") REFERENCES "tasks"("owner_id","id");--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_owner_id_course_id_courses_owner_id_id_fkey" FOREIGN KEY ("owner_id","course_id") REFERENCES "courses"("owner_id","id");--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_owner_id_place_id_places_owner_id_id_fkey" FOREIGN KEY ("owner_id","place_id") REFERENCES "places"("owner_id","id");--> statement-breakpoint
ALTER TABLE "course_material_links" ADD CONSTRAINT "course_material_links_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "course_material_links" ADD CONSTRAINT "course_material_links_1aDFaVolKH28_fkey" FOREIGN KEY ("owner_id","course_id") REFERENCES "courses"("owner_id","id");--> statement-breakpoint
ALTER TABLE "course_material_links" ADD CONSTRAINT "course_material_links_eKEg7glVe3rs_fkey" FOREIGN KEY ("owner_id","file_id") REFERENCES "core_files"("owner_id","id");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_id_semester_id_semesters_owner_id_id_fkey" FOREIGN KEY ("owner_id","semester_id") REFERENCES "semesters"("owner_id","id");--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_owner_id_course_id_courses_owner_id_id_fkey" FOREIGN KEY ("owner_id","course_id") REFERENCES "courses"("owner_id","id");--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_owner_id_course_id_courses_owner_id_id_fkey" FOREIGN KEY ("owner_id","course_id") REFERENCES "courses"("owner_id","id");--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_owner_id_place_id_places_owner_id_id_fkey" FOREIGN KEY ("owner_id","place_id") REFERENCES "places"("owner_id","id");--> statement-breakpoint
ALTER TABLE "core_files" ADD CONSTRAINT "core_files_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_owner_id_course_id_courses_owner_id_id_fkey" FOREIGN KEY ("owner_id","course_id") REFERENCES "courses"("owner_id","id");--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_owner_id_voyage_id_voyages_owner_id_id_fkey" FOREIGN KEY ("owner_id","voyage_id") REFERENCES "voyages"("owner_id","id");--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_source_valid", ADD CONSTRAINT "tasks_source_valid" CHECK (("source_type" is null and "source_id" is null) or ("source_type" is not null and "source_type" in ('PROJECT','GOAL','VOYAGE','ASSIGNMENT') and "source_id" is not null));