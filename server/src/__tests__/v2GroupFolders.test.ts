import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import {
  getContentGroup,
  upsertContentGroup,
} from '../services/contentGroups.js';
import {
  archiveOrDeleteGroupFolder,
  ensureNoteGroupFolderRoots,
  importNoteGroupFolders,
  setPrimaryContentGroupFolderPlacement,
  replaceNoteGroupFolders,
  upsertGroupFolder,
  listGroupFolders,
} from '../services/groupFolders.js';
import {
  importNoteGroupFoldersSchema,
  replaceNoteGroupFoldersSchema,
  updateContentGroupFolderPlacementSchema,
  upsertGroupFolderSchema,
} from '../validators/index.js';

async function withDb(run: (db: Awaited<ReturnType<typeof initDb>>) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-group-folders-'));
  const dbPath = join(dir, 'test.db');

  try {
    const db = await initDb(dbPath);
    await run(db);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

test('v2 GroupFolder migration creates folder and placement tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('group_folders'), true);
    assert.equal(tableNames.includes('content_group_folder_placements'), true);
    assert.equal(tableNames.includes('content_groups'), true);
  });
});

function seedUserCourseNote(db: Awaited<ReturnType<typeof initDb>>) {
  const userId = uuidv4();
  const courseId = uuidv4();
  const noteId = uuidv4();

  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
    .run(userId, `${userId}@example.com`, 'hash', 'GroupFolder User');
  db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
    .run(courseId, userId, 'AMATH 231');
  db.prepare('INSERT INTO notes (id, user_id, course_id, title, metadata) VALUES (?, ?, ?, ?, ?)')
    .run(noteId, userId, courseId, 'Power Series note', '{}');

  return { userId, courseId, noteId };
}

function groupInput(courseId: string, noteId: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    project_id: courseId,
    note_id: noteId,
    canvas_id: 'canvas-a',
    title,
    status: 'active',
    created_by: 'human',
    members: [],
    fragments: [],
    petals: [],
    placements: [],
    identity: {
      status: 'none',
      role: null,
      topic: null,
      summary: null,
      created_by: 'human',
      reviewed_by: null,
      confidence: null,
      updated_at: '2026-06-22T00:00:00.000Z',
      accepted_at: null,
      metadata: {},
    },
    view_state: {},
    metadata: {},
    ...extra,
  };
}

test('GroupFolder service ensures workspace project and note roots', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);

    const roots = ensureNoteGroupFolderRoots(db, userId, noteId);

    assert.equal(roots.workspace.id, `group-folder-root-workspace-${userId}-`);
    assert.equal(roots.workspace.system_root, true);
    assert.equal(roots.workspace.scope.kind, 'workspace');

    assert.equal(roots.project.id, `group-folder-root-project-${courseId}-`);
    assert.equal(roots.project.system_root, true);
    assert.equal(roots.project.scope.kind, 'project');
    assert.equal(roots.project.scope.project_id, courseId);

    assert.equal(roots.note.id, `group-folder-root-note-${courseId}-${noteId}-`);
    assert.equal(roots.note.system_root, true);
    assert.equal(roots.note.scope.kind, 'note');
    assert.equal(roots.note.scope.project_id, courseId);
    assert.equal(roots.note.scope.note_id, noteId);

    const folders = listGroupFolders(db, userId, { note_id: noteId });
    assert.equal(folders.some((folder) => folder.id === roots.workspace.id), true);
    assert.equal(folders.some((folder) => folder.id === roots.project.id), true);
    assert.equal(folders.some((folder) => folder.id === roots.note.id), true);
  });
});

