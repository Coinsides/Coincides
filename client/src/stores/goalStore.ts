import { create } from 'zustand';
import api from '@/services/api';
import type { Goal, Task, CreateGoalRequest, UpdateGoalRequest, CreateTaskRequest } from '@shared/types';

interface GoalState {
  goals: Goal[];
  loading: boolean;
  fetchGoals: (courseId?: string) => Promise<void>;
  createGoal: (data: CreateGoalRequest) => Promise<Goal>;
  updateGoal: (id: string, data: UpdateGoalRequest) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
  toggleExamMode: (id: string) => Promise<Goal>;
  addTaskToGoal: (goalId: string, taskData: CreateTaskRequest) => Promise<Task>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  loading: false,

  fetchGoals: async (courseId) => {
    set({ loading: true });
    try {
      const params = courseId ? { course_id: courseId } : {};
      const { data } = await api.get('/goals', { params });
      set({ goals: data, loading: false });
    } catch (err) {
      console.error('Failed to fetch goals:', err);
      set({ loading: false });
    }
  },

  createGoal: async (goalData) => {
    const { data } = await api.post('/goals', goalData);
    set({ goals: [...get().goals, data] });
    return data;
  },

  updateGoal: async (id, goalData) => {
    const { data } = await api.put(`/goals/${id}`, goalData);
    set({ goals: get().goals.map((g) => (g.id === id ? data : g)) });
    return data;
  },

  deleteGoal: async (id) => {
    await api.delete(`/goals/${id}`);
    set({ goals: get().goals.filter((g) => g.id !== id) });
  },

  toggleExamMode: async (id) => {
    const { data } = await api.put(`/goals/${id}/exam-mode`);
    set({ goals: get().goals.map((g) => (g.id === id ? data : g)) });
    return data;
  },

  addTaskToGoal: async (goalId, taskData) => {
    const { data } = await api.post(`/goals/${goalId}/tasks`, taskData);
    return data;
  },
}));
