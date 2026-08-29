import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import express from 'express';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { errorHandler } from '../middleware/errorHandler.js';
import sourceRoutes from '../routes/sources.js';
import {
  SourceArtifactError,
  parseSourceArtifact,
  registerSourceParserForTesting,
  type SourceArtifact,
  type SourceParser,
} from '../services/sourceArtifact.js';
import {
  getSourceRecordDetail,
  intakeSourceTempFile,
} from '../services/sourceFileIntake.js';
import {
  materializeSourceNow,
  waitForScheduledSourceMaterializations,
} from '../services/sourceMaterialization.js';
import {
  MINERU_MAX_PDF_PAGES,
  MINERU_MS_PER_PAGE,
  MINERU_TIMEOUT_MS,
} from '../services/sourceMineruParser.js';

type TestDb = Awaited<ReturnType<typeof initDb>>;

const execFileAsync = promisify(execFile);
const MINERU_LOCKFILE_URL = new URL('../../../_external_tools/mineru/uv.lock', import.meta.url);
const SERVER_LOCKFILE_URL = new URL('../../package-lock.json', import.meta.url);
const ENV_KEYS = [
  'COINCIDES_PDF_PARSER',
  'COINCIDES_MINERU_COMMAND_JSON',
  'COINCIDES_MINERU_COMMAND_TIMEOUT_MS',
  'COINCIDES_MINERU_LANGUAGE',
  'COINCIDES_MINERU_PYTHON',
  'SOURCE_BLOB_DIR',
  'CANVAS_ASSET_DIR',
] as const;
const PYTHON_EXECUTABLE = process.platform === 'win32'
  ? execFileSync('python.exe', ['-c', 'import sys; print(sys.executable)'], { encoding: 'utf8' }).trim()
  : 'python3';

const FIXTURE_SOURCE = String.raw`from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import time


if len(sys.argv) >= 2 and sys.argv[1] == "grandchild":
    with Path(sys.argv[3]).open("a", encoding="utf-8") as stream:
        stream.write(f"grandchild:{os.getpid()}\n")
    while True:
        time.sleep(60)

mode, token, marker, version, delay_ms = sys.argv[1:6]
Path(marker).parent.mkdir(parents=True, exist_ok=True)
with Path(marker).open("a", encoding="utf-8") as stream:
    stream.write(f"{mode}:{os.getpid()}\n")

parser = argparse.ArgumentParser()
parser.add_argument("--input", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--result", required=True)
parser.add_argument("--lang", required=True)
args = parser.parse_args(sys.argv[6:])

if mode == "hang":
    subprocess.Popen([sys.executable, str(Path(__file__)), "grandchild", token, marker])
    while True:
        time.sleep(60)
if mode == "crash":
    subprocess.Popen([sys.executable, str(Path(__file__)), "grandchild", token, marker])
    time.sleep(0.2)
    os.abort()
if mode == "nonzero":
    print("fixture requested explicit exit 17", file=sys.stderr, flush=True)
    raise SystemExit(17)
if mode == "delay":
    time.sleep(int(delay_ms) / 1000)

Path(args.output).mkdir(parents=True, exist_ok=True)
Path(args.result).write_text(json.dumps({
    "protocol": "coincides-mineru.v1",
    "mineru_version": version,
    "content_list": [] if mode == "empty" else [{
        "type": "text",
        "text": f"MinerU fixture {token}",
        "text_level": 1,
        "page_idx": 0,
        "bbox": [10, 20, 900, 120],
    }],
}), encoding="utf-8")
`;

interface FixtureCommand {
  token: string;
  scriptPath: string;
  markerPath: string;
  command: string;
}

function sha256Raw(url: URL): string {
  return createHash('sha256').update(readFileSync(url)).digest('hex');
}

function expectedMineruVersion(): string {
  const lockfile = readFileSync(MINERU_LOCKFILE_URL, 'utf8');
  const blocks = lockfile.split(/(?=^\[\[package\]\]\r?$)/m);
  for (const block of blocks) {
    if (!/^name = "mineru"\r?$/m.test(block)) continue;
    const version = /^version = "([^"]+)"\r?$/m.exec(block)?.[1];
    if (version) return version;
  }
  throw new Error('Test could not independently locate the MinerU version in uv.lock');
}

