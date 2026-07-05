# 2026-06-25 - Interaction Workflow Inventory

> 目标：把用户在 Canvas 上的动作拆成稳定工作流。后续写代码时，每个动作都应该能落成命令，而不是散落在组件事件里。

## 0. 总原则

Canvas 交互应该遵循这个链条：

```text
User Intent
  -> Hit Test / Selection Context
  -> Draft Interaction
  -> CanvasCommand
  -> Persistence Update
  -> Render Refresh
  -> CanvasAIReadableSnapshot Refresh
```

AI 或 Agent 的交互也不例外，只是入口从 `User Intent` 换成 `CanvasProposal`。

## 1. 基础交互语义

| 动作 | 需要命令化吗 | 8.8 优先级 | 说明 |
| --- | --- | --- | --- |
| 单选对象 | 不一定 | P0 | 可以是 runtime state，不必持久化。 |
| 多选对象 | 不一定 | P0 | 用于批量移动、对齐、删除。 |
| 移动对象 | 是 | P0 | 更新 CanvasPlacement。 |
| resize | 是 | P0 | 更新 CanvasPlacement width/height。 |
| rotate | 是 | P2 | 字段预留，UI 可延后。 |
| 改 z-index | 是 | P1 | 遮挡和 AI-readable layout 需要。 |
| 创建 block | 是 | P0 | 创建 NoteBlock + CanvasObject + Placement + ContentMount。 |
| 创建 shape | 是 | P1 | 创建 pure CanvasObject + Placement + VisualStyle。 |
| shape 填文字 | 是 | P1 | 创建或挂载 paragraph block，变为 block-backed。 |
| 删除 shape 文字后退回 pure object | 是 | P1 | 删除空 NoteBlock / ContentMount，保留 shape。 |
| 设置背景 / 边框 | 是 | P1 | 更新 VisualStyle。 |
| 创建 visual arrow | 是 | P1 | 创建 VisualConnector，不创建 KnowledgeRelation。 |
| 创建 PageFrame | 是 | P0 | 创建 PageFrame object + PageFrameExtension。 |
| 设置 primary PageFrame | 是 | P0 | 更新 NoteCanvas.primary_frame_id。 |
| 删除 PageFrame | 是 | P1 | 需要主 frame 兜底规则。 |
| 拖入 ContentGroup | 是 | P2 | 创建 projection-backed CanvasObject，8.10+。 |
| Materialize ContentGroup | 是 | P2 | 生成 blocks，不改源 group。 |
| Agent apply proposal | 是 | P2 | 将 proposal 转为一组 CanvasCommand。 |

## 2. Workflow 1：在 Canvas 空白处创建 paragraph block

入口：

1. 用户双击 Canvas 空白处。
2. 或点击工具栏的文本工具。
3. 或 Agent 生成一个待确认文本块。

流程：

```text
hit test -> empty canvas point
create NoteBlock(paragraph)
create CanvasObject(kind=block, blockBacked=true)
create ContentMount(target=note_block)
create CanvasPlacement(x, y, defaultWidth, autoHeight)
focus TextFlow editor
```

关键点：

1. 内容真相在 NoteBlock / TextFlow。
2. 位置真相在 CanvasPlacement。
3. AI 读取时看到的是派生 snapshot，而不是直接读 DOM。

## 3. Workflow 2：在 PageFrame 内创建 paragraph block

入口：

1. Page Mode 中点击页面正文区域。
2. Canvas Mode 中双击 PageFrame content area。

流程：

```text
hit test -> PageFrame content area
create NoteBlock(paragraph)
create CanvasObject(block-backed)
create CanvasPlacement(surface=formal_page, frameId=..., boundary=inside)
apply frame content inset / ruler snap
focus editor
```

关键点：

1. PageFrame content inset 决定默认文本宽度。
2. PageFrame 内的 block 可以拥有近似阅读顺序。
3. PageFrame 外的 block 不应该被默认纳入正式导出。

## 4. Workflow 3：创建 pure shape

入口：

1. 用户选择 shape 工具。
2. 在画布上拖出矩形 / 圆形 / 区域。

流程：

```text
tool state = shape
drag start -> draft bbox
drag end -> create CanvasObject(kind=shape)
create CanvasPlacement
create VisualStyle(default)
select new object
```

关键点：

1. pure shape 没有 NoteBlock。
2. AI 可以读取它的 bbox、style、附近对象，但不应该把它当作文本内容。

## 5. Workflow 4：shape 填文字

入口：

1. 用户双击 shape。
2. 或右键选择“填充文字”。

流程：

```text
selected CanvasObject(kind=shape, no content mount)
create NoteBlock(paragraph)
create ContentMount(target=note_block)
mark CanvasObject as block-backed
focus TextFlow editor inside shape
```

退出规则：

1. 如果用户留下文字：shape 保持 block-backed。
2. 如果用户清空文字并离开编辑：删除空 NoteBlock / ContentMount，shape 退回 pure object。
3. 如果用户只是暂时聚焦但未输入：不应创建持久垃圾 block。

