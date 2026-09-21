import { act, cleanup, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultNoteBindingSettings } from '../../../../../../shared/types/noteBinding';
import { loadCanvasImageAssetBlobUrl } from '../canvasAssetRepository';
import { resolveDocumentPageFlowPlan } from '../documentPageFlowService';
import { buildExportPreviewModel } from '../exportPreviewService';
import { XINING_REFORMS_TABLE } from '../fixtures/xiningReformsTable';
import { SONG_TIMELINE } from '../fixtures/songTimeline';
import { SONG_REVENUE_CHART } from '../fixtures/songRevenueChart';
import { noteBlocksToPageFlow, pageFlowFragmentProjections } from '../notePageFlowService';
import { getPagePrintFragmentGeometry } from '../pagePrintProjectionService';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import type { NoteCanvasRuntimeModel, PageFrameModel } from '../types';
import { ExportPreviewLayer } from './ExportPreviewLayer';
import { NotePrintLayer, type NotePrintInput } from './NotePrintLayer';
import { NoteReadOnlyPageContent } from './NoteReadOnlyPageContent';
import tableCss from '../blocks/TableBlockProjection.module.css?raw';

// Only transport is substituted: all page planning, boundary, block and portal
// projections below are the production consumers of the same note truth.
vi.mock('../canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn() }));
const load = vi.mocked(loadCanvasImageAssetBlobUrl);
const revoke = vi.fn();
const noOp = () => undefined;

beforeEach(() => {
  load.mockReset().mockImplementation(async (assetId) => `blob:${assetId}`);
  revoke.mockClear();
  vi.stubGlobal('URL', class extends URL { static revokeObjectURL = revoke; });
});
afterEach(async () => {
  await act(async () => cleanup());
  vi.unstubAllGlobals();
});

function fixture(withCover = false, coverExportIncluded = false) {
  const frame: PageFrameModel = { id: 'paper', role: 'primary_page_frame', templateId: 'a4_portrait', pageSize: 'A4',
    x: 0, y: 0, width: 904, height: 1278, contentInset: { left: 72, right: 72, top: 72, bottom: 72 }, exportable: true };
  const layout: BlockBoxLayout = { x: 0, y: 0, width: 760, height: 96, frame_id: frame.id,
    coordinate_space: 'page_frame_local', surface: 'formal_page', width_mode: 'auto' };
  const block = (id: string, type: NoteBlock['block_type'], content: NoteBlock['content_json'], height: number,
    metadata: NoteBlock['metadata'] = {}): NoteBlock => ({
    id, placement_id: `${id}-place`, block_type: type, title: null, plain_text: '', content_json: content,
    metadata, source_references: [], order_index: 0, canvas_layout: { ...layout, height }, display_overrides_json: {},
  });
  const media = (id: string, edit?: object) => block(id, 'media', {}, 200, { media: {
    asset_id: id, naturalWidth: 1200, naturalHeight: 800, alt: id,
    ...(edit ? { edit_v1: edit } : {}),
  } });
  const body = '同源分页正文\n'.repeat(70);
  const blocks = [
    media('plain-image'),
    { ...block('body', 'paragraph', { [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1(body) }, 96), plain_text: body },
    media('cropped-image', { crop: { x: 10, y: 20, w: 50, h: 40 }, zoom: 2, rotation: 90 }),
    media('zoomed-image', { crop: null, zoom: 2, rotation: 90 }),
    block('reforms-table', 'table', { ...XINING_REFORMS_TABLE }, 480),
    block('timeline', 'component', { ...SONG_TIMELINE }, 600),
    block('bar-chart', 'component', { ...SONG_REVENUE_CHART }, 480),
    block('line-chart', 'component', { ...SONG_REVENUE_CHART, component_kind: 'chart_line' }, 480),
    block('unknown-component', 'component', { component_kind: 'future_component', params: {} }, 96),
  ];
  const cover = { ...frame, id: 'cover' };
  if (withCover) blocks.unshift({ ...block('cover-title', 'paragraph',
    { [TEXT_FLOW_CONTENT_KEY]: createTextBlockContentV1('封面标题') }, 96), plain_text: '封面标题',
    canvas_layout: { ...layout, frame_id: cover.id } });
  blocks.forEach((entry, index) => { entry.order_index = index; });
  const layouts = Object.fromEntries(blocks.map((entry) => [entry.id, { ...layout, ...entry.canvas_layout }]));
  const stack = createPageStackFromFrame(frame);
  const collection = { pageFrames: withCover ? [cover, frame] : [frame], primaryFrameId: frame.id, pageStacks: [stack] };
  const typography = createDefaultDocumentTypographyProfile();
  const plan = resolveDocumentPageFlowPlan({ collection, coverFrameId: withCover ? cover.id : undefined,
    blocks: noteBlocksToPageFlow(blocks, layouts, {}, {}), documentTypography: typography });
  const fragments = pageFlowFragmentProjections(plan);
  const input: NotePrintInput = { noteId: 'rich-print', surfaceMode: 'page', visibleBlocks: blocks,
    blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {}, anchorsBySourceRef: {}, documentTypographyProfile: typography,
    noteCanvasRuntime: { pageFlowPlan: plan, pageFrames: plan.collection.pageFrames,
      pageFrameExtensions: withCover ? [{ frameId: cover.id, isCover: true, coverExportIncluded }] : [],
      blockFragmentProjections: fragments, canvasObjects: [], canvasPlacements: [] } as unknown as NoteCanvasRuntimeModel };
  const preview = buildExportPreviewModel(blocks, layouts, { pageFlowPlan: plan,
    pageFrames: plan.collection.pageFrames, pageStacks: plan.collection.pageStacks, primaryPageFrameId: frame.id,
    documentTypography: typography, bindingSettings: { ...createDefaultNoteBindingSettings(),
      coverPage: { frameId: withCover ? cover.id : null, exportIncluded: coverExportIncluded } } });
  return { input, plan, blocks, fragments, preview };
}

function Preview({ preview }: { preview: ReturnType<typeof buildExportPreviewModel> }) {
  return <ExportPreviewLayer preview={preview} showBlockTypes={false} showAIVisibility={false}
    showExportStatus={false} showLabelOverlay={false} onToggleBlockTypes={noOp} onToggleAIVisibility={noOp}
    onToggleExportStatus={noOp} onToggleLabelOverlay={noOp} onClose={noOp} />;
}

function Paper({ data }: { data: ReturnType<typeof fixture> }) {
  return <div data-rich-paper="true">{data.plan.collection.pageFrames.map((frame) =>
    <div key={frame.id} data-rich-paper-frame={frame.id}>
      <NoteReadOnlyPageContent frame={frame} fragments={data.fragments} visibleBlocks={data.blocks}
        blockTextDrafts={{}} blockTextFlowDrafts={{}} blockFieldDrafts={{}} anchorsBySourceRef={{}}
        documentTypography={data.input.documentTypographyProfile} />
    </div>)}</div>;
}

function mediaGeometry(root: ParentNode, asset: string) {
  const image = root.querySelector(`[data-media-block-asset="${asset}"]`)!;
  expect(image).toBeTruthy();
  const source = image.querySelector('image');
  const clip = image.querySelector('clipPath');
  const rect = clip?.querySelector('rect');
  return { tag: image.tagName.toLowerCase(), alt: image.getAttribute('aria-label') ?? image.getAttribute('alt'),
    src: source?.getAttribute('href') ?? image.getAttribute('src'), viewBox: image.getAttribute('viewBox'),
    aspect: image.getAttribute('preserveAspectRatio'), rotation: image.getAttribute('data-media-image-rotation'),
    transform: source?.getAttribute('transform'), width: source?.getAttribute('width'), height: source?.getAttribute('height'),
    clipUnits: clip?.getAttribute('clipPathUnits'), clipRect: rect
      ? ['x', 'y', 'width', 'height'].map((name) => rect.getAttribute(name)).join(' ') : undefined };
}

function chartGeometry(root: ParentNode, kind: 'chart_bar' | 'chart_line') {
  const component = root.querySelector(`[data-component-kind="${kind}"]`)!;
  expect(component).toBeTruthy();
  return { text: component.textContent, viewBox: component.querySelector('svg')?.getAttribute('viewBox'),
    axis: component.querySelector('[data-chart-axis]')?.innerHTML,
    series: Array.from(component.querySelectorAll('[data-chart-series]')).map((entry) => entry.outerHTML),
    legend: component.querySelector('[aria-label="Chart legend"]')?.textContent };
}

function previewFrameForBlock(root: ParentNode, data: ReturnType<typeof fixture>, blockId: string) {
  const frameId = data.fragments.find((fragment) => fragment.blockId === blockId)!.pageFrameId;
  const frames = root.querySelectorAll(`[data-export-preview-page-frame="${frameId}"]`);
  expect(frames).toHaveLength(1);
  return frames[0] as HTMLElement;
}

function expectPreviewGroupCounts(root: ParentNode, data: ReturnType<typeof fixture>) {
  const summaryGroups = [
    ['Crossing PageFrame boundary', data.preview.crossingObjects],
    ['Workspace only', data.preview.workspaceOnlyObjects],
    ['Included in export', data.preview.includedRows],
    ['Excluded / scratch', data.preview.excludedRows],
    ['AI visible', data.preview.aiVisibleRows],
    ['AI hidden', data.preview.aiHiddenRows],
  ] as const;
  const groups = data.preview.pageFrames.map((frame) => ({
    element: root.querySelector(`[data-export-preview-page-frame="${frame.pageFrameId}"]`)!, rows: frame.rows,
  }));
  for (const [label, rows] of summaryGroups) {
    const matches = Array.from(root.querySelectorAll('details'))
      .filter((element) => element.querySelector(':scope > summary > span')?.textContent === label);
    expect(matches).toHaveLength(1);
    groups.push({ element: matches[0], rows });
  }
  // A block intentionally appears in page, export and AI summaries. Check each
  // group's own rows, then the whole overlay: never multiply a global count to
  // conceal a duplicate inside a page or an unexpected additional projection.
  const projections = [
    ['plain-image', '[data-media-block-asset="plain-image"]'],
    ['cropped-image', '[data-media-block-asset="cropped-image"]'],
    ['zoomed-image', '[data-media-block-asset="zoomed-image"]'],
    ['reforms-table', 'table'],
    ['timeline', '[data-component-kind="timeline"]'],
    ['bar-chart', '[data-component-kind="chart_bar"]'],
    ['line-chart', '[data-component-kind="chart_line"]'],
    ['unknown-component', '[data-component-kind="future_component"]'],
  ] as const;
  for (const [blockId, selector] of projections) {
    let total = 0;
    for (const { element, rows } of groups) {
      const count = rows.filter((row) => row.block.id === blockId).length;
      expect(count).toBeLessThanOrEqual(1);
      expect(element.querySelectorAll(selector)).toHaveLength(count);
      total += count;
    }
    expect(root.querySelectorAll(selector)).toHaveLength(total);
  }
}

describe('T5 rich blocks share paper, real print portal and export preview projections', () => {
  it.each([[false, false], [true, false], [true, true]])(
    'renders media edits, the T3 table and all component kinds across unchanged pages (cover=%s, included=%s)',
    async (withCover, coverIncluded) => {
      const data = fixture(withCover, coverIncluded);
      const before = structuredClone({ blocks: data.blocks, plan: data.plan, fragments: data.fragments, preview: data.preview });
      const view = render(<><Paper data={data} /><Preview preview={data.preview} /><NotePrintLayer {...data.input} /></>);
      const paper = view.container.querySelector('[data-rich-paper="true"]')!;
      const preview = view.container.querySelector('[data-note-overlay="export"]')!;
      await waitFor(() => {
        expect(paper.querySelectorAll('[data-media-block-state="loaded"]')).toHaveLength(3);
        expect(preview.querySelectorAll('[data-media-block-state="loading"]')).toHaveLength(0);
        expect(preview.querySelector('[data-media-block-asset="zoomed-image"]')).toBeTruthy();
      });
      expect(document.querySelector('[data-note-print-root="true"]')).toBeNull();
      act(() => window.dispatchEvent(new Event('beforeprint')));
      const print = document.querySelector('[data-note-print-root="true"]') as HTMLElement;
      expect(print).toBeTruthy();
      expect(print.parentElement).toBe(document.body);
      expect(view.container.contains(print)).toBe(false);
      // No asynchronous turn is available to beforeprint: preloaded assets must
      // already render in the synchronously mounted, real print portal.
      expect(print.querySelectorAll('[data-media-block-state="loaded"]')).toHaveLength(3);
      expect(print.querySelector('[data-media-block-placeholder]')).toBeNull();
      expect(print.querySelector('textarea:not([readonly]):not([disabled]), input:not([readonly]):not([disabled]), button:not([disabled]), [contenteditable="true"]')).toBeNull();
      const outputFrames = data.plan.collection.pageFrames.filter((frame) => frame.id !== 'cover' || coverIncluded);
      expect(outputFrames.length).toBeGreaterThan(2);
      expect(Array.from(print.querySelectorAll('[data-note-print-page]')).map((page) => page.getAttribute('data-page-frame-id')))
        .toEqual(outputFrames.map((frame) => frame.id));
      expect(Array.from(preview.querySelectorAll('[data-export-preview-page-frame]')).map((page) => page.getAttribute('data-export-preview-page-frame')))
        .toEqual(outputFrames.map((frame) => frame.id));
      expect(Boolean(print.querySelector('[data-page-frame-id="cover"]'))).toBe(withCover && coverIncluded);
      expectPreviewGroupCounts(preview, data);

      const richIds = data.blocks.filter((entry) => ['media', 'table', 'component'].includes(entry.block_type)).map((entry) => entry.id);
      const richFrames = new Set<string>();
      for (const id of richIds) {
        const fragment = data.fragments.find((entry) => entry.blockId === id)!;
        const frame = data.plan.collection.pageFrames.find((entry) => entry.id === fragment.pageFrameId)!;
        richFrames.add(frame.id);
        const screenFragment = paper.querySelector(`[data-rich-paper-frame="${frame.id}"] [data-note-readonly-fragment][data-block-id="${id}"]`) as HTMLElement;
        const printFragment = print.querySelector(`[data-page-frame-id="${frame.id}"] [data-note-print-fragment][data-block-id="${id}"]`) as HTMLElement;
        expect(screenFragment).toBeTruthy(); expect(printFragment).toBeTruthy();
        expect(print.querySelectorAll(`[data-note-print-fragment][data-block-id="${id}"]`)).toHaveLength(1);
        expect(paper.querySelectorAll(`[data-note-readonly-fragment][data-block-id="${id}"]`)).toHaveLength(1);
        expect(printFragment.querySelector('textarea, input, button, [contenteditable="true"]')).toBeNull();
        const geometry = getPagePrintFragmentGeometry(frame, fragment).clip;
        for (const key of ['left', 'top', 'width', 'height'] as const) {
          expect(printFragment.style[key]).toBe(`${geometry[key]}px`);
          expect(printFragment.style[key]).toBe(screenFragment.style[key]);
        }
        expect(printFragment.querySelector('article')?.getAttribute('style'))
          .toBe(screenFragment.querySelector('article')?.getAttribute('style'));
        const previewRow = data.preview.pageFrames.find((entry) => entry.pageFrameId === frame.id)!.rows.find((entry) => entry.block.id === id)!;
        expect(previewRow.block).toBe(data.blocks.find((entry) => entry.id === id));
        expect(previewRow.layout).toEqual(fragment.flowFragment!.layout);
        expect(previewRow.flowFragment).toBe(fragment.flowFragment);
      }
      expect(richFrames.size).toBeGreaterThan(2);

      for (const asset of ['plain-image', 'cropped-image', 'zoomed-image']) {
        expect(mediaGeometry(print, asset)).toEqual(mediaGeometry(paper, asset));
        expect(mediaGeometry(previewFrameForBlock(preview, data, asset), asset)).toEqual(mediaGeometry(paper, asset));
      }
      expect(mediaGeometry(print, 'plain-image')).toMatchObject({ tag: 'img', src: 'blob:plain-image', viewBox: null });
      expect(mediaGeometry(print, 'cropped-image')).toMatchObject({ tag: 'svg', viewBox: '80 240 400 480',
        clipRect: '80 240 400 480', clipUnits: 'userSpaceOnUse', rotation: '90',
        transform: 'translate(800 0) rotate(90)', width: '1200', height: '800', aspect: 'xMidYMid meet' });
      const zoomed = mediaGeometry(print, 'zoomed-image');
      expect(zoomed).toMatchObject({ rotation: '90', transform: 'translate(800 0) rotate(90)' });
      for (const key of ['viewBox', 'clipRect'] as const) {
        expect(zoomed[key]?.split(' ').map(Number))
          .toEqual([200, 300, 400, 600].map((value) => expect.closeTo(value, 6)));
      }

      const paperTable = paper.querySelector('table')!;
      for (const root of [print, previewFrameForBlock(preview, data, 'reforms-table')]) {
        const table = root.querySelector('table')!;
        expect(table.outerHTML).toBe(paperTable.outerHTML);
        expect(within(table).getAllByRole('row')).toHaveLength(10);
        expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(XINING_REFORMS_TABLE.headers);
        expect(within(table).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(XINING_REFORMS_TABLE.rows.flat());
        expect(table.closest('[data-table-print-clip="true"]')).toBeTruthy();
        expect(table.parentElement?.hasAttribute('tabindex')).toBe(false);
      }
      expect(tableCss).toContain('width: fit-content');
      expect(tableCss).toContain('margin: 0 auto');
      expect(tableCss).toContain('var(--document-font-size, 15px) * 0.85');

      for (const root of [print, previewFrameForBlock(preview, data, 'timeline')]) {
        const timeline = root.querySelector('[data-component-kind="timeline"]')!;
        expect(timeline.querySelector('ol')?.innerHTML).toBe(paper.querySelector('[data-component-kind="timeline"] ol')?.innerHTML);
        expect(within(timeline as HTMLElement).getAllByRole('listitem')).toHaveLength(13);
        expect(timeline.querySelectorAll('details[open]')).toHaveLength(0);
        expect(timeline.textContent).toContain(SONG_TIMELINE.params.entries[0].label);
        expect(timeline.textContent).toContain(SONG_TIMELINE.params.entries[12].year);
      }
      for (const [id, kind] of [['bar-chart', 'chart_bar'], ['line-chart', 'chart_line']] as const) {
        for (const root of [print, previewFrameForBlock(preview, data, id)]) {
          expect(chartGeometry(root, kind)).toEqual(chartGeometry(paper, kind));
        }
      }
      for (const root of [print, previewFrameForBlock(preview, data, 'bar-chart')]) {
        expect(root.querySelectorAll('[data-component-kind="chart_bar"] [data-chart-value] rect')).toHaveLength(6);
      }
      for (const root of [print, previewFrameForBlock(preview, data, 'line-chart')]) {
        const line = root.querySelector('[data-component-kind="chart_line"]')!;
        expect(line.querySelectorAll('polyline')).toHaveLength(2);
        expect(line.querySelectorAll('circle')).toHaveLength(6);
      }
      for (const root of [print, previewFrameForBlock(preview, data, 'unknown-component')]) {
        const unknown = root.querySelector('[data-component-kind="future_component"] [role="status"]')!;
        expect(unknown.textContent).toBe(paper.querySelector('[data-component-kind="future_component"] [role="status"]')?.textContent);
        expect(unknown.textContent).toContain('未注册组件');
      }
      act(() => window.dispatchEvent(new Event('afterprint')));
      expect(document.querySelector('[data-note-print-root="true"]')).toBeNull();
      expect({ blocks: data.blocks, plan: data.plan, fragments: data.fragments, preview: data.preview }).toEqual(before);
    },
  );

  it('prepares the same media projection before beforeprint without mounting printable pages early', async () => {
    const data = fixture();
    const before = structuredClone({ blocks: data.blocks, plan: data.plan });
    render(<NotePrintLayer {...data.input} />);
    const preparation = document.querySelector('[data-note-print-media-preload="true"]') as HTMLElement;
    expect(preparation).toBeTruthy();
    expect(preparation.hidden).toBe(true);
    expect(preparation.getAttribute('aria-hidden')).toBe('true');
    await waitFor(() => expect(preparation.querySelectorAll('[data-media-block-state="loaded"]')).toHaveLength(3));
    expect(document.querySelector('[data-note-print-root="true"]')).toBeNull();
    act(() => window.dispatchEvent(new Event('beforeprint')));
    const print = document.querySelector('[data-note-print-root="true"]')!;
    expect(print.querySelectorAll('[data-media-block-state="loaded"]')).toHaveLength(3);
    expect(mediaGeometry(print, 'cropped-image')).toEqual(mediaGeometry(preparation, 'cropped-image'));
    expect(load.mock.calls.map(([asset]) => asset).sort()).toEqual(['cropped-image', 'plain-image', 'zoomed-image']);
    act(() => window.dispatchEvent(new Event('afterprint')));
    expect(document.querySelector('[data-note-print-root="true"]')).toBeNull();
    expect(revoke).not.toHaveBeenCalled();
    expect({ blocks: data.blocks, plan: data.plan }).toEqual(before);
  });

  it.each(['missing metadata', '409 asset unavailable'])(
    'keeps readable media failure semantics on paper, print and preview (%s)', async (failure) => {
      const data = fixture();
      const target = data.blocks.find((entry) => entry.id === 'plain-image')!;
      if (failure === 'missing metadata') target.metadata = {};
      else load.mockImplementation(async (assetId) => {
        if (assetId === 'plain-image') throw Object.assign(new Error('Asset unavailable'), { response: { status: 409 } });
        return `blob:${assetId}`;
      });
      const before = structuredClone({ blocks: data.blocks, plan: data.plan });
      const view = render(<><Paper data={data} /><Preview preview={data.preview} /><NotePrintLayer {...data.input} /></>);
      const paper = view.container.querySelector('[data-rich-paper="true"]')!;
      const preview = view.container.querySelector('[data-note-overlay="export"]')!;
      await waitFor(() => {
        expect(paper.querySelector('[data-media-block-state="failed"]')).toBeTruthy();
        expect(preview.querySelector('[data-media-block-state="failed"]')).toBeTruthy();
      });
      act(() => window.dispatchEvent(new Event('beforeprint')));
      const print = document.querySelector('[data-note-print-root="true"]')!;
      for (const root of [paper, print, preview]) {
        const failureNode = root.querySelector('[data-media-block-state="failed"]')!;
        expect(failureNode.getAttribute('role')).toBe('status');
        expect(failureNode.textContent).toContain('Image could not be loaded. Reopen the note to retry.');
        expect(failureNode.textContent).toBe(paper.querySelector('[data-media-block-state="failed"]')?.textContent);
      }
      expect(print.querySelector('table')).toBeTruthy();
      expect(print.querySelector('[data-component-kind="chart_line"] svg')).toBeTruthy();
      if (failure === 'missing metadata') expect(load.mock.calls.map(([asset]) => asset)).not.toContain('plain-image');
      act(() => window.dispatchEvent(new Event('afterprint')));
      expect({ blocks: data.blocks, plan: data.plan }).toEqual(before);
    },
  );
});
