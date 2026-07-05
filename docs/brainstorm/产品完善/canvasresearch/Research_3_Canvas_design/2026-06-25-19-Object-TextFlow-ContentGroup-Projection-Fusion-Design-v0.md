# 2026-06-25 - Object / TextFlow / ContentGroup Projection 融合设计稿 v0

> 目标：回答 CanvasObject、Block、TextFlow、ContentGroup、Petal、Relation 之间如何相处。这个问题如果不提前说清楚，后续很容易把所有东西都塞成 CanvasObject，导致真相层混乱。

## 0. 核心分工

```text
TextFlow        = 内容真相
ContentGroup    = 知识结构真相
Canvas          = 空间 / 布局真相
CanvasObject    = 空间对象身份
CanvasPlacement = 空间对象位置
ContentMount    = 空间对象挂载内容
Projection      = 某个实体在 Canvas 上的一次出现
```

## 1. Block 与 CanvasObject 的关系

Block 不是 CanvasObject。

Block 是内容对象；CanvasObject 是空间对象。

但是，一个 Block 可以通过 CanvasObject 出现在画布上：

```text
NoteBlock
  <- ContentMount(target=note_block)
CanvasObject(kind=paragraph_block_projection)
  <- CanvasPlacement
```

所以更准确的说法是：

> Block 可以拥有一个或多个 Canvas projections。

这为后续 reuse 留出口：同一个内容可以在不同 PageFrame / workspace 中以不同位置出现。

## 2. Paragraph block 是基础内容块

当前统一称为 paragraph block，不在本阶段改名。

它承担：

1. 普通正文。
2. shape 填文字后的文字内容。
3. sticky note 类表达。
4. AI 生成文档的默认文字单元。

未来可以考虑改名为 text block，但这涉及迁移，不是 8.8 优先级。

## 3. Shape 与文字

### 3.1 Pure shape

纯图形：

```text
CanvasObject(kind=shape, backing=none)
CanvasPlacement
VisualStyle
```

它不创建 NoteBlock。

### 3.2 Shape 填文字

用户双击 shape 或选择填充文字：

```text
CanvasObject(kind=shape, backing=note_block)
ContentMount(target=paragraph_block)
NoteBlock(type=paragraph)
CanvasPlacement
VisualStyle
```

用户感知：

> 我只是在矩形里写了字。

系统实际：

> 这个矩形挂载了一个 paragraph block。

### 3.3 删除文字后退回 pure shape

如果用户清空文字并退出编辑：

1. 删除空 paragraph block。
2. 删除 ContentMount。
3. CanvasObject 保持 shape。
4. VisualStyle 保留。

这样可以避免空 block 垃圾。

## 4. Styled paragraph block

用户创建 paragraph block 后，可以加背景、边框、颜色。

这不是把 block 变成 shape，而是：

```text
paragraph block projection + VisualStyle
```

差异：

1. shape 填文字：shape 是外壳，paragraph block 是挂载内容。
2. styled paragraph block：paragraph block 是主体，style 是呈现。

用户可以不需要理解这两个术语，但工程层必须区分。

## 5. Formula / Code / Table / Image

### 5.1 Formula

Formula 可以是：

1. inline structured object。
2. formula block。
3. block-backed CanvasObject。

AI 读取时可以直接读结构化内容。

### 5.2 Code

Code 可以是：

1. code block。
2. block-backed CanvasObject。

### 5.3 Table

Table 不适合做 inline structure。

建议：

1. table block。
2. structured object。
3. CanvasObject projection。

8.8 可以先做 shell，成熟放到 8.10。

### 5.4 Image

Image 可以是：

1. inline image。
2. image block。
3. standalone CanvasObject。

如果 standalone image 需要 caption：

```text
Asset(image)
CanvasObject(kind=image)
optional caption NoteBlock
```

8.8 不强行完成 image 复杂语义。

## 6. ContentGroup Projection

ContentGroup 是独立知识结构实体，不是 note metadata 小字段。

当 ContentGroup 出现在 Canvas 上时，它不是本体移动，而是 projection：

