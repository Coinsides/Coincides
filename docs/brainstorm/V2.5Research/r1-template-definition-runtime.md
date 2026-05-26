# R1 - TemplateDefinition Runtime Model

**Created**: 2026-05-23
**Status**: Research complete for Batch 2A
**Scope**: v2.5.0 TemplateDefinition runtime foundation

---

## 1. Executive Summary

v2.5.0 should turn the current v2.1.1 static NoteBlock template registry into a durable, queryable, versioned `TemplateDefinition` runtime.

The important distinction is:

```text
TemplateDefinition = how a kind of block should be structured, rendered, validated, sourced, related, and explained to AI
NoteBlock = actual user/course content
CanvasNode = visual projection of an object on a canvas
ObjectRelation = semantic relation between real objects
```

So `TemplateDefinition` is not a replacement for `NoteBlock`. It is the reusable contract that tells Coincides how to create, display, validate, migrate, package, and let agents reason over NoteBlocks.

Recommended v2.5.0 direction:

- Add a persistent runtime table for template definitions.
- Seed it from the existing v2.1.1 static registry.
- Keep the static registry as fallback until v2.5 runtime is proven stable.
- Keep `template_id` / `template_key` human-readable for compatibility, but introduce a stable runtime UUID.
- Add versioning from the start.
- Do not build the full user template editor in v2.5.0.

---

## 2. Current Implementation Facts

The current system already has a useful seed, but it is still static code:

- Static registry lives in `server/src/lib/noteBlockTemplates.ts`.
- A mirrored version exists in `shared/types/index.ts`.
- Current taxonomy version is `v2.1.1`.
- Current system types:

```text
text
latex
code
source_quote
task
media
table
```

- Current learning roles:

```text
note
concept
definition
theorem
proof
formula
example
exercise
answer
warning
source
```

- Current seed templates include:

```text
text.paragraph
text.heading
concept.basic
definition.basic
theorem.basic
proof.basic
formula.math
example.general
exercise.general
answer.general
source.quote
warning.callout
code.snippet
```

The static helper layer already provides:

- list templates;
- get template by id;
- infer metadata from legacy `block_type`;
- normalize metadata;
- merge metadata without deleting unknown metadata keys;
- resolve legacy `block_type` for a template.

v2.4.2 Canvas block insertion depends on this static registry. It creates a real `NoteBlock`, writes template metadata, then creates a `CanvasNode` projection.

This proves the model direction is right, but it also shows the current ceiling: templates cannot yet be edited, versioned, packaged, audited, migrated, or queried as product data.

---

## 3. What A Runtime Template Must Be

A runtime `TemplateDefinition` should be a durable product object, but not ordinary learning content.

It should answer:

- What content fields does this block expect?
- What system type does it require?
- What learning or domain role does it represent?
- How should it render in reading/editing/canvas/debug contexts?
- Does it allow source references?
- Can it participate in semantic relations?
- Can proposals create or migrate it?
- What should an agent know before selecting it?
- Which version of the template did an existing block use?

This is bigger than a UI template. It is a behavior contract.

---

## 4. Recommended Runtime Entity

Recommended table for v2.5.0:

```text
template_definitions
```

Recommended fields:

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

Field meaning:

- `id`: runtime UUID. This is the stable database identity.
- `template_key`: human-readable stable key, such as `definition.basic`.
- `version`: template version. Start simple, but do not omit it.
- `origin`: where this template came from.
- `scope_type`: where this template is valid.
- `scope_id`: nullable pointer for workspace/course/package scope.
- `field_schema`: structured field model.
- `default_content`: initial content JSON for new blocks.
- `render_hints`: display hints, not final CSS.
- `source_behavior`: whether sources are allowed, required, recommended, or forbidden.
- `relation_behavior`: relation eligibility and suggested relation types.
- `proposal_behavior`: direct edit versus proposal-first behavior.
- `summary_for_agent`: short machine-readable explanation for AI selection.
- `legacy_block_type`: compatibility bridge to current `note_blocks.block_type`.
- `status`: lifecycle state.
- `is_system`: marks built-in seed templates.
- `metadata`: future-compatible extension area.

Recommended `origin` values:

```text
system_seed
user
course
package
imported
```

Recommended `scope_type` values:

```text
system
workspace
course
package
```

Recommended `status` values:

```text
draft
active
deprecated
archived
superseded
```

Important rule:

```text
status = system_seed should not be a status.
```

`system_seed` is an origin. A system seed template can still be `active`, `deprecated`, or `superseded`.

---

## 5. Identity: UUID Plus Template Key

Do not choose only one of these:

```text
UUID-only runtime identity
human-readable template_id-only identity
```

Use both.

Recommended model:

```text
id = runtime database identity
template_key = stable readable key
version = compatibility and migration boundary
```

Why:

- Existing NoteBlocks already store `metadata.template_id`.
- Existing UI and tests understand keys like `definition.basic`.
- Future packages need readable manifest references.
- But user-created templates and imported packages need collision-safe identity.

Recommended v2.5.0 compatibility:

```json
{
  "template_id": "definition.basic",
  "template_key": "definition.basic",
  "template_definition_id": "uuid-if-known",
  "template_version": "1.0.0",
  "taxonomy_version": "v2.5.0"
}
```

Do not require all old blocks to have all fields immediately. The resolver should fill gaps at read time.

---

## 6. Versioning Model

Template edits can change meaning. Therefore, template versioning must exist before user editing.

Recommended v2.5.0 rule:

