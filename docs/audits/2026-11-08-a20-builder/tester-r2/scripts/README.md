# A-20 acceptance probes (Tester(1), 2026-11-08) — run before sealing r2

The builder runs these on the r2 build before sealing (operating-workflow §6 item 1). A red **gate** row means do not seal. Tester runs them again on the sealed package. Real Chrome over CDP, a local backend, a scratch account. Never the island: the head throws on `island`.

## Files
- `a20<x>_probe.mjs` = `a20_head.mjs` + `a20<x>_body.mjs`. Rebuild with `for x in "" b c d e f g i j k l; do cat a20_head.mjs a20${x}_body.mjs > a20${x}_probe.mjs; done`.
- `cdp.mjs` and `seeds.json` are the same as in the A-25 kit. `kill-chrome.ps1` is used by HARDKILL `KILL=proc`.
- `analyze-a20.mjs <OUTDIR>/runs/<label>` prints each group against the r2 rule below. Arms that judge themselves use the row's `ok`; reference arms are judged in the analyzer.

## Run (one browser at a time; a local backend and its static front end)
```
CREDROOT=<scratch dir, one per backend>  OUTDIR=<scratch dir>  PRESET=a4_portrait  CDPPORT=<free port, not 9615>
[ONLY=<arm prefixes, comma list>]  [REPS=2]
node a20<x>_probe.mjs <label> <front origin> <api base, e.g. http://127.0.0.1:3603/api> local
[BASE=<OUTDIR>/runs/<base label>] node analyze-a20.mjs <OUTDIR>/runs/<label>
```
- `BASE` points at a run of the same probe on the base build (04f6f822) **in the same environment**. With it, UNDOSEQ / UNDOPAUSE / IME are judged as equal to the base shapes (Henry: undo as today). Without it the fixed shapes are a fallback, and the last UNDOPAUSE step is not judged: it differs by environment (`['w']` in Tester's runs, `[]` in the builder's, on 04f6f822 alike).
- `CREDROOT` holds the scratch account (`cred.json`, plus `cred-b.json` for the second account in ACCT401). Keep it out of any repo.
- `CDPPORT` must be set. a20j (STALE) opens a second, isolated browser context through the same port.
- Single-browser walks need no lock slot. If you run two at once, take one heavy-job slot.
- HARDKILL (`a20_probe ONLY=HARDKILL KILL=close|proc`), PAUSEEXIT-closetab / -kill (`a20c`) and OFFKILL (`a20i`) end the process. Run each alone, with one label per run.

## r2 gate (Main_Designer 11-08: orders 02669083, ea1bedd8, 22fa24ab, a902abee, 0dc0ac0b and the last two rulings)
r2 method: the belt keeps only **unsealed** words, recorded from the last confirmed content to the live text, and nothing when the two are equal. Sealed words go by the **receipt** (a banner with Apply, or a 409). A queued "Enter + words" split group records only the new unit as a kept-box record, which the person puts back by hand; it never lands by itself. There is no put-back button in r2.

