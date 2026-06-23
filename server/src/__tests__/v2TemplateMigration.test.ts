import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import {
  activateTemplateDefinition,
  createUserTemplateDefinition,
  listTemplateDefinitions,
  seedSystemTemplateDefinitions,
  updateTemplateDefinition,
} from '../services/templateDefinitions.js';
import {
  applyTemplateMigrationProposal,
  createTemplateMigrationProposal,
} from '../services/templateMigrationProposals.js';

async function withDb(run: (db: Awaited<ReturnType<typeof initDb>>) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-v254-'));
  const dbPath = join(dir, 'test.db');

  try {
    const db = await initDb(dbPath);
    await run(db);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedUserCourse(db: Awaited<ReturnType<typeof initDb>>) {
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
    .run(userId, `${userId}@example.com`, 'hash', 'Template Migration User');
  db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
    .run(courseId, userId, 'Template Migration Course');
  return { userId, courseId };
}

function getSystemTemplate(db: Awaited<ReturnType<typeof initDb>>, userId: string, templateKey: string) {
  seedSystemTemplateDefinitions(db, userId);
  const template = listTemplateDefinitions(db, userId, { template_key: templateKey, status: 'active' })[0];
  assert.ok(template, `${templateKey} should be seeded`);
  return template;
}

function createActiveTargetTemplate(db: Awaited<ReturnType<typeof initDb>>, userId: string) {
  const target = createUserTemplateDefinition(db, userId, {
    template_key: 'text.engineering',
    label: 'Engineering Text',
    description: 'Text adapted for engineering notes.',
    system_type: 'text',
    learning_role: 'note',
    legacy_block_type: 'paragraph',
    field_schema: [{ key: 'body', label: 'Body', kind: 'textarea', required: true }],
    default_content: { body: '' },
    render_hints: { reading: { display: 'paragraph' } },
    source_behavior: { source_reference_policy: 'recommended' },
    relation_behavior: { relation_preset: 'learning_logic' },
    proposal_behavior: { proposal_preset: 'migration_requires_proposal' },
    summary_for_agent: 'Use for engineering text notes.',
  });
  return activateTemplateDefinition(db, userId, target.id);
}

function insertTemplateBackedBlock(
  db: Awaited<ReturnType<typeof initDb>>,
  userId: string,
  courseId: string,
  template: any,
) {
  const blockId = uuidv4();
  const metadata = {
    template_definition_id: template.id,
    template_key: template.template_key,
    template_version: template.version,
    template_id: template.template_key,
    system_type: template.system_type,
    learning_role: template.learning_role,
    taxonomy_version: 'v2.5.0',
  };
  db.prepare(`
    INSERT INTO note_blocks (
      id, user_id, course_id, block_type, title, content_json, plain_text,
      source_kind, metadata, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?, datetime('now'), datetime('now'))
  `).run(
    blockId,
    userId,
    courseId,
    template.legacy_block_type,
    'Text block',
    JSON.stringify({ body: 'A limit describes approached behavior.' }),
    'A limit describes approached behavior.',
    JSON.stringify(metadata),
  );
  return blockId;
}

test('v2.5.4 migration creates template migration tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('template_migration_mappings'), true);
    assert.equal(tableNames.includes('template_migration_records'), true);
    assert.equal(tableNames.includes('template_migration_record_items'), true);
  });
});

test('creating a template migration proposal reports impact without mutating blocks', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const source = getSystemTemplate(db, userId, 'text.paragraph');
    const target = createActiveTargetTemplate(db, userId);
    const blockId = insertTemplateBackedBlock(db, userId, courseId, source);
    const before = db.prepare('SELECT block_type, metadata FROM note_blocks WHERE id = ?').get(blockId) as any;

    const proposal = createTemplateMigrationProposal(db, userId, {
      source_template_id: source.id,
      target_template_id: target.id,
      migration_mode: 'soft_migration',
      course_id: courseId,
      reason: 'Use engineering definition template.',
    });

    const after = db.prepare('SELECT block_type, metadata FROM note_blocks WHERE id = ?').get(blockId) as any;
    assert.deepEqual(after, before);
    assert.equal(proposal.type, 'template_migration');
    assert.equal(proposal.data.proposal_kind, 'template_migration');
    assert.equal(proposal.data.affected_object_count, 1);
    assert.equal(proposal.data.samples.length, 1);
    assert.equal(proposal.data.blockers.length, 0);
    assert.equal(proposal.data.apply_behavior, 'template_migration_records_only_or_metadata_updates');
  });
});

