# v2.4 Multi-view Projection / View Preset Reference

**Created**: 2026-05-22
**Status**: Research report 1
**Scope**: Multi-view projection, view presets, canvas presets, graph views, page-like views, presentation/export views, and the boundary between view configuration and knowledge truth.

---

## 1. Executive Summary

本轮调研的核心问题：

```text
Coincides 能不能坚持单一对象图 / 单一知识结构，
同时支持多种阅读、编辑、展示、导出和 AI 视图？
```

当前结论：

```text
Yes, but only if ViewPreset becomes a first-class concept.
```

Coincides 不应该复制 AFFiNE 的双模式：

```text
document mode
edgeless mode
```

也不应该让 Canvas 成为唯一视图。

更合适的模型是：

```text
same source-grounded objects
  -> multiple projections
  -> multiple view presets
```

关键区别：

```text
Knowledge objects:
  NoteBlock / SourceAnchor / EvidenceSet / ObjectRelation

Projection objects:
  CanvasNode / CanvasEdge / ViewPreset

Output objects:
  PDF / HTML / PNG / presentation export
```

最重要的规则：

```text
View changes how objects are seen and operated on.
View must not silently change what objects are.
```

---

## 2. Why Multi-view Matters

Coincides 不是普通笔记应用。

同一批对象可能需要不同视图：

- page-like reading view；
- canvas workspace view；
- graph/relation view；
- source inspection view；
- presentation/report view；
- export view；
- AI operation view；
- package preview view。

如果这些视图各自维护一套内容，就会产生分裂：

```text
文档里一份内容
画布上一份内容
图谱里一份内容
导出里一份内容
AI 读的又是另一份内容
```

这会破坏 source grounding、relation、proposal history、AI-readable structure。

所以 Coincides 需要：

```text
single object graph
multiple projection presets
```

---

## 3. Reference Findings

### 3.1 Notion Views

Notion 的 database views 是最清晰的 ViewPreset 参考之一。

重要发现：

- View 是 first-class resource；
- view 定义同一数据源如何被 filter / sort / group / layout；
- view type 可以是 table、board、calendar、timeline、gallery、list、form、chart；
- linked view 可以在不同页面展示同一数据源的不同子集；
- 修改 view 设置不等于修改底层数据；
- 修改 view 里的数据会反映到底层数据源。

对 Coincides 的启发：

```text
ViewPreset should store selection/filter/layout rules,
not duplicate knowledge objects.
```

Notion 的强项：

- 同一数据源，多种 view；
- view-specific filter/sort/group；
- linked view；
- dashboard。

Coincides 需要扩展它：

- source/evidence/relation-aware；
- canvas/graph/source/presentation-aware；
- AI operation-aware；
- package/export-aware。

### 3.2 AFFiNE / BlockSuite

AFFiNE / BlockSuite 的关键启发：

```text
same document object can be shown through page editor or edgeless editor.
```

它证明了：

- document/canvas 可以共享对象；
- edgeless mode 可以包含 page-like content；
- presentation/slideshow 可以从 edgeless surface 产生；
- page editor 和 edgeless editor 不必是完全分裂的数据宇宙。

对 Coincides 的启发：

```text
Do not treat canvas as a separate document.
Treat it as one projection among several.
```

但 Coincides 不应照搬双模式 UI。

Henry 已经确定：

```text
Coincides should be canvas-first single-surface,
not AFFiNE-style dual document/canvas mode.
```

因此 Coincides 更应该有：

```text
ViewPreset:
  page-like
  canvas
  graph
  source
  presentation
```

而不是：

```text
DocumentMode vs CanvasMode
```

### 3.3 Obsidian Canvas / Graph / Backlinks

Obsidian 的启发是双重的。

优点：

- markdown vault 是稳定 source；
- links create graph；
- graph view represents links；
- canvas can embed existing notes/media；
- canvas helps visual thinking。

风险：

- Canvas links and graph/backlink system can feel separated；
- visual canvas relation may not always become vault-level backlink；
- graph view may not reflect canvas-only connections；
- user may expect canvas relationships to participate in knowledge graph。

对 Coincides 的启发：

```text
Canvas relations and graph relations must have a clear bridge.
```

这正好对应前面报告的规则：

```text
CanvasEdge is visual.
ObjectRelation is semantic.
RelationLayer decides visibility/use.
```

ViewPreset 必须知道：

