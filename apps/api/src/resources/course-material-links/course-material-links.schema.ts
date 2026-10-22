import {
  pgTable,
  text,
  uuid,
  unique,
  uniqueIndex,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
import { courses } from '../courses/courses.schema';
import { files } from '../files/files.schema';
export const courseMaterialLinks = pgTable(
  'course_material_links',
  {
    ...ownedColumns(),
    courseId: uuid('course_id').notNull(),
    fileId: uuid('file_id').notNull(),
    materialType: text('material_type'),
    label: text('label'),
  },
  (t) => [
    unique('course_material_links_owner_id_unique').on(t.ownerId, t.id),
    index('course_material_links_owner_idx').on(t.ownerId),
    check('course_material_links_version_valid', sql`${t.version}>0`),
    foreignKey({
      columns: [t.ownerId, t.courseId],
      foreignColumns: [courses.ownerId, courses.id],
    }),
    foreignKey({
      columns: [t.ownerId, t.fileId],
      foreignColumns: [files.ownerId, files.id],
    }),
    uniqueIndex('course_material_links_identity_0')
      .on(t.ownerId, t.courseId, t.fileId)
      .where(sql`${t.deletedAt} is null`),
  ],
);
