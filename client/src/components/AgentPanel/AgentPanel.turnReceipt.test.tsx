import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentMessage, AgentTurnReceipt } from '@shared/types';
import { AgentMessageRole } from '@shared/types';
import { useAgentStore } from '@/stores/agentStore';
import { useUIStore } from '@/stores/uiStore';
import AgentPanel from './AgentPanel';
import MessageBubble from './MessageBubble';
import { subscribeBoardChanges } from '@/pages/Boards/boardEvents';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http, getToken: () => null, API_BASE: '/api' }));
vi.mock('@/stores/authStore', () => ({ useAuthStore: (select: (state: { user: null }) => unknown) => select({ user: null }) }));

const emptyReceipt = (): AgentTurnReceipt => ({ write_calls: [], read_calls: [], write_ok_count: 0, write_fail_count: 0 });
const writtenReceipt = (): AgentTurnReceipt => ({
  write_calls: [{ name: 'create_task', ok: true }, { name: 'save_memory', ok: true }, { name: 'create_proposal', ok: false }],
  read_calls: [{ name: 'read_note', ok: true }], write_ok_count: 2, write_fail_count: 1,
});
const readReceipt = (): AgentTurnReceipt => ({ ...emptyReceipt(), read_calls: [{ name: 'read_board', ok: true }] });
const message = (content: string, receipt?: AgentTurnReceipt): AgentMessage => ({
  id: 'receipt-message', conversation_id: 'receipt-chat', role: AgentMessageRole.Assistant, content,
  tool_calls: null, tool_results: null, token_count: null, created_at: '2026-09-14T13:00:00Z',
  ...(receipt ? { turn_receipt: receipt } : {}),
});
const event = (name: string, data: unknown) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;

