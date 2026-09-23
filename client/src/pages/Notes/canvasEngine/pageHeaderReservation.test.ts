import { describe, expect, it } from 'vitest';
import { createDefaultNoteBindingSettings } from '../../../../../shared/types/noteBinding';
import { resolveDocumentPageFlowPlan, type PageFlowBlock } from './documentPageFlowService';
import { createPrimaryPageFrame } from './engineModel';
import { createPageStackFromFrame } from './pageStackCollectionService';
import { createBindingPageFrameSlots, listPageFrameSlots } from './pageFrameSlotService';
import { createPageFrameDefaultTypographyProfile } from './pageFrameTypographyService';
import type { PageFrameCollectionModel } from './types';

function fixture(templateId: 'a4_portrait' | 'letter_portrait', top: number, withCover = false) {
  const paper = createPrimaryPageFrame({ id: 'body', templateId });
  paper.contentInset = { ...paper.contentInset, top };
  const cover = { ...paper, id: 'cover', y: -paper.height - 80 };
  const frames = withCover ? [cover, paper] : [paper];
  const collection: PageFrameCollectionModel = { pageFrames: frames, primaryFrameId: paper.id,
    pageStacks: [{ ...createPageStackFromFrame(paper), frameIds: frames.map((frame) => frame.id) }] };
  const bindingSettings = createDefaultNoteBindingSettings();
  bindingSettings.coverPage.frameId = withCover ? cover.id : null;
  bindingSettings.sections[0].slots['header-center'].text = 'Synthetic header';
  const block: PageFlowBlock = { blockId: 'body-text', kind: 'text', text: 'Body text. '.repeat(900),
    layout: { x: 0, y: 0, width: 760, height: 44, width_mode: 'auto', coordinate_space: 'page_frame_local',
      frame_id: paper.id, surface: 'formal_page' } };
  return { collection, bindingSettings, blocks: [block], coverFrameId: withCover ? cover.id : null,
    documentTypography: createPageFrameDefaultTypographyProfile(paper) };
}

