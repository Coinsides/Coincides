# 2026-06-25 04. Excalidraw Arrow / Line / Binding 视觉连线机制调研

status: phase-1 research
date: 2026-06-25 America/Toronto
scope: arrow, line, binding, endpoint, elbow arrow, linear editor, 对 Coincides Canvas 与 ContentGroup Mode 的边界启发

> 本文是 Coincides Canvas 第一阶段调研的第 4 份文档。它的重点不是把 Excalidraw 的箭头机制翻译成 Coincides Relation，而是学习成熟画布工具如何做“视觉连线”。Coincides 的语义 Relation 必须保留自己的边界。

## 1. 调研入口

重点文件：

```text
D:\Coinsides\v2.x\_research\excalidraw\packages\element\src\binding.ts
D:\Coinsides\v2.x\_research\excalidraw\packages\element\src\linearElementEditor.ts
D:\Coinsides\v2.x\_research\excalidraw\packages\element\src\elbowArrow.ts
D:\Coinsides\v2.x\_research\excalidraw\packages\element\src\types.ts
D:\Coinsides\v2.x\_research\excalidraw\packages\element\src\bounds.ts
D:\Coinsides\v2.x\_research\excalidraw\packages\element\src\collision.ts
```

Excalidraw 中，连线机制主要由三类能力组成：

```text
Linear Element
  line / arrow 的基础点列、宽高、角度、箭头样式

Binding
  arrow endpoint 与 bindable element 的绑定关系

Linear Element Editor
  端点、折点、中点、拖动、线段编辑、endpoint hit area
```

如果是 elbow arrow，还会进入：

```text
Elbow Arrow Router
  折线路径、heading、fixed segment、避让、端点方向
```

## 2. Line / Arrow 的基础数据

在 `types.ts` 中，line / arrow 都属于 linear element。

关键字段包括：

```text
type: "line" | "arrow"
points
startBinding
endBinding
startArrowhead
endArrowhead
```

其中：

- `points` 表示线段内部点列；
- 第一个点通常被规范化为 `[0, 0]`；
- element 自己仍然拥有 x / y / width / height / angle；
- arrow 可以有 start / end arrowhead；
- arrow 还可以是 elbowed；
- line 还可以有 polygon 相关字段。

这说明成熟画布工具不会把 arrow 简化成：

```text
fromObjectId + toObjectId
```

它至少需要保存：

- 线本体的位置；
- 点列；
- 端点形态；
- 箭头方向；
- 绑定信息；
- 编辑状态；
- 渲染风格。

对 Coincides 的启发：

```text
普通 Canvas arrow 首先应该是 CanvasObject 的一种。
它有自己的 geometry / points / style，而不是 Relation 的直接同义词。
```

## 3. Binding 的基础概念

`binding.ts` 里有几个关键常量和函数：

```text
BASE_BINDING_GAP
BASE_BINDING_GAP_ELBOW
BASE_ARROW_MIN_LENGTH
FOCUS_POINT_SIZE
maxBindingDistance_simple(zoom)
isBindingEnabled(appState)
bindOrUnbindBindingElement
bindOrUnbindBindingElementEdge
updateBoundElements
calculateFixedPointForElbowArrowBinding
calculateFixedPointForNonElbowArrowBinding
```

它解决的是：

```text
当箭头端点靠近某个对象时，
是否要吸附 / 绑定到这个对象；
对象移动、缩放、旋转后，
箭头端点如何跟着更新。
```

Binding 的典型数据包括：

```text
elementId
focus
gap
fixedPoint
```

其中 `fixedPoint` 很重要。

它不是简单记录屏幕坐标，而是记录端点在目标对象边界中的相对位置。这样目标对象移动、缩放、旋转时，箭头端点可以重新计算。

这对 Coincides 的视觉连线很有参考价值：

```text
arrow endpoint 不应该只保存绝对坐标。
如果它绑定对象，应该保存对象 id + 相对 anchor / fixedPoint / normal。
```

## 4. Binding Strategy：inside / orbit / skip

Excalidraw 里 binding 不是无脑绑定。

它会根据当前拖动、对象、端点和 app state 决定策略：

```text
mode: "inside" | "orbit" | "skip"
```

粗略理解：

- `inside`：端点落在对象内部或特定可绑定区域；
- `orbit`：端点在对象附近，按对象外沿吸附；
- `skip`：当前不做绑定；
- null/undefined：无有效绑定策略。

这说明 binding 是一种交互判断，而不是单纯数据关系。

Coincides 可以学习：

