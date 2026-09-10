import {
  SLASH_MENU_HEIGHT_ESTIMATE,
  SLASH_MENU_OFFSET,
  SLASH_MENU_WIDTH,
  type SlashMenuAnchor,
} from './runtimeLayout';
import { clamp, worldToScreen } from './geometry';
import type { CanvasRect, CanvasViewport } from './types';
import { snapGraphemeOffset } from '../../../../../shared/graphemes';

type ClientRectLike = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;
export type OverlaySide = 'below' | 'right';
export type OverlayAlign = 'start' | 'end';
export type OverlayAnchorSource =
  | 'caret'
  | 'block'
  | 'fixed_viewport'
  | 'formula_help'
  | 'source_picker'
  | 'relation_endpoint';

export interface ViewportOverlayPlacementOptions {
  anchorRect: ClientRectLike;
  overlayWidth: number;
  overlayHeight: number;
  offset?: number;
  viewportPadding?: number;
  preferredSide?: OverlaySide;
  align?: OverlayAlign;
}

export interface AnchoredOverlayPlacementOptions extends Omit<ViewportOverlayPlacementOptions, 'anchorRect'> {
  anchor: ViewportOverlayAnchor;
}

export interface SelectionToolbarPlacementOptions {
  anchorRect: ClientRectLike;
  toolbarWidth?: number;
  toolbarHeight?: number;
  offset?: number;
  viewportPadding?: number;
  topChromeHeight?: number;
}

export interface ViewportOverlayAnchor {
  kind: 'viewport_rect';
  source: OverlayAnchorSource;
  rect: ClientRectLike;
  ownerId?: string;
}

export interface WorldOverlayAnchorOptions {
  worldRect: CanvasRect;
  viewport: CanvasViewport;
  viewportElementRect: ClientRectLike;
  source: OverlayAnchorSource;
  ownerId?: string;
}

const MIRROR_STYLE_PROPERTIES = [
  'boxSizing',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderRightWidth',
  'borderTopWidth',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'tabSize',
  'textAlign',
  'textTransform',
] as const;

