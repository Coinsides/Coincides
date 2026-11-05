import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, openSync, closeSync, readSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { getSourceBlobRoot, resolveSourceStorageKey } from './sourceFileIntake.js';
import { terminateProcessTree, waitForClose, waitForExit } from './sourceMineruParser.js';

export const DOCX_PDF_TIMEOUT_MS = 120_000;
const RUNS_FOLDER = '.derived-runs';
const DERIVED_FOLDER = 'derived';
const INPUT_NAME = 'source.docx';
const OUTPUT_NAME = 'source.pdf';
const OUTPUT_TAIL_CHARS = 2000;
// The converter is a third-party binary: it gets what it needs to run, not our keys.
const CHILD_ENV_KEYS = ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'LANG', 'LC_ALL', 'FONTCONFIG_PATH'];

let warnedInvalidCommand = false;

// argv template, placeholders {input}, {outdir} and {profile_url}. Unset means this
// host has no converter, and docx behaves as it did before page images reached it.
function converterTemplate(): string[] | null {
  const raw = process.env.COINCIDES_DOCX_PDF_COMMAND_JSON;
  if (raw === undefined || raw.trim() === '') return null;
  try {
    const command = JSON.parse(raw) as unknown;
    if (
      !Array.isArray(command) || command.length === 0
      || command.some((part) => typeof part !== 'string')
      || !command.some((part: string) => part.includes('{input}'))
    ) {
      throw new Error('expected a JSON string array that names {input}');
    }
    return command as string[];
  } catch (error) {
    if (!warnedInvalidCommand) {
      warnedInvalidCommand = true;
      console.warn(`COINCIDES_DOCX_PDF_COMMAND_JSON is unusable: ${error instanceof Error ? error.message : String(error)}`);
    }
    return null;
  }
}

export function docxPdfConverterConfigured(): boolean {
  return converterTemplate() !== null;
}

function converterTimeoutMs(): number {
  const override = Number(process.env.COINCIDES_DOCX_PDF_COMMAND_TIMEOUT_MS);
  return Number.isInteger(override) && override > 0 ? override : DOCX_PDF_TIMEOUT_MS;
}

export function derivedDocxPdfStorageKey(userId: string, sourceFileId: string): string {
  return `${userId}/${DERIVED_FOLDER}/${sourceFileId}.pdf`;
}

// Publishing is an atomic rename, so this only catches a file damaged afterwards.
function looksLikeCompletePdf(filePath: string): boolean {
  try {
    const size = statSync(filePath).size;
    if (size < 16) return false;
    const fd = openSync(filePath, 'r');
    try {
      const head = Buffer.alloc(5);
      readSync(fd, head, 0, 5, 0);
      const tailLength = Math.min(size, 1024);
      const tail = Buffer.alloc(tailLength);
      readSync(fd, tail, 0, tailLength, size - tailLength);
      return head.toString('latin1') === '%PDF-' && tail.includes('%%EOF', 0, 'latin1');
    } finally {
      closeSync(fd);
    }
  } catch {
    return false;
  }
}

