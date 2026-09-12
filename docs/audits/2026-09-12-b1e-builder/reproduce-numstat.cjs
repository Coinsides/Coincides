const fs=require('node:fs'),crypto=require('node:crypto');
// Run from the repository root; only the archived changed-file paths are read.
const archive=JSON.parse(fs.readFileSync('docs/audits/2026-09-12-b1e-builder/source-baseline.json','utf8'));
const baseline=Object.fromEntries(archive.files.filter(file=>file.existed).map(file=>[file.path,file.beforeBase64]));
const current={};
for(const file of archive.files)if(fs.existsSync(file.path))current[file.path]=fs.readFileSync(file.path);
const lines=b=>b.length?b.toString('utf8').replace(/\r\n/g,'\n').replace(/\n$/,'').split('\n'):[];
function stat(a,b){let prefix=0;while(prefix<a.length&&prefix<b.length&&a[prefix]===b[prefix])prefix++;a=a.slice(prefix);b=b.slice(prefix);let suffix=0;while(suffix<a.length&&suffix<b.length&&a[a.length-1-suffix]===b[b.length-1-suffix])suffix++;if(suffix){a=a.slice(0,-suffix);b=b.slice(0,-suffix);}let previous=new Uint32Array(b.length+1);for(const line of a){const next=new Uint32Array(b.length+1);for(let j=0;j<b.length;j++)next[j+1]=line===b[j]?previous[j]+1:Math.max(previous[j+1],next[j]);previous=next;}const common=previous[b.length];return {added:b.length-common,deleted:a.length-common};}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const changed=[];
for(const p of [...new Set([...Object.keys(baseline),...Object.keys(current)])].sort()){
const a=baseline[p]?Buffer.from(baseline[p],'base64'):Buffer.alloc(0),b=current[p]??Buffer.alloc(0);
if(!a.equals(b))changed.push({path:p,...stat(lines(a),lines(b)),beforeSha256:hash(a),afterSha256:hash(b)});
}
const evidence='docs/audits/2026-09-12-b1e-builder/';
fs.writeFileSync(evidence+'numstat.json',JSON.stringify({basis:'Pre-edit working-tree snapshot, not HEAD; CRLF normalized for line comparison; LCS line additions/deletions. No Git accessed.',files:changed},null,2)+'\n');
console.log(changed.map(x=>`${x.added}\t${x.deleted}\t${x.path}`).join('\n'));
console.log(JSON.stringify({files:changed.length,added:changed.reduce((n,x)=>n+x.added,0),deleted:changed.reduce((n,x)=>n+x.deleted,0)}));