| Probe / arms | r2 gate (red = do not seal) | pre (04f6f822-equivalent) | r1 (index-BkYnVk7W.js) |
|---|---|---|---|
| a20e K1-401hash / 401blur / close / paste500 | No duplicate on the server, and the line is `note alpha beta` either on the server or after pressing the banner's Apply (Apply must give the newest snapshot). Nothing lands by itself twice | — | RED 8/8: `note alpha beta alpha` |
| a20e K1IME-held | Same, for `note现值公式` | — | RED 2/2: `note现值公式现值` |
| a20e K2-hash / paste | The undone `gamma` does not come back by itself. A banner offering it is the person's choice and is not red | — | RED 4/4: `note gamma` lands again |
| a20e K5 | In the same mount, no banner with Apply after a failed pause save; live text never overwritten; the server ends `note delta more` | — | RED 2/2: Apply banner at the pause; Apply turned `note delta more` into `note delta` |
| a20e K3 | 401 before the account loads: after sign-in the edit is offered (banner and Apply), Dismiss removes it, and after a reopen it is gone. Both keys are adopted (`draft-recovery:v2:anonymous`, `unplaced-words:anonymous:<note>`) | — | RED 2/2: both under `:anonymous`, never offered |
| a20e K6-push / replace | Back after the leave: push goes to A, replace goes to X | — | push ok; replace RED 2/2 (history `[A,X,A,B]`) |
| a20f LATEBACK-req/resp-type | `' second'` on the server or in a kept box, **or** visibly refused: the first keys do not show in the editor while still on A, and the editor is read-only or a NEW `[role=status]` / `[aria-live]` text appears while waiting (compared with `baseState` taken before the leave) | (pre: nothing sent at the hash leave) | RED 4/4: `' second'` silently lost |
| a20f LATEBACK-*-still | Recorded: where the person ends up (`places`) and the status while waiting | — | pulled to X at about 3.3 s |
| a20g INAPP-home/tab-type | Same as LATEBACK (an old bug, fixed together) | RED 4/4 (old bug) | RED 2/2 |
| a20j SPLIT-mid / home / mid401 / midback | The original line is `alpha beta` on the server (alpha and beta once each); a banner is allowed. mid/home may add a box with the second half: write its contents in the receipt (accepted 🅱; the manual says Discard it, do not paste it) | green 4/4 (`alpha beta` + banner) | RED 8/8: `alpha` / `""` (saved words deleted) |
| a20j RETRY-del / more | del: `beta` stays deleted, no box. more: `beta more` and no box | green 2/2 | RED 4/4 (beta returns / false box) |
| a20j STALE-back / edit | Same as pre: the line is exactly what the other device wrote, no box; a banner is allowed | green 2/2 | RED 2/2 (resurrection / false box) |
| a20j TWICE-hash / back / paste, BACKOK-plain / slow | Words on the server once; no false "could not be saved" / "did not reach" after a 2xx; no late jump back to the first destination | (pre: words lost and the same toast) | words kept; false toast in TWICE-hash/paste and BACKOK x2 |
| a20j TWICE-hash500 (third ruling 11-08, "TWICE-hash500 再裁") | The held save gets a one-time 500; the leave's recheck round re-sends it. Green = `twice words` on the server exactly once and exact, the person lands on the newest destination C (never X), no Apply on reopen. Failure messages are recorded with where they showed and where they ended (`toastsAll`), not gated: A-25 (e). Runs on every package | — | — |
| a20d GONEFAIL-back | Words on the server or in the box, once. The leave-time save really fails (500), so "did not reach the server … kept on this device" is a **true** message and allowed, at most once per appearance (`goneN`). The false message is the stay message "could not be saved / Please retry" (the person has already gone back): 0 of it. (Fixed 11-08: the analyzer had wrongly forbidden the true message too) | false toast | RED 2/2 (false "Changes could not be saved. Please retry before leaving the note.") |
| a20l FLYK-close/full × req/resp | `kzero` once (by receipt), `kone` 0 on the server **and** in the kept box (waits for the person) | RED 4/4 (kone lost) | green 4/4 |
| a20k OFFLINE-N / OFFALL | `Failed to save block` at most once while offline, counted per appearance (`watchN`); a click outside after the network is back saves everything. OFFALL may add one "Block save result could not be reconciled" | 0 toasts (no saves) | 1 / 1+1, saved |
| a20b LEAVE-hash/paste × tab/newtab/inapp | Words on the server, no "could not be saved" | lost | green 12/12 |
| a20b LEAVE-401 × 3 | Words end up on the server (kept box lands, or Apply) | lost in a new tab | green 6/6 |
| a20b EMPTYHASH / LATE / LATEREQ | EMPTYHASH: no toast. LATE: on the server, no Apply banner. LATEREQ: `first words` on the server **or** offered by a banner; older-over-newer or silent loss = red | toast / — / — | green |
| a20d HASHFAIL, SWITCH, GONEFAIL-hash/paste, ACCT401, CLOSEFLY, OFFCLOSE | HASHFAIL: stays on the note with the toast and the words in the editor. SWITCH: 0 false toasts, each word once. ACCT401: B sees nothing; A's words on the server. CLOSEFLY / OFFCLOSE: once (the stale banner on reopen is known, A-25 2a) | — | green |
| a20 IDLE, WAMP, PAUSES, UNDO, PAGEHIDE; a20c PAUSEEXIT×5, UNDOSEQ, UNDOPAUSE, DRAFT, PUTDUP, IME; HARDKILL | Same as r1: idle save at 3.5 s; 0 saves while typing and 1 after; one save per pause; undo shapes identical to the same-environment base run (`BASE=`); every pause exit saved; draft full after 3.5 s; no duplicate PUT; IME 3 PUT; hard kill keeps what was typed before the pause | as listed in Tester notes | green |
| a20i OFFKILL | Reference: lost until A-25 2a; the manual gets a qualifier | lost | lost |

