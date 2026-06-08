# Coincides Workflow

**Updated**: 2026-06-07
**Current development branch**: `feat/v2.0-noteblock`
**Stable branch**: `main`

This document defines how Coincides v2.x and Better Notebook (`V2.BN.x`) work moves from product intent to implementation, verification, review, and retrospective.

---

## 1. Roles

- **Product owner / PM**: Henry. Owns product direction, learning experience judgment, final acceptance, and real Windows/local validation.
- **Engineering agent**: Codex. Owns implementation, code review mindset, migrations, API contracts, tests, build verification, and documentation consistency.
- **Repository**: GitHub is the source of truth. Local folders are working copies only.

Coincides is currently developed by a one-person product team with Codex as the engineering collaborator. The workflow should still be strict enough that future contributors can join without guessing the rules.

---

## 2. Branch Policy

- `main` remains the stable historical/mainline branch.
- `feat/v2.0-noteblock` is the active v2.0 development branch.
- v2 architecture, data model, migration, API, and agent-tool changes must not be committed directly to `main` unless Henry explicitly approves a one-time exception.
- Small docs updates may be committed directly to the current development branch.
- Code, schema, or behavior changes should normally go through branch + PR once the branch workflow is fully restored.
- The earlier direct-to-`main` brainstorm edit was a one-time exception and should not define the default process.

---

## 3. Document Layers

Each document layer has a different job.

- **PRODUCT**: current product north star, audience, product commitments, design principles, and product identity.
- **PRD**: product requirements, user value, non-goals, and active product commitments.
- **Architecture**: active truth/projection/adapter boundaries.
- **Data Model**: conceptual truth layers, data ownership, and future contract candidates.
- **Roadmap**: version/phase direction, sequencing, gates, and candidate conceptual entities.
- **Product Contract Docs**: domain-specific active references such as relation design, UX inventory, implementation reality check, and agent/manual guidance.
- **Brainstorm**: open idea pool and unresolved architecture/product thinking.
- **ADR**: durable architecture decisions that should not be re-litigated every implementation step.
- **Version Plan**: current version boundary, committed scope, out-of-scope, contracts, and acceptance criteria.
- **Engineering Spec**: concrete implementation design such as real tables, fields, API routes, payloads, migrations, UI entry points, and tests.
- **Step Plan**: small executable work unit inside the current version.
- **Quality Review**: engineering quality state for code, tests, data, security, scope, and docs.
- **Experience Review**: product-experience state for UI, interaction, workflow, accessibility, density, and product fit.
- **Continuity Register**: cross-version carryover state for deferred items, risks, and decisions that must survive minor-version boundaries.
- **Changelog / Release Notes**: what changed, what was verified, and what remains open.

Roadmap does not define real tables or API endpoints. Version Plan locks the current version boundary. Engineering Spec locks implementation details.

For the Better Notebook track, `docs/Coincides-Roadmap.md` is historical foundation evidence. `docs/Coincides-Better-Notebook-Roadmap.md` is the active productization roadmap.

---

## 4. Small-Version Lifecycle

Every v2 minor version or Better Notebook version should move through this lifecycle:

```text
Product Intent / PRODUCT / PRD
  -> Active Roadmap
  -> Active Product Contract Docs
  -> ADR
  -> Version Plan
  -> Engineering Spec
  -> Step Implementation Plan
  -> Implementation
  -> Verification
  -> Quality Review
  -> Experience Review
  -> Changelog
  -> Human Acceptance
  -> Merge / Hold
  -> Retro
```

The active version can move forward only when the previous layer is clear enough for the next layer. Do not let implementation outrun the written contract.

For Better Notebook work, future `V2.BN.x` plans must use `docs/internal/Better-Notebook-Phase-Plan-Template.md` as the planning checklist. Product references, current code capability, data objects touched, UI states touched, source/relation/export/AI visibility impact, and browser smoke expectations must be named before implementation begins.

---

## 5. ADR Rule

Major architecture decisions must be recorded in `docs/decisions/ADR-xxxx-title.md` before or alongside the implementation that depends on them.

ADR is required for decisions such as:

- Course as the learning-domain root.
- Agent Memory not storing course knowledge.
- ProjectionSnapshot stability strategy.
- Source Snapshot Viewer direction.
- Typed Proposal as safety execution protocol.
- status-based trash.
- Evidence list first, evidence interpretation later.

