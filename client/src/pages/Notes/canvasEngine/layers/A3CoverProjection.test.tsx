import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultNoteBindingSettings, createDefaultNoteBindingSection } from '../../../../../../shared/types/noteBinding';
import { buildNoteCanvasRuntimeModel, createPrimaryPageFrame } from '../engineModel';
import { createPageStackFromFrame } from '../pageStackCollectionService';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import { buildExportPreviewModel, exportPreviewRowLabel } from '../exportPreviewService';
import { buildNoteNavigationResults } from '../noteNavigationSearch';
import { listPageFrameSlots } from '../pageFrameSlotService';
import { NoteTruthBindingProvider } from '../NoteTruthBindingContext';
import type { NoteBlock } from '../runtimeDataTypes';
import type { BlockBoxLayout } from '../runtimeLayout';
import type { BlockPlacementModel } from '../types';
import { NotePageThumbnail, type NotePageThumbnailInput } from './NotePageThumbnail';
import { NotePrintLayer } from './NotePrintLayer';

vi.mock('../canvasAssetRepository', () => ({ loadCanvasImageAssetBlobUrl: vi.fn().mockResolvedValue('blob:cover') }));
beforeEach(() => { URL.revokeObjectURL = vi.fn(); });
afterEach(cleanup);

function fixture(exportIncluded = true) {
  const cover = createPrimaryPageFrame({ id: 'cover' });
  const first = createPrimaryPageFrame({ id: 'first', y: cover.height + 80 });
  const second = createPrimaryPageFrame({ id: 'second', y: (cover.height + 80) * 2 });
  const frames = [first, second, cover];
  const bindingSettings = createDefaultNoteBindingSettings();
  bindingSettings.coverPage = { frameId: cover.id, exportIncluded };
  bindingSettings.cover = { assetId: 'cover-asset', page: { crop: { x: 10, y: 20, width: 80, height: 70 }, zoom: 1 } };
  const chapter = createDefaultNoteBindingSection('chapter', 2);
  chapter.pageNumber.startAt = 7;
  chapter.pageNumber.format = 'roman-upper';
  bindingSettings.sections.push(chapter);
  const blocks: NoteBlock[] = [
    { id: 'title', placement_id: 'place-title', block_type: 'note_ref', content_json: { field: 'title' },
      title: null, plain_text: null, metadata: {}, display_overrides_json: {}, order_index: 0, source_references: [] },
    { id: 'text', placement_id: 'place-text', block_type: 'paragraph', content_json: { body: '封面摘要' },
      title: null, plain_text: '封面摘要', metadata: {}, display_overrides_json: {}, order_index: 1, source_references: [] },
  ];
  const layouts: Record<string, BlockBoxLayout> = Object.fromEntries(blocks.map((block, index) => [block.id,
    { x: 20, y: 40 + index * 120, width: 600, height: 100, width_mode: 'manual', frame_id: cover.id,
      coordinate_space: 'page_frame_local', surface: 'formal_page' }]));
  const placements: BlockPlacementModel[] = blocks.map((block) => ({ ...layouts[block.id],
    x: cover.contentInset.left + layouts[block.id].x, y: cover.contentInset.top + layouts[block.id].y,
    placementId: block.placement_id, blockId: block.id, objectId: block.id, objectKind: 'note_block',
    canvasId: 'note-canvas', frameId: cover.id, surface: 'formal_page', boundaryRole: 'inside', rotation: 0, zIndex: 1 }));
  const stack = { ...createPageStackFromFrame(cover), frameIds: [cover.id, first.id, second.id] };
  const runtime = buildNoteCanvasRuntimeModel({ mode: 'page', primaryPageFrame: first, pageFrames: frames,
    pageStacks: [stack], bindingSettings, blockPlacements: placements,
    viewport: { x: 0, y: 0, width: 1000, height: 800, zoom: 1 } });
  const input: NotePageThumbnailInput = { noteId: 'note', noteCanvasRuntime: runtime, visibleBlocks: blocks,
    blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {}, anchorsBySourceRef: {},
    documentTypographyProfile: createDefaultDocumentTypographyProfile(), selectedPageFrameId: cover.id };
  return { cover, first, second, bindingSettings, blocks, layouts, placements, runtime, input };
}

