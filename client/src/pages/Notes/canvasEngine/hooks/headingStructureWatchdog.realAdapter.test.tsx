// Round 2, red 1 (K1/K2): the save of a heading's role change hangs past the watchdog and then succeeds.
// The watchdog may give the screen back, but the structure plan must not be dropped: once the save
// succeeds the heading still gets its own block. Runs on the real data adapter, with its own current()
// checks, over a synthetic server held in this file (TD-55: a fake adapter without those checks proves nothing).
// Red before round 2: the run the watchdog let go is still inside its history batch, waiting on the same flush as
// the structure the landed words ask for. That flush settles, the new structure calls runBatch at once, the old one
// still has a frame to wait, and the history refuses the second batch: no block, no transfer, heading left unsplit.
import { renderHook, waitFor } from '@testing-library/react';
import { useRef, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Note, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { createTextBlockContentV1, getTextFlowContent, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { applyHeadingInputAtLine } from '../headingInputService';
import { normalizePageFrameCollection } from '../pageFrameCollectionService';
import { useHeadingStructureController } from './useHeadingStructureController';
import { usePlacementHistory } from './usePlacementHistory';
import { useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';
import { useNoteCanvasDataAdapter } from './useNoteCanvasDataAdapter';

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  getToken: () => null, setToken: vi.fn(),
  default: {
    get: (url: string, ...args: unknown[]) => (url === '/palette-colors' || url === '/skin-suites')
      ? Promise.resolve({ data: [] })
      : url.startsWith('/boards/text-ranges/by-note/')
      ? Promise.resolve({ data: { text_ranges: [] } })
      : url === '/canvas-objects/coordinate-contract'
      ? Promise.resolve({ data: { coordinate_contract: 'v2' } })
      : mocks.get(url, ...args),
    post: mocks.post, put: mocks.put, delete: mocks.delete,
  },
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (state: { addToast: typeof mocks.addToast }) => unknown) => selector({ addToast: mocks.addToast }),
}));

// The app runs under React's own scheduler; an act scope would hold the commits the structure waits for.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;

const note: Note = { id: 'note-k1', course_id: '', title: 'K1', description: null, status: 'active', metadata: {} };
// Blocks sit on a page: the canvas workspace takes no new placements.
const pages = normalizePageFrameCollection({
  pageFrames: [{ id: 'page', role: 'primary_page_frame', exportable: true, x: 84, y: 80, width: 794, height: 1320,
    pageSize: 'A4', contentInset: { left: 72, top: 96, right: 72, bottom: 96 } }],
  primaryFrameId: 'page', selectedFrameId: 'page',
});
const layout = { x: 0, y: 100, width: 400, height: 64, width_mode: 'auto' as const, frame_id: 'page',
  coordinate_space: 'page_frame_local' as const, surface: 'formal_page' as const, boundary_role: 'inside' as const };
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// Each write takes as long as a real round trip (the browser matrix runs at 57 ms each way). With instant replies
// the race below never opens: the words' save is done before the next structure reaches the history's flush.
const LATENCY = 120;

function startingBlock(): NoteBlock {
  const flow = createTextBlockContentV1('warmup');
  flow.units = [flow.units[0], { ...flow.units[0], id: 'tu-2', text: '', order_index: 1 }];
  return { id: 'block-1', placement_id: 'placement-1', display_overrides_json: {}, canvas_layout: layout, block_type: 'text',
    title: null, content_json: { [TEXT_FLOW_CONTENT_KEY]: flow }, plain_text: 'warmup\n', metadata: {}, order_index: 0,
    source_references: [], text_save_revision: 0 };
}

// What the server holds, block by block in order: each unit as text, a heading marked H:.
let durable: NoteBlock[] = [];
const shape = () => [...durable].sort((a, b) => a.order_index - b.order_index).map((block) =>
  (getTextFlowContent(block.content_json)?.units ?? []).filter((unit) => unit.status !== 'deleted')
    .map((unit) => `${unit.writing_role === 'paragraph' ? '' : 'H:'}${unit.text}`).join('|'));
