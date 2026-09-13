import { useMemo, useRef } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardList from './BoardList';
import BoardPage from './BoardPage';
import AppLayout from '@/components/Layout/AppLayout';
import { useUIStore } from '@/stores/uiStore';
import { notifyBoardChanged } from './boardEvents';
import type { Board, BoardDetail, BoardEdge, BoardMember, BoardVisual, CreateBoardInput } from './boardTypes';
import { useNoteCanvasDataAdapter } from '../Notes/canvasEngine/hooks/useNoteCanvasDataAdapter';
import { useNoteCanvasFrameModel, useNoteCanvasResolvedLayoutModel } from '../Notes/canvasEngine/hooks/useNoteCanvasLayoutModel';
import { usePageReadingPresentation } from '../Notes/canvasEngine/hooks/usePageReadingPresentation';
import { createPrimaryPageFrame, createViewport } from '../Notes/canvasEngine/engineModel';
import { createSurfaceModePolicy } from '../Notes/canvasEngine/modePolicyService';
import { resolveEffectiveDocumentTypographyProfile } from '../Notes/canvasEngine/pageFrameTypographyService';
import { normalizeContentGroup } from '../Notes/canvasEngine/contentGroupService';
import type { Note, NoteBlock, PurposeFrameV1 } from '../Notes/canvasEngine/runtimeDataTypes';

// Mock transport and unrelated shell initialization; board/paper hooks, AppLayout and uiStore are production code.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
const addToast = vi.hoisted(() => vi.fn());
vi.mock('@/services/api', () => ({
  getToken: () => null, setToken: vi.fn(), default: http }));
