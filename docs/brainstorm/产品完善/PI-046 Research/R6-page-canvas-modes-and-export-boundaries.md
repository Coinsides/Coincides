# R6 - Canvas / Page 模式需求与导出边界

## 本阶段问题

R6 要回答的是：Coincides 的“页面”和“画布”到底是什么关系，以及哪些内容在导出时应该出现。

R3 已经确认 Canvas 属于 projection/view layer；R5 已经确认 block-box 是 placement/presentation，不是内容 truth。R6 进一步定义 formal page area、outside-page workspace、多页视图、无缝页面和导出边界。

## 证据来源与证据等级

- A 级代码证据：
  - `learning_canvases` 已有 `canvas_kind`、`preset`、`page_size`、`orientation`、`width`、`height`、`background_style`。
  - `canvas_nodes` 已有 `x/y/width/height/z_index`。
- D 级产品需求证据：
  - 用户希望默认 A4 page 感。
  - 用户希望有有限画布和无限画布。
  - 用户希望页面外可放便签、备注、推导、scratch work。
  - 用户希望多页视图可像 Word 一样多页展示，也可像笔记软件一样无缝页面连接。
  - 用户希望导出 PDF 时只导出正式页面内容，不默认导出个人草稿。

## 总体结论

Coincides 不应该只有一种 canvas 模式。它至少需要四种视图/工作模式：

1. **Locked Single Page**
   单页 A4/Letter 等固定页面。适合正式笔记和 PDF 导出。

2. **Open Canvas**
   页面外空间可自由扩展。适合草稿、便签、思路整理、局部知识图谱。

3. **Multi-page Grid**
   多页像缩略排版一样排列。适合总览和跨页管理。

4. **Seamless Page Stack**
   多页上下无缝连接，中间用虚线 page break 提醒导出切割位置。适合连续手写、长笔记和 iPad 场景。

核心规则是：

```text
页面内 = 默认正式内容
页面外 = 默认草稿/个人备注
导出 = 根据 export intent，而不是只根据视觉位置
```

## 1. Locked Single Page

### 定义

Locked Single Page 是最接近传统文档的模式：

- 页面固定为 A4/Letter/自定义尺寸。
- 默认不能把视图无限拖到页面之外作为主要工作区。
- 用户可以 zoom。
- 页面边界清晰。
- 所有页面内对象默认导出。

### 适合场景

- 考试笔记。
- 课堂讲义整理。
- 准备交给老师或同学看的 PDF。
- 正式 summary。

### 数据要求

需要保存：

```text
page_size
orientation
width
height
margin
background_style
export_profile
```

当前 `learning_canvases` 已有 page size / orientation / width / height / background seed，但缺 margin、export profile 和 page boundary policy。

## 2. Open Canvas

### 定义

Open Canvas 是无限或近似无限工作区：

- 用户可以把对象放到页面外。
- 页面外可以有 sticky note、scratch proof、图形、草稿公式。
- 页面外对象可以和页面内对象建立 relation。
- 页面外对象默认不导出。

### 适合场景

- 自己推导 proof。
- 给某个 theorem 标注“没学懂”。
- 临时放 source、截图、思路碎片。
- 局部知识图谱。
- AI layout proposal 前的草稿 staging area。

### 关键规则

页面外不等于无意义。

页面外对象可能很重要，只是它的默认用途不是正式导出：

```text
visibility: visible
export_role: scratch / private_note / annotation
ai_readability: readable_with_context
```

## 3. Multi-page Grid

### 定义

Multi-page Grid 是多页总览模式：

```text
Page 1  Page 2  Page 3
Page 4  Page 5  Page 6
```

它类似 Word 的多页缩放视图，也类似设计工具的 artboard overview。

### 适合场景

- 看整篇笔记布局。
- 调整章节分布。
- 快速跳转。
- 查看哪些页面过密或过空。
- 管理跨页 source/reference。

### 关键问题

如果页面之间有大量可见 relation lines，multi-page grid 会很乱。

R6 建议：

- 默认隐藏跨页 relation lines。
- 同页 relation 可按需显示。
- 跨页 relation 用 badge、side panel 或局部知识图谱入口展示。
- 用户选中某个 block 后，才显示相关跨页 relation hints。

## 4. Seamless Page Stack

### 定义

Seamless Page Stack 是上下连续页面：

```text
Page 1
----- dashed page break -----
Page 2
----- dashed page break -----
Page 3
```

页面之间没有大空白，只有虚线或 guide 表示导出时的切割边界。

### 适合场景

- iPad 手写。
- 长篇连续笔记。
- 需要跨页画线、写推导或贴图。
- 用户不想被页面缝隙打断。

### 导出规则

导出 PDF 时：

- page break guide 负责切页。
- 跨 page break 的图形或手写内容会被切分。
- 系统应在编辑时提示用户：跨 page break 的内容导出时会分到不同页。

### 数据要求

需要保存：

```text
page_sequence
page_break_positions
page_label
internal_page_index
export_page_index
```

当前 v2.x 尚未建立完整 page sequence / page break model。

## 5. Formal Page Area 与 Outside-page Workspace

### Formal Page Area

Formal page area 是正式文档区域。

默认：

- 内容导出。
- AI 视为正式笔记。
- source/relation/concept 进入正式上下文。
- block warnings 会影响导出/质量检查。

### Outside-page Workspace

Outside-page workspace 是页面外空间。

默认：

- 不导出。
- AI 可读，但需要知道它是 scratch/private。
- 可与 formal content 建立 relation。
- 可显示为 sticky notes、scratch formulas、temporary images、local graph。

### 默认规则

