import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyBoardChanged } from '@/pages/Boards/boardEvents';
import { createInFlightWriteRegistry } from '../inFlightWriteRegistry';
import type { NoteMetadata, NoteTag } from '../noteMetadataRepository';
import { NoteCoverMetadata, type NoteCoverMetadataProps } from './NoteCoverMetadata';

const repository = vi.hoisted(() => ({ tags: vi.fn(), metadata: vi.fn(), addTag: vi.fn(), deleteTag: vi.fn() }));
vi.mock('../noteMetadataRepository', () => ({ noteMetadataRepository: repository }));

const emptyMetadata: NoteMetadata = {
  upstream: { sources: [], notes: [], count: 0 },
  downstream: { boards: [], content_groups: [], count: 0 },
};
const references: NoteMetadata = {
  upstream: {
    sources: [{ document_id: 'document-1', source_record_id: 'source-1', projection_note_id: 'projection-1',
      block_id: 'block-1', reference_id: 'reference-1', title: 'Lecture source', course_id: 'course-1', count: 3 }],
    notes: [{ note_id: 'related note', title: 'Related note', course_id: 'course-1', count: 2 }],
    count: 2,
  },
  downstream: {
    boards: [{ board_id: 'study board', title: 'Study board', count: 4 }],
    content_groups: [{ content_group_id: 'study group', note_id: 'group note', course_id: 'course-1',
      title: 'Study group', count: 5 }],
    count: 2,
  },
};
const tag = (label: string, id = label): NoteTag => ({
  id, note_id: 'note-1', user_id: 'user-1', label, actor: 'user', created_at: '2026-09-11T12:00:00Z',
});
const props = (overrides: Partial<NoteCoverMetadataProps> = {}): NoteCoverMetadataProps => ({
  noteId: 'note-1', readOnly: false, mode: 'page', blockCount: 7, sourceCount: 3, status: 'active',
  onOpenSource: vi.fn(), ...overrides,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((complete, fail) => { resolve = complete; reject = fail; });
  return { promise, resolve, reject };
}

function CurrentRoute() {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname}{location.search}</output>;
}

function RouterWrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={['/notes/note-1']}>
    {children}<CurrentRoute />
  </MemoryRouter>;
}

async function mount(overrides: Partial<NoteCoverMetadataProps> = {}) {
  const input = props(overrides);
  const view = render(<NoteCoverMetadata {...input} />, { wrapper: RouterWrapper });
  await act(async () => undefined);
  return { ...view, input };
}

async function openMetadata(name: string | RegExp = 'Add tags') {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name })); });
  return screen.getByRole('dialog', { name: 'Note metadata' });
}

beforeEach(() => {
  vi.resetAllMocks();
  repository.tags.mockResolvedValue([]);
  repository.metadata.mockResolvedValue(emptyMetadata);
  repository.addTag.mockImplementation(async (_noteId: string, label: string) => tag(label));
  repository.deleteTag.mockResolvedValue(undefined);
});

