import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TemplateOption } from '@/services/templateOptions';
import { loadDraftRecoveryQueue, type DraftBlockCreateResult } from '../draftBlockPersistence';
import { createPrimaryPageFrame, createViewport } from '../engineModel';
import { createSurfaceModePolicy } from '../modePolicyService';
import { getPageFrameContentRect } from '../pageFrameService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { Note, NoteBlock } from '../runtimeDataTypes';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import type { PageFrameCollectionModel, PageFrameModel } from '../types';
import {
  useRuntimeNaturalWritingController,
  type UseRuntimeNaturalWritingControllerOptions,
} from './useRuntimeNaturalWritingController';

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
    saveBlock: vi.fn(async () => null),
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

describe('useRuntimeNaturalWritingController Page draft authority', () => {
  beforeEach(() => sessionStorage.clear());

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
    const saveBlock = vi.fn(async () => null);
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
