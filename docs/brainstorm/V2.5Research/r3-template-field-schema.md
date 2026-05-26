# R3 - Template Field Schema And Validation

**Created**: 2026-05-23
**Status**: Research complete for Batch 2B
**Scope**: v2.5.0 field schema foundation for TemplateDefinition runtime

---

## 1. Executive Summary

The template field schema should define the shape of `NoteBlock.content_json`, not become a programming language and not become the final UI.

Recommended v2.5.0 direction:

- Keep field schema small, explicit, and JSON-compatible.
- Validate new runtime-created blocks strictly enough to avoid broken data.
- Read legacy blocks softly so old content still opens.
- Preserve unknown fields and unknown field metadata.
- Treat source and relation pointers as special integration fields, not ordinary text content.
- Defer complex conditional logic, computed fields, nested editors, and full table builders.

The core contract:

```text
TemplateDefinition.field_schema
  -> tells Coincides what content fields a block expects
  -> validates new content
  -> helps AI fill content safely
  -> helps renderers choose editing controls
  -> helps migration reports detect old or conflicting shapes
```

---

## 2. Current Implementation Facts

The current v2.1.1 template registry has a simple `fields` array.

Current field kinds:

```text
text
latex
textarea
list
code
checkbox
```

In practice, most existing templates use one field:

```json
[
  { "key": "body", "label": "Body", "kind": "textarea", "required": true }
]
```

Current editor behavior:

- Manual Note editor uses a template selector but edits one textarea.
- Canvas block insertion uses a template selector but also edits one textarea.
- `content_json.body` is the default payload shape.
- Formula and code templates still use the same basic body field.
- Server validators accept `content_json` as a generic JSON object.
- Organized Note Proposal asks AI for blocks with `content_json.body`.

This is a good seed, but it is not enough for runtime templates, migration, package import/export, or agent reliability.

---

## 3. Field Schema Principle

Field schema should answer:

```text
What content should this template contain?
How should it be validated?
How should it be edited?
How should AI fill it?
How should old data be interpreted when it does not match?
```

It should not answer:

```text
Where does this block sit on canvas?
What exact CSS color does it use?
Which source rows does it own?
Which ObjectRelation rows exist?
How should a full document be composed?
```

Those belong to Canvas, render hints, source behavior, relation behavior, or composition templates.

---

## 4. Recommended Field Definition Shape

Recommended field object:

```json
{
  "key": "body",
  "label": "Body",
  "kind": "textarea",
  "required": true,
  "description": "Main written content.",
  "default_value": "",
  "placeholder": "Write the definition...",
  "validation": {
    "min_length": 1,
    "max_length": 20000
  },
  "display": {
    "reading": "primary",
    "editing": "textarea",
    "canvas": "summary"
  },
  "agent_hint": "Use this field for the main statement.",
  "metadata": {}
}
```

Required fields:

```text
key
label
kind
```

Recommended optional fields:

```text
required
description
default_value
placeholder
validation
display
agent_hint
metadata
```

Rules:

- `key` must be stable and unique inside the template.
- `key` should use lowercase snake case or simple identifiers.
- `kind` must be one of the supported field kinds.
- `default_value` must match the field kind.
- Unknown field metadata must be preserved.
- Unknown field kinds should not crash legacy display; they should become compatibility warnings.

---

## 5. Recommended Field Kinds

### v2.5.0 core field kinds

These should be supported by runtime validation in v2.5.0:

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

Reason:

- They cover current templates.
- They are enough for definition/formula/example/exercise/code/callout variants.
- They are simple enough to validate without a full editor engine.
- They can be rendered with existing textarea-first UI plus small upgrades later.

### v2.5.0 reserved integration field kinds

These should be defined as reserved shapes, but not treated as fully editable ordinary fields yet:

```text
source_reference
relation_target
table_lite
```

Reason:

- `source_reference` should connect to `note_block_sources`, `SourceAnchor`, or `SourceScope`, not hide source truth inside `content_json`.
- `relation_target` should connect to `ObjectRelation`, not create a private relation inside block JSON.
- `table_lite` is important, but table editing can grow quickly and should not block v2.5.0.

v2.5.0 can validate and report these as known field kinds, but full UI behavior can be deferred.

---

## 6. Minimal Validation Rules By Field Kind

### text

Expected value:

```text
string
```

Rules:

- optional min/max length;
- optional pattern later;
- no rich markup assumption.

### textarea

Expected value:

```text
string
```

Rules:

- optional min/max length;
- can contain multiline text;
- can preserve markdown-like characters without parsing.

### markdown_lite

Expected value:

```text
string
```

Rules:

- allow basic markdown-ish text;
- do not execute HTML;
- no plugin syntax in v2.5.0;
- render can still fallback to plain text.

### latex

Expected value:

```text
string
```

Rules:

- optional max length;
- no server-side LaTeX execution;
- render errors must not break the block.

### code

Expected value:

```json
{
  "code": "string",
  "language": "string optional"
}
```

Compatibility shortcut:

```json
{
  "body": "code string",
  "language": "ts"
}
```

v2.5.0 should tolerate both because current `code.snippet` uses `body`.

### list

Expected value:

```json
[
  "item 1",
  "item 2"
]
```

Optional future shape:

