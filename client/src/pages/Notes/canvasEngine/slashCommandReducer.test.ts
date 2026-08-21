// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  INITIAL_SLASH_COMMAND_STATE,
  applySlashExitToText,
  deriveSlashTargetIdentity,
  planSlashBlockRollback,
  planSlashSessionRollback,
  reconcileSlashOwner,
  slashExitPolicy,
  transitionSlashCommandIndex,
  transitionSlashSession,
  transitionSlashTarget,
  type SlashExitReason,
  type SlashSession,
  type SlashTarget,
} from './slashCommandReducer';
import type { TextBlockContentV1 } from './runtimeDataTypes';
import { textFocusReceiptForBlock, textFocusReceiptForDraft } from './textFocusReceipt';

const triggerText = 'alpha /hea';
const target: SlashTarget = {
  target: 'block',
  blockId: 'block-1',
  trigger: { query: 'hea', start: 6, end: 10 },
  anchor: null,
};
const owner = textFocusReceiptForBlock('block-1');
const session: SlashSession = {
  target: 'block',
  owner,
  trigger: target.trigger,
  originalSlice: '/hea',
  caret: 6,
};
const triggerTextFlow: TextBlockContentV1 = {
  textflow_version: 'TextBlockContentV1',
  units: [{
    id: owner.textUnitId,
    text: triggerText,
    writing_role: 'paragraph',
    indent_level: 0,
    order_index: 0,
    metadata: {},
    status: 'active',
  }],
  inline_structures: [],
  metadata: {},
};

