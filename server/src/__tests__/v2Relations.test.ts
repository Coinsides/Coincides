import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import relationRoutes from '../routes/relations.js';
import { createItem, listItems, retireItem, updateItem } from '../services/items.js';
import {
  RELATION_TYPE_DEFINITIONS,
  createRelation,
  getRelation,
  listRelationAssessments,
  listRelations,
  reaffirmRelation,
  revokeRelation,
  type RelationReaffirmFaultPoint,
} from '../services/relations.js';
import {
  createRelationSchema,
  itemListQuerySchema,
  listRelationsQuerySchema,
  relationCommandSchema,
} from '../validators/index.js';

type Db = Awaited<ReturnType<typeof initDb>>;

async function withDb(run: (db: Db) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-relations-'));
  try {
    const db = await initDb(join(dir, 'test.db'));
    await run(db);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedUser(db: Db, label: string) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at)
    VALUES (?, ?, 'hash', ?, datetime('now'))
  `).run(id, `${id}@example.com`, label);
  return id;
}

function seedWorkspace(db: Db, userId: string, label: string) {
  const courseId = uuidv4();
  const noteId = uuidv4();
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(courseId, userId, label);
  db.prepare(`
    INSERT INTO notes (id, user_id, course_id, title, metadata)
    VALUES (?, ?, ?, ?, '{}')
  `).run(noteId, userId, courseId, `${label} note`);
  return { courseId, noteId };
}

function seedPurpose(
  db: Db,
  userId: string,
  workspace: ReturnType<typeof seedWorkspace>,
  label: string,
  itemIds: string[] = [],
) {
  const purposeId = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO purposes (
      id, user_id, course_id, note_id, title, status,
      is_note_default, created_by, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'active', 0, 'human', '{}', ?, ?)
  `).run(purposeId, userId, workspace.courseId, workspace.noteId, label, now, now);
  itemIds.forEach((itemId, index) => {
    db.prepare(`
      INSERT INTO purpose_members (
        id, user_id, purpose_id, member_kind, member_id,
        fitness, order_index, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, 'item', ?, 'unknown', ?, '{}', ?, ?)
    `).run(uuidv4(), userId, purposeId, itemId, index, now, now);
  });
  return purposeId;
}

function relationRow(db: Db, relationId: string) {
  return db.prepare(`
    SELECT from_snapshot_id, to_snapshot_id, affirmed_at, updated_at, status
    FROM relations
    WHERE id = ?
  `).get(relationId) as {
    from_snapshot_id: string;
    to_snapshot_id: string;
    affirmed_at: string;
    updated_at: string;
    status: string;
  };
}

test('Relation seed registry and validators own directionality and query scope', () => {
  assert.deepEqual(
    RELATION_TYPE_DEFINITIONS.map((entry) => [entry.id, entry.directionality]),
    [
      ['derives_to', 'directed'],
      ['depends_on', 'directed'],
      ['supports', 'directed'],
      ['contradicts', 'directed'],
      ['example_of', 'directed'],
      ['equivalent_to', 'undirected'],
      ['analogous_to', 'undirected'],
      ['contrasts_with', 'undirected'],
      ['companion_of', 'undirected'],
    ],
  );

  assert.equal(createRelationSchema.safeParse({
    from_item_id: uuidv4(),
    to_item_id: uuidv4(),
    relation_type: 'supports',
  }).success, true);
  assert.equal(createRelationSchema.safeParse({
    from_item_id: uuidv4(),
    to_item_id: uuidv4(),
    relation_type: 'custom_relation',
  }).success, false);
  assert.equal(createRelationSchema.safeParse({
    from_item_id: uuidv4(),
    to_item_id: uuidv4(),
    relation_type: 'supports',
    directionality: 'undirected',
  }).success, false);
  assert.equal(listRelationsQuerySchema.safeParse({ item_id: uuidv4() }).success, true);
  assert.equal(listRelationsQuerySchema.safeParse({ purpose_id: uuidv4() }).success, true);
  assert.equal(listRelationsQuerySchema.safeParse({}).success, false);
  assert.equal(listRelationsQuerySchema.safeParse({ item_id: uuidv4(), purpose_id: uuidv4() }).success, false);
  assert.equal(relationCommandSchema.safeParse({}).success, true);
  assert.equal(relationCommandSchema.safeParse({ extra: true }).success, false);
});

