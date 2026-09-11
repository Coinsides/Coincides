> **状态 (Status)**: active
> **层 (Layer)**: Audit / Builder evidence
> **日期**: 2026-09-10 (America/Toronto)
> **权威**: 本次执行收据；不代表 HQ 放行

# F17 / C-fix2 builder evidence

Order: [C-fix2](../../agent-ops/handoffs/2026-09-10-v13-5-c-fix2-order.md).
Upstream: [C-fix1 production-chain gap](../2026-09-10-c-fix1-builder/06-board-range-undo-gap.json).
Helpers: [cFix2Smoke](../../../client/scripts/cFix2Smoke/README.md).

The Chrome run used the unchanged C-fix1 paper fixture: production controller/history,
adapter/repository, Express routes and SQLite transaction services; a new `:memory:` database.
The new localhost proxy only journals requests/responses and injects one B restore failure.
No `.env`, credential, user database or security test was used. Build/test Vite envDir was empty.

## Five smokes

1. **PASS, after expected pre-fix RED.** `01-before-red.json/.log` records native Chrome
   A-last-unit Home + Right×5 + Shift+Down + `x`, followed by Ctrl+Z. B base 3 submitted
   drifted; undo base 4 submitted active/0..2/null; the final range stayed drifted with
   pre-edit 0..2. The target assertion exited 1 before production edits. Initial B revision
   3 was established with three ordinary no-op saves. After the fix the same gestures,
   text, range address and revisions pass: `01-after-replace.json`, `01-after-undo.json`.
   The latter confirms revision 5, active/0..2/null and explicit per-range restore intent.
2. **PASS.** Native Ctrl+Y: `02-after-redo.json` confirms base 5 → revision 6,
   drifted/null/null/pre-edit 0..2; redo carries the same explicit restore intent.
3. **PASS, production API + in-memory DB.** `03-positive-control.json` sends the restored
   matching `Ta` before-body and active/0..2/null patch without intent, base 9 → revision 10.
   Result remains drifted with pre-edit 0..2. Matching text is asserted, preventing a false
   positive from read-time text mismatch. A preliminary ordinary save at base 8 used the
   current edited body; it is retained in the final request journal but is not the decisive
   gate evidence. This smoke is API-driven, not a Chrome keyboard operation.
4. **PASS.** Native Ctrl+Z after an armed one-shot B HTTP 503: A completed, B remained
   revision 6/drifted; the UI showed **“A block edit is waiting for recovery”**, **Apply**,
   **Dismiss**, and **Retry saving block**. A second Ctrl+Z retried the original entry:
   only B wrote again, with an identical parsed JSON payload including base 6 and intent,
   returning revision 7/active/null. Native Ctrl+Y subsequently worked (revision 8), proving
   the entry continued through the same history. `04-after-failure*`, `04-after-retry*`
   and `04-after-retry-redo*` contain DB views and transport results. The existing recovery
   state also displayed “Source locked” while editing was disabled; no UI-copy change was
   made. Raw SQL tests separately inject failure after body and annotation writes, assert
   complete rollback, then retry the same request successfully.
5. **PASS.** `client-full-unit.log`: all 116 files / 1249 tests, no test filtering or skips;
   `server-targeted.log`: both requested files, 29 tests / 0 skipped. B4–C4 suites and the
   C-fix1 unit-handle/property-bridge/page-frame regressions ran intact. C-fix1's eight changed
   source/test files and entire original fixture remain equal to HEAD. This is automated
   full regression plus the native F17 chain above, not a claim to have manually repeated
   every earlier C-fix1 gesture.

Client build (including `tsc -b`) and server build (including `tsc`) pass. An initial client
build caught unsupported `.at()` in the added tests; those calls were replaced with array
indexing, without changing tsconfig, followed by successful typecheck/build and full tests.
`runtime-results.json`: 16 of 17 allowed gate subcommands pass; `docs:check` still fails at
the pre-existing `docs/agent-ops/INDEX.md` staleness. Its later inventory/glossary checks were
run independently and pass. Full verify was not run because its credential scan is reserved
for HQ. The frozen TextFlow contract has an appended amendment only.

The fixture inspection returns stored block fields and board ranges with the unchanged
read-time status derivation; `server-targeted.log` also verifies raw SQL rows. `05-final-*`
retains all synthetic requests, including the preliminary control. Screenshots were viewed
directly in the browser session, not saved as audit files. The F17 defect is resolved in this
builder delivery; overall verification/acceptance remains with HQ due to the stated gate
limits. No stage, commit, push, PR or merge was performed.
