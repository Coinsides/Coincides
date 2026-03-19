import { create } from 'zustand';
import api from '@/services/api';
import type {
  TimeBlock, ResolvedTimeBlock, TimeBlockOverride,
  CreateTimeBlockRequest, UpdateTimeBlockRequest,
  CreateTimeBlockOverrideRequest,
} from '@shared/types';

interface DayData {
  blocks: ResolvedTimeBlock[];
  available_study_minutes: number;
  overlaps: [string, string][];
}

interface TimeBlockState {
  // Template blocks (weekly)
  templates: TimeBlock[];
  templatesLoading: boolean;

  // Week resolved data keyed by 'YYYY-MM-DD'
  weekData: Record<string, DayData>;
  weekLoading: boolean;

  // CRUD — templates
  fetchTemplates: () => Promise<void>;
  createBlocks: (blocks: CreateTimeBlockRequest[]) => Promise<TimeBlock[]>;
  updateBlock: (id: string, data: UpdateTimeBlockRequest) => Promise<TimeBlock>;
  deleteBlock: (id: string) => Promise<void>;

  // Resolved data
  fetchWeek: (date: string) => Promise<void>;

  // Overrides
  createOverride: (data: CreateTimeBlockOverrideRequest) => Promise<TimeBlockOverride>;
  deleteOverride: (id: string) => Promise<void>;
}

export const useTimeBlockStore = create<TimeBlockState>((set, get) => ({
  templates: [],
  templatesLoading: false,
  weekData: {},
  weekLoading: false,

  fetchTemplates: async () => {
    set({ templatesLoading: true });
    try {
      const { data } = await api.get('/time-blocks');
      set({ templates: data, templatesLoading: false });
    } catch (err) {
      console.error('Failed to fetch time block templates:', err);
      set({ templatesLoading: false });
    }
  },

  createBlocks: async (blocks) => {
    const { data } = await api.post('/time-blocks', { blocks });
    const created = Array.isArray(data) ? data : [data];
    set({ templates: [...get().templates, ...created] });
    return created;
  },

  updateBlock: async (id, updates) => {
    const { data } = await api.put(`/time-blocks/${id}`, updates);
    set({ templates: get().templates.map((t) => (t.id === id ? data : t)) });
    return data;
  },

  deleteBlock: async (id) => {
    await api.delete(`/time-blocks/${id}`);
    set({ templates: get().templates.filter((t) => t.id !== id) });
  },

  fetchWeek: async (date) => {
    set({ weekLoading: true });
    try {
      const { data } = await api.get(`/time-blocks/week/${date}`);
      set({ weekData: data, weekLoading: false });
    } catch (err) {
      console.error('Failed to fetch week time blocks:', err);
      set({ weekLoading: false });
    }
  },

  createOverride: async (overrideData) => {
    const { data } = await api.post('/time-blocks/override', overrideData);
    return data;
  },

  deleteOverride: async (id) => {
    await api.delete(`/time-blocks/override/${id}`);
  },
}));
