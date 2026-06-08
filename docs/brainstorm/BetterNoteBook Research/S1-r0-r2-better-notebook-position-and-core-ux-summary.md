# S1 - R0-R2 Better Notebook 定位与核心交互总结

**Created**: 2026-06-05
**Status**: Complete
**Scope**: R0-R2 stage summary
**Covers**:

- `R0-reference-index-and-research-intake.md`
- `R1-notion-affine-mature-notebook-baseline.md`
- `R2-better-notebook-core-interaction-spec.md`

## 目的

S1 不重复 R0-R2 的全部内容。它的任务是把前三个阶段收束成新版 Better Notebook roadmap 的第一组决策：

```text
我们为什么要做 Better Notebook？
成熟体验的最低线是什么？
第一阶段最核心的交互规格是什么？
```

R0-R2 的共同结论是：Coincides 不缺语义地基，缺的是一个人类愿意每天打开、自然写作、自由排版、稳定导出的 notebook surface。

## 一句话结论

Better Notebook 的第一阶段不应该继续堆 Source / Canvas / Template / Proposal 面板，而应该先完成：

```text
Natural Page Editing + Freeform NoteBlock Box
```

也就是：

```text
像普通文档一样开始写；
像文本框一样调整 NoteBlock；
像画布一样自由排版；
像 Coincides 一样保留 source / relation / template / proposal truth。
```

## R0 给出的方向

R0 的核心价值是把旧研究重新变成可用索引。

R0 确认：

- v2.x 不是失败版本，而是 semantic substrate。
- v2.x 已经积累了 Source、NoteBlock、CanvasNode、ObjectRelation、TemplateDefinition、CompositionTemplate、DomainBlockSet、PackageManifest、Proposal、OperationBatch 等重要对象。
- 这些对象应该被 Better Notebook 复用，但不应该继续以工程面板形式裸露给用户。
- 新 roadmap 不应继续塞进旧 v2.0-v2.5.6 roadmap；需要作为 Better Notebook 新路线单开。
- PI-046 是主锚点；后续研究不能和 PI-046 割裂。

R0 对 roadmap 的直接影响：

```text
新路线第一目标 = 成熟人工笔记体验
第二目标 = 把已有 semantic substrate 融入成熟体验
第三目标 = AI note assembly / source reconstruction / GraphRAG readiness
```

## R1 给出的成熟体验基线

R1 的核心价值是建立 Notion / AFFiNE 的成熟体验基线。

R1 确认：

- Notion 的第一原则是“先写，后理解 block”。
- Slash command 是 block type 和动作入口，不是主导航。
- Hover handle、selected text toolbar、right-click / more menu 证明复杂结构可以按需显露。
- AFFiNE 的价值在于 page 与 edgeless / whiteboard 可以在同一 workspace 中共存。
- AFFiNE 的 sidebar、favorite、workspace shell、frame、connector、sticky note、tool palette 都是成熟产品体验参考。
- Coincides 应吸收 Notion 的自然写作、AFFiNE 的空间操作和 app shell，但不能交出自己的 source / relation / template truth。

R1 对 roadmap 的直接影响：

```text
Notebook Surface Must Feel Writable Before It Feels Powerful
```

这应该成为新 roadmap 第一阶段的验收原则。

## R2 给出的核心交互规格

R2 的核心价值是把 Henry 提出的 freeform NoteBlock 体验写成规则。

R2 确认：

- 空白 note 首次单击应出现 caret / draft insertion focus。
- 单击不应立刻持久化空 NoteBlock，避免误点污染数据。
- 用户输入文本、粘贴内容或选择 slash command 后，才创建真实 NoteBlock / placement。
- 双击空白区域表示在该空间位置创建独立 block draft。
- Enter / Shift+Enter 属于当前 block 的文本编辑语义，和空白处双击不同。
- 新 text block 的宽度应取当前可用矩形；无阻挡时 full content width，有阻挡时在可用空白内创建。
- 左侧 block 缩窄后，右侧空白可以创建并排 block，这是 Coincides 区别于 Notion 单列 flow 的核心能力。
- Resize 只改 layout / projection，不改 NoteBlock 内容、source、relation、template truth。
- 文本必须随 width 变化 reflow，height 第一版应 auto grow。
- Reading、writing、selection、layout edit mode 必须分层。
- Slash command 是 runtime `TemplateDefinition` 的人类入口。

R2 对 roadmap 的直接影响：

```text
第一批工程不能只做 Add block。
必须做自然 page editor 的最小闭环。
```

## 当前 Coincides 状态判断

根据 R2 对当前代码和 Browser Harness 的观察，当前 Coincides 有两面：

### 已经有价值的底座

- NoteBlock 创建、更新、trash。
- runtime template options。
- source reference / source jump。
- Canvas Document 主工作区。
- Canvas Add block。
- node move / resize。
- Connect / relation layer / selected object scope。
- Plan layout / composition seed。
- Hide / Restore hidden node。

这些应该保留为 Better Notebook 的底层资产。

### 仍不成熟的用户体验

- NoteDetail 仍是模板下拉、textarea、Add block、卡片列表。
- Canvas Add block 仍是面板入口，不是页面光标入口。
- Canvas node 仍显示较多工程对象痕迹。
- Source snapshots、Selected scopes、Source Board、Course Material 等仍在同一页面大量占据视觉空间。
- 用户打开 note 后还不能自然点击空白页开始写。
- 左文右图、右侧空白创建 block、resize/reflow 尚未成为 notebook surface 的核心体验。

