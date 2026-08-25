import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';

export type ItemStatus = 'active' | 'retired';
export type ItemAnchorTargetKind =
  | 'block'
  | 'content_range'
  | 'canvas_object'
  | 'table_region'
  | 'image_region';
export type ItemCastFaultPoint = 'after_item_insert' | 'after_anchor_claim';

export interface CreateItemInput {
  body_json?: Record<string, unknown>;
  plain_text?: string;
  item_type?: string | null;
  topic?: string | null;
  origin_course_id?: string | null;
  origin_note_id?: string | null;
  created_by?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateItemInput {
  body_json?: Record<string, unknown>;
  plain_text?: string;
  item_type?: string | null;
  topic?: string | null;
  metadata?: Record<string, unknown>;
}

export interface RetireItemInput {
  successor_item_id?: string | null;
}

export interface CollectItemAnchorInput {
  pool_scope_kind: 'content_group';
  pool_scope_id: string;
  target_kind: ItemAnchorTargetKind;
  target_id: string;
  range_json?: Record<string, unknown> | null;
  excerpt: string;
  reference_mode?: string;
  source_record_id?: string | null;
  collected_for?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export interface CastItemInput extends CreateItemInput {
  anchor_ids: string[];
  claimed_by?: string;
}

export interface CastItemOptions {
  faultInjector?: (point: ItemCastFaultPoint) => void;
}

interface ItemRow {
  id: string;
  user_id: string;
  body_json: string;
  plain_text: string;
  item_type: string | null;
  topic: string | null;
  status: ItemStatus;
  retired_into_item_id: string | null;
  origin_course_id: string | null;
  origin_note_id: string | null;
  created_by: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export interface ItemSnapshotRow {
  id: string;
  item_id: string;
  user_id: string;
  content: string;
  content_hash: string;
  created_at: string;
}

interface ItemAnchorRow {
  id: string;
  user_id: string;
  item_id: string | null;
  pool_scope_kind: string | null;
  pool_scope_id: string | null;
  target_kind: ItemAnchorTargetKind;
  target_id: string;
  range_json: string | null;
  excerpt: string;
  reference_mode: string;
  source_record_id: string | null;
  collected_for: string | null;
  claimed_at: string | null;
  claimed_by: string | null;
  metadata: string;
  created_by: string;
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

function stringifyJson(value: unknown, fallback: Record<string, unknown> = {}): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return JSON.stringify(fallback);
  return JSON.stringify(value);
}

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function canonicalPlainText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\r\n?/g, '\n').trim();
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

import { validTextFlowUnits } from './textFlowUnits.js';

function textFlowProjection(
  body: Record<string, unknown>,
): string | null {
  const units = validTextFlowUnits(body);
  if (!units) return null;
  return canonicalPlainText(units.map((unit) => String(unit.text)).join('\n'));
}

function freshTextFlowBody(itemId: string, plainText: string): Record<string, unknown> {
  return {
    body: plainText,
    text_flow: {
      textflow_version: 'TextBlockContentV1',
      units: [{
        id: `${itemId}:text-unit:1`,
        text: plainText,
        writing_role: 'paragraph',
        indent_level: 0,
        order_index: 0,
        metadata: { owner_kind: 'item' },
        status: 'active',
      }],
      inline_structures: [],
      metadata: { owner_kind: 'item' },
    },
  };
}

function normalizeItemBody(
  itemId: string,
  input: { body_json?: Record<string, unknown>; plain_text?: string },
): { bodyJson: Record<string, unknown>; plainText: string } {
  const providedBody = recordValue(input.body_json);
  const providedPlain = canonicalPlainText(input.plain_text);
  const projected = providedBody
    ? textFlowProjection(providedBody) ?? canonicalPlainText(providedBody.body)
    : '';
  if (providedPlain && projected && providedPlain !== projected) {
    throw new AppError(400, 'Item body_json and plain_text must describe the same content');
  }
  const plainText = providedPlain || projected;
  if (!plainText) throw new AppError(400, 'Item content is required');

  if (providedBody && textFlowProjection(providedBody) === plainText) {
    return {
      bodyJson: { ...providedBody, body: plainText },
      plainText,
    };
  }
  return { bodyJson: freshTextFlowBody(itemId, plainText), plainText };
}

export function itemContentHash(plainText: string): string {
  return `sha256:${createHash('sha256').update(plainText).digest('hex')}`;
}

function ensureSnapshot(
  db: Database.Database,
  userId: string,
  itemId: string,
  plainText: string,
): ItemSnapshotRow {
  const hash = itemContentHash(plainText);
  db.prepare(`
    INSERT OR IGNORE INTO item_snapshots (
      id, item_id, user_id, content, content_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), itemId, userId, plainText, hash, new Date().toISOString());
  const row = db.prepare(`
    SELECT * FROM item_snapshots
    WHERE item_id = ? AND user_id = ? AND content_hash = ?
    LIMIT 1
  `).get(itemId, userId, hash) as ItemSnapshotRow | undefined;
  if (!row) throw new AppError(500, 'Item snapshot could not be created');
  return row;
}

function getCurrentSnapshot(
  db: Database.Database,
  userId: string,
  itemId: string,
  plainText: string,
): ItemSnapshotRow {
  const row = db.prepare(`
    SELECT * FROM item_snapshots
    WHERE item_id = ? AND user_id = ? AND content_hash = ?
    LIMIT 1
  `).get(itemId, userId, itemContentHash(plainText)) as ItemSnapshotRow | undefined;
  if (!row) throw new AppError(500, 'Item current Snapshot is missing');
  return row;
}

function getOwnedItemRow(db: Database.Database, userId: string, itemId: string): ItemRow {
  const row = db.prepare('SELECT * FROM items WHERE id = ? AND user_id = ?')
    .get(itemId, userId) as ItemRow | undefined;
  if (!row) throw new AppError(404, 'Item not found');
  return row;
}

export function ensureCurrentItemSnapshot(
  db: Database.Database,
  userId: string,
  itemId: string,
): ItemSnapshotRow {
  const row = getOwnedItemRow(db, userId, itemId);
  return ensureSnapshot(db, userId, itemId, row.plain_text);
}

function assertItemRowInvariant(row: ItemRow): void {
  if (row.status === 'active' && row.retired_into_item_id) {
    throw new AppError(500, 'Invalid Item lifecycle: active Item cannot have a successor');
  }
}

function hydrateAnchor(row: ItemAnchorRow) {
  return {
    ...row,
    range_json: parseJson<Record<string, unknown> | null>(row.range_json, null),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function listClaimedAnchorRows(
  db: Database.Database,
  userId: string,
  itemId: string,
): ItemAnchorRow[] {
  return db.prepare(`
    SELECT * FROM item_anchors
    WHERE user_id = ? AND item_id = ?
    ORDER BY claimed_at ASC, created_at ASC, id ASC
  `).all(userId, itemId) as ItemAnchorRow[];
}

function hydrateItem(db: Database.Database, row: ItemRow, includeAnchors = true) {
  assertItemRowInvariant(row);
  const snapshot = getCurrentSnapshot(db, row.user_id, row.id, row.plain_text);
  const anchors = includeAnchors ? listClaimedAnchorRows(db, row.user_id, row.id).map(hydrateAnchor) : [];
  return {
    ...row,
    body_json: parseJson<Record<string, unknown>>(row.body_json, {}),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    current_snapshot: snapshot,
    anchors,
  };
}

function resolveOrigins(
  db: Database.Database,
  userId: string,
  input: { origin_course_id?: string | null; origin_note_id?: string | null },
) {
  let courseId = optionalText(input.origin_course_id);
  const noteId = optionalText(input.origin_note_id);
  if (noteId) {
    const note = db.prepare('SELECT id, course_id FROM notes WHERE id = ? AND user_id = ?')
      .get(noteId, userId) as { id: string; course_id: string } | undefined;
    if (!note) throw new AppError(404, 'Origin note not found');
    if (courseId && note.course_id !== courseId) {
      throw new AppError(400, 'Origin note does not belong to origin project');
    }
    courseId = note.course_id;
  }
  if (courseId) {
    const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
    if (!course) throw new AppError(404, 'Origin project not found');
  }
  return { courseId, noteId };
}

function insertItem(
  db: Database.Database,
  userId: string,
  input: CreateItemInput,
  forcedOrigins?: { courseId: string | null; noteId: string | null },
): string {
  const id = uuidv4();
  const body = normalizeItemBody(id, input);
  const origins = forcedOrigins || resolveOrigins(db, userId, input);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO items (
      id, user_id, body_json, plain_text, item_type, topic, status,
      retired_into_item_id, origin_course_id, origin_note_id,
      created_by, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'active', NULL, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    JSON.stringify(body.bodyJson),
    body.plainText,
    optionalText(input.item_type),
    optionalText(input.topic),
    origins.courseId,
    origins.noteId,
    optionalText(input.created_by) || 'human',
    stringifyJson(input.metadata),
    now,
    now,
  );
  ensureSnapshot(db, userId, id, body.plainText);
  return id;
}

export function createItem(db: Database.Database, userId: string, input: CreateItemInput) {
  const itemId = db.transaction(() => insertItem(db, userId, input))();
  return getItem(db, userId, itemId);
}

export function getItem(db: Database.Database, userId: string, itemId: string) {
  return hydrateItem(db, getOwnedItemRow(db, userId, itemId));
}

export function listItems(
  db: Database.Database,
  userId: string,
  input: {
    status?: ItemStatus | 'all';
    origin_course_id?: string;
    origin_note_id?: string;
    q?: string;
    limit?: number;
  } = {},
) {
  const conditions = ['user_id = ?'];
  const params: unknown[] = [userId];
  if (input.status && input.status !== 'all') {
    conditions.push('status = ?');
    params.push(input.status);
  }
  if (input.origin_course_id) {
    conditions.push('origin_course_id = ?');
    params.push(input.origin_course_id);
  }
  if (input.origin_note_id) {
    conditions.push('origin_note_id = ?');
    params.push(input.origin_note_id);
  }
  const query = optionalText(input.q);
  if (query) {
    const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push(`(
      plain_text LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR COALESCE(item_type, '') LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR COALESCE(topic, '') LIKE ? ESCAPE '\\' COLLATE NOCASE
    )`);
    params.push(pattern, pattern, pattern);
  }
  const limit = Number.isInteger(input.limit)
    ? Math.min(200, Math.max(1, Number(input.limit)))
    : null;
  if (limit !== null) params.push(limit);
  const rows = db.prepare(`
    SELECT * FROM items
    WHERE ${conditions.join(' AND ')}
    ORDER BY updated_at DESC, created_at DESC, id ASC
    ${limit !== null ? 'LIMIT ?' : ''}
  `).all(...params) as ItemRow[];
  return rows.map((row) => hydrateItem(db, row, false));
}

export function updateItem(
  db: Database.Database,
  userId: string,
  itemId: string,
  input: UpdateItemInput,
) {
  db.transaction(() => {
    const row = getOwnedItemRow(db, userId, itemId);
    assertItemRowInvariant(row);
    if (row.status === 'retired') throw new AppError(409, 'A retired Item cannot be edited');
    const bodyChanged = input.body_json !== undefined || input.plain_text !== undefined;
    const body = bodyChanged
      ? normalizeItemBody(itemId, input)
      : {
          bodyJson: parseJson<Record<string, unknown>>(row.body_json, {}),
          plainText: row.plain_text,
        };
    const metadata = input.metadata === undefined
      ? parseJson<Record<string, unknown>>(row.metadata, {})
      : { ...parseJson<Record<string, unknown>>(row.metadata, {}), ...input.metadata };
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE items
      SET body_json = ?, plain_text = ?, item_type = ?, topic = ?, metadata = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      JSON.stringify(body.bodyJson),
      body.plainText,
      input.item_type === undefined ? row.item_type : optionalText(input.item_type),
      input.topic === undefined ? row.topic : optionalText(input.topic),
      JSON.stringify(metadata),
      now,
      itemId,
      userId,
    );
    ensureSnapshot(db, userId, itemId, body.plainText);
  })();
  return getItem(db, userId, itemId);
}

function assertValidSuccessor(
  db: Database.Database,
  userId: string,
  itemId: string,
  successorId: string,
) {
  if (itemId === successorId) throw new AppError(400, 'An Item cannot retire into itself');
  const directSuccessor = getOwnedItemRow(db, userId, successorId);
  if (directSuccessor.status !== 'active') {
    throw new AppError(400, 'Item successor must be an active Item');
  }

  const seen = new Set<string>();
  let cursor: ItemRow | null = directSuccessor;
  while (cursor) {
    if (cursor.id === itemId) throw new AppError(400, 'Item successor cycle detected');
    if (seen.has(cursor.id)) throw new AppError(409, 'Existing Item successor cycle detected');
    seen.add(cursor.id);
    cursor = cursor.retired_into_item_id
      ? getOwnedItemRow(db, userId, cursor.retired_into_item_id)
      : null;
  }
}

export function retireItem(
  db: Database.Database,
  userId: string,
  itemId: string,
  input: RetireItemInput,
) {
  db.transaction(() => {
    const row = getOwnedItemRow(db, userId, itemId);
    assertItemRowInvariant(row);
    if (row.status === 'retired') throw new AppError(409, 'Item is already retired');
    const successorId = optionalText(input.successor_item_id);
    if (successorId) assertValidSuccessor(db, userId, itemId, successorId);
    db.prepare(`
      UPDATE items
      SET status = 'retired', retired_into_item_id = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(successorId, new Date().toISOString(), itemId, userId);
  })();
  return getItem(db, userId, itemId);
}

function getOwnedContentGroup(
  db: Database.Database,
  userId: string,
  groupId: string,
) {
  const row = db.prepare(`
    SELECT id, course_id, note_id
    FROM content_groups
    WHERE id = ? AND user_id = ? AND status != 'deleted'
  `).get(groupId, userId) as { id: string; course_id: string; note_id: string | null } | undefined;
  if (!row) throw new AppError(404, 'Content group not found');
  return row;
}

function sourceRecordForBlock(db: Database.Database, userId: string, blockId: string): string | null {
  const row = db.prepare(`
    SELECT nbs.source_record_id
    FROM note_block_sources nbs
    JOIN note_blocks nb ON nb.id = nbs.block_id
    WHERE nbs.block_id = ? AND nb.user_id = ? AND nbs.source_record_id IS NOT NULL
    ORDER BY nbs.created_at DESC, nbs.id DESC
    LIMIT 1
  `).get(blockId, userId) as { source_record_id: string } | undefined;
  return row?.source_record_id || null;
}

function ensureOwnedBlock(db: Database.Database, userId: string, blockId: string): void {
  const row = db.prepare('SELECT id FROM note_blocks WHERE id = ? AND user_id = ?').get(blockId, userId);
  if (!row) throw new AppError(404, 'Block not found');
}

function ensureOwnedCanvasObject(db: Database.Database, userId: string, objectId: string): void {
  const row = db.prepare('SELECT id FROM canvas_objects WHERE id = ? AND user_id = ?').get(objectId, userId);
  if (!row) throw new AppError(404, 'Canvas object not found');
}

function targetBlockId(input: CollectItemAnchorInput): string | null {
  if (input.target_kind === 'block') return input.target_id;
  if (input.target_kind !== 'content_range') return null;
  return optionalText(input.range_json?.block_id);
}

function verifyAnchorTarget(db: Database.Database, userId: string, input: CollectItemAnchorInput) {
  const blockId = targetBlockId(input);
  if (input.target_kind === 'content_range' && !blockId) {
    throw new AppError(400, 'Content range anchors require range_json.block_id');
  }
  if (blockId) {
    ensureOwnedBlock(db, userId, blockId);
    return { blockId, sourceRecordId: sourceRecordForBlock(db, userId, blockId) };
  }
  const objectId = optionalText(input.range_json?.canvas_object_id) || input.target_id;
  ensureOwnedCanvasObject(db, userId, objectId);
  return { blockId: null, sourceRecordId: null };
}

function resolveAnchorSourceRecord(
  db: Database.Database,
  userId: string,
  explicitId: string | null,
  derivedId: string | null,
): string | null {
  if (explicitId && derivedId && explicitId !== derivedId) {
    throw new AppError(400, 'Anchor Source does not match the target receipt');
  }
  const sourceRecordId = derivedId || explicitId;
  if (!sourceRecordId) return null;
  const row = db.prepare('SELECT id FROM source_records WHERE id = ? AND user_id = ?')
    .get(sourceRecordId, userId);
  if (!row) throw new AppError(404, 'Source record not found');
  return sourceRecordId;
}

export function collectItemAnchor(
  db: Database.Database,
  userId: string,
  input: CollectItemAnchorInput,
) {
  if (input.pool_scope_kind !== 'content_group') {
    throw new AppError(400, 'Only content_group Item pools are supported in this version');
  }
  getOwnedContentGroup(db, userId, input.pool_scope_id);
  const target = verifyAnchorTarget(db, userId, input);
  const sourceRecordId = resolveAnchorSourceRecord(
    db,
    userId,
    optionalText(input.source_record_id),
    target.sourceRecordId,
  );
  const excerpt = canonicalPlainText(input.excerpt);
  if (!excerpt) throw new AppError(400, 'Anchor excerpt is required');
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO item_anchors (
      id, user_id, item_id, pool_scope_kind, pool_scope_id,
      target_kind, target_id, range_json, excerpt, reference_mode,
      source_record_id, collected_for, claimed_at, claimed_by,
      metadata, created_by, created_at, updated_at
    ) VALUES (
      ?, ?, NULL, 'content_group', ?,
      ?, ?, ?, ?, ?,
      ?, ?, NULL, NULL,
      ?, ?, ?, ?
    )
  `).run(
    id,
    userId,
    input.pool_scope_id,
    input.target_kind,
    input.target_id,
    input.range_json ? JSON.stringify(input.range_json) : null,
    excerpt,
    optionalText(input.reference_mode) || 'quote',
    sourceRecordId,
    optionalText(input.collected_for),
    stringifyJson(input.metadata),
    optionalText(input.created_by) || 'human',
    now,
    now,
  );
  const row = db.prepare('SELECT * FROM item_anchors WHERE id = ? AND user_id = ?')
    .get(id, userId) as ItemAnchorRow;
  return hydrateAnchor(row);
}

export function listPoolItemAnchors(
  db: Database.Database,
  userId: string,
  poolScopeKind: 'content_group',
  poolScopeId: string,
) {
  if (poolScopeKind !== 'content_group') {
    throw new AppError(400, 'Only content_group Item pools are supported in this version');
  }
  getOwnedContentGroup(db, userId, poolScopeId);
  const rows = db.prepare(`
    SELECT * FROM item_anchors
    WHERE user_id = ?
      AND item_id IS NULL
      AND pool_scope_kind = ?
      AND pool_scope_id = ?
    ORDER BY updated_at DESC, created_at DESC, id ASC
  `).all(userId, poolScopeKind, poolScopeId) as ItemAnchorRow[];
  return rows.map(hydrateAnchor);
}

export function discardPoolItemAnchor(
  db: Database.Database,
  userId: string,
  anchorId: string,
) {
  const row = db.prepare('SELECT * FROM item_anchors WHERE id = ? AND user_id = ?')
    .get(anchorId, userId) as ItemAnchorRow | undefined;
  if (!row) throw new AppError(404, 'Anchor not found');
  if (row.item_id) throw new AppError(409, 'Claimed Item Anchors cannot be discarded');
  db.prepare('DELETE FROM item_anchors WHERE id = ? AND user_id = ? AND item_id IS NULL')
    .run(anchorId, userId);
  return { deleted: true, id: anchorId };
}

export function castItem(
  db: Database.Database,
  userId: string,
  input: CastItemInput,
  options: CastItemOptions = {},
) {
  const anchorIds = [...new Set(input.anchor_ids.map((id) => optionalText(id)).filter((id): id is string => Boolean(id)))];
  if (anchorIds.length === 0) throw new AppError(400, 'At least one pool Anchor is required');

  const itemId = db.transaction(() => {
    const anchors = anchorIds.map((anchorId) => {
      const row = db.prepare(`
        SELECT * FROM item_anchors
        WHERE id = ? AND user_id = ? AND item_id IS NULL
      `).get(anchorId, userId) as ItemAnchorRow | undefined;
      if (!row) throw new AppError(404, 'Anchor not found or already claimed');
      return row;
    });
    const first = anchors[0]!;
    if (anchors.some((anchor) => (
      anchor.pool_scope_kind !== first.pool_scope_kind
      || anchor.pool_scope_id !== first.pool_scope_id
    ))) {
      throw new AppError(400, 'Fusion cast Anchors must come from the same pool');
    }
    if (first.pool_scope_kind !== 'content_group' || !first.pool_scope_id) {
      throw new AppError(400, 'Only content_group Item pools are supported in this version');
    }
    const group = getOwnedContentGroup(db, userId, first.pool_scope_id);
    const origins = resolveOrigins(db, userId, {
      origin_course_id: input.origin_course_id ?? group.course_id,
      origin_note_id: input.origin_note_id ?? group.note_id,
    });
    const nextItemId = insertItem(db, userId, input, origins);
    options.faultInjector?.('after_item_insert');

    const now = new Date().toISOString();
    for (const anchor of anchors) {
      const result = db.prepare(`
        UPDATE item_anchors
        SET item_id = ?, pool_scope_kind = NULL, pool_scope_id = NULL,
            claimed_at = ?, claimed_by = ?, updated_at = ?
        WHERE id = ? AND user_id = ? AND item_id IS NULL
      `).run(
        nextItemId,
        now,
        optionalText(input.claimed_by) || 'human',
        now,
        anchor.id,
        userId,
      );
      if (result.changes !== 1) throw new AppError(409, 'Anchor claim conflict');
    }
    options.faultInjector?.('after_anchor_claim');
    return nextItemId;
  })();

  return getItem(db, userId, itemId);
}
