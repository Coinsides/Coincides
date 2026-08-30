import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from '@shared/types';
import type { ContentGroupV1, GroupFolderV1, Note } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import GroupGalleryPage from './GroupGallery';
import type { GalleryRecord } from './groupGalleryData';

const mocks = vi.hoisted(() => ({
  loadGroupGalleryRecords: vi.fn(),
  saveGalleryRecord: vi.fn(),
}));

vi.mock('./groupGalleryData', async () => {
  const actual = await vi.importActual<typeof import('./groupGalleryData')>('./groupGalleryData');
  return {
    ...actual,
    loadGroupGalleryRecords: mocks.loadGroupGalleryRecords,
    saveGalleryRecord: mocks.saveGalleryRecord,
  };
});

function project(id: string, name: string, color: string): Course {
  return {
    id,
    user_id: 'user-1',
    name,
    code: null,
    color,
    weight: 1,
    description: null,
    semester: null,
    created_at: '2026-08-01T12:00:00.000Z',
    updated_at: '2026-08-29T12:00:00.000Z',
  };
}

function note(id: string, projectId: string, title: string): Note {
  return {
    id,
    course_id: projectId,
    title,
    description: null,
    status: 'active',
    metadata: {},
  };
}

function folder(
  id: string,
  title: string,
  kind: GroupFolderV1['scope']['kind'],
  projectId: string | null,
  noteId: string | null,
): GroupFolderV1 {
  return {
    id,
    title,
    parent_folder_id: null,
    scope: { kind, project_id: projectId, note_id: noteId, label: null },
    origin: 'system',
    system_root: true,
    status: 'active',
    order_index: 0,
    created_at: '2026-08-01T12:00:00.000Z',
    updated_at: '2026-08-29T12:00:00.000Z',
    metadata: {},
  };
}

function group(id: string, projectId: string, noteId: string, folderId: string): ContentGroupV1 {
  return {
    id,
    project_id: projectId,
    note_id: noteId,
    canvas_id: noteId,
    folder_id: folderId,
    placements: [{
      folder_id: folderId,
      order_index: 0,
      added_at: '2026-08-29T11:00:00.000Z',
      added_by: 'human',
    }],
    depth: 0,
    title: `Group ${id}`,
    status: 'active',
    created_by: 'human',
    created_at: '2026-08-28T10:00:00.000Z',
    updated_at: '2026-08-29T11:00:00.000Z',
    members: [],
    identity: {
      status: 'none',
      type: null,
      role: null,
      topic: null,
      summary: null,
      created_by: 'human',
      reviewed_by: null,
      confidence: null,
      updated_at: '2026-08-29T11:00:00.000Z',
      accepted_at: null,
      metadata: {},
    },
    view_state: {},
    metadata: {},
  };
}

function last<T>(items: T[]): T | undefined {
  return items[items.length - 1];
}

const activeProject = project('project-active', 'Active Project', '#2563eb');
const activeNote = note('note-active', activeProject.id, 'Active note');
const activeNoteRoot = folder('note-root-active', 'Note groups', 'note', activeProject.id, activeNote.id);
const activeRecord: GalleryRecord = {
  project: activeProject,
  note: activeNote,
  folders: [
    folder('workspace-root-active', 'Workspace groups', 'workspace', null, null),
    folder('project-root-active', 'Project groups', 'project', activeProject.id, null),
    activeNoteRoot,
  ],
  groups: [group('active', activeProject.id, activeNote.id, activeNoteRoot.id)],
  purposes: [],
};

const emptyProject = project('project-empty', 'Empty Project', '#94a3b8');
const emptyNote = note('note-empty', emptyProject.id, 'Empty note');
const emptyRecord: GalleryRecord = {
  project: emptyProject,
  note: emptyNote,
  folders: [
    folder('workspace-root-empty', 'Workspace groups', 'workspace', null, null),
    folder('project-root-empty', 'Project groups', 'project', emptyProject.id, null),
    folder('note-root-empty', 'Note groups', 'note', emptyProject.id, emptyNote.id),
  ],
  groups: [],
  purposes: [],
};

