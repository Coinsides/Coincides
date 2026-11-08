// Positive control for the fixtures: does Chrome decode each one, and what size does it show (EXIF applied)?
// Expect: every 'visible' fixture decodes at its 'display' size; EXIF 6/8 come out portrait; bad-* fail to decode.
import fs from 'node:fs';
import { launch, sleep } from 'file:///<home>/.claude/ops/tester-kit/harness/cdp.mjs';
const DIR = new URL('./fixtures/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', DIR), 'utf8'));
const prof = new URL('./profile-check', import.meta.url).pathname.replace(/^\//, '');
const b = await launch({ port: 9611, profile: prof });
await b.cdp('Page.navigate', { url: 'about:blank' }); await sleep(300);
let bad = 0;
for (const m of manifest) {
  const buf = fs.readFileSync(new URL(m.name, DIR));
  const url = `data:${m.mime};base64,${buf.toString('base64')}`;
  const r = await b.ev(`new Promise((res)=>{const i=new Image();i.onload=()=>res({ok:true,w:i.naturalWidth,h:i.naturalHeight});i.onerror=()=>res({ok:false});i.src=${JSON.stringify(url)};setTimeout(()=>res({ok:false,timeout:true}),20000)})`);
  const want = m.display ? m.display.join('x') : '-';
  const got = r.ok ? `${r.w}x${r.h}` : (r.timeout ? 'timeout' : 'decode-failed');
  const pass = m.expect === 'visible' ? got === want : (m.name.startsWith('bad-') && m.name !== 'bad-pngbytes-named.jpg' ? got === 'decode-failed' : true);
  if (!pass) bad += 1;
  console.log((pass ? 'ok  ' : 'BAD ') + m.name.padEnd(40) + ' want ' + want.padEnd(10) + ' got ' + got);
}
console.log(`fixtures checked: ${manifest.length}, bad ${bad}`);
await b.close(); process.exit(0);
