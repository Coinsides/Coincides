import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeContentGroup } from '@/pages/Notes/canvasEngine/contentGroupService';
import type { ContentGroupV1 } from '@/pages/Notes/canvasEngine/runtimeDataTypes';
import GroupGalleryPage from './GroupGallery';
import { groupPreview, loadGroupGalleryRecords, memberPreview, saveGalleryRecord } from './groupGalleryData';
import SingleContentGroupEditorPage from './SingleContentGroupEditor';

// Every request ends here: these fixtures never load a server, database, or HTTP transport.
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock('@/services/api', () => ({ default: http }));

let groups: ContentGroupV1[];
let currentText: string;
const project = { id: 'project-1', name: 'Fixture project' };
const notes = ['note-1', 'note-2'].map((id) => ({
  id, course_id: project.id, title: id, description: null, status: 'active', metadata: {},
}));

beforeEach(() => {
  vi.resetAllMocks();
  currentText = 'Current Item body, from Item truth';
  groups = notes.map((note, index) => normalizeContentGroup({
    id: `group-${index + 1}`, project_id: project.id, note_id: note.id, canvas_id: note.id,
    title: `Fixture group ${index + 1}`, members: [
      { id: `member-${index + 1}`, kind: 'item', item_id: 'item-1', order_index: 0 },
    ],
  }));
  http.get.mockImplementation(async (url: string, options?: { params?: { note_id?: string } }) => {
    if (url === '/courses') return { data: [project] };
    if (url === '/notes?course_id=project-1') return { data: notes };
    if (url === '/content-groups') return { data: groups.filter((group) => group.note_id === options?.params?.note_id) };
    if (url === '/group-folders') return { data: [] };
    throw new Error(`Unexpected fixture read: ${url}`);
  });
  http.post.mockImplementation(async (url: string) => {
    if (url !== '/items/summaries') throw new Error(`Unexpected fixture endpoint: ${url}`);
    return { data: [{
      id: 'item-1', summary: currentText, status: 'active', item_type: 'Claim', topic: null,
      origin_note_id: null, origin_course_id: null,
    }] };
  });
  http.put.mockImplementation(async (_url: string, body: { groups?: ContentGroupV1[]; folders?: unknown[] }) => ({
    data: body.groups || body.folders,
  }));
});

describe('Gallery Item summary projection', () => {
  it('resolves one shared Item across all records once and keeps current text out of membership saves', async () => {
    const originalGroups = structuredClone(groups);
    const records = await loadGroupGalleryRecords();

    expect(records).toHaveLength(2);
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/items/summaries', { item_ids: ['item-1'] });
    expect(records[0].itemSummaries).toBe(records[1].itemSummaries);
    for (const record of records) expect(groupPreview(record.groups[0], record.itemSummaries)).toBe(currentText);
    expect(groups).toEqual(originalGroups);
    expect(http.put).not.toHaveBeenCalled();

    const saved = await saveGalleryRecord(records[0], records[0].groups, []);
    expect(http.put.mock.calls[0][1]).toEqual({ groups: originalGroups.slice(0, 1) });
    expect(saved.groups).toEqual(originalGroups.slice(0, 1));
    expect(groupPreview(saved.groups[0], saved.itemSummaries)).toBe(currentText);
  });

  it('renders Item body in the Gallery and reloads changed current text when reopened', async () => {
    const view = render(<MemoryRouter><GroupGalleryPage /></MemoryRouter>);
    expect(await screen.findAllByText(currentText)).toHaveLength(2);
    expect(http.post).toHaveBeenCalledTimes(1);
    view.unmount();

    currentText = 'Revised current Item body';
    render(<MemoryRouter><GroupGalleryPage /></MemoryRouter>);
    expect(await screen.findAllByText(currentText)).toHaveLength(2);
    expect(http.post).toHaveBeenCalledTimes(2);
  });

  it('carries the same read map into the single-group editor member preview', async () => {
    render(<MemoryRouter initialEntries={['/group-gallery/editor?note_id=note-1&group_id=group-1']}>
      <SingleContentGroupEditorPage />
    </MemoryRouter>);
    expect(await screen.findByText(currentText)).toBeTruthy();
    expect(screen.getByText('item active')).toBeTruthy();
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('makes retired and missing members visible without using stale copied text or changing legacy previews', async () => {
    const [record] = await loadGroupGalleryRecords();
    const member = { ...record.groups[0].members[0], current_content: 'Stale copied text' };
    const summary = record.itemSummaries!.get('item-1')!;
    expect(memberPreview(member, new Map([['item-1', { ...summary, status: 'retired' }]])))
      .toBe(`Retired item: ${currentText}`);
    expect(memberPreview(member, new Map())).toBe('Item unavailable');
    expect(memberPreview({ id: 'legacy-block', kind: 'block', target_id: 'block-1', order_index: 0, current_content: 'Legacy block text' }))
      .toBe('Legacy block text');
  });
});
