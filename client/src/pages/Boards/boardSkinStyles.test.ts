import { expect, it } from 'vitest';
import { resolveSkin } from '@/styles/skinPresets';
import { buildBoardSkinStyles } from './boardSkinStyles';

it('leaves the incumbent light/dark aliases inherited and keeps both sticky baselines separate', () => {
  const style = buildBoardSkinStyles(resolveSkin()) as Record<string, string>;
  for (const name of ['--bg-primary', '--bg-surface', '--bg-deepest', '--text-primary', '--text-secondary', '--border-default']) expect(style).not.toHaveProperty(name);
  expect(style['--board-chalk-fill']).toBe('var(--bg-elevated)');
  expect(style['--board-sticky-fill']).toBe('#2f2817');
  expect(style['--board-sticky-stroke']).toBe('#d8a429');
  expect(style['--sk-board-menu-height']).toBe('36px');
});

it('binds independent card/edge/chalk roles and the workbench components without changing authored palettes', () => {
  const style = buildBoardSkinStyles(resolveSkin({ preset: 'workbench', overrides: { edge: '#aabbcc' } })) as Record<string, string>;
  expect(style['--sk-edge']).toBe('#aabbcc');
  expect(style['--board-edge']).toBe('var(--sk-edge)');
  expect(style['--board-chalk']).toBe('var(--sk-chalk)');
  expect(style['--sk-label-font']).toContain('monospace');
  expect(style['--sk-board-handle-radius']).toBe('50%');
  expect(style['--sk-board-menu-height']).toBe('28px');
  expect(style).not.toHaveProperty('--paper-annotation-blue-accent');
});
