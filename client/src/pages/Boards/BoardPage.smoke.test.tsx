import { useMemo, useRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardList from './BoardList';
import BoardPage from './BoardPage';
import type { Board, BoardDetail, BoardEdge, BoardMember, BoardVisual, CreateBoardInput } from './boardTypes';
import { useNoteCanvasDataAdapter } from '../Notes/canvasEngine/hooks/useNoteCanvasDataAdapter';
import { useNoteCanvasFrameModel, useNoteCanvasResolvedLayoutModel } from '../Notes/canvasEngine/hooks/useNoteCanvasLayoutModel';
import { usePageReadingPresentation } from '../Notes/canvasEngine/hooks/usePageReadingPresentation';
import { createPrimaryPageFrame, createViewport } from '../Notes/canvasEngine/engineModel';
import { createSurfaceModePolicy } from '../Notes/canvasEngine/modePolicyService';
import { resolveEffectiveDocumentTypographyProfile } from '../Notes/canvasEngine/pageFrameTypographyService';
import { normalizeContentGroup } from '../Notes/canvasEngine/contentGroupService';
import type { Note, NoteBlock, PurposeFrameV1 } from '../Notes/canvasEngine/runtimeDataTypes';

// Only transport is replaced. Board UI/repository/hook and paper hydration/layout/reading hooks are production code.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
const addToast = vi.hoisted(() => vi.fn());
vi.mock('@/services/api', () => ({ default: http }));
vi.mock('@/stores/uiStore', () => ({ useUIStore: (select: (state: { addToast: typeof addToast }) => unknown) => select({ addToast }) }));

const date = '2026-09-08T12:00:00.000Z';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const response = <T,>(data: T) => ({ data: clone(data) });
const projects = [{ id: 'project-a', name: 'Fieldwork' }, { id: 'project-b', name: 'Synthesis' }];
const notes: Note[] = ['Field observation', 'Working hypothesis', 'Counterexample'].map((title, index) => ({
  id: `note-${index + 1}`, course_id: index === 0 ? projects[0].id : projects[1].id,
  title, description: `Summary for ${title}`, status: 'active', metadata: {},
}));
const group = normalizeContentGroup({
  id: 'group-1', note_id: notes[0].id, project_id: projects[0].id, canvas_id: notes[0].id,
  title: 'Observation excerpts', identity: { summary: 'A group stays in its source paper' }, members: [],
});
const paperFrame = createPrimaryPageFrame({ id: 'frame-a' });
const paperCollection = { pageFrames: [paperFrame], pageStacks: [], primaryFrameId: paperFrame.id, selectedFrameId: paperFrame.id };
const paperBlock: NoteBlock = {
  id: 'block-a', placement_id: 'placement-a', block_type: 'paragraph', title: null,
  content_json: { body: 'The original paragraph stays on its own paper.' },
  plain_text: 'The original paragraph stays on its own paper.', metadata: {}, order_index: 0,
  source_references: [], display_overrides_json: {}, canvas_layout: null,
};
const paperPayload = {
  pageFrameCollection: paperCollection,
  blockLayouts: [{ placement_id: paperBlock.placement_id, block_id: paperBlock.id, layout: {
    x: 0, y: 40, width: 760, height: 88, surface: 'formal_page', coordinate_space: 'page_frame_local',
    frame_id: paperFrame.id, boundary_role: 'inside',
  } }],
  canvasObjects: [], canvasPlacements: [], contentMounts: [], visualConnectors: [], imageObjects: [], structuredObjects: [],
};
const paperSourceBefore = clone({ notes, paperBlock, paperPayload });
const pagePolicy = createSurfaceModePolicy('page');
const pageViewport = createViewport({ width: 1130, height: 900 });
const noOp = () => undefined;
const emptyDrafts = {};

function PaperProbe() {
  const { noteId } = useParams();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const blockListRef = useRef<HTMLDivElement>(null);
  const data = useNoteCanvasDataAdapter({ noteId, onNoteLoaded: noOp, clearLayoutDraftForBlock: noOp, setLayoutDraftForBlock: noOp });
  const frames = data.pageFrameCollection?.pageFrames || paperCollection.pageFrames;
  const typography = useMemo(() => resolveEffectiveDocumentTypographyProfile({
    surfaceMode: 'page', metadata: data.note?.metadata, pageFrames: frames, hydratedProfile: data.documentTypographyProfile,
  }), [data.note?.metadata, frames, data.documentTypographyProfile]);
  const layout = useNoteCanvasResolvedLayoutModel({
    coordinateContract: data.coordinateContract, contentWidth: 760, documentTypographyProfile: typography,
    layoutDrafts: emptyDrafts, sortedBlocks: data.sortedBlocks, pageFrames: frames, surfaceMode: 'page', surfacePolicy: pagePolicy,
  });
  const frame = useNoteCanvasFrameModel({
    coordinateContract: data.coordinateContract, blockLayouts: layout.blockLayouts, defaultDraftLayout: layout.defaultDraftLayout,
    documentTypographyProfile: typography, draftActive: false, draftLayout: null, pageFrameCollection: data.pageFrameCollection,
    persistedCanvasObjects: data.persistedCanvasObjects, persistedCanvasPlacements: data.persistedCanvasPlacements,
    persistedContentMounts: data.persistedContentMounts, persistedVisualConnectors: data.persistedVisualConnectors,
    persistedImageObjects: data.persistedImageObjects, persistedStructuredObjects: data.persistedStructuredObjects,
    pageOffsetX: 0, surfaceMode: 'page', viewportTransform: pageViewport, visibleBlocks: layout.visibleBlocks,
  });
  const readingInput = { enabled: true, noteId, surfaceRef, blockListRef, pageFrame: frame.primaryPageFrame, pageContentHeight: frame.pageContentHeight };
  const fitWidth = usePageReadingPresentation({ ...readingInput, viewState: { gear: 'fit_width', stepFactor: 1 } });
  const fitPage = usePageReadingPresentation({ ...readingInput, viewState: { gear: 'fit_page', stepFactor: 1 } });
  const physical = usePageReadingPresentation({ ...readingInput, viewState: { gear: 'physical', stepFactor: 1 } });
  const sample = {
    noteId: data.note?.id,
    coordinateContract: data.coordinateContract,
    stored: data.blocks.map(({ id, canvas_layout }) => ({ id, canvas_layout })),
    resolved: layout.blockLayouts,
    placements: frame.noteCanvasRuntime.blockPlacements,
    pageFrames: frame.runtimePageFrameCollection.pageFrames,
    typography: { fontSizePx: typography.fontSizePx, lineHeightPx: typography.lineHeightPx },
    reading: [fitWidth, fitPage, physical],
  };
  return <section ref={surfaceRef} aria-label="Production paper probe">
    <div ref={blockListRef}>{!data.loading && data.note && <output data-testid="paper-snapshot">{JSON.stringify(sample)}</output>}</div>
    <Link to="/boards">Go to boards</Link>
  </section>;
}

let boards: BoardDetail[];
let purposes: PurposeFrameV1[];
let sequence: number;
let unexpectedWrites: string[];
const geometry = { x: 0, y: 0, w: 260, h: 156, scale: 1, z_index: 0, pinned: false };

function soul(id: string, title: string): PurposeFrameV1 {
  return { id, title, project_id: null, course_id: null, note_id: null, status: 'active',
    is_note_default: false, created_by: 'human', members: [], created_at: date, updated_at: date };
}

function detailFor(url: string): BoardDetail {
  const detail = boards.find(({ board }) => board.id === url.split('/')[2]);
  if (!detail) throw new Error(`Unknown fixture board: ${url}`);
  return detail;
}

function unexpectedWrite(method: string, url: string): never {
  unexpectedWrites.push(`${method} ${url}`);
  throw new Error(`Unexpected fixture write: ${method} ${url}`);
}

function renderRoutes(initial = `/notes/${notes[0].id}`, externalPath?: string) {
  return render(<MemoryRouter initialEntries={[initial]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    {externalPath && <Link to={externalPath}>Go to another board</Link>}
    <Routes>
      <Route path="/boards" element={<BoardList />} />
      <Route path="/boards/:boardId" element={<BoardPage />} />
      <Route path="/notes/:noteId" element={<PaperProbe />} />
    </Routes>
  </MemoryRouter>);
}

function card(title: string) { return screen.getByRole('article', { name: title }); }
function pointer(target: Element, name: 'pointerDown' | 'pointerMove' | 'pointerUp', x: number, y: number) {
  fireEvent[name](target, { pointerId: 1, button: 0, buttons: name === 'pointerUp' ? 0 : 1, clientX: x, clientY: y });
}
async function saved() { await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy()); }

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function seedBoard(id: string, title: string, withMember = true) {
  const purpose = soul(`soul-${id}`, `Question for ${title}`);
  purposes.push(purpose);
  const board: Board = { id, user_id: 'fixture-user', title, soul_id: purpose.id, project_id: null,
    viewport: { x: 0, y: 0, zoom: 1 }, created_at: date, updated_at: date };
  const member: BoardMember = { ...geometry, id: `member-${id}`, board_id: id,
    member_kind: 'note', member_id: notes[0].id, x: 80, y: 70, metadata: {}, created_at: date, updated_at: date,
    reference: { kind: 'note', id: notes[0].id, title: notes[0].title, note_id: notes[0].id, state: 'available', reason: null } };
  const detail: BoardDetail = { board, members: withMember ? [member] : [], edges: [], visuals: [] };
  boards.push(detail);
  return detail;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  boards = []; purposes = []; sequence = 0; unexpectedWrites = [];
  // jsdom supplies the viewport, while all paper geometry and scale calculations remain real.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1130);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(900);
  vi.stubGlobal('innerHeight', 964);
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId || 0; }
  });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: noOp },
    releasePointerCapture: { configurable: true, value: noOp },
    hasPointerCapture: { configurable: true, value: () => false },
  });
  http.get.mockImplementation(async (url: string, config?: { params?: { course_id?: string; note_id?: string } }) => {
    if (url === '/boards') return response({ boards: boards.map(({ board }) => board) });
    if (url.startsWith('/boards/')) return response(detailFor(url));
    if (url === '/purposes') return response({ purposes });
    if (url === '/courses') return response(projects);
    if (url === '/notes') return response(notes.filter(({ course_id }) => course_id === config?.params?.course_id));
    if (url === '/content-groups') return response(config?.params?.course_id === projects[0].id ? [group] : []);
    if (url === '/group-folders' || url === '/templates' || url === '/source-anchors') return response([]);
    if (url === '/canvas-objects/coordinate-contract') return response({ coordinate_contract: 'v2' });
    if (url.startsWith('/canvas-objects/by-note/')) return response(paperPayload);
    if (url.startsWith('/annotation-truths/by-note/')) return response([]);
    if (url === `/notes/${notes[0].id}`) return response(notes[0]);
    if (url === `/notes/${notes[0].id}/blocks`) return response([paperBlock]);
    throw new Error(`Unexpected fixture GET: ${url}`);
  });
  http.post.mockImplementation(async (url: string, input: any) => {
    if (url === '/source-anchors/generate') return response({ generated: 0 });
    if (url === '/boards') {
      const creation = input as CreateBoardInput;
      if (creation.soul_id && boards.some(({ board }) => board.soul_id === creation.soul_id)) {
        throw { response: { status: 409, data: { error: 'purpose_already_has_board' } } };
      }
      const purpose = creation.soul_id ? purposes.find(({ id }) => id === creation.soul_id)!
        : soul(`soul-${++sequence}`, creation.purpose!.title);
      if (!creation.soul_id) purposes.push(purpose);
      const board: Board = { id: `board-${++sequence}`, user_id: 'fixture-user', title: creation.title,
        soul_id: purpose.id, project_id: null, viewport: { x: 0, y: 0, zoom: 1 }, created_at: date, updated_at: date };
      boards.push({ board, members: [], edges: [], visuals: [] });
      return response({ board });
    }
    if (url.startsWith('/boards/') && url.endsWith('/members')) {
      const detail = detailFor(url);
      const note = input.member_kind === 'note' ? notes.find(({ id }) => id === input.member_id)!
        : notes.find(({ id }) => id === group.note_id)!;
      const member: BoardMember = { ...geometry, ...clone(input), id: input.id || `member-${++sequence}`,
        board_id: detail.board.id, metadata: {}, created_at: date, updated_at: date,
        reference: { kind: input.member_kind, id: input.member_id, state: 'available', reason: null,
          title: input.member_kind === 'note' ? note.title : group.title, note_id: note.id } };
      detail.members.push(member);
      return response({ member, created: true });
    }
    if (url.startsWith('/boards/') && url.endsWith('/edges')) {
      const detail = detailFor(url);
      const edge: BoardEdge = { id: `edge-${++sequence}`, board_id: detail.board.id, style: {}, label: null, created_at: date, ...clone(input) };
      detail.edges.push(edge);
      return response({ edge });
    }
    if (url.startsWith('/boards/') && url.endsWith('/visuals')) {
      const detail = detailFor(url);
      const visual: BoardVisual = { ...geometry, rotation: 0, metadata: {}, ...clone(input), id: `visual-${++sequence}`,
        board_id: detail.board.id, created_at: date, updated_at: date };
      detail.visuals.push(visual);
      return response({ visual });
    }
    return unexpectedWrite('POST', url);
  });
  http.patch.mockImplementation(async (url: string, input: object) => {
    if (!url.startsWith('/boards/')) return unexpectedWrite('PATCH', url);
    const detail = detailFor(url);
    if (url.includes('/members/')) {
      const member = detail.members.find(({ id }) => id === url.split('/')[4])!;
      Object.assign(member, clone(input));
      return response({ member });
    }
    if (url.split('/').length === 3) { Object.assign(detail.board, clone(input)); return response({ board: detail.board }); }
    return unexpectedWrite('PATCH', url);
  });
  http.put.mockImplementation(async (url: string) => unexpectedWrite('PUT', url));
  http.delete.mockImplementation(async (url: string) => {
    if (url.startsWith('/boards/') && url.includes('/visuals/')) {
      const detail = detailFor(url);
      const visualId = url.split('/')[4];
      const visual = detail.visuals.find(({ id }) => id === visualId);
      if (!visual) throw new Error(`Unknown fixture drawing: ${url}`);
      detail.visuals = detail.visuals.filter(({ id }) => id !== visualId);
      return response({ visual });
    }
    return unexpectedWrite('DELETE', url);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture');
  Reflect.deleteProperty(HTMLElement.prototype, 'releasePointerCapture');
  Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture');
});

