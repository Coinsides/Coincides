# R7 - CanvasObject 与 Drawing 能力预留

## 结论先行

V2.BN.8 不做完整 drawing tool，但必须在数据和 engine 里预留 `CanvasObject`。原因是 workspace 的意义不只是放置 NoteBlock，它未来也要承载：

- 手绘草稿；
- 图形；
- 箭头；
- 图片标注；
- region selection；
- AI 可读取的草图区域；
- frame 外 sticky/scratch 内容；
- relation visual helper。

如果不预留，后面会被迫把这些东西塞进 NoteBlock，导致 content truth 和 canvas object truth 混乱。

## NoteBlock 和 CanvasObject 的区别

```text
NoteBlock
  笔记内容单位。
  可被 source、relation、template、AI、export 理解。

CanvasObject
  画布对象单位。
  可以是 shape、freehand、region、connector sketch、image annotation。
  不默认等于笔记内容，不默认进入 export，不默认进入 AI context。
```

## 第一版 CanvasObject 最小定义

V2.BN.8 不必建完整 UI，但数据合同应预留：

```text
CanvasObject
  id
  noteCanvasId
  kind
  x
  y
  width
  height
  rotation
  zIndex
  style
  payload
  visibility
  exportPolicy
  aiVisibility
```

其中 `kind` 可先列：

```text
shape
freehand
image
region
connectorDraft
stickyFuture
```

## 为什么 rotation 要现在预留

Henry 已经指出 layout truth 不能只有 x/y/width/height，还要考虑 rotation。即使 V2.BN.8 第一版不实现旋转 UI，也应在数据结构与坐标转换中不排斥 rotation。

对于 NoteBlock placement，也应预留：

```text
rotation?: number
```

第一版可以固定为 0。

## Drawing tool 暂不做的原因

完整 drawing tool 会带来：

- pen/eraser；
- pressure；
- stroke smoothing；
- shape recognition；
- lasso；
- grouping；
- z-index；
- export；
- undo/redo；
- touch/iPad；
- AI 读图。

这会把 V2.BN.8 拖成另一个大项目。第一版只做 engine 预留。

## AI 读取草图的未来方向

用户未来可能会在 workspace 画数学图、结构图、案件推理图，然后问 AI “我画的这个怎么样”。这要求系统能把某个区域打包成：

```text
CanvasRegionSnapshot
  image/crop
  contained NoteBlocks
  contained CanvasObjects
  nearby SourceReferences
  nearby Relations
```

这属于未来 AI/Source/Relation 阶段，不进入 V2.BN.8。

## 对第一版 engine 的要求

V2.BN.8 只需要：

- `CanvasObject` contract placeholder；
- canvas object layer placeholder；
- region selection future note；
- coordinate transform 能处理 object rect；
- z-index 分层不阻断未来对象。

## 不要做的事

- 不要把 freehand stroke 存进 NoteBlock。
- 不要把 CanvasObject 自动当作 ObjectRelation。
- 不要把 region selection 当作 source truth。
- 不要为了 sketch 提前引入 Konva/Fabric/Pixi。
