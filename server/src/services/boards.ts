import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { sliceGraphemes } from './graphemes.js';
import {
  boardFreehandDataSchema,
  boardStickyDataSchema,
  createBoardSchema,
  updateBoardSchema,
  mountBoardMemberSchema,
  updateBoardMemberSchema,
  createBoardEdgeSchema,
  updateBoardEdgeSchema,
  createBoardVisualSchema,
  updateBoardVisualSchema,
  createBoardStickySchema,
  updateBoardStickySchema,
  type BoardEdgeEndpoint,
  createBoardLayerSchema,
  updateBoardLayerSchema,
  reorderBoardLayersSchema,
  BOARD_LAYER_LIMIT,
  type BoardVisualKind,
} from '../validators/boards.js';
import { createPurpose, getPurpose } from './purposes.js';
import { createBoardTextRange, getBoardTextRange, replayBoardTextRange } from './boardTextRanges.js';
import { mountBoardTextRangeSchema } from '../validators/boardTextRanges.js';
import { createBoardIdentityItem, createItem } from './items.js';
import { parseStoredSkin, serializeSkin } from './skin.js';
import { boardEdgeEndpoints, routeBoardEdge } from './boardVisualGeometry.js';

export type BoardMemberKind = 'note' | 'item' | 'content_group' | 'text_range';
type JsonObject = Record<string, unknown>;

interface BoardRow {
  skin?: string | null;
  id: string;
  user_id: string;
  title: string;
  soul_id: string;
  project_id: string | null;
  item_id: string | null;
  viewport: string;
  created_at: string;
  updated_at: string;
}

interface GeometryRow {
  layer_id: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
  z_index: number;
  pinned: number;
}

interface BoardMemberRow extends GeometryRow {
  id: string;
  board_id: string;
  member_kind: BoardMemberKind;
  member_id: string;
  placed: number;
  mounted_actor: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

interface BoardEdgeRow {
  id: string;
  board_id: string;
  from_member_id: string | null;
  to_member_id: string | null;
  from_sticky_id: string | null;
  to_sticky_id: string | null;
  from_x: number | null;
  from_y: number | null;
  to_x: number | null;
  to_y: number | null;
  from_anchor: 'auto' | 'n' | 'e' | 's' | 'w';
  to_anchor: 'auto' | 'n' | 'e' | 's' | 'w';
  bend: number;
  dash: 'solid' | 'dashed';
  weight: 1 | 2 | 3;
  cap_start: 'none' | 'arrow' | 'dot';
  cap_end: 'none' | 'arrow' | 'dot';
  color_index: 1 | null;
  label_position: number;
  visual_version: 0 | 1;
  style: string;
  label: string | null;
  created_at: string;
}

interface BoardStickyRow {
  placed: number; mounted_actor: string;
  id: string; board_id: string; text: string;
  x: number; y: number; w: 240 | 416; h: number;
  color_index: 1 | null; weight: 1 | 2 | 3;
  layer_id: string | null; z_index: number; pinned: number;
  created_at: string; updated_at: string;
}

interface BoardLayerRow {
  id: string;
  board_id: string;
  user_id: string;
  name: string;
  order_index: number;
  visible: number;
}

interface BoardVisualRow extends GeometryRow {
  id: string;
  board_id: string;
  visual_kind: BoardVisualKind;
  rotation: number;
  data: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export interface BoardMemberReference {
  kind: BoardMemberKind;
  id: string;
  state: 'available' | 'unavailable' | 'missing';
  reason: string | null;
  title: string | null;
  note_id: string | null;
  summary?: string;
  plain_text?: string;
  item_type?: string | null;
  topic?: string | null;
  item_status?: 'active' | 'retired' | 'missing';
  origin_board_id?: string | null;
  origin_board_title?: string | null;
  block_id?: string;
  start_offset?: number | null;
  end_offset?: number | null;
  anchor_status?: 'active' | 'drifted' | 'lost';
}

function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new AppError(400, 'invalid_board_input', result.error.flatten());
  return result.data;
}

function json<T>(value: string): T {
  return JSON.parse(value) as T;
}

function requireTransaction(db: Database.Database): void {
  if (!db.inTransaction) throw new Error('Board writes require a caller-owned transaction');
}

function boardRow(db: Database.Database, userId: string, boardId: string): BoardRow {
  const row = db.prepare('SELECT * FROM boards WHERE id = ? AND user_id = ?')
    .get(boardId, userId) as BoardRow | undefined;
  if (!row) throw new AppError(404, 'board_not_found');
  return row;
}

function memberRow(db: Database.Database, boardId: string, memberId: string): BoardMemberRow | undefined {
  return db.prepare('SELECT * FROM board_members WHERE id = ? AND board_id = ?')
    .get(memberId, boardId) as BoardMemberRow | undefined;
}

function hydrateBoard(db: Database.Database, row: BoardRow) {
  const { base_layer_visible = true, ...viewport } = json<{
    x: number; y: number; zoom: number; base_layer_visible?: boolean;
  }>(row.viewport);
  const { item_id, ...board } = row;
  const identity = item_id
    ? db.prepare('SELECT plain_text FROM items WHERE id = ? AND user_id = ?')
      .get(item_id, row.user_id) as { plain_text: string } | undefined
    : undefined;
  return { ...board, skin: parseStoredSkin(row.skin), viewport, base_layer_visible,
    identity_item_id: item_id, identity_description: identity?.plain_text ?? null };
}

function hydrateLayer(row: BoardLayerRow) {
  return { ...row, visible: row.visible === 1 };
}

function layerRow(db: Database.Database, userId: string, boardId: string, layerId: string): BoardLayerRow {
  const row = db.prepare('SELECT * FROM board_layers WHERE id = ? AND board_id = ? AND user_id = ?')
    .get(layerId, boardId, userId) as BoardLayerRow | undefined;
  if (!row) throw new AppError(404, 'board_layer_not_found');
  return row;
}

function validateLayer(db: Database.Database, userId: string, boardId: string, layerId?: string | null): void {
  if (layerId != null) layerRow(db, userId, boardId, layerId);
}

function hydrateEdge(row: BoardEdgeRow) {
  return { ...row, style: json<JsonObject>(row.style), from: edgeEndpoint(row, 'from'), to: edgeEndpoint(row, 'to') };
}

function edgeEndpoint(row: BoardEdgeRow, end: 'from' | 'to'): BoardEdgeEndpoint {
  const member = row[`${end}_member_id`];
  const sticky = row[`${end}_sticky_id`];
  if (member != null) return { kind: 'member', id: member, anchor: row[`${end}_anchor`] };
  if (sticky != null) return { kind: 'sticky', id: sticky, anchor: row[`${end}_anchor`] };
  return { kind: 'point', x: row[`${end}_x`]!, y: row[`${end}_y`]! };
}

function hydrateSticky(row: BoardStickyRow) {
  return { ...row, placed: row.placed !== 0, scale: 1 as const, pinned: row.pinned === 1 };
}

function hydrateVisual(row: BoardVisualRow) {
  return { ...row, pinned: row.pinned === 1, data: json<JsonObject>(row.data), metadata: json<JsonObject>(row.metadata) };
}

function touchBoard(db: Database.Database, boardId: string): void {
  db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), boardId);
}

