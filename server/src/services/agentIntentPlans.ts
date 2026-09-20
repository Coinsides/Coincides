import { createHash, randomUUID } from 'node:crypto';
import type { AgentContextHint } from '../../../shared/types/agentContextHint.js';
import type { AgentMessageMeta } from '../../../shared/types/agentIntent.js';
import { getDb } from '../db/init.js';
import { AppError } from '../middleware/errorHandler.js';
import { compileIntent, type IntentDomainContext } from '../agent/intentCompiler.js';
import { readAttentionContext } from '../agent/attentionContext.js';
import { getBoard, resolveBoardMember } from './boards.js';
import { MemoryManager } from '../agent/memory/manager.js';
import { executeAgentBoardAction } from './agentBoardActions.js';
import { createNotePatchProposal } from './notePatchProposals.js';
import { projectTurnReceipt, type PersistedAgentMessage } from '../agent/turnReceipt.js';

type StoredMeta = AgentMessageMeta & { intent_basis?: { hint: AgentContextHint; text: string; hash: string } };
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function domainContext(userId: string, hint: AgentContextHint, text: string): IntentDomainContext {
  if (hint.type === 'board_view') {
    const board = getBoard(getDb(), userId, hint.data.board_id);
    const mount = text.match(/挂载(笔记|卡片|卡组)[“「"]([^”」"]+)[”」"]/);
    const mountTargets: NonNullable<IntentDomainContext['board']>['mountTargets'] = [];
    if (mount) {
      const kind = ({ 笔记: 'note', 卡片: 'item', 卡组: 'content_group' } as const)[mount[1] as '笔记' | '卡片' | '卡组'];
      const reference = resolveBoardMember(getDb(), userId, kind, mount[2]);
      if (reference.state === 'available') mountTargets.push({ id: mount[2], kind, name: reference.title ?? reference.summary ?? mount[2] });
    }
    return { board: { id: board.board.id, title: board.board.title,
      members: board.members.map(member => ({ id: member.id, name: member.reference.title ?? member.reference.summary ?? member.id,
        x: member.x, y: member.y, placed: member.placed })),
      layers: board.layers.map(layer => ({ id: layer.id, name: layer.name })),
      stickies: board.stickies.map(sticky => ({ id: sticky.id, text: sticky.text })),
      visuals: board.visuals.map(visual => ({ id: visual.id, kind: visual.visual_kind })),
      mountTargets,
    } };
  }
  if (hint.type === 'note_view' && hint.data.selection) {
    const note = readAttentionContext(userId, hint.data.selection, hint.data.page_index);
    return { note: { title: note.note.title, units: note.blocks.flatMap(block =>
      (block.text_units ?? []).filter(unit => unit.id).map(unit => ({ block_id: block.id, unit_id: unit.id!, text: unit.text }))) } };
  }
  return {};
}

/** Called only for a human message. A compiled plan never invokes an executor. */
export function prepareIntentMessage(userId: string, conversationId: string, text: string, hint?: AgentContextHint) {
  if (!hint || !['note_view', 'board_view'].includes(hint.type)) return null;
  if (!/(?:整理|排列|排齐|对齐|arrange|tidy|align|便签|改为|改成|替换为|替换成|replace|挂载|移动|放入图层|连接)/i.test(text)) return null;
  let context: IntentDomainContext;
  try { context = domainContext(userId, hint, text); }
  catch (error) {
    // A stale ambient view is still a valid conversational question. The normal
    // context path reports unavailable selection content instead of blocking chat.
    if (error instanceof AppError && [400, 404].includes(error.statusCode)) return null;
    throw error;
  }
  const selection = hint.type === 'note_view' ? hint.data.selection : undefined;
  const plan = compileIntent(text, selection, context);
  // Memory directives retain the ordinary model + save_memory receipt journey.
  if (!plan || plan.kind === 'memory') return null;
  const db = getDb();
  return db.transaction(() => {
    const turnId = randomUUID();
    const memory = new MemoryManager(userId);
    memory.saveMessage(conversationId, 'user', text, null, null, turnId);
    const meta: StoredMeta = { intent_plan: plan, intent_basis: { hint, text, hash: digest(context) } };
    const content = '计划已列出。放行后执行；再想想会丢弃计划。';
    const messageId = memory.saveMessage(conversationId, 'assistant', content, null, null, turnId, meta);
    return { message_id: messageId, meta, content };
  }).immediate();
}

/** Human release is single-use; executor receipts retain C1's conversation batch. */
export function resolveIntentMessage(userId: string, conversationId: string, messageId: string, decision: 'release' | 'discard') {
  const db = getDb();
  return db.transaction(() => {
    const row = db.prepare(`SELECT m.meta,m.turn_id FROM agent_messages m JOIN agent_conversations c ON c.id=m.conversation_id
      WHERE m.id=? AND m.conversation_id=? AND c.user_id=? AND m.role='assistant'`).get(messageId, conversationId, userId) as { meta: string; turn_id: string } | undefined;
    if (!row) throw new AppError(404, 'Intent plan not found');
    const meta = JSON.parse(row.meta) as StoredMeta;
    const plan = meta.intent_plan;
    if (!plan || plan.status !== 'pending') throw new AppError(409, 'Intent plan is no longer pending');
    if (decision === 'discard') plan.status = 'discarded';
    else {
      if (!meta.intent_basis || digest(domainContext(userId, meta.intent_basis.hint, meta.intent_basis.text)) !== meta.intent_basis.hash) {
        throw new AppError(409, '计划目标已改变，请重新生成计划');
      }
      const context = { actor: 'agent', channel: 'chat', conversationId } as const;
      const calls = plan.steps.map(step => ({ id: randomUUID(), name: step.verb, arguments: step.arguments }));
      const results: unknown[] = [];
      if (plan.kind === 'board') {
        plan.receipt_ids = plan.steps.map((step, index) => {
          const result = executeAgentBoardAction(db, step.verb, step.arguments, userId, { ...context, callId: calls[index].id });
          results.push({ tool_call_id: calls[index].id, content: JSON.stringify(result) });
          return result.receipt_id;
        });
      } else if (plan.kind === 'note_patch') {
        const step = plan.steps[0];
        // Same channel implementation as executeTool('create_proposal', note_patch).
        const result = createNotePatchProposal(db, userId, step.arguments.data, context);
        plan.proposal_id = result.id;
        results.push({ tool_call_id: calls[0].id, content: JSON.stringify(result) });
      } else throw new AppError(400, 'Memory hints use the conversation tool channel');
      // Use the existing paired tool-history shape so live and recalled receipt
      // strips do not mislabel a released plan as a turn with no writes.
      const memory = new MemoryManager(userId);
      memory.saveMessage(conversationId, 'assistant', '', JSON.stringify(calls), null, row.turn_id);
      memory.saveMessage(conversationId, 'user', '', null, JSON.stringify(results), row.turn_id);
      plan.status = 'released';
    }
    db.prepare('UPDATE agent_messages SET meta=? WHERE id=?').run(JSON.stringify(meta), messageId);
    const messages = db.prepare('SELECT id,role,content,tool_calls,tool_results,turn_id FROM agent_messages WHERE conversation_id=? AND turn_id=? ORDER BY rowid')
      .all(conversationId, row.turn_id) as PersistedAgentMessage[];
    return { message_id: messageId, meta, turn_receipt: projectTurnReceipt(messages) };
  }).immediate();
}
