import type { BlockBoxLayout } from './runtimeLayout';

export interface DraftBlockLifecycleState {
  phase: DraftBlockLifecyclePhase;
  draftActive: boolean;
  draftText: string;
  creatingDraft: boolean;
  draftFocusNonce: number;
  draftLayout: BlockBoxLayout | null;
}

export type DraftBlockLifecyclePhase =
  | 'idle'
  | 'ephemeral-mounted'
  | 'focused'
  | 'dirty'
  | 'persisted/reconciled';

type StateUpdate<T> = T | ((current: T) => T);

export type DraftBlockLifecycleAction =
  | { type: 'activate_local'; layout: BlockBoxLayout }
  | { type: 'focus_received' }
  | { type: 'meaningful_input' }
  | { type: 'begin_draft_persist' }
  | { type: 'persisted_reconciled' }
  | { type: 'persist_succeeded' }
  | { type: 'create_finished' }
  | { type: 'discard' }
  | { type: 'reset' }
  | { type: 'set_text'; value: StateUpdate<string> }
  | { type: 'set_layout'; value: StateUpdate<BlockBoxLayout | null> };

export const INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE: DraftBlockLifecycleState = {
  phase: 'idle',
  draftActive: false,
  draftText: '',
  creatingDraft: false,
  draftFocusNonce: 0,
  draftLayout: null,
};

export function transitionDraftPhase(
  current: DraftBlockLifecyclePhase,
  action: DraftBlockLifecycleAction,
): DraftBlockLifecyclePhase {
  switch (action.type) {
    case 'activate_local':
      return current === 'idle' ? 'ephemeral-mounted' : current;
    case 'focus_received':
      return current === 'ephemeral-mounted' ? 'focused' : current;
    case 'meaningful_input':
      return current === 'persisted/reconciled' ? current : 'dirty';
    case 'persisted_reconciled':
      return 'persisted/reconciled';
    case 'persist_succeeded':
    case 'discard':
    case 'reset':
      return 'idle';
    default:
      return current;
  }
}

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
    case 'begin_draft_persist':
      return true;
    case 'create_finished':
    case 'discard':
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

export function shouldShowEmptyPagePrompt({
  contentReadOnly,
  hasMeaningfulRenderableContent,
  hasPendingEditor,
}: {
  contentReadOnly: boolean;
  hasMeaningfulRenderableContent: boolean;
  hasPendingEditor: boolean;
}): boolean {
  return !contentReadOnly && !hasMeaningfulRenderableContent && !hasPendingEditor;
}

export function hasMeaningfulDraftContent(value: string): boolean {
  return value.trim().length > 0;
}

export function shouldCreateDurableDraftFromInput(value: string): boolean {
  return hasMeaningfulDraftContent(value);
}