ADR minimum structure:

```text
# ADR-xxxx: Title

Status: Proposed / Accepted / Superseded
Date: YYYY-MM-DD

## Context
## Decision
## Consequences
## Alternatives considered
```

ADR should be short. Its job is to preserve the decision, not repeat every brainstorm detail.

---

## 6. Version Plan Rule

Every v2 minor version or Better Notebook version must have a plan file before implementation begins:

```text
Historical/foundation v2.x:
  docs/releases/v2.X-plan.md

Better Notebook:
  docs/releases/V2.BN.x-plan.md
  docs/releases/V2.BN.x.y-plan.md when a sub-version is needed
```

Each plan must include:

- **Goal**: what this version must make possible.
- **Scope**: what is included.
- **Out of Scope**: what is intentionally deferred.
- **API / Contracts**: backend routes, frontend service contracts, payload shapes, and proposal contracts affected by this version.
- **Data Model**: tables, conceptual entities, migrations, and compatibility expectations.
- **Agent Tool Contract**: tool names, inputs, outputs, side effects, proposal behavior, and safety gates.
- **Migration**: how existing data is preserved, transformed, backed up, or left untouched.
- **Test Matrix**: Codex-side tests and Henry-side acceptance checks.
- **Acceptance Criteria**: the concrete bar for calling the version complete.
- **Implementation State Checklist**: the live state machine for the version.

Current version plans must be decision-complete before implementation. Future versions may remain directional in the roadmap until they become active.

Better Notebook plans must list their active references explicitly. At minimum, consider:

- `PRODUCT.md`;
- `docs/PRD.md`;
- `docs/ARCHITECTURE.md`;
- `docs/DATA_MODEL.md`;
- `docs/Coincides-Better-Notebook-Roadmap.md`;
- `docs/internal/Better-Notebook-Phase-Plan-Template.md`;
- `docs/internal/Better-Notebook-Implementation-Reality-Check.md`;
- `docs/brainstorm/BetterNoteBook Research/Better-Notebook-UX-Inventory-and-Interaction-Contract.md`;
- `docs/brainstorm/产品完善/product-improvement-issue-register.md`.

Add `docs/Coincides-Relation-Product-Design.md` when relation, connector, local graph, GraphRAG mapping, source-vs-relation boundary, or semantic edge behavior is touched.

If the version scope changes materially, update the plan before continuing implementation.

### 6.1 Implementation State Checklist Rule

Every active version plan must include an `Implementation State Checklist` near the top of the file, before long-form scope details.

The checklist is the single source of truth for the current construction state. It exists so Henry and Codex can recover progress after context loss, thread compaction, local restarts, or handoff to another agent.

The checklist must:

- use checkbox syntax (`- [ ]`, `- [x]`);
- track implementation steps, verification steps, documentation steps, human acceptance, and known follow-up issues;
- record short status notes under completed or blocked items when something material happened;
- include commit ids, PR links, or branch notes when they clarify what is already on GitHub;
- distinguish `implemented`, `verified`, `accepted`, `deferred`, and `pending commit/push`;
- be checked before any new implementation work starts;
- be updated immediately after meaningful progress, not only at the end of a release.

If chat memory and the checklist disagree, treat the checklist as the stronger state source, then verify against GitHub and local status before editing.

Do not mark an item complete just because code was written. Mark it complete only when the checklist's stated completion condition is satisfied.

---

## 6.2 Research Gate Rule

Some roadmap phases depend on research gates. These gates must be treated as active blockers, not optional reading.

When the active roadmap names a research gate:

- the phase plan must name the gate in its startup checklist;
- Codex must read the gate's outline and completed reports before writing the phase plan;
- if the gate is split into partial and full depth, the phase plan must state which depth is required;
- implementation cannot start until the required gate depth is completed or Henry explicitly accepts a narrower assumption;
- if a later research result changes an earlier phase's assumptions, update the roadmap, active plan, and affected product contract docs before implementing dependent work.

Example:

```text
PI-048 Contract Intake:
  required before Phase A6 Better Notebook Data Contract.

PI-048 Full Research:
  required before Phase G Source Reconstruction And AI Note Assembly Readiness.
```