```text
用户拖动 arrow endpoint 时，
系统可以给出视觉候选绑定和 snap feedback。
```

但不能因此推出：

```text
用户拖出一根箭头 = 创建知识 Relation。
```

这两件事必须分开。

## 5. 对象移动后，箭头如何跟随

Excalidraw 的关键函数：

```text
updateBoundElements(changedElement, scene, options)
```

当一个 bindable element 变化时，系统会找到 bound arrows，然后更新它们的 endpoint。

这对 Coincides 的普通视觉箭头很重要。

未来如果用户在 Canvas Mode 中画了一个普通箭头连接两个 block 或 shape，那么：

- 被连接对象移动时，箭头应该跟随；
- 被连接对象 resize 时，箭头端点应该重新定位；
- 绑定对象删除时，箭头应该解绑或被删除；
- 绑定关系需要有自己的 integrity check；
- 绑定变化应该进入 CanvasCommand / CanvasDelta。

但是这仍然只属于视觉层：

```text
visual binding != semantic relation
```

## 6. Linear Element Editor：线条编辑不是单点拖动这么简单

`linearElementEditor.ts` 负责：

- 选中线条；
- 选中端点；
- 选中内部折点；
- hover point；
- segment midpoint；
- 添加中间点；
- 移动点；
- 拖动端点；
- 计算 handle size；
- 根据 zoom 调整命中区域；
- 处理 point normalization。

这说明第一版 Coincides 如果要做 arrow，最好不要一开始追求过度复杂。

最小版本可以只支持：

```text
straight arrow
  start point
  end point
  optional start binding
  optional end binding
  style
```

第二轮再支持：

- 中间折点；
- curved line；
- elbow arrow；
- 多段编辑；
- segment midpoint insert；
- arrow routing。

这样会更稳。

## 7. Elbow Arrow：成熟但很复杂

`elbowArrow.ts` 里包含大量路由逻辑：

- heading；
- AABB；
- fixedSegments；
- segment normalization；
- short segment removal；
- special endpoint；
- BASE_PADDING；
- path routing；
- 端点方向计算；
- 与对象 bounding box 的关系。

结论很简单：

```text
Elbow arrow 很有用，但不适合作为 Coincides Canvas 第一版连线基础。
```

第一版更适合：

- 直线箭头；
- 简单折线；
- endpoint binding；
- 对象移动后跟随；
- RelationProjection 只显示已有 relation 的简单视觉边。

Elbow routing 可以留到后续。

## 8. 命中测试：选中线条需要特殊逻辑

线条不是矩形对象。

Excalidraw 在 hit testing 中会处理：

- 点是否落在线条附近；
- point handle；
- segment handle；
- arrowhead；
- bounding box 粗筛；
- precise collision；
- zoom 下的 hit threshold；
- bound text；
- frame name 等特殊区域。

对 Coincides 的启发：

```text
CanvasObject 的 hit test 不能只靠 DOM bounding rect。
```

不同对象应该有自己的 hit test adapter：

```text
RectangleHitTest
TextBlockHitTest
ImageHitTest
ArrowHitTest
PageFrameHitTest
FreehandHitTest
ContentGroupProjectionHitTest
```

第一版可以先简单，但协议最好预留。

## 9. 普通 Canvas arrow 与 Relation 的边界

这是 Coincides 最需要警惕的地方。

Excalidraw 的 arrow 是视觉对象：

```text
arrow A connects rectangle B and ellipse C
```

这不意味着：

```text
B semantically causes C
```

Coincides 的 Relation 之前已经有更严格的边界：

```text
Relation endpoint 应该是 ContentGroup / Petal 等知识结构对象，
而不是任意一段画布内容。
```

因此应该分两套模式：

### 9.1 Canvas Mode

Canvas Mode 中的箭头是普通视觉对象。

它可以表示：

- 用户画的流程；
- 临时指示；
- 视觉强调；
- 版面组织；
- 草图关系；
- 手动连线；
- 教学示意。

但它默认不进入 Relation。

```text
Canvas Mode arrow = visual CanvasObject
```

### 9.2 ContentGroup Mode

ContentGroup Mode 中，用户看到的是 ContentGroup / Petal / Member 的知识结构视图。

这个视图中的连线可以是：

- 已存在 Relation 的投影；
- 用户拖拽创建的 RelationProposal；
- AI 建议的 RelationProposal；
- 用户确认后的 Relation。

```text
ContentGroup Mode arrow = RelationProjection / RelationProposalProjection
```

这里的箭头才可能有语义。

## 10. RelationProposal 的引入价值

前面讨论里已经形成一个重要想法：

