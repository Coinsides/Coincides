import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { createBoardVisual, mountBoardMember, unmountBoardMember, type BoardMember } from './boards.js';
import { relocateTraySchema } from '../validators/boards.js';

type Row = Record<string, any>;
type GeometryMode = 'preserved' | 'default_grid';
interface TraySource {
  object: Row;
  placement: Row;
  mounts: Row[];
  extensions: { image: Row | null; table: Row | null; connector: Row | null };
  backing_blocks: Row[];
  endpoint_placements: Row[];
}
interface RelocatedEntry {
  source: TraySource;
  target_table: 'board_visuals' | 'board_members';
  target: Row;
  geometry_mode: GeometryMode;
}
interface Receipt { version: 1; board_id: string; entries: RelocatedEntry[] }

function requireTransaction(db: Database.Database): void {
  if (!db.inTransaction) throw new Error('Tray relocation requires a caller-owned transaction');
}

function ownedBoard(db: Database.Database, userId: string, boardId: string): void {
  if (!db.prepare('SELECT id FROM boards WHERE id = ? AND user_id = ?').get(boardId, userId)) {
    throw new AppError(404, 'board_not_found');
  }
}

function row(db: Database.Database, table: 'board_visuals' | 'board_members', id: string): Row | undefined {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Row | undefined;
}

function sameRow(actual: Row | undefined, expected: Row): boolean {
  // Schema-added NULL columns do not invalidate older snapshots; non-NULL additions do.
  return Boolean(actual && Object.keys(expected).every((key) => actual[key] === expected[key])
    && Object.keys(actual).every((key) => Object.prototype.hasOwnProperty.call(expected, key) || actual[key] === null));
}

function sourceRows(db: Database.Database, userId: string, id: string): TraySource {
  const placement = db.prepare(`SELECT cp.* FROM canvas_placements cp
    JOIN notes n ON n.id = cp.note_id AND n.user_id = cp.user_id
    WHERE cp.id = ? AND cp.user_id = ? AND cp.surface = 'tray' AND n.status = 'active'`)
    .get(id, userId) as Row | undefined;
  if (!placement) throw new AppError(409, 'tray_placement_unavailable');
  const object = db.prepare(`SELECT * FROM canvas_objects
    WHERE id = ? AND user_id = ? AND note_id = ? AND status = 'active'`)
    .get(placement.object_id, userId, placement.note_id) as Row | undefined;
  if (!object) throw new AppError(409, 'tray_object_unavailable');
  const mounts = db.prepare(`SELECT * FROM content_mounts
    WHERE object_id = ? AND user_id = ? AND note_id = ? ORDER BY id`)
    .all(object.id, userId, placement.note_id) as Row[];
  const extension = (table: 'image_object_extensions' | 'structured_object_extensions' | 'visual_connector_extensions') =>
    db.prepare(`SELECT * FROM ${table} WHERE object_id = ? AND user_id = ? AND note_id = ?`)
      .get(object.id, userId, placement.note_id) as Row | undefined;
  const extensions = { image: extension('image_object_extensions') ?? null,
    table: extension('structured_object_extensions') ?? null,
    connector: extension('visual_connector_extensions') ?? null };
  if (object.kind === 'shape' && object.backing === 'note_block'
    && !mounts.some((mount) => mount.target_kind === 'note_block')) throw new AppError(409, 'tray_shape_backing_unavailable');
  if (extensions.image && !db.prepare('SELECT id FROM canvas_assets WHERE id = ? AND user_id = ?')
    .get(extensions.image.asset_id, userId)) throw new AppError(409, 'tray_image_asset_unavailable');
  const backingBlocks = object.kind === 'shape' ? mounts.filter((mount) => mount.target_kind === 'note_block')
    .map((mount) => {
      const block = db.prepare('SELECT * FROM note_blocks WHERE id = ? AND user_id = ?')
        .get(mount.target_id, userId) as Row | undefined;
      if (!block) throw new AppError(409, 'tray_shape_backing_unavailable');
      return block;
    }) : [];
  const endpointPlacements: Row[] = [];
  for (const side of ['start', 'end']) {
    if (extensions.connector?.[`${side}_kind`] !== 'object') continue;
    const endpointRows = db.prepare(`SELECT cp.* FROM canvas_placements cp
      JOIN canvas_objects co ON co.id = cp.object_id AND co.user_id = cp.user_id
      WHERE cp.object_id = ? AND cp.user_id = ? AND cp.note_id = ? AND co.status = 'active'
      ORDER BY cp.id`).all(extensions.connector[`${side}_object_id`], userId, placement.note_id) as Row[];
    if (endpointRows.length === 0) throw new AppError(409, 'tray_connector_endpoint_unavailable');
    for (const endpoint of endpointRows) {
      if (!endpointPlacements.some((existing) => existing.id === endpoint.id)) endpointPlacements.push(endpoint);
    }
  }
  return { object, placement, mounts, extensions, backing_blocks: backingBlocks, endpoint_placements: endpointPlacements };
}

