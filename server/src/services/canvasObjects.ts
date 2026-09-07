import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';
import { finalizeCanvasAssetCleanup, releaseAssetReference } from './canvasAssets.js';
import type { ManagedFileTask } from './managedFileCleanup.js';

interface OwnedNote {
  id: string;
  user_id: string;
  course_id: string;
}

interface CanvasPlacementRow {
  id: string;
  object_id: string;
  canvas_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  frame_id: string | null;
  surface: string;
  boundary_role: string;
  z_index: number;
  order_index: number | null;
  snap_state_json: string | null;
  visibility_state: string;
  render_visibility: string;
  metadata: string | null;
}

interface PageFrameExtensionRow {
  frame_id: string;
  extension_object_id?: string | null;
  object_id: string;
  canvas_id: string;
  page_stack_id: string | null;
  page_index: number | null;
  page_size: string | null;
  content_inset_json: string | null;
  typography_json: string | null;
  background_json: string | null;
  template_id: string | null;
  template_json: string | null;
  slots_json: string | null;
  exportable: number;
  metadata: string | null;
}

interface PageCollectionRow {
  note_id: string;
  canvas_id: string;
  primary_frame_id: string | null;
  selected_frame_id: string | null;
  primary_stack_id: string | null;
  selected_stack_id: string | null;
  page_stacks_json: string | null;
  metadata: string | null;
}

interface BlockPlacementRow extends CanvasPlacementRow {
  block_id: string;
}

interface CanvasObjectRow {
  id: string;
  canvas_id: string;
  kind: string;
  backing: string;
  object_class: string;
  status: string;
  source_json: string | null;
  metadata: string | null;
}

interface ContentMountRow {
  id: string;
  object_id: string;
  target_kind: string;
  target_id: string;
  projection_mode: string;
  sync_policy: string;
  metadata: string | null;
}

interface VisualConnectorExtensionRow {
  object_id: string;
  canvas_id: string;
  start_kind: 'object' | 'point';
  start_object_id: string | null;
  start_anchor: string;
  start_x: number | null;
  start_y: number | null;
  end_kind: 'object' | 'point';
  end_object_id: string | null;
  end_anchor: string;
  end_x: number | null;
  end_y: number | null;
  line_style: string;
  stroke: string;
  stroke_width: number;
  start_marker: string;
  end_marker: string;
  relation_kind: 'visual_only';
  metadata: string | null;
}

interface CanvasAssetRow {
  id: string;
  kind: 'image';
  storage_kind: 'local_file';
  storage_key: string;
  filename: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  sha256: string | null;
  metadata: string | null;
}

interface ImageObjectExtensionRow {
  object_id: string;
  canvas_id: string;
  asset_id: string;
  fit: 'contain' | 'cover';
  caption: string | null;
  alt_text: string | null;
  natural_width: number | null;
  natural_height: number | null;
  metadata: string | null;
  asset_kind: 'image';
  storage_kind: 'local_file';
  storage_key: string;
  filename: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  sha256: string | null;
  asset_metadata: string | null;
}

interface StructuredObjectExtensionRow {
  object_id: string;
  canvas_id: string;
  structured_kind: 'table';
  schema_version: 'table.v1';
  row_count: number;
  column_count: number;
  data_json: string;
  metadata: string | null;
}

interface TableRowModel {
  rowId: string;
  index: number;
  height?: number;
}

interface TableColumnModel {
  columnId: string;
  index: number;
  width?: number;
  label?: string;
}

interface TableCellModel {
  cellId: string;
  rowId: string;
  columnId: string;
  rowIndex: number;
  columnIndex: number;
  text: string;
  valueType: 'text';
}

interface TableStructuredPayload {
  version: 'table.v1';
  rows: TableRowModel[];
  columns: TableColumnModel[];
  cells: TableCellModel[];
}

type CanvasPlacementInput = Record<string, unknown> & {
  placement_id?: string;
};

export interface GenericCanvasObjectInput {
  kind: string;
  backing?: string;
  object_class?: string;
  placement: CanvasPlacementInput;
  source?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  extension?: Record<string, unknown>;
  mount?: Record<string, unknown>;
}

interface CanvasKindHandlerContext {
  objectId: string;
  placementId: string;
  input: GenericCanvasObjectInput;
}

