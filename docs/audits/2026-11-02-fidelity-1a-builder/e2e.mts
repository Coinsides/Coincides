// Fidelity 1a end to end on a scratch database: real services and routes, a real kill, a real restart.
// usage: e2e.mts <phase A|B> <pdf> ; A renders until killed, B is the restart.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { monitorEventLoopDelay } from 'node:perf_hooks';

const server = 'file:///D:/Coinsides/v2.x/Coincides/server/src';
const root = '<tmp>/claude/D--Coinsides-v2-x-Coincides/6c1f3217-aa7b-468f-9d9c-882490faf4ae/scratchpad/f12/e2e';
const [phase, pdf] = process.argv.slice(2);
const data = join(root, 'data');
const sourceRootDir = join(data, 'sources');
const canvasAssetRootDir = join(data, 'assets');
process.env.CANVAS_ASSET_DIR = canvasAssetRootDir;
process.env.SOURCE_BLOB_DIR = sourceRootDir;
mkdirSync(join(sourceRootDir, '.tmp'), { recursive: true });

const { default: express } = await import(`file:///D:/Coinsides/v2.x/Coincides/server/node_modules/express/index.js`);
const { initDb, closeDb } = await import(`${server}/db/init.ts`);
const { default: sourceRoutes } = await import(`${server}/routes/sources.ts`);
const { default: canvasAssetRoutes } = await import(`${server}/routes/canvasAssets.ts`);
const { errorHandler } = await import(`${server}/middleware/errorHandler.ts`);
const { intakeSourceTempFile } = await import(`${server}/services/sourceFileIntake.ts`);
const { scheduleSourceMaterialization, sweepSourceMaterializations } = await import(`${server}/services/sourceMaterialization.ts`);
const { resumeSourcePageImages, waitForScheduledSourcePageImages } = await import(`${server}/services/sourcePageImages.ts`);
const { deleteSourceWithCompensation } = await import(`${server}/services/sourceLifecycle.ts`);

const userId = '11111111-1111-4111-8111-111111111111';
const courseId = '22222222-2222-4222-8222-222222222222';
const db = await initDb(join(root, 'scratch.db'));
db.prepare("INSERT OR IGNORE INTO users (id,email,password_hash,name) VALUES (?,'e2e@example.test','synthetic','Synthetic')").run(userId);
db.prepare("INSERT OR IGNORE INTO courses (id,user_id,name) VALUES (?,?,'E2E')").run(courseId, userId);

const app = express();
app.use(express.json());
app.use((req: any, _res: any, next: any) => { req.userId = userId; next(); });
app.use('/api/sources', sourceRoutes);
app.use('/api/canvas-assets', canvasAssetRoutes);
app.use(errorHandler);
const http = app.listen(0);
const base = `http://127.0.0.1:${(http.address() as any).port}/api`;
const options = { sourceRootDir, canvasAssetRootDir };
const row = (sql: string, ...args: unknown[]) => db.prepare(sql).get(...args) as any;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function latencyWhile(sourceId: string, stop: () => boolean) {
  const samples: number[] = [];
  const loop = monitorEventLoopDelay({ resolution: 10 });
  loop.enable();
  let last: any = null;
  while (!stop()) {
    const started = performance.now();
    const response = await fetch(`${base}/sources/${sourceId}/pages`);
    last = await response.json();
    samples.push(performance.now() - started);
    await sleep(100);
  }
  loop.disable();
  samples.sort((a, b) => a - b);
  const at = (p: number) => Math.round(samples[Math.min(samples.length - 1, Math.floor(samples.length * p))] || 0);
  return { requests: samples.length, p50_ms: at(0.5), p95_ms: at(0.95), max_ms: at(1), loop_p99_ms: Math.round(loop.percentile(99) / 1e6), loop_max_ms: Math.round(loop.max / 1e6), last };
}

if (phase === 'A') {
  const path = join(sourceRootDir, '.tmp', 'real.upload');
  copyFileSync(pdf, path);
  const intake = await intakeSourceTempFile(db, userId, {
    course_id: courseId, origin_entry_kind: 'project_upload',
    file: { path, originalname: pdf.split(/[\\/]/).pop()!, mimetype: 'application/pdf', size: statSync(path).size },
  }, { rootDir: sourceRootDir });
  const sourceId = intake.source.id;
  scheduleSourceMaterialization(db, userId, sourceId, options);
  const killAt = Number(process.argv[4] || 12);
  const started = performance.now();
  const latency = await latencyWhile(sourceId, () => {
    const count = row('SELECT COUNT(*) AS n FROM source_pages').n;
    return count >= killAt;
  });
  const seconds = (performance.now() - started) / 1000;
  const partial = await (await fetch(`${base}/sources/${sourceId}/pages`)).json() as any;
  console.log(JSON.stringify({ phase, killed_at_pages: partial.pages.length, status: partial.status, expected: partial.expected, seconds: Math.round(seconds * 10) / 10,
    api_latency: { ...latency, last: undefined } }));
  process.kill(process.pid, 'SIGKILL');
}

