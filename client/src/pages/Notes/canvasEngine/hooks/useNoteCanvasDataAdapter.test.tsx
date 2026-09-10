import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnnotationTruthV1, Note, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import type { BoardTextRangeV1 } from '../../../../../../shared/types/boardTextRange';
import {
  DRAFT_RECOVERY_STORAGE_KEY_V1,
  DRAFT_RECOVERY_STORAGE_KEY_V2,
  createBlockEditRecoveryKey,
  listBlockEditRecoveryReceipts,
} from '../draftBlockPersistence';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import * as canvasObjectRepository from '../canvasObjectRepository';
import { normalizePageFrameCollection } from '../pageFrameCollectionService';
import { resolveScreenRect } from '../placementContractService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { PageFrameCollectionModel } from '../types';
import { useDraftBlockController } from './useDraftBlockController';
import {
  useNoteCanvasDataAdapter,
  type BlockSaveOutcome,
  type PersistCanvasObjectInput,
} from './useNoteCanvasDataAdapter';

const mocks = vi.hoisted(() => ({
  coordinateContract: 'v1' as 'v1' | 'v2',
  addToast: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  boardRangesGet: vi.fn(),
  boardRangesPut: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  default: {
    get: (url: string, ...args: unknown[]) => url.startsWith('/boards/text-ranges/by-note/')
      ? mocks.boardRangesGet(url, ...args)
      : url === '/canvas-objects/coordinate-contract'
      ? Promise.resolve({ data: { coordinate_contract: mocks.coordinateContract } })
      : mocks.get(url, ...args),
    post: mocks.post,
    put: (url: string, ...args: unknown[]) => url.startsWith('/boards/text-ranges/by-note/')
      ? mocks.boardRangesPut(url, ...args)
      : mocks.put(url, ...args),
    delete: mocks.delete,
  },
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (state: { addToast: typeof mocks.addToast }) => unknown) => (
    selector({ addToast: mocks.addToast })
  ),
}));

const note: Note = {
  id: 'note-1',
  course_id: '',
  title: 'Adapter seam',
  description: null,
  status: 'active',
  metadata: {},
};

const stableAdapterOptions = {
  noteId: note.id,
  onNoteLoaded: vi.fn(),
  clearLayoutDraftForBlock: vi.fn(),
  setLayoutDraftForBlock: vi.fn(),
};

const stableControllerCallbacks = {
  onDraftFocusReceipt: vi.fn(),
  setActiveBlockId: vi.fn(),
  setFocusBlockId: vi.fn(),
  setInteractionState: vi.fn(),
  setSelectedBlockId: vi.fn(),
};

const defaultDraftLayout = {
  x: 20,
  y: 40,
  width: 540,
  height: 80,
  surface: 'canvas_workspace' as const,
  coordinate_space: 'canvas_world' as const,
  boundary_role: 'outside' as const,
};

const recoveryTemplate = {
  template_id: 'text.paragraph',
  template_key: 'text.paragraph',
  template_version: '1.0.0',
  label: 'Text',
  description: 'Text',
  system_type: 'text',
  learning_role: 'note',
  legacy_block_type: 'text',
  default_content: {},
  origin: 'test',
  status: 'active',
  isRuntime: false,
};

