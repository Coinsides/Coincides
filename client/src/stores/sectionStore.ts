import { create } from 'zustand';
import api from '@/services/api';
import type { CardSection } from '@shared/types';

interface SectionState {
  sections: CardSection[];
  loading: boolean;
  fetchSections: (deckId: string) => Promise<void>;
  createSection: (deckId: string, name: string, orderIndex?: number) => Promise<CardSection>;
  updateSection: (id: string, data: { name?: string; order_index?: number }) => Promise<CardSection>;
  deleteSection: (id: string) => Promise<void>;
  reorderSections: (deckId: string, orderedIds: string[]) => Promise<void>;
}

export const useSectionStore = create<SectionState>((set, get) => ({
  sections: [],
  loading: false,

  fetchSections: async (deckId) => {
    set({ loading: true });
    try {
      const { data } = await api.get('/sections', { params: { deck_id: deckId } });
      set({ sections: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createSection: async (deckId, name, orderIndex = 0) => {
    const { data } = await api.post('/sections', { deck_id: deckId, name, order_index: orderIndex });
    set({ sections: [...get().sections, data] });
    return data;
  },

  updateSection: async (id, updateData) => {
    const { data } = await api.put(`/sections/${id}`, updateData);
    set({ sections: get().sections.map((s) => (s.id === id ? data : s)) });
    return data;
  },

  deleteSection: async (id) => {
    await api.delete(`/sections/${id}`);
    set({ sections: get().sections.filter((s) => s.id !== id) });
  },

  reorderSections: async (deckId, orderedIds) => {
    // Optimistic update
    const reordered = orderedIds
      .map((id, i) => {
        const s = get().sections.find((sec) => sec.id === id);
        return s ? { ...s, order_index: i } : null;
      })
      .filter((s): s is CardSection => s !== null);
    set({ sections: reordered });

    await api.put('/sections/reorder', { deck_id: deckId, order: orderedIds });
  },
}));
