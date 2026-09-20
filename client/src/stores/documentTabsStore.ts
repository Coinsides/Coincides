import { create } from 'zustand';
import type { PageReadingViewState } from '@/pages/Notes/canvasEngine/pageReadingViewportService';
import type { BoardViewport } from '@/pages/Boards/boardTypes';

export type DocumentKind = 'note' | 'board';
export interface DocumentTab {
  key: string;
  kind: DocumentKind;
  id: string;
  title: string;
  projectId?: string | null;
  scroll?: { top: number; left: number };
  reading?: PageReadingViewState;
  boardViewport?: BoardViewport;
}
export const documentKey = (kind: DocumentKind, id: string) => `${kind}:${id}`;
export const documentPath = (tab: Pick<DocumentTab, 'kind' | 'id'>) =>
  `/${tab.kind === 'note' ? 'notes' : 'boards'}/${encodeURIComponent(tab.id)}`;

interface DocumentTabsState {
  tabs: DocumentTab[];
  open: (tab: Omit<DocumentTab, 'key'>) => void;
  remember: (key: string, view: Partial<Pick<DocumentTab, 'scroll' | 'reading' | 'boardViewport'>>) => void;
  close: (key: string) => void;
  reorder: (key: string, before: string) => void;
  reset: () => void;
}

// Deliberately no persistence middleware: a refresh reconstructs only the URL's document.
export const useDocumentTabsStore = create<DocumentTabsState>((set) => ({
  tabs: [],
  open: (tab) => set((state) => {
    const key = documentKey(tab.kind, tab.id);
    const previous = state.tabs.find((entry) => entry.key === key);
    if (previous?.title === tab.title && previous.projectId === tab.projectId) return state;
    return { tabs: previous ? state.tabs.map((entry) => entry.key === key ? { ...entry, ...tab } : entry)
      : [...state.tabs, { ...tab, key }] };
  }),
  remember: (key, view) => set((state) => ({ tabs: state.tabs.map((entry) => entry.key === key ? { ...entry, ...view } : entry) })),
  close: (key) => set((state) => ({ tabs: state.tabs.filter((tab) => tab.key !== key) })),
  reorder: (key, before) => set((state) => {
    const tabs = [...state.tabs];
    const from = tabs.findIndex((tab) => tab.key === key);
    const to = tabs.findIndex((tab) => tab.key === before);
    if (from < 0 || to < 0 || from === to) return state;
    tabs.splice(to, 0, tabs.splice(from, 1)[0]);
    return { tabs };
  }),
  reset: () => set({ tabs: [] }),
}));
