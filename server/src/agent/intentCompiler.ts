import type { AgentIntentPlan, AgentIntentStep } from '../../../shared/types/agentIntent.js';
import type { NoteSelection } from '../../../shared/types/agentContextHint.js';
import { classifyDirectInstruction } from './intentRules.js';

export interface IntentDomainContext {
  board?: { id: string; title: string; members: Array<{ id: string; name: string; x: number; y: number; placed: boolean }>;
    layers?: Array<{ id: string; name: string }>;
    stickies?: Array<{ id: string; text: string }>;
    visuals?: Array<{ id: string; kind: string }>;
    mountTargets?: Array<{ id: string; kind: 'note' | 'item' | 'content_group'; name: string }>;
  };
  note?: { title: string; units: Array<{ block_id: string; unit_id: string; text: string }> };
}

/** Closed, inspectable v1 rules. No provider, database, time, randomness or execution. */
export const INTENT_COMPILER_RULES = [
  { id: 'memory-directive', positive: '请记住我喜欢短答案', negative: '记忆是什么', target: 'save_memory' },
  { id: 'board-grid', positive: '整理这块板，按网格排列', negative: '解释这块板', target: 'board_move_member' },
  { id: 'board-sticky', positive: '添加便签“待核对”', negative: '便签是什么意思', target: 'board_create_sticky' },
  { id: 'board-mount', positive: '挂载笔记“note-id”', negative: '挂载是什么', target: 'board_mount_member' },
  { id: 'board-member-move', positive: '移动“章节一”到 120,240', negative: '移动到哪里', target: 'board_move_member' },
  { id: 'board-layer', positive: '把“章节一”放入图层“重点”', negative: '如何创建图层', target: 'board_set_member_layer' },
  { id: 'board-edge', positive: '连接“章节一”到“章节二”', negative: '解释两者的关系', target: 'board_create_edge' },
  { id: 'board-sticky-edit', positive: '便签“待核对”改为“已核对”', negative: '解释便签', target: 'board_update_sticky' },
  { id: 'board-visual-move', positive: '移动装饰“visual-id”到 120,240', negative: '装饰是什么', target: 'board_patch_visual' },
  { id: 'note-unit-replace', positive: '把“旧文字”改为“新文字”', negative: '解释“旧文字”', target: 'create_proposal:note_patch' },
] as const;

