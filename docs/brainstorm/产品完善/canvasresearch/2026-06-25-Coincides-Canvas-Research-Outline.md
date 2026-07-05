# 2026-06-25 Coincides Canvas Engine 深度调研 Outline

status: draft outline
date: 2026-06-25 America/Toronto
scope: Excalidraw 源码调研、自研 Coincides Canvas Engine、CanvasObject 定义、AI-readable layout、Agent materialization、PageFrame 精细化设计、交互内核学习

> 这份文档不是正式 plan，也不是 8.8 实施方案。它的目标是为后续 Canvas 引擎深度调研建立路线图：我们研究成熟画布工具、可编辑 diagram 工具、Accessibility Tree / UI parsing、文档布局理解和 AI materialization，不是为了把业务真相交给它们，而是为了反推 Coincides 自己的 `CanvasObject`、`Canvas AI Tree`、`PageFrame` 和自研 `Coincides Canvas` 应该如何设计。

## 1. 当前背景

当前已经把 Excalidraw 克隆到本地研究区，可以进行深度源码调研。

这次调研的目的不是“接入 Excalidraw”，而是回答：

```text
如果 Coincides 要自研一个 Canvas Engine，
成熟画布工具已经解决了哪些问题？
哪些问题我们可以学习？
哪些地方必须按 Coincides 自己的 TextFlow / PageFrame / ContentGroup 模型重做？
```

当前 Canvas 引擎命名暂定为：

```text
Coincides Canvas
```

它是 Coincides 四大支柱之一：

- TextFlow：内容真相与自然写作；
- ContentGroup：目的驱动的知识包与复用单位；
- Coincides Canvas：空间组织、PageFrame、CanvasObject、布局意义；
- GraphRAG / Relation：知识关系、AI 推理和图结构检索。

## 2. 本轮调研的核心目标

本轮调研分成三个阶段。

第一阶段不是做设计结论，而是把材料查清楚：

```text
它都有什么？
我们需要什么？
哪些东西能学？
哪些东西不能搬？
```

第二阶段才是把第一阶段的结果融合起来，专门回答：

```text
Coincides Canvas 到底应该怎么做？
```

也就是说，源码调研不是终点。
它只是为后续设计稿、工程路线和 8.8 plan 提供判断材料。

第一阶段需要回答三类问题。

第一类：成熟画布工具到底有什么。

- 它的产品层级如何划分？
- 它有哪些核心模块？
- 它如何保存场景、元素、文件、状态？
- 它如何实现选择、拖拽、缩放、旋转、吸附、撤销重做？
- 它如何处理线条、箭头、绑定和自由绘制？
- 它如何导出？
- 它的渲染层、状态层、命令层如何分工？

第二类：Coincides 到底需要什么。

- Coincides Canvas 的最小正式模型是什么？
- 当前有限画布胚胎如何升级成正式引擎？
- TextFlow / Block 如何投影到 Canvas？
- PageFrame 为什么是第一个必须精细化设计的 CanvasObject？
- CanvasObject 的最小字段需要哪些？
- 哪些 object 第一版必须做，哪些必须后置？
- AI-readable Canvas 最低需要哪些数据？

第三类：成熟工具与 Coincides 的翻译关系。

- 外部工具里的 text shape 能否被 TextFlow / Block 替换？
- 外部工具里的 page / frame 能否被 PageFrame 替换？
- 外部工具里的 element / shape 能否翻译成 CanvasObject？
- 外部工具里的 arrow / binding 能否只保留视觉交互，不直接进入 Relation？
- 外部工具的 store 为什么不能成为 Coincides 的业务真相？
- 哪些实现可以借鉴，哪些设计必须拒绝？

第二阶段是新增阶段，专门围绕 `CanvasObject` 做定义反推：

```text
CanvasObject 究竟是什么？
它如何成为 AI-readable layout 的一部分？
它如何被 Agent 读取、生成、校对、移动、调整样式和物化？
```

这一阶段不直接写最终引擎方案，而是先研究：

- 成熟产品如何从 canvas selection 生成 diagram / document；
- AI 生成的 diagram 是图片、diagram-as-code，还是 editable canvas nodes；
- AI 生成的 document 是文本框、文档对象、PageFrame，还是 artifact preview；
- 开源 diagram / canvas 工具如何定义 node / edge / object / document；
- Accessibility Tree / UI parsing 如何表达 role / bounds / state / hierarchy；
- 文档布局理解如何表达阅读顺序、空间关系和结构；
- 当前 Coincides 的 paragraph block、NoteBlock、PageFrame、ContentGroup projection、CanvasObject 应如何分层；
- Agent 应该直接操作 CanvasObject，还是通过 command / proposal / materialization layer。

