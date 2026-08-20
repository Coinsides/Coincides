// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  INITIAL_SLASH_COMMAND_STATE,
  applySlashExitToText,
  deriveSlashTargetIdentity,
  slashExitPolicy,
  transitionSlashCommandIndex,
  transitionSlashTarget,
  type SlashExitReason,
  type SlashTarget,
} from './slashCommandReducer';

const triggerText = 'alpha /hea';
const target: SlashTarget = {
  target: 'block',
  blockId: 'block-1',
  trigger: { query: 'hea', start: 6, end: 10 },
  anchor: null,
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

    expect(slashExitPolicy('commit')).toEqual({ closeTarget: true, removeTrigger: true });
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
    { reason: 'disabled', closes: false },
    { reason: 'missing_template', closes: false },
    { reason: 'missing_block', closes: false },
  ])('$reason preserves the trigger and closes=$closes', ({ reason, closes }: {
    reason: SlashExitReason;
    closes: boolean;
  }) => {
    const nextTarget = transitionSlashTarget(target, { type: 'exit', reason });

    expect(applySlashExitToText({ text: triggerText, target, reason })).toBe(triggerText);
    expect(nextTarget).toBe(closes ? null : target);
  });
});
