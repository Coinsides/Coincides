import { useLayoutEffect, useRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider, useParams } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DocumentTabs } from './DocumentTabs';
import { AgentUiBridge } from './AgentUiBridge';
import { useDocumentTabsStore } from '@/stores/documentTabsStore';
import { useAgentUiStore } from '@/stores/agentUiStore';
import { NoteRouteSaveBoundary } from '@/pages/Notes/canvasEngine/hooks/useNoteRouteSaveBoundary';
import { useNoteDocumentShell } from '@/pages/Notes/canvasEngine/hooks/useNoteDocumentShell';
import { usePageReadingViewportController } from '@/pages/Notes/canvasEngine/hooks/usePageReadingViewportController';
import type { AgentUiCommand } from '@shared/types/agentUiCommand';

let finish: () => void;
let save: Promise<void>;
let durable: Record<string, string>;
const scroll = vi.fn(function (this: HTMLElement, options: ScrollToOptions) { this.scrollTop = options.top ?? 0; this.scrollLeft = options.left ?? 0; });

function Note() {
  const { id = '' } = useParams();
  const [text, setText] = useState('Original');
  const ref = useRef<HTMLDivElement>(null);
  const reading = usePageReadingViewportController({ noteId: id });
  useNoteDocumentShell({ noteId: id, title: `Paper ${id}`, projectId: 'project', enabled: true, blockListRef: ref,
    resolveTarget: (target) => target.type === 'note_block' ? { rect: { x: 10, y: 800, width: 100, height: 80 }, selector: '[data-note-block-shell]', id: target.block_id } : null });
  const handle = useRef({ dismissTransientUI: () => {}, flushPendingSaves: () => save, refreshBoardTextRanges: async () => {} });
  return <><div data-note-host-mode="page" data-page-display-scale="1" ref={ref}>
    <textarea aria-label="Paper text" value={text} onChange={(event) => setText(event.target.value)} onBlur={() => { void save.then(() => { durable[id] = text; }); }}/>
    <div data-note-block-shell="true" data-block-id="block">Content</div>
    <button onClick={() => reading.nudgePageReadingStep(1)}>Read larger</button><output aria-label="Reading scale">{reading.pageReadingViewState.stepFactor}</output>
  </div><NoteRouteSaveBoundary noteId={id} runtimeRef={handle}/></>;
}
function Shell() { return <><DocumentTabs/><AgentUiBridge/><main data-app-main-scroll="true"><Outlet/></main></>; }
function host() {
  const router = createMemoryRouter([{ element: <Shell/>, children: [
    { path: '/notes/:id', element: <Note/> }, { path: '/projects/:id', element: <p>Project list</p> },
  ] }], { initialEntries: ['/notes/a'] });
  return { router, ...render(<RouterProvider router={router}/>) };
}
const command = (id: string): AgentUiCommand => ({ command_id: id, turn_id: 'turn', conversation_id: 'conv', kind: 'open_note', target: { type: 'note', note_id: id } });
beforeEach(() => {
  useDocumentTabsStore.getState().reset(); useAgentUiStore.getState().reset();
  durable = {}; save = new Promise((resolve) => { finish = resolve; });
  scroll.mockClear(); Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, writable: true, value: scroll });
});
afterEach(async () => { finish(); cleanup(); await act(async () => {}); });

