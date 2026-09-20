import type { ChatProposalType, ProposalType } from '../../../shared/types/index.js';

// Runtime values stay server-local; shared owns only the type contract.
export const PROPOSAL_TYPES = [
  'study_plan',
  'batch_cards',
  'schedule_adjustment',
  'goal_breakdown',
  'time_block_setup',
  'material_map',
  'organized_note',
  'note_patch',
  'material_reconciliation',
] as const satisfies readonly ProposalType[];

export const CHAT_PROPOSAL_TYPES = [
  'batch_cards',
  'study_plan',
  'goal_breakdown',
  'schedule_adjustment',
  'time_block_setup',
  'organized_note',
  'note_patch',
] as const satisfies readonly ChatProposalType[];

type Assert<T extends true> = T;
type SameMembers<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
// Both directions are required: satisfies rejects extras, equality catches omissions.
type ProposalTypesMatch = Assert<SameMembers<ProposalType, typeof PROPOSAL_TYPES[number]>>;
type ChatProposalTypesMatch = Assert<SameMembers<ChatProposalType, typeof CHAT_PROPOSAL_TYPES[number]>>;
