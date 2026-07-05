# 2026-06-23 Better Notebook / Canvas Foundation 问题清单会议记录

status: live brainstorm note
date: 2026-06-23 America/Toronto
scope: Canvas 存在意义、有限画布引擎、CanvasObject 协议、PageFrame 精细化、TextFlow / Block / Object 边界、AI-readable Canvas、外部画布引擎实验

> 这份记录不是正式方案，也不是 8.8 plan。当前目标是把 Canvas 版本开始前必须回答的问题、已经稳定下来的判断、以及后续需要实验验证的方向先记录下来。

## 1. 当前背景

V2.BN.8.7 已经以 `ContentGroup System Maturity` 收口。
当前 Better Notebook 的三根支柱可以暂时理解为：

```text
TextFlow
  第一支柱：自然写作、阅读、正文内容真相。

ContentGroup
  第二支柱：目的驱动的内容包、复用单位、AI-friendly 结构中间层。

Canvas
  第三支柱：空间组织、自由排列、投影、发散理解、工作台底座。
```

进入 Canvas 版本时，不应直接跳到“增加很多 object”。
当前更重要的是：

```text
先建立 Canvas 引擎和 CanvasObject 协议。
再精细化 PageFrame 这个第一个特殊 CanvasObject。
最后再谨慎增加 Table / Image / ContentGroup projection / 其他 object。
```

## 2. Canvas 的存在意义

Canvas 不只是一个能拖东西的大白板。
它的核心意义是：

```text
Canvas 让知识不必永远服从从上到下的文档顺序。
```

TextFlow 代表线性秩序。
ContentGroup 代表打包、抽取和复用秩序。
Canvas 代表空间秩序。

Canvas 让知识可以：

- 并列；
- 靠近；
- 分散；
- 连接；
- 堆叠；
- 临时摆放；
- 自由重组；
- 形成一张局部或全局的空间图。

这也是 Canvas 值得做的原因：它提供了知识整理的第三种形态，也就是空间形态。

但 Canvas 也会带来明显负担：

- 渲染负担更高；
- 首次加载时间可能变长；
- Web 应用开发复杂度上升；
- 对 Relation / Graph / AI-readable 数据模型提出更高要求；
- 如果没有稳定对象协议，后续 object 类型越多，技术债越重；
- 用户自由度越高，AI 越难判断空间关系到底是有意为之，还是只是为了好看。

### 2.1 2026-06-25 补充：Canvas 的四重角色与空间布局真相

进一步稳定下来的判断：

```text
Canvas 在 Coincides 中不是单一白板功能。
它同时是：

1. 白板；
2. 页面系统；
3. 空间组织层；
4. AI-readable layout。
```

其中第四点是 Coincides Canvas 与普通白板工具最大的差异之一。

Canvas 不取代 TextFlow，也不取代 ContentGroup：

```text
TextFlow = 内容真相
ContentGroup = 知识结构真相
Canvas = 空间 / 布局真相
```

Canvas 提供的是 layout。
它让 TextFlow、ContentGroup、PageFrame、CanvasObject 在一个空间里拥有位置、占地、层级和可见性。

因此，AI-readable layout 的最低要求不是只保存一个坐标点。
每个 object 至少需要能被读取为：

- object id；
- object kind；
- x / y；
- width / height；
- rotation；
- zIndex / layer；
- 所属 PageFrame / workspace / surface；
- visibility；
- ai visibility；
- export role；
- content reference / source reference。

也就是说，AI 可以不主动读取整张画布。
但一旦它需要读取，就应该能获取每个 object 的实时空间存在状态：

- 它在哪里；
- 它占多大区域；
- 它属于正式页面还是 scratch workspace；
- 它是否被导出；
- 它是否允许 AI 读取；
- 它是否和其他 object 重叠；
- 它是否被别的 object 遮挡；
- 它是否遮挡了别的 object；
- 它在视觉层级中处于上方还是下方。

其中遮挡关系、重叠比例、邻近关系、聚类关系等不一定需要作为数据库真相永久保存。
更合理的做法是：

```text
持久层保存 object 的基础空间事实：
  x / y / width / height / rotation / zIndex / frameId / visibility。

读取层生成 AI-readable layout snapshot：
  overlaps_with / occluded_by / occlusion_ratio / nearby_objects / alignment / grouping hints。
```

因此，Canvas 的核心不是替代内容，而是让内容获得空间事实。

进一步判断：

```text
AI-readable layout 不等于所有 layout 都有强语义。
```

Canvas 至少会传达三类信息：

1. 硬空间事实：位置、尺寸、层级、归属、可见性。
2. 布局线索：靠近、对齐、包含、重叠、聚类、视觉突出。
3. 弱视觉语义：颜色、边框、箭头、大小、样式。

AI 可以使用这些信息理解用户的空间思考。
但布局线索和弱视觉语义不能自动升级成知识真相。
真正的知识结构仍然需要 ContentGroup / Petal / Relation / RelationProposal 来确认。

### 2.2 2026-06-25 补充：明日调研路线与 CanvasObject 反推思路

进一步判断：

```text
在深入研究结构化画布引擎、文档布局理解、Accessibility Tree / UI parsing 之前，
不应过早把 CanvasObject 定义得太死。
```

