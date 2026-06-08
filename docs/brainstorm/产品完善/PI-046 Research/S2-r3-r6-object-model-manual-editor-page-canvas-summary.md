# S2 - R3-R6 阶段性总结：对象模型、人工编辑器、Block-Box 与 Page/Canvas

## 总结范围

本阶段总结覆盖：

- `R3-coincides-core-object-model.md`
- `R4-manual-notebook-minimum-usable-experience.md`
- `R5-page-editor-freeform-block-box-requirements.md`
- `R6-page-canvas-modes-and-export-boundaries.md`

S2 的作用是把进入 AFFiNE / BlockSuite 调研前必须携带的约束整理出来。

## 一句话结论

Coincides 的核心不是“把东西画在画布上”，而是：NoteBlock 保持内容 truth，block-box / CanvasNode / CanvasEdge 保持 projection 或 presentation，用户通过自然 page editor 写笔记，通过 layout edit mode 调整 block-box，通过 page/canvas mode 区分正式内容和草稿区，通过 export intent 控制导出。

## R3 的阶段结论

R3 建立了 Coincides 的 ownership matrix。

核心分层：

```text
Container / Navigation: Project/Course, Note
Content Truth: NoteBlock
Source / Evidence: SourceAnchor, SourceScope, EvidenceSet
Projection / View: Canvas, CanvasNode, CanvasFrame, CanvasEdge
Semantic Relation: ObjectRelation
Capability / Runtime: TemplateDefinition, CompositionTemplate, DomainBlockSet, PackageManifest
Operation / Provenance: Proposal, OperationBatch, MigrationRecord, ImportExportRecord
```

最重要的边界：

- CanvasNode 不是 NoteBlock。
- CanvasEdge 不是 ObjectRelation。
- ObjectRelation 才是 semantic edge candidate。
- Template/Domain/Package 是 capability layer，不是普通内容。
- Proposal/OperationBatch 是 operation/provenance，不是知识内容。

后续调研 AFFiNE / BlockSuite 时，必须检查它们能否保留这些 Coincides canonical identity，而不是只看编辑体验。

## R4 的阶段结论

R4 定义了不依赖 AI 的最小人工笔记体验。

当前 v2.x seed：

- 能创建 note。
- 能创建 NoteBlock。
- 能选择 runtime template。
- 能编辑 block 文本。
- 能保存、上下移动、trash。
- 能预览 KaTeX。
- 能显示 source reference 和 View source。
- 能在 Canvas 上 Add block。

但最小可用体验应从：

```text
选择模板 -> textarea 输入 -> Add block -> 卡片列表编辑
```

升级为：

```text
打开空白笔记 -> 点击/双击页面 -> 光标出现 -> 直接写 -> slash/toolbar 改类型 -> 自然排版
```

这说明后续 editor 调研必须优先解决自然输入，而不是继续堆工程按钮。

## R5 的阶段结论

R5 定义了 Coincides 独有的 freeform block-box 需求。

核心规则：

```text
NoteBlock = 内容 truth
BlockBox = NoteBlock 在某个 page/document view 里的 layout/presentation
```

用户需要：

- 段落 block 可缩窄。
- 缩窄后文字在 box 内提前换行。
- 右侧空白处双击可创建并排 block。
- layout edit mode 下 block 可拖动、resize、对齐。
- 普通编辑状态下 block 边框弱化，不打断写作。

R5 没有锁死 schema，只锁需求：

- block-box layout 必须独立于 NoteBlock 内容。
- block-box layout 必须表达 page-aware x/y/width/height/export intent。
- block-box layout 必须能被 editor engine 重建。

是否放在 `note_block_placements`、`canvas_nodes` 还是新表，要等 R7-R11。

## R6 的阶段结论

R6 定义了 page/canvas mode 和导出边界。

Coincides 至少需要：

- Locked Single Page。
- Open Canvas。
- Multi-page Grid。
- Seamless Page Stack。
- Formal Page Area。
- Outside-page Workspace。
- Export Intent。
- Page Label Mapping。

最重要规则：

```text
页面内 = 默认正式内容
页面外 = 默认草稿/个人备注
导出 = 根据 export intent，而不是只根据视觉位置
```

导出必须区分：

- PDF。
- HTML。
- PNG/image。
- 工程文件。

并且必须区分：

- internal_page_index。
- source_page_label。
- export_page_index。
- display_page_label。

## 对 AFFiNE / BlockSuite 调研的直接约束

R7-R8 必须重点回答：

1. AFFiNE page mode 是否能提供自然写作入口。
2. AFFiNE edgeless mode 是否能承载 Coincides open canvas / scratch area。
3. BlockSuite block 是否能保存 Coincides NoteBlock identity。
4. BlockSuite 是否支持 block resize 或可扩展为 block-box。
5. AFFiNE / BlockSuite 是否支持 source attach / metadata / custom provenance。
6. 它们能否区分 formal page content 与 outside-page scratch。
7. 它们的 export pipeline 是否可控。
8. 它们的 relation/connector 是否能映射到 CanvasEdge / ObjectRelation 分层。
9. 它们是否允许 Coincides 保留 Template/Domain/Package/Proposal 层。

如果这些问题回答不清楚，就不能轻易决定 full fork 或 deep adoption。

## 对后续路线评分的直接约束

R13 评分必须加入这些维度：

- ownership preservation。
- natural manual note UX。
- freeform block-box support。
- page/canvas/export boundary support。
- source attach and provenance support。
- relation visual/semantic separation。
- GraphRAG / AI-readable substrate compatibility。
- long-term maintenance cost。
- license and fork cost。

## 当前阶段已经回答的问题

1. **NoteBlock 是否是核心知识对象？**
   是。它是 content truth。

2. **CanvasNode 是否是知识对象？**
   不是。它是 projection/placement。

3. **ObjectRelation 是否重要？**
   是。它是 semantic edge candidate。

4. **用户是否需要自由 block-box？**
   是，这是 Coincides 区别于普通单列 block editor 的关键需求。

5. **页面外对象是否应该存在？**
   是。它们是 scratch/private/annotation workspace，可 relation、可被 AI 读取，但不默认导出。

6. **导出是否只按位置判断？**
   不应该。位置是默认规则，export intent 才是最终规则。

## 当前阶段未解决的问题

- AFFiNE 是否能满足这些模式。
- BlockSuite 是否能承载 Coincides metadata。
- 是否应该 full fork、BlockSuite-first、hybrid 或自研。
- block-box layout 最终 schema。
- export engine 最终怎么实现。
- relation layer 如何在大文档中可视化而不混乱。

这些问题交给 R7-R14。

## S2 结论

R3-R6 已经把 Coincides 的核心产品约束立起来了：

```text
对象上：NoteBlock truth, Canvas projection, ObjectRelation semantic edge
体验上：页面即编辑入口，block-box 可布局
视图上：formal page + outside workspace
导出上：export intent 控制边界
```

接下来 R7-R11 的 AFFiNE / BlockSuite 调研必须带着这些约束去看，而不是只看“它们好不好看”或“它们有没有画布”。
