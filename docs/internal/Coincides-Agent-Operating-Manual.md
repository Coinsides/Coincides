> **状态 (Status)**: draft
> **层 (Layer)**: 内部 / Internal（agent 施工手册；**正文已知脱节**）
> **日期 (Updated)**: 2026-05（v2.5.0 scaffold）（状态头补于 2026-08-19 文档分诊止血批次）
> **权威 (Authoritative)**: 否（2026-08-19 降级）

> **⚠️ 脱节公告 (2026-08-19)**：本手册成于 v2.5.0，其 proposal-first 与 `ObjectRelation` 口径已与 V11 后的真相层不符。**更重要的是它的继任者已在路上**：V2.BN.12 必修① 要把操作暴露为 **MCP 工具面 + 守卫 + 收据**（末端执行器），这份手册是那件事的文档前身。在新工具面契约落地前，本文不作为施工依据。盘点见 `docs/agent-ops/analysis/2026-08-20-doc-triage-assessment.md`。

# Coincides Agent Operating Manual

**Status**: scaffold created in v2.5.0
**Audience**: Codex and future AI agents working inside Coincides

This manual teaches agents how to extend Coincides without reverse-engineering the codebase or guessing dangerous mutation paths.

## Prime Rules

- Coincides owns truth. External editors, canvas engines, AI providers, and package formats are adapters.
- Source truth, content truth, semantic relation truth, projection state, and proposal state are separate.
- Proposal-first is mandatory for structural AI changes, source grounding changes, confirmed semantic relations, bulk migrations, package imports, and template migrations.
- Do not silently rewrite old user content.
- Do not invent template keys, system types, or relation types without a version plan and engineering spec.

## TemplateDefinition

`TemplateDefinition` is a runtime contract for a NoteBlock template.

It defines:

- content shape through `field_schema`;
- default content;
- display intent through `render_hints`;
- source expectations through `source_behavior`;
- relation eligibility through `relation_behavior`;
- proposal safety through `proposal_behavior`;
- agent guidance through `summary_for_agent`;
- legacy compatibility through `legacy_block_type`.

It is not:

- executable plugin code;
- final CSS;
- a NoteBlock;
- a CanvasNode;
- a confirmed ObjectRelation.

## Resolving A Template

Use this order:

1. `metadata.template_definition_id`
2. `metadata.template_key` + `metadata.template_version`
3. legacy `metadata.template_id`
4. legacy `block_type`
5. fallback `text.paragraph`

When creating a new manual/canvas block, unknown explicit templates should fail.

When normalizing AI proposal output, unknown templates may fallback, but the proposal must include a warning.

## Writing NoteBlock Metadata

New runtime-created NoteBlocks should include:

```json
{
  "template_id": "definition.basic",
  "template_key": "definition.basic",
  "template_definition_id": "runtime-uuid",
  "template_version": "1.0.0",
  "template_resolution_status": "runtime_resolved",
  "system_type": "text",
  "learning_role": "definition",
  "taxonomy_version": "v2.5.0"
}
```

Preserve unknown metadata keys.

## Template Studio / Editor Seed

v2.5.1 introduces Template Studio as a guided editor over `TemplateDefinition`.

Rules for agents:

- System templates are read-only. Copy them before editing.
- User templates begin as `draft`.
- Structural edits are draft-only:
  - `template_key`
  - `system_type`
  - `learning_role`
  - `legacy_block_type`
  - `field_schema`
  - `default_content`
  - `source_behavior`
  - `relation_behavior`
  - `proposal_behavior`
- Safe descriptive edits may be applied to user templates:
  - `label`
  - `description`
  - `render_hints`
  - `summary_for_agent`
  - `metadata`
- Active templates with existing NoteBlocks must not receive structural edits. Use a future migration proposal.
- Archive is allowed only when no current NoteBlocks resolve to that template. Otherwise deprecate.
- Deprecated templates remain resolvable so old NoteBlocks keep working.

Template Studio is not Package Studio, DomainBlockSet editing, CompositionTemplate editing, or a low-level `system_type` engine.

## CompositionTemplate

`CompositionTemplate` is a runtime contract for a reusable section made from multiple `TemplateDefinition` slots.

It defines:

- section identity through `composition_key` and `version`;
- slot requirements through `slot_schema`;
- canvas placement intent through `layout_behavior`;
- source expectations through `source_behavior`;
- suggested relation intent through `relation_blueprint`;
- proposal safety through `proposal_behavior`;
- agent guidance through `summary_for_agent`.

