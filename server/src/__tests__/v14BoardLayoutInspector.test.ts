import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectBoardLayout, type BoardLayoutProjection } from '../services/boardLayoutInspector.js';
import { createBoardArc, sampleBoardArc } from '../services/boardVisualGeometry.js';

test('layout inspector detects label/card overlap with coordinates and severity', () => {
  const report = inspectBoardLayout({ cards: [{ id: 'sticky:a', x: 100, y: 100, w: 100, h: 100 }],
    edges: [{ id: 'edge:a', points: [], label: { x: 90, y: 90, w: 40, h: 40 } }] });
  assert.equal(report.counts['label-card-overlap'], 1);
  assert.deepEqual(report.issues[0].coordinate, { x: 115, y: 115 });
  assert.equal(report.issues[0].severity, 'error');
  assert.deepEqual(report.issues[0].itemIds, ['edge:a', 'sticky:a']);
});

test('layout inspector detects overlapping label rectangles once per edge pair', () => {
  const report = inspectBoardLayout({ cards: [], edges: [
    { id: 'edge:a', points: [], label: { x: 0, y: 0, w: 60, h: 20 } },
    { id: 'edge:b', points: [], label: { x: 50, y: 5, w: 60, h: 20 } },
  ] });
  assert.equal(report.counts['label-label-overlap'], 1);
  assert.equal(report.issues.length, 1);
});

test('layout inspector detects line penetration only in non-endpoint cards', () => {
  const report = inspectBoardLayout({ cards: [
    { id: 'member:from', x: 0, y: 0, w: 40, h: 40 },
    { id: 'sticky:middle', x: 80, y: 0, w: 40, h: 40 },
    { id: 'member:to', x: 160, y: 0, w: 40, h: 40 },
  ], edges: [{ id: 'edge:a', fromId: 'member:from', toId: 'member:to', points: [{ x: 20, y: 20 }, { x: 180, y: 20 }] }] });
  assert.equal(report.counts['edge-through-card'], 1);
  assert.deepEqual(report.issues[0].itemIds, ['edge:a', 'sticky:middle']);
  assert.deepEqual(report.issues[0].coordinate, { x: 100, y: 20 });
});

test('card overlap exceeds the configured area/ratio threshold; small contact is ignored', () => {
  const projection = { cards: [{ id: 'a', x: 0, y: 0, w: 100, h: 100 }, { id: 'b', x: 70, y: 70, w: 100, h: 100 }], edges: [] };
  assert.equal(inspectBoardLayout(projection).issues.length, 0);
  assert.equal(inspectBoardLayout(projection, { cardOverlapRatio: 0.05 }).counts['card-card-overlap'], 1);
  projection.cards[1].x = 50;
  projection.cards[1].y = 50;
  assert.equal(inspectBoardLayout(projection).counts['card-card-overlap'], 1);
});

test('near-parallel overlapping segments are detected in either drawing direction', () => {
  const report = inspectBoardLayout({ cards: [], edges: [
    { id: 'a', points: [{ x: 0, y: 0 }, { x: 200, y: 0 }] },
    { id: 'b', points: [{ x: 180, y: 3 }, { x: 20, y: 3 }] },
  ] });
  assert.equal(report.counts['near-parallel-edges'], 1);
  assert.equal(report.issues.length, 1);
});

test('dense curved samples still detect parallel overlap without counting duplicate subsegments', () => {
  const arc = createBoardArc({ x: 0, y: 0 }, { x: 400, y: 0 }, 40);
  const points = sampleBoardArc(arc, 4);
  const report = inspectBoardLayout({ cards: [], edges: [{ id: 'a', points },
    { id: 'b', points: points.map(({ x, y }) => ({ x, y: y + 2 })) }] });
  assert.equal(report.counts['near-parallel-edges'], 1);
});

test('all five deliberate defect classes appear in one fixture', () => {
  const report = inspectBoardLayout({ cards: [
    { id: 'a', x: 0, y: 0, w: 100, h: 100 }, { id: 'b', x: 50, y: 50, w: 100, h: 100 },
  ], edges: [
    { id: 'one', points: [{ x: -50, y: 70 }, { x: 200, y: 70 }], label: { x: 60, y: 60, w: 60, h: 20 } },
    { id: 'two', points: [{ x: -50, y: 72 }, { x: 200, y: 72 }], label: { x: 80, y: 65, w: 60, h: 20 } },
  ] });
  for (const [kind, count] of Object.entries(report.counts)) assert.ok(count > 0, kind);
  for (const issue of report.issues) {
    assert.ok(Number.isFinite(issue.coordinate.x) && Number.isFinite(issue.coordinate.y));
    assert.ok(issue.itemIds.length === 2);
  }
});

test('a clean board has zero reports and input geometry remains untouched', () => {
  const projection: BoardLayoutProjection = { cards: [
    { id: 'a', x: 0, y: 0, w: 100, h: 100 }, { id: 'b', x: 300, y: 0, w: 100, h: 100 },
  ], edges: [{ id: 'one', fromId: 'a', toId: 'b', points: [{ x: 100, y: 50 }, { x: 300, y: 50 }], label: { x: 175, y: 40, w: 50, h: 20 } }] };
  const before = JSON.stringify(projection);
  assert.deepEqual(inspectBoardLayout(projection).issues, []);
  assert.equal(JSON.stringify(projection), before);
});

test('boundary touch, crossings, short parallel contact and remote lines are not defects', () => {
  const report = inspectBoardLayout({ cards: [{ id: 'a', x: 0, y: 0, w: 100, h: 100 },
    { id: 'b', x: 100, y: 0, w: 100, h: 100 }], edges: [
    { id: 'boundary', points: [{ x: -10, y: 0 }, { x: 210, y: 0 }] },
    { id: 'cross-one', points: [{ x: 500, y: 500 }, { x: 600, y: 500 }] },
    { id: 'cross-two', points: [{ x: 550, y: 450 }, { x: 550, y: 550 }] },
    { id: 'short', points: [{ x: 599, y: 503 }, { x: 650, y: 503 }] },
    { id: 'far', points: [{ x: 500, y: 520 }, { x: 600, y: 520 }] },
  ] });
  assert.deepEqual(report.issues, []);
});
