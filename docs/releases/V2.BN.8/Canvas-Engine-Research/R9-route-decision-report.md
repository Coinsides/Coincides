# R9 - Canvas Engine 路线决策报告

## 最终推荐

V2.BN.8 推荐采用：

```text
Self-owned Minimal Hybrid NoteCanvas Engine
```

更具体地说：

```text
Coincides 自有 NoteCanvas runtime
  DOM NoteBlock content layer
  SVG/DOM overlay layer
  CSS transform viewport
  explicit world/screen coordinate conversion
  measurement cache
  visibility window
  PageFrame + Workspace unified coordinate model
  future CanvasObject / relation endpoint reserve
```

这个结论不是把 Hybrid 当默认答案，而是基于 R1-R8 比较后得出。

## 选择理由

### 1. Coincides 是 notebook-first，不是 whiteboard-first

我们的核心目标是自然写作、结构化 NoteBlock、source-aware note/report、relation-ready knowledge surface。第一版必须保证：

- 文本输入可靠；
- LaTeX / code / definition block 可编辑；
- block 高度可测量；
- selection/drag/resize 不破坏文字；
- source/relation/export/AI visibility overlay 可接入；
- PageFrame 内外都在同一坐标系。

纯 whiteboard engine 的 shape-first 心智不适合直接托管这些 truth。

### 2. 原生文本编辑不能丢

HTML Standard 对 canvas 文本编辑的风险说明非常直接：如果用 canvas 实现文本编辑，caret、键盘移动、复制粘贴、拼写检查、拖拽、页面搜索、双向文本、IME、undo/redo、accessibility 都要重写。

来源：

- https://html.spec.whatwg.org/multipage/canvas.html

因此 `NoteBlock` 内容编辑必须留在 DOM / 原生编辑能力附近。

### 3. 外部 engine 会引入第二套 truth

tldraw、BlockSuite、React Flow 都很成熟，但也都带有自己的数据/runtime 心智：

- tldraw: shape/store/binding；
- BlockSuite: block spec/surface/root service/doc runtime；
- React Flow: node/edge/handle flow graph；
- Excalidraw: scene elements/appState；
- Konva/Fabric/Pixi: canvas object/scene graph。

这些都能用，但如果作为主 runtime，会让 Coincides Core truth 变成适配层。V2.BN.8 的决策边界是相反的：

```text
Coincides truth first.
Canvas engine is projection/runtime.
External tools are references or future adapters.
```

### 4. 当前分支已有可复用交互资产

V2.BN.5 已经打磨出：

- block type；
- structured field；
- formula preview/input；
- slash menu；
- block control bar；
- preview overlay；
- AI/export/type label overlay；
- selection/drag/resize 经验；
- PageFrame/workspace 早期模型。

这些经验适合迁入自有 engine，不适合丢给外部白板 runtime 重做。

## 排除路线

### 排除：纯 DOM 页面继续 patch

原因：

- 会延续 NoteDetail 模拟 canvas 的问题；
- 没有清晰 viewport/world coordinate；
- workspace 和 PageFrame 容易继续混乱；
- relation endpoint 没有自然位置；
- overlay 继续散落。

### 排除：纯 SVG

原因：

- 富文本/LaTeX/code/table 编辑不适合；
- 仍需 DOM 输入层；
- 作为 overlay 好，作为内容 truth 不好。

### 排除：纯 HTML Canvas

原因：

- 文本编辑重写成本过高；
- accessibility/IME/undo/selection 风险过高；
- notebook-first 产品不适合把文字画成像素。

### 排除：WebGL/Pixi first

原因：

- 第一版工程量过大；
- 解决的是大规模渲染，不解决自然写作；
- DOM overlay 桥接复杂；
- 适合未来 LOD/minimap/thumbnail，不适合第一版。

### 排除：直接接入 tldraw

原因：

- shape-first；
- custom shape 可以做 NoteBlock，但会产生双 truth；
- tldraw 很适合未来 drawing/CanvasObject/whiteboard reference，不适合作为 Coincides 主 notebook runtime。

### 排除：直接接入 BlockSuite

原因：

- editor framework 太重；
- block spec/surface/root service 会和 Coincides 自有模型重叠；
- 适合作为 AFFiNE 参考，不适合第一版底层依赖。

### 排除：直接接入 React Flow

原因：

- graph/node editor 心智强；
- 自然写作体验会被 flow graph 牵引；
- 适合作为 relation endpoint/edge path 参考。

### 排除：直接接入 Excalidraw/Konva/Fabric

原因：

- drawing/canvas object 强；
- notebook content editing 弱；
- 适合 future drawing/sketch layer。

## 推荐架构

```text
NoteDetail route
  -> NoteCanvasRuntimeProvider
    -> CanvasViewport
      -> CanvasWorld
        -> PageFrameLayer
        -> BlockLayer (DOM)
        -> CanvasObjectLayer (placeholder)
        -> SvgOverlayLayer
        -> FloatingOverlayLayer
```

## 第一版 Engine Sample 范围

V2.BN.8 第一版代码目标：

- 新建 engine 组件目录；
- 从 NoteDetail 中抽出 canvas runtime；
- 支持 viewport pan/zoom；
- 支持 world coordinate；
- 支持 PageFrame 渲染；
- 支持 DOM NoteBlock placement；
- 支持 selection / drag / resize；
- 支持 measurement cache；
- 支持 overlay root；
- 保留 CanvasObject/endpoint placeholder；
- 尽量恢复当前 V2.BN.5 的视觉和交互成果。

## V2.BN.8.x 建议拆分

```text
V2.BN.8.0 Research And Route Lock
  完成本轮调研、路线决策、文档同步。

V2.BN.8.1 Engine Shell
  NoteCanvasRuntime / Viewport / World / PageFrame / BlockLayer。

V2.BN.8.2 Editing And Measurement
  block edit, resize, measure, formula expansion, slash menu anchoring。

V2.BN.8.3 Overlay And Interaction Polish
  control bar, preview panel, type/AI/export overlay, snap/avoidance。

V2.BN.8.4 Performance And Benchmark
  visible window, measurement cache benchmark, large block smoke。

V2.BN.8.5 CanvasObject / Endpoint Reserve
  不做完整 drawing/relation，只把接口位置稳定下来。
```

## 仍需 Henry 拍板

1. 是否正式确认 V2.BN.8 不引入外部 canvas engine 作为主 runtime？
2. 第一版 engine sample 是否可以先不做 full multi-select？
3. PageFrame 外 workspace block 第一版是否允许真实创建和保存？
4. 是否接受 V2.BN.8.1 先牺牲部分现有视觉细节，优先把 runtime 架构搭稳？
