import { act, fireEvent, render } from '@testing-library/react';
import { useCallback, useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createSurfaceModePolicy } from '../modePolicyService';
import { createPageFramePrintProfile } from '../pageFramePrintScaleService';
import type { PageReadingGear } from '../pageReadingViewportService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { SurfaceMode } from '../runtimeLayout';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { CanvasViewport, PageFrameCollectionModel, PageFrameModel } from '../types';
import { useCanvasContentWidth } from './useCanvasContentWidth';
import { useNoteCanvasFrameModel, useNoteCanvasResolvedLayoutModel } from './useNoteCanvasLayoutModel';
import { usePageReadingPresentation } from './usePageReadingPresentation';
import { usePageReadingViewportController } from './usePageReadingViewportController';

function freezeTree<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeTree);
    Object.freeze(value);
  }
  return value;
}

const printProfile = createPageFramePrintProfile('A4');
const typography = createDefaultDocumentTypographyProfile();
const noDrafts = {};
const canvasViewport: CanvasViewport = { x: 32, y: 48, width: 1000, height: 800, zoom: 1.25 };

function specimen(paperHeight = printProfile.height) {
  const pageFrame: PageFrameModel = {
    id: 'reading-test-frame', role: 'primary_page_frame', exportable: true,
    x: -72, y: 0, width: printProfile.width, height: paperHeight,
    contentInset: printProfile.contentInset, pageSize: 'A4', templateId: 'a4_portrait',
  };
  const blocks: NoteBlock[] = [
    { id: 'reading-block-a', x: 40, y: 120, width: 320, height: 100 },
    { id: 'reading-block-b', x: 120, y: 340, width: 420, height: 120 },
  ].map(({ id, ...geometry }, order_index) => ({
    id, placement_id: `placement-${id}`, display_overrides_json: {},
    canvas_layout: {
      ...geometry,
      surface: 'formal_page', coordinate_space: 'page_frame_local', frame_id: pageFrame.id,
      boundary_role: 'inside', width_mode: 'manual',
    },
    block_type: 'text', title: null, content_json: { body: 'Reading fixture' },
    plain_text: 'Reading fixture', metadata: {}, order_index, source_references: [],
  }));
  const collection: PageFrameCollectionModel = { pageFrames: [pageFrame], primaryFrameId: pageFrame.id };
  return freezeTree({ blocks, collection });
}

/**
 * jsdom supplies no layout: these DOM getters derive screen boxes from the actual
 * rendered width and transform. All state, measurement and layout hooks are real.
 */
