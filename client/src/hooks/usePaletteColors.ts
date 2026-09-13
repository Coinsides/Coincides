import { useEffect } from 'react';
import { create } from 'zustand';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { CreatePaletteColorInput, PaletteColor, PaletteColorDeleteResult, UpdatePaletteColorInput } from '@shared/types/palette';
import type { SkinSelection } from '@shared/types/skin';

interface PaletteState {
  owner: string | null | undefined;
  colors: PaletteColor[];
  values: Record<string, string>;
  detached: Record<string, string>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const initial: PaletteState = { owner: undefined, colors: [], values: {}, detached: {}, loading: false, loaded: false, error: null };
export const usePaletteStore = create<PaletteState>(() => initial);
let generation = 0;
let pending: Promise<void> | null = null;
let writes: Promise<unknown> = Promise.resolve();
let pendingWrites = 0;

function setOwner(owner: string | null) {
  if (usePaletteStore.getState().owner === owner) return;
  generation += 1;
  pending = null;
  usePaletteStore.setState({ ...initial, owner });
}

function publish(colors: PaletteColor[], detached = usePaletteStore.getState().detached) {
  const sorted = [...colors].sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  usePaletteStore.setState({ colors: sorted, detached, values: { ...detached, ...Object.fromEntries(sorted.map((color) => [color.id, color.value])) } });
}

async function loadColors(force = false): Promise<void> {
  const state = usePaletteStore.getState();
  if (pending) return pending;
  if (state.loaded && !force) return;
  const ticket = generation;
  usePaletteStore.setState({ loading: true, error: null });
  const request = api.get<PaletteColor[]>('/palette-colors').then(({ data }) => {
    if (ticket !== generation) return;
    publish(data);
    usePaletteStore.setState({ loaded: true });
  }).catch(() => {
    if (ticket === generation) usePaletteStore.setState({ error: '调色板未加载，请重试。' });
  }).finally(() => {
    if (ticket === generation) {
      usePaletteStore.setState({ loading: false });
      pending = null;
    }
  });
  pending = request;
  return request;
}

/** Serialize edits and refreshes so an older GET cannot overwrite a just-saved color. */
function mutate<T>(action: () => Promise<T>): Promise<T> {
  const ticket = generation;
  pendingWrites += 1;
  const result = writes.catch(() => undefined).then(async () => {
    if (ticket !== generation) throw new Error('调色板会话已切换。');
    if (pending) await pending;
    return action();
  }).finally(() => { pendingWrites -= 1; });
  writes = result;
  return result;
}

const createColor = (input: CreatePaletteColorInput) => mutate(async () => {
  const ticket = generation;
  const { data } = await api.post<PaletteColor>('/palette-colors', input);
  if (ticket === generation) publish([...usePaletteStore.getState().colors, data]);
  return data;
});
const updateColor = (id: string, input: UpdatePaletteColorInput) => mutate(async () => {
  const ticket = generation;
  const { data } = await api.patch<PaletteColor>(`/palette-colors/${id}`, input);
  if (ticket === generation) publish(usePaletteStore.getState().colors.map((color) => color.id === id ? data : color));
  return data;
});
const deleteColor = (id: string) => mutate(async () => {
  const ticket = generation;
  const { data } = await api.delete<PaletteColorDeleteResult>(`/palette-colors/${id}`);
  if (ticket === generation) {
    const state = usePaletteStore.getState();
    // Keep the server's exact bytes for consumers still holding the pre-detach selection.
    publish(state.colors.filter((color) => color.id !== id), { ...state.detached, [id]: data.value });
  }
  return data;
});
const refresh = () => mutate(() => loadColors(true));

/** Normalize stale editor drafts before the next save, preserving all unrelated overrides. */
export function detachSkinSelection(selection: SkinSelection | null | undefined, detached: Readonly<Record<string, string>>): SkinSelection | null {
  if (!selection) return null;
  const overrides = Object.fromEntries(Object.entries(selection.overrides ?? {}).map(([key, value]) => [
    key, value.startsWith('palette:') ? detached[value.slice(8)] ?? value : value,
  ]));
  return { ...selection, ...(selection.overrides ? { overrides } : {}) };
}

/** A concurrent palette deletion must finish before a draft can persist its former reference. */
export function saveSkinWithPalette(selection: SkinSelection | null, save: (skin: SkinSelection | null) => Promise<void>): Promise<void> {
  const dispatch = () => save(detachSkinSelection(selection, usePaletteStore.getState().detached));
  // Keep normal skin intents synchronous so their owners can assign identity immediately.
  return pendingWrites ? writes.catch(() => undefined).then(dispatch) : dispatch();
}

export function usePaletteColors() {
  const owner = useAuthStore((state) => state.user?.id ?? null);
  const state = usePaletteStore();
  useEffect(() => { setOwner(owner); void loadColors(); }, [owner]);
  return { ...state, createColor, updateColor, deleteColor, refresh };
}