原因是：

- CanvasObject 如果只按当前直觉简单定义，后续很容易变成奇怪的中间物；
- 未来 object 不只是白板图形，还可能是 TextFlow projection、PageFrame、ContentGroup projection、AI-readable node、export object、interaction target；
- 如果现在定义过窄，后续每增加一种能力都要大动干戈；
- 更稳妥的路线是先通过外部调研增进理解，再反推出 Coincides 自己的 CanvasObject 边界。

明日调研优先级暂定为：

```text
1. 结构化画布引擎 + Accessibility Tree / UI parsing 一起研究。
2. 文档布局理解单独研究。
3. 做完 Accessibility Tree / UI parsing 后，再回头看结构化画布引擎结果，
   看它能否反补 CanvasObject / CanvasScene / AI-readable layout 的定义。
```

其中 Accessibility Tree / UI parsing 是一个特别值得关注的方向。

当前直觉：

```text
Accessibility Tree 像是把界面转换成一棵可读的结构树。
Coincides 未来也许需要自己的 Canvas AI Tree。
```

它不一定是死结构。
更理想的是：

```text
这棵树由内容和布局共同决定，
而不是完全由预设模板硬编码。
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

这个方向可能反过来塑造 CanvasObject 的定义。

也就是说：

```text
CanvasObject 不只是“画布上能拖动的东西”，
它还应该是能进入 Canvas AI Tree 的结构化节点。
```

这会让 CanvasObject 至少需要考虑：

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

这个判断还不是最终设计，但已经值得进入后续调研输入。

### 2.3 2026-06-25 补充：Agent 操控 Canvas 的待验证问题

进一步讨论中出现一个重要质疑：

```text
我们现在不能直接断言 CanvasObject 必须为 Agent 留出专门能力。
也许 Agent 操控 Canvas 的方式并不是操控每个 CanvasObject，
而是通过更高层的 command / document generation / selection context / projection service 来完成。
```

因此，后续调研必须把这个问题列为重点：

```text
Agent 到底应该如何进入 Canvas？
```

可能路径包括：

1. Agent 直接创建 / 修改 CanvasObject；
2. Agent 只读取 Canvas AI Tree，然后产出 proposal；
3. Agent 通过 CanvasCommand 创建对象、移动对象、生成文档；
4. Agent 只生成 TextFlow / Markdown / document，再由系统 materialize 到 Canvas；
5. Agent 生成图片或 diagram artifact，再作为 ImageObject / DiagramObject 放入 Canvas；
6. Agent 生成结构化 graph / flowchart，再由 Canvas renderer 投影成可编辑节点；
7. Agent 只对 selection context 做总结、聚类、升格为 ContentGroup，不直接改画布。

当前不能提前决定哪一种是主线。
更合理的是先调查成熟产品和相关技术中，Agent 生成结果到底如何落到画布上。

#### Miro AI 截图行为拆解假设

基于 2026-06-25 看到的 Miro AI 视频截图，可以暂时列出几个待验证假设。

第一张截图中，Miro 生成了一个类似 pricing strategy overview 的流程图 / mind map。

可能有两种实现：

```text
可能性 A：它生成的是一整张图片。
```

这种情况下：

- 画布上看到的是一个 image artifact；
- 用户可能只能整体移动、缩放、复制；
- 内部文字和线条不一定可编辑；
- AI 生成的是视觉结果，而不是结构化 canvas node。

```text
可能性 B：它生成的是一组可编辑 canvas nodes。
```

这种情况下：

- 每个节点都是可编辑对象；
- 连线也是可编辑对象；
- 用户可以单独拖动节点、修改文字、改线条；
- 这更接近结构化 diagram / flowchart object。

这两种都可能成立，对 Coincides 的启发不同。

第二张截图中，Miro 生成了一个 `Strategy Document`。
从截图看，它像是一个页面 / 文档卡片 / 文本框，被放在 Canvas 上。

可能行为包括：

- 它是一个整体文档对象；
- 它内部文字可编辑；
- 用户可能双击后进入细节编辑；
- 用户可能需要放大后编辑；
- 它也可能只是一个生成后的 document preview；
- 它可能由左侧 AI panel 的 prompt、selected objects、board context 共同生成；
- 它有可能保留了 selected canvas objects 作为 context。

这一点对 Coincides 很重要。

Coincides 需要调查并决定：

```text
Agent 生成的 structured document，
到底应该落成 TextFlow / PageFrame / DocumentObject / Markdown artifact / CanvasObject projection 中的哪一种？
```

当前更稳的结论不是“CanvasObject 必须为 Agent 特化”，而是：

```text
Canvas 必须有 Agent 可读取、可生成、可回放、可确认的操作边界。
这个边界可能落在 CanvasObject 上，
也可能落在 CanvasCommand / Canvas AI Tree / TextFlow materialization / ContentGroup proposal 上。
```

这将直接决定下一阶段调研的重点。

#### 参考工具与源码候选

后续调研需要点名关注：

```text
XMind
```

原因：

- 它是成熟的 mind map / flowchart / structured diagram 工具；
- 即使不考虑 AI，它在手动生成、编辑、组织流程图方面也很成熟；
- 它可以作为“结构化流程图体验”的参考对象；
- 是否具备 AI 生成能力需要后续调查；
- 即使 AI 能力暂不确定，它仍然值得作为 diagram / mind map interaction 的学习对象。

同时需要继续网上调研：

- 哪些产品可以在 canvas / workspace 上生成细致流程图；
- 哪些产品可以从 canvas selection 生成 structured document；
- 这些产物到底是 image artifact、可编辑 diagram nodes，还是 document object；
- AI 生成结果如何落回 canvas；
- 是否保留 selected objects / board context / provenance；
- 用户如何继续编辑 AI 生成的流程图或文档；
- 有没有主流开源工具值得 clone 到本地做源码研究；
- 这些开源工具分别解决 diagram model、layout engine、whiteboard engine、document materialization 中的哪一部分。

当前需要注意：

```text
成熟产品用于理解交互和产物形态。
开源项目用于研究数据结构和实现路径。
二者不要混为一谈。
```

2026-06-25 初步外部候选：

成熟产品参考：

- XMind：mind map / flowchart / structured diagram 体验参考，且已有 AI mind map 方向；
- Miro：selection context -> docs / diagrams / images / stickies 的 AI 生成路径参考；
- Whimsical：prompt -> editable mind map / flowchart 的产品形态参考；
- Lucidchart：AI diagram generation / selected diagram editing 的产品参考；
- Eraser / DiagramGPT：prompt -> diagram-as-code -> editable diagram / docs 的工程产品参考；
- FigJam / Mural：stickies sort / summarize / cluster 的表层 AI 协作参考。

开源源码候选：

- xyflow / React Flow：node-based UI、nodes / edges、可编辑 graph canvas；
- Mermaid：text-to-diagram / diagram-as-code；
- Markmap：Markdown -> mind map；
- Mind Elixir：JavaScript mind map core；
- diagram-js / bpmn-js：web diagram editor toolkit，尤其值得关注它与浏览器 focus / accessibility tree 的关系；
- Excalidraw：whiteboard scene / element / binding / freehand；
- draw.io / diagrams.net：成熟 diagram editor 参考，但源码、许可和可改造性需要单独审查。

后续调研问题：

- AI 生成的 diagram 是图片、diagram-as-code，还是 editable canvas nodes？
- AI 生成的 document 是普通文本框、文档对象、PageFrame，还是外部 artifact preview？
- 用户是否能继续编辑内部节点和文字？
- 生成产物是否保留 selected objects / board context / provenance？
- 这些工具如何表达 nodes、edges、documents、selection context、AI output 和 accessibility/readability？

## 3. 当前实现审计：已有的是有限画布胚胎

当前代码里的 Canvas mode 不是纯粹临时模拟，它已经有“有限画布引擎”的核心胚胎：

- `DEFAULT_CANVAS_WORLD` 是一个有限世界，目前约为 `4096 x 2600`；
- 有 `world / viewport / zoom / pan / clamp`；
- 有 `page` 和 `canvas` 两种 surface mode；
- canvas mode 下通过 `translate + scale` 做相机视角；
- PageFrame 在 canvas 中以 formal page boundary 的方式存在；
- PageFrame 外侧是 scratch workspace；
- block 通过绝对坐标放到画布世界里；
- page mode 会隐藏 workspace block；
- canvas mode 会显示 formal page 和 scratch workspace 中的所有 block；
- blank area drop、双击创建 draft、拖拽 ContentGroup 到空白画布等行为已经在当前 runtime 中存在；
- 当前 layout 仍然主要存在 block 的 display overrides 中，长期看需要抽成更正式的 placement / projection 实体。

临时判断：

```text
当前实现更像是 Coincides 自研有限画布引擎的第一块地基。
它不应该继续只被看成一个模拟壳。
```

## 4. 有限画布是根基，无限画布是体验错觉

今天形成的关键判断：

```text
有限画布不是无限画布的替代品，而是无限画布的基本运行单元。
```

用户并不需要数学意义上的无限大画布。
用户真正需要的是：

- 当前空间足够大；
- 空间不够时可以自然扩展；
- 拖到边缘时系统能继续给空间；
- 缩小视野时能看到更大范围；
- 导航、定位、回到工作区都稳定；
- 不会因为“无限”二字让系统失去边界和性能控制。

类比游戏里的开放世界：

```text
看起来像开放世界，但工程上通常是区块与区块的衔接。
用户体验到的是连续世界，系统处理的是有限区块。
```

Canvas 也可以这样做：

- 第一阶段：一个足够大的有限 world；
- 第二阶段：world 可以按需要扩展；
- 第三阶段：多个 finite world / chunk / tile 拼接；
- 第四阶段：缩放到很远时显示低细节概览；
- 第五阶段：用户体验上接近无限画布，但底层仍然是可管理的有限单元。

所以 8.8 的方向不应是“数学无限画布”，而应是：

```text
Finite Canvas Engine / 可扩展有限画布引擎。
```

## 5. 当前优先级判断

当前优先级暂定为：

```text
第一优先级：Canvas Engine。
第二优先级：PageFrame 这个特殊 CanvasObject。
第三优先级：CanvasObject protocol。
第四优先级：TextFlow / Block attachment。
第五优先级：ContentGroup projection。
其他 object 类型暂时后置。
```

这意味着 8.8 不应该追求 object 数量。
8.8 更应该追求：

- 画布坐标系统稳定；
- viewport / pan / zoom 稳定；
- 有限 world 可以管理；
- PageFrame 可以被正式建模；
- block 可以稳定投影到画布上；
- placement 可以从临时字段逐渐独立出来；
- 后续 object 可以有共同协议。

## 6. PageFrame 的角色

当前判断：

```text
PageFrame 是第一个需要精细化设计的特殊 CanvasObject。
```

它不是普通 content object，而是：

```text
PageFrame = structural CanvasObject + document surface + export boundary
```

PageFrame 过于特殊，因为它将承担：

- 正文写作区域；
- 导出区域；
- 多页文档结构；
- 完整文本编辑环境；
- 接近 Word / 正式文档编辑器的字体比例和排版尺度；
- 页边距与正文可写区域；
- 标尺、缩进、制表位等排版控制；
- 页眉；
- 页脚；
- 页码；
- 页面背景；
- 页面模板；
- 类似 Word / Notion 页面连续排列的阅读感；
- 未来可能的 DIY 页面格式。

因此，页眉、页脚、页码、页面背景、页面模板等，不应第一时间作为普通 CanvasObject 处理。
它们更适合作为 PageFrame 自己的 page chrome / page format 系统。

### PageFrame 内部排版环境

新增判断：

```text
PageFrame 不只是一个矩形边界。
它应该是一套正式文档编辑环境的容器。
```

这意味着 PageFrame 至少要逐步承载：

- 正文 text slot / writing area；
- 与 Word 等文档编辑器相近的字体比例、行高、段落间距和页面尺度；
- page margin，即正文距离 PageFrame 边界的上、下、左、右页边距；
- ruler / document ruler，用来可视化并调整正文可写范围；
- 左缩进、右缩进、首行缩进、悬挂缩进；
- tab stops / 制表位；
- 未来的页眉、页脚、页码、背景和模板。

这里的关键是：

```text
PageFrame 的文本排版规则不能完全等同于普通 CanvasObject 内部的 textSlot。
PageFrame 更接近正式文档表面，普通 CanvasObject 更接近画布对象。
```

### PageFrame 标尺与吸附边界

进一步判断：

```text
Coincides 的 PageFrame ruler 不应完全照搬 Word。
它既是页面内部排版参照，也是自由画布对象进入 PageFrame 时的吸附参照。
```

Word 的文档标尺主要服务于页面内正文排版。
但 Coincides 的特殊之处在于：

- PageFrame 外侧还有自由 Canvas / scratch workspace；
- block 可以从 PageFrame 外侧移动到 PageFrame 内；
- block 也可以从 PageFrame 内移到外侧；
- PageFrame 不应该成为硬边界，不应该强制禁止对象进出；
- 标尺定义的左右极限更像“可吸附的墙”，而不是不可穿越的墙。

因此，PageFrame 的左右标尺 / 页边距 / contentRect 可以同时承担：

- 页面内 TextFlow block 的默认左边界和右边界；
- block 在 PageFrame 内自动对齐时的吸附线；
- 外部 canvas block 被拖入 PageFrame 附近时的吸附目标；
- PageFrame 内部 block 被拖到边界附近时的对齐目标；
- PageFrame 与自由画布之间的软边界提示。

临时命名可以是：

```text
PageFrame Ruler
PageFrame Snap Guides
Content Boundary Guides
Soft Wall / Magnetic Boundary
```

当前行为判断：

- 开启自动对齐 / snapping 时，block 靠近 PageFrame contentRect 左右边界，应能吸附；
- 关闭自动对齐 / snapping 时，标尺只显示参考，不强制限制位置；
- 这个边界不应该硬性阻止外部 object 进入 PageFrame；
- 也不应该硬性阻止 PageFrame 内部 object 移到外部；
- 它更像一种排版引力场：靠近时帮助对齐，用户仍然保留自由。

这和正式文档编辑器不同，也正是 Coincides 同时拥有 PageFrame 与 Canvas 的特殊性。

### Primary PageFrame 与笔记入口视角

新增判断：

```text
PageFrame 还会决定一篇 note 被打开时的入口视角。
```

如果一篇 note 是以 A4 / 文档页面为主创建的，它应该可以有一个 `primaryPageFrameId`。
这个 primary PageFrame 决定：

- 用户从外部打开这篇 note 时，优先进入哪个 PageFrame；
- 初始是否进入 PageMode；
- PageMode 中默认显示哪一个页面区域；
- CanvasMode 拉远后，用户仍然可以看到其他 PageFrame 和自由画布区域。

临时规则：

- 一篇 note 最多只能有一个 primary PageFrame；
- 用户可以手动切换哪个 PageFrame 是 primary；
- 只有当 PageFrame 数量大于等于 2 时，切换 primary 才有实际意义；
- 如果 note 只剩一个 PageFrame，它应自动成为 primary；
- 如果原 primary PageFrame 被删除，而还有其他 PageFrame，系统应自动选出新的 primary，避免加载和入口视角错乱；
- 如果 note 一开始就是自由画布型笔记，则默认不必进入 PageMode；
- 自由画布型 note 只有在用户显式设置 primary PageFrame 后，才应从 PageFrame / PageMode 作为入口；
- primary PageFrame 是 note 的入口视角配置，不等同于唯一内容真相。

这里可以暂时区分两类 note opening policy：

```text
document-first note
  打开时进入 PageMode，并聚焦 primary PageFrame。

