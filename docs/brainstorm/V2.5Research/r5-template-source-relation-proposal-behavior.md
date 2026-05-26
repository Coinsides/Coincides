# R5 - Template Source / Relation / Proposal Behavior

**Created**: 2026-05-23
**Status**: Research complete for Batch 2C
**Scope**: v2.5.0 behavior contract for TemplateDefinition runtime

---

## 1. Executive Summary

v2.5.0 templates must become behavior-aware, not merely visual or field-aware.

The key runtime question is:

```text
What is this template allowed to do with source references, ObjectRelations, and proposals?
```

Recommended v2.5.0 direction:

- Add structured `source_behavior`, `relation_behavior`, and `proposal_behavior` JSON to `TemplateDefinition`.
- Keep source truth in source tables such as `note_block_sources`, `SourceAnchor`, and `SourceScope`, not hidden inside `content_json`.
- Keep semantic relation truth in `ObjectRelation`, not inside CanvasEdge geometry or template fields.
- Keep AI structural changes proposal-first.
- Use behavior metadata to guide validation, proposal warnings, AI selection, and migration safety.

This completes the non-AI behavior side of the v2.5.0 runtime contract.

---

## 2. Current Implementation Facts

Current template registry has:

```text
source_reference_allowed: boolean
```

In the current seed registry, this is effectively too broad: all seeded templates allow source references.

Current source grounding exists through:

- `note_block_sources`;
- organized note proposal `source_references`;
- `SourceSnapshot`;
- `SourceAnchor`;
- `SourceScope`;
- `SourceBoard`;
- jump-back behavior.

Current relation infrastructure exists through v2.4.4:

- `CanvasEdge` = projection / visual connector;
- `ObjectRelation` = semantic edge candidate;
- `RelationLayer` = relation grouping / visibility layer.

Seed relation types include:

```text
uses_definition
uses_formula
example_of
answers
supports
contradicts
read_before
derives_to
source_supports
```

Current command infrastructure exists through v2.4.5:

- selected object scope;
- read-only command context;
- `AICommandContext` seed;
- proposal-first rule for layout generation, AI relation generation, and content generation.

The missing layer is that templates do not yet declare how they should behave inside these systems.

---

## 3. Behavior Principle

Template behavior should answer:

```text
Does this template need source grounding?
Can this template participate in semantic relations?
Which relation types make sense?
Can this template be directly edited?
When does a change need proposal review?
What should AI be allowed to do with it?
```

Template behavior should not:

```text
Store source truth inside content_json.
Store semantic relation truth inside content_json.
Treat CanvasEdge geometry as verified semantic relation.
Let AI directly rewrite source-grounded content without proposal review.
Turn templates into executable plugins.
```

---

## 4. Recommended source_behavior Shape

Recommended JSON shape:

```json
{
  "policy": "recommended",
  "allowed_target_types": [
    "note_block_source",
    "source_anchor",
    "source_scope",
    "source_snapshot_page",
    "document_chunk"
  ],
  "preferred_granularity": "source_anchor",
  "minimum_required_references": 0,
  "missing_source_behavior": "warn",
  "proposal_generation": {
    "require_source_for_ai_generated": true,
    "allow_deterministic_without_source": false
  },
  "display": {
    "show_source_badge": "contextual",
    "allow_jump_back": true
  },
  "metadata": {}
}
```

Recommended `policy` values:

```text
forbidden
allowed
recommended
required
source_is_content
```

Meaning:

- `forbidden`: source references do not make sense for this template.
- `allowed`: source references are optional.
- `recommended`: source references should exist when generated from material.
- `required`: new AI/proposal-created blocks should not apply without source evidence.
- `source_is_content`: the block is itself a source quote/excerpt.

Recommended `preferred_granularity` values:

```text
document
page
page_range
chunk
source_anchor
source_scope
material_segment
evidence_set
```

Recommended `missing_source_behavior` values:

```text
allow
warn
proposal_warning
block_apply
manual_review_required
```

Important v2.5.0 rule:

```text
source_behavior describes source expectations.
It does not create source references by itself.
```

---

## 5. Recommended relation_behavior Shape

Recommended JSON shape:

```json
{
  "endpoint_policy": "both",
  "allowed_as_source_for": [
    "uses_definition",
    "uses_formula",
    "example_of",
    "answers",
    "supports",
    "contradicts",
    "read_before",
    "derives_to",
    "source_supports"
  ],
  "allowed_as_target_for": [
    "uses_definition",
    "uses_formula",
    "example_of",
    "answers",
    "supports",
    "contradicts",
    "read_before",
    "derives_to",
    "source_supports"
  ],
  "suggested_relation_types": [
    "read_before"
  ],
  "default_layer_kind": "learning_logic",
  "ai_suggestable": true,
  "requires_human_confirmation": true,
  "visibility_default": "visible",
  "metadata": {}
}
```

Recommended `endpoint_policy` values:

```text
none
source_only
target_only
both
source_evidence_only
```

Rules:

- `none`: template should not become a semantic relation endpoint.
- `source_only`: can point to other objects.
- `target_only`: can be pointed to.
- `both`: can be either side.
- `source_evidence_only`: should mainly support evidence/source relations.

Important v2.5.0 rule:

```text
relation_behavior describes eligibility.
ObjectRelation stores accepted semantic truth.
CanvasEdge stores visual/projection connector state.
```

---

## 6. Recommended proposal_behavior Shape

Recommended JSON shape:

```json
{
  "direct_create_allowed": true,
  "direct_user_edit_allowed": true,
  "direct_edit_allowed_fields": ["body"],
  "proposal_required_for": [
    "ai_generated_content",
    "template_migration",
    "source_required_content_without_source",
    "relation_generation",
    "bulk_rewrite"
  ],
  "ai_generation_allowed": true,
  "ai_rewrite_allowed": "proposal_only",
  "migration_policy": "proposal_required_if_existing_blocks",
  "apply_warnings": [],
  "metadata": {}
}
```

Recommended `ai_rewrite_allowed` values:

```text
forbidden
direct_if_user_selected
proposal_only
```

Recommended migration policy values:

```text
direct_safe
proposal_required_if_existing_blocks
proposal_required_always
manual_only
```

Important v2.5.0 rule:

```text
User direct typing can stay direct.
AI-generated structural or semantic changes should remain proposal-first.
```

---

## 7. Seed Behavior By Template Family

### text.paragraph

Recommended:

- source policy: `allowed` or `recommended`;
- relation endpoint: `both`;
- suggested relation: `read_before`, `supports`;
- direct user edit: allowed;
- AI rewrite: proposal-only when generated from source material.

### text.heading

Recommended:

- source policy: `allowed`;
- relation endpoint: `source_only` or `both` for reading order;
- suggested relation: `read_before`;
- direct user edit: allowed;
- semantic migration: proposal-required if changing heading role across many blocks.

### concept.basic

Recommended:

- source policy: `recommended`;
- relation endpoint: `both`;
- suggested relation: `uses_definition`, `supports`, `read_before`;
- AI-generated concept blocks should carry source references when source material exists.

### definition.basic

Recommended:

- source policy: `recommended`, or `required` for AI-generated source-grounded notes;
- relation endpoint: `target_only` or `both`;
- suggested relation: `uses_definition`, `source_supports`;
- direct text edit allowed by user;
- AI rewrite proposal-only.

### theorem.basic

Recommended:

- source policy: `recommended`;
- relation endpoint: `both`;
- suggested relation: `supports`, `derives_to`, `read_before`;
- relation generation proposal-first.

### proof.basic

Recommended:

- source policy: `recommended`;
- relation endpoint: `both`;
- suggested relation: `derives_to`, `supports`, `uses_definition`, `uses_formula`;
- AI rewrite proposal-only.

### formula.math

Recommended:

- source policy: `recommended`;
- relation endpoint: `both`;
- suggested relation: `uses_formula`, `derives_to`, `supports`;
- long formula display should warn if canvas node is too narrow;
- AI rewrite proposal-only unless user directly edits selected formula text.

### example.general

Recommended:

- source policy: `recommended`;
- relation endpoint: `source_only` or `both`;
- suggested relation: `example_of`, `uses_formula`, `uses_definition`;
- generated examples should preserve source references or explicit "constructed example" warning.

### exercise.general

