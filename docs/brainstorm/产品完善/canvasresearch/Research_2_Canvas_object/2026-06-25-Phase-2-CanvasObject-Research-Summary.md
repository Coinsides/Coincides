# 第二阶段调研总结：CanvasObject 与 AI-readable 操作边界

status: stage-2 summary
date: 2026-06-25 America/Toronto
folder: `Research_2_Canvas_object`

## 1. 阶段二完成了什么

第二阶段围绕一个核心问题展开：

```text
CanvasObject 究竟应该是什么？
```

这一阶段没有写 8.8 实现计划，也没有决定最终数据库 schema。它完成的是前置判断：通过成熟产品、开源源码、Accessibility Tree / UI parsing 和当前 Coincides 工程，反推 CanvasObject、Canvas AI Tree、Agent 操作边界的第一版草案。

本阶段产出 6 篇正文和 1 篇总结：

| 编号 | 文档 | 作用 |
| --- | --- | --- |
| 06 | CanvasObject 调研方法与评分标准 | 定义查什么、怎么评分、哪些方向拒绝 |
| 07 | 成熟产品行为拆解 | 拆 Miro / Whimsical / XMind 的 AI diagram / document / selection context |
| 08 | 开源源码候选筛选 | 筛 Excalidraw / xyflow / Mermaid / Markmap 的源码学习价值 |
| 09 | Accessibility Tree / UI Parsing / Canvas AI Tree 调研 | 反推 AI-readable layout 和 Canvas AI Tree |
| 10 | Coincides 当前边界盘点 | 明确 Block / CanvasObject / PageFrame / ContentGroup projection 的边界 |
| 11 | CanvasObject Contract Draft v0 | 写出可供阶段三继续讨论的合同草案 |

## 2. 已稳定的核心判断

### 2.1 Canvas 在 Coincides 中有四重角色

```text
Canvas = whiteboard + page system + spatial organization layer + AI-readable layout
```

它不是 TextFlow 的替代品，也不是 ContentGroup 的替代品。

最终三层真相仍然是：

```text
TextFlow = 内容真相
ContentGroup = 知识结构真相
Canvas = 空间 / 布局真相
```

### 2.2 Block 不等于 CanvasObject

阶段二最关键的边界：

```text
Block 是内容对象。
CanvasObject 是空间对象。
```

很多 CanvasObject 可以是 `block-backed`，但不是所有 CanvasObject 都应该强行变成 Block。

例如：

- paragraph block 是内容对象；
- paragraph block 在画布上的出现是 projection / placement；
- 纯矩形是 pure visual CanvasObject；
- 矩形里填文字，是 shape 挂载 paragraph block；
- paragraph block 加背景 / 边框，是 styled block projection；
- PageFrame 是特殊 CanvasObject / page system root；
- ContentGroup tile 是 ContentGroup projection，不是普通 block。

### 2.3 AI 产物不能主要落成图片

Miro、Whimsical、XMind 都指向一个趋势：

```text
AI 产物要能回到工作台，并继续被编辑。
```

Coincides 因此不接受把 AI 生成流程图主要落成不可编辑图片。图片可以作为预览、导出或临时 artifact，但不应成为主产物。

对 Coincides 来讲，合理的 AI 产物形态包括：

- PageFrame 内的 paragraph blocks；
- structured document object；
- editable diagram nodes / edges；
- mind map structure；
- ContentGroup proposal / projection；
- CanvasProposal。

### 2.4 Canvas AI Tree 应是派生快照

Canvas AI Tree 不应该是数据库真相。它应从以下数据派生：

- CanvasObject；
- CanvasPlacement；
- PageFrame；
- Block / TextFlow；
- ContentGroup；
- structured object data；
- runtime layout measurement。

它用于 AI 读取和测试，不直接作为业务写入对象。

### 2.5 Agent 应通过 proposal / command 边界写入

Agent 可以读取 Canvas AI Tree，但不应直接写数据库。

推荐边界：

```text
Canvas AI Tree Snapshot
  -> Agent reads
  -> CanvasProposal
  -> user review / policy check
  -> CanvasCommand
  -> durable truth updates
  -> snapshot regenerates
```

这符合 Coincides 一贯的 AI proposal 思路。

## 3. 成熟产品给出的启发

### 3.1 Miro

Miro 证明 selection context 很重要。AI 可以读取 board content，并把结果生成 Doc、diagram、sticky notes、table、timeline 等。

对 Coincides 的启发：

- 选中对象要能形成 AI-readable context；
- Doc 类产物更接近 PageFrame / paragraph blocks；
- 聚类可以变成 ContentGroup proposal；
- board / document 之间的同步关系提醒我们必须区分 reference、duplicate、fork、materialize。

### 3.2 Whimsical

Whimsical 的启发是 editable diagram 体验。

对 Coincides 的启发：

- AI-generated diagram 不能只是图片；
- diagram 应保留节点、边、文本和布局；
- 未来如果有 diagram object，应该是 structured object family。

### 3.3 XMind

XMind 的启发是 structured mind map。它把材料整理成可继续编辑的思维结构。

