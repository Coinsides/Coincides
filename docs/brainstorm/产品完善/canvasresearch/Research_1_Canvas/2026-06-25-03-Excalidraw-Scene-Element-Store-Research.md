# 2026-06-25 03. Excalidraw Scene / Element / Store 数据结构调研

status: phase-1 research
date: 2026-06-25 America/Toronto
scope: element model, scene cache, app state, store delta, history, serialization, 对 Coincides Canvas 数据层的启发

> 本文是 Coincides Canvas 第一阶段调研的第 3 份文档。目标不是把 Excalidraw 的 store 搬进 Coincides，而是理解成熟画布工具如何把“可保存的数据”“运行时缓存”“交互状态”“历史记录”拆开。

## 1. 调研入口

本地研究仓库：

```text
D:\Coinsides\v2.x\_research\excalidraw
```

重点文件：

```text
packages/element/src/types.ts
packages/element/src/newElement.ts
packages/element/src/mutateElement.ts
packages/element/src/Scene.ts
packages/element/src/store.ts
packages/excalidraw/appState.ts
packages/excalidraw/types.ts
packages/excalidraw/history.ts
packages/excalidraw/data/restore.ts
```

可以先把 Excalidraw 的数据层粗略分成 5 层：

```text
Element
  可序列化的画布对象数据

Scene
  当前画布元素集合与派生缓存

AppState
  当前 UI / 工具 / 选择 / 视口 / 编辑状态

Store / Delta
  增量变化、持久变化、临时变化、订阅通知

History
  undo / redo 可回滚的增量记录
```

这 5 层对 Coincides 非常有参考价值，因为它们证明一件事：

```text
成熟画布工具不会只靠一张 objects 表解决所有问题。
对象真相、运行时场景、交互状态、历史增量必须分层。
```

## 2. Element：画布对象的可保存真相

Excalidraw 的核心对象类型在：

```text
packages/element/src/types.ts
```

`ExcalidrawElement` 是一个 union，覆盖：

- rectangle / diamond / ellipse 等基础形状；
- line / arrow；
- freedraw；
- text；
- image；
- frame / magicframe；
- iframe / embeddable；
- 其他 generic shape。

基础字段大致包括：

```text
id
type
x
y
width
height
angle
strokeColor
backgroundColor
fillStyle
strokeWidth
strokeStyle
roughness
opacity
seed
version
versionNonce
index
isDeleted
groupIds
frameId
boundElements
updated
link
locked
customData
```

这里有几个重要判断。

第一，Element 必须是 JSON serializable。

源码注释明确强调 element 应该能被 JSON 序列化，并且不应该包含 computed data。这一点对 Coincides 也成立：

```text
CanvasObject / CanvasPlacement 的保存层不应该塞入运行时计算结果。
```

第二，几何信息是对象最底层能力。

无论对象是什么类型，只要它在画布上存在，就至少需要：

- id；
- kind/type；
- x / y；
- width / height；
- rotation/angle；
- z-index/index；
- visibility；
- lock state；
- group/frame ownership；
- version。

第三，文本对象在 Excalidraw 里是独立真相，但 Coincides 不能照搬。

Excalidraw 的 text element 有：

```text
text
originalText
fontSize
fontFamily
textAlign
verticalAlign
containerId
autoResize
lineHeight
```

这对 Excalidraw 合理，因为它本身就是白板工具。

但对 Coincides 来说，文字真相已经属于 TextFlow / Block。未来 shape 内部如果要填充文字，更合理的方向不是新建一套 `text shape truth`，而是：

```text
ShapeObject
  -> 挂载 TextFlowBlock / TextContent
  -> shape 只负责外形、位置、尺寸和容器约束
```

也就是说：

```text
Excalidraw text element = 它自己的业务真相
Coincides text in shape = TextFlow 真相在 CanvasObject 中的投影
```

## 3. Element 创建与变更

对象创建在：

```text
packages/element/src/newElement.ts
```

关键函数包括：

- `_newElementBase`
- `newElement`
- `newTextElement`
- `newFrameElement`
- `newEmbeddableElement`
- `newIframeElement`

`_newElementBase` 会生成：

- random id；
- seed；
- version；
- versionNonce；
- isDeleted false；
- updated timestamp；
- 默认样式字段；
- boundElements 等基础字段。

对象变更在：

```text
packages/element/src/mutateElement.ts
```

关键点：

