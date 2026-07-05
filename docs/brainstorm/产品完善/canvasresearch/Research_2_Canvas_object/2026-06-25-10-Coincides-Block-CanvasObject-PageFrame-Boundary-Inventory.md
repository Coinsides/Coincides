# 10. Coincides 当前 Block / CanvasObject / PageFrame 边界盘点

status: stage-2 research
date: 2026-06-25 America/Toronto
scope: current Coincides model inventory and boundary draft

## 1. 当前最重要的边界判断

这轮讨论后，最重要的判断已经比较稳定：

```text
Block 不是 CanvasObject。
Block 是内容对象。
CanvasObject 是空间对象。
很多 CanvasObject 可以是 block-backed，但不是所有 CanvasObject 都应该变成 Block。
```

换句话说：

- `paragraph block` 代表可编辑文本内容；
- `NoteBlock` 当前仍混合了内容和布局，是历史实现里的过渡对象；
- `CanvasObject` 应该表达对象在画布里的空间身份、几何、交互和投影；
- `PageFrame` 是极特殊的 CanvasObject / canvas root component，不应按普通矩形处理；
- `ContentGroup projection` 是 ContentGroup 的一次出现，不等于 ContentGroup 本体，也不应硬塞进 Block。

## 2. 当前工程里的事实

### 2.1 Canvas runtime seed

当前 `client/src/pages/Notes/canvasEngine/types.ts` 已经有基础类型：

```text
NoteCanvasMode = page | canvas
CanvasSurface = formal_page | canvas_workspace
PageFrameModel
CanvasWorldModel
BlockPlacementModel
CanvasObjectReserve
RelationEndpointReserve
NoteCanvasRuntimeModel
```

其中 `CanvasObjectReserve` 还很轻：

```text
kind: shape | freehand | image | frame | region
x / y / width / height / rotation
```

这说明当前工程已经为 CanvasObject 留了口子，但还没有正式合同。

### 2.2 TextFlow 与 NoteBlock

`runtimeDataTypes.ts` 中：

- `TextBlockContentV1` 是 TextFlow 内容；
- `TextUnit` 支持 paragraph、heading、quote、list、todo、toggle、code_line；
- `InlineStructuredObject` 支持 inline_formula、inline_code、inline_link 等；
- `NoteBlock` 仍然包含 `placement_id`、`display_overrides_json`、`block_type`、`content_json`、`plain_text`。

这意味着：

```text
TextFlow 已经是内容模型。
NoteBlock 目前仍然是内容壳 + 空间壳的组合。
CanvasObject 还没有从 NoteBlock 中独立出来。
```

阶段三和 8.8 需要决定是否引入更明确的：

```text
CanvasObject
CanvasPlacement
ContentMount
```

### 2.3 当前 Block presentation

当前 block presentation 已有三类：

```text
paragraph
formula
code
```

`text.paragraph`、`formula.math`、`code.snippet` 是当前实际入口。Slash command 里 inline formula / inline code 仍是后续 TextFlow pass。

命名约定：

```text
在正式改名和迁移前，继续使用 paragraph block。
不要在文档里提前把它改叫 TextBlock，以免写乱。
```

未来可以把 paragraph block 改名为 TextBlock，但这需要单独迁移和命名整理，不是本阶段任务。

## 3. Block 和 CanvasObject 的关系草案

### 3.1 Block 是内容对象

Block 回答：

- 这里有什么内容？
- 这个内容如何编辑？
- 它的 TextFlow / formula / code / table / image truth 在哪里？
- 它能否被 ContentGroup 引用？
- 它能否被 AI 读取？

典型 Block：

- paragraph block；
- formula block；
- code block；
- future table block；
- future image block；
- future chart block。

### 3.2 CanvasObject 是空间对象

CanvasObject 回答：

- 它在画布哪里？
- 占多大？
- 旋转多少？
- 层级是什么？
- 是否可选中、移动、缩放、连接？
- 是否在 PageFrame 内？
- 是否导出？
- 是否 AI-visible？
- 它是否挂载了一个内容对象？

典型 CanvasObject：

- shape；
- freehand / ink；
- visual arrow；
- image viewer；
- PageFrame；
- ContentGroup tile；
- diagram object；
- chart object；
- 3D model viewer。

## 4. block-backed CanvasObject

`block-backed CanvasObject` 指：

```text
一个空间对象挂载了一个内容对象。
```

例如：

- 一个矩形 shape 内部填了文字；
- 一个 callout 形状内部挂了 paragraph block；
- 一个公式卡片挂了 formula block；
- 一个统计图对象挂了 chart block / structured chart data；
- 一个 image object 挂了 image block 和 caption。

它不是“CanvasObject 变成 Block”，也不是“Block 变成图形”。它是：

```text
CanvasObject.primary_identity = shape / object
CanvasObject.content_mount = paragraph block / formula block / other block
```

## 5. pure visual CanvasObject

`pure visual CanvasObject` 指没有可读内容 truth 的视觉对象。

例如：

- 一个纯矩形；
- 一个圆；
- 一条普通箭头；
- 一个装饰线；
- 一个临时标记；
- 未解释 Raw Ink。

它可以进入 Canvas AI Tree，但 content 可能是：

```text
content_kind: none
summary: null
```

