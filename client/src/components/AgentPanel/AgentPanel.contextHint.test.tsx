import { useMemo } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AmbientAgentContextHint } from '@shared/types';
import { useAmbientAgentContextHint } from '@/hooks/useAmbientAgentContextHint';
import { selectAgentContextHint, useUIStore } from '@/stores/uiStore';
import { useAgentStore } from '@/stores/agentStore';
import AgentPanel from './AgentPanel';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http, getToken: () => null, API_BASE: '/api' }));
vi.mock('@/stores/authStore', () => ({ useAuthStore: (select: (state: { user: null }) => unknown) => select({ user: null }) }));

function AmbientView({ noteId = 'note-a', page = 0 }: { noteId?: string; page?: number }) {
  const hint = useMemo<AmbientAgentContextHint>(() => ({ type: 'note_view', data: { note_id: noteId, page_index: page } }), [noteId, page]);
  useAmbientAgentContextHint(hint);
  return <button>Reading surface</button>;
}

beforeEach(() => {
  vi.clearAllMocks();
  useUIStore.setState({ agentPanelOpen: false, agentContextHint: null, ambientAgentContextHint: null,
    ambientAgentContextOwner: null, ambientAgentContextDismissed: false });
  useAgentStore.setState({ activeConversationId: 'conversation-a', conversations: [], messages: [],
    preferenceForms: [], streaming: false, streamingText: '', activeToolName: null });
  http.get.mockResolvedValue({ data: [] });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  vi.stubGlobal('fetch', vi.fn(async () => new Response('event: done\ndata: {}\n\n', {
    headers: { 'Content-Type': 'text/event-stream' },
  })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const effective = () => selectAgentContextHint(useUIStore.getState());
const open = () => act(() => useUIStore.getState().setAgentPanelOpen(true));
async function send(text: string) {
  const input = screen.getByPlaceholderText('Message Mr. Zero...');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(useAgentStore.getState().streaming).toBe(false));
}
const body = (index: number) => JSON.parse(vi.mocked(fetch).mock.calls[index][1]!.body as string);

describe('B2 visible, passive context on the real panel and message transport', () => {
  it('only registers with the panel open, follows pages without stealing focus, and clears on departure', async () => {
    const view = render(<><AmbientView /><AgentPanel /></>);
    expect(effective()).toBeNull();
    expect(http.get).not.toHaveBeenCalled();
    open();
    expect(screen.getByText('Viewing: Note note-a · Page 1')).toBeTruthy();
    // Let the panel\'s existing initial-focus timer finish before checking page updates.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 310)); });
    screen.getByRole('button', { name: 'Reading surface' }).focus();
    view.rerender(<><AmbientView page={3} /><AgentPanel /></>);
    expect(screen.getByText('Viewing: Note note-a · Page 4')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Reading surface' }));
    expect(fetch).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
    expect(http.get).toHaveBeenCalledExactlyOnceWith('/agent/conversations');
    view.rerender(<AgentPanel />);
    expect(effective()).toBeNull();
    expect(screen.queryByText(/Viewing:/)).toBeNull();
  });

  it('sends the visible ambient hint only on user input and retains it for subsequent messages', async () => {
    render(<><AmbientView page={2} /><AgentPanel /></>);
    open();
    expect(fetch).not.toHaveBeenCalled();
    await send('Explain this page');
    await send('Continue');
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const index of [0, 1]) expect(body(index).context_hint).toEqual({
      type: 'note_view', data: { note_id: 'note-a', page_index: 2 },
    });
    expect(body(0).message).toBe('Explain this page');
    expect(screen.getByText('Viewing: Note note-a · Page 3')).toBeTruthy();
  });

  it('gives explicit hints priority for one message then shows the latest ambient page', async () => {
    const view = render(<><AmbientView /><AgentPanel /></>);
    act(() => useUIStore.getState().openAgentWithContext({ type: 'calendar', data: { date: '2026-09-14' } }));
    view.rerender(<><AmbientView page={4} /><AgentPanel /></>);
    expect(screen.getByText('Viewing: calendar')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    await send('Plan this date');
    expect(body(0).context_hint).toEqual({ type: 'calendar', data: { date: '2026-09-14' } });
    expect(screen.getByText('Viewing: Note note-a · Page 5')).toBeTruthy();
    await send('Now this page');
    expect(body(1).context_hint.data.page_index).toBe(4);
  });

  it('keeps a dismissed ambient hint absent through scrolling and restores it for a new view', async () => {
    const view = render(<><AmbientView /><AgentPanel /></>);
    open();
    const hint = screen.getByText('Viewing: Note note-a · Page 1');
    fireEvent.click(hint.querySelector('button')!);
    view.rerender(<><AmbientView page={1} /><AgentPanel /></>);
    expect(screen.queryByText(/Viewing:/)).toBeNull();
    await send('Without context');
    expect(body(0)).not.toHaveProperty('context_hint');
    view.rerender(<><AmbientView noteId="note-b" /><AgentPanel /></>);
    expect(screen.getByText('Viewing: Note note-b · Page 1')).toBeTruthy();
  });

  it('closing clears the ambient registration and reopening uses the current view', () => {
    const view = render(<><AmbientView /><AgentPanel /></>);
    open();
    act(() => useUIStore.getState().setAgentPanelOpen(false));
    expect(useUIStore.getState().ambientAgentContextHint).toBeNull();
    view.rerender(<><AmbientView noteId="note-b" page={1} /><AgentPanel /></>);
    open();
    expect(screen.getByText('Viewing: Note note-b · Page 2')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('an old owner cannot clear a newer view', () => {
    const oldOwner = Symbol('old-view');
    const nextOwner = Symbol('next-view');
    const state = useUIStore.getState();
    state.setAgentPanelOpen(true);
    state.setAmbientAgentContextHint(oldOwner, { type: 'note_view', data: { note_id: 'note-a' } });
    state.setAmbientAgentContextHint(nextOwner, { type: 'board_view', data: { board_id: 'board-b' } });
    state.clearAmbientAgentContextHint(oldOwner);
    expect(effective()).toEqual({ type: 'board_view', data: { board_id: 'board-b' } });
  });
});
