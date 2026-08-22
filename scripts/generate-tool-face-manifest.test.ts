import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  listNotesInputSchema,
  listNotesOutputSchema,
  type ToolRegistryEntry,
} from '../server/src/toolFace/registry.js';
import type {
  ToolFaceJsonSchema,
  ToolFaceManifest,
} from '../shared/types/toolFaceManifest.js';
import {
  buildToolFaceManifest,
  renderManifest,
  TOOL_FACE_MANIFEST_TEST_OUTPUT_PATH_ENV,
} from './generate-tool-face-manifest.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverRequire = createRequire(resolve(REPO_ROOT, 'server/package.json'));
const { zodToJsonSchema } = serverRequire('zod-to-json-schema') as {
  zodToJsonSchema: (
    schema: ToolRegistryEntry['input_schema'],
    options: { target: 'jsonSchema7'; $refStrategy: 'none' },
  ) => ToolFaceJsonSchema;
};

const projectionFixture = [
  {
    name: 'public_probe',
    description: 'Public projection probe.',
    input_schema: listNotesInputSchema,
    output_schema: listNotesOutputSchema,
    truth: 'content',
    tier: 'immediate',
    human_entry: {
      route: 'GET /api/public-probe',
      client_call_site: 'client/public-probe#run',
    },
    exposure: 'public',
    scopes: ['public:read'],
  },
  {
    name: 'internal_probe',
    description: 'Internal projection probe.',
    input_schema: listNotesOutputSchema,
    output_schema: listNotesInputSchema,
    truth: 'knowledge',
    tier: 'propose',
    human_entry: {
      route: 'POST /api/internal-probe',
      client_call_site: 'client/internal-probe#run',
    },
    exposure: 'public',
    scopes: ['internal:write', 'internal:read'],
  },
  {
    name: 'test_probe',
    description: 'Test projection probe.',
    input_schema: listNotesInputSchema,
    output_schema: listNotesOutputSchema,
    truth: 'spatial',
    tier: 'confirm',
    human_entry: {
      route: 'PATCH /api/test-probe',
      client_call_site: 'client/test-probe#run',
    },
    exposure: 'test',
    scopes: ['test:write'],
  },
  {
    name: '__reserved_probe',
    description: 'Reserved-name projection probe.',
    input_schema: listNotesOutputSchema,
    output_schema: listNotesInputSchema,
    truth: 'provenance',
    tier: 'immediate',
    human_entry: {
      route: 'DELETE /api/reserved-probe',
      client_call_site: 'client/reserved-probe#run',
    },
    exposure: 'internal',
    scopes: ['reserved:delete'],
  },
] satisfies ToolRegistryEntry[];

const MANIFEST_FIELD_ORDER = [
  'name',
  'description',
  'input_schema',
  'output_schema',
  'truth',
  'tier',
  'human_entry',
  'exposure',
  'scopes',
];

test('buildToolFaceManifest faithfully projects every injected entry in original order', () => {
  const manifest = buildToolFaceManifest(projectionFixture);

  assert.equal(manifest.length, projectionFixture.length);
  assert.deepEqual(
    manifest.map((entry) => entry.name),
    projectionFixture.map((entry) => entry.name),
  );

  manifest.forEach((actual, index) => {
    const source = projectionFixture[index];
    assert.ok(source);
    assert.deepEqual(Object.keys(actual), MANIFEST_FIELD_ORDER);
    assert.equal(actual.name, source.name);
    assert.equal(actual.description, source.description);
    assert.deepEqual(actual.input_schema, zodToJsonSchema(source.input_schema, {
      target: 'jsonSchema7',
      $refStrategy: 'none',
    }));
    assert.deepEqual(actual.output_schema, zodToJsonSchema(source.output_schema, {
      target: 'jsonSchema7',
      $refStrategy: 'none',
    }));
    assert.equal(actual.truth, source.truth);
    assert.equal(actual.tier, source.tier);
    assert.deepEqual(actual.human_entry, source.human_entry);
    assert.equal(actual.exposure, source.exposure);
    assert.deepEqual(actual.scopes, source.scopes);
  });
});

