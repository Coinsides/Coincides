# 2026-06-25 - Coincides Canvas 最小自研引擎设计稿 v0

> 目标：给 Coincides Canvas Engine 一个可执行的最小自研架构。它吸收 Excalidraw / tldraw / React Flow / Markmap 的经验，但不采用它们作为最终 runtime truth。

## 0. 路线锁定

路线名称：

```text
Self-owned Minimal Hybrid NoteCanvas Engine
```

含义：

1. 自研对象模型。
2. 自研 CanvasObject / Placement / ContentMount。
3. DOM 承载 TextFlow 和 block editor。
4. SVG / DOM overlay 承载 connector、selection、handle、debug。
5. CSS transform 承载 viewport pan / zoom。
6. finite world 承载可扩展画布。
7. AI snapshot 由 runtime 派生。

不把 Excalidraw / tldraw / BlockSuite / React Flow / Fabric / Konva 作为第一 runtime。

## 1. 引擎结构

```text
NoteCanvasRuntimeProvider
  -> CanvasDataAdapter
  -> CanvasViewportController
  -> CanvasSceneRuntime
      -> CanvasObjectRegistry
      -> CanvasPlacementIndex
      -> CanvasHitTestService
      -> CanvasMeasurementService
      -> CanvasSelectionService
      -> CanvasCommandDispatcher
      -> CanvasAISnapshotService
  -> CanvasRenderer
      -> BackgroundLayer
      -> PageFrameLayer
      -> BlockLayer
      -> CanvasObjectLayer
      -> ConnectorLayer
      -> OverlayLayer
      -> DebugLayer
```

## 2. 核心模块职责

### 2.1 CanvasDataAdapter

责任：

1. 从现有 note runtime 读取 blocks。
2. 读取 / 写入 CanvasObject、CanvasPlacement、PageFrameExtension。
3. 把旧的 placement metadata 迁移到新合同。
4. 给 runtime 提供稳定模型，不让 UI 组件直接碰数据库细节。

### 2.2 CanvasViewportController

责任：

1. 保存 viewport x / y / zoom。
2. world -> screen 坐标转换。
3. screen -> world 坐标转换。
4. pan / zoom。
5. Page Mode 聚焦 primary PageFrame。
6. Canvas Mode 展示 wider world。

### 2.3 CanvasSceneRuntime

责任：

1. 持有当前 scene 的 object index。
2. 持有 placement index。
3. 处理对象可见性。
4. 处理 boundary calculation。
5. 给 renderer 提供 visible objects。
6. 给 AI snapshot 提供结构化输入。

### 2.4 CanvasObjectRegistry

责任：

1. 注册 object kind。
2. 知道每种 object 怎么渲染、怎么测量、怎么序列化。
3. 区分 pure object、block-backed object、structured object、projection object。

最小 registry：

1. `page_frame`
2. `paragraph_block_projection`
3. `shape`
4. `visual_connector`
5. `image_shell`
6. `table_shell`

### 2.5 CanvasPlacementIndex

责任：

1. 按 objectId 查 placement。
2. 按 frameId 查对象。
3. 按 bbox 查命中候选。
4. 计算 object 是否 inside / outside / crossing PageFrame。
5. 支撑 z-order 排序。

### 2.6 CanvasHitTestService

责任：

1. 根据 pointer screen point 转 world point。
2. 找到命中的 object。
3. 区分 body / edge / resize handle / connector handle / text editor region。
4. 为交互状态机提供目标。

### 2.7 CanvasMeasurementService

责任：

1. 测量 DOM block 尺寸。
2. 缓存 object bbox。
3. 处理 auto-height block。
4. 为 AI snapshot 提供实际占地。

### 2.8 CanvasSelectionService

责任：

1. 管理 selected object ids。
2. 管理 focus object。
3. 管理 multi-select bbox。
4. 给 context menu / toolbar / AI context 提供选择状态。

### 2.9 CanvasCommandDispatcher

责任：

1. 接收 CanvasCommand。
2. 校验 command。
3. 写入 data adapter。
4. 生成 delta。
5. 触发 runtime refresh。
6. 为 undo/redo 留口。

### 2.10 CanvasAISnapshotService

责任：

1. 从 scene runtime 生成 Canvas AI Tree。
2. 输出 PageFrame、block、shape、connector 的可读结构。
3. 输出 selected context。
4. 不保存为真相，只作为派生快照。

## 3. Layer 设计

| Layer | 内容 | 技术形态 |
| --- | --- | --- |
| BackgroundLayer | 网格、背景、workspace | CSS / DOM |
| PageFrameLayer | PageFrame 背景、边框、阴影、page surface | DOM |
| BlockLayer | paragraph block、formula block、table block | DOM / React |
| CanvasObjectLayer | pure shape、image shell、structured shell | DOM / SVG |
| ConnectorLayer | visual arrows / connectors | SVG |
| OverlayLayer | selection handles、resize handles、tooltips、context menu | DOM |
| DebugLayer | bbox、AI tree debug、coordinates | DOM / SVG |

原则：

1. TextFlow editor 留在 DOM，不塞进 canvas bitmap。
2. connector 用 SVG 更自然。
3. 大量对象时再考虑 virtualization。

## 4. 数据合同 v0

### 4.1 NoteCanvas

