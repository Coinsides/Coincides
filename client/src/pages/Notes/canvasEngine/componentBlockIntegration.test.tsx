import type { ComponentProps } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDocumentPageFlowPlan } from './documentPageFlowService';
import { noteBlocksToPageFlow, pageFlowFirstLayouts, pageFlowFragmentProjections } from './notePageFlowService';
import { createPageStackFromFrame } from './pageStackCollectionService';
import { createDefaultDocumentTypographyProfile } from './typographyProfileService';
import { useNoteCanvasFrameModel } from './hooks/useNoteCanvasLayoutModel';
import { buildNoteNavigationResults, type NoteNavigationSearchInput } from './noteNavigationSearch';
import { BlockEditorLayer } from './layers/BlockEditorLayer';
import { NotePrintLayer, type NotePrintInput } from './layers/NotePrintLayer';
import { NotePageThumbnail } from './layers/NotePageThumbnail';
import type { ComponentBlockPayload } from './componentBlockService';
import type { NoteBlock } from './runtimeDataTypes';
import type { BlockBoxLayout } from './runtimeLayout';
import type { PageFrameModel } from './types';

vi.mock('./canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn(async () => 'blob:b1-leading') }));

const timeline: ComponentBlockPayload = { component_kind: 'timeline', params: { title: '宋初年表', entries: [{ year: '960', label: '北宋建立', detail: '陈桥兵变' }, { year: '997', label: '真宗即位' }] } };
const chart: ComponentBlockPayload = { component_kind: 'chart_bar', params: { title: '岁入的换血', x_labels: ['宋初', '中期', '后期'], series: [{ name: '田赋', values: [60, 45, 30] }, { name: '商税', values: [20, 40, 65] }], y_label: '收入' } };

function block(id: string, payload: ComponentBlockPayload = timeline): NoteBlock {
  return { id, placement_id: `placement-${id}`, block_type: 'component', title: null,
    content_json: structuredClone({ ...payload }), plain_text: 'stale persisted projection', order_index: 0,
    metadata: {}, display_overrides_json: {}, canvas_layout: null, source_references: [] };
}

function seed(componentHeight = 300, leadingHeight = 0, trailingHeight = 0, payload: ComponentBlockPayload = timeline) {
  const source = block('reforms', payload);
  const frame: PageFrameModel = { id: 'paper', role: 'primary_page_frame', templateId: 'a4_portrait', pageSize: 'Custom',
    x: 0, y: 0, width: 520, height: 620, contentInset: { left: 50, right: 50, top: 40, bottom: 40 }, exportable: true };
  const layout: BlockBoxLayout = { x: 0, y: 0, width: 420, height: componentHeight, frame_id: frame.id,
    coordinate_space: 'page_frame_local', surface: 'formal_page', width_mode: 'auto' };
  const media = (id: string): NoteBlock => ({ ...block(id), block_type: 'media', plain_text: '', content_json: {},
    metadata: { media: { asset_id: `${id}-asset`, naturalWidth: 420, naturalHeight: 100 } } });
  const blocks = [...(leadingHeight ? [media('leading')] : []), source, ...(trailingHeight ? [media('trailing')] : [])];
  const layouts = Object.fromEntries(blocks.map((entry) => [entry.id, { ...layout,
    height: entry.id === 'leading' ? leadingHeight : entry.id === 'trailing' ? trailingHeight : componentHeight }]));
  const typography = createDefaultDocumentTypographyProfile();
  const collection = { pageFrames: [frame], primaryFrameId: frame.id, pageStacks: [createPageStackFromFrame(frame)] };
  const plan = resolveDocumentPageFlowPlan({ collection, documentTypography: typography,
    blocks: noteBlocksToPageFlow(blocks, layouts, {}, {}) });
  return { source, frame, layout, blocks, layouts, typography, collection, plan };
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('URL', class extends URL { static revokeObjectURL = vi.fn(); });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('B2 component integration on the B1 route', () => {
  it.each([
    ['normal', 300, 0, 0, 1, 0],
    ['whole block moves to the next page', 300, 400, 0, 2, 0],
    ['oversized block owns a page and reports its overflow', 700, 80, 40, 3, 160],
  ] as const)('%s follows A1 media pagination without splitting', (_name, height, leading, trailing, pageCount, overflow) => {
    for (const payload of [timeline, chart, { ...chart, component_kind: 'chart_line' }]) {
      const data = seed(height, leading, trailing, payload);
      const before = structuredClone(data.source);
      const flow = noteBlocksToPageFlow([data.source], { reforms: data.layout }, {}, {});
      expect(flow[0]).toMatchObject({ kind: 'media', blockId: 'reforms', firstFragmentExtraHeight: 0 });
      expect(flow[0].units).toBeUndefined();
      const fragments = data.plan.fragments.filter((entry) => entry.blockId === 'reforms');
      expect(fragments).toHaveLength(1);
      expect(fragments[0]).toMatchObject({ isFirst: true, isLast: true, textRange: null, lineRange: null, lines: [],
        layout: { height, y: 0, width: 420 } });
      expect(data.plan.frames).toHaveLength(pageCount);
      expect(fragments[0].frameId).toBe(data.plan.frames[leading ? 1 : 0].frame.id);
      if (overflow) {
        expect(data.plan.overflows).toEqual([expect.objectContaining({ blockId: 'reforms',
          kind: 'indivisible_block_exceeds_page', requiredHeight: height, availableHeight: 540, overflowPx: overflow })]);
        expect(data.plan.frames[1].fragments.map((entry) => entry.blockId)).toEqual(['reforms']);
        expect(data.plan.frames[2].fragments.map((entry) => entry.blockId)).toEqual(['trailing']);
      } else expect(data.plan.overflows).toEqual([]);
      expect(data.source).toEqual(before);
    }
  });

  it.each([timeline, chart, { ...chart, component_kind: 'chart_line' }])('shares flow fragments across Overview, print and export for $component_kind', (payload) => {
    const data = seed(300, 400, 0, payload);
    const { result } = renderHook(() => useNoteCanvasFrameModel({
      coordinateContract: 'v2', pageFlowPlan: data.plan, blockLayouts: pageFlowFirstLayouts(data.plan, data.layouts),
      defaultDraftLayout: data.layout, documentTypographyProfile: data.typography, draftActive: false, draftLayout: null,
      pageFrameCollection: data.collection, persistedCanvasObjects: [], persistedCanvasPlacements: [],
      persistedContentMounts: [], persistedVisualConnectors: [], persistedImageObjects: [], persistedStructuredObjects: [],
      pageOffsetX: 0, surfaceMode: 'page', viewportTransform: { x: 0, y: 0, width: 1000, height: 800, zoom: 1 },
      visibleBlocks: data.blocks,
    }));
    const runtime = result.current.noteCanvasRuntime;
    expect(runtime.pageFlowPlan).toBe(data.plan);
    expect(runtime.blockFragmentProjections.map((entry) => entry.flowFragment)).toEqual(data.plan.fragments);
    const exportRows = result.current.exportPreview.pageFrames.flatMap((page) => page.rows).filter((entry) => entry.block.id === 'reforms');
    expect(exportRows).toHaveLength(1);
    expect(exportRows[0].flowFragment).toBe(data.plan.fragments.find((entry) => entry.blockId === 'reforms'));
    const input: NotePrintInput = { noteId: 'sample-note', surfaceMode: 'page', noteCanvasRuntime: runtime,
      visibleBlocks: data.blocks, blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {},
      anchorsBySourceRef: {}, documentTypographyProfile: data.typography };
    const view = render(<><NotePrintLayer {...input} />{runtime.pageFrames.map((frame, index) =>
      <NotePageThumbnail key={frame.id} frame={frame} input={{ ...input, selectedPageFrameId: null }} pageNumber={index + 1}
        width={frame.width / 4} height={frame.height / 4} scale={0.25} selected={false} renderContent onSelectPage={() => {}} />)}</>);
    const overviewComponent = view.container.querySelector('[data-component-block]')!;
    expect(overviewComponent).not.toBeNull();
    expect(view.container.querySelectorAll('[data-component-block]')).toHaveLength(1);
    expect(overviewComponent.closest('[data-note-page-thumbnail]')?.getAttribute('data-page-frame-id'))
      .toBe(data.plan.frames[1].frame.id);
    act(() => window.dispatchEvent(new Event('beforeprint')));
    const printed = document.querySelector('[data-note-print-root]')!;
    expect(printed.querySelectorAll('[data-note-print-page]')).toHaveLength(2);
    const printComponent = printed.querySelector('[data-component-block]')!;
    expect(printed.querySelectorAll('[data-component-block]')).toHaveLength(1);
    expect(printComponent.textContent).toBe(overviewComponent.textContent);
    expect(printComponent.querySelector('details')?.open).toBe(overviewComponent.querySelector('details')?.open);
    expect(printComponent.closest('[data-note-print-page]')?.getAttribute('data-page-frame-id'))
      .toBe(data.plan.frames[1].frame.id);
    expect(printComponent.closest('[data-note-readonly-fragment]')?.getAttribute('style'))
      .toBe(overviewComponent.closest('[data-note-readonly-fragment]')?.getAttribute('style'));
    fireEvent.doubleClick(printComponent); fireEvent.doubleClick(overviewComponent);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => window.dispatchEvent(new Event('afterprint')));
  });

  it('searches live timeline details and chart labels on their actual page, replacing stale projections', () => {
    const data = seed(300, 400);
    const input: NoteNavigationSearchInput = { noteId: 'sample-note', visibleBlocks: data.blocks,
      blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {}, pageOffsetX: 0,
      noteCanvasRuntime: { pageFrames: data.plan.collection.pageFrames, coordinateContract: 'v2',
        blockFragmentProjections: pageFlowFragmentProjections(data.plan) } };
    for (const query of ['宋初年表', '960', '北宋建立', '陈桥兵变']) {
      expect(buildNoteNavigationResults(input, query)).toEqual([expect.objectContaining({ blockId: 'reforms',
        match: query, frameId: data.plan.frames[1].frame.id, pageNumbers: [2] })]);
    }
    expect(buildNoteNavigationResults(input, 'stale persisted projection')).toEqual([]);
    input.visibleBlocks = [block('reforms', chart)];
    expect(buildNoteNavigationResults(input, '陈桥兵变')).toEqual([]);
    for (const query of ['岁入的换血', '中期', '田赋', '商税', '收入']) {
      expect(buildNoteNavigationResults(input, query)[0]).toMatchObject({ blockId: 'reforms', pageNumbers: [2] });
    }
  });

  it('opens the real component shell, cancels without saving and uses the component save callback', async () => {
    const source = block('reforms'); const noop = vi.fn();
    const onSaveComponent = vi.fn(async (_payload: ComponentBlockPayload) => true);
    const onTextChange = vi.fn(); const onTextFlowChange = vi.fn();
    const props: ComponentProps<typeof BlockEditorLayer> = {
      block: source, contentReadOnly: false, text: '', annotations: [], selectedAnnotationIds: [],
      layout: { x: 0, y: 0, width: 420, height: 300, surface: 'formal_page' },
      blockControlAnchor: { x: 12, y: 12 }, affiliationOutline: null, layoutMode: false, pageOffsetX: 0,
      saving: false, active: true, autoFocus: false, onFocused: noop, onFocusReleased: noop,
      onAnnotationSelect: noop, onAnnotationContextMenu: noop, onAnnotationStackSelect: noop,
      onTextUnitSelection: noop, onTextUnitContextMenu: noop, onBlockContextMenu: noop,
      onTextChange, onTextFlowChange, onFieldDraftChange: noop,
      onSave: vi.fn(async () => ({ status: 'saved' as const, block: source, recoveryReceipt: null, reconciliation: 'not_needed' as const })),
      onSaveComponent, onTrash: noop, onSelect: noop, onBeginMove: noop, onBeginResize: noop,
      onToggleExportRole: noop, onToggleAIVisibility: noop, onAnnotateBlock: noop,
      showBlockTypeBadge: false, showAIStatusBadge: false, showExportStatusBadge: false, showLabelOverlay: false,
      onKeyDown: noop, onMeasuredHeight: noop, anchorsBySourceRef: {}, sourceJumpBusy: null, onViewSource: noop,
    };
    const { container } = render(<BlockEditorLayer {...props} />);
    expect(container.querySelector('textarea')).toBeNull();
    fireEvent.doubleClick(container.querySelector('[data-component-block]')!);
    expect(screen.getByRole('dialog', { name: 'Edit timeline' })).not.toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Entry 1 label' }), { target: { value: '取消草稿' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull(); expect(onSaveComponent).not.toHaveBeenCalled();
    fireEvent.doubleClick(container.querySelector('[data-component-block]')!);
    expect((screen.getByRole('textbox', { name: 'Entry 1 label' }) as HTMLInputElement).value).toBe('北宋建立');
    fireEvent.change(screen.getByRole('textbox', { name: 'Entry 1 label' }), { target: { value: '北宋建国' } });
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onSaveComponent).toHaveBeenCalledOnce();
    expect(onSaveComponent.mock.calls[0][0]).toMatchObject({ component_kind: 'timeline',
      params: { entries: [{ year: '960', label: '北宋建国', detail: '陈桥兵变' }, { year: '997', label: '真宗即位' }] } });
    expect(onTextChange).not.toHaveBeenCalled(); expect(onTextFlowChange).not.toHaveBeenCalled();
  });
});
