# R2 - 现有 Canvas / Whiteboard / Diagram Engine 工具矩阵

## 结论先行

本轮比较的对象包括：

- tldraw
- Excalidraw
- React Flow / XYFlow
- Konva
- Fabric.js
- PixiJS
- BlockSuite / AFFiNE Edgeless

总判断：

```text
tldraw / Excalidraw / React Flow / Konva / Fabric / PixiJS 都有可学习部分，
但都不适合直接成为 V2.BN.8 的 canonical canvas runtime。

推荐路线是：
自研最小 NoteCanvas Engine，
以 DOM 承载可编辑 NoteBlock，
以 SVG/DOM overlay 承载选择框、控制条、连接线预留，
以后再引入 canvas/WebGL 作为 grid/background/drawing/large-scene optimization layer。
```

这不是“默认 Hybrid”，而是经过工具比较之后的路线结论。

## 工具比较表

| 工具 | 强项 | 对 Coincides 的问题 | 适合角色 |
| --- | --- | --- | --- |
| BlockSuite / AFFiNE | Page/Edgeless 双 runtime、frame、surface、富文本整合 | 侵入式 editor framework，truth 体系重 | 架构参考 |
| tldraw | 完整无限画布、shape/store/binding/selection/transform 很成熟 | whiteboard shape truth 太强，NoteBlock 内容 truth 会被迫适配 | 重点参考 / 可做未来 CanvasObject 子系统参考 |
| Excalidraw | 简洁绘图、scene elements、API 清晰、手绘感强 | 更偏 sketch/drawing，不适合作为结构化 notebook runtime | 未来 sketch/drawing 参考 |
| React Flow / XYFlow | node/edge/viewport/handle/resizer 成熟 | 更偏流程图，不是自然写作 notebook；node model 会压过 NoteBlock | relation endpoint / diagram UX 参考 |
| Konva | Canvas object model、drag/hit/transform/layer | 文本编辑仍要自己处理，NoteBlock DOM 编辑不天然适配 | future drawing layer 参考 |
| Fabric.js | Canvas object model、serialization、skip offscreen | 更偏 canvas object 编辑器；文本/富文本复杂 | future drawing/export layer 参考 |
| PixiJS | 高性能 WebGL scene graph | 游戏/渲染引擎取向，文本编辑和 DOM UI 需大量桥接 | 大规模渲染/LOD 远期参考 |

## tldraw

### 官方能力

tldraw 官方说明它是 React infinite canvas SDK，提供 canvas infrastructure、multiplayer sync、persistence、performance optimization、copy/paste、undo/redo、custom shapes/tools/UI、runtime API 等。

来源：

- https://tldraw.dev/
- 本地源码：`D:\Coinsides\v2.x\_external_research\canvas-engine\tldraw`

### 优点

tldraw 的优势非常明显：

- 形状系统成熟；
- selection / transform / rotate / resize / nested transform 成熟；
- record store 和 runtime API 成熟；
- camera / viewport / smooth navigation 成熟；
- custom shape / binding / tool 能力强；
- 大量白板类功能开箱即用。

### 不适合直接作为 V2.BN.8 底层的原因

Coincides 的核心对象不是 shape，而是 `NoteBlock`。tldraw 的强项恰恰是把画布对象抽象为 shape record。如果直接采用：

- NoteBlock 会被包装为 tldraw custom shape；
- field value / source / relation / template truth 要跟 shape store 同步；
- text editing 会进入 tldraw 的 shape editing 范式；
- PageFrame / source overlay / relation overlay 要适配 tldraw runtime。

这会带来二等 truth 问题。除非未来我们决定让 tldraw 成为主要画布产品内核，否则 V2.BN.8 不应该直接引入。

### 可学习点

- viewport/camera state；
- shape visibility / culling；
- selection / transform state machine；
- binding 模型；
- frame-like shape；
- custom shape extension。

## Excalidraw

### 官方能力

Excalidraw API 暴露 `updateScene`、`getSceneElements`、`getAppState`、history、scrollToContent、refresh、setActiveTool、onChange 等能力。它的 scene elements / appState 分层很清晰。

来源：

- https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api
- 本地源码：`D:\Coinsides\v2.x\_external_research\canvas-engine\excalidraw`

### 优点

- 绘图体验轻；
- scene data 清晰；
- 手绘风格适合 scratch；
- export / embed scene 思路值得参考；
- API 比较容易理解。

### 不适合作为主 runtime 的原因

Excalidraw 是 drawing-first，不是 notebook-first。它擅长做图、箭头、草稿，但不擅长：

- 富文本块编辑；
- structured NoteBlock field；
- source provenance badge；
- relation semantic graph；
- PageFrame 内部精确排版；
- block-level measurement cache。

它更适合未来作为 CanvasObject/drawing 子系统参考。

## React Flow / XYFlow

### 官方能力

