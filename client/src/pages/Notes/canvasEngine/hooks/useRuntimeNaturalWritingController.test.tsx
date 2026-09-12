import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NOTE_SLASH_COMMANDS } from '../../noteSlashCommands';
import type { TemplateOption } from '@/services/templateOptions';
import { loadDraftRecoveryQueue, type DraftBlockCreateResult } from '../draftBlockPersistence';
import { createPrimaryPageFrame, createViewport } from '../engineModel';
import { createNotePagePresetSeed } from '../notePagePresetService';
import { createSurfaceModePolicy } from '../modePolicyService';
import { getPageFrameContentRect } from '../pageFrameService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { AnnotationTruthV1, Note, NoteBlock } from '../runtimeDataTypes';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import type { TextFocusReceipt } from '../textFocusReceipt';
import type { PageFrameCollectionModel, PageFrameModel } from '../types';
import {
  useRuntimeNaturalWritingController,
  type UseRuntimeNaturalWritingControllerOptions,
} from './useRuntimeNaturalWritingController';
import { useBlockDraftAuthority } from './useBlockDraftAuthority';
import { useBlockTextFlowEditController } from './useBlockTextFlowEditController';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';
import { useSlashBlockRollbackController } from './useSlashBlockRollbackController';

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

const note: Note = {
  id: 'note-1',
  course_id: 'project-1',
  title: 'Runtime authority',
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function frame(id: string, y: number, role: PageFrameModel['role']): PageFrameModel {
  return {
    ...createPrimaryPageFrame({ id, y }),
    role,
  };
}

function collectionWithFrames(pageFrames: PageFrameModel[]): PageFrameCollectionModel {
  return {
    pageFrames,
    pageStacks: [{
      id: 'stack-a',
      displayName: 'Stack A',
      frameIds: pageFrames.map((pageFrame) => pageFrame.id),
      primaryFrameId: pageFrames[0]?.id || null,
      selectedFrameId: pageFrames[0]?.id || null,
      collapsed: false,
      numbering: { enabled: true, startAt: 1 },
      layout: { direction: 'vertical', gap: 80, collapsedPreviewPages: 1 },
      createdFrom: 'a4_note_seed',
    }],
    primaryFrameId: pageFrames[0]?.id || null,
    primaryStackId: 'stack-a',
    selectedFrameId: pageFrames[0]?.id || null,
    selectedStackId: 'stack-a',
  };
}

function makeRuntimeOptions(
  overrides: Partial<UseRuntimeNaturalWritingControllerOptions> = {},
): UseRuntimeNaturalWritingControllerOptions {
  return {
    addToast: vi.fn(),
    applyTemplateToBlock: vi.fn(async () => null),
    blockListRef: { current: null },
    blocks: [],
    blockTextDrafts: {},
    blockTextFlowDrafts: {},
    clearBlockSelection: vi.fn(),
    contentWidth: 760,
    createBlock: vi.fn(async () => null),
    defaultDraftLayout: { x: 0, y: 0, width: 760, height: 72 },
    defaultTextTemplate,
    discardDraftBlock: vi.fn(async () => true),
    finalizeDraftBlock: vi.fn(async () => false),
    focusedTextOwner: null,
    insertTemplateOptions: [defaultTextTemplate],
    note,
    onDraftFocusReceipt: vi.fn(),
    pageOffsetX: 96,
    rollbackBlockSlashSession: ({ fallbackText }) => ({
      applied: false,
      text: fallbackText || '',
      focus: null,
    }),
    saveBlock: vi.fn(async () => rejectedBlockOutcome()),
    saveDraftBlockPlacement: vi.fn(async (block) => block),
    setActiveBlockId: vi.fn(),
    setBlockTextDrafts: vi.fn(),
    setBlockTextFlowDrafts: vi.fn(),
    setFocusBlockId: vi.fn(),
    setInteractionState: vi.fn(),
    setSelectedBlockId: vi.fn(),
    snapEnabled: true,
    surfacePolicy: createSurfaceModePolicy('page'),
    templateOptions: [defaultTextTemplate],
    viewportTransform: createViewport(),
    ...overrides,
  };
}

function annotationForDurableText(input: {
  endOffset: number;
  rangeText: string;
}): AnnotationTruthV1 {
  return {
    id: 'annotation-durable-1',
    note_id: note.id,
    canvas_id: 'canvas-1',
    raw_label: 'durable suffix',
    ranges: [{
      id: 'range-durable-1',
      target_kind: 'text_span',
      block_id: 'block-1',
      text_flow_id: 'textflow-block-1',
      text_unit_id: 'tu-1',
      start_offset: 6,
      end_offset: input.endOffset,
      range_text_cache: input.rangeText,
    }],
    parent_annotation_id: null,
    child_annotation_ids: [],
    visual_style: { color_token: 'yellow', marker_kind: 'highlight' },
    created_by: 'human',
    status: 'active',
    created_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-20T00:00:00.000Z',
  };
}

async function renderReconciledSlashRuntime(input: {
  text: string;
  caret: number;
  annotations?: AnnotationTruthV1[];
}) {
  const primary = frame('slash-durable-primary', 0, 'primary_page_frame');
  const durableBlock = createdBlock(input.text);
  const createBlock = vi.fn<UseRuntimeNaturalWritingControllerOptions['createBlock']>(
    async (_template, _text, createOptions) => ({
      block: durableBlock,
      clientCreateKey: createOptions.clientCreateKey || 'missing-create-key',
      placementPersisted: true,
      reused: false,
    }),
  );
  let durableSnapshot = durableBlock;
  const saveBlock = vi.fn<UseRuntimeNaturalWritingControllerOptions['saveBlock']>(
    async (block, text, options) => {
      durableSnapshot = {
        ...block,
        content_json: options?.textFlow
          ? { ...block.content_json, body: text, [TEXT_FLOW_CONTENT_KEY]: options.textFlow }
          : { ...block.content_json, body: text },
        plain_text: text,
      };
      return savedBlockOutcome(durableSnapshot);
    },
  );
  const annotationSaveCalls: AnnotationTruthV1[][] = [];
  const setInteractionState = vi.fn();
  const blockList = document.createElement('div');
  const draftTextarea = document.createElement('textarea');
  blockList.append(draftTextarea);
  document.body.append(blockList);
  const initialFlow = createTextBlockContentV1(input.text, 'paragraph');
  const subject = renderHook(
    ({ focusedTextOwner }: { focusedTextOwner: TextFocusReceipt | null }) => {
      const [blocks, setBlocks] = useState<NoteBlock[]>([]);
      const [annotations, setAnnotations] = useState(input.annotations || []);
      const draftAuthority = useBlockDraftAuthority({
        textDrafts: { [durableBlock.id]: input.text },
        textFlowDrafts: { [durableBlock.id]: initialFlow },
        fieldDrafts: {},
      });
      const applyBlockTextFlowEdit = useBlockTextFlowEditController({
        annotationTruths: annotations,
        blockTextFlowDrafts: draftAuthority.blockTextFlowDrafts,
        saveAnnotationTruths: (next) => {
          annotationSaveCalls.push(next);
          setAnnotations(next);
        },
        setBlockTextFlowDrafts: draftAuthority.setBlockTextFlowDrafts,
      });
      const rollbackBlockSlashSession = useSlashBlockRollbackController({
        applyBlockTextFlowEdit,
        blocks,
        readBlockDraftSnapshot: draftAuthority.readBlockDraftSnapshot,
        saveBlock,
        setBlockFieldDrafts: draftAuthority.setBlockFieldDrafts,
        setBlockTextDrafts: draftAuthority.setBlockTextDrafts,
      });
      const runtime = useRuntimeNaturalWritingController(makeRuntimeOptions({
        blockListRef: { current: blockList },
        blocks,
        blockTextDrafts: draftAuthority.blockTextDrafts,
        blockTextFlowDrafts: draftAuthority.blockTextFlowDrafts,
        createBlock,
        focusedTextOwner,
        onDraftPersisted: (persisted) => setBlocks([persisted]),
        pageFrameCollection: collectionWithFrames([primary]),
        rollbackBlockSlashSession,
        saveBlock,
        selectedPageFrameId: primary.id,
        setBlockTextDrafts: draftAuthority.setBlockTextDrafts,
        setBlockTextFlowDrafts: draftAuthority.setBlockTextFlowDrafts,
        setInteractionState,
      }));
      return {
        ...runtime,
        annotations,
        blocks,
        blockTextDrafts: draftAuthority.blockTextDrafts,
        blockTextFlowDrafts: draftAuthority.blockTextFlowDrafts,
        setBlocks,
      };
    },
    { initialProps: { focusedTextOwner: null as TextFocusReceipt | null } },
  );

  act(() => subject.result.current.activateDraft());
  const draftOwner = subject.result.current.draftFocusReceipt;
  subject.rerender({ focusedTextOwner: draftOwner });
  draftTextarea.value = input.text;
  draftTextarea.dataset.blockId = draftOwner.blockId;
  draftTextarea.dataset.textFlowId = draftOwner.textFlowId;
  draftTextarea.dataset.textUnitId = draftOwner.textUnitId;
  draftTextarea.setSelectionRange(input.caret, input.caret);

  act(() => {
    subject.result.current.handleDraftChange(input.text, input.caret, draftTextarea);
  });
  await waitFor(() => expect(subject.result.current.draftOwnerReconciliation).toMatchObject({
    from: draftOwner,
    to: { blockId: durableBlock.id },
  }));

  const reconciliation = subject.result.current.draftOwnerReconciliation;
  if (!reconciliation) throw new Error('durable reconciliation fixture missing');
  act(() => subject.result.current.handleDurableFocusReceipt(reconciliation.to));
  subject.rerender({ focusedTextOwner: reconciliation.to });
  const durableTextarea = document.createElement('textarea');
  durableTextarea.value = input.text;
  durableTextarea.dataset.blockId = reconciliation.to.blockId;
  durableTextarea.dataset.textFlowId = reconciliation.to.textFlowId;
  durableTextarea.dataset.textUnitId = reconciliation.to.textUnitId;
  durableTextarea.setSelectionRange(input.caret, input.caret);
  blockList.append(durableTextarea);

  return {
    annotationSaveCalls,
    durableBlock,
    durableTextarea,
    readDurableBlock: () => durableSnapshot,
    reconciliation,
    saveBlock,
    setInteractionState,
    subject,
  };
}

describe('useRuntimeNaturalWritingController Page draft authority', () => {
  beforeEach(() => sessionStorage.clear());

  it('routes a Slash role edit through TextFlow history with the original unit and selection', async () => {
    const flow = createTextBlockContentV1('first', 'paragraph');
    flow.units.push({ ...flow.units[0]!, id: 'tu-2', text: 'second /hea' });
    const text = 'first\nsecond /hea';
    const block = { ...createdBlock(text), content_json: { [TEXT_FLOW_CONTENT_KEY]: flow } };
    const editor = document.createElement('textarea');
    editor.value = 'second /hea';
    editor.dataset.blockId = block.id;
    editor.dataset.textFlowId = 'textflow-block-1';
    editor.dataset.textUnitId = 'tu-2';
    editor.setSelectionRange(11, 11);
    const calls: string[] = [];
    const directFlowSetter = vi.fn();
    const applyEdit = vi.fn<NonNullable<UseRuntimeNaturalWritingControllerOptions['applyBlockTextFlowEdit']>>(async () => {
      calls.push('history');
      return { success: true, beforeAnnotationRanges: [], afterAnnotationRanges: [] };
    });
    const saveBlock = vi.fn(async () => { calls.push('save'); return savedBlockOutcome(block); });
    const subject = renderHook(() => useRuntimeNaturalWritingController(makeRuntimeOptions({
      blocks: [block], blockTextDrafts: { [block.id]: text }, blockTextFlowDrafts: { [block.id]: flow },
      focusedTextOwner: { blockId: block.id, textFlowId: 'textflow-block-1', textUnitId: 'tu-2' },
      applyBlockTextFlowEdit: applyEdit,
      beforeTextStructure: () => { calls.push('boundary'); return true; },
      setBlockTextFlowDrafts: directFlowSetter,
      saveBlock,
    })));
    act(() => subject.result.current.handleBlockTextChange(block.id, text, text.length, editor));
    await act(async () => {
      await subject.result.current.handleSelectSlashCommand(NOTE_SLASH_COMMANDS.find((command) => command.id === 'heading')!);
    });
    expect(calls).toEqual(['boundary', 'history', 'save']);
    expect(directFlowSetter).not.toHaveBeenCalled();
    expect(applyEdit).toHaveBeenCalledWith(block, expect.objectContaining({
      units: [flow.units[0], expect.objectContaining({ id: 'tu-2', text: 'second', writing_role: 'heading' })],
    }), expect.objectContaining({
      previousTextFlow: flow,
      metadata: expect.objectContaining({
        kind: 'structural', unitId: 'tu-2',
        beforeSelection: { unitId: 'tu-2', start: 11, end: 11 },
        afterSelection: { unitId: 'tu-2', start: 6, end: 6 },
      }),
    }));
  });

  it('blocks mouse Slash commit before role or template mutation while the text boundary is closed', async () => {
    const block = createdBlock('text /hea');
    const applyEdit = vi.fn(async () => undefined);
    const applyTemplateToBlock = vi.fn(async () => null);
    const saveBlock = vi.fn(async () => savedBlockOutcome(block));
    const setBlockTextFlowDrafts = vi.fn();
    const subject = renderHook(() => useRuntimeNaturalWritingController(makeRuntimeOptions({
      blocks: [block], blockTextDrafts: { [block.id]: 'text /hea' },
      focusedTextOwner: { blockId: block.id, textFlowId: 'textflow-block-1', textUnitId: 'tu-1' },
      applyBlockTextFlowEdit: applyEdit, beforeTextStructure: () => false,
      applyTemplateToBlock, saveBlock, setBlockTextFlowDrafts,
    })));
    act(() => subject.result.current.handleBlockTextChange(block.id, 'text /hea', 9));
    await act(async () => {
      await subject.result.current.handleSelectSlashCommand(NOTE_SLASH_COMMANDS.find((command) => command.id === 'heading')!);
      await subject.result.current.handleSelectSlashCommand(NOTE_SLASH_COMMANDS.find((command) => command.id === 'formula')!);
    });
    expect(applyEdit).not.toHaveBeenCalled();
    expect(applyTemplateToBlock).not.toHaveBeenCalled();
    expect(saveBlock).not.toHaveBeenCalled();
    expect(setBlockTextFlowDrafts).not.toHaveBeenCalled();
    expect(subject.result.current.slashTarget).not.toBeNull();
  });

  it('corrects a held stale create after draft Slash rollback before durable reconciliation', async () => {
    const primary = frame('slash-draft-primary', 0, 'primary_page_frame');
    const createAttempt = deferred<DraftBlockCreateResult | null>();
    const createBlock = vi.fn<UseRuntimeNaturalWritingControllerOptions['createBlock']>(
      () => createAttempt.promise,
    );
    let durableSnapshot: NoteBlock | null = null;
    const saveBlock = vi.fn(async (_block: NoteBlock, text: string) => {
      durableSnapshot = createdBlock(text);
      return savedBlockOutcome(durableSnapshot);
    });
    const onDraftPersisted = vi.fn();
    const stableOptions = makeRuntimeOptions({
      createBlock,
      onDraftPersisted,
      pageFrameCollection: collectionWithFrames([primary]),
      saveBlock,
      selectedPageFrameId: primary.id,
    });
    const subject = renderHook(
      ({ focusedTextOwner }: { focusedTextOwner: TextFocusReceipt | null }) => (
        useRuntimeNaturalWritingController({
          ...stableOptions,
          focusedTextOwner,
        })
      ),
      { initialProps: { focusedTextOwner: null as TextFocusReceipt | null } },
    );

    act(() => subject.result.current.activateDraft());
    const draftOwner = subject.result.current.draftFocusReceipt;
    subject.rerender({ focusedTextOwner: draftOwner });

    const textarea = document.createElement('textarea');
    textarea.value = 'draft /hea';
    textarea.dataset.blockId = draftOwner.blockId;
    textarea.dataset.textFlowId = draftOwner.textFlowId;
    textarea.dataset.textUnitId = draftOwner.textUnitId;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    act(() => {
      subject.result.current.handleDraftChange('draft /hea', textarea.value.length, textarea);
    });

    expect(subject.result.current.draftText).toBe('draft /hea');
    expect(subject.result.current.slashTarget).toMatchObject({ target: 'draft' });
    expect(createBlock).toHaveBeenCalledTimes(1);
    expect(saveBlock).not.toHaveBeenCalled();

    act(() => {
      subject.result.current.handleDraftKeyDown({
        key: 'Escape',
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        defaultPrevented: false,
        preventDefault() {
          Object.defineProperty(this, 'defaultPrevented', { value: true, configurable: true });
        },
      } as never);
    });

    expect(subject.result.current.draftText).toBe('draft ');
    expect(subject.result.current.slashTarget).toBeNull();
    expect(saveBlock).not.toHaveBeenCalled();

    const staleCreateSnapshot = createdBlock('draft /hea');
    durableSnapshot = staleCreateSnapshot;
    const createOptions = createBlock.mock.calls[0]?.[2];
    expect(createOptions?.clientCreateKey).toEqual(expect.any(String));
    if (!createOptions?.clientCreateKey) throw new Error('create receipt key was not captured');
    await act(async () => {
      createAttempt.resolve({
        block: staleCreateSnapshot,
        clientCreateKey: createOptions.clientCreateKey,
        placementPersisted: true,
        reused: false,
      });
      await createAttempt.promise;
    });

    await waitFor(() => expect(saveBlock).toHaveBeenCalledTimes(1));
    expect(saveBlock).toHaveBeenCalledWith(
      expect.objectContaining({ plain_text: 'draft /hea' }),
      'draft',
      expect.objectContaining({
        silent: true,
        textFlow: expect.objectContaining({
          units: [expect.objectContaining({ text: 'draft' })],
        }),
      }),
    );
    expect(durableSnapshot).toMatchObject({ plain_text: 'draft' });
    expect(JSON.stringify(durableSnapshot)).not.toContain('/hea');
    expect(onDraftPersisted).toHaveBeenCalledWith(expect.objectContaining({ plain_text: 'draft' }));

    await waitFor(() => expect(subject.result.current.draftOwnerReconciliation).toMatchObject({
      from: draftOwner,
      to: { blockId: staleCreateSnapshot.id },
    }));
    const reconciliation = subject.result.current.draftOwnerReconciliation;
    if (!reconciliation) throw new Error('draft reconciliation fixture missing');
    act(() => subject.result.current.handleDurableFocusReceipt(reconciliation.to));
    expect(subject.result.current.draftActive).toBe(false);
    expect(subject.result.current.draftText).toBe('');
  });

  it('keeps Escape rollback reachable after draft owner reconciles to a durable block', async () => {
    const runtime = await renderReconciledSlashRuntime({
      text: 'draft /hea',
      caret: 'draft /hea'.length,
    });
    let prevented = false;
    const escapeEvent = {
      key: 'Escape',
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      defaultPrevented: false,
      preventDefault() {
        prevented = true;
        Object.defineProperty(this, 'defaultPrevented', { value: true, configurable: true });
      },
    } as never;
    act(() => {
      runtime.subject.result.current.handleBlockKeyDown(
        runtime.durableBlock,
        'draft /hea',
        escapeEvent,
      );
    });

    expect(prevented).toBe(true);
    expect(runtime.subject.result.current.slashTarget).toBeNull();
    expect(runtime.setInteractionState).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'openingMenu',
      target: 'block',
      blockId: runtime.reconciliation.to.blockId,
      textFlowId: runtime.reconciliation.to.textFlowId,
      textUnitId: runtime.reconciliation.to.textUnitId,
    }));
    expect(runtime.subject.result.current.blockTextDrafts[runtime.durableBlock.id]).toBe('draft ');
    expect(
      runtime.subject.result.current.blockTextFlowDrafts[runtime.durableBlock.id]?.units[0]?.text,
    ).toBe('draft ');
    expect(JSON.stringify(runtime.subject.result.current.blockTextFlowDrafts)).not.toContain('/hea');
    await waitFor(() => expect(runtime.saveBlock).toHaveBeenCalledTimes(1));
    expect(runtime.saveBlock).toHaveBeenCalledWith(
      runtime.durableBlock,
      'draft ',
      expect.objectContaining({
        silent: true,
        textFlow: expect.objectContaining({
          units: [expect.objectContaining({ text: 'draft ' })],
        }),
      }),
    );
    expect(runtime.readDurableBlock().plain_text).toBe('draft ');
    expect(JSON.stringify(runtime.readDurableBlock())).not.toContain('/hea');
  });

  it.each([
    ['disabled', 'inline-formula', false],
    ['annotation', 'definition', false],
    ['missing template', 'formula', false],
    ['missing block', 'heading', true],
  ] as const)(
    'keeps reconciled %s rollback on the durable TextFlow and annotation inverse',
    async (_label, commandId, removeBlock) => {
      const runtime = await renderReconciledSlashRuntime({
        text: 'draft /heabeta',
        caret: 'draft /hea'.length,
        annotations: [annotationForDurableText({ endOffset: 14, rangeText: '/heabeta' })],
      });
      const command = NOTE_SLASH_COMMANDS.find((candidate) => candidate.id === commandId);
      if (!command) throw new Error(`${commandId} Slash command fixture missing`);
      if (removeBlock) {
        act(() => runtime.subject.result.current.setBlocks([]));
      }

      await act(async () => {
        await runtime.subject.result.current.handleSelectSlashCommand(command);
      });

      expect(runtime.subject.result.current.slashTarget).toBeNull();
      expect(runtime.subject.result.current.blockTextDrafts[runtime.durableBlock.id]).toBe('draft beta');
      expect(
        runtime.subject.result.current.blockTextFlowDrafts[runtime.durableBlock.id]?.units[0]?.text,
      ).toBe('draft beta');
      expect(runtime.subject.result.current.annotations[0]?.ranges[0]).toMatchObject({
        block_id: runtime.reconciliation.to.blockId,
        text_flow_id: runtime.reconciliation.to.textFlowId,
        text_unit_id: runtime.reconciliation.to.textUnitId,
        start_offset: 6,
        end_offset: 10,
        range_text_cache: 'beta',
      });
      expect(runtime.annotationSaveCalls).toHaveLength(1);
      expect(JSON.stringify(runtime.subject.result.current.blockTextFlowDrafts)).not.toContain('/hea');
      if (removeBlock) {
        expect(runtime.saveBlock).not.toHaveBeenCalled();
      } else {
        await waitFor(() => expect(runtime.saveBlock).toHaveBeenCalledTimes(1));
        expect(runtime.readDurableBlock().plain_text).toBe('draft beta');
        expect(JSON.stringify(runtime.readDurableBlock())).not.toContain('/hea');
      }
    },
  );

  it('captures visible primary authority despite stale Canvas selection and keeps it across note switch', async () => {
    const primary = frame('visible-primary', 0, 'primary_page_frame');
    const staleSecondary = frame('canvas-selected-secondary', primary.height + 80, 'secondary_page_frame');
    const initialCollection: PageFrameCollectionModel = {
      ...collectionWithFrames([primary, staleSecondary]),
      selectedFrameId: staleSecondary.id,
      pageStacks: collectionWithFrames([primary, staleSecondary]).pageStacks?.map((stack) => ({
        ...stack,
        selectedFrameId: staleSecondary.id,
      })),
    };
    const createAttempt = deferred<DraftBlockCreateResult | null>();
    const createBlock = vi.fn(() => createAttempt.promise);
    const finalizeDraftBlock = vi.fn(async () => false);
    const stableOptions = makeRuntimeOptions({ createBlock, finalizeDraftBlock });
    const subject = renderHook(
      ({ currentNote, collection }: { currentNote: Note; collection: PageFrameCollectionModel }) => (
        useRuntimeNaturalWritingController({
          ...stableOptions,
          note: currentNote,
          pageFrameCollection: collection,
          selectedPageFrameId: collection.selectedFrameId,
        })
      ),
      { initialProps: { currentNote: note, collection: initialCollection } },
    );

    act(() => {
      subject.result.current.activateDraft();
      subject.result.current.handleDraftChange('pending Page text', 17);
    });

    const primaryRect = getPageFrameContentRect(primary);
    expect(createBlock).toHaveBeenCalledWith(
      defaultTextTemplate,
      'pending Page text',
      expect.objectContaining({
        layout: expect.objectContaining({
          x: primaryRect.x,
          y: primaryRect.y,
          frame_id: primary.id,
          coordinate_space: 'canvas_world',
          surface_authority: expect.objectContaining({
            pageBoundary: {
              left: primaryRect.x,
              right: primaryRect.x + primaryRect.width,
              frameId: primary.id,
            },
          }),
        }),
      }),
    );

    const nextPrimary = frame('note-2-primary', 0, 'primary_page_frame');
    subject.rerender({
      currentNote: { ...note, id: 'note-2' },
      collection: collectionWithFrames([nextPrimary]),
    });

    const queue = loadDraftRecoveryQueue();
    expect(queue.blocked).toEqual([]);
    expect(queue.replayable).toEqual([expect.objectContaining({
      version: 2,
      noteId: note.id,
      text: 'pending Page text',
      layout: expect.objectContaining({
        x: primaryRect.x,
        y: primaryRect.y,
        frame_id: primary.id,
        coordinate_space: 'canvas_world',
        surface_authority: expect.objectContaining({
          pageBoundary: expect.objectContaining({ frameId: primary.id }),
        }),
      }),
    })]);

    await act(async () => {
      createAttempt.resolve(null);
      await createAttempt.promise;
      await Promise.resolve();
    });
  });

  it('keeps a new Web draft beyond the bottom on the same frame without a collection write', async () => {
    const collection = createNotePagePresetSeed('screen_note');
    const createBlock = vi.fn(async () => null);
    const saveCollection = vi.fn();
    const subject = renderHook(() => useRuntimeNaturalWritingController(makeRuntimeOptions({
      note: { ...note, page_format: 'screen_note' },
      coordinateContract: 'v2', pageFrameCollection: collection,
      defaultDraftLayout: { x: 0, y: 7000, width: 992, height: 100,
        frame_id: collection.primaryFrameId!, coordinate_space: 'page_frame_local', surface: 'formal_page' },
      createBlock, onSavePageFrameCollection: saveCollection,
    })));
    act(() => subject.result.current.activateDraft());
    await act(async () => {
      subject.result.current.handleDraftChange('Web continuation', 16);
      await Promise.resolve();
    });
    expect(saveCollection).not.toHaveBeenCalled();
    expect(createBlock).toHaveBeenCalledWith(defaultTextTemplate, 'Web continuation', expect.objectContaining({
      layout: expect.objectContaining({ frame_id: collection.primaryFrameId, y: 7048, coordinate_space: 'canvas_world' }),
    }));
    expect(collection.pageFrames).toHaveLength(1);
  });

  it.each([
    { mode: 'existing' as const },
    { mode: 'append' as const },
  ])('persists the PageStack $mode target from the old render closure with one world projection', async ({ mode }) => {
    const pageOffsetX = 96;
    const frameA = frame('owner-frame-a', 0, 'primary_page_frame');
    const frameB = frame('target-frame-b', frameA.height + 80, 'secondary_page_frame');
    const input = collectionWithFrames(mode === 'existing' ? [frameA, frameB] : [frameA]);
    const contentRectA = getPageFrameContentRect(frameA);
    const createBlock = vi.fn(async () => null);
    const onSavePageFrameCollection = vi.fn();
    const onFocusPageFrame = vi.fn();
    const subject = renderHook(() => useRuntimeNaturalWritingController(makeRuntimeOptions({
      createBlock,
      defaultDraftLayout: {
        x: 0,
        y: contentRectA.y + contentRectA.height - 20,
        width: 540,
        height: 80,
      },
      onFocusPageFrame,
      onSavePageFrameCollection,
      pageFrameCollection: input,
      pageOffsetX,
      selectedPageFrameId: frameA.id,
    })));

    act(() => subject.result.current.activateDraft());
    await act(async () => {
      subject.result.current.handleDraftChange('overflowing draft', 17);
      await Promise.resolve();
    });

    expect(onSavePageFrameCollection).toHaveBeenCalledTimes(1);
    const savedCollection = onSavePageFrameCollection.mock.calls[0]?.[0] as PageFrameCollectionModel;
    const targetFrame = savedCollection.pageFrames.find((candidate) => (
      candidate.id === savedCollection.selectedFrameId
    ));
    expect(targetFrame).toBeTruthy();
    expect(targetFrame?.id).not.toBe(frameA.id);
    if (mode === 'existing') expect(targetFrame?.id).toBe(frameB.id);
    else expect(input.pageFrames.some((candidate) => candidate.id === targetFrame?.id)).toBe(false);
    expect(onFocusPageFrame).toHaveBeenCalledWith(expect.objectContaining({ id: targetFrame?.id }));

    const targetRect = getPageFrameContentRect(targetFrame!);
    expect(createBlock).toHaveBeenCalledWith(
      defaultTextTemplate,
      'overflowing draft',
      expect.objectContaining({
        layout: expect.objectContaining({
          x: targetRect.x,
          y: targetRect.y,
          frame_id: targetFrame?.id,
          coordinate_space: 'canvas_world',
          surface_authority: expect.objectContaining({
            pageBoundary: {
              left: targetRect.x,
              right: targetRect.x + targetRect.width,
              frameId: targetFrame?.id,
            },
          }),
        }),
      }),
    );
  });

  it.each([
    {
      label: 'missing frame',
      layout: { ...({ x: 0, y: 0, width: 540, height: 80 } satisfies BlockBoxLayout), frame_id: 'missing-frame' },
    },
    {
      label: 'conflicting frame and boundary',
      layout: {
        x: 0,
        y: 0,
        width: 540,
        height: 80,
        frame_id: 'owner-frame-a',
        surface_authority: {
          coordinateSpace: 'canvas_world' as const,
          pageBoundary: { left: 0, right: 540, frameId: 'target-frame-b' },
        },
      },
    },
  ])('fails closed without activation or persistence for $label authority', async ({ layout }) => {
    const frameA = frame('owner-frame-a', 0, 'primary_page_frame');
    const frameB = frame('target-frame-b', frameA.height + 80, 'secondary_page_frame');
    const createBlock = vi.fn(async () => null);
    const finalizeDraftBlock = vi.fn(async () => false);
    const saveBlock = vi.fn(async () => rejectedBlockOutcome());
    const saveDraftBlockPlacement = vi.fn(async (block: NoteBlock) => block);
    const subject = renderHook(() => useRuntimeNaturalWritingController(makeRuntimeOptions({
      createBlock,
      finalizeDraftBlock,
      pageFrameCollection: collectionWithFrames([frameA, frameB]),
      saveBlock,
      saveDraftBlockPlacement,
      selectedPageFrameId: frameA.id,
    })));

    act(() => {
      subject.result.current.activateDraft(layout);
      subject.result.current.handleDraftChange('must not persist', 16);
    });
    await act(async () => Promise.resolve());

    expect(subject.result.current.draftActive).toBe(false);
    expect(createBlock).not.toHaveBeenCalled();
    expect(saveDraftBlockPlacement).not.toHaveBeenCalled();
    expect(saveBlock).not.toHaveBeenCalled();
    expect(finalizeDraftBlock).not.toHaveBeenCalled();
    expect(loadDraftRecoveryQueue()).toEqual({ replayable: [], blocked: [] });
  });
});
