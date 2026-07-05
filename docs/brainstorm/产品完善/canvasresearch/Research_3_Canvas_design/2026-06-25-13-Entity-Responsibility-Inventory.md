# 2026-06-25 - Entity Responsibility Inventory

> 目标：回答“一个画布对象背后到底有哪些表 / 层 / 责任”。尤其是独立 Block、PageFrame、shape、ContentGroup projection 等对象，不能混成一个大字段，否则后续 Agent、AI-readable layout、复用和导出都会变得混乱。

## 0. 三条真相

阶段三沿用并固定三条真相：

1. TextFlow = 内容真相。
2. ContentGroup = 知识结构真相。
3. Canvas = 空间 / 布局真相。

Canvas 不取代 TextFlow，也不取代 ContentGroup。Canvas 负责说明“东西在哪里、占多大、如何排列、如何呈现、如何被看见”。

## 1. Entity / Layer 分工

| 层 | 责任 | 是否 durable truth | 说明 |
| --- | --- | --- | --- |
| NoteCanvas | 一篇 note 的画布根实体 | 是 | 保存 canvasId、noteId、world size、mode defaults、primaryFrameId。 |
| CanvasObject | 空间对象身份 | 是 | 说明对象是什么类型，是否 block-backed，是否 structured object。 |
| CanvasPlacement | 对象出现在哪里 | 是 | 保存 x/y/width/height/rotation/zIndex/surface/frameId/boundary。 |
| ContentMount | CanvasObject 挂载的内容 | 是 | 连接 CanvasObject 与 NoteBlock / ContentGroup / Asset / StructuredObject。 |
| PageFrameExtension | PageFrame 特有配置 | 是 | page size、content inset、ruler、header/footer、page number、template。 |
| NoteBlock | 内容 block | 是 | 继续承载 paragraph / formula / code / table 等内容。 |
| TextFlow | 文本内容结构 | 是 | paragraph block 内部文本与 inline structure。 |
| VisualStyle | 外观样式 | 是或半独立 | 背景、边框、阴影、颜色、字体比例、shape appearance。 |
| Asset | 文件资源 | 是 | 图片、视频、3D 模型、PDF preview 等。 |
| StructuredObject | 结构化对象数据 | 是 | table、chart、math graph、diagram 等内部数据。 |
| VisualConnector | 普通视觉连线 | 是 | 仅表达视觉连接，不等于 Relation。 |
| KnowledgeRelation | 知识关系 | 是 | 后续 Relation / GraphRAG 版本，不属于普通 Canvas v1。 |
| CanvasAIReadableSnapshot | 派生快照 | 否 | 给 AI 读取的树 / 列表，由 durable truth 生成。 |
| CanvasProposal | 待确认变更 | 否或短期持久 | AI 或用户草稿操作的提案，不直接污染真相。 |
| CanvasCommand / Delta | 操作记录 | 是或日志 | 用于 undo/redo、审计、协作准备。 |

## 2. 对象背后的表：以独立 Block 为例

一个“独立放在 Canvas 上的 paragraph block”至少涉及四层：

1. `NoteBlock`：保存 block 内容。
2. `TextFlow` / `content_json`：保存内部文字、inline formula、inline link 等。
3. `CanvasObject`：保存它作为画布对象的身份。
4. `CanvasPlacement`：保存它在画布上的位置、尺寸、层级、是否在 PageFrame 内。

如果用户给这个 block 加边框、背景、圆角，它还会涉及：

5. `VisualStyle`：保存外观，不把外观塞进 TextFlow。

如果未来 AI 读取它：

6. `CanvasAIReadableSnapshot`：派生出 bbox、plain text、visible state、page affiliation、reading order hint。

所以，一个独立 Block 背后不是“一张表”，而是一组职责明确的表 / 层。最小成熟形态是：

```text
NoteBlock / TextFlow
  <- ContentMount
CanvasObject
  <- CanvasPlacement
  <- VisualStyle
  -> CanvasAIReadableSnapshot (derived)
```

## 3. 典型对象责任表

| 场景 | 内容真相 | 空间真相 | 外观真相 | AI 读取来源 | 备注 |
| --- | --- | --- | --- | --- | --- |
| PageFrame | PageFrameExtension + mounted blocks | CanvasObject + CanvasPlacement | PageFrame template / background | snapshot 中的 frame node | 第一特殊 CanvasObject。 |
| 普通 paragraph block | NoteBlock / TextFlow | CanvasObject + CanvasPlacement | VisualStyle | block text + bbox | Canvas 只负责放置，不改写文本真相。 |
| 纯矩形 | 无内容真相 | CanvasObject + CanvasPlacement | VisualStyle | bbox + role + style | 纯视觉对象。 |
| 矩形填文字 | NoteBlock / TextFlow | CanvasObject + CanvasPlacement | Shape VisualStyle | text + bbox + shape role | shape 升格为 block-backed CanvasObject。 |
| 文字删空后的矩形 | 无或 detached mount | CanvasObject + CanvasPlacement | VisualStyle | bbox + style | 应退回纯 CanvasObject，避免空 block 垃圾。 |
| styled paragraph block | NoteBlock / TextFlow | CanvasObject + CanvasPlacement | VisualStyle | text + bbox + style | 不是 block 升格为 shape，而是 block projection 获得样式。 |
| 图片 | Asset + optional caption block | CanvasObject + CanvasPlacement | image display style | alt / caption / bbox | image block 和 inline image 后续分清。 |
| 表格 | StructuredObject 或 table block | CanvasObject + CanvasPlacement | table style | cells + bbox | 不应只存为图片。 |
| 普通箭头 | VisualConnector | connector geometry | line style | connector endpoints as visual hints | 默认不等于 Relation。 |
| Relation edge | KnowledgeRelation | ContentGroup Mode projection | relation style | relation endpoint truth | 后续 Relation 版本。 |
| ContentGroup tile | ContentGroup | CanvasObject + Projection/Usage | projection style | group summary + bbox | 属于 reuse projection，不改 ContentGroup 本体。 |
| Petal tile | Petal + parent ContentGroup | CanvasObject + Projection/Usage | projection style | petal summary + parent context | 不能脱离 parent group。 |
| Raw ink stroke | InkStroke / Asset-like data | CanvasObject or stroke layer | stroke style | OCR/VLM derived | 初期只存，不理解。 |