let held: Promise<void> | null = null;
let textSaves = 0;
const requests: string[] = [];
// Printed by every wait that times out, so a failure says where the run stood.
const state = () => `server: ${JSON.stringify(shape())}
requests: ${requests.join(', ')}
toasts: ${JSON.stringify(mocks.addToast.mock.calls)}`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  sessionStorage.clear(); localStorage.clear();
  durable = [startingBlock()]; held = null; textSaves = 0; requests.length = 0;
  mocks.get.mockImplementation(async (url: string) => {
    if (url === `/notes/${note.id}`) return { data: note };
    if (url === `/notes/${note.id}/blocks`) return { data: structuredClone(durable) };
    if (url === `/canvas-objects/by-note/${note.id}`) return { data: { pageFrameCollection: pages } };
    if (url.endsWith('/page-frame-collection')) return { data: pages };
    if (url === `/annotation-truths/by-note/${note.id}`) return { data: [] };
    if (['/content-groups', '/group-folders', '/purposes', '/templates'].includes(url)) return { data: [] };
    throw new Error(`Unexpected GET ${url}`);
  });
  let created = 0;
  mocks.post.mockImplementation(async (url: string, body: Record<string, unknown>) => {
    requests.push(`POST ${url}`);
    await sleep(LATENCY);
    if (url !== `/notes/${note.id}/blocks`) throw new Error(`Unexpected POST ${url}`);
    created += 1;
    const block = { ...startingBlock(), ...structuredClone(body), id: `new-${created}`, placement_id: `new-place-${created}`,
      order_index: durable.length, canvas_layout: null, text_save_revision: 0 } as NoteBlock;
    durable = [...durable, block];
    return { data: structuredClone(block) };
  });
  mocks.put.mockImplementation(async (url: string, body: Record<string, any>) => {
    requests.push(`PUT ${url}`);
    await sleep(LATENCY);
    if (url.endsWith('/text-save')) {
      textSaves += 1;
      // The first text save after the '#' is the role change: it is the one that hangs.
      if (textSaves === 1 && held) await held;
      const id = url.split('/')[2];
      const before = durable.find((block) => block.id === id)!;
      const saved = { ...before, ...structuredClone(body.block), text_save_revision: body.base_revision + 1 };
      durable = durable.map((block) => block.id === id ? saved : block);
      return { data: { block: structuredClone(saved), annotations: [], text_ranges: [], revision: body.base_revision + 1 } };
    }
    if (url.includes('/block-placements/')) {
      return { data: { block_id: body.block_id, placement_id: url.split('/').pop(), layout: body.layout } };
    }
    if (url.endsWith('/unit-transfer')) {
      const targetId = url.split('/')[2];
      const source = { ...durable.find((block) => block.id === body.source_block_id)!, ...structuredClone(body.source_block),
        text_save_revision: body.source_base_revision + 1 };
      const target = { ...durable.find((block) => block.id === targetId)!, ...structuredClone(body.target_block),
        text_save_revision: body.target_base_revision + 1 };
      durable = durable.map((block) => block.id === source.id ? source : block.id === target.id ? target : block);
      return { data: { source_block: structuredClone(source), target_block: structuredClone(target),
        source_revision: source.text_save_revision, target_revision: target.text_save_revision, annotations: [], text_ranges: [] } };
    }
    if (url.endsWith('/blocks/reorder')) {
      const order = new Map((body.placements as Array<{ placement_id: string; order_index: number }>)
        .map((entry) => [entry.placement_id, entry.order_index]));
      durable = durable.map((block) => ({ ...block, order_index: order.get(block.placement_id!) ?? block.order_index }));
      return { data: {} };
    }
    throw new Error(`Unexpected PUT ${url}`);
  });
});

afterEach(() => {
  document.querySelectorAll<HTMLButtonElement>('[data-structure-typing-notice] button').forEach((button) => button.click());
  document.querySelectorAll('textarea[data-structure-typing-buffer]').forEach((element) => element.remove());
});

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

// Stable across renders, or every render starts the note's load again.
const adapterOptions = { noteId: note.id, onNoteLoaded: vi.fn(), clearLayoutDraftForBlock: vi.fn(), setLayoutDraftForBlock: vi.fn() };

