import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  DEFAULT_MANIFEST_PATH,
  REPO_ROOT,
  TOOL_FACE_PARITY_TEST_MANIFEST_PATH_ENV,
  buildServerRouteGraph,
  evaluateToolFaceParity,
  formatParityResult,
  validateClientCallConstruction,
} from './check-tool-face-parity.mjs';

const npmExecPath = process.env.npm_execpath;
const realManifest = JSON.parse(readFileSync(DEFAULT_MANIFEST_PATH, 'utf8'));
const realEntry = realManifest.find((entry) => entry.name === 'list_notes');
const realPublicCount = realManifest.filter((entry) => entry.exposure === 'public').length;

assert.ok(realEntry, 'real manifest must contain list_notes');
assert.ok(realPublicCount > 0, 'real manifest must contain at least one public entry');
assert.ok(npmExecPath, 'npm_execpath is required to spawn the production npm entry');

function cloneEntry(overrides = {}) {
  return {
    ...realEntry,
    human_entry: { ...realEntry.human_entry },
    scopes: [...realEntry.scopes],
    ...overrides,
  };
}

function withTempManifest(manifest, run) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-tool-face-parity-'));
  const manifestPath = join(tempRoot, 'tool-face-manifest.json');
  try {
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return run(manifestPath);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function withTempRouteRepo(run) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-tool-face-route-'));
  const routeRoot = join(tempRoot, 'server', 'src', 'routes');
  try {
    mkdirSync(routeRoot, { recursive: true });
    writeFileSync(
      join(tempRoot, 'server', 'src', 'index.ts'),
      [
        "import mountedRouter from './routes/mounted.js';",
        "app.use('/api/real', mountedRouter);",
        '',
      ].join('\n'),
      'utf8',
    );
    writeFileSync(
      join(routeRoot, 'mounted.ts'),
      [
        'const mounted = Router();',
        "mounted.get('/ok', handler);",
        'const decoy = Router();',
        "decoy.get('/not-real', handler);",
        'export default mounted;',
        '',
      ].join('\n'),
      'utf8',
    );
    return run(tempRoot);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function withTempClientBaseRepo(apiBaseInitializer, run) {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-tool-face-client-base-'));
  const clientSrcRoot = join(tempRoot, 'client', 'src');
  const servicesRoot = join(clientSrcRoot, 'services');
  try {
    mkdirSync(servicesRoot, { recursive: true });
    writeFileSync(
      join(servicesRoot, 'api.ts'),
      [
        "import axios from 'axios';",
        "const PORT_PLACEHOLDER = 'https://deployed.example';",
        'const isDeployed = true;',
        `const API_BASE = ${apiBaseInitializer};`,
        'const api = axios.create({ baseURL: API_BASE });',
        'export default api;',
        '',
      ].join('\n'),
      'utf8',
    );
    writeFileSync(
      join(clientSrcRoot, 'probe.ts'),
      [
        "import api from './services/api';",
        'export function probe() {',
        "  return api.get('/notes');",
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
    return run(tempRoot);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runClientBaseProbe(apiBaseInitializer) {
  return withTempClientBaseRepo(apiBaseInitializer, (repoRoot) => (
    validateClientCallConstruction({
      repoRoot,
      method: 'GET',
      routePath: '/api/notes',
      callSite: 'client/src/probe.ts#probe',
    })
  ));
}

function assertClientBaseProbeSeesStaticPositive() {
  const positive = runClientBaseProbe(
    "isDeployed ? `${PORT_PLACEHOLDER}/api` : '/api'",
  );
  assert.equal(positive.ok, true, JSON.stringify(positive, null, 2));
}

function assertClientBaseProbeRejectsNotFullyStatic(apiBaseInitializer) {
  let thrown = null;
  try {
    runClientBaseProbe(apiBaseInitializer);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown instanceof Error, 'expected base path not fully static rejection');
  assert.match(thrown.message, /base path not fully static/);
}

function runProductionCli(manifest) {
  return withTempManifest(manifest, (manifestPath) => spawnSync(
    process.execPath,
    [npmExecPath, 'run', 'check:tool-face-parity'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        [TOOL_FACE_PARITY_TEST_MANIFEST_PATH_ENV]: manifestPath,
      },
      timeout: 60_000,
      windowsHide: true,
    },
  ));
}

function cliReceipt(result) {
  return [
    `exit=${String(result.status)}`,
    result.stdout,
    result.stderr,
    result.error?.stack,
  ].filter(Boolean).join('\n');
}

function assertCliCompleted(result) {
  assert.equal(result.error, undefined, cliReceipt(result));
  assert.equal(result.signal, null, cliReceipt(result));
  assert.equal(typeof result.status, 'number', cliReceipt(result));
}

test('G-1 builds a method-aware mounted route graph', () => {
  const positive = runProductionCli(realManifest);
  assertCliCompleted(positive);
  assert.equal(positive.status, 0, cliReceipt(positive));
  assert.match(positive.stdout, /\[PASS\] tool-face necessary-condition gate:/);

  const graph = buildServerRouteGraph(REPO_ROOT);
  const listNotesRoute = graph.find((route) => (
    route.method === 'GET' && route.fullPath === '/api/notes'
  ));
  assert.ok(listNotesRoute, 'GET /api/notes must exist in the composed route graph');
  assert.equal(listNotesRoute.mountedRouterModule, 'server/src/routes/notes.ts');
  assert.equal(
    graph.some((route) => route.method === 'POST' && route.fullPath === '/api/health'),
    false,
    'method must participate: direct health route is GET, not POST',
  );

  const wrongMethod = runProductionCli([cloneEntry({
    name: 'wrong_route_method_probe',
    human_entry: {
      route: 'POST /api/health',
      client_call_site: 'client/src/App.tsx#App',
    },
    exposure: 'public',
  })]);
  assertCliCompleted(wrongMethod);
  assert.equal(wrongMethod.status, 1, cliReceipt(wrongMethod));
  assert.match(
    `${wrongMethod.stdout}\n${wrongMethod.stderr}`,
    /server route not found: POST \/api\/health/,
  );

  const wrongFullPath = runProductionCli([cloneEntry({
    name: 'wrong_route_full_path_probe',
    human_entry: {
      route: 'GET /api/health/not-real',
      client_call_site: 'client/src/App.tsx#App',
    },
    exposure: 'public',
  })]);
  assertCliCompleted(wrongFullPath);
  assert.equal(wrongFullPath.status, 1, cliReceipt(wrongFullPath));
  assert.match(
    `${wrongFullPath.stdout}\n${wrongFullPath.stderr}`,
    /server route not found: GET \/api\/health\/not-real/,
  );

  withTempRouteRepo((repoRoot) => {
    const fixtureGraph = buildServerRouteGraph(repoRoot);
    assert.equal(
      fixtureGraph.some((route) => route.method === 'GET' && route.fullPath === '/api/real/ok'),
      true,
      'the default-exported router leaf must compose with its index mount',
    );
    assert.equal(
      fixtureGraph.some((route) => route.fullPath === '/api/real/not-real'),
      false,
      'an unexported decoy Router in the same module is not mounted',
    );
  });
});

test('G-2 validates method and normalized URL construction inside the declared symbol', () => {
  const realCall = validateClientCallConstruction({
    method: 'GET',
    routePath: '/api/notes',
    callSite: 'client/src/pages/Courses/CourseDetail.tsx#fetchSummary',
  });
  assert.equal(realCall.ok, true, JSON.stringify(realCall, null, 2));
  assert.equal(realCall.match.method, 'GET');
  assert.equal(realCall.match.path, '/api/notes');

  const fakeSymbol = validateClientCallConstruction({
    method: 'GET',
    routePath: '/api/notes',
    callSite: 'client/src/App.tsx#App',
  });
  assert.equal(fakeSymbol.ok, false, JSON.stringify(fakeSymbol, null, 2));
  assert.match(fakeSymbol.error, /does not construct GET \/api\/notes/);

  const outsideClientSrc = validateClientCallConstruction({
    method: 'GET',
    routePath: '/api/notes',
    callSite: 'client/src/../package.json#scripts',
  });
  assert.equal(outsideClientSrc.ok, false, JSON.stringify(outsideClientSrc, null, 2));
  assert.match(outsideClientSrc.error, /outside client\/src/);

  const wrongUrl = runProductionCli([cloneEntry({
    name: 'wrong_client_url_probe',
    human_entry: {
      route: 'GET /api/health',
      client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#fetchSummary',
    },
    exposure: 'public',
  })]);
  assertCliCompleted(wrongUrl);
  assert.equal(wrongUrl.status, 1, cliReceipt(wrongUrl));
  const wrongUrlOutput = `${wrongUrl.stdout}\n${wrongUrl.stderr}`;
  assert.doesNotMatch(wrongUrlOutput, /server route not found: GET \/api\/health/);
  assert.match(wrongUrlOutput, /client symbol does not construct GET \/api\/health/);
});

test('G-2 rejects a wholly dynamic API base as not fully static', () => {
  assertClientBaseProbeSeesStaticPositive();
  assertClientBaseProbeRejectsNotFullyStatic('import.meta.env.VITE_API_BASE');
});

test('G-2 rejects a mixed dynamic and literal API base as not fully static', () => {
  assertClientBaseProbeSeesStaticPositive();
  assertClientBaseProbeRejectsNotFullyStatic(
    "isDeployed ? import.meta.env.VITE_API_BASE : '/api'",
  );
});

test('G-3 empty and non-empty 0-public manifests are neutral and never print PASS', () => {
  const passPattern = /PASS/i;
  const positive = runProductionCli(realManifest);
  assertCliCompleted(positive);
  assert.equal(positive.status, 0, cliReceipt(positive));
  const positiveOutput = `${positive.stdout}\n${positive.stderr}`;
  assert.match(positiveOutput, passPattern);

  const empty = runProductionCli([]);
  assertCliCompleted(empty);
  assert.equal(empty.status, 0, cliReceipt(empty));
  const emptyOutput = `${empty.stdout}\n${empty.stderr}`;
  assert.match(emptyOutput, /0 条 public 条目受检，未证明任何 parity/);
  assert.doesNotMatch(emptyOutput, passPattern);

  const zeroPublic = runProductionCli([
    cloneEntry({ name: 'zero_public_probe', exposure: 'test' }),
  ]);
  assertCliCompleted(zeroPublic);
  assert.equal(zeroPublic.status, 0, cliReceipt(zeroPublic));
  const zeroPublicOutput = `${zeroPublic.stdout}\n${zeroPublic.stderr}`;
  assert.match(zeroPublicOutput, /0 条 public 条目受检，未证明任何 parity/);
  assert.doesNotMatch(zeroPublicOutput, passPattern);
});

test('G-5 killer 1: real route and real client construction stay green', () => {
  const result = runProductionCli(realManifest);
  assertCliCompleted(result);
  assert.equal(result.status, 0, cliReceipt(result));
  assert.match(
    result.stdout,
    new RegExp(
      `\\[PASS\\] tool-face necessary-condition gate: ${realPublicCount} public entries checked; `
      + 'human reachability NOT VERIFIED; journey pending',
    ),
  );
  console.log(`KILLER real_route_positive\n${result.stdout.trim()}`);
});

test('G-5 killer 2: a test entry leaked into the public projection is rejected independently', () => {
  const testEntry = cloneEntry({ name: 'test_probe', exposure: 'test' });

  const correctlyFiltered = evaluateToolFaceParity({ manifest: [testEntry] });
  assert.equal(correctlyFiltered.publicCount, 0);
  assert.deepEqual(correctlyFiltered.errors, []);
  assert.doesNotMatch(formatParityResult(correctlyFiltered), /\[PASS\]/);

  let selectorCalls = 0;
  const leaked = evaluateToolFaceParity({
    manifest: [testEntry],
    publicSelector(entries) {
      selectorCalls += 1;
      return [...entries];
    },
  });
  assert.equal(selectorCalls, 1, 'the production gate must invoke the public projection selector');
  assert.equal(leaked.errors.length, 1);
  assert.match(leaked.errors[0], /non-public entry leaked.*exposure=test/);
  const output = formatParityResult(leaked);
  assert.match(output, /^\[FAIL\]/);

  const rewrittenExposure = evaluateToolFaceParity({
    manifest: [testEntry],
    publicSelector(entries) {
      return entries.map((entry) => ({ ...entry, exposure: 'public' }));
    },
  });
  assert.match(
    rewrittenExposure.errors.join('\n'),
    /public projection transformed the manifest entry: test_probe/,
  );
  assert.match(
    rewrittenExposure.errors.join('\n'),
    /non-public entry leaked.*exposure=test/,
  );
  assert.match(formatParityResult(rewrittenExposure), /^\[FAIL\]/);

  const inPlaceTestEntry = cloneEntry({ name: 'test_probe', exposure: 'test' });
  const mutatedInPlace = evaluateToolFaceParity({
    manifest: [inPlaceTestEntry],
    publicSelector(entries) {
      entries[0].exposure = 'public';
      return entries;
    },
  });
  assert.match(
    mutatedInPlace.errors.join('\n'),
    /public projection transformed the manifest entry: test_probe/,
  );
  assert.match(
    mutatedInPlace.errors.join('\n'),
    /non-public entry leaked.*exposure=test/,
  );
  assert.match(formatParityResult(mutatedInPlace), /^\[FAIL\]/);
  console.log(`KILLER exposure_test_leak\n${output}`);
});

test('G-5 killer 3: a __ public entry is rejected independently', () => {
  const reservedEntry = cloneEntry({ name: '__reserved_probe', exposure: 'public' });
  const result = evaluateToolFaceParity({ manifest: [reservedEntry] });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /reserved __ entry entered public projection/);
  const output = formatParityResult(result);
  assert.match(output, /^\[FAIL\]/);
  assert.doesNotMatch(output, /non-public entry leaked/);
  console.log(`KILLER reserved_public\n${output}`);
});

test('production CLI calls the gate and rejects the reviewer false-positive shape', () => {
  const positive = runProductionCli(realManifest);
  assertCliCompleted(positive);
  assert.equal(positive.status, 0, cliReceipt(positive));

  const falsePositiveShape = [cloneEntry({
    name: 'reviewer_false_positive_probe',
    human_entry: {
      route: 'POST /api/health/not-real',
      client_call_site: 'client/src/App.tsx#App',
    },
    exposure: 'public',
  })];
  const rejected = runProductionCli(falsePositiveShape);
  assertCliCompleted(rejected);
  assert.equal(rejected.status, 1, cliReceipt(rejected));
  const output = `${rejected.stdout}\n${rejected.stderr}`;
  assert.match(output, /server route not found: POST \/api\/health\/not-real/);
  assert.match(output, /client symbol does not construct POST \/api\/health\/not-real/);
  assert.doesNotMatch(output, /ReferenceError|SyntaxError|ERR_MODULE_NOT_FOUND/);
});

test('same server route with the wrong client method is rejected', () => {
  const wrongMethod = [cloneEntry({
    name: 'wrong_client_method_probe',
    human_entry: {
      route: 'POST /api/notes',
      client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#fetchSummary',
    },
    exposure: 'public',
  })];
  const result = runProductionCli(wrongMethod);
  assertCliCompleted(result);
  assert.equal(result.status, 1, cliReceipt(result));
  const output = `${result.stdout}\n${result.stderr}`;
  assert.doesNotMatch(output, /server route not found: POST \/api\/notes/);
  assert.match(output, /client symbol does not construct POST \/api\/notes/);
});
