import { buildPageFrameWallEdit, type PageFrameWallSnapshot } from './pageFrameWallService';
import { normalizePageFrameCollection } from './pageFrameCollectionService';
import { getNotebookPaperDefault, inheritNotebookPaperGeometry, restackPaperGeometry } from './paperSizeService';
import { resolveDocumentPageFlowPlan, type ResolveDocumentPageFlowPlanInput } from './documentPageFlowService';
import { noteBlocksToPageFlow } from './notePageFlowService';
import type { DocumentTypographyProfile, PageFrameCollectionModel } from './types';
import type { NoteBlock, TextBlockContentV1 } from './runtimeDataTypes';
import type { BlockBoxLayout } from './runtimeLayout';

export interface PaperSizeSnapshot extends PageFrameWallSnapshot {
  removeFrameIds?: string[];
  addedFrameIds?: string[];
  coverFrameId?: string | null;
}

/** Reflow measures from frame geometry, while its affiliation writes retain the
 * persisted placement. Rendered auto widths are only a fallback for unplaced rows. */
export function resolvePaperSizeEditLayouts(blocks: NoteBlock[], layoutDrafts: Record<string, BlockBoxLayout>,
  fallbackLayouts: Record<string, BlockBoxLayout>): Record<string, BlockBoxLayout> {
  const layouts = { ...fallbackLayouts };
  for (const block of blocks) {
    const layout = layoutDrafts[block.id] || block.canvas_layout as unknown as BlockBoxLayout | undefined;
    if (layout) layouts[block.id] = layout;
  }
  return layouts;
}

/** History owns geometry and only the continuation pages created by that edit.
 * Page-menu additions and later binding topology must survive geometry replay. */
export function reconcilePaperSizeSnapshot(current: PageFrameCollectionModel, snapshot: PaperSizeSnapshot,
  occupiedFrameIds: ReadonlySet<string> = new Set()): PaperSizeSnapshot {
  const removed = new Set((snapshot.removeFrameIds || []).filter((id) => !occupiedFrameIds.has(id)));
  const target = new Map(snapshot.collection.pageFrames.map((frame) => [frame.id, frame]));
  const defaults = snapshot.collection.paperDefault;
  const inheritance = { ...snapshot.collection, paperDefault: defaults || getNotebookPaperDefault(snapshot.collection) };
  const frames = current.pageFrames.filter((frame) => !removed.has(frame.id)).map((frame) => {
    const replacement = target.get(frame.id);
    if (replacement) return replacement;
    return !frame.paperSizeOverride ? inheritNotebookPaperGeometry(inheritance, frame) : frame;
  });
  for (const frame of snapshot.collection.pageFrames) {
    if (snapshot.addedFrameIds?.includes(frame.id) && !frames.some((entry) => entry.id === frame.id)) frames.push(frame);
  }
  const ids = new Set(frames.map((frame) => frame.id));
  const stacks = (current.pageStacks || []).map((stack) => ({ ...stack, frameIds: stack.frameIds.filter((id) => ids.has(id)) }));
  for (const targetStack of snapshot.collection.pageStacks || []) {
    let stack = stacks.find((entry) => entry.id === targetStack.id);
    const missing = targetStack.frameIds.filter((id) => ids.has(id) && !stacks.some((entry) => entry.frameIds.includes(id)));
    if (!missing.length) continue;
    if (!stack) { stack = { ...targetStack, frameIds: [] }; stacks.push(stack); }
    for (const id of missing) {
      const targetIndex = targetStack.frameIds.indexOf(id);
      const previous = targetStack.frameIds.slice(0, targetIndex).reverse().find((entry) => stack!.frameIds.includes(entry));
      stack.frameIds.splice(previous ? stack.frameIds.indexOf(previous) + 1 : 0, 0, id);
    }
  }
  const collection = normalizePageFrameCollection({ ...current, paperDefault: defaults, pageFrames: frames,
    pageStacks: stacks.filter((stack) => stack.frameIds.length),
    selectedFrameId: ids.has(current.selectedFrameId || '') ? current.selectedFrameId : snapshot.collection.selectedFrameId,
  });
  // A matching topology can replay the exact authored geometry; a newer page
  // order needs stacking against that order to avoid overlapping paper.
  const sameTopology = JSON.stringify(current.pageStacks?.map((stack) => [stack.id, stack.frameIds]))
    === JSON.stringify(snapshot.collection.pageStacks?.map((stack) => [stack.id, stack.frameIds]));
  return { ...snapshot, collection: sameTopology ? collection
    : restackPaperGeometry(current, collection, { coverFrameId: snapshot.coverFrameId }) };
}

/** Geometry, manual clamps and flow affiliations share one collection transaction.
 * Text and stored auto coordinates are never resized to match the paper. */
export function buildPaperSizeEdit(input: Parameters<typeof buildPageFrameWallEdit>[0] & {
  typography: DocumentTypographyProfile;
  coverFrameId?: string | null;
  textDrafts?: Record<string, string>;
  bindingSettings?: ResolveDocumentPageFlowPlanInput['bindingSettings'];
  flowDrafts?: Record<string, TextBlockContentV1>;
  measureTextLines?: ResolveDocumentPageFlowPlanInput['measureTextLines'];
}): { before: PaperSizeSnapshot; after: PaperSizeSnapshot } {
  const edit: { before: PaperSizeSnapshot; after: PaperSizeSnapshot } = buildPageFrameWallEdit(input);
  edit.before.coverFrameId = input.coverFrameId;
  edit.after.coverFrameId = input.coverFrameId;
  const layouts = { ...input.layoutDrafts };
  for (const block of input.blocks) {
    if (!layouts[block.id] && block.canvas_layout) layouts[block.id] = block.canvas_layout as unknown as BlockBoxLayout;
  }
  for (const { block, layout } of edit.after.layoutUpdates) layouts[block.id] = layout;
  const plan = resolveDocumentPageFlowPlan({
    collection: edit.after.collection, coordinateContract: input.coordinateContract,
    blocks: noteBlocksToPageFlow(input.blocks, layouts, input.textDrafts || {}, input.flowDrafts || {}),
    documentTypography: input.typography, coverFrameId: input.coverFrameId, bindingSettings: input.bindingSettings,
    measureTextLines: input.measureTextLines,
  });
  edit.after.collection = plan.collection;
  edit.before.removeFrameIds = plan.appendedFrameIds;
  edit.after.addedFrameIds = plan.appendedFrameIds;
  for (const update of plan.placementUpdates) {
    const block = input.blocks.find((candidate) => candidate.id === update.blockId);
    const beforeLayout = layouts[update.blockId];
    if (!block || !beforeLayout) continue;
    if (!edit.before.layoutUpdates.some((entry) => entry.block.id === block.id)) {
      edit.before.layoutUpdates.push({ block, layout: beforeLayout });
    }
    const existing = edit.after.layoutUpdates.find((entry) => entry.block.id === block.id);
    if (existing) existing.layout = update.layout;
    else edit.after.layoutUpdates.push({ block, layout: update.layout });
  }
  return edit;
}
