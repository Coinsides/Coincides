// Type contract only. Runtime validators and presentation belong to each end.
export type AgentContextHintType =
  | 'l1_onboarding'
  | 'calendar'
  | 'deck'
  | 'note_view'
  | 'board_view';

export interface OnboardingContextHintData { isNewUser: boolean }
export interface CalendarContextHintData { date: string }
export interface DeckContextHintData { deck_id: string; deck_name?: string }
export interface NoteSelection { note_id: string; block_ids: string[] }
export interface NoteViewContextHintData {
  note_id: string;
  /** Zero-based paper order, matching read_note. */
  page_index?: number;
  selection?: NoteSelection;
}
export interface BoardViewContextHintData { board_id: string }

export interface AgentContextHintDataMap {
  l1_onboarding: OnboardingContextHintData;
  calendar: CalendarContextHintData;
  deck: DeckContextHintData;
  note_view: NoteViewContextHintData;
  board_view: BoardViewContextHintData;
}

export type AgentContextHint = {
  [Type in AgentContextHintType]: { type: Type; data: AgentContextHintDataMap[Type] }
}[AgentContextHintType];

export type AmbientAgentContextHint = Extract<AgentContextHint, { type: 'note_view' | 'board_view' }>;
