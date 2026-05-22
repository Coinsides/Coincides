import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { getSourceAnchorJumpTarget } from './sourceAnchors.js';
import { getSourceScope, getSourceScopeJumpTarget, listSourceScopes } from './sourceScopes.js';

type SourceBoardStatus = 'active' | 'archived';
type SourceBoardNodeStatus = 'active' | 'archived';
type SourceBoardNodeType =
  | 'source_scope'
  | 'source_anchor'
  | 'source_material'
  | 'material_segment'
  | 'evidence_set'
  | 'note_block'
  | 'proposal_entry';

interface SourceBoardInput {
  course_id: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

interface ListSourceBoardsInput {
  course_id: string;
  status?: SourceBoardStatus;
}

interface SourceBoardNodeInput {
  node_type: SourceBoardNodeType;
  target_id?: string;
  source_scope_id?: string;
  source_anchor_id?: string;
  source_material_id?: string;
  material_segment_id?: string;
  evidence_set_id?: string;
  note_block_id?: string;
  proposal_id?: string;
  title?: string;
  summary?: string | null;
  order_index?: number;
  layout_x?: number | null;
  layout_y?: number | null;
  layout_width?: number | null;
  layout_height?: number | null;
  metadata?: Record<string, unknown>;
}

interface ListSourceBoardNodesInput {
  status?: SourceBoardNodeStatus;
}

interface ResolvedSourceBoardForProposal {
  source_board_id?: string;
  source_scope_ids: string[];
  warnings: string[];
}

const NODE_TYPES = new Set<SourceBoardNodeType>([
  'source_scope',
  'source_anchor',
  'source_material',
  'material_segment',
  'evidence_set',
  'note_block',
  'proposal_entry',
]);

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

function parseBoard(row: any) {
  return row ? { ...row, metadata: parseJson(row.metadata, {}) } : row;
}

function parseNode(row: any) {
  return row ? { ...row, metadata: parseJson(row.metadata, {}) } : row;
}

function requireNodeType(value: string): SourceBoardNodeType {
  if (NODE_TYPES.has(value as SourceBoardNodeType)) return value as SourceBoardNodeType;
  throw new AppError(400, 'Invalid source board node type');
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))];
}