describe('A3 cover page read-side projections', () => {
  it('orders the cover as page zero, suppresses its furniture and starts content counting at one', () => {
    const { runtime } = fixture();
    expect(runtime.pageFrames.map((frame) => frame.id)).toEqual(['cover', 'first', 'second']);
    expect(runtime.pageFrameExtensions.map((extension) => extension.mechanicalPageNumber)).toEqual([0, 1, 2]);
    expect(listPageFrameSlots(runtime.pageFrameExtensions[0].slots).every((slot) => !slot.enabled)).toBe(true);
    expect(runtime.pageFrameExtensions[1].slots?.pageNumber?.text).toBe('1');
    expect(runtime.pageFrameExtensions[2].slots?.pageNumber?.text).toBe('VII');
    expect(runtime.primaryPageFrame?.id).toBe('first');
  });

  it('includes the cover in export by default and removes its page and blocks with the binding switch', () => {
    const { blocks, layouts, placements, bindingSettings, runtime } = fixture();
    const options = { bindingSettings, pageFrames: runtime.pageFrames, pageStacks: runtime.pageStacks,
      blockPlacements: placements, noteTruth: { title: '实时题名', description: null } };
    const included = buildExportPreviewModel(blocks, layouts, options);
    expect(included.pageFrames.map((frame) => frame.pageFrameId)).toEqual(['cover', 'first', 'second']);
    expect(included.included).toBe(2);
    expect(exportPreviewRowLabel(included.rows[0])).toBe('实时题名');
    const excluded = buildExportPreviewModel(blocks, layouts, { ...options,
      bindingSettings: { ...bindingSettings, coverPage: { ...bindingSettings.coverPage, exportIncluded: false } } });
    expect(excluded.pageFrames.map((frame) => frame.pageFrameId)).toEqual(['first', 'second']);
    expect(excluded.pageStacks[0].pageFrameIds).toEqual(['first', 'second']);
    expect(excluded.included).toBe(0);
    expect(excluded.excluded).toBe(2);
    expect(blocks[0].content_json).toEqual({ field: 'title' });
    expect(blocks[0].plain_text).toBeNull();
  });

  it('searches cover text and the current bound title at page zero without duplicate title-band results', () => {
    const { input } = fixture();
    const search = { ...input, paperHeader: { titleDraft: '封面题名', descriptionDraft: '' } };
    const results = buildNoteNavigationResults(search, '封面');
    expect(results.map((result) => [result.target, result.blockId, result.pageNumbers])).toEqual([
      ['block', 'title', [0]], ['block', 'text', [0]],
    ]);
    const renamed = buildNoteNavigationResults({ ...search, paperHeader: { ...search.paperHeader, titleDraft: '新题名' } }, '新题名');
    expect(renamed).toHaveLength(1);
    expect(renamed[0].blockId).toBe('title');
  });

  it('reuses full-paper cover underlay and live readonly truth in overview and print', async () => {
    const { input, cover } = fixture();
    const view = render(<NoteTruthBindingProvider value={{ title: '实时期刊题名', description: '' }}>
      <NotePageThumbnail input={input} frame={cover} pageNumber={1} width={200} height={300}
        scale={0.2} selected renderContent onSelectPage={() => {}} />
      <NotePrintLayer {...input} surfaceMode="page" />
    </NoteTruthBindingProvider>);
    expect(view.getByRole('button', { name: 'Read cover page' })).toBeTruthy();
    expect(view.container.querySelector('[data-note-truth-field="title"]')?.textContent).toBe('实时期刊题名');
    const underlay = view.container.querySelector<HTMLElement>('[data-note-cover-underlay]')!;
    expect(underlay.style.width).toBe(`${cover.width}px`);
    expect(underlay.style.height).toBe(`${cover.height}px`);
    expect(underlay.style.left).toBe('0px');
    expect(view.container.querySelectorAll('[data-page-frame-slot]')).toHaveLength(0);
    await act(async () => window.dispatchEvent(new Event('beforeprint')));
    const pages = [...document.querySelectorAll('[data-note-print-page]')];
    expect(pages.map((page) => page.getAttribute('data-page-frame-id'))).toEqual(['cover', 'first', 'second']);
    expect(pages[0].querySelector('[data-note-truth-field="title"]')?.textContent).toBe('实时期刊题名');
    expect(pages[0].querySelector('[data-note-cover-underlay]')).toBeTruthy();
    expect(pages[0].querySelectorAll('[data-page-frame-slot]')).toHaveLength(0);
    act(() => window.dispatchEvent(new Event('afterprint')));
  });

  it('omits the cover from print while leaving overview available when export is disabled', async () => {
    const { input, cover } = fixture(false);
    const view = render(<>
      <NotePageThumbnail input={input} frame={cover} pageNumber={1} width={200} height={300}
        scale={0.2} selected renderContent={false} onSelectPage={() => {}} />
      <NotePrintLayer {...input} surfaceMode="page" />
    </>);
    expect(view.getByRole('button', { name: 'Read cover page' })).toBeTruthy();
    await act(async () => window.dispatchEvent(new Event('beforeprint')));
    expect([...document.querySelectorAll('[data-note-print-page]')].map((page) => page.getAttribute('data-page-frame-id')))
      .toEqual(['first', 'second']);
    act(() => window.dispatchEvent(new Event('afterprint')));
  });
});
