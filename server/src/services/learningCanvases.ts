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
type CanvasEdgeStatus = 'active' | 'archived';
type CanvasKind = 'finite' | 'infinite';
type CanvasPreset = 'page' | 'board' | 'presentation' | 'custom';
type CanvasPort = 'top' | 'right' | 'bottom' | 'left';
type CanvasConnectionState =
  | 'incomplete'
  | 'visual_only'
  | 'relation_suggested'
  | 'relation_backed'
  | 'stale_binding'
  | 'broken_relation';
type RelationLayerKind = 'visual' | 'learning_logic' | 'source_evidence' | 'ai_suggested' | 'ai_hidden';
type RelationVisibility = 'visible' | 'hidden';
type ObjectRelationType =
  | 'uses_definition'
  | 'uses_formula'
  | 'example_of'
  | 'answers'
  | 'supports'
  | 'contradicts'
  | 'read_before'
  | 'derives_to'
  | 'source_supports';
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

interface CanvasEdgeInput {
  source_node_id: string;
  source_port: CanvasPort;
  target_node_id?: string | null;
  target_port?: CanvasPort | null;
  loose_target_x?: number | null;
  loose_target_y?: number | null;
  relation_layer_id?: string | null;
  label?: string | null;
  style_key?: string;
  metadata?: Record<string, unknown>;
}

interface CanvasEdgeUpdateInput {
  source_port?: CanvasPort;
  target_node_id?: string | null;
  target_port?: CanvasPort | null;
  loose_target_x?: number | null;
  loose_target_y?: number | null;
  relation_layer_id?: string | null;
  label?: string | null;
  style_key?: string;
  metadata?: Record<string, unknown>;
}

interface BindRelationInput {
  relation_type: ObjectRelationType;
  relation_layer_id?: string;
  label?: string | null;
  confidence?: number | null;
  metadata?: Record<string, unknown>;
}

interface ListRelationLayersInput {
  course_id: string;
  canvas_id?: string;
  status?: 'active' | 'archived';
}

interface ListObjectRelationsInput {
  course_id: string;
  canvas_id?: string;
  status?: 'accepted' | 'suggested' | 'rejected' | 'stale' | 'broken' | 'detached';
}

type CommandSelectedType = 'none' | 'canvas_node' | 'canvas_edge';
type CommandExecutionMode = 'local_ui' | 'existing_api' | 'proposal_required' | 'future_ai_context_only';

