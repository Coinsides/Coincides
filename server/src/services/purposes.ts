import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { recordEvent, type EventActorKind } from '../db/recordEvent.js';
import { listEventsForObjects } from './eventsLedger.js';
import {
  addPurposeMemberInputSchema,
  amendPurposeInputSchema,
  createPurposeInputSchema,
  purposeInterpretationDraftSchema,
  type AddPurposeMemberInput,
  type AmendPurposeInput,
  type CreatePurposeInput,
  type PurposeInterpretationDraft,
} from '../validators/purposes.js';

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
  user_verbatim: string | null;
  interpretation_json: string;
  interpretation_locked: number;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

type PurposeRowWithCount = PurposeRow & { member_count: number };

const PURPOSE_COLUMNS = `p.*, (SELECT COUNT(*) FROM purpose_members m WHERE m.purpose_id = p.id) AS member_count`;
const TRACE_MEMBER_LIMIT = 200;

interface PurposeMemberRow {
  id: string;
  purpose_id: string;
  member_kind: 'content_group' | 'item' | 'source';
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

function hydratePurpose(row: PurposeRowWithCount, members: PurposeMemberRow[] = []) {
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
    user_verbatim: row.user_verbatim,
    interpretation: parseJson(row.interpretation_json),
    interpretation_locked: row.interpretation_locked === 1,
    locked_at: row.locked_at,
    member_count: row.member_count,
    // The roster is live and counted above; its rows are only listed for legacy
    // by-note reads, and they are not the library soul's compiled material set.
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

function countPurposeMembers(db: Database.Database, purposeId: string): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM purpose_members WHERE purpose_id = ?').get(purposeId) as { n: number }).n;
}

export function getPurpose(db: Database.Database, userId: string, purposeId: string): Purpose {
  const row = getOwnedPurposeRow(db, userId, purposeId);
  return hydratePurpose({ ...row, member_count: countPurposeMembers(db, purposeId) });
}

export function listPurposes(
  db: Database.Database,
  userId: string,
  input: { project_id?: string | null; status?: PurposeStatus | 'all' } = {},
): Purpose[] {
  const clauses = ['p.user_id = ?'];
  const params: Array<string | null> = [userId];
  if (input.project_id !== undefined) {
    clauses.push('p.course_id IS ?');
    params.push(input.project_id);
  }
  if (input.status && input.status !== 'all') {
    clauses.push('p.status = ?');
    params.push(input.status);
  }
  const rows = db.prepare(`
    SELECT ${PURPOSE_COLUMNS} FROM purposes p WHERE ${clauses.join(' AND ')}
    ORDER BY p.updated_at DESC, p.created_at DESC, p.id ASC
  `).all(...params) as PurposeRowWithCount[];
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

const INTERPRETATION_LOCKED_MESSAGE = 'This purpose interpretation is locked';

/** Human ink. A person's edit to the interpretation locks it in the same write. */
export function amendPurpose(
  db: Database.Database,
  userId: string,
  purposeId: string,
  input: AmendPurposeInput,
): { purpose: Purpose; changed: string[] } {
  if (!db.inTransaction) throw new Error('purpose_transaction_required');
  const patch = amendPurposeInputSchema.parse(input);
  const row = getOwnedPurposeRow(db, userId, purposeId);
  if (patch.status !== undefined && patch.status !== row.status && row.status === 'sealed') {
    throw new AppError(409, 'A sealed purpose cannot change status', { code: 'purpose_status_transition_forbidden' });
  }
  const now = new Date().toISOString();
  const changed: string[] = [];
  const next: Record<string, string | number | null> = {};
  for (const field of ['title', 'intent', 'scope_note', 'user_verbatim', 'status'] as const) {
    const value = patch[field];
    if (value !== undefined && value !== row[field]) {
      next[field] = value;
      changed.push(field);
    }
  }
  if (patch.interpretation) {
    const current = parseJson(row.interpretation_json);
    const merged: Record<string, unknown> = { ...current };
    for (const [field, value] of Object.entries(patch.interpretation)) {
      if (value === null) delete merged[field];
      else merged[field] = value;
    }
    // Having the person's own wording settles any draft that was waiting or failed.
    if (merged.draft_status !== undefined) merged.draft_status = 'ready';
    if (JSON.stringify(merged) !== JSON.stringify(current)) {
      next.interpretation_json = JSON.stringify(merged);
      changed.push('interpretation');
    }
    if (row.interpretation_locked !== 1) {
      next.interpretation_locked = 1;
      next.locked_at = now;
      changed.push('interpretation_locked');
    }
  }
  const columns = Object.keys(next);
  if (columns.length) {
    db.prepare(`UPDATE purposes SET ${columns.map((column) => `${column} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND user_id = ?`)
      .run(...columns.map((column) => next[column]), now, purposeId, userId);
  }
  return { purpose: getPurpose(db, userId, purposeId), changed };
}

/** Human ink. Locking takes the interpretation back from the machine; unlocking returns it. */
export function setPurposeLock(
  db: Database.Database,
  userId: string,
  purposeId: string,
  locked: boolean,
): { purpose: Purpose; changed: boolean } {
  if (!db.inTransaction) throw new Error('purpose_transaction_required');
  const row = getOwnedPurposeRow(db, userId, purposeId);
  if ((row.interpretation_locked === 1) === locked) return { purpose: getPurpose(db, userId, purposeId), changed: false };
  const now = new Date().toISOString();
  // Locking ends the machine's turn: a late draft is refused and cannot report back,
  // so nothing may be left waiting. Same settlement as a person's edit.
  const interpretation = parseJson(row.interpretation_json);
  if (locked && interpretation.draft_status !== undefined) interpretation.draft_status = 'ready';
  db.prepare('UPDATE purposes SET interpretation_locked = ?, locked_at = ?, interpretation_json = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(locked ? 1 : 0, locked ? now : null, JSON.stringify(interpretation), now, purposeId, userId);
  return { purpose: getPurpose(db, userId, purposeId), changed: true };
}

export function assertPurposeInterpretationUnlocked(db: Database.Database, userId: string, purposeId: string): void {
  if (getOwnedPurposeRow(db, userId, purposeId).interpretation_locked === 1) {
    throw new AppError(409, INTERPRETATION_LOCKED_MESSAGE, { code: 'purpose_interpretation_locked' });
  }
}

/**
 * Machine ink: no public route writes this. A locked interpretation refuses loudly
 * instead of skipping, so a caller cannot mistake a refusal for a saved revision.
 */
export function revisePurposeInterpretation(
  db: Database.Database,
  userId: string,
  purposeId: string,
  draft: PurposeInterpretationDraft,
  options: { actor: EventActorKind; channel: string; trigger: string },
): Purpose {
  if (!db.inTransaction) throw new Error('purpose_transaction_required');
  assertPurposeInterpretationUnlocked(db, userId, purposeId);
  const parsed = purposeInterpretationDraftSchema.parse(draft);
  const current = parseJson(getOwnedPurposeRow(db, userId, purposeId).interpretation_json);
  const now = new Date().toISOString();
  const revision = (typeof current.revision === 'number' ? current.revision : 0) + 1;
  db.prepare('UPDATE purposes SET interpretation_json = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(
    JSON.stringify({ ...parsed, drafted_by: options.actor, revised_at: now, revision }),
    now,
    purposeId,
    userId,
  );
  recordEvent(db, {
    user_id: userId,
    actor_kind: options.actor,
    channel: options.channel,
    verb: 'purpose_amended',
    objects: [{ kind: 'purpose', id: purposeId }],
    summary: 'Revised purpose interpretation',
    meta: { field: 'interpretation', trigger: options.trigger, revision },
  });
  return getPurpose(db, userId, purposeId);
}

function setPurposeDraftStatus(
  db: Database.Database,
  userId: string,
  purposeId: string,
  status: 'pending' | 'failed',
): void {
  // The lock condition is part of the write: a person may lock while a draft runs.
  db.prepare(`
    UPDATE purposes
    SET interpretation_json = json_set(CASE WHEN json_valid(interpretation_json) THEN interpretation_json ELSE '{}' END, '$.draft_status', ?),
        updated_at = ?
    WHERE id = ? AND user_id = ? AND interpretation_locked = 0
  `).run(status, new Date().toISOString(), purposeId, userId);
}

export function markPurposeDraftPending(db: Database.Database, userId: string, purposeId: string): Purpose {
  if (!db.inTransaction) throw new Error('purpose_transaction_required');
  assertPurposeInterpretationUnlocked(db, userId, purposeId);
  setPurposeDraftStatus(db, userId, purposeId, 'pending');
  return getPurpose(db, userId, purposeId);
}

export function markPurposeDraftFailed(db: Database.Database, userId: string, purposeId: string): void {
  setPurposeDraftStatus(db, userId, purposeId, 'failed');
}

function assertMemberOwned(db: Database.Database, userId: string, kind: 'content_group' | 'item' | 'source', memberId: string): void {
  const table = { content_group: 'content_groups', item: 'items', source: 'source_records' }[kind];
  if (!db.prepare(`SELECT 1 FROM ${table} WHERE id = ? AND user_id = ?`).get(memberId, userId)) {
    throw new AppError(404, 'Purpose member target not found');
  }
}

/** Adding the same member again keeps the existing row and its provenance. */
export function addPurposeMember(
  db: Database.Database,
  userId: string,
  purposeId: string,
  input: AddPurposeMemberInput,
) {
  if (!db.inTransaction) throw new Error('purpose_transaction_required');
  const data = addPurposeMemberInputSchema.parse(input);
  getOwnedPurposeRow(db, userId, purposeId);
  assertMemberOwned(db, userId, data.member_kind, data.member_id);
  const now = new Date().toISOString();
  const nextOrder = (db.prepare(`
    SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order FROM purpose_members WHERE purpose_id = ?
  `).get(purposeId) as { next_order: number }).next_order;
  const inserted = db.prepare(`
    INSERT INTO purpose_members (
      id, user_id, purpose_id, member_kind, member_id, order_index, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(purpose_id, member_kind, member_id) DO NOTHING
  `).run(
    `purpose-member-${uuidv4()}`, userId, purposeId, data.member_kind, data.member_id,
    nextOrder, JSON.stringify(data.metadata ?? {}), now, now,
  );
  const member = db.prepare(`
    SELECT id, purpose_id, member_kind, member_id, role, fitness,
           order_index, metadata, created_at, updated_at
    FROM purpose_members WHERE purpose_id = ? AND member_kind = ? AND member_id = ?
  `).get(purposeId, data.member_kind, data.member_id) as PurposeMemberRow;
  return { member: { ...member, metadata: parseJson(member.metadata) }, created: inserted.changes === 1 };
}

/** What has happened to this card and the things on it. Reports only; concludes nothing. */
export function getPurposeTraces(
  db: Database.Database,
  userId: string,
  purposeId: string,
  input: { limit?: number; before_seq?: number } = {},
) {
  getOwnedPurposeRow(db, userId, purposeId);
  const members = db.prepare(`
    SELECT member_kind AS kind, member_id AS id FROM purpose_members
    WHERE purpose_id = ? AND user_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(purposeId, userId, TRACE_MEMBER_LIMIT) as Array<{ kind: string; id: string }>;
  const refs = [{ kind: 'purpose', id: purposeId }, ...members];
  return {
    events: listEventsForObjects(db, userId, refs, { limit: input.limit, beforeSeq: input.before_seq }),
    member_count: countPurposeMembers(db, purposeId),
    scanned_refs: refs.length,
  };
}

/** Legacy note snapshots are read-only. Opening a note never creates a soul. */
export function listNotePurposes(db: Database.Database, userId: string, noteId: string): Purpose[] {
  const note = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(noteId, userId);
  if (!note) throw new AppError(404, 'Note not found');
  const rows = db.prepare(`
    SELECT ${PURPOSE_COLUMNS} FROM purposes p
    WHERE p.user_id = ? AND p.note_id = ? AND p.status = 'active'
    ORDER BY p.is_note_default DESC, p.updated_at DESC, p.created_at DESC, p.id ASC
  `).all(userId, noteId) as PurposeRowWithCount[];
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
