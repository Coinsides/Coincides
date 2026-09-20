import type Database from 'better-sqlite3';
import type { BoardAgentLayoutReceipt } from '../../../shared/types/boardAgentReceipt.js';
import { inspectAgentBoard } from './boardAgentLayout.js';
import { AppError } from '../middleware/errorHandler.js';
import { BOARD_ACTION_TOOLS } from '../toolFace/boardActions.js';
import { recordAgentAction, type AgentActionContext } from './recordAgentAction.js';
import { getBoard, mountBoardMember, updateBoardMember, createBoardEdge, createBoardSticky,
  updateBoardSticky, updateBoardVisual } from './boards.js';
import { boardActionSnapshot, findBoardActionObject, type BoardActionKind } from './boardActionSnapshots.js';

/** Only adapts the registered tool to the same services used by boards.ts routes. */
export function executeAgentBoardAction(db: Database.Database, name: string, args: Record<string, unknown>, userId: string, context?: AgentActionContext) {
  const tool = BOARD_ACTION_TOOLS.find(entry => entry.name === name);
  if (!tool) throw new AppError(400, 'Unknown board action');
  const parsed = tool.input_schema.parse(args) as { board_id: string; member_id?: string; sticky_id?: string; visual_id?: string; input: Record<string, unknown> };
  const batchId = context?.conversationId ?? '';
  const boardId = parsed.board_id;
  const { result, receipt } = recordAgentAction(db, userId, context, {
    tool, input: args, verb: name === 'board_mount_member' ? 'mounted' : 'board_changed',
    summary: name, boardBatch: { batch_id: batchId, board_id: boardId },
    execute: () => {
      const detail = getBoard(db, userId, boardId);
      const kind: BoardActionKind = name.includes('member') ? 'board_member'
        : name.includes('sticky') ? 'board_sticky' : name.includes('edge') ? 'board_edge' : 'board_visual';
      const targetId = parsed.member_id ?? parsed.sticky_id ?? parsed.visual_id;
      const existing = targetId ? findBoardActionObject(detail, kind, targetId) : undefined;
      if (targetId && !existing) throw new AppError(404, 'board_action_target_not_found');
      if (kind === 'board_visual' && existing && !['sticky', 'shape', 'freehand'].includes((existing as { visual_kind: string }).visual_kind)) {
        throw new AppError(400, 'board_action_visual_kind_unavailable');
      }
      const before = existing ? boardActionSnapshot(kind, existing) : null;
      const input = parsed.input;
      let entity;
      switch (name) {
        case 'board_mount_member': entity = mountBoardMember(db, userId, boardId, { ...input, placed: false }, 'agent').member; break;
        case 'board_move_member':
        case 'board_set_member_layer': entity = updateBoardMember(db, userId, boardId, targetId!, input); break;
        case 'board_create_edge': entity = createBoardEdge(db, userId, boardId, input); break;
        case 'board_create_sticky': entity = createBoardSticky(db, userId, boardId, { ...input, placed: false }, 'agent'); break;
        case 'board_update_sticky': entity = updateBoardSticky(db, userId, boardId, targetId!, input); break;
        case 'board_patch_visual': entity = updateBoardVisual(db, userId, boardId, targetId!, input); break;
        default: throw new AppError(400, 'Unknown board action');
      }
      return { entity, kind, before, after: boardActionSnapshot(kind, entity), courseId: detail.board.project_id };
    },
    resources: change => [{ kind: change.kind, id: change.entity.id, board_id: boardId, batch_id: batchId,
      outcome: change.before ? 'updated' : 'created', before: change.before, after: change.after }],
    courseId: change => change.courseId,
  });
  let layout: BoardAgentLayoutReceipt;
  try {
    layout = { board_id: boardId, batch_id: batchId, report: inspectAgentBoard(getBoard(db, userId, boardId)) };
  } catch {
    // Diagnosis cannot turn a committed write into an apparent failure.
    layout = { board_id: boardId, batch_id: batchId, report: null, diagnostic_error: 'layout_diagnostic_unavailable' };
  }
  return tool.output_schema.parse({ id: result.entity.id, board_id: boardId, batch_id: batchId, layout_report: layout,
    receipt_id: receipt.id, entity: result.entity, message: `${name} saved; this conversation's board batch can be reverted.` });
}
