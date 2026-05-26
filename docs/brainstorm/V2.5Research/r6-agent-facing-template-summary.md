# R6 - Agent-Facing Template Summary And AI Selection Behavior

**Created**: 2026-05-23
**Status**: Research complete for Batch 2C
**Scope**: v2.5.0 agent-facing template contract

---

## 1. Executive Summary

AI should not choose templates from vague prompt memory or a hardcoded list alone.

v2.5.0 should give every runtime `TemplateDefinition` a structured `summary_for_agent` so agents can choose, fill, warn, and propose templates consistently.

Recommended direction:

- Add `summary_for_agent` JSON to runtime templates.
- Keep it concise, structured, and versioned.
- Include use cases, anti-use cases, required evidence, relation hints, field-filling guidance, and visual risk notes.
- Use it with `source_behavior`, `relation_behavior`, `proposal_behavior`, and v2.4.5 `AICommandContext`.
- Do not let `summary_for_agent` become hidden executable logic.

The goal is not to make AI "smarter" by prompt size. The goal is to give AI a reliable map of the template system.

---

## 2. Current Implementation Facts

Current organized note proposal generation uses a hardcoded prompt section:

```text
Prefer these template_id values:
text.heading, text.paragraph, concept.basic, definition.basic, theorem.basic,
proof.basic, formula.math, example.general, exercise.general, answer.general,
source.quote, warning.callout, code.snippet.
```

It also asks for a JSON shape containing:

```text
block_type
template_id
learning_role
title
content_json.body
plain_text
confidence
warnings
```

This works as a seed, but it has limitations:

- AI does not have structured use/avoid rules per template.
- AI does not know source policy per template.
- AI does not know relation eligibility per template.
- AI does not know visual risk notes.
- AI cannot choose variants well once templates become user/package-defined.
- AI command context and template behavior are not yet connected.

v2.4.5 already exposes read-only `AICommandContext` with:

- selected object scope;
- active relation layers;
- proposal-first rule;
- direct mutation boundaries;
- proposal-required operation classes.

R6 connects these pieces.

---

## 3. Agent Summary Principle

`summary_for_agent` should answer:

```text
When should AI use this template?
When should AI avoid it?
What fields must AI fill?
What source evidence does it need?
What relations may it suggest?
What warnings should it surface?
What should it do when unsure?
```

It should not:

```text
contain long essays;
replace validation;
replace source_behavior;
replace relation_behavior;
replace proposal_behavior;
execute code;
silently authorize mutation.
```

The agent summary is a guide. The runtime behavior fields remain enforcement contracts.

---

## 4. Recommended summary_for_agent Shape

Recommended JSON shape:

```json
{
  "version": "v2.5.0",
  "short_description": "A precise definition of a term, concept, symbol, or object.",
  "use_when": [
    "The source states what something means.",
    "The content introduces a named concept or term."
  ],
  "avoid_when": [
    "The content is a worked example.",
    "The content is a proof step or derivation."
  ],
  "input_signals": [
    "phrases like 'is defined as'",
    "term followed by explanation",
    "symbol with stated meaning"
  ],
  "required_fields": ["body"],
  "optional_fields": [],
  "field_guidance": {
    "body": "Write the definition itself. Do not include unrelated examples unless the template asks for them."
  },
  "source_guidance": {
    "policy": "recommended",
    "needs_source_when_generated_from_material": true,
    "missing_source_warning": "Definition generated from course material should include source reference."
  },
  "relation_guidance": {
    "can_be_source": true,
    "can_be_target": true,
    "suggested_relation_types": ["uses_definition", "source_supports", "read_before"]
  },
  "proposal_guidance": {
    "ai_generation": "proposal_required",
    "ai_rewrite": "proposal_required",
    "direct_user_edit": "allowed"
  },
  "confidence_guidance": {
    "high": "Source explicitly defines the term.",
    "medium": "Source implies a definition but does not mark it formally.",
    "low": "The text only mentions the term."
  },
  "positive_examples": [],
  "negative_examples": [],
  "visual_risk_notes": [],
  "fallback_template_key": "text.paragraph",
  "metadata": {}
}
```

