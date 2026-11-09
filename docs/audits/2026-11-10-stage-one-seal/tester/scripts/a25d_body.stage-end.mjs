// A-25 ②a (iv) D: Apply on a kept block-edit receipt that meets a 409 (Tester(1) 2026-11-09; rulings in the A-25 order,
// "②a (iv) D 施工前两问 → 裁", "(iv) D 做完", "Reviewer 封前读 D 结"). Build: cat a25_head.mjs a25d_body.mjs > a25d_probe.mjs.
// The same file on the A-25 base (A-20b r2: every 409 is today's conflict item) and on the package.
//
// One arm = a note with one block of two lines ['alpha beta', 'one two'] (made through the API; optional inline link);
// every text-save held; the edit typed in the browser; its save held as the head; the page closes (the receipt stays);
// reopen (this visit's opened texts = the server's); a SECOND WRITER moves the server through the API (a normal text-save
// at the current revision - node's own fetch, not this Chrome); then Apply on the recovery item. Apply's save carries the
// old revision -> 409 -> D. Read 6 s later: the server, the PUTs with their answers, the recovery items, the receipt store.
//   D-anchor   edit ' gamma' after 'alpha beta'; move ['zero alpha beta', 'one two three']. Exit 1 (every unit anchors):
//              PUTs 409, 200; server ['zero alpha beta gamma', 'one two three']; the receipt forgotten; no conflict item.
//   D-unanch   edit ' gamma'; move line 1 -> 'something else' (the anchor is gone). Exit 2: one PUT (409); the server as
//              moved; a conflict item (today's shape); the receipt kept.
//   D-struct   edit Enter + 'gamma' after 'alpha beta' (the receipt has a unit the opened block did not); move line 1 ->
//              'zero alpha beta'. Exit 2 (structure): as D-unanch.
//   D-same     edit ' gamma'; move ['alpha beta gamma', 'one two three'] (the receipt's words are already there). Exit 3:
//              one PUT (409); nothing written; the receipt forgotten; no conflict item.
//   D-twice    edit ' gamma'; move line 1 -> 'zero alpha beta'; the merged save is held at the request stage, the server
//              moves again (line 2 -> 'one two three'), then released. Exit 4: PUTs 409, 409, no third; server
//              ['zero alpha beta', 'one two three']; a conflict item; its body = the merged text (O3):
//              'zero alpha beta gamma' / 'one two'.
//   D-delonly  edit: Backspace x5 ('alpha', a delete-only receipt); move line 1 -> 'alpha beta extra'. D1: not "already the
//              same" -> exit 2: one PUT (409); nothing written; a conflict item; the receipt kept.
//   D-link-before / D-link-after  line 1 carries an inline link on 'beta'; edit 'X ' at the start of line 1 / ' X' at its
//              end; move line 2 -> 'one two three'. Exit 1, and D2: on the server the link's range still covers 'beta'.
// Rules: never Replay, never View differences, never Discard (only Apply). Local backend only (the second writer is this
// probe's own scratch account on 127.0.0.1).
const D_ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const wantD = (n) => !D_ONLY || D_ONLY.some((p) => n.startsWith(p));
const REPS_D = Number(process.env.REPS_D || 2);
if (!/^http:\/\/127\.0\.0\.1:\d+\/api$/.test(API)) throw new Error('the D probe writes through the API: local backend only');
const EDSD = `[...document.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {v:e.value,x:r.left,y:r.top,h:r.height}})`;
const clickLine = async (v, where) => { const e = (await b.ev(EDSD)).find((x) => x.v === v); if (!e) return false; await b.click(e.x + 120, e.y + Math.min(e.h, 24) / 2); await sleep(300); if (where === 'start') await press('Home', 'Home', 36); else await press('End', 'End', 35); await sleep(200); return true; };
const watchND = () => b.ev(String.raw`(()=>{const T0=performance.now();window.__toastsN=[];const seen=new WeakSet();const sel='[role=alert],[class*=toast],[class*=Toast]';
const take=(el)=>{if(seen.has(el))return;seen.add(el);setTimeout(()=>{const s=(el.innerText||'').replace(/\s+/g,' ').trim().slice(0,110);if(s)window.__toastsN.push({t:Math.round(performance.now()-T0),s})},60)};
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches&&n.matches(sel))take(n);if(n.querySelectorAll)for(const x of n.querySelectorAll(sel))take(x)}}).observe(document.body,{childList:true,subtree:true});1})()`);
const toastsD = () => b.ev('(window.__toastsN||[]).slice()').catch(() => null);
// Every visible recovery item / notice (outermost [role=status] / [role=alert]), its text and its visible buttons.
const ITEMS = String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;const out=[];for(const x of document.querySelectorAll('[role=status],[role=alert]')){if(!vis(x))continue;if(x.parentElement&&x.parentElement.closest('[role=status],[role=alert]'))continue;const t=(x.innerText||'').replace(/\s+/g,' ').trim().slice(0,400);if(!t)continue;out.push({t,buttons:[...x.querySelectorAll('button')].filter(vis).map((y)=>y.textContent.trim())})}return out})()`;
const isConflict = (items) => (items || []).some((x) => x.buttons.includes('Replay') || /older version|View differences/i.test(x.t));
const applyButton = String.raw`(()=>{const vis=(e)=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&e.getBoundingClientRect().width>0;const x=[...document.querySelectorAll('[role=status] button')].find((y)=>vis(y)&&y.textContent.trim()==='Apply');if(!x)return null;const r=x.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`;
// The receipt store (A-20 r3e: localStorage, per account): this block's entries, their text and base revision.
const receiptsFor = (blockId) => b.ev(`(()=>{const out=[];for(const [n,st] of [['local',localStorage],['session',sessionStorage]]){for(const k of Object.keys(st)){if(!k.startsWith('coincides:draft-recovery'))continue;let v=null;try{v=JSON.parse(st.getItem(k)||'null')}catch(e){continue}const list=Array.isArray(v)?v:(v&&Array.isArray(v.receipts)?v.receipts:(v&&typeof v==='object'?Object.values(v):[]));for(const e of list){if(e&&e.blockId===${JSON.stringify(blockId)})out.push({store:n,text:e.text??null,base:e.baseRevision??null})}}}return out})()`).catch(() => null);
const flowD = (texts, links) => ({ block_type: 'paragraph', content_json: { body: texts.join(String.fromCharCode(10)), text_flow: { textflow_version: 'TextBlockContentV1',
  units: texts.map((t, k) => ({ id: `tu-${k + 1}`, text: t, writing_role: 'paragraph', indent_level: 0, order_index: k, metadata: {}, status: 'active' })),
  inline_structures: (links || []).map((l, k) => ({ id: `inline-link-d${k}`, semantic_kind: 'inline_link', parent_text_unit_id: l.unit, anchor_text: texts[Number(l.unit.slice(3)) - 1].slice(l.start, l.end), anchor_range: { start: l.start, end: l.end }, field_values: { target_kind: 'note', note_id: l.note }, metadata: {}, status: 'active' })),
  metadata: {} } }, order_index: 0 });
const blocksRaw = async (noteId) => { const j = await (await fetch(`${API}/notes/${noteId}/blocks`, { headers: auth })).json(); return Array.isArray(j) ? j : (j.blocks || []); };
const cjOf = (blk) => (typeof blk.content_json === 'string' ? JSON.parse(blk.content_json) : blk.content_json);
const flowOf = async (noteId, blockId) => { const blk = (await blocksRaw(noteId)).find((x) => x.id === blockId); return blk ? cjOf(blk).text_flow : null; };
const unitsOfD = (flow) => (flow ? flow.units.filter((u) => u.status !== 'deleted').map((u) => u.text) : null);
const linkSlices = (flow) => (flow ? (flow.inline_structures || []).filter((s) => s.semantic_kind === 'inline_link' && s.status !== 'deleted').map((s) => { const u = flow.units.find((x) => x.id === s.parent_text_unit_id); return { range: s.anchor_range, text: u && s.anchor_range ? u.text.slice(s.anchor_range.start, s.anchor_range.end) : null }; }) : null);
// The second writer: one normal text-save at the block's current revision (409 -> once more at the revision it names).
const apiMove = async (noteId, blockId, change) => {
  const blk = (await blocksRaw(noteId)).find((x) => x.id === blockId); if (!blk) return { status: 'no block' };
  const cj = cjOf(blk); const fl = cj.text_flow;
  const units = fl.units.map((u) => (change[u.id] != null ? { ...u, text: change[u.id] } : u));
  const content = { ...cj, body: units.filter((u) => u.status !== 'deleted').map((u) => u.text).join(String.fromCharCode(10)), text_flow: { ...fl, units } };
  let rev = Number.isInteger(blk.text_save_revision) ? blk.text_save_revision : 0;
  for (let k = 0; k < 2; k += 1) {
    const r = await fetch(`${API}/note-blocks/${blockId}/text-save`, { method: 'PUT', headers: auth, body: JSON.stringify({ note_id: noteId, base_revision: rev, block: { content_json: content }, annotations: { range_updates: [] }, text_ranges: [] }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return { status: r.status, from: rev, to: j.revision ?? null };
    const cur = j?.details?.current_revision ?? j?.current_revision;
    if (r.status === 409 && Number.isInteger(cur) && k === 0) { rev = cur; continue; }
    return { status: r.status, error: j };
  }
  return { status: 'gave up' };
};
const savesD = () => net.filter((l) => /text-save/.test(l)).map((l) => l.replace(/^(\d+) /, '$1 ').slice(0, 160));
const answersD = () => net.filter((l) => /RESP \/note-blocks\/:id\/text-save/.test(l)).map((l) => Number(l.match(/ (\d{3})/)?.[1]));
const OTHER_NOTE = await newNote('A25 D link target');
const D_ARMS = [
  { n: 'D-anchor', edit: async () => { await clickLine('alpha beta'); await typeText(' gamma', 90); }, move: { 'tu-1': 'zero alpha beta', 'tu-2': 'one two three' },
    want: { answers: [409, 200], units: ['zero alpha beta gamma', 'one two three'], receipt: false, conflict: false } },
  { n: 'D-unanch', edit: async () => { await clickLine('alpha beta'); await typeText(' gamma', 90); }, move: { 'tu-1': 'something else' },
    want: { answers: [409], units: ['something else', 'one two'], receipt: true, conflict: true } },
  { n: 'D-struct', edit: async () => { await clickLine('alpha beta'); await enter(); await sleep(150); await typeText('gamma', 90); }, move: { 'tu-1': 'zero alpha beta' },
    want: { answers: [409], units: ['zero alpha beta', 'one two'], receipt: true, conflict: true } },
  { n: 'D-same', edit: async () => { await clickLine('alpha beta'); await typeText(' gamma', 90); }, move: { 'tu-1': 'alpha beta gamma', 'tu-2': 'one two three' },
    want: { answers: [409], units: ['alpha beta gamma', 'one two three'], receipt: false, conflict: false } },
  { n: 'D-twice', edit: async () => { await clickLine('alpha beta'); await typeText(' gamma', 90); }, move: { 'tu-1': 'zero alpha beta' }, move2: { 'tu-2': 'one two three' },
    want: { answers: [409, 409], units: ['zero alpha beta', 'one two three'], receipt: true, conflict: true, receiptText: 'zero alpha beta gamma\none two' } },
  { n: 'D-delonly', edit: async () => { await clickLine('alpha beta'); for (let k = 0; k < 5; k += 1) { await backspace(); await sleep(80); } }, move: { 'tu-1': 'alpha beta extra' },
    want: { answers: [409], units: ['alpha beta extra', 'one two'], receipt: true, conflict: true } },
  { n: 'D-link-before', links: [{ unit: 'tu-1', start: 6, end: 10 }], edit: async () => { await clickLine('alpha beta', 'start'); await typeText('X ', 90); }, move: { 'tu-2': 'one two three' },
    want: { answers: [409, 200], units: ['X alpha beta', 'one two three'], receipt: false, conflict: false, link: 'beta' } },
  { n: 'D-link-after', links: [{ unit: 'tu-1', start: 6, end: 10 }], edit: async () => { await clickLine('alpha beta'); await typeText(' X', 90); }, move: { 'tu-2': 'one two three' },
    want: { answers: [409, 200], units: ['alpha beta X', 'one two three'], receipt: false, conflict: false, link: 'beta' } },
];
for (const arm of D_ARMS) for (let i = 0; i < REPS_D; i += 1) {
  const name = `${arm.n}-${i}`; if (!wantD(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`A25 ${arm.n} ${i}`);
    const r = await fetch(`${API}/notes/${id}/blocks`, { method: 'POST', headers: auth, body: JSON.stringify(flowD(['alpha beta', 'one two'], (arm.links || []).map((l) => ({ ...l, note: OTHER_NOTE })))) });
    if (!r.ok) throw new Error(`setup block ${r.status}`);
    const blockId = (await blocksRaw(id))[0]?.id; if (!blockId) throw new Error('setup: no block id');
    await open(id); await sleep(2500);
    mark(); rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
    await arm.edit();
    for (let k = 0; k < 40 && !held.length; k += 1) await sleep(150);
    let headKind = 'idle';
    if (!held.length) { headKind = 'sealed'; await blurOutside(); for (let k = 0; k < 30 && !held.length; k += 1) await sleep(100); }
    if (held.length !== 1) throw new Error(`setup: the edit's save was not held as the one head (held ${held.length})`);
    const edited = savesD();
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1000);
    rule = () => 'continue'; held.length = 0;
    await open(id); await sleep(2500); await watchND();
    const reopen = { items: await b.ev(ITEMS).catch(() => null), receipts: await receiptsFor(blockId), units: unitsOfD(await flowOf(id, blockId)) };
    if (!(await b.ev(applyButton))) throw new Error(`setup: no recovery item with Apply after the reopen ${JSON.stringify(reopen.items)}`);
    const mv = await apiMove(id, blockId, arm.move);
    if (mv.status !== 200) throw new Error(`setup: the second writer's save failed ${JSON.stringify(mv)}`);
    mark();
    let nSave = 0; let mv2 = null;
    if (arm.move2) rule = ({ u }) => { if (/text-save/.test(u)) { nSave += 1; if (nSave === 2) return 'hold'; } return 'continue'; };
    const at = await b.ev(applyButton); if (!at) throw new Error('setup: the Apply button went away before the click');
    await b.click(at.x, at.y);
    if (arm.move2) {
      for (let k = 0; k < 50 && !held.length; k += 1) await sleep(100);
      if (held.length === 1) { mv2 = await apiMove(id, blockId, arm.move2); }
      rule = () => 'continue'; await release();
    }
    await sleep(6000);
    const flow = await flowOf(id, blockId);
    const got = { answers: answersD(), units: unitsOfD(flow), items: await b.ev(ITEMS).catch(() => null), receipts: await receiptsFor(blockId), links: linkSlices(flow), toasts: await toastsD(), saves: savesD() };
    const w = arm.want;
    const check = {
      answers: JSON.stringify(got.answers) === JSON.stringify(w.answers),
      units: JSON.stringify(got.units) === JSON.stringify(w.units),
      receipt: (got.receipts || []).length > 0 === w.receipt,
      conflict: isConflict(got.items) === w.conflict,
    };
    if (w.receiptText) check.receiptText = (got.receipts || []).some((x) => x.text === w.receiptText);
    if (w.link) check.link = (got.links || []).length === 1 && got.links[0].text === w.link;
    if (arm.move2) check.secondHeld = !!mv2 && mv2.status === 200;
    row(name, id, { exit: arm.n, headKind, edited, reopen, move: mv, move2: mv2, got, want: w, check }, Object.values(check).every(Boolean));
  });
}
// ---- C-convert (stage-one seal, Tester 2026-11-10; A-25 order (iv) decision C, owed arm, TD-79 ②; Main_Designer
// ruling 5: test only "the other visit's entry stays", 1 round). A template conversion (/code or /formula typed in the
// block) forgets only THIS visit's recovery entries (adapter A:2630-2635 filters by mountNonce + generation); an entry
// planted in ANOTHER visit (D plant: edit held, page closed, reopened = new mount) must survive the conversion.
// LIMIT (stated in the verdict): "this visit's entry is forgotten" cannot be pinned on the conversion in a browser - by the
// time the conversion collects, this visit's own typing save has already forgotten its entry (or a failed one aborts the
// conversion); that half belongs to the unit test (TD-79 ②). Positive control: the A-25 base (one entry per block): the
// slash command's own typing save replaces the planted entry before the conversion (expected red, direction 2).
// (11-10: the 'Converted to' toast and the failure toasts left the gate and are readings - Main_Designer ruling after
// the first run, where the conversion landed on the server but no toast showed in 2/2.)
// Pass: conv (conversion PUT 200 + server shows the template) AND keepOther (the planted entry present at
// mid - the conversion request held - and after, text unchanged, an Apply item visible after) AND noThis (no entry for the
// block after the conversion that was not there at the reopen). Never Replay / View / Discard.
const REPS_C = Number(process.env.REPS_C || 1);
const receiptsFull = (blockId) => b.ev(`(()=>{const out=[];for(const [n,st] of [['local',localStorage],['session',sessionStorage]]){for(const k of Object.keys(st)){if(!k.startsWith('coincides:draft-recovery'))continue;let v=null;try{v=JSON.parse(st.getItem(k)||'null')}catch(e){continue}const list=Array.isArray(v)?v:(v&&Array.isArray(v.receipts)?v.receipts:(v&&typeof v==='object'?Object.values(v):[]));for(const e of list){if(e&&e.blockId===${JSON.stringify(blockId)})out.push({store:n,key:e.recoveryKey??null,nonce:e.mountNonce??null,gen:e.creationGeneration??null,seq:e.operationSequence??null,text:e.text??null,base:e.baseRevision??null})}}}return out})()`).catch(() => null);
const slash = () => key('/', 'Slash', 191, '/');
const C_ARMS = [
  { n: 'C-convert-code', cmd: 'code', holdIf: (pd) => pd.startsWith('[code_line]'), conv: (blk, cj) => (blk.metadata?.template_key === 'code.snippet' || cj?.metadata?.template_key === 'code.snippet' || JSON.stringify(cj || {}).includes('code_line')), toast: /Converted to Code/i },
  { n: 'C-convert-formula', cmd: 'formula', holdIf: (pd) => pd === '', conv: (blk) => blk.block_type === 'formula', toast: /Converted to Formula/i },
];
const FAILTOAST = /fail|could not|error/i;
for (const arm of C_ARMS) for (let i = 0; i < REPS_C; i += 1) {
  const name = `${arm.n}-${i}`; if (!wantD(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`A25 ${arm.n} ${i}`);
    const r = await fetch(`${API}/notes/${id}/blocks`, { method: 'POST', headers: auth, body: JSON.stringify(flowD(['alpha beta', 'one two'])) });
    if (!r.ok) throw new Error(`setup block ${r.status}`);
    const blockId = (await blocksRaw(id))[0]?.id; if (!blockId) throw new Error('setup: no block id');
    // plant: an entry of ANOTHER visit (the D plant)
    await open(id); await sleep(2500);
    mark(); rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
    await clickLine('alpha beta'); await typeText(' gamma', 90);
    for (let k = 0; k < 40 && !held.length; k += 1) await sleep(150);
    if (!held.length) { await blurOutside(); for (let k = 0; k < 30 && !held.length; k += 1) await sleep(100); }
    if (held.length !== 1) throw new Error(`setup: the plant's save was not held as the one head (held ${held.length})`);
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1000);
    rule = () => 'continue'; held.length = 0;
    await open(id); await sleep(2500); await watchND();
    const reopen = { items: await b.ev(ITEMS).catch(() => null), receipts: await receiptsFull(blockId), units: unitsOfD(await flowOf(id, blockId)) };
    if (!(await b.ev(applyButton))) throw new Error(`setup: no recovery item with Apply after the reopen ${JSON.stringify(reopen.items)}`);
    const planted = (reopen.receipts || []).filter((x) => x.text === 'alpha beta gamma\none two');
    if (planted.length !== 1) throw new Error(`setup: expected exactly one planted entry, got ${JSON.stringify(reopen.receipts)}`);
    if (JSON.stringify(reopen.units) !== JSON.stringify(['alpha beta', 'one two'])) throw new Error(`setup: the server moved ${JSON.stringify(reopen.units)}`);
    const K_OTHER = planted[0].key; const reopenKeys = new Set((reopen.receipts || []).map((x) => x.key));
    // the conversion, in this visit
    mark();
    if (!(await clickLine('one two'))) throw new Error('setup: no line "one two" to click');
    await typeText(' ', 90); await slash(); await sleep(90); await typeText(arm.cmd, 90); await sleep(700);
    const menu = await b.ev(`[...document.querySelectorAll('[role=listbox] [role=option],[role=menu] [role=menuitem],[data-slash-command]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>(e.textContent||'').trim().slice(0,40)).slice(0,12)`).catch(() => null);
    // 11-10 (Main_Designer ruling on the first C-convert reds): the conversion request is held only when CHOLD != '0'
    // (default held; CHOLD=0 = not held, then there is no mid reading). The screen is sampled every ~100 ms from the
    // conversion's answer to +3 s (is the block a code / formula block on screen? class names in the build:
    // *codeTextArea* / *formulaBlock*), and this visit's entries for the block are read at the answer + 2 s.
    const CHOLD = process.env.CHOLD !== '0';
    let convSentAt = null;
    rule = ({ u, pd }) => { if (/text-save/.test(u) && arm.holdIf(pd || '') && convSentAt == null) { convSentAt = Date.now() - t0; return CHOLD ? 'hold' : 'continue'; } return 'continue'; };
    await enter();
    for (let k = 0; k < 160 && convSentAt == null; k += 1) await sleep(50);
    if (convSentAt == null) { const tz = await toastsD(); throw new Error(`setup: no conversion request seen (menu ${JSON.stringify(menu)}; toasts ${JSON.stringify(tz)}; saves ${JSON.stringify(savesD())})`); }
    if (CHOLD) { for (let k = 0; k < 40 && held.length !== 1; k += 1) await sleep(50); if (held.length !== 1) throw new Error(`setup: the conversion request was not held (held ${held.length}; saves ${JSON.stringify(savesD())})`); }
    const mid = CHOLD ? await receiptsFull(blockId) : null;
    rule = () => 'continue'; if (CHOLD) await release();
    // the conversion's answer = the first text-save response at or after the conversion request
    let convAnsAt = null; let convAns = null;
    for (let k = 0; k < 160 && convAnsAt == null; k += 1) { const l = net.find((x) => /RESP \/note-blocks\/:id\/text-save/.test(x) && Number(x.split(' ')[0]) >= convSentAt); if (l) { convAnsAt = Number(l.split(' ')[0]); convAns = Number((l.match(/ (\d{3})/) || [])[1]); } else await sleep(50); }
    const SCREEN = `(()=>{const a=document.querySelector('article[data-block-id="${blockId}"]');if(!a)return {art:false};const eds=[...a.querySelectorAll('textarea[data-runtime-textflow-editor="true"]')].map(e=>e.value);return {art:true,code:!!a.querySelector('[class*=codeTextArea]'),formula:!!a.querySelector('[class*=formulaBlock]'),emptyFormula:/Empty formula/.test(a.textContent||''),eds}})()`;
    const screen = []; let thisAt2 = null; const endS = (convAnsAt ?? (Date.now() - t0)) + 3000;
    while (Date.now() - t0 < endS) {
      const t = Date.now() - t0; const s = await b.ev(SCREEN).catch((e) => ({ err: String(e).slice(0, 60) })); const sk = JSON.stringify(s);
      const last = screen[screen.length - 1]; if (last && last.sk === sk) { last.to = t; last.n += 1; } else screen.push({ from: t, to: t, n: 1, sk, s });
      if (thisAt2 == null && convAnsAt != null && t >= convAnsAt + 2000) { const rs = await receiptsFull(blockId); thisAt2 = { t: Date.now() - t0, entries: (rs || []).filter((x) => x.key !== K_OTHER).map((x) => ({ key: x.key, nonce: x.nonce, gen: x.gen, text: x.text })) }; }
      await sleep(100);
    }
    const wantKind = arm.cmd === 'code' ? 'code' : 'formula';
    const onScreenBy2s = convAnsAt != null && screen.some((x) => x.s && x.s[wantKind] && x.from <= convAnsAt + 2000);
    const firstOnScreen = (screen.find((x) => x.s && x.s[wantKind]) || {}).from ?? null;
    const after = await receiptsFull(blockId);
    const blk = (await blocksRaw(id)).find((x) => x.id === blockId) || null; const cj = blk ? cjOf(blk) : null;
    const got = { menu, mid, after, items: await b.ev(ITEMS).catch(() => null), answers: answersD(), toasts: await toastsD(), saves: savesD(),
      block: blk ? { type: blk.block_type, template: blk.metadata?.template_key ?? cj?.metadata?.template_key ?? null, units: cj?.text_flow ? cj.text_flow.units.map((u) => `${u.writing_role}:${u.text}`) : null } : null,
      kept: await storedFor(id) };
    const lastAns = got.answers[got.answers.length - 1];
    // Gate = Main_Designer's four (11-10): the other visit's entry stays (held: also mid) / its Apply item is still offered /
    // no new entry for the block / the conversion is on the server. The 'Converted to' toast and the failure toasts are
    // readings (the toast left the gate by the same ruling).
    const check = {
      conv: lastAns === 200 && !!blk && arm.conv(blk, cj),
      keepOther: (CHOLD ? (mid || []).some((x) => x.key === K_OTHER && x.text === planted[0].text) : true) && (after || []).some((x) => x.key === K_OTHER && x.text === planted[0].text) && !!(await b.ev(applyButton)),
      noThis: !(after || []).some((x) => !reopenKeys.has(x.key)),
    };
    const readings = { hold: CHOLD, convSentAt, convAnsAt, convAns, convToast: (got.toasts || []).some((x) => arm.toast.test(x.s)),
      failToasts: (got.toasts || []).filter((x) => FAILTOAST.test(x.s) && !/queued for recovery/i.test(x.s)).map((x) => `${x.t}:${x.s}`),
      onScreenBy2s, firstOnScreen, screen: screen.map(({ sk, ...x }) => x), thisVisitAt2s: thisAt2 };
    // information: which failure direction a red shows (order of the design: mid lost = replaced before the conversion;
    // mid kept, after lost = the conversion forgot the other visit's entry)
    const direction = check.keepOther ? null : !(mid || []).some((x) => x.key === K_OTHER) ? 'lost before the conversion (replaced: one entry per block)' : 'forgotten by the conversion';
    row(name, id, { exit: arm.n, reopen, K_OTHER, got, check, readings, direction, limit: 'this-visit forget not pinned in a browser (unit test, TD-79 ②)' }, Object.values(check).every(Boolean));
  });
}
// ---- APPLYTYPE (stage-one seal, Tester 2026-11-10; A-25 order (iv) :188 "Apply-slow + 在途同块打字两种放行顺序", owed;
// Main_Designer ruling 5, 1 round). The D plant (an entry of another visit: 'alpha beta gamma' / 'one two'); Apply clicked
// and its PUT (the one carrying 'gamma') held at the request stage; while it is held the person types ' delta' at the end
// of line 2 of the SAME block; two release orders:
//   APPLYTYPE-applyfirst  Apply released at click + 2.5 s (the typing's idle save is due by then); the typing goes after.
//   APPLYTYPE-typefirst   Apply held until the typing's save has gone through (answered) - if the write lane lets it go
//                         while Apply is held; if the typing never goes while Apply is held (the lane serialises), the
//                         row records "serialised" and Apply is released at click + 8 s (then this order is not reachable).
// Read 8 s after Apply's release and again after a reload. Gate (Henry's ruler): no loss - 'gamma' and 'delta' each on the
// server exactly once, OR (for gamma) still offered in a recovery item / receipt (a conflict item is today's exit, not
// a loss); no duplicate; zero failure toasts other than O2 ('Failed to save block' right before 'Recovered block edit
// applied', ruled 🅱). Never Replay / View / Discard.
const REPS_AT = Number(process.env.REPS_AT || 1);
// 11-10 readings for TD-85 (Main_Designer; readings, not a diagnosis): every text-save request's base revision (from its
// body) and every text-save response's revision, via the Network domain (no interception, no timing change); and the
// editor text sampled every ~40 ms from Apply's release until 1.5 s after the typing save went out.
const revLog = []; const revReq = new Map();
const pickRev = (j) => { if (!j || typeof j !== 'object') return null; const out = {}; for (const [k, v] of Object.entries(j)) if (/revision/i.test(k) && (typeof v === 'number' || typeof v === 'string')) out[k] = v; if (j.block && typeof j.block === 'object') for (const [k, v] of Object.entries(j.block)) if (/revision/i.test(k) && (typeof v === 'number' || typeof v === 'string')) out[`block.${k}`] = v; return Object.keys(out).length ? out : null; };
b.on('Network.requestWillBeSent', (p) => { const u = p.request?.url || ''; if (!/text-save/.test(u) || p.request.method !== 'PUT') return; let base = null; try { base = pickRev(JSON.parse(p.request.postData || 'null')); } catch { base = 'unparsed'; } const q = { t: Date.now() - t0, base, words: summarize(p.request.postData || '') }; revReq.set(p.requestId, q); revLog.push({ kind: 'req', ...q }); });
b.on('Network.responseReceived', (p) => { const q = revReq.get(p.requestId); if (q) q.status = p.response?.status; });
b.on('Network.loadingFinished', async (p) => { const q = revReq.get(p.requestId); if (!q) return; revReq.delete(p.requestId); let rev = null; try { const m = await b.cdp('Network.getResponseBody', { requestId: p.requestId }); const r = m.result || {}; if (m.error) throw new Error(m.error.message || 'getResponseBody error'); rev = pickRev(JSON.parse(r.base64Encoded ? Buffer.from(r.body, 'base64').toString() : r.body)); } catch (e) { rev = `n/a ${String(e).slice(0, 60)}`; } revLog.push({ kind: 'resp', t: Date.now() - t0, status: q.status ?? null, rev, words: q.words, reqBase: q.base }); });
for (const form of ['applyfirst', 'typefirst']) for (let i = 0; i < REPS_AT; i += 1) {
  const name = `APPLYTYPE-${form}-${i}`; if (!wantD(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`A25 applytype ${form} ${i}`);
    const r = await fetch(`${API}/notes/${id}/blocks`, { method: 'POST', headers: auth, body: JSON.stringify(flowD(['alpha beta', 'one two'])) });
    if (!r.ok) throw new Error(`setup block ${r.status}`);
    const blockId = (await blocksRaw(id))[0]?.id; if (!blockId) throw new Error('setup: no block id');
    await open(id); await sleep(2500);
    mark(); rule = ({ u }) => (/text-save/.test(u) ? 'hold' : 'continue');
    await clickLine('alpha beta'); await typeText(' gamma', 90);
    for (let k = 0; k < 40 && !held.length; k += 1) await sleep(150);
    if (!held.length) { await blurOutside(); for (let k = 0; k < 30 && !held.length; k += 1) await sleep(100); }
    if (held.length !== 1) throw new Error(`setup: the plant's save was not held as the one head (held ${held.length})`);
    await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(1000);
    rule = () => 'continue'; held.length = 0;
    await open(id); await sleep(2500); await watchND();
    const reopen = { items: await b.ev(ITEMS).catch(() => null), receipts: await receiptsFull(blockId), units: unitsOfD(await flowOf(id, blockId)) };
    const at = await b.ev(applyButton); if (!at) throw new Error(`setup: no recovery item with Apply after the reopen ${JSON.stringify(reopen.items)}`);
    mark(); revLog.length = 0; let applyHeld = false; let typeSent = null; let typeAnswered = null;
    rule = ({ u, pd }) => { if (/text-save/.test(u)) { if (!applyHeld && /gamma/.test(pd || '')) { applyHeld = true; return 'hold'; } if (/delta/.test(pd || '') && typeSent == null) typeSent = Date.now() - t0; } return 'continue'; };
    const clickAt = Date.now() - t0; await b.click(at.x, at.y);
    for (let k = 0; k < 50 && !applyHeld; k += 1) await sleep(100);
    if (!applyHeld) throw new Error(`setup: Apply's request (carrying gamma) was not held; saves ${JSON.stringify(savesD())}`);
    if (!(await clickLine('one two'))) throw new Error('setup: no line "one two" while Apply is held');
    await typeText(' delta', 90); const typedAt = Date.now() - t0;
    let serialised = false;
    if (form === 'applyfirst') { while (Date.now() - t0 < clickAt + 2500) await sleep(50); }
    else {
      // wait for the typing's save to go AND be answered while Apply is held (up to click + 8 s)
      for (;;) { await sleep(100); if (typeSent != null) { const n = net.findIndex((l) => /RESP \/note-blocks\/:id\/text-save/.test(l) && Number(l.split(' ')[0]) >= typeSent); if (n >= 0) { typeAnswered = Number(net[n].split(' ')[0]); break; } } if (Date.now() - t0 > clickAt + 8000) { serialised = typeSent == null; break; } }
    }
    const releaseAt = Date.now() - t0; const atRelease = { eds: (await b.ev(EDSD)).map((x) => x.v), items: await b.ev(ITEMS).catch(() => null) };
    // after the release: the first text-save carrying 'delta' that goes out from now on = the typing save after Apply
    let typeAfter = null;
    rule = ({ u, pd }) => { if (/text-save/.test(u) && /delta/.test(pd || '') && typeAfter == null) typeAfter = Date.now() - t0; return 'continue'; };
    await release();
    const edsSamples = []; const sampleEnd = Date.now() + 8000;
    while (Date.now() < sampleEnd) {
      const t = Date.now() - t0; const s = ((await b.ev(EDSD).catch(() => [])) || []).map((x) => x.v).join('|');
      const last = edsSamples[edsSamples.length - 1]; if (last && last.s === s) { last.to = t; last.n += 1; } else edsSamples.push({ from: t, to: t, n: 1, s, gamma: /gamma/.test(s) });
      if (typeAfter != null && t > typeAfter + 1500) break;
      await sleep(40);
    }
    { const rest = sampleEnd - Date.now(); if (rest > 0) await sleep(rest); }
    const gammaOnScreenBeforeTypeSave = edsSamples.some((x) => x.gamma && (typeAfter == null || x.from < typeAfter));
    const applyResp = revLog.find((x) => x.kind === 'resp' && /gamma/.test(x.words || '') && !/delta/.test(x.words || ''));
    const typeReq = revLog.find((x) => x.kind === 'req' && typeAfter != null && x.t >= releaseAt && /delta/.test(x.words || ''));
    const read = async () => { const flow = await flowOf(id, blockId); return { units: unitsOfD(flow), eds: (await b.ev(EDSD).catch(() => [])).map((x) => x.v), items: await b.ev(ITEMS).catch(() => null), receipts: await receiptsFull(blockId), kept: await storedFor(id), boxes: (await boxes().catch(() => [])).map((x) => x.v) }; };
    const r1 = await read(); const toasts = await toastsD();
    await open(id); await sleep(4000); const r2 = await read();
    const onServer = (w) => (r2.units || []).join('|').split(w).length - 1;
    const offered = (w) => (r2.items || []).some((x) => x.t.includes(w)) || (r2.receipts || []).some((x) => (x.text || '').includes(w)) || (r2.boxes || []).some((x) => x.includes(w)) || (r2.kept || []).some((x) => String(x).includes(w));
    const where = (w) => (onServer(w) ? `server x${onServer(w)}` : offered(w) ? 'offered (item / receipt / box)' : 'NOWHERE');
    const failToasts = (toasts || []).filter((x) => /fail|could not|error/i.test(x.s) && !/queued for recovery/i.test(x.s));
    const o2Only = failToasts.every((x) => /Failed to save block/.test(x.s)) && (toasts || []).some((x) => /Recovered block edit applied/i.test(x.s));
    const check = {
      gammaKept: onServer('gamma') === 1 || (onServer('gamma') === 0 && offered('gamma')),
      deltaKept: onServer('delta') === 1 || (onServer('delta') === 0 && offered('delta')),
      noDup: onServer('gamma') <= 1 && onServer('delta') <= 1,
      toasts: failToasts.length === 0 || o2Only,
    };
    row(name, id, { form, serialised, clickAt, typedAt, typeSent, typeAnswered, releaseAt, typeAfter, gammaOnScreenBeforeTypeSave, edsSamples,
      applyRespRevision: applyResp ? applyResp.rev : null, typeSaveBaseRevision: typeReq ? typeReq.base : null, revLog: revLog.slice(),
      answers: answersD(), saves: savesD(), atRelease, r1, r2, toasts,
      where: { gamma: where('gamma'), delta: where('delta') }, check }, Object.values(check).every(Boolean));
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, failed: rows.filter((x) => !x.ok).map((x) => x.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, red ${rows.filter((x) => !x.ok).length}`);
log.end(); await b.close(); process.exit(0);