第三阶段才是在前两阶段基础上做融合判断：

- Coincides Canvas 的正式引擎边界是什么？
- 当前有限画布胚胎应该怎样扶正？
- 哪些成熟工具设计可以翻译成我们自己的实现？
- PageFrame 第一版应该做到什么程度？
- CanvasObject / CanvasPlacement / CanvasCommand 是否需要从 8.8 一开始就建立？
- 普通 object、PageFrame、paragraph block projection、ContentGroup projection 的关系如何设计？
- 8.8 的第一轮工程应该先做底层、PageFrame，还是对象协议？
- 哪些东西必须留到 8.9+，避免第一版过载？

## 3. 调研边界

本轮调研先不做这些事：

- 不把 Excalidraw 直接接入主工程；
- 不把任何外部 diagram / canvas 工具直接接入主工程；
- 不把 Excalidraw store 当作 Coincides 的最终数据库；
- 不把外部开源工具的 store / node model 当作 Coincides 的业务真相；
- 不引入第二套文本系统；
- 不把普通 Canvas arrow 自动解释成 Relation；
- 不把 AI 生成的流程图主要落成一张不可编辑图片；
- 不做完整 Relation runtime；
- 不接入完整 Agent runtime；
- 不做 GraphRAG；
- 不急着堆很多 object 类型；
- 不急着实现手写识别、OCR、数学图像、3D、视频工作台等高级对象；
- 不把 PageFrame 当成普通白板 frame 草率处理。

本轮调研允许做这些事：

- 深度阅读 Excalidraw 源码；
- 筛选并 clone 少量开源 diagram / canvas / mind map 工具做源码研究；
- 调研成熟产品的 AI diagram / document / selection context 行为；
- 调研 Accessibility Tree / UI parsing / document layout understanding；
- 用 CodeGraph / ripgrep 分析模块和调用关系；
- 记录成熟画布工具的结构；
- 记录成熟产品中 AI 生成结果如何落回 canvas / workspace；
- 对照 Coincides 当前模型做翻译表；
- 反推 Coincides CanvasObject / Canvas AI Tree / Agent materialization 的边界；
- 为 Coincides Canvas 写阶段三自研设计稿；
- 为 PageFrame 写阶段三精细化设计稿；
- 为后续 8.8 plan 准备工程判断。

## 4. 已稳定下来的前置判断

当前最重要的前置判断：

```text
Coincides Canvas 的根基不是数学意义上的无限画布，
而是可扩展的有限画布。
```

也就是说：

- 用户不需要真正无限大的世界；
- 用户需要的是足够大、可以继续扩展、体验上像无限的空间；
- 底层可以用有限 world / chunk / page region 逐步扩张；
- 这样更利于数据保存、性能控制、AI 读取、导出和协作。

第二个判断：

```text
TextFlow 是内容真相。
CanvasObject 是空间投影和交互载体，但它的最终边界不能过早定死。
```

如果某个 shape 内部需要文字，它不应该拥有第二套私有文本系统。
更合理的方向是让它挂载 TextFlow / paragraph block。

第三个判断：

```text
PageFrame 是第一个需要精细化设计的特殊 CanvasObject。
```

它不仅是一个矩形页面，而是承担：

- 正式写作区域；
- 导出边界；
- Page Mode 入口；
- 多页文档结构；
- 页眉、页脚、页码；
- 纸张大小和模板；
- 标尺、页边距、吸附参考线；
- TextFlow 排版边界。

第四个判断：

```text
Canvas Mode 不生产 Relation。
ContentGroup Mode 生产 RelationProposal，并在确认后生成 Relation。
```

普通画布箭头是视觉对象。
ContentGroup Mode 中的箭头才可能是 Relation / RelationProposal 的投影。

第五个判断：

```text
Canvas 在 Coincides 中同时是白板、页面系统、空间组织层和 AI-readable layout。
```

Canvas 不取代 TextFlow，也不取代 ContentGroup：

```text
TextFlow = 内容真相
ContentGroup = 知识结构真相
Canvas = 空间 / 布局真相
```

第六个判断：

```text
Coincides 不接受把 AI 生成的流程图主要落成一张不可编辑图片。
```

AI 生成的 diagram / document 应尽量保留结构、来源、可编辑性和 AI-readable 能力。
如果外部产品生成的是 image artifact，只能作为行为参考，不能作为 Coincides 的主要目标形态。

