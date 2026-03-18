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

export interface ReviewFilters {
  deckId?: string;
  sectionId?: string;
  tagId?: string;
}

export interface BrowseCard {
  id: string;
  title: string;
  fsrs_reps: number;
  fsrs_next_review: string | null;
}

export interface BrowseSection {
  id: string;
  name: string;
  cards: BrowseCard[];
}

export interface BrowseTree {
  id: string;
  name: string;
  course_id: string;
  sections: BrowseSection[];
  unsectioned_cards: BrowseCard[];
}

interface ReviewState {
  dueCards: DueCard[];
  currentIndex: number;
  sessionActive: boolean;
  sessionResults: SessionResult[];
  loading: boolean;
  dueCount: number;
  reviewFilters: ReviewFilters | null;
  browseTree: BrowseTree[];
  fetchDueCards: (filters?: ReviewFilters) => Promise<void>;
  fetchDueCount: () => Promise<void>;
  rateCard: (cardId: string, rating: number) => Promise<void>;
  setCustomCards: (cards: DueCard[]) => void;
  startSession: () => void;
  nextCard: () => void;
  endSession: () => void;
  setReviewFilters: (filters: ReviewFilters | null) => void;
  fetchBrowseTree: () => Promise<void>;
  startCustomSession: (cardIds: string[]) => Promise<void>;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  dueCards: [],
  currentIndex: 0,
  sessionActive: false,
  sessionResults: [],
  loading: false,
  dueCount: 0,
  reviewFilters: null,
  browseTree: [],

  fetchDueCards: async (filters?: ReviewFilters) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (filters?.deckId) params.set('deckId', filters.deckId);
      if (filters?.sectionId) params.set('sectionId', filters.sectionId);
      if (filters?.tagId) params.set('tagId', filters.tagId);
      const query = params.toString();
      const { data } = await api.get(`/review/due${query ? `?${query}` : ''}`);
      set({ dueCards: data, loading: false, reviewFilters: filters || null });
    } catch (err) {
      console.error('Failed to fetch due cards:', err);
      set({ loading: false });
    }
  },

  fetchDueCount: async () => {
    try {
      const { data } = await api.get('/review/due/count');
      set({ dueCount: data.count });
    } catch (err) {
      console.error('Failed to fetch browse tree:', err);
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
    set({ sessionActive: false, currentIndex: 0, reviewFilters: null });
  },

  setReviewFilters: (filters) => {
    set({ reviewFilters: filters });
  },

  fetchBrowseTree: async () => {
    try {
      const { data } = await api.get('/review/browse');
      set({ browseTree: data });
    } catch (err) {
      console.error('Failed to fetch browse tree:', err);
    }
  },

  startCustomSession: async (cardIds) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/review/custom', { card_ids: cardIds });
      set({ dueCards: data, currentIndex: 0, sessionResults: [], loading: false, sessionActive: true });
    } catch (err) {
      console.error('Failed to start custom session:', err);
      set({ loading: false });
    }
  },
}));
