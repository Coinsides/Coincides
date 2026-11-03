import { useEffect, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'coincides.recentProjects.v1';
const CAPACITY = 5;
const NO_IDS: string[] = [];

interface RecentProjectEntry {
  id: string;
  opened_at: string;
}

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedIds = NO_IDS;

// Storage can throw on any access, so every failure reads as "no record".
function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parseEntries(raw: string | null): RecentProjectEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry) => typeof entry?.id === 'string' && typeof entry?.opened_at === 'string')
      : [];
  } catch {
    return [];
  }
}

function snapshot(): string[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parseEntries(raw).map((entry) => entry.id);
  }
  return cachedIds;
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function recordRecentProject(projectId: string, now = new Date()): void {
  try {
    const entries = parseEntries(readRaw()).filter((entry) => entry.id !== projectId);
    const next = [{ id: projectId, opened_at: now.toISOString() }, ...entries].slice(0, CAPACITY);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return;
  }
  notify();
}

// Waits for the route's own project to load, so a dead link never takes a place,
// and neither does the previous project's data while the next one is on its way.
export function useRecordLoadedProject(routeId: string | undefined, loadedId: string | undefined): void {
  useEffect(() => {
    if (routeId && loadedId === routeId) recordRecentProject(routeId);
  }, [routeId, loadedId]);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab opening a project reaches this one through the storage event.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function useRecentProjectIds(): string[] {
  return useSyncExternalStore(subscribe, snapshot);
}
