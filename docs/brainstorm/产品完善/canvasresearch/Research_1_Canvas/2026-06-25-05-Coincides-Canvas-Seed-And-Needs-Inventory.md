# 2026-06-25 05. Coincides 当前有限画布胚胎与需求盘点

status: phase-1 research
date: 2026-06-25 America/Toronto
scope: current canvas seed, page mode, canvas mode, PageFrame, TextFlow block placement, runtime model, 8.8 前需求清单

> 本文是 Coincides Canvas 第一阶段调研的第 5 份文档。目标是盘点当前工程里已经存在的有限画布胚胎，并把它和后续正式 `Coincides Canvas` 引擎需要的能力区分开。

## 1. 结论先行

当前 Coincides 并不是完全没有 Canvas。

它已经有一套“可扶正”的有限画布胚胎：

```text
page mode / canvas mode
finite world
viewport pan / zoom
primary PageFrame
formal page / canvas workspace surface
TextFlow block placement
scratch workspace
export / AI visibility seed
relation endpoint reserve
runtime model contract check
```

但它还不是完整的 Canvas Engine。

当前缺的是：

```text
独立 CanvasObject 实体
多 PageFrame
PageFrame 精细化系统
对象级 hit test / selection / transform
正式 CanvasSceneRuntime
正式 CanvasCommand / History
普通 object 插入协议
ContentGroup projection
RelationProposal projection
AI-readable Canvas snapshot
```

所以 8.8 的合理目标不是“从零做一个白板”，而是：

```text
把 V2.BN.8 中已经长出来的有限画布胚胎扶正成 Coincides Canvas v0。
```

## 2. 当前工程入口

当前主要代码在：

```text
client/src/pages/Notes/canvasEngine/
```

关键文件：

```text
types.ts
engineModel.ts
viewportService.ts
runtimeLayout.ts
placementService.ts
pageFrameService.ts
modePolicyService.ts
geometry.ts
hooks/useNoteCanvasLayoutModel.ts
layers/NoteWritingSurfaceLayer.tsx
client/scripts/canvasEngineModelContractCheck.ts
```

这说明当前画布能力已经不是散落在 UI 里的临时代码，而是有一个初步的 `canvasEngine` 目录和 contract check。

## 3. 当前 Canvas runtime model

`types.ts` 中已经有：

```ts
export type NoteCanvasMode = 'page' | 'canvas';
export type CanvasSurface = 'formal_page' | 'canvas_workspace';
export type CanvasBoundaryKind = 'inside' | 'outside' | 'crossing';
```

核心模型：

```ts
export interface CanvasViewport extends CanvasPoint, CanvasSize {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface PageFrameModel extends CanvasRect {
  id: string;
  role: 'primary_page_frame';
  exportable: boolean;
  contentInset: CanvasInset;
}

export interface CanvasWorldModel extends CanvasSize {
  origin: CanvasPoint;
}

export interface BlockPlacementModel extends CanvasRect {
  blockId: string;
  placementId: string;
  objectId: string;
  objectKind: 'note_block';
  canvasId: string;
  frameId?: string;
  surface: CanvasSurface;
  boundaryRole: CanvasBoundaryKind;
  zIndex: number;
  snapState?: 'snapped' | 'free';
  visibilityState?: 'normal' | 'scratch' | 'ai_hidden' | 'export_hidden';
  rotation?: number;
}
```

以及一个总 runtime：

```ts
export interface NoteCanvasRuntimeModel {
  version: string;
  route: 'self_owned_minimal_hybrid';
  mode: NoteCanvasMode;
  world: CanvasWorldModel;
  viewport: CanvasViewport;
  primaryPageFrame: PageFrameModel | null;
  blockPlacements: BlockPlacementModel[];
  visibleBlockIds: string[];
  canvasObjectReserve: CanvasObjectReserve[];
  relationEndpointReserve: RelationEndpointReserve[];
}
```

这个模型已经表达了几个关键思想：

- page 和 canvas 是同一 note 的两种 surface mode；
- PageFrame 已经是 runtime 的一等对象；
- block 在画布上不是纯 DOM 排版，而是有 placement；
- workspace 区域和正式页面区域已经被区分；
- relation endpoint 已经预留；
- canvas object reserve 已经留口。

## 4. 有限 world 已经存在

`engineModel.ts` 中：

```ts
export const DEFAULT_CANVAS_WORLD: CanvasWorldModel = {
  origin: { x: 0, y: 0 },
  width: 4096,
  height: 2600,
};
```

这和前面讨论的判断高度一致：

