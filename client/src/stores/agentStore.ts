import { create } from 'zustand';
import api, { getToken, API_BASE } from '@/services/api';
import type { AgentConversation, AgentMessage } from '@shared/types';

interface AgentState {
  conversations: AgentConversation[];
  activeConversationId: string | null;
  messages: AgentMessage[];
  streaming: boolean;
  streamingText: string;
  activeToolName: string | null;
  loading: boolean;

  fetchConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<string>;
  selectConversation: (id: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendMessage: (message: string, contextHint?: { type: string; data?: unknown }) => Promise<void>;
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

export const useAgentStore = create<AgentState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  streaming: false,
  streamingText: '',
  activeToolName: null,
  loading: false,

  fetchConversations: async () => {
    try {
      const { data } = await api.get('/agent/conversations');
      set({ conversations: data });
    } catch {
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
    set({ activeConversationId: id, messages: [], loading: true });
    await get().fetchMessages(id);
    set({ loading: false });
  },

  fetchMessages: async (conversationId) => {
    try {
      const { data } = await api.get(`/agent/conversations/${conversationId}/messages`);
      set({ messages: data });
    } catch {
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

  sendMessage: async (message, contextHint?) => {
    let convId = get().activeConversationId;

    // Auto-create conversation if none active
    if (!convId) {
      const shortTitle = message.slice(0, 40) + (message.length > 40 ? '...' : '');
      convId = await get().createConversation(shortTitle);
    }

    // Add user message to local state immediately
    const userMsg: AgentMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: convId,
      role: 'user' as AgentMessage['role'],
      content: message,
      tool_calls: null,
      tool_results: null,
      token_count: null,
      created_at: new Date().toISOString(),
    };
    set({ messages: [...get().messages, userMsg], streaming: true, streamingText: '', activeToolName: null });

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/agent/conversations/${convId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message, context_hint: contextHint }),
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
              case 'done': {
                // Add assistant message to messages
                const assistantMsg: AgentMessage = {
                  id: `resp-${Date.now()}`,
                  conversation_id: convId!,
                  role: 'assistant' as AgentMessage['role'],
                  content: accumulated,
                  tool_calls: null,
                  tool_results: null,
                  token_count: null,
                  created_at: new Date().toISOString(),
                };
                set({
                  streaming: false,
                  streamingText: '',
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
                  tool_calls: null,
                  tool_results: null,
                  token_count: null,
                  created_at: new Date().toISOString(),
                };
                set({
                  streaming: false,
                  streamingText: '',
                  activeToolName: null,
                  messages: [...get().messages, errorMsg],
                });
                break;
              }
            }
          }
        }
      }

      // If stream ended without explicit 'done', finalize
      if (get().streaming && accumulated) {
        const assistantMsg: AgentMessage = {
          id: `resp-${Date.now()}`,
          conversation_id: convId!,
          role: 'assistant' as AgentMessage['role'],
          content: accumulated,
          tool_calls: null,
          tool_results: null,
          token_count: null,
          created_at: new Date().toISOString(),
        };
        set({
          streaming: false,
          streamingText: '',
          activeToolName: null,
          messages: [...get().messages, assistantMsg],
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed. Please try again.';
      const errorMsg: AgentMessage = {
        id: `err-${Date.now()}`,
        conversation_id: convId!,
        role: 'assistant' as AgentMessage['role'],
        content: `⚠️ ${errorMessage}`,
        tool_calls: null,
        tool_results: null,
        token_count: null,
        created_at: new Date().toISOString(),
      };
      set({
        streaming: false,
        streamingText: '',
        activeToolName: null,
        messages: [...get().messages, errorMsg],
      });
    }
  },
}));
