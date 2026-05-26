# R7 - User-Facing Template Editor Requirements

**Created**: 2026-05-23
**Status**: Research complete for Group 3
**Scope**: v2.5.1 user-facing template editor seed

---

## 1. Executive Summary

v2.5.1 should not expose the whole template runtime as a raw JSON editor.

The user-facing template editor should be a guided editor over `TemplateDefinition`, with safe defaults, preview, compatibility warnings, and a guarded advanced lane.

Recommended direction:

- Let normal users copy, edit, preview, activate, archive, and organize templates.
- Keep low-level system block types closed.
- Let users edit template variants under fixed system types and learning roles.
- Preserve `TemplateDefinition` as the canonical template contract.
- Use draft/active/archive lifecycle instead of direct destructive edits.
- Use proposals or review gates for changes that affect existing NoteBlocks.
- Treat a polished template editor as v2.5.1+, not v2.5.0.

The purpose of v2.5.1 is not to create a full "Warcraft editor" yet. It is to make the template system understandable and editable without letting users accidentally break source grounding, relation behavior, or old notes.

---

## 2. Current Context

The v2.5 research so far has settled these foundations:

- R1/R2: `TemplateDefinition` should become persistent runtime infrastructure, with legacy compatibility reports.
- R3/R4: templates need field schemas and render hints, but these are not the final visual design system.
- R5/R6: templates need source behavior, relation behavior, proposal behavior, and `summary_for_agent`.

Current product behavior is still simple:

- Manual note editing and canvas Add Block use template labels.
- Most templates still edit through simple text/textarea fields.
- The UI does not yet expose a template library.
- There is no lifecycle for user-created or user-modified templates.
- There is no compatibility preview before changing a template that old NoteBlocks use.

Therefore, v2.5.1 should be a controlled editor seed, not a broad template programming environment.

---

## 3. Editor Principle

The editor should answer one question:

```text
How can a user safely create or adjust a reusable learning/display template without learning the internal engine?
```

This means the editor should separate:

```text
Friendly editable surface
  -> label, description, fields, defaults, display intent, agent summary hints

Guarded advanced surface
  -> behavior JSON, compatibility details, migration warnings

System-owned runtime
  -> system_type, resolver rules, legacy mapping, source/relation truth rules
```

The first version should prefer fewer safe controls over a giant form.

---

## 4. Smallest Useful Template Editor

The smallest useful v2.5.1 editor should include:

```text
Template Library
  -> list templates, search/filter by system type, learning role, status, origin

Template Detail
  -> label, description, template key/version, status, behavior summary

Copy From Existing
  -> duplicate a system or package template into a user-owned draft

Field Editor Lite
  -> edit field labels, placeholders, help text, required flag, defaults

Render Intent Editor Lite
  -> choose broad display mode and primary/secondary fields

Source / Relation Policy Summary
  -> simple switches or presets, not raw relation mechanics

Agent Summary Editor Lite
  -> short use/avoid notes and examples for AI selection

Preview
  -> reading preview, editing preview, debug preview with sample content

Compatibility Warnings
  -> show affected NoteBlocks and unsafe changes before activation

Lifecycle Controls
  -> save draft, activate, archive, restore, duplicate
```

This gives real user value without requiring full custom template programming.

---

## 5. What Normal Users Can Edit

Normal users should be allowed to edit:

- `label`
- `description`
- field display labels
- field help text
- placeholders
- default content
- whether a field is required, if this does not break existing blocks
- broad render intent, such as paragraph, callout, formula, card, table-like, checklist
- simple display density, such as compact, normal, spacious
- source requirement preset, such as optional, recommended, required
- relation suggestion preset, such as none, can-support, can-derive, can-answer
- `summary_for_agent` use notes and anti-use notes
- user-facing examples
- template category/tags, once package/domain infrastructure exists

These edits are mostly descriptive or additive. They can be validated and previewed without changing the meaning of old NoteBlocks.

---

## 6. What Should Stay Advanced Or System-Owned

These should not be normal first-version controls:

- `system_type`
- low-level `block_type` compatibility mapping
- resolver priority
- template key namespace rules
- raw field kind creation beyond supported field kinds
- arbitrary conditional fields
- computed fields
- executable plugin behavior
- raw source table writes
- raw ObjectRelation type creation
- migration policy internals
- graph-native node/edge mapping
- package trust and signing rules

Advanced users may eventually get a guarded JSON/debug lane, but it should not be the default way to make templates.

The guiding rule:

```text
Users can customize template variants. Coincides owns the engine boundary.
```

---

## 7. Draft, Activation, And Archive Lifecycle

v2.5.1 should avoid direct destructive edits to active templates.

Recommended lifecycle:

```text
draft
  -> user can edit freely

active
  -> can be used for new blocks and proposals

deprecated
  -> still renders old blocks, not offered by default for new blocks

archived
  -> hidden from normal selection, restorable
```