function makeFixtureCommand(
  directory: string,
  mode: 'success' | 'delay' | 'hang' | 'crash' | 'nonzero' | 'empty',
  delayMs = 0,
): FixtureCommand {
  const token = uuidv4();
  const scriptPath = join(directory, `mineru-fixture-${token}.py`);
  const markerPath = join(directory, `mineru-marker-${token}.txt`);
  writeFileSync(scriptPath, FIXTURE_SOURCE, 'utf8');
  return {
    token,
    scriptPath,
    markerPath,
    command: JSON.stringify([
      PYTHON_EXECUTABLE,
      scriptPath,
      mode,
      token,
      markerPath,
      expectedMineruVersion(),
      String(delayMs),
    ]),
  };
}

function useFixture(command: FixtureCommand, timeoutMs?: number): void {
  process.env.COINCIDES_MINERU_COMMAND_JSON = command.command;
  if (timeoutMs === undefined) delete process.env.COINCIDES_MINERU_COMMAND_TIMEOUT_MS;
  else process.env.COINCIDES_MINERU_COMMAND_TIMEOUT_MS = String(timeoutMs);
}

async function taggedPythonPids(token: string): Promise<number[]> {
  if (process.platform === 'win32') {
    const script = [
      `$needle = '${token}'`,
      "Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^python(w|3([.]\\d+)?)?[.]exe$' -and $_.CommandLine -like ('*' + $needle + '*') } | ForEach-Object { $_.ProcessId }",
    ].join('; ');
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', script]);
    return stdout.split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map(Number)
      .filter(Number.isInteger);
  }
  const { stdout } = await execFileAsync('ps', ['-eo', 'pid=,comm=,args=']);
  return stdout.split(/\r?\n/).flatMap((line) => {
    if (!line.includes(token) || !/\bpython(?:3(?:\.\d+)?)?\b/i.test(line)) return [];
    const pid = Number(/^\s*(\d+)/.exec(line)?.[1]);
    return Number.isInteger(pid) ? [pid] : [];
  });
}

async function killTaggedPython(token: string): Promise<void> {
  for (const pid of await taggedPythonPids(token)) {
    try {
      if (process.platform === 'win32') {
        await execFileAsync('taskkill.exe', ['/PID', String(pid), '/T', '/F']);
      } else {
        process.kill(pid, 'SIGKILL');
      }
    } catch {
      // A parent tree kill can make a later child PID disappear between observation and cleanup.
    }
  }
}

async function waitForValue<T>(
  read: () => Promise<T>,
  accepted: (value: T) => boolean,
  timeoutMs = 8_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (!accepted(value) && Date.now() < deadline) {
    await delay(40);
    value = await read();
  }
  assert.equal(accepted(value), true, `Condition was not observed before ${timeoutMs}ms`);
  return value;
}

async function makePdf(pageTexts: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const text of pageTexts) {
    const page = pdf.addPage([595, 842]);
    page.drawText(text, { x: 72, y: 760, size: 14, font });
  }
  return Buffer.from(await pdf.save());
}

function seedUserCourse(db: TestDb) {
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at)
    VALUES (?, ?, 'hash', 'MinerU Wiring User', datetime('now'))
  `).run(userId, `${userId}@example.com`);
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, 'MinerU Wiring Project', datetime('now'), datetime('now'))
  `).run(courseId, userId);
  return { userId, courseId };
}

async function intake(
  db: TestDb,
  userId: string,
  courseId: string,
  sourceRootDir: string,
  filename: string,
  bytes: Buffer,
  mimeType: string,
) {
  const tempDir = join(sourceRootDir, '.tmp');
  mkdirSync(tempDir, { recursive: true });
  const tempPath = join(tempDir, `${uuidv4()}.upload`);
  writeFileSync(tempPath, bytes);
  return await intakeSourceTempFile(db, userId, {
    course_id: courseId,
    origin_entry_kind: 'project_upload',
    file: {
      path: tempPath,
      originalname: filename,
      mimetype: mimeType,
      size: bytes.length,
    },
  }, { rootDir: sourceRootDir });
}

