import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';
import type {
  SourceArtifact,
  SourceArtifactBlock,
  SourceArtifactLimits,
  SourceParser,
  SourceParserInput,
} from './sourceArtifact.js';
import type { SourceArtifactErrorCode } from './sourceMaterializationErrors.js';

export const MINERU_PARSER_KEY = 'mineru';
export const MINERU_TRANSCRIBER_LOCKFILE = '_external_tools/mineru/uv.lock';
export const MINERU_MS_PER_PAGE = 13_180;
export const MINERU_TIMEOUT_MS = 120_000;
export const MINERU_MAX_PDF_PAGES = Math.floor(MINERU_TIMEOUT_MS / MINERU_MS_PER_PAGE);

const MINERU_LOCKFILE_URL = new URL('../../../_external_tools/mineru/uv.lock', import.meta.url);
const MINERU_PROJECT_URL = new URL('../../../_external_tools/mineru/', import.meta.url);
const RUNNER_PROTOCOL = 'coincides-mineru.v1';
const OUTPUT_TAIL_BYTES = 8 * 1024;

const PYTHON_RUNNER = String.raw`from __future__ import annotations

import argparse
import importlib.metadata
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--result", required=True)
    parser.add_argument("--lang", required=True)
    args = parser.parse_args()

    from mineru.cli.common import do_parse, read_fn

    source = Path(args.input)
    output = Path(args.output)
    result = Path(args.result)
    output.mkdir(parents=True, exist_ok=True)
    do_parse(
        output_dir=str(output),
        pdf_file_names=[source.stem],
        pdf_bytes_list=[read_fn(source)],
        p_lang_list=[args.lang],
        backend="pipeline",
        parse_method="ocr",
        formula_enable=True,
        table_enable=True,
        f_draw_layout_bbox=False,
        f_draw_span_bbox=False,
        f_dump_md=True,
        f_dump_middle_json=True,
        f_dump_content_list=True,
        f_dump_model_output=False,
        f_dump_orig_pdf=False,
    )
    candidates = list(output.rglob("*_content_list.json"))
    if len(candidates) != 1:
        raise RuntimeError(f"expected one MinerU content list, found {len(candidates)}")
    content_list = json.loads(candidates[0].read_text(encoding="utf-8"))
    result.write_text(json.dumps({
        "protocol": "coincides-mineru.v1",
        "mineru_version": importlib.metadata.version("mineru"),
        "content_list": content_list,
    }, ensure_ascii=False), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`;

export class SourceMineruParserError extends Error {
  readonly code: SourceArtifactErrorCode;

  constructor(code: SourceArtifactErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'SourceMineruParserError';
    this.code = code;
    if (options && 'cause' in options) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function mineruPackageVersion(lockfile: string): string {
  const packageBlocks = lockfile.split(/(?=^\[\[package\]\]\r?$)/m);
  for (const block of packageBlocks) {
    if (!/^name = "mineru"\r?$/m.test(block)) continue;
    const version = /^version = "([^"]+)"\r?$/m.exec(block)?.[1];
    if (version) return version;
  }
  throw new SourceMineruParserError(
    'internal_interrupted',
    `MinerU version is missing from ${MINERU_TRANSCRIBER_LOCKFILE}`,
  );
}

export function mineruParserVersion(): string {
  try {
    return mineruPackageVersion(readFileSync(MINERU_LOCKFILE_URL, 'utf8'));
  } catch (error) {
    if (error instanceof SourceMineruParserError) throw error;
    throw new SourceMineruParserError(
      'internal_interrupted',
      `MinerU lockfile could not be read: ${MINERU_TRANSCRIBER_LOCKFILE}`,
      { cause: error },
    );
  }
}