canvas-first note
  打开时进入 CanvasMode，使用上次 viewport 或默认 canvas viewport。
```

后续可能需要字段：

- `noteOpeningMode`: `page` / `canvas` / `last_used`；
- `primaryPageFrameId`；
- `lastCanvasViewport`；
- `lastFocusedPageFrameId`；
- `autoPromoteSinglePageFrameToPrimary`；
- `primaryPageFrameSelectionPolicy`。

需要继续回答：

- 新建 note 时如何决定 document-first 还是 canvas-first？
- 用户从 PageMode 切到 CanvasMode 后，再次打开是否记忆上次模式？
- primary PageFrame 删除后，自动选择新 primary 的规则是什么？
- 没有任何 PageFrame 的 canvas-first note 是否完全合法？
- 多 PageFrame note 的 PageMode 是否只看 primary，还是支持 PageMode 内翻页 / 顺序阅读？

因此，PageFrame 第一版可以先只实现基础正文区域和固定页边距。
但模型上应预留：

- `pageMargins`；
- `contentRect`；
- `rulerState`；
- `snapGuides`；
- `snappingEnabled`；
- `paragraphIndentDefaults`；
- `tabStops`；
- `pageChrome`；
- `pageTemplateId`。
- `primaryPageFrameId`；
- `noteOpeningMode`。

后续需要回答：

- PageFrame 是否允许移动？
- PageFrame 是否允许缩放？
- 第一版是否禁止旋转？
- 多个 PageFrame 如何排列？
- 多个 PageFrame 的阅读顺序如何确定？
- PageFrame ID 是否是区分页眉、页脚、页码等 page chrome 的基础？
- PageFrame 的正文区、页眉区、页脚区是否应该是不同 text slot？
- PageFrame 的页边距、正文可写区域和 ruler state 应该如何保存？
- TextFlow block 在 PageFrame 内是否必须服从 PageFrame 的 contentRect？
- PageFrame 的排版比例是否应该与 Word / PDF / A4 页面体验对齐？
- PageFrame ruler 是只控制文本排版，还是也作为 Canvas object 的 snap guide？
- PageFrame 的 contentRect 边界在 snapping 关闭时是否只作为视觉参考？
- PageFrame 如何参与 note opening policy？
- `primaryPageFrameId` 应该属于 note、canvas document，还是 PageFrame collection？

## 7. TextFlow / Block / CanvasObject 的边界

当前稳定判断：

```text
只要一个图形或 object 承载可编辑文字，底层就应尽量挂 TextBlock / ParagraphBlock。
不要让每种 object 自己保存一份独立 text 字段。
```

换句话说：

- TextFlow 是文字内容真相；
- Block 是内容单元真相；
- CanvasObject 是空间存在真相；
- CanvasPlacement 是位置、尺寸、旋转、层级真相；
- 外部画布或渲染层不应拥有第二套文字真相。

例子：

```text
一个矩形里写字，不应是：
  RectangleObject.text = "..."

