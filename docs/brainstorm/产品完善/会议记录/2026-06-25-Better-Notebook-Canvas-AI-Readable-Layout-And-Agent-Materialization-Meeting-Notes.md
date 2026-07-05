# 2026-06-25 Better Notebook / Canvas AI-readable Layout 与 Agent Materialization 会议记录

status: live brainstorm note
date: 2026-06-25 America/Toronto
scope: AI-readable layout、Canvas AI Tree、CanvasObject 边界、Agent 读取与生成、diagram/document 物化、外部产品与开源工具参考

> 这份记录从 2026-06-23 Canvas Foundation 问题清单中拆出。23 号文档更适合作为 Canvas 引擎与 PageFrame 的基础问题池；本篇聚焦 6 月 25 日开始深入讨论的 AI-readable layout、Agent 操作边界、外部 diagram / document 生成参考，以及 CanvasObject 是否应由 AI 读取需求反推。

## 1. 会议主题判断

今天讨论的主题不再只是：

```text
Canvas 是什么？
```

而更接近：

```text
Canvas 如何成为 AI 可读的结构化布局？
Agent 如何把生成结果安全地落回 Canvas？
CanvasObject 应该由什么需求来定义？
```

因此本篇会议记录主题暂定为：

```text
Canvas AI-readable layout 与 Agent materialization
```

其中：

- `AI-readable layout` 指 Canvas 不只是视觉白板，而是能被 AI 读取的空间结构；
- `Canvas AI Tree` 指未来可能存在的一棵面向 AI / Agent 的结构化画布树；
- `Agent materialization` 指 Agent 生成的内容、文档、流程图、总结、ContentGroup proposal 等如何落回 Coincides 的真实系统。

## 2. Canvas 的四重角色

当前稳定判断：

```text
Canvas 在 Coincides 中同时是：

1. 白板；
2. 页面系统；
3. 空间组织层；
4. AI-readable layout。
```

其中第四点是 Coincides 与普通白板工具的重要差异。

Canvas 不取代 TextFlow，也不取代 ContentGroup：

```text
TextFlow = 内容真相
ContentGroup = 知识结构真相
Canvas = 空间 / 布局真相
```

Canvas 提供 layout。
它让 TextFlow、ContentGroup、PageFrame、CanvasObject 在空间里有位置、有占地、有层级、有可见性。

## 3. AI-readable layout 的最低要求

AI-readable layout 不能只保存一个坐标点。
一个 CanvasObject 至少需要能被读取为：

- object id；
- object kind；
- x / y；
- width / height；
- rotation；
- zIndex / layer；
- 所属 PageFrame / workspace / surface；
- visibility；
- AI visibility；
- export role；
- content reference；
- source reference。

AI 需要能知道：

- 它在哪里；
- 它占多大区域；
- 它是否属于正式页面；
- 它是否在 scratch workspace；
- 它是否被导出；
- 它是否允许 AI 读取；
- 它是否遮挡了其他对象；
- 它是否被其他对象遮挡；
- 它和哪些对象靠近、对齐、重叠或聚类。

当前判断：

```text
遮挡、重叠比例、邻近、对齐、聚类等派生信息不一定永久存库。
持久层保存基础空间事实。
读取层生成 AI-readable layout snapshot。
```

也就是说：

```text
Canvas persistent truth:
  x / y / width / height / rotation / zIndex / frameId / visibility

AI-readable snapshot:
  overlaps_with / occluded_by / occlusion_ratio / nearby_objects / alignment / grouping hints
```

## 4. CanvasObject 不能过早定死

当前重要判断：

```text
在深入研究结构化画布引擎、文档布局理解、Accessibility Tree / UI parsing 之前，
不应过早把 CanvasObject 定义得太死。
```

原因：

- CanvasObject 如果只按“画布上能拖动的东西”定义，会过窄；
- 未来 object 可能是 TextFlow projection、PageFrame、ContentGroup projection、AI-readable node、export object、interaction target；
- 如果定义过窄，后续每增加一种能力都可能需要重构；
- 更稳妥的做法是先研究外部结构化画布、Accessibility Tree、UI parsing，再反推 Coincides 的 CanvasObject 边界。

当前直觉：

```text
CanvasObject 不只是“画布上能拖动的东西”，
它还应该是能进入 Canvas AI Tree 的结构化节点。
```

因此 CanvasObject 至少可能需要考虑：

