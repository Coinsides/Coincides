import { act, renderHook, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BoardTextRangeV1 } from '../../../../../../shared/types/boardTextRange';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import type { AnnotationTruthV1, NoteBlock, TextBlockContentV1 } from '../runtimeDataTypes';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import type { TextFlowEditMetadata } from '../textFlowEditSession';
import { useBlockDraftAuthority } from './useBlockDraftAuthority';
import type { BlockSaveOutcome } from './useNoteCanvasDataAdapter';
import { usePlacementHistory } from './usePlacementHistory';
import { useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';

describe('TextFlow recovery after later successful input (synthetic memory)', () => {
  it('retries earlier untouched board ranges with the current block snapshot without adding history', async () => {
    const initial = createTextBlockContentV1('alpha beta gamma');
    initial.units.push({ ...initial.units[0], id: 'tu-2', text: 'one two three' });
    const block: NoteBlock = {
      id: 'block', block_type: 'text', title: null, plain_text: 'alpha beta gamma\none two three',
      content_json: { [TEXT_FLOW_CONTENT_KEY]: initial }, metadata: {}, source_references: [], order_index: 0,
      placement_id: 'placement', display_overrides_json: {}, canvas_layout: null,
    };
    const boardRange = (id: string, unitId: string, start: number, end: number, excerpt: string): BoardTextRangeV1 => ({
      id, note_id: 'note', board_id: 'board', block_id: block.id, text_flow_id: 'textflow-block', text_unit_id: unitId,
      start_offset: start, end_offset: end, excerpt, status: 'active', pre_edit_offsets: null, at: '', created_at: '', updated_at: '',
    });
    const originalRanges = [boardRange('range-a', 'tu-1', 6, 10, 'beta'), boardRange('range-b', 'tu-2', 4, 7, 'two')];
    let durableRanges = structuredClone(originalRanges);
    const savedRangeIds: string[][] = [];
    let firstRangeWrite = true;
    const rangeSession = createBoardTextRangeEditSession('note', async (_noteId, ranges) => {
      savedRangeIds.push(ranges.map((range) => range.id));
      if (firstRangeWrite) { firstRangeWrite = false; throw new Error('synthetic first range write failed'); }
      const issued = new Map(ranges.map((range) => [range.id, structuredClone(range)]));
      durableRanges = durableRanges.map((range) => issued.get(range.id) ?? range);
      return ranges;
    });
    rangeSession.hydrate(originalRanges);
    const annotations: AnnotationTruthV1[] = originalRanges.map((range) => ({
      id: `annotation-${range.id}`, note_id: 'note', canvas_id: 'canvas', raw_label: range.excerpt,
      ranges: [{ id: `annotation-${range.id}`, target_kind: 'text_span', block_id: block.id,
        text_flow_id: range.text_flow_id, text_unit_id: range.text_unit_id, start_offset: range.start_offset!, end_offset: range.end_offset!, range_text_cache: range.excerpt }],
      parent_annotation_id: null, child_annotation_ids: [], visual_style: { color_token: 'blue', marker_kind: 'highlight' },
      created_by: 'human', status: 'active', created_at: '', updated_at: '',
    }));
    const saveBlock = vi.fn(async (_block: NoteBlock, _text: string, options?: { textFlow?: TextBlockContentV1; boardRangeSnapshot?: { ranges: BoardTextRangeV1[] } }): Promise<BlockSaveOutcome> => {
      try {
        await rangeSession.persist(options?.boardRangeSnapshot ?? { ranges: [] });
        return { status: 'saved', block: { ...block, content_json: { [TEXT_FLOW_CONTENT_KEY]: options?.textFlow } }, recoveryReceipt: null, reconciliation: 'response' };
      } catch (error) {
        return { status: 'rejected', block, recoveryReceipt: null, reconciliation: 'not_attempted', durableState: 'matches_requested', reason: 'board_range_sync_failed', staleEpoch: false, error };
      }
    });
    const subject = renderHook(() => {
      const drafts = useBlockDraftAuthority();
      const [liveAnnotations, setLiveAnnotations] = useState(annotations);
      const annotationRef = useRef(liveAnnotations);
      const historyHost = useRef<TextFlowHistoryHost | null>(null);
      const editing = useTextFlowHistory({
        noteId: 'note', generation: 1, blocks: [block], annotationTruths: liveAnnotations,
        readAnnotationTruths: () => annotationRef.current,
        setAnnotationTruthsSnapshot: (next) => { annotationRef.current = next; setLiveAnnotations(next); },
        blockTextFlowDrafts: drafts.blockTextFlowDrafts, setBlockTextFlowDrafts: drafts.setBlockTextFlowDrafts,
        setBlockTextDrafts: drafts.setBlockTextDrafts, captureBoardTextRanges: rangeSession.snapshot,
        restoreBoardTextRanges: rangeSession.restore, rebaseBoardTextRanges: rangeSession.rebase,
        saveBlock, saveAnnotationTruthsOutcome: async () => true, history: historyHost,
      });
      const history = usePlacementHistory({
        noteId: 'note', generation: 1, beforeHistoryBoundary: () => editing.boundary(),
        applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(), target: null,
      });
      historyHost.current = history;
      return { editing, history, drafts };
    });
    const metadata = (unitId: string): TextFlowEditMetadata => ({
      unitId, inputType: 'insertText', kind: 'typing', isComposing: false,
      beforeSelection: { unitId, start: 0, end: 0 }, afterSelection: { unitId, start: 7, end: 7 },
    });
    const first = { ...initial, units: initial.units.map((unit, index) => index === 0 ? { ...unit, text: `prefix ${unit.text}` } : unit) };
    await act(async () => {
      await subject.result.current.editing.applyEdit(block, first, { metadata: metadata('tu-1') });
      subject.result.current.editing.boundary('blur');
      await subject.result.current.history.whenHistoryIdle();
    });
    expect(durableRanges[0].start_offset).toBe(6);
    const second = { ...first, units: first.units.map((unit, index) => index === 1 ? { ...unit, text: `prefix ${unit.text}` } : unit) };
    await act(async () => {
      await subject.result.current.editing.applyEdit(block, second, { metadata: metadata('tu-2') });
      subject.result.current.editing.boundary('blur');
      await subject.result.current.history.whenHistoryIdle();
    });
    expect(savedRangeIds).toEqual([['range-a'], ['range-b']]);
    expect(durableRanges.map((range) => range.start_offset)).toEqual([6, 11]);
    await expect(subject.result.current.editing.flush()).rejects.toThrow('could not be saved');

    await act(async () => {
      expect(await subject.result.current.editing.saveBlock(block, 'prefix alpha beta gamma\nprefix one two three', { textFlow: second })).toMatchObject({ status: 'saved' });
      await subject.result.current.editing.flush();
    });
    expect(savedRangeIds[2]).toEqual(['range-a', 'range-b']);
    expect(durableRanges.map((range) => range.start_offset)).toEqual([13, 11]);
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.result.current.drafts.blockTextFlowDrafts[block.id]).toEqual(first);
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(true); });
    expect(subject.result.current.drafts.blockTextFlowDrafts[block.id]).toEqual(initial);
    await act(async () => { expect(await subject.result.current.history.undoRuntimeHistory()).toBe(false); });
    expect(durableRanges).toEqual(originalRanges);
  });

  it('registers a blur save behind earlier queued work before an immediate navigation flush can drain', async () => {
    const flow = createTextBlockContentV1('original');
    const block: NoteBlock = {
      id: 'block', block_type: 'text', title: null, plain_text: 'original',
      content_json: { [TEXT_FLOW_CONTENT_KEY]: flow }, metadata: {}, source_references: [], order_index: 0,
      placement_id: 'placement', display_overrides_json: {}, canvas_layout: null,
    };
    let releaseEarlier!: (saved: boolean) => void;
    const earlierWrite = new Promise<boolean>((resolve) => { releaseEarlier = resolve; });
    let releaseBlur!: (outcome: BlockSaveOutcome) => void;
    const blurWrite = new Promise<BlockSaveOutcome>((resolve) => { releaseBlur = resolve; });
    const rawSave = vi.fn(() => blurWrite);
    const subject = renderHook(() => {
      const drafts = useBlockDraftAuthority();
      const historyHost = useRef<TextFlowHistoryHost | null>(null);
      const editing = useTextFlowHistory({
        noteId: 'note', generation: 1, blocks: [block], annotationTruths: [], readAnnotationTruths: () => [],
        setAnnotationTruthsSnapshot: vi.fn(), blockTextFlowDrafts: drafts.blockTextFlowDrafts,
        setBlockTextFlowDrafts: drafts.setBlockTextFlowDrafts, setBlockTextDrafts: drafts.setBlockTextDrafts,
        captureBoardTextRanges: () => ({ ranges: [] }), restoreBoardTextRanges: vi.fn(), rebaseBoardTextRanges: vi.fn(),
        saveBlock: rawSave, saveAnnotationTruthsOutcome: async () => true, history: historyHost,
      });
      const history = usePlacementHistory({
        noteId: 'note', generation: 1, beforeHistoryBoundary: () => editing.boundary(),
        applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(), target: null,
      });
      historyHost.current = history;
      return { editing, history };
    });
    const earlierOperation = vi.fn(() => earlierWrite);
    let earlier!: Promise<boolean>;
    act(() => { earlier = subject.result.current.history.enqueueRuntimeHistoryOperation(earlierOperation); });
    await waitFor(() => expect(earlierOperation).toHaveBeenCalledOnce());
    let blur!: Promise<BlockSaveOutcome>;
    let flushing!: Promise<void>;
    const flushed = vi.fn();
    act(() => {
      // This path has no recorded text transaction and therefore needs the raw blur save.
      blur = subject.result.current.editing.saveBlock(block, 'blur-only update', { textFlow: createTextBlockContentV1('blur-only update') });
      flushing = subject.result.current.editing.flush().then(flushed);
    });
    expect(rawSave).not.toHaveBeenCalled();
    expect(flushed).not.toHaveBeenCalled();
    await act(async () => { releaseEarlier(true); await earlier; });
    await waitFor(() => expect(rawSave).toHaveBeenCalledOnce());
    await act(async () => { await Promise.resolve(); });
    expect(flushed).not.toHaveBeenCalled();
    await act(async () => {
      releaseBlur({ status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' });
      expect(await blur).toMatchObject({ status: 'saved' });
      await flushing;
    });
    expect(flushed).toHaveBeenCalledOnce();
  });

  it('keeps a held Note A completion and stale callbacks outside Note B, with a composition-aware flush boundary', async () => {
    const makeFixture = (noteId: string) => {
      const flow = createTextBlockContentV1(`original ${noteId}`);
      const block: NoteBlock = {
        id: `block-${noteId}`, block_type: 'text', title: null, plain_text: `original ${noteId}`,
        content_json: { [TEXT_FLOW_CONTENT_KEY]: flow }, metadata: {}, source_references: [], order_index: 0,
        placement_id: `placement-${noteId}`, display_overrides_json: {}, canvas_layout: null,
      };
      const rangeSession = createBoardTextRangeEditSession(noteId, async (_noteId, ranges) => ranges);
      rangeSession.hydrate([]);
      return { flow, block, rangeSession, flows: {} as Record<string, TextBlockContentV1>, texts: {} as Record<string, string>, annotations: [] as AnnotationTruthV1[] };
    };
    const fixtures: Record<string, ReturnType<typeof makeFixture>> = { A: makeFixture('A'), B: makeFixture('B') };
    let finishA!: (outcome: BlockSaveOutcome) => void;
    const heldA = new Promise<BlockSaveOutcome>((resolve) => { finishA = resolve; });
    const save = vi.fn(async (block: NoteBlock): Promise<BlockSaveOutcome> => block.id === 'block-A'
      ? heldA : { status: 'saved', block, recoveryReceipt: null, reconciliation: 'response' });
    const subject = renderHook(({ noteId }: { noteId: string }) => {
      const [, renderAgain] = useState(0);
      const fixture = fixtures[noteId];
      const historyHost = useRef<TextFlowHistoryHost | null>(null);
      const editing = useTextFlowHistory({
        noteId, generation: 1, blocks: [fixture.block], annotationTruths: fixture.annotations,
        readAnnotationTruths: () => fixture.annotations,
        setAnnotationTruthsSnapshot: (annotations) => { fixture.annotations = annotations; renderAgain((value) => value + 1); },
        blockTextFlowDrafts: fixture.flows,
        setBlockTextFlowDrafts: (next) => { fixture.flows = typeof next === 'function' ? next(fixture.flows) : next; renderAgain((value) => value + 1); },
        setBlockTextDrafts: (next) => { fixture.texts = typeof next === 'function' ? next(fixture.texts) : next; renderAgain((value) => value + 1); },
        captureBoardTextRanges: fixture.rangeSession.snapshot, restoreBoardTextRanges: fixture.rangeSession.restore,
        rebaseBoardTextRanges: fixture.rangeSession.rebase, saveBlock: save, saveAnnotationTruthsOutcome: async () => true, history: historyHost,
      });
      const history = usePlacementHistory({
        noteId, generation: 1, beforeHistoryBoundary: () => editing.boundary(),
        applyLayoutDrafts: vi.fn(), persistLayoutSnapshot: vi.fn(), target: null,
      });
      historyHost.current = history;
      return { editing, history, fixture };
    }, { initialProps: { noteId: 'A' } });
    const editedA = { ...fixtures.A.flow, units: fixtures.A.flow.units.map((unit) => ({ ...unit, text: `${unit.text} typed` })) };
    const metadata: TextFlowEditMetadata = {
      unitId: 'tu-1', inputType: 'insertText', kind: 'typing', isComposing: false,
      beforeSelection: { unitId: 'tu-1', start: 10, end: 10 }, afterSelection: { unitId: 'tu-1', start: 16, end: 16 },
    };
    await act(async () => {
      await subject.result.current.editing.applyEdit(fixtures.A.block, editedA, { metadata });
      subject.result.current.editing.boundary('blur');
    });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const oldEditing = subject.result.current.editing;
    const oldHistory = subject.result.current.history;
    subject.rerender({ noteId: 'B' });
    await act(async () => {
      expect(await subject.result.current.history.undoRuntimeHistory()).toBe(false);
      await subject.result.current.editing.flush();
      finishA({ status: 'saved', block: fixtures.A.block, recoveryReceipt: null, reconciliation: 'response' });
      expect(await oldHistory.whenHistoryIdle()).toBe(false);
      expect(await oldEditing.applyEdit(fixtures.A.block, editedA, { metadata })).toBeUndefined();
      expect(await oldEditing.saveBlock(fixtures.A.block, 'old retry', { textFlow: editedA })).toMatchObject({ status: 'rejected' });
      expect(await oldHistory.undoRuntimeHistory()).toBe(false);
    });
    expect(subject.result.current.fixture).toBe(fixtures.B);
    expect(fixtures.B.flows).toEqual({});
    expect(fixtures.B.texts).toEqual({});
    expect(fixtures.B.annotations).toEqual([]);
    expect(save).toHaveBeenCalledTimes(1);
    await expect(oldEditing.flush()).rejects.toThrow();
    await expect(subject.result.current.editing.flush()).resolves.toBeUndefined();
    act(() => { subject.result.current.editing.boundary('compositionStart'); });
    await expect(subject.result.current.editing.flush()).rejects.toThrow('composition');
    act(() => { subject.result.current.editing.boundary('compositionEnd'); });
    await expect(subject.result.current.editing.flush()).resolves.toBeUndefined();
  });
});
