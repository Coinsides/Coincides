import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SERVER_ROOT = resolve(REPO_ROOT, 'server');
const NPM_CLI = process.env.npm_execpath;

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function runBuildWithCopyFixture(source: string, destination: string) {
  const command = NPM_CLI
    ? process.execPath
    : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = NPM_CLI ? [NPM_CLI, 'run', 'build'] : ['run', 'build'];
  return spawnSync(command, args, {
    cwd: SERVER_ROOT,
    encoding: 'utf8',
    shell: !NPM_CLI && process.platform === 'win32',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      TOOL_FACE_COPY_TEST_SOURCE: source,
      TOOL_FACE_COPY_TEST_DESTINATION: destination,
    },
  });
}

function runMinimalLoader(loaderPath: string, cwd: string) {
  const loaderUrl = pathToFileURL(loaderPath).href;
  return spawnSync(process.execPath, [
    '--input-type=module',
    '--eval',
    `const m = await import(${JSON.stringify(loaderUrl)}); process.stdout.write(JSON.stringify(m.loadToolFaceManifest()));`,
  ], {
    cwd,
    encoding: 'utf8',
  });
}

test('K-6 build copies byte-identical manifest and compiled loader starts without docs from arbitrary cwd', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-mcp-artifact-k6-'));
  try {
    const sourcePath = join(tempRoot, 'source-manifest.json');
    const productionRoot = join(tempRoot, 'minimal-production');
    const destinationPath = join(productionRoot, 'dist', 'tool-face-manifest.json');
    const arbitraryCwd = join(tempRoot, 'unrelated-cwd');
    const sourceBytes = Buffer.from('[{"name":"public_probe","exposure":"public"}]\n', 'utf8');
    writeFileSync(sourcePath, sourceBytes);
    mkdirSync(arbitraryCwd, { recursive: true });

    const build = runBuildWithCopyFixture(sourcePath, destinationPath);
    assert.equal(build.status, 0, `${build.error ?? ''}\n${build.stdout}\n${build.stderr}`);
    assert.ok(existsSync(destinationPath), 'build copy step must create the artifact');

    const destinationBytes = readFileSync(destinationPath);
    assert.deepEqual(destinationBytes, sourceBytes);
    assert.equal(sha256(destinationBytes), sha256(sourceBytes));

    const compiledLoader = resolve(SERVER_ROOT, 'dist/mcp/manifest.js');
    const minimalLoader = join(productionRoot, 'dist', 'mcp', 'manifest.js');
    mkdirSync(dirname(minimalLoader), { recursive: true });
    copyFileSync(compiledLoader, minimalLoader);
    writeFileSync(join(productionRoot, 'package.json'), '{"type":"module"}\n', 'utf8');
    assert.equal(existsSync(join(productionRoot, 'docs')), false);

    const compiledSource = readFileSync(minimalLoader, 'utf8');
    assert.doesNotMatch(compiledSource, /process\.cwd|docs[/\\]generated|toolFace\/registry/);
    assert.match(compiledSource, /\.\.\/\.\.\/dist\/tool-face-manifest\.json/);

    const started = runMinimalLoader(minimalLoader, arbitraryCwd);
    assert.equal(started.status, 0, started.stderr);
    assert.deepEqual(JSON.parse(started.stdout), [{ name: 'public_probe', exposure: 'public' }]);

    const missingRoot = join(tempRoot, 'missing-artifact-production');
    const missingLoader = join(missingRoot, 'dist', 'mcp', 'manifest.js');
    mkdirSync(dirname(missingLoader), { recursive: true });
    copyFileSync(compiledLoader, missingLoader);
    writeFileSync(join(missingRoot, 'package.json'), '{"type":"module"}\n', 'utf8');
    const missing = runMinimalLoader(missingLoader, arbitraryCwd);
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /ENOENT/);
    assert.doesNotMatch(missing.stderr, /ERR_MODULE_NOT_FOUND/);

    const corruptRoot = join(tempRoot, 'corrupt-artifact-production');
    const corruptLoader = join(corruptRoot, 'dist', 'mcp', 'manifest.js');
    mkdirSync(dirname(corruptLoader), { recursive: true });
    copyFileSync(compiledLoader, corruptLoader);
    writeFileSync(join(corruptRoot, 'package.json'), '{"type":"module"}\n', 'utf8');
    writeFileSync(join(corruptRoot, 'dist', 'tool-face-manifest.json'), '{not-json', 'utf8');
    const corrupt = runMinimalLoader(corruptLoader, arbitraryCwd);
    assert.notEqual(corrupt.status, 0);
    assert.match(corrupt.stderr, /SyntaxError/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('K-7 build artifact retains internal, test, and public __ entries byte-for-byte', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-mcp-artifact-k7-'));
  try {
    const sourcePath = join(tempRoot, 'source-manifest.json');
    const destinationPath = join(tempRoot, 'artifact', 'dist', 'tool-face-manifest.json');
    const manifest = [
      { name: 'public_probe', exposure: 'public' },
      { name: 'internal_probe', exposure: 'internal' },
      { name: 'test_probe', exposure: 'test' },
      { name: '__reserved_probe', exposure: 'public' },
    ];
    const sourceBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    writeFileSync(sourcePath, sourceBytes);
    assert.deepEqual(
      manifest.map((entry) => entry.name),
      ['public_probe', 'internal_probe', 'test_probe', '__reserved_probe'],
      'source fixture positive control must contain every non-public/reserved target',
    );

    const build = runBuildWithCopyFixture(sourcePath, destinationPath);
    assert.equal(build.status, 0, `${build.error ?? ''}\n${build.stdout}\n${build.stderr}`);
    const destinationBytes = readFileSync(destinationPath);
    assert.deepEqual(destinationBytes, sourceBytes);
    assert.equal(sha256(destinationBytes), sha256(sourceBytes));
    assert.deepEqual(
      (JSON.parse(destinationBytes.toString('utf8')) as Array<{ name: string }>).map((entry) => entry.name),
      ['public_probe', 'internal_probe', 'test_probe', '__reserved_probe'],
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
