import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const IPC_ERROR = 'Unable to deserialize cloned data due to invalid or unsupported version.';

// A second Node reporter supplies structured diagnostics without parsing test stdout.
// Emit only after the stream finishes, so an incomplete report cannot recover a red run.
export default async function* diagnosticsReporter(source) {
  const failures = [];
  let summary;
  for await (const { type, data } of source) {
    if (type === 'test:fail' && data.todo === undefined && data.skip === undefined) {
      const error = data.details?.error;
      failures.push({
        file: data.file,
        name: data.name,
        line: data.line,
        column: data.column,
        nesting: data.nesting,
        failureType: error?.failureType,
        message: error?.cause?.message ?? error?.message,
        errorCode: error?.cause?.code ?? error?.code,
      });
    } else if (type === 'test:summary' && data.file === undefined) {
      summary = data;
    }
  }
  yield JSON.stringify({ complete: true, failures, summary }) + '\n';
}

function isIpcFileFailure(failure) {
  return typeof failure.file === 'string'
    && typeof failure.name === 'string'
    && resolve(failure.name) === resolve(failure.file)
    && failure.nesting === 0
    && failure.line === 1
    && failure.column === 1
    && failure.failureType === 'uncaughtException'
    && failure.errorCode !== 'ERR_ASSERTION'
    && failure.message === IPC_ERROR;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function runTestSuite(testFiles, env, reportPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--import', 'tsx', '--test',
        `--test-reporter=${process.stdout.isTTY ? 'spec' : 'tap'}`,
        '--test-reporter-destination=stdout',
        `--test-reporter=${import.meta.url}`,
        `--test-reporter-destination=${reportPath}`,
        ...testFiles,
      ],
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
        try {
          const report = JSON.parse(readFileSync(reportPath, 'utf8'));
          if (report.complete !== true || !Array.isArray(report.failures)) {
            throw new Error('Missing completed server test diagnostics');
          }
          resolve({ code, ...report });
        } catch (error) {
          reject(error);
        }
        return;
      }
      reject(new Error(`Server test process exited without a code${signal ? ` (signal: ${signal})` : ''}`));
    });
  });
}

async function main() {
  let exitCode = 1;
  let temporaryRoot;
  let flakyRetries = 0;
  let recovered = 0;

  try {
    temporaryRoot = mkdtempSync(join(tmpdir(), 'coincides-server-tests-'));
    const canvasAssetDir = join(temporaryRoot, 'canvas-assets');
    const sourceBlobDir = join(temporaryRoot, 'source-blobs');
    mkdirSync(canvasAssetDir, { recursive: true });
    mkdirSync(sourceBlobDir, { recursive: true });

    const env = {
      ...process.env,
      CANVAS_ASSET_DIR: canvasAssetDir,
      SOURCE_BLOB_DIR: sourceBlobDir,
    };
    const initial = await runTestSuite(process.argv.slice(2), env, join(temporaryRoot, 'initial.json'));
    exitCode = initial.code;
    // Early Node 22 releases have no test:summary. Preserve their normal exit code;
    // without failure totals, a red run cannot safely be promoted to green.
    if (initial.code !== 0 && !initial.summary?.counts) {
      console.warn('[server-test-suite] Missing test:summary; preserving failure without retry.');
    }
    if (initial.code === 1 && initial.summary?.counts) {
      const candidates = initial.failures.filter(isIpcFileFailure);
      const files = [...new Set(candidates.map((failure) => resolve(failure.file)))];
      for (const file of files) {
        flakyRetries += 1;
        console.warn(`[server-test-suite] FLAKY retry ${file}: ${IPC_ERROR} (isolated attempt 1/1)`);
        // Call the primitive directly: even the same IPC error cannot trigger a second retry.
        try {
          const retry = await runTestSuite([file], env, join(temporaryRoot, `retry-${flakyRetries}.json`));
          const passed = retry.code === 0 && retry.summary?.success === true && retry.failures.length === 0;
          if (passed) recovered += 1;
          console.warn(`[server-test-suite] FLAKY ${file}: ${IPC_ERROR} retry=${passed ? 'PASS' : 'FAIL'}`);
        } catch (error) {
          console.warn(`[server-test-suite] FLAKY ${file}: ${IPC_ERROR} retry=ERROR (${errorMessage(error)})`);
          throw error;
        }
      }
      // A recovered file must never erase an assertion failure elsewhere (or a cancelled test).
      if (files.length > 0 && recovered === files.length
        && candidates.length === initial.failures.length
        && initial.summary.counts.failed === candidates.length
        && initial.summary.counts.cancelled === 0) {
        exitCode = 0;
      }
    }
  } catch (error) {
    exitCode = 1;
    console.error(`[server-test-suite] ${errorMessage(error)}`);
  } finally {
    console.log(`# flaky-retries ${flakyRetries}`);
    if (flakyRetries > 0) {
      console.log(`# server-test-suite recovered ${recovered}/${flakyRetries}; result ${exitCode === 0 ? 'PASS' : 'FAIL'}`);
    }
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
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
