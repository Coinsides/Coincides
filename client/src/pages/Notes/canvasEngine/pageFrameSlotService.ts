import type {
  CanvasRect,
  PageFrameModel,
  PageFrameSlot,
  PageFrameSlots,
} from './types';

export interface CreateDefaultPageFrameSlotsInput {
  pageFrame: PageFrameModel;
  pageIndex?: number;
  totalPages?: number;
  headerFooterEnabled?: boolean;
  pageNumberEnabled?: boolean;
  headerText?: string;
  footerText?: string;
}

export interface FormatPageNumberInput {
  pageIndex?: number;
  totalPages?: number;
}

export interface PageFrameSlotRects {
  header: CanvasRect;
  footer: CanvasRect;
  pageNumber: CanvasRect;
}

const HEADER_SLOT_TOP_INSET = 18;
const HEADER_SLOT_HEIGHT = 30;
const FOOTER_SLOT_BOTTOM_INSET = 72;
const FOOTER_SLOT_HEIGHT = 28;
const PAGE_NUMBER_SLOT_BOTTOM_INSET = 38;
const PAGE_NUMBER_SLOT_HEIGHT = 22;

function slotId(frameId: string, kind: PageFrameSlot['kind']): string {
  return `${frameId}:slot:${kind}`;
}

export function formatPageNumber({
  pageIndex = 0,
  totalPages = 1,
}: FormatPageNumberInput = {}): string {
  const pageNumber = Math.max(1, Math.floor(pageIndex) + 1);
  const normalizedTotal = Math.max(pageNumber, Math.floor(totalPages || 1));
  return normalizedTotal > 1 ? `${pageNumber} / ${normalizedTotal}` : `${pageNumber}`;
}

export function resolvePageFrameSlotRects(pageFrame: PageFrameModel): PageFrameSlotRects {
  const contentRect = {
    x: pageFrame.x + pageFrame.contentInset.left,
    y: pageFrame.y + pageFrame.contentInset.top,
    width: Math.max(0, pageFrame.width - pageFrame.contentInset.left - pageFrame.contentInset.right),
    height: Math.max(0, pageFrame.height - pageFrame.contentInset.top - pageFrame.contentInset.bottom),
  };
  return {
    header: {
      x: contentRect.x,
      y: pageFrame.y + HEADER_SLOT_TOP_INSET,
      width: contentRect.width,
      height: HEADER_SLOT_HEIGHT,
    },
    footer: {
      x: contentRect.x,
      y: pageFrame.y + pageFrame.height - FOOTER_SLOT_BOTTOM_INSET,
      width: contentRect.width,
      height: FOOTER_SLOT_HEIGHT,
    },
    pageNumber: {
      x: contentRect.x,
      y: pageFrame.y + pageFrame.height - PAGE_NUMBER_SLOT_BOTTOM_INSET,
      width: contentRect.width,
      height: PAGE_NUMBER_SLOT_HEIGHT,
    },
  };
}

function createSlot({
  pageFrame,
  kind,
  rect,
  enabled,
  text,
  textSource,
}: {
  pageFrame: PageFrameModel;
  kind: PageFrameSlot['kind'];
  rect: CanvasRect;
  enabled: boolean;
  text: string;
  textSource: PageFrameSlot['textSource'];
}): PageFrameSlot {
  return {
    slotId: slotId(pageFrame.id, kind),
    frameId: pageFrame.id,
    kind,
    enabled,
    rect,
    text,
    textSource,
    align: 'center',
  };
}

export function createDefaultPageFrameSlots({
  pageFrame,
  pageIndex = 0,
  totalPages = 1,
  headerFooterEnabled = true,
  pageNumberEnabled = true,
  headerText = '',
  footerText = '',
}: CreateDefaultPageFrameSlotsInput): PageFrameSlots {
  const rects = resolvePageFrameSlotRects(pageFrame);
  return {
    header: createSlot({
      pageFrame,
      kind: 'header',
      rect: rects.header,
      enabled: headerFooterEnabled,
      text: headerText,
      textSource: headerText.trim() ? 'metadata_text' : 'empty',
    }),
    footer: createSlot({
      pageFrame,
      kind: 'footer',
      rect: rects.footer,
      enabled: headerFooterEnabled,
      text: footerText,
      textSource: footerText.trim() ? 'metadata_text' : 'empty',
    }),
    pageNumber: createSlot({
      pageFrame,
      kind: 'page_number',
      rect: rects.pageNumber,
      enabled: pageNumberEnabled,
      text: formatPageNumber({ pageIndex, totalPages }),
      textSource: 'generated',
    }),
  };
}

export function summarizePageFrameSlotsForAI(slots: PageFrameSlots = {}): string[] {
  return [slots.header, slots.footer, slots.pageNumber]
    .filter((slot): slot is PageFrameSlot => Boolean(slot))
    .map((slot) => {
      const state = slot.enabled ? 'enabled' : 'disabled';
      const text = slot.text || slot.textSource;
      return `${slot.kind}: ${text} (${state}, ${slot.textSource})`;
    });
}
