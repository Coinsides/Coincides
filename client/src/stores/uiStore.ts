import { create } from 'zustand';
import type { AgentContextHint, AmbientAgentContextHint } from '@shared/types';

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
  agentContextHint: AgentContextHint | null;
  openAgentWithContext: (hint: AgentContextHint) => void;
  ambientAgentContextHint: AmbientAgentContextHint | null;
  ambientAgentContextOwner: symbol | null;
  ambientAgentContextDismissed: boolean;
  setAmbientAgentContextHint: (owner: symbol, hint: AmbientAgentContextHint) => void;
  clearAmbientAgentContextHint: (owner: symbol) => void;
  dismissAgentContextHint: () => void;

  // Shortcuts panel
  shortcutsPanelOpen: boolean;
  toggleShortcutsPanel: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

let toastId = 0;

export function selectAgentContextHint(state: UIState): AgentContextHint | null {
  if (!state.agentPanelOpen) return null;
  return state.agentContextHint ?? (state.ambientAgentContextDismissed ? null : state.ambientAgentContextHint);
}

function sameAmbientView(left: AmbientAgentContextHint | null, right: AmbientAgentContextHint): boolean {
  if (left?.type === 'note_view' && right.type === 'note_view') return left.data.note_id === right.data.note_id;
  if (left?.type === 'board_view' && right.type === 'board_view') return left.data.board_id === right.data.board_id;
  return false;
}

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
  openAgentWithContext: (hint) => set({ agentPanelOpen: true, agentContextHint: hint }),
  ambientAgentContextHint: null,
  ambientAgentContextOwner: null,
  ambientAgentContextDismissed: false,
  setAmbientAgentContextHint: (owner, hint) => set((state) => ({
    ambientAgentContextHint: hint,
    ambientAgentContextOwner: owner,
    ambientAgentContextDismissed: state.ambientAgentContextOwner === owner
      && sameAmbientView(state.ambientAgentContextHint, hint) && state.ambientAgentContextDismissed,
  })),
  clearAmbientAgentContextHint: (owner) => {
    if (get().ambientAgentContextOwner === owner) set({
      ambientAgentContextHint: null, ambientAgentContextOwner: null, ambientAgentContextDismissed: false,
    });
  },
  dismissAgentContextHint: () => {
    if (get().agentContextHint) set({ agentContextHint: null });
    else set({ ambientAgentContextDismissed: true });
  },

  shortcutsPanelOpen: false,
  toggleShortcutsPanel: () => set({ shortcutsPanelOpen: !get().shortcutsPanelOpen }),

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