```ts
type NoteCanvas = {
  canvasId: string;
  noteId: string;
  world: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
  defaultMode: 'page' | 'canvas';
  primaryFrameId?: string;
  createdAt: string;
  updatedAt: string;
};
```

### 4.2 CanvasObject

```ts
type CanvasObject = {
  objectId: string;
  canvasId: string;
  kind:
    | 'page_frame'
    | 'paragraph_block_projection'
    | 'shape'
    | 'visual_connector'
    | 'image'
    | 'table'
    | 'content_group_projection'
    | 'structured_object';
  backing: 'none' | 'note_block' | 'asset' | 'structured_object' | 'content_group';
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};
```

### 4.3 CanvasPlacement

```ts
type CanvasPlacement = {
  placementId: string;
  objectId: string;
  canvasId: string;
  frameId?: string;
  surface: 'formal_page' | 'canvas_workspace';
  boundaryRole: 'inside' | 'outside' | 'crossing';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visibility: 'visible' | 'hidden' | 'collapsed';
};
```

### 4.4 ContentMount

```ts
type ContentMount = {
  mountId: string;
  objectId: string;
  targetKind: 'note_block' | 'asset' | 'structured_object' | 'content_group' | 'petal';
  targetId: string;
  projectionMode: 'owned' | 'reference' | 'duplicate' | 'fork' | 'materialized';
  syncPolicy: 'manual' | 'read_through' | 'snapshot';
};
```

### 4.5 PageFrameExtension

```ts
type PageFrameExtension = {
  frameId: string;
  objectId: string;
  pageSize: 'A4' | 'Letter' | 'Custom';
  width: number;
  height: number;
  contentInset: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  rulerEnabled: boolean;
  snapEnabled: boolean;
  headerFooterEnabled: boolean;
  pageNumberEnabled: boolean;
  exportable: boolean;
};
```

## 5. Command 合同 v0

最小命令：

1. `CreatePageFrameCommand`
2. `SetPrimaryPageFrameCommand`
3. `CreateParagraphBlockOnCanvasCommand`
4. `CreateShapeCommand`
5. `AttachParagraphBlockToShapeCommand`
6. `DetachEmptyParagraphBlockFromShapeCommand`
7. `MoveCanvasObjectCommand`
8. `ResizeCanvasObjectCommand`
9. `UpdateVisualStyleCommand`
10. `CreateVisualConnectorCommand`
11. `DeleteCanvasObjectCommand`

每个 command 都应该能输出 delta：

```ts
type CanvasDelta = {
  commandId: string;
  created?: Array<{ kind: string; id: string }>;
  updated?: Array<{ kind: string; id: string; before?: unknown; after?: unknown }>;
  deleted?: Array<{ kind: string; id: string }>;
};
```

## 6. 运行时状态与持久状态

持久状态：

1. NoteCanvas。
2. CanvasObject。
3. CanvasPlacement。
4. ContentMount。
5. PageFrameExtension。
6. VisualStyle。
7. NoteBlock / TextFlow。

运行时状态：

1. viewport。
2. selected objects。
3. active tool。
4. drag draft。
5. resize draft。
6. hover target。
7. measurement cache。
8. visible object cache。

派生状态：

1. Canvas AI Tree。
2. export preview。
3. reading order hint。
4. boundary role cache。

## 7. 从现有 seed 迁移

当前已有：

1. `CanvasViewport`
2. `PageFrameModel`
3. `CanvasWorldModel`
4. `BlockPlacementModel`
5. `CanvasObjectReserve`
6. `RelationEndpointReserve`
7. `NoteCanvasRuntimeModel`

迁移思路：

1. 保留这些类型中的成熟字段。
2. 将 `BlockPlacementModel` 拆成 `CanvasObject + CanvasPlacement + ContentMount(note_block)`。
3. 将 `PageFrameModel` 升级为 `CanvasObject(page_frame) + CanvasPlacement + PageFrameExtension`。
4. 将 `CanvasObjectReserve` 升级为正式 `CanvasObject`。
5. `RelationEndpointReserve` 暂时保留为后续 Relation View 预留，不进入普通 visual arrow。

## 8. 8.8 v0 验收点

1. 打开 note 后可生成 NoteCanvas runtime。
2. 有 primary PageFrame 时默认 Page Mode。
3. Canvas Mode 可以 pan / zoom。
4. PageFrame 可创建、移动、resize、设主。
5. paragraph block 可放在 PageFrame 内或 workspace。
6. shape 可创建，填文字后挂载 paragraph block。
7. 空文字 shape 可退回 pure object。
8. visual arrow 可创建但不生成 Relation。
9. Canvas AI Tree 可输出当前 PageFrame / block / shape / arrow。
10. 刷新后关键对象保留。

## 9. 不进入 v0 的内容

1. 完整 infinite tile system。
2. 完整 object virtualization。
3. 完整 export renderer。
4. 完整 diagram editor。
5. 完整 Agent write。
6. 完整 relation graph。
7. Raw Ink / OCR。

## 10. 设计结论

Coincides Canvas Engine v0 的核心不是“画得多漂亮”，而是让以下四件事稳定：

1. 任何东西都能知道自己在画布上的位置。
2. 任何文字内容都不脱离 TextFlow。
3. 任何知识结构都不绕开 ContentGroup。
4. AI 能读取 layout，但不能直接污染真相。

这就是 Coincides 自研 Canvas Engine 的最小成立条件。
