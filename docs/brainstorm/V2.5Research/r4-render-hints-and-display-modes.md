# R4 - Render Hints And Display Modes

**Created**: 2026-05-23
**Status**: Research complete for Batch 2B
**Scope**: v2.5.0 render hint foundation for TemplateDefinition runtime

---

## 1. Executive Summary

Render hints should separate template meaning from final visual design.

Current Coincides blocks often display as large rough cards with always-visible type labels. That is acceptable for foundation work, but v2.5 needs a more precise contract:

```text
TemplateDefinition.render_hints
  -> describes display intention
  -> does not own final CSS
  -> does not own canvas position
  -> does not replace view presets
```

Recommended v2.5.0 direction:

- Replace the current single `render_hint` string with structured `render_hints`.
- Define reading, editing, canvas, debug, proposal, and export-aware display modes.
- Make type labels contextual instead of always visible.
- Keep actual colors, spacing, typography, and app shell polish in CSS/view presets.
- Avoid a full visual style engine in v2.5.0.

---

## 2. Current Implementation Facts

Current template definitions use:

```text
render_hint: string
```

Examples:

```text
paragraph
heading
definition
theorem
proof
formula
example
exercise
answer
quote
callout
code
```

Current UI behavior:

- Note editor shows a visible template/type label on every block.
- Note editor edits most templates through a textarea.
- Note editor previews content with KaTeX renderer.
- Canvas Add Block uses template labels but does not render template-specific field layouts.
- Canvas nodes are projection cards, not final polished document blocks.
- Course Detail proposal UI uses readable template labels in some places.

This has helped us prove the data model, but it also creates UX debt:

- type labels are too noisy in normal reading;
- all blocks feel similar;
- formulas/code/source quotes do not have enough specialized presentation;
- debug information and user-facing reading state are mixed together;
- canvas presentation and note reading presentation are not clearly separated.

---

## 3. Render Hint Principle

Render hints should answer:

```text
What kind of display does this template prefer?
How dense should it be?
Which fields are primary?
When should labels appear?
How should it degrade if the renderer cannot support the ideal view?
```

Render hints should not answer:

```text
Exact CSS colors
Exact pixel positioning
Canvas layout
Full export engine rules
Final app shell design
User-created visual theme implementation
```

That keeps the core contract stable while letting the visual system evolve.

---

## 4. Recommended Structured Render Hints

Recommended shape:

```json
{
  "primary": "definition_block",
  "density": "comfortable",
  "label_policy": "contextual",
  "reading": {
    "display": "card",
    "show_label": "on_hover_or_selected",
    "primary_field": "body"
  },
  "editing": {
    "display": "field_stack",
    "show_validation": true
  },
  "canvas": {
    "display": "node_card",
    "summary_field": "body",
    "default_width": 300,
    "default_height": 180
  },
  "debug": {
    "show_template_key": true,
    "show_field_state": true
  },
  "export": {
    "pdf_behavior": "block",
    "html_behavior": "semantic_section",
    "image_behavior": "rasterizable"
  },
  "fallback": "plain_text"
}
```

Minimum v2.5.0 fields:

```text
primary
density
label_policy
reading
editing
canvas
debug
fallback
```

`export` can be defined as future-aware metadata but does not need implementation in v2.5.0.

---

## 5. Useful Render Hint Values

Recommended `primary` values:

```text
paragraph
heading
card
definition_block
theorem_block
proof_item
formula_block
example_block
exercise_block
answer_block
source_quote
callout
code_block
compact_inline
table_like
media_block
task_block
fallback_plain
```

Recommended `density` values:

```text
compact
comfortable
spacious
debug
```

Recommended `label_policy` values:

```text
hidden
contextual
always
debug_only
proposal_only
```

Recommended fallback values:

```text
plain_text
body_field
debug_json
unsupported_template
```

v2.5.0 does not need beautiful specialized components for all values. It needs a stable vocabulary that future renderers can honor progressively.

---

## 6. Display Modes

### Reading mode

Purpose:

```text
Let a human read the note without implementation noise.
```

Rules:

- hide technical template IDs;
- type labels should usually be hidden or contextual;
- source markers can be visible when useful;
- relation markers can be subtle;
- block-specific visual shape may appear;
- unsupported templates fallback to readable text.

### Editing mode

Purpose:

```text
Let a user edit fields safely.
```

Rules:

- show field labels when more than one field exists;
- show validation warnings;
- show template label near selector or inspector;
- do not expose low-level JSON by default;
- advanced/debug field view can exist later.

### Canvas mode

Purpose:

```text
Represent the block as a movable projection object.
```

Rules:

- use concise summaries;
- show label only when useful or selected;
- obey default size hints;
- do not let canvas style become content truth;
- support debug selected object scope separately.

### Debug mode

Purpose:

```text
Let Henry/Codex/agents inspect what the system thinks this block is.
```

