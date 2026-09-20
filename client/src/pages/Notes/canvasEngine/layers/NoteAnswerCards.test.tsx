import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentMessageRole, type AgentMessage } from '@shared/types';
import { useAgentStore } from '@/stores/agentStore';
import { registerNoteAgentHumanEditor } from '@/lib/noteAgentHumanBridge';
import { NoteAnswerCards } from './NoteAnswerCards';

const message: AgentMessage = { id: 'c2-answer', conversation_id: 'c2-chat', role: AgentMessageRole.Assistant,
  content: 'Complete answer retained in conversation.', tool_calls: null, tool_results: null, token_count: null,
  created_at: '2026-09-20T00:00:00Z', meta: { answer_card: { question: 'Why this paragraph?',
    selection: { note_id: 'c2-note', block_ids: ['c2-block'] } } } };
function Page() {
  const surface = useRef<HTMLDivElement>(null);
  return <div ref={surface}><div data-note-block-shell="true" data-block-id="c2-block">Selected paragraph</div>
    <NoteAnswerCards noteId="c2-note" surfaceRef={surface} /></div>;
}
beforeEach(() => {
  useAgentStore.setState({ messages: [message] });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 80, right: 500, bottom: 180,
    width: 400, height: 100, x: 100, y: 80, toJSON: () => ({}) });
});
afterEach(() => vi.restoreAllMocks());

describe('C2 answer cards are anchored message projections', () => {
  it('shows question and complete answer beside the selected block; dispersal keeps conversation history', async () => {
    render(<Page />);
    const card = await screen.findByRole('complementary', { name: '页边答卡' });
    expect(card.getAttribute('data-answer-anchor')).toBe('c2-block');
    expect(screen.getByText('Why this paragraph?')).toBeTruthy();
    expect(screen.getByText(message.content)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '散去' }));
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(useAgentStore.getState().messages).toEqual([message]);
  });

  it('only a human click inserts the complete answer through the mounted note editor', async () => {
    const insertAnswer = vi.fn(async () => true);
    const unregister = registerNoteAgentHumanEditor({ noteId: 'c2-note', applyPatch: async () => false, insertAnswer });
    try {
      render(<Page />);
      await screen.findByRole('complementary');
      expect(insertAnswer).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: '插入为块' }));
      await waitFor(() => expect(screen.queryByRole('complementary')).toBeNull());
      expect(insertAnswer).toHaveBeenCalledExactlyOnceWith('c2-block', message.content);
      expect(useAgentStore.getState().messages).toEqual([message]);
    } finally { act(unregister); }
  });

  it('has no page projection when the anchor belongs to another note', () => {
    useAgentStore.setState({ messages: [{ ...message, meta: { answer_card: { ...message.meta!.answer_card!,
      selection: { note_id: 'c2-other', block_ids: ['c2-block'] } } } }] });
    render(<Page />);
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('uses the paper edge for a narrow block rather than covering its neighboring content', async () => {
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (this: HTMLElement) {
      const right = this.hasAttribute('data-flow-page-paper') ? 680 : 240;
      return { left: 100, top: 80, right, bottom: 700, width: right - 100, height: 620, x: 100, y: 80, toJSON: () => ({}) };
    });
    function Paper() {
      const surface = useRef<HTMLDivElement>(null);
      return <div ref={surface}><div data-flow-page-paper="paper" />
        <div data-note-block-shell="true" data-block-id="c2-block" />
        <NoteAnswerCards noteId="c2-note" surfaceRef={surface} /></div>;
    }
    render(<Paper />);
    const card = await screen.findByRole('complementary');
    expect(card.style.left).toBe('696px');
  });
});
