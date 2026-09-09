import type { BoardTextRangeV1 } from '../../../../../shared/types/boardTextRange';
import { textFlowIdForBlock } from '../../../../../shared/types/textFlow';
import { deriveSingleTextEditDelta, rebaseTextUnitAnnotationRanges } from './rangeRebaseService';
import type { TextBlockContentV1 } from './runtimeDataTypes';

function drifted(range: BoardTextRangeV1): BoardTextRangeV1 {
  return {
    ...range,
    status: 'drifted',
    start_offset: null,
    end_offset: null,
    pre_edit_offsets: range.pre_edit_offsets ?? {
      start_offset: range.start_offset,
      end_offset: range.end_offset,
    },
  };
}

/** Same unit algorithm as annotations, with board-owned snapshots and explicit degradation. */
export function rebaseBoardTextRanges(input: {
  ranges: BoardTextRangeV1[];
  blockId: string;
  previousTextFlow: TextBlockContentV1 | null;
  nextTextFlow: TextBlockContentV1 | null;
}): BoardTextRangeV1[] {
  const previousUnits = input.previousTextFlow?.units ?? [];
  const nextUnits = input.nextTextFlow?.units ?? [];
  const structureChanged = previousUnits.length !== nextUnits.length
    || previousUnits.some((unit, index) => unit.id !== nextUnits[index]?.id);
  return input.ranges.map((range) => {
    if (range.block_id !== input.blockId || range.status !== 'active') return range;
    const before = previousUnits.find((unit) => unit.id === range.text_unit_id);
    const after = nextUnits.find((unit) => unit.id === range.text_unit_id);
    if (before && after && before.text === after.text) return range;
    if (
      !before || !after || structureChanged
      || range.text_flow_id !== textFlowIdForBlock(input.blockId)
      || range.start_offset === null || range.end_offset === null
      || range.start_offset < 0 || range.end_offset <= range.start_offset
      || range.end_offset > before.text.length
      || before.text.slice(range.start_offset, range.end_offset) !== range.excerpt
    ) return drifted(range);

    const delta = deriveSingleTextEditDelta(before.text, after.text);
    const result = rebaseTextUnitAnnotationRanges({
      textUnitId: range.text_unit_id,
      oldText: before.text,
      newText: after.text,
      ...delta,
      ranges: [{
        id: range.id,
        target_kind: 'text_span',
        block_id: range.block_id,
        text_flow_id: range.text_flow_id,
        text_unit_id: range.text_unit_id,
        start_offset: range.start_offset,
        end_offset: range.end_offset,
        range_text_cache: range.excerpt,
      }],
    });
    const rebased = result.next_ranges[0];
    if (
      typeof rebased.start_offset !== 'number' || typeof rebased.end_offset !== 'number'
      || rebased.end_offset <= rebased.start_offset || rebased.end_offset > after.text.length
    ) return drifted(range);
    return {
      ...range,
      start_offset: rebased.start_offset,
      end_offset: rebased.end_offset,
      excerpt: after.text.slice(rebased.start_offset, rebased.end_offset),
    };
  });
}

export interface BoardRangeSaveSnapshot {
  ranges: BoardTextRangeV1[];
}

/** Local edit state. Body writes and range writes deliberately remain separate (TD-6). */
export function createBoardTextRangeEditSession(
  noteId: string,
  persist: (noteId: string, ranges: BoardTextRangeV1[]) => Promise<BoardTextRangeV1[]>,
) {
  let loaded = false;
  let ranges: BoardTextRangeV1[] = [];
  const dirty = new Set<string>();
  const failedSnapshots = new Map<string, BoardTextRangeV1>();
  const drafts = new Map<string, TextBlockContentV1 | null>();
  return {
    hydrate(nextRanges: BoardTextRangeV1[]) {
      // A refresh must not erase a failed second write that the user can still retry.
      // Unsaved drafts are reset by note hydration; only confirmed-body/failed-range writes survive it.
      ranges = nextRanges.map((range) => failedSnapshots.get(range.id) ?? range);
      dirty.clear();
      ranges.forEach((range) => { if (failedSnapshots.has(range.id)) dirty.add(range.id); });
      drafts.clear();
      loaded = true;
    },
    mergeNewRanges(nextRanges: BoardTextRangeV1[]) {
      // Mid-session minting only registers new identities. Existing ranges may
      // already have local edits or an in-flight save, so keep them and drafts.
      const knownIds = new Set(ranges.map((range) => range.id));
      for (const range of nextRanges) {
        if (range.note_id !== noteId || knownIds.has(range.id)) continue;
        ranges.push(range);
        knownIds.add(range.id);
      }
    },
    rebase(blockId: string, previousTextFlow: TextBlockContentV1 | null, nextTextFlow: TextBlockContentV1 | null) {
      if (!loaded) return;
      const previous = drafts.has(blockId) ? drafts.get(blockId)! : previousTextFlow;
      if (previous === nextTextFlow) return;
      const nextRanges = rebaseBoardTextRanges({ ranges, blockId, previousTextFlow: previous, nextTextFlow });
      nextRanges.forEach((range, index) => {
        if (range !== ranges[index]) dirty.add(range.id);
      });
      ranges = nextRanges;
      drafts.set(blockId, nextTextFlow);
    },
    capture(blockId: string): BoardRangeSaveSnapshot {
      if (!loaded) throw new Error('Board references are not loaded; reopen the note before saving');
      return { ranges: ranges.filter((range) => range.block_id === blockId && dirty.has(range.id)) };
    },
    async persist(snapshot: BoardRangeSaveSnapshot) {
      if (snapshot.ranges.length === 0) return;
      let saved: BoardTextRangeV1[];
      try {
        saved = await persist(noteId, snapshot.ranges);
      } catch (error) {
        snapshot.ranges.forEach((range) => failedSnapshots.set(range.id, range));
        throw error;
      }
      const savedById = new Map(saved.map((range) => [range.id, range]));
      const issuedById = new Map(snapshot.ranges.map((range) => [range.id, range]));
      if (snapshot.ranges.some((range) => !savedById.has(range.id))) {
        snapshot.ranges.forEach((range) => failedSnapshots.set(range.id, range));
        throw new Error('Some board references were not acknowledged');
      }
      snapshot.ranges.forEach((range) => failedSnapshots.delete(range.id));
      ranges = ranges.map((range) => {
        if (issuedById.get(range.id) !== range) return range;
        dirty.delete(range.id);
        return savedById.get(range.id)!;
      });
    },
  };
}
