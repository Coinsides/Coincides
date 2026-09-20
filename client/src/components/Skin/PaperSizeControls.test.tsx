import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaperSizeControls, type PaperSizeControlsProps } from './PaperSizeControls';

const presets = [
  { value: 'a5_portrait', label: 'A5 纵向' }, { value: 'a5_landscape', label: 'A5 横向' },
  { value: 'a4_portrait', label: 'A4 纵向' }, { value: 'a4_landscape', label: 'A4 横向' },
  { value: 'a3_portrait', label: 'A3 纵向' }, { value: 'a3_landscape', label: 'A3 横向' },
  { value: 'letter_portrait', label: 'Letter' }, { value: 'legal_portrait', label: 'Legal' },
];
const fixture = (overrides: Partial<PaperSizeControlsProps> = {}): PaperSizeControlsProps => ({
  presets, selectedPreset: 'a4_portrait', widthMm: 210, heightMm: 297,
  onPresetChange: vi.fn(), layoutMode: false,
  page: { id: 'page-a', label: '第 1 页', widthMm: 210, heightMm: 297, isOverride: false },
  onResize: vi.fn(), onRestore: vi.fn(), ...overrides,
});

describe('paper size controls', () => {
  it('offers the paper family and immediately applies a notebook selection without a separate preview', async () => {
    const props = fixture();
    const { container } = render(<PaperSizeControls {...props} />);
    const select = screen.getByRole('combobox', { name: '整本纸型' });
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(presets.map((preset) => preset.label));
    fireEvent.change(select, { target: { value: 'legal_portrait' } });
    await waitFor(() => expect(props.onPresetChange).toHaveBeenCalledExactlyOnceWith('legal_portrait'));
    expect(container.querySelector('canvas,svg,[data-skin-sample]')).toBeNull();
    expect(container.textContent).not.toMatch(/px|像素/);
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('button', { name: '恢复默认' })).toBeNull();
  });

  it('changes the readout between centimetres and millimetres without saving or touching page geometry', () => {
    const props = fixture({ widthMm: 215.9, heightMm: 279.4 });
    render(<PaperSizeControls {...props} />);
    expect(screen.getByLabelText('笔记默认尺寸').textContent).toContain('21.59 × 27.94 cm');
    fireEvent.change(screen.getByRole('combobox', { name: '纸张尺寸单位' }), { target: { value: 'mm' } });
    expect(screen.getByLabelText('笔记默认尺寸').textContent).toContain('215.9 × 279.4 mm');
    expect(props.onPresetChange).not.toHaveBeenCalled();
    expect(props.onResize).not.toHaveBeenCalled();
  });

  it('commits a selected page in millimetres on blur and Enter from either unit', async () => {
    const props = fixture({ layoutMode: true });
    const { rerender } = render(<PaperSizeControls {...props} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: '当前页宽度（厘米）' }), { target: { value: '18.5' } });
    fireEvent.blur(screen.getByRole('spinbutton', { name: '当前页宽度（厘米）' }));
    await waitFor(() => expect(props.onResize).toHaveBeenCalledExactlyOnceWith(185, 297));
    await waitFor(() => expect(screen.queryByText('正在更新纸张…')).toBeNull());
    const resized = { ...props, page: { ...props.page!, widthMm: 185, isOverride: true } };
    rerender(<PaperSizeControls {...resized} />);
    fireEvent.change(screen.getByRole('combobox', { name: '纸张尺寸单位' }), { target: { value: 'mm' } });
    const height = screen.getByRole('spinbutton', { name: '当前页高度（毫米）' });
    expect((screen.getByRole('spinbutton', { name: '当前页宽度（毫米）' }) as HTMLInputElement).value).toBe('185');
    fireEvent.change(height, { target: { value: '280.5' } });
    fireEvent.keyDown(height, { key: 'Enter' });
    await waitFor(() => expect(props.onResize).toHaveBeenLastCalledWith(185, 280.5));
    await waitFor(() => expect(screen.queryByText('正在更新纸张…')).toBeNull());
    fireEvent.blur(height);
    expect(props.onResize).toHaveBeenCalledTimes(2);
    expect(props.onPresetChange).not.toHaveBeenCalled();
  });

  it('leaves unchanged dimensions untouched and restores only the selected override', async () => {
    const props = fixture({ layoutMode: true, page: { id: 'page-b', label: '第 2 页', widthMm: 190, heightMm: 280, isOverride: true } });
    render(<PaperSizeControls {...props} />);
    fireEvent.blur(screen.getByRole('spinbutton', { name: '当前页宽度（厘米）' }));
    expect(props.onResize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }));
    await waitFor(() => expect(props.onRestore).toHaveBeenCalledOnce());
    expect(props.onPresetChange).not.toHaveBeenCalled();
  });

  it('resets number drafts when the selected page changes and removes them outside Layout', () => {
    const props = fixture({ layoutMode: true });
    const { rerender } = render(<PaperSizeControls {...props} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: '当前页宽度（厘米）' }), { target: { value: '19' } });
    rerender(<PaperSizeControls {...props} page={{ id: 'page-b', widthMm: 148, heightMm: 210, isOverride: true }} />);
    expect((screen.getByRole('spinbutton', { name: '当前页宽度（厘米）' }) as HTMLInputElement).value).toBe('14.8');
    expect((screen.getByRole('spinbutton', { name: '当前页高度（厘米）' }) as HTMLInputElement).value).toBe('21');
    rerender(<PaperSizeControls {...props} layoutMode={false} />);
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(props.onResize).not.toHaveBeenCalled();
  });

  it('keeps Web long pages outside paper presets and exposes no conversion or resize action', () => {
    const props = fixture({ presets: [...presets, { value: 'screen_note', label: 'Web 长页' }], selectedPreset: 'screen_note', layoutMode: true });
    const { rerender } = render(<PaperSizeControls {...props} />);
    expect(screen.getByRole('status').textContent).toBe('Web 长页随内容生长。');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<PaperSizeControls {...props} selectedPreset="a4_portrait" />);
    expect(screen.queryByRole('option', { name: 'Web 长页' })).toBeNull();
    expect(props.onPresetChange).not.toHaveBeenCalled();
    expect(props.onResize).not.toHaveBeenCalled();
  });

  it('disables current default restore and explains missing Layout page selection', () => {
    const props = fixture({ layoutMode: true });
    const { rerender } = render(<PaperSizeControls {...props} />);
    expect((screen.getByRole('button', { name: '恢复默认' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<PaperSizeControls {...props} page={undefined} />);
    expect(screen.getByText('在纸上选中要调整的页面。')).toBeTruthy();
    expect(screen.queryByRole('spinbutton')).toBeNull();
  });

  it('retains failed dimensions for retry and lets Escape restore the current page values', async () => {
    const resize = vi.fn().mockRejectedValueOnce(new Error('Synthetic failure')).mockResolvedValue(undefined);
    const props = fixture({ layoutMode: true, onResize: resize });
    render(<PaperSizeControls {...props} />);
    const width = screen.getByRole('spinbutton', { name: '当前页宽度（厘米）' });
    fireEvent.change(width, { target: { value: '18' } });
    fireEvent.blur(width);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('页面尺寸未能保存，请重试。'));
    expect((width as HTMLInputElement).value).toBe('18');
    fireEvent.keyDown(width, { key: 'Enter' });
    await waitFor(() => expect(resize).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('正在更新纸张…')).toBeNull());
    fireEvent.change(width, { target: { value: '19' } });
    fireEvent.keyDown(width, { key: 'Escape' });
    expect((width as HTMLInputElement).value).toBe('21');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
