# 2026-06-25 02. Excalidraw 交互内核调研

status: phase-1 research
date: 2026-06-25 America/Toronto
scope: pointer lifecycle、viewport、selection、drag、resize、rotate、hit testing、history capture、对 Coincides Canvas 的交互启发

> 本文是 Coincides Canvas 第一阶段调研的第 2 份文档。目标是学习成熟画布工具如何组织交互内核，而不是复刻 Excalidraw 的 UI 和业务语义。

## 1. 交互内核总览

Excalidraw 的交互内核集中在：

```text
packages/excalidraw/components/App.tsx
packages/excalidraw/appState.ts
packages/excalidraw/types.ts
packages/element/src/collision.ts
packages/element/src/selection.ts
packages/element/src/resizeElements.ts
packages/element/src/transform.ts
packages/element/src/linearElementEditor.ts
```

整体上，它不是“每个图形自己接管 DOM 事件”的模式，而是：

```text
Canvas 接收 pointer / wheel / keyboard 事件
  -> 转换成 scene 坐标
  -> hit testing 判断对象
  -> 根据 activeTool / selection / pointerDownState 分发行为
  -> mutate scene elements
  -> 更新 AppState
  -> renderer 重画 static / interactive scene
  -> 根据 capture policy 决定是否进入 history
```

这对 Coincides Canvas 很重要。

我们未来即使继续使用 DOM/React 承载 TextFlow block，也应该让“画布级交互”有统一的 controller，而不是让每个 object 自己散落处理所有行为。

## 2. Pointer 生命周期

Excalidraw 的 pointer 生命周期可以概括为：

```text
pointerdown
  记录起点、选择状态、原始 elements、resize 状态、hit 结果
  建立 window pointermove / pointerup 监听

pointermove
  根据 pointerDownState 判断当前是 pan、drag、resize、rotate、box selection、linear editing、free draw、new element drawing
  更新 scene 或 appState

pointerup
  清理监听
  normalize element
  finalize new element
  更新 frame membership / bindings / selection
  schedule history capture
```

关键文件：

```text
packages/excalidraw/components/App.tsx
```

关键入口：

- `handleCanvasPointerDown`
- `handleCanvasPointerMove`
- `handleCanvasPointerUp`
- `initialPointerDownState`
- `onPointerMoveFromPointerDownHandler`
- `onPointerUpFromPointerDownHandler`

对 Coincides 的启发：

```text
Canvas 交互必须有一个统一的 PointerSession。
```

Coincides 可以设计：

```ts
type CanvasPointerSession =
  | { kind: "pan"; pointerId: number; startViewport: CanvasViewport; lastClientPoint: CanvasPoint }
  | { kind: "drag-object"; objectIds: string[]; originalPlacements: Record<string, CanvasPlacement> }
  | { kind: "resize-object"; objectId: string; handle: ResizeHandle; originalPlacement: CanvasPlacement }
  | { kind: "selection-box"; origin: CanvasPoint }
  | { kind: "new-object"; objectKind: CanvasObjectKind; draftObjectId: string }
  | { kind: "text-edit"; blockId: string };
```

不要把 pointermove 里的临时状态直接当作业务真相。

## 3. PointerDownState 的价值

Excalidraw 在 `initialPointerDownState` 中保存：

- pointer 起点；
- grid 对齐后的起点；
- 当前 selected elements 的 bounds；
- original elements deep copy；
- resize session；
- hit result；
- drag session；
- box selection session；
- event listeners。

这个设计非常值得学习。

它解决了一个问题：

```text
拖拽、缩放、旋转都不是“直接从当前状态算下一帧”。
很多时候必须知道 pointerdown 那一刻的原始状态。
```

对 Coincides 的启发：

- block 拖拽需要保存原始 placement；
- PageFrame resize 需要保存原始 frame model；
- 多选移动需要保存原始 selection placements；
- relation proposal arrow 创建需要保存起点 endpoint；
- AI action playback 也可以复用这种 before / after 结构。

## 4. 坐标转换

Excalidraw 的交互都需要从 viewport 坐标转换到 scene 坐标。

它使用类似：

```text
viewportCoordsToSceneCoords(event, appState)
```

其中 appState 提供：

- `scrollX`
- `scrollY`
- `zoom`
- `offsetLeft`
- `offsetTop`
- `width`
- `height`

对 Coincides 的启发：

Coincides 当前已经有：

```text
worldToScreen(point, viewport)
screenToWorld(point, viewport)
viewportToWorldRect(viewport)
```

对应文件：

```text
client/src/pages/Notes/canvasEngine/geometry.ts
```