```json
[
  { "text": "item 1", "checked": false }
]
```

v2.5.0 should choose one canonical shape, but tolerate old variants in compatibility reports.

### checkbox

Expected value:

```text
boolean
```

Rules:

- default should be `false`;
- null/missing can infer default on new creation.

### select

Expected value:

```text
string
```

Rules:

- `options` must be declared in field schema;
- unknown option should be warning for legacy, error for new direct creation.

### number

Expected value:

```text
number
```

Rules:

- optional min/max;
- optional integer;
- optional unit in metadata, not in value.

### source_reference

Expected value:

```text
reference id or lightweight pointer
```

v2.5.0 rule:

```text
Do not make content_json the source of truth for source references.
```

Use this field kind to instruct UI/AI that source grounding is expected, but write durable source links through source tables.

### relation_target

Expected value:

```text
object id or lightweight pointer
```

v2.5.0 rule:

```text
Do not make content_json the source of truth for semantic relations.
```

Use `ObjectRelation` for real relations.

### table_lite

Expected value:

```json
{
  "columns": [],
  "rows": []
}
```

v2.5.0 rule:

```text
Define the shape, but defer serious table UI.
```

---

## 7. Strict Creation, Soft Legacy Reading

v2.5.0 should distinguish between:

```text
new runtime-created content
legacy existing content
AI/proposal content
package-imported content
```

Recommended behavior:

### New manual/runtime creation

Strict enough:

- required fields must be present or defaultable;
- field values must match kind;
- select values must match options;
- unknown template should fail cleanly.

### Legacy reading

Soft:

- missing fields allowed;
- unknown fields preserved;
- incompatible fields reported;
- renderer falls back to body/plain_text.

### Proposal creation

Strict plus warnings:

- AI output should be normalized to schema;
- unsafe unknown fields should become warnings;
- proposal preview should show missing/invalid fields before apply.

### Package import

Soft first, proposal-first later:

- import can record unresolved template/field warnings;
- applying migrations should be reviewed.

---

## 8. Default Values

Default values should live in `TemplateDefinition.default_content`, but field-level defaults should also exist for validation.

Recommended rule:

```text
default_content = whole content_json seed
field.default_value = field-level fallback
```

If both exist:

1. Start with `default_content`.
2. Fill missing fields from `field.default_value`.
3. Validate final content.

Example:

```json
{
  "field_schema": [
    { "key": "body", "kind": "textarea", "required": true, "default_value": "" },
    { "key": "done", "kind": "checkbox", "default_value": false }
  ],
  "default_content": {
    "body": "",
    "done": false
  }
}
```

---

## 9. Unknown Field Preservation

Compatibility rule:

```text
Unknown content_json fields should be preserved unless a proposal explicitly removes them.
```

Why:

- Existing blocks may already contain experimental fields.
- Future package imports may contain newer fields.
- Downgrades should not destroy data.
- Graph-native migration evidence may depend on old metadata.

Report unknown fields, do not erase them.

Recommended compatibility output:

```json
{
  "block_id": "uuid",
  "template_key": "definition.basic",
  "field_state": "extra_fields_present",
  "unknown_content_fields": ["old_hint"],
  "warnings": ["Unknown content field preserved."]
}
```

---

## 10. What v2.5.0 Should Implement

v2.5.0 should implement:

- runtime field schema storage;
- seed import from current template fields;
- field schema resolver;
- content validation helper;
- compatibility report for field mismatches;
- creation paths that validate new template-backed blocks;
- soft rendering fallback for old blocks;
- tests for missing/extra/wrong field values.

v2.5.0 should not implement:

- full user field editor;
- conditional fields;
- computed fields;
- nested subforms;
- formula execution;
- full table editor;
- source picker inside template editor;
- relation editor inside template editor.

---

## 11. Test Plan

Required tests:

- current seed templates import into runtime with valid field schemas;
- new `definition.basic` block validates `body` as required textarea;
- new `formula.math` block validates LaTeX body as string;
- `code.snippet` accepts current body-based compatibility shape;
- required missing field fails for new direct creation;
- legacy missing field loads with warning;
- unknown content field is preserved;
- unknown field kind in old package/template does not crash compatibility report;
- select field rejects unknown values for new creation;
- proposal normalization maps AI `body` output into the correct field shape;
- compatibility report detects field mismatch.

---

## 12. Graph-Native Migration Notes

Field schema itself is probably not a major graph node. It is part of `TemplateDefinition`.

Possible future graph interpretation:

```text
(NoteBlock)-[:USES_TEMPLATE]->(TemplateDefinition)
(TemplateDefinition)-[:HAS_FIELD_SCHEMA]->(FieldSchema)
```

But v2.5 should avoid over-modeling fields as graph nodes unless a real need appears.

Migration evidence to collect:

- Which fields are actually used by real NoteBlocks?
- Which templates produce source/relation-bearing content?
- Which field mismatches appear in old data?
- Which fields must survive package import/export?

---

## 13. R3 Conclusion

The right field model is:

```text
Small schema.
Strong enough validation.
Soft legacy reading.
No hidden source/relation truth inside content_json.
Unknown data preserved.
```

This lets v2.5.0 make templates reliable without turning the template system into a full programming language too early.