```text
Coincides Canvas 的根基不是数学意义上的无限画布，
而是可扩展的有限画布。
```

当前 world 是固定的。

未来可以升级为：

- note-level world；
- 可扩展 world；
- 多 region / chunk；
- 根据对象分布自动扩张；
- zoom-out 时渲染概览；
- AI snapshot 时按 region 分块读取。

但当前胚胎已经证明：

```text
有限 world 的路线和当前工程方向兼容。
```

## 5. Viewport / pan / zoom 已经有基础

`viewportService.ts` 里已经有：

- `createRuntimeViewport`
- `createRuntimeWorld`
- `clampViewportToWorld`
- `panViewportByViewportDelta`
- `scrollViewportByViewportDelta`
- `zoomViewportAtViewportPoint`
- `viewportPointToWorldPoint`

重要参数：

```text
canvas 初始 viewport x = -180
canvas 初始 viewport y = -64
min zoom = 0.45
max zoom = 2.4
```

这说明当前已有：

- page mode viewport；
- canvas mode viewport；
- pan；
- scroll；
- zoom；
- screen point -> world point；
- world clamp。

后续需要补：

- 持久化 viewport；
- per note / per user viewport preference；
- mini map 或 overview；
- zoom level UI；
- viewport animation；
- fit to PageFrame；
- fit to selection；
- reset to primary PageFrame；
- viewport 与 PageMode 的精细切换。

## 6. PageFrame 当前状态

当前 PageFrame 的基础常量：

```ts
export const DEFAULT_PRIMARY_PAGE_CONTENT_WIDTH = 760;
export const DEFAULT_PRIMARY_PAGE_FRAME_CONTENT_INSET = {
  top: 0,
  right: 72,
  bottom: 96,
  left: 72,
};
```

PageFrame 宽度：

```text
content width + left inset + right inset
```

当前 PageFrame 职责：

- 作为正式写作区域；
- 作为 page mode 的主要区域；
- 作为 export preview 的基础；
- 通过 `contentInset` 区分内容区和页面边界；
- 通过 `primaryPageFrame` 进入 runtime model；
- 通过 `frameId` 接收正式页面内的 block placement。

但它还没有做到：

- 多 PageFrame；
- primary PageFrame 切换；
- PageFrame 删除规则；
- A4 / Letter / 自定义尺寸；
- 页眉页脚；
- 页码；
- page background；
- template；
- ruler；
- margin / tab stop / indent；
- header/footer widget；
- 页面之间的连续阅读体验；
- PageFrame 自己的独立实体。

因此阶段一结论是：

```text
PageFrame 已经是胚胎里的第一等角色，
但还没有成为正式的特殊 CanvasObject。
```

## 7. PageMode / CanvasMode 的分工已经成型

当前 `modePolicyService.ts` 表达了一个重要判断：

```text
page mode:
  hide workspace blocks
  use global page scroll

canvas mode:
  show workspace blocks
  disable global page scroll
```

这和产品心智一致：

- PageMode 用来自然写作；
- CanvasMode 用来看到更大的空间；
- workspace block 不应该破坏 page mode 阅读；
- canvas mode 才显示 page 外内容。

后续需要补：

- 切换时的 viewport 记忆；
- 从外部打开 note 时是否进入 PageMode；
- 如果 note 是自由画布创建，是否默认进入 CanvasMode；
- primary PageFrame 设定；
- PageMode 与 CanvasMode 的路由状态；
- 多 PageFrame 下 PageMode 如何选择当前 frame。

## 8. Block placement：TextFlow 已经开始投影到 Canvas

当前 `placementService.ts` 使用：

```text
NOTE_LAYOUT_KEY = better_notebook_layout
```

从 block 的 `display_overrides_json` 里读取 layout。

layout 包含：

```text
x
y
width
height
rotation
export_role
ai_visibility
surface
width_mode
```

这证明当前已经在做：

```text
TextFlowBlock -> Canvas placement projection
```

而不是单纯用 CSS 排版。

当前 block placement 能表达：

- 在正式页面内；
- 在 workspace；
- crossing；
- export included / excluded / scratch；
- AI visible / hidden；
- manual width；
- rotation；
- zIndex；
- snap state。

这和未来正式 CanvasPlacement 是相通的。

但当前还不完整：

- placement 仍然附着在 note block metadata 中；
- 不是独立 `CanvasPlacement` 实体；
- 没有通用 `CanvasObject`；
- 只有 `objectKind: 'note_block'`；
- 对 image/table/shape/freehand 等对象还只是 reserve；
- 对 ContentGroup projection 还没有实体；
- 对 multi-placement / reuse 还没有支撑。

