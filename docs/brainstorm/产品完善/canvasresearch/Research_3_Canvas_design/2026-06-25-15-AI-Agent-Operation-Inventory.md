# 2026-06-25 - AI / Agent Operation Inventory

> 目标：明确 Canvas 为 AI 和 Agent 留出的接口。当前不急着接真正 Agent，但 8.8 的数据结构必须让未来 Agent 能读、能提案、能安全落地。

## 0. 基本原则

1. Agent 不直接改 durable truth。
2. Agent 先读 `CanvasAIReadableSnapshot`。
3. Agent 产出 `CanvasProposal`。
4. 用户或策略层确认后，Proposal 转成 `CanvasCommand`。
5. CanvasCommand 才更新 CanvasObject / CanvasPlacement / NoteBlock / PageFrameExtension。

这条链条是为了避免 AI 把画布变成不可追踪的黑箱。

## 1. AI-readable Layout 需要读什么

一个 AI 可读的 Canvas snapshot 至少要包含：

| 字段 | 说明 | 8.8 |
| --- | --- | --- |
| canvasId | 当前画布 | 必须 |
| noteId | 所属笔记 | 必须 |
| viewport | 用户当前视野 | 应该 |
| pageFrames | PageFrame 列表 | 必须 |
| primaryFrameId | 主 PageFrame | 必须 |
| objects | CanvasObject 列表 | 必须 |
| placements | bbox / rotation / zIndex / frameId / surface | 必须 |
| mounts | object 挂载的内容摘要 | 必须 |
| visibility | 是否可见、是否遮挡、是否在视野内 | 应该 |
| readingOrderHints | PageFrame 内阅读顺序 | 应该 |
| selectedObjects | 用户当前选择 | 应该 |
| connectors | 视觉连线 | 应该 |
| relationProjections | 后续 Relation 投影 | 延后 |

## 2. Canvas AI Tree 节点草案

```ts
type CanvasAINode = {
  id: string;
  kind:
    | 'canvas'
    | 'page_frame'
    | 'paragraph_block'
    | 'shape'
    | 'visual_connector'
    | 'image'
    | 'table'
    | 'content_group_projection'
    | 'structured_object';
  bbox: { x: number; y: number; width: number; height: number };
  zIndex: number;
  surface: 'formal_page' | 'canvas_workspace';
  frameId?: string;
  visible: boolean;
  text?: string;
  summary?: string;
  styleHints?: string[];
  contentRef?: {
    kind: 'note_block' | 'content_group' | 'asset' | 'structured_object';
    id: string;
  };
  children?: CanvasAINode[];
};
```

注意：这只是派生结构，不是数据库实体。

## 3. Agent Operation 权限矩阵

| 操作 | 8.8 状态 | 是否允许直接落地 | 正确路径 |
| --- | --- | --- | --- |
| 读取画布布局 | 支持 | 是 | 读取 snapshot。 |
| 总结选中对象 | 支持接口 | 否 | snapshot -> summary proposal。 |
| 创建 paragraph block | 预留 | 否 | Proposal -> user confirm -> CanvasCommand。 |
| 创建 PageFrame | 预留 | 否 | Proposal -> confirm。 |
| 移动 / 对齐对象 | 预留 | 否 | LayoutProposal -> confirm。 |
| 生成正式文档 | 预留 | 否 | Draft PageFrame + blocks proposal。 |
| 生成流程图 | 延后 | 否 | 先用 blocks + visual connectors proposal。 |
| 建立 Relation | 延后 | 否 | RelationProposal -> ContentGroup Mode。 |
| 修改 TextFlow 内容 | 可复用现有 proposal 思路 | 否 | Text edit proposal。 |
| 删除对象 | 谨慎预留 | 否 | DeleteProposal -> confirm。 |
| 直接写数据库 | 禁止 | 否 | 不允许。 |

## 4. Proposal 类型

### 4.1 CanvasSummaryProposal

用途：

1. 总结当前画布。
2. 总结选中对象。
3. 总结一个 PageFrame。

不改数据，只生成文本建议。

### 4.2 CanvasLayoutProposal

用途：

1. 建议重新排列对象。
2. 建议聚类。
3. 建议创建 PageFrame 分组。

落地方式：

```text
CanvasLayoutProposal
  -> user preview
  -> CanvasCommandBatch(move / resize / create frame)
```

### 4.3 CanvasDocumentProposal

用途：

