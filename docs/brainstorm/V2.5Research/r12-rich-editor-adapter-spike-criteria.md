# R12 - Rich Editor Adapter Spike Criteria

**Created**: 2026-05-23
**Status**: Research complete for Group 5
**Scope**: v2.5.x rich NoteBlock editor adapter evaluation criteria

---

## 1. 总览

R12 的核心问题是：

```text
如果当前 NoteBlock 编辑体验不够，
什么时候值得接入外部富文本 / block editor 工具？
接入时怎样避免它们污染 Coincides 的真相层？
```

调研结论：

- v2.5.0 不应接入外部 rich editor。
- 外部 editor 只能作为 adapter，不应成为 truth store。
- 只有当当前 editor 明确成为瓶颈时，才启动 spike。
- Spike 的目标不是找“最好看的编辑器”，而是验证 NoteBlock identity、template metadata、source markers、proposal-first 边界能否稳定保留。
- 默认优先级：Tiptap/ProseMirror 或 Lexical 作为可控 adapter 候选；BlockNote 作为快速 Notion-like UX 候选；Milkdown 适合 Markdown-heavy 场景；BlockSuite 继续作为架构参考，不作为短期依赖。

---

## 2. 当前 Coincides 边界

Coincides 已经形成明确分层：

```text
NoteBlock
  -> 内容语义对象

TemplateDefinition
  -> 内容字段、行为、AI 说明书

SourceAnchor / SourceScope / note_block_sources
  -> source truth

CanvasNode / CanvasFrame
  -> visual projection

CanvasEdge
  -> visual connector

ObjectRelation
  -> semantic relation

Proposal
  -> reviewed mutation

Editor state
  -> adapter-level UI state / cache
```

因此外部 editor 绝不能把这些对象重新打包成它自己的 document truth。

正确方向：

```text
Coincides owns truth.
Editor adapter owns interaction.
```

---

## 3. 什么情况才值得启动 spike

以下情况出现多个时，才值得启动 rich editor adapter spike：

- textarea-first editor 无法支持多字段模板编辑；
- inline source marker / relation marker 难以维护；
- formula、code、table、quote、checklist 编辑体验明显阻塞；
- block-level keyboard / selection / slash menu / drag handle 自研成本过高；
- template editor preview 需要更接近真实编辑器；
- composition template 的 slot editing 需要嵌套富文本；
- 用户实际测试确认 NoteBlock 编辑体验成为高频痛点；
- browser smoke 证明当前 editor 影响 v2.5/v2.6 核心使用。

不应因为“看起来更像 Notion”就接入。

不应为了视觉 polish 提前引入重 editor。

---

## 4. Hard Gate：必须通过的条件

任何候选 editor 都必须通过以下 gate。

### 4.1 NoteBlock identity 保留

编辑器内部节点必须能稳定映射到：

```text
note_block_id
template_definition_id / template_key
canvas_node_id if projected
```

如果 editor 删除、重建、拆分内部节点，Coincides 仍必须能追踪原始 NoteBlock identity。

### 4.2 Template metadata round-trip

以下信息必须无损往返：

```text
system_type
learning_role
template_key
template_version
field_schema
render_hints
source_behavior
relation_behavior
proposal_behavior
summary_for_agent reference
```

如果 editor 只能保存 HTML/Markdown 而无法保留 template metadata，就不适合作为核心 adapter。

### 4.3 Source markers 不可变成普通文本

source truth 不能藏进 editor JSON。

编辑器可以显示 source marker，但真实数据仍应在：

```text
note_block_sources
SourceAnchor
SourceScope
SourceSnapshot
```

编辑器删除可视 source marker 时，应该触发 source reference edit proposal 或明确 direct-safe action，而不是静默删除 source truth。

### 4.4 ObjectRelation 不可变成普通 link

语义关系不能只是 editor 内部链接。

可视链接或 mention 可以存在，但 confirmed semantic relation 必须仍在 `ObjectRelation`。

### 4.5 Proposal-first 不可绕过

AI rewrite、bulk migration、source-grounded structural changes、relation generation 必须继续 proposal-first。

Editor command 不能直接执行这些变更。

### 4.6 Adapter 可移除

删除 editor adapter 后，Coincides 必须能从自己的表重建可读内容：

```text
note_blocks.content_json
template_definitions
source refs
relations
canvas projection
```

editor snapshot 只能是 cache/sidecar，不是必需 truth。

---

## 5. Candidate: BlockNote

BlockNote 是 React block-based editor，官方介绍强调 Notion-like block 文档、开箱 UI、blocks、menu/toolbars、custom block types，并且建立在 ProseMirror/Tiptap 上。

优点：

- block-based，非常接近 NoteBlock 直觉；
- React 友好；
- 开箱 UX 强；
- 有 slash menu、drag/drop、nesting、format menu 等现成体验；
- 适合作为 Notion-like editor 快速体验 spike。