export function compileIntent(text: string, selection: NoteSelection | undefined, context: IntentDomainContext): AgentIntentPlan | null {
  const input = text.trim();
  // Conservative whole-request rules; an unanswered question stays in conversation.
  if (!input || /[?？]|(?:不要|别|不必|无需|do not|don't)\s*(?:修改|改写|替换|整理|排列|添加|创建|arrange|add|replace)/i.test(input)) return null;
  const direct = classifyDirectInstruction(input);
  if (direct === 'memory') return {
    kind: 'memory', rule: 'memory-directive', status: 'pending',
    steps: [{ verb: 'save_memory', target_name: 'Agent 记忆', anchor: { kind: 'memory' }, arguments: { content: input, category: 'general' } }],
  };
  if (direct === 'proposal') return null;
  if (selection && context.note) {
    const replace = input.match(/^(?:请|请帮我|帮我)?\s*(?:把|将)\s*[“「"]([^”」"]*)[”」"]\s*(?:改为|改成|替换为|替换成)\s*[“「"]([^”」"]*)[”」"]\s*[。！!]?$/)
      ?? input.match(/^replace\s+"([^"]*)"\s+with\s+"([^"]*)"[.!]?$/i);
    if (!replace) return null;
    const matches = context.note.units.filter(unit => selection.block_ids.includes(unit.block_id) && unit.text === replace[1]);
    if (matches.length !== 1) return null;
    const unit = matches[0];
    return { kind: 'note_patch', rule: 'note-unit-replace', status: 'pending', steps: [{
      verb: 'create_proposal', target_name: context.note.title, anchor: { ...selection, block_ids: [unit.block_id] },
      arguments: { type: 'note_patch', data: { note_id: selection.note_id,
        patches: [{ block_id: unit.block_id, unit_id: unit.unit_id, new_text: replace[2] }] } },
    }] };
  }
  const board = context.board;
  if (!board) return null;
  const command = input.replace(/^(?:请帮我|帮我|请)\s*/, '').replace(/[。！!]$/, '');
  const single = (rule: string, step: AgentIntentStep): AgentIntentPlan => ({ kind: 'board', rule, status: 'pending', steps: [step] });
  const memberNamed = (name: string) => {
    const matches = board.members.filter(member => member.id === name || member.name === name);
    return matches.length === 1 ? matches[0] : undefined;
  };
  const mount = command.match(/^挂载(笔记|卡片|卡组)[“「"]([^”」"]+)[”」"]$/);
  if (mount) {
    const kind = ({ 笔记: 'note', 卡片: 'item', 卡组: 'content_group' } as const)[mount[1] as '笔记' | '卡片' | '卡组'];
    const targets = board.mountTargets?.filter(target => target.kind === kind && (target.id === mount[2] || target.name === mount[2])) ?? [];
    if (targets.length !== 1) return null;
    return single('board-mount', { verb: 'board_mount_member', target_name: targets[0].name,
      anchor: { board_id: board.id, object_id: targets[0].id }, arguments: { board_id: board.id,
        input: { member_kind: kind, member_id: targets[0].id, x: 0, y: 0 } } });
  }
  const move = command.match(/^移动(装饰)?[“「"]([^”」"]+)[”」"]到\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)$/);
  if (move) {
    const member = memberNamed(move[2]);
    const visual = board.visuals?.find(visual => visual.id === move[2] && ['sticky', 'shape', 'freehand'].includes(visual.kind));
    if (move[1] ? !visual : !member) return null;
    return single(move[1] ? 'board-visual-move' : 'board-member-move', {
      verb: move[1] ? 'board_patch_visual' : 'board_move_member', target_name: member?.name ?? move[2],
      anchor: { board_id: board.id, object_id: move[1] ? visual!.id : member!.id },
      arguments: { board_id: board.id, ...(move[1] ? { visual_id: visual!.id } : { member_id: member!.id }),
        input: { x: Number(move[3]), y: Number(move[4]) } },
    });
  }
  const layer = command.match(/^把[“「"]([^”」"]+)[”」"]放入图层[“「"]([^”」"]+)[”」"]$/);
  if (layer) {
    const member = memberNamed(layer[1]);
    const layers = board.layers?.filter(item => item.id === layer[2] || item.name === layer[2]) ?? [];
    if (!member || layers.length !== 1) return null;
    return single('board-layer', { verb: 'board_set_member_layer', target_name: `${member.name} → ${layers[0].name}`,
      anchor: { board_id: board.id, object_id: member.id },
      arguments: { board_id: board.id, member_id: member.id, input: { layer_id: layers[0].id } } });
  }
  const edge = command.match(/^连接[“「"]([^”」"]+)[”」"]到[“「"]([^”」"]+)[”」"]$/);
  if (edge) {
    const from = memberNamed(edge[1]); const to = memberNamed(edge[2]);
    if (!from || !to || from.id === to.id) return null;
    return single('board-edge', { verb: 'board_create_edge', target_name: `${from.name} → ${to.name}`,
      anchor: { board_id: board.id, object_id: from.id }, arguments: { board_id: board.id,
        input: { from: { kind: 'member', id: from.id, anchor: 'auto' }, to: { kind: 'member', id: to.id, anchor: 'auto' } } } });
  }
  const update = command.match(/^便签[“「"]([^”」"]+)[”」"]改为[“「"]([^”」"]*)[”」"]$/);
  if (update) {
    const matches = board.stickies?.filter(sticky => sticky.id === update[1] || sticky.text === update[1]) ?? [];
    if (matches.length !== 1) return null;
    return single('board-sticky-edit', { verb: 'board_update_sticky', target_name: update[1],
      anchor: { board_id: board.id, object_id: matches[0].id },
      arguments: { board_id: board.id, sticky_id: matches[0].id, input: { text: update[2] } } });
  }
  if (/^(?:(?:整理|排列|排齐|对齐)(?:这块|当前|这个)?板(?:[,，]\s*按网格排列)?|(?:arrange|tidy|align) (?:this |the )?board(?: (?:in a |in )?grid)?)$/i.test(command)) {
    const members = board.members.filter(member => member.placed);
    if (!members.length || members.length > 100) return null;
    const origin = { x: Math.min(...members.map(member => member.x)), y: Math.min(...members.map(member => member.y)) };
    const steps: AgentIntentStep[] = members.map((member, index) => ({
      verb: 'board_move_member', target_name: member.name || member.id,
      anchor: { board_id: board.id, object_id: member.id },
      arguments: { board_id: board.id, member_id: member.id, input: { x: origin.x + index % 3 * 360, y: origin.y + Math.floor(index / 3) * 280 } },
    }));
    return { kind: 'board', rule: 'board-grid', status: 'pending', steps };
  }
  const sticky = input.match(/^(?:请|帮我|请帮我)?\s*(?:添加|新增|创建)(?:一张|一个)?便签\s*[“「"]([^”」"]+)[”」"]\s*[。！!]?$/);
  if (sticky) return { kind: 'board', rule: 'board-sticky', status: 'pending', steps: [{
    verb: 'board_create_sticky', target_name: `${board.title} · ${sticky[1]}`, anchor: { board_id: board.id },
    arguments: { board_id: board.id, input: { text: sticky[1], x: 0, y: 0 } },
  }] };
  return null;
}