因此我们不需要照搬 Excalidraw 的坐标函数。
但 Excalidraw 证明了一点：

```text
所有 object hit testing、drag、resize、drop、selection 都必须统一走 world coordinate。
```

如果 PageFrame 内 block、PageFrame 外 block、普通 shape、image、table、ContentGroup projection 分别用不同坐标系，后面一定会乱。

## 5. Panning 与 Zoom

Excalidraw 支持：

- space + drag pan；
- hand tool pan；
- middle mouse pan；
- wheel scroll；
- zoom；
- touch gesture；
- view mode panning。

当前 Coincides 已经有：

- canvas mode 下 `Space` 进入 pan ready；
- middle mouse / space + drag panning；
- wheel scroll；
- ctrl/meta + wheel zoom；
- ctrl/meta `+` / `-` / `0` zoom；
- `CanvasViewport` min / max zoom；
- viewport clamp 到 finite world。

对应文件：

```text
client/src/pages/Notes/canvasEngine/viewportService.ts
client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx
```

调研判断：

```text
Coincides 这部分方向正确。
```

下一步不应重写为 Excalidraw 的 `scrollX / scrollY` 命名，而是继续扶正自己的：

```text
CanvasViewport.x / y / width / height / zoom
CanvasWorld.origin / width / height
```

需要补的不是概念，而是：

- 触控手势；
- trackpad 手感；
- scroll inertia；
- zoom center consistency；
- viewport persistence；
- multi PageFrame initial view；
- Page Mode 与 Canvas Mode 切换时的视角策略。

## 6. Hit Testing

Excalidraw 的 hit testing 主要在：

```text
packages/element/src/collision.ts
```

核心思路：

- 先做便宜的 bounding box test；
- 再做精细 shape / outline test；
- 对旋转元素要把点旋回元素局部坐标；
- 对 line / arrow / freedraw 要测路径距离；
- 对 bound text 要额外算入命中；
- 对 frame name 也要单独测；
- 对 binding target 有专门的 threshold。

关键函数包括：

- `hitElementItself`
- `hitElementBoundingBox`
- `hitElementBoundText`
- `isPointInElement`
- `getAllHoveredElementAtPoint`
- `getHoveredElementForBinding`

对 Coincides 的启发：

```text
Hit testing 应该成为 Coincides Canvas 的基础服务，而不是散落在 React 组件里。
```

候选服务：

```text
canvasHitTestService.ts
```

它第一版可以不支持复杂路径，但至少要支持：

- PageFrame；
- TextFlowBlock placement；
- rectangular shape；
- image；
- table；
- selection box；
- resize handles；
- relation proposal endpoint reserve。

第一版可先只做 axis-aligned rect。
rotation / irregular shape 可以后置，但字段要预留。

## 7. Selection

Excalidraw 的 selection 主要由：

```text
selectedElementIds
selectedGroupIds
selectionElement
selectedLinearElement
editingGroupId
```

以及 `packages/element/src/selection.ts` 支撑。

它区分：

- 普通 selected elements；
- group selection；
- frame selection；
- bound text 是否随 container 选中；
- line editor selection；
- box selection；
- locked element；
- frame 与 frame children 同时选中时的排除规则。

对 Coincides 的启发：

Coincides 的 selection 至少需要分层：

```text
Text selection
Block selection
Canvas object selection
PageFrame selection
ContentGroup projection selection
RelationProposal selection
```

这些不能混成一个状态。

最小模型可以是：

```ts
type CanvasSelection =
  | { kind: "none" }
  | { kind: "text-range"; ranges: CapturedSelectionRange[] }
  | { kind: "block"; blockIds: string[] }
  | { kind: "canvas-object"; objectIds: string[] }
  | { kind: "page-frame"; frameIds: string[] }
  | { kind: "relation-proposal"; proposalId: string };
```

这对 Henry 之前提到的“Page Mode / Canvas Mode / ContentGroup Mode”非常关键。
不同 mode 下 selection 的合法对象不同。

## 8. Drag / Resize / Rotate

Excalidraw 的 transform 主要在：

```text
packages/element/src/resizeElements.ts
packages/element/src/transform.ts
packages/element/src/transformHandles.ts
```

观察到的关键点：

- resize / rotate 依赖 pointerdown 原始元素；
- 单元素和多元素 transform 分开处理；
- rotate 可按离散角度锁定；
- frame-like element 不允许 rotate；
- transform 后会更新 bound elements；
- text element resize 会触发 text wrapping / measurement；
- arrow 被 resize / rotate 时可能需要解除或重算 binding。

对 Coincides 的启发：

```text
第一版不要急着支持所有 object 的 rotate。
```