风险：

- 它有自己的 block document model；
- abstraction 较高，可能反过来塑造 Coincides 数据结构；
- license 需要谨慎：主包多为 MPL-2.0，XL packages 有 GPL-3.0 / commercial 相关限制；
- 要证明 custom block 可以稳定承载 Coincides template metadata；
- 不适合在 v2.5.0 直接接入。

建议定位：

```text
BlockNote = UX-rich block editor spike candidate
```

适合在未来验证：

- NoteBlock -> BlockNote block -> NoteBlock round-trip；
- custom template block；
- source marker display；
- adapter removal rebuild。

---

## 6. Candidate: Lexical

Lexical 是 Meta 的 extensible text editor framework，官方 README 强调 reliability、accessibility、performance、plugin architecture、immutable state、serialization、custom nodes、React bindings 和 MIT license。

优点：

- MIT license；
- framework-agnostic core + React bindings；
- plugin/custom node 模型强；
- accessibility/performance 方向成熟；
- 对细粒度 adapter 控制可能较好；
- 更适合做 Coincides-owned editor adapter。

风险：

- 不是天然 Notion-style block editor；
- 需要自己搭建 block-level UX；
- template-aware custom nodes 需要较多工程；
- table/formula/source marker 等能力需要逐步实现或组合插件。

建议定位：

```text
Lexical = controlled rich text / custom node adapter candidate
```

适合在需要高度控制 truth boundary 时评估。

---

## 7. Candidate: ProseMirror / Tiptap

ProseMirror 是 schema/state/view/transaction 体系；官方 guide 明确其 document model、state、view 等核心模块。Tiptap 是基于 ProseMirror 的 headless editor framework，官方文档强调 modular、headless、extensions、commands/events，并说明 open source 部分为 MIT license。

优点：

- schema 强；
- transaction 模型成熟；
- Tiptap 降低 ProseMirror 直接使用复杂度；
- extension 生态丰富；
- 可定制 schema 和 nodes；
- 与 BlockNote/Milkdown 的底层有共通性。

风险：

- 学习曲线陡；
- ProseMirror schema 可能与 Coincides template schema 产生双 schema 问题；
- Tiptap 部分高级能力可能是 paid/pro extension；
- 如果把 ProseMirror doc 当 truth，会污染 Coincides 数据边界。

建议定位：

```text
Tiptap = practical headless adapter candidate
ProseMirror = maximum-control lower-level option
```

如果要选一个最现实的工程 spike，Tiptap/ProseMirror 组合值得优先考虑。

---

## 8. Candidate: Milkdown

Milkdown 是 plugin-driven WYSIWYG Markdown editor framework，建立在 ProseMirror 和 remark 上，GitHub 显示 MIT license。

优点：

- Markdown 亲和；
- plugin-driven；
- MIT license；
- 适合 Markdown-heavy writing；
- ProseMirror 底层可带来 schema/editing 能力。

风险：

- Coincides 不是 Markdown-first 系统；
- NoteBlock/template/source/relation 语义比 Markdown 更重；
- 如果主输出变成 Markdown，source/relation/template metadata 会很难无损保留；
- 更适合作为 Markdown export/edit side path，而不是核心 NoteBlock editor。

建议定位：

```text
Milkdown = Markdown-oriented side adapter candidate
```

除非未来明确需要 Markdown-centric workflow，否则不是优先 spike。

---

## 9. Candidate: BlockSuite

BlockSuite 是 AFFiNE 背后的 content editing stack。官方文档强调 headless editor framework、Page/Edgeless editors、blocks/widgets/fragments、block specs、CRDT collaboration、复杂 editor UI 组件。

优点：

- 架构成熟；
- Page/Edgeless 双形态非常值得参考；
- block spec 包含 schema/view/service/logic 的分离思路很适合学习；
- fragments/widgets 可参考 toolbar、side panel、drag handle、outline 等设计；
- 对 canvas/document 统一方向有启发。

风险：

- 它是完整编辑技术栈，不只是一个小 adapter；
- 直接接入可能把 Coincides 变成 BlockSuite/AFFiNE 平台迁移；
- CRDT/store/block tree 可能与 Coincides SQLite/domain truth 冲突；
- 数据主权风险最高。

建议定位：

```text
BlockSuite = architecture reference first, dependency last
```

除非未来有专门版本做 BlockSuite adapter spike，否则 v2.5 不应把它作为依赖引入。

---

## 10. 推荐候选排序

如果未来需要 spike，建议排序：

```text
1. Tiptap / ProseMirror
   -> schema/control/extension 生态平衡最好

2. Lexical
   -> controlled custom node + accessibility/performance strong

3. BlockNote
   -> fastest Notion-like UX, but abstraction/license/truth boundary risk higher

4. Milkdown
   -> good Markdown path, not core NoteBlock truth path

5. BlockSuite
   -> architecture reference, not short-term dependency
```

