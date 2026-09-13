import type { CSSProperties } from 'react';
import type { SkinSelection, SkinTokenName, SkinTokens } from '@shared/types/skin';
import { SKIN_PRESETS } from '@/styles/skinPresets';

type DerivedColor = { token: SkinTokenName; baseline: string; themed: string };

/** Fixed rendering aliases, not configurable/persisted skin tokens. Baselines are
 * the pre-B1a per-face census; only the corresponding color role can replace one. */
export const PAPER_DERIVED_COLORS: Record<string, DerivedColor> = {
  'source-lock-border': { token: 'accent', baseline: '#55bd8a', themed: 'var(--sk-accent)' },
  'source-lock-ink': { token: 'accent', baseline: '#65cf99', themed: 'var(--sk-accent)' },
  'sticky-ink': { token: 'ink', baseline: '#f8edc4', themed: 'var(--sk-ink)' },
  'image-label-ink': { token: 'ink', baseline: '#fff', themed: 'var(--sk-ink)' },
  'annotation-teal': { token: 'annotation', baseline: '#2dd4bf', themed: 'var(--sk-annotation)' },
  'annotation-teal-dark': { token: 'annotation', baseline: '#0f766e', themed: 'var(--sk-annotation)' },
  'black': { token: 'paper', baseline: '#000', themed: 'var(--sk-paper)' },
  'white': { token: 'ink', baseline: 'white', themed: 'var(--sk-ink)' },
  'danger': { token: 'danger', baseline: '#ef4444', themed: 'var(--sk-danger)' },
  'warning-border': { token: 'annotation', baseline: 'rgba(245, 158, 11, 0.42)', themed: 'color-mix(in srgb, var(--sk-annotation) 42%, transparent)' },
  'warning-background': { token: 'annotation', baseline: 'rgba(245, 158, 11, 0.08)', themed: 'color-mix(in srgb, var(--sk-annotation) 8%, transparent)' },
  'warning-ink': { token: 'annotation', baseline: 'rgba(253, 230, 138, 0.95)', themed: 'var(--sk-annotation)' },
  'warning': { token: 'annotation', baseline: '#f59e0b', themed: 'var(--sk-annotation)' },
  'code-accent': { token: 'accent', baseline: '#a8c7ff', themed: 'var(--sk-accent)' },
  'rail-bg': { token: 'paper', baseline: '#090d12', themed: 'var(--paper-overlay)' },
  'rail-bg-soft': { token: 'paper', baseline: '#0d1319', themed: 'var(--paper-overlay)' },
  'rail-bg-raised': { token: 'paper', baseline: '#111820', themed: 'var(--paper-overlay)' },
  'rail-border': { token: 'hairline', baseline: '#27313c', themed: 'var(--sk-hairline)' },
  'rail-border-soft': { token: 'hairline', baseline: '#1b252f', themed: 'var(--sk-hairline)' },
  'rail-text': { token: 'ink', baseline: '#edf7ff', themed: 'var(--sk-ink)' },
  'rail-muted': { token: 'ink-muted', baseline: '#7f8c9a', themed: 'var(--sk-ink-muted)' },
  'rail-dim': { token: 'ink-muted', baseline: '#536170', themed: 'var(--sk-ink-muted)' },
  'rail-cyan': { token: 'accent', baseline: '#22d3ee', themed: 'var(--sk-accent)' },
  'rail-strip': { token: 'paper', baseline: '#080c11', themed: 'var(--paper-overlay)' },
  'rail-popup': { token: 'paper', baseline: '#0b1117', themed: 'var(--paper-overlay)' },
  'rail-input': { token: 'paper', baseline: '#070b10', themed: 'var(--sk-paper)' },
  'rail-warning': { token: 'annotation', baseline: '#facc15', themed: 'var(--sk-annotation)' },
  'rail-success': { token: 'accent', baseline: '#34d399', themed: 'var(--sk-accent)' },
  'rail-error': { token: 'danger', baseline: '#fb7185', themed: 'var(--sk-danger)' },
  'rail-stale-border': { token: 'annotation', baseline: '#d6b65e', themed: 'var(--sk-annotation)' },
  'rail-stale-ink': { token: 'annotation', baseline: '#c9b676', themed: 'var(--sk-annotation)' },
  'rail-topic-violet': { token: 'accent', baseline: '#a78bfa', themed: 'var(--sk-accent)' },
  'rail-topic-sky': { token: 'accent', baseline: '#38bdf8', themed: 'var(--sk-accent)' },
  'annotation-yellow-accent': { token: 'annotation', baseline: '#facc15', themed: 'var(--sk-annotation)' },
  'annotation-yellow-background': { token: 'annotation', baseline: 'rgba(250, 204, 21, 0.22)', themed: 'color-mix(in srgb, var(--sk-annotation) 20%, transparent)' },
  'annotation-yellow-badge': { token: 'annotation', baseline: 'rgba(113, 63, 18, 0.72)', themed: 'color-mix(in srgb, var(--sk-annotation) 20%, var(--sk-paper))' },
  'annotation-yellow-text': { token: 'annotation', baseline: '#fef9c3', themed: 'var(--sk-ink)' },
};