- 是否显示 visual edges；
- 是否显示 relation-backed edges；
- 是否显示 selected relation layers；
- 是否隐藏 AI-only layers；
- 是否把 source evidence relation 纳入 view。

### 3.4 Heptabase

Heptabase 的核心启发：

- card + whiteboard 是知识组织方式；
- whiteboard 可以发布为 read-only public link；
- public link 可以是 live，也可以是 snapshot；
- 版本恢复包含 layout、sections、text content、mindmaps、card positions/colors；
- 复杂白板性能会受 cards、images、videos、math blocks、mindmaps 和 references 数量影响；
- AI/MCP 能读取 card/object，但大对象可能需要避免一次性读取。

对 Coincides 的启发：

```text
ViewPreset should support live view vs snapshot view.
```

也提醒我们：

- canvas view 可能很重；
- package/export 需要 snapshot；
- presentation/share view 可能不同于 edit view；
- AI 读取 view 时需要 scope，不应一次吞整个大 whiteboard。

### 3.5 XMind / Mind Map / Outline

XMind 的启发：

- 同一 mind map 可以有视觉图和 outline；
- project file 保留可编辑结构；
- 用户常常需要从图形切换到线性大纲。

对 Coincides 的启发：

```text
Graph/canvas objects may need outline-like view.
```

这对学习很重要：

- proof chain 可以是 graph；
- 也可以是 ordered reading path；
- formula derivation 可以是 flow；
- 也可以是 step list。

因此 ViewPreset 不只是视觉样式，而是选择阅读/操作方式。

### 3.6 Figma / FigJam / Miro

这些工具的启发主要在 presentation/share。

共同点：

- board/canvas 可以作为 collaboration surface；
- frames 可以成为 presentation units；
- sharing 可以是 live link；
- export 可以是 PNG/PDF；
- presentation mode 和 edit mode 不同。

对 Coincides 的启发：

```text
Frame / section may become presentation unit.
```

但 Coincides 还需要 source/evidence/relation：

```text
Presentation view should not lose source grounding.
```

---

## 4. Proposed View Taxonomy

Coincides 应该区分：

```text
ViewPreset
CanvasPreset
ExportPreset
RelationFilter
TemplateLayout
```

### 4.1 ViewPreset

ViewPreset 是用户或系统保存的一种“看同一批对象的方法”。

它可以定义：

- view type；
- object scope；
- source scope；
- relation layers；
- filters；
- sorting；
- grouping；
- layout mode；
- visible fields；
- presentation mode；
- AI operation constraints；
- export defaults。

Examples:

```text
Chapter 3 Reading View
Green Theorem Graph View
Exam Formula Sheet View
Source Evidence Inspection View
One-page Briefing View
AI Review Debug View
```

### 4.2 CanvasPreset

CanvasPreset 是 canvas surface 的形态。

Examples:

```text
A4 portrait
A4 landscape
large board
infinite canvas
presentation frames
source board
```

CanvasPreset 决定：

- dimensions；
- background；
- grid；
- zoom defaults；
- frame/page rules；
- snap rules；
- printable boundary。

CanvasPreset 不应决定哪些知识对象是真相。

### 4.3 ExportPreset

ExportPreset 是导出规则。

Examples:

```text
PDF A4
HTML report
PNG board snapshot
presentation slides
light package preview
```

它决定：

- export format；
- pagination；
- scale；
- include source references；
- include relation legend；
- include hidden layers；
- include notes/proposal metadata。

### 4.4 RelationFilter

RelationFilter 决定哪些 relation 被这个 view 使用或展示。

Examples:

```text
accepted only
source-backed only
formula derivation
AI reading-order layer
Green theorem topic layer
exclude rejected/stale
```

RelationFilter 可以被 ViewPreset 引用。

### 4.5 TemplateLayout

TemplateLayout 决定某种内容如何排布。

Examples:

```text
definition + examples section
formula sheet section
proof chain layout
comparison table
briefing card set
```

TemplateLayout 可以帮助 AI 生成 ViewPreset 或 Canvas layout proposal。

---

## 5. ViewPreset Data Model Draft

Possible conceptual model:

```text
view_presets:
  id
  user_id
  course_id
  title
  view_kind
  target_type
  target_id
  scope_json
  relation_filter_json
  layout_json
  presentation_json
  export_json
  ai_policy_json
  status
  metadata
  created_at
  updated_at
```

Possible `view_kind`:

```text
page_reading
canvas_workspace
graph_view
source_inspection
presentation
report
ai_operation
package_preview
```

Important:

```text
ViewPreset should reference objects.
It should not duplicate NoteBlock truth.
```

---

## 6. Page-like View

Page-like view matters because:

- some users prefer linear reading；
- PDF export needs page boundaries；
- reports/briefings need readable order；
- AI explanations often need sequence。

Canvas-first does not mean page-like reading is impossible.

Recommended model:

```text
page-like view = ViewPreset over the same objects
```

It may use:

- A4 CanvasPreset；
- ordered CanvasNodes；
- frame/section order；
- relation-derived reading path；
- template layout；
- export preset。

This preserves the single-object model while supporting classic reading.

---

## 7. Canvas Workspace View

Canvas workspace view is for:

- arranging ideas；
- comparing sources；
- spatial reasoning；
- selecting object scopes；
- AI layout proposals；
- relation visualization；
- mixed media/reference work。

It should show:

- CanvasNodes；
- CanvasEdges；
- frames；
- visible relation layers；
- source badges；
- selected scopes；
- proposal states。

It should not:

- duplicate NoteBlock content as separate truth；
- silently turn visual edge into relation；
- require all users to use infinite canvas。

---

## 8. Graph View

Graph view is relation-driven.

It should be generated from:

```text
ObjectRelation
RelationLayer
NoteBlock / SourceAnchor / EvidenceSet endpoints
```

not from raw CanvasEdge geometry alone.

Graph view use cases:

- topic-specific extraction；
- proof chain；
- formula derivation；
- source evidence map；
- prerequisite map；
- AI reading path；
- conflict network。

Graph view should support:

- relation filters；
- node type filters；
- layer selection；
- auto-layout；
- source/evidence badges；
- jump to canvas/page/source。

It may use graph libraries later, but its truth is ObjectRelation.

---

## 9. Source Inspection View

Source inspection view should focus on:

- SourceSnapshot；
- SourceAnchor；
- SourceScope；
- EvidenceSet；
- related NoteBlocks；
- source-backed relations。

It is not the same as canvas view.

But it can be embedded into or launched from canvas:

```text
CanvasNode -> SourceAnchor -> Source Inspection View
```

ViewPreset should let source inspection show:

- selected source scopes；
- related notes；
- evidence decisions；
- conflicts/exclusions；
- jump-back targets。

---

## 10. Presentation / Report View

Presentation/report view is not just export.

It is a view optimized for an audience:

- ordered sections；
- readable layout；
- source citations；
- relation summaries；
- minimal editing chrome；
- optional live/snapshot mode；
- export defaults。

This matters because Coincides may generate:

- study handout；
- source-backed briefing；
- investigation report；
- formula sheet；
- game information guide；
- research digest。

ViewPreset should eventually describe:

```text
audience
purpose
section order
included relation layers
source citation style
export preset
```

---

## 11. AI Operation View

AI operation view is a special view used by AI and advanced users.

It may contain:

- selected objects；
- active relation layers；
- source/evidence context；
- operation strength；
- preserve/allow/forbid constraints；
- proposal output target。

This connects to the extra idea:

```text
select objects
  -> ask AI
  -> generate proposal
  -> review / apply
```

AI operation view may be temporary, not user-saved by default.

But future advanced workflows may save it as:

- review preset；
- tutor mode；
- report generation preset；
- quality monitoring preset。

---

## 12. Live View vs Snapshot View

Heptabase and presentation tools reveal a key distinction:

```text
Live view:
  updates as underlying objects change.

Snapshot view:
  frozen at a point in time.
```

Coincides needs both.

Examples:

```text
Live study map:
  always shows latest accepted NoteBlocks and relations.

Snapshot report:
  preserves a fixed submitted version.
```

ViewPreset should include:

```text
mode:
  live
  snapshot
```

Snapshot may store:

- object IDs；
- object versions；
- rendered layout；
- source snapshot references；
- export artifacts；
- package checksum。

This will matter for `.coincides` packages, reports, and academic/work submissions.

---

## 13. View Changes vs Object Changes

Critical rule:

```text
Changing a view should not silently change object truth.
```

Examples:

- hiding a relation in a view does not reject the relation；
- sorting blocks in a view does not rewrite NoteBlock truth；
- moving CanvasNode changes projection layout, not source；
- filtering source scopes does not delete sources；
- presentation snapshot does not freeze the original objects unless explicitly versioned；
- editing a NoteBlock content from any view changes the NoteBlock truth through proper domain rules。

