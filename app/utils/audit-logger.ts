import { connectToDatabase } from "@/lib/mongodb";

export interface AuditLog {
  timestamp: Date;
  action: string;
  collection: string;
  recordId: string;
  userId?: string;
  userEmail?: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit event to the auditLogs collection
 */
export async function logAuditEvent(log: AuditLog): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const auditLogsCollection = db.collection("auditLogs");
    
    await auditLogsCollection.insertOne({
      ...log,
      timestamp: new Date(),
    });
    
    console.log(`📝 [Audit] ${log.action} - ${log.collection}:${log.recordId}`);
  } catch (error) {
    console.error("[Audit] Failed to log event:", error);
    // Don't throw - logging should never break the main operation
  }
}

/**
 * Helper to calculate field differences for change tracking
 */
export function calculateChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  
  // Check all keys in 'after'
  for (const key in after) {
    if (before[key] !== after[key]) {
      changes[key] = {
        before: before[key],
        after: after[key],
      };
    }
  }
  
  // Check for removed keys
  for (const key in before) {
    if (!(key in after) && before[key] !== undefined) {
      changes[key] = {
        before: before[key],
        after: undefined,
      };
    }
  }
  
  return changes;
}
