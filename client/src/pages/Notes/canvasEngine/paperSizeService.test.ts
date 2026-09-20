import { describe, expect, it } from 'vitest';
import { createPrimaryPageFrame } from './engineModel';
import { createPageFrameCollectionSeed, duplicatePageFrame, insertPageFrameAfter, normalizePageFrameCollection,
  pageFrameCollectionFromMetadata, writePageFrameCollectionMetadata } from './pageFrameCollectionService';
import { appendPageFrameToStack } from './pageStackCollectionService';
import { resolveDocumentPageFlowPlan } from './documentPageFlowService';
import { createPageFrameTemplate } from './pageFrameTemplateService';
import { getPageFramePhysicalMapping } from './pageFramePrintScaleService';
import { addNoteCoverPage } from './noteCoverPageCollection';
import { getPagePaperDimensions, internalLengthToPaper, paperLengthToInternal, PAPER_SIZE_PRESETS,
  resizePagePaper, restorePagePaperDefault, setNotebookPaperPreset } from './paperSizeService';

function seed(templateId: 'a4_portrait' | 'screen_note' = 'a4_portrait') {
  return createPageFrameCollectionSeed(createPrimaryPageFrame({ id: 'p1', templateId, x: 30, y: 40 }));
}

describe('A5 paper freedom geometry', () => {
  it('offers eight paper presets while preserving all three existing geometries', () => {
    expect(PAPER_SIZE_PRESETS.map((preset) => preset.templateId)).toEqual([
      'a5_portrait', 'a5_landscape', 'a4_portrait', 'a4_landscape', 'a3_portrait', 'a3_landscape', 'letter_portrait', 'legal_portrait',
    ]);
    expect(createPageFrameTemplate('a4_portrait')).toMatchObject({ width: 904, height: 1278 });
    expect(createPageFrameTemplate('letter_portrait')).toMatchObject({ width: 904, height: 1170 });
    expect(createPageFrameTemplate('screen_note')).toMatchObject({ width: 1120, height: 720,
      contentInset: { top: 48, right: 64, bottom: 64, left: 64 }, exportable: false });
  });

  it.each(PAPER_SIZE_PRESETS)('$templateId maps physical units round-trip without storage rounding', (preset) => {
    const collection = setNotebookPaperPreset(seed(), preset.templateId);
    const frame = collection.pageFrames[0];
    for (const unit of ['cm', 'mm'] as const) {
      for (const value of [1.25, 10, 29.7, 210]) {
        expect(internalLengthToPaper(paperLengthToInternal(value, unit, frame), unit, frame)).toBeCloseTo(value, 10);
      }
    }
    const nominal = getPageFramePhysicalMapping(frame.pageSize!, frame.width, frame.templateId);
    expect(getPagePaperDimensions(frame).width).toBeCloseTo(nominal.physicalWidthMm!, 10);
    const physical = getPagePaperDimensions(frame);
    const resized = resizePagePaper(collection, frame.id, { width: physical.width + 20, height: physical.height + 30 });
    expect(getPagePaperDimensions(resized.pageFrames[0]).width).toBeCloseTo(physical.width + 20, 10);
    expect(getPagePaperDimensions(resized.pageFrames[0]).height).toBeCloseTo(physical.height + 30, 10);
    expect(resized.pageFrames[0].contentInset).toEqual(frame.contentInset);
  });

  it('captures a stable default before resizing the primary page and restores it after reload', () => {
    const original = seed();
    const snapshot = structuredClone(original);
    const changed = normalizePageFrameCollection(resizePagePaper(original, 'p1', { width: 17, height: 22 }, 'cm'));
    expect(changed.paperDefault).toMatchObject({ width: 904, height: 1278 });
    expect(changed.pageFrames[0].paperSizeOverride).toBe(true);
    expect(pageFrameCollectionFromMetadata(writePageFrameCollectionMetadata({}, changed))).toEqual(changed);
    const appended = appendPageFrameToStack(changed, changed.primaryStackId!, 'p1');
    expect(appended.pageFrames[1]).toMatchObject({ width: 904, height: 1278 });
    expect(appended.pageFrames[1].paperSizeOverride).toBeUndefined();
    expect(appended.pageFrames[1].y).toBe(changed.pageFrames[0].y + changed.pageFrames[0].height + 80);
    const inserted = insertPageFrameAfter(changed, 'p1');
    expect(inserted.pageFrames[1]).toMatchObject({ width: 904, height: 1278 });
    const duplicate = duplicatePageFrame(changed, 'p1');
    expect(duplicate.pageFrames[1]).toMatchObject({ width: changed.pageFrames[0].width, paperSizeOverride: true });
    const restored = restorePagePaperDefault(changed, 'p1');
    expect(restored.pageFrames[0]).toEqual(original.pageFrames[0]);
    expect(original).toEqual(snapshot);
  });

  it('keeps the physical density of historically resized pages through repeated overrides', () => {
    const original = seed();
    original.pageFrames[0].width = 1000;
    const changed = resizePagePaper(original, 'p1', { width: 230, height: 300 });
    expect(changed.pageFrames[0].paperSizeReferenceWidth).toBe(1000);
    expect(getPagePaperDimensions(changed.pageFrames[0]).width).toBeCloseTo(230, 10);
    const again = resizePagePaper(changed, 'p1', { width: 250, height: 320 });
    expect(getPagePaperDimensions(again.pageFrames[0]).width).toBeCloseTo(250, 10);
    expect(again.paperDefault?.width).toBe(1000);
  });

  it('changes the complete family and restacks using the owned gap without changing walls or stack identities', () => {
    const original = seed();
    original.pageStacks![0].layout.gap = 123;
    const pages = appendPageFrameToStack(original, original.primaryStackId!, 'p1', { id: 'p2' });
    const odd = resizePagePaper(pages, 'p1', { width: 180, height: 220 });
    const changed = setNotebookPaperPreset(odd, 'a3_landscape');
    expect(changed.pageFrames.every((frame) => frame.templateId === 'a3_landscape' && !frame.paperSizeOverride)).toBe(true);
    expect(changed.pageFrames[1].y).toBe(changed.pageFrames[0].y + changed.pageFrames[0].height + 123);
    expect(changed.pageFrames.map((frame) => frame.contentInset)).toEqual(pages.pageFrames.map((frame) => frame.contentInset));
    expect(changed.pageStacks).toEqual(pages.pageStacks);
  });

  it('keeps the cover preceding the original content origin and independent from content flow', () => {
    const original = addNoteCoverPage(seed(), 'cover');
    const changed = setNotebookPaperPreset(original, 'a3_portrait', { coverFrameId: 'cover' });
    expect(changed.pageFrames[0].y + changed.pageFrames[0].height).toBeCloseTo(original.pageFrames[0].y + original.pageFrames[0].height, 10);
    expect(changed.pageFrames[1].y).toBe(original.pageFrames[1].y);
    expect(changed.pageStacks).toEqual(original.pageStacks);
  });

  it('reflows across an odd page and appends a notebook-default page while leaving stored coordinates unchanged', () => {
    const original = resizePagePaper(seed(), 'p1', { width: 160, height: 160 });
    const layout = { x: 0, y: 27, width: 400, height: 1500, width_mode: 'auto' as const,
      coordinate_space: 'page_frame_local' as const, surface: 'formal_page' as const, frame_id: 'p1' };
    const before = { ...layout };
    const plan = resolveDocumentPageFlowPlan({ collection: original, blocks: [{ blockId: 'text', kind: 'text', text: 'abcdefghij', layout }],
      measureTextLines: ({ startOffset = 0 }) => ({ lines: Array.from({ length: 10 - startOffset }, (_, index) => ({
        startOffset: startOffset + index, endOffset: startOffset + index + 1, heightPx: 200, widthPx: 30,
      })) }),
    });
    expect(plan.appendedFrameIds.length).toBeGreaterThan(0);
    expect(plan.collection.pageFrames[1]).toMatchObject({ width: 904, height: 1278 });
    expect(plan.fragments[0].textRange?.end).toBeLessThan(plan.fragments[1].textRange!.end);
    expect(layout).toEqual(before);
  });

  it('leaves the living Web long page unchanged for every paper operation', () => {
    const web = seed('screen_note');
    expect(setNotebookPaperPreset(web, 'a5_portrait')).toBe(web);
    expect(resizePagePaper(web, 'p1', { width: 200, height: 250 })).toBe(web);
    expect(restorePagePaperDefault(web, 'p1')).toBe(web);
    expect(setNotebookPaperPreset(seed(), 'screen_note').pageFrames[0].templateId).toBe('a4_portrait');
  });
});
