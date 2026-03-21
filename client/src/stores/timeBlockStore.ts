import { create } from 'zustand';
import api from '@/services/api';
import type {
  TimeBlock, TimeBlockTemplateSet, TimeBlockTemplate,
  UpdateTimeBlockRequest, ApplyTemplateRequest,
} from '@shared/types';

interface DayData {
  blocks: TimeBlock[];
  available_study_minutes: number;
  overlaps: [string, string][];
}

interface TimeBlockState {
  // Week data keyed by 'YYYY-MM-DD' (instances)
  weekData: Record<string, DayData>;
  weekLoading: boolean;

  // Template sets
  templateSets: TimeBlockTemplateSet[];
  templateItems: TimeBlockTemplate[];
  templatesLoading: boolean;

  // Instance CRUD
  fetchWeek: (date: string) => Promise<void>;
  createInstances: (blocks: Array<{
    label: string; type?: string; date: string;
    start_time: string; end_time: string; color?: string;
  }>) => Promise<TimeBlock[]>;
  updateInstance: (id: string, data: UpdateTimeBlockRequest) => Promise<TimeBlock>;
  deleteInstance: (id: string) => Promise<void>;

  // Template CRUD
  fetchTemplateSets: () => Promise<void>;
  createTemplateSet: (name: string) => Promise<TimeBlockTemplateSet>;
  renameTemplateSet: (id: string, name: string) => Promise<TimeBlockTemplateSet>;
  deleteTemplateSet: (id: string) => Promise<void>;
  fetchTemplateItems: (setId: string) => Promise<void>;
  saveTemplateItems: (setId: string, items: Array<{
    label: string; type?: string; day_of_week: number;
    start_time: string; end_time: string; color?: string;
  }>) => Promise<TimeBlockTemplate[]>;
  applyTemplate: (setId: string, request: ApplyTemplateRequest) => Promise<{ created_count: number; skipped_dates: string[] }>;
}

export const useTimeBlockStore = create<TimeBlockState>((set, get) => ({
  weekData: {},
  weekLoading: false,
  templateSets: [],
  templateItems: [],
  templatesLoading: false,

  // ── Instances ──────────────────────────────────────────────

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

  createInstances: async (blocks) => {
    const { data } = await api.post('/time-blocks', { blocks });
    const created = Array.isArray(data) ? data : [data];
    return created;
  },

  updateInstance: async (id, updates) => {
    const { data } = await api.put(`/time-blocks/${id}`, updates);
    return data;
  },

  deleteInstance: async (id) => {
    await api.delete(`/time-blocks/${id}`);
  },

  // ── Templates ──────────────────────────────────────────────

  fetchTemplateSets: async () => {
    set({ templatesLoading: true });
    try {
      const { data } = await api.get('/time-blocks/templates/sets');
      set({ templateSets: data, templatesLoading: false });
    } catch (err) {
      console.error('Failed to fetch template sets:', err);
      set({ templatesLoading: false });
    }
  },

  createTemplateSet: async (name) => {
    const { data } = await api.post('/time-blocks/templates/sets', { name });
    set({ templateSets: [...get().templateSets, data] });
    return data;
  },

  renameTemplateSet: async (id, name) => {
    const { data } = await api.put(`/time-blocks/templates/sets/${id}`, { name });
    set({ templateSets: get().templateSets.map((s) => (s.id === id ? data : s)) });
    return data;
  },

  deleteTemplateSet: async (id) => {
    await api.delete(`/time-blocks/templates/sets/${id}`);
    set({ templateSets: get().templateSets.filter((s) => s.id !== id) });
  },

  fetchTemplateItems: async (setId) => {
    set({ templatesLoading: true });
    try {
      const { data } = await api.get(`/time-blocks/templates/sets/${setId}/items`);
      set({ templateItems: data, templatesLoading: false });
    } catch (err) {
      console.error('Failed to fetch template items:', err);
      set({ templatesLoading: false });
    }
  },

  saveTemplateItems: async (setId, items) => {
    const { data } = await api.post(`/time-blocks/templates/sets/${setId}/items`, { items });
    set({ templateItems: data });
    return data;
  },

  applyTemplate: async (setId, request) => {
    const { data } = await api.post(`/time-blocks/templates/sets/${setId}/apply`, request);
    return data;
  },
}));
