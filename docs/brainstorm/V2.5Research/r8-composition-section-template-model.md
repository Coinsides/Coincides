# R8 - Composition / Section Template Model

**Created**: 2026-05-23
**Status**: Research complete for Group 3
**Scope**: v2.5.2 composition / section template model

---

## 1. Executive Summary

A composition template is not a bigger block template.

It is a reusable recipe for arranging multiple objects:

```text
NoteBlocks
CanvasNodes
CanvasFrames
ObjectRelations
SourceScopes
Proposal steps
```

Recommended direction:

- Keep single-block templates and composition templates separate.
- Treat composition templates as proposal-first when they create or rearrange semantic content.
- Let them describe slots, layout hints, optional sections, relation blueprints, and source behavior.
- Do not build the full composition editor before v2.5.0 runtime and v2.5.1 template editor are stable.
- Use composition templates as the bridge from "one good block" to "one useful learning/report section."

Composition templates are the foundation for formula sheets, theorem-proof-example clusters, evidence tables, briefing sections, source quote plus interpretation sections, and later report/presentation structures.

---

## 2. Why Composition Templates Are Needed

Single block templates answer:

```text
What fields should one NoteBlock contain?
```

Composition templates answer:

```text
How should several blocks, source references, frames, and relations work together?
```

Without composition templates, agents will have to invent structure each time. That creates inconsistent layouts, weaker review, and unclear migration evidence.

With composition templates, Coincides can say:

- this is a proof chain;
- this is a formula sheet section;
- this is an evidence comparison table;
- this is a lecture-note summary cluster;
- this is a source quote with interpretation and warning;
- this is a briefing section.

That is more powerful than adding many tiny block types.

---

## 3. Core Distinction

### Single Block Template

Defines one semantic content object:

```text
TemplateDefinition
  -> creates or validates one NoteBlock
  -> controls field schema, render hints, behavior, agent summary
```

Example:

```text
definition.basic
formula.math
exercise.general
source.quote
```

### Composition Template

Defines a reusable structure:

```text
CompositionTemplate
  -> creates or proposes many related objects
  -> can include slots, layouts, frames, relations, and source expectations
```

Example:

```text
formula-sheet.section
theorem-proof-example.cluster
source-quote-interpretation.section
evidence-comparison.table-section
briefing.summary-section
```

The rule:

```text
TemplateDefinition is for one block.
CompositionTemplate is for a meaningful arrangement of blocks and projection objects.
```

---

## 4. Candidate CompositionTemplate Shape

v2.5.2 may eventually need a table such as:

```text
composition_templates
```

Candidate fields:

```text
id
user_id
composition_key
version
origin
scope_type
scope_id
label
description
status
is_system
slot_schema
layout_behavior
relation_blueprint
source_behavior
proposal_behavior
summary_for_agent
metadata
created_at
updated_at
```

This is not yet an implementation commitment, but it is a strong model for v2.5.2 planning.

---

## 5. Slot Schema

Composition templates should define slots instead of hardcoded blocks.

Example slot schema:

```json
[
  {
    "slot_key": "main_formula",
    "label": "Main formula",
    "template_keys": ["formula.math"],
    "required": true,
    "repeatable": false,
    "agent_hint": "Use this for the central equation."
  },
  {
    "slot_key": "worked_examples",
    "label": "Worked examples",
    "template_keys": ["example.general"],
    "required": false,
    "repeatable": true,
    "agent_hint": "Add examples only when the source material includes them."
  }
]
```

Slots allow:

- partial use;
- optional content;
- repeated examples;
- user editing;
- AI selection without guessing structure from scratch.

---

## 6. Layout Behavior

Composition templates should not store final pixel-perfect design as their main identity.

They should store layout intent:

```text
orientation
  -> vertical, horizontal, grid, comparison, chain, radial

surface
  -> a4_page, finite_canvas, infinite_canvas, source_board

density
  -> compact, normal, spacious

frame_behavior
  -> no_frame, section_frame, card_group, table_frame

overflow_behavior
  -> continue_down, create_next_frame, warn_user
```

The actual canvas layout engine can translate this into `CanvasNode` and `CanvasFrame` records.

This keeps composition templates portable across future view engines.

---

## 7. Relation Blueprint

Composition templates can define expected relation patterns without immediately creating confirmed semantic edges.

Example:

```json
[
  {
    "from_slot": "theorem",
    "to_slot": "proof",
    "relation_type": "supports",
    "default_layer": "learning_logic",
    "visibility": "suggested"
  },
  {
    "from_slot": "proof",
    "to_slot": "example",
    "relation_type": "example_of",
    "default_layer": "learning_logic",
    "visibility": "suggested"
  }
]
```

The blueprint should normally create relation suggestions inside a proposal, not immediate `ObjectRelation` rows.

Confirmed `ObjectRelation` rows should be created only after review or explicit user action.

---

## 8. Source Behavior

