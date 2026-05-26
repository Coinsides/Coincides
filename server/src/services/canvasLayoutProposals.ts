import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import {
  createCanvasNode,
  getLearningCanvas,
  listCanvasNodes,
  updateCanvasNode,
} from './learningCanvases.js';
import { getSourceBoard, listSourceBoardNodes } from './sourceBoards.js';
import { getSourceScope } from './sourceScopes.js';

type CanvasLayoutAction = 'update_layout' | 'create_node';
type CanvasLayoutGoal = 'a4_reading' | 'board_overview';
type CanvasNodeTargetType =
  | 'note_block'
  | 'source_scope'
  | 'source_anchor'
  | 'source_board_node'
  | 'source_material'
  | 'material_segment'
  | 'evidence_set'
  | 'proposal';

interface CreateCanvasLayoutProposalInput {
  course_id: string;
  canvas_id: string;
  source_board_id?: string;
  canvas_node_ids?: string[];
  source_scope_ids?: string[];
  note_block_ids?: string[];
  layout_goal?: CanvasLayoutGoal;
}

interface ProposalRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  data: string;
}

interface LayoutTarget {
  key: string;
  action: CanvasLayoutAction;
  node_type: CanvasNodeTargetType;
  target_id: string;
  canvas_node_id?: string;
  title: string;
  summary: string | null;
  width: number;
  height: number;
  target_ref: Record<string, string>;
  previous_layout?: Record<string, number>;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function unique(values: string[] = []): string[] {
  return [...new Set(values.filter(Boolean))];
}

function ensureCourse(db: Database.Database, userId: string, courseId: string): void {
  const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, userId);
  if (!course) throw new AppError(404, 'Course not found');
}

function existingActiveNode(db: Database.Database, canvasId: string, nodeType: string, targetId: string) {
  return db.prepare(`
    SELECT *
    FROM canvas_nodes
    WHERE canvas_id = ? AND node_type = ? AND target_id = ? AND status = 'active'
  `).get(canvasId, nodeType, targetId) as any;
}

function getCanvasNodeForLayout(db: Database.Database, userId: string, courseId: string, canvasId: string, nodeId: string) {
  const node = db.prepare(`
    SELECT *
    FROM canvas_nodes
    WHERE id = ? AND user_id = ? AND course_id = ? AND canvas_id = ? AND status = 'active'
  `).get(nodeId, userId, courseId, canvasId) as any;
  if (!node) throw new AppError(404, 'Canvas node not found for this canvas');
  return node;
}

function getNoteBlockForLayout(db: Database.Database, userId: string, courseId: string, blockId: string) {
  const block = db.prepare(`
    SELECT *
    FROM note_blocks
    WHERE id = ? AND user_id = ? AND course_id = ? AND status = 'active'
  `).get(blockId, userId, courseId) as any;
  if (!block) throw new AppError(404, 'NoteBlock not found for this course');
  return block;
}

function targetRefForNodeType(nodeType: CanvasNodeTargetType, targetId: string): Record<string, string> {
  switch (nodeType) {
    case 'note_block': return { note_block_id: targetId };
    case 'source_scope': return { source_scope_id: targetId };
    case 'source_anchor': return { source_anchor_id: targetId };
    case 'source_board_node': return { source_board_node_id: targetId };
    case 'source_material': return { source_material_id: targetId };
    case 'material_segment': return { material_segment_id: targetId };
    case 'evidence_set': return { evidence_set_id: targetId };
    case 'proposal': return { proposal_id: targetId };
    default: return { target_id: targetId };
  }
}

function addTarget(targets: Map<string, LayoutTarget>, target: Omit<LayoutTarget, 'key'>): void {
  const key = `${target.node_type}:${target.target_id}`;
  if (targets.has(key)) return;
  targets.set(key, { ...target, key });
}

function addExistingNodeTarget(targets: Map<string, LayoutTarget>, node: any): void {
  addTarget(targets, {
    action: 'update_layout',
    node_type: node.node_type,
    target_id: node.target_id,
    canvas_node_id: node.id,
    title: node.title,
    summary: node.summary,
    width: node.width || 300,
    height: node.height || 160,
    target_ref: targetRefForNodeType(node.node_type, node.target_id),
    previous_layout: {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      z_index: node.z_index,
    },
  });
}