## 新 roadmap 第一阶段建议

S1 建议新版 Better Notebook roadmap 的第一阶段命名为：

```text
Phase A - Natural Notebook Surface
```

或：

```text
Phase A - Writable Page + Freeform NoteBlock Box
```

该阶段目标：

- 冻结工程面板式 UI 继续扩张。
- 建立一个真正的 note surface。
- 用户打开空白 note 后能自然写。
- NoteBlock 像内容，而不是卡片。
- block 可选中、可 resize、可并排。
- Slash command 进入基础 block type。
- layout 操作不改 semantic truth。

### Phase A 必须验收

- 空白 note 单击出现 caret。
- 输入后创建默认 `text.paragraph` NoteBlock。
- 空 draft 不持久化。
- `/` 弹出基础 block type menu。
- text block 可 resize。
- resize 后文本 reflow，height auto grow。
- 左侧 block 缩窄后，右侧空白可创建并排 block。
- reading / writing / selection / layout edit mode 分层。
- selected block 显示边界和轻量 toolbar。
- layout edit mode 显示 resize handle、drag handle、alignment guide seed。
- 移动 / resize 只更新 layout / projection。
- source / relation / template truth 不被布局操作改写。

### Phase A 不做

- 完整 AI note generation。
- Source Reconstruction。
- GraphRAG。
- Neo4j。
- 完整 style developer studio。
- 完整 rich text engine 自定义。
- 完整 table editor。
- 复杂自动绕图。
- 多列自动 flow。
- full AFFiNE fork。

## 关键产品原则

### 原则 1：用户不应先理解 NoteBlock

用户可以以后学习 NoteBlock、source、relation、template，但第一秒不需要。第一秒只应该是：

```text
点击，写。
```

### 原则 2：NoteBlock 是 truth，但 BlockBox 是体验

底层 `NoteBlock` 存内容，表层 `BlockBox / placement` 存空间。

这条分层必须保持，否则 Better Notebook 要么退回卡片列表，要么让画布吞掉语义主权。

### 原则 3：自由排版不是白板化

Coincides 要支持二维排版，但它不是普通 Miro / whiteboard。

页面仍有 formal page、export boundary、source provenance、template identity、relation truth。自由排版必须服务笔记，而不是把笔记变成随手贴图。

### 原则 4：复杂能力按需显露

Source、Relation、Template、Domain、Proposal 都很强，但不能常驻污染正文。

它们应该进入：

- hover badge；
- selected block toolbar；
- right-click menu；
- inspector；
- studio；
- local graph view；
- proposal panel。

### 原则 5：先人工可用，再 AI 可用

Better Notebook 的第一轮目标不是让 AI 自动写完笔记，而是让人类自己能舒服写、改、排版。只有这个 surface 成熟，AI note assembly、source reconstruction、GraphRAG 才有落点。

## 风险清单

### 风险 1：继续在旧 Course Detail 堆功能

如果继续把 Source、Board、Canvas、Template、Proposal 都塞进同一个长页面，Better Notebook 会继续像工程施工现场。

### 风险 2：误把 Canvas seed 当成熟 notebook

当前 Canvas Document 是重要进步，但 Add block / node / relation layer 仍是工程对象入口。它还不是自然 page editor。

### 风险 3：自研编辑器成本高

Natural page editing、freeform block-box、resize/reflow、snap guide、export 都是高成本能力。R7 仍需重新评估 BlockSuite / AFFiNE / 自研路线，但不能因此降低体验标准。

### 风险 4：模板系统压垮 slash menu

v2.5 模板地基很强，但第一版 slash menu 必须克制，只暴露用户理解的类型。

### 风险 5：布局和语义 truth 混淆

如果 resize / move 影响 source/relation/template truth，后续重建、导出、AI 读取都会失稳。

## 对后续阶段的要求

### R3 必须继续回答

- formal page 与 outside scratch 如何分界；
- 页面内外内容导出规则；
- multi-page / seamless page stack；
- page label 与 internal page index；
- scratch block 是否能 relation / AI-readable。

### R4 必须继续回答

- paragraph、heading、formula、image、code、table、source quote、sticky note 的视觉语言；
- block type 何时显示；
- metadata 如何隐藏到 inspector；
- paragraph 如何像正文而不是卡片。

### R5 必须继续回答

- 常驻 toolbar、floating toolbar、slash、right-click、inspector、shortcut 的分工；
- delete / archive / hide 的区别；
- source attach、relation attach、export intent 放在哪里；
- 怎样避免界面像工程后台。

### R6-R10 必须继续回答

- BlockBox / placement / canvas node 的数据契约；
- 是否 spike BlockSuite / AFFiNE route；
- source / relation / concept 如何进入成熟 UX；
- 性能、规模、重建；
- 最终 roadmap synthesis。

## S1 决策摘要

S1 建议后续写新版 Better Notebook roadmap 时，把第一阶段明确写成：

```text
先完成人类自然写作和自由 NoteBlock 排版。
```

不要先做：

```text
AI 自动整理笔记
GraphRAG
Source Reconstruction
完整样式编辑器
完整外部 Agent 工作流
```

这些不是不重要，而是必须站在成熟 notebook surface 之上。

S1 的最终判断：

```text
Coincides 已经拥有很多强大的语义对象；
现在最缺的是把这些对象藏在一个成熟、安静、可写、可排版、可导出的 notebook surface 后面。
```