describe('V13 S2 board and paper smoke', () => {
  it('opens a soul, arranges three notes, connects and draws, reopens, then zooms and enters unchanged production paper', async () => {
    renderRoutes();
    await screen.findByTestId('paper-snapshot');
    await waitFor(() => expect(JSON.parse(screen.getByTestId('paper-snapshot').textContent!).reading[0].baseScale).toBe(1.25));
    const before = JSON.parse(screen.getByTestId('paper-snapshot').textContent!);
    expect(before.coordinateContract).toBe('v2');
    expect(before.stored[0].canvas_layout).toMatchObject({ x: 0, y: 40, width: 760, frame_id: 'frame-a', coordinate_space: 'page_frame_local' });
    expect(before.resolved['block-a']).toMatchObject({ x: 0, y: 40, width: 760, height: 88, surface: 'formal_page' });
    fireEvent.click(screen.getByRole('link', { name: 'Go to boards' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'What are you working through?' }), { target: { value: 'Why do these observations connect?' } });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Open board' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Open board' }));
    await screen.findByRole('heading', { name: 'Why do these observations connect?' });
    expect(purposes).toHaveLength(1);
    expect(boards[0].board.soul_id).toBe(purposes[0].id);
    fireEvent.click(screen.getByRole('button', { name: 'Add notes' }));
    await screen.findByRole('button', { name: `Add ${group.title} to board` });
    for (const note of notes) {
      fireEvent.click(screen.getByRole('button', { name: `Add ${note.title} to board` }));
      await screen.findByRole('article', { name: note.title });
      await saved();
    }
    expect(new Set(boards[0].members.map(({ id }) => id)).size).toBe(3);
    expect(boards[0].members.map(({ member_id }) => member_id)).toEqual(notes.map(({ id }) => id));
    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    for (const [from, to] of [[notes[0], notes[1]], [notes[1], notes[2]]]) {
      pointer(card(from.title), 'pointerDown', 100, 100);
      pointer(card(to.title), 'pointerDown', 400, 100);
      await waitFor(() => expect(boards[0].edges.some((edge) => edge.from_member_id === boards[0].members.find(({ member_id }) => member_id === from.id)!.id)).toBe(true));
      await saved();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getAllByLabelText(/^Connection /)).toHaveLength(2);
    const surface = screen.getByTestId('board-surface');
    const firstCard = card(notes[0].title);
    const memberCapture = vi.spyOn(firstCard, 'setPointerCapture');
    const surfaceCapture = vi.spyOn(surface, 'setPointerCapture');
    pointer(firstCard, 'pointerDown', 100, 100);
    expect(memberCapture).toHaveBeenCalledWith(1);
    expect(surfaceCapture).not.toHaveBeenCalled();
    pointer(surface, 'pointerMove', 148, 124);
    pointer(surface, 'pointerUp', 148, 124);
    await waitFor(() => expect(boards[0].members[0]).toMatchObject({ x: 128, y: 94 }));
    await saved();
    fireEvent.click(screen.getByRole('button', { name: 'Enlarge projection' }));
    await waitFor(() => expect(boards[0].members[0].scale).toBe(1.1));
    await saved();
    fireEvent.click(screen.getByRole('button', { name: 'Bring forward' }));
    await waitFor(() => expect(boards[0].members[0].z_index).toBe(4));
    await saved();
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    await waitFor(() => expect(boards[0].members[0].pinned).toBe(true));
    await saved();
    fireEvent.click(screen.getByRole('button', { name: 'Pen' }));
    pointer(surface, 'pointerDown', 30, 350);
    pointer(surface, 'pointerMove', 70, 380);
    pointer(surface, 'pointerMove', 110, 360);
    pointer(surface, 'pointerUp', 110, 360);
    await waitFor(() => expect(boards[0].visuals).toHaveLength(1));
    await saved();
    expect(boards[0].visuals[0]).toMatchObject({ visual_kind: 'freehand', x: 30, y: 350, w: 80, h: 30,
      data: { points: [{ x: 0, y: 0 }, { x: 40, y: 30 }, { x: 80, y: 10 }], style: { color_token: 'ink', width: 2.5 } } });
    const persistedBoard = clone(boards[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Boards' }));
    fireEvent.click(await screen.findByRole('link', { name: /Why do these observations connect/ }));
    await screen.findByRole('article', { name: notes[0].title });
    expect(card(notes[0].title).style.left).toBe('128px');
    expect(card(notes[0].title).style.transform).toBe('scale(1.1)');
    expect(card(notes[0].title).style.zIndex).toBe('4');
    expect(screen.getAllByLabelText(/^Connection /)).toHaveLength(2);
    expect(screen.getByLabelText('Select drawing')).toBeTruthy();
    expect(boards[0]).toEqual(persistedBoard);
    fireEvent.click(screen.getByRole('button', { name: 'Zoom board in' }));
    await waitFor(() => expect(boards[0].board.viewport.zoom).toBe(1.2));
    expect(screen.getByTestId('board-world').style.transform).toContain('scale(1.2)');
    fireEvent.doubleClick(card(notes[0].title));
    await screen.findByTestId('paper-snapshot');
    await waitFor(() => expect(JSON.parse(screen.getByTestId('paper-snapshot').textContent!).reading[0].baseScale).toBe(1.25));
    const after = JSON.parse(screen.getByTestId('paper-snapshot').textContent!);
    expect(after).toEqual(before);
    expect({ notes, paperBlock, paperPayload }).toEqual(paperSourceBefore);
    expect(unexpectedWrites).toEqual([]);
    expect(addToast.mock.calls.some(([kind]) => kind === 'error')).toBe(false);
    console.info('V13_S2_BOARD_PAPER_SMOKE', JSON.stringify({ boardZoom: boards[0].board.viewport.zoom,
      members: boards[0].members.length, edges: boards[0].edges.length, freehand: boards[0].visuals.length,
      paper: { stored: after.stored, resolved: after.resolved, typography: after.typography,
        reading: after.reading.map(({ gear, baseScale, displayScale, stepFactor, paperWidth, paperHeight, layoutWidth }: any) =>
          ({ gear, baseScale, displayScale, stepFactor, paperWidth, paperHeight, layoutWidth })) } }));
  });

  it('keeps the occupied-soul 409 visible and opens its existing board', async () => {
    const existing = soul('occupied-soul', 'An existing question');
    purposes.push(existing);
    boards.push({ board: { id: 'existing-board', user_id: 'fixture-user', title: 'Existing board', soul_id: existing.id,
      project_id: null, viewport: { x: 10, y: 20, zoom: 0.8 }, created_at: date, updated_at: date }, members: [], edges: [], visuals: [] });
    renderRoutes('/boards');
    fireEvent.click(screen.getByText('Use an existing purpose'));
    await screen.findByRole('option', { name: existing.title });
    fireEvent.change(screen.getByRole('combobox', { name: 'Library purpose' }), { target: { value: existing.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Open board' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Choose another purpose or open its board');
    expect(boards).toHaveLength(1);
    expect(purposes).toHaveLength(1);
    fireEvent.click(screen.getByRole('link', { name: 'Open Existing board' }));
    await screen.findByRole('heading', { name: 'Existing board' });
    expect(screen.getByTestId('board-world').style.transform).toContain('scale(0.8)');
    expect(unexpectedWrites).toEqual([]);
  });

  it('retains a second drag draft when the previous drag response arrives', async () => {
    const detail = seedBoard('drag-board', 'Consecutive drags');
    const firstResponse = deferred();
    const persistPatch = http.patch.getMockImplementation()!;
    http.patch.mockImplementationOnce(async (...args) => {
      await firstResponse.promise;
      return persistPatch(...args);
    });
    renderRoutes('/boards/drag-board');
    await screen.findByRole('article', { name: notes[0].title });
    const surface = screen.getByTestId('board-surface');
    pointer(card(notes[0].title), 'pointerDown', 100, 100);
    pointer(surface, 'pointerMove', 120, 100);
    pointer(surface, 'pointerUp', 120, 100);
    await waitFor(() => expect(http.patch).toHaveBeenCalledTimes(1));
    expect(card(notes[0].title).style.left).toBe('100px');

    pointer(card(notes[0].title), 'pointerDown', 200, 100);
    pointer(surface, 'pointerMove', 230, 100);
    expect(card(notes[0].title).style.left).toBe('130px');
    await act(async () => { firstResponse.resolve(); await firstResponse.promise; });
    await waitFor(() => expect(detail.members[0].x).toBe(100));
    expect(card(notes[0].title).style.left).toBe('130px');
    pointer(surface, 'pointerUp', 230, 100);
    await waitFor(() => expect(detail.members[0].x).toBe(130));
    await saved();
    expect(http.patch).toHaveBeenCalledTimes(2);
    expect(http.patch.mock.calls[1]).toEqual(['/boards/drag-board/members/member-drag-board', {
      x: 130, y: 70, w: 260, h: 156,
    }]);
    expect(unexpectedWrites).toEqual([]);
  });

  it('does not let an old leave flush redirect a newer board visit', async () => {
    const origin = seedBoard('origin-board', 'Origin board');
    seedBoard('destination-board', 'Destination board', false);
    const heldSave = deferred();
    const persistPatch = http.patch.getMockImplementation()!;
    http.patch.mockImplementationOnce(async (...args) => {
      await heldSave.promise;
      return persistPatch(...args);
    });
    renderRoutes('/boards/origin-board', '/boards/destination-board');
    await screen.findByRole('article', { name: notes[0].title });
    const surface = screen.getByTestId('board-surface');
    pointer(card(notes[0].title), 'pointerDown', 100, 100);
    pointer(surface, 'pointerMove', 120, 100);
    pointer(surface, 'pointerUp', 120, 100);
    await waitFor(() => expect(http.patch).toHaveBeenCalledTimes(1));
    // The in-board back action waits for the pending save. The shell navigation is a newer visit.
    fireEvent.click(screen.getByRole('button', { name: 'Boards' }));
    fireEvent.click(screen.getByRole('link', { name: 'Go to another board' }));
    await act(async () => { heldSave.resolve(); await heldSave.promise; });
    await screen.findByRole('heading', { name: 'Destination board' });
    expect(origin.members[0].x).toBe(100);
    expect(screen.queryByRole('heading', { name: 'Your boards' })).toBeNull();
    expect(http.patch.mock.calls[0][0]).toBe('/boards/origin-board/members/member-origin-board');
    expect(unexpectedWrites).toEqual([]);
  });

  it('deletes drawn ink and resizes a hosted group through a zoomed viewport before reopening its paper', async () => {
    const detail = seedBoard('group-board', 'Group projection board', false);
    renderRoutes('/boards/group-board');
    await screen.findByRole('heading', { name: 'Group projection board' });
    const surface = screen.getByTestId('board-surface');
    fireEvent.click(screen.getByRole('button', { name: 'Pen' }));
    pointer(surface, 'pointerDown', 30, 350);
    pointer(surface, 'pointerMove', 100, 390);
    pointer(surface, 'pointerUp', 100, 390);
    await waitFor(() => expect(detail.visuals).toHaveLength(1));
    await saved();
    const drawingId = detail.visuals[0].id;
    fireEvent.click(screen.getByRole('button', { name: 'Select' }));
    pointer(screen.getByLabelText('Select drawing'), 'pointerDown', 60, 370);
    fireEvent.click(screen.getByRole('button', { name: 'Delete drawing' }));
    await waitFor(() => expect(detail.visuals).toHaveLength(0));
    await saved();
    expect(screen.queryByLabelText('Select drawing')).toBeNull();
    expect(http.delete).toHaveBeenCalledWith(`/boards/group-board/visuals/${drawingId}`);

    fireEvent.click(screen.getByRole('button', { name: 'Add notes' }));
    fireEvent.click(await screen.findByRole('button', { name: `Add ${group.title} to board` }));
    await screen.findByRole('article', { name: group.title });
    await saved();
    expect(detail.members[0]).toMatchObject({ member_kind: 'content_group', member_id: group.id,
      reference: { note_id: group.note_id, state: 'available' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zoom board in' }));
    await waitFor(() => expect(detail.board.viewport.zoom).toBe(1.2));
    await saved();
    pointer(screen.getByRole('button', { name: `Resize ${group.title}` }), 'pointerDown', 100, 100);
    pointer(surface, 'pointerMove', 220, 160);
    pointer(surface, 'pointerUp', 220, 160);
    await waitFor(() => expect(detail.members[0]).toMatchObject({ w: 360, h: 206 }));
    await saved();
    expect(card(group.title).style.width).toBe('360px');
    expect(card(group.title).style.height).toBe('206px');

    // Blank-space pan adds screen deltas; the saved zoom and content geometry remain independent.
    const beforePan = clone(detail.board.viewport);
    pointer(surface, 'pointerDown', 20, 20);
    pointer(surface, 'pointerMove', 50, 60);
    pointer(surface, 'pointerUp', 50, 60);
    await waitFor(() => expect(detail.board.viewport).toEqual({ x: beforePan.x + 30, y: beforePan.y + 40, zoom: 1.2 }));
    await saved();
    const savedViewport = clone(detail.board.viewport);
    fireEvent.click(screen.getByRole('button', { name: 'Boards' }));
    fireEvent.click(await screen.findByRole('link', { name: /Group projection board/ }));
    await screen.findByRole('article', { name: group.title });
    expect(screen.getByTestId('board-world').style.transform).toBe(`translate(${savedViewport.x}px, ${savedViewport.y}px) scale(1.2)`);
    expect(card(group.title).style.width).toBe('360px');
    expect(screen.queryByLabelText('Select drawing')).toBeNull();
    fireEvent.doubleClick(card(group.title));
    const paper = JSON.parse((await screen.findByTestId('paper-snapshot')).textContent!);
    expect(paper.noteId).toBe(group.note_id);
    expect(paper.stored[0].canvas_layout).toMatchObject({ x: 0, y: 40, width: 760, height: 88, surface: 'formal_page' });
    expect({ notes, paperBlock, paperPayload }).toEqual(paperSourceBefore);
    expect(unexpectedWrites).toEqual([]);
  });
});