- identity；
- role；
- bounds；
- layer；
- visibility；
- parent / container；
- content reference；
- source reference；
- interaction state；
- export state；
- AI readability state；
- derived reading order；
- optional semantic projection。

这不是最终设计，只是下一阶段调研输入。

## 5. Accessibility Tree / UI parsing 的启发

Accessibility Tree / UI parsing 特别值得关注。

当前直觉：

```text
Accessibility Tree 像是把界面转换成一棵可读的结构树。
Coincides 未来也许需要自己的 Canvas AI Tree。
```

这棵树不应该是完全预设的死结构。
更理想的是：

```text
它由内容和布局共同决定。
```

它可以告诉 AI：

- 当前笔记里有哪些对象；
- 每个对象的角色是什么；
- 阅读顺序是什么；
- 哪些内容属于 PageFrame；
- 哪些内容属于 scratch workspace；
- 哪些对象是 TextFlow 内容；
- 哪些对象是 ContentGroup / Petal projection；
- 哪些对象只是视觉辅助；
- 需要某类信息时应该去哪里找；
- object 之间有哪些空间关系、层级关系、父子关系、弱视觉线索。

这可能反过来塑造 CanvasObject 的定义。

## 6. 画笔 / Ink 的暂定判断

画笔工具看起来像白板基础功能，但在 Coincides 里其实很高级。

原因是：

```text
OCR 只能读字。
Ink understanding 要读意图。
```

笔划可能是：

- 手写文字；
- 手写公式；
- 箭头；
- 圈注；
- 分组；
- 划掉；
- 强调；
- 流程图；
- 草图；
- 装饰；
- 临时思路痕迹。

当前判断：

```text
8.8 不做成熟画笔理解。
最多预留 Raw Ink Object / InkGroup 的概念。
```

可能的后续模型：

```text
Raw Ink / Stroke = 原始笔划真相
Ink Interpretation = 对笔划的解释提案
```

Raw Ink 至少保存：

- stroke id；
- points；
- bounds；
- color；
- width；
- pressure；
- time order；
- zIndex；
- pageFrame / workspace；
- nearby objects；
- overlapped objects。

解释层可以以后再做：

- handwriting_text；
- formula；
- arrow；
- circle_annotation；
- grouping_marker；
- diagram_candidate；
- decoration；
- unknown。

当前结论：

```text
笔划应该进入路线图，但不应该拖慢 8.8 的结构化画布地基。
```

## 7. Agent 不急，但必须留操作边界

当前判断：

```text
正式 Agent runtime 不急着接。
但 Canvas 从第一天起就必须按 Agent-readable snapshot 来设计。
```

原因：

- CanvasObject / PageFrame / ContentGroup / Relation 尚未完全稳定；
- 过早接入 Agent 会让它在半结构化数据上瞎猜；
- 但如果完全不考虑 Agent，后续可能发现 Canvas 不是 AI 能读取或操作的数据。

因此 8.8 可以先做：

```text
AI-readable snapshot contract
Canvas command / proposal boundary
```

而不是先做：

```text
完整 Agent runtime
```

## 8. Agent 操控 Canvas 的待验证问题

当前不能直接断言：

```text
CanvasObject 必须为 Agent 特化。
```

更准确的问题是：

```text
Agent 到底应该如何进入 Canvas？
```

可能路径：

1. Agent 直接创建 / 修改 CanvasObject；
2. Agent 只读取 Canvas AI Tree，然后产出 proposal；
3. Agent 通过 CanvasCommand 创建对象、移动对象、生成文档；
4. Agent 只生成 TextFlow / Markdown / document，再由系统 materialize 到 Canvas；
5. Agent 生成图片或 diagram artifact，再作为 ImageObject / DiagramObject 放入 Canvas；
6. Agent 生成结构化 graph / flowchart，再由 Canvas renderer 投影成可编辑节点；
7. Agent 只对 selection context 做总结、聚类、升格为 ContentGroup，不直接改画布。

当前不提前决定哪条是主线。
后续需要通过外部产品和开源工具调研来判断。

## 9. 对 Miro AI 行为的拆解

今天看了 Miro AI 相关视频截图。

截图 1 中，Miro 生成了一个类似 pricing strategy overview 的流程图 / mind map。

它可能有两种实现：

```text
可能性 A：生成一整张图片。
```

这种情况下：

- 画布上看到的是 image artifact；
- 用户可能只能整体移动、缩放、复制；
- 内部文字和线条不一定可编辑；
- AI 生成的是视觉结果，而不是结构化 canvas node。