Research gates should prevent repeated rediscovery after context compaction and should keep `PRODUCT`, PRD, architecture, data model, roadmap, and UX contracts from drifting apart.

---

## 7. Bidirectional Feedback Rule

Every active v2 minor version uses a bidirectional feedback system.

Codex provides three structured feedback surfaces after each engineering loop:

- `docs/releases/v2.X-plan.md`: progress state through the Implementation State Checklist.
- `docs/releases/v2.X-review.md`: engineering quality state.
- `docs/releases/v2.X-experience-review.md`: product experience state.

Henry provides product-side feedback after real use:

- product direction authorization;
- subjective experience acceptance;
- learning-output usefulness and faithfulness judgment;
- priority changes;
- fix-now versus defer decisions;
- push, PR, merge, release, or hold authorization.

Codex may perform the engineering inner loop automatically:

- implementation;
- tests, builds, migrations, and browser smoke;
- code review;
- scope review;
- documentation review;
- secret scan;
- checklist updates;
- quality review updates;
- experience review drafts and severity recommendations.

Codex must not bypass Henry's authorization for subjective product acceptance, priority changes, external-account actions, push/PR/merge/release decisions, or any action involving secrets or credentials.

Review and changelog files must be version-scoped. Do not create a cross-version mega-log. Heavy versions should remain readable by keeping their construction state inside their own `v2.X-*` files.

---

## 7.1 Continuity Folder Rule

All continuity files live under:

```text
docs/continuity/
```

The top-level continuity folder must expose only the project-level general continuity file plus major-version folders:

```text
docs/continuity/
  Coincides-Continuity.md
  2.x/
    v2.x-continuity.md
  3.x/
    v3.x-continuity.md
```

Do not place continuity files in `docs/releases/`.

`docs/continuity/Coincides-Continuity.md` is the project-level long-term continuity register. It is comparable in importance to roadmap, workflow, and PRD-level documents.

Major-version continuity files, such as `docs/continuity/2.x/v2.x-continuity.md`, track carryovers within one major version.

Only promote a major-version continuity item into general continuity when it affects multiple major versions, product principles, architecture direction, repeated deferred work, or a future engine candidate.

When a general continuity item links to a major-version continuity item, both records must be updated when the item is promoted, implemented, verified, closed, or superseded. If the records disagree, reconcile them before marking the active plan or review complete.

---

## 7.2 General Continuity Rule

Use `docs/continuity/Coincides-Continuity.md` for long-lived project memory:

- cross-major-version carryovers;
- product principles;
- architecture decisions;
- repeated deferred work;
- historical carryovers;
- future engine candidates;
- known risks that outlive one major version.

General continuity is not a development log, changelog, roadmap, PRD, or replacement for major-version continuity files. Ordinary implementation activity belongs in active version review files. Final version results belong in changelogs.

Codex must inspect general continuity before:

- starting major-version planning;
- starting patch-version planning;
- major architecture work;
- historical carryover work;
- resolving deferred issues;
- work that claims to close a long-lived product or engineering item.

When Codex proposes to solve a historical or deferred item, it must inspect both general continuity and the current major-version continuity file. If a solution closes or supersedes an item, update every linked continuity record in the same work loop.

---

## 7.3 Version Continuity Rule

v2.x uses a lightweight continuity register:

`docs/continuity/2.x/v2.x-continuity.md`

The continuity register exists to prevent cross-version carryover from depending on chat memory. It records only items that affect later planning or implementation, such as:

- deferred UX debt;
- deferred engineering follow-ups;
- product decisions;
- known risks;
- future-version candidates;
- unresolved questions;
- release or hold carryovers.

Continuity is not a cross-version development log. Ordinary implementation activity belongs in the active version's `v2.X-review.md`. Product experience findings belong in `v2.X-experience-review.md`. Final summaries belong in `CHANGELOG-v2.X.md`.

Each continuity item must include:

- `ID`;
- `From`;
- `Type`;
- `Status`;
- `Priority`;
- `Suggested Version`;
- `Owner`;
- `Context`;
- `Decision So Far`;
- `Next Action`.

Allowed continuity statuses:

- `OPEN`;
- `PROMOTED`;
- `DEFERRED`;
- `CLOSED`;
- `SUPERSEDED`.

