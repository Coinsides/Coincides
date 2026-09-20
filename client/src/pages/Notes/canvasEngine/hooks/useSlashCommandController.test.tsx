import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent, ReactNode, RefObject, SetStateAction } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectSlashTrigger, filterSlashCommands, NOTE_INSERT_COMMANDS, NOTE_SLASH_COMMANDS } from '../../noteSlashCommands';
import { NoteInsertCommandsContext, type NoteInsertCommandHost } from '../NoteInsertCommandsContext';
import type { NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { planSlashBlockRollback } from '../slashCommandReducer';
import {
  textFocusReceiptForBlock,
  textFocusReceiptForDraft,
} from '../textFocusReceipt';
import {
  useSlashCommandController,
  type UseSlashCommandControllerOptions,
} from './useSlashCommandController';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';
import { createTextBlockContentV1 } from '../textFlowService';

const blockText = 'alpha /hea';
const rolledBackBlockText = 'alpha ';

const rejectedBlockSaveOutcome: BlockSaveOutcome = {
  status: 'rejected',
  block: null,
  recoveryReceipt: null,
  reconciliation: 'not_attempted',
  durableState: 'not_checked',
  reason: 'mutation_not_allowed',
  staleEpoch: false,
};

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

const rejectBlockRollback: UseSlashCommandControllerOptions['rollbackBlockSlashSession'] = ({
  fallbackText,
}) => ({
  applied: false,
  text: fallbackText || '',
  focus: null,
});

function renderSubject(
  saveBlock: UseSlashCommandControllerOptions['saveBlock'],
  overrides: Partial<UseSlashCommandControllerOptions> = {},
  insertHost?: NoteInsertCommandHost,
) {
  let blockTextDrafts: Record<string, string> = {};
  let blockTextFlowDrafts: Record<string, TextBlockContentV1> = {};
  const setFocusBlockId = vi.fn();
  const setInteractionState = vi.fn();
  const blockList = document.createElement('div');
  const textarea = document.createElement('textarea');
  const owner = textFocusReceiptForBlock(block.id);
  textarea.value = blockText;
  textarea.dataset.blockId = owner.blockId;
  textarea.dataset.textFlowId = owner.textFlowId;
  textarea.dataset.textUnitId = owner.textUnitId;
  blockList.append(textarea);
  document.body.append(blockList);

  const options: UseSlashCommandControllerOptions = {
    addToast: vi.fn(),
    applyTemplateToBlock: vi.fn(async () => null),
    blockListRef: { current: blockList } as RefObject<HTMLDivElement>,
    blocks: [block],
    blockTextDrafts,
    blockTextFlowDrafts,
    draftText: '',
    draftTextRef: { current: '' },
    focusedTextOwner: owner,
    insertTemplateOptions: [],
    persistDraft: vi.fn(async () => undefined),
    rollbackBlockSlashSession: (input) => {
      const currentText = blockTextDrafts[input.session.owner.blockId]
        ?? input.fallbackText
        ?? '';
      if (input.getCurrentText() !== currentText) {
        return { applied: false, text: currentText, focus: null };
      }
      const currentTextFlow = blockTextFlowDrafts[input.session.owner.blockId] || null;
      const plan = planSlashBlockRollback({
        session: input.session,
        currentOwner: input.getCurrentOwner(),
        text: currentText,
        textFlow: currentTextFlow,
        fieldText: null,
        reason: input.reason,
      });
      if (plan.applied) {
        blockTextDrafts = { ...blockTextDrafts, [block.id]: plan.text };
        if (plan.textFlow) {
          blockTextFlowDrafts = { ...blockTextFlowDrafts, [block.id]: plan.textFlow };
        }
        textarea.value = plan.text;
      }
      return plan;
    },
    saveBlock,
    setBlockTextDrafts: (update) => {
      blockTextDrafts = applyStateUpdate(blockTextDrafts, update);
      options.blockTextDrafts = blockTextDrafts;
      if (blockTextDrafts[block.id] !== undefined) textarea.value = blockTextDrafts[block.id];
    },
    setBlockTextFlowDrafts: (update) => {
      blockTextFlowDrafts = applyStateUpdate(blockTextFlowDrafts, update);
      options.blockTextFlowDrafts = blockTextFlowDrafts;
    },
    setDraftText: vi.fn(),
    setFocusBlockId,
    setInteractionState,
    templateOptions: [],
    activateDraft: vi.fn(),
    ...overrides,
  };
  let renders = 0;
  const hook = renderHook(() => {
    renders += 1;
    return useSlashCommandController(options);
  }, insertHost ? { wrapper: ({ children }: { children: ReactNode }) =>
    <NoteInsertCommandsContext.Provider value={{ current: insertHost }}>{children}</NoteInsertCommandsContext.Provider> } : undefined);
  textarea.setSelectionRange(blockText.length, blockText.length);

  act(() => {
    hook.result.current.handleBlockTextChange(block.id, blockText, blockText.length);
  });
  textarea.focus();
  textarea.setSelectionRange(blockText.length, blockText.length);
  const heading = hook.result.current.slashCommands.find((command) => command.id === 'heading');
  if (!heading) throw new Error('heading slash command fixture missing');

  return {
    blockTextDrafts: () => blockTextDrafts,
    blockTextFlowDrafts: () => blockTextFlowDrafts,
    heading,
    hook,
    renders: () => renders,
    setCurrentText: (value: string) => {
      blockTextDrafts = { ...blockTextDrafts, [block.id]: value };
      options.blockTextDrafts = blockTextDrafts;
      textarea.value = value;
      hook.rerender();
    },
    setCurrentTextFlow: (textFlow: TextBlockContentV1) => {
      blockTextFlowDrafts = { ...blockTextFlowDrafts, [block.id]: textFlow };
      options.blockTextFlowDrafts = blockTextFlowDrafts;
      hook.rerender();
    },
    setBlocks: (nextBlocks: NoteBlock[]) => {
      options.blocks = nextBlocks;
      hook.rerender();
    },
    setFocusedTextOwner: (nextOwner: UseSlashCommandControllerOptions['focusedTextOwner']) => {
      options.focusedTextOwner = nextOwner;
      hook.rerender();
    },
    setDraftOwnerReconciliation: (receipt: UseSlashCommandControllerOptions['draftOwnerReconciliation']) => {
      options.draftOwnerReconciliation = receipt;
      hook.rerender();
    },
    setFocusBlockId,
    setInteractionState,
    textarea,
  };
}

function blockKeyEvent(key: string, ctrlKey = false): KeyboardEvent<HTMLTextAreaElement> {
  return {
    key,
    shiftKey: false,
    ctrlKey,
    metaKey: false,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent<HTMLTextAreaElement>;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('slash command async current behavior', () => {
  it.each(NOTE_INSERT_COMMANDS)('C4a /$label accepts the same Chinese word printed in the insert menu', (command) => {
    const text = `正文 /${command.label}`;
    const trigger = detectSlashTrigger(text);
    expect(trigger?.query).toBe(command.label);
    expect(filterSlashCommands(trigger!.query)).toEqual([command]);
  });
  it.each(NOTE_INSERT_COMMANDS)('C4a keyboard $label removes only the trigger and invokes the shared insert host', async (command) => {
    const host: NoteInsertCommandHost = { disabledReason: vi.fn(() => undefined), run: vi.fn() };
    const subject = renderSubject(vi.fn(), {}, host);
    const text = `alpha /${command.keywords[0]}`;
    subject.setCurrentText(text);
    act(() => subject.hook.result.current.handleBlockTextChange(block.id, text, text.length, subject.textarea));
    const index = subject.hook.result.current.slashCommands.findIndex((candidate) => candidate.id === command.id);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(subject.hook.result.current.slashCommands[index].disabledReason).toBeUndefined();
    for (let move = 0; move < index; move++) {
      act(() => subject.hook.result.current.handleBlockKeyDown(block, text, blockKeyEvent('ArrowDown')));
    }
    expect(subject.hook.result.current.activeSlashCommandId).toBe(command.id);
    await act(async () => subject.hook.result.current.handleBlockKeyDown(block, text, blockKeyEvent('Enter')));
    expect(host.run).toHaveBeenCalledExactlyOnceWith(command.insertAction, block.id);
    expect(subject.blockTextDrafts()[block.id]).toBe('alpha ');
    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(subject.textarea.selectionStart).toBe(6);
  });

  it('C4a denies a newly unavailable insert door, keeps existing trigger rollback, and opens no editor', async () => {
    let blocked = false;
    const host: NoteInsertCommandHost = { disabledReason: () => blocked ? '请先返回书写模式。' : undefined, run: vi.fn() };
    const subject = renderSubject(vi.fn(), {}, host);
    const text = 'alpha /table';
    subject.setCurrentText(text);
    act(() => subject.hook.result.current.handleBlockTextChange(block.id, text, text.length, subject.textarea));
    const command = subject.hook.result.current.slashCommands.find((candidate) => candidate.id === 'insert-table')!;
    blocked = true;
    await act(async () => subject.hook.result.current.handleSelectSlashCommand(command));
    expect(host.run).not.toHaveBeenCalled();
    expect(subject.blockTextDrafts()[block.id]).toBe('alpha ');
  });
  it.each([
    { text: 'Title\nBody /h2', multiline: true },
    { text: 'Title /h2', multiline: false },
  ])('finishes draft heading creation with multiline=$multiline through its existing owner receipt', async ({ text, multiline }) => {
    const frames: FrameRequestCallback[] = [];
    const requestFrame = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    const cancelFrame = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined);
    const owner = textFocusReceiptForDraft(12);
    const persistDraft = vi.fn<UseSlashCommandControllerOptions['persistDraft']>(async () => undefined);
    const onHeadingStructure = vi.fn<NonNullable<UseSlashCommandControllerOptions['onHeadingStructure']>>(async () => true);
    const subject = renderSubject(vi.fn(async () => rejectedBlockSaveOutcome), {
      draftText: text, draftTextRef: { current: text }, persistDraft, onHeadingStructure,
    });
    subject.setFocusedTextOwner(owner);
    subject.textarea.dataset.blockId = owner.blockId;
    subject.textarea.dataset.textFlowId = owner.textFlowId;
    subject.textarea.dataset.textUnitId = owner.textUnitId;
    subject.textarea.value = text;
    act(() => subject.hook.result.current.handleDraftChange(text, text.length, subject.textarea));
    await act(async () => {
      await subject.hook.result.current.handleSelectSlashCommand(NOTE_SLASH_COMMANDS.find((command) => command.id === 'heading-2')!);
    });
    expect(persistDraft).toHaveBeenCalledOnce();
    const persistedFlow = persistDraft.mock.calls[0][2]!.textFlow!;
    expect(persistedFlow.units).toHaveLength(1);
    expect(persistedFlow.units[0]).toMatchObject({ text: multiline ? 'Title\nBody' : 'Title', writing_role: multiline ? 'paragraph' : 'heading_2' });
    expect(onHeadingStructure).not.toHaveBeenCalled();
    const created: NoteBlock = { ...block, id: 'created-draft', content_json: { text_flow: persistedFlow }, plain_text: multiline ? 'Title\nBody' : 'Title' };
    // Creation may publish its owner before React publishes the new block list.
    subject.setDraftOwnerReconciliation({ from: owner, to: textFocusReceiptForBlock(created.id), selectionStart: 0, selectionEnd: 0 });
    subject.setBlocks([block, created]);
    await act(async () => { for (const callback of frames) callback(0); });
    if (multiline) {
      expect(onHeadingStructure).toHaveBeenCalledOnce();
      const [headingBlock, request] = onHeadingStructure.mock.calls[0];
      expect(headingBlock.id).toBe(created.id);
      expect(request.previousTextFlow).toEqual(persistedFlow);
      expect(request.nextTextFlow.units.map((unit) => [unit.writing_role, unit.text])).toEqual([
        ['heading_2', 'Title'], ['paragraph', 'Body'],
      ]);
    } else {
      expect(onHeadingStructure).not.toHaveBeenCalled();
      expect(frames).toHaveLength(0);
    }
    subject.hook.unmount();
    requestFrame.mockRestore();
    cancelFrame.mockRestore();
  });
  it('preserves and shifts a retained inline anchor after removing a heading command before existing text', async () => {
    const flow = createTextBlockContentV1('/h2 Title');
    flow.inline_structures = [{ id: 'title-code', parent_text_unit_id: 'tu-1', semantic_kind: 'inline_code',
      anchor_text: 'Title', anchor_range: { start: 4, end: 9 }, field_values: { language: 'text' }, metadata: {}, status: 'active' }];
    const onHeadingStructure = vi.fn<NonNullable<UseSlashCommandControllerOptions['onHeadingStructure']>>(async () => true);
    const subject = renderSubject(vi.fn(async () => rejectedBlockSaveOutcome), {
      blockTextFlowDrafts: { [block.id]: flow }, onHeadingStructure,
    });
    subject.setCurrentText('/h2 Title');
    subject.textarea.setSelectionRange(3, 3);
    act(() => subject.hook.result.current.handleBlockTextChange(block.id, '/h2 Title', 3, subject.textarea));
    expect(subject.hook.result.current.slashTarget?.trigger.query).toBe('h2');
    await act(async () => { await subject.hook.result.current.handleSelectSlashCommand(subject.hook.result.current.slashCommands.find((command) => command.id === 'heading-2')!); });
    const request = onHeadingStructure.mock.calls[0][1];
    expect(request.nextTextFlow.units[0]).toMatchObject({ text: ' Title', writing_role: 'heading_2' });
    expect(request.nextTextFlow.inline_structures).toEqual([{ ...flow.inline_structures[0], anchor_range: { start: 1, end: 6 } }]);
    expect(flow.inline_structures[0].anchor_range).toEqual({ start: 4, end: 9 });
  });
  it.each(['heading', 'heading-2', 'heading-3'])('hands %s conversion to the heading host without a duplicate save', async (id) => {
    const saveBlock = vi.fn(async () => rejectedBlockSaveOutcome);
    const onHeadingStructure = vi.fn<NonNullable<UseSlashCommandControllerOptions['onHeadingStructure']>>(async () => true);
    const subject = renderSubject(saveBlock, { onHeadingStructure });
    const command = NOTE_SLASH_COMMANDS.find((candidate) => candidate.id === id)!;
    await act(async () => { await subject.hook.result.current.handleSelectSlashCommand(command); });
    expect(onHeadingStructure).toHaveBeenCalledOnce();
    expect(onHeadingStructure.mock.calls[0][1]).toMatchObject({ inputType: 'formatHeading', headingUnitId: 'tu-1',
      nextTextFlow: { units: [{ writing_role: command.writingRole, text: 'alpha' }] } });
    expect(saveBlock).not.toHaveBeenCalled();
    expect(subject.hook.result.current.slashTarget).toBeNull();
  });
  it('keeps Enter commit behavior: removes the trigger and closes the menu', async () => {
    const subject = renderSubject(vi.fn(async () => rejectedBlockSaveOutcome));
    const event = blockKeyEvent('Enter');

    await act(async () => {
      subject.hook.result.current.handleBlockKeyDown(block, blockText, event);
      await Promise.resolve();
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(subject.blockTextDrafts()[block.id]).toBe('alpha');
    expect(subject.hook.result.current.slashTarget).toBeNull();
  });

  it('rolls Escape back to the original text and restores the same owner caret', () => {
    const subject = renderSubject(vi.fn(async () => rejectedBlockSaveOutcome));
    const focus = vi.spyOn(subject.textarea, 'focus');
    const event = blockKeyEvent('Escape');

    act(() => {
      subject.hook.result.current.handleBlockKeyDown(block, blockText, event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(subject.blockTextDrafts()[block.id]).toBe(rolledBackBlockText);
    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(focus).toHaveBeenCalled();
    expect(document.activeElement).toBe(subject.textarea);
    expect(subject.textarea.selectionStart).toBe(rolledBackBlockText.length);
    expect(subject.textarea.selectionEnd).toBe(rolledBackBlockText.length);
  });

  it('closes the Slash session without rollback before Ctrl+Enter saves the block', async () => {
    const saveBlock = vi.fn(async () => rejectedBlockSaveOutcome);
    const subject = renderSubject(saveBlock);
    const event = blockKeyEvent('Enter', true);

    await act(async () => {
      subject.hook.result.current.handleBlockKeyDown(block, blockText, event);
      await Promise.resolve();
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(subject.blockTextDrafts()[block.id]).toBe(blockText);
    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(saveBlock).toHaveBeenCalledTimes(1);
  });

  it('rolls a draft Escape back through the same owner tuple and local caret', () => {
    const draftTriggerText = 'draft /hea';
    const draftRolledBackText = 'draft ';
    const owner = textFocusReceiptForDraft(7);
    const blockList = document.createElement('div');
    const textarea = document.createElement('textarea');
    textarea.value = draftTriggerText;
    textarea.dataset.blockId = owner.blockId;
    textarea.dataset.textFlowId = owner.textFlowId;
    textarea.dataset.textUnitId = owner.textUnitId;
    blockList.append(textarea);
    document.body.append(blockList);
    let draftText = '';
    const draftTextRef = { current: '' };
    const options: UseSlashCommandControllerOptions = {
      addToast: vi.fn(),
      applyTemplateToBlock: vi.fn(async () => null),
      blockListRef: { current: blockList } as RefObject<HTMLDivElement>,
      blocks: [],
      blockTextDrafts: {},
      blockTextFlowDrafts: {},
      draftText,
      draftTextRef,
      focusedTextOwner: owner,
      insertTemplateOptions: [],
      persistDraft: vi.fn(async () => undefined),
      rollbackBlockSlashSession: rejectBlockRollback,
      saveBlock: vi.fn(async () => rejectedBlockSaveOutcome),
      setBlockTextDrafts: vi.fn(),
      setBlockTextFlowDrafts: vi.fn(),
      setDraftText: (update) => {
        draftText = applyStateUpdate(draftText, update);
        draftTextRef.current = draftText;
        options.draftText = draftText;
        textarea.value = draftText;
      },
      setFocusBlockId: vi.fn(),
      setInteractionState: vi.fn(),
      templateOptions: [],
      activateDraft: vi.fn(),
    };
    const hook = renderHook(() => useSlashCommandController(options));
    textarea.setSelectionRange(draftTriggerText.length, draftTriggerText.length);

    act(() => {
      hook.result.current.handleDraftChange(
        draftTriggerText,
        draftTriggerText.length,
        textarea,
      );
    });
    textarea.focus();
    textarea.setSelectionRange(draftTriggerText.length, draftTriggerText.length);
    const focus = vi.spyOn(textarea, 'focus');

    act(() => {
      hook.result.current.handleDraftKeyDown(blockKeyEvent('Escape'));
    });

    expect(draftText).toBe(draftRolledBackText);
    expect(draftTextRef.current).toBe(draftRolledBackText);
    expect(hook.result.current.slashTarget).toBeNull();
    expect(focus).toHaveBeenCalled();
    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBe(draftRolledBackText.length);
    expect(textarea.selectionEnd).toBe(draftRolledBackText.length);
  });

  it.each([
    ['disabled', NOTE_SLASH_COMMANDS.find((command) => command.id === 'inline-formula')],
    ['annotation action', NOTE_SLASH_COMMANDS.find((command) => command.id === 'definition')],
    ['missing template', NOTE_SLASH_COMMANDS.find((command) => command.id === 'formula')],
  ])('guardedly rolls back %s and restores the same owner caret', async (_label, command) => {
    if (!command) throw new Error(`${_label} slash command fixture missing`);
    const subject = renderSubject(vi.fn(async () => rejectedBlockSaveOutcome));
    const focus = vi.spyOn(subject.textarea, 'focus');

    await act(async () => {
      await subject.hook.result.current.handleSelectSlashCommand(command);
    });

    expect(subject.blockTextDrafts()[block.id]).toBe(rolledBackBlockText);
    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(focus).toHaveBeenCalled();
    expect(document.activeElement).toBe(subject.textarea);
    expect(subject.textarea.selectionStart).toBe(rolledBackBlockText.length);
    expect(subject.textarea.selectionEnd).toBe(rolledBackBlockText.length);
  });

  it('rolls back a missing block before closing the session', async () => {
    const subject = renderSubject(vi.fn(async () => rejectedBlockSaveOutcome));
    const focus = vi.spyOn(subject.textarea, 'focus');
    subject.setBlocks([]);

    await act(async () => {
      await subject.hook.result.current.handleSelectSlashCommand(subject.heading);
    });

    expect(subject.blockTextDrafts()[block.id]).toBe(rolledBackBlockText);
    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(focus).toHaveBeenCalled();
    expect(subject.textarea.selectionStart).toBe(rolledBackBlockText.length);
  });

  it('does not roll back or steal focus after the owner tuple drifts', () => {
    const subject = renderSubject(vi.fn(async () => rejectedBlockSaveOutcome));
    const focus = vi.spyOn(subject.textarea, 'focus');
    expect(subject.setInteractionState).toHaveBeenCalledTimes(1);
    subject.setFocusedTextOwner(textFocusReceiptForBlock(block.id, 'tu-2'));

    act(() => {
      subject.hook.result.current.handleBlockKeyDown(block, blockText, blockKeyEvent('Escape'));
    });

    expect(subject.blockTextDrafts()[block.id]).toBe(blockText);
    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(focus).not.toHaveBeenCalled();
    expect(subject.textarea.selectionStart).toBe(blockText.length);
    expect(subject.textarea.selectionEnd).toBe(blockText.length);
    expect(subject.setInteractionState).toHaveBeenCalledTimes(1);
  });

  it('does not capture a block session from a same-block different-TextUnit anchor', () => {
    const subject = renderSubject(vi.fn(async () => rejectedBlockSaveOutcome));
    const focus = vi.spyOn(subject.textarea, 'focus');
    subject.setFocusedTextOwner(textFocusReceiptForBlock(block.id, 'tu-2'));

    act(() => {
      subject.hook.result.current.handleBlockTextChange(
        block.id,
        blockText,
        blockText.length,
        subject.textarea,
      );
    });
    act(() => {
      subject.hook.result.current.handleBlockKeyDown(block, blockText, blockKeyEvent('Escape'));
    });

    expect(subject.blockTextDrafts()[block.id]).toBe(blockText);
    expect(subject.hook.result.current.slashSession).toBeNull();
    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(focus).not.toHaveBeenCalled();
  });

  it('does not roll back a changed range, preserving a deliberate literal slash', () => {
    const subject = renderSubject(vi.fn(async () => rejectedBlockSaveOutcome));
    const focus = vi.spyOn(subject.textarea, 'focus');
    const literalSlashText = 'alpha /literal';
    subject.setCurrentText(literalSlashText);
    subject.textarea.setSelectionRange(literalSlashText.length, literalSlashText.length);

    act(() => {
      subject.hook.result.current.handleBlockKeyDown(block, literalSlashText, blockKeyEvent('Escape'));
    });

    expect(subject.blockTextDrafts()[block.id]).toBe(literalSlashText);
    expect(subject.hook.result.current.slashTarget).toBeNull();
    expect(focus).not.toHaveBeenCalled();
    expect(subject.textarea.selectionStart).toBe(literalSlashText.length);
    expect(subject.textarea.selectionEnd).toBe(literalSlashText.length);
    expect(subject.setInteractionState).toHaveBeenLastCalledWith(expect.objectContaining({
      mode: 'editingText',
      textUnitId: 'tu-1',
    }));
  });

  it('does not half-roll back when the owner TextUnit slice has drifted', () => {
    const subject = renderSubject(vi.fn(async () => rejectedBlockSaveOutcome));
    subject.setCurrentTextFlow({
      textflow_version: 'TextBlockContentV1',
      units: [{
        id: 'tu-1',
        text: 'alpha /literal',
        writing_role: 'paragraph',
        indent_level: 0,
        order_index: 0,
        metadata: {},
        status: 'active',
      }],
      inline_structures: [],
      metadata: {},
    });

    act(() => {
      subject.hook.result.current.handleBlockKeyDown(block, blockText, blockKeyEvent('Escape'));
    });

    expect(subject.blockTextDrafts()[block.id]).toBe(blockText);
    expect(subject.blockTextFlowDrafts()[block.id]?.units[0]?.text).toBe('alpha /literal');
    expect(subject.hook.result.current.slashTarget).toBeNull();
  });

  it('rejects a draft session when the confirmed owner does not match the draft textarea', () => {
    const draftTriggerText = 'draft /hea';
    const draftOwner = textFocusReceiptForDraft(9);
    const staleBlockOwner = textFocusReceiptForBlock(block.id);
    const textarea = document.createElement('textarea');
    textarea.value = draftTriggerText;
    textarea.dataset.blockId = draftOwner.blockId;
    textarea.dataset.textFlowId = draftOwner.textFlowId;
    textarea.dataset.textUnitId = draftOwner.textUnitId;
    document.body.append(textarea);
    let draftText = '';
    const draftTextRef = { current: '' };
    const options: UseSlashCommandControllerOptions = {
      addToast: vi.fn(),
      applyTemplateToBlock: vi.fn(async () => null),
      blockListRef: { current: document.body } as unknown as RefObject<HTMLDivElement>,
      blocks: [block],
      blockTextDrafts: {},
      blockTextFlowDrafts: {},
      draftText,
      draftTextRef,
      focusedTextOwner: staleBlockOwner,
      insertTemplateOptions: [],
      persistDraft: vi.fn(async () => undefined),
      rollbackBlockSlashSession: rejectBlockRollback,
      saveBlock: vi.fn(async () => rejectedBlockSaveOutcome),
      setBlockTextDrafts: vi.fn(),
      setBlockTextFlowDrafts: vi.fn(),
      setDraftText: (update) => {
        draftText = applyStateUpdate(draftText, update);
        draftTextRef.current = draftText;
        options.draftText = draftText;
        textarea.value = draftText;
      },
      setFocusBlockId: vi.fn(),
      setInteractionState: vi.fn(),
      templateOptions: [],
      activateDraft: vi.fn(),
    };
    const hook = renderHook(() => useSlashCommandController(options));
    textarea.setSelectionRange(draftTriggerText.length, draftTriggerText.length);

    act(() => {
      hook.result.current.handleDraftChange(draftTriggerText, draftTriggerText.length, textarea);
    });
    act(() => {
      hook.result.current.handleDraftKeyDown(blockKeyEvent('Escape'));
    });

    expect(draftText).toBe(draftTriggerText);
    expect(draftTextRef.current).toBe(draftTriggerText);
    expect(hook.result.current.slashTarget).toBeNull();
  });

  it('keeps native same-value scheduling when an already closed target is cleared', () => {
    const subject = renderSubject(vi.fn(async () => rejectedBlockSaveOutcome));

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

  it('keeps the trigger removed and menu closed when save is rejected', async () => {
    let resolveSave!: (value: BlockSaveOutcome) => void;
    const saveReceipt = new Promise<BlockSaveOutcome>((resolve) => {
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
      resolveSave(rejectedBlockSaveOutcome);
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
