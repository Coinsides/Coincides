import { act, renderHook } from '@testing-library/react';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { getNoteAgentHumanEditor } from '@/lib/noteAgentHumanBridge';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../textFlowService';
import { createBoardTextRangeEditSession } from '../boardTextRangeEditSession';
import type { NoteBlock } from '../runtimeDataTypes';
import { useBlockDraftAuthority } from './useBlockDraftAuthority';
import { usePlacementHistory } from './usePlacementHistory';
import { useTextFlowHistory, type TextFlowHistoryHost } from './useTextFlowHistory';
import { useNoteAgentHumanEditor } from './useNoteAgentHumanEditor';
import type { useNoteCanvasDataAdapter } from './useNoteCanvasDataAdapter';

function setup(options: { failSave?: boolean } = {}) {
  const flow = createTextBlockContentV1('Before');
  const block: NoteBlock = { id: 'c2-block', placement_id: 'c2-placement', display_overrides_json: {},
    block_type: 'paragraph', title: null, plain_text: 'Before', content_json: { body: 'Before', [TEXT_FLOW_CONTENT_KEY]: flow },
    metadata: {}, order_index: 0, source_references: [], text_save_revision: 2 };
  const save = vi.fn<ReturnType<typeof useNoteCanvasDataAdapter>['saveBlock']>();
  const trash = vi.fn(async () => true);
  const restore = vi.fn(async () => block);
  const boardRanges = createBoardTextRangeEditSession('c2-note', async (_note, ranges) => ranges);
  boardRanges.hydrate([{ id: 'c2-range', note_id: 'c2-note', board_id: 'c2-board', block_id: block.id,
    text_flow_id: `textflow-${block.id}`, text_unit_id: flow.units[0].id, start_offset: 0, end_offset: 6,
    excerpt: 'Before', status: 'active', pre_edit_offsets: null, at: '2026-09-20', created_at: '2026-09-20', updated_at: '2026-09-20' }]);
  const result = renderHook(() => {
    const drafts = useBlockDraftAuthority();
    const [blocks, setBlocks] = useState([block]);
    const host = useRef<TextFlowHistoryHost | null>(null);
    save.mockImplementation(async (before, text, options) => {
      const next = { ...before, plain_text: text, content_json: { ...before.content_json, body: text,
        [TEXT_FLOW_CONTENT_KEY]: options?.textFlow }, text_save_revision: (options?.baseRevision ?? 2) + 1 };
      setBlocks([next]);
      return { status: 'saved', block: next, recoveryReceipt: null, reconciliation: 'response' };
    });
    if (options.failSave) save.mockImplementation(async () => { throw new Error('Synthetic save failure'); });
    const textHistory = useTextFlowHistory({ noteId: 'c2-note', generation: 1, blocks, history: host,
      annotationTruths: [], readAnnotationTruths: () => [], setAnnotationTruthsSnapshot: () => {},
      blockTextFlowDrafts: drafts.blockTextFlowDrafts, setBlockTextFlowDrafts: drafts.setBlockTextFlowDrafts,
      setBlockTextDrafts: drafts.setBlockTextDrafts, captureBoardTextRanges: boardRanges.snapshot,
      restoreBoardTextRanges: boardRanges.restore, rebaseBoardTextRanges: boardRanges.rebase,
      saveBlock: save, saveAnnotationTruthsOutcome: async () => true });
    const history = usePlacementHistory({ noteId: 'c2-note', generation: 1, beforeHistoryBoundary: textHistory.boundary,
      applyLayoutDrafts: () => {}, persistLayoutSnapshot: async () => true, trashBlockForHistory: trash, restoreBlockForHistory: restore });
    host.current = history;
    useNoteAgentHumanEditor({ noteId: 'c2-note', enabled: true, readOnly: false, textHistory,
      whenIdle: async () => {}, beforeAction: textHistory.boundary });
    return { history, textHistory };
  });
  const patch = { block_id: block.id, unit_id: flow.units[0].id, old_text: 'Before', new_text: 'After', base_revision: 2, status: 'pending' as const };
  return { ...result, save, trash, restore, patch, boardRanges };
}