## 6. Workflow 5：paragraph block 加外观

入口：

1. 选中 paragraph block。
2. 修改背景、边框、圆角、阴影。

流程：

```text
selected CanvasObject(block-backed)
update VisualStyle
do not change TextFlow
```

关键点：

这不是“block 升格为 shape”。它仍然是 paragraph block 的画布投影，只是获得了视觉样式。

## 7. Workflow 6：移动对象跨越 PageFrame 边界

入口：

1. 用户拖动 block / shape / image。

流程：

```text
drag start -> capture original placement
drag move -> draft placement + boundary calculation
drag end -> update CanvasPlacement
if inside frame content area -> surface=formal_page, frameId=...
if outside all frames -> surface=canvas_workspace
if crossing -> boundaryRole=crossing
```

关键点：

1. PageFrame 的边界不是硬墙。
2. ruler / content inset / snap 开启时可以像“吸附墙”。
3. 关闭 snap 后，对象可以自由跨界。

## 8. Workflow 7：创建 / 设置 primary PageFrame

创建流程：

```text
create CanvasObject(kind=page_frame)
create CanvasPlacement
create PageFrameExtension
if no primaryFrameId -> set as primary
```

设置主 frame：

```text
if frame count >= 2 -> user can set primary
if frame count == 1 -> remaining frame auto primary
if no frame -> note opens in canvas mode
```

关键点：

1. 从外界打开 note 时，如果有 primary PageFrame，默认进入 Page Mode 并聚焦该 frame。
2. 自由画布 note 可以没有 primary PageFrame，除非用户主动设置。

## 9. Workflow 8：创建 visual arrow

入口：

1. 用户使用箭头工具连接两个视觉对象。
2. 或在空白处画一条箭头。

流程：

```text
tool state = connector
start handle / free point
end handle / free point
create VisualConnector
optional binding to CanvasObject ids
do not create KnowledgeRelation
```

关键点：

普通 Canvas Mode 的箭头只是视觉提示。

Relation 应该在 ContentGroup Mode 或 Relation View 中显化，不能让普通箭头自动承担知识关系。

## 10. Workflow 9：ContentGroup projection

入口：

1. 用户从 Group Rail / Gallery 拖 ContentGroup 到 Canvas。

流程草案：

```text
create CanvasObject(kind=content_group_projection)
create CanvasPlacement
create ContentMount(target=content_group, projectionMode=reference)
render as folder/tile/card
```

后续动作：

1. 打开原 group。
2. fork 成新 group。
3. duplicate projection。
4. materialize members into blocks。
5. 建立 reference link。

状态：

8.8 只预留；8.10+ 再实现成熟语义。

## 11. Workflow 10：AI 生成结构化文档

Miro 类场景可以拆成：

1. 用户选择若干 canvas objects 作为上下文。
2. AI 读取 Canvas AI Tree 中这些对象的内容、位置、聚类。
3. AI 生成 `CanvasProposal`。
4. Proposal 包含将要创建的 PageFrame / blocks / diagram / table。
5. 用户确认。
6. 系统把 Proposal 转成 CanvasCommand 执行。

关键原则：

1. 生成结果不应该只是不可编辑图片。
2. 生成的正式文档优先落成 PageFrame + paragraph blocks。
3. 生成的流程图如果还没有成熟 diagram object，可以先落成 blocks + visual connectors。

## 12. Workflow 11：导出 PageFrame

入口：

1. 用户选择导出主 PageFrame。
2. 或选择多个 PageFrame 导出。

流程：

```text
collect PageFrameExtension
collect objects inside export boundary
resolve reading order
render / serialize page
export PDF / image / document package
```

关键点：

1. 导出区域属于 PageFrame，不属于整个 Canvas。
2. PageFrame 外的 scratch / workspace objects 默认不导出。
3. crossing objects 需要明确策略：裁切、完整保留、提示用户。

## 13. 8.8 交互成熟线

8.8 至少要完成：

1. 创建 / 移动 / resize PageFrame。
2. 设置 primary PageFrame。
3. 创建 / 移动 paragraph block。
4. 创建 pure shape。
5. shape 填文字并退回 pure object。
6. 设置基础外观。
7. 创建 visual arrow。
8. 基础 selection / multi-select。
9. 基础 undo seed。
10. Canvas AI Tree 随操作刷新。

不要求完成：

1. 完整 diagram editor。
2. 完整 Agent 写画布。
3. 完整 ContentGroup projection。
4. 完整导出系统。
5. 完整 Raw Ink。

## 14. Interaction Inventory 自检

这份 workflow inventory 已经覆盖 8.8 的主路径，但在正式写 plan 前，还需要补：

1. 每个 workflow 的失败状态：保存失败、对象被删、source 不存在、asset 缺失。
2. Browser manual smoke checklist：页面打开、创建、拖动、刷新后保留、AI snapshot 可读。
3. Contract check：每种 command 后实体边界不被破坏。

这些内容应进入 8.8 具体 plan，而不是在阶段三继续无限展开。