而更应该是：
  ShapeObject
    textSlot -> ParagraphBlock / TextFlowBlock
```

这样，shape 中的文字仍然可以享受 TextFlow 的编辑、选择、引用、拖拽、进入 ContentGroup 等能力。

## 8. 初期 Object 范围

当前克制原则：

```text
8.8 不追求 object 数量。
8.8 先追求 object protocol 和 Canvas engine 稳定。
```

可考虑的初期 object：

- Text / Shape object：形状容器 + ParagraphBlock；
- Table object：TableBlock；
- Image object：ImageBlock，可选 caption / description；
- ContentGroup projection：是否进入 8.8 首轮仍待讨论；
- Petal projection：大概率在 ContentGroup projection 稳定之后。

暂时后置的 object：

- video object；
- 3D model preview object；
- math graph / Desmos-like object；
- flowchart object；
- animation object；
- data dashboard object；
- weather object。

备注：

```text
weather object 本身不重要。
它重要的是指向了 Data View Object / database view 这一类问题。
```

## 9. Data-backed Object / Data View Object

天气 object 的例子提示了另一类 object：

```text
CanvasObject 不一定只是静态内容。
它也可能是某个数据源、query、API、数据库视图在 Canvas 上的呈现。
```

这个方向可以暂时称为：

```text
Data View Object
```

后续需要回答：

- Data View Object 是否属于 CanvasObject？
- Table 是否可能既是手写 TableBlock，也是 Data View Object？
- Data View Object 是否可以从数据库、API、爬取数据、监控数据中读取内容？
- Notion database view 对我们有什么启发？
- Data View Object 如何被 AI 读取？
- Data View Object 如何处理刷新、缓存、来源、权限和可复现性？

## 10. AI-readable Canvas

当前判断：

```text
AI 读 Canvas 不应该只靠 OCR / 截图。
AI 也不应该只读死板的结构化字段。

