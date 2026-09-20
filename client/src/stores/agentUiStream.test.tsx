import { act, cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentMessage, AgentTurnReceipt } from '@shared/types';
import { AgentMessageRole } from '@shared/types';
import type { AgentUiCommand } from '@shared/types/agentUiCommand';
import { DocumentTabs } from '@/components/Layout/DocumentTabs';
import { useDocumentTabsStore } from './documentTabsStore';
import { useAgentUiStore } from './agentUiStore';
import { useAgentStore } from './agentStore';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http, getToken: () => null, API_BASE: '/api' }));
const command: AgentUiCommand = { command_id: 'ui-cmd', turn_id: 'ui-turn', conversation_id: 'ui-chat',
  kind: 'open_note', target: { type: 'note', note_id: 'ui-note' } };
const receipt: AgentTurnReceipt = { write_calls: [{ name: 'ui_open_note', ok: true }],
  read_calls: [], write_ok_count: 1, write_fail_count: 0 };
const event = (name: string, data: unknown) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;

beforeEach(() => {
  vi.clearAllMocks();
  useAgentStore.setState({ activeConversationId: 'ui-chat', conversations: [], messages: [],
    preferenceForms: [], streaming: false, streamingText: '', streamingReceipt: null, activeToolName: null, loading: false });
  useAgentUiStore.getState().reset();
  useDocumentTabsStore.getState().reset();
  useDocumentTabsStore.getState().open({ kind: 'note', id: 'ui-note', title: 'Paper' });
  useDocumentTabsStore.getState().open({ kind: 'board', id: 'ui-board', title: 'Board' });
  http.get.mockResolvedValue({ data: [] });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function streamResponse() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream<Uint8Array>({
    start(next) { controller = next; },
  }), { headers: { 'Content-Type': 'text/event-stream' } })));
  return {
    push: (text: string) => controller.enqueue(new TextEncoder().encode(text)),
    close: () => controller.close(),
    fail: () => controller.error(new Error('Connection closed')),
  };
}
function showTabs() {
  render(<MemoryRouter initialEntries={['/notes/ui-note']}><DocumentTabs /></MemoryRouter>);
}