async function assertPdfWithinPageLimit(input: SourceParserInput, limits: SourceArtifactLimits): Promise<number> {
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: await readFile(input.file_path) });
    const info = await parser.getInfo();
    if (info.total > limits.maxPdfPages) {
      throw new SourceMineruParserError(
        'resource_limit',
        `PDF has ${info.total} pages, exceeding the MinerU ${limits.maxPdfPages} page limit`,
      );
    }
    return info.total;
  } catch (error) {
    if (error instanceof SourceMineruParserError) throw error;
    throw new SourceMineruParserError('invalid_or_corrupt', 'PDF could not be inspected before MinerU parsing', {
      cause: error,
    });
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

function commandFromEnvironment(runnerPath: string): { executable: string; args: string[] } {
  const override = process.env.COINCIDES_MINERU_COMMAND_JSON;
  if (override !== undefined) {
    try {
      const command = JSON.parse(override) as unknown;
      if (!Array.isArray(command) || command.length === 0 || command.some((part) => typeof part !== 'string')) {
        throw new Error('expected a non-empty JSON string array');
      }
      return { executable: command[0], args: command.slice(1) };
    } catch (error) {
      throw new SourceMineruParserError(
        'internal_interrupted',
        'COINCIDES_MINERU_COMMAND_JSON must be a non-empty JSON argv array',
        { cause: error },
      );
    }
  }

  const configuredPython = process.env.COINCIDES_MINERU_PYTHON?.trim();
  const executable = configuredPython || (process.platform === 'win32'
    ? fileURLToPath(new URL('.venv/Scripts/python.exe', MINERU_PROJECT_URL))
    : fileURLToPath(new URL('.venv/bin/python', MINERU_PROJECT_URL)));
  if (!existsSync(executable)) {
    throw new SourceMineruParserError(
      'internal_interrupted',
      `MinerU runtime is not provisioned at ${executable}`,
    );
  }
  return { executable, args: ['-B', runnerPath] };
}

function childTimeoutMs(defaultTimeoutMs: number): number {
  const override = process.env.COINCIDES_MINERU_COMMAND_TIMEOUT_MS;
  if (process.env.COINCIDES_MINERU_COMMAND_JSON === undefined || override === undefined) {
    return defaultTimeoutMs;
  }
  const parsed = Number(override);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new SourceMineruParserError(
      'internal_interrupted',
      'COINCIDES_MINERU_COMMAND_TIMEOUT_MS must be a positive integer',
    );
  }
  return Math.min(parsed, defaultTimeoutMs);
}

function remainingMineruTime(deadlineMs: number, phase: string): number {
  const remaining = deadlineMs - Date.now();
  if (remaining < 1) {
    throw new SourceMineruParserError(
      'internal_interrupted',
      `MinerU exceeded its total time limit during ${phase}`,
    );
  }
  return remaining;
}

async function withinMineruDeadline<T>(
  promise: Promise<T>,
  deadlineMs: number,
  phase: string,
): Promise<T> {
  const remaining = remainingMineruTime(deadlineMs, phase);
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new SourceMineruParserError(
            'internal_interrupted',
            `MinerU exceeded its total time limit during ${phase}`,
          ));
        }, remaining);
        timeout.unref?.();
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function appendTail(current: string, chunk: Buffer | string): string {
  const combined = Buffer.concat([Buffer.from(current), Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
  return combined.subarray(Math.max(0, combined.length - OUTPUT_TAIL_BYTES)).toString('utf8');
}

interface ChildExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

function waitForExit(child: ChildProcess): Promise<ChildExit> {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

function waitForClose(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    child.once('close', () => resolve());
  });
}

async function runTaskkill(pid: number): Promise<number | null> {
  const taskkill = spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
    shell: false,
    windowsHide: true,
    stdio: 'ignore',
  });
  const result = await waitForExit(taskkill);
  return result.code;
}

