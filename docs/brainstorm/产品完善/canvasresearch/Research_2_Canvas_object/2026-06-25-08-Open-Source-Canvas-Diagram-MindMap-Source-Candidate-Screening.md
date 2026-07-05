# 08. 开源 Canvas / Diagram / Mind Map 源码候选筛选

status: stage-2 research
date: 2026-06-25 America/Toronto
local research root: `D:\Coinsides\v2.x\_research`

## 1. 筛选结论

第一批源码调研保留四个主样本：

| 代码库 | 调研角色 | 结论 |
| --- | --- | --- |
| Excalidraw | 完整白板对象与交互内核 | 学习 scene / element / binding / export / history，不接管 Coincides truth |
| xyflow / React Flow | 可编辑 node-edge 引擎 | 学习 node / edge / handle / accessibility / reconnectable edge |
| Mermaid | diagram-as-code | 学习结构文本到图的 parser / db / renderer 分层，可作为 AI 中间表示参考 |
| Markmap | Markdown to mind map | 学习文本层级如何变成空间树和可折叠节点 |

四个仓库本地 license 均为 MIT，适合源码学习。当前不把任何一个库接入主工程。

最重要的边界：

```text
它们的 store / scene / node model 都不能成为 Coincides 的业务真相。
它们只能帮助我们设计 Coincides 自己的 CanvasObject、CanvasPlacement、Canvas AI Tree 和 structured object family。
```

## 2. 候选评分

| 代码库 | Editable model | AI-readable 启发 | TextFlow 兼容性 | PageFrame 启发 | 源码学习价值 | 总体定位 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Excalidraw | 4 | 3 | 2 | 3 | 5 | 白板内核参考 |
| xyflow / React Flow | 5 | 4 | 3 | 2 | 5 | 节点边对象参考 |
| Mermaid | 3 | 4 | 4 | 1 | 4 | diagram-as-code 参考 |
| Markmap | 3 | 4 | 5 | 1 | 4 | 文本结构到空间树参考 |

评分解释：

- Excalidraw 的交互成熟，但它有自己的文本元素和 scene truth，不能直接融进 TextFlow。
- xyflow 的 node / edge / handle 模型清楚，适合学习可编辑 diagram object。
- Mermaid 的强项是结构定义，不是交互编辑。
- Markmap 的强项是从文本结构生成 mind map，不是自由画布。

## 3. Excalidraw：完整白板对象，但不能成为 Coincides 根

本地路径：

```text
D:\Coinsides\v2.x\_research\excalidraw
```

Excalidraw 值得继续深读的点：

- element 最小字段：id、type、x、y、width、height、angle、style、opacity、version、index、isDeleted 等；
- scene / appState / files 的分层；
- frame / group / binding / boundElements 的关系；
- arrow 与 element binding；
- export 到图片 / SVG；
- undo / redo / delta / version；
- 手绘风格与普通 shape 的渲染分层。

当前已经看到的源码线索：

- `packages/element/src/binding.ts` 大量处理 `boundElements`、`frameId`、arrow binding；
- `packages/element/src/delta.ts` 处理 `isDeleted`、`boundElements`、增量；
- Excalidraw 文档支持 `customData`，说明 element 可以附加业务自定义信息，但这只能做扩展字段，不能让外部 element 成为 Coincides truth。

对 Coincides 的价值：

```text
学习白板 object 的几何字段、交互字段、绑定字段和导出流程。
```

必须拒绝：

- 不接管 Coincides 的 TextFlow；
- 不把 Excalidraw text element 变成我们的 paragraph block；
- 不把 Excalidraw scene 当作 NoteCanvas 数据库；
- 不把 `isDeleted` 这套协作 / 历史策略直接照搬到 ContentGroup / Block / CanvasObject；
- 不把 Excalidraw frame 等价为 PageFrame。

## 4. xyflow / React Flow：可编辑节点边的最强参考

本地路径：

```text
D:\Coinsides\v2.x\_research\xyflow
```

React Flow 官方 Node type 和本地源码里的 `NodeBase` 都体现了一个很清楚的 node model：

```text
id
position
data
sourcePosition / targetPosition
hidden / selected / dragging
draggable / selectable / connectable / deletable
width / height / measured
parentId
zIndex
extent / expandParent
ariaLabel
origin
handles
type
```

Edge model 也很清楚：

```text
id
type
source / target
sourceHandle / targetHandle
animated / hidden / selected
markerStart / markerEnd
zIndex
ariaLabel
interactionWidth
```

源码里还可以看到：

- `packages/system/src/types/nodes.ts`
- `packages/system/src/types/edges.ts`
- `packages/system/src/xyhandle/XYHandle.ts`
- `packages/system/src/utils/edges/positions.ts`
- `packages/react/src/components/NodeWrapper/index.tsx`
- `packages/react/src/components/EdgeWrapper/index.tsx`

对 Coincides 的价值：

- Diagram object 的 `nodes / edges / handles` 可以参考它；
- `sourceHandle / targetHandle` 可以帮助我们避免“箭头端点是什么”的混乱；
- `interactionWidth` 这种字段值得学习，细线条需要更大的命中区域；
- `ariaLabel / ariaRole / focusable` 对 Canvas AI Tree 有启发；
- parent node / extent / expandParent 可启发 PageFrame 内 object 约束和 ruler snapping。

必须拒绝：

