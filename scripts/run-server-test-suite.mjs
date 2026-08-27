import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function runTestSuite(testFiles, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', '--test', ...testFiles],
      {
        cwd: process.cwd(),
        env,
        stdio: 'inherit',
        windowsHide: true,
      },
    );

    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (typeof code === 'number') {
        resolve(code);
        return;
      }
      reject(new Error(`Server test process exited without a code${signal ? ` (signal: ${signal})` : ''}`));
    });
  });
}

let exitCode = 1;
let temporaryRoot;

try {
  temporaryRoot = mkdtempSync(join(tmpdir(), 'coincides-server-tests-'));
  const canvasAssetDir = join(temporaryRoot, 'canvas-assets');
  const sourceBlobDir = join(temporaryRoot, 'source-blobs');
  mkdirSync(canvasAssetDir, { recursive: true });
  mkdirSync(sourceBlobDir, { recursive: true });

  exitCode = await runTestSuite(process.argv.slice(2), {
    ...process.env,
    CANVAS_ASSET_DIR: canvasAssetDir,
    SOURCE_BLOB_DIR: sourceBlobDir,
  });
} catch (error) {
  console.error(`[server-test-suite] ${errorMessage(error)}`);
} finally {
  if (temporaryRoot) {
    try {
      rmSync(temporaryRoot, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `[server-test-suite] Failed to remove temporary asset root "${temporaryRoot}": ${errorMessage(error)}`,
      );
    }
  }
}

process.exitCode = exitCode;
