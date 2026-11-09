// A-20 a20m BACKIN judge: ONE copy, imported by a20m_body.mjs (row ok) and analyze-a20.mjs (re-judging rows).
// Rule (Main_Designer 11-08, order "封包前自跑抓到 M2 变体" + r3 BACKIN expectation): after an in-app Back with a failing
// save, the person stays on A (the same session), 0 LEFT_UNSAVED, 0 kept (frozen) records in storage while the session
// lives, and the next hash leave is still intercepted (the 'released' latch is not stuck).
// Revised 11-08 evening after an adversarial review (3 Opus readers + skeptics): the old "held = on A >= 1 s AND arrived
// after release" read a correct r3 as red, because a pending failed save makes the second leave intercepted-then-refused
// (HASHFAIL: stay on A + "Please retry before leaving"). The leave is now classified from the navigate event itself.

export const LEFT_RE = /did not reach the server/i;
export const SAVE_FAILURE_TEXT = 'Changes could not be saved. Please retry before leaving the note.';
// Ruled by Main_Designer 11-08 ("裁:REFUSED 算「仍被扣住」,算绿"): green only with every condition: navigate prevented;
// the person still on A (hash unchanged in all samples, host node still connected); EXACTLY one new "Please retry before
// leaving" (not one per key, not two); 0 LEFT_UNSAVED; 0 frozen records (the 1/3/6 s samples); 0 requests acceptable.
// No automatic retry exists today (A-25 ②a), so REFUSED is the expected r3 shape of BACKIN-fail's second leave;
// HELD-PROCEED is expected only with no failure (ctl) or once the failure is cleared (BACKIN-fail-recover).
export const REFUSED_COUNTS_AS_HELD = true;

// Classes of the second (scripted hash) leave, from reLeaveM's recording:
//   STUCK            the first navigate event to the other note was NOT prevented (r2's stuck latch; pre never holds)
//   HELD-PROCEED     prevented, still on A for >= 4 of the 6 hold samples, at the other note after the release
//   INSTANT-PROCEED  prevented, nothing sent, at the other note within the hold window (nothing left to save)
//   REFUSED          prevented, on A in all 18 samples, the host node still connected, EXACTLY one new SAVE_FAILURE
//                    toast, no new LEFT_UNSAVED (requests sent are recorded, not required to be 0)
//   HUNG             prevented, anything else (e.g. on A with no new toast, two "Please retry", status still showing)
//   UNMEASURED       no navigate event was recorded (listener missing): never green
//   STUCK(timeline)  rows from before the navigate signal: at the other note in the first sample with 0 requests
export const classifyReLeave = (rl) => {
  if (!rl) return 'NONE';
  const tl = rl.timeline || []; const after = rl.after || [];
  const onA = tl.filter((l) => l.endsWith(' A')).length;
  const sent = (rl.sent || []).length;
  if (rl.nav === undefined) return tl.length && tl[0].endsWith(' other') && sent === 0 ? 'STUCK(timeline)' : 'UNMEASURED';
  if (rl.nav === null) return 'UNMEASURED';
  if (rl.nav.prevented !== true) return 'STUCK';
  const arrivedAfter = after.some((l) => l.endsWith(' other'));
  if (onA >= 4 && arrivedAfter) return 'HELD-PROCEED';
  if (onA < 4 && sent === 0 && [...tl, ...after].some((l) => l.endsWith(' other'))) return 'INSTANT-PROCEED';
  const allA = tl.length === 6 && after.length === 12 && [...tl, ...after].every((l) => l.endsWith(' A'));
  const nt = rl.newToasts;
  const retryN = Array.isArray(nt) ? nt.filter((x) => (x.s || '').includes(SAVE_FAILURE_TEXT)).length : null;
  if (allA && rl.hostKept !== false && retryN === 1 && !nt.some((x) => LEFT_RE.test(x.s || ''))) return 'REFUSED';
  return 'HUNG';
};
export const heldOf = (cls) => (cls === 'HELD-PROCEED' || cls === 'INSTANT-PROCEED' ? true
  : cls === 'REFUSED' ? (REFUSED_COUNTS_AS_HELD === null ? 'pending' : REFUSED_COUNTS_AS_HELD) : false);

