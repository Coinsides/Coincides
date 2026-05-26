import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import {
  listDomainBlockSets,
  seedSystemDomainPackages,
} from '../services/domainPackages.js';
import {
  applyDomainRefinementProposal,
  createDomainRefinementProposal,
} from '../services/domainRefinementProposals.js';

async function withDb(run: (db: Awaited<ReturnType<typeof initDb>>) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-v256-'));
  const dbPath = join(dir, 'test.db');

  try {
    const db = await initDb(dbPath);
    await run(db);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

test('v2.5.6 migration creates domain refinement tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    for (const tableName of [
      'domain_refinement_mappings',
      'domain_refinement_records',
      'domain_refinement_record_items',
      'domain_object_classifications',
    ]) {
      assert.equal(tableNames.includes(tableName), true, `${tableName} should exist`);
    }
  });
});

function seedUserCourse(db: Awaited<ReturnType<typeof initDb>>) {
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
    .run(userId, `${userId}@example.com`, 'hash', 'Domain Refinement User');
  db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
    .run(courseId, userId, 'Domain Refinement Course');
  return { userId, courseId };
}

function seedDomainRuntime(db: Awaited<ReturnType<typeof initDb>>, userId: string) {
  seedSystemDomainPackages(db, userId);
  const math = listDomainBlockSets(db, userId, { domain_key: 'learning.math.basic' })[0];
  const briefing = listDomainBlockSets(db, userId, { domain_key: 'briefing.general.basic' })[0];
  assert.ok(math, 'learning.math.basic should be seeded');
  assert.ok(briefing, 'briefing.general.basic should be seeded');
  return { math, briefing };
}

function insertDomainTaggedBlock(
  db: Awaited<ReturnType<typeof initDb>>,
  userId: string,
  courseId: string,
  domain: any,
) {
  const blockId = uuidv4();
  const metadata = {
    current_domain_block_set_id: domain.id,
    current_domain_key: domain.domain_key,
    current_domain_version: domain.version,
  };
  db.prepare(`
    INSERT INTO note_blocks (
      id, user_id, course_id, block_type, title, content_json, plain_text,
      source_kind, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, 'definition', 'Domain tagged block', ?, ?, 'manual', ?, datetime('now'), datetime('now'))
  `).run(
    blockId,
    userId,
    courseId,
    JSON.stringify({ body: 'A derivative measures local change.' }),
    'A derivative measures local change.',
    JSON.stringify(metadata),
  );
  return blockId;
}

test('creating a domain refinement proposal reports diff and package impact without mutating runtime records', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const { math } = seedDomainRuntime(db, userId);
    const blockId = insertDomainTaggedBlock(db, userId, courseId, math);
    const beforeDomainCount = (db.prepare('SELECT COUNT(*) AS count FROM domain_block_sets').get() as any).count;
    const beforeBlock = db.prepare('SELECT metadata FROM note_blocks WHERE id = ?').get(blockId) as any;

    const proposal = createDomainRefinementProposal(db, userId, {
      source_domain_id: math.id,
      target_domain_patch: {
        domain_key: 'learning.calculus.basic',
        label: 'Basic Calculus Learning',
        domain_kind: 'learning',
      },
      refinement_action: 'promote',
      migration_mode: 'soft_migration',
      course_id: courseId,
      object_reclassifications: [
        { target_type: 'note_block', target_id: blockId },
      ],
      reason: 'Calculus is now a focused learning domain.',
    });

    const afterDomainCount = (db.prepare('SELECT COUNT(*) AS count FROM domain_block_sets').get() as any).count;
    const afterBlock = db.prepare('SELECT metadata FROM note_blocks WHERE id = ?').get(blockId) as any;

    assert.equal(afterDomainCount, beforeDomainCount);
    assert.deepEqual(afterBlock, beforeBlock);
    assert.equal(proposal.type, 'domain_refinement');
    assert.equal(proposal.data.proposal_kind, 'domain_refinement');
    assert.equal(proposal.data.domain_diff.some((entry: any) => entry.field === 'domain_key'), true);
    assert.equal(proposal.data.package_impact.affected_package_count, 1);
    assert.equal(proposal.data.affected_counts.note_blocks, 1);
    assert.equal(proposal.data.blockers.length, 0);
    assert.equal(proposal.data.apply_behavior, 'domain_refinement_records_and_classification_updates');
  });
});

