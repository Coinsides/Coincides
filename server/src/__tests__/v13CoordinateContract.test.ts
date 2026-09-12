import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AddressInfo } from 'node:net';
import Database from 'better-sqlite3';
import express from 'express';
import { PDFDocument } from 'pdf-lib';
import { initDb, closeDb } from '../db/init.js';
import coordinateContractMigration from '../db/migrations/056_v13_coordinate_contract.js';
import { readCoordinateContract } from '../services/coordinateContract.js';
import canvasObjectRoutes from '../routes/canvasObjects.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import { materializeSourceNow } from '../services/sourceMaterialization.js';
import type { SourceArtifact } from '../services/sourceArtifact.js';
import { A4_PAGE_GEOMETRY } from '../../../shared/types/pageGeometry.js';

test('coordinate metadata migration only adds an empty table and preserves placements', () => {
  const db = new Database(':memory:');
  try {
    db.exec(`
      CREATE TABLE canvas_placements (id TEXT PRIMARY KEY, x REAL, y REAL, metadata TEXT);
      INSERT INTO canvas_placements VALUES ('synthetic', 152, 1335, '{"coordinate_space":"canvas_world"}');
    `);
    const before = db.prepare('SELECT * FROM canvas_placements').all();
    coordinateContractMigration.up(db);
    coordinateContractMigration.up(db);
    assert.deepEqual(db.prepare('SELECT * FROM canvas_placements').all(), before);
    assert.deepEqual(db.prepare('SELECT * FROM database_meta').all(), []);
    assert.equal(readCoordinateContract(db), 'v1');
  } finally {
    db.close();
  }
});

test('coordinate contract reads default v1 and explicit versions without writing or caching', () => {
  const db = new Database(':memory:');
  try {
    coordinateContractMigration.up(db);
    const readWithoutWrites = () => {
      const before = db.prepare('SELECT total_changes() AS count').get();
      const value = readCoordinateContract(db);
      assert.deepEqual(db.prepare('SELECT total_changes() AS count').get(), before);
      return value;
    };
    assert.equal(readWithoutWrites(), 'v1');
    db.prepare('INSERT INTO database_meta (key, value) VALUES (?, ?)')
      .run('coordinate_contract', 'v2');
    assert.equal(readWithoutWrites(), 'v2');
    db.prepare('UPDATE database_meta SET value = ? WHERE key = ?')
      .run('v1', 'coordinate_contract');
    assert.equal(readWithoutWrites(), 'v1');
    db.prepare('UPDATE database_meta SET value = ? WHERE key = ?')
      .run('unsupported', 'coordinate_contract');
    assert.throws(() => readCoordinateContract(db), /Unsupported database coordinate contract/);
  } finally {
    db.close();
  }
});