React Flow 的 `<ReactFlow />` 负责渲染 nodes 和 edges，处理用户交互，也可以管理自身 state。官方还提供 NodeResizer，能给 node 添加八向 resize 控件。它支持 custom node / custom edge / viewport / snap grid / visible element rendering。

来源：

- https://reactflow.dev/api-reference/react-flow
- https://reactflow.dev/api-reference/components/node-resizer
- 本地源码：`D:\Coinsides\v2.x\_external_research\canvas-engine\xyflow`

### 优点

- node/edge/handle 模型成熟；
- relation endpoint 可参考；
- viewport/pan/zoom 组件成熟；
- resizer/control handles 设计成熟；
- 对 graph UI 很友好。

### 不适合作为主 runtime 的原因

React Flow 是 diagram-first。用户心智是“节点图”，不是“自然笔记”。如果把 NoteBlock 全都塞进 node：

- 文字编辑会像节点编辑器，不像笔记软件；
- PageFrame / workspace 的自然写作体验会被 graph layout 心智影响；
- relation layer 很可能压过内容 layer；
- 多 block 排版会趋向流程图，而不是文档。

适合借鉴 endpoint / edge path / handle / resizer，不适合接管整个 notebook editor。

## Konva

### 官方能力

Konva 是 HTML5 Canvas 2D framework，在 canvas 上提供 object model，可以创建 shape、group、listener、drag、animation，框架负责 rendering、hit detection、state management，并有 React/Vue/Svelte/Angular 集成。

来源：

- https://konvajs.org/docs/index.html
- 本地源码：`D:\Coinsides\v2.x\_external_research\canvas-engine\konva`

### 优点

- Canvas object model 很成熟；
- hit test / drag / transform 能省大量绘图工作；
- 未来做 drawing / sketch / freehand / shape layer 很合适。

### 不适合作为主 runtime 的原因

Konva 仍然是 canvas object-first。NoteBlock 的核心是原生文本编辑、富文本、LaTeX、字段编辑、source/relation overlay。用 Konva 做主 runtime 会让文本编辑变成最大技术债。

## Fabric.js

### 官方能力

Fabric.js Canvas API 有 `skipOffscreen`，可基于 viewport 坐标和对象坐标跳过不可见对象渲染，官方说明这对 crowded canvas 和 zoom/pan 场景有帮助。

来源：

- https://fabricjs.com/api/classes/canvas/
- 本地源码：`D:\Coinsides\v2.x\_external_research\canvas-engine\fabric.js`

### 优点

- Canvas object serialization；
- object selection / transform；
- offscreen skip；
- export 和 image/object 操作成熟。

### 不适合作为主 runtime 的原因

Fabric 的心智也是 canvas object editor。我们会遇到和 Konva 类似的问题：文本编辑、DOM overlay、source/relation truth 都要额外桥接。

## PixiJS

### 官方能力

PixiJS 是 WebGL/Canvas 渲染引擎，核心是 scene graph。官方文档说明 stage 是 root container，children 会进入 scene graph，父子 transform 会继承。

来源：

- https://pixijs.com/8.x/guides/concepts/scene-graph
- 本地源码：`D:\Coinsides\v2.x\_external_research\canvas-engine\pixijs`

### 优点

- 大规模图形渲染能力强；
- scene graph / container / layer 适合 LOD；
- 远期可以服务缩略图、超大 canvas、动态背景。

### 不适合作为 V2.BN.8 主 runtime 的原因

PixiJS 不是 editor framework。用它做主 runtime 意味着要自己做：

- 文本编辑；
- selection；
- accessibility；
- DOM overlay；
- export semantics；
- source/relation UI。

V2.BN.8 不需要这么重的渲染引擎。

## 综合建议

### 第一版不要引入大引擎

V2.BN.8 的目标是把当前模拟 runtime 升级为可靠 NoteCanvas engine，不是把 Coincides 改造成白板产品。引入完整外部 engine 会带来：

- truth ownership 混乱；
- dependency lock-in；
- future migration 成本；
- UX 方向被外部 engine 牵引。

### 第一版要吸收成熟模式

应吸收：

- tldraw 的 viewport / selection / transform / binding 观念；
- AFFiNE 的 page/edgeless/frame/surface 分层；
- React Flow 的 handle/edge/resizer；
- Fabric/Konva 的 offscreen / object layer 思路；
- Pixi 的 scene graph / LOD 思路；
- Excalidraw 的 scene/appState 分离和 sketch tool 心智。

### 推荐进入 R9 决策

候选路线中，最适合 V2.BN.8 的是：

```text
自研最小 NoteCanvas Engine
  DOM NoteBlock editing layer
  SVG/DOM overlay layer
  CSS transform viewport
  measurement/cache/visibility layer
  future canvas/WebGL layer reserved
```

这个路线最少牺牲 Coincides truth，也最容易继承 V2.BN.5 的交互成果。