// Resolves with the converter's output, for when its exit code said all was well and
// the file says otherwise.
async function runConverter(template: string[], runDir: string, inputPath: string, outDir: string): Promise<string> {
  const fill = (part: string) => part
    .split('{input}').join(inputPath)
    .split('{outdir}').join(outDir)
    .split('{profile_url}').join(pathToFileURL(join(runDir, 'profile')).href);
  const [executable, ...args] = template.map(fill);
  const env = Object.fromEntries(CHILD_ENV_KEYS.flatMap((key) => {
    const value = process.env[key];
    return value === undefined ? [] : [[key, value]];
  }));
  const child = spawn(executable, args, {
    shell: false,
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });
  let outputTail = '';
  const keepTail = (chunk: Buffer) => { outputTail = (outputTail + chunk.toString('utf8')).slice(-OUTPUT_TAIL_CHARS); };
  child.stdout?.on('data', keepTail);
  child.stderr?.on('data', keepTail);
  const exited = waitForExit(child);
  const closed = waitForClose(child);
  const timeoutMs = converterTimeoutMs();
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
    timer.unref?.();
  });
  let outcome: Awaited<typeof exited> | 'timeout';
  try {
    outcome = await Promise.race([exited, timedOut]);
  } catch (error) {
    throw new Error(`The document converter could not be started: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (timer) clearTimeout(timer);
  }
  await terminateProcessTree(child, closed);
  if (outcome === 'timeout') throw new Error(`The document converter timed out after ${timeoutMs}ms`);
  if (outcome.code !== 0) {
    if (outputTail.trim()) console.warn(`Document converter output: ${outputTail.trim()}`);
    throw new Error(`The document converter exited abnormally (${outcome.signal || `code ${outcome.code ?? 'unknown'}`})`);
  }
  return outputTail.trim();
}

export interface EnsureDocxPdfInput {
  userId: string;
  sourceFileId: string;
  docxStorageKey: string;
  rootDir?: string;
  /** Rebuild even when a derived PDF exists: it failed to open. */
  force?: boolean;
  /** Read after the converter returns, so a Source deleted meanwhile gets no file. */
  stillWanted: () => boolean;
}

// Null when the Source went away during the conversion.
export async function ensureDocxPdf(input: EnsureDocxPdfInput): Promise<{ path: string; reused: boolean } | null> {
  const finalPath = resolveSourceStorageKey(derivedDocxPdfStorageKey(input.userId, input.sourceFileId), input.rootDir);
  if (!input.force && looksLikeCompletePdf(finalPath)) return { path: finalPath, reused: true };
  const template = converterTemplate();
  if (!template) throw new Error('No document converter is configured');
  const runDir = join(getSourceBlobRoot(input.rootDir), RUNS_FOLDER, uuidv4());
  const outDir = join(runDir, 'out');
  const inputPath = join(runDir, INPUT_NAME);
  try {
    mkdirSync(outDir, { recursive: true });
    copyFileSync(resolveSourceStorageKey(input.docxStorageKey, input.rootDir), inputPath);
    const converterOutput = await runConverter(template, runDir, inputPath, outDir);
    const outputPath = join(outDir, OUTPUT_NAME);
    if (!looksLikeCompletePdf(outputPath)) {
      if (converterOutput) console.warn(`Document converter output: ${converterOutput}`);
      throw new Error('The document converter produced no usable PDF');
    }
    if (!input.stillWanted()) return null;
    mkdirSync(dirname(finalPath), { recursive: true });
    renameSync(outputPath, finalPath);
    return { path: finalPath, reused: false };
  } finally {
    rmSync(runDir, { recursive: true, force: true, maxRetries: 3 });
  }
}

// Startup only: nothing converts yet, so every run folder is left over from a crash.
// A derived PDF is kept only while its source file exists.
export function sweepDerivedDocxPdfs(db: Database.Database, options: { rootDir?: string } = {}): number {
  const root = getSourceBlobRoot(options.rootDir);
  let removed = 0;
  const remove = (path: string, recursive: boolean) => {
    try {
      rmSync(path, { recursive, force: true });
      removed += 1;
    } catch (error) {
      console.warn(`Could not remove leftover derived file ${relative(root, path).split(sep).join('/')}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const runs = join(root, RUNS_FOLDER);
  if (existsSync(runs)) {
    for (const entry of readdirSync(runs)) remove(join(runs, entry), true);
  }
  if (!existsSync(root)) return removed;
  const known = db.prepare('SELECT 1 FROM source_files WHERE id = ? AND user_id = ?');
  for (const userEntry of readdirSync(root, { withFileTypes: true })) {
    if (!userEntry.isDirectory() || userEntry.name.startsWith('.')) continue;
    const folder = join(root, userEntry.name, DERIVED_FOLDER);
    if (!existsSync(folder)) continue;
    for (const entry of readdirSync(folder)) {
      if (!entry.endsWith('.pdf')) continue;
      if (!known.get(entry.slice(0, -'.pdf'.length), userEntry.name)) remove(join(folder, entry), false);
    }
  }
  return removed;
}
