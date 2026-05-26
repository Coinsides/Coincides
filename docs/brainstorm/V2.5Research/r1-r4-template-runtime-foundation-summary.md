# R1-R4 Summary - Template Runtime Foundation

**Created**: 2026-05-23
**Status**: Stage summary after R1-R4
**Scope**: Current v2.5 research findings before R5/R6

---

## 1. Source Reports

This summary condenses:

- `r1-template-definition-runtime.md`
- `r2-legacy-noteblock-compatibility.md`
- `r3-template-field-schema.md`
- `r4-render-hints-and-display-modes.md`

These reports cover the first half of the v2.5.0 runtime foundation:

```text
TemplateDefinition identity
Legacy NoteBlock compatibility
Field schema and validation
Render hints and display modes
```

They do not yet fully settle:

```text
source_behavior
relation_behavior
proposal_behavior
summary_for_agent
```

Those belong to R5/R6.

---

## 2. Main Finding

v2.5 should not begin with the user-facing template editor.

The correct first move is:

```text
TemplateDefinition Runtime
  -> persistent template definitions
  -> seed import from v2.1.1 static registry
  -> runtime resolver
  -> legacy compatibility report
  -> field_schema
  -> render_hints
  -> safe creation / soft legacy reading
```

This gives Coincides durable template infrastructure before letting users freely edit templates.

---

## 3. What Is Now Settled

### 3.1 TemplateDefinition Is A Runtime Contract

`TemplateDefinition` is not a `NoteBlock`, not a `CanvasNode`, and not a final visual style.

It is the reusable contract that defines:

- expected content fields;
- validation rules;
- default content;
- display intent;
- compatibility with legacy `block_type`;
- future source behavior;
- future relation behavior;
- future proposal behavior;
- future AI selection behavior.

### 3.2 v2.5.0 Needs A Core Table

The central v2.5.0 table should be:

```text
template_definitions
```

Recommended field categories:

```text
id
user_id
template_key
version
origin
scope_type
scope_id
label
description
system_type
learning_role
field_schema
default_content
render_hints
source_behavior
relation_behavior
proposal_behavior
summary_for_agent
legacy_block_type
status
is_system
metadata
created_at
updated_at
```

R1-R4 strongly support this table, but R5/R6 should refine behavior fields.

### 3.3 Runtime Identity Should Use UUID + Human Key + Version

Use all three:

```text
id = runtime UUID
template_key = readable stable key, such as definition.basic
version = compatibility and migration boundary
```

Existing `metadata.template_id` remains supported. Newer metadata should prefer:

```json
{
  "template_id": "definition.basic",
  "template_key": "definition.basic",
  "template_definition_id": "uuid-if-known",
  "template_version": "1.0.0",
  "template_resolution_status": "runtime_resolved",
  "taxonomy_version": "v2.5.0"
}
```

### 3.4 Static Registry Should Become Seed Input, Not Be Deleted Immediately

The v2.1.1 static registry should be used to seed system templates into runtime storage.

Recommended transition:

```text
static registry
  -> seed template_definitions
  -> runtime resolver
  -> compatibility report
  -> later editor/package layer
```

Keep static helper logic as fallback until runtime is proven stable.

### 3.5 Legacy NoteBlocks Should Not Be Deleted Or Silently Migrated

Existing v2.1.1/v2.4 template-aware NoteBlocks are compatibility samples.

v2.5.0 should:

- keep `block_type`;
- keep existing metadata;
- preserve unknown metadata keys;
- infer templates where safe;
- report conflicts;
- avoid silent bulk rewrites.

Compatibility states should include:

```text
runtime_resolved
legacy_inferred
template_missing
template_deprecated
metadata_conflict
unknown_legacy_type
manual_review_required
```

### 3.6 v2.5.0 Needs A Compatibility Report

Recommended route concept:

```text
GET /api/templates/compatibility-report
GET /api/templates/compatibility-report?course_id=...
```

Purpose:

- prove old blocks still load;
- identify missing templates;
- identify metadata conflicts;
- collect migration evidence;
- prevent accidental destructive cleanup.

### 3.7 Field Schema Should Stay JSON, Not A Separate Table Yet

Do not create `template_fields` in v2.5.0 unless implementation proves JSON is insufficient.

Use:

```text
template_definitions.field_schema
```

R3 recommends small field kinds:

```text
text
textarea
markdown_lite
latex
code
list
checkbox
select
number
```

Reserved integration fields:

```text
source_reference
relation_target
table_lite
```

Important rule:

```text
Do not hide source truth or relation truth inside content_json.
```

### 3.8 Validation Should Be Strict For New Blocks And Soft For Old Blocks

Recommended behavior:

```text
new runtime-created content -> validate strictly
legacy content -> read softly and report warnings
AI/proposal content -> normalize with warnings
package-imported content -> preserve first, review/migrate later
```

Unknown fields should be preserved.

### 3.9 Render Hints Should Be Structured But Not Final Styling