## 4. CanvasObject 的基本分类

### 4.1 Pure CanvasObject

没有内容真相，只是空间和视觉对象。

例子：

1. 装饰矩形。
2. 圆形。
3. 线条。
4. 普通箭头。
5. 背景区域。

它们可以被 AI 读取为 layout / visual cue，但 AI 不应该把它们当作知识内容。

### 4.2 Block-backed CanvasObject

CanvasObject 挂载一个 NoteBlock。

例子：

1. 独立 paragraph block。
2. 填了文字的 shape。
3. formula block projection。
4. code block projection。
5. image block with caption。
6. table block。

这里的核心是：CanvasObject 负责空间；NoteBlock / TextFlow 负责内容。

### 4.3 StructuredObject-backed CanvasObject

CanvasObject 挂载一个结构化对象，不一定是普通文本。

例子：

1. diagram。
2. math graph。
3. chart。
4. 3D viewer。
5. mind map。

这些对象后续可以有自己的 editor，但仍要通过 CanvasObject / Placement 进入画布。

### 4.4 Projection-backed CanvasObject

CanvasObject 不是对象本体，而是某个知识实体的一次使用。

例子：

1. ContentGroup tile。
2. Petal tile。
3. SourceArtifact card。
4. Relation proposal card。

这类对象必须避免把 projection 的位置、样式写回原实体本体。

## 5. PageFrame 的特殊性

PageFrame 是 CanvasObject，但不能只按普通 object 处理。它需要额外实体：

1. `PageFrameExtension.page_size`
2. `PageFrameExtension.content_inset`
3. `PageFrameExtension.ruler`
4. `PageFrameExtension.header_footer`
5. `PageFrameExtension.page_number`
6. `PageFrameExtension.template`
7. `PageFrameExtension.export_settings`
8. `NoteCanvas.primary_frame_id`

PageFrame 承担的是“正式文档面”的功能，因此它是 8.8 的第二优先级：第一优先级是引擎底座，第二优先级就是 PageFrame。

## 6. ContentMount 设计原则

`ContentMount` 是 CanvasObject 与内容真相之间的桥。

它需要表达：

1. 挂载对象类型：note_block / content_group / petal / asset / structured_object。
2. 挂载目标 id。
3. projection mode：reference / duplicate / fork / materialize / preview。
4. ownership：这个 CanvasObject 是否拥有内容，还是只是引用内容。
5. sync policy：源对象变化时是否刷新 projection。

最小版本可以先支持：

```text
CanvasObject -> ContentMount(note_block)
CanvasObject -> ContentMount(asset)
CanvasObject -> ContentMount(structured_object shell)
```

ContentGroup / Petal projection 可以先预留，不在 8.8 强行完成。

## 7. VisualStyle 不能污染内容真相

用户给 paragraph block 设置背景、边框、颜色，本质上是在改它的画布呈现，不是在改 TextFlow 内容。

因此：

1. `TextFlow` 不保存边框、位置、背景。
2. `CanvasPlacement` 不保存内容。
3. `VisualStyle` 不保存文本。
4. `CanvasAIReadableSnapshot` 可以把 style 摘出来给 AI 读，但不能成为真相。

## 8. 8.8 最小实体合同

V2.BN.8.8 至少应定义这些合同，即使第一版实现仍有一部分通过 metadata 过渡：

1. `NoteCanvas`
2. `CanvasObject`
3. `CanvasPlacement`
4. `ContentMount`
5. `PageFrameExtension`
6. `VisualStyle`
7. `VisualConnector`
8. `CanvasCommand`
9. `CanvasAIReadableSnapshot`

其中真正必须进入第一轮实现的是：

1. `CanvasObject`
2. `CanvasPlacement`
3. `PageFrameExtension`
4. `ContentMount(note_block)`
5. `CanvasAIReadableSnapshot`

## 9. Addressable Knowledge Object 的后续补口

当前运行时里已经有 `ContentGroupMemberKind = canvas_object / table_region / image_region / future_object` 的预留，但 `AddressableKnowledgeObjectKind` 尚未把 `canvas_object` 纳入核心地址对象。

这说明之前已经预感到 CanvasObject 会进入知识系统，但还没有真正完成：

1. 8.8 可以先让 CanvasObject 进入 AI-readable layout。
2. 8.9 / Relation 版本再判断是否让 CanvasObject 成为 addressable endpoint。
3. 如果要进入 endpoint，必须区分 pure visual object 与 block-backed / projection-backed object。

## 10. Entity Inventory 自检

这份 inventory 已经足够回答“独立 Block 背后有几套表”这个问题。

但还缺两类表：

1. Data Lifecycle Matrix：创建、复制、删除、迁移、导出、导入时每个实体如何变化。
2. Performance / Snapshot Matrix：哪些实体参与渲染，哪些实体参与 AI snapshot，哪些可以 lazy load。

阶段三先把这两类内容分别并入 Interaction Workflow 和 Minimal Engine Design，不单开新文档；如果 8.8 plan 中出现冲突，再单独拆出。