interface CanvasKindHandler {
  kind: string;
  backing: string;
  objectClass: string;
  source: string;
  validate?: (
    db: Database.Database,
    userId: string,
    note: OwnedNote,
    context: CanvasKindHandlerContext,
  ) => Record<string, unknown>;
  writeExtension?: (
    db: Database.Database,
    userId: string,
    note: OwnedNote,
    context: CanvasKindHandlerContext,
    validation: Record<string, unknown>,
  ) => void;
  cleanupOnDelete?: (
    db: Database.Database,
    userId: string,
    note: OwnedNote,
    objectId: string,
  ) => ManagedFileTask[] | void;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function cleanText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numeric(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function integer(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function getOwnedNote(db: Database.Database, userId: string, noteId: string): OwnedNote {
  const note = db.prepare('SELECT id, user_id, course_id FROM notes WHERE id = ? AND user_id = ?')
    .get(noteId, userId) as OwnedNote | undefined;
  if (!note) throw new AppError(404, 'Note not found');
  return note;
}

function pageFrameObjectId(noteId: string, frameId: string): string {
  return `canvas-object:${noteId}:page-frame:${frameId}`;
}

function pageFramePlacementId(noteId: string, frameId: string): string {
  return `canvas-placement:${noteId}:page-frame:${frameId}`;
}

function blockProjectionObjectId(noteId: string, placementId: string): string {
  return `canvas-object:${noteId}:block-placement:${placementId}`;
}

function visibilityStateForLayout(layout: Record<string, unknown>): string {
  if (layout.export_role === 'scratch') return 'scratch';
  if (layout.ai_visibility === 'hidden') return 'ai_hidden';
  if (layout.export_role === 'excluded') return 'export_hidden';
  return 'normal';
}

function layoutPolicyFromPlacement(row: CanvasPlacementRow): Record<string, unknown> {
  const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
  const policy = metadata.layout_policy;
  return isRecord(policy) ? policy : {};
}

function layoutFromPlacement(row: CanvasPlacementRow): Record<string, unknown> {
  const policy = layoutPolicyFromPlacement(row);
  const layout: Record<string, unknown> = {
    x: Math.round(Number(row.x || 0)),
    y: Math.round(Number(row.y || 0)),
    width: Math.round(Number(row.width || 0)),
    height: Math.round(Number(row.height || 0)),
    surface: row.surface === 'tray' ? 'tray' : row.surface === 'canvas_workspace' ? 'canvas_workspace' : 'formal_page',
    boundary_role: row.boundary_role === 'crossing' || row.boundary_role === 'outside'
      ? row.boundary_role
      : 'inside',
  };
  if (row.frame_id) layout.frame_id = row.frame_id;
  if (row.order_index != null) layout.order_index = row.order_index;
  if (policy.coordinate_space === 'page_frame_local' || policy.coordinate_space === 'canvas_world') {
    layout.coordinate_space = policy.coordinate_space;
  }
  if (Number(row.rotation || 0) !== 0) layout.rotation = Number(row.rotation || 0);
  if (typeof policy.export_role === 'string') layout.export_role = policy.export_role;
  if (typeof policy.ai_visibility === 'string') layout.ai_visibility = policy.ai_visibility;
  if (policy.width_mode === 'manual') layout.width_mode = 'manual';
  return layout;
}

function canvasObjectFromRow(row: CanvasObjectRow) {
  return {
    object_id: row.id,
    canvas_id: row.canvas_id,
    kind: row.kind,
    backing: row.backing,
    object_class: row.object_class,
    status: row.status,
    source: parseJson<Record<string, unknown>>(row.source_json, {}),
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function canvasPlacementFromRow(row: CanvasPlacementRow) {
  return {
    placement_id: row.id,
    object_id: row.object_id,
    canvas_id: row.canvas_id,
    x: Number(row.x || 0),
    y: Number(row.y || 0),
    width: Number(row.width || 0),
    height: Number(row.height || 0),
    rotation: Number(row.rotation || 0),
    frame_id: row.frame_id || undefined,
    surface: row.surface,
    boundary_role: row.boundary_role,
    z_index: Number(row.z_index || 0),
    order_index: row.order_index ?? null,
    snap_state: parseJson<Record<string, unknown>>(row.snap_state_json, {}),
    visibility_state: row.visibility_state,
    render_visibility: row.render_visibility,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function contentMountFromRow(row: ContentMountRow) {
  return {
    mount_id: row.id,
    object_id: row.object_id,
    target_kind: row.target_kind,
    target_id: row.target_id,
    projection_mode: row.projection_mode,
    sync_policy: row.sync_policy,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function visualConnectorFromRow(row: VisualConnectorExtensionRow) {
  return {
    object_id: row.object_id,
    canvas_id: row.canvas_id,
    start_kind: row.start_kind,
    start_object_id: row.start_object_id || undefined,
    start_anchor: row.start_anchor,
    start_x: row.start_x ?? undefined,
    start_y: row.start_y ?? undefined,
    end_kind: row.end_kind,
    end_object_id: row.end_object_id || undefined,
    end_anchor: row.end_anchor,
    end_x: row.end_x ?? undefined,
    end_y: row.end_y ?? undefined,
    line_style: row.line_style,
    stroke: row.stroke,
    stroke_width: Number(row.stroke_width || 1.5),
    start_marker: row.start_marker,
    end_marker: row.end_marker,
    relation_kind: row.relation_kind,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function canvasAssetFromRow(row: CanvasAssetRow) {
  return {
    asset_id: row.id,
    kind: row.kind,
    storage_kind: row.storage_kind,
    storage_key: row.storage_key,
    filename: row.filename,
    mime_type: row.mime_type,
    byte_size: Number(row.byte_size || 0),
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    sha256: row.sha256 || undefined,
    blob_url: `/api/canvas-assets/${row.id}/blob`,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function imageObjectFromRow(row: ImageObjectExtensionRow) {
  return {
    object_id: row.object_id,
    canvas_id: row.canvas_id,
    asset_id: row.asset_id,
    fit: row.fit,
    caption: row.caption || undefined,
    alt_text: row.alt_text || undefined,
    natural_width: row.natural_width ?? row.width ?? undefined,
    natural_height: row.natural_height ?? row.height ?? undefined,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
    asset: canvasAssetFromRow({
      id: row.asset_id,
      kind: row.asset_kind,
      storage_kind: row.storage_kind,
      storage_key: row.storage_key,
      filename: row.filename,
      mime_type: row.mime_type,
      byte_size: row.byte_size,
      width: row.width,
      height: row.height,
      sha256: row.sha256,
      metadata: row.asset_metadata,
    }),
  };
}

function structuredObjectFromRow(row: StructuredObjectExtensionRow) {
  const payload = parseJson<TableStructuredPayload>(row.data_json, {
    version: 'table.v1',
    rows: [],
    columns: [],
    cells: [],
  });
  return {
    object_id: row.object_id,
    canvas_id: row.canvas_id,
    structured_kind: row.structured_kind,
    schema_version: row.schema_version,
    row_count: Number(row.row_count || payload.rows.length || 0),
    column_count: Number(row.column_count || payload.columns.length || 0),
    payload,
    metadata: parseJson<Record<string, unknown>>(row.metadata, {}),
  };
}

function normalizePlacementForWrite(
  placement: CanvasPlacementInput,
  objectId: string,
  canvasId: string,
  placementId: string,
  defaults: {
    surface?: string;
    boundaryRole?: string;
    visibilityState?: string;
    renderVisibility?: string;
    snapState?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } = {},
) {
  const surface = placement.surface === 'tray' ? 'tray' : placement.surface === 'formal_page' ? 'formal_page' : 'canvas_workspace';
  const boundaryRole = placement.boundary_role === 'inside'
    || placement.boundary_role === 'crossing'
    || placement.boundary_role === 'outside'
    ? placement.boundary_role
    : null;
  const effectiveSurface = defaults.surface || surface;
  const isTray = effectiveSurface === 'tray';
  const coordinateSpace = placement.coordinate_space === 'page_frame_local'
    || placement.coordinate_space === 'canvas_world'
    ? placement.coordinate_space
    : null;
  return {
    id: placementId,
    object_id: objectId,
    canvas_id: canvasId,
    x: isTray ? 0 : numeric(placement.x, 0),
    y: isTray ? 0 : numeric(placement.y, 0),
    width: isTray ? 0 : numeric(placement.width, 0),
    height: isTray ? 0 : numeric(placement.height, 0),
    rotation: isTray ? 0 : numeric(placement.rotation, 0),
    frame_id: isTray ? null : optionalText(placement.frame_id),
    surface: effectiveSurface,
    boundary_role: defaults.boundaryRole
      || boundaryRole
      || (effectiveSurface === 'formal_page' ? 'inside' : 'outside'),
    z_index: integer(placement.z_index, 0),
    order_index: typeof placement.order_index === 'number' && Number.isInteger(placement.order_index)
      ? placement.order_index : null,
    snap_state_json: stringifyJson(defaults.snapState || { state: surface === 'formal_page' ? 'snapped' : 'free' }, {}),
    visibility_state: optionalText(placement.visibility_state)
      || defaults.visibilityState
      || visibilityStateForLayout(placement),
    render_visibility: optionalText(placement.render_visibility) || defaults.renderVisibility || 'visible',
    metadata: stringifyJson(defaults.metadata || {
      layout_policy: {
        export_role: optionalText(placement.export_role),
        ai_visibility: optionalText(placement.ai_visibility),
        width_mode: optionalText(placement.width_mode),
        coordinate_space: coordinateSpace,
      },
    }, {}),
  };
}

function upsertCanvasObjectCore(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  objectId: string,
  handler: CanvasKindHandler,
  input: GenericCanvasObjectInput,
) {
  const backing = optionalText(input.backing) || handler.backing;
  const objectClass = optionalText(input.object_class) || handler.objectClass;
  db.prepare(`
    INSERT INTO canvas_objects (
      id, user_id, course_id, note_id, canvas_id, kind, backing, object_class,
      status, source_json, metadata, created_at, updated_at
    )
    VALUES (
      @id, @user_id, @course_id, @note_id, @canvas_id, @kind, @backing,
      @object_class, 'active', @source_json, @metadata, datetime('now'), datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      note_id = excluded.note_id,
      canvas_id = excluded.canvas_id,
      kind = excluded.kind,
      backing = excluded.backing,
      object_class = excluded.object_class,
      status = excluded.status,
      source_json = excluded.source_json,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `).run({
    id: objectId,
    user_id: userId,
    course_id: note.course_id,
    note_id: note.id,
    canvas_id: note.id,
    kind: handler.kind,
    backing,
    object_class: objectClass,
    source_json: stringifyJson(input.source || { source: handler.source }, {}),
    metadata: stringifyJson(input.metadata || {}, {}),
  });
}

function upsertCanvasPlacementCore(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  placement: ReturnType<typeof normalizePlacementForWrite>,
) {
  db.prepare(`
    INSERT INTO canvas_placements (
      id, user_id, course_id, note_id, object_id, canvas_id,
      x, y, width, height, rotation, frame_id, surface, boundary_role,
      z_index, order_index, snap_state_json, visibility_state, render_visibility, metadata,
      created_at, updated_at
    )
    VALUES (
      @id, @user_id, @course_id, @note_id, @object_id, @canvas_id,
      @x, @y, @width, @height, @rotation, @frame_id, @surface, @boundary_role,
      @z_index, @order_index, @snap_state_json, @visibility_state, @render_visibility, @metadata,
      datetime('now'), datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      object_id = excluded.object_id,
      canvas_id = excluded.canvas_id,
      x = excluded.x,
      y = excluded.y,
      width = excluded.width,
      height = excluded.height,
      rotation = excluded.rotation,
      frame_id = excluded.frame_id,
      surface = excluded.surface,
      boundary_role = excluded.boundary_role,
      z_index = excluded.z_index,
      order_index = excluded.order_index,
      snap_state_json = excluded.snap_state_json,
      visibility_state = excluded.visibility_state,
      render_visibility = excluded.render_visibility,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `).run({
    user_id: userId,
    course_id: note.course_id,
    note_id: note.id,
    ...placement,
  });
}

function upsertContentMount(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  input: {
    id: string;
    objectId: string;
    targetKind: string;
    targetId: string;
    projectionMode?: string;
    syncPolicy?: string;
    metadata?: Record<string, unknown>;
  },
) {
  db.prepare(`
    INSERT INTO content_mounts (
      id, user_id, course_id, note_id, object_id, target_kind, target_id,
      projection_mode, sync_policy, metadata, created_at, updated_at
    )
    VALUES (
      @id, @user_id, @course_id, @note_id, @object_id, @target_kind,
      @target_id, @projection_mode, @sync_policy, @metadata, datetime('now'), datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      object_id = excluded.object_id,
      target_kind = excluded.target_kind,
      target_id = excluded.target_id,
      projection_mode = excluded.projection_mode,
      sync_policy = excluded.sync_policy,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `).run({
    id: input.id,
    user_id: userId,
    course_id: note.course_id,
    note_id: note.id,
    object_id: input.objectId,
    target_kind: input.targetKind,
    target_id: input.targetId,
    projection_mode: input.projectionMode || 'owned',
    sync_policy: input.syncPolicy || 'manual',
    metadata: stringifyJson(input.metadata || {}, {}),
  });
}

function validateBlockProjection(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  context: CanvasKindHandlerContext,
) {
  const blockId = optionalText(context.input.extension?.block_id)
    || optionalText(context.input.mount?.target_id)
    || optionalText(context.input.mount?.block_id);
  if (!blockId) throw new AppError(400, 'block_id is required for paragraph_block_projection');
  const block = db.prepare(`
    SELECT nb.id, nb.course_id
    FROM note_block_placements nbp
    JOIN note_blocks nb ON nb.id = nbp.block_id
    WHERE nbp.id = ?
      AND nbp.note_id = ?
      AND nb.id = ?
      AND nb.user_id = ?
      AND nb.status = 'active'
  `).get(context.placementId, note.id, blockId, userId) as { id: string; course_id: string } | undefined;
  if (!block) throw new AppError(404, 'Note block placement not found');
  return { block_id: block.id };
}

function validateShapeObject(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  context: CanvasKindHandlerContext,
) {
  const backing = optionalText(context.input.backing) || 'none';
  const objectClass = optionalText(context.input.object_class) || 'pure';
  if (backing !== 'note_block') {
    return { backing, object_class: objectClass };
  }

  const blockId = optionalText(context.input.extension?.block_id);
  if (!blockId) throw new AppError(400, 'block_id is required for block-backed shape');
  const mountTargetId = optionalText(context.input.mount?.target_id);
  if (mountTargetId && mountTargetId !== blockId) {
    throw new AppError(400, 'Shape content mount target must match backing block');
  }

  const block = db.prepare(`
    SELECT nb.id, nb.metadata
    FROM note_blocks nb
    JOIN note_block_placements nbp ON nbp.block_id = nb.id
    WHERE nb.id = ?
      AND nbp.note_id = ?
      AND nb.user_id = ?
      AND nb.course_id = ?
      AND nb.status = 'active'
  `).get(blockId, note.id, userId, note.course_id) as { id: string; metadata: string | null } | undefined;
  if (!block) throw new AppError(404, 'Shape backing note block not found');

  const metadata = parseJson<Record<string, unknown>>(block.metadata, {});
  if (
    metadata.projection_kind !== 'block_backed_shape'
    || metadata.shape_object_id !== context.objectId
    || metadata.render_scope !== 'canvas_object_backing'
  ) {
    throw new AppError(400, 'Shape backing block metadata is invalid');
  }

  return {
    backing,
    object_class: objectClass,
    block_id: block.id,
  };
}

function cleanupOwnedShapeBackingBlocks(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  objectId: string,
) {
  const mounts = db.prepare(`
    SELECT target_id
    FROM content_mounts
    WHERE object_id = ?
      AND user_id = ?
      AND note_id = ?
      AND target_kind = 'note_block'
      AND projection_mode = 'owned'
  `).all(objectId, userId, note.id) as { target_id: string }[];
  if (mounts.length === 0) return;
  const now = new Date().toISOString();
  const readBlock = db.prepare(`
    SELECT id, metadata
    FROM note_blocks
    WHERE id = ? AND user_id = ? AND course_id = ? AND status = 'active'
  `);
  const readPlacement = db.prepare(`
    SELECT id, order_index
    FROM note_block_placements
    WHERE note_id = ? AND block_id = ?
  `);
  const trashBlock = db.prepare(`
    UPDATE note_blocks
    SET status = 'trashed', trashed_at = ?, metadata = ?, updated_at = ?
    WHERE id = ? AND user_id = ? AND status = 'active'
  `);
  const deletePlacement = db.prepare(`
    DELETE FROM note_block_placements
    WHERE note_id = ? AND block_id = ?
  `);
  for (const mount of mounts) {
    const block = readBlock.get(mount.target_id, userId, note.course_id) as { id: string; metadata: string | null } | undefined;
    const metadata = parseJson<Record<string, unknown>>(block?.metadata, {});
    if (
      block
      && metadata.projection_kind === 'block_backed_shape'
      && metadata.shape_object_id === objectId
      && metadata.render_scope === 'canvas_object_backing'
    ) {
      const placement = readPlacement.get(note.id, block.id) as { id: string; order_index: number } | undefined;
      const nextMetadata = {
        ...metadata,
        canvas_lifecycle: {
          ...(isRecord(metadata.canvas_lifecycle) ? metadata.canvas_lifecycle : {}),
          restorable_note_id: note.id,
          restore_order_index: placement?.order_index ?? null,
          source_canvas_object_id: objectId,
        },
      };
      trashBlock.run(now, stringifyJson(nextMetadata, {}), now, block.id, userId);
      deletePlacement.run(note.id, block.id);
    }
  }
}

function liveShapeBackingOwner(
  db: Database.Database,
  userId: string,
  blockId: string,
) {
  return db.prepare(`
    SELECT co.id AS object_id, co.note_id, co.course_id
    FROM canvas_objects co
    JOIN content_mounts cm
      ON cm.object_id = co.id
      AND cm.user_id = co.user_id
      AND cm.note_id = co.note_id
      AND cm.target_kind = 'note_block'
      AND cm.target_id = ?
      AND cm.projection_mode = 'owned'
    WHERE co.user_id = ?
      AND co.status = 'active'
      AND co.kind = 'shape'
      AND co.backing = 'note_block'
      AND co.object_class = 'block_backed'
    LIMIT 1
  `).get(blockId, userId) as { object_id: string; note_id: string; course_id: string } | undefined;
}

export function assertNoteBlockStatusChangeAllowed(
  db: Database.Database,
  userId: string,
  blockId: string,
  nextStatus: string | undefined | null,
) {
  if (!nextStatus || nextStatus === 'active') return;
  const owner = liveShapeBackingOwner(db, userId, blockId);
  if (!owner) return;
  throw new AppError(
    400,
    'This note block is managed by a live Canvas shape; remove shape text or delete the shape instead.',
  );
}

function stripCanvasBackingMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const next = { ...metadata };
  if (next.render_scope === 'canvas_object_backing') delete next.render_scope;
  if (next.projection_kind === 'block_backed_shape') delete next.projection_kind;
  if (typeof next.shape_object_id === 'string') delete next.shape_object_id;
  return next;
}

export function restoreNoteBlockForCanvasLifecycle(
  db: Database.Database,
  userId: string,
  blockId: string,
) {
  const row = db.prepare(`
    SELECT id, user_id, course_id, block_type, title, content_json, plain_text, metadata, status
    FROM note_blocks
    WHERE id = ? AND user_id = ?
  `).get(blockId, userId) as {
    id: string;
    user_id: string;
    course_id: string;
    block_type: string;
    title: string | null;
    content_json: string;
    plain_text: string | null;
    metadata: string | null;
    status: string;
  } | undefined;
  if (!row) throw new AppError(404, 'Note block not found');
  const owner = liveShapeBackingOwner(db, userId, blockId);
  const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
  const lifecycle = isRecord(metadata.canvas_lifecycle) ? metadata.canvas_lifecycle : {};
  const restoredMetadata = owner ? metadata : stripCanvasBackingMetadata(metadata);
  const now = new Date().toISOString();

  return db.transaction(() => {
    db.prepare(`
      UPDATE note_blocks
      SET status = 'active', trashed_at = NULL, metadata = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(stringifyJson(restoredMetadata, {}), now, blockId, userId);

    if (!owner) {
      const restorableNoteId = optionalText(lifecycle.restorable_note_id);
      if (restorableNoteId) {
        const placementCount = db.prepare(`
          SELECT COUNT(*) AS count
          FROM note_block_placements
          WHERE note_id = ? AND block_id = ?
        `).get(restorableNoteId, blockId) as { count: number };
        if (placementCount.count === 0) {
          const nextOrder = Number((db.prepare(`
            SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order
            FROM note_block_placements
            WHERE note_id = ?
          `).get(restorableNoteId) as { next_order: number }).next_order);
          const restoreOrder = typeof lifecycle.restore_order_index === 'number'
            ? lifecycle.restore_order_index
            : nextOrder;
          db.prepare(`
            INSERT INTO note_block_placements (
              id, note_id, block_id, order_index, display_overrides_json, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, '{}', ?, ?)
          `).run(`restored-placement:${restorableNoteId}:${blockId}`, restorableNoteId, blockId, restoreOrder, now, now);
        }
      }
    }

    return {
      ...row,
      status: 'active',
      trashed_at: null,
      metadata: restoredMetadata,
    };
  })();
}

function normalizedVisualConnectorEndpoint(
  value: unknown,
  side: 'start' | 'end',
): Record<string, unknown> {
  if (!isRecord(value)) throw new AppError(400, `${side} connector endpoint is required`);
  const kind = value.kind === 'point' ? 'point' : 'object';
  if (kind === 'point') {
    return {
      kind,
      object_id: null,
      anchor: 'auto',
      x: numeric(value.x, NaN),
      y: numeric(value.y, NaN),
    };
  }
  const objectId = optionalText(value.object_id) || optionalText(value.objectId);
  if (!objectId) throw new AppError(400, `${side} connector object endpoint requires object_id`);
  return {
    kind,
    object_id: objectId,
    anchor: cleanText(value.anchor, 'auto'),
    x: null,
    y: null,
  };
}

function validateVisualConnectorObject(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  context: CanvasKindHandlerContext,
) {
  if (context.input.mount) throw new AppError(400, 'Visual connector cannot include content mounts');
  const extension = isRecord(context.input.extension) ? context.input.extension : {};
  const start = normalizedVisualConnectorEndpoint(extension.start, 'start');
  const end = normalizedVisualConnectorEndpoint(extension.end, 'end');
  const relationKind = cleanText(extension.relation_kind ?? extension.relationKind, 'visual_only');
  if (relationKind !== 'visual_only') throw new AppError(400, 'Visual connector must be visual_only');

  const objectEndpointIds = [start.object_id, end.object_id].filter((id): id is string => typeof id === 'string');
  for (const endpointObjectId of objectEndpointIds) {
    if (endpointObjectId === context.objectId) throw new AppError(400, 'Visual connector cannot point to itself');
    const endpointObject = db.prepare(`
      SELECT id
      FROM canvas_objects
      WHERE id = ?
        AND user_id = ?
        AND note_id = ?
        AND status = 'active'
    `).get(endpointObjectId, userId, note.id) as { id: string } | undefined;
    if (!endpointObject) throw new AppError(404, 'Visual connector endpoint object not found');
  }

  return {
    start_kind: start.kind,
    start_object_id: start.object_id,
    start_anchor: start.anchor,
    start_x: start.x,
    start_y: start.y,
    end_kind: end.kind,
    end_object_id: end.object_id,
    end_anchor: end.anchor,
    end_x: end.x,
    end_y: end.y,
    line_style: cleanText(extension.line_style ?? extension.lineStyle, 'solid'),
    stroke: cleanText(extension.stroke, '#94a3b8'),
    stroke_width: numeric(extension.stroke_width ?? extension.strokeWidth, 1.5),
    start_marker: cleanText(extension.start_marker ?? extension.startMarker, 'none'),
    end_marker: cleanText(extension.end_marker ?? extension.endMarker, 'arrow'),
    relation_kind: 'visual_only',
    metadata: isRecord(extension.metadata) ? extension.metadata : {},
  };
}

function validateImageObject(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  context: CanvasKindHandlerContext,
) {
  if (context.input.mount) throw new AppError(400, 'Image CanvasObject cannot include content mounts');
  const backing = optionalText(context.input.backing) || 'asset';
  const objectClass = optionalText(context.input.object_class) || 'media';
  if (backing !== 'asset') throw new AppError(400, 'Image CanvasObject must use backing=asset');
  if (objectClass !== 'media') throw new AppError(400, 'Image CanvasObject must use object_class=media');

  const extension = isRecord(context.input.extension) ? context.input.extension : {};
  const assetId = optionalText(extension.asset_id) || optionalText(extension.assetId);
  if (!assetId) throw new AppError(400, 'asset_id is required for image CanvasObject');
  const asset = db.prepare(`
    SELECT id, width, height
    FROM canvas_assets
    WHERE id = ?
      AND user_id = ?
      AND kind = 'image'
  `).get(assetId, userId) as { id: string; width: number | null; height: number | null } | undefined;
  if (!asset) throw new AppError(404, 'Canvas image asset not found');

  const fit = cleanText(extension.fit, 'contain');
  if (fit !== 'contain' && fit !== 'cover') {
    throw new AppError(400, 'Image fit must be contain or cover');
  }

  return {
    asset_id: asset.id,
    fit,
    caption: optionalText(extension.caption),
    alt_text: optionalText(extension.alt_text) || optionalText(extension.altText),
    natural_width: integer(extension.natural_width ?? extension.naturalWidth, Number(asset.width || 0)) || null,
    natural_height: integer(extension.natural_height ?? extension.naturalHeight, Number(asset.height || 0)) || null,
    metadata: isRecord(extension.metadata) ? extension.metadata : {},
  };
}

function normalizeTablePayload(extension: Record<string, unknown>): TableStructuredPayload {
  const rowsInput = Array.isArray(extension.rows) ? extension.rows.filter(isRecord) : [];
  const columnsInput = Array.isArray(extension.columns) ? extension.columns.filter(isRecord) : [];
  const cellsInput = Array.isArray(extension.cells) ? extension.cells.filter(isRecord) : [];
  if (rowsInput.length < 1 || rowsInput.length > 50) {
    throw new AppError(400, 'Table must include between 1 and 50 rows');
  }
  if (columnsInput.length < 1 || columnsInput.length > 20) {
    throw new AppError(400, 'Table must include between 1 and 20 columns');
  }
  if (cellsInput.length !== rowsInput.length * columnsInput.length) {
    throw new AppError(400, 'Table cells must cover every row and column pair exactly once');
  }

  const rows = rowsInput
    .map((row) => ({
      rowId: cleanText(row.rowId ?? row.row_id, ''),
      index: integer(row.index, -1),
      height: typeof row.height === 'number' && Number.isFinite(row.height) && row.height > 0
        ? row.height
        : undefined,
    }))
    .sort((a, b) => a.index - b.index);
  const columns = columnsInput
    .map((column) => ({
      columnId: cleanText(column.columnId ?? column.column_id, ''),
      index: integer(column.index, -1),
      width: typeof column.width === 'number' && Number.isFinite(column.width) && column.width > 0
        ? column.width
        : undefined,
      label: optionalText(column.label) || undefined,
    }))
    .sort((a, b) => a.index - b.index);

  rows.forEach((row, index) => {
    if (!row.rowId || row.index !== index) {
      throw new AppError(400, 'Table row indexes must be continuous from 0');
    }
  });
  columns.forEach((column, index) => {
    if (!column.columnId || column.index !== index) {
      throw new AppError(400, 'Table column indexes must be continuous from 0');
    }
  });

  const rowIds = new Set(rows.map((row) => row.rowId));
  const columnIds = new Set(columns.map((column) => column.columnId));
  const seenPairs = new Set<string>();
  const cells = cellsInput
    .map((cell) => {
      const rowId = cleanText(cell.rowId ?? cell.row_id, '');
      const columnId = cleanText(cell.columnId ?? cell.column_id, '');
      const normalized: TableCellModel = {
        cellId: cleanText(cell.cellId ?? cell.cell_id, ''),
        rowId,
        columnId,
        rowIndex: integer(cell.rowIndex ?? cell.row_index, -1),
        columnIndex: integer(cell.columnIndex ?? cell.column_index, -1),
        text: typeof cell.text === 'string' ? cell.text.slice(0, 2000) : '',
        valueType: 'text',
      };
      if (!normalized.cellId) throw new AppError(400, 'Table cell requires cellId');
      if (!rowIds.has(rowId)) throw new AppError(400, 'Table cell rowId must reference an existing row');
      if (!columnIds.has(columnId)) throw new AppError(400, 'Table cell columnId must reference an existing column');
      const expectedRowIndex = rows.find((row) => row.rowId === rowId)?.index;
      const expectedColumnIndex = columns.find((column) => column.columnId === columnId)?.index;
      if (normalized.rowIndex !== expectedRowIndex || normalized.columnIndex !== expectedColumnIndex) {
        throw new AppError(400, 'Table cell indexes must match row and column indexes');
      }
      const pairKey = `${rowId}:${columnId}`;
      if (seenPairs.has(pairKey)) {
        throw new AppError(400, 'Table cells cannot duplicate a row and column pair');
      }
      seenPairs.add(pairKey);
      return normalized;
    })
    .sort((a, b) => (a.rowIndex - b.rowIndex) || (a.columnIndex - b.columnIndex));

  return {
    version: 'table.v1',
    rows,
    columns,
    cells,
  };
}

function validateTableObject(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  context: CanvasKindHandlerContext,
) {
  void db;
  void userId;
  void note;
  if (context.input.mount) throw new AppError(400, 'Table CanvasObject cannot include content mounts');
  const backing = optionalText(context.input.backing) || 'structured_object';
  const objectClass = optionalText(context.input.object_class) || 'structured';
  if (backing !== 'structured_object') {
    throw new AppError(400, 'Table CanvasObject must use backing=structured_object');
  }
  if (objectClass !== 'structured') {
    throw new AppError(400, 'Table CanvasObject must use object_class=structured');
  }
  const extension = isRecord(context.input.extension) ? context.input.extension : {};
  const structuredKind = optionalText(extension.structured_kind) || optionalText(extension.structuredKind) || 'table';
  const schemaVersion = optionalText(extension.schema_version) || optionalText(extension.schemaVersion) || 'table.v1';
  if (structuredKind !== 'table') throw new AppError(400, 'Structured object extension must use structured_kind=table');
  if (schemaVersion !== 'table.v1') throw new AppError(400, 'Table structured object must use schema_version=table.v1');
  const payload = normalizeTablePayload(extension);
  return {
    structured_kind: 'table',
    schema_version: 'table.v1',
    row_count: payload.rows.length,
    column_count: payload.columns.length,
    payload,
    metadata: isRecord(extension.metadata) ? extension.metadata : {},
  };
}

function upsertVisualConnectorExtension(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  objectId: string,
  validation: Record<string, unknown>,
) {
  db.prepare(`
    INSERT INTO visual_connector_extensions (
      object_id, user_id, course_id, note_id, canvas_id,
      start_kind, start_object_id, start_anchor, start_x, start_y,
      end_kind, end_object_id, end_anchor, end_x, end_y,
      line_style, stroke, stroke_width, start_marker, end_marker,
      relation_kind, metadata, created_at, updated_at
    )
    VALUES (
      @object_id, @user_id, @course_id, @note_id, @canvas_id,
      @start_kind, @start_object_id, @start_anchor, @start_x, @start_y,
      @end_kind, @end_object_id, @end_anchor, @end_x, @end_y,
      @line_style, @stroke, @stroke_width, @start_marker, @end_marker,
      'visual_only', @metadata, datetime('now'), datetime('now')
    )
    ON CONFLICT(object_id) DO UPDATE SET
      canvas_id = excluded.canvas_id,
      start_kind = excluded.start_kind,
      start_object_id = excluded.start_object_id,
      start_anchor = excluded.start_anchor,
      start_x = excluded.start_x,
      start_y = excluded.start_y,
      end_kind = excluded.end_kind,
      end_object_id = excluded.end_object_id,
      end_anchor = excluded.end_anchor,
      end_x = excluded.end_x,
      end_y = excluded.end_y,
      line_style = excluded.line_style,
      stroke = excluded.stroke,
      stroke_width = excluded.stroke_width,
      start_marker = excluded.start_marker,
      end_marker = excluded.end_marker,
      relation_kind = 'visual_only',
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `).run({
    object_id: objectId,
    user_id: userId,
    course_id: note.course_id,
    note_id: note.id,
    canvas_id: note.id,
    start_kind: validation.start_kind,
    start_object_id: validation.start_object_id || null,
    start_anchor: validation.start_anchor || 'auto',
    start_x: validation.start_x ?? null,
    start_y: validation.start_y ?? null,
    end_kind: validation.end_kind,
    end_object_id: validation.end_object_id || null,
    end_anchor: validation.end_anchor || 'auto',
    end_x: validation.end_x ?? null,
    end_y: validation.end_y ?? null,
    line_style: validation.line_style || 'solid',
    stroke: validation.stroke || '#94a3b8',
    stroke_width: validation.stroke_width || 1.5,
    start_marker: validation.start_marker || 'none',
    end_marker: validation.end_marker || 'arrow',
    metadata: stringifyJson(validation.metadata || {}, {}),
  });
}

function upsertImageObjectExtension(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  objectId: string,
  validation: Record<string, unknown>,
) {
  // Current image upload flows mint a new CanvasObject id for each image.
  // If an in-place image replacement flow ever reuses objectId with a new
  // asset_id, release the previous asset through releaseAssetReference first.
  db.prepare(`
    INSERT INTO image_object_extensions (
      object_id, user_id, course_id, note_id, canvas_id, asset_id,
      fit, caption, alt_text, natural_width, natural_height, metadata,
      created_at, updated_at
    )
    VALUES (
      @object_id, @user_id, @course_id, @note_id, @canvas_id, @asset_id,
      @fit, @caption, @alt_text, @natural_width, @natural_height, @metadata,
      datetime('now'), datetime('now')
    )
    ON CONFLICT(object_id) DO UPDATE SET
      canvas_id = excluded.canvas_id,
      asset_id = excluded.asset_id,
      fit = excluded.fit,
      caption = excluded.caption,
      alt_text = excluded.alt_text,
      natural_width = excluded.natural_width,
      natural_height = excluded.natural_height,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `).run({
    object_id: objectId,
    user_id: userId,
    course_id: note.course_id,
    note_id: note.id,
    canvas_id: note.id,
    asset_id: validation.asset_id,
    fit: validation.fit || 'contain',
    caption: validation.caption || null,
    alt_text: validation.alt_text || null,
    natural_width: validation.natural_width ?? null,
    natural_height: validation.natural_height ?? null,
    metadata: stringifyJson(validation.metadata || {}, {}),
  });
}

function upsertStructuredObjectExtension(
  db: Database.Database,
  userId: string,
  note: OwnedNote,
  objectId: string,
  validation: Record<string, unknown>,
) {
  const payload = validation.payload as TableStructuredPayload;
  db.prepare(`
    INSERT INTO structured_object_extensions (
      object_id, user_id, course_id, note_id, canvas_id,
      structured_kind, schema_version, row_count, column_count,
      data_json, metadata, created_at, updated_at
    )
    VALUES (
      @object_id, @user_id, @course_id, @note_id, @canvas_id,
      'table', 'table.v1', @row_count, @column_count,
      @data_json, @metadata, datetime('now'), datetime('now')
    )
    ON CONFLICT(object_id) DO UPDATE SET
      canvas_id = excluded.canvas_id,
      structured_kind = 'table',
      schema_version = 'table.v1',
      row_count = excluded.row_count,
      column_count = excluded.column_count,
      data_json = excluded.data_json,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `).run({
    object_id: objectId,
    user_id: userId,
    course_id: note.course_id,
    note_id: note.id,
    canvas_id: note.id,
    row_count: validation.row_count || payload.rows.length,
    column_count: validation.column_count || payload.columns.length,
    data_json: stringifyJson(payload, { version: 'table.v1', rows: [], columns: [], cells: [] }),
    metadata: stringifyJson(validation.metadata || {}, {}),
  });
}

const KIND_HANDLERS: Record<string, CanvasKindHandler> = {
  paragraph_block_projection: {
    kind: 'paragraph_block_projection',
    backing: 'note_block',
    objectClass: 'block_backed',
    source: 'note_block_layout',
    validate: validateBlockProjection,
    writeExtension(db, userId, note, context, validation) {
      const blockId = String(validation.block_id);
      const mountId = optionalText(context.input.mount?.mount_id) || `content-mount:${context.placementId}`;
      db.prepare(`
        DELETE FROM content_mounts
        WHERE object_id = ?
          AND user_id = ?
          AND note_id = ?
          AND target_kind = 'note_block'
          AND id != ?
      `).run(context.objectId, userId, note.id, mountId);
      upsertContentMount(db, userId, note, {
        id: mountId,
        objectId: context.objectId,
        targetKind: 'note_block',
        targetId: blockId,
        projectionMode: optionalText(context.input.mount?.projection_mode) || 'owned',
        syncPolicy: optionalText(context.input.mount?.sync_policy) || 'manual',
        metadata: { source: 'note_block_layout' },
      });
    },
  },
  shape: {
    kind: 'shape',
    backing: 'none',
    objectClass: 'pure',
    source: 'shape_object',
    validate: validateShapeObject,
    writeExtension(db, userId, note, context, validation) {
      if (validation.backing !== 'note_block') {
        cleanupOwnedShapeBackingBlocks(db, userId, note, context.objectId);
        db.prepare(`
          DELETE FROM content_mounts
          WHERE object_id = ?
            AND user_id = ?
            AND note_id = ?
            AND target_kind = 'note_block'
        `).run(context.objectId, userId, note.id);
        return;
      }
      const blockId = String(validation.block_id);
      const mountId = optionalText(context.input.mount?.mount_id) || `${context.objectId}:mount:shape-text`;
      db.prepare(`
        DELETE FROM content_mounts
        WHERE object_id = ?
          AND user_id = ?
          AND note_id = ?
          AND target_kind = 'note_block'
          AND id != ?
      `).run(context.objectId, userId, note.id, mountId);
      upsertContentMount(db, userId, note, {
        id: mountId,
        objectId: context.objectId,
        targetKind: 'note_block',
        targetId: blockId,
        projectionMode: 'owned',
        syncPolicy: 'manual',
        metadata: { source: 'block_backed_shape' },
      });
    },
    cleanupOnDelete(db, userId, note, objectId) {
      cleanupOwnedShapeBackingBlocks(db, userId, note, objectId);
    },
  },
  visual_connector: {
    kind: 'visual_connector',
    backing: 'none',
    objectClass: 'pure',
    source: 'visual_connector',
    validate: validateVisualConnectorObject,
    writeExtension(db, userId, note, context, validation) {
      upsertVisualConnectorExtension(db, userId, note, context.objectId, validation);
    },
  },
  image: {
    kind: 'image',
    backing: 'asset',
    objectClass: 'media',
    source: 'canvas_image_asset',
    validate: validateImageObject,
    writeExtension(db, userId, note, context, validation) {
      upsertImageObjectExtension(db, userId, note, context.objectId, validation);
    },
    cleanupOnDelete(db, userId, note, objectId) {
      const imageExtension = db.prepare(`
        SELECT asset_id
        FROM image_object_extensions
        WHERE object_id = ? AND user_id = ? AND note_id = ?
      `).get(objectId, userId, note.id) as { asset_id: string } | undefined;
      if (!imageExtension) return;
      db.prepare(`
        DELETE FROM image_object_extensions
        WHERE object_id = ? AND user_id = ? AND note_id = ?
      `).run(objectId, userId, note.id);
      const decision = releaseAssetReference(db, userId, imageExtension.asset_id, objectId);
      return decision.cleanup_task ? [decision.cleanup_task] : [];
    },
  },
  table: {
    kind: 'table',
    backing: 'structured_object',
    objectClass: 'structured',
    source: 'structured_table',
    validate: validateTableObject,
    writeExtension(db, userId, note, context, validation) {
      upsertStructuredObjectExtension(db, userId, note, context.objectId, validation);
    },
  },
  __test_probe: {
    kind: '__test_probe',
    backing: 'none',
    objectClass: 'pure',
    source: 'test_probe',
  },
};

function getCanvasKindHandler(kind: string): CanvasKindHandler {
  const handler = KIND_HANDLERS[kind];
  if (!handler) throw new AppError(400, `Unsupported canvas object kind: ${kind}`);
  return handler;
}

function getSavedCanvasObject(
  db: Database.Database,
  userId: string,
  noteId: string,
  objectId: string,
) {
  const object = db.prepare(`
    SELECT id, canvas_id, kind, backing, object_class, status, source_json, metadata
    FROM canvas_objects
    WHERE id = ? AND user_id = ? AND note_id = ? AND status = 'active'
  `).get(objectId, userId, noteId) as CanvasObjectRow | undefined;
  if (!object) throw new AppError(404, 'Canvas object not found');
  const placements = db.prepare(`
    SELECT *
    FROM canvas_placements
    WHERE object_id = ? AND user_id = ? AND note_id = ?
    ORDER BY z_index ASC, id ASC
  `).all(objectId, userId, noteId) as CanvasPlacementRow[];
  const mounts = db.prepare(`
    SELECT id, object_id, target_kind, target_id, projection_mode, sync_policy, metadata
    FROM content_mounts
    WHERE object_id = ? AND user_id = ? AND note_id = ?
    ORDER BY id ASC
  `).all(objectId, userId, noteId) as ContentMountRow[];
  const primaryPlacement = placements[0];
  const primaryMount = mounts[0];
  const result: Record<string, unknown> = {
    canvasObject: canvasObjectFromRow(object),
    placements: placements.map(canvasPlacementFromRow),
    contentMounts: mounts.map(contentMountFromRow),
  };
  if (primaryPlacement) result.placement = canvasPlacementFromRow(primaryPlacement);
  if (primaryMount) result.contentMount = contentMountFromRow(primaryMount);
  if (object.kind === 'paragraph_block_projection' && primaryPlacement && primaryMount) {
    result.blockLayout = {
      placement_id: primaryPlacement.id,
      block_id: primaryMount.target_id,
      layout: layoutFromPlacement(primaryPlacement),
    };
  }
  if (object.kind === 'visual_connector') {
    const connector = db.prepare(`
      SELECT *
      FROM visual_connector_extensions
      WHERE object_id = ? AND user_id = ? AND note_id = ?
    `).get(objectId, userId, noteId) as VisualConnectorExtensionRow | undefined;
    if (connector) result.visualConnector = visualConnectorFromRow(connector);
  }
  if (object.kind === 'image') {
    const imageObject = db.prepare(`
      SELECT
        ioe.*,
        ca.kind AS asset_kind,
        ca.storage_kind,
        ca.storage_key,
        ca.filename,
        ca.mime_type,
        ca.byte_size,
        ca.width,
        ca.height,
        ca.sha256,
        ca.metadata AS asset_metadata
      FROM image_object_extensions ioe
      JOIN canvas_assets ca
        ON ca.id = ioe.asset_id
        AND ca.user_id = ioe.user_id
      WHERE ioe.object_id = ?
        AND ioe.user_id = ?
        AND ioe.note_id = ?
    `).get(objectId, userId, noteId) as ImageObjectExtensionRow | undefined;
    if (imageObject) result.imageObject = imageObjectFromRow(imageObject);
  }
  if (object.kind === 'table') {
    const structuredObject = db.prepare(`
      SELECT *
      FROM structured_object_extensions
      WHERE object_id = ?
        AND user_id = ?
        AND note_id = ?
    `).get(objectId, userId, noteId) as StructuredObjectExtensionRow | undefined;
    if (structuredObject) result.structuredObject = structuredObjectFromRow(structuredObject);
  }
  return result;
}

function hydratePageFrameCollection(
  collection: PageCollectionRow | undefined,
  frames: Array<PageFrameExtensionRow & CanvasPlacementRow>,
) {
  if (!collection && frames.length === 0) return null;
  const pageFrames = frames
    .sort((a, b) => Number(a.z_index || 0) - Number(b.z_index || 0))
    .map((row) => {
      const hasExtension = Boolean(row.extension_object_id);
      const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
      const resolvedMetadata = hasExtension
        ? metadata
        : {
          ...metadata,
          recovered: true,
          degraded: true,
          recovered_reason: 'missing_extension_at_read',
        };
      return {
        id: row.frame_id,
        role: row.frame_id === collection?.primary_frame_id ? 'primary_page_frame' : 'secondary_page_frame',
        templateId: row.template_id || undefined,
        pageSize: row.page_size || undefined,
        background: parseJson<Record<string, unknown> | undefined>(row.background_json, undefined),
        exportable: row.exportable !== 0,
        contentInset: parseJson<Record<string, unknown>>(row.content_inset_json, {
          top: 96,
          right: 72,
          bottom: 96,
          left: 72,
        }),
        x: Number(row.x || 0),
        y: Number(row.y || 0),
        width: Number(row.width || 0),
        height: Number(row.height || 0),
        metadata: Object.keys(resolvedMetadata).length > 0 ? resolvedMetadata : undefined,
      };
    });

  return {
    pageFrames,
    pageStacks: parseJson<unknown[]>(collection?.page_stacks_json, []),
    primaryFrameId: collection?.primary_frame_id || pageFrames[0]?.id || null,
    primaryStackId: collection?.primary_stack_id || null,
    selectedFrameId: collection?.selected_frame_id || collection?.primary_frame_id || pageFrames[0]?.id || null,
    selectedStackId: collection?.selected_stack_id || collection?.primary_stack_id || null,
  };
}

function listPageFrameRows(db: Database.Database, userId: string, noteId: string) {
  return db.prepare(`
    SELECT
      COALESCE(pfe.frame_id, cp.frame_id) AS frame_id,
      pfe.object_id AS extension_object_id,
      co.id AS object_id,
      co.canvas_id AS canvas_id,
      pfe.page_stack_id,
      pfe.page_index,
      pfe.page_size,
      pfe.content_inset_json,
      pfe.typography_json,
      pfe.background_json,
      pfe.template_id,
      pfe.template_json,
      pfe.slots_json,
      COALESCE(pfe.exportable, 1) AS exportable,
      pfe.metadata,
      cp.id AS id,
      cp.x,
      cp.y,
      cp.width,
      cp.height,
      cp.rotation,
      cp.surface,
      cp.boundary_role,
      cp.z_index,
      cp.snap_state_json,
      cp.visibility_state,
      cp.render_visibility
    FROM canvas_objects co
    JOIN canvas_placements cp
      ON cp.object_id = co.id
      AND cp.user_id = co.user_id
      AND cp.note_id = co.note_id
    LEFT JOIN page_frame_extensions pfe
      ON pfe.object_id = co.id
      AND pfe.user_id = co.user_id
      AND pfe.note_id = co.note_id
    WHERE co.user_id = ?
      AND co.note_id = ?
      AND co.kind = 'page_frame'
      AND co.status = 'active'
      AND COALESCE(pfe.frame_id, cp.frame_id) IS NOT NULL
    ORDER BY cp.z_index ASC, COALESCE(pfe.frame_id, cp.frame_id) ASC
  `).all(userId, noteId) as Array<PageFrameExtensionRow & CanvasPlacementRow>;
}

export function getNoteCanvasPersistence(
  db: Database.Database,
  userId: string,
  noteId: string,
) {
  getOwnedNote(db, userId, noteId);
  const objectRows = db.prepare(`
    SELECT id, canvas_id, kind, backing, object_class, status, source_json, metadata
    FROM canvas_objects
    WHERE user_id = ? AND note_id = ? AND status = 'active'
    ORDER BY kind ASC, id ASC
  `).all(userId, noteId) as CanvasObjectRow[];
  const placementRows = db.prepare(`
    SELECT *
    FROM canvas_placements
    WHERE user_id = ? AND note_id = ?
    ORDER BY z_index ASC, id ASC
  `).all(userId, noteId) as CanvasPlacementRow[];
  const mountRows = db.prepare(`
    SELECT id, object_id, target_kind, target_id, projection_mode, sync_policy, metadata
    FROM content_mounts
    WHERE user_id = ? AND note_id = ?
    ORDER BY id ASC
  `).all(userId, noteId) as ContentMountRow[];
  const inactiveBackingRows = db.prepare(`
    SELECT DISTINCT co.id, co.kind
    FROM canvas_objects co
    JOIN content_mounts cm
      ON cm.object_id = co.id
      AND cm.user_id = co.user_id
      AND cm.note_id = co.note_id
      AND cm.target_kind = 'note_block'
    LEFT JOIN note_blocks nb
      ON nb.id = cm.target_id
      AND nb.user_id = co.user_id
    WHERE co.user_id = ?
      AND co.note_id = ?
      AND co.status = 'active'
      AND co.backing = 'note_block'
      AND (nb.id IS NULL OR nb.status != 'active')
  `).all(userId, noteId) as Array<{ id: string; kind: string }>;
  const inactiveProjectionObjectIds = new Set(
    inactiveBackingRows
      .filter((row) => row.kind === 'paragraph_block_projection')
      .map((row) => row.id),
  );
  const deadShapeTextObjectIds = new Set(
    inactiveBackingRows
      .filter((row) => row.kind === 'shape')
      .map((row) => row.id),
  );
  const liveObjectRows = objectRows.filter((row) => !inactiveProjectionObjectIds.has(row.id));
  const livePlacementRows = placementRows.filter((row) => !inactiveProjectionObjectIds.has(row.object_id));
  const liveMountRows = mountRows.filter((row) => (
    !inactiveProjectionObjectIds.has(row.object_id)
    && !deadShapeTextObjectIds.has(row.object_id)
  ));
  const connectorRows = db.prepare(`
    SELECT *
    FROM visual_connector_extensions
    WHERE user_id = ? AND note_id = ?
    ORDER BY object_id ASC
  `).all(userId, noteId) as VisualConnectorExtensionRow[];
  const imageRows = db.prepare(`
    SELECT
      ioe.*,
      ca.kind AS asset_kind,
      ca.storage_kind,
      ca.storage_key,
      ca.filename,
      ca.mime_type,
      ca.byte_size,
      ca.width,
      ca.height,
      ca.sha256,
      ca.metadata AS asset_metadata
    FROM image_object_extensions ioe
    JOIN canvas_assets ca
      ON ca.id = ioe.asset_id
      AND ca.user_id = ioe.user_id
    WHERE ioe.user_id = ?
      AND ioe.note_id = ?
    ORDER BY ioe.object_id ASC
  `).all(userId, noteId) as ImageObjectExtensionRow[];
  const structuredRows = db.prepare(`
    SELECT *
    FROM structured_object_extensions
    WHERE user_id = ?
      AND note_id = ?
    ORDER BY object_id ASC
  `).all(userId, noteId) as StructuredObjectExtensionRow[];
  const collection = db.prepare(`
    SELECT *
    FROM canvas_page_collections
    WHERE user_id = ? AND note_id = ?
  `).get(userId, noteId) as PageCollectionRow | undefined;
  const frames = listPageFrameRows(db, userId, noteId);
  const blockRows = db.prepare(`
    SELECT
      cp.*,
      cm.target_id AS block_id
    FROM canvas_placements cp
    JOIN canvas_objects co ON co.id = cp.object_id
    JOIN content_mounts cm
      ON cm.object_id = co.id
      AND cm.target_kind = 'note_block'
      AND cm.note_id = cp.note_id
    JOIN note_blocks nb
      ON nb.id = cm.target_id
      AND nb.user_id = cp.user_id
      AND nb.status = 'active'
    WHERE cp.user_id = ?
      AND cp.note_id = ?
      AND co.kind = 'paragraph_block_projection'
      AND co.status = 'active'
    ORDER BY cp.z_index ASC, cp.id ASC
  `).all(userId, noteId) as BlockPlacementRow[];

  return {
    canvasObjects: liveObjectRows.map(canvasObjectFromRow),
    canvasPlacements: livePlacementRows.map(canvasPlacementFromRow),
    contentMounts: liveMountRows.map(contentMountFromRow),
    visualConnectors: connectorRows.map(visualConnectorFromRow),
    imageObjects: imageRows.map(imageObjectFromRow),
    structuredObjects: structuredRows.map(structuredObjectFromRow),
    pageFrameCollection: hydratePageFrameCollection(collection, frames),
    blockLayouts: blockRows.map((row) => ({
      placement_id: row.id,
      block_id: row.block_id,
      layout: layoutFromPlacement(row),
    })),
  };
}

export function savePageFrameCollection(
  db: Database.Database,
  userId: string,
  noteId: string,
  collectionInput: Record<string, unknown>,
) {
  const note = getOwnedNote(db, userId, noteId);
  const pageFrames = Array.isArray(collectionInput.pageFrames)
    ? collectionInput.pageFrames.filter(isRecord)
    : [];
  const pageStacks = Array.isArray(collectionInput.pageStacks)
    ? collectionInput.pageStacks.filter(isRecord)
    : [];
  const primaryFrameId = optionalText(collectionInput.primaryFrameId)
    || optionalText(pageFrames[0]?.id);
  const selectedFrameId = optionalText(collectionInput.selectedFrameId) || primaryFrameId;
  const canvasId = note.id;

  return db.transaction(() => {
    const existingObjectIds = (db.prepare(`
      SELECT id
      FROM canvas_objects
      WHERE user_id = ? AND note_id = ? AND kind = 'page_frame'
    `).all(userId, note.id) as Array<{ id: string }>).map((row) => row.id);
    const deleteObject = db.prepare('DELETE FROM canvas_objects WHERE id = ? AND user_id = ?');
    for (const objectId of existingObjectIds) {
      deleteObject.run(objectId, userId);
    }

    db.prepare(`
      INSERT INTO canvas_page_collections (
        note_id, user_id, course_id, canvas_id, primary_frame_id, selected_frame_id,
        primary_stack_id, selected_stack_id, page_stacks_json, metadata,
        created_at, updated_at
      )
      VALUES (
        @note_id, @user_id, @course_id, @canvas_id, @primary_frame_id, @selected_frame_id,
        @primary_stack_id, @selected_stack_id, @page_stacks_json, @metadata,
        datetime('now'), datetime('now')
      )
      ON CONFLICT(note_id) DO UPDATE SET
        canvas_id = excluded.canvas_id,
        primary_frame_id = excluded.primary_frame_id,
        selected_frame_id = excluded.selected_frame_id,
        primary_stack_id = excluded.primary_stack_id,
        selected_stack_id = excluded.selected_stack_id,
        page_stacks_json = excluded.page_stacks_json,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `).run({
      note_id: note.id,
      user_id: userId,
      course_id: note.course_id,
      canvas_id: canvasId,
      primary_frame_id: primaryFrameId,
      selected_frame_id: selectedFrameId,
      primary_stack_id: optionalText(collectionInput.primaryStackId),
      selected_stack_id: optionalText(collectionInput.selectedStackId),
      page_stacks_json: stringifyJson(pageStacks, []),
      metadata: stringifyJson({ source: 'entity' }, {}),
    });

    const stackByFrame = new Map<string, { stackId: string; index: number }>();
    pageStacks.forEach((stack) => {
      if (typeof stack.id !== 'string' || !Array.isArray(stack.frameIds)) return;
      const stackId = stack.id;
      stack.frameIds.forEach((frameId, index) => {
        if (typeof frameId === 'string') stackByFrame.set(frameId, { stackId, index });
      });
    });

    const insertObject = db.prepare(`
      INSERT INTO canvas_objects (
        id, user_id, course_id, note_id, canvas_id, kind, backing, object_class,
        status, source_json, metadata, created_at, updated_at
      )
      VALUES (
        @id, @user_id, @course_id, @note_id, @canvas_id, 'page_frame', 'none',
        'pure', 'active', @source_json, @metadata, datetime('now'), datetime('now')
      )
    `);
    const insertPlacement = db.prepare(`
      INSERT INTO canvas_placements (
        id, user_id, course_id, note_id, object_id, canvas_id,
        x, y, width, height, rotation, frame_id, surface, boundary_role,
        z_index, snap_state_json, visibility_state, render_visibility, metadata,
        created_at, updated_at
      )
      VALUES (
        @id, @user_id, @course_id, @note_id, @object_id, @canvas_id,
        @x, @y, @width, @height, 0, @frame_id, 'formal_page', 'inside',
        @z_index, '{}', 'normal', 'visible', @metadata,
        datetime('now'), datetime('now')
      )
    `);
    const insertExtension = db.prepare(`
      INSERT INTO page_frame_extensions (
        frame_id, user_id, course_id, note_id, object_id, canvas_id,
        page_stack_id, page_index, page_size, content_inset_json,
        typography_json, background_json, template_id, template_json,
        slots_json, exportable, metadata, created_at, updated_at
      )
      VALUES (
        @frame_id, @user_id, @course_id, @note_id, @object_id, @canvas_id,
        @page_stack_id, @page_index, @page_size, @content_inset_json,
        @typography_json, @background_json, @template_id, @template_json,
        @slots_json, @exportable, @metadata, datetime('now'), datetime('now')
      )
    `);

    pageFrames.forEach((frame, index) => {
      const frameId = cleanText(frame.id, `page-frame-${index + 1}`);
      const objectId = pageFrameObjectId(note.id, frameId);
      const stackInfo = stackByFrame.get(frameId);
      const extensionMetadata = isRecord(frame.metadata)
        ? { ...frame.metadata, role: optionalText(frame.role) }
        : { role: optionalText(frame.role) };
      insertObject.run({
        id: objectId,
        user_id: userId,
        course_id: note.course_id,
        note_id: note.id,
        canvas_id: canvasId,
        source_json: stringifyJson({ source: 'page_frame_collection' }, {}),
        metadata: stringifyJson({ frame_id: frameId }, {}),
      });
      insertPlacement.run({
        id: pageFramePlacementId(note.id, frameId),
        user_id: userId,
        course_id: note.course_id,
        note_id: note.id,
        object_id: objectId,
        canvas_id: canvasId,
        x: numeric(frame.x, 0),
        y: numeric(frame.y, 0),
        width: numeric(frame.width, 0),
        height: numeric(frame.height, 0),
        frame_id: frameId,
        z_index: index,
        metadata: stringifyJson({ placement_kind: 'page_frame' }, {}),
      });
      insertExtension.run({
        frame_id: frameId,
        user_id: userId,
        course_id: note.course_id,
        note_id: note.id,
        object_id: objectId,
        canvas_id: canvasId,
        page_stack_id: stackInfo?.stackId || null,
        page_index: stackInfo?.index ?? null,
        page_size: optionalText(frame.pageSize),
        content_inset_json: stringifyJson(frame.contentInset, {}),
        typography_json: stringifyJson(frame.documentTypography, {}),
        background_json: stringifyJson(frame.background, {}),
        template_id: optionalText(frame.templateId),
        template_json: stringifyJson(frame.template, {}),
        slots_json: stringifyJson(frame.slots, {}),
        exportable: frame.exportable === false ? 0 : 1,
        metadata: stringifyJson(extensionMetadata, {}),
      });
    });

    db.prepare('UPDATE notes SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
      .run(note.id, userId);

    return getNoteCanvasPersistence(db, userId, note.id).pageFrameCollection;
  })();
}

export function saveCanvasObject(
  db: Database.Database,
  userId: string,
  noteId: string,
  objectId: string,
  input: GenericCanvasObjectInput,
) {
  const note = getOwnedNote(db, userId, noteId);
  if (input.kind === 'page_frame') {
    throw new AppError(400, 'PageFrame objects must be saved through page-frame-collection');
  }
  const existing = db.prepare(`
    SELECT kind
    FROM canvas_objects
    WHERE id = ? AND user_id = ? AND note_id = ? AND status = 'active'
  `).get(objectId, userId, note.id) as { kind: string } | undefined;
  if (existing?.kind === 'page_frame') {
    throw new AppError(400, 'PageFrame objects must be saved through page-frame-collection');
  }
  if (existing && existing.kind !== input.kind) {
    throw new AppError(400, 'Canvas object kind cannot be changed');
  }
  const handler = getCanvasKindHandler(input.kind);
  const placementInput = isRecord(input.placement) ? input.placement : {};
  const placementId = cleanText(placementInput.placement_id, `${objectId}:placement`);
  const context: CanvasKindHandlerContext = { objectId, placementId, input };

  return db.transaction(() => {
    const validation = handler.validate?.(db, userId, note, context) || {};
    const placement = normalizePlacementForWrite(placementInput, objectId, note.id, placementId);
    upsertCanvasObjectCore(db, userId, note, objectId, handler, input);
    upsertCanvasPlacementCore(db, userId, note, placement);
    handler.writeExtension?.(db, userId, note, context, validation);

    db.prepare('UPDATE notes SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
      .run(note.id, userId);

    return getSavedCanvasObject(db, userId, note.id, objectId);
  })();
}

export function deleteCanvasObject(
  db: Database.Database,
  userId: string,
  noteId: string,
  objectId: string,
) {
  const note = getOwnedNote(db, userId, noteId);
  const object = db.prepare(`
    SELECT id, kind
    FROM canvas_objects
    WHERE id = ? AND user_id = ? AND note_id = ? AND status = 'active'
  `).get(objectId, userId, note.id) as { id: string; kind: string } | undefined;
  if (!object) throw new AppError(404, 'Canvas object not found');
  if (object.kind === 'page_frame') {
    throw new AppError(400, 'PageFrame objects must be deleted through page-frame-collection');
  }

  const cleanupTasks: ManagedFileTask[] = [];
  const result = db.transaction(() => {
    const referencingConnectors = db.prepare(`
      SELECT object_id
      FROM visual_connector_extensions
      WHERE user_id = ?
        AND note_id = ?
        AND (start_object_id = ? OR end_object_id = ?)
    `).all(userId, note.id, objectId, objectId) as { object_id: string }[];
    for (const connector of referencingConnectors) {
      db.prepare(`
        UPDATE annotation_ranges
        SET canvas_object_id = NULL
        WHERE user_id = ? AND note_id = ? AND canvas_object_id = ?
      `).run(userId, note.id, connector.object_id);
      db.prepare(`
        UPDATE content_group_members
        SET target_id = NULL, source_sync_status = 'stale', updated_at = datetime('now')
        WHERE user_id = ? AND note_id = ? AND kind = 'canvas_object' AND target_id = ?
      `).run(userId, note.id, connector.object_id);
      db.prepare(`
        DELETE FROM canvas_objects
        WHERE id = ? AND user_id = ? AND note_id = ? AND kind = 'visual_connector'
      `).run(connector.object_id, userId, note.id);
    }
    const handler = KIND_HANDLERS[object.kind];
    const handlerCleanup = handler?.cleanupOnDelete?.(db, userId, note, objectId);
    if (handlerCleanup) cleanupTasks.push(...handlerCleanup);
    db.prepare(`
      UPDATE annotation_ranges
      SET canvas_object_id = NULL
      WHERE user_id = ? AND note_id = ? AND canvas_object_id = ?
    `).run(userId, note.id, objectId);
    db.prepare(`
      UPDATE content_group_members
      SET target_id = NULL, source_sync_status = 'stale', updated_at = datetime('now')
      WHERE user_id = ? AND note_id = ? AND kind = 'canvas_object' AND target_id = ?
    `).run(userId, note.id, objectId);
    const deleted = db.prepare(`
      DELETE FROM canvas_objects
      WHERE id = ? AND user_id = ? AND note_id = ?
    `).run(objectId, userId, note.id);
    db.prepare('UPDATE notes SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
      .run(note.id, userId);
    return {
      object_id: objectId,
      kind: object.kind,
      deleted: deleted.changes > 0,
    };
  })();
  finalizeCanvasAssetCleanup(db, cleanupTasks);
  return result;
}

export function saveBlockCanvasPlacement(
  db: Database.Database,
  userId: string,
  noteId: string,
  placementId: string,
  input: { block_id: string; layout: Record<string, unknown> },
) {
  const layout = isRecord(input.layout) ? input.layout : {};
  const objectId = blockProjectionObjectId(noteId, placementId);
  const saved = saveCanvasObject(db, userId, noteId, objectId, {
    kind: 'paragraph_block_projection',
    extension: { block_id: input.block_id },
    placement: {
      ...layout,
      placement_id: placementId,
    },
  });
  return db.transaction(() => {
    const note = getOwnedNote(db, userId, noteId);
    const overridesRow = db.prepare(`
      SELECT display_overrides_json
      FROM note_block_placements
      WHERE id = ? AND note_id = ?
    `).get(placementId, note.id) as { display_overrides_json: string | null } | undefined;
    const overrides = parseJson<Record<string, unknown>>(overridesRow?.display_overrides_json, {});
    if (Object.prototype.hasOwnProperty.call(overrides, 'better_notebook_layout')) {
      delete overrides.better_notebook_layout;
      db.prepare(`
        UPDATE note_block_placements
        SET display_overrides_json = ?, updated_at = datetime('now')
        WHERE id = ? AND note_id = ?
      `).run(stringifyJson(overrides, {}), placementId, note.id);
    }

    return saved.blockLayout as { placement_id: string; block_id: string; layout: Record<string, unknown> };
  })();
}
