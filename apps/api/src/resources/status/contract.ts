import { z } from 'zod';
import { recordSchema as moment } from '../status-moments/contract';
import { recordSchema as sleep } from '../sleep-records/contract';
import { recordSchema as water } from '../water-records/contract';
import { recordSchema as exercise } from '../exercise-records/contract';
export const inputSchema = z.object({
  days: z.coerce
    .number()
    .refine((v) => [1, 7, 30].includes(v))
    .default(7),
  timeZone: z
    .string()
    .max(100)
    .default('Asia/Shanghai')
    .refine((v) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }),
});
export const snapshotSchema = z.object({
  asOf: z.string().datetime(),
  moment: moment
    .pick({
      id: true,
      recordedAt: true,
      mood: true,
      customMood: true,
      energy: true,
      stress: true,
      focus: true,
    })
    .nullable(),
});
export const recordSchema = z.object({
  asOf: z.string().datetime(),
  days: z.number(),
  moments: z.array(moment),
  sleep: z.array(sleep.extend({ durationMinutes: z.number() })),
  water: z.array(water),
  exercise: z.array(exercise),
  waterByDay: z.array(z.object({ day: z.string(), amountMl: z.number() })),
  energyTrend: z.array(
    z.object({ id: z.string(), recordedAt: z.string(), energy: z.number() }),
  ),
});
