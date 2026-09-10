import { describe, expect, it } from 'vitest';
import { boardReferenceFromSelection } from '../../Boards/boardTextRangeClipboard';
import { createAnnotationRangeFromCapturedSelection, createTextUnitAnnotationHighlightSegments } from './selectionRangeService';
import { createAnnotationRenderSegments } from './annotationRenderService';
import { createChildAnnotationRangeFromParentRange } from './annotationEditorService';
import { createAnnotationTruth, createTextSpanAnnotationRange } from './annotationTruthService';
import { resolveRangePreviewFromBlocks } from './contentGroupService';
import { applySourceBackedAnnotationRangeEdit, deriveSingleTextEditDelta } from './rangeRebaseService';
import { createTextBlockContentV1 } from './textFlowService';
import { insertPlainTextIntoTextFlow, pasteTextIntoTextFlow, splitTextUnitAtOffset, splitTextUnitForEnter } from './textUnitEditorService';
import type { InlineStructuredObject, NoteBlock } from './runtimeDataTypes';

const owner = { blockId: 'block', textFlowId: 'textflow-block', textUnitId: 'tu-1' };
const samples = [
  { name: 'surrogate emoji', cluster: '😀', caret: 3 },
  { name: 'ZWJ family', cluster: '👨‍👩‍👧‍👦', caret: 1 },
  { name: 'combining accent', cluster: 'e\u0301', caret: 3 },
];

