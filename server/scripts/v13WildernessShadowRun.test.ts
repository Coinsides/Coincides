import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import Database from 'better-sqlite3';
import { parseArgs, REPO_ROOT } from './v13WildernessShadowRun.js';
import { readShadowReport } from './wildernessShadow/census.js';
import { createSyntheticBuffer, SYNTHETIC_USER } from './wildernessShadow/synthetic.js';
import { buildShadowPlan, classifyMount, classifyObject, classifyPlacement, evaluateCoordinates,
  INTERPRETATIONS, thresholdMet, validateConservation,
  type Geometry, type Placement, type PlannedRow } from './wildernessShadow/model.js';
import { renderMarkdown, type ShadowReport } from './wildernessShadow/report.js';

const placement = (overrides: Partial<Placement> = {}): Placement => ({
  note: 'test-note', id: 'test-placement', object: 'test-object', kind: 'paragraph_block_projection',
  status: 'active', surface: 'canvas_workspace', boundary: 'crossing', ...overrides,
});
const planned = (id: string, destination: PlannedRow['route']['destination'] = 'original'): PlannedRow => ({
  note: 'n', id, unit: 'placement', route: { destination, reason: 'test', reviewRequired: false },
});
function interpretations(): Geometry[] {
  return INTERPRETATIONS.map(interpretation => ({ unit: 'placement', note: 'n', id: 'p', interpretation,
    state: 'resolved', page_state: 'one_frame', page_signature: 'f@s:inside', unknown_frames: 0,
    primary_ratio: 1, x: 10, y: 10,
    page_scores: [{ frame: 'f', stack: 's', ratio: 1, rect: 'inside', center: 'inside', horizontal: 'inside' }] }));
}
function syntheticReport(): ShadowReport {
  const db = new Database(createSyntheticBuffer(), { readonly: true });
  try { return readShadowReport(db, SYNTHETIC_USER, 'synthetic'); } finally { db.close(); }
}

test('destination matrix: inside retained, every crossing falls back, drawings use object tray', () => {
  const cases: Array<[Partial<Placement>, string, boolean]> = [
    [{ boundary: 'inside' }, 'original', false],
    [{ boundary: 'outside' }, 'tray_block', false],
    [{ boundary: 'crossing' }, 'tray_block', false],
    [{ kind: 'shape', boundary: 'inside' }, 'tray_object', false],
    [{ kind: 'image' }, 'tray_object', false],
    [{ kind: 'table' }, 'tray_object', false],
    [{ kind: 'visual_connector' }, 'tray_object', false],
    [{ kind: 'future_kind' }, 'tray_object', false],
    [{ kind: 'page_frame' }, 'original', false],
    [{ surface: 'tray' }, 'original', false],
    [{ surface: 'formal_page', boundary: 'outside' }, 'original', false],
    [{ status: 'retired' }, 'original', true],
    [{ kind: null }, 'original', true],
    [{ surface: 'unknown' }, 'original', true],
    [{ boundary: 'unknown' }, 'original', true],
  ];
  for (const [input, destination, reviewRequired] of cases) {
    assert.equal(classifyPlacement(placement(input)).destination, destination);
    assert.equal(classifyPlacement(placement(input)).reviewRequired, reviewRequired);
  }
  for (const ratio of [0, 0.25, 0.5, 0.75, 1, null]) {
    assert.equal(thresholdMet(ratio), ratio === null ? null : ratio >= 0.5);
    assert.equal(classifyPlacement(placement()).destination, 'tray_block');
  }
  assert.equal(thresholdMet(0.5, 0.75), false);
  assert.equal(thresholdMet(0.5, 0.25), true);
});

