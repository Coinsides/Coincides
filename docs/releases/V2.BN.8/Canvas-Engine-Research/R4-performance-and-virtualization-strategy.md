# R4 - 性能、可见区域与虚拟化策略

## 结论先行

Coincides 的性能风险不在第一版几十个 block，而在未来：

- 一篇 Note 可能有数百到数千个 NoteBlock；
- 每个 block 可能有 rich text、formula、code、image、table；
- relation 可能很多；
- workspace 可能放置大量 scratch 内容；
- 后续可能有图片、音频、视频、drawing、thumbnail、source crop。

因此 V2.BN.8 不能只做“能拖动的 DOM”。它必须从第一版就建立：

```text
viewport -> visible range -> measurement cache -> render window -> overlay sync
```

## 性能目标

### 第一版样本目标

第一版 engine sample 至少要在普通开发机上支持：

- 200 个轻量文本 block 可加载；
- 100 个 block 可拖动/选择不会明显掉帧；
- viewport pan/zoom 不导致编辑输入错位；
- block resize 后 measurement 可靠更新；
- overlay 不压住文本编辑；
- PageFrame 外 workspace 不把 PageFrame 内布局夹回去。

### 中期目标

V2.BN.8.x 之后应能支持：

- 1000+ block 的可视区域渲染；
- 不可见 block 不进入重交互层；
- relation 默认按 layer/visibility 懒加载；
- frame / note set 远视图只显示 preview/thumbnail。

## 外部证据

Fabric.js 官方 `skipOffscreen` 选项会基于 viewport 和对象坐标跳过不可见对象，官方说明这对 crowded canvas 与 zoom/pan 场景有帮助。

来源：

- https://fabricjs.com/api/classes/canvas/

React Flow 提供 `onlyRenderVisibleElements`，官方说明这可以只渲染 viewport 内可见 node/edge，但也会增加 overhead。

来源：

- https://reactflow.dev/api-reference/react-flow

MDN OffscreenCanvas 文档说明，OffscreenCanvas 可以把渲染工作从 DOM/主线程中解耦，并且可在 worker context 中运行部分渲染任务。

来源：

- https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas

## Coincides 的性能分层

### Layer 1: Truth data

```text
NoteBlock
BlockPlacement
SourceReference
ObjectRelation
TemplateDefinition
```

这些是 truth，不因 viewport 变化而增删。

### Layer 2: Measurement data

```text
blockId
contentHash
width
measuredHeight
lastMeasuredAt
needsMeasure
```

这是 runtime cache，不是 truth。它可丢、可重建。

### Layer 3: Visibility data

```text
viewportWorldRect
renderPadding
visibleBlockIds
nearbyBlockIds
culledBlockIds
```

这是 view state，不进入 canonical data。

### Layer 4: Overlay state

```text
selectedIds
activeControlBar
dragPreview
resizePreview
alignmentGuides
relationPreview
```

这是 UI state，不进入 Note truth。

## 推荐虚拟化策略

### 1. 不要先做复杂 virtualization library

V2.BN.8 第一版不需要引入复杂虚拟列表库，因为我们的对象是二维坐标，不是单列列表。应先实现自己的二维可见区域判断：

```text
blockRect intersects expandedViewportRect
```

### 2. PageFrame 内外统一世界坐标

不要把 PageFrame 内 block 和 workspace block 放到两个滚动系统里。它们都应有 world coordinate：

```text
world x/y
width/height
rotation
surface scope
```

PageFrame 只是一个特殊 area，不是另一个 layout engine。

### 3. 可见区域要带 buffer

如果只渲染 viewport 内对象，拖动和滚动会闪烁。应使用 expanded viewport：

```text
renderRect = viewportRect + 800px padding in world units
```

具体 padding 后续通过 benchmark 调整。

### 4. 选中对象永远渲染

即使 selected block 被拖到边界附近，也不要被 virtualization 卸载。规则：

```text
visible = intersects(renderRect) OR selected OR editing OR dragging OR resizing
```

### 5. 编辑对象永远 DOM 实体

正在编辑的 block 必须是真 DOM，不允许换成 preview texture。否则光标、IME、复制粘贴会出问题。

### 6. 远视图才允许降级

未来当 zoom 低于某阈值时：

```text
block -> lightweight rectangle / title label / thumbnail
frame -> thumbnail cover
relation -> hidden or aggregated
```

但 V2.BN.8 第一版只需要预留，不必实现完整 LOD。

## Relation 性能策略

Relation 默认不能全量显示。

第一版只预留：

- endpoint model；
- SVG layer；
- visible relation layer；
- manually visible relation；
- selected-neighborhood relation。

不要做：

- 全项目 relation 全量渲染；
- 所有 block 两两关系扫描；
- relation auto discovery。

## 图片/媒体策略

第一版 engine sample 不必做完整图片 block，但数据上要预留：

```text
media placeholder
intrinsic size
render size
thumbnail
loaded/unloaded state
```

未来对大图、视频、音频要做懒加载：

- viewport 外不解码；
- thumbnail 先显示；
- 用户靠近或选中时加载 full asset。

## Benchmark 建议

V2.BN.8 应该建立以下测试材料：

- 50 text blocks；
- 200 text blocks；
- 1000 lightweight blocks；
- 100 formula blocks；
- 50 wide blocks；
- 100 relation lines；
- PageFrame 内 80%、workspace 20%；
- long paragraph auto-resize case；
- pan/zoom + editing case。

记录指标：

- initial render time；
- pan FPS subjective；
- drag latency；
- resize latency；
- measurement update time；
- visible block count；
- DOM node count；
- memory snapshot；
- browser console errors。

## 对 V2.BN.8 的工程要求

第一版样本至少要包含：

```text
getVisibleBlocks(viewport, placements)
measureBlock(blockId)
invalidateMeasurement(blockId)
worldToScreen(point)
screenToWorld(point)
selected/render forced inclusion
```

这些函数应进入 engine 层，而不是散落在 NoteDetail 组件中。
