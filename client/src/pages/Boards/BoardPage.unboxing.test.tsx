import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPage from './BoardPage';
import NoteDetailPage from '../Notes/NoteDetail';
import { BOARD_STAGING_MIME } from './BoardStaging';
import type { BoardDetail, BoardMember } from './boardTypes';
import type { Note, NoteBlock } from '../Notes/canvasEngine/runtimeDataTypes';
import type { PageFrameCollectionModel } from '../Notes/canvasEngine/types';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http, getToken: () => null, setToken: vi.fn() }));
// Only HTTP is replaced. BoardPage, modal, full-page host, runtime, adapter and
// ItemSummary reader run together against the same disposable in-memory state.
const at = '2026-09-09T12:00:00.000Z';
const response = <T,>(data: T) => ({ data: structuredClone(data) });
let board: BoardDetail;
let notes: Note[];
let blocks: NoteBlock[];
let projects: Array<{ id: string; name: string }>;
let item: { id: string; plain_text: string; status: 'active'; item_type: string; origin_board_id: string; origin_board_title: string };
let layouts: Array<{ placement_id: string; block_id: string; layout: any }>;
let unknownRequests: string[];
let collection: PageFrameCollectionModel | null;

function fail(method: string, url: string): never {
  unknownRequests.push(`${method} ${url}`);
  throw new Error(`Unexpected unboxing fixture ${method} ${url}`);
}
function noteMember(note: Note): BoardMember {
  return { id: `member-${note.id}`, board_id: 'board', member_kind: 'note', member_id: note.id,
    placed: true, mounted_actor: 'human', x: 30, y: 40, w: 260, h: 156, scale: 1, pinned: false,
    z_index: 1, metadata: {}, created_at: at, updated_at: at,
    reference: { kind: 'note', id: note.id, state: 'available', reason: null, title: note.title, note_id: note.id } };
}
function Location() { return <output data-testid="fixture-location">{useLocation().pathname}</output>; }
function openBoard() {
  return render(<MemoryRouter initialEntries={['/boards/board']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Location /><Routes><Route path="/boards/:boardId" element={<BoardPage />} />
      <Route path="/notes/:noteId" element={<NoteDetailPage />} /></Routes>
  </MemoryRouter>);
}
async function readyRuntime(mode: 'modal' | 'page' = 'modal') {
  await waitFor(() => expect(document.querySelector(`[data-note-host-mode="${mode}"] [data-canvas-engine-version]`)).toBeTruthy());
  return document.querySelector<HTMLElement>(`[data-note-host-mode="${mode}"]`)!;
}
async function createNote() {
  fireEvent.click(await screen.findByRole('button', { name: 'Staging (1)' }));
  fireEvent.click(screen.getByRole('button', { name: 'New note' }));
  const dialog = await screen.findByRole('dialog', { name: 'New note' });
  const project = within(dialog).getByRole('combobox', { name: 'Project' });
  await waitFor(() => expect((project as HTMLSelectElement).disabled).toBe(false));
  fireEvent.change(project, { target: { value: '__new_project__' } });
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Project name' }), { target: { value: 'Synthesis project' } });
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Note title' }), { target: { value: 'Unboxed thought' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create note' }));
  await readyRuntime();
  expect(screen.getByTestId('fixture-location').textContent).toBe('/boards/board');
  expect(notes[0]).toMatchObject({ course_id: 'new-project', title: 'Unboxed thought' });
}
function stagingTransfer() {
  const data = new Map<string, string>();
  const transfer = { types: [BOARD_STAGING_MIME], effectAllowed: '', dropEffect: '',
    setData: (type: string, value: string) => data.set(type, value), getData: (type: string) => data.get(type) || '' };
  fireEvent.dragStart(screen.getByTestId('staging-member-staged-item'), { dataTransfer: transfer });
  return transfer;
}
function drop(target: Element, transfer: ReturnType<typeof stagingTransfer>) {
  fireEvent.dragOver(target, { dataTransfer: transfer });
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.assign(event, { dataTransfer: transfer, clientX: 400, clientY: 220 });
  fireEvent(target, event);
}
async function dropItem() {
  const runtime = await readyRuntime();
  const row = screen.getByTestId('staging-member-staged-item');
  drop(runtime.querySelector('[data-canvas-engine-version]')!, stagingTransfer());
  await waitFor(() => expect(blocks).toHaveLength(1));
  await within(runtime).findByText(item.plain_text);
  expect(blocks[0]).toMatchObject({ block_type: 'item_ref', content_json: { item_id: item.id }, plain_text: '' });
  expect(Object.keys(blocks[0].content_json)).toEqual(['item_id']);
  expect(row.isConnected).toBe(true);
  expect(board.members.find(({ id }) => id === 'staged-item')?.placed).toBe(false);
  return runtime;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); sessionStorage.clear();
  notes = []; blocks = []; layouts = []; unknownRequests = []; collection = null;
  projects = [{ id: 'existing-project', name: 'Existing project' }];
  item = { id: 'item', plain_text: 'An item ready to be assembled.', status: 'active', item_type: 'Claim',
    origin_board_id: 'board', origin_board_title: 'Unboxing board' };
  board = { board: { id: 'board', user_id: 'synthetic', title: 'Unboxing board', soul_id: 'soul', project_id: null,
    identity_item_id: null, identity_description: null,
    viewport: { x: 10, y: -20, zoom: 1 }, created_at: at, updated_at: at }, edges: [], visuals: [], members: [{
    id: 'staged-item', board_id: 'board', member_kind: 'item', member_id: item.id, placed: false, mounted_actor: 'human',
    x: 0, y: 0, w: 260, h: 156, scale: 1, pinned: false, z_index: 0, metadata: {}, created_at: at, updated_at: at,
    reference: { kind: 'item', id: item.id, state: 'available', reason: null, title: 'Claim', summary: item.plain_text, note_id: null },
  }] };
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId || 0; }
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1100);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1100, 800));
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(() => [new DOMRect(0, 0, 1100, 800)] as unknown as DOMRectList);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
  http.get.mockImplementation(async (url: string, config?: { params?: { course_id?: string } }) => {
    if (url === '/boards/board') return response(board);
    if (url === '/boards/board/viewport-bookmarks') return response({ bookmarks: [] });
    if (url === '/courses') return response(projects);
    if (url.startsWith('/courses/')) {
      const project = projects.find(({ id }) => url === `/courses/${id}/summary`);
      if (project) return response({ course: { ...project, skin: null }, goals: [], decks: [], documents: [] });
    }
    if (url === '/notes') return response(notes.filter((note) => !config?.params?.course_id || note.course_id === config.params.course_id));
    if (url === '/items') return response([item]);
    if (url === '/purposes') return response({ purposes: [] });
    if (['/content-groups', '/group-folders', '/templates', '/source-anchors'].includes(url)) return response([]);
    if (url === '/canvas-objects/coordinate-contract') return response({ coordinate_contract: 'v2' });
    if (url.startsWith('/boards/text-ranges/by-note/')) return response({ text_ranges: [] });
    if (url.startsWith('/annotation-truths/by-note/')) return response([]);
    if (url.startsWith('/canvas-objects/by-note/')) return response({ pageFrameCollection: collection, blockLayouts: layouts,
      canvasObjects: [], canvasPlacements: [], contentMounts: [], visualConnectors: [], imageObjects: [], structuredObjects: [] });
    if (url === '/notes/new-note') return response(notes[0]);
    if (url === '/notes/new-note/blocks') return response(blocks);
    // E5 cover chips and metadata load when the note runtime mounts.
    if (url === '/notes/new-note/tags') return response({ tags: [] });
    if (url === '/notes/new-note/metadata') return response({
      upstream: { sources: [], notes: [], count: 0 },
      downstream: { boards: [], content_groups: [], count: 0 },
    });
    return fail('GET', url);
  });
  http.post.mockImplementation(async (url: string, input: any) => {
    if (url === '/boards/board/ceremony-note') {
      const project = { id: 'new-project', ...input.project }; projects.push(project);
      const note = { id: 'new-note', course_id: project.id, title: input.title, description: null, metadata: {}, status: 'active' };
      notes.push(note); collection = structuredClone(input.collection);
      return response({ project, note, collection });
    }
    if (url === '/items/summaries') return response(input.item_ids.includes(item.id) ? [{ ...item, summary: item.plain_text }] : []);
    if (url === '/source-anchors/generate') return response({ generated: 0 });
    if (url === '/notes/new-note/blocks') {
      const block: NoteBlock = { id: 'ref-block', placement_id: 'ref-placement', title: null, ...input,
        source_references: [], order_index: 0, display_overrides_json: {}, canvas_layout: null };
      blocks.push(block); return response(block);
    }
    if (url === '/boards/board/members') {
      const member = { ...noteMember(notes[0]), ...input }; board.members.push(member); return response({ member, created: true });
    }
    return fail('POST', url);
  });
  http.put.mockImplementation(async (url: string, input: any) => {
    if (url.includes('/block-placements/')) {
      expect(collection?.pageFrames.some(({ id }) => id === input.layout.frame_id)).toBe(true);
      expect(input.layout.coordinate_space).toBe('page_frame_local');
      const record = { placement_id: 'ref-placement', ...input }; layouts = [record]; return response(record);
    }
    if (url.endsWith('/page-frame-collection')) { collection = structuredClone(input.collection); return response(collection); }
    if (url === '/notes/new-note') { Object.assign(notes[0], input); return response(notes[0]); }
    return fail('PUT', url);
  });
  http.delete.mockImplementation(async (url: string) => {
    if (url === '/note-blocks/ref-block') { blocks = []; layouts = []; return response({ removed: true }); }
    return fail('DELETE', url);
  });
  http.patch.mockImplementation(async (url: string) => fail('PATCH', url));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('13.4 unboxing through production board and note runtime', () => {
  it('creates in place, inserts a reference, rereads current ItemSummary and survives board/modal/full-page reopening', async () => {
    const first = openBoard();
    await createNote();
    expect(await screen.findByText('Drag items from staging')).toBeTruthy();
    const runtime = await dropItem();
    expect(within(runtime).queryByText(/Born on board Unboxing board/)).toBeNull();
    fireEvent.click(within(runtime).getByRole('button', { name: 'Reference details' }));
    expect(within(runtime).getByText('Board chalk · Unboxing board')).toBeTruthy();
    fireEvent.click(within(runtime).getByRole('button', { name: 'Close reference details' }));
    expect(runtime.querySelector('[data-note-block-shell="true"] textarea')).toBeNull();
    expect(layouts).toHaveLength(1);
    const initialY = layouts[0].layout.y;
    fireEvent.pointerDown(await screen.findByRole('button', { name: 'Move block' }), { pointerId: 1, clientX: 400, clientY: 220 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 400, clientY: 310 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 400, clientY: 310 });
    await waitFor(() => expect(layouts[0].layout.y).not.toBe(initialY));
    const savedLayout = structuredClone(layouts[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Close note' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Add notes and items' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add Unboxed thought to board' }));
    await screen.findByRole('article', { name: 'Unboxed thought' });
    const boardBefore = structuredClone(board);
    item.plain_text = 'The item has a newer current body.';
    first.unmount();
    openBoard();
    const card = await screen.findByRole('article', { name: 'Unboxed thought' });
    fireEvent.click(screen.getByRole('button', { name: 'Staging (1)' }));
    fireEvent.doubleClick(card);
    const reopened = await readyRuntime();
    await within(reopened).findByText(item.plain_text);
    expect(within(reopened).queryByText('An item ready to be assembled.')).toBeNull();
    expect(screen.getByTestId('staging-member-staged-item')).toBeTruthy();
    expect(board).toEqual(boardBefore);
    expect(layouts[0]).toEqual(savedLayout);
    expect(blocks[0].content_json).toEqual({ item_id: 'item' });
    const staleTransfer = stagingTransfer();
    fireEvent.click(screen.getByRole('button', { name: 'Close note' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.focus(card);
    fireEvent.keyDown(card, { key: 'Enter' });
    const page = await readyRuntime('page');
    await within(page).findByText(item.plain_text);
    fireEvent.click(within(page).getByRole('button', { name: 'Reference details' }));
    expect(within(page).getByText(/Board chalk · Unboxing board/)).toBeTruthy();
    fireEvent.click(within(page).getByRole('button', { name: 'Close reference details' }));
    expect(screen.getByTestId('fixture-location').textContent).toBe('/notes/new-note');
    const writes = http.post.mock.calls.filter(([url]) => url === '/notes/new-note/blocks').length;
    await act(async () => { drop(page.querySelector('[data-canvas-engine-version]')!, staleTransfer); });
    expect(http.post.mock.calls.filter(([url]) => url === '/notes/new-note/blocks')).toHaveLength(writes);
    expect(blocks).toHaveLength(1);
    expect(unknownRequests).toEqual([]);
  });

  it('uses ordinary block trash without changing its source item or staging row', async () => {
    openBoard();
    await createNote();
    const runtime = await dropItem();
    const itemBefore = structuredClone(item);
    fireEvent.contextMenu(runtime.querySelector('[data-note-block-shell="true"]')!, { clientX: 500, clientY: 250 });
    fireEvent.click(within(await screen.findByRole('menu')).getByRole('button', { name: 'Move to trash' }));
    await waitFor(() => expect(blocks).toHaveLength(0));
    expect(runtime.querySelector('[data-note-block-shell="true"]')).toBeNull();
    expect(item).toEqual(itemBefore);
    expect(screen.getByTestId('staging-member-staged-item')).toBeTruthy();
    expect(http.delete).toHaveBeenCalledExactlyOnceWith('/note-blocks/ref-block');
    expect(unknownRequests).toEqual([]);
  });

  it.each(['content_group', 'text_range'] as const)('leaves a staged %s outside the item-only unboxing flow', async (kind) => {
    board.members[0].member_kind = kind;
    board.members[0].reference.kind = kind;
    openBoard();
    await createNote();
    const runtime = await readyRuntime();
    await act(async () => { drop(runtime.querySelector('[data-canvas-engine-version]')!, stagingTransfer()); });
    expect(blocks).toEqual([]);
    expect(http.post.mock.calls.filter(([url]) => url === '/notes/new-note/blocks')).toEqual([]);
    expect(screen.getByTestId('staging-member-staged-item')).toBeTruthy();
    expect(unknownRequests).toEqual([]);
  });
});