function luminance(color: string): number {
  const channels = color.slice(1, 7).match(/.{2}/g)?.map((part) => parseInt(part, 16) / 255) || [0, 0, 0];
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

/** Scope this result to a paper runtime or one of its portal/print roots. Never body. */
export function buildPaperSkinStyles(tokens: SkinTokens): CSSProperties {
  const defaults = SKIN_PRESETS.default;
  const changed = (name: SkinTokenName) => tokens[name].toLowerCase() !== defaults[name].toLowerCase();
  const value = (name: SkinTokenName, baseline: string, themed = `var(--sk-${name})`) => changed(name) ? themed : baseline;
  const styles: Record<string, string> = {};
  for (const [name, color] of Object.entries(tokens)) styles[`--sk-${name}`] = color;

  Object.assign(styles, {
    '--text-primary': 'var(--sk-ink)',
    '--text-secondary': 'var(--sk-ink-muted)',
    '--text-muted': value('ink-muted', '#777a82'),
    '--text-inverse': value('ink', '#0a0a0f', 'var(--sk-paper)'),
    '--paper-overlay': 'color-mix(in srgb, var(--sk-paper) 96%, var(--sk-ink))',
    '--bg-primary': value('paper', '#0f0f10', 'var(--paper-overlay)'),
    '--bg-deepest': value('paper', '#0b0b0c', 'var(--sk-paper)'),
    '--bg-surface': value('paper', '#151516', 'var(--paper-overlay)'),
    '--bg-elevated': value('paper', '#1d1d1f', 'var(--paper-overlay)'),
    '--bg-hover': changed('ink') || changed('paper') ? 'color-mix(in srgb, var(--sk-ink) 6%, transparent)' : '#252528',
    '--bg-active': value('paper', '#2f3034', 'color-mix(in srgb, var(--sk-ink) 7%, transparent)'),
    '--border-default': 'var(--sk-hairline)',
    '--border-subtle': value('hairline', '#232427'),
    '--border-focus': 'var(--sk-accent)',
    '--accent-primary': 'var(--sk-accent)',
    '--accent-primary-hover': value('accent', '#3b82f6'),
    '--accent-primary-bg': value('accent', 'rgba(37, 99, 235, 0.16)', 'color-mix(in srgb, var(--sk-accent) 16%, transparent)'),
    '--accent-primary-bg-hover': value('accent', 'rgba(37, 99, 235, 0.24)', 'color-mix(in srgb, var(--sk-accent) 24%, transparent)'),
    '--warning': value('annotation', '#f59e0b'),
    // Recovery and template notices can sit on the dark desk, outside a sheet.
    '--warning-bg': changed('annotation') || changed('paper')
      ? 'color-mix(in srgb, var(--sk-annotation) 12%, var(--sk-paper))' : 'rgba(245, 158, 11, 0.12)',
    '--danger': 'var(--sk-danger)',
    '--error': 'var(--sk-danger)',
    '--error-bg': value('danger', 'rgba(239, 68, 68, 0.12)', 'color-mix(in srgb, var(--sk-danger) 12%, transparent)'),
    '--paper-wall': value('wall', 'color-mix(in srgb, #777a82 44%, transparent)'),
    '--canvas-sticky-note-fill': value('annotation', '#2f2817', 'color-mix(in srgb, var(--sk-annotation) 20%, var(--sk-paper))'),
    '--canvas-sticky-note-stroke': value('annotation', '#d8a429'),
    '--paper-button-ink': changed('accent') ? (luminance(tokens.accent) > 0.179 ? 'var(--sk-desk)' : 'var(--sk-paper)') : 'white',
    '--paper-image-label-bg': changed('paper') ? 'var(--paper-overlay)' : 'rgba(0, 0, 0, 0.58)',
    '--paper-highlight-edge': value('ink', 'rgba(255, 255, 255, 0.12)', 'color-mix(in srgb, var(--sk-ink) 12%, transparent)'),
    '--paper-workbench-grid': tokens.desk.toLowerCase() === SKIN_PRESETS.workbench.desk.toLowerCase()
      ? '#1B2028' : 'color-mix(in srgb, var(--sk-desk) 94%, var(--sk-ink))',
  });

  for (const [name, color] of Object.entries(PAPER_DERIVED_COLORS)) {
    styles[`--paper-${name}`] = value(color.token, color.baseline, color.themed);
  }

  // Undefined legacy aliases must stay undefined for the untouched default:
  // several existing declarations intentionally resolve to transparent there.
  if (changed('paper')) {
    styles['--bg-secondary'] = 'var(--paper-overlay)';
    styles['--bg-tertiary'] = 'var(--paper-overlay)';
    styles['--paper-template-fill'] = 'var(--sk-paper)';
  }
  if (changed('hairline')) {
    styles['--border-color'] = 'var(--sk-hairline)';
    styles['--border-muted'] = 'var(--sk-hairline)';
    styles['--paper-template-border'] = tokens.paper.toLowerCase() === SKIN_PRESETS.workbench.paper.toLowerCase()
      && tokens.hairline.toLowerCase() === SKIN_PRESETS.workbench.hairline.toLowerCase()
      ? '#2A313C' : 'var(--sk-hairline)';
  }

  // Shadow color is a fixed physical black; its opacity follows desk luminance.
  const shadowFactor = changed('desk') ? 0.65 + (1 - luminance(tokens.desk)) * 0.35 : 1;
  for (const opacity of [0.14, 0.16, 0.17, 0.18, 0.2, 0.22, 0.24, 0.28, 0.32, 0.34, 0.35, 0.38]) {
    styles[`--paper-shadow-${Math.round(opacity * 100)}`] = `rgba(0, 0, 0, ${Number((opacity * shadowFactor).toFixed(4))})`;
  }
  styles['--glass-shadow-sm'] = '0 1px 2px var(--paper-shadow-28)';
  styles['--glass-shadow-md'] = '0 8px 18px var(--paper-shadow-22)';
  styles['--glass-shadow-lg'] = '0 18px 48px var(--paper-shadow-34)';
  if (changed('desk')) styles['--paper-template-shadow'] = '0 18px 46px var(--paper-shadow-24)';
  return styles as CSSProperties;
}

/** Preset-owned materials; these aliases never enter the persisted token schema.
 * Keep default/quiet-ink paint untouched and let authored color overrides win. */
export function buildPaperMaterialStyles(tokens: SkinTokens, preset: SkinSelection['preset']): CSSProperties {
  const styles: Record<string, string> = {
    '--sk-wall-idle': preset === 'warm-paper' ? '0.55' : preset === 'workbench' ? '1' : '0',
    // Even fully transparent generated paint can change Chromium text AA.
    // The two unadorned presets must generate no idle pseudo-elements at all.
    '--paper-wall-idle-content': preset === 'warm-paper' || preset === 'workbench' ? '""' : 'none',
  };
  // Nested note/portal roots must not inherit a different preset's material.
  // Custom-property initial restores each consumer's incumbent fallback.
  for (const name of ['desk', 'fill', 'shadow', 'binding']) {
    styles[`--paper-material-${name}`] = 'initial';
  }
  for (const name of ['left', 'mask', 'ticks']) styles[`--paper-wall-idle-${name}`] = 'initial';
  if (preset === 'warm-paper') {
    const stock = SKIN_PRESETS['warm-paper'];
    const unchanged = (name: SkinTokenName) => tokens[name].toLowerCase() === stock[name].toLowerCase();
    Object.assign(styles, {
      '--paper-material-desk': unchanged('desk')
        ? 'radial-gradient(90% 72% at 50% 10%, #2B2520 0%, #211D19 46%, #1D1A17 78%)'
        : 'var(--sk-desk)',
      '--paper-material-fill': unchanged('paper')
        ? 'linear-gradient(#F9F5ED 0%, #F7F3EA 34%, #F5F0E5 100%)'
        : 'var(--sk-paper)',
      '--paper-material-shadow': '0 22px 54px rgba(8,6,4,.55), 0 5px 16px rgba(8,6,4,.35), inset 0 1px 0 rgba(255,255,255,.55)',
      '--paper-material-binding': 'linear-gradient(to right, rgba(8,6,4,.10), rgba(8,6,4,0))',
      // The red rule is 45% of the wall's shared 0.55 idle presence.
      '--paper-wall-idle-left': unchanged('wall') ? 'rgba(194,109,90,.45)' : 'color-mix(in srgb, var(--sk-wall) 45%, transparent)',
      '--paper-wall-idle-mask': 'linear-gradient(transparent 0, #000 72px)',
    });
  }
  if (preset === 'workbench') {
    styles['--paper-wall-idle-ticks'] = 'linear-gradient(var(--sk-wall) 1px, transparent 1px)';
  }
  return styles as CSSProperties;
}