interface CanvasCommandContextInput {
  selected_type?: CommandSelectedType;
  selected_id?: string | null;
  visible_relation_layer_ids?: string[];
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

const CANVAS_PORTS = new Set<CanvasPort>(['top', 'right', 'bottom', 'left']);
const OBJECT_RELATION_TYPES = new Set<ObjectRelationType>([
  'uses_definition',
  'uses_formula',
  'example_of',
  'answers',
  'supports',
  'contradicts',
  'read_before',
  'derives_to',
  'source_supports',
]);

const DEFAULT_RELATION_LAYERS: Array<{ kind: RelationLayerKind; title: string }> = [
  { kind: 'visual', title: 'Visual' },
  { kind: 'learning_logic', title: 'Learning logic' },
  { kind: 'source_evidence', title: 'Source evidence' },
  { kind: 'ai_suggested', title: 'AI suggested' },
  { kind: 'ai_hidden', title: 'AI hidden' },
];

const DEFAULT_PAGE = {
  canvas_kind: 'finite' as CanvasKind,
  preset: 'page' as CanvasPreset,
  page_size: 'a4',
  orientation: 'portrait' as const,
  width: 794,
  height: 1123,
  background_style: 'plain',
};

const COMMAND_TOOL_MODES = ['select', 'connect', 'insert_block'];

const COMMAND_DEFINITIONS: Array<{
  command_id: string;
  label: string;
  execution_mode: CommandExecutionMode;
  proposal_required: boolean;
  input_binding: string | null;
}> = [
  { command_id: 'canvas.zoom_in', label: 'Zoom in', execution_mode: 'local_ui', proposal_required: false, input_binding: 'Ctrl+=' },
  { command_id: 'canvas.zoom_out', label: 'Zoom out', execution_mode: 'local_ui', proposal_required: false, input_binding: 'Ctrl+-' },
  { command_id: 'canvas.reset_view', label: 'Reset view', execution_mode: 'local_ui', proposal_required: false, input_binding: 'Ctrl+0' },
  { command_id: 'canvas.clear_selection', label: 'Clear selection', execution_mode: 'local_ui', proposal_required: false, input_binding: 'Escape' },
  { command_id: 'canvas.toggle_connect_mode', label: 'Toggle connect mode', execution_mode: 'local_ui', proposal_required: false, input_binding: 'C' },
  { command_id: 'canvas.open_insert_block', label: 'Add block', execution_mode: 'local_ui', proposal_required: false, input_binding: 'A' },
  { command_id: 'canvas.open_selected_target', label: 'Open selected target', execution_mode: 'existing_api', proposal_required: false, input_binding: null },
  { command_id: 'canvas.archive_selected_node', label: 'Hide selected node', execution_mode: 'existing_api', proposal_required: false, input_binding: null },
  { command_id: 'canvas.archive_selected_edge', label: 'Archive selected edge', execution_mode: 'existing_api', proposal_required: false, input_binding: null },
  { command_id: 'canvas.bind_selected_edge_relation', label: 'Bind selected edge relation', execution_mode: 'existing_api', proposal_required: false, input_binding: null },
  { command_id: 'canvas.unbind_selected_edge_relation', label: 'Unbind selected edge relation', execution_mode: 'existing_api', proposal_required: false, input_binding: null },
  { command_id: 'canvas.plan_layout', label: 'Plan layout', execution_mode: 'proposal_required', proposal_required: true, input_binding: null },
  { command_id: 'canvas.toggle_relation_layer', label: 'Toggle relation layer', execution_mode: 'local_ui', proposal_required: false, input_binding: null },
  { command_id: 'canvas.inspect_command_context', label: 'Inspect command context', execution_mode: 'future_ai_context_only', proposal_required: false, input_binding: null },
];

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

function parseEdge(row: any) {
  return row ? { ...row, metadata: parseJson(row.metadata, {}) } : row;
}

function parseRelationLayer(row: any) {
  return row ? { ...row, metadata: parseJson(row.metadata, {}) } : row;
}

function parseObjectRelation(row: any) {
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

function requireCanvasPort(value?: string | null): CanvasPort {
  if (value && CANVAS_PORTS.has(value as CanvasPort)) return value as CanvasPort;
  throw new AppError(400, 'Invalid canvas edge port');
}

function requireRelationType(value?: string): ObjectRelationType {
  if (value && OBJECT_RELATION_TYPES.has(value as ObjectRelationType)) return value as ObjectRelationType;
  throw new AppError(400, 'Invalid object relation type');
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

export function getLearningCanvasDetail(db: Database.Database, userId: string, canvasId: string) {
  const canvas = getLearningCanvas(db, userId, canvasId);
  return {
    canvas,
    nodes: listCanvasNodes(db, userId, canvasId, { status: 'active' }),
    archived_nodes: listCanvasNodes(db, userId, canvasId, { status: 'archived' }),
    edges: listCanvasEdges(db, userId, canvasId, { status: 'active' }),
    frames: db.prepare('SELECT * FROM canvas_frames WHERE canvas_id = ? AND user_id = ? AND status = ? ORDER BY created_at ASC')
      .all(canvasId, userId, 'active').map((row: any) => ({ ...row, metadata: parseJson(row.metadata, {}) })),
    relation_layers: listRelationLayers(db, userId, { course_id: (canvas as any).course_id, canvas_id: canvasId, status: 'active' }),
    object_relations: listObjectRelations(db, userId, { course_id: (canvas as any).course_id, canvas_id: canvasId }),
    viewport: getCanvasViewport(db, userId, canvasId),
  };
}

function selectedType(value?: string): CommandSelectedType {
  if (!value || value === 'none') return 'none';
  if (value === 'canvas_node' || value === 'canvas_edge') return value;
  throw new AppError(400, 'Invalid command selected type');
}

function disabledReason(commandId: string, selectedScope: any, layerCount: number): string | null {
  if (commandId === 'canvas.open_selected_target' && selectedScope.kind !== 'canvas_node') {
    return 'No canvas object selected';
  }
  if (commandId === 'canvas.archive_selected_node' && selectedScope.kind !== 'canvas_node') {
    return 'No canvas node selected';
  }
  if (commandId === 'canvas.archive_selected_edge' && selectedScope.kind !== 'canvas_edge') {
    return 'No canvas edge selected';
  }
  if (commandId === 'canvas.bind_selected_edge_relation') {
    if (selectedScope.kind !== 'canvas_edge') return 'No canvas edge selected';
    if (selectedScope.connection_state === 'incomplete') return 'Incomplete canvas edges cannot bind relations';
  }
  if (commandId === 'canvas.unbind_selected_edge_relation') {
    if (selectedScope.kind !== 'canvas_edge') return 'No canvas edge selected';
    if (!selectedScope.object_relation_id) return 'Selected edge has no semantic relation';
  }
  if (commandId === 'canvas.toggle_relation_layer' && layerCount === 0) {
    return 'No relation layers available';
  }
  return null;
}

function commandRows(selectedScope: any, layerCount: number) {
  return COMMAND_DEFINITIONS.map((definition) => {
    const reason = disabledReason(definition.command_id, selectedScope, layerCount);
    return {
      ...definition,
      enabled: reason === null,
      disabled_reason: reason,
    };
  });
}

export function getCanvasCommandContext(
  db: Database.Database,
  userId: string,
  canvasId: string,
  input: CanvasCommandContextInput = {},
) {
  const canvas = getLearningCanvas(db, userId, canvasId) as any;
  const type = selectedType(input.selected_type);
  let selectedScope: Record<string, unknown> = { kind: 'none' };

  if (type === 'canvas_node') {
    if (!input.selected_id) throw new AppError(400, 'selected_id is required for selected canvas node');
    const node = getCanvasNodeForCanvas(db, userId, canvasId, input.selected_id);
    selectedScope = {
      kind: 'canvas_node',
      canvas_node_id: node.id,
      node_type: node.node_type,
      target_type: node.node_type,
      target_id: node.target_id,
      title: node.title,
      status: node.status,
    };
  }

  if (type === 'canvas_edge') {
    if (!input.selected_id) throw new AppError(400, 'selected_id is required for selected canvas edge');
    const edge = getCanvasEdge(db, userId, input.selected_id) as any;
    if (edge.canvas_id !== canvasId) throw new AppError(400, 'Selected canvas edge belongs to a different canvas');
    selectedScope = {
      kind: 'canvas_edge',
      canvas_edge_id: edge.id,
      connection_state: edge.connection_state,
      object_relation_id: edge.object_relation_id,
      relation_layer_id: edge.relation_layer_id,
      relation_kind: edge.relation_kind,
      source_node_id: edge.source_node_id,
      target_node_id: edge.target_node_id,
      status: edge.status,
    };
  }

  const visibleLayerIds = new Set(input.visible_relation_layer_ids || []);
  const relationLayers = listRelationLayers(db, userId, {
    course_id: canvas.course_id,
    canvas_id: canvas.id,
    status: 'active',
  }) as any[];
  const activeRelationLayers = relationLayers.map((layer) => ({
    id: layer.id,
    title: layer.title,
    layer_kind: layer.layer_kind,
    visibility: layer.visibility,
    visible: visibleLayerIds.size > 0 ? visibleLayerIds.has(layer.id) : layer.visibility !== 'hidden',
  }));

  return {
    version: 'v2.4.5',
    course_id: canvas.course_id,
    canvas_id: canvas.id,
    selected_scope: selectedScope,
    tool_modes: COMMAND_TOOL_MODES,
    active_relation_layers: activeRelationLayers,
    available_commands: commandRows(selectedScope, activeRelationLayers.length),
    ai_command_context: {
      proposal_first: true,
      selected_object_count: type === 'none' ? 0 : 1,
      active_relation_layer_count: activeRelationLayers.filter((layer) => layer.visible).length,
      allowed_direct_mutations: ['canvas_nodes', 'canvas_edges', 'canvas_viewport_states'],
      proposal_required_for: ['layout_generation', 'ai_relation_generation', 'content_generation'],
      forbidden_direct_mutations: [
        'source_materials',
        'source_fragments',
        'material_segments',
        'evidence_sets',
        'note_block_sources',
      ],
    },
    warnings: [],
  };
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
  db.prepare(`
    INSERT INTO operation_batches (id, user_id, course_id, source_type, label, status, applied_at)
    VALUES (?, ?, ?, 'manual', ?, 'applied', datetime('now'))
  `).run(id, userId, courseId, label);
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
      metadata, operation_batch_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, 'manual', 'canvas_backing', ?, ?, datetime('now'), datetime('now'))
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

function ensureRelationLayerSeeds(db: Database.Database, userId: string, courseId: string, canvasId?: string | null) {
  ensureCourse(db, userId, courseId);
  if (canvasId) {
    const canvas = getLearningCanvas(db, userId, canvasId) as any;
    if (canvas.course_id !== courseId) throw new AppError(400, 'Canvas belongs to a different course');
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO relation_layers (
      id, user_id, course_id, canvas_id, title, layer_kind, visibility,
      status, order_index, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'visible', 'active', ?, ?, datetime('now'), datetime('now'))
  `);

  DEFAULT_RELATION_LAYERS.forEach((layer, index) => {
    insert.run(
      uuidv4(),
      userId,
      courseId,
      canvasId || null,
      layer.title,
      layer.kind,
      index,
      JSON.stringify({ seeded_by: 'v2.4.4' }),
    );
  });
}

function getRelationLayer(db: Database.Database, userId: string, layerId: string) {
  const layer = db.prepare('SELECT * FROM relation_layers WHERE id = ? AND user_id = ?')
    .get(layerId, userId) as any;
  if (!layer) throw new AppError(404, 'Relation layer not found');
  return parseRelationLayer(layer);
}

function defaultRelationLayerId(
  db: Database.Database,
  userId: string,
  courseId: string,
  canvasId: string,
  preferredKind: RelationLayerKind = 'visual',
) {
  const layers = listRelationLayers(db, userId, { course_id: courseId, canvas_id: canvasId, status: 'active' }) as any[];
  const layerId = (layers.find((layer) => layer.layer_kind === preferredKind) || layers[0])?.id;
  if (!layerId) throw new AppError(500, 'Default relation layer was not created');
  return layerId;
}

function validateRelationLayerForCanvas(
  db: Database.Database,
  userId: string,
  courseId: string,
  canvasId: string,
  layerId?: string | null,
) {
  if (!layerId) return null;
  const layer = getRelationLayer(db, userId, layerId) as any;
  if (layer.course_id !== courseId) throw new AppError(400, 'Relation layer belongs to a different course');
  if (layer.canvas_id && layer.canvas_id !== canvasId) throw new AppError(400, 'Relation layer belongs to a different canvas');
  if (layer.status !== 'active') throw new AppError(400, 'Relation layer is archived');
  return layer;
}

function getCanvasNodeForCanvas(db: Database.Database, userId: string, canvasId: string, nodeId: string) {
  const node = getCanvasNode(db, userId, nodeId) as any;
  if (node.canvas_id !== canvasId) throw new AppError(400, 'Canvas node belongs to a different canvas');
  if (node.status === 'archived') throw new AppError(400, 'Canvas node is archived');
  return node;
}

function resolveRelationEndpoint(node: any) {
  return {
    type: node.node_type,
    id: node.target_id,
  };
}

export function listRelationLayers(db: Database.Database, userId: string, input: ListRelationLayersInput) {
  if (!input.course_id) throw new AppError(400, 'course_id query parameter is required');
  ensureRelationLayerSeeds(db, userId, input.course_id, input.canvas_id || null);
  const params: unknown[] = [userId, input.course_id];
  let where = 'user_id = ? AND course_id = ?';
  if (input.canvas_id) {
    where += ' AND canvas_id = ?';
    params.push(input.canvas_id);
  } else {
    where += ' AND canvas_id IS NULL';
  }
  if (input.status) {
    if (!['active', 'archived'].includes(input.status)) throw new AppError(400, 'Invalid relation layer status');
    where += ' AND status = ?';
    params.push(input.status);
  }
  return db.prepare(`
    SELECT *
    FROM relation_layers
    WHERE ${where}
    ORDER BY order_index ASC, created_at ASC
  `).all(...params).map(parseRelationLayer);
}

export function listObjectRelations(db: Database.Database, userId: string, input: ListObjectRelationsInput) {
  if (!input.course_id) throw new AppError(400, 'course_id query parameter is required');
  ensureCourse(db, userId, input.course_id);
  const params: unknown[] = [userId, input.course_id];
  let where = 'rel.user_id = ? AND rel.course_id = ?';
  if (input.status) {
    where += ' AND rel.status = ?';
    params.push(input.status);
  } else {
    where += " AND rel.status != 'detached'";
  }
  if (input.canvas_id) {
    getLearningCanvas(db, userId, input.canvas_id);
    where += ' AND edge.canvas_id = ?';
    params.push(input.canvas_id);
  }
  return db.prepare(`
    SELECT rel.*
    FROM object_relations rel
    LEFT JOIN canvas_edges edge ON edge.id = rel.source_canvas_edge_id
    WHERE ${where}
    ORDER BY rel.created_at ASC
  `).all(...params).map(parseObjectRelation);
}

export function listCanvasEdges(
  db: Database.Database,
  userId: string,
  canvasId: string,
  input: { status?: CanvasEdgeStatus } = {},
) {
  getLearningCanvas(db, userId, canvasId);
  const params: unknown[] = [userId, canvasId];
  let where = 'user_id = ? AND canvas_id = ?';
  if (input.status) {
    if (!['active', 'archived'].includes(input.status)) throw new AppError(400, 'Invalid canvas edge status');
    where += ' AND status = ?';
    params.push(input.status);
  }
  return db.prepare(`
    SELECT *
    FROM canvas_edges
    WHERE ${where}
    ORDER BY created_at ASC
  `).all(...params).map(parseEdge);
}

export function getCanvasEdge(db: Database.Database, userId: string, edgeId: string) {
  const edge = db.prepare('SELECT * FROM canvas_edges WHERE id = ? AND user_id = ?')
    .get(edgeId, userId) as any;
  if (!edge) throw new AppError(404, 'Canvas edge not found');
  return parseEdge(edge);
}

export function createCanvasEdge(db: Database.Database, userId: string, canvasId: string, input: CanvasEdgeInput) {
  const canvas = getLearningCanvas(db, userId, canvasId) as any;
  if (canvas.status === 'archived') throw new AppError(400, 'Canvas is archived');
  const sourcePort = requireCanvasPort(input.source_port);
  const sourceNode = getCanvasNodeForCanvas(db, userId, canvasId, input.source_node_id);
  const hasTarget = Boolean(input.target_node_id);
  const targetNode = hasTarget ? getCanvasNodeForCanvas(db, userId, canvasId, String(input.target_node_id)) : null;
  const targetPort = hasTarget ? requireCanvasPort(input.target_port) : null;

  if (!hasTarget && (typeof input.loose_target_x !== 'number' || typeof input.loose_target_y !== 'number')) {
    throw new AppError(400, 'Incomplete canvas edges require loose target coordinates');
  }

  const layer = validateRelationLayerForCanvas(db, userId, canvas.course_id, canvasId, input.relation_layer_id)
    || getRelationLayer(db, userId, defaultRelationLayerId(db, userId, canvas.course_id, canvasId, 'visual'));
  const connectionState: CanvasConnectionState = targetNode ? 'visual_only' : 'incomplete';
  const id = uuidv4();

  db.prepare(`
    INSERT INTO canvas_edges (
      id, user_id, course_id, canvas_id, source_node_id, source_port,
      target_node_id, target_port, loose_target_x, loose_target_y,
      relation_layer_id, label, connection_state, style_key, status, metadata,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    canvas.course_id,
    canvasId,
    sourceNode.id,
    sourcePort,
    targetNode?.id || null,
    targetPort,
    targetNode ? null : input.loose_target_x,
    targetNode ? null : input.loose_target_y,
    layer.id,
    input.label ?? null,
    connectionState,
    input.style_key || 'default',
    JSON.stringify(input.metadata || {}),
  );
  db.prepare('UPDATE learning_canvases SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(canvasId, userId);
  return getCanvasEdge(db, userId, id);
}

export function updateCanvasEdge(db: Database.Database, userId: string, edgeId: string, input: CanvasEdgeUpdateInput) {
  const existing = getCanvasEdge(db, userId, edgeId) as any;
  const canvas = getLearningCanvas(db, userId, existing.canvas_id) as any;
  const sourcePort = input.source_port ? requireCanvasPort(input.source_port) : existing.source_port;
  const targetNodeId = input.target_node_id === undefined ? existing.target_node_id : input.target_node_id;
  const targetNode = targetNodeId ? getCanvasNodeForCanvas(db, userId, existing.canvas_id, String(targetNodeId)) : null;
  const targetPort = targetNode ? requireCanvasPort(input.target_port ?? existing.target_port) : null;
  const layer = input.relation_layer_id !== undefined
    ? validateRelationLayerForCanvas(db, userId, existing.course_id, existing.canvas_id, input.relation_layer_id)
    : existing.relation_layer_id
      ? getRelationLayer(db, userId, existing.relation_layer_id)
      : null;
  const looseTargetX = targetNode ? null : input.loose_target_x ?? existing.loose_target_x;
  const looseTargetY = targetNode ? null : input.loose_target_y ?? existing.loose_target_y;
  if (!targetNode && (typeof looseTargetX !== 'number' || typeof looseTargetY !== 'number')) {
    throw new AppError(400, 'Incomplete canvas edges require loose target coordinates');
  }
  const metadata = { ...(existing.metadata || {}), ...(input.metadata || {}) };
  const connectionState: CanvasConnectionState = targetNode
    ? (existing.object_relation_id ? 'relation_backed' : 'visual_only')
    : 'incomplete';
  db.prepare(`
    UPDATE canvas_edges
    SET source_port = ?,
        target_node_id = ?,
        target_port = ?,
        loose_target_x = ?,
        loose_target_y = ?,
        relation_layer_id = ?,
        label = ?,
        connection_state = ?,
        style_key = ?,
        metadata = ?,
        updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    sourcePort,
    targetNode?.id || null,
    targetPort,
    looseTargetX,
    looseTargetY,
    layer?.id || null,
    input.label ?? existing.label,
    connectionState,
    input.style_key || existing.style_key || 'default',
    JSON.stringify(metadata),
    edgeId,
    userId,
  );
  db.prepare('UPDATE learning_canvases SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(canvas.id, userId);
  return getCanvasEdge(db, userId, edgeId);
}

function setCanvasEdgeStatus(db: Database.Database, userId: string, edgeId: string, status: CanvasEdgeStatus) {
  getCanvasEdge(db, userId, edgeId);
  db.prepare('UPDATE canvas_edges SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(status, edgeId, userId);
  return getCanvasEdge(db, userId, edgeId);
}

export function archiveCanvasEdge(db: Database.Database, userId: string, edgeId: string) {
  return setCanvasEdgeStatus(db, userId, edgeId, 'archived');
}

export function restoreCanvasEdge(db: Database.Database, userId: string, edgeId: string) {
  return setCanvasEdgeStatus(db, userId, edgeId, 'active');
}

export function bindCanvasEdgeRelation(db: Database.Database, userId: string, edgeId: string, input: BindRelationInput) {
  const relationType = requireRelationType(input.relation_type);
  const run = db.transaction(() => {
    const edge = getCanvasEdge(db, userId, edgeId) as any;
    if (edge.connection_state === 'incomplete' || !edge.target_node_id) {
      throw new AppError(400, 'Incomplete canvas edges cannot bind semantic relations');
    }
    if (edge.status === 'archived') throw new AppError(400, 'Canvas edge is archived');
    const sourceNode = getCanvasNodeForCanvas(db, userId, edge.canvas_id, edge.source_node_id);
    const targetNode = getCanvasNodeForCanvas(db, userId, edge.canvas_id, edge.target_node_id);
    const source = resolveRelationEndpoint(sourceNode);
    const target = resolveRelationEndpoint(targetNode);
    const layer = validateRelationLayerForCanvas(db, userId, edge.course_id, edge.canvas_id, input.relation_layer_id)
      || (edge.relation_layer_id ? getRelationLayer(db, userId, edge.relation_layer_id) : null)
      || getRelationLayer(db, userId, defaultRelationLayerId(db, userId, edge.course_id, edge.canvas_id, 'learning_logic'));
    const metadata = {
      ...(input.metadata || {}),
      source_canvas_edge_id: edge.id,
      source_canvas_node_id: sourceNode.id,
      target_canvas_node_id: targetNode.id,
      source_port: edge.source_port,
      target_port: edge.target_port,
    };
    const relationId = edge.object_relation_id || uuidv4();
    if (edge.object_relation_id) {
      db.prepare(`
        UPDATE object_relations
        SET relation_type = ?,
            status = 'accepted',
            visibility = 'visible',
            confidence = ?,
            relation_layer_id = ?,
            label = ?,
            metadata = ?,
            updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(
        relationType,
        input.confidence ?? null,
        layer.id,
        input.label ?? edge.label ?? null,
        JSON.stringify(metadata),
        relationId,
        userId,
      );
    } else {
      db.prepare(`
        INSERT INTO object_relations (
          id, user_id, course_id, source_type, source_id, target_type, target_id,
          relation_type, status, visibility, confidence, source_canvas_edge_id,
          relation_layer_id, created_by, label, metadata, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'accepted', 'visible', ?, ?, ?, 'user', ?, ?, datetime('now'), datetime('now'))
      `).run(
        relationId,
        userId,
        edge.course_id,
        source.type,
        source.id,
        target.type,
        target.id,
        relationType,
        input.confidence ?? null,
        edge.id,
        layer.id,
        input.label ?? edge.label ?? null,
        JSON.stringify(metadata),
      );
    }
    db.prepare(`
      UPDATE canvas_edges
      SET object_relation_id = ?,
          relation_layer_id = ?,
          relation_kind = ?,
          label = ?,
          connection_state = 'relation_backed',
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(relationId, layer.id, relationType, input.label ?? edge.label ?? null, edge.id, userId);
    return {
      edge: getCanvasEdge(db, userId, edge.id),
      relation: parseObjectRelation(db.prepare('SELECT * FROM object_relations WHERE id = ?').get(relationId)),
    };
  });
  return run();
}

export function unbindCanvasEdgeRelation(db: Database.Database, userId: string, edgeId: string) {
  const run = db.transaction(() => {
    const edge = getCanvasEdge(db, userId, edgeId) as any;
    const relationId = edge.object_relation_id;
    if (relationId) {
      db.prepare(`
        UPDATE object_relations
        SET status = 'detached',
            updated_at = datetime('now')
        WHERE id = ? AND user_id = ?
      `).run(relationId, userId);
    }
    db.prepare(`
      UPDATE canvas_edges
      SET object_relation_id = NULL,
          relation_kind = NULL,
          connection_state = CASE WHEN target_node_id IS NULL THEN 'incomplete' ELSE 'visual_only' END,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(edgeId, userId);
    return {
      edge: getCanvasEdge(db, userId, edgeId),
      relation: relationId ? parseObjectRelation(db.prepare('SELECT * FROM object_relations WHERE id = ?').get(relationId)) : null,
    };
  });
  return run();
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
