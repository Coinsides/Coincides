import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildNoteCanvasRuntimeModel } from '../engineModel';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { CanvasObject, CanvasPlacement, PageFrameModel } from '../types';
import { NoteOverviewLayer } from './NoteOverviewLayer';
import { NotePrintLayer, type NotePrintInput } from './NotePrintLayer';
import { PaperInkSvg } from './PaperInkSvg';

const INK = '[data-paper-ink-id]';
const PATH = 'M 0 0 L 120 80';

function page(id: string, x: number, y: number): PageFrameModel {
  return {
    id, role: id === 'first' ? 'primary_page_frame' : 'secondary_page_frame',
    templateId: 'a4_portrait', pageSize: 'A4', exportable: true,
    x, y, width: 904, height: 1278,
    contentInset: { left: 72, right: 72, top: 48, bottom: 96 },
  };
}

function ink(id: string, overrides: Partial<CanvasObject> = {}): CanvasObject {
  return {
    objectId: id, canvasId: 'ink-canvas', kind: 'freehand', backing: 'none',
    objectClass: 'pure', status: 'active',
    metadata: { freehand: { path: PATH, style: { color_token: 'ink', width: 2.5 } } },
    ...overrides,
  };
}

function placement(id: string, frame: PageFrameModel, overrides: Partial<CanvasPlacement> = {}): CanvasPlacement {
  return {
    placementId: `placement-${id}`, objectId: id, canvasId: 'ink-canvas', frameId: frame.id,
    surface: 'formal_page', boundaryRole: 'inside', rotation: 0, zIndex: 4,
    x: frame.x + 40, y: frame.y + 50, width: 120, height: 80,
    renderVisibility: 'visible', visibilityState: 'normal', ...overrides,
  };
}

function inputFor(frames: PageFrameModel[], objects: CanvasObject[], placements: CanvasPlacement[]): NotePrintInput {
  const stack = createPageStackFromFrame(frames[0], { id: 'ink-stack' });
  stack.frameIds = frames.map((frame) => frame.id);
  const documentTypographyProfile = createDefaultDocumentTypographyProfile();
  return {
    surfaceMode: 'page', noteId: 'synthetic-ink-note', visibleBlocks: [],
    blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {}, anchorsBySourceRef: {},
    documentTypographyProfile,
    noteCanvasRuntime: buildNoteCanvasRuntimeModel({
      mode: 'page', primaryPageFrame: frames[0], pageFrames: frames, pageStacks: [stack],
      viewport: { x: 0, y: 0, width: 1000, height: 800, zoom: 1.8 },
      blockPlacements: [], genericCanvasObjects: objects, genericCanvasPlacements: placements,
      documentTypography: documentTypographyProfile,
    }),
  };
}

function printEvent(type: 'beforeprint' | 'afterprint') {
  act(() => window.dispatchEvent(new Event(type)));
}

