import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import { listCourseMaterials, listMaterialSegments, listSourceFragments } from '../services/courseMaterials.js';
import { applyMaterialMapProposal, createMaterialMapProposal } from '../services/materialMapProposals.js';
import { applyOrganizedNoteProposal, createOrganizedNoteProposal } from '../services/organizedNoteProposals.js';
import { applyMaterialReconciliationProposal, createMaterialReconciliationProposal } from '../services/materialReconciliationProposals.js';
import { applyCanvasLayoutProposal, createCanvasLayoutProposal } from '../services/canvasLayoutProposals.js';
import { reopenConflict, resolveConflict, restoreExclusion } from '../services/reconciliationSafety.js';
import { generateSourceAnchors, getSourceAnchorJumpTarget, listSourceAnchors, refreshSourceAnchor } from '../services/sourceAnchors.js';
import {
  archiveSourceScope,
  createSourceScope,
  getSourceScopeJumpTarget,
  listSourceScopes,
  restoreSourceScope,
} from '../services/sourceScopes.js';
import {
  archiveSourceBoard,
  archiveSourceBoardNode,
  createSourceBoard,
  getSourceBoardNodeJumpTarget,
  listSourceBoardNodes,
  listSourceBoards,
  restoreSourceBoard,
  restoreSourceBoardNode,
  seedSourceBoardFromScopes,
} from '../services/sourceBoards.js';
import {
  archiveCanvasNode,
  archiveLearningCanvas,
  createCanvasNoteBlock,
  createCanvasNode,
  createLearningCanvas,
  getCanvasNodeJumpTarget,
  listCanvasNodes,
  listLearningCanvases,
  restoreCanvasNode,
  restoreLearningCanvas,
  seedCanvasFromSourceBoard,
  updateCanvasNode,
  updateCanvasViewport,
} from '../services/learningCanvases.js';
import { generateSourceSnapshots, getSourceSnapshot, listSourceSnapshots } from '../services/sourceSnapshots.js';
import { inferNoteBlockTemplateMetadata } from '../lib/noteBlockTemplates.js';
import {
  activateTemplateDefinition,
  archiveTemplateDefinition,
  copyTemplateDefinition,
  createUserTemplateDefinition,
  deprecateTemplateDefinition,
  getTemplateCompatibilityReport,
  getTemplateUsage,
  listTemplateDefinitions,
  mergeRuntimeNoteBlockTemplateMetadata,
  seedSystemTemplateDefinitions,
  updateTemplateDefinition,
} from '../services/templateDefinitions.js';
import {
  applyCompositionTemplateProposal,
  createCompositionTemplateProposal,
  getCompositionTemplateCompatibilityReport,
  listCompositionTemplates,
  seedSystemCompositionTemplates,
} from '../services/compositionTemplates.js';

async function withDb(run: (db: Awaited<ReturnType<typeof initDb>>) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-v21-'));
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
    .run(userId, `${userId}@example.com`, 'hash', 'V2.1 User');
  db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))")
    .run(courseId, userId, 'Calculus');
  return { userId, courseId };
}

function seedParsedDocument(db: Awaited<ReturnType<typeof initDb>>, userId: string, courseId: string) {
  const documentId = uuidv4();
  const firstChunkId = uuidv4();
  const secondChunkId = uuidv4();
  db.prepare(`
    INSERT INTO documents (
      id, user_id, course_id, filename, file_path, file_type, parse_status,
      extracted_text, page_count, document_type, chunk_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    documentId,
    userId,
    courseId,
    'organized-note.pdf',
    'uploads/organized-note.pdf',
    'pdf',
    'completed',
    'Limits and continuity source material',
    4,
    'slides',
    2
  );
  db.prepare('INSERT INTO document_chunks (id, document_id, chunk_index, content, page_start, page_end, heading) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(firstChunkId, documentId, 0, 'Limits describe what a function approaches near an input.', 1, 2, 'Limits');
  db.prepare('INSERT INTO document_chunks (id, document_id, chunk_index, content, page_start, page_end, heading) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(secondChunkId, documentId, 1, 'Continuity means nearby inputs keep outputs nearby.', 3, 4, 'Continuity');
  return { documentId, firstChunkId, secondChunkId };
}

test('v2.1 material proposal migration creates additive material tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    for (const tableName of [
      'source_materials',
      'source_fragments',
      'material_segments',
      'material_segment_fragments',
      'evidence_sets',
      'evidence_items',
      'material_reconciliation_decisions',
      'excluded_material_scopes',
      'conflict_review_items',
      'reconciliation_recovery_events',
      'template_definitions',
    ]) {
      assert.equal(tableNames.includes(tableName), true, `${tableName} should exist`);
    }

    assert.equal(tableNames.includes('documents'), true, 'documents table should remain');
    assert.equal(tableNames.includes('note_blocks'), true, 'note_blocks table should remain');
  });
});

test('v2.3 source snapshot migration creates additive snapshot tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('source_snapshots'), true);
    assert.equal(tableNames.includes('source_snapshot_pages'), true);
  });
});

test('v2.3.1 source anchor migration creates additive anchor tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('source_anchors'), true);
    assert.equal(tableNames.includes('source_anchor_links'), true);
  });
});

test('v2.3.2 source scope migration creates additive scope table', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('source_scopes'), true);
  });
});

test('v2.3.3 source board migration creates additive board tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('source_boards'), true);
    assert.equal(tableNames.includes('source_board_nodes'), true);
  });
});

test('post-047 learning canvas projection tables remain while legacy edges are retired', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    for (const tableName of [
      'learning_canvases',
      'canvas_nodes',
      'canvas_frames',
      'canvas_viewport_states',
    ]) {
      assert.equal(tableNames.includes(tableName), true, `${tableName} should exist`);
    }
    assert.equal(tableNames.includes('canvas_edges'), false);
  });
});

test('post-047 item and relation floor replaces legacy relation structures', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    for (const tableName of ['canvas_edges', 'object_relations', 'relation_layers']) {
      assert.equal(tableNames.includes(tableName), false, `${tableName} should be retired`);
    }
    assert.equal(tableNames.includes('items'), true);
    assert.equal(tableNames.includes('relations'), true);
  });
});

test('post-047 startup retires an existing pre-relation canvas_edges table', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-v244-old-edge-'));
  const dbPath = join(dir, 'test.db');

  try {
    const oldDb = new Database(dbPath);
    oldDb.exec(`
      CREATE TABLE canvas_edges (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        canvas_id TEXT NOT NULL,
        source_node_id TEXT NOT NULL,
        target_node_id TEXT NOT NULL,
        relation_kind TEXT,
        label TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    oldDb.close();

    const db = await initDb(dbPath);
    const edgeTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'canvas_edges'").get();
    const migration = db.prepare("SELECT id FROM db_migrations WHERE id = '047_v2_item_relation_floor'").get();
    assert.equal(edgeTable, undefined);
    assert.ok(migration);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('generating source snapshots from parsed documents creates page-like source views idempotently', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const firstDoc = seedParsedDocument(db, userId, courseId);
    const secondDoc = seedParsedDocument(db, userId, courseId);
    listCourseMaterials(db, userId, courseId);
    const sourceStateBefore = db
      .prepare('SELECT id, proposal_status, segment_status, used_in_note_count FROM source_materials ORDER BY id')
      .all();

    const result = generateSourceSnapshots(db, userId, { course_id: courseId }) as any;

    assert.equal(result.generated_count, 2);
    assert.deepEqual(result.warnings, []);
    const snapshots = listSourceSnapshots(db, userId, courseId) as any[];
    assert.equal(snapshots.length, 2);
    assert.equal(snapshots.every((snapshot) => snapshot.status === 'ready'), true);
    assert.equal(snapshots.every((snapshot) => snapshot.snapshot_kind === 'parsed_pages'), true);

    const firstSnapshot = snapshots.find((snapshot) => snapshot.document_id === firstDoc.documentId);
    assert.ok(firstSnapshot);
    const detail = getSourceSnapshot(db, userId, firstSnapshot.id) as any;
    assert.equal(detail.snapshot.document_id, firstDoc.documentId);
    assert.equal(detail.pages.length, 2);
    assert.deepEqual(detail.pages.map((page: any) => page.page_number), [1, 3]);
    assert.equal(detail.pages[0].text_content.includes('Limits describe'), true);
    assert.deepEqual(JSON.parse(detail.pages[0].chunk_ids), [firstDoc.firstChunkId]);

    const secondRun = generateSourceSnapshots(db, userId, { course_id: courseId }) as any;
    assert.equal(secondRun.generated_count, 2);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_snapshots').get() as any).count, 2);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_snapshot_pages').get() as any).count, 4);
    assert.deepEqual(
      db
        .prepare('SELECT id, proposal_status, segment_status, used_in_note_count FROM source_materials ORDER BY id')
        .all(),
      sourceStateBefore,
    );
    assert.ok(secondDoc.documentId);
  });
});