test('objects and mounts aggregate every placement without multiplying identities or choosing a surface', () => {
  const object = { note: 'test-note', id: 'test-object', kind: 'shape', status: 'active', placements: 2, mounts: 1, surfaces: 1 };
  const mount = { note: 'test-note', id: 'm', object: object.id, object_kind: 'shape', status: 'active', placements: 2, surfaces: 1, surface_state: 'canvas_workspace' };
  const workspace = [placement(), placement({ id: 'p2' })];
  assert.equal(classifyObject(object, workspace).destination, 'tray_object');
  assert.equal(classifyMount(mount, workspace).destination, 'tray_mount');
  const mixed = [workspace[0], placement({ id: 'p2', surface: 'formal_page' })];
  for (const r of [classifyObject(object, mixed), classifyMount(mount, mixed), classifyObject(object, []), classifyMount(mount, [])]) {
    assert.equal(r.destination, 'original');
    assert.equal(r.reviewRequired, true);
  }
  assert.equal(classifyMount({ ...mount, object_kind: null }, workspace).reviewRequired, true);
});

test('three explanations agree on full page sets; page, stack and boundary disagreement stay ambiguous', () => {
  assert.equal(evaluateCoordinates(interpretations()).status, 'settled');
  for (const field of ['frame', 'stack', 'rect'] as const) {
    const rows = interpretations();
    rows[2].page_scores[0][field] = 'different';
    assert.equal(evaluateCoordinates(rows).reason, 'interpretation_disagreement');
  }
  const empty = interpretations().map(g => ({ ...g, page_state: 'no_intersection', page_scores: [], page_signature: null }));
  assert.deepEqual(evaluateCoordinates(empty).agreedPages, []);
  const multiple = interpretations().map(g => ({ ...g, page_state: 'multiple_stacks', page_scores: [
    ...g.page_scores, { ...g.page_scores[0], frame: 'f2', stack: 's2' },
  ] }));
  multiple[1].page_scores.reverse();
  const verdict = evaluateCoordinates(multiple);
  assert.equal(verdict.status, 'settled');
  assert.equal(verdict.agreedPages?.length, 2);
});

test('unknown, invalid geometry, missing interpretations and incomplete frames never manufacture agreement', () => {
  for (const state of ['origin_unknown', 'invalid_geometry', 'rotated_object', 'nonfinite_geometry']) {
    assert.equal(evaluateCoordinates(interpretations().map(g => ({ ...g, state, page_signature: null, page_scores: [] }))).reason, 'incomplete_evidence');
  }
  const missingFrame = interpretations();
  missingFrame[1].unknown_frames = 1;
  assert.equal(evaluateCoordinates(missingFrame).status, 'ambiguous');
  assert.equal(evaluateCoordinates(interpretations().slice(0, 2)).status, 'ambiguous');
  assert.equal(evaluateCoordinates([interpretations()[0], interpretations()[0], interpretations()[2]]).status, 'ambiguous');
  assert.equal(evaluateCoordinates([], 'structural_frame').status, 'not_applicable');
});

test('conservation checks per-row identities, raw denominator, destination legality and empty notes', () => {
  const inventory = [{ note: 'n', id: 'a' }, { note: 'n', id: 'b' }];
  assert.equal(validateConservation('n', 'placement', 2, inventory, [planned('a'), planned('b', 'tray_block')]).ok, true);
  for (const rows of [[planned('a')], [planned('a'), planned('a')], [planned('a'), planned('extra')],
    [planned('a'), planned('b', 'adopt')], [planned('a'), planned('b', 'tray_mount')]]) {
    assert.equal(validateConservation('n', 'placement', 2, inventory, rows).ok, false);
  }
  assert.equal(validateConservation('n', 'placement', 3, inventory, [planned('a'), planned('b')]).ok, false);
  assert.equal(validateConservation('empty', 'placement', 0, inventory, [planned('a')]).ok, true);
});

