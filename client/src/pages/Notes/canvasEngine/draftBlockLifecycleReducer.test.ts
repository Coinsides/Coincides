// @vitest-environment node

import { describe, expect, it } from 'vitest';
import type { BlockBoxLayout } from './runtimeLayout';
import {
  INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
  shouldMountLocalDraft,
  shouldShowEmptyPagePrompt,
  transitionCreatingDraft,
  transitionDraftActive,
  transitionDraftFocusNonce,
  transitionDraftLayout,
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
      draftActive: true,
      draftText: '',
      creatingDraft: false,
      draftFocusNonce: 1,
      draftLayout: layout,
    });
    expect(second.draftFocusNonce).toBe(2);
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

  it('keeps empty-block creation and meaningful draft persistence as distinct transitions', () => {
    const editing = {
      ...INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
      draftActive: true,
      draftText: 'meaningful text',
      draftLayout: layout,
    };

    expect(applyDraftBlockLifecycleTransition(editing, { type: 'begin_empty_block_create' })).toMatchObject({
      creatingDraft: true,
      draftActive: false,
      draftText: '',
      draftLayout: null,
    });
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
      { type: 'begin_empty_block_create' },
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
    expect(discarded.creatingDraft).toBe(true);
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

  it('mirrors the current local-versus-empty-block activation guard', () => {
    expect(shouldMountLocalDraft({ hasNote: false, hasDefaultTextTemplate: true, creatingDraft: false })).toBe(true);
    expect(shouldMountLocalDraft({ hasNote: true, hasDefaultTextTemplate: false, creatingDraft: false })).toBe(true);
    expect(shouldMountLocalDraft({ hasNote: true, hasDefaultTextTemplate: true, creatingDraft: true })).toBe(true);
    expect(shouldMountLocalDraft({ hasNote: true, hasDefaultTextTemplate: true, creatingDraft: false })).toBe(false);
  });
});

describe('empty Page prompt current raw-count gate', () => {
  it('shows only for writable, inactive Pages with zero raw sorted blocks', () => {
    expect(shouldShowEmptyPagePrompt({ contentReadOnly: false, draftActive: false, sortedBlockCount: 0 })).toBe(true);
    expect(shouldShowEmptyPagePrompt({ contentReadOnly: true, draftActive: false, sortedBlockCount: 0 })).toBe(false);
    expect(shouldShowEmptyPagePrompt({ contentReadOnly: false, draftActive: true, sortedBlockCount: 0 })).toBe(false);
    expect(shouldShowEmptyPagePrompt({ contentReadOnly: false, draftActive: false, sortedBlockCount: 1 })).toBe(false);
  });

  it('still shows while ready-path creation is pending and hides for one invisible ghost', () => {
    const pendingCreation = applyDraftBlockLifecycleTransition(
      INITIAL_DRAFT_BLOCK_LIFECYCLE_STATE,
      { type: 'begin_empty_block_create' },
    );

    expect(pendingCreation).toMatchObject({ creatingDraft: true, draftActive: false });
    expect(shouldShowEmptyPagePrompt({
      contentReadOnly: false,
      draftActive: pendingCreation.draftActive,
      sortedBlockCount: 0,
    })).toBe(true);

    const pageVisibleBlockCount = 0;
    expect(pageVisibleBlockCount).toBe(0);
    expect(shouldShowEmptyPagePrompt({
      contentReadOnly: false,
      draftActive: false,
      sortedBlockCount: 1,
    })).toBe(false);
  });
});