但 Henry 明确不接受这个方向作为 Coincides 的主要生成结果：

```text
Coincides 不应把 AI 生成的流程图主要落成一张不可编辑图片。
```

因为这会丢失：

- 内部结构；
- 节点；
- 边；
- 文本；
- provenance；
- 后续编辑能力；
- AI-readable layout 能力。

```text
可能性 B：生成一组可编辑 canvas nodes。
```

这种情况下：

- 每个节点都是可编辑对象；
- 连线也是可编辑对象；
- 用户可以单独拖动节点、修改文字、改线条；
- 更接近 Coincides 未来希望研究的 structured diagram / flowchart object。

截图 2 中，Miro 生成了一个 `Strategy Document`。
它像是一个页面 / 文档卡片 / 文本框，被放在 Canvas 上。

可能行为：

- 它是一个整体文档对象；
- 内部文字可编辑；
- 用户可能双击后进入细节编辑；
- 用户可能需要放大后编辑；
- 它也可能只是生成后的 document preview；
- 它可能由左侧 AI panel 的 prompt、selected objects、board context 共同生成；
- 它可能保留 selected canvas objects 作为 context。

对 Coincides 的待回答问题：

```text
Agent 生成的 structured document，
到底应该落成 TextFlow / PageFrame / DocumentObject / Markdown artifact / CanvasObject projection 中的哪一种？
```

## 10. 成熟产品参考候选

当前需要参考的成熟产品包括：

### XMind

XMind 是成熟的 mind map / flowchart / structured diagram 工具。

当前判断：

- 即使不考虑 AI，它在手动生成、编辑、组织流程图方面也很成熟；
- 它可以作为结构化流程图体验的参考对象；
- 是否具备足够成熟的 AI 生成流程图能力需要后续调查；
- 即使 AI 能力暂不确定，也值得作为 diagram / mind map interaction 的学习对象。

### Miro

重点看：

- selection context；
- AI 生成 docs / diagrams / images / stickies；
- board objects 如何成为 prompt context；
- generated docs 如何落回 canvas；
- generated diagram 是否可编辑；
- provenance 是否保留。

### Whimsical

重点看：

- prompt -> editable mind map；
- prompt -> editable flowchart；
- AI 产物是否是可编辑 node / edge；
- 用户如何继续编辑生成结果。

### Lucidchart

重点看：

- AI diagram generation；
- selected diagram editing；
- diagram 生成后的可编辑程度；
- 与传统 diagram model 的结合。

### Eraser / DiagramGPT

重点看：

- prompt -> diagram-as-code；
- diagram code -> visual diagram；
- 生成结果是否可通过代码和 AI 继续编辑；
- diagram 与 document outline 的关系。

### FigJam / Mural

重点看：

- sticky sort；
- summarize；
- cluster；
- selected objects -> summary；
- clustering / summarization 的表层产品体验。

这些产品用于理解交互与产物形态，不等同于工程路线。

## 11. 开源源码候选

需要进一步筛选并可能 clone 的开源项目：

### xyflow / React Flow

用途：

- node-based UI；
- nodes / edges；
- graph canvas；
- 可编辑流程图底座；
- React 生态可参考性强。

### Mermaid

用途：

- text-to-diagram；
- diagram-as-code；
- Markdown / docs integration；
- 适合研究“结构化文本如何生成图”。

### Markmap

用途：

- Markdown -> mind map；
- 文档结构到 mind map 的转换；
- 可研究 document materialization 到 diagram 的轻量路径。

### Mind Elixir

用途：

- JavaScript mind map core；
- mind map data model；
- large mind map interaction；
- structured branch editing。

### diagram-js / bpmn-js

用途：

- 专业 web diagram editor toolkit；
- diagram model / renderer / editing；
- BPMN 这种强结构图；
- 需要特别关注它与浏览器 focus / accessibility tree 的关系。

### Excalidraw

用途：

- whiteboard scene；
- element / binding / freehand；
- arrow / line / hit testing；
- visual canvas object 的成熟参考。

### draw.io / diagrams.net

用途：

- 成熟 diagram editor；
- flowchart / UML / mind map / whiteboard；
- 但体量、源码形态、许可和可改造性需要单独审查。

当前原则：

```text
成熟产品用于理解交互和产物形态。
开源项目用于研究数据结构和实现路径。
二者不要混为一谈。
```

## 12. 下一步调研问题清单

下一轮调研重点：

