import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';

type PurposeStatus = 'active' | 'archived';
type PurposeCreatedBy = 'human' | 'ai' | 'system' | 'ai_proposal' | 'importer';
type PurposeMemberKind = 'content_group';

interface OwnedNote {
  id: string;
  course_id: string;
}

interface PurposeRow {
  id: string;
  user_id: string;
  course_id: string | null;
  note_id: string | null;
  title: string;
  intent: string | null;
  scope_note: string | null;
  status: string;
  is_note_default: number;
  created_by: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

interface PurposeMemberRow {
  id: string;
  user_id: string;
  purpose_id: string;
  member_kind: string;
  member_id: string;
  role: string | null;
  fitness: string;
  order_index: number;
  metadata: string;
  created_at: string;
  updated_at: string;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown, fallback: unknown): string {
  return JSON.stringify(value ?? fallback);
}

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanText(value: unknown, fallback: string): string {
  return optionalText(value) ?? fallback;
}

function normalizeStatus(value: unknown): PurposeStatus {
  return value === 'archived' ? 'archived' : 'active';
}

function normalizeCreatedBy(value: unknown): PurposeCreatedBy {
  if (
    value === 'ai'
    || value === 'system'
    || value === 'ai_proposal'
    || value === 'importer'
  ) {
    return value;
  }
  return 'human';
}

function normalizeMemberKind(value: unknown): PurposeMemberKind {
  if (value && value !== 'content_group') {
    throw new AppError(400, 'Unsupported purpose member kind');
  }
  return 'content_group';
}

function hydratePurposeMember(row: PurposeMemberRow) {
  return {
    id: row.id,
    purpose_id: row.purpose_id,
    member_kind: normalizeMemberKind(row.member_kind),
    member_id: row.member_id,
    role: row.role || null,
    fitness: row.fitness || 'unknown',
    order_index: row.order_index,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function hydratePurpose(row: PurposeRow, members: PurposeMemberRow[]) {
  return {
    id: row.id,
    project_id: row.course_id || '',
    course_id: row.course_id || null,
    note_id: row.note_id || null,
    title: row.title,
    intent: row.intent || null,
    scope_note: row.scope_note || null,
    status: normalizeStatus(row.status),
    is_note_default: row.is_note_default === 1,
    created_by: normalizeCreatedBy(row.created_by),
    members: members.map(hydratePurposeMember),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNote {
  const note = db.prepare('SELECT id, course_id FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as OwnedNote | undefined;
  if (!note) throw new AppError(404, 'Note not found');
  return note;
}

function listVisiblePurposeMemberRows(
  db: Database.Database,
  userId: string,
  purposeId: string,
) {
  return db.prepare(`
    SELECT pm.*
    FROM purpose_members pm
    LEFT JOIN content_groups cg
      ON pm.member_kind = 'content_group'
      AND pm.member_id = cg.id
      AND pm.user_id = cg.user_id
    WHERE pm.user_id = ?
      AND pm.purpose_id = ?
      AND (
        pm.member_kind != 'content_group'
        OR (cg.id IS NOT NULL AND cg.status != 'deleted')
      )
    ORDER BY pm.order_index ASC, pm.created_at ASC, pm.id ASC
  `).all(userId, purposeId) as PurposeMemberRow[];
}

function insertPurposeMember(
  db: Database.Database,
  userId: string,
  purposeId: string,
  input: Record<string, any>,
  orderIndex: number,
  now: string,
) {
  const memberKind = normalizeMemberKind(input.member_kind);
  const memberId = cleanText(input.member_id, '');
  if (!memberId) throw new AppError(400, 'Purpose member_id is required');
  const group = db.prepare(`
    SELECT id
    FROM content_groups
    WHERE id = ? AND user_id = ?
  `).get(memberId, userId);
  if (!group) throw new AppError(400, 'Purpose member content group not found');

  db.prepare(`
    INSERT OR IGNORE INTO purpose_members (
      id, user_id, purpose_id, member_kind, member_id,
      role, fitness, order_index, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cleanText(input.id, `purpose-member-${uuidv4()}`),
    userId,
    purposeId,
    memberKind,
    memberId,
    optionalText(input.role),
    cleanText(input.fitness, 'unknown'),
    typeof input.order_index === 'number' ? input.order_index : orderIndex,
    stringifyJson(input.metadata, {}),
    typeof input.created_at === 'string' ? input.created_at : now,
    typeof input.updated_at === 'string' ? input.updated_at : now,
  );
}

function bootstrapDefaultPurposeMembers(
  db: Database.Database,
  userId: string,
  noteId: string,
  purposeId: string,
  now: string,
) {
  const groups = db.prepare(`
    SELECT id, created_at
    FROM content_groups
    WHERE user_id = ?
      AND note_id = ?
      AND status != 'deleted'
    ORDER BY created_at ASC, id ASC
  `).all(userId, noteId) as Array<{ id: string; created_at: string }>;

  groups.forEach((group, index) => {
    db.prepare(`
      INSERT OR IGNORE INTO purpose_members (
        id, user_id, purpose_id, member_kind, member_id,
        role, fitness, order_index, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, 'content_group', ?, NULL, 'unknown', ?, '{}', ?, ?)
    `).run(
      `purpose-member-${purposeId}-${group.id}`,
      userId,
      purposeId,
      group.id,
      index,
      now,
      now,
    );
  });
}

function ensureNoteDefaultPurposeWithinTransaction(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
) {
  const now = new Date().toISOString();
  const purposeId = `purpose-default-${note.id}`;
  const insertInfo = db.prepare(`
    INSERT OR IGNORE INTO purposes (
      id, user_id, course_id, note_id, title, intent, scope_note,
      status, is_note_default, created_by, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, NULL, NULL, 'active', 1, 'system', '{}', ?, ?)
  `).run(
    purposeId,
    userId,
    note.course_id,
    note.id,
    'Default purpose',
    now,
    now,
  );

  const row = db.prepare(`
    SELECT *
    FROM purposes
    WHERE user_id = ? AND note_id = ? AND is_note_default = 1
    LIMIT 1
  `).get(userId, note.id) as PurposeRow | undefined;
  if (!row) throw new AppError(500, 'Default purpose could not be created');

  if (insertInfo.changes > 0) {
    bootstrapDefaultPurposeMembers(db, userId, note.id, row.id, now);
  }

  return hydratePurpose(row, listVisiblePurposeMemberRows(db, userId, row.id));
}

function listNotePurposeRows(db: Database.Database, userId: string, noteId: string) {
  return db.prepare(`
    SELECT *
    FROM purposes
    WHERE user_id = ?
      AND note_id = ?
      AND status = 'active'
    ORDER BY is_note_default DESC, updated_at DESC, created_at DESC, id ASC
  `).all(userId, noteId) as PurposeRow[];
}

export function ensureNoteDefaultPurpose(
  db: Database.Database,
  userId: string,
  noteId: string,
) {
  const note = getOwnedNote(db, userId, noteId);
  return db.transaction(() => ensureNoteDefaultPurposeWithinTransaction(db, userId, note))();
}

export function listNotePurposes(
  db: Database.Database,
  userId: string,
  noteId: string,
) {
  const note = getOwnedNote(db, userId, noteId);
  ensureNoteDefaultPurpose(db, userId, note.id);
  const rows = listNotePurposeRows(db, userId, note.id);

  return rows.map((row) => hydratePurpose(row, listVisiblePurposeMemberRows(db, userId, row.id)));
}

export function replaceNotePurposes(
  db: Database.Database,
  userId: string,
  noteId: string,
  purposes: Record<string, any>[],
) {
  const note = getOwnedNote(db, userId, noteId);
  const defaultCount = purposes.filter((purpose) => purpose.is_note_default === true).length;
  if (defaultCount > 1) throw new AppError(400, 'Only one default purpose is allowed per note');

  return db.transaction(() => {
    const now = new Date().toISOString();
    const hiddenEdges = db.prepare(`
      SELECT pm.*
      FROM purpose_members pm
      JOIN purposes p
        ON p.id = pm.purpose_id
        AND p.user_id = pm.user_id
      LEFT JOIN content_groups cg
        ON pm.member_kind = 'content_group'
        AND pm.member_id = cg.id
        AND pm.user_id = cg.user_id
      WHERE pm.user_id = ?
        AND p.note_id = ?
        AND pm.member_kind = 'content_group'
        AND (cg.id IS NULL OR cg.status = 'deleted')
    `).all(userId, note.id) as PurposeMemberRow[];
    const survivingPurposeIds = new Set<string>();

    db.prepare('DELETE FROM purposes WHERE user_id = ? AND note_id = ?').run(userId, note.id);

    purposes.forEach((purpose, purposeIndex) => {
      const purposeId = cleanText(purpose.id, `purpose-${uuidv4()}`);
      survivingPurposeIds.add(purposeId);
      db.prepare(`
        INSERT INTO purposes (
          id, user_id, course_id, note_id, title, intent, scope_note,
          status, is_note_default, created_by, metadata, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        purposeId,
        userId,
        note.course_id,
        note.id,
        cleanText(purpose.title, 'Untitled purpose'),
        optionalText(purpose.intent),
        optionalText(purpose.scope_note),
        normalizeStatus(purpose.status),
        purpose.is_note_default === true ? 1 : 0,
        normalizeCreatedBy(purpose.created_by),
        stringifyJson(purpose.metadata, {}),
        typeof purpose.created_at === 'string' ? purpose.created_at : now,
        typeof purpose.updated_at === 'string' ? purpose.updated_at : now,
      );

      const seen = new Set<string>();
      const members = Array.isArray(purpose.members) ? purpose.members : [];
      members.forEach((member, memberIndex) => {
        const memberKind = normalizeMemberKind(member.member_kind);
        const memberId = cleanText(member.member_id, '');
        const key = `${memberKind}:${memberId}`;
        if (!memberId || seen.has(key)) return;
        seen.add(key);
        insertPurposeMember(db, userId, purposeId, member, memberIndex, now);
      });

      if (purpose.is_note_default !== true && defaultCount === 0 && purposeIndex === 0) {
        db.prepare('UPDATE purposes SET is_note_default = 1, updated_at = ? WHERE id = ? AND user_id = ?')
          .run(now, purposeId, userId);
      }
    });

    if (purposes.length === 0) {
      ensureNoteDefaultPurposeWithinTransaction(db, userId, note);
    }

    for (const edge of hiddenEdges) {
      if (!survivingPurposeIds.has(edge.purpose_id)) continue;
      db.prepare(`
        INSERT OR IGNORE INTO purpose_members (
          id, user_id, purpose_id, member_kind, member_id,
          role, fitness, order_index, metadata, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        edge.id,
        userId,
        edge.purpose_id,
        edge.member_kind,
        edge.member_id,
        edge.role,
        edge.fitness,
        edge.order_index,
        edge.metadata,
        edge.created_at,
        now,
      );
    }

    db.prepare('UPDATE notes SET updated_at = ? WHERE id = ? AND user_id = ?')
      .run(now, note.id, userId);

    const rows = listNotePurposeRows(db, userId, note.id);
    return rows.map((row) => hydratePurpose(row, listVisiblePurposeMemberRows(db, userId, row.id)));
  })();
}
