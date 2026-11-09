
// ---- A-20b arms (Tester 11-09; order docs/agent-ops/handoffs/2026-11-09-a20b-safety-belt-coverage-order.md, 验收) ----
// Paste = a synthetic 'paste' ClipboardEvent carrying a DataTransfer (text/plain) dispatched on the focused line. The editor's
// paste handler reads clipboardData; for multi-line or list-form text it prevents the default and rebuilds the flow itself,
// so this is the path a real Ctrl+V takes for these texts. The system clipboard is never touched.
const pasteM = (text) => b.ev(`(()=>{const a=document.activeElement;if(!a)return {err:'no active element'};const dt=new DataTransfer();dt.setData('text/plain',${JSON.stringify(text)});const ev=new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true});const go=a.dispatchEvent(ev);return {tag:a.tagName,editor:!!(a.dataset&&a.dataset.runtimeTextflowEditor),prevented:!go,hasData:!!ev.clipboardData}})()`).catch((e) => ({ err: String(e) }));
const arrowLeft = () => press('ArrowLeft', 'ArrowLeft', 37);
const caretM = () => b.ev(`(()=>{const a=document.activeElement;return a&&'selectionStart' in a?{s:a.selectionStart,e:a.selectionEnd,v:a.value}:null})()`).catch(() => null);
const bannerText = (x) => (typeof x === 'string' ? x : (x && x.text) || '');
// where a token is in one read: server unit / box / kept record / screen only / item (with or without Apply) / nowhere
const tokAt = (tok, r) => (r.units.some((u) => u.includes(tok)) ? 'server'
  : [...(r.boxes || []), ...(r.boxes9 || [])].some((x) => x.includes(tok)) ? 'box'
  : (r.kept || []).some((x) => x.includes(tok)) ? 'kept'
  : (r.eds || r.eds9 || []).some((x) => x.includes(tok)) ? 'screen'
  : (r.banners || []).some((x) => bannerText(x).includes(tok)) ? (r.apply ? 'banner+Apply' : 'banner') : 'nowhere');
const B_OFFERED = ['server', 'box', 'kept', 'banner+Apply'];
// close the page (about:blank), reopen with nothing held, read; a second read 12 s later
const closeReadB = async (id, receiptWord) => {
  await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(2000);
  respRule = () => null;
  const rp = await fullReopen(id);
  const r1 = { units: plainM(rp.units), eds1: rp.eds1, eds9: rp.eds9, boxes: rp.boxes1, boxes9: rp.boxes9, kept: keptTexts(rp.stored1), banners: rp.seen && rp.seen.banners, apply: rp.seen && rp.seen.apply, receipt: await receiptHas(id, receiptWord), toasts: await toastsM() };
  await sleep(12000);
  const r2 = { units: plainM(await serverUnits(id)), eds: await edsM(), boxes: (await boxes().catch(() => [])).map((x) => x.v), kept: keptTexts(await storedFor(id).catch(() => null)), banners: await b.ev(BANNERS_FULL).catch(() => null) };
  return { r1, r2 };
};
// the head: one character typed at the end of line `line`, sealed by a click outside; its request reaches the server but the
// reply is held 60 s, so the lane stays busy and every later group of this block waits unsent behind it
const headInFlightB = async (id, line, ch, expectServer) => {
  let headSeen = false;
  respRule = ({ u }) => { if (!headSeen && /text-save/.test(u)) { headSeen = true; return { delay: 60000 }; } return null; };
  if (!(await clickEndM((e) => e.v === line))) throw new Error(`setup: no '${line}' line ${JSON.stringify(await edsM())}`);
  await typeText(ch, 90); await sleep(150); await blurOutside();
  const want = `${line}${ch}`;
  const headPut = () => net.find((l) => /PUT \/note-blocks\/:id\/text-save/.test(l) && l.includes(want));
  for (let k = 0; k < 40 && !headPut(); k += 1) await sleep(100);
  if (!headPut()) throw new Error(`setup: the head '${want}' did not go out ${JSON.stringify(net.filter((l) => /text-save/.test(l)))}`);
  let srv = null; for (let k = 0; k < 30; k += 1) { srv = plainM(await serverUnits(id)); if (eq(srv, expectServer)) break; await sleep(150); }
  if (!eq(srv, expectServer)) throw new Error(`setup: the server did not take the head ${JSON.stringify(srv)}`);
  return headPut();
};
const putsAfterHeadB = () => net.filter((l) => /PUT \/note-blocks\/:id\/text-save/.test(l)).length - 1;