test('renderManifest delegates production projection to the injected projector', () => {
  const spyProjection = [
    {
      name: 'spy_projection',
      description: 'Sentinel returned only by the injected projector.',
      input_schema: { type: 'object' },
      output_schema: { type: 'object' },
      truth: 'package',
      tier: 'confirm',
      human_entry: {
        route: 'POST /api/spy-projection',
        client_call_site: 'client/spy-projection#run',
      },
      exposure: 'internal',
      scopes: ['spy:project'],
    },
  ] satisfies ToolFaceManifest;
  let callCount = 0;
  let receivedEntries: readonly ToolRegistryEntry[] | undefined;
  const spyProjector = (entries: readonly ToolRegistryEntry[]): ToolFaceManifest => {
    callCount += 1;
    receivedEntries = entries;
    return spyProjection;
  };

  const rendered = renderManifest(projectionFixture, spyProjector);

  assert.equal(
    callCount,
    1,
    'renderManifest must call the production projector exactly once',
  );
  assert.strictEqual(
    receivedEntries,
    projectionFixture,
    'renderManifest must pass the same entries reference to the projector',
  );
  assert.equal(rendered, `${JSON.stringify(spyProjection, null, 2)}\n`);
});

function runManifestCli(
  outputPath: string,
  checkOnly: boolean,
): SpawnSyncReturns<string> {
  const npmExecPath = process.env.npm_execpath;
  assert.ok(npmExecPath, 'npm_execpath is required to spawn the production npm entry');
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    [TOOL_FACE_MANIFEST_TEST_OUTPUT_PATH_ENV]: outputPath,
  };

  const args = [npmExecPath, 'run', 'docs:tool-face-manifest'];
  if (checkOnly) args.push('--', '--check');
  return spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env,
    timeout: 60_000,
    windowsHide: true,
  });
}

function spawnReceipt(result: SpawnSyncReturns<string>): string {
  return [
    `exit=${String(result.status)}`,
    result.stdout,
    result.stderr,
    result.error?.stack,
  ].filter(Boolean).join('\n');
}

function assertCompleted(result: SpawnSyncReturns<string>): void {
  assert.equal(result.error, undefined, spawnReceipt(result));
  assert.equal(result.signal, null, spawnReceipt(result));
  assert.equal(typeof result.status, 'number', spawnReceipt(result));
}

function assertFresh(outputPath: string): void {
  const generated = runManifestCli(outputPath, false);
  assertCompleted(generated);
  assert.equal(generated.status, 0, spawnReceipt(generated));

  const checked = runManifestCli(outputPath, true);
  assertCompleted(checked);
  assert.equal(checked.status, 0, spawnReceipt(checked));
  assert.match(checked.stdout, /manifest 未过期/);
}

function withTempManifest(run: (outputPath: string) => void): void {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-tool-face-manifest-'));
  try {
    run(join(tempRoot, 'tool-face-manifest.json'));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('production docs:tool-face-manifest -- --check freshness wiring', async (t) => {
  await t.test('fresh artifact: the production check entry exits zero', () => {
    withTempManifest((outputPath) => {
      assertFresh(outputPath);
    });
  });

  await t.test('missing artifact: the same probe sees fresh first, then exits nonzero', () => {
    withTempManifest((outputPath) => {
      assertFresh(outputPath);
      unlinkSync(outputPath);

      const missing = runManifestCli(outputPath, true);
      assertCompleted(missing);
      assert.notEqual(missing.status, 0, spawnReceipt(missing));
      assert.match(`${missing.stdout}\n${missing.stderr}`, /过期/);
    });
  });

  await t.test('stale artifact: the same probe sees fresh first, then exits nonzero', () => {
    withTempManifest((outputPath) => {
      assertFresh(outputPath);
      writeFileSync(outputPath, '{"stale":true}\n', 'utf8');

      const stale = runManifestCli(outputPath, true);
      assertCompleted(stale);
      assert.notEqual(stale.status, 0, spawnReceipt(stale));
      assert.match(`${stale.stdout}\n${stale.stderr}`, /过期/);
    });
  });
});