Minimum v2.5.0 fields:

```text
short_description
use_when
avoid_when
required_fields
field_guidance
source_guidance
relation_guidance
proposal_guidance
confidence_guidance
fallback_template_key
```

Optional but valuable:

```text
input_signals
positive_examples
negative_examples
visual_risk_notes
metadata
```

---

## 5. Positive Examples And Anti-Examples

Yes, templates should support both positive examples and anti-examples.

But v2.5.0 should keep them short.

Good:

```json
{
  "positive_examples": [
    {
      "source_text": "A derivative is the instantaneous rate of change.",
      "expected_template": "definition.basic",
      "reason": "It defines a term."
    }
  ],
  "negative_examples": [
    {
      "source_text": "For example, f(x)=x^2 has derivative 2x.",
      "avoid_reason": "This is an example, not a definition."
    }
  ]
}
```

Avoid:

- long prompt essays;
- dozens of examples per template;
- examples that encode private user data;
- examples that become the only validation rule.

---

## 6. Visual Risk Notes

Visual risk notes are useful because templates affect layout quality.

Examples:

```text
Long formula may overflow narrow canvas nodes.
Dense Chinese text may be hard to read in narrow table cells.
Large code blocks should avoid tiny A4 export regions.
Source quotes should not be compressed into tiny cards.
```

Recommended shape:

```json
{
  "visual_risk_notes": [
    {
      "risk": "long_formula_overflow",
      "when": "Formula body is long or multiline.",
      "recommendation": "Use wider canvas node or formula sheet composition template."
    }
  ]
}
```

These notes should inform:

- AI layout proposals;
- template selection;
- future composition templates;
- export warnings;
- user-facing editor warnings.

They should not force final CSS.

---

## 7. AI Template Selection Flow

Recommended selection flow:

```text
1. Determine user operation context.
2. Read selected object scope / source scope / active relation layers.
3. Filter templates by allowed operation and proposal policy.
4. Filter by source availability.
5. Match source text or user intent against use_when / avoid_when / input_signals.
6. Fill fields according to field_guidance.
7. Attach source references when required or recommended.
8. Suggest relations only when relation_behavior allows it.
9. Produce warnings and confidence.
10. Return proposal, not direct mutation, when required.
```

This is more reliable than asking the model to "make good notes" from raw text.

---

## 8. Interaction With AICommandContext

`AICommandContext` tells the agent what the user is operating on.

`summary_for_agent` tells the agent what each template means and how it can be used.

Together:

```text
AICommandContext
  -> selected object, active canvas, relation layers, allowed operations

TemplateDefinition.summary_for_agent
  -> template use/avoid/field/source/relation/proposal guidance
```

Example:

```text
Selected object = CanvasNode projecting a formula.math NoteBlock
User asks = "make an example using this"

AI should:
  - see formula.math can be relation source for uses_formula;
  - choose example.general as target template;
  - create proposal with example block;
  - suggest uses_formula relation if allowed;
  - keep operation proposal-first.
```

Do not let AICommandContext become a mutation surface. It is read context.

---

## 9. Recommended Seed Summaries

### definition.basic

Use when:

- source defines a term, symbol, object, or concept.

Avoid when:

- text is a proof step, worked example, or loose paragraph.

Source:

- recommended or required when AI-generated from source material.

Relations:

- target for `uses_definition`;
- source/target for `source_supports`, `read_before`.

### formula.math

Use when:

- content is an equation, formula, or symbolic relationship.

Avoid when:

- text is explanatory prose with only incidental symbols.

Source:

- recommended.

Relations:

- source/target for `uses_formula`, `derives_to`, `supports`.

Visual risk:

- long formulas need wider nodes or formula sheet composition.