let canvasPersistenceResponse: Record<string, unknown> = {};
let durableAnnotationTruths: AnnotationTruthV1[] = [];
let durableBlocks: NoteBlock[] = [];

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function annotationWithOffsets(
  noteId: string,
  start: number,
  end: number,
  cache: string,
): AnnotationTruthV1 {
  return {
    id: `annotation-${noteId}`,
    note_id: noteId,
    canvas_id: `canvas-${noteId}`,
    raw_label: 'beta',
    ranges: [{
      id: `range-${noteId}`,
      target_kind: 'text_span',
      block_id: 'block-1',
      text_flow_id: 'textflow-block-1',
      text_unit_id: 'tu-1',
      start_offset: start,
      end_offset: end,
      range_text_cache: cache,
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

function asServerHydratedAnnotations(annotations: AnnotationTruthV1[]): AnnotationTruthV1[] {
  return annotations.map((annotation) => ({
    ...annotation,
    metadata: annotation.metadata || {},
    ranges: annotation.ranges.map((range) => ({
      ...range,
      metadata: {
        ...(range.metadata || {}),
        anchor_status: 'pending',
        anchor_reason: 'block_not_active',
      },
    })),
  }));
}

function contradictoryCrossingReceipt(version: 1 | 2, key: string) {
  return {
    version,
    noteId: 'old-note',
    clientCreateKey: key,
    text: 'queued text',
    layout: {
      x: 20,
      y: 40,
      width: 760,
      height: 72,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'crossing',
      frame_id: null,
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: null,
      },
    },
    template: recoveryTemplate,
    queuedAt: '2026-08-20T00:00:00.000Z',
  };
}

type GeometryContradiction = 'inside-as-outside' | 'crossing-as-inside';

function geometryContradictionReceipt(
  version: 1 | 2,
  key: string,
  contradiction: GeometryContradiction,
) {
  const layout = contradiction === 'inside-as-outside'
    ? {
      x: 300,
      y: 40,
      width: 10,
      height: 72,
      surface: 'formal_page',
      coordinate_space: 'canvas_world',
      boundary_role: 'inside',
      frame_id: 'frame-a',
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: { left: 100, right: 200, frameId: 'frame-a' },
      },
    }
    : {
      x: 120,
      y: 40,
      width: 20,
      height: 72,
      surface: 'canvas_workspace',
      coordinate_space: 'canvas_world',
      boundary_role: 'crossing',
      frame_id: 'frame-a',
      surface_authority: {
        coordinateSpace: 'canvas_world',
        pageBoundary: { left: 100, right: 200, frameId: 'frame-a' },
      },
    };
  return {
    version,
    noteId: 'old-note',
    clientCreateKey: key,
    text: 'queued text',
    layout,
    template: recoveryTemplate,
    queuedAt: '2026-08-20T00:00:00.000Z',
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

function serverBlock(text: string, reused: boolean, clientCreateKey = 'retry-key'): NoteBlock & {
  client_create_receipt: Record<string, unknown>;
} {
  return {
    id: 'block-1',
    placement_id: 'placement-1',
    display_overrides_json: {},
    canvas_layout: null,
    block_type: 'text',
    title: null,
    content_json: { body: text },
    plain_text: text,
    metadata: {},
    order_index: 0,
    source_references: [],
    client_create_receipt: {
      client_create_key: clientCreateKey,
      status: 'applied',
      reused,
    },
  };
}

function f11RuntimeCollection(): PageFrameCollectionModel {
  return normalizePageFrameCollection({
    pageFrames: [{
      id: 'f11-rendered-frame', role: 'primary_page_frame', exportable: true,
      x: 84, y: 80, width: 794, height: 1320,
      pageSize: 'A4', contentInset: { left: 72, top: 96, right: 72, bottom: 96 },
    }],
    primaryFrameId: 'f11-rendered-frame', selectedFrameId: 'f11-rendered-frame',
  });
}

const f11PaperLayout: BlockBoxLayout = {
  x: 20.25, y: 109.81224489795918, width: 540.5, height: 80.75,
  surface: 'formal_page', boundary_role: 'inside',
};

function f11PlacementResponse(url: string, payload: { block_id: string; layout: BlockBoxLayout }) {
  return { data: { block_id: payload.block_id, placement_id: url.split('/').pop(), layout: payload.layout } };
}

describe('useNoteCanvasDataAdapter draft create receipt seam', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  let consoleWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    mocks.coordinateContract = 'v1';
    canvasPersistenceResponse = {};
    durableAnnotationTruths = [];
    durableBlocks = [];
    mocks.boardRangesGet.mockResolvedValue({ data: { text_ranges: [] } });
    mocks.boardRangesPut.mockImplementation(async (_url: string, payload: { text_ranges: BoardTextRangeV1[] }) => ({ data: payload }));
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${note.id}/blocks`) return { data: durableBlocks };
      if (url === `/canvas-objects/by-note/${note.id}`) return { data: canvasPersistenceResponse };
      if (url === `/annotation-truths/by-note/${note.id}`) {
        return { data: durableAnnotationTruths };
      }
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it.each([
    {
      label: 'unresolved page frame',
      contract: 'v2' as const,
      layout: f11PaperLayout,
      message: 'A resolved page frame is required to save this coordinate contract',
      suffix: 'page frame unresolved',
    },
    {
      label: 'retired workspace surface',
      contract: 'v1' as const,
      layout: defaultDraftLayout,
      message: 'canvas_workspace_retired',
      suffix: 'retired surface',
    },
    {
      label: 'retired crossing surface',
      contract: 'v1' as const,
      layout: { ...f11PaperLayout, boundary_role: 'crossing' as const },
      message: 'canvas_crossing_retired',
      suffix: 'retired surface',
    },
  ])('A3 shows a distinct save failure code for $label and preserves the full console error', async ({ contract, layout, message, suffix }) => {
    mocks.coordinateContract = contract;
    durableBlocks = [serverBlock('synthetic save failure', false)];
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    expect(subject.result.current.coordinateContract).toBe(contract);
    await act(async () => {
      await subject.result.current.persistBlockLayout(subject.result.current.blocks[0], layout);
    });
    const failure = consoleError.mock.calls.find(([label]) => label === 'Failed to save block layout:')?.[1];
    expect(failure).toBeInstanceOf(Error);
    expect(failure).toHaveProperty('message', message);
    expect(failure).toHaveProperty('stack', expect.stringContaining(message));
    expect(mocks.addToast).toHaveBeenCalledWith('error', `Failed to save block layout (${suffix})`);
    expect(mocks.put).not.toHaveBeenCalled();
    expect(stableAdapterOptions.clearLayoutDraftForBlock).not.toHaveBeenCalled();
    await expect(subject.result.current.whenIdle()).rejects.toBe(failure);
  });

  it('A3 truncates an ordinary save failure message only in the toast', async () => {
    durableBlocks = [serverBlock('synthetic long save failure', false)];
    const message = 'Synthetic placement save unavailable: ' + 'detail '.repeat(30);
    const failure = new Error(message);
    mocks.put.mockRejectedValueOnce(failure);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    await act(async () => {
      await subject.result.current.persistBlockLayout(subject.result.current.blocks[0], f11PaperLayout);
    });
    expect(mocks.addToast).toHaveBeenCalledWith('error', `Failed to save block layout (${message.slice(0, 117)}...)`);
    expect(consoleError).toHaveBeenCalledWith('Failed to save block layout:', failure);
    expect(failure.message).toBe(message);
    expect(failure.stack).toContain(message);
    await expect(subject.result.current.whenIdle()).rejects.toBe(failure);
  });

  it.each([undefined, 'retired-frame'])('F11 persists the rendered collection before affiliation (%s) without changing its fractional rectangle', async (frame_id) => {
    mocks.coordinateContract = 'v2';
    durableBlocks = [serverBlock('incomplete paper', false)];
    const collection = f11RuntimeCollection();
    const inputLayout = { ...f11PaperLayout, frame_id };
    const snapshot = JSON.parse(JSON.stringify(collection));
    const collectionUrl = `/canvas-objects/by-note/${note.id}/page-frame-collection`;
    const collectionWrite = deferred<{ data: PageFrameCollectionModel }>();
    mocks.put.mockImplementation((url: string, payload: { block_id: string; layout: BlockBoxLayout }) => (
      url === collectionUrl ? collectionWrite.promise : Promise.resolve(f11PlacementResponse(url, payload))
    ));
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.coordinateContract).toBe('v2'));
    subject.result.current.runtimePageFrameCollectionRef.current = { noteId: note.id, collection };
    expect(mocks.put).not.toHaveBeenCalled();
    let saving!: Promise<void>;
    act(() => { saving = subject.result.current.persistBlockLayout(subject.result.current.blocks[0], inputLayout); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledOnce());
    expect(mocks.put).toHaveBeenCalledWith(collectionUrl, { collection: snapshot });
    expect(subject.result.current.pageFrameCollection).toBeNull();
    await act(async () => {
      collectionWrite.resolve({ data: collection });
      await saving;
      await subject.result.current.whenIdle();
    });
    expect(mocks.put.mock.calls.map(([url]) => url)).toEqual([
      collectionUrl, `/canvas-objects/by-note/${note.id}/block-placements/placement-1`,
    ]);
    expect(collection).toEqual(snapshot);
    expect(subject.result.current.pageFrameCollection).toEqual(snapshot);
    const savedLayout = subject.result.current.blocks[0].canvas_layout as unknown as BlockBoxLayout;
    expect(savedLayout.frame_id).toBe(collection.primaryFrameId);
    expect(savedLayout.coordinate_space).toBe('page_frame_local');
    expect(resolveScreenRect(savedLayout, collection.pageFrames[0], 'v2'))
      .toEqual(resolveScreenRect(inputLayout, undefined, 'v2'));
  });

  it.each(['pending', 'complete'] as const)('F11 shares one collection PUT when a concurrent missing-collection read arrives with healing %s', async (healingPhase) => {
    mocks.coordinateContract = 'v2';
    durableBlocks = [serverBlock('first', false), {
      ...serverBlock('second', false), id: 'block-2', placement_id: 'placement-2', order_index: 1,
    }];
    const collection = f11RuntimeCollection();
    const collectionUrl = `/canvas-objects/by-note/${note.id}/page-frame-collection`;
    const collectionWrite = deferred<{ data: PageFrameCollectionModel }>();
    const lateRead = deferred<{ data: Record<string, unknown> }>();
    mocks.put.mockImplementation((url: string, payload: { block_id: string; layout: BlockBoxLayout }) => (
      url === collectionUrl ? collectionWrite.promise : Promise.resolve(f11PlacementResponse(url, payload))
    ));
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.coordinateContract).toBe('v2'));
    subject.result.current.runtimePageFrameCollectionRef.current = { noteId: note.id, collection };
    const get = mocks.get.getMockImplementation()!;
    let placementContextReads = 0;
    mocks.get.mockImplementation((url: string) => {
      if (url === `/canvas-objects/by-note/${note.id}` && ++placementContextReads === 2) return lateRead.promise;
      return get(url);
    });
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = subject.result.current.persistBlockLayout(subject.result.current.blocks[0], f11PaperLayout);
      second = subject.result.current.persistBlockLayout(subject.result.current.blocks[1], { ...f11PaperLayout, y: 360 });
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledOnce());
    expect(placementContextReads).toBe(2);
    if (healingPhase === 'pending') {
      await act(async () => { lateRead.resolve({ data: {} }); });
      expect(mocks.put).toHaveBeenCalledOnce();
    }
    await act(async () => { collectionWrite.resolve({ data: collection }); await first; });
    await act(async () => {
      if (healingPhase === 'complete') lateRead.resolve({ data: {} });
      await second;
      await subject.result.current.whenIdle();
    });
    expect(mocks.put.mock.calls.filter(([url]) => url === collectionUrl)).toHaveLength(1);
    expect(mocks.put.mock.calls.filter(([url]) => String(url).includes('/block-placements/'))).toHaveLength(2);
    expect(subject.result.current.blocks.map((block) => block.canvas_layout?.frame_id))
      .toEqual([collection.primaryFrameId, collection.primaryFrameId]);
  });

  it('F11 finishes pending healing before an explicit page-frame edit and keeps the newer collection visible', async () => {
    mocks.coordinateContract = 'v2';
    durableBlocks = [serverBlock('paper with a pending frame edit', false)];
    const collection = f11RuntimeCollection();
    const nextCollection = normalizePageFrameCollection({
      ...collection,
      pageFrames: collection.pageFrames.map((frame) => ({ ...frame, x: frame.x + 48 })),
    });
    const collectionUrl = `/canvas-objects/by-note/${note.id}/page-frame-collection`;
    const healingWrite = deferred<{ data: PageFrameCollectionModel }>();
    const explicitWrite = deferred<{ data: PageFrameCollectionModel }>();
    let collectionWrites = 0;
    mocks.put.mockImplementation((url: string, payload: { block_id: string; layout: BlockBoxLayout }) => {
      if (url === collectionUrl) return ++collectionWrites === 1 ? healingWrite.promise : explicitWrite.promise;
      return Promise.resolve(f11PlacementResponse(url, payload));
    });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.coordinateContract).toBe('v2'));
    subject.result.current.runtimePageFrameCollectionRef.current = { noteId: note.id, collection };
    let placing!: Promise<void>;
    let editing!: Promise<void>;
    act(() => { placing = subject.result.current.persistBlockLayout(subject.result.current.blocks[0], f11PaperLayout); });
    await waitFor(() => expect(collectionWrites).toBe(1));
    act(() => { editing = subject.result.current.savePageFrameCollection(nextCollection); });
    expect(subject.result.current.pageFrameCollection).toEqual(nextCollection);
    expect(mocks.put.mock.calls.filter(([url]) => url === collectionUrl)).toHaveLength(1);
    await act(async () => { healingWrite.resolve({ data: collection }); });
    await waitFor(() => expect(collectionWrites).toBe(2));
    expect(mocks.put.mock.calls.filter(([url]) => url === collectionUrl).map(([, payload]) => payload))
      .toEqual([{ collection }, { collection: nextCollection }]);
    expect(subject.result.current.pageFrameCollection).toEqual(nextCollection);
    await act(async () => {
      explicitWrite.resolve({ data: nextCollection });
      await Promise.all([placing, editing]);
      await subject.result.current.whenIdle();
    });
    expect(subject.result.current.pageFrameCollection).toEqual(nextCollection);
    expect(collectionWrites).toBe(2);
  });

  it('F11 stops a block save on collection failure and allows the same placement to heal on retry', async () => {
    mocks.coordinateContract = 'v2';
    durableBlocks = [serverBlock('retry paper', false)];
    const collection = f11RuntimeCollection();
    const collectionUrl = `/canvas-objects/by-note/${note.id}/page-frame-collection`;
    const failure = new Error('Synthetic collection save unavailable');
    let collectionAttempts = 0;
    mocks.put.mockImplementation(async (url: string, payload: { block_id: string; layout: BlockBoxLayout }) => {
      if (url !== collectionUrl) return f11PlacementResponse(url, payload);
      if (++collectionAttempts === 1) throw failure;
      return { data: collection };
    });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.coordinateContract).toBe('v2'));
    subject.result.current.runtimePageFrameCollectionRef.current = { noteId: note.id, collection };
    await act(async () => { await subject.result.current.persistBlockLayout(subject.result.current.blocks[0], f11PaperLayout); });
    expect(mocks.put.mock.calls.map(([url]) => url)).toEqual([collectionUrl]);
    expect(subject.result.current.pageFrameCollection).toBeNull();
    expect(subject.result.current.blocks[0].canvas_layout).toBeNull();
    expect(mocks.addToast).toHaveBeenCalledWith('error', 'Failed to save block layout (Synthetic collection save unavailable)');
    await expect(subject.result.current.whenIdle()).rejects.toBe(failure);
    await act(async () => {
      await subject.result.current.persistBlockLayout(subject.result.current.blocks[0], f11PaperLayout);
      await subject.result.current.whenIdle();
    });
    expect(mocks.put.mock.calls.map(([url]) => url)).toEqual([
      collectionUrl, collectionUrl, `/canvas-objects/by-note/${note.id}/block-placements/placement-1`,
    ]);
    expect(subject.result.current.pageFrameCollection).toEqual(collection);
    expect(subject.result.current.blocks[0].canvas_layout?.frame_id).toBe(collection.primaryFrameId);
  });

  it('F11 heals generic objects with their content mounts and reuses that collection for later block placement', async () => {
    mocks.coordinateContract = 'v2';
    durableBlocks = [serverBlock('mounted content', false)];
    const collection = f11RuntimeCollection();
    const frame = collection.pageFrames[0];
    const collectionUrl = `/canvas-objects/by-note/${note.id}/page-frame-collection`;
    const objectUrl = `/canvas-objects/by-note/${note.id}/objects/mounted-paragraph`;
    const contentMounts: NonNullable<PersistCanvasObjectInput['contentMounts']> = [{
      mountId: 'f11-mount', objectId: 'mounted-paragraph', targetKind: 'note_block', targetId: 'block-1',
      projectionMode: 'reference', syncPolicy: 'read_through',
    }];
    const input: PersistCanvasObjectInput = {
      canvasObject: {
        objectId: 'mounted-paragraph', canvasId: 'primary-note-canvas', kind: 'paragraph_block_projection',
        backing: 'note_block', objectClass: 'block_backed', status: 'active',
      },
      placement: {
        placementId: 'mount-placement', objectId: 'mounted-paragraph', canvasId: 'primary-note-canvas',
        frameId: frame.id, surface: 'formal_page', boundaryRole: 'inside',
        x: frame.x + frame.contentInset.left + 12, y: frame.y + frame.contentInset.top + 34,
        width: 320, height: 80, rotation: 0, zIndex: 1,
      },
      contentMounts,
      payload: {},
    };
    input.payload = {
      kind: input.canvasObject.kind, contentMounts,
      placement: {
        id: input.placement.placementId, object_id: input.canvasObject.objectId,
        frame_id: frame.id, surface: 'formal_page', boundary_role: 'inside',
        x: input.placement.x, y: input.placement.y, width: 320, height: 80,
      },
    };
    mocks.put.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url === collectionUrl) return { data: collection };
      if (url === objectUrl) return { data: {
        canvasObject: input.canvasObject, contentMounts: payload.contentMounts,
        placement: { ...(payload.placement as object), metadata: { layout_policy: { coordinate_space: 'page_frame_local' } } },
      } };
      return f11PlacementResponse(url, payload as { block_id: string; layout: BlockBoxLayout });
    });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.coordinateContract).toBe('v2'));
    subject.result.current.runtimePageFrameCollectionRef.current = { noteId: note.id, collection };
    await act(async () => { expect(await subject.result.current.persistCanvasObject(input)).toBe(true); });
    expect(mocks.put.mock.calls.map(([url]) => url)).toEqual([collectionUrl, objectUrl]);
    expect(mocks.put.mock.calls[1][1]).toMatchObject({
      contentMounts, placement: { x: 12, y: 34, frame_id: frame.id, coordinate_space: 'page_frame_local' },
    });
    expect(subject.result.current.persistedContentMounts).toEqual(contentMounts);
    expect(subject.result.current.persistedCanvasPlacements[0]).toMatchObject({
      x: input.placement.x, y: input.placement.y, frameId: frame.id,
    });
    await act(async () => {
      await subject.result.current.persistBlockLayout(subject.result.current.blocks[0], f11PaperLayout);
      await subject.result.current.whenIdle();
    });
    expect(mocks.put.mock.calls.filter(([url]) => url === collectionUrl)).toHaveLength(1);
    expect(subject.result.current.blocks[0].canvas_layout?.frame_id).toBe(frame.id);
  });

  it.each(['modal', 'page'] as const)('keeps the %s host load-error navigation contract', async (hostMode) => {
    const get = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation((url: string) => url === `/notes/${note.id}`
      ? Promise.reject(new Error('Synthetic note load failure')) : get(url));
    const subject = renderHook(() => ({
      adapter: useNoteCanvasDataAdapter({ ...stableAdapterOptions, hostMode }),
      location: useLocation(),
    }), { wrapper });
    await waitFor(() => expect(subject.result.current.adapter.loading).toBe(false));
    expect(subject.result.current.location.pathname).toBe(hostMode === 'modal' ? '/' : '/projects');
    expect(subject.result.current.adapter.loadError).toBe(hostMode === 'modal'
      ? 'Failed to load note. Close this window to return to the board.' : null);
    await expect(subject.result.current.adapter.whenIdle()).resolves.toBeUndefined();
  });

  it('flushes a readonly Item reference for ordinary placement without writing its body', async () => {
    durableBlocks = [{
      ...serverBlock('', false),
      block_type: 'item_ref',
      content_json: { item_id: 'item-1' },
    }];
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.blocks).toHaveLength(1));
    const reference = subject.result.current.blocks[0];
    let outcome!: BlockSaveOutcome;
    await act(async () => {
      outcome = await subject.result.current.saveBlock(reference, 'body edits are ignored', { silent: true });
      await subject.result.current.whenIdle();
    });
    expect(outcome.status).toBe('saved');
    expect(outcome.block).toBe(reference);
    expect(subject.result.current.blocks[0].content_json).toEqual({ item_id: 'item-1' });
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.boardRangesPut).not.toHaveBeenCalled();
    await act(async () => {
      expect(await subject.result.current.applyTemplateToBlock(reference, recoveryTemplate, 'copy')).toBeNull();
      await subject.result.current.whenIdle();
    });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('keeps whenIdle pending through the body PUT and the board-range second write', async () => {
    const oldFlow = createTextBlockContentV1('alpha beta gamma');
    const newFlow = { ...oldFlow, units: [{ ...oldFlow.units[0], text: 'prefix alpha beta gamma' }] };
    durableBlocks = [{ ...serverBlock('alpha beta gamma', false), content_json: { body: 'alpha beta gamma', [TEXT_FLOW_CONTENT_KEY]: oldFlow } }];
    mocks.boardRangesGet.mockResolvedValue({ data: { text_ranges: [{
      id: 'anchor', board_id: 'board', note_id: note.id, block_id: durableBlocks[0].id,
      text_flow_id: `textflow-${durableBlocks[0].id}`, text_unit_id: oldFlow.units[0].id,
      start_offset: 6, end_offset: 10, excerpt: 'beta', status: 'active', pre_edit_offsets: null,
    }] } });
    const body = deferred<{ data: NoteBlock }>();
    const ranges = deferred<{ data: { text_ranges: BoardTextRangeV1[] } }>();
    mocks.put.mockReturnValue(body.promise);
    mocks.boardRangesPut.mockReturnValue(ranges.promise);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.blocks).toHaveLength(1));
    let saving!: Promise<BlockSaveOutcome>;
    const idle = vi.fn();
    let drain!: Promise<void>;
    act(() => {
      saving = subject.result.current.saveBlock(subject.result.current.blocks[0], newFlow.units[0].text, { textFlow: newFlow });
      drain = subject.result.current.whenIdle().then(idle);
    });
    expect(idle).not.toHaveBeenCalled();
    await act(async () => { body.resolve({ data: { ...durableBlocks[0], ...mocks.put.mock.calls[0][1] } }); });
    expect(mocks.boardRangesPut).toHaveBeenCalledOnce();
    expect(idle).not.toHaveBeenCalled();
    await act(async () => {
      ranges.resolve({ data: mocks.boardRangesPut.mock.calls[0][1] });
      await saving;
      await drain;
    });
    expect(idle).toHaveBeenCalledOnce();
  });

  it('waits through draft creation and placement and preserves caught placement errors for retry', async () => {
    const layout = { ...defaultDraftLayout, surface: 'formal_page' as const, boundary_role: 'inside' as const };
    const created = deferred<{ data: NoteBlock }>();
    const placed = deferred<{ data: unknown }>();
    mocks.post.mockReturnValue(created.promise);
    mocks.put.mockReturnValueOnce(placed.promise);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));
    let saving!: ReturnType<typeof subject.result.current.createDraftBlock>;
    const settled = vi.fn();
    let drain!: Promise<void>;
    act(() => {
      saving = subject.result.current.createDraftBlock(recoveryTemplate, 'draft', { layout, clientCreateKey: 'draft-close' });
      drain = subject.result.current.whenIdle().then(settled, settled);
    });
    await act(async () => { created.resolve({ data: serverBlock('draft', false, 'draft-close') }); });
    expect(consoleError.mock.calls).toEqual([]);
    expect(mocks.put).toHaveBeenCalledOnce();
    expect(settled).not.toHaveBeenCalled();
    const error = new Error('placement unavailable');
    await act(async () => {
      placed.reject(error);
      await saving;
      await drain;
    });
    expect(settled).toHaveBeenCalledWith(error);
    await expect(subject.result.current.whenIdle()).rejects.toBe(error);
    mocks.put.mockResolvedValueOnce({ data: { block_id: 'block-1', placement_id: 'placement-1', layout } });
    await act(async () => {
      await subject.result.current.saveDraftBlockPlacement(serverBlock('draft', false), layout, 'draft-close', note.id);
      await subject.result.current.whenIdle();
    });
  });

  it('records a canvas-object save prerequisite failure before PUT and clears it on successful retry', async () => {
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));
    const context = deferred<Awaited<ReturnType<typeof canvasObjectRepository.resolveCanvasPlacementWriteContext>>>();
    const resolveContext = vi.spyOn(canvasObjectRepository, 'resolveCanvasPlacementWriteContext')
      .mockReturnValueOnce(context.promise);
    const saveObject = vi.spyOn(canvasObjectRepository, 'saveGenericCanvasObjectForNote')
      .mockResolvedValue({});
    const input: PersistCanvasObjectInput = {
      canvasObject: { objectId: 'shape-1', canvasId: 'canvas-1', kind: 'shape', backing: 'none', objectClass: 'pure', status: 'active' },
      placement: { placementId: 'shape-place-1', objectId: 'shape-1', canvasId: 'canvas-1', surface: 'formal_page', boundaryRole: 'inside', x: 0, y: 0, width: 100, height: 100, zIndex: 1, rotation: 0 },
      payload: {},
    };
    try {
      let saving!: Promise<boolean>;
      const settled = vi.fn();
      let drain!: Promise<void>;
      act(() => {
        saving = subject.result.current.persistCanvasObject(input);
        drain = subject.result.current.whenIdle().then(settled, settled);
      });
      expect(saveObject).not.toHaveBeenCalled();
      expect(settled).not.toHaveBeenCalled();
      const error = new Error('placement write context unavailable');
      await act(async () => {
        context.reject(error);
        expect(await saving).toBe(false);
        await drain;
      });
      expect(saveObject).not.toHaveBeenCalled();
      expect(settled).toHaveBeenCalledWith(error);
      expect(mocks.addToast).toHaveBeenCalledWith('error', 'Failed to save canvas object');
      expect(subject.result.current.persistedCanvasObjects).toEqual([]);
      await expect(subject.result.current.whenIdle()).rejects.toBe(error);
      resolveContext.mockResolvedValueOnce({ coordinateContract: 'v1', pageFrameCollection: null });
      await act(async () => {
        expect(await subject.result.current.persistCanvasObject(input)).toBe(true);
        await subject.result.current.whenIdle();
      });
      expect(saveObject).toHaveBeenCalledOnce();
      expect(subject.result.current.persistedCanvasObjects).toEqual([input.canvasObject]);
    } finally {
      resolveContext.mockRestore();
      saveObject.mockRestore();
    }
  });

  it('loads all board anchors, writes text first, then synchronizes both boards without double shifting', async () => {
    const oldFlow = createTextBlockContentV1('alpha beta gamma');
    oldFlow.units[0].id = 'unit-1';
    const newFlow = { ...oldFlow, units: [{ ...oldFlow.units[0], text: 'prefix alpha beta gamma' }] };
    durableBlocks = [{ ...serverBlock('alpha beta gamma', false), content_json: { body: 'alpha beta gamma', [TEXT_FLOW_CONTENT_KEY]: oldFlow } }];
    const anchors: BoardTextRangeV1[] = ['one', 'two'].map((id) => ({
      id, board_id: `board-${id}`, note_id: note.id, block_id: durableBlocks[0].id,
      text_flow_id: `textflow-${durableBlocks[0].id}`, text_unit_id: 'unit-1',
      start_offset: 6, end_offset: 10, excerpt: 'beta', status: 'active', pre_edit_offsets: null,
      at: '', created_at: '', updated_at: '',
    }));
    mocks.boardRangesGet.mockResolvedValue({ data: { text_ranges: anchors } });
    const order: string[] = [];
    mocks.put.mockImplementation(async (_url: string, payload: object) => {
      order.push('body');
      return { data: { ...durableBlocks[0], ...payload } };
    });
    mocks.boardRangesPut.mockImplementation(async (_url: string, payload: { text_ranges: BoardTextRangeV1[] }) => {
      order.push('ranges');
      return { data: payload };
    });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.blocks).toHaveLength(1));
    act(() => subject.result.current.rebaseBoardTextRanges(durableBlocks[0].id, oldFlow, newFlow));
    let outcome!: BlockSaveOutcome;
    await act(async () => { outcome = await subject.result.current.saveBlock(subject.result.current.blocks[0], newFlow.units[0].text, { textFlow: newFlow }); });
    expect(outcome.status).toBe('saved');
    expect(order).toEqual(['body', 'ranges']);
    expect(mocks.boardRangesPut.mock.calls[0][1].text_ranges).toEqual(anchors.map((range) => expect.objectContaining({ id: range.id, start_offset: 13, end_offset: 17, excerpt: 'beta' })));
  });

  it('retains failed second writes for retry and never reports a synchronized save', async () => {
    const oldFlow = createTextBlockContentV1('alpha beta gamma');
    const newFlow = { ...oldFlow, units: [{ ...oldFlow.units[0], text: 'alpha  gamma' }] };
    durableBlocks = [{ ...serverBlock('alpha beta gamma', false), content_json: { body: 'alpha beta gamma', [TEXT_FLOW_CONTENT_KEY]: oldFlow } }];
    mocks.boardRangesGet.mockResolvedValue({ data: { text_ranges: [{
      id: 'anchor', board_id: 'board', note_id: note.id, block_id: durableBlocks[0].id,
      text_flow_id: `textflow-${durableBlocks[0].id}`, text_unit_id: oldFlow.units[0].id,
      start_offset: 6, end_offset: 10, excerpt: 'beta', status: 'active', pre_edit_offsets: null,
    }] } });
    mocks.put.mockImplementation(async (_url: string, payload: object) => ({ data: { ...durableBlocks[0], ...payload } }));
    mocks.boardRangesPut.mockRejectedValueOnce(new Error('second write unavailable'));
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.blocks).toHaveLength(1));
    let failed!: BlockSaveOutcome;
    await act(async () => { failed = await subject.result.current.saveBlock(subject.result.current.blocks[0], 'alpha  gamma', { textFlow: newFlow }); });
    expect(failed).toMatchObject({ status: 'rejected', reason: 'board_range_sync_failed', durableState: 'matches_requested' });
    await expect(subject.result.current.whenIdle()).rejects.toThrow('second write unavailable');
    expect(mocks.addToast).toHaveBeenCalledWith('error', 'Text saved, but board references could not sync. Retry saving this block.');
    expect(mocks.addToast.mock.calls.some(([kind, message]) => kind === 'success' && message === 'Block saved')).toBe(false);
    expect(mocks.boardRangesPut.mock.calls[0][1].text_ranges[0]).toMatchObject({ status: 'drifted', excerpt: 'beta', pre_edit_offsets: { start_offset: 6, end_offset: 10 } });
    let retried!: BlockSaveOutcome;
    await act(async () => { retried = await subject.result.current.saveBlock(subject.result.current.blocks[0], 'alpha  gamma', { textFlow: newFlow }); });
    expect(retried.status).toBe('saved');
    await expect(subject.result.current.whenIdle()).resolves.toBeUndefined();
    expect(mocks.boardRangesPut).toHaveBeenCalledTimes(2);
  });

  it('V13 S2 saves paper without a retired purpose writer', async () => {
    mocks.put.mockImplementation(async (url: string, payload: unknown) => {
      if (url.startsWith('/purposes')) throw { response: { status: 410 } };
      if (url === `/notes/${note.id}`) return { data: { ...note, ...(payload as object) } };
      throw new Error(`Unexpected PUT ${url}`);
    });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));
    expect(subject.result.current).not.toHaveProperty('savePurposeFrames');
    expect(mocks.get).toHaveBeenCalledWith('/purposes');
    expect(subject.result.current.purposeFrames).toEqual([]);
    act(() => subject.result.current.setTitleDraft('Updated paper'));
    await act(async () => { await subject.result.current.saveTitle(); });
    expect(mocks.put).toHaveBeenCalledWith(`/notes/${note.id}`, { title: 'Updated paper' });
    expect(mocks.put.mock.calls.some(([url]) => String(url).startsWith('/purposes'))).toBe(false);
    expect(mocks.addToast.mock.calls.some(([kind]) => kind === 'error')).toBe(false);
  });

  it.each(['argument', 'draft'] as const)(
    'skips a v2 unchanged blur save with equivalent serialized TextFlow from %s',
    async (flowSource) => {
      mocks.coordinateContract = 'v2';
      const storedFlow = createTextBlockContentV1('same paragraph', 'paragraph', {
        formatting: { weight: 'normal', color: 'default' },
      });
      const blurFlow: TextBlockContentV1 = {
        metadata: { formatting: { color: 'default', weight: 'normal' } },
        inline_structures: [],
        units: storedFlow.units.map((unit) => ({
          status: unit.status,
          metadata: { ...unit.metadata },
          order_index: unit.order_index,
          indent_level: unit.indent_level,
          writing_role: unit.writing_role,
          text: unit.text,
          id: unit.id,
        })),
        textflow_version: storedFlow.textflow_version,
      };
      durableBlocks = [{
        ...serverBlock('same paragraph', false),
        content_json: { body: 'same paragraph', [TEXT_FLOW_CONTENT_KEY]: storedFlow },
      }];
      const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
      await waitFor(() => expect(subject.result.current.coordinateContract).toBe('v2'));
      const block = subject.result.current.blocks[0];
      expect(blurFlow).not.toBe(storedFlow);
      expect(JSON.stringify(blurFlow)).not.toBe(JSON.stringify(storedFlow));
      expect(blurFlow).toEqual(storedFlow);
      if (flowSource === 'draft') {
        act(() => subject.result.current.setBlockTextFlowDrafts({ [block.id]: blurFlow }));
      }

      let outcome!: BlockSaveOutcome;
      await act(async () => {
        outcome = await subject.result.current.saveBlock(block, 'same paragraph', {
          ...(flowSource === 'argument' ? { textFlow: blurFlow } : {}),
          silent: true,
        });
      });

      expect(outcome).toMatchObject({ status: 'saved', reconciliation: 'not_needed' });
      expect(mocks.put).not.toHaveBeenCalled();
      expect(listBlockEditRecoveryReceipts(note.id)).toEqual([]);
      expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBeNull();
      expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);
      expect(subject.result.current.savingBlockId).toBeNull();
    },
  );

  it.each(['materialized', 'reformatted'] as const)(
    'saves %s TextFlow once in v2 while keeping its in-flight receipt durable and hidden',
    async (change) => {
      mocks.coordinateContract = 'v2';
      const storedFlow = createTextBlockContentV1('same paragraph');
      const nextFlow: TextBlockContentV1 = {
        ...storedFlow,
        units: storedFlow.units.map((unit) => ({
          ...unit,
          writing_role: change === 'reformatted' ? 'heading' : unit.writing_role,
        })),
      };
      durableBlocks = [{
        ...serverBlock('same paragraph', false),
        content_json: {
          body: 'same paragraph',
          ...(change === 'reformatted' ? { [TEXT_FLOW_CONTENT_KEY]: storedFlow } : {}),
        },
      }];
      const heldPut = deferred<{ data: NoteBlock }>();
      mocks.put.mockReturnValue(heldPut.promise);
      const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
      await waitFor(() => expect(subject.result.current.coordinateContract).toBe('v2'));
      const block = subject.result.current.blocks[0];
      let save!: Promise<BlockSaveOutcome>;
      act(() => {
        save = subject.result.current.saveBlock(block, 'same paragraph', { textFlow: nextFlow });
      });

      expect(mocks.put).toHaveBeenCalledTimes(1);
      expect(mocks.put).toHaveBeenCalledWith(`/note-blocks/${block.id}`, {
        content_json: { body: 'same paragraph', [TEXT_FLOW_CONTENT_KEY]: nextFlow },
        plain_text: 'same paragraph',
      });
      expect(subject.result.current.savingBlockId).toBe(block.id);
      expect(listBlockEditRecoveryReceipts(note.id)).toEqual([
        expect.objectContaining({
          blockId: block.id,
          plainText: 'same paragraph',
          contentJson: { body: 'same paragraph', [TEXT_FLOW_CONTENT_KEY]: nextFlow },
        }),
      ]);
      expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toContain('same paragraph');
      expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);

      let outcome!: BlockSaveOutcome;
      await act(async () => {
        heldPut.resolve({
          data: { ...block, content_json: { body: 'same paragraph', [TEXT_FLOW_CONTENT_KEY]: nextFlow } },
        });
        outcome = await save;
      });
      expect(outcome).toMatchObject({ status: 'saved', reconciliation: 'response' });
      expect(mocks.put).toHaveBeenCalledTimes(1);
      expect(subject.result.current.blocks[0].content_json[TEXT_FLOW_CONTENT_KEY]).toEqual(nextFlow);
      expect(listBlockEditRecoveryReceipts(note.id)).toEqual([]);
      expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);
      expect(subject.result.current.savingBlockId).toBeNull();
    },
  );

  it('shows a v2 failed write immediately during held reconciliation and applies it explicitly', async () => {
    mocks.coordinateContract = 'v2';
    durableBlocks = [serverBlock('server old', false)];
    const heldPut = deferred<{ data: NoteBlock }>();
    const heldRead = deferred<{ data: NoteBlock[] }>();
    const heldApply = deferred<{ data: NoteBlock }>();
    const defaultGet = mocks.get.getMockImplementation()!;
    let blockReads = 0;
    mocks.get.mockImplementation((url: string) => {
      if (url === `/notes/${note.id}/blocks` && ++blockReads === 2) return heldRead.promise;
      return defaultGet(url);
    });
    mocks.put.mockReturnValueOnce(heldPut.promise).mockReturnValueOnce(heldApply.promise);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.coordinateContract).toBe('v2'));
    const block = subject.result.current.blocks[0];
    let save!: Promise<BlockSaveOutcome>;
    const saveSettled = vi.fn();
    act(() => {
      save = subject.result.current.saveBlock(block, 'recover me');
      void save.then(saveSettled);
    });
    const pending = listBlockEditRecoveryReceipts(note.id)[0];
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);

    await act(async () => {
      heldPut.reject(new Error('synthetic pre-commit failure'));
    });
    // No timer advances or waitFor: the failure must surface before this read resolves.
    expect(blockReads).toBe(2);
    expect(saveSettled).not.toHaveBeenCalled();
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([pending]);
    expect(mocks.put).toHaveBeenCalledTimes(1);

    let failed!: BlockSaveOutcome;
    await act(async () => {
      heldRead.resolve({ data: durableBlocks });
      failed = await save;
    });
    expect(failed).toMatchObject({ status: 'rejected', durableState: 'conflict' });
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([pending]);
    let apply!: Promise<boolean>;
    act(() => {
      apply = subject.result.current.applyBlockEditRecovery(pending.recoveryKey);
    });
    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(listBlockEditRecoveryReceipts(note.id)).toEqual([
      expect.objectContaining({ text: 'recover me' }),
    ]);
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);

    let applied = false;
    await act(async () => {
      const payload = mocks.put.mock.calls[1][1] as Pick<NoteBlock, 'content_json' | 'plain_text'>;
      heldApply.resolve({ data: { ...block, ...payload } });
      applied = await apply;
    });
    expect(applied).toBe(true);
    expect(subject.result.current.blocks[0].plain_text).toBe('recover me');
    expect(listBlockEditRecoveryReceipts(note.id)).toEqual([]);
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);
    expect(mocks.put).toHaveBeenCalledTimes(2);
  });

  it('filters concurrent v2 block saves independently and preserves the other block failure', async () => {
    mocks.coordinateContract = 'v2';
    durableBlocks = [
      serverBlock('first old', false),
      { ...serverBlock('second old', false), id: 'block-2', placement_id: 'placement-2' },
    ];
    const firstPut = deferred<{ data: NoteBlock }>();
    const secondPut = deferred<{ data: NoteBlock }>();
    mocks.put.mockImplementation((url: string) => (
      url === '/note-blocks/block-1' ? firstPut.promise : secondPut.promise
    ));
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.coordinateContract).toBe('v2'));
    const [firstBlock, secondBlock] = subject.result.current.blocks;
    let firstSave!: Promise<BlockSaveOutcome>;
    let secondSave!: Promise<BlockSaveOutcome>;
    act(() => {
      firstSave = subject.result.current.saveBlock(firstBlock, 'first edit');
      secondSave = subject.result.current.saveBlock(secondBlock, 'second edit');
    });
    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(listBlockEditRecoveryReceipts(note.id)).toHaveLength(2);
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);

    await act(async () => {
      firstPut.reject(new Error('first block pre-commit rejection'));
      await firstSave;
    });
    expect(subject.result.current.savingBlockId).toBe(secondBlock.id);
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([
      expect.objectContaining({ blockId: firstBlock.id, text: 'first edit' }),
    ]);
    expect(listBlockEditRecoveryReceipts(note.id)).toHaveLength(2);

    await act(async () => {
      const payload = mocks.put.mock.calls[1][1] as Pick<NoteBlock, 'content_json' | 'plain_text'>;
      secondPut.resolve({ data: { ...secondBlock, ...payload } });
      await secondSave;
    });
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([
      expect.objectContaining({ blockId: firstBlock.id, text: 'first edit' }),
    ]);
    expect(listBlockEditRecoveryReceipts(note.id)).toHaveLength(1);
    expect(subject.result.current.savingBlockId).toBeNull();
    expect(mocks.put).toHaveBeenCalledTimes(2);
  });

  it('saves a v2 edit back to the original content when a changed save is still in flight', async () => {
    mocks.coordinateContract = 'v2';
    const originalFlow = createTextBlockContentV1('original A');
    const changedFlow = createTextBlockContentV1('changed B');
    durableBlocks = [{
      ...serverBlock('original A', false),
      content_json: { body: 'original A', [TEXT_FLOW_CONTENT_KEY]: originalFlow },
    }];
    const firstPut = deferred<{ data: NoteBlock }>();
    const secondPut = deferred<{ data: NoteBlock }>();
    mocks.put.mockReturnValueOnce(firstPut.promise).mockReturnValueOnce(secondPut.promise);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.coordinateContract).toBe('v2'));
    const originalBlock = subject.result.current.blocks[0];
    let firstSave!: Promise<BlockSaveOutcome>;
    let secondSave!: Promise<BlockSaveOutcome>;
    act(() => {
      firstSave = subject.result.current.saveBlock(originalBlock, 'changed B', { textFlow: changedFlow });
      secondSave = subject.result.current.saveBlock(originalBlock, 'original A', { textFlow: originalFlow });
    });
    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(mocks.put.mock.calls[1]).toEqual([
      `/note-blocks/${originalBlock.id}`,
      { content_json: originalBlock.content_json, plain_text: 'original A' },
    ]);
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);

    await act(async () => {
      const payload = mocks.put.mock.calls[0][1] as Pick<NoteBlock, 'content_json' | 'plain_text'>;
      durableBlocks = [{ ...originalBlock, ...payload }];
      firstPut.resolve({ data: durableBlocks[0] });
      await firstSave;
    });
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);
    await act(async () => {
      durableBlocks = [originalBlock];
      secondPut.resolve({ data: originalBlock });
      await secondSave;
    });
    expect(subject.result.current.blocks[0].plain_text).toBe('original A');
    expect(subject.result.current.blocks[0].content_json).toEqual(originalBlock.content_json);
    expect(listBlockEditRecoveryReceipts(note.id)).toEqual([]);
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);
  });

  it('reconciles every annotation save after a pre-commit rejection', async () => {
    const forward = annotationWithOffsets(note.id, 10, 14, 'beta');
    const inverse = annotationWithOffsets(note.id, 6, 10, 'beta');
    durableAnnotationTruths = [forward];
    let annotationPutCount = 0;
    mocks.put.mockImplementation(async (url: string, payload: { annotations?: AnnotationTruthV1[] }) => {
      if (url !== `/annotation-truths/by-note/${note.id}`) throw new Error(`Unexpected PUT ${url}`);
      annotationPutCount += 1;
      if (annotationPutCount === 1) throw new Error('rejected before commit');
      durableAnnotationTruths = payload.annotations || [];
      return { data: durableAnnotationTruths };
    });
    const subject = renderHook(
      () => useNoteCanvasDataAdapter(stableAdapterOptions),
      { wrapper },
    );
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([forward]));

    await act(async () => {
      await subject.result.current.saveAnnotationTruths([inverse]);
    });

    expect(annotationPutCount).toBe(2);
    expect(durableAnnotationTruths).toEqual([inverse]);
    expect(subject.result.current.annotationTruths).toEqual([inverse]);
    expect(mocks.get.mock.calls.filter(([url]) => (
      url === `/annotation-truths/by-note/${note.id}`
    ))).toHaveLength(2);
    expect(mocks.addToast).toHaveBeenCalledWith('error', 'Failed to save annotation');
  });

  it('does not duplicate a generic annotation PUT after server commit and response loss', async () => {
    const forward = annotationWithOffsets(note.id, 10, 14, 'beta');
    const inverse = annotationWithOffsets(note.id, 6, 10, 'beta');
    durableAnnotationTruths = [forward];
    let annotationPutCount = 0;
    mocks.put.mockImplementation(async (url: string, payload: { annotations?: AnnotationTruthV1[] }) => {
      if (url !== `/annotation-truths/by-note/${note.id}`) throw new Error(`Unexpected PUT ${url}`);
      annotationPutCount += 1;
      durableAnnotationTruths = asServerHydratedAnnotations(payload.annotations || []);
      throw new Error('response lost after commit');
    });
    const subject = renderHook(
      () => useNoteCanvasDataAdapter(stableAdapterOptions),
      { wrapper },
    );
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([forward]));

    await act(async () => {
      await subject.result.current.saveAnnotationTruths([inverse]);
    });

    expect(annotationPutCount).toBe(1);
    expect(durableAnnotationTruths[0]?.ranges[0]).toMatchObject({ start_offset: 6, end_offset: 10 });
    expect(subject.result.current.annotationTruths[0]?.ranges[0]).toMatchObject({
      start_offset: 6,
      end_offset: 10,
    });
    expect(mocks.get.mock.calls.filter(([url]) => (
      url === `/annotation-truths/by-note/${note.id}`
    ))).toHaveLength(2);
  });

  it('does not publish or hydrate stale note A annotations after routing to note B', async () => {
    const noteB: Note = { ...note, id: 'note-2', title: 'Second note' };
    const initialA = annotationWithOffsets(note.id, 0, 4, 'alpha');
    const firstA = annotationWithOffsets(note.id, 1, 5, 'lpha');
    const queuedA = annotationWithOffsets(note.id, 2, 6, 'pha');
    const staleCallbackA = annotationWithOffsets(note.id, 3, 7, 'ha');
    const initialB = annotationWithOffsets(noteB.id, 8, 12, 'beta');
    const heldFirstPut = deferred<{ data: AnnotationTruthV1[] }>();
    const heldNoteB = deferred<{ data: Note }>();
    const annotationPutPayloads: Array<{ url: string; annotations: AnnotationTruthV1[] }> = [];
    const durableByNote = new Map<string, AnnotationTruthV1[]>([
      [note.id, [initialA]],
      [noteB.id, [initialB]],
    ]);
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${noteB.id}`) return heldNoteB.promise;
      if (url === `/notes/${note.id}/blocks` || url === `/notes/${noteB.id}/blocks`) return { data: [] };
      if (url === `/canvas-objects/by-note/${note.id}` || url === `/canvas-objects/by-note/${noteB.id}`) {
        return { data: {} };
      }
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: durableByNote.get(note.id) };
      if (url === `/annotation-truths/by-note/${noteB.id}`) return { data: durableByNote.get(noteB.id) };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string, payload: { annotations?: AnnotationTruthV1[] }) => {
      const annotations = payload.annotations || [];
      annotationPutPayloads.push({ url, annotations });
      if (url !== `/annotation-truths/by-note/${note.id}`) throw new Error(`Unexpected PUT ${url}`);
      if (annotationPutPayloads.length === 1) return heldFirstPut.promise;
      durableByNote.set(note.id, annotations);
      return { data: annotations };
    });
    const subject = renderHook(
      ({ noteId }) => useNoteCanvasDataAdapter({ ...stableAdapterOptions, noteId }),
      { initialProps: { noteId: note.id }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initialA]));
    const capturedSaveA = subject.result.current.saveAnnotationTruths;

    let firstSave!: Promise<void>;
    let queuedSave!: Promise<void>;
    act(() => {
      firstSave = capturedSaveA([firstA]);
      queuedSave = capturedSaveA([queuedA]);
    });
    await waitFor(() => expect(annotationPutPayloads).toHaveLength(1));

    subject.rerender({ noteId: noteB.id });
    await act(async () => {
      await capturedSaveA([staleCallbackA]);
    });
    expect(subject.result.current.annotationTruths).toEqual([queuedA]);

    await act(async () => {
      heldFirstPut.resolve({ data: asServerHydratedAnnotations([firstA]) });
      await Promise.all([firstSave, queuedSave]);
    });
    expect(annotationPutPayloads).toHaveLength(1);
    expect(subject.result.current.annotationTruths).toEqual([queuedA]);

    await act(async () => {
      heldNoteB.resolve({ data: noteB });
    });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(noteB.id));
    expect(subject.result.current.annotationTruths).toEqual([initialB]);

    await act(async () => {
      await capturedSaveA([]);
    });
    expect(subject.result.current.annotationTruths).toEqual([initialB]);
    expect(annotationPutPayloads).toEqual([{ url: `/annotation-truths/by-note/${note.id}`, annotations: [firstA] }]);
    expect(consoleWarn).toHaveBeenCalledWith(
      'Rejected stale annotation save receipt:',
      expect.objectContaining({
        noteId: note.id,
        phase: expect.any(String),
        reason: 'route_receipt_stale',
      }),
    );
  });

  it('keeps an old A callback bound to its creation receipt across A to B to A', async () => {
    const noteB: Note = { ...note, id: 'note-2', title: 'Second note' };
    const initialA = annotationWithOffsets(note.id, 0, 4, 'alpha');
    const initialB = annotationWithOffsets(noteB.id, 8, 12, 'beta');
    const newerA = annotationWithOffsets(note.id, 4, 8, 'newer');
    const staleA = annotationWithOffsets(note.id, 1, 5, 'stale');
    const rangeBlock = serverBlock('alpha', false, 'range-edit-key');
    const heldBlockSave = deferred<{ data: NoteBlock }>();
    let blockPutCount = 0;
    const durableByNote = new Map<string, AnnotationTruthV1[]>([
      [note.id, [initialA]],
      [noteB.id, [initialB]],
    ]);
    const annotationPutPayloads: Array<{ url: string; annotations: AnnotationTruthV1[] }> = [];
    mocks.get.mockImplementation(async (url: string) => {
      const requestedNote = url === `/notes/${note.id}`
        ? note
        : url === `/notes/${noteB.id}`
          ? noteB
          : null;
      if (requestedNote) return { data: requestedNote };
      if (url === `/notes/${note.id}/blocks` || url === `/notes/${noteB.id}/blocks`) return { data: [] };
      if (url === `/canvas-objects/by-note/${note.id}` || url === `/canvas-objects/by-note/${noteB.id}`) {
        return { data: {} };
      }
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: durableByNote.get(note.id) };
      if (url === `/annotation-truths/by-note/${noteB.id}`) return { data: durableByNote.get(noteB.id) };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string, payload: { annotations?: AnnotationTruthV1[] }) => {
      if (url === `/note-blocks/${rangeBlock.id}`) {
        blockPutCount += 1;
        return heldBlockSave.promise;
      }
      const annotations = payload.annotations || [];
      annotationPutPayloads.push({ url, annotations });
      const targetNoteId = url === `/annotation-truths/by-note/${note.id}`
        ? note.id
        : url === `/annotation-truths/by-note/${noteB.id}`
          ? noteB.id
          : null;
      if (!targetNoteId) throw new Error(`Unexpected PUT ${url}`);
      durableByNote.set(targetNoteId, annotations);
      return { data: annotations };
    });
    const subject = renderHook(
      ({ noteId }) => useNoteCanvasDataAdapter({ ...stableAdapterOptions, noteId }),
      { initialProps: { noteId: note.id }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initialA]));
    const capturedSaveA = subject.result.current.saveAnnotationTruths;
    let rangeBlockSave!: Promise<BlockSaveOutcome>;
    act(() => {
      rangeBlockSave = subject.result.current.saveBlock(rangeBlock, 'stale body');
    });
    await waitFor(() => expect(blockPutCount).toBe(1));

    subject.rerender({ noteId: noteB.id });
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initialB]));

    durableByNote.set(note.id, [newerA]);
    subject.rerender({ noteId: note.id });
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([newerA]));

    let blockSaveReceipt!: BlockSaveOutcome;
    await act(async () => {
      heldBlockSave.resolve({ data: serverBlock('stale body', false, 'range-edit-key') });
      blockSaveReceipt = await rangeBlockSave;
      // The real range-edit carrier now stops on this stale outcome. Replay
      // the captured callback anyway to keep the creation-bound receipt as a
      // second, independently tested defense.
      await capturedSaveA([staleA]);
    });

    expect(blockSaveReceipt).toMatchObject({
      status: 'stale_epoch',
      reason: 'route_receipt_stale',
      reconciliation: 'read_failed',
      durableState: 'read_failed',
      recoveryReceipt: { text: 'stale body' },
    });
    expect(mocks.addToast).not.toHaveBeenCalledWith(
      'info',
      'A previous-visit block save was reconciled; review current content',
    );
    expect(annotationPutPayloads).toEqual([]);
    expect(durableByNote.get(note.id)).toEqual([newerA]);
    expect(subject.result.current.annotationTruths).toEqual([newerA]);
    expect(consoleWarn).toHaveBeenCalledWith(
      'Rejected stale annotation save receipt:',
      expect.objectContaining({
        noteId: note.id,
        phase: 'enqueue',
        reason: 'route_receipt_stale',
      }),
    );
  });

  it('keeps a rejected old A edit recoverable after A to B to A', async () => {
    const noteB: Note = { ...note, id: 'note-2', title: 'Second note' };
    const durableA = serverBlock('server old', false, 'route-reject-key');
    const heldSave = deferred<{ data: NoteBlock }>();
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${noteB.id}`) return { data: noteB };
      if (url === `/notes/${note.id}/blocks`) return { data: [durableA] };
      if (url === `/notes/${noteB.id}/blocks`) return { data: [] };
      if (url === `/canvas-objects/by-note/${note.id}` || url === `/canvas-objects/by-note/${noteB.id}`) {
        return { data: {} };
      }
      if (url === `/annotation-truths/by-note/${note.id}` || url === `/annotation-truths/by-note/${noteB.id}`) {
        return { data: [] };
      }
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string) => {
      if (url !== `/note-blocks/${durableA.id}`) throw new Error(`Unexpected PUT ${url}`);
      return heldSave.promise;
    });
    const subject = renderHook(
      ({ noteId }) => useNoteCanvasDataAdapter({ ...stableAdapterOptions, noteId }),
      { initialProps: { noteId: note.id }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.blocks[0]?.plain_text).toBe('server old'));
    act(() => {
      subject.result.current.setBlockTextDrafts({ [durableA.id]: 'user edit' });
    });
    let saveReceipt!: Promise<BlockSaveOutcome>;
    act(() => {
      saveReceipt = subject.result.current.saveBlock(durableA, 'user edit');
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));

    subject.rerender({ noteId: noteB.id });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(noteB.id));
    subject.rerender({ noteId: note.id });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));
    expect(subject.result.current.blocks[0]?.plain_text).toBe('server old');

    let outcome!: BlockSaveOutcome;
    await act(async () => {
      heldSave.reject(new Error('pre-commit reject after returning to A'));
      outcome = await saveReceipt;
    });
    expect(outcome).toMatchObject({
      status: 'rejected',
      reason: 'request_failed',
      reconciliation: 'read_failed',
      durableState: 'read_failed',
      staleEpoch: true,
      recoveryReceipt: {
        requestedNoteId: note.id,
        creationGeneration: 0,
        text: 'user edit',
      },
    });
    const userCanRecoverRejectedEdit = (
      subject.result.current.blockTextDrafts[durableA.id] === 'user edit'
      || subject.result.current.blocks.some((item) => (
        item.id === durableA.id && item.plain_text === 'user edit'
      ))
      || (sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2) || '').includes('user edit')
    );
    expect(userCanRecoverRejectedEdit).toBe(true);
    const queuedReceipt = subject.result.current.blockEditRecoveryReceipts[0];
    expect(queuedReceipt).toMatchObject({
      requestedNoteId: note.id,
      creationGeneration: 0,
      text: 'user edit',
    });
    act(() => {
      subject.result.current.setBlockTextDrafts({ [durableA.id]: 'new visit edit' });
    });
    act(() => {
      expect(subject.result.current.dismissBlockEditRecovery(queuedReceipt.recoveryKey)).toBe(true);
    });
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);
    expect(subject.result.current.blockTextDrafts[durableA.id]).toBe('new visit edit');
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2) || '').not.toContain('user edit');
  });

  it('reissues a queued edit only when the user explicitly applies its recovery receipt', async () => {
    let durableBlock = serverBlock('server old', false, 'explicit-recovery-key');
    let blockPutCount = 0;
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${note.id}/blocks`) return { data: [durableBlock] };
      if (url === `/canvas-objects/by-note/${note.id}`) return { data: {} };
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: [] };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url !== `/note-blocks/${durableBlock.id}`) throw new Error(`Unexpected PUT ${url}`);
      blockPutCount += 1;
      if (blockPutCount === 1) throw new Error('pre-commit rejection');
      durableBlock = {
        ...serverBlock(payload.plain_text as string, false, 'explicit-recovery-key'),
        content_json: payload.content_json as Record<string, unknown>,
        plain_text: payload.plain_text as string,
      };
      return { data: durableBlock };
    });
    const subject = renderHook(
      () => useNoteCanvasDataAdapter(stableAdapterOptions),
      { wrapper },
    );
    await waitFor(() => expect(subject.result.current.blocks[0]?.plain_text).toBe('server old'));

    await act(async () => {
      await subject.result.current.saveBlock(durableBlock, 'user edit');
    });
    const queuedReceipt = subject.result.current.blockEditRecoveryReceipts[0];
    expect(queuedReceipt).toMatchObject({ text: 'user edit' });
    expect(blockPutCount).toBe(1);

    let applied = false;
    await act(async () => {
      applied = await subject.result.current.applyBlockEditRecovery(queuedReceipt.recoveryKey);
    });

    expect(applied).toBe(true);
    expect(blockPutCount).toBe(2);
    expect(subject.result.current.blocks[0]?.plain_text).toBe('user edit');
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);
  });

  it('keeps a remounted save recoverable when the old mount settles before the new save rejects', async () => {
    mocks.coordinateContract = 'v2';
    let durableBlock = serverBlock('server old', false, 'remount-recovery-key');
    const heldOldSave = deferred<{ data: NoteBlock }>();
    const heldNewSave = deferred<{ data: NoteBlock }>();
    const newMountHydrated = vi.fn();
    const recoveryHydrated = vi.fn();
    let blockPutCount = 0;
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${note.id}/blocks`) return { data: [durableBlock] };
      if (url === `/canvas-objects/by-note/${note.id}`) return { data: {} };
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: [] };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string) => {
      if (url !== `/note-blocks/${durableBlock.id}`) throw new Error(`Unexpected PUT ${url}`);
      blockPutCount += 1;
      if (blockPutCount === 1) return heldOldSave.promise;
      if (blockPutCount === 2) return heldNewSave.promise;
      throw new Error(`Unexpected block PUT ${blockPutCount}`);
    });

    const oldMount = renderHook(
      () => useNoteCanvasDataAdapter(stableAdapterOptions),
      { wrapper },
    );
    await waitFor(() => expect(oldMount.result.current.blocks[0]?.plain_text).toBe('server old'));
    const oldBlock = oldMount.result.current.blocks[0];
    let oldSave!: Promise<BlockSaveOutcome>;
    act(() => {
      oldSave = oldMount.result.current.saveBlock(oldBlock, 'old mount edit');
    });
    await waitFor(() => expect(blockPutCount).toBe(1));
    const oldRecoveryKey = listBlockEditRecoveryReceipts(note.id)[0]?.recoveryKey;
    expect(oldRecoveryKey).toBeTruthy();
    expect(oldMount.result.current.blockEditRecoveryReceipts).toEqual([]);
    oldMount.unmount();

    const newMount = renderHook(
      ({ onNoteLoaded }) => useNoteCanvasDataAdapter({
        ...stableAdapterOptions,
        onNoteLoaded,
      }),
      { initialProps: { onNoteLoaded: newMountHydrated }, wrapper },
    );
    await waitFor(() => expect(newMountHydrated).toHaveBeenCalled());
    expect(newMount.result.current.coordinateContract).toBe('v2');
    expect(newMount.result.current.blockEditRecoveryReceipts).toEqual([
      expect.objectContaining({ recoveryKey: oldRecoveryKey, text: 'old mount edit' }),
    ]);
    const newBlock = newMount.result.current.blocks[0];
    let newSave!: Promise<BlockSaveOutcome>;
    act(() => {
      newSave = newMount.result.current.saveBlock(newBlock, 'new mount edit');
    });
    await waitFor(() => expect(blockPutCount).toBe(2));
    expect(newMount.result.current.blockEditRecoveryReceipts).toEqual([]);
    const newRecoveryKey = listBlockEditRecoveryReceipts(note.id)[0]?.recoveryKey;
    const newReceiptBytes = sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2);
    expect(newRecoveryKey).toBeTruthy();
    expect(newRecoveryKey).not.toBe(oldRecoveryKey);
    expect(newReceiptBytes).toContain('new mount edit');
    const toastCountBeforeOldSettle = mocks.addToast.mock.calls.length;

    let oldOutcome!: BlockSaveOutcome;
    await act(async () => {
      durableBlock = serverBlock('old mount edit', false, 'remount-recovery-key');
      heldOldSave.resolve({ data: durableBlock });
      oldOutcome = await oldSave;
    });

    expect(oldOutcome).toMatchObject({
      status: 'stale_epoch',
      reason: 'route_receipt_stale',
      reconciliation: 'read_failed',
      durableState: 'read_failed',
    });
    expect(mocks.addToast).toHaveBeenCalledTimes(toastCountBeforeOldSettle);
    expect(newMount.result.current.blocks[0]?.plain_text).toBe('server old');
    expect(newMount.result.current.savingBlockId).toBe(newBlock.id);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBe(newReceiptBytes);
    expect(listBlockEditRecoveryReceipts(note.id)).toEqual([
      expect.objectContaining({ recoveryKey: newRecoveryKey, text: 'new mount edit' }),
    ]);
    expect(newMount.result.current.blockEditRecoveryReceipts).toEqual([]);

    let newOutcome!: BlockSaveOutcome;
    await act(async () => {
      heldNewSave.reject(new Error('new mount pre-commit rejection'));
      newOutcome = await newSave;
    });
    expect(newOutcome).toMatchObject({
      status: 'rejected',
      reason: 'request_failed',
      recoveryReceipt: { recoveryKey: newRecoveryKey, text: 'new mount edit' },
    });
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toContain('new mount edit');

    newMount.rerender({ onNoteLoaded: recoveryHydrated });
    await waitFor(() => expect(recoveryHydrated).toHaveBeenCalled());
    expect(newMount.result.current.blockTextDrafts[newBlock.id]).toBe('new mount edit');
    expect(newMount.result.current.blockEditRecoveryReceipts).toEqual([
      expect.objectContaining({ recoveryKey: newRecoveryKey, text: 'new mount edit' }),
    ]);
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toContain('new mount edit');
  });

  it('keeps an old A settlement out of visible B and preserves its edit for return to A', async () => {
    const noteB: Note = { ...note, id: 'note-2', title: 'Second note' };
    const durableA = serverBlock('server old', false, 'route-settle-on-b-key');
    const heldSave = deferred<{ data: NoteBlock }>();
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${noteB.id}`) return { data: noteB };
      if (url === `/notes/${note.id}/blocks`) return { data: [durableA] };
      if (url === `/notes/${noteB.id}/blocks`) return { data: [] };
      if (url === `/canvas-objects/by-note/${note.id}` || url === `/canvas-objects/by-note/${noteB.id}`) {
        return { data: {} };
      }
      if (url === `/annotation-truths/by-note/${note.id}` || url === `/annotation-truths/by-note/${noteB.id}`) {
        return { data: [] };
      }
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string) => {
      if (url !== `/note-blocks/${durableA.id}`) throw new Error(`Unexpected PUT ${url}`);
      return heldSave.promise;
    });
    const subject = renderHook(
      ({ noteId }) => useNoteCanvasDataAdapter({ ...stableAdapterOptions, noteId }),
      { initialProps: { noteId: note.id }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.blocks[0]?.plain_text).toBe('server old'));
    act(() => {
      subject.result.current.setBlockTextDrafts({ [durableA.id]: 'user edit' });
    });
    let saveReceipt!: Promise<BlockSaveOutcome>;
    act(() => {
      saveReceipt = subject.result.current.saveBlock(durableA, 'user edit');
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));

    subject.rerender({ noteId: noteB.id });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(noteB.id));
    await waitFor(() => expect(subject.result.current.blocks).toEqual([]));
    const toastCountBeforeOldASettlement = mocks.addToast.mock.calls.length;

    let outcome!: BlockSaveOutcome;
    await act(async () => {
      heldSave.reject(new Error('pre-commit reject while B is visible'));
      outcome = await saveReceipt;
    });
    expect(outcome).toMatchObject({
      status: 'rejected',
      reason: 'request_failed',
      reconciliation: 'read_failed',
      durableState: 'read_failed',
      staleEpoch: true,
      recoveryReceipt: { text: 'user edit' },
    });
    const visibleBCrossPolluted = subject.result.current.blocks.some((item) => item.id === durableA.id);
    expect(subject.result.current.blockTextDrafts[durableA.id]).toBeUndefined();
    expect(subject.result.current.savingBlockId).toBeNull();
    expect(mocks.addToast).toHaveBeenCalledTimes(toastCountBeforeOldASettlement);

    subject.rerender({ noteId: note.id });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));
    const userCanRecoverOrWasNotified = (
      subject.result.current.blockTextDrafts[durableA.id] === 'user edit'
      || subject.result.current.blocks.some((item) => (
        item.id === durableA.id && item.plain_text === 'user edit'
      ))
      || (sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2) || '').includes('user edit')
      || mocks.addToast.mock.calls.some(([kind]) => kind === 'error' || kind === 'info')
    );
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([
      expect.objectContaining({ requestedNoteId: note.id, text: 'user edit' }),
    ]);
    expect({ visibleBCrossPolluted, userCanRecoverOrWasNotified }).toEqual({
      visibleBCrossPolluted: false,
      userCanRecoverOrWasNotified: true,
    });
  });

  it('rejects old annotation and block receipts after a successful same-note hydration', async () => {
    const initialA = annotationWithOffsets(note.id, 0, 4, 'alpha');
    const newerA = annotationWithOffsets(note.id, 4, 8, 'newer');
    const staleA = annotationWithOffsets(note.id, 1, 5, 'stale');
    const rangeBlock = serverBlock('alpha', false, 'same-note-range-edit-key');
    const heldBlockSave = deferred<{ data: NoteBlock }>();
    const firstHydration = vi.fn();
    const secondHydration = vi.fn();
    const annotationPutPayloads: AnnotationTruthV1[][] = [];
    let blockPutCount = 0;
    durableAnnotationTruths = [initialA];
    mocks.put.mockImplementation(async (url: string, payload: { annotations?: AnnotationTruthV1[] }) => {
      if (url === `/note-blocks/${rangeBlock.id}`) {
        blockPutCount += 1;
        return heldBlockSave.promise;
      }
      if (url !== `/annotation-truths/by-note/${note.id}`) throw new Error(`Unexpected PUT ${url}`);
      const annotations = payload.annotations || [];
      annotationPutPayloads.push(annotations);
      durableAnnotationTruths = annotations;
      return { data: annotations };
    });
    const subject = renderHook(
      ({ onNoteLoaded }) => useNoteCanvasDataAdapter({
        ...stableAdapterOptions,
        onNoteLoaded,
      }),
      { initialProps: { onNoteLoaded: firstHydration }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initialA]));
    expect(firstHydration).toHaveBeenCalled();
    const capturedSaveA = subject.result.current.saveAnnotationTruths;

    let heldBlockReceipt!: Promise<BlockSaveOutcome>;
    act(() => {
      heldBlockReceipt = subject.result.current.saveBlock(rangeBlock, 'stale body');
    });
    await waitFor(() => expect(blockPutCount).toBe(1));

    durableAnnotationTruths = [newerA];
    subject.rerender({ onNoteLoaded: secondHydration });
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([newerA]));
    expect(secondHydration).toHaveBeenCalled();

    let blockSaveReceipt!: BlockSaveOutcome;
    await act(async () => {
      heldBlockSave.resolve({ data: serverBlock('stale body', false, 'same-note-range-edit-key') });
      blockSaveReceipt = await heldBlockReceipt;
      await capturedSaveA([staleA]);
    });

    expect(annotationPutPayloads).toEqual([]);
    expect(blockSaveReceipt).toMatchObject({
      status: 'stale_epoch',
      reason: 'hydration_epoch_advanced',
      reconciliation: 'read_after_outcome',
    });
    expect(durableAnnotationTruths).toEqual([newerA]);
    expect(subject.result.current.annotationTruths).toEqual([newerA]);
    expect(consoleWarn).toHaveBeenCalledWith(
      'Rejected stale annotation save receipt:',
      expect.objectContaining({
        noteId: note.id,
        phase: 'enqueue',
        reason: 'route_receipt_stale',
      }),
    );
  });

  it('does not silently lose a legitimate block save crossed by same-note hydration', async () => {
    const serverFlow = createTextBlockContentV1('server old', 'paragraph');
    const userFlow = createTextBlockContentV1('user edit', 'paragraph');
    const userFields = {
      latex_input: 'user edit',
      formula_name: 'Recovered formula',
      explanation: 'Keep this companion field',
    };
    let durableBlock: NoteBlock = {
      ...serverBlock('server old', false, 'legitimate-edit-key'),
      block_type: 'formula',
      content_json: {
        body: 'server old',
        field_values: {
          latex_input: 'server old',
          formula_name: 'Server formula',
          explanation: 'Server explanation',
        },
        [TEXT_FLOW_CONTENT_KEY]: serverFlow,
      },
    };
    let rejectHeldBlockSave!: (reason?: unknown) => void;
    const heldBlockSave = new Promise<{ data: NoteBlock }>((_resolve, reject) => {
      rejectHeldBlockSave = reject;
    });
    const firstHydration = vi.fn();
    const secondHydration = vi.fn();
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${note.id}/blocks`) return { data: [durableBlock] };
      if (url === `/canvas-objects/by-note/${note.id}`) return { data: {} };
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: [] };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string) => {
      if (url !== `/note-blocks/${durableBlock.id}`) throw new Error(`Unexpected PUT ${url}`);
      return heldBlockSave;
    });
    const subject = renderHook(
      ({ onNoteLoaded }) => useNoteCanvasDataAdapter({
        ...stableAdapterOptions,
        onNoteLoaded,
      }),
      { initialProps: { onNoteLoaded: firstHydration }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.blocks[0]?.plain_text).toBe('server old'));

    act(() => {
      subject.result.current.setBlockTextDrafts({ [durableBlock.id]: 'user edit' });
      subject.result.current.setBlockTextFlowDrafts({ [durableBlock.id]: userFlow });
      subject.result.current.setBlockFieldDrafts({ [durableBlock.id]: userFields });
    });
    let saveReceipt!: Promise<BlockSaveOutcome>;
    act(() => {
      saveReceipt = subject.result.current.saveBlock(durableBlock, 'user edit', {
        fieldValues: userFields,
        textFlow: userFlow,
      });
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledWith(
      `/note-blocks/${durableBlock.id}`,
      expect.objectContaining({ plain_text: 'user edit' }),
    ));

    subject.rerender({ onNoteLoaded: secondHydration });
    await waitFor(() => expect(secondHydration).toHaveBeenCalled());
    await waitFor(() => expect(subject.result.current.blockTextDrafts[durableBlock.id]).toBe('user edit'));
    expect(subject.result.current.blockTextFlowDrafts[durableBlock.id]).toEqual(userFlow);
    expect(subject.result.current.blockFieldDrafts[durableBlock.id]).toEqual(userFields);

    let outcome!: BlockSaveOutcome;
    await act(async () => {
      rejectHeldBlockSave(new Error('pre-commit failure after hydration crossed the save'));
      outcome = await saveReceipt;
    });

    const userObservedReject = mocks.addToast.mock.calls.some((call) => (
      call[0] === 'error' && call[1] === 'Failed to save block'
    )) || consoleError.mock.calls.some((call) => call[0] === 'Failed to save block:');
    const durablePreserved = durableBlock.plain_text === 'user edit';
    const localDraftPreserved = subject.result.current.blockTextDrafts[durableBlock.id] === 'user edit';
    expect(outcome).toMatchObject({
      status: 'rejected',
      reconciliation: 'read_after_error',
      durableState: 'conflict',
      reason: 'request_failed',
      staleEpoch: true,
      recoveryReceipt: {
        kind: 'block_edit_recovery',
        noteId: note.id,
        blockId: durableBlock.id,
        text: 'user edit',
        textFlow: userFlow,
        fieldValues: userFields,
      },
    });
    expect(subject.result.current.blocks[0]?.plain_text).toBe('server old');
    expect(subject.result.current.blockTextFlowDrafts[durableBlock.id]).toEqual(userFlow);
    expect(subject.result.current.blockFieldDrafts[durableBlock.id]).toEqual(userFields);
    expect(subject.result.current.savingBlockId).toBeNull();
    expect(userObservedReject).toBe(true);
    expect(durablePreserved || localDraftPreserved || userObservedReject).toBe(true);
    expect(mocks.get.mock.calls.filter(([url]) => url === `/notes/${note.id}/blocks`)).toHaveLength(3);
  });

  it('returns stale_epoch and reconciles a successful held block PUT crossed by hydration', async () => {
    let durableBlock = serverBlock('server old', false, 'held-success-key');
    const heldBlockSave = deferred<{ data: NoteBlock }>();
    const firstHydration = vi.fn();
    const secondHydration = vi.fn();
    let issuedBlockPayload: Record<string, unknown> | null = null;
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${note.id}/blocks`) return { data: [durableBlock] };
      if (url === `/canvas-objects/by-note/${note.id}`) return { data: {} };
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: [] };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url !== `/note-blocks/${durableBlock.id}`) throw new Error(`Unexpected PUT ${url}`);
      issuedBlockPayload = payload;
      return heldBlockSave.promise;
    });
    const subject = renderHook(
      ({ onNoteLoaded }) => useNoteCanvasDataAdapter({
        ...stableAdapterOptions,
        onNoteLoaded,
      }),
      { initialProps: { onNoteLoaded: firstHydration }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.blocks[0]?.plain_text).toBe('server old'));

    act(() => {
      subject.result.current.setBlockTextDrafts({ [durableBlock.id]: 'user edit' });
    });
    let saveReceipt!: Promise<BlockSaveOutcome>;
    act(() => {
      saveReceipt = subject.result.current.saveBlock(durableBlock, 'user edit');
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));

    subject.rerender({ onNoteLoaded: secondHydration });
    await waitFor(() => expect(secondHydration).toHaveBeenCalled());
    await waitFor(() => expect(subject.result.current.blockTextDrafts[durableBlock.id]).toBe('user edit'));

    expect(issuedBlockPayload).not.toBeNull();
    const committedPayload = issuedBlockPayload as unknown as Record<string, unknown>;
    durableBlock = {
      ...serverBlock('user edit', false, 'held-success-key'),
      content_json: committedPayload.content_json as Record<string, unknown>,
      plain_text: committedPayload.plain_text as string,
    };
    const responseEcho = serverBlock('response echo', false, 'held-success-key');
    let outcome!: BlockSaveOutcome;
    await act(async () => {
      heldBlockSave.resolve({ data: responseEcho });
      outcome = await saveReceipt;
    });

    expect(outcome).toMatchObject({
      status: 'stale_epoch',
      block: { id: durableBlock.id, plain_text: 'user edit' },
      reconciliation: 'read_after_outcome',
      durableState: 'matches_requested',
      reason: 'hydration_epoch_advanced',
      recoveryReceipt: {
        kind: 'block_edit_recovery',
        text: 'user edit',
      },
    });
    expect(subject.result.current.blocks[0]?.plain_text).toBe('user edit');
    expect(subject.result.current.blockTextDrafts[durableBlock.id]).toBe('user edit');
    expect(subject.result.current.savingBlockId).toBeNull();
    expect(mocks.addToast).toHaveBeenCalledWith(
      'info',
      'Block save crossed a newer state; durable result reconciled',
    );
    expect(mocks.get.mock.calls.filter(([url]) => url === `/notes/${note.id}/blocks`)).toHaveLength(3);
  });

  it('keeps the latest same-block edit and saving token when an older save settles first', async () => {
    let durableBlock = serverBlock('server old', false, 'operation-order-key');
    const firstSave = deferred<{ data: NoteBlock }>();
    const secondSave = deferred<{ data: NoteBlock }>();
    let blockPutCount = 0;
    const blockPutPayloads: Record<string, unknown>[] = [];
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${note.id}/blocks`) return { data: [durableBlock] };
      if (url === `/canvas-objects/by-note/${note.id}`) return { data: {} };
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: [] };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url !== `/note-blocks/${durableBlock.id}`) throw new Error(`Unexpected PUT ${url}`);
      blockPutCount += 1;
      blockPutPayloads.push(payload);
      return blockPutCount === 1 ? firstSave.promise : secondSave.promise;
    });
    const subject = renderHook(
      () => useNoteCanvasDataAdapter(stableAdapterOptions),
      { wrapper },
    );
    await waitFor(() => expect(subject.result.current.blocks[0]?.plain_text).toBe('server old'));

    act(() => {
      subject.result.current.setBlockTextDrafts({ [durableBlock.id]: 'edit one' });
    });
    let firstReceipt!: Promise<BlockSaveOutcome>;
    act(() => {
      firstReceipt = subject.result.current.saveBlock(durableBlock, 'edit one');
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));

    act(() => {
      subject.result.current.setBlockTextDrafts({ [durableBlock.id]: 'edit two' });
    });
    await waitFor(() => expect(subject.result.current.blockTextDrafts[durableBlock.id]).toBe('edit two'));
    let secondReceipt!: Promise<BlockSaveOutcome>;
    act(() => {
      secondReceipt = subject.result.current.saveBlock(durableBlock, 'edit two');
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(2));

    durableBlock = {
      ...serverBlock('edit one', false, 'operation-order-key'),
      content_json: blockPutPayloads[0].content_json as Record<string, unknown>,
      plain_text: blockPutPayloads[0].plain_text as string,
    };
    let firstOutcome!: BlockSaveOutcome;
    await act(async () => {
      firstSave.resolve({ data: serverBlock('response echo one', false, 'operation-order-key') });
      firstOutcome = await firstReceipt;
    });
    expect(firstOutcome).toMatchObject({
      status: 'stale_epoch',
      reason: 'superseded_operation',
      reconciliation: 'read_after_outcome',
      durableState: 'matches_requested',
      block: { plain_text: 'edit one' },
    });
    expect(subject.result.current.blockTextDrafts[durableBlock.id]).toBe('edit two');
    expect(subject.result.current.savingBlockId).toBe(durableBlock.id);

    let secondOutcome!: BlockSaveOutcome;
    await act(async () => {
      secondSave.reject(new Error('latest save rejected'));
      secondOutcome = await secondReceipt;
    });
    expect(secondOutcome).toMatchObject({
      status: 'rejected',
      reason: 'request_failed',
      reconciliation: 'read_after_error',
      durableState: 'conflict',
      recoveryReceipt: { text: 'edit two' },
    });
    expect(subject.result.current.blocks[0]?.plain_text).toBe('edit one');
    expect(subject.result.current.blockTextDrafts[durableBlock.id]).toBe('edit two');
    expect(subject.result.current.savingBlockId).toBeNull();
  });

  it('retains a newer successful edit when an older in-flight PUT later becomes durable', async () => {
    let durableBlock = serverBlock('server old', false, 'late-old-write-key');
    const olderSave = deferred<{ data: NoteBlock }>();
    const blockPutPayloads: Record<string, unknown>[] = [];
    const firstHydration = vi.fn();
    const secondHydration = vi.fn();
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${note.id}/blocks`) return { data: [durableBlock] };
      if (url === `/canvas-objects/by-note/${note.id}`) return { data: {} };
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: [] };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url !== `/note-blocks/${durableBlock.id}`) throw new Error(`Unexpected PUT ${url}`);
      blockPutPayloads.push(payload);
      if (blockPutPayloads.length === 1) return olderSave.promise;
      durableBlock = {
        ...serverBlock('edit two', false, 'late-old-write-key'),
        content_json: payload.content_json as Record<string, unknown>,
        plain_text: payload.plain_text as string,
      };
      return { data: durableBlock };
    });
    const subject = renderHook(
      ({ onNoteLoaded }) => useNoteCanvasDataAdapter({
        ...stableAdapterOptions,
        onNoteLoaded,
      }),
      { initialProps: { onNoteLoaded: firstHydration }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.blocks[0]?.plain_text).toBe('server old'));

    act(() => {
      subject.result.current.setBlockTextDrafts({ [durableBlock.id]: 'edit one' });
    });
    let olderReceipt!: Promise<BlockSaveOutcome>;
    act(() => {
      olderReceipt = subject.result.current.saveBlock(durableBlock, 'edit one');
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));

    act(() => {
      subject.result.current.setBlockTextDrafts({ [durableBlock.id]: 'edit two' });
    });
    await waitFor(() => expect(subject.result.current.blockTextDrafts[durableBlock.id]).toBe('edit two'));
    let newerOutcome!: BlockSaveOutcome;
    await act(async () => {
      newerOutcome = await subject.result.current.saveBlock(durableBlock, 'edit two');
    });
    expect(newerOutcome).toMatchObject({ status: 'saved', block: { plain_text: 'edit two' } });
    expect(subject.result.current.blockTextDrafts[durableBlock.id]).toBe('edit two');
    expect(subject.result.current.savingBlockId).toBe(durableBlock.id);

    const olderPayload = blockPutPayloads[0];
    durableBlock = {
      ...serverBlock('edit one', false, 'late-old-write-key'),
      content_json: olderPayload.content_json as Record<string, unknown>,
      plain_text: olderPayload.plain_text as string,
    };
    let olderOutcome!: BlockSaveOutcome;
    await act(async () => {
      olderSave.resolve({ data: serverBlock('older response echo', false, 'late-old-write-key') });
      olderOutcome = await olderReceipt;
    });
    expect(olderOutcome).toMatchObject({
      status: 'stale_epoch',
      reason: 'superseded_operation',
      reconciliation: 'read_after_outcome',
      durableState: 'matches_requested',
    });
    expect(subject.result.current.blockTextDrafts[durableBlock.id]).toBe('edit two');
    expect(subject.result.current.savingBlockId).toBeNull();

    subject.rerender({ onNoteLoaded: secondHydration });
    await waitFor(() => expect(secondHydration).toHaveBeenCalled());
    expect(subject.result.current.blocks[0]?.plain_text).toBe('edit one');
    expect(subject.result.current.blockTextDrafts[durableBlock.id]).toBe('edit two');
  });

  it('does not let a held reconciliation read overwrite a newer save outcome', async () => {
    let durableBlock = serverBlock('server old', false, 'held-read-key');
    const olderSave = deferred<{ data: NoteBlock }>();
    const heldReconciliationRead = deferred<{ data: NoteBlock[] }>();
    const blockPutPayloads: Record<string, unknown>[] = [];
    const firstHydration = vi.fn();
    const secondHydration = vi.fn();
    let blockReadCount = 0;
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${note.id}/blocks`) {
        blockReadCount += 1;
        if (blockReadCount === 3) return heldReconciliationRead.promise;
        return { data: [durableBlock] };
      }
      if (url === `/canvas-objects/by-note/${note.id}`) return { data: {} };
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: [] };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url !== `/note-blocks/${durableBlock.id}`) throw new Error(`Unexpected PUT ${url}`);
      blockPutPayloads.push(payload);
      if (blockPutPayloads.length === 1) return olderSave.promise;
      durableBlock = {
        ...serverBlock('edit two', false, 'held-read-key'),
        content_json: payload.content_json as Record<string, unknown>,
        plain_text: payload.plain_text as string,
      };
      return { data: durableBlock };
    });
    const subject = renderHook(
      ({ onNoteLoaded }) => useNoteCanvasDataAdapter({
        ...stableAdapterOptions,
        onNoteLoaded,
      }),
      { initialProps: { onNoteLoaded: firstHydration }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.blocks[0]?.plain_text).toBe('server old'));
    const originalBlock = subject.result.current.blocks[0];

    act(() => {
      subject.result.current.setBlockTextDrafts({ [originalBlock.id]: 'edit one' });
    });
    let olderReceipt!: Promise<BlockSaveOutcome>;
    act(() => {
      olderReceipt = subject.result.current.saveBlock(originalBlock, 'edit one');
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    subject.rerender({ onNoteLoaded: secondHydration });
    await waitFor(() => expect(secondHydration).toHaveBeenCalled());

    const olderPayload = blockPutPayloads[0];
    const olderObservedBlock: NoteBlock = {
      ...serverBlock('edit one', false, 'held-read-key'),
      content_json: olderPayload.content_json as Record<string, unknown>,
      plain_text: olderPayload.plain_text as string,
    };
    durableBlock = olderObservedBlock as typeof durableBlock;
    act(() => {
      olderSave.resolve({ data: serverBlock('older response echo', false, 'held-read-key') });
    });
    await waitFor(() => expect(blockReadCount).toBe(3));

    act(() => {
      subject.result.current.setBlockTextDrafts({ [originalBlock.id]: 'edit two' });
    });
    let newerOutcome!: BlockSaveOutcome;
    await act(async () => {
      newerOutcome = await subject.result.current.saveBlock(originalBlock, 'edit two');
    });
    expect(newerOutcome).toMatchObject({ status: 'saved', block: { plain_text: 'edit two' } });
    expect(subject.result.current.blocks[0]?.plain_text).toBe('edit two');
    expect(subject.result.current.blockTextDrafts[originalBlock.id]).toBe('edit two');
    expect(subject.result.current.savingBlockId).toBe(originalBlock.id);

    let olderOutcome!: BlockSaveOutcome;
    await act(async () => {
      heldReconciliationRead.resolve({ data: [olderObservedBlock] });
      olderOutcome = await olderReceipt;
    });
    expect(olderOutcome).toMatchObject({
      status: 'stale_epoch',
      reconciliation: 'read_failed',
      durableState: 'read_failed',
      block: null,
    });
    expect(subject.result.current.blocks[0]?.plain_text).toBe('edit two');
    expect(subject.result.current.blockTextDrafts[originalBlock.id]).toBe('edit two');
    expect(subject.result.current.savingBlockId).toBeNull();
  });

  it('keeps recovery after a held reconciliation read is superseded by newer hydration', async () => {
    let durableBlock = serverBlock('server old', false, 'held-read-hydration-key');
    const heldSave = deferred<{ data: NoteBlock }>();
    const heldReconciliationRead = deferred<{ data: NoteBlock[] }>();
    const blockPutPayloads: Record<string, unknown>[] = [];
    const firstHydration = vi.fn();
    const secondHydration = vi.fn();
    const thirdHydration = vi.fn();
    const fourthHydration = vi.fn();
    let blockReadCount = 0;
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${note.id}/blocks`) {
        blockReadCount += 1;
        if (blockReadCount === 3) return heldReconciliationRead.promise;
        return { data: [durableBlock] };
      }
      if (url === `/canvas-objects/by-note/${note.id}`) return { data: {} };
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: [] };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url !== `/note-blocks/${durableBlock.id}`) throw new Error(`Unexpected PUT ${url}`);
      blockPutPayloads.push(payload);
      return heldSave.promise;
    });
    const subject = renderHook(
      ({ onNoteLoaded }) => useNoteCanvasDataAdapter({
        ...stableAdapterOptions,
        onNoteLoaded,
      }),
      { initialProps: { onNoteLoaded: firstHydration }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.blocks[0]?.plain_text).toBe('server old'));
    const originalBlock = subject.result.current.blocks[0];

    act(() => {
      subject.result.current.setBlockTextDrafts({ [originalBlock.id]: 'edit one' });
    });
    let saveReceipt!: Promise<BlockSaveOutcome>;
    act(() => {
      saveReceipt = subject.result.current.saveBlock(originalBlock, 'edit one');
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    subject.rerender({ onNoteLoaded: secondHydration });
    await waitFor(() => expect(secondHydration).toHaveBeenCalled());

    const committedPayload = blockPutPayloads[0];
    const staleObservedBlock: NoteBlock = {
      ...serverBlock('edit one', false, 'held-read-hydration-key'),
      content_json: committedPayload.content_json as Record<string, unknown>,
      plain_text: committedPayload.plain_text as string,
    };
    durableBlock = staleObservedBlock as typeof durableBlock;
    act(() => {
      heldSave.resolve({ data: serverBlock('response echo', false, 'held-read-hydration-key') });
    });
    await waitFor(() => expect(blockReadCount).toBe(3));

    durableBlock = serverBlock('server newer', false, 'held-read-hydration-key');
    subject.rerender({ onNoteLoaded: thirdHydration });
    await waitFor(() => expect(thirdHydration).toHaveBeenCalled());
    expect(subject.result.current.blocks[0]?.plain_text).toBe('server newer');
    expect(subject.result.current.blockTextDrafts[originalBlock.id]).toBe('edit one');
    const recoveryBytesBeforeStaleRead = sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2);
    const recoveryKeyBeforeStaleRead = listBlockEditRecoveryReceipts(note.id)[0]?.recoveryKey;
    expect(recoveryKeyBeforeStaleRead).toBeTruthy();
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);

    let outcome!: BlockSaveOutcome;
    await act(async () => {
      heldReconciliationRead.resolve({ data: [staleObservedBlock] });
      outcome = await saveReceipt;
    });
    expect(outcome).toMatchObject({
      status: 'stale_epoch',
      reconciliation: 'read_failed',
      durableState: 'read_failed',
      block: null,
    });
    expect(subject.result.current.blocks[0]?.plain_text).toBe('server newer');
    expect(subject.result.current.blockTextDrafts[originalBlock.id]).toBe('edit one');
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBe(recoveryBytesBeforeStaleRead);
    expect(subject.result.current.blockEditRecoveryReceipts[0]?.recoveryKey)
      .toBe(recoveryKeyBeforeStaleRead);

    subject.rerender({ onNoteLoaded: fourthHydration });
    await waitFor(() => expect(fourthHydration).toHaveBeenCalled());
    expect(subject.result.current.blocks[0]?.plain_text).toBe('server newer');
    expect(subject.result.current.blockTextDrafts[originalBlock.id]).toBe('edit one');
  });

  it('retains the pending edit and reports read_failed when stale success cannot be reread', async () => {
    const durableBlock = serverBlock('server old', false, 'read-failed-key');
    const heldBlockSave = deferred<{ data: NoteBlock }>();
    const firstHydration = vi.fn();
    const secondHydration = vi.fn();
    let blockReadCount = 0;
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${note.id}/blocks`) {
        blockReadCount += 1;
        if (blockReadCount <= 2) return { data: [durableBlock] };
        throw new Error('reconciliation read unavailable');
      }
      if (url === `/canvas-objects/by-note/${note.id}`) return { data: {} };
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: [] };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string) => {
      if (url !== `/note-blocks/${durableBlock.id}`) throw new Error(`Unexpected PUT ${url}`);
      return heldBlockSave.promise;
    });
    const subject = renderHook(
      ({ onNoteLoaded }) => useNoteCanvasDataAdapter({
        ...stableAdapterOptions,
        onNoteLoaded,
      }),
      { initialProps: { onNoteLoaded: firstHydration }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.blocks[0]?.plain_text).toBe('server old'));

    act(() => {
      subject.result.current.setBlockTextDrafts({ [durableBlock.id]: 'user edit' });
    });
    let saveReceipt!: Promise<BlockSaveOutcome>;
    act(() => {
      saveReceipt = subject.result.current.saveBlock(durableBlock, 'user edit');
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    subject.rerender({ onNoteLoaded: secondHydration });
    await waitFor(() => expect(secondHydration).toHaveBeenCalled());

    let outcome!: BlockSaveOutcome;
    await act(async () => {
      heldBlockSave.resolve({ data: serverBlock('response echo', false, 'read-failed-key') });
      outcome = await saveReceipt;
    });
    expect(outcome).toMatchObject({
      status: 'stale_epoch',
      reconciliation: 'read_failed',
      durableState: 'read_failed',
      recoveryReceipt: { text: 'user edit' },
    });
    expect(subject.result.current.blockTextDrafts[durableBlock.id]).toBe('user edit');
    expect(subject.result.current.savingBlockId).toBeNull();
    expect(mocks.addToast).toHaveBeenCalledWith(
      'error',
      'Block save result could not be reconciled',
    );
  });

  it('keeps sequential annotation saves current within one hydration epoch', async () => {
    const initialA = annotationWithOffsets(note.id, 0, 4, 'alpha');
    const firstA = annotationWithOffsets(note.id, 1, 5, 'lpha');
    const secondA = annotationWithOffsets(note.id, 2, 6, 'pha');
    const annotationPutPayloads: AnnotationTruthV1[][] = [];
    durableAnnotationTruths = [initialA];
    mocks.put.mockImplementation(async (url: string, payload: { annotations?: AnnotationTruthV1[] }) => {
      if (url !== `/annotation-truths/by-note/${note.id}`) throw new Error(`Unexpected PUT ${url}`);
      const annotations = payload.annotations || [];
      annotationPutPayloads.push(annotations);
      durableAnnotationTruths = annotations;
      return { data: annotations };
    });
    const subject = renderHook(
      () => useNoteCanvasDataAdapter(stableAdapterOptions),
      { wrapper },
    );
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initialA]));
    const saveInHydrationEpoch = subject.result.current.saveAnnotationTruths;

    await act(async () => {
      await saveInHydrationEpoch([firstA]);
      await saveInHydrationEpoch([secondA]);
    });

    expect(annotationPutPayloads).toEqual([[firstA], [secondA]]);
    expect(durableAnnotationTruths).toEqual([secondA]);
    expect(subject.result.current.annotationTruths).toEqual([secondA]);
  });

  it('persists rollback TextFlow and Formula companion fields through one block frontdoor PUT', async () => {
    const previousFlow = createTextBlockContentV1('alpha /heabeta', 'paragraph');
    const nextFlow = {
      ...previousFlow,
      units: previousFlow.units.map((unit) => ({ ...unit, text: 'alpha beta' })),
    };
    const formulaBlock: NoteBlock = {
      ...serverBlock('alpha /heabeta', false, 'formula-rollback-key'),
      block_type: 'formula',
      content_json: {
        body: 'alpha /heabeta',
        field_values: {
          latex_input: 'alpha /heabeta',
          formula_name: 'Euler',
          explanation: 'Keep me',
        },
        [TEXT_FLOW_CONTENT_KEY]: previousFlow,
      },
    };
    let blockPayload: Record<string, unknown> | null = null;
    mocks.put.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url !== `/note-blocks/${formulaBlock.id}`) throw new Error(`Unexpected PUT ${url}`);
      blockPayload = payload;
      return {
        data: {
          ...formulaBlock,
          content_json: payload.content_json,
          plain_text: payload.plain_text,
        },
      };
    });
    const subject = renderHook(
      () => useNoteCanvasDataAdapter(stableAdapterOptions),
      { wrapper },
    );
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));

    let receipt!: BlockSaveOutcome;
    await act(async () => {
      receipt = await subject.result.current.saveBlock(formulaBlock, 'alpha beta', {
        silent: true,
        fieldValues: {
          latex_input: 'alpha beta',
          formula_name: 'Euler',
          explanation: 'Keep me',
        },
        textFlow: nextFlow,
      });
    });

    expect(blockPayload).toMatchObject({
      content_json: {
        body: 'alpha beta',
        field_values: {
          latex_input: 'alpha beta',
          formula_name: 'Euler',
          explanation: 'Keep me',
        },
        [TEXT_FLOW_CONTENT_KEY]: nextFlow,
      },
      plain_text: 'alpha beta',
    });
    expect(receipt.status).toBe('saved');
    expect(receipt.block?.content_json).toMatchObject({
      field_values: { latex_input: 'alpha beta' },
      [TEXT_FLOW_CONTENT_KEY]: nextFlow,
    });
  });

  it('serializes a later A visit behind an in-flight publish from the earlier A visit', async () => {
    const noteB: Note = { ...note, id: 'note-2', title: 'Second note' };
    const initialA = annotationWithOffsets(note.id, 0, 4, 'alpha');
    const heldA = annotationWithOffsets(note.id, 1, 5, 'lpha');
    const initialB = annotationWithOffsets(noteB.id, 8, 12, 'beta');
    const newerA = annotationWithOffsets(note.id, 4, 8, 'newer');
    const finalA = annotationWithOffsets(note.id, 5, 9, 'final');
    const heldFirstA = deferred<{ data: AnnotationTruthV1[] }>();
    const durableByNote = new Map<string, AnnotationTruthV1[]>([
      [note.id, [initialA]],
      [noteB.id, [initialB]],
    ]);
    const annotationPutPayloads: AnnotationTruthV1[][] = [];
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${note.id}`) return { data: note };
      if (url === `/notes/${noteB.id}`) return { data: noteB };
      if (url === `/notes/${note.id}/blocks` || url === `/notes/${noteB.id}/blocks`) return { data: [] };
      if (url === `/canvas-objects/by-note/${note.id}` || url === `/canvas-objects/by-note/${noteB.id}`) {
        return { data: {} };
      }
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: durableByNote.get(note.id) };
      if (url === `/annotation-truths/by-note/${noteB.id}`) return { data: durableByNote.get(noteB.id) };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string, payload: { annotations?: AnnotationTruthV1[] }) => {
      if (url !== `/annotation-truths/by-note/${note.id}`) throw new Error(`Unexpected PUT ${url}`);
      const annotations = payload.annotations || [];
      annotationPutPayloads.push(annotations);
      if (annotationPutPayloads.length === 1) return heldFirstA.promise;
      durableByNote.set(note.id, annotations);
      return { data: annotations };
    });
    const subject = renderHook(
      ({ noteId }) => useNoteCanvasDataAdapter({ ...stableAdapterOptions, noteId }),
      { initialProps: { noteId: note.id }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initialA]));

    let firstA!: Promise<void>;
    act(() => {
      firstA = subject.result.current.saveAnnotationTruths([heldA]);
    });
    await waitFor(() => expect(annotationPutPayloads).toEqual([[heldA]]));

    subject.rerender({ noteId: noteB.id });
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initialB]));
    durableByNote.set(note.id, [newerA]);
    subject.rerender({ noteId: note.id });
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([newerA]));

    let secondA!: Promise<void>;
    act(() => {
      secondA = subject.result.current.saveAnnotationTruths([finalA]);
    });
    expect(annotationPutPayloads).toEqual([[heldA]]);
    expect(subject.result.current.annotationTruths).toEqual([finalA]);

    durableByNote.set(note.id, [heldA]);
    await act(async () => {
      heldFirstA.resolve({ data: asServerHydratedAnnotations([heldA]) });
      await Promise.all([firstA, secondA]);
    });

    expect(annotationPutPayloads).toEqual([[heldA], [finalA]]);
    expect(durableByNote.get(note.id)).toEqual([finalA]);
    expect(subject.result.current.annotationTruths).toEqual([finalA]);
  });

  it('starts note B publish at enqueue while note A publish is held', async () => {
    const noteB: Note = { ...note, id: 'note-2', title: 'Second note' };
    const initialA = annotationWithOffsets(note.id, 0, 4, 'alpha');
    const editA = annotationWithOffsets(note.id, 1, 5, 'lpha');
    const initialB = annotationWithOffsets(noteB.id, 8, 12, 'beta');
    const editB = annotationWithOffsets(noteB.id, 9, 13, 'eta');
    const heldA = deferred<{ data: AnnotationTruthV1[] }>();
    const durableByNote = new Map<string, AnnotationTruthV1[]>([
      [note.id, [initialA]],
      [noteB.id, [initialB]],
    ]);
    const annotationPutPayloads: Array<{ url: string; annotations: AnnotationTruthV1[] }> = [];
    mocks.get.mockImplementation(async (url: string) => {
      const requestedNote = url === `/notes/${note.id}`
        ? note
        : url === `/notes/${noteB.id}`
          ? noteB
          : null;
      if (requestedNote) return { data: requestedNote };
      if (
        url === `/notes/${note.id}/blocks`
        || url === `/notes/${noteB.id}/blocks`
      ) return { data: [] };
      if (
        url === `/canvas-objects/by-note/${note.id}`
        || url === `/canvas-objects/by-note/${noteB.id}`
      ) return { data: {} };
      if (url === `/annotation-truths/by-note/${note.id}`) return { data: durableByNote.get(note.id) };
      if (url === `/annotation-truths/by-note/${noteB.id}`) return { data: durableByNote.get(noteB.id) };
      if (
        url === '/content-groups'
        || url === '/group-folders'
        || url === '/purposes'
        || url === '/templates'
      ) return { data: [] };
      throw new Error(`Unexpected GET ${url}`);
    });
    mocks.put.mockImplementation(async (url: string, payload: { annotations?: AnnotationTruthV1[] }) => {
      const annotations = payload.annotations || [];
      annotationPutPayloads.push({ url, annotations });
      if (url === `/annotation-truths/by-note/${note.id}`) return heldA.promise;
      if (url === `/annotation-truths/by-note/${noteB.id}`) {
        durableByNote.set(noteB.id, annotations);
        return { data: annotations };
      }
      throw new Error(`Unexpected PUT ${url}`);
    });
    const subject = renderHook(
      ({ noteId }) => useNoteCanvasDataAdapter({ ...stableAdapterOptions, noteId }),
      { initialProps: { noteId: note.id }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initialA]));

    let saveA!: Promise<void>;
    act(() => {
      saveA = subject.result.current.saveAnnotationTruths([editA]);
    });
    await waitFor(() => expect(annotationPutPayloads).toHaveLength(1));

    subject.rerender({ noteId: noteB.id });
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initialB]));

    let saveB!: Promise<void>;
    act(() => {
      saveB = subject.result.current.saveAnnotationTruths([editB]);
    });
    const bStartedAtEnqueue = annotationPutPayloads.some(({ url }) => (
      url === `/annotation-truths/by-note/${noteB.id}`
    ));

    subject.rerender({ noteId: note.id });
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initialA]));

    durableByNote.set(note.id, [editA]);
    await act(async () => {
      heldA.resolve({ data: asServerHydratedAnnotations([editA]) });
      await Promise.all([saveA, saveB]);
    });

    expect(bStartedAtEnqueue).toBe(true);
    expect(annotationPutPayloads).toEqual([
      { url: `/annotation-truths/by-note/${note.id}`, annotations: [editA] },
      { url: `/annotation-truths/by-note/${noteB.id}`, annotations: [editB] },
    ]);
    expect(durableByNote.get(noteB.id)).toEqual([editB]);
    expect(subject.result.current.annotationTruths).toEqual([initialA]);
  });

  it('passes reused=true through from the authoritative API receipt', async () => {
    mocks.post.mockResolvedValueOnce({ data: serverBlock('ab', true) });
    const subject = renderHook(
      () => useNoteCanvasDataAdapter(stableAdapterOptions),
      { wrapper },
    );
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));

    let created: Awaited<ReturnType<typeof subject.result.current.createDraftBlock>> = null;
    await act(async () => {
      created = await subject.result.current.createDraftBlock(
        subject.result.current.defaultTextTemplate,
        'ab',
        { clientCreateKey: 'retry-key' },
      );
    });

    expect(created).toEqual(expect.objectContaining({
      block: expect.objectContaining({ id: 'block-1' }),
      clientCreateKey: 'retry-key',
      placementPersisted: true,
      reused: true,
    }));
    expect(mocks.post).toHaveBeenCalledWith(
      `/notes/${note.id}/blocks`,
      expect.objectContaining({ client_create_key: 'retry-key', plain_text: 'ab' }),
    );
  });

  it('drives response-loss replay through adapter and controller to a latest PUT on Page', async () => {
    let durableText = '';
    const createPayloads: Array<Record<string, unknown>> = [];
    mocks.post.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url !== `/notes/${note.id}/blocks`) throw new Error(`Unexpected POST ${url}`);
      createPayloads.push(payload);
      if (createPayloads.length === 1) {
        durableText = String(payload.plain_text);
        throw new Error('response lost after commit');
      }
      return {
        data: serverBlock('a', true, String(payload.client_create_key)),
      };
    });
    mocks.put.mockImplementation(async (url: string, payload: Record<string, any>) => {
      if (url.includes('/block-placements/')) {
        return {
          data: {
            placement_id: 'placement-1',
            block_id: 'block-1',
            layout: payload.layout,
          },
        };
      }
      if (url === '/note-blocks/block-1') {
        durableText = payload.plain_text;
        return { data: serverBlock(durableText, true) };
      }
      throw new Error(`Unexpected PUT ${url}`);
    });

    const subject = renderHook(() => {
      const adapter = useNoteCanvasDataAdapter(stableAdapterOptions);
      const controller = useDraftBlockController({
        createBlock: adapter.createDraftBlock,
        defaultDraftLayout: { ...defaultDraftLayout, surface: 'formal_page', boundary_role: 'inside' },
        defaultTextTemplate: adapter.defaultTextTemplate,
        discardDraftBlock: adapter.discardDraftBlock,
        finalizeDraftBlock: adapter.finalizeDraftBlock,
        note: adapter.note,
        onDraftFocusReceipt: stableControllerCallbacks.onDraftFocusReceipt,
        saveBlock: adapter.saveBlock,
        saveDraftBlockPlacement: adapter.saveDraftBlockPlacement,
        setActiveBlockId: stableControllerCallbacks.setActiveBlockId,
        setFocusBlockId: stableControllerCallbacks.setFocusBlockId,
        setInteractionState: stableControllerCallbacks.setInteractionState,
        setSelectedBlockId: stableControllerCallbacks.setSelectedBlockId,
      });
      return { adapter, controller };
    }, { wrapper });
    await waitFor(() => expect(subject.result.current.adapter.note?.id).toBe(note.id));

    act(() => {
      subject.result.current.controller.activateDraft();
      subject.result.current.controller.setDraftText('a');
    });
    await act(async () => {
      await subject.result.current.controller.persistDraft('a');
    });
    expect(durableText).toBe('a');

    act(() => subject.result.current.controller.setDraftText('ab'));
    await act(async () => {
      await subject.result.current.controller.persistDraft('ab');
    });

    expect(createPayloads).toHaveLength(2);
    expect(createPayloads.map((payload) => payload.plain_text)).toEqual(['a', 'ab']);
    expect(createPayloads[1]?.client_create_key).toBe(createPayloads[0]?.client_create_key);
    const latestPuts = mocks.put.mock.calls.filter(([url]) => url === '/note-blocks/block-1');
    expect(latestPuts).toHaveLength(1);
    expect(latestPuts[0]?.[1]).toEqual(expect.objectContaining({ plain_text: 'ab' }));
    expect(durableText).toBe('ab');
  });

  it('notifies once and performs no recovery write for an ownerless v1 receipt', async () => {
    const rawV1 = {
      version: 1,
      noteId: 'old-note',
      clientCreateKey: 'legacy-ownerless-key',
      text: 'queued text',
      layout: { x: 0, y: 48, width: 540, height: 80 },
      template: recoveryTemplate,
      queuedAt: '2026-08-20T00:00:00.000Z',
    };
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V1, JSON.stringify([rawV1]));
    canvasPersistenceResponse = {
      pageFrameCollection: {
        pageFrames: [],
        pageStacks: [],
        primaryFrameId: null,
      },
    };

    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => {
      expect(subject.result.current.pageFrameCollection).not.toBeNull();
      expect(mocks.addToast).toHaveBeenCalledTimes(1);
    });

    expect(mocks.addToast).toHaveBeenCalledWith(
      'error',
      'A previous-note draft needs attention and remains queued',
    );
    expect(mocks.addToast).toHaveBeenCalledTimes(1);
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V1))
      .toBe(JSON.stringify([rawV1]));
  });

  it('does not auto-replay or rewrite an explicit block edit hybrid receipt', async () => {
    const mountNonce = 'hybrid-edit-mount';
    const hybridRaw = {
      version: 2,
      noteId: note.id,
      clientCreateKey: 'hybrid-create-key',
      text: 'hybrid edit',
      contentJson: { body: 'hybrid edit' },
      layout: defaultDraftLayout,
      template: recoveryTemplate,
      queuedAt: '2026-08-20T00:00:00.000Z',
      kind: 'block_edit_recovery',
      recoveryKey: createBlockEditRecoveryKey(note.id, 'block-1', 0, 1, mountNonce),
      requestedNoteId: note.id,
      mountNonce,
      creationGeneration: 0,
      operationSequence: 1,
      blockId: 'block-1',
      plainText: 'hybrid edit',
      hydrationEpoch: 0,
    };
    const rawBytes = JSON.stringify([hybridRaw]);
    sessionStorage.setItem(DRAFT_RECOVERY_STORAGE_KEY_V2, rawBytes);

    const subject = renderHook(
      () => useNoteCanvasDataAdapter(stableAdapterOptions),
      { wrapper },
    );
    await waitFor(() => expect(stableAdapterOptions.onNoteLoaded).toHaveBeenCalled());

    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([
      expect.objectContaining({
        recoveryKey: hybridRaw.recoveryKey,
        text: 'hybrid edit',
      }),
    ]);
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBe(rawBytes);
  });

  it.each([
    [1, DRAFT_RECOVERY_STORAGE_KEY_V1],
    [2, DRAFT_RECOVERY_STORAGE_KEY_V2],
  ] as const)(
    'performs no POST or PUT for a contradictory crossing raw v%s tuple',
    async (version, storageKey) => {
      const raw = contradictoryCrossingReceipt(version, `adapter-contradictory-v${version}`);
      const rawBytes = JSON.stringify([raw]);
      sessionStorage.setItem(storageKey, rawBytes);

      renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
      await waitFor(() => expect(mocks.addToast).toHaveBeenCalledWith(
        'error',
        'A previous-note draft needs attention and remains queued',
      ));

      expect(mocks.post).not.toHaveBeenCalled();
      expect(mocks.put).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(storageKey)).toBe(rawBytes);
    },
  );

  it.each([
    ['inside claimed over outside geometry', 1, 'inside-as-outside'],
    ['inside claimed over outside geometry', 2, 'inside-as-outside'],
    ['crossing claimed over inside geometry', 1, 'crossing-as-inside'],
    ['crossing claimed over inside geometry', 2, 'crossing-as-inside'],
  ] as const)(
    'performs no POST or PUT for %s in raw v%s',
    async (_label, version, contradiction) => {
      const storageKey = version === 1
        ? DRAFT_RECOVERY_STORAGE_KEY_V1
        : DRAFT_RECOVERY_STORAGE_KEY_V2;
      const raw = geometryContradictionReceipt(
        version,
        `adapter-geometry-${contradiction}-v${version}`,
        contradiction,
      );
      const rawBytes = JSON.stringify([raw]);
      sessionStorage.setItem(storageKey, rawBytes);
      canvasPersistenceResponse = {
        pageFrameCollection: {
          pageFrames: [],
          pageStacks: [],
          primaryFrameId: null,
        },
      };

      const subject = renderHook(
        () => useNoteCanvasDataAdapter(stableAdapterOptions),
        { wrapper },
      );
      await waitFor(() => {
        expect(subject.result.current.pageFrameCollection).not.toBeNull();
        expect(mocks.addToast).toHaveBeenCalledTimes(1);
      });

      expect(mocks.addToast).toHaveBeenCalledWith(
        'error',
        'A previous-note draft needs attention and remains queued',
      );
      expect(mocks.addToast).toHaveBeenCalledTimes(1);
      expect(mocks.post).not.toHaveBeenCalled();
      expect(mocks.put).not.toHaveBeenCalled();
      expect(sessionStorage.getItem(storageKey)).toBe(rawBytes);
    },
  );
});