function visualKind(source: TraySource): 'shape' | 'image' | 'table' | 'connector' | null {
  const kind = source.object.kind;
  if (kind === 'paragraph_block_projection' || kind === 'note_block') throw new AppError(409, 'tray_blocks_cannot_mount_board');
  if (kind === 'shape' || kind === 'image' || kind === 'table') return kind;
  if (kind === 'visual_connector') return 'connector';
  if (kind === 'content_group_projection' && source.mounts.length === 1
    && source.mounts[0].target_kind === 'content_group') return null;
  throw new AppError(409, 'tray_object_kind_not_relocatable');
}

function geometry(source: TraySource, defaultIndex: number) {
  const p = source.placement;
  const empty = ['x', 'y', 'width', 'height', 'rotation'].every((column) => p[column] === 0);
  return {
    mode: (empty ? 'default_grid' : 'preserved') as GeometryMode,
    values: empty ? { x: 40 + (defaultIndex % 4) * 320, y: 40 + Math.floor(defaultIndex / 4) * 240,
      w: 280, h: 180, rotation: 0, z_index: p.z_index, scale: 1, pinned: false }
      : { x: p.x, y: p.y, w: p.width, h: p.height, rotation: p.rotation,
        z_index: p.z_index, scale: 1, pinned: false },
  };
}

type Layout = ReturnType<typeof geometry>;

function connectorPoints(source: TraySource, selected: TraySource[], layouts: Map<string, Layout>) {
  const extension = source.extensions.connector!;
  const destination = layouts.get(source.placement.id)!.values;
  const endpoint = (side: 'start' | 'end') => {
    if (extension[`${side}_kind`] === 'point') return {
      x: extension[`${side}_x`] - source.placement.x, y: extension[`${side}_y`] - source.placement.y,
    };
    const objectId = extension[`${side}_object_id`];
    const candidates = source.endpoint_placements.filter((placement) => placement.object_id === objectId);
    const picked = selected.filter((entry) => entry.object.id === objectId && entry.placement.note_id === source.placement.note_id);
    // An object can have multiple placements. Prefer the explicitly selected instance;
    // never silently pick one of multiple remaining spatial identities.
    const p = picked.length === 1 ? picked[0].placement : candidates.length === 1 ? candidates[0] : undefined;
    if (!p) throw new AppError(409, 'tray_connector_endpoint_ambiguous');
    const moved = picked.length === 1 ? layouts.get(p.id)!.values : undefined;
    const x = moved?.x ?? p.x;
    const y = moved?.y ?? p.y;
    const width = moved?.w ?? p.width;
    const height = moved?.h ?? p.height;
    const anchor = extension[`${side}_anchor`];
    return { x: x + (anchor === 'west' ? 0 : anchor === 'east' ? width : width / 2)
      - (moved ? destination.x : source.placement.x),
    y: y + (anchor === 'north' ? 0 : anchor === 'south' ? height : height / 2)
      - (moved ? destination.y : source.placement.y) };
  };
  // Selected objects use their final board grid/geometry. Bare points and
  // unselected object backups preserve their offset from the original visual.
  // Original world coordinates and endpoint identities stay in tray_source.
  return { start: endpoint('start'), end: endpoint('end') };
}

