import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createContentGroup, createContentGroupMemberFromItem } from '../contentGroupService';
import { createGroupFolder } from '../groupFolderService';
import type { ItemV1, PurposeFrameV1, RelationV1 } from '../runtimeDataTypes';
import { ContentGroupPanel } from './ContentGroupPanel';

const mocks = vi.hoisted(() => ({
  loadItem: vi.fn(),
  loadPoolItemAnchors: vi.fn(),
  searchItems: vi.fn(),
  updateItem: vi.fn(),
  loadRelations: vi.fn(),
  loadRelationTypes: vi.fn(),
  createRelation: vi.fn(),
}));

vi.mock('../itemRepository', () => ({
  ...mocks,
  castItemFromAnchors: vi.fn(),
  collectItemAnchor: vi.fn(),
  discardItemAnchor: vi.fn(),
  retireItem: vi.fn(),
}));

vi.mock('../relationRepository', () => ({
  ...mocks,
  reaffirmRelation: vi.fn(),
  revokeRelation: vi.fn(),
}));

const timestamp = '2026-09-08T12:00:00.000Z';

function item(id: string, body: string): ItemV1 {
  return {
    id,
    user_id: 'fixture-user',
    body_json: {},
    plain_text: body,
    item_type: 'claim',
    topic: null,
    status: 'active',
    retired_into_item_id: null,
    origin_course_id: 'fixture-project',
    origin_note_id: 'fixture-note',
    created_by: 'human',
    metadata: {},
    created_at: timestamp,
    updated_at: timestamp,
    current_snapshot: {
      id: `snapshot-${id}`,
      item_id: id,
      user_id: 'fixture-user',
      content: body,
      content_hash: `fixture-content-${id}`,
      created_at: timestamp,
    },
    anchors: [],
  };
}

const inspected = item('item-a', 'Evidence on the current paper');
const candidate = item('item-b', 'A claim from another paper');
const libraryPurpose: PurposeFrameV1 = {
  id: 'library-soul',
  project_id: null,
  note_id: null,
  title: 'What connects these observations?',
  status: 'active',
  is_note_default: false,
  created_by: 'human',
  created_at: timestamp,
  updated_at: timestamp,
  members: [{
    id: 'historical-member',
    purpose_id: 'library-soul',
    member_kind: 'item',
    member_id: inspected.id,
    role: 'historical role',
    fitness: 'unknown',
    order_index: 0,
    created_at: timestamp,
    updated_at: timestamp,
  }],
};

async function openItemInspector(purposes: PurposeFrameV1[]) {
  const folder = createGroupFolder({
    title: 'Note groups',
    scope: { kind: 'note', project_id: 'fixture-project', note_id: 'fixture-note' },
    systemRoot: true,
  });
  const group = createContentGroup({
    projectId: 'fixture-project',
    noteId: 'fixture-note',
    canvasId: 'fixture-note',
    title: 'Fixture group',
    folderId: folder.id,
    folders: [folder],
    members: [createContentGroupMemberFromItem(inspected.id)],
  });
  const saveGroups = vi.fn().mockResolvedValue(true);
  render(
    <MemoryRouter>
      <ContentGroupPanel
        annotations={[]}
        contentGroups={[group]}
        groupFolders={[folder]}
        purposeFrames={purposes}
        blocks={[]}
        selectedAnnotationIds={[]}
        draftRanges={[]}
        projectId="fixture-project"
        noteId="fixture-note"
        canvasId="fixture-note"
        onClose={vi.fn()}
        onSaveContentGroups={saveGroups}
        onSaveGroupFolders={vi.fn()}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Fixture group/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Item tools' }));
  const itemButton = await screen.findByRole('button', { name: /Evidence on the current paper/ });
  await waitFor(() => expect((itemButton as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(itemButton);
  await screen.findByRole('textbox', { name: 'Edit Item body' });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Create Relation' }) as HTMLButtonElement).disabled).toBe(false));
  return { saveGroups };
}

describe('ContentGroupPanel library Purpose alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadItem.mockImplementation(async (id: string) => id === inspected.id ? inspected : candidate);
    mocks.loadPoolItemAnchors.mockResolvedValue([]);
    mocks.loadRelations.mockResolvedValue([]);
    mocks.loadRelationTypes.mockResolvedValue([{ id: 'supports', directionality: 'directed' }]);
    mocks.searchItems.mockResolvedValue([candidate]);
    mocks.updateItem.mockResolvedValue(inspected);
    mocks.createRelation.mockImplementation(async (input: Partial<RelationV1>): Promise<RelationV1> => ({
      id: 'fixture-relation',
      user_id: 'fixture-user',
      from_item_id: inspected.id,
      to_item_id: candidate.id,
      relation_type: 'supports',
      directionality: 'directed',
      from_snapshot_id: inspected.current_snapshot.id,
      to_snapshot_id: candidate.current_snapshot.id,
      note: null,
      created_by: 'human',
      origin_purpose_id: input.origin_purpose_id || null,
      status: 'active',
      created_at: timestamp,
      updated_at: timestamp,
      affirmed_at: timestamp,
      freshness: 'fresh',
      from_changed: false,
      to_changed: false,
      inspection_checkpoint_at: timestamp,
      latest_assessment: null,
      from_snapshot: inspected.current_snapshot,
      to_snapshot: candidate.current_snapshot,
      from_item: inspected,
      to_item: candidate,
    }));
  });

  it('retires historical membership controls and keeps library soul receipts on new Relations', async () => {
    const { saveGroups } = await openItemInspector([libraryPurpose]);
    expect(screen.queryByText('Purpose membership')).toBeNull();
    expect(screen.queryByRole('textbox', { name: `Role in ${libraryPurpose.title}` })).toBeNull();
    expect(screen.queryByRole('textbox', { name: `Fitness in ${libraryPurpose.title}` })).toBeNull();
    expect(screen.queryByRole('button', { name: /membership in|up in|down in|Add direct/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Create Relation' }));
    expect(screen.getByRole('option', { name: libraryPurpose.title })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Relation Purpose receipt' }), {
      target: { value: libraryPurpose.id },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search Relation endpoint Items' }), {
      target: { value: 'another paper' },
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search Relation endpoint Items' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: /A claim from another paper/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Create Relation' }));

    await waitFor(() => expect(mocks.createRelation).toHaveBeenCalledWith({
      from_item_id: inspected.id,
      to_item_id: candidate.id,
      relation_type: 'supports',
      note: null,
      created_by: 'human',
      origin_purpose_id: libraryPurpose.id,
    }));
    await screen.findByRole('button', { name: 'Reaffirm Relation' });
    expect(saveGroups).not.toHaveBeenCalled();
    expect(libraryPurpose.members[0].role).toBe('historical role');
  });

  it('allows Item save with no note-default soul or Purpose writer callback', async () => {
    await openItemInspector([]);
    fireEvent.click(screen.getByRole('button', { name: 'Save Item' }));
    await waitFor(() => expect(mocks.updateItem).toHaveBeenCalledWith(inspected.id, {
      plain_text: inspected.plain_text,
      item_type: 'claim',
      topic: null,
    }));
    expect(screen.queryByText('Purpose membership')).toBeNull();
    expect(screen.queryByText(/410|Failed to save Purpose/)).toBeNull();
  });
});