纯视觉对象不应该被强行转成 Block。否则系统会制造大量空内容对象，也会让 AI 误以为每个装饰都有知识含义。

## 6. 形状填充文字的升格 / 退回规则

用户心智是：“我在矩形里写字”。工程心智应该是：

```text
shape CanvasObject 挂载 paragraph block。
```

推荐规则：

1. 用户对纯 shape 执行“填充文字”。
2. 系统进入编辑态，但还不立即提交 durable block。
3. 用户提交非空文本后：
   - 创建 paragraph block；
   - shape 增加 `content_mount`；
   - shape 成为 block-backed CanvasObject。
4. 如果用户取消或提交空文本：
   - shape 保持 pure visual CanvasObject。
5. 如果已提交后的文字被删空：
   - 若没有 annotation、source、ContentGroup、Agent proposal、历史引用，可提示并 detach；
   - 若已有引用或历史，不能静默删除内容对象。

这能避免“写一下又删掉”就留下空 block 的垃圾数据。

## 7. paragraph block 加边框 / 背景不叫升格成 shape

另一种情况是：

```text
用户先创建 paragraph block，然后给它加背景、边框、圆角、颜色。
```

这不是 Block 升格成 shape。更准确的命名是：

```text
styled block projection
```

它的 primary identity 仍然是 paragraph block，只是投影样式变化。

对比：

| 场景 | primary identity | 内容对象 | 空间对象 |
| --- | --- | --- | --- |
| 纯矩形 | shape | 无 | shape object |
| 矩形中填文字 | shape | mounted paragraph block | block-backed shape |
| paragraph block 加背景 | paragraph block | paragraph block | styled block projection |
| formula block 卡片 | formula block | formula block | formula block projection |

这一区分可以避免未来数据迁移混乱。

## 8. PageFrame 的特殊性

PageFrame 应该被看作特殊 CanvasObject，但它的优先级高于普通对象。

它承担：

- formal writing surface；
- export boundary；
- Page Mode 入口；
- primary PageFrame；
- 多 PageFrame 文档；
- page size；
- margin / ruler / snap reference；
- page header / footer / page number；
- template / background；
- TextFlow / block layout boundary。

因此 PageFrame 不应只存：

```text
x / y / width / height
```

它还需要：

```text
content_bounds
page_size
margin
ruler settings
snap reference
is_primary
page_order
export role
template settings
header / footer / page number widgets
```

阶段三要单独写 PageFrame 精细设计稿，不能把它作为普通 shape 的一个 kind 顺手带过。

## 9. ContentGroup projection 的位置

ContentGroup 本体已经是独立知识包。它出现在 Canvas 上时，应该是 projection / usage：

```text
ContentGroup
  truth

ContentGroupProjection
  where this group appears on this canvas
```

它可以显示成 folder tile、compact editor、single editor projection，但它不是普通 block。

原因：

- ContentGroup 有自己的 members / petals / folder / identity；
- 它可以跨 note / project 被引用；
- 它在 Canvas 上的出现位置不能写回 ContentGroup 本体；
- 它可被 AI 读取，但读取的是 group summary / members / petals，而不是普通 TextFlow。

## 10. 未来 object family 候选

当前聊天中出现的未来对象族可以先归类：

| Object family | 是否 block-backed | 是否第一批 | 说明 |
| --- | --- | --- | --- |
| PageFrame | 特殊 | 是 | 第一优先级 |
| paragraph block projection | 是 | 是 | 当前已有 |
| shape | 可选 | 是 | 纯视觉或挂载 paragraph block |
| visual arrow | 否 | 是 | 普通画布箭头不等于 Relation |
| image object | 可选 | 可能 | 可有 caption / description |
| table block | 是 | 可能 | 更接近内容对象 |
| flowchart / diagram | 结构化 | 后置 | 需要 nodes / edges |
| math graph | 结构化 | 后置 | 公式 / 坐标 / viewport 为真相 |
| statistical chart | 结构化 | 后置 | dataset / encoding / transform 为真相 |
| 3D model viewer | asset-backed | 后置 | 只展示，不做建模编辑 |
| Raw Ink | 否或弱解释 | 后置 | AI-readable 难度高 |
| ContentGroup projection | 否，知识包投影 | 后置但重要 | 依赖 CanvasObject projection |

## 11. 阶段三需要继续决策

- `NoteBlock` 是否需要拆成 Block truth + CanvasPlacement？
- `CanvasObjectReserve` 是否升级成正式 `CanvasObject`？
- `CanvasPlacement` 是否从 8.8 第一阶段就独立？
- `content_mount` 是否允许挂载 paragraph block、formula block、ContentGroup projection、structured object data？
- PageFrame 是否单独有 `PageFrameContract`？
- styled block projection 的样式字段放在 Block、Placement 还是 CanvasObject？
- pure shape 填文字后的 durable commit 规则是否进入 contract？

## 12. 本文引用的本地文件

- `client/src/pages/Notes/canvasEngine/types.ts`
- `client/src/pages/Notes/canvasEngine/runtimeDataTypes.ts`
- `client/src/pages/Notes/canvasEngine/textFlowService.ts`
- `client/src/pages/Notes/canvasEngine/blockContentService.ts`
- `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx`
- `client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx`
- `docs/contracts/Notebook-Object-Inventory-Contract.md`
