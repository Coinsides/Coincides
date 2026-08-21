import { act, renderHook } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TemplateOption } from '@/services/templateOptions';
import { createPrimaryPageFrame } from '../engineModel';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { Note, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import {
  finalizeDraftRecoveryReceipt,
  forgetDraftRecoveryReceipt,
  listDraftRecoveryReceipts,
  replayDraftRecoveryReceipts,
  type DraftBlockCreateResult,
  type DraftRecoveryReceipt,
} from '../draftBlockPersistence';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { textFocusReceiptForBlock } from '../textFocusReceipt';
import {
  useDraftBlockController,
  type UseDraftBlockControllerOptions,
} from './useDraftBlockController';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';
import {
  createPageFrameDraftSessionAuthority,
  findPageFrameForLayout,
  resolvePageDraftSessionAuthority,
} from './useRuntimeNaturalWritingController';

const defaultDraftLayout: BlockBoxLayout = {
  x: 0,
  y: 0,
  width: 760,
  height: 72,
};

const defaultTextTemplate: TemplateOption = {
  template_id: 'text',
  template_key: 'text',
  template_version: '1.0.0',
  label: 'Text',
  description: 'Text block',
  system_type: 'text',
  learning_role: 'note',
  legacy_block_type: 'text',
  default_content: {},
  origin: 'test',
  status: 'active',
  isRuntime: false,
};

function savedBlockOutcome(block: NoteBlock): BlockSaveOutcome {
  return {
    status: 'saved',
    block,
    recoveryReceipt: null,
    reconciliation: 'response',
  };
}

function rejectedBlockOutcome(): BlockSaveOutcome {
  return {
    status: 'rejected',
    block: null,
    recoveryReceipt: null,
    reconciliation: 'not_attempted',
    durableState: 'not_checked',
    reason: 'request_failed',
    staleEpoch: false,
  };
}

function makeOptions(): UseDraftBlockControllerOptions {
  return {
    createBlock: vi.fn(async () => null),
    defaultDraftLayout,
    defaultTextTemplate,
    discardDraftBlock: vi.fn(async () => true),
    finalizeDraftBlock: vi.fn(async () => true),
    note: null,
    onDraftFocusReceipt: vi.fn(),
    saveBlock: vi.fn(async () => rejectedBlockOutcome()),
    saveDraftBlockPlacement: vi.fn(async (block) => block),
    setActiveBlockId: vi.fn(),
    setFocusBlockId: vi.fn(),
    setInteractionState: vi.fn(),
    setSelectedBlockId: vi.fn(),
  };
}

const note: Note = {
  id: 'note-1',
  course_id: 'project-1',
  title: 'Draft lifecycle',
  description: null,
  status: 'active',
  metadata: {},
};

function createdBlock(text: string): NoteBlock {
  const textFlow = createTextBlockContentV1(text, 'paragraph');
  return {
    id: 'block-1',
    placement_id: 'placement-1',
    display_overrides_json: {},
    canvas_layout: null,
    block_type: 'text',
    title: null,
    content_json: { body: text, [TEXT_FLOW_CONTENT_KEY]: textFlow },
    plain_text: text,
    metadata: {},
    order_index: 0,
    source_references: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function draftCreateResult(
  block: NoteBlock,
  clientCreateKey = 'client-create-key',
  placementPersisted = true,
  reused = false,
): DraftBlockCreateResult {
  return { block, clientCreateKey, placementPersisted, reused };
}

describe('useDraftBlockController native useState parity', () => {
  beforeEach(() => sessionStorage.clear());

  it('uses the visible primary frame in Page mode instead of a stale Canvas selection', () => {
    const primary = createPrimaryPageFrame({ id: 'visible-primary' });
    const secondary = {
      ...createPrimaryPageFrame({ id: 'canvas-selected-secondary', x: 1000 }),
      role: 'secondary_page_frame' as const,
    };
    const resolved = findPageFrameForLayout({
      pageFrames: [primary, secondary],
      primaryFrameId: primary.id,
      selectedFrameId: secondary.id,
    }, defaultDraftLayout, secondary.id);

    expect(resolved?.id).toBe(primary.id);
    expect(findPageFrameForLayout({
      pageFrames: [primary, secondary],
      primaryFrameId: primary.id,
      selectedFrameId: secondary.id,
    }, {
      ...defaultDraftLayout,
      frame_id: primary.id,
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: { left: 1000, right: 1760, frameId: secondary.id },
      },
    }, secondary.id)).toBeNull();
  });

  it('matches native same-value render-phase scheduling and effect commits', () => {
    const hookReceipt = { renders: 0, effects: 0 };
    const nativeReceipt = { renders: 0, effects: 0 };
    const subject = renderHook(() => {
      hookReceipt.renders += 1;
      const controller = useDraftBlockController(makeOptions());
      useEffect(() => {
        hookReceipt.effects += 1;
      }, [controller.draftText]);
      return controller;
    });
    const native = renderHook(() => {
      nativeReceipt.renders += 1;
      const [value, setValue] = useState('');
      useEffect(() => {
        nativeReceipt.effects += 1;
      }, [value]);
      return { setValue, value };
    });
    const hookBefore = { ...hookReceipt };
    const nativeBefore = { ...nativeReceipt };

    act(() => {
      subject.result.current.setDraftText('');
      native.result.current.setValue('');
    });

    expect({
      renders: hookReceipt.renders - hookBefore.renders,
      effects: hookReceipt.effects - hookBefore.effects,
    }).toEqual({
      renders: nativeReceipt.renders - nativeBefore.renders,
      effects: nativeReceipt.effects - nativeBefore.effects,
    });
    expect({
      renders: nativeReceipt.renders - nativeBefore.renders,
      effects: nativeReceipt.effects - nativeBefore.effects,
    }).toEqual({ renders: 0, effects: 0 });
  });

  it('matches native functional-updater evaluation timing', () => {
    const subject = renderHook(() => useDraftBlockController(makeOptions()));
    const native = renderHook(() => {
      const [value, setValue] = useState('');
      return { setValue, value };
    });
    let hookExternal = 'one';
    let nativeExternal = 'one';

    act(() => {
      subject.result.current.setDraftText(() => hookExternal);
      native.result.current.setValue(() => nativeExternal);
      hookExternal = 'two';
      nativeExternal = 'two';
    });

    expect(subject.result.current.draftText).toBe(native.result.current.value);
    expect(native.result.current.value).toBe('one');
  });

  it('builds reconciliation from a non-echo canonical create response', async () => {
    const text = 'alpha /hea';
    const canonicalTextUnitId = 'canonical-server-tu';
    const canonicalFlowSeed = createTextBlockContentV1(text, 'paragraph');
    const canonicalFlow: TextBlockContentV1 = {
      ...canonicalFlowSeed,
      units: canonicalFlowSeed.units.map((unit, index) => ({
        ...unit,
        id: index === 0 ? canonicalTextUnitId : unit.id,
      })),
    };
    const canonicalBlock: NoteBlock = {
      ...createdBlock(text),
      id: 'canonical-block-1',
      placement_id: 'canonical-placement-1',
      content_json: {
        body: text,
        [TEXT_FLOW_CONTENT_KEY]: canonicalFlow,
      },
    };
    let requestedTextUnitId: string | null = null;
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>(
      async (_template, _text, options) => {
        const requestedFlow = options.contentJson?.[TEXT_FLOW_CONTENT_KEY] as TextBlockContentV1 | undefined;
        requestedTextUnitId = requestedFlow?.units[0]?.id || null;
        return draftCreateResult(canonicalBlock, options.clientCreateKey);
      },
    );
    const onDraftPersisted = vi.fn();
    const setFocusBlockId = vi.fn();
    const subject = renderHook(() => useDraftBlockController({
      ...makeOptions(),
      createBlock,
      note,
      onDraftPersisted,
      setFocusBlockId,
    }));

    act(() => {
      subject.result.current.activateDraft();
      subject.result.current.setDraftText(text);
    });
    await act(async () => {
      await subject.result.current.persistDraft(text);
    });

    expect(requestedTextUnitId).not.toBe(canonicalTextUnitId);
    expect(subject.result.current.draftOwnerReconciliation?.to).toEqual(
      textFocusReceiptForBlock(canonicalBlock.id, canonicalTextUnitId),
    );
    expect(setFocusBlockId).toHaveBeenCalledWith(canonicalBlock.id);
    expect(onDraftPersisted).toHaveBeenCalledWith(canonicalBlock);
  });

  it('retries autosave against the existing durable identity after a save failure', async () => {
    const createReceipt = deferred<DraftBlockCreateResult | null>();
    const createBlock = vi.fn(() => createReceipt.promise);
    const block = createdBlock('a');
    const saveBlock = vi.fn<UseDraftBlockControllerOptions['saveBlock']>()
      .mockResolvedValueOnce(rejectedBlockOutcome())
      .mockResolvedValueOnce(savedBlockOutcome(block));
    const setFocusBlockId = vi.fn();
    const onDraftPersisted = vi.fn();
    const subject = renderHook(() => useDraftBlockController({
      ...makeOptions(),
      createBlock,
      note,
      onDraftPersisted,
      saveBlock,
      setFocusBlockId,
    }));

    act(() => {
      subject.result.current.activateDraft();
      subject.result.current.setDraftText('a');
    });
    let firstPersist!: Promise<void>;
    act(() => {
      firstPersist = subject.result.current.persistDraft('a');
      subject.result.current.setDraftText('ab');
    });
    await act(async () => {
      createReceipt.resolve(draftCreateResult(block));
      await firstPersist;
    });

    expect(createBlock).toHaveBeenCalledTimes(1);
    expect(saveBlock).toHaveBeenCalledTimes(1);
    expect(subject.result.current.draftActive).toBe(true);
    expect(subject.result.current.draftText).toBe('ab');

    await act(async () => {
      await subject.result.current.persistDraft('ab');
    });
    expect(createBlock).toHaveBeenCalledTimes(1);
    expect(saveBlock).toHaveBeenCalledTimes(2);
    expect(setFocusBlockId).toHaveBeenCalledWith(block.id);
    expect(onDraftPersisted).toHaveBeenCalledTimes(1);
    expect(subject.result.current.draftOwnerReconciliation).toEqual(expect.objectContaining({
      from: expect.objectContaining({
        blockId: expect.stringMatching(/^draft-/),
        textFlowId: expect.stringMatching(/^textflow-draft-/),
        textUnitId: expect.any(String),
      }),
      to: expect.objectContaining({
        blockId: block.id,
        textFlowId: `textflow-${block.id}`,
        textUnitId: expect.any(String),
      }),
    }));

    act(() => {
      subject.result.current.handleDurableFocusReceipt(textFocusReceiptForBlock(block.id));
    });
    expect(subject.result.current.draftActive).toBe(false);
  });

  it('keeps the dirty sentinel editable when create fails and retries POST once requested again', async () => {
    const block = createdBlock('sentinel');
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>()
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(async (_template, _text, options) => (
        draftCreateResult(block, options?.clientCreateKey)
      ));
    const setFocusBlockId = vi.fn();
    const subject = renderHook(() => useDraftBlockController({
      ...makeOptions(),
      createBlock,
      note,
      setFocusBlockId,
    }));

    act(() => {
      subject.result.current.activateDraft();
      subject.result.current.setDraftText('sentinel');
    });
    await act(async () => {
      await subject.result.current.persistDraft('sentinel');
    });
    expect(subject.result.current.draftActive).toBe(true);
    expect(subject.result.current.draftText).toBe('sentinel');
    expect(subject.result.current.draftPhase).toBe('dirty');
    expect(createBlock).toHaveBeenCalledTimes(1);
    const firstKey = createBlock.mock.calls[0]?.[2]?.clientCreateKey;

    await act(async () => {
      await subject.result.current.persistDraft('sentinel');
    });
    expect(createBlock).toHaveBeenCalledTimes(2);
    expect(createBlock.mock.calls[1]?.[2]?.clientCreateKey).toBe(firstKey);
    expect(setFocusBlockId).toHaveBeenCalledWith(block.id);
  });

  it('forces the latest PUT after a lost create response replays an older durable snapshot', async () => {
    let durableText = '';
    const authoritativeCreateSnapshot = createdBlock('a');
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>()
      .mockImplementationOnce(async () => {
        // The server committed `a`, but the response was lost.
        durableText = 'a';
        return null;
      })
      .mockImplementationOnce(async (_template, _text, options) => (
        draftCreateResult(authoritativeCreateSnapshot, options.clientCreateKey, true, true)
      ));
    const saveBlock = vi.fn<UseDraftBlockControllerOptions['saveBlock']>(async (block, text) => {
      durableText = text;
      return savedBlockOutcome(createdBlock(text || block.plain_text || ''));
    });
    const subject = renderHook(() => useDraftBlockController({
      ...makeOptions(),
      createBlock,
      note,
      saveBlock,
    }));

    act(() => {
      subject.result.current.activateDraft();
      subject.result.current.setDraftText('a');
    });
    await act(async () => {
      await subject.result.current.persistDraft('a');
    });
    act(() => subject.result.current.setDraftText('ab'));
    await act(async () => {
      await subject.result.current.persistDraft('ab');
    });

    expect(createBlock).toHaveBeenCalledTimes(2);
    expect(createBlock.mock.calls[1]?.[2]?.clientCreateKey)
      .toBe(createBlock.mock.calls[0]?.[2]?.clientCreateKey);
    expect(saveBlock).toHaveBeenCalledWith(
      expect.objectContaining({ id: authoritativeCreateSnapshot.id, plain_text: 'a' }),
      'ab',
      expect.objectContaining({ silent: true }),
    );
    // This models the truth observed after reload, not just the optimistic UI.
    expect(durableText).toBe('ab');
  });

  it('keeps placement pending local and retries only the durable placement', async () => {
    const block = createdBlock('placed later');
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>()
      .mockImplementation(async (_template, _text, options) => (
        draftCreateResult(block, options?.clientCreateKey, false)
      ));
    const saveDraftBlockPlacement = vi.fn<UseDraftBlockControllerOptions['saveDraftBlockPlacement']>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...block, canvas_layout: { ...defaultDraftLayout } });
    const setFocusBlockId = vi.fn();
    const subject = renderHook(() => useDraftBlockController({
      ...makeOptions(),
      createBlock,
      note,
      saveDraftBlockPlacement,
      setFocusBlockId,
    }));

    act(() => {
      subject.result.current.activateDraft();
      subject.result.current.setDraftText('placed later');
    });
    await act(async () => {
      await subject.result.current.persistDraft('placed later');
    });
    expect(subject.result.current.draftPhase).toBe('dirty');
    expect(subject.result.current.placementPending).toBe(true);

    await act(async () => {
      await subject.result.current.persistDraft('placed later');
    });
    expect(subject.result.current.placementPending).toBe(true);
    expect(setFocusBlockId).not.toHaveBeenCalled();

    await act(async () => {
      await subject.result.current.persistDraft('placed later');
    });
    expect(createBlock).toHaveBeenCalledTimes(1);
    expect(saveDraftBlockPlacement).toHaveBeenCalledTimes(2);
    expect(subject.result.current.placementPending).toBe(false);
    expect(setFocusBlockId).toHaveBeenCalledWith(block.id);
  });

  it('compensates a pending create that is cleared and discarded before its response', async () => {
    const createReceipt = deferred<DraftBlockCreateResult | null>();
    const block = createdBlock('pending');
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>(
      () => createReceipt.promise,
    );
    const discardDraftBlock = vi.fn(async () => true);
    const onDraftPersisted = vi.fn();
    const setFocusBlockId = vi.fn();
    const subject = renderHook(() => useDraftBlockController({
      ...makeOptions(),
      createBlock,
      discardDraftBlock,
      note,
      onDraftPersisted,
      setFocusBlockId,
    }));

    act(() => {
      subject.result.current.activateDraft();
      subject.result.current.setDraftText('pending');
      void subject.result.current.persistDraft('pending');
      subject.result.current.setDraftText('');
    });
    let discard!: Promise<void>;
    act(() => {
      discard = subject.result.current.discardDraft();
    });
    const clientCreateKey = createBlock.mock.calls[0]?.[2]?.clientCreateKey;
    await act(async () => {
      createReceipt.resolve(draftCreateResult(block, clientCreateKey));
      await discard;
    });

    expect(discardDraftBlock).toHaveBeenCalledWith(note.id, clientCreateKey);
    expect(subject.result.current.draftActive).toBe(false);
    expect(setFocusBlockId).not.toHaveBeenCalled();
    expect(onDraftPersisted).not.toHaveBeenCalled();
  });

  it('finishes a meaningful old-note snapshot without polluting the new note', async () => {
    const createReceipt = deferred<DraftBlockCreateResult | null>();
    const setFocusBlockId = vi.fn();
    const onDraftPersisted = vi.fn();
    const discardDraftBlock = vi.fn(async () => true);
    const finalizeDraftBlock = vi.fn(async () => true);
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>(
      () => createReceipt.promise,
    );
    const subject = renderHook(
      ({ currentNote }: { currentNote: Note }) => useDraftBlockController({
        ...makeOptions(),
        createBlock,
        discardDraftBlock,
        finalizeDraftBlock,
        note: currentNote,
        onDraftPersisted,
        setFocusBlockId,
      }),
      { initialProps: { currentNote: note } },
    );

    act(() => {
      subject.result.current.activateDraft();
      subject.result.current.setDraftText('old note text');
      void subject.result.current.persistDraft('old note text');
    });
    subject.rerender({ currentNote: { ...note, id: 'note-2' } });
    await act(async () => {
      createReceipt.resolve(draftCreateResult(
        createdBlock('old note text'),
        createBlock.mock.calls[0]?.[2]?.clientCreateKey,
      ));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(subject.result.current.draftActive).toBe(false);
    expect(subject.result.current.draftText).toBe('');
    expect(setFocusBlockId).not.toHaveBeenCalled();
    expect(onDraftPersisted).not.toHaveBeenCalled();
    expect(discardDraftBlock).not.toHaveBeenCalled();
    expect(finalizeDraftBlock).toHaveBeenCalledWith(expect.objectContaining({
      noteId: note.id,
      clientCreateKey: createBlock.mock.calls[0]?.[2]?.clientCreateKey,
      text: 'old note text',
    }));
  });

  it('keeps the visible primary Page authority immutable across stale selection, note switch, and reload', async () => {
    const pageFrame = createPrimaryPageFrame({ id: 'visible-primary' });
    const staleSelectedFrame = {
      ...createPrimaryPageFrame({ id: 'canvas-selected-secondary', x: 1000 }),
      role: 'secondary_page_frame' as const,
    };
    const pageFrameCollection = {
      pageFrames: [pageFrame, staleSelectedFrame],
      primaryFrameId: pageFrame.id,
      selectedFrameId: staleSelectedFrame.id,
    };
    const nextNotePageFrame = createPrimaryPageFrame({ id: 'note-2-page-frame', x: 500 });
    const createReceipt = deferred<DraftBlockCreateResult | null>();
    const createBlock = vi.fn<UseDraftBlockControllerOptions['createBlock']>(
      () => createReceipt.promise,
    );
    const finalizeDraftBlock = vi.fn(async () => true);
    const subject = renderHook(
      ({ currentNote, currentPageFrame }: {
        currentNote: Note;
        currentPageFrame: typeof pageFrame;
      }) => useDraftBlockController({
        ...makeOptions(),
        canonicalizeDraftLayout: createPageFrameDraftSessionAuthority(
          currentPageFrame,
          96,
        ).canonicalizeLayout,
        createBlock,
        finalizeDraftBlock,
        note: currentNote,
      }),
      { initialProps: { currentNote: note, currentPageFrame: pageFrame } },
    );

    const sessionAuthority = resolvePageDraftSessionAuthority({
      collection: pageFrameCollection,
      layout: defaultDraftLayout,
      selectedFrameId: staleSelectedFrame.id,
      pageOffsetX: 96,
    });
    expect(sessionAuthority?.frameId).toBe(pageFrame.id);

    act(() => {
      subject.result.current.activateDraft(
        undefined,
        sessionAuthority || undefined,
      );
      subject.result.current.setDraftText('pending Page text');
      void subject.result.current.persistDraft('pending Page text');
    });
    expect(createBlock).toHaveBeenCalledWith(
      defaultTextTemplate,
      'pending Page text',
      expect.objectContaining({
        layout: expect.objectContaining({
          frame_id: pageFrame.id,
          coordinate_space: 'canvas_world',
          surface_authority: expect.objectContaining({
            pageBoundary: expect.objectContaining({ frameId: pageFrame.id }),
          }),
        }),
      }),
    );
    subject.rerender({
      currentNote: { ...note, id: 'note-2' },
      currentPageFrame: nextNotePageFrame,
    });

    const [storedReceipt] = listDraftRecoveryReceipts();
    expect(storedReceipt).toEqual(expect.objectContaining({
      noteId: note.id,
      text: 'pending Page text',
      layout: expect.objectContaining({
        x: pageFrame.x + pageFrame.contentInset.left,
        y: pageFrame.y + pageFrame.contentInset.top,
        surface: 'formal_page',
        coordinate_space: 'canvas_world',
        frame_id: pageFrame.id,
      }),
    }));

    const replayedPlacement = vi.fn(async () => undefined);
    const replay = vi.fn(async (receipt: DraftRecoveryReceipt) => {
      await finalizeDraftRecoveryReceipt(receipt, {
        createOrReuse: async () => createdBlock('pending Page text'),
        savePlacement: replayedPlacement,
        saveLatest: async () => undefined,
      });
      return true;
    });
    await replayDraftRecoveryReceipts(
      listDraftRecoveryReceipts(),
      replay,
      forgetDraftRecoveryReceipt,
    );
    expect(replay).toHaveBeenCalledWith(expect.objectContaining({
      layout: expect.objectContaining({
        surface: 'formal_page',
        coordinate_space: 'canvas_world',
        frame_id: pageFrame.id,
      }),
    }));
    expect(replayedPlacement).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'block-1' }),
      expect.objectContaining({
        layout: expect.objectContaining({
          surface: 'formal_page',
          coordinate_space: 'canvas_world',
          frame_id: pageFrame.id,
        }),
      }),
    );
    expect(listDraftRecoveryReceipts()).toEqual([]);

    await act(async () => {
      createReceipt.resolve(draftCreateResult(
        createdBlock('pending Page text'),
        createBlock.mock.calls[0]?.[2]?.clientCreateKey,
      ));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(finalizeDraftBlock).toHaveBeenCalledWith(expect.objectContaining({
      layout: expect.objectContaining({
        surface: 'formal_page',
        coordinate_space: 'canvas_world',
        frame_id: pageFrame.id,
      }),
    }));
  });
});