Composition templates should say how source evidence flows through the section.

Examples:

```text
source_quote_interpretation
  -> requires at least one source quote slot
  -> interpretation slot should link back to source quote

evidence_comparison
  -> expects two or more source scopes
  -> conflicting evidence should create warning slots

formula_sheet
  -> source references optional but recommended
  -> formula blocks should preserve source anchors when generated from material
```

This connects R5 source behavior with multi-block structures.

---

## 9. Proposal-First Rule

Composition templates can affect many objects at once. Therefore:

```text
If a composition creates semantic content, rearranges semantic content, or suggests semantic relations, it should be proposal-first.
```

Likely proposal types:

```text
composition_template
composition_layout
composition_migration
```

Apply may create:

- NoteBlocks;
- NoteBlock placements;
- CanvasNodes;
- CanvasFrames;
- source references;
- suggested ObjectRelations;
- operation batches.

Apply must not silently rewrite existing NoteBlocks or delete source objects.

---

## 10. Partial Use

Henry raised an important product idea: templates may be used partially.

A composition template must support:

- using only top, middle, or bottom sections;
- using only some slots;
- skipping optional slots;
- replacing a slot template with a compatible sibling;
- letting AI explain why a slot was omitted.

This is especially important for:

- formula sheet fragments;
- side note clusters;
- small evidence sections;
- briefing snippets;
- source quote plus short interpretation.

Partial use should be recorded in proposal metadata so future AI and migration can understand what happened.

---

## 11. Examples

### Formula Sheet Section

Slots:

- title
- main formula
- variable definitions
- assumptions
- quick example
- warning/caveat

Layout:

- compact vertical card or two-column section.

Relations:

- variable definitions support formula;
- example uses formula.

### Theorem-Proof-Example Cluster

Slots:

- theorem
- proof
- example
- warning

Layout:

- theorem at top, proof below, example to side or below.

Relations:

- proof supports theorem;
- example demonstrates theorem.

### Source Quote With Interpretation

Slots:

- source quote
- interpretation
- confidence/warning

Layout:

- quote and interpretation paired.

Relations:

- source quote supports interpretation.

### Evidence Comparison Section

Slots:

- source A summary
- source B summary
- agreement
- disagreement
- unresolved question

Layout:

- comparison/table-like section.

Relations:

- supports or contradicts depending source evidence.

---

## 12. What v2.5.2 Should Implement

If v2.5.0 and v2.5.1 are stable, v2.5.2 should likely implement:

- first `CompositionTemplate` runtime contract;
- seed system composition templates;
- slot schema;
- layout behavior;
- relation blueprint;
- source behavior;
- `summary_for_agent`;
- proposal-first composition preview;
- apply behavior for new content only;
- canvas projection through `CanvasNode` and `CanvasFrame`.

v2.5.2 should not implement:

- full drag-and-drop composition builder;
- marketplace package installation;
- arbitrary executable template logic;
- irreversible migration of old notes;
- graph database migration;
- polished presentation/export engine.

---

## 13. Test Plan Implications

Automated tests should cover:

- seed composition template loads with valid slots;
- invalid slot references fail compatibility checks;
- proposal creation from composition template does not mutate content;
- applying a reviewed proposal creates expected NoteBlocks and CanvasNodes;
- optional slots may be omitted with warning/explanation;
- relation blueprints become suggested relations, not confirmed relations by default;
- source requirements produce proposal warnings when missing;
- partial composition use is recorded in proposal metadata;
- old single-block templates still work.

Browser smoke should cover:

- choose a composition template;
- preview generated section;
- apply it to a canvas;
- verify created blocks and layout;
- verify relation/source warnings are visible.

---

## 14. Graph-Native Migration Notes

Composition templates are strong candidates for future graph nodes:

```text
(:CompositionTemplate)
(:CompositionInstance)
```

Slot usage may become edges:

```text
(:CompositionInstance)-[:HAS_SLOT]->(:NoteBlock)
(:CompositionTemplate)-[:USES_TEMPLATE]->(:TemplateDefinition)
```

Relation blueprints are not always graph truth. They are design intent until applied and confirmed.

v2.5.2 should record:

- which composition templates are used;
- which slots were filled;
- which slots were skipped;
- which ObjectRelations were suggested versus confirmed;
- which source requirements were satisfied;
- which layout behavior was translated into projection objects.

This is valuable evidence for v3.x Neo4j rebuild planning.

---

## 15. R8 Conclusion

The right model is:

```text
TemplateDefinition
  -> one semantic block

CompositionTemplate
  -> reusable multi-object section recipe

CompositionProposal
  -> reviewable plan for creating or arranging content

CanvasNodes / CanvasFrames
  -> projection of the accepted structure

ObjectRelations
  -> confirmed semantic links, not automatic visual decoration
```

Composition templates are where Coincides starts becoming a structured information workspace rather than only a block note editor.

