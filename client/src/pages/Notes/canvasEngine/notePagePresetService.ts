import { createPrimaryPageFrame } from './engineModel';
import { createPageFrameCollectionSeed } from './pageFrameCollectionService';
import { resolveWorldRect, selectPlacementFrame, type CoordinateContract } from './placementContractService';
import type { BlockBoxLayout } from './runtimeLayout';
import type { PageFrameCollectionModel } from './types';

export const NOTE_PAGE_PRESETS = [
  { value: 'a4_portrait', label: 'A4' },
  { value: 'letter_portrait', label: 'Letter' },
  { value: 'screen_note', label: 'Web long page' },
] as const;
export type NotePagePreset = typeof NOTE_PAGE_PRESETS[number]['value'];
export const DEFAULT_NOTE_PAGE_PRESET: NotePagePreset = 'a4_portrait';

export function isNotePagePreset(value: unknown): value is NotePagePreset {
  return NOTE_PAGE_PRESETS.some((preset) => preset.value === value);
}

export function createNotePagePresetSeed(preset: NotePagePreset = DEFAULT_NOTE_PAGE_PRESET) {
  return createPageFrameCollectionSeed(createPrimaryPageFrame({ templateId: preset }));
}

/** The stored frame is the floor. Content determines the long page's current
 * extent on every render and reload; growing it never creates another frame. */
export function growWebPageCollection(
  collection: PageFrameCollectionModel,
  layouts: BlockBoxLayout[],
  contract: CoordinateContract = 'v1',
): PageFrameCollectionModel {
  const pageFrames = collection.pageFrames.map((frame) => {
    if (frame.templateId !== 'screen_note') return frame;
    let height = frame.height;
    for (const layout of layouts) {
      if (layout.surface === 'tray') continue;
      const owner = selectPlacementFrame(layout, collection.pageFrames, contract);
      if (owner?.id !== frame.id || layout.surface === 'canvas_workspace') continue;
      const rect = resolveWorldRect(layout, frame, contract);
      height = Math.max(height, Math.ceil(rect.y + rect.height - frame.y + frame.contentInset.bottom));
    }
    return height === frame.height ? frame : { ...frame, height };
  });
  return { ...collection, pageFrames };
}

/** Reading adds the primary top inset separately. Never impose A4's minimum
 * height or its 760px content-width filter on Letter and Web presets. */
export function measurePresetPageContentHeight(collection: PageFrameCollectionModel, layouts: BlockBoxLayout[], contract: CoordinateContract = 'v1') {
  let bottom = Math.max(0, ...collection.pageFrames.map((frame) => frame.y + frame.height));
  for (const layout of layouts) {
    if (layout.surface === 'tray' || layout.surface === 'canvas_workspace') continue;
    const frame = selectPlacementFrame(layout, collection.pageFrames, contract);
    if (!frame) continue;
    const rect = resolveWorldRect(layout, frame, contract);
    bottom = Math.max(bottom, rect.y + rect.height + frame.contentInset.bottom);
  }
  const primary = collection.pageFrames.find((frame) => frame.id === collection.primaryFrameId) || collection.pageFrames[0];
  return Math.max(0, bottom - (primary?.contentInset.top || 0));
}