/** Page presentation scales the DOM outside the unchanged text layout box. */
export function getPageDisplayScale(element: HTMLElement): number {
  const pageSurface = element.closest<HTMLElement>('[data-page-display-scale]');
  const scale = Number(pageSurface?.dataset.pageDisplayScale);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

export function createViewportOverlayAnchor(
  anchorRect: ClientRectLike,
  source: OverlayAnchorSource = 'fixed_viewport',
  ownerId?: string,
): ViewportOverlayAnchor {
  return {
    kind: 'viewport_rect',
    source,
    rect: anchorRect,
    ownerId,
  };
}

export function worldRectToViewportRect({
  worldRect,
  viewport,
  viewportElementRect,
}: WorldOverlayAnchorOptions): ClientRectLike {
  const topLeft = worldToScreen({ x: worldRect.x, y: worldRect.y }, viewport);
  const bottomRight = worldToScreen({
    x: worldRect.x + worldRect.width,
    y: worldRect.y + worldRect.height,
  }, viewport);

  return {
    left: viewportElementRect.left + topLeft.x,
    right: viewportElementRect.left + bottomRight.x,
    top: viewportElementRect.top + topLeft.y,
    bottom: viewportElementRect.top + bottomRight.y,
  };
}

export function createWorldOverlayAnchor(options: WorldOverlayAnchorOptions): ViewportOverlayAnchor {
  return createViewportOverlayAnchor(
    worldRectToViewportRect(options),
    options.source,
    options.ownerId,
  );
}

export function placeAnchoredOverlay({
  anchor,
  ...placement
}: AnchoredOverlayPlacementOptions): SlashMenuAnchor {
  return placeOverlayInViewport({
    ...placement,
    anchorRect: anchor.rect,
  });
}

export function placeOverlayInViewport({
  anchorRect,
  overlayWidth,
  overlayHeight,
  offset = 8,
  viewportPadding = 16,
  preferredSide = 'below',
  align = 'start',
}: ViewportOverlayPlacementOptions): SlashMenuAnchor {
  const maxX = Math.max(viewportPadding, window.innerWidth - overlayWidth - viewportPadding);
  const maxY = Math.max(viewportPadding, window.innerHeight - overlayHeight - viewportPadding);
  const alignedX = align === 'end'
    ? anchorRect.right - overlayWidth
    : anchorRect.left;
  const alignedY = align === 'end'
    ? anchorRect.bottom - overlayHeight
    : anchorRect.top;

  if (preferredSide === 'right') {
    const rightX = anchorRect.right + offset;
    const leftX = anchorRect.left - overlayWidth - offset;
    const canOpenRight = rightX + overlayWidth <= window.innerWidth - viewportPadding;
    const canOpenLeft = leftX >= viewportPadding;
    const rawX = canOpenRight || !canOpenLeft ? rightX : leftX;

    return {
      x: clamp(rawX, viewportPadding, maxX),
      y: clamp(alignedY, viewportPadding, maxY),
    };
  }

  const belowY = anchorRect.bottom + offset;
  const aboveY = anchorRect.top - overlayHeight - offset;
  const canOpenBelow = belowY + overlayHeight <= window.innerHeight - viewportPadding;
  const canOpenAbove = aboveY >= viewportPadding;
  const rawY = canOpenBelow || !canOpenAbove ? belowY : aboveY;

  return {
    x: clamp(alignedX, viewportPadding, maxX),
    y: clamp(rawY, viewportPadding, maxY),
  };
}

export function placeSelectionToolbar({
  anchorRect,
  toolbarWidth = 360,
  toolbarHeight = 42,
  offset = 8,
  viewportPadding = 12,
  topChromeHeight = 56,
}: SelectionToolbarPlacementOptions): SlashMenuAnchor {
  const safeTop = Math.max(viewportPadding, topChromeHeight + viewportPadding);
  const maxX = Math.max(viewportPadding, window.innerWidth - toolbarWidth - viewportPadding);
  const maxY = Math.max(safeTop, window.innerHeight - toolbarHeight - viewportPadding);
  const aboveY = anchorRect.top - toolbarHeight - offset;
  const belowY = anchorRect.bottom + offset;
  const canOpenAbove = aboveY >= safeTop;
  const rawY = canOpenAbove ? aboveY : belowY;

  return {
    x: clamp(anchorRect.left, viewportPadding, maxX),
    y: clamp(rawY, safeTop, maxY),
  };
}

function getTextInputCaretRect(element: HTMLElement, caret?: number): ClientRectLike | null {
  if (
    !(element instanceof HTMLTextAreaElement)
    && !(element instanceof HTMLInputElement)
  ) {
    return null;
  }

  const value = element.value;
  const caretIndex = snapGraphemeOffset(value, Number.isFinite(caret)
    ? Math.max(0, Math.min(value.length, caret || 0))
    : element.selectionStart ?? value.length);
  const elementRect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);
  const mirror = document.createElement('div');
  const marker = document.createElement('span');

  mirror.setAttribute('aria-hidden', 'true');
  mirror.style.position = 'absolute';
  mirror.style.left = '-10000px';
  mirror.style.top = '0';
  mirror.style.visibility = 'hidden';
  mirror.style.overflow = 'hidden';
  mirror.style.width = `${element.offsetWidth}px`;
  mirror.style.minHeight = `${element.offsetHeight}px`;
  mirror.style.whiteSpace = element instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre';
  mirror.style.overflowWrap = element instanceof HTMLTextAreaElement ? 'break-word' : 'normal';
  mirror.style.wordBreak = 'normal';

  for (const property of MIRROR_STYLE_PROPERTIES) {
    mirror.style[property] = computed[property];
  }

  mirror.textContent = value.slice(0, caretIndex);
  marker.textContent = '\u200b';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const mirrorRect = mirror.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const pageScale = getPageDisplayScale(element);
  const left = elementRect.left + (markerRect.left - mirrorRect.left - element.scrollLeft) * pageScale;
  const top = elementRect.top + (markerRect.top - mirrorRect.top - element.scrollTop) * pageScale;
  const bottom = elementRect.top + (markerRect.bottom - mirrorRect.top - element.scrollTop) * pageScale;

  document.body.removeChild(mirror);

  return {
    left,
    right: left,
    top,
    bottom,
  };
}

export function getSlashMenuAnchor(
  element: HTMLElement | null,
  container: HTMLElement | null,
  caret?: number,
): SlashMenuAnchor | null {
  if (!element || !container) return null;

  const elementRect = element.getBoundingClientRect();
  const anchorRect = getTextInputCaretRect(element, caret) || elementRect;
  const viewportPadding = 16;
  const menuWidth = Math.min(SLASH_MENU_WIDTH, Math.max(0, window.innerWidth - (viewportPadding * 2)));

  return placeAnchoredOverlay({
    anchor: createViewportOverlayAnchor(anchorRect, 'caret'),
    overlayWidth: menuWidth,
    overlayHeight: SLASH_MENU_HEIGHT_ESTIMATE,
    offset: SLASH_MENU_OFFSET,
    viewportPadding,
    preferredSide: 'below',
  });
}

export function getBlockControlAnchor(element: HTMLElement | null | undefined): SlashMenuAnchor | null {
  if (!element) return null;

  return getBlockControlAnchorFromRect(element.getBoundingClientRect());
}

export function getBlockControlAnchorFromRect(rect: ClientRectLike): SlashMenuAnchor {
  const overlayWidth = 220;
  const offset = 8;
  const rightX = rect.right + offset;
  const leftX = rect.left - overlayWidth - offset;
  const canOpenRight = rightX + overlayWidth <= window.innerWidth - offset;
  const canOpenLeft = leftX >= offset;

  return {
    x: canOpenRight || !canOpenLeft ? rightX : leftX,
    y: rect.top,
  };
}

export function getTooltipAnchor(element: HTMLElement | null | undefined): SlashMenuAnchor | null {
  if (!element) return null;

  const rect = element.getBoundingClientRect();

  return placeAnchoredOverlay({
    anchor: createViewportOverlayAnchor(rect, 'formula_help'),
    overlayWidth: 320,
    overlayHeight: 82,
    preferredSide: 'below',
  });
}
