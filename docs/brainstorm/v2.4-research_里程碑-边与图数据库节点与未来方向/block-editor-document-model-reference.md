# v2.4 Block Editor / Document Object Model Reference

**Created**: 2026-05-22
**Status**: Research report 1
**Scope**: Block editor internals, document tree models, editor schema, selection/command/history, NoteBlock editor upgrade path, and boundaries between editor nodes and Coincides domain objects.

---

## 1. Executive Summary

本轮调研的核心结论：

```text
Coincides needs a better NoteBlock editor over time,
but the editor document model must not become the Coincides domain model.
```

成熟 editor 都有自己的内部模型：

- document tree；
- schema；
- nodes / marks / inline content；
- selection；
- commands；
- history；
- plugins / extensions；
- serialization。

这些能力非常有价值。

但 Coincides 的核心对象是：

```text
NoteBlock
SourceAnchor
EvidenceSet
ObjectRelation
RelationLayer
Proposal
CanvasNode
ViewPreset
```

所以最重要的规则是：

```text
EditorNode edits content.
NoteBlock owns learning truth.
```

推荐方向：

```text
v2.4:
  do not replace NoteBlock editor yet.
  keep editor simple while Canvas/Relation model stabilizes.

v2.5:
  consider a richer editor adapter if template/block editing becomes painful.

v3.x:
  decide whether editor model becomes a replaceable adapter over graph-native objects.
```

---

## 2. Why This Matters

我们现在已经明确：

```text
NoteBlock 是 v2.x 的主要知识对象。
CanvasNode 是投影。
ObjectRelation 是语义关系。
```

如果未来换一个成熟 editor，而它接管了 document truth，就会出现危险：

```text
editor document says one thing
Coincides NoteBlock says another thing
source evidence points somewhere else
canvas projection references stale object
AI reads wrong structure
```

因此，调研 editor 不是为了“换一个漂亮输入框”。

而是为了回答：

```text
成熟 editor 的哪些能力可以借用？
哪些能力必须隔离在 adapter 后面？
哪些 Coincides 业务对象不能被 editor state 吃掉？
```

---

## 3. Reference Findings

### 3.1 BlockSuite

BlockSuite 是最接近 Coincides 需求的架构参考。

重要发现：

- each `doc` manages an independent block tree；
- blocks are defined through `BlockSchema`；
- schema describes fields and parent/child constraints；
- block type has unique `flavour`；
- block spec includes schema, service, and view；
- editor host maps block tree to UI components；
- selection manager has atomic selection types；
- block service stores block-specific behavior and APIs；
- same block model can have different component views and widgets。

对 Coincides 的启发：

```text
NoteBlockTemplateDefinition should eventually split schema / service / view.
```

Possible future split:

```text
schema:
  fields, validation, allowed child blocks

service:
  commands, source behavior, proposal behavior, relation behavior

view:
  editor rendering, read rendering, canvas rendering, export rendering
```

BlockSuite 还证明：

```text
same content model can support page editor and edgeless editor.
```

但不建议现在引入 BlockSuite：

- too large；
- likely editor-platform migration；
- source/evidence/proposal system still custom；
- v2.4 should focus on Canvas/Relation foundation。

### 3.2 ProseMirror

ProseMirror 是 rich text editor 的底层强参考。

重要发现：

- document conforms to schema；
- schema defines nodes and marks；
- schema defines parent/child relations；
- document is tree-shaped；
- editor state and transactions are core；
- marks style/annotate text without changing document tree structure；
- plugins/extensions can add behavior。

对 Coincides 的启发：

```text
Editor schema is valuable for text structure,
but it is not enough for source-grounded knowledge structure.
```

ProseMirror 很适合：

- rich inline editing；
- marks；
- nested document tree；
- transactions/history；
- custom nodes；
- collaborative editor foundations。

风险：

- ProseMirror schema can become its own truth model；
- mapping NoteBlock fields/source/relation into ProseMirror nodes is nontrivial；
- v2.x may not need this power yet。

### 3.3 Tiptap

Tiptap 是 ProseMirror 的高层封装。

重要发现：

- nodes and marks are extension-based；
- nodes define document structure；
- marks annotate text without changing structure；
- schema can be dynamically composed from extensions；
- commands can manipulate nodes/marks；
- custom extensions make feature development easier than raw ProseMirror。

对 Coincides 的启发：

```text
If Coincides needs rich editor upgrade, Tiptap may be easier than raw ProseMirror.
```

Potential fit:

- v2.5 template editor；
- rich NoteBlock field editing；
- inline source markers；
- formula/code/media editing；
- controlled custom node set。

Risk:

- still a ProseMirror document model；
- must remain adapter layer；
- not a source/evidence/proposal model。

### 3.4 Lexical

Lexical 是现代 editor runtime 参考。

重要发现：

- editor state stores current/future editor states；
- editor state contains node tree；
- custom nodes can define behavior；
- state updates are controlled；
- serialization/deserialization are explicit；
- React ecosystem fit is strong。

