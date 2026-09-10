import type { NoteBlock, TextBlockContentV1 } from './runtimeDataTypes';
import { supportsTextFlowBlockNavigation } from './textFlowBlockNavigation';
import type { TextFlowEditMetadata } from './textFlowEditSession';
import {
  flowSelectionText,
  orderedFlowSelection,
  replaceFlowSelection,
  type FlowPoint,
  type FlowSelection,
} from './textFlowSelection';

export interface DocumentFlowPoint extends FlowPoint {
  blockId: string;
}

export interface DocumentFlowSelection {
  anchor: DocumentFlowPoint;
  focus: DocumentFlowPoint;
}

export interface DocumentFlowBlock {
  block: NoteBlock;
  flow: TextBlockContentV1;
  editable: boolean;
}

export type DocumentFlowEntry = DocumentFlowBlock | { obstacleId: string };

export interface OrderedDocumentFlowSelection {
  start: DocumentFlowPoint;
  end: DocumentFlowPoint;
  startIndex: number;
  endIndex: number;
  blocks: Array<DocumentFlowBlock & { selection: FlowSelection }>;
}

export interface DocumentFlowEdit {
  block: NoteBlock;
  previousTextFlow: TextBlockContentV1;
  nextTextFlow: TextBlockContentV1;
  metadata: TextFlowEditMetadata;
}

/** Inputs must include every visible block in rendered order, including barriers. */
export function orderedDocumentFlowSelection(
  blocks: readonly DocumentFlowEntry[],
  selection: DocumentFlowSelection,
): OrderedDocumentFlowSelection | null {
  const anchorIndex = blocks.findIndex((entry) => 'block' in entry && entry.block.id === selection.anchor.blockId);
  const focusIndex = blocks.findIndex((entry) => 'block' in entry && entry.block.id === selection.focus.blockId);
  if (anchorIndex < 0 || focusIndex < 0) return null;

  const anchorEntry = blocks[anchorIndex];
  const focusEntry = blocks[focusIndex];
  if (!('block' in anchorEntry) || !('block' in focusEntry)) return null;
  const anchorUnitIndex = anchorEntry.flow.units.findIndex((unit) => unit.id === selection.anchor.unitId);
  const focusUnitIndex = focusEntry.flow.units.findIndex((unit) => unit.id === selection.focus.unitId);
  if (anchorUnitIndex < 0 || focusUnitIndex < 0) return null;
  // Order the original UTF-16 endpoints before expanding the selected range.
  // Snapping each as a collapsed caret first could omit half-selected clusters.
  const clamp = (offset: number, length: number) => Math.min(length, Math.max(0, Number.isNaN(offset) ? 0 : Math.trunc(offset)));
  const anchor = { ...selection.anchor, offset: clamp(selection.anchor.offset, anchorEntry.flow.units[anchorUnitIndex].text.length) };
  const focus = { ...selection.focus, offset: clamp(selection.focus.offset, focusEntry.flow.units[focusUnitIndex].text.length) };

  const forward = anchorIndex < focusIndex || (anchorIndex === focusIndex && (
    anchorUnitIndex < focusUnitIndex || (
      anchorUnitIndex === focusUnitIndex
      && anchor.offset <= focus.offset
    )
  ));
  const start = forward ? anchor : focus;
  const end = forward ? focus : anchor;
  const startIndex = Math.min(anchorIndex, focusIndex);
  const endIndex = Math.max(anchorIndex, focusIndex);
  const selectedBlocks: OrderedDocumentFlowSelection['blocks'] = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    const entry = blocks[index];
    // A selection must stay in one uninterrupted run of editable text blocks.
    if (!('block' in entry)) return null;
    if (!entry.editable || !supportsTextFlowBlockNavigation(entry.block) || !entry.flow.units.length) return null;
    const firstUnit = entry.flow.units[0];
    const lastUnit = entry.flow.units[entry.flow.units.length - 1];
    const range = orderedFlowSelection(entry.flow, {
      anchor: index === startIndex
        ? { unitId: start.unitId, offset: start.offset }
        : { unitId: firstUnit.id, offset: 0 },
      focus: index === endIndex
        ? { unitId: end.unitId, offset: end.offset }
        : { unitId: lastUnit.id, offset: lastUnit.text.length },
    });
    if (!range) return null;
    selectedBlocks.push({
      ...entry,
      selection: { anchor: range.start, focus: range.end },
    });
  }
  return {
    start: { blockId: start.blockId, ...selectedBlocks[0].selection.anchor },
    end: { blockId: end.blockId, ...selectedBlocks[selectedBlocks.length - 1].selection.focus },
    startIndex, endIndex, blocks: selectedBlocks,
  };
}

export function documentFlowSelectionText(
  blocks: readonly DocumentFlowEntry[],
  selection: DocumentFlowSelection,
): string {
  const range = orderedDocumentFlowSelection(blocks, selection);
  return range?.blocks.map((entry) => flowSelectionText(entry.flow, entry.selection)).join('\n\n') ?? '';
}

/** Delete per block; insert only at the earlier endpoint, without joining blocks. */
export function replaceDocumentFlowSelection(
  blocks: readonly DocumentFlowEntry[],
  selection: DocumentFlowSelection,
  text: string,
  inputType = 'insertText',
): { changes: DocumentFlowEdit[]; caret: DocumentFlowPoint } | null {
  const range = orderedDocumentFlowSelection(blocks, selection);
  if (!range) return null;
  const changes: DocumentFlowEdit[] = [];
  let caret = range.start;

  for (const [index, entry] of range.blocks.entries()) {
    const replacement = replaceFlowSelection(entry.flow, entry.selection, index === 0 ? text : '');
    if (!replacement) return null;
    if (index === 0) caret = { blockId: entry.block.id, ...replacement.caret };
    const start = entry.selection.anchor;
    const end = entry.selection.focus;
    changes.push({
      block: entry.block,
      previousTextFlow: entry.flow,
      nextTextFlow: replacement.flow,
      metadata: {
        unitId: start.unitId,
        inputType,
        beforeSelection: {
          unitId: start.unitId,
          start: start.offset,
          end: start.unitId === end.unitId ? end.offset : start.offset,
        },
        afterSelection: {
          unitId: replacement.caret.unitId,
          start: replacement.caret.offset,
          end: replacement.caret.offset,
        },
        isComposing: false,
        kind: 'structural',
      },
    });
  }
  return { changes, caret };
}