test('create normalizes undirected Relations, preserves directed direction, and rejects invalid endpoints', async () => {
  await withDb((db) => {
    const ownerId = seedUser(db, 'Relation owner');
    const intruderId = seedUser(db, 'Relation intruder');
    const first = createItem(db, ownerId, { plain_text: 'First Item' });
    const second = createItem(db, ownerId, { plain_text: 'Second Item' });
    const intruder = createItem(db, intruderId, { plain_text: 'Intruder Item' });

    const undirected = createRelation(db, ownerId, {
      from_item_id: second.id,
      to_item_id: first.id,
      relation_type: 'equivalent_to',
      note: 'Same meaning in this context',
    });
    assert.equal(undirected.directionality, 'undirected');
    assert.equal(undirected.from_item_id < undirected.to_item_id, true);
    assert.equal(undirected.from_snapshot.item_id, undirected.from_item_id);
    assert.equal(undirected.to_snapshot.item_id, undirected.to_item_id);

    let conflict: any = null;
    try {
      createRelation(db, ownerId, {
        from_item_id: first.id,
        to_item_id: second.id,
        relation_type: 'equivalent_to',
      });
    } catch (error) {
      conflict = error;
    }
    assert.equal(conflict?.statusCode, 409);
    assert.deepEqual(conflict?.details, {
      code: 'active_relation_exists',
      relation_id: undirected.id,
    });

    const forward = createRelation(db, ownerId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'supports',
    });
    const reverse = createRelation(db, ownerId, {
      from_item_id: second.id,
      to_item_id: first.id,
      relation_type: 'supports',
    });
    assert.equal(forward.from_item_id, first.id);
    assert.equal(reverse.from_item_id, second.id);

    let directedConflict: any = null;
    try {
      createRelation(db, ownerId, {
        from_item_id: first.id,
        to_item_id: second.id,
        relation_type: 'supports',
      });
    } catch (error) {
      directedConflict = error;
    }
    assert.equal(directedConflict?.statusCode, 409);
    assert.deepEqual(directedConflict?.details, {
      code: 'active_relation_exists',
      relation_id: forward.id,
    });

    assert.throws(() => createRelation(db, ownerId, {
      from_item_id: first.id,
      to_item_id: first.id,
      relation_type: 'supports',
    }), /cannot connect an Item to itself/i);
    assert.throws(() => createRelation(db, ownerId, {
      from_item_id: first.id,
      to_item_id: uuidv4(),
      relation_type: 'supports',
    }), /endpoint Item not found/i);
    assert.throws(() => createRelation(db, ownerId, {
      from_item_id: first.id,
      to_item_id: intruder.id,
      relation_type: 'supports',
    }), /endpoint Item not found/i);

    const retired = createItem(db, ownerId, { plain_text: 'Retired Item' });
    retireItem(db, ownerId, retired.id, {});
    assert.throws(() => createRelation(db, ownerId, {
      from_item_id: first.id,
      to_item_id: retired.id,
      relation_type: 'supports',
    }), /active Item/i);
  });
});

test('mechanical freshness is derived from endpoint hashes and ignores formatting-only changes', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Freshness user');
    const first = createItem(db, userId, { plain_text: 'Stable first endpoint' });
    const second = createItem(db, userId, { plain_text: 'Stable second endpoint' });
    const relation = createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'depends_on',
    });

    assert.equal(relation.freshness, 'fresh');
    assert.equal(relation.from_changed, false);
    assert.equal(relation.to_changed, false);

    updateItem(db, userId, first.id, { plain_text: 'Changed first endpoint' });
    assert.equal(getRelation(db, userId, relation.id).freshness, 'from_changed');

    updateItem(db, userId, first.id, { plain_text: 'Stable first endpoint' });
    updateItem(db, userId, second.id, { plain_text: 'Changed second endpoint' });
    assert.equal(getRelation(db, userId, relation.id).freshness, 'to_changed');

    updateItem(db, userId, first.id, { plain_text: 'Changed first endpoint again' });
    const bothChanged = getRelation(db, userId, relation.id);
    assert.equal(bothChanged.freshness, 'both_changed');
    assert.equal(bothChanged.from_changed, true);
    assert.equal(bothChanged.to_changed, true);

    const reaffirmed = reaffirmRelation(db, userId, relation.id);
    assert.equal(reaffirmed.freshness, 'fresh');

    const currentFirst = createItem(db, userId, { plain_text: 'Formatting-stable endpoint' });
    const formatPeer = createItem(db, userId, { plain_text: 'Formatting peer' });
    const formattingRelation = createRelation(db, userId, {
      from_item_id: currentFirst.id,
      to_item_id: formatPeer.id,
      relation_type: 'supports',
    });
    updateItem(db, userId, currentFirst.id, {
      body_json: {
        ...currentFirst.body_json,
        presentation: { emphasis: true },
      },
      plain_text: currentFirst.plain_text,
    });
    assert.equal(getRelation(db, userId, formattingRelation.id).freshness, 'fresh');
  });
});