这不是说 Tiptap 一定最好，而是说它最适合作为第一个严肃 adapter spike。

---

## 11. Adapter Contract

未来如果实现 editor adapter，应先定义接口，而不是直接把某个库塞进 UI。

候选接口：

```text
EditorAdapter
  -> loadFromNoteBlock(block, template)
  -> renderEditor(container, adapterState)
  -> serializeToContentJson()
  -> extractPlainText()
  -> extractSourceMarkerChanges()
  -> extractRelationMarkerChanges()
  -> validateAgainstTemplate()
  -> buildDirectSafePatch()
  -> buildProposalRequiredPatch()
  -> destroy()
```

关键规则：

- Adapter 产出 patch，不直接写库；
- direct-safe patch 可以保存；
- proposal-required patch 必须生成 proposal；
- adapter state 可以缓存，但不能成为 truth；
- adapter 移除后内容仍可读。

---

## 12. Spike 必测场景

任何候选工具都必须用真实 Coincides 场景测试。

最小测试模板：

```text
definition.basic
formula.math
source.quote
exercise.general
code.snippet
```

最小测试场景：

```text
1. Load existing NoteBlock into editor.
2. Edit text field.
3. Preserve template metadata.
4. Preserve source marker display.
5. Edit formula without destroying latex.
6. Add source quote marker.
7. Attempt unsafe relation/source deletion.
8. Generate direct-safe patch.
9. Generate proposal-required patch.
10. Save/reload.
11. Disable adapter and rebuild readable view from Coincides tables.
```

Pass 条件：

- no template metadata loss；
- no source truth loss；
- no ObjectRelation silent mutation；
- no editor-only document truth；
- rollback path clear；
- client build stable；
- browser smoke stable。

---

## 13. 不应该做的事

R12 明确禁止以下路线：

- 因为当前 UI 丑就急着接大型 editor；
- 让 editor JSON 成为 `note_blocks` 的唯一 truth；
- 把 source anchors 写成普通 link 后丢掉 source table；
- 把 ObjectRelation 写成普通 inline mention；
- 为了适配 editor 改掉 `TemplateDefinition` runtime；
- 为了 editor 方便绕过 proposal-first；
- 引入需要云服务或商业 license 的能力作为基础功能；
- 不能移除 adapter 的深度迁移。

---

## 14. v2.5.x Roadmap 影响

R12 不要求 v2.5.0-v2.5.5 立即接入 editor。

建议：

```text
v2.5.0
  -> 不接 editor，只做 runtime truth

v2.5.1
  -> Template Editor Seed 使用现有简单 UI

v2.5.2
  -> Composition Template Seed 使用 preview/proposal

v2.5.3-v2.5.5
  -> Package/migration/export-import 不依赖 editor

v2.5.6 or later
  -> 如果当前 editor 成为真实瓶颈，再做 adapter spike
```

R12 的价值是提前锁定标准，避免将来被某个 editor 的漂亮 UI 带偏。

---

## 15. Graph-Native 迁移启发

Editor adapter state 不是 graph truth。

未来 graph-native 中，可能需要：

```text
(:EditorAdapter)
(:EditorSnapshot)
```

但它们更可能是 cache/projection/operation metadata，而不是知识节点。

真正的 graph candidates 仍是：

```text
NoteBlock
TemplateDefinition
SourceAnchor
SourceScope
ObjectRelation
CompositionTemplate
PackageManifest
Proposal
```

v2.5 adapter spike 应记录：

- 哪些 editor state 可以 rebuild；
- 哪些 editor nodes 对应 real NoteBlocks；
- 哪些 editor marks 对应 source markers；
- 哪些 relation mentions 需要 proposal；
- 移除 adapter 后哪些内容会降级。

---

## 16. 参考来源

- BlockNote docs: https://www.blocknotejs.org/docs
- BlockNote GitHub/license notes: https://github.com/TypeCellOS/BlockNote
- Lexical GitHub: https://github.com/facebook/lexical
- ProseMirror guide: https://prosemirror.net/docs/guide/
- Tiptap docs: https://tiptap.dev/docs/editor/getting-started/overview
- Milkdown GitHub: https://github.com/Milkdown/milkdown
- BlockSuite docs: https://blocksuite.io/
- BlockSuite component types: https://blocksuite.io/guide/component-types

---

## 17. R12 结论

R12 的最终结论是：

```text
外部 editor 可以提升交互，但不能拥有 Coincides truth。
```

如果未来要 spike，先验证 adapter contract，再讨论产品接入。

短期：

```text
继续自有 runtime + 简单 editor。
```

中期：

```text
Tiptap/ProseMirror 或 Lexical 做 adapter spike。
```

长期：

```text
BlockSuite 继续作为架构参考，除非有专门版本证明它可以只做 adapter。
```