describe.each(samples)('B9 excerpt and structural edit: $name', ({ cluster, caret }) => {
  const text = `A${cluster}tail`;
  const selection = { ...owner, text, startOffset: 2, endOffset: 3 };
  const legacyRange = () => createTextSpanAnnotationRange({ ...selection, text: text.slice(2, 3) });

  it('mints whole-cluster board and annotation excerpts with UTF-16 coordinates', () => {
    expect(boardReferenceFromSelection('note', selection)).toMatchObject({
      start_offset: 1, end_offset: 1 + cluster.length, excerpt: cluster,
    });
    expect(createAnnotationRangeFromCapturedSelection(selection)).toMatchObject({
      start_offset: 1, end_offset: 1 + cluster.length, range_text_cache: cluster,
    });
    expect(createAnnotationRangeFromCapturedSelection({ ...selection, startOffset: 3, endOffset: 2 }))
      .toMatchObject({ start_offset: 1, end_offset: 1 + cluster.length, range_text_cache: cluster });
    expect(boardReferenceFromSelection('note', { ...selection, endOffset: 2 })).toBeNull();
  });

  it('expands preview and highlight boundaries without mutating legacy coordinates or duplicating text', () => {
    const range = legacyRange();
    const original = structuredClone(range);
    const annotation = createAnnotationTruth({ noteId: 'note', canvasId: 'canvas', label: 'mark', ranges: [range] });
    const rendered = createAnnotationRenderSegments({ text, annotations: [annotation], ...owner });
    expect(rendered.map((segment) => segment.text)).toEqual(['A', cluster, 'tail']);
    expect(rendered[1].annotationIds).toEqual([annotation.id]);
    const highlights = createTextUnitAnnotationHighlightSegments({ text, ranges: [{ range, selected: true }] });
    expect(highlights.map((segment) => segment.text)).toEqual(['A', cluster, 'tail']);
    expect(highlights[1]).toMatchObject({ highlighted: true, selected: true });
    const block: NoteBlock = {
      id: 'block', placement_id: 'placement', display_overrides_json: {}, block_type: 'text', title: null,
      content_json: { text_flow: createTextBlockContentV1(text) }, plain_text: text, metadata: {},
      order_index: 0, source_references: [],
    };
    expect(resolveRangePreviewFromBlocks(range, [block])).toBe(cluster);
    expect(range).toEqual(original);
  });

  it('aligns child preview selections and source-backed replacement to a complete cluster', () => {
    const parent = createTextSpanAnnotationRange({ ...owner, startOffset: 10, endOffset: 10 + text.length, text });
    expect(createChildAnnotationRangeFromParentRange({ parentRange: parent, selectionStartOffset: 2, selectionEndOffset: 3,
      selectedText: text.slice(2, 3) })).toMatchObject({
      start_offset: 11, end_offset: 11 + cluster.length, range_text_cache: cluster,
    });
    const range = legacyRange();
    const annotation = createAnnotationTruth({ noteId: 'note', canvasId: 'canvas', label: 'mark', ranges: [range] });
    const result = applySourceBackedAnnotationRangeEdit({ annotations: [annotation], annotationId: annotation.id,
      rangeId: range.id, currentText: text, replacementText: 'NEW' })!;
    expect(result.next_text).toBe('ANEWtail');
    expect(result.next_annotations[0].ranges[0]).toMatchObject({ start_offset: 1, end_offset: 4, range_text_cache: 'NEW' });
    expect(range).toMatchObject({ start_offset: 2, end_offset: 3 });
  });

  it('snaps structural split and insertion once without dropping or duplicating the cluster or its inline', () => {
    const flow = createTextBlockContentV1(text);
    const item: InlineStructuredObject = {
      id: 'inline', parent_text_unit_id: 'tu-1', semantic_kind: 'inline_code', anchor_text: cluster,
      anchor_range: { start: 1, end: 1 + cluster.length }, status: 'active', field_values: { code: cluster }, metadata: {},
    };
    flow.inline_structures = [item];
    const original = structuredClone(flow);
    const split = splitTextUnitAtOffset(flow, 'tu-1', 2);
    expect(split.units.map((unit) => unit.text)).toEqual([text.slice(0, caret), text.slice(caret)]);
    const retained = split.inline_structures[0];
    const retainedText = split.units.find((unit) => unit.id === retained.parent_text_unit_id)!.text;
    expect(retainedText.slice(retained.anchor_range!.start, retained.anchor_range!.end)).toBe(cluster);
    expect(insertPlainTextIntoTextFlow(flow, 'tu-1', 2, 'NEW').units[0].text)
      .toBe(`${text.slice(0, caret)}NEW${text.slice(caret)}`);
    expect(flow).toEqual(original);
  });

  it.each(['enter', 'paste'] as const)('%s replaces complete selected clusters and preserves B8 inline evidence', (operation) => {
    const flow = createTextBlockContentV1(text);
    flow.inline_structures = [{
      id: 'inline', parent_text_unit_id: 'tu-1', semantic_kind: 'inline_code', anchor_text: null,
      anchor_range: { start: 2, end: 3 }, status: 'active', field_values: { code: 'retained' }, metadata: {},
    }, {
      id: 'tail', parent_text_unit_id: 'tu-1', semantic_kind: 'inline_formula', anchor_text: 'tail',
      anchor_range: { start: 1 + cluster.length, end: text.length }, status: 'active', field_values: { latex: 'tail' }, metadata: {},
    }];
    const result = operation === 'enter' ? splitTextUnitForEnter(flow, 'tu-1', 3, 2)
      : pasteTextIntoTextFlow(flow, 'tu-1', 3, 'one\ntwo', 2);
    expect(result.units.map((unit) => unit.text)).toEqual(operation === 'enter' ? ['A', 'tail'] : ['Aone', 'two', 'tail']);
    expect(result.inline_structures[0]).toMatchObject({ anchor_range: null, field_values: { code: 'retained' },
      metadata: { pre_edit_offsets: { start_offset: 2, end_offset: 3, range_text_cache: cluster } } });
    expect(result.inline_structures[1]).toMatchObject({ parent_text_unit_id: result.units[result.units.length - 1].id,
      anchor_range: { start: 0, end: 4 }, anchor_text: 'tail' });
  });
});

describe('B9 diff and plain-text compatibility', () => {
  it.each([
    ['A😀Z', 'A😁Z', '😁'], ['Ae\u0301Z', 'Ae\u0300Z', 'e\u0300'], ['AeZ', 'Ae\u0301Z', 'e\u0301'],
  ])('keeps the derived edit reconstructible at shared grapheme boundaries: %s', (oldText, newText, replacement) => {
    const delta = deriveSingleTextEditDelta(oldText, newText);
    expect(delta).toEqual({ editedStartOffset: 1, editedEndOffset: oldText.length - 1, replacementText: replacement });
    expect(oldText.slice(0, delta.editedStartOffset) + delta.replacementText + oldText.slice(delta.editedEndOffset)).toBe(newText);
  });

  it.each(['abc', '甲乙丙'])('preserves ASCII/CJK excerpt and split bytes: %s', (text) => {
    expect(boardReferenceFromSelection('note', { ...owner, text, startOffset: 1, endOffset: 2 }))
      .toMatchObject({ start_offset: 1, end_offset: 2, excerpt: text.slice(1, 2) });
    expect(splitTextUnitForEnter(createTextBlockContentV1(text), 'tu-1', 1).units.map((unit) => unit.text))
      .toEqual([text.slice(0, 1), text.slice(1)]);
  });
});