function ReadingHarness({
  data, mode = 'page', scrollTo, blockLeft = 300, blockTop = 180, appTop = 60, surfaceTop = 60, surfaceWidth = 680,
}: {
  data: ReturnType<typeof specimen>;
  mode?: SurfaceMode;
  scrollTo: ReturnType<typeof vi.fn>;
  blockLeft?: number;
  blockTop?: number;
  appTop?: number;
  surfaceTop?: number;
  surfaceWidth?: number;
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const blockListRef = useRef<HTMLDivElement | null>(null);
  const [pageViewport, setPageViewport] = useState<CanvasViewport>();
  const policy = createSurfaceModePolicy(mode);
  const controller = usePageReadingViewportController({ noteId: 'reading-note' });
  const contentWidth = useCanvasContentWidth({ containerRef: blockListRef, pageOffsetX: policy.pageOffsetX, surfaceMode: mode });
  const resolved = useNoteCanvasResolvedLayoutModel({
    contentWidth, documentTypographyProfile: typography, layoutDrafts: noDrafts,
    sortedBlocks: data.blocks, pageFrames: data.collection.pageFrames, surfaceMode: mode, surfacePolicy: policy,
  });
  const frame = useNoteCanvasFrameModel({
    ...resolved, documentTypographyProfile: typography, draftActive: false, draftLayout: null,
    pageFrameCollection: data.collection, persistedCanvasObjects: [], persistedCanvasPlacements: [],
    persistedContentMounts: [], persistedVisualConnectors: [], persistedImageObjects: [], persistedStructuredObjects: [],
    pageOffsetX: policy.pageOffsetX, surfaceMode: mode, viewportTransform: canvasViewport, pageReadingViewport: pageViewport,
  });
  const publishViewport = useCallback((next: CanvasViewport) => setPageViewport((current) => (
    current && current.x === next.x && current.y === next.y && current.zoom === next.zoom
      && current.width === next.width && current.height === next.height ? current : next
  )), []);
  const reading = usePageReadingPresentation({
    enabled: mode === 'page', noteId: 'reading-note', surfaceRef, blockListRef,
    pageFrame: frame.primaryPageFrame, pageContentHeight: frame.pageContentHeight,
    viewState: controller.pageReadingViewState, onViewportChange: publishViewport,
  });
  const mountAppMain = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    Object.defineProperties(node, { clientWidth: { configurable: true, value: 1000 }, clientHeight: { configurable: true, value: 800 } });
    node.getBoundingClientRect = () => new DOMRect(200, Number(node.dataset.appTop), 1000, 800);
    node.scrollTo = scrollTo;
  }, [scrollTo]);
  const mountSurface = useCallback((node: HTMLDivElement | null) => {
    surfaceRef.current = node;
    if (!node) return;
    Object.defineProperty(node, 'clientWidth', { configurable: true, get: () => Number.parseFloat(node.style.width) });
    node.getBoundingClientRect = () => new DOMRect(200,
      Number(node.dataset.surfaceTop) - (node.closest<HTMLElement>('main')?.scrollTop || 0),
      node.clientWidth, 1300);
  }, []);
  const mountBlockList = useCallback((node: HTMLDivElement | null) => {
    blockListRef.current = node;
    if (!node) return;
    Object.defineProperty(node, 'clientWidth', { configurable: true, get: () => Number.parseFloat(node.style.width) });
    node.getBoundingClientRect = () => {
      const wrapper = node.closest<HTMLElement>('[data-page-display-scale]');
      const scale = wrapper ? Number(wrapper.dataset.pageDisplayScale) : canvasViewport.zoom;
      return new DOMRect(Number(node.dataset.blockLeft),
        Number(node.dataset.blockTop) - (node.closest<HTMLElement>('main')?.scrollTop || 0),
        node.clientWidth * scale, 1300 * scale);
    };
  }, []);

  return <main ref={mountAppMain} data-app-main-scroll="true" data-app-top={appTop}>
    {(['fit_width', 'physical', 'fit_page'] as PageReadingGear[]).map((gear) => (
      <button key={gear} onClick={() => controller.setPageReadingGear(gear)}>{gear}</button>
    ))}
    <div ref={mountSurface} data-testid="surface" data-surface-top={surfaceTop} style={{ width: surfaceWidth }}>
      <div data-testid="paper-space" style={mode === 'page' ? { width: reading.paperWidth * reading.displayScale, height: reading.paperHeight * reading.displayScale } : { display: 'contents' }}>
        <div data-testid="paper" data-page-display-scale={mode === 'page' ? reading.displayScale : undefined}
          data-effective-gear={reading.effectiveGear}
          style={mode === 'page' ? { width: reading.paperWidth, height: reading.paperHeight, transform: `scale(${reading.displayScale})` } : { display: 'contents' }}>
          <div ref={mountBlockList} data-testid="block-list"
            data-block-left={blockLeft} data-block-top={blockTop}
            data-content-width={contentWidth}
            data-layouts={JSON.stringify(resolved.blockLayouts)}
            data-runtime-placements={JSON.stringify(frame.noteCanvasRuntime.blockPlacements)}
            data-runtime-viewport={JSON.stringify(frame.noteCanvasRuntime.viewport)}
            style={{
              width: mode === 'page' ? reading.layoutWidth : 760 + policy.pageOffsetX,
              transform: mode === 'canvas' ? 'translate(-40px, -60px) scale(1.25)' : undefined,
            }}>
            {resolved.visibleBlocks.map((block) => <article key={block.id}>{block.plain_text}</article>)}
          </div>
        </div>
      </div>
    </div>
  </main>;
}

