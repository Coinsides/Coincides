import {
  createDefaultNoteBindingSection,
  createDefaultNoteBindingSettings,
  NOTE_BINDING_SLOT_NAMES,
  type NoteBindingNumberFormat,
  type NoteBindingSection,
  type NoteBindingSettings,
  type NoteBindingSlotName,
} from '../../../../../shared/types/noteBinding';
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

export interface CreateBindingPageFrameSlotsInput {
  pageFrame: PageFrameModel;
  /** One-based system page ordinal, never the editable display counter. */
  mechanicalPageNumber: number;
  bindingSettings?: NoteBindingSettings | null;
  /** A3 may identify a cover without creating or storing a separate slot family. */
  isCover?: boolean;
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

function slotId(frameId: string, kind: PageFrameSlot['kind'] | NoteBindingSlotName): string {
  return `${frameId}:slot:${kind}`;
}

/** Display counters have no bearing on frame IDs, order, or pagination. */
export function formatBindingCounter(value: number, format: NoteBindingNumberFormat): string {
  const number = Math.max(1, Number.isFinite(value) ? Math.floor(value) : 1);
  if (format === 'arabic') return String(number);
  const numerals: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let remaining = number;
  let text = '';
  for (const [unit, numeral] of numerals) {
    const count = Math.floor(remaining / unit);
    text += numeral.repeat(count);
    remaining %= unit;
  }
  return format === 'roman-lower' ? text.toLowerCase() : text;
}

/** A section includes its start and ends immediately before the next start. */
export function resolveBindingSection(settings: NoteBindingSettings, mechanicalPageNumber: number): NoteBindingSection {
  let section: NoteBindingSection | undefined;
  for (const candidate of settings.sections) {
    if (candidate.startPage <= mechanicalPageNumber
      && (!section || candidate.startPage > section.startPage)) section = candidate;
  }
  return section || createDefaultNoteBindingSection();
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

/** Project note-owned binding into the existing slot model. No per-page storage. */
export function createBindingPageFrameSlots({
  pageFrame,
  mechanicalPageNumber,
  bindingSettings,
  isCover = false,
}: CreateBindingPageFrameSlotsInput): PageFrameSlots {
  const settings = bindingSettings || createDefaultNoteBindingSettings();
  const ordinal = Math.max(1, Number.isFinite(mechanicalPageNumber) ? Math.floor(mechanicalPageNumber) : 1);
  const section = resolveBindingSection(settings, ordinal);
  const displayPageNumber = section.pageNumber.startAt + ordinal - section.startPage;
  const silent = !settings.enabled || (settings.dropFolioOnCover && (isCover || mechanicalPageNumber === 0));
  const rects = resolvePageFrameSlotRects(pageFrame);
  const entries: NonNullable<PageFrameSlots['entries']> = {};
  for (const position of NOTE_BINDING_SLOT_NAMES) {
    const [row, align] = position.split('-') as ['header' | 'footer', PageFrameSlot['align']];
    const settingsForSlot = section.slots[position];
    const isPageNumber = section.pageNumber.enabled && section.pageNumber.slot === position;
    // Footer positions use the existing folio baseline; the footer-center
    // default therefore stays at the pre-A2 page-number position.
    const rowRect = row === 'header' ? rects.header : rects.pageNumber;
    const width = rowRect.width / 3;
    const column = align === 'left' ? 0 : align === 'center' ? 1 : 2;
    const text = isPageNumber
      ? section.pageNumber.prefix + formatBindingCounter(displayPageNumber, section.pageNumber.format) + section.pageNumber.suffix
      : settingsForSlot.text;
    entries[position] = {
      ...createSlot({
        pageFrame,
        kind: isPageNumber ? 'page_number' : row,
        rect: {
          x: rowRect.x + width * column + settingsForSlot.offsetX,
          y: rowRect.y + settingsForSlot.offsetY,
          width,
          height: rowRect.height,
        },
        enabled: !silent && (isPageNumber || section.headerFooterEnabled),
        text,
        textSource: isPageNumber ? 'generated' : text.trim() ? 'metadata_text' : 'empty',
      }),
      slotId: slotId(pageFrame.id, position),
      position,
      align,
      offset: { x: settingsForSlot.offsetX, y: settingsForSlot.offsetY },
      style: { ...settingsForSlot.style },
      bindingSectionId: section.id,
      mechanicalPageNumber,
      ...(isPageNumber ? { displayPageNumber } : {}),
    };
  }
  return {
    entries,
    header: entries['header-center'],
    footer: entries['footer-center'],
    pageNumber: section.pageNumber.enabled ? entries[section.pageNumber.slot] : undefined,
  };
}

/** All consumers enumerate here so compatibility aliases never double-render. */
export function listPageFrameSlots(slots: PageFrameSlots = {}): PageFrameSlot[] {
  const candidates = slots.entries
    ? NOTE_BINDING_SLOT_NAMES.map((position) => slots.entries![position])
    : [slots.header, slots.footer, slots.pageNumber];
  const seen = new Set<string>();
  return candidates.filter((slot): slot is PageFrameSlot => {
    if (!slot || seen.has(slot.slotId)) return false;
    seen.add(slot.slotId);
    return true;
  });
}

/** Flow starts below enabled header furniture, relative to the stored content
 * origin. Keep authored walls and slot geometry intact, including legacy top: 0. */
export function resolvePageFrameHeaderReservation(input: CreateBindingPageFrameSlotsInput): number {
  if (input.isCover || input.pageFrame.templateId === 'screen_note'
    || input.pageFrame.background?.kind === 'screen') return 0;
  const contentTop = input.pageFrame.y + input.pageFrame.contentInset.top;
  return Math.max(0, ...listPageFrameSlots(createBindingPageFrameSlots(input))
    .filter((slot) => slot.enabled && slot.position?.startsWith('header-'))
    .map((slot) => slot.rect.y + slot.rect.height - contentTop));
}

/** Apply presentation geometry once, preserving aliases to the projected slots. */
export function mapPageFrameSlots(slots: PageFrameSlots, project: (slot: PageFrameSlot) => PageFrameSlot): PageFrameSlots {
  const mapped = new Map<string, PageFrameSlot>();
  const entries: NonNullable<PageFrameSlots['entries']> = {};
  for (const slot of listPageFrameSlots(slots)) {
    const result = project(slot);
    mapped.set(slot.slotId, result);
    if (slot.position) entries[slot.position] = result;
  }
  const alias = (slot?: PageFrameSlot) => slot && mapped.get(slot.slotId);
  return {
    ...(slots.entries ? { entries } : {}),
    header: alias(slots.header),
    footer: alias(slots.footer),
    pageNumber: alias(slots.pageNumber),
  };
}

export function summarizePageFrameSlotsForAI(slots: PageFrameSlots = {}): string[] {
  return listPageFrameSlots(slots)
    .map((slot) => {
      const state = slot.enabled ? 'enabled' : 'disabled';
      const text = slot.text || slot.textSource;
      return `${slot.kind}: ${text} (${state}, ${slot.textSource})`;
    });
}
