import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardDeleteDialog } from './BoardDeleteDialog';
import type { Board, BoardDetail } from './boardTypes';

const repository = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock('./boardRepository', () => ({
  boardRepository: repository,
  boardErrorMessage: () => 'The board request failed. Please try again.',
}));

const date = '2026-09-09T12:00:00Z';
const board: Board = {
  id: 'dialog-board', title: 'Deletion scope', user_id: 'synthetic-user', soul_id: 'retained-soul',
  identity_item_id: null, identity_description: null,
  project_id: null, viewport: { x: 0, y: 0, zoom: 1 }, created_at: date, updated_at: date,
};
const geometry = { x: 0, y: 0, w: 240, h: 160, scale: 1, z_index: 0, pinned: false };
const detail: BoardDetail = {
  board,
  members: ['first', 'second', 'third'].map((id) => ({
    ...geometry, id, board_id: board.id, member_kind: 'note', member_id: `note-${id}`,
    metadata: {}, created_at: date, updated_at: date,
    reference: { kind: 'note', id: `note-${id}`, title: id, note_id: `note-${id}`, state: 'available', reason: null },
  })),
  edges: [{ id: 'connection', board_id: board.id, from_member_id: 'first', to_member_id: 'second',
    label: null, style: {}, created_at: date }],
  visuals: ['ink', 'shape'].map((id) => ({
    ...geometry, id, board_id: board.id, visual_kind: id === 'ink' ? 'freehand' : 'shape',
    rotation: 0, data: {}, metadata: {}, created_at: date, updated_at: date,
  })),
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');

beforeEach(() => {
  vi.resetAllMocks();
  repository.get.mockResolvedValue(detail);
  repository.delete.mockResolvedValue({ removed: true });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) { this.open = true; },
  });
});

afterEach(() => {
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
});

function renderDialog() {
  const onDeleted = vi.fn();
  const onCancel = vi.fn();
  return { ...render(<BoardDeleteDialog board={board} onCancel={onCancel} onDeleted={onDeleted} />), onDeleted, onCancel };
}

describe('Board deletion confirmation lifecycle', () => {
  it('cannot confirm before the saved board counts arrive and then states the real scope', async () => {
    const loading = deferred<BoardDetail>();
    repository.get.mockReturnValueOnce(loading.promise);
    const { onDeleted } = renderDialog();
    const confirm = screen.getByRole('button', { name: 'Delete board' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(screen.getByRole('dialog').textContent).toContain('Loading the board’s deletion scope');
    fireEvent.click(confirm);
    expect(repository.delete).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();

    await act(async () => { loading.resolve(detail); await loading.promise; });
    expect(confirm.disabled).toBe(false);
    const scope = screen.getByRole('dialog').textContent;
    expect(scope).toContain('2 drawings, 1 connections, and all 3 placements');
    expect(scope).toContain('Notes and knowledge content are unaffected');
    expect(scope).toContain('The purpose is kept');
    expect(repository.get).toHaveBeenCalledExactlyOnceWith(board.id);
    fireEvent.click(confirm);
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(repository.delete).toHaveBeenCalledExactlyOnceWith(board.id);
  });

  it('keeps deletion disabled after a scope read failure and reloads the scope on retry', async () => {
    repository.get.mockRejectedValueOnce(new Error('Synthetic read failure'));
    renderDialog();
    await screen.findByRole('alert');
    const confirm = screen.getByRole('button', { name: 'Delete board' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(confirm);
    expect(repository.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(confirm.disabled).toBe(false));
    expect(repository.get.mock.calls).toEqual([[board.id], [board.id]]);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('dialog').textContent).toContain('2 drawings, 1 connections, and all 3 placements');
  });

  it('presents a failed deletion and permits a successful retry without reporting early success', async () => {
    repository.delete.mockRejectedValueOnce(new Error('Synthetic deletion failure'));
    const { onDeleted } = renderDialog();
    const confirm = screen.getByRole('button', { name: 'Delete board' }) as HTMLButtonElement;
    await waitFor(() => expect(confirm.disabled).toBe(false));
    fireEvent.click(confirm);
    expect((await screen.findByRole('alert')).textContent).toContain('Please try again');
    expect(onDeleted).not.toHaveBeenCalled();
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(repository.delete.mock.calls).toEqual([[board.id], [board.id]]);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('finishes the original delete after unmount without calling its navigation callback', async () => {
    const deletion = deferred<{ removed: boolean }>();
    repository.delete.mockReturnValueOnce(deletion.promise);
    const { unmount, onDeleted, onCancel } = renderDialog();
    const confirm = screen.getByRole('button', { name: 'Delete board' }) as HTMLButtonElement;
    await waitFor(() => expect(confirm.disabled).toBe(false));
    fireEvent.click(confirm);
    expect(repository.delete).toHaveBeenCalledExactlyOnceWith(board.id);
    expect((screen.getByRole('button', { name: 'Deleting…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
    unmount();
    await act(async () => { deletion.resolve({ removed: true }); await deletion.promise; });
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(repository.delete).toHaveBeenCalledOnce();
  });
});
