# 07. 成熟产品行为拆解：AI Diagram / Document / Selection Context

status: stage-2 research
date: 2026-06-25 America/Toronto
scope: Miro, Whimsical, XMind

## 1. 调研结论先行

成熟产品给出的共同方向很清楚：

```text
AI 不是只在聊天框里输出文字。
AI 会使用画布上的选中对象作为上下文，并把结果重新物化为画布里的可编辑对象。
```

这对 Coincides 的启发是：未来 Agent 不应该只生成一段 Markdown 给用户粘贴，而应该能生成 `PageFrame` 内容、`paragraph block`、diagram object、ContentGroup projection、或者 proposal。关键不是“能生成”，而是生成后仍然保留结构、来源和可编辑性。

## 2. 产品行为矩阵

| 产品 | 输入方式 | AI 产物 | 是否强调可编辑 | 对 Coincides 的启发 |
| --- | --- | --- | --- | --- |
| Miro | prompt、选中 board content、context menu | Docs、diagrams / mindmap、tables、sticky notes、timeline、prototype 等 | Docs 明确是可编辑文档格式；board content 可作为上下文 | selection context -> proposal -> on-canvas materialization |
| Whimsical | prompt、AI mind map / flowchart 工具、MCP workspace 操作 | mind map、flowchart、diagram、wireframe | AI mind map 页面明确强调生成后像普通 diagram 一样可编辑 | 生成 diagram 不能是图片，应该是 editable nodes |
| XMind | chat、网页 / doc / PDF / video link、图片 | structured mind map、可继续扩展和编辑 | 强调 editable mind map、AI co-editing、reorganize | 结构化对象可以从外部材料生成，但仍要保持内部节点结构 |

## 3. Miro：board context 到 Doc / diagram / cluster

Miro 的关键点不是某一个具体功能，而是它把 canvas 变成 prompt context。

官方文档显示，Create with AI 支持多种 Formats，包括 diagram / mindmap、Docs、images、Kanban、sticky notes、tables、timeline 等；用户可以在 board 上选中内容作为 prompt context，Miro 会分析 board 的视觉元素。Miro Docs 文档还明确提到，可以使用 canvas 上的对象作为输入生成可编辑 summary、research report、product brief 等。

对 Coincides 的直接启发：

- 选中对象必须能形成 AI context，不只是复制一段文本；
- context 至少要包含对象内容、对象类型、bounds、所在 PageFrame / workspace、可见性；
- 生成结果最好落成 Coincides 原生对象，而不是临时图片；
- Doc 类产物在 Coincides 中更接近 `PageFrame` 内的 paragraph blocks / structured document object；
- diagram / mindmap 类产物更接近 structured object family，不应与普通视觉箭头混淆；
- clustered sticky notes 这类行为可以用 ContentGroup 或 ContentGroup proposal 表达。

Miro 也给出一个重要边界：它的 Docs 可以和 board 互相拖拽内容，diagram 拖入 Doc 后可能是 synced copy。这说明未来 Coincides 的“引用 / 同步 / 物化”必须分清楚，不能让一个 canvas object 的出现位置污染原始 truth。

## 4. Whimsical：可编辑 AI diagram 的产品心智

Whimsical 的 AI mind map 页面强调：输入 prompt 后生成 mind map，并且每个 AI mind map 都像普通 Whimsical diagram 一样可编辑。它还把 Boards、Diagrams、Flowcharts、Mind maps、Wireframes 放在同一个可视工作区生态里。

这对 Coincides 的意义很直接：

```text
AI 生成 diagram 的最低标准不是“看起来像图”，而是“还能继续作为图被编辑”。
```

如果 Coincides 以后让 Agent 生成流程图，有三种落地方式：

| 方式 | 是否接受 | 原因 |
| --- | --- | --- |
| 生成一张图片 | 不作为主路径 | 图片不可编辑，AI-readable 能力弱，来源和节点结构丢失 |
| 生成 Mermaid / diagram-as-code artifact | 可作为中间层 | 结构存在，但在 canvas 上不一定天然可编辑 |
| 生成 editable nodes / edges | 推荐主路径 | 最符合画布操作心智，也最适合 AI-readable layout |

Whimsical 的 MCP 工作区能力也值得记录。它说明成熟产品正在把可视工作区开放给 AI coding agents 读写。这不代表 Coincides 现在要接 Agent runtime，但说明 `CanvasObject` 从一开始就不应只是鼠标可操作对象，也要能通过命令或 proposal 被机器操作。

## 5. XMind：结构化 mind map 和外部材料输入

