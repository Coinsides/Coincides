import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableBlockEditor } from './TableBlockEditor';
import { TABLE_MAX_CHARACTERS, type TableBlockPayload } from '../tableBlockService';

afterEach(cleanup);
const initialPayload: TableBlockPayload = { caption: 'Comparison', headers: ['Name', 'Detail'], rows: [['青苗', '周转'], ['免役', '生产']] };
const paste = (target: HTMLElement, text: string) => fireEvent.paste(target, { clipboardData: { getData: () => text } });

describe('table editor transaction', () => {
  it('edits caption and cells, adds and deletes both dimensions, then saves one independent payload', async () => {
    const onSave = vi.fn();
    render(<TableBlockEditor initialPayload={initialPayload} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Table caption'), { target: { value: '新法' } });
    fireEvent.change(screen.getByLabelText('Row 1, column 1'), { target: { value: '青苗法\n农户' } });
    fireEvent.change(screen.getByLabelText('Header 2'), { target: { value: '目标' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add column' }));
    fireEvent.change(screen.getByLabelText('Row 3, column 3'), { target: { value: '新增' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete row 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete column 1' }));
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save table' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith({ caption: '新法', headers: ['目标', ''], rows: [['周转', ''], ['', '新增']] }));
    expect(initialPayload.headers).toEqual(['Name', 'Detail']);
    expect(initialPayload.rows[0]).toEqual(['青苗', '周转']);
  });

  it('moves the header into/out of the first row, preserving every cell', () => {
    render(<TableBlockEditor initialPayload={initialPayload} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Header row'));
    expect(screen.queryByLabelText('Header 1')).toBeNull();
    expect((screen.getByLabelText('Row 1, column 1') as HTMLTextAreaElement).value).toBe('Name');
    expect((screen.getByLabelText('Row 3, column 1') as HTMLTextAreaElement).value).toBe('免役');
    fireEvent.click(screen.getByLabelText('Header row'));
    expect((screen.getByLabelText('Header 1') as HTMLTextAreaElement).value).toBe('Name');
    expect((screen.getByLabelText('Row 1, column 1') as HTMLTextAreaElement).value).toBe('青苗');
  });

  it('preserves a maximum table when disabling headers would exceed the data-row limit', () => {
    render(<TableBlockEditor initialPayload={{ headers: ['Header'], rows: Array.from({ length: 64 }, () => ['Cell']) }} onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Header row'));
    expect((screen.getByLabelText('Header row') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('64 data rows');
    expect((screen.getByRole('button', { name: 'Add row' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText('Row 64, column 1')).toBeTruthy();
  });

  it('keeps one row and column in an unheaded table and permits a header-only table', () => {
    render(<TableBlockEditor initialPayload={{ headers: [], rows: [['only']] }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Delete row 1' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Delete column 1' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Header row'));
    expect(screen.queryByLabelText('Row 1, column 1')).toBeNull();
    expect((screen.getByLabelText('Header 1') as HTMLTextAreaElement).value).toBe('only');
    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    expect(screen.getByLabelText('Row 1, column 1')).toBeTruthy();
  });

  it('automatically imports CSV or TSV from a cell and keeps the caption until one Ctrl+Enter save', async () => {
    const onSave = vi.fn();
    render(<TableBlockEditor initialPayload={initialPayload} onSave={onSave} onCancel={vi.fn()} />);
    paste(screen.getByLabelText('Row 1, column 1'), '法令,说明\n青苗法,"贷款,周转"');
    expect((screen.getByLabelText('Header 1') as HTMLTextAreaElement).value).toBe('法令');
    expect((screen.getByLabelText('Row 1, column 2') as HTMLTextAreaElement).value).toBe('贷款,周转');
    paste(screen.getByLabelText('Header 1'), '办法\t目标\n免役\t生产');
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByLabelText('Row 1, column 1'), { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith({ caption: 'Comparison', headers: ['办法', '目标'], rows: [['免役', '生产']] }));
  });

  it('keeps the current grid after a bad import and supports explicit one-column import without a header', async () => {
    const onSave = vi.fn();
    render(<TableBlockEditor initialPayload={initialPayload} onSave={onSave} onCancel={vi.fn()} />);
    paste(screen.getByLabelText('Row 1, column 1'), 'A,B\n"missing,B');
    expect(screen.getByRole('alert').textContent).toContain('closing quote');
    expect((screen.getByLabelText('Row 1, column 1') as HTMLTextAreaElement).value).toBe('青苗');
    fireEvent.click(screen.getByLabelText('Header row'));
    fireEvent.click(screen.getByText('Import CSV / TSV'));
    fireEvent.change(screen.getByLabelText('Paste CSV or TSV'), { target: { value: '青苗\n免役' } });
    fireEvent.click(screen.getByRole('button', { name: 'Import grid' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save table' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith({ caption: 'Comparison', headers: [], rows: [['青苗'], ['免役']] }));
  });

  it('cancels through Escape without saving, traps Tab and restores the prior focus', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger); trigger.focus();
    const onCancel = vi.fn(); const onSave = vi.fn();
    const view = render(<TableBlockEditor initialPayload={initialPayload} onSave={onSave} onCancel={onCancel} />);
    expect(document.activeElement).toBe(screen.getByLabelText('Table caption'));
    fireEvent.change(screen.getByLabelText('Table caption'), { target: { value: 'discarded' } });
    screen.getByRole('button', { name: 'Save table' }).focus();
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByLabelText('Table caption'));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
    view.unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('prevents double saves and preserves the draft for a failed-save retry', async () => {
    let reject!: (error: Error) => void;
    const onSave = vi.fn().mockImplementationOnce(() => new Promise<void>((_, fail) => { reject = fail; })).mockResolvedValue(undefined);
    const onCancel = vi.fn();
    render(<TableBlockEditor initialPayload={initialPayload} onSave={onSave} onCancel={onCancel} />);
    fireEvent.change(screen.getByLabelText('Table caption'), { target: { value: 'retry me' } });
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onSave).toHaveBeenCalledOnce(); expect(onCancel).not.toHaveBeenCalled();
    await act(async () => reject(new Error('Try again')));
    expect(screen.getByRole('alert').textContent).toBe('Try again');
    expect((screen.getByLabelText('Table caption') as HTMLTextAreaElement).value).toBe('retry me');
    fireEvent.click(screen.getByRole('button', { name: 'Save table' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  });

  it('blocks an over-budget draft until it is corrected', () => {
    const onSave = vi.fn();
    render(<TableBlockEditor initialPayload={{ headers: [], rows: [['']] }} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Row 1, column 1'), { target: { value: '文'.repeat(TABLE_MAX_CHARACTERS + 1) } });
    expect(screen.getByRole('alert').textContent).toContain('65,536');
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Row 1, column 1'), { target: { value: '已修正' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