/** Resolve identity on reads. Missing/trash preserves projection geometry; restore revives it.
 * Text ranges retain an owned recovery excerpt. No content deletion is an implicit unmount.
 */
export function resolveBoardMember(
  db: Database.Database,
  userId: string,
  kind: BoardMemberKind,
  id: string,
): BoardMemberReference {
  const base = { kind, id, title: null, note_id: null };
  if (kind === 'text_range') {
    const range = getBoardTextRange(db, userId, id);
    if (!range) return { ...base, state: 'missing', reason: 'reference_missing', anchor_status: 'lost' };
    const replay = replayBoardTextRange(db, userId, range);
    return { ...base, title: replay.title, note_id: range.note_id, block_id: range.block_id,
      start_offset: range.start_offset, end_offset: range.end_offset,
      summary: replay.text, anchor_status: replay.status, reason: replay.reason,
      state: replay.status === 'active' ? 'available' : 'unavailable' };
  }
  if (kind === 'note') {
    const row = db.prepare('SELECT id, title, status, note_class, source_kind FROM notes WHERE id = ? AND user_id = ?')
      .get(id, userId) as { id: string; title: string; status: string; note_class: string; source_kind: string } | undefined;
    if (!row) return { ...base, state: 'missing', reason: 'reference_missing' };
    if (row.note_class === 'system' || row.source_kind === 'canvas_backing') {
      return { ...base, state: 'unavailable', reason: 'system_note' };
    }
    if (row.status !== 'active') return { ...base, state: 'unavailable', reason: 'note_inactive' };
    return { ...base, title: row.title, note_id: row.id, state: 'available', reason: null };
  }
  if (kind === 'item') {
    const row = db.prepare(`SELECT i.plain_text, i.item_type, i.topic, i.origin_note_id, i.status,
      i.origin_board_id, b.title AS origin_board_title
      FROM items i LEFT JOIN boards b ON b.id = i.origin_board_id AND b.user_id = i.user_id
      WHERE i.id = ? AND i.user_id = ?`)
      .get(id, userId) as {
        plain_text: string; item_type: string | null; topic: string | null;
        origin_note_id: string | null; status: 'active' | 'retired';
        origin_board_id: string | null; origin_board_title: string | null;
      } | undefined;
    if (!row) return { ...base, state: 'missing', reason: 'reference_missing', item_status: 'missing' };
    return { ...base, plain_text: row.plain_text, summary: sliceGraphemes(row.plain_text.replace(/\s+/g, ' ').trim(), 0, 240),
      item_type: row.item_type, topic: row.topic, note_id: row.origin_note_id, item_status: row.status,
      origin_board_id: row.origin_board_id, origin_board_title: row.origin_board_title,
      state: row.status === 'active' ? 'available' : 'unavailable',
      reason: row.status === 'active' ? null : 'item_retired' };
  }
  const row = db.prepare(`
    SELECT cg.title, cg.status, cg.note_id, n.id AS note_exists, n.status AS note_status,
      n.note_class, n.source_kind
    FROM content_groups cg
    LEFT JOIN notes n ON n.id = cg.note_id AND n.user_id = cg.user_id
    WHERE cg.id = ? AND cg.user_id = ?
  `).get(id, userId) as {
    title: string; status: string; note_id: string | null; note_exists: string | null;
    note_status: string | null; note_class: string | null; source_kind: string | null;
  } | undefined;
  if (!row) return { ...base, state: 'missing', reason: 'reference_missing' };
  if (row.status !== 'active') return { ...base, state: 'unavailable', reason: 'content_group_inactive' };
  if (row.note_id && (!row.note_exists || row.note_status !== 'active'
    || row.note_class === 'system' || row.source_kind === 'canvas_backing')) {
    return { ...base, state: 'unavailable', reason: 'content_group_note_unavailable' };
  }
  return { ...base, title: row.title, note_id: row.note_id, state: 'available', reason: null };
}

