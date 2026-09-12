// From server/: node --import tsx ../docs/audits/2026-09-11-b4v-builder/http-smoke.mjs
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { createB4vFixtureApp } from './serve.mjs';

const evidence = {
  generated_at: new Date().toISOString(), result: 'running', checks: [], http: [],
  boundary: 'Actual production boards HTTP router and real migrated SQLite :memory:; synthetic owner after auth. No browser or auth claim.',
};
const fixture = await createB4vFixtureApp();
let listener;
const check = (name, details = {}) => evidence.checks.push({ name, pass: true, ...details });
try {
  listener = await new Promise((resolve) => { const handle = fixture.app.listen(0, '127.0.0.1', () => resolve(handle)); });
  const { port } = listener.address();
  evidence.isolation = { database: ':memory:', binding: '127.0.0.1', port, production_database_opened: false };
  const request = async (method, path, body, expectedStatus = 200) => {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const payload = await response.json();
    evidence.http.push({ method, path, status: response.status });
    assert.equal(response.status, expectedStatus, `${method} ${path}: ${JSON.stringify(payload)}`);
    return payload;
  };
  const initial = fixture.state();
  const boardPath = `/api/boards/${initial.board_id}`;
  const path = `${boardPath}/viewport-bookmarks`;
  evidence.initial_scene = initial.scene_before;
  assert.deepEqual(initial.viewport, { x: 120, y: 80, zoom: 0.8 });
  assert.deepEqual(await request('GET', path), { bookmarks: [] });
  check('Initial saved viewport and empty bookmark list', { viewport: initial.viewport });

  const firstInput = { name: 'Chapter one', x: 120, y: 80, zoom: 0.8 };
  const { bookmark: first } = await request('POST', path, firstInput, 201);
  assert.deepEqual(Object.keys(first).sort(), ['id', 'board_id', 'user_id', 'name', 'x', 'y', 'zoom', 'created_at'].sort());
  assert.deepEqual({ name: first.name, x: first.x, y: first.y, zoom: first.zoom }, firstInput);
  assert.equal(first.board_id, initial.board_id);
  const { bookmark: second } = await request('POST', path, { name: 'Timeline', x: -520.125, y: -280.75, zoom: 1.375 }, 201);
  assert.deepEqual((await request('GET', path)).bookmarks.map(({ id }) => id), [first.id, second.id]);
  check('Create persists only the exact named camera snapshot; list retains creation order', { first, second });

  const { bookmark: renamed } = await request('PATCH', `${path}/${first.id}`, { name: '  Chapter one renamed  ' });
  assert.deepEqual(renamed, { ...first, name: 'Chapter one renamed' });
  assert.deepEqual((await request('GET', path)).bookmarks.map(({ id }) => id), [first.id, second.id]);
  check('Rename trims the name and preserves snapshot, creation timestamp and order', { renamed });

  await request('POST', path, { ...firstInput, name: '' }, 400);
  await request('PATCH', `${path}/${first.id}`, { name: 'x'.repeat(33) }, 400);
  const { bookmark: one } = await request('POST', path, { ...firstInput, name: '一' }, 201);
  const { bookmark: thirtyTwo } = await request('POST', path, { ...firstInput, name: '字'.repeat(32) }, 201);
  check('Product name bounds: 1 and 32 accepted; empty and 33 rejected', { accepted_lengths: [one.name.length, thirtyTwo.name.length] });

  assert.deepEqual(await request('DELETE', `${path}/${first.id}`), { deleted: true });
  assert.deepEqual((await request('GET', path)).bookmarks.map(({ id }) => id), [second.id, one.id, thirtyTwo.id]);
  check('Delete removes one bookmark and preserves remaining creation order');

  for (let index = 3; index < 24; index += 1) {
    await request('POST', path, { name: `View ${index + 1}`, x: -index * 100, y: index * 50, zoom: 0.8 }, 201);
  }
  const rejection = await request('POST', path, { ...firstInput, name: 'Twenty-fifth' }, 409);
  assert.deepEqual(rejection, { error: 'board_viewport_bookmark_limit_reached', details: { limit: 24 } });
  assert.equal((await request('GET', path)).bookmarks.length, 24);
  check('24 bookmarks persist; the 25th returns the readable product limit', { count: 24, rejection });

  const beforeJump = fixture.state();
  assert.deepEqual(beforeJump.scene_now, initial.scene_before);
  assert.deepEqual(beforeJump.board, initial.board_before);
  check('Bookmark CRUD leaves raw board, layers, members, edges, visuals and z-order byte-equal', {
    scene_unchanged: beforeJump.scene_unchanged, board_unchanged: true,
  });

  await request('PATCH', boardPath, { viewport: { x: second.x, y: second.y, zoom: second.zoom } });
  const jumped = fixture.state();
  assert.deepEqual(jumped.viewport, { x: -520.125, y: -280.75, zoom: 1.375 });
  assert.deepEqual(jumped.scene_now, initial.scene_before);
  check('Existing viewport writer preserves exact x/y/zoom and leaves scene unchanged', { viewport: jumped.viewport });
  evidence.before_board_delete = jumped;

  await request('DELETE', boardPath);
  const deleted = fixture.state();
  assert.equal(deleted.board, null);
  assert.deepEqual(deleted.bookmarks, []);
  for (const rows of Object.values(deleted.scene_now)) assert.deepEqual(rows, []);
  check('Deleting the board cascades all 24 saved bookmarks', { remaining_bookmarks: deleted.bookmarks.length });
  evidence.after_board_delete = deleted;
  evidence.result = 'PASS';
} catch (error) {
  evidence.result = 'FAIL';
  evidence.failure = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  if (listener) await new Promise((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  fixture.close();
  evidence.passed_checks = evidence.checks.filter(({ pass }) => pass).length;
  evidence.http_requests = evidence.http.length;
  writeFileSync(new URL('./http-evidence.json', import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ result: evidence.result, passed_checks: evidence.passed_checks, http_requests: evidence.http_requests,
    ...(evidence.failure ? { failure: evidence.failure.message } : {}) }));
}
