import { describe, expect, it } from 'vitest';
import type { SkinTokens } from '@shared/types/skin';
import { SKIN_PRESETS } from '@/styles/skinPresets';
import { buildPaperMaterialStyles, buildPaperSkinStyles, PAPER_DERIVED_COLORS } from './paperSkinStyles';

const stylesFor = (tokens: SkinTokens) => buildPaperSkinStyles(tokens) as Record<string, string>;

describe('paper skin painting', () => {
  it('retains every incumbent shade and the undefined legacy transparent aliases in the default', () => {
    const styles = stylesFor(SKIN_PRESETS.default);
    for (const [name, color] of Object.entries(PAPER_DERIVED_COLORS)) {
      expect(styles[`--paper-${name}`]).toBe(color.baseline);
    }
    expect(styles['--text-muted']).toBe('#777a82');
    expect(styles['--bg-primary']).toBe('#0f0f10');
    expect(styles['--bg-hover']).toBe('#252528');
    expect(styles['--warning-bg']).toBe('rgba(245, 158, 11, 0.12)');
    expect(styles['--paper-wall']).toBe('color-mix(in srgb, #777a82 44%, transparent)');
    for (const name of ['--bg-secondary', '--bg-tertiary', '--border-color', '--border-muted', '--paper-template-fill']) {
      expect(styles).not.toHaveProperty(name);
    }
  });

  it('recolors all automatic chrome roles and yellow annotation on warm paper without changing authored annotation palettes', () => {
    const styles = stylesFor(SKIN_PRESETS['warm-paper']);
    expect(styles['--paper-template-fill']).toBe('var(--sk-paper)');
    expect(styles['--paper-rail-bg']).toBe('var(--paper-overlay)');
    expect(styles['--paper-rail-text']).toBe('var(--sk-ink)');
    expect(styles['--paper-annotation-yellow-accent']).toBe('var(--sk-annotation)');
    expect(styles['--paper-annotation-yellow-background']).toContain('20%');
    expect(styles).not.toHaveProperty('--paper-annotation-blue-accent');
    expect(styles['--bg-hover']).toContain('var(--sk-ink) 6%');
    expect(styles['--warning-bg']).toBe('color-mix(in srgb, var(--sk-annotation) 12%, var(--sk-paper))');
    expect(Object.keys(styles).some((name) => /font|typography/.test(name))).toBe(false);
  });

  it('a single token override changes its derived faces and clearing it restores their baseline', () => {
    const baseline = stylesFor(SKIN_PRESETS.default);
    const changed = stylesFor({ ...SKIN_PRESETS.default, annotation: '#123456' });
    expect(changed['--paper-annotation-yellow-accent']).toBe('var(--sk-annotation)');
    expect(changed['--warning']).toBe('var(--sk-annotation)');
    expect(changed['--paper-rail-bg']).toBe(baseline['--paper-rail-bg']);
    expect(changed['--bg-primary']).toBe(baseline['--bg-primary']);
    expect(stylesFor(SKIN_PRESETS.default)).toEqual(baseline);
    expect(stylesFor({ ...SKIN_PRESETS.default, paper: '#ffffff' })['--warning-bg']).toContain('var(--sk-paper)');
  });

  it('uses the specified workbench grid and outline, then derives them from their token overrides', () => {
    const styles = stylesFor(SKIN_PRESETS.workbench);
    expect(styles['--paper-workbench-grid']).toBe('#1B2028');
    expect(styles['--paper-template-border']).toBe('#2A313C');
    const changed = stylesFor({ ...SKIN_PRESETS.workbench, desk: '#778899', hairline: '#556677' });
    expect(changed['--paper-workbench-grid']).toContain('var(--sk-desk)');
    expect(changed['--paper-template-border']).toBe('var(--sk-hairline)');
    expect(changed['--paper-shadow-24']).not.toBe(styles['--paper-shadow-24']);
  });

  it('keeps idle presence preset-owned and installs no material on default or quiet ink', () => {
    for (const preset of ['default', 'quiet-ink'] as const) {
      const material = buildPaperMaterialStyles(SKIN_PRESETS[preset], preset) as Record<string, string>;
      expect(material['--sk-wall-idle']).toBe('0');
      expect(material['--paper-wall-idle-content']).toBe('none');
      expect(Object.entries(material).filter(([name]) => name !== '--sk-wall-idle' && name !== '--paper-wall-idle-content')
        .every(([, value]) => value === 'initial')).toBe(true);
    }
    expect(buildPaperMaterialStyles(SKIN_PRESETS.workbench, 'workbench')).toMatchObject({
      '--sk-wall-idle': '1',
      '--paper-wall-idle-content': '""',
      '--paper-wall-idle-ticks': 'linear-gradient(var(--sk-wall) 1px, transparent 1px)',
    });
    const warm = buildPaperMaterialStyles(SKIN_PRESETS['warm-paper'], 'warm-paper') as Record<string, string>;
    expect(warm['--sk-wall-idle']).toBe('0.55');
    expect(warm['--paper-wall-idle-content']).toBe('""');
    expect(warm['--paper-material-desk']).toBe('radial-gradient(90% 72% at 50% 10%, #2B2520 0%, #211D19 46%, #1D1A17 78%)');
    expect(warm['--paper-material-fill']).toBe('linear-gradient(#F9F5ED 0%, #F7F3EA 34%, #F5F0E5 100%)');
    expect(warm['--paper-material-shadow']).toBe('0 22px 54px rgba(8,6,4,.55), 0 5px 16px rgba(8,6,4,.35), inset 0 1px 0 rgba(255,255,255,.55)');
    expect(warm['--paper-wall-idle-left']).toBe('rgba(194,109,90,.45)');
    expect(warm['--paper-wall-idle-mask']).toBe('linear-gradient(transparent 0, #000 72px)');
  });

  it('keeps authored desk, paper and wall colors effective within the warm material preset', () => {
    const changed = buildPaperMaterialStyles({ ...SKIN_PRESETS['warm-paper'],
      desk: '#102030', paper: '#abcdef', wall: '#567890',
    }, 'warm-paper') as Record<string, string>;
    expect(changed['--paper-material-desk']).toBe('var(--sk-desk)');
    expect(changed['--paper-material-fill']).toBe('var(--sk-paper)');
    expect(changed['--paper-wall-idle-left']).toBe('color-mix(in srgb, var(--sk-wall) 45%, transparent)');
    expect(changed['--sk-wall-idle']).toBe('0.55');
  });
});
