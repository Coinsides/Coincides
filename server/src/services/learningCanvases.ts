import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { getNoteBlockTemplateLabel } from '../lib/noteBlockTemplates.js';
import { getSourceAnchorJumpTarget } from './sourceAnchors.js';
import { getSourceBoard, getSourceBoardNode, getSourceBoardNodeJumpTarget, listSourceBoardNodes } from './sourceBoards.js';
import { getSourceScope, getSourceScopeJumpTarget } from './sourceScopes.js';
import {
  legacyBlockTypeForRuntimeTemplate,
  mergeRuntimeNoteBlockTemplateMetadata,
} from './templateDefinitions.js';

type CanvasStatus = 'active' | 'archived';
type CanvasNodeStatus = 'active' | 'archived';
type CanvasKind = 'finite' | 'infinite';
type CanvasPreset = 'page' | 'board' | 'presentation' | 'custom';
type CanvasNodeType =
  | 'note_block'
  | 'source_scope'
  | 'source_anchor'
  | 'source_board_node'
  | 'source_material'
  | 'material_segment'
  | 'evidence_set'
  | 'proposal';

interface CanvasInput {
  course_id: string;
  title?: string;
  canvas_kind?: CanvasKind;
  preset?: CanvasPreset;
  page_size?: string;
  orientation?: 'portrait' | 'landscape';
  width?: number;
  height?: number;
  background_style?: string;
  metadata?: Record<string, unknown>;
}

interface ListCanvasInput {
  course_id: string;
  status?: CanvasStatus;
}

interface CanvasNodeInput {
  node_type: CanvasNodeType;
  target_id?: string;
  note_block_id?: string;
  source_scope_id?: string;
  source_anchor_id?: string;
  source_board_node_id?: string;
  source_material_id?: string;
  material_segment_id?: string;
  evidence_set_id?: string;
  proposal_id?: string;
  title?: string;
  summary?: string | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  z_index?: number;
  metadata?: Record<string, unknown>;
}

interface CanvasNoteBlockInput {
  template_id: string;
  note_id?: string;
  title?: string;
  plain_text?: string;
  content_json?: Record<string, unknown>;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  z_index?: number;
  metadata?: Record<string, unknown>;
}

interface ListCanvasNodesInput {
  status?: CanvasNodeStatus;
}

interface ViewportInput {
  viewport_x?: number;
  viewport_y?: number;
  zoom?: number;
  metadata?: Record<string, unknown>;
}

const CANVAS_NODE_TYPES = new Set<CanvasNodeType>([
  'note_block',
  'source_scope',
  'source_anchor',
  'source_board_node',
  'source_material',
  'material_segment',
  'evidence_set',
  'proposal',
]);

const DEFAULT_PAGE = {
  canvas_kind: 'finite' as CanvasKind,
  preset: 'page' as CanvasPreset,
  page_size: 'a4',
  orientation: 'portrait' as const,
  width: 794,
  height: 1123,
  background_style: 'plain',
};

