> **Status**: active - executed evidence; prohibited stages and two environment failures remain explicitly disclosed
> **Layer**: Audit / Builder evidence
> **Updated**: 2026-09-12
> **Authoritative**: No

# Final verification scope and isolation

This is the independently executed scope for the September 13 purge order and its second addendum. No product source, formal test, formal gate, agent instruction, permission configuration or main handoff was edited by this verification subtask. No Git command or Git metadata access was performed; no dotenv key value or pre-existing user database was read. Browser interaction belongs to the main builder.

## Runtime gate

The original verify:v2-bn8-runtime has 23 ordered stages. The order-local wrapper preserves all 21 permitted stages in their original order, while replacing client/registry execution with the precise safety exclusions below. The final two stages, git diff --check and check:changed-file-secrets, are never executed and remain HQ PENDING. The original unfiltered gate is not claimed green. The wrapper records every exit and keeps collecting independent stages after an earlier failure; continuing is not a PASS.

The wrapper is .codex-tmp/purge-final-verification/run.mjs. Its --runtime, --server, --client, --typecheck, --builds and --docs branches use the same environment boundary. Vite and Vitest use envFile:false. Client build retains tsc -b before Vite; server build retains manifest check, tsc and manifest copy; shared declarations are built as a prerequisite. Server test:v2 keeps its pretest manifest check/copy.

## Isolation and first-run correction

Each final invocation creates a brand-new OS TEMP directory. DB_PATH is explicitly :memory:, and asset/blob/app-data/uploads/TEMP/TMP/empty-env roots are beneath that new directory. Only OS and tool-location environment variables are copied. Provider credentials, VITE variables and inherited NODE_OPTIONS are absent. npm user/global configuration uses newly created empty files. The current wrapper also places npm cache under the new root. A task-local preload blocks dotenv and .git reads, Git subprocess commands and SQLite filenames outside the new root (except :memory:). Nested test fixtures use memory or mkdtemp paths under this explicit temporary root. No existing user DB is substituted.

The first server attempt used a new directory inside the repository. Product credential storage deliberately rejects repository-local app-data; this caused 11 additional functional-fixture failures. The wrapper was corrected to use a fresh OS TEMP root, without changing product behavior or test assertions. The initial red log remains final-server.log.

## Safety classification

Exclusions are based on test bodies and fixture semantics, not broad title-word matching. Mixed safety/functional tests are omitted as complete tests without editing their assertions. Same-user Item/Snapshot foreign-key integrity, content ownership, ordinary fault injection, schema shape, skin tokens and focus/caret/grapheme traversal remain in scope.

Client source inventory contains 150 test files. One additional functional test is client/test/fixtures/canvasAssetFixture.test.ts. Only src/pages/Settings/ProvidersSection.test.tsx is excluded (three credential-save/status/connection cases). DOM innerHTML snapshot assertions and focus/caret traversal are ordinary functional checks and remain included. Thus the final client execution covers 150 files and 1572 tests.

PDF parser fixtures use a synthetic key stored under their fresh temporary app-data to reach a fully stubbed parsing flow; they do not assert credential/authentication behavior and remain included. The registry resolve_selection mixed test below does assert non-disclosure of existence-distinguishing identity and is excluded. Static parity tests inspect declared routes, source-root locations and public projection shape; they do not exercise user authorization or attack flows and remain included.

## Entire server file exclusions

The production manifest contains 57 files. Three safety suites are wholly excluded, leaving 54 attempted files.

| File | Reason |
|---|---|
| src/__tests__/providerCredentials.test.ts | Provider credential persistence, precedence and connection authentication suite. |
| src/agent/providers/index.test.ts | Provider credential precedence, missing-key and Authorization behavior, including generated tests. |
| src/__tests__/v2DevQuickLogin.test.ts | Login/JWT and authentication gate suite; imports application bootstrap. |

## Exact server test exclusions

