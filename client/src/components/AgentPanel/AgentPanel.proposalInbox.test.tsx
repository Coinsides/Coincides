import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Proposal, ProposalType } from '@shared/types';
import { useAgentStore } from '@/stores/agentStore';
import { useUIStore } from '@/stores/uiStore';
import AgentPanel from './AgentPanel';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http, getToken: () => null, API_BASE: '/api' }));
vi.mock('@/stores/authStore', () => ({ useAuthStore: (select: (state: { user: null }) => unknown) => select({ user: null }) }));

function proposal(id: string, type: ProposalType, data: unknown, conversationId: string | null = 'inbox-chat'): Proposal {
  return { id, user_id: 'inbox-user', conversation_id: conversationId, type, data, status: 'pending',
    created_at: '2026-09-14 13:00:00', resolved_at: null };
}

const note = () => proposal('inbox-note', 'organized_note', {
  title: '整理向量笔记', description: '从材料整理的笔记', blocks: [{ title: '向量基础', plain_text: '方向与大小' }],
});
const cards = () => proposal('inbox-cards', 'batch_cards', {
  title: '向量复习卡', items: [{ title: '向量定义', template_type: 'definition', deck_id: 'inbox-deck', section_id: 'inbox-section' }],
});

let pending: Proposal[];
let listFailure: boolean;
const listCalls = () => http.get.mock.calls.filter(([url]) => url === '/proposals');

