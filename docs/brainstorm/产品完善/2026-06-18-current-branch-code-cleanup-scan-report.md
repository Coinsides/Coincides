# 2026-06-18 Current Branch Code Cleanup Scan Report

branch: `codex/v2-bn-canvas-engine`

scope: scan the current branch after V2.BN.8.6.7 ContentGroup work, focusing on technical debt, unused or transitional code, duplicated product concepts, and code that can negatively affect future Better Notebook work.

## 1. Scan Summary

The branch is buildable and the Better Notebook runtime checks are healthy, but the current codebase is carrying several overlapping prototype layers:

- old structural block/template logic;
- TextUnitGroup as a writing-layer row group;
- AnnotationSet as a label collection seed;
- child label as nested annotation semantics;
- new ContentGroup / Petal as the intended serious content package;
- ReadingInterpretation as an AI-facing seed that still references older set concepts.

The biggest cleanup need is not emergency compilation repair. The real risk is conceptual duplication: several systems can now claim to represent "a meaningful knowledge package".

## 2. Verification Signals

Commands run during this scan:

- `npm run check:canvas-runtime-boundary`
  - passed: 26 checks.
- `npm run smoke:canvas-engine-model-contract`
  - passed: 13 check groups.
- `npm run smoke:canvas-engine-performance`
  - passed: 5 scenarios, total seed time 8.59ms.
- `npm run build`
  - server TypeScript build passed.
- `npm run check:changed-file-secrets`
  - passed: 115 changed files scanned.
- `git check-ignore`
  - confirmed `server/node_modules`, `server/dist`, `server/coincides.db`, and `server/uploads` are ignored.

Current branch hygiene signal:

- `git status --short` shows 113 changed/untracked entries.
- `git diff --stat` shows 53 tracked files changed with roughly 10,808 insertions and 570 deletions, plus many untracked new files.
- This is expected for the long V2.BN.8 canvas branch, but it raises review and cleanup risk. The next cleanup pass should group changes into concept-sized commits before any risky refactor.

## 3. High Priority Debt

### 3.1 AnnotationSet Still Exists Beside ContentGroup

Evidence:

- `client/src/pages/Notes/canvasEngine/runtimeDataTypes.ts` still defines `AnnotationSetV1` and `ContentGroupV1`.
- `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts` persists both:
  - `canvas_engine_annotation_sets_v1`
  - `canvas_engine_content_groups_v1`
- `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx` still imports and can render both `AnnotationOrganizerPanel` and `ContentGroupPanel`.
- `client/src/pages/Notes/canvasEngine/panels/AnnotationOrganizerPanel.tsx` remains an active editor surface.

Impact:

- Product truth becomes unclear. A user can create an AnnotationSet and a ContentGroup for roughly the same purpose.
- Future relation work may accidentally build on AnnotationSet instead of ContentGroup.
- ReadingInterpretation still has set-related projection language, which can keep pulling the design backward.

Recommended cleanup:

- Treat AnnotationSet as legacy/transitional.
- Hide AnnotationOrganizer from normal UI after ContentGroup is stable.
- Move any useful ordering/color/collection ideas into ContentGroup or ContentGroupIndex / Group Index.
- Keep metadata reading only if needed during active prototype testing; since the product has not entered real use, clearing test data is acceptable.

Suggested timing:

- V2.BN.8.6.8 or the next ContentGroup hardening patch.

### 3.2 TextUnitGroup Is Now Mostly A Predecessor, Not A Destination

Evidence:

- `client/src/pages/Notes/canvasEngine/runtimeDataTypes.ts` still defines `TextUnitGroup`.
- `client/src/pages/Notes/canvasEngine/textUnitEditorService.ts` still owns create/rename/delete group helpers.
- `client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx` still renders row group rails and TextUnitGroup menus.
- `docs/contracts/TextFlow-Contract.md` already states TextUnitGroup should be removed or rewritten into ContentGroup.

