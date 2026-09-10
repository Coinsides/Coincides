import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferenceTag, referenceColor } from './ReferenceTag';
import { ANNOTATION_COLOR_OPTIONS } from '@/pages/Notes/canvasEngine/annotationColorService';
const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));
beforeEach(() => { vi.resetAllMocks(); http.get.mockResolvedValue({ data: { title: 'Original note', status: 'active' } }); });
describe('reference provenance tags', () => {
  it.each(ANNOTATION_COLOR_OPTIONS)('keeps $token inside every health mark without adding face text', (color) => {
    const noteId = Array.from({ length: 100 }, (_, index) => `synthetic-palette-note-${index}`)
      .find((candidate) => referenceColor(candidate).token === color.token);
    expect(noteId).toBeDefined();
    const states = ['active', 'drifted', 'lost'] as const;
    const view = render(<>{states.map((health) => <ReferenceTag key={health} noteId={noteId} health={health}/>)}</>);
    const tags = screen.getAllByRole('button', { name: 'Reference details' });
    expect(view.container.textContent).toBe('');
    expect(tags.map((tag) => tag.getAttribute('data-reference-health'))).toEqual(states);
    for (const tag of tags) {
      expect(tag.getAttribute('data-reference-color')).toBe(color.token);
      expect(tag.style.getPropertyValue('--reference-color')).toBe(color.accent);
      expect(tag.style.getPropertyValue('--reference-ink')).toBe(color.accent);
      expect(tag.style.getPropertyValue('--reference-fill')).toBe(color.background);
      expect(tag.querySelector('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(http.get).not.toHaveBeenCalled();
  });
  it('uses the existing slate family for screen marks with no origin note', () => {
    const slate = ANNOTATION_COLOR_OPTIONS.find((color) => color.token === 'annotation-slate')!;
    const view = render(<>{(['active', 'drifted', 'lost'] as const).map((health) =>
      <ReferenceTag key={health} health={health} originBoardTitle="Synthetic chalk board"/>)}</>);
    expect(view.container.textContent).toBe('');
    for (const tag of screen.getAllByRole('button', { name: 'Reference details' })) {
      expect(tag.style.getPropertyValue('--reference-color')).toBe('var(--text-secondary)');
      expect(tag.style.getPropertyValue('--reference-ink')).toBe(slate.accent);
      expect(tag.style.getPropertyValue('--reference-fill')).toBe(slate.background);
    }
    expect(http.get).not.toHaveBeenCalled();
  });
  it('keeps provenance off the face, shares the annotation palette and distinguishes anchor shapes', async () => {
    render(<><ReferenceTag noteId="note-a" health="active" blockId="block-a" startOffset={4} endOffset={9}/>
      <ReferenceTag noteId="note-a" health="drifted"/><ReferenceTag noteId="note-b" health="lost"/></>);
    const tags = screen.getAllByRole('button', { name: 'Reference details' });
    expect(tags.map((tag) => tag.textContent)).toEqual(['', '', '']);
    expect(tags[0].getAttribute('data-reference-color')).toBe(tags[1].getAttribute('data-reference-color'));
    expect(tags[0].getAttribute('data-reference-color')).not.toBe(tags[2].getAttribute('data-reference-color'));
    expect(tags.map((tag) => tag.getAttribute('data-reference-health'))).toEqual(['active', 'drifted', 'lost']);
    expect(ANNOTATION_COLOR_OPTIONS).toHaveLength(6);
    expect(ANNOTATION_COLOR_OPTIONS).toContain(referenceColor('note-a'));
    expect(http.get).not.toHaveBeenCalled();
    fireEvent.click(tags[0]);
    const details = screen.getByRole('dialog', { name: 'Reference details' });
    await within(details).findByText('Original note');
    expect(within(details).getByText('Block block-a · characters 5–9')).toBeTruthy();
    expect(within(details).getByRole('link', { name: 'Open source note' }).getAttribute('href')).toBe('#/notes/note-a');
    fireEvent.keyDown(details, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(tags[0]);
  });
  it('keeps retirement in the existing drifted details without introducing another face state', async () => {
    const view = render(<ReferenceTag noteId="note-a" health="drifted" retired/>);
    const tag = screen.getByRole('button', { name: 'Reference details' });
    expect(view.container.textContent).toBe('');
    expect(tag.getAttribute('data-reference-health')).toBe('drifted');
    fireEvent.click(tag);
    const details = screen.getByRole('dialog', { name: 'Reference details' });
    await within(details).findByText('Original note');
    expect(within(details).getByText(/Drifted:.*This item is retired\./)).toBeTruthy();
    expect(tag.getAttribute('data-reference-health')).toBe('drifted');
    expect(tag.textContent).toBe('');
  });
  it('opens the source through the existing callback and closes details with focus restored', async () => {
    const onOpenSource = vi.fn();
    const onParentClick = vi.fn();
    render(<div onClick={onParentClick}><ReferenceTag noteId="note-a" health="active" onOpenSource={onOpenSource}/></div>);
    const tag = screen.getByRole('button', { name: 'Reference details' });
    fireEvent.click(tag);
    const details = screen.getByRole('dialog', { name: 'Reference details' });
    await within(details).findByText('Original note');
    expect(onOpenSource).not.toHaveBeenCalled();
    fireEvent.click(within(details).getByRole('button', { name: 'Open source note' }));
    expect(onOpenSource).toHaveBeenCalledTimes(1);
    expect(onParentClick).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(tag);
  });
  it('keeps a failed source read visible and retryable', async () => {
    http.get.mockRejectedValueOnce(new Error('Synthetic read failure'));
    render(<ReferenceTag noteId="note-a" noteTitle="Known note" health="drifted"/>);
    fireEvent.click(screen.getByRole('button', { name: 'Reference details' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Could not load');
    expect(screen.getByText(/last valid snapshot/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(await screen.findByText('Original note')).toBeTruthy();
  });
});