function renderNote(watchdogMs: number) {
  const failure = vi.fn();
  const template = { template_id: 'text.paragraph', template_key: 'text.paragraph', template_version: '1.0.0', label: 'Text',
    description: 'Text', system_type: 'text', learning_role: 'note', legacy_block_type: 'paragraph', default_content: {},
    origin: 'test', status: 'active', isRuntime: false };
  const subject = renderHook(() => {
    const adapter = useNoteCanvasDataAdapter(adapterOptions);
    const host = useRef<TextFlowHistoryHost | null>(null);
    const editing = useTextFlowHistory({
      noteId: note.id, generation: adapter.textHistoryGeneration, blocks: adapter.blocks,
      annotationTruths: adapter.annotationTruths, readAnnotationTruths: adapter.readAnnotationTruths,
      setAnnotationTruthsSnapshot: adapter.setAnnotationTruthsSnapshot, saveAnnotationTruthsOutcome: adapter.saveAnnotationTruthsOutcome,
      blockTextFlowDrafts: adapter.blockTextFlowDrafts, setBlockTextFlowDrafts: adapter.setBlockTextFlowDrafts,
      setBlockTextDrafts: adapter.setBlockTextDrafts, captureBoardTextRanges: adapter.captureBoardTextRanges,
      restoreBoardTextRanges: adapter.restoreBoardTextRanges, rebaseBoardTextRanges: adapter.rebaseBoardTextRanges,
      saveBlock: adapter.saveBlock, history: host,
      createDraftBlock: adapter.createDraftBlock, saveDraftBlockPlacement: adapter.saveDraftBlockPlacement,
      discardDraftBlock: adapter.discardDraftBlock, trashBlock: adapter.trashBlock, restoreBlock: adapter.restoreBlock,
      transferTextUnit: adapter.transferTextUnit,
    });
    const history = usePlacementHistory({ noteId: note.id, generation: adapter.textHistoryGeneration,
      beforeHistoryBoundary: () => editing.boundary(), applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(), target: null });
    host.current = history;
    const heading = useHeadingStructureController({ noteId: note.id, blocks: adapter.sortedBlocks,
      layouts: Object.fromEntries(adapter.blocks.map((block) => [block.id, layout])), readOnly: false,
      template: template as never, textHistory: editing, reorderBlocks: adapter.reorderBlocks, whenWritesIdle: adapter.whenIdle,
      onFocusBlock: vi.fn(), onFailure: failure, setBlockTextDrafts: adapter.setBlockTextDrafts,
      watchdogMs, editorWaitMs: 50, placeRetryMs: 50 });
    return { adapter, editing, heading };
  }, { wrapper });
  return { subject, failure };
}

function typeInWindow(text: string) {
  const buffer = document.querySelector<HTMLTextAreaElement>('textarea[data-structure-typing-buffer]');
  if (!buffer) throw new Error('no window open');
  buffer.setRangeText(text, buffer.selectionStart, buffer.selectionEnd, 'end');
  buffer.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('round 2 red 1: a role save that hangs past the watchdog and then succeeds (real adapter)', () => {
  it('K1: the watchdog gives the screen back, and once the save succeeds the heading still takes its own block', async () => {
    // The watchdog is short here but still well longer than the next structure's wait for the write that hangs and
    // the words' save behind it (two round trips), as 10 s is in the app; the margin keeps a loaded machine green.
    const { subject, failure } = renderNote(2000);
    await waitFor(() => expect(subject.result.current.adapter.loading).toBe(false), { onTimeout: (error) => new Error(`${error.message}
${state()}`) });
    let release!: () => void;
    held = new Promise<void>((resolve) => { release = resolve; });
    const block = subject.result.current.adapter.blocks[0];
    const request = applyHeadingInputAtLine(getTextFlowContent(block.content_json) as TextBlockContentV1, 'tu-2', '# ', 2)!;
    void subject.result.current.heading.onHeadingStructure(block, request);
    await waitFor(() => expect(document.querySelector('textarea[data-structure-typing-buffer]')).toBeTruthy(),
      { onTimeout: (error) => new Error(`${error.message}
${state()}`) });
    typeInWindow('kept');
    // Past the watchdog: the run is let go and the failure is said. The words then land, and the structure
    // they ask for waits, busy again, for the write still out; that is the frozen build's behaviour too.
    await waitFor(() => expect(failure).toHaveBeenCalled(), { timeout: 6000, onTimeout: (error) => new Error(`${error.message}
${state()}`) });
    await sleep(200);
    // The save that hung succeeds.
    release();
    await waitFor(() => expect(shape()).toEqual(['warmup', 'H:kept']), { timeout: 10_000,
      onTimeout: (error) => new Error(`${error.message}
server: ${JSON.stringify(shape())}
requests: ${requests.join(', ')}
toasts: ${JSON.stringify(mocks.addToast.mock.calls)}`) });
    // The structure ran after the save: a block was made, placed, and the heading moved into it. A reorder follows
    // only when the new block did not already arrive last, which depends on timing; either is right.
    const after = requests.slice(2).filter((entry) => entry !== `PUT /notes/${note.id}/blocks/reorder`);
    expect(after).toEqual([`POST /notes/${note.id}/blocks`,
      `PUT /canvas-objects/by-note/${note.id}/block-placements/new-place-1`, 'PUT /note-blocks/new-1/unit-transfer']);
    subject.unmount();
  }, 40_000);
});