beforeEach(() => {
  vi.clearAllMocks();
  pending = [];
  listFailure = false;
  useUIStore.setState({ agentPanelOpen: false, agentContextHint: null, ambientAgentContextHint: null,
    ambientAgentContextOwner: null, ambientAgentContextDismissed: false, toasts: [] });
  useAgentStore.setState({ activeConversationId: 'inbox-chat', conversations: [], messages: [],
    preferenceForms: [], streaming: false, streamingText: '', activeToolName: null, loading: false });
  http.get.mockImplementation(async (url: string) => {
    if (url === '/proposals') {
      if (listFailure) throw new Error('Temporary connection failure');
      return { data: [...pending] };
    }
    return { data: [] };
  });
  http.post.mockImplementation(async (url: string) => {
    const match = /^\/proposals\/([^/]+)\/(apply|discard)$/.exec(url);
    if (!match) throw new Error(`Unexpected test route: ${url}`);
    pending = pending.filter((item) => item.id !== match[1]);
    return { data: { success: true } };
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function openPanel() {
  render(<AgentPanel />);
  act(() => useUIStore.getState().setAgentPanelOpen(true));
}

async function openInbox(count: number) {
  const button = await screen.findByRole('button', { name: `提案，${count} 条待处理` });
  fireEvent.click(button);
  await waitFor(() => expect(screen.queryByText('正在刷新提案…')).toBeNull());
  return screen.getByRole('region', { name: '提案收件箱' });
}

describe('AgentPanel proposal inbox through the existing human routes', () => {
  it('loads pending count only when opened and renders all eight types with summaries, origins and UTC time', async () => {
    pending = [
      proposal('inbox-plan', 'study_plan', { title: '安排向量复习', items: [{ title: '阅读向量', scheduled_date: '2026-09-15' }] }),
      cards(),
      proposal('inbox-schedule', 'schedule_adjustment', { title: '调整复习日程', items: [{ title: '复习矩阵', date: '2026-09-16', priority: 'must' }] }),
      proposal('inbox-goals', 'goal_breakdown', { title: '拆解代数目标', items: [{ type: 'goal', title: '线性代数', deadline: '2026-09-20' }] }),
      proposal('inbox-blocks', 'time_block_setup', { title: '设置复习时间', items: [{ label: '早间复习', date: '2026-09-15', start_time: '09:00', end_time: '10:00' }] }),
      proposal('inbox-map', 'material_map', { title: '向量材料地图', segments: [{ title: '材料第一章' }] }, null),
      note(),
      proposal('inbox-review', 'material_reconciliation', { title: '复核材料候选', candidate_groups: [{ title: '向量证据' }] }, null),
    ];
    render(<AgentPanel />);
    expect(http.get).not.toHaveBeenCalled();
    act(() => useUIStore.getState().setAgentPanelOpen(true));
    await screen.findByRole('button', { name: '提案，8 条待处理' });
    expect(screen.queryByRole('region', { name: '提案收件箱' })).toBeNull();
    expect(listCalls()).toEqual([['/proposals', { params: { status: 'pending' } }]]);

    const inbox = await openInbox(8);
    expect(within(inbox).getAllByRole('listitem')).toHaveLength(8);
    expect(within(inbox).getAllByRole('button', { name: '采纳' })).toHaveLength(7);
    expect(within(inbox).getAllByRole('button', { name: '丢弃' })).toHaveLength(8);
    expect(within(inbox).getByRole('button', { name: '标记已复核' })).toBeTruthy();
    for (const type of ['学习计划', '卡片', '日程调整', '目标拆解', '时间块', '材料地图', '整理笔记', '材料协调']) {
      expect(within(inbox).getByText(type)).toBeTruthy();
    }
    const noteCard = within(inbox).getByRole('article', { name: '整理向量笔记' });
    expect(within(noteCard).getByText('来源：聊天')).toBeTruthy();
    expect(within(noteCard).getByText('从材料整理的笔记')).toBeTruthy();
    expect(within(noteCard).getByText('1 个内容块 · 向量基础')).toBeTruthy();
    const materialCard = within(inbox).getByRole('article', { name: '向量材料地图' });
    expect(within(materialCard).getByText('来源：材料')).toBeTruthy();
    const time = noteCard.querySelector('time')!;
    expect(time.dateTime).toBe('2026-09-14T13:00:00.000Z');
    expect(time.textContent).toBe(new Date('2026-09-14T13:00:00Z').toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' }));
    expect(listCalls()).toEqual(Array.from({ length: 2 }, () => ['/proposals', { params: { status: 'pending' } }]));
    expect(http.post).not.toHaveBeenCalled();
  });

  it('leaves no proposal entry or list space when the pending queue is empty', async () => {
    openPanel();
    await waitFor(() => expect(listCalls()).toHaveLength(1));
    expect(screen.queryByRole('button', { name: /提案，/ })).toBeNull();
    expect(screen.queryByRole('region', { name: '提案收件箱' })).toBeNull();
    expect(screen.getByPlaceholderText('Message Mr. Zero...')).toBeTruthy();
  });

  it('applies organized notes and cards one by one, refreshes, toasts, and reaches the visible empty state', async () => {
    pending = [note(), cards()];
    openPanel();
    const inbox = await openInbox(2);
    fireEvent.click(within(within(inbox).getByRole('article', { name: '整理向量笔记' })).getByRole('button', { name: '采纳' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: '整理向量笔记' })).toBeNull());
    await screen.findByRole('button', { name: '提案，1 条待处理' });
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/proposals/inbox-note/apply', {});
    await waitFor(() => expect(listCalls()).toHaveLength(3));
    expect(useUIStore.getState().toasts.map(({ type, message }) => [type, message])).toEqual([['success', '提案已采纳']]);

    fireEvent.click(within(screen.getByRole('article', { name: '向量复习卡' })).getByRole('button', { name: '采纳' }));
    await screen.findByText('暂无待处理提案');
    expect(http.post.mock.calls).toEqual([
      ['/proposals/inbox-note/apply', {}], ['/proposals/inbox-cards/apply', {}],
    ]);
    expect(listCalls()).toHaveLength(4);
    expect(useUIStore.getState().toasts.map(({ type, message }) => [type, message])).toEqual([
      ['success', '提案已采纳'], ['success', '提案已采纳'],
    ]);
    const emptyInboxToggle = screen.getByRole('button', { name: '提案，0 条待处理' });
    emptyInboxToggle.focus();
    fireEvent.click(emptyInboxToggle);
    expect(screen.queryByRole('button', { name: /提案，/ })).toBeNull();
    expect(document.activeElement).toBe(screen.getByPlaceholderText('Message Mr. Zero...'));
  });

  it('discards just the selected proposal with the existing empty body route', async () => {
    pending = [note(), cards()];
    openPanel();
    await openInbox(2);
    fireEvent.click(within(screen.getByRole('article', { name: '向量复习卡' })).getByRole('button', { name: '丢弃' }));
    await waitFor(() => expect(screen.queryByRole('article', { name: '向量复习卡' })).toBeNull());
    expect(screen.getByRole('article', { name: '整理向量笔记' })).toBeTruthy();
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/proposals/inbox-cards/discard', {});
    expect(listCalls()).toHaveLength(3);
    expect(useUIStore.getState().toasts).toEqual([expect.objectContaining({ type: 'success', message: '提案已丢弃' })]);
  });

  it('shows the honest unsupported notice for an old persisted type and still permits discard', async () => {
    const legacy = { ...note(), id: 'inbox-legacy', type: 'canvas_layout', data: { title: '历史模板提案' } } as unknown as Proposal;
    pending = [legacy];
    openPanel();
    const inbox = await openInbox(1);
    expect(within(inbox).getByText('其他提案')).toBeTruthy();
    expect(within(inbox).getByText('此类提案暂不支持一键采纳')).toBeTruthy();
    expect(within(inbox).queryByRole('button', { name: '采纳' })).toBeNull();
    expect(http.post).not.toHaveBeenCalled();
    fireEvent.click(within(inbox).getByRole('button', { name: '丢弃' }));
    await screen.findByText('暂无待处理提案');
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/proposals/inbox-legacy/discard', {});
  });

  it('labels material reconciliation as review only and reports that limited result', async () => {
    pending = [proposal('inbox-review', 'material_reconciliation', { title: '复核材料候选', candidate_groups: [] }, null)];
    openPanel();
    const inbox = await openInbox(1);
    expect(within(inbox).getByText('这里只标记已复核，不采纳候选证据。逐组决策请在项目材料页处理。')).toBeTruthy();
    expect(within(inbox).queryByRole('button', { name: '采纳' })).toBeNull();
    fireEvent.click(within(inbox).getByRole('button', { name: '标记已复核' }));
    await screen.findByText('暂无待处理提案');
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/proposals/inbox-review/apply', {});
    expect(useUIStore.getState().toasts).toEqual([
      expect.objectContaining({ type: 'success', message: '提案已标记复核，未采纳候选证据' }),
    ]);
  });

  it('retains a failed action as pending and allows a normal connection retry', async () => {
    pending = [note()];
    http.post.mockRejectedValueOnce(new Error('Temporary connection failure'));
    openPanel();
    await openInbox(1);
    fireEvent.click(screen.getByRole('button', { name: '采纳' }));
    await waitFor(() => expect((screen.getByRole('button', { name: '采纳' }) as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByRole('article', { name: '整理向量笔记' })).toBeTruthy();
    expect(useUIStore.getState().toasts).toEqual([expect.objectContaining({ type: 'error', message: '处理失败，请重试' })]);
    expect(listCalls()).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: '采纳' }));
    await screen.findByText('暂无待处理提案');
    expect(http.post.mock.calls).toEqual([
      ['/proposals/inbox-note/apply', {}], ['/proposals/inbox-note/apply', {}],
    ]);
    expect(useUIStore.getState().toasts.slice(-1)).toEqual([expect.objectContaining({ type: 'success', message: '提案已采纳' })]);
  });

  it('exposes list loading failure and retries without presenting it as an empty inbox', async () => {
    listFailure = true;
    openPanel();
    await openInbox(0);
    expect(screen.getByRole('alert').textContent).toContain('提案加载失败，请重试');
    expect(screen.queryByText('暂无待处理提案')).toBeNull();
    pending = [cards()];
    listFailure = false;
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    await screen.findByRole('article', { name: '向量复习卡' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: '提案，1 条待处理' })).toBeTruthy();
    expect(listCalls()).toHaveLength(3);
  });

  it('refreshes the badge after the real message stream finishes and can open the newly registered proposal', async () => {
    let finishStream!: () => void;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        finishStream = () => {
          controller.enqueue(new TextEncoder().encode('event: done\ndata: {}\n\n'));
          controller.close();
        };
      },
    }), { headers: { 'Content-Type': 'text/event-stream' } })));
    openPanel();
    await waitFor(() => expect(listCalls()).toHaveLength(1));
    const input = screen.getByPlaceholderText('Message Mr. Zero...');
    fireEvent.change(input, { target: { value: '请整理成笔记提案' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(useAgentStore.getState().streaming).toBe(true));
    const beforeFinish = listCalls().length;
    pending = [note()];
    await act(async () => finishStream());
    await screen.findByRole('button', { name: '提案，1 条待处理' });
    expect(useAgentStore.getState().streaming).toBe(false);
    expect(listCalls()).toHaveLength(beforeFinish + 1);
    await openInbox(1);
    expect(screen.getByRole('article', { name: '整理向量笔记' })).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(http.post).not.toHaveBeenCalled();
  });
});
