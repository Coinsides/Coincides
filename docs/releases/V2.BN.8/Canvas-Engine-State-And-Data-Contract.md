# Canvas Engine State And Data Contract

## 负责什么

本文负责 V2.BN.8 Canvas Engine 的 state/data 边界：

- content truth；
- placement truth；
- runtime state；
- viewport state；
- selection state；
- overlay state；
- operation history seed；
- clean layout reset；
- future migration stance。

## 不负责什么

- 不写数据库 migration；
- 不定义完整 SourceDocument / RelationType / Template Studio；
- 不替代 `docs/DATA_MODEL.md`；
- 不替代 `Editor-State-Rebuild-Contract.md`。

## 必读参考

- `docs/releases/V2.BN.8/Canvas-Engine-Research/Summary-Report.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/R4-performance-and-virtualization-strategy.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/R5-pageframe-workspace-model.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/R8-relation-endpoint-and-overlay-reserve.md`
- `docs/contracts/Editor-State-Rebuild-Contract.md`
- `docs/contracts/Canvas-Page-Surface-Contract.md`
- `docs/contracts/Block-Contract.md`
- `docs/internal/V2.BN.7-Current-Runtime-Autopsy.md`

## Truth 分层

```text
content truth
  NoteBlock body / field values

placement truth
  canvas placement / frame membership / xywh / z-index

runtime state
  active editing / selected object / draft interaction

viewport state
  pan / zoom / visible rect

overlay state
  preview/debug/type/AI/export overlay toggles

adapter/index state
  GraphRAG / OCR / VLM / external editor projections
```

## 第一版核心对象口径

```text
NoteCanvas
  一篇 Note 的 canvas runtime root。
  拥有统一 world coordinate。

PageFrame
  NoteCanvas 内最多一个主正式页面区域。
  是 export/layout boundary，不拥有 content truth。
  height 由 PageFrame 内正式内容底部和页面底部留白决定。

Workspace
  PageFrame 外区域。
  第一版可不建实体表，但 placement 必须允许 object 在 PageFrame 外存在。
  height/width 属于 CanvasWorld runtime 范围，不得反向撑大 PageFrame。

NoteBlock
  内容 truth。
  不直接拥有 x/y/width/height。

BlockPlacement / CanvasNode
  布局 truth。
  指向 NoteBlock 或 future CanvasObject。

CanvasObject
  未来画布对象 truth placeholder。
  shape/freehand/image/region/connectorDraft 等不应塞进 NoteBlock。

RelationEndpoint
  未来 relation/connector 锚点 placeholder。
  不等于 ObjectRelation truth。
```

## Placement 最小候选字段

```text
placement_id
object_id
object_kind
canvas_id
frame_id optional
x
y
width
height
rotation future
z_index
boundary_role
visibility_state
snap_state optional
connector_ports future
```

第一版 `rotation` 固定为 `0` 也可以，但字段与计算模型不应排斥旋转。`connector_ports` 第一版只作预留，不做完整 relation runtime。

## Visibility / Measurement Cache

以下状态是 runtime cache，不是 canonical truth：

```text
measured_height
content_hash
needs_measure
visible_in_viewport
render_forced_reason
```

规则：

- measurement cache 可丢弃并重建；
- selected / editing / dragging / resizing 的对象必须强制渲染；
- viewport 外对象可以不进入重交互层；
- overlay/debug state 不写入 content truth。

## PageFrame / CanvasWorld 尺寸边界

V2.BN.8.1 起，PageFrame height 和 CanvasWorld height 必须分开：

```text
PageFrame height
  = max(base page height, bottom-most formal page block bottom + bottom padding)

CanvasWorld height
  = workspace 可滚动/可浏览区域
```

规则：

- Canvas mode 的 block list 可以使用 CanvasWorld height 形成工作区；
- formal PageFrame boundary 只能使用 PageFrame height；
- 进入 Canvas mode 不应把 PageFrame 撑成完整 workspace 高度；
- 如果用户在 PageFrame 内向下移动最底部 block，PageFrame 可以随内容自然延伸；
- 如果用户要把 block 放到 PageFrame 下方 workspace，第一版应先通过 x 方向脱离 PageFrame，再进入 workspace 区域。

## Clean Reset 规则

当前 `better_notebook_layout` 是实验性 layout payload。

V2.BN.8 clean branch 默认：

- 不为它写长期 converter；
- 可以 clean reset 实验 layout data；
- 当前 branch 保留 fallback；
- 如果未来出现真实用户数据，再单独设计 migration。

## Operation History Seed

V2.BN.8 至少要定义：

- move operation boundary；
- resize operation boundary；
- content edit operation boundary；
- delete/restore seed；
- viewport state 是否进入 undo；
- overlay/debug state 不应进入 content undo。

## 同步规则

- 字段稳定后，候选 promotion 到 `docs/DATA_MODEL.md` 或 `docs/contracts/`。
- 如果改变 content/layout/source/relation/template truth 边界，必须同步 `docs/ARCHITECTURE.md`。
- 如果改变 undo/rebuild 边界，必须同步 `docs/contracts/Editor-State-Rebuild-Contract.md`。
- 如果改变用户操作，必须同步 `Canvas-Engine-Interaction-Contract.md`。