vi.mock('@/stores/courseStore', () => ({ useCourseStore: (select: any) => select({ courses: [], fetchCourses: () => undefined }) }));
vi.mock('@/stores/tagStore', () => ({ useTagStore: (select: any) => select({ fetchTags: () => undefined }) }));
vi.mock('@/stores/authStore', () => ({ useAuthStore: (select: any) => select({ user: null, loadUser: () => undefined }) }));
vi.mock('@/components/Onboarding/Onboarding', () => ({ default: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));

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

function renderRoutes(initial = `/notes/${notes[0].id}`, externalPath?: string, withLayout = false) {
  return render(<MemoryRouter initialEntries={[initial]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    {externalPath && <Link to={externalPath}>Go to another board</Link>}
    <Routes>
      <Route element={withLayout ? <AppLayout /> : undefined}>
      <Route path="/boards" element={<BoardList />} />
      <Route path="/boards/:boardId" element={<BoardPage />} />
      <Route path="/notes/:noteId" element={<PaperProbe />} />
      </Route>
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
    identity_item_id: `identity-${id}`, identity_description: `Board: ${title}`,
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
  useUIStore.setState({ sidebarOpen: true, addToast });
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
  Object.defineProperty(SVGElement.prototype, 'setPointerCapture', { configurable: true, value: noOp });
  Object.defineProperty(SVGElement.prototype, 'hasPointerCapture', { configurable: true, value: () => false });
  Object.defineProperty(SVGElement.prototype, 'releasePointerCapture', { configurable: true, value: noOp });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  http.get.mockImplementation(async (url: string, config?: { params?: { course_id?: string; note_id?: string } }) => {
    if (url === '/palette-colors') return { data: [] };
    if (url === '/boards') return response({ boards: boards.map(({ board }) => board) });
    if (url.startsWith('/boards/text-ranges/by-note/')) return response({ text_ranges: [] });
    if (/^\/boards\/[^/]+\/viewport-bookmarks$/.test(url)) {
      detailFor(url);
      return response({ bookmarks: [] });
    }
    if (url.startsWith('/boards/')) return response(detailFor(url));
    if (url === '/purposes') return response({ purposes });
    if (url === '/courses') return response(projects);
    if (url === '/items') return response([]);
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
        identity_item_id: `identity-${sequence}`, identity_description: `Board: ${creation.title}`,
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
    if (url.includes('/visuals/')) {
      const visual = detail.visuals.find(({ id }) => id === url.split('/')[4])!;
      Object.assign(visual, clone(input));
      return response({ visual });
    }
    if (url.includes('/edges/')) {
      const edge = detail.edges.find(({ id }) => id === url.split('/')[4])!;
      Object.assign(edge, clone(input));
      return response({ edge });
    }
    if (url.split('/').length === 3) { Object.assign(detail.board, clone(input)); return response({ board: detail.board }); }
    return unexpectedWrite('PATCH', url);
  });
  http.put.mockImplementation(async (url: string) => unexpectedWrite('PUT', url));
  http.delete.mockImplementation(async (url: string) => {
    if (/^\/boards\/[^/]+$/.test(url)) {
      const detail = detailFor(url);
      boards = boards.filter(({ board }) => board.id !== detail.board.id);
      return response({ removed: true });
    }
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
  Reflect.deleteProperty(SVGElement.prototype, 'setPointerCapture');
  Reflect.deleteProperty(SVGElement.prototype, 'hasPointerCapture');
  Reflect.deleteProperty(SVGElement.prototype, 'releasePointerCapture');
});

function seedVisual(detail: BoardDetail, kind: BoardVisual['visual_kind']) {
  const visual: BoardVisual = { ...geometry, id: `${kind}-${detail.board.id}`, board_id: detail.board.id,
    visual_kind: kind, x: 400, y: 400, w: 200, h: 120, scale: 1.5, rotation: 0, metadata: {},
    created_at: date, updated_at: date,
    data: kind === 'freehand' ? { points: [{ x: 0, y: 0 }, { x: 40, y: 20 }] }
      : { tray_source: { object: {}, backing_blocks: [{ plain_text: 'Moved shape content' }], extensions: {} },
        connector_points: { start: { x: 0, y: 0 }, end: { x: 180, y: 100 } } } };
  detail.visuals.push(visual);
  return visual;
}

describe('V13.5 B3 board identity details', () => {
  it('reads the independent description, keeps it through rename and reopen, and adds no navigation or Item writes', async () => {
    const detail = seedBoard('identity', 'Original board name', false);
    detail.board.identity_description = 'A place to compare field observations.\nQuestions remain open.';
    renderRoutes('/boards/identity');
    await screen.findByRole('heading', { name: 'Original board name' });
    fireEvent.click(screen.getByLabelText('Board menu'));
    const identity = screen.getByRole('region', { name: 'Board identity' });
    expect(within(identity).getByText('Identity Item linked')).toBeTruthy();
    expect(within(identity).getByText('Independent description')).toBeTruthy();
    expect(identity.textContent).toContain(detail.board.identity_description);
    expect(within(identity).queryByRole('link')).toBeNull();
    expect(within(identity).queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rename board' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Board name' }), { target: { value: 'Renamed board' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await screen.findByRole('heading', { name: 'Renamed board' });
    expect(http.patch).toHaveBeenCalledExactlyOnceWith('/boards/identity', { title: 'Renamed board' });
    expect(identity.textContent).toContain(detail.board.identity_description);
    expect(identity.textContent).not.toContain('Board: Renamed board');
    fireEvent.click(screen.getByRole('button', { name: 'Boards' }));
    fireEvent.click(await screen.findByRole('link', { name: /Renamed board/ }));
    await screen.findByRole('heading', { name: 'Renamed board' });
    fireEvent.click(screen.getByLabelText('Board menu'));
    expect(screen.getByRole('region', { name: 'Board identity' }).textContent).toContain(detail.board.identity_description);
    expect(http.post).not.toHaveBeenCalled();
    expect(http.put).not.toHaveBeenCalled();
    expect(http.delete).not.toHaveBeenCalled();
    expect(unexpectedWrites).toEqual([]);
    console.info('V13_5_B3_CLIENT_IDENTITY', JSON.stringify({ title: detail.board.title,
      identity_item_id: detail.board.identity_item_id, description: detail.board.identity_description,
      rename_request: http.patch.mock.calls[0], reopened: true }));
  });

  it('uses the bridge to report missing identity without inventing one from the title or description', async () => {
    const detail = seedBoard('missing-identity', 'A board title', false);
    detail.board.identity_item_id = null;
    detail.board.identity_description = 'A stale description cannot establish identity.';
    renderRoutes('/boards/missing-identity');
    await screen.findByRole('heading', { name: 'A board title' });
    fireEvent.click(screen.getByLabelText('Board menu'));
    const identity = screen.getByRole('region', { name: 'Board identity' });
    expect(within(identity).getByText('No identity Item linked.')).toBeTruthy();
    expect(identity.textContent).not.toContain(detail.board.identity_description);
    expect(within(identity).queryByRole('link')).toBeNull();
    expect(http.patch).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
  });
});

describe('V13.4 wave 1 wiring smoke', () => {
  it('A1 renames in the board, rejects a blank name and reopens the saved title', async () => {
    const detail = seedBoard('rename', 'Original name');
    renderRoutes('/boards/rename');
    fireEvent.doubleClick(await screen.findByRole('heading', { name: 'Original name' }));
    const input = screen.getByRole('textbox', { name: 'Board name' }) as HTMLInputElement;
    expect(input.maxLength).toBe(80);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form')!);
    expect(http.patch).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '  Renamed board  ' } });
    fireEvent.submit(input.closest('form')!);
    await screen.findByRole('heading', { name: 'Renamed board' });
    expect(detail.board.title).toBe('Renamed board');
    expect(purposes[0].title).toBe('Question for Original name');
    fireEvent.click(screen.getByRole('button', { name: 'Boards' }));
    fireEvent.click(await screen.findByRole('link', { name: /Renamed board/ }));
    await screen.findByRole('heading', { name: 'Renamed board' });
    expect(unexpectedWrites).toEqual([]);
  });

  it('A2 moves every visual kind, resizes a scaled shape, respects Pin and reopens geometry', async () => {
    const detail = seedBoard('visuals', 'Visual board', false);
    detail.board.viewport.zoom = 2;
    const visuals = (['freehand', 'shape', 'image', 'table', 'connector'] as const).map((kind) => seedVisual(detail, kind));
    renderRoutes('/boards/visuals');
    await screen.findByRole('heading', { name: 'Visual board' });
    const surface = screen.getByTestId('board-surface');
    for (const visual of visuals) {
      const label = visual.visual_kind === 'freehand' ? 'Select drawing' : `Select moved ${visual.visual_kind}`;
      pointer(screen.getByRole('button', { name: label }), 'pointerDown', 20, 20);
      pointer(surface, 'pointerMove', 100, 80);
      pointer(surface, 'pointerUp', 100, 80);
      await waitFor(() => expect(visual).toMatchObject({ x: 440, y: 430 }));
      await saved();
    }
    pointer(screen.getByRole('button', { name: 'Select moved shape' }), 'pointerDown', 20, 20);
    pointer(surface, 'pointerUp', 20, 20);
    pointer(screen.getByRole('button', { name: 'Resize moved shape' }), 'pointerDown', 20, 20);
    pointer(surface, 'pointerMove', 140, 80);
    pointer(surface, 'pointerUp', 140, 80);
    await waitFor(() => expect(visuals[1]).toMatchObject({ w: 240, h: 140, scale: 1.5 }));
    await saved();
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    await screen.findByRole('button', { name: 'Unpin' });
    await saved();
    const calls = http.patch.mock.calls.length;
    pointer(screen.getByRole('button', { name: 'Select moved shape' }), 'pointerDown', 10, 10);
    pointer(surface, 'pointerMove', 200, 200);
    pointer(surface, 'pointerUp', 200, 200);
    expect(http.patch.mock.calls).toHaveLength(calls);
    expect(screen.queryByRole('button', { name: 'Resize moved shape' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Unpin' }));
    await saved();
    expect(visuals[1].pinned).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Boards' }));
    fireEvent.click(await screen.findByRole('link', { name: /Visual board/ }));
    await screen.findByRole('heading', { name: 'Visual board' });
    expect(screen.getByTestId(`board-visual-${visuals[0].id}`).getAttribute('transform')).toContain('translate(440 430)');
    expect(screen.getByTestId(`board-visual-${visuals[1].id}`).style.width).toBe('240px');
    expect(screen.getByTestId(`board-visual-${visuals[1].id}`).style.height).toBe('140px');
    expect(unexpectedWrites).toEqual([]);
  });

  it('A3 saves and clears a label, persists three arrow states and renders arrowheads outside cards', async () => {
    const detail = seedBoard('edges', 'Edge board');
    detail.members.push({ ...clone(detail.members[0]), id: 'member-2', x: 540 });
    detail.edges.push({ id: 'edge-a', board_id: 'edges', from_member_id: detail.members[0].id,
      to_member_id: 'member-2', style: { existing: 'retained' }, label: null, created_at: date });
    renderRoutes('/boards/edges');
    const edge = await screen.findByRole('button', { name: /^Connection / });
    fireEvent.doubleClick(edge);
    fireEvent.change(screen.getByRole('textbox', { name: 'Connection label' }), { target: { value: 'supports' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save label' }));
    await screen.findByText('supports');
    fireEvent.click(screen.getByRole('button', { name: 'One-way' }));
    await saved();
    expect(detail.edges[0]).toMatchObject({ label: 'supports', style: { direction: 'forward', existing: 'retained' } });
    const line = screen.getByTestId('board-edge-edge-a');
    expect(line.getAttribute('marker-end')).toBe('url(#board-edge-arrow)');
    expect(line.getAttribute('marker-start')).toBeNull();
    expect(line.getAttribute('d')).toBe('M 346 148 L 534 148');
    fireEvent.click(screen.getByRole('button', { name: 'Boards' }));
    fireEvent.click(await screen.findByRole('link', { name: /Edge board/ }));
    await screen.findByText('supports');
    expect(screen.getByTestId('board-edge-edge-a').getAttribute('marker-end')).toBe('url(#board-edge-arrow)');
    fireEvent.doubleClick(screen.getByRole('button', { name: /^Connection / }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Connection label' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save label' }));
    await waitFor(() => expect(detail.edges[0].label).toBeNull());
    await saved();
    fireEvent.click(screen.getByRole('button', { name: 'Two-way' }));
    await saved();
    expect(screen.getByTestId('board-edge-edge-a').getAttribute('marker-start')).toBe('url(#board-edge-arrow)');
    fireEvent.click(screen.getByRole('button', { name: 'No arrows' }));
    await saved();
    expect(screen.getByTestId('board-edge-edge-a').getAttribute('marker-end')).toBeNull();
    expect(unexpectedWrites).toEqual([]);
  });

  it('A4 shows fresh counts from both menus, cancels safely, deletes and reuses the retained purpose', async () => {
    const detail = seedBoard('delete', 'Delete fixture');
    seedVisual(detail, 'shape'); seedVisual(detail, 'freehand');
    detail.edges.push({ id: 'count-edge', board_id: 'delete', from_member_id: detail.members[0].id,
      to_member_id: detail.members[0].id, style: {}, label: null, created_at: date });
    renderRoutes('/boards/delete');
    await screen.findByRole('heading', { name: 'Delete fixture' });
    fireEvent.click(screen.getByLabelText('Board menu'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete board' }));
    let dialog = await screen.findByRole('dialog');
    await within(dialog).findByText(/2 drawings, 1 connections, and all 1 placements/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(http.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Boards' }));
    await screen.findByRole('heading', { name: 'Your boards' });
    seedVisual(detail, 'table');
    fireEvent.click(screen.getByLabelText('Board menu for Delete fixture'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete board' }));
    dialog = await screen.findByRole('dialog');
    await within(dialog).findByText(/3 drawings, 1 connections, and all 1 placements/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete board' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(boards).toHaveLength(0); expect(purposes).toHaveLength(1);
    fireEvent.change(screen.getByRole('textbox', { name: 'Board name' }), { target: { value: 'Replacement' } });
    fireEvent.click(screen.getByText('Advanced: use an existing purpose'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Existing purpose' }), { target: { value: detail.board.soul_id } });
    fireEvent.click(screen.getByRole('button', { name: 'Open board' }));
    await screen.findByRole('heading', { name: 'Replacement' });
    expect(boards[0].board.soul_id).toBe(detail.board.soul_id);
    expect(unexpectedWrites).toEqual([]);
  });

  it('A5 keeps an unavailable note card visible and revives it on the next board read', async () => {
    const detail = seedBoard('note-trash', 'Retained note card');
    const original = clone(detail.members[0]);
    detail.members[0].reference = { kind: 'note', id: notes[0].id, title: null, note_id: null,
      state: 'unavailable', reason: 'note_inactive' };
    renderRoutes('/boards/note-trash');
    const unavailable = await screen.findByRole('article', { name: 'Unavailable projection' });
    expect(unavailable.getAttribute('aria-disabled')).toBe('true');
    expect(within(unavailable).getByText('This content is currently unavailable.')).toBeTruthy();
    expect(unavailable.style.left).toBe(`${original.x}px`);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    detail.members[0].reference = original.reference;
    await act(async () => { notifyBoardChanged(detail.board.id); });
    const restored = await screen.findByRole('article', { name: notes[0].title });
    expect(restored.getAttribute('aria-disabled')).toBe('false');
    expect(restored.style.left).toBe(`${original.x}px`);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.focus(restored);
    fireEvent.click(screen.getByRole('button', { name: 'Enter note' }));
    await screen.findByTestId('paper-snapshot');
    expect(unexpectedWrites).toEqual([]);
  });
});

describe('V13 S4 board polish smoke', () => {
  it('opens a board by name, births its namesake soul, collapses the navigator and closes/reopens the note picker', async () => {
    renderRoutes('/boards', undefined, true);
    expect(screen.getByRole('button', { name: 'Collapse navigator' })).toBeTruthy();
    const name = await screen.findByRole('textbox', { name: 'Board name' });
    expect(screen.getByText('Advanced: use an existing purpose').closest('details')?.open).toBe(false);
    fireEvent.change(name, { target: { value: '  Exam revision  ' } });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Open board' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Open board' }));
    await screen.findByRole('heading', { name: 'Exam revision' });
    expect(http.post).toHaveBeenCalledWith('/boards', { title: 'Exam revision', purpose: { title: 'Exam revision' } });
    expect(purposes).toHaveLength(1);
    expect(purposes[0].title).toBe('Exam revision');
    expect(boards[0].board).toMatchObject({ title: 'Exam revision', soul_id: purposes[0].id });
    expect(screen.getByRole('button', { name: 'Expand navigator' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigator' }));
    const addNotes = screen.getByRole('button', { name: 'Add notes and items' });
    expect(addNotes.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(addNotes);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Notes, groups and items' }), { target: { value: notes[0].title } });
    fireEvent.click(await screen.findByRole('button', { name: `Add ${notes[0].title} to board` }));
    await screen.findByRole('article', { name: notes[0].title });
    await saved();
    const persisted = clone(boards[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Close note picker' }));
    expect(screen.queryByRole('complementary', { name: 'Add projections' })).toBeNull();
    expect(addNotes.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(addNotes);
    fireEvent.click(addNotes);
    const search = screen.getByRole('searchbox', { name: 'Notes, groups and items' }) as HTMLInputElement;
    expect(search.value).toBe(notes[0].title);
    expect(addNotes.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Collapse navigator' })).toBeTruthy();
    expect(boards[0]).toEqual(persisted);
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'Add projections' })).toBeNull();
    expect(document.activeElement).toBe(addNotes);
    fireEvent.click(screen.getByRole('button', { name: 'Boards' }));
    await screen.findByRole('heading', { name: 'Your boards' });
    expect(screen.getByRole('button', { name: 'Collapse navigator' })).toBeTruthy();
    expect(unexpectedWrites).toEqual([]);
    console.info('V13_S4_BOARD_POLISH_SMOKE', JSON.stringify({ boardName: boards[0].board.title,
      soulTitle: purposes[0].title, navigator: 'collapsed on entry, manual expansion retained, restored on exit',
      picker: 'open, mount, close, reopen with search retained, Escape, focus returned', members: boards[0].members.length }));
  });
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
    fireEvent.change(await screen.findByRole('textbox', { name: 'Board name' }), { target: { value: 'Why do these observations connect?' } });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Open board' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Open board' }));
    await screen.findByRole('heading', { name: 'Why do these observations connect?' });
    expect(purposes).toHaveLength(1);
    expect(boards[0].board.soul_id).toBe(purposes[0].id);
    fireEvent.click(screen.getByRole('button', { name: 'Add notes and items' }));
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
    fireEvent.focus(card(notes[0].title));
    fireEvent.click(screen.getByRole('button', { name: 'Enter note' }));
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
      identity_item_id: null, identity_description: null,
      project_id: null, viewport: { x: 10, y: 20, zoom: 0.8 }, created_at: date, updated_at: date }, members: [], edges: [], visuals: [] });
    renderRoutes('/boards');
    fireEvent.change(await screen.findByRole('textbox', { name: 'Board name' }), { target: { value: 'Another board name' } });
    fireEvent.click(screen.getByText('Advanced: use an existing purpose'));
    await screen.findByRole('option', { name: existing.title });
    fireEvent.change(screen.getByRole('combobox', { name: 'Existing purpose' }), { target: { value: existing.id } });
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
    expect(detail.members[0]).toMatchObject({ x: 130, y: 70, w: 260, h: 156 });
    // History patches only changed coordinates; dimensions remain intact without replaying a stale resize.
    expect(http.patch.mock.calls[1]).toEqual(['/boards/drag-board/members/member-drag-board', {
      x: 130,
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

    fireEvent.click(screen.getByRole('button', { name: 'Add notes and items' }));
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

    // The Pan tool adds screen deltas; Select now reserves blank-space drag for marquee.
    fireEvent.click(screen.getByRole('button', { name: 'Pan' }));
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
