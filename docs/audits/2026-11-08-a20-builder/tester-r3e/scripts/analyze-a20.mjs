// Summarise one A-20 probe run against the r2 gate: node analyze-a20.mjs <OUTDIR>/runs/<label>
// Arms whose probe already judges (row.ok) use it; reference arms are judged here by the r2 rule in README.md.
import fs from 'node:fs';
import { backinFailR3, classifyReLeave, CTL_EXPECT, ctlKind } from './a20m_judge.mjs';
const dir = process.argv[2];
const rows = fs.readFileSync(`${dir}/rows.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const has = (units, s) => (units || []).some((u) => u.includes(s));
const W = 'warmup';
// 11-09 (Opus reader): heldback retry count from the raw toast arrays as a multiset (per t|s key, the larger count of toastsBack /
// toastsEnd), window [hashAt - 5, start of the probe's second leave) = reLeave.nav.t, else reLeaveAt. Old rows had a Map keyed t|s
// that collapsed same-ms pairs, and r3-era rows had no reLeaveAt, so their recorded retryN included the second leave's toast.
const rawRetry = (r) => {
  const re = /Changes could not be saved. Please retry before leaving/i;
  const cnt = (xs) => { const m = new Map(); for (const x of xs || []) if (re.test(x.s || '')) { const k = `${x.t}`; m.set(k, (m.get(k) || 0) + 1); } return m; };
  const b = cnt(r.toastsBack), e = cnt(r.toastsEnd); const end = (r.reLeave && r.reLeave.nav && r.reLeave.nav.t != null) ? r.reLeave.nav.t : (r.reLeaveAt != null ? r.reLeaveAt : Infinity);
  const times = []; for (const k of new Set([...b.keys(), ...e.keys()])) { const t = Number(k); if ((r.hashAt == null || t >= r.hashAt - 5) && t < end) for (let i = 0; i < Math.max(b.get(k) || 0, e.get(k) || 0); i += 1) times.push(t - (r.hashAt || 0)); }
  return { n: times.length, times: times.sort((x, y) => x - y), end };
};
// BASE=<OUTDIR>/runs/<base label> (11-08): undo / IME shapes are judged against the base build run in the SAME environment
// (Henry: undo as today). The absolute shapes below are only the fallback; the last UNDOPAUSE step differs by environment
// (['w'] in Tester's runs of 04f6f822, [] in the builder's), so without BASE that row is printed as needing a base.
const BASE = process.env.BASE ? fs.readFileSync(`${process.env.BASE}/rows.jsonl`, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : null;
const baseSteps = (name) => { if (!BASE) return undefined; const g = name.replace(/-\d+$/, ''); const xs = BASE.filter((x) => x.name.replace(/-\d+$/, '') === g && x.steps); if (!xs.length) return null; const set = [...new Set(xs.map((x) => JSON.stringify(x.steps)))]; return set.length === 1 ? set[0] : `inconsistent base ${set.join(' / ')}`; };
const vsBase = (r, fallbackOk) => { const bs = baseSteps(r.name); const mine = JSON.stringify(r.steps); if (bs === undefined) return [fallbackOk, `${mine} (no BASE given)`]; if (bs === null) return [false, `${mine} (BASE has no ${r.name.replace(/-\d+$/, '')} row)`]; if (bs.startsWith('inconsistent')) return [false, `${mine}; ${bs}`]; return [mine === bs, `${mine} ${mine === bs ? '==' : '!='} base ${bs}`]; };
const plainN = (units) => (units || []).map((x) => x.replace(/^\[[a-z_0-9]+\]/, ""));
const nShape = (r) => [(r.shape === "BOX" || r.shape === "ONCE") && (r.efgOk === undefined || r.efgOk === true), `${r.how}: ${r.shape}; server ${JSON.stringify(plainN(r.units))}; screen ${JSON.stringify(r.eds9)}; boxes ${JSON.stringify(r.boxes1)}; Z at ${r.zAt}; kept at leave ${JSON.stringify(r.keptLeft)}; at reopen ${JSON.stringify(r.keptReopen)}; where ${r.where}; head efg after reopen+20 s+reopen ${r.efgFinal || "-"}; head efg at ${r.efgAt}, 20 s later ${r.efgLate ? (r.efgLate.units.includes("efg") ? "server" : (r.efgLate.seen && (r.efgLate.seen.banners || []).some((x) => /efg/.test(x)) ? (r.efgLate.seen.apply ? "banner+Apply" : "banner") : ((r.efgLate.receipt || []).some((x) => x.has) ? "receipt only" : "nowhere"))) : "-"}`];
const hcN = (xs) => (xs == null ? "n/a" : JSON.stringify(xs.map((x) => `${x.t}:${x.s}`)));
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
  // a20n (Tester 11-08, Main_Designer r3d dispatch on Reviewer N1-N4). MERGE / SELDEL (N1): shape DUP (the merged-away text twice:
  // r2 / r3 expected) is red; BOX (server [ab,cd], the typed line in a box: r3d expected) and ONCE are green; LOST (pre baseline:
  // Z nowhere, no duplicate) is red under the r3d rule and listed as the pre shape.
  ["MERGE-", (r) => nShape(r)], ["SELDEL-", (r) => nShape(r)],
  ["CLICKBACK-end", (r) => [true, `recorded (N4, TD-66): ${r.shape}; kept at reopen ${JSON.stringify(r.keptReopen)}`]],
  // BACKIN-fail-heldhead (S2 isolation): backinFailR3 plus the 5 ms kept-record series after the Back (r3: 0 or a blip; mutation: >= 1 s).
  ["BACKIN-fail-heldhead", (r) => { const j = backinFailR3(r); const p = r.keptPoll || {}; return [j.ok, `kept series after Back: max ${p.max}, first +${p.firstAfter} ms, last +${p.lastAfter} ms, longest ${p.longestMs} ms${p.stillAtEnd ? " (still at end)" : ""}; kept ${j.kept} ${JSON.stringify(j.keptBy)}; LEFT_UNSAVED ${j.left}; stayed ${j.stayed}; 2nd leave ${j.cls}${j.unmeasured.length ? "; UNMEASURED " + j.unmeasured.join(",") : ""}`]; }],
  // BACKIN-heldback (N3): exactly one "Please retry" from the hash leave on (r3 expected 2), stays, 0 LEFT_UNSAVED, 0 kept.
  // HEADCLOSE (N6, r3d): aaa offered (banner+Apply) and bbb in a box at reopen and after 20 s + reopen; apply / dismiss as ruled.
  // N6B-switch (Main_Designer 11-09, N6b smoke x1): red = A's words lost / on B / on the server and held in a box or kept record.
  ["N6B-", (r) => [r.ok === true, `head ${r.headKind}; to B ${r.onBAt != null ? "+" + (r.onBAt - r.goAt) + " ms" : "NOT REACHED"} (${(r.toB || []).slice(-1)[0] || ""}); back on A ${r.onAAt != null ? "+" + (r.onAAt - r.backAt) + " ms" : "NOT REACHED"}; A at +1.5 s ${JSON.stringify(r.at1)}, +9.5 s ${JSON.stringify(r.at9)}, end ${JSON.stringify(r.atF)}; A server end ${JSON.stringify(r.rF && r.rF.units)} (aaa x${r.counts && r.counts.aaa}, bbb x${r.counts && r.counts.bbb}); A boxes end ${JSON.stringify(r.rF && r.rF.boxes)}, kept ${JSON.stringify(r.rF && r.rF.kept)}, banner+Apply ${!!(r.rF && r.rF.seen && r.rF.seen.apply)}; B server ${JSON.stringify(r.bUnits)} (before ${JSON.stringify(r.bBefore)}), B screen ${JSON.stringify(r.onB && r.onB.eds)}, B boxes ${JSON.stringify(r.onB && r.onB.boxes)}; RED lost ${JSON.stringify(r.lost)}, on B ${JSON.stringify(r.onBWords)}, server+held ${JSON.stringify(r.redundant)}; recorded: server+banner ${JSON.stringify(r.offeredRedundant)}`]],
  // HEADCLOSE-applyslow (Main_Designer 11-09, Reviewer P1): red = aaa nowhere 13 s after Apply came back.
  ["HEADCLOSE-applyslow", (r) => [r.ok === true, `form ${r.form || "req"}; end ok ${r.endOk}, no 409 ${r.no409}, no "Failed to save block" ${r.noFsb}; first save after the click ${r.firstPutAfterClick}; head ${r.headKind}; Apply clicked +${r.clickAt - r.openAt} ms after the reopen began; box words in line 1 during the hold: ${r.windowHit ? "+" + r.landAt + " ms after the click" : "NO (window not hit)"}; Apply PUT held ${r.heldN}, ${r.form === "resp" ? "reply delayed 2.5 s (released at +" + r.releaseAfter + " ms)" : "released +" + r.releaseAfter + " ms"} -> ${r.applyResp}; aaa at reply ${r.aaaAt && r.aaaAt.back}, +3.5 s ${r.aaaAt && r.aaaAt.idle}, +13 s ${r.aaaAt && r.aaaAt.end}; bbb end ${r.bbbAt}; server reply ${JSON.stringify(r.rBack && r.rBack.units)}, +3.5 s ${JSON.stringify(r.rIdle && r.rIdle.units)}, +13 s ${JSON.stringify(r.rF && r.rF.units)} (aaa x${r.counts && r.counts.aaa}, bbb x${r.counts && r.counts.bbb}); screen +13 s ${JSON.stringify(r.rF && r.rF.eds)}; boxes ${JSON.stringify(r.rF && r.rF.boxes)}; items +13 s ${JSON.stringify(r.rF && r.rF.banners)}; receipt ${JSON.stringify(r.rF && r.rF.receipt)}; notices ${hcN(r.rF && r.rF.toasts)}; requests after the click ${JSON.stringify(r.netAfterClick)}`]],
  // MENTER (Main_Designer 11-09, Reviewer P2): red = the server's cd line rewritten (Z a server unit, cd not) or cd twice.
  ["MENTER-", (r) => [r.ok === true, `${r.shape} (server kept ${r.serverKept}, boxes abxcd + Z ${r.boxesOk}): screen at close ${JSON.stringify(r.edsTyped)} (merged ${JSON.stringify(r.edsMerged)}, enter ${JSON.stringify(r.edsEnter)}); reopen server ${JSON.stringify(r.r1 && r.r1.units)}, editor ${JSON.stringify(r.r1 && r.r1.eds9)}, boxes ${JSON.stringify(r.r1 && r.r1.boxes)} / ${JSON.stringify(r.r1 && r.r1.boxes9)}, kept ${JSON.stringify(r.r1 && r.r1.kept)}, items ${JSON.stringify(r.r1 && r.r1.banners)} (Apply ${r.r1 && r.r1.apply}); +12 s server ${JSON.stringify(r.r2 && r.r2.units)}, boxes ${JSON.stringify(r.r2 && r.r2.boxes)}; Z at ${r.zAt}; notices at reopen ${hcN(r.r1 && r.r1.toasts)}; saves ${JSON.stringify(r.puts)}`]],
  // HEADCLOSE-putback (Main_Designer 11-09, x1): bbb put back by hand and saved (200), then Apply -> expected 409: bbb stays, Apply writes nothing, conflict item.
  ["HEADCLOSE-putback", (r) => [true, `READING (ruled A-25 ②a (iv), manual known; arm rule ${r.ok === true ? "green" : "RED"}): reopen aaa ${r.r1 && r.r1.aaa}, bbb ${r.r1 && r.r1.bbb} (server ${JSON.stringify(r.r1 && r.r1.units)}, editor ${JSON.stringify(r.r1 && r.r1.eds1)}); put back by ${r.mid && r.mid.putHow}: ${r.mid && r.mid.putLine} -> ${r.mid && r.mid.respLine}; then server ${JSON.stringify(r.mid && r.mid.units)}, boxes ${JSON.stringify(r.mid && r.mid.boxes)}, kept ${JSON.stringify(r.mid && r.mid.kept)}; Apply clicked ${r.clicked}; +3 s server ${JSON.stringify(r.a3 && r.a3.units)}, +13 s server ${JSON.stringify(r.a13 && r.a13.units)}, editor ${JSON.stringify(r.a13 && r.a13.eds)}, boxes ${JSON.stringify(r.a13 && r.a13.boxes)}, kept ${JSON.stringify(r.a13 && r.a13.kept)}; requests after the click ${JSON.stringify(r.a13 && r.a13.net)}; items +3 s ${JSON.stringify(r.a3 && r.a3.banners)}; items +13 s ${JSON.stringify(r.a13 && r.a13.banners)}; notices after the click ${hcN(r.a13 && r.a13.toasts)}; put back 200 ${r.putOk}, bbb stays ${r.bbbKept}, Apply wrote ${r.applyWrote}, conflict item ${r.conflict}, Replay shown ${r.replaySeen} (not clicked)`]],
  ["HEADCLOSE-", (r) => [r.ok === true, `${r.how} (head ${r.headKind}): reopen aaa ${r.r1 && r.r1.aaa}, bbb ${r.r1 && r.r1.bbb} (server ${JSON.stringify(r.r1 && r.r1.units)}, boxes ${JSON.stringify(r.r1 && r.r1.boxes)}, kept ${JSON.stringify(r.r1 && r.r1.kept)}); +20 s reopen aaa ${r.r2 && r.r2.aaa}, bbb ${r.r2 && r.r2.bbb}${r.act ? `; ${r.how} clicked ${r.act.clicked}: server ${JSON.stringify(r.act.units)}, kept ${JSON.stringify(r.act.kept)}` : ""}; READINGS editor at reopen r1 ${JSON.stringify(r.r1 && r.r1.eds1)} / ${JSON.stringify(r.r1 && r.r1.eds9)}, r2 ${JSON.stringify(r.r2 && r.r2.eds1)} / ${JSON.stringify(r.r2 && r.r2.eds9)}${r.act ? `, after the click ${JSON.stringify(r.act.eds)}` : ""}; notices r1 ${hcN(r.r1 && r.r1.toasts)}, r2 ${hcN(r.r2 && r.r2.toasts)}${r.act ? `, after the click ${hcN(r.act.toasts)}` : ""}`]],
  ["CLOSEHEAD-", (r) => [true, `recorded: ${r.how}: aaa at reopen ${r.aaaAt}, 20 s later ${r.aaaLate}; server ${JSON.stringify(r.units)}; boxes ${JSON.stringify(r.boxes1)}; kept ${JSON.stringify(r.keptTexts || r.keptReopen || [])}; receipts ${JSON.stringify(r.receipts1)}; banners ${JSON.stringify(r.seen && r.seen.banners)} apply ${r.seen && r.seen.apply}`]],
  // BACKIN-heldhead-del (Main_Designer 11-09, r3d guard): red = bbb back after delete-in-window + close; notConstructible recorded.
  ["BACKIN-heldhead-del", (r) => { const p = r.keptPoll || {}; return [r.notConstructible ? true : (!r.bbbServer && !r.bbbScreen), `${r.notConstructible ? "NOT CONSTRUCTIBLE (delete had no effect during the hold); " : ""}kept after Back: max ${p.max}, +${p.firstAfter}..+${p.lastAfter} ms; at delete (${r.placeAtDel}, +${r.delAt} ms) kept ${JSON.stringify(r.keptBeforeDel)} -> screen ${JSON.stringify(r.edsDel)}, kept ${JSON.stringify(r.keptAfterDel)}; close at +${r.closeAt} ms (${r.placeAtClose}, held ${r.heldAtClose}); reopen server ${JSON.stringify(r.units)} screen ${JSON.stringify(r.eds9)} boxes ${JSON.stringify(r.boxes1)}; bbb server ${r.bbbServer} screen ${r.bbbScreen}; aaa at ${r.aaaAt}, after reopen+20 s+reopen ${r.aaaFinal || "-"}`]; }],
  // BACKIN-heldhead-undo (Main_Designer 11-09): red = the undone ' bbb' back on the server or on screen by itself; a banner offering it is recorded.
  ["BACKIN-heldhead-undo", (r) => { const p = r.keptPoll || {}; const u1 = r.undo1 || {}; return [r.undoOk === true, `kept after Back: max ${p.max}, +${p.firstAfter}..+${p.lastAfter} ms; undo at +${u1.at} ms -> screen ${JSON.stringify(u1.eds)}, kept before/after ${JSON.stringify(u1.keptBefore)} / ${JSON.stringify(u1.keptAfter)}; released ${r.releasedN}; server before leave ${JSON.stringify(r.serverBeforeLeave)}; kept at leave ${JSON.stringify(r.keptLeft)}; reopen server ${JSON.stringify(r.units)} screen ${JSON.stringify(r.edsReopen9)}; bbb server ${r.bbbServer} screen ${r.bbbScreen} banner ${r.bbbBanner}; aaa x${r.aaaCount}`]; }],
  ["BACKIN-heldback", (r) => { const j = backinFailR3(r); const tr = r.trace ? ` [trace ${r.trace.length} entries]` : ""; const raw = rawRetry(r); return [r.heldbackOk === true && raw.n === 1, `RAW retry x${raw.n} at +${raw.times.join(",+")} ms (window end ${raw.end}; recorded retryN ${r.retryN}) ; retry x${r.retryN} (want 1, counted from the hash leave to the probe's second leave${r.retryTimes ? " at +" + r.retryTimes.join(",+") + " ms" : ""})${tr}; LEFT_UNSAVED ${r.leftN}; hash leave held ${r.navHeld && r.navHeld.at}; stayed ${j.stayed}; kept ${j.kept}; 2nd leave ${j.cls}${j.unmeasured.length ? "; UNMEASURED " + j.unmeasured.join(",") : ""}`]; }],
  // ADDR-noncanon (N2): the BACKIN-fail rule on a note whose own URL is #/notes/A/ or #/notes/A#x (r3 expected red, r3d green).
  ["ADDR-noncanon", (r) => { const j = backinFailR3(r); return [j.ok && (!["hash","addr","case","caseaddr","caseslash"].includes(r.mode) || r.countMore === 1), `${r.mode} (${["hash","addr","case","caseaddr","caseslash"].includes(r.mode) ? r.mode + " to " + (r.mode === "caseslash" ? "#/NOTES/A/" : String(r.mode).startsWith("case") ? "#/Notes/A" : "#/notes/A/") + ", released " + r.releasedN + ", now " + r.hashAfter + ", backin words more x" + r.countMore : r.noncanon && r.noncanon.hash}): stayed ${j.stayed} (places ${(r.places || []).map((p) => p.p).join(">")}); LEFT_UNSAVED ${j.left}${j.left ? " (+" + j.leftT.join(",") + " ms)" : ""}; kept ${j.kept} ${JSON.stringify(j.keptBy)}; 2nd leave ${j.cls}${j.unmeasured.length ? "; UNMEASURED " + j.unmeasured.join(",") : ""}; reopen ${JSON.stringify(r.units)}`]; }],
  // BACKIN-fail (all ordering variants: -sealed / -refail / -idlefirst / -fast / -neterr / -recover), JUDGED from 11-08 by
  // backinFailR3 in a20m_judge.mjs (the very code the probe uses for row ok): stays on A (one place, host kept), 0 LEFT_UNSAVED
  // (union of both snapshots), 0 kept records at 1/3/6 s + hold (+ end if still on A), the second leave intercepted:
  // HELD-/INSTANT-PROCEED or REFUSED (ruled green 11-08 with exactly one new "Please retry"); never STUCK / HUNG / UNMEASURED.
  ['BACKIN-fail', (r) => { const j = backinFailR3(r); const rl = r.reLeave || {}; const keptRecs = [r.storedT1, r.storedT3, r.storedBack, rl.storedHold].filter(Boolean).flat(); const keptText = keptRecs.map((s) => { try { return JSON.parse(s).map((e) => `${JSON.stringify(e.initialText)}->${JSON.stringify(e.text)}`).join(','); } catch { return '?'; } }).join(' | '); const banner = !!(r.seenReopen && (r.seenReopen.banners || []).length); return [j.ok, `${r.mode || 'held1500'}: stayed ${j.stayed} (places ${(r.places || []).map((p) => p.p).join('>')}, host ${r.hostKept}); LEFT_UNSAVED ${j.left}${j.left ? ` at ${j.leftAt.join(',')} ${j.leftT.some((x) => x != null) ? `(+${j.leftT.join(',')} ms after Back)` : ''}` : ''}; kept ${j.kept} ${JSON.stringify(j.keptBy)}${j.kept ? ` [${keptText}] live ${JSON.stringify(r.edsBack)}` : ''}; 2nd leave ${j.cls}${r.reLeave ? ` (prevented ${rl.nav ? rl.nav.prevented : rl.nav}, on A ${rl.onA}/6, sent ${(rl.sent || []).length}, new toasts ${JSON.stringify((rl.newToasts || []).map((x) => x.s.slice(0, 28)))})` : ''}${j.recover ? `; recover ${j.recover.cls}, 'backin wordsz' x${j.recover.count}` : ''}${j.unmeasured.length ? `; UNMEASURED ${j.unmeasured.join(',')}` : ''}; reopen ${JSON.stringify(r.units)} count ${r.count}, banner ${banner ? JSON.stringify(r.seenReopen.banners[0]).slice(0, 60) : 'none'}`]; }],
  // BACKIN-ctl / -ctlfail / -ctlclean: controls of the second-leave classifier (no Back). Each must read its class on a build
  // that intercepts hash leaves (r2, r3): ctl HELD-PROCEED, ctlfail REFUSED, ctlclean INSTANT-PROCEED. pre reads STUCK (red, expected).
  ['BACKIN-ctl', (r) => { const want = CTL_EXPECT[ctlKind(r.name)]; const rl = r.reLeave || {}; const cls = classifyReLeave(r.reLeave); return [cls === want, `${ctlKind(r.name)}: ${cls} (want ${want}; prevented ${rl.nav ? rl.nav.prevented : rl.nav}, on A ${rl.onA}/6, arrived ${rl.arrived}, sent ${(rl.sent || []).length}, new toasts ${JSON.stringify((rl.newToasts || []).map((x) => x.s.slice(0, 28)))}); count ${r.count}`]; }],
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