test('full S0/S4 spectrum runs on a readonly synthetic connection and preserves all three inventories', () => {
  const db = new Database(createSyntheticBuffer(), { readonly: true });
  const digest = () => createHash('sha256').update(db.serialize()).digest('hex');
  try {
    const before = digest();
    const report = readShadowReport(db, SYNTHETIC_USER, 'synthetic');
    assert.equal(digest(), before);
    assert.equal(report.evidence.readonlyConnection, true);
    assert.equal(report.evidence.queryOnly, true);
    assert.equal(report.evidence.totalChangesAfter, report.evidence.totalChangesBefore);
    assert.equal(report.shadow.conservationOk, true);
    for (const [unit, table] of [['placement', 'canvas_placements'], ['object', 'canvas_objects'], ['mount', 'content_mounts']] as const) {
      const raw = db.prepare(`SELECT id, note_id AS note FROM ${table} WHERE user_id=? ORDER BY id`).all(SYNTHETIC_USER);
      const plans = report.shadow.rows.filter(r => r.unit === unit).map(({ id, note }) => ({ id, note })).sort((a, b) => a.id < b.id ? -1 : 1);
      assert.deepEqual(plans, raw);
    }
    const c = report.census;
    assert.deepEqual(c.denominators.reduce((s, d) => [s[0] + d.placement, s[1] + d.object, s[2] + d.mount], [0, 0, 0]), [58, 56, 39]);
    assert.equal(c.denominators.find(d => d.note === 'empty')?.placement, 0);
    assert.equal(c.legacy_inventory.length, 8);
    assert.equal(c.unscopable_legacy_note_rows, 1);
    assert.ok(!c.denominators.some(d => d.note === 'foreign-note'));
    const n = c.denominators.find(d => d.note === 'n')!;
    assert.deepEqual([n.legacy_only, n.legacy_ambiguous, n.dual_any, n.dual_active], [1, 2, 2, 1]);
    const g = (id: string, interpretation = 'world') => c.geometry.find(g => g.id === id && g.unit === 'placement' && g.interpretation === interpretation)!;
    assert.deepEqual(['outside', 'quarter', 'half', 'three-quarter', 'world'].map(id => g(id).primary_ratio), [0, 0.25, 0.5, 0.75, 1]);
    assert.equal(g('local', 'local').primary_ratio, 1);
    assert.equal(g('mixed', 'mixed').primary_ratio, 1);
    assert.equal(g('second', 'mixed').page_signature, 'f2@stack1:inside');
    assert.deepEqual([g('cross-note', 'local').x, g('cross-note', 'local').y], [1020, 2030]);
    assert.equal(g('multi-stack').best_ties, 2);
    assert.equal(g('tall-crosspage').page_state, 'multiple_pages_one_stack');
    assert.deepEqual(['oversize', 'oversize-width', 'oversize-height'].map(id => g(id).oversize), ['both', 'width', 'height']);
    assert.equal(g('stored-inside-wrong').stored_vs_rect, 1);
    for (const id of ['untagged-local', 'untagged-mixed', 'untagged-world']) {
      assert.equal(g(id).tag, null);
      assert.equal(g(id).history_hint, '035_receipt_survives');
    }
    for (const id of ['invalid-inset', 'duplicate-frame', 'missing-frame']) assert.equal(g(id, 'local').state, 'origin_unknown');
    assert.equal(g('zero-width').state, 'invalid_geometry');
    assert.equal(g('text-x').state, 'invalid_geometry');
    assert.equal(g('infinite-x').state, 'nonfinite_geometry');
    assert.equal(g('rotated').state, 'rotated_object');
    assert.equal(g('invalid-meta').metadata_valid, 0);
    assert.equal(g('missing-primary-block').primary_ratio, null);
    assert.equal(g('no-frame-inventory').page_state, 'no_valid_frames');
    const p = (id: string) => report.shadow.rows.find(r => r.unit === 'placement' && r.id === id)!;
    for (const id of ['half', 'quarter', 'three-quarter', 'oversize', 'oversize-width', 'oversize-height']) assert.equal(p(id).route.reason, 'crossing_fallback');
    assert.equal(p('stored-inside-wrong').route.reason, 'inside_unchanged');
    assert.equal(p('agree-inside').coordinate?.status, 'settled');
    assert.deepEqual(p('agree-outside').coordinate?.agreedPages, []);
    assert.equal(p('agree-crosspage').coordinate?.agreedPages?.length, 2);
    for (const id of ['multi-mount', 'unplaced-mount', 'wrong-note-mount']) assert.equal(report.shadow.rows.find(r => r.unit === 'mount' && r.id === id)?.route.reviewRequired, true);
    assert.equal(report.shadow.rows.find(r => r.unit === 'mount' && r.id === 'all-wilderness-mount')?.route.destination, 'tray_mount');
    assert.equal(report.shadow.rows.filter(r => r.unit === 'object' && r.id === 'all-wilderness-object').length, 1);
    // Diagnostic threshold changes never authorize adoption or change any destination.
    const otherThreshold = buildShadowPlan(c, 0.9);
    assert.deepEqual(otherThreshold.rows.map(r => r.route), report.shadow.rows.map(r => r.route));
    assert.equal(otherThreshold.rows.find(r => r.id === 'three-quarter' && r.unit === 'placement')?.thresholdDiagnostics?.world, false);
  } finally { db.close(); }
});

