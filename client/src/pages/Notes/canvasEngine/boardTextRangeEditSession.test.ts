import { describe, expect, it, vi } from 'vitest';
import type { BoardTextRangeV1 } from '../../../../../shared/types/boardTextRange';
import { createBoardTextRangeEditSession, rebaseBoardTextRanges } from './boardTextRangeEditSession';
import { createTextBlockContentV1 } from './textFlowService';

const flow = (text: string) => {
  const result = createTextBlockContentV1(text);
  return { ...result, units: result.units.map((unit) => ({ ...unit, id: 'unit-1' })) };
};
const anchor = (id = 'range-1'): BoardTextRangeV1 => ({
  id, board_id: `board-${id}`, note_id: 'note-1', block_id: 'block-1',
  text_flow_id: 'textflow-block-1', text_unit_id: 'unit-1',
  start_offset: 6, end_offset: 10, excerpt: 'beta', status: 'active', pre_edit_offsets: null,
  at: '2026-09-09T00:00:00.000Z', created_at: '', updated_at: '',
});
const rebase = (next: string, ranges = [anchor()]) => rebaseBoardTextRanges({
  ranges, blockId: 'block-1', previousTextFlow: flow('alpha beta gamma'), nextTextFlow: flow(next),
});

describe('board-owned text range editing', () => {
  it('moves both independent board anchors when text is inserted before the selected passage', () => {
    expect(rebase('prefix alpha beta gamma', [anchor('one'), anchor('two')]))
      .toEqual([
        { ...anchor('one'), start_offset: 13, end_offset: 17 },
        { ...anchor('two'), start_offset: 13, end_offset: 17 },
      ]);
  });

  it('tracks a valid replacement inside the selected passage', () => {
    expect(rebase('alpha better gamma')[0]).toMatchObject({
      start_offset: 6, end_offset: 12, excerpt: 'better', status: 'active',
    });
  });

  it.each(['alpha  gamma', 'alph gamma'])('keeps the last snapshot when deletion collapses or crosses the range: %s', (text) => {
    expect(rebase(text)[0]).toMatchObject({
      status: 'drifted', start_offset: null, end_offset: null, excerpt: 'beta',
      pre_edit_offsets: { start_offset: 6, end_offset: 10 },
    });
  });

  it('marks the affected split/merge unit explicitly drifted and leaves untouched units active', () => {
    const before = flow('alpha beta gamma');
    const after = flow('alpha be');
    after.units.push({ ...after.units[0], id: 'unit-2', text: 'ta gamma' });
    const split = rebaseBoardTextRanges({
      ranges: [anchor()], blockId: 'block-1', previousTextFlow: before, nextTextFlow: after,
    });
    expect(split[0]).toMatchObject({ status: 'drifted', excerpt: 'beta', pre_edit_offsets: { start_offset: 6, end_offset: 10 } });
    const merged = rebaseBoardTextRanges({
      ranges: [{ ...anchor(), text_unit_id: 'unit-2' }], blockId: 'block-1', previousTextFlow: after, nextTextFlow: before,
    });
    expect(merged[0].status).toBe('drifted');
    const unrelated = { ...after, units: [{ ...before.units[0] }, after.units[1]] };
    expect(rebaseBoardTextRanges({ ranges: [anchor()], blockId: 'block-1', previousTextFlow: before, nextTextFlow: unrelated })[0].status).toBe('active');
  });

  it('keeps pending snapshots after failed sync and does not double rebase the save fallback', async () => {
    const persist = vi.fn(async (_note: string, ranges: BoardTextRangeV1[]) => ranges);
    persist.mockRejectedValueOnce(new Error('second write failed'));
    const session = createBoardTextRangeEditSession('note-1', persist);
    session.hydrate([anchor()]);
    const before = flow('alpha beta gamma');
    const after = flow('prefix alpha beta gamma');
    session.rebase('block-1', before, after);
    session.rebase('block-1', before, structuredClone(after));
    const snapshot = session.capture('block-1');
    expect(snapshot.ranges[0].start_offset).toBe(13);
    await expect(session.persist(snapshot)).rejects.toThrow('second write failed');
    expect(session.capture('block-1')).toEqual(snapshot);
    await session.persist(session.capture('block-1'));
    expect(session.capture('block-1').ranges).toEqual([]);
  });

  it('does not discard a later local edit when an earlier saved snapshot completes', async () => {
    let resolve!: (ranges: BoardTextRangeV1[]) => void;
    const persist = vi.fn(() => new Promise<BoardTextRangeV1[]>((complete) => { resolve = complete; }));
    const session = createBoardTextRangeEditSession('note-1', persist);
    session.hydrate([anchor()]);
    const before = flow('alpha beta gamma');
    const first = flow('prefix alpha beta gamma');
    session.rebase('block-1', before, first);
    const firstSnapshot = session.capture('block-1');
    const saving = session.persist(firstSnapshot);
    session.rebase('block-1', first, flow('more prefix alpha beta gamma'));
    resolve(firstSnapshot.ranges);
    await saving;
    expect(session.capture('block-1').ranges[0]).toMatchObject({ start_offset: 18, end_offset: 22 });
  });

  it('resets abandoned drafts on hydration while preserving a failed second write for retry', async () => {
    const persist = vi.fn(async (_note: string, ranges: BoardTextRangeV1[]) => ranges);
    const session = createBoardTextRangeEditSession('note-1', persist);
    const before = flow('alpha beta gamma');
    const after = flow('prefix alpha beta gamma');
    session.hydrate([anchor()]);
    session.rebase('block-1', before, after);
    session.hydrate([anchor()]);
    expect(session.capture('block-1').ranges).toEqual([]);
    session.rebase('block-1', before, after);
    persist.mockRejectedValueOnce(new Error('failed second write'));
    await expect(session.persist(session.capture('block-1'))).rejects.toThrow();
    session.hydrate([{ ...anchor(), status: 'drifted' }]);
    expect(session.capture('block-1').ranges[0]).toMatchObject({ status: 'active', start_offset: 13 });
    session.rebase('block-1', after, flow('more prefix alpha beta gamma'));
    expect(session.capture('block-1').ranges[0].start_offset).toBe(18);
  });

  it('restores the captured identities after drift without replacing a later board reference', async () => {
    const persist = vi.fn(async (_note: string, ranges: BoardTextRangeV1[]) => ranges);
    const session = createBoardTextRangeEditSession('note-1', persist);
    const before = flow('alpha beta gamma');
    const after = flow('alph gamma');
    session.hydrate([anchor()]);
    const original = session.snapshot('block-1');
    session.rebase('block-1', before, after);
    const changed = session.snapshot('block-1');
    expect(changed.ranges[0].status).toBe('drifted');
    const later = { ...anchor('later'), start_offset: 0, end_offset: 4, excerpt: 'alph' };
    session.mergeNewRanges([later]);

    session.restore('block-1', before, original);
    // The ordinary save fallback must see the restored draft baseline.
    session.rebase('block-1', after, structuredClone(before));
    expect(session.snapshot('block-1').ranges).toEqual([anchor(), later]);
    await session.persist(session.capture('block-1'));
    session.restore('block-1', after, changed);
    expect(session.snapshot('block-1').ranges).toEqual([changed.ranges[0], later]);
  });

  it('retains all issued identities after partial acknowledgement and supports one retry', async () => {
    const persist = vi.fn(async (_note: string, ranges: BoardTextRangeV1[]) => ranges);
    persist.mockImplementationOnce(async (_note, ranges) => ranges.slice(0, 1));
    const session = createBoardTextRangeEditSession('note-1', persist);
    session.hydrate([anchor('one'), anchor('two')]);
    session.rebase('block-1', flow('alpha beta gamma'), flow('prefix alpha beta gamma'));
    const snapshot = session.capture('block-1');
    await expect(session.persist(snapshot)).rejects.toThrow('not acknowledged');
    expect(session.capture('block-1')).toEqual(snapshot);
    await session.persist(session.capture('block-1'));
    expect(session.capture('block-1').ranges).toEqual([]);
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it('acknowledges a cloned history snapshot without erasing a newer local range draft', async () => {
    let complete!: (ranges: BoardTextRangeV1[]) => void;
    const persist = vi.fn(() => new Promise<BoardTextRangeV1[]>((resolve) => { complete = resolve; }));
    const session = createBoardTextRangeEditSession('note-1', persist);
    session.hydrate([anchor()]);
    session.rebase('block-1', flow('alpha beta gamma'), flow('prefix alpha beta gamma'));
    const savedSnapshot = session.snapshot('block-1');
    const first = session.persist(savedSnapshot);
    complete(savedSnapshot.ranges);
    await first;
    expect(session.capture('block-1').ranges).toEqual([]);

    session.rebase('block-1', flow('prefix alpha beta gamma'), flow('more prefix alpha beta gamma'));
    const older = session.snapshot('block-1');
    const second = session.persist(older);
    session.rebase('block-1', flow('more prefix alpha beta gamma'), flow('even more prefix alpha beta gamma'));
    complete(older.ranges);
    await second;
    expect(session.capture('block-1').ranges[0].start_offset).toBe(23);
  });
});
