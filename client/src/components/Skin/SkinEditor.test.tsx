import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SkinSelection } from '@shared/types/skin';
import { SkinEditor } from './SkinEditor';

describe('SkinEditor save failure recovery', () => {
  it('shows an owner failure after reopening and retries the retained selection', async () => {
    const value: SkinSelection = { preset: 'warm-paper' };
    let rejectFirst!: (error: Error) => void;
    const firstSave = new Promise<void>((_resolve, reject) => { rejectFirst = reject; });
    const save = vi.fn().mockReturnValueOnce(firstSave).mockResolvedValue(undefined);
    const firstEditor = render(<SkinEditor value={null} save={save} inheritLabel="继承项目外观" />);
    fireEvent.change(screen.getByRole('combobox', { name: '纸面预设' }), { target: { value: 'warm-paper' } });
    firstEditor.unmount();
    await act(async () => { rejectFirst(new Error('Synthetic write failure')); });

    const reopened = render(<SkinEditor value={value} save={save} failed inheritLabel="继承项目外观" />);
    expect(screen.getByRole('alert').textContent).toContain('外观未保存');
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith(value));
    expect(save).toHaveBeenCalledTimes(2);
    // An individual promise settling cannot clear a failure still owned by the note runtime.
    expect(screen.getByRole('alert').textContent).toContain('外观未保存');
    reopened.rerender(<SkinEditor value={value} save={save} failed={false} inheritLabel="继承项目外观" />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps local failure feedback until retry succeeds without an external failure', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Synthetic write failure')).mockResolvedValue(undefined);
    render(<SkinEditor value={null} save={save} />);
    fireEvent.change(screen.getByRole('combobox', { name: '纸面预设' }), { target: { value: 'workbench' } });
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(save).toHaveBeenLastCalledWith({ preset: 'workbench' });
    expect(save).toHaveBeenCalledTimes(2);
  });
});
