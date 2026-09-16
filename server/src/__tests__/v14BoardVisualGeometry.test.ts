import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  bendFromBoardPoint, boardAnchorPoint, boardArcIntersectsRect, boardArcPathOutsideRect,
  boardEdgeEndpoints, boardLabelRect, createBoardArc, expandBoardRect, nearestBoardArcPosition,
  pointOnBoardArc, roundedBoardRectIntersection, routeBoardEdge, sampleBoardArc, tangentOnBoardArc,
} from '../services/boardVisualGeometry.js';

const close = (actual: number, expected: number, tolerance = 1e-5) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`);

test('board presentation geometry server/shared copies remain byte-identical', async () => {
  const sharedUrl = new URL('../../../shared/boardVisualGeometry.ts', import.meta.url);
  const serverUrl = new URL('../services/boardVisualGeometry.ts', import.meta.url);
  assert.equal(readFileSync(sharedUrl, 'utf8'), readFileSync(serverUrl, 'utf8'));
  const shared = await import(sharedUrl.href);
  assert.deepEqual(shared.createBoardArc({ x: 12, y: 48 }, { x: 360, y: 210 }, -31), createBoardArc({ x: 12, y: 48 }, { x: 360, y: 210 }, -31));
});

test('legacy bend zero produces the unchanged straight segment', () => {
  const arc = createBoardArc({ x: 0, y: 10 }, { x: 200, y: 10 }, 0);
  assert.equal(arc.path, 'M 0 10 L 200 10');
  assert.equal(arc.center, null);
  assert.equal(arc.length, 200);
  assert.deepEqual(pointOnBoardArc(arc, 0.5), { x: 100, y: 10 });
});

test('signed bend creates a true circle through both ends and the handle', () => {
  for (const bend of [-80, -12, 12, 80, 140]) {
    const arc = createBoardArc({ x: 0, y: 0 }, { x: 200, y: 0 }, bend);
    assert.ok(arc.center);
    assert.match(arc.path, / A /);
    close(pointOnBoardArc(arc, 0.5).x, 100);
    close(pointOnBoardArc(arc, 0.5).y, bend);
    for (const t of [0, 0.2, 0.5, 0.8, 1]) {
      const point = pointOnBoardArc(arc, t);
      close(Math.hypot(point.x - arc.center.x, point.y - arc.center.y), arc.radius);
    }
  }
});

test('the bend handle projects onto the chord normal for rotated lines', () => {
  close(bendFromBoardPoint({ x: 0, y: 0 }, { x: 0, y: 200 }, { x: -20, y: 130 }), 20);
  close(bendFromBoardPoint({ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 180, y: -30 }), -30);
});

test('short and coincident chords stay finite and cannot form a hairpin', () => {
  const short = createBoardArc({ x: 0, y: 0 }, { x: 10, y: 0 }, 200);
  assert.equal(short.bend, 5);
  const zero = createBoardArc({ x: 7, y: 7 }, { x: 7, y: 7 }, 200);
  assert.equal(zero.length, 0);
  assert.equal(zero.path, 'M 7 7 L 7 7');
  assert.equal(nearestBoardArcPosition(zero, { x: 12, y: 17 }), 0.5);
});

test('arrow rotation follows the actual arc tangent at either end', () => {
  const arc = createBoardArc({ x: 0, y: 0 }, { x: 240, y: 0 }, 30);
  assert.ok(arc.center);
  for (const t of [0, 0.5, 1]) {
    const point = pointOnBoardArc(arc, t);
    const tangent = tangentOnBoardArc(arc, t);
    close(Math.hypot(tangent.x, tangent.y), 1);
    close(tangent.x * (point.x - arc.center.x) + tangent.y * (point.y - arc.center.y), 0);
  }
  assert.ok(tangentOnBoardArc(arc, 0).y > 0);
  assert.ok(tangentOnBoardArc(arc, 1).y < 0);
});

test('rounded-card contact uses the side or real corner circle', () => {
  const rect = { x: 0, y: 0, w: 100, h: 100, radius: 12 };
  assert.deepEqual(roundedBoardRectIntersection(rect, { x: 200, y: 50 }), { x: 100, y: 50 });
  const corner = roundedBoardRectIntersection(rect, { x: 200, y: 200 });
  close(corner.x, 88 + 12 / Math.sqrt(2));
  close(corner.y, corner.x);
  assert.ok(corner.x < 100);
});

test('all four explicit anchors are exact side midpoints', () => {
  const rect = { x: 10, y: 20, w: 100, h: 60 };
  assert.deepEqual(boardAnchorPoint(rect, 'n'), { x: 60, y: 20 });
  assert.deepEqual(boardAnchorPoint(rect, 'e'), { x: 110, y: 50 });
  assert.deepEqual(boardAnchorPoint(rect, 's'), { x: 60, y: 80 });
  assert.deepEqual(boardAnchorPoint(rect, 'w'), { x: 10, y: 50 });
});

test('bound ends follow the card projection, with arrow breathing gap', () => {
  const from = { x: 0, y: 0, w: 100, h: 100 };
  const to = { x: 300, y: 0, w: 100, h: 100 };
  const original = boardEdgeEndpoints(from, to, { capStart: 'arrow', capEnd: 'arrow' });
  assert.deepEqual(original, { start: { x: 106, y: 50 }, end: { x: 294, y: 50 } });
  const moved = boardEdgeEndpoints(from, { ...to, y: 160 });
  assert.notDeepEqual(moved.end, original.end);
  const anchored = boardEdgeEndpoints(from, to, { fromAnchor: 'n', toAnchor: 's' });
  assert.deepEqual(anchored, { start: { x: 50, y: 0 }, end: { x: 350, y: 100 } });
});

test('unbound point ends stay at their own board coordinates', () => {
  assert.deepEqual(boardEdgeEndpoints({ x: 3, y: 7 }, { x: 300, y: 0, w: 100, h: 100 }).start, { x: 3, y: 7 });
  assert.deepEqual(boardEdgeEndpoints({ x: 3, y: 7 }, { x: 30, y: 70 }), { start: { x: 3, y: 7 }, end: { x: 30, y: 70 } });
});

test('arrow clearance stays outside explicitly pinned anchors facing away from the destination', () => {
  const { start, end } = boardEdgeEndpoints({ x: 0, y: 0, w: 100, h: 100 }, { x: 300, y: 200, w: 100, h: 100 },
    { fromAnchor: 'n', toAnchor: 's', capStart: 'arrow', capEnd: 'arrow' });
  assert.deepEqual(start, { x: 50, y: -6 });
  assert.deepEqual(end, { x: 350, y: 306 });
});

test('new unobstructed paths get the modest default bend', () => {
  const bend = routeBoardEdge({ x: 0, y: 0 }, { x: 400, y: 0 }, []);
  assert.ok(bend > 0 && bend <= 24);
});

test('one-shot routing clears a blocking rectangle with breathing margin on the shorter side', () => {
  const start = { x: 0, y: 0 };
  const end = { x: 400, y: 0 };
  const obstacle = { x: 170, y: -40, w: 70, h: 150 };
  const bend = routeBoardEdge(start, end, [obstacle]);
  assert.ok(bend < 0, 'the upper route is shorter');
  assert.equal(boardArcIntersectsRect(createBoardArc(start, end, bend), expandBoardRect(obstacle, 16)), false);
});

test('moving a card does not alter stored bend; explicit reroute computes again', () => {
  const start = { x: 0, y: 0 };
  const end = { x: 400, y: 0 };
  const storedBend = routeBoardEdge(start, end, []);
  const movedObstacle = { x: 170, y: -40, w: 70, h: 150 };
  assert.equal(boardArcIntersectsRect(createBoardArc(start, end, storedBend), movedObstacle), true);
  const rerouted = routeBoardEdge(start, end, [movedObstacle]);
  assert.notEqual(rerouted, storedBend);
  assert.equal(boardArcIntersectsRect(createBoardArc(start, end, rerouted), movedObstacle), false);
});

test('routing handles vertical cards and multiple obstacles deterministically', () => {
  const start = { x: 0, y: 0 };
  const end = { x: 0, y: 600 };
  const obstacles = [{ x: -50, y: 150, w: 100, h: 90 }, { x: -10, y: 350, w: 100, h: 60 }];
  const bend = routeBoardEdge(start, end, obstacles);
  for (const rect of obstacles) assert.equal(boardArcIntersectsRect(createBoardArc(start, end, bend), expandBoardRect(rect, 16)), false);
  assert.equal(routeBoardEdge(start, end, obstacles), bend);
});

test('arc-length label positions are reversible and snap near the midpoint only when requested', () => {
  const arc = createBoardArc({ x: 12, y: 10 }, { x: 300, y: 140 }, -40);
  for (const t of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]) close(nearestBoardArcPosition(arc, pointOnBoardArc(arc, t)), t);
  close(nearestBoardArcPosition(arc, pointOnBoardArc(arc, 0.51)), 0.51);
  assert.equal(nearestBoardArcPosition(arc, pointOnBoardArc(arc, 0.51), { snapToMiddle: true }), 0.5);
});

test('a label rectangle removes line pixels instead of painting a background', () => {
  const line = createBoardArc({ x: 0, y: 0 }, { x: 200, y: 0 }, 0);
  assert.equal(boardArcPathOutsideRect(line, { x: 80, y: -10, w: 40, h: 20 }), 'M 0 0 L 77 0 M 123 0 L 200 0');
  assert.equal(boardArcPathOutsideRect(line, { x: -5, y: -10, w: 210, h: 20 }), '');
});

test('curved paths are split into true arc intervals around a label', () => {
  const arc = createBoardArc({ x: 0, y: 0 }, { x: 200, y: 0 }, 40);
  const path = boardArcPathOutsideRect(arc, { x: 80, y: 30, w: 40, h: 20 }, 0);
  assert.equal((path.match(/ M |^M /g) ?? []).length, 2);
  assert.equal((path.match(/ A /g) ?? []).length, 2);
  assert.equal(boardArcIntersectsRect(arc, { x: 90, y: 35, w: 20, h: 10 }), true);
  assert.equal(boardArcIntersectsRect(arc, { x: 90, y: -10, w: 20, h: 10 }), false);
});

test('plain labels wrap to approximately 120px and remain a horizontal rectangle', () => {
  const label = boardLabelRect('一二三四五六七八九十一二三四五六七八九十\nplain text', { x: 200, y: 60 });
  assert.equal(label.w, 128);
  assert.equal(label.lines.length, 3);
  close(label.x + label.w / 2, 200);
  close(label.y + label.h / 2, 60);
  const points = sampleBoardArc(createBoardArc({ x: 0, y: 0 }, { x: 200, y: 0 }, 20));
  assert.deepEqual(points[0], { x: 0, y: 0 });
  assert.deepEqual(points[points.length - 1], { x: 200, y: 0 });
});
