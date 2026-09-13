import { useEffect } from 'react';
import { create } from 'zustand';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { SkinSelection, SkinSuite, CreateSkinSuiteInput, UpdateSkinSuiteInput, SkinSuiteDeleteResult } from '@shared/types';
import type { SkinSuiteSnapshot } from '@/styles/skinPresets';
import { detachSkinSelection, saveSkinWithPalette, usePaletteStore } from './usePaletteColors';

interface SkinSuiteState {
  owner: string | null | undefined;
  suites: SkinSuite[];
  values: Record<string, SkinSuiteSnapshot>;
  detached: Record<string, DetachedSkinSuiteSnapshot>;
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const initial: SkinSuiteState = { owner: undefined, suites: [], values: {}, detached: {}, loading: false, loaded: false, error: null };
export const useSkinSuiteStore = create<SkinSuiteState>(() => initial);
let generation = 0;
let pending: Promise<void> | null = null;
let writes: Promise<unknown> = Promise.resolve();
let pendingWrites = 0;
const activeSkinWrites = new Set<Promise<void>>();
export type DetachedSkinSuiteSnapshot = SkinSuiteSnapshot & { palette?: Record<string, string> };

function setOwner(owner: string | null) {
  if (useSkinSuiteStore.getState().owner === owner) return;
  generation += 1;
  pending = null;
  useSkinSuiteStore.setState({ ...initial, owner });
}

function publish(suites: SkinSuite[], detached = useSkinSuiteStore.getState().detached) {
  const existing = useSkinSuiteStore.getState().suites;
  const ids = new Set(suites.map((suite) => suite.id));
  // A refresh can observe a deletion from another tab. Retain the last known
  // snapshot until the consumer's transaction-detached metadata reloads.
  const missing = Object.fromEntries(existing.filter((suite) => !ids.has(suite.id)).map((suite) => [suite.id,
    { tokens: suite.tokens, components: suite.components, materialPreset: suite.materialPreset, palette: { ...usePaletteStore.getState().values } },
  ]));
  const retained = { ...missing, ...detached };
  useSkinSuiteStore.setState({ suites, detached: retained, values: { ...retained, ...Object.fromEntries(suites.map((suite) => [suite.id, suite])) } });
}

async function loadSuites(force = false): Promise<void> {
  if (pending) return pending;
  if (useSkinSuiteStore.getState().loaded && !force) return;
  const ticket = generation;
  useSkinSuiteStore.setState({ loading: true, error: null });
  const request = api.get<SkinSuite[]>('/skin-suites').then(({ data }) => {
    if (ticket !== generation) return;
    publish(data);
    useSkinSuiteStore.setState({ loaded: true });
  }).catch(() => {
    if (ticket === generation) useSkinSuiteStore.setState({ error: '套装未加载，请重试。' });
  }).finally(() => {
    if (ticket === generation) {
      useSkinSuiteStore.setState({ loading: false });
      pending = null;
    }
  });
  pending = request;
  return request;
}

/** Keep list refreshes behind writes; obsolete account responses never publish. */
function mutate<T>(action: () => Promise<T>): Promise<T> {
  const ticket = generation;
  pendingWrites += 1;
  const result = writes.catch(() => undefined).then(async () => {
    if (ticket !== generation) throw new Error('套装会话已切换。');
    if (pending) await pending;
    if (ticket !== generation) throw new Error('套装会话已切换。');
    return action();
  }).finally(() => { pendingWrites -= 1; });
  writes = result;
  return result;
}

const createSuite = (input: CreateSkinSuiteInput) => mutate(async () => {
  const ticket = generation;
  const { data } = await api.post<SkinSuite>('/skin-suites', input);
  if (ticket === generation) publish([...useSkinSuiteStore.getState().suites, data]);
  return data;
});
const updateSuite = (id: string, input: UpdateSkinSuiteInput) => mutate(async () => {
  const ticket = generation;
  const { data } = await api.patch<SkinSuite>(`/skin-suites/${id}`, input);
  if (ticket === generation) publish(useSkinSuiteStore.getState().suites.map((suite) => suite.id === id ? data : suite));
  return data;
});
const deleteSuite = (id: string) => {
  // Capture only earlier skin writes. Later writes wait on this deletion,
  // so including them here would make the two barriers wait for each other.
  const earlierSkinWrites = [...activeSkinWrites];
  return mutate(async () => {
    const ticket = generation;
    await Promise.allSettled(earlierSkinWrites);
    if (ticket !== generation) throw new Error('套装会话已切换。');
    const { data } = await api.delete<SkinSuiteDeleteResult>(`/skin-suites/${id}`);
    if (ticket === generation) {
      const state = useSkinSuiteStore.getState();
      publish(state.suites.filter((suite) => suite.id !== id), { ...state.detached, [id]: {
        tokens: data.tokens, components: data.components, materialPreset: data.materialPreset, palette: { ...data.palette },
      } });
    }
    return data;
  });
};
const refresh = () => mutate(() => loadSuites(true));

/** Mirror the delete transaction for already-mounted readers and old editor drafts. */
export function detachSuiteSelection(selection: SkinSelection | null | undefined, detached: Readonly<Record<string, DetachedSkinSuiteSnapshot>>, palette: Readonly<Record<string, string>> = {}): SkinSelection | null {
  if (!selection) return null;
  const suite = selection.preset.startsWith('suite:') ? detached[selection.preset.slice(6)] : undefined;
  if (!suite) return selection;
  const frozenPalette = { ...palette, ...suite.palette };
  const overrides = Object.fromEntries(Object.entries({ ...suite.tokens, ...selection.overrides }).map(([key, value]) => [key,
    value.startsWith('palette:') ? frozenPalette[value.slice(8)] ?? suite.tokens[key as keyof typeof suite.tokens] : value,
  ]));
  return { preset: 'default', materialPreset: selection.materialPreset ?? suite.materialPreset ?? 'default', overrides, components: { ...suite.components, ...selection.components } };
}

export function normalizeSkinSelection(selection: SkinSelection | null | undefined): SkinSelection | null {
  const palette = usePaletteStore.getState().detached;
  return detachSkinSelection(detachSuiteSelection(selection, useSkinSuiteStore.getState().detached, palette), palette);
}

/** An in-flight delete must complete before any old draft can re-introduce its reference. */
export function saveSkinWithSuites(selection: SkinSelection | null, save: (skin: SkinSelection | null) => Promise<void>): Promise<void> {
  const dispatch = () => saveSkinWithPalette(normalizeSkinSelection(selection), save);
  const result = pendingWrites ? writes.catch(() => undefined).then(dispatch) : dispatch();
  activeSkinWrites.add(result);
  void result.then(() => activeSkinWrites.delete(result), () => activeSkinWrites.delete(result));
  return result;
}

export function useSkinSuites() {
  const owner = useAuthStore((state) => state.user?.id ?? null);
  const state = useSkinSuiteStore();
  useEffect(() => { setOwner(owner); void loadSuites(); }, [owner]);
  return { ...state, createSuite, updateSuite, deleteSuite, refresh };
}
