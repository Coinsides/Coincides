// BAN: the kept box and the "A block edit is waiting for recovery" banner together (seen in X-addr-6 on round 2:
// the box sat ~80 px above its unit, over the line above). The '#' save is held at the request stage so the leave
// falls before any structure; it is let through 3 s after leaving. Then: back in-app, full reopen, measure; click the
// line above and type; Dismiss the banner and measure; scroll the page and measure.
const ONLY12 = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want12 = (name) => !ONLY12 || ONLY12.some((p) => name.startsWith(p));
const REP12 = Number(process.env.REP12 || 3);
const BANNER = `(()=>{const el=[...document.querySelectorAll('div,section,aside')].find(x=>x.children.length<8&&/waiting for recovery/i.test(x.innerText||'')&&x.getBoundingClientRect().height<200);if(!el)return null;const r=el.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),text:(el.innerText||'').replace(/\\s+/g,' ').slice(0,80)}})()`;
const dismissAt = `(()=>{const btn=[...document.querySelectorAll('button')].find(x=>x.getBoundingClientRect().width>0&&/^dismiss$/i.test((x.textContent||'').trim()));if(!btn)return null;const r=btn.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`;
const offset = (g) => {
  // For each box: its own unit line (by the record's text position) is the line just below the line above; report the
  // gap between the box top and the top of the '#' line, and whether it overlaps 'warmup'.
  const hashLine = g.lines.find((l) => l.v === '#' || l.v === '' || l.v.startsWith('#'));
  const warm = g.lines.find((l) => l.v.startsWith('warmup'));
  return g.boxes.map((bx) => ({ boxTop: bx.top, boxBottom: bx.bottom, hashTop: hashLine ? hashLine.top : null, warmTop: warm ? warm.top : null,
    warmBottom: warm ? warm.top + warm.h : null, dyFromHash: hashLine ? bx.top - hashLine.top : null,
    coversWarm: Boolean(warm && bx.top < warm.top + warm.h - 2 && bx.bottom > warm.top + 2), covers: bx.covers }));
};
for (let i = 0; i < REP12; i += 1) {
  const name = `BAN-boxWithRecoveryBanner-${i}`;
  if (!want12(name)) continue;
  await scenario(name, async () => {
    const id = await newNote(`R ban ${i}`); lastId = id;
    await arriveAndWarm(id);
    await watch(); mark();
    let n = 0;
    rule = ({ u }) => { if (/text-save/.test(u) && n++ === 0) return 'hold'; return 'continue'; };
    await typeHash(); await typeText('kept'); await enter(); await sleep(40); await typeText('body', 50);
    await goHash(other); await sleep(3000);
    rule = () => 'continue'; await release(); await sleep(4000);
    const away = await win();
    await goHash(id); await sleep(5000);
    const g1 = await b.ev(GEO); const ban1 = await b.ev(BANNER); await shot(`${name}-back`);
    await open(id); await sleep(4500);
    const g2 = await b.ev(GEO); const ban2 = await b.ev(BANNER); await shot(`${name}-reopened`);
    const kept = g2.boxes.length > 0;
    // DISMISS_FIRST=1: Dismiss the banner before any typing (typing saves, and the save clears the banner by itself).
    let g2d = null; let ban2d = null; let dismissedFirst = false;
    if (process.env.DISMISS_FIRST) {
      const d0 = await b.ev(dismissAt);
      if (d0) { await b.click(d0.x, d0.y); await sleep(1500); dismissedFirst = true; g2d = await b.ev(GEO); ban2d = await b.ev(BANNER); await shot(`${name}-dismissedFirst`); }
    }
    // A person clicks the start of their 'warmup' line and types at its end.
    let typedUp = null;
    const w = (g2d || g2).lines.find((l) => l.v.startsWith('warmup'));
    if (w) {
      await b.click(w.left + 120, w.top + Math.min(w.h, 24) / 2); await sleep(400);
      const act = (await win()).active;
      await press('End', 'End', 35); await sleep(150); await typeText(' up', 90); await sleep(1200);
      const after = await edAt('warmup'); const bx = await boxes();
      typedUp = { hit: w.hitLeft, active: act, afterDismiss: dismissedFirst, warmupNow: after ? after.v : null, boxesNow: bx.map((x) => x.v), landedInWarmup: Boolean(after && after.v.endsWith(' up')) };
    }
    const g2b = await b.ev(GEO);
    const d = await b.ev(dismissAt); let g3 = null; let ban3 = null;
    if (d) { await b.click(d.x, d.y); await sleep(1500); g3 = await b.ev(GEO); ban3 = await b.ev(BANNER); await shot(`${name}-dismissed`); }
    await b.wheel(820, 600, 240); await sleep(1200);
    const g4 = await b.ev(GEO); await shot(`${name}-scrolled`);
    await b.wheel(820, 600, -240); await sleep(1200);
    await b.cdp('Emulation.setDeviceMetricsOverride', { width: 1100, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(1500);
    const g5 = await b.ev(GEO); await shot(`${name}-resized`);
    await b.cdp('Emulation.clearDeviceMetricsOverride'); await sleep(1200);
    await blurOutside(); await sleep(3000);
    const blocks = await blocksOf(id); lastStoredHere = await storedFor(id);
    row(name, id, { away, g1, ban1, o1: offset(g1), g2, ban2, o2: offset(g2), dismissedFirst, g2d, ban2d, o2d: g2d ? offset(g2d) : null, typedUp, g2b, dismissed: Boolean(d), g3, ban3, o3: g3 ? offset(g3) : null, g4, o4: offset(g4), g5, o5: offset(g5), invs: Object.fromEntries([['reopen', g2], ['dismissedFirst', g2d], ['dismissed', g3], ['scrolled', g4], ['resized', g5]].filter(([, g]) => g).map(([k, g]) => [k, inv(g)])), blocks, kept,
      void: kept ? null : 'no kept box after reopen' },
      !kept || (offset(g2).every((o) => !o.coversWarm) && Boolean(typedUp && typedUp.landedInWarmup)
      && [g2d, g3, g4, g5].filter(Boolean).every((g) => offset(g).every((o) => o.dyFromHash !== null && Math.abs(o.dyFromHash) <= 3))
      && [g2, g2d, g3, g4, g5].filter(Boolean).every((g) => inv(g).bad.length === 0)));
  });
}
fs.writeFileSync(`${OUT}/summary.json`, JSON.stringify({ total: rows.length, bad: rows.filter((r) => !r.ok).map((r) => r.name) }, null, 1));
console.log(`DONE ${LABEL}: ${rows.length} rows, bad ${rows.filter((r) => !r.ok).length}`);
log.end(); await b.close(); process.exit(0);
