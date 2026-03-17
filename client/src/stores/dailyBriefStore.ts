import { create } from 'zustand';
import api from '@/services/api';
import type { DailyBriefResponse, EnergyLevel, Task } from '@shared/types';

interface DailyBriefState {
  briefData: DailyBriefResponse | null;
  loading: boolean;
  fetchDailyBrief: () => Promise<void>;
  setDailyStatus: (energyLevel: EnergyLevel) => Promise<void>;
  updateTaskInBrief: (updatedTask: Task) => void;
}

export const useDailyBriefStore = create<DailyBriefState>((set, get) => ({
  briefData: null,
  loading: false,

  fetchDailyBrief: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/daily-brief');
      set({ briefData: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setDailyStatus: async (energyLevel) => {
    try {
      await api.post('/daily-status', { energy_level: energyLevel });
      const brief = get().briefData;
      if (brief) {
        set({ briefData: { ...brief, energy_level: energyLevel } });
      }
    } catch {
      // Silently fail
    }
  },

  updateTaskInBrief: (updatedTask) => {
    const brief = get().briefData;
    if (!brief) return;

    const updateList = (list: Task[]) =>
      list.map((t) => (t.id === updatedTask.id ? updatedTask : t));

    set({
      briefData: {
        ...brief,
        tasks: {
          must: updateList(brief.tasks.must),
          recommended: updateList(brief.tasks.recommended),
          optional: updateList(brief.tasks.optional),
        },
      },
    });
  },
}));
