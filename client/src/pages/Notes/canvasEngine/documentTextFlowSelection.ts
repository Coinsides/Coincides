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
  blocks: readonly DocumentFlowBlock[],
  selection: DocumentFlowSelection,
): OrderedDocumentFlowSelection | null {
  const anchorIndex = blocks.findIndex(({ block }) => block.id === selection.anchor.blockId);
  const focusIndex = blocks.findIndex(({ block }) => block.id === selection.focus.blockId);
  if (anchorIndex < 0 || focusIndex < 0) return null;

  const anchorRange = orderedFlowSelection(blocks[anchorIndex].flow, {
    anchor: selection.anchor, focus: selection.anchor,
  });
  const focusRange = orderedFlowSelection(blocks[focusIndex].flow, {
    anchor: selection.focus, focus: selection.focus,
  });
  if (!anchorRange || !focusRange) return null;

  const forward = anchorIndex < focusIndex || (anchorIndex === focusIndex && (
    anchorRange.startIndex < focusRange.startIndex || (
      anchorRange.startIndex === focusRange.startIndex
      && anchorRange.start.offset <= focusRange.start.offset
    )
  ));
  const anchor = { ...anchorRange.start, blockId: selection.anchor.blockId };
  const focus = { ...focusRange.start, blockId: selection.focus.blockId };
  const start = forward ? anchor : focus;
  const end = forward ? focus : anchor;
  const startIndex = Math.min(anchorIndex, focusIndex);
  const endIndex = Math.max(anchorIndex, focusIndex);
  const selectedBlocks: OrderedDocumentFlowSelection['blocks'] = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    const entry = blocks[index];
    // A selection must stay in one uninterrupted run of editable text blocks.
    if (!entry.editable || !supportsTextFlowBlockNavigation(entry.block) || !entry.flow.units.length) return null;
    const firstUnit = entry.flow.units[0];
    const lastUnit = entry.flow.units[entry.flow.units.length - 1];
    selectedBlocks.push({
      ...entry,
      selection: {
        anchor: index === startIndex
          ? { unitId: start.unitId, offset: start.offset }
          : { unitId: firstUnit.id, offset: 0 },
        focus: index === endIndex
          ? { unitId: end.unitId, offset: end.offset }
          : { unitId: lastUnit.id, offset: lastUnit.text.length },
      },
    });
  }
  return { start, end, startIndex, endIndex, blocks: selectedBlocks };
}

export function documentFlowSelectionText(
  blocks: readonly DocumentFlowBlock[],
  selection: DocumentFlowSelection,
): string {
  const range = orderedDocumentFlowSelection(blocks, selection);
  return range?.blocks.map((entry) => flowSelectionText(entry.flow, entry.selection)).join('\n\n') ?? '';
}

/** Delete per block; insert only at the earlier endpoint, without joining blocks. */
export function replaceDocumentFlowSelection(
  blocks: readonly DocumentFlowBlock[],
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
