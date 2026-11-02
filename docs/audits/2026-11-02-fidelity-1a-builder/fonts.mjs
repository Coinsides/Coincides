// Fidelity 1a: does getScreenshot render non-embedded fonts without / with pdfjs standard font data? Per-page timing, loop stall, RSS.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { monitorEventLoopDelay } from 'node:perf_hooks';
const require = createRequire('file:///D:/Coinsides/v2.x/Coincides/server/package.json');
const { PDFParse } = require('pdf-parse');
const pdfjsDir = dirname(require.resolve('pdfjs-dist/package.json'));
const out = process.argv[2];
for (const file of process.argv.slice(3)) {
  const name = file.split(/[\/]/).pop().replace('.pdf', '');
  const buffer = readFileSync(file);
  for (const [label, extra] of [['bare', {}], ['fonts', { cMapUrl: join(pdfjsDir, 'cmaps') + '/', cMapPacked: true, standardFontDataUrl: join(pdfjsDir, 'standard_fonts') + '/' }]]) {
    const parser = new PDFParse({ data: new Uint8Array(buffer), ...extra });
    const info = await parser.getInfo();
    const loop = monitorEventLoopDelay({ resolution: 10 }); loop.enable();
    const times = []; let bytes = 0;
    for (let page = 1; page <= info.total; page += 1) {
      const started = performance.now();
      const shot = await parser.getScreenshot({ partial: [page], desiredWidth: 1240, imageBuffer: true, imageDataUrl: false });
      times.push(performance.now() - started); bytes += shot.pages[0].data.length;
      if (page === 1) { writeFileSync(`${out}/${name}-${label}-p1.png`, shot.pages[0].data); console.log('p1', shot.pages[0].width, shot.pages[0].height, shot.pages[0].scale); }
      await new Promise((r) => setImmediate(r));
    }
    loop.disable();
    console.log(JSON.stringify({ name, label, pages: info.total, avg_ms: Math.round(times.reduce((a, b) => a + b, 0) / times.length), max_ms: Math.round(Math.max(...times)), kb: Math.round(bytes / info.total / 1024), loop_p99_ms: Math.round(loop.percentile(99) / 1e6), loop_max_ms: Math.round(loop.max / 1e6), rss_mb: Math.round(process.memoryUsage().rss / 2 ** 20) }));
    await parser.destroy();
  }
}
