// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import type { SelectionDraftV1 } from './selectionDraftService';
import { selectionDraftToReceipt } from './selectionReceiptProjection';

const GEOMETRY_KEYS = new Set([
  'anchorrect',
  'rect',
  'geometry',
  'bounds',
  'x',
  'y',
  'width',
  'height',
]);

function geometryKeyPaths(
  value: unknown,
  path = '$',
  visited = new WeakSet<object>(),
): string[] {
  if (Array.isArray(value)) {
    if (visited.has(value)) return [];
    visited.add(value);
    return value.flatMap((entry, index) => geometryKeyPaths(entry, `${path}[${index}]`, visited));
  }
  if (!value || typeof value !== 'object') return [];
  if (visited.has(value)) return [];
  visited.add(value);

  return Reflect.ownKeys(value).flatMap((key) => {
    const keyLabel = String(key);
    const nested = (value as Record<PropertyKey, unknown>)[key];
    const keyPath = `${path}.${keyLabel}`;
    return [
      ...(GEOMETRY_KEYS.has(keyLabel.replace(/[-_\s]/g, '').toLowerCase()) ? [keyPath] : []),
      ...geometryKeyPaths(nested, keyPath, visited),
    ];
  });
}

function selectionDraftFixture(): SelectionDraftV1 {
  return {
    id: 'selection-draft-1',
    phase: 'active',
    mode: 'additive',
    ranges: [
      {
        id: 'range-1',
        blockId: 'block-1',
        textFlowId: 'textflow-block-1',
        textUnitId: 'unit-1',
        startOffset: 2,
        endOffset: 7,
        text: 'alpha beta',
      },
      {
        id: 'range-2',
        blockId: 'block-2',
        textFlowId: 'textflow-block-2',
        textUnitId: 'unit-2',
        startOffset: 0,
        endOffset: 5,
        text: 'gamma',
      },
    ],
    anchorRect: {
      x: 10,
      y: 20,
      width: 120,
      height: 24,
    } as DOMRect,
    parentAnnotationId: 'annotation-parent-1',
    createdAt: '2026-08-24T12:00:00.000Z',
    updatedAt: '2026-08-24T12:01:00.000Z',
  };
}

describe('selection receipt projection', () => {
  it('K-1 projects the explicit note envelope, owner triples, ranges, excerpt, and current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-24T12:02:03.456Z'));
    try {
      expect(selectionDraftToReceipt(selectionDraftFixture(), { noteId: 'note-explicit-1' })).toStrictEqual({
        note_id: 'note-explicit-1',
        refs: [
          {
            blockId: 'block-1',
            textFlowId: 'textflow-block-1',
            textUnitId: 'unit-1',
          },
          {
            blockId: 'block-2',
            textFlowId: 'textflow-block-2',
            textUnitId: 'unit-2',
          },
        ],
        text_ranges: [
          {
            blockId: 'block-1',
            textFlowId: 'textflow-block-1',
            textUnitId: 'unit-1',
            startOffset: 2,
            endOffset: 7,
            text: 'alpha beta',
          },
          {
            blockId: 'block-2',
            textFlowId: 'textflow-block-2',
            textUnitId: 'unit-2',
            startOffset: 0,
            endOffset: 5,
            text: 'gamma',
          },
        ],
        at: '2026-08-24T12:02:03.456Z',
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('K-2 positive control makes the recursive probe detect anchorRect, x, and width', () => {
    expect(geometryKeyPaths({ payload: [{ anchorRect: { x: 1, width: 12 } }] })).toStrictEqual([
      '$.payload[0].anchorRect',
      '$.payload[0].anchorRect.x',
      '$.payload[0].anchorRect.width',
    ]);
  });

  it('K-2 finds no geometry key anywhere in a projected receipt', () => {
    const receipt = selectionDraftToReceipt(selectionDraftFixture(), { noteId: 'note-1' });
    expect(receipt).not.toBeNull();
    expect(geometryKeyPaths(receipt)).toEqual([]);
  });

  it('K-3 returns null when the draft has no ranges', () => {
    const draft = selectionDraftFixture();
    draft.ranges = [];

    expect(selectionDraftToReceipt(draft, { noteId: 'note-1' })).toBeNull();
  });

  it('K-4 copies nested values so mutations cannot cross the projection boundary', () => {
    const draftForReceiptMutation = selectionDraftFixture();
    const receiptToMutate = selectionDraftToReceipt(
      draftForReceiptMutation,
      { noteId: 'note-1' },
    );
    expect(receiptToMutate).not.toBeNull();
    receiptToMutate!.refs[0].blockId = 'receipt-only-block';
    receiptToMutate!.text_ranges[0].text = 'receipt-only-text';
    receiptToMutate!.text_ranges.push({
      blockId: 'receipt-only-block',
      textFlowId: 'receipt-only-flow',
      textUnitId: 'receipt-only-unit',
      startOffset: 0,
      endOffset: 1,
      text: 'receipt-only-range',
    });
    expect(draftForReceiptMutation.ranges[0].blockId).toBe('block-1');
    expect(draftForReceiptMutation.ranges[0].text).toBe('alpha beta');
    expect(draftForReceiptMutation.ranges).toHaveLength(2);

    const draftToMutate = selectionDraftFixture();
    const stableReceipt = selectionDraftToReceipt(draftToMutate, { noteId: 'note-1' });
    expect(stableReceipt).not.toBeNull();
    draftToMutate.ranges[0].blockId = 'draft-only-block';
    draftToMutate.ranges[0].startOffset = 1;
    draftToMutate.ranges[0].text = 'draft-only-text';
    draftToMutate.ranges.push({
      ...draftToMutate.ranges[0],
      id: 'draft-only-range',
    });
    expect(stableReceipt!.refs[0].blockId).toBe('block-1');
    expect(stableReceipt!.text_ranges[0].startOffset).toBe(2);
    expect(stableReceipt!.text_ranges[0].text).toBe('alpha beta');
    expect(stableReceipt!.text_ranges).toHaveLength(2);
  });
});