Impact:

- It takes space in the text gutter and has already caused writing-comfort concerns.
- It competes with ContentGroup for "grouped content" meaning.
- It is tightly wired into `TextBlockProjection.tsx`, making text editing harder to reason about.

Recommended cleanup:

- Remove TextUnitGroup from always-visible writing UI.
- Keep only the useful idea: stable grouping of content ranges.
- Rebuild that ability as ContentGroup members / Petal members, not as a separate TextUnitGroup product object.

Suggested timing:

- Same cleanup wave as AnnotationSet retirement.

### 3.3 Child Label Semantics Should Retreat Behind Petal

Evidence:

- `client/src/pages/Notes/canvasEngine/panels/AnnotationInspectorPanel.tsx` still exposes child label wording and workflows.
- `client/src/pages/Notes/canvasEngine/annotationHierarchyService.ts` still contains legacy parent/child correction logic.
- ContentGroup now has Petals, which better match "local part inside a serious content package".

Impact:

- Child labels make annotations look like semantic containers, but the new direction says annotation is mostly highlight/label surface.
- This creates two internal-part mechanisms: child label and Petal.

Recommended cleanup:

- Do not expand child label as a long-term feature.
- Keep reading old child labels only as prototype compatibility.
- Move internal knowledge parts to `ContentGroupPetalV1`.

Suggested timing:

- Fold into the ContentGroup / AnnotationSet / TextUnitGroup cleanup wave.

### 3.4 Legacy Structural Block Templates Still Drive Runtime Creation

Evidence:

- `server/src/lib/noteBlockTemplates.ts` still includes `definition.basic`, `theorem.basic`, `proof.basic`, `formula.math`, `exercise.general`, `answer.general`, and `code.snippet`.
- The same file still labels code as `Code Snippet`, even though the product direction now prefers `Code`.
- `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts` still creates and converts blocks through `template.legacy_block_type`.
- `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx` still imports and renders `DefinitionBlockProjection`, `FormulaBlockProjection`, and `CodeBlockProjection`.
- `client/scripts/canvasRuntimeBoundaryCheck.mjs` still requires `DefinitionBlockProjection.tsx`, `FormulaBlockProjection.tsx`, and `CodeBlockProjection.tsx` to exist.

Impact:

- Old block-type thinking can re-enter through insert/template paths.
- Definition and theorem as special block families conflict with the TextFlow / ContentGroup philosophy.
- The runtime boundary check now protects some files that are no longer durable product commitments.

Recommended cleanup:

- Retire Definition block from normal creation paths first.
- Downgrade theorem/proof/example/exercise block templates into TextFlow/ContentGroup roles or importer suggestions.
- Keep Code and Formula as display-capable blocks only where standalone rendering is truly needed.
- Rename `Code Snippet` to `Code`.
- Update boundary checks so old projection files are not required as long-term runtime foundation.

Suggested timing:

- V2.BN.8.6.8 for hiding/removing creation paths.
- V2.BN.8.7+ for deeper block/template model simplification.

### 3.5 Advanced Insert Still Keeps Fixed Block-Type UX Alive

Evidence:

- `client/src/pages/Notes/canvasEngine/hooks/useFloatingOverlayController.ts` still manages `showAdvancedInsert`.
- `client/src/pages/Notes/canvasEngine/layers/NoteFloatingPanelLayer.tsx` still receives `insertTemplateGroups`.
- `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts` still builds `insertTemplateGroups` and `insertTemplateOptions`.

Impact:

- The insert surface can keep suggesting that fixed block families are the core model.
- It increases mental overhead while slash/context menu and TextFlow-first operations are becoming the primary path.

Recommended cleanup:

- Hide Advanced Insert from the normal UI.
- Keep the data adapter helpers only until block creation has a cleaner TextFlow-first path.
- Replace fixed template insertion with command-surface actions that create TextFlow rows, inline structures, or ContentGroups.