function addSourceBoardTargets(
  db: Database.Database,
  userId: string,
  courseId: string,
  canvasId: string,
  sourceBoardId: string,
  targets: Map<string, LayoutTarget>,
): void {
  const board = getSourceBoard(db, userId, sourceBoardId) as any;
  if (board.course_id !== courseId) throw new AppError(400, 'Source board belongs to a different course');
  if (board.status === 'archived') throw new AppError(400, 'Source board is archived');
  const nodes = listSourceBoardNodes(db, userId, sourceBoardId, { status: 'active' }) as any[];
  for (const boardNode of nodes) {
    const existing = existingActiveNode(db, canvasId, 'source_board_node', boardNode.id);
    if (existing) {
      addExistingNodeTarget(targets, existing);
      continue;
    }
    addTarget(targets, {
      action: 'create_node',
      node_type: 'source_board_node',
      target_id: boardNode.id,
      title: boardNode.title,
      summary: boardNode.summary,
      width: boardNode.layout_width || 300,
      height: boardNode.layout_height || 160,
      target_ref: { source_board_node_id: boardNode.id },
    });
  }
}

function addSourceScopeTargets(
  db: Database.Database,
  userId: string,
  courseId: string,
  canvasId: string,
  sourceScopeIds: string[],
  targets: Map<string, LayoutTarget>,
): void {
  for (const scopeId of unique(sourceScopeIds)) {
    const scope = getSourceScope(db, userId, scopeId) as any;
    if (scope.course_id !== courseId) throw new AppError(400, 'Source scope belongs to a different course');
    if (scope.status === 'archived') throw new AppError(400, 'Source scope is archived');
    const existing = existingActiveNode(db, canvasId, 'source_scope', scope.id);
    if (existing) {
      addExistingNodeTarget(targets, existing);
      continue;
    }
    addTarget(targets, {
      action: 'create_node',
      node_type: 'source_scope',
      target_id: scope.id,
      title: scope.label,
      summary: [scope.scope_kind.replace(/_/g, ' '), scope.page_start ? `p.${scope.page_start}` : ''].filter(Boolean).join(' - '),
      width: 300,
      height: 150,
      target_ref: { source_scope_id: scope.id },
    });
  }
}

function addNoteBlockTargets(
  db: Database.Database,
  userId: string,
  courseId: string,
  canvasId: string,
  noteBlockIds: string[],
  targets: Map<string, LayoutTarget>,
): void {
  for (const blockId of unique(noteBlockIds)) {
    const block = getNoteBlockForLayout(db, userId, courseId, blockId);
    const existing = existingActiveNode(db, canvasId, 'note_block', block.id);
    if (existing) {
      addExistingNodeTarget(targets, existing);
      continue;
    }
    addTarget(targets, {
      action: 'create_node',
      node_type: 'note_block',
      target_id: block.id,
      title: block.title || block.block_type,
      summary: block.plain_text || null,
      width: 320,
      height: 180,
      target_ref: { note_block_id: block.id },
    });
  }
}

function layoutTargets(canvas: any, targets: LayoutTarget[]) {
  const marginX = 56;
  const marginY = 88;
  const gapX = 24;
  const gapY = 28;
  const usableWidth = Math.max(320, (canvas.width || 794) - marginX * 2);
  const columns = usableWidth >= 680 && targets.length > 1 ? 2 : 1;
  const columnWidth = columns === 2 ? Math.floor((usableWidth - gapX) / 2) : Math.min(560, usableWidth);
  let maxBottom = marginY;

  const nodeLayouts = targets.map((target, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const width = Math.min(Math.max(target.width || columnWidth, 240), columnWidth);
    const height = Math.max(target.height || 160, 140);
    const x = marginX + col * (columnWidth + gapX);
    const y = marginY + row * (height + gapY);
    maxBottom = Math.max(maxBottom, y + height);
    return {
      temp_id: `layout-${index + 1}`,
      action: target.action,
      canvas_node_id: target.canvas_node_id,
      node_type: target.node_type,
      target_id: target.target_id,
      target_ref: target.target_ref,
      title: target.title,
      summary: target.summary,
      x,
      y,
      width,
      height,
      z_index: index,
      previous_layout: target.previous_layout,
    };
  });

  const frameHeight = Math.max(260, maxBottom - marginY + 92);
  const frameWidth = columns * columnWidth + (columns - 1) * gapX + 32;
  const frames = nodeLayouts.length > 0 ? [{
    temp_id: 'frame-1',
    title: 'Proposed layout group',
    x: marginX - 16,
    y: marginY - 44,
    width: frameWidth,
    height: frameHeight,
    metadata: {
      created_from: 'canvas_layout_proposal',
      layout_goal: 'a4_reading',
    },
  }] : [];
  const proposedHeight = Math.max(canvas.height || 1123, maxBottom + marginY);

  return {
    node_layouts: nodeLayouts,
    frames,
    proposed_canvas: {
      width: canvas.width || 794,
      height: proposedHeight,
    },
  };
}