test('GroupFolder service removes stale duplicate system roots when deterministic roots are ensured', async () => {
  await withDb((db) => {
    const { userId, noteId } = seedUserCourseNote(db);
    db.prepare(`
      INSERT INTO group_folders (
        id, user_id, scope_kind, title, origin, system_root, status,
        order_index, metadata, created_at, updated_at
      )
      VALUES (?, ?, 'workspace', 'Workspace groups', 'system', 1, 'active', 0, '{}', datetime('now'), datetime('now'))
    `).run('group-folder-root-workspace-', userId);

    const folders = listGroupFolders(db, userId, { note_id: noteId });

    assert.equal(folders.some((folder) => folder.id === 'group-folder-root-workspace-'), false);
    assert.equal(folders.some((folder) => folder.id === `group-folder-root-workspace-${userId}-`), true);

    const staleRoot = db.prepare('SELECT id FROM group_folders WHERE id = ? AND user_id = ?')
      .get('group-folder-root-workspace-', userId);
    assert.equal(staleRoot, undefined);
  });
});

test('ContentGroup folder placement changes organization without mutating members or source refs', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const roots = ensureNoteGroupFolderRoots(db, userId, noteId);
    const definitions = upsertGroupFolder(db, userId, {
      id: 'group-folder-definitions',
      title: 'Definitions',
      parent_folder_id: roots.note.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
    });
    const examples = upsertGroupFolder(db, userId, {
      id: 'group-folder-examples',
      title: 'Examples',
      parent_folder_id: roots.note.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
    });

    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Definition of Power Series', {
      id: 'content-group-placement-test',
      members: [{
        id: 'member-a',
        kind: 'content_range',
        target_id: 'range-a',
        current_content: 'A power series is an infinite series.',
        preview_text: 'A power series is an infinite series.',
        source_ref: {
          source_anchor_id: 'source-anchor-a',
          note_id: noteId,
        },
        order_index: 0,
      }],
    }));

    assert.equal(group.folder_id, null);

    setPrimaryContentGroupFolderPlacement(db, userId, group.id, {
      folder_id: definitions.id,
      order_index: 3,
      added_by: 'human',
    });

    const placed = getContentGroup(db, userId, group.id);
    assert.equal(placed.folder_id, definitions.id);
    assert.equal(placed.placements.length, 1);
    assert.equal(placed.placements[0]?.folder_id, definitions.id);
    assert.equal(placed.placements[0]?.placement_role, 'primary');
    assert.equal(placed.members[0]?.current_content, 'A power series is an infinite series.');
    assert.equal(placed.members[0]?.source_ref.source_anchor_id, 'source-anchor-a');

    setPrimaryContentGroupFolderPlacement(db, userId, group.id, {
      folder_id: examples.id,
      order_index: 1,
      added_by: 'human',
    });

    const moved = getContentGroup(db, userId, group.id);
    assert.equal(moved.folder_id, examples.id);
    assert.equal(moved.placements.length, 1);
    assert.equal(moved.placements[0]?.folder_id, examples.id);
    assert.equal(moved.members[0]?.current_content, 'A power series is an infinite series.');
    assert.equal(moved.members[0]?.source_ref.source_anchor_id, 'source-anchor-a');

    const activePlacements = db.prepare(`
      SELECT folder_id
      FROM content_group_folder_placements
      WHERE user_id = ? AND content_group_id = ? AND status = 'active'
      ORDER BY updated_at ASC
    `).all(userId, group.id) as Array<{ folder_id: string }>;
    assert.deepEqual(activePlacements.map((placement) => placement.folder_id), [examples.id]);

    const rawGroup = db.prepare('SELECT primary_folder_id, members_json FROM content_groups WHERE id = ?')
      .get(group.id) as { primary_folder_id: string | null; members_json: string };
    assert.equal(rawGroup.primary_folder_id, examples.id);
    assert.deepEqual(JSON.parse(rawGroup.members_json), []);

    const rawMember = db.prepare(`
      SELECT current_content, source_ref_json
      FROM content_group_members
      WHERE user_id = ? AND content_group_id = ? AND id = ?
    `).get(userId, group.id, 'member-a') as {
      current_content: string;
      source_ref_json: string;
    };
    assert.equal(rawMember.current_content, 'A power series is an infinite series.');
    assert.equal(JSON.parse(rawMember.source_ref_json).source_anchor_id, 'source-anchor-a');
  });
});