对 Coincides 的启发：

```text
Lexical could be a modern rich editor adapter candidate.
```

Potential fit:

- custom NoteBlock field editor；
- source marker inline nodes；
- controlled rich text；
- command/plugin model；
- future AI-assisted editing。

Risk:

- custom nodes are editor nodes, not knowledge objects；
- full migration would still require mapping to NoteBlock domain state；
- no direct solution for relation/source/evidence truth。

### 3.5 BlockNote

BlockNote is relevant because it provides a ready-to-use block editor model.

Important findings:

- document is a list of blocks；
- block has id, type, props, content, children；
- supports built-in blocks；
- supports custom schemas；
- supports inline content and styles；
- has ready-to-use React UI。

对 Coincides 的启发：

```text
BlockNote resembles what users expect from a block editor.
```

It may be useful for:

- faster NoteBlock editor upgrade；
- simple block tree editing；
- slash menu / drag handles / UI expectations；
- v2.5+ editor spike。

Risks:

- it is a general block editor；
- NoteBlock template/source/relation semantics still need adapter；
- if adopted directly, it may push Coincides toward generic document editing。

### 3.6 Notion Block API

Notion API shows a broad block taxonomy:

- paragraph；
- heading；
- list；
- quote；
- todo；
- equation；
- code；
- table；
- media；
- synced block；
- child page；
- child database。

Useful lessons:

- broad block coverage matters；
- block children and nesting matter；
- synced block semantics are powerful but confusing；
- API/editor distinction can be awkward；
- some UI behaviors are not cleanly exposed through API。

For Coincides:

```text
Avoid making API/editor mismatch too large.
Avoid template/synced instance confusion.
Keep source/evidence outside mere display block text.
```

---

## 4. Editor Model vs Domain Model

Coincides needs a clear boundary.

### 4.1 Editor Model

Editor model handles:

- rich text；
- inline formatting；
- local selection；
- cursor；
- undo/redo；
- text composition；
- paste；
- slash menu；
- drag handles；
- field editor UI；
- keyboard commands；
- local document tree。

### 4.2 Domain Model

Domain model handles:

- NoteBlock identity；
- source references；
- EvidenceSet；
- ObjectRelation；
- proposal lifecycle；
- template metadata；
- canvas projection；
- package/export；
- AI-readable state。

### 4.3 Rule

```text
Editor state can render and edit domain objects.
Editor state must not be the only durable truth for domain objects.
```

---

## 5. Recommended Adapter Pattern

Future rich editor should sit behind adapter:

```text
NoteBlock domain object
  -> EditorAdapter
  -> editor document / editor node
  -> user edit
  -> EditorAdapter
  -> NoteBlock update / proposal
```

Allowed direct update:

- plain text；
- content_json fields；
- formatting；
- local field edits。

Proposal-first update:

- source references；
- template migration；
- relation creation；
- generated rewrite；
- bulk selected object change；
- AI-created block tree；
- accepted semantic changes。

Editor adapter should provide:

- parse NoteBlock to editor state；
- serialize editor state to NoteBlock fields；
- preserve metadata；
- preserve unknown metadata；
- validate against template schema；
- expose selected object ids；
- expose inline source markers；
- avoid silently deleting source/evidence links。

---

## 6. NoteBlock Tree / Children

Current NoteBlock system is mostly flat or placement-based.

Mature editors suggest tree is inevitable.

Coincides needs some tree/composition ability for:

- proof steps；
- theorem/proof/example grouping；
- exercise/answer pairs；
- source quote + explanation；
- formula + variable explanations；
- report sections；
- composition templates；
- canvas frames/sections。

Possible approaches:

### A. Editor Tree Only

Use editor-internal tree.

Risk:

```text
Domain relations cannot reliably read the tree.
```

### B. Domain Composition Table

Add domain-level composition:

```text
note_block_compositions
  parent_block_id
  child_block_id
  relation_kind
  order_index
```

Good for source/evidence/AI/package.

### C. ObjectRelation Only

Represent containment via ObjectRelation.

Risk:

```text
UI order/layout and semantic relation get mixed too early.
```

Recommendation:

```text
Use domain composition/placement for structural containment.
Use ObjectRelation for semantic meaning.
Do not rely on editor tree alone.
```

---

## 7. Inline Content And Source Markers

Editor may need inline features:

- bold/italic；
- formula snippets；
- links；
- citations；
- source markers；
- variables；
- mentions；
- tags；
- comments。

Potential model:

```text
content_json:
  stores field/body structure

inline editor state:
  stores rich text spans/marks

source marker:
  references SourceAnchor or SourceScope
```

Important:

```text
Inline source marker should reference SourceAnchor,
not paste citation text only.
```

---

## 8. Selection Model

This connects to the AI interaction idea.

Editor should eventually expose:

- selected text range；
- selected NoteBlock；
- selected child blocks；
- selected source markers；
- selected inline formula；
- selected comments。

Canvas exposes:

- selected CanvasNodes；
- selected CanvasEdges；
- selected frames；
- selected relation layers。

AI commands need both.

Recommended future model:

```text
selection_scope:
  source = editor | canvas | source_view | graph_view
  targets = [
    { target_type, target_id, range? }
  ]
```

This lets AI operate on precise object scopes.

---

## 9. Undo / History / Proposal

Editor undo and Coincides proposal history are different.

```text
Editor undo:
  local editing interaction history.

Proposal history:
  reviewable semantic/product operation history.
```

Do not merge them.

Examples:

- typing inside a paragraph: editor undo；
- applying AI rewrite proposal: proposal/apply history；
- accepting ObjectRelation: proposal/review/apply；
- moving CanvasNode: layout history, possibly direct；
- changing source reference: domain update/proposal。

Future issue:

```text
How does editor undo interact with autosaved NoteBlock updates?
```

This should be tested before adopting a rich editor.

---

## 10. v2.4 / v2.5 / v3.x Impact

### v2.4

Do not replace editor yet unless current editor blocks Canvas work.

Reserve:

- selected object IDs；
- NoteBlock target identity；
- content_json stability；
- template metadata；
- source marker references；
- editor adapter boundary。

### v2.5

Likely time for editor spike if template work needs it.

Candidate evaluation:

```text
Tiptap:
  rich, mature, ProseMirror ecosystem.

Lexical:
  modern, custom node, React-friendly.

BlockNote:
  block editor UI faster path.

BlockSuite:
  architecture reference; adoption still heavy.
```

### v3.x

If graph-native migration happens, editor should become:

```text
replaceable editor adapter over graph/domain objects
```

not the graph database itself.

---

## 11. Recommendations

### Recommendation 1

Do not adopt a full rich editor in v2.4.1.

v2.4.1 is about canvas interaction and data sovereignty. Editor replacement can wait.

### Recommendation 2

When editor upgrade begins, prefer adapter spike over full migration.

Evaluate Tiptap, Lexical, BlockNote, and BlockSuite with one or two real NoteBlock templates.

### Recommendation 3

Keep NoteBlock domain schema independent from editor schema.

Editor schema may be derived from template definition, but should not be the only truth.

### Recommendation 4

Implement domain-level composition separately from editor tree.

Editor tree helps editing. Domain composition helps AI, package, source, and relation.

### Recommendation 5

Selection model is strategic.

Any future editor should expose stable selected object/range targets for AI operations.

---

## 12. Open Questions

- Which editor candidate best supports structured fields plus rich text?
- Should each NoteBlock have its own editor state, or should a note be one editor document containing many blocks?
- How should editor autosave map to NoteBlock update API?
- Should inline source markers be marks, custom inline nodes, or external decorations?
- Should formulas be editor nodes, domain fields, or both?
- How should editor comments map to SourceAnchor / EvidenceSet / Proposal?
- Should AI-generated rewrites edit editor state directly or create NoteBlock proposal payloads?
- Should editor selection and canvas selection use one shared selection scope abstraction?
- Should template fields generate editor schema dynamically?
- How much editor state belongs in `.coincides` packages?

---

## 13. Final Position

The final editor direction should be:

```text
rich editor as replaceable adapter
over source-grounded NoteBlock domain objects
```

not:

```text
editor document as the whole Coincides truth.
```

Stable rule:

```text
EditorNode edits content.
NoteBlock owns learning truth.
ObjectRelation owns semantic meaning.
CanvasNode owns projection.
Proposal owns reviewed mutation.
```

---

## 14. Sources

- BlockSuite Working with Block Tree: https://blocksuite.io/guide/working-with-block-tree
- BlockSuite Block Schema: https://blocksuite.io/guide/block-schema
- ProseMirror reference: https://prosemirror.net/docs/ref/
- ProseMirror schema example: https://prosemirror.net/examples/schema/
- Tiptap Nodes and Marks: https://tiptap.dev/docs/editor/core-concepts/nodes-and-marks
- Tiptap Schema: https://tiptap.dev/docs/editor/core-concepts/schema
- Tiptap Extensions: https://tiptap.dev/docs/editor/core-concepts/extensions
- Tiptap node/mark commands: https://tiptap.dev/docs/editor/api/commands/nodes-and-marks
- Lexical Nodes: https://lexical.dev/docs/concepts/nodes
- Lexical Editor State: https://lexical.dev/docs/concepts/editor-state
- BlockNote Built-in Blocks: https://www.blocknotejs.org/docs/features/blocks
- BlockNote Document Structure: https://www.blocknotejs.org/docs/editor-basics/document-structure
- BlockNote Custom Schemas: https://www.blocknotejs.org/docs/custom-schemas
- Notion Block API: https://developers.notion.com/reference/block
- Notion Append Block Children API: https://developers.notion.com/reference/patch-block-children