```text
用户或 AI 不一定一开始就创建确定 Relation。
可以先创建 proposal。
```

在 ContentGroup Mode 里，用户拖出一条关系线时，它可以先是：

```text
RelationProposal
```

状态可能包括：

- draft；
- pending_ai_review；
- suggested；
- accepted；
- rejected；
- confirmed_relation。

这样可以保留用户的思考过程：

```text
我觉得 A 和 B 可能有关，
但我希望 AI 帮我判断它们到底是什么关系。
```

这和 Excalidraw binding 完全不是同一层东西。

Excalidraw binding 解决的是：

```text
线怎么粘在对象边上。
```

Coincides RelationProposal 解决的是：

```text
知识关系是否成立，以及是什么关系。
```

## 11. 对 Coincides 的翻译表

| Excalidraw 概念 | 原始职责 | Coincides 可学习点 | Coincides 边界 |
| --- | --- | --- | --- |
| line / arrow element | 视觉线条对象 | arrow 作为 CanvasObject 的基础形态 | 不等于 Relation |
| points | 线条点列 | 保存端点、折点、路径 | 第一版可先只做直线 |
| startBinding / endBinding | 端点绑定对象 | endpoint anchor / fixedPoint / normal | 只属于视觉绑定 |
| boundElements | 对象知道哪些线绑定自己 | 对象移动后更新箭头 | 不要混入知识关系 |
| fixedPoint | 端点相对对象边界的位置 | resize/rotate 后稳定跟随 | 需要翻译成自己的 anchor 模型 |
| linear editor | 线条点位编辑 | 端点拖动、折点编辑、命中区域 | 第一版不必全做 |
| elbow arrow | 自动折线路由 | 未来复杂图示/关系图可参考 | 不进第一版核心 |
| binding strategy | 交互时决定是否绑定 | snap feedback / candidate binding | 不产生 Relation |

## 12. Coincides 第一版普通箭头建议

这不是阶段二最终方案，只是阶段一材料清点后的保守建议。

第一版普通 Canvas arrow 可以考虑：

```text
CanvasObject(kind: "arrow")
  id
  canvasId
  style
  zIndex
  locked
  points: [start, end]
  startBinding?: CanvasEndpointBinding
  endBinding?: CanvasEndpointBinding
```

绑定可以是：

```text
CanvasEndpointBinding
  targetObjectId
  targetKind
  anchor
  fixedPoint
  gap
```

第一版只做：

- start/end endpoint；
- 直线；
- 可选箭头头部；
- 可选绑定；
- 对象移动后跟随；
- 删除对象时解绑或删除箭头；
- undo/redo 进入 CanvasCommand。

暂不做：

- elbow routing；
- 自动避让；
- 多点曲线；
- flowchart 专用连接器；
- 普通箭头自动转 Relation；
- relation runtime。

## 13. ContentGroup Mode 的连线建议

ContentGroup Mode 不应该复用普通 Canvas Mode 的全部逻辑。

它需要的是：

```text
KnowledgeRelationView
```

视图对象包括：

- ContentGroup node；
- Petal node；
- maybe Member node；
- Relation edge；
- RelationProposal edge；
- AI suggested edge；
- unresolved / rejected edge。

其中 edge 的视觉绘制可以学习 Excalidraw arrow，但数据真相应该来自：

```text
Relation / RelationProposal
```

而不是：

```text
CanvasObject(kind: "arrow")
```

所以更合理的分工是：

```text
Canvas Mode:
  CanvasArrowObject

ContentGroup Mode:
  RelationProjectionEdge
```

二者可以复用渲染和交互组件，但不能共用业务实体。

## 14. 阶段一结论

本轮连线调研的核心结论是：

```text
Excalidraw 的 arrow / binding 机制很适合学习视觉连接器，
但 Coincides 必须把 visual arrow 和 semantic relation 分开。
```

可学习：

- endpoint binding；
- fixedPoint；
- object move 后更新连线；
- hit testing；
- 端点编辑；
- binding strategy；
- line editor 的交互细节；
- 未来 elbow routing。

不可照搬：

- 把任意 arrow 当成 relation；
- 把所有 relation 端点降级成 canvas object；
- 把 ContentGroup/Petal 关系塞进普通视觉 binding；
- 第一版就追求复杂自动路由。

这份文档给第二阶段留下的问题是：

```text
Coincides Canvas 第一版普通 arrow 做到什么程度？
ContentGroup Mode 的 RelationProposal projection 是否只预留 contract，
还是进入 8.8 的轻量原型？
```