function geometry(path: Element) {
  return ['d', 'transform', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill']
    .map((attribute) => path.getAttribute(attribute));
}

afterEach(() => {
  printEvent('afterprint');
  cleanup();
  vi.unstubAllGlobals();
});

describe('C4 paper ink print and overview projection', () => {
  it('keeps ink on its owning page and uses identical path geometry in writing, print and overview', () => {
    const frames = [page('first', 100, 200), page('second', 1100, 1650)];
    const objects = [ink('stroke-on-second')];
    const placements = [placement(objects[0].objectId, frames[1])];
    const input = inputFor(frames, objects, placements);
    const before = JSON.stringify(input);
    const onSelectPage = vi.fn();
    const onClose = vi.fn();
    const { container } = render(<>
      <div data-writing-ink="true">
        {frames.map((frame) => <PaperInkSvg key={frame.id} frame={frame} objects={objects} placements={placements} />)}
      </div>
      <NoteOverviewLayer writingSurfaceProps={{ ...input, selectedPageFrameId: frames[1].id }}
        onSelectPage={onSelectPage} onClose={onClose} />
      <NotePrintLayer {...input} />
    </>);
    printEvent('beforeprint');

    const writing = container.querySelector(`[data-writing-ink] ${INK}`)!;
    const overview = container.querySelector(`[data-note-overview] ${INK}`)!;
    const printed = document.querySelector(`[data-note-print-root] ${INK}`)!;
    expect(geometry(writing)).toEqual([
      PATH, 'translate(40 50) rotate(0 60 40)', 'var(--sk-ink, var(--board-ink, var(--text-primary, #374151)))', '2.5', 'round', 'round', 'none',
    ]);
    expect(geometry(overview)).toEqual(geometry(writing));
    expect(geometry(printed)).toEqual(geometry(writing));
    for (const path of [writing, overview, printed]) {
      const svg = path.closest('svg')!;
      expect(svg.getAttribute('data-page-frame-id')).toBe('second');
      expect(svg.getAttribute('viewBox')).toBe('0 0 904 1278');
      expect(svg.style.pointerEvents).toBe('none');
      expect(svg.style.overflow).toBe('hidden');
      expect(svg.style.zIndex).toBe('4');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
    expect(document.querySelector('[data-note-print-page][data-page-frame-id="first"]')!.querySelector(INK)).toBeNull();
    expect(container.querySelectorAll(`[data-note-overview] ${INK}`)).toHaveLength(1);
    expect(document.querySelectorAll(`[data-note-print-root] ${INK}`)).toHaveLength(1);
    expect(JSON.stringify(input)).toBe(before);
    expect(onSelectPage).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('retains export-hidden ink on screen, excludes it only in print, and never projects tray or hidden strokes', () => {
    const frame = page('first', 100, 200);
    const ids = ['normal', 'export-hidden', 'tray', 'hidden', 'collapsed', 'archived', 'other-page'];
    const objects = ids.map((id) => ink(id, id === 'archived' ? { status: 'archived' } : {}));
    const placements = ids.map((id) => placement(id, frame, {
      ...(id === 'export-hidden' ? { visibilityState: 'export_hidden' } : {}),
      ...(id === 'tray' ? { surface: 'tray' } : {}),
      ...(id === 'hidden' ? { renderVisibility: 'hidden' } : {}),
      ...(id === 'collapsed' ? { renderVisibility: 'collapsed' } : {}),
      ...(id === 'other-page' ? { frameId: 'other' } : {}),
    }));
    const { container, rerender } = render(<PaperInkSvg frame={frame} objects={objects} placements={placements} />);
    const renderedIds = () => Array.from(container.querySelectorAll(INK), (path) => path.getAttribute('data-paper-ink-id'));
    expect(renderedIds()).toEqual(['normal', 'export-hidden']);
    rerender(<PaperInkSvg frame={frame} objects={objects} placements={placements} print />);
    expect(renderedIds()).toEqual(['normal']);
  });

  it('freezes ink for the current print job and drops an erased stroke on the next print job', () => {
    const frame = page('first', 100, 200);
    const input = inputFor([frame], [ink('erase-later')], [placement('erase-later', frame)]);
    const { rerender } = render(<NotePrintLayer {...input} />);
    printEvent('beforeprint');
    expect(document.querySelectorAll(`[data-note-print-root] ${INK}`)).toHaveLength(1);
    rerender(<NotePrintLayer {...inputFor([frame], [], [])} />);
    expect(document.querySelectorAll(`[data-note-print-root] ${INK}`)).toHaveLength(1);
    printEvent('afterprint');
    printEvent('beforeprint');
    expect(document.querySelectorAll(`[data-note-print-root] ${INK}`)).toHaveLength(0);
  });

  it('exposes widened SVG hit geometry only when the writing eraser requests it', () => {
    const frame = page('first', 100, 200);
    const objects = [ink('erase-me')];
    const placements = [placement('erase-me', frame, { rotation: 15 })];
    const { container, rerender } = render(<PaperInkSvg frame={frame} objects={objects} placements={placements} hitTest />);
    const visible = container.querySelector(INK)!;
    const hit = container.querySelector('[data-paper-ink-hit]')!;
    expect(hit.getAttribute('d')).toBe(visible.getAttribute('d'));
    expect(hit.getAttribute('transform')).toBe('translate(40 50) rotate(15 60 40)');
    expect(hit.getAttribute('stroke')).toBe('transparent');
    expect(hit.getAttribute('stroke-width')).toBe('16');
    expect(hit.getAttribute('pointer-events')).toBe('none');
    rerender(<PaperInkSvg frame={frame} objects={objects} placements={placements} hitTest print />);
    expect(container.querySelector(INK)).not.toBeNull();
    expect(container.querySelector('[data-paper-ink-hit]')).toBeNull();
  });
});
