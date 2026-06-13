import {
  SLASH_MENU_HEIGHT_ESTIMATE,
  SLASH_MENU_OFFSET,
  SLASH_MENU_WIDTH,
  type SlashMenuAnchor,
} from './runtimeLayout';
import { clamp } from './geometry';

type ClientRectLike = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;

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

function getTextInputCaretRect(element: HTMLElement, caret?: number): ClientRectLike | null {
  if (
    !(element instanceof HTMLTextAreaElement)
    && !(element instanceof HTMLInputElement)
  ) {
    return null;
  }

  const value = element.value;
  const caretIndex = Number.isFinite(caret)
    ? Math.max(0, Math.min(value.length, caret || 0))
    : element.selectionStart ?? value.length;
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
  const left = elementRect.left + markerRect.left - mirrorRect.left - element.scrollLeft;
  const top = elementRect.top + markerRect.top - mirrorRect.top - element.scrollTop;
  const bottom = elementRect.top + markerRect.bottom - mirrorRect.top - element.scrollTop;

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
  const maxX = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
  const x = clamp(anchorRect.left, viewportPadding, maxX);
  const belowY = anchorRect.bottom + SLASH_MENU_OFFSET;
  const aboveY = anchorRect.top - SLASH_MENU_HEIGHT_ESTIMATE - SLASH_MENU_OFFSET;
  const wouldOverflowViewport = anchorRect.bottom + SLASH_MENU_OFFSET + SLASH_MENU_HEIGHT_ESTIMATE > window.innerHeight;
  const y = wouldOverflowViewport && aboveY > 0 ? aboveY : belowY;

  return { x, y: Math.max(viewportPadding, y) };
}
