// Tester(1) 11-09: turns mk-dtrace3.mjs (a copy of mk-dtrace2.mjs) into the v3 generator for the TD-77 long-session probe
// (Main_Designer optional item; builder's three extra records):
//   (1) each D row's start: localStorage key groups (key with ids cut off) -> [count, total chars];
//   (2) each D row's end: every /api/ resource timing since the note page loaded (GETs included: start / end on the
//       recorder's clock, initiator, path with ids as :id) -> shows the reads at open and any data read after the hand-off;
//   (3) every snapshot also carries per-textarea flags: readOnly and the nearest data-draft-phase (field f, beside v, so
//       the v1/v2 analyzers read v unchanged).
// Usage: cp mk-dtrace2.mjs mk-dtrace3.mjs && node patch-dtrace3.mjs && node mk-dtrace3.mjs   (writes matrix-dtrace3.mjs)
import fs from 'node:fs';
const p = new URL('mk-dtrace3.mjs', import.meta.url);
let s = fs.readFileSync(p, 'utf8');
// tq: text placed inside the generator's NEW template literal loses one level of backslashes, so double them.
const tq = (x) => x.split(String.fromCharCode(92)).join(String.fromCharCode(92, 92));
const rep = (a, b) => { if (s.split(a).length !== 2) { console.error('not found once:', a.slice(0, 80)); process.exit(1); } s = s.replace(a, b); };
const LSQ = String.raw`(()=>{const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);const v=localStorage.getItem(k)||'';const g=k.replace(/:[0-9a-f]{8}-[0-9a-f-]+.*$/,':<id>');o[g]=o[g]||[0,0];o[g][0]+=1;o[g][1]+=v.length}return o})()`;
const RESQ = String.raw`performance.getEntriesByType('resource').filter(e=>/\/api\//.test(e.name)).map(e=>[Math.round(e.startTime-(window.__dT0||0)),Math.round(e.responseEnd-(window.__dT0||0)),e.initiatorType,e.name.replace(/^https?:\/\/[^/]+/,'').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,':id').split('?')[0]])`;
rep('window.__dlog=log;', 'window.__dlog=log;window.__dT0=T0;');
rep(`let last='';setInterval(()=>{const xs=all().filter(x=>x.getBoundingClientRect().width>200);const f=document.querySelectorAll('[data-block-save-failed]').length;const s=JSON.stringify(xs.map(x=>(kind(x)==='editor'?'E:':'D:')+val(x)+(document.activeElement===x?'@'+x.selectionStart:'')).concat(f?['FAILED-MARK:'+f]:[]));if(s!==last){last=s;push({t:t(),ev:'snap',v:JSON.parse(s)})}},10);`,
  `let last='';setInterval(()=>{const xs=all().filter(x=>x.getBoundingClientRect().width>200);const f=document.querySelectorAll('[data-block-save-failed]').length;const v=xs.map(x=>(kind(x)==='editor'?'E:':'D:')+val(x)+(document.activeElement===x?'@'+x.selectionStart:'')).concat(f?['FAILED-MARK:'+f]:[]);const fl=xs.map(x=>{const ph=x.closest('[data-draft-phase]');return (x.readOnly?'ro':'rw')+(ph?'~'+ph.getAttribute('data-draft-phase'):'')});const s=JSON.stringify([v,fl]);if(s!==last){last=s;push({t:t(),ev:'snap',v,f:fl})}},10);`);
rep("const freshT = async (title) => { const id = await newNote(title); await open(id); conBuf.length = 0; failedOnce = false; await b.ev(DREC);",
  "const freshT = async (title) => { const id = await newNote(title); await open(id); conBuf.length = 0; failedOnce = false; rowLs = await b.ev(LSQ).catch(() => null); await b.ev(DREC);");
rep('const MARKQ = ', `let rowLs = null;\nconst LSQ = ${tq(JSON.stringify(LSQ))};\nconst RESQ = ${tq(JSON.stringify(RESQ))};\nconst MARKQ = `);
rep("const trace = await b.ev('(window.__dlog||[]).slice(0,1200)').catch(() => null);", "const trace = await b.ev('(window.__dlog||[]).slice(0,1200)').catch(() => null); const res = await b.ev(RESQ).catch(() => null);");
rep("recorder: 'v2', postDelay: DPD,", "recorder: 'v3', postDelay: DPD, lsStart: rowLs, res,");
s = s.split('matrix-dtrace2.mjs').join('matrix-dtrace3.mjs').replace('the D arm with recorder v2 and the POST /blocks hold', 'the D arm with recorder v3 (v2 + localStorage at row start, /api resource timings incl. GETs, readOnly / draft-phase flags) and the POST /blocks hold');
fs.writeFileSync(p, s);
console.log('mk-dtrace3.mjs patched');
