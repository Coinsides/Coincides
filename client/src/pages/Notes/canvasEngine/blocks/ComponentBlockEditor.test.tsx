import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComponentBlockEditor } from './ComponentBlockEditor';
import { COMPONENT_MAX_CHARACTERS, type KnownChartComponentPayload, type KnownTimelineComponentPayload } from '../componentBlockService';

afterEach(cleanup);
const timeline: KnownTimelineComponentPayload = { component_kind: 'timeline', params: { title: '年表', entries: [
  { year: '960', label: '建国', detail: '开封' }, { year: '997', label: '继位' },
] } };
const chart: KnownChartComponentPayload = { component_kind: 'chart_bar', params: { title: '收入', y_label: '单位',
  x_labels: ['初期', '中期'], series: [{ name: '农业', values: [1, 2] }, { name: '工商', values: [3, 4] }],
} };
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const disabled = (name: string) => (screen.getByRole('button', { name }) as HTMLButtonElement).disabled;

describe('component editor local transaction', () => {
  it('edits every timeline field, adds/deletes/reorders entries, and saves one independent payload', async () => {
    const before = JSON.stringify(timeline); const onSave = vi.fn();
    render(<ComponentBlockEditor initialPayload={timeline} onSave={onSave} onCancel={vi.fn()} />);
    change('Timeline title', '宋初'); change('Entry 1 year', '961'); change('Entry 1 label', '军制'); change('Entry 1 detail', '收束兵权');
    click('Add entry'); change('Entry 3 year', '978'); change('Entry 3 label', '纳土');
    click('Move entry 3 up'); click('Move entry 1 down'); click('Delete entry 3');
    expect(onSave).not.toHaveBeenCalled();
    click('Save timeline');
    await waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith({ component_kind: 'timeline', params: { title: '宋初', entries: [
      { year: '978', label: '纳土' }, { year: '961', label: '军制', detail: '收束兵权' },
    ] } }));
    expect(JSON.stringify(timeline)).toBe(before);
  });

  it('retains one timeline entry and disables moves at either end and additions at the limit', () => {
    const view = render(<ComponentBlockEditor initialPayload={{ component_kind: 'timeline', params: { entries: [{ year: '', label: '' }] } }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(disabled('Delete entry 1')).toBe(true); expect(disabled('Move entry 1 up')).toBe(true); expect(disabled('Move entry 1 down')).toBe(true);
    view.unmount();
    render(<ComponentBlockEditor initialPayload={{ component_kind: 'timeline', params: { entries: Array.from({ length: 64 }, () => ({ year: '', label: '' })) } }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(disabled('Add entry')).toBe(true); expect(disabled('Move entry 64 down')).toBe(true);
  });

  it.each(['chart_bar', 'chart_line'] as const)('edits the %s grid and metadata, adds/deletes both dimensions, preserving the kind', async (kind) => {
    const before = JSON.stringify(chart); const onSave = vi.fn();
    render(<ComponentBlockEditor initialPayload={{ ...chart, component_kind: kind }} onSave={onSave} onCancel={vi.fn()} />);
    change('Chart title', '岁入'); change('Chart y-axis label', '示意'); change('X label 1', '宋初'); change('Series 1 name', '田赋');
    change('Series 1, column 1', '-4.5'); click('Add column'); click('Add series');
    change('X label 3', '后期'); change('Series 3 name', '其他'); change('Series 3, column 3', '9');
    click('Delete column 2'); click('Delete series 2');
    expect(onSave).not.toHaveBeenCalled();
    click('Save chart');
    await waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith({ component_kind: kind, params: { title: '岁入', y_label: '示意',
      x_labels: ['宋初', '后期'], series: [{ name: '田赋', values: [-4.5, 0] }, { name: '其他', values: [0, 9] }],
    } }));
    expect(JSON.stringify(chart)).toBe(before);
  });

  it('retains one column/series and disables add controls at 32 columns and 4 series', () => {
    const view = render(<ComponentBlockEditor initialPayload={{ component_kind: 'chart_bar', params: { x_labels: ['A'], series: [{ name: 'B', values: [0] }] } }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(disabled('Delete column 1')).toBe(true); expect(disabled('Delete series 1')).toBe(true);
    view.unmount();
    render(<ComponentBlockEditor initialPayload={{ component_kind: 'chart_bar', params: {
      x_labels: Array<string>(32).fill('A'), series: Array.from({ length: 4 }, () => ({ name: 'B', values: Array<number>(32).fill(0) })),
    } }} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(disabled('Add column')).toBe(true); expect(disabled('Add series')).toBe(true);
  });

  it('keeps an empty numeric input invalid rather than converting it to zero, then accepts a corrected finite value', async () => {
    const onSave = vi.fn(); render(<ComponentBlockEditor initialPayload={chart} onSave={onSave} onCancel={vi.fn()} />);
    change('Series 1, column 1', ''); expect(screen.getByRole('alert').textContent).toContain('finite number');
    expect(disabled('Save chart')).toBe(true); fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true }); expect(onSave).not.toHaveBeenCalled();
    change('Series 1, column 1', '0'); expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.keyDown(document, { key: 'Enter', metaKey: true });
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0].params.series[0].values[0]).toBe(0);
  });

  it('retains incomplete negative/exponent input while editing and saves only the completed finite number', async () => {
    const onSave = vi.fn(); render(<ComponentBlockEditor initialPayload={chart} onSave={onSave} onCancel={vi.fn()} />);
    const field = screen.getByLabelText('Series 1, column 1') as HTMLInputElement;
    change('Series 1, column 1', '-'); expect(field.value).toBe('-'); expect(disabled('Save chart')).toBe(true);
    change('Series 1, column 1', '-1e'); expect(field.value).toBe('-1e'); expect(disabled('Save chart')).toBe(true);
    change('Series 1, column 1', '-1e2'); expect(field.value).toBe('-1e2'); expect(disabled('Save chart')).toBe(false);
    click('Save chart'); await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave.mock.calls[0][0].params.series[0].values[0]).toBe(-100);
  });

  it('blocks over-budget timeline text until corrected', () => {
    const onSave = vi.fn(); render(<ComponentBlockEditor initialPayload={timeline} onSave={onSave} onCancel={vi.fn()} />);
    change('Entry 1 detail', '文'.repeat(COMPONENT_MAX_CHARACTERS + 1));
    expect(screen.getByRole('alert').textContent).toContain('65,536');
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true }); expect(onSave).not.toHaveBeenCalled();
    change('Entry 1 detail', '修正'); expect(screen.queryByRole('alert')).toBeNull();
  });

  it('cancels via Escape or Cancel without saving, traps focus in both directions and restores prior focus', () => {
    const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
    const onSave = vi.fn(); const onCancel = vi.fn();
    const view = render(<ComponentBlockEditor initialPayload={timeline} onSave={onSave} onCancel={onCancel} />);
    const title = screen.getByLabelText('Timeline title'); expect(document.activeElement).toBe(title);
    fireEvent.keyDown(title, { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Save timeline' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' }); expect(document.activeElement).toBe(title);
    change('Timeline title', 'discarded'); fireEvent.keyDown(title, { key: 'Escape' }); click('Cancel');
    expect(onCancel).toHaveBeenCalledTimes(2); expect(onSave).not.toHaveBeenCalled();
    view.unmount(); expect(document.activeElement).toBe(trigger); trigger.remove();
  });

  it('prevents double saves, blocks cancellation while saving and keeps failed drafts retryable', async () => {
    let reject!: (error: Error) => void;
    const onSave = vi.fn().mockImplementationOnce(() => new Promise<void>((_, fail) => { reject = fail; })).mockResolvedValue(undefined);
    const onCancel = vi.fn(); render(<ComponentBlockEditor initialPayload={timeline} onSave={onSave} onCancel={onCancel} />);
    change('Timeline title', '重试'); fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true }); fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'Escape' }); expect(onSave).toHaveBeenCalledOnce(); expect(onCancel).not.toHaveBeenCalled();
    await act(async () => reject(new Error('Try again')));
    expect(screen.getByRole('alert').textContent).toBe('Try again'); expect((screen.getByLabelText('Timeline title') as HTMLTextAreaElement).value).toBe('重试');
    click('Save timeline'); await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  });

  it('disables controls for an externally busy editor and displays save errors', () => {
    const onSave = vi.fn(); const onCancel = vi.fn();
    render(<ComponentBlockEditor initialPayload={chart} onSave={onSave} onCancel={onCancel} busy error="Save unavailable" />);
    expect(screen.getByRole('alert').textContent).toBe('Save unavailable'); expect(disabled('Add column')).toBe(true); expect(disabled('Cancel')).toBe(true);
    expect((screen.getByLabelText('Chart title') as HTMLTextAreaElement).disabled).toBe(true);
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true }); fireEvent.keyDown(document, { key: 'Escape' });
    expect(onSave).not.toHaveBeenCalled(); expect(onCancel).not.toHaveBeenCalled();
  });

  it('keeps an unregistered component readable without offering a save operation', () => {
    const onSave = vi.fn(); render(<ComponentBlockEditor initialPayload={{ component_kind: 'future_component', params: {} }} onSave={onSave} onCancel={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('未注册组件'); expect(screen.queryByRole('button', { name: 'Save chart' })).toBeNull();
    fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true }); expect(onSave).not.toHaveBeenCalled();
  });
});