async function withDbAndStorage(
  run: (context: {
    directory: string;
    db: TestDb;
    userId: string;
    courseId: string;
    sourceRootDir: string;
    canvasAssetRootDir: string;
  }) => Promise<void>,
): Promise<void> {
  const directory = mkdtempSync(join(tmpdir(), 'coincides-mineru-wiring-'));
  const sourceRootDir = join(directory, 'source-blobs');
  const canvasAssetRootDir = join(directory, 'canvas-assets');
  const environment = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  try {
    const db = await initDb(join(directory, 'test.db'));
    const { userId, courseId } = seedUserCourse(db);
    process.env.SOURCE_BLOB_DIR = sourceRootDir;
    process.env.CANVAS_ASSET_DIR = canvasAssetRootDir;
    await run({ directory, db, userId, courseId, sourceRootDir, canvasAssetRootDir });
  } finally {
    await waitForScheduledSourceMaterializations().catch(() => undefined);
    if (existsSync(directory)) {
      for (const entry of readdirSync(directory)) {
        const token = /^mineru-fixture-([0-9a-f-]+)[.]py$/i.exec(entry)?.[1];
        if (token) await killTaggedPython(token);
      }
    }
    closeDb();
    for (const key of ENV_KEYS) {
      const value = environment.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(directory, { recursive: true, force: true });
  }
}

async function startSourceServer(userId: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as { userId?: string }).userId = userId;
    next();
  });
  app.use('/api/sources', sourceRoutes);
  app.use(errorHandler);
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const running = app.listen(0, () => resolve(running));
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    baseUrl: `http://127.0.0.1:${address.port}/api/sources`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => error ? reject(error) : resolve());
    }),
  };
}

test('K-7 off preserves native-pdf selection and K-8 preserves its package-lock identity bytes', async () => {
  await withDbAndStorage(async ({ db, userId, courseId, sourceRootDir, canvasAssetRootDir }) => {
    delete process.env.COINCIDES_PDF_PARSER;
    const uploaded = await intake(
      db,
      userId,
      courseId,
      sourceRootDir,
      'native-default.pdf',
      await makePdf(['Native PDF remains the default']),
      'application/pdf',
    );
    assert.equal(uploaded.source.materialization.parser_key, 'native-pdf');
    assert.equal(uploaded.source.materialization.parser_version, '2.4.5');

    const result = await materializeSourceNow(db, userId, uploaded.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
    });
    assert.equal(result.status, 'materialized');
    const imprint = db.prepare(`
      SELECT transcriber_name, transcriber_version, transcriber_lockfile,
             transcriber_lockfile_hash, anchor_fidelity, status
      FROM source_imprints WHERE source_file_id = ?
    `).get(uploaded.source.file.id) as Record<string, unknown>;
    assert.deepEqual(imprint, {
      transcriber_name: 'native-pdf',
      transcriber_version: '2.4.5',
      transcriber_lockfile: 'server/package-lock.json',
      transcriber_lockfile_hash: sha256Raw(SERVER_LOCKFILE_URL),
      anchor_fidelity: 'page',
      status: 'accepted',
    });
  });
});

