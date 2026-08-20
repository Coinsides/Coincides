// @vitest-environment node

import { describe, expect, it } from 'vitest';
import type { BlockBoxLayout } from './runtimeLayout';
import {
  INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
  hasMeaningfulDraftContent,
  shouldCreateDurableDraftFromInput,
  shouldShowEmptyPagePrompt,
  transitionCreatingDraft,
  transitionDraftActive,
  transitionDraftFocusNonce,
  transitionDraftLayout,
  transitionDraftPhase,
  transitionDraftText,
  type DraftBlockLifecycleAction,
  type DraftBlockLifecycleState,
} from './draftBlockLifecycleReducer';

const layout: BlockBoxLayout = { x: 0, y: 12, width: 760, height: 72 };

function applyDraftBlockLifecycleTransition(
  current: DraftBlockLifecycleState,
  action: DraftBlockLifecycleAction,
): DraftBlockLifecycleState {
  return {
    phase: transitionDraftPhase(current.phase, action),
    draftActive: transitionDraftActive(current.draftActive, action),
    draftText: transitionDraftText(current.draftText, action),
    creatingDraft: transitionCreatingDraft(current.creatingDraft, action),
    draftFocusNonce: transitionDraftFocusNonce(current.draftFocusNonce, action),
    draftLayout: transitionDraftLayout(current.draftLayout, action),
  };
}

describe('draft block lifecycle transition calculations', () => {
  it('starts idle and increments the focus nonce for each local activation', () => {
    const first = applyDraftBlockLifecycleTransition(
      INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
      { type: 'activate_local', layout },
    );
    const second = applyDraftBlockLifecycleTransition(first, { type: 'activate_local', layout });

    expect(first).toEqual({
      phase: 'ephemeral-mounted',
      draftActive: true,
      draftText: '',
      creatingDraft: false,
      draftFocusNonce: 1,
      draftLayout: layout,
    });
    expect(second.draftFocusNonce).toBe(2);
  });

  it('records mount, focus, meaningful input, and durable reconciliation in order', () => {
    const mounted = applyDraftBlockLifecycleTransition(
      INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
      { type: 'activate_local', layout },
    );
    const focused = applyDraftBlockLifecycleTransition(mounted, { type: 'focus_received' });
    const dirty = applyDraftBlockLifecycleTransition(focused, { type: 'meaningful_input' });
    const reconciled = applyDraftBlockLifecycleTransition(dirty, { type: 'persisted_reconciled' });
    const finished = applyDraftBlockLifecycleTransition(reconciled, { type: 'persist_succeeded' });

    expect([mounted.phase, focused.phase, dirty.phase, reconciled.phase, finished.phase]).toEqual([
      'ephemeral-mounted',
      'focused',
      'dirty',
      'persisted/reconciled',
      'idle',
    ]);
  });

  it('preserves current text and creating status when local activation wins the guard', () => {
    const current = {
      ...INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
      draftText: '/hea',
      creatingDraft: true,
    };

    expect(applyDraftBlockLifecycleTransition(current, { type: 'activate_local', layout })).toMatchObject({
      draftActive: true,
      draftText: '/hea',
      creatingDraft: true,
      draftLayout: layout,
    });
  });

  it('keeps meaningful persistence mounted until durable focus handoff', () => {
    const editing = {
      ...INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
      draftActive: true,
      draftText: 'meaningful text',
      draftLayout: layout,
    };

    expect(applyDraftBlockLifecycleTransition(editing, { type: 'begin_draft_persist' })).toMatchObject({
      creatingDraft: true,
      draftActive: true,
      draftText: 'meaningful text',
      draftLayout: layout,
    });
  });

  it('does not let an async finally erase a local draft reopened while creation was pending', () => {
    const pending = applyDraftBlockLifecycleTransition(
      INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
      { type: 'begin_draft_persist' },
    );
    const reopened = applyDraftBlockLifecycleTransition(pending, { type: 'activate_local', layout });
    const typed = applyDraftBlockLifecycleTransition(reopened, { type: 'set_text', value: 'new local text' });
    const finished = applyDraftBlockLifecycleTransition(typed, { type: 'create_finished' });

    expect(finished).toMatchObject({
      creatingDraft: false,
      draftActive: true,
      draftText: 'new local text',
      draftLayout: layout,
    });
  });

  it('keeps success and finally separate, and preserves discard versus reset behavior', () => {
    const pending = {
      ...INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
      creatingDraft: true,
      draftActive: true,
      draftText: 'saved',
      draftLayout: layout,
    };
    const succeeded = applyDraftBlockLifecycleTransition(pending, { type: 'persist_succeeded' });
    const discarded = applyDraftBlockLifecycleTransition(pending, { type: 'discard' });
    const reset = applyDraftBlockLifecycleTransition(pending, { type: 'reset' });

    expect(succeeded).toMatchObject({ creatingDraft: true, draftActive: false, draftText: '', draftLayout: null });
    expect(applyDraftBlockLifecycleTransition(succeeded, { type: 'create_finished' }).creatingDraft).toBe(false);
    expect(discarded.creatingDraft).toBe(false);
    expect(reset.creatingDraft).toBe(false);
  });

  it('returns each current field when a setter updater is a no-op', () => {
    const current = {
      ...INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
      draftText: 'same',
      draftLayout: layout,
    };

    expect(transitionDraftText(current.draftText, {
      type: 'set_text',
      value: (value) => value,
    })).toBe(current.draftText);
    expect(transitionDraftLayout(current.draftLayout, {
      type: 'set_layout',
      value: (value) => value,
    })).toBe(current.draftLayout);
  });

  it('creates on any meaningful input and leaves only whitespace ephemeral', () => {
    expect(hasMeaningfulDraftContent('  sentinel  ')).toBe(true);
    expect(hasMeaningfulDraftContent(' \n ')).toBe(false);
    expect(shouldCreateDurableDraftFromInput('s')).toBe(true);
    expect(shouldCreateDurableDraftFromInput(' /heading')).toBe(true);
    expect(shouldCreateDurableDraftFromInput('   ')).toBe(false);
  });
});

