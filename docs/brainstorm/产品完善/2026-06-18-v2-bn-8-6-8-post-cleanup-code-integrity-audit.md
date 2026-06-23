# 2026-06-18 V2.BN.8.6.8 Post-Cleanup Code Integrity Audit

branch: `codex/v2-bn-canvas-engine`

scope: post-cleanup audit after V2.BN.8.6.8 Legacy Data Cleanup And Test Reset.

## 1. Summary

The branch now has a clean prototype data state and the active runtime no longer exposes the old Better Notebook role-template direction as product truth.

The most important result is conceptual cleanup:

- `TextFlow` remains the content root.
- `AnnotationTruth` remains a visible label / highlight layer, not the main content-package layer.
- `ContentGroup` is the serious content package for the next hardening work.
- `Petal` replaces child-label semantics for local parts inside a ContentGroup.
- role-shaped block families have retreated from the active template seed.

## 2. Backup And Reset Evidence

Backup:

```text
D:\Coinsides\v2.x\Coincides\tmp\pre-v2-bn-8-6-8-reset-20260618-052310
```

The backup contains the pre-reset SQLite database files and upload directory.

After reset, the server recreated the schema and migrations. The local database now starts from an empty user/content state, plus one reusable test account.

Reusable test account:

```text
email: codex.bn8610@local.test
userId: 3fbe31ce-ea54-48dd-ace9-50e355915360
```

The password is not stored in repository documentation.

## 3. Automated Verification

Passed:

- `npm run check:canvas-runtime-boundary`
- `npm run smoke:canvas-engine-model-contract`
- `npm run smoke:canvas-engine-performance`
- `npm run build:client`
- `npm run build`
- `npm run check:changed-file-secrets`
- `git diff --check`
- `cd server && npm run test:v2`

Server v2 tests:

```text
tests: 104
pass: 104
fail: 0
```

## 4. Legacy Residue Scan

Search terms:

```text
AnnotationSet
AnnotationOrganizer
TextUnitGroup
DefinitionBlockProjection
Advanced Insert
advancedInsert
definition.basic
theorem.basic
proof.basic
exercise.general
answer.general
concept.basic
warning.callout
source.quote
text.heading
annotation_sets
annotationSets
text_unit_groups
textUnitGroups
```

Active runtime result:

```text
No active runtime residue found.
```

Remaining references are intentional retirement assertions:

```text
client/scripts/canvasEngineModelContractCheck.ts
- retired TextUnitGroup is not projected as an addressable object
- reading projection does not revive retired AnnotationSet output
```

## 5. Remaining Risk

The cleanup is code-clean from the current smoke/build/test perspective, but this branch still carries a large amount of active Better Notebook work. The remaining risk is not the retired objects themselves; it is that future patches may accidentally reintroduce role-shaped object language through docs or UI wording.

Recommended guard:

- Keep the model contract retirement assertions.
- Keep ContentGroup hardening in V2.BN.8.6.9 strict and small.
- Treat V2.BN.8.6.10 identity as a ContentGroup identity field, not a separate accepted-content entity.
