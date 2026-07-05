# 2026-06-25 - Version Cut / Canvas Maturity Roadmap Matrix

> 目标：阶段三不能只回答“Canvas 最终应该是什么”，还要回答“8.8 做到哪里，后续版本怎么接”。Canvas Engine 是 Coincides 第三大支柱，不适合被压成一个单一小版本。

## 0. 版本切分原则

1. 8.8 做底座，不做完整白板产品。
2. PageFrame 是第一特殊 CanvasObject，必须早做。
3. Object Family 不急着堆数量，先把对象生命周期做稳。
4. AI-readable layout 是底座能力，不是 Agent 版本才补。
5. Agent 写画布必须走 Proposal / Command，不直接写真相。
6. Visual arrow 与 KnowledgeRelation 分开。
7. ContentGroup projection 依赖 CanvasObject 成熟，不塞进 8.8 主线。
8. Raw Ink、diagram、chart、math graph、3D 都是后续 family，不影响 8.8 底座。

## 1. 版本地图总览

| 版本 | 主题 | 目标 | 明确不做 |
| --- | --- | --- | --- |
| V2.BN.8.8 | Canvas Engine Foundation | 建立自研最小引擎、CanvasObject、Placement、PageFrame v1、AI snapshot | 完整 diagram、完整 Agent、完整 ContentGroup projection |
| V2.BN.8.9 | PageFrame Maturity | 多 PageFrame、标尺、页眉页脚、页码、模板、导出准备 | 新增大量 Object Family |
| V2.BN.8.10 | Object Projection and Reuse | image/table 稳定、ContentGroup projection、reference/duplicate/fork/materialize | Relation runtime |
| V2.BN.8.11 | Structured Visual Objects | diagram / mind map / chart / math graph 选择其一到两类成熟化 | Raw Ink 视觉理解 |
| V2.BN.8.12+ | Relation View / ContentGroup Mode | RelationProposal、ContentGroup/Petal endpoint 可视化 | GraphRAG 全量 |
| V2.BN.9.x | Agent / GraphRAG Integration | Agent 读写 proposal、GraphRAG、复杂知识关系 | 无确认的黑盒自动改写 |

版本号只是当前建议，不是硬承诺。真正固定的是切分逻辑。

## 2. V2.BN.8.8：Canvas Engine Foundation

### 2.1 必须完成

1. `NoteCanvas` / `CanvasObject` / `CanvasPlacement` / `ContentMount` 合同。
2. `PageFrameExtension` v1。
3. `CanvasSceneRuntime` v0。
4. `CanvasViewportController` v0。
5. `CanvasInteractionController` v0。
6. `CanvasCommandDispatcher` seed。
7. `CanvasAIReadableSnapshotService` read-only。
8. Page Mode / Canvas Mode 的清晰切换。
9. Primary PageFrame 规则。
10. paragraph block 的 canvas projection。
11. shape / block-backed shape 的最小路径。
12. visual arrow / connector 的非语义路径。

### 2.2 可以完成

1. image object 最小版。
2. table object 壳。
3. basic snap。
4. basic z-index controls。
5. selected context snapshot。
6. Browser manual smoke。

### 2.3 不做

1. 完整无限画布。
2. 完整 PageFrame 导出。
3. 完整图表 / 流程图编辑器。
4. AI 自动生成完整页面并落地。
5. ContentGroup projection 成熟语义。
6. Relation endpoint / graph runtime。
7. Raw Ink 识别。

### 2.4 8.8 成功标准

8.8 完成后，应该能说：

1. Coincides 有自己的 CanvasObject / Placement 模型。
2. 一篇 note 可以用 PageFrame 作为正式写作面，也可以切到 Canvas Mode 看空间。
3. paragraph block 可以自然存在于 PageFrame 或 workspace。
4. AI 可以读取对象 layout snapshot。
5. 后续新增 Object Family 不需要推翻底座。

## 3. V2.BN.8.9：PageFrame Maturity

PageFrame 是用户第一体验的核心，所以 8.9 应该把它做成接近“正式页面系统”的水平。

### 3.1 目标

1. 多 PageFrame 管理。
2. 插入 / 删除 / 复制 PageFrame。
3. 主 PageFrame 切换。
4. PageFrame 模板。
5. PageFrame background。
6. 标尺 / margin / content inset 可视化。
7. snap to margin。
8. 页眉 / 页脚 / 页码。
9. crossing object 导出策略。
10. export preview。

### 3.2 不做

1. 大量 Object Family。
2. 完整 AI 生成文档。
3. Relation View。

## 4. V2.BN.8.10：Object Projection and Reuse

这个版本把 ContentGroup 和 Canvas 接起来，但仍不做 GraphRAG。

### 4.1 目标

