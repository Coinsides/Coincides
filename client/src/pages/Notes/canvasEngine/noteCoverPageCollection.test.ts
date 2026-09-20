import { describe, expect, it } from 'vitest';
import { createDefaultNoteBindingSettings } from '../../../../../shared/types/noteBinding';
import { buildNoteCanvasRuntimeModel, createPrimaryPageFrame, createViewport } from './engineModel';
import { resolveDocumentPageFlowPlan, type PageFlowBlock } from './documentPageFlowService';
import { createPageFrameCollectionSeed } from './pageFrameCollectionService';
import { addNoteCoverPage, removeNoteCoverPage } from './noteCoverPageCollection';

function seed() {
  return createPageFrameCollectionSeed(createPrimaryPageFrame({ id: 'content-page', x: 100, y: 250 }));
}

describe('A3 cover page collection', () => {
  it('adds a preceding cover in its own stack while keeping the content page identity and coordinates', () => {
    const original = seed();
    const before = structuredClone(original);
    const result = addNoteCoverPage(original, 'cover-page');
    expect(result.pageFrames.map((frame) => frame.id)).toEqual(['cover-page', 'content-page']);
    expect(result.primaryFrameId).toBe(original.primaryFrameId);
    expect(result.primaryStackId).toBe(original.primaryStackId);
    expect(result.pageFrames[1]).toEqual(original.pageFrames[0]);
    expect(result.pageFrames[0]).toMatchObject({ id: 'cover-page', role: 'secondary_page_frame', exportable: true,
      x: original.pageFrames[0].x, width: original.pageFrames[0].width, height: original.pageFrames[0].height });
    expect(result.pageFrames[0].y + result.pageFrames[0].height).toBeLessThan(original.pageFrames[0].y);
    expect(result.pageStacks?.find((stack) => stack.frameIds.includes('cover-page'))?.frameIds).toEqual(['cover-page']);
    expect(result.selectedFrameId).toBe('cover-page');
    expect(original).toEqual(before);
  });

  it('removes only the cover frame and its stack, selecting the original content page', () => {
    const original = seed();
    expect(removeNoteCoverPage(addNoteCoverPage(original, 'cover-page'), 'cover-page')).toEqual(original);
  });

  it('projects a real mechanical page zero and keeps folio furniture off the cover', () => {
    const collection = addNoteCoverPage(seed(), 'cover-page');
    const settings = createDefaultNoteBindingSettings();
    settings.coverPage.frameId = 'cover-page';
    const runtime = buildNoteCanvasRuntimeModel({ mode: 'page', primaryPageFrame: collection.pageFrames[1],
      pageFrames: collection.pageFrames, pageStacks: collection.pageStacks, viewport: createViewport(), blockPlacements: [],
      bindingSettings: settings });
    const cover = runtime.pageFrameExtensions.find((frame) => frame.frameId === 'cover-page');
    const content = runtime.pageFrameExtensions.find((frame) => frame.frameId === 'content-page');
    expect(cover).toMatchObject({ isCover: true, mechanicalPageNumber: 0, headerFooterEnabled: false,
      pageNumberEnabled: false, coverExportIncluded: true });
    expect(content).toMatchObject({ isCover: false, mechanicalPageNumber: 1 });
    expect(content?.slots?.pageNumber?.text).toBe('1');
  });

  it('leaves the whole cover outside content reflow even for a legacy auto-width resident', () => {
    const collection = addNoteCoverPage(seed(), 'cover-page');
    const resident: PageFlowBlock = { blockId: 'cover-writing', kind: 'text', text: '封面手摆文字',
      layout: { x: 31, y: 57, width: 220, height: 48, width_mode: 'auto', frame_id: 'cover-page',
        coordinate_space: 'page_frame_local', surface: 'formal_page' } };
    const body: PageFlowBlock = { ...resident, blockId: 'body-writing', text: '正文从内容页开始',
      layout: { ...resident.layout, frame_id: 'content-page' } };
    const before = structuredClone({ collection, resident });
    const plan = resolveDocumentPageFlowPlan({ collection, coverFrameId: 'cover-page', blocks: [resident, body] });
    expect(plan.excludedBlockIds).toContain('cover-writing');
    expect(plan.fragments.every((fragment) => fragment.frameId !== 'cover-page')).toBe(true);
    expect(plan.fragments.some((fragment) => fragment.blockId === 'body-writing' && fragment.frameId === 'content-page')).toBe(true);
    expect(plan.placementUpdates.every((update) => update.blockId !== 'cover-writing')).toBe(true);
    expect({ collection, resident }).toEqual(before);
  });
});
