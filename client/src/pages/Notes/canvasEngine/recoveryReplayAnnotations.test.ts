import { describe, expect, it } from 'vitest';
import { recoveryReplayAnnotationRanges } from './recoveryReplayAnnotations';
import type { AnnotationRangeV1, AnnotationTruthV1 } from './runtimeDataTypes';
import { createTextBlockContentV1 } from './textFlowService';

const flow = (text: string, unitId = 'unit-1') => {
  const result = createTextBlockContentV1(text);
  return { ...result, units: result.units.map((unit) => ({ ...unit, id: unitId })) };
};
const range = (overrides: Partial<AnnotationRangeV1> = {}): AnnotationRangeV1 => ({
  id: 'range-1', target_kind: 'text_span', block_id: 'block-1',
  text_flow_id: 'textflow-block-1', text_unit_id: 'unit-1',
  start_offset: 13, end_offset: 17, range_text_cache: 'beta', ...overrides,
});
const annotation = (ranges: AnnotationRangeV1[]): AnnotationTruthV1 => ({
  id: 'annotation-1', note_id: 'note-1', canvas_id: 'canvas-1', raw_label: 'Current annotation',
  ranges, parent_annotation_id: null, child_annotation_ids: [],
  visual_style: { color_token: 'yellow', marker_kind: 'highlight' },
  created_by: 'human', status: 'active', created_at: '', updated_at: '',
});

describe('recovery replay current annotation ranges', () => {
  it('moves current offsets with the ordinary edit algorithm and returns only changed snapshots', () => {
    const current = [annotation([range(), range({ id: 'unrelated', block_id: 'another-block' })])];
    const before = structuredClone(current);
    const snapshots = recoveryReplayAnnotationRanges({
      annotations: current, blockId: 'block-1',
      previousTextFlow: flow('prefix alpha beta gamma'), nextTextFlow: flow('alpha beta gamma'),
    });

    expect(snapshots).toEqual([{
      annotationId: 'annotation-1', range: range({ start_offset: 6, end_offset: 10 }),
    }]);
    expect(current).toEqual(before);
    snapshots[0].range.range_text_cache = 'edited result';
    expect(current).toEqual(before);
  });

  it('retains the last offsets and excerpt as evidence when the current unit is absent from the draft', () => {
    const current = [annotation([range({ metadata: { label: 'retained' } })])];
    const before = structuredClone(current);
    expect(recoveryReplayAnnotationRanges({
      annotations: current, blockId: 'block-1',
      previousTextFlow: flow('prefix alpha beta gamma'), nextTextFlow: flow('replacement', 'unit-2'),
    })).toEqual([{
      annotationId: 'annotation-1', range: range({
        start_offset: undefined, end_offset: undefined,
        metadata: { label: 'retained', pre_edit_offsets: {
          text_unit_id: 'unit-1', start_offset: 13, end_offset: 17, range_text_cache: 'beta',
        } },
      }),
    }]);
    expect(current).toEqual(before);
  });

  it('preserves existing pre-edit evidence when the draft has no TextFlow', () => {
    const evidence = { text_unit_id: 'earlier-unit', start_offset: 2, end_offset: 6, range_text_cache: 'beta' };
    expect(recoveryReplayAnnotationRanges({
      annotations: [annotation([range({ metadata: { pre_edit_offsets: evidence } })])], blockId: 'block-1',
      previousTextFlow: flow('prefix alpha beta gamma'), nextTextFlow: null,
    })).toEqual([{
      annotationId: 'annotation-1', range: range({
        start_offset: undefined, end_offset: undefined, metadata: { pre_edit_offsets: evidence },
      }),
    }]);
  });

  it('does not issue unchanged ranges', () => {
    const unchanged = flow('prefix alpha beta gamma');
    expect(recoveryReplayAnnotationRanges({
      annotations: [annotation([range()])], blockId: 'block-1',
      previousTextFlow: unchanged, nextTextFlow: unchanged,
    })).toEqual([]);
  });
});