async function windowsProcessTree(rootPid: number): Promise<{ rootExists: boolean; descendants: number[] }> {
  const script = String.raw`
$rootPid = ${rootPid}
$rows = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId)
$rootExists = @($rows | Where-Object { $_.ProcessId -eq $rootPid }).Count -gt 0
$queue = [System.Collections.Generic.Queue[uint32]]::new()
$found = [System.Collections.Generic.HashSet[uint32]]::new()
$queue.Enqueue([uint32]$rootPid)
while ($queue.Count -gt 0) {
  $parentPid = $queue.Dequeue()
  foreach ($row in $rows) {
    if ($row.ParentProcessId -eq $parentPid -and $found.Add([uint32]$row.ProcessId)) {
      $queue.Enqueue([uint32]$row.ProcessId)
    }
  }
}
[pscustomobject]@{ rootExists = $rootExists; descendants = @($found) } | ConvertTo-Json -Compress
`;
  const probe = spawn('powershell.exe', ['-NoProfile', '-Command', script], {
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  probe.stdout?.on('data', (chunk: Buffer) => { stdout = appendTail(stdout, chunk); });
  probe.stderr?.on('data', (chunk: Buffer) => { stderr = appendTail(stderr, chunk); });
  const probeExit = waitForExit(probe);
  const probeClose = waitForClose(probe);
  const result = await probeExit;
  await probeClose;
  if (result.code !== 0) {
    throw new Error(`Windows process-tree probe failed${stderr.trim() ? `: ${stderr.trim()}` : ''}`);
  }
  const parsed = JSON.parse(stdout) as { rootExists?: unknown; descendants?: unknown };
  if (typeof parsed.rootExists !== 'boolean' || !Array.isArray(parsed.descendants)) {
    throw new Error('Windows process-tree probe returned malformed output');
  }
  return {
    rootExists: parsed.rootExists,
    descendants: parsed.descendants.map(Number).filter(Number.isInteger),
  };
}

async function terminateProcessTree(
  child: ChildProcess,
  closePromise: Promise<void>,
): Promise<void> {
  if (child.pid === undefined) return;
  if (process.platform === 'win32') {
    const before = await windowsProcessTree(child.pid);
    const rootStillOwned = child.exitCode === null && child.signalCode === null;
    if (!rootStillOwned && before.rootExists) {
      throw new Error(`Windows PID ${child.pid} was reused before descendant cleanup completed`);
    }
    if (rootStillOwned && before.rootExists) await runTaskkill(child.pid);
    for (const pid of [...before.descendants].reverse()) {
      await runTaskkill(pid);
    }
    const after = await windowsProcessTree(child.pid);
    if (after.rootExists || after.descendants.length > 0) {
      throw new Error(`Windows process tree remained alive after termination: ${after.descendants.join(',')}`);
    }
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
    }
  }
  await closePromise;
}

async function runMineruChild(
  executable: string,
  args: string[],
  timeoutMs: number,
): Promise<void> {
  const child = spawn(executable, args, {
    shell: false,
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdoutTail = '';
  let stderrTail = '';
  child.stdout?.on('data', (chunk: Buffer) => { stdoutTail = appendTail(stdoutTail, chunk); });
  child.stderr?.on('data', (chunk: Buffer) => { stderrTail = appendTail(stderrTail, chunk); });

  const exitPromise = waitForExit(child);
  const closePromise = waitForClose(child);
  let timeout: NodeJS.Timeout | undefined;
  const timedOut = new Promise<'timeout'>((resolve) => {
    timeout = setTimeout(() => resolve('timeout'), timeoutMs);
    timeout.unref?.();
  });

  let outcome: ChildExit | 'timeout';
  try {
    outcome = await Promise.race([exitPromise, timedOut]);
  } catch (error) {
    if (timeout) clearTimeout(timeout);
    throw new SourceMineruParserError('parser_failure', 'MinerU child process could not be started', { cause: error });
  }
  if (timeout) clearTimeout(timeout);

  if (outcome === 'timeout') {
    try {
      await terminateProcessTree(child, closePromise);
    } catch (error) {
      throw new SourceMineruParserError(
        'internal_interrupted',
        `MinerU timed out after ${timeoutMs}ms and its process tree could not be terminated`,
        { cause: error },
      );
    }
    throw new SourceMineruParserError(
      'internal_interrupted',
      `MinerU timed out after ${timeoutMs}ms; its process tree was terminated`,
    );
  }

  try {
    await terminateProcessTree(child, closePromise);
  } catch (error) {
    throw new SourceMineruParserError(
      'internal_interrupted',
      'MinerU exited but its process tree could not be fully reaped',
      { cause: error },
    );
  }

  if (outcome.code !== 0) {
    const detail = stderrTail.trim() || stdoutTail.trim();
    throw new SourceMineruParserError(
      'parser_failure',
      `MinerU exited abnormally (${outcome.signal || `code ${outcome.code ?? 'unknown'}`})${detail ? `: ${detail}` : ''}`,
    );
  }
}

interface MineruRunnerEnvelope {
  protocol: string;
  mineru_version: string;
  content_list: unknown[];
}

function runnerEnvelope(value: unknown): MineruRunnerEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SourceMineruParserError('parser_failure', 'MinerU runner returned a malformed result envelope');
  }
  const record = value as Record<string, unknown>;
  if (
    record.protocol !== RUNNER_PROTOCOL
    || typeof record.mineru_version !== 'string'
    || !Array.isArray(record.content_list)
  ) {
    throw new SourceMineruParserError('parser_failure', 'MinerU runner returned an incompatible result envelope');
  }
  return record as unknown as MineruRunnerEnvelope;
}

function contentListBlocks(contentList: unknown[], pageCount: number): SourceArtifactBlock[] {
  const pageBlockCounts = new Map<number, number>();
  const blocks: SourceArtifactBlock[] = [];
  for (const value of contentList) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const item = value as Record<string, unknown>;
    if (item.type !== 'text' || typeof item.text !== 'string' || item.text.trim().length === 0) continue;
    if (!Number.isInteger(item.page_idx) || (item.page_idx as number) < 0) {
      throw new SourceMineruParserError('parser_failure', 'MinerU text block is missing a zero-based page_idx');
    }
    const pageIndex = (item.page_idx as number) + 1;
    if (pageIndex > pageCount) {
      throw new SourceMineruParserError(
        'parser_failure',
        `MinerU text block page ${pageIndex} exceeds the PDF page count ${pageCount}`,
      );
    }
    const blockIndex = (pageBlockCounts.get(pageIndex) || 0) + 1;
    pageBlockCounts.set(pageIndex, blockIndex);
    const heading = typeof item.text_level === 'number' && item.text_level > 0;
    blocks.push({
      artifact_block_id: `mineru-page-${pageIndex}-block-${blockIndex}`,
      kind: 'text',
      text: item.text.trim(),
      writing_role: heading ? 'heading' : 'paragraph',
      page_index: pageIndex,
      locator: {
        kind: 'mineru_page',
        page_index: pageIndex,
        block_index: blockIndex,
        ...(Array.isArray(item.bbox) ? { bbox: item.bbox } : {}),
      },
      metadata: { mineru_type: item.type },
    });
  }
  return blocks;
}