beforeEach(() => {
  vi.clearAllMocks();
  useUIStore.setState({ agentPanelOpen: true, agentContextHint: null, ambientAgentContextHint: null,
    ambientAgentContextOwner: null, ambientAgentContextDismissed: false });
  useAgentStore.setState({ activeConversationId: 'receipt-chat', conversations: [], messages: [],
    preferenceForms: [], streaming: false, streamingText: '', streamingReceipt: null, activeToolName: null, loading: false });
  http.get.mockResolvedValue({ data: [] });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

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

describe('AgentPanel turn receipts from server projections', () => {
  it('shows the structured board diagnostic and refreshes its board once on the live receipt', async () => {
    const receipt: AgentTurnReceipt = { ...emptyReceipt(), write_calls: [{ name: 'board_create_sticky', ok: true }], write_ok_count: 1,
      board_layout_reports: [{ board_id: 'board-c1', batch_id: 'session-c1', report: { counts: { 'card-card-overlap': 1 },
        issues: [{ kind: 'card-card-overlap', severity: 'warning', itemIds: ['sticky:a', 'sticky:b'],
          coordinate: { x: 12.4, y: 30.1 }, bounds: { x: 0, y: 0, w: 24, h: 60 } }] } }] };
    const changes = vi.fn(), unsubscribe = subscribeBoardChanges(changes);
    try {
      const stream = streamResponse();
      render(<AgentPanel />);
      let sending!: Promise<void>;
      await act(async () => { sending = useAgentStore.getState().sendMessage('铺概念图'); });
      await act(async () => { stream.push(event('text', { content: '已创建便签。' }) + event('turn_receipt', receipt)); });
      expect(changes).toHaveBeenCalledExactlyOnceWith('board-c1');
      expect(screen.getByText('板排版体检：1 项提示')).toBeTruthy();
      expect(screen.getByText('卡片重叠 (12, 30)')).toBeTruthy();
      await act(async () => { stream.push(event('done', {})); stream.close(); await sending; });
      expect(useAgentStore.getState().messages.slice(-1)[0]?.turn_receipt).toEqual(receipt);
      expect(screen.getAllByText('板排版体检：1 项提示')).toHaveLength(1);
    } finally { unsubscribe(); }
  });

  it('keeps a successful board write visible when its diagnostic is unavailable', () => {
    render(<MessageBubble message={message('已创建便签。', { ...emptyReceipt(), write_ok_count: 1,
      write_calls: [{ name: 'board_create_sticky', ok: true }],
      board_layout_reports: [{ board_id: 'board-c1', batch_id: 'session-c1', report: null, diagnostic_error: 'layout_diagnostic_unavailable' }] })} />);
    expect(screen.getByText('板排版体检：暂不可用')).toBeTruthy();
    expect(screen.getByLabelText('成功 board_create_sticky')).toBeTruthy();
  });

  it('reads historical summaries and lists successful/failed writes beside the unchanged claim', async () => {
    const receipt = writtenReceipt();
    http.get.mockImplementation(async (url: string) => ({ data: url.endsWith('/messages') ? [message('已保存偏好。', receipt)] : [] }));
    render(<AgentPanel />);
    await act(async () => useAgentStore.getState().fetchMessages('receipt-chat'));
    expect(http.get).toHaveBeenCalledWith('/agent/conversations/receipt-chat/messages');
    expect(screen.getByText('已保存偏好。')).toBeTruthy();
    const strip = screen.getByRole('note', { name: '本轮工具收据' });
    expect(strip.textContent).toBe('✓ create_task✓ save_memory✗ create_proposal');
    expect(within(strip).queryByText('read_note')).toBeNull();
    expect(within(strip).queryAllByRole('button')).toEqual([]);
    expect(strip.parentElement?.querySelector('p')?.textContent).toBe('已保存偏好。');
    expect(useAgentStore.getState().messages[0].turn_receipt).toEqual(receipt);
  });

  it.each([
    ['zero-tool text', emptyReceipt()],
    ['read-only text', readReceipt()],
  ])('shows 本轮无写动作 for %s, without interpreting the claim', (_label, receipt) => {
    render(<MessageBubble message={message('已保存偏好。', receipt)} />);
    expect(screen.getByRole('note').textContent).toBe('本轮无写动作');
    expect(screen.queryByText('仅查阅')).toBeNull();
    expect(screen.getByText('已保存偏好。')).toBeTruthy();
  });

  it('uses the compact pure-read state and leaves a completely empty turn unoccupied', () => {
    const view = render(<MessageBubble message={message('', readReceipt())} />);
    expect(screen.getByRole('note').textContent).toBe('仅查阅');
    expect(screen.getByRole('note').previousElementSibling).toBeNull();
    expect(view.container.querySelector('br')).toBeNull();
    view.rerender(<MessageBubble message={message('', emptyReceipt())} />);
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('never infers no-write from absent summaries or labels user/tool messages as assistant receipts', () => {
    const view = render(<MessageBubble message={message('已保存偏好。')} />);
    expect(screen.queryByRole('note')).toBeNull();
    for (const role of [AgentMessageRole.User, AgentMessageRole.Tool]) {
      view.rerender(<MessageBubble message={{ ...message('已保存偏好。', writtenReceipt()), role }} />);
      expect(screen.queryByRole('note')).toBeNull();
    }
  });

  it('shows unclassified historical names without claiming no-write or read-only', () => {
    const unknown = { name: 'retired_tool', ok: true };
    const view = render(<MessageBubble message={message('已保存', { ...readReceipt(), unclassified_calls: [unknown] })} />);
    expect(screen.getByRole('note').textContent).toBe('未分类工具：retired_tool');
    expect(screen.queryByText('本轮无写动作')).toBeNull();
    view.rerender(<MessageBubble message={message('', { ...readReceipt(), unclassified_calls: [unknown] })} />);
    expect(screen.queryByText('仅查阅')).toBeNull();
    view.rerender(<MessageBubble message={message('已保存', { ...writtenReceipt(), unclassified_calls: [unknown] })} />);
    expect(screen.getByRole('note').textContent).toContain('✓ save_memory');
    expect(screen.getByRole('note').textContent).toContain('未分类工具：retired_tool');
  });

  it('renders a chunked turn_receipt before done and retains exactly the same summary after done', async () => {
    const stream = streamResponse();
    render(<AgentPanel />);
    let sending!: Promise<void>;
    await act(async () => { sending = useAgentStore.getState().sendMessage('请保存偏好'); });
    await act(async () => stream.push(event('text', { content: '已保存偏好。' })));
    expect(screen.queryByRole('note')).toBeNull();
    const receipt = writtenReceipt();
    const receiptFrame = event('turn_receipt', receipt);
    await act(async () => stream.push(receiptFrame.slice(0, 48)));
    expect(screen.queryByRole('note')).toBeNull();
    await act(async () => stream.push(receiptFrame.slice(48)));
    expect(useAgentStore.getState().streaming).toBe(true);
    expect(screen.getByRole('note').textContent).toContain('✗ create_proposal');
    expect(useAgentStore.getState().streamingReceipt).toEqual(receipt);
    await act(async () => { stream.push(event('done', {})); stream.close(); await sending; });
    expect(useAgentStore.getState().streaming).toBe(false);
    expect(useAgentStore.getState().streamingReceipt).toBeNull();
    expect(useAgentStore.getState().messages.slice(-1)[0]).toMatchObject({ content: '已保存偏好。', turn_receipt: receipt });
    expect(screen.getAllByRole('note')).toHaveLength(1);
  });

  it('preserves old text/tool/form/done events and ignores unknown or invalid summaries without inventing one', async () => {
    const stream = streamResponse();
    let sending!: Promise<void>;
    await act(async () => { sending = useAgentStore.getState().sendMessage('旧流'); });
    await act(async () => stream.push(event('tool_start', { name: 'search_memories' })));
    expect(useAgentStore.getState().activeToolName).toBe('search_memories');
    await act(async () => stream.push(event('tool_end', { name: 'search_memories' })));
    expect(useAgentStore.getState().activeToolName).toBeNull();
    await act(async () => {
      stream.push(event('future_event', { ignored: true }) + event('turn_receipt', {})
        + 'event: turn_receipt\ndata: {broken\n\n'
        + event('preference_form', { questions: [{ id: 'preference', type: 'single_choice', label: '偏好' }] })
        + event('text', { content: '已保存' }) + event('done', {}));
      stream.close();
      await sending;
    });
    expect(useAgentStore.getState().messages.slice(-1)[0]?.content).toBe('已保存');
    expect(useAgentStore.getState().messages.slice(-1)[0]).not.toHaveProperty('turn_receipt');
    expect(useAgentStore.getState().preferenceForms[0].questions[0].id).toBe('preference');
    expect(useAgentStore.getState().streamingReceipt).toBeNull();
  });

  it('does not leak a prior live receipt into a subsequent legacy response', async () => {
    useAgentStore.setState({ streamingReceipt: writtenReceipt() });
    const stream = streamResponse();
    let sending!: Promise<void>;
    await act(async () => { sending = useAgentStore.getState().sendMessage('新轮'); });
    expect(useAgentStore.getState().streamingReceipt).toBeNull();
    await act(async () => { stream.push(event('text', { content: '回答' }) + event('done', {})); stream.close(); await sending; });
    expect(useAgentStore.getState().messages.slice(-1)[0]).not.toHaveProperty('turn_receipt');
  });

  it('preserves a receipt-only turn when the stream closes without done', async () => {
    const stream = streamResponse();
    let sending!: Promise<void>;
    await act(async () => { sending = useAgentStore.getState().sendMessage('查阅'); });
    await act(async () => { stream.push(event('turn_receipt', readReceipt())); stream.close(); await sending; });
    expect(useAgentStore.getState().messages.slice(-1)[0]).toMatchObject({ content: '', turn_receipt: readReceipt() });
    expect(useAgentStore.getState().streaming).toBe(false);
    expect(useAgentStore.getState().streamingReceipt).toBeNull();
  });

  it.each([
    ['receipt then error', '已保存偏好。'],
    ['receipt then error', ''],
    ['error then receipt', '已保存偏好。'],
    ['error then receipt', ''],
  ])('keeps one receipt and unchanged model text when %s is followed by route done (%j)', async (order, text) => {
    const stream = streamResponse();
    render(<AgentPanel />);
    let sending!: Promise<void>;
    await act(async () => { sending = useAgentStore.getState().sendMessage('保存偏好'); });
    const receipt = writtenReceipt();
    await act(async () => {
      stream.push(event('text', { content: text }));
      stream.push(order === 'receipt then error'
        ? event('turn_receipt', receipt) + event('error', { message: 'Interrupted' })
        : event('error', { message: 'Round limit reached' }) + event('turn_receipt', receipt));
      stream.push(event('done', {}));
      stream.close();
      await sending;
    });
    const messages = useAgentStore.getState().messages;
    expect(messages.filter(message => message.turn_receipt)).toHaveLength(1);
    expect(messages.find(message => message.turn_receipt)?.turn_receipt).toEqual(receipt);
    expect(messages.slice(-1)[0]?.content).toBe(text);
    expect(screen.getAllByRole('note')).toHaveLength(1);
    expect(useAgentStore.getState().streaming).toBe(false);
    expect(useAgentStore.getState().streamingReceipt).toBeNull();
  });

  it.each(['error event', 'connection failure'])('keeps received write evidence after %s', async (failure) => {
    const stream = streamResponse();
    let sending!: Promise<void>;
    await act(async () => { sending = useAgentStore.getState().sendMessage('写入'); });
    await act(async () => stream.push(event('turn_receipt', writtenReceipt())));
    await waitFor(() => expect(useAgentStore.getState().streamingReceipt).toEqual(writtenReceipt()));
    await act(async () => {
      if (failure === 'error event') { stream.push(event('error', { message: 'Interrupted' })); stream.close(); }
      else stream.fail();
      await sending;
    });
    expect(useAgentStore.getState().messages.slice(-1)[0]).toMatchObject({ turn_receipt: writtenReceipt() });
    expect(useAgentStore.getState().streamingReceipt).toBeNull();
    expect(useAgentStore.getState().streaming).toBe(false);
  });
});
