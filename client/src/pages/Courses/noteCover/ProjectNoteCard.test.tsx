import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoteCoverFrame } from '@shared/types';
import { ProjectNotesSection } from '../CourseDetail';

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), delete: vi.fn(), editor: vi.fn() }));
vi.mock('@/services/api', () => ({ default: mocks }));
// Controller tests isolate the cropper; its geometry and actual component have separate suites.
vi.mock('./NoteCoverEditor', () => ({
  NoteCoverEditor: (props: { initialFrame?: NoteCoverFrame; onSave: (frame: NoteCoverFrame) => void; onCancel: () => void; error?: string }) => {
    mocks.editor(props);
    return <div role="dialog" aria-label="Test crop editor">
      <button onClick={() => props.onSave(props.initialFrame ?? { crop: { x: 0, y: 25, width: 100, height: 50 }, zoom: 1 })}>Save</button>
      <button onClick={props.onCancel}>Cancel</button>
      {props.error && <p role="alert">{props.error}</p>}
    </div>;
  },
}));

const frame = { crop: { x: 12.5, y: 25, width: 50, height: 50 }, zoom: 2 };
const cover = { assetId: 'cover-asset', card: frame };
const note = { id: 'cover-note', title: 'Cover test', description: 'Existing description', updated_at: '2026-09-13T00:00:00Z' };
const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const closeDialog = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
const createUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const revokeUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

function setup(metadata?: unknown) {
  const refresh = vi.fn().mockResolvedValue(undefined);
  const toast = vi.fn();
  const rendered = render(<ProjectNotesSection notes={[{ ...note, metadata }]} status="active" onStatusChange={vi.fn()}
    onCreateNote={vi.fn()} onOpenNote={vi.fn()} refreshNotes={refresh} addToast={toast} />);
  return { ...rendered, refresh, toast };
}
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false; } });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:cover-test') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  mocks.get.mockImplementation(async (url: string) => ({ data: url.endsWith('/blob') ? new Blob(['image']) : {
    metadata: { layout: 'kept', binding: { header: 'kept header', cover }, custom: 'newest value' },
  } }));
  mocks.put.mockResolvedValue({ data: {} });
  mocks.post.mockResolvedValue({ data: { id: 'uploaded-cover' } });
});
afterEach(() => {
  cleanup();
  if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (closeDialog) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeDialog); else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  if (createUrl) Object.defineProperty(URL, 'createObjectURL', createUrl); else Reflect.deleteProperty(URL, 'createObjectURL');
  if (revokeUrl) Object.defineProperty(URL, 'revokeObjectURL', revokeUrl); else Reflect.deleteProperty(URL, 'revokeObjectURL');
});

describe('Project Notes cover projection and actions', () => {
  it('keeps the original content and issues no requests without a slot, even with media hints', () => {
    const { container } = setup({ media: { assetId: 'do-not-infer' }, cover, blocks: [{ type: 'image', assetId: 'do-not-infer' }] });
    expect(container.querySelector('[data-note-cover-banner]')).toBeNull();
    expect(screen.getByText(note.description)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open note Cover test' }).children).toHaveLength(2);
    expect(screen.getByRole('button', { name: '添加封面' })).toBeTruthy();
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('reads only binding.cover and renders its percentages in a full width 2:1 band', async () => {
    const { container, unmount } = setup({ binding: { cover } });
    await waitFor(() => expect(container.querySelector('[data-note-cover-banner] img')).toBeTruthy());
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith('/canvas-assets/cover-asset/blob', { responseType: 'blob' });
    const banner = container.querySelector<HTMLElement>('[data-note-cover-banner]')!;
    expect(banner.style.aspectRatio).toBe('2');
    const image = banner.querySelector('img')!;
    expect(image.style.width).toBe('200%');
    expect(image.style.height).toBe('200%');
    expect(image.style.left).toBe('-25%');
    expect(image.style.top).toBe('-50%');
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cover-test');
  });

  it('reopens the saved frame verbatim and Cancel performs no metadata write', async () => {
    setup({ binding: { cover } });
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '重新取景' }));
    await screen.findByRole('dialog', { name: 'Test crop editor' });
    expect(mocks.editor.mock.lastCall?.[0].initialFrame).toEqual(frame);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('clears only the slot, refreshes the card immediately, and never deletes an asset', async () => {
    const { container, refresh } = setup({ binding: { cover } });
    fireEvent.click(screen.getByRole('button', { name: '移除' }));
    await waitFor(() => expect(mocks.put).toHaveBeenCalledWith('/notes/cover-note', { metadata: {
      layout: 'kept', binding: { header: 'kept header', cover: null }, custom: 'newest value',
    } }));
    await waitFor(() => expect(container.querySelector('[data-note-cover-banner]')).toBeNull());
    expect(refresh).toHaveBeenCalledOnce();
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('uploads with provenance, enters crop, and writes no slot until Save', async () => {
    const { container } = setup();
    fireEvent.click(screen.getByRole('button', { name: '添加封面' }));
    const file = new File(['image'], 'cover.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('选择封面图片'), { target: { files: [file] } });
    await screen.findByRole('dialog', { name: 'Test crop editor' });
    const [url, form] = mocks.post.mock.calls[0];
    expect(url).toBe('/canvas-assets/images');
    expect(form.get('file')).toBe(file);
    expect(form.get('note_id')).toBe(note.id);
    expect(form.get('source')).toBe('note_cover_upload');
    expect(mocks.put).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mocks.put).toHaveBeenCalledWith('/notes/cover-note', expect.objectContaining({ metadata: expect.objectContaining({
      binding: { header: 'kept header', cover: { assetId: 'uploaded-cover', card: { crop: { x: 0, y: 25, width: 100, height: 50 }, zoom: 1 } } },
    }) })));
    await waitFor(() => expect(container.querySelector('[data-note-cover-banner]')).toBeTruthy());
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('supports drag/drop replacement and keeps the original slot when cancelled', async () => {
    setup({ binding: { cover } });
    fireEvent.click(screen.getByRole('button', { name: '更换封面' }));
    const file = new File(['new image'], 'replacement.png', { type: 'image/png' });
    fireEvent.drop(screen.getByText('拖放图片到这里，或选择图片').parentElement!, { dataTransfer: { files: [file] } });
    await screen.findByRole('dialog', { name: 'Test crop editor' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '重新取景' }));
    await screen.findByRole('dialog', { name: 'Test crop editor' });
    expect(mocks.editor.mock.lastCall?.[0].initialFrame).toEqual(frame);
  });

  it('retains crop and the old card after a failed save and permits retry', async () => {
    mocks.put.mockRejectedValueOnce(new Error('save unavailable'));
    setup({ binding: { cover } });
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '重新取景' }));
    await screen.findByRole('dialog', { name: 'Test crop editor' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(mocks.editor.mock.lastCall?.[0].initialFrame).toEqual(frame);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.put).toHaveBeenCalledTimes(2);
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
