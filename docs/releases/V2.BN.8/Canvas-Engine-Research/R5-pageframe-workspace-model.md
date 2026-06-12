# R5 - PageFrame / Workspace / NoteCanvas 模型

## 结论先行

V2.BN.8 应统一三个概念：

```text
NoteCanvas
  一篇 Note 的空间底座。

PageFrame
  NoteCanvas 内的主可导出页面区域。

Workspace
  PageFrame 外的自由思考区域。
```

不要把 Page、Canvas、Sketch Workspace 做成三个平行文档类型。它们的关系应该是：

```text
一篇 Note -> 一个 NoteCanvas -> 0 或 1 个主 PageFrame + surrounding Workspace
```

## 为什么要这样定义

Henry 对这个问题的产品判断已经很清晰：

- Page 是现实排版逻辑，适合 A4/PDF/分享/传播。
- Infinite Canvas 是理解与研究逻辑，适合自由铺陈、局部区域组织、思考延伸。
- Workspace 是 PageFrame 外的自由区域，保存尚未正式进入页面的想法。
- 用户将来可能从一开始创建无 PageFrame 的 canvas note，但 V2.BN.8 不做产品化。

因此，PageFrame 不应是一个独立页面容器，而应是 NoteCanvas 坐标系中的一个特殊区域。

## 第一版数据口径

```text
NoteCanvas
  id
  noteId
  coordinateSpace
  viewportDefaults
  primaryFrameId?

PageFrame
  id
  noteCanvasId
  x
  y
  width
  height
  preset
  exportable
  label

Workspace
  not a separate object in first version
  defined as NoteCanvas area outside PageFrame
```

第一版 Workspace 可以不建实体表，但要在概念上成立。否则后续 PageFrame 外 block 会被误认为“坏数据”或“超出页面的残余布局”。

## PageFrame 与 export

V2.BN.8 第一版只承诺：

```text
PageFrame 内 block = export candidate
PageFrame 外 block = workspace / scratch candidate
```

但不要在 engine 层直接决定 export truth。真实 export 状态仍由 block/export state 决定。

换句话说：

```text
PageFrame 是空间提示。
Export status 是产品状态。
二者相关，但不能互相替代。
```

## PageFrame 与 source / relation

PageFrame 不拥有 source truth，也不拥有 relation truth。它只影响可视区域和导出区域。

```text
SourceReference
  可以绑定 PageFrame 内或外的 block。

ObjectRelation
  可以连接 PageFrame 内外对象。

CanvasConnector
  只负责视觉连线。
```

## PageFrame 外 block 的第一版规则

V2.BN.8 第一版允许数据层保留 PageFrame 外 block，但 UI 可以先做保守：

- PageFrame 外 block 在 canvas mode 可见。
- Page mode 只显示 PageFrame 附近和必要 workspace 边界。
- 不把 workspace block 强行夹回 PageFrame。
- 不自动把 workspace block 排入 export。
- 未来可以通过用户操作把 workspace block 移入 PageFrame。

## 为什么不做多 Frame

多 Frame 很诱人，但会引入：

- frame list；
- frame naming；
- frame export order；
- block belongs-to-frame 判断；
- multi-frame selection；
- frame-level relation；
- presentation mode；
- AI repagination proposal。

这些都不是 V2.BN.8 第一版目标。第一版应该把一个主 PageFrame 做扎实。

## 关于 Page size

不要把 A4/A3/A2/A1 写死成当前重点。更准确的口径是：

```text
PageFrame preset = 接近现实排版/导出的固定区域规格。
```

第一版可以提供：

- A4 portrait；
- A4 landscape；
- full-width writing frame；
- custom size placeholder。

但可以先只实现一个默认主 PageFrame。

## Canvas precise switching 的未来方向

如果用户未来想把一个 canvas note 转换成 page note，或把 page note 转成 canvas note，不应直接原地强转。更成熟的路径是：

```text
duplicate note
  -> copy blocks / placements
  -> AI repagination proposal
  -> user review
  -> apply to new NoteCanvas
```

这属于未来，不进入 V2.BN.8 第一版。

## 第一版验收标准

V2.BN.8 engine sample 应满足：

- NoteCanvas 有统一坐标系。
- PageFrame 是坐标系内的固定区域。
- PageFrame 外可以存在 workspace 区域。
- PageFrame 外 block 不被强行夹回页面。
- PageFrame 内外切换不破坏 placement truth。
- viewport 可以看到 PageFrame 和周围 workspace。
