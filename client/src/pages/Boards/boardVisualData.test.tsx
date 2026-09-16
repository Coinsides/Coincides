import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBoard } from './useBoard';
import { BoardCommandHistory } from './boardCommandHistory';
import { boardLayerScene } from './boardLayerScene';
import { deletionScope, marqueeSelection } from './boardSelection';
import { boardEdgeGeometry } from './boardEdgeGeometry';
import { pointOnBoardArc } from '../../../../shared/boardVisualGeometry';
import type { BoardDetail, BoardEdge, BoardMember, BoardSticky, CreateBoardEdgeInput, CreateBoardStickyInput } from './boardTypes';

const repository = vi.hoisted(() => ({ get: vi.fn(), createSticky: vi.fn(), updateSticky: vi.fn(), deleteSticky: vi.fn(),
  createEdge: vi.fn(), updateEdge: vi.fn(), deleteEdge: vi.fn(), rerouteEdge: vi.fn(), updateMember: vi.fn() }));
vi.mock('./boardRepository', () => ({ boardRepository: repository, boardErrorMessage: () => 'Save failed.' }));

const stamp = '2026-09-16T00:00:00.000Z';
const geometry = { x: 0, y: 0, w: 240 as const, h: 120, scale: 1 as const, z_index: 0, pinned: false };
const sticky = (id: string, x = 0): BoardSticky => ({ ...geometry, id, x, board_id: 'board', text: id,
  color_index: null, weight: 1, created_at: stamp, updated_at: stamp });
const member = (id: string, x = 0): BoardMember => ({ ...geometry, id, x, board_id: 'board', member_kind: 'note',
  member_id: `note-${id}`, reference: { kind: 'note', id: `note-${id}`, state: 'available', reason: null,
    title: id, note_id: `note-${id}` }, metadata: {}, created_at: stamp, updated_at: stamp });
const edge = (id: string, input: CreateBoardEdgeInput = {}): BoardEdge => ({
  id, board_id: 'board', from_member_id: null, to_member_id: null, style: {}, label: null,
  from: { kind: 'sticky', id: 's1', anchor: 'e' }, to: { kind: 'sticky', id: 's2', anchor: 'w' },
  bend: 18, visual_version: 1, created_at: stamp, ...input,
});
let saved: BoardDetail;
let sequence: number;

beforeEach(() => {
  vi.resetAllMocks();
  sequence = 0;
  saved = { board: { id: 'board', user_id: 'fixture', title: 'Board', soul_id: 'soul', project_id: null,
    identity_item_id: null, identity_description: null, viewport: { x: 0, y: 0, zoom: 1 },
    created_at: stamp, updated_at: stamp }, members: [member('m1', -500)],
    stickies: [sticky('s1'), sticky('s2', 500)], visuals: [], edges: [edge('e1')] };
  repository.get.mockImplementation(async () => structuredClone(saved));
  repository.createSticky.mockImplementation(async (_board: string, input: CreateBoardStickyInput) => {
    const value = { ...sticky(`s-new-${++sequence}`), ...input };
    saved.stickies!.push(value); return structuredClone(value);
  });
  repository.updateSticky.mockImplementation(async (_board: string, id: string, input: object) => {
    const value = { ...saved.stickies!.find((candidate) => candidate.id === id)!, ...input };
    saved.stickies = saved.stickies!.map((candidate) => candidate.id === id ? value : candidate);
    return structuredClone(value);
  });
  repository.deleteSticky.mockImplementation(async (_board: string, id: string) => {
    saved.stickies = saved.stickies!.filter((candidate) => candidate.id !== id);
    saved.edges = saved.edges.filter((candidate) => ![candidate.from, candidate.to].some((end) => end?.kind === 'sticky' && end.id === id));
  });
  repository.createEdge.mockImplementation(async (_board: string, input: CreateBoardEdgeInput) => {
    for (const end of [input.from, input.to]) if (end?.kind === 'sticky'
      && !saved.stickies!.some((candidate) => candidate.id === end.id)) throw new Error('Missing sticky');
    const value = edge(`e-new-${++sequence}`, input);
    saved.edges.push(value); return structuredClone(value);
  });
  repository.updateEdge.mockImplementation(async (_board: string, id: string, input: object) => {
    const value = { ...saved.edges.find((candidate) => candidate.id === id)!, ...input };
    saved.edges = saved.edges.map((candidate) => candidate.id === id ? value : candidate);
    return structuredClone(value);
  });
  repository.deleteEdge.mockImplementation(async (_board: string, id: string) => {
    saved.edges = saved.edges.filter((candidate) => candidate.id !== id);
  });
  repository.rerouteEdge.mockImplementation(async (_board: string, id: string) => {
    const before = saved.edges.find((candidate) => candidate.id === id)!;
    const value: BoardEdge = { ...before, bend: 150, visual_version: 1,
      ...(before.visual_version === 1 ? {} : {
        cap_start: before.style.direction === 'both' ? 'arrow' : 'none',
        cap_end: ['forward', 'both'].includes(String(before.style.direction)) ? 'arrow' : 'none',
      }) };
    saved.edges = saved.edges.map((candidate) => candidate.id === id ? value : candidate);
    return structuredClone(value);
  });
});