第七个判断：

```text
Block 不是 CanvasObject。
Block 是内容对象。
CanvasObject 是空间对象。
很多重要 CanvasObject 会是 block-backed。
但 PageFrame、纯图形、视觉箭头、ContentGroup projection、Raw Ink 不应该强行变成 Block。
```

## 5. 计划产出的研究文档

建议本轮调研拆成三个阶段、15 份文档。

### 文档归档规则

为避免不同调查波次混在一起，阶段性研究文档按文件夹归档。

```text
canvasresearch/
  2026-06-25-Coincides-Canvas-Research-Outline.md
  Research_1_Canvas/
    阶段一：Canvas engine / Excalidraw / 当前有限画布胚胎调查
  Research_2_Canvas_object/
    阶段二：CanvasObject 定义与 AI-readable 操作边界调查
  Research_3_Canvas_design/
    阶段三：融合设计、PageFrame 精细化、8.8 候选 plan
```

当前阶段一文档已经放入 `Research_1_Canvas`。
下一轮阶段二文档应放入 `Research_2_Canvas_object`。
阶段三开始前再建立或使用 `Research_3_Canvas_design`。

### 阶段一：调查与需求清点

阶段一只负责把材料查清楚。
它不急着给最终方案，也不急着写 8.8 plan。

### 01. Excalidraw 产品与源码层级总览

目标：

- 先回答“它都有什么”。

重点看：

- monorepo / package 结构；
- app 层、package 层、element 层、scene 层、renderer 层；
- 状态管理入口；
- 核心类型定义；
- 主要交互入口；
- 导出能力；
- 测试与 examples。

输出：

- Excalidraw 模块地图；
- 从用户操作到数据变化的大致路径；
- 哪些部分对 Coincides 有参考价值。

### 02. 交互内核调研

目标：

- 学习成熟画布工具如何处理交互。

重点看：

- pointer / mouse / keyboard 事件；
- selection；
- drag；
- resize；
- rotate；
- zoom / pan；
- viewport transform；
- hit testing；
- snapping；
- multi-select；
- undo / redo；
- command / history；
- clipboard；
- context menu。

输出：

- Coincides Canvas 第一版应该保留的交互清单；
- 哪些交互可以照着成熟工具的行为设计；
- 哪些交互因为 TextFlow / PageFrame 特殊性必须重做。

### 03. Scene / Element / Store 数据结构调研

目标：

- 看成熟工具如何表示画布数据。

重点看：

- scene；
- element；
- app state；
- files / assets；
- binding；
- group；
- frame；
- deleted / version / history；
- serialization / restore。

输出：

- 外部数据模型结构图；
- 与 Coincides 数据模型的翻译表；
- 哪些字段可以映射到 CanvasObject / CanvasPlacement；
- 哪些字段不能进入业务真相。

### 04. Arrow / Line / Binding 次重点调研

目标：

- 不是为了照搬 Relation，而是学习视觉连线怎么做。

重点看：

- arrow element；
- line element；
- endpoint；
- bound element；
- elbow / straight / curved；
- resize 后连线如何更新；
- 对象移动后连线如何跟随；
- 命中测试如何判断选中线条；
- connector 如何渲染。

输出：

- 普通 Canvas arrow 的实现参考；
- ContentGroup Mode 的 RelationProposal 不应照搬的边界；
- 未来 relation projection 可以借鉴的视觉机制。

### 05. Coincides 需求与现有有限画布胚胎盘点

目标：

- 把“我们到底需要什么”单独清点出来。

重点看：

- 当前工程里的 page mode / canvas mode；
- 当前有限 world / viewport / zoom / pan；
- PageFrame 当前承担的功能；
- scratch workspace 的现有行为；
- TextFlow / Block 当前如何落在页面上；
- ContentGroup projection 未来需要什么入口；
- AI-readable Canvas 需要哪些最低数据；
- 当前模拟实现里哪些东西可以扶正成正式引擎。

输出：

- 当前实现能力盘点；
- Coincides Canvas 自身需求清单；
- PageFrame 初始需求清单；
- 与 Excalidraw 调研结果的第一版差异表。

### 阶段二：CanvasObject 定义与 AI-readable 操作边界调研

阶段二是新增阶段。
它不急着写最终引擎方案，而是专门回答：

```text
CanvasObject 究竟应该是什么？
```

这一阶段要把成熟产品、开源工具、Accessibility Tree / UI parsing、文档布局理解和当前 Coincides 模型放在一起看。

核心目标不是找一个现成画布引擎，而是：

