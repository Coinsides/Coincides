import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultNoteBindingSettings, createDefaultNoteBindingSection } from '../../../../../../shared/types/noteBinding';
import { buildNoteCanvasRuntimeModel, createPrimaryPageFrame } from '../engineModel';
import { createDefaultDocumentTypographyProfile } from '../typographyProfileService';
import { PageFrameSlotsLayer } from './PageFrameSlotsLayer';
import { NotePageThumbnail, type NotePageThumbnailInput } from './NotePageThumbnail';
import { NotePrintLayer } from './NotePrintLayer';
import { mapPageFrameSlots } from '../pageFrameSlotService';

afterEach(cleanup);
function fixture(bindingSettings = createDefaultNoteBindingSettings()) {
  const first = createPrimaryPageFrame({ id: 'first' });
  const second = { ...first, id: 'second', y: first.y + first.height + 40 };
  const documentTypographyProfile = createDefaultDocumentTypographyProfile();
  const runtime = buildNoteCanvasRuntimeModel({ mode: 'page', primaryPageFrame: first, pageFrames: [first, second],
    blockPlacements: [], viewport: { x: 0, y: 0, width: 1000, height: 800, zoom: 1 }, bindingSettings });
  const input: NotePageThumbnailInput = { noteId: 'paper', noteCanvasRuntime: runtime, visibleBlocks: [],
    blockTextDrafts: {}, blockTextFlowDrafts: {}, blockFieldDrafts: {}, anchorsBySourceRef: {},
    documentTypographyProfile, selectedPageFrameId: first.id };
  return { first, second, input };
}
describe('A2 one binding projection in reading, overview and print', () => {
  it('renders each of six slots once, and keeps canonical printing after reading offsets', () => {
    const settings = createDefaultNoteBindingSettings();
    const section = createDefaultNoteBindingSection('chapter', 2);
    section.pageNumber = { enabled: true, startAt: 4, format: 'roman-upper', prefix: '[', suffix: ']', slot: 'header-right' };
    section.slots['header-left'] = { text: '手填书名', offsetX: 5, offsetY: 3,
      style: { fontFamily: 'serif', fontSize: 18, colorToken: 'accent', italic: true } };
    settings.sections.push(section);
    const { second, input } = fixture(settings);
    const slots = input.noteCanvasRuntime.pageFrameExtensions[1].slots!;
    const reading = render(<PageFrameSlotsLayer slots={mapPageFrameSlots(slots, (slot) => ({ ...slot,
      rect: { ...slot.rect, x: slot.rect.x + 20, y: slot.rect.y - 40 } }))} />);
    expect(reading.container.querySelectorAll('[data-page-frame-slot]')).toHaveLength(6);
    const title = reading.container.querySelector<HTMLElement>('[data-page-frame-slot-position="header-left"]')!;
    expect(title.textContent).toBe('手填书名'); expect(title.style.fontSize).toBe('18px');
    expect(title.style.fontFamily).toBe('Georgia, serif'); expect(title.style.color).toBe('color-mix(in srgb, var(--sk-accent) 65%, var(--sk-ink))');
    expect(reading.container.querySelector('[data-page-frame-slot="page-number"]')?.textContent).toBe('[IV]');
    reading.unmount();
    const thumbnail = render(<NotePageThumbnail input={input} frame={second} pageNumber={2} width={200}
      height={300} scale={0.2} selected={false} renderContent onSelectPage={() => {}} />);
    const thumbFolio = thumbnail.container.querySelector<HTMLElement>('[data-page-frame-slot="page-number"]')!;
    expect(thumbFolio.textContent).toBe('[IV]');
    const localTop = thumbFolio.style.top;
    render(<NotePrintLayer {...input} surfaceMode="page" />);
    act(() => window.dispatchEvent(new Event('beforeprint')));
    const printPage = document.querySelector('[data-note-print-page][data-page-frame-id="second"]')!;
    expect(printPage.querySelectorAll('[data-page-frame-slot]')).toHaveLength(6);
    const printed = printPage.querySelector<HTMLElement>('[data-page-frame-slot="page-number"]')!;
    expect(printed.textContent).toBe('[IV]'); expect(printed.style.top).toBe(localTop);
    expect(slots.pageNumber!.rect.y).toBe(second.y + Number.parseFloat(localTop));
    act(() => window.dispatchEvent(new Event('afterprint')));
  });

  it('keeps default construction binding on and disables the whole projection without changing frames', () => {
    const settings = createDefaultNoteBindingSettings();
    const original = fixture(settings);
    expect(original.input.noteCanvasRuntime.pageFrameExtensions[1].slots?.pageNumber?.text).toBe('2');
    settings.enabled = false;
    const disabled = fixture(settings);
    expect(disabled.input.noteCanvasRuntime.pageFrames).toEqual(original.input.noteCanvasRuntime.pageFrames);
    const rendered = render(<PageFrameSlotsLayer slots={disabled.input.noteCanvasRuntime.pageFrameExtensions[0].slots} />);
    expect(rendered.container.querySelectorAll('[data-page-frame-slot]')).toHaveLength(0);
  });
});
