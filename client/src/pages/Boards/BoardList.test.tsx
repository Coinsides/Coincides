import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BoardList from './BoardList';

const repository = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn() }));
const loadSouls = vi.hoisted(() => vi.fn());
vi.mock('./boardRepository', () => ({ boardRepository: repository, boardErrorMessage: () => 'Unable to load boards.' }));
vi.mock('@/pages/Notes/canvasEngine/purposeRepository', () => ({ loadLibraryPurposes: loadSouls }));

const existingSoul = { id: 'existing-soul', title: 'A different purpose statement', status: 'active' };
const existingBoard = { id: 'existing-board', title: 'Field notes', soul_id: existingSoul.id, updated_at: '2026-09-09T12:00:00Z' };

beforeEach(() => {
  vi.clearAllMocks();
  repository.list.mockResolvedValue([existingBoard]);
  repository.create.mockResolvedValue({ id: 'new-board' });
  loadSouls.mockResolvedValue([existingSoul]);
});

async function renderList() {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><BoardList /></MemoryRouter>);
  await screen.findByRole('link', { name: /Field notes/ });
  return screen.getByRole('textbox', { name: 'Board name' }) as HTMLInputElement;
}

describe('V13 S4 board name creation', () => {
  it('requires a short nonblank name and creates a namesake soul without opening advanced options', async () => {
    const input = await renderList();
    const submit = screen.getByRole('button', { name: 'Open board' }) as HTMLButtonElement;
    expect(input.required).toBe(true);
    expect(input.maxLength).toBe(80);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.getByText('Advanced: use an existing purpose').closest('details')?.open).toBe(false);
    expect(submit.disabled).toBe(true);
    fireEvent.change(input, { target: { value: '   ' } });
    expect(submit.disabled).toBe(true);
    fireEvent.submit(input.closest('form')!);
    expect(repository.create).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '  Exam revision  ' } });
    fireEvent.click(submit);
    await waitFor(() => expect(repository.create).toHaveBeenCalledExactlyOnceWith({ title: 'Exam revision', purpose: { title: 'Exam revision' } }));
  });

  it('keeps the entered board name when attaching an existing soul or returning to a new one', async () => {
    const input = await renderList();
    fireEvent.change(input, { target: { value: 'My independent board' } });
    fireEvent.click(screen.getByText('Advanced: use an existing purpose'));
    const select = screen.getByRole('combobox', { name: 'Existing purpose' });
    fireEvent.change(select, { target: { value: existingSoul.id } });
    expect(input.value).toBe('My independent board');
    fireEvent.change(select, { target: { value: '' } });
    expect(input.value).toBe('My independent board');
    fireEvent.change(select, { target: { value: existingSoul.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Open board' }));
    await waitFor(() => expect(repository.create).toHaveBeenCalledExactlyOnceWith({ title: 'My independent board', soul_id: existingSoul.id }));
    expect(existingSoul.title).toBe('A different purpose statement');
  });

  it('displays board names in the list and keeps the soul selector inside creation advanced options', async () => {
    await renderList();
    const boardLink = screen.getByRole('link', { name: /Field notes/ });
    expect(boardLink.textContent).not.toContain(existingSoul.title);
    expect(boardLink.getAttribute('href')).toBe('/boards/existing-board');
    const advanced = screen.getByText('Advanced: use an existing purpose').closest('details')!;
    expect(advanced.closest('form')).toBeTruthy();
    fireEvent.click(within(advanced).getByText('Advanced: use an existing purpose'));
    expect(within(advanced).getByRole('combobox', { name: 'Existing purpose' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /purpose/i })).toBeNull();
  });
});
