# R3 - DOM / SVG / Canvas / WebGL / Hybrid 渲染路线比较

## 结论先行

V2.BN.8 不应该选择纯 HTML Canvas 或纯 WebGL 作为第一版主编辑层。核心原因不是性能，而是文本编辑、可访问性、复制粘贴、输入法、撤销重做、浏览器原生选择这些基础能力会被迫重写。

更合适的第一版路线是：

```text
DOM 承载 NoteBlock 内容编辑
SVG/DOM 承载 overlay、selection、control、future relation line
CSS transform 承载 viewport pan/zoom
Canvas/WebGL 暂时只作为 future drawing / grid / preview / thumbnail / performance layer
```

也就是说，V2.BN.8 的“canvas engine”并不等于所有东西都画进 `<canvas>`。它指的是 NoteCanvas 坐标系统、viewport runtime、placement truth、overlay state、PageFrame/workspace 边界这些引擎能力。

## 路线 1：DOM-first

### 定义

所有 NoteBlock 都是 DOM 节点，用 CSS absolute positioning 放在一个可变换的 world container 里。

### 优点

- 文本编辑最稳；
- contenteditable / textarea / input / rich text 能力可保留；
- 复制、粘贴、选区、输入法、快捷键、accessibility 不需要重造；
- 当前 V2.BN.5 的实现最容易迁移；
- source badge / block type badge / formula input / inspector overlay 容易接续。

### 缺点

- 超大量 block 时 DOM 节点数会成为瓶颈；
- zoom 下的文字清晰度、命中、selection anchor 需要认真处理；
- relation line 如果也用 DOM 会比较笨重；
- workspace 中大量非文本对象不适合全部 DOM 化。

### 适合 Coincides 吗？

适合第一版，但不能停留在“普通 DOM 页面”。必须变成真正的 NoteCanvas runtime：

```text
world coordinate
viewport transform
block placement truth
measurement cache
visibility window
overlay portal
PageFrame boundary
workspace outside frame
```

## 路线 2：SVG-first

### 定义

所有对象都放在 SVG 中，文本、连线、框、图形均由 SVG 承载。

### 优点

- 矢量缩放清晰；
- line / connector / endpoint / selection box 天然适合；
- hit testing 和 path 渲染比 DOM 更适合图形；
- export to SVG 有天然优势。

### 缺点

- 富文本编辑不适合；
- 多行文本、LaTeX、代码块、表格、图片混排会迅速复杂；
- source inspector / toolbar / rich controls 仍要回 DOM；
- accessibility 和输入法体验不如 DOM。

### 适合 Coincides 吗？

不适合作为主内容层，但适合作为 overlay/relation layer。V2.BN.8 应保留 SVG layer：

```text
selection outline
resize handles
alignment guide
relation connector preview
endpoint marker
future local graph overlay
```

## 路线 3：HTML Canvas-first

### 定义

所有内容都绘制到 `<canvas>` 2D context 中。

### 优点

- 大量简单图形渲染性能好；
- 可统一控制绘制；
- grid / sketch / thumbnail / background 很适合；
- 与 Konva/Fabric 等对象模型兼容。

### 关键风险

HTML Standard 明确提醒：作者应避免用 canvas 实现文本编辑控件，因为 caret 放置、键盘移动、滚动、复制粘贴、拼写检查、拖拽、页面搜索、双向文本、选区、IME、undo/redo、accessibility 等都要重写。

来源：

- https://html.spec.whatwg.org/multipage/canvas.html

### 适合 Coincides 吗？

不适合作为主编辑层。Coincides 是写作软件，不是画图软件。纯 canvas 会把我们最核心的 writing UX 推入深水区。

### 可用位置

- grid/background；
- drawing/freehand；
- image crop preview；
- minimap；
- heavy relation preview；
- future offscreen rendering。

## 路线 4：WebGL / Pixi-first

### 定义

用 WebGL scene graph 渲染所有对象，DOM 只做少量 overlay。

### 优点

- 大规模视觉对象性能潜力高；
- LOD / scene graph / camera / layer 可做得强；
- 未来 note set universe / thumbnail / large relation visualization 可能受益。

### 缺点

- 文本编辑更难；
- DOM overlay 和 WebGL 坐标同步复杂；
- 可访问性、输入法、复制粘贴仍要桥接；
- 第一版工程量过高。

### 适合 Coincides 吗？

不适合 V2.BN.8 主 runtime。可以作为远期优化方向：

```text
当一张 NoteCanvas 包含数千 block / 大量图片 / 大量 relation 时，
再研究 WebGL minimap、preview texture、collapsed frame rendering。
```

## 路线 5：Hybrid

### 定义

不同层用不同技术：

```text
DOM: text/rich NoteBlock editing
SVG: selection/connector/endpoint overlay
Canvas: grid/sketch/background/drawing
WebGL: future large-scene preview/LOD
```

### 优点

- 每类技术做自己擅长的事；
- 保留文本编辑稳定性；
- 保留未来图形能力；
- 对 Coincides truth 模型侵入小；
- 可按阶段演进。

### 缺点

- 坐标转换必须统一；
- z-index / pointer-events / selection capture 要严格设计；
- overlay 与 block measurement 要有明确同步机制；
- 需要写 engine contract，不能靠组件堆叠。

### 适合 Coincides 吗？

适合，但需要表述准确：不是泛泛地“混合一下”，而是：

```text
Self-owned minimal hybrid NoteCanvas Engine
```

其中 `self-owned` 是核心，`hybrid` 是实现策略。

## V2.BN.8 推荐路线

推荐：

```text
Self-owned minimal NoteCanvas Engine
  Primary content layer: DOM
  Overlay layer: SVG/DOM
  Viewport transform: CSS transform + explicit coordinate conversion
  Future raster layer: Canvas / OffscreenCanvas
  Future high-scale layer: WebGL/Pixi optional
```

## 为什么不是纯 DOM？

纯 DOM 可以开始，但如果没有统一 canvas engine contract，会继续变成现在的局面：

- Page 只是一个模拟盒子；
- workspace 只是页面外剩余区域；
- overlay 到处漂；
- block 拖拽和避让依赖局部 patch；
- future relation endpoint 很难接。

所以第一版可以 DOM-heavy，但不能 architecture-DOM-only。

## 为什么不是外部 engine？

tldraw、Excalidraw、React Flow、BlockSuite 都很强，但它们会带来自己的 truth 和 runtime。V2.BN.8 需要的是“保留 Coincides truth 的 canvas runtime”，不是把 Coincides truth 放进别人系统里。

## 第一版工程边界

必须做：

- NoteCanvas root；
- world coordinate；
- viewport state；
- coordinate transform；
- PageFrame；
- DOM block layer；
- overlay layer；
- measurement cache；
- visible block filtering；
- selection / drag / resize state；
- relation endpoint placeholders；
- CanvasObject placeholder type。

暂不做：

- 多 PageFrame；
- presentation；
- full drawing tool；
- WebGL；
- offscreen worker；
- external engine runtime dependency。