At the end of each minor version, Codex must inspect the version plan, quality review, experience review, changelog, and current major-version continuity file. Any item that will affect a later version must be added to or updated in the continuity register.

At the start of each minor version, Codex must inspect the current major-version continuity register and promote relevant items into the active version plan, engineering spec, or review files. If an item is intentionally not promoted, keep it in continuity with a short reason.

---

## 7.4 Startup / Resume Protocol

Codex must run the startup/resume reading sequence before:

- starting a new minor version;
- resuming after context compaction or thread restart;
- switching agent or engineering executor;
- entering the formal implementation loop;
- continuing after a long pause where current state may be stale.

Required reading order:

1. `docs/workflow/Coincides-Workflow.md`
2. `PRODUCT.md`
3. `docs/PRD.md`
4. `docs/ARCHITECTURE.md`
5. `docs/DATA_MODEL.md`
6. active roadmap:
   - `docs/Coincides-Better-Notebook-Roadmap.md` for Better Notebook work;
   - `docs/Coincides-Roadmap.md` for historical v2.x foundation evidence or non-Better-Notebook legacy work.
7. relevant product contract docs:
   - `docs/Coincides-Relation-Product-Design.md` when relation, connector, local graph, GraphRAG mapping, or source-vs-relation boundary is touched;
   - `docs/brainstorm/BetterNoteBook Research/Better-Notebook-UX-Inventory-and-Interaction-Contract.md` when UI, UX, writing, layout, source operation, link, or interaction behavior is touched;
   - `docs/internal/Better-Notebook-Implementation-Reality-Check.md` before implementation planning;
   - `docs/brainstorm/产品完善/product-improvement-issue-register.md` when converting brainstorm items into roadmap or version scope.
8. `docs/continuity/2.x/v2.x-continuity.md` for v2.x / V2.BN work, or the matching current major-version continuity file
9. `docs/continuity/Coincides-Continuity.md` when starting patch-version planning, major-version planning, historical/deferred issue work, or major architecture work
10. active version plan:
    - `docs/releases/v2.X-plan.md` for historical/foundation versions;
    - `docs/releases/V2.BN.x-plan.md` or `docs/releases/V2.BN.x.y-plan.md` for Better Notebook versions.
11. active version engineering spec, if it exists
12. previous version plan, quality review, experience review, and changelog

After reading, Codex must briefly report:

- active version and branch;
- current checklist state;
- active roadmap and product contract docs used;
- required research gates and whether they are complete;
- relevant continuity items;
- current blockers or Henry decisions needed;
- next intended action.

If chat memory disagrees with these files, prefer the files, then verify against local git state and GitHub when network/source-of-truth rules require it.

---

## 8. Version Review File Rule

Each active minor version should maintain these files:

```text
Historical/foundation v2.x:
  docs/releases/v2.X-plan.md
  docs/releases/v2.X-engineering-spec.md
  docs/releases/v2.X-review.md
  docs/releases/v2.X-experience-review.md
  docs/releases/CHANGELOG-v2.X.md

Better Notebook:
  docs/releases/V2.BN.x-plan.md
  docs/releases/V2.BN.x-engineering-spec.md
  docs/releases/V2.BN.x-review.md
  docs/releases/V2.BN.x-experience-review.md
  docs/releases/CHANGELOG-V2.BN.x.md
```

The review file is the engineering quality state machine. It must include:

- Current Review Status;
- Code Review;
- Test / Build Review;
- Migration / Data Review;
- Scope Review;
- Security / Secret Review;
- Documentation Review;
- Development Log;
- Open Engineering Follow-ups;
- Henry Authorization Needed.

The experience review file is the product experience state machine. It must include:

- Current Experience Status;
- UI / Visual Findings;
- Interaction Findings;
- Workflow Findings;
- Product Fit Findings;
- Accessibility / Density Findings;
- Deferred UX Debt;
- Henry Acceptance / Priority Decisions.

Allowed Codex review statuses:

- `PASS`;
- `PASS_WITH_FOLLOWUP`;
- `FAIL_BLOCKER`;
- `FAIL_REWORK`;
- `DEFER_RECOMMENDED`.

Allowed Henry decision statuses:

- `ACCEPTED`;
- `REJECTED`;
- `DEFER_ACCEPTED`;
- `PRIORITY_CHANGED`;
- `RELEASE_APPROVED`;
- `HOLD`.

