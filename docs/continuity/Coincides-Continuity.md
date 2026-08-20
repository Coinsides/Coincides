> **状态 (Status)**: archived
> **层 (Layer)**: 历史 / History（项目级结转登记册）
> **日期 (Updated)**: 2026-05-23
> **权威 (Authoritative)**: 否（作用域 v1–v2.x，已关闭）

# Coincides General Continuity Register

**Created**: 2026-05-21
**Updated**: 2026-05-23
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

### GC-006: v2.x must end with a Neo4j / graph-native rebuild research gate before v3.x

- [ ] Promoted into active version plan
- [ ] Implemented
- [ ] Verified
- [ ] Closed

- **ID**: `GC-006`
- **Origin**: `v2.4 research discussion / docs/brainstorm/v2.4-research_里程碑-边与图数据库节点与未来方向/relation-layer-extra-ideas.md`
- **Type**: `ARCHITECTURE_DECISION`
- **Status**: `OPEN`
- **Priority**: High
- **Applies To**: v2.x closeout, v3.x planning
- **Owner**: Henry for product/architecture direction / Codex for research and migration planning
- **Problem**: Coincides is evolving from a learning assistant into a source-grounded information-processing workspace. Its mature form likely needs graph-native storage and query capabilities. However, the current v2.x system still needs to clarify what should become graph nodes, graph edges, provenance objects, projection objects, SQL-owned business records, and package/export records before a graph database migration is safe.
- **Decision So Far**: Treat Neo4j as the main v3.x graph-native candidate, with Kuzu or embedded graph options kept as alternatives. Do not switch the v2.x source of truth away from SQLite midstream. Use v2.x to finish graph-ready semantics and collect migration evidence. Recent v2.4 evidence says CanvasNode, CanvasFrame, viewport, and canvas_layout proposal records are projection/view state, while semantic NoteBlocks and ObjectRelations are graph-truth candidates. v2.4.4 clarifies that CanvasEdge is a visual/projection connector and can be incomplete or visual-only; only an explicitly bound ObjectRelation should become a semantic graph edge candidate. RelationLayer may become graph perspective, policy, display grouping, or relationship metadata in v3.x. v2.4.5 clarifies that CommandContext, SelectedObjectScope, ToolMode, InputBinding, and AICommandContext are operation/interaction bridges. They should help users and future agents operate over graph/projection objects, but they are not themselves durable knowledge truth. v2.5 research adds the next evidence layer: `TemplateDefinition`, `CompositionTemplate`, `DomainBlockSet`, `PackageManifest`, proposals, migration proposals, package import/export, and editor adapter state have been classified in `docs/brainstorm/V2.5Research/r13-v2.5-graph-native-migration-evidence.md`. v2.5.2 adds concrete runtime evidence: `CompositionTemplate` is a graph node candidate, `CompositionInstance` may become a usage node, slot usage may become an edge or edge-like property, and `relation_blueprint` remains design intent rather than graph truth. Before v3.x begins, run a detailed internal architecture research and Neo4j rebuild planning pass covering node/edge/provenance/projection modeling, package/import/export impact, local/service deployment, and migration strategy.
- **Linked Major Continuity Items**: `V2X-018`
- **Next Checkpoint**: At v2.x closeout, create a formal v3.x graph-native rebuild research package and decide whether to run a Neo4j mirror/spike before committing to the v3.x architecture.
- **Resolution Evidence**: Pending

### GC-007: Coincides needs an AI-readable internal operating manual like a project skill

- [x] Promoted into active version plan
- [x] Implemented
- [x] Verified
- [ ] Closed

- **ID**: `GC-007`
- **Origin**: `2026-05-23 v2.5 package/template research discussion`
- **Type**: `ENGINEERING_FOLLOWUP`
- **Status**: `PARTIALLY_RESOLVED`
- **Priority**: High
- **Applies To**: v2.5+, v3.x planning
- **Owner**: Henry for product/agent direction / Codex for manual structure and maintenance
- **Problem**: Coincides is becoming an AI-operable information workspace with templates, composition templates, package manifests, source behavior, relation behavior, proposal behavior, canvas projections, and future graph-native migration rules. Future agents should not have to reverse-engineer the data model before safely extending the system. They need an explicit operating manual that works like a project skill.
- **Decision So Far**: Create an AI-readable internal operating manual that teaches future Codex/agent workers how to add or modify core extension objects safely, including `system_type`, `TemplateDefinition`, `CompositionTemplate`, `DomainBlockSet`, `PackageManifest`, template/package proposals, migration proposals, source/relation behavior, and graph-native migration notes. v2.5.0 created the first scaffold at `docs/internal/Coincides-Agent-Operating-Manual.md`, focused on TemplateDefinition runtime, resolver order, metadata, source/relation/proposal behavior boundaries, and proposal-first rules. v2.5.2 added CompositionTemplate rules for slot resolution, proposal-first apply, skipped slots, relation blueprint safety, and new-record-only mutation boundaries.
- **Linked Major Continuity Items**: `V2X-021`
- **Next Checkpoint**: Update the manual when v2.5.1+ implements template editor, CompositionTemplate, DomainBlockSet, PackageManifest, migration proposals, or package import/export behavior.
- **Resolution Evidence**: `docs/internal/Coincides-Agent-Operating-Manual.md`; v2.5 R14 development guidance: `docs/brainstorm/V2.5Research/r14-v2.5-roadmap-plan-revision-recommendations.md`

---

## Closed Items

No closed general continuity items yet.
