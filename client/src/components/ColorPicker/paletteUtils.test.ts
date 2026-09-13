import { beforeEach, describe, expect, it } from 'vitest';
import type { PaletteColor } from '@shared/types/palette';
import { groupPaletteColors, isHexColor, MAX_RECENT_COLORS, nameInGroup, planPaletteMove, readRecentColors, RECENT_COLORS_KEY, rememberColor, splitPaletteName } from './paletteUtils';

const color = (id: string, name: string, sort: number): PaletteColor => ({ id, name, sort, value: '#123456', user_id: 'user', origin: 'user', created_at: '2026-09-13' });

describe('palette naming and recent literal colors', () => {
  beforeEach(() => localStorage.clear());

  it('derives groups from the first slash while keeping the rest of the name intact', () => {
    expect(splitPaletteName('暖调/杏黄')).toEqual({ group: '暖调', label: '杏黄' });
    expect(splitPaletteName('我的/深色/蓝')).toEqual({ group: '我的', label: '深色/蓝' });
    expect(splitPaletteName('海蓝')).toEqual({ group: '', label: '海蓝' });
    const grouped = groupPaletteColors([color('b', '冷调/湖蓝', 20), color('c', '海蓝', 30), color('a', '暖调/杏黄', 10), color('d', '暖调/奶油', 11)]);
    expect(grouped.map((group) => [group.name, group.colors.map((entry) => entry.id)])).toEqual([['暖调', ['a', 'd']], ['冷调', ['b']], ['', ['c']]]);
    expect(nameInGroup('我的/深色/蓝', '冷调')).toBe('冷调/深色/蓝');
    expect(nameInGroup('暖调/杏黄', '')).toBe('杏黄');
  });

  it('stores at most twelve deduplicated literal values, newest first, preserving alpha', () => {
    for (let index = 0; index < 15; index += 1) rememberColor(`#${index.toString(16).padStart(6, '0')}`);
    expect(readRecentColors()).toHaveLength(MAX_RECENT_COLORS);
    expect(readRecentColors()[0]).toBe('#00000E');
    rememberColor('#00000a');
    expect(readRecentColors()[0]).toBe('#00000A');
    expect(readRecentColors().filter((entry) => entry === '#00000A')).toHaveLength(1);
    rememberColor('#1234567a');
    expect(JSON.parse(localStorage.getItem(RECENT_COLORS_KEY)!)[0]).toBe('#1234567A');
  });

  it('recovers from malformed browser storage and rejects references or invalid hex', () => {
    localStorage.setItem(RECENT_COLORS_KEY, '{');
    expect(readRecentColors()).toEqual([]);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(['palette:a', '#abc', '#abcdef', '#ABCDEF', null, 123, '#123456ff']));
    expect(readRecentColors()).toEqual(['#ABCDEF', '#123456FF']);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('#123456FF')).toBe(true);
  });

  it('re-spaces dense user positions without patching factory colors and moves the target last', () => {
    const locked: PaletteColor = { ...color('factory', '暖调/出厂', 1000), origin: 'factory' };
    const first = color('first', '暖调/一', 1001);
    const second = color('second', '暖调/二', 1002);
    const moved = color('moved', '冷调/三', 4000);
    const changes = planPaletteMove(moved, [locked, first, second], '暖调', second.id);
    expect(changes.some((entry) => entry.id === locked.id)).toBe(false);
    expect(changes[changes.length - 1]).toEqual({ id: moved.id, name: '暖调/三', sort: 3000 });
    expect(changes.slice(0, -1)).toEqual([{ id: second.id, sort: 4000 }, { id: first.id, sort: 2000 }]);
    const resulting = [locked, first, second, moved].map((entry) => ({ ...entry, ...changes.find((change) => change.id === entry.id) })).sort((a, b) => a.sort - b.sort);
    expect(resulting.map((entry) => entry.id)).toEqual(['factory', 'first', 'moved', 'second']);
  });
});