test('GroupFolder validators accept runtime ids and placement payloads', () => {
  const folder = upsertGroupFolderSchema.parse({
    id: 'group-folder-runtime-id',
    title: 'Definitions',
    parent_folder_id: 'group-folder-root-note-course-note-',
    scope: { kind: 'note', project_id: uuidv4(), note_id: uuidv4() },
    origin: 'human',
    system_root: false,
    status: 'active',
    order_index: 2,
    metadata: { color: 'blue' },
  });

  assert.equal(folder.id, 'group-folder-runtime-id');
  assert.equal(folder.scope?.kind, 'note');
  assert.equal(folder.origin, 'human');

  const replacePayload = replaceNoteGroupFoldersSchema.parse({ folders: [folder] });
  assert.equal(replacePayload.folders.length, 1);

  const importPayload = importNoteGroupFoldersSchema.parse({
    note_id: uuidv4(),
    folders: [folder],
  });
  assert.equal(importPayload.folders[0]?.title, 'Definitions');

  const placement = updateContentGroupFolderPlacementSchema.parse({
    folder_id: 'group-folder-definitions',
    placement_role: 'primary',
    order_index: 3,
    added_by: 'human',
    metadata: { source: 'gallery' },
  });
  assert.equal(placement.folder_id, 'group-folder-definitions');
  assert.equal(placement.placement_role, 'primary');
});

test('GroupFolder import replace and delete guard stay organization-only', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const roots = ensureNoteGroupFolderRoots(db, userId, noteId);

    const imported = importNoteGroupFolders(db, userId, noteId, [{
      id: 'group-folder-imported-definitions',
      title: 'Imported definitions',
      parent_folder_id: roots.note.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
      origin: 'human',
    }]);
    assert.equal(imported.some((folder) => folder.id === 'group-folder-imported-definitions'), true);

    const replaced = replaceNoteGroupFolders(db, userId, noteId, [{
      id: 'group-folder-replaced-examples',
      title: 'Examples',
      parent_folder_id: roots.note.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
      origin: 'human',
    }]);
    assert.equal(replaced.some((folder) => folder.id === 'group-folder-replaced-examples'), true);

    const oldImported = db.prepare('SELECT status FROM group_folders WHERE id = ?')
      .get('group-folder-imported-definitions') as { status: string };
    assert.equal(oldImported.status, 'deleted');

    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Placed group', {
      id: 'content-group-delete-guard-test',
      members: [{
        id: 'member-guard',
        current_content: 'Do not mutate me',
        source_ref: { source_anchor_id: 'source-anchor-guard' },
      }],
    }));
    setPrimaryContentGroupFolderPlacement(db, userId, group.id, {
      folder_id: 'group-folder-replaced-examples',
      added_by: 'human',
    });

    assert.throws(
      () => archiveOrDeleteGroupFolder(db, userId, 'group-folder-replaced-examples'),
      /Folder is not empty/,
    );

    setPrimaryContentGroupFolderPlacement(db, userId, group.id, {
      folder_id: null,
      added_by: 'human',
    });
    const deleted = archiveOrDeleteGroupFolder(db, userId, 'group-folder-replaced-examples');
    assert.equal(deleted.status, 'deleted');

    const fetched = getContentGroup(db, userId, group.id);
    assert.equal(fetched.members[0]?.current_content, 'Do not mutate me');
    assert.equal(fetched.members[0]?.source_ref.source_anchor_id, 'source-anchor-guard');
  });
});

