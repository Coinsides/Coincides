# R6 - Selection / Drag / Resize / Overlay Runtime

## 结论先行

当前 V2.BN.5 的大量 patch 已经证明：如果没有统一 runtime，selection、drag、resize、overlay、control bar 会不断互相踩。V2.BN.8 必须把这些交互从 NoteDetail 组件里抽成 engine state machine。

第一版不要求华丽，但必须稳定。

## 当前问题复盘

前序版本出现过的问题包括：

- block 内容重排后 placement 高度不更新；
- resize 后下方 block overlap；
- formula input 展开后覆盖下方 block；
- preview panel 和 block control bar 图层混乱；
- slash menu 出现在错误位置；
- click 空白误创建 block；
- PageFrame 外 workspace block 被 page 模式夹回；
- snap alignment 和 elastic avoidance 触发边界不清；
- block toolbar 被相邻 block 遮挡。

这些不是单个 CSS bug，而是 runtime 边界不清。

## Runtime 状态分类

建议 V2.BN.8 明确以下状态：

```text
idle
hoveringBlock
selectedBlock
multiSelected
editingText
draggingBlock
resizingBlock
panningCanvas
openingMenu
previewing
connectingRelationFuture
```

每个状态要声明：

- pointer event 谁接管；
- keyboard event 谁接管；
- overlay 显示什么；
- measurement 是否暂停或立即更新；
- save/apply 是 optimistic 还是 on end；
- 是否允许创建 block。

## Selection 规则

### 单选

```text
click block -> selected
double click text field -> editing
click empty canvas -> deselect
esc -> deselect or exit editing
```

### 多选

V2.BN.8 第一版可以只保留数据预留，不强做完整多选：

```text
selectedIds: string[]
primarySelectedId?: string
```

多选的真实批量操作可留给后续版本。

## Drag 规则

拖动必须操作 placement truth，不直接操作内容 truth。

```text
dragStart
  snapshot original placements

dragMove
  update preview placement
  update overlay
  do not rewrite content

dragEnd
  commit placement
  invalidate affected measurement/collision if needed
```

第一版不应做过多 auto layout。弹性避让可以保留为辅助行为，但不能成为 placement correctness 的依赖。

## Resize 规则

resize 的目标是 block placement width/height，不是直接改文本内容。

```text
resize width
  -> content reflows
  -> measured height may change
  -> placement height must update
```

关键原则：

- 正在编辑的 block 不能被虚拟化卸载。
- resize 过程中可以显示 preview。
- resize end 后必须重新 measure。
- measurement 更新后不能让相邻 block overlap。

## Overlay 层规则

Overlay 不应该存在于 block DOM 内部，否则容易被 overflow、transform、z-index、相邻 block 遮挡影响。

推荐：

```text
CanvasOverlayRoot
  selection outline
  resize handles
  control bar
  slash menu
  preview panel
  alignment guide
  future relation endpoint
```

每个 overlay 都通过 world/screen 坐标转换定位。

## Control Bar

Block control bar 是上下文工具条，不是 block 内容的一部分。

第一版建议命名：

```text
BlockControlBar
```

规则：

- 默认出现在 selected block 附近。
- 如果上方空间不足，可自动翻到下方或侧边。
- 不参与 block 高度测量。
- 不遮挡当前编辑文字。
- 不因相邻 block 紧贴而不可点击。

## Slash Menu

Slash menu 必须 anchored 到 caret / active block，而不是页面顶部或 block 列表顶部。

规则：

```text
activeBlockId
caretRect or fallback blockRect
menuPosition = screen(caretRect)
```

如果拿不到 caretRect，才使用 block 左下角作为 fallback。

## Preview Panel

Preview panel 是全局 overlay，不属于 block control bar。

规则：

- panel 打开时，它的 z-index 高于 block overlay；
- panel 内开关状态持久到当前 NoteDetail session；
- panel 不改变 content/layout truth；
- panel 展示的是 label overlay / export / AI visibility 等视图状态。

## 第一版 engine API 建议

```text
selectBlock(blockId)
deselectAll()
startDrag(blockId, pointer)
updateDrag(pointer)
endDrag()
startResize(blockId, handle, pointer)
updateResize(pointer)
endResize()
openOverlay(kind, anchor)
closeOverlay(kind)
measureBlock(blockId)
invalidateBlockMeasurement(blockId)
```

这些函数可以先是前端 runtime 函数，不一定立刻进入后端数据模型。

## V2.BN.8 验收重点

1. 拖动和 resize 不导致文本脱离 block。
2. formula input 展开后不覆盖下方 block。
3. block control bar 不被相邻 block 遮挡。
4. slash menu 定位跟随当前 block。
5. preview panel 不和 block overlay 打架。
6. click empty canvas 可稳定取消选中。
