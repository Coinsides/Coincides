import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../../..');
const files = new Map([
  ['e3-hit-smoke.tsx', fs.readFileSync(path.join(directory, 'hit-fixture.tsx'), 'utf8').replaceAll('../../../client/src/', './src/')],
  ['e3-hit-smoke.html', '<!doctype html><html><head><meta charset="utf-8"><title>E3 native SVG hit tolerance</title></head><body><div id="root"></div><script type="module" src="/e3-hit-smoke.tsx"></script></body></html>\n'],
]);
for (const [name, content] of files) {
  const target = path.join(repository, 'client', name);
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8').trimEnd() !== content.trimEnd()) throw new Error(`Different fixture exists: ${target}`);
}
for (const [name, content] of files) {
  const target = path.join(repository, 'client', name);
  if (process.argv.includes('--clean')) { if (fs.existsSync(target)) fs.unlinkSync(target); }
  else fs.writeFileSync(target, content, 'utf8');
}
console.log(process.argv.includes('--clean') ? 'E3 exact scratch files removed.' : 'Open http://localhost:5173/e3-hit-smoke.html');
