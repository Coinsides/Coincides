import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPaperFreehand } from '../freehandService';
import { normalizeCanvasPersistencePayload } from '../canvasPersistenceNormalizer';
import { saveGenericCanvasObjectForNote } from '../canvasObjectRepository';
import type { PageFrameModel } from '../types';
import { PaperInkLayer } from './PaperInkLayer';
import type { NoteWritingSurfaceLayerProps } from './NoteWritingSurfaceLayer';

const transport = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock('@/services/api', () => ({ default: transport }));
const frame: PageFrameModel = { id: 'ink-page-two', x: 280, y: 1440, width: 794, height: 1123,
  contentInset: { left: 72, right: 72, top: 96, bottom: 96 }, role: 'secondary_page_frame', exportable: true };

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); transport.put.mockReset(); });

function pointer(node: Element, type: string, x: number, y: number, pointerId = 1) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperties(event, { pointerId: { value: pointerId }, isPrimary: { value: true } });
  fireEvent(node, event);
}

function specimen() {
  const onCreate = vi.fn(async (_input: Parameters<NoteWritingSurfaceLayerProps['onPersistCanvasObject']>[0]) => true);
  const onDelete = vi.fn(async (_id: string) => true);
  const props = { frame, displayFrame: { ...frame, x: -72 }, objects: [], placements: [], canvasId: 'ink-canvas',
    tool: 'pen' as const, onCreate, onDelete };
  const view = render(<PaperInkLayer {...props} />);
  const layer = view.container.querySelector<HTMLElement>('[data-paper-ink-layer]')!;
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue({ left: 50, top: 90, right: 447, bottom: 651.5,
    width: 397, height: 561.5 } as DOMRect);
  return { ...view, layer, props, onCreate, onDelete };
}