test('latest assessment is a checkpoint only and Item search stays user-scoped', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Checkpoint user');
    const intruderId = seedUser(db, 'Checkpoint intruder');
    const first = createItem(db, userId, {
      plain_text: 'Lebesgue dominated convergence theorem',
      item_type: 'theorem',
      topic: 'measure theory',
    });
    const second = createItem(db, userId, { plain_text: 'Almost everywhere convergence' });
    createItem(db, intruderId, { plain_text: 'Lebesgue private intruder item' });
    const relation = createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'supports',
    });
    updateItem(db, userId, first.id, { plain_text: 'Changed after judgment' });
    db.prepare(`
      INSERT INTO relation_assessments (
        id, relation_id, user_id, verdict, model_key, created_at
      ) VALUES ('freshness-checkpoint', ?, ?, 'still_holds', 'manual-fixture', '2099-01-01T00:00:00.000Z')
    `).run(relation.id, userId);

    const read = getRelation(db, userId, relation.id);
    assert.equal(read.freshness, 'from_changed');
    assert.equal(read.latest_assessment?.id, 'freshness-checkpoint');
    assert.equal(read.inspection_checkpoint_at, '2099-01-01T00:00:00.000Z');

    assert.equal(itemListQuerySchema.safeParse({ status: 'active', q: 'Changed', limit: 20 }).success, true);
    const results = listItems(db, userId, { status: 'active', q: 'Changed', limit: 20 });
    assert.deepEqual(results.map((item) => item.id), [first.id]);
    assert.equal(listItems(db, userId, { status: 'active', q: 'measure theory', limit: 20 }).length, 1);
    assert.equal(listItems(db, userId, { status: 'active', q: 'private intruder', limit: 20 }).length, 0);
  });
});

test('revoke preserves history, recreate gets a new identity, and Item lists are user-scoped', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Revoke user');
    const intruderId = seedUser(db, 'Revoke intruder');
    const first = createItem(db, userId, { plain_text: 'Cause' });
    const second = createItem(db, userId, { plain_text: 'Effect' });
    const created = createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'derives_to',
      note: 'Initial judgment',
    });

    const revoked = revokeRelation(db, userId, created.id);
    assert.equal(revoked.status, 'revoked');
    assert.equal(listRelations(db, userId, { item_id: first.id }).length, 0);
    assert.equal(listRelations(db, userId, { item_id: first.id, status: 'revoked' }).length, 1);

    const recreated = createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'derives_to',
      note: 'Reconsidered judgment',
    });
    assert.notEqual(recreated.id, created.id);
    assert.equal(listRelations(db, userId, { item_id: first.id }).length, 1);
    assert.equal(listRelations(db, userId, { item_id: first.id, status: 'all' }).length, 2);
    assert.throws(() => revokeRelation(db, userId, created.id), /already revoked/i);
    assert.throws(() => getRelation(db, intruderId, recreated.id), /Relation not found/i);
    assert.throws(() => listRelations(db, intruderId, { item_id: first.id }), /Item not found/i);
  });
});

test('Purpose-scope reads use compiled endpoint presence while origin remains a disposable receipt', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Purpose Relation user');
    const workspace = seedWorkspace(db, userId, 'Purpose Relation workspace');
    const first = createItem(db, userId, { plain_text: 'Scoped first' });
    const second = createItem(db, userId, { plain_text: 'Scoped second' });
    const outside = createItem(db, userId, { plain_text: 'Outside Item' });
    const originPurposeId = seedPurpose(db, userId, workspace, 'Origin purpose');
    const readingPurposeId = seedPurpose(db, userId, workspace, 'Reading purpose', [first.id, second.id]);

    const inside = createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'analogous_to',
      origin_purpose_id: originPurposeId,
    });
    createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: outside.id,
      relation_type: 'supports',
      origin_purpose_id: originPurposeId,
    });

    const scoped = listRelations(db, userId, { purpose_id: readingPurposeId });
    assert.deepEqual(scoped.map((relation) => relation.id), [inside.id]);
    assert.equal(scoped[0]?.origin_purpose_id, originPurposeId);

    db.prepare('DELETE FROM purposes WHERE id = ? AND user_id = ?').run(originPurposeId, userId);
    const survived = getRelation(db, userId, inside.id);
    assert.equal(survived.origin_purpose_id, null);
    assert.equal(listRelations(db, userId, { purpose_id: readingPurposeId }).length, 1);
  });
});

