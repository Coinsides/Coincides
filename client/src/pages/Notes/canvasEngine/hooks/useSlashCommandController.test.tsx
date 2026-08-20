import { act, renderHook } from '@testing-library/react';
import { createRef, type SetStateAction } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { textFocusReceiptForBlock } from '../textFocusReceipt';
import {
  useSlashCommandController,
  type UseSlashCommandControllerOptions,
} from './useSlashCommandController';

const blockText = 'alpha /hea';

const block: NoteBlock = {
  id: 'block-1',
  placement_id: 'placement-block-1',
  display_overrides_json: {},
  canvas_layout: null,
  block_type: 'text',
  title: null,
  content_json: { body: blockText },
  plain_text: blockText,
  metadata: {},
  order_index: 0,
  source_references: [],
};

function applyStateUpdate<T>(current: T, update: SetStateAction<T>): T {
  return typeof update === 'function'
    ? (update as (value: T) => T)(current)
    : update;
}

function renderSubject(saveBlock: UseSlashCommandControllerOptions['saveBlock']) {
  let blockTextDrafts: Record<string, string> = {};
  let blockTextFlowDrafts: Record<string, TextBlockContentV1> = {};
  const setFocusBlockId = vi.fn();

  const options: UseSlashCommandControllerOptions = {
    addToast: vi.fn(),
    applyTemplateToBlock: vi.fn(async () => null),
    blockListRef: createRef<HTMLDivElement>(),
    blocks: [block],
    blockTextDrafts,
    blockTextFlowDrafts,
    draftText: '',
    draftTextRef: { current: '' },
    focusedTextOwner: textFocusReceiptForBlock(block.id),
    insertTemplateOptions: [],
    persistDraft: vi.fn(async () => undefined),
    saveBlock,
    setBlockTextDrafts: (update) => {
      blockTextDrafts = applyStateUpdate(blockTextDrafts, update);
    },
    setBlockTextFlowDrafts: (update) => {
      blockTextFlowDrafts = applyStateUpdate(blockTextFlowDrafts, update);
    },
    setDraftText: vi.fn(),
    setFocusBlockId,
    setInteractionState: vi.fn(),
    templateOptions: [],
    activateDraft: vi.fn(),
  };
  let renders = 0;
  const hook = renderHook(() => {
    renders += 1;
    return useSlashCommandController(options);
  });

  act(() => {
    hook.result.current.handleBlockTextChange(block.id, blockText, blockText.length);
  });
  const heading = hook.result.current.slashCommands.find((command) => command.id === 'heading');
  if (!heading) throw new Error('heading slash command fixture missing');

  return {
    blockTextDrafts: () => blockTextDrafts,
    heading,
    hook,
    renders: () => renders,
    setFocusBlockId,
  };
}

describe('slash command async current behavior', () => {
  it('keeps native same-value scheduling when an already closed target is cleared', () => {
    const subject = renderSubject(vi.fn(async () => null));

    act(() => {
      subject.hook.result.current.clearSlashTarget();
    });
    const rendersAfterClose = subject.renders();

    act(() => {
      subject.hook.result.current.clearSlashTarget();
    });

    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(subject.renders() - rendersAfterClose).toBe(0);
  });

  it('keeps the trigger removed and menu closed when save resolves null', async () => {
    let resolveSave!: (value: NoteBlock | null) => void;
    const saveReceipt = new Promise<NoteBlock | null>((resolve) => {
      resolveSave = resolve;
    });
    const saveBlock = vi.fn(() => saveReceipt);
    const subject = renderSubject(saveBlock);
    let selectionSettled = false;
    let selectionPromise!: Promise<void>;

    act(() => {
      selectionPromise = subject.hook.result.current.handleSelectSlashCommand(subject.heading);
      void selectionPromise.then(() => {
        selectionSettled = true;
      });
    });

    expect(saveBlock).toHaveBeenCalledTimes(1);
    expect(subject.blockTextDrafts()[block.id]).toBe('alpha');
    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(subject.setFocusBlockId).not.toHaveBeenCalled();
    expect(selectionSettled).toBe(false);

    await act(async () => {
      resolveSave(null);
      await selectionPromise;
    });

    expect(selectionSettled).toBe(true);
    expect(subject.blockTextDrafts()[block.id]).toBe('alpha');
    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(subject.setFocusBlockId).not.toHaveBeenCalled();
  });

  it('keeps the trigger removed and menu closed when save rejects', async () => {
    const failure = new Error('save failed');
    const saveBlock = vi.fn(async () => { throw failure; });
    const subject = renderSubject(saveBlock);
    let caught: unknown;

    await act(async () => {
      try {
        await subject.hook.result.current.handleSelectSlashCommand(subject.heading);
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBe(failure);
    expect(saveBlock).toHaveBeenCalledTimes(1);
    expect(subject.blockTextDrafts()[block.id]).toBe('alpha');
    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(subject.setFocusBlockId).not.toHaveBeenCalled();
  });
});
