import { describe, expect, it } from 'vitest';
import {
  createDefaultNoteBindingSection,
  createDefaultNoteBindingSettings,
  NOTE_BINDING_SLOT_NAMES,
  type NoteBindingSettings,
} from '../../../../../shared/types/noteBinding';
import { resolveDocumentPageFlowPlan, type PageFlowBlock } from './documentPageFlowService';
import { createPageStackFromFrame } from './pageStackCollectionService';
import {
  createBindingPageFrameSlots,
  createDefaultPageFrameSlots,
  formatBindingCounter,
  listPageFrameSlots,
  mapPageFrameSlots,
  resolvePageFrameSlotRects,
  summarizePageFrameSlotsForAI,
} from './pageFrameSlotService';
import type { PageFrameCollectionModel, PageFrameModel } from './types';

function frame(id = 'paper', width = 904, height = 1278, y = 140): PageFrameModel {
  return { id, role: 'primary_page_frame', templateId: 'a4_portrait', pageSize: 'A4',
    x: 80, y, width, height, exportable: true,
    contentInset: { top: 72, right: 72, bottom: 72, left: 72 } };
}

function project(bindingSettings?: NoteBindingSettings | null, mechanicalPageNumber = 1, isCover = false) {
  return createBindingPageFrameSlots({ pageFrame: frame(), bindingSettings, mechanicalPageNumber, isCover });
}

