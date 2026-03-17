import { create } from 'zustand';
import api from '@/services/api';
import type { Tag } from '@shared/types';

interface CreateTagData {
  name: string;
  color?: string;
}

interface UpdateTagData {
  name?: string;
  color?: string;
}

interface TagState {
  tags: Tag[];
  loading: boolean;
  fetchTags: () => Promise<void>;
  createTag: (data: CreateTagData) => Promise<Tag>;
  updateTag: (id: string, data: UpdateTagData) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loading: false,

  fetchTags: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/tags');
      set({ tags: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createTag: async (tagData) => {
    const { data } = await api.post('/tags', tagData);
    set({ tags: [...get().tags, data] });
    return data;
  },

  updateTag: async (id, tagData) => {
    const { data } = await api.put(`/tags/${id}`, tagData);
    set({ tags: get().tags.map((t) => (t.id === id ? data : t)) });
    return data;
  },

  deleteTag: async (id) => {
    await api.delete(`/tags/${id}`);
    set({ tags: get().tags.filter((t) => t.id !== id) });
  },
}));
