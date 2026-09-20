import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AgentMessage } from '@shared/types';
import { useAgentStore } from '@/stores/agentStore';
import MessageBubble from './MessageBubble';

const http = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http, getToken: () => null, API_BASE: '/api' }));
const message = (): AgentMessage => ({ id: 'plan-message', conversation_id: 'conversation', role: 'assistant' as AgentMessage['role'],
  content: '请查看计划', tool_calls: null, tool_results: null, token_count: null, created_at: '2026-09-20T00:00:00Z',
  meta: { intent_plan: { kind: 'note_patch', rule: 'note-unit-replace', status: 'pending', steps: [{ verb: 'create_proposal', target_name: '概念笔记',
    anchor: { note_id: 'note', block_ids: ['block'] }, arguments: { type: 'note_patch' } }] } } });
function Surface() {
  const row = useAgentStore(state => state.messages[0]);
  return <MessageBubble message={row} />;
}
beforeEach(() => { vi.clearAllMocks(); useAgentStore.setState({ messages: [message()] }); });
afterEach(() => vi.restoreAllMocks());

it('plan card shows domain verb and target; human release reports proposal receipt and refreshes the inbox', async () => {
  const update = vi.fn(); window.addEventListener('coincides:proposals-changed', update);
  const meta = message().meta!; meta.intent_plan!.status = 'released'; meta.intent_plan!.proposal_id = 'proposal';
  http.post.mockResolvedValue({ data: { meta, turn_receipt: { write_calls: [{ name: 'create_proposal', ok: true }], read_calls: [], write_ok_count: 1, write_fail_count: 0 } } });
  render(<Surface />);
  expect(screen.getByText('create_proposal')).toBeTruthy(); expect(screen.getByText(/概念笔记/)).toBeTruthy();
  expect(http.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '放行' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('已放行'));
  expect(http.post).toHaveBeenCalledWith('/agent/conversations/conversation/messages/plan-message/plan', { decision: 'release' });
  expect(screen.getByLabelText('成功 create_proposal')).toBeTruthy(); expect(update).toHaveBeenCalledTimes(1);
  window.removeEventListener('coincides:proposals-changed', update);
});

it('reconsider only sends discard; a failed release keeps a visible pending card', async () => {
  http.post.mockRejectedValueOnce(new Error('计划目标已改变'));
  render(<Surface />);
  fireEvent.click(screen.getByRole('button', { name: '放行' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: '再想想' })).toBeTruthy();
  const meta = message().meta!; meta.intent_plan!.status = 'discarded';
  http.post.mockResolvedValue({ data: { meta } });
  fireEvent.click(screen.getByRole('button', { name: '再想想' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('已丢弃，未执行'));
  expect(http.post).toHaveBeenLastCalledWith('/agent/conversations/conversation/messages/plan-message/plan', { decision: 'discard' });
});