describe('C4 actual paper gestures', () => {
  it('converts scaled pointer samples once, saves page-local through the repository and rehydrates identically', async () => {
    const view = specimen();
    pointer(view.layer, 'pointerdown', 100, 140);
    pointer(view.layer, 'pointermove', 130, 160);
    await act(async () => pointer(view.layer, 'pointerup', 150, 180));
    expect(view.onCreate).toHaveBeenCalledTimes(1);
    const saved = view.onCreate.mock.calls[0][0] as unknown as ReturnType<typeof createPaperFreehand>;
    expect(saved.canvasObject.kind).toBe('freehand');
    expect(saved.canvasObject.data).toMatchObject({ points: [{ x: 0, y: 0 }, { x: 60, y: 40 }, { x: 100, y: 80 }],
      style: { color_token: 'ink', width: 2.5 } });
    expect(saved.placement).toMatchObject({ x: 380, y: 1540, width: 100, height: 80, frameId: frame.id,
      surface: 'formal_page', boundaryRole: 'inside' });
    transport.put.mockImplementation(async (_url, body) => ({ data: {
      canvasObjects: [{ id: saved.canvasObject.objectId, kind: 'freehand', metadata: { freehand: body.data } }],
      canvasPlacements: [{ ...body.placement, id: saved.placement.placementId, object_id: saved.canvasObject.objectId }],
    } }));
    const response = await saveGenericCanvasObjectForNote({ noteId: 'ink-note', objectId: saved.canvasObject.objectId,
      payload: saved.payload, coordinateContract: 'v2', pageFrameCollection: { pageFrames: [frame], primaryFrameId: frame.id } });
    expect(transport.put.mock.calls[0][1].placement).toMatchObject({ x: 28, y: 4,
      coordinate_space: 'page_frame_local', frame_id: frame.id, surface: 'formal_page', boundary_role: 'inside' });
    const reload = normalizeCanvasPersistencePayload(response, 'v2', [frame]);
    expect(reload.canvasPlacements[0]).toMatchObject({ x: 380, y: 1540, frameId: frame.id });
    expect(reload.canvasObjects[0].metadata?.freehand).toEqual(saved.canvasObject.data);
  });

  it('clamps samples on every edge to the starting sheet and includes the release sample', async () => {
    const view = specimen();
    pointer(view.layer, 'pointerdown', 50, 90);
    pointer(view.layer, 'pointermove', -10, -20);
    pointer(view.layer, 'pointermove', 500, 300);
    await act(async () => pointer(view.layer, 'pointerup', 300, 1100));
    const saved = view.onCreate.mock.calls[0][0] as unknown as ReturnType<typeof createPaperFreehand>;
    expect(saved.placement).toMatchObject({ x: frame.x, y: frame.y, width: frame.width, height: frame.height, frameId: frame.id });
    expect(saved.canvasObject.data.points).toEqual([{ x: 0, y: 0 }, { x: 794, y: 420 }, { x: 500, y: 1123 }]);
    expect(view.onCreate).toHaveBeenCalledTimes(1);
  });

  it('keeps taps at all four corners visible and wholly on their page', () => {
    for (const x of [0, frame.width, frame.width - 0.005]) for (const y of [0, frame.height]) {
      const { canvasObject, placement } = createPaperFreehand({ frame, canvasId: 'ink-canvas', objectId: 'tap', points: [{ x, y }], zIndex: 1 });
      expect(canvasObject.data.path).toContain('L');
      for (const p of canvasObject.data.points!) {
        expect(placement.x + p.x).toBeGreaterThanOrEqual(frame.x);
        expect(placement.x + p.x).toBeLessThanOrEqual(frame.x + frame.width);
        expect(placement.y + p.y).toBeGreaterThanOrEqual(frame.y);
        expect(placement.y + p.y).toBeLessThanOrEqual(frame.y + frame.height);
      }
    }
  });

  it('cancels on Escape, lost capture, tool change and pointercancel without writing; ignores another pointer', async () => {
    const view = specimen();
    pointer(view.layer, 'pointerdown', 100, 140);
    pointer(view.layer, 'pointermove', 250, 500, 2);
    fireEvent.keyDown(window, { key: 'Escape' });
    await act(async () => pointer(view.layer, 'pointerup', 150, 180));
    pointer(view.layer, 'pointerdown', 100, 140);
    fireEvent(view.layer, new Event('lostpointercapture', { bubbles: true }));
    pointer(view.layer, 'pointerdown', 100, 140);
    pointer(view.layer, 'pointercancel', 100, 140);
    pointer(view.layer, 'pointerdown', 100, 140);
    view.rerender(<PaperInkLayer {...view.props} tool="write" />);
    await act(async () => pointer(view.layer, 'pointerup', 150, 180));
    expect(view.onCreate).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-paper-ink-preview]')).toBeNull();
  });

  it('erases a crossed stroke once using SVG hit geometry, and leaves an empty bbox sweep untouched', async () => {
    const view = specimen();
    const stroke = createPaperFreehand({ frame, canvasId: 'ink-canvas', objectId: 'erasable',
      points: [{ x: 0, y: 0 }, { x: 120, y: 100 }], zIndex: 1 });
    view.rerender(<PaperInkLayer {...view.props} tool="eraser" objects={[stroke.canvasObject]} placements={[stroke.placement]} />);
    const hit = view.container.querySelector<SVGPathElement>('[data-paper-ink-hit]')!;
    // jsdom has no SVG geometry; this models the browser's native stroke query.
    const isPointInStroke = vi.fn((p: { x: number; y: number }) => Math.abs(p.y - p.x * 100 / 120) < 8);
    Object.defineProperties(hit, { getScreenCTM: { value: () => ({ inverse: () => ({}) }) }, isPointInStroke: { value: isPointInStroke } });
    vi.stubGlobal('DOMPoint', class { constructor(public x: number, public y: number) {} matrixTransform() { return { x: (this.x - 50) * 2, y: (this.y - 90) * 2 }; } });
    pointer(view.layer, 'pointerdown', 55, 135);
    await act(async () => pointer(view.layer, 'pointerup', 65, 135));
    expect(isPointInStroke).toHaveBeenCalled();
    expect(view.onDelete).not.toHaveBeenCalled();
    pointer(view.layer, 'pointerdown', 90, 95);
    pointer(view.layer, 'pointermove', 90, 150);
    await act(async () => pointer(view.layer, 'pointerup', 90, 160));
    expect(view.onDelete).toHaveBeenCalledExactlyOnceWith('erasable');
    expect(view.onCreate).not.toHaveBeenCalled();
  });

  it('shows a save failure and permits the next stroke', async () => {
    const view = specimen();
    view.onCreate.mockResolvedValueOnce(false);
    pointer(view.layer, 'pointerdown', 100, 140);
    await act(async () => pointer(view.layer, 'pointerup', 150, 180));
    expect(view.getByRole('alert').textContent).toContain('could not be saved');
    pointer(view.layer, 'pointerdown', 100, 140);
    await act(async () => pointer(view.layer, 'pointerup', 150, 180));
    expect(view.onCreate).toHaveBeenCalledTimes(2);
    expect(view.queryByRole('alert')).toBeNull();
  });
});
