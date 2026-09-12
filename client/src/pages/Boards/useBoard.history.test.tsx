import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BoardDetail, BoardEdge, BoardLayer, BoardMember, BoardVisual, CreateBoardEdgeInput, CreateBoardLayerInput, CreateBoardVisualInput, PatchBoardLayerInput, PatchBoardMemberInput, PatchBoardVisualInput } from './boardTypes';
import { useBoard } from './useBoard';

// Synthetic persistence only: this suite neither starts a server nor opens a database.
const repository = vi.hoisted(() => ({
  get: vi.fn(), updateMember: vi.fn(), unmount: vi.fn(),
  createEdge: vi.fn(), updateEdge: vi.fn(), deleteEdge: vi.fn(),
  createVisual: vi.fn(), updateVisual: vi.fn(), deleteVisual: vi.fn(),
  createLayer: vi.fn(), updateLayer: vi.fn(), reorderLayers: vi.fn(), deleteLayer: vi.fn(),
}));
vi.mock('./boardRepository', () => ({
  boardRepository: repository,
  boardErrorMessage: () => 'Could not complete the board action. Try again.',
}));

const geometry = { x: 10, y: 20, w: 240, h: 120, scale: 1, z_index: 0, pinned: false };
const timestamp = '2026-09-09T00:00:00.000Z';
const makeMember = (id: string): BoardMember => ({
  id, board_id: 'board-a', member_kind: 'note', member_id: `note-${id}`, ...geometry,
  metadata: {}, created_at: timestamp, updated_at: timestamp,
  reference: { kind: 'note', id: `note-${id}`, state: 'available', reason: null, title: id, note_id: `note-${id}` },
});
const makeVisual = (id: string): BoardVisual => ({
  id, board_id: 'board-a', visual_kind: 'freehand', ...geometry, rotation: 0,
  data: { points: [{ x: 0, y: 0 }, { x: 90, y: 40 }] }, metadata: {}, created_at: timestamp, updated_at: timestamp,
});
const makeEdge = (id: string, from = 'a', to = 'b'): BoardEdge => ({
  id, board_id: 'board-a', from_member_id: from, to_member_id: to,
  style: { direction: 'both', stroke: '#123456' }, label: 'A labeled edge', created_at: timestamp,
});
const makeLayer = (id: string, order_index = 0): BoardLayer => ({
  id, board_id: 'board-a', user_id: 'fixture', name: id, order_index, visible: true,
});
let saved: BoardDetail;
let nextId: number;
let events: string[];