| a20m BACKIN-undo (Reviewer M2; decides r2) | Note A entered through the app (course page loaded = router entry idx 0, A clicked in its list = idx 1; never a scripted hash). Save held then 500, Back. If the person stays on A: network back, undo the group, leave, reopen. **Red = the undone words come back by themselves** (on the server or on screen without Apply) | 0/2 return | **RED 2/2 on r2 `index-DGn86c1V.js`** (M2 reproduced) |
| a20m BACKIN-fail | Same start. Recorded: where the person ends, messages (with place), kept records while staying, and whether a second leave (scripted hash, saves held) is still held. Printed beside it: the r3 rule = stays on A, no "did not reach the server … kept on this device" while on A, no kept record while the session lives, the second leave held | stays, no false message, no record, second leave not held (pre never held hash leaves) | stays, false message 1, record 1, second leave not held (`released` stuck) |
| a20m LIST-close / back / addr (Reviewer M1) | `k0` Enter `x` Enter `y` with every text-save held, then leave. r3 rule per variant (Main_Designer 11-08): close / back = `x` and `y` each in a box (split records, put back by hand, never landing by themselves), server `warmup k0` with `k0` once, nothing lost or doubled; addr (a leave that can be held) = `k0`, `x`, `y` once each on the server. The analyzer reads where `x` / `y` really are (server, box, kept record, banner text, lost). r2: not worse than pre | close / back / addr: `x` and `y` lost 6/6 (the banner offers only `warmup k0`) | close, back: `x` lost 4/4 (M1), `y` in a box; addr: held, all saved 2/2 |
| a20m LANDOTHER-plain / heading / headline (A-25 base line) | While the LANDFAIL failure is on, type at the end of another plain block / the body line of another heading block / the heading line itself. Recorded: keys show, "Heading changes could not be completed" toasts | keys show in all three (2/2, 1/1, 2/2), 0 heading toasts | the same (2/2, 1/1, 2/2) |

Only Chrome is tested. The non-Chrome fallback (popstate) is not covered by these arms.

## Measuring fix (11-08)
Every `vis()` / visible-button test now uses `el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})` plus a non-zero box. The old test (`offsetParent !== null`) is always false for `position:fixed` elements, so the LATEBACK / INAPP probes were blind to the "Saving before leaving…" status bar. Arms that require "no Apply banner" now also see Apply buttons inside fixed banners. LATEBACK and INAPP write a screenshot `<row>-wait.jpg` into the run folder at the wait moment as side evidence (crop the sidebar before handing it in).

Known, not red (Main_Designer 11-08): a false "did not reach the server" can still show when the account was unknown at open (a leave right after sign-in). Record it as known.