```text
ContentGroup
  <- ContentMount(target=content_group, projectionMode=reference)
CanvasObject(kind=content_group_projection)
CanvasPlacement
```

用户操作：

1. open original。
2. duplicate projection。
3. fork as new group。
4. materialize members into blocks。
5. establish reference link。

这些动作不应该混为“拖进去就变成正文”。

## 7. Petal Projection

Petal 是 ContentGroup 内部结构，不是 source text label。

如果 Petal 未来作为 CanvasObject 出现：

1. 必须带 parent ContentGroup context。
2. 不能脱离 group 单独成为用户心智中的普通块。
3. 可以作为 Relation endpoint view 的节点。
4. 不优先进入 8.8。

## 8. Visual Arrow 与 Relation

### 8.1 普通 Canvas Mode

箭头是 visual connector：

```text
VisualConnector
CanvasPlacement / geometry
optional binding to CanvasObject
```

它不创建 KnowledgeRelation。

### 8.2 ContentGroup Mode / Relation View

箭头可以对应：

```text
RelationProposal
  -> KnowledgeRelation
```

端点是：

1. ContentGroup。
2. Petal。
3. 未来可能是 SourceArtifact / SourceAnchor。

### 8.3 为什么分开

因为用户在白板上画箭头，很多时候只是视觉提示、装饰、引导，不一定是知识关系。

把普通箭头自动解释成 Relation，会污染 GraphRAG。

## 9. Canvas AI Tree 融合

Canvas AI Tree 应该把三种真相汇合成一份派生结构：

1. TextFlow 内容。
2. ContentGroup 知识结构摘要。
3. Canvas layout。

示意：

```text
CanvasAIReadableSnapshot
  -> PageFrame nodes
      -> paragraph block nodes
      -> shape nodes
      -> image/table nodes
  -> workspace nodes
  -> visual connector nodes
  -> selected context
  -> projection refs
```

它只读，不是真相。

## 10. Reference / Duplicate / Fork / Materialize

### Reference

CanvasObject 指向源实体，不复制内容。

### Duplicate

复制 projection，不复制源实体。

### Fork

基于源实体创建新实体。

### Materialize

把源实体的内容写入当前 note，生成新的 blocks。

这四个动作必须在 ContentGroup projection 版本里稳定，不应在 8.8 匆忙实现。

## 11. Object Family 融合策略

| Family | 与 TextFlow 关系 | 与 ContentGroup 关系 | 与 AI Tree 关系 | 版本 |
| --- | --- | --- | --- | --- |
| PageFrame | 承载 blocks | 可作为 group 组织上下文 | page container | 8.8 |
| paragraph block | 直接使用 TextFlow | 可被加入 group | text node | 8.8 |
| shape | 可挂载 paragraph block | 通常无 | visual node | 8.8 |
| visual arrow | 无 | 普通模式无 | connector node | 8.8 |
| image | asset + optional caption | 可加入 group | image node | 8.8 shell / 8.10 |
| table | structured block | 可加入 group | table node | 8.10 |
| ContentGroup tile | 引用 group members | 本体是 group | group projection node | 8.10 |
| diagram | 内部 nodes/edges 可挂 TextFlow | 可生成 group | structured graph node | 8.11 |
| math graph | structured data | 可作为 member | graph node | 8.11+ |
| Raw Ink | OCR/VLM 补读 | 暂不直接入 group | ink node | Later |

## 12. 设计结论

CanvasObject 不能被定义得太窄，也不能变成吞掉一切的超级实体。

合理边界是：

1. CanvasObject 管“这个东西作为画布对象存在”。
2. CanvasPlacement 管“它在哪里”。
3. ContentMount 管“它挂载了什么内容或知识实体”。
4. TextFlow 管“文字是什么”。
5. ContentGroup 管“知识如何被组织”。
6. Canvas AI Tree 管“AI 如何读取当前布局”。

这套分工能让 PageFrame、Block、Shape、Image、Table、ContentGroup projection、Diagram、Agent 都有地方可放。
