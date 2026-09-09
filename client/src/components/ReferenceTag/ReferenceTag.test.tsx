import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferenceTag, referenceColor } from './ReferenceTag';
import { ANNOTATION_COLOR_OPTIONS } from '@/pages/Notes/canvasEngine/annotationColorService';
const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));
beforeEach(() => { vi.resetAllMocks(); http.get.mockResolvedValue({ data: { title: 'Original note', status: 'active' } }); });
describe('reference provenance tags', () => {
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
