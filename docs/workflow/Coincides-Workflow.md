# Coincides Workflow

**Updated**: 2026-05-16  
**Current development branch**: `feat/v2.0-noteblock`  
**Stable branch**: `main`

This document defines how Coincides work should be planned, implemented, reviewed, and verified during the v2.x NoteBlock era.

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
- Code, schema, or behavior changes should normally go through a branch and PR once the branch workflow is fully restored.
- The earlier direct-to-`main` brainstorm edit was a one-time exception and should not define the default process.

---

## 3. Version Planning Rule

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

If the version scope changes materially, update the plan before continuing implementation.

---

## 4. Development Loop

1. **Plan**: confirm version plan, current branch, affected docs, and test matrix.
2. **Implement**: make the smallest coherent change that advances the plan.
3. **Verify**: run the relevant code, migration, API, build, and browser checks.
4. **Document**: update changelog, roadmap, architecture, data model, or release plan when the change affects them.
5. **Review**: inspect diffs for accidental unrelated edits, secrets, and stale language.
6. **Hand off**: summarize what changed, what was verified, and what still needs Henry's human validation.

For large v2 features, prefer Step-based work inside the version plan. Do not let implementation outrun the written contract.

---

## 5. Documentation Debt Rule

A Step is not complete until its documentation is aligned.

At minimum, check whether the change affects:

- `docs/releases/v2.X-plan.md`
- `docs/Coincides-Roadmap.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/PRD.md`
- `docs/workflow/*`
- changelog or release notes for the active version

Large structure changes must update the plan first. Backlog-style ideas may stay in brainstorm until they become executable.

---

## 6. Proposal Safety Rule

AI-generated structural changes must follow:

`Proposal -> Review -> Apply`

This applies to notes, cards/review projections, schedules, imports, batch edits, migrations that affect user-visible content, and any future external-agent operation.

Coincides should use factual language:

- "I found these materials."
- "I organized these structures."
- "This concept appears in these places."

Avoid judgmental or diagnostic language such as "you are weak here" or "you must learn this first" unless the user explicitly asks for diagnostic tutoring.

---

## 7. Secret Handling

- Real API keys must never be written into docs, source files, issues, PR descriptions, or screenshots.
- Docs may use neutral placeholders such as `<provider-api-key>`.
- Local development may use `.env`, app Settings, or a temporary one-time test key supplied by Henry.
- If a real key appears in a committed document, treat it as leaked and rotate/revoke it in the provider dashboard.

---

## 8. Test Responsibilities

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
- Subjective AI output quality: whether the organized notes are useful, readable, and faithful.
- UI feel and learning-product taste.
- Final acceptance of whether the feature improves study efficiency.

Docs-only changes do not require code tests, but still require link, diff, and secret checks.

---

## 9. v2 Product Direction Guardrails

Coincides is not trying to become a general AI teacher. It is a **Personal Learning Material OS / learning butler** that helps users organize material, reduce preparation cost, preserve source traceability, and form a clearer learning path.

v1 Card/Deck work is valuable as a prototype of structured learning units, but v2 should not protect the old model at the cost of product quality. The target foundation is the NoteBlock Library, with cards/review sets as projections over reusable learning fragments.
