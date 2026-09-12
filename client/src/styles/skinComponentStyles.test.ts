import { describe, expect, it } from 'vitest';
import { buildSkinComponentStyles } from './skinComponentStyles';
import { resolveSkin } from './skinPresets';

describe('B1e header rule component styles', () => {
  it.each(['default', 'quiet-ink', 'warm-paper', 'workbench'] as const)('%s lets each sheet resolve its existing outline and can hide only the header rule', (preset) => {
    const visible = buildSkinComponentStyles(resolveSkin({ preset }).components);
    const hidden = buildSkinComponentStyles(resolveSkin({ preset, components: { headerRule: 'hidden' } }).components);
    expect(visible).toHaveProperty('--sk-header-rule', 'initial');
    expect(hidden).toEqual({ ...visible, '--sk-header-rule': 'none' });
  });
});