- AI 生成的 diagram 是图片、diagram-as-code，还是 editable canvas nodes？
- AI 生成的 document 是普通文本框、文档对象、PageFrame，还是 artifact preview？
- 用户是否能继续编辑内部节点和文字？
- 生成产物是否保留 selected objects / board context / provenance？
- Agent 应该直接操作 CanvasObject，还是通过 CanvasCommand / proposal / materialization layer？
- Accessibility Tree / UI parsing 能否反推 Canvas AI Tree？
- CanvasObject 是否应该先满足 AI-readable node 的要求，再满足视觉对象要求？
- 结构化流程图工具如何表达 node / edge / group / layout / text？
- 文档生成工具如何表达 selected context -> structured document？
- 哪些开源项目最值得第一批 clone 并源码调研？

## 13. CanvasObject family 候选能力池

今天还讨论到一组未来 CanvasObject / Canvas capability 候选。

这些不是当前 8.8 核心实现承诺。
它们更适合作为：

```text
CanvasObject family 的长期候选池。
```

当前核心判断：

```text
CanvasObject 不应该只被定义成 shape / text / image 这类简单白板元素。
如果 Coincides Canvas 引擎根基做得好，它应该可以容纳多种结构化、可读取、可展示、可解释的 object family。
```

### 13.1 Diagram / Flowchart Object

候选能力：

- mind map；
- flowchart；
- concept map；
- process map；
- node-edge diagram；
- AI-generated editable diagram；
- diagram-as-code projection。

关键判断：

```text
Coincides 不接受 AI 生成流程图主要落成不可编辑图片。
```

更理想的是：

- 节点可编辑；
- 边可编辑；
- 节点文字来自 TextFlow 或可转成 TextFlow；
- diagram 可以进入 AI-readable snapshot；
- diagram 可保留 provenance；
- diagram 与 Relation / RelationProposal 保持边界。

### 13.2 MathGraph Object

候选能力：

- 普通 XY 坐标系；
- 极坐标；
- 复平面 / 虚数坐标系；
- 参数方程；
- 隐函数；
- 多曲线；
- 数学标注。

当前判断：

```text
MathGraph 和 Diagram / Flowchart 不是同一种复杂度。
MathGraph 的真相更接近公式、坐标系、domain / range 和渲染参数。
```

因此它可能比流程图更容易形成稳定 object model：

```text
MathGraphObject
  coordinate_system
  expressions
  domain
  range
  viewport
  style
  source_formula_ref
```

这类 object 与 TextFlow / formula block 的连接也很自然：

```text
formula block -> math graph projection
math graph object -> source_formula_ref
```

### 13.3 Statistical Chart / Visualization Object

候选能力：

- bar chart；
- histogram；
- line chart；
- pie chart；
- box plot；
- scatter plot；
- heat map；
- network graph；
- more structured data visualization。

当前判断：

```text
这类 object 的真相不是渲染后的图形碎片，
而是 data / encoding / scale / axis / style / annotation。
```

它们可以被细致编辑，但编辑对象不是像素，而是参数：

- 数据源；
- 字段映射；
- 坐标轴；
- bin size；
- scale；
- color encoding；
- legend；
- trendline；
- annotation；
- caption；
- export style。

可能的 family：

```text
VisualizationObject
  MathGraphObject
  ChartObject
    bar
    histogram
    line
    pie
    scatter
    boxplot
    heatmap
  NetworkGraphObject
```

对 AI-readable layout 很友好，因为 AI 可以读取：

- 图表类型；
- 数据来源；
- x / y field；
- series；
- scale；
- 当前可视化结论或 annotation。

### 13.4 Media / Asset Viewer Object

候选能力：

- image；
- video；
- PDF preview；
- 3D model viewer；
- maybe audio / interactive preview。

其中 3D model viewer 的边界需要特别明确：

```text
Coincides 不做 3D 建模。
但可以做 3D 成品展示。
```

参考产品包括：

- Blender；
- Autodesk Maya；
- Autodesk 3ds Max；
- Cinema 4D；
- Houdini；
- ZBrush；
- SketchUp；
- Rhino；
- Fusion 360；
- SolidWorks。

这些是 3D 创作 / 建模 / CAD / 渲染领域的成熟产品，但 Coincides 不应该复制它们的能力。

Coincides 更合理的对象是：

```text
3DModelViewerObject
```

它只负责展示：