export function createSourceBoard(db: Database.Database, userId: string, input: SourceBoardInput) {
  if (!input.course_id) throw new AppError(400, 'course_id is required');
  ensureCourse(db, userId, input.course_id);
  const id = uuidv4();
  db.prepare(`
    INSERT INTO source_boards (id, user_id, course_id, title, status, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    input.course_id,
    String(input.title || 'Source Board').trim() || 'Source Board',
    JSON.stringify(input.metadata || {}),
  );
  return getSourceBoard(db, userId, id);
}

export function listSourceBoards(db: Database.Database, userId: string, input: ListSourceBoardsInput) {
  if (!input.course_id) throw new AppError(400, 'course_id query parameter is required');
  ensureCourse(db, userId, input.course_id);
  const params: unknown[] = [userId, input.course_id];
  let where = 'user_id = ? AND course_id = ?';
  if (input.status) {
    if (!['active', 'archived'].includes(input.status)) throw new AppError(400, 'Invalid source board status');
    where += ' AND status = ?';
    params.push(input.status);
  }
  return db.prepare(`
    SELECT *
    FROM source_boards
    WHERE ${where}
    ORDER BY updated_at DESC, created_at DESC
  `).all(...params).map(parseBoard);
}

export function getSourceBoard(db: Database.Database, userId: string, boardId: string) {
  const board = db.prepare('SELECT * FROM source_boards WHERE id = ? AND user_id = ?')
    .get(boardId, userId) as any;
  if (!board) throw new AppError(404, 'Source board not found');
  return parseBoard(board);
}

export function getSourceBoardDetail(db: Database.Database, userId: string, boardId: string) {
  const board = getSourceBoard(db, userId, boardId);
  return {
    board,
    nodes: listSourceBoardNodes(db, userId, boardId, { status: 'active' }),
  };
}

export function updateSourceBoard(db: Database.Database, userId: string, boardId: string, input: Partial<SourceBoardInput>) {
  const existing = getSourceBoard(db, userId, boardId) as any;
  const title = typeof input.title === 'string' && input.title.trim()
    ? input.title.trim()
    : existing.title;
  const metadata = { ...(existing.metadata || {}), ...(input.metadata || {}) };
  db.prepare(`
    UPDATE source_boards
    SET title = ?, metadata = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(title, JSON.stringify(metadata), boardId, userId);
  return getSourceBoard(db, userId, boardId);
}

function setBoardStatus(db: Database.Database, userId: string, boardId: string, status: SourceBoardStatus) {
  getSourceBoard(db, userId, boardId);
  db.prepare('UPDATE source_boards SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(status, boardId, userId);
  return getSourceBoard(db, userId, boardId);
}

export function archiveSourceBoard(db: Database.Database, userId: string, boardId: string) {
  return setBoardStatus(db, userId, boardId, 'archived');
}

export function restoreSourceBoard(db: Database.Database, userId: string, boardId: string) {
  return setBoardStatus(db, userId, boardId, 'active');
}

function maxOrderIndex(db: Database.Database, boardId: string): number {
  const row = db.prepare('SELECT COALESCE(MAX(order_index), -1) AS value FROM source_board_nodes WHERE source_board_id = ?')
    .get(boardId) as { value: number };
  return row.value;
}

function targetForNode(db: Database.Database, userId: string, courseId: string, input: SourceBoardNodeInput) {
  const nodeType = requireNodeType(input.node_type);
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
      summary: input.summary ?? [
        scope.scope_kind.replace(/_/g, ' '),
        scope.page_start ? `p.${scope.page_start}${scope.page_end && scope.page_end !== scope.page_start ? `-${scope.page_end}` : ''}` : '',
      ].filter(Boolean).join(' · '),
      fields: {
        source_scope_id: scope.id,
        source_anchor_id: scope.source_anchor_id || null,
        source_material_id: scope.source_material_id || null,
        material_segment_id: scope.material_segment_id || null,
        evidence_set_id: null,
        note_block_id: null,
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
      summary: input.summary ?? `p.${anchor.page_start || '?'}${anchor.page_end && anchor.page_end !== anchor.page_start ? `-${anchor.page_end}` : ''}`,
      fields: {
        source_scope_id: null,
        source_anchor_id: anchor.id,
        source_material_id: anchor.source_material_id || null,
        material_segment_id: anchor.material_segment_id || null,
        evidence_set_id: null,
        note_block_id: null,
        proposal_id: null,
      },
    };
  }
  const targetId = input.target_id
    || input.source_material_id
    || input.material_segment_id
    || input.evidence_set_id
    || input.note_block_id
    || input.proposal_id;
  if (!targetId) throw new AppError(400, 'target_id is required');
  return {
    nodeType,
    targetId,
    title: input.title || nodeType.replace(/_/g, ' '),
    summary: input.summary ?? null,
    fields: {
      source_scope_id: input.source_scope_id || null,
      source_anchor_id: input.source_anchor_id || null,
      source_material_id: input.source_material_id || (nodeType === 'source_material' ? targetId : null),
      material_segment_id: input.material_segment_id || (nodeType === 'material_segment' ? targetId : null),
      evidence_set_id: input.evidence_set_id || (nodeType === 'evidence_set' ? targetId : null),
      note_block_id: input.note_block_id || (nodeType === 'note_block' ? targetId : null),
      proposal_id: input.proposal_id || (nodeType === 'proposal_entry' ? targetId : null),
    },
  };
}

function existingActiveNode(db: Database.Database, boardId: string, nodeType: SourceBoardNodeType, targetId: string) {
  return db.prepare(`
    SELECT *
    FROM source_board_nodes
    WHERE source_board_id = ? AND node_type = ? AND target_id = ? AND status = 'active'
    LIMIT 1
  `).get(boardId, nodeType, targetId) as any;
}

export function createSourceBoardNode(
  db: Database.Database,
  userId: string,
  boardId: string,
  input: SourceBoardNodeInput,
) {
  const board = getSourceBoard(db, userId, boardId) as any;
  if (board.status === 'archived') throw new AppError(400, 'Source board is archived');
  const target = targetForNode(db, userId, board.course_id, input);
  const existing = existingActiveNode(db, boardId, target.nodeType, target.targetId);
  if (existing) return parseNode(existing);
  const id = uuidv4();
  db.prepare(`
    INSERT INTO source_board_nodes (
      id, user_id, course_id, source_board_id, node_type, target_id,
      source_scope_id, source_anchor_id, source_material_id, material_segment_id,
      evidence_set_id, note_block_id, proposal_id, title, summary, status,
      order_index, layout_x, layout_y, layout_width, layout_height, metadata,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    id,
    userId,
    board.course_id,
    boardId,
    target.nodeType,
    target.targetId,
    target.fields.source_scope_id,
    target.fields.source_anchor_id,
    target.fields.source_material_id,
    target.fields.material_segment_id,
    target.fields.evidence_set_id,
    target.fields.note_block_id,
    target.fields.proposal_id,
    target.title,
    target.summary,
    input.order_index ?? maxOrderIndex(db, boardId) + 1,
    input.layout_x ?? null,
    input.layout_y ?? null,
    input.layout_width ?? null,
    input.layout_height ?? null,
    JSON.stringify(input.metadata || {}),
  );
  db.prepare('UPDATE source_boards SET updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(boardId, userId);
  return getSourceBoardNode(db, userId, id);
}

export function listSourceBoardNodes(
  db: Database.Database,
  userId: string,
  boardId: string,
  input: ListSourceBoardNodesInput = {},
) {
  getSourceBoard(db, userId, boardId);
  const params: unknown[] = [userId, boardId];
  let where = 'user_id = ? AND source_board_id = ?';
  if (input.status) {
    if (!['active', 'archived'].includes(input.status)) throw new AppError(400, 'Invalid source board node status');
    where += ' AND status = ?';
    params.push(input.status);
  }
  return db.prepare(`
    SELECT *
    FROM source_board_nodes
    WHERE ${where}
    ORDER BY order_index ASC, created_at ASC
  `).all(...params).map(parseNode);
}

export function getSourceBoardNode(db: Database.Database, userId: string, nodeId: string) {
  const node = db.prepare('SELECT * FROM source_board_nodes WHERE id = ? AND user_id = ?')
    .get(nodeId, userId) as any;
  if (!node) throw new AppError(404, 'Source board node not found');
  return parseNode(node);
}

export function updateSourceBoardNode(
  db: Database.Database,
  userId: string,
  nodeId: string,
  input: Partial<SourceBoardNodeInput>,
) {
  const existing = getSourceBoardNode(db, userId, nodeId) as any;
  const metadata = { ...(existing.metadata || {}), ...(input.metadata || {}) };
  db.prepare(`
    UPDATE source_board_nodes
    SET title = ?,
        summary = ?,
        order_index = ?,
        layout_x = ?,
        layout_y = ?,
        layout_width = ?,
        layout_height = ?,
        metadata = ?,
        updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    input.title ?? existing.title,
    input.summary ?? existing.summary,
    input.order_index ?? existing.order_index,
    input.layout_x ?? existing.layout_x,
    input.layout_y ?? existing.layout_y,
    input.layout_width ?? existing.layout_width,
    input.layout_height ?? existing.layout_height,
    JSON.stringify(metadata),
    nodeId,
    userId,
  );
  return getSourceBoardNode(db, userId, nodeId);
}

function setNodeStatus(db: Database.Database, userId: string, nodeId: string, status: SourceBoardNodeStatus) {
  getSourceBoardNode(db, userId, nodeId);
  db.prepare('UPDATE source_board_nodes SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
    .run(status, nodeId, userId);
  return getSourceBoardNode(db, userId, nodeId);
}

export function archiveSourceBoardNode(db: Database.Database, userId: string, nodeId: string) {
  return setNodeStatus(db, userId, nodeId, 'archived');
}

export function restoreSourceBoardNode(db: Database.Database, userId: string, nodeId: string) {
  return setNodeStatus(db, userId, nodeId, 'active');
}

export function seedSourceBoardFromScopes(db: Database.Database, userId: string, boardId: string) {
  const board = getSourceBoard(db, userId, boardId) as any;
  if (board.status === 'archived') throw new AppError(400, 'Source board is archived');
  const scopes = listSourceScopes(db, userId, { course_id: board.course_id, status: 'active' }) as any[];
  let created = 0;
  const run = db.transaction(() => {
    for (const scope of scopes) {
      const before = existingActiveNode(db, boardId, 'source_scope', scope.id);
      createSourceBoardNode(db, userId, boardId, {
        node_type: 'source_scope',
        source_scope_id: scope.id,
      });
      if (!before) created += 1;
    }
  });
  run();
  return {
    nodes_created_count: created,
    active_scope_count: scopes.length,
    total_node_count: (db.prepare("SELECT COUNT(*) AS count FROM source_board_nodes WHERE source_board_id = ? AND status = 'active'")
      .get(boardId) as any).count,
  };
}

export function getSourceBoardNodeJumpTarget(db: Database.Database, userId: string, nodeId: string) {
  const node = getSourceBoardNode(db, userId, nodeId) as any;
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
  return {
    node,
    target: {
      type: node.node_type,
      id: node.target_id,
    },
    warnings: ['This Source Board node does not have a source jump target yet.'],
  };
}

export function resolveSourceBoardForProposal(
  db: Database.Database,
  userId: string,
  courseId: string,
  sourceBoardId?: string,
): ResolvedSourceBoardForProposal {
  if (!sourceBoardId) {
    return { source_scope_ids: [], warnings: [] };
  }
  const board = getSourceBoard(db, userId, sourceBoardId) as any;
  if (board.course_id !== courseId) throw new AppError(400, 'Source board belongs to a different course');
  if (board.status === 'archived') throw new AppError(400, 'Source board is archived');
  const nodes = listSourceBoardNodes(db, userId, sourceBoardId, { status: 'active' }) as any[];
  const scopeIds = unique(nodes
    .filter((node) => node.node_type === 'source_scope')
    .map((node) => node.source_scope_id || node.target_id));
  return {
    source_board_id: board.id,
    source_scope_ids: scopeIds,
    warnings: scopeIds.length === 0
      ? ['Source board has no active source scope nodes; proposal used broader course-level source material.']
      : [],
  };
}
