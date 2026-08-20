import assert from 'node:assert/strict';
import test from 'node:test';
import Database from 'better-sqlite3';

import {
  canonicalImmediateEmptyTextUnit,
  canonicalJson,
  canonicalParagraphTemplateMetadata,
  parseCliOptions,
  planSurfaceUpdates,
} from './v2Bn12LifecycleMigration.ts';

const emptyImmediateTextUnit = {
  body: '',
  text_flow: {
    textflow_version: 'TextBlockContentV1',
    units: [{
      id: 'tu-1',
      text: '',
      writing_role: 'paragraph',
      indent_level: 0,
      order_index: 0,
      metadata: {},
      status: 'active',
    }],
    inline_structures: [],
    metadata: { creation_mode: 'immediate_text_unit' },
  },
};

const paragraphTemplateMetadata = {
  template_definition_id: '26ac5633-4c82-41a9-af44-578e378a7fae',
  template_key: 'text.paragraph',
  template_version: '1.0.0',
  template_id: 'text.paragraph',
  system_type: 'text',
  learning_role: 'note',
  template_resolution_status: 'runtime_resolved',
  taxonomy_version: 'v2.5.0',
};

test('canonical JSON recursively sorts object keys', () => {
  assert.equal(
    canonicalJson({ z: 1, a: { y: 2, x: 1 } }),
    '{\n  "a": {\n    "x": 1,\n    "y": 2\n  },\n  "z": 1\n}\n',
  );
});

test('ghost content accepts only the exact empty immediate TextUnit fingerprint', () => {
  assert.deepEqual(canonicalImmediateEmptyTextUnit(emptyImmediateTextUnit), {
    matches: true,
    reasons: [],
  });
  assert.equal(canonicalImmediateEmptyTextUnit({
    ...emptyImmediateTextUnit,
    body: 'meaningful',
  }).matches, false);
  assert.equal(canonicalImmediateEmptyTextUnit({
    ...emptyImmediateTextUnit,
    source: { id: 'source-1' },
  }).matches, false);
});

test('ghost metadata is an exact paragraph-template allowlist', () => {
  assert.equal(canonicalParagraphTemplateMetadata(paragraphTemplateMetadata), true);
  assert.equal(canonicalParagraphTemplateMetadata({
    ...paragraphTemplateMetadata,
    history: [],
  }), false);
  assert.equal(canonicalParagraphTemplateMetadata({
    ...paragraphTemplateMetadata,
    template_key: 'text.heading',
  }), false);
});

test('apply is impossible without an expected dry-run plan hash', () => {
  assert.throws(() => parseCliOptions(['--apply']), /--apply requires --expect-plan/);
  assert.throws(
    () => parseCliOptions(['--apply', '--expect-plan', 'not-a-hash']),
    /64-character SHA-256/,
  );
  const parsed = parseCliOptions(['--apply', '--expect-plan', 'a'.repeat(64)]);
  assert.equal(parsed.mode, 'apply');
  assert.equal(parsed.expectPlan, 'a'.repeat(64));
});