const projectRoot = activeRecord.folders.find((item) => item.scope.kind === 'project')!;
const projectLevelRecord: GalleryRecord = {
  ...activeRecord,
  groups: [group('project', activeProject.id, activeNote.id, projectRoot.id)],
};

const unnamedNote = {
  ...note('note-unnamed', activeProject.id, ''),
  created_at: '2026-08-28T10:00:00.000Z',
  updated_at: '2026-08-29T10:00:00.000Z',
} as GalleryRecord['note'];
const unnamedNoteRoot = folder(
  'note-root-unnamed',
  'Note groups',
  'note',
  activeProject.id,
  unnamedNote.id,
);
const unnamedRecord: GalleryRecord = {
  project: activeProject,
  note: unnamedNote,
  folders: [
    folder('workspace-root-unnamed', 'Workspace groups', 'workspace', null, null),
    folder('project-root-unnamed', 'Project groups', 'project', activeProject.id, null),
    unnamedNoteRoot,
  ],
  groups: [group('unnamed', activeProject.id, unnamedNote.id, unnamedNoteRoot.id)],
  purposes: [],
};

function renderGallery(records: GalleryRecord[]) {
  mocks.loadGroupGalleryRecords.mockResolvedValue(records);
  mocks.saveGalleryRecord.mockImplementation(async (
    record: GalleryRecord,
    groups: ContentGroupV1[],
    folders: GroupFolderV1[],
  ) => ({ ...record, groups, folders }));
  return render(
    <MemoryRouter initialEntries={['/group-gallery']}>
      <GroupGalleryPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-probe">{location.pathname}{location.search}</output>;
}

describe('Group Gallery destination navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('K-1a renders the fixed destinations and the project group count', async () => {
    renderGallery([activeRecord, emptyRecord]);

    expect(await screen.findByRole('button', { name: '全部组 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '最近' })).toBeTruthy();
    expect(screen.getByText('按项目')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Active Project 1' })).toBeTruthy();
  });

  it('K-1b renders neither an empty project nor its empty note in the destination nav', async () => {
    renderGallery([activeRecord, emptyRecord]);

    await screen.findByText('Group active');
    expect(screen.queryByText('Empty Project')).toBeNull();
    expect(screen.queryByText('Empty note')).toBeNull();
  });
});

describe('Group Gallery origin badges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('K-2a renders the project badge for a project-level group', async () => {
    renderGallery([projectLevelRecord]);

    expect(await screen.findByRole('button', { name: 'Active Project · 项目级' })).toBeTruthy();
  });

  it('K-2b renders the project and note badge for a note-level group', async () => {
    renderGallery([activeRecord]);

    expect(await screen.findByRole('button', { name: 'Active Project · Active note' })).toBeTruthy();
  });

  it('K-2b renders an unnamed note with its M/D date and no bare fallback', async () => {
    renderGallery([unnamedRecord]);

    expect(await screen.findByRole('button', { name: 'Active Project · 未命名 · 8/29' })).toBeTruthy();
    expect(screen.queryByText('From Untitled note')).toBeNull();
  });
});

describe('Group Gallery origin navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('K-3 opens the Project page from a project-level badge', async () => {
    renderGallery([projectLevelRecord]);

    fireEvent.click(await screen.findByRole('button', { name: 'Active Project · 项目级' }));
    expect(screen.getByTestId('location-probe').textContent).toBe('/projects/project-active');
  });

  it('K-3 opens the Note page from a note-level badge', async () => {
    renderGallery([activeRecord]);

    fireEvent.click(await screen.findByRole('button', { name: 'Active Project · Active note' }));
    expect(screen.getByTestId('location-probe').textContent).toBe('/notes/note-active');
  });
});