async function withSyntheticDb(
  run: (context: {
    db: Database.Database;
    sourceRootDir: string;
    canvasAssetRootDir: string;
  }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-coordinate-contract-'));
  try {
    const db = await initDb(':memory:');
    await run({
      db,
      sourceRootDir: join(dir, 'sources'),
      canvasAssetRootDir: join(dir, 'canvas-assets'),
    });
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

test('canvas coordinate endpoint returns the database contract without mutating it', async () => {
  await withSyntheticDb(async ({ db }) => {
    const app = express();
    // Production mounts this same router behind authMiddleware in index.ts.
    app.use('/api/canvas-objects', canvasObjectRoutes);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server.once('listening', resolve));
    try {
      const address = server.address() as AddressInfo;
      const url = `http://127.0.0.1:${address.port}/api/canvas-objects/coordinate-contract`;
      for (const expected of ['v1', 'v2']) {
        if (expected === 'v2') {
          db.prepare('INSERT INTO database_meta (key, value) VALUES (?, ?)')
            .run('coordinate_contract', 'v2');
        }
        const before = db.prepare('SELECT total_changes() AS count').get();
        const response = await fetch(url);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.deepEqual(await response.json(), { coordinate_contract: expected });
        assert.deepEqual(db.prepare('SELECT total_changes() AS count').get(), before);
      }
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});

test('Source v2 publication writes full-axis content-local placements aligned with v1 on both frames', async () => {
  await withSyntheticDb(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const userId = 'coordinate-contract-user';
    const courseId = 'coordinate-contract-course';
    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)')
      .run(userId, 'coordinate-contract@example.test', 'synthetic-hash', 'Synthetic User');
    db.prepare('INSERT INTO courses (id, user_id, name) VALUES (?, ?, ?)')
      .run(courseId, userId, 'Synthetic Course');
    mkdirSync(join(sourceRootDir, '.tmp'), { recursive: true });

    const artifact: SourceArtifact = {
      schema_version: 'source-artifact.v1',
      artifact_kind: 'document',
      parser_key: 'native-pdf',
      parser_version: '2.4.5',
      blocks: ['First frame first', 'First frame second', 'Second frame first', 'Second frame second']
        .map((text, index) => ({
          artifact_block_id: `block-${index}`,
          kind: 'text',
          text,
          writing_role: 'paragraph',
          page_index: Math.floor(index / 2) + 1,
          locator: { page_index: Math.floor(index / 2) + 1, block_index: index % 2 },
          metadata: {},
        })),
      metadata: {},
    };
    interface PlacementRow {
      x: number; y: number; width: number; height: number;
      frame_id: string; metadata: string;
      frame_x: number; frame_y: number; content_inset_json: string;
    }
    const publish = async (version: 'v1' | 'v2') => {
      const path = join(sourceRootDir, '.tmp', `${version}.upload`);
      const pdf = await PDFDocument.create();
      pdf.setTitle(`Synthetic ${version} source`);
      pdf.addPage();
      pdf.addPage();
      const contents = Buffer.from(await pdf.save());
      writeFileSync(path, contents);
      const uploaded = await intakeSourceTempFile(db, userId, {
        course_id: courseId,
        origin_entry_kind: 'project_upload',
        file: { path, originalname: `${version}.pdf`, mimetype: 'application/pdf', size: contents.length },
      }, { rootDir: sourceRootDir });
      const result = await materializeSourceNow(db, userId, uploaded.source.id, {
        sourceRootDir,
        canvasAssetRootDir,
        parseArtifact: async () => artifact,
      });
      assert.equal(result.status, 'materialized', result.error_message || result.error_code || undefined);
      return db.prepare(`
        SELECT p.x, p.y, p.width, p.height, p.frame_id, p.metadata,
          fp.x AS frame_x, fp.y AS frame_y, f.content_inset_json
        FROM canvas_placements p
        JOIN canvas_objects o ON o.id = p.object_id AND o.kind = 'paragraph_block_projection'
        JOIN page_frame_extensions f ON f.frame_id = p.frame_id
          AND f.note_id = p.note_id AND f.user_id = p.user_id
        JOIN canvas_placements fp ON fp.object_id = f.object_id
          AND fp.note_id = f.note_id AND fp.user_id = f.user_id
        WHERE p.note_id = ?
        ORDER BY p.z_index
      `).all(result.projection_note_id) as PlacementRow[];
    };

    const v1 = await publish('v1');
    const firstPageY = 80 + A4_PAGE_GEOMETRY.contentInset.top;
    const secondPageY = firstPageY + A4_PAGE_GEOMETRY.height + 36;
    const worldX = 80 + A4_PAGE_GEOMETRY.contentInset.left;
    assert.deepEqual(v1.map(({ x, y }) => [x, y]), [
      [worldX, firstPageY], [worldX, firstPageY + 90],
      [worldX, secondPageY], [worldX, secondPageY + 90],
    ]);
    assert.ok(v1.every((row) => JSON.parse(row.metadata).layout_policy.coordinate_space === 'canvas_world'));
    db.prepare('INSERT INTO database_meta (key, value) VALUES (?, ?)').run('coordinate_contract', 'v2');
    const v2 = await publish('v2');
    assert.deepEqual(v2.map(({ x, y }) => [x, y]), [[0, 0], [0, 90], [0, 0], [0, 90]]);
    assert.ok(v2.every((row) => JSON.parse(row.metadata).layout_policy.coordinate_space === 'page_frame_local'));
    assert.deepEqual(v2.map((row) => {
      const inset = JSON.parse(row.content_inset_json);
      return [row.frame_id.split(':').pop(), row.x + row.frame_x + inset.left, row.y + row.frame_y + inset.top, row.width, row.height];
    }), v1.map((row) => [row.frame_id.split(':').pop(), row.x, row.y, row.width, row.height]));
  });
});

test('Source image publication preserves v1 metadata and writes aligned local coordinates in v2', async () => {
  await withSyntheticDb(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const image = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const worldRects: number[][] = [];
    mkdirSync(join(sourceRootDir, '.tmp'), { recursive: true });
    for (const version of ['v1', 'v2'] as const) {
      const userId = `image-${version}-user`;
      const courseId = `image-${version}-course`;
      db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)')
        .run(userId, `${version}@example.test`, 'synthetic-hash', 'Synthetic Image User');
      db.prepare('INSERT INTO courses (id, user_id, name) VALUES (?, ?, ?)')
        .run(courseId, userId, 'Synthetic Image Course');
      db.prepare('INSERT OR REPLACE INTO database_meta (key, value) VALUES (?, ?)')
        .run('coordinate_contract', version);
      const path = join(sourceRootDir, '.tmp', `${version}.upload`);
      writeFileSync(path, image);
      const uploaded = await intakeSourceTempFile(db, userId, {
        course_id: courseId,
        origin_entry_kind: 'project_upload',
        file: { path, originalname: 'pixel.png', mimetype: 'image/png', size: image.length },
      }, { rootDir: sourceRootDir });
      const result = await materializeSourceNow(db, userId, uploaded.source.id, {
        sourceRootDir, canvasAssetRootDir,
      });
      assert.equal(result.status, 'materialized', result.error_message || result.error_code || undefined);
      const row = db.prepare(`
        SELECT p.x, p.y, p.width, p.height, p.metadata,
          fp.x AS frame_x, fp.y AS frame_y, f.content_inset_json
        FROM canvas_placements p
        JOIN canvas_objects o ON o.id = p.object_id AND o.kind = 'image'
        JOIN page_frame_extensions f ON f.frame_id = p.frame_id
          AND f.note_id = p.note_id AND f.user_id = p.user_id
        JOIN canvas_placements fp ON fp.object_id = f.object_id
          AND fp.note_id = f.note_id AND fp.user_id = f.user_id
        WHERE p.note_id = ?
      `).get(result.projection_note_id) as {
        x: number; y: number; width: number; height: number; metadata: string;
        frame_x: number; frame_y: number; content_inset_json: string;
      };
      if (version === 'v1') {
        assert.deepEqual([row.x, row.y], [80 + A4_PAGE_GEOMETRY.contentInset.left, 80 + A4_PAGE_GEOMETRY.contentInset.top]);
        assert.equal(row.metadata, '{"placement_kind":"source_image"}');
        worldRects.push([row.x, row.y, row.width, row.height]);
      } else {
        assert.deepEqual([row.x, row.y], [0, 0]);
        assert.deepEqual(JSON.parse(row.metadata), {
          placement_kind: 'source_image', layout_policy: { coordinate_space: 'page_frame_local' },
        });
        const inset = JSON.parse(row.content_inset_json);
        worldRects.push([row.x + row.frame_x + inset.left, row.y + row.frame_y + inset.top, row.width, row.height]);
      }
    }
    assert.deepEqual(worldRects[1], worldRects[0]);
  });
});