- model_ref；
- format: glb / gltf / obj / stl / fbx maybe；
- bounds；
- camera_state；
- lighting_preset；
- preview_image；
- caption / description；
- source_ref；
- ai_visibility；
- export_role。

允许用户：

- 拖到画布上；
- 移动、缩放 viewer；
- 旋转视角；
- zoom in / zoom out；
- 保存当前视角为封面；
- 添加 caption / description。

暂不做：

- 3D 建模；
- 模型编辑；
- 材质编辑；
- 骨骼动画编辑；
- 复杂 3D 标注；
- 模型部件级语义识别。

当前边界：

```text
能看、能转、能引用；
不建模、不深度编辑、不做复杂 3D 标注。
```

### 13.5 Ink / Freehand Object

候选能力：

- raw stroke；
- handwriting；
- formula handwriting；
- circle annotation；
- freehand arrow；
- sketch；
- diagram candidate；
- decoration；
- emphasis marker。

当前判断：

```text
Ink 很重要，但短期不应做成熟理解。
```

第一版最多预留：

```text
InkGroup
  bounds
  strokes
  style
  nearby_objects
  ai_interpretation_status: unparsed
```

真正理解以后再通过 `InkInterpretationProposal` 做。

### 13.6 Document / Page / Structured Output Object

候选能力：

- structured document；
- generated report；
- strategy document；
- markdown artifact；
- TextFlow document projection；
- PageFrame materialization；
- selected objects -> structured doc。

这是 Miro `Strategy Document` 截图带来的重点问题。

待调研：

```text
Agent 生成的 structured document，
应该落成 TextFlow / PageFrame / DocumentObject / Markdown artifact / CanvasObject projection 中的哪一种？
```

当前倾向：

- 不要落成不可编辑图片；
- 尽量保留 TextFlow 内容真相；
- 保留 selected object provenance；
- 允许进入 PageFrame 或独立 document object；
- 通过 materialization layer 决定落点。

## 14. Block-backed CanvasObject 与纯 CanvasObject 的边界

今天进一步讨论了 `Block` 与 `CanvasObject` 的关系。

当前暂定边界：

```text
Block 不是 CanvasObject。
Block 是内容对象。
CanvasObject 是空间对象。
很多重要 CanvasObject 会是 block-backed。
但 PageFrame、纯图形、视觉箭头、ContentGroup projection、Raw Ink 不应该强行变成 Block。
```

更具体地说：

```text
TextFlow = 文字内容真相
Block = 可编辑、可读取、可被操作的内容容器
CanvasObject = 空间中的投影 / 位置 / 占地 / 层级
PageFrame = 特殊的结构性 CanvasObject / 文档表面
```

因此：

```text
Block -> 可以投影成 CanvasObject
CanvasObject -> 不一定背后有 Block
```

### 14.1 当前命名约定

当前先不要在文档中把基础 paragraph block 改名为 TextBlock。

统一语境：

```text
paragraph block = 当前基础文字 block
```

虽然未来产品心智上它很可能会被扶正为 `TextBlock`，但在正式改名和数据迁移之前，文档和讨论中先继续使用 `paragraph block`，避免语义写乱。

### 14.2 纯图形获得文字内容

对于纯图形：

```text
Pure Shape CanvasObject
  没有内容真相
  只有 shape / style / bounds
```

如果用户双击图形或选择“填充文字”，则它可以挂载一个 paragraph block：

```text
Shape CanvasObject
  + paragraph block content_ref
  = block-backed Shape CanvasObject
```

注意，这不是：

```text
Shape -> paragraph block
```

而是：

```text
图形仍然是 Shape CanvasObject。
文字内容由 paragraph block / TextFlow 承担。
```

未来也可以存在：

- formula block-backed CanvasObject；
- table block-backed CanvasObject；
- chart block-backed CanvasObject；
- image block-backed CanvasObject。

但对于“在普通图形里填字”这个动作，默认底座应是 paragraph block。

### 14.3 纯图形填字后的退格问题

如果用户只是临时进入文字编辑，没有提交内容：

```text
Pure Shape
  -> draft text slot
  -> empty commit / cancel
  -> keep Pure Shape
```

如果用户提交了非空文字，才创建 durable paragraph block 并 attach。

如果用户之后把文字删空，是否退回纯图形，需要判断：

- 这个 paragraph block 是否刚创建且无外部引用；
- 是否被 ContentGroup 引用；
- 是否有 Annotation；
- 是否有 SourceAnchor；
- 是否有 Agent proposal；
- 是否有历史记录或其他语义链接。

