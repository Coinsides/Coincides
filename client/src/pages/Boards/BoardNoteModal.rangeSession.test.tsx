import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { BoardTextRangeSelection, BoardTextRangeV1 } from '@shared/types/boardTextRange';
import type { Note, NoteBlock } from '../Notes/canvasEngine/runtimeDataTypes';
import type { useNoteCanvasDataAdapter } from '../Notes/canvasEngine/hooks/useNoteCanvasDataAdapter';
import { createTextBlockContentV1, TEXT_FLOW_CONTENT_KEY } from '../Notes/canvasEngine/textFlowService';
import BoardNoteModal from './BoardNoteModal';

const probe = vi.hoisted(() => ({
  get: vi.fn(), put: vi.fn(), addToast: vi.fn(), mounts: 0,
  adapter: null as ReturnType<typeof useNoteCanvasDataAdapter> | null,
  sent: null as Promise<boolean> | null,
  saves: [] as Array<ReturnType<ReturnType<typeof useNoteCanvasDataAdapter>['saveBlock']>>,
}));

vi.mock('@/services/api', () => ({
  getToken: () => null, setToken: vi.fn(), default: { get: probe.get, put: probe.put } }));
vi.mock('@/stores/uiStore', () => ({
  useUIStore: (selector: (state: { addToast: typeof probe.addToast }) => unknown) => selector({ addToast: probe.addToast }),
}));

// Only the editor rendering is replaced. The modal/provider send callback, adapter,
// range session, rebase, and atomic text-save repository remain real.
vi.mock('../Notes/canvasEngine/NoteCanvasRuntime', async () => {
  const React = await import('react');
  const { NoteCanvasRuntimeContext } = await import('../Notes/canvasEngine/NoteCanvasRuntimeProvider');
  const { useNoteCanvasDataAdapter } = await import('../Notes/canvasEngine/hooks/useNoteCanvasDataAdapter');
  const { getTextFlowContent } = await import('../Notes/canvasEngine/textFlowService');
  const noop = () => undefined;
  return { default: React.forwardRef(function EditorProbe(_props: unknown, ref) {
    const context = React.useContext(NoteCanvasRuntimeContext)!;
    const adapter = useNoteCanvasDataAdapter({
      noteId: context.noteId, hostMode: context.hostMode,
      onNoteLoaded: noop, clearLayoutDraftForBlock: noop, setLayoutDraftForBlock: noop,
    });
    probe.adapter = adapter;
    const draft = React.useRef<ReturnType<typeof getTextFlowContent>>(null);
    const [text, setText] = React.useState<string | null>(null);
    React.useEffect(() => { probe.mounts += 1; }, []);
    React.useImperativeHandle(ref, () => ({
      dismissTransientUI: noop,
      flushPendingSaves: adapter.whenIdle,
      refreshBoardTextRanges: adapter.refreshBoardTextRanges,
    }), [adapter.whenIdle, adapter.refreshBoardTextRanges]);
    const block = adapter.blocks[0];
    if (adapter.loading || !block) return <span>Loading editor</span>;
    const flow = getTextFlowContent(block.content_json)!;
    return <>
      <textarea aria-label="Session editor" value={text ?? block.plain_text ?? ''}
        onChange={(event) => {
          const previous = draft.current ?? flow;
          const next = { ...previous, units: [{ ...previous.units[0], text: event.target.value }] };
          adapter.rebaseBoardTextRanges(block.id, previous, next);
          draft.current = next;
          setText(event.target.value);
        }}
        onBlur={() => {
          if (!draft.current) return;
          const next = draft.current;
          draft.current = null;
          probe.saves.push(adapter.saveBlock(block, next.units[0].text, { textFlow: next, silent: true }));
        }} />
      <button type="button" onClick={() => {
        const excerpt = 'Qing expanded the empire.';
        const current = (draft.current ?? flow).units[0];
        const start = current.text.indexOf(excerpt);
        probe.sent = context.onSendToStaging!({
          note_id: context.noteId!, block_id: block.id, text_flow_id: `textflow-${block.id}`,
          text_unit_id: current.id, start_offset: start, end_offset: start + excerpt.length,
          excerpt, at: '2026-09-09T00:00:00.000Z',
        });
      }}>Send to staging</button>
    </>;
  }) };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
  probe.adapter = null;
  probe.sent = null;
  probe.saves = [];
  probe.mounts = 0;
});