Replace current single string `render_hint` with structured `render_hints`.

Recommended display modes:

```text
reading
editing
canvas
debug
proposal
export-aware
```

Render hints should describe display intention, not exact CSS.

CSS/view presets should own:

- final color;
- spacing;
- typography;
- borders;
- theme;
- AFFiNE/Notion-like polish.

### 3.10 Type Labels Should Become Contextual

Always-visible block type labels make the note editor feel like an engineering test page.

Recommended policy:

```text
reading mode -> hidden or subtle contextual label
editing mode -> visible in editor toolbar or inspector
canvas mode -> visible on selected/hovered node
proposal mode -> visible for review
debug mode -> always visible
```

---

## 4. What Is Not Yet Settled

R5/R6 still need to define:

- which templates allow, require, or forbid source references;
- which templates can become ObjectRelation source or target;
- which relation types templates may suggest;
- which template edits are safe direct edits;
- which template edits require proposal review;
- what `summary_for_agent` must contain;
- how AI should choose between template variants;
- how template behavior interacts with selected object command context.

So v2.5.0 can be planned structurally now, but behavior fields should not be fully locked until R5/R6 are complete.

---

## 5. Roadmap Impact

### v2.5.0: Template Definition Runtime

R1-R4 significantly sharpen v2.5.0.

v2.5.0 should include:

- `template_definitions` table;
- seed import from current static templates;
- runtime template resolver;
- legacy compatibility resolver/report;
- `field_schema`;
- `default_content`;
- structured `render_hints`;
- strict creation validation;
- soft legacy reading;
- static registry fallback;
- graph-native migration notes.

v2.5.0 should not include:

- full user-facing template editor;
- destructive legacy cleanup;
- silent migration;
- package marketplace;
- rich editor adapter;
- full visual redesign.

### v2.5.1: User-facing Template Editor Seed

v2.5.1 should depend on v2.5.0 runtime stability.

The editor must:

- edit runtime `TemplateDefinition`, not old static code;
- preserve system block type closure;
- make unsafe edits visible;
- use proposal-first migration if existing blocks are affected.

### v2.5.2: Composition / Section Template Editor Seed

Composition templates should build on:

- field schema;
- render hints;
- source/relation/proposal behavior from R5/R6;
- canvas/view projection rules.

They should not be implemented as ordinary single-block templates.

### v2.5.3: Domain Block Set + Package Manifest

Package manifests must include enough template data to recover:

- template identity;
- version;
- field schema;
- render hints;
- source/relation/proposal behavior;
- compatibility requirements.

Packages should not become executable plugins too early.

### v2.5.4: Template Proposal + Migration Proposal

R2 makes this patch more important.

Template migration proposal should handle:

- deprecated templates;
- missing template mappings;
- field schema changes;
- metadata conflicts;
- block role changes;
- proposal-first semantic migrations.

### v2.5.5: Package Studio Lite

Package Studio Lite should use the runtime template model.

It should export/import templates as structured records, not loose UI settings.

### v2.5.6: Rich NoteBlock Editor Adapter Spike

This should remain optional.

The current editor is rough, but R1-R4 show that the critical path is runtime ownership, not editor replacement.

Any adapter spike must prove:

- NoteBlock identity survives;
- template metadata survives;
- field schema survives;
- render hints do not become tool-owned;
- source markers survive;
- proposal-first semantics survive.

---

## 6. Required Reference Rule For Future v2.5 Plans

Before writing any v2.5 small-version plan, Codex should read:

- `docs/brainstorm/V2.5Research/v2.5-research-outline.md`
- this summary file;
- the research reports directly related to that small version.

For v2.5.0, required references are:

- `r1-template-definition-runtime.md`
- `r2-legacy-noteblock-compatibility.md`
- `r3-template-field-schema.md`
- `r4-render-hints-and-display-modes.md`
- R5/R6 after they are written.

For later v2.5 patches, the required references should expand to include their matching research files.

---

## 7. Graph-Native Notes

R1-R4 reinforce the current v3.x direction:

```text
NoteBlock = strong future graph node candidate
TemplateDefinition = package/config graph node candidate
Field schema = likely TemplateDefinition property or nested config
Render hints = projection/view metadata, not knowledge edge
Legacy block_type = compatibility property, not long-term semantic truth
```

Important migration evidence to collect during v2.5:

- which templates are used by real NoteBlocks;
- which fields are actually populated;
- which legacy blocks need inference;
- which render hints require specialized views;
- which old blocks cannot resolve cleanly;
- which template changes require proposals.

---

## 8. Stage Conclusion

R1-R4 make one thing clear:

```text
v2.5.0 is not the template editor version.
v2.5.0 is the template runtime safety version.
```

This is the right order. A friendly editor without runtime identity, versioning, compatibility reporting, field schema, and display contracts would create more debt than it removes.

The next decisive step is R5/R6, because source behavior, relation behavior, proposal behavior, and agent-facing summaries will complete the minimum v2.5.0 runtime contract.