```text
用外部产品和开源代码反推 Coincides CanvasObject 的边界、字段、分层和 Agent-readable 操作协议。
```

### 06. CanvasObject 调研方法与评分标准

目标：

- 先定义这轮调研怎么查、查什么、如何评分。

重点看：

- CanvasObject 必须回答的问题；
- 成熟产品与开源工具分别负责提供什么证据；
- 什么叫 editable output；
- 什么叫 AI-readable object；
- 什么叫 Agent materialization；
- 哪些结论需要源码证据；
- 哪些结论只能作为产品行为参考；
- 如何避免把外部工具的模型误当成 Coincides 真相。

输出：

- 调研问题清单；
- 候选产品清单；
- 候选开源库清单；
- 评分维度；
- clone 优先级；
- 暂不研究项目清单。

### 07. 成熟产品行为拆解：AI Diagram / Document / Selection Context

目标：

- 看成熟产品如何把 AI 生成结果落回 canvas / workspace。

重点产品：

- Miro；
- Whimsical；
- XMind；
- Lucidchart；
- Eraser / DiagramGPT；
- FigJam；
- Mural。

重点问题：

- AI 生成的 diagram 是图片、diagram-as-code，还是 editable canvas nodes？
- AI 生成的 document 是普通文本框、文档对象、PageFrame，还是 artifact preview？
- 用户是否能继续编辑内部节点和文字？
- selected objects / board context 是否成为 prompt context？
- 生成结果是否保留 provenance？
- AI 生成结果是直接落画布，还是进入 side panel / document panel 后再 materialize？

输出：

- 产品行为矩阵；
- diagram 产物类型对比；
- document 产物类型对比；
- 对 Coincides 的可借鉴点；
- 必须拒绝的方向，例如不可编辑图片作为主产物。

### 08. 开源 Canvas / Diagram / Mind Map 引擎源码候选筛选

目标：

- 筛出第一批最值得 clone 和源码调研的开源库。

候选：

- 第一批源码调研库：
  - Excalidraw；
  - xyflow / React Flow；
  - Mermaid；
  - Markmap。
- 第二批候选库：
  - diagram-js / bpmn-js；
  - Mind Elixir；
  - draw.io / diagrams.net；
- 必要时再补 tldraw、其他 mind map / diagram 项目。

重点问题：

- object / node / shape 的最小模型是什么？
- bounds / position / size / zIndex 如何保存？
- text 内容如何挂载？
- node / edge 如何连接？
- selection 如何表达？
- undo / redo 如何记录？
- serialization 如何保存？
- accessibility / focus / keyboard 是否有设计？
- 哪些库适合源码学习，哪些只适合产品行为参考？

输出：

- 开源库筛选表；
- license / repo size / framework / model maturity / clone value；
- 第一批 clone 建议：Excalidraw、xyflow / React Flow、Mermaid、Markmap；
- 每个库的源码阅读问题。

### 09. Accessibility Tree / UI Parsing / Canvas AI Tree 调研

目标：

- 用 Accessibility Tree / UI parsing 反推 Coincides 自己的 `Canvas AI Tree`。

重点看：

- role；
- name；
- bounds；
- state；
- hierarchy；
- focus order；
- reading order；
- interaction target；
- visibility；
- UI element parsing；
- screenshot-to-structure；
- browser accessibility tree 与 canvas / SVG / DOM 的关系。

输出：

- Accessibility Tree 对 Canvas AI Tree 的启发；
- `Canvas AI Tree` 最小字段候选；
- role / bounds / state / hierarchy 的翻译表；
- Agent 读取 Canvas 时应该看到什么；
- 哪些信息应来自持久层，哪些应在 snapshot 生成时计算。

### 10. Coincides 当前 Block / CanvasObject / PageFrame 边界盘点

目标：

- 对照当前工程，盘点 `paragraph block`、`NoteBlock`、`TextFlow`、`PageFrame`、`CanvasObject`、`ContentGroup projection` 的边界。

重点看：

- 当前 `NoteBlock` 是否仍混合内容与布局；
- `paragraph block` 在 Canvas 上是否只是 block-backed projection；
- 纯 CanvasObject 何时挂载 paragraph block；
- block-backed shape 与 styled block projection 的区别；
- FormulaBlock / inline formula / paragraph block 的关系；
- PageFrame 为什么不能被当成普通 block；
- ContentGroup projection 为什么也不能硬塞成 block；
- 哪些 object family 应该是 block-backed，哪些不应该。

输出：

