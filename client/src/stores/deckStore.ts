import { create } from 'zustand';
import api from '@/services/api';
import type { CardDeck } from '@shared/types';

interface CreateDeckData {
  name: string;
  description?: string;
  course_id: string;
}

interface UpdateDeckData {
  name?: string;
  description?: string;
}

interface DeckState {
  decks: CardDeck[];
  loading: boolean;
  error: string | null;
  fetchDecks: (courseId?: string) => Promise<void>;
  /** Re-read the decks already listed (e.g. card counts) without changing which decks or filter are shown. */
  refreshLoadedDecks: () => Promise<void>;
  createDeck: (data: CreateDeckData) => Promise<CardDeck>;
  updateDeck: (id: string, data: UpdateDeckData) => Promise<CardDeck>;
  deleteDeck: (id: string) => Promise<void>;
}

export const useDeckStore = create<DeckState>((set, get) => ({
  decks: [],
  loading: false,
  error: null,

  fetchDecks: async (courseId) => {
    set({ loading: true, error: null });
    try {
      const params: Record<string, string> = {};
      if (courseId) params.course_id = courseId;
      const { data } = await api.get('/decks', { params });
      set({ decks: data, loading: false });
    } catch (err) {
      console.error('Failed to fetch decks:', err);
      set({ loading: false, error: 'Failed to fetch decks' });
    }
  },

  refreshLoadedDecks: async () => {
    if (get().decks.length === 0) return;
    try {
      const { data } = await api.get<CardDeck[]>('/decks');
      const latest = new Map(data.map((deck) => [deck.id, deck]));
      set({ decks: get().decks.map((deck) => latest.get(deck.id) ?? deck) });
    } catch (err) {
      console.error('Failed to refresh decks:', err);
    }
  },

  createDeck: async (deckData) => {
    const { data } = await api.post('/decks', deckData);
    set({ decks: [...get().decks, data] });
    return data;
  },

  updateDeck: async (id, deckData) => {
    const { data } = await api.put(`/decks/${id}`, deckData);
    set({ decks: get().decks.map((d) => (d.id === id ? data : d)) });
    return data;
  },

  deleteDeck: async (id) => {
    await api.delete(`/decks/${id}`);
    set({ decks: get().decks.filter((d) => d.id !== id) });
  },
}));