describe('empty Page prompt meaningful-content gate', () => {
  it('shows only for writable Pages without meaningful content or a pending editor', () => {
    expect(shouldShowEmptyPagePrompt({
      contentReadOnly: false,
      hasMeaningfulRenderableContent: false,
      hasPendingEditor: false,
    })).toBe(true);
    expect(shouldShowEmptyPagePrompt({
      contentReadOnly: true,
      hasMeaningfulRenderableContent: false,
      hasPendingEditor: false,
    })).toBe(false);
    expect(shouldShowEmptyPagePrompt({
      contentReadOnly: false,
      hasMeaningfulRenderableContent: false,
      hasPendingEditor: true,
    })).toBe(false);
    expect(shouldShowEmptyPagePrompt({
      contentReadOnly: false,
      hasMeaningfulRenderableContent: true,
      hasPendingEditor: false,
    })).toBe(false);
  });

  it('stays hidden while persistence is pending and ignores an empty raw ghost', () => {
    const pendingCreation = applyDraftBlockLifecycleTransition(
      INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
      { type: 'begin_draft_persist' },
    );

    expect(pendingCreation).toMatchObject({ creatingDraft: true, draftActive: false });
    expect(shouldShowEmptyPagePrompt({
      contentReadOnly: false,
      hasMeaningfulRenderableContent: false,
      hasPendingEditor: pendingCreation.creatingDraft,
    })).toBe(false);

    expect(shouldShowEmptyPagePrompt({
      contentReadOnly: false,
      hasMeaningfulRenderableContent: false,
      hasPendingEditor: false,
    })).toBe(true);
  });
});
