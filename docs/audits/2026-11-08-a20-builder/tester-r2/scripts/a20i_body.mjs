// OFFKILL (Tester 11-08, manual sentence "If the browser is closed hard ... at most the last two seconds or so of typing
// are lost"): one pause save fails at the network layer ('one burst' + 2.6 s); the network comes back; ' back online'
// + 2.6 s pause; then the browser is killed (Browser.close). Run alone (ends the process). Server read by API after.
const id = await prep('A20 offkill'); await watch(); mark();
rule = ({ u }) => (/text-save/.test(u) ? 'neterr' : 'continue');
await typeText('one burst', 90); await sleep(2600);
rule = () => 'continue';
await typeText(' back online', 90); await sleep(2600);
const before = await serverUnits(id);
await Promise.race([b.cdp('Browser.close'), sleep(1500)]).catch(() => {});
await sleep(3500);
const u = await serverUnits(id);
add({ arm: 'RV', name: 'OFFKILL', id, before, units: u, kept: u.some((x) => x.includes('back online')), puts: net.filter((l) => /text-save/.test(l)), ok: u.some((x) => x.includes('back online')) });
console.log('OFFKILL', JSON.stringify({ before, units: u, puts: net.filter((l) => /text-save/.test(l)) }));
log.end(); process.exit(0);
