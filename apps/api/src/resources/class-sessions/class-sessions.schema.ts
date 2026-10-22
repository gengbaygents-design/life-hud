import {
  pgTable,
  text,
  date,
  uuid,
  unique,
  index,
  foreignKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { ownedColumns } from '../core-columns';
import { courses } from '../courses/courses.schema';
import { places } from '../places/places.schema';
export const classSessions = pgTable(
  'class_sessions',
  {
    ...ownedColumns(),
    courseId: uuid('course_id').notNull(),
    specificDate: date('specific_date').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    timeZone: text('time_zone').notNull().default('Asia/Shanghai'),
    placeId: uuid('place_id'),
  },
  (t) => [
    unique('class_sessions_owner_id_unique').on(t.ownerId, t.id),
    index('class_sessions_owner_idx').on(t.ownerId),
    check('class_sessions_version_valid', sql`${t.version}>0`),
    foreignKey({
      columns: [t.ownerId, t.courseId],
      foreignColumns: [courses.ownerId, courses.id],
    }),
    foreignKey({
      columns: [t.ownerId, t.placeId],
      foreignColumns: [places.ownerId, places.id],
    }),
    check(
      'class_time_valid',
      sql`${t.endTime} > ${t.startTime} and ${t.startTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and ${t.endTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
  ],
);