it('opens one tab per document, switches with blur save, and restores independent scroll and reading step', async () => {
  const { router } = host();
  await screen.findByRole('tab', { name: 'Paper a' });
  fireEvent.click(screen.getByText('Read larger'));
  const scale = screen.getByLabelText('Reading scale').textContent;
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 70)); });
  const main = document.querySelector('main')!;
  main.scrollTop = 430; fireEvent.scroll(main);
  screen.getByLabelText('Paper text').focus();
  fireEvent.change(screen.getByLabelText('Paper text'), { target: { value: 'Kept at blur' } });
  act(() => useDocumentTabsStore.getState().open({ kind: 'note', id: 'b', title: 'Paper b' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Paper b' }));
  expect(router.state.location.pathname).toBe('/notes/a');
  await act(async () => finish());
  await waitFor(() => expect(router.state.location.pathname).toBe('/notes/b'));
  expect(durable.a).toBe('Kept at blur');
  expect(screen.getByLabelText('Reading scale').textContent).toBe('1');
  fireEvent.click(screen.getByRole('tab', { name: 'Paper a' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/notes/a'));
  await waitFor(() => expect(main.scrollTop).toBe(430));
  expect(screen.getByLabelText('Reading scale').textContent).toBe(scale);
  expect(screen.getAllByRole('tab')).toHaveLength(2);
});

it('reorders by drag and keyboard; middle click and close remove only tabs after safe departure', async () => {
  host(); await screen.findByRole('tab', { name: 'Paper a' });
  act(() => useDocumentTabsStore.getState().open({ kind: 'note', id: 'b', title: 'Paper b' }));
  const a = screen.getByRole('tab', { name: 'Paper a' });
  const b = screen.getByRole('tab', { name: 'Paper b' });
  const dataTransfer = { effectAllowed: '', setData: vi.fn() };
  fireEvent.dragStart(b.parentElement!, { dataTransfer }); fireEvent.dragOver(a.parentElement!); fireEvent.drop(a.parentElement!);
  expect(useDocumentTabsStore.getState().tabs.map((tab) => tab.id)).toEqual(['b', 'a']);
  fireEvent.keyDown(a, { key: 'ArrowLeft', altKey: true });
  expect(useDocumentTabsStore.getState().tabs.map((tab) => tab.id)).toEqual(['a', 'b']);
  fireEvent(b.parentElement!, new MouseEvent('auxclick', { bubbles: true, button: 1 }));
  expect(screen.queryByRole('tab', { name: 'Paper b' })).toBeNull();
  fireEvent.click(screen.getByLabelText('关闭 Paper a'));
  expect(screen.getByRole('tab', { name: 'Paper a' })).toBeTruthy();
  await act(async () => finish());
  await screen.findByText('Project list');
  expect(screen.queryAllByRole('tab')).toHaveLength(0);
  expect(Object.keys(durable)).toHaveLength(0);
});

it('derives the sky badge from live activity and reserves an empty notification slot', async () => {
  host(); await screen.findByRole('tab', { name: 'Paper a' });
  act(() => useAgentUiStore.setState({ activities: { call: { note_id: 'a' } } }));
  expect(screen.getByLabelText('Agent 正在操作')).toBeTruthy();
  expect(document.querySelector('[data-document-notification-slot="note:a"]')?.textContent).toBe('');
  act(() => useAgentUiStore.setState({ activities: {} }));
  expect(screen.queryByLabelText('Agent 正在操作')).toBeNull();
});

it('defers commands throughout text ownership and composition, keeps only the latest, then opens its tab', async () => {
  const { router } = host(); await screen.findByRole('tab', { name: 'Paper a' });
  const input = screen.getByLabelText('Paper text'); input.focus(); fireEvent.compositionStart(input);
  act(() => useAgentUiStore.getState().enqueue(command('b')));
  act(() => useAgentUiStore.getState().enqueue(command('c')));
  expect(router.state.location.pathname).toBe('/notes/a'); expect(document.activeElement).toBe(input);
  fireEvent.compositionEnd(input); await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });
  expect(router.state.location.pathname).toBe('/notes/a');
  act(() => (input as HTMLElement).blur()); await act(async () => finish());
  await waitFor(() => expect(router.state.location.pathname).toBe('/notes/c'));
  await screen.findByRole('tab', { name: 'Paper c' });
  expect(screen.queryByRole('tab', { name: 'Paper b' })).toBeNull();
});

it('scrolls and briefly highlights a block without selecting an editor or saving any content', async () => {
  host(); await screen.findByRole('tab', { name: 'Paper a' });
  act(() => useAgentUiStore.getState().enqueue({ ...command('hit'), kind: 'focus_object', target: { type: 'note_block', note_id: 'a', block_id: 'block' } }));
  await waitFor(() => expect(document.querySelector('[data-agent-ui-highlight="true"]')).not.toBeNull());
  expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ top: 776, behavior: 'auto' }));
  expect(document.activeElement).not.toBe(screen.getByLabelText('Paper text'));
  expect(durable).toEqual({});
  act(() => useAgentUiStore.setState({ focusCommand: null }));
  expect(document.querySelector('[data-agent-ui-highlight="true"]')).toBeNull();
});
