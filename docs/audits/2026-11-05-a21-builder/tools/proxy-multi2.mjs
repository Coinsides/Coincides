// Scratch only: Tester's matrix targets. dist-before = before A-18, dist-a24 = this work.
import { fork } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const [before, after] = [join(here, 'dist-before'), join(here, 'dist-a24')];
for (const [dist, port, delay] of [[after, 4130, 57], [after, 4131, 0], [before, 4132, 57], [before, 4133, 0]]) {
  fork(join(here, 'proxy.mjs'), [dist, String(port), String(delay)]);
}