test('K-1/K-3/K-9 calibrate 9 pages and kill a timed-out Python process tree before returning', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'coincides-mineru-process-'));
  const environment = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
  const fixtures: FixtureCommand[] = [];
  try {
    assert.equal(Math.floor(120_000 / 13_180), 9);
    assert.equal(MINERU_TIMEOUT_MS, 120_000);
    assert.equal(MINERU_MS_PER_PAGE, 13_180);
    assert.equal(MINERU_MAX_PDF_PAGES, 9);

    const overLimitPdf = join(directory, 'ten-pages.pdf');
    writeFileSync(overLimitPdf, await makePdf(Array.from({ length: 10 }, (_, index) => `Page ${index + 1}`)));
    const shouldNotRun = makeFixtureCommand(directory, 'success');
    fixtures.push(shouldNotRun);
    useFixture(shouldNotRun);
    await assert.rejects(parseSourceArtifact({
      parser_key: 'mineru',
      parser_version: expectedMineruVersion(),
      file_path: overLimitPdf,
      original_filename: 'ten-pages.pdf',
      mime_type: 'application/pdf',
    }), (error: unknown) => (
      error instanceof SourceArtifactError
      && error.code === 'resource_limit'
      && error.retryable === false
    ));
    assert.equal(existsSync(shouldNotRun.markerPath), false, 'page limit must fire before spawning Python');

    const onePagePdf = join(directory, 'one-page.pdf');
    writeFileSync(onePagePdf, await makePdf(['Timeout tree probe']));
    const hanging = makeFixtureCommand(directory, 'hang');
    fixtures.push(hanging);
    useFixture(hanging);
    const baseline = (await taggedPythonPids(hanging.token)).length;
    assert.equal(baseline, 0);
    let captured: SourceArtifactError | undefined;
    const rejection = assert.rejects(parseSourceArtifact({
      parser_key: 'mineru',
      parser_version: expectedMineruVersion(),
      file_path: onePagePdf,
      original_filename: 'one-page.pdf',
      mime_type: 'application/pdf',
    }, { limits: { timeoutMs: 1_500 } }), (error: unknown) => {
      if (error instanceof SourceArtifactError) captured = error;
      return error instanceof SourceArtifactError
        && error.code === 'internal_interrupted'
        && error.retryable === true;
    });
    const during = await waitForValue(
      async () => (await taggedPythonPids(hanging.token)).length,
      (count) => count >= baseline + 2,
    );
    await rejection;
    const after = await waitForValue(
      async () => (await taggedPythonPids(hanging.token)).length,
      (count) => count === baseline,
    );
    assert.equal(during >= baseline + 2, true);
    assert.equal(after, baseline);
    assert.equal(captured?.code, 'internal_interrupted');
    assert.notEqual(captured?.code, 'resource_limit');
    console.info(`[mineru-wiring] K-1 tagged Python processes: ${baseline} -> ${during} -> ${after}`);
    console.info('[mineru-wiring] K-3/K-9 directions: page overflow=resource_limit, timeout=internal_interrupted');
  } finally {
    for (const fixture of fixtures) await killTaggedPython(fixture.token);
    for (const key of ENV_KEYS) {
      const value = environment.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(directory, { recursive: true, force: true });
  }
});

test('K-4 keeps three production MinerU materializations at concurrency 1 without serializing native text', async () => {
  await withDbAndStorage(async ({ directory, db, userId, courseId, sourceRootDir, canvasAssetRootDir }) => {
    process.env.COINCIDES_PDF_PARSER = 'mineru';
    const fixture = makeFixtureCommand(directory, 'delay', 2_500);
    useFixture(fixture, 8_000);
    const uploads = await Promise.all([1, 2, 3].map(async (number) => intake(
      db,
      userId,
      courseId,
      sourceRootDir,
      `concurrent-${number}.pdf`,
      await makePdf([`Distinct concurrent PDF ${number}`]),
      'application/pdf',
    )));
    assert.deepEqual(uploads.map((entry) => entry.source.materialization.parser_key), ['mineru', 'mineru', 'mineru']);

    let settled = false;
    const all = Promise.all(uploads.map((entry) => materializeSourceNow(db, userId, entry.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
    })));
    void all.finally(() => { settled = true; }).catch(() => undefined);
    let peak = 0;
    const sampleProcessCount = async () => {
      const count = (await taggedPythonPids(fixture.token)).length;
      peak = Math.max(peak, count);
      return count;
    };
    await waitForValue(
      sampleProcessCount,
      (count) => count >= 1,
    );

    const textUpload = await intake(
      db,
      userId,
      courseId,
      sourceRootDir,
      'light-parser.txt',
      Buffer.from('Light parser must bypass the MinerU gate', 'utf8'),
      'text/plain',
    );
    const textResult = await materializeSourceNow(db, userId, textUpload.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
    });
    assert.equal(textResult.status, 'materialized');
    assert.equal(await sampleProcessCount(), 1, 'native text completed while MinerU still held its slot');

    while (!settled) {
      await sampleProcessCount();
      await delay(40);
    }
    const results = await all;
    await sampleProcessCount();
    assert.equal(peak, 1);
    assert.deepEqual(results.map((result) => result.status), ['materialized', 'materialized', 'materialized']);
    assert.equal(new Set(results.map((result) => result.projection_note_id)).size, 3);
    assert.equal(await waitForValue(
      async () => (await taggedPythonPids(fixture.token)).length,
      (count) => count === 0,
    ), 0);
    console.info(`[mineru-wiring] K-4 MinerU peak=${peak}, completed=${results.length}, final=0`);
  });
});