describe('note cover metadata behavior', () => {
  it('hydrates stored tags, trims additions and reflects successful deletion across remounts', async () => {
    let persisted = [tag('Existing')];
    repository.tags.mockImplementation(async () => persisted.map((entry) => ({ ...entry })));
    repository.addTag.mockImplementation(async (_noteId: string, label: string) => {
      const added = tag(label, 'new-tag');
      persisted = [...persisted, added];
      return added;
    });
    repository.deleteTag.mockImplementation(async (_noteId: string, id: string) => {
      persisted = persisted.filter((entry) => entry.id !== id);
    });
    const first = await mount();
    expect(screen.getByRole('button', { name: 'Remove tag Existing' })).toBeTruthy();
    expect(repository.tags).toHaveBeenCalledWith('note-1');
    await openMetadata();
    fireEvent.change(screen.getByRole('textbox', { name: 'Add tags' }), { target: { value: '  Revision  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }));
    await screen.findByRole('button', { name: 'Remove tag Revision' });
    expect(repository.addTag).toHaveBeenCalledExactlyOnceWith('note-1', 'Revision');
    expect((screen.getByRole('textbox', { name: 'Add tags' }) as HTMLInputElement).value).toBe('');
    first.unmount();

    const second = await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag Revision' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove tag Revision' })).toBeNull());
    expect(repository.deleteTag).toHaveBeenCalledExactlyOnceWith('note-1', 'new-tag');
    second.unmount();

    await mount();
    expect(screen.queryByText('Revision')).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove tag Existing' })).toBeTruthy();
  });

  it('marks an empty row quiet and omits the zero-count disclosure while retaining the add entry', async () => {
    const view = await mount();
    expect(view.container.querySelector('[data-note-cover-metadata]')?.getAttribute('data-empty')).toBe('true');
    expect(screen.queryByRole('button', { name: /Upstream/ })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add tags' })).toBeTruthy();
    const popup = await openMetadata();
    expect(within(popup).getByText('No upstream references.')).toBeTruthy();
    expect(within(popup).getByText('No downstream references.')).toBeTruthy();
    expect(within(popup).getByRole('heading', { name: 'Statistics' })).toBeTruthy();
  });

  it('expands one disclosure into upstream, downstream and all four former View info statistics', async () => {
    repository.metadata.mockResolvedValue(references);
    const view = await mount({ mode: 'canvas', blockCount: 17, sourceCount: 9, status: 'stale' });
    expect(view.container.querySelector('[data-note-cover-metadata]')?.getAttribute('data-empty')).toBe('false');
    const popup = await openMetadata('Upstream 2 · Downstream 2');
    expect(within(popup).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent))
      .toEqual(['Upstream', 'Downstream', 'Statistics']);
    for (const [title, count] of [['Lecture source', '3'], ['Related note', '2'], ['Study board', '4'], ['Study group', '5']]) {
      expect(within(popup).getByText(title).closest('li')?.textContent).toBe(`${title}${count}`);
    }
    const statistics = within(popup).getByRole('region', { name: 'Statistics' });
    expect(within(statistics).getAllByRole('term').map((term) => term.textContent)).toEqual(['Mode', 'Blocks', 'Sources', 'Status']);
    expect(within(statistics).getAllByRole('definition').map((definition) => definition.textContent)).toEqual(['Canvas', '17', '9', 'stale']);
    expect(screen.queryByRole('button', { name: 'View info' })).toBeNull();
  });

  it.each([
    ['Related note', '/notes/related%20note'],
    ['Study board', '/boards/study%20board'],
    ['Study group', '/group-gallery/editor?note_id=group+note&group_id=study+group'],
  ])('navigates %s through its existing route and dismisses the popup', async (title, href) => {
    repository.metadata.mockResolvedValue(references);
    await mount();
    const popup = await openMetadata('Upstream 2 · Downstream 2');
    const link = within(popup).getByRole('link', { name: new RegExp(title) });
    expect(link.getAttribute('href')).toBe(href);
    expect(screen.getByRole('status', { name: 'Current route' }).textContent).toBe('/notes/note-1');
    fireEvent.click(link);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status', { name: 'Current route' }).textContent).toBe(href);
  });

  it('routes a content group without a current note to its project with an explicit fallback label', async () => {
    repository.metadata.mockResolvedValue({
      ...emptyMetadata,
      downstream: {
        boards: [], count: 1,
        content_groups: [{ content_group_id: 'orphan-group', note_id: null, course_id: 'parent project',
          title: 'Retained group', count: 2 }],
      },
    } satisfies NoteMetadata);
    await mount();
    const popup = await openMetadata('Upstream 0 · Downstream 1');
    const link = within(popup).getByRole('link', { name: 'Retained group · Open project 2' });
    expect(link.getAttribute('href')).toBe('/projects/parent%20project');
    expect(link.getAttribute('title')).toContain('no current note location');
    fireEvent.click(link);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status', { name: 'Current route' }).textContent).toBe('/projects/parent%20project');
  });

  it('opens a source through its callback and retains a failed navigation for retry', async () => {
    repository.metadata.mockResolvedValue(references);
    const onOpenSource = vi.fn().mockRejectedValueOnce(new Error('Temporary source failure')).mockResolvedValue(undefined);
    await mount({ onOpenSource });
    await openMetadata('Upstream 2 · Downstream 2');
    fireEvent.click(screen.getByRole('button', { name: 'Lecture source 3' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Could not open this source');
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Lecture source 3' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onOpenSource).toHaveBeenNthCalledWith(1, references.upstream.sources[0]);
    expect(onOpenSource).toHaveBeenNthCalledWith(2, references.upstream.sources[0]);
  });

  it('reads current tags and references whenever the popup is reopened', async () => {
    await mount();
    await openMetadata();
    fireEvent.click(screen.getByRole('button', { name: 'Close note metadata' }));
    repository.tags.mockResolvedValue([tag('Changed elsewhere')]);
    repository.metadata.mockResolvedValue(references);
    await openMetadata();
    expect(screen.getByRole('button', { name: 'Remove tag Changed elsewhere' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upstream 2 · Downstream 2' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Study board 4' })).toBeTruthy();
  });

  it('refreshes existing edges after a board change and when returning to the window', async () => {
    await mount();
    repository.metadata.mockResolvedValue(references);
    act(() => notifyBoardChanged('study board'));
    await screen.findByRole('button', { name: 'Upstream 2 · Downstream 2' });
    repository.tags.mockResolvedValue([tag('Returned')]);
    fireEvent.focus(window);
    expect(await screen.findByRole('button', { name: 'Remove tag Returned' })).toBeTruthy();
  });

  it('keeps partial successful reads and offers a recoverable metadata read error', async () => {
    repository.tags.mockResolvedValue([tag('Available')]);
    repository.metadata.mockRejectedValue(new Error('Temporary read failure'));
    const view = await mount();
    expect(screen.getByRole('button', { name: 'Remove tag Available' })).toBeTruthy();
    expect(view.container.querySelector('[data-note-cover-metadata]')?.getAttribute('data-empty')).toBe('false');
    await openMetadata('Retry metadata');
    expect(screen.getByRole('alert').textContent).toContain('Could not refresh metadata');
    repository.metadata.mockResolvedValue(references);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.getByRole('button', { name: 'Upstream 2 · Downstream 2' })).toBeTruthy();
  });

  it('retains an unsaved label on failure and permits retry without a phantom chip', async () => {
    repository.addTag.mockRejectedValueOnce(new Error('Temporary write failure')).mockImplementation(async () => {
      repository.tags.mockResolvedValue([tag('Retry me')]);
      return tag('Retry me');
    });
    await mount();
    await openMetadata();
    const input = screen.getByRole('textbox', { name: 'Add tags' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Retry me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Could not save tags');
    expect(input.value).toBe('Retry me');
    expect(screen.queryByRole('button', { name: 'Remove tag Retry me' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }));
    await screen.findByRole('button', { name: 'Remove tag Retry me' });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(repository.addTag).toHaveBeenCalledTimes(2);
  });

  it('preserves a tag when deletion fails and permits retry directly from its chip', async () => {
    repository.tags.mockResolvedValue([tag('Keep until saved')]);
    repository.deleteTag.mockRejectedValueOnce(new Error('Temporary write failure')).mockImplementation(async () => {
      repository.tags.mockResolvedValue([]);
    });
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag Keep until saved' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Could not save tags');
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag Keep until saved' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove tag Keep until saved' })).toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(repository.deleteTag).toHaveBeenCalledTimes(2);
  });

  it('renders readonly tags and reference details without mutation controls', async () => {
    repository.tags.mockResolvedValue([tag('Stored')]);
    repository.metadata.mockResolvedValue(references);
    await mount({ readOnly: true });
    expect(screen.getByText('Stored')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Remove tag Stored' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add tags' })).toBeNull();
    const popup = await openMetadata('Upstream 2 · Downstream 2');
    expect(within(popup).queryByRole('textbox')).toBeNull();
    expect(within(popup).getByRole('link', { name: 'Study board 4' })).toBeTruthy();
    expect(repository.addTag).not.toHaveBeenCalled();
    expect(repository.deleteTag).not.toHaveBeenCalled();
  });

  it('closes an open popup when overview hides the row and keeps it closed on return', async () => {
    const view = await mount();
    await openMetadata();
    view.rerender(<NoteCoverMetadata {...view.input} hidden />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(view.container.querySelector('[data-note-cover-metadata]')?.getAttribute('data-projection-hidden')).toBe('true');
    view.rerender(<NoteCoverMetadata {...view.input} hidden={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add tags' }).getAttribute('aria-expanded')).toBe('false');
  });

  it.each(['addition', 'deletion'] as const)('keeps host close waiting for a tag %s and retains failure until its retry succeeds', async (operation) => {
    const registry = createInFlightWriteRegistry();
    const held = deferred<NoteTag | void>();
    const failedWrite = new Error('Synthetic pending tag failure');
    const method = operation === 'addition' ? repository.addTag : repository.deleteTag;
    method.mockReturnValueOnce(held.promise);
    let persisted = operation === 'deletion' ? [tag('Pending tag')] : [];
    repository.tags.mockImplementation(async () => persisted);
    await mount({ trackPendingWrite: registry.track });
    if (operation === 'addition') {
      await openMetadata();
      fireEvent.change(screen.getByRole('textbox', { name: 'Add tags' }), { target: { value: 'Pending tag' } });
    }
    const mutate = () => fireEvent.click(screen.getByRole('button', {
      name: operation === 'addition' ? 'Add tag' : 'Remove tag Pending tag',
    }));
    mutate();
    const closed = vi.fn();
    const failed = vi.fn();
    const draining = registry.whenIdle().then(closed, failed);
    await act(async () => undefined);
    expect(closed).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    await act(async () => { held.reject(failedWrite); await draining; });
    expect(failed).toHaveBeenCalledExactlyOnceWith(failedWrite);
    expect(closed).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Could not save tags');
    await expect(registry.whenIdle()).rejects.toBe(failedWrite);

    const retry = deferred<NoteTag | void>();
    method.mockReturnValueOnce(retry.promise);
    mutate();
    const retried = registry.whenIdle().then(closed);
    await act(async () => undefined);
    expect(closed).not.toHaveBeenCalled();
    await act(async () => {
      persisted = operation === 'addition' ? [tag('Pending tag')] : [];
      retry.resolve(operation === 'addition' ? tag('Pending tag') : undefined);
      await retried;
    });
    expect(closed).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).toBeNull();
    await expect(registry.whenIdle()).resolves.toBeUndefined();
    if (operation === 'addition') expect(screen.getByRole('button', { name: 'Remove tag Pending tag' })).toBeTruthy();
    else expect(screen.queryByRole('button', { name: 'Remove tag Pending tag' })).toBeNull();
  });

  it('receives a slow relationship read after adding a tag without replacing the confirmed tag', async () => {
    let persisted: NoteTag[] = [];
    repository.tags.mockImplementation(async () => persisted);
    repository.addTag.mockImplementation(async (_noteId: string, label: string) => {
      const added = tag(label);
      persisted = [...persisted, added];
      return added;
    });
    await mount();
    const slowMetadata = deferred<NoteMetadata>();
    repository.metadata.mockReturnValue(slowMetadata.promise);
    await openMetadata();
    fireEvent.change(screen.getByRole('textbox', { name: 'Add tags' }), { target: { value: 'While loading' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }));
    await screen.findByRole('button', { name: 'Remove tag While loading' });
    expect(screen.queryByRole('button', { name: /Upstream/ })).toBeNull();
    await act(async () => { slowMetadata.resolve(references); });
    expect(screen.getByRole('button', { name: 'Upstream 2 · Downstream 2' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Study board 4' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove tag While loading' })).toBeTruthy();
  });

  it('reconciles previously stored tags after adding before the initial tag read has hydrated', async () => {
    const initialRead = deferred<NoteTag[]>();
    let persisted = [tag('Already stored')];
    repository.tags.mockImplementation(async () => persisted.map((entry) => ({ ...entry })))
      .mockReturnValueOnce(initialRead.promise).mockReturnValueOnce(initialRead.promise);
    repository.addTag.mockImplementation(async (_noteId: string, label: string) => {
      const added = tag(label);
      persisted = [...persisted, added];
      return added;
    });
    await mount();
    await openMetadata();
    expect(screen.queryByRole('button', { name: 'Remove tag Already stored' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Add tags' }), { target: { value: 'Added while loading' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add tag' }));
    await screen.findByRole('button', { name: 'Remove tag Added while loading' });
    await screen.findByRole('button', { name: 'Remove tag Already stored' });
    // The original GET can still finish last; it must not erase the confirmed addition.
    await act(async () => { initialRead.resolve([tag('Already stored')]); });
    expect(screen.getByRole('button', { name: 'Remove tag Already stored' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove tag Added while loading' })).toBeTruthy();
  });

  it('lets a readonly note with no tags or references open its statistics from the quiet entry', async () => {
    const view = await mount({ readOnly: true });
    expect(view.container.querySelector('[data-note-cover-metadata]')?.getAttribute('data-empty')).toBe('true');
    expect(screen.queryByRole('button', { name: /Upstream/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add tags' })).toBeNull();
    const popup = await openMetadata('Note metadata');
    const statistics = within(popup).getByRole('region', { name: 'Statistics' });
    expect(within(statistics).getAllByRole('definition').map((definition) => definition.textContent))
      .toEqual(['Page', '7', '3', 'active']);
    expect(within(popup).queryByRole('textbox')).toBeNull();
    expect(within(popup).queryByRole('button', { name: 'Add tag' })).toBeNull();
    expect(repository.addTag).not.toHaveBeenCalled();
    expect(repository.deleteTag).not.toHaveBeenCalled();
  });

  it.each(['addition', 'deletion'] as const)('does not let an older read undo a confirmed tag %s', async (operation) => {
    const original = operation === 'deletion' ? [tag('Old tag')] : [];
    let persisted = original;
    repository.tags.mockImplementation(async () => persisted);
    repository.addTag.mockImplementation(async (_noteId: string, label: string) => {
      const added = tag(label);
      persisted = [...persisted, added];
      return added;
    });
    repository.deleteTag.mockImplementation(async (_noteId: string, id: string) => {
      persisted = persisted.filter((entry) => entry.id !== id);
    });
    await mount();
    const delayedTags = deferred<NoteTag[]>();
    repository.tags.mockReturnValueOnce(delayedTags.promise);
    await openMetadata();
    if (operation === 'addition') {
      fireEvent.change(screen.getByRole('textbox', { name: 'Add tags' }), { target: { value: 'New tag' } });
      fireEvent.click(screen.getByRole('button', { name: 'Add tag' }));
      await screen.findByRole('button', { name: 'Remove tag New tag' });
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'Remove tag Old tag' }));
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove tag Old tag' })).toBeNull());
    }
    await act(async () => { delayedTags.resolve(original); });
    if (operation === 'addition') expect(screen.getByRole('button', { name: 'Remove tag New tag' })).toBeTruthy();
    else expect(screen.queryByRole('button', { name: 'Remove tag Old tag' })).toBeNull();
  });

  it('dismisses with Escape and restores keyboard focus to the opener', async () => {
    await mount();
    const opener = screen.getByRole('button', { name: 'Add tags' });
    await openMetadata();
    const input = screen.getByRole('textbox', { name: 'Add tags' });
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