function hydrateMember(db: Database.Database, userId: string, row: BoardMemberRow) {
  return { ...row, placed: row.placed === 1, pinned: row.pinned === 1, metadata: json<JsonObject>(row.metadata),
    reference: resolveBoardMember(db, userId, row.member_kind, row.member_id) };
}

export type Board = ReturnType<typeof hydrateBoard>;
export type BoardMember = ReturnType<typeof hydrateMember>;
export type BoardEdge = ReturnType<typeof hydrateEdge>;
export type BoardVisual = ReturnType<typeof hydrateVisual>;
export type BoardLayer = ReturnType<typeof hydrateLayer>;
export type BoardSticky = ReturnType<typeof hydrateSticky>;

export function listBoardLayers(db: Database.Database, userId: string, boardId: string): BoardLayer[] {
  boardRow(db, userId, boardId);
  return (db.prepare('SELECT * FROM board_layers WHERE board_id = ? AND user_id = ? ORDER BY order_index, id')
    .all(boardId, userId) as BoardLayerRow[]).map(hydrateLayer);
}

export function createBoardLayer(db: Database.Database, userId: string, boardId: string, value: unknown): BoardLayer {
  requireTransaction(db);
  const input = parse(createBoardLayerSchema, value);
  const layers = listBoardLayers(db, userId, boardId);
  if (layers.length >= BOARD_LAYER_LIMIT - 1) throw new AppError(409, 'board_layer_limit_reached');
  const id = uuidv4();
  const order = layers.length ? layers[layers.length - 1].order_index + 1 : 0;
  db.prepare('INSERT INTO board_layers (id, board_id, user_id, name, order_index) VALUES (?, ?, ?, ?, ?)')
    .run(id, boardId, userId, input.name, order);
  touchBoard(db, boardId);
  return hydrateLayer(layerRow(db, userId, boardId, id));
}

export function updateBoardLayer(db: Database.Database, userId: string, boardId: string, layerId: string, value: unknown): BoardLayer {
  requireTransaction(db);
  const input = parse(updateBoardLayerSchema, value);
  boardRow(db, userId, boardId);
  const layer = layerRow(db, userId, boardId, layerId);
  db.prepare('UPDATE board_layers SET name = ?, visible = ? WHERE id = ? AND board_id = ? AND user_id = ?')
    .run(input.name ?? layer.name, input.visible === undefined ? layer.visible : Number(input.visible), layerId, boardId, userId);
  touchBoard(db, boardId);
  return hydrateLayer(layerRow(db, userId, boardId, layerId));
}

export function reorderBoardLayers(db: Database.Database, userId: string, boardId: string, value: unknown): BoardLayer[] {
  requireTransaction(db);
  const input = parse(reorderBoardLayersSchema, value);
  const layers = listBoardLayers(db, userId, boardId);
  const currentIds = new Set(layers.map((layer) => layer.id));
  if (input.layer_ids.length !== currentIds.size || new Set(input.layer_ids).size !== currentIds.size
    || input.layer_ids.some((id) => !currentIds.has(id))) {
    throw new AppError(400, 'board_layer_order_must_include_all_layers');
  }
  const update = db.prepare('UPDATE board_layers SET order_index = ? WHERE id = ? AND board_id = ? AND user_id = ?');
  input.layer_ids.forEach((id, index) => update.run(index, id, boardId, userId));
  touchBoard(db, boardId);
  return listBoardLayers(db, userId, boardId);
}

export function deleteBoardLayer(db: Database.Database, userId: string, boardId: string, layerId: string) {
  requireTransaction(db);
  boardRow(db, userId, boardId);
  layerRow(db, userId, boardId, layerId);
  const now = new Date().toISOString();
  const members = db.prepare('UPDATE board_members SET layer_id = NULL, updated_at = ? WHERE board_id = ? AND layer_id = ?')
    .run(now, boardId, layerId).changes;
  const visuals = db.prepare('UPDATE board_visuals SET layer_id = NULL, updated_at = ? WHERE board_id = ? AND layer_id = ?')
    .run(now, boardId, layerId).changes;
  const stickies = db.prepare('UPDATE board_stickies SET layer_id = NULL, updated_at = ? WHERE board_id = ? AND layer_id = ?')
    .run(now, boardId, layerId).changes;
  db.prepare('DELETE FROM board_layers WHERE id = ? AND board_id = ? AND user_id = ?').run(layerId, boardId, userId);
  touchBoard(db, boardId);
  return { removed: true, moved_count: members + visuals + stickies };
}

