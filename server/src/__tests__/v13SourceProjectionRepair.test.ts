import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import type Database from 'better-sqlite3';
import { A4_PAGE_GEOMETRY } from '../../../shared/types/pageGeometry.js';
import { initDb, closeDb } from '../db/init.js';
import type { SourceArtifact, SourceArtifactBlock } from '../services/sourceArtifact.js';
import { getSourceMaterializationFile, intakeSourceTempFile } from '../services/sourceFileIntake.js';
import { publishSourceProjection } from '../services/sourceProjectionMaterializer.js';
import { stripSourcePageFurniture } from '../services/sourcePageFurniture.js';
import { readCoordinateContract } from '../services/coordinateContract.js';

function block(id: string, pageIndex: number | null, text: string, heading = false): SourceArtifactBlock {
  return {
    artifact_block_id: id,
    kind: 'text',
    text,
    writing_role: heading ? 'heading' : 'paragraph',
    page_index: pageIndex,
    locator: { page_index: pageIndex, artifact_block_id: id },
    metadata: {},
  };
}

function artifact(blocks: SourceArtifactBlock[], pageCount?: number, parserKey = 'native-pdf'): SourceArtifact {
  return {
    schema_version: 'source-artifact.v1',
    artifact_kind: 'document',
    parser_key: parserKey,
    parser_version: 'synthetic-v1',
    blocks,
    metadata: pageCount === undefined ? {} : { page_count: pageCount },
  };
}

async function withDb(run: (db: Database.Database, storage: string) => Promise<void>) {
  const root = mkdtempSync(join(tmpdir(), 'coincides-srcproj-13-6-'));
  try {
    const db = await initDb(':memory:');
    db.prepare('INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)')
      .run('projection-user', 'projection@example.test', 'synthetic', 'Synthetic projection');
    db.prepare('INSERT INTO courses (id, user_id, name) VALUES (?, ?, ?)')
      .run('projection-course', 'projection-user', 'Synthetic project');
    db.prepare('INSERT INTO database_meta (key, value) VALUES (?, ?)').run('coordinate_contract', 'v2');
    assert.equal(readCoordinateContract(db), 'v2');
    await run(db, root);
  } finally {
    closeDb();
    // Only this fixture's verified temporary directory may be recursively removed.
    assert.ok(resolve(root).startsWith(`${resolve(tmpdir())}${sep}`));
    assert.ok(root.split(sep).pop()?.startsWith('coincides-srcproj-13-6-'));
    rmSync(root, { recursive: true, force: true });
  }
}

let fixtureSequence = 0;
async function source(db: Database.Database, root: string, displayName = 'Synthetic.pdf') {
  fixtureSequence += 1;
  const temporary = join(root, '.tmp', `${fixtureSequence}.upload`);
  mkdirSync(join(root, '.tmp'), { recursive: true });
  const contents = `Synthetic source ${fixtureSequence}`;
  writeFileSync(temporary, contents);
  const intake = await intakeSourceTempFile(db, 'projection-user', {
    course_id: 'projection-course', origin_entry_kind: 'project_upload',
    file: { path: temporary, originalname: 'synthetic.txt', mimetype: 'text/plain', size: Buffer.byteLength(contents) },
  }, { rootDir: root, now: new Date('2026-09-01T12:34:56Z') });
  db.prepare('UPDATE source_records SET display_name = ?, created_at = ? WHERE id = ?')
    .run(displayName, '2026-09-01T12:34:56Z', intake.source.id);
  const file = getSourceMaterializationFile(db, 'projection-user', intake.source.id, { rootDir: root });
  db.prepare("UPDATE source_materializations SET status = 'publishing' WHERE id = ?")
    .run(file.materialization_id);
  return file;
}

