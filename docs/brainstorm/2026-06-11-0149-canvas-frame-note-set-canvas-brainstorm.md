# 2026-06-11 01:49 Toronto - Canvas Frame / Relation Layer / Note Set Canvas 脑洞会议记录

## 记录性质

这是一份脑洞会议记录，不是正式 Roadmap、PRD、Architecture 或 Data Model 决策。

本记录用于保留 2026-06-11 凌晨关于无限画布、Frame、Relation 显示层、性能策略和 Note Set Canvas 的探索性想法。后续如果要进入正式产品路线，需要再拆成 contract、roadmap phase、engineering spike 和性能验证任务。

## 触发问题

在讨论 AFFiNE / BlockSuite Edgeless 的时候，我们确认了一个关键模型：

```text
Infinite Canvas = 完整空间
Frame = Canvas 中被圈定的一块区域
PageFrame = 一种特殊 Frame，用于正式页面、PDF、打印、分享和导出
CustomFrame = 用户自由框选的区域，用于图片导出、演示、卡片、局部总结
```

由此产生了一个新的方向：Coincides 不必把 A4/A5/A3 这类页面尺寸理解成整篇 note 的尺寸。它们可以只是 Canvas 内某个 `Frame` 的 preset。

## Frame 作为 Canvas 内的表达边界

未来用户可以在一张无限画布中放置多个 Frame。

可能的 Frame 类型：

- A4 / A5 / A3 / Letter 等固定页面 Frame；
- 用户自由绘制的 Custom Frame；
- 小卡片尺寸的局部总结 Frame；
- presentation / 演示路径 Frame；
- 临时截图 / 图片导出 Frame；
- 多个 Frame 组成的 Frame Set / Export Sequence。

这种模型下，用户可以只导出某一个 Frame，也可以选择多个 Frame 按顺序导出。

```text
Canvas
  -> Frame 1: A4 formal page
  -> Frame 2: custom card
  -> Frame 3: derivation workspace
  -> Frame 4: presentation step
```

Frame 不等于整篇笔记。Frame 是无限画布中被用户圈出来的表达边界。

## Relation 的三层模型

性能讨论中进一步确认：Relation 不能默认全量渲染。

可以把 relation 分成三层：

```text
Relation Truth
  两个对象之间是否存在关系，这是数据事实。

Relation View Layer
  哪些 relation 当前可见、属于哪一层、用什么样式显示，这是显示策略。

Relation Render Budget
  当前缩放级别、视野范围、筛选条件、性能预算决定渲染多少 relation。
```

重要判断：

- 两个 NoteBlock 之间存在 relation，是数据层事实；
- relation 是否显示出来，不改变 relation 是否存在；
- relation layer 更像 Photoshop / 地图图层，是显示层概念；
- 数据层不应该因为显示层关闭而丢失关系；
- 默认视图不显示所有 relation；
- 只有用户手动标记为可见的 relation，才适合在普通视图中作为箭头或线条显示；
- relation mode 可以显示更多关系，但也必须有层级、筛选和渲染预算。

## Frame / Block 的缩放折叠策略

当用户把视野拉得很远时，不应该继续渲染每个 Frame 内部的所有 block。

未来 Canvas Engine 应该支持类似地图或游戏引擎的 Level of Detail：

```text
近距离:
  渲染真实 block、文字、公式、图片、relation。

中距离:
  block 变成摘要卡片，Frame 显示标题、封面、统计和少量提示。

远距离:
  Frame 折叠成 tile / thumbnail / cover。
  不渲染内部 block。
  sticky note、relation、媒体只显示模糊提示或数量标记。

极远距离:
  只显示 note cluster / project map。
```

这可以制造一种“伪 3D”空间穿梭感，但本质上是缩放层级、封面、模糊渲染、占位图和懒加载。

## Note Set Canvas / Project Knowledge Map

进一步脑洞：Project 层级可以拥有一个更高层的笔记集画布。

传统入口：

```text
Project
  -> Note List
  -> Open Note
```

未来入口：

```text
Project
  -> List View
  -> Note Set Canvas / Project Knowledge Map
```

在 Note Set Canvas 中：

- 每一篇 note 可以表现为一个 Frame / tile / thumbnail；
- 用户靠近某个 note 后，才展开真实内容；
- note 外侧可以显示用户备注、sticky note、状态、未整理想法；
- 多篇 note 可以按主题、时间线、课程周次、研究阶段、案件线索或知识结构摆放；
- relation 可以跨 note 存在，但默认只显示局部或被筛选的关系；
- 这能让用户在一个 Project 内获得空间记忆，而不是只看线性列表。

