# v2.4 User-customizable Template / Block / Style Engine Reference

**Created**: 2026-05-22
**Status**: Research report 1
**Scope**: User-customizable templates, block variants, domain block sets, style packs, relation patterns, composition templates, agent-readable template summaries, and package/studio implications.

---

## 1. Executive Summary

本轮调研的核心结论：

```text
Coincides should let users customize high-level templates and styles,
not low-level system block primitives.
```

也就是说：

```text
Closed / system-owned:
  system_type
  core renderer primitives
  source/evidence/proposal safety rules
  ObjectRelation semantics

Open / user-customizable:
  template variants
  composition templates
  field layouts
  style packs
  relation display presets
  canvas backgrounds
  arrow/shape/frame/table styles
  domain block sets
```

原因：

- 底层 system type 太开放会导致产品失控；
- 模板和样式开放可以极大扩展用户能力；
- agent 需要读懂模板适用场景；
- 未来 `.coincides` package / Package Studio 需要承载模板包和样式包；
- learning-specific blocks 可以成为未来 domain-specific blocks 的样本。

最重要的规则：

```text
Users customize expression and structure.
Coincides protects truth, source, evidence, and safety semantics.
```

---

## 2. Why This Matters

Coincides 的对象系统正在从学习场景扩展到更大的信息加工中台。

未来可能有：

- learning block set；
- research/report block set；
- intelligence collection block set；
- gaming information block set；
- engineering formula block set；
- literature analysis block set；
- investigation/source review block set。

如果每个领域都由开发者硬编码，会不可维护。

所以需要：

```text
Template / Style / Domain Pack Engine
```

但这套 engine 不能一开始就变成：

```text
让普通用户改底层编辑器类型、渲染引擎、数据库 schema。
```

正确方向：

```text
固定底层能力
开放上层模板
让 agent 理解模板
让 package/studio 管理模板
```

---

## 3. Reference Findings

### 3.1 Tana Supertags

Tana 的 supertags 是最重要参考之一。

关键启发：

- supertags 可以把普通 node 变成 typed object；
- supertag 可以定义 content template；
- 可以添加 fields、pinned fields、optional fields；
- fields 可以 AI-enhanced / auto-filled；
- supertag 可以有 AI instructions；
- templates 可以带 command palette / event triggers；
- optional fields 避免对象过重；
- related content / shortcuts / default child supertag 提供结构扩展。

对 Coincides 的启发：

```text
Template is not just visual layout.
Template can define fields, defaults, AI behavior, relation expectations, and commands.
```

但 Coincides 需要更强的 source/evidence guardrail：

```text
AI autofill can suggest.
Source/evidence/proposal rules still decide what becomes accepted.
```

### 3.2 Anytype Types And Templates

Anytype 的关键启发：

- Type 用来定义对象大类；
- Template 用来细化同一 Type 下的创建流程；
- 官方建议 Type 通常保持 broad；
- 通过 Templates 做更个性化、重复性结构；
- Template 属于 Type 级别，可以有多个。

这非常支持 Coincides 的既有方向：

```text
system_type stays broad and closed.
template_id becomes rich and extensible.
```

例如：

```text
system_type = text
learning_role = definition
template_id = definition.basic / definition.math / definition.engineering
```

Anytype 的模式提醒我们：

```text
Do not create endless system types.
Create broad system types with many templates.
```

### 3.3 Notion Templates And Synced Blocks

Notion 的参考价值在于：

- 用户喜欢模板；
- synced blocks 说明 reusable content 很强；
- database templates 可以让新页面自动拥有结构；
- buttons/templates 可以自动插入结构；
- 但 synced blocks 也容易让用户混淆“模板”和“同步实例”。

对 Coincides 的启发：

```text
Template instance and synced/shared object must be separate concepts.
```

如果用户从模板创建一个 NoteBlock：

```text
template definition
  -> template instance / NoteBlock
```

之后改模板，不应该静默改所有旧 NoteBlocks，除非这是显式 synced/template-linked behavior。

未来需要区分：

- instantiate from template；
- linked template instance；
- synced block；
- template migration proposal。

### 3.4 Obsidian Templates And Plugin Ecosystem

Obsidian 的启发：

- plain files and plugins create a strong extension culture；
- templates can be simple text snippets or powered by plugins；
- community plugin ecosystem expands use cases；
- users tolerate power-user workflows when base system is stable and transparent。

对 Coincides 的启发：

```text
Advanced users may want code-like template editing later.
```

但普通用户仍需要 friendly UI.

Possible dual path:

```text
Basic:
  form-based template builder
  field editor
  style selector
  preview

Advanced:
  JSON/YAML/code-like template definition
  package manifest
  relation pattern config
  agent instruction config
```

### 3.5 Design Tokens / Style Systems

Style customization should not be scattered.

Future style packs should cover:

- typography；
- spacing；
- color；
- block chrome；
- canvas background；
- frame style；
- arrow style；
- shape style；
- table style；
- callout style；
- sticker/emoji/meme assets；
- flowchart presets。

This should be data-driven, not hardcoded per component.

---