export function createCanvasLayoutProposal(
  db: Database.Database,
  userId: string,
  input: CreateCanvasLayoutProposalInput,
) {
  ensureCourse(db, userId, input.course_id);
  const canvas = getLearningCanvas(db, userId, input.canvas_id) as any;
  if (canvas.course_id !== input.course_id) throw new AppError(400, 'Canvas belongs to a different course');
  if (canvas.status === 'archived') throw new AppError(400, 'Canvas is archived');

  const targets = new Map<string, LayoutTarget>();
  const explicitCanvasNodeIds = unique(input.canvas_node_ids || []);
  const canvasNodes = explicitCanvasNodeIds.length > 0
    ? explicitCanvasNodeIds.map((id) => getCanvasNodeForLayout(db, userId, input.course_id, canvas.id, id))
    : listCanvasNodes(db, userId, canvas.id, { status: 'active' }) as any[];
  for (const node of canvasNodes) addExistingNodeTarget(targets, node);
  if (input.source_board_id) addSourceBoardTargets(db, userId, input.course_id, canvas.id, input.source_board_id, targets);
  addSourceScopeTargets(db, userId, input.course_id, canvas.id, input.source_scope_ids || [], targets);
  addNoteBlockTargets(db, userId, input.course_id, canvas.id, input.note_block_ids || [], targets);

  if (targets.size === 0) {
    throw new AppError(400, 'No canvas layout objects found for the selected scope');
  }

  const orderedTargets = [...targets.values()];
  const planned = layoutTargets(canvas, orderedTargets);
  const warnings: string[] = [];
  if (!input.source_board_id && !input.source_scope_ids?.length && !input.note_block_ids?.length) {
    warnings.push('Layout proposal used existing canvas nodes only.');
  }
  if (planned.proposed_canvas.height > (canvas.height || 1123)) {
    warnings.push('Proposed layout extends the canvas projection height.');
  }

  const proposalId = uuidv4();
  const now = new Date().toISOString();
  const data = {
    version: 'v2.4.3',
    proposal_kind: 'canvas_layout',
    course_id: input.course_id,
    canvas_id: canvas.id,
    source_board_id: input.source_board_id,
    source_scope_ids: unique(input.source_scope_ids || []),
    note_block_ids: unique(input.note_block_ids || []),
    layout_goal: input.layout_goal || 'a4_reading',
    title: 'Canvas layout proposal',
    description: 'Review proposed canvas positions before applying. This changes layout records only.',
    input_summary: {
      selected_canvas_node_count: canvasNodes.length,
      selected_source_board_id: input.source_board_id || null,
      selected_source_scope_count: unique(input.source_scope_ids || []).length,
      selected_note_block_count: unique(input.note_block_ids || []).length,
      planned_object_count: orderedTargets.length,
      create_node_count: planned.node_layouts.filter((layout) => layout.action === 'create_node').length,
      update_layout_count: planned.node_layouts.filter((layout) => layout.action === 'update_layout').length,
    },
    node_layouts: planned.node_layouts,
    frames: planned.frames,
    proposed_canvas: planned.proposed_canvas,
    warnings,
    confidence: 0.72,
    generation_mode: 'deterministic',
    apply_behavior: 'layout_records_only',
  };

  db.prepare(`
    INSERT INTO proposals (id, user_id, type, status, data, created_at)
    VALUES (?, ?, 'canvas_layout', 'pending', ?, ?)
  `).run(proposalId, userId, JSON.stringify(data), now);

  return {
    id: proposalId,
    user_id: userId,
    type: 'canvas_layout',
    status: 'pending',
    data,
    created_at: now,
    resolved_at: null,
  };
}

