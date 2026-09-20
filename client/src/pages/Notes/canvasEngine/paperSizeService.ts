import { getPageFramePhysicalMapping } from './pageFramePrintScaleService';
import { createPageFrameTemplate, inferPageFrameTemplateId, PAGE_FRAME_TEMPLATE_PRESETS } from './pageFrameTemplateService';
import type { NotebookPaperDefault, PageFrameCollectionModel, PageFrameModel, PageFrameTemplateId } from './types';

export type PaperUnit = 'mm' | 'cm';
export type PaperSizeTemplateId = Exclude<PageFrameTemplateId, 'screen_note' | 'custom'>;
export interface PaperGeometryOptions { coverFrameId?: string | null }

/** Web remains the existing growing-page presentation, outside the paper family. */
export const PAPER_SIZE_PRESETS = PAGE_FRAME_TEMPLATE_PRESETS.filter(
  (preset) => preset.templateId !== 'screen_note' && preset.templateId !== 'custom',
);

export function isWebPaperCollection(collection: PageFrameCollectionModel): boolean {
  return collection.pageFrames.some((frame) => frame.templateId === 'screen_note' || frame.background?.kind === 'screen');
}

export function getNotebookPaperDefault(collection: PageFrameCollectionModel): NotebookPaperDefault {
  if (collection.paperDefault) return { ...collection.paperDefault };
  const frame = collection.pageFrames.find((page) => page.id === collection.primaryFrameId) || collection.pageFrames[0];
  const template = createPageFrameTemplate(frame?.templateId || inferPageFrameTemplateId(frame?.pageSize));
  return {
    templateId: frame?.templateId || template.templateId,
    pageSize: frame?.pageSize || template.pageSize,
    width: frame?.paperSizeOverride ? template.width : frame?.width || template.width,
    height: frame?.paperSizeOverride ? template.height : frame?.height || template.height,
  };
}

/** Clears only the single-page geometry, preserving the source page's live walls. */
export function inheritNotebookPaperGeometry(collection: PageFrameCollectionModel, source: PageFrameModel): PageFrameModel {
  if (!collection.paperDefault || isWebPaperCollection(collection)) return source;
  const { paperSizeOverride: _override, paperSizeReferenceWidth: _reference, ...frame } = source;
  return { ...frame, ...collection.paperDefault };
}

function physicalScale(frame: PageFrameModel): number {
  return getPageFramePhysicalMapping(frame.pageSize || 'A4', frame.width, frame.templateId,
    frame.paperSizeReferenceWidth).physicalScale;
}

export function internalLengthToPaper(value: number, unit: PaperUnit, frame: PageFrameModel): number {
  return value * physicalScale(frame) * 25.4 / 96 / (unit === 'cm' ? 10 : 1);
}

export function paperLengthToInternal(value: number, unit: PaperUnit, frame: PageFrameModel): number {
  return value * (unit === 'cm' ? 10 : 1) / (physicalScale(frame) * 25.4 / 96);
}

export function getPagePaperDimensions(frame: PageFrameModel, unit: PaperUnit = 'mm') {
  return { width: internalLengthToPaper(frame.width, unit, frame), height: internalLengthToPaper(frame.height, unit, frame) };
}

/** Geometry edits keep stack identities and first content-page origins stable. */
export function restackPaperGeometry(before: PageFrameCollectionModel, after: PageFrameCollectionModel,
  options: PaperGeometryOptions = {}): PageFrameCollectionModel {
  const byId = new Map(after.pageFrames.map((frame) => [frame.id, frame]));
  const coverId = options.coverFrameId;
  if (coverId) {
    const oldCover = before.pageFrames.find((frame) => frame.id === coverId);
    const cover = byId.get(coverId);
    // A3 puts its cover above the unchanged content origin. Hold that bottom edge.
    if (oldCover && cover) byId.set(coverId, { ...cover, y: oldCover.y + oldCover.height - cover.height });
  }
  for (const stack of after.pageStacks || []) {
    const geometryChanged = stack.frameIds.some((id) => {
      const oldFrame = before.pageFrames.find((frame) => frame.id === id);
      const frame = byId.get(id);
      return frame && (!oldFrame || frame.width !== oldFrame.width || frame.height !== oldFrame.height);
    });
    if (!geometryChanged) continue;
    let previous: PageFrameModel | undefined;
    for (const id of stack.frameIds) {
      const frame = byId.get(id);
      if (!frame || id === coverId) continue;
      const next = previous ? { ...frame, y: previous.y + previous.height + stack.layout.gap } : frame;
      byId.set(id, next);
      previous = next;
    }
  }
  return { ...after, pageFrames: after.pageFrames.map((frame) => byId.get(frame.id)!) };
}

export function setNotebookPaperPreset(collection: PageFrameCollectionModel, templateId: PageFrameTemplateId,
  options: PaperGeometryOptions = {}): PageFrameCollectionModel {
  if (isWebPaperCollection(collection) || !PAPER_SIZE_PRESETS.some((preset) => preset.templateId === templateId)) return collection;
  const template = createPageFrameTemplate(templateId);
  const paperDefault = { templateId: template.templateId, pageSize: template.pageSize,
    width: template.width, height: template.height };
  const next = { ...collection, paperDefault };
  return restackPaperGeometry(collection, { ...next,
    pageFrames: collection.pageFrames.map((frame) => inheritNotebookPaperGeometry(next, frame)),
  }, options);
}

export function resizePagePaper(collection: PageFrameCollectionModel, frameId: string,
  size: { width: number; height: number }, unit: PaperUnit = 'mm',
  options: PaperGeometryOptions = {}): PageFrameCollectionModel {
  const frame = collection.pageFrames.find((page) => page.id === frameId);
  if (!frame || isWebPaperCollection(collection) || !Number.isFinite(size.width) || !Number.isFinite(size.height)
    || size.width <= 0 || size.height <= 0) return collection;
  const width = Math.max(frame.contentInset.left + frame.contentInset.right + 240, paperLengthToInternal(size.width, unit, frame));
  const height = Math.max(frame.contentInset.top + frame.contentInset.bottom + 320, paperLengthToInternal(size.height, unit, frame));
  return restackPaperGeometry(collection, { ...collection, paperDefault: getNotebookPaperDefault(collection),
    pageFrames: collection.pageFrames.map((page) => page.id === frameId ? { ...page, width, height,
      paperSizeOverride: true, paperSizeReferenceWidth: frame.paperSizeReferenceWidth || frame.width } : page),
  }, options);
}

export function restorePagePaperDefault(collection: PageFrameCollectionModel, frameId: string,
  options: PaperGeometryOptions = {}): PageFrameCollectionModel {
  if (isWebPaperCollection(collection) || !collection.pageFrames.some((frame) => frame.id === frameId)) return collection;
  const next = { ...collection, paperDefault: getNotebookPaperDefault(collection) };
  return restackPaperGeometry(collection, { ...next, pageFrames: collection.pageFrames.map((frame) => frame.id === frameId
    ? inheritNotebookPaperGeometry(next, frame) : frame) }, options);
}
