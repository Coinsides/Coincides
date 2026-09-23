import type { ComponentProps } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDocumentPageFlowPlan } from './documentPageFlowService';
import { noteBlocksToPageFlow, pageFlowFirstLayouts, pageFlowFragmentProjections } from './notePageFlowService';
import { createPageStackFromFrame } from './pageStackCollectionService';
import { createDefaultDocumentTypographyProfile } from './typographyProfileService';
import { useNoteCanvasFrameModel } from './hooks/useNoteCanvasLayoutModel';
import { buildNoteNavigationResults, type NoteNavigationSearchInput } from './noteNavigationSearch';
import { TableBlockProjection } from './blocks/TableBlockProjection';
import { BlockEditorLayer } from './layers/BlockEditorLayer';
import { NotePrintLayer, type NotePrintInput } from './layers/NotePrintLayer';
import { NotePageThumbnail } from './layers/NotePageThumbnail';
import type { TableBlockPayload } from './tableBlockService';
import type { NoteBlock } from './runtimeDataTypes';
import type { BlockBoxLayout } from './runtimeLayout';
import type { PageFrameModel } from './types';

vi.mock('./canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn(async () => 'blob:b1-leading') }));

const reformTable: TableBlockPayload = {
  caption: '熙宁新法表', headers: ['法令', '主要措施', '观察要点'], rows: [
    ['青苗法', '春季贷钱，秋收归还', '农时与利息'],
    ['免役法', '纳钱代替差役', '役法与财政'],
    ['农田水利法', '兴修水利，开垦荒地', '灌溉与生产'],
    ['方田均税法', '清丈田地，按等纳税', '田亩与税额'],
    ['市易法', '设市易务调剂货物', '商贸与流通'],
    ['均输法', '调整采购与运输', '供需与转运'],
    ['保甲法', '编组居民，维持乡里秩序', '乡村组织'],
    ['保马法', '由民户养马', '马政与军需'],
    ['将兵法', '固定将领训练军队', '兵将关系'],
  ],
};

function block(id: string, payload: TableBlockPayload = reformTable): NoteBlock {
  return { id, placement_id: `placement-${id}`, block_type: 'table', title: null,
    content_json: structuredClone({ ...payload }), plain_text: 'stale persisted projection', order_index: 0,
    metadata: {}, display_overrides_json: {}, canvas_layout: null, source_references: [] };
}

function seed(tableHeight = 300, leadingHeight = 0, trailingHeight = 0) {
  const source = block('reforms');
  const frame: PageFrameModel = { id: 'paper', role: 'primary_page_frame', templateId: 'a4_portrait', pageSize: 'Custom',
    x: 0, y: 0, width: 520, height: 620, contentInset: { left: 50, right: 50, top: 40, bottom: 40 }, exportable: true };
  const layout: BlockBoxLayout = { x: 0, y: 0, width: 420, height: tableHeight, frame_id: frame.id,
    coordinate_space: 'page_frame_local', surface: 'formal_page', width_mode: 'auto' };
  const media = (id: string): NoteBlock => ({ ...block(id), block_type: 'media', plain_text: '', content_json: {},
    metadata: { media: { asset_id: `${id}-asset`, naturalWidth: 420, naturalHeight: 100 } } });
  const blocks = [...(leadingHeight ? [media('leading')] : []), source, ...(trailingHeight ? [media('trailing')] : [])];
  const layouts = Object.fromEntries(blocks.map((entry) => [entry.id, { ...layout,
    height: entry.id === 'leading' ? leadingHeight : entry.id === 'trailing' ? trailingHeight : tableHeight }]));
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

describe('B1 table block integration', () => {
  it.each([
    ['normal', 300, 0, 0, 1, 0],
    ['whole block moves to the next page', 300, 400, 0, 2, 0],
    ['oversized block owns a page and reports its overflow', 700, 80, 40, 3, 168],
  ] as const)('%s follows A1 media pagination without row slicing', (_name, height, leading, trailing, pageCount, overflow) => {
    const data = seed(height, leading, trailing);
    const before = structuredClone(data.source);
    const flow = noteBlocksToPageFlow([data.source], { reforms: data.layout }, {}, {});
    expect(flow[0]).toMatchObject({ kind: 'media', blockId: 'reforms', firstFragmentExtraHeight: 0 });
    expect(flow[0].units).toBeUndefined();
    const fragments = data.plan.fragments.filter((entry) => entry.blockId === 'reforms');
    expect(fragments).toHaveLength(1);
    expect(fragments[0]).toMatchObject({ isFirst: true, isLast: true, textRange: null, lineRange: null, lines: [],
      layout: { height, y: 8, width: 420 } });
    expect(data.plan.frames).toHaveLength(pageCount);
    expect(fragments[0].frameId).toBe(data.plan.frames[leading ? 1 : 0].frame.id);
    if (overflow) {
      expect(data.plan.overflows).toEqual([expect.objectContaining({ blockId: 'reforms',
        kind: 'indivisible_block_exceeds_page', requiredHeight: height, availableHeight: 532, overflowPx: overflow })]);
      expect(data.plan.frames[1].fragments.map((entry) => entry.blockId)).toEqual(['reforms']);
      expect(data.plan.frames[2].fragments.map((entry) => entry.blockId)).toEqual(['trailing']);
    } else expect(data.plan.overflows).toEqual([]);
    expect(data.source).toEqual(before);
  });

  it('renders the nine-row Chinese sample as a native table and declares print clipping', () => {
    const source = block('reforms');
    const { container, rerender } = render(<TableBlockProjection block={source} />);
    const table = screen.getByRole('table', { name: '熙宁新法表' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(reformTable.headers);
    expect(table.querySelectorAll('tbody tr')).toHaveLength(9);
    expect(within(table).getAllByRole('cell')).toHaveLength(27);
    expect(table.querySelector('tbody')?.textContent).toContain('固定将领训练军队');
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.querySelector('[data-table-print-clip]')).toBeNull();
    rerender(<TableBlockProjection block={source} print />);
    expect(container.querySelector('[data-table-print-clip="true"]')).not.toBeNull();
  });

  it('uses the same flow fragments in Overview, print and export with one table per physical page', () => {
    const data = seed(300, 400);
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
    const overviewTable = view.container.querySelector('[data-table-block]')!;
    expect(view.container.querySelectorAll('[data-table-block]')).toHaveLength(1);
    expect(overviewTable.closest('[data-note-page-thumbnail]')?.getAttribute('data-page-frame-id'))
      .toBe(data.plan.frames[1].frame.id);
    expect(overviewTable.querySelectorAll('tbody tr')).toHaveLength(9);
    act(() => window.dispatchEvent(new Event('beforeprint')));
    const printed = document.querySelector('[data-note-print-root]')!;
    expect(printed.querySelectorAll('[data-note-print-page]')).toHaveLength(2);
    const printTable = printed.querySelector('[data-table-block]')!;
    expect(printed.querySelectorAll('[data-table-block]')).toHaveLength(1);
    expect(printTable.getAttribute('data-table-print-clip')).toBe('true');
    expect(printTable.querySelector('table')?.innerHTML).toBe(overviewTable.querySelector('table')?.innerHTML);
    expect(printTable.closest('[data-note-print-page]')?.getAttribute('data-page-frame-id'))
      .toBe(data.plan.frames[1].frame.id);
    expect(printTable.closest('[data-note-readonly-fragment]')?.getAttribute('style'))
      .toBe(overviewTable.closest('[data-note-readonly-fragment]')?.getAttribute('style'));
    fireEvent.doubleClick(printTable);
    fireEvent.doubleClick(overviewTable);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => window.dispatchEvent(new Event('afterprint')));
  });

  it('searches live caption, headers and cells on their actual page after payload refresh', () => {
    const data = seed(300, 400);
    const input: NoteNavigationSearchInput = { noteId: 'sample-note', visibleBlocks: data.blocks,
      blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {}, pageOffsetX: 0,
      noteCanvasRuntime: { pageFrames: data.plan.collection.pageFrames, coordinateContract: 'v2',
        blockFragmentProjections: pageFlowFragmentProjections(data.plan) } };
    for (const query of ['熙宁新法表', '观察要点', '青苗法', '兵将关系']) {
      expect(buildNoteNavigationResults(input, query)).toEqual([expect.objectContaining({ blockId: 'reforms',
        match: query, frameId: data.plan.frames[1].frame.id, pageNumbers: [2] })]);
    }
    expect(buildNoteNavigationResults(input, 'stale persisted projection')).toEqual([]);
    input.visibleBlocks = [block('reforms', { caption: '更新后的法令表', headers: ['项目'], rows: [['更新后单元格']] })];
    expect(buildNoteNavigationResults(input, '青苗法')).toEqual([]);
    expect(buildNoteNavigationResults(input, '更新后单元格')[0]).toMatchObject({ blockId: 'reforms', pageNumbers: [2] });
    expect(buildNoteNavigationResults(input, '项目')).toHaveLength(1);
  });

  it('opens from the real block shell, cancels without saving, then saves through the table callback', async () => {
    const source = block('reforms');
    const noop = vi.fn();
    const onSaveTable = vi.fn(async (_payload: TableBlockPayload) => true);
    const onTextChange = vi.fn();
    const onTextFlowChange = vi.fn();
    const props: ComponentProps<typeof BlockEditorLayer> = {
      block: source, contentReadOnly: false, text: '', annotations: [], selectedAnnotationIds: [],
      layout: { x: 0, y: 0, width: 420, height: 300, surface: 'formal_page' },
      blockControlAnchor: { x: 12, y: 12 }, affiliationOutline: null, layoutMode: false, pageOffsetX: 0,
      saving: false, active: true, autoFocus: false, onFocused: noop, onFocusReleased: noop,
      onAnnotationSelect: noop, onAnnotationContextMenu: noop, onAnnotationStackSelect: noop,
      onTextUnitSelection: noop, onTextUnitContextMenu: noop, onBlockContextMenu: noop,
      onTextChange, onTextFlowChange, onFieldDraftChange: noop,
      onSave: vi.fn(async () => ({ status: 'saved' as const, block: source, recoveryReceipt: null, reconciliation: 'not_needed' as const })),
      onSaveTable, onTrash: noop, onSelect: noop, onBeginMove: noop, onBeginResize: noop,
      onToggleExportRole: noop, onToggleAIVisibility: noop, onAnnotateBlock: noop,
      showBlockTypeBadge: false, showAIStatusBadge: false, showExportStatusBadge: false, showLabelOverlay: false,
      onKeyDown: noop, onMeasuredHeight: noop, anchorsBySourceRef: {}, sourceJumpBusy: null, onViewSource: noop,
    };
    const { container } = render(<BlockEditorLayer {...props} />);
    expect(container.querySelector('textarea')).toBeNull();
    fireEvent.doubleClick(container.querySelector('[data-table-block]')!);
    expect(screen.getByRole('dialog', { name: 'Edit table' })).not.toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Row 1, column 1' }), { target: { value: '取消的草稿' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onSaveTable).not.toHaveBeenCalled();
    fireEvent.doubleClick(container.querySelector('[data-table-block]')!);
    expect((screen.getByRole('textbox', { name: 'Row 1, column 1' }) as HTMLTextAreaElement).value).toBe('青苗法');
    fireEvent.change(screen.getByRole('textbox', { name: 'Row 1, column 1' }), { target: { value: '青苗法修订' } });
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onSaveTable).toHaveBeenCalledOnce();
    expect(onSaveTable.mock.calls[0]?.[0]).toEqual({ ...reformTable,
      rows: reformTable.rows.map((row, index) => index === 0 ? ['青苗法修订', ...row.slice(1)] : row) });
    expect(onTextChange).not.toHaveBeenCalled();
    expect(onTextFlowChange).not.toHaveBeenCalled();
  });
});