It is not:

- a larger NoteBlock;
- a confirmed ObjectRelation;
- a visual-only CanvasShape;
- a full Composition Studio document;
- executable package code.

## Using CompositionTemplate Safely

Agents may create a `composition_template` proposal when a reusable section structure is useful.

Rules for agents:

- Resolve every filled slot through runtime `TemplateDefinition`.
- Respect each slot's allowed template keys.
- Record skipped or partial slots explicitly.
- Preserve source references when provided.
- Treat `relation_blueprint` as suggested intent only.
- Apply through proposal review.

Agents must not:

- silently rewrite old NoteBlocks;
- mutate templates while applying a composition;
- create confirmed ObjectRelations from relation blueprints;
- treat skipped slots as failures if the proposal explicitly marks partial use;
- treat CompositionTemplate as graph truth.

When a composition proposal is applied, it may create:

- new NoteBlocks;
- note placements in a canvas backing note;
- CanvasNodes;
- a CanvasFrame;
- CompositionInstance and CompositionInstanceSlot records;
- operation batch metadata.

It must not mutate existing source, evidence, NoteBlock, template, CanvasEdge, or ObjectRelation truth.

## Source / Relation / Proposal Behavior

Behavior fields are policy and guidance.

- `source_behavior` does not store source truth.
- `relation_behavior` does not create ObjectRelations.
- `proposal_behavior` does not authorize mutation.

Source truth belongs in source reference, anchor, scope, snapshot, and evidence records.

Semantic relation truth belongs in `ObjectRelation`.

Canvas connectors belong in `CanvasEdge` until explicitly bound to a semantic relation.

## DomainBlockSet

`DomainBlockSet` is a runtime capability bundle for a domain such as math learning, source-grounded research, or briefing work.

It defines:

- domain identity through `domain_key` and `version`;
- aliases and facets for future domain refactoring;
- included `TemplateDefinition` memberships;
- included `CompositionTemplate` memberships;
- source, relation, and proposal behavior defaults;
- agent guidance through `summary_for_agent`.

It is not:

- a rigid taxonomy tree;
- a graph database migration;
- a package importer;
- a guarantee that every future block in that domain must use only those templates.

Agents should use a domain block set as a safe shortlist. If no domain set fits, propose a future template/domain package change instead of inventing runtime keys silently.

## PackageManifest

`PackageManifest` describes a local Coincides package as data.

It may describe:

- included domain block sets;
- included template definitions;
- included composition templates;
- style packs or relation presets as future references;
- compatibility requirements;
- trust and license metadata;
- import/export policy;
- graph-native migration hints.

It must not contain:

- executable code;
- provider API keys;
- secrets;
- hidden source documents;
- automatic mutation instructions.

v2.5.3 package preview is non-mutating. A package can be inspected and validated, but full import/export and Package Studio behavior belong to later v2.5 versions.

## Choosing Domain Packages Safely

When an agent receives a task such as "make notes for this material" or "turn this into a briefing", it should:

1. inspect available active `DomainBlockSet` records;
2. prefer the domain set whose `summary_for_agent`, facets, and included templates fit the task;
3. use included `TemplateDefinition` and `CompositionTemplate` records as allowed building blocks;
4. record uncertainty as proposal warnings;
5. avoid creating or editing package/domain/runtime records unless the active version explicitly allows it.

Domain membership rows are graph-native evidence. They are useful for future `DomainBlockSet -> TemplateDefinition` and `DomainBlockSet -> CompositionTemplate` edges, but v2.x still stores them in SQLite.

## TemplateMigrationProposal

`TemplateMigrationProposal` is the safe path for changing template identity or structure after NoteBlocks already use a template.

It exists because active templates with current usage cannot be structurally edited directly.

Agents may create a `template_migration` proposal when:

- a user wants to move blocks from one template to another;
- a template should be renamed, replaced, or succeeded by another template;
- an active template needs field, behavior, source, relation, proposal, or legacy-block compatibility changes;
- compatibility reports show a stable target template would reduce ambiguity.

Allowed migration modes:

- `alias_mapping`: record a compatibility/successor mapping only; do not mutate NoteBlocks.
- `soft_migration`: update NoteBlock template metadata only; preserve content and legacy block type.
- `hard_cascade`: update metadata, legacy block type, and mechanically safe default fields only.