test('GroupFolder delete guard blocks roots children and placements but allows empty user folders', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const roots = ensureNoteGroupFolderRoots(db, userId, noteId);
    const definitions = upsertGroupFolder(db, userId, {
      id: 'group-folder-delete-definitions',
      title: 'Definitions',
      parent_folder_id: roots.note.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
    });
    const archivedChild = upsertGroupFolder(db, userId, {
      id: 'group-folder-delete-archived-child',
      title: 'Archived child',
      parent_folder_id: definitions.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
      status: 'archived',
    });
    const examples = upsertGroupFolder(db, userId, {
      id: 'group-folder-delete-examples',
      title: 'Examples',
      parent_folder_id: roots.note.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
    });
    const empty = upsertGroupFolder(db, userId, {
      id: 'group-folder-delete-empty',
      title: 'Empty',
      parent_folder_id: roots.note.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
    });
    const group = upsertContentGroup(db, userId, groupInput(courseId, noteId, 'Placed group', {
      id: 'content-group-delete-placement-guard',
    }));
    setPrimaryContentGroupFolderPlacement(db, userId, group.id, {
      folder_id: examples.id,
      added_by: 'human',
    });

    assert.throws(
      () => archiveOrDeleteGroupFolder(db, userId, roots.note.id),
      /System root folder cannot be deleted/,
    );
    assert.throws(
      () => archiveOrDeleteGroupFolder(db, userId, definitions.id),
      /Folder is not empty/,
    );
    assert.throws(
      () => archiveOrDeleteGroupFolder(db, userId, examples.id),
      /Folder is not empty/,
    );

    db.prepare("UPDATE group_folders SET status = 'deleted' WHERE id = ? AND user_id = ?")
      .run(archivedChild.id, userId);
    const deletedDefinitions = archiveOrDeleteGroupFolder(db, userId, definitions.id);
    assert.equal(deletedDefinitions.status, 'deleted');

    const deletedEmpty = archiveOrDeleteGroupFolder(db, userId, empty.id);
    assert.equal(deletedEmpty.status, 'deleted');
  });
});

test('GroupFolder move guard blocks roots invalid parents and ancestor cycles', async () => {
  await withDb((db) => {
    const { userId, courseId, noteId } = seedUserCourseNote(db);
    const roots = ensureNoteGroupFolderRoots(db, userId, noteId);
    const definitions = upsertGroupFolder(db, userId, {
      id: 'group-folder-move-definitions',
      title: 'Definitions',
      parent_folder_id: roots.note.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
    });
    const examples = upsertGroupFolder(db, userId, {
      id: 'group-folder-move-examples',
      title: 'Examples',
      parent_folder_id: roots.note.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
    });
    const nested = upsertGroupFolder(db, userId, {
      id: 'group-folder-move-nested',
      title: 'Nested',
      parent_folder_id: definitions.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
    });
    const deletedParent = upsertGroupFolder(db, userId, {
      id: 'group-folder-move-deleted-parent',
      title: 'Deleted parent',
      parent_folder_id: roots.note.id,
      scope: { kind: 'note', project_id: courseId, note_id: noteId },
    });
    archiveOrDeleteGroupFolder(db, userId, deletedParent.id);

    assert.throws(
      () => upsertGroupFolder(db, userId, {
        ...roots.note,
        parent_folder_id: examples.id,
      }),
      /System root folder cannot be moved/,
    );
    assert.throws(
      () => upsertGroupFolder(db, userId, {
        ...definitions,
        parent_folder_id: definitions.id,
      }),
      /Folder cannot be moved under itself/,
    );
    assert.throws(
      () => upsertGroupFolder(db, userId, {
        ...definitions,
        parent_folder_id: nested.id,
      }),
      /Folder cannot be moved under itself/,
    );
    assert.throws(
      () => upsertGroupFolder(db, userId, {
        ...examples,
        parent_folder_id: deletedParent.id,
      }),
      /Parent folder is deleted/,
    );
    assert.throws(
      () => upsertGroupFolder(db, userId, {
        ...examples,
        parent_folder_id: 'group-folder-missing-parent',
      }),
      /Group folder not found/,
    );

    const moved = upsertGroupFolder(db, userId, {
      ...examples,
      parent_folder_id: definitions.id,
    });
    assert.equal(moved.parent_folder_id, definitions.id);
  });
});