- Coincides 当前模型盘点；
- `Block != CanvasObject` 的边界草案；
- `block-backed CanvasObject` 的定义草案；
- `pure visual CanvasObject` 的定义草案；
- `structured object family` 的候选列表；
- 命名约定：正式改名迁移前继续使用 `paragraph block`。

### 11. CanvasObject Contract Draft v0

目标：

- 在阶段二材料基础上，写出第一版 CanvasObject 合同草案。

重点回答：

- CanvasObject 是什么？
- CanvasObject 和 paragraph block 是什么关系？
- CanvasObject 和 PageFrame 是什么关系？
- CanvasObject 和 ContentGroup projection 是什么关系？
- 什么是 block-backed CanvasObject？
- 什么是 pure visual CanvasObject？
- 什么是 structured object family？
- Agent 能不能操作 CanvasObject？
- 如果能，是直接操作，还是通过 command / proposal / materialization layer？
- AI-readable snapshot 最低字段是什么？
- 哪些字段必须持久化，哪些字段应该派生计算？

输出：

- CanvasObject Contract Draft v0；
- Canvas AI Tree node Draft v0；
- Agent operation boundary Draft v0；
- 后续阶段三设计稿的输入材料。

### 阶段三：融合设计与路线判断

阶段三不再只是“看别人怎么做”，而是把阶段一、阶段二材料收束成 Coincides 自己的设计稿。

这一阶段的中心问题是：

```text
我们到底该怎么做？
```

这里的“怎么做”不是把所有 Canvas 能力都塞进 V2.BN.8.8。

Canvas 是 Coincides 的第三大支柱，不适合被压缩成一个小版本一次做完。阶段三需要同时回答：

- V2.BN.8.8 第一轮应该切哪里；
- 哪些能力必须等 8.9 / 8.10 / 后续 Canvas lane 继续成熟；
- 如果要把 Canvas 做到相对成熟，需要经历哪些层级；
- 哪些能力现在不做会让底座歪掉；
- 哪些能力现在做会把版本拖死。

阶段三调研过程中要持续携带一个元问题：

```text
当前这些 inventory / matrix / table 够不够？
如果不够，还要补哪张表，才能让我们做出可靠的路线判断？
```

### 12. Canvas Engine Capability Inventory List

目标：

- 在进入正式设计稿之前，先整理 Coincides Canvas 到底需要哪些功能。

这一份不是实现计划，而是能力清单。它要把“参照引擎已有能力”“Coincides 需要吸收的能力”“Coincides 必须差异化的能力”“需要自建的能力”“明确后置的能力”拆开。

重点盘点：

- 成熟画布引擎的基础能力：
  - world / viewport / camera；
  - pan / zoom；
  - select / multi-select；
  - drag / resize / rotate；
  - hit testing；
  - snapping / alignment；
  - zIndex / layer；
  - grouping；
  - undo / redo / command history；
  - clipboard；
  - context menu；
  - export；
  - keyboard / accessibility；
  - basic shapes；
  - line / arrow / connector；
  - image / asset；
  - freehand / ink。
- Coincides 必须吸收的能力：
  - 稳定几何模型；
  - 稳定交互模型；
  - object selection 和操作反馈；
  - PageFrame 内外对象的统一坐标；
  - 视觉箭头和普通连接线；
  - 导出边界；
  - AI-readable snapshot 的最低字段。
- Coincides 必须差异化的能力：
  - TextFlow 作为内容真相；
  - paragraph block projection；
  - block-backed CanvasObject；
  - PageFrame 作为特殊 CanvasObject；
  - ContentGroup projection；
  - Canvas AI Tree；
  - Agent proposal / command 边界；
  - 普通 visual arrow 与 RelationProposal 的隔离。
- Coincides 需要自建的能力：
  - CanvasObject / CanvasPlacement / ContentMount 合同；
  - PageFrame 精细化模型；
  - TextFlow mount / styled block projection；
  - ContentGroup projection usage；
  - AI-readable layout snapshot；
  - source / provenance / export / AI visibility 的统一规则。
- 明确后置的能力：
  - 完整 diagram editor；
  - math graph；
  - statistical chart；
  - 3D model viewer；
  - Raw Ink 语义理解；
  - handwriting OCR；
  - Relation runtime；
  - GraphRAG runtime；
  - multi-user collaboration。

输出：

- Canvas capability inventory；
- external engine feature translation matrix；
- adopt / adapt / rebuild / defer 四象限表；
- V2.BN.8.8 第一轮候选功能清单；
- 8.9 / 8.10 / 后续 Canvas lane 后置功能清单；
- inventory 自检：当前能力分类是否足够，是否需要新增表；
- 需要 Henry 决策的问题。