更合理的方向可能是：
视觉理解 + 结构化 Canvas 数据。
```

AI 至少应该能知道：

- object 的类型；
- object 的位置；
- object 的尺寸；
- object 的旋转；
- object 的层级；
- object 内部挂载的内容；
- object 是否在 PageFrame 内；
- object 是否参与 export；
- object 是否对 AI 可见；
- object 之间是否存在显式连接。

但要避免过度解释：

```text
位置、颜色、边框、方向、形状有时有意义，有时只是装饰。
系统不能自动把所有视觉关系都解释成强语义关系。
```

后续可能需要：

- 弱信号：靠近、对齐、颜色相似、方向一致；
- 强关系：用户或 AI 明确确认后的 Relation；
- 可保存的 AI interpretation：AI 对某片 Canvas 的理解可以被保存、修改、删除，而不是直接当作事实。

## 11. 手写、涂鸦、OCR

白板天然会让人想到画笔、涂鸦和手写。
当前判断：

```text
Canvas 初期应允许 ink / free draw 作为对象存在。
但手写转文字、手写转公式、OCR 识别不是当前主线优先级。
```

原因：

- 当前产品主要是桌面 Web 应用；
- 用户主要用键盘和鼠标；
- 没有 iPad / stylus 场景时，手写不是第一优先级；
- OCR / handwriting recognition 未来可以单独做版本；
- 上传扫描图、截图、图片后的文字提取很有价值，但这属于后续 Source / OCR / AI pipeline 问题。

因此，第一阶段更重要的是：

- 画布允许 ink stroke object；
- ink stroke 可以保存、移动、删除；
- AI 是否理解 ink，先后置；
- OCR 以后作为独立能力接入。

## 12. 外部画布引擎：借身体，不借灵魂

今天讨论了外部画布引擎，尤其是 tldraw / Excalidraw 一类项目。

当前判断：

```text
我们不是要用外部画布替代 Coincides。
我们想尝试的是：用 Coincides 的对象模型替换外部画布引擎里的核心数据真相。
```

画布工具通常包含：

- Scene / Store；
- Object Model；
- Page；
- Shape；
- Text shape；
- Image；
- Arrow / Connector；
- Binding；
- Layer / z-index；
- Camera / Viewport；
- Renderer；
- Tool State Machine；
- Hit Testing；
- Transform System；
- History；
- Export。

Coincides 应替换或接管的部分：

```text
Document / Scene / Store
  -> NoteCanvas / CanvasWorld / CanvasDocument / 本地数据库

