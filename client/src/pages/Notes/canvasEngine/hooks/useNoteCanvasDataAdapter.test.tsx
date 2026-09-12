import { act, renderHook, waitFor } from '@testing-library/react';
import { useRef, type ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnnotationTruthV1, Note, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import type { BoardTextRangeV1 } from '../../../../../../shared/types/boardTextRange';
import {
  DRAFT_RECOVERY_STORAGE_KEY_V1,
  DRAFT_RECOVERY_STORAGE_KEY_V2,
  createBlockEditRecoveryKey,
  listBlockEditRecoveryReceipts,
  rememberBlockEditRecoveryReceipt,
  type BlockEditRecoveryReceipt,
} from '../draftBlockPersistence';
import { createTextBlockContentV1, getTextFlowContent, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { NOTE_SLASH_COMMANDS } from '../../noteSlashCommands';
import * as canvasObjectRepository from '../canvasObjectRepository';
import { normalizePageFrameCollection } from '../pageFrameCollectionService';
import { resolveScreenRect } from '../placementContractService';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { PageFrameCollectionModel } from '../types';
import { useDraftBlockController } from './useDraftBlockController';
import { usePlacementHistory } from './usePlacementHistory';
import { useSlashBlockRollbackController } from './useSlashBlockRollbackController';
import { useSlashCommandController } from './useSlashCommandController';
import { useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';
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
  atomicPut: vi.fn(),
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
    put: (url: string, ...args: unknown[]) => url.endsWith('/text-save')
      ? mocks.atomicPut(url, ...args)
      : url.startsWith('/boards/text-ranges/by-note/')
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

function renderAtomicHistory() {
  return renderHook(() => {
    const adapter = useNoteCanvasDataAdapter(stableAdapterOptions);
    const host = useRef<TextFlowHistoryHost | null>(null);
    const editing = useTextFlowHistory({
      noteId: note.id, generation: adapter.textHistoryGeneration, blocks: adapter.blocks,
      annotationTruths: adapter.annotationTruths, readAnnotationTruths: adapter.readAnnotationTruths,
      setAnnotationTruthsSnapshot: adapter.setAnnotationTruthsSnapshot, saveAnnotationTruthsOutcome: adapter.saveAnnotationTruthsOutcome,
      blockTextFlowDrafts: adapter.blockTextFlowDrafts, setBlockTextFlowDrafts: adapter.setBlockTextFlowDrafts,
      setBlockTextDrafts: adapter.setBlockTextDrafts, captureBoardTextRanges: adapter.captureBoardTextRanges,
      restoreBoardTextRanges: adapter.restoreBoardTextRanges, rebaseBoardTextRanges: adapter.rebaseBoardTextRanges,
      saveBlock: adapter.saveBlock, history: host,
    });
    const history = usePlacementHistory({ noteId: note.id, generation: adapter.textHistoryGeneration,
      beforeHistoryBoundary: () => editing.boundary(), applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(), target: null });
    host.current = history;
    return { adapter, editing, history };
  }, { wrapper });
}

// The synthetic server consumes request intent without storing it on range rows.
const persistedRangeFields = (input: (Partial<BoardTextRangeV1> & { history_restore?: true }) | undefined) => {
  const { history_restore: _historyRestore, ...range } = input ?? {};
  return range;
};

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
    mocks.put.mockImplementation(async (_url: string, payload: object) => ({ data: { ...durableBlocks[0], ...payload } }));
    // The old per-resource callbacks remain fixture seams for held responses and
    // failures. Production sends one HTTP call, recorded separately by atomicPut.
    mocks.atomicPut.mockImplementation(async (url: string, payload: {
      note_id: string; base_revision: number; block: Partial<NoteBlock>;
      annotations: { range_updates: { annotation_id: string; range: AnnotationTruthV1['ranges'][number] }[] };
      text_ranges: BoardTextRangeV1[];
    }) => {
      const beforeBlocks = structuredClone(durableBlocks);
      const beforeAnnotations = structuredClone(durableAnnotationTruths);
      try {
        const response = await mocks.put(url.slice(0, -'/text-save'.length), payload.block);
        const blockId = url.split('/')[2];
        const savedBlock = { ...beforeBlocks.find((block) => block.id === blockId), ...payload.block, ...response?.data,
          text_save_revision: payload.base_revision + 1 };
        durableBlocks = durableBlocks.map((block) => block.id === blockId ? { ...block, ...savedBlock } : block);
        durableAnnotationTruths = durableAnnotationTruths.map((annotation) => ({ ...annotation, ranges: annotation.ranges.map((range) =>
          structuredClone(payload.annotations.range_updates.find((update) => update.annotation_id === annotation.id && update.range.id === range.id)?.range ?? range)) }));
        const rangeResponse = payload.text_ranges.length
          ? await mocks.boardRangesPut(`/boards/text-ranges/by-note/${payload.note_id}`, { text_ranges: payload.text_ranges.map(persistedRangeFields) })
          : { data: { text_ranges: [] } };
        return { data: { block: savedBlock, annotations: structuredClone(durableAnnotationTruths),
          text_ranges: rangeResponse.data.text_ranges, revision: payload.base_revision + 1 } };
      } catch (error) {
        durableBlocks = beforeBlocks;
        durableAnnotationTruths = beforeAnnotations;
        throw error;
      }
    });
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

  it.each(['none', 'placement', 'order'] as const)('13.6 media creation saves order or rolls back and drains failures (%s)', async (failure) => {
    mocks.coordinateContract = 'v2';
    const collection = f11RuntimeCollection();
    const anchor = serverBlock('anchor', false);
    const following = { ...serverBlock('following', false), id: 'following', placement_id: 'following-placement', order_index: 1 };
    durableBlocks = [anchor, following];
    canvasPersistenceResponse = { pageFrameCollection: collection };
    const originalGet = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation(async (url: string) => url.endsWith('/page-frame-collection') ? { data: collection } : originalGet(url));
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    const template = subject.result.current.templateOptions.find((entry) => entry.legacy_block_type === 'media')!;
    const layout: BlockBoxLayout = { x: 0, y: 100, width: 400, height: 20, width_mode: 'manual',
      frame_id: collection.primaryFrameId!, coordinate_space: 'page_frame_local', surface: 'formal_page', boundary_role: 'inside' };
    const metadataPatch = { media: { asset_id: '13060000-0000-4000-8000-000000000001', naturalWidth: 800, naturalHeight: 40 } };
    mocks.post.mockImplementation(async (_url, body) => ({ data: { ...serverBlock('', false), ...body,
      id: 'media', placement_id: 'media-placement', order_index: 2 } }));
    mocks.put.mockImplementation(async (url, body) => {
      if (url.includes('/block-placements/')) {
        if (failure === 'placement') throw new Error('Placement unavailable');
        return f11PlacementResponse(url, body);
      }
      if (url.endsWith('/blocks/reorder') && failure === 'order') throw new Error('Order unavailable');
      return { data: {} };
    });
    mocks.delete.mockResolvedValue({ data: { success: true } });
    await act(async () => {
      const created = await subject.result.current.createBlock(template, '', { contentJson: {}, metadataPatch, layout, afterBlockId: anchor.id, silent: true });
      if (failure !== 'none') expect(created).toBeNull();
      else expect(created?.order_index).toBe(1);
    });
    expect(mocks.post).toHaveBeenCalledWith(`/notes/${note.id}/blocks`, expect.objectContaining({ block_type: 'media', content_json: {}, metadata: expect.objectContaining(metadataPatch) }));
    await expect(subject.result.current.whenIdle()).resolves.toBeUndefined();
    if (failure !== 'none') {
      expect(mocks.delete).toHaveBeenCalledWith('/note-blocks/media');
      expect(subject.result.current.blocks.map((block) => block.id)).toEqual([anchor.id, 'following']);
      expect(mocks.addToast).toHaveBeenCalledWith('error', 'The image could not be placed. Please paste it again.');
      return;
    }
    expect(mocks.put).toHaveBeenCalledWith(`/notes/${note.id}/blocks/reorder`, { placements: [
      { placement_id: anchor.placement_id, order_index: 0 }, { placement_id: 'media-placement', order_index: 1 }, { placement_id: following.placement_id, order_index: 2 },
    ] });
    expect(subject.result.current.sortedBlocks.map((block) => block.id)).toEqual([anchor.id, 'media', 'following']);
    expect(subject.result.current.blocks.find((block) => block.id === 'media')?.canvas_layout).toEqual(expect.objectContaining(layout));
  });

  function c3TransferFixture(options: {
    lostResponse?: boolean;
    staleAddress?: 'text unit' | 'inline' | 'board unit';
    held?: Promise<void>;
  } = {}) {
    const sourceFlow = createTextBlockContentV1('move', 'quote');
    const targetFlow = createTextBlockContentV1('stay', 'heading');
    sourceFlow.inline_structures.push({ id: 'inline', parent_text_unit_id: 'tu-1', semantic_kind: 'inline_code',
      anchor_range: { start: 0, end: 4 }, anchor_text: 'move', field_values: { language: 'text' }, metadata: { source: true }, status: 'active' });
    targetFlow.inline_structures.push({ ...sourceFlow.inline_structures[0], anchor_text: 'stay', metadata: { target: true } });
    const source = { ...serverBlock('move', false), text_save_revision: 0,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: sourceFlow, retained: 'source' } };
    const target = { ...serverBlock('stay', false), id: 'destination', text_save_revision: 0,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: targetFlow, retained: 'target' } };
    const originals = [source, target].map((block, index) => {
      const annotation = annotationWithOffsets(note.id, 0, 4, index ? 'stay' : 'move');
      return { ...annotation, id: `annotation-${block.id}`, ranges: [
        { ...annotation.ranges[0], id: `span-${block.id}`, block_id: block.id, text_flow_id: `textflow-${block.id}` },
        { id: `inline-${block.id}`, target_kind: 'inline_structure' as const, block_id: block.id,
          text_flow_id: `textflow-${block.id}`, inline_structure_id: 'inline', metadata: { retained: index } },
      ] };
    });
    const originalBoardRanges: BoardTextRangeV1[] = [source, target].map((block, index) => ({
      id: `board-${block.id}`, note_id: note.id, board_id: 'board', block_id: block.id, text_flow_id: `textflow-${block.id}`,
      text_unit_id: 'tu-1', start_offset: 0, end_offset: 4, excerpt: index ? 'stay' : 'move', status: 'active',
      pre_edit_offsets: null, at: 'at', created_at: 'created', updated_at: 'updated',
    }));
    const idMapping = { unit_id: 'tu-1-move-fixed', inline_ids: { inline: 'inline-move-fixed' } };
    const sourceAfter = { ...sourceFlow, units: [], inline_structures: [] };
    const targetAfter = { ...targetFlow, units: [{ ...sourceFlow.units[0], id: idMapping.unit_id },
      { ...targetFlow.units[0], order_index: 1 }], inline_structures: [...targetFlow.inline_structures,
      { ...sourceFlow.inline_structures[0], id: idMapping.inline_ids.inline, parent_text_unit_id: idMapping.unit_id }] };
    const expectedAnnotations = structuredClone(originals);
    expectedAnnotations[0].ranges = expectedAnnotations[0].ranges.map((range) => ({ ...range,
      block_id: target.id, text_flow_id: `textflow-${target.id}`,
      ...('text_unit_id' in range ? { text_unit_id: idMapping.unit_id } : { inline_structure_id: idMapping.inline_ids.inline }),
    }));
    const expectedBoardRanges = originalBoardRanges.map((range, index) => index ? range : { ...range,
      block_id: target.id, text_flow_id: `textflow-${target.id}`, text_unit_id: idMapping.unit_id });
    durableBlocks = structuredClone([source, target]);
    durableAnnotationTruths = structuredClone(originals);
    let durableBoardRanges = structuredClone(originalBoardRanges);
    mocks.boardRangesGet.mockImplementation(async () => ({ data: { text_ranges: structuredClone(durableBoardRanges) } }));
    mocks.put.mockImplementation(async (url, payload) => {
      if (url.endsWith('/unit-transfer')) {
        expect(url).toBe(`/note-blocks/${target.id}/unit-transfer`);
        expect(payload).toMatchObject({ source_block_id: source.id, text_unit_id: 'tu-1', id_mapping: idMapping,
          source_base_revision: 0, target_base_revision: 0 });
        await options.held;
        const sourceBlock = { ...source, ...payload.source_block, text_save_revision: 1 };
        const targetBlock = { ...target, ...payload.target_block, text_save_revision: 1 };
        durableBlocks = [sourceBlock, targetBlock];
        durableAnnotationTruths = structuredClone(expectedAnnotations);
        durableBoardRanges = structuredClone(expectedBoardRanges);
        if (options.staleAddress === 'text unit') durableAnnotationTruths[0].ranges[0].text_unit_id = 'tu-1';
        if (options.staleAddress === 'inline') durableAnnotationTruths[0].ranges[1].inline_structure_id = 'inline';
        if (options.staleAddress === 'board unit') durableBoardRanges[0].text_unit_id = 'tu-1';
        if (options.lostResponse) throw new Error('response lost after collision transfer');
        return { data: { source_block: sourceBlock, target_block: targetBlock, source_revision: 1, target_revision: 1,
          annotations: structuredClone(durableAnnotationTruths), text_ranges: structuredClone(durableBoardRanges) } };
      }
      expect(url).toBe(`/annotation-truths/by-note/${note.id}`);
      durableAnnotationTruths = structuredClone(payload.annotations);
      return { data: structuredClone(durableAnnotationTruths) };
    });
    const input = { sourceBlock: source, targetBlock: target, textUnitId: 'tu-1', idMapping,
      sourceTextFlow: sourceAfter, targetTextFlow: targetAfter, sourceBaseRevision: 0, targetBaseRevision: 0,
      sourcePayload: { content_json: { ...source.content_json, [TEXT_FLOW_CONTENT_KEY]: sourceAfter }, plain_text: '' },
      targetPayload: { content_json: { ...target.content_json, [TEXT_FLOW_CONTENT_KEY]: targetAfter }, plain_text: 'move\nstay' },
    };
    return { input, source, target, originals, expectedAnnotations, originalBoardRanges, expectedBoardRanges };
  }

  it.each([false, true])('C3 real adapter and repository confirm mapped unit, inline and board addresses (lost response: %s)', async (lostResponse) => {
    const fixture = c3TransferFixture({ lostResponse });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    const readsBefore = mocks.get.mock.calls.length;
    let receipt: Awaited<ReturnType<typeof subject.result.current.transferTextUnit>> = null;
    await act(async () => { receipt = await subject.result.current.transferTextUnit(fixture.input); });
    expect(receipt).not.toBeNull();
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(subject.result.current.blocks.map((block) => block.content_json)).toEqual([
      fixture.input.sourcePayload.content_json, fixture.input.targetPayload.content_json,
    ]);
    expect(subject.result.current.annotationTruths).toEqual(fixture.expectedAnnotations);
    expect(subject.result.current.captureBoardTextRanges(fixture.source.id).ranges).toEqual([]);
    expect(subject.result.current.captureBoardTextRanges(fixture.target.id).ranges).toEqual(fixture.expectedBoardRanges);
    expect(durableAnnotationTruths[1]).toEqual(fixture.originals[1]);
    expect(fixture.expectedBoardRanges[1]).toEqual(fixture.originalBoardRanges[1]);
    if (lostResponse) {
      expect(mocks.get.mock.calls.slice(readsBefore).map(([url]) => url)).toEqual(expect.arrayContaining([
        `/notes/${note.id}/blocks`, `/annotation-truths/by-note/${note.id}`,
      ]));
      expect(mocks.boardRangesGet.mock.calls.length).toBeGreaterThan(1);
    }
    expect(mocks.boardRangesPut).not.toHaveBeenCalled();
  });

  it.each([
    { lostResponse: false, staleAddress: 'text unit' as const },
    { lostResponse: true, staleAddress: 'text unit' as const },
    { lostResponse: false, staleAddress: 'inline' as const },
    { lostResponse: true, staleAddress: 'inline' as const },
    { lostResponse: false, staleAddress: 'board unit' as const },
    { lostResponse: true, staleAddress: 'board unit' as const },
  ])('C3 does not confirm stale $staleAddress ownership even when its block and flow match (lost response: $lostResponse)', async (options) => {
    const fixture = c3TransferFixture(options);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    await act(async () => { expect(await subject.result.current.transferTextUnit(fixture.input)).toBeNull(); });
    expect(subject.result.current.blocks.map((block) => block.text_save_revision)).toEqual([0, 0]);
    expect(subject.result.current.annotationTruths).toEqual(fixture.originals);
    expect(subject.result.current.captureBoardTextRanges(fixture.source.id).ranges).toEqual([fixture.originalBoardRanges[0]]);
    expect(mocks.put).toHaveBeenCalledTimes(1);
  });

  it('C3 retains optimistic rename and color while the pending save inherits both mapped unit and inline ownership', async () => {
    const held = deferred<void>();
    const fixture = c3TransferFixture({ held: held.promise });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    let transfer!: ReturnType<typeof subject.result.current.transferTextUnit>;
    act(() => { transfer = subject.result.current.transferTextUnit(fixture.input); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    let rename!: Promise<boolean>;
    act(() => { rename = subject.result.current.saveAnnotationTruthsOutcome(subject.result.current.annotationTruths
      .map((annotation, index) => index ? annotation : { ...annotation, raw_label: 'renamed during collision move' })); });
    let color!: Promise<boolean>;
    act(() => { color = subject.result.current.saveAnnotationTruthsOutcome(subject.result.current.annotationTruths
      .map((annotation, index) => index ? annotation : { ...annotation, visual_style: { ...annotation.visual_style, color_token: 'green' } })); });
    expect(subject.result.current.annotationTruths[0]).toMatchObject({ raw_label: 'renamed during collision move',
      visual_style: { color_token: 'green' } });
    expect(mocks.put).toHaveBeenCalledTimes(1);
    await act(async () => { held.resolve(); expect(await transfer).not.toBeNull(); expect(await rename).toBe(true); expect(await color).toBe(true); });
    const expected = structuredClone(fixture.expectedAnnotations);
    expected[0].raw_label = 'renamed during collision move'; expected[0].visual_style.color_token = 'green';
    expect(durableAnnotationTruths).toEqual(expected);
    expect(subject.result.current.annotationTruths).toEqual(expected);
    const annotationWrites = mocks.put.mock.calls.filter(([url]) => url === `/annotation-truths/by-note/${note.id}`);
    expect(annotationWrites).toHaveLength(2);
    for (const [, payload] of annotationWrites) expect(payload.annotations[0].ranges).toEqual(fixture.expectedAnnotations[0].ranges);
    expect(subject.result.current.captureBoardTextRanges(fixture.target.id).ranges).toEqual(fixture.expectedBoardRanges);
  });

  it.each([
    { lostResponse: false, nullPlainText: false },
    { lostResponse: true, nullPlainText: false },
    { lostResponse: true, nullPlainText: true },
  ])('B10 real adapter restores complete payloads without adding body (lost response: $lostResponse, null: $nullPlainText)', async ({ lostResponse, nullPlainText }) => {
    const originalFlow = createTextBlockContentV1('move me', 'todo_item');
    originalFlow.units[0].metadata = { checked: true };
    const empty = { ...createTextBlockContentV1(''), units: [] };
    const source = { ...serverBlock('move me', false), text_save_revision: 0,
      title: 'keep title', metadata: { keep: true }, plain_text: nullPlainText ? null : 'move me',
      content_json: { [TEXT_FLOW_CONTENT_KEY]: originalFlow, sentinel: { nested: 'keep' } } };
    const target = { ...serverBlock('', false), id: 'destination', text_save_revision: 0,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: empty, sentinel: 'destination' } };
    durableBlocks = structuredClone([source, target]);
    const originalAnnotations = [annotationWithOffsets(note.id, 0, 4, 'move')];
    durableAnnotationTruths = structuredClone(originalAnnotations);
    const movedFlow = structuredClone(originalFlow);
    let loseResponse = lostResponse;
    mocks.put.mockImplementation(async (url, payload) => {
      expect(url).toContain('/unit-transfer');
      const sourceId = payload.source_block_id;
      const targetId = url.split('/')[2];
      const sourceBlock = { ...durableBlocks.find((block) => block.id === sourceId)!, ...payload.source_block,
        text_save_revision: payload.source_base_revision + 1 };
      const targetBlock = { ...durableBlocks.find((block) => block.id === targetId)!, ...payload.target_block,
        text_save_revision: payload.target_base_revision + 1 };
      durableBlocks = durableBlocks.map((block) => block.id === sourceId ? sourceBlock : targetBlock);
      durableAnnotationTruths = durableAnnotationTruths.map((annotation) => ({ ...annotation, ranges: annotation.ranges.map((range) =>
        range.block_id === sourceId ? { ...range, block_id: targetId, text_flow_id: `textflow-${targetId}` } : range) }));
      if (loseResponse) { loseResponse = false; throw new Error('response lost after the atomic commit'); }
      return { data: { source_block: sourceBlock, target_block: targetBlock, source_revision: sourceBlock.text_save_revision,
        target_revision: targetBlock.text_save_revision, annotations: structuredClone(durableAnnotationTruths), text_ranges: [] } };
    });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    const sourceAfter = { content_json: { ...source.content_json, [TEXT_FLOW_CONTENT_KEY]: empty }, plain_text: '' };
    const targetAfter = { content_json: { ...target.content_json, [TEXT_FLOW_CONTENT_KEY]: movedFlow }, plain_text: 'move me' };
    let moved: Awaited<ReturnType<typeof subject.result.current.transferTextUnit>> = null;
    await act(async () => { moved = await subject.result.current.transferTextUnit({ sourceBlock: source, targetBlock: target,
      textUnitId: 'tu-1', sourceTextFlow: empty, targetTextFlow: movedFlow, sourceBaseRevision: 0, targetBaseRevision: 0,
      sourcePayload: sourceAfter, targetPayload: targetAfter }); });
    expect(moved).not.toBeNull();
    expect(mocks.put).toHaveBeenCalledTimes(1);
    loseResponse = nullPlainText;
    await act(async () => { expect(await subject.result.current.transferTextUnit({
      sourceBlock: subject.result.current.blocks.find((block) => block.id === target.id)!,
      targetBlock: subject.result.current.blocks.find((block) => block.id === source.id)!, textUnitId: 'tu-1',
      sourceTextFlow: empty, targetTextFlow: originalFlow, sourceBaseRevision: 1, targetBaseRevision: 1,
      sourcePayload: { content_json: target.content_json, plain_text: target.plain_text },
      targetPayload: { content_json: source.content_json, plain_text: source.plain_text },
    })).not.toBeNull(); });
    expect(durableBlocks).toEqual([{ ...source, text_save_revision: 2 }, { ...target, text_save_revision: 2 }]);
    expect(durableBlocks[0].content_json).not.toHaveProperty('body');
    expect(subject.result.current.blocks[0].content_json).toEqual(source.content_json);
    expect(subject.result.current.annotationTruths[0].raw_label).toBe(originalAnnotations[0].raw_label);
    expect(subject.result.current.annotationTruths[0].ranges[0]).toMatchObject({ block_id: source.id, text_flow_id: `textflow-${source.id}` });
  });

  it('B10 keeps an optimistic rename then color change while waiting for confirmed range ownership', async () => {
    const flow = createTextBlockContentV1('move');
    const empty = { ...createTextBlockContentV1(''), units: [] };
    const source = { ...serverBlock('move', false), text_save_revision: 0, content_json: { [TEXT_FLOW_CONTENT_KEY]: flow } };
    const target = { ...serverBlock('', false), id: 'destination', text_save_revision: 0, content_json: { [TEXT_FLOW_CONTENT_KEY]: empty } };
    durableBlocks = [source, target];
    durableAnnotationTruths = [annotationWithOffsets(note.id, 0, 4, 'move')];
    const held = deferred<void>();
    mocks.put.mockImplementation(async (url, payload) => {
      if (url.endsWith('/unit-transfer')) {
        await held.promise;
        const sourceBlock = { ...source, ...payload.source_block, text_save_revision: 1 };
        const targetBlock = { ...target, ...payload.target_block, text_save_revision: 1 };
        durableBlocks = [sourceBlock, targetBlock];
        durableAnnotationTruths = durableAnnotationTruths.map((annotation) => ({ ...annotation, ranges: annotation.ranges.map((range) => ({
          ...range, block_id: target.id, text_flow_id: `textflow-${target.id}`,
        })) }));
        return { data: { source_block: sourceBlock, target_block: targetBlock, source_revision: 1, target_revision: 1,
          annotations: structuredClone(durableAnnotationTruths), text_ranges: [] } };
      }
      expect(url).toBe(`/annotation-truths/by-note/${note.id}`);
      durableAnnotationTruths = structuredClone(payload.annotations);
      return { data: durableAnnotationTruths };
    });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    let transfer!: Promise<unknown>;
    act(() => { transfer = subject.result.current.transferTextUnit({ sourceBlock: source, targetBlock: target, textUnitId: 'tu-1',
      sourceTextFlow: empty, targetTextFlow: flow, sourceBaseRevision: 0, targetBaseRevision: 0 }); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    let rename!: Promise<boolean>;
    act(() => { rename = subject.result.current.saveAnnotationTruthsOutcome(subject.result.current.annotationTruths
      .map((annotation) => ({ ...annotation, raw_label: 'new label during transfer' }))); });
    expect(subject.result.current.annotationTruths[0].raw_label).toBe('new label during transfer');
    let color!: Promise<boolean>;
    act(() => { color = subject.result.current.saveAnnotationTruthsOutcome(subject.result.current.annotationTruths
      .map((annotation) => ({ ...annotation, visual_style: { ...annotation.visual_style, color_token: 'green' } }))); });
    expect(mocks.put).toHaveBeenCalledTimes(1);
    await act(async () => { held.resolve(); await transfer; expect(await rename).toBe(true); expect(await color).toBe(true); });
    expect(durableAnnotationTruths[0].raw_label).toBe('new label during transfer');
    expect(durableAnnotationTruths[0].ranges[0]).toMatchObject({ block_id: target.id, text_flow_id: `textflow-${target.id}` });
    expect(subject.result.current.annotationTruths[0].raw_label).toBe('new label during transfer');
    expect(durableAnnotationTruths[0].visual_style.color_token).toBe('green');
  });

  it('B10 blocks waiting and later annotation saves after an unconfirmed move until retry verifies the commit', async () => {
    const flow = createTextBlockContentV1('move');
    const empty = { ...createTextBlockContentV1(''), units: [] };
    const source = { ...serverBlock('move', false), text_save_revision: 0, content_json: { [TEXT_FLOW_CONTENT_KEY]: flow } };
    const target = { ...serverBlock('', false), id: 'destination', text_save_revision: 0, content_json: { [TEXT_FLOW_CONTENT_KEY]: empty } };
    durableBlocks = [source, target];
    durableAnnotationTruths = [annotationWithOffsets(note.id, 0, 4, 'move')];
    const held = deferred<void>();
    let committed = false;
    let readUnavailable = false;
    const ordinaryGet = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation(async (...args) => {
      if (readUnavailable) throw new Error('read unavailable after commit');
      return ordinaryGet(...args);
    });
    mocks.put.mockImplementation(async (url, payload) => {
      if (url.endsWith('/unit-transfer')) {
        if (committed) throw new Error('strict OCC rejects replay');
        await held.promise;
        durableBlocks = [{ ...source, ...payload.source_block, text_save_revision: 1 },
          { ...target, ...payload.target_block, text_save_revision: 1 }];
        durableAnnotationTruths = durableAnnotationTruths.map((annotation) => ({ ...annotation, ranges: annotation.ranges.map((range) => ({
          ...range, block_id: target.id, text_flow_id: `textflow-${target.id}`,
        })) }));
        committed = true; readUnavailable = true;
        throw new Error('response lost after commit');
      }
      expect(url).toBe(`/annotation-truths/by-note/${note.id}`);
      durableAnnotationTruths = structuredClone(payload.annotations);
      return { data: durableAnnotationTruths };
    });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    const input = { sourceBlock: source, targetBlock: target, textUnitId: 'tu-1',
      sourceTextFlow: empty, targetTextFlow: flow, sourceBaseRevision: 0, targetBaseRevision: 0 };
    let transfer!: ReturnType<typeof subject.result.current.transferTextUnit>;
    act(() => { transfer = subject.result.current.transferTextUnit(input); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    let rename!: Promise<boolean>;
    act(() => { rename = subject.result.current.saveAnnotationTruthsOutcome(subject.result.current.annotationTruths
      .map((annotation) => ({ ...annotation, raw_label: 'pending rename' }))); });
    await act(async () => { held.resolve(); expect(await transfer).toBeNull(); expect(await rename).toBe(false); });
    await act(async () => { expect(await subject.result.current.saveAnnotationTruthsOutcome(subject.result.current.annotationTruths)).toBe(false); });
    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(durableAnnotationTruths[0].ranges[0].block_id).toBe(target.id);
    expect(mocks.addToast).toHaveBeenCalledWith('error', expect.stringContaining('unit move is not confirmed'));
    readUnavailable = false;
    await act(async () => { expect(await subject.result.current.transferTextUnit(input)).not.toBeNull(); });
    expect(subject.result.current.annotationTruths[0].raw_label).toBe('pending rename');
    await act(async () => { expect(await subject.result.current.saveAnnotationTruthsOutcome(subject.result.current.annotationTruths)).toBe(true); });
    expect(durableAnnotationTruths[0].raw_label).toBe('pending rename');
    expect(durableAnnotationTruths[0].ranges[0].block_id).toBe(target.id);
  });

  it.each(['before', 'after'] as const)('F17 sends explicit %s history intent and freezes its range set through a failed replay retry', async (side) => {
    const flow = createTextBlockContentV1('alpha beta gamma');
    const original = { ...serverBlock('alpha beta gamma', false), text_save_revision: 0,
      content_json: { body: 'alpha beta gamma', [TEXT_FLOW_CONTENT_KEY]: flow } };
    durableBlocks = [structuredClone(original)];
    const range: BoardTextRangeV1 = {
      id: 'f17-range', board_id: 'board', note_id: note.id, block_id: original.id,
      text_flow_id: `textflow-${original.id}`, text_unit_id: flow.units[0].id,
      start_offset: 6, end_offset: 10, excerpt: 'beta', status: 'active', pre_edit_offsets: null,
      at: 'at', created_at: 'created', updated_at: 'updated',
    };
    let durableRanges = [structuredClone(range)];
    mocks.boardRangesGet.mockImplementation(async () => ({ data: { text_ranges: structuredClone(durableRanges) } }));
    mocks.boardRangesPut.mockImplementation(async (_url, payload: { text_ranges: Partial<BoardTextRangeV1>[] }) => {
      durableRanges = durableRanges.map((current) => ({ ...current, ...payload.text_ranges.find((update) => update.id === current.id) }));
      return { data: { text_ranges: structuredClone(durableRanges) } };
    });
    const subject = renderAtomicHistory();
    await waitFor(() => expect(subject.result.current.adapter.loading).toBe(false));
    const edited = structuredClone(flow);
    edited.units[0].text = 'a';
    await act(async () => {
      await subject.result.current.editing.applyEdit(original, edited);
      subject.result.current.editing.boundary('blur');
      await subject.result.current.history.whenHistoryIdle();
    });
    expect(mocks.atomicPut).toHaveBeenCalledTimes(1);
    expect(mocks.atomicPut.mock.calls[0][1].text_ranges[0]).not.toHaveProperty('history_restore');
    const drifted = structuredClone(durableRanges[0]);
    expect(drifted).toMatchObject({ status: 'drifted', pre_edit_offsets: { start_offset: 6, end_offset: 10 } });
    if (side === 'after') {
      await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(true); });
    }
    const replay = () => side === 'before'
      ? subject.result.current.history.undoRuntimeHistory()
      : subject.result.current.history.redoRuntimeHistory();
    mocks.atomicPut.mockRejectedValueOnce(new Error('F17 synthetic history restore unavailable'));
    await act(async () => { expect(await replay()).toBe(false); });
    const failedPayload = mocks.atomicPut.mock.calls[mocks.atomicPut.mock.calls.length - 1][1];
    expect(failedPayload.text_ranges).toEqual([expect.objectContaining({ id: range.id, history_restore: true })]);
    const receipts = subject.result.current.adapter.blockEditRecoveryReceipts;
    expect(receipts[receipts.length - 1]?.boardRangeSnapshot).toMatchObject({ historyRestore: true });
    expect(mocks.addToast).toHaveBeenCalledWith('error', 'Failed to save block');
    await expect(subject.result.current.editing.flush()).rejects.toThrow('could not be saved');
    const laterRange = { ...range, id: 'f17-later-independent', start_offset: 0, end_offset: 1, excerpt: 'a' };
    durableRanges.push(laterRange);
    await act(async () => { await subject.result.current.adapter.refreshBoardTextRanges(); });
    await act(async () => {
      expect(await subject.result.current.editing.saveBlock(subject.result.current.adapter.blocks[0], 'stale blur draft', {
        textFlow: createTextBlockContentV1('stale blur draft'),
      })).toMatchObject({ status: 'saved' });
    });
    const retryPayload = mocks.atomicPut.mock.calls[mocks.atomicPut.mock.calls.length - 1][1];
    expect(retryPayload).toEqual(failedPayload);
    expect(retryPayload.text_ranges.map((update: { id: string }) => update.id)).toEqual([range.id]);
    expect(durableRanges).toEqual([side === 'before' ? range : drifted, laterRange]);
    expect(subject.result.current.adapter.blockTextFlowDrafts[original.id]).toEqual(side === 'before' ? flow : edited);
    await expect(subject.result.current.editing.flush()).resolves.toBeUndefined();
    // A successful retry preserves the original entry until the history host
    // moves it; that movement and the opposite direction both remain usable.
    await act(async () => { expect(await replay()).toBe(true); });
    await act(async () => {
      expect(await (side === 'before' ? subject.result.current.history.redoRuntimeHistory() : subject.result.current.history.undoRuntimeHistory())).toBe(true);
    });
    expect(mocks.atomicPut.mock.calls.slice(1).every(([, payload]) => payload.text_ranges.every(
      (update: { history_restore?: true }) => update.history_restore === true,
    ))).toBe(true);
  });

  it('F17 preserves explicit history intent when applying a retained block recovery receipt', async () => {
    const flow = createTextBlockContentV1('alpha beta gamma');
    const original = { ...serverBlock('alpha beta gamma', false), text_save_revision: 0,
      content_json: { body: 'alpha beta gamma', [TEXT_FLOW_CONTENT_KEY]: flow } };
    durableBlocks = [original];
    const range: BoardTextRangeV1 = {
      id: 'f17-receipt-range', board_id: 'board', note_id: note.id, block_id: original.id,
      text_flow_id: `textflow-${original.id}`, text_unit_id: flow.units[0].id,
      start_offset: 6, end_offset: 10, excerpt: 'beta', status: 'active', pre_edit_offsets: null,
      at: 'at', created_at: 'created', updated_at: 'updated',
    };
    mocks.boardRangesGet.mockResolvedValue({ data: { text_ranges: [range] } });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    mocks.atomicPut.mockRejectedValueOnce(new Error('F17 retained history request unavailable'));
    await act(async () => {
      expect(await subject.result.current.saveBlock(original, original.plain_text!, {
        textFlow: flow, boardRangeSnapshot: { ranges: [range], historyRestore: true },
      })).toMatchObject({ status: 'rejected' });
    });
    const receipt = subject.result.current.blockEditRecoveryReceipts[0];
    expect(receipt.boardRangeSnapshot).toEqual({ ranges: [range], historyRestore: true });
    await act(async () => { expect(await subject.result.current.applyBlockEditRecovery(receipt.recoveryKey)).toBe(true); });
    expect(mocks.atomicPut.mock.calls.map(([, payload]) => payload.text_ranges[0].history_restore)).toEqual([true, true]);
    expect(mocks.atomicPut.mock.calls[1][1]).toEqual(mocks.atomicPut.mock.calls[0][1]);
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);
  });

  it('B7 smoke 4: one composite failure retains the entry, retries all resources, and undoes with the confirmed revision', async () => {
    const originalFlow = createTextBlockContentV1('alpha beta gamma');
    const original = { ...serverBlock('alpha beta gamma', false), text_save_revision: 3,
      content_json: { body: 'alpha beta gamma', [TEXT_FLOW_CONTENT_KEY]: originalFlow } };
    durableBlocks = [structuredClone(original)];
    durableAnnotationTruths = [annotationWithOffsets(note.id, 6, 10, 'beta')];
    const initialAnnotations = structuredClone(durableAnnotationTruths);
    const range: BoardTextRangeV1 = {
      id: 'b7-range', board_id: 'board', note_id: note.id, block_id: original.id,
      text_flow_id: `textflow-${original.id}`, text_unit_id: originalFlow.units[0].id,
      start_offset: 6, end_offset: 10, excerpt: 'beta', status: 'active', pre_edit_offsets: null,
      at: 'at', created_at: 'created', updated_at: 'updated',
    };
    let durableRanges = [structuredClone(range)];
    mocks.boardRangesGet.mockImplementation(async () => ({ data: { text_ranges: structuredClone(durableRanges) } }));
    let rejectOnce = true;
    mocks.atomicPut.mockImplementation(async (_url, payload) => {
      expect(payload.base_revision).toBe(durableBlocks[0].text_save_revision);
      expect(payload.annotations.range_updates).toHaveLength(1);
      expect(payload.text_ranges).toHaveLength(1);
      if (rejectOnce) { rejectOnce = false; throw new Error('synthetic annotation validation rejected'); }
      const revision = payload.base_revision + 1;
      durableBlocks = [{ ...durableBlocks[0], ...structuredClone(payload.block), text_save_revision: revision }];
      durableAnnotationTruths = durableAnnotationTruths.map((annotation) => ({ ...annotation,
        ranges: annotation.ranges.map((current) => structuredClone(payload.annotations.range_updates.find(
          (update: { annotation_id: string; range: { id: string } }) => update.annotation_id === annotation.id && update.range.id === current.id,
        )?.range ?? current)) }));
      durableRanges = durableRanges.map((current) => ({ ...current, ...structuredClone(persistedRangeFields(payload.text_ranges.find((entry: { id: string }) => entry.id === current.id))) }));
      return { data: { block: structuredClone(durableBlocks[0]), annotations: structuredClone(durableAnnotationTruths), text_ranges: structuredClone(durableRanges), revision } };
    });
    const subject = renderHook(() => {
      const adapter = useNoteCanvasDataAdapter(stableAdapterOptions);
      const host = useRef<TextFlowHistoryHost | null>(null);
      const editing = useTextFlowHistory({
        noteId: note.id, generation: adapter.textHistoryGeneration, blocks: adapter.blocks,
        annotationTruths: adapter.annotationTruths, readAnnotationTruths: adapter.readAnnotationTruths,
        setAnnotationTruthsSnapshot: adapter.setAnnotationTruthsSnapshot, saveAnnotationTruthsOutcome: adapter.saveAnnotationTruthsOutcome,
        blockTextFlowDrafts: adapter.blockTextFlowDrafts, setBlockTextFlowDrafts: adapter.setBlockTextFlowDrafts,
        setBlockTextDrafts: adapter.setBlockTextDrafts, captureBoardTextRanges: adapter.captureBoardTextRanges,
        restoreBoardTextRanges: adapter.restoreBoardTextRanges, rebaseBoardTextRanges: adapter.rebaseBoardTextRanges,
        saveBlock: adapter.saveBlock, history: host,
      });
      const history = usePlacementHistory({ noteId: note.id, generation: adapter.textHistoryGeneration,
        beforeHistoryBoundary: () => editing.boundary(), applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(), target: null });
      host.current = history;
      return { adapter, editing, history };
    }, { wrapper });
    await waitFor(() => expect(subject.result.current.adapter.loading).toBe(false));
    const edited = structuredClone(originalFlow);
    edited.units[0].text = 'prefix alpha beta gamma';
    await act(async () => {
      await subject.result.current.editing.applyEdit(original, edited);
      subject.result.current.editing.boundary('blur');
      await subject.result.current.history.whenHistoryIdle();
    });
    expect(durableBlocks).toEqual([original]);
    expect(durableAnnotationTruths).toEqual(initialAnnotations);
    expect(durableRanges).toEqual([range]);
    await expect(subject.result.current.editing.flush()).rejects.toThrow('could not be saved');
    await act(async () => {
      expect(await subject.result.current.editing.saveBlock(subject.result.current.adapter.blocks[0], edited.units[0].text, { textFlow: edited })).toMatchObject({ status: 'saved' });
    });
    expect(subject.result.current.adapter.blocks[0].text_save_revision).toBe(4);
    expect(durableAnnotationTruths[0].ranges[0].start_offset).toBe(13);
    expect(durableRanges[0].start_offset).toBe(13);
    await expect(subject.result.current.editing.flush()).resolves.toBeUndefined();
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(durableBlocks[0]).toEqual({ ...original, text_save_revision: 5 });
    expect(durableAnnotationTruths).toEqual(initialAnnotations);
    expect(durableRanges).toEqual([range]);
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(mocks.atomicPut.mock.calls.map(([url, payload]) => [url, payload.base_revision])).toEqual([
      [`/note-blocks/${original.id}/text-save`, 3], [`/note-blocks/${original.id}/text-save`, 3], [`/note-blocks/${original.id}/text-save`, 4],
    ]);
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.boardRangesPut).not.toHaveBeenCalled();
  });

  it('B7 confirms failed unit A before committing unit B and preserves both undo entries', async () => {
    const flow = createTextBlockContentV1('alpha beta');
    flow.units.push({ ...flow.units[0], id: 'tu-2', text: 'one two', order_index: 1 });
    const original = { ...serverBlock('alpha beta\none two', false), text_save_revision: 0,
      content_json: { body: 'alpha beta\none two', [TEXT_FLOW_CONTENT_KEY]: flow } };
    durableBlocks = [structuredClone(original)];
    const firstAnnotation = annotationWithOffsets(note.id, 6, 10, 'beta');
    const secondAnnotation = { ...annotationWithOffsets(note.id, 4, 7, 'two'), id: 'annotation-b',
      ranges: [{ ...annotationWithOffsets(note.id, 4, 7, 'two').ranges[0], id: 'range-b', text_unit_id: 'tu-2' }] };
    durableAnnotationTruths = [firstAnnotation, secondAnnotation];
    const initialAnnotations = structuredClone(durableAnnotationTruths);
    let ranges: BoardTextRangeV1[] = durableAnnotationTruths.map((annotation) => ({ id: `board-${annotation.id}`,
      note_id: note.id, board_id: 'board', block_id: original.id, text_flow_id: `textflow-${original.id}`,
      text_unit_id: annotation.ranges[0].text_unit_id!, start_offset: annotation.ranges[0].start_offset!,
      end_offset: annotation.ranges[0].end_offset!, excerpt: annotation.ranges[0].range_text_cache!,
      status: 'active', pre_edit_offsets: null, at: 'at', created_at: 'created', updated_at: 'updated' }));
    const initialRanges = structuredClone(ranges);
    mocks.boardRangesGet.mockImplementation(async () => ({ data: { text_ranges: structuredClone(ranges) } }));
    let failed = false;
    mocks.atomicPut.mockImplementation(async (_url, payload) => {
      expect(payload.base_revision).toBe(durableBlocks[0].text_save_revision);
      if (!failed) { failed = true; throw new Error('synthetic A annotation rejection'); }
      const revision = payload.base_revision + 1;
      durableBlocks = [{ ...durableBlocks[0], ...structuredClone(payload.block), text_save_revision: revision }];
      durableAnnotationTruths = durableAnnotationTruths.map((annotation) => ({ ...annotation, ranges: annotation.ranges.map((range) =>
        structuredClone(payload.annotations.range_updates.find((update: { annotation_id: string; range: { id: string } }) => update.annotation_id === annotation.id && update.range.id === range.id)?.range ?? range)) }));
      ranges = ranges.map((range) => ({ ...range, ...structuredClone(persistedRangeFields(payload.text_ranges.find((update: { id: string }) => update.id === range.id))) }));
      // Every observed successful commit must have matching body and both references.
      const units = (durableBlocks[0].content_json[TEXT_FLOW_CONTENT_KEY] as TextBlockContentV1).units;
      for (const annotation of durableAnnotationTruths) for (const range of annotation.ranges) {
        expect(units.find((unit) => unit.id === range.text_unit_id)!.text.slice(range.start_offset, range.end_offset)).toBe(range.range_text_cache);
      }
      for (const range of ranges) expect(units.find((unit) => unit.id === range.text_unit_id)!.text.slice(range.start_offset!, range.end_offset!)).toBe(range.excerpt);
      return { data: { block: structuredClone(durableBlocks[0]), annotations: structuredClone(durableAnnotationTruths), text_ranges: structuredClone(ranges), revision } };
    });
    const subject = renderAtomicHistory();
    await waitFor(() => expect(subject.result.current.adapter.loading).toBe(false));
    const editA = structuredClone(flow);
    editA.units[0].text = 'prefix alpha beta';
    const apply = async (next: TextBlockContentV1) => act(async () => {
      await subject.result.current.editing.applyEdit(subject.result.current.adapter.blocks[0], next);
      subject.result.current.editing.boundary('blur');
      await subject.result.current.history.whenHistoryIdle();
    });
    await apply(editA);
    expect(durableBlocks).toEqual([original]);
    const editB = structuredClone(editA);
    editB.units[1].text = 'prefix one two';
    await apply(editB);
    expect(mocks.atomicPut.mock.calls.map(([, payload]) => payload.base_revision)).toEqual([0, 0, 1]);
    expect(durableBlocks[0].plain_text).toBe('prefix alpha beta\nprefix one two');
    expect(ranges.map((range) => range.start_offset)).toEqual([13, 11]);
    await expect(subject.result.current.editing.flush()).resolves.toBeUndefined();
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(durableBlocks[0].plain_text).toBe('prefix alpha beta\none two');
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(durableBlocks[0]).toEqual({ ...original, text_save_revision: 4 });
    expect(durableAnnotationTruths).toEqual(initialAnnotations);
    expect(ranges).toEqual(initialRanges);
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.boardRangesPut).not.toHaveBeenCalled();
  });

  it('B7 keeps the base revision and complete recovery after 409 even when readback body matches', async () => {
    const initial = { ...serverBlock('original', false), text_save_revision: 3 };
    durableBlocks = [initial];
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    durableBlocks = [{ ...initial, plain_text: 'requested', content_json: { body: 'requested' }, text_save_revision: 9 }];
    mocks.atomicPut.mockRejectedValue({ response: { status: 409, data: { error: 'stale_revision', details: { code: 'stale_revision', current_revision: 9 } } } });
    let failed!: BlockSaveOutcome;
    await act(async () => { failed = await subject.result.current.saveBlock(initial, 'requested'); });
    expect(failed).toMatchObject({ status: 'rejected', durableState: 'conflict' });
    expect(subject.result.current.blocks[0].text_save_revision).toBe(3);
    const receipt = subject.result.current.blockEditRecoveryReceipts[0];
    expect(receipt).toMatchObject({ baseRevision: 3, annotationRanges: [], boardRangeSnapshot: { ranges: [] } });
    await act(async () => { expect(await subject.result.current.applyBlockEditRecovery(receipt.recoveryKey)).toBe(false); });
    expect(mocks.atomicPut.mock.calls.map(([, payload]) => payload.base_revision)).toEqual([3, 3]);
    expect(durableBlocks[0].text_save_revision).toBe(9);
    expect(subject.result.current.blockEditRecoveryReceipts).not.toEqual([]);
  });

  it('B7 accepts a committed response omitting an independently deleted board range', async () => {
    const flow = createTextBlockContentV1('alpha beta gamma');
    durableBlocks = [{ ...serverBlock('alpha beta gamma', false), content_json: { body: 'alpha beta gamma', [TEXT_FLOW_CONTENT_KEY]: flow } }];
    const range: BoardTextRangeV1 = { id: 'deleted-range', board_id: 'board', note_id: note.id, block_id: 'block-1',
      text_flow_id: 'textflow-block-1', text_unit_id: flow.units[0].id, start_offset: 6, end_offset: 10,
      excerpt: 'beta', status: 'active', pre_edit_offsets: null, at: 'at', created_at: 'created', updated_at: 'updated' };
    mocks.boardRangesGet.mockResolvedValue({ data: { text_ranges: [range] } });
    mocks.atomicPut.mockImplementation(async (_url, payload) => ({ data: {
      block: { ...durableBlocks[0], ...payload.block, text_save_revision: 1 }, annotations: [], text_ranges: [], revision: 1,
    } }));
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    const next = structuredClone(flow);
    next.units[0].text = 'prefix alpha beta gamma';
    await act(async () => { expect(await subject.result.current.saveBlock(subject.result.current.blocks[0], next.units[0].text, { textFlow: next })).toMatchObject({ status: 'saved' }); });
    expect(mocks.atomicPut.mock.calls[0][1].text_ranges).toHaveLength(1);
    expect(subject.result.current.captureBoardTextRanges('block-1').ranges).toEqual([]);
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);
    await expect(subject.result.current.whenIdle()).resolves.toBeUndefined();
  });

  function queueF19Recovery(): BlockEditRecoveryReceipt {
    const flow = createTextBlockContentV1('recovered draft');
    const receipt: BlockEditRecoveryReceipt = {
      version: 2, kind: 'block_edit_recovery',
      recoveryKey: createBlockEditRecoveryKey(note.id, 'block-1', 0, 1, 'previous-visit'),
      noteId: note.id, requestedNoteId: note.id, blockId: 'block-1', mountNonce: 'previous-visit',
      creationGeneration: 0, operationSequence: 1, hydrationEpoch: 1, queuedAt: '2026-09-11T00:00:00Z',
      text: 'recovered draft', plainText: 'recovered draft', textFlow: flow,
      contentJson: { body: 'recovered draft', [TEXT_FLOW_CONTENT_KEY]: flow, retained: 'draft metadata' },
      baseRevision: 3, annotationRanges: [], boardRangeSnapshot: { ranges: [] },
    };
    expect(rememberBlockEditRecoveryReceipt(receipt)).toBe(true);
    return receipt;
  }

  const f19Conflict = { response: { status: 409, data: { error: 'stale_revision', details: { code: 'stale_revision', current_revision: 9 } } } };

  it('F19 exposes stale Apply as conflict, reads differences without writes, then explicitly saves the exact draft on the current revision', async () => {
    const queued = queueF19Recovery();
    const current = { ...serverBlock('changed elsewhere', false), text_save_revision: 9 };
    durableBlocks = [current];
    mocks.atomicPut.mockRejectedValueOnce(f19Conflict);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    expect(mocks.atomicPut).not.toHaveBeenCalled();
    await act(async () => { expect(await subject.result.current.applyBlockEditRecovery(queued.recoveryKey)).toBe(false); });
    const failed = subject.result.current.blockEditRecoveryReceipts[0];
    expect(failed.recoveryKey).not.toBe(queued.recoveryKey);
    expect(subject.result.current.blockEditRecoveryConflicts[failed.recoveryKey]).toBe(true);
    expect(subject.result.current.blocks[0].text_save_revision).toBe(3);
    const beforeRead = sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2);
    await act(async () => { expect(await subject.result.current.inspectBlockEditRecovery(failed.recoveryKey)).toMatchObject(current); });
    expect(sessionStorage.getItem(DRAFT_RECOVERY_STORAGE_KEY_V2)).toBe(beforeRead);
    expect(subject.result.current.blocks[0].text_save_revision).toBe(3);
    expect(mocks.atomicPut).toHaveBeenCalledTimes(1);
    await act(async () => { expect(await subject.result.current.replayBlockEditRecovery(failed.recoveryKey)).toBe(true); });
    expect(mocks.atomicPut.mock.calls.map(([, payload]) => payload.base_revision)).toEqual([3, 9]);
    expect(mocks.atomicPut.mock.calls[1]).toEqual(['/note-blocks/block-1/text-save', {
      note_id: note.id, base_revision: 9,
      block: { content_json: failed.contentJson, plain_text: failed.plainText },
      annotations: { range_updates: [] }, text_ranges: [],
    }]);
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);
    expect(listBlockEditRecoveryReceipts(note.id)).toEqual([]);
    expect(durableBlocks[0]).toMatchObject({ plain_text: failed.plainText, content_json: failed.contentJson, text_save_revision: 10 });
  });

  it('F19 returns a second stale revision to conflict with no automatic resubmission', async () => {
    const queued = queueF19Recovery();
    durableBlocks = [{ ...serverBlock('current', false), text_save_revision: 9 }];
    mocks.atomicPut.mockRejectedValue(f19Conflict);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    await act(async () => { expect(await subject.result.current.replayBlockEditRecovery(queued.recoveryKey)).toBe(false); });
    const failed = subject.result.current.blockEditRecoveryReceipts[0];
    expect(failed.baseRevision).toBe(9);
    expect(subject.result.current.blockEditRecoveryConflicts[failed.recoveryKey]).toBe(true);
    expect(mocks.atomicPut).toHaveBeenCalledTimes(1);
    expect(durableBlocks[0].plain_text).toBe('current');
  });

  it.each([503, 'network', 409] as const)('F19 keeps non-stale failure %s on the original frozen Apply retry path', async (failure) => {
    const queued = queueF19Recovery();
    durableBlocks = [{ ...serverBlock('current', false), text_save_revision: 3 }];
    mocks.atomicPut.mockRejectedValueOnce(failure === 'network' ? new Error('offline')
      : { response: { status: failure, data: { error: 'unavailable' } } });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    await act(async () => { expect(await subject.result.current.applyBlockEditRecovery(queued.recoveryKey)).toBe(false); });
    const failed = subject.result.current.blockEditRecoveryReceipts[0];
    expect(subject.result.current.blockEditRecoveryConflicts[failed.recoveryKey]).not.toBe(true);
    const firstPayload = structuredClone(mocks.atomicPut.mock.calls[0][1]);
    await act(async () => { expect(await subject.result.current.applyBlockEditRecovery(failed.recoveryKey)).toBe(true); });
    expect(mocks.atomicPut.mock.calls[1][1]).toEqual(firstPayload);
    expect(firstPayload.base_revision).toBe(3);
    expect(listBlockEditRecoveryReceipts(note.id)).toEqual([]);
  });

  it('F19 discard clears only this draft without writing the current body', async () => {
    const queued = queueF19Recovery();
    durableBlocks = [{ ...serverBlock('keep current body', false), text_save_revision: 9 }];
    const before = structuredClone(durableBlocks);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    act(() => { expect(subject.result.current.dismissBlockEditRecovery(queued.recoveryKey)).toBe(true); });
    expect(subject.result.current.blockEditRecoveryReceipts).toEqual([]);
    expect(listBlockEditRecoveryReceipts(note.id)).toEqual([]);
    expect(durableBlocks).toEqual(before);
    expect(mocks.atomicPut).not.toHaveBeenCalled();
  });

  it('F19 ordinary replay uses current board evidence and never forwards a retained history intent', async () => {
    const queued = queueF19Recovery();
    const range: BoardTextRangeV1 = { id: 'f19-range', board_id: 'board', note_id: note.id, block_id: 'block-1',
      text_flow_id: 'textflow-block-1', text_unit_id: queued.textFlow!.units[0].id,
      status: 'drifted', start_offset: null, end_offset: null, excerpt: 'evidence before drift',
      pre_edit_offsets: { start_offset: 2, end_offset: 8 }, at: 'at', created_at: 'created', updated_at: 'updated' };
    rememberBlockEditRecoveryReceipt({ ...queued, boardRangeSnapshot: { ranges: [{ ...range, status: 'active',
      start_offset: 0, end_offset: 9, excerpt: 'recovered', pre_edit_offsets: null }], historyRestore: true } });
    durableBlocks = [{ ...serverBlock('current', false), text_save_revision: 9 }];
    mocks.boardRangesGet.mockResolvedValue({ data: { text_ranges: [range] } });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    await act(async () => { expect(await subject.result.current.replayBlockEditRecovery(queued.recoveryKey)).toBe(true); });
    const payload = mocks.atomicPut.mock.calls[0][1];
    expect(payload.base_revision).toBe(9);
    expect(payload.text_ranges).toEqual([{ id: range.id, block_id: range.block_id, text_flow_id: range.text_flow_id,
      text_unit_id: range.text_unit_id, status: 'drifted', start_offset: null, end_offset: null,
      excerpt: range.excerpt, pre_edit_offsets: range.pre_edit_offsets }]);
    expect(JSON.stringify(payload)).not.toContain('history_restore');
    expect(payload.block.content_json).toEqual(queued.contentJson);
  });

  it('F19 retries a 503 after informed replay with the complete newly frozen payload', async () => {
    const queued = queueF19Recovery();
    durableBlocks = [{ ...serverBlock('current', false), text_save_revision: 9,
      content_json: { body: 'current', currentOnlyField: 'must not leak into draft' } }];
    mocks.atomicPut.mockRejectedValueOnce({ response: { status: 503 } });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    await act(async () => { expect(await subject.result.current.replayBlockEditRecovery(queued.recoveryKey)).toBe(false); });
    const failed = subject.result.current.blockEditRecoveryReceipts[0];
    expect(subject.result.current.blockEditRecoveryConflicts[failed.recoveryKey]).not.toBe(true);
    expect(mocks.atomicPut.mock.calls[0][1].block.content_json).toEqual(queued.contentJson);
    await act(async () => { expect(await subject.result.current.applyBlockEditRecovery(failed.recoveryKey)).toBe(true); });
    expect(mocks.atomicPut.mock.calls[1][1]).toEqual(mocks.atomicPut.mock.calls[0][1]);
    expect(listBlockEditRecoveryReceipts(note.id)).toEqual([]);
  });

  it('F19 adopts current rebased board and annotation ranges so the next ordinary edit starts at the saved body', async () => {
    const queued = queueF19Recovery();
    const flow = queued.textFlow!;
    flow.units[0].text = 'prefix alpha beta gamma';
    rememberBlockEditRecoveryReceipt({ ...queued, text: flow.units[0].text, plainText: flow.units[0].text,
      contentJson: { [TEXT_FLOW_CONTENT_KEY]: flow }, textFlow: flow });
    const initialFlow = structuredClone(flow);
    initialFlow.units[0].text = 'alpha beta gamma';
    const initial = { ...serverBlock('alpha beta gamma', false), text_save_revision: 3,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: initialFlow } };
    durableBlocks = [initial];
    const range: BoardTextRangeV1 = { id: 'adopt-range', board_id: 'board', note_id: note.id, block_id: 'block-1',
      text_flow_id: 'textflow-block-1', text_unit_id: flow.units[0].id, status: 'active',
      start_offset: 6, end_offset: 10, excerpt: 'beta', pre_edit_offsets: null,
      at: 'at', created_at: 'created', updated_at: 'updated' };
    durableAnnotationTruths = [annotationWithOffsets(note.id, 6, 10, 'beta')];
    mocks.boardRangesGet.mockResolvedValue({ data: { text_ranges: [range] } });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    const remoteFlow = structuredClone(flow);
    remoteFlow.units[0].text = 'other alpha beta gamma';
    durableBlocks = [{ ...initial, plain_text: remoteFlow.units[0].text, text_save_revision: 9,
      content_json: { [TEXT_FLOW_CONTENT_KEY]: remoteFlow } }];
    durableAnnotationTruths = [annotationWithOffsets(note.id, 12, 16, 'beta')];
    act(() => { subject.result.current.setAnnotationTruthsSnapshot([{ ...subject.result.current.annotationTruths[0], raw_label: 'pending local rename' }]); });
    mocks.boardRangesGet.mockResolvedValue({ data: { text_ranges: [{ ...range, start_offset: 12, end_offset: 16 }] } });
    await act(async () => { expect(await subject.result.current.replayBlockEditRecovery(queued.recoveryKey)).toBe(true); });
    expect(subject.result.current.captureBoardTextRanges('block-1').ranges[0]).toMatchObject({ start_offset: 13, end_offset: 17, excerpt: 'beta' });
    expect(subject.result.current.annotationTruths[0].ranges[0]).toMatchObject({ start_offset: 13, end_offset: 17 });
    expect(subject.result.current.annotationTruths[0].raw_label).toBe('pending local rename');
    const nextFlow = structuredClone(flow);
    nextFlow.units[0].text = 'x ' + flow.units[0].text;
    await act(async () => { expect(await subject.result.current.saveBlock(subject.result.current.blocks[0], nextFlow.units[0].text, { textFlow: nextFlow })).toMatchObject({ status: 'saved' }); });
    expect(mocks.atomicPut.mock.calls[1][1].text_ranges[0]).toMatchObject({ start_offset: 15, end_offset: 19, status: 'active' });
  });

  it.each(['replaced receipt', 'route changed', 'read failed', 'new unsaved draft'] as const)('F19 keeps recovery intact and sends no save when current read is stale: %s', async (reason) => {
    const queued = queueF19Recovery();
    durableBlocks = [{ ...serverBlock('current', false), text_save_revision: 9 }];
    const subject = renderHook(({ noteId }) => useNoteCanvasDataAdapter({ ...stableAdapterOptions, noteId }),
      { wrapper, initialProps: { noteId: note.id } });
    await waitFor(() => expect(subject.result.current.loading).toBe(false));
    const held = deferred<{ data: NoteBlock[] }>();
    mocks.get.mockImplementationOnce(() => held.promise);
    let replay!: Promise<boolean>;
    act(() => { replay = subject.result.current.replayBlockEditRecovery(queued.recoveryKey); });
    if (reason === 'replaced receipt') rememberBlockEditRecoveryReceipt({ ...queued, operationSequence: 2,
      recoveryKey: createBlockEditRecoveryKey(note.id, queued.blockId, 0, 2, queued.mountNonce) });
    if (reason === 'route changed') subject.rerender({ noteId: 'another-note' });
    if (reason === 'new unsaved draft') act(() => { subject.result.current.setBlockTextDrafts({ [queued.blockId]: 'keep newer input' }); });
    await act(async () => {
      if (reason === 'read failed') {
        held.reject(new Error('offline'));
        await expect(replay).rejects.toThrow('offline');
      } else {
        held.resolve({ data: durableBlocks });
        expect(await replay).toBe(false);
      }
    });
    expect(mocks.atomicPut).not.toHaveBeenCalled();
    expect(listBlockEditRecoveryReceipts(note.id)).toHaveLength(1);
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
    let saving!: Promise<boolean>;
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
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
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
    let placing!: Promise<boolean>;
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

  it('keeps whenIdle pending through the complete atomic body and board-range acknowledgement', async () => {
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

  it('loads all board anchors and atomically synchronizes text and both boards without double shifting', async () => {
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

  it('retains a failed composite save for retry and never reports a partial save', async () => {
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
    expect(failed).toMatchObject({ status: 'rejected', reason: 'request_failed', durableState: 'conflict' });
    expect(durableBlocks[0].plain_text).toBe('alpha beta gamma');
    await expect(subject.result.current.whenIdle()).rejects.toThrow('second write unavailable');
    expect(mocks.addToast).toHaveBeenCalledWith('error', 'Failed to save block');
    expect(mocks.addToast.mock.calls.some(([kind, message]) => kind === 'success' && message === 'Block saved')).toBe(false);
    expect(mocks.boardRangesPut.mock.calls[0][1].text_ranges[0]).toMatchObject({ status: 'drifted', excerpt: 'beta', pre_edit_offsets: { start_offset: 6, end_offset: 10 } });
    let retried!: BlockSaveOutcome;
    await act(async () => { retried = await subject.result.current.saveBlock(subject.result.current.blocks[0], 'alpha  gamma', { textFlow: newFlow }); });
    expect(retried.status).toBe('saved');
    await expect(subject.result.current.whenIdle()).resolves.toBeUndefined();
    expect(mocks.boardRangesPut).toHaveBeenCalledTimes(2);
  });

  it.each([
    { commandId: 'formula', templateKey: 'formula.math', failedTyping: false },
    { commandId: 'code', templateKey: 'code.snippet', failedTyping: false },
    { commandId: 'formula', templateKey: 'formula.math', failedTyping: true },
  ])('B4 smoke 9: paragraph to $templateKey restores all five fields, flow and touched ranges through slash undo/redo (prior typing failure: $failedTyping)', async ({ commandId, templateKey, failedTyping }) => {
    const firstUnitText = `alpha beta /${commandId}`;
    const originalText = `${firstUnitText}\nsecond gamma  `;
    const originalFlow = createTextBlockContentV1(firstUnitText, 'paragraph', { note: 'retain flow metadata' });
    originalFlow.units[0] = { ...originalFlow.units[0], id: 'original-unit-a', metadata: { authored: true } };
    originalFlow.units.push({ ...originalFlow.units[0], id: 'original-unit-b', text: 'second gamma  ', order_index: 1 });
    originalFlow.inline_structures.push({
      id: 'original-inline', semantic_kind: 'inline_code', parent_text_unit_id: 'original-unit-a',
      anchor_text: 'beta', anchor_range: { start: 6, end: 10 }, field_values: { code: 'beta' },
      metadata: { language: 'text' }, status: 'active',
    });
    const original: NoteBlock = {
      ...serverBlock(originalText, false), title: commandId === 'formula' ? null : 'Authored title',
      content_json: { body: originalText, field_values: { summary: 'paragraph companion' }, untouched: { nested: [1, 2] }, [TEXT_FLOW_CONTENT_KEY]: originalFlow },
      metadata: { provenance: { author: 'synthetic-human', revision: 7 } },
      source_kind: 'manual',
      source_references: [{ id: 'source-receipt', document_id: 'synthetic-document', source_page_start: 3, source_page_end: 4, source_excerpt: 'original source excerpt', confidence: 0.9 }],
    };
    durableBlocks = [structuredClone(original)];
    const originalAnnotation = annotationWithOffsets(note.id, 6, 10, 'beta');
    originalAnnotation.ranges[0].text_unit_id = 'original-unit-a';
    originalAnnotation.ranges[0].metadata = { anchor_status: 'active', retained: 'range metadata' };
    originalAnnotation.ranges.push({
      ...originalAnnotation.ranges[0], id: 'original-second-range', text_unit_id: 'original-unit-b',
      start_offset: 7, end_offset: 12, range_text_cache: 'gamma',
    });
    durableAnnotationTruths = [structuredClone(originalAnnotation)];
    const originalBoardRanges: BoardTextRangeV1[] = originalAnnotation.ranges.map((range, index) => ({
      id: `original-board-range-${index}`, board_id: `board-${index}`, note_id: note.id, block_id: original.id,
      text_flow_id: `textflow-${original.id}`, text_unit_id: range.text_unit_id!, start_offset: range.start_offset!,
      end_offset: range.end_offset!, excerpt: range.range_text_cache!, status: 'active', pre_edit_offsets: null,
      at: '2026-09-10T00:00:00Z', created_at: '2026-09-10T00:00:00Z', updated_at: '2026-09-10T00:00:00Z',
    }));
    let durableBoardRanges = structuredClone(originalBoardRanges);
    mocks.boardRangesGet.mockImplementation(async () => ({ data: { text_ranges: structuredClone(durableBoardRanges) } }));
    mocks.boardRangesPut.mockImplementation(async (_url: string, payload: { text_ranges: Array<Partial<BoardTextRangeV1> & Pick<BoardTextRangeV1, 'id'>> }) => {
      const issued = new Map(payload.text_ranges.map((range) => [range.id, structuredClone(range)]));
      durableBoardRanges = durableBoardRanges.map((range) => ({ ...range, ...issued.get(range.id) }));
      // The repository sends editable fields; the server returns complete range rows.
      return { data: { text_ranges: structuredClone(durableBoardRanges.filter((range) => issued.has(range.id))) } };
    });
    mocks.put.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
      if (url === `/note-blocks/${original.id}`) {
        durableBlocks = durableBlocks.map((block) => ({ ...block, ...structuredClone(payload) }));
        // Conversion responses can omit provenance; the adapter must retain the existing receipt.
        return { data: { id: original.id, ...structuredClone(payload) } };
      }
      if (url === `/annotation-truths/by-note/${note.id}`) {
        durableAnnotationTruths = structuredClone(payload.annotations as AnnotationTruthV1[]);
        return { data: durableAnnotationTruths };
      }
      throw new Error(`Unexpected PUT ${url}`);
    });

    const subject = renderHook(() => {
      const adapter = useNoteCanvasDataAdapter(stableAdapterOptions);
      const historyHost = useRef<TextFlowHistoryHost | null>(null);
      const blockListRef = useRef<HTMLDivElement>(null);
      const draftTextRef = useRef('');
      const editing = useTextFlowHistory({
        noteId: note.id, generation: adapter.textHistoryGeneration, blocks: adapter.blocks,
        annotationTruths: adapter.annotationTruths, readAnnotationTruths: adapter.readAnnotationTruths,
        setAnnotationTruthsSnapshot: adapter.setAnnotationTruthsSnapshot,
        saveAnnotationTruthsOutcome: adapter.saveAnnotationTruthsOutcome,
        blockTextFlowDrafts: adapter.blockTextFlowDrafts, setBlockTextFlowDrafts: adapter.setBlockTextFlowDrafts,
        setBlockTextDrafts: adapter.setBlockTextDrafts, captureBoardTextRanges: adapter.captureBoardTextRanges,
        restoreBoardTextRanges: adapter.restoreBoardTextRanges, rebaseBoardTextRanges: adapter.rebaseBoardTextRanges,
        saveBlock: adapter.saveBlock, applyTemplateToBlock: adapter.applyTemplateToBlock, history: historyHost,
      });
      const history = usePlacementHistory({
        noteId: note.id, generation: adapter.textHistoryGeneration, beforeHistoryBoundary: () => editing.boundary(),
        applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(), target: null,
      });
      historyHost.current = history;
      const rollbackBlockSlashSession = useSlashBlockRollbackController({
        applyBlockTextFlowEdit: editing.applyEdit, blocks: adapter.blocks, readBlockDraftSnapshot: adapter.readBlockDraftSnapshot,
        saveBlock: editing.saveBlock, setBlockFieldDrafts: adapter.setBlockFieldDrafts, setBlockTextDrafts: adapter.setBlockTextDrafts,
      });
      const slash = useSlashCommandController({
        applyBlockTextFlowEdit: editing.applyEdit, beforeTextStructure: () => editing.boundary(),
        addToast: mocks.addToast, applyTemplateToBlock: editing.applyTemplateToBlock,
        blockListRef, blocks: adapter.blocks, blockTextDrafts: adapter.blockTextDrafts,
        blockTextFlowDrafts: adapter.blockTextFlowDrafts, draftText: '', draftTextRef,
        focusedTextOwner: { blockId: original.id, textFlowId: `textflow-${original.id}`, textUnitId: 'original-unit-a' },
        insertTemplateOptions: adapter.templateOptions, templateOptions: adapter.templateOptions,
        persistDraft: vi.fn(), rollbackBlockSlashSession, saveBlock: editing.saveBlock,
        setBlockTextDrafts: adapter.setBlockTextDrafts, setBlockTextFlowDrafts: adapter.setBlockTextFlowDrafts,
        setDraftText: vi.fn(), setFocusBlockId: vi.fn(), setInteractionState: vi.fn(), activateDraft: vi.fn(),
      });
      return { adapter, editing, history, slash };
    }, { wrapper });
    await waitFor(() => expect(subject.result.current.adapter.loading).toBe(false));
    expect(subject.result.current.adapter.blocks[0].content_json).toEqual(original.content_json);
    const prefix = failedTyping ? 'typed ' : '';
    const conversionInput = prefix + originalText;
    let beforeConversion = structuredClone(original);
    let beforeConversionAnnotations = structuredClone(originalAnnotation.ranges);
    let beforeConversionBoardRanges = structuredClone(originalBoardRanges);
    if (failedTyping) {
      const typedFlow = structuredClone(originalFlow);
      typedFlow.units[0].text = prefix + firstUnitText;
      mocks.boardRangesPut.mockRejectedValueOnce(new Error('synthetic preceding typing range write failed'));
      await act(async () => {
        await subject.result.current.editing.applyEdit(subject.result.current.adapter.blocks[0], typedFlow, {
          metadata: {
            kind: 'typing', inputType: 'insertText', unitId: 'original-unit-a', isComposing: false,
            beforeSelection: { unitId: 'original-unit-a', start: 0, end: 0 },
            afterSelection: { unitId: 'original-unit-a', start: prefix.length, end: prefix.length },
          },
        });
        subject.result.current.editing.boundary('blur');
        await subject.result.current.history.whenHistoryIdle();
      });
      await expect(subject.result.current.editing.flush()).rejects.toThrow('could not be saved');
      expect(durableBlocks[0].plain_text).toBe(originalText);
      expect(durableBoardRanges).toEqual(originalBoardRanges);
      beforeConversion = { ...original, content_json: { ...original.content_json, body: conversionInput, [TEXT_FLOW_CONTENT_KEY]: typedFlow }, plain_text: conversionInput };
      beforeConversionAnnotations = structuredClone(subject.result.current.adapter.annotationTruths[0].ranges);
      beforeConversionBoardRanges = structuredClone(subject.result.current.adapter.captureBoardTextRanges(original.id).ranges);
      expect(beforeConversionAnnotations[0]).toMatchObject({ start_offset: 12, end_offset: 16 });
      expect(beforeConversionBoardRanges[0]).toMatchObject({ status: 'active', start_offset: 12, end_offset: 16 });
    }
    act(() => subject.result.current.slash.handleBlockTextChange(original.id, conversionInput, prefix.length + firstUnitText.length));
    const command = NOTE_SLASH_COMMANDS.find((candidate) => candidate.id === commandId)!;
    expect(command).toMatchObject({ templateKey, objectKind: 'structured_block' });
    expect(subject.result.current.slash.slashCommands.find((candidate) => candidate.id === commandId)?.disabledReason).toBeUndefined();
    if (!failedTyping) mocks.boardRangesPut.mockRejectedValueOnce(new Error('synthetic forward conversion range write failed'));
    await act(async () => {
      await subject.result.current.slash.handleSelectSlashCommand(command);
      await subject.result.current.history.whenHistoryIdle();
    });
    expect(durableBlocks[0].metadata.template_id).toBe(failedTyping ? templateKey : undefined);
    if (failedTyping) {
      expect(mocks.put.mock.calls.filter(([url]) => url === `/note-blocks/${original.id}`).map(([, payload]) => payload.plain_text))
        .toEqual([conversionInput, conversionInput, prefix + 'alpha beta \nsecond gamma']);
      expect(mocks.boardRangesPut.mock.calls[1][1].text_ranges).toEqual(beforeConversionBoardRanges.map((range) => expect.objectContaining({
        id: range.id, status: 'active', start_offset: range.start_offset, end_offset: range.end_offset,
      })));
      await subject.result.current.editing.flush();
      // A subsequent blur must not reuse the failed paragraph flow inside the formula.
      await act(async () => {
        const convertedBlock = subject.result.current.adapter.blocks[0];
        expect((await subject.result.current.editing.saveBlock(convertedBlock, convertedBlock.plain_text ?? '', { silent: true })).status).toBe('saved');
      });
      expect(getTextFlowContent(durableBlocks[0].content_json)).toBeNull();
      expect(durableBlocks[0].block_type).toBe('formula');
    } else {
      expect(durableBoardRanges).toEqual(originalBoardRanges);
      expect(subject.result.current.editing.replaying).toBe(true);
      const failedConversionDraft = structuredClone(subject.result.current.adapter.readBlockDraftSnapshot());
      const writesBeforeBlockedInput = mocks.put.mock.calls.length;
      await act(async () => {
        expect(await subject.result.current.editing.applyEdit(
          subject.result.current.adapter.blocks[0], createTextBlockContentV1('input must wait for conversion recovery'),
        )).toBeUndefined();
      });
      expect(subject.result.current.adapter.readBlockDraftSnapshot()).toEqual(failedConversionDraft);
      expect(mocks.put).toHaveBeenCalledTimes(writesBeforeBlockedInput);
      await expect(subject.result.current.editing.flush()).rejects.toThrow('could not be saved');
      await act(async () => {
        const convertedBlock = subject.result.current.adapter.blocks[0];
        expect((await subject.result.current.editing.saveBlock(convertedBlock, convertedBlock.plain_text ?? '', { silent: true })).status).toBe('saved');
        await subject.result.current.editing.flush();
      });
    }
    expect(subject.result.current.editing.replaying).toBe(false);

    const converted = structuredClone(subject.result.current.adapter.blocks[0]);
    const convertedFlow = getTextFlowContent(converted.content_json);
    const convertedAnnotations = structuredClone(subject.result.current.adapter.annotationTruths[0].ranges);
    const convertedBoardRanges = structuredClone(subject.result.current.adapter.captureBoardTextRanges(original.id).ranges);
    const beforeHistoryReplay = mocks.atomicPut.mock.calls.length;
    expect(mocks.atomicPut.mock.calls.every(([, payload]) => payload.text_ranges.every(
      (range: object) => !('history_restore' in range),
    ))).toBe(true);
    expect(converted.metadata.template_id).toBe(templateKey);
    expect(converted.block_type).toBe(commandId === 'formula' ? 'formula' : 'paragraph');
    expect(converted.plain_text).toBe(prefix + 'alpha beta \nsecond gamma');
    expect(converted.title).toBe(original.title);
    expect(converted.content_json).not.toEqual(original.content_json);
    expect(converted.metadata).not.toEqual(original.metadata);
    if (commandId === 'formula') {
      expect(convertedFlow).toBeNull();
      expect(converted.content_json.field_values).toMatchObject({ latex_input: prefix + 'alpha beta \nsecond gamma' });
    } else {
      expect(convertedFlow?.units.map((unit) => ({ id: unit.id, writing_role: unit.writing_role })))
        .toEqual([{ id: 'tu-1', writing_role: 'code_line' }]);
      expect(convertedFlow?.inline_structures).toEqual([]);
    }
    convertedAnnotations.forEach((range, index) => {
      expect(range.start_offset).toBeUndefined();
      expect(range.end_offset).toBeUndefined();
      expect(range.metadata?.pre_edit_offsets).toMatchObject({
        start_offset: beforeConversionAnnotations[index].start_offset, end_offset: beforeConversionAnnotations[index].end_offset,
      });
    });
    convertedBoardRanges.forEach((range, index) => expect(range).toMatchObject({
      status: 'drifted', start_offset: null, end_offset: null,
      pre_edit_offsets: { start_offset: beforeConversionBoardRanges[index].start_offset, end_offset: beforeConversionBoardRanges[index].end_offset },
    }));

    const laterAnnotationRange = { ...originalAnnotation.ranges[0], id: 'later-annotation-range', start_offset: 0, end_offset: 5, range_text_cache: 'alpha' };
    const laterAnnotation: AnnotationTruthV1 = { ...originalAnnotation, id: 'later-annotation', raw_label: 'created after conversion', ranges: [{ ...laterAnnotationRange, id: 'later-other-range' }] };
    const laterBoardRange: BoardTextRangeV1 = { ...originalBoardRanges[0], id: 'later-board-range', start_offset: 0, end_offset: 5, excerpt: 'alpha' };
    durableBoardRanges.push(structuredClone(laterBoardRange));
    await act(async () => {
      await subject.result.current.adapter.saveAnnotationTruths([
        { ...subject.result.current.adapter.annotationTruths[0], raw_label: 'renamed after conversion', ranges: [...convertedAnnotations, laterAnnotationRange] },
        laterAnnotation,
      ]);
      await subject.result.current.adapter.refreshBoardTextRanges();
    });

    const assertSnapshot = (expected: NoteBlock, expectedRanges: AnnotationTruthV1['ranges'], expectedBoardRanges: BoardTextRangeV1[]) => {
      const live = subject.result.current.adapter.blocks[0];
      for (const field of ['block_type', 'title', 'content_json', 'plain_text', 'metadata'] as const) {
        expect(live[field], `live ${field}`).toEqual(expected[field]);
        expect(durableBlocks[0][field], `durable ${field}`).toEqual(expected[field]);
      }
      expect(getTextFlowContent(live.content_json)).toEqual(getTextFlowContent(expected.content_json));
      expect(subject.result.current.adapter.blockTextFlowDrafts[original.id] ?? null).toEqual(getTextFlowContent(expected.content_json));
      expect(live.source_references).toEqual(original.source_references);
      expect(durableBlocks[0].source_references).toEqual(original.source_references);
      expect(live.source_kind).toBe('manual');
      for (const annotations of [subject.result.current.adapter.annotationTruths, durableAnnotationTruths]) {
        expect(annotations[0].raw_label).toBe('renamed after conversion');
        expect(annotations[0].ranges).toEqual([...expectedRanges, laterAnnotationRange]);
        expect(annotations[1]).toEqual(laterAnnotation);
      }
      expect(subject.result.current.adapter.captureBoardTextRanges(original.id).ranges).toEqual([...expectedBoardRanges, laterBoardRange]);
      expect(durableBoardRanges).toEqual([...expectedBoardRanges, laterBoardRange]);
    };
    assertSnapshot(converted, convertedAnnotations, convertedBoardRanges);
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(true); });
    assertSnapshot(beforeConversion, beforeConversionAnnotations, beforeConversionBoardRanges);
    await act(async () => { expect(await subject.result.current.history.redoRuntimeHistory()).toBe(true); });
    assertSnapshot(converted, convertedAnnotations, convertedBoardRanges);
    mocks.boardRangesPut.mockRejectedValueOnce(new Error('synthetic conversion replay range write failed'));
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(subject.result.current.editing.replaying).toBe(true);
    expect(subject.result.current.adapter.blocks[0].source_references).toEqual(original.source_references);
    await act(async () => {
      expect(await subject.result.current.editing.saveBlock(subject.result.current.adapter.blocks[0], 'stale template blur'))
        .toMatchObject({ status: 'saved' });
    });
    assertSnapshot(beforeConversion, beforeConversionAnnotations, beforeConversionBoardRanges);
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.result.current.editing.replaying).toBe(false);
    assertSnapshot(beforeConversion, beforeConversionAnnotations, beforeConversionBoardRanges);
    if (failedTyping) {
      await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(true); });
      assertSnapshot(original, originalAnnotation.ranges, originalBoardRanges);
    }
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(false); });
    const blockWrites = mocks.put.mock.calls.filter(([url]) => url === `/note-blocks/${original.id}`);
    expect(mocks.atomicPut.mock.calls.slice(beforeHistoryReplay).every(([, payload]) => payload.text_ranges.every(
      (range: { history_restore?: true }) => range.history_restore === true,
    ))).toBe(true);
    const conversionWrites = blockWrites.filter(([, payload]) => 'block_type' in payload);
    expect(conversionWrites).toHaveLength(failedTyping ? 6 : 7);
    if (!failedTyping) expect(blockWrites).toHaveLength(7);
    conversionWrites.forEach(([, payload]) => expect(Object.keys(payload).sort())
      .toEqual(['block_type', 'content_json', 'metadata', 'plain_text', 'title']));
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('D2 saves the latest title and description in one turn without cross-field response clobber', async () => {
    const first = deferred<{ data: Note }>();
    mocks.put.mockImplementationOnce(() => first.promise)
      // Deliberately stale title in the description response must not win.
      .mockResolvedValueOnce({ data: { ...note, description: 'A short introduction' } });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));
    let save!: Promise<void>;
    act(() => {
      subject.result.current.setTitleDraft('  New paper title  ');
      subject.result.current.setDescriptionDraft('A short introduction');
      save = subject.result.current.saveHeaderMetadata();
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    const idle = vi.fn();
    const drain = subject.result.current.whenIdle().then(idle);
    expect(idle).not.toHaveBeenCalled();
    await act(async () => {
      first.resolve({ data: { ...note, title: 'New paper title' } });
      await save;
      await drain;
    });
    expect(mocks.put.mock.calls).toEqual([
      [`/notes/${note.id}`, { title: 'New paper title' }],
      [`/notes/${note.id}`, { description: 'A short introduction' }],
    ]);
    expect(subject.result.current.note).toMatchObject({ title: 'New paper title', description: 'A short introduction' });
    expect(subject.result.current.titleDraft).toBe('New paper title');
    expect(subject.result.current.descriptionDraft).toBe('A short introduction');
    expect(idle).toHaveBeenCalledTimes(1);
  });

  it('D2 keeps newer typing while an earlier header save acknowledges', async () => {
    const first = deferred<{ data: Note }>();
    mocks.put.mockReturnValueOnce(first.promise);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));
    act(() => subject.result.current.setDescriptionDraft('First description'));
    let save!: Promise<void>;
    act(() => { save = subject.result.current.saveDescription(); });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    act(() => subject.result.current.setDescriptionDraft('Still typing a newer description'));
    await act(async () => {
      first.resolve({ data: { ...note, description: 'First description' } });
      await save;
    });
    expect(subject.result.current.note?.description).toBe('First description');
    expect(subject.result.current.descriptionDraft).toBe('Still typing a newer description');
  });

  it('D2 serializes a changed title followed by reverting to its original value', async () => {
    const first = deferred<{ data: Note }>();
    mocks.put.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ data: note });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));
    let firstSave!: Promise<void>;
    let secondSave!: Promise<void>;
    act(() => {
      subject.result.current.setTitleDraft('Temporary title');
      firstSave = subject.result.current.saveTitle();
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    act(() => {
      subject.result.current.setTitleDraft(note.title);
      secondSave = subject.result.current.saveTitle();
    });
    await act(async () => {
      first.resolve({ data: { ...note, title: 'Temporary title' } });
      await Promise.all([firstSave, secondSave]);
      await subject.result.current.whenIdle();
    });
    expect(mocks.put.mock.calls.map(([, payload]) => payload)).toEqual([{ title: 'Temporary title' }, { title: note.title }]);
    expect(subject.result.current.titleDraft).toBe(note.title);
    expect(subject.result.current.note?.title).toBe(note.title);
  });

  it('D2 deduplicates blur and navigation saves, while exposing a failed description to the drain', async () => {
    const first = deferred<{ data: Note }>();
    const error = new Error('Description write unavailable');
    mocks.put.mockReturnValueOnce(first.promise);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));
    let blur!: Promise<void>;
    let exitSave!: Promise<void>;
    act(() => {
      subject.result.current.setDescriptionDraft('Retain this description');
      blur = subject.result.current.saveDescription();
      exitSave = subject.result.current.saveHeaderMetadata();
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    await act(async () => {
      first.reject(error);
      await Promise.all([blur, exitSave]);
    });
    await expect(subject.result.current.whenIdle()).rejects.toBe(error);
    expect(subject.result.current.descriptionDraft).toBe('Retain this description');
    mocks.put.mockResolvedValueOnce({ data: { ...note, description: 'Retain this description' } });
    await act(async () => { await subject.result.current.saveHeaderMetadata(); });
    await expect(subject.result.current.whenIdle()).resolves.toBeUndefined();
    expect(mocks.put).toHaveBeenCalledTimes(2);
  });

  it('D2 ignores a previous route header acknowledgement after another note hydrates', async () => {
    const first = deferred<{ data: Note }>();
    const nextNote: Note = { ...note, id: 'note-2', title: 'Next note', description: 'Next introduction' };
    const originalGet = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/notes/${nextNote.id}`) return { data: nextNote };
      if (url === `/notes/${nextNote.id}/blocks` || url === `/annotation-truths/by-note/${nextNote.id}`) return { data: [] };
      if (url === `/canvas-objects/by-note/${nextNote.id}`) return { data: {} };
      return originalGet(url);
    });
    mocks.put.mockReturnValueOnce(first.promise);
    const subject = renderHook(({ noteId }) => useNoteCanvasDataAdapter({ ...stableAdapterOptions, noteId }), {
      wrapper, initialProps: { noteId: note.id },
    });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(note.id));
    let save!: Promise<void>;
    act(() => {
      subject.result.current.setTitleDraft('Old route saved name');
      save = subject.result.current.saveTitle();
    });
    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
    subject.rerender({ noteId: nextNote.id });
    await waitFor(() => expect(subject.result.current.note?.id).toBe(nextNote.id));
    await act(async () => {
      first.resolve({ data: { ...note, title: 'Old route saved name' } });
      await save;
    });
    expect(subject.result.current.note).toMatchObject(nextNote);
    expect(subject.result.current.titleDraft).toBe(nextNote.title);
    expect(subject.result.current.descriptionDraft).toBe(nextNote.description);
  });

  it('D2 hydrates description, persists clearing as null, and falls back from an empty title', async () => {
    let durableNote: Note = { ...note, description: 'Existing introduction' };
    const originalGet = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation(async (url: string) => url === `/notes/${note.id}` ? { data: durableNote } : originalGet(url));
    mocks.put.mockImplementation(async (_url: string, payload: Partial<Note>) => {
      durableNote = { ...durableNote, ...payload };
      return { data: durableNote };
    });
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.descriptionDraft).toBe('Existing introduction'));
    await act(async () => {
      subject.result.current.setTitleDraft('  ');
      subject.result.current.setDescriptionDraft('  ');
      await subject.result.current.saveHeaderMetadata();
    });
    expect(mocks.put.mock.calls).toEqual([[`/notes/${note.id}`, { description: null }]]);
    expect(subject.result.current.titleDraft).toBe(note.title);
    expect(subject.result.current.descriptionDraft).toBe('');
    subject.unmount();
    const reopened = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(reopened.result.current.note?.id).toBe(note.id));
    expect(reopened.result.current.note?.description).toBeNull();
    expect(reopened.result.current.descriptionDraft).toBe('');
  });

  it('D2 preserves source projection read-only behavior for both header fields', async () => {
    const sourceNote: Note = { ...note, note_class: 'source_projection' };
    const originalGet = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation(async (url: string) => url === `/notes/${note.id}` ? { data: sourceNote } : originalGet(url));
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.sourceProjectionPolicy.contentReadOnly).toBe(true));
    await act(async () => {
      subject.result.current.setTitleDraft('Attempted title');
      subject.result.current.setDescriptionDraft('Attempted introduction');
      await subject.result.current.saveHeaderMetadata();
    });
    expect(mocks.put).not.toHaveBeenCalled();
    expect(subject.result.current.note).toMatchObject(sourceNote);
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
    'sends an atomic save with empty changesets for unchanged TextFlow from %s',
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

      expect(outcome).toMatchObject({ status: 'saved', reconciliation: 'response', block: { text_save_revision: 1 } });
      expect(mocks.atomicPut).toHaveBeenCalledWith(`/note-blocks/${block.id}/text-save`, expect.objectContaining({
        base_revision: 0, annotations: { range_updates: [] }, text_ranges: [],
      }));
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

  it('B4 reports an unconfirmed annotation result after failed reconciliation and keeps the live draft for retry', async () => {
    const initial = annotationWithOffsets(note.id, 6, 10, 'beta');
    const desired = annotationWithOffsets(note.id, 13, 17, 'beta');
    durableAnnotationTruths = [initial];
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initial]));
    const originalGet = mocks.get.getMockImplementation()!;
    mocks.get.mockImplementation(async (url: string) => {
      if (url === `/annotation-truths/by-note/${note.id}`) throw new Error('synthetic reconciliation unavailable');
      return originalGet(url);
    });
    mocks.put.mockRejectedValue(new Error('synthetic annotation write failed'));
    let outcome = true;
    await act(async () => {
      subject.result.current.setAnnotationTruthsSnapshot([desired]);
      outcome = await subject.result.current.saveAnnotationTruthsOutcome([desired], { preserveDrafts: true });
    });
    expect(outcome).toBe(false);
    expect(subject.result.current.readAnnotationTruths()).toEqual([desired]);
    expect(durableAnnotationTruths).toEqual([initial]);
    await expect(subject.result.current.whenIdle()).rejects.toThrow();

    mocks.get.mockImplementation(originalGet);
    mocks.put.mockImplementation(async (_url: string, payload: { annotations: AnnotationTruthV1[] }) => {
      durableAnnotationTruths = payload.annotations;
      return { data: durableAnnotationTruths };
    });
    await act(async () => {
      expect(await subject.result.current.saveAnnotationTruthsOutcome([desired], { preserveDrafts: true })).toBe(true);
    });
    await expect(subject.result.current.whenIdle()).resolves.toBeUndefined();
  });

  it('B4 rejects a partial annotation acknowledgement without replacing newer live annotations', async () => {
    const first = annotationWithOffsets(note.id, 6, 10, 'beta');
    const second = { ...first, id: 'second-annotation', ranges: [{ ...first.ranges[0], id: 'second-range' }] };
    durableAnnotationTruths = [first];
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([first]));
    mocks.put.mockResolvedValue({ data: [first] });
    let outcome = true;
    await act(async () => {
      subject.result.current.setAnnotationTruthsSnapshot([first, second]);
      outcome = await subject.result.current.saveAnnotationTruthsOutcome([first, second], { preserveDrafts: true });
    });
    expect(outcome).toBe(false);
    expect(subject.result.current.readAnnotationTruths()).toEqual([first, second]);
    await expect(subject.result.current.whenIdle()).rejects.toThrow();
  });

  it('B4 returns false for a held annotation response after the Note hydration generation changes', async () => {
    const initial = annotationWithOffsets(note.id, 6, 10, 'beta');
    const desired = annotationWithOffsets(note.id, 13, 17, 'beta');
    const newer = annotationWithOffsets(note.id, 20, 24, 'beta');
    durableAnnotationTruths = [initial];
    const held = deferred<{ data: AnnotationTruthV1[] }>();
    mocks.put.mockReturnValue(held.promise);
    const subject = renderHook(
      ({ onNoteLoaded }: { onNoteLoaded: () => void }) => useNoteCanvasDataAdapter({ ...stableAdapterOptions, onNoteLoaded }),
      { initialProps: { onNoteLoaded: vi.fn() }, wrapper },
    );
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([initial]));
    const oldSave = subject.result.current.saveAnnotationTruthsOutcome;
    let saving!: Promise<boolean>;
    act(() => { saving = oldSave([desired], { preserveDrafts: true }); });
    durableAnnotationTruths = [newer];
    subject.rerender({ onNoteLoaded: vi.fn() });
    await waitFor(() => expect(subject.result.current.annotationTruths).toEqual([newer]));
    await act(async () => {
      held.resolve({ data: [desired] });
      expect(await saving).toBe(false);
      expect(await oldSave([desired], { preserveDrafts: true })).toBe(false);
    });
    expect(subject.result.current.readAnnotationTruths()).toEqual([newer]);
    expect(mocks.put).toHaveBeenCalledTimes(1);
  });

  it('B4 keeps newer local TextFlow and annotation drafts when an earlier queued save is acknowledged', async () => {
    const before = createTextBlockContentV1('alpha beta gamma');
    const firstFlow = createTextBlockContentV1('prefix alpha beta gamma');
    const laterFlow = createTextBlockContentV1('more prefix alpha beta gamma');
    const initialRange = annotationWithOffsets(note.id, 6, 10, 'beta');
    const firstRange = annotationWithOffsets(note.id, 13, 17, 'beta');
    const laterRange = annotationWithOffsets(note.id, 18, 22, 'beta');
    durableAnnotationTruths = [initialRange];
    durableBlocks = [{ ...serverBlock('alpha beta gamma', false), content_json: { body: 'alpha beta gamma', [TEXT_FLOW_CONTENT_KEY]: before } }];
    const bodyPut = deferred<{ data: NoteBlock }>();
    const annotationPut = deferred<{ data: AnnotationTruthV1[] }>();
    mocks.put.mockImplementation((url: string) => url.startsWith('/note-blocks/') ? bodyPut.promise : annotationPut.promise);
    const subject = renderHook(() => useNoteCanvasDataAdapter(stableAdapterOptions), { wrapper });
    await waitFor(() => expect(subject.result.current.blocks).toHaveLength(1));
    const block = subject.result.current.blocks[0];
    let bodySave!: Promise<BlockSaveOutcome>;
    let annotationSave!: Promise<boolean>;
    act(() => {
      subject.result.current.setBlockTextFlowDrafts({ [block.id]: firstFlow });
      subject.result.current.setBlockTextDrafts({ [block.id]: 'prefix alpha beta gamma' });
      subject.result.current.setAnnotationTruthsSnapshot([firstRange]);
      bodySave = subject.result.current.saveBlock(block, 'prefix alpha beta gamma', { textFlow: firstFlow, preserveDrafts: true });
      annotationSave = subject.result.current.saveAnnotationTruthsOutcome([firstRange], { preserveDrafts: true });
    });
    act(() => {
      subject.result.current.setBlockTextFlowDrafts({ [block.id]: laterFlow });
      subject.result.current.setBlockTextDrafts({ [block.id]: 'more prefix alpha beta gamma' });
      subject.result.current.setAnnotationTruthsSnapshot([laterRange]);
    });
    await act(async () => {
      bodyPut.resolve({ data: { ...block, plain_text: 'prefix alpha beta gamma', content_json: { body: 'prefix alpha beta gamma', [TEXT_FLOW_CONTENT_KEY]: firstFlow } } });
      annotationPut.resolve({ data: [firstRange] });
      expect(await bodySave).toMatchObject({ status: 'saved' });
      expect(await annotationSave).toBe(true);
    });
    expect(subject.result.current.blockTextFlowDrafts[block.id]).toEqual(laterFlow);
    expect(subject.result.current.blockTextDrafts[block.id]).toBe('more prefix alpha beta gamma');
    expect(subject.result.current.readAnnotationTruths()).toEqual([laterRange]);
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