## 9. Scratch workspace 已经有产品语义

当前 boundary 逻辑：

```text
inside
outside
crossing
```

以及：

```text
formal_page
canvas_workspace
```

配合：

```text
export_role
ai_visibility
visibilityState
```

已经形成一套很有价值的语义：

- PageFrame 内是正式内容；
- PageFrame 外是 scratch / workspace；
- workspace 默认可以不导出；
- workspace 默认可以 AI hidden；
- 用户可以切换 export / AI visibility。

这对 Coincides 很重要。

因为 Canvas 不是纯视觉白板，它还承担：

```text
哪些内容进入正式输出？
哪些内容让 AI 读取？
哪些内容只是用户的临时草稿？
```

这也是 Coincides 和普通白板工具的区别。

## 10. Relation endpoint reserve 已经埋下种子

当前 `buildRelationEndpointReserveForPlacement` 会给 block placement 生成左右两个 endpoint：

```text
placement:relation-port:left
placement:relation-port:right
```

字段：

```text
ownerId
ownerKind
anchor
normal
```

这是很好的设计种子。

它说明系统已经开始意识到：

```text
画布对象需要连接端口。
```

但按照现在最新讨论，普通 Canvas Mode 不应该直接生产 Relation。

因此这个 reserve 后续可以分化成两类：

```text
CanvasVisualEndpoint
  给普通 arrow / connector 使用

KnowledgeRelationEndpoint
  给 ContentGroup / Petal / RelationProposal 使用
```

这可以避免把所有连线都混在一个语义里。

## 11. 当前 UI 层已经承载了部分画布交互

`NoteWritingSurfaceLayer.tsx` 当前已经处理：

- canvas mode 下 ResizeObserver 更新 viewport size；
- space pan ready；
- canvas panning；
- ctrl/meta + wheel zoom；
- ctrl/meta + +/-/0 zoom；
- viewport transform；
- blank surface drop；
- block move；
- block resize；
- snap guide；
- page boundary；
- scratch workspace label；
- content group drag payload；
- annotation / content group side panel 等既有 note 能力。

这说明当前画布交互还比较集中在 `NoteWritingSurfaceLayer` 里。

后续正式引擎需要把它拆成：

```text
CanvasController
CanvasPointerSession
CanvasKeyboardController
CanvasViewportController
CanvasSelectionController
CanvasObjectLayer
PageFrameLayer
TextFlowBlockProjectionLayer
OverlayLayer
```

否则随着 object 增加，UI 层会变得过重。

## 12. Contract check 已经在守模型边界

当前存在：

```text
client/scripts/canvasEngineModelContractCheck.ts
```

它覆盖了很多现有边界，例如：

- page / canvas viewport；
- page / canvas world；
- pan / scroll / zoom；
- page mode 隐藏 workspace；
- canvas mode 显示 workspace；
- default draft 在 formal page；
- PageFrame height 忽略 workspace blocks；
- workspace block 不被 page mode clamp 回 PageFrame；
- formal auto-width block 跟随 PageFrame；
- manual width 保持；
- relation endpoint reserve；
- runtime model route。

这对 8.8 很重要。

后续做正式 Canvas Engine 时，不应该拆掉这些 contract，而是把它们升级为：

```text
Coincides Canvas v0 model contract
```

也就是说：

```text
当前合同检查是未来引擎测试的种子。
```

## 13. 当前胚胎与 Excalidraw 调研的对应关系

| Excalidraw 调研概念 | Coincides 当前状态 | 差距 |
| --- | --- | --- |
| Element | 只有 `note_block` placement，`canvasObjectReserve` 只是预留 | 缺正式 CanvasObject |
| Scene | `NoteCanvasRuntimeModel` 初步存在 | 缺 SceneRuntime cache / hit test / selection |
| AppState | viewport / surfaceMode / selection 分散在 React state | 缺统一 CanvasRuntimeState |
| Store / Delta | block layout draft / layout history 存在一些局部能力 | 缺 CanvasCommand / CanvasDelta |
| History | 有 layout history / keyboard intent | 缺对象级 undo/redo |
| Frame | `PageFrameModel` 存在 | 缺多 PageFrame 和精细化系统 |
| Binding | relation endpoint reserve 存在 | 缺 visual endpoint binding |
| Export | exportPreview 已有 block 层基础 | 缺 PageFrame / object / asset 统一 export |
| Text | TextFlow 已是内容真相 | 需要正式 text mount 协议 |