如果没有外部依赖，可以退回纯 CanvasObject。
如果已经被其他系统引用，不应悄悄删除。

### 14.4 普通 paragraph block 改样式不是“升格”

新问题：

```text
如果用户在 scratch workspace 双击创建一个 paragraph block，
然后给它加背景、边框、颜色、圆角，
这算什么？
```

它不应该被描述为：

```text
Block 升格为 CanvasObject
```

因为 block 在 Canvas 中本来就已经有 CanvasObject / placement projection。

它也不应该简单描述为：

```text
Block 升格为图形
```

这会让概念变怪。

更合理的待验证方向：

```text
paragraph block projection 可以拥有 visual container style。
```

也就是说：

- paragraph block 仍然是内容对象；
- 它在 Canvas 上的投影可以有背景、边框、圆角、阴影；
- 这些样式属于 CanvasObject / placement / projection style；
- 不改变 block 的内容真相；
- 也不意味着它变成 shape object。

这个问题需要后续继续讨论。
当前先记录为待定边界。

## 15. Relation 设计顺延判断

当前补充判断：

```text
Canvas 是当前基本盘。
Relation 是更后置、更依赖 ContentGroup Projection / Relation View / GraphRAG 的新颖功能。
```

因此，近期版本不应为了 Relation 提前打乱 Canvas Engine / PageFrame / ContentGroup Projection 的推进顺序。

Relation 现在不是立刻实现对象，但它确实处于“欠设计”状态，需要在后续进入 Relation View 之前重新收束：

- 旧 Roadmap 中已经存在 A9b / A9c / A9d 形式的 relation 设计阶段；
- 新 Canvas lane 中把 ContentGroup Mode / Relation View 顺延到 8.12+；
- 这两套口径需要在未来合并；
- 普通 Canvas visual arrow 仍然不自动成为 Relation；
- Relation endpoint 仍倾向于 ContentGroup / Petal，而不是任意 block 或任意 CanvasObject；
- Relation 应该先经过 RelationProposal / candidate / confirmation，而不是直接落成 KnowledgeRelation；
- GraphRAG 可以帮助发现候选关系，但不能反过来定义 Coincides 的 relation truth。

暂定路线：

```text
8.9 先稳 PageFrame。
8.10 优先做 ContentGroup Projection / CanvasObject reuse。
Relation Doctrine Refresh / Relation Foundation Plan 后置到 Relation View 之前。
```

也就是说，今天只记录这个事实：

```text
Relation 欠设计，但暂不抢 Canvas 基本盘。
```

## 16. 当前最稳定结论

今天最稳定的结论：

```text
Coincides 不接受把 AI 生成的流程图主要落成一张不可编辑图片。

Canvas 的 AI 方向不是让模型看截图，
而是让它读取结构化 Canvas AI Tree，
并通过 proposal / command / materialization boundary
把结果安全落回 TextFlow、PageFrame、ContentGroup 或可编辑 DiagramObject。
```

同时：

```text
CanvasObject 不应过早定死。
它应该在结构化画布引擎、Accessibility Tree、UI parsing、
diagram generation、document materialization 的调研之后再正式收束。
```

## 17. 2026-06-26 补记：TextFlow 排版能力需要后续专门小版本

在推进 V2.BN.8.9 PageFrame Maturity 时，补充确认一件之前遗漏的事情：

```text
PageFrame 需要先有纸张比例和默认文档排版基线；
TextFlow 后续也需要专门拿出一个小版本或一到两个小版本，
补齐字体、字号、行距、段落间距等排版能力。
```

当前 8.9.3.1 只处理 PageFrame 侧的 print scale / document typography baseline：

- 默认 PageFrame 应该像一张 A4 逻辑页面，而不是一个随内容增高的矮矩形；
- 正文默认 font size / line height 应该有稳定 baseline，供测量、AI-readable layout 和后续导出参考；
- 这只是默认文档排版 token，不是完整 TextFlow typography system。

后续 TextFlow typography pass 可以单独讨论：

- font family；
- font size；
- line height；
- paragraph spacing；
- heading / quote / code 等 writing role 的默认样式；
- paragraph block 未来是否改名为 TextBlock，以及需要怎样的数据迁移。

原则：

```text
TextFlow 仍然是内容真相。
字体字号行距属于 TextFlow / document typography 能力，
但不能在 8.9.3.1 里仓促塞成半套样式系统。
```
