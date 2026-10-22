import { ORPCError } from '@orpc/server';

export const filePrefix = (userId: string) =>
  `users/${encodeURIComponent(userId)}/`;

export function assertOwnedKey(userId: string, key: string): string {
  const prefix = filePrefix(userId);
  if (
    !key.startsWith(prefix) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      key.slice(prefix.length),
    )
  ) {
    throw new ORPCError('NOT_FOUND');
  }
  return key;
}