function frames(db: Database.Database, noteId: string) {
  return db.prepare(`
    SELECT f.frame_id, f.page_index, f.content_inset_json, f.typography_json,
      json_extract(f.metadata, '$.source_page_index') AS source_page_index,
      p.x, p.y, p.width, p.height
    FROM page_frame_extensions f JOIN canvas_placements p ON p.object_id = f.object_id
    WHERE f.note_id = ? ORDER BY f.page_index
  `).all(noteId) as Array<{
    frame_id: string; page_index: number; source_page_index: number | null;
    content_inset_json: string; typography_json: string;
    x: number; y: number; width: number; height: number;
  }>;
}

function placements(db: Database.Database, noteId: string) {
  return db.prepare(`
    SELECT b.id, b.plain_text, b.title, b.block_type,
      json_extract(b.metadata, '$.artifact_block_id') AS artifact_block_id,
      json_extract(b.metadata, '$.source_page_index') AS source_page_index,
      p.frame_id, p.x, p.y, p.width, p.height, p.metadata
    FROM note_blocks b JOIN content_mounts m ON m.target_id = b.id AND m.target_kind = 'note_block'
    JOIN canvas_placements p ON p.object_id = m.object_id
    WHERE m.note_id = ? ORDER BY p.z_index
  `).all(noteId) as Array<{
    id: string; plain_text: string; title: string | null; block_type: string; artifact_block_id: string;
    source_page_index: number | null; frame_id: string; x: number; y: number;
    width: number; height: number; metadata: string;
  }>;
}

test('five original pages persist exactly five shared-A4 frames with page-local blocks', async () => {
  await withDb(async (db, root) => {
    const input = artifact(Array.from({ length: 5 }, (_, index) =>
      block(`page-${index + 1}`, index + 1, `Unique body for original page ${index + 1}`)), 5);
    const file = await source(db, root);
    const result = publishSourceProjection(db, file, input);
    const pages = frames(db, result.projection_note_id);
    assert.equal(pages.length, 5);
    assert.deepEqual(pages.map((page) => page.source_page_index), [1, 2, 3, 4, 5]);
    for (const page of pages) {
      assert.equal(page.width, A4_PAGE_GEOMETRY.width);
      assert.equal(page.height, A4_PAGE_GEOMETRY.height);
      const inset = JSON.parse(page.content_inset_json);
      assert.equal(inset.top, A4_PAGE_GEOMETRY.contentInset.top);
      assert.equal(inset.right, A4_PAGE_GEOMETRY.contentInset.right);
      assert.equal(inset.bottom, A4_PAGE_GEOMETRY.contentInset.bottom);
      assert.equal(inset.left, A4_PAGE_GEOMETRY.contentInset.left);
      assert.equal(page.width - inset.left - inset.right, A4_PAGE_GEOMETRY.contentWidth);
      assert.ok(page.frame_id.endsWith(`:source-page-${page.source_page_index}`));
    }
    for (const row of placements(db, result.projection_note_id)) {
      assert.equal(row.frame_id, pages[row.source_page_index! - 1].frame_id);
      assert.equal(row.x, 0);
      assert.equal(row.y, A4_PAGE_GEOMETRY.contentInset.top);
      assert.equal(row.width, A4_PAGE_GEOMETRY.contentWidth);
      assert.equal(JSON.parse(row.metadata).layout_policy.coordinate_space, 'page_frame_local');
    }
  });
});

test('a tall block and accumulated blocks grow one frame and place the next original page below it', async () => {
  await withDb(async (db, root) => {
    const result = publishSourceProjection(db, await source(db, root), artifact([
      block('tall', 1, Array.from({ length: 100 }, (_, index) => `Tall line ${index}`).join('\n')),
      ...Array.from({ length: 20 }, (_, index) => block(`extra-${index}`, 1, `Extra paragraph ${index}`)),
      block('second', 2, 'Second original page'),
    ], 2));
    const pages = frames(db, result.projection_note_id);
    const rows = placements(db, result.projection_note_id);
    assert.equal(pages.length, 2);
    assert.ok(rows[0].height > A4_PAGE_GEOMETRY.height);
    assert.ok(pages[0].height > rows[0].height);
    assert.equal(pages[0].height,
      rows[20].y + rows[20].height + JSON.parse(pages[0].content_inset_json).top + JSON.parse(pages[0].content_inset_json).bottom);
    assert.equal(pages[1].y, pages[0].y + pages[0].height + 36);
    assert.ok(rows.slice(0, 21).every((row) => row.frame_id === pages[0].frame_id));
    assert.equal(rows[21].frame_id, pages[1].frame_id);
  });
});