describe('K-reading-gears: presentation → clientWidth → resolved layout → runtime', () => {
  it('settles repeated sidebar width changes in every gear without mutating block geometry', () => {
    const data = specimen();
    const scrollTo = vi.fn();
    const subject = render(<ReadingHarness data={data} scrollTo={scrollTo} surfaceWidth={980} />);
    const list = subject.getByTestId('block-list');
    const layouts = list.dataset.layouts;
    for (const gear of ['fit_width', 'fit_page', 'physical']) {
      fireEvent.click(subject.getByRole('button', { name: gear }));
      for (const width of [724, 980, 724, 980]) {
        subject.rerender(<ReadingHarness data={data} scrollTo={scrollTo} surfaceWidth={width} blockLeft={width / 2} />);
        expect(list.dataset.layouts).toBe(layouts);
        expect(subject.getByTestId('paper').dataset.effectiveGear).toBe(gear);
        expect(JSON.parse(list.dataset.runtimeViewport || '{}').zoom)
          .toBe(Number(subject.getByTestId('paper').dataset.pageDisplayScale));
      }
    }
  });
  it('changes outer transform across all gears while preserving measured layout width and every local block geometry', () => {
    const data = specimen();
    const inputBytes = JSON.stringify(data);
    const subject = render(<ReadingHarness data={data} scrollTo={vi.fn()} />);
    const list = subject.getByTestId('block-list');
    const paper = subject.getByTestId('paper');
    const space = subject.getByTestId('paper-space');
    const initialLayouts = list.dataset.layouts;
    const initialPlacements = list.dataset.runtimePlacements;
    const transforms = new Set<string>();
    const screenWidths = new Set<number>();

    for (const gear of ['fit_width', 'physical', 'fit_page']) {
      fireEvent.click(subject.getByRole('button', { name: gear }));
      // Re-run the real DOM width measurement after the transform changes.
      act(() => window.dispatchEvent(new Event('resize')));
      const scale = Number(paper.dataset.pageDisplayScale);
      const runtime = JSON.parse(list.dataset.runtimeViewport || '{}') as CanvasViewport;
      transforms.add(paper.style.transform);
      screenWidths.add(list.getBoundingClientRect().width);
      expect(runtime.zoom).toBe(scale);
      expect(list.clientWidth).toBe(760);
      expect(list.dataset.contentWidth).toBe('760');
      expect(list.dataset.layouts).toBe(initialLayouts);
      expect(list.dataset.runtimePlacements).toBe(initialPlacements);
      expect(Number.parseFloat(space.style.height)).toBeCloseTo(printProfile.height * scale);
      const layouts = JSON.parse(list.dataset.layouts || '{}');
      expect(Object.keys(layouts)).toHaveLength(2);
      for (const block of data.blocks) {
        expect(layouts[block.id]).toMatchObject(block.canvas_layout!);
        expect(layouts[block.id].coordinate_space).toBe('page_frame_local');
      }
      expect(JSON.stringify(data)).toBe(inputBytes);
    }
    expect(transforms.size).toBe(3);
    expect(screenWidths.size).toBe(3);
  });

  it('leaves canvas viewport, transform and all block geometry unchanged when page gear state changes', () => {
    const subject = render(<ReadingHarness data={specimen()} mode="canvas" scrollTo={vi.fn()} />);
    const list = subject.getByTestId('block-list');
    const before = { layouts: list.dataset.layouts, placements: list.dataset.runtimePlacements, viewport: list.dataset.runtimeViewport, transform: list.style.transform, contentWidth: list.dataset.contentWidth };
    for (const gear of ['physical', 'fit_page', 'fit_width']) {
      fireEvent.click(subject.getByRole('button', { name: gear }));
      act(() => window.dispatchEvent(new Event('resize')));
      expect({ layouts: list.dataset.layouts, placements: list.dataset.runtimePlacements, viewport: list.dataset.runtimeViewport, transform: list.style.transform, contentWidth: list.dataset.contentWidth }).toEqual(before);
      expect(JSON.parse(list.dataset.runtimeViewport || '{}').zoom).toBe(1.25);
      expect(subject.getByTestId('paper').dataset.pageDisplayScale).toBeUndefined();
    }
  });

  it('excludes note chrome from fit_page, keeps fit stable while scrolling, and tracks same-size DOM origin shifts', () => {
    const data = specimen();
    const scrollTo = vi.fn();
    const subject = render(<ReadingHarness data={data} scrollTo={scrollTo} appTop={40} surfaceTop={140} />);
    const list = subject.getByTestId('block-list');
    const paper = subject.getByTestId('paper');
    fireEvent.click(subject.getByRole('button', { name: 'fit_page' }));
    // 800px app height - 100px note chrome - 64px control space.
    const initialScale = Number(paper.dataset.pageDisplayScale);
    expect(initialScale).toBe(636 / printProfile.height);
    const initialViewport = JSON.parse(list.dataset.runtimeViewport || '{}') as CanvasViewport;
    const initialLayouts = list.dataset.layouts;

    // No resize or scroll event accompanies this DOM position change.
    subject.rerender(<ReadingHarness data={data} scrollTo={scrollTo} blockLeft={384} blockTop={124} appTop={40} surfaceTop={140} />);

    const shiftedViewport = JSON.parse(list.dataset.runtimeViewport || '{}') as CanvasViewport;
    expect(shiftedViewport.x).toBeCloseTo(initialViewport.x - 84 / initialViewport.zoom);
    expect(shiftedViewport.y).toBeCloseTo(initialViewport.y + 56 / initialViewport.zoom);
    expect(shiftedViewport.zoom).toBe(initialViewport.zoom);
    expect(shiftedViewport.width).toBe(initialViewport.width);
    expect(shiftedViewport.height).toBe(initialViewport.height);
    expect(list.clientWidth).toBe(760);
    expect(list.dataset.layouts).toBe(initialLayouts);

    const appMain = list.closest<HTMLElement>('main')!;
    appMain.scrollTop = 240;
    fireEvent.scroll(appMain);
    expect(subject.getByTestId('surface').getBoundingClientRect().top).toBe(-100);
    expect(Number(paper.dataset.pageDisplayScale)).toBe(initialScale);
    const scrolledViewport = JSON.parse(list.dataset.runtimeViewport || '{}') as CanvasViewport;
    expect(scrolledViewport.y).toBeCloseTo(shiftedViewport.y + 240 / initialScale);
    act(() => window.dispatchEvent(new Event('resize')));
    expect(Number(paper.dataset.pageDisplayScale)).toBe(initialScale);
    expect(list.dataset.layouts).toBe(initialLayouts);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('degrades a long-page fit_page selection to fit_width and scrolls the app container to the top once', () => {
    const scrollTo = vi.fn();
    const data = specimen(4000);
    const subject = render(<ReadingHarness data={data} scrollTo={scrollTo} />);
    const paper = subject.getByTestId('paper');
    const list = subject.getByTestId('block-list');
    const fitWidthTransform = paper.style.transform;
    const beforeLayouts = list.dataset.layouts;

    fireEvent.click(subject.getByRole('button', { name: 'fit_page' }));
    expect(paper.dataset.effectiveGear).toBe('fit_width');
    expect(paper.style.transform).toBe(fitWidthTransform);
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0, behavior: 'auto' });
    act(() => window.dispatchEvent(new Event('resize')));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(list.dataset.layouts).toBe(beforeLayouts);
  });
});
