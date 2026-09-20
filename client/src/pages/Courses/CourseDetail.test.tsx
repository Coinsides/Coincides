import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from '@shared/types';
import { ProjectIdentity, ProjectNotesSection } from './CourseDetail';

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

const project: Course = {
  id: 'course-1',
  user_id: 'user-1',
  name: 'Linear Algebra',
  code: 'MAT 240',
  color: '#6366f1',
  weight: 3,
  description: 'Vector spaces and linear maps',
  semester: '2026 Fall',
  created_at: '2026-08-01T12:00:00.000Z',
  updated_at: '2026-08-29T12:00:00.000Z',
};

describe('ProjectIdentity', () => {
  it('K-3d renders Project identity without a priority weight surface', () => {
    render(<ProjectIdentity course={project} />);

    expect(screen.getByText('Linear Algebra')).toBeTruthy();
    expect(screen.queryByText('High')).toBeNull();
  });
});

describe('ProjectNotesSection lifecycle actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.delete.mockResolvedValue({ data: { message: 'Note moved to trash' } });
    mocks.post.mockResolvedValue({ data: { message: 'Note restored' } });
  });

  it('creates a project note as A4 without a paper picker', () => {
    const onCreateNote = vi.fn();
    render(<ProjectNotesSection notes={[note]} status="active" onStatusChange={vi.fn()}
      onCreateNote={onCreateNote} onOpenNote={vi.fn()} refreshNotes={vi.fn()} addToast={vi.fn()} />);
    expect(screen.queryByRole('combobox', { name: 'Paper size' })).toBeNull();
    expect(screen.queryByText('Web long page')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'New Note' }));
    expect(onCreateNote).toHaveBeenCalledExactlyOnceWith('a4_portrait');
  });

  it('opens an existing note without creating or changing its paper', () => {
    const onCreateNote = vi.fn();
    const onOpenNote = vi.fn();
    render(<ProjectNotesSection notes={[note]} status="active" onStatusChange={vi.fn()}
      onCreateNote={onCreateNote} onOpenNote={onOpenNote} refreshNotes={vi.fn()} addToast={vi.fn()} />);
    expect(onCreateNote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Open note Project note' }));
    expect(onOpenNote).toHaveBeenCalledExactlyOnceWith('note-project-entry');
    expect(onCreateNote).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
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