Agents must not:

- rewrite NoteBlock content during template migration;
- remove user content fields through hard cascade;
- apply hard cascade when field mapping is ambiguous;
- mutate ObjectRelations or CanvasEdges as a side effect;
- treat migration history as confirmed knowledge truth.

Every applied template migration should create:

- one operation batch;
- one migration record;
- per-NoteBlock migration item records;
- before/after metadata and block-type evidence.

Do not use template migration as a hidden domain migration path. Domain movement must use `DomainRefinementProposal`.

## Domain Refinement Proposals

v2.5.6 introduces `DomainRefinementProposal` for safe domain taxonomy changes.

Agents may create a `domain_refinement` proposal when:

- a `DomainBlockSet` should be renamed or promoted;
- a broad domain should be split into clearer successor domains;
- two domains should be merged or aliased;
- a domain should be forked for a new discipline or workflow;
- a domain should be deprecated without breaking old references;
- objects need explicit current-domain classification records.

Allowed actions:

- `rename`
- `promote`
- `split`
- `merge`
- `fork`
- `deprecate`
- `reclassify`

Allowed modes:

- `alias_mapping`: record compatibility/successor mapping only; do not mutate runtime objects.
- `soft_migration`: create target domains when needed, copy safe memberships, and write explicit classification records.
- `hard_cascade`: apply only explicit, mechanically safe package/domain/classification changes.

Agents must not:

- silently move old NoteBlocks to a new domain;
- rewrite NoteBlock content;
- change source truth, uploaded files, CanvasEdges, ObjectRelations, or proposals as a side effect;
- apply ambiguous split/merge/reclassify requests without explicit object or membership mappings;
- treat `domain_key` as permanent identity;
- treat refinement history as knowledge truth.

Every applied domain refinement should create:

- one operation batch;
- one domain refinement record;
- mapping rows when using alias behavior;
- classification rows when reclassifying objects;
- before/after record items for provenance;
- recovery metadata explaining what changed and what did not.

`domain_object_classifications` should be read as current assignment evidence, not as an immutable truth statement. Future graph-native work may represent these as classification edges between content/capability nodes and domain nodes.

## .coincides Package Bundles

v2.5.5 introduces `.coincides` JSON bundles for safe runtime package portability.

The bundle format is data-only:

```json
{
  "package_format": "coincides.package.bundle",
  "bundle_version": "v2.5.5",
  "package_level": "light",
  "source_inclusion": "omit",
  "manifest": {},
  "contents": {
    "template_definitions": [],
    "composition_templates": [],
    "domain_block_sets": [],
    "domain_template_memberships": [],
    "domain_composition_memberships": [],
    "source_references": [],
    "source_snapshots": []
  },
  "integrity": {
    "content_hash": "sha256:...",
    "exported_at": "..."
  }
}
```

Package levels:

- `light`: exports package manifest, templates, compositions, domain sets, and memberships.
- `trusted`: may additionally include source reference metadata or source snapshot text.

Source inclusion:

- `omit`: no source metadata.
- `reference_only`: source reference metadata only.
- `snapshot_text`: source snapshot text as recovery material only.

Agents must not put the following into package bundles:

- provider API keys;
- passwords or tokens;
- executable code;
- hidden scripts;
- original uploaded files;
- full project backups.

## Package Import / Export Safety

Package export preview must not mutate runtime records.

Package import preview must detect:

- unsupported format or version;
- secret-like keys;
- executable package content;
- same key/version with different content;
- missing required template or composition references.

Package import apply may create:

- missing `PackageManifest` records;
- missing `TemplateDefinition` records;
- missing `CompositionTemplate` records;
- missing `DomainBlockSet` records;
- missing domain membership rows;
- one operation batch;
- import record and item rows.

Package import apply must not:

- overwrite existing runtime objects;
- mutate old NoteBlocks;
- mutate sources or source snapshots;
- mutate CanvasNodes, CanvasEdges, ObjectRelations, proposals, or template migration records;
- turn source snapshot text into live source truth.

Exact existing objects should resolve as existing. Different content with the same key/version is a blocker.

Source references and source snapshot text in Trusted packages are recovery evidence only in v2.5.5.

## Future Manual Sections

Later v2.5.x versions should add:

- Rich editor adapter boundaries.
- v3.x graph-native migration notes.
