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
