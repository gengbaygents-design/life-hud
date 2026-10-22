import { auditLogs } from './audit-logs/audit-logs.schema';
import { domainWrite, type CoreTx } from './core-methods';
export type SensitiveSubject = {
  kind: string;
  id: string;
  privacyLevel: string;
};
// Call only with rows already selected under the authenticated owner scope.
export async function auditSensitiveReadIn(
  tx: CoreTx,
  ownerId: string,
  subjects: SensitiveSubject[],
  operation: string,
) {
  const sensitive = subjects.filter(
    (s) =>
      s.kind === 'CYCLE_RECORD' ||
      s.privacyLevel === 'HIGH_PRIVATE' ||
      s.privacyLevel === 'VAULT',
  );
  if (!sensitive.length) return;
  await tx
    .insert(auditLogs)
    .values(
      sensitive.map((s) => ({
        ownerId,
        actorId: ownerId,
        entityType: s.kind,
        entityId: s.id,
        action: 'SensitiveRecordAccessed',
        metadata: { operation },
      })),
    );
}
export async function auditSensitiveRead(
  ownerId: string,
  subjects: SensitiveSubject[],
  operation: string,
) {
  if (
    !subjects.some(
      (s) =>
        s.kind === 'CYCLE_RECORD' ||
        s.privacyLevel === 'HIGH_PRIVATE' ||
        s.privacyLevel === 'VAULT',
    )
  )
    return;
  await domainWrite((tx) =>
    auditSensitiveReadIn(tx, ownerId, subjects, operation),
  );
}