Rules:

- show template key/version;
- show compatibility state;
- show field validation state;
- show source/relation warnings;
- show IDs where useful.

Debug mode is not normal user reading mode.

### Proposal mode

Purpose:

```text
Let the user review proposed content before applying.
```

Rules:

- show template label clearly;
- show confidence/warnings;
- show field diffs when relevant;
- show source/relation/proposal behavior warnings;
- do not over-polish to the point that proposal looks already accepted.

### Export mode

Purpose:

```text
Prepare for future PDF/HTML/image export without implementing export now.
```

Rules:

- templates can declare export preferences;
- v2.5.0 should not promise pixel-perfect export;
- media/video/interactive blocks must declare fallback behavior later.

---

## 7. Type Labels Should Become Contextual

Current problem:

```text
Every block showing its type label all the time makes notes feel like engineering test pages.
```

Recommended rule:

```text
Labels should be visible when they help decision-making, not when they distract from reading.
```

Suggested behavior:

- Reading mode: hidden or subtle contextual label.
- Editing mode: visible in editor toolbar or inspector.
- Canvas mode: visible on selected/hovered node or compact chip.
- Proposal mode: visible because user is reviewing structure.
- Debug mode: always visible.

This directly addresses Henry's earlier experience feedback without requiring a full visual redesign in v2.5.0.

---

## 8. Runtime Versus CSS/View Presets

Template runtime should own:

- display intention;
- field-to-display mapping;
- density preference;
- label policy;
- fallback behavior;
- export intent;
- debug visibility contract.

CSS/view presets should own:

- exact colors;
- typography;
- shadows/borders;
- spacing;
- theme;
- AFFiNE/Notion-like app shell polish;
- responsive layout rules.

Canvas should own:

- x/y position;
- width/height;
- z-index;
- viewport;
- selection state;
- edge geometry.

This division prevents templates from becoming a brittle visual theme system.

---

## 9. Future Export Considerations

Even though v2.5.0 should not implement export, render hints should avoid blocking export later.

Recommended export metadata:

```json
{
  "export": {
    "pdf_behavior": "block",
    "html_behavior": "semantic_section",
    "image_behavior": "rasterizable",
    "unsupported_behavior": "fallback_text"
  }
}
```

Examples:

- `formula_block`: PDF can render as equation or fallback text.
- `code_block`: PDF can render monospace block.
- `source_quote`: PDF can include citation-style footer later.
- `media_block`: PDF may need thumbnail + link fallback.
- `table_like`: PDF may need width warnings.

This aligns with the future package/export discussion without pulling export into v2.5.0.

---

## 10. What v2.5.0 Should Implement

v2.5.0 should implement:

- structured `render_hints` in `TemplateDefinition`;
- seed conversion from current `render_hint` strings;
- runtime resolver returning render hints;
- fallback mapping for old string hints;
- contextual label policy in at least one minimal UI path if feasible;
- compatibility report warnings for unknown render hints;
- debug mode data contract, even if UI is simple.

v2.5.0 should not implement:

- final AFFiNE-like visual redesign;
- full app shell redesign;
- full theme/template style editor;
- user-created background/arrow/shape styles;
- PDF/HTML/image export;
- complex responsive document rendering engine;
- canvas presentation mode.

---

## 11. Test Plan

Required tests:

- current seed templates convert string `render_hint` into structured render hints;
- unknown render hint falls back safely;
- runtime template API returns render hints;
- compatibility report detects unsupported render hints;
- reading mode can hide technical labels according to label policy;
- debug mode can expose template key/version/field state;
- canvas mode receives default width/height hints without overriding saved CanvasNode layout;
- proposal mode still shows readable template labels;
- old NoteBlocks with only metadata/template_id still render through fallback.

---

## 12. Graph-Native Migration Notes

Render hints are projection/view metadata.

Future graph-native rule:

```text
Do not treat render hints as knowledge edges.
```

They may become properties on `TemplateDefinition` or `ViewPreset`, but they should not become semantic relations.

Possible future model:

```text
(TemplateDefinition)-[:USES_RENDER_PRESET]->(RenderPreset)
(CanvasNode)-[:PROJECTS]->(NoteBlock)
```

But v2.5.0 can keep render hints inside template runtime JSON.

Migration evidence to collect:

- Which templates require specialized renderers?
- Which render hints are actually used by UI?
- Which blocks degrade to fallback display?
- Which visual decisions belong to future ViewPreset rather than TemplateDefinition?

---

## 13. R4 Conclusion

The right render model is:

```text
Structured hints, not final styling.
Multiple display modes, not one universal block card.
Contextual labels, not permanent engineering badges.
Fallback-first rendering, not brittle perfect rendering.
```

This gives v2.5.0 a real display contract while keeping the big visual redesign safely deferred until the canvas/template system is more mature.
