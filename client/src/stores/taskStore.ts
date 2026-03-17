import { create } from 'zustand';
import api from '@/services/api';
import type { Task, CreateTaskRequest, UpdateTaskRequest } from '@shared/types';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  fetchTasksByDate: (date: string) => Promise<void>;
  fetchTasksByRange: (from: string, to: string, courseId?: string) => Promise<void>;
  createTask: (data: CreateTaskRequest) => Promise<Task>;
  updateTask: (id: string, data: UpdateTaskRequest) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (task: Task) => Promise<Task>;
  batchCreateTasks: (tasks: CreateTaskRequest[]) => Promise<Task[]>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasksByDate: async (date) => {
    set({ loading: true });
    try {
      const { data } = await api.get('/tasks', { params: { date } });
      set({ tasks: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchTasksByRange: async (from, to, courseId) => {
    set({ loading: true });
    try {
      const params: Record<string, string> = { from, to };
      if (courseId) params.course_id = courseId;
      const { data } = await api.get('/tasks', { params });
      set({ tasks: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createTask: async (taskData) => {
    const { data } = await api.post('/tasks', taskData);
    set({ tasks: [...get().tasks, data] });
    return data;
  },

  updateTask: async (id, taskData) => {
    const { data } = await api.put(`/tasks/${id}`, taskData);
    set({ tasks: get().tasks.map((t) => (t.id === id ? data : t)) });
    return data;
  },

  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}`);
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },

  toggleComplete: async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const { data } = await api.put(`/tasks/${task.id}`, { status: newStatus });
    set({ tasks: get().tasks.map((t) => (t.id === task.id ? data : t)) });
    return data;
  },

  batchCreateTasks: async (tasks) => {
    const { data } = await api.post('/tasks/batch', { tasks });
    set({ tasks: [...get().tasks, ...data] });
    return data;
  },
}));
