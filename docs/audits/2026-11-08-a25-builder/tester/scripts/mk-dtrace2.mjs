// Tester(1) 11-09 (A-25 lines30 follow-up, recorder v2 after builder's CODE-ANSWER-lines30 asked for four things):
// builds matrix-dtrace2.mjs = matrix.mjs with the D arm unchanged in what it types and when, plus a page recorder
// installed after the note opens and before the surface click, and an optional POST /blocks hold.
// v2 over v1 (matrix-dtrace.mjs, kept unchanged for the run already made with it):
//   1. every non-GET request records the unit ids AND texts it sends (id:text), its base revision, send / end / status,
//      and the head of the answer;
//   2. keydown / input on any textarea record target kind (draft / editor), index, value, selectionStart; the 10 ms
//      snapshot marks the focused textarea with @caret, so the draft's last caret and value before the hand-off and any
//      input the draft still takes after it are both in the trace;
//   3. focusin / focusout with target kind, index, value;
//   4. the snapshot also counts [data-block-save-failed] elements, and console.error / warn / log / info lines are
//      recorded (first 200 chars), so 'Failed to save block' shows if it is printed.
// Knobs: DGAPS / DREPS narrow the arm (default = the regression arm: 30,80,150,300 x 3); DPOSTDELAY=<ms> holds every
// browser POST /api/notes/:id/blocks that long before it goes out (CDP Fetch, request stage; all else continues at once;
// unset or 0 = no interception at all). Usage: node mk-dtrace2.mjs
import fs from 'node:fs';
const HERE = new URL('.', import.meta.url);
const src = fs.readFileSync(new URL('matrix.mjs', HERE), 'utf8');
const OLD = `const armD = async (round) => { for (const gap of [30, 80, 150, 300]) for (let i = 0; i < 3; i += 1) {
  const id = await fresh(\`D \${gap}\`);
  for (const line of ['aa', 'bb', 'cc', 'dd']) { await keysAt(line, 40); await sleep(gap); await enter(); await sleep(gap); }
  await keysAt('ee', 40);
  await finish(id, ['aa', 'bb', 'cc', 'dd', 'ee'], 'D', \`lines\${gap}-\${i}\`, round);
} };`;
if (!src.includes(OLD)) { console.error('D arm text not found - matrix.mjs changed'); process.exit(1); }
const ANCHOR = "b.on('Runtime.exceptionThrown', (p) => errors.push(p.exceptionDetails?.exception?.description?.slice(0, 240) || p.exceptionDetails?.text));";
if (src.split(ANCHOR).length !== 2) { console.error('anchor not found once'); process.exit(1); }
const REC = String.raw`(()=>{if(window.__dlog)return 0;const T0=performance.now();const log=[];window.__dlog=log;const t=()=>Math.round(performance.now()-T0);const push=(e)=>{if(log.length<1200)log.push(e)};
const all=()=>[...document.querySelectorAll('textarea')];
const kind=(el)=>!el||!el.tagName?'?':el.dataset&&el.dataset.runtimeTextflowEditor==='true'?'editor':el.tagName==='TEXTAREA'?'draft':el.tagName;
const idx=(el)=>all().indexOf(el);
const val=(el)=>(el&&typeof el.value==='string'?el.value:'').slice(0,40);
for(const lv of ['error','warn','log','info']){const o=console[lv];console[lv]=function(...a){try{push({t:t(),ev:'console',lv,msg:a.map(x=>{try{return typeof x==='string'?x:(x&&x.message)||JSON.stringify(x)}catch(e){return String(x)}}).join(' ').slice(0,200)})}catch(e){}return o.apply(this,a)}}
document.addEventListener('keydown',(e)=>{const x=e.target;push({t:t(),ev:'key',k:e.key,on:kind(x),i:idx(x),v:val(x),s:x&&x.selectionStart})},true);
document.addEventListener('input',(e)=>{const x=e.target;push({t:t(),ev:'input',it:e.inputType,d:e.data??null,on:kind(x),i:idx(x),v:val(x),s:x&&x.selectionStart})},true);
document.addEventListener('focusin',(e)=>push({t:t(),ev:'focus',on:kind(e.target),i:idx(e.target),v:val(e.target)}),true);
document.addEventListener('focusout',(e)=>push({t:t(),ev:'blur',on:kind(e.target),i:idx(e.target),v:val(e.target)}),true);
new MutationObserver((ms)=>{for(const m of ms){for(const n of m.removedNodes){if(n.nodeType!==1)continue;const xs=[n.tagName==='TEXTAREA'?n:null,...(n.querySelectorAll?n.querySelectorAll('textarea'):[])].filter(Boolean);for(const x of xs)push({t:t(),ev:kind(x)==='editor'?'editor-out':'draft-out',v:val(x)})}
for(const n of m.addedNodes){if(n.nodeType!==1)continue;const xs=[n.tagName==='TEXTAREA'?n:null,...(n.querySelectorAll?n.querySelectorAll('textarea'):[])].filter(Boolean);for(const x of xs)push({t:t(),ev:kind(x)==='editor'?'editor-in':'draft-in',v:val(x)})}}}).observe(document.body,{childList:true,subtree:true});
let last='';setInterval(()=>{const xs=all().filter(x=>x.getBoundingClientRect().width>200);const f=document.querySelectorAll('[data-block-save-failed]').length;const s=JSON.stringify(xs.map(x=>(kind(x)==='editor'?'E:':'D:')+val(x)+(document.activeElement===x?'@'+x.selectionStart:'')).concat(f?['FAILED-MARK:'+f]:[]));if(s!==last){last=s;push({t:t(),ev:'snap',v:JSON.parse(s)})}},10);
const idp=(u)=>String(u||'').replace(/^https?:\/\/[^/]+/,'').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,':id').split('?')[0];
const sum=(b)=>{try{const j=JSON.parse(b);const cj=(j&&j.block&&j.block.content_json)||(j&&j.content_json)||null;const us=cj&&cj.text_flow&&cj.text_flow.units;return{rev:j.base_revision,u:us?us.map(u=>u.id+':'+u.text):undefined,body:cj&&typeof cj.body==='string'?cj.body.slice(0,60):undefined}}catch(e){return null}};
const XO=XMLHttpRequest.prototype.open,XS=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(m,u){this.__m=m;this.__u=u;return XO.apply(this,arguments)};
XMLHttpRequest.prototype.send=function(b){const m=String(this.__m||'').toUpperCase();if(m&&m!=='GET'){const u=idp(this.__u);const k=t();push({t:k,ev:'xhr',phase:'send',m,u,req:sum(b)});this.addEventListener('loadend',()=>push({t:t(),ev:'xhr',phase:'end',m,u,sent:k,status:this.status,res:String(this.responseText||'').slice(0,200)}))}return XS.apply(this,arguments)};
const F=window.fetch;window.fetch=function(i,o){const m=String((o&&o.method)||(i&&i.method)||'GET').toUpperCase();if(m==='GET')return F.apply(this,arguments);const u=idp(i&&i.url||i);const k=t();push({t:k,ev:'xhr',phase:'send',m,u,fetch:true,req:sum(o&&o.body)});return F.apply(this,arguments).then((r)=>{push({t:t(),ev:'xhr',phase:'end',m,u,sent:k,status:r.status,fetch:true});return r},(e)=>{push({t:t(),ev:'xhr',phase:'end',m,u,sent:k,status:'err',fetch:true});throw e})};
return 1})()`;
const NEW = `const DREC = ${JSON.stringify(REC)};
// Main_Designer 11-09 item 4: at each row's end, the failure mark on the page (before and after the blur) and the
// console as CDP reports it (Runtime.consoleAPICalled: robust even if the app kept its own console reference).
await b.cdp('Runtime.enable').catch(() => {});
const conBuf = [];
b.on('Runtime.consoleAPICalled', (p) => { conBuf.push({ type: p.type, msg: (p.args || []).map((a) => (a.value !== undefined ? String(a.value) : a.description || '')).join(' ').slice(0, 200) }); });
const MARKQ = "document.querySelectorAll('[data-block-save-failed]').length";
const freshT = async (title) => { const id = await newNote(title); await open(id); conBuf.length = 0; failedOnce = false; await b.ev(DREC); await clickTa(0); await sleep(800); return id; };
const finishT = async (id, expected, arm, name, round) => { await sleep(1500); const st = await state(); const markBeforeBlur = await b.ev(MARKQ).catch(() => null); await blurOutside(); await sleep(1800); const server = await serverUnits(id); const markAtEnd = await b.ev(MARKQ).catch(() => null); const dom = st.tas.map((x) => x.v); const trace = await b.ev('(window.__dlog||[]).slice(0,1200)').catch(() => null); const con = conBuf.splice(0); add({ arm, name, round, dom, server, expected, ok: eq(dom, expected) && eq(server, expected), noteId: id, recorder: 'v2', postDelay: DPD, endMark: { beforeBlur: markBeforeBlur, atEnd: markAtEnd }, failedToSaveBlock: con.filter((c) => /Failed to save block/.test(c.msg)).length, consoleErrWarn: con.filter((c) => c.type === 'error' || c.type === 'warning').slice(0, 20), trace }); };
const armD = async (round) => { const gaps = (process.env.DGAPS || '30,80,150,300').split(',').map(Number); const reps = Number(process.env.DREPS || 3); for (const gap of gaps) for (let i = 0; i < reps; i += 1) {
  const id = await freshT(\`D \${gap}\`);
  for (const line of ['aa', 'bb', 'cc', 'dd']) { await keysAt(line, 40); await sleep(gap); await enter(); await sleep(gap); }
  await keysAt('ee', 40);
  await finishT(id, ['aa', 'bb', 'cc', 'dd', 'ee'], 'D', \`lines\${gap}-\${i}\`, round);
} };`;
// DFAILONCE=1 (positive control for the failure-mark / console detectors): the first PUT text-save of each row is
// answered 500 by the probe (CDP Fetch.fulfillRequest); later writes go through.
const ADD = `
const DPD = Number(process.env.DPOSTDELAY || 0);
const DFAIL = process.env.DFAILONCE === '1'; let failedOnce = false;
if (DPD > 0 || DFAIL) {
  b.on('Fetch.requestPaused', (p) => {
    const u = String(p.request.url).split('?')[0];
    if (DFAIL && !failedOnce && p.request.method === 'PUT' && /\\/text-save$/.test(u)) { failedOnce = true; b.cdp('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 500, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from('{"error":"injected"}').toString('base64') }).catch(() => {}); return; }
    if (DPD > 0 && p.request.method === 'POST' && /\\/api\\/notes\\/[^/]+\\/blocks$/.test(u)) setTimeout(() => b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {}), DPD);
    else b.cdp('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {});
  });
  await b.cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/notes/*', requestStage: 'Request' }, { urlPattern: '*/api/note-blocks/*', requestStage: 'Request' }] });
  console.log('POST /notes/:id/blocks held', DPD, 'ms; first text-save per row answered 500:', DFAIL);
}`;
let out = src.replace(OLD, NEW).replace(ANCHOR, ANCHOR + ADD);
out = `// GENERATED by mk-dtrace2.mjs from matrix.mjs (Tester 11-09): the D arm with recorder v2 and the POST /blocks hold.\n${out}`;
fs.writeFileSync(new URL('matrix-dtrace2.mjs', HERE), out);
console.log('wrote matrix-dtrace2.mjs', out.length, 'bytes');