Page
  -> PageFrame

Text shape
  -> TextFlowBlock / ParagraphBlock

Shape
  -> CanvasObjectProjection，可挂载 Block

Image
  -> ImageBlock / MediaAsset / SourceArtifact

Arrow / Connector
  -> 初期 visual connector，后期可升级为 Relation / GraphEdge

Group
  -> 不能直接等于 ContentGroup。
     视觉分组是 VisualGroup，知识分组是 ContentGroup。

Store
  -> 不能成为最终数据库。
     最多成为交互缓存或被融合进我们的本地数据层。
```

外部画布引擎可以保留的能力：

- pan / zoom；
- selection；
- drag；
- resize；
- rotate；
- hit testing；
- snapping；
- arrow binding；
- free draw；
- shape rendering；
- history 的部分交互经验。

一句话：

```text
我们可以借外部画布引擎的身体，但不能借它的灵魂。
```

## 13. Excalidraw 实验方向

由于 tldraw 存在商用许可限制，当前更倾向先观察 Excalidraw。

已确认的许可判断：

- Excalidraw 主仓库为 MIT License；
- `@excalidraw/excalidraw` package 也标记为 MIT；
- MIT 允许使用、复制、修改、合并、发布、分发、再授权、销售；
- 核心要求是保留原始 copyright notice 和 MIT license notice；
- GitHub fork 只是协作方式，不是法律要求；
- 可以 clone 到本地、vendor 进实验场、直接改源码；
- 但需要区分源码许可证和官网 / 云服务 / 品牌 / logo / Plus 服务条款。

当前工程判断：

```text
不要直接在主工程里融合 Excalidraw。
这应该先开一个实验场。
```

实验场目标：

- 把当前 Coincides 的核心成果克隆进去；
- 把 Excalidraw 源码克隆进去；
- 在隔离环境里大胆删除、替换、改造；
- 验证外部画布引擎是否能被改造成 Coincides Canvas Runtime；
- 实验失败也不污染主工程。

实验场需要验证的问题：

- 能否彻底禁用 Excalidraw 原生 text shape？
- 能否把所有文本输入替换成 TextFlow / Block？
- 能否把 Excalidraw 的 page / frame 概念替换成 PageFrame？
- 能否让外部 store 不成为最终数据库？
- 能否只让外部引擎负责 interaction kernel？
- 能否让 DOM / React 的 Block 编辑与 canvas 坐标、缩放、选择状态同步？
- 能否保留 Excalidraw 的 free draw / arrow / selection / transform 优点？

最核心的问题：

```text
Excalidraw 能不能只做画布身体，而让 Coincides 提供全部内容灵魂？
```

## 14. 外部引擎融合的危险点

即使 Excalidraw 许可证允许，工程上仍然有风险：

- 源码融合可能很大；
- 未来上游更新难以合并；
- 如果深度改造，等于维护一个大型 fork；
- Excalidraw 的 canvas 渲染方式与 Coincides 的 DOM / React TextFlow 编辑可能存在天然摩擦；
- 坐标同步、缩放同步、焦点同步、选中态同步会很复杂；
- 如果没有隔离层，很容易让外部 store 渗透成业务真相；
- 如果不彻底禁用 text shape，会产生第二套文字系统；
- 如果把 visual group 错当成 ContentGroup，会污染知识模型；
- 如果把 arrow 直接当成 Relation，会过早引入语义关系。

因此更稳的路线是：

```text
主工程继续扶正自有有限画布引擎。
另开实验场验证 Excalidraw 是否适合作为 shape / ink / arrow / interaction kernel。
```

## 15. ContentGroup Mode 与 Relation Proposal

刚才关于 arrow / relation 的讨论可以进一步稳定成一条模式边界：

```text
Page Mode 负责正式阅读、写作和导出。
Canvas Mode 负责自由排列、草稿工作台和普通视觉联系。
ContentGroup Mode 负责把 ContentGroup / Petal 的知识关系显化出来。
```

因此，普通 Canvas Mode 里的箭头不应该自动具有 Relation 含义。
它可以只是用户画出来的视觉联系、强调、流程提示或临时布局痕迹。

真正带有知识关系含义的箭头，应当放到 ContentGroup Mode 里处理。

在 ContentGroup Mode 中，endpoint 不应该是任意 block / image / shape。
当前更稳定的边界是：

- ContentGroup 与 ContentGroup 之间可以建立 Relation；
- Petal 与 Petal 之间可以建立 Relation；
- 如果某个 block、图片、公式、表格想参与 Relation，应该先被放入 ContentGroup / Petal；
- 即使一个 ContentGroup 里只有一个 item，它也可以作为 Relation endpoint 的容器。

这样可以避免一个问题：

```text
Canvas 上随手画的一根线，不会污染知识图谱。
只有进入 ContentGroup Mode 后，用户才是在操作知识关系。
```

进一步说，在 ContentGroup Mode 中，用户或 AI 新画出的关系箭头也不应该立刻成为 confirmed Relation。
它更适合作为一种 `RelationProposal` 存在。

原因是：

- 画线是轻量动作；
- 确认知识关系是重动作；
- AI 生成的关系本来也应该经过用户确认；
- 用户自己画出的关系也可能只是“我觉得这里可能有关联”；
- proposal 机制符合 Coincides 一贯的 accept / reject 工作流。

因此当前暂定规则是：

```text
Canvas Mode 不生产 Relation。
ContentGroup Mode 生产 RelationProposal。
RelationProposal 被确认后，才生成真正的 Relation。
```

`RelationProposal` 可以先具备这些字段：

- `relationProposalId`
- `fromEndpoint`
- `toEndpoint`
- `proposedRelationType?`
- `rationale?`
- `evidence?`
- `createdBy: user | ai`
- `status: proposed | accepted | rejected`
- `confirmedRelationId?`

confirmed `Relation` 则应当是 graph truth，而不是视觉箭头本体。
它可以具备：

- `fromEndpoint`
- `toEndpoint`
- `relationType`
- `evidence`
- `confirmedBy`
- `createdFromProposalId?`

这意味着：

```text
Relation 是数据真相。
ContentGroup Mode 中的箭头是 Relation / RelationProposal 的视觉投影。
Canvas Mode 中的箭头是普通 CanvasObject，不进入知识图谱。
```

是否允许 ContentGroup Mode 里存在纯装饰箭头，暂时倾向于不要。
如果用户只是想画装饰箭头，应回到 Canvas Mode。
这样 ContentGroup Mode 的心智会更干净：

```text
进入这个模式，就是在整理知识关系。
```

## 16. 主线自研，旁线研究成熟画布源码

进一步讨论后形成的新判断：

```text
Coincides Canvas Engine 主线应倾向自研。
Excalidraw / tldraw 可以 clone 到本地细读源码，作为成熟画布工具的参考样本。
```

原因不是“自研更酷”，而是 Coincides 的目标比较特殊：

- TextFlow 是内容真相；
- Block 是可编辑内容单元；
- PageFrame 是纸面和导出边界；
- ContentGroup 是知识复用包；
- CanvasObject / CanvasPlacement 要被 AI 读取；
- AI 未来可能直接操作画布并产生可回放动作；
- PageFrame、ContentGroup projection、AI-readable Canvas 都不是普通白板引擎的默认目标。

外部画布引擎越完整，它自己的世界观越强。
Coincides 越特殊，深度融合的隐藏代价越高。

因此当前更稳的路线是：

```text
主线：自研可扩展有限画布引擎。
旁线：研究 Excalidraw / tldraw 源码，学习成熟实现。
```

研究成熟画布源码的目标不是直接接入，而是回答：

- scene / element 数据结构如何设计；
- hit testing 如何实现；
- selection / transform / resize / rotate 如何实现；
- viewport / zoom / pan 如何处理坐标转换；
- arrow binding 如何跟随对象移动；
- free draw / ink stroke 如何保存和渲染；
- undo / redo / history 如何组织；
- export 如何把元素组合成 SVG / PNG / PDF；
- 哪些设计适合翻译成 Coincides 自己的 Canvas Engine；
- 哪些设计因为 TextFlow / PageFrame / AI-readable 目标不同而不能照搬。

本地可以借助 codegraph 研究这些仓库，例如：

```text
arrow binding 是怎么工作的？
hit testing 的入口在哪里？
scene elements 的数据结构是什么？
selection resize 如何改元素？
undo redo 如何记录？
free draw 的 stroke 数据结构是什么？
```

当前原则：

```text
不闭门造车，也不把自己的系统交出去。
成熟画布工具用于学习和对照，Coincides 的业务真相仍然由自己定义。
```

## 17. AI Canvas Performance / AI Action Playback

今天还衍生出一个未来能力方向：

```text
AI 的结果不只是一次性吐出文本，而是可以被空间化、过程化地呈现出来。
```

可能的表现：

- AI 生成内容后，在 PageFrame 或 CanvasObject 中逐字写出；
- AI 先放标题，再展开 definition / example / theorem；
- AI 一步一步把公式、解释、图像放到画布上；
- AI 把两个 ContentGroup 合并、拆分、移动到不同区域，并用动画展示过程；
- AI 创建 relation / arrow / evidence card，并让用户看到它如何组织知识；
- 用户可以回放、暂停、撤销、接受或拒绝 AI 的整理动作。

这类能力可以暂时称为：

```text
AI Canvas Performance
AI Action Playback
AI Spatial Writing
```

它短期不是主线，但它给 Canvas Engine 提出一个重要要求：

```text
Canvas 的重要变化最好都能表示成 command / action。
```

例如：

```ts
[
  { type: "createBlock", text: "Definition of convergence", at: { x: 120, y: 160 } },
  { type: "writeText", blockId: "b1", text: "A sequence converges if..." },
  { type: "createShape", shape: "arrow", from: "b1", to: "b2" },
  { type: "createContentGroup", fromBlocks: ["b1", "b2"], role: "definition" }
]
```

如果未来 Canvas Engine 有稳定 command log，就可以支持：

- AI 自动整理；
- 动画演示；
- 操作回放；
- 撤销 / 重做；
- 用户审批；
- 教学推导；
- 版本差异展示；
- AI 与人共同编辑一张知识画布。

这一方向让 AI 从“回答问题的人”升级为“会在工作台上操作材料的人”。

## 18. 当前暂定路线

这不是最终 plan，只是当前讨论中形成的临时路线：

```text
P0 当前自有有限画布引擎扶正
  world / viewport / coordinates / placement / page boundary / scratch workspace。

