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
  http.post.mockImplementation(async (path: string) => path === '/courses'
    ? { data: { id: 'project-new', name: 'Chinese history' } }
    : { data: { id: 'note-new', course_id: 'project-new', title: 'Trade routes' } });
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
  return { ...render(<BoardNewNoteDialog initialProjectId={initialProjectId} onCreated={onCreated} onCancel={onCancel} />), onCreated, onCancel };
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
  it('requires a project and nonblank title, creates a name-only project, then opens the real note identity', async () => {
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
    expect(http.post.mock.calls).toEqual([
      ['/courses', { name: 'Chinese history' }],
      ['/notes', { course_id: 'project-new', title: 'Trade routes' }],
    ]);
    expect(http.put).toHaveBeenCalledExactlyOnceWith('/canvas-objects/by-note/note-new/page-frame-collection',
      { collection: expect.objectContaining({ pageFrames: [expect.any(Object)] }) });
  });

  it('offers existing projects and creates the note under the selected project', async () => {
    const { onCreated } = openDialog('project-first');
    const project = screen.getByRole('combobox', { name: 'Project' }) as HTMLSelectElement;
    await waitFor(() => expect(project.value).toBe('project-first'));
    fireEvent.change(project, { target: { value: 'project-second' } });
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledExactlyOnceWith('note-new'));
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/notes', { course_id: 'project-second', title: 'Trade routes' });
    expect(screen.queryByRole('textbox', { name: 'Project name' })).toBeNull();
  });

  it('keeps a newly created project selected when note creation fails, so retry does not create another project', async () => {
    http.post.mockResolvedValueOnce({ data: { id: 'project-new', name: 'Chinese history' } })
      .mockRejectedValueOnce(new Error('Synthetic note write failure'))
      .mockResolvedValueOnce({ data: { id: 'note-retried' } });
    const { onCreated } = openDialog();
    await chooseNewProject();
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Your selected project is kept');
    expect(onCreated).not.toHaveBeenCalled();
    expect((screen.getByRole('combobox', { name: 'Project' }) as HTMLSelectElement).value).toBe('project-new');
    expect((screen.getByRole('textbox', { name: 'Note title' }) as HTMLInputElement).value).toBe('  Trade routes  ');
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledExactlyOnceWith('note-retried'));
    expect(http.post.mock.calls.map(([path]) => path)).toEqual(['/courses', '/notes', '/notes']);
  });

  it('preserves the form after project creation fails and never creates a note prematurely', async () => {
    http.post.mockRejectedValueOnce(new Error('Synthetic project write failure'));
    const { onCreated } = openDialog();
    await chooseNewProject();
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Could not create the project');
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/courses', { name: 'Chinese history' });
    expect(onCreated).not.toHaveBeenCalled();
    expect((screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement).value).toBe('  Chinese history  ');
  });

  it('waits for stored layout before opening and retries setup on the same created note and frame', async () => {
    http.put.mockRejectedValueOnce(new Error('Synthetic page collection write failure'));
    const { onCreated } = openDialog('project-first');
    await waitFor(() => expect((screen.getByRole('combobox', { name: 'Project' }) as HTMLSelectElement).value).toBe('project-first'));
    fillTitle();
    fireEvent.click(screen.getByRole('button', { name: 'Create note' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Retry opening the same note');
    expect(onCreated).not.toHaveBeenCalled();
    expect((screen.getByRole('textbox', { name: 'Note title' }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('combobox', { name: 'Project' }) as HTMLSelectElement).disabled).toBe(true);
    const originalCollection = structuredClone(http.put.mock.calls[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry opening note' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledExactlyOnceWith('note-new'));
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/notes', { course_id: 'project-first', title: 'Trade routes' });
    expect(http.put.mock.calls).toEqual([originalCollection, originalCollection]);
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

  it('serializes double submission and does not continue into a note write after the board host unmounts', async () => {
    const createProject = deferred<{ data: { id: string; name: string } }>();
    http.post.mockReturnValueOnce(createProject.promise);
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
    await act(async () => { createProject.resolve({ data: { id: 'project-new', name: 'Chinese history' } }); await createProject.promise; });
    expect(http.post).toHaveBeenCalledOnce();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
