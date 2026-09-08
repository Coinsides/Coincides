import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { boardErrorMessage, boardRepository, loadBoardCandidates } from './boardRepository';
import type {
  Board, BoardDetail, BoardEdge, BoardMember, BoardVisual, CreateBoardInput,
  CreateBoardVisualInput, MountBoardMemberInput, PatchBoardMemberInput,
} from './boardTypes';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api }));

const geometry = { x: -720, y: 480, w: 260, h: 160, scale: 1.5, z_index: 3, pinned: true };
const timestamp = '2026-09-08T12:00:00.000Z';
const board: Board = {
  id: 'board-1', user_id: 'fixture-user', title: 'Where do these ideas meet?', soul_id: 'soul-1',
  project_id: null, viewport: { x: -16000, y: 22000, zoom: 0.17 }, created_at: timestamp, updated_at: timestamp,
};
const member: BoardMember = {
  id: 'projection-1', board_id: board.id, member_kind: 'note', member_id: 'note-1',
  ...geometry, metadata: {}, created_at: timestamp, updated_at: timestamp,
  reference: { kind: 'note', id: 'note-1', state: 'available', reason: null, title: 'A note', note_id: 'note-1' },
};
const edge: BoardEdge = {
  id: 'edge-1', board_id: board.id, from_member_id: member.id, to_member_id: 'projection-2',
  style: { stroke: '#567' }, label: 'supports', created_at: timestamp,
};
const visual: BoardVisual = {
  id: 'visual-1', board_id: board.id, visual_kind: 'freehand', ...geometry, rotation: 0,
  data: { points: [{ x: 0, y: 1 }, { x: 24, y: 40, pressure: 0.8 }], path: 'M0 1 L24 40', style: { strokeWidth: 2 } },
  metadata: {}, created_at: timestamp, updated_at: timestamp,
};

beforeEach(() => vi.resetAllMocks());