P1 PageFrame 精细化
  multi-page writing surface, export boundary, page chrome, page settings。

P2 CanvasObject / CanvasPlacement 协议
  id, type, position, size, zIndex, rotation, attachment, AI visibility, export role。

P3 TextFlow / Block attachment
  paragraph block inside shape, table block, image block, caption model。

P4 外部引擎源码研究
  clone Excalidraw / tldraw，使用 codegraph 阅读源码，提取可借鉴实现。

P5 ContentGroup projection
  ContentGroup / Petal / Member 如何作为 Canvas projection 使用。

P6 ContentGroup Mode / RelationProposal
  confirmed Relation 与 proposal arrow 如何在语义视图中显化和确认。

P7 AI Canvas Performance / Action Playback
  command log, AI action stream, animation playback, accept/reject workflow。

P8 其他 object families
  math graph, flowchart, video, 3D, data view, dashboard-like object。
```

## 19. 下一步问题清单

下一轮可以优先回答：

- Canvas 在 Better Notebook 中到底是什么？
- 有限画布引擎的最小正式模型是什么？
- 当前 runtime 如何从“模拟”升级成正式引擎？
- `CanvasWorld / CanvasViewport / CanvasPlacement / CanvasObjectProjection` 是否需要独立实体？
- PageFrame 如何从 primary frame 升级成多 PageFrame 系统？
- PageFrame 与普通 CanvasObject 的共同字段和差异字段是什么？
- TextFlowBlock 如何挂载进 ShapeObject？
- Table / Image 的第一版对象模型是否必须进入 8.8？
- Excalidraw 实验场是否值得单开 repo？
- 如果开实验场，实验成功 / 失败的判定标准是什么？
- 是否需要同时 clone Excalidraw 和 tldraw 做源码对照研究？
- Canvas command / action log 是否应该从 8.8 一开始就预留？
- ContentGroup Mode 的 RelationProposal 第一版是否需要进入 8.8，还是先只在 contract 中预留？

## 20. 当前最稳定的结论

今天最稳定的结论是：

```text
Canvas 的核心不是“无限”，而是“可扩展的有限空间”。

Coincides 不应该急着接入一个完整白板产品作为底座。
更合理的是先把当前自有有限画布引擎扶正。

外部画布引擎可以作为实验方向，但只能被用作交互能力来源，
不能成为 TextFlow / Block / PageFrame / ContentGroup 的业务真相。

更进一步说，当前更倾向主线自研，
同时 clone Excalidraw / tldraw 做源码研究和实现参考。
```
