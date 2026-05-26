import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import {
  getDomainBlockSetCompatibilityReport,
  getPackageManifestPreview,
  listDomainBlockSets,
  listPackageManifests,
  previewPackageManifestInput,
  seedSystemDomainPackages,
} from '../services/domainPackages.js';

async function withDb(run: (db: Awaited<ReturnType<typeof initDb>>) => void | Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-v253-'));
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
    .run(userId, `${userId}@example.com`, 'hash', 'Domain User');
  return { userId };
}

test('v2.5.3 domain package migration creates additive package tables', async () => {
  await withDb((db) => {
    const tableNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row: any) => row.name);

    for (const tableName of [
      'package_manifests',
      'domain_block_sets',
      'domain_block_set_templates',
      'domain_block_set_compositions',
    ]) {
      assert.equal(tableNames.includes(tableName), true, `${tableName} should exist`);
    }
  });
});

test('v2.5.3 system domain package seed is idempotent and resolves memberships', async () => {
  await withDb((db) => {
    const { userId } = seedUser(db);

    const first = seedSystemDomainPackages(db, userId);
    const second = seedSystemDomainPackages(db, userId);
    const packages = listPackageManifests(db, userId, {});
    const domains = listDomainBlockSets(db, userId, {});

    assert.equal(first.package_manifests.length, 1);
    assert.equal(second.package_manifests.length, 1);
    assert.equal(packages.length, 1);
    assert.equal(packages[0].package_key, 'coincides.core.domain-seeds');
    assert.equal(packages[0].validation_status, 'valid');
    assert.equal(domains.length, 3);
    assert.equal(domains.some((domain) => domain.domain_key === 'learning.math.basic'), true);
    assert.equal(domains.every((domain) => domain.template_count > 0), true);
    assert.equal(domains.every((domain) => domain.composition_count > 0), true);
  });
});

test('v2.5.3 package preview summarizes contents without mutating records', async () => {
  await withDb((db) => {
    const { userId } = seedUser(db);
    const seed = seedSystemDomainPackages(db, userId);
    const beforeCount = (db.prepare('SELECT COUNT(*) AS count FROM package_manifests').get() as any).count;

    const preview = getPackageManifestPreview(db, userId, seed.package_manifests[0].id);
    const afterCount = (db.prepare('SELECT COUNT(*) AS count FROM package_manifests').get() as any).count;

    assert.equal(beforeCount, afterCount);
    assert.equal(preview.validation_status, 'valid');
    assert.equal(preview.domain_sets.length, 3);
    assert.equal(preview.template_count > 0, true);
    assert.equal(preview.composition_count > 0, true);
    assert.deepEqual(preview.blockers, []);
  });
});

test('v2.5.3 raw package preview blocks executable or secret-like manifests', async () => {
  await withDb((db) => {
    const { userId } = seedUser(db);

    const preview = previewPackageManifestInput(db, userId, {
      package_key: 'unsafe.package',
      version: '0.1.0',
      manifest_version: 'v2.5.3',
      package_kind: 'domain_block_set',
      package_name: 'Unsafe Package',
      trust: {
        contains_executable_code: true,
      },
      contents: {
        provider_api_key: 'secret-looking-value',
      },
    });

    assert.equal(preview.validation_status, 'blocked');
    assert.equal(preview.blockers.some((blocker) => blocker.includes('Executable')), true);
    assert.equal(preview.blockers.some((blocker) => blocker.includes('secret')), true);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM package_manifests').get() as any).count, 0);
  });
});

test('v2.5.3 domain compatibility report catches missing required references', async () => {
  await withDb((db) => {
    const { userId } = seedUser(db);
    seedSystemDomainPackages(db, userId);
    const domain = listDomainBlockSets(db, userId, { domain_key: 'learning.math.basic' })[0];

    db.prepare(`
      INSERT INTO domain_block_set_templates (
        id, user_id, domain_block_set_id, template_definition_id, template_key,
        template_version, member_role, required, order_index, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', datetime('now'), datetime('now'))
    `).run(uuidv4(), userId, domain.id, null, 'missing.template', '1.0.0', 'missing', 1, 999);

    const report = getDomainBlockSetCompatibilityReport(db, userId, domain.id);

    assert.equal(report.validation_status, 'blocked');
    assert.equal(report.blockers.some((blocker) => blocker.includes('missing.template')), true);
    assert.equal(report.template_count > 0, true);
  });
});
