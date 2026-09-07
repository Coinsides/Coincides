import { lstatSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Database from 'better-sqlite3';
import { readShadowReport } from './wildernessShadow/census.js';
import { renderMarkdown, type ShadowReport } from './wildernessShadow/report.js';

export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const AUDITS = path.join(REPO_ROOT, 'docs', 'audits');
export interface Options { synthetic: boolean; database?: string; user: string; output: string }

export function parseArgs(args: string[]): Options {
  let synthetic = false;
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const name = args[i];
    if (name === '--synthetic' && !synthetic) { synthetic = true; continue; }
    if (!['--db', '--user', '--out'].includes(name) || values.has(name) || !args[i + 1]
      || args[i + 1].startsWith('--')) throw new Error('Invalid or duplicate argument');
    values.set(name, args[++i]);
  }
  const database = values.get('--db');
  const user = values.get('--user');
  const output = values.get('--out');
  if (synthetic === Boolean(database) || !user?.trim() || !output?.trim()) {
    throw new Error('Specify exactly one data source, explicit user and output');
  }
  if (synthetic && !path.basename(output).includes('合成')) throw new Error('Synthetic output name must contain 合成');
  return { synthetic, database, user, output };
}

function reportPaths(output: string): { json: string; markdown: string } {
  // Direct children only; reject linked output directories and existing destinations
  // before opening a data source. Exclusive creation below also protects against races.
  const base = path.resolve(REPO_ROOT, output);
  const relative = path.relative(AUDITS, base);
  if (!relative || relative !== path.basename(relative) || relative.startsWith('..')
    || path.isAbsolute(relative) || /\.(md|json|db|sqlite)$/i.test(base)
    || path.relative(path.join(realpathSync(REPO_ROOT), 'docs', 'audits'), realpathSync(AUDITS)) !== '') {
    throw new Error('Output must be an extension-free basename within docs/audits');
  }
  const files = { json: base + '.json', markdown: base + '.md' };
  for (const file of Object.values(files)) {
    if (lstatSync(file, { throwIfNoEntry: false })) throw new Error('Report target already exists; choose a new basename');
  }
  return files;
}

export function writeReports(report: ShadowReport, output: string): { json: string; markdown: string } {
  const files = reportPaths(output);
  writeFileSync(files.json, JSON.stringify(report, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  writeFileSync(files.markdown, renderMarkdown(report), { encoding: 'utf8', flag: 'wx' });
  return files;
}

export async function run(options: Options): Promise<ShadowReport> {
  if (options.synthetic === Boolean(options.database) || !options.user.trim()) throw new Error('Explicit source and scope required');
  if (options.synthetic && !path.basename(options.output).includes('合成')) throw new Error('Synthetic output name must contain 合成');
  reportPaths(options.output);
  // No implicit path, config import, dotenv, DB initializer, or automatic migration.
  // Synthetic mode never resolves a path to any existing database.
  const input = options.synthetic
    ? (await import('./wildernessShadow/synthetic.js')).createSyntheticBuffer()
    : options.database!;
  const db = new Database(input, { readonly: true, fileMustExist: true });
  try {
    const report = readShadowReport(db, options.user, options.synthetic ? 'synthetic' : 'explicit_readonly_database');
    writeReports(report, options.output);
    if (!report.shadow.conservationOk) throw new Error('Conservation failed; review the report');
    return report;
  } finally {
    db.close();
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.slice(2).join(' ') === '--help') {
    console.log('Usage: node --import tsx scripts/v13WildernessShadowRun.ts (--synthetic | --db <explicit-path>) --user <scope> --out docs/audits/<basename>');
    console.log('Use a NEW basename directly in docs/audits; synthetic names must include 合成. Database mode is for HQ/Henry only.');
  } else {
    try {
      const report = await run(parseArgs(process.argv.slice(2)));
      console.log(JSON.stringify({ result: 'SHADOW_RUN_PASS', mode: report.mode, notes: report.census.denominators.length,
        conservation: report.shadow.conservationOk, ambiguousPlacements: report.shadow.ambiguousPlacements.length,
        ambiguousLegacy: report.shadow.ambiguousLegacy.length, destinationReviews: report.shadow.destinationReviews.length }));
    } catch {
      // Arguments, DB errors and raw values are intentionally not echoed to the terminal.
      console.error('SHADOW_RUN_FAILED: check arguments, read-only schema and audit report.');
      process.exitCode = 1;
    }
  }
}
