import { create } from 'zustand';
import api from '@/services/api';
import type { User, UserSettings } from '@shared/types';

type SafeUser = Omit<User, 'password_hash'>;

interface AuthState {
  user: SafeUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.error || 'Login failed' });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', { email, password, name });
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.response?.data?.error || 'Registration failed' });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = get().token;
    if (!token) return;
    set({ loading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, loading: false });
    }
  },

  updateSettings: async (settings) => {
    try {
      const { data } = await api.put('/settings', { settings });
      const user = get().user;
      if (user) {
        set({ user: { ...user, settings: data } });
      }
    } catch (err: any) {
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