export function createBoard(db: Database.Database, userId: string, value: unknown) {
  requireTransaction(db);
  const input = parse(createBoardSchema, value);
  if (input.project_id && !db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(input.project_id, userId)) {
    throw new AppError(404, 'project_not_found');
  }
  const purposeCreated = input.purpose ? createPurpose(db, userId, input.purpose) : null;
  const soul = purposeCreated ?? getPurpose(db, userId, input.soul_id!);
  if (db.prepare('SELECT id FROM boards WHERE soul_id = ?').get(soul.id)) {
    throw new AppError(409, 'purpose_already_has_board');
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO boards (id, user_id, title, soul_id, project_id, viewport, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, userId, input.title, soul.id, input.project_id ?? null,
    JSON.stringify(input.viewport ?? { x: 0, y: 0, zoom: 1 }), now, now);
  createBoardIdentityItem(db, userId, id);
  return { board: hydrateBoard(db, boardRow(db, userId, id)), purposeCreated };
}

export function listBoards(db: Database.Database, userId: string, input: { project_id?: string } = {}): Board[] {
  const rows = input.project_id === undefined
    ? db.prepare('SELECT * FROM boards WHERE user_id = ? ORDER BY updated_at DESC, id ASC').all(userId)
    : db.prepare('SELECT * FROM boards WHERE user_id = ? AND project_id = ? ORDER BY updated_at DESC, id ASC').all(userId, input.project_id);
  return (rows as BoardRow[]).map((row) => hydrateBoard(db, row));
}

export function getBoard(db: Database.Database, userId: string, boardId: string) {
  const board = hydrateBoard(db, boardRow(db, userId, boardId));
  const members = (db.prepare('SELECT * FROM board_members WHERE board_id = ? ORDER BY z_index, created_at, id')
    .all(boardId) as BoardMemberRow[]).map((row) => hydrateMember(db, userId, row));
  const edges = (db.prepare('SELECT * FROM board_edges WHERE board_id = ? ORDER BY created_at, id')
    .all(boardId) as BoardEdgeRow[]).map(hydrateEdge);
  const visuals = (db.prepare('SELECT * FROM board_visuals WHERE board_id = ? ORDER BY z_index, created_at, id')
    .all(boardId) as BoardVisualRow[]).map(hydrateVisual);
  const stickies = (db.prepare('SELECT * FROM board_stickies WHERE board_id = ? ORDER BY z_index, created_at, id')
    .all(boardId) as BoardStickyRow[]).map(hydrateSticky);
  return { board, members, edges, visuals, stickies, layers: listBoardLayers(db, userId, boardId) };
}

export function updateBoard(db: Database.Database, userId: string, boardId: string, value: unknown): Board {
  requireTransaction(db);
  const input = parse(updateBoardSchema, value);
  const row = boardRow(db, userId, boardId);
  // Keep virtual Base visibility when a pan/zoom patch replaces geometry.
  const viewport = { ...json<JsonObject>(row.viewport), ...input.viewport,
    ...(input.base_layer_visible === undefined ? {} : { base_layer_visible: input.base_layer_visible }) };
  db.prepare('UPDATE boards SET title = ?, viewport = ?, updated_at = ? WHERE id = ?')
    .run(input.title ?? row.title, JSON.stringify(viewport), new Date().toISOString(), boardId);
  // The existing caller-owned transaction and board queue serialize this property
  // with geometry. Omitted skin never rewinds a newer appearance selection.
  if (input.skin !== undefined) db.prepare('UPDATE boards SET skin = ? WHERE id = ?')
    .run(serializeSkin(input.skin), boardId);
  // A3: the title is board truth; identity content and its judgment Snapshots never follow it.
  return hydrateBoard(db, boardRow(db, userId, boardId));
}

export function deleteBoard(db: Database.Database, userId: string, boardId: string) {
  requireTransaction(db);
  const board = hydrateBoard(db, boardRow(db, userId, boardId));
  const counts = db.prepare(`SELECT
    (SELECT COUNT(*) FROM board_members WHERE board_id = ?) AS member_count,
    (SELECT COUNT(*) FROM board_edges WHERE board_id = ?) AS edge_count,
    (SELECT COUNT(*) FROM board_visuals WHERE board_id = ?) AS visual_count,
    (SELECT COUNT(*) FROM board_stickies WHERE board_id = ?) AS sticky_count
  `).get(boardId, boardId, boardId, boardId) as { member_count: number; edge_count: number; visual_count: number; sticky_count: number };
  // Capture impact before removing endpoints. Only the board's owned rows go;
  // the soul, referenced content and historical relocation batches survive.
  // The identity retires in this same transaction. Keep all Item and Relation history.
  if (board.identity_item_id) {
    db.prepare(`UPDATE items SET status = 'retired', retired_into_item_id = NULL, updated_at = ?
      WHERE id = ? AND user_id = ?`).run(new Date().toISOString(), board.identity_item_id, userId);
  }
  db.prepare('DELETE FROM board_edges WHERE board_id = ?').run(boardId);
  db.prepare('DELETE FROM board_members WHERE board_id = ?').run(boardId);
  db.prepare('DELETE FROM board_text_ranges WHERE board_id = ?').run(boardId);
  db.prepare('DELETE FROM board_visuals WHERE board_id = ?').run(boardId);
  db.prepare('DELETE FROM boards WHERE id = ? AND user_id = ?').run(boardId, userId);
  return { removed: true, board, ...counts };
}

function validateBoardRangeMount(db: Database.Database, userId: string, boardId: string, kind: BoardMemberKind, id: string): void {
  if (kind !== 'text_range') return;
  const range = getBoardTextRange(db, userId, id);
  if (!range || range.board_id !== boardId) throw new AppError(404, 'board_text_range_not_found');
  if (db.prepare("SELECT id FROM board_members WHERE member_kind = 'text_range' AND member_id = ?").get(id)) {
    throw new AppError(409, 'board_text_range_already_mounted');
  }
}

export function mountBoardMember(db: Database.Database, userId: string, boardId: string, value: unknown, actor: 'human' | 'agent' = 'human') {
  requireTransaction(db);
  const input = parse(mountBoardMemberSchema, value);
  boardRow(db, userId, boardId);
  if (input.id) {
    const existing = memberRow(db, boardId, input.id);
    if (existing) {
      if (existing.member_kind !== input.member_kind || existing.member_id !== input.member_id) {
        throw new AppError(409, 'board_member_identity_conflict');
      }
      // Mount retries return saved geometry; only the geometry endpoint changes placement.
      return { member: hydrateMember(db, userId, existing), created: false };
    }
    if (db.prepare('SELECT id FROM board_members WHERE id = ?').get(input.id)) {
      throw new AppError(409, 'board_member_id_conflict');
    }
  }
  validateLayer(db, userId, boardId, input.layer_id);
  validateBoardRangeMount(db, userId, boardId, input.member_kind, input.member_id);
  const reference = resolveBoardMember(db, userId, input.member_kind, input.member_id);
  if (reference.state !== 'available') {
    throw new AppError(reference.state === 'missing' ? 404 : 409, 'board_member_reference_unavailable', { reason: reference.reason });
  }
  const id = input.id ?? uuidv4();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO board_members
    (id, board_id, member_kind, member_id, x, y, w, h, scale, z_index, pinned, placed, layer_id, mounted_actor, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, boardId, input.member_kind, input.member_id, input.x ?? 0, input.y ?? 0,
      input.w ?? 0, input.h ?? 0, input.scale ?? 1, input.z_index ?? 0, input.pinned ? 1 : 0,
      input.placed === false ? 0 : 1, input.layer_id ?? null, actor,
      JSON.stringify(input.metadata ?? {}), now, now);
  touchBoard(db, boardId);
  return { member: hydrateMember(db, userId, memberRow(db, boardId, id)!), created: true };
}

/** Paste owns one new anchor per board placement, atomically with its mount. */
export function mountBoardTextRange(db: Database.Database, userId: string, boardId: string, value: unknown) {
  requireTransaction(db);
  const { text_range, ...geometry } = parse(mountBoardTextRangeSchema, value);
  const range = createBoardTextRange(db, userId, boardId, text_range);
  return mountBoardMember(db, userId, boardId, { ...geometry, member_kind: 'text_range', member_id: range.id });
}

export function updateBoardMember(db: Database.Database, userId: string, boardId: string, memberId: string, value: unknown): BoardMember {
  requireTransaction(db);
  const input = parse(updateBoardMemberSchema, value);
  boardRow(db, userId, boardId);
  const row = memberRow(db, boardId, memberId);
  if (!row) throw new AppError(404, 'board_member_not_found');
  validateLayer(db, userId, boardId, input.layer_id);
  db.prepare(`UPDATE board_members SET x = ?, y = ?, w = ?, h = ?, scale = ?, z_index = ?, pinned = ?, placed = ?, layer_id = ?, updated_at = ?
    WHERE id = ? AND board_id = ?`).run(input.x ?? row.x, input.y ?? row.y, input.w ?? row.w,
    input.h ?? row.h, input.scale ?? row.scale, input.z_index ?? row.z_index,
    input.pinned === undefined ? row.pinned : Number(input.pinned),
    input.placed === undefined ? row.placed : Number(input.placed),
    input.layer_id === undefined ? row.layer_id : input.layer_id, new Date().toISOString(), memberId, boardId);
  touchBoard(db, boardId);
  return hydrateMember(db, userId, memberRow(db, boardId, memberId)!);
}

export function unmountBoardMember(db: Database.Database, userId: string, boardId: string, memberId: string) {
  requireTransaction(db);
  boardRow(db, userId, boardId);
  const row = memberRow(db, boardId, memberId);
  if (!row) return { member: null, removed: false };
  const member = hydrateMember(db, userId, row);
  // Endpoint FKs remove board edges; neither the content nor purpose_members is touched.
  db.prepare('DELETE FROM board_members WHERE id = ? AND board_id = ?').run(memberId, boardId);
  if (row.member_kind === 'text_range') {
    db.prepare('DELETE FROM board_text_ranges WHERE id = ? AND board_id = ? AND user_id = ?')
      .run(row.member_id, boardId, userId);
  }
  touchBoard(db, boardId);
  return { member, removed: true };
}

function stickyRow(db: Database.Database, boardId: string, stickyId: string): BoardStickyRow | undefined {
  return db.prepare('SELECT * FROM board_stickies WHERE id = ? AND board_id = ?')
    .get(stickyId, boardId) as BoardStickyRow | undefined;
}

function endpointGeometry(db: Database.Database, boardId: string, endpoint: BoardEdgeEndpoint) {
  if (endpoint.kind === 'point') return { x: endpoint.x, y: endpoint.y };
  const card = endpoint.kind === 'member'
    ? memberRow(db, boardId, endpoint.id) : stickyRow(db, boardId, endpoint.id);
  if (!card) throw new AppError(404, `board_edge_${endpoint.kind}_not_found`);
  const scale = 'scale' in card ? card.scale : 1;
  return { x: card.x, y: card.y, w: card.w * scale, h: card.h * scale, radius: 8 * scale };
}

function routedBend(db: Database.Database, boardId: string, from: BoardEdgeEndpoint, to: BoardEdgeEndpoint,
  capStart: BoardEdgeRow['cap_start'], capEnd: BoardEdgeRow['cap_end']): number {
  const endpoints = boardEdgeEndpoints(endpointGeometry(db, boardId, from), endpointGeometry(db, boardId, to), {
    fromAnchor: from.kind === 'point' ? 'auto' : from.anchor,
    toAnchor: to.kind === 'point' ? 'auto' : to.anchor, capStart, capEnd,
  });
  const hiddenLayers = new Set((db.prepare('SELECT id FROM board_layers WHERE board_id = ? AND visible = 0')
    .all(boardId) as Array<{ id: string }>).map((layer) => layer.id));
  const viewport = json<{ base_layer_visible?: boolean }>((db.prepare('SELECT viewport FROM boards WHERE id = ?')
    .get(boardId) as { viewport: string }).viewport);
  const obstacles = [
    ...(db.prepare('SELECT * FROM board_members WHERE board_id = ? AND placed = 1').all(boardId) as BoardMemberRow[])
      .map((card) => ({ ...card, kind: 'member', w: card.w * card.scale, h: card.h * card.scale })),
    ...(db.prepare('SELECT * FROM board_stickies WHERE board_id = ? AND placed = 1').all(boardId) as BoardStickyRow[])
      .map((card) => ({ ...card, kind: 'sticky' })),
  ].filter((card) => (card.layer_id == null ? viewport.base_layer_visible !== false : !hiddenLayers.has(card.layer_id))
    && ![from, to].some((endpoint) => endpoint.kind !== 'point' && endpoint.kind === card.kind && endpoint.id === card.id))
    .map(({ x, y, w, h }) => ({ x, y, w, h }));
  return routeBoardEdge(endpoints.start, endpoints.end, obstacles);
}

function endpointColumns(endpoint: BoardEdgeEndpoint) {
  return [endpoint.kind === 'member' ? endpoint.id : null, endpoint.kind === 'sticky' ? endpoint.id : null,
    endpoint.kind === 'point' ? endpoint.x : null, endpoint.kind === 'point' ? endpoint.y : null,
    endpoint.kind === 'point' ? 'auto' : endpoint.anchor];
}

function edgeRow(db: Database.Database, boardId: string, edgeId: string): BoardEdgeRow | undefined {
  return db.prepare('SELECT * FROM board_edges WHERE id = ? AND board_id = ?').get(edgeId, boardId) as BoardEdgeRow | undefined;
}

export function createBoardEdge(db: Database.Database, userId: string, boardId: string, value: unknown): BoardEdge {
  requireTransaction(db);
  const input = parse(createBoardEdgeSchema, value);
  boardRow(db, userId, boardId);
  const from: BoardEdgeEndpoint = input.from ?? { kind: 'member', id: input.from_member_id!, anchor: 'auto' };
  const to: BoardEdgeEndpoint = input.to ?? { kind: 'member', id: input.to_member_id!, anchor: 'auto' };
  endpointGeometry(db, boardId, from);
  endpointGeometry(db, boardId, to);
  const capStart = input.cap_start ?? 'none';
  const capEnd = input.cap_end ?? 'none';
  const bend = input.bend ?? (input.visual_version === 0 ? 0 : routedBend(db, boardId, from, to, capStart, capEnd));
  const id = uuidv4();
  db.prepare(`INSERT INTO board_edges (id, board_id,
    from_member_id, from_sticky_id, from_x, from_y, from_anchor,
    to_member_id, to_sticky_id, to_x, to_y, to_anchor,
    bend, dash, weight, cap_start, cap_end, color_index, label_position, visual_version, style, label, created_at)
    VALUES (${Array(23).fill('?').join(',')})`).run(id, boardId, ...endpointColumns(from), ...endpointColumns(to),
    bend, input.dash ?? 'solid', input.weight ?? 1, capStart, capEnd, input.color_index ?? null,
    input.label_position ?? 0.5, input.visual_version ?? 1, JSON.stringify(input.style ?? {}),
    input.label ?? null, new Date().toISOString());
  touchBoard(db, boardId);
  return hydrateEdge(edgeRow(db, boardId, id)!);
}

export function updateBoardEdge(db: Database.Database, userId: string, boardId: string, edgeId: string, value: unknown): BoardEdge {
  requireTransaction(db);
  const input = parse(updateBoardEdgeSchema, value);
  boardRow(db, userId, boardId);
  const row = edgeRow(db, boardId, edgeId);
  if (!row) throw new AppError(404, 'board_edge_not_found');
  const from: BoardEdgeEndpoint = input.from ?? (input.from_member_id === undefined ? edgeEndpoint(row, 'from')
    : { kind: 'member', id: input.from_member_id, anchor: 'auto' });
  const to: BoardEdgeEndpoint = input.to ?? (input.to_member_id === undefined ? edgeEndpoint(row, 'to')
    : { kind: 'member', id: input.to_member_id, anchor: 'auto' });
  endpointGeometry(db, boardId, from);
  endpointGeometry(db, boardId, to);
  const visualChange = ['from', 'to', 'from_member_id', 'to_member_id', 'bend', 'dash', 'weight',
    'cap_start', 'cap_end', 'color_index'].some((key) => Object.prototype.hasOwnProperty.call(input, key));
  db.prepare(`UPDATE board_edges SET
    from_member_id = ?, from_sticky_id = ?, from_x = ?, from_y = ?, from_anchor = ?,
    to_member_id = ?, to_sticky_id = ?, to_x = ?, to_y = ?, to_anchor = ?,
    bend = ?, dash = ?, weight = ?, cap_start = ?, cap_end = ?, color_index = ?,
    label_position = ?, visual_version = ?, style = ?, label = ? WHERE id = ? AND board_id = ?`)
    .run(...endpointColumns(from), ...endpointColumns(to), input.bend ?? row.bend, input.dash ?? row.dash,
      input.weight ?? row.weight, input.cap_start ?? row.cap_start, input.cap_end ?? row.cap_end,
      input.color_index === undefined ? row.color_index : input.color_index,
      input.label_position ?? row.label_position, input.visual_version ?? (visualChange ? 1 : row.visual_version),
      input.style ? JSON.stringify(input.style) : row.style,
      input.label === undefined ? row.label : input.label, edgeId, boardId);
  touchBoard(db, boardId);
  return hydrateEdge(edgeRow(db, boardId, edgeId)!);
}

export function rerouteBoardEdge(db: Database.Database, userId: string, boardId: string, edgeId: string): BoardEdge {
  requireTransaction(db);
  boardRow(db, userId, boardId);
  const row = edgeRow(db, boardId, edgeId);
  if (!row) throw new AppError(404, 'board_edge_not_found');
  // Reroute opts legacy lines into the new renderer. Preserve their visible
  // direction markers while computing the new arrow-tip gaps and arc.
  const direction = json<JsonObject>(row.style).direction;
  const capStart = row.visual_version === 0 ? (direction === 'both' ? 'arrow' : 'none') : row.cap_start;
  const capEnd = row.visual_version === 0 ? (direction === 'forward' || direction === 'both' ? 'arrow' : 'none') : row.cap_end;
  return updateBoardEdge(db, userId, boardId, edgeId, {
    cap_start: capStart,
    cap_end: capEnd,
    bend: routedBend(db, boardId, edgeEndpoint(row, 'from'), edgeEndpoint(row, 'to'), capStart, capEnd),
  });
}

/** Plain-text fallback matches fixed font sizing; the UI can refine measured height. */
function stickyTextHeight(text: string, width: number): number {
  // Fixed 16px padding plus the 1px border on each side, in border-box units.
  const columns = Math.max(1, Math.floor((width - 34) / 16));
  const lines = text.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(Array.from(line).length / columns)), 0);
  return Math.max(width === 240 ? 240 : 120, lines * 24 + 34);
}