describe('Group Gallery creation destinations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('K-4 creates a group in the selected project root', async () => {
    renderGallery([activeRecord]);

    fireEvent.click(await screen.findByRole('button', { name: 'Active Project 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'New group' }));
    await waitFor(() => expect(mocks.saveGalleryRecord).toHaveBeenCalledTimes(1));
    const savedGroups = mocks.saveGalleryRecord.mock.calls[0][1] as ContentGroupV1[];
    expect(last(savedGroups)?.folder_id).toBe('project-root-active');
  });

  it.each([
    ['全部组', null],
    ['最近', '最近'],
  ])('K-4 creates a group in the workspace root from %s', async (_label, destination) => {
    renderGallery([activeRecord]);

    if (destination) fireEvent.click(await screen.findByRole('button', { name: destination }));
    else await screen.findByRole('button', { name: '全部组 1' });
    fireEvent.click(screen.getByRole('button', { name: 'New group' }));
    await waitFor(() => expect(mocks.saveGalleryRecord).toHaveBeenCalledTimes(1));
    const savedGroups = mocks.saveGalleryRecord.mock.calls[0][1] as ContentGroupV1[];
    expect(last(savedGroups)?.folder_id).toBe('workspace-root-active');
  });

  it('K-4 creates a folder under the selected project root', async () => {
    renderGallery([activeRecord]);

    fireEvent.click(await screen.findByRole('button', { name: 'Active Project 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
    await waitFor(() => expect(mocks.saveGalleryRecord).toHaveBeenCalledTimes(1));
    const savedFolders = mocks.saveGalleryRecord.mock.calls[0][2] as GroupFolderV1[];
    expect(last(savedFolders)?.parent_folder_id).toBe('project-root-active');
    expect(last(savedFolders)?.scope.kind).toBe('project');
  });

  it.each([
    ['全部组', null],
    ['最近', '最近'],
  ])('K-4 creates a folder under the workspace root from %s', async (_label, destination) => {
    renderGallery([activeRecord]);

    if (destination) fireEvent.click(await screen.findByRole('button', { name: destination }));
    else await screen.findByRole('button', { name: '全部组 1' });
    fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
    await waitFor(() => expect(mocks.saveGalleryRecord).toHaveBeenCalledTimes(1));
    const savedFolders = mocks.saveGalleryRecord.mock.calls[0][2] as GroupFolderV1[];
    expect(last(savedFolders)?.parent_folder_id).toBe('workspace-root-active');
    expect(last(savedFolders)?.scope.kind).toBe('workspace');
  });

  it('K-4 gives an explicitly selected middle folder precedence over the destination root', async () => {
    renderGallery([activeRecord]);

    fireEvent.click(await screen.findByRole('button', { name: 'Active Project 1' }));
    const folderNavigator = screen.getByRole('region', { name: 'Folder view navigator' });
    fireEvent.click(within(folderNavigator).getByRole('button', { name: 'Note groups 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'New group' }));
    await waitFor(() => expect(mocks.saveGalleryRecord).toHaveBeenCalledTimes(1));
    const savedGroups = mocks.saveGalleryRecord.mock.calls[0][1] as ContentGroupV1[];
    expect(last(savedGroups)?.folder_id).toBe('note-root-active');
  });
});

describe('Group Gallery regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('K-5 filters group cards with the existing search box', async () => {
    renderGallery([activeRecord, unnamedRecord]);

    await screen.findByText('Group active');
    expect(screen.getByText('Group unnamed')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search folders and groups' }), {
      target: { value: 'Group active' },
    });
    expect(screen.getByText('Group active')).toBeTruthy();
    expect(screen.queryByText('Group unnamed')).toBeNull();
  });

  it('K-5 keeps the group visible while switching all three views', async () => {
    const { container } = renderGallery([activeRecord]);

    await screen.findByText('Group active');
    for (const [view, mode] of [['Topic view', 'topic'], ['Type view', 'type'], ['Folder view', 'folder']]) {
      fireEvent.click(screen.getByRole('button', { name: view }));
      expect(container.querySelector(`[data-gallery-mode="${mode}"]`)).toBeTruthy();
      expect(screen.getByText('Group active')).toBeTruthy();
    }
  });

  it('K-5 opens an existing group in the single-group editor', async () => {
    renderGallery([activeRecord]);

    const title = await screen.findByText('Group active');
    const cardButton = title.closest('button');
    expect(cardButton).not.toBeNull();
    fireEvent.click(cardButton!);
    expect(screen.getByTestId('location-probe').textContent).toBe(
      '/group-gallery/editor?note_id=note-active&group_id=active&folder_id=note-root-active&mode=folder',
    );
  });
});