test('K-5/K-7-on/K-2 contain crash, timeout and nonzero exit, then publish with the raw uv.lock identity', async () => {
  await withDbAndStorage(async ({ directory, db, userId, courseId, sourceRootDir }) => {
    process.env.COINCIDES_PDF_PARSER = 'mineru';
    const server = await startSourceServer(userId);
    try {
      const failures: Array<{
        mode: 'crash' | 'hang' | 'nonzero' | 'empty';
        expectedCode: 'parser_failure' | 'internal_interrupted';
        message: RegExp;
      }> = [
        { mode: 'crash', expectedCode: 'parser_failure', message: /exited abnormally/i },
        { mode: 'hang', expectedCode: 'internal_interrupted', message: /timed out.*process tree/i },
        { mode: 'nonzero', expectedCode: 'parser_failure', message: /code 17.*explicit exit 17/i },
        { mode: 'empty', expectedCode: 'parser_failure', message: /no usable text blocks/i },
      ];

      for (const [index, failure] of failures.entries()) {
        const fixture = makeFixtureCommand(directory, failure.mode);
        useFixture(fixture, 1_000);
        const uploaded = await intake(
          db,
          userId,
          courseId,
          sourceRootDir,
          `${failure.mode}-${index}.pdf`,
          await makePdf([`Failure mode ${failure.mode} ${index}`]),
          'application/pdf',
        );
        assert.equal(uploaded.source.materialization.parser_key, 'mineru');
        const response = await fetch(`${server.baseUrl}/${uploaded.source.id}/materialize`, { method: 'POST' });
        assert.equal(response.status, 202);
        assert.equal(response.status < 500, true);
        await waitForScheduledSourceMaterializations();

        const run = db.prepare(`
          SELECT status, error_code, error_message, projection_note_id
          FROM source_materializations WHERE source_record_id = ?
        `).get(uploaded.source.id) as {
          status: string;
          error_code: string;
          error_message: string;
          projection_note_id: string | null;
        };
        assert.equal(run.status, 'failed');
        assert.equal(run.error_code, failure.expectedCode);
        assert.match(run.error_message, failure.message);
        assert.equal(run.projection_note_id, null);
        const sourceFile = db.prepare(`
          SELECT id, storage_state, storage_key FROM source_files WHERE source_record_id = ?
        `).get(uploaded.source.id) as { id: string; storage_state: string; storage_key: string };
        assert.equal(sourceFile.storage_state, 'ready');
        assert.equal(existsSync(join(sourceRootDir, sourceFile.storage_key)), true);
        assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_records WHERE id = ?')
          .get(uploaded.source.id) as { count: number }).count, 1);
        assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ?')
          .get(sourceFile.id) as { count: number }).count, 0);
        assert.equal(getSourceRecordDetail(db, userId, uploaded.source.id, { rootDir: sourceRootDir })
          .materialization.retryable, true);
        await waitForValue(
          async () => (await taggedPythonPids(fixture.token)).length,
          (count) => count === 0,
        );
        if (failure.mode === 'crash') {
          assert.match(readFileSync(fixture.markerPath, 'utf8'), /grandchild:/);
        }
      }

      const successFixture = makeFixtureCommand(directory, 'success');
      useFixture(successFixture, 2_000);
      const successful = await intake(
        db,
        userId,
        courseId,
        sourceRootDir,
        'mineru-success.pdf',
        await makePdf(['MinerU success production path']),
        'application/pdf',
      );
      assert.equal(successful.source.file.format, 'pdf');
      assert.equal(successful.source.file.capability, 'materializable');
      assert.equal(successful.source.materialization.parser_key, 'mineru');
      assert.equal(successful.source.materialization.parser_version, expectedMineruVersion());
      const response = await fetch(`${server.baseUrl}/${successful.source.id}/materialize`, { method: 'POST' });
      assert.equal(response.status, 202);
      await waitForScheduledSourceMaterializations();

      const run = db.prepare(`
        SELECT status, projection_note_id FROM source_materializations WHERE source_record_id = ?
      `).get(successful.source.id) as { status: string; projection_note_id: string | null };
      assert.equal(run.status, 'materialized');
      assert.ok(run.projection_note_id);
      const imprint = db.prepare(`
        SELECT id, transcriber_name, transcriber_version, transcriber_lockfile,
               transcriber_lockfile_hash, anchor_fidelity, status, fragment_count
        FROM source_imprints WHERE source_file_id = ?
      `).get(successful.source.file.id) as {
        id: string;
        transcriber_name: string;
        transcriber_version: string;
        transcriber_lockfile: string;
        transcriber_lockfile_hash: string;
        anchor_fidelity: string;
        status: string;
        fragment_count: number;
      };
      assert.equal(imprint.transcriber_name, 'mineru');
      assert.equal(imprint.transcriber_version, expectedMineruVersion());
      assert.equal(imprint.transcriber_lockfile, '_external_tools/mineru/uv.lock');
      assert.equal(imprint.transcriber_lockfile_hash, sha256Raw(MINERU_LOCKFILE_URL));
      assert.equal(imprint.anchor_fidelity, 'page');
      assert.equal(imprint.status, 'accepted');
      assert.equal(imprint.fragment_count, 1);
      const fragment = db.prepare('SELECT anchor_json FROM imprint_fragments WHERE imprint_id = ?')
        .get(imprint.id) as { anchor_json: string };
      assert.deepEqual(JSON.parse(fragment.anchor_json), {
        family: 'page',
        page: 1,
        block_index: 1,
      });
      assert.equal((db.prepare(`
        SELECT COUNT(*) AS count FROM notes WHERE id = ? AND note_class = 'source_projection'
      `).get(run.projection_note_id) as { count: number }).count, 1);
      assert.equal((db.prepare(`
        SELECT COUNT(*) AS count FROM operation_batches
        WHERE source_type = 'source_materialization'
      `).get() as { count: number }).count, 1);
    } finally {
      await server.close();
    }
  });
});

