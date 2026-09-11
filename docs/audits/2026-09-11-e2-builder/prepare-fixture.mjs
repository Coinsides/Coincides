import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../../..');
const fixture = fs.readFileSync(path.join(directory, 'fixture.tsx'), 'utf8')
  .replaceAll('../../../client/src/', './src/');
const files = new Map([
  ['e2-smoke.tsx', fixture],
  ['e2-smoke.html', '<!doctype html><html><head><meta charset="utf-8"><title>E2 annotation stamp smoke</title></head><body><div id="root"></div><script type="module" src="/e2-smoke.tsx"></script></body></html>\n'],
]);
// Only touch these two exact, owned scratch files, never a Vite permission setting.
for (const [name, content] of files) {
  const target = path.join(repository, 'client', name);
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8').trimEnd() !== content.trimEnd()) {
    throw new Error(`Refusing to overwrite a different fixture: ${target}`);
  }
}
for (const [name, content] of files) {
  const target = path.join(repository, 'client', name);
  if (process.argv.includes('--clean')) {
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } else fs.writeFileSync(target, content);
}
console.log(process.argv.includes('--clean') ? 'E2 scratch files removed.' : 'Open http://localhost:5173/e2-smoke.html with the client dev server running.');
