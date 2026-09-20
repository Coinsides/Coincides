import { describe, expect, it } from 'vitest';
import { readSkin, resolveSkin, SILK_LIGHT_TOKENS, SKIN_LABELS, SKIN_PRESETS, SKIN_PRESET_COMPONENTS } from './skinPresets';

describe('user suite resolution', () => {
  const id = '14000000-0000-4000-8000-000000000021';
  const selected = { preset: `suite:${id}` as const, overrides: { ink: '#aBcDeF80' }, components: { headerRule: 'hidden' as const } };
  const suite = { tokens: SKIN_PRESETS['warm-paper'], components: SKIN_PRESET_COMPONENTS['warm-paper'], materialPreset: 'warm-paper' as const };
  it('accepts UUID suite references and resolves the complete suite under local deviations', () => {
    expect(readSkin(selected)).toEqual(selected);
    expect(readSkin({ preset: 'suite:invalid' })).toBeNull();
    expect(resolveSkin({ preset: 'workbench' }, null, selected, {}, { [id]: suite })).toEqual({
      preset: selected.preset, materialPreset: 'warm-paper', tokens: { ...suite.tokens, ink: '#aBcDeF80' }, components: { ...suite.components, headerRule: 'hidden' },
    });
  });
  it('renders a transaction-detached full snapshot without any loaded suite list', () => {
    const detached = { preset: 'default' as const, materialPreset: suite.materialPreset, overrides: suite.tokens, components: suite.components };
    expect(resolveSkin(detached).tokens).toEqual(suite.tokens);
    expect(resolveSkin(detached).components).toEqual(suite.components);
    expect(resolveSkin(detached).materialPreset).toBe('warm-paper');
  });
  it('材质接受五出厂枚举', () => {
    for (const materialPreset of ['default', 'quiet-ink', 'warm-paper', 'workbench', 'silk'] as const) {
      const skin = { preset: 'default' as const, materialPreset };
      expect(readSkin(skin)).toEqual(skin);
      expect(resolveSkin(skin).materialPreset).toBe(materialPreset);
    }
    expect(readSkin({ preset: 'default', materialPreset: 'fabric' })).toEqual({ preset: 'default' });
  });
  it('选区材质覆盖套装且不漏入下一挂点', () => {
    const own = { ...selected, materialPreset: 'workbench' as const };
    const suites = { [id]: suite };
    expect(resolveSkin(own, null, null, {}, suites).materialPreset).toBe('workbench');
    expect(resolveSkin(own, { preset: 'quiet-ink' }, null, {}, suites).materialPreset).toBe('quiet-ink');
    expect(resolveSkin(own, selected, null, {}, suites).materialPreset).toBe('warm-paper');
  });
  it('旧套装无谱系沿用原默认材质', () => {
    expect(resolveSkin(selected, null, null, {}, { [id]: { tokens: suite.tokens, components: suite.components } }).materialPreset).toBe('default');
    expect(resolveSkin(selected).materialPreset).toBe('default');
  });
});

