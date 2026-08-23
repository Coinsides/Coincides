import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectNotesSection } from './CourseDetail';

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  default: {
    delete: mocks.delete,
    post: mocks.post,
  },
}));

const note = {
  id: 'note-project-entry',
  title: 'Project note',
  description: 'Human lifecycle entry',
  updated_at: '2026-08-23T12:00:00.000Z',
};

describe('ProjectNotesSection lifecycle actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.delete.mockResolvedValue({ data: { message: 'Note moved to trash' } });
    mocks.post.mockResolvedValue({ data: { message: 'Note restored' } });
  });

  it('clicking the trash action calls api.delete with the note URL', async () => {
    const refreshNotes = vi.fn().mockResolvedValue(undefined);
    const addToast = vi.fn();

    render(
      <ProjectNotesSection
        notes={[note]}
        status="active"
        onStatusChange={vi.fn()}
        onCreateNote={vi.fn()}
        onOpenNote={vi.fn()}
        refreshNotes={refreshNotes}
        addToast={addToast}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move Project note to trash' }));

    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith('/notes/note-project-entry'));
    expect(mocks.post).not.toHaveBeenCalled();
    expect(refreshNotes).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith('success', 'Note moved to trash');
  });

  it('clicking the restore action calls api.post with the restore URL', async () => {
    const refreshNotes = vi.fn().mockResolvedValue(undefined);
    const addToast = vi.fn();

    render(
      <ProjectNotesSection
        notes={[note]}
        status="trashed"
        onStatusChange={vi.fn()}
        onCreateNote={vi.fn()}
        onOpenNote={vi.fn()}
        refreshNotes={refreshNotes}
        addToast={addToast}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Restore Project note' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/notes/note-project-entry/restore'));
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(refreshNotes).toHaveBeenCalledTimes(1);
    expect(addToast).toHaveBeenCalledWith('success', 'Note restored');
  });
});
