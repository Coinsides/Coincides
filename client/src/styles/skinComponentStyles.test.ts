import { describe, expect, it } from 'vitest';
import { buildSkinComponentStyles } from './skinComponentStyles';
import { resolveSkin } from './skinPresets';

describe('B1e header rule component styles', () => {
  it.each(['default', 'quiet-ink', 'warm-paper', 'workbench'] as const)('%s lets each sheet resolve its existing outline and can hide only the header rule', (preset) => {
    const visible = buildSkinComponentStyles(resolveSkin({ preset }).components);
    const hidden = buildSkinComponentStyles(resolveSkin({ preset, components: { headerRule: 'hidden' } }).components);
    expect(visible).toHaveProperty('--sk-header-rule', 'initial');
    expect(hidden).toEqual({ ...visible, '--sk-header-rule': 'none', '--sk-headrule-display': 'none' });
  });
});

describe('B3 lower header separator', () => {
  it.each(['full', 'content', 'short'] as const)('changes only the separator length for %s', (length) => {
    const skin = resolveSkin({ preset: 'warm-paper', components: { headerRuleLength: length, headerRuleStyle: 'dashed' } });
    const style = buildSkinComponentStyles(skin.components);
    expect(style).toHaveProperty('--sk-header-rule', 'initial');
    expect(style).toHaveProperty('--sk-headrule-display', 'block');
    expect(style).toHaveProperty('--sk-headrule-left', length === 'full' ? '0px' : 'initial');
    expect(style).toHaveProperty('--sk-headrule-right', length === 'full' ? '0px' : 'initial');
    expect(style).toHaveProperty('--sk-headrule-width', length === 'short' ? '7rem' : 'auto');
    expect(style).toHaveProperty('--sk-headrule-style', 'dashed');
    expect(style).toHaveProperty('--sk-headrule-color', 'var(--sk-hairline)');
    expect(Object.keys(style).filter((key) => key.includes('wall'))).toEqual([]);
  });

  it.each(['solid', 'dashed', 'dotted'] as const)('keeps %s in the existing skin selection round trip', (style) => {
    const selection = JSON.parse(JSON.stringify({ preset: 'quiet-ink', components: {
      headerRule: 'hidden', headerRuleLength: 'short', headerRuleStyle: style,
    } }));
    const resolved = resolveSkin(selection);
    expect(buildSkinComponentStyles(resolved.components)).toMatchObject({
      '--sk-headrule-display': 'none', '--sk-headrule-style': style,
    });
  });
});
