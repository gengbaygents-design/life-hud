ALTER TABLE "course_material_links" DROP CONSTRAINT "course_material_links_identity_0";--> statement-breakpoint
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_identity_0";--> statement-breakpoint
CREATE UNIQUE INDEX "course_material_links_identity_0" ON "course_material_links" ("owner_id","course_id","file_id") WHERE "deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "enrollments_identity_0" ON "enrollments" ("owner_id","course_id") WHERE "deleted_at" is null;