beforeEach(() => {
  vi.resetAllMocks();
  nextId = 0;
  events = [];
  saved = {
    board: { id: 'board-a', user_id: 'fixture', title: 'Board', soul_id: 'soul-a', project_id: null,
      identity_item_id: null, identity_description: null,
      viewport: { x: 0, y: 0, zoom: 1 }, created_at: timestamp, updated_at: timestamp },
    members: [makeMember('a'), makeMember('b'), { ...makeMember('c'), pinned: true }],
    visuals: [makeVisual('v1'), makeVisual('v2'), makeVisual('v3')],
    edges: [makeEdge('e1'), makeEdge('e2', 'a', 'c')],
  };
  repository.get.mockImplementation(async (boardId: string) => structuredClone({ ...saved, board: { ...saved.board, id: boardId } }));
  repository.updateMember.mockImplementation(async (_boardId: string, id: string, input: PatchBoardMemberInput) => {
    const current = saved.members.find((member) => member.id === id);
    if (!current) throw new Error('missing member');
    const updated = { ...current, ...input };
    saved.members = saved.members.map((member) => member.id === id ? updated : member);
    return structuredClone(updated);
  });
  repository.updateVisual.mockImplementation(async (_boardId: string, id: string, input: PatchBoardVisualInput) => {
    const current = saved.visuals.find((visual) => visual.id === id);
    if (!current) throw new Error('missing visual');
    const updated = { ...current, ...input };
    saved.visuals = saved.visuals.map((visual) => visual.id === id ? updated : visual);
    return structuredClone(updated);
  });
  repository.createVisual.mockImplementation(async (_boardId: string, input: CreateBoardVisualInput) => {
    const visual = { ...makeVisual(`new-v${++nextId}`), ...input };
    saved.visuals.push(visual);
    return structuredClone(visual);
  });
  repository.deleteVisual.mockImplementation(async (_boardId: string, id: string) => {
    if (!saved.visuals.some((visual) => visual.id === id)) throw new Error('missing visual');
    saved.visuals = saved.visuals.filter((visual) => visual.id !== id);
  });
  repository.createEdge.mockImplementation(async (_boardId: string, input: CreateBoardEdgeInput) => {
    if (![input.from_member_id, input.to_member_id].every((id) => saved.members.some((member) => member.id === id))) throw new Error('missing endpoint');
    const edge = { ...makeEdge(`new-e${++nextId}`), ...input };
    saved.edges.push(edge);
    return structuredClone(edge);
  });
  repository.updateEdge.mockImplementation(async (_boardId: string, id: string, input: object) => {
    const current = saved.edges.find((edge) => edge.id === id);
    if (!current) throw new Error('missing edge');
    const updated = { ...current, ...input };
    saved.edges = saved.edges.map((edge) => edge.id === id ? updated : edge);
    return structuredClone(updated);
  });
  repository.deleteEdge.mockImplementation(async (_boardId: string, id: string) => {
    if (!saved.edges.some((edge) => edge.id === id)) throw new Error('missing edge');
    saved.edges = saved.edges.filter((edge) => edge.id !== id);
  });
  repository.unmount.mockImplementation(async (_boardId: string, id: string) => {
    saved.members = saved.members.filter((member) => member.id !== id);
    saved.edges = saved.edges.filter((edge) => edge.from_member_id !== id && edge.to_member_id !== id);
    events.push(`unmounted:${id}`);
  });
  repository.createLayer.mockImplementation(async (_boardId: string, input: CreateBoardLayerInput) => {
    const layer = { ...makeLayer(`new-layer${++nextId}`, saved.layers?.length ?? 0), ...input };
    saved.layers = [...saved.layers ?? [], layer];
    return structuredClone(layer);
  });
  repository.updateLayer.mockImplementation(async (_boardId: string, id: string, input: PatchBoardLayerInput) => {
    const layer = { ...saved.layers!.find((candidate) => candidate.id === id)!, ...input };
    saved.layers = saved.layers!.map((candidate) => candidate.id === id ? layer : candidate);
    return structuredClone(layer);
  });
  repository.reorderLayers.mockImplementation(async (_boardId: string, ids: string[]) => {
    saved.layers = ids.map((id, order_index) => ({ ...saved.layers!.find((layer) => layer.id === id)!, order_index }));
    return structuredClone(saved.layers);
  });
  repository.deleteLayer.mockImplementation(async (_boardId: string, id: string) => {
    const movedCount = [...saved.members, ...saved.visuals].filter((object) => object.layer_id === id).length;
    saved.layers = saved.layers?.filter((layer) => layer.id !== id);
    saved.members = saved.members.map((member) => member.layer_id === id ? { ...member, layer_id: null } : member);
    saved.visuals = saved.visuals.map((visual) => visual.layer_id === id ? { ...visual, layer_id: null } : visual);
    return { removed: true, moved_count: movedCount };
  });
});

async function mountHook() {
  const hook = renderHook(() => useBoard('board-a'));
  await waitFor(() => expect(hook.result.current.detail).not.toBeNull());
  return hook;
}

