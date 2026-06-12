import {
  SLASH_MENU_HEIGHT_ESTIMATE,
  SLASH_MENU_OFFSET,
  SLASH_MENU_WIDTH,
  type SlashMenuAnchor,
} from './runtimeLayout';
import { clamp } from './geometry';

export function getSlashMenuAnchor(
  element: HTMLElement | null,
  container: HTMLElement | null,
): SlashMenuAnchor | null {
  if (!element || !container) return null;

  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const menuWidth = Math.min(SLASH_MENU_WIDTH, Math.max(0, containerRect.width));
  const maxX = Math.max(0, containerRect.width - menuWidth);
  const x = clamp(elementRect.left - containerRect.left, 0, maxX);
  const belowY = elementRect.bottom - containerRect.top + SLASH_MENU_OFFSET;
  const aboveY = elementRect.top - containerRect.top - SLASH_MENU_HEIGHT_ESTIMATE - SLASH_MENU_OFFSET;
  const wouldOverflowViewport = elementRect.bottom + SLASH_MENU_OFFSET + SLASH_MENU_HEIGHT_ESTIMATE > window.innerHeight;
  const y = wouldOverflowViewport && aboveY > 0 ? aboveY : belowY;

  return { x, y: Math.max(0, y) };
}