### 13. Entity Responsibility Inventory

目标：

- 统计每类功能背后到底需要哪些对象、实体、表或派生快照承载。

这一份要防止把所有东西重新塞回 `NoteBlock`、`CanvasObject` 或 metadata 大杂烩。它不急着写最终 schema，而是把职责拆清楚。

重点盘点：

- paragraph block 背后需要哪些层：
  - Block；
  - TextFlow；
  - CanvasObject；
  - CanvasPlacement；
  - ContentMount；
  - Canvas AI Tree snapshot。
- shape 背后需要哪些层：
  - CanvasObject；
  - CanvasPlacement；
  - VisualStyle；
  - optional ContentMount。
- PageFrame 背后需要哪些层：
  - PageFrame object；
  - PageFrame extension；
  - CanvasPlacement；
  - content bounds；
  - ruler / margin / header / footer / export boundary。
- ContentGroup projection 背后需要哪些层：
  - ContentGroup truth；
  - projection / usage；
  - placement；
  - display cache；
  - open original / duplicate / fork / materialize 语义。
- visual arrow / connector 背后需要哪些层：
  - visual object；
  - endpoint / handle；
  - binding；
  - interaction hit area；
  - future RelationProposal projection boundary。
- structured object family 背后需要哪些层：
  - object shell；
  - structure data；
  - rendering projection；
  - AI-readable summary；
  - source / provenance。

输出：

- entity responsibility table；
- truth / runtime / projection / snapshot / proposal 五层归属表；
- 每类对象的最小表组合；
- 哪些实体必须独立，哪些可以先作为 metadata；
- 哪些拆分需要等后续版本；
- inventory 自检：是否还缺数据生命周期、权限、导出或同步相关表。

### 14. Interaction Workflow Inventory

目标：

- 统计用户动作、数据变化、proposal 边界和撤销边界。

这份表从交互反推数据模型。很多对象边界问题不是从 schema 里暴露，而是从用户动作里暴露。

重点盘点：

- 双击空白处创建 paragraph block；
- 创建 pure shape；
- shape 内填文字；
- paragraph block 加背景 / 边框 / callout 样式；
- image / table 插入；
- PageFrame 内外拖动；
- 新建 PageFrame / 设置 primary PageFrame；
- 画普通 visual arrow；
- 选择多个 object；
- grouping / ungrouping；
- undo / redo；
- export PageFrame；
- 拖入 ContentGroup projection；
- 从 selection 生成 ContentGroup proposal；
- Agent 生成 object proposal 后 materialize。

输出：

- interaction workflow table；
- 每个动作会修改哪些 truth / placement / runtime / snapshot；
- 哪些动作必须进入 command history；
- 哪些动作必须先 proposal；
- 哪些动作需要确认；
- 哪些动作第一版必须支持；
- 哪些动作后置。

### 15. AI / Agent Operation Inventory

目标：

- 统计 AI 能读什么、能提议什么、能物化什么、绝不能直接做什么。

重点盘点：

- AI 可读取：
  - Canvas AI Tree；
  - object bounds；
  - PageFrame order；
  - TextFlow plain text；
  - ContentGroup summary / members / petals；
  - source / provenance summary；
  - selected object context；
  - visibility / export role。
- AI 可 proposal：
  - move / align objects；
  - create blocks；
  - summarize selection；
  - cluster into ContentGroup；
  - create structured diagram draft；
  - create PageFrame document draft；
  - create visual edge；
  - create RelationProposal。
- AI 可 materialize 的条件：
  - 用户确认；
  - policy allow；
  - no destructive source mutation；
  - command history 可撤销；
  - provenance 可追踪。
- AI 不可直接做：
  - destructive delete；
  - rewrite source truth；
  - confirmed Relation；
  - silent ContentGroup truth mutation；
  - OCR result overwrite；
  - mass layout rewrite without preview。

输出：

- AI-readable inventory；
- Agent operation permission matrix；
- proposal / command / materialization 边界；
- 第一版只读 Agent snapshot 范围；
- 后续 Agent write lane 候选；
- inventory 自检：是否还缺安全、审计、回滚、用户确认粒度相关表。

### 16. Version Cut / Canvas Maturity Roadmap Matrix

目标：

- 不把所有事情压到 V2.BN.8.8，而是为 Canvas 做一个可持续成熟路线。

重点盘点：

