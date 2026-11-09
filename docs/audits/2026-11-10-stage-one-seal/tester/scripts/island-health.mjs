// Tester(1) 2026-11-10, stage-one seal D6/D7 (Main_Designer ruling 7): island health = /api/health + one login of MY island
// test account (t1.r04, ops island-test-accounts.md; never Henry's account) + one write + one read, through the tunnel
// (127.0.0.1:13002). The write is a note in the test account's own test course, titled so it is recognisably a probe
// ('seal-health <time>'); it is left there like the post-deploy probes' notes (nothing is deleted). Credentials are read
// from the ops file and never printed. Usage: node island-health.mjs
import fs from 'node:fs';
const API = 'http://127.0.0.1:13002/api';
const COURSE = '2247e6ee-3564-4a8a-8537-f547e10c51e8'; // the test account's test course (as in the kit heads' island branch)
const line = fs.readFileSync('<ops>/island-test-accounts.md', 'utf8').split(String.fromCharCode(10)).find((l) => l.includes('<island-test-account>'));
if (!line) throw new Error('test account row not found in the ops file');
const cells = line.split('|').map((c) => c.trim()); const email = cells[2]; const password = cells[3];
const J = { 'Content-Type': 'application/json' };
const out = {};
const h = await fetch(`${API}/health`); out.health = h.status;
const lr = await fetch(`${API}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email, password }) }); out.login = lr.status;
const { token } = await lr.json().catch(() => ({}));
const auth = { ...J, Authorization: `Bearer ${token}` };
const title = `seal-health ${new Date().toISOString()}`;
const cr = await fetch(`${API}/notes`, { method: 'POST', headers: auth, body: JSON.stringify({ course_id: COURSE, title, page_format: 'a4_portrait' }) }); out.write = cr.status;
const note = await cr.json().catch(() => ({}));
const rr = await fetch(`${API}/notes/${note.id}`, { headers: auth }); out.read = rr.status; const back = await rr.json().catch(() => ({}));
out.readBackTitleMatches = back.title === title;
console.log(JSON.stringify(out));
process.exit(out.health === 200 && out.login === 200 && out.write < 300 && out.read === 200 && out.readBackTitleMatches ? 0 : 1);