describe('board HTTP repository', () => {
  it('accepts exactly one soul creation path and projection-only member geometry types', () => {
    const newSoul = { title: 'One sentence', purpose: { title: 'One sentence' } } satisfies CreateBoardInput;
    const existingSoul = { title: 'One sentence', soul_id: 'soul-1' } satisfies CreateBoardInput;
    expectTypeOf<typeof newSoul>().toMatchTypeOf<CreateBoardInput>();
    expectTypeOf<typeof existingSoul>().toMatchTypeOf<CreateBoardInput>();
    expectTypeOf<PatchBoardMemberInput>().toEqualTypeOf<Partial<typeof geometry>>();
    // @ts-expect-error a board must have a soul, either existing or created with it
    const missingSoul: CreateBoardInput = { title: 'One sentence' };
    // @ts-expect-error the creation paths are mutually exclusive
    const bothSouls: CreateBoardInput = { title: 'One sentence', soul_id: 'soul-1', purpose: { title: 'One sentence' } };
    // @ts-expect-error item creation remains reserved for the next segment
    const reservedMember: MountBoardMemberInput = { member_kind: 'item', member_id: 'item-1' };
    expect([missingSoul, bothSouls, reservedMember]).toHaveLength(3);
  });

  it('unwraps list and creation receipts without losing nullable labels or free viewport values', async () => {
    api.get.mockResolvedValueOnce({ data: { boards: [board] } });
    expect(await boardRepository.list()).toEqual([board]);
    expect(api.get).toHaveBeenCalledWith('/boards');
    const input: CreateBoardInput = {
      title: board.title, purpose: { title: board.title, created_by: 'human' }, project_id: null,
      viewport: board.viewport, summary: '  Open this question.  ', purpose_summary: '  Ask it.  ',
    };
    api.post.mockResolvedValueOnce({ data: { board } });
    expect(await boardRepository.create(input)).toBe(board);
    expect(api.post).toHaveBeenCalledWith('/boards', input);
    api.post.mockResolvedValueOnce({ data: { board } });
    await boardRepository.create({ title: board.title, soul_id: board.soul_id });
    expect(api.post).toHaveBeenLastCalledWith('/boards', { title: board.title, soul_id: board.soul_id });
  });

  it('reads all reference states and visual kinds without dropping historical projections', async () => {
    const unavailable: BoardMember = {
      ...member, id: 'projection-2', member_kind: 'text_range', member_id: 'range-1',
      reference: { kind: 'text_range', id: 'range-1', state: 'unavailable', reason: 'text_range_reserved', title: null, note_id: null },
    };
    const missing: BoardMember = {
      ...member, id: 'projection-3',
      reference: { ...member.reference, state: 'missing', reason: 'reference_missing', title: null, note_id: null },
    };
    const detail: BoardDetail = {
      board, members: [member, unavailable, missing], edges: [edge],
      visuals: [visual, { ...visual, id: 'visual-2', visual_kind: 'connector', data: { from: { x: 3, y: 4 }, custom: 'kept' } }],
    };
    api.get.mockResolvedValueOnce({ data: detail });
    expect(await boardRepository.get(board.id)).toBe(detail);
    expect(api.get).toHaveBeenCalledWith('/boards/board-1');
  });

  it('saves viewport and member geometry only through board routes, including retry receipts', async () => {
    const viewport = { x: 42000, y: -83000, zoom: 3.25 };
    api.patch.mockResolvedValueOnce({ data: { board: { ...board, viewport } } });
    expect((await boardRepository.update(board.id, { viewport })).viewport).toEqual(viewport);
    expect(api.patch).toHaveBeenCalledWith('/boards/board-1', { viewport });
    const input: MountBoardMemberInput = { id: member.id, member_kind: 'note', member_id: member.member_id, ...geometry };
    api.post.mockResolvedValueOnce({ data: { member, created: false } });
    expect(await boardRepository.mount(board.id, input)).toBe(member);
    expect(api.post).toHaveBeenCalledWith('/boards/board-1/members', input);
    api.patch.mockResolvedValueOnce({ data: { member: { ...member, pinned: false, scale: 2 } } });
    expect(await boardRepository.updateMember(board.id, member.id, { pinned: false, scale: 2 }))
      .toEqual({ ...member, pinned: false, scale: 2 });
    expect(api.patch).toHaveBeenLastCalledWith('/boards/board-1/members/projection-1', { pinned: false, scale: 2 });
    api.delete.mockResolvedValueOnce({ data: { member, removed: false } });
    await expect(boardRepository.unmount(board.id, member.id)).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith('/boards/board-1/members/projection-1');
  });

  it('keeps edges on projection instance IDs and stores freehand points, path, and style intact', async () => {
    const edgeInput = { from_member_id: edge.from_member_id, to_member_id: edge.to_member_id, style: edge.style, label: edge.label };
    api.post.mockResolvedValueOnce({ data: { edge } });
    expect(await boardRepository.createEdge(board.id, edgeInput)).toBe(edge);
    expect(api.post).toHaveBeenLastCalledWith('/boards/board-1/edges', edgeInput);
    api.patch.mockResolvedValueOnce({ data: { edge: { ...edge, label: null } } });
    expect((await boardRepository.updateEdge(board.id, edge.id, { label: null })).label).toBeNull();
    expect(api.patch).toHaveBeenLastCalledWith('/boards/board-1/edges/edge-1', { label: null });
    api.delete.mockResolvedValueOnce({ data: { removed: true } });
    await expect(boardRepository.deleteEdge(board.id, edge.id)).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenLastCalledWith('/boards/board-1/edges/edge-1');

    const visualInput: CreateBoardVisualInput = { visual_kind: 'freehand', ...geometry, data: visual.data };
    api.post.mockResolvedValueOnce({ data: { visual } });
    expect(await boardRepository.createVisual(board.id, visualInput)).toBe(visual);
    expect(api.post).toHaveBeenLastCalledWith('/boards/board-1/visuals', visualInput);
    api.patch.mockResolvedValueOnce({ data: { visual: { ...visual, x: 700 } } });
    expect((await boardRepository.updateVisual(board.id, visual.id, { x: 700 })).data).toEqual(visual.data);
    expect(api.patch).toHaveBeenLastCalledWith('/boards/board-1/visuals/visual-1', { x: 700 });
    api.delete.mockResolvedValueOnce({ data: { removed: true } });
    await expect(boardRepository.deleteVisual(board.id, visual.id)).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenLastCalledWith('/boards/board-1/visuals/visual-1');
  });

  it('propagates failed create, read, patch, and delete calls so none can appear saved', async () => {
    const conflict = { response: { status: 409, data: { error: 'purpose_already_has_board' } } };
    api.post.mockRejectedValueOnce(conflict);
    await expect(boardRepository.create({ title: board.title, soul_id: board.soul_id })).rejects.toBe(conflict);
    const failure = new Error('Fixture request failed');
    api.get.mockRejectedValueOnce(failure);
    api.patch.mockRejectedValueOnce(failure);
    api.delete.mockRejectedValueOnce(failure);
    await expect(boardRepository.get(board.id)).rejects.toBe(failure);
    await expect(boardRepository.update(board.id, { title: 'Revised title' })).rejects.toBe(failure);
    await expect(boardRepository.unmount(board.id, member.id)).rejects.toBe(failure);
    expect(boardErrorMessage(conflict)).toBe('This purpose already has a board. Choose another purpose or open its board.');
    expect(boardErrorMessage(failure)).toBe('Could not complete the board action. Try again.');
  });
});