test('flow joins the previous original page, leading flow joins the first, and empty pages survive', async () => {
  await withDb(async (db, root) => {
    const result = publishSourceProjection(db, await source(db, root), artifact([
      block('leading-flow', null, 'Leading flow'),
      block('third', 3, 'Third original page'),
      block('after-third', null, 'Third page flow tail'),
      block('furniture-only', 4, '— 4 —'),
      block('after-fourth', null, 'Fourth page flow tail'),
    ], 5));
    const pages = frames(db, result.projection_note_id);
    const rows = placements(db, result.projection_note_id);
    assert.equal(pages.length, 5);
    assert.deepEqual(rows.map((row) => row.frame_id), [pages[0].frame_id, pages[2].frame_id, pages[2].frame_id, pages[3].frame_id]);
    assert.equal(JSON.parse(pages[3].typography_json).source_page_furniture[0].original_text, '— 4 —');
  });
});

test('native PDF furniture is removed only from matching lines and its exact raw text/rules are persisted', async () => {
  await withDb(async (db, root) => {
    const input = artifact(Array.from({ length: 5 }, (_, index) => {
      const p = index + 1;
      return [
        block(`header-${p}`, p, `  Repeated\t  header  \nFirst body on page ${p}`),
        block(`near-top-${p}`, p, `Near top ${p}`),
        block(`interior-${p}`, p, `Repeated header\nInterior unique ${p}`),
        block(`near-bottom-${p}`, p, `Near bottom ${p}`),
        block(`footer-${p}`, p, `Last body on page ${p}\n— Page ${p} of 5 —`),
      ];
    }).flat(), 5);
    const original = structuredClone(input);
    const result = publishSourceProjection(db, await source(db, root), input);
    assert.deepEqual(input, original, 'Publication never mutates the original artifact');
    const pages = frames(db, result.projection_note_id);
    const rows = placements(db, result.projection_note_id);
    assert.equal(rows.length, 25);
    for (const page of pages) {
      const receipts = JSON.parse(page.typography_json).source_page_furniture;
      assert.equal(receipts.length, 2);
      assert.equal(receipts[0].original_text, '  Repeated\t  header  ');
      assert.deepEqual(receipts[0].rules, ['repeated_page_edge']);
      assert.deepEqual(receipts[1].rules, ['page_number']);
      assert.equal(receipts[1].line_index, 1);
    }
    assert.ok(rows.filter((row) => row.artifact_block_id.startsWith('interior-'))
      .every((row) => row.plain_text.startsWith('Repeated header\n')));
    assert.ok(rows.filter((row) => row.artifact_block_id.startsWith('header-'))
      .every((row) => row.plain_text.startsWith('First body on page')));
    assert.ok(rows.every((row) => !row.plain_text.includes('Page ')));
  });
});

test('furniture repetition counts distinct pages, uses ceil(60%), and retains non-page-number prose', () => {
  const input = artifact([
    ...[1, 2, 3].flatMap((page) => [
      block(`header-${page}`, page, 'Only three pages'),
      block(`duplicate-${page}`, page, 'Only three pages'),
      block(`body-${page}`, page, `Page ${page} discusses 2026 results`),
    ]),
    ...[4, 5, 6].map((page) => block(`body-${page}`, page, `Unique page ${page}`)),
  ], 6);
  const result = stripSourcePageFurniture(input);
  assert.deepEqual(result.blocks, input.blocks);
  assert.equal(result.furnitureByPage.size, 0);
});