test('surface migration writes the authoritative PageFrame id and repairs the v1 object-id receipt', () => {
  const db = new Database(':memory:');
  try {
    db.exec(`
      CREATE TABLE note_blocks (id TEXT PRIMARY KEY, status TEXT NOT NULL);
      CREATE TABLE canvas_objects (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL
      );
      CREATE TABLE canvas_placements (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        object_id TEXT NOT NULL,
        x REAL NOT NULL,
        width REAL NOT NULL,
        frame_id TEXT,
        surface TEXT NOT NULL,
        boundary_role TEXT NOT NULL,
        metadata TEXT NOT NULL
      );
      CREATE TABLE content_mounts (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        object_id TEXT NOT NULL,
        target_kind TEXT NOT NULL,
        target_id TEXT NOT NULL
      );
      CREATE TABLE page_frame_extensions (
        note_id TEXT NOT NULL,
        object_id TEXT NOT NULL,
        frame_id TEXT NOT NULL,
        content_inset_json TEXT NOT NULL
      );
    `);

    const noteId = 'note-authoritative-frame';
    const frameId = 'primary-page-frame';
    const frameObjectId = `canvas-object:${noteId}:page-frame:${frameId}`;
    db.prepare(`
      INSERT INTO canvas_objects (id, note_id, kind, status)
      VALUES (?, ?, 'page_frame', 'active')
    `).run(frameObjectId, noteId);
    db.prepare(`
      INSERT INTO canvas_placements (
        id, note_id, object_id, x, width, frame_id, surface, boundary_role, metadata
      ) VALUES (?, ?, ?, 0, 904, ?, 'formal_page', 'inside', '{}')
    `).run(`canvas-placement:${noteId}:page-frame:${frameId}`, noteId, frameObjectId, frameId);
    db.prepare(`
      INSERT INTO page_frame_extensions (note_id, object_id, frame_id, content_inset_json)
      VALUES (?, ?, ?, ?)
    `).run(noteId, frameObjectId, frameId, JSON.stringify({ top: 0, right: 72, bottom: 96, left: 72 }));

    const legacyMetadata = JSON.stringify({
      layout_policy: { export_role: null, ai_visibility: null, width_mode: null },
    });
    const worldMetadata = JSON.stringify({
      layout_policy: {
        ai_visibility: null,
        coordinate_space: 'canvas_world',
        export_role: null,
        width_mode: null,
      },
    });
    const fixtures = [
      { id: 'fresh-inside', x: 72, surface: 'canvas_workspace', role: 'outside', oldFrameId: null, metadata: legacyMetadata },
      { id: 'fresh-crossing', x: 14, surface: 'canvas_workspace', role: 'outside', oldFrameId: null, metadata: legacyMetadata },
      { id: 'repair-inside', x: 72, surface: 'formal_page', role: 'inside', oldFrameId: frameObjectId, metadata: worldMetadata },
      { id: 'repair-crossing', x: 414, surface: 'canvas_workspace', role: 'crossing', oldFrameId: frameObjectId, metadata: worldMetadata },
      { id: 'legacy-formal-local', x: 0, surface: 'formal_page', role: 'inside', oldFrameId: null, metadata: legacyMetadata },
    ];
    const insertBlock = db.prepare("INSERT INTO note_blocks (id, status) VALUES (?, 'active')");
    const insertObject = db.prepare(`
      INSERT INTO canvas_objects (id, note_id, kind, status)
      VALUES (?, ?, 'paragraph_block_projection', 'active')
    `);
    const insertPlacement = db.prepare(`
      INSERT INTO canvas_placements (
        id, note_id, object_id, x, width, frame_id, surface, boundary_role, metadata
      ) VALUES (?, ?, ?, ?, 760, ?, ?, ?, ?)
    `);
    const insertMount = db.prepare(`
      INSERT INTO content_mounts (id, note_id, object_id, target_kind, target_id)
      VALUES (?, ?, ?, 'note_block', ?)
    `);
    for (const fixture of fixtures) {
      const blockId = `block-${fixture.id}`;
      const objectId = `canvas-object:${noteId}:block:${fixture.id}`;
      insertBlock.run(blockId);
      insertObject.run(objectId, noteId);
      insertPlacement.run(fixture.id, noteId, objectId, fixture.x, fixture.oldFrameId,
        fixture.surface, fixture.role, fixture.metadata);
      insertMount.run(`mount-${fixture.id}`, noteId, objectId, blockId);
    }

    const plan = planSurfaceUpdates(db, new Set());
    assert.deepEqual(plan.updates.map((update) => update.placementId), [
      'fresh-crossing',
      'fresh-inside',
      'repair-crossing',
      'repair-inside',
    ]);
    assert.equal(plan.scans.some((scan) => scan.placementId === 'legacy-formal-local'), false);
    for (const update of plan.updates) {
      assert.equal(update.next.frameId, frameId);
      assert.equal(update.pageBoundary?.frameId, frameId);
      assert.equal(update.pageBoundary?.frameObjectId, frameObjectId);
    }
    assert.deepEqual(
      plan.updates.map((update) => [update.placementId, update.next.surface, update.next.boundaryRole]),
      [
        ['fresh-crossing', 'canvas_workspace', 'crossing'],
        ['fresh-inside', 'formal_page', 'inside'],
        ['repair-crossing', 'canvas_workspace', 'crossing'],
        ['repair-inside', 'formal_page', 'inside'],
      ],
    );
    assert.equal(plan.scans.every((scan) => (
      scan.selectedFrameId === frameId && scan.selectedFrameObjectId === frameObjectId
    )), true);
  } finally {
    db.close();
  }
});
