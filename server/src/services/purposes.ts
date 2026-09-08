import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { createPurposeInputSchema, type CreatePurposeInput } from '../validators/purposes.js';

export type PurposeStatus = 'active' | 'sealed' | 'archived';
export type PurposeCreatedBy = 'human' | 'ai' | 'system' | 'ai_proposal' | 'importer';

interface PurposeRow {
  id: string;
  user_id: string;
  course_id: string | null;
  note_id: string | null;
  title: string;
  intent: string | null;
  scope_note: string | null;
  status: PurposeStatus;
  is_note_default: number;
  created_by: PurposeCreatedBy;
  metadata: string;
  created_at: string;
  updated_at: string;
}

interface PurposeMemberRow {
  id: string;
  purpose_id: string;
  member_kind: 'content_group' | 'item';
  member_id: string;
  role: string | null;
  fitness: string;
  order_index: number;
  metadata: string;
  created_at: string;
  updated_at: string;
}

function parseJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function hydratePurpose(row: PurposeRow, members: PurposeMemberRow[] = []) {
  return {
    id: row.id,
    project_id: row.course_id,
    course_id: row.course_id,
    note_id: row.note_id,
    title: row.title,
    intent: row.intent,
    scope_note: row.scope_note,
    status: row.status,
    is_note_default: row.is_note_default === 1,
    created_by: row.created_by,
    // Historical membership is exposed only for legacy by-note reads. It is
    // never the library soul's material set or a newly maintained membership.
    members: members.map((member) => ({
      ...member,
      metadata: parseJson(member.metadata),
    })),
    metadata: parseJson(row.metadata),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export type Purpose = ReturnType<typeof hydratePurpose>;

function getOwnedPurposeRow(db: Database.Database, userId: string, purposeId: string): PurposeRow {
  const row = db.prepare('SELECT * FROM purposes WHERE id = ? AND user_id = ?')
    .get(purposeId, userId) as PurposeRow | undefined;
  if (!row) throw new AppError(404, 'Purpose not found');
  return row;
}

export function getPurpose(db: Database.Database, userId: string, purposeId: string): Purpose {
  return hydratePurpose(getOwnedPurposeRow(db, userId, purposeId));
}

export function listPurposes(
  db: Database.Database,
  userId: string,
  input: { project_id?: string | null; status?: PurposeStatus | 'all' } = {},
): Purpose[] {
  const clauses = ['user_id = ?'];
  const params: Array<string | null> = [userId];
  if (input.project_id !== undefined) {
    clauses.push('course_id IS ?');
    params.push(input.project_id);
  }
  if (input.status && input.status !== 'all') {
    clauses.push('status = ?');
    params.push(input.status);
  }
  const rows = db.prepare(`
    SELECT * FROM purposes WHERE ${clauses.join(' AND ')}
    ORDER BY updated_at DESC, created_at DESC, id ASC
  `).all(...params) as PurposeRow[];
  return rows.map((row) => hydratePurpose(row));
}

/** Synchronous domain write; the calling route owns the action/event transaction. */
export function createPurpose(
  db: Database.Database,
  userId: string,
  input: CreatePurposeInput,
): Purpose {
  if (!db.inTransaction) throw new Error('purpose_transaction_required');
  const data = createPurposeInputSchema.parse(input);
  const projectId = data.project_id ?? null;
  if (projectId !== null) {
    const project = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?')
      .get(projectId, userId);
    if (!project) throw new AppError(404, 'Project not found');
  }
  const purposeId = `purpose-${uuidv4()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO purposes (
      id, user_id, course_id, title, intent, scope_note,
      status, created_by, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
  `).run(
    purposeId, userId, projectId, data.title,
    data.intent ?? null, data.scope_note ?? null, data.created_by ?? 'human',
    JSON.stringify(data.metadata ?? {}), now, now,
  );
  return getPurpose(db, userId, purposeId);
}

/** Legacy note snapshots are read-only. Opening a note never creates a soul. */
export function listNotePurposes(db: Database.Database, userId: string, noteId: string): Purpose[] {
  const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
  if (!note) throw new AppError(404, 'Note not found');
  const rows = db.prepare(`
    SELECT * FROM purposes
    WHERE user_id = ? AND note_id = ? AND status = 'active'
    ORDER BY is_note_default DESC, updated_at DESC, created_at DESC, id ASC
  `).all(userId, noteId) as PurposeRow[];
  return rows.map((row) => {
    const members = db.prepare(`
      SELECT id, purpose_id, member_kind, member_id, role, fitness,
             order_index, metadata, created_at, updated_at
      FROM purpose_members WHERE user_id = ? AND purpose_id = ?
      ORDER BY order_index ASC, created_at ASC, id ASC
    `).all(userId, row.id) as PurposeMemberRow[];
    return hydratePurpose(row, members);
  });
}

// Keep callable tombstones for old internal consumers: no fallback writer,
// implicit bootstrap, or dual writing to the retired maintenance table.
export function ensureNoteDefaultPurpose(
  _db: Database.Database, _userId: string, _noteId: string,
): Purpose {
  throw new AppError(410, 'note_purpose_writer_retired');
}

export function replaceNotePurposes(
  _db: Database.Database, _userId: string, _noteId: string, _purposes: Record<string, any>[],
): Purpose[] {
  throw new AppError(410, 'note_purpose_writer_retired');
}

interface DeferredCompiledScope {
  purpose_id: string;
  note_id: string | null;
  project_id: string | null;
  items: Array<{
    item: Record<string, unknown>;
    direct: boolean;
    derived: boolean;
    paths: Array<Record<string, unknown>>;
    membership_kind: string;
  }>;
  total: number;
}

/** 13.3 has no compiler. Old cached membership must not impersonate a material set. */
export function getPurposeCompiledScope(
  db: Database.Database, userId: string, purposeId: string,
): DeferredCompiledScope {
  getOwnedPurposeRow(db, userId, purposeId);
  throw new AppError(410, 'purpose_compiled_scope_deferred');
}

export function searchPurposeItems(
  db: Database.Database, userId: string, purposeId: string,
  _input: { query?: string; limit?: number } = {},
): DeferredCompiledScope & { query: string } {
  getOwnedPurposeRow(db, userId, purposeId);
  throw new AppError(410, 'purpose_compiled_scope_deferred');
}