Suggested timing:

- Small cleanup patch before V2.BN.8.7.

## 4. Medium Priority Maintainability Debt

### 4.1 TextBlockProjection Is Carrying Too Many Jobs

Evidence:

- `client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx` is about 1,246 lines.
- It handles text editing, writing roles, gutter actions, annotation badges, TextUnitGroup creation, context menus, inline prompts, paste behavior, and selection interactions.

Impact:

- Small changes to selection or annotation can break text editing.
- It is difficult to test in isolation.
- It encourages adding one more interaction directly into the projection file.

Recommended cleanup:

- Split into:
  - TextFlow editor view;
  - TextUnit row view;
  - TextUnit gutter/selection controller;
  - annotation badge bridge;
  - context menu bridge.

Suggested timing:

- After ContentGroup and command surfaces settle enough to avoid churn.

### 4.2 NoteWritingSurfaceLayer Is Becoming A Panel Orchestrator

Evidence:

- `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx` is about 1,224 lines.
- It owns selection toolbar, annotation stack, annotation organizer, ContentGroup panel, context menu, prompts, block interactions, and body-level panel open state.

Impact:

- Panels compete for right-side ownership.
- Closing one surface can accidentally affect another.
- Future canvas object, media, and relation tools will increase this pressure.

Recommended cleanup:

- Create a dedicated side-surface controller for right rail ownership.
- Move panel-mode state out of writing surface rendering.
- Keep NoteWritingSurfaceLayer focused on composing the writing canvas, not owning every side panel.

### 4.3 Note Metadata Is Becoming A Prototype Database

Evidence:

- `useNoteCanvasDataAdapter.ts` stores annotations, annotation sets, content groups, reading interpretations, and proposals in note metadata.

Impact:

- Metadata saves can collide.
- Large notes may carry bulky payloads.
- It will be hard to migrate once ContentGroup identity/status and relation endpoints become serious.

Recommended cleanup:

- Keep metadata while these are seeds.
- Once ContentGroup stabilizes, consider dedicated server tables or a versioned notebook-object store.
- At minimum, isolate save paths and prevent unrelated metadata fields from being rewritten by stale state.

### 4.4 ReadingInterpretation Seed Is Not Yet Aligned With ContentGroup

Evidence:

- `client/src/pages/Notes/canvasEngine/readingInterpretationService.ts` is lightly referenced and still projects `AnnotationSetV1`.
- Data adapter persists `readingInterpretations`, but no mature UI uses them yet.

Impact:

- The AI interpretation layer may continue to think in AnnotationSet terms.
- The next relation layer can inherit the wrong endpoint concept.

Recommended cleanup:

- Rewrite ReadingInterpretation projection around ContentGroup / Petal / ContentGroup identity/status.
- Mark AnnotationSet projection as legacy if kept temporarily.

## 5. Lower Priority Hygiene Findings

### 5.1 Native Browser Confirmation Still Exists

Evidence:

- `client/src/components/TemplateEditor/TemplateEditorModal.tsx` uses native `confirm()`.
- No active `window.prompt()` or plain `prompt()` was found in canvas engine code during this scan.

Impact:

- Native browser dialogs break the app-owned interaction style.

Recommended cleanup:

- Replace native confirm with the existing modal/toast design language when touching Template Studio / Template Editor again.

### 5.2 Ignored Local Artifacts Are Present But Not Tracked

Evidence:

- `git check-ignore` confirms:
  - `server/node_modules/...` ignored by `node_modules/`;
  - `server/dist/...` ignored by `dist/`;
  - `server/coincides.db` ignored by `*.db`;
  - `server/uploads/...` ignored by `server/uploads/`.

Impact:

- No immediate git tracking issue.
- Local scans can still be noisy if commands do not exclude ignored directories.

Recommended cleanup:

- Continue using scoped `rg` patterns and exclude ignored/generated paths.
- No deletion required unless disk hygiene becomes an issue.

### 5.3 Large Non-Notebook Files Remain Outside This Cleanup Scope

Largest files found:

- `server/src/__tests__/v2MaterialLibrary.test.ts` around 2,430 lines.
- `client/src/pages/Courses/CourseDetail.tsx` around 2,347 lines.
- `client/src/pages/Calendar/Calendar.tsx` around 1,526 lines.
- `server/src/services/learningCanvases.ts` around 1,395 lines.
- `client/src/pages/Templates/TemplateStudio.tsx` around 1,380 lines.

Impact:

- These are maintainability debt, but they are not directly blocking V2.BN.8 ContentGroup cleanup.

Recommended cleanup:

- Do not mix these refactors into the Better Notebook branch cleanup.
- Record them as later project-wide refactor candidates.

## 6. Positive Signals

- Runtime boundary checks still pass.
- Model contract checks still pass.
- Performance smoke is healthy.
- Server build passes.
- Changed-file secret scan passes.
- Codegraph index is healthy:
  - 298 indexed files;
  - 4,361 nodes;
  - 10,721 edges.

This means cleanup can proceed intentionally instead of as emergency repair.

## 7. Recommended Cleanup Order

### Cleanup Wave A: User-Facing Legacy Retreat

Goal: stop users from reaching deprecated concepts.

Actions:

- Hide AnnotationOrganizer / AnnotationSet from normal UI.
- Hide TextUnitGroup row group UI from the text gutter.
- Hide Advanced Insert.
- Remove Definition block from creation paths.
- Rename Code Snippet to Code.

### Cleanup Wave B: Data Model Simplification

Goal: reduce duplicate semantic roots.

Actions:

- Keep AnnotationTruth as label/highlight surface.
- Keep ContentGroup as serious package.
- Move child-label meaning into Petal.
- Treat TextUnitGroup as remove/rewrite candidate.
- Treat AnnotationSet as remove/rewrite candidate.
- Update ReadingInterpretation to reference ContentGroup / Petal.

### Cleanup Wave C: Runtime Architecture Split

Goal: make future editing less fragile.

Actions:

- Split TextBlockProjection.
- Split NoteWritingSurfaceLayer side-surface ownership.
- Extract panel-orchestration state.
- Harden note metadata save boundaries or move stable objects server-side.

### Cleanup Wave D: Contract And Test Alignment

Goal: stop tests from protecting retired ideas.

Actions:

- Update `canvasRuntimeBoundaryCheck.mjs` so Definition/Formula/Code projections are not all treated as required foundation.
- Update model contract smoke to treat AnnotationSet/TextUnitGroup as legacy only.
- Add ContentGroup / Petal persistence and member behavior as the primary contract.

## 8. Immediate Next Patch Candidate

I recommend the next cleanup patch should be:

`V2.BN.8.6.8 Legacy Surface Retreat`

Minimal scope:

- Hide AnnotationSet organizer from the normal UI.
- Hide TextUnitGroup gutter rail / row group controls from the normal writing path.
- Hide Advanced Insert.
- Keep old services/types readable but not promoted.
- Update Open Issue / contracts to say these are hidden legacy seeds.
- Keep ContentGroup visible as the main serious content package.

Why this first:

- It removes user-facing confusion without a dangerous deep data migration.
- It gives ContentGroup room to become the actual model.
- It reduces the chance that later Relation work accidentally builds on AnnotationSet or TextUnitGroup.

## 9. Notes For Future Deletion

Do not delete these immediately without replacing references:

- `AnnotationSetV1`
- `AnnotationOrganizerPanel`
- `annotationEditorService` set helpers
- `TextUnitGroup`
- `textUnitEditorService` group helpers
- child-label hierarchy helpers
- Definition block projection
- Advanced Insert helpers

But these should now be considered cleanup candidates, not active product destinations.
