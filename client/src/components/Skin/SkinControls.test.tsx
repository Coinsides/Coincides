import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SkinControls } from './SkinControls';

describe('SkinControls appearance choices', () => {
  it('offers a labeled header rule switch and resets only its override', () => {
    const onChange = vi.fn();
    render(<SkinControls value={{ preset: 'quiet-ink', overrides: { paper: '#123456' }, components: { headerRule: 'hidden', titleFont: 'serif' } }} onChange={onChange} />);
    fireEvent.click(screen.getByText('部件样式'));
    const select = screen.getByRole('combobox', { name: '表头分隔线' }) as HTMLSelectElement;
    expect(select.value).toBe('hidden');
    expect(within(select).getByRole('option', { name: '显示' })).toBeTruthy();
    expect(within(select).getByRole('option', { name: '隐藏' })).toBeTruthy();
    fireEvent.change(select, { target: { value: 'visible' } });
    expect(onChange).toHaveBeenLastCalledWith({ preset: 'quiet-ink', overrides: { paper: '#123456' }, components: { headerRule: 'visible', titleFont: 'serif' } });
    fireEvent.click(within(select.parentElement!).getByRole('button', { name: '重置' }));
    expect(onChange).toHaveBeenLastCalledWith({ preset: 'quiet-ink', overrides: { paper: '#123456' }, components: { titleFont: 'serif' } });
  });

  it('can present the default appearance as one preset row with detail controls omitted', () => {
    const onChange = vi.fn();
    render(<SkinControls value={{ preset: 'quiet-ink' }} onChange={onChange} surface="all" advanced={false} showComponents={false} presetLabel="默认外观" />);
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.queryByText('部件样式')).toBeNull();
    expect(screen.queryByText('高级颜色')).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: '默认外观' }), { target: { value: 'warm-paper' } });
    expect(onChange).toHaveBeenLastCalledWith({ preset: 'warm-paper' });
  });
});
