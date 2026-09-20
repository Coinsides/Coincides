import { create } from 'zustand';
import { notifyBoardChanged } from '@/pages/Boards/boardEvents';
import api, { getToken, API_BASE } from '@/services/api';
import type { AgentContextHint, AgentConversation, AgentMessage, AgentTurnReceipt } from '@shared/types';

export interface PreferenceQuestion {
  id: string;
  type: 'single_choice' | 'multi_choice' | 'number_input' | 'document_select' | 'date_picker';
  label: string;
  options?: Array<{ value: string; label: string; description?: string }>;
  default_value?: string;
  required?: boolean;
  max_select?: number;
  documents?: Array<{ id: string; filename: string; page_count: number; summary: string; document_type?: string }>;
  placeholder?: string;
  date_config?: { min_date?: string; max_date?: string };
}

export interface PreferenceFormMessage {
  id: string;
  type: 'preference_form';
  questions: PreferenceQuestion[];
  submitted?: boolean;
  responses?: Record<string, unknown>;
}

interface AgentState {
  conversations: AgentConversation[];
  activeConversationId: string | null;
  messages: AgentMessage[];
  preferenceForms: PreferenceFormMessage[];
  streaming: boolean;
  streamingText: string;
  streamingReceipt: AgentTurnReceipt | null;
  activeToolName: string | null;
  loading: boolean;

  fetchConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (message: string, contextHint?: AgentContextHint, image?: { media_type: string; data: string }) => Promise<void>;
  submitPreferenceForm: (formId: string, responses: Record<string, unknown>) => void;
}

function parseSSEEvents(text: string): Array<{ event: string; data: string }> {
  const events: Array<{ event: string; data: string }> = [];
  const blocks = text.split('\n\n');
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split('\n');
    let eventType = '';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        data = line.slice(6);
      }
    }
    if (eventType && data) {
      events.push({ event: eventType, data });
    }
  }
  return events;
}

