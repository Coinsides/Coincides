import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardNewNoteDialog } from './BoardNewNoteDialog';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));

const projects = [{ id: 'project-first', name: 'First project' }, { id: 'project-second', name: 'Second project' }];
const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');

beforeEach(() => {
  vi.resetAllMocks();
  http.get.mockResolvedValue({ data: projects });
  http.post.mockResolvedValue({ data: { note: { id: 'note-new', course_id: 'project-new', title: 'Trade routes' } } });
  http.put.mockImplementation(async (_path: string, input: { collection: unknown }) => ({ data: input.collection }));
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true, value: function (this: HTMLDialogElement) { this.open = true; },
  });
});

afterEach(() => {
  if (showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
});

function openDialog(initialProjectId: string | null = null) {
  const onCreated = vi.fn();
  const onCancel = vi.fn();
  return { ...render(<BoardNewNoteDialog boardId="board" initialProjectId={initialProjectId} onCreated={onCreated} onCancel={onCancel} />), onCreated, onCancel };
}

async function chooseNewProject() {
  const project = screen.getByRole('combobox', { name: 'Project' });
  await waitFor(() => expect((project as HTMLSelectElement).disabled).toBe(false));
  fireEvent.change(project, { target: { value: '__new_project__' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: '  Chinese history  ' } });
}

function fillTitle(value = '  Trade routes  ') {
  fireEvent.change(screen.getByRole('textbox', { name: 'Note title' }), { target: { value } });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('Board New note ceremony', () => {
  it('requires a project and nonblank title, atomically creates a name-only project and framed note, then opens its identity', async () => {
    const { onCreated } = openDialog();
    const submit = screen.getByRole('button', { name: 'Create note' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    await chooseNewProject();
    fillTitle('   ');
    fireEvent.submit(submit.closest('form')!);
    expect(http.post).not.toHaveBeenCalled();
    fillTitle();
    fireEvent.click(submit);
    await waitFor(() => expect(onCreated).toHaveBeenCalledExactlyOnceWith('note-new'));
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/boards/board/ceremony-note', {
      project: { name: 'Chinese history' }, title: 'Trade routes',
      collection: expect.objectContaining({ pageFrames: [expect.any(Object)] }),
    });
    expect(http.put).not.toHaveBeenCalled();
  });

  it('offers existing projects and creates the note under the selected project', async () => {
    const { onCreated } = openDialog('project-first');
    const project = screen.getByRole('combobox', { name: 'Project' }) as HTMLSelectElement;
    await waitFor(() => expect(project.value).toBe('project-first'));
    fireEvent.change(project, { target: { value: 'project-second' } });
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledExactlyOnceWith('note-new'));
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/boards/board/ceremony-note', {
      project_id: 'project-second', title: 'Trade routes', collection: expect.any(Object),
    });
    expect(screen.queryByRole('textbox', { name: 'Project name' })).toBeNull();
  });

  it('keeps the inline project draft after an atomic failure and retries the whole ceremony', async () => {
    http.post.mockRejectedValueOnce(new Error('Synthetic frame write failure'))
      .mockResolvedValueOnce({ data: { note: { id: 'note-retried' } } });
    const { onCreated } = openDialog();
    await chooseNewProject();
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Your entries are kept');
    expect(onCreated).not.toHaveBeenCalled();
    expect((screen.getByRole('combobox', { name: 'Project' }) as HTMLSelectElement).value).toBe('__new_project__');
    expect((screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement).value).toBe('  Chinese history  ');
    expect((screen.getByRole('textbox', { name: 'Note title' }) as HTMLInputElement).value).toBe('  Trade routes  ');
    fireEvent.click(screen.getByRole('button', { name: 'Retry creating note' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledExactlyOnceWith('note-retried'));
    expect(http.post.mock.calls.map(([path]) => path)).toEqual(['/boards/board/ceremony-note', '/boards/board/ceremony-note']);
    expect(http.post.mock.calls[1]).toEqual(http.post.mock.calls[0]);
    expect(http.put).not.toHaveBeenCalled();
  });

  it('preserves the form after project creation fails and never creates a note prematurely', async () => {
    http.post.mockRejectedValueOnce(new Error('Synthetic project write failure'));
    const { onCreated } = openDialog();
    await chooseNewProject();
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Could not create the note');
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/boards/board/ceremony-note', {
      project: { name: 'Chinese history' }, title: 'Trade routes', collection: expect.any(Object),
    });
    expect(onCreated).not.toHaveBeenCalled();
    expect((screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement).value).toBe('  Chinese history  ');
  });

  it('keeps the existing project and editable title after frame failure, then opens only after a successful retry', async () => {
    http.post.mockRejectedValueOnce(new Error('Synthetic page collection write failure'));
    const { onCreated } = openDialog('project-first');
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Project' }) as HTMLSelectElement).value).toBe('project-first'));
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Could not create the note');
    expect(onCreated).not.toHaveBeenCalled();
    expect((screen.getByRole('textbox', { name: 'Note title' }) as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole('combobox', { name: 'Project' }) as HTMLSelectElement).value).toBe('project-first');
    const originalRequest = structuredClone(http.post.mock.calls[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry creating note' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledExactlyOnceWith('note-new'));
    expect(http.post.mock.calls).toEqual([originalRequest, originalRequest]);
    expect(http.put).not.toHaveBeenCalled();
  });

  it('retries a failed project list without losing the note title and cancels without writes', async () => {
    http.get.mockRejectedValueOnce(new Error('Synthetic list read failure'));
    const { onCancel } = openDialog();
    await screen.findByRole('alert');
    fillTitle();
    expect((screen.getByRole('button', { name: 'Create note' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Retry projects' }));
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Project' }) as HTMLSelectElement).disabled).toBe(false));
    expect(screen.queryByRole('alert')).toBeNull();
    expect((screen.getByRole('textbox', { name: 'Note title' }) as HTMLInputElement).value).toBe('  Trade routes  ');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('serializes double submission and does not open the completed note after the board host unmounts', async () => {
    const ceremony = deferred<{ data: { note: { id: string } } }>();
    http.post.mockReturnValueOnce(ceremony.promise);
    const { onCreated, onCancel, unmount } = openDialog();
    await chooseNewProject();
    fillTitle();
    const form = screen.getByRole('button', { name: 'Create note' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent(screen.getByRole('dialog', { name: 'New note' }), new Event('cancel', { cancelable: true }));
    expect(http.post).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
    unmount();
    await act(async () => { ceremony.resolve({ data: { note: { id: 'note-new' } } }); await ceremony.promise; });
    expect(http.post).toHaveBeenCalledOnce();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
