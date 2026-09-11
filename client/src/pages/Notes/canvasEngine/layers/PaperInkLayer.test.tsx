import { useState } from 'react';
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
    view.rerender(<PaperInkLayer {...view.props} tool="selection" />);
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
    Object.defineProperties(hit, { getScreenCTM: { value: () => ({ a: 0.5, b: 0, inverse: () => ({}) }) }, isPointInStroke: { value: isPointInStroke } });
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

function selectionSpecimen() {
  const strokes = ['lower', 'upper'].map((objectId, zIndex) => createPaperFreehand({ frame,
    canvasId: 'ink-canvas', objectId, points: [{ x: 100, y: 100 }, { x: 200, y: 100 }], zIndex }));
  const onCreate = vi.fn(async () => true);
  const onDelete = vi.fn(async () => true);
  const blankDown = vi.fn();
  function Subject({ enabled = true, tool = 'selection' as 'selection' | 'pen' | 'eraser' }) {
    const [selected, setSelected] = useState<string | null>(null);
    return <div role="dialog"><section data-text-unit-move-scope="selection-test" onMouseDown={blankDown}>
      <PaperInkLayer frame={frame} displayFrame={frame} canvasId="ink-canvas" tool={tool} enabled={enabled}
        objects={strokes.map(s => s.canvasObject)} placements={strokes.map(s => s.placement)}
        selectedObjectId={selected} onSelect={setSelected} onCreate={onCreate} onDelete={onDelete} />
      <article data-note-block-shell="true"><textarea aria-label="Existing text" /></article>
      <article data-note-block-shell="true"><img alt="Existing media" /></article>
    </section></div>;
  }
  const view = render(<Subject />);
  const layer = view.container.querySelector<HTMLElement>('[data-paper-ink-layer]')!;
  const surface = view.container.querySelector('section')!;
  vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue({ left: 50, top: 90, right: 447, bottom: 651.5,
    width: 397, height: 561.5 } as DOMRect);
  vi.stubGlobal('DOMPoint', class { constructor(public x: number, public y: number) {} matrixTransform() { return { x: this.x, y: this.y }; } });
  const geometry = vi.fn((p: { x: number; y: number }) => p.x >= 100 && p.x <= 150 && Math.abs(p.y - 140) <= 8);
  view.container.querySelectorAll('[data-paper-ink-hit]').forEach(hit => Object.defineProperties(hit, {
    getScreenCTM: { value: () => ({ a: 0.5, b: 0, inverse: () => ({}) }) }, isPointInStroke: { value: geometry },
  }));
  return { ...view, layer, surface, strokes, Subject, onCreate, onDelete, blankDown, geometry };
}

describe('E3 selection gestures', () => {
  it('selects only the topmost stroke within tolerance, without writing or saving a click', async () => {
    const view = selectionSpecimen();
    pointer(view.surface, 'pointerdown', 120, 147);
    await act(async () => pointer(view.layer, 'pointerup', 120, 147));
    expect(view.container.querySelectorAll('[data-paper-ink-selected]')).toHaveLength(1);
    expect(view.container.querySelector('[data-paper-ink-selected]')?.getAttribute('data-paper-ink-selected')).toBe('upper');
    expect(view.onCreate).not.toHaveBeenCalled();
    expect(view.blankDown).not.toHaveBeenCalled();
    const hit = view.container.querySelector('[data-paper-ink-hit]')!;
    expect(hit.getAttribute('stroke-width')).toBe('16');
    expect(hit.getAttribute('data-paper-ink-width')).toBe('2.5');
    pointer(view.surface, 'pointerdown', 120, 149);
    expect(view.container.querySelector('[data-paper-ink-selected]')).toBeNull();
    expect(view.layer.style.pointerEvents).toBe('none');
  });

  it('moves only placement at reading scale, includes release, and deletes through the existing verb', async () => {
    const view = selectionSpecimen();
    pointer(view.surface, 'pointerdown', 120, 140);
    pointer(view.layer, 'pointermove', 140, 155);
    expect(view.container.querySelector('[data-paper-ink-selected]')?.getAttribute('transform')).toContain('translate(140 130)');
    await act(async () => pointer(view.layer, 'pointerup', 150, 160));
    expect(view.onCreate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      canvasObject: view.strokes[1].canvasObject,
      placement: { ...view.strokes[1].placement, x: frame.x + 160, y: frame.y + 140 },
    }));
    await act(async () => fireEvent.keyDown(view.layer, { key: 'Delete' }));
    expect(view.onDelete).toHaveBeenCalledExactlyOnceWith('upper');
    expect(view.container.querySelector('[data-paper-ink-selected]')).toBeNull();
  });

  it('cancels drag without a save and leaves text/media clicks and text Delete untouched', async () => {
    const view = selectionSpecimen();
    pointer(view.surface, 'pointerdown', 120, 140);
    pointer(view.layer, 'pointermove', 145, 160);
    fireEvent.keyDown(view.layer, { key: 'Escape' });
    await act(async () => pointer(view.layer, 'pointerup', 145, 160));
    expect(view.onCreate).not.toHaveBeenCalled();
    for (const target of [view.getByRole('textbox'), view.getByRole('img')]) {
      pointer(target, 'pointerdown', 120, 140);
      fireEvent.mouseDown(target);
      expect(view.container.querySelector('[data-paper-ink-selected]')).toBeNull();
    }
    fireEvent.keyDown(view.getByRole('textbox'), { key: 'Delete' });
    expect(view.onDelete).not.toHaveBeenCalled();
    expect(view.blankDown).toHaveBeenCalledTimes(2);
  });

  it('does not select or mutate ink in a disabled surface', async () => {
    const view = selectionSpecimen();
    view.rerender(<view.Subject enabled={false} />);
    pointer(view.surface, 'pointerdown', 120, 140);
    await act(async () => pointer(view.layer, 'pointerup', 160, 160));
    fireEvent.keyDown(view.layer, { key: 'Delete' });
    expect(view.container.querySelector('[data-paper-ink-hit]')).toBeNull();
    expect(view.container.querySelector('[data-paper-ink-selected]')).toBeNull();
    expect(view.onCreate).not.toHaveBeenCalled();
    expect(view.onDelete).not.toHaveBeenCalled();
  });
});

