# V2.BN.8.6.8 To V2.BN.8.6.10 Final Integrity Scan

Date: 2026-06-18

## Scope

This scan closes the serial cleanup / hardening / identity goal:

- V2.BN.8.6.8 legacy data cleanup and test reset
- V2.BN.8.6.9 ContentGroup / Petal integrity hardening
- V2.BN.8.6.10 ContentGroup identity seed

The scan focuses on active code debt, not historical design documents.

## Verification Result

Passed:

- `npm run check:canvas-runtime-boundary`
- `npm run smoke:canvas-engine-model-contract`
- `npm run smoke:canvas-engine-performance`
- `npm run build:client`
- `npm run build`
- `npm run check:changed-file-secrets`
- `git diff --check`
- `npm run verify:v2-bn8-runtime`
- `npm run test:v2` from `server`

Known non-blocking output:

- Vite still reports existing dynamic-import / large-chunk warnings.
- `git diff --check` reports Windows LF-to-CRLF normalization warnings only.

## Active Code Scan

### AnnotationSet

Active runtime path:

```text
No active AnnotationSet runtime or UI path found in client/src, server/src, shared, or client/scripts.
```

Remaining active-code reference:

```text
client/scripts/canvasEngineModelContractCheck.ts
  verifies reading projection does not revive retired AnnotationSet output.
```

Assessment:

```text
safe
```

AnnotationSet has been retired from normal product execution. The remaining script reference is a retirement guard.

### TextUnitGroup

Active runtime path:

```text
No active TextUnitGroup runtime or UI path found in client/src, server/src, shared, or client/scripts.
```

Remaining active-code reference:

```text
client/scripts/canvasEngineModelContractCheck.ts
  verifies retired TextUnitGroup is not projected as an addressable object.
```

Assessment:

```text
safe
```

TextUnitGroup is no longer an active product operation. The remaining script reference is a retirement guard.

### DefinitionBlockProjection

Active runtime path:

```text
client/src/pages/Notes/canvasEngine/blocks/DefinitionBlockProjection.tsx deleted.
```

Assessment:

```text
safe
```

DefinitionBlockProjection no longer participates in the canvas runtime. Future definition-like meaning should flow through TextFlow / AnnotationTruth / ContentGroup identity.

### Advanced Insert

Active runtime path:

```text
No active Advanced Insert / advancedInsert runtime path found in client/src, server/src, shared, or client/scripts.
```

Assessment:

```text
safe
```

The old broad insert path has been hidden/removed from the normal UI direction. Future insertion should be reintroduced through command surfaces only when the object model is stable.

### ContentGroup interpretation

Active runtime path:

```text
client/src/pages/Notes/canvasEngine/contentGroupService.ts
  keeps a LegacyContentGroupInterpretation bridge only for stale local objects.

client/scripts/canvasEngineModelContractCheck.ts
  tests that stale interpretation normalizes into identity.status = draft.
```

Assessment:

```text
acceptable bridge
```

`ContentGroupV1` no longer exposes `interpretation` as an active field. The bridge is intentionally narrow and should be removed later if local stale objects are no longer useful to test.

### ReadingInterpretation

Active runtime path:

```text
client/src/pages/Notes/canvasEngine/readingInterpretationService.ts
client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts
client/src/pages/Notes/canvasEngine/runtimeDataTypes.ts
```

Assessment:

```text
intentional
```

ReadingInterpretation remains the AI proposal / debug layer. It is not the old ContentGroup interpretation field.

### Server source_quote_interpretation template

Active runtime path:

```text
server/src/services/compositionTemplates.ts
server/src/services/domainPackages.ts
server/src/__tests__/v2MaterialLibrary.test.ts
```

Assessment:

```text
not related to ContentGroup identity debt
```

This is a source-grounded composition template name and does not revive the retired ContentGroup `interpretation` field.

## Residual Risk

1. Existing Vite chunk warnings remain unrelated technical debt.
2. The ContentGroup identity UI has only non-browser verification in this pass; Henry manual testing should still exercise the right-side panel workflow.
3. The stale local interpretation bridge is useful for tests, but should not become a long-term adapter.
4. ContentGroupIndex / Group Index remains deliberately parked as a design draft. It should not be implemented until ContentGroup role / identity rules settle.

## Recommendation

The branch is ready to move past the cleanup / hardening / identity seed goal.

Next technical step should be either:

- Henry manual test of ContentGroup identity controls; or
- a focused V2.BN.8.6.11 design review without implementation; or
- start the next concrete runtime seed after confirming ContentGroup identity UX is acceptable.