describe('page header reservation', () => {
  it.each((['a4_portrait', 'letter_portrait'] as const).flatMap((templateId) =>
    [0, 72].flatMap((top) => [false, true].flatMap((withCover) => [false, true].map((enabled) =>
      ({ templateId, top, withCover, enabled }))))))(
    '$templateId top=$top cover=$withCover header=$enabled has zero first/continuation overlap',
    ({ templateId, top, withCover, enabled }) => {
      const input = fixture(templateId, top, withCover);
      input.bindingSettings.sections[0].headerFooterEnabled = enabled;
      const before = structuredClone(input);
      const plan = resolveDocumentPageFlowPlan(input);
      const contentFrames = plan.frames.filter(({ frame }) => frame.id !== input.coverFrameId);
      expect(contentFrames.length).toBeGreaterThan(2);
      for (const [index, { frame, fragments }] of contentFrames.entries()) {
        const slots = listPageFrameSlots(createBindingPageFrameSlots({ pageFrame: frame,
          mechanicalPageNumber: index + 1, bindingSettings: input.bindingSettings }));
        const headers = slots.filter((slot) => slot.enabled && slot.position?.startsWith('header-'));
        expect(headers).toHaveLength(enabled ? 3 : 0);
        expect(fragments[0].layout.y).toBe(enabled ? Math.max(0, 48 - top) : 0);
        for (const fragment of fragments) {
          const bodyTop = frame.y + frame.contentInset.top + fragment.layout.y;
          for (const header of headers) expect(bodyTop).toBeGreaterThanOrEqual(header.rect.y + header.rect.height);
          expect(bodyTop + fragment.layout.height).toBeLessThanOrEqual(frame.y + frame.height - frame.contentInset.bottom);
        }
      }
      if (withCover) {
        expect(plan.frames[0].fragments).toEqual([]);
        expect(listPageFrameSlots(createBindingPageFrameSlots({ pageFrame: plan.frames[0].frame,
          mechanicalPageNumber: 0, bindingSettings: input.bindingSettings, isCover: true })).every((slot) => !slot.enabled)).toBe(true);
      }
      expect(plan.fragments.map((fragment) => input.blocks[0].text!.slice(fragment.textRange!.start, fragment.textRange!.end)).join(''))
        .toBe(input.blocks[0].text);
      expect(plan.overflows).toEqual([]);
      expect(input).toEqual(before);
    });

  it('reserves section-specific offsets and header folios even when handwritten headers are disabled', () => {
    const input = fixture('a4_portrait', 0, true);
    const section = structuredClone(input.bindingSettings.sections[0]);
    section.id = 'second'; section.startPage = 2;
    section.headerFooterEnabled = false;
    section.pageNumber.slot = 'header-right';
    section.slots['header-right'].offsetY = 25;
    input.bindingSettings.sections.push(section);
    const plan = resolveDocumentPageFlowPlan(input);
    expect(plan.frames[1].fragments[0].layout.y).toBe(48);
    expect(plan.frames.slice(2).every(({ fragments }) => fragments[0].layout.y === 73)).toBe(true);
  });

  it('reports reduced usable capacity for an oversized block without repeatedly advancing empty pages', () => {
    const input = fixture('a4_portrait', 0);
    input.blocks = [{ ...input.blocks[0], kind: 'media', layout: { ...input.blocks[0].layout, height: 1200 } }];
    const plan = resolveDocumentPageFlowPlan(input);
    const usable = input.collection.pageFrames[0].height - 96 - 48;
    expect(plan.fragments).toHaveLength(1);
    expect(plan.overflows).toEqual([expect.objectContaining({ requiredHeight: 1200, availableHeight: usable, overflowPx: 1200 - usable })]);
    expect(plan.fragments[0].layout.y).toBe(48);
  });

  it.each(['separate', 'interleaved', 'merged-reverse'])('uses final mechanical ordinals when stacks append in reverse block order (%s)', (order) => {
    const input = fixture('a4_portrait', 0);
    const first = { ...input.collection.pageFrames[0], height: 320 };
    const second = { ...first, id: 'second-stack', y: 2000 };
    const tail = { ...first, id: 'first-stack-tail', y: 400 };
    input.collection.pageFrames = order !== 'separate' ? [first, second, tail] : [first, second];
    input.collection.pageStacks = [
      { ...createPageStackFromFrame(first), frameIds: order === 'merged-reverse' ? [tail.id, first.id]
        : order === 'interleaved' ? [first.id, tail.id] : [first.id] },
      createPageStackFromFrame(second),
    ];
    const section = structuredClone(input.bindingSettings.sections[0]);
    section.id = 'later'; section.startPage = order === 'merged-reverse' ? 5 : 3; section.slots['header-center'].offsetY = 100;
    input.bindingSettings.sections.push(section);
    input.blocks = [{ ...input.blocks[0], blockId: 'second', text: 'B', layout: { ...input.blocks[0].layout, frame_id: second.id } },
      { ...input.blocks[0], text: 'AAAA' }];
    const measureTextLines = ({ text, startOffset = 0 }: { text: string; startOffset?: number }) => ({
      lines: Array.from(text.slice(startOffset), (_, index) => ({ startOffset: startOffset + index,
        endOffset: startOffset + index + 1, widthPx: 10, heightPx: text === 'B' ? 20 : 100 })),
    });
    const plan = resolveDocumentPageFlowPlan({ ...input, measureTextLines });
    expect(plan.appendedFrameIds.length).toBeGreaterThan(0);
    for (const [index, { frame, fragments }] of plan.frames.entries()) {
      const headers = listPageFrameSlots(createBindingPageFrameSlots({ pageFrame: frame,
        mechanicalPageNumber: index + 1, bindingSettings: input.bindingSettings })).filter((slot) => slot.position?.startsWith('header-'));
      for (const fragment of fragments) for (const slot of headers) {
        expect(frame.y + fragment.layout.y).toBeGreaterThanOrEqual(slot.rect.y + slot.rect.height);
      }
    }
    const replay = resolveDocumentPageFlowPlan({ ...input, collection: plan.collection, measureTextLines });
    expect(replay.fragments).toEqual(plan.fragments);
    expect(replay.appendedFrameIds).toEqual([]);
  });

  it.each([
    { templateId: 'a4_portrait' as const, columns: 101, rows: 43, capacity: 4343 },
    { templateId: 'letter_portrait' as const, columns: 104, rows: 40, capacity: 4160 },
  ])('$templateId retains a full 10pt body capacity of $capacity ASCII characters', ({ templateId, columns, rows, capacity }) => {
    const input = fixture(templateId, 72);
    input.blocks[0].text = 'x'.repeat(capacity + 1);
    const plan = resolveDocumentPageFlowPlan(input);
    expect(plan.fragments).toHaveLength(2);
    expect(plan.fragments[0].lines).toHaveLength(rows);
    expect(plan.fragments[0].lines[0].endOffset).toBe(columns);
    expect(plan.fragments[0].textRange).toEqual({ start: 0, end: capacity });
    expect(plan.fragments[1].textRange).toEqual({ start: capacity, end: capacity + 1 });
    expect(plan.overflows).toEqual([]);
  });
});