test('source snapshot generation returns warnings for unparsed documents without blocking ready snapshots', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    const pendingDocumentId = uuidv4();
    db.prepare(`
      INSERT INTO documents (
        id, user_id, course_id, filename, file_path, file_type, parse_status,
        extracted_text, page_count, document_type, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      pendingDocumentId,
      userId,
      courseId,
      'pending-source.pdf',
      'uploads/pending-source.pdf',
      'pdf',
      'pending',
      null,
      null,
      'slides',
      0,
    );
    listCourseMaterials(db, userId, courseId);

    const result = generateSourceSnapshots(db, userId, { course_id: courseId }) as any;

    assert.equal(result.generated_count, 1);
    assert.equal(result.warnings.some((warning: string) => warning.includes('pending-source.pdf')), true);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_snapshots').get() as any).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM documents WHERE id = ?').get(pendingDocumentId) as any).count, 1);
  });
});

test('source snapshot APIs are scoped by user and course', async () => {
  await withDb((db) => {
    const first = seedUserCourse(db);
    const second = seedUserCourse(db);
    seedParsedDocument(db, first.userId, first.courseId);
    seedParsedDocument(db, second.userId, second.courseId);

    generateSourceSnapshots(db, first.userId, { course_id: first.courseId });
    generateSourceSnapshots(db, second.userId, { course_id: second.courseId });

    const firstSnapshots = listSourceSnapshots(db, first.userId, first.courseId) as any[];
    const secondSnapshots = listSourceSnapshots(db, second.userId, second.courseId) as any[];
    assert.equal(firstSnapshots.length, 1);
    assert.equal(secondSnapshots.length, 1);
    assert.throws(() => getSourceSnapshot(db, second.userId, firstSnapshots[0].id), /Source snapshot not found/);
  });
});

test('source anchor generation from note block sources creates stable jump targets', async () => {
  await withDb(async (db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    const materialMap = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    applyMaterialMapProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(materialMap.id) as any);
    const noteProposal = await createOrganizedNoteProposal(db, userId, { course_id: courseId }) as any;
    applyOrganizedNoteProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(noteProposal.id) as any);
    generateSourceSnapshots(db, userId, { course_id: courseId });

    const result = generateSourceAnchors(db, userId, { course_id: courseId }) as any;

    assert.equal(result.warnings.length, 0);
    assert.equal(result.anchors_created_count > 0, true);
    assert.equal(result.links_created_count > result.anchors_created_count, true);
    const noteBlockSource = db.prepare('SELECT * FROM note_block_sources ORDER BY rowid ASC LIMIT 1').get() as any;
    const anchors = listSourceAnchors(db, userId, {
      course_id: courseId,
      target_type: 'note_block_source',
      target_id: noteBlockSource.id,
    }) as any[];
    assert.equal(anchors.length, 1);
    assert.equal(anchors[0].anchor_kind, 'note_block_source');

    const jumpTarget = getSourceAnchorJumpTarget(db, userId, anchors[0].id) as any;
    assert.equal(jumpTarget.snapshot.document_id, noteBlockSource.document_id);
    assert.equal(jumpTarget.page.page_number, noteBlockSource.source_page_start);
    assert.equal(jumpTarget.focus.page_start, noteBlockSource.source_page_start);

    const secondRun = generateSourceAnchors(db, userId, { course_id: courseId }) as any;
    assert.equal(secondRun.anchors_created_count, 0);
    assert.equal(secondRun.links_created_count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_anchors').get() as any).count, result.total_anchor_count);
  });
});

test('source anchor generation from evidence items creates stable evidence links', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    seedParsedDocument(db, userId, courseId);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const duplicateGroup = proposal.data.candidate_groups.find((group: any) => group.group_kind === 'DUPLICATE');
    assert.ok(duplicateGroup);
    applyMaterialReconciliationProposal(
      db,
      userId,
      db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposal.id) as any,
      { group_decisions: [{ group_id: duplicateGroup.group_id, decision: 'accepted_evidence_set' }] },
    );
    const evidenceSet = db.prepare('SELECT * FROM evidence_sets WHERE source_proposal_id = ?').get(proposal.id) as any;

    const result = generateSourceAnchors(db, userId, {
      course_id: courseId,
      target_type: 'evidence_set',
      target_id: evidenceSet.id,
    }) as any;

    assert.equal(result.warnings.length, 0);
    assert.equal(result.anchors_created_count, duplicateGroup.evidence.length);
    const anchors = listSourceAnchors(db, userId, {
      course_id: courseId,
      target_type: 'evidence_set',
      target_id: evidenceSet.id,
    }) as any[];
    assert.equal(anchors.length, duplicateGroup.evidence.length);
    assert.equal(anchors.every((anchor) => anchor.anchor_kind === 'evidence_item'), true);
    const jumpTarget = getSourceAnchorJumpTarget(db, userId, anchors[0].id) as any;
    assert.equal(jumpTarget.snapshot.id, anchors[0].source_snapshot_id);
    assert.equal(typeof jumpTarget.page.text_content, 'string');
  });
});

test('source anchor generation warns when source snapshots are missing without mutating notes or evidence', async () => {
  await withDb(async (db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    const materialMap = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    applyMaterialMapProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(materialMap.id) as any);
    const noteProposal = await createOrganizedNoteProposal(db, userId, { course_id: courseId }) as any;
    applyOrganizedNoteProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(noteProposal.id) as any);
    const before = {
      notes: db.prepare('SELECT id, title, updated_at FROM notes ORDER BY id').all(),
      evidence: (db.prepare('SELECT COUNT(*) AS count FROM evidence_items').get() as any).count,
    };

    const result = generateSourceAnchors(db, userId, { course_id: courseId }) as any;

    assert.equal(result.anchors_created_count, 0);
    assert.equal(result.warnings.some((warning: string) => warning.includes('No source snapshot')), true);
    assert.deepEqual(db.prepare('SELECT id, title, updated_at FROM notes ORDER BY id').all(), before.notes);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM evidence_items').get() as any).count, before.evidence);
  });
});

test('source anchor APIs are scoped by user course and target, and refresh repairs stale page mapping', async () => {
  await withDb(async (db) => {
    const { userId, courseId } = seedUserCourse(db);
    const other = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    seedParsedDocument(db, other.userId, other.courseId);
    const materialMap = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    applyMaterialMapProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(materialMap.id) as any);
    const noteProposal = await createOrganizedNoteProposal(db, userId, { course_id: courseId }) as any;
    applyOrganizedNoteProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(noteProposal.id) as any);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    const result = generateSourceAnchors(db, userId, { course_id: courseId }) as any;
    const anchor = listSourceAnchors(db, userId, { course_id: courseId })[0] as any;
    const noteBlockLink = db.prepare(`
      SELECT * FROM source_anchor_links
      WHERE source_anchor_id = ? AND target_type = 'note_block'
      LIMIT 1
    `).get(anchor.id) as any;
    assert.ok(noteBlockLink);

    assert.equal(listSourceAnchors(db, other.userId, { course_id: other.courseId }).length, 0);
    assert.equal(listSourceAnchors(db, userId, {
      course_id: courseId,
      target_type: 'note_block',
      target_id: noteBlockLink.target_id,
    }).length >= 1, true);

    const oldPage = db.prepare('SELECT * FROM source_snapshot_pages WHERE id = ?').get(anchor.source_snapshot_page_id) as any;
    assert.ok(oldPage);
    const replacementPageId = uuidv4();
    db.prepare('DELETE FROM source_snapshot_pages WHERE id = ?').run(oldPage.id);
    db.prepare(`
      INSERT INTO source_snapshot_pages (
        id, user_id, course_id, source_snapshot_id, document_id, page_number,
        page_label, text_content, chunk_ids, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      replacementPageId,
      oldPage.user_id,
      oldPage.course_id,
      oldPage.source_snapshot_id,
      oldPage.document_id,
      oldPage.page_number,
      oldPage.page_label,
      oldPage.text_content,
      oldPage.chunk_ids,
      oldPage.metadata,
    );
    const refreshed = refreshSourceAnchor(db, userId, anchor.id) as any;
    assert.equal(refreshed.anchor.source_snapshot_page_id, replacementPageId);
    const jumpTarget = getSourceAnchorJumpTarget(db, userId, anchor.id) as any;
    assert.equal(jumpTarget.page.id, replacementPageId);
    assert.equal(result.total_anchor_count > 0, true);
  });
});

