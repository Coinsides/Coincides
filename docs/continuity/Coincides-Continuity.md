# Coincides General Continuity Register

**Created**: 2026-05-21
**Updated**: 2026-05-21
**Status**: Active

This file is the project-level continuity register for Coincides.

It is comparable in importance to roadmap, workflow, and PRD-level documents. It records long-lived product principles, architecture decisions, historical carryovers, and repeated deferred work that must survive across major-version boundaries.

It is not a development log, changelog, roadmap, PRD, or replacement for major-version continuity files. Current major-version carryovers belong in files such as `docs/continuity/2.x/v2.x-continuity.md`.

---

## Continuity Rules

Use this file for items that affect multiple major versions, product principles, architecture direction, repeated deferred work, or future engine candidates.

Do not add ordinary implementation activity here. Development logs belong in active version review files. Version results belong in changelogs. Current major-version carryovers belong in the matching major-version continuity folder.

When a general continuity item is promoted, implemented, verified, closed, or superseded, update this file and any linked major-version continuity items in the same work loop.

---

## Item Format

Each item must use this checklist and fixed fields:

```md
### GC-000: Title

- [ ] Promoted into active version plan
- [ ] Implemented
- [ ] Verified
- [ ] Closed

- **ID**: `GC-000`
- **Origin**: `source discussion or file`
- **Type**: `ARCHITECTURE_DECISION`
- **Status**: `OPEN`
- **Priority**: High
- **Applies To**: vX.Y+
- **Owner**: Henry for product direction / Codex for implementation
- **Problem**: ...
- **Decision So Far**: ...
- **Linked Major Continuity Items**: `V2X-000`
- **Next Checkpoint**: ...
- **Resolution Evidence**: Pending
```

Allowed statuses:

- `OPEN`
- `PROMOTED`
- `IN_PROGRESS`
- `PARTIALLY_RESOLVED`
- `DEFERRED`
- `CLOSED`
- `SUPERSEDED`

Allowed item types:

- `PRODUCT_PRINCIPLE`
- `ARCHITECTURE_DECISION`
- `ENGINEERING_FOLLOWUP`
- `UX_DEBT`
- `KNOWN_RISK`
- `MODEL_PROVIDER_DECISION`
- `FUTURE_ENGINE_CANDIDATE`
- `HISTORICAL_CARRYOVER`
- `UNRESOLVED_QUESTION`

---

## Active Items

### GC-001: NoteBlock taxonomy must separate system type, learning role, and template variant

- [x] Promoted into active version plan
- [x] Implemented
- [x] Verified
- [ ] Closed

- **ID**: `GC-001`
- **Origin**: `v2.1 discussion / docs/continuity/2.x/v2.x-continuity.md`
- **Type**: `ARCHITECTURE_DECISION`
- **Status**: `PARTIALLY_RESOLVED`
- **Priority**: High
- **Applies To**: v2.1.1, v2.2+
- **Owner**: Henry for product model / Codex for implementation
- **Problem**: Current NoteBlock `block_type` mixes editor modality and learning semantics. Examples such as `paragraph`, `definition`, `theorem`, `proof`, and `formula` are not the same kind of category.
- **Decision So Far**: Coincides should keep fixed system block types for editor capability while separating learning role and template variant for study semantics. v2.1.1 implemented the metadata seed and legacy compatibility layer.
- **Linked Major Continuity Items**: `V2X-003`
- **Next Checkpoint**: Decide whether later template-editor work needs a formal shared runtime package and richer template variant model.
- **Resolution Evidence**: v2.1.1 registry seed, manual NoteBlock metadata writes, organized note proposal metadata, v2 tests, server build, and client build.

### GC-002: Learning Block Template Engine should allow user-editable templates under fixed system block types

- [x] Promoted into active version plan
- [ ] Implemented
- [ ] Verified
- [ ] Closed

