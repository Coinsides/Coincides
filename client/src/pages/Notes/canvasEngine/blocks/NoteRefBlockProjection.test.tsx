import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NoteTruthBindingProvider, type NoteTruthBindingValue } from '../NoteTruthBindingContext';
import { NoteRefBlockProjection } from './NoteRefBlockProjection';

describe('NoteRefBlockProjection note truth binding', () => {
  it('projects title and description directly from note truth and follows external updates', () => {
    const value = { title: '原题名', description: '原述名' };
    const view = render(<NoteTruthBindingProvider value={value}>
      <NoteRefBlockProjection field="title" /><NoteRefBlockProjection field="description" />
    </NoteTruthBindingProvider>);
    expect(screen.getByText('原题名')).toBeTruthy();
    expect(screen.getByText('原述名')).toBeTruthy();
    view.rerender(<NoteTruthBindingProvider value={{ title: '别处改名', description: '别处改述名' }}>
      <NoteRefBlockProjection field="title" /><NoteRefBlockProjection field="description" />
    </NoteTruthBindingProvider>);
    expect(screen.getByText('别处改名')).toBeTruthy();
    expect(screen.getByText('别处改述名')).toBeTruthy();
    expect(screen.queryByText('原题名')).toBeNull();
  });

  it.each(['title', 'description'] as const)('edits %s through its note callbacks and preserves input after a failed save', async (field) => {
    const onChange = vi.fn();
    const onSave = vi.fn().mockRejectedValueOnce(new Error('暂未保存')).mockResolvedValue(undefined);
    function Editor() {
      const [value, setValue] = useState({ title: '原题名', description: '原述名' });
      return <NoteTruthBindingProvider value={{ ...value, onSave,
        onChange: (name, text) => { onChange(name, text); setValue((previous) => ({ ...previous, [name]: text })); } }}>
        <NoteRefBlockProjection field={field} />
      </NoteTruthBindingProvider>;
    }
    render(<Editor />);
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '编辑后仍保留' } });
    expect(onChange).toHaveBeenCalledExactlyOnceWith(field, '编辑后仍保留');
    fireEvent.blur(input);
    await waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith(field));
    expect(input.value).toBe('编辑后仍保留');
    fireEvent.blur(input);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(input.value).toBe('编辑后仍保留');
  });

  it('uses text-only projections for print or read-only contexts and never clears truth on removal', () => {
    const value: NoteTruthBindingValue = { title: '保留题名', description: '', onChange: vi.fn(), onSave: vi.fn() };
    const view = render(<NoteTruthBindingProvider value={value}><NoteRefBlockProjection field="title" readOnly /></NoteTruthBindingProvider>);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('保留题名')).toBeTruthy();
    view.rerender(<NoteTruthBindingProvider value={{ ...value, readOnly: true }}><NoteRefBlockProjection field="title" /></NoteTruthBindingProvider>);
    expect(screen.queryByRole('textbox')).toBeNull();
    view.unmount();
    expect(value.onChange).not.toHaveBeenCalled();
    expect(value.onSave).not.toHaveBeenCalled();
  });

  it('submits Enter after composition and stops editor shortcuts reaching the canvas', () => {
    const onSave = vi.fn();
    const onCanvasKeyDown = vi.fn();
    render(<div onKeyDown={onCanvasKeyDown}><NoteTruthBindingProvider value={{ title: '输入题名', description: '', onChange: vi.fn(), onSave }}>
      <NoteRefBlockProjection field="title" />
    </NoteTruthBindingProvider></div>);
    const input = screen.getByRole('textbox');
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(document.activeElement).toBe(input);
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledExactlyOnceWith('title');
    expect(onCanvasKeyDown).not.toHaveBeenCalled();
  });
});
