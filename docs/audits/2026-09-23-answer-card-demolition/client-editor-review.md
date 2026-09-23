# Shared human editor: answer-card exit removal

Scope: functional / regression checks for the answer-card demolition order.

## Consumer audit before editing

- `NoteAnswerCards.tsx` was the only production caller of `editor.insertAnswer(...)` (line 53 in the inspected source).
- `NotePatchReview.tsx` consumes the same bridge, but only uses `applyPatch(...)`; its review and discard paths remain.
- `useNoteCanvasRuntimeController.ts` registers the mounted editor through `useNoteAgentHumanEditor(...)`. The hook's `history`, `createBlock`, `template`, `layouts`, and `selectBlock` options were used only by the answer-card insertion branch.
- Test consumers were `NoteAnswerCards.test.tsx`, `useNoteAgentHumanEditor.test.tsx`, and the editor registration fixture in `NotePatchReview.test.tsx`.

## Changes

- Removed `insertAnswer` from the shared editor interface and removed its entire implementation from the mounted editor hook.
- Removed only the insertion-specific options, imports, and corresponding controller call arguments.
- Kept editor registration/unregistration, the ready/flush/idle gate, revision and old-text checks, no-op acceptance, proposal provenance, rollback, and existing text-history undo/redo behavior.
- Replaced the answer insertion positive test with a negative assertion: the registered editor has no `insertAnswer` property and mounting creates no write or undo entry. The same test also checks the retained `applyPatch` entry and cleanup.
- Removed the obsolete insertion method from the `NotePatchReview` test fixture.
- No contextHint, server message projection, migration, or data files were changed in this subtask.

## Verification

Configuration reviewed before execution: `client/vitest.config.ts`, `client/vite.config.ts`, `client/test/setup.ts`. Vite uses `COINCIDES_VALIDATION_ENV_DIR`; the test process points it to the empty repository-local `.codex-tmp/answer-card-demolition-empty-env` directory. Test persistence is supplied by synthetic functions/mocks; no real provider or user database is used.

Command:

```text
npm.cmd --prefix client run test:unit -- src/pages/Notes/canvasEngine/hooks/useNoteAgentHumanEditor.test.tsx src/components/AgentPanel/NotePatchReview.test.tsx src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.test.tsx src/pages/Notes/canvasEngine/hooks/usePlacementHistory.test.tsx
```

Result: **4 test files passed, 35 tests passed, 0 failed**.

- Mounted human editor: 5 passed (including answer-exit negative assertion and patch apply/stale/no-op/rollback coverage).
- Patch review UI: 2 passed.
- Text flow history: 20 passed.
- Placement history: 8 passed.

Raw output: [client-editor-tests.log](./client-editor-tests.log).