### example.general

Use when:

- source gives an illustrative case or worked application.

Avoid when:

- content defines a term without applying it.

Relations:

- source for `example_of`, `uses_formula`, `uses_definition`.

### source.quote

Use when:

- block content is a source excerpt itself.

Avoid when:

- content is paraphrase or user-authored summary.

Source:

- source is required; missing source should warn strongly or block apply.

Relations:

- source evidence for `source_supports`, `supports`, `contradicts`.

### warning.callout

Use when:

- content is a caution, limitation, or important reminder.

Avoid when:

- content is normal paragraph text.

Relations:

- may support or contradict nearby claims.

---

## 10. Prompt Construction Guidance

v2.5.0 should move away from a single hardcoded template list.

Recommended future prompt ingredients:

```text
template catalog subset
selected object context
source scope summary
template behavior policies
field schema
summary_for_agent
proposal-first constraints
output JSON schema
```

The runtime should not send every template every time if the catalog becomes large.

Suggested filtering:

- include templates whose `proposal_behavior.ai_generation_allowed = true`;
- include templates relevant to source type and user operation;
- include selected object's template and likely neighbor templates;
- include fallback templates such as `text.paragraph`.

---

## 11. Handling Uncertainty

AI must be allowed to say "uncertain" through structured warnings.

Recommended fields in AI output:

```json
{
  "template_key": "definition.basic",
  "confidence": 0.68,
  "warnings": [
    "The source implies a definition but does not state it formally."
  ],
  "fallback_considered": "text.paragraph"
}
```

Rules:

- weak template matches should not pretend certainty;
- unknown template choices should fallback safely;
- missing source should warn according to `source_behavior`;
- relation suggestions should remain suggested until accepted.

---

## 12. v2.5.0 Implementation Boundary

v2.5.0 should implement:

- `summary_for_agent` on runtime templates;
- seed summaries for existing templates;
- runtime template catalog response including agent summaries;
- organized note proposal prompt helper that can consume runtime summaries, if implementation scope allows;
- tests that summaries exist and include required fields;
- tests that no summary authorizes direct forbidden mutations.

v2.5.0 should not implement:

- real AI provider evaluation;
- full AI tutor;
- automatic relation extraction;
- automatic template creation by AI;
- AI direct mutation of source-grounded or semantic content;
- prompt marketplace;
- long prompt-pack system.

---

## 13. Test Plan

Required tests:

- each seed template has `summary_for_agent`;
- summary contains required use/avoid/field/source/relation/proposal sections;
- agent catalog can be generated from active runtime templates;
- unknown template summaries fail compatibility report, not runtime load;
- AI prompt helper includes only active/proposal-allowed templates;
- source-required templates produce missing-source warning in AI proposal flow;
- relation-suggestable templates do not create ObjectRelation directly;
- selected object context can be combined with template summary without mutation;
- fallback template is available for uncertain AI classification.

---

## 14. Graph-Native Migration Notes

`summary_for_agent` is not graph truth.

It is agent-readable metadata on `TemplateDefinition`.

Future graph interpretation:

```text
(AgentOperation)-[:USED_TEMPLATE_GUIDANCE]->(TemplateDefinition)
(NoteBlock)-[:USES_TEMPLATE]->(TemplateDefinition)
(TemplateDefinition)-[:SUGGESTS_RELATION_TYPE]->(RelationType)
```

Migration evidence to collect:

- which templates AI selects often;
- which template selections are later rejected by Henry/user;
- which warnings appear often;
- which fallback paths are common;
- which relation suggestions become accepted ObjectRelations;
- which visual risk notes matter during layout.

---

## 15. R6 Conclusion

The key AI contract is:

```text
AI should choose templates from structured runtime guidance,
not from prompt vibes or hardcoded lists.
```

`summary_for_agent` turns templates into a stable interface between user intent, selected object context, source-grounded material, and proposal-first AI behavior.
