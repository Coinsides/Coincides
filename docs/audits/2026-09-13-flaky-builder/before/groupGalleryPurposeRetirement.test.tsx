import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from '@shared/types';
import type { ContentGroupV1, GroupFolderV1, Note } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import { normalizeContentGroup } from '@/pages/Notes/canvasEngine/contentGroupService';
import { normalizeGroupFolder } from '@/pages/Notes/canvasEngine/groupFolderService';
import { loadGroupGalleryRecords, saveGalleryRecord } from './groupGalleryData';
import SingleContentGroupEditorPage from './SingleContentGroupEditor';

// All I/O ends at this fixture. No server, database, or real HTTP transport is loaded.
const http = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));

const project: Course = {
  id: 'project-fixture', user_id: 'fixture', name: 'Fixture project', code: null,
  color: '#2563eb', weight: 1, description: null, semester: null,
  created_at: '2026-09-08T00:00:00.000Z', updated_at: '2026-09-08T00:00:00.000Z',
};
const note: Note = {
  id: 'note-fixture', course_id: project.id, title: 'Fixture note',
  description: null, status: 'active', metadata: {},
};
let groups: ContentGroupV1[];
let folders: GroupFolderV1[];

function unavailableEndpoint(url: string): never {
  if (url.startsWith('/purposes')) {
    throw Object.assign(new Error('note_purpose_writer_retired'), { response: { status: 410 } });
  }
  throw new Error(`Unexpected fixture endpoint: ${url}`);
}

beforeEach(() => {
  vi.resetAllMocks();
  folders = [normalizeGroupFolder({
    id: 'folder-fixture', title: 'Note groups', system_root: true,
    scope: { kind: 'note', note_id: note.id, project_id: project.id, label: null },
  })];
  groups = [normalizeContentGroup({
    id: 'group-fixture', project_id: project.id, note_id: note.id, canvas_id: note.id,
    title: 'Original group', folder_id: folders[0].id, members: [],
    identity: { summary: 'Original summary' },
  })];
  http.get.mockImplementation(async (url: string) => {
    if (url === '/courses') return { data: [project] };
    if (url === `/notes?course_id=${project.id}`) return { data: [note] };
    if (url === '/content-groups') return { data: groups };
    if (url === '/group-folders') return { data: folders };
    return unavailableEndpoint(url);
  });
  http.put.mockImplementation(async (url: string, body: { groups?: ContentGroupV1[]; folders?: GroupFolderV1[] }) => {
    if (url === `/content-groups/by-note/${note.id}` && body.groups) {
      groups = body.groups;
      return { data: groups };
    }
    if (url === `/group-folders/by-note/${note.id}` && body.folders) {
      folders = body.folders;
      return { data: folders };
    }
    return unavailableEndpoint(url);
  });
  http.post.mockImplementation(async (url: string) => unavailableEndpoint(url));
});

describe('Gallery Purpose writer retirement', () => {
  it('loads groups and folders without deriving purposes from project notes', async () => {
    const records = await loadGroupGalleryRecords();

    expect(records).toHaveLength(1);
    expect(records[0].groups[0].title).toBe('Original group');
    expect(records[0].folders[0].id).toBe('folder-fixture');
    expect(records[0]).not.toHaveProperty('purposes');
    expect(http.get.mock.calls.map(([url]) => url)).toEqual([
      '/courses', `/notes?course_id=${project.id}`, '/content-groups', '/group-folders',
    ]);
  });

  it('persists group and folder changes with no retired purpose write or second save', async () => {
    const [record] = await loadGroupGalleryRecords();
    const saved = await saveGalleryRecord(
      record,
      [{ ...record.groups[0], title: 'Changed group' }],
      [{ ...record.folders[0], title: 'Changed folder' }],
    );

    expect(saved.groups[0].title).toBe('Changed group');
    expect(saved.folders[0].title).toBe('Changed folder');
    expect(http.put.mock.calls.map(([url]) => url)).toEqual([
      `/content-groups/by-note/${note.id}`, `/group-folders/by-note/${note.id}`,
    ]);
    expect(http.post).not.toHaveBeenCalled();
  });

  it('saves the editor draft once and reopens the saved group without a default-purpose role', async () => {
    const view = render(
      <MemoryRouter initialEntries={[`/group-gallery/editor?note_id=${note.id}&group_id=group-fixture`]}>
        <SingleContentGroupEditorPage />
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: 'Save draft' });
    expect(screen.queryByRole('textbox', { name: 'Default purpose role' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Content group title' }), {
      target: { value: 'Saved through editor' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(http.put).toHaveBeenCalledTimes(2));
    view.unmount();

    const [reopened] = await loadGroupGalleryRecords();
    expect(reopened.groups[0].title).toBe('Saved through editor');
    expect(reopened.groups[0].identity.summary).toBe('Original summary');
    expect(http.put.mock.calls.map(([url]) => url)).toEqual([
      `/content-groups/by-note/${note.id}`, `/group-folders/by-note/${note.id}`,
    ]);
  });
});
