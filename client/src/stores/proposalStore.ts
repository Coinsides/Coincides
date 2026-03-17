import { create } from 'zustand';
import api from '@/services/api';

export interface ProposalData {
  title: string;
  description: string;
  items: Array<Record<string, unknown>>;
}

export interface ProposalItem {
  id: string;
  type: string;
  status: string;
  data: ProposalData;
  created_at: string;
  resolved_at: string | null;
}

interface ProposalState {
  proposals: ProposalItem[];
  loading: boolean;

  fetchProposals: () => Promise<void>;
  applyProposal: (id: string) => Promise<void>;
  discardProposal: (id: string) => Promise<void>;
  updateProposal: (id: string, data: ProposalData) => Promise<void>;
}

export const useProposalStore = create<ProposalState>((set, get) => ({
  proposals: [],
  loading: false,

  fetchProposals: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/proposals', { params: { status: 'pending' } });
      set({ proposals: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  applyProposal: async (id) => {
    await api.post(`/proposals/${id}/apply`);
    set({ proposals: get().proposals.filter((p) => p.id !== id) });
  },

  discardProposal: async (id) => {
    await api.post(`/proposals/${id}/discard`);
    set({ proposals: get().proposals.filter((p) => p.id !== id) });
  },

  updateProposal: async (id, data) => {
    await api.put(`/proposals/${id}`, { data });
    set({
      proposals: get().proposals.map((p) => (p.id === id ? { ...p, data } : p)),
    });
  },
}));