- React Flow 的 node `data` 不能成为 Coincides 内容真相；
- 它的 width / height 测量策略不能直接取代我们的 PageFrame / paragraph block 测量；
- 它适合 flowgraph，不适合接管整个 note canvas；
- 普通 visual edge 仍不等于 Relation。

阶段三应该重点吸收：

```text
CanvasObjectHandle
VisualEdge
StructuredDiagramNode
StructuredDiagramEdge
focusable / ariaRole / ariaLabel
interactionBounds
```

## 5. Mermaid：结构定义优先，不是交互画布

本地路径：

```text
D:\Coinsides\v2.x\_research\mermaid
```

Mermaid 的关键启发是分层：

```text
diagram text
  -> detect type
  -> parser
  -> db
  -> renderer
  -> SVG
```

本地 `packages/mermaid/src/Diagram.ts` 中，`Diagram.fromText` 会检测 diagram type，取出对应的 `db / parser / renderer`，解析文本后再 render。这种结构对 Coincides 很有价值，因为它说明 diagram 可以有一个 text / DSL / structure truth，再渲染成视觉图。

对 Coincides 的价值：

- AI 生成 diagram 可以先生成中间结构，而不是直接生成像素；
- diagram-as-code 可以作为 proposal / import / export 格式；
- parser / db / renderer 分层可启发 structured object family；
- Mermaid 的 accessibility 文件也说明 diagram 渲染后可以补充 title / description / aria 信息。

必须拒绝：

- Mermaid 不是可编辑 canvas node 引擎；
- Mermaid 的文本定义不等于 TextFlow；
- Mermaid 的 SVG 产物不能成为最终 truth；
- 如果用户要在画布上拖节点，Mermaid 本身不能直接满足。

推荐定位：

```text
Mermaid 适合作为 diagram proposal 或导入导出格式参考；
不适合作为 Coincides diagram object 的主编辑内核。
```

## 6. Markmap：TextFlow / Markdown 到空间树的参考

本地路径：

```text
D:\Coinsides\v2.x\_research\markmap
```

Markmap 的核心路径是：

```text
Markdown content
  -> transform result
  -> root tree
  -> layout / render
  -> SVG mind map
```

本地源码线索：

- `packages/markmap-lib/src/types.ts` 定义 `ITransformContext`、`ITransformResult`、`root: IPureNode`；
- `packages/markmap-view/src/view.ts` 处理 `renderData`、fold、node state、zoom / pan；
- `packages/markmap-html-parser/src/index.ts` 处理 HTML / Markdown 节点到树结构。

对 Coincides 的价值：

- TextFlow / heading / list 可以投影成 mind map；
- ContentGroup / Petal 也可以投影成空间树；
- fold / expand / node state 可以参考；
- 从线性文本到空间组织的转换路径很适合 AI-readable layout；
- 它提醒我们：空间布局可以是派生结果，不一定总是用户手动摆放的原始 truth。

必须拒绝：

- Markmap 的 mind map tree 不能替代 ContentGroup；
- Markdown content 不能替代 TextFlow；
- SVG mind map 不能成为 CanvasObject truth；
- 它没有完整白板对象系统，不能接管 PageFrame / canvas object。

## 7. 第一批之后暂缓的候选

| 候选 | 暂缓原因 |
| --- | --- |
| diagram-js / bpmn-js | 适合 BPMN 领域，太强领域化，第二阶段不先读 |
| Mind Elixir | mind map 候选，但 Markmap 已覆盖第一轮文本到树 |
| diagrams.net / draw.io | 功能成熟但源码体量和集成复杂度较高，先留后 |
| tldraw | 功能强，但当前不作为接入候选；可后续只做对照研究 |
| Konva / Fabric / Pixi | 更偏渲染层，不直接回答业务对象边界 |

## 8. 对 CanvasObject 的直接反推

综合四个库，Coincides 的 CanvasObject 不应等于任何一个外部库的 element / node / shape。

更合理的分层是：

```text
CanvasObject
  空间身份、几何、可见性、层级、交互能力

CanvasPlacement
  这个对象在某个 note canvas / PageFrame / workspace 的出现位置

ContentMount
  它挂载的内容对象，例如 paragraph block、formula block、ContentGroup projection

StructureData
  diagram / mind map / chart 等结构化对象的内部结构

Canvas AI Tree Node
  给 AI 读取的派生快照，不一定持久化
```

这让我们避免两个危险：

- 把所有东西都变成 Block；
- 把所有东西都变成外部 canvas engine 的 shape。

## 9. 下一轮源码深读建议

阶段三前，如果需要继续源码深读，优先顺序建议：

1. xyflow 的 `NodeBase / EdgeBase / handle / accessibility / edge interaction`；
2. Excalidraw 的 `element / binding / frame / export / delta`；
3. Markmap 的 `transform -> tree -> renderData`；
4. Mermaid 的 `Diagram.fromText -> parser / db / renderer`。

## 10. 参考来源

- Excalidraw repo: `D:\Coinsides\v2.x\_research\excalidraw`
- xyflow repo: `D:\Coinsides\v2.x\_research\xyflow`
- Mermaid repo: `D:\Coinsides\v2.x\_research\mermaid`
- Markmap repo: `D:\Coinsides\v2.x\_research\markmap`
- Excalidraw API props: https://docs.excalidraw.com/docs/%40excalidraw/excalidraw/api/props
- React Flow Node type: https://reactflow.dev/api-reference/types/node
- React Flow Edge type: https://reactflow.dev/api-reference/types/edge
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html
- Markmap docs: https://markmap.js.org/
