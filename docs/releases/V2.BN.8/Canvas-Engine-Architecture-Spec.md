# Canvas Engine Architecture Spec

## 负责什么

本文负责 V2.BN.8 Canvas Engine 的架构合同：

- NoteCanvas；
- PageFrame；
- FrameOutsideWorkspace；
- coordinate transform；
- viewport；
- placement；
- layer system；
- measurement；
- selection / hit-testing；
- overlay portal；
- connector endpoint reserve。

## 不负责什么

- 不定义完整 source/relation/template 产品；
- 不定义 GraphRAG adapter；
- 不替代 state/data contract；
- 不记录视觉样式细节；
- 不写完整 implementation patch log。

## 必读参考

- `docs/releases/V2.BN.8/Canvas-Engine-Research/Summary-Report.md`
- `docs/releases/V2.BN.8/Canvas-Engine-Research/R9-route-decision-report.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Requirement-Draft.md`
- `docs/internal/V2.BN.7-Canvas-Engine-Research-Gap-Report.md`
- `docs/internal/V2.BN.7-Current-Runtime-Autopsy.md`
- `docs/contracts/Canvas-Page-Surface-Contract.md`

## Route Lock

V2.BN.8 第一版采用：

```text
Self-owned Minimal Hybrid NoteCanvas Engine
```

具体含义：

```text
DOM NoteBlock content layer
SVG/DOM overlay layer
CSS transform viewport
explicit world/screen coordinate conversion
measurement cache
visible render window
PageFrame + Workspace unified coordinate model
CanvasObject / RelationEndpoint placeholders
```

路线排除：

- 不把 tldraw 作为第一版主 runtime；
- 不把 BlockSuite / AFFiNE Edgeless 作为第一版主 runtime；
- 不把 React Flow 作为第一版主 runtime；
- 不把 Excalidraw / Konva / Fabric.js / PixiJS 作为第一版主 runtime；
- 不用纯 HTML Canvas 或 WebGL 承载 NoteBlock 文本编辑。

这些工具继续作为参考对象或未来局部 adapter 候选。

## 架构目标

```text
一个 note 拥有统一 NoteCanvas。
PageFrame 是 NoteCanvas 内的正式可导出区域。
FrameOutsideWorkspace 是 PageFrame 外的自由工作区。
block projection 在 canvas 上拥有 placement。
runtime 负责 projection/interaction，不拥有 canonical truth。
```

## Runtime Target Shape

第一版组件边界应向这个形状靠拢：

```text
NoteCanvasRuntimeProvider
  -> CanvasViewport
    -> CanvasWorld
      -> PageFrameLayer
      -> BlockLayer (DOM)
      -> CanvasObjectLayer (placeholder)
      -> SvgOverlayLayer
      -> FloatingOverlayLayer
```

`CanvasViewport` 负责 pan / zoom / world-screen transform。
`BlockLayer` 负责可编辑 NoteBlock 投影。
`SvgOverlayLayer` 负责 selection outline、future connector、endpoint marker。
`FloatingOverlayLayer` 负责 toolbar、slash menu、preview panel、inspector popover。
Floating overlay 不直接依赖任意 DOM flow 位置作为长期 truth。第一版 normalized anchor record 至少记录 `caret`、`block`、`fixed_viewport`、`formula_help`、`source_picker`、`relation_endpoint` 等来源，并允许 future world rect / relation endpoint 通过 viewport transform 进入 viewport placement。

## 核心对象

### NoteCanvas

NoteCanvas 是 canvas-native runtime root。

必须承载：

- world coordinate；
- viewport；
- pan/zoom；
- placement lookup；
- frame registry；
- layer registry；
- hit-testing；
- overlay anchor；
- future relation endpoint reserve。

### PageFrame

PageFrame 是 formal page boundary。

必须承载：

- page geometry；
- content inset / content area geometry；
- export boundary；
- AI/export/source visibility boundary seed；
- inside/outside classification；
- future page size / custom frame。

PageFrame 的 outer rect 和 content area 不能混用。NoteBlock 的第一版 placement 坐标仍相对 content area；PageFrame outer boundary 用 content inset 往外扩展，给未来 ruler / page margin / export boundary 留出稳定口径。

### FrameOutsideWorkspace

FrameOutsideWorkspace 是 PageFrame 外的自由区域。

必须支持：

- scratch block；
- workspace block；
- future diagram/media/relation notes；
- non-export default state；
- canvas-first note future。

## Layer System

第一版至少区分：

```text
background layer
frame layer
block layer
connector reserve layer
overlay layer
debug layer
```

规则：

- block layer 不承载 toolbar；
- overlay layer 不改变 block measurement；
- debug layer 可显示 type/AI/export labels；
- connector reserve layer 不等于 semantic relation truth。

## Measurement Architecture

measurement 必须是 engine service，不应继续散落在 block component 内。

需要覆盖：

- paragraph；
- definition fields；
- formula preview；
- formula input expanded state；
- code block；
- future media placeholder；
- width resize after reflow。

## Selection / Hit Testing

selection 必须在 world coordinate 和 screen coordinate 之间稳定工作。

必须覆盖：

- click select；
- blank click clear；
- drag select future；
- resize handle；
- frame hit-testing；
- active editing state vs selected layout state。

## Connector Endpoint Reserve

V2.BN.8 不做完整 relation runtime，但 placement 和 architecture 必须预留：

- endpoint；
- port；
- anchor；
- connector layer；
- route/path future；
- relation render budget future。

## 同步规则

- 改变 architecture 时，同步 `Engineering-Spec.md`。
- 改变用户操作时，同步 `Canvas-Engine-Interaction-Contract.md`。
- 改变 state/data 字段时，同步 `Canvas-Engine-State-And-Data-Contract.md`。
- 发现性能瓶颈时，同步 `Canvas-Engine-Spike-And-Benchmark-Plan.md`。