test('alias mapping apply creates mapping and records without mutating NoteBlocks', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const source = getSystemTemplate(db, userId, 'text.paragraph');
    const target = createActiveTargetTemplate(db, userId);
    const blockId = insertTemplateBackedBlock(db, userId, courseId, source);
    const before = db.prepare('SELECT block_type, metadata FROM note_blocks WHERE id = ?').get(blockId) as any;
    const proposal = createTemplateMigrationProposal(db, userId, {
      source_template_id: source.id,
      target_template_id: target.id,
      migration_mode: 'alias_mapping',
      course_id: courseId,
    });
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposal.id) as any;

    const result = applyTemplateMigrationProposal(db, userId, proposalRow);
    const after = db.prepare('SELECT block_type, metadata FROM note_blocks WHERE id = ?').get(blockId) as any;

    assert.deepEqual(after, before);
    assert.equal(result.mappings_created_count, 1);
    assert.equal(result.blocks_mutated_count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM template_migration_mappings').get() as any).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM template_migration_record_items').get() as any).count, 1);
  });
});

test('soft migration updates template metadata and preserves created-with history', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const source = getSystemTemplate(db, userId, 'text.paragraph');
    const target = createActiveTargetTemplate(db, userId);
    const blockId = insertTemplateBackedBlock(db, userId, courseId, source);
    const proposal = createTemplateMigrationProposal(db, userId, {
      source_template_id: source.id,
      target_template_id: target.id,
      migration_mode: 'soft_migration',
      course_id: courseId,
    });
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposal.id) as any;

    const result = applyTemplateMigrationProposal(db, userId, proposalRow);
    const block = db.prepare('SELECT block_type, metadata, content_json FROM note_blocks WHERE id = ?').get(blockId) as any;
    const metadata = JSON.parse(block.metadata);

    assert.equal(result.blocks_mutated_count, 1);
    assert.equal(block.block_type, 'paragraph');
    assert.equal(JSON.parse(block.content_json).body, 'A limit describes approached behavior.');
    assert.equal(metadata.template_definition_id, target.id);
    assert.equal(metadata.template_key, 'text.engineering');
    assert.equal(metadata.created_with_template_definition_id, source.id);
    assert.equal(metadata.created_with_template_key, 'text.paragraph');
    assert.equal(Array.isArray(metadata.template_migration_history), true);
    assert.equal(metadata.template_migration_history[0].mode, 'soft_migration');
  });
});

test('blocked hard cascade fails without partial writes', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const source = getSystemTemplate(db, userId, 'text.paragraph');
    const target = createUserTemplateDefinition(db, userId, {
      template_key: 'text.empty',
      label: 'Empty Text',
      system_type: 'text',
      learning_role: 'note',
      legacy_block_type: 'paragraph',
      field_schema: [{ key: 'summary', label: 'Summary', kind: 'textarea', required: true }],
      default_content: {},
    });
    const activeTarget = activateTemplateDefinition(db, userId, target.id);
    const blockId = insertTemplateBackedBlock(db, userId, courseId, source);
    const before = db.prepare('SELECT block_type, metadata, content_json FROM note_blocks WHERE id = ?').get(blockId) as any;
    const proposal = createTemplateMigrationProposal(db, userId, {
      source_template_id: source.id,
      target_template_id: activeTarget.id,
      migration_mode: 'hard_cascade',
      course_id: courseId,
    });
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposal.id) as any;

    assert.equal(proposal.data.blockers.length > 0, true);
    assert.throws(() => applyTemplateMigrationProposal(db, userId, proposalRow), /blocked/i);
    const after = db.prepare('SELECT block_type, metadata, content_json FROM note_blocks WHERE id = ?').get(blockId) as any;

    assert.deepEqual(after, before);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM template_migration_records').get() as any).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM operation_batches').get() as any).count, 0);
  });
});

test('active template structural edit still requires migration proposal', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const source = getSystemTemplate(db, userId, 'text.paragraph');
    const target = createActiveTargetTemplate(db, userId);
    insertTemplateBackedBlock(db, userId, courseId, target);

    assert.throws(() => updateTemplateDefinition(db, userId, target.id, {
      field_schema: [
        { key: 'body', label: 'Body', kind: 'textarea', required: true },
        { key: 'scope', label: 'Scope', kind: 'text', required: false },
      ],
    }), /proposal_required/);

    assert.ok(source.id);
  });
});