test('report escaping keeps IDs and candidate pages within their markdown cells', () => {
  const report = syntheticReport();
  report.shadow.rows[0].id = 'synthetic|<cell>\n`id`';
  const markdown = renderMarkdown(report);
  assert.ok(markdown.includes('synthetic&#124;&lt;cell&gt; &#96;id&#96;'));
  assert.ok(markdown.includes('不是迁移后实测'));
});

test('argument parsing uses explicit scope and synthetic source without a default database', () => {
  assert.deepEqual(parseArgs(['--synthetic', '--user', 's0-user', '--out', 'docs/audits/合成-specimen']), {
    synthetic: true, database: undefined, user: 's0-user', output: 'docs/audits/合成-specimen',
  });
});

test('functional smoke: CLI writes full-spectrum synthetic JSON + markdown with expected ambiguity and conservation', () => {
  const base = `docs/audits/v13-2-s3-合成-smoke-${randomUUID()}`;
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/v13WildernessShadowRun.ts',
    '--synthetic', '--user', SYNTHETIC_USER, '--out', base], { cwd: path.join(REPO_ROOT, 'server'), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  try {
    const report = JSON.parse(readFileSync(path.join(REPO_ROOT, base + '.json'), 'utf8')) as ShadowReport;
    assert.equal(report.mode, 'synthetic');
    assert.equal(report.shadow.conservationOk, true);
    assert.equal(report.shadow.conservation.length, 8 * 3);
    // S0: 27 ambiguous + 5 agreed off-page drawings + 1 tray N/A.
    // S3: 3 untagged + 2 oversize + 1 drawing ambiguous; 3 zero-origin controls + 1 drawing agreed.
    assert.equal(report.shadow.ambiguousPlacements.length, 33);
    assert.deepEqual(report.shadow.ambiguousPlacements.filter(r => r.coordinate?.reason === 'incomplete_evidence').map(r => r.id).sort(),
      ['invalid-inset', 'duplicate-frame', 'outside', 'zero-width', 'rotated', 'text-x', 'infinite-x', 'missing-frame', 'no-frame-inventory'].sort());
    assert.deepEqual(report.shadow.rows.filter(r => r.coordinate?.status === 'settled').map(r => r.id).sort(),
      ['p-shape', 'p-image', 'p-table', 'p-visual_connector', 'p-future_kind', 'all-wilderness-p2', 'agree-inside', 'agree-outside', 'agree-crosspage'].sort());
    assert.equal(report.shadow.ambiguousLegacy.length, 5);
    assert.equal(report.shadow.destinationReviews.length, 10);
    const markdown = readFileSync(path.join(REPO_ROOT, base + '.md'), 'utf8');
    assert.ok(markdown.includes('合成演练核对单'));
    assert.ok(markdown.includes('三表守恒：全部全等'));
    for (const row of [...report.shadow.ambiguousPlacements, ...report.shadow.ambiguousLegacy]) assert.ok(markdown.includes(row.id));
    assert.equal(JSON.parse(result.stdout).result, 'SHADOW_RUN_PASS');
  } finally {
    // Only the two uniquely named files created by this test; never recursive cleanup.
    unlinkSync(path.join(REPO_ROOT, base + '.json'));
    unlinkSync(path.join(REPO_ROOT, base + '.md'));
  }
});