- `mutateElement` 会原地修改 element；
- 变更会推进 version / versionNonce / updated；
- 宽高、点位、文件引用等变化会让 shape cache 失效；
- `newElementWith` 会创建新对象并推进版本；
- 对 elbow arrow 等特殊对象，会在变更时做规范化。

对 Coincides 的启发：

```text
CanvasObject 需要版本字段。
CanvasObject 的修改不能只是直接 setState。
需要一层 CanvasCommand / CanvasMutation / CanvasDelta 来统一推进版本、记录历史、触发派生缓存更新。
```

尤其是未来 AI、协作、重放、动画演示都会依赖这一点。

## 4. Scene：运行时场景与派生缓存

Scene 在：

```text
packages/element/src/Scene.ts
```

它不是单纯的 element 数组，而是运行时场景管理器。

内部维护：

- elements；
- elementsMap；
- nonDeletedElements；
- nonDeletedElementsMap；
- frames；
- nonDeletedFramesLikes；
- selectedElementsCache；
- sceneNonce；
- callbacks。

代表性能力：

- `replaceAllElements`
- `insertElement`
- `insertElementsAtIndex`
- `mapElements`
- `getElement`
- `getSelectedElements`
- `mutateElement`

重要点：

```text
Scene 会把保存层 element 重新组织成便于渲染、选择、命中测试、frame 查询的运行时结构。
```

这对 Coincides 很关键。

如果我们未来只有数据库实体，例如：

```text
canvas_objects
canvas_placements
page_frames
```

仍然不够。前端运行时还需要一层：

```text
CanvasSceneRuntime
```

它负责：

- 按 viewport 过滤可见对象；
- 根据 zIndex 排序；
- 建立 object id -> object 的索引；
- 建立 PageFrame -> children 的索引；
- 建立 ContentGroup projection -> source group 的索引；
- 计算可命中区域；
- 缓存 selection；
- 缓存 relation port / snap guide；
- 根据当前模式返回可交互对象。

也就是说：

```text
数据库实体是长期真相。
CanvasSceneRuntime 是前端当前画布的运行时投影。
```

这两者不能混为一谈。

## 5. AppState：交互状态不等于业务真相

Excalidraw 的 AppState 分散在：

```text
packages/excalidraw/appState.ts
packages/excalidraw/types.ts
```

它包含很多运行时 UI 状态，例如：

- activeTool；
- selectedElementIds；
- hoveredElementIds；
- editingTextElement；
- resizingElement；
- multiElement；
- selectionElement；
- frameToHighlight；
- editingFrame；
- scrollX / scrollY；
- zoom；
- current item style；
- menus / dialogs / sidebar；
- grid；
- snapping；
- collaborators；
- export settings。

`APP_STATE_STORAGE_CONF` 还定义了哪些字段可以保存到浏览器、文件、服务器，哪些只是运行时状态。

这里最值得学习的是分层，而不是具体字段。

Coincides 未来也需要区分：

```text
CanvasEntityTruth
  持久对象、PageFrame、Placement、Projection

CanvasRuntimeState
  当前 viewport、selection、hover、drag session、snap guide、active tool

CanvasPreferenceState
  用户偏好，例如 grid、snap、默认样式

CanvasDocumentState
  这篇 note 自己的主 PageFrame、world size、默认模式
```

如果不分层，后续会出现两个问题：

1. 把 UI 状态误写进业务实体，导致数据污染；
2. 把业务真相只放在前端 state，导致 AI、导出、复用、协作都读不到。

## 6. Store / Delta：从直接变更走向增量系统

Store 在：

```text
packages/element/src/store.ts
```

它处理的是增量变化，而不是简单保存全量 scene。

核心概念：

```text
CaptureUpdateAction.IMMEDIATELY
CaptureUpdateAction.NEVER
CaptureUpdateAction.EVENTUALLY
```

含义大致是：

- `IMMEDIATELY`：本地、可撤销、应立刻进入 history 的变化；
- `NEVER`：远端同步、初始化等不应进入本地 undo 的变化；
- `EVENTUALLY`：可以稍后合并或捕获的变化。

Store 还区分：

- durable increment；
- ephemeral increment；
- scheduled macro action；
- scheduled micro action；
- snapshot；
- changed elements；
- partial appState。

`StoreDelta` 可以：

- calculate；
- restore；
- load；
- squash；
- inverse；
- applyTo；
- applyLatestChanges；
- isEmpty。

这给 Coincides 一个非常重要的启发：

```text
Canvas 引擎不能只做“拖一下就保存一下”。
它需要知道哪些变化是用户意图，哪些只是交互过程中的临时状态。
```

