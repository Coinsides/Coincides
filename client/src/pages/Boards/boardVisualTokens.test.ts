import { describe, expect, it } from 'vitest';
import { resolveSkin } from '@/styles/skinPresets';
import { buildBoardSkinStyles } from './boardSkinStyles';
import globalCss from '../../styles/global.css?raw';
import boardCss from './Boards.module.css?raw';

const blocks = [...globalCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
const dark = blocks.find(([, selector, body]) => selector.trim().endsWith(':root, [data-board-skin-preset]') && body.includes('--board-line-1:'));
const light = blocks.find(([, selector, body]) => selector.includes("[data-theme='light'] [data-board-skin-preset]") && body.includes('--board-line-1:'));
const declarations = (body: string) => Object.fromEntries([...body.matchAll(/(--board-[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
const expected = [
  '--board-line-1', '--board-line-2', '--board-line-3', '--board-line-width-1', '--board-line-width-2', '--board-line-width-3',
  '--board-sticky-neutral-fill', '--board-sticky-border', '--board-sticky-text', '--board-sticky-medium-fill',
  '--board-sticky-medium-border', '--board-sticky-strong-fill', '--board-sticky-strong-text',
  '--board-accent-1-line', '--board-accent-1-fill', '--board-accent-1-text', '--board-accent-1-on-solid',
  '--board-binding-preview', '--board-anchor-fill', '--board-anchor-stroke', '--board-label-text',
  '--board-sticky-font-size', '--board-sticky-line-height', '--board-label-font-size', '--board-label-line-height',
];

describe('board visual v1 theme token contracts', () => {
  it('defines the complete token family in both themes and re-resolves aliases inside each board skin', () => {
    expect(dark).toBeTruthy(); expect(light).toBeTruthy();
    for (const block of [dark!, light!]) {
      const values = declarations(block[2]);
      expect(Object.keys(values).sort()).toEqual([...expected].sort());
      expect(values['--board-line-1']).toBe('var(--border-subtle)');
      expect(values['--board-line-2']).toBe('var(--text-muted)');
      expect(values['--board-line-3']).toBe('var(--text-secondary)');
      expect(values['--board-sticky-neutral-fill']).toBe('var(--bg-elevated)');
      expect(values['--board-accent-1-line']).toBe('var(--accent-primary)');
      expect(values['--board-accent-1-fill']).toBe('var(--accent-primary-bg)');
      expect(values['--board-label-text']).toBe('var(--text-secondary)');
      expect(block[2]).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      for (const [name, value] of Object.entries(values)) {
        if (!/-(?:width|font-size|line-height)-?\d?$/.test(name)) expect(value).toMatch(/^var\(--[\w-]+\)$/);
      }
    }
  });

  it('keeps new neutral residents separate from the legacy relocated-sticky palette in every skin', () => {
    for (const preset of ['default', 'quiet-ink', 'warm-paper', 'workbench'] as const) {
      const skin = buildBoardSkinStyles(resolveSkin({ preset })) as Record<string, string>;
      expect(skin['--board-sticky-fill']).toBeTruthy();
      expect(skin).not.toHaveProperty('--board-sticky-neutral-fill');
      for (const token of expected) expect(skin).not.toHaveProperty(token);
    }
    const stickyBlock = [...boardCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, selector]) => selector.trim() === '.stickyCard');
    expect(stickyBlock?.[2]).toContain('var(--board-sticky-neutral-fill)');
    expect(stickyBlock?.[2]).not.toContain('var(--board-sticky-fill)');
    expect(stickyBlock?.[2]).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('keeps labels below fixed sticky body typography and advances line weight by an equal ratio', () => {
    for (const block of [dark!, light!]) {
      const values = declarations(block[2]);
      expect(parseFloat(values['--board-label-font-size'])).toBeLessThan(parseFloat(values['--board-sticky-font-size']));
      const widths = [1, 2, 3].map((weight) => Number(values[`--board-line-width-${weight}`]));
      expect(widths[1] / widths[0]).toBeCloseTo(widths[2] / widths[1]);
      expect(widths[0]).toBeGreaterThan(0); expect(widths[1]).toBeGreaterThan(widths[0]);
    }
  });
});