describe('read-only board candidate library', () => {
  const note = (id: string, extra = {}) => ({
    id, course_id: 'project-1', title: id, description: '  A concise\nsummary. ', status: 'active',
    note_class: 'user', source_kind: 'manual', ...extra,
  });
  const group = (id: string, noteId: string, extra = {}) => ({
    id, title: id, note_id: noteId, status: 'active', identity: { summary: 'Group summary' }, members: [], ...extra,
  });

  it('aggregates projects and filters unusable or paperless references using only GET requests', async () => {
    api.get.mockImplementation(async (url: string, options?: { params?: { course_id?: string; status?: string } }) => {
      if (url === '/courses') return { data: [{ id: 'project-1', name: 'First project' }, { id: 'project-2', name: 'Second project' }] };
      expect(options?.params?.status).toBe('active');
      if (options?.params?.course_id === 'project-2') {
        if (url === '/notes') return { data: [note('note-2', { course_id: 'project-2', note_class: 'source_projection', source_kind: 'source_projection' })] };
        if (url === '/content-groups') return { data: [group('group-2', 'note-2', { identity: { summary: null }, members: [{ current_content: 'Fresh preview' }] })] };
      }
      if (url === '/notes') return { data: [note('note-1'), note('system', { note_class: 'system' }), note('backing', { source_kind: 'canvas_backing' }), note('trash', { status: 'trashed' })] };
      if (url === '/content-groups') return { data: [group('group-1', 'note-1'), group('root-group', ''), group('missing-paper', 'missing'), group('system-group', 'system'), group('deleted-group', 'note-1', { status: 'deleted' })] };
      throw new Error('Unexpected fixture GET');
    });
    expect(await loadBoardCandidates()).toEqual([
      { member_kind: 'note', member_id: 'note-1', note_id: 'note-1', title: 'note-1', summary: 'A concise summary.', project_title: 'First project' },
      { member_kind: 'content_group', member_id: 'group-1', note_id: 'note-1', title: 'group-1', summary: 'Group summary', project_title: 'First project' },
      { member_kind: 'note', member_id: 'note-2', note_id: 'note-2', title: 'note-2', summary: 'A concise summary.', project_title: 'Second project' },
      { member_kind: 'content_group', member_id: 'group-2', note_id: 'note-2', title: 'group-2', summary: 'Fresh preview', project_title: 'Second project' },
    ]);
    expect(api.get).toHaveBeenCalledTimes(5);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('propagates a failed project read instead of returning a partial or empty library', async () => {
    const failure = new Error('Fixture group read failed');
    api.get.mockImplementation(async (url: string) => {
      if (url === '/courses') return { data: [{ id: 'project-1', name: 'A project' }] };
      if (url === '/notes') return { data: [note('note-1')] };
      throw failure;
    });
    await expect(loadBoardCandidates()).rejects.toBe(failure);
  });

  it('keeps a successfully read empty library empty without extra requests', async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    await expect(loadBoardCandidates()).resolves.toEqual([]);
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