Plan checklist items may be checked only after the relevant quality and experience gates satisfy the item's completion condition. If quality review has a blocker, do not proceed to final Henry acceptance. If experience review has medium or low UX debt, Henry decides whether to fix in the current version or defer.

Development Log entries belong in the active version's review file. They should record only facts that help future recovery or decision-making, such as failed gates, rebase conflicts, environment blockers, auth/session issues, and defer decisions. Do not record ordinary file-by-file activity.

Small version decisions may be recorded in a `Decision Log` section inside the review file when they affect current implementation but do not deserve an ADR. Major architecture decisions still require ADRs. If a decision affects later versions, also add or update a continuity item.

---

## 9. Engineering Spec Rule

Before code implementation begins for a minor version, create an engineering spec:

```text
docs/releases/v2.X-engineering-spec.md
docs/releases/V2.BN.x-engineering-spec.md
```

The spec must define concrete implementation details:

- committed tables and mapping from conceptual entities;
- fields, relationships, indexes, and migration numbers where relevant;
- backend API routes and request/response payloads;
- frontend surfaces and user-visible states;
- agent tool contracts;
- proposal payloads and apply behavior;
- error states and recovery behavior;
- migration and rollback plan;
- test matrix and required commands;
- acceptance checklist.

The engineering spec is the handoff document an engineer or agent should be able to implement without making product decisions.

---

## 10. Step Plan Rule

A minor version should be broken into small implementation steps. Do not ask Codex to implement an entire major architecture change in one pass.

Each step should state:

- goal;
- expected files/modules likely affected;
- data/API impact;
- tests to run;
- docs to update;
- completion criteria.

A step is complete only when verification has been run and affected docs are aligned.

---

## 11. Implementation Loop

For each step:

1. Confirm branch and scope.
2. Read the active version plan's Implementation State Checklist.
3. Read the relevant plan/spec sections.
4. Read any active product contract docs named by the plan.
5. Confirm required research gates are complete or explicitly deferred.
6. Inspect the current code before editing.
7. Implement the smallest coherent change.
8. Run required verification.
9. Review the diff for unrelated edits, secrets, stale docs, and migration risk.
10. Update the Implementation State Checklist, quality review, experience review, and docs/changelog if affected.
11. Hand off what changed, what was verified, which gates passed or failed, and what still needs Henry's validation.

---

## 12. Release Gate

A minor version is not complete until these gates pass:

- Version plan complete.
- Engineering spec complete.
- Implementation complete.
- Migration verified on empty and existing data where applicable.
- API/build/tests verified.
- Browser smoke completed if UI changed.
- Quality review completed.
- Experience review completed if user-facing behavior changed.
- Agent/proposal contracts verified if AI operations changed.
- Docs updated.
- Changelog or release notes updated.
- Secret scan completed.
- Henry human acceptance completed.
- Merge or hold decision made.

If any gate fails, the version remains in progress or hold.

---

## 13. Test Matrix Template

Each active version should maintain a test matrix similar to:

| Area | Codex check | Henry check | Merge blocker |
|---|---|---|---|
| DB / migration | Empty DB and existing DB migration checks | Windows local data sanity | Yes |
| Backend API | Route smoke, payload validation, error behavior | Usually no | Yes |
| Frontend UI | Browser smoke for changed flows | UI feel and workflow acceptance | Yes if user-facing |
| Agent / Proposal | Tool schema, proposal payload, apply behavior | AI proposal usefulness and trust | Yes |
| AI output quality | Contract validity and source traceability | Real learning quality judgment | Yes for AI-facing features |
| Docs / secrets | Docs consistency and secret scan | Wording/product review | Yes |
| Windows/local | Build/run instructions if changed | Real local run | Yes for release |

Docs-only changes do not require code tests, but still require link, diff, and secret checks.

---

## 14. Documentation Debt Rule

A Step is not complete until its documentation is aligned.

At minimum, check whether the change affects:

