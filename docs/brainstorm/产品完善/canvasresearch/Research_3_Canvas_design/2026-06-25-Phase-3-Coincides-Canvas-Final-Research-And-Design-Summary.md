# 2026-06-25 - Coincides Canvas 第三阶段最终调研与设计总结

> 阶段三目标：在前两轮 Canvas 调研基础上，完成最后一轮调研、设计和 inventory，回答“Coincides Canvas Engine 到底该怎么做，以及 8.8+ 应该如何分版本推进”。

## 1. 本阶段文档产出

本阶段产出 9 份细分文档和 1 份总结文档：

1. `2026-06-25-12-Canvas-Engine-Capability-Inventory-List.md`
2. `2026-06-25-13-Entity-Responsibility-Inventory.md`
3. `2026-06-25-14-Interaction-Workflow-Inventory.md`
4. `2026-06-25-15-AI-Agent-Operation-Inventory.md`
5. `2026-06-25-16-Version-Cut-Canvas-Maturity-Roadmap-Matrix.md`
6. `2026-06-25-17-Coincides-Canvas-Minimal-Self-Owned-Engine-Design-v0.md`
7. `2026-06-25-18-PageFrame-Refinement-Design-v0.md`
8. `2026-06-25-19-Object-TextFlow-ContentGroup-Projection-Fusion-Design-v0.md`
9. `2026-06-25-20-Canvas-Engine-Route-And-V2.BN.8.8-Plus-Candidate-Plan.md`

这些文档共同构成 V2.BN.8.8+ Canvas 版本的前置设计基线。

## 2. 最终路线判断

Coincides Canvas 应采用：

```text
Self-owned Minimal Hybrid NoteCanvas Engine
```

也就是：

1. 自研数据模型。
2. 自研 Canvas runtime。
3. DOM 继续承载 TextFlow。
4. SVG / DOM overlay 承载 connector、selection、handle、debug。
5. CSS transform 承载 viewport pan / zoom。
6. 外部开源项目只作为学习对象，不作为最终 truth。

这条路线比“直接接入外部白板引擎”更适合 Coincides，因为 Coincides 已经有自己的 TextFlow、ContentGroup、PageFrame 和 AI-readable layout 目标。

## 3. 三条真相正式固定

阶段三固定三条真相：

1. `TextFlow = 内容真相`
2. `ContentGroup = 知识结构真相`
3. `Canvas = 空间 / 布局真相`

Canvas 不取代 TextFlow，也不取代 ContentGroup。

Canvas 的价值是让知识获得第三种组织形态：空间形态。

## 4. Canvas 的四重角色

Coincides Canvas 同时是：

1. 白板。
2. 页面系统。
3. 空间组织层。
4. AI-readable layout。

其中第四点是 Coincides 与普通白板工具最大的区别之一。

AI 不应该只读 OCR，也不应该只读 DOM。它应该能读取一份由 Canvas runtime 派生出来的结构化 layout snapshot：

1. 每个对象在哪里。
2. 每个对象占多大。
3. 每个对象是否在 PageFrame 内。
4. 每个对象是否被遮挡。
5. 每个对象挂载了什么内容。
6. PageFrame 内对象的近似阅读顺序。

## 5. CanvasObject 的定位

CanvasObject 不是万能内容实体。

更准确的分工是：

1. CanvasObject 管对象身份。
2. CanvasPlacement 管对象位置。
3. ContentMount 管对象挂载了什么内容。
4. TextFlow 管文字内容。
5. ContentGroup 管知识结构。
6. Canvas AI Tree 管 AI 如何读取当前布局。

因此：

1. Block 不是 CanvasObject。
2. Block 是内容对象。
3. Block 可以通过 CanvasObject projection 出现在画布上。
4. Shape 可以是 pure CanvasObject。
5. Shape 填文字后变成 block-backed CanvasObject。
6. 删除文字后应退回 pure CanvasObject。

## 6. PageFrame 的位置

PageFrame 是第一特殊 CanvasObject。

它承担：

1. 正式写作区域。
2. 导出区域。
3. Page Mode 入口。
4. TextFlow block 的默认承载面。
5. 标尺 / margin / snap 的宿主。
6. 页眉 / 页脚 / 页码 / 模板的宿主。
7. AI-readable layout 的 page container。

PageFrame 不是普通 frame，也不是普通矩形。

V2.BN.8.8 必须让 PageFrame 站住；V2.BN.8.9 再把它做成熟。

## 7. AI / Agent 边界

8.8 不急着接真正 Agent，但必须留好接口。

正确路径是：

