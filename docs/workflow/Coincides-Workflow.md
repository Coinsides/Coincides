# Coincides Workflow

**Updated**: 2026-05-19  
**Current development branch**: `feat/v2.0-noteblock`  
**Stable branch**: `main`

This document defines how Coincides v2.x work moves from product intent to implementation, verification, release, and retrospective.

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

- **PRD**: product identity, user value, and non-goals.
- **Roadmap**: version direction, sequencing, and candidate conceptual entities.
- **Brainstorm**: open idea pool and unresolved architecture/product thinking.
- **ADR**: durable architecture decisions that should not be re-litigated every implementation step.
- **Version Plan**: current version boundary, committed scope, out-of-scope, contracts, and acceptance criteria.
- **Engineering Spec**: concrete implementation design such as real tables, fields, API routes, payloads, migrations, UI entry points, and tests.
- **Step Plan**: small executable work unit inside the current version.
- **Changelog / Release Notes**: what changed, what was verified, and what remains open.

Roadmap does not define real tables or API endpoints. Version Plan locks the current version boundary. Engineering Spec locks implementation details.

---

## 4. Small-Version Lifecycle

Every v2 minor version should move through this lifecycle:

```text
Product Intent / PRD
  -> Roadmap
  -> ADR
  -> Version Plan
  -> Engineering Spec
  -> Step Implementation Plan
  -> Implementation
  -> Verification
  -> Release Notes / Changelog
  -> Human Acceptance
  -> Merge / Hold
  -> Retro
```

The active version can move forward only when the previous layer is clear enough for the next layer. Do not let implementation outrun the written contract.

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

Every v2 minor version must have a plan file before implementation begins:

`docs/releases/v2.X-plan.md`

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

Current version plans must be decision-complete before implementation. Future versions may remain directional in the roadmap until they become active.

If the version scope changes materially, update the plan before continuing implementation.

---

## 7. Engineering Spec Rule

Before code implementation begins for a minor version, create an engineering spec:

`docs/releases/v2.X-engineering-spec.md`

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

## 8. Step Plan Rule

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

## 9. Implementation Loop

For each step:

1. Confirm branch and scope.
2. Read the relevant plan/spec sections.
3. Inspect the current code before editing.
4. Implement the smallest coherent change.
5. Run required verification.
6. Review the diff for unrelated edits, secrets, stale docs, and migration risk.
7. Update docs/changelog if affected.
8. Hand off what changed, what was verified, and what still needs Henry's validation.

---

## 10. Release Gate

A minor version is not complete until these gates pass:

- Version plan complete.
- Engineering spec complete.
- Implementation complete.
- Migration verified on empty and existing data where applicable.
- API/build/tests verified.
- Browser smoke completed if UI changed.
- Agent/proposal contracts verified if AI operations changed.
- Docs updated.
- Changelog or release notes updated.
- Secret scan completed.
- Henry human acceptance completed.
- Merge or hold decision made.

If any gate fails, the version remains in progress or hold.

---

## 11. Test Matrix Template

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

## 12. Documentation Debt Rule

A Step is not complete until its documentation is aligned.

At minimum, check whether the change affects:

- `docs/releases/v2.X-plan.md`
- `docs/releases/v2.X-engineering-spec.md`
- `docs/Coincides-Roadmap.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/workflow/*`
- ADRs in `docs/decisions/*`
- changelog or release notes for the active version

Large structure changes must update the plan and usually an ADR first. Backlog-style ideas may stay in brainstorm until they become executable.

---

## 13. Proposal Safety Rule

AI-generated structural changes must follow:

`Proposal -> Review -> Apply`

This applies to notes, cards/review projections, schedules, imports, batch edits, migrations that affect user-visible content, and any future external-agent operation.

Coincides should use factual language:

- "I found these materials."
- "I organized these structures."
- "This concept appears in these places."

Avoid judgmental or diagnostic language such as "you are weak here" or "you must learn this first" unless the user explicitly asks for diagnostic tutoring.

---

## 14. Secret Handling

- Real API keys must never be written into docs, source files, issues, PR descriptions, or screenshots.
- Docs may use neutral placeholders such as `<provider-api-key>`.
- Local development may use `.env`, app Settings, or a temporary one-time test key supplied by Henry.
- If a real key appears in a committed document, treat it as leaked and rotate/revoke it in the provider dashboard.

---

## 15. Test Responsibilities

Codex is responsible for:

- TypeScript compile and lint/build checks when code changes.
- Backend API checks and payload validation.
- Database migration checks on empty and existing databases.
- Proposal creation/apply checks.
- Agent tool contract checks.
- Browser smoke tests for changed frontend flows.
- Documentation consistency checks and secret scans.

Henry is responsible for:

- Real learning workflow validation.
- Windows local run verification.
- Subjective AI output quality: whether organized notes are useful, readable, and faithful.
- UI feel and learning-product taste.
- Final acceptance of whether the feature improves study efficiency.

---

## 16. Retro Rule

At the end of each minor version, record a short retro in the release note or a dedicated retro section:

- What worked.
- What was painful.
- Tech debt left.
- Roadmap changes.
- What should not repeat.

The retro can be short. Its purpose is to make the one-person team remember lessons without relying on chat history.

---

## 17. Product Direction Reference

Workflow should not duplicate the full product roadmap. For current product direction, use:

- `docs/PRD.md`
- `docs/Coincides-Roadmap.md`
- `docs/brainstorm/v2.x-brainstorm.md`
- relevant ADRs in `docs/decisions/`

Workflow defines how work moves. Product docs define what Coincides becomes.
