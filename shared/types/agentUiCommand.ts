/** Ephemeral presentation requests; no document/board truth or delivery acknowledgement. */
export type AgentUiFocusTarget =
  | { type: 'note_block'; note_id: string; block_id: string }
  | { type: 'note_page'; note_id: string; page_index: number }
  | { type: 'board_member'; board_id: string; member_id: string };

export type AgentUiTarget = { type: 'note'; note_id: string } | AgentUiFocusTarget;

export type AgentUiCommand = {
  command_id: string;
  turn_id: string;
  conversation_id: string;
} & (
  | { kind: 'open_note'; target: { type: 'note'; note_id: string } }
  | { kind: 'focus_object'; target: AgentUiFocusTarget }
);

export const AGENT_UI_TURN_LIMIT = 8;
export const AGENT_UI_DEBOUNCE_MS = 1000;