- `docs/releases/v2.X-plan.md`
- `docs/releases/v2.X-engineering-spec.md`
- `docs/releases/v2.X-review.md`
- `docs/releases/v2.X-experience-review.md`
- `docs/releases/V2.BN.x-plan.md`
- `docs/releases/V2.BN.x-engineering-spec.md`
- `docs/releases/V2.BN.x-review.md`
- `docs/releases/V2.BN.x-experience-review.md`
- `PRODUCT.md`
- `docs/Coincides-Roadmap.md`
- `docs/Coincides-Better-Notebook-Roadmap.md`
- `docs/Coincides-Relation-Product-Design.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/internal/Better-Notebook-Phase-Plan-Template.md`
- `docs/internal/Better-Notebook-Implementation-Reality-Check.md`
- `docs/brainstorm/BetterNoteBook Research/Better-Notebook-UX-Inventory-and-Interaction-Contract.md`
- `docs/brainstorm/产品完善/product-improvement-issue-register.md`
- `docs/workflow/*`
- ADRs in `docs/decisions/*`
- changelog or release notes for the active version

Large structure changes must update the plan and usually an ADR first. Backlog-style ideas may stay in brainstorm until they become executable.

---

## 15. Proposal Safety Rule

AI-generated structural changes must follow:

`Proposal -> Review -> Apply`

This applies to notes, cards/review projections, schedules, imports, batch edits, migrations that affect user-visible content, and any future external-agent operation.

Coincides should use factual language:

- "I found these materials."
- "I organized these structures."
- "This concept appears in these places."

Avoid judgmental or diagnostic language such as "you are weak here" or "you must learn this first" unless the user explicitly asks for diagnostic tutoring.

---

## 15.1 External Tool Gate

Before adding a new dependency, package, external service, open-source tool, or hosted integration, Codex must justify why the existing stack is insufficient.

The tool review must cover:

- intended job;
- why built-in code or existing dependencies are not enough;
- license and commercial-use risk;
- maintenance status;
- Windows/local compatibility;
- package size or operational complexity;
- security and secret-handling impact;
- alternatives considered;
- rollback or removal path.

Henry must authorize new external tools before Codex adds them to source code, package manifests, setup scripts, or production workflow. Purely read-only research about a candidate tool does not require authorization, but adoption does.

---

## 16. Secret Handling

- Real API keys must never be written into docs, source files, issues, PR descriptions, or screenshots.
- Docs may use neutral placeholders such as `<provider-api-key>`.
- Local development may use `.env`, app Settings, or a temporary one-time test key supplied by Henry.
- If a real key appears in a committed document, treat it as leaked and rotate/revoke it in the provider dashboard.

---

## 17. Test Responsibilities

Codex is responsible for:

- TypeScript compile and lint/build checks when code changes.
- Backend API checks and payload validation.
- Database migration checks on empty and existing databases.
- Proposal creation/apply checks.
- Agent tool contract checks.
- Browser smoke tests for changed frontend flows.
- Documentation consistency checks and secret scans.
- Quality review and experience review drafts.

Henry is responsible for:

- Real learning workflow validation.
- Windows local run verification.
- Subjective AI output quality: whether organized notes are useful, readable, and faithful.
- UI feel and learning-product taste.
- Final acceptance of whether the feature improves study efficiency.
- Priority decisions and release/hold authorization.

---

## 18. Retro Rule

At the end of each minor version, record a short retro in the release note or a dedicated retro section:

- What worked.
- What was painful.
- Tech debt left.
- Roadmap changes.
- What should not repeat.

The retro can be short. Its purpose is to make the one-person team remember lessons without relying on chat history.

---

## 19. Product Direction Reference

Workflow should not duplicate the full product roadmap. For current product direction, use:

- `PRODUCT.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/Coincides-Better-Notebook-Roadmap.md` for the active Better Notebook productization track
- `docs/Coincides-Roadmap.md` as historical v2.x foundation evidence
- `docs/Coincides-Relation-Product-Design.md` for relation, connector, local graph, and GraphRAG boundary work
- `docs/brainstorm/BetterNoteBook Research/Better-Notebook-UX-Inventory-and-Interaction-Contract.md` for Better Notebook interaction contracts
- `docs/internal/Better-Notebook-Implementation-Reality-Check.md` for current code capability and known gaps
- `docs/brainstorm/产品完善/product-improvement-issue-register.md` for open idea pool and brainstorm anchors
- relevant ADRs in `docs/decisions/`

Workflow defines how work moves. Product docs define what Coincides becomes.