// kept records in one storage sample: storedFor() returns the raw values of 'coincides:unplaced*' keys of the note;
// each value is a JSON array of records. null = the read failed = unmeasured (never counted as 0).
export const keptIn = (sample) => {
  if (sample == null) return null;
  return sample.reduce((n, v) => { try { const p = JSON.parse(v); return n + (Array.isArray(p) ? p.length : 1); } catch { return n + 1; } }, 0);
};

// BACKIN-fail (all ordering variants). Returns ok plus every term, and what could not be measured.
export const backinFailR3 = (r) => {
  const unmeasured = [];
  // messages: the union of the two snapshots; a missing / replaced watcher is unmeasured
  if (r.toastsBack == null && r.toastsEnd == null) unmeasured.push('toasts');
  if (r.watcherSame === false) unmeasured.push('watcher replaced');
  const seen = new Map(); for (const x of [...(r.toastsBack || []), ...(r.toastsEnd || [])]) seen.set(`${x.t}|${x.s}`, x);
  const left = [...seen.values()].filter((x) => LEFT_RE.test(x.s || ''));
  // storage while the session lives: ~1 s, ~3 s, ~6.3 s after Back, the end of the second leave's hold, and the end
  // sample only when the person is still on A then (a record after a real departure is legitimate)
  const lastLeave = (r.recover && r.recover.reLeave) || r.reLeave; // recover: the person leaves on the third leave
  const endOnA = !!(lastLeave && (lastLeave.after || []).length && lastLeave.after[lastLeave.after.length - 1].endsWith(' A'));
  const samples = { t1: r.storedT1, t3: r.storedT3, t6: r.storedBack, hold: r.reLeave ? r.reLeave.storedHold : undefined, end: endOnA ? r.storedEnd : undefined };
  const keptBy = {}; let kept = 0;
  // kept = the most records present at any one sample (the same record seen in 4 samples is 1 record, not 4)
  for (const [k, v] of Object.entries(samples)) { if (v === undefined) continue; const n = keptIn(v); keptBy[k] = n; if (n === null) unmeasured.push(`storage ${k}`); else kept = Math.max(kept, n); }
  if (!Object.keys(keptBy).length) unmeasured.push('storage');
  const stayed = r.stayed === true && (r.places ? r.places.length === 1 : true) && r.hostKept !== false;
  const cls = classifyReLeave(r.reLeave); const held = heldOf(cls);
  // BACKIN-fail-recover (Main_Designer 11-08): after the refused leave the server lets saves through, one more letter is
  // typed, and a second hash leave must go: HELD- or INSTANT-PROCEED, the recovered line on the server exactly once.
  let recover = null;
  if (r.mode === 'recover') {
    const rcls = classifyReLeave(r.recover && r.recover.reLeave);
    recover = { cls: rcls, count: r.countRecovered, ok: (rcls === 'HELD-PROCEED' || rcls === 'INSTANT-PROCEED') && r.countRecovered === 1 };
  }
  const ok = stayed && unmeasured.length === 0 && left.length === 0 && kept === 0 && held === true && (!recover || recover.ok);
  return { ok, stayed, left: left.length, leftAt: left.map((x) => x.at), leftT: left.map((x) => (r.backAt != null ? Math.round(x.t - r.backAt) : null)), kept, keptBy, cls, held, recover, unmeasured };
};

// Controls of the leave classifier (no Back): the class each must read on a build that intercepts hash leaves.
export const CTL_EXPECT = { ctl: 'HELD-PROCEED', ctlfail: 'REFUSED', ctlclean: 'INSTANT-PROCEED' };
export const ctlKind = (name) => (name.match(/^BACKIN-(ctl[a-z]*)-\d+$/) || [])[1] || null;