describe('C4a actual sendMessage SSE reception', () => {
  it('consumes chunked tool activity and UI commands, and keeps the server receipt on the completed answer', async () => {
    const stream = streamResponse(); showTabs();
    let sending!: Promise<void>;
    await act(async () => { sending = useAgentStore.getState().sendMessage('Open this paper'); });
    const start = event('tool_start', { id: 'ui-call', name: 'ui_open_note', target_activity: { note_id: 'ui-note' } });
    await act(async () => stream.push(start.slice(0, 28)));
    expect(screen.queryByLabelText('Agent 正在操作')).toBeNull();
    await act(async () => stream.push(start.slice(28)));
    expect(within(screen.getByRole('tab', { name: /Paper/ })).getByLabelText('Agent 正在操作')).toBeTruthy();
    expect(within(screen.getByRole('tab', { name: /Board/ })).queryByLabelText('Agent 正在操作')).toBeNull();
    expect(useAgentStore.getState().activeToolName).toBe('ui_open_note');
    await act(async () => stream.push(event('tool_end', { id: 'ui-call', name: 'ui_open_note', ok: true })));
    expect(screen.queryByLabelText('Agent 正在操作')).toBeNull();
    const frame = event('ui_command', command);
    await act(async () => stream.push(frame.slice(0, 55)));
    expect(useAgentUiStore.getState().pending).toBeNull();
    await act(async () => stream.push(frame.slice(55)));
    expect(useAgentUiStore.getState().pending).toEqual(command);
    await act(async () => stream.push(event('turn_receipt', receipt)));
    expect(useAgentStore.getState().streamingReceipt).toEqual(receipt);
    await act(async () => {
      stream.push(event('text', { content: 'UI request issued.' }) + event('done', {}));
      stream.close(); await sending;
    });
    const messages = useAgentStore.getState().messages;
    expect(messages[messages.length - 1]).toMatchObject({ content: 'UI request issued.', turn_receipt: receipt });
    expect(useAgentStore.getState().streaming).toBe(false);
    expect(useAgentStore.getState().streamingReceipt).toBeNull();
    expect(useAgentUiStore.getState().pending).toEqual(command);
  });

  it('lights the board tab from its actual tool_start and clears the badge when done arrives without tool_end', async () => {
    const stream = streamResponse(); showTabs();
    let sending!: Promise<void>;
    await act(async () => { sending = useAgentStore.getState().sendMessage('Locate this member'); });
    await act(async () => stream.push(event('tool_start', {
      id: 'ui-board-call', name: 'ui_focus_object', target_activity: { board_id: 'ui-board' },
    })));
    expect(within(screen.getByRole('tab', { name: /Board/ })).getByLabelText('Agent 正在操作')).toBeTruthy();
    await act(async () => { stream.push(event('done', {})); stream.close(); await sending; });
    expect(screen.queryByLabelText('Agent 正在操作')).toBeNull();
  });

  it('clears active presentation badges after a reader/network failure', async () => {
    const stream = streamResponse(); showTabs();
    let sending!: Promise<void>;
    await act(async () => { sending = useAgentStore.getState().sendMessage('Open this paper'); });
    await act(async () => stream.push(event('tool_start', {
      id: 'ui-call', name: 'ui_open_note', target_activity: { note_id: 'ui-note' },
    })));
    expect(screen.getByLabelText('Agent 正在操作')).toBeTruthy();
    await act(async () => { stream.fail(); await sending; });
    const messages = useAgentStore.getState().messages;
    expect(messages[messages.length - 1]?.content).toContain('Connection closed');
    expect(screen.queryByLabelText('Agent 正在操作')).toBeNull();
    expect(useAgentStore.getState().streaming).toBe(false);
  });

  it('fetches historical UI calls/results and their receipt without replaying navigation or activity', async () => {
    const history: AgentMessage = { id: 'ui-history', conversation_id: 'ui-chat', role: AgentMessageRole.Assistant,
      content: 'UI request issued.', token_count: null, created_at: '2026-09-20T12:00:00Z', turn_receipt: receipt,
      tool_calls: JSON.stringify([{ id: 'ui-call', name: 'ui_open_note', arguments: { note_id: 'ui-note' } }]),
      tool_results: JSON.stringify([{ tool_call_id: 'ui-call', content: JSON.stringify({ dispatched: true, command }) }]),
    };
    http.get.mockResolvedValue({ data: [history] });
    showTabs();
    await act(async () => useAgentStore.getState().fetchMessages('ui-chat'));
    expect(http.get).toHaveBeenCalledWith('/agent/conversations/ui-chat/messages');
    expect(useAgentStore.getState().messages).toEqual([history]);
    expect(useAgentUiStore.getState().pending).toBeNull();
    expect(useAgentUiStore.getState().focusCommand).toBeNull();
    expect(screen.queryByLabelText('Agent 正在操作')).toBeNull();
  });

  it('tracks parallel tools by call ID so finishing one target leaves the other target badge lit', async () => {
    const stream = streamResponse(); showTabs();
    let sending!: Promise<void>;
    await act(async () => { sending = useAgentStore.getState().sendMessage('Locate both existing targets'); });
    await act(async () => stream.push(
      event('tool_start', { id: 'paper-call', name: 'ui_open_note', target_activity: { note_id: 'ui-note' } })
      + event('tool_start', { id: 'board-call', name: 'ui_focus_object', target_activity: { board_id: 'ui-board' } }),
    ));
    expect(screen.getAllByLabelText('Agent 正在操作')).toHaveLength(2);
    await act(async () => stream.push(event('tool_end', { id: 'paper-call', name: 'ui_open_note', ok: true })));
    expect(within(screen.getByRole('tab', { name: /Paper/ })).queryByLabelText('Agent 正在操作')).toBeNull();
    expect(within(screen.getByRole('tab', { name: /Board/ })).getByLabelText('Agent 正在操作')).toBeTruthy();
    await act(async () => stream.push(event('tool_end', { id: 'board-call', name: 'ui_focus_object', ok: true })));
    expect(screen.queryByLabelText('Agent 正在操作')).toBeNull();
    await act(async () => { stream.push(event('done', {})); stream.close(); await sending; });
  });
});