describe('B3 silk factory palette', () => {
  it('exposes 绢本 as the fifth factory with the declared light and dark paper tokens', () => {
    expect(Object.keys(SKIN_PRESETS)).toEqual(['default', 'quiet-ink', 'warm-paper', 'workbench', 'silk']);
    expect(SKIN_LABELS.silk).toBe('绢本');
    expect(resolveSkin({ preset: 'silk' }, null, null, {}, {}, 'light').tokens).toEqual(SILK_LIGHT_TOKENS);
    expect(SILK_LIGHT_TOKENS).toMatchObject({ desk: '#e7dfcf', paper: '#faf5e9', ink: '#2d2418', 'ink-muted': '#6a5c46', accent: '#5f8f81', annotation: '#9a7016', hairline: '#d8cbae', danger: '#a63b2a', wall: '#d8cbae' });
    expect(resolveSkin({ preset: 'silk' }, null, null, {}, {}, 'dark').tokens).toEqual(SKIN_PRESETS.silk);
    expect(SKIN_PRESETS.silk).toMatchObject({ desk: '#17130e', paper: '#f2ead7', ink: '#2d2418', 'ink-muted': '#6a5c46', accent: '#5f8f81', annotation: '#9a7016', hairline: '#d2c4a2', danger: '#a63b2a', wall: '#d2c4a2' });
    expect(resolveSkin({ preset: 'silk' }).components).toMatchObject({ titleFont: 'serif', headerRule: 'visible', headerRuleLength: 'content', headerRuleStyle: 'solid' });
  });

  it.each(['default', 'quiet-ink', 'warm-paper', 'workbench'] as const)('%s keeps its full incumbent snapshot in both themes', (preset) => {
    expect(resolveSkin({ preset }, null, null, {}, {}, 'light')).toEqual(resolveSkin({ preset }, null, null, {}, {}, 'dark'));
    expect(resolveSkin({ preset }, null, null, {}, {}, 'light').tokens).toEqual(SKIN_PRESETS[preset]);
  });

  it('theme switching preserves local colors and live palette references at the three existing mounts', () => {
    const id = '14000000-0000-4000-8000-000000000061';
    const selection = { preset: 'silk' as const, overrides: { accent: `palette:${id}`, paper: '#faf5e9' } };
    const stored = JSON.stringify(selection);
    for (const theme of ['light', 'dark'] as const) {
      for (const [global, project, local] of [[selection, null, null], [null, selection, null], [null, null, selection]]) {
        const resolved = resolveSkin(global, project, local, { [id]: '#668877' }, {}, theme);
        expect(resolved.tokens.accent).toBe('#668877');
        expect(resolved.tokens.paper).toBe('#faf5e9');
        expect(resolved.tokens.desk).toBe(theme === 'light' ? '#e7dfcf' : '#17130e');
      }
    }
    expect(JSON.stringify(selection)).toBe(stored);
    expect(readSkin(JSON.parse(stored))).toEqual(selection);
  });

  it('a saved silk suite remains a complete literal snapshot when the app theme changes', () => {
    const id = '14000000-0000-4000-8000-000000000062';
    const suite = { tokens: SILK_LIGHT_TOKENS, components: SKIN_PRESET_COMPONENTS.silk, materialPreset: 'silk' as const };
    const selection = { preset: `suite:${id}` as const };
    for (const theme of ['light', 'dark'] as const) {
      expect(resolveSkin(selection, null, null, {}, { [id]: suite }, theme)).toMatchObject(suite);
    }
  });
});

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
    expect(resolveSkin()).toEqual({ preset: 'default', materialPreset: 'default', tokens: SKIN_PRESETS.default, components: SKIN_PRESET_COMPONENTS.default });
    expect(resolveSkin(null, null, null)).toEqual(resolveSkin());
  });

  it('paper wins over project and global; clearing each mounting point returns to its parent', () => {
    const global = { preset: 'quiet-ink' as const, overrides: { accent: '#123456' } };
    const project = { preset: 'workbench' as const, overrides: { paper: '#263340' } };
    const paper = { preset: 'warm-paper' as const, overrides: { 'ink-muted': '#876543' } };
    expect(resolveSkin(global, project, paper)).toEqual({ preset: 'warm-paper', materialPreset: 'warm-paper', components: SKIN_PRESET_COMPONENTS['warm-paper'], tokens: {
      ...SKIN_PRESETS['warm-paper'], 'ink-muted': '#876543',
    } });
    expect(resolveSkin(global, project, null)).toEqual({ preset: 'workbench', materialPreset: 'workbench', components: SKIN_PRESET_COMPONENTS.workbench, tokens: {
      ...SKIN_PRESETS.workbench, paper: '#263340',
    } });
    expect(resolveSkin(global, null, undefined)).toEqual({ preset: 'quiet-ink', materialPreset: 'quiet-ink', components: SKIN_PRESET_COMPONENTS['quiet-ink'], tokens: {
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