例如：

- 鼠标拖动过程中的每一帧位置变化，不应该都成为一次独立 undo；
- 拖动结束后的位置变化，才应该成为一个 command；
- AI 生成 proposal 不是直接 durable mutation；
- 用户确认 proposal 后才进入 durable command；
- 远端同步、导入、初始化不应该污染本地 undo 栈。

Coincides 可以学习这个方向，但命名和数据必须按自己的业务来：

```text
CanvasCommand
CanvasDelta
CanvasActionLog
CanvasProposal
CanvasRuntimePatch
```

## 7. History：undo / redo 的关键不是快照，而是可逆增量

History 在：

```text
packages/excalidraw/history.ts
```

它使用 `HistoryDelta extends StoreDelta`，维护：

- undoStack；
- redoStack；
- record(delta)；
- undo；
- redo；
- perform；
- HistoryChangedEvent。

有几个细节值得记录：

- 空 delta 不记录；
- redo stack 不是所有 appState 小变化都清空；
- undo / redo 应用的是 delta；
- 某些 runtime fields 不参与 history；
- version / versionNonce 在 history apply 时有特殊处理。

对 Coincides 的启发：

```text
CanvasHistory 不应该是简单的全量 JSON 快照列表。
```

更合理的是：

```text
Command:
  type: move_object | resize_object | create_object | delete_object | change_page_frame | set_primary_page_frame
  before: relevant partial state
  after: relevant partial state
  affectedObjectIds: string[]
  source: user | ai_proposal_confirmed | import | system_repair
```

这样后续才能支持：

- undo / redo；
- action replay；
- AI 修改建议；
- 协作合并；
- 动画重放；
- 检查某次修改影响了哪些 object。

## 8. 删除策略：Excalidraw 的 isDeleted 不等于 Coincides 必须软删

Excalidraw element 有：

```text
isDeleted
```

白板工具中保留 deleted element 有它的理由：

- 协作同步；
- undo / redo；
- 场景合并；
- 文件恢复；
- 历史兼容。

但 Coincides 不能因此默认所有实体都软删。

前面 ContentGroup System 已经形成判断：

```text
不要无节制地把所有东西放进软删除黑盒。
```

Canvas 第一版可以区分：

- 前端一次交互 session 内，为了 undo/redo 暂存 before/after；
- 持久数据库层是否保留 tombstone；
- 导入/同步/协作时是否需要 deletion marker；
- 用户明确删除测试数据时是否硬删。

因此：

```text
isDeleted 是一种成熟工具的协作/历史选择，不是 Coincides 所有实体的默认策略。
```

## 9. Group / Frame / Binding 的保存关系

Excalidraw element 里有：

- `groupIds`
- `frameId`
- `boundElements`
- `startBinding`
- `endBinding`
- `containerId`

这些字段说明它把对象之间的某些关系直接存在 element 上。

对普通白板工具来说这很自然：

```text
rectangle belongs to frame
arrow binds to rectangle
text belongs to container
element belongs to visual group
```

但 Coincides 要更谨慎。

因为 Coincides 里至少有几类关系：

- CanvasObject 的视觉组织关系；
- PageFrame 的承载关系；
- TextFlowBlock 的内容归属关系；
- ContentGroup / Member / Petal 的知识组织关系；
- Relation / RelationProposal 的语义关系；
- export / AI visibility 的阅读关系。

这些关系不应该全部塞进一个 `boundElements` 或 `groupIds` 字段里。

可以借鉴的地方是：

```text
对象之间需要稳定可追踪的关系字段。
```

不能照搬的地方是：

```text
Coincides 的知识关系不能降级成画布视觉绑定。
```

## 10. Serialization / Restore：外部文件恢复不是业务设计终点

Excalidraw 有完整的数据恢复和序列化路径：

```text
packages/excalidraw/data/
```

这让它可以：

- 从文件恢复场景；
- 从本地存储恢复；
- 处理版本兼容；
- 恢复 elements / appState / files；
- 修复旧数据。

Coincides 未来也需要类似能力，但目标不同。

Excalidraw 的核心是：

```text
把一个白板文件恢复成可编辑白板。
```

Coincides 的核心是：

```text
把 note / TextFlow / ContentGroup / PageFrame / CanvasObject / Relation 的联合工程包恢复成同一个知识工作区。
```

所以 Coincides 的 restore 不只是 canvas restore，而是 workspace package restore。

这意味着 Canvas 数据结构从一开始就要服务于：