- **ID**: `GC-002`
- **Origin**: `v2.1 discussion / docs/continuity/2.x/v2.x-continuity.md`
- **Type**: `FUTURE_ENGINE_CANDIDATE`
- **Status**: `IN_PROGRESS`
- **Priority**: High
- **Applies To**: v2.1.1, v2.2+
- **Owner**: Henry for product direction / Codex for implementation
- **Problem**: Hard-coding every possible learning subtype, such as `formula.math`, `formula.mechanical_engineering`, or `example.chemistry`, would create large maintenance and testing cost.
- **Decision So Far**: System block types should remain fixed for now, but users should eventually create, copy, edit, and organize templates under those fixed types through a friendly UI and an advanced code-like path later. v2.1.1 only seeds the registry and metadata compatibility; the user-facing editor remains deferred.
- **Linked Major Continuity Items**: `V2X-003`
- **Next Checkpoint**: Reassess after the post-v2.1.1 product reference research and decide whether template editing belongs in v2.4.x or v2.5.
- **Resolution Evidence**: v2.1.1 plan/spec define the seed registry and compatibility layer; full user-editable template UI still pending.

### GC-003: Multi-provider AI proposal layer should avoid binding AI acceptance to Anthropic only

- [ ] Promoted into active version plan
- [ ] Implemented
- [ ] Verified
- [ ] Closed

- **ID**: `GC-003`
- **Origin**: `v2.1 acceptance discussion`
- **Type**: `MODEL_PROVIDER_DECISION`
- **Status**: `OPEN`
- **Priority**: Medium
- **Applies To**: v2.1.1 or later
- **Owner**: Henry for provider authorization / Codex for implementation
- **Problem**: v2.1 organized note proposal quality should not be accepted only through Anthropic if Henry wants to test DeepSeek, Qwen, OpenRouter, or other providers.
- **Decision So Far**: Keep Voyage embedding separate. Consider a lightweight proposal provider adapter before broad model evaluation.
- **Linked Major Continuity Items**: None yet
- **Next Checkpoint**: Decide whether multi-provider proposal support belongs in v2.1.1 or a later provider patch.
- **Resolution Evidence**: Pending

### GC-004: AFFiNE / BlockSuite should be architecture reference first, not immediate dependency

- [ ] Promoted into active version plan
- [ ] Implemented
- [ ] Verified
- [ ] Closed

- **ID**: `GC-004`
- **Origin**: `v2.1 AFFiNE / BlockSuite discussion`
- **Type**: `FUTURE_ENGINE_CANDIDATE`
- **Status**: `OPEN`
- **Priority**: Medium
- **Applies To**: v2.2, v2.3+
- **Owner**: Henry for product direction / Codex for technical spike
- **Problem**: AFFiNE and BlockSuite have mature block, canvas, document, and database architecture, but directly importing them could turn Coincides into an editor-platform migration instead of a learning-system release.
- **Decision So Far**: Treat BlockSuite as reference for schema, block tree, editor runtime, and document/canvas thinking. Do not add it as an immediate v2.1 dependency.
- **Linked Major Continuity Items**: None yet
- **Next Checkpoint**: Consider a technical spike before Source Snapshot Viewer or canvas-like learning map work.
- **Resolution Evidence**: Pending

### GC-005: Coincides should evolve toward a source-grounded learning workspace, not a generic Notion clone

- [ ] Promoted into active version plan
- [ ] Implemented
- [ ] Verified
- [ ] Closed

- **ID**: `GC-005`
- **Origin**: `v2.1 product direction discussion`
- **Type**: `PRODUCT_PRINCIPLE`
- **Status**: `OPEN`
- **Priority**: High
- **Applies To**: v2.1+
- **Owner**: Henry for product principle / Codex for scope control
- **Problem**: Coincides can borrow from mature block editors, but its durable advantage is source-grounded learning structure, not generic document editing.
- **Decision So Far**: Preserve proposal-first AI, source references, course-rooted material structure, and learning-role semantics as core product principles.
- **Linked Major Continuity Items**: None yet
- **Next Checkpoint**: Ensure v2.1.1 template engine and later v2.x plans reinforce learning semantics rather than copying generic block editor taxonomy.
- **Resolution Evidence**: Pending

---

## Closed Items

No closed general continuity items yet.