if (phase === 'B') {
  const source = row('SELECT id, metadata FROM source_records LIMIT 1');
  const sourceId = source.id;
  const note = row('SELECT projection_note_id AS id FROM source_materializations WHERE source_record_id = ?', sourceId).id;
  const beforeProgress = JSON.parse(source.metadata).page_images;
  const folder = join(canvasAssetRootDir, userId, 'source-materializations');
  const old = new Date(Date.now() - 24 * 3600 * 1000);
  const filesBefore = readdirSync(folder);
  // Files the kill left half-written are .tmp-* and legitimately swept; finished pages must survive.
  for (const file of filesBefore) utimesSync(join(folder, file), old, old);
  const sweep = sweepSourceMaterializations(db, { canvasAssetRootDir });
  const filesAfterSweep = readdirSync(folder);
  const pageFiles = filesAfterSweep.filter((name) => name.endsWith('.png'));
  console.log(JSON.stringify({ phase, restart_progress: beforeProgress, sweep, files_before: filesBefore.length, files_after_sweep: filesAfterSweep.length, rows: row('SELECT COUNT(*) AS n FROM source_pages').n, page_files: pageFiles.length }));

  const resumed = resumeSourcePageImages(db, options);
  let done = false;
  const pending = waitForScheduledSourcePageImages().then(() => { done = true; });
  const latency = await latencyWhile(sourceId, () => done);
  await pending;
  const pages = await (await fetch(`${base}/sources/by-projection-note/${note}/pages`)).json() as any;
  const progress = JSON.parse(row('SELECT metadata FROM source_records WHERE id = ?', sourceId).metadata).page_images;
  const conservation = {
    source_pages: row('SELECT COUNT(*) AS n FROM source_pages WHERE source_record_id = ?', sourceId).n,
    expected: progress.expected,
    null_sizes: row('SELECT COUNT(*) AS n FROM source_pages WHERE pdf_width IS NULL OR pdf_height IS NULL OR image_asset_id IS NULL').n,
    status: progress.status,
    numbers_in_order: pages.pages.every((page: any, index: number) => page.page_number === index + 1),
    distinct_ratios: [...new Set(pages.pages.map((page: any) => (page.pdf_height / page.pdf_width).toFixed(3)))],
    pixels_match_ratio: pages.pages.every((page: any) => Math.abs(page.image_height / page.image_width - page.pdf_height / page.pdf_width) < 0.002),
  };
  const blobs: unknown[] = [];
  for (const page of [pages.pages[0], pages.pages[pages.pages.length - 1]]) {
    const response = await fetch(`${base}/canvas-assets/${encodeURIComponent(page.asset_id)}/blob`);
    const body = Buffer.from(await response.arrayBuffer());
    blobs.push({ page: page.page_number, http: response.status, type: response.headers.get('content-type'), disposition: response.headers.get('content-disposition'), bytes: body.length, png: body.subarray(1, 4).toString() });
    writeFileSync(join(root, `blob-page-${page.page_number}.png`), body);
  }
  const sizes = pageFilesSizes(folder);
  console.log(JSON.stringify({ phase, resumed, latency: { ...latency, last: undefined }, conservation, blobs, kb_avg: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length / 1024), kb_max: Math.round(Math.max(...sizes) / 1024), rss_mb: Math.round(process.memoryUsage().rss / 2 ** 20) }));

  const count = () => ({ pages: row('SELECT COUNT(*) AS n FROM source_pages').n, assets: row("SELECT COUNT(*) AS n FROM canvas_assets WHERE id LIKE 'source-page-image:%'").n, files: readdirSync(folder).length, jobs: row('SELECT COUNT(*) AS n FROM managed_file_cleanup_jobs').n });
  const beforeDelete = count();
  deleteSourceWithCompensation(db, userId, sourceId, options);
  console.log(JSON.stringify({ phase, delete: { before: beforeDelete, after: count() } }));
  await new Promise((resolve) => http.close(resolve));
  closeDb();
}

function pageFilesSizes(folder: string) {
  return readdirSync(folder).filter((name) => name.endsWith('.png')).map((name) => statSync(join(folder, name)).size);
}
void readFileSync;