test('reaffirm is atomic at all four fault points and refreshes both judgment receipts on success', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Reaffirm user');
    const first = createItem(db, userId, { plain_text: 'Original first' });
    const second = createItem(db, userId, { plain_text: 'Original second' });
    const relation = createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'depends_on',
    });
    db.prepare(`
      UPDATE relations
      SET affirmed_at = '2020-01-01T00:00:00.000Z', updated_at = '2020-01-01T00:00:00.000Z'
      WHERE id = ?
    `).run(relation.id);
    updateItem(db, userId, first.id, { plain_text: 'Changed first' });
    updateItem(db, userId, second.id, { plain_text: 'Changed second' });
    const baseline = relationRow(db, relation.id);

    const faultPoints: RelationReaffirmFaultPoint[] = [
      'after_from_snapshot',
      'after_to_snapshot',
      'after_relation_update',
      'before_commit',
    ];
    for (const faultPoint of faultPoints) {
      assert.throws(() => reaffirmRelation(db, userId, relation.id, {
        faultInjector(point) {
          if (point === faultPoint) throw new Error(`fault:${point}`);
        },
      }), new RegExp(`fault:${faultPoint}`));
      assert.deepEqual(relationRow(db, relation.id), baseline);
    }

    const reaffirmed = reaffirmRelation(db, userId, relation.id);
    assert.equal(reaffirmed.from_snapshot.content, 'Changed first');
    assert.equal(reaffirmed.to_snapshot.content, 'Changed second');
    assert.notEqual(reaffirmed.from_snapshot_id, baseline.from_snapshot_id);
    assert.notEqual(reaffirmed.to_snapshot_id, baseline.to_snapshot_id);
    assert.notEqual(reaffirmed.affirmed_at, baseline.affirmed_at);

    const beforeSnapshotCount = (db.prepare('SELECT COUNT(*) AS count FROM item_snapshots').get() as { count: number }).count;
    const sameContentReaffirm = reaffirmRelation(db, userId, relation.id);
    const afterSnapshotCount = (db.prepare('SELECT COUNT(*) AS count FROM item_snapshots').get() as { count: number }).count;
    assert.equal(sameContentReaffirm.from_snapshot_id, reaffirmed.from_snapshot_id);
    assert.equal(sameContentReaffirm.to_snapshot_id, reaffirmed.to_snapshot_id);
    assert.equal(afterSnapshotCount, beforeSnapshotCount);

    retireItem(db, userId, first.id, {});
    assert.throws(
      () => reaffirmRelation(db, userId, relation.id),
      /require active Item endpoints/i,
    );
  });
});

test('Relation assessment compatibility is scoped, ordered, and has no persisted invalidation flag', async () => {
  await withDb((db) => {
    const userId = seedUser(db, 'Assessment user');
    const intruderId = seedUser(db, 'Assessment intruder');
    const first = createItem(db, userId, { plain_text: 'Assessment first' });
    const second = createItem(db, userId, { plain_text: 'Assessment second' });
    const relation = createRelation(db, userId, {
      from_item_id: first.id,
      to_item_id: second.id,
      relation_type: 'contradicts',
    });
    db.prepare(`
      INSERT INTO relation_assessments (
        id, relation_id, user_id, verdict, model_key, created_at
      ) VALUES
        ('assessment-later', ?, ?, 'questionable', 'model-b', '2026-07-13T02:00:00.000Z'),
        ('assessment-earlier', ?, ?, 'still_holds', 'model-a', '2026-07-13T01:00:00.000Z')
    `).run(relation.id, userId, relation.id, userId);

    assert.deepEqual(
      listRelationAssessments(db, userId, relation.id).map((entry) => entry.id),
      ['assessment-later', 'assessment-earlier'],
    );
    assert.throws(() => listRelationAssessments(db, intruderId, relation.id), /Relation not found/i);
    const columns = db.prepare('PRAGMA table_info(relation_assessments)').all() as Array<{ name: string }>;
    assert.equal(columns.some((column) => /invalid|stale|sync/i.test(column.name)), false);
  });

  const routes = (relationRoutes as any).stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods).filter((method) => layer.route.methods[method]),
    }));
  assert.equal(routes.some((route: any) => route.path === '/' && route.methods.includes('post')), true);
  assert.equal(routes.some((route: any) => route.path === '/' && route.methods.includes('get')), true);
  assert.equal(routes.some((route: any) => route.path === '/:relationId/reaffirm' && route.methods.includes('post')), true);
  assert.equal(routes.some((route: any) => route.path === '/:relationId/revoke' && route.methods.includes('post')), true);
  assert.equal(routes.some((route: any) => route.methods.includes('delete')), false);
});
