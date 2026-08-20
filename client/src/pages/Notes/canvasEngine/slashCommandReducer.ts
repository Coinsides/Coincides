import {
  detectSlashTrigger,
  removeSlashTrigger,
  type SlashTrigger,
} from '../noteSlashCommands';
import type { SlashMenuAnchor } from './runtimeLayout';

export type SlashTargetOwner = 'draft' | 'block';

export interface SlashTargetIdentity {
  target: SlashTargetOwner;
  blockId?: string;
  trigger: SlashTrigger;
}

export interface SlashTarget extends SlashTargetIdentity {
  anchor: SlashMenuAnchor | null;
}

export interface SlashCommandReducerState {
  target: SlashTarget | null;
  activeIndex: number;
}

export type SlashExitReason =
  | 'commit'
  | 'escape'
  | 'annotation_action'
  | 'disabled'
  | 'missing_template'
  | 'missing_block'
  | 'ctrl_enter'
  | 'external_clear';

export type SlashCommandReducerAction =
  | { type: 'sync_target'; target: SlashTarget | null }
  | { type: 'reset_index' }
  | { type: 'clamp_index'; commandCount: number }
  | { type: 'move_index'; direction: 1 | -1; commandCount: number }
  | { type: 'exit'; reason: SlashExitReason };

export interface SlashExitPolicy {
  closeTarget: boolean;
  removeTrigger: boolean;
}

export const INITIAL_SLASH_COMMAND_STATE: SlashCommandReducerState = {
  target: null,
  activeIndex: 0,
};

export function deriveSlashTargetIdentity({
  target,
  text,
  caret,
  blockId,
}: {
  target: SlashTargetOwner;
  text: string;
  caret: number;
  blockId?: string;
}): SlashTargetIdentity | null {
  const trigger = detectSlashTrigger(text, caret);
  return trigger ? { target, blockId, trigger } : null;
}

export function slashExitPolicy(reason: SlashExitReason): SlashExitPolicy {
  switch (reason) {
    case 'commit':
      return { closeTarget: true, removeTrigger: true };
    case 'escape':
    case 'annotation_action':
    case 'ctrl_enter':
    case 'external_clear':
      return { closeTarget: true, removeTrigger: false };
    case 'disabled':
    case 'missing_template':
    case 'missing_block':
      return { closeTarget: false, removeTrigger: false };
    default:
      return { closeTarget: false, removeTrigger: false };
  }
}

export function applySlashExitToText({
  text,
  target,
  reason,
}: {
  text: string;
  target: SlashTarget | null;
  reason: SlashExitReason;
}): string {
  const policy = slashExitPolicy(reason);
  return policy.removeTrigger && target
    ? removeSlashTrigger(text, target.trigger)
    : text;
}

export function transitionSlashTarget(
  current: SlashTarget | null,
  action: SlashCommandReducerAction,
): SlashTarget | null {
  switch (action.type) {
    case 'sync_target':
      return action.target;
    case 'exit':
      return slashExitPolicy(action.reason).closeTarget ? null : current;
    default:
      return current;
  }
}

export function transitionSlashCommandIndex(
  current: number,
  action: SlashCommandReducerAction,
): number {
  switch (action.type) {
    case 'reset_index':
      return 0;
    case 'clamp_index': {
      return action.commandCount <= 0
        ? 0
        : Math.max(0, Math.min(current, action.commandCount - 1));
    }
    case 'move_index': {
      return action.commandCount <= 0
        ? 0
        : (current + action.direction + action.commandCount) % action.commandCount;
    }
    default:
      return current;
  }
}