function createOrUpdateNodeFromLayout(
  db: Database.Database,
  userId: string,
  canvasId: string,
  layout: any,
  proposalId: string,
) {
  if (layout.action === 'update_layout') {
    return {
      mode: 'updated',
      node: updateCanvasNode(db, userId, layout.canvas_node_id, {
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        z_index: layout.z_index,
        metadata: {
          canvas_layout_proposal: proposalId,
          layout_action: 'update_layout',
        },
      }),
    };
  }

  const existing = existingActiveNode(db, canvasId, layout.node_type, layout.target_id);
  if (existing) {
    return {
      mode: 'updated',
      node: updateCanvasNode(db, userId, existing.id, {
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        z_index: layout.z_index,
        metadata: {
          canvas_layout_proposal: proposalId,
          layout_action: 'create_node_existing_target',
        },
      }),
    };
  }

  return {
    mode: 'created',
    node: createCanvasNode(db, userId, canvasId, {
      node_type: layout.node_type,
      target_id: layout.target_id,
      ...(layout.target_ref || {}),
      title: layout.title,
      summary: layout.summary,
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
      z_index: layout.z_index,
      metadata: {
        created_from: 'canvas_layout_proposal',
        canvas_layout_proposal: proposalId,
      },
    }),
  };
}

export function applyCanvasLayoutProposal(db: Database.Database, userId: string, proposal: ProposalRow) {
  if (proposal.type !== 'canvas_layout') {
    throw new AppError(400, 'Proposal is not a canvas layout proposal');
  }
  const data = parseJson<any>(proposal.data, {});
  if (!data || data.proposal_kind !== 'canvas_layout' || !data.course_id || !data.canvas_id || !Array.isArray(data.node_layouts)) {
    throw new AppError(400, 'Canvas layout proposal is malformed');
  }

  const canvas = getLearningCanvas(db, userId, data.canvas_id) as any;
  if (canvas.course_id !== data.course_id) throw new AppError(400, 'Canvas layout proposal course mismatch');
  if (canvas.status === 'archived') throw new AppError(400, 'Canvas is archived');

  const now = new Date().toISOString();
  const batchId = uuidv4();
  db.prepare(`
    INSERT INTO operation_batches (id, user_id, course_id, source_type, source_id, label, status, metadata, applied_at)
    VALUES (?, ?, ?, 'proposal', ?, 'Apply canvas layout proposal', 'applied', ?, ?)
  `).run(
    batchId,
    userId,
    data.course_id,
    proposal.id,
    JSON.stringify({ proposal_type: 'canvas_layout', apply_behavior: 'layout_records_only' }),
    now,
  );

  let nodesCreated = 0;
  let nodesUpdated = 0;
  for (const layout of data.node_layouts) {
    if (!layout?.node_type || !layout.target_id || typeof layout.x !== 'number' || typeof layout.y !== 'number') {
      throw new AppError(400, 'Canvas layout proposal contains an invalid node layout');
    }
    const result = createOrUpdateNodeFromLayout(db, userId, data.canvas_id, layout, proposal.id);
    if (result.mode === 'created') nodesCreated += 1;
    else nodesUpdated += 1;
  }

  let framesCreated = 0;
  for (const frame of Array.isArray(data.frames) ? data.frames : []) {
    if (!frame?.title) continue;
    db.prepare(`
      INSERT INTO canvas_frames (
        id, user_id, course_id, canvas_id, title, status, x, y, width, height, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      uuidv4(),
      userId,
      data.course_id,
      data.canvas_id,
      String(frame.title),
      Number(frame.x || 0),
      Number(frame.y || 0),
      Number(frame.width || 640),
      Number(frame.height || 480),
      JSON.stringify({
        ...(frame.metadata || {}),
        created_from: 'canvas_layout_proposal',
        canvas_layout_proposal: proposal.id,
      }),
    );
    framesCreated += 1;
  }

  const proposedHeight = Number(data.proposed_canvas?.height || 0);
  const proposedWidth = Number(data.proposed_canvas?.width || 0);
  const metadata = {
    ...(canvas.metadata || {}),
    last_layout_proposal_id: proposal.id,
    last_layout_goal: data.layout_goal || 'a4_reading',
  };
  db.prepare(`
    UPDATE learning_canvases
    SET width = ?,
        height = ?,
        metadata = ?,
        updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(
    Math.max(Number(canvas.width || 0), proposedWidth || 0),
    Math.max(Number(canvas.height || 0), proposedHeight || 0),
    JSON.stringify(metadata),
    data.canvas_id,
    userId,
  );

  return {
    message: 'Canvas layout proposal applied successfully',
    operation_batch_id: batchId,
    nodes_created_count: nodesCreated,
    nodes_updated_count: nodesUpdated,
    frames_created_count: framesCreated,
    canvas_id: data.canvas_id,
  };
}