## 4. Proposed Customization Layers

Coincides should separate customization layers.

### 4.1 System Type Layer

Owned by Coincides.

Examples:

```text
text
latex
code
source_quote
task
media
table
canvas_visual
relation_visual
```

Rules:

- closed by default；
- changed only through product/version work；
- controls renderer/editor capability；
- not user-editable in normal UI。

### 4.2 Semantic Role Layer

Partly system-owned, partly extensible later.

Examples:

```text
definition
theorem
proof
formula
example
exercise
answer
warning
source
concept
claim
observation
question
summary
```

Rules:

- seeded by Coincides；
- user/domain packs may add roles later；
- roles should not imply low-level renderer capability；
- roles influence AI and relation patterns。

### 4.3 Template Variant Layer

Open and user-customizable.

Examples:

```text
definition.basic
definition.math
definition.engineering
formula.math
formula.physics
example.case-study
exercise.exam-style
source.quote
briefing.key-findings
```

Rules:

- main user-facing customization layer；
- can define fields, defaults, renderer hints, source behavior, relation hints, AI summaries；
- belongs in package/template library。

### 4.4 Composition Template Layer

This is very important.

Composition template is not a full note template only.

It can define a partial section:

```text
formula sheet section
theorem + proof + example section
case comparison section
source evidence summary section
briefing section
timeline section
investigation clue cluster
```

Composition template may include:

- multiple NoteBlock templates；
- relation patterns；
- canvas layout hints；
- view preset hints；
- source citation rules；
- export behavior。

This matches Henry's "partial template" idea.

### 4.5 Style Pack Layer

Style pack controls visual expression.

Examples:

```text
minimal academic
exam prep
dark board
hand-drawn
engineering schematic
investigation board
presentation clean
```

Style pack may define:

- block border；
- arrow style；
- frame style；
- background；
- table style；
- callout style；
- icon/sticker set；
- flowchart theme。

Style pack should not change source/evidence truth.

### 4.6 Domain Pack Layer

Domain pack groups templates, styles, roles, relation patterns, and agent hints.

Examples:

```text
Learning Math Pack
Mechanical Engineering Pack
Legal Research Pack
Game Information Research Pack
Investigative Report Pack
News Briefing Pack
```

Domain pack may include:

- template variants；
- composition templates；
- relation type suggestions；
- style packs；
- ViewPresets；
- agent instructions；
- example prompts；
- source handling preferences。

This is likely a v2.5+ or v3.x package/studio feature.

---

## 5. Template Definition Draft

Future template definition may include:

```json
{
  "template_id": "formula.math",
  "label": "Math Formula",
  "system_type": "latex",
  "learning_role": "formula",
  "domain_tags": ["math"],
  "description": "A source-grounded mathematical formula block.",
  "summary_for_agent": "Use this when the source contains a reusable mathematical formula or equation that should be referenced or derived.",
  "fields": [
    {
      "id": "statement",
      "type": "latex",
      "label": "Formula"
    },
    {
      "id": "variables",
      "type": "list",
      "label": "Variables",
      "optional": true
    }
  ],
  "default_content": {},
  "renderer_hint": "formula-card",
  "editor_behavior": {
    "primary_field": "statement"
  },
  "source_behavior": {
    "source_reference_allowed": true,
    "source_reference_recommended": true
  },
  "proposal_behavior": {
    "proposal_allowed": true,
    "requires_review": true
  },
  "relation_behavior": {
    "suggested_relation_types": ["derives_to", "depends_on", "explains"],
    "can_be_relation_endpoint": true
  },
  "canvas_behavior": {
    "default_width": 360,
    "default_height": 160,
    "preferred_ports": ["left", "right", "result"]
  }
}
```

Important:

```text
summary_for_agent is not decoration.
It helps AI choose templates correctly.
```

---

## 6. Agent-readable Template Metadata

Agent must know:

- when template applies；
- what fields mean；
- what source evidence is required；
- what relation types are expected；
- whether template is safe for proposal；
- whether it supports canvas layout；
- what output style it implies；
- what not to use it for。

Recommended fields:

```text
summary_for_agent
use_when
do_not_use_when
required_evidence
relation_patterns
example_inputs
example_outputs
quality_checks
allowed_operations
```

This supports:

- AI note proposal；
- AI layout；
- AI report；
- AI tutor；
- AI quality monitor；
- repeated regeneration without drift。

---

## 7. User Experience Boundaries

### 7.1 Normal User Path

Normal users should see:

- choose template；
- edit fields；
- preview；
- duplicate template；
- adjust style；
- save as custom template；
- choose domain pack；
- apply to selected blocks。

They should not see:

- renderer internals；
- database schema；
- low-level system type creation；
- raw relation graph config；
- unsafe code execution。

### 7.2 Advanced User Path

Advanced users may later edit:

- JSON/YAML template definition；
- relation pattern；
- style token；
- package manifest；
- agent instruction；
- validation rules。

This should be a separate advanced editor or Package Studio, not the everyday note UI.

---

## 8. Template Instance Semantics

Important distinction:

```text
TemplateDefinition:
  reusable blueprint.

TemplateInstance / NoteBlock:
  created object.

SyncedInstance:
  special linked object that updates with source.

TemplateMigrationProposal:
  proposed update from old template version to new template version.
```

Default behavior:

```text
Changing a template does not silently rewrite old NoteBlocks.
```

If old blocks should update:

```text
create migration proposal
review
apply
```

This avoids Notion-style synced/template confusion.

---

## 9. Relation Pattern Templates

Templates can suggest relations.

Example:

```text
theorem.basic:
  theorem -> proof
  theorem -> example
  theorem -> prerequisite concept
```

But relation pattern should not silently create accepted ObjectRelations.

Recommended flow:

```text
template suggests relation pattern
AI/user creates relation proposal
review/apply creates ObjectRelation
CanvasEdge may render relation if view shows it
```

This keeps RelationLayer clean.

---

## 10. Style Customization

Future style customization should include:

- block visual chrome；
- canvas background；
- arrow style；
- shape style；
- frame style；
- table style；
- flowchart style；
- stickers / emoji / meme-like assets；
- presentation theme。

But style must stay separate from truth.

Rules:

- style pack may change appearance；
- style pack may define default view presentation；
- style pack may not change source evidence；
- style pack may not silently change relation semantics；
- style pack should be packageable。

---

## 11. Relationship To ViewPreset

Template and view are related but not identical.

```text
Template:
  defines object structure and behavior.

ViewPreset:
  defines how objects are selected, filtered, arranged, and operated on.

StylePack:
  defines visual expression.

CompositionTemplate:
  defines a reusable group/section pattern.
```

Example:

```text
Formula Sheet ViewPreset:
  selects formula blocks.

formula.math Template:
  defines each formula block structure.

formula-sheet CompositionTemplate:
  defines sections and grouping.

exam-prep StylePack:
  defines compact visual style.
```

These should not be collapsed into one object.

---

## 12. v2.4 / v2.5 / v3.x Impact

### v2.4

v2.4 should reserve:

- CanvasNode style references；
- CanvasEdge visual_style；
- template_id on NoteBlocks；
- relation pattern hints in docs；
- selectable object scope for template application。

But v2.4 should not build full template/style studio.

### v2.5

v2.5 is the natural candidate for:

- user-facing template editor seed；
- composition template seed；
- style pack seed；
- domain pack manifest；
- package template export/import；
- agent-readable template summaries。

### v3.x

v3.x may turn template/domain packs into a major ecosystem layer:

- graph-native relation patterns；
- Neo4j-backed object schemas；
- domain-specific knowledge packs；
- community package sharing；
- quality agent feedback loops。

---

## 13. Recommendations

### Recommendation 1

Keep system types closed in v2.x.

User customization should focus on templates, style packs, composition templates, and domain packs.

### Recommendation 2

Treat `summary_for_agent` and `relation_behavior` as first-class template metadata.

This is what lets AI choose the right template instead of guessing from labels.

### Recommendation 3

Separate TemplateDefinition, TemplateInstance, SyncedInstance, and TemplateMigrationProposal.

This prevents template edits from silently rewriting existing knowledge objects.

### Recommendation 4

Build composition templates earlier than a full template marketplace.

They are the bridge between single NoteBlocks and full reports/canvas sections.

### Recommendation 5

Make style packs packageable but non-semantic.

Style can influence display, not truth.

---

## 14. Open Questions

- Should user-created learning roles be allowed in v2.5, or only user-created template variants?
- Should domain packs define relation types, or only suggest existing relation types?
- Should templates be course-local, workspace-local, package-local, or global?
- How should template versioning work?
- How should old NoteBlocks migrate when template changes?
- Should style packs be allowed to include assets/stickers?
- Should advanced template editing use JSON, YAML, or a form-first editor?
- Should template quality checks be executable rules or AI-readable guidance?
- Should agent-generated templates be allowed, and if so, must they be proposal-first?
- Should template packs be shareable through `.coincides` packages before a full Package Studio exists?

---

## 15. Final Position

Coincides should move toward:

```text
fixed system capabilities
  + extensible semantic templates
  + composition templates
  + style packs
  + domain packs
  + agent-readable metadata
```

not:

```text
unlimited user-defined low-level block types
```

The stable principle:

```text
Users customize structure, expression, and domain behavior.
Coincides protects truth, source, evidence, proposal safety, and core semantics.
```

---

## 16. Sources

- Tana Supertags: https://tana.inc/docs/supertags
- Tana Fields: https://tana.inc/docs/fields
- Tana Templates: https://tana.inc/docs/tana-templates
- Tana AI: https://tana.inc/docs/tana-ai
- Anytype Types: https://doc.anytype.io/anytype-docs/basics/types
- Anytype Templates: https://doc.anytype.io/anytype-docs/getting-started/types/templates
- Notion Synced Blocks: https://www.notion.com/en-gb/help/synced-blocks
- Notion Block API: https://developers.notion.com/reference/block
- Obsidian Help: https://help.obsidian.md/
- Obsidian data storage: https://help.obsidian.md/data-storage
