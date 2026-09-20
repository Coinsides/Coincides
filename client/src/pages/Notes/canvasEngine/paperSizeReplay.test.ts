import { describe, expect, it } from 'vitest';
import { createPrimaryPageFrame } from './engineModel';
import { createPageFrameCollectionSeed, deletePageFrameFromCollection, insertPageFrameAfter } from './pageFrameCollectionService';
import { appendPageFrameToStack } from './pageStackCollectionService';
import { addNoteCoverPage, removeNoteCoverPage } from './noteCoverPageCollection';
import { buildPaperSizeEdit, reconcilePaperSizeSnapshot } from './paperSizeEditService';
import { setNotebookPaperPreset } from './paperSizeService';
import { DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE } from './typographyProfileService';
import type { NoteBlock } from './runtimeDataTypes';
import type { PageFrameCollectionModel } from './types';

function seed() {
  const first = createPageFrameCollectionSeed(createPrimaryPageFrame({ id: 'first', x: 40, y: 70 }));
  const pages = appendPageFrameToStack(first, first.primaryStackId!, 'first', { id: 'second' });
  return setNotebookPaperPreset(pages, 'a4_portrait');
}

function edit(before: PageFrameCollectionModel = seed(), blocks: NoteBlock[] = [], coverFrameId?: string) {
  return buildPaperSizeEdit({ before, after: setNotebookPaperPreset(before, 'a5_portrait', { coverFrameId }),
    blocks, objects: [], placements: [], coordinateContract: 'v2', coverFrameId,
    typography: DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
    measureTextLines: ({ text, startOffset = 0 }) => ({
      lines: Array.from({ length: text.length - startOffset }, (_, index) => ({
        startOffset: startOffset + index, endOffset: startOffset + index + 1, widthPx: 20, heightPx: 250,
      })),
    }),
  });
}

const ids = (collection: PageFrameCollectionModel) => collection.pageFrames.map((frame) => frame.id);