describe('A2 note-owned binding projection into page-frame slots', () => {
  it('gives an existing note six default slots and a footer-center counter without storing page settings', () => {
    const paper = frame();
    const before = structuredClone(paper);
    const slots = createBindingPageFrameSlots({ pageFrame: paper, mechanicalPageNumber: 1, bindingSettings: null });
    expect(listPageFrameSlots(slots).map((slot) => slot.position)).toEqual(NOTE_BINDING_SLOT_NAMES);
    expect(listPageFrameSlots(slots).every((slot) => slot.enabled)).toBe(true);
    expect(slots.pageNumber).toMatchObject({ kind: 'page_number', position: 'footer-center',
      text: '1', textSource: 'generated', mechanicalPageNumber: 1, displayPageNumber: 1 });
    expect(slots.pageNumber).toBe(slots.entries?.['footer-center']);
    expect(slots.pageNumber?.rect.y).toBe(resolvePageFrameSlotRects(paper).pageNumber.y);
    expect(paper).toEqual(before);
  });

  it('cuts sections at one-based mechanical starts and independently restarts each display counter', () => {
    const settings = createDefaultNoteBindingSettings();
    settings.sections[0]!.pageNumber.startAt = 8;
    const body = createDefaultNoteBindingSection('body', 3);
    body.pageNumber.format = 'roman-lower';
    const appendix = createDefaultNoteBindingSection('appendix', 6);
    appendix.pageNumber.format = 'roman-upper';
    appendix.pageNumber.startAt = 4;
    settings.sections.push(body, appendix);
    const before = structuredClone(settings);
    const slots = [1, 2, 3, 4, 5, 6, 7].map((ordinal) => project(settings, ordinal).pageNumber!);
    expect(slots.map((slot) => slot.text)).toEqual(['8', '9', 'i', 'ii', 'iii', 'IV', 'V']);
    expect(slots.map((slot) => slot.bindingSectionId)).toEqual(['default', 'default', 'body', 'body', 'body', 'appendix', 'appendix']);
    expect(slots.map((slot) => slot.mechanicalPageNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(settings).toEqual(before);
  });

  it.each([
    ['arabic', '49'], ['roman-lower', 'xlix'], ['roman-upper', 'XLIX'],
  ] as const)('formats the %s counter with literal prefix and suffix around the mandatory number', (format, expected) => {
    const settings = createDefaultNoteBindingSettings();
    settings.sections[0]!.pageNumber = { ...settings.sections[0]!.pageNumber,
      startAt: 49, format, prefix: '第 ', suffix: ' 页' };
    expect(project(settings).pageNumber?.text).toBe(`第 ${expected} 页`);
    settings.sections[0]!.pageNumber.prefix = '';
    settings.sections[0]!.pageNumber.suffix = '';
    expect(project(settings).pageNumber?.text).toBe(expected);
  });

  it('uses subtractive Roman notation across hundreds and thousands', () => {
    expect(formatBindingCounter(1994, 'roman-upper')).toBe('MCMXCIV');
    expect(formatBindingCounter(3999, 'roman-lower')).toBe('mmmcmxcix');
  });

  it('lays out three distinct aligned positions per row using each target frame geometry', () => {
    const first = project();
    const narrow = frame('narrow', 700, 1000, 1800);
    narrow.contentInset.left = 50;
    narrow.contentInset.right = 80;
    const second = createBindingPageFrameSlots({ pageFrame: narrow, mechanicalPageNumber: 2 });
    for (const slots of [first, second]) {
      const headers = listPageFrameSlots(slots).filter((slot) => slot.position?.startsWith('header-'));
      expect(headers.map((slot) => slot.align)).toEqual(['left', 'center', 'right']);
      expect(headers[1]!.rect.x).toBeCloseTo(headers[0]!.rect.x + headers[0]!.rect.width);
      expect(headers[2]!.rect.x).toBeCloseTo(headers[1]!.rect.x + headers[1]!.rect.width);
      expect(new Set(listPageFrameSlots(slots).map((slot) => slot.slotId)).size).toBe(6);
    }
    expect(second.entries?.['header-left']?.rect).toMatchObject({ x: 130, y: 1818, width: 190 });
    expect(second.pageNumber?.rect.y).toBe(2762);
  });

  it.each(NOTE_BINDING_SLOT_NAMES)('moves the counter to %s without duplicating it or losing the manual text', (position) => {
    const settings = createDefaultNoteBindingSettings();
    const section = settings.sections[0]!;
    for (const slot of NOTE_BINDING_SLOT_NAMES) section.slots[slot].text = slot;
    section.pageNumber.slot = position;
    const slots = project(settings);
    expect(listPageFrameSlots(slots).filter((slot) => slot.kind === 'page_number')).toHaveLength(1);
    expect(slots.entries?.[position]).toMatchObject({ kind: 'page_number', text: '1', textSource: 'generated' });
    expect(section.slots[position].text).toBe(position);
    section.pageNumber.enabled = false;
    expect(project(settings).entries?.[position]).toMatchObject({ text: position, textSource: 'metadata_text' });
  });

  it('preserves per-slot overrides and offsets while leaving unset styles to the skin', () => {
    const settings = createDefaultNoteBindingSettings();
    settings.sections[0]!.slots['header-left'] = {
      text: '手填书名', offsetX: 8, offsetY: -3,
      style: { fontFamily: 'serif', fontSize: 15, fontWeight: 600, colorToken: 'accent', italic: true },
    };
    const before = structuredClone(settings);
    const slots = project(settings);
    expect(slots.entries?.['header-left']).toMatchObject({ text: '手填书名',
      rect: { x: 160, y: 155 }, offset: { x: 8, y: -3 },
      style: { fontFamily: 'serif', fontSize: 15, fontWeight: 600, colorToken: 'accent', italic: true } });
    expect(slots.entries?.['header-right']?.style).toEqual({});
    expect(settings).toEqual(before);
    expect(slots.entries?.['header-left']?.style).not.toBe(settings.sections[0]!.slots['header-left'].style);
  });

  it('supports whole-binding, manual-furniture and page-number switches independently', () => {
    const settings = createDefaultNoteBindingSettings();
    settings.enabled = false;
    expect(listPageFrameSlots(project(settings)).every((slot) => !slot.enabled)).toBe(true);
    settings.enabled = true;
    settings.sections[0]!.headerFooterEnabled = false;
    expect(listPageFrameSlots(project(settings)).filter((slot) => slot.enabled).map((slot) => slot.kind)).toEqual(['page_number']);
    settings.sections[0]!.pageNumber.enabled = false;
    expect(listPageFrameSlots(project(settings)).every((slot) => !slot.enabled)).toBe(true);
    settings.sections[0]!.headerFooterEnabled = true;
    expect(listPageFrameSlots(project(settings)).every((slot) => slot.enabled && slot.kind !== 'page_number')).toBe(true);
  });

  it('reserves cover silence for page zero or a future cover flag without creating a cover', () => {
    const settings = createDefaultNoteBindingSettings();
    expect(listPageFrameSlots(project(settings, 0)).every((slot) => !slot.enabled)).toBe(true);
    expect(listPageFrameSlots(project(settings, 1, true)).every((slot) => !slot.enabled)).toBe(true);
    settings.dropFolioOnCover = false;
    expect(listPageFrameSlots(project(settings, 1, true)).every((slot) => slot.enabled)).toBe(true);
    expect(Object.keys(project(settings, 1, true).entries!)).toHaveLength(6);
  });

  it('keeps legacy slots compatible while enumerating and projecting six-slot aliases exactly once', () => {
    const legacy = createDefaultPageFrameSlots({ pageFrame: frame(), pageIndex: 1, totalPages: 4 });
    expect(listPageFrameSlots(legacy)).toHaveLength(3);
    expect(legacy.pageNumber?.text).toBe('2 / 4');
    const slots = project();
    let calls = 0;
    const mapped = mapPageFrameSlots(slots, (slot) => {
      calls += 1;
      return { ...slot, rect: { ...slot.rect, y: slot.rect.y - 140 } };
    });
    expect(calls).toBe(6);
    expect(listPageFrameSlots(mapped)).toHaveLength(6);
    expect(mapped.pageNumber).toBe(mapped.entries?.['footer-center']);
    expect(mapped.footer).toBe(mapped.pageNumber);
    expect(mapped.pageNumber?.rect.y).toBe(slots.pageNumber!.rect.y - 140);
    expect(summarizePageFrameSlotsForAI(mapped)).toHaveLength(6);
  });

  it('reprojects counters over A1 generated pages after text and target-paper geometry change', () => {
    const first = { ...frame('p1', 120, 100, 0), x: 0,
      contentInset: { top: 10, right: 10, bottom: 10, left: 10 } };
    const settings = createDefaultNoteBindingSettings();
    const body = createDefaultNoteBindingSection('body', 2);
    body.pageNumber.format = 'roman-upper';
    body.pageNumber.startAt = 4;
    settings.sections.push(body);
    const before = structuredClone(settings);
    const paginate = (text: string, paper: PageFrameModel) => {
      const collection: PageFrameCollectionModel = { pageFrames: [paper], primaryFrameId: paper.id,
        pageStacks: [createPageStackFromFrame(paper, { id: 'stack' })] };
      const block: PageFlowBlock = { blockId: 'flow', kind: 'text', text,
        layout: { x: 0, y: 700, width: 999, height: 40, width_mode: 'auto',
          frame_id: paper.id, coordinate_space: 'page_frame_local', surface: 'formal_page' } };
      const plan = resolveDocumentPageFlowPlan({ collection, blocks: [block], measureTextLines: (input) => {
        const columns = Math.max(1, Math.floor((input.width - 20) / 10));
        const lines = [];
        for (let start = input.startOffset || 0; start < input.text.length; start += columns) {
          const end = Math.min(input.text.length, start + columns);
          lines.push({ startOffset: start, endOffset: end, widthPx: (end - start) * 10, heightPx: 20 });
        }
        return { lines };
      } });
      return plan.frames.map(({ frame: target }, index) => createBindingPageFrameSlots({
        pageFrame: target, mechanicalPageNumber: index + 1, bindingSettings: settings,
      }).pageNumber!);
    };
    expect(paginate('甲'.repeat(60), first).map((slot) => slot.text)).toEqual(['1', 'IV', 'V']);
    expect(paginate('甲'.repeat(12), first).map((slot) => slot.text)).toEqual(['1']);
    const narrow = { ...first, width: 80 };
    const reflowed = paginate('甲'.repeat(60), narrow);
    expect(reflowed.map((slot) => slot.text)).toEqual(['1', 'IV', 'V', 'VI', 'VII']);
    expect(reflowed.map((slot) => slot.mechanicalPageNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(settings).toEqual(before);
  });
});
