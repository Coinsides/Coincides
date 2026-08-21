import {
  detectSlashTrigger,
  removeSlashTrigger,
  type SlashTrigger,
} from '../noteSlashCommands';
import type { SlashMenuAnchor } from './runtimeLayout';
import type { TextBlockContentV1 } from './runtimeDataTypes';
import {
  textFocusReceiptsEqual,
  type TextFocusReceipt,
  type TextOwnerReconciliation,
} from './textFocusReceipt';

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

export interface SlashOwnerState {
  target: SlashTarget | null;
  session: SlashSession | null;
}

export interface SlashSession {
  target: SlashTargetOwner;
  owner: TextFocusReceipt;
  trigger: SlashTrigger;
  originalSlice: string;
  caret: number;
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

export type SlashSessionAction =
  | {
    type: 'sync_session';
    target: SlashTargetIdentity | null;
    owner: TextFocusReceipt | null;
    text: string;
    caret: number;
  }
  | { type: 'exit'; reason: SlashExitReason };

export interface SlashExitPolicy {
  closeTarget: boolean;
  removeTrigger: boolean;
  rollbackTrigger: boolean;
}

export interface SlashRollbackPlan {
  applied: boolean;
  text: string;
  focus: {
    owner: TextFocusReceipt;
    caret: number;
  } | null;
}

export interface SlashBlockRollbackPlan extends SlashRollbackPlan {
  textFlow: TextBlockContentV1 | null;
  fieldText: string | null;
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
      return { closeTarget: true, removeTrigger: true, rollbackTrigger: false };
    case 'escape':
    case 'annotation_action':
    case 'disabled':
    case 'missing_template':
    case 'missing_block':
      return { closeTarget: true, removeTrigger: false, rollbackTrigger: true };
    case 'ctrl_enter':
    case 'external_clear':
      return { closeTarget: true, removeTrigger: false, rollbackTrigger: false };
    default:
      return { closeTarget: false, removeTrigger: false, rollbackTrigger: false };
  }
}

function slashSessionOwnerMatchesTarget(
  owner: TextFocusReceipt,
  target: SlashTargetIdentity,
): boolean {
  return target.target === 'draft' || target.blockId === owner.blockId;
}

export function transitionSlashSession(
  current: SlashSession | null,
  action: SlashSessionAction,
): SlashSession | null {
  if (action.type === 'exit') {
    return slashExitPolicy(action.reason).closeTarget ? null : current;
  }

  const { target, owner, text } = action;
  if (!target || !owner || !slashSessionOwnerMatchesTarget(owner, target)) return null;
  const originalSlice = text.slice(target.trigger.start, target.trigger.end);
  if (!originalSlice.startsWith('/')) return null;

  const sameSession = Boolean(
    current
    && current.target === target.target
    && current.trigger.start === target.trigger.start
    && textFocusReceiptsEqual(current.owner, owner),
  );
  return {
    target: target.target,
    owner,
    trigger: target.trigger,
    originalSlice,
    caret: sameSession && current ? current.caret : Math.max(0, action.caret),
  };
}

export function reconcileSlashOwner(
  current: SlashOwnerState,
  reconciliation: TextOwnerReconciliation,
): SlashOwnerState {
  const { target, session } = current;
  const sameTrigger = Boolean(
    target
    && session
    && target.trigger.start === session.trigger.start
    && target.trigger.end === session.trigger.end
    && target.trigger.query === session.trigger.query,
  );
  if (
    !target
    || !session
    || target.target !== 'draft'
    || session.target !== 'draft'
    || !sameTrigger
    || !textFocusReceiptsEqual(session.owner, reconciliation.from)
  ) {
    return current;
  }

  return {
    target: {
      ...target,
      target: 'block',
      blockId: reconciliation.to.blockId,
    },
    session: {
      ...session,
      target: 'block',
      owner: reconciliation.to,
    },
  };
}

export function planSlashSessionRollback({
  session,
  currentOwner,
  text,
  reason,
}: {
  session: SlashSession | null;
  currentOwner: TextFocusReceipt | null;
  text: string;
  reason: SlashExitReason;
}): SlashRollbackPlan {
  const policy = slashExitPolicy(reason);
  if (
    !policy.rollbackTrigger
    || !session
    || !textFocusReceiptsEqual(currentOwner, session.owner)
    || session.trigger.start < 0
    || session.trigger.end < session.trigger.start
    || text.slice(session.trigger.start, session.trigger.end) !== session.originalSlice
  ) {
    return { applied: false, text, focus: null };
  }

  return {
    applied: true,
    text: `${text.slice(0, session.trigger.start)}${text.slice(session.trigger.end)}`,
    focus: {
      owner: session.owner,
      caret: session.caret,
    },
  };
}

export function planSlashBlockRollback({
  session,
  currentOwner,
  text,
  textFlow,
  fieldText,
  reason,
}: {
  session: SlashSession | null;
  currentOwner: TextFocusReceipt | null;
  text: string;
  textFlow: TextBlockContentV1 | null;
  fieldText: string | null;
  reason: SlashExitReason;
}): SlashBlockRollbackPlan {
  const rejected = (): SlashBlockRollbackPlan => ({
    applied: false,
    text,
    textFlow,
    fieldText,
    focus: null,
  });
  const rollback = planSlashSessionRollback({ session, currentOwner, text, reason });
  if (!rollback.applied || !rollback.focus || !session) return rejected();

  let nextTextFlow = textFlow;
  if (textFlow) {
    const activeUnits = textFlow.units.filter((item) => item.status !== 'deleted');
    if (activeUnits.map((item) => item.text).join('\n') !== text) return rejected();
    const unitIndex = activeUnits.findIndex((item) => item.id === session.owner.textUnitId);
    if (unitIndex < 0) return rejected();
    const unit = activeUnits[unitIndex];
    const localEnd = session.caret + session.originalSlice.length;
    const aggregateStart = activeUnits
      .slice(0, unitIndex)
      .reduce((offset, item) => offset + item.text.length + 1, 0)
      + session.caret;
    if (
      session.caret < 0
      || session.trigger.start !== aggregateStart
      || session.trigger.end !== aggregateStart + session.originalSlice.length
      || unit.text.slice(session.caret, localEnd) !== session.originalSlice
    ) {
      return rejected();
    }
    nextTextFlow = {
      ...textFlow,
      units: textFlow.units.map((item) => item.id === unit.id
        ? {
          ...item,
          text: `${item.text.slice(0, session.caret)}${item.text.slice(localEnd)}`,
        }
        : item),
    };
  }

  let nextFieldText = fieldText;
  if (fieldText !== null) {
    if (fieldText !== text) return rejected();
    const localEnd = session.caret + session.originalSlice.length;
    if (
      session.caret < 0
      || fieldText.slice(session.caret, localEnd) !== session.originalSlice
    ) {
      return rejected();
    }
    nextFieldText = `${fieldText.slice(0, session.caret)}${fieldText.slice(localEnd)}`;
  }

  return {
    ...rollback,
    textFlow: nextTextFlow,
    fieldText: nextFieldText,
  };
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
