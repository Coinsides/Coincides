import type { CSSProperties } from 'react';
import type { SkinComponents } from '@shared/types/skin';

/** Fixed enum-to-CSS translation, scoped to each surface and its portals. */
export function buildSkinComponentStyles(components: SkinComponents): CSSProperties {
  return {
    '--sk-title-font': components.titleFont === 'serif' ? 'Georgia, "Noto Serif SC", "Songti SC", SimSun, serif' : 'initial',
    '--sk-paper-title-size': components.titleFont === 'serif' ? '36px' : '34px',
    '--sk-paper-title-weight': components.titleFont === 'serif' ? '600' : '650',
    '--sk-paper-title-spacing': components.titleFont === 'serif' ? '.01em' : 'normal',
    '--sk-label-font': components.labelFont === 'mono' ? 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace' : 'initial',
    '--sk-menu-row-height': components.menuDensity === 'compact' ? '26px' : '30px',
    '--sk-menu-gap': components.menuDensity === 'compact' ? '1px' : '3px',
    '--sk-more-padding': components.menuDensity === 'compact' ? '6px 10px' : '10px',
    '--sk-board-menu-height': components.menuDensity === 'compact' ? '28px' : '36px',
    '--sk-board-menu-padding': components.menuDensity === 'compact' ? '4px 8px' : '7px 10px',
    '--sk-handle-radius': components.handleStyle === 'rivet' ? '50%' : 'var(--radius-sm)',
    '--sk-board-handle-radius': components.handleStyle === 'rivet' ? '50%' : '4px',
    '--sk-small-handle-radius': components.handleStyle === 'rivet' ? '50%' : '2px',
    '--sk-handle-mark-width': components.handleStyle === 'rivet' ? '6px' : '2px',
    '--sk-handle-mark-bottom': components.handleStyle === 'rivet' ? 'auto' : '0',
    '--sk-handle-mark-height': components.handleStyle === 'rivet' ? '6px' : 'auto',
    '--sk-handle-mark-left': components.handleStyle === 'rivet' ? '1px' : '3px',
  } as CSSProperties;
}
