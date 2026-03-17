import { create } from 'zustand';
import api from '@/services/api';
import type { Document } from '@shared/types';

interface DocumentState {
  documents: Document[];
  loading: boolean;
  uploading: boolean;
  fetchDocuments: (courseId: string) => Promise<void>;
  uploadDocument: (courseId: string, file: File) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  pollStatus: (id: string) => Promise<void>;
  getDocumentDetail: (id: string) => Promise<Document>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  loading: false,
  uploading: false,

  fetchDocuments: async (courseId) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/documents?course_id=${courseId}`);
      set({ documents: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  uploadDocument: async (courseId, file) => {
    set({ uploading: true });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('course_id', courseId);

      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      set({ documents: [data, ...get().documents], uploading: false });
      return data;
    } catch (err) {
      set({ uploading: false });
      throw err;
    }
  },

  deleteDocument: async (id) => {
    await api.delete(`/documents/${id}`);
    set({ documents: get().documents.filter((d) => d.id !== id) });
  },

  pollStatus: async (id) => {
    try {
      const { data } = await api.get(`/documents/${id}/status`);
      set({
        documents: get().documents.map((d) =>
          d.id === id
            ? {
                ...d,
                parse_status: data.parse_status,
                parse_channel: data.parse_channel,
                page_count: data.page_count,
                chunk_count: data.chunk_count,
                error_message: data.error_message,
              }
            : d
        ),
      });
    } catch {
      // Ignore poll errors
    }
  },

  getDocumentDetail: async (id) => {
    const { data } = await api.get(`/documents/${id}`);
    // Update the document in our local state with full details
    set({
      documents: get().documents.map((d) => (d.id === id ? data : d)),
    });
    return data;
  },
}));
