import { create } from 'zustand';
import api from '@/services/api';
import type { CreateRecurringTaskRequest, RecurringTaskGroupWithProgress, Task } from '@shared/types';

interface RecurringTaskState {
  groups: RecurringTaskGroupWithProgress[];
  loading: boolean;
  createRecurringTask: (data: CreateRecurringTaskRequest) => Promise<{ group: RecurringTaskGroupWithProgress; tasks: Task[] }>;
  fetchRecurringTask: (id: string) => Promise<RecurringTaskGroupWithProgress>;
  deleteRecurringTask: (id: string) => Promise<void>;
}

export const useRecurringTaskStore = create<RecurringTaskState>((set, get) => ({
  groups: [],
  loading: false,

  createRecurringTask: async (data) => {
    const { data: result } = await api.post('/recurring-tasks', data);
    set({ groups: [...get().groups, result.group] });
    return result;
  },

  fetchRecurringTask: async (id) => {
    const { data } = await api.get(`/recurring-tasks/${id}`);
    set({
      groups: get().groups.some((g) => g.id === id)
        ? get().groups.map((g) => (g.id === id ? data : g))
        : [...get().groups, data],
    });
    return data;
  },

  deleteRecurringTask: async (id) => {
    await api.delete(`/recurring-tasks/${id}`);
    set({ groups: get().groups.filter((g) => g.id !== id) });
  },
}));
