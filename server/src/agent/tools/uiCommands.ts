import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { AgentUiCommand, AgentUiTarget } from '../../../../shared/types/agentUiCommand.js';
import { AGENT_UI_TOOLS } from '../../toolFace/uiActions.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { AgentActionContext } from '../../services/recordAgentAction.js';
import { getNote, listNoteBlocks } from '../../services/notes.js';
import { getBoard } from '../../services/boards.js';
import { readNoteForAgent } from '../../services/agentReadSurfaces.js';

// Server/shared runtime imports are forbidden by the existing production gate.
// The cross-end contract test compares these with shared's UI constants.
export const AGENT_UI_TURN_LIMIT = 8;
export const AGENT_UI_DEBOUNCE_MS = 1000;

/** Owned by one runAgent invocation, never global and never stored in a truth table. */
export interface AgentUiRunState {
  turnId: string;
  dispatched: number;
  recentTargets: Map<string, number>;
}

export function createAgentUiRunState(turnId: string): AgentUiRunState {
  return { turnId, dispatched: 0, recentTargets: new Map() };
}

export function executeAgentUiCommand(
  db: Database.Database, name: string, args: Record<string, unknown>, userId: string,
  context: AgentActionContext | undefined, state: AgentUiRunState | undefined,
) {
  const tool = AGENT_UI_TOOLS.find(candidate => candidate.name === name);
  if (!tool) throw new AppError(400, 'Unknown UI command');
  if (!state || !state.turnId || context?.actor !== 'agent' || context.channel !== 'chat'
    || !context.conversationId.trim()) throw new AppError(400, 'UI command turn context is required');
  const conversation = db.prepare('SELECT id FROM agent_conversations WHERE id=? AND user_id=?')
    .get(context.conversationId, userId);
  if (!conversation) throw new AppError(404, 'Conversation not found');
  const input = tool.input_schema.parse(args);
  const target: AgentUiTarget = name === 'ui_open_note'
    ? { type: 'note', note_id: input.note_id } : input.target;

  // Resolve against the same owned human readers; these paths never create or edit.
  if (target.type === 'board_member') {
    const board = getBoard(db, userId, target.board_id);
    const member = board.members.find(member => member.id === target.member_id && member.placed);
    if (!member) {
      throw new AppError(404, 'Placed board member not found');
    }
    const visible = member.layer_id === null ? board.board.base_layer_visible
      : board.layers.find(layer => layer.id === member.layer_id)?.visible;
    if (!visible) throw new AppError(409, 'Board member is hidden; reveal its layer before requesting focus');
  } else {
    getNote({ userId, noteId: target.note_id });
    if (target.type === 'note_block'
      && !listNoteBlocks({ userId, noteId: target.note_id }).some(block => block.id === target.block_id)) {
      throw new AppError(404, 'Note block not found');
    }
    if (target.type === 'note_page') readNoteForAgent({ userId, noteId: target.note_id, pageIndex: target.page_index });
  }

  const now = Date.now();
  const key = `${name}:${JSON.stringify(target)}`;
  const previous = state.recentTargets.get(key);
  if (previous !== undefined && now - previous < AGENT_UI_DEBOUNCE_MS) {
    return tool.output_schema.parse({ dispatched: false, reason: 'debounced',
      message: 'Identical UI command was already issued within 1 second; no additional command was sent.' });
  }
  if (state.dispatched >= AGENT_UI_TURN_LIMIT) throw new AppError(429, 'UI command turn limit reached (8)');
  const identity = { command_id: randomUUID(), turn_id: state.turnId, conversation_id: context.conversationId };
  const command: AgentUiCommand = target.type === 'note'
    ? { ...identity, kind: 'open_note', target }
    : { ...identity, kind: 'focus_object', target };
  state.dispatched += 1;
  state.recentTargets.set(key, now);
  return tool.output_schema.parse({ dispatched: true, command,
    message: 'UI command issued; the client may defer while the user is typing. No document or board content was changed.' });
}