这与当前模型并不冲突，而是形成两个层级：

```text
Note 内部:
  NoteCanvas + PageFrame + NoteBlocks

Project 层级:
  Note Set Canvas + note tiles / frames / clusters
```

## 性能直觉

如果一次性渲染一张无限画布中的上千个 block、图片、动图、视频、公式和 relation，必然会卡，严重时可能第一次加载直接崩溃。

因此未来 Canvas Engine 必须从第一天就考虑：

- viewport virtualization；
- spatial index；
- lazy loading；
- level of detail；
- relation visibility budget；
- media thumbnail / proxy；
- active block 才成为真实 editor；
- frame thumbnail / cover；
- zoom threshold；
- relation layer filters。

## 避免无限增殖的关系垃圾场

今晚进一步讨论了一个重要风险：Coincides 想让 note 和 note、block 和 block 之间产生联系，但不能把系统做成“无限增殖的关系垃圾场”。

如果一个 Project 里有很多 note，每篇 note 又有上百个 block，暴力判断所有 block-pair 是否存在关系，会产生近似 quadratic 的关系爆炸：

```text
N 个 block
-> N * (N - 1) / 2 个潜在 pair
```

一万个 block 就接近五千万个潜在 pair。再乘上 relation type、source、concept、AI 判断、token 成本和存储成本，这条路线不可接受。

因此未来 relation / GraphRAG 不能走“所有 block 互相比较，然后尽量多建边”的路线。

更合理的方向是：

```text
NoteBlock truth:
  保存内容本体。

Concept / Entity layer:
  作为跨 note 的轻量索引层。

ObjectRelation:
  保存用户确认过，或高置信、高价值的语义关系。

CandidateRelation:
  保存 AI 发现但尚未确认的候选关系。

Retrieval-time relation:
  查询时临时展开，用完可丢，或者进入低成本 cache。

Community / Cluster summary:
  对 Project、Topic、Concept cluster 做压缩摘要，供大范围检索和概览使用。
```

关键原则：

- 用户手动建立的 relation 是高价值 truth；
- AI 自动发现的 relation 默认是 proposal，不直接污染正式图；
- GraphRAG 适合发现、压缩、检索和生成候选，不适合把所有潜在关系永久写进 Coincides Core；
- relation 必须有 budget：每个 block、每种 relation type、每个视图层都应该有默认上限；
- relation 必须有 confidence、provenance、lifecycle 和 stale / deprecated / confirmed 等状态；
- 大范围问题先走 embedding / concept / cluster / summary 初筛，再进入局部 graph traversal；
- 新增 note 时应做 incremental update，不应和整个 Project 的所有 block 全量重算；
- 很多关系应该按需生成，而不是提前穷尽。

这和 Coincides 的定位一致：

```text
Coincides 是精加工信息处理中台。
它要保存人类确认过、可阅读、可解释、可复用的关系。
它不应该保存所有机器能幻想出来的潜在联系。
```

一句话：

```text
关系不是越多越好。
关系要有预算、有层级、有置信度、有确认机制。
```

## 与 Coincides 产品定位的关系

这个方向有潜力强化 Coincides 的核心定位：

```text
Coincides 不是单纯写文档。
Coincides 是让人类在复杂材料中建立可阅读、可导出、可追踪、可复用的知识表达空间。
```

Frame 可以服务正式表达。
Canvas 可以服务自由思考。
Relation 可以服务知识结构。
Note Set Canvas 可以服务项目级空间记忆。

## 暂不进入正式决策的内容

以下内容暂不写入 Roadmap / PRD / Architecture / Data Model：

- Frame Set / Export Sequence；
- Note Set Canvas；
- Project Knowledge Map；
- Frame-level thumbnail / cover 系统；
- relation render budget 的具体算法；
- relation budget 具体数值；
- CandidateRelation 的正式数据结构；
- Project-level community / cluster summary；
- GraphRAG incremental update pipeline；
- zoom threshold 具体数值；
- Project 层级无限画布；
- 跨 note 的空间式导览；
- 伪 3D 展示体验。

这些想法目前只作为后续 Canvas Engine / Relation / Project Navigation 的候选参考。

## 可以保留的关键句

```text
Page 是 Frame 的一种。
Frame 是 Canvas 上的表达边界。
Relation Truth 不等于 Relation Render。
AI 自动发现的关系默认是 proposal，不是 truth。
关系不是越多越好，关系要有预算、有层级、有置信度、有确认机制。
Project 可以有 Note Set Canvas，Note 内部可以有 NoteCanvas。
远处不是消失，而是折叠成更便宜的表达。
```
