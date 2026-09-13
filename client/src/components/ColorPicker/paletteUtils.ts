import type { PaletteColor } from '@shared/types/palette';

export const RECENT_COLORS_KEY = 'coincides:recent-colors:v1';
export const MAX_RECENT_COLORS = 12;
export const isHexColor = (value: string) => /^#[\da-f]{6}([\da-f]{2})?$/i.test(value);

export function splitPaletteName(name: string): { group: string; label: string } {
  const slash = name.indexOf('/');
  return slash > 0 ? { group: name.slice(0, slash), label: name.slice(slash + 1) } : { group: '', label: name };
}

export function groupPaletteColors(colors: readonly PaletteColor[]) {
  const groups = new Map<string, PaletteColor[]>();
  for (const color of [...colors].sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))) {
    const { group } = splitPaletteName(color.name);
    const existing = groups.get(group);
    if (existing) existing.push(color); else groups.set(group, [color]);
  }
  return [...groups].map(([name, entries]) => ({ name, colors: entries }));
}

export function readRecentColors(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENT_COLORS_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((color): color is string => typeof color === 'string' && isHexColor(color)).map((color) => color.toUpperCase()))].slice(0, MAX_RECENT_COLORS);
  } catch { return []; }
}

export function rememberColor(value: string): string[] {
  const colors = [value.toUpperCase(), ...readRecentColors().filter((color) => color !== value.toUpperCase())].slice(0, MAX_RECENT_COLORS);
  try { localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(colors)); } catch { /* Picking remains available if browser storage is full or disabled. */ }
  return colors;
}

export function nameInGroup(name: string, group: string): string {
  const { label } = splitPaletteName(name);
  return group ? `${group}/${label}` : label;
}

/** Re-space only mutable neighbors when integer midpoints run out; factory positions never change. */
export function planPaletteMove(color: PaletteColor, entries: readonly PaletteColor[], group: string, beforeId?: string): Array<{ id: string; name?: string; sort: number }> {
  const others = entries.filter((entry) => entry.id !== color.id);
  const found = beforeId ? others.findIndex((entry) => entry.id === beforeId) : others.length;
  const index = found < 0 ? others.length : found;
  const previous = others[index - 1];
  const next = others[index];
  const lower = previous?.sort ?? -1;
  const upper = next?.sort ?? lower + 2000;
  const sort = Math.floor((lower + upper) / 2);
  const moved = { id: color.id, name: nameInGroup(color.name, group), sort };
  if (sort > lower && sort < upper && sort >= 0 && Number.isSafeInteger(sort)) return [moved];

  let start = index;
  let end = index;
  while (start > 0 && others[start - 1].origin === 'user') start -= 1;
  while (end < others.length && others[end].origin === 'user') end += 1;
  const run = others.slice(start, end);
  run.splice(index - start, 0, color);
  const low = others[start - 1]?.sort ?? -1;
  const high = others[end]?.sort ?? low + (run.length + 1) * 1000;
  const step = Math.floor((high - low) / (run.length + 1));
  if (step < 1 || !Number.isSafeInteger(high)) throw new Error('组内排序位置已满，可将颜色移到组尾。');
  const shifted = run.map((entry, offset) => ({ entry, sort: low + (offset + 1) * step })).filter(({ entry, sort: target }) => entry.id !== color.id && entry.sort !== target);
  // Move neighbors outward first, so even a failed request leaves their relative order intact.
  const right = shifted.filter(({ entry, sort: target }) => target > entry.sort).sort((a, b) => b.entry.sort - a.entry.sort);
  const left = shifted.filter(({ entry, sort: target }) => target < entry.sort).sort((a, b) => a.entry.sort - b.entry.sort);
  return [...right, ...left].map(({ entry, sort: target }) => ({ id: entry.id, sort: target })).concat({ ...moved, sort: low + (index - start + 1) * step });
}