对 Coincides 的启发：

- TextFlow / ContentGroup 可以投影成 mind map；
- mind map 的布局不是知识真相本身；
- 节点结构需要独立 `structure_data`。

## 4. 开源源码给出的启发

### 4.1 Excalidraw

适合学习：

- element fields；
- scene / appState / files；
- binding / boundElements；
- frame / group；
- export；
- delta / history。

不能照搬：

- text element；
- scene truth；
- frame model；
- `isDeleted` 策略；
- store。

### 4.2 xyflow / React Flow

适合学习：

- node / edge / handle；
- sourceHandle / targetHandle；
- interactionWidth；
- ariaLabel / ariaRole / focusable；
- parent node / extent / measured bounds。

这是第一批源码里对 diagram object 最有价值的样本。

### 4.3 Mermaid

适合学习：

```text
diagram text -> parser -> db -> renderer -> SVG
```

它适合作为 diagram proposal / import / export 参考，不适合作为可编辑画布内核。

### 4.4 Markmap

适合学习：

```text
Markdown / HTML -> tree -> layout -> mind map
```

它提醒我们：空间布局可以从文本结构派生，而不一定总是用户手动摆放的原始 truth。

## 5. CanvasObject 草案的核心分层

阶段二建议把 CanvasObject 相关模型至少拆成：

```text
CanvasObject
  空间对象身份

CanvasPlacement
  某个对象在某个 canvas / PageFrame / workspace 的一次出现

ContentMount
  空间对象挂载内容对象的桥

StructuredObjectRef
  diagram / chart / math graph / 3D viewer 等结构化对象入口

Canvas AI Tree
  给 AI 读取的派生快照

CanvasProposal / CanvasCommand
  Agent 和用户改动的安全边界
```

这不是最终 schema，但它已经能避免一个危险：

```text
不要把空间、内容、结构、AI 快照、Agent 写入都塞到一个 CanvasObject 表里。
```

## 6. PageFrame 的优先级

PageFrame 是第一个必须精细化设计的 CanvasObject。

它承担：

- Page Mode 入口；
- primary frame；
- export boundary；
- page size；
- content inset；
- ruler / margin / snap reference；
- header / footer / page number；
- template / background；
- formal writing surface；
- 多 PageFrame 文档结构。

阶段三必须单独写 PageFrame 设计稿。不能把它作为普通 `kind = frame` 的对象顺手带过。

## 7. 需要留给第三阶段的问题

第三阶段应从“调研”转入“融合设计”，重点回答：

- `CanvasObject` 和 `CanvasPlacement` 是否从 8.8 第一阶段就独立；
- `ContentMount` 是正式实体，还是先放 metadata；
- `Canvas AI Tree` 是否需要独立服务；
- 第一版 Agent 是否只读，不写；
- PageFrame 精细化第一版要做到什么程度；
- shape / visual arrow / image / table 哪些进入 8.8 第一轮；
- diagram / mind map / math graph / chart 是否只留 contract；
- ContentGroup projection 是否进入 8.8，还是等 PageFrame / object 底座稳定后再做；
- ordinary visual arrow、RelationProposal、confirmed Relation 的三层边界如何进入未来 Relation workflow。

## 8. 对 8.8 的初步倾向

阶段二不写 plan，但已经能给出初步倾向：

1. 8.8 不应先追求大量 object family。
2. 8.8 应优先把 CanvasObject / CanvasPlacement / PageFrame / AI-readable snapshot 的底座做稳。
3. 第一批可考虑对象是 PageFrame、paragraph block projection、shape、visual arrow、image / table 的最小形态。
4. Diagram、mind map、math graph、chart、3D viewer、Raw Ink 的 AI interpretation 都应后置。
5. Agent 可以先围绕 snapshot / proposal 设计接口，不急着接完整 runtime。

## 9. 本阶段的最大收获

本阶段把一个容易发散的问题收束成了一个清晰判断：

```text
Coincides CanvasObject 不是“画布上的任何东西”的粗糙别名。
它应该是空间对象协议。
它通过 ContentMount 连接内容，通过 StructuredObjectRef 连接复杂结构，通过 Canvas AI Tree 被 AI 读取，通过 CanvasProposal / CanvasCommand 被 Agent 安全操作。
```

这个判断足以支撑阶段三继续写 Coincides Canvas 自研引擎设计稿和 PageFrame 精细化设计稿。

## 10. 阶段二文档索引

- `2026-06-25-06-CanvasObject-Research-Method-And-Scoring-Rubric.md`
- `2026-06-25-07-Mature-Product-AI-Diagram-Document-Selection-Context-Research.md`
- `2026-06-25-08-Open-Source-Canvas-Diagram-MindMap-Source-Candidate-Screening.md`
- `2026-06-25-09-Accessibility-Tree-UI-Parsing-Canvas-AI-Tree-Research.md`
- `2026-06-25-10-Coincides-Block-CanvasObject-PageFrame-Boundary-Inventory.md`
- `2026-06-25-11-CanvasObject-Contract-Draft-v0.md`