async function parseWithMineru(input: SourceParserInput, limits: SourceArtifactLimits): Promise<SourceArtifact> {
  const deadlineMs = Date.now() + limits.timeoutMs;
  const pageCount = await withinMineruDeadline(
    assertPdfWithinPageLimit(input, limits),
    deadlineMs,
    'PDF preflight',
  );
  const runtimeDir = await withinMineruDeadline(
    mkdtemp(join(tmpdir(), 'coincides-mineru-')),
    deadlineMs,
    'runtime setup',
  );
  const runnerPath = join(runtimeDir, 'runner.py');
  const outputDir = join(runtimeDir, 'output');
  const resultPath = join(runtimeDir, 'result.json');
  try {
    await withinMineruDeadline(
      writeFile(runnerPath, PYTHON_RUNNER, 'utf8'),
      deadlineMs,
      'runner setup',
    );
    const command = commandFromEnvironment(runnerPath);
    const args = [
      ...command.args,
      '--input', input.file_path,
      '--output', outputDir,
      '--result', resultPath,
      '--lang', process.env.COINCIDES_MINERU_LANGUAGE?.trim() || 'en',
    ];
    await runMineruChild(
      command.executable,
      args,
      childTimeoutMs(remainingMineruTime(deadlineMs, 'subprocess execution')),
    );
    let envelope: MineruRunnerEnvelope;
    try {
      envelope = runnerEnvelope(JSON.parse(await withinMineruDeadline(
        readFile(resultPath, 'utf8'),
        deadlineMs,
        'result loading',
      )));
    } catch (error) {
      if (error instanceof SourceMineruParserError) throw error;
      throw new SourceMineruParserError('parser_failure', 'MinerU result file could not be read', { cause: error });
    }
    const expectedVersion = mineruParserVersion();
    if (envelope.mineru_version !== expectedVersion || input.parser_version !== expectedVersion) {
      throw new SourceMineruParserError(
        'parser_failure',
        `MinerU runtime version ${envelope.mineru_version} does not match lockfile version ${expectedVersion}`,
      );
    }
    const blocks = contentListBlocks(envelope.content_list, pageCount);
    if (blocks.length === 0) {
      throw new SourceMineruParserError('parser_failure', 'MinerU returned no usable text blocks');
    }
    remainingMineruTime(deadlineMs, 'result validation');
    return {
      schema_version: 'source-artifact.v1',
      artifact_kind: 'document',
      parser_key: input.parser_key,
      parser_version: input.parser_version,
      blocks,
      metadata: {
        page_count: pageCount,
        runner_protocol: RUNNER_PROTOCOL,
        original_filename: basename(input.original_filename),
      },
    };
  } finally {
    try {
      await rm(runtimeDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (error) {
      throw new SourceMineruParserError(
        'internal_interrupted',
        'MinerU runtime artifacts could not be removed after parsing',
        { cause: error },
      );
    }
  }
}

export const mineruParser: SourceParser & { ownsTimeout: true } = {
  key: MINERU_PARSER_KEY,
  ownsTimeout: true,
  parse: parseWithMineru,
};