- Built-in seed templates start at version `1.0.0`.
- A template version should not be silently mutated if existing NoteBlocks depend on it.
- Safe copy edits can happen only when they do not change field meaning, source behavior, relation behavior, or proposal behavior.
- Meaning-changing edits create a new version or require a migration proposal.

Examples:

```text
Renaming label "Definition" -> "Definition"
  safe no-op

Changing display label "Callout" -> "Warning"
  possibly safe if behavior is unchanged

Changing definition.basic from text field to term/body/source fields
  versioned change or migration proposal

Changing formula.math from latex to text
  not direct-safe
```

For v2.5.0, use simple semantic strings, not a complex version engine.

---

## 7. Structured Columns Versus Metadata JSON

Use structured columns for fields that the app must query or enforce.

Structured columns:

```text
template_key
version
origin
scope_type
scope_id
label
system_type
learning_role
legacy_block_type
status
is_system
```

JSON columns:

```text
field_schema
default_content
render_hints
source_behavior
relation_behavior
proposal_behavior
summary_for_agent
metadata
```

Reason:

- Querying active templates by scope/status must be simple.
- Mapping legacy blocks must be simple.
- Behavior contracts need room to grow.
- v2.5 research is still discovering future package and graph-native needs.

---

## 8. Seed Import Model

v2.5.0 should not hand-write a second source of truth forever.

Recommended bootstrapping:

1. Keep the existing static registry as canonical seed input for the first migration/service.
2. Add `template_definitions`.
3. Seed rows with `origin = system_seed`, `scope_type = system`, `status = active`.
4. Runtime lookup reads DB first.
5. Static registry remains fallback during the transition.

This gives us a reversible path:

```text
static registry
  -> seed DB runtime
  -> runtime resolver
  -> compatibility report
  -> later user editor/package layer
```

Do not delete the static helper in v2.5.0. It is still valuable as fallback and test reference.

---

## 9. API Surface Recommendation

v2.5.0 should expose enough runtime behavior to prove the model, but not the full editor.

Recommended routes:

```text
GET /api/templates
GET /api/templates/:id
GET /api/templates/by-key/:template_key
POST /api/templates/seed-system
GET /api/templates/compatibility-report
```

Notes:

- `POST /api/templates/seed-system` can be internal/admin-gated in implementation.
- Normal users should not create arbitrary templates in v2.5.0.
- The read API should return runtime identity and compatibility fields.
- The compatibility report belongs with R2.

Optional later routes:

```text
POST /api/templates
PUT /api/templates/:id
POST /api/templates/:id/archive
POST /api/templates/:id/new-version
```

These belong to user editing or package studio work, not the first runtime foundation.

---

## 10. Agent-Facing Requirements

Runtime templates must be AI-readable from the beginning.

Minimum agent-facing fields:

```text
summary_for_agent
proposal_behavior
source_behavior
relation_behavior
field_schema
render_hints
```

The agent should not choose templates by label alone.

Example:

```json
{
  "template_key": "definition.basic",
  "summary_for_agent": {
    "use_when": "The source states the meaning of a term, concept, symbol, or named object.",
    "avoid_when": "The content is a worked example, proof step, or loose paragraph.",
    "required_fields": ["body"],
    "source_policy": "recommended",
    "relation_policy": ["uses_definition", "source_supports"]
  }
}
```

This will matter later when AI selects templates, creates composition templates, or rewrites selected canvas objects.

---

## 11. Relationship To Canvas And Relations

Templates should not own canvas layout.

They may provide:

- default size hints;
- recommended display mode;
- relation eligibility;
- source reference policy;
- agent selection hints.

They should not own:

- exact canvas position;
- CanvasEdge geometry;
- ObjectRelation rows;
- canvas viewport state;
- user-specific layout mutations.

This keeps the current principle intact:

```text
Canvas is projection.
TemplateDefinition is reusable behavior contract.
NoteBlock is content.
ObjectRelation is semantic edge.
```

---

## 12. Graph-Native Migration Notes

For future v3.x Neo4j planning, `TemplateDefinition` should probably become a graph-adjacent configuration node, not a normal learning-content node.

Possible future graph shape:

```text
(NoteBlock)-[:USES_TEMPLATE]->(TemplateDefinition)
(TemplateDefinition)-[:BELONGS_TO_PACKAGE]->(TemplatePackage)
(TemplateDefinition)-[:SUGGESTS_RELATION_TYPE]->(RelationType)
```

But v2.5.0 should not force graph storage yet.

The important evidence to collect:

- Which runtime templates are used by real NoteBlocks?
- Which templates are source-grounded?
- Which templates participate in ObjectRelations?
- Which template changes require migration proposals?
- Which template/package objects must survive export/import?

---

## 13. Recommended v2.5.0 Boundary

v2.5.0 should include:

- persistent `template_definitions`;
- system seed import from current static registry;
- runtime template resolver;
- template read APIs;
- compatibility report;
- NoteBlock creation path updated to resolve runtime templates;
- Canvas Add Block path updated to use runtime resolver;
- tests proving old static-template blocks still work;
- graph-native migration notes.

v2.5.0 should not include:

- full no-code template editor;
- user-created arbitrary system types;
- package marketplace;
- rich editor adapter;
- destructive migration of old blocks;
- AI provider evaluation;
- export/import package runtime.

---

## 14. R1 Conclusion

The safest strong foundation is:

```text
Runtime TemplateDefinition first.
Editor later.
Migration proposal later.
Package layer later.
```

This lets v2.5.0 become a reliable bridge from the v2.1.1 static registry to a future user-editable template ecosystem without breaking existing NoteBlocks or confusing canvas projection with content truth.
