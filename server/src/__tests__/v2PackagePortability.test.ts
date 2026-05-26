import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import {
  applyPackageImport,
  buildPackageExportPreview,
  buildPackageImportPreview,
  createPackageExport,
  discardPackageImportPreview,
} from '../services/packagePortability.js';
import {
  listDomainBlockSets,
  listPackageManifests,
  seedSystemDomainPackages,
} from '../services/domainPackages.js';
import { listTemplateDefinitions } from '../services/templateDefinitions.js';

async function withDb(run: (db: Awaited<ReturnType<typeof initDb>>) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-v255-'));
  const dbPath = join(dir, 'test.db');

  try {
    const db = await initDb(dbPath);
    await run(db);
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedUser(db: Awaited<ReturnType<typeof initDb>>) {
  const userId = uuidv4();
  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
    .run(userId, `${userId}@example.com`, 'hash', 'Package User');
  return { userId };
}

test('v2.5.5 package portability migration creates export/import tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    for (const tableName of [
      'package_exports',
      'package_import_previews',
      'package_import_records',
      'package_import_record_items',
    ]) {
      assert.equal(tableNames.includes(tableName), true, `${tableName} should exist`);
    }
  });
});

test('v2.5.5 light export preview includes runtime package objects and excludes sources', async () => {
  await withDb((db) => {
    const { userId } = seedUser(db);
    const seed = seedSystemDomainPackages(db, userId);

    const preview = buildPackageExportPreview(db, userId, {
      package_manifest_id: seed.package_manifests[0].id,
      package_level: 'light',
      source_inclusion: 'omit',
    });

    assert.equal(preview.bundle.package_level, 'light');
    assert.equal(preview.bundle.source_inclusion, 'omit');
    assert.equal(preview.summary.template_count > 0, true);
    assert.equal(preview.summary.composition_count > 0, true);
    assert.equal(preview.summary.domain_set_count, 3);
    assert.equal(preview.bundle.contents.source_references.length, 0);
    assert.equal(preview.bundle.contents.source_snapshots.length, 0);
    assert.equal(preview.blockers.length, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM package_exports').get() as any).count, 0);
  });
});

test('v2.5.5 trusted export can include source snapshot text as recovery material', async () => {
  await withDb((db) => {
    const { userId } = seedUser(db);
    const seed = seedSystemDomainPackages(db, userId);
    const courseId = uuidv4();
    const documentId = uuidv4();
    const snapshotId = uuidv4();
    const pageId = uuidv4();

    db.prepare("INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, 'Portability Course', datetime('now'), datetime('now'))")
      .run(courseId, userId);
    db.prepare("INSERT INTO documents (id, user_id, course_id, filename, file_path, file_type, file_size, parse_status, created_at, updated_at) VALUES (?, ?, ?, 'source.pdf', '/tmp/source.pdf', 'application/pdf', 100, 'completed', datetime('now'), datetime('now'))")
      .run(documentId, userId, courseId);
    db.prepare(`INSERT INTO source_snapshots (
      id, user_id, course_id, document_id, snapshot_kind, status, title, source_filename,
      page_count, chunk_count, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'parsed_pages', 'ready', 'Source', 'source.pdf', 1, 0, '{}', datetime('now'), datetime('now'))`)
      .run(snapshotId, userId, courseId, documentId);
    db.prepare(`INSERT INTO source_snapshot_pages (
      id, user_id, course_id, source_snapshot_id, document_id, page_number, page_label,
      text_content, chunk_ids, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, 'p.1', 'trusted snapshot text', '[]', '{}', datetime('now'), datetime('now'))`)
      .run(pageId, userId, courseId, snapshotId, documentId);

    const preview = buildPackageExportPreview(db, userId, {
      package_manifest_id: seed.package_manifests[0].id,
      package_level: 'trusted',
      source_inclusion: 'snapshot_text',
    });

    assert.equal(preview.bundle.package_level, 'trusted');
    assert.equal(preview.bundle.source_inclusion, 'snapshot_text');
    assert.equal(preview.bundle.contents.source_snapshots.length, 1);
    assert.equal(preview.bundle.contents.source_snapshots[0]!.pages![0]!.text_content, 'trusted snapshot text');
    assert.equal(preview.warnings.some((warning) => warning.includes('recovery material')), true);
  });
});

test('v2.5.5 export creates stable JSON bundle and content hash', async () => {
  await withDb((db) => {
    const { userId } = seedUser(db);
    const seed = seedSystemDomainPackages(db, userId);

    const exported = createPackageExport(db, userId, {
      package_manifest_id: seed.package_manifests[0].id,
      package_level: 'light',
      source_inclusion: 'omit',
    });

    assert.equal(exported.status, 'exported');
    assert.equal(exported.bundle.integrity.content_hash.startsWith('sha256:'), true);
    assert.equal(exported.bundle.package_format, 'coincides.package.bundle');
    assert.equal(exported.bundle.contents.template_definitions.length > 0, true);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM package_exports').get() as any).count, 1);
  });
});

test('v2.5.5 import preview blocks same key/version with different content', async () => {
  await withDb((db) => {
    const { userId } = seedUser(db);
    const seed = seedSystemDomainPackages(db, userId);
    const exported = createPackageExport(db, userId, {
      package_manifest_id: seed.package_manifests[0].id,
      package_level: 'light',
      source_inclusion: 'omit',
    });
    const mutated = structuredClone(exported.bundle);
    mutated.contents.template_definitions[0].label = 'Conflicting Label';
    mutated.integrity.content_hash = 'sha256:tampered';

    const preview = buildPackageImportPreview(db, userId, { bundle: mutated });

    assert.equal(preview.validation_status, 'blocked');
    assert.equal(preview.blockers.some((blocker) => blocker.includes('conflicts with existing template')), true);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM package_import_records').get() as any).count, 0);
  });
});

test('v2.5.5 import apply imports missing runtime objects without overwriting existing objects', async () => {
  await withDb((db) => {
    const { userId: sourceUserId } = seedUser(db);
    const { userId: targetUserId } = seedUser(db);
    const seed = seedSystemDomainPackages(db, sourceUserId);
    const exported = createPackageExport(db, sourceUserId, {
      package_manifest_id: seed.package_manifests[0].id,
      package_level: 'light',
      source_inclusion: 'omit',
    });

    const beforeTemplates = listTemplateDefinitions(db, targetUserId, {}).length;
    const preview = buildPackageImportPreview(db, targetUserId, { bundle: exported.bundle });
    const result = applyPackageImport(db, targetUserId, preview.id);
    const afterTemplates = listTemplateDefinitions(db, targetUserId, {}).length;
    const targetDomains = listDomainBlockSets(db, targetUserId, {});

    assert.equal(preview.validation_status, 'valid');
    assert.equal(result.imported_count > 0, true);
    assert.equal(result.operation_batch_id.length > 0, true);
    assert.equal(afterTemplates > beforeTemplates, true);
    assert.equal(targetDomains.some((domain) => domain.domain_key === 'learning.math.basic'), true);
    assert.equal(listPackageManifests(db, targetUserId, {}).some((manifest) => manifest.package_key === 'coincides.core.domain-seeds'), true);

    const secondPreview = buildPackageImportPreview(db, targetUserId, { bundle: exported.bundle });
    const secondResult = applyPackageImport(db, targetUserId, secondPreview.id);
    assert.equal(secondResult.imported_count, 0);
    assert.equal(secondResult.resolved_existing_count > 0, true);
  });
});

test('v2.5.5 discard import preview mutates only preview status', async () => {
  await withDb((db) => {
    const { userId } = seedUser(db);
    const seed = seedSystemDomainPackages(db, userId);
    const exported = createPackageExport(db, userId, {
      package_manifest_id: seed.package_manifests[0].id,
      package_level: 'light',
      source_inclusion: 'omit',
    });
    const preview = buildPackageImportPreview(db, userId, { bundle: exported.bundle });

    const discarded = discardPackageImportPreview(db, userId, preview.id);

    assert.equal(discarded.status, 'discarded');
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM package_import_records').get() as any).count, 0);
  });
});
