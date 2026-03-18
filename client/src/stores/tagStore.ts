import { create } from 'zustand';
import api from '@/services/api';
import type { Tag, TagGroup } from '@shared/types';

interface CreateTagData {
  name: string;
  color?: string;
  tag_group_id?: string;
}

interface UpdateTagData {
  name?: string;
  color?: string;
}

interface CreateTagGroupData {
  course_id: string;
  name: string;
}

interface UpdateTagGroupData {
  name: string;
}

interface TagState {
  tags: Tag[];
  loading: boolean;
  tagGroups: TagGroup[];
  tagGroupsLoading: boolean;
  courseTags: Tag[];
  courseTagsLoading: boolean;
  fetchTags: () => Promise<void>;
  createTag: (data: CreateTagData) => Promise<Tag>;
  updateTag: (id: string, data: UpdateTagData) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
  fetchTagGroups: (courseId: string) => Promise<void>;
  createTagGroup: (data: CreateTagGroupData) => Promise<TagGroup>;
  updateTagGroup: (id: string, data: UpdateTagGroupData) => Promise<TagGroup>;
  deleteTagGroup: (id: string) => Promise<void>;
  fetchTagsByCourse: (courseId: string) => Promise<void>;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loading: false,
  tagGroups: [],
  tagGroupsLoading: false,
  courseTags: [],
  courseTagsLoading: false,

  fetchTags: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/tags');
      set({ tags: data, loading: false });
    } catch (err) {
      console.error('Failed to fetch tag groups:', err);
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
    // Also update in tagGroups if present
    set({
      tagGroups: get().tagGroups.map((g) => ({
        ...g,
        tags: g.tags?.map((t) => (t.id === id ? data : t)),
      })),
    });
    return data;
  },

  deleteTag: async (id) => {
    await api.delete(`/tags/${id}`);
    set({ tags: get().tags.filter((t) => t.id !== id) });
    // Also remove from tagGroups
    set({
      tagGroups: get().tagGroups.map((g) => ({
        ...g,
        tags: g.tags?.filter((t) => t.id !== id),
      })),
    });
  },

  fetchTagGroups: async (courseId) => {
    set({ tagGroupsLoading: true });
    try {
      const { data } = await api.get('/tag-groups', { params: { course_id: courseId } });
      set({ tagGroups: data.tag_groups, tagGroupsLoading: false });
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      set({ tagGroupsLoading: false });
    }
  },

  createTagGroup: async (groupData) => {
    const { data } = await api.post('/tag-groups', groupData);
    const created = { ...data, tags: [] };
    set({ tagGroups: [...get().tagGroups, created] });
    return created;
  },

  updateTagGroup: async (id, groupData) => {
    const { data } = await api.put(`/tag-groups/${id}`, groupData);
    set({
      tagGroups: get().tagGroups.map((g) =>
        g.id === id ? { ...g, ...data } : g
      ),
    });
    return data;
  },

  deleteTagGroup: async (id) => {
    await api.delete(`/tag-groups/${id}`);
    set({ tagGroups: get().tagGroups.filter((g) => g.id !== id) });
  },

  fetchTagsByCourse: async (courseId) => {
    set({ courseTagsLoading: true });
    try {
      const { data } = await api.get('/tags', { params: { course_id: courseId } });
      set({ courseTags: data, courseTagsLoading: false });
    } catch (err) {
      console.error('Failed to fetch tags for card:', err);
      set({ courseTagsLoading: false });
    }
  },
}));
