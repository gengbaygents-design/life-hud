import { z } from 'zod';
import { recordSchema as semester } from '../semesters/contract';
import { recordSchema as course } from '../courses/contract';
import { recordSchema as session } from '../class-sessions/contract';
import { recordSchema as assignment } from '../assignments/contract';
import { recordSchema as exam } from '../exams/contract';
import { recordSchema as grade } from '../grades/contract';
import { recordSchema as material } from '../course-material-links/contract';
import { recordSchema as place } from '../places/contract';
import { recordSchema as file } from '../files/contract';
import { recordSchema as enrollment } from '../enrollments/contract';
export const classSchema = session.extend({
  courseName: z.string(),
  placeName: z.string().nullable(),
});
export const recordSchema = z.object({
  asOf: z.string().datetime(),
  semesters: z.array(semester),
  courses: z.array(course),
  enrollments: z.array(enrollment),
  sessions: z.array(classSchema),
  assignments: z.array(assignment),
  exams: z.array(exam),
  grades: z.array(grade),
  materials: z.array(material),
  places: z.array(place),
  files: z.array(file),
  today: z.array(classSchema),
  current: classSchema.nullable(),
  next: classSchema.nullable(),
});