test('decorated number, English page total, and Chinese page-number formats leave receipts', () => {
  const samples = ['12', '— 2 —', 'Page 3 of 10', '第4页', '（第5页）'];
  const result = stripSourcePageFurniture(artifact(samples.map((text, index) => block(`p-${index}`, index + 1, text)), 5));
  assert.equal(result.blocks.length, 0);
  assert.deepEqual([...result.furnitureByPage.values()].map((rows) => rows[0].original_text), samples);
  assert.ok([...result.furnitureByPage.values()].every((rows) => rows[0].rules.includes('page_number')));
});

test('single-page native PDF never strips page numbers or repeated text', () => {
  const input = artifact([block('a', 1, 'Repeated'), block('b', 1, 'Repeated'), block('c', 1, '1')], 1);
  const result = stripSourcePageFurniture(input);
  assert.deepEqual(result.blocks, input.blocks);
  assert.equal(result.furnitureByPage.size, 0);
});

test('MinerU and markdown artifacts keep all repeated lines and page numbers untouched', () => {
  for (const parserKey of ['mineru', 'native-text']) {
    const input = artifact([1, 2, 3].map((page) => block(`${page}`, page, `Repeated header\n${page}`)), 3, parserKey);
    const result = stripSourcePageFurniture(input);
    assert.equal(result.blocks, input.blocks);
    assert.equal(result.furnitureByPage.size, 0);
  }
});

test('heading block_type/title and cover metadata persist known suffix removal and original import date', async () => {
  await withDb(async (db, root) => {
    for (const [displayName, expectedTitle] of [
      ['Notes (2).PDF', 'Notes (2)'],
      ['Archive.chapter.md', 'Archive.chapter'],
      ['Known.markdown', 'Known'],
      ['Keep.unknown', 'Keep.unknown'],
    ]) {
      const result = publishSourceProjection(db, await source(db, root, displayName), artifact([
        block('heading', null, 'Actual heading text', true), block('body', null, 'Body paragraph'),
      ], undefined, 'native-text'), { now: new Date('2026-10-12T00:00:00Z') });
      assert.deepEqual(db.prepare('SELECT title, description FROM notes WHERE id = ?').get(result.projection_note_id), {
        title: expectedTitle, description: '源文档 · 1 页 · 导入于 2026-09-01',
      });
      const rows = placements(db, result.projection_note_id);
      assert.deepEqual(rows.map((row) => [row.block_type, row.title]), [['heading', 'Actual heading text'], ['paragraph', null]]);
    }
  });
});

test('block and frame identities remain stable across nested publication and distinct between source files', async () => {
  await withDb(async (db, root) => {
    const input = artifact([block('same-artifact-id', 3, 'Stable identity')]);
    const firstSource = await source(db, root);
    const captured: Array<{ noteId: string; blockId: string; frameId: string }> = [];
    const rollback = new Error('Rollback synthetic capture');
    for (let attempt = 0; attempt < 2; attempt += 1) {
      assert.throws(() => db.transaction(() => {
        const result = publishSourceProjection(db, firstSource, input);
        captured.push({ noteId: result.projection_note_id, blockId: placements(db, result.projection_note_id)[0].id,
          frameId: frames(db, result.projection_note_id)[0].frame_id });
        throw rollback;
      })(), (error) => error === rollback);
    }
    assert.equal(captured[0].blockId, captured[1].blockId);
    assert.equal(captured[0].frameId, captured[1].frameId);
    assert.notEqual(captured[0].noteId, captured[1].noteId);
    assert.ok(captured[0].frameId.endsWith(':source-page-3'));
    const second = publishSourceProjection(db, await source(db, root), input);
    assert.notEqual(placements(db, second.projection_note_id)[0].id, captured[0].blockId);
    assert.notEqual(frames(db, second.projection_note_id)[0].frame_id, captured[0].frameId);
  });
});