it('registers a range minted in the open modal and keeps it Live after same-session prefix edits and save', async () => {
  sessionStorage.clear();
  const body = 'Ming used centralized administration. Qing expanded the empire.';
  const flow = createTextBlockContentV1(body);
  flow.units[0].id = 'dynasty-unit';
  const note: Note = {
    id: 'session-source', course_id: '', title: 'Dynasty source', description: null, status: 'active', metadata: {},
  };
  let durableBlock: NoteBlock = {
    id: 'dynasty-block', placement_id: 'dynasty-placement', display_overrides_json: {}, canvas_layout: null,
    block_type: 'text', title: null, content_json: { body, [TEXT_FLOW_CONTENT_KEY]: flow }, plain_text: body,
    metadata: {}, order_index: 0, source_references: [],
  };
  let durableRanges: BoardTextRangeV1[] = [];
  const byNoteUrl = `/boards/text-ranges/by-note/${note.id}`;
  const calls: string[] = [];
  const registration = deferred<{ data: { text_ranges: BoardTextRangeV1[] } }>();
  let rangeReads = 0;
  probe.get.mockImplementation(async (url: string) => {
    if (url === '/palette-colors') return { data: [] };
    if (url === byNoteUrl) {
      calls.push('ranges GET');
      rangeReads += 1;
      if (rangeReads === 2) return registration.promise;
      return { data: { text_ranges: copy(durableRanges) } };
    }
    if (url === `/notes/${note.id}`) return { data: copy(note) };
    if (url === `/notes/${note.id}/blocks`) return { data: [copy(durableBlock)] };
    if (url === `/canvas-objects/by-note/${note.id}`) return { data: {} };
    if (url === '/canvas-objects/coordinate-contract') return { data: { coordinate_contract: 'v1' } };
    if ([`/annotation-truths/by-note/${note.id}`, '/content-groups', '/group-folders', '/purposes', '/templates'].includes(url)) {
      return { data: [] };
    }
    throw new Error(`Unexpected fixture GET ${url}`);
  });
  probe.put.mockImplementation(async (url: string, payload: Record<string, unknown>) => {
    if (url === `/note-blocks/${durableBlock.id}/text-save`) {
      calls.push('atomic PUT');
      expect(payload.base_revision).toBe(durableBlock.text_save_revision ?? 0);
      durableBlock = { ...durableBlock, ...copy(payload.block as Partial<NoteBlock>), text_save_revision: (durableBlock.text_save_revision ?? 0) + 1 };
      const patches = payload.text_ranges as Array<Partial<BoardTextRangeV1> & { id: string }>;
      const saved = patches.map((patch) => ({ ...durableRanges.find((range) => range.id === patch.id)!, ...patch }));
      durableRanges = durableRanges.map((range) => saved.find((next) => next.id === range.id) ?? range);
      return { data: { block: copy(durableBlock), annotations: [], text_ranges: copy(durableRanges), revision: durableBlock.text_save_revision } };
    }
    throw new Error(`Unexpected fixture PUT ${url}`);
  });
  const mint = vi.fn(async (selection: BoardTextRangeSelection) => {
    calls.push('mint');
    expect(durableBlock.plain_text?.slice(selection.start_offset, selection.end_offset)).toBe(selection.excerpt);
    durableRanges.push({
      ...selection, id: 'new-modal-anchor', board_id: 'closing-board', status: 'active', pre_edit_offsets: null,
      created_at: selection.at, updated_at: selection.at,
    });
    return true;
  });
  const closed = vi.fn();
  function Host() {
    const [open, setOpen] = useState(true);
    return open && <BoardNoteModal noteId={note.id} onSendToStaging={mint}
      onClosed={() => { closed(); setOpen(false); }} onSwitchNote={vi.fn()} onOpenFullPage={vi.fn()} />;
  }
  render(<MemoryRouter><Host /></MemoryRouter>);
  const editor = await screen.findByRole('textbox', { name: 'Session editor' }) as HTMLTextAreaElement;
  expect(durableRanges).toEqual([]);
  expect(rangeReads).toBe(1);
  editor.focus();
  fireEvent.click(screen.getByRole('button', { name: 'Send to staging' }));
  await waitFor(() => expect(rangeReads).toBe(2));
  expect(calls).toEqual(['ranges GET', 'mint', 'ranges GET']);
  expect(screen.getByRole('status').textContent).toContain('Saving');
  expect(fireEvent.keyDown(editor, { key: 'x' })).toBe(false);
  expect(closed).not.toHaveBeenCalled();
  await act(async () => {
    registration.resolve({ data: { text_ranges: copy(durableRanges) } });
    expect(await probe.sent).toBe(true);
  });
  expect(mint).toHaveBeenCalledOnce();
  expect(durableRanges[0]).toMatchObject({ start_offset: 38, end_offset: 63, status: 'active' });

  // Refresh while this existing anchor has an unsaved edit. Its stale GET row
  // must not replace the rebased range or reset the draft's previous TextFlow.
  editor.focus();
  fireEvent.change(editor, { target: { value: `Con${body}` } });
  await act(async () => { await probe.adapter!.refreshBoardTextRanges(); });
  expect(editor.value).toBe(`Con${body}`);
  expect(durableBlock.plain_text).toBe(body);
  expect(probe.put).not.toHaveBeenCalled();
  fireEvent.change(editor, { target: { value: `Context: ${body}` } });
  expect(probe.mounts).toBe(1);
  expect(probe.get.mock.calls.filter(([url]) => url === `/notes/${note.id}/blocks`)).toHaveLength(1);
  fireEvent.keyDown(editor, { key: 'Escape' });
  await waitFor(() => expect(closed).toHaveBeenCalledOnce());
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(probe.saves).toHaveLength(1);
  expect(await probe.saves[0]).toMatchObject({ status: 'saved' });
  expect(calls).toEqual(['ranges GET', 'mint', 'ranges GET', 'ranges GET', 'atomic PUT']);
  expect(probe.put).toHaveBeenCalledOnce();
  expect(durableBlock.plain_text).toBe(`Context: ${body}`);
  expect(durableRanges).toHaveLength(1);
  expect(durableRanges[0]).toMatchObject({
    id: 'new-modal-anchor', status: 'active', start_offset: 47, end_offset: 72,
    excerpt: 'Qing expanded the empire.', pre_edit_offsets: null,
  });
  // In-memory replay checks the same strict addressed-unit slice as the server;
  // real server replay and the board's rendered Live label belong to the journey.
  const persistedFlow = durableBlock.content_json[TEXT_FLOW_CONTENT_KEY] as typeof flow;
  const anchor = durableRanges[0];
  expect(anchor.text_flow_id).toBe(`textflow-${durableBlock.id}`);
  const unit = persistedFlow.units.find((entry) => entry.id === anchor.text_unit_id)!;
  expect(unit.text.slice(anchor.start_offset!, anchor.end_offset!)).toBe(anchor.excerpt);
  expect(probe.addToast.mock.calls.filter(([kind]) => kind === 'error')).toEqual([]);
});