function isTurnReceipt(value: unknown): value is AgentTurnReceipt {
  if (!value || typeof value !== 'object') return false;
  const receipt = value as Record<string, unknown>;
  const isCallList = (calls: unknown) => Array.isArray(calls) && calls.every((call) =>
    call && typeof call.name === 'string' && typeof call.ok === 'boolean');
  return isCallList(receipt.write_calls) && isCallList(receipt.read_calls)
    && (receipt.unclassified_calls === undefined || isCallList(receipt.unclassified_calls))
    && Number.isInteger(receipt.write_ok_count) && (receipt.write_ok_count as number) >= 0
    && Number.isInteger(receipt.write_fail_count) && (receipt.write_fail_count as number) >= 0;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  preferenceForms: [],
  streaming: false,
  streamingText: '',
  streamingReceipt: null,
  activeToolName: null,
  loading: false,

  fetchConversations: async () => {
    try {
      const { data } = await api.get('/agent/conversations');
      set({ conversations: data });
    } catch (err) {
      console.error('Failed to send agent message:', err);
      // ignore
    }
  },

  createConversation: async (title?) => {
    const { data } = await api.post('/agent/conversations', { title });
    set({ conversations: [data, ...get().conversations] });
    await get().selectConversation(data.id);
    return data.id;
  },

  selectConversation: async (id) => {
    set({ activeConversationId: id, messages: [], preferenceForms: [], loading: true });
    await get().fetchMessages(id);
    set({ loading: false });
  },

  fetchMessages: async (conversationId) => {
    try {
      const { data } = await api.get(`/agent/conversations/${conversationId}/messages`);
      set({ messages: data });
    } catch (err) {
      console.error('Failed to cancel agent:', err);
      // ignore
    }
  },

  deleteConversation: async (id) => {
    await api.delete(`/agent/conversations/${id}`);
    const convs = get().conversations.filter((c) => c.id !== id);
    set({
      conversations: convs,
      ...(get().activeConversationId === id ? { activeConversationId: null, messages: [] } : {}),
    });
  },

  sendMessage: async (message, contextHint?, image?) => {
    let convId = get().activeConversationId;

    // Auto-create conversation if none active
    if (!convId) {
      const shortTitle = message.slice(0, 40) + (message.length > 40 ? '...' : '');
      convId = await get().createConversation(shortTitle);
    }

    // Add user message to local state immediately
    const userMsg: AgentMessage & { image_preview?: string } = {
      id: `temp-${Date.now()}`,
      conversation_id: convId,
      role: 'user' as AgentMessage['role'],
      content: message,
      tool_calls: null,
      tool_results: null,
      token_count: null,
      created_at: new Date().toISOString(),
      ...(image ? { image_preview: `data:${image.media_type};base64,${image.data}` } : {}),
    };
    set({ messages: [...get().messages, userMsg], streaming: true, streamingText: '', streamingReceipt: null, activeToolName: null });
    let turnReceipt: AgentTurnReceipt | undefined;

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/agent/conversations/${convId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, context_hint: contextHint, ...(image ? { image } : {}) }),
      });

      if (!res.ok) {
        const errText = await res.text();
        set({ streaming: false });
        throw new Error(errText);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE blocks (separated by \n\n)
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const events = parseSSEEvents(part + '\n\n');
          for (const evt of events) {
            switch (evt.event) {
              case 'text': {
                try {
                  const parsed = JSON.parse(evt.data);
                  accumulated += parsed.content || '';
                  set({ streamingText: accumulated });
                } catch { /* ignore */ }
                break;
              }
              case 'tool_start': {
                try {
                  const parsed = JSON.parse(evt.data);
                  set({ activeToolName: parsed.name || null });
                } catch { /* ignore */ }
                break;
              }
              case 'tool_end': {
                set({ activeToolName: null });
                break;
              }
              case 'preference_form': {
                try {
                  const parsed = JSON.parse(evt.data);
                  const formMsg: PreferenceFormMessage = {
                    id: `pref-${Date.now()}`,
                    type: 'preference_form',
                    questions: parsed.questions || [],
                    submitted: false,
                  };
                  set({ preferenceForms: [...get().preferenceForms, formMsg] });
                } catch { /* ignore */ }
                break;
              }
              case 'turn_receipt': {
                try {
                  const parsed: unknown = JSON.parse(evt.data);
                  if (isTurnReceipt(parsed)) {
                    turnReceipt = parsed;
                    set({ streamingReceipt: turnReceipt });
                    for (const report of turnReceipt.board_layout_reports ?? []) notifyBoardChanged(report.board_id);
                  }
                } catch { /* A missing/invalid receipt stays unknown. */ }
                break;
              }
              case 'done': {
                // Add assistant message to messages
                const assistantMsg: AgentMessage = {
                  id: `resp-${Date.now()}`,
                  conversation_id: convId!,
                  role: 'assistant' as AgentMessage['role'],
                  content: accumulated,
                  ...(turnReceipt ? { turn_receipt: turnReceipt } : {}),
                  tool_calls: null,
                  tool_results: null,
                  token_count: null,
                  created_at: new Date().toISOString(),
                };
                set({
                  streaming: false,
                  streamingText: '',
                  streamingReceipt: null,
                  activeToolName: null,
                  messages: [...get().messages, assistantMsg],
                });
                break;
              }
              case 'error': {
                let errorMessage = 'Something went wrong. Please try again.';
                try {
                  const parsed = JSON.parse(evt.data);
                  if (parsed.message) errorMessage = parsed.message;
                } catch { /* ignore */ }
                const errorMsg: AgentMessage = {
                  id: `err-${Date.now()}`,
                  conversation_id: convId!,
                  role: 'assistant' as AgentMessage['role'],
                  content: `⚠️ ${errorMessage}`,
                  ...(turnReceipt ? { turn_receipt: turnReceipt } : {}),
                  tool_calls: null,
                  tool_results: null,
                  token_count: null,
                  created_at: new Date().toISOString(),
                };
                set({
                  streaming: false,
                  streamingText: '',
                  streamingReceipt: null,
                  activeToolName: null,
                  messages: [...get().messages, errorMsg],
                });
                // The route still sends done after error. This message already
                // owns the receipt; done preserves model text without copying it.
                turnReceipt = undefined;
                break;
              }
            }
          }
        }
      }

      // If stream ended without explicit 'done', finalize
      if (get().streaming && (accumulated || turnReceipt)) {
        const assistantMsg: AgentMessage = {
          id: `resp-${Date.now()}`,
          conversation_id: convId!,
          role: 'assistant' as AgentMessage['role'],
          content: accumulated,
          ...(turnReceipt ? { turn_receipt: turnReceipt } : {}),
          tool_calls: null,
          tool_results: null,
          token_count: null,
          created_at: new Date().toISOString(),
        };
        set({
          streaming: false,
          streamingText: '',
          streamingReceipt: null,
          activeToolName: null,
          messages: [...get().messages, assistantMsg],
        });
      }
      if (get().streaming) set({ streaming: false, streamingText: '', streamingReceipt: null, activeToolName: null });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed. Please try again.';
      const errorMsg: AgentMessage = {
        id: `err-${Date.now()}`,
        conversation_id: convId!,
        role: 'assistant' as AgentMessage['role'],
        content: `⚠️ ${errorMessage}`,
        ...(turnReceipt ? { turn_receipt: turnReceipt } : {}),
        tool_calls: null,
        tool_results: null,
        token_count: null,
        created_at: new Date().toISOString(),
      };
      set({
        streaming: false,
        streamingText: '',
        streamingReceipt: null,
        activeToolName: null,
        messages: [...get().messages, errorMsg],
      });
    }
  },

  submitPreferenceForm: (formId: string, responses: Record<string, unknown>) => {
    // Mark the form as submitted
    const forms = get().preferenceForms.map((f) =>
      f.id === formId ? { ...f, submitted: true, responses } : f
    );
    set({ preferenceForms: forms });

    // Send the responses as a structured user message
    const responseText = `[PREFERENCE_RESPONSE]\n${JSON.stringify(responses, null, 2)}`;
    get().sendMessage(responseText);
  },
}));
