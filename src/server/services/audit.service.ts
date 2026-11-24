import { getDb } from '@/db';
import { auditLogs } from '@/db/schema';

export interface AuditLogEntry {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
}

/**
 * Records an immutable audit log entry in the PostgreSQL `audit_logs` table.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const db = getDb();
  try {
    await db.insert(auditLogs).values({
      actorId: entry.actorId || null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      meta: entry.meta || {},
      ip: entry.ip || null,
    });
  } catch (error) {
    // Audit logging failure should be logged; depending on compliance policy it shouldn't silently swallow if DB is down.
    console.error('[AuditService] Failed to record audit log:', error, entry);
    throw error;
  }
}
