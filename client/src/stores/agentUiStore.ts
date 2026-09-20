import { create } from 'zustand';
import type { AgentUiCommand } from '@shared/types/agentUiCommand';

export interface AgentUiState {
  session: number;
  pending: AgentUiCommand | null;
  focusCommand: AgentUiCommand | null;
  activities: Record<string, { note_id?: string; board_id?: string }>;
  enqueue: (command: AgentUiCommand) => void;
  reset: () => void;
}

export const useAgentUiStore = create<AgentUiState>((set) => ({
  session: 0,
  pending: null,
  focusCommand: null,
  activities: {},
  enqueue: (command) => set({ pending: command, focusCommand: null }),
  reset: () => set((state) => ({ session: state.session + 1, pending: null, focusCommand: null, activities: {} })),
}));

export function userOwnsInput(): boolean {
  const element = document.activeElement;
  return Boolean(document.querySelector('dialog[open], [aria-modal="true"]')) || element instanceof HTMLElement && (element.isContentEditable
    || element.matches('input, textarea, select, [role="textbox"]')
    || Boolean(element.closest('[contenteditable="true"], dialog[open], [role="dialog"]')));
}

export function isAgentUiCommand(value: unknown): value is AgentUiCommand {
  if (!value || typeof value !== 'object') return false;
  const command = value as Record<string, unknown>;
  if (!['command_id', 'turn_id', 'conversation_id'].every((key) => typeof command[key] === 'string')
    || !command.target || typeof command.target !== 'object') return false;
  const target = command.target as Record<string, unknown>;
  if (command.kind === 'open_note') return target.type === 'note' && typeof target.note_id === 'string';
  if (command.kind !== 'focus_object') return false;
  if (target.type === 'board_member') return typeof target.board_id === 'string' && typeof target.member_id === 'string';
  if (typeof target.note_id !== 'string') return false;
  return target.type === 'note_block' ? typeof target.block_id === 'string'
    : target.type === 'note_page' && Number.isInteger(target.page_index) && (target.page_index as number) >= 0;
}
