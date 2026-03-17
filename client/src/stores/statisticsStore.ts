import { create } from 'zustand';
import api from '@/services/api';

interface StatisticsState {
  overview: {
    streak: { current: number; longest: number };
    today: { tasks_completed: number; tasks_total: number; cards_reviewed: number };
    this_week: { tasks_completed: number; tasks_total: number; cards_reviewed: number };
    this_month: { tasks_completed: number; tasks_total: number; cards_reviewed: number };
  } | null;
  heatmap: Array<{ date: string; count: number; level: number }>;
  trends: Array<{ period_label: string; tasks_completed: number; tasks_total: number; cards_reviewed: number; completion_rate: number }>;
  courseStats: Array<{ course_id: string; course_name: string; course_color: string; tasks_total: number; tasks_completed: number; completion_rate: number; cards_total: number; cards_reviewed: number; active_goals: number }>;
  loading: boolean;
  fetchOverview: () => Promise<void>;
  fetchHeatmap: (months?: number) => Promise<void>;
  fetchTrends: (period?: string, count?: number) => Promise<void>;
  fetchCourseStats: () => Promise<void>;
}

export const useStatisticsStore = create<StatisticsState>((set) => ({
  overview: null,
  heatmap: [],
  trends: [],
  courseStats: [],
  loading: false,

  fetchOverview: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/statistics/overview');
      set({ overview: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchHeatmap: async (months = 6) => {
    try {
      const { data } = await api.get('/statistics/heatmap', { params: { months } });
      set({ heatmap: data });
    } catch {
      // silently fail
    }
  },

  fetchTrends: async (period = 'weekly', count = 12) => {
    try {
      const { data } = await api.get('/statistics/trends', { params: { period, weeks: count } });
      set({ trends: data });
    } catch {
      // silently fail
    }
  },

  fetchCourseStats: async () => {
    try {
      const { data } = await api.get('/statistics/courses');
      set({ courseStats: data });
    } catch {
      // silently fail
    }
  },
}));
