// Tester(1) 11-09, A-25 lines30 / TD-77 (builder: a rawStart=0 path = the draft textarea remounts - contentReadOnly
// flashes once -> a new textarea, value 'aa', selection 0, focus on body). Per traced D row (matrix-dtrace / -dtrace2),
// between the first key into the draft and the hand-off (first focus on an editor textarea):
//   (1) did the draft element change: draft-out / draft-in events, a blur from the draft with no focus after it (focus
//       left on body), a snapshot where no textarea holds the caret;
//   (2) the draft's caret in the last snapshot before the hand-off (0 or at the end), or none if it was not focused;
//   (3) any editor-type focus before the hand-off - by this analyzer's definition the hand-off IS the first editor focus,
//       so (3) is read as: the caret of the focused editor in the first snapshot after the hand-off, and its first key;
//   (4) did the draft disappear for a while (a snapshot with no draft-kind textarea besides the title / description).
// 11-09 (report review): gap to the next focus is searched in the whole trace (see the blur block below).
// Usage: node ana-remount.mjs <runs dir> [...]   Prints a per-run tally and every row where (1) or (4) fired or (2) is 0.
import fs from 'node:fs';
const tally = {};
for (const dir of process.argv.slice(2)) {
  const label = dir.split(/[\\/]/).pop();
  const rows = fs.readFileSync(`${dir}/rows.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const t = { rows: rows.length, red: 0, draftOutIn: 0, blurToBody: 0, noCaretSnap: 0, draftGone: 0, lastCaret0: 0, lastCaretEnd: 0, lastCaretNone: 0, editorCaret0: 0, editorCaretEnd: 0, editorFirstKeyAt0: 0 };
  for (const r of rows) {
    if (!r.ok) t.red += 1;
    const tr = r.trace || [];
    const k0 = tr.find((e) => e.ev === 'key' && e.on === 'draft' && e.i >= 2);
    const hand = tr.find((e) => e.ev === 'focus' && e.on === 'editor');
    if (!k0 || !hand) continue;
    const win = tr.filter((e) => e.t >= k0.t && e.t < hand.t);
    const outIn = win.filter((e) => e.ev === 'draft-out' || e.ev === 'draft-in');
    // a blur from a draft-kind textarea (not the title / description, i >= 2) up to and including the hand-off, and the gap
    // to the next focus ANYWHERE in the trace (11-09 fix after the report review: the first version looked for the next
    // focus only inside the window, which ends before the hand-off focus, so every hand-off blur with a gap >= 1 ms was
    // miscounted as 'focus left on body'). blurBody = a draft blur with no focus within 50 ms.
    const dBlurs = tr.filter((e) => e.ev === 'blur' && e.on === 'draft' && e.i >= 2 && e.t >= k0.t && e.t <= hand.t);
    const gaps = dBlurs.map((e) => { const nxt = tr.find((x) => x.ev === 'focus' && x.t >= e.t); return nxt ? nxt.t - e.t : null; });
    const blurBody = gaps.filter((g) => g === null || g > 50).length;
    t.draftBlurs = (t.draftBlurs || 0) + dBlurs.length; if (dBlurs.length !== 1) t.rowsNotOneBlur = (t.rowsNotOneBlur || 0) + 1;
    for (const g of gaps) { if (g === null) t.gapNone = (t.gapNone || 0) + 1; else { t.gapMin = Math.min(t.gapMin ?? g, g); t.gapMax = Math.max(t.gapMax ?? g, g); const k = g === 0 ? 'gap0' : g === 1 ? 'gap1' : 'gap2plus'; t[k] = (t[k] || 0) + 1; } }
    const snaps = win.filter((e) => e.ev === 'snap');
    const draftsOf = (v) => v.slice(2).filter((x) => x.startsWith('D:'));
    const noCaret = snaps.filter((s) => !s.v.some((x) => /@\d+$/.test(x)));
    const gone = snaps.filter((s) => draftsOf(s.v).length === 0);
    const last = [...tr.filter((e) => e.ev === 'snap' && e.t <= hand.t)].pop();
    const lastDraft = last ? draftsOf(last.v).find((x) => /@\d+$/.test(x)) : null;
    const lastCaret = lastDraft ? Number(lastDraft.match(/@(\d+)$/)[1]) : null;
    const lastLen = lastDraft ? lastDraft.slice(2).replace(/@\d+$/, '').length : null;
    const after = tr.find((e) => e.ev === 'snap' && e.t >= hand.t && e.v.some((x) => x.startsWith('E:') && /@\d+$/.test(x)));
    const ed = after ? after.v.find((x) => x.startsWith('E:') && /@\d+$/.test(x)) : null;
    const edCaret = ed ? Number(ed.match(/@(\d+)$/)[1]) : null; const edLen = ed ? ed.slice(2).replace(/@\d+$/, '').length : null;
    const firstEdKey = tr.find((e) => e.ev === 'key' && e.on === 'editor' && e.t >= hand.t);
    if (outIn.length) t.draftOutIn += 1; if (blurBody) t.blurToBody += 1; if (noCaret.length) t.noCaretSnap += 1; if (gone.length) t.draftGone += 1;
    if (lastCaret === null) t.lastCaretNone += 1; else if (lastCaret === 0 && lastLen > 0) t.lastCaret0 += 1; else if (lastCaret === lastLen) t.lastCaretEnd += 1;
    if (edCaret !== null) { if (edCaret === 0 && edLen > 0) t.editorCaret0 += 1; else if (edCaret === edLen) t.editorCaretEnd += 1; }
    if (firstEdKey && firstEdKey.s === 0 && (firstEdKey.v || '').length > 0) t.editorFirstKeyAt0 += 1;
    const flag = !r.ok || outIn.length || blurBody || gone.length || (lastCaret === 0 && lastLen > 0) || (edCaret === 0 && edLen > 0) || (firstEdKey && firstEdKey.s === 0 && (firstEdKey.v || '').length > 0);
    if (flag) console.log(`  ${label} ${r.name} ${r.ok ? 'ok' : 'RED'}: draft out/in ${JSON.stringify(outIn.map((e) => [e.t, e.ev, e.v]))}; blur-to-body ${blurBody}; snaps w/o caret ${noCaret.length}; draft gone ${gone.length}; last snap before hand-off ${last ? JSON.stringify(last.v) : '-'}; editor after hand-off ${ed}; first editor key ${firstEdKey ? JSON.stringify([firstEdKey.k, firstEdKey.v, firstEdKey.s]) : '-'}`);
  }
  tally[label] = t;
}
for (const [k, v] of Object.entries(tally)) console.log(k.padEnd(16), JSON.stringify(v));
