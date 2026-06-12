# R1 - AFFiNE / BlockSuite Edgeless 参考分析

## 结论先行

AFFiNE / BlockSuite 是本轮最重要的参考对象，但不适合在 V2.BN.8 直接作为 Coincides 的底层 editor truth。它给我们的启发非常明确：

- 同一份文档可以被 page editor 和 edgeless editor 用不同 runtime 呈现。
- 无限画布不是只有“到处放东西”，而是一个包含 frame、surface、widget、toolbar、link card、connector 的完整编辑系统。
- frame 是 edgeless 中的可命名区域，可以用于 presentation / export / bounded view。
- 画布上的图形、连接线、笔刷等适合进入 canvas/surface 层；富文本编辑仍然应保留成熟文本编辑能力。

对 Coincides 来说，最重要的不是照搬 BlockSuite，而是吸收它的分层思想：

```text
Coincides Core truth
  -> Note / NoteBlock / Source / Relation / Template

Canvas Engine projection
  -> NoteCanvas / PageFrame / Workspace / Placement / Overlay

CanvasObject future
  -> shape / connector / sketch / region / drawing
```

## 证据来源

官方 Edgeless 文档说明，Edgeless Editor 提供无限逻辑尺寸的画布，适合 whiteboard 和 graphic editing；同时保留 page editor 的富文本能力；`CanvasElement` 被渲染到 HTML5 canvas，可包含 shape、brush、connector、text；frame 用来表示任意尺寸的画布区域；并且同一个 doc object 可以动态挂载到 page editor 或 edgeless editor 上。

来源：

- https://blocksuite.io/components/editors/edgeless-editor
- 本地源码：`D:\Coinsides\v2.x\_external_research\canvas-engine\blocksuite`

## 对 Coincides 有用的设计点

### 1. Page 和 Edgeless 不应互相否定

AFFiNE 的思路不是“Page 或 Canvas 只能二选一”，而是同一份文档可以在不同编辑 runtime 下工作。这对 Coincides 很关键，因为 Henry 已经明确：

```text
Page 是可导出的固定区域。
Canvas 是 Note 的空间底座。
Workspace 是 PageFrame 外的自由区域。
```

因此我们不应该把 Page 做成一个完全独立的文档类型，也不应该把 Workspace 做成另一个孤立 surface。更稳的定义是：

```text
一篇 Note 拥有一个 NoteCanvas。
NoteCanvas 可以拥有一个主 PageFrame。
PageFrame 内是可导出编辑区域。
PageFrame 外是 workspace / scratch 区域。
```

### 2. Frame 是未来功能，不是 V2.BN.8 第一版重点

BlockSuite 的 frame 可以支撑 presentation mode 和多区域组织。但 V2.BN.8 已经锁定：

- 一篇 Note 一个 NoteCanvas。
- 最多一个主 PageFrame。
- 不做多 frame 产品化。
- 不做 presentation mode。

所以第一版只需要把 `PageFrame` 当作“主页面边界”建好，不要提前做多 frame 管理 UI。

### 3. Surface 层需要和内容层分离

BlockSuite 文档提到 edgeless editor 的 canvas element 和一些顶层 blocks 位于 surface block 上。这提醒我们：画布对象和富文本内容不是同一类对象。

Coincides 里应明确：

- `NoteBlock` 是内容 truth。
- `BlockPlacement` / `CanvasNode` 是位置 truth。
- `CanvasObject` 是未来的画布对象 truth。
- `ObjectRelation` 是语义关系 truth。
- `CanvasConnector` 是视觉连线 / 可视关系投影，不自动等于语义关系。

### 4. Runtime compatibility 是长期目标，不是第一版迁移要求

BlockSuite 的强项是同一 doc object 可以被 page/editor runtime 共享。这件事很强，但也很重。Coincides 当前没有多人协作、CRDT、完整 widget 体系，因此不应在 V2.BN.8 为了追求这点而接入 BlockSuite。

更现实的做法：

```text
V2.BN.8
  建立自有 NoteCanvas runtime
  保留 PageFrame / Workspace / CanvasObject / endpoint 预留

未来
  如确实需要协同/CRDT/复杂编辑器能力，再研究 adapter 或迁移层
```

## 不建议直接采用 BlockSuite 的原因

### 1. 数据主权风险

Coincides 的核心 truth 是自有模型。BlockSuite 的文档、block spec、surface block、root service 都有自己的组织逻辑。直接接入会导致：

- NoteBlock truth 与 BlockSuite block truth 重叠。
- Layout truth 与 surface/frame truth 重叠。
- Source / Relation / Template 的自有设计被迫映射到外部 schema。

这会让后续 GraphRAG、source provenance、relation lifecycle 更难保持清晰。

### 2. 工程复杂度过高

BlockSuite 是完整编辑器框架，不只是一个画布库。接入它意味着接入：

- block spec 系统；
- root block service；
- widget 体系；
- surface block；
- 文档 runtime；
- undo/redo/collaboration 体系。

V2.BN.8 的真实目标是先重做 Canvas Engine，而不是重做整个 editor product stack。

### 3. UX 可控性不如自研

Coincides 的独特体验包括：

- PageFrame 内外一体；
- block 可自由排版；
- Source / Relation / AI visibility / Export status 的自有 overlay；
- 后续 relation endpoint 和 local graph；
- scratch/workspace 作为思想延伸区。

这些不是普通白板功能，直接套用外部 editor 会让定制成本很高。

## 可复用启发

### 数据对象

建议在 V2.BN.8 保留以下概念：

```text
NoteCanvas
PageFrame
Workspace
BlockPlacement
CanvasObject
CanvasConnector
RelationEndpoint
ViewportState
OverlayState
```

### 交互模式

可以借鉴 AFFiNE 的 Page / Edgeless 切换直觉，但 V2.BN.8 先不做切换：

```text
PageFrame mode
  用户在固定页面内写作。

Workspace view
  用户可看到 PageFrame 外的自由区域。

Future full edgeless mode
  用户从一开始创建无主 PageFrame 的 NoteCanvas。
```

### 工程策略

```text
不要把 BlockSuite 作为 runtime dependency。
把 BlockSuite 当作架构参考和 UX reference。
在 V2.BN.8 先实现 Coincides 自有最小 canvas runtime。
```

## 对 V2.BN.8 的建议

V2.BN.8 的第一版 engine sample 应只做：

- viewport pan / zoom；
- NoteCanvas 坐标系；
- PageFrame 边界；
- block placement；
- DOM block 渲染；
- overlay/control bar；
- selection / drag / resize；
- measurement cache；
- future relation endpoint reserve。

不做：

- BlockSuite 接入；
- 多 frame；
- presentation；
- full drawing tool；
- collaborative runtime；
- CRDT。

## Henry 需要拍板的问题

1. 后续是否把 AFFiNE 作为长期横向体验参考，而不是底层依赖？
2. V2.BN.8 是否明确写入“BlockSuite 不进入第一版实现”？
3. PageFrame 外 workspace 在第一版是否允许放置真实 NoteBlock，还是只允许保留坐标模型和视觉区域？