```text
inside page -> export_role = formal
outside page -> export_role = scratch
```

但用户必须能覆盖这个默认值。

## 6. Export Intent 与 Visibility Metadata

R6 建议所有 page/canvas placement 都需要类似字段：

```text
export_role:
  formal
  scratch
  private_note
  annotation
  hidden

export_visibility:
  export
  do_not_export
  export_if_selected

ai_visibility:
  readable
  readable_with_context
  private_by_default
  hidden
```

这三个概念不应混在一起：

- 用户能看到，不代表要导出。
- 不导出，不代表 AI 不能读。
- AI 能读，不代表别人导出时能看到。

## 7. PDF / HTML / PNG / 工程文件导出边界

### PDF

PDF 是最严格的 formal export。

默认只导出：

- formal page area。
- `export_visibility = export` 的对象。
- page break 以内的内容。

不默认导出：

- outside scratch notes。
- private notes。
- hidden relation layers。
- debug/source panels。

### HTML

HTML 可以更灵活：

- 可导出正式内容。
- 可选择包含 collapsible source references。
- 可选择包含 side notes。
- 可选择包含 relation summary。

### PNG / Image

PNG 更像截图：

- 如果用户选中页面区域，只导出该区域。
- 如果用户选中 canvas 区域，可导出包含 scratch 的视图。
- 需要明确用户选择的 crop/frame。

### 工程文件

工程文件应该保留全部：

- formal content。
- scratch content。
- source provenance。
- relation。
- template/domain metadata。
- canvas placement。
- export intent。
- recovery/proposal history。

工程文件是最完整的分享形式，但不是普通阅读分享形式。

## 8. Page Label / Internal Page Index / 用户页码

R6 必须记录一个很容易被忽略的问题：

内部页码和用户看到的页码可能不同。

例如：

- PDF 第 1 页是封面，没有页码。
- PDF 第 2-7 页是罗马数字目录。
- PDF 第 8 页才是正文 page 1。

因此需要区分：

```text
internal_page_index: 1, 2, 3...
source_page_label: i, ii, iii, 1, 2...
export_page_index: 导出文件中的页序
display_page_label: 用户看到的标签
```

这对 AI 问答也重要：

用户问“第一个三角函数知识点出现在第几页”时，系统应该能回答用户页码，而不是只回答内部 index。

## 9. 当前 learning_canvases 能保留什么

当前 `learning_canvases` 已有：

- `canvas_kind`
- `preset`
- `page_size`
- `orientation`
- `width`
- `height`
- `background_style`

这些字段能作为 seed 保留。

缺少：

- page sequence。
- multi-page layout。
- page break guide。
- export profile。
- margin。
- formal/scratch boundary。
- page label mapping。
- object export intent。
- outside workspace policy。

R6 判断：

当前 canvas schema 是 v2.4 seed，不够支撑正式 page/canvas product。

## 10. 与 AFFiNE / BlockSuite 调研的关系

R7-R8 必须重点观察：

- AFFiNE page mode 和 edgeless mode 如何区分。
- AFFiNE 是否支持 page 内 formal content + page 外 canvas objects。
- AFFiNE/BlockSuite 是否有 page break / multi-page / export boundary。
- BlockSuite 是否能保存每个 block 的 custom metadata。
- 它们的导出是否能处理 canvas outside content。

如果 AFFiNE 的模式只能支持“page 与 edgeless 切换”，而不能支持 Coincides 需要的 page-first freeform block-box，就必须考虑 hybrid 或自研补层。

## 11. R6 解决的问题

R6 解决了：

1. Canvas 不是单一模式，而应有多种 page/canvas view。
2. 页面外内容不是垃圾，也不是默认正式内容。
3. 导出边界必须靠 export intent，而不只靠视觉位置。
4. 多页和无缝页面是 Coincides 未来必须认真设计的基础体验。
5. 内部 page index 和用户 page label 必须分开。

## 12. 暴露的风险

1. **导出可信度风险**
   如果用户导出的 PDF 和编辑时看到的不一致，会立刻失去信任。

2. **页面外对象混乱风险**
   页面外对象既可 relation，又不默认导出。如果没有 metadata，AI 和用户都会混乱。

3. **跨页 relation 视觉风险**
   大量跨页线条会毁掉阅读体验，必须用局部视图或筛选替代默认全显示。

4. **page label 风险**
   如果只用 internal page index，source jump-back 和用户问答都会出现页码错位。

## 13. 对后续阶段的影响

- R7 必须观察 AFFiNE 的 page/edgeless/export 是否能覆盖 R6 模式。
- R8 必须检查 BlockSuite 是否能支持 page metadata、export intent、outside workspace。
- R9-R11 必须把 page/canvas/export boundary 纳入 route 评分。
- R12 必须考虑 AI 如何读取 formal/scratch/private content。
- R13/R14 必须决定这些模式是 2.x 后续产品打磨，还是新路线第一阶段。

## 14. 反补前序报告

R6 不需要修改 R0-R5。

但 R6 对 R4/R5 有两个强化：

- R4 的“人工笔记体验”必须包含导出边界。
- R5 的 block-box placement 必须包含 export intent / ai visibility，而不只是 x/y/width/height。

这些将在 S2 阶段总结和 R13/R14 中统一吸收。

## R6 结论

Coincides 需要的页面/画布系统不是单纯 infinite canvas，也不是传统 page editor。

它应支持：

```text
Locked Single Page
Open Canvas
Multi-page Grid
Seamless Page Stack
Formal Page Area
Outside-page Workspace
Export Intent
Page Label Mapping
```

这套需求将成为 AFFiNE / BlockSuite 调研的关键对照标准。