test('course materials are seeded from parsed documents and chunks', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const documentId = uuidv4();
    const firstChunkId = uuidv4();
    const secondChunkId = uuidv4();

    db.prepare(`
      INSERT INTO documents (
        id, user_id, course_id, filename, file_path, file_type, parse_status,
        extracted_text, page_count, document_type, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      documentId,
      userId,
      courseId,
      'limits.pdf',
      'uploads/limits.pdf',
      'pdf',
      'completed',
      'Limits and continuity',
      12,
      'slides',
      2
    );

    db.prepare('INSERT INTO document_chunks (id, document_id, chunk_index, content, page_start, page_end, heading) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(firstChunkId, documentId, 0, 'Limits introduction', 1, 2, 'Limits');
    db.prepare('INSERT INTO document_chunks (id, document_id, chunk_index, content, page_start, page_end, heading) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(secondChunkId, documentId, 1, 'Continuity definition', 3, 4, 'Continuity');

    const materials = listCourseMaterials(db, userId, courseId) as any[];
    assert.equal(materials.length, 1);
    assert.equal(materials[0].document_id, documentId);
    assert.equal(materials[0].parse_status, 'completed');
    assert.equal(materials[0].fragment_status, 'ready');
    assert.equal(materials[0].fragment_count, 2);

    const fragments = listSourceFragments(db, userId, materials[0].id) as any[];
    assert.equal(fragments.length, 2);
    assert.deepEqual(fragments.map((fragment) => fragment.document_chunk_id), [firstChunkId, secondChunkId]);
    assert.deepEqual(fragments.map((fragment) => fragment.order_index), [0, 1]);
    assert.equal(fragments[0].fragment_type, 'heading');
  });
});

test('course material seed keeps failed and pending documents visible with warnings', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    db.prepare(`
      INSERT INTO documents (
        id, user_id, course_id, filename, file_path, file_type, parse_status,
        error_message, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(uuidv4(), userId, courseId, 'scanned.pdf', 'uploads/scanned.pdf', 'pdf', 'failed', 'OCR failed', 0);
    db.prepare(`
      INSERT INTO documents (
        id, user_id, course_id, filename, file_path, file_type, parse_status,
        chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(uuidv4(), userId, courseId, 'pending.pdf', 'uploads/pending.pdf', 'pdf', 'pending', 0);

    const materials = listCourseMaterials(db, userId, courseId) as any[];
    assert.equal(materials.length, 2);
    const failed = materials.find((material) => material.parse_status === 'failed');
    const pending = materials.find((material) => material.parse_status === 'pending');

    assert.equal(failed.fragment_status, 'failed');
    assert.equal(failed.warnings.includes('OCR failed'), true);
    assert.equal(pending.fragment_status, 'not_started');
    assert.equal(pending.warnings.includes('Document is not fully parsed yet.'), true);
  });
});

test('material segments are derived deterministically from source fragments', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const documentId = uuidv4();
    const chunks = [
      { id: uuidv4(), heading: 'Limits', content: 'Limits introduction', pageStart: 1, pageEnd: 2 },
      { id: uuidv4(), heading: 'Limits', content: 'Limit laws', pageStart: 3, pageEnd: 4 },
      { id: uuidv4(), heading: 'Continuity', content: 'Continuity definition', pageStart: 5, pageEnd: 6 },
    ];

    db.prepare(`
      INSERT INTO documents (
        id, user_id, course_id, filename, file_path, file_type, parse_status,
        extracted_text, page_count, document_type, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(documentId, userId, courseId, 'week-1.pdf', 'uploads/week-1.pdf', 'pdf', 'completed', 'Week 1 material', 6, 'slides', chunks.length);

    const insertChunk = db.prepare('INSERT INTO document_chunks (id, document_id, chunk_index, content, page_start, page_end, heading) VALUES (?, ?, ?, ?, ?, ?, ?)');
    chunks.forEach((chunk, index) => {
      insertChunk.run(chunk.id, documentId, index, chunk.content, chunk.pageStart, chunk.pageEnd, chunk.heading);
    });

    const [material] = listCourseMaterials(db, userId, courseId) as any[];
    const segments = listMaterialSegments(db, userId, material.id) as any[];

    assert.equal(segments.length >= 3, true);
    assert.deepEqual(segments.map((segment) => segment.order_index), [...segments].map((_, index) => index));
    assert.equal(segments.some((segment) => segment.segment_type === 'document' && segment.title === 'week-1.pdf'), true);
    assert.equal(segments.some((segment) => segment.segment_type === 'heading' && segment.title === 'Limits'), true);
    assert.equal(segments.some((segment) => segment.segment_type === 'heading' && segment.title === 'Continuity'), true);

    const limitsSegment = segments.find((segment) => segment.segment_type === 'heading' && segment.title === 'Limits');
    const linkedFragments = db.prepare(`
      SELECT sf.document_chunk_id
      FROM material_segment_fragments msf
      JOIN source_fragments sf ON sf.id = msf.fragment_id
      WHERE msf.segment_id = ?
      ORDER BY msf.order_index ASC
    `).all(limitsSegment.id) as Array<{ document_chunk_id: string }>;

    assert.deepEqual(linkedFragments.map((fragment) => fragment.document_chunk_id), [chunks[0].id, chunks[1].id]);
    const updatedMaterial = db.prepare('SELECT segment_status FROM source_materials WHERE id = ?')
      .get(material.id) as { segment_status: string };
    assert.equal(updatedMaterial.segment_status, 'proposed');
  });
});

test('material segment derivation is idempotent', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const documentId = uuidv4();
    db.prepare(`
      INSERT INTO documents (
        id, user_id, course_id, filename, file_path, file_type, parse_status,
        extracted_text, page_count, document_type, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(documentId, userId, courseId, 'summary.md', 'uploads/summary.md', 'md', 'completed', 'Short summary', null, 'notes', 0);

    const [material] = listCourseMaterials(db, userId, courseId) as any[];
    const first = listMaterialSegments(db, userId, material.id) as any[];
    const second = listMaterialSegments(db, userId, material.id) as any[];

    assert.equal(first.length, second.length);
    assert.deepEqual(first.map((segment) => segment.id), second.map((segment) => segment.id));
    assert.equal(first.some((segment) => segment.segment_type === 'document'), true);
  });
});

test('material map proposal previews source segments and warnings', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const documentId = uuidv4();
    const chunkId = uuidv4();

    db.prepare(`
      INSERT INTO documents (
        id, user_id, course_id, filename, file_path, file_type, parse_status,
        extracted_text, page_count, document_type, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(documentId, userId, courseId, 'proposal.pdf', 'uploads/proposal.pdf', 'pdf', 'completed', 'Proposal material', 2, 'slides', 1);
    db.prepare('INSERT INTO document_chunks (id, document_id, chunk_index, content, page_start, page_end, heading) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(chunkId, documentId, 0, 'The derivative measures local change.', 1, 2, 'Derivatives');

    const proposal = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;

    assert.equal(proposal.type, 'material_map');
    assert.equal(proposal.status, 'pending');
    assert.equal(proposal.data.course_id, courseId);
    assert.equal(proposal.data.source_material_ids.length, 1);
    assert.equal(proposal.data.segments.length > 0, true);
    assert.equal(proposal.data.segments.some((segment: any) => segment.title === 'Derivatives'), true);

    const storedProposal = db.prepare('SELECT type, status FROM proposals WHERE id = ?')
      .get(proposal.id) as { type: string; status: string };
    assert.deepEqual(storedProposal, { type: 'material_map', status: 'pending' });

    const material = db.prepare('SELECT proposal_status FROM source_materials WHERE document_id = ?')
      .get(documentId) as { proposal_status: string };
    assert.equal(material.proposal_status, 'map_proposed');
  });
});

test('applying a material map proposal accepts segments without creating notes', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const documentId = uuidv4();
    const chunkId = uuidv4();

    db.prepare(`
      INSERT INTO documents (
        id, user_id, course_id, filename, file_path, file_type, parse_status,
        extracted_text, page_count, document_type, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(documentId, userId, courseId, 'apply-map.pdf', 'uploads/apply-map.pdf', 'pdf', 'completed', 'Apply material', 1, 'notes', 1);
    db.prepare('INSERT INTO document_chunks (id, document_id, chunk_index, content, page_start, page_end, heading) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(chunkId, documentId, 0, 'Continuity keeps nearby values nearby.', 1, 1, 'Continuity');

    const proposal = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
      .get(proposal.id, userId) as any;
    const notesBefore = (db.prepare('SELECT COUNT(*) AS count FROM notes WHERE user_id = ?')
      .get(userId) as { count: number }).count;

    const result = applyMaterialMapProposal(db, userId, proposalRow);

    assert.equal(result.accepted_segments_count > 0, true);
    assert.equal(typeof result.operation_batch_id, 'string');
    const notesAfter = (db.prepare('SELECT COUNT(*) AS count FROM notes WHERE user_id = ?')
      .get(userId) as { count: number }).count;
    assert.equal(notesAfter, notesBefore);

    const nonAccepted = (db.prepare(`
      SELECT COUNT(*) AS count
      FROM material_segments
      WHERE user_id = ? AND source_material_id IN (
        SELECT id FROM source_materials WHERE document_id = ?
      ) AND status != 'accepted'
    `).get(userId, documentId) as { count: number }).count;
    assert.equal(nonAccepted, 0);

    const material = db.prepare('SELECT segment_status, proposal_status FROM source_materials WHERE document_id = ?')
      .get(documentId) as { segment_status: string; proposal_status: string };
    assert.deepEqual(material, { segment_status: 'accepted', proposal_status: 'map_accepted' });
  });
});

test('discarding a material map proposal does not accept segments or create notes', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const documentId = uuidv4();
    const chunkId = uuidv4();

    db.prepare(`
      INSERT INTO documents (
        id, user_id, course_id, filename, file_path, file_type, parse_status,
        extracted_text, page_count, document_type, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(documentId, userId, courseId, 'discard-map.pdf', 'uploads/discard-map.pdf', 'pdf', 'completed', 'Discard material', 1, 'notes', 1);
    db.prepare('INSERT INTO document_chunks (id, document_id, chunk_index, content, page_start, page_end, heading) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(chunkId, documentId, 0, 'A theorem statement.', 1, 1, 'Mean Value Theorem');

    const proposal = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    db.prepare("UPDATE proposals SET status = 'discarded', resolved_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(proposal.id, userId);

    const notesCount = (db.prepare('SELECT COUNT(*) AS count FROM notes WHERE user_id = ?')
      .get(userId) as { count: number }).count;
    const acceptedCount = (db.prepare('SELECT COUNT(*) AS count FROM material_segments WHERE user_id = ? AND status = ?')
      .get(userId, 'accepted') as { count: number }).count;
    const storedProposal = db.prepare('SELECT status FROM proposals WHERE id = ?')
      .get(proposal.id) as { status: string };

    assert.equal(notesCount, 0);
    assert.equal(acceptedCount, 0);
    assert.equal(storedProposal.status, 'discarded');
  });
});

test('organized note proposal uses deterministic fallback without an AI key', async () => {
  await withDb(async (db) => {
    const { userId, courseId } = seedUserCourse(db);
    const { documentId, firstChunkId } = seedParsedDocument(db, userId, courseId);
    const materialMap = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    applyMaterialMapProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(materialMap.id) as any);

    const proposal = await createOrganizedNoteProposal(db, userId, {
      course_id: courseId,
      note_title: 'Week 1 Organized Notes',
    }) as any;

    assert.equal(proposal.type, 'organized_note');
    assert.equal(proposal.status, 'pending');
    assert.equal(proposal.data.title, 'Week 1 Organized Notes');
    assert.equal(proposal.data.generation_mode, 'deterministic_fallback');
    assert.equal(proposal.data.warnings.some((warning: string) => warning.includes('AI generation was not used')), true);
    assert.equal(proposal.data.blocks.length > 0, true);
    assert.equal(proposal.data.blocks.every((block: any) => block.metadata?.taxonomy_version === 'v2.5.0'), true);
    assert.equal(proposal.data.blocks.some((block: any) => block.metadata?.template_id === 'text.paragraph'), true);
    assert.equal(proposal.data.blocks.some((block: any) => block.metadata?.template_id === 'text.paragraph'), true);
    assert.equal(proposal.data.blocks[0].source_references.length > 0, true);
    assert.equal(proposal.data.blocks[0].source_references[0].document_id, documentId);
    assert.equal(proposal.data.blocks.some((block: any) => {
      return block.source_references.some((ref: any) => ref.document_chunk_id === firstChunkId);
    }), true);

    const material = db.prepare('SELECT proposal_status FROM source_materials WHERE document_id = ?')
      .get(documentId) as { proposal_status: string };
    assert.equal(material.proposal_status, 'note_proposed');
  });
});

test('legacy NoteBlock types map to template-aware taxonomy metadata', () => {
  assert.deepEqual(inferNoteBlockTemplateMetadata('definition'), {
    system_type: 'text',
    learning_role: 'note',
    template_id: 'text.paragraph',
    taxonomy_version: 'v2.1.1',
  });
  assert.deepEqual(inferNoteBlockTemplateMetadata('formula'), {
    system_type: 'latex',
    learning_role: 'formula',
    template_id: 'formula.math',
    taxonomy_version: 'v2.1.1',
  });
  assert.deepEqual(inferNoteBlockTemplateMetadata('unknown'), {
    system_type: 'text',
    learning_role: 'note',
    template_id: 'text.paragraph',
    taxonomy_version: 'v2.1.1',
  });
});

test('v2.5 template runtime seeds system templates idempotently', async () => {
  await withDb((db) => {
    const { userId } = seedUserCourse(db);

    const firstSeed = seedSystemTemplateDefinitions(db, userId);
    const secondSeed = seedSystemTemplateDefinitions(db, userId);
    const templates = listTemplateDefinitions(db, userId, {});

    assert.equal(firstSeed.length, 3);
    assert.equal(secondSeed.length, firstSeed.length);
    assert.equal(templates.length, firstSeed.length);
    assert.equal(templates.some((template) => template.template_key === 'text.paragraph'), true);
    assert.equal(templates.every((template) => template.version === '1.0.0'), true);
    assert.equal(templates.every((template) => template.origin === 'system_seed'), true);
    assert.equal(templates.every((template) => template.scope_type === 'global'), true);
  });
});

test('runtime template metadata resolves explicit and legacy NoteBlock inputs', async () => {
  await withDb((db) => {
    const { userId } = seedUserCourse(db);

    const explicit = mergeRuntimeNoteBlockTemplateMetadata(db, userId, {
      template_id: 'text.paragraph',
      custom_key: 'preserved',
    }, 'definition');
    const inferred = mergeRuntimeNoteBlockTemplateMetadata(db, userId, {}, 'formula');

    assert.equal(explicit.metadata.custom_key, 'preserved');
    assert.equal(explicit.metadata.template_id, 'text.paragraph');
    assert.equal(explicit.metadata.template_key, 'text.paragraph');
    assert.equal(explicit.metadata.template_version, '1.0.0');
    assert.equal(explicit.metadata.template_resolution_status, 'runtime_resolved');
    assert.equal(explicit.metadata.taxonomy_version, 'v2.5.0');
    assert.equal(typeof explicit.metadata.template_definition_id, 'string');

    assert.equal(inferred.metadata.template_id, 'formula.math');
    assert.equal(inferred.metadata.template_key, 'formula.math');
    assert.equal(inferred.metadata.system_type, 'latex');
    assert.equal(inferred.metadata.learning_role, 'formula');
    assert.equal(inferred.resolution_status, 'legacy_inferred');

    assert.throws(() => mergeRuntimeNoteBlockTemplateMetadata(db, userId, {
      template_id: 'unknown.template',
    }, 'paragraph'), /Unknown NoteBlock template/);
  });
});

test('template compatibility report classifies runtime, legacy, and missing template blocks', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedSystemTemplateDefinitions(db, userId);
    const definitionTemplate = listTemplateDefinitions(db, userId, { template_key: 'text.paragraph' })[0];

    db.prepare(`
      INSERT INTO note_blocks (
        id, user_id, course_id, block_type, content_json, plain_text, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, '{}', ?, ?, datetime('now'), datetime('now'))
    `).run(uuidv4(), userId, courseId, 'definition', 'Runtime block', JSON.stringify({
      template_definition_id: definitionTemplate.id,
      template_key: 'text.paragraph',
      template_version: '1.0.0',
    }));
    db.prepare(`
      INSERT INTO note_blocks (
        id, user_id, course_id, block_type, content_json, plain_text, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, '{}', ?, ?, datetime('now'), datetime('now'))
    `).run(uuidv4(), userId, courseId, 'formula', 'Legacy inferred block', JSON.stringify({}));
    db.prepare(`
      INSERT INTO note_blocks (
        id, user_id, course_id, block_type, content_json, plain_text, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, '{}', ?, ?, datetime('now'), datetime('now'))
    `).run(uuidv4(), userId, courseId, 'paragraph', 'Missing template block', JSON.stringify({
      template_id: 'missing.template',
    }));

    const report = getTemplateCompatibilityReport(db, userId, { course_id: courseId });

    assert.equal(report.totals.total_blocks, 3);
    assert.equal(report.totals.runtime_resolved, 1);
    assert.equal(report.totals.legacy_inferred, 1);
    assert.equal(report.totals.template_missing, 1);
    assert.equal(report.totals.manual_review_required, 1);
    assert.equal(report.details.some((detail) => detail.status === 'template_missing'), true);
  });
});

test('v2.5.1 template editor copies system templates into user drafts', async () => {
  await withDb((db) => {
    const { userId } = seedUserCourse(db);
    seedSystemTemplateDefinitions(db, userId);
    const systemTemplate = listTemplateDefinitions(db, userId, { template_key: 'text.paragraph' })[0];

    const draft = copyTemplateDefinition(db, userId, systemTemplate.id, {
      template_key: 'definition.custom',
      label: 'Custom Definition',
    });

    assert.equal(draft.origin, 'user');
    assert.equal(draft.is_system, false);
    assert.equal(draft.status, 'draft');
    assert.equal(draft.scope_type, 'global');
    assert.equal(draft.template_key, 'definition.custom');
    assert.equal(draft.label, 'Custom Definition');
    assert.deepEqual(draft.field_schema, systemTemplate.field_schema);
    assert.deepEqual(draft.source_behavior, systemTemplate.source_behavior);
    assert.equal(draft.metadata.copied_from_template_definition_id, systemTemplate.id);

    const original = listTemplateDefinitions(db, userId, { template_key: 'text.paragraph' })[0];
    assert.equal(original.origin, 'system_seed');
    assert.equal(original.is_system, true);
    assert.equal(original.status, 'active');
  });
});

test('v2.5.1 template editor rejects direct system template updates', async () => {
  await withDb((db) => {
    const { userId } = seedUserCourse(db);
    seedSystemTemplateDefinitions(db, userId);
    const systemTemplate = listTemplateDefinitions(db, userId, { template_key: 'text.paragraph' })[0];

    assert.throws(() => updateTemplateDefinition(db, userId, systemTemplate.id, {
      label: 'Edited system definition',
    }), /System templates are read-only/);
  });
});

test('v2.5.1 template editor creates, edits, and activates user drafts', async () => {
  await withDb((db) => {
    const { userId } = seedUserCourse(db);

    const draft = createUserTemplateDefinition(db, userId, {
      template_key: 'concept.research',
      label: 'Research Concept',
      description: 'Concept template for research notes.',
      system_type: 'text',
      learning_role: 'concept',
      field_schema: [
        { key: 'term', label: 'Term', kind: 'text', required: true },
        { key: 'body', label: 'Body', kind: 'textarea', required: true },
      ],
      default_content: { term: '', body: '' },
      summary_for_agent: 'Use for compact concept explanations in research notes.',
    });

    const edited = updateTemplateDefinition(db, userId, draft.id, {
      field_schema: [
        { key: 'term', label: 'Term', kind: 'text', required: true },
        { key: 'body', label: 'Explanation', kind: 'textarea', required: true },
        { key: 'tags', label: 'Tags', kind: 'list', required: false },
      ],
      default_content: { term: '', body: '', tags: [] },
      source_behavior: { source_reference_policy: 'recommended' },
    });
    const active = activateTemplateDefinition(db, userId, draft.id);

    assert.equal(edited.field_schema.length, 3);
    assert.deepEqual(edited.source_behavior, { source_reference_policy: 'recommended' });
    assert.equal(active.status, 'active');
    assert.equal(active.origin, 'user');
  });
});

