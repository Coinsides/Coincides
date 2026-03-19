import { create } from 'zustand';
import api from '@/services/api';
import type { Goal, Task, GoalDependency, CreateGoalRequest, UpdateGoalRequest, CreateTaskRequest } from '@shared/types';

interface GoalProgress {
  goal_id: string;
  direct_tasks: { total: number; completed: number };
  all_tasks: { total: number; completed: number };
  progress: number;
  children_count: number;
  descendant_goal_count: number;
}

interface ReorderItem {
  id: string;
  parent_id: string | null;
  sort_order: number;
}

interface GoalState {
  goals: Goal[];
  loading: boolean;
  progressMap: Record<string, GoalProgress>;
  dependencyMap: Record<string, GoalDependency[]>;
  fetchGoals: (courseId?: string) => Promise<void>;
  createGoal: (data: CreateGoalRequest) => Promise<Goal>;
  updateGoal: (id: string, data: UpdateGoalRequest) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
  toggleExamMode: (id: string) => Promise<Goal>;
  addTaskToGoal: (goalId: string, taskData: CreateTaskRequest) => Promise<Task>;
  reorderGoals: (items: ReorderItem[]) => Promise<void>;
  fetchProgress: (goalId: string) => Promise<GoalProgress>;
  fetchAllProgress: () => Promise<void>;
  // Dependencies
  fetchDependencies: (goalId: string) => Promise<GoalDependency[]>;
  addDependency: (goalId: string, dependsOnGoalId: string) => Promise<GoalDependency>;
  removeDependency: (goalId: string, depId: string) => Promise<void>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  loading: false,
  progressMap: {},
  dependencyMap: {},

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
    // Also remove any children of this goal from state
    const removeIds = new Set<string>();
    removeIds.add(id);
    // Find all descendants
    const findChildren = (parentId: string) => {
      for (const g of get().goals) {
        if (g.parent_id === parentId) {
          removeIds.add(g.id);
          findChildren(g.id);
        }
      }
    };
    findChildren(id);
    set({ goals: get().goals.filter((g) => !removeIds.has(g.id)) });
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

  reorderGoals: async (items) => {
    const { data } = await api.put('/goals/reorder', { items });
    set({ goals: data });
  },

  fetchProgress: async (goalId) => {
    const { data } = await api.get(`/goals/${goalId}/progress`);
    set({ progressMap: { ...get().progressMap, [goalId]: data } });
    return data;
  },

  fetchAllProgress: async () => {
    const goals = get().goals;
    // Only fetch progress for top-level goals + any expanded goals to be efficient
    const topLevel = goals.filter(g => !g.parent_id);
    const progressMap: Record<string, GoalProgress> = {};
    
    await Promise.all(
      topLevel.map(async (goal) => {
        try {
          const { data } = await api.get(`/goals/${goal.id}/progress`);
          progressMap[goal.id] = data;
        } catch {
          // silently skip
        }
      })
    );
    
    set({ progressMap: { ...get().progressMap, ...progressMap } });
  },

  fetchDependencies: async (goalId) => {
    const { data } = await api.get(`/goals/${goalId}/dependencies`);
    set({ dependencyMap: { ...get().dependencyMap, [goalId]: data } });
    return data;
  },

  addDependency: async (goalId, dependsOnGoalId) => {
    const { data } = await api.post(`/goals/${goalId}/dependencies`, { depends_on_goal_id: dependsOnGoalId });
    const current = get().dependencyMap[goalId] || [];
    set({ dependencyMap: { ...get().dependencyMap, [goalId]: [...current, data] } });
    return data;
  },

  removeDependency: async (goalId, depId) => {
    await api.delete(`/goals/${goalId}/dependencies/${depId}`);
    const current = get().dependencyMap[goalId] || [];
    set({ dependencyMap: { ...get().dependencyMap, [goalId]: current.filter((d) => d.id !== depId) } });
  },
}));