建议：

- Block 第一版只支持移动和宽度调整；
- PageFrame 第一版不支持 rotate；
- Image 第一版可支持 resize；
- Shape 第一版可支持移动、resize，rotation 字段预留；
- Table 第一版更像 block，不必支持 arbitrary rotate；
- ContentGroup projection 第一版先 tile / card，不支持 rotate；
- arrow 第一版可先支持 endpoints，不支持 elbow router。

## 9. Frame 交互

Excalidraw 的 frame 是一种 element：

```text
type: "frame"
name: string | null
```

其他 element 通过：

```text
frameId: string | null
```

表达属于某个 frame。

交互中有：

- frameToHighlight；
- drag elements over frame；
- pointerup 时更新 frame membership；
- frame export；
- frame clipping；
- frame children insertion order。

对 Coincides 的启发：

PageFrame 可以学习 frame membership，但不能照搬。

原因：

```text
Coincides PageFrame 不是普通视觉 frame。
它是正式写作区域、导出边界、Page Mode 入口、TextFlow 排版边界。
```

因此 PageFrame 至少需要区分：

- `primary` / `secondary`
- exportable
- contentInset
- ruler / margin guides
- header / footer / page number
- Page Mode default focus
- TextFlow column / writing boundary

Excalidraw 的 `frameId` 结构可以参考，但 PageFrame 的产品语义必须自研。

## 10. Text 编辑

Excalidraw 有自己的 text tool 和 WYSIWYG。

关键状态：

- `editingTextElement`
- `newElement` type text
- `textElement`
- `containerId`
- bound text。

对 Coincides 的判断：

```text
这一块原则上不学。
```

原因：

- Coincides 已经有 TextFlow；
- TextFlow 是内容真相；
- shape 内文字也应该挂载 TextFlow / Block；
- 不应引入第二套 `text element` truth。

可以学习的只有：

- 编辑态文本不一定由 canvas 直接渲染；
- 文本编辑可以用 DOM overlay；
- editing text element 在 static render 中可以被隐藏；
- text measurement / wrapping 必须可控。

这和 Coincides 当前方向一致：用 React / DOM 承载 TextFlow，而不是让 canvas 吞掉文本。

## 11. History Capture

Excalidraw 的交互不是每一帧都进入历史。

它区分：

- 拖动中的临时变化；
- pointerup 后的 finalize；
- `store.scheduleCapture()`；
- `CaptureUpdateAction.IMMEDIATELY`
- `CaptureUpdateAction.NEVER`
- `CaptureUpdateAction.EVENTUALLY`

对 Coincides 的启发：

Canvas Engine 从第一版就应该预留：

```text
CanvasCommand
CanvasDelta
CanvasHistoryEntry
CanvasEphemeralState
```

否则后面 AI Action Playback 会补得很痛苦。

建议第一版就定义概念，但实现可以很小：

- move block；
- resize block；
- create block from blank drop；
- toggle export role；
- toggle AI visibility；
- switch surface mode 不进入 content history；
- pan / zoom 不进入 content history，但可保存 viewport preference。

## 12. 对 Coincides 的交互清单建议

阶段二可以基于本调研设计 Coincides Canvas 第一版交互清单。

P0 必须：

- Page / Canvas mode 切换；
- canvas pan；
- canvas zoom；
- block placement restore；
- block drag；
- block resize；
- blank surface drop -> TextFlowBlock；
- PageFrame boundary render；
- workspace block visibility policy；
- viewport clamp；
- selection clear / escape；
- basic hit testing。

P1 应该：

- multi-select；
- selection box；
- snap guide；
- PageFrame ruler / content inset guide；
- PageFrame selection；
- object insert seed；
- object resize handles；
- context menu。

P2 后置：

- rotate；
- arbitrary shape；
- free draw；
- arrow binding；
- elbow arrow；
- AI action playback；
- relation proposal visual editor；
- multi PageFrame editing。

## 13. 第一阶段结论

Excalidraw 的交互内核真正值得学习的是：

```text
统一 pointer lifecycle
统一 scene coordinate
统一 hit testing
PointerDownState 保存原始状态
AppState 区分运行态
Store / History 区分 durable 与 ephemeral
static render 与 interactive overlay 分层
```

Coincides 不能照搬的是：

```text
Excalidraw text tool
Excalidraw frame 语义
Excalidraw group 语义
Excalidraw AppState 全量结构
Excalidraw element store 作为最终数据库
```

最稳定的判断：

```text
Coincides Canvas 应该学习 Excalidraw 的交互组织方式，
但继续由 TextFlow / PageFrame / ContentGroup 决定业务语义。
```

