import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));

import { loadUnattachedContentGroups } from './groupGalleryData';

const group = (id: string, noteId: string | null, status = 'active') => ({
  id, note_id: noteId, course_id: 'course-1', title: `Group ${id}`, status, identity: { topic: 't' },
  members: [], placements: [], folder_id: null, parent_group_id: null, view_state: {}, metadata: {},
});

describe('groups that are not in any note', () => {
  beforeEach(() => {
    http.get.mockReset();
    http.get.mockImplementation(async (url: string) => {
      if (url === '/courses') return { data: [{ id: 'course-1', name: 'Finance' }] };
      return { data: [group('kept', 'note-1'), group('orphan', ''), group('orphan-null', null), group('gone', '', 'deleted')] };
    });
  });

  it('lists active groups whose note is gone, and nothing that still has a note', async () => {
    const found = await loadUnattachedContentGroups();
    expect(found.map(({ group: item }) => item.id)).toEqual(['orphan', 'orphan-null']);
    expect(found[0].project.name).toBe('Finance');
  });

  it('only reads: it makes no write request', async () => {
    await loadUnattachedContentGroups();
    expect(Object.keys(http)).toEqual(['get']);
  });
});