## 14. Coincides Canvas 第一阶段需求清单

从当前胚胎出发，后续设计至少要回答这些问题。

### 14.1 引擎层

- CanvasDocument 是否独立？
- CanvasWorld 是否 per note 持久化？
- CanvasViewport 是用户偏好还是 note 状态？
- CanvasSceneRuntime 如何构建？
- CanvasObject / CanvasPlacement 是否拆成两个实体？
- object zIndex / layer 如何保存？
- viewport、selection、hover、drag session 如何分层？

### 14.2 PageFrame 层

- PageFrame 是否作为特殊 CanvasObject？
- 是否需要独立 PageFrame 实体？
- primary PageFrame 如何保存？
- 多 PageFrame 如何管理？
- PageFrame 删除后如何自动补 primary？
- A4/Letter/template 如何表达？
- margin / ruler / snap guide 如何表达？
- header/footer/page number 是子组件还是 PageFrame widget？

### 14.3 TextFlow / Block 投影层

- BlockPlacement 是否独立成实体？
- shape 内部文字是否挂载 TextFlowBlock？
- table/image 是否作为 block-like object？
- PageFrame 外 block 是否仍然参与 TextFlow 顺序？
- TextFlow 顺序与 Canvas 空间顺序如何并存？
- AI 读取时以 TextFlow 还是 Canvas layout 为主？

### 14.4 Object 层

第一批候选 object：

- note block projection；
- shape；
- image；
- table；
- arrow；
- freehand；
- link/embed；
- ContentGroup projection；
- Petal projection。

第一版要谨慎。

更合理的最低顺序可能是：

```text
PageFrame
TextFlowBlock placement
Shape with optional TextFlow mount
Image block / image object
Table block / table object
Simple arrow
ContentGroup projection reserve
```

### 14.5 Relation / ContentGroup Mode

- Canvas Mode 的 arrow 是否永远默认为视觉对象？
- ContentGroup Mode 是否独立成为 note 的第三种视图？
- RelationProposal 是否从 ContentGroup/Petal 端点建立？
- 关系箭头是否是 RelationProjection，而不是 CanvasObject？
- AI review proposal 的状态如何保存？

### 14.6 AI-readable Canvas

最低需要给 AI：

- PageFrame 列表；
- PageFrame 主副关系；
- TextFlow block 内容；
- block placement；
- object kind；
- object geometry；
- export / AI visibility；
- ContentGroup projection；
- RelationProposal / Relation projection；
- canvas region / viewport snapshot；
- object 到 source truth 的链接。

AI 不应该只看 OCR 截图。

更合理的是：

```text
structured snapshot first
visual/OCR fallback second
```

## 15. 当前实现中可以保留并扶正的部分

可以保留：

- `CanvasViewport`；
- `CanvasWorldModel`；
- `PageFrameModel` 的基础字段；
- page/canvas mode；
- formal_page / canvas_workspace；
- placement geometry；
- export_role / ai_visibility；
- relation endpoint reserve 的思想；
- viewport service；
- geometry service；
- model contract check。

需要重构或升级：

- `CanvasObjectReserve` -> 正式 `CanvasObject`；
- `BlockPlacementModel` -> 正式 `CanvasPlacement`；
- `primaryPageFrame` -> 多 PageFrame + primary frame；
- layout metadata -> 独立持久层；
- NoteWritingSurfaceLayer 内部交互 -> CanvasController；
- relation endpoint reserve -> visual endpoint / knowledge endpoint 分层；
- layout history -> CanvasCommand / CanvasDelta；
- PageFrame 常量 -> PageFrame schema/template。

## 16. 阶段一结论

Coincides 当前画布不是废弃模拟层，而是：

```text
自研 Coincides Canvas 的早期胚胎。
```

它已经证明几条路线是成立的：

- 有限 world 可以工作；
- PageMode / CanvasMode 可以共存；
- TextFlow block 可以投影到画布；
- PageFrame 可以成为正式页面边界；
- workspace 可以承载草稿和非导出内容；
- export / AI visibility 可以作为 layout 语义；
- relation endpoint 可以作为未来连接机制种子。

但它还需要在 8.8 被扶正：

```text
从 note block layout runtime
升级为 CanvasDocument / PageFrame / CanvasObject / CanvasPlacement / CanvasRuntime / CanvasCommand 的正式引擎。
```

给第二阶段留下的核心问题是：

```text
如何在不破坏 TextFlow-first 的前提下，
把当前有限画布胚胎升级成 Coincides Canvas v0？
```

