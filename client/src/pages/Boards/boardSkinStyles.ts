import type { CSSProperties } from 'react';
import type { SkinTokenName } from '@shared/types/skin';
import { SKIN_PRESETS, resolveSkin } from '@/styles/skinPresets';
import { buildSkinComponentStyles } from '@/styles/skinComponentStyles';

/** Rendering aliases are fixed, never persisted as additional user tokens.
 * An unchanged default role inherits the incumbent app theme (including light). */
export function buildBoardSkinStyles(skin: ReturnType<typeof resolveSkin>): CSSProperties {
  const { tokens, components } = skin;
  const preset = skin.materialPreset ?? skin.preset;
  const changed = (name: SkinTokenName) => tokens[name].toLowerCase() !== SKIN_PRESETS.default[name].toLowerCase();
  const styles: Record<string, string> = Object.fromEntries(Object.entries(tokens).map(([name, value]) => [`--sk-${name}`, value]));
  const alias = (name: string, token: SkinTokenName, value = `var(--sk-${token})`) => {
    if (changed(token)) styles[name] = value;
  };
  alias('--text-primary', 'ink');
  alias('--text-secondary', 'ink-muted');
  alias('--text-muted', 'ink-muted');
  alias('--text-inverse', 'ink', 'var(--sk-card)');
  alias('--bg-primary', 'card', 'var(--board-overlay)');
  alias('--bg-surface', 'card');
  alias('--bg-elevated', 'card', 'var(--board-overlay)');
  alias('--bg-deepest', 'board-desk');
  alias('--border-default', 'hairline');
  alias('--border-subtle', 'hairline');
  alias('--border-focus', 'accent');
  alias('--accent-primary', 'accent');
  alias('--accent-primary-hover', 'accent');
  alias('--gradient-primary-hover', 'accent');
  alias('--accent-primary-bg', 'accent', 'color-mix(in srgb, var(--sk-accent) 16%, transparent)');
  alias('--accent-primary-bg-hover', 'accent', 'color-mix(in srgb, var(--sk-accent) 24%, transparent)');
  alias('--danger', 'danger');
  alias('--error', 'danger');
  alias('--error-bg', 'danger', 'color-mix(in srgb, var(--sk-danger) 12%, transparent)');
  alias('--warning', 'annotation');
  alias('--warning-bg', 'annotation', 'color-mix(in srgb, var(--sk-annotation) 12%, var(--sk-card))');
  if (changed('ink') || changed('card')) {
    styles['--bg-hover'] = 'color-mix(in srgb, var(--sk-ink) 6%, transparent)';
    styles['--bg-active'] = 'color-mix(in srgb, var(--sk-ink) 7%, transparent)';
  }
  styles['--board-overlay'] = 'color-mix(in srgb, var(--sk-card) 96%, var(--sk-ink))';
  styles['--board-desk'] = changed('board-desk') ? 'var(--sk-board-desk)' : 'var(--bg-deepest)';
  styles['--board-card'] = changed('card') ? 'var(--sk-card)' : 'var(--bg-surface)';
  styles['--board-edge'] = changed('edge') ? 'var(--sk-edge)' : 'var(--text-secondary)';
  styles['--board-chalk'] = changed('chalk') ? 'var(--sk-chalk)' : 'var(--text-primary)';
  styles['--board-ink'] = 'var(--board-chalk)';
  styles['--board-desk-muted'] = changed('chalk') ? 'color-mix(in srgb, var(--sk-chalk) 78%, var(--sk-board-desk))' : 'var(--text-secondary)';
  // Ordinary chalk and relocated sticky shapes had different incumbent fills.
  styles['--board-chalk-fill'] = changed('board-desk') ? 'color-mix(in srgb, var(--sk-board-desk) 90%, var(--sk-chalk))' : 'var(--bg-elevated)';
  styles['--board-sticky-fill'] = changed('annotation') ? 'color-mix(in srgb, var(--sk-annotation) 20%, var(--sk-card))' : '#2f2817';
  styles['--board-sticky-stroke'] = changed('annotation') ? 'var(--sk-annotation)' : '#d8a429';
  styles['--board-shape-fill'] = changed('card') ? 'color-mix(in srgb, var(--sk-accent) 14%, var(--sk-card))' : 'color-mix(in srgb, var(--accent-primary) 14%, transparent)';
  styles['--board-button-ink'] = changed('accent') ? (preset === 'warm-paper' ? 'var(--sk-card)' : 'var(--sk-board-desk)') : '#fff';
  styles['--board-grid'] = preset === 'workbench' ? '#1B2028' : 'transparent';
  styles['--board-title-weight'] = preset === 'quiet-ink' ? '400' : preset === 'workbench' ? '700' : '600';
  styles['--board-backdrop'] = 'rgb(0 0 0 / 55%)';
  styles['--board-note-backdrop'] = 'rgb(0 0 0 / 28%)';
  return { ...styles, ...buildSkinComponentStyles(components) } as CSSProperties;
}
