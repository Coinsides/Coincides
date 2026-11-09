// Summarise one A-20 probe run against the r2 gate: node analyze-a20.mjs <OUTDIR>/runs/<label>
// Arms whose probe already judges (row.ok) use it; reference arms are judged here by the r2 rule in README.md.
import fs from 'node:fs';
const dir = process.argv[2];
const rows = fs.readFileSync(`${dir}/rows.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const has = (units, s) => (units || []).some((u) => u.includes(s));
const W = 'warmup';
// BASE=<OUTDIR>/runs/<base label> (11-08): undo / IME shapes are judged against the base build run in the SAME environment
// (Henry: undo as today). The absolute shapes below are only the fallback; the last UNDOPAUSE step differs by environment
// (['w'] in Tester's runs of 04f6f822, [] in the builder's), so without BASE that row is printed as needing a base.
const BASE = process.env.BASE ? fs.readFileSync(`${process.env.BASE}/rows.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : null;
const baseSteps = (name) => { if (!BASE) return undefined; const g = name.replace(/-\d+$/, ''); const xs = BASE.filter((x) => x.name.replace(/-\d+$/, '') === g && x.steps); if (!xs.length) return null; const set = [...new Set(xs.map((x) => JSON.stringify(x.steps)))]; return set.length === 1 ? set[0] : `inconsistent base ${set.join(' / ')}`; };
const vsBase = (r, fallbackOk) => { const bs = baseSteps(r.name); const mine = JSON.stringify(r.steps); if (bs === undefined) return [fallbackOk, `${mine} (no BASE given)`]; if (bs === null) return [false, `${mine} (BASE has no ${r.name.replace(/-\d+$/, '')} row)`]; if (bs.startsWith('inconsistent')) return [false, `${mine}; ${bs}`]; return [mine === bs, `${mine} ${mine === bs ? '==' : '!='} base ${bs}`]; };
const RULES = [
  ['IDLE', (r) => [r.at35 === true, `server at 3.5 s ${r.at35}`]],
  ['WAMP', (r) => [r.savesDuringTyping === 0 && r.savesWithin4sAfter >= 1, `during ${r.savesDuringTyping}, after ${r.savesWithin4sAfter}`]],
  ['PAUSES', (r) => [r.saveCount === 4, `saves ${r.saveCount}`]],
  ['UNDO-', (r) => [r.before === 'aaabbb' && r.afterOneUndo === '' && r.afterTwoUndos === W, `${r.before} -> ${r.afterOneUndo} -> ${r.afterTwoUndos}`]],
  ['PAGEHIDE', (r) => [r.onServerAfterReopen === true, `after reopen ${r.onServerAfterReopen}`]],
  ['PAUSEEXIT', (r) => [r.onServer === true, `${r.exit}: on server ${r.onServer}`]],
  ['UNDOSEQ', (r) => vsBase(r, eq(r.steps, [[W, 'aaa', 'bbb', 'ccc'], [W, 'aaa', 'bbb', ''], [W, 'aaa', 'bbb'], [W, 'aaa', ''], [W, 'aaa']]))],
  ['UNDOPAUSE', (r) => { const [ok, note] = vsBase(r, eq(r.steps.slice(0, 3), [[W, 'aaabbb'], [W, ''], [W]])); return [ok, BASE ? note : `${note}; last step must equal the same-environment base run`]; }],
  ['DRAFT', (r) => [r.full === true, `full after 3.5 s ${r.full}`]],
  ['OFFLINE-N', (r) => [r.ok, `failed toasts ${r.failedDuring}, saved after ${r.saved}`]],
  ['OFFLINE-', (r) => [true, 'reference only (old dedup watcher): use OFFLINE-N']],
  ['OFFALL', (r) => [r.ok, `failed toasts ${r.failedDuring}; all ${JSON.stringify((r.during || []).map((x) => x.s.slice(0, 30)))}`]],
  ['PUTDUP', (r) => [r.duplicates === 0 && r.count === 4, `PUT ${r.count}, duplicates ${r.duplicates}`]],
  ['IME-', (r) => { const [ok, note] = vsBase(r, eq(r.steps, [[W, '现值公式推导'], [W, '现值公式'], [W, '现值'], [W, '']])); return [r.putsAfterTyping === 3 && ok, `PUT ${r.putsAfterTyping}; ${note}`]; }],
  ['HARDKILL', (r) => [r.hasFirst === true, `first ${r.hasFirst}, tail (300 ms) ${r.hasTail}`]],
  ['OFFKILL', (r) => [true, `reference (manual: lost until A-25 2a): kept ${r.kept}`]],
  ['LEAVE-401', (r) => [r.onServerEnd === true, `end on server ${r.onServerEnd}; ${JSON.stringify(r.alertsAway)}`]],
  ['LEAVE-', (r) => [r.onServerEnd === true && !(r.alertsAway || []).some((a) => /could not be saved/i.test(a)), `end ${r.onServerEnd}; alerts ${JSON.stringify(r.alertsAway)}`]],
  ['EMPTYHASH', (r) => [r.toast === false, `toast ${r.toast}`]],
  ['LATEREQ', (r) => { const first = has(r.serverEnd, 'first words'); const banner = !!(r.seen && (r.seen.apply || (r.seen.banners || []).length)); return [first || banner, `first words on server ${first}, banner ${banner} (older-over-newer or silent loss = red)`]; }],
  ['LATE-', (r) => [has(r.serverEnd, 'first words') && !(r.seen && r.seen.apply), `on server ${has(r.serverEnd, 'first words')}, Apply ${r.seen && r.seen.apply}`]],
  // third ruling 11-08 (TWICE-hash500 再裁): saved once and exact, lands on the newest destination C, no Apply on reopen.
  // Messages are recorded only (A-25 (e)); `onDest` = failure messages still on screen after the page reached C.
  // a20m (Main_Designer 11-08, Reviewer M1 / M2). BACKIN-undo decides r2: the undone words back by themselves = M2 (red).
  ['BACKIN-undo', (r) => { const falseLeft = (r.toastsBack || []).filter((x) => /did not reach the server/i.test(x.s) && x.at === 'A').length; const banner = !!(r.seenReopen && (r.seenReopen.banners || []).length); return [!r.m2 && !banner, `stayed ${r.stayed}; undo ${JSON.stringify(r.undoSteps)}; server after undo ${JSON.stringify(r.serverAfterUndo)}; reopen ${JSON.stringify(r.units)} count ${r.count}${r.m2 ? ' = M2 REPRODUCED' : ''}; banner on reopen ${banner}; false 'did not reach' while on A ${falseLeft}`]; }],
  // BACKIN-fail: recorded for r2; the r3 rule (order: frozen records only for a session that is gone) is printed beside it.
  ['BACKIN-fail', (r) => { const falseLeft = (r.toastsBack || []).filter((x) => /did not reach the server/i.test(x.s) && x.at === 'A').length; const kept = (r.storedBack || []).length; const reHeld = r.reLeave ? r.reLeave.held : null; const banner = !!(r.seenReopen && (r.seenReopen.banners || []).length); const leftover = banner && r.count > 0; const r3 = r.stayed && falseLeft === 0 && reHeld === true && !leftover; return [true, `stayed ${r.stayed}; false 'did not reach' on A ${falseLeft}; kept records while staying ${kept}${kept ? ' (r3 allows one only if it follows the live text)' : ''}; second leave held ${reHeld}; reopen ${JSON.stringify(r.units)} banner ${banner ? JSON.stringify(r.seenReopen.banners[0]) : 'none'}${leftover ? ' (left over: the words are already on the server)' : ''}; r3 rule (order, Main_Designer 11-08) ${r3 ? 'met' : 'NOT met'}`]; }],
  // LIST (M1): 'x' on the server once = r3 green; r2 is judged against pre (not worse).
  // where 'x' / 'y' ended up, worked out here from the row (older rows labelled a banner that offered only 'k0' as 'banner')
  ['LIST-', (r) => {
    const lineIn = (txt, w) => String(txt || '').split(/\n/).some((l) => l.trim() === w);
    const units = (r.units || []).map((x) => x.replace(/^\[[a-z_0-9]+\]/, ''));
    const keptHas = (w) => (r.stored1 || []).some((s) => { try { return JSON.parse(s).some((e) => lineIn(e.text, w)); } catch { return false; } });
    const bannerHas = (w) => !!(r.seen && (r.seen.banners || []).some((x) => new RegExp(`(^|\\s)${w}(\\s|$)`).test(x.replace(/ Apply Dismiss.*$/, ''))));
    const at = (w) => (units.includes(w) ? 'server' : (r.boxes1 || []).some((x) => lineIn(x, w)) ? 'box' : keptHas(w) ? 'kept' : bannerHas(w) ? 'banner' : 'lost');
    const x = at('x'); const y = at('y');
    const n = (w) => units.filter((u) => u === w).length;
    // r3 rule per variant (Main_Designer 11-08): close / back (the page dies before the queue drains) = x and y each in a
    // box (split records, put back by hand, never landing by themselves), server 'warmup k0' with k0 once; leaves that
    // can be held (addr) = k0, x, y each once on the server. r2 is judged against pre (not worse), not by this rule.
    const how = r.how || (/LIST-([a-z]+)/.exec(r.name) || [])[1];
    const ok = how === 'addr' ? n('k0') === 1 && n('x') === 1 && n('y') === 1
      : n('k0') === 1 && n('x') === 0 && n('y') === 0 && x === 'box' && y === 'box';
    return [ok, `${how}: x ${x}, y ${y}; server ${JSON.stringify(r.units)}; boxes ${JSON.stringify(r.boxes1)}; banner ${JSON.stringify(r.seen && r.seen.banners && r.seen.banners[0])}`];
  }],
  // LANDOTHER (A-25 base line): recorded only.
  ['LANDOTHER', (r) => [true, `${r.kind}: keys show ${r.typed}; 'Heading changes could not' toasts ${r.headingToasts}; failure toasts ${r.failToasts}; landed later ${r.landedTyped}`]],
  ['TWICE-hash500', (r) => { const onDest = (r.toastsAll || []).filter((x) => /could not|did not reach|fail/i.test(x.s) && (x.endAt === 'C' || (x.stillVisibleAtRead && x.whereAtRead === 'C'))).length; return [r.count === 1 && r.exact && r.where3 === 'C' && !(r.jumps || []).includes('other') && !(r.seen && r.seen.apply), `count ${r.count}${r.exact ? '' : ' (not exact)'}, ends ${r.where3}, jumps ${JSON.stringify(r.jumps)}, Apply ${!!(r.seen && r.seen.apply)}; messages (A-25 e, not gated) ${r.failToasts}, still on screen at C ${onDest}`]; }],
  ['HASHFAIL', (r) => [r.stayed === true && r.stayToast === true && r.wordsInEditor === true, `stayed ${r.stayed}, toast ${r.stayToast}, in editor ${r.wordsInEditor}`]],
  ['SWITCH', (r) => [r.falseToasts === 0 && Object.values(r.each || {}).every((n) => n === 1), `false toasts ${r.falseToasts}, each ${JSON.stringify(r.each)}`]],
  // 11-08 fix: the save really fails (500), so 'did not reach the server ... kept on this device' is TRUE and allowed (at most once
  // per appearance when goneN is recorded); only the stay message 'could not be saved / Please retry' is false here.
  ['GONEFAIL-back', (r) => [r.count === 1 && !r.stayMsg && (r.goneN == null || r.goneN <= 1), `count ${r.count}, false 'could not be saved' ${r.stayMsg}${r.stayN != null ? ` (x${r.stayN})` : ''}, true 'did not reach' ${r.goneMsg}${r.goneN != null ? ` (x${r.goneN})` : ' (per-appearance count not recorded)'}`]],
  ['GONEFAIL-', (r) => [r.count === 1, `count ${r.count}; alerts ${JSON.stringify(r.alertsAway)}`]],
  ['ACCT401', (r) => [r.count === 1 && !r.wordsOnBnote && !r.wordsOnBhome && !(r.seenBnote && r.seenBnote.apply), `A count ${r.count}; B sees words ${r.wordsOnBnote || r.wordsOnBhome}`]],
  ['CLOSEFLY', (r) => [r.count === 1, `count ${r.count}; banner on reopen ${!!(r.seen0 && r.seen0.apply)} (stale banner = known, A-25 2a)`]],
  ['OFFCLOSE', (r) => [r.count === 1, `count ${r.count}; failed toasts (dedup watcher) ${r.failedToasts}`]],
];
const group = (n) => n.replace(/-\d+$/, '');
const by = {};
for (const r of rows) (by[group(r.name)] ||= []).push(r);
let red = 0;
for (const [g, rs] of Object.entries(by)) {
  let pass = 0; const notes = [];
  for (const r of rs) {
    const rule = RULES.find(([p]) => r.name.startsWith(p));
    if (r.error) { notes.push(`SETUP ERROR ${r.error.slice(0, 100)}`); continue; }
    const [ok, note] = rule ? rule[1](r) : [r.ok, ''];
    if (ok) pass += 1; else red += 1;
    notes.push(`${ok ? 'ok ' : 'RED'} ${note || (r.units ? JSON.stringify(r.units) : '')}`.slice(0, 220));
  }
  console.log(`${g.padEnd(26)} ${pass}/${rs.length}`);
  for (const n of [...new Set(notes)]) console.log(`    ${n}`);
}
console.log(`total red ${red}`);
