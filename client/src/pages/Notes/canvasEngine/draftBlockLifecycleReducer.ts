import type { BlockBoxLayout } from './runtimeLayout';

export interface DraftBlockLifecycleState {
  draftActive: boolean;
  draftText: string;
  creatingDraft: boolean;
  draftFocusNonce: number;
  draftLayout: BlockBoxLayout | null;
}

type StateUpdate<T> = T | ((current: T) => T);

export type DraftBlockLifecycleAction =
  | { type: 'activate_local'; layout: BlockBoxLayout }
  | { type: 'begin_empty_block_create' }
  | { type: 'begin_draft_persist' }
  | { type: 'persist_succeeded' }
  | { type: 'create_finished' }
  | { type: 'discard' }
  | { type: 'reset' }
  | { type: 'set_text'; value: StateUpdate<string> }
  | { type: 'set_layout'; value: StateUpdate<BlockBoxLayout | null> };

export const INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE: DraftBlockLifecycleState = {
  draftActive: false,
  draftText: '',
  creatingDraft: false,
  draftFocusNonce: 0,
  draftLayout: null,
};

function applyStateUpdate<T>(current: T, update: StateUpdate<T>): T {
  return typeof update === 'function'
    ? (update as (value: T) => T)(current)
    : update;
}

export function transitionDraftActive(
  current: boolean,
  action: DraftBlockLifecycleAction,
): boolean {
  switch (action.type) {
    case 'activate_local':
      return true;
    case 'begin_empty_block_create':
    case 'persist_succeeded':
    case 'discard':
    case 'reset':
      return false;
    default:
      return current;
  }
}

export function transitionDraftText(
  current: string,
  action: DraftBlockLifecycleAction,
): string {
  switch (action.type) {
    case 'begin_empty_block_create':
    case 'persist_succeeded':
    case 'discard':
    case 'reset':
      return '';
    case 'set_text':
      return applyStateUpdate(current, action.value);
    default:
      return current;
  }
}

export function transitionCreatingDraft(
  current: boolean,
  action: DraftBlockLifecycleAction,
): boolean {
  switch (action.type) {
    case 'begin_empty_block_create':
    case 'begin_draft_persist':
      return true;
    case 'create_finished':
    case 'reset':
      return false;
    default:
      return current;
  }
}

export function transitionDraftFocusNonce(
  current: number,
  action: DraftBlockLifecycleAction,
): number {
  return action.type === 'activate_local' ? current + 1 : current;
}

export function transitionDraftLayout(
  current: BlockBoxLayout | null,
  action: DraftBlockLifecycleAction,
): BlockBoxLayout | null {
  switch (action.type) {
    case 'activate_local':
      return action.layout;
    case 'begin_empty_block_create':
    case 'persist_succeeded':
    case 'discard':
    case 'reset':
      return null;
    case 'set_layout':
      return applyStateUpdate(current, action.value);
    default:
      return current;
  }
}

export function shouldMountLocalDraft({
  hasNote,
  hasDefaultTextTemplate,
  creatingDraft,
}: {
  hasNote: boolean;
  hasDefaultTextTemplate: boolean;
  creatingDraft: boolean;
}): boolean {
  return !hasNote || !hasDefaultTextTemplate || creatingDraft;
}

export function shouldShowEmptyPagePrompt({
  contentReadOnly,
  draftActive,
  sortedBlockCount,
}: {
  contentReadOnly: boolean;
  draftActive: boolean;
  sortedBlockCount: number;
}): boolean {
  return !contentReadOnly && !draftActive && sortedBlockCount === 0;
}