const history = () => { const value = new BoardCommandHistory(); value.reset(structuredClone(saved)); return value; };

describe('board sticky and visual-edge data integration', () => {
  it('creates, edits, deletes and restores a sticky with every attached edge and live endpoint identity', async () => {
    const h = history();
    await h.patch('board', 'sticky', 's1', { text: 'Edited concept', weight: 3, color_index: 1 });
    await h.removeSelection('board', { memberIds: [], visualIds: [], edgeIds: [], stickyIds: ['s1'] });
    expect(saved.stickies!.map(({ id }) => id)).toEqual(['s2']);
    expect(saved.edges).toEqual([]);
    await h.undo('board');
    const restored = saved.stickies!.find(({ id }) => id !== 's2')!;
    expect(restored).toMatchObject({ text: 'Edited concept', weight: 3, color_index: 1 });
    expect(saved.edges[0].from).toEqual({ kind: 'sticky', id: restored.id, anchor: 'e' });
    await h.undo('board');
    expect(saved.stickies!.find(({ id }) => id === restored.id)).toMatchObject({ text: 's1', weight: 1, color_index: null });
    await h.redo('board'); await h.redo('board');
    expect(saved.stickies).toHaveLength(1);
    expect(saved.edges).toHaveLength(0);
  });

  it('compensates a failed sticky removal after incident edges were deleted', async () => {
    const h = history();
    repository.deleteSticky.mockRejectedValueOnce(new Error('Save failed'));
    await expect(h.removeSelection('board', { memberIds: [], visualIds: [], edgeIds: [], stickyIds: ['s1'] })).rejects.toThrow('Save failed');
    expect(saved.stickies).toHaveLength(2);
    expect(saved.edges).toHaveLength(1);
    expect(saved.edges[0].from).toEqual({ kind: 'sticky', id: 's1', anchor: 'e' });
    expect(h.canUndo).toBe(false);
  });

  it('undoes sticky geometry and layer moves without writing a scale or recalculating bend', async () => {
    const h = history();
    await h.updateGeometryBatch('board', [{ kind: 'sticky', id: 's1', input: { x: 70, scale: 2 } }]);
    expect(repository.updateSticky).toHaveBeenLastCalledWith('board', 's1', { x: 70 });
    expect(saved.edges[0].bend).toBe(18);
    await h.moveSelectionToLayer('board', { memberIds: [], visualIds: [], stickyIds: ['s1'] }, 'layer');
    expect(saved.stickies![0].layer_id).toBe('layer');
    await h.undo('board'); await h.undo('board');
    expect(saved.stickies![0]).toMatchObject({ x: 0, layer_id: null, scale: 1 });
    expect(repository.rerouteEdge).not.toHaveBeenCalled();
  });

  it('restores a legacy edge after style-axis changes and explicit rerouting', async () => {
    saved.edges = [{ id: 'old', board_id: 'board', from_member_id: 'm1', to_member_id: 'm1',
      label: null, style: { direction: 'both', width: 4 }, created_at: stamp }];
    const h = history();
    await h.patch('board', 'edge', 'old', { dash: 'dashed', cap_end: 'arrow' });
    expect(saved.edges[0].visual_version).toBe(1);
    await h.undo('board');
    expect(saved.edges[0]).toMatchObject({ visual_version: 0, dash: 'solid', cap_end: 'none', style: { direction: 'both', width: 4 } });
    await h.rerouteEdge('board', 'old');
    expect(saved.edges[0]).toMatchObject({ bend: 150, cap_start: 'arrow', cap_end: 'arrow' });
    await h.undo('board');
    expect(saved.edges[0]).toMatchObject({ bend: 0, visual_version: 0, cap_start: 'none', cap_end: 'none' });
    await h.redo('board');
    expect(saved.edges[0]).toMatchObject({ bend: 150, visual_version: 1, cap_start: 'arrow', cap_end: 'arrow' });
  });

  it('recreates deleted pre-v1 edge snapshots with zero bend and the legacy visual version', async () => {
    saved.edges = [{ id: 'old', board_id: 'board', from_member_id: 'm1', to_member_id: 'm1',
      label: 'Kept label', style: { direction: 'both', width: 4 }, created_at: stamp }];
    const h = history();
    await h.removeSelection('board', { memberIds: [], visualIds: [], edgeIds: ['old'] });
    await h.undo('board');
    expect(repository.createEdge).toHaveBeenLastCalledWith('board', {
      from_member_id: 'm1', to_member_id: 'm1', label: 'Kept label', style: { direction: 'both', width: 4 },
      visual_version: 0, bend: 0,
    });
  });

  it('remembers only style axes for new edges and keeps sticky CRUD on the serialized hook queue', async () => {
    const { result } = renderHook(() => useBoard('board'));
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    await act(async () => {
      await result.current.addSticky({ text: 'A new concept' });
      await result.current.updateEdge('e1', { weight: 3, dash: 'dashed', cap_end: 'dot', bend: 85, label_position: 0.2 });
      await result.current.addEdge({ from: { kind: 'sticky', id: 's1', anchor: 'n' }, to: { kind: 'point', x: 700, y: 80 } });
    });
    expect(result.current.detail?.stickies).toHaveLength(3);
    expect(repository.createEdge).toHaveBeenLastCalledWith('board', expect.objectContaining({ weight: 3, dash: 'dashed', cap_end: 'dot' }));
    expect(repository.createEdge.mock.lastCall![1]).not.toHaveProperty('bend');
    expect(repository.createEdge.mock.lastCall![1]).not.toHaveProperty('label_position');
  });

  it('selects the actual arc and sticky rectangle and counts hidden sticky connections on deletion', () => {
    const curved = edge('e1', { bend: 160 });
    saved.edges = [curved];
    const arc = boardEdgeGeometry(curved, saved)!.arc;
    const middle = pointOnBoardArc(arc, 0.5);
    expect(marqueeSelection({ x: middle.x - 2, y: middle.y - 2, w: 4, h: 4 }, saved)).toContainEqual({ kind: 'edge', id: 'e1' });
    expect(marqueeSelection({ x: 10, y: 10, w: 5, h: 5 }, saved)).toContainEqual({ kind: 'sticky', id: 's1' });
    const scope = deletionScope(new Set(['sticky:s1']), { ...saved, edges: [] }, saved.edges);
    expect(scope).toMatchObject({ stickyIds: ['s1'], connectedEdgeCount: 1, reversibleCount: 1 });
  });

  it('hides sticky incident edges by endpoint layers and rehomes deleted-layer snapshots', async () => {
    saved.layers = [{ id: 'hidden', board_id: 'board', user_id: 'fixture', name: 'Hidden', order_index: 0, visible: false }];
    saved.stickies![0].layer_id = 'hidden';
    const scene = boardLayerScene(saved, saved.members, saved.visuals);
    expect(scene.stickies.map(({ id }) => id)).toEqual(['s2']);
    expect(scene.edges).toEqual([]);
    const free = edge('free', { from: { kind: 'point', x: 300, y: 300 }, to: { kind: 'point', x: 500, y: 300 } });
    const hiddenBase = { ...saved, board: { ...saved.board, base_layer_visible: false }, edges: [free] };
    expect(boardLayerScene(hiddenBase, hiddenBase.members, []).edges).toEqual([]);
    const h = history();
    await h.patch('board', 'sticky', 's1', { text: 'New text' });
    h.rehomeDeletedLayer('hidden');
    expect(h.detail?.stickies![0].layer_id).toBeNull();
    await h.undo('board');
    expect(repository.updateSticky).toHaveBeenLastCalledWith('board', 's1', { text: 's1' });
  });

  it('keeps old snapshots without stickies on their exact straight geometry', () => {
    const old = { id: 'old', board_id: 'board', from_member_id: 'a', to_member_id: 'b',
      style: { direction: 'both' }, label: null, created_at: stamp };
    const snapshot = { ...saved, members: [member('a'), member('b', 500)], edges: [old], stickies: undefined };
    const projected = boardEdgeGeometry(old, snapshot)!;
    expect(projected.start).toEqual({ x: 246, y: 60 });
    expect(projected.end).toEqual({ x: 494, y: 60 });
    expect(projected.arc.bend).toBe(0);
    expect(boardLayerScene(snapshot, snapshot.members, []).edges).toHaveLength(1);
  });
});
