import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Area, CropperProps } from 'react-easy-crop';
import type { NoteCoverFrame } from '@shared/types';
import { NoteCoverEditor } from './NoteCoverEditor';

const captured = vi.hoisted(() => ({ props: null as CropperProps | null }));

vi.mock('react-easy-crop', () => ({
  default: (props: CropperProps) => {
    captured.props = props;
    return <div data-testid="cropper" tabIndex={0} aria-label="Cover crop area" />;
  },
}));

function cropper() {
  if (!captured.props) throw new Error('Cropper has not mounted');
  return captured.props;
}

function loadMedia() {
  act(() => {
    cropper().onCropSizeChange?.({ width: 600, height: 300 });
    cropper().onMediaLoaded?.({ width: 1200, height: 300, naturalWidth: 1600, naturalHeight: 400 });
    const area = { x: 25, y: 0, width: 50, height: 100 };
    cropper().onCropComplete?.(area, area);
  });
}

describe('NoteCoverEditor session', () => {
  beforeEach(() => { captured.props = null; });

  it('disables Save until the image loads and starts at centered cover fit', () => {
    const onSave = vi.fn();
    render(<NoteCoverEditor imageUrl="blob:cover" onSave={onSave} onCancel={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
    expect(cropper().crop).toEqual({ x: 0, y: 0 });
    expect(cropper().zoom).toBe(1);
    expect(cropper().minZoom).toBe(1);
    expect(cropper().aspect).toBe(2);
    expect(cropper().objectFit).toBe('cover');
    expect(cropper().restrictPosition).toBe(true);
    expect(cropper().zoomWithScroll).toBe(true);
    loadMedia();
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ crop: { x: 25, y: 0, width: 50, height: 100 }, zoom: 1 });
  });

  it('replays the saved percentages and returns their exact values if unchanged', () => {
    const frame: NoteCoverFrame = {
      crop: { x: 31.234567890123, y: 26.234567890123, width: 25, height: 50 }, zoom: 2,
    };
    const onSave = vi.fn();
    render(<NoteCoverEditor imageUrl="blob:cover" initialFrame={frame} onSave={onSave} onCancel={vi.fn()} />);
    expect(cropper().initialCroppedAreaPercentages).toBe(frame.crop);
    expect(cropper().zoom).toBe(2);
    loadMedia();
    // The library can emit a centered frame before replay, and tiny float
    // differences on resize. Neither event is an edit by the user.
    act(() => { cropper().onCropComplete?.({ ...frame.crop, x: frame.crop.x + 1e-12 }, {} as Area); });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith(frame);
    expect(onSave.mock.calls[0][0]).toBe(frame);
  });

  it('saves the new percentage area only after drag and slider changes are confirmed', () => {
    const onSave = vi.fn();
    render(<NoteCoverEditor imageUrl="blob:cover" onSave={onSave} onCancel={vi.fn()} />);
    loadMedia();
    act(() => {
      cropper().onInteractionStart?.({ source: 'mouse' });
      cropper().onCropChange({ x: 300, y: 0 });
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), { target: { value: '2' } });
    expect(cropper().zoom).toBe(2);
    const area = { x: 20, y: 25, width: 25, height: 50 };
    act(() => { cropper().onCropAreaChange?.(area, {} as Area); });
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ crop: area, zoom: 2 });
  });

  it('keeps Cancel available after load failure and never submits a crop', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<NoteCoverEditor imageUrl="blob:broken" onSave={onSave} onCancel={onCancel} />);
    act(() => { cropper().mediaProps.onError?.({} as never); });
    expect(screen.getByRole('alert').textContent).toContain('Could not load');
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('supports Escape, confines Tab focus, and restores the opening control', () => {
    const onCancel = vi.fn();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const view = render(<NoteCoverEditor imageUrl="blob:cover" onSave={vi.fn()} onCancel={onCancel} />);
    loadMedia();
    const save = screen.getByRole('button', { name: 'Save' });
    save.focus();
    fireEvent.keyDown(save, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByTestId('cropper'));
    fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(save);
    fireEvent.keyDown(save, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
    view.unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('blocks duplicate confirmation and cancellation while saving', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const view = render(<NoteCoverEditor imageUrl="blob:cover" onSave={onSave} onCancel={onCancel} />);
    loadMedia();
    view.rerender(<NoteCoverEditor imageUrl="blob:cover" busy error="Save failed" onSave={onSave} onCancel={onCancel} />);
    expect((screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
    expect(cropper().zoomWithScroll).toBe(false);
    expect(screen.getByRole('alert').textContent).toBe('Save failed');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