describe('slash command transition calculations', () => {
  it('derives a target only after the literal trigger has already entered text truth', () => {
    expect(deriveSlashTargetIdentity({
      target: 'block',
      blockId: 'block-1',
      text: triggerText,
      caret: triggerText.length,
    })).toEqual({
      target: 'block',
      blockId: 'block-1',
      trigger: target.trigger,
    });

    const literalWithoutValidTrigger = 'alpha /123';
    expect(deriveSlashTargetIdentity({
      target: 'block',
      blockId: 'block-1',
      text: literalWithoutValidTrigger,
      caret: literalWithoutValidTrigger.length,
    })).toBeNull();
    expect(literalWithoutValidTrigger).toBe('alpha /123');

    expect(transitionSlashTarget(target, { type: 'sync_target', target: null })).toBeNull();
  });

  it('resets on target identity changes and clamps or wraps the active index', () => {
    expect(transitionSlashTarget(INITIAL_SLASH_COMMAND_STATE.target, {
      type: 'sync_target',
      target,
    })).toBe(target);
    expect(transitionSlashCommandIndex(2, { type: 'reset_index' })).toBe(0);
    expect(transitionSlashCommandIndex(2, { type: 'clamp_index', commandCount: 2 })).toBe(1);
    expect(transitionSlashCommandIndex(0, {
      type: 'move_index',
      direction: -1,
      commandCount: 3,
    })).toBe(2);
    expect(transitionSlashCommandIndex(2, {
      type: 'move_index',
      direction: 1,
      commandCount: 0,
    })).toBe(0);
  });

  it('keeps the current target for repeated ordinary input with no slash target', () => {
    expect(transitionSlashTarget(
      INITIAL_SLASH_COMMAND_STATE.target,
      { type: 'sync_target', target: null },
    )).toBeNull();
  });

  it('closes and removes the trigger only on a commit path', () => {
    const state = { target, activeIndex: 1 };

    expect(slashExitPolicy('commit')).toEqual({
      closeTarget: true,
      removeTrigger: true,
      rollbackTrigger: false,
    });
    expect(applySlashExitToText({ text: triggerText, target, reason: 'commit' })).toBe('alpha');
    expect({
      target: transitionSlashTarget(state.target, { type: 'exit', reason: 'commit' }),
      activeIndex: state.activeIndex,
    }).toEqual({
      target: null,
      activeIndex: 1,
    });
  });

  it.each<{
    reason: SlashExitReason;
    closes: boolean;
  }>([
    { reason: 'escape', closes: true },
    { reason: 'annotation_action', closes: true },
    { reason: 'ctrl_enter', closes: true },
    { reason: 'external_clear', closes: true },
    { reason: 'disabled', closes: true },
    { reason: 'missing_template', closes: true },
    { reason: 'missing_block', closes: true },
  ])('$reason preserves the trigger and closes=$closes', ({ reason, closes }: {
    reason: SlashExitReason;
    closes: boolean;
  }) => {
    const nextTarget = transitionSlashTarget(target, { type: 'exit', reason });

    expect(applySlashExitToText({ text: triggerText, target, reason })).toBe(triggerText);
    expect(nextTarget).toBe(closes ? null : target);
  });

  it('captures and refreshes one slash session without moving its rollback caret', () => {
    const opened = transitionSlashSession(null, {
      type: 'sync_session',
      target: { ...target, trigger: { query: '', start: 6, end: 7 } },
      owner,
      text: 'alpha /',
      caret: 6,
    });
    const refreshed = transitionSlashSession(opened, {
      type: 'sync_session',
      target,
      owner,
      text: triggerText,
      caret: 9,
    });

    expect(refreshed).toEqual(session);
    expect(transitionSlashSession(refreshed, { type: 'exit', reason: 'escape' })).toBeNull();
  });

  it('immutably migrates an active draft Slash owner and trigger range from the canonical receipt', () => {
    const draftOwner = textFocusReceiptForDraft(3);
    const draftTarget: SlashTarget = {
      target: 'draft',
      trigger: target.trigger,
      anchor: { x: 12, y: 24 },
    };
    const draftSession: SlashSession = {
      ...session,
      target: 'draft',
      owner: draftOwner,
    };
    const current = { target: draftTarget, session: draftSession };
    const reconciliation = {
      from: draftOwner,
      to: owner,
      selectionStart: 10,
      selectionEnd: 10,
    };

    const migrated = reconcileSlashOwner(current, reconciliation);

    expect(migrated).toEqual({
      target: {
        ...draftTarget,
        target: 'block',
        blockId: owner.blockId,
      },
      session: {
        ...draftSession,
        target: 'block',
        owner,
      },
    });
    expect(migrated.target?.trigger).toBe(draftTarget.trigger);
    expect(migrated.session?.trigger).toBe(draftSession.trigger);
    expect(current).toEqual({ target: draftTarget, session: draftSession });
  });

  it('leaves a Slash owner untouched when the reconciliation receipt is stale or incoherent', () => {
    const draftOwner = textFocusReceiptForDraft(3);
    const current = {
      target: {
        target: 'draft',
        trigger: target.trigger,
        anchor: null,
      } satisfies SlashTarget,
      session: {
        ...session,
        target: 'draft',
        owner: draftOwner,
      } satisfies SlashSession,
    };
    const staleReceipt = {
      from: textFocusReceiptForDraft(4),
      to: owner,
      selectionStart: 10,
      selectionEnd: 10,
    };

    expect(reconcileSlashOwner(current, staleReceipt)).toBe(current);
    expect(reconcileSlashOwner({
      ...current,
      target: {
        ...current.target,
        trigger: { ...current.target.trigger, end: 9 },
      },
    }, {
      ...staleReceipt,
      from: draftOwner,
    })).toMatchObject({ session: current.session });
  });

  it('rejects target=block/session=draft mixed owner state', () => {
    const draftOwner = textFocusReceiptForDraft(3);
    const current = {
      target: {
        target: 'block',
        blockId: 'already-durable-block',
        trigger: target.trigger,
        anchor: null,
      } satisfies SlashTarget,
      session: {
        ...session,
        target: 'draft',
        owner: draftOwner,
      } satisfies SlashSession,
    };

    const result = reconcileSlashOwner(current, {
      from: draftOwner,
      to: owner,
      selectionStart: 10,
      selectionEnd: 10,
    });

    expect(result).toBe(current);
    expect(result.target).toBe(current.target);
    expect(result.session).toBe(current.session);
  });

  it('rejects target=draft/session=block mixed owner state', () => {
    const draftOwner = textFocusReceiptForDraft(3);
    const current = {
      target: {
        target: 'draft',
        trigger: target.trigger,
        anchor: null,
      } satisfies SlashTarget,
      session: {
        ...session,
        target: 'block',
        owner: draftOwner,
      } satisfies SlashSession,
    };

    const result = reconcileSlashOwner(current, {
      from: draftOwner,
      to: owner,
      selectionStart: 10,
      selectionEnd: 10,
    });

    expect(result).toBe(current);
    expect(result.target).toBe(current.target);
    expect(result.session).toBe(current.session);
  });

  it.each<SlashExitReason>([
    'escape',
    'disabled',
    'annotation_action',
    'missing_template',
    'missing_block',
  ])('plans an exact guarded rollback for $reason', (reason) => {
    expect(planSlashSessionRollback({
      session,
      currentOwner: owner,
      text: triggerText,
      reason,
    })).toEqual({
      applied: true,
      text: 'alpha ',
      focus: { owner, caret: 6 },
    });
  });

  it('preserves literal slash text when either owner or range has drifted', () => {
    expect(planSlashSessionRollback({
      session,
      currentOwner: textFocusReceiptForBlock('block-2'),
      text: triggerText,
      reason: 'escape',
    })).toEqual({ applied: false, text: triggerText, focus: null });

    const literalSlashText = 'alpha /literal';
    expect(planSlashSessionRollback({
      session,
      currentOwner: owner,
      text: literalSlashText,
      reason: 'escape',
    })).toEqual({ applied: false, text: literalSlashText, focus: null });
  });

  it('plans one coherent block rollback across plain, TextFlow, and structured field truth', () => {
    const plan = planSlashBlockRollback({
      session,
      currentOwner: owner,
      text: triggerText,
      textFlow: triggerTextFlow,
      fieldText: triggerText,
      reason: 'escape',
    });

    expect(plan).toEqual({
      applied: true,
      text: 'alpha ',
      textFlow: {
        ...triggerTextFlow,
        units: [{ ...triggerTextFlow.units[0], text: 'alpha ' }],
      },
      fieldText: 'alpha ',
      focus: { owner, caret: 6 },
    });
  });

  it('maps an owner-local caret to the same aggregate range in a multi-TextUnit flow', () => {
    const multiUnitFlow: TextBlockContentV1 = {
      ...triggerTextFlow,
      units: [
        { ...triggerTextFlow.units[0], id: 'tu-before', text: 'lead', order_index: 0 },
        { ...triggerTextFlow.units[0], id: owner.textUnitId, order_index: 1 },
      ],
    };
    const multiUnitSession: SlashSession = {
      ...session,
      trigger: { query: 'hea', start: 11, end: 15 },
    };

    expect(planSlashBlockRollback({
      session: multiUnitSession,
      currentOwner: owner,
      text: `lead\n${triggerText}`,
      textFlow: multiUnitFlow,
      fieldText: null,
      reason: 'escape',
    })).toMatchObject({
      applied: true,
      text: 'lead\nalpha ',
      textFlow: {
        units: [
          { id: 'tu-before', text: 'lead' },
          { id: owner.textUnitId, text: 'alpha ' },
        ],
      },
      fieldText: null,
      focus: { owner, caret: 6 },
    });
  });

  it.each<[string, TextBlockContentV1, string]>([
    ['TextFlow', { ...triggerTextFlow, units: [{ ...triggerTextFlow.units[0], text: 'alpha /literal' }] }, triggerText],
    ['structured field', triggerTextFlow, 'alpha /literal'],
    ['TextFlow outside the trigger slice', {
      ...triggerTextFlow,
      units: [{ ...triggerTextFlow.units[0], text: 'omega /heagamma' }],
    }, triggerText],
    ['structured field outside the trigger slice', triggerTextFlow, 'theta /headelta'],
  ])('rejects the whole block rollback when %s truth has drifted', (
    _authority,
    textFlow,
    fieldText,
  ) => {
    expect(planSlashBlockRollback({
      session,
      currentOwner: owner,
      text: triggerText,
      textFlow,
      fieldText,
      reason: 'escape',
    })).toEqual({
      applied: false,
      text: triggerText,
      textFlow,
      fieldText,
      focus: null,
    });
  });

  it('rejects duplicate slices when aggregate and owner-local ranges identify different occurrences', () => {
    const duplicateFlow: TextBlockContentV1 = {
      ...triggerTextFlow,
      units: [
        { ...triggerTextFlow.units[0], id: 'tu-before', text: triggerText, order_index: 0 },
        { ...triggerTextFlow.units[0], id: owner.textUnitId, order_index: 1 },
      ],
    };
    const duplicateText = `${triggerText}\n${triggerText}`;

    expect(planSlashBlockRollback({
      session,
      currentOwner: owner,
      text: duplicateText,
      textFlow: duplicateFlow,
      fieldText: null,
      reason: 'escape',
    })).toEqual({
      applied: false,
      text: duplicateText,
      textFlow: duplicateFlow,
      fieldText: null,
      focus: null,
    });
  });

  it('removes only the second duplicate when aggregate and owner-local receipts both point there', () => {
    const duplicateFlow: TextBlockContentV1 = {
      ...triggerTextFlow,
      units: [
        { ...triggerTextFlow.units[0], id: 'tu-before', text: triggerText, order_index: 0 },
        { ...triggerTextFlow.units[0], id: owner.textUnitId, order_index: 1 },
      ],
    };
    const duplicateText = `${triggerText}\n${triggerText}`;
    const secondOccurrenceSession: SlashSession = {
      ...session,
      trigger: { query: 'hea', start: 17, end: 21 },
    };

    expect(planSlashBlockRollback({
      session: secondOccurrenceSession,
      currentOwner: owner,
      text: duplicateText,
      textFlow: duplicateFlow,
      fieldText: null,
      reason: 'escape',
    })).toEqual({
      applied: true,
      text: `${triggerText}\nalpha `,
      textFlow: {
        ...duplicateFlow,
        units: [
          { ...duplicateFlow.units[0], text: triggerText },
          { ...duplicateFlow.units[1], text: 'alpha ' },
        ],
      },
      fieldText: null,
      focus: { owner, caret: 6 },
    });
  });
});