export function createBoardSticky(db: Database.Database, userId: string, boardId: string, value: unknown, actor: 'human' | 'agent' = 'human'): BoardSticky {
  requireTransaction(db);
  const input = parse(createBoardStickySchema, value);
  boardRow(db, userId, boardId);
  validateLayer(db, userId, boardId, input.layer_id);
  const id = uuidv4();
  const now = new Date().toISOString();
  const width = input.w ?? 240;
  db.prepare(`INSERT INTO board_stickies (id,board_id,text,x,y,w,h,color_index,weight,layer_id,z_index,pinned,placed,mounted_actor,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, boardId, input.text ?? '', input.x ?? 0, input.y ?? 0,
    width, input.h ?? stickyTextHeight(input.text ?? '', width), input.color_index ?? null, input.weight ?? 1,
    input.layer_id ?? null, input.z_index ?? 0, input.pinned ? 1 : 0, input.placed === false ? 0 : 1, actor, now, now);
  touchBoard(db, boardId);
  return hydrateSticky(stickyRow(db, boardId, id)!);
}

export function updateBoardSticky(db: Database.Database, userId: string, boardId: string, stickyId: string, value: unknown): BoardSticky {
  requireTransaction(db);
  const input = parse(updateBoardStickySchema, value);
  boardRow(db, userId, boardId);
  const row = stickyRow(db, boardId, stickyId);
  if (!row) throw new AppError(404, 'board_sticky_not_found');
  validateLayer(db, userId, boardId, input.layer_id);
  const width = input.w ?? row.w;
  const text = input.text ?? row.text;
  const height = input.h ?? ((input.text !== undefined || input.w !== undefined) ? stickyTextHeight(text, width) : row.h);
  db.prepare(`UPDATE board_stickies SET text=?,x=?,y=?,w=?,h=?,color_index=?,weight=?,layer_id=?,z_index=?,pinned=?,placed=?,updated_at=?
    WHERE id=? AND board_id=?`).run(text, input.x ?? row.x, input.y ?? row.y, width, height,
    input.color_index === undefined ? row.color_index : input.color_index, input.weight ?? row.weight,
    input.layer_id === undefined ? row.layer_id : input.layer_id, input.z_index ?? row.z_index,
    input.pinned === undefined ? row.pinned : Number(input.pinned),
    input.placed === undefined ? row.placed : Number(input.placed), new Date().toISOString(), stickyId, boardId);
  touchBoard(db, boardId);
  return hydrateSticky(stickyRow(db, boardId, stickyId)!);
}

export function deleteBoardSticky(db: Database.Database, userId: string, boardId: string, stickyId: string): boolean {
  requireTransaction(db);
  boardRow(db, userId, boardId);
  const changed = db.prepare('DELETE FROM board_stickies WHERE id = ? AND board_id = ?').run(stickyId, boardId).changes > 0;
  if (changed) touchBoard(db, boardId);
  return changed;
}

export function deleteBoardEdge(db: Database.Database, userId: string, boardId: string, edgeId: string): boolean {
  requireTransaction(db);
  boardRow(db, userId, boardId);
  const changed = db.prepare('DELETE FROM board_edges WHERE id = ? AND board_id = ?').run(edgeId, boardId).changes > 0;
  if (changed) touchBoard(db, boardId);
  return changed;
}

function visualRow(db: Database.Database, boardId: string, visualId: string): BoardVisualRow | undefined {
  return db.prepare('SELECT * FROM board_visuals WHERE id = ? AND board_id = ?').get(visualId, boardId) as BoardVisualRow | undefined;
}

function validateVisualData(kind: BoardVisualKind, data: JsonObject): void {
  if (kind === 'freehand') parse(boardFreehandDataSchema, data);
  if (kind === 'sticky') {
    const result = boardStickyDataSchema.safeParse(data);
    if (!result.success) throw new AppError(400, result.error.issues[0]?.message ?? 'Invalid board chalk');
  }
}

export function createBoardVisual(db: Database.Database, userId: string, boardId: string, value: unknown): BoardVisual {
  requireTransaction(db);
  const input = parse(createBoardVisualSchema, value);
  boardRow(db, userId, boardId);
  validateLayer(db, userId, boardId, input.layer_id);
  validateVisualData(input.visual_kind, input.data);
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO board_visuals
    (id, board_id, visual_kind, x, y, w, h, scale, rotation, z_index, pinned, layer_id, data, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, boardId, input.visual_kind,
    input.x ?? 0, input.y ?? 0, input.w ?? 0, input.h ?? 0, input.scale ?? 1, input.rotation ?? 0,
    input.z_index ?? 0, input.pinned ? 1 : 0, input.layer_id ?? null, JSON.stringify(input.data), JSON.stringify(input.metadata ?? {}), now, now);
  touchBoard(db, boardId);
  return hydrateVisual(visualRow(db, boardId, id)!);
}

export function updateBoardVisual(db: Database.Database, userId: string, boardId: string, visualId: string, value: unknown): BoardVisual {
  requireTransaction(db);
  const input = parse(updateBoardVisualSchema, value);
  boardRow(db, userId, boardId);
  const row = visualRow(db, boardId, visualId);
  if (!row) throw new AppError(404, 'board_visual_not_found');
  validateLayer(db, userId, boardId, input.layer_id);
  if (input.data) validateVisualData(row.visual_kind, input.data);
  db.prepare(`UPDATE board_visuals SET x = ?, y = ?, w = ?, h = ?, scale = ?, rotation = ?,
    z_index = ?, pinned = ?, layer_id = ?, data = ?, metadata = ?, updated_at = ? WHERE id = ? AND board_id = ?`)
    .run(input.x ?? row.x, input.y ?? row.y, input.w ?? row.w, input.h ?? row.h, input.scale ?? row.scale,
      input.rotation ?? row.rotation, input.z_index ?? row.z_index,
      input.pinned === undefined ? row.pinned : Number(input.pinned), input.layer_id === undefined ? row.layer_id : input.layer_id,
      input.data ? JSON.stringify(input.data) : row.data,
      input.metadata ? JSON.stringify(input.metadata) : row.metadata, new Date().toISOString(), visualId, boardId);
  touchBoard(db, boardId);
  return hydrateVisual(visualRow(db, boardId, visualId)!);
}

export function deleteBoardVisual(db: Database.Database, userId: string, boardId: string, visualId: string): boolean {
  requireTransaction(db);
  boardRow(db, userId, boardId);
  const changed = db.prepare('DELETE FROM board_visuals WHERE id = ? AND board_id = ?').run(visualId, boardId).changes > 0;
  if (changed) touchBoard(db, boardId);
  return changed;
}

/** The recorded-action caller commits the Item, placement, chalk removal and mounted receipt together. */
export function castBoardSticky(db: Database.Database, userId: string, boardId: string, visualId: string) {
  requireTransaction(db);
  boardRow(db, userId, boardId);
  const visual = visualRow(db, boardId, visualId);
  if (!visual) throw new AppError(404, 'board_visual_not_found');
  if (visual.visual_kind !== 'sticky') throw new AppError(400, 'Only board chalk can be cast to an Item');
  const data = json<JsonObject>(visual.data);
  validateVisualData('sticky', data);
  const item = createItem(db, userId, { plain_text: data.text as string, origin_board_id: boardId });
  const { member } = mountBoardMember(db, userId, boardId, {
    member_kind: 'item', member_id: item.id,
    x: visual.x, y: visual.y, w: visual.w, h: visual.h, scale: visual.scale,
    z_index: visual.z_index, pinned: visual.pinned === 1, layer_id: visual.layer_id,
  });
  deleteBoardVisual(db, userId, boardId, visualId);
  return { item, member, removed_visual_id: visualId };
}