describe('A5 paper history preserves page-menu and binding topology', () => {
  it('recovers the historical notebook default for later pages when undo predates explicit paper defaults', () => {
    const before = seed();
    delete before.paperDefault;
    const change = edit(before);
    const current = insertPageFrameAfter(change.after.collection, 'second', { id: 'later-page' });
    const undone = reconcilePaperSizeSnapshot(current, change.before).collection;
    expect(ids(undone)).toEqual(ids(current));
    expect(undone.pageFrames.find((frame) => frame.id === 'later-page')).toMatchObject({
      templateId: 'a4_portrait', width: 904, height: 1278,
    });
  });

  it('keeps a later independent page and its stack when undoing and redoing a notebook paper change', () => {
    const change = edit();
    const current = insertPageFrameAfter(change.after.collection, 'second', { id: 'later-page' });
    const addedStack = current.pageStacks!.find((stack) => stack.frameIds.includes('later-page'))!;
    addedStack.displayName = 'Later chapter';
    addedStack.numbering = { enabled: true, startAt: 8 };
    addedStack.layout.gap = 117;
    const beforeReplay = structuredClone(current);
    const undone = reconcilePaperSizeSnapshot(current, change.before).collection;
    expect(ids(undone)).toEqual(ids(current));
    expect(undone.pageStacks!.find((stack) => stack.id === addedStack.id)).toEqual(addedStack);
    expect(undone.pageFrames.find((frame) => frame.id === 'later-page')).toMatchObject({
      templateId: 'a4_portrait', width: 904, height: 1278,
    });
    expect(undone.selectedFrameId).toBe('later-page');
    const redone = reconcilePaperSizeSnapshot(undone, change.after).collection;
    expect(ids(redone)).toEqual(ids(current));
    expect(redone.pageFrames.every((frame) => frame.templateId === 'a5_portrait')).toBe(true);
    expect(redone.pageStacks!.find((stack) => stack.id === addedStack.id)).toEqual(addedStack);
    expect(current).toEqual(beforeReplay);
  });

  it('does not recreate an old page explicitly removed after the paper change', () => {
    const change = edit();
    const current = deletePageFrameFromCollection(change.after.collection, 'second');
    const undone = reconcilePaperSizeSnapshot(current, change.before).collection;
    expect(ids(undone)).toEqual(['first']);
    expect(undone.pageStacks!.flatMap((stack) => stack.frameIds)).toEqual(['first']);
    const redone = reconcilePaperSizeSnapshot(undone, change.after).collection;
    expect(ids(redone)).toEqual(['first']);
    expect(redone.pageStacks!.flatMap((stack) => stack.frameIds)).toEqual(['first']);
  });

  it('removes only empty continuation pages owned by the edit and restores those continuations on redo', () => {
    const block: NoteBlock = { id: 'flow-text', placement_id: 'flow-placement', block_type: 'paragraph', title: null,
      content_json: {}, plain_text: 'abcdefghijklmnopqrst', metadata: {}, order_index: 0,
      source_references: [], display_overrides_json: {}, canvas_layout: {
        x: 5, y: 31, width: 760, height: 200, width_mode: 'auto', frame_id: 'first',
        coordinate_space: 'page_frame_local', surface: 'formal_page', boundary_role: 'inside',
      } };
    const change = edit(seed(), [block]);
    const appended = change.before.removeFrameIds!;
    expect(appended.length).toBeGreaterThan(1);
    const occupiedId = appended[0];
    const current = insertPageFrameAfter(change.after.collection, 'second', { id: 'later-page' });
    const occupied = new Set([occupiedId, 'later-page']);
    const undone = reconcilePaperSizeSnapshot(current, change.before, occupied).collection;
    expect(ids(undone)).toContain(occupiedId);
    expect(ids(undone)).toContain('later-page');
    expect(ids(undone)).toContain('first');
    expect(ids(undone)).toContain('second');
    for (const id of appended.slice(1)) expect(ids(undone)).not.toContain(id);
    const redone = reconcilePaperSizeSnapshot(undone, change.after, occupied).collection;
    for (const id of appended) expect(ids(redone)).toContain(id);
    expect(ids(redone)).toContain('later-page');
    expect(new Set(ids(redone)).size).toBe(ids(redone).length);
    expect(redone.pageStacks!.find((stack) => stack.id === change.after.collection.primaryStackId)!.frameIds)
      .toEqual(change.after.collection.pageStacks!.find((stack) => stack.id === change.after.collection.primaryStackId)!.frameIds);
  });

  it('retains a later added binding cover, its independent stack and current page numbering settings', () => {
    const change = edit();
    const current = addNoteCoverPage(change.after.collection, 'later-cover');
    const contentStack = current.pageStacks!.find((stack) => stack.id === current.primaryStackId)!;
    contentStack.displayName = 'Bound section';
    contentStack.numbering = { enabled: true, startAt: 12 };
    contentStack.layout.gap = 144;
    const coverStack = current.pageStacks!.find((stack) => stack.frameIds.includes('later-cover'))!;
    const undone = reconcilePaperSizeSnapshot(current, { ...change.before, coverFrameId: 'later-cover' }).collection;
    expect(ids(undone)[0]).toBe('later-cover');
    expect(undone.primaryFrameId).toBe('first');
    expect(undone.pageStacks!.find((stack) => stack.id === coverStack.id)).toEqual(coverStack);
    expect(undone.pageStacks!.find((stack) => stack.id === contentStack.id)).toEqual(contentStack);
    expect(undone.pageFrames[0].y + undone.pageFrames[0].height).toBeLessThan(undone.pageFrames[1].y);
    const redone = reconcilePaperSizeSnapshot(undone, { ...change.after, coverFrameId: 'later-cover' }).collection;
    expect(ids(redone)[0]).toBe('later-cover');
    expect(redone.primaryFrameId).toBe('first');
    expect(redone.pageStacks!.find((stack) => stack.id === coverStack.id)?.frameIds).toEqual(['later-cover']);
  });

  it('does not resurrect a cover removed through binding after the paper edit', () => {
    const before = addNoteCoverPage(seed(), 'old-cover');
    const change = edit(before, [], 'old-cover');
    const current = removeNoteCoverPage(change.after.collection, 'old-cover');
    const undone = reconcilePaperSizeSnapshot(current, { ...change.before, coverFrameId: null }).collection;
    expect(ids(undone)).toEqual(['first', 'second']);
    expect(undone.pageStacks!.some((stack) => stack.frameIds.includes('old-cover'))).toBe(false);
  });
});
