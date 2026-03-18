import { create } from 'zustand';
import api from '@/services/api';
import type { Card, CardContent, CardTemplateType } from '@shared/types';

interface CreateCardData {
  deck_id: string;
  section_id?: string;
  template_type?: CardTemplateType;
  title: string;
  content: CardContent;
  importance?: number;
  tag_ids?: string[];
}

interface UpdateCardData {
  template_type?: CardTemplateType;
  title?: string;
  content?: CardContent;
  importance?: number;
  section_id?: string | null;
  tag_ids?: string[];
}

interface CardFilters {
  tag_id?: string;
  template_type?: string;
  importance?: number;
  search?: string;
}

interface CardWithTags extends Card {
  tags?: { id: string; name: string; color: string | null; is_system: boolean | number }[];
}

interface CardState {
  cards: CardWithTags[];
  currentCard: CardWithTags | null;
  loading: boolean;
  error: string | null;
  fetchCards: (deckId: string, filters?: CardFilters) => Promise<void>;
  createCard: (data: CreateCardData) => Promise<CardWithTags>;
  updateCard: (id: string, data: UpdateCardData) => Promise<CardWithTags>;
  deleteCard: (id: string) => Promise<void>;
  setCurrentCard: (card: CardWithTags | null) => void;
  batchDelete: (cardIds: string[]) => Promise<number>;
  batchMove: (cardIds: string[], targetDeckId: string, targetSectionId?: string) => Promise<number>;
  reorderCards: (deckId: string, updates: { id: string; section_id: string | null; order_index: number }[]) => Promise<void>;
}

export const useCardStore = create<CardState>((set, get) => ({
  cards: [],
  currentCard: null,
  loading: false,
  error: null,

  fetchCards: async (deckId, filters) => {
    set({ loading: true, error: null });
    try {
      const params: Record<string, string> = { deck_id: deckId };
      if (filters?.tag_id) params.tag_id = filters.tag_id;
      if (filters?.template_type) params.template_type = filters.template_type;
      if (filters?.importance) params.importance = String(filters.importance);
      if (filters?.search) params.search = filters.search;
      const { data } = await api.get('/cards', { params });
      set({ cards: data, loading: false });
    } catch (err) {
      console.error('Failed to fetch cards:', err);
      set({ loading: false, error: 'Failed to fetch cards' });
    }
  },

  createCard: async (cardData) => {
    const { data } = await api.post('/cards', cardData);
    set({ cards: [...get().cards, data] });
    return data;
  },

  updateCard: async (id, cardData) => {
    const { data } = await api.put(`/cards/${id}`, cardData);
    set({ cards: get().cards.map((c) => (c.id === id ? data : c)) });
    return data;
  },

  deleteCard: async (id) => {
    await api.delete(`/cards/${id}`);
    set({ cards: get().cards.filter((c) => c.id !== id) });
  },

  setCurrentCard: (card) => set({ currentCard: card }),

  batchDelete: async (cardIds) => {
    const { data } = await api.post('/cards/batch-delete', { card_ids: cardIds });
    set({ cards: get().cards.filter((c) => !cardIds.includes(c.id)) });
    return data.deleted;
  },

  batchMove: async (cardIds, targetDeckId, targetSectionId?) => {
    const { data } = await api.post('/cards/batch-move', {
      card_ids: cardIds,
      target_deck_id: targetDeckId,
      target_section_id: targetSectionId,
    });
    set({ cards: get().cards.filter((c) => !cardIds.includes(c.id)) });
    return data.moved;
  },

  reorderCards: async (deckId, updates) => {
    // Optimistic update
    set({
      cards: get().cards.map((c) => {
        const upd = updates.find((u) => u.id === c.id);
        if (upd) return { ...c, section_id: upd.section_id, order_index: upd.order_index };
        return c;
      }),
    });

    await api.put('/cards/reorder', { deck_id: deckId, updates });
  },
}));