- 工程包导入导出；
- 本地数据库重建；
- AI-readable snapshot；
- future GraphRAG；
- source truth 与 projection truth 的分离。

## 11. 与 Coincides 的翻译表

| Excalidraw 概念 | 职责 | Coincides 可学习点 | Coincides 不应照搬点 |
| --- | --- | --- | --- |
| Element | 可保存画布对象 | `CanvasObject` 最小几何字段、版本字段、样式字段 | text element 不应成为第二套文本真相 |
| Scene | 运行时对象集合和缓存 | `CanvasSceneRuntime`、id map、visible object、selection cache | 不要把 runtime cache 当数据库 |
| AppState | 工具、选择、视口、UI 状态 | `CanvasRuntimeState` 与持久 truth 分离 | 不要把所有 UI 状态持久化 |
| Store | 增量、订阅、捕获策略 | `CanvasDelta` / `CanvasCommand` / durable vs ephemeral | 不要让外部 store 成为业务数据库 |
| History | undo / redo | command-based undo / redo | 不要用全量快照硬堆历史 |
| Frame | 画布中的容器/区域 | PageFrame 可借鉴 frame membership / export boundary | PageFrame 远比普通 frame 特殊 |
| Binding | 视觉连线绑定 | arrow 端点跟随对象移动 | 不要自动等同 Relation |
| Files / assets | 图片等资源 | asset registry / file id | 资源也要进入 Coincides 工程包语义 |

## 12. 对 Coincides Canvas 的第一轮数据层建议

这不是阶段二最终设计，只是从本轮调研得到的第一轮建议。

### 12.1 需要保留的分层

Coincides Canvas 至少需要：

```text
CanvasDocument
  note 级 canvas 配置，例如 world、默认 mode、primary PageFrame

CanvasObject
  画布对象身份和类型

CanvasPlacement
  对象在某个 canvas / PageFrame / world 中的位置、尺寸、旋转、层级

CanvasRuntimeState
  当前选择、hover、drag、snap、active tool、viewport

CanvasSceneRuntime
  前端缓存和派生索引

CanvasCommand / CanvasDelta
  用户和 AI proposal 确认后的变更记录

CanvasAsset
  图片、文件、未来媒体资源
```

### 12.2 PageFrame 不应该只是 frameId

Excalidraw frame 能给我们参考，但 Coincides PageFrame 至少还承担：

- 导出边界；
- Page Mode 入口；
- primary frame；
- 页边距；
- 标尺；
- 页眉页脚；
- 页码；
- 模板；
- TextFlow 排版限制；
- AI/export visibility；
- 多 PageFrame 文档结构。

所以 PageFrame 应该拥有自己的独立实体或至少自己的独立子模型。

### 12.3 TextFlowBlock 是内容真相，不是 text shape

如果 shape 内部有文字，优先方向应该是：

```text
CanvasObject(kind: shape)
  placement: geometry
  text_mount: blockId / textFlowId
```

而不是：

```text
CanvasObject(kind: text)
  text: string
```

后者会让 TextFlow 和 Canvas 文本分裂。

### 12.4 Store 思想值得学，但 store 本身不能成为数据库

Excalidraw 的 store 非常成熟，但它适合白板场景。

Coincides 需要的是：

```text
业务实体数据库
  + 前端 CanvasSceneRuntime
  + CanvasCommand / CanvasDelta
  + AI Proposal flow
```

而不是：

```text
直接把一个外部白板 store 当作所有知识对象的真相。
```

## 13. 阶段一结论

本轮数据层调研的核心结论是：

```text
Coincides Canvas 可以学习 Excalidraw 的分层方式，
但必须坚持自己的业务真相。
```

可学习的内容：

- element 最小几何字段；
- scene runtime cache；
- app state 与持久 truth 分离；
- durable / ephemeral 增量；
- command/history 的可逆变化；
- frame / binding 的视觉关系维护；
- serialization / restore 的版本修复思路。

必须拒绝或重写的内容：

- 第二套 text truth；
- 把外部 store 当数据库；
- 把普通 arrow 当 Relation；
- 把 frame 等同 PageFrame；
- 把所有对象关系压进统一视觉 binding；
- 无边界复制软删除策略。

这份文档给第二阶段留下的核心问题是：

```text
Coincides Canvas 的正式数据模型，应该如何从当前有限画布胚胎扶正为：
CanvasDocument + PageFrame + CanvasObject + CanvasPlacement + CanvasRuntime + CanvasCommand？
```

