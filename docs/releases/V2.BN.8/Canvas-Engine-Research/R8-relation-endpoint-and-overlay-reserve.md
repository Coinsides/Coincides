# R8 - Relation Endpoint 与 Overlay 预留

## 结论先行

V2.BN.8 不做 relation runtime 的完整产品化，但必须给 relation endpoint 留位置。因为 Canvas Engine 一旦重做，如果没有端点、线层、命中、坐标转换预留，后续 V2.BN.9+ 做 relation 会再次推翻 canvas。

核心原则：

```text
Source provenance 不是 relation。
ObjectRelation 是语义关系。
CanvasConnector 是视觉连接。
RelationEndpoint 是连接在画布上的锚点。
```

## 为什么要预留 endpoint

用户已经明确提出：

- 一个 block 可能有多个连接点；
- 连接点不一定固定在四边中点；
- 用户可能想拖动连接点位置；
- 一个 block 可能向多个方向连线；
- relation 可见层和数据层要分开。

这意味着 endpoint 不能等到 relation 阶段再临时 patch。

## 第一版 endpoint 数据草案

V2.BN.8 可先只写 contract，不实现完整 UI：

```text
RelationEndpoint
  id
  ownerType: noteBlock | canvasObject | pageFrame | future
  ownerId
  anchorMode: normalized | side | absolute
  xRatio?
  yRatio?
  side?
  offsetX?
  offsetY?
  label?
  createdBy
```

建议第一版默认：

```text
anchorMode = normalized
xRatio / yRatio 表示端点在 owner bounds 内的位置
```

这样 block resize 后 endpoint 仍能跟随。

## CanvasConnector 与 ObjectRelation

### CanvasConnector

视觉层对象：

```text
fromEndpoint
toEndpoint
pathStyle
visible
layerId
labelPosition
```

它回答：

```text
这条线怎么显示？
```

### ObjectRelation

语义层对象：

```text
sourceObject
targetObject
relationType
relationGroup
directionality
confidence
lifecycle
```

它回答：

```text
这两个对象是什么关系？
```

二者可以一一对应，也可以没有对应关系：

- 用户画了一条视觉线，但不设语义 relation；
- 用户有语义 relation，但不默认显示视觉线；
- 多条 semantic relation 可以共用一个视觉 connector；
- 一个视觉 connector 可以只作为草稿。

## Layer 策略

Relation 显示必须分层：

```text
data layer
  all ObjectRelations

view layer
  visible relation set
  active relation group
  selected-neighborhood relation
  manually pinned relation
```

V2.BN.8 只需要预留 view layer，不实现全量 relation inspector。

## Overlay 技术路线

第一版 relation line 预留建议用 SVG：

- path / bezier 容易；
- endpoint marker 容易；
- hover/click hit area 可做；
- 和 DOM block 共享坐标转换；
- 不影响文本编辑。

React Flow 的 handle / edge / NodeResizer 是重要参考，但不应引入整个 React Flow 作为主 runtime。

来源：

- https://reactflow.dev/api-reference/react-flow
- https://reactflow.dev/api-reference/components/node-resizer

## 性能边界

Relation 不能全量渲染。规则建议：

```text
默认只显示 pinned/visible relation。
选中 block 时显示 selected-neighborhood relation。
Relation mode 中按 group/layer/filter 显示。
缩放过远时折叠或隐藏。
```

## V2.BN.8 应做什么

必须：

- 在 state/data contract 中预留 endpoint；
- overlay layer 支持未来 SVG line；
- block bounds / transform 可被 endpoint 查询；
- z-index / pointer-events 不阻断 relation handles；
- roadmap 中标明 V2.BN.9+ 承接。

不做：

- relation type runtime；
- relation inspector；
- local graph；
- GraphRAG adapter；
- auto relation discovery。