```text
CanvasAIReadableSnapshot
  -> CanvasProposal
  -> user / policy confirm
  -> CanvasCommand
  -> durable truth update
```

Agent 不应该直接写数据库，也不应该直接删除用户对象。

AI 生成的结果也不应该默认是一张不可编辑图片。Coincides 的主路线应是生成可编辑结构：

1. PageFrame。
2. paragraph blocks。
3. visual connectors。
4. structured objects。
5. ContentGroup / Relation proposal。

## 8. Visual Arrow 与 Relation 的分流

普通 Canvas Mode 中的箭头默认是 visual connector。

它可以给 AI 当作视觉提示，但不自动成为 KnowledgeRelation。

Relation 应该进入后续 ContentGroup Mode / Relation View：

1. 端点是 ContentGroup / Petal。
2. 连线可以先是 RelationProposal。
3. 用户确认后才成为 KnowledgeRelation。

这能保护 GraphRAG 不被普通白板箭头污染。

## 9. 版本切分结论

Canvas 不是一个小版本能做完的东西。

推荐版本路线：

| 版本 | 主题 | 核心目标 |
| --- | --- | --- |
| V2.BN.8.8 | Canvas Engine Foundation | 数据合同、runtime、PageFrame v1、Block projection、AI snapshot |
| V2.BN.8.9 | PageFrame Maturity | 多 PageFrame、标尺、页眉页脚、模板、导出准备 |
| V2.BN.8.10 | Object Projection and Reuse | image/table 成熟、ContentGroup projection、materialize / fork |
| V2.BN.8.11 | Structured Object Family | diagram / mind map / chart / math graph 选择性成熟 |
| V2.BN.8.12+ | ContentGroup Mode / Relation View | RelationProposal、KnowledgeRelation、可视化关系 |
| V2.BN.9.x | Agent / GraphRAG Integration | Agent 读写 proposal、GraphRAG、复杂关系推理 |

## 10. V2.BN.8.8 建议 sub-plan

建议将 8.8 拆成：

1. Canvas Data Contract。
2. Canvas Runtime Kernel。
3. PageFrame v1。
4. Block Projection v1。
5. Shape / Block-backed Shape / Visual Connector。
6. Canvas Command / History Seed。
7. Canvas AI Tree v1。
8. Browser / Manual Experience Gate。

这八个 sub-plan 做完后，Canvas Engine 才算真正有根。

## 11. 明确延后

以下内容不应塞进 8.8：

1. 完整无限画布。
2. 完整 diagram / mind map / chart / math graph。
3. Raw Ink / handwriting 视觉理解。
4. 完整 Agent 写入。
5. ContentGroup projection 成熟语义。
6. Relation runtime。
7. GraphRAG。
8. 3D viewer。

它们都重要，但不属于引擎第一根基。

## 12. 这轮 inventory 是否够用

阶段三最初的问题是：只有 inventory list 是否足够？

结论：不够。

本阶段最终补齐了六张关键表 / 文档：

1. Capability Inventory：要做哪些能力。
2. Entity Responsibility Inventory：谁是真相，谁是投影，谁是快照。
3. Interaction Workflow Inventory：用户动作如何变成命令。
4. AI / Agent Operation Inventory：AI 能读什么、提议什么、不能直接改什么。
5. Version Cut Matrix：能力如何分版本。
6. Minimal Engine Design：能力如何落成引擎。

另外，Data Lifecycle 和 Performance Matrix 目前没有单开文件，而是分别并入 Interaction Workflow 和 Engine Design。等 8.8 plan 开始写时，如果发现不够，再单独拆出来。

## 13. 阶段三最终判断

Coincides Canvas Engine 应该这样做：

1. 先把 CanvasObject / Placement / ContentMount 立起来。
2. 再把 PageFrame 做成第一特殊 Object。
3. 再让 paragraph block 作为 TextFlow projection 稳定进入画布。
4. 再做 pure shape、block-backed shape、visual arrow。
5. 从第一天就生成 Canvas AI Tree。
6. 所有改动尽量走 CanvasCommand。
7. Agent 只走 Proposal。
8. ContentGroup projection 和 Relation 不抢 8.8，后续接入。

这条路线能让 Canvas 不只是一个漂亮外壳，而是真正成为 Coincides 的第三大支柱。

## 14. 后续第一步

下一步适合写正式：

```text
V2.BN.8.8 Canvas Engine Foundation Plan
```

并按本总结里的 8 个 sub-plan 拆开执行。

正式实现前，建议先再做一次当前代码审计，确认现有 `canvasEngine/types.ts`、`NoteCanvasRuntimeModel`、`BlockPlacementModel`、`CanvasObjectReserve` 应该如何迁移到新合同。
