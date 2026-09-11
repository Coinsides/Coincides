import React from 'react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from '../../../client/node_modules/vitest/dist/index.js';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyCanvasLayoutsToBlocks } from '../../../client/src/pages/Notes/canvasEngine/canvasObjectRepository';
import { buildNoteCanvasRuntimeModel } from '../../../client/src/pages/Notes/canvasEngine/engineModel';
import { useNoteCanvasResolvedLayoutModel } from '../../../client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel';
import { createSurfaceModePolicy } from '../../../client/src/pages/Notes/canvasEngine/modePolicyService';
import { buildRuntimeBlockPlacement } from '../../../client/src/pages/Notes/canvasEngine/placementService';
import { createPageStackFromFrame } from '../../../client/src/pages/Notes/canvasEngine/pageStackCollectionService';
import { normalizePageFramePrintBaseline } from '../../../client/src/pages/Notes/canvasEngine/pageFramePrintScaleService';
import { getPagePrintGeometry } from '../../../client/src/pages/Notes/canvasEngine/pagePrintProjectionService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from '../../../client/src/pages/Notes/canvasEngine/typographyProfileService';
import { NotePrintLayer } from '../../../client/src/pages/Notes/canvasEngine/layers/NotePrintLayer';
import { NoteOverviewLayer } from '../../../client/src/pages/Notes/canvasEngine/layers/NoteOverviewLayer';
import type { NoteBlock } from '../../../client/src/pages/Notes/canvasEngine/runtimeDataTypes';
import type { BlockBoxLayout } from '../../../client/src/pages/Notes/canvasEngine/runtimeLayout';
import type { PageFrameModel } from '../../../client/src/pages/Notes/canvasEngine/types';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('D1 smoke 5: real print and overview reuse live inset-derived page projections without writing storage', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  const initialFrame: PageFrameModel = {
    id: 'print-overview-frame', role: 'primary_page_frame', pageSize: 'A4',
    templateId: 'a4_portrait', exportable: true, x: 100, y: 200, width: 904, height: 1278,
    contentInset: { top: 0, bottom: 96, left: 72, right: 72 },
  };
  const afterFrame = { ...initialFrame, contentInset: { ...initialFrame.contentInset, left: 24, right: 232 } };
  const blocks: NoteBlock[] = ['auto', 'manual'].map((id, index) => ({
    id, placement_id: `${id}-placement`, block_type: 'paragraph', title: null,
    content_json: { body: `Synthetic ${id} print overview text` }, plain_text: `Synthetic ${id} print overview text`,
    metadata: {}, order_index: index, source_references: [], display_overrides_json: {}, canvas_layout: null,
  }));
  const rows = blocks.map((block, index) => ({
    block_id: block.id, placement_id: block.placement_id!,
    layout: {
      x: index ? 100 : 0, y: index ? 180 : 40, width: index ? 500 : 760, height: 100,
      coordinate_space: 'page_frame_local', frame_id: initialFrame.id, surface: 'formal_page', boundary_role: 'inside',
      ...(index ? { width_mode: 'manual' } : {}),
    } as BlockBoxLayout,
  }));
  const storedBefore = JSON.stringify(rows);
  const cases: Record<string, unknown>[] = [];

  for (const frame of [initialFrame, afterFrame]) {
    const span = frame.width - frame.contentInset.left - frame.contentInset.right;
    const stack = createPageStackFromFrame(frame, { id: 'print-overview-stack' });
    const collection = { pageFrames: [frame], pageStacks: [stack], primaryFrameId: frame.id, primaryStackId: stack.id };
    const hydrated = applyCanvasLayoutsToBlocks(blocks, rows, { coordinateContract: 'v2', pageFrameCollection: collection });
    const mounted = renderHook(() => useNoteCanvasResolvedLayoutModel({
      coordinateContract: 'v2', contentWidth: span,
      documentTypographyProfile: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
      layoutDrafts: {}, sortedBlocks: hydrated, pageFrames: [frame],
      surfaceMode: 'page', surfacePolicy: createSurfaceModePolicy('page'),
    }));
    const layouts = mounted.result.current.blockLayouts;
    expect(layouts.auto.width).toBe(span);
    expect(layouts.manual).toMatchObject({ x: 100, width: 500 });
    const placements = hydrated.map((block, index) => buildRuntimeBlockPlacement({
      block, canvasId: 'print-overview-canvas', layout: layouts[block.id], pageOffsetX: 0,
      pageFrame: frame, pageFrames: [frame], contract: 'v2', zIndex: index,
    }));
    const runtime = buildNoteCanvasRuntimeModel({
      mode: 'page', primaryPageFrame: frame, pageFrames: [frame], pageStacks: [stack],
      viewport: { x: 0, y: 0, width: 1024, height: 768, zoom: 1 },
      blockPlacements: placements, documentTypography: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
    });
    const input = {
      noteId: 'print-overview-note', surfaceMode: 'page' as const, noteCanvasRuntime: runtime,
      visibleBlocks: hydrated, blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {},
      anchorsBySourceRef: {}, documentTypographyProfile: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
    };
    render(<NotePrintLayer {...input} />);
    render(<NoteOverviewLayer writingSurfaceProps={{ ...input, selectedPageFrameId: frame.id }} onSelectPage={() => undefined} onClose={() => undefined} />);
    act(() => window.dispatchEvent(new Event('beforeprint')));
    const printRoot = document.querySelector<HTMLElement>('[data-note-print-root]')!;
    const overviewCanvas = document.querySelector<HTMLElement>('[data-note-overview-canvas]')!;
    expect(printRoot).not.toBeNull();
    expect(overviewCanvas).not.toBeNull();
    const projections: Record<string, unknown> = {};
    for (const [kind, root] of [['print', printRoot], ['overview', overviewCanvas]] as const) {
      const fragments = Array.from(root.querySelectorAll<HTMLElement>('[data-note-readonly-fragment]'));
      expect(fragments).toHaveLength(2);
      projections[kind] = fragments.map((fragment) => {
        const manual = fragment.dataset.blockId === 'manual';
        const article = fragment.querySelector<HTMLElement>('article[data-note-block-shell]')!;
        expect(fragment.style.left).toBe(`${frame.contentInset.left + (manual ? 100 : 0)}px`);
        expect(fragment.style.top).toBe(`${manual ? 180 : 40}px`);
        expect(fragment.style.width).toBe(`${manual ? 500 : span}px`);
        expect(article.style.left).toBe('0px');
        expect(article.style.top).toBe('0px');
        expect(article.querySelector('textarea')?.value).toContain(manual ? 'manual' : 'auto');
        expect(article.querySelector('textarea')?.readOnly).toBe(true);
        return { blockId: fragment.dataset.blockId, left: fragment.style.left, top: fragment.style.top,
          width: fragment.style.width, articleLeft: article.style.left, articleTop: article.style.top };
      });
      expect(root.querySelector('[data-page-frame-wall]')).toBeNull();
      // The shared read-only renderer may retain gutter DOM; its real stylesheet
      // hides every such tool, rather than giving print/overview an editing UI.
      const gutterDisplays = Array.from(root.querySelectorAll<HTMLElement>('[aria-label="Text unit tools"]'))
        .map((gutter) => getComputedStyle(gutter).display);
      expect(gutterDisplays.every((display) => display === 'none')).toBe(true);
      projections[`${kind}Controls`] = { wallCount: 0, gutterDomCount: gutterDisplays.length, gutterDisplays };
    }
    const page = printRoot.querySelector<HTMLElement>('[data-note-print-page]')!;
    expect(Number(page.dataset.printScale)).toBeCloseTo(getPagePrintGeometry(initialFrame).scale, 12);
    expect(overviewCanvas.style.transform).toBe(`scale(${160 / 904})`);
    cases.push({ inset: frame.contentInset, span, layouts, placements, projections,
      printScale: Number(page.dataset.printScale), overviewScale: overviewCanvas.style.transform });
    act(() => window.dispatchEvent(new Event('afterprint')));
    mounted.unmount();
    cleanup();
  }
  const historical = normalizePageFramePrintBaseline({ ...afterFrame, pageSize: undefined });
  expect(historical.contentInset).toEqual(afterFrame.contentInset);
  expect(JSON.stringify(rows)).toBe(storedBefore);
  writeFileSync(resolve(process.cwd(), '../docs/audits/2026-09-11-d1-builder/result-3-print-overview.json'), `${JSON.stringify({
    smoke: 5, status: 'PASS', environment: 'Synthetic rows + jsdom; real hydrate, live page-layout hook, runtime, NotePrintLayer, NoteOverviewLayer and NoteReadOnlyPageContent',
    cases, historicalInset: historical.contentInset, storedRows: rows, storedBytesUnchanged: true,
    limitations: ['DOM/style assertions are not screenshot or physical pixel measurement.', 'No OS print dialog, printer, application API or real database was used.', 'Generic objects retain existing read-only projection exclusions; this smoke covers auto/manual text blocks.'],
  }, null, 2)}\n`);
});