| File | Exact test title | Body-based reason |
|---|---|---|
| src/__tests__/v2MaterialLibrary.test.ts | source snapshot APIs are scoped by user and course | Other user cannot retrieve the owner snapshot. |
| src/__tests__/v2MaterialLibrary.test.ts | source anchor APIs are scoped by user course and target, and refresh repairs stale page mapping | Cross-user list isolation mixed with functional anchor refresh. |
| src/__tests__/v2SourceIdentityFloor.test.ts | database constraints enforce per-user hash, placement, and v1 materialization uniqueness | Cross-user hash partition mixed with database uniqueness. |
| src/__tests__/v2SourceFileIntake.test.ts | successful intake moves temp to an internal ready blob and returns a path-safe DTO | DTO must hide storage_key and root filesystem path. |
| src/__tests__/v2SourceFileIntake.test.ts | detail/list/blob stay user-scoped and report a missing ready blob without leaking paths | Cross-user access denial and path disclosure prevention. |
| src/__tests__/v2SourceFileIntake.test.ts | Source routes upload, list, detail, precheck, and stream an authenticated safe blob | Cross-user HTTP 404 and private storage field omission. |
| src/__tests__/v2ItemRelationFloor.test.ts | DELETE users cascades a same-user Item family and rejects a cross-user dangling Relation at statement end | Cross-user dangling Relation rejection mixed with lifecycle. |
| src/__tests__/v2Items.test.ts | Item APIs are user-scoped, Package B removal preserves Item, and no Item hard-delete route exists | Intruder denied Item, Anchor, update, retire and cast access. |
| src/__tests__/v2Relations.test.ts | create normalizes undirected Relations, preserves directed direction, and rejects invalid endpoints | Mixed functional normalization and foreign endpoint rejection. |
| src/__tests__/v2Relations.test.ts | latest assessment is a checkpoint only and Item search stays user-scoped | Intruder Item absent from owner search. |
| src/__tests__/v2Relations.test.ts | revoke preserves history, recreate gets a new identity, and Item lists are user-scoped | Intruder denied relation get/list. |
| src/__tests__/v2Relations.test.ts | Relation assessment compatibility is scoped, ordered, and has no persisted invalidation flag | Intruder denied assessment list. |
| src/__tests__/v2SourceContainerIntake.test.ts | K-1 good and traversal entries are independently adjudicated without rejecting the container | ZIP traversal entry rejection. |
| src/__tests__/v2SourceContainerIntake.test.ts | K-3 extraction creates no filesystem path outside the managed target root | Filesystem traversal containment assertion. |
| src/__tests__/v2SourceContainerIntake.test.ts | partial expansion adds the code | K-5 child test injects ../blocked.txt; only this nested child is excluded. |
| src/__tests__/v2ImprintEmbedding.test.ts | DashScope provider uses the fixed international endpoint and validates 1024-float responses | Asserts the Authorization bearer header in addition to embedding request shape. |
| src/__tests__/v2ImprintEmbedding.test.ts | DashScope provider errors are sanitized and never expose credential or response body text | Credential/response disclosure prevention. |
| src/__tests__/v2ImprintRetrieval.test.ts | K-3 ownership filtering discards a closer foreign hit and oversampling replenishes k | Foreign-user vector hit filtering. |

There are 18 precise exclusions. In the container K-5 case, only the nested child named "partial expansion adds the code" is excluded; the parent and its other three children remain in scope. On this installed Node version, --test-skip-pattern omits matching cases from TAP entirely, rather than incrementing TAP skipped. Therefore skipped=0 does not mean nothing was excluded. The outer log lists every exclusion, and their names were checked absent from executed # Subtest lines.

## Additional registry exclusion

resolve_selection registers the public read tool with the mixed receipt vocabulary: Mixed schema tests include the requirement that missing cannot echo an existence-distinguishing identity. Four other registry cases pass.

## Final measured results

| Scope | Measured result | Evidence |
|---|---|---|
| Typecheck | client noEmit, shared build, server noEmit all exit 0 | final-typecheck.log |
| Client permitted full suite | 150 files, 1572 tests, 1572 pass, 0 fail/skip/unhandled | final-runtime.log |
| Three builds | shared, client and server all exit 0 | final-runtime.log |
| Server permitted suite | 54 attempted files; 428 TAP entries; 426 pass, 2 environment failures | final-server-rerun.log |
| Test wiring | 75/75 wired, 0 exempted, 0 unwired | final-runtime.log |
| Boundary / model | 174 checks / 60 groups pass | final-runtime.log |
| Registry / manifest / parity tests | 4 / 10 / 10 pass, with registry exclusion disclosed above | final-runtime.log |
| Other static stages and performance | All permitted code stages pass | final-runtime.log |
| docs:check | Final exit 0: index check, object inventory and glossary K-1 through K-3 all pass; generator updated only agent-ops/INDEX.md | final-docs.log |
| Git / secrets | Never executed; HQ PENDING | final-runtime.log |

