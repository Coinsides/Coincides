# Canvas / Page / Surface Contract

**状态**：V2.BN.6 合同
**用途**：定义 Better Notebook 如何理解 Canvas、PageFrame、workspace、placement 和未来 Canvas Engine 分支边界。

## 1. 核心模型

```text
Note
  owns NoteCanvas

NoteCanvas
  contains PageFrame and FrameOutsideWorkspace

PageFrame
  is exportable formal frame inside the canvas

FrameOutsideWorkspace
  is scratch / workspace area outside the PageFrame
```

Canvas 是 Note 的底层无限工作区。
Page 是 Canvas 内的固定可导出 frame。
Scratch / Workspace 是 PageFrame 外的 canvas area，不是第三种独立 surface。

## 2. Surface 对象

### NoteCanvas / DocumentSurface

Note 的底层空间。未来 Canvas Engine 应围绕它工作。

### PageFrame / FormalPage

Canvas 内的正式输出区域。A4 / A3 / A2 / A1 / Letter 等页面尺寸只描述 PageFrame 尺寸，不描述整张 Canvas。

### CanvasWorkspace / FrameOutsideWorkspace / ScratchArea

PageFrame 外部的自由空间。可用于：

- 草稿；
- 推导；
- sticky note；
- 局部 graph；
- 暂不导出的资料；
- 未整理想法。

### ExportPreview

导出预览是 projection，不是 truth。

### OverlayMode

overlay 是查看层，例如：

- block type overlay；
- AI visibility overlay；
- export status overlay；
- source warning overlay；
- relation debug overlay future。

## 3. Placement Truth

`BlockBox` / placement 是布局 truth，不是内容 truth。

最小字段：

```text
block_id
note_canvas_id
x
y
width
height
rotation future
rotation_origin future
surface_scope
export_role
ai_visibility
z_order future
```

`rotation` 是布局 truth 的未来字段。它不改变 NoteBlock content。

## 4. Connector / Relation 预留

未来 relation 需要连接点和视觉路径，但 V2.BN.6 不实现 relation runtime。

预留概念：

```text
connection_port
source_port
target_port
control_points
line_route
animation_hint
```

这些属于 visual connector / CanvasEdge truth 或 projection state，不等于 semantic ObjectRelation truth。

## 5. Page Mode / Canvas Mode

### Page Mode

- 聚焦 PageFrame 内的正式内容；
- 默认隐藏 PageFrame 外的 workspace block；
- 服务写作、正式阅读、PDF/export 预期；
- 不应把 PageFrame 外对象硬夹回页面。

### Canvas Mode

- 展开同一张 NoteCanvas；
- 显示 PageFrame 外 workspace；
- 允许更自由的空间布局；
- open canvas / edgeless workspace 默认允许 intentional overlap。

## 6. Page Preset / Canvas First

```text
Page-first note:
  从固定 PageFrame 开始，适合 PDF、图片、分享和正式阅读。

Canvas-first note:
  从 open infinite canvas 开始，适合非线性理解、演示、relation exploration 和大空间布局。
```

第一版不做直接 preset switching。

未来如果要从一种 preset 切到另一种 preset，默认路线是：

```text
duplicate note
-> copy NoteBlocks / SourceReferences / ObjectRelations
-> create target canvas/page preset
-> AI-assisted repagination proposal
-> user review and apply
```

## 7. Canvas Engine Branch 决策

当前 branch 是实验场、经验库和后备道路。

未来 Canvas Engine 阶段：

- 应新开独立 branch；
- 可以 clean reset 当前实验性 layout 数据；
- 不承诺为旧 `better_notebook_layout` / placement runtime 写长期 converter；
- 可以重写 `NoteDetail.tsx` 中的实验性 runtime；
- 以当前 UX 成果和 contract 为参考重建 Canvas-native runtime；
- 如果无限画布路线性能或复杂度不可控，可以回退到当前有限大画布路线。

## 8. 不属于 V2.BN.6 的内容

- 完整 infinite canvas engine；
- pan / zoom physics；
- multi-frame export；
- Frame Set / Export Sequence；
- Project-level Note Set Canvas；
- AI repagination proposal；
- relation path runtime。