function result(receipt: Receipt, batchId: string, applied: boolean) {
  return { board_id: receipt.board_id, batch_id: batchId, applied,
    placement_ids: receipt.entries.map((entry) => entry.source.placement.id as string),
    visual_ids: receipt.entries.filter((entry) => entry.target_table === 'board_visuals').map((entry) => entry.target.id as string),
    member_ids: receipt.entries.filter((entry) => entry.target_table === 'board_members').map((entry) => entry.target.id as string),
    geometry: {
      preserved_placement_ids: receipt.entries.filter((entry) => entry.geometry_mode === 'preserved').map((entry) => entry.source.placement.id as string),
      default_grid_placement_ids: receipt.entries.filter((entry) => entry.geometry_mode === 'default_grid').map((entry) => entry.source.placement.id as string),
    } };
}

/** Placement IDs and optional destination layer cross the client boundary.
 * The receipt remains evidence read on this connection.
 */
export function relocateTrayToBoard(db: Database.Database, userId: string, boardId: string, value: unknown) {
  requireTransaction(db);
  ownedBoard(db, userId, boardId);
  const input = relocateTraySchema.safeParse(value);
  if (!input.success) throw new AppError(400, 'invalid_tray_relocation_input');
  const sources = [...new Set(input.data.placement_ids)].map((id) => sourceRows(db, userId, id));
  const batchId = uuidv4();
  const receipt: Receipt = { version: 1, board_id: boardId, entries: [] };
  const members: BoardMember[] = [];
  const existingCount = (db.prepare(`SELECT (SELECT count(*) FROM board_visuals WHERE board_id = ?)
    + (SELECT count(*) FROM board_members WHERE board_id = ?) AS count`).get(boardId, boardId) as { count: number }).count;
  let defaultIndex = existingCount;
  const layouts = new Map<string, Layout>();
  for (const source of sources) {
    const layout = geometry(source, defaultIndex);
    if (layout.mode === 'default_grid') defaultIndex += 1;
    layouts.set(source.placement.id, layout);
  }
  for (const source of sources) {
    const kind = visualKind(source);
    if ((kind === 'image' && !source.extensions.image) || (kind === 'table' && !source.extensions.table)
      || (kind === 'connector' && !source.extensions.connector)) throw new AppError(409, 'tray_visual_extension_unavailable');
    const layout = layouts.get(source.placement.id)!;
    const metadata = { tray_relocation: { batch_id: batchId, geometry_mode: layout.mode }, tray_source: source };
    let targetTable: RelocatedEntry['target_table'];
    let targetId: string;
    if (kind) {
      const visual = createBoardVisual(db, userId, boardId, { visual_kind: kind, ...layout.values, layer_id: input.data.layer_id,
        data: { tray_source: source, ...(kind === 'connector' && { connector_points: connectorPoints(source, sources, layouts) }) },
        metadata: { tray_relocation: metadata.tray_relocation } });
      targetTable = 'board_visuals';
      targetId = visual.id;
    } else {
      const { rotation: _rotation, ...memberGeometry } = layout.values;
      const { member } = mountBoardMember(db, userId, boardId, { member_kind: 'content_group',
        member_id: source.mounts[0].target_id, ...memberGeometry, layer_id: input.data.layer_id, metadata });
      members.push(member);
      targetTable = 'board_members';
      targetId = member.id;
    }
    receipt.entries.push({ source, target_table: targetTable, target: row(db, targetTable, targetId)!, geometry_mode: layout.mode });
  }
  for (const source of sources) db.prepare('DELETE FROM canvas_placements WHERE id = ?').run(source.placement.id);
  db.prepare(`INSERT INTO operation_batches
    (id, user_id, course_id, source_type, label, status, metadata, applied_at)
    VALUES (?, ?, NULL, 'manual', 'Relocate tray to board', 'applied', ?, ?)`)
    .run(batchId, userId, JSON.stringify({ tray_relocation: receipt }), new Date().toISOString());
  return { value: result(receipt, batchId, true), members };
}