XMind AI 的价值不在白板，而在“结构化思维对象”。它把网页、文档、PDF、视频链接等输入转成 structured mind map，也支持从图片转 editable mind map，并允许 AI 扩展、解释、重组节点。

这对 Coincides 很有启发：

- AI 产物可以是一个 structured object，而不是一堆散落的 blocks；
- 外部 source material 可以被整理成结构化对象；
- 用户后续可以在对象内部继续编辑和扩展；
- mind map object 可以和 ContentGroup 形成桥接：节点可能来自 ContentGroup / Petal / Member，但 mind map 的空间布局不是知识真相本身；
- 这种对象天然需要 `structure_data`，不能只靠 pixels 或 screenshot。

对 Coincides 来讲，XMind 更像“未来 structured object family 的参考”，不是主画布引擎参考。

## 6. 对 Agent 操作边界的启发

成熟产品里常见的流程可以抽象为：

```text
用户选择对象
  -> AI 读取上下文
  -> AI 生成 proposal / draft
  -> 用户确认或继续 prompt
  -> 结果物化到 canvas / document / diagram
  -> 用户继续编辑
```

Coincides 不应该让 Agent 一上来直接写数据库。更合理的边界是：

- Agent 读取 `Canvas AI Tree`；
- Agent 生成 `CanvasProposal`；
- 用户确认后转成 `CanvasCommand`；
- `CanvasCommand` 再物化为 `CanvasObject`、`BlockPlacement`、`PageFrame content`、`ContentGroupProjection` 等；
- 每一步保留来源、上下文和可撤销记录。

这和当前 Coincides 的 proposal 传统是一致的：AI 先提出建议，用户确认后再实装。

## 7. 对 CanvasObject 的反推

成熟产品行为反推出以下最低要求：

### 7.1 CanvasObject 必须能被选中并进入 context

选中对象不只是 UI state。它必须能序列化成 AI 可读上下文：

```text
object id
object family
bounds
visible state
layer / zIndex
parent PageFrame / workspace
content reference
plain text or summary
source / provenance
interaction affordance
```

### 7.2 CanvasObject 不能只保存视觉

如果对象是 diagram、mind map、chart、table、Doc，它必须保留内部结构：

```text
visual projection != object truth
```

例如 diagram 的 truth 应该是 nodes / edges / layout / labels，而不是一张渲染后的图片。

### 7.3 Document 类产物应靠近 PageFrame / paragraph block

Miro Docs 给 Coincides 的启发是：正式文档生成不应该落成一个普通 TextBox。它更像：

- 一个 PageFrame；
- 或 PageFrame 内的一组 paragraph blocks；
- 或一个 future document object，但内部仍然挂载 TextFlow。

### 7.4 Diagram 类产物应靠近 structured object family

Flowchart、mind map、network graph 这类对象可以是 CanvasObject，但不是普通 paragraph block。它们应拥有：

- `structure_data`；
- `layout_data`；
- 节点和边的可寻址 id；
- 可选的 TextFlow / paragraph block mount；
- AI-readable snapshot；
- 与 Relation 明确隔离的 visual edge / semantic edge 边界。

## 8. Coincides 必须拒绝的误区

- 不把图片当作 AI diagram 的主产物。
- 不把外部产品的 Docs 直接等价为我们的 PageFrame。
- 不把 sticky notes 聚类直接等价为 ContentGroup；最多是 ContentGroup proposal。
- 不把 AI 对 board 的视觉理解直接当 truth；视觉理解只能辅助 snapshot。
- 不让普通 arrow 在 Canvas Mode 中自动变成 Relation。
- 不让 Agent 跳过 proposal 和 command 边界。

## 9. 阶段三需要继续追问

- `CanvasProposal` 是否应该成为 8.8 的正式合同？
- `CanvasCommand` 是否从第一版就建立？
- Agent 生成 PageFrame 文档时，物化结果应该是多个 paragraph blocks，还是单个 document object？
- Diagram object 的第一版是否只支持 nodes / edges / labels，不支持复杂样式？
- Miro 这类 “Doc Focus Mode” 是否对应 Coincides 的 Page Mode？

## 10. 参考来源

- Miro Create with AI: https://help.miro.com/hc/en-us/articles/20164358139794-Create-with-AI
- Miro Docs: https://help.miro.com/hc/en-us/articles/20164660410898-Docs-in-Miro
- Whimsical AI: https://whimsical.com/ai
- Whimsical AI mind maps: https://whimsical.com/ai/ai-mind-maps
- XMind AI: https://xmind.com/ai