it('E3 drag clamps to the owning sheet and failed moves roll back the preview', async () => {
  const view = selectionSpecimen();
  view.onCreate.mockResolvedValueOnce(false);
  pointer(view.surface, 'pointerdown', 120, 140);
  await act(async () => pointer(view.layer, 'pointerup', 2000, -2000));
  expect(view.onCreate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    placement: expect.objectContaining({ x: frame.x + frame.width - 100, y: frame.y, frameId: frame.id }),
  }));
  expect(view.getByRole('alert').textContent).toContain('could not be moved');
  expect(view.container.querySelector('[data-paper-ink-selected]')?.getAttribute('transform')).toContain('translate(100 100)');
});

it('E3 selection is shared across pages and modifier clicks still replace it', async () => {
  const frames = [frame, { ...frame, id: 'other-page', y: frame.y + frame.height + 30 }];
  const strokes = frames.map((sheet, index) => createPaperFreehand({ frame: sheet, canvasId: 'ink-canvas',
    objectId: 'page-stroke-' + index, points: [{ x: 100, y: 100 }, { x: 200, y: 100 }], zIndex: 1 }));
  function Subject() {
    const [selected, setSelected] = useState<string | null>(null);
    return <section data-text-unit-move-scope="cross-page">{frames.map(sheet => <PaperInkLayer key={sheet.id}
      frame={sheet} displayFrame={sheet} canvasId="ink-canvas" tool="selection"
      objects={strokes.map(s => s.canvasObject)} placements={strokes.map(s => s.placement)}
      selectedObjectId={selected} onSelect={setSelected} onCreate={async () => true} onDelete={async () => true} />)}</section>;
  }
  const view = render(<Subject />);
  const layers = [...view.container.querySelectorAll<HTMLElement>('[data-paper-ink-layer]')];
  layers.forEach((layer, index) => {
    vi.spyOn(layer, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 400, top: index * 600,
      bottom: index * 600 + 560, width: 400, height: 560 } as DOMRect);
    Object.defineProperties(layer.querySelector('[data-paper-ink-hit]')!, {
      getScreenCTM: { value: () => ({ a: 0.5, b: 0, inverse: () => ({}) }) }, isPointInStroke: { value: () => true },
    });
  });
  vi.stubGlobal('DOMPoint', class { matrixTransform() { return { x: 100, y: 100 }; } });
  const surface = view.container.querySelector('section')!;
  for (const index of [0, 1, 0]) {
    const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0,
      clientX: 100, clientY: index * 600 + 100, ctrlKey: true, shiftKey: true });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    fireEvent(surface, event);
    await act(async () => pointer(layers[index], 'pointerup', 100, index * 600 + 100));
    const selected = view.container.querySelectorAll('[data-paper-ink-selected]');
    expect(selected).toHaveLength(1);
    expect(selected[0].getAttribute('data-paper-ink-selected')).toBe('page-stroke-' + index);
  }
});
