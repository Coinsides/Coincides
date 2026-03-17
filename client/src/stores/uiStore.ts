import { create } from 'zustand';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Modal state
  modal: { type: string; data?: any } | null;
  openModal: (type: string, data?: any) => void;
  closeModal: () => void;

  // Agent panel
  agentPanelOpen: boolean;
  toggleAgentPanel: () => void;
  setAgentPanelOpen: (open: boolean) => void;
  agentContextHint: { type: string; data?: unknown } | null;
  openAgentWithContext: (type: string, data?: unknown) => void;

  // Toasts
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  modal: null,
  openModal: (type, data) => set({ modal: { type, data } }),
  closeModal: () => set({ modal: null }),

  agentPanelOpen: false,
  toggleAgentPanel: () => set({ agentPanelOpen: !get().agentPanelOpen, agentContextHint: null }),
  setAgentPanelOpen: (open) => set({ agentPanelOpen: open, ...(!open ? { agentContextHint: null } : {}) }),
  agentContextHint: null,
  openAgentWithContext: (type, data) => set({ agentPanelOpen: true, agentContextHint: { type, data } }),

  toasts: [],
  addToast: (type, message) => {
    const id = String(++toastId);
    set({ toasts: [...get().toasts, { id, type, message }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 3000);
  },
  removeToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
