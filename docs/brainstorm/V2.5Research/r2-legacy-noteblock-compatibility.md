# R2 - Legacy NoteBlock Compatibility And Migration Surface

**Created**: 2026-05-23
**Status**: Research complete for Batch 2A
**Scope**: v2.5.0 compatibility layer before template runtime implementation

---

## 1. Executive Summary

Existing v2.1.1 and v2.4 template-aware NoteBlocks should not be deleted before v2.5.0. They are useful compatibility samples.

The current data proves the hardest real question:

```text
Can Coincides introduce runtime TemplateDefinitions without breaking old NoteBlocks that only know block_type + metadata.template_id?
```

Recommended answer:

- Keep legacy `block_type`.
- Keep existing metadata.
- Add a runtime template resolver.
- Add a compatibility report.
- Do not silently rewrite existing NoteBlocks in v2.5.0.
- Use proposal-first migration for meaning-changing upgrades later.

Old blocks are not junk. They are the test corpus for whether v2.5 is safe.

---

## 2. Current Compatibility Facts

Current NoteBlocks have these important fields:

```text
block_type
content_json
plain_text
metadata
```

After v2.1.1, many blocks may have metadata like:

```json
{
  "system_type": "text",
  "learning_role": "definition",
  "template_id": "definition.basic",
  "taxonomy_version": "v2.1.1"
}
```

But older or partially created blocks may have:

- no template metadata;
- only legacy `block_type`;
- unknown metadata keys;
- stale template IDs;
- template metadata that conflicts with `block_type`;
- canvas-created metadata such as `created_from` and `canvas_id`.

The current static helper already maps legacy block types:

```text
heading -> text.heading
paragraph -> text.paragraph
definition -> definition.basic
theorem -> theorem.basic
proof -> proof.basic
formula -> formula.math
example -> example.general
exercise -> exercise.general
answer -> answer.general
sidenote -> warning.callout
```

Current update behavior preserves unknown metadata keys, then merges inferred template metadata. This is a good compatibility habit and should continue.

---

## 3. Do Not Clear Old v2.1.1 NoteBlocks Yet

Recommendation:

```text
Do not clean/delete legacy v2.1.1 template-aware NoteBlocks before v2.5.0 compatibility testing.
```

Reason:

- They prove whether runtime templates can handle real mixed data.
- They reveal conflict cases that clean demo data hides.
- They protect against breaking existing canvas-created blocks.
- They help design future migration proposals.

Cleanup can be considered only after:

- a compatibility report exists;
- template runtime resolver is stable;
- test/export backup exists;
- Henry explicitly decides old test data is no longer needed.

---

## 4. Compatibility States

v2.5.0 should classify each NoteBlock into a compatibility state.

Recommended states:

```text
runtime_resolved
legacy_inferred
template_missing
template_deprecated
metadata_conflict
unknown_legacy_type
manual_review_required
```

Meaning:

### runtime_resolved

The block has metadata that maps cleanly to an active runtime `TemplateDefinition`.

Example:

```text
metadata.template_id = definition.basic
runtime template definition.basic v1.0.0 exists and is active
```

### legacy_inferred

The block does not have complete template metadata, but `block_type` can safely infer a template.

Example:

```text
block_type = proof
metadata.template_id missing
safe inference = proof.basic
```

### template_missing

The block references a template key that runtime cannot resolve.

Example:

```text
metadata.template_id = definition.engineering
runtime has no definition.engineering
```

The block should still load. The UI should warn or fallback, not crash.

### template_deprecated

The block maps to a runtime template that still exists but is no longer preferred.

Example:

```text
metadata.template_id = formula.math
template status = deprecated
replacement = formula.math.v2
```

This should not auto-migrate in v2.5.0.

### metadata_conflict

The block metadata and resolved template disagree in a meaningful way.

Example:

```json
{
  "block_type": "formula",
  "metadata": {
    "template_id": "definition.basic",
    "system_type": "latex"
  }
}
```

This needs report visibility.

### unknown_legacy_type

The `block_type` is not mapped.

Example:

```text
block_type = custom_old_type
```

Fallback display may use `text.paragraph`, but migration should be cautious.

### manual_review_required

The system cannot safely decide whether the block is content, old experimental data, or a broken record.

---

## 5. Compatibility Resolver

v2.5.0 needs a resolver that can answer:

```text
Given note_blocks.block_type + note_blocks.metadata, what runtime template should this block use right now?
```

Recommended resolver order:

1. Try `metadata.template_definition_id`.
2. Try `metadata.template_key`.
3. Try legacy `metadata.template_id`.
4. Infer from `block_type`.
5. Fallback to `text.paragraph` with warning.

Recommended output:

```json
{
  "template_definition": {},
  "resolved_template_key": "definition.basic",
  "resolved_version": "1.0.0",
  "compatibility_state": "runtime_resolved",
  "warnings": []
}
```

The resolver should not mutate by default.

---

## 6. Compatibility Report Route

Yes, v2.5.0 should include a compatibility report.

Recommended route:

```text
GET /api/templates/compatibility-report?course_id=...
```

Optional broader route:

```text
GET /api/templates/compatibility-report
```

Recommended response:

```json
{
  "summary": {
    "total_blocks": 120,
    "runtime_resolved": 80,
    "legacy_inferred": 30,
    "template_missing": 4,
    "template_deprecated": 2,
    "metadata_conflict": 3,
    "unknown_legacy_type": 1
  },
  "samples": [
    {
      "block_id": "uuid",
      "course_id": "uuid",
      "block_type": "formula",
      "template_id": "formula.math",
      "compatibility_state": "runtime_resolved",
      "warnings": []
    }
  ],
  "recommended_actions": [
    "No destructive migration required before v2.5.0.",
    "Review template_missing and metadata_conflict samples before enabling user template editor."
  ]
}
```

This report is the v2.5 equivalent of a preflight safety check.

---

## 7. Migration Policy

v2.5.0 should be mostly read/infer/report.

Safe in v2.5.0:

- read old blocks;
- infer template runtime identity at read time;
- create new blocks with runtime-backed metadata;
- report compatibility issues;
- preserve unknown metadata keys;
- add metadata only when a user edits/saves the block through normal flows and the change is direct-safe.

Not safe in v2.5.0:

- bulk rewrite all old blocks silently;
- delete old metadata;
- change learning role without review;
- change source behavior without review;
- change template meaning without review;
- remove `block_type`.

Future migration proposal should handle:

- adding `template_definition_id` to old blocks;
- upgrading deprecated templates;
- resolving missing template IDs;
- correcting conflicts;
- converting legacy field structures to new field schema.

---

## 8. Suggested NoteBlock Metadata Shape

Existing v2.1.1 shape:

```json
{
  "system_type": "text",
  "learning_role": "definition",
  "template_id": "definition.basic",
  "taxonomy_version": "v2.1.1"
}
```

Recommended v2.5-compatible shape:

```json
{
  "system_type": "text",
  "learning_role": "definition",
  "template_id": "definition.basic",
  "template_key": "definition.basic",
  "template_definition_id": "uuid-if-known",
  "template_version": "1.0.0",
  "template_resolution_status": "runtime_resolved",
  "taxonomy_version": "v2.5.0"
}
```

Compatibility rule:

```text
metadata.template_id remains supported.
metadata.template_key is preferred going forward.
metadata.template_definition_id is used when runtime identity is known.
```

Never erase unknown keys such as `canvas_id`, `created_from`, source markers, or future package metadata.

---

## 9. What Happens When A Template No Longer Exists?

The block must still load.

Recommended behavior:

1. Display the block using fallback renderer.
2. Keep the original metadata untouched.
3. Mark compatibility state as `template_missing`.
4. Show a report warning.
5. Allow user or future migration proposal to choose a replacement.

Do not turn missing template into data loss.

This is especially important for future package import/export:

```text
Package may contain NoteBlocks that reference templates not installed locally.
```

The app must degrade gracefully.

---

## 10. When To Leave Alone, Infer, Upgrade, Archive, Or Migrate

### Leave alone

Use when:

- block loads;
- no conflict;
- runtime template resolved;
- no user asked for migration.

### Infer

Use when:

- metadata is missing;
- `block_type` maps clearly;
- display/edit behavior can proceed safely.

### Upgrade

Use only when:

- user saves the block;
- the update path is direct-safe;
- only missing metadata is being filled.

### Archive

Use when:

- block is test-only;
- Henry explicitly authorizes cleanup;
- compatibility report/export exists first.

### Migrate by proposal

Use when:

- template meaning changes;
- field schema changes;
- learning role changes;
- source/relation/proposal behavior changes;
- bulk changes are involved.

---

## 11. Test Plan For v2.5.0

Required tests:

- Legacy block without metadata still loads.
- Legacy block without metadata resolves through `block_type`.
- Existing `metadata.template_id` resolves to runtime `TemplateDefinition`.
- Unknown `template_id` falls back safely and records warning.
- Deprecated template records warning but still loads.
- Metadata conflict is reported.
- Update path preserves unknown metadata keys.
- Canvas Add Block creates runtime-backed metadata.
- Existing Note editor creation still works.
- Existing organized note proposal apply still writes compatible template metadata.
- Compatibility report counts states correctly.

Regression tests:

- v2.1 material proposal flow still works.
- v2.2 reconciliation flow still works.
- v2.3 source workflow still works.
- v2.4 canvas block insertion and relation flow still works.

---

## 12. Graph-Native Migration Notes

For future v3.x:

```text
NoteBlock = strong graph node candidate
TemplateDefinition = package/config graph node candidate
USES_TEMPLATE = likely edge or property
block_type = compatibility property, not long-term semantic truth
```

A legacy block that cannot resolve a template is still a valid content node candidate. Missing template identity should not remove it from the graph.

The graph-native migration should preserve:

- NoteBlock content;
- source grounding;
- canvas projection;
- object relations;
- template identity if known;
- unresolved compatibility warnings if not known.

This is why v2.5.0 compatibility reporting matters: it turns messy old data into migration evidence.

---

## 13. R2 Conclusion

The right v2.5.0 posture is:

```text
Resolve old blocks.
Report compatibility.
Preserve unknown metadata.
Avoid destructive migration.
Use proposal-first migration later.
```

This lets Coincides move from static templates to runtime templates without breaking the v2.1.1/v2.4 data that already proves the system is becoming real.