test('alias mapping apply creates mappings and records only', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const { math, briefing } = seedDomainRuntime(db, userId);
    const blockId = insertDomainTaggedBlock(db, userId, courseId, math);
    const before = db.prepare('SELECT metadata FROM note_blocks WHERE id = ?').get(blockId) as any;
    const proposal = createDomainRefinementProposal(db, userId, {
      source_domain_id: math.id,
      target_domain_id: briefing.id,
      refinement_action: 'rename',
      migration_mode: 'alias_mapping',
      course_id: courseId,
    });
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposal.id) as any;

    const result = applyDomainRefinementProposal(db, userId, proposalRow);
    const after = db.prepare('SELECT metadata FROM note_blocks WHERE id = ?').get(blockId) as any;

    assert.deepEqual(after, before);
    assert.equal(result.mappings_created_count, 1);
    assert.equal(result.classifications_created_count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM domain_refinement_mappings').get() as any).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM domain_refinement_records').get() as any).count, 1);
  });
});

test('soft migration creates a target domain and preserves created-with/current classification history', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const { math } = seedDomainRuntime(db, userId);
    const blockId = insertDomainTaggedBlock(db, userId, courseId, math);
    const proposal = createDomainRefinementProposal(db, userId, {
      source_domain_id: math.id,
      target_domain_patch: {
        domain_key: 'learning.calculus.basic',
        label: 'Basic Calculus Learning',
        description: 'Calculus-specific learning domain.',
      },
      refinement_action: 'promote',
      migration_mode: 'soft_migration',
      course_id: courseId,
      object_reclassifications: [
        { target_type: 'note_block', target_id: blockId, classification_role: 'primary' },
      ],
    });
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposal.id) as any;

    const result = applyDomainRefinementProposal(db, userId, proposalRow);
    const block = db.prepare('SELECT metadata FROM note_blocks WHERE id = ?').get(blockId) as any;
    const metadata = JSON.parse(block.metadata);
    const classification = db.prepare('SELECT * FROM domain_object_classifications WHERE target_id = ?').get(blockId) as any;

    assert.equal(result.classifications_created_count, 1);
    assert.equal(metadata.created_with_domain_key, 'learning.math.basic');
    assert.equal(metadata.current_domain_key, 'learning.calculus.basic');
    assert.equal(Array.isArray(metadata.domain_classification_history), true);
    assert.equal(metadata.domain_classification_history[0].mode, 'soft_migration');
    assert.equal(classification.domain_key, 'learning.calculus.basic');
    assert.equal(classification.created_with_domain_key, 'learning.math.basic');
  });
});

test('hard cascade blocks ambiguous split without explicit reclassification mappings', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const { math } = seedDomainRuntime(db, userId);
    const beforeMappings = (db.prepare('SELECT COUNT(*) AS count FROM domain_refinement_mappings').get() as any).count;
    const proposal = createDomainRefinementProposal(db, userId, {
      source_domain_id: math.id,
      target_domain_patch: {
        domain_key: 'learning.math.split-a',
        label: 'Math Split A',
      },
      refinement_action: 'split',
      migration_mode: 'hard_cascade',
      course_id: courseId,
    });
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposal.id) as any;

    assert.equal(proposal.data.blockers.some((blocker: string) => blocker.includes('explicit')), true);
    assert.throws(
      () => applyDomainRefinementProposal(db, userId, proposalRow),
      /blocked/i,
    );
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM domain_refinement_mappings').get() as any).count, beforeMappings);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM domain_refinement_records').get() as any).count, 0);
  });
});