test('K-8 rejects a registered parser with no identity instead of falling back to package-lock.json', async () => {
  await withDbAndStorage(async ({ db, userId, courseId, sourceRootDir, canvasAssetRootDir }) => {
    let parserCalls = 0;
    const identitylessParser: SourceParser = {
      key: 'registered-without-identity',
      async parse(input): Promise<SourceArtifact> {
        parserCalls += 1;
        return {
          schema_version: 'source-artifact.v1',
          artifact_kind: 'document',
          parser_key: input.parser_key,
          parser_version: input.parser_version,
          blocks: [{
            artifact_block_id: 'identityless-1',
            kind: 'text',
            text: 'Identityless parser output',
            writing_role: 'paragraph',
            page_index: null,
            locator: { kind: 'identityless_paragraph', index: 1 },
            metadata: {},
          }],
          metadata: {},
        };
      },
    };
    const uploaded = await intake(
      db,
      userId,
      courseId,
      sourceRootDir,
      'identity-host.txt',
      Buffer.from('Identity host', 'utf8'),
      'text/plain',
    );
    db.prepare(`
      UPDATE source_materializations SET parser_key = ?, parser_version = ?
      WHERE source_record_id = ?
    `).run(identitylessParser.key, 'test-v1', uploaded.source.id);
    const unregister = registerSourceParserForTesting(identitylessParser);
    try {
      const result = await materializeSourceNow(db, userId, uploaded.source.id, {
        sourceRootDir,
        canvasAssetRootDir,
      });
      assert.equal(parserCalls, 1, 'materialization dispatched through the registered parser');
      assert.equal(result.status, 'failed');
      assert.equal(result.error_code, 'parser_failure');
      assert.match(result.error_message || '', /no transcriber identity declaration/i);
      assert.equal(result.projection_note_id, null);
      assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ?')
        .get(uploaded.source.file.id) as { count: number }).count, 0);
      assert.equal((db.prepare("SELECT COUNT(*) AS count FROM notes WHERE note_class = 'source_projection'")
        .get() as { count: number }).count, 0);
    } finally {
      unregister();
    }
  });
});
