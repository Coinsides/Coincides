// Read-only Git inspection; writes only the review patch and manifest beside this script.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 8e6, stdio: ['ignore','pipe','pipe'] });
const paths = ['client/src', 'server/src', 'shared'];
const tracked = git(['diff','--name-only','--',...paths]).trim().split(/\r?\n/).filter(Boolean);
const added = git(['ls-files','--others','--exclude-standard','--',...paths]).trim().split(/\r?\n/).filter(Boolean);
let patch = git(['diff','--no-ext-diff','--',...paths]);
for (const path of added) {
  const lines = readFileSync(resolve(root,path),'utf8').replaceAll('\r\n','\n').replace(/\n$/,'').split('\n');
  patch += `diff --git a/${path} b/${path}\nnew file mode 100644\n--- /dev/null\n+++ b/${path}\n@@ -0,0 +1,${lines.length} @@\n` + lines.map(line=>'+'+line).join('\n')+'\n';
}
writeFileSync(resolve(audit,'delivery.patch'),patch);
const manifest = { scope: 'Product source and tests only; documentation/evidence remains in the working tree', ref:git(['rev-parse','HEAD']).trim(), tracked:tracked.length, added:added.length,
  patchSha256:createHash('sha256').update(patch).digest('hex'), files:[...tracked,...added].sort().map(path=>({path,sha256:createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex')})) };
writeFileSync(resolve(audit,'delivery-manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({tracked:manifest.tracked,added:manifest.added,patchSha256:manifest.patchSha256}));