The two remaining environment failures are v2SourceMineruWiring.test.ts (python.exe ENOENT during module import, so its five internal cases never run and TAP reports one file failure) and v2SourceRegionCells.test.ts (MinerU Python process code 101, unavailable uv Python executable). They are the order's declared environment exceptions; no test is altered to hide them.

The initial server run had 414 pass / 14 fail. The dead ShapeObjectLayer callsite was removed from the static test inventory by the main builder, while moving only the verification root outside the repository resolved the 11 app-data failures. The final rerun therefore has exactly the two environment failures. Client preflight had 1571 pass / 1 fail at affiliationVisibility K-2; the builder corrected the fixture and the final client run passed all 1572 cases. Original red evidence remains prefinal-client.log and final-server.log.

## Server manifest source fingerprints at this receipt

Hashes identify the reviewed current source; runtime counts come from TAP, not static top-level enumeration.

| File | Scope | SHA-256 |
|---|---|---|
| src/__tests__/v2NoteFoundation.test.ts | Full functional file attempted | c7cee8787a3fb9c1b6a3ddea640aca72352ddc94189fe9c9fbf89617c2021cca |
| src/__tests__/v2NoteBlockLifecycle.test.ts | Full functional file attempted | e46c081bf17cb72c8a09f03bbf606d73a638a56db84c5b3c850a889ff6229a18 |
| src/__tests__/v2MaterialLibrary.test.ts | Functional cases; 2 exact exclusions | c4e986f555d5c047b81498b6f16dc23b6e61d4b11afb374070c6625368c1dab1 |
| src/__tests__/v2ContentGroups.test.ts | Full functional file attempted | 5a7b1b4f2ddc1e20b9f4164a69f7ca1ed49e68b3a51f75d438249db7a5a00fa6 |
| src/__tests__/v2GroupFolders.test.ts | Full functional file attempted | 1dcdb2402171b21bbf0016f247ccce6a97f85f47d329d874f0d01a51713a38ed |
| src/__tests__/v2CanvasPersistenceCutover.test.ts | Full functional file attempted | 0d21697336a56d2c41fac6c4d7d669b27206785271c46c46cc410ac26d4b7d0b |
| src/__tests__/v2Purposes.test.ts | Full functional file attempted | 306b879f6b719f380c79db6e7c24fed37defcf17fac22305fea073e7f6c83d62 |
| src/__tests__/v2SourceIdentityFloor.test.ts | Functional cases; 1 exact exclusions | 33d5f28cc404e05ca99b209b5ee9dad8bd27321c0d7ee9df3e874f5cbf589d2e |
| src/__tests__/v2SourceFileIntake.test.ts | Functional cases; 3 exact exclusions | 633144d299c8d020563c997a11f719babe72f0c254769b948c386dc6f99aa587 |
| src/__tests__/v2SourceMaterialization.test.ts | Full functional file attempted | 4c7f07c691a6944983d7ad8ed11063d79bae680b7635a912e72b8089d54848ee |
| src/__tests__/v2SourceLifecycleClosure.test.ts | Full functional file attempted | 008eb1275e91a8cc572e921e0d50e12105de8880e9c4ef55db1b8b8219970e22 |
| src/__tests__/v2ItemRelationFloor.test.ts | Functional cases; 1 exact exclusions | 4df43894b9e8b2bf6669991cfc227555e491ba64759808dcc47b81688995f0b4 |
| src/__tests__/v2Items.test.ts | Functional cases; 1 exact exclusions | 100bea58a9dc380c7c136543a00b6d16ea9de379fba53f27720173ae289bae36 |
| src/__tests__/v2Relations.test.ts | Functional cases; 4 exact exclusions | 70cc38966c0d336762ac346aad267bcc2b456eb949fd9eab74d14e0feed9e384 |
| src/__tests__/v2RelationLifecycleClosure.test.ts | Full functional file attempted | 223e0f198272007a04b0a4ebb8a35f34a85064a5e3050b737e8bb0907db6afc9 |
| scripts/v2OperationBatchTimestampMigration.test.ts | Full functional file attempted | a1c1a8023eb487e2087c6ecbf20149740f704d6584cd1f2a189a2403aff34c8c |
| src/__tests__/textFlowIdentityContract.test.ts | Full functional file attempted | 87c9c76df6223ec4358f47ebfc707e602479e1d63c9e8c58e5440cb9fe003771 |
| src/__tests__/v2DevQuickLogin.test.ts | Entire file excluded | 70e9be5413d2b7abafe299a58310c937261c134e8006ed0f436d1956fa2a6000 |
| src/__tests__/v2TestV2ManifestHook.test.ts | Full functional file attempted | 95a5fb1361cfb290ffb38b61913a94a57943ec3cc161f0bb0445a677ea52e3a5 |
| src/__tests__/v2DocumentParserPdf.test.ts | Full functional file attempted | 777f19348a8328a270c64a9fcad0411e91b0ae333a8d91bb53c18e06806d2e3b |
| src/__tests__/v2BlockRestoreDoor.test.ts | Full functional file attempted | cf191b3659ed67e464da15dc5842cf747d4254b07719c36aa54ab7bd781370b9 |
| src/__tests__/v2SourceImprints.test.ts | Full functional file attempted | 0ff313572ceb3637483031fbd86fd2760fe5a65926677207ec7a39a541da4ca4 |
| src/__tests__/v2SourceNeverReject.test.ts | Full functional file attempted | c3e76b9a41d8d037b9e52dc81b697faa31d80b52ad73fbeca59d3c60e552fa8f |
| src/__tests__/v2SourceContainerIntake.test.ts | Functional cases; 3 exact exclusions | 5d6291f4f5576d4bb82f5402e0592e87b656e58228205b25c9a3538588f73104 |
| src/__tests__/v2SourceT0Alignment.test.ts | Full functional file attempted | 3d426313a35d5df4de21d4f36b08d0e16ad2dda3cd72225244f76ef9caf6cf6b |
| src/__tests__/v2SourceTranscriberFingerprint.test.ts | Full functional file attempted | 9581872efb3eeca90f1257c7b7345fb7adbd416a02bcf63e0263ca508fe64823 |
| src/__tests__/v2SourceMineruWiring.test.ts | Full functional file attempted | e3b97b04ad9c6e2b2a7230e9c4edb53aacf0da8cd8f5866599d6f6b65114692a |
| src/__tests__/v2SourceRegionCells.test.ts | Full functional file attempted | 05d9f9d497d791cd91fb8b3e8dd480d41e955633ad4b2a6a343f39307c8d6369 |
| src/__tests__/v2ImprintEmbedding.test.ts | Functional cases; 2 exact exclusions | f729eceb048560b726e06304401e4d9e880e0eb27e6eb7d63125d09f78753e71 |
| src/__tests__/v2ImprintRetrieval.test.ts | Functional cases; 1 exact exclusions | b9fcdb541735df538a5fee368cf5a4a7d510f2dfa5efc6bd0a7d3942e0cea75a |
| src/__tests__/v2ImprintCitations.test.ts | Full functional file attempted | df175c50ac7464f02353821d8799964951ac9dfcfa12ab06d37d4899a4076c1f |
| src/__tests__/v2TemplateStudioDecommission.test.ts | Full functional file attempted | 7506189da64a3a4184e7f0e8a5d5751be90bb61d65bafb2a2d91fcd558d47d3f |
| src/__tests__/providerCredentials.test.ts | Entire file excluded | 85c881d9bae5e6502e91376cbbac25ede611ffb7221892727a3a08bc883fa373 |
| src/__tests__/v13AgentMemories.test.ts | Full functional file attempted | ceeb09a2855e520626e05c13c8e489823bbeb66e42cf7e1f8e07e9e81b04b171 |
| src/__tests__/v13AtomicTextSave.test.ts | Full functional file attempted | 6687c6a5fdbb4475a1814250e520af44b316cea1d1858eaa4794e7c3c27b48e0 |
| src/__tests__/v13AtomicTextSaveMigration.test.ts | Full functional file attempted | 06bd1f59f53321a3db867e39550d479d7e9efe6ff419db273433564f67f6a8f7 |
| src/__tests__/v13BoardChalk.test.ts | Full functional file attempted | ab096eb56cd3cb588ac9dddb3756121b2b4021f545034e4ebede4562dfd326f4 |
| src/__tests__/v13BoardStaging.test.ts | Full functional file attempted | 1e107c1f5c9066d46a908c30d3c2774218ac2ffb5c3972d8c2188be6f03a6892 |
| src/__tests__/v13BoardTextRanges.test.ts | Full functional file attempted | a72b31589b892a01a768d0efa9f5e799068d690b4a82ccd396a22c5d00db4389 |
| src/__tests__/v13BoardTrayRelocation.test.ts | Full functional file attempted | e4845b9c7229c2e8b2083ab6dfd82cfe44c001c14014ca09479375d7986f3d92 |
| src/__tests__/v13BoardViewportBookmarks.test.ts | Full functional file attempted | 38336898b0119962ac1d43e614adac66045cad6eb706fc21756001b3c339f990 |
| src/__tests__/v13CanvasRetirement.test.ts | Full functional file attempted | 7747f5067fabe27ed3ffda4dc5047263d75da6322459153db6b080cb392197ce |
| src/__tests__/v13EventsLedger.test.ts | Full functional file attempted | 2b471856194d020b330d5d204697cf0a78a9b22a5c589a3ff726b5fbfdb7bb0b |
| src/__tests__/v13GraphemeTextRanges.test.ts | Full functional file attempted | ff7ec401719bb91791c2dcb9671d24d7b0f0587c1a14648dd69110c38def3a65 |
| src/__tests__/v13ItemRefBlocks.test.ts | Full functional file attempted | 15b6cbdaf80a250a8785712da7e03da42e4cb23a460f3b35dd896ba3a86dea0d |
| src/__tests__/v13MediaBlocks.test.ts | Full functional file attempted | 366555250a034b7b6d65c7c9f19e701a9d312c20ab1dbf11f49ee4694c4d3ada |
| src/__tests__/v13NoteMetadata.test.ts | Full functional file attempted | 1865599df029e3ead7af093e5494074aa6e00b46caf2acce5089f89439638600 |
| src/__tests__/v13PagePresets.test.ts | Full functional file attempted | 794d3cdfb9bf6d9d95c8d65a13c305f670064e6a5836e7d14b451c629601ec5e |
| src/__tests__/v13PaperInk.test.ts | Full functional file attempted | 77bbf854fd2daba92952b930ca7ceb7fa62000af088ea36353b0275705669c0e |
| src/__tests__/v13PaperSkin.test.ts | Full functional file attempted | ed165ccad41d123cd74b451bb75e4924213422b10a95aa5f6300e3f3ef52d981 |
| src/__tests__/v13ProjectDeletionReferences.test.ts | Full functional file attempted | f1300510f20486aab5296d2891d0d1aa23d326e506b3f2773880cf3eb9bc4e48 |
| src/__tests__/v13SourceProjectionRepair.test.ts | Full functional file attempted | fdda2d034606a790b0157f2ad5ae99e9807a3d969251e229be36974233ca03dd |
| src/__tests__/v13SourceReprojection.test.ts | Full functional file attempted | 45cef9ffb7f534e587ea4c2725a22f7b25b086a76f40ccb72c91d195045027a2 |
| src/__tests__/v13Tray.test.ts | Full functional file attempted | eed1158db149be1b25969973e2450f2437a14fa423c52c58c827abfcdcfc2cfe |
| src/__tests__/v13TrayOrder.test.ts | Full functional file attempted | 4cefb75b316e240600926424056bd5a9980bf4b882bcb05001a4a31cc535d381 |
| src/__tests__/v13WallCollectionBatch.test.ts | Full functional file attempted | f614312dcf744a1ba7c2542626ec567e01cc685d12902fdebdb807478521fbb2 |
| src/agent/providers/index.test.ts | Entire file excluded | 776bc90ad6dea69693613e5f2664812998fd3a21b512dd7c86bf43338cee3e3f |

No unfiltered 57-file server PASS or original full runtime PASS is claimed. Safety-class execution remains unapproved under the inherited order boundary; Git/secrets remain HQ responsibility.

## Final documentation closure

After the main builder's Result and the final source-preservation receipts were stable, --docs-refresh ran the existing docs-index.mjs generator and the complete docs:check sequence. Exactly one generated file changed: docs/agent-ops/INDEX.md. Index freshness, docs/generated/object-inventory.md and glossary K-1 through K-3 all passed. The initial stale-index failure is retained in final-runtime.log as historical evidence; the final result is final-docs.log (exit 0). No authority prose or main handoff was edited by this verification subtask.
