import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardTextRangeV1 } from '../../../../../../shared/types/boardTextRange';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import type { AnnotationTruthV1, TextBlockContentV1 } from '../runtimeDataTypes';
import { useBlockTextFlowEditController } from './useBlockTextFlowEditController';

describe('live board ranges on the annotation edit controller', () => {
  it('rebases ordinary input and visibly degrades a split even with no annotations', async () => {
    const before = createTextBlockContentV1('alpha beta gamma');
    const first = { ...before, units: [{ ...before.units[0], text: 'prefix alpha beta gamma' }] };
    const range: BoardTextRangeV1 = {
      id: 'range', note_id: 'note', board_id: 'board', block_id: 'block',
      text_flow_id: 'textflow-block', text_unit_id: before.units[0].id,
      start_offset: 6, end_offset: 10, excerpt: 'beta', status: 'active', pre_edit_offsets: null,
      at: '', created_at: '', updated_at: '',
    };
    const session = createBoardTextRangeEditSession('note', vi.fn());
    session.hydrate([range]);
    const saveAnnotations = vi.fn();
    const hook = renderHook(() => {
      const [drafts, setDrafts] = useState<Record<string, TextBlockContentV1>>({});
      return useBlockTextFlowEditController({
        annotationTruths: [], blockTextFlowDrafts: drafts, setBlockTextFlowDrafts: setDrafts,
        saveAnnotationTruths: saveAnnotations, rebaseBoardTextRanges: session.rebase,
      });
    });
    const block = { id: 'block', content_json: { [TEXT_FLOW_CONTENT_KEY]: before } };
    await act(async () => { await hook.result.current(block, first); });
    expect(session.capture('block').ranges[0]).toMatchObject({ start_offset: 13, end_offset: 17, excerpt: 'beta' });
    const split = { ...first, units: [{ ...first.units[0], text: 'prefix alpha be' }, { ...first.units[0], id: 'split', text: 'ta gamma' }] };
    await act(async () => { await hook.result.current(block, split); });
    expect(session.capture('block').ranges[0]).toMatchObject({
      status: 'drifted', excerpt: 'beta', pre_edit_offsets: { start_offset: 13, end_offset: 17 },
    });
    expect(saveAnnotations).not.toHaveBeenCalled();
  });

  it('captures before synchronously and restores only touched range identities after overlap or unit removal', async () => {
    const before = createTextBlockContentV1('alpha beta gamma');
    const after = { ...before, units: [{ ...before.units[0], text: 'alph gamma' }] };
    const original: AnnotationTruthV1 = {
      id: 'annotation', note_id: 'note', canvas_id: 'canvas', raw_label: 'original',
      ranges: [{ id: 'range', target_kind: 'text_span', block_id: 'block', text_flow_id: 'textflow-block', text_unit_id: before.units[0].id, start_offset: 6, end_offset: 10, range_text_cache: 'beta' }],
      parent_annotation_id: null, child_annotation_ids: [], visual_style: { color_token: 'blue', marker_kind: 'highlight' },
      created_by: 'human', status: 'active', created_at: '', updated_at: '',
    };
    const observed = vi.fn();
    const saved = vi.fn(async () => true);
    const hook = renderHook(() => {
      const [drafts, setDrafts] = useState<Record<string, TextBlockContentV1>>({});
      const [annotations, setAnnotations] = useState([original]);
      const apply = useBlockTextFlowEditController({
        annotationTruths: annotations, blockTextFlowDrafts: drafts, setBlockTextFlowDrafts: setDrafts,
        saveAnnotationTruths: async (next) => { setAnnotations(next); return saved(); },
        onEditApplied: observed,
      });
      return { apply, annotations, setAnnotations };
    });
    const block = { id: 'block', content_json: { [TEXT_FLOW_CONTENT_KEY]: before } };
    await act(async () => {
      const result = hook.result.current.apply(block, after);
      expect(observed).toHaveBeenCalledTimes(1);
      expect(observed.mock.calls[0][0].beforeAnnotationRanges[0].range).toMatchObject({ start_offset: 6, end_offset: 10 });
      expect((await result).success).toBe(true);
    });
    expect(hook.result.current.annotations[0].ranges[0].start_offset).toBeUndefined();
    const laterRange = { ...original.ranges[0], id: 'later', start_offset: 0, end_offset: 4 };
    act(() => hook.result.current.setAnnotations((current) => [
      { ...current[0], raw_label: 'renamed later', ranges: [...current[0].ranges, laterRange] },
      { ...original, id: 'later-annotation', ranges: [{ ...laterRange, id: 'later-other' }] },
    ]));
    await act(async () => {
      await hook.result.current.apply(block, before, {
        restoreAnnotationRanges: observed.mock.calls[0][0].beforeAnnotationRanges,
        skipHistory: true,
      });
    });
    expect(observed).toHaveBeenCalledTimes(1);
    expect(hook.result.current.annotations[0]).toMatchObject({ raw_label: 'renamed later', ranges: [original.ranges[0], laterRange] });
    expect(hook.result.current.annotations[1].id).toBe('later-annotation');

    const removed = { ...before, units: [{ ...before.units[0], id: 'replacement-unit' }] };
    await act(async () => { await hook.result.current.apply(block, removed); });
    expect(hook.result.current.annotations[0].ranges[0]).toMatchObject({ metadata: { pre_edit_offsets: { start_offset: 6, end_offset: 10 } } });
    expect(hook.result.current.annotations[0].ranges[0].start_offset).toBeUndefined();
  });

  it('reports failed persistence without losing the synchronous before/after edit receipt', async () => {
    const before = createTextBlockContentV1('alpha beta gamma');
    const annotation = {
      id: 'a', note_id: 'note', ranges: [{ id: 'range', target_kind: 'text_span', block_id: 'block', text_flow_id: 'textflow-block', text_unit_id: before.units[0].id, start_offset: 6, end_offset: 10 }],
    } as AnnotationTruthV1;
    const onEditApplied = vi.fn();
    const hook = renderHook(() => useBlockTextFlowEditController({
      annotationTruths: [annotation], blockTextFlowDrafts: {}, setBlockTextFlowDrafts: vi.fn(),
      saveAnnotationTruths: async () => false, onEditApplied,
    }));
    const after = { ...before, units: [{ ...before.units[0], text: 'prefix alpha beta gamma' }] };
    const result = await hook.result.current({ id: 'block', content_json: { [TEXT_FLOW_CONTENT_KEY]: before } }, after);
    expect(result.success).toBe(false);
    expect(onEditApplied).toHaveBeenCalledTimes(1);
    expect(result.beforeAnnotationRanges[0].range.start_offset).toBe(6);
    expect(result.afterAnnotationRanges[0].range.start_offset).toBe(13);
  });
});
