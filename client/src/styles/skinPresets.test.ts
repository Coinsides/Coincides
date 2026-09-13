import { describe, expect, it } from 'vitest';
import { readSkin, resolveSkin, SKIN_PRESETS, SKIN_PRESET_COMPONENTS } from './skinPresets';

describe('live palette overrides', () => {
  const id = '14000000-0000-4000-8000-000000000001';
  const selected = { preset: 'warm-paper' as const, overrides: { paper: `palette:${id}`, ink: '#AbCdEf80' } };
  it('preserves the reference in storage and resolves the current pool value without changing absolute colors', () => {
    expect(readSkin(selected)).toEqual(selected);
    expect(resolveSkin(selected, null, null, { [id]: '#E8B04B' }).tokens.paper).toBe('#E8B04B');
    const changed = resolveSkin(selected, null, null, { [id]: '#C97B8E80' });
    expect(changed.tokens.paper).toBe('#C97B8E80');
    expect(changed.tokens.ink).toBe('#AbCdEf80');
    expect(selected.overrides.paper).toBe(`palette:${id}`);
  });
  it('keeps missing references out of CSS and respects the existing snapshot inheritance', () => {
    expect(resolveSkin(selected).tokens.paper).toBe(SKIN_PRESETS['warm-paper'].paper);
    expect(resolveSkin(selected, { preset: 'quiet-ink' }, null, { [id]: '#E8B04B' }).tokens.paper).toBe(SKIN_PRESETS['quiet-ink'].paper);
  });
});

describe('B1a factory paper snapshots', () => {
  it.each([
    ['default', { desk: '#0f0f10', paper: '#101114', ink: '#f5f5f5', 'ink-muted': '#b7b8bd', accent: '#2563eb', annotation: '#facc15', hairline: '#2c2d31', danger: '#ef4444', wall: '#777a8270' }],
    ['quiet-ink', { desk: '#101114', paper: '#17181C', ink: '#E7E8EB', 'ink-muted': '#8B909A', accent: '#7FA3D7', annotation: '#B89B4C', hairline: '#FFFFFF12', danger: '#C4766B', wall: '#FFFFFF14' }],
    ['warm-paper', { desk: '#1D1A17', paper: '#F7F3EA', ink: '#2B2620', 'ink-muted': '#837A6C', accent: '#33604F', annotation: '#B8912E', hairline: '#E6DECE', danger: '#A04A38', wall: '#D8CFBC' }],
    ['workbench', { desk: '#12151A', paper: '#1A1E25', ink: '#DEE3EA', 'ink-muted': '#7E8794', accent: '#E5A33C', annotation: '#E5A33C', hairline: '#2E3642', danger: '#D46A5A', wall: '#33507A' }],
  ] as const)('%s keeps its nine agreed literal colors', (preset, expected) => {
    expect(resolveSkin({ preset })).toMatchObject({ preset, tokens: expected });
    expect(SKIN_PRESETS[preset]).toMatchObject(expected);
  });

  it('rollout absence and cleared global selection both use the incumbent default snapshot', () => {
    expect(resolveSkin()).toEqual({ preset: 'default', tokens: SKIN_PRESETS.default, components: SKIN_PRESET_COMPONENTS.default });
    expect(resolveSkin(null, null, null)).toEqual(resolveSkin());
  });

  it('paper wins over project and global; clearing each mounting point returns to its parent', () => {
    const global = { preset: 'quiet-ink' as const, overrides: { accent: '#123456' } };
    const project = { preset: 'workbench' as const, overrides: { paper: '#263340' } };
    const paper = { preset: 'warm-paper' as const, overrides: { 'ink-muted': '#876543' } };
    expect(resolveSkin(global, project, paper)).toEqual({ preset: 'warm-paper', components: SKIN_PRESET_COMPONENTS['warm-paper'], tokens: {
      ...SKIN_PRESETS['warm-paper'], 'ink-muted': '#876543',
    } });
    expect(resolveSkin(global, project, null)).toEqual({ preset: 'workbench', components: SKIN_PRESET_COMPONENTS.workbench, tokens: {
      ...SKIN_PRESETS.workbench, paper: '#263340',
    } });
    expect(resolveSkin(global, null, undefined)).toEqual({ preset: 'quiet-ink', components: SKIN_PRESET_COMPONENTS['quiet-ink'], tokens: {
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

describe('B1b board snapshots and component defaults', () => {
  it.each([
    ['default', ['#0b0b0c', '#151516', '#b7b8bd', '#f5f5f5']],
    ['quiet-ink', ['#0E0F12', '#17181C', '#8B909A', '#E7E8EB']],
    ['warm-paper', ['#211D19', '#F7F3EA', '#837A6C', '#F2EDE1']],
    ['workbench', ['#12151A', '#1A1E25', '#E5A33C', '#DEE3EA']],
  ] as const)('%s carries its four board colors', (preset, expected) => {
    const { tokens } = resolveSkin({ preset });
    expect([tokens['board-desk'], tokens.card, tokens.edge, tokens.chalk]).toEqual(expected);
  });

  it('presets carry component defaults and local selection/clear uses the same three mount merge', () => {
    const global = { preset: 'warm-paper' as const };
    const project = { preset: 'workbench' as const };
    const board = { preset: 'quiet-ink' as const, overrides: { card: '#334455' }, components: { titleFont: 'serif' as const } };
    expect(resolveSkin(global).components.titleFont).toBe('serif');
    expect(resolveSkin(global, project).components).toEqual({ titleFont: 'sans', labelFont: 'mono', menuDensity: 'compact', handleStyle: 'rivet', headerRule: 'visible' });
    expect(resolveSkin(global, project, board)).toMatchObject({ tokens: { card: '#334455' }, components: { titleFont: 'serif', labelFont: 'system', menuDensity: 'comfortable', handleStyle: 'capsule', headerRule: 'visible' } });
    expect(resolveSkin(global, project, null)).toEqual(resolveSkin(project));
    expect(resolveSkin(global, null, null)).toEqual(resolveSkin(global));
    const parsed = readSkin(board)!;
    parsed.components!.titleFont = 'sans';
    expect(board.components.titleFont).toBe('serif');
  });
});

describe('B1e header rule selection', () => {
  it.each(['default', 'quiet-ink', 'warm-paper', 'workbench'] as const)('%s supplies all five defaults, while header rule overrides inherit and clear', (preset) => {
    const selected = { preset, components: { headerRule: 'hidden' as const } };
    expect(Object.keys(resolveSkin({ preset }).components).sort()).toEqual(['handleStyle', 'headerRule', 'labelFont', 'menuDensity', 'titleFont']);
    expect(resolveSkin({ preset }).components.headerRule).toBe('visible');
    expect(readSkin(selected)).toEqual(selected);
    expect(resolveSkin(selected, null, null).components.headerRule).toBe('hidden');
    expect(resolveSkin(selected, null, { preset }).components.headerRule).toBe('visible');
    expect(resolveSkin(selected, null, { preset, components: {} }).components.headerRule).toBe('visible');
  });
});
