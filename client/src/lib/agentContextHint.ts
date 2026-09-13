import type { AgentContextHint, AgentContextHintType } from '@shared/types';

// Client-local presentation; the shared module exports no runtime values.
const CONTEXT_LABELS = {
  l1_onboarding: 'l1_onboarding',
  calendar: 'calendar',
  deck: 'deck',
  note_view: 'Note',
  board_view: 'Board',
} satisfies Record<AgentContextHintType, string>;

export function describeAgentContextHint(hint: AgentContextHint): string {
  switch (hint.type) {
    case 'note_view':
      return `${CONTEXT_LABELS.note_view} ${hint.data.note_id}${hint.data.page_index === undefined
        ? '' : ` · Page ${hint.data.page_index + 1}`}`;
    case 'board_view':
      return `${CONTEXT_LABELS.board_view} ${hint.data.board_id}`;
    default:
      return CONTEXT_LABELS[hint.type];
  }
}
