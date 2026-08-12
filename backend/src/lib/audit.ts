import { db } from "../db/index.js";
import { auditLogs, adminActions } from "../db/schema.js";

export interface AuditEntry {
  actorId?: string;
  actorRole?: "ADMIN" | "USER" | "SYSTEM";
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  meta?: Record<string, unknown>;
}

/** Append a row to the audit log. Never throws (best effort). */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      adminId: entry.actorId ?? null,
      actorRole: entry.actorRole ?? "ADMIN",
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      meta: entry.meta,
      ipAddress: entry.ip,
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", error);
  }
}

export interface AdminActionEntry {
  adminId: string;
  action: string;
  detail?: string;
  orderId?: number;
  paymentId?: number;
  subscriptionId?: number;
  notes?: string;
}

export async function logAdminAction(entry: AdminActionEntry): Promise<void> {
  try {
    await db.insert(adminActions).values(entry);
  } catch (error) {
    console.error("[audit] failed to write admin action", error);
  }
}