- V2.BN.8.8 必须建立的底座；
- V2.BN.8.8 可以做但不强求的能力；
- V2.BN.8.9 / 8.10 值得单独开的后续小版本；
- 后续 Canvas lane 才适合做的复杂 object family；
- 研究保留但暂不进入工程的能力；
- 明确不做或长期不做的方向。

输出：

- version cut matrix；
- maturity milestone table；
- 8.8 / 8.9 / 8.10 / later lane 拆分建议；
- “不做会伤底座”的能力清单；
- “现在做会拖死版本”的能力清单；
- 需要 Henry 决策的版本边界问题。

### 17. Coincides Canvas 最小自研引擎设计稿 v0

目标：

- 把调研结果翻译成自研引擎的第一版正式轮廓。

重点设计：

- CanvasWorld；
- CanvasViewport；
- CanvasCamera；
- CanvasSurfaceMode；
- CanvasObject；
- CanvasPlacement；
- CanvasSelection；
- CanvasTransform；
- CanvasHistory / command log；
- CanvasExportBoundary；
- AI-readable snapshot。

输出：

- Coincides Canvas 自研架构设计稿 v0；
- 第一版必须有的模块；
- 第一版明确不做的模块；
- 外部工具经验如何翻译成自研实现；
- 后续 8.8 plan 的底层候选任务。

### 18. PageFrame 精细化设计稿 v0

目标：

- 把 PageFrame 作为第一个特殊 CanvasObject 详细设计出来。

重点设计：

- primary PageFrame；
- 多 PageFrame；
- Page Mode 与 Canvas Mode 的切换；
- PageFrame 内 TextFlow 排版；
- page size；
- margin / ruler / tab stop / indent；
- 标尺与吸附参考线；
- 页眉、页脚、页码；
- PageFrame 背景；
- PageFrame template；
- export boundary；
- PageFrame 删除、切换主 Frame、仅剩一个 Frame 时的规则。

输出：

- PageFrame 功能清单；
- PageFrame 数据字段草案；
- PageFrame 交互规则草案；
- 第一版、第二版、后置版本的切分。

### 19. Object / TextFlow / ContentGroup Projection 融合设计稿

目标：

- 回答 CanvasObject 如何和 Coincides 既有三大支柱发生关系。

重点设计：

- ShapeObject 如何挂载 TextFlow / paragraph block；
- Table / Image 是否作为第一批 block-like object；
- PageFrame 内 block 与 PageFrame 外 block 的关系；
- ContentGroup / Petal / Member 何时作为 projection 进入 Canvas；
- 普通 Canvas arrow 与 RelationProposal 的分工；
- visual group 与 ContentGroup 的边界；
- AI 如何读取 object、block、PageFrame、ContentGroup projection；
- object 如何进入 export / snapshot / future GraphRAG。

输出：

- Object 与 TextFlow 的桥接规则；
- Object 与 ContentGroup projection 的桥接规则；
- 第一批 object 候选列表；
- 明确后置的 object family 列表。

### 20. 引擎路线判断与 8.8+ 候选 Plan

目标：

- 把前面所有调研收束成路线判断。

需要回答：

- 自研是否仍是主线？
- 是否需要继续保留 Excalidraw 实验场？
- 是否需要同时研究 tldraw 作为对照？
- 8.8 第一阶段应该做什么？
- 8.9 / 8.10 / 后续 Canvas lane 应该如何展开？
- PageFrame 是否应该先于普通 object？
- Table / Image 是否进入 8.8 第一轮？
- RelationProposal 是否只预留 contract，还是进入 ContentGroup Mode 原型？

输出：

- 路线建议；
- 风险清单；
- 8.8+ 候选 sub-plan；
- 从设计稿到工程 plan 的拆分建议；
- 需要 Henry 决策的问题。

## 6. 第一轮源码阅读问题

第一轮看 Excalidraw 时，不要一上来陷入细节。
先带着这些问题读：

- 用户在画布上创建一个元素时，数据从哪里生成？
- 元素的最小数据结构是什么？
- 坐标、尺寸、角度、层级、样式如何保存？
- 选中一个元素时，状态存在哪里？
- 拖动一个元素时，哪些函数负责更新位置？
- resize / rotate 与普通 drag 的数据流有什么区别？
- viewport 的 zoom / pan 如何影响坐标换算？
- hit testing 如何判断鼠标点到了谁？
- arrow 绑定到对象时，绑定关系如何保存？
- 对象移动后，arrow 如何更新？
- undo / redo 保存的是完整快照还是增量变化？
- 导出时如何从 scene 生成图片 / SVG？
- 删除元素是硬删还是标记删除？
- 多人协作或恢复数据时如何处理版本？