describe('board queue command history', () => {
  it('erases two full strokes in one command and replays them with live IDs', async () => {
    const { result } = await mountHook();
    await act(async () => { await result.current.removeVisuals(['v1', 'v2']); });
    expect(saved.visuals.map((visual) => visual.id)).toEqual(['v3']);
    await act(async () => { await result.current.undo(); });
    expect(saved.visuals).toHaveLength(3);
    expect(result.current.canUndo).toBe(false);
    expect(saved.visuals.filter((visual) => visual.id !== 'v3').map((visual) => visual.data)).toEqual([makeVisual('v2').data, makeVisual('v1').data]);
    await act(async () => { await result.current.redo(); });
    expect(saved.visuals.map((visual) => visual.id)).toEqual(['v3']);
    expect(repository.deleteVisual.mock.calls.slice(-2).every(([, id]) => id.startsWith('new-v'))).toBe(true);
  });

  it('queues undo after a pending gesture, restores all geometry fields, and reloads persisted final state with no history', async () => {
    const { result } = await mountHook();
    const patch = { x: 130, y: -35, w: 320, h: 190, scale: 1.4, z_index: 7, pinned: true };
    await act(async () => {
      const move = result.current.updateMember('a', patch);
      const undo = result.current.undo();
      expect(await move).toBe(true);
      expect(await undo).toBe(true);
    });
    expect(saved.members[0]).toMatchObject(geometry);
    await act(async () => { await result.current.redo(); await result.current.reload(); });
    expect(result.current.detail?.members[0]).toMatchObject(patch);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('restores the label and direction of an independent deleted edge and maps older edits to its new ID', async () => {
    const { result } = await mountHook();
    await act(async () => {
      await result.current.updateEdge('e1', { label: 'Edited label', style: { direction: 'forward' } });
      await result.current.removeEdge('e1');
      await result.current.undo();
    });
    const restored = saved.edges.find((edge) => edge.id !== 'e2')!;
    expect(restored).toMatchObject({ label: 'Edited label', style: { direction: 'forward' } });
    expect(restored.id).not.toBe('e1');
    await act(async () => { await result.current.undo(); });
    expect(repository.updateEdge).toHaveBeenLastCalledWith('board-a', restored.id, { label: 'A labeled edge', style: makeEdge('e1').style });
    await act(async () => { await result.current.redo(); await result.current.redo(); });
    expect(saved.edges.map((edge) => edge.id)).toEqual(['e2']);
  });

  it('keeps create, chalk edit, geometry and deletion commands on a single remapped visual identity', async () => {
    const { result } = await mountHook();
    await act(async () => { await result.current.addVisual({ visual_kind: 'sticky', data: { text: 'First' }, x: 50 }); });
    const originalId = saved.visuals[saved.visuals.length - 1].id;
    await act(async () => {
      await result.current.updateVisual(originalId, { data: { text: 'Edited' } });
      await result.current.updateVisual(originalId, { x: 240, y: 125, w: 300, h: 200 });
      await result.current.removeVisual(originalId);
      await result.current.undo();
      await result.current.redo();
      await result.current.undo();
      await result.current.undo();
      await result.current.undo();
      await result.current.undo();
    });
    expect(saved.visuals).toHaveLength(3);
    await act(async () => { await result.current.redo(); await result.current.redo(); await result.current.redo(); });
    const live = saved.visuals[saved.visuals.length - 1];
    expect(live).toMatchObject({ visual_kind: 'sticky', data: { text: 'Edited' }, x: 240, y: 125, w: 300, h: 200 });
    expect(live.id).not.toBe(originalId);
    await act(async () => { await result.current.updateVisual(originalId, { x: 333 }); });
    expect(repository.updateVisual).toHaveBeenLastCalledWith('board-a', live.id, { x: 333 });
    expect(result.current.error).toBeNull();
  });

  it('moves a mixed selection as one command and skips pinned projections', async () => {
    const { result } = await mountHook();
    await act(async () => { await result.current.updateGeometryBatch([
      { kind: 'member', id: 'a', input: { x: 110, y: 220 } },
      { kind: 'member', id: 'c', input: { x: 110, y: 220 } },
      { kind: 'visual', id: 'v1', input: { x: 110, y: 220 } },
    ]); });
    expect(saved.members[2]).toMatchObject({ x: 10, y: 20, pinned: true });
    expect(saved.members[0]).toMatchObject({ x: 110, y: 220 });
    expect(saved.visuals[0]).toMatchObject({ x: 110, y: 220 });
    await act(async () => { await result.current.undo(); });
    expect(saved.members[0]).toMatchObject(geometry);
    expect(saved.visuals[0]).toMatchObject(geometry);
    expect(result.current.canUndo).toBe(false);
  });

  it('moves three mixed objects including pinned objects to a layer in one command, then restores their different original layers', async () => {
    saved.layers = [makeLayer('source'), makeLayer('target', 1)];
    saved.members[2].layer_id = 'source';
    saved.visuals[0] = { ...saved.visuals[0], layer_id: 'source', pinned: true };
    const originalGeometry = [...saved.members, ...saved.visuals].map(({ id, x, y, w, h, scale, z_index, pinned }) => ({ id, x, y, w, h, scale, z_index, pinned }));
    const { result } = await mountHook();
    await act(async () => { expect(await result.current.moveSelectionToLayer({ memberIds: ['a', 'c'], visualIds: ['v1'] }, 'target')).toBe(true); });
    expect(saved.members.filter((member) => ['a', 'c'].includes(member.id)).map((member) => member.layer_id)).toEqual(['target', 'target']);
    expect(saved.visuals[0].layer_id).toBe('target');
    expect(repository.updateMember).toHaveBeenCalledTimes(2);
    expect(repository.updateVisual).toHaveBeenCalledTimes(1);
    await act(async () => { expect(await result.current.undo()).toBe(true); });
    expect(saved.members[0].layer_id).toBeNull();
    expect(saved.members[2].layer_id).toBe('source');
    expect(saved.visuals[0].layer_id).toBe('source');
    expect(repository.updateMember).toHaveBeenLastCalledWith('board-a', 'a', { layer_id: null });
    expect(result.current.canUndo).toBe(false);
    expect([...saved.members, ...saved.visuals].map(({ id, x, y, w, h, scale, z_index, pinned }) => ({ id, x, y, w, h, scale, z_index, pinned }))).toEqual(originalGeometry);
    await act(async () => { await result.current.redo(); });
    expect(saved.members[2]).toMatchObject({ layer_id: 'target', pinned: true });
    expect(saved.visuals[0]).toMatchObject({ layer_id: 'target', pinned: true });
  });

  it('keeps object history through layer create, rename and reorder, then scrubs deleted layers from past and future replay snapshots', async () => {
    saved.layers = [makeLayer('doomed'), makeLayer('kept', 1)];
    const { result } = await mountHook();
    let createdVisualId = '';
    await act(async () => {
      await result.current.addVisual({ visual_kind: 'sticky', data: { text: 'Layer chalk' }, layer_id: 'doomed', x: 80 });
      createdVisualId = saved.visuals[saved.visuals.length - 1].id;
      await result.current.updateVisual(createdVisualId, { x: 140 });
      await result.current.moveSelectionToLayer({ memberIds: ['a'], visualIds: [] }, 'doomed');
      await result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    await act(async () => {
      const added = await result.current.createLayer({ name: 'Extra' });
      expect(added?.name).toBe('Extra');
      await result.current.updateLayer('kept', { name: 'Renamed', visible: false });
      await result.current.reorderLayers([added!.id, 'kept', 'doomed']);
    });
    expect(result.current.canRedo).toBe(true);
    expect(result.current.detail?.layers?.map((layer) => layer.id)).toEqual([saved.layers![0].id, 'kept', 'doomed']);
    await act(async () => { expect(await result.current.deleteLayer('doomed')).toBe(true); });
    expect(result.current.canRedo).toBe(true);
    expect(result.current.detail?.visuals.find((visual) => visual.id === createdVisualId)).toMatchObject({ layer_id: null, x: 140 });
    expect(result.current.detail?.layers?.some((layer) => layer.id === 'doomed')).toBe(false);
    repository.updateMember.mockClear();
    repository.updateVisual.mockClear();
    repository.createVisual.mockClear();
    await act(async () => {
      await result.current.redo();
      await result.current.undo();
      await result.current.undo();
      await result.current.undo();
    });
    expect(saved.visuals.some((visual) => visual.id === createdVisualId)).toBe(false);
    expect(result.current.canUndo).toBe(false);
    await act(async () => { await result.current.redo(); await result.current.redo(); });
    expect(saved.visuals[saved.visuals.length - 1]).toMatchObject({ layer_id: null, x: 140, data: { text: 'Layer chalk' } });
    const replayInputs = [...repository.updateMember.mock.calls, ...repository.updateVisual.mock.calls].map(([, , input]) => input);
    replayInputs.push(...repository.createVisual.mock.calls.map(([, input]) => input));
    expect(replayInputs.some((input) => input.layer_id === 'doomed')).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('preserves a new visual layer through ordinary undo and redo', async () => {
    saved.layers = [makeLayer('ink')];
    const { result } = await mountHook();
    await act(async () => {
      await result.current.addVisual({ visual_kind: 'freehand', data: makeVisual('fixture').data, layer_id: 'ink' });
      await result.current.undo();
      await result.current.redo();
    });
    expect(saved.visuals[saved.visuals.length - 1].layer_id).toBe('ink');
    expect(repository.createVisual.mock.calls.every(([, input]) => input.layer_id === 'ink')).toBe(true);
  });

  it('leaves members and selected/unselected incident edges removed while undo restores mixed-delete visuals and prunes dead past targets', async () => {
    const { result } = await mountHook();
    await act(async () => {
      await result.current.updateGeometryBatch([
        { kind: 'member', id: 'a', input: { x: 80 } },
        { kind: 'visual', id: 'v3', input: { x: 80 } },
      ]);
      await result.current.updateEdge('e2', { label: 'Incident edit' });
      await result.current.removeSelection({ memberIds: ['a'], edgeIds: ['e1'], visualIds: ['v1'] });
      await result.current.undo();
    });
    expect(saved.members.map((member) => member.id)).toEqual(['b', 'c']);
    expect(saved.edges).toEqual([]);
    expect(saved.visuals).toHaveLength(3);
    expect(events).toEqual(['unmounted:a']);
    await act(async () => { await result.current.undo(); });
    expect(saved.visuals.find((visual) => visual.id === 'v3')?.x).toBe(10);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.error).toBeNull();
    expect(repository.createEdge).not.toHaveBeenCalled();
  });

  it('compensates a partially failed group move and leaves undo/redo on the same command after a failed replay', async () => {
    const { result } = await mountHook();
    repository.updateVisual.mockRejectedValueOnce(new Error('fixture write failure'));
    await act(async () => { expect(await result.current.updateGeometryBatch([
      { kind: 'member', id: 'a', input: { x: 110 } },
      { kind: 'visual', id: 'v1', input: { x: 110 } },
    ])).toBe(false); });
    expect(saved.members[0].x).toBe(10);
    expect(result.current.detail?.members[0].x).toBe(10);
    expect(result.current.canUndo).toBe(false);
    await act(async () => { await result.current.updateMember('a', { x: 55 }); });
    repository.updateMember.mockRejectedValueOnce(new Error('fixture undo failure'));
    await act(async () => { expect(await result.current.undo()).toBe(false); });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(saved.members[0].x).toBe(55);
    await act(async () => { await result.current.undo(); });
    expect(saved.members[0].x).toBe(10);
    repository.updateMember.mockRejectedValueOnce(new Error('fixture redo failure'));
    await act(async () => { expect(await result.current.redo()).toBe(false); });
    expect(result.current.canRedo).toBe(true);
    expect(result.current.canUndo).toBe(false);
  });

  it('limits history to 80 entries, clears redo on a new edit, and isolates navigation scopes', async () => {
    const { result, rerender } = renderHook(({ id }) => useBoard(id), { initialProps: { id: 'board-a' } });
    await waitFor(() => expect(result.current.detail).not.toBeNull());
    await act(async () => {
      for (let index = 1; index <= 81; index++) await result.current.updateMember('a', { x: 100 + index });
      for (let index = 0; index < 80; index++) await result.current.undo();
    });
    expect(saved.members[0].x).toBe(101);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    await act(async () => { await result.current.updateMember('b', { y: 50 }); });
    expect(result.current.canRedo).toBe(false);
    rerender({ id: 'board-b' });
    await waitFor(() => expect(result.current.detail?.board.id).toBe('board-b'));
    expect(result.current.canUndo).toBe(false);
    rerender({ id: 'board-a' });
    await waitFor(() => expect(result.current.detail?.board.id).toBe('board-a'));
    expect(result.current.canUndo).toBe(false);
  });
});
