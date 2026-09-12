// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { hasMeaningfulRenderableBlockContent } from './blockContentService';
import { shouldShowEmptyPagePrompt } from './draftBlockLifecycleReducer';
import type { NoteBlock } from './runtimeDataTypes';
import { editingTextInteraction, idleInteraction } from './interactionController';
import { textFocusReceiptForBlock } from './textFocusReceipt';
import type {
  CanvasObject,
  CanvasPlacement,
  StructuredCanvasObject,
} from './types';
import {
  hasLegitimatePendingWritingEditor,
  hasMeaningfulWritingSurfaceContent,
  type MeaningfulWritingSurfaceContentInput,
} from './writingEntryVisibility';

function block(overrides: Partial<NoteBlock> = {}): NoteBlock {
  return {
    id: 'block-1',
    placement_id: 'placement-1',
    display_overrides_json: {},
    canvas_layout: null,
    block_type: 'text',
    title: null,
    content_json: { body: '' },
    plain_text: '',
    metadata: {},
    order_index: 0,
    source_references: [],
    ...overrides,
  };
}

function canvasObject(
  objectId: string,
  kind: CanvasObject['kind'],
): CanvasObject {
  return {
    objectId,
    canvasId: 'canvas-1',
    kind,
    backing: kind === 'image'
      ? 'asset'
      : kind === 'table'
        ? 'structured_object'
        : 'note_block',
    objectClass: kind === 'image'
      ? 'media'
      : kind === 'table'
        ? 'structured'
        : 'block_backed',
    status: 'active',
  };
}

function canvasPlacement(
  objectId: string,
  overrides: Partial<CanvasPlacement> = {},
): CanvasPlacement {
  return {
    placementId: `${objectId}:placement`,
    objectId,
    canvasId: 'canvas-1',
    surface: 'canvas_workspace',
    boundaryRole: 'outside',
    x: 900,
    y: 100,
    width: 240,
    height: 160,
    zIndex: 4,
    rotation: 0,
    ...overrides,
  };
}

describe('meaningful renderable block content', () => {
  it('ignores an empty raw ghost but counts text, title, source, and structured fields', () => {
    expect(hasMeaningfulRenderableBlockContent(block())).toBe(false);
    expect(hasMeaningfulRenderableBlockContent(block({ plain_text: 'sentinel' }))).toBe(true);
    expect(hasMeaningfulRenderableBlockContent(block({ title: 'Named block' }))).toBe(true);
    expect(hasMeaningfulRenderableBlockContent(block({ source_references: [{ id: 'source-1' }] }))).toBe(true);
    expect(hasMeaningfulRenderableBlockContent(block({
      block_type: 'formula',
      content_json: { field_values: { formula_name: 'Euler identity' } },
    }))).toBe(true);
  });

  const emptySurface = (): MeaningfulWritingSurfaceContentInput => ({
    allBlocks: [],
    annotationTruths: [],
    blockTextDrafts: {},
    canvasObjects: [],
    canvasPlacements: [],
    contentMounts: [],
    imageObjects: [],
    surfaceMode: 'page',
    structuredObjects: [],
    visibleBlocks: [],
  });

  it('keeps the Page entry visible for a live-shaped inside table that only Canvas renders', () => {
    const objectId = 'canvas-object:071d0d1d-0adc-4007-a6a4-b225204af208:table-21137d8f-7f4a-452b-8f1b-258dc7f059d9';
    const rows = Array.from({ length: 3 }, (_, index) => ({
      rowId: `row-${index + 1}`,
      index,
    }));
    const columns = Array.from({ length: 3 }, (_, index) => ({
      columnId: `column-${index + 1}`,
      index,
    }));
    const structuredObject: StructuredCanvasObject = {
      objectId,
      canvasId: 'canvas-071d0d1d',
      structuredKind: 'table',
      schemaVersion: 'table.v1',
      rowCount: 3,
      columnCount: 3,
      payload: {
        version: 'table.v1',
        rows,
        columns,
        cells: rows.flatMap((row) => columns.map((column) => ({
          cellId: `${row.rowId}:${column.columnId}`,
          rowId: row.rowId,
          columnId: column.columnId,
          rowIndex: row.index,
          columnIndex: column.index,
          text: '',
          valueType: 'text' as const,
        }))),
      },
    };
    const tableObject = {
      ...canvasObject(objectId, 'table'),
      canvasId: structuredObject.canvasId,
    };
    const placement = canvasPlacement(objectId, {
      canvasId: structuredObject.canvasId,
      frameId: 'primary-page-frame',
      surface: 'formal_page',
      boundaryRole: 'inside',
      x: 35,
      width: 420,
    });
    const pageInput: MeaningfulWritingSurfaceContentInput = {
      ...emptySurface(),
      canvasObjects: [tableObject],
      canvasPlacements: [placement],
      structuredObjects: [structuredObject],
      surfaceMode: 'page',
    };

    const meaningful = hasMeaningfulWritingSurfaceContent(pageInput);
    expect(meaningful).toBe(false);
    expect(shouldShowEmptyPagePrompt({
      contentReadOnly: false,
      hasMeaningfulRenderableContent: meaningful,
      hasPendingEditor: false,
    })).toBe(true);
  });

  it('counts visible block content on the Page surface', () => {
    const visibleBlock = block({ plain_text: 'visible writing' });
    expect(hasMeaningfulWritingSurfaceContent({
      ...emptySurface(),
      surfaceMode: 'page',
      allBlocks: [visibleBlock],
      visibleBlocks: [visibleBlock],
    })).toBe(true);
  });

  it('accepts only an exact durable DOM focus triple as a pending editor receipt', () => {
    const receipt = textFocusReceiptForBlock('block-1', 'unit-7');
    expect(hasLegitimatePendingWritingEditor({
      creatingDraft: false,
      draftActive: false,
      focusedTextOwner: receipt,
      interactionState: editingTextInteraction(receipt, 'block'),
      placementPending: false,
    })).toBe(true);
    expect(hasLegitimatePendingWritingEditor({
      creatingDraft: false,
      draftActive: false,
      focusedTextOwner: { ...receipt, textUnitId: 'stale-unit' },
      interactionState: editingTextInteraction(receipt, 'block'),
      placementPending: false,
    })).toBe(false);
    expect(hasLegitimatePendingWritingEditor({
      creatingDraft: false,
      draftActive: false,
      focusedTextOwner: null,
      interactionState: idleInteraction(),
      placementPending: true,
    })).toBe(true);
  });
});