describe('C2 mounted human editor and incumbent undo history', () => {
  it('accepts a unit through text-save with proposal provenance and removes that envelope from undo/redo', async () => {
    const subject = setup();
    await act(async () => expect(await getNoteAgentHumanEditor('c2-note')!.applyPatch('c2-proposal', 0, subject.patch)).toBe(true));
    expect(subject.save).toHaveBeenCalledTimes(1);
    expect(subject.save.mock.calls[0][1]).toBe('After');
    expect(subject.save.mock.calls[0][2]).toMatchObject({ baseRevision: 2, proposalPatch: { proposal_id: 'c2-proposal', patch_index: 0 } });
    await act(async () => expect(await subject.result.current.history.undoRuntimeHistory()).toBe(true));
    expect(subject.save.mock.calls[1][1]).toBe('Before');
    expect(subject.save.mock.calls[1][2]).not.toHaveProperty('proposalPatch');
    await act(async () => expect(await subject.result.current.history.redoRuntimeHistory()).toBe(true));
    expect(subject.save.mock.calls[2][1]).toBe('After');
    expect(subject.save.mock.calls[2][2]).not.toHaveProperty('proposalPatch');
    await act(async () => expect(await subject.result.current.history.redoRuntimeHistory()).toBe(false));
  });

  it('refuses changed revisions and changed unit text without creating history or writing', async () => {
    const subject = setup();
    await act(async () => {
      const editor = getNoteAgentHumanEditor('c2-note')!;
      expect(await editor.applyPatch('c2-proposal', 0, { ...subject.patch, base_revision: 1 })).toBe(false);
      expect(await editor.applyPatch('c2-proposal', 0, { ...subject.patch, old_text: 'Other' })).toBe(false);
      expect(await subject.result.current.history.undoRuntimeHistory()).toBe(false);
    });
    expect(subject.save).not.toHaveBeenCalled();
  });

  it('acknowledges a no-op proposal through text-save without inventing an undo edit', async () => {
    const subject = setup();
    await act(async () => expect(await getNoteAgentHumanEditor('c2-note')!.applyPatch('c2-proposal', 0,
      { ...subject.patch, new_text: subject.patch.old_text })).toBe(true));
    expect(subject.save.mock.calls[0][2]).toMatchObject({ proposalPatch: { proposal_id: 'c2-proposal', patch_index: 0 } });
    await act(async () => expect(await subject.result.current.history.undoRuntimeHistory()).toBe(false));
  });

  it('restores only local drafts after a failed acceptance and leaves no undo write against the unchanged server', async () => {
    const subject = setup({ failSave: true });
    const originalRange = structuredClone(subject.boardRanges.snapshot('c2-block').ranges);
    await act(async () => expect(await getNoteAgentHumanEditor('c2-note')!.applyPatch('c2-proposal', 0, subject.patch)).toBe(false));
    expect(subject.save).toHaveBeenCalledTimes(1);
    expect(subject.result.current.textHistory.readLiveFlow('c2-block')?.units[0].text).toBe('Before');
    expect(subject.boardRanges.snapshot('c2-block').ranges).toEqual(originalRange);
    await act(async () => {
      await subject.result.current.textHistory.flush();
      expect(await subject.result.current.history.undoRuntimeHistory()).toBe(false);
    });
    expect(subject.save).toHaveBeenCalledTimes(1);
  });

  it('does not expose an answer insertion exit or create writes or history when mounted', async () => {
    const subject = setup();
    expect(getNoteAgentHumanEditor('c2-note')?.applyPatch).toBeTypeOf('function');
    expect(getNoteAgentHumanEditor('c2-note')).not.toHaveProperty('insertAnswer');
    await act(async () => expect(await subject.result.current.history.undoRuntimeHistory()).toBe(false));
    expect(subject.save).not.toHaveBeenCalled();
    expect(subject.trash).not.toHaveBeenCalled();
    expect(subject.restore).not.toHaveBeenCalled();
    subject.unmount();
    expect(getNoteAgentHumanEditor('c2-note')).toBeUndefined();
  });
});
