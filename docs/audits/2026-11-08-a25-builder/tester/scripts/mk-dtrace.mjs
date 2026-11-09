// Tester(1) 11-09 (A-25 lines30 follow-up, Main_Designer: red rows should carry a request / focus timeline):
// builds matrix-dtrace.mjs = matrix.mjs with the D arm unchanged in what it types and when, plus a page recorder
// installed after the note opens and before the surface click: keydown / input (target, value, caret), focus,
// draft / editor textareas in and out, a 10 ms snapshot of every textarea value (catches programmatic writes that fire
// no input event), and every non-GET request (send / end, status, for text-save and POST blocks the unit texts and
// base revision sent, and the head of the answer). Row gains noteId and trace. DGAPS / DREPS narrow the arm (default =
// the regression arm: gaps 30,80,150,300 x 3). Usage: node mk-dtrace.mjs   (writes matrix-dtrace.mjs next to it)
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
const REC = String.raw`(()=>{if(window.__dlog)return 0;const T0=performance.now();const log=[];window.__dlog=log;const t=()=>Math.round(performance.now()-T0);const push=(e)=>{if(log.length<900)log.push(e)};
const all=()=>[...document.querySelectorAll('textarea')];
const kind=(el)=>!el||!el.tagName?'?':el.dataset&&el.dataset.runtimeTextflowEditor==='true'?'editor':el.tagName==='TEXTAREA'?'draft':el.tagName;
const idx=(el)=>all().indexOf(el);
const val=(el)=>(el&&typeof el.value==='string'?el.value:'').slice(0,40);
document.addEventListener('keydown',(e)=>{const x=e.target;push({t:t(),ev:'key',k:e.key,on:kind(x),i:idx(x),v:val(x),s:x&&x.selectionStart})},true);
document.addEventListener('input',(e)=>{const x=e.target;push({t:t(),ev:'input',it:e.inputType,d:e.data??null,on:kind(x),i:idx(x),v:val(x),s:x&&x.selectionStart})},true);
document.addEventListener('focusin',(e)=>push({t:t(),ev:'focus',on:kind(e.target),i:idx(e.target),v:val(e.target)}),true);
document.addEventListener('focusout',(e)=>push({t:t(),ev:'blur',on:kind(e.target),i:idx(e.target),v:val(e.target)}),true);
new MutationObserver((ms)=>{for(const m of ms){for(const n of m.removedNodes){if(n.nodeType!==1)continue;const xs=[n.tagName==='TEXTAREA'?n:null,...(n.querySelectorAll?n.querySelectorAll('textarea'):[])].filter(Boolean);for(const x of xs)push({t:t(),ev:kind(x)==='editor'?'editor-out':'draft-out',v:val(x)})}
for(const n of m.addedNodes){if(n.nodeType!==1)continue;const xs=[n.tagName==='TEXTAREA'?n:null,...(n.querySelectorAll?n.querySelectorAll('textarea'):[])].filter(Boolean);for(const x of xs)push({t:t(),ev:kind(x)==='editor'?'editor-in':'draft-in',v:val(x)})}}}).observe(document.body,{childList:true,subtree:true});
let last='';setInterval(()=>{const xs=all().filter(x=>x.getBoundingClientRect().width>200);const s=JSON.stringify(xs.map(x=>(kind(x)==='editor'?'E:':'D:')+val(x)+(document.activeElement===x?'@'+x.selectionStart:'')));if(s!==last){last=s;push({t:t(),ev:'snap',v:JSON.parse(s)})}},10);
const idp=(u)=>String(u||'').replace(/^https?:\/\/[^/]+/,'').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,':id').split('?')[0];
const sum=(b)=>{try{const j=JSON.parse(b);const cj=(j&&j.block&&j.block.content_json)||(j&&j.content_json)||null;const us=cj&&cj.text_flow&&cj.text_flow.units;return{rev:j.base_revision,u:us?us.map(u=>u.text):undefined,body:cj&&typeof cj.body==='string'?cj.body.slice(0,60):undefined}}catch(e){return null}};
const XO=XMLHttpRequest.prototype.open,XS=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(m,u){this.__m=m;this.__u=u;return XO.apply(this,arguments)};
XMLHttpRequest.prototype.send=function(b){const m=String(this.__m||'').toUpperCase();if(m&&m!=='GET'){const u=idp(this.__u);const k=t();push({t:k,ev:'xhr',phase:'send',m,u,req:sum(b)});this.addEventListener('loadend',()=>push({t:t(),ev:'xhr',phase:'end',m,u,sent:k,status:this.status,res:String(this.responseText||'').slice(0,200)}))}return XS.apply(this,arguments)};
const F=window.fetch;window.fetch=function(i,o){const m=String((o&&o.method)||(i&&i.method)||'GET').toUpperCase();if(m==='GET')return F.apply(this,arguments);const u=idp(i&&i.url||i);const k=t();push({t:k,ev:'xhr',phase:'send',m,u,fetch:true,req:sum(o&&o.body)});return F.apply(this,arguments).then((r)=>{push({t:t(),ev:'xhr',phase:'end',m,u,sent:k,status:r.status,fetch:true});return r},(e)=>{push({t:t(),ev:'xhr',phase:'end',m,u,sent:k,status:'err',fetch:true});throw e})};
return 1})()`;
const NEW = `const DREC = ${JSON.stringify(REC)};
const freshT = async (title) => { const id = await newNote(title); await open(id); await b.ev(DREC); await clickTa(0); await sleep(800); return id; };
const finishT = async (id, expected, arm, name, round) => { await sleep(1500); const st = await state(); await blurOutside(); await sleep(1800); const server = await serverUnits(id); const dom = st.tas.map((x) => x.v); const trace = await b.ev('(window.__dlog||[]).slice(0,900)').catch(() => null); add({ arm, name, round, dom, server, expected, ok: eq(dom, expected) && eq(server, expected), noteId: id, trace }); };
const armD = async (round) => { const gaps = (process.env.DGAPS || '30,80,150,300').split(',').map(Number); const reps = Number(process.env.DREPS || 3); for (const gap of gaps) for (let i = 0; i < reps; i += 1) {
  const id = await freshT(\`D \${gap}\`);
  for (const line of ['aa', 'bb', 'cc', 'dd']) { await keysAt(line, 40); await sleep(gap); await enter(); await sleep(gap); }
  await keysAt('ee', 40);
  await finishT(id, ['aa', 'bb', 'cc', 'dd', 'ee'], 'D', \`lines\${gap}-\${i}\`, round);
} };`;
let out = src.replace(OLD, NEW);
out = `// GENERATED by mk-dtrace.mjs from matrix.mjs (Tester 11-09): the D arm with a page recorder (see mk-dtrace.mjs).\n${out}`;
fs.writeFileSync(new URL('matrix-dtrace.mjs', HERE), out);
console.log('wrote matrix-dtrace.mjs', out.length, 'bytes; D arm replaced');
