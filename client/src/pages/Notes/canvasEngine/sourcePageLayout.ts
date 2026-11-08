import type { SourcePage, SourcePageRegister } from '@/pages/Sources/sourceApi';

export const SOURCE_PAGE_GAP = 40;
export const SOURCE_PAGE_PADDING = 24;
const MAX_PAGE_WIDTH = 904;
const A4_RATIO = 842 / 595;

export interface SourcePageSlot {
  pageNumber: number;
  top: number;
  /** Never wider than the image's own pixels: a small picture is not blown up to page width. */
  width: number;
  height: number;
  page: SourcePage | null;
  failed: boolean;
}

/** Display geometry only. A page that has no image yet borrows its neighbour's shape. */
export function sourcePageLayout(register: SourcePageRegister | null, availableWidth: number) {
  const pageWidth = Math.max(1, Math.min(MAX_PAGE_WIDTH, availableWidth));
  const byNumber = new Map(register?.pages.map((page) => [page.page_number, page]));
  const failed = new Set(register?.failed_pages);
  // A failed run has stopped, so a page without an image is not coming on its own.
  const stopped = register?.status === 'failed';
  const slots: SourcePageSlot[] = [];
  let ratio = A4_RATIO;
  let top = 0;
  for (let pageNumber = 1; pageNumber <= (register?.expected ?? 0); pageNumber += 1) {
    const page = byNumber.get(pageNumber) ?? null;
    if (page) ratio = page.image_height / page.image_width;
    const width = page ? Math.min(pageWidth, page.image_width) : pageWidth;
    const height = width * ratio;
    slots.push({ pageNumber, top, width, height, page, failed: !page && (stopped || failed.has(pageNumber)) });
    top += height + SOURCE_PAGE_GAP;
  }
  return { pageWidth, slots, height: Math.max(0, top - SOURCE_PAGE_GAP) };
}

/** The page holding the reading line, a little below the top of the viewport. */
export function sourcePageAtScroll(slots: readonly SourcePageSlot[], scrollTop: number) {
  const line = scrollTop - SOURCE_PAGE_PADDING + SOURCE_PAGE_GAP;
  let current = slots[0]?.pageNumber ?? 1;
  for (const slot of slots) {
    if (slot.top > line) break;
    current = slot.pageNumber;
  }
  return current;
}