这些问题的回答，将成为 Coincides Canvas 自研架构的参照系。

## 7. 与 Coincides 的对照问题

每读到一个外部概念，都要问一次：

```text
这个概念在 Coincides 里对应什么？
它是业务真相、视觉投影，还是纯交互状态？
```

初始对照表：

| 外部画布概念 | Coincides 候选对应 | 初步判断 |
| --- | --- | --- |
| scene | CanvasWorld / CanvasDocument | 可参考，但不能照搬 |
| element | CanvasObject / CanvasPlacement | 可参考字段结构 |
| text element | paragraph block projection | 应替换，不保留第二套文本 |
| frame | PageFrame | 只可参考，PageFrame 更特殊 |
| app state | CanvasRuntimeState | 多数是交互状态，不应入业务真相 |
| files/assets | Asset / MediaObject | 可参考，但后置 |
| arrow binding | Canvas visual binding | 可参考视觉连线，不等于 Relation |
| group | Canvas visual group | 不等于 ContentGroup |
| history | CanvasCommand / ActionLog | 可重点学习 |
| export | PageFrame / Canvas export | 可重点学习 |

## 8. 研究验收标准

本轮研究不是为了写很多漂亮报告，而是为了让 8.8 不盲目开工。

阶段一完成时，至少要能回答：

- 哪些 Excalidraw 设计值得学习？
- 哪些 Excalidraw 设计必须避免？
- 成熟画布工具通常由哪些层组成？
- 成熟画布工具如何处理核心交互？
- 成熟画布工具如何保存 scene / element / store？
- Coincides 当前已经有哪些有限画布胚胎？
- PageFrame 当前和未来需要承担哪些功能？

阶段二完成时，至少要能回答：

- 成熟产品中的 AI diagram / document 结果到底如何落回 canvas / workspace？
- 哪些产品生成的是图片，哪些生成的是 editable nodes / document object？
- 第一批最值得 clone 的开源 diagram / canvas / mind map 工具是谁？
- Accessibility Tree / UI parsing 对 Canvas AI Tree 有哪些直接启发？
- CanvasObject 是否应该先满足 AI-readable node 的要求，再满足视觉对象要求？
- `Block != CanvasObject` 的边界是否成立？
- 什么是 block-backed CanvasObject？
- 什么是 pure visual CanvasObject？
- 什么是 structured object family？
- Agent 应该直接操作 CanvasObject，还是通过 command / proposal / materialization layer？

阶段三完成时，至少要能回答：

- Coincides Canvas 到底要做哪些功能？
- 哪些功能来自成熟画布引擎经验，哪些需要 Coincides 自建？
- 哪些功能应该 adopt / adapt / rebuild / defer？
- 这些 inventory / matrix 是否足够支撑路线判断，如果不够，还需要补哪张表？
- 每类功能背后由哪些对象、实体、runtime state、projection、snapshot 或 proposal 承载？
- 关键用户动作会修改哪些数据，哪些动作必须进入 command history 或 proposal 流程？
- AI / Agent 能读什么、能提议什么、能物化什么、绝不能直接做什么？
- V2.BN.8.8、8.9、8.10 和后续 Canvas lane 应如何拆分？
- Coincides Canvas 第一版最小引擎是什么？
- PageFrame 第一版到底要做哪些功能？
- TextFlow / Block 如何避免被外部文本系统污染？
- 普通 Canvas arrow 与 RelationProposal 的边界如何保持干净？
- Object / TextFlow / ContentGroup projection 如何接起来？
- 8.8 第一轮工程应该从哪里切入？
- 哪些内容必须明确后置到 8.9+？

如果回答不了这些问题，说明研究还没有完成。

## 9. 当前建议的下一步

当前阶段一已经完成第一轮材料清点。
下一步建议进入新的阶段二，先写：

```text
06. CanvasObject 调研方法与评分标准
```

这份报告不写 Coincides 的最终设计，只负责搞清楚：

- 这轮 CanvasObject 调研到底查什么；
- 成熟产品和开源源码分别提供什么证据；
- 哪些产品和库进入候选池；
- 哪些维度决定 clone 优先级；
- 什么叫可编辑 AI 产物；
- 什么叫 Agent-readable / Agent-operable CanvasObject；
- 哪些问题必须留到阶段三融合设计再回答。

完成 06 后，再进入产品行为拆解、开源源码候选筛选、Accessibility Tree / UI parsing 调研。
完成新的阶段二后，再进入阶段三融合设计。
阶段三完成后，才开始写 8.8 的正式 plan。