test('v2.5.1 active templates with usage reject structural edits but allow safe edits', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedSystemTemplateDefinitions(db, userId);
    const systemTemplate = listTemplateDefinitions(db, userId, { template_key: 'text.paragraph' })[0];
    const draft = copyTemplateDefinition(db, userId, systemTemplate.id, {
      template_key: 'definition.used',
      label: 'Used Definition',
    });
    const active = activateTemplateDefinition(db, userId, draft.id);

    db.prepare(`
      INSERT INTO note_blocks (
        id, user_id, course_id, block_type, content_json, plain_text, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, '{}', ?, ?, datetime('now'), datetime('now'))
    `).run(uuidv4(), userId, courseId, 'definition', 'Used runtime block', JSON.stringify({
      template_definition_id: active.id,
      template_key: active.template_key,
      template_version: active.version,
    }));

    assert.throws(() => updateTemplateDefinition(db, userId, active.id, {
      field_schema: [
        { key: 'body', label: 'Changed Body', kind: 'textarea', required: true },
      ],
    }), /proposal_required/);

    const edited = updateTemplateDefinition(db, userId, active.id, {
      label: 'Used Definition Updated',
      summary_for_agent: 'Updated safe summary.',
      render_hints: { reading: { intent: 'definition' } },
    });

    assert.equal(edited.label, 'Used Definition Updated');
    assert.equal(edited.summary_for_agent, 'Updated safe summary.');
    assert.equal(edited.status, 'active');
  });
});

test('v2.5.1 archive rejects templates with usage while deprecate remains resolvable', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedSystemTemplateDefinitions(db, userId);
    const systemTemplate = listTemplateDefinitions(db, userId, { template_key: 'text.paragraph' })[0];
    const draft = copyTemplateDefinition(db, userId, systemTemplate.id, {
      template_key: 'definition.deprecated-user',
      label: 'Deprecated User Definition',
    });
    const active = activateTemplateDefinition(db, userId, draft.id);

    db.prepare(`
      INSERT INTO note_blocks (
        id, user_id, course_id, block_type, content_json, plain_text, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, '{}', ?, ?, datetime('now'), datetime('now'))
    `).run(uuidv4(), userId, courseId, 'definition', 'Deprecated runtime block', JSON.stringify({
      template_definition_id: active.id,
      template_key: active.template_key,
      template_version: active.version,
    }));

    assert.throws(() => archiveTemplateDefinition(db, userId, active.id), /Cannot archive template with existing usage/);

    const deprecated = deprecateTemplateDefinition(db, userId, active.id);
    const resolved = mergeRuntimeNoteBlockTemplateMetadata(db, userId, {
      template_definition_id: active.id,
      template_key: active.template_key,
      template_version: active.version,
    }, 'definition');

    assert.equal(deprecated.status, 'deprecated');
    assert.equal(resolved.metadata.template_definition_id, active.id);
    assert.equal(resolved.metadata.template_resolution_status, 'template_deprecated');
  });
});

test('v2.5.1 template usage counts runtime, key-version, and legacy template references', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedSystemTemplateDefinitions(db, userId);
    const systemTemplate = listTemplateDefinitions(db, userId, { template_key: 'text.paragraph' })[0];
    const draft = copyTemplateDefinition(db, userId, systemTemplate.id, {
      template_key: 'definition.usage',
      label: 'Usage Definition',
    });
    const active = activateTemplateDefinition(db, userId, draft.id);

    const metadataRows = [
      { template_definition_id: active.id, template_key: active.template_key, template_version: active.version },
      { template_key: active.template_key, template_version: active.version },
      { template_id: active.template_key },
    ];

    metadataRows.forEach((metadata, index) => {
      db.prepare(`
        INSERT INTO note_blocks (
          id, user_id, course_id, block_type, content_json, plain_text, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, '{}', ?, ?, datetime('now'), datetime('now'))
      `).run(uuidv4(), userId, courseId, 'definition', `Usage block ${index + 1}`, JSON.stringify(metadata));
    });

    const usage = getTemplateUsage(db, userId, active.id);

    assert.equal(usage.total_blocks, 3);
    assert.equal(usage.runtime_reference_count, 1);
    assert.equal(usage.key_version_reference_count, 2);
    assert.equal(usage.legacy_template_id_count, 1);
  });
});

test('v2.5.1 canvas block insertion accepts runtime user templates', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedSystemTemplateDefinitions(db, userId);
    const systemTemplate = listTemplateDefinitions(db, userId, { template_key: 'text.paragraph' })[0];
    const userTemplate = activateTemplateDefinition(db, userId, copyTemplateDefinition(db, userId, systemTemplate.id, {
      template_key: 'definition.canvas-user',
      label: 'Canvas User Definition',
    }).id);
    const canvas = createLearningCanvas(db, userId, {
      course_id: courseId,
      title: 'Template Runtime Canvas',
    }) as any;

    const result = createCanvasNoteBlock(db, userId, canvas.id, {
      template_id: userTemplate.template_key,
      metadata: {
        template_definition_id: userTemplate.id,
        template_key: userTemplate.template_key,
        template_version: userTemplate.version,
      },
      plain_text: 'A canvas-created runtime definition.',
      content_json: { body: 'A canvas-created runtime definition.' },
      x: 80,
      y: 120,
      width: 320,
      height: 180,
    }) as any;

    assert.equal(result.block.metadata.template_definition_id, userTemplate.id);
    assert.equal(result.block.metadata.template_key, userTemplate.template_key);
    assert.equal(result.block.metadata.taxonomy_version, 'v2.5.0');
    assert.equal(result.canvas_node.node_type, 'note_block');
    assert.equal(result.canvas_node.note_block_id, result.block.id);
  });
});

test('applying an organized note proposal creates a note with blocks, placements, sources, and operation batch', async () => {
  await withDb(async (db) => {
    const { userId, courseId } = seedUserCourse(db);
    const { documentId } = seedParsedDocument(db, userId, courseId);
    const materialMap = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    applyMaterialMapProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(materialMap.id) as any);
    const proposal = await createOrganizedNoteProposal(db, userId, { course_id: courseId }) as any;
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
      .get(proposal.id, userId) as any;

    const result = applyOrganizedNoteProposal(db, userId, proposalRow);

    assert.equal(typeof result.note_id, 'string');
    assert.equal(result.blocks_count > 0, true);
    assert.equal(typeof result.operation_batch_id, 'string');

    const note = db.prepare('SELECT title, source_kind, operation_batch_id FROM notes WHERE id = ?')
      .get(result.note_id) as { title: string; source_kind: string; operation_batch_id: string };
    assert.equal(note.source_kind, 'proposal');
    assert.equal(note.operation_batch_id, result.operation_batch_id);

    const blocks = db.prepare('SELECT id, source_kind, operation_batch_id, metadata FROM note_blocks WHERE user_id = ?')
      .all(userId) as Array<{ id: string; source_kind: string; operation_batch_id: string; metadata: string }>;
    assert.equal(blocks.length, result.blocks_count);
    assert.equal(blocks.every((block) => block.source_kind === 'proposal'), true);
    assert.equal(blocks.every((block) => block.operation_batch_id === result.operation_batch_id), true);
    assert.equal(blocks.every((block) => JSON.parse(block.metadata).taxonomy_version === 'v2.5.0'), true);
    assert.equal(blocks.some((block) => JSON.parse(block.metadata).template_id === 'text.paragraph'), true);

    const placements = db.prepare('SELECT order_index FROM note_block_placements WHERE note_id = ? ORDER BY order_index ASC')
      .all(result.note_id) as Array<{ order_index: number }>;
    assert.deepEqual(placements.map((placement) => placement.order_index), placements.map((_, index) => index));

    const sources = db.prepare('SELECT document_id, metadata FROM note_block_sources')
      .all() as Array<{ document_id: string; metadata: string }>;
    assert.equal(sources.length > 0, true);
    assert.equal(sources.every((source) => source.document_id === documentId), true);
    assert.equal(sources.some((source) => JSON.parse(source.metadata).material_segment_id), true);

    const material = db.prepare('SELECT proposal_status, used_in_note_count FROM source_materials WHERE document_id = ?')
      .get(documentId) as { proposal_status: string; used_in_note_count: number };
    assert.deepEqual(material, { proposal_status: 'note_applied', used_in_note_count: 1 });
  });
});

test('discarding an organized note proposal does not create notes or mutate source materials', async () => {
  await withDb(async (db) => {
    const { userId, courseId } = seedUserCourse(db);
    const { documentId } = seedParsedDocument(db, userId, courseId);
    const materialMap = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    applyMaterialMapProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(materialMap.id) as any);
    const proposal = await createOrganizedNoteProposal(db, userId, { course_id: courseId }) as any;

    db.prepare("UPDATE proposals SET status = 'discarded', resolved_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(proposal.id, userId);

    const notesCount = (db.prepare('SELECT COUNT(*) AS count FROM notes WHERE user_id = ?')
      .get(userId) as { count: number }).count;
    const material = db.prepare('SELECT proposal_status, used_in_note_count FROM source_materials WHERE document_id = ?')
      .get(documentId) as { proposal_status: string; used_in_note_count: number };

    assert.equal(notesCount, 0);
    assert.deepEqual(material, { proposal_status: 'note_proposed', used_in_note_count: 0 });
  });
});

test('material reconciliation proposal groups candidate duplicate and concept evidence without mutating materials', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const firstDoc = seedParsedDocument(db, userId, courseId);
    const secondDoc = seedParsedDocument(db, userId, courseId);
    db.prepare('UPDATE documents SET filename = ? WHERE id = ?').run('organized-note-copy.pdf', secondDoc.documentId);
    db.prepare('UPDATE document_chunks SET content = ?, heading = ? WHERE id = ?')
      .run('Limits describe what a function approaches near an input.', 'Limits', secondDoc.firstChunkId);
    db.prepare('UPDATE document_chunks SET content = ?, heading = ? WHERE id = ?')
      .run('Continuity can also be explained through epsilon and delta conditions.', 'Continuity', secondDoc.secondChunkId);

    const materialsBefore = listCourseMaterials(db, userId, courseId) as any[];
    for (const material of materialsBefore) {
      listMaterialSegments(db, userId, material.id);
    }
    const statusesBefore = db.prepare('SELECT id, proposal_status, segment_status, used_in_note_count FROM source_materials ORDER BY id')
      .all() as any[];

    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;

    assert.equal(proposal.type, 'material_reconciliation');
    assert.equal(proposal.status, 'pending');
    assert.equal(proposal.data.proposal_kind, 'material_reconciliation');
    assert.equal(proposal.data.apply_behavior, 'review_shell_only');
    assert.equal(proposal.data.candidate_groups.some((group: any) => group.group_kind === 'DUPLICATE'), true);
    assert.equal(proposal.data.candidate_groups.some((group: any) => group.group_kind === 'SAME_CONCEPT_EVIDENCE'), true);
    assert.equal(proposal.data.candidate_groups.every((group: any) => group.evidence.length >= 2), true);
    assert.equal(proposal.data.candidate_groups.every((group: any) => group.suggested_action === 'review'), true);

    const statusesAfter = db.prepare('SELECT id, proposal_status, segment_status, used_in_note_count FROM source_materials ORDER BY id')
      .all() as any[];
    assert.deepEqual(statusesAfter, statusesBefore);
  });
});

