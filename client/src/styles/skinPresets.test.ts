import { describe, expect, it } from 'vitest';
import { readSkin, resolveSkin, SKIN_PRESETS } from './skinPresets';

describe('B1a factory paper snapshots', () => {
  it.each([
    ['default', { desk: '#0f0f10', paper: '#101114', ink: '#f5f5f5', 'ink-muted': '#b7b8bd', accent: '#2563eb', annotation: '#facc15', hairline: '#2c2d31', danger: '#ef4444', wall: '#777a8270' }],
    ['quiet-ink', { desk: '#101114', paper: '#17181C', ink: '#E7E8EB', 'ink-muted': '#8B909A', accent: '#7FA3D7', annotation: '#B89B4C', hairline: '#FFFFFF12', danger: '#C4766B', wall: '#FFFFFF14' }],
    ['warm-paper', { desk: '#1D1A17', paper: '#F7F3EA', ink: '#2B2620', 'ink-muted': '#837A6C', accent: '#33604F', annotation: '#B8912E', hairline: '#E6DECE', danger: '#A04A38', wall: '#D8CFBC' }],
    ['workbench', { desk: '#12151A', paper: '#1A1E25', ink: '#DEE3EA', 'ink-muted': '#7E8794', accent: '#E5A33C', annotation: '#E5A33C', hairline: '#2E3642', danger: '#D46A5A', wall: '#33507A' }],
  ] as const)('%s keeps its nine agreed literal colors', (preset, expected) => {
    expect(resolveSkin({ preset })).toEqual({ preset, tokens: expected });
    expect(SKIN_PRESETS[preset]).toEqual(expected);
  });

  it('rollout absence and cleared global selection both use the incumbent default snapshot', () => {
    expect(resolveSkin()).toEqual({ preset: 'default', tokens: SKIN_PRESETS.default });
    expect(resolveSkin(null, null, null)).toEqual(resolveSkin());
  });

  it('paper wins over project and global; clearing each mounting point returns to its parent', () => {
    const global = { preset: 'quiet-ink' as const, overrides: { accent: '#123456' } };
    const project = { preset: 'workbench' as const, overrides: { paper: '#263340' } };
    const paper = { preset: 'warm-paper' as const, overrides: { 'ink-muted': '#876543' } };
    expect(resolveSkin(global, project, paper)).toEqual({ preset: 'warm-paper', tokens: {
      ...SKIN_PRESETS['warm-paper'], 'ink-muted': '#876543',
    } });
    expect(resolveSkin(global, project, null)).toEqual({ preset: 'workbench', tokens: {
      ...SKIN_PRESETS.workbench, paper: '#263340',
    } });
    expect(resolveSkin(global, null, undefined)).toEqual({ preset: 'quiet-ink', tokens: {
      ...SKIN_PRESETS['quiet-ink'], accent: '#123456',
    } });
  });

  it('a named snapshot resets inherited custom colors even when its overrides are sparse or empty', () => {
    const global = { preset: 'warm-paper' as const, overrides: { accent: '#112233', desk: '#445566' } };
    expect(resolveSkin(global, { preset: 'warm-paper', overrides: { ink: '#776655' } }).tokens).toEqual({
      ...SKIN_PRESETS['warm-paper'], ink: '#776655',
    });
    expect(resolveSkin(global, null, { preset: 'quiet-ink', overrides: {} }).tokens).toEqual(SKIN_PRESETS['quiet-ink']);
  });

  it('reading persisted overrides and editing resolved colors do not mutate a saved selection or factory', () => {
    const saved = { preset: 'quiet-ink' as const, overrides: { wall: '#FFFFFF14', accent: '#334455' } };
    const original = structuredClone(saved);
    const parsed = readSkin(saved)!;
    parsed.overrides!.accent = '#667788';
    const first = resolveSkin(saved);
    first.tokens.paper = '#FFFFFF';
    first.tokens.accent = '#000000';
    expect(saved).toEqual(original);
    expect(resolveSkin(saved).tokens.paper).toBe('#17181C');
    expect(resolveSkin(saved).tokens.accent).toBe('#334455');
    expect(SKIN_PRESETS['quiet-ink'].paper).toBe('#17181C');
    expect(SKIN_PRESETS['quiet-ink'].accent).toBe('#7FA3D7');
  });
});
