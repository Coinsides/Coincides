import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDefaultNoteBindingSettings, type NoteBindingSettings } from '../../../../../../shared/types/noteBinding';
import { NoteBindingPanel } from './NoteBindingPanel';
import { createPageFrameCollectionSeed } from '../pageFrameCollectionService';

afterEach(cleanup);
describe('A2 binding controls', () => {
  it('edits independent sections, template affixes, six slots and overrides, then saves a note setting', async () => {
    const save = vi.fn(async (_value: NoteBindingSettings) => {}), close = vi.fn();
    render(<NoteBindingPanel pageCount={4} onSave={save} onClose={close} />);
    fireEvent.change(screen.getByLabelText('眉左文案'), { target: { value: '书名' } });
    fireEvent.click(screen.getByText('新增段'));
    fireEvent.change(screen.getByLabelText('起始机械页'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('眉左文案'), { target: { value: '第二部分' } });
    fireEvent.change(screen.getByLabelText('显示起始数'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('页码制式'), { target: { value: 'roman-upper' } });
    fireEvent.change(screen.getByLabelText('页码槽'), { target: { value: 'header-right' } });
    fireEvent.change(screen.getByLabelText('页码前缀'), { target: { value: '第 ' } });
    fireEvent.change(screen.getByLabelText('页码后缀'), { target: { value: ' 页' } });
    fireEvent.change(screen.getAllByLabelText('字号')[0], { target: { value: '18' } });
    fireEvent.change(screen.getAllByLabelText('颜色')[0], { target: { value: 'accent' } });
    fireEvent.change(screen.getAllByLabelText('横移')[0], { target: { value: '6' } });
    expect(screen.getByLabelText('必留页码').textContent).toBe('N');
    fireEvent.click(screen.getByText('保存装订'));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    const setting = save.mock.calls[0][0] as unknown as ReturnType<typeof createDefaultNoteBindingSettings>;
    expect(setting.sections[0].startPage).toBe(1);
    expect(setting.sections[0].slots['header-left'].text).toBe('书名');
    expect(setting.sections[1]).toMatchObject({ startPage: 3,
      pageNumber: { startAt: 4, format: 'roman-upper', prefix: '第 ', suffix: ' 页', slot: 'header-right' },
      slots: { 'header-left': { text: '第二部分', offsetX: 6, style: { fontSize: 18, colorToken: 'accent' } } } });
  });

  it('retains edits after failed save and supports retry, whole off and deleting a section', async () => {
    const save = vi.fn<(value: NoteBindingSettings) => Promise<void>>()
      .mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const close = vi.fn();
    render(<NoteBindingPanel pageCount={2} onSave={save} onClose={close} />);
    fireEvent.click(screen.getByText('新增段'));
    fireEvent.click(screen.getByText('删除本段'));
    expect(screen.queryByText('删除本段')).toBeNull();
    expect((screen.getByLabelText('起始机械页') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('显示装订'));
    fireEvent.click(screen.getByText('保存装订'));
    await screen.findByRole('alert');
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('保存装订'));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(save.mock.calls[1][0]).toMatchObject({ enabled: false, dropFolioOnCover: true });
  });

  it('does not let an old saving panel close a newly opened panel', async () => {
    let complete!: () => void;
    const save = () => new Promise<void>((resolve) => { complete = resolve; });
    const close = vi.fn();
    const first = render(<NoteBindingPanel pageCount={2} onSave={save} onClose={close} />);
    fireEvent.click(screen.getByText('保存装订'));
    first.unmount();
    render(<NoteBindingPanel pageCount={2} onSave={async () => {}} onClose={close} />);
    fireEvent.change(screen.getByLabelText('眉左文案'), { target: { value: '新草稿' } });
    await act(async () => complete());
    expect(close).not.toHaveBeenCalled();
    expect((screen.getByLabelText('眉左文案') as HTMLInputElement).value).toBe('新草稿');
  });

  it('can resave legal fractional offsets and font sizes', async () => {
    const value = createDefaultNoteBindingSettings();
    value.sections[0].slots['header-left'] = { text: '书名', offsetX: 0.125, offsetY: -0.25, style: { fontSize: 13.5 } };
    const save = vi.fn(async () => {});
    render(<NoteBindingPanel value={value} pageCount={1} onSave={save} onClose={() => {}} />);
    expect((screen.getAllByLabelText('横移')[0] as HTMLInputElement).checkValidity()).toBe(true);
    expect((screen.getAllByLabelText('字号')[0] as HTMLInputElement).checkValidity()).toBe(true);
    fireEvent.click(screen.getByText('保存装订'));
    await waitFor(() => expect(save).toHaveBeenCalledWith(value));
  });

  it('prevents parent save and cancel while a cover lifecycle save is pending', async () => {
    let finish: () => void = () => {};
    const save = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const close = vi.fn();
    render(<NoteBindingPanel pageCount={1} onSave={save} onClose={close} coverControls={{
      noteId: 'cover-note', collection: createPageFrameCollectionSeed(), onAddBinding: vi.fn().mockResolvedValue(undefined),
    }} />);
    fireEvent.change(screen.getByLabelText('眉左文案'), { target: { value: '保留的装订草稿' } });
    fireEvent.click(screen.getByRole('button', { name: '添加封面页' }));
    expect(screen.getByRole('button', { name: '取消' }).matches(':disabled')).toBe(true);
    expect(screen.getByRole('button', { name: '保存装订' }).matches(':disabled')).toBe(true);
    fireEvent.submit(screen.getByRole('form', { name: '装订设置' }));
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    await act(async () => { finish(); });
    expect(screen.getByRole('button', { name: '保存装订' }).matches(':disabled')).toBe(false);
    expect(screen.getByRole('button', { name: '取消' }).matches(':disabled')).toBe(false);
    expect((screen.getByLabelText('眉左文案') as HTMLInputElement).value).toBe('保留的装订草稿');
    expect(close).not.toHaveBeenCalled();
  });
});