1. ContentGroup tile / folder projection。
2. open original / duplicate projection / fork group / materialize members。
3. image object 成熟。
4. table object 成熟。
5. object-level reference link。
6. PageFrame 与 workspace 间的投影移动语义。
7. Asset / StructuredObject minimal adapter。

### 4.2 不做

1. Relation runtime。
2. Petal endpoint graph。
3. Agent 自动重排。

## 5. V2.BN.8.11：Structured Visual Objects

这个版本开始选择性扩展 Object Family，但不应该一次全做。

候选优先级：

1. diagram / flowchart。
2. mind map。
3. chart / statistics graph。
4. math graph。

建议选择：

1. 如果目标是产品调研 / 会议整理：先 diagram / mind map。
2. 如果目标是数学学习：先 math graph。
3. 如果目标是数据分析：先 chart / statistics graph。

每一类 structured object 都需要：

1. 自己的数据模型。
2. 自己的 editor。
3. CanvasObject / Placement 适配。
4. AI-readable serializer。
5. export serializer。

## 6. V2.BN.8.12+：ContentGroup Mode / Relation View

这个阶段才适合把箭头与 Relation 绑定。

### 6.1 目标

1. ContentGroup Mode。
2. ContentGroup / Petal 可视化节点。
3. RelationProposal。
4. KnowledgeRelation edge。
5. proposal -> confirm -> relation。
6. 可视化 relation graph。

### 6.2 原则

普通 Canvas Mode 的 visual arrow 仍然只是视觉箭头。

Relation View 中的连线才可能是知识关系。

## 7. V2.BN.9.x：Agent / GraphRAG Integration

Agent 和 GraphRAG 不是 8.8 的主要目标，但 8.8 必须为它们留出口。

### 7.1 Agent 目标

1. 读取 Canvas AI Tree。
2. 读取 ContentGroup / SourceArtifact / TextFlow。
3. 生成 CanvasProposal。
4. 生成 ContentGroup proposal。
5. 生成 RelationProposal。
6. 生成 PageFrame / document proposal。

### 7.2 GraphRAG 目标

1. SourceArtifact。
2. SourceAnchor。
3. ContentGroup / Petal endpoint。
4. KnowledgeRelation。
5. graph snapshot。
6. retrieval pipeline。

## 8. 做不做的判断表

| 能力 | 现在不做会不会拖累底座 | 现在做会不会拖垮版本 | 结论 |
| --- | --- | --- | --- |
| CanvasObject / Placement | 会 | 不会 | 8.8 必做 |
| PageFrame v1 | 会 | 不会 | 8.8 必做 |
| Canvas AI Tree | 会 | 不会 | 8.8 必做 read-only |
| visual arrow | 一点会 | 不大 | 8.8 做非语义版 |
| ContentGroup projection | 不会 | 会 | 8.10 |
| Relation View | 不会 | 会 | 8.12+ |
| diagram editor | 不会 | 会 | 8.11 |
| image/table | 一点会 | 中等 | 8.8 壳，8.10 成熟 |
| Raw Ink | 不会 | 很会 | Later |
| Agent write | 不会 | 很会 | 8.9+ / 9.x |
| complete export | 不会 | 会 | 8.9 |

## 9. 8.8 候选 sub-plan

### 8.8.1 Canvas Data Contract

定义 CanvasObject、CanvasPlacement、ContentMount、PageFrameExtension、VisualConnector、CanvasAIReadableSnapshot。

### 8.8.2 Canvas Runtime Kernel

建立 scene runtime、viewport controller、coordinate conversion、measurement service、render layering。

### 8.8.3 PageFrame v1

建立 primary PageFrame、Page Mode、content area、frame placement、basic resize。

### 8.8.4 Block Projection v1

让 paragraph block 稳定作为 block-backed CanvasObject 存在于 PageFrame / workspace。

### 8.8.5 Shape and Visual Connector v1

pure shape、block-backed shape、visual arrow。

### 8.8.6 Canvas Command / History Seed

所有关键操作通过 command 执行，为 undo/redo 和 Agent proposal 留底。

### 8.8.7 Canvas AI Tree v1

生成可读 snapshot，覆盖 PageFrame、block、shape、connector。

### 8.8.8 Browser Manual Gate

新建笔记、创建 PageFrame、创建 block、拖动、刷新、切换 mode、检查 snapshot。

## 10. Roadmap Matrix 结论

Canvas Engine 应该分多个版本长出来。

8.8 的成败不在于“看起来像 Miro / Excalidraw”，而在于：

1. 数据边界正确。
2. 交互命令化。
3. PageFrame 角色明确。
4. AI-readable layout 从第一天存在。
5. Object Family 可以逐步挂上来。

如果 8.8 把这些做对，后续 diagram、chart、ContentGroup projection、Agent、GraphRAG 都会有地方生长。
