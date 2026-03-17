import { create } from 'zustand';
import api from '@/services/api';
import type { Card } from '@shared/types';

export interface DueCard extends Card {
  deck_name: string;
  course_id: string;
  tags?: { id: string; name: string; color: string | null; is_system: boolean | number }[];
}

interface SessionResult {
  cardId: string;
  rating: number;
  timestamp: string;
}

interface ReviewState {
  dueCards: DueCard[];
  currentIndex: number;
  sessionActive: boolean;
  sessionResults: SessionResult[];
  loading: boolean;
  dueCount: number;
  fetchDueCards: () => Promise<void>;
  fetchDueCount: () => Promise<void>;
  rateCard: (cardId: string, rating: number) => Promise<void>;
  setCustomCards: (cards: DueCard[]) => void;
  startSession: () => void;
  nextCard: () => void;
  endSession: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  dueCards: [],
  currentIndex: 0,
  sessionActive: false,
  sessionResults: [],
  loading: false,
  dueCount: 0,

  fetchDueCards: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/review/due');
      set({ dueCards: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchDueCount: async () => {
    try {
      const { data } = await api.get('/review/due/count');
      set({ dueCount: data.count });
    } catch {
      // silently fail
    }
  },

  rateCard: async (cardId, rating) => {
    await api.post(`/review/${cardId}/rate`, { rating });
    set({
      sessionResults: [
        ...get().sessionResults,
        { cardId, rating, timestamp: new Date().toISOString() },
      ],
    });
  },

  setCustomCards: (cards) => {
    set({ dueCards: cards, currentIndex: 0, sessionResults: [] });
  },

  startSession: () => {
    set({ sessionActive: true, currentIndex: 0, sessionResults: [] });
  },

  nextCard: () => {
    set({ currentIndex: get().currentIndex + 1 });
  },

  endSession: () => {
    set({ sessionActive: false, currentIndex: 0 });
  },
}));
