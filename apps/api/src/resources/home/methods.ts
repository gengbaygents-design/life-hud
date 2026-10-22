import { rawDb } from '@/db';
import { inputSchema, recordSchema } from './contract';
import { selectClockNow } from '../core-clock';
import { collectHomeContext } from './providers';
import { attentionEngine } from './engine';
export async function getHome(
  ownerId: string,
  input: unknown = {},
  options: {
    now?: Date;
    audience?: 'HOME' | 'MODEL';
    shareStatusIds?: string[];
  } = {},
) {
  const { timeZone } = inputSchema.parse(input),
    now = options.now ?? selectClockNow(process.env);
  return rawDb.transaction(
    async (tx) => {
      const context = await collectHomeContext({
        tx,
        ownerId,
        now,
        audience: options.audience ?? 'HOME',
        shareStatusIds: options.shareStatusIds ?? [],
      });
      return recordSchema.parse(attentionEngine(context, now, timeZone));
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