1. 把散落对象整理成正式文档。
2. 生成 Strategy Document / Meeting Summary / Study Guide。

落地方式：

```text
source selected nodes
  -> proposal.pageFrame
  -> proposal.blocks
  -> confirm
  -> create PageFrame + NoteBlocks + Placements
```

生成结果优先是 PageFrame + editable blocks，而不是图片。

### 4.4 CanvasDiagramProposal

用途：

1. 生成流程图草图。
2. 生成 mind map 草图。

8.8 处理：

1. 可以先只写 proposal 合同。
2. 不强行做完整 diagram editor。
3. 如果需要视觉化，可以用 paragraph blocks + visual connectors 过渡。

### 4.5 RelationProposal

用途：

1. 用户或 AI 认为两个 ContentGroup / Petal 之间可能存在关系。
2. 先作为 proposal，不立即变成 KnowledgeRelation。

状态：

Relation 版本再做，阶段三只保留概念。

## 5. AI 读取 layout 的几个重点

### 5.1 坐标点不够，必须有占地空间

AI 不能只知道 object 在 `(x, y)`。它还需要：

1. width / height。
2. zIndex。
3. 是否在 PageFrame 内。
4. 是否被遮挡。
5. 是否跨 PageFrame 边界。
6. 是否在当前 viewport 内。

原因：空间意义来自布局、距离、遮挡、邻近和包含关系，不是来自单点坐标。

### 5.2 OCR 不是第一真相

OCR / VLM 可以补足手写、截图、图片里的信息，但不应该取代结构化对象数据。

优先级：

1. 先读 TextFlow / structured data / ContentGroup。
2. 再读 Canvas placement / layout。
3. 最后才用 OCR / visual understanding 补漏。

### 5.3 Agent 需要 context selection

Miro 类功能的本质不是“AI 看全画布”，而是：

1. 用户选中一批对象。
2. 这些对象作为 context。
3. Agent 基于 context 生成 summary / doc / diagram。

所以 8.8 的 snapshot 应该包含 selected object ids 和 selection bbox。

## 6. 普通箭头与 Relation 的 Agent 边界

普通 Canvas Mode：

1. 箭头是 visual connector。
2. AI 可以把它当作视觉提示。
3. AI 不应该自动创建 KnowledgeRelation。

ContentGroup Mode / Relation View：

1. 端点是 ContentGroup / Petal。
2. 连接可以对应 RelationProposal。
3. 用户确认后才变成 KnowledgeRelation。

这样可以避免普通白板箭头污染知识图谱。

## 7. AI 生成流程图的两条路线

### 路线 A：生成图片

优点：

1. 实现简单。
2. 视觉稳定。

缺点：

1. 不可编辑。
2. AI-readable 弱。
3. 无法进入 TextFlow / ContentGroup。

结论：不作为 Coincides 的主路线。

### 路线 B：生成结构化对象

优点：

1. 可编辑。
2. 可被 AI 读取。
3. 可进入后续 ContentGroup / Relation。

缺点：

1. 需要对象模型和布局算法。
2. 实现成本高。

结论：后续主路线。8.8 可以先用 blocks + visual connectors 过渡。

## 8. 8.8 Agent 留口

V2.BN.8.8 不需要做真正 Agent，但必须留下：

1. `CanvasAIReadableSnapshotService`
2. `CanvasProposal` 类型合同
3. `CanvasCommandBatch` 类型合同
4. selected object context
5. PageFrame context
6. object bbox / zIndex / visibility

这样后面接 Agent 时，不需要推翻 CanvasObject 设计。

## 9. Deny List

8.8 明确不允许：

1. AI 直接写 CanvasObject 表。
2. AI 直接删除用户对象。
3. AI 把 visual arrow 自动升格为 Relation。
4. AI 把截图 OCR 结果当作唯一真相。
5. AI 生成不可编辑图片作为默认结果。
6. AI 以模糊自然语言修改大量对象而不给 preview。

## 10. AI / Agent Inventory 自检

这份 inventory 足够指导 8.8 “留接口但不急着接 Agent”。

正式 8.8 plan 还需要补：

1. Snapshot schema 的 TypeScript 合同。
2. Proposal schema 的 TypeScript 合同。
3. Browser harness 如何检查 snapshot。
4. 一条最小 demo：选中对象 -> 生成 summary proposal，不落地。

如果 8.8 时间不足，最小 demo 可以延后，但 snapshot 合同不能延后。
