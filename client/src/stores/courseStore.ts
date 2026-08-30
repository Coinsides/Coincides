import { create } from 'zustand';
import api from '@/services/api';
import type { Course, CreateCourseRequest, UpdateCourseRequest } from '@shared/types';

export interface RecentCourseNote {
  id: string;
  title: string;
  updated_at: string;
  excerpt: string | null;
}

export type CourseWithRecentNote = Course & {
  recent_note?: RecentCourseNote | null;
};

interface CourseState {
  courses: CourseWithRecentNote[];
  loading: boolean;
  selectedCourseFilter: string | null;
  fetchCourses: () => Promise<void>;
  createCourse: (data: CreateCourseRequest) => Promise<Course>;
  updateCourse: (id: string, data: UpdateCourseRequest) => Promise<Course>;
  deleteCourse: (id: string, action?: ProjectProjectionAction) => Promise<void>;
  setSelectedCourseFilter: (id: string | null) => void;
}

export type ProjectProjectionAction = 'delete_projection' | 'move_to_home';

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: [],
  loading: false,
  selectedCourseFilter: null,

  fetchCourses: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<CourseWithRecentNote[]>('/courses');
      set({ courses: data, loading: false });
    } catch (err) {
      console.error('Failed to fetch courses:', err);
      set({ loading: false });
    }
  },

  createCourse: async (courseData) => {
    const { data } = await api.post('/courses', courseData);
    set({ courses: [...get().courses, data] });
    return data;
  },

  updateCourse: async (id, courseData) => {
    const { data } = await api.put(`/courses/${id}`, courseData);
    set({ courses: get().courses.map((c) => (c.id === id ? { ...c, ...data } : c)) });
    return data;
  },

  deleteCourse: async (id, action) => {
    await api.delete(`/courses/${id}`, {
      data: action ? { source_projection_action: action } : {},
    });
    set({ courses: get().courses.filter((c) => c.id !== id) });
  },

  setSelectedCourseFilter: (id) => set({ selectedCourseFilter: id }),
}));