// MULTIPASTE-close-i (A-20b Q2, x REPS): server ['abcdef','q']; the head = 'r' at the end of 'q' (server ['abcdef','qr'],
// reply held 60 s). Then the caret after 'abc' and 'XQ\nYQ' pasted (abc|def + X⏎Y): 'abcXQ' stays on the line, 'YQ' and
// 'def' go to the new line(s). No other save may go out; close the page; reopen; read; again 12 s later. r3e expected (Q2):
// XQ nowhere, YQ / def in a box. A-20b expected: XQ in an edit record (abc -> abcXQ) or landed (server 'abcXQdef'), YQ and
// def in a box. Red: XQ or YQ not offered at the second read; def neither on the server nor in a box; any token on the
// server twice; the 'qr' line changed.
for (let i = 0; i < REPSM; i += 1) {
  const name = `MULTIPASTE-close-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await fresh(`A20b multipaste close ${i}`);
    await typeText('abcdef', 90); await enter(); await sleep(200); await typeText('q', 90); await sleep(300);
    await blurOutside(); await sleep(3500);
    const base = plainM(await serverUnits(id));
    if (!eq(base, ['abcdef', 'q'])) throw new Error(`setup: server is ${JSON.stringify(base)}, not ['abcdef','q']`);
    await watch(); await watchM(); mark();
    const headLine = await headInFlightB(id, 'q', 'r', ['abcdef', 'qr']);
    if (!(await clickEndM((e) => e.v === 'abcdef'))) throw new Error(`setup: no 'abcdef' line ${JSON.stringify(await edsM())}`);
    for (let k = 0; k < 3; k += 1) { await arrowLeft(); await sleep(60); }
    await sleep(150);
    const caret = await caretM();
    if (!caret || caret.s !== 3 || caret.e !== 3 || caret.v !== 'abcdef') throw new Error(`setup: the caret is not after 'abc' ${JSON.stringify(caret)}`);
    const pasted = await pasteM('XQ\nYQ'); await sleep(400);
    const edsPasted = await edsM(); const extraPuts = putsAfterHeadB();
    if (!edsPasted.includes('abcXQ')) throw new Error(`setup: the paste did not leave 'abcXQ' ${JSON.stringify({ pasted, edsPasted })}`);
    if (extraPuts !== 0) throw new Error(`setup: a save other than the head went out before the close: ${JSON.stringify(net.filter((l) => /text-save/.test(l)))}`);
    const keptBefore = keptTexts(await storedFor(id).catch(() => null));
    const { r1, r2 } = await closeReadB(id, 'XQ');
    const xAt = { r1: tokAt('XQ', r1), r2: tokAt('XQ', r2) }; const yAt = { r1: tokAt('YQ', r1), r2: tokAt('YQ', r2) };
    const defAt = { r1: tokAt('def', r1), r2: tokAt('def', r2) };
    const defBoxed = [...(r1.boxes || []), ...(r1.boxes9 || []), ...(r2.boxes || [])].some((x) => x.includes('def'));
    const dupTok = ['XQ', 'YQ', 'def'].filter((t) => [r1.units, r2.units].some((u) => u.join('|').split(t).length - 1 >= 2));
    const qrKept = [r1, r2].every((r) => r.units.includes('qr'));
    const ok = B_OFFERED.includes(xAt.r2) && B_OFFERED.includes(yAt.r2) && B_OFFERED.includes(defAt.r2) && dupTok.length === 0 && qrKept;
    row(name, id, { how: 'close', base, headLine, caret, pasted, edsPasted, keptBefore, r1, r2, xAt, yAt, defAt, defBoxed, dupTok, qrKept, puts: net.filter((l) => /text-save/.test(l)) }, ok);
  });
}

// LISTPASTE-close-i (A-20b Q3, x REPS): prep -> server ['warmup','']; the head = 'r' at the end of 'warmup' (server
// ['warmupr',''], reply held 60 s). Then '- item' pasted into the empty line (a list-form single line: the paste handler
// rebuilds the flow as a structural group and the empty line itself becomes the item, so the unit set can stay the same).
// No other save may go out; close; reopen; read; +12 s. r3e expected (Q3): 'item' nowhere. A-20b expected: 'item' in a
// record / box, or landed. Red: 'item' not offered at the second read; 'item' twice on the server; the warmup line changed.
for (let i = 0; i < REPSM; i += 1) {
  const name = `LISTPASTE-close-${i}`; if (!wantM(name)) continue;
  await scenario(name, async () => {
    const id = await prep(`A20b listpaste close ${i}`);
    await blurOutside(); await sleep(1500);
    const base = plainM(await serverUnits(id));
    if (!eq(base, ['warmup', ''])) throw new Error(`setup: server is ${JSON.stringify(base)}, not ['warmup','']`);
    await watch(); await watchM(); mark();
    const headLine = await headInFlightB(id, 'warmup', 'r', ['warmupr', '']);
    const edsBefore = (await edsM());
    if (!(await clickEndM((e) => e.v === ''))) throw new Error(`setup: no empty line ${JSON.stringify(edsBefore)}`);
    const caret = await caretM();
    const pasted = await pasteM('- item'); await sleep(400);
    const edsPasted = (await edsM()); const extraPuts = putsAfterHeadB();
    if (!edsPasted.some((x) => x.includes('item'))) throw new Error(`setup: the paste left no 'item' line ${JSON.stringify({ pasted, edsBefore, edsPasted })}`);
    if (extraPuts !== 0) throw new Error(`setup: a save other than the head went out before the close: ${JSON.stringify(net.filter((l) => /text-save/.test(l)))}`);
    const linesSame = edsPasted.length === edsBefore.length;
    const keptBefore = keptTexts(await storedFor(id).catch(() => null));
    const { r1, r2 } = await closeReadB(id, 'item');
    const itemAt = { r1: tokAt('item', r1), r2: tokAt('item', r2) };
    const dupItem = [r1.units, r2.units].some((u) => u.join('|').split('item').length - 1 >= 2);
    const warmKept = [r1, r2].every((r) => r.units[0] === 'warmupr');
    const ok = B_OFFERED.includes(itemAt.r2) && !dupItem && warmKept;
    row(name, id, { how: 'close', base, headLine, caret, pasted, edsBefore, edsPasted, linesSame, keptBefore, r1, r2, itemAt, dupItem, warmKept, puts: net.filter((l) => /text-save/.test(l)) }, ok);
  });
}

