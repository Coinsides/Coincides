// F11 Q3: page rasterization through the server's existing pdf-parse dependency (no new install).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire('file:///D:/Coinsides/v2.x/Coincides/server/package.json');
const { PDFParse } = require('pdf-parse');
const pkg = JSON.parse(readFileSync('D:/Coinsides/v2.x/Coincides/server/node_modules/pdf-parse/package.json', 'utf8'));
console.log('pdf-parse', pkg.version, 'deps', JSON.stringify(pkg.dependencies));
for (const file of process.argv.slice(2)) {
  const buffer = readFileSync(file);
  for (const desiredWidth of [794, 1240]) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const started = performance.now();
    const result = await parser.getScreenshot({ desiredWidth, imageBuffer: true, imageDataUrl: false });
    const ms = performance.now() - started;
    const sizes = result.pages.map((page) => page.data.length);
    console.log(JSON.stringify({ file: file.split(/[\\/]/).pop(), desiredWidth, pages: sizes.length,
      kb_per_page: Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length / 1024),
      ms_per_page: Math.round(ms / sizes.length), rss_mb: Math.round(process.memoryUsage().rss / 2 ** 20) }));
    await parser.destroy();
  }
}
