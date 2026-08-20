// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  reconcileTextFocusReceipt,
  textFocusReceiptForBlock,
  textFocusReceiptForDraft,
} from './textFocusReceipt';
import { reconcileCapturedSelectionTextOwner } from './selectionRangeService';
import { reconcileAnnotationTruthTextOwner } from './annotationTruthService';
import { reconcileSelectionDraftTextOwner, type SelectionDraftV1 } from './selectionDraftService';
import type { AnnotationTruthV1 } from './runtimeDataTypes';

describe('text focus receipts', () => {
  it('reconciles only the exact ephemeral owner triple', () => {
    const from = textFocusReceiptForDraft(4);
    const to = textFocusReceiptForBlock('block-9');
    const reconciliation = { from, to, selectionStart: 2, selectionEnd: 5 };

    expect(reconcileTextFocusReceipt(from, reconciliation)).toEqual(to);
    expect(reconcileTextFocusReceipt(textFocusReceiptForDraft(5), reconciliation)).toEqual(
      textFocusReceiptForDraft(5),
    );
  });

  it('remaps selection drafts and annotation ranges without changing offsets', () => {
    const from = textFocusReceiptForDraft(8);
    const to = textFocusReceiptForBlock('block-8');
    const reconciliation = { from, to, selectionStart: 1, selectionEnd: 4 };
    const selection = {
      ...from,
      startOffset: 1,
      endOffset: 4,
      text: 'sentinel',
    };
    expect(reconcileCapturedSelectionTextOwner(selection, reconciliation)).toEqual({
      ...selection,
      ...to,
    });

    const selectionDraft: SelectionDraftV1 = {
      id: 'selection-1',
      phase: 'draft',
      mode: 'replace',
      ranges: [{ id: 'range-1', ...selection }],
      anchorRect: {} as DOMRect,
      createdAt: '2026-08-20T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
    };
    expect(reconcileSelectionDraftTextOwner(selectionDraft, reconciliation)?.ranges[0]).toMatchObject(to);

    const annotation: AnnotationTruthV1 = {
      id: 'annotation-1',
      note_id: 'note-1',
      canvas_id: 'canvas-1',
      raw_label: 'Label',
      ranges: [{
        id: 'annotation-range-1',
        target_kind: 'text_span',
        block_id: from.blockId,
        text_flow_id: from.textFlowId,
        text_unit_id: from.textUnitId,
        start_offset: 1,
        end_offset: 4,
      }],
      parent_annotation_id: null,
      child_annotation_ids: [],
      visual_style: { color_token: 'yellow', marker_kind: 'highlight' },
      created_by: 'human',
      status: 'active',
      created_at: '2026-08-20T00:00:00.000Z',
      updated_at: '2026-08-20T00:00:00.000Z',
    };
    expect(reconcileAnnotationTruthTextOwner([annotation], reconciliation)[0]?.ranges[0]).toMatchObject({
      block_id: to.blockId,
      text_flow_id: to.textFlowId,
      text_unit_id: to.textUnitId,
      start_offset: 1,
      end_offset: 4,
    });
  });
});
