import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';

type PurposeStatus = 'active' | 'archived';
type PurposeCreatedBy = 'human' | 'ai' | 'system' | 'ai_proposal' | 'importer';
type PurposeMemberKind = 'content_group' | 'item';

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

interface PurposeCompiledItemPathRow {
  item_id: string;
  body_json: string;
  plain_text: string;
  item_type: string | null;
  topic: string | null;
  item_status: string;
  retired_into_item_id: string | null;
  origin_course_id: string | null;
  origin_note_id: string | null;
  item_created_by: string;
  item_metadata: string;
  item_created_at: string;
  item_updated_at: string;
  path_kind: 'direct' | 'content_group';
  path_rank: number;
  purpose_member_id: string;
  role: string | null;
  fitness: string;
  purpose_order_index: number;
  content_group_id: string | null;
  content_group_title: string | null;
  content_group_member_id: string | null;
  content_group_order_index: number | null;
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
  if (value === 'item') return 'item';
  if (!value || value === 'content_group') return 'content_group';
  throw new AppError(400, 'Unsupported purpose member kind');
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
    LEFT JOIN items i
      ON pm.member_kind = 'item'
      AND pm.member_id = i.id
      AND pm.user_id = i.user_id
    WHERE pm.user_id = ?
      AND pm.purpose_id = ?
      AND (
        (pm.member_kind = 'content_group' AND cg.id IS NOT NULL AND cg.status != 'deleted')
        OR (pm.member_kind = 'item' AND i.id IS NOT NULL AND i.status = 'active')
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
  if (memberKind === 'content_group') {
    const group = db.prepare(`
      SELECT id
      FROM content_groups
      WHERE id = ? AND user_id = ?
    `).get(memberId, userId);
    if (!group) throw new AppError(400, 'Purpose member content group not found');
  } else {
    const item = db.prepare(`
      SELECT id, status
      FROM items
      WHERE id = ? AND user_id = ?
    `).get(memberId, userId) as { id: string; status: string } | undefined;
    if (!item) throw new AppError(400, 'Purpose member Item not found');
    if (item.status !== 'active') throw new AppError(400, 'Purpose member Item must be active');
  }

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
    const existingPurposes = db.prepare(`
      SELECT *
      FROM purposes
      WHERE user_id = ? AND note_id = ?
    `).all(userId, note.id) as PurposeRow[];
    const existingPurposeById = new Map(existingPurposes.map((purpose) => [purpose.id, purpose]));
    const seenPurposeIds = new Set<string>();
    const normalizedPurposes = purposes.map((purpose, purposeIndex) => {
      const purposeId = cleanText(purpose.id, `purpose-${uuidv4()}`);
      if (seenPurposeIds.has(purposeId)) {
        throw new AppError(400, 'Duplicate Purpose id in replacement payload');
      }
      seenPurposeIds.add(purposeId);

      const claimedIdentity = db.prepare(`
        SELECT user_id, note_id
        FROM purposes
        WHERE id = ?
      `).get(purposeId) as { user_id: string; note_id: string | null } | undefined;
      if (
        claimedIdentity
        && (claimedIdentity.user_id !== userId || claimedIdentity.note_id !== note.id)
      ) {
        throw new AppError(409, 'Purpose id already belongs to another owner or Note');
      }

      return {
        input: purpose,
        purposeId,
        isDefault: purpose.is_note_default === true || (defaultCount === 0 && purposeIndex === 0),
      };
    });
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
      LEFT JOIN items i
        ON pm.member_kind = 'item'
        AND pm.member_id = i.id
        AND pm.user_id = i.user_id
      WHERE pm.user_id = ?
        AND p.note_id = ?
        AND (
          (pm.member_kind = 'content_group' AND (cg.id IS NULL OR cg.status = 'deleted'))
          OR (pm.member_kind = 'item' AND (i.id IS NULL OR i.status = 'retired'))
        )
    `).all(userId, note.id) as PurposeMemberRow[];
    const hiddenEdgeKeys = new Set(hiddenEdges.map((edge) => (
      `${edge.purpose_id}:${edge.member_kind}:${edge.member_id}`
    )));
    const hiddenEdgesByPurpose = new Map<string, PurposeMemberRow[]>();
    for (const edge of hiddenEdges) {
      const purposeEdges = hiddenEdgesByPurpose.get(edge.purpose_id) || [];
      purposeEdges.push(edge);
      hiddenEdgesByPurpose.set(edge.purpose_id, purposeEdges);
    }

    // Release the partial unique index before assigning the replacement default.
    db.prepare(`
      UPDATE purposes
      SET is_note_default = 0
      WHERE user_id = ? AND note_id = ? AND is_note_default = 1
    `).run(userId, note.id);

    for (const normalized of normalizedPurposes) {
      const { input: purpose, purposeId, isDefault } = normalized;
      const existingPurpose = existingPurposeById.get(purposeId);
      const updatedAt = typeof purpose.updated_at === 'string' ? purpose.updated_at : now;
      if (existingPurpose) {
        db.prepare(`
          UPDATE purposes
          SET course_id = ?, note_id = ?, title = ?, intent = ?, scope_note = ?,
              status = ?, is_note_default = ?, created_by = ?, metadata = ?, updated_at = ?
          WHERE id = ? AND user_id = ? AND note_id = ?
        `).run(
          note.course_id,
          note.id,
          cleanText(purpose.title, 'Untitled purpose'),
          optionalText(purpose.intent),
          optionalText(purpose.scope_note),
          normalizeStatus(purpose.status),
          isDefault ? 1 : 0,
          normalizeCreatedBy(purpose.created_by),
          stringifyJson(purpose.metadata, {}),
          updatedAt,
          purposeId,
          userId,
          note.id,
        );
      } else {
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
          isDefault ? 1 : 0,
          normalizeCreatedBy(purpose.created_by),
          stringifyJson(purpose.metadata, {}),
          typeof purpose.created_at === 'string' ? purpose.created_at : now,
          updatedAt,
        );
      }

      db.prepare('DELETE FROM purpose_members WHERE user_id = ? AND purpose_id = ?')
        .run(userId, purposeId);

      const seen = new Set<string>();
      const members = Array.isArray(purpose.members) ? purpose.members : [];
      members.forEach((member, memberIndex) => {
        const memberKind = normalizeMemberKind(member.member_kind);
        const memberId = cleanText(member.member_id, '');
        const key = `${memberKind}:${memberId}`;
        if (!memberId || seen.has(key)) return;
        seen.add(key);
        if (hiddenEdgeKeys.has(`${purposeId}:${key}`)) return;
        insertPurposeMember(db, userId, purposeId, member, memberIndex, now);
      });

      for (const edge of hiddenEdgesByPurpose.get(purposeId) || []) {
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
    }

    for (const existingPurpose of existingPurposes) {
      if (seenPurposeIds.has(existingPurpose.id)) continue;
      db.prepare('DELETE FROM purposes WHERE id = ? AND user_id = ? AND note_id = ?')
        .run(existingPurpose.id, userId, note.id);
    }

    if (purposes.length === 0) {
      ensureNoteDefaultPurposeWithinTransaction(db, userId, note);
    }

    db.prepare('UPDATE notes SET updated_at = ? WHERE id = ? AND user_id = ?')
      .run(now, note.id, userId);

    const rows = listNotePurposeRows(db, userId, note.id);
    return rows.map((row) => hydratePurpose(row, listVisiblePurposeMemberRows(db, userId, row.id)));
  })();
}

function getOwnedPurposeRow(
  db: Database.Database,
  userId: string,
  purposeId: string,
): PurposeRow {
  const row = db.prepare('SELECT * FROM purposes WHERE id = ? AND user_id = ?')
    .get(purposeId, userId) as PurposeRow | undefined;
  if (!row) throw new AppError(404, 'Purpose not found');
  return row;
}

function listPurposeCompiledItemPathRows(
  db: Database.Database,
  userId: string,
  purposeId: string,
): PurposeCompiledItemPathRow[] {
  return db.prepare(`
    SELECT
      i.id AS item_id,
      i.body_json,
      i.plain_text,
      i.item_type,
      i.topic,
      i.status AS item_status,
      i.retired_into_item_id,
      i.origin_course_id,
      i.origin_note_id,
      i.created_by AS item_created_by,
      i.metadata AS item_metadata,
      i.created_at AS item_created_at,
      i.updated_at AS item_updated_at,
      'direct' AS path_kind,
      0 AS path_rank,
      pm.id AS purpose_member_id,
      pm.role,
      pm.fitness,
      pm.order_index AS purpose_order_index,
      NULL AS content_group_id,
      NULL AS content_group_title,
      NULL AS content_group_member_id,
      NULL AS content_group_order_index
    FROM purpose_members pm
    JOIN items i
      ON pm.member_kind = 'item'
      AND pm.member_id = i.id
      AND pm.user_id = i.user_id
      AND i.status = 'active'
    WHERE pm.user_id = ? AND pm.purpose_id = ?

    UNION ALL

    SELECT
      i.id AS item_id,
      i.body_json,
      i.plain_text,
      i.item_type,
      i.topic,
      i.status AS item_status,
      i.retired_into_item_id,
      i.origin_course_id,
      i.origin_note_id,
      i.created_by AS item_created_by,
      i.metadata AS item_metadata,
      i.created_at AS item_created_at,
      i.updated_at AS item_updated_at,
      'content_group' AS path_kind,
      1 AS path_rank,
      pm.id AS purpose_member_id,
      pm.role,
      pm.fitness,
      pm.order_index AS purpose_order_index,
      cg.id AS content_group_id,
      cg.title AS content_group_title,
      cgm.id AS content_group_member_id,
      cgm.order_index AS content_group_order_index
    FROM purpose_members pm
    JOIN content_groups cg
      ON pm.member_kind = 'content_group'
      AND pm.member_id = cg.id
      AND pm.user_id = cg.user_id
      AND cg.status != 'deleted'
    JOIN content_group_members cgm
      ON cgm.content_group_id = cg.id
      AND cgm.user_id = pm.user_id
      AND cgm.kind = 'item'
    JOIN items i
      ON cgm.item_id = i.id
      AND cgm.user_id = i.user_id
      AND i.status = 'active'
    WHERE pm.user_id = ? AND pm.purpose_id = ?

    ORDER BY
      purpose_order_index ASC,
      path_rank ASC,
      content_group_order_index ASC,
      purpose_member_id ASC,
      item_id ASC
  `).all(userId, purposeId, userId, purposeId) as PurposeCompiledItemPathRow[];
}

export function getPurposeCompiledScope(
  db: Database.Database,
  userId: string,
  purposeId: string,
) {
  const purpose = getOwnedPurposeRow(db, userId, purposeId);
  const entries = new Map<string, {
    item: Record<string, unknown>;
    direct: boolean;
    derived: boolean;
    paths: Array<Record<string, unknown>>;
  }>();

  for (const row of listPurposeCompiledItemPathRows(db, userId, purposeId)) {
    let entry = entries.get(row.item_id);
    if (!entry) {
      entry = {
        item: {
          id: row.item_id,
          body_json: parseJson<Record<string, unknown>>(row.body_json, {}),
          plain_text: row.plain_text,
          item_type: row.item_type,
          topic: row.topic,
          status: row.item_status,
          retired_into_item_id: row.retired_into_item_id,
          origin_course_id: row.origin_course_id,
          origin_note_id: row.origin_note_id,
          created_by: row.item_created_by,
          metadata: parseJson<Record<string, unknown>>(row.item_metadata, {}),
          created_at: row.item_created_at,
          updated_at: row.item_updated_at,
        },
        direct: false,
        derived: false,
        paths: [],
      };
      entries.set(row.item_id, entry);
    }

    const direct = row.path_kind === 'direct';
    entry.direct ||= direct;
    entry.derived ||= !direct;
    entry.paths.push({
      kind: row.path_kind,
      purpose_member_id: row.purpose_member_id,
      role: row.role,
      fitness: row.fitness || 'unknown',
      order_index: row.purpose_order_index,
      content_group_id: row.content_group_id,
      content_group_title: row.content_group_title,
      content_group_member_id: row.content_group_member_id,
      content_group_order_index: row.content_group_order_index,
    });
  }

  const items = [...entries.values()].map((entry) => ({
    ...entry,
    membership_kind: entry.direct && entry.derived
      ? 'direct_and_derived'
      : entry.direct ? 'direct' : 'derived',
  }));

  return {
    purpose_id: purpose.id,
    note_id: purpose.note_id,
    project_id: purpose.course_id,
    items,
    total: items.length,
  };
}

export function searchPurposeItems(
  db: Database.Database,
  userId: string,
  purposeId: string,
  input: { query?: string; limit?: number } = {},
) {
  const scope = getPurposeCompiledScope(db, userId, purposeId);
  const query = optionalText(input.query)?.toLocaleLowerCase() || '';
  const terms = query.split(/\s+/).filter(Boolean);
  const matches = scope.items.filter((entry) => {
    if (terms.length === 0) return true;
    const item = entry.item as { plain_text?: unknown; item_type?: unknown; topic?: unknown };
    const haystack = [item.plain_text, item.item_type, item.topic]
      .filter((value): value is string => typeof value === 'string')
      .join('\n')
      .toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  const limit = Number.isInteger(input.limit)
    ? Math.min(200, Math.max(1, Number(input.limit)))
    : 50;
  return {
    ...scope,
    query,
    total: matches.length,
    items: matches.slice(0, limit),
  };
}