test('material reconciliation proposal detects same-document page overlap and conflict candidates', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const documentId = uuidv4();
    const rows = [
      { id: uuidv4(), index: 0, heading: 'Continuity', content: 'A function is continuous when nearby inputs keep outputs nearby.', start: 1, end: 3 },
      { id: uuidv4(), index: 1, heading: 'Continuity', content: 'A function is not continuous when nearby inputs create jumps.', start: 2, end: 4 },
    ];
    db.prepare(`
      INSERT INTO documents (
        id, user_id, course_id, filename, file_path, file_type, parse_status,
        extracted_text, page_count, document_type, chunk_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(documentId, userId, courseId, 'continuity-conflict.pdf', 'uploads/continuity-conflict.pdf', 'pdf', 'completed', 'Continuity conflict material', 4, 'slides', rows.length);
    const insertChunk = db.prepare('INSERT INTO document_chunks (id, document_id, chunk_index, content, page_start, page_end, heading) VALUES (?, ?, ?, ?, ?, ?, ?)');
    rows.forEach((row) => insertChunk.run(row.id, documentId, row.index, row.content, row.start, row.end, row.heading));

    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;

    assert.equal(proposal.data.candidate_groups.some((group: any) => group.group_kind === 'OVERLAP'), true);
    assert.equal(proposal.data.candidate_groups.some((group: any) => group.group_kind === 'CONFLICT'), true);
    assert.equal(proposal.data.warnings.includes('v2.2.0 creates review-only reconciliation proposals. Real merge apply is deferred to v2.2.1.'), true);
  });
});

test('material reconciliation proposal includes learning role and template hints', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const firstDoc = seedParsedDocument(db, userId, courseId);
    const secondDoc = seedParsedDocument(db, userId, courseId);
    db.prepare('UPDATE document_chunks SET content = ?, heading = ? WHERE id IN (?, ?)')
      .run(
        'Definition: A limit is the value a function approaches as input approaches a point.',
        'Definition of Limit',
        firstDoc.firstChunkId,
        secondDoc.firstChunkId,
      );
    db.prepare('UPDATE document_chunks SET content = ?, heading = ? WHERE id IN (?, ?)')
      .run(
        'Example: Evaluate the limit of f(x) as x approaches 2.',
        'Limit Example',
        firstDoc.secondChunkId,
        secondDoc.secondChunkId,
      );

    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const definitionGroup = proposal.data.candidate_groups.find((group: any) => group.title.includes('Definition of Limit'));
    assert.ok(definitionGroup);
    assert.equal(definitionGroup.learning_role_candidates[0].learning_role, 'definition');
    assert.equal(definitionGroup.template_candidates[0].template_id, 'text.paragraph');
    assert.equal(definitionGroup.role_confidence > 0.7, true);
    assert.deepEqual(definitionGroup.role_warnings, []);
  });
});

test('material reconciliation role inference falls back to note with warning for weak material', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    seedParsedDocument(db, userId, courseId);

    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const weakGroup = proposal.data.candidate_groups.find((group: any) => group.title.includes('Limits'));
    assert.ok(weakGroup);
    assert.equal(weakGroup.learning_role_candidates[0].learning_role, 'note');
    assert.equal(weakGroup.template_candidates[0].template_id, 'text.paragraph');
    assert.equal(weakGroup.role_warnings.some((warning: string) => warning.includes('No strong learning role signal')), true);
  });
});

test('material reconciliation proposal marks active exclusions and open conflicts as safety blockers', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    seedParsedDocument(db, userId, courseId);
    const initialProposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const group = initialProposal.data.candidate_groups[0];
    const evidence = group.evidence[0];

    db.prepare(`
      INSERT INTO excluded_material_scopes (
        id, user_id, course_id, scope_type, source_fragment_id, reason,
        status, source_proposal_id, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, 'source_fragment', ?, ?, 'active', ?, ?, datetime('now'), datetime('now'))
    `).run(
      uuidv4(),
      userId,
      courseId,
      evidence.source_fragment_id,
      'Testing active exclusion safety block',
      initialProposal.id,
      JSON.stringify({ test: true }),
    );
    db.prepare(`
      INSERT INTO conflict_review_items (
        id, user_id, course_id, proposal_id, group_id, conflict_kind,
        status, title, summary, severity, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'source_disagreement', 'open', ?, ?, 'medium', ?, datetime('now'), datetime('now'))
    `).run(
      uuidv4(),
      userId,
      courseId,
      initialProposal.id,
      group.group_id,
      'Testing open conflict safety block',
      'A prior proposal marked this evidence as unresolved.',
      JSON.stringify({ source_fragment_ids: [evidence.source_fragment_id] }),
    );

    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const blockedGroup = proposal.data.candidate_groups.find((candidate: any) =>
      candidate.evidence.some((item: any) => item.source_fragment_id === evidence.source_fragment_id)
    );
    assert.ok(blockedGroup);
    assert.equal(blockedGroup.blocked_by_safety, true);
    assert.equal(blockedGroup.safety_reasons.some((reason: string) => reason.includes('active exclusion')), true);
    assert.equal(blockedGroup.safety_reasons.some((reason: string) => reason.includes('open conflict')), true);
    assert.equal(blockedGroup.suggested_action, 'defer');
  });
});

test('applying and discarding material reconciliation shell do not merge, delete, or create notes', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    seedParsedDocument(db, userId, courseId);
    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
      .get(proposal.id, userId) as any;
    const before = {
      notes: (db.prepare('SELECT COUNT(*) AS count FROM notes WHERE user_id = ?').get(userId) as any).count,
      blocks: (db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE user_id = ?').get(userId) as any).count,
      materials: db.prepare('SELECT id, proposal_status, segment_status, used_in_note_count FROM source_materials ORDER BY id').all() as any[],
      fragments: (db.prepare('SELECT COUNT(*) AS count FROM source_fragments WHERE user_id = ?').get(userId) as any).count,
      segments: (db.prepare('SELECT COUNT(*) AS count FROM material_segments WHERE user_id = ?').get(userId) as any).count,
    };

    const result = applyMaterialReconciliationProposal(db, userId, proposalRow);

    assert.equal(result.review_shell_only, true);
    assert.equal(typeof result.operation_batch_id, 'string');
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM notes WHERE user_id = ?').get(userId) as any).count, before.notes);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE user_id = ?').get(userId) as any).count, before.blocks);
    assert.deepEqual(db.prepare('SELECT id, proposal_status, segment_status, used_in_note_count FROM source_materials ORDER BY id').all(), before.materials);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_fragments WHERE user_id = ?').get(userId) as any).count, before.fragments);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM material_segments WHERE user_id = ?').get(userId) as any).count, before.segments);

    const discardProposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    db.prepare("UPDATE proposals SET status = 'discarded', resolved_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(discardProposal.id, userId);
    assert.deepEqual(db.prepare('SELECT id, proposal_status, segment_status, used_in_note_count FROM source_materials ORDER BY id').all(), before.materials);
  });
});

test('accepting a material reconciliation group creates an evidence set and evidence items only', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    seedParsedDocument(db, userId, courseId);
    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const duplicateGroup = proposal.data.candidate_groups.find((group: any) => group.group_kind === 'DUPLICATE');
    assert.ok(duplicateGroup);
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
      .get(proposal.id, userId) as any;
    const sourceStateBefore = db.prepare('SELECT id, proposal_status, segment_status, used_in_note_count FROM source_materials ORDER BY id')
      .all() as any[];

    const result = applyMaterialReconciliationProposal(db, userId, proposalRow, {
      group_decisions: [{ group_id: duplicateGroup.group_id, decision: 'accepted_evidence_set' }],
    });

    assert.equal(result.review_shell_only, false);
    assert.equal(result.evidence_sets_created_count, 1);
    assert.equal(result.decisions_count, 1);
    const evidenceSet = db.prepare('SELECT * FROM evidence_sets WHERE source_proposal_id = ?')
      .get(proposal.id) as any;
    assert.equal(evidenceSet.evidence_kind, 'duplicate');
    assert.equal(evidenceSet.source_group_id, duplicateGroup.group_id);
    assert.equal(evidenceSet.status, 'active');
    const evidenceSetMetadata = JSON.parse(evidenceSet.metadata);
    assert.equal(evidenceSetMetadata.learning_role_candidates[0].learning_role, duplicateGroup.learning_role_candidates[0].learning_role);
    assert.equal(evidenceSetMetadata.template_candidates[0].template_id, duplicateGroup.template_candidates[0].template_id);
    assert.equal(typeof evidenceSetMetadata.role_confidence, 'number');

    const evidenceItems = db.prepare('SELECT * FROM evidence_items WHERE evidence_set_id = ? ORDER BY created_at ASC')
      .all(evidenceSet.id) as any[];
    assert.equal(evidenceItems.length, duplicateGroup.evidence.length);
    assert.equal(evidenceItems.every((item) => item.source_fragment_id), true);
    assert.equal(evidenceItems.every((item) => item.document_id), true);

    const decision = db.prepare('SELECT decision, evidence_set_id FROM material_reconciliation_decisions WHERE proposal_id = ?')
      .get(proposal.id) as any;
    assert.deepEqual(decision, { decision: 'accepted_evidence_set', evidence_set_id: evidenceSet.id });
    assert.deepEqual(
      db.prepare('SELECT id, proposal_status, segment_status, used_in_note_count FROM source_materials ORDER BY id').all(),
      sourceStateBefore,
    );
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE user_id = ?').get(userId) as any).count, 0);
  });
});

test('material reconciliation keep separate and defer decisions do not create evidence sets', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    seedParsedDocument(db, userId, courseId);
    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const groups = proposal.data.candidate_groups.slice(0, 2);
    assert.equal(groups.length >= 2, true);
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
      .get(proposal.id, userId) as any;

    const result = applyMaterialReconciliationProposal(db, userId, proposalRow, {
      group_decisions: [
        { group_id: groups[0].group_id, decision: 'kept_separate' },
        { group_id: groups[1].group_id, decision: 'deferred' },
      ],
    });

    assert.equal(result.evidence_sets_created_count, 0);
    assert.equal(result.decisions_count, 2);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM evidence_sets').get() as any).count, 0);
    const decisions = db.prepare('SELECT decision, evidence_set_id FROM material_reconciliation_decisions ORDER BY decision ASC')
      .all() as any[];
    assert.deepEqual(decisions, [
      { decision: 'deferred', evidence_set_id: null },
      { decision: 'kept_separate', evidence_set_id: null },
    ]);
  });
});

test('invalid material reconciliation group decision fails without partial writes', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    seedParsedDocument(db, userId, courseId);
    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
      .get(proposal.id, userId) as any;

    assert.throws(() => applyMaterialReconciliationProposal(db, userId, proposalRow, {
      group_decisions: [{ group_id: uuidv4(), decision: 'accepted_evidence_set' }],
    }), /Unknown reconciliation group id/);

    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM evidence_sets').get() as any).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM evidence_items').get() as any).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM material_reconciliation_decisions').get() as any).count, 0);
  });
});

test('material reconciliation exclusion creates reversible exclusion without mutating source or notes', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    seedParsedDocument(db, userId, courseId);
    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const group = proposal.data.candidate_groups[0];
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
      .get(proposal.id, userId) as any;
    const before = {
      documents: (db.prepare('SELECT COUNT(*) AS count FROM documents WHERE user_id = ?').get(userId) as any).count,
      materials: db.prepare('SELECT id, proposal_status, segment_status, used_in_note_count FROM source_materials ORDER BY id').all() as any[],
      fragments: (db.prepare('SELECT COUNT(*) AS count FROM source_fragments WHERE user_id = ?').get(userId) as any).count,
      segments: (db.prepare('SELECT COUNT(*) AS count FROM material_segments WHERE user_id = ?').get(userId) as any).count,
      notes: (db.prepare('SELECT COUNT(*) AS count FROM notes WHERE user_id = ?').get(userId) as any).count,
      blocks: (db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE user_id = ?').get(userId) as any).count,
    };

    const result = applyMaterialReconciliationProposal(db, userId, proposalRow, {
      group_decisions: [{ group_id: group.group_id, decision: 'excluded' }],
    } as any);

    assert.equal(result.exclusions_created_count, 1);
    assert.equal(result.conflicts_created_count, 0);
    assert.equal(result.evidence_sets_created_count, 0);
    const exclusion = db.prepare('SELECT * FROM excluded_material_scopes WHERE proposal_id = ?')
      .get(proposal.id) as any;
    assert.equal(exclusion.scope_type, 'candidate_group');
    assert.equal(exclusion.status, 'active');
    assert.equal(exclusion.group_id, group.group_id);
    const decision = db.prepare('SELECT decision FROM material_reconciliation_decisions WHERE proposal_id = ?')
      .get(proposal.id) as any;
    assert.equal(decision.decision, 'excluded');
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM documents WHERE user_id = ?').get(userId) as any).count, before.documents);
    assert.deepEqual(db.prepare('SELECT id, proposal_status, segment_status, used_in_note_count FROM source_materials ORDER BY id').all(), before.materials);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_fragments WHERE user_id = ?').get(userId) as any).count, before.fragments);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM material_segments WHERE user_id = ?').get(userId) as any).count, before.segments);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM notes WHERE user_id = ?').get(userId) as any).count, before.notes);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE user_id = ?').get(userId) as any).count, before.blocks);
  });
});

test('material reconciliation conflict creates open conflict review item without evidence set', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    seedParsedDocument(db, userId, courseId);
    const proposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const group = proposal.data.candidate_groups[0];
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
      .get(proposal.id, userId) as any;

    const result = applyMaterialReconciliationProposal(db, userId, proposalRow, {
      group_decisions: [{ group_id: group.group_id, decision: 'mark_conflict' }],
    } as any);

    assert.equal(result.conflicts_created_count, 1);
    assert.equal(result.exclusions_created_count, 0);
    assert.equal(result.evidence_sets_created_count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM evidence_sets').get() as any).count, 0);
    const conflict = db.prepare('SELECT * FROM conflict_review_items WHERE proposal_id = ?')
      .get(proposal.id) as any;
    assert.equal(conflict.group_id, group.group_id);
    assert.equal(conflict.status, 'open');
    assert.equal(conflict.severity, group.group_kind === 'CONFLICT' ? 'high' : 'medium');
    const decision = db.prepare('SELECT decision FROM material_reconciliation_decisions WHERE proposal_id = ?')
      .get(proposal.id) as any;
    assert.equal(decision.decision, 'mark_conflict');
  });
});

test('reconciliation safety recovery actions restore exclusions and resolve or reopen conflicts', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    seedParsedDocument(db, userId, courseId);
    const exclusionProposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const exclusionGroup = exclusionProposal.data.candidate_groups[0];
    const exclusionProposalRow = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
      .get(exclusionProposal.id, userId) as any;
    applyMaterialReconciliationProposal(db, userId, exclusionProposalRow, {
      group_decisions: [{ group_id: exclusionGroup.group_id, decision: 'excluded' }],
    } as any);
    const exclusion = db.prepare('SELECT * FROM excluded_material_scopes WHERE proposal_id = ?')
      .get(exclusionProposal.id) as any;

    const restored = restoreExclusion(db, userId, exclusion.id) as any;
    assert.equal(restored.status, 'restored');
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM reconciliation_recovery_events WHERE event_type = 'restore_exclusion'").get() as any).count, 1);

    const conflictProposal = createMaterialReconciliationProposal(db, userId, { course_id: courseId }) as any;
    const conflictGroup = conflictProposal.data.candidate_groups[0];
    const conflictProposalRow = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
      .get(conflictProposal.id, userId) as any;
    applyMaterialReconciliationProposal(db, userId, conflictProposalRow, {
      group_decisions: [{ group_id: conflictGroup.group_id, decision: 'mark_conflict' }],
    } as any);
    const conflict = db.prepare('SELECT * FROM conflict_review_items WHERE proposal_id = ?')
      .get(conflictProposal.id) as any;

    const resolved = resolveConflict(db, userId, conflict.id) as any;
    assert.equal(resolved.status, 'resolved');
    const reopened = reopenConflict(db, userId, conflict.id) as any;
    assert.equal(reopened.status, 'open');
    const events = db.prepare('SELECT event_type, target_type FROM reconciliation_recovery_events ORDER BY created_at ASC')
      .all() as any[];
    assert.deepEqual(events.map((event) => event.event_type).sort(), ['reopen_conflict', 'resolve_conflict', 'restore_exclusion'].sort());
    assert.equal(events.every((event) => ['excluded_scope', 'conflict_item'].includes(event.target_type)), true);
  });
});

test('creating page and page range source scopes is non-mutating and jumpable', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    listCourseMaterials(db, userId, courseId);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    const snapshot = (listSourceSnapshots(db, userId, courseId) as any[])[0];
    const detail = getSourceSnapshot(db, userId, snapshot.id) as any;
    const beforeSnapshotRows = db.prepare('SELECT * FROM source_snapshots ORDER BY id').all();
    const beforePageRows = db.prepare('SELECT * FROM source_snapshot_pages ORDER BY id').all();

    const pageScope = createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      source_snapshot_page_id: detail.pages[0].id,
      scope_kind: 'page',
      label: 'Limits page',
      page_start: 1,
    }) as any;
    const rangeScope = createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      scope_kind: 'page_range',
      label: 'Continuity range',
      page_start: 3,
      page_end: 4,
    }) as any;

    assert.equal(pageScope.status, 'active');
    assert.equal(pageScope.page_end, 1);
    assert.equal(rangeScope.page_start, 3);
    assert.equal(rangeScope.page_end, 4);
    assert.deepEqual(db.prepare('SELECT * FROM source_snapshots ORDER BY id').all(), beforeSnapshotRows);
    assert.deepEqual(db.prepare('SELECT * FROM source_snapshot_pages ORDER BY id').all(), beforePageRows);

    const jump = getSourceScopeJumpTarget(db, userId, rangeScope.id) as any;
    assert.equal(jump.snapshot.id, snapshot.id);
    assert.equal(jump.focus.page_start, 3);
    assert.equal(jump.focus.page_end, 4);
    assert.equal(jump.pages.some((page: any) => page.page_number === 3), true);
  });
});

test('source scopes support archive restore and anchor scope resolution', async () => {
  await withDb(async (db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    const materialMap = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    applyMaterialMapProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(materialMap.id) as any);
    const noteProposal = await createOrganizedNoteProposal(db, userId, { course_id: courseId }) as any;
    applyOrganizedNoteProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(noteProposal.id) as any);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    generateSourceAnchors(db, userId, { course_id: courseId });
    const anchor = (listSourceAnchors(db, userId, { course_id: courseId }) as any[])[0];

    const scope = createSourceScope(db, userId, {
      course_id: courseId,
      source_anchor_id: anchor.id,
      scope_kind: 'anchor',
      label: 'Anchored source',
    }) as any;

    assert.equal(scope.source_anchor_id, anchor.id);
    const archived = archiveSourceScope(db, userId, scope.id) as any;
    assert.equal(archived.status, 'archived');
    const restored = restoreSourceScope(db, userId, scope.id) as any;
    assert.equal(restored.status, 'active');
    const activeScopes = listSourceScopes(db, userId, { course_id: courseId, status: 'active' }) as any[];
    assert.equal(activeScopes.some((item) => item.id === scope.id), true);
    const jump = getSourceScopeJumpTarget(db, userId, scope.id) as any;
    assert.equal(jump.anchor.id, anchor.id);
    assert.equal(jump.snapshot.id, anchor.source_snapshot_id);
  });
});

test('source scope ids narrow organized note proposals and archived scopes are rejected', async () => {
  await withDb(async (db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    const materialMap = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    applyMaterialMapProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(materialMap.id) as any);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    const snapshot = (listSourceSnapshots(db, userId, courseId) as any[])[0];
    const scope = createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      scope_kind: 'page_range',
      label: 'Continuity only',
      page_start: 3,
      page_end: 4,
    }) as any;

    const proposal = await createOrganizedNoteProposal(db, userId, {
      course_id: courseId,
      source_scope_ids: [scope.id],
      note_title: 'Scoped note',
    } as any) as any;

    assert.deepEqual(proposal.data.source_scope_ids, [scope.id]);
    assert.equal(proposal.data.scope_summary.length, 1);
    assert.equal(proposal.data.segment_ids.length, 1);
    const scopedSegment = db.prepare('SELECT page_start, page_end FROM material_segments WHERE id = ?')
      .get(proposal.data.segment_ids[0]) as any;
    assert.equal(scopedSegment.page_start, 3);
    assert.equal(scopedSegment.page_end, 4);

    archiveSourceScope(db, userId, scope.id);
    await assert.rejects(
      () => createOrganizedNoteProposal(db, userId, {
        course_id: courseId,
        source_scope_ids: [scope.id],
      } as any),
      /Source scope is archived/,
    );
  });
});

test('source boards support multiple course boards and reversible archive state', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const firstBoard = createSourceBoard(db, userId, { course_id: courseId, title: 'Exam sources' }) as any;
    const secondBoard = createSourceBoard(db, userId, { course_id: courseId, title: 'Formula sheet sources' }) as any;

    assert.notEqual(firstBoard.id, secondBoard.id);
    assert.equal(firstBoard.status, 'active');
    assert.equal(secondBoard.title, 'Formula sheet sources');
    assert.equal(listSourceBoards(db, userId, { course_id: courseId, status: 'active' }).length, 2);

    const archived = archiveSourceBoard(db, userId, firstBoard.id) as any;
    assert.equal(archived.status, 'archived');
    assert.equal(listSourceBoards(db, userId, { course_id: courseId, status: 'active' }).length, 1);

    const restored = restoreSourceBoard(db, userId, firstBoard.id) as any;
    assert.equal(restored.status, 'active');
    assert.equal(listSourceBoards(db, userId, { course_id: courseId, status: 'active' }).length, 2);
  });
});

test('source board seeding from source scopes is idempotent and non-mutating', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    listCourseMaterials(db, userId, courseId);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    const snapshot = (listSourceSnapshots(db, userId, courseId) as any[])[0];
    const detail = getSourceSnapshot(db, userId, snapshot.id) as any;
    const activeScope = createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      source_snapshot_page_id: detail.pages[0].id,
      scope_kind: 'page',
      label: 'Limits page',
      page_start: 1,
    }) as any;
    const archivedScope = createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      scope_kind: 'page_range',
      label: 'Archived range',
      page_start: 3,
      page_end: 4,
    }) as any;
    archiveSourceScope(db, userId, archivedScope.id);
    const beforeScopeRows = db.prepare('SELECT * FROM source_scopes ORDER BY id').all();
    const beforeSnapshotRows = db.prepare('SELECT * FROM source_snapshots ORDER BY id').all();
    const board = createSourceBoard(db, userId, { course_id: courseId, title: 'Board seed' }) as any;

    const firstSeed = seedSourceBoardFromScopes(db, userId, board.id) as any;
    const secondSeed = seedSourceBoardFromScopes(db, userId, board.id) as any;
    const nodes = listSourceBoardNodes(db, userId, board.id, { status: 'active' }) as any[];

    assert.equal(firstSeed.nodes_created_count, 1);
    assert.equal(secondSeed.nodes_created_count, 0);
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].source_scope_id, activeScope.id);
    assert.equal(nodes[0].node_type, 'source_scope');
    assert.deepEqual(db.prepare('SELECT * FROM source_scopes ORDER BY id').all(), beforeScopeRows);
    assert.deepEqual(db.prepare('SELECT * FROM source_snapshots ORDER BY id').all(), beforeSnapshotRows);

    const jump = getSourceBoardNodeJumpTarget(db, userId, nodes[0].id) as any;
    assert.equal(jump.scope.id, activeScope.id);
    assert.equal(jump.snapshot.id, snapshot.id);

    const archivedNode = archiveSourceBoardNode(db, userId, nodes[0].id) as any;
    assert.equal(archivedNode.status, 'archived');
    const restoredNode = restoreSourceBoardNode(db, userId, nodes[0].id) as any;
    assert.equal(restoredNode.status, 'active');
  });
});

test('source board ids narrow proposals through active source scope nodes', async () => {
  await withDb(async (db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    const materialMap = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    applyMaterialMapProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(materialMap.id) as any);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    const snapshot = (listSourceSnapshots(db, userId, courseId) as any[])[0];
    const scope = createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      scope_kind: 'page_range',
      label: 'Board continuity range',
      page_start: 3,
      page_end: 4,
    }) as any;
    const board = createSourceBoard(db, userId, { course_id: courseId, title: 'Proposal board' }) as any;
    seedSourceBoardFromScopes(db, userId, board.id);

    const proposal = await createOrganizedNoteProposal(db, userId, {
      course_id: courseId,
      source_board_id: board.id,
      note_title: 'Board scoped note',
    } as any) as any;

    assert.equal(proposal.data.source_board_id, board.id);
    assert.deepEqual(proposal.data.source_scope_ids, [scope.id]);
    assert.equal(proposal.data.scope_summary.length, 1);
    assert.equal(proposal.data.segment_ids.length, 1);
    const scopedSegment = db.prepare('SELECT page_start, page_end FROM material_segments WHERE id = ?')
      .get(proposal.data.segment_ids[0]) as any;
    assert.equal(scopedSegment.page_start, 3);
    assert.equal(scopedSegment.page_end, 4);

    archiveSourceBoard(db, userId, board.id);
    await assert.rejects(
      () => createOrganizedNoteProposal(db, userId, {
        course_id: courseId,
        source_board_id: board.id,
      } as any),
      /Source board is archived/,
    );
  });
});

test('empty source board warns and falls back to course-level proposal behavior', async () => {
  await withDb(async (db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    const materialMap = createMaterialMapProposal(db, userId, { course_id: courseId }) as any;
    applyMaterialMapProposal(db, userId, db.prepare('SELECT * FROM proposals WHERE id = ?').get(materialMap.id) as any);
    const board = createSourceBoard(db, userId, { course_id: courseId, title: 'Empty board' }) as any;

    const proposal = await createOrganizedNoteProposal(db, userId, {
      course_id: courseId,
      source_board_id: board.id,
      note_title: 'Course fallback note',
    } as any) as any;

    assert.equal(proposal.data.source_board_id, board.id);
    assert.deepEqual(proposal.data.source_scope_ids, []);
    assert.equal(proposal.data.segment_ids.length > 1, true);
    assert.equal(proposal.data.warnings.some((warning: string) => warning.includes('Source board has no active source scope nodes')), true);
  });
});

test('learning canvases default to A4 page preset and support reversible archive state', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);

    const canvas = createLearningCanvas(db, userId, { course_id: courseId, title: 'Canvas note' }) as any;

    assert.equal(canvas.title, 'Canvas note');
    assert.equal(canvas.status, 'active');
    assert.equal(canvas.canvas_kind, 'finite');
    assert.equal(canvas.preset, 'page');
    assert.equal(canvas.page_size, 'a4');
    assert.equal(canvas.orientation, 'portrait');
    assert.equal(canvas.width, 794);
    assert.equal(canvas.height, 1123);
    assert.equal(listLearningCanvases(db, userId, { course_id: courseId, status: 'active' }).length, 1);

    const archived = archiveLearningCanvas(db, userId, canvas.id) as any;
    assert.equal(archived.status, 'archived');
    assert.equal(listLearningCanvases(db, userId, { course_id: courseId, status: 'active' }).length, 0);

    const restored = restoreLearningCanvas(db, userId, canvas.id) as any;
    assert.equal(restored.status, 'active');
  });
});

test('learning canvas nodes reference targets without mutating source board nodes', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    listCourseMaterials(db, userId, courseId);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    const snapshot = (listSourceSnapshots(db, userId, courseId) as any[])[0];
    const scope = createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      scope_kind: 'page',
      label: 'Canvas source page',
      page_start: 1,
    }) as any;
    const board = createSourceBoard(db, userId, { course_id: courseId, title: 'Canvas source board' }) as any;
    seedSourceBoardFromScopes(db, userId, board.id);
    const boardNode = (listSourceBoardNodes(db, userId, board.id, { status: 'active' }) as any[])[0];
    const beforeBoardNode = db.prepare('SELECT * FROM source_board_nodes WHERE id = ?').get(boardNode.id);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId }) as any;

    const node = createCanvasNode(db, userId, canvas.id, {
      node_type: 'source_board_node',
      source_board_node_id: boardNode.id,
      x: 24,
      y: 48,
      width: 320,
      height: 180,
    }) as any;

    assert.equal(node.node_type, 'source_board_node');
    assert.equal(node.target_id, boardNode.id);
    assert.equal(node.source_scope_id, scope.id);
    assert.equal(node.x, 24);
    assert.equal(node.y, 48);
    assert.equal(node.width, 320);
    assert.equal(node.height, 180);
    assert.deepEqual(db.prepare('SELECT * FROM source_board_nodes WHERE id = ?').get(boardNode.id), beforeBoardNode);

    assert.equal((listCanvasNodes(db, userId, canvas.id, { status: 'active' }) as any[]).length, 1);

    const jump = getCanvasNodeJumpTarget(db, userId, node.id) as any;
    assert.equal(jump.node.id, node.id);
    assert.equal(jump.scope.id, scope.id);
    assert.equal(jump.snapshot.id, snapshot.id);

    const archivedNode = archiveCanvasNode(db, userId, node.id) as any;
    assert.equal(archivedNode.status, 'archived');
    const restoredNode = restoreCanvasNode(db, userId, node.id) as any;
    assert.equal(restoredNode.status, 'active');
  });
});

test('learning canvas node layout updates persist only projection layout', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    listCourseMaterials(db, userId, courseId);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    const snapshot = (listSourceSnapshots(db, userId, courseId) as any[])[0];
    createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      scope_kind: 'page',
      label: 'Layout source page',
      page_start: 1,
    });
    const board = createSourceBoard(db, userId, { course_id: courseId, title: 'Layout source board' }) as any;
    seedSourceBoardFromScopes(db, userId, board.id);
    const boardNode = (listSourceBoardNodes(db, userId, board.id, { status: 'active' }) as any[])[0];
    const beforeBoardNode = db.prepare('SELECT * FROM source_board_nodes WHERE id = ?').get(boardNode.id);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId }) as any;
    const node = createCanvasNode(db, userId, canvas.id, {
      node_type: 'source_board_node',
      source_board_node_id: boardNode.id,
      x: 10,
      y: 20,
      width: 260,
      height: 140,
    }) as any;

    const updated = updateCanvasNode(db, userId, node.id, {
      x: 144,
      y: 288,
      width: 360,
      height: 220,
    }) as any;

    assert.equal(updated.x, 144);
    assert.equal(updated.y, 288);
    assert.equal(updated.width, 360);
    assert.equal(updated.height, 220);
    assert.deepEqual(db.prepare('SELECT * FROM source_board_nodes WHERE id = ?').get(boardNode.id), beforeBoardNode);

    const persistedNode = (listCanvasNodes(db, userId, canvas.id, { status: 'active' }) as any[])[0];
    assert.equal(persistedNode.x, 144);
    assert.equal(persistedNode.y, 288);
  });
});

test('learning canvas seeding from source boards is idempotent and skips archived board nodes', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    listCourseMaterials(db, userId, courseId);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    const snapshot = (listSourceSnapshots(db, userId, courseId) as any[])[0];
    createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      scope_kind: 'page',
      label: 'Active source page',
      page_start: 1,
    });
    const archivedScope = createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      scope_kind: 'page_range',
      label: 'Archived scope should not seed',
      page_start: 3,
      page_end: 4,
    }) as any;
    archiveSourceScope(db, userId, archivedScope.id);
    const board = createSourceBoard(db, userId, { course_id: courseId, title: 'Canvas seed board' }) as any;
    seedSourceBoardFromScopes(db, userId, board.id);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId }) as any;

    const firstSeed = seedCanvasFromSourceBoard(db, userId, canvas.id, board.id) as any;
    const secondSeed = seedCanvasFromSourceBoard(db, userId, canvas.id, board.id) as any;

    assert.equal(firstSeed.nodes_created_count, 1);
    assert.equal(secondSeed.nodes_created_count, 0);
    assert.equal((listCanvasNodes(db, userId, canvas.id, { status: 'active' }) as any[]).length, 1);

    const seededNode = (listCanvasNodes(db, userId, canvas.id, { status: 'active' }) as any[])[0];
    archiveCanvasNode(db, userId, seededNode.id);
    const restoredSeed = seedCanvasFromSourceBoard(db, userId, canvas.id, board.id) as any;
    assert.equal(restoredSeed.nodes_created_count, 0);
    assert.equal(restoredSeed.nodes_restored_count, 1);
    assert.equal((listCanvasNodes(db, userId, canvas.id, { status: 'active' }) as any[]).length, 1);
    assert.equal((listCanvasNodes(db, userId, canvas.id, { status: 'archived' }) as any[]).length, 0);

    archiveSourceBoard(db, userId, board.id);
    assert.throws(() => seedCanvasFromSourceBoard(db, userId, canvas.id, board.id), /Source board is archived/);
  });
});

test('re-adding an archived canvas node restores the existing projection instead of duplicating it', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    listCourseMaterials(db, userId, courseId);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    const snapshot = (listSourceSnapshots(db, userId, courseId) as any[])[0];
    createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      scope_kind: 'page',
      label: 'Reusable page',
      page_start: 1,
    });
    const board = createSourceBoard(db, userId, { course_id: courseId, title: 'Restore board' }) as any;
    seedSourceBoardFromScopes(db, userId, board.id);
    const boardNode = (listSourceBoardNodes(db, userId, board.id, { status: 'active' }) as any[])[0];
    const canvas = createLearningCanvas(db, userId, { course_id: courseId }) as any;

    const node = createCanvasNode(db, userId, canvas.id, {
      node_type: 'source_board_node',
      source_board_node_id: boardNode.id,
      x: 80,
      y: 120,
    }) as any;

    archiveCanvasNode(db, userId, node.id);
    assert.equal((listCanvasNodes(db, userId, canvas.id, { status: 'active' }) as any[]).length, 0);
    assert.equal((listCanvasNodes(db, userId, canvas.id, { status: 'archived' }) as any[]).length, 1);

    const restored = createCanvasNode(db, userId, canvas.id, {
      node_type: 'source_board_node',
      source_board_node_id: boardNode.id,
      x: 480,
      y: 520,
    }) as any;

    assert.equal(restored.id, node.id);
    assert.equal(restored.status, 'active');
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_nodes WHERE canvas_id = ? AND target_id = ?')
      .get(canvas.id, boardNode.id) as any).count, 1);
    assert.equal((listCanvasNodes(db, userId, canvas.id, { status: 'active' }) as any[]).length, 1);
  });
});

test('learning canvas viewport state is per-user session data', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId }) as any;
    const beforeCanvas = db.prepare('SELECT * FROM learning_canvases WHERE id = ?').get(canvas.id);

    const viewport = updateCanvasViewport(db, userId, canvas.id, {
      zoom: 0.75,
      viewport_x: 120,
      viewport_y: 240,
      metadata: { sidebar: 'source' },
    }) as any;

    assert.equal(viewport.zoom, 0.75);
    assert.equal(viewport.viewport_x, 120);
    assert.equal(viewport.viewport_y, 240);
    assert.deepEqual(viewport.metadata, { sidebar: 'source' });
    assert.deepEqual(db.prepare('SELECT * FROM learning_canvases WHERE id = ?').get(canvas.id), beforeCanvas);
  });
});

test('learning canvas block insertion creates template-aware NoteBlock and CanvasNode projection', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId, title: 'Template canvas' }) as any;

    const result = createCanvasNoteBlock(db, userId, canvas.id, {
      template_id: 'text.paragraph',
      title: 'Derivative definition',
      plain_text: 'A derivative is the instantaneous rate of change.',
      content_json: { body: 'A derivative is the instantaneous rate of change.' },
      x: 128,
      y: 192,
      width: 340,
      height: 180,
    }) as any;

    assert.equal(result.note.course_id, courseId);
    assert.equal(result.note.metadata.purpose, 'canvas_backing_note');
    assert.equal(result.note.metadata.canvas_id, canvas.id);

    assert.equal(result.block.block_type, 'paragraph');
    assert.equal(result.block.title, 'Derivative definition');
    assert.equal(result.block.plain_text, 'A derivative is the instantaneous rate of change.');
    assert.equal(result.block.metadata.template_id, 'text.paragraph');
    assert.equal(result.block.metadata.system_type, 'text');
    assert.equal(result.block.metadata.learning_role, 'note');
    assert.equal(result.block.metadata.taxonomy_version, 'v2.5.0');

    const placement = db.prepare('SELECT * FROM note_block_placements WHERE note_id = ? AND block_id = ?')
      .get(result.note.id, result.block.id) as any;
    assert.equal(placement.order_index, 0);

    assert.equal(result.canvas_node.node_type, 'note_block');
    assert.equal(result.canvas_node.target_id, result.block.id);
    assert.equal(result.canvas_node.note_block_id, result.block.id);
    assert.equal(result.canvas_node.title, 'Derivative definition');
    assert.equal(result.canvas_node.x, 128);
    assert.equal(result.canvas_node.y, 192);
    assert.equal(result.canvas_node.width, 340);
    assert.equal(result.canvas_node.height, 180);

    const nodes = listCanvasNodes(db, userId, canvas.id, { status: 'active' }) as any[];
    assert.equal(nodes.some((node: any) => node.id === result.canvas_node.id), true);
  });
});

test('learning canvas block insertion reuses backing note for repeated inserts', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId, title: 'Repeated insert canvas' }) as any;

    const first = createCanvasNoteBlock(db, userId, canvas.id, {
      template_id: 'text.paragraph',
      plain_text: 'First example',
      content_json: { body: 'First example' },
    }) as any;
    const second = createCanvasNoteBlock(db, userId, canvas.id, {
      template_id: 'formula.math',
      plain_text: 'f(x)=x^2',
      content_json: { body: 'f(x)=x^2' },
      x: 420,
      y: 88,
    }) as any;

    assert.equal(first.note.id, second.note.id);
    const noteCount = db.prepare('SELECT COUNT(*) AS count FROM notes WHERE user_id = ? AND course_id = ?').get(userId, courseId) as any;
    const blockCount = db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE user_id = ? AND course_id = ?').get(userId, courseId) as any;
    const nodeCount = db.prepare('SELECT COUNT(*) AS count FROM canvas_nodes WHERE user_id = ? AND course_id = ? AND node_type = ?').get(userId, courseId, 'note_block') as any;
    assert.equal(noteCount.count, 1);
    assert.equal(blockCount.count, 2);
    assert.equal(nodeCount.count, 2);
    assert.equal(second.block.metadata.template_id, 'formula.math');
    assert.equal(second.block.block_type, 'formula');
  });
});

test('learning canvas block insertion rejects unknown templates without partial rows', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId }) as any;

    const beforeNotes = db.prepare('SELECT COUNT(*) AS count FROM notes').get() as any;
    const beforeBlocks = db.prepare('SELECT COUNT(*) AS count FROM note_blocks').get() as any;
    const beforeNodes = db.prepare('SELECT COUNT(*) AS count FROM canvas_nodes').get() as any;

    assert.throws(() => createCanvasNoteBlock(db, userId, canvas.id, {
      template_id: 'unknown.template',
      plain_text: 'Should not be created',
      content_json: { body: 'Should not be created' },
    } as any), /Unknown NoteBlock template/);

    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM notes').get() as any).count, beforeNotes.count);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks').get() as any).count, beforeBlocks.count);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_nodes').get() as any).count, beforeNodes.count);
  });
});

test('canvas layout proposal plans existing and missing source board nodes without mutating on create', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    seedParsedDocument(db, userId, courseId);
    listCourseMaterials(db, userId, courseId);
    generateSourceSnapshots(db, userId, { course_id: courseId });
    const snapshot = (listSourceSnapshots(db, userId, courseId) as any[])[0];
    createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      scope_kind: 'page',
      label: 'Layout page 1',
      page_start: 1,
    });
    createSourceScope(db, userId, {
      course_id: courseId,
      source_snapshot_id: snapshot.id,
      scope_kind: 'page_range',
      label: 'Layout pages 2-3',
      page_start: 2,
      page_end: 3,
    });
    const board = createSourceBoard(db, userId, { course_id: courseId, title: 'Layout board' }) as any;
    seedSourceBoardFromScopes(db, userId, board.id);
    const boardNodes = listSourceBoardNodes(db, userId, board.id, { status: 'active' }) as any[];
    const canvas = createLearningCanvas(db, userId, { course_id: courseId, title: 'Layout proposal canvas' }) as any;
    const existingNode = createCanvasNode(db, userId, canvas.id, {
      node_type: 'source_board_node',
      source_board_node_id: boardNodes[0].id,
      x: 12,
      y: 24,
      width: 260,
      height: 140,
    }) as any;

    const beforeNodes = db.prepare('SELECT COUNT(*) AS count FROM canvas_nodes WHERE canvas_id = ?').get(canvas.id) as any;
    const beforeFrames = db.prepare('SELECT COUNT(*) AS count FROM canvas_frames WHERE canvas_id = ?').get(canvas.id) as any;
    const beforeBoardRows = db.prepare('SELECT COUNT(*) AS count FROM source_board_nodes WHERE source_board_id = ?').get(board.id) as any;
    const beforeNotes = db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE user_id = ?').get(userId) as any;

    const proposal = createCanvasLayoutProposal(db, userId, {
      course_id: courseId,
      canvas_id: canvas.id,
      source_board_id: board.id,
      layout_goal: 'a4_reading',
    }) as any;

    assert.equal(proposal.type, 'canvas_layout');
    assert.equal(proposal.data.proposal_kind, 'canvas_layout');
    assert.equal(proposal.data.apply_behavior, 'layout_records_only');
    assert.equal(proposal.data.node_layouts.length, 2);
    assert.equal(proposal.data.node_layouts.filter((layout: any) => layout.action === 'update_layout').length, 1);
    assert.equal(proposal.data.node_layouts.filter((layout: any) => layout.action === 'create_node').length, 1);
    assert.equal(proposal.data.node_layouts.some((layout: any) => layout.canvas_node_id === existingNode.id), true);
    assert.equal(proposal.data.frames.length, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_nodes WHERE canvas_id = ?').get(canvas.id) as any).count, beforeNodes.count);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_frames WHERE canvas_id = ?').get(canvas.id) as any).count, beforeFrames.count);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_board_nodes WHERE source_board_id = ?').get(board.id) as any).count, beforeBoardRows.count);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE user_id = ?').get(userId) as any).count, beforeNotes.count);

    const storedProposal = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?').get(proposal.id, userId) as any;
    const applyResult = applyCanvasLayoutProposal(db, userId, storedProposal) as any;

    assert.equal(applyResult.nodes_updated_count, 1);
    assert.equal(applyResult.nodes_created_count, 1);
    assert.equal(applyResult.frames_created_count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_nodes WHERE canvas_id = ? AND status = ?').get(canvas.id, 'active') as any).count, 2);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_frames WHERE canvas_id = ? AND status = ?').get(canvas.id, 'active') as any).count, 1);
    const updatedExisting = db.prepare('SELECT * FROM canvas_nodes WHERE id = ?').get(existingNode.id) as any;
    assert.notEqual(updatedExisting.x, 12);
    assert.equal(updatedExisting.metadata.includes('canvas_layout_proposal'), true);
    const createdNode = db.prepare('SELECT * FROM canvas_nodes WHERE canvas_id = ? AND source_board_node_id = ?')
      .get(canvas.id, boardNodes[1].id) as any;
    assert.equal(createdNode.node_type, 'source_board_node');
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks WHERE user_id = ?').get(userId) as any).count, beforeNotes.count);
  });
});

test('canvas layout proposal rejects empty and cross-course inputs without partial writes', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const otherCourseId = uuidv4();
    db.prepare(`
      INSERT INTO courses (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, 'Other course', datetime('now'), datetime('now'))
    `).run(otherCourseId, userId);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId }) as any;
    const otherBoard = createSourceBoard(db, userId, { course_id: otherCourseId, title: 'Other board' }) as any;
    const beforeProposalCount = db.prepare('SELECT COUNT(*) AS count FROM proposals').get() as any;

    assert.throws(() => createCanvasLayoutProposal(db, userId, {
      course_id: courseId,
      canvas_id: canvas.id,
    } as any), /No canvas layout objects/);

    assert.throws(() => createCanvasLayoutProposal(db, userId, {
      course_id: courseId,
      canvas_id: canvas.id,
      source_board_id: otherBoard.id,
    } as any), /different course/);

    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM proposals').get() as any).count, beforeProposalCount.count);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_nodes WHERE canvas_id = ?').get(canvas.id) as any).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_frames WHERE canvas_id = ?').get(canvas.id) as any).count, 0);
  });
});

test('v2.5.2 migration creates composition template tables', async () => {
  await withDb((db) => {
    const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    assert.equal(tableNames.includes('composition_templates'), true);
    assert.equal(tableNames.includes('composition_instances'), true);
    assert.equal(tableNames.includes('composition_instance_slots'), true);
  });
});

test('v2.5.2 seeds system composition templates and validates slot references', async () => {
  await withDb((db) => {
    const { userId } = seedUserCourse(db);

    const firstSeed = seedSystemCompositionTemplates(db, userId);
    const secondSeed = seedSystemCompositionTemplates(db, userId);
    const templates = listCompositionTemplates(db, userId, {});
    const report = getCompositionTemplateCompatibilityReport(db, userId) as any;

    assert.equal(firstSeed.length >= 6, true);
    assert.equal(secondSeed.length, firstSeed.length);
    assert.equal(templates.some((item: any) => item.composition_key === 'formula_sheet.basic'), true);
    assert.equal(templates.some((item: any) => item.composition_key === 'theorem_proof_example.basic'), true);
    assert.equal(report.invalid_slot_reference_count, 0);
    assert.equal(report.templates_checked >= 6, true);
  });
});

test('v2.5.2 composition proposal previews without mutating content or canvas records', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId }) as any;
    const composition = seedSystemCompositionTemplates(db, userId)
      .find((item: any) => item.composition_key === 'theorem_proof_example.basic') as any;
    const beforeRows = {
      notes: (db.prepare('SELECT COUNT(*) AS count FROM notes').get() as any).count,
      blocks: (db.prepare('SELECT COUNT(*) AS count FROM note_blocks').get() as any).count,
      nodes: (db.prepare('SELECT COUNT(*) AS count FROM canvas_nodes').get() as any).count,
      frames: (db.prepare('SELECT COUNT(*) AS count FROM canvas_frames').get() as any).count,
      instances: (db.prepare('SELECT COUNT(*) AS count FROM composition_instances').get() as any).count,
    };

    const proposal = createCompositionTemplateProposal(db, userId, {
      course_id: courseId,
      canvas_id: canvas.id,
      composition_template_id: composition.id,
      layout_goal: 'a4_section',
      slot_inputs: [
        { slot_key: 'theorem', plain_text: 'If a function is differentiable, then it is continuous.' },
        { slot_key: 'proof', plain_text: 'Use the limit definition of derivative to show continuity.' },
        { slot_key: 'example', plain_text: 'The polynomial x^2 is differentiable and continuous.' },
      ],
    }) as any;

    assert.equal(proposal.type, 'composition_template');
    assert.equal(proposal.data.proposal_kind, 'composition_template');
    assert.equal(proposal.data.apply_behavior, 'create_new_content_and_projection_records_only');
    assert.equal(proposal.data.slot_plan.filter((slot: any) => slot.status === 'filled').length, 3);
    assert.equal(proposal.data.relation_blueprint_suggestions.length > 0, true);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM notes').get() as any).count, beforeRows.notes);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks').get() as any).count, beforeRows.blocks);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_nodes').get() as any).count, beforeRows.nodes);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_frames').get() as any).count, beforeRows.frames);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM composition_instances').get() as any).count, beforeRows.instances);
  });
});

test('v2.5.2 applying composition proposal creates new blocks, canvas records, and slot history only', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId }) as any;
    const composition = seedSystemCompositionTemplates(db, userId)
      .find((item: any) => item.composition_key === 'theorem_proof_example.basic') as any;
    const proposal = createCompositionTemplateProposal(db, userId, {
      course_id: courseId,
      canvas_id: canvas.id,
      composition_template_id: composition.id,
      slot_inputs: [
        { slot_key: 'theorem', plain_text: 'Every convergent sequence is bounded.' },
        { slot_key: 'proof', plain_text: 'Convergence gives a finite tail bound and the head is finite.' },
        { slot_key: 'example', plain_text: 'The sequence 1/n is convergent and bounded.' },
      ],
    }) as any;
    const proposalRow = db.prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
      .get(proposal.id, userId) as any;
    const retiredRelationTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'object_relations'").get();
    assert.equal(retiredRelationTable, undefined);

    const result = applyCompositionTemplateProposal(db, userId, proposalRow) as any;

    assert.equal(result.blocks_created_count, 3);
    assert.equal(result.canvas_nodes_created_count, 3);
    assert.equal(typeof result.composition_instance_id, 'string');
    assert.equal(typeof result.canvas_frame_id, 'string');

    const instance = db.prepare('SELECT * FROM composition_instances WHERE id = ?')
      .get(result.composition_instance_id) as any;
    assert.equal(instance.composition_key, 'theorem_proof_example.basic');
    assert.equal(instance.canvas_id, canvas.id);
    assert.equal(instance.source_proposal_id, proposal.id);

    const slots = db.prepare('SELECT * FROM composition_instance_slots WHERE composition_instance_id = ? ORDER BY slot_index ASC')
      .all(result.composition_instance_id) as any[];
    assert.equal(slots.length, 3);
    assert.equal(slots.every((slot) => slot.status === 'filled'), true);
    assert.equal(slots.every((slot) => Boolean(slot.note_block_id) && Boolean(slot.canvas_node_id)), true);

    const backingNote = db.prepare(`
      SELECT n.note_class
      FROM notes n
      JOIN note_block_placements p ON p.note_id = n.id
      WHERE p.block_id = ?
    `).get(slots[0].note_block_id) as any;
    assert.equal(backingNote.note_class, 'system');

    const createdBlock = db.prepare('SELECT metadata FROM note_blocks WHERE id = ?')
      .get(slots[0].note_block_id) as any;
    const metadata = JSON.parse(createdBlock.metadata);
    assert.equal(metadata.composition_template_id, composition.id);
    assert.equal(metadata.composition_instance_id, result.composition_instance_id);
    assert.equal(metadata.template_key, 'text.paragraph');
  });
});

test('v2.5.2 partial composition proposal records skipped slots and discard is non-mutating', async () => {
  await withDb((db) => {
    const { userId, courseId } = seedUserCourse(db);
    const canvas = createLearningCanvas(db, userId, { course_id: courseId }) as any;
    const composition = seedSystemCompositionTemplates(db, userId)
      .find((item: any) => item.composition_key === 'source_quote_interpretation.basic') as any;
    const proposal = createCompositionTemplateProposal(db, userId, {
      course_id: courseId,
      canvas_id: canvas.id,
      composition_template_id: composition.id,
      partial_slot_keys: ['interpretation'],
      slot_inputs: [
        { slot_key: 'source_quote', plain_text: 'Original source sentence.' },
      ],
    }) as any;

    assert.equal(proposal.data.slot_plan.some((slot: any) => slot.slot_key === 'interpretation' && slot.status === 'skipped'), true);
    assert.equal(proposal.data.warnings.some((warning: string) => warning.includes('interpretation')), true);

    db.prepare("UPDATE proposals SET status = 'discarded', resolved_at = datetime('now') WHERE id = ? AND user_id = ?")
      .run(proposal.id, userId);

    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_blocks').get() as any).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_nodes').get() as any).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM composition_instances').get() as any).count, 0);
  });
});