System templates should be copy-first:

```text
system template
  -> duplicate into user draft
  -> edit user draft
  -> activate user version
```

This prevents a user from accidentally breaking the seed registry.

---

## 8. Compatibility Warnings

Before activating a changed template, the UI should show an impact summary:

```text
Affected existing blocks: 12
Missing required field risk: 2
Unknown field preservation: yes
Source behavior changed: no
Relation behavior changed: yes
Proposal behavior changed: no
Recommended action: safe / needs review / proposal required
```

Unsafe changes should not be hidden behind a normal Save button.

Examples of unsafe changes:

- removing a field used by existing NoteBlocks;
- changing a field kind from text to number;
- making an optional field required when old blocks do not have it;
- changing source behavior from optional to required;
- changing relation behavior in a way that affects proposals or ObjectRelation suggestions;
- changing `summary_for_agent` enough that generated content might shift behavior.

Small descriptive edits can be direct. Structural edits should create a `TemplateProposal` or `TemplateMigrationProposal` later in v2.5.x.

---

## 9. Preview Requirements

Template editing needs preview because templates are half data contract, half product experience.

Minimum preview modes:

- Reading preview: what a block looks like when consumed.
- Editing preview: what the user sees while filling fields.
- Proposal preview: how the template appears inside AI proposal review.
- Debug preview: field names, template key, version, warnings.

Preview should use sample content, not mutate real NoteBlocks.

Good preview answers:

- Is the template understandable?
- Does the field order make sense?
- Is this too dense for a small canvas node?
- Does it degrade to plain text safely?
- Would an AI know when to use it?

---

## 10. Agent Summary Editing

Because R6 introduces `summary_for_agent`, v2.5.1 needs a human-safe way to edit it.

Do not ask users to write a long prompt. Instead, expose structured fields:

```text
Use this template when...
Avoid this template when...
Required evidence...
Good example...
Bad example...
Visual risk...
```

The system can compile these fields into the structured `summary_for_agent`.

This is important because future AI operations should choose templates from stable metadata, not from vague memory.

---

## 11. Source And Relation Behavior In The Editor

The editor should not expose raw source or relation internals in v2.5.1.

Recommended normal-user presets:

```text
Source behavior
  -> none
  -> optional reference
  -> recommended reference
  -> required reference

Relation behavior
  -> no relation suggestions
  -> can support another block
  -> can be supported by source
  -> can derive to/from another block
  -> can answer an exercise/question
```

The underlying `source_behavior` and `relation_behavior` JSON can stay richer than the first UI exposes.

This keeps the editor friendly while preserving runtime power.

---

## 12. Suggested v2.5.1 Boundaries

v2.5.1 should include:

- template library/list;
- template detail page/panel;
- duplicate template into user draft;
- edit friendly fields;
- edit field labels/help/defaults for existing supported field kinds;
- edit broad render intent presets;
- edit basic source/relation/agent summary presets;
- preview;
- draft/activate/archive lifecycle;
- compatibility warning summary.

v2.5.1 should not include:

- full package marketplace;
- executable template plugins;
- arbitrary system type creation;
- full relation type editor;
- full source picker inside template editor;
- complete style/theme builder;
- drag-and-drop composition builder;
- automatic migration of existing NoteBlocks;
- graph database migration.

---

## 13. Test Plan Implications

Automated tests should cover:

- duplicate system template creates user draft;
- editing friendly fields preserves system-owned fields;
- activating a draft makes it selectable for new NoteBlocks;
- archived template is hidden from normal selectors;
- old NoteBlocks still render if their template becomes deprecated;
- compatibility report catches removed fields;
- invalid field edits fail without partial writes;
- preview generation does not mutate real blocks;
- source/relation presets compile into valid behavior JSON;
- agent summary fields compile into valid `summary_for_agent`.

Manual smoke should cover:

- create template from existing definition template;
- preview it;
- activate it;
- add a canvas block with the new template;
- archive it and verify old blocks remain readable.

---

## 14. Graph-Native Migration Notes

User-created templates are likely future graph nodes:

```text
(:TemplateDefinition)
```

Template usage may become edges:

```text
(:NoteBlock)-[:USES_TEMPLATE]->(:TemplateDefinition)
```

However, field labels and render hints should not become graph nodes by default.

v2.5.1 should record:

- which templates are user-created;
- which templates are edited copies of seed templates;
- which NoteBlocks use which template version;
- which template changes required proposals;
- which behavior presets produce real source/relation outcomes.

This evidence matters for v3.x Neo4j planning.

---

## 15. R7 Conclusion

The right first user-facing template editor is:

```text
Guided copy-and-edit template library
  -> draft lifecycle
  -> safe friendly controls
  -> preview
  -> compatibility warnings
  -> guarded advanced details
```

This lets users start shaping Coincides templates without turning the product into a fragile low-level engine editor too early.