/** Undo refuses intervening destination edits/edges so it cannot erase later work. */
export function undoTrayRelocation(db: Database.Database, userId: string, boardId: string, batchId: string) {
  requireTransaction(db);
  ownedBoard(db, userId, boardId);
  const batch = db.prepare('SELECT * FROM operation_batches WHERE id = ? AND user_id = ?')
    .get(batchId, userId) as Row | undefined;
  const receipt = batch ? JSON.parse(batch.metadata).tray_relocation as Receipt | undefined : undefined;
  if (!receipt || receipt.version !== 1 || receipt.board_id !== boardId) throw new AppError(404, 'tray_relocation_not_found');
  if (batch!.status === 'reverted') return { value: result(receipt, batchId, false), members: [] as BoardMember[] };
  if (batch!.status !== 'applied') throw new AppError(409, 'tray_relocation_state_conflict');
  for (const entry of receipt.entries) {
    if (!sameRow(row(db, entry.target_table, entry.target.id), entry.target)) throw new AppError(409, 'tray_relocation_target_changed');
    if (db.prepare('SELECT id FROM canvas_placements WHERE id = ?').get(entry.source.placement.id)) {
      throw new AppError(409, 'tray_relocation_source_changed');
    }
    const object = db.prepare('SELECT * FROM canvas_objects WHERE id = ? AND user_id = ?')
      .get(entry.source.object.id, userId) as Row | undefined;
    if (!sameRow(object, entry.source.object)) throw new AppError(409, 'tray_relocation_source_changed');
    if (!db.prepare("SELECT id FROM notes WHERE id = ? AND user_id = ? AND status = 'active'")
      .get(entry.source.placement.note_id, userId)) throw new AppError(409, 'tray_relocation_source_changed');
    const mounts = db.prepare('SELECT * FROM content_mounts WHERE object_id = ? ORDER BY id')
      .all(entry.source.object.id) as Row[];
    if (mounts.length !== entry.source.mounts.length || mounts.some((mount, index) => !sameRow(mount, entry.source.mounts[index]))) {
      throw new AppError(409, 'tray_relocation_source_changed');
    }
    for (const [kind, table] of [['image', 'image_object_extensions'], ['table', 'structured_object_extensions'],
      ['connector', 'visual_connector_extensions']] as const) {
      const original = entry.source.extensions[kind];
      const current = db.prepare(`SELECT * FROM ${table} WHERE object_id = ?`).get(entry.source.object.id) as Row | undefined;
      if (original ? !sameRow(current, original) : current !== undefined) throw new AppError(409, 'tray_relocation_source_changed');
    }
    for (const block of entry.source.backing_blocks) {
      if (!sameRow(db.prepare('SELECT * FROM note_blocks WHERE id = ?').get(block.id) as Row | undefined, block)) {
        throw new AppError(409, 'tray_relocation_source_changed');
      }
    }
    for (const endpoint of entry.source.endpoint_placements) {
      // Endpoints moved in this batch are restored from the same receipt below;
      // a spatial dependency left on the original surface must remain unchanged.
      if (receipt.entries.some((other) => other.source.placement.id === endpoint.id)) continue;
      if (!sameRow(db.prepare('SELECT * FROM canvas_placements WHERE id = ?').get(endpoint.id) as Row | undefined, endpoint)) {
        throw new AppError(409, 'tray_relocation_source_changed');
      }
    }
    if (entry.target_table === 'board_members' && db.prepare(`SELECT id FROM board_edges
      WHERE board_id = ? AND (from_member_id = ? OR to_member_id = ?) LIMIT 1`)
      .get(boardId, entry.target.id, entry.target.id)) throw new AppError(409, 'tray_relocation_target_has_edges');
  }
  // Column names come from the fixed table schema; values come only from server snapshots.
  const columns = (db.prepare('PRAGMA table_info(canvas_placements)').all() as { name: string }[]).map(({ name }) => name);
  const restore = db.prepare(`INSERT INTO canvas_placements (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`);
  const members: BoardMember[] = [];
  for (const entry of receipt.entries) {
    if (entry.target_table === 'board_members') {
      const removed = unmountBoardMember(db, userId, boardId, entry.target.id);
      if (removed.member) members.push(removed.member);
    } else db.prepare('DELETE FROM board_visuals WHERE id = ? AND board_id = ?').run(entry.target.id, boardId);
    restore.run(...columns.map((column) => entry.source.placement[column] ?? null));
  }
  const now = new Date().toISOString();
  db.prepare('UPDATE boards SET updated_at = ? WHERE id = ?').run(now, boardId);
  db.prepare("UPDATE operation_batches SET status = 'reverted', reverted_at = ? WHERE id = ?").run(now, batchId);
  return { value: result(receipt, batchId, false), members };
}
