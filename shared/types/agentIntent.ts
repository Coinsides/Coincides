import type { NoteSelection } from './agentContextHint.js';

export type BoardIntentVerb = 'board_mount_member' | 'board_move_member' | 'board_set_member_layer'
  | 'board_create_edge' | 'board_create_sticky' | 'board_update_sticky' | 'board_patch_visual';
export interface AgentIntentStep {
  verb: BoardIntentVerb | 'save_memory' | 'create_proposal';
  target_name: string;
  anchor: { board_id: string; object_id?: string } | NoteSelection | { kind: 'memory' };
  arguments: Record<string, unknown>;
}
export interface AgentIntentPlan {
  kind: 'board' | 'memory' | 'note_patch';
  rule: string;
  status: 'pending' | 'released' | 'discarded';
  steps: AgentIntentStep[];
  receipt_ids?: string[];
  proposal_id?: string;
}
export interface AgentMessageMeta {
  answer_card?: { selection: NoteSelection; question: string };
  intent_plan?: AgentIntentPlan;
}
