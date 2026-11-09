// Seed the pairs account for the r3e round (11-09): cred-3611r had no cred.json, so the probes fell back to the shared default
// email (already registered on 3611 by the chain account) -> register 409 -> a cred.json with a password that never registered.
// As in the r3 round (cred-3603r): its own test email. Local backend 127.0.0.1 only; the password is generated here, never printed.
// Usage: node seed-cred-3611r.mjs <credDir> <api> <email>
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
const [dir, api, email] = process.argv.slice(2);
if (!/^http:\/\/127\.0\.0\.1:\d+\/api$/.test(api)) throw new Error('local backend only');
const p = `${dir}/cred.json`;
if (fs.existsSync(p)) fs.renameSync(p, `${dir}/cred.json.bad-1109`);
const c = { email, password: randomBytes(12).toString('hex'), name: 'Verify' };
const J = { 'Content-Type': 'application/json' };
const r = await fetch(`${api}/auth/register`, { method: 'POST', headers: J, body: JSON.stringify(c) });
console.log('register', r.status);
if (r.status >= 300) { fs.renameSync(`${dir}/cred.json.bad-1109`, p); throw new Error('register failed; old cred.json put back'); }
const l = await fetch(`${api}/auth/login`, { method: 'POST', headers: J, body: JSON.stringify({ email, password: c.password }) });
const tok = (await l.json()).token;
console.log('login', l.status, 'token', !!tok);
fs.writeFileSync(p, JSON.stringify(c));
console.log('cred.json written for', email);
