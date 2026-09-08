import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BoardRelocatedVisual } from './BoardRelocatedVisual';
import { notifyBoardChanged } from './boardEvents';
import { useBoard } from './useBoard';
import type { BoardDetail, BoardVisual } from './boardTypes';

const io = vi.hoisted(() => ({ blob: vi.fn(), get: vi.fn() }));
vi.mock('@/services/api', () => ({ default: {} }));
vi.mock('@/pages/Notes/canvasEngine/canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: io.blob }));
vi.mock('./boardRepository', () => ({ boardRepository: { get: io.get }, boardErrorMessage: () => 'Fixture error' }));

const visual = (kind: BoardVisual['visual_kind'], source: object, extra: object = {}): BoardVisual => ({
  id: kind, board_id: 'board-fixture', visual_kind: kind,
  x: -112, y: 83, w: 260, h: 170, rotation: 27, scale: 1.2, z_index: 8, pinned: false,
  data: { tray_source: source, ...extra }, metadata: {}, created_at: 'fixture', updated_at: 'fixture',
});

beforeEach(() => {
  vi.resetAllMocks();
  io.blob.mockResolvedValue('blob:fixture-image');
  vi.stubGlobal('URL', Object.assign(URL, { revokeObjectURL: vi.fn() }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows preserved shape text, table cells, image and raw connector styles without changing source rows', async () => {
  const shape = visual('shape', { object: { metadata: '{ "shape_type": "ellipse", "future": [1,2] }' },
    backing_blocks: [{ plain_text: 'A retained thought', content_json: '{"unknown":true}' }] });
  const table = visual('table', { extensions: { table: { data_json: JSON.stringify({
    rows: [{ rowId: 'r1', index: 0 }], columns: [{ columnId: 'c1', index: 0 }],
    cells: [{ rowId: 'r1', columnId: 'c1', text: 'Retained cell', future: true }],
  }) } } });
  const image = visual('image', { extensions: { image: { asset_id: 'asset-fixture', fit: 'cover', alt_text: 'Fixture diagram', caption: 'Retained caption' } } });
  const connector = visual('connector', { extensions: { connector: {
    start_x: -92, start_y: 113, end_x: 48, end_y: 173,
    stroke: '#456789', stroke_width: 3.75, line_style: 'dashed', start_marker: 'dot', end_marker: 'arrow',
    metadata: '{ "future": ["unchanged"] }',
  } } }, { connector_points: { start: { x: 20, y: 30 }, end: { x: 160, y: 90 } } });
  const all = [shape, table, image, connector];
  const original = JSON.stringify(all);
  const select = vi.fn();
  const { unmount } = render(<>{all.map((entry) => <BoardRelocatedVisual key={entry.id} visual={entry}
    selected={false} selectable onSelect={select} />)}</>);
  expect(screen.getByText('A retained thought')).toBeTruthy();
  expect(screen.getByRole('cell', { name: 'Retained cell' })).toBeTruthy();
  const diagram = await screen.findByRole('img', { name: 'Fixture diagram' });
  expect(diagram.getAttribute('src')).toBe('blob:fixture-image');
  expect(io.blob).toHaveBeenCalledWith('asset-fixture');
  const shapeBox = screen.getByTestId('board-visual-shape');
  expect(shapeBox.style.left).toBe('-112px');
  expect(shapeBox.style.top).toBe('83px');
  expect(shapeBox.style.transform).toBe('scale(1.2)');
  expect((screen.getByRole('button', { name: 'Select moved shape' }) as HTMLElement).style.transform).toBe('rotate(27deg)');
  const line = screen.getByTestId('board-visual-connector').querySelector('g > path')!;
  expect(line.getAttribute('d')).toBe('M 20 30 L 160 90');
  expect(line.getAttribute('stroke-width')).toBe('3.75');
  expect(line.getAttribute('stroke-dasharray')).toBe('8 5');
  expect(line.getAttribute('marker-start')).toBe('url(#board-arrow-connector-dot)');
  expect(line.getAttribute('marker-end')).toBe('url(#board-arrow-connector)');
  fireEvent.keyDown(screen.getByRole('button', { name: 'Select moved connector' }), { key: 'Enter' });
  expect(select).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(all)).toBe(original);
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fixture-image');
});

it('re-reads the mounted board when relocation or undo changes it, without notifying unrelated boards', async () => {
  const detail: BoardDetail = { board: { id: 'board-fixture', user_id: 'fixture', title: 'Fixture board',
    soul_id: 'soul-fixture', project_id: null, viewport: { x: 0, y: 0, zoom: 1 }, created_at: '', updated_at: '' },
  members: [], edges: [], visuals: [] };
  io.get.mockImplementation(async () => structuredClone(detail));
  function View() {
    const state = useBoard('board-fixture');
    return <>{state.detail?.visuals.map((entry) => <span key={entry.id}>{entry.id}</span>)}</>;
  }
  render(<View />);
  await waitFor(() => expect(io.get).toHaveBeenCalledTimes(1));
  await act(async () => { notifyBoardChanged('unrelated-board'); });
  expect(io.get).toHaveBeenCalledTimes(1);
  detail.visuals.push(visual('shape', {}));
  await act(async () => { notifyBoardChanged('board-fixture'); });
  expect(await screen.findByText('shape')).toBeTruthy();
  detail.visuals = [];
  await act(async () => { notifyBoardChanged('board-fixture'); });
  await waitFor(() => expect(screen.queryByText('shape')).toBeNull());
  expect(io.get).toHaveBeenCalledTimes(3);
});