This requires clear UI language later:

```text
Edit view
Edit object
Apply proposal
Create snapshot
Export
```

---

## 14. v2.4 / v2.5 / v3.x Impact

### v2.4.1

Do not implement full ViewPreset yet.

But v2.4.1 should avoid choices that block it:

- keep CanvasNode as projection；
- keep layout separate from object truth；
- keep viewport/session state separate；
- store canvas preset / dimensions cleanly；
- keep relation layer selection possible later。

### v2.4.3

Agent Canvas Layout Proposal should begin thinking in:

```text
layout proposal for a view
```

not just:

```text
move nodes around
```

### v2.4.4

RelationLayer and ObjectRelation should support:

- graph view；
- topic view；
- hidden AI reading view；
- relation-backed canvas view。

### v2.5

Package Studio / Template Engine should consider:

- template-defined view presets；
- composition template -> view preset；
- style pack -> view style；
- package includes saved views；
- export presets。

### v3.x

Graph-native transition should make views first-class enough to:

- extract subgraphs；
- generate presentation/report views；
- preserve view history；
- migrate v2.x ViewPresets。

---

## 15. Recommendations

### Recommendation 1

Do not copy AFFiNE dual mode.

Use:

```text
single object graph + multiple view presets
```

### Recommendation 2

Introduce ViewPreset concept in docs before code.

It does not need to be implemented in v2.4.1, but should guide canvas/relation/package design.

### Recommendation 3

Keep CanvasPreset separate from ViewPreset.

CanvasPreset describes surface dimensions and canvas behavior.

ViewPreset describes which objects/relations/sources are shown and how they are used.

### Recommendation 4

Treat Presentation/Report as views before treating them as exports.

Export is output.

Presentation/report view is a reusable projection.

### Recommendation 5

Support live vs snapshot view semantics eventually.

This matters for sharing, package, report, and reproducibility.

---

## 16. Open Questions

- Should `view_presets` be introduced in v2.4.3 or deferred to v2.5?
- Should Canvas A4 mode be a CanvasPreset, ViewPreset, or both?
- Should Graph View be stored as ViewPreset or generated ad hoc from RelationLayer?
- Should AI operation scope be saved as a temporary ViewPreset?
- Should package export include all views or selected views?
- Should snapshot views store full object copies or object version references?
- Should presentation view be frame-based, section-based, or relation-path-based?
- How should view permissions/privacy work when package sharing arrives?
- Should source inspection view be its own view_kind or a panel over other views?

---

## 17. Final Position

Coincides should not choose between:

```text
document app
canvas app
graph app
source viewer
presentation tool
```

It should build:

```text
source-grounded objects
  + relation layers
  + multiple view presets
```

The stable rule:

```text
Objects are truth.
Relations are meaning.
Views are ways of seeing and operating.
Exports are outputs.
Packages are portable workspaces.
```

---

## 18. Sources

- Notion View object: https://developers.notion.com/reference/view
- Notion Working with Views: https://developers.notion.com/guides/data-apis/working-with-views
- Notion views, filters, sorts and groups: https://www.notion.com/help/views-filters-and-sorts
- Notion linked views: https://www.notion.com/help/notion-academy/lesson/linked-views
- BlockSuite Edgeless Editor: https://blocksuite.io/components/editors/edgeless-editor
- BlockSuite document-centric article: https://blocksuite.io/blog/document-centric.html
- Obsidian Canvas: https://obsidian.md/help/plugins/canvas
- Obsidian Graph View: https://obsidian.md/help/Plugins/Graph%2Bview
- Heptabase public whiteboard links: https://support.heptabase.com/en/articles/12121546-how-do-i-publish-whiteboards-with-a-public-link
- Heptabase version history restore: https://support.heptabase.com/en/articles/10448124-how-to-restore-cards-and-whiteboards-from-version-history
- Heptabase performance guidance: https://support.heptabase.com/en/articles/11430704-troubleshooting-performance-and-lag-issues-in-heptabase
- Heptabase MCP: https://support.heptabase.com/en/articles/12679581-how-to-use-heptabase-mcp
- JSON Canvas specification: https://jsoncanvas.org/spec/1.0
- Obsidian Canvas product page: https://obsidian.md/canvas