function ensureCourse(db: Database.Database, userId: string, courseId: string): void {
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseCanvas(row: any) {
  return row ? { ...row, metadata: parseJson(row.metadata, {}) } : row;
}

function parseNode(row: any) {
  return row ? { ...row, metadata: parseJson(row.metadata, {}) } : row;
}

function parseNote(row: any) {
  return row ? { ...row, metadata: parseJson(row.metadata, {}) } : row;
}

function parseBlock(row: any) {
  return row ? {
    ...row,
    content_json: parseJson(row.content_json, {}),
    metadata: parseJson(row.metadata, {}),
  } : row;
}

function parseViewport(row: any) {
  return row ? { ...row, metadata: parseJson(row.metadata, {}) } : row;
}

function requireNodeType(value: string): CanvasNodeType {
  if (CANVAS_NODE_TYPES.has(value as CanvasNodeType)) return value as CanvasNodeType;
  throw new AppError(400, 'Invalid canvas node type');
}

function requireCanvasKind(value?: string): CanvasKind {
  if (!value) return DEFAULT_PAGE.canvas_kind;
  if (value === 'finite' || value === 'infinite') return value;
  throw new AppError(400, 'Invalid canvas kind');
}

function requirePreset(value?: string): CanvasPreset {
  if (!value) return DEFAULT_PAGE.preset;
  if (value === 'page' || value === 'board' || value === 'presentation' || value === 'custom') return value;
  throw new AppError(400, 'Invalid canvas preset');
}

function defaultTitle(input?: string): string {
  return String(input || 'Canvas Document').trim() || 'Canvas Document';
}

export function createLearningCanvas(db: Database.Database, userId: string, input: CanvasInput) {
  if (!input.course_id) throw new AppError(400, 'course_id is required');
  ensureCourse(db, userId, input.course_id);
  const id = uuidv4();
  const canvasKind = requireCanvasKind(input.canvas_kind);
  const preset = requirePreset(input.preset);
  const pageSize = String(input.page_size || DEFAULT_PAGE.page_size).trim() || DEFAULT_PAGE.page_size;
  const orientation = input.orientation === 'landscape' ? 'landscape' : DEFAULT_PAGE.orientation;
  db.prepare(`
    INSERT INTO learning_canvases (
      id, user_id, course_id, title, status, canvas_kind, preset, page_size,
      orientation, width, height, background_style, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    input.course_id,
    defaultTitle(input.title),
    canvasKind,
    preset,
    pageSize,
    orientation,
    input.width ?? DEFAULT_PAGE.width,
    input.height ?? DEFAULT_PAGE.height,
    String(input.background_style || DEFAULT_PAGE.background_style),
    JSON.stringify(input.metadata || {}),
  );
  return getLearningCanvas(db, userId, id);
}

export function listLearningCanvases(db: Database.Database, userId: string, input: ListCanvasInput) {
  if (!input.course_id) throw new AppError(400, 'course_id query parameter is required');
  ensureCourse(db, userId, input.course_id);
  const params: unknown[] = [userId, input.course_id];
  let where = 'user_id = ? AND course_id = ?';
  if (input.status) {
    if (!['active', 'archived'].includes(input.status)) throw new AppError(400, 'Invalid canvas status');
    where += ' AND status = ?';
    params.push(input.status);
  }
  return db.prepare(`
    SELECT *
    FROM learning_canvases
    WHERE ${where}
    ORDER BY updated_at DESC, created_at DESC
  `).all(...params).map(parseCanvas);
}

export function getLearningCanvas(db: Database.Database, userId: string, canvasId: string) {
  const canvas = db.prepare('SELECT * FROM learning_canvases WHERE id = ? AND user_id = ?')
    .get(canvasId, userId) as any;
  if (!canvas) throw new AppError(404, 'Canvas not found');
  return parseCanvas(canvas);
}

export function updateLearningCanvas(db: Database.Database, userId: string, canvasId: string, input: Partial<CanvasInput>) {
  const existing = getLearningCanvas(db, userId, canvasId) as any;
  const metadata = { ...(existing.metadata || {}), ...(input.metadata || {}) };
  db.prepare(`
    UPDATE learning_canvases
    SET title = ?,
        canvas_kind = ?,
        preset = ?,
        page_size = ?,
        orientation = ?,
        width = ?,
        height = ?,
        background_style = ?,
        metadata = ?,
        updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    typeof input.title === 'string' && input.title.trim() ? input.title.trim() : existing.title,
    input.canvas_kind ? requireCanvasKind(input.canvas_kind) : existing.canvas_kind,
    input.preset ? requirePreset(input.preset) : existing.preset,
    input.page_size || existing.page_size,
    input.orientation === 'landscape' || input.orientation === 'portrait' ? input.orientation : existing.orientation,
    input.width ?? existing.width,
    input.height ?? existing.height,
    input.background_style ?? existing.background_style,
    JSON.stringify(metadata),
    canvasId,
    userId,
  );
  return getLearningCanvas(db, userId, canvasId);
}

function setCanvasStatus(db: Database.Database, userId: string, canvasId: string, status: CanvasStatus) {
  getLearningCanvas(db, userId, canvasId);
  db.prepare('UPDATE learning_canvases SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(status, canvasId, userId);
  return getLearningCanvas(db, userId, canvasId);
}

export function archiveLearningCanvas(db: Database.Database, userId: string, canvasId: string) {
  return setCanvasStatus(db, userId, canvasId, 'archived');
}

export function restoreLearningCanvas(db: Database.Database, userId: string, canvasId: string) {
  return setCanvasStatus(db, userId, canvasId, 'active');
}

function existingNodeWithStatus(
  db: Database.Database,
  canvasId: string,
  nodeType: CanvasNodeType,
  targetId: string,
  status: CanvasNodeStatus,
) {
  return db.prepare(`
    SELECT *
    FROM canvas_nodes
    WHERE canvas_id = ? AND node_type = ? AND target_id = ? AND status = ?
    LIMIT 1
  `).get(canvasId, nodeType, targetId, status) as any;
}

function maxZIndex(db: Database.Database, canvasId: string): number {
  const row = db.prepare('SELECT COALESCE(MAX(z_index), -1) AS value FROM canvas_nodes WHERE canvas_id = ?')
    .get(canvasId) as { value: number };
  return row.value;
}

function createOperationBatch(db: Database.Database, userId: string, courseId: string, label: string): string {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO operation_batches (id, user_id, course_id, source_type, label, status, applied_at)
    VALUES (?, ?, ?, 'manual', ?, 'applied', ?)
  `).run(id, userId, courseId, label, now);
  return id;
}

function noteTitleForCanvas(canvas: any): string {
  return `${String(canvas.title || 'Canvas Document').trim() || 'Canvas Document'} Blocks`;
}

function findCanvasBackingNote(db: Database.Database, userId: string, courseId: string, canvasId: string) {
  const rows = db.prepare(`
    SELECT *
    FROM notes
    WHERE user_id = ? AND course_id = ? AND status = 'active' AND page_format = 'canvas_backing'
    ORDER BY created_at ASC
  `).all(userId, courseId) as any[];
  return rows.find((row) => {
    const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
    return metadata.purpose === 'canvas_backing_note' && metadata.canvas_id === canvasId;
  });
}

function getNoteForCanvas(db: Database.Database, userId: string, courseId: string, noteId?: string) {
  if (!noteId) return null;
  const note = db.prepare(`
    SELECT *
    FROM notes
    WHERE id = ? AND user_id = ? AND course_id = ? AND status = 'active'
  `).get(noteId, userId, courseId) as any;
  if (!note) throw new AppError(404, 'Note not found for this canvas course');
  return note;
}

function getOrCreateCanvasBackingNote(
  db: Database.Database,
  userId: string,
  canvas: any,
  operationBatchId: string,
) {
  const existing = findCanvasBackingNote(db, userId, canvas.course_id, canvas.id);
  if (existing) return existing;

  const id = uuidv4();
  const metadata = {
    purpose: 'canvas_backing_note',
    canvas_id: canvas.id,
    canvas_title: canvas.title,
    created_from: 'canvas_block_insertion',
  };
  db.prepare(`
    INSERT INTO notes (
      id, user_id, course_id, title, description, source_kind, page_format,
      note_class, metadata, operation_batch_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'manual', 'canvas_backing', 'system', ?, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    canvas.course_id,
    noteTitleForCanvas(canvas),
    'Canvas-owned backing note for NoteBlocks created from the Canvas Document surface.',
    JSON.stringify(metadata),
    operationBatchId,
  );
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
}

function targetForNode(db: Database.Database, userId: string, courseId: string, input: CanvasNodeInput) {
  const nodeType = requireNodeType(input.node_type);
  if (nodeType === 'note_block') {
    const blockId = input.note_block_id || input.target_id;
    if (!blockId) throw new AppError(400, 'note_block_id is required');
    const block = db.prepare(`
      SELECT *
      FROM note_blocks
      WHERE id = ? AND user_id = ? AND course_id = ? AND status = 'active'
    `).get(blockId, userId, courseId) as any;
    if (!block) throw new AppError(404, 'NoteBlock not found for this canvas course');
    return {
      nodeType,
      targetId: block.id,
      title: input.title || block.title || getNoteBlockTemplateLabel(parseJson(block.metadata, {}), block.block_type),
      summary: input.summary ?? block.plain_text ?? null,
      fields: {
        note_block_id: block.id,
        source_scope_id: null,
        source_anchor_id: null,
        source_board_node_id: null,
        source_material_id: null,
        material_segment_id: null,
        evidence_set_id: null,
        proposal_id: null,
      },
    };
  }
  if (nodeType === 'source_scope') {
    const scopeId = input.source_scope_id || input.target_id;
    if (!scopeId) throw new AppError(400, 'source_scope_id is required');
    const scope = getSourceScope(db, userId, scopeId) as any;
    if (scope.course_id !== courseId) throw new AppError(400, 'Source scope belongs to a different course');
    if (scope.status === 'archived') throw new AppError(400, 'Source scope is archived');
    return {
      nodeType,
      targetId: scope.id,
      title: input.title || scope.label,
      summary: input.summary ?? [scope.scope_kind.replace(/_/g, ' '), scope.page_start ? `p.${scope.page_start}` : ''].filter(Boolean).join(' - '),
      fields: {
        note_block_id: null,
        source_scope_id: scope.id,
        source_anchor_id: scope.source_anchor_id || null,
        source_board_node_id: null,
        source_material_id: scope.source_material_id || null,
        material_segment_id: scope.material_segment_id || null,
        evidence_set_id: null,
        proposal_id: null,
      },
    };
  }
  if (nodeType === 'source_anchor') {
    const anchorId = input.source_anchor_id || input.target_id;
    if (!anchorId) throw new AppError(400, 'source_anchor_id is required');
    const anchor = db.prepare('SELECT * FROM source_anchors WHERE id = ? AND user_id = ? AND course_id = ?')
      .get(anchorId, userId, courseId) as any;
    if (!anchor) throw new AppError(404, 'Source anchor not found');
    return {
      nodeType,
      targetId: anchor.id,
      title: input.title || 'Source anchor',
      summary: input.summary ?? `p.${anchor.page_start || '?'}`,
      fields: {
        note_block_id: null,
        source_scope_id: null,
        source_anchor_id: anchor.id,
        source_board_node_id: null,
        source_material_id: anchor.source_material_id || null,
        material_segment_id: anchor.material_segment_id || null,
        evidence_set_id: null,
        proposal_id: null,
      },
    };
  }
  if (nodeType === 'source_board_node') {
    const boardNodeId = input.source_board_node_id || input.target_id;
    if (!boardNodeId) throw new AppError(400, 'source_board_node_id is required');
    const boardNode = getSourceBoardNode(db, userId, boardNodeId) as any;
    if (boardNode.course_id !== courseId) throw new AppError(400, 'Source board node belongs to a different course');
    if (boardNode.status === 'archived') throw new AppError(400, 'Source board node is archived');
    return {
      nodeType,
      targetId: boardNode.id,
      title: input.title || boardNode.title,
      summary: input.summary ?? boardNode.summary,
      fields: {
        note_block_id: boardNode.note_block_id || null,
        source_scope_id: boardNode.source_scope_id || null,
        source_anchor_id: boardNode.source_anchor_id || null,
        source_board_node_id: boardNode.id,
        source_material_id: boardNode.source_material_id || null,
        material_segment_id: boardNode.material_segment_id || null,
        evidence_set_id: boardNode.evidence_set_id || null,
        proposal_id: boardNode.proposal_id || null,
      },
    };
  }
  const targetId = input.target_id
    || input.note_block_id
    || input.source_material_id
    || input.material_segment_id
    || input.evidence_set_id
    || input.proposal_id;
  if (!targetId) throw new AppError(400, 'target_id is required');
  return {
    nodeType,
    targetId,
    title: input.title || nodeType.replace(/_/g, ' '),
    summary: input.summary ?? null,
    fields: {
      note_block_id: input.note_block_id || null,
      source_scope_id: input.source_scope_id || null,
      source_anchor_id: input.source_anchor_id || null,
      source_board_node_id: input.source_board_node_id || null,
      source_material_id: input.source_material_id || (nodeType === 'source_material' ? targetId : null),
      material_segment_id: input.material_segment_id || (nodeType === 'material_segment' ? targetId : null),
      evidence_set_id: input.evidence_set_id || (nodeType === 'evidence_set' ? targetId : null),
      proposal_id: input.proposal_id || (nodeType === 'proposal' ? targetId : null),
    },
  };
}

export function createCanvasNode(db: Database.Database, userId: string, canvasId: string, input: CanvasNodeInput) {
  const canvas = getLearningCanvas(db, userId, canvasId) as any;
  if (canvas.status === 'archived') throw new AppError(400, 'Canvas is archived');
  const target = targetForNode(db, userId, canvas.course_id, input);
  const existing = existingNodeWithStatus(db, canvasId, target.nodeType, target.targetId, 'active');
  if (existing) return parseNode(existing);
  const archived = existingNodeWithStatus(db, canvasId, target.nodeType, target.targetId, 'archived');
  if (archived) {
    db.prepare(`
      UPDATE canvas_nodes
      SET status = 'active', z_index = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(maxZIndex(db, canvasId) + 1, archived.id, userId);
    db.prepare('UPDATE learning_canvases SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(canvasId, userId);
    return getCanvasNode(db, userId, archived.id);
  }
  const id = uuidv4();
  db.prepare(`
    INSERT INTO canvas_nodes (
      id, user_id, course_id, canvas_id, node_type, target_id,
      note_block_id, source_scope_id, source_anchor_id, source_board_node_id,
      source_material_id, material_segment_id, evidence_set_id, proposal_id,
      title, summary, status, x, y, width, height, z_index, metadata,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    canvas.course_id,
    canvasId,
    target.nodeType,
    target.targetId,
    target.fields.note_block_id,
    target.fields.source_scope_id,
    target.fields.source_anchor_id,
    target.fields.source_board_node_id,
    target.fields.source_material_id,
    target.fields.material_segment_id,
    target.fields.evidence_set_id,
    target.fields.proposal_id,
    target.title,
    target.summary,
    input.x ?? 0,
    input.y ?? 0,
    input.width ?? 280,
    input.height ?? 160,
    input.z_index ?? maxZIndex(db, canvasId) + 1,
    JSON.stringify(input.metadata || {}),
  );
  db.prepare('UPDATE learning_canvases SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(canvasId, userId);
  return getCanvasNode(db, userId, id);
}

export function createCanvasNoteBlock(
  db: Database.Database,
  userId: string,
  canvasId: string,
  input: CanvasNoteBlockInput,
) {
  const canvas = getLearningCanvas(db, userId, canvasId) as any;
  if (canvas.status === 'archived') throw new AppError(400, 'Canvas is archived');
  const resolvedTemplate = mergeRuntimeNoteBlockTemplateMetadata(db, userId, {
    ...(input.metadata || {}),
    template_id: input.template_id,
  }, 'paragraph');
  const template = resolvedTemplate.template;

  const run = db.transaction(() => {
    const operationBatchId = createOperationBatch(
      db,
      userId,
      canvas.course_id,
      `Create ${template.label} block from canvas`,
    );
    const note = getNoteForCanvas(db, userId, canvas.course_id, input.note_id)
      || getOrCreateCanvasBackingNote(db, userId, canvas, operationBatchId);

    const blockId = uuidv4();
    const placementId = uuidv4();
    const blockType = legacyBlockTypeForRuntimeTemplate(template);
    const contentJson = input.content_json || template.default_content || {};
    const bodyText = typeof contentJson.body === 'string' ? contentJson.body : '';
    const plainText = input.plain_text ?? bodyText;
    const metadata = mergeRuntimeNoteBlockTemplateMetadata(
      db,
      userId,
      {
        ...(input.metadata || {}),
        template_id: template.template_key,
        created_from: 'canvas_block_insertion',
        canvas_id: canvas.id,
      },
      blockType,
    ).metadata;
    const nextOrder = (db.prepare(`
      SELECT COALESCE(MAX(order_index), -1) + 1 AS next_order
      FROM note_block_placements
      WHERE note_id = ?
    `).get(note.id) as { next_order: number }).next_order;

    db.prepare(`
      INSERT INTO note_blocks (
        id, user_id, course_id, block_type, title, content_json, plain_text,
        source_kind, metadata, operation_batch_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?, datetime('now'), datetime('now'))
    `).run(
      blockId,
      userId,
      canvas.course_id,
      blockType,
      input.title || null,
      JSON.stringify(contentJson),
      plainText || null,
      JSON.stringify(metadata),
      operationBatchId,
    );

    db.prepare(`
      INSERT INTO note_block_placements (id, note_id, block_id, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(placementId, note.id, blockId, nextOrder);

    db.prepare('UPDATE notes SET updated_at = datetime(\'now\') WHERE id = ?').run(note.id);

    const title = input.title || plainText?.slice(0, 80) || template.label;
    const canvasNode = createCanvasNode(db, userId, canvas.id, {
      node_type: 'note_block',
      note_block_id: blockId,
      title,
      summary: plainText || template.description,
      x: input.x,
      y: input.y,
      width: input.width ?? 300,
      height: input.height ?? 180,
      z_index: input.z_index,
      metadata: {
        created_from: 'canvas_block_insertion',
        template_id: template.template_key,
        template_definition_id: template.id,
      },
    });

    const createdNote = db.prepare('SELECT * FROM notes WHERE id = ?').get(note.id);
    const createdBlock = db.prepare(`
      SELECT nbp.id AS placement_id, nbp.order_index, nb.*
      FROM note_block_placements nbp
      JOIN note_blocks nb ON nb.id = nbp.block_id
      WHERE nb.id = ?
    `).get(blockId);

    return {
      note: parseNote(createdNote),
      block: parseBlock(createdBlock),
      canvas_node: canvasNode,
    };
  });

  return run();
}

export function listCanvasNodes(
  db: Database.Database,
  userId: string,
  canvasId: string,
  input: ListCanvasNodesInput = {},
) {
  getLearningCanvas(db, userId, canvasId);
  const params: unknown[] = [userId, canvasId];
  let where = 'user_id = ? AND canvas_id = ?';
  if (input.status) {
    if (!['active', 'archived'].includes(input.status)) throw new AppError(400, 'Invalid canvas node status');
    where += ' AND status = ?';
    params.push(input.status);
  }
  return db.prepare(`
    SELECT *
    FROM canvas_nodes
    WHERE ${where}
    ORDER BY z_index ASC, created_at ASC
  `).all(...params).map(parseNode);
}

export function getCanvasNode(db: Database.Database, userId: string, nodeId: string) {
  const node = db.prepare('SELECT * FROM canvas_nodes WHERE id = ? AND user_id = ?')
    .get(nodeId, userId) as any;
  if (!node) throw new AppError(404, 'Canvas node not found');
  return parseNode(node);
}

export function updateCanvasNode(db: Database.Database, userId: string, nodeId: string, input: Partial<CanvasNodeInput>) {
  const existing = getCanvasNode(db, userId, nodeId) as any;
  const metadata = { ...(existing.metadata || {}), ...(input.metadata || {}) };
  db.prepare(`
    UPDATE canvas_nodes
    SET title = ?,
        summary = ?,
        x = ?,
        y = ?,
        width = ?,
        height = ?,
        z_index = ?,
        metadata = ?,
        updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    input.title ?? existing.title,
    input.summary ?? existing.summary,
    input.x ?? existing.x,
    input.y ?? existing.y,
    input.width ?? existing.width,
    input.height ?? existing.height,
    input.z_index ?? existing.z_index,
    JSON.stringify(metadata),
    nodeId,
    userId,
  );
  return getCanvasNode(db, userId, nodeId);
}

function setNodeStatus(db: Database.Database, userId: string, nodeId: string, status: CanvasNodeStatus) {
  getCanvasNode(db, userId, nodeId);
  db.prepare('UPDATE canvas_nodes SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(status, nodeId, userId);
  return getCanvasNode(db, userId, nodeId);
}

export function archiveCanvasNode(db: Database.Database, userId: string, nodeId: string) {
  return setNodeStatus(db, userId, nodeId, 'archived');
}

export function restoreCanvasNode(db: Database.Database, userId: string, nodeId: string) {
  return setNodeStatus(db, userId, nodeId, 'active');
}

export function seedCanvasFromSourceBoard(db: Database.Database, userId: string, canvasId: string, sourceBoardId: string) {
  const canvas = getLearningCanvas(db, userId, canvasId) as any;
  if (canvas.status === 'archived') throw new AppError(400, 'Canvas is archived');
  const board = getSourceBoard(db, userId, sourceBoardId) as any;
  if (board.course_id !== canvas.course_id) throw new AppError(400, 'Source board belongs to a different course');
  if (board.status === 'archived') throw new AppError(400, 'Source board is archived');
  const boardNodes = listSourceBoardNodes(db, userId, sourceBoardId, { status: 'active' }) as any[];
  let created = 0;
  let restored = 0;
  const run = db.transaction(() => {
    boardNodes.forEach((boardNode, index) => {
      const beforeActive = existingNodeWithStatus(db, canvasId, 'source_board_node', boardNode.id, 'active');
      const beforeArchived = existingNodeWithStatus(db, canvasId, 'source_board_node', boardNode.id, 'archived');
      createCanvasNode(db, userId, canvasId, {
        node_type: 'source_board_node',
        source_board_node_id: boardNode.id,
        x: 48 + (index % 2) * 340,
        y: 48 + Math.floor(index / 2) * 220,
        width: boardNode.layout_width || 300,
        height: boardNode.layout_height || 160,
      });
      if (!beforeActive && !beforeArchived) created += 1;
      if (beforeArchived) restored += 1;
    });
  });
  run();
  return {
    nodes_created_count: created,
    nodes_restored_count: restored,
    active_source_board_node_count: boardNodes.length,
    total_node_count: (db.prepare("SELECT COUNT(*) AS count FROM canvas_nodes WHERE canvas_id = ? AND status = 'active'")
      .get(canvasId) as any).count,
  };
}

export function getCanvasNodeJumpTarget(db: Database.Database, userId: string, nodeId: string) {
  const node = getCanvasNode(db, userId, nodeId) as any;
  if (node.source_scope_id) {
    return {
      node,
      ...getSourceScopeJumpTarget(db, userId, node.source_scope_id),
    };
  }
  if (node.source_anchor_id) {
    return {
      node,
      ...getSourceAnchorJumpTarget(db, userId, node.source_anchor_id),
    };
  }
  if (node.source_board_node_id) {
    return {
      node,
      ...getSourceBoardNodeJumpTarget(db, userId, node.source_board_node_id),
    };
  }
  return {
    node,
    target: {
      type: node.node_type,
      id: node.target_id,
    },
    warnings: ['This Canvas node does not have a source jump target yet.'],
  };
}

export function getCanvasViewport(db: Database.Database, userId: string, canvasId: string) {
  const canvas = getLearningCanvas(db, userId, canvasId) as any;
  const row = db.prepare('SELECT * FROM canvas_viewport_states WHERE canvas_id = ? AND user_id = ?')
    .get(canvasId, userId) as any;
  if (row) return parseViewport(row);
  return {
    id: null,
    user_id: userId,
    course_id: canvas.course_id,
    canvas_id: canvasId,
    viewport_x: 0,
    viewport_y: 0,
    zoom: 1,
    metadata: {},
  };
}

export function updateCanvasViewport(db: Database.Database, userId: string, canvasId: string, input: ViewportInput) {
  const canvas = getLearningCanvas(db, userId, canvasId) as any;
  const existing = getCanvasViewport(db, userId, canvasId) as any;
  const id = existing.id || uuidv4();
  const metadata = { ...(existing.metadata || {}), ...(input.metadata || {}) };
  db.prepare(`
    INSERT INTO canvas_viewport_states (
      id, user_id, course_id, canvas_id, viewport_x, viewport_y, zoom, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(user_id, canvas_id) DO UPDATE SET
      viewport_x = excluded.viewport_x,
      viewport_y = excluded.viewport_y,
      zoom = excluded.zoom,
      metadata = excluded.metadata,
      updated_at = datetime('now')
  `).run(
    id,
    userId,
    canvas.course_id,
    canvasId,
    input.viewport_x ?? existing.viewport_x ?? 0,
    input.viewport_y ?? existing.viewport_y ?? 0,
    input.zoom ?? existing.zoom ?? 1,
    JSON.stringify(metadata),
  );
  return getCanvasViewport(db, userId, canvasId);
}