Recommended:

- source policy: `allowed` or `recommended`;
- relation endpoint: `source_only` or `both`;
- suggested relation: `answers`, `uses_formula`, `uses_definition`;
- answer linkage should be semantic relation, not hidden text.

### answer.general

Recommended:

- source policy: `allowed`;
- relation endpoint: `target_only` or `both`;
- suggested relation: `answers`, `supports`;
- AI generated answers should be proposal-first and clearly source/warning tagged.

### source.quote

Recommended:

- source policy: `source_is_content`;
- relation endpoint: `source_evidence_only`;
- suggested relation: `source_supports`, `supports`, `contradicts`;
- missing source should block apply or require manual review.

### warning.callout

Recommended:

- source policy: `allowed`;
- relation endpoint: `both`;
- suggested relation: `supports`, `contradicts`, `read_before`;
- direct user edit allowed.

### code.snippet

Recommended:

- source policy: `allowed` or `recommended`;
- relation endpoint: `both`;
- suggested relation: `supports`, `example_of`, `read_before`;
- execution is out of scope; code is content, not executable behavior.

---

## 8. Direct Edit Versus Proposal-Required Changes

Recommended direct-safe changes:

- user typing in a block field;
- user changing title;
- user moving/resizing CanvasNode;
- user drawing a visual-only CanvasEdge;
- user manually binding a complete CanvasEdge into ObjectRelation;
- user adding optional source reference when allowed.

Recommended proposal-required changes:

- AI-generated content;
- AI relation generation;
- AI layout generation;
- bulk template migration;
- changing template behavior for existing blocks;
- converting a block to a template with different learning role;
- adding/removing required source behavior for existing content;
- semantic relation extraction across many blocks;
- source quote without source;
- migration that changes field schema meaning.

Important rule:

```text
Proposal-first protects semantic and source-grounded truth.
It should not block ordinary user writing.
```

---

## 9. v2.5.0 Implementation Boundary

v2.5.0 should implement:

- `source_behavior`, `relation_behavior`, and `proposal_behavior` fields on runtime templates;
- seed behavior for existing built-in templates;
- runtime resolver that returns behavior metadata;
- compatibility report warnings for missing or unsafe behavior;
- proposal creation helpers that can inspect template behavior;
- tests that behavior metadata does not mutate source/relation truth by itself.

v2.5.0 should not implement:

- automatic relation extraction;
- AI relation proposal;
- full template editor behavior UI;
- source behavior editor;
- relation behavior editor;
- executable plugin behavior;
- automatic source insertion into old blocks;
- automatic migration of all legacy blocks.

---

## 10. Test Plan

Required tests:

- seed templates include valid source/relation/proposal behavior objects;
- runtime template API returns behavior metadata;
- source-required template warns or blocks proposal apply when source is missing, depending on policy;
- source behavior never writes source references by itself;
- relation behavior does not create ObjectRelation by itself;
- incomplete CanvasEdge remains unable to bind semantic relation;
- template relation eligibility can reject unsupported relation type in validation/proposal preview;
- proposal behavior marks AI content generation as proposal-required;
- direct user editing remains allowed for safe fields;
- compatibility report flags legacy blocks with missing behavior metadata.

---

## 11. Graph-Native Migration Notes

Template behavior is graph-relevant but not graph truth.

Possible future graph interpretation:

```text
(TemplateDefinition)-[:ALLOWS_RELATION_TYPE]->(RelationType)
(NoteBlock)-[:USES_TEMPLATE]->(TemplateDefinition)
(ObjectRelation)-[:HAS_TYPE]->(RelationType)
```

But in v2.5, behavior should remain JSON on `TemplateDefinition`.

Migration evidence to collect:

- which templates actually produce source-backed blocks;
- which templates participate in accepted ObjectRelations;
- which relation types are common;
- which source policies cause warnings;
- which proposal-required operations users accept or reject.

---

## 12. R5 Conclusion

The core behavior contract is:

```text
source_behavior tells what source grounding is expected.
relation_behavior tells what semantic relations are allowed.
proposal_behavior tells what changes must be reviewed.
```

This lets templates become operational infrastructure without letting them own source truth, relation truth, or unchecked AI mutations.
