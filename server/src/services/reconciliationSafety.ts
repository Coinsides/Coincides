import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';

interface SafetyRow {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
}

function createRecoveryBatch(
  db: Database.Database,
  userId: string,
  courseId: string,
  label: string,
  metadata: Record<string, unknown>,
): string {
  const batchId = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO operation_batches (id, user_id, course_id, source_type, label, status, metadata, applied_at)
    VALUES (?, ?, ?, 'reconciliation_safety', ?, 'applied', ?, ?)
  `).run(batchId, userId, courseId, label, JSON.stringify(metadata), now);
  return batchId;
}

function writeRecoveryEvent(
  db: Database.Database,
  userId: string,
  courseId: string,
  input: {
    event_type: string;
    target_type: string;
    target_id: string;
    previous_status: string | null;
    next_status: string;
    reason?: string | null;
    operation_batch_id: string;
    metadata?: Record<string, unknown>;
  },
): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO reconciliation_recovery_events (
      id, user_id, course_id, event_type, target_type, target_id,
      previous_status, next_status, reason, operation_batch_id, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    userId,
    courseId,
    input.event_type,
    input.target_type,
    input.target_id,
    input.previous_status,
    input.next_status,
    input.reason || null,
    input.operation_batch_id,
    JSON.stringify(input.metadata || {}),
    now,
    now,
  );
}

export function listReconciliationSafety(db: Database.Database, userId: string, courseId: string) {
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?')
    .get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');

  return {
    active_exclusions: db.prepare(`
      SELECT *
      FROM excluded_material_scopes
      WHERE user_id = ? AND course_id = ? AND status = 'active'
      ORDER BY created_at DESC
    `).all(userId, courseId),
    open_conflicts: db.prepare(`
      SELECT *
      FROM conflict_review_items
      WHERE user_id = ? AND course_id = ? AND status = 'open'
      ORDER BY created_at DESC
    `).all(userId, courseId),
    recent_conflicts: db.prepare(`
      SELECT *
      FROM conflict_review_items
      WHERE user_id = ? AND course_id = ?
      ORDER BY updated_at DESC
      LIMIT 10
    `).all(userId, courseId),
    recent_recovery_events: db.prepare(`
      SELECT *
      FROM reconciliation_recovery_events
      WHERE user_id = ? AND course_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(userId, courseId),
  };
}

export function restoreExclusion(
  db: Database.Database,
  userId: string,
  exclusionId: string,
  reason = 'Restored from reconciliation safety review',
) {
  const row = db.prepare('SELECT * FROM excluded_material_scopes WHERE id = ? AND user_id = ?')
    .get(exclusionId, userId) as SafetyRow | undefined;
  if (!row) throw new AppError(404, 'Exclusion not found');

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    db.prepare("UPDATE excluded_material_scopes SET status = 'restored', updated_at = ? WHERE id = ?")
      .run(now, exclusionId);
    const batchId = createRecoveryBatch(db, userId, row.course_id, 'Restore reconciliation exclusion', {
      exclusion_id: exclusionId,
      previous_status: row.status,
      next_status: 'restored',
    });
    writeRecoveryEvent(db, userId, row.course_id, {
      event_type: 'restore_exclusion',
      target_type: 'excluded_scope',
      target_id: exclusionId,
      previous_status: row.status,
      next_status: 'restored',
      reason,
      operation_batch_id: batchId,
    });
    return db.prepare('SELECT * FROM excluded_material_scopes WHERE id = ?').get(exclusionId);
  });

  return transaction();
}

export function resolveConflict(
  db: Database.Database,
  userId: string,
  conflictId: string,
  reason = 'Resolved from reconciliation safety review',
) {
  return updateConflictStatus(db, userId, conflictId, 'resolved', 'resolve_conflict', reason);
}

export function reopenConflict(
  db: Database.Database,
  userId: string,
  conflictId: string,
  reason = 'Reopened from reconciliation safety review',
) {
  return updateConflictStatus(db, userId, conflictId, 'open', 'reopen_conflict', reason);
}

function updateConflictStatus(
  db: Database.Database,
  userId: string,
  conflictId: string,
  nextStatus: string,
  eventType: string,
  reason: string,
) {
  const row = db.prepare('SELECT * FROM conflict_review_items WHERE id = ? AND user_id = ?')
    .get(conflictId, userId) as SafetyRow | undefined;
  if (!row) throw new AppError(404, 'Conflict review item not found');

  const transaction = db.transaction(() => {
    const now = new Date().toISOString();
    db.prepare('UPDATE conflict_review_items SET status = ?, updated_at = ? WHERE id = ?')
      .run(nextStatus, now, conflictId);
    const batchId = createRecoveryBatch(db, userId, row.course_id, `Reconciliation conflict ${nextStatus}`, {
      conflict_id: conflictId,
      previous_status: row.status,
      next_status: nextStatus,
    });
    writeRecoveryEvent(db, userId, row.course_id, {
      event_type: eventType,
      target_type: 'conflict_item',
      target_id: conflictId,
      previous_status: row.status,
      next_status: nextStatus,
      reason,
      operation_batch_id: batchId,
    });
    return db.prepare('SELECT * FROM conflict_review_items WHERE id = ?').get(conflictId);
  });

  return transaction();
}
