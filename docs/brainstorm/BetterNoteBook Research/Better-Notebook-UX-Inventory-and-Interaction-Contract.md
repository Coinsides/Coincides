# Better Notebook UX Inventory And Interaction Contract

**Created**: 2026-06-06
**Status**: Draft v0.6
**Scope**: Better Notebook UX inventory, command surface, object state, and interaction contract
**Role**: 后续 v2.6.x / Better Notebook 版本计划的 UX 总检查表

---

## 0. 文档定位

这份文档不是 UI 视觉稿，也不是工程 spec。它是一份 **UX Inventory + Interaction Contract**。

它要在正式重写 UI/UX 之前，先把以下事情列清楚：

```text
有哪些对象？
有哪些操作？
哪些操作应该做成按钮？
哪些操作应该靠点击、拖拽、slash、hover、右键、toolbar、inspector 或 debug mode？
每个对象在 reading / hover / selected / editing / layout mode 下应该长什么样？
哪些行为必须直接执行，哪些行为必须 proposal-first？
```

这份文档服务于后续 Better Notebook 路线图，尤其是：

- Phase A1: Product Shell And Navigation
- Phase A2: Natural Page Writing
- Phase A3: Freeform NoteBlock Box And Layout Mode
- Phase A4: Page / Canvas / Export Boundary
- Phase A5: Block Visual Language And Control Layer
- Phase A6: Better Notebook Data Contract

核心原则：

```text
用户看到的是自然笔记；
系统底层才是 NoteBlock / BlockBox / Source / Relation / Template / Proposal。
```

---

## 1. 参考来源

本初版主要吸收以下文件：

- `docs/Coincides-Better-Notebook-Roadmap.md`
- `docs/brainstorm/BetterNoteBook Research/R2-better-notebook-core-interaction-spec.md`
- `docs/brainstorm/BetterNoteBook Research/R4-block-visual-language-and-content-types.md`
- `docs/brainstorm/BetterNoteBook Research/R5-controls-toolbar-context-menu-and-shortcuts.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`
- `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`
- `docs/brainstorm/产品完善/product-improvement-issue-register.md`

产品参考对象：

- Notion: 自然写作、slash command、轻量 block 操作。
- AFFiNE / BlockSuite: page / edgeless、canvas tools、toolbar、favorites、frame、sticky、connector。
- Word / Google Docs: 正式页面、文本输入、导出心智。
- tldraw / FigJam / Excalidraw: 选择、拖拽、resize、吸附、视觉连线。

---

## 2. UX 总原则

### 2.1 第一秒是写作，不是对象管理

空白 note 的默认体验应该是：

```text
点击页面
  -> 出现光标
  -> 输入内容
  -> 系统在背后创建默认 text NoteBlock
```

用户不应该先点击 `Add Block`，也不应该先理解模板、source、relation、canvas node。

### 2.2 NoteBlock 是内容 truth，BlockBox 是排版 truth

```text
NoteBlock:
  内容本身。

BlockBox / SurfaceObject:
  NoteBlock 在某个页面或画布上的位置、尺寸、显示状态、导出意图、AI 可见性。
```

Resize、move、align、snap、page placement 不应该改写 NoteBlock 内容。

### 2.3 默认阅读态要像内容，不像工程卡片

普通 paragraph、heading、formula、image、quote 等 block，在 reading mode 下应该像一份笔记的一部分。

默认不要常驻显示：

- block type pill；
- template key；
- source board node；
- canvas_node_id；
- target_id；
- Open / Hide 工程按钮；
- resize handle；
- relation port。

这些信息应该在 hover、selected、inspector、debug mode 中按需出现。

### 2.4 工具栏要分层，不要全塞到页面上

控制入口应该按频率和风险分层：

```text
直接操作:
  点击、输入、拖拽、resize。

Slash:
  创建或转换 block type。

Floating toolbar:
  当前对象的高频操作。

Right-click:
  当前对象的完整上下文操作。

Inspector:
  source、relation、template、export、AI visibility、history、debug。

Topbar:
  页面级模式和文档级命令。

Debug mode:
  工程细节、ids、operation batch、runtime metadata。
```

### 2.5 UX 决策必须服务数据主权

即使未来采用 BlockSuite 或其他成熟 runtime，也不能让外部 editor snapshot 成为 Coincides truth。

Coincides 必须继续拥有：

- NoteBlock content；
- TemplateDefinition；
- source references；
- ObjectRelation；
- RelationLayer；
- export role；
- AI visibility；
- operation/recovery records。

### 2.6 正式层和草稿层是状态，不是内容高低级

页面内正式内容、页面外 scratch、sticky remark、临时推导，都可以是 `NoteBlock`。

区别不在于它们是不是内容对象，而在于：

```text
是否默认导出；
是否属于正式文档结构；
是否默认进入 AI 读取范围；
是否需要在阅读态弱化；
是否需要在 layout mode 下明确提示。
```

因此，scratch / sticky 不应该被做成完全不同的底层对象。第一版应把它们作为特殊 placement / export role / appearance 的 `NoteBlock` 处理。

---

## 3. 对象 Inventory

### 3.1 顶层产品对象

| 对象 | 用户看到的名字 | UX 角色 | 备注 |
|---|---|---|---|
| Workspace | Workspace | 应用工作区 | 第一版可以很轻 |
| Project | Project | 容纳 notes/sources/templates 的项目 | `Course` 后续逐步变成 project type |
| Note / Document | Note / Report | 用户主要写作对象 | notebook/report 共享底层 |
| Source Library | Sources | 材料库 | 不应挤在主写作面 |
| Template Studio | Templates / Studio | 高级工具区 | 不应污染日常写作 |
| Package Studio | Packages | 高级导入导出和能力包 | 暂时放在 advanced |
| Favorites | Favorites | 常用入口 | note/project/document 快捷入口 |

### 3.2 页面与画布对象

| 对象 | UX 角色 | 第一版要求 |
|---|---|---|
| Formal Page | 正式页面 | 默认可导出区域 |
| Page Margin | 页面边界 | 用于对齐、输入起点、导出边界 |
| Outside Workspace | 页面外草稿区 | 默认不导出，可保存，可关联，可被 AI 按权限读取 |
| Multi-page Surface | 多页表面 | 第一版可以只定义规则，不完整实现 |
| Canvas Viewport | 视口 | pan/zoom/session state |
| Export Preview | 导出预览 | 后续 phase 做第一版 |

### 3.3 内容对象

| 对象 | 是否 NoteBlock | 默认导出 | 默认视觉 |
|---|---:|---:|---|
| Paragraph | 是 | 是 | 无边框正文 |
| Heading | 是 | 是 | 层级字体 |
| Formula / LaTeX | 是 | 是 | display 或 inline formula |
| Image / Figure | 是或 media-backed block | 是 | 图片，可 caption |
| Code | 是 | 是 | code panel，但不要太像工程卡片 |
| Table | 是 | 是 | 表格 |
| Quote / Source Quote | 是 | 是 | quote 样式，source badge |
| Callout | 是 | 是 | 弱背景或 icon |
| Sticky / Scratch Note | 是 | 否，除非用户显式 include | 轻便签或草稿视觉，角标提示 |
| User Annotation | 待定 | 否或可选 | 需要后续定义 |

### 3.4 语义与证据对象

| 对象 | UX 显示方式 | 默认是否常驻正文 |
|---|---|---:|
| SourceReference | source badge + inspector | 否 |
| SourceScope | source picker / inspector | 否 |
| SourceAnchor | jump target | 否 |
| SourceBoardNode | source selector / advanced | 否 |
| Link / InternalLink | body link / hover card / jump target | 是，作为正文导航元素 |
| CanvasArrow / CanvasConnector | visual arrow or line on canvas | 否 |
| ConnectionPoint | block connector handle | 否 |
| ObjectRelation | relation badge / inspector / local graph | 否 |
| RelationLayer | filter / inspector | 否 |
| TemplateDefinition | slash / inspector / debug | 否 |
| Concept | search / inspector / badge if useful | 否 |
| OperationBatch | debug / history | 否 |

显示层必须区分：

```text
正文蓝色/下划线链接:
  Link / InternalLink，用于导航。

source badge:
  SourceReference，用于 provenance / evidence。

relation badge / local graph:
  ObjectRelation，用于 semantic relation。
```

同一个 block 可以同时拥有 link、source reference 和 object relation，但点击跳转不自动代表证据引用，证据引用也不必须在正文显示为 link。

---

## 4. 操作 Inventory

### 4.1 写作与创建

| 操作 | 推荐入口 | 第一版行为 |
|---|---|---|
| 开始写空白 note | 点击 formal page | 创建 draft insertion，输入后持久化 |
| 创建默认 text block | 输入文字 | 生成 `text.paragraph` NoteBlock |
| 创建空间 block | 双击空白处 | 在该位置创建 draft block |
| Slash command | 输入 `/` | 打开分组 block type menu |
| 插入 heading | slash menu / toolbar | 创建 heading block |
| 插入 formula | slash menu / toolbar | 创建 LaTeX block |
| Convert to structured block | slash command / right-click / selected toolbar | 将已有 paragraph/text 转成 definition、formula、theorem 等 structured block |
| 插入 image | `/image` 或粘贴/拖入 | 创建 image block |
| 插入 code | `/code` | 创建 code block |
| 插入 quote | `/quote` | 创建 quote block |
| 粘贴内容 | paste | 根据内容类型创建或填充 block |

Slash command 是创建不同 block 的主要入口之一。它不应该只是一个扁平列表。

推荐规则：

```text
输入 `/`
  -> 打开一级类目菜单
  -> 用户用上下方向键或鼠标选择类目
  -> Enter / 鼠标左键进入类目
  -> 选择具体 block type 或 template variant
```

一级类目应按 block 的基础类型组织，例如：

- Text；
- Heading；
- Definition；
- Formula；
- Media / Image；
- Code；
- Table；
- Quote / Source Quote；
- Callout；
- Custom / User Templates。

用户自定义的 block variant 必须能进入菜单。例如：

```text
Formula
  formula.basic
  formula.math
  formula.engineering
  formula.biology

Definition
  definition.basic
  definition.math
  definition.engineering
```

当 template 数量变多时，菜单还需要：

- 搜索；
- 最近使用；
- 按 category 折叠；
- 键盘导航；
- Esc 关闭或返回上一级；
- 不把所有 runtime template 一次性铺满屏幕。

Slash command 需要区分 create 和 convert：

```text
空 block + /definition
  -> create DefinitionBlock

非空 paragraph/text + /definition
  -> convert current block to DefinitionBlock
  -> 打开转换确认面板
  -> deterministic guess 填入字段
  -> 用户确认或取消
```

第一版转换不依赖 AI。推荐规则：

```text
Definition:
  如果文本类似 "X is ..."，X 进入 concept_name，其余进入 description。
  如果无法判断，全文进入 description，concept_name 留空。

Formula:
  如果文本像 LaTeX 或公式，进入 latex_input。
  如果无法判断，进入 notes/raw_text，让用户调整。
```

Structured block 的基本原则：

```text
paragraph / text:
  freeform block。

definition / formula / theorem / proof / example / exercise:
  structured block。
```

用户普通编辑时修改的是 field value 和 field layout。字段 schema 由 TemplateDefinition 控制；新增、删除或重命名字段应进入 Template Studio。

### 4.2 编辑内容

| 操作 | 推荐入口 | 备注 |
|---|---|---|
| 编辑文本 | 点击 block 内部 | 文本编辑优先 |
| 当前 block 内换行 | Enter | 最符合普通写作心智 |
| 创建新 block | Ctrl+Enter | 显式操作，避免误触 |
| 加粗 | Ctrl+B / text selection toolbar | 遵循 Word / Docs / Notion 类习惯 |
| 斜体 | Ctrl+I / text selection toolbar | 遵循通用快捷键 |
| 下划线 | Ctrl+U / text selection toolbar | 遵循通用快捷键 |
| 修改字体大小 | text selection toolbar / inspector | 选中文字后出现轻量控件 |
| 修改字体 | text selection toolbar / inspector | 第一版可限制可选字体数量 |
| 左对齐 | Ctrl+L / toolbar | 仅在 editor focus 内处理，避免浏览器冲突 |
| 居中对齐 | Ctrl+E / toolbar | 遵循 Word 心智 |
| 右对齐 | Ctrl+R / toolbar | 遵循 Word 心智 |
| 编辑 LaTeX | formula block 内部 | 渲染预览 + 原始输入框 |
| 图片 / 截图转 LaTeX | formula block toolbar | 上传图片或截图后调用 OCR / math recognition |
| Resize formula | resize block | 调整 LaTeX 渲染大小或可用宽度 |
| 编辑 image caption | caption 区域 | caption 属于 block content 或 metadata，需后续定 |

文本编辑的第一原则是不要和用户已有习惯作对：

```text
Enter:
  当前 NoteBlock 内换行。

Ctrl+Enter:
  创建新的 sibling NoteBlock。
```

如果未来需要保留 Shift+Enter，也应该作为兼容快捷键，而不是第一心智入口。

富文本工具栏只在选中文字时出现。第一版最少应包含：

- bold；
- italic；
- underline；
- font size；
- font family，第一版可限制；
- align left；
- align center；
- align right。

字体规则：

- 第一版应内置常用字体集合；
- 中文字体至少需要覆盖宋体类、黑体类、楷体类等常见阅读习惯；
- 英文字体至少需要覆盖 sans、serif、mono 三类；
- 用户不需要开发字体；
- 后续可以支持用户下载或导入字体文件，再加入个人 font catalog；
- 字体选择应服务阅读和排版，不做复杂字体工作室。

段落控制规则：

- 第一版先做左对齐、居中、右对齐；
- 首行缩进、尾部缩进、标尺控制、复杂段落 spacing 暂不进入第一版；
- 如果真实写作中反复出现需求，再把这些能力补入 paragraph controls。

快捷键应尽量沿用 Word / Google Docs / Notion / AFFiNE 的通用习惯。若某个快捷键和浏览器默认行为冲突，只有在 editor 明确获得焦点时才拦截。

Formula block 的编辑要分成两面：

```text
Raw LaTeX input:
  用户输入或粘贴公式源码。
  不做富文本字体、粗体、下划线等样式编辑。

Rendered preview:
  用户看到最终公式。
  可通过 block resize 改变显示大小或换行空间。
```

由于普通用户未必会手写 LaTeX，Formula block 必须预留图片 / 截图转 LaTeX 的入口：

```text
用户点击 formula toolbar 中的 image/screenshot 按钮
  -> 上传图片或进行截图
  -> 调用 OCR / math recognition
  -> 生成 raw LaTeX
  -> 用户在 preview 中检查并修正
```

这个能力不一定立刻进入第一版，但一定要保留在 Formula block 设计里。第一版如果成本可控，可以先做上传图片转 LaTeX；截图工具可以后置。

LaTeX 字体家族、复杂公式样式等可以后置。第一阶段最重要的是：公式可输入、可预览、可保存、可 resize，错误 LaTeX 不吞内容。

### 4.3 排版与布局

| 操作 | 推荐入口 | 第一版行为 |
|---|---|---|
| 选中 block | 点击 block 边缘、内容或内部空白 | 显示轻边框 |
| 移动 block | 拖动非 resize handle 的边框区域 | 改 BlockBox placement |
| Resize block | 拖动 8 个 resize handles | 改 width/height，文本 reflow |
| 多 block 并排 / 邻接布局 | 在已有 block 周围空白处创建新 block | 核心场景 |
| 水平对齐 | drag + snap guide | 第一版做轻量吸附 |
| 垂直对齐 | drag + snap guide | 第一版做轻量吸附 |
| 进入 Layout Edit Mode | 快捷键 / 弱 topbar toggle | 用于批量布局，不默认编辑内容 |
| 退出 Layout Edit Mode | 同一快捷键 | 回到普通阅读/写作状态 |
| Layout mode 内选中 block | 单击 block | 选中、移动、resize，不进入文字内容 |
| Layout mode 内编辑内容 | 双击 block | 才进入该 block 的内容编辑 |
| 多选 | Shift+click / marquee / batch mode | 分为空间多选和批量操作多选 |
| Duplicate | toolbar / right-click / shortcut | 创建新内容或新 projection 必须区分 |

Selected block 的基础形态：

```text
用户点击 block 边缘、内容区、或 block 内部空白区域
  -> block 进入 selected state
  -> 显示轻边框
  -> 显示 8 个 resize handles
```

8 个 resize handles：

- top-left；
- top；
- top-right；
- right；
- bottom-right；
- bottom；
- bottom-left；
- left。

拖动任意 handle 都会改变 block size。用户需要这些明确的着力点，而不是只能猜测边框能不能拖。

移动规则：

```text
鼠标移动到边框区域
  如果不是 8 个 resize handles
    -> 显示 move cursor
    -> 按住拖动时移动整个 block
```

这能把 resize 和 move 分开，减少误操作。

多选需要分成两种不同心智。

第一种是空间多选：

```text
Shift+click:
  在当前 page / surface 内逐个加入或移除 selected blocks。

Marquee / 框选:
  用户在空白处拖出一个矩形选区。
  矩形内的可见 blocks 被一起选中。
```

`marquee` 的中文就是“框选”。它适合 layout edit mode 里的空间选择，尤其是用户想把一组相邻 block 一起移动、对齐或复制。

空间多选后的能力：

- 一起移动，保持相对位置不变；
- 一起 duplicate；
- 一起 align / distribute，后续可做；
- 一起 attach source；
- 一起设置 export / AI visibility，后续可做。

第二种是批量操作模式：

```text
用户点击单独按钮进入 batch selection mode。
进入后不需要按 Shift。
单击 block 即可加入或移出批量选择。
```

批量操作模式服务的是跨页面、跨 surface、跨配置的批处理，而不是空间排版。它不应该支持拖动整组选区移动位置，避免用户误以为跨页面对象可以作为一个空间组移动。

批量操作模式适合：

- attach one source to many blocks；
- attach multiple sources to many blocks；
- delete blocks；
- duplicate；
- include / exclude from export；
- mark as scratch / formal；
- show / hide to AI。

多 block 排版不应该被写死成“左文右图”或“左文右文”。更准确的目标是：

```text
用户可以在任意已有 block 的上、下、左、右可用空间中创建新 block；
系统根据点击位置寻找最符合用户心智的可用矩形；
新 block 应尽量与邻近 block 顶部、文本 baseline、边缘或页面 margin 对齐。
```

如果一个 block 位于页面中间，两侧都有空白：

- 点击左侧空白，应在左侧可用区域创建 insertion/caret；
- 点击右侧空白，应在右侧可用区域创建 insertion/caret；
- 如果上方或下方已有 block，系统需要识别这个有限区域，避免把新 block 插到不符合点击意图的位置。

### 4.4 Source 操作

| 操作 | 推荐入口 | 第一版行为 |
|---|---|---|
| Attach source | selected toolbar / right-click / inspector | 给当前 block 添加一个或多个 source |
| `/add source` | slash command | 给当前 block 添加 external/internal source，不插入 source 内容 |
| Attach source to selected blocks | batch mode / multi-select toolbar | 给多个选中的 blocks 添加同一个或多个 source |
| Attach selected source range | source panel -> selected block | 支持后续补 |
| View source | source badge / inspector | jump target |
| Remove source reference | inspector / right-click | 只移除当前 block 的某一条 source reference，不删除 source object |
| Clear all source references | inspector / right-click | 清空当前 block 的全部来源，需轻确认 |
| Clear sources from selected blocks | batch mode | 批量清空所选 blocks 的 source references，需显示影响数量 |
| Archive source document | Source Library | 归档 source，不破坏已有引用链 |
| Deprecate source version | Source Library | 标记旧版本不推荐继续使用，不改写旧引用 |
| Delete source document/version | Source Library | 危险操作，需影响预览和二次确认 |
| Show source coverage | inspector | 显示 source-free / source-backed |
| Mark unsupported | AI/review layer | 不作为普通用户常驻按钮 |

`/add source` 是 attach provenance，不是插入内容。推荐流程：

```text
用户在 block 中输入 /add source
  -> 打开 Source Picker
  -> 搜索 external source / internal note / internal block
  -> 选择范围
  -> 选择引用方式
  -> 当前 block 出现 source badge
```

第一版 source 范围：

```text
External source:
  whole source
  page
  page range

Internal source:
  whole note/report
  NoteBlock
```

第一版不做：

```text
block 内句子级引用
external PDF bbox / paragraph range
富文本 offset tracking
```

引用方式第一版建议：

```text
copied_from
excerpt_copied_from
adapted_from
summarized_from
inspired_by
supports
```

Source Picker 应复用在：

- `/add source`；
- selected toolbar；
- right-click menu；
- inspector；
- batch mode。

Source 操作命名必须避免混淆：

```text
Remove source reference:
  从当前 block 移除某一条 source reference。

Clear all source references:
  清空当前 block 的全部来源。

Attach source to selected blocks:
  给多选 blocks 添加同一个或多个 source。

Clear sources from selected blocks:
  批量清空所选 blocks 的 source references。

Archive source document:
  隐藏/归档 source，不破坏已有引用链。

Deprecate source version:
  标记旧 source version 不推荐继续使用。

Delete source document/version:
  危险操作，删除 source object 或 snapshot，必须显示影响范围和二次确认。
```

删除后的 UX：

- note 顶部显示 broken/degraded source warning；
- 受影响 block 显示轻量感叹号 badge；
- Source inspector 显示 `source missing`、`source deleted`、`version outdated`、`internal chain broken`；
- 如果有 tombstone 或 excerpt snapshot，允许查看恢复信息；
- 如果 root external source 仍存在，但 internal chain 断裂，显示 `degraded` 而不是完全 `broken`。

Source chain 的默认阅读规则：

```text
Block inspector:
  默认显示 direct source + root source。
  full source chain 折叠显示。

Single note inspector:
  note-first，显示这篇 note 引用了哪些 source。

Global Source Library:
  source-first，以 external/root source 为根显示内部使用链。
```

### 4.4.1 Import / Existing Notes 操作

上传 source 时，用户需要选择 intent，而不是只上传文件：

```text
Use as evidence source:
  作为 textbook / paper / webpage / report 等证据材料，后续可摘取、总结、引用。

Reconstruct as editable note:
  作为已有笔记导入，尽量保留顺序、layout、公式、图像和图文关系，并重建为可编辑 NoteBlocks。

Archive only:
  只留档，不立即 OCR、重建、总结或生成 note。
```

Existing notes / condensed source import 的第一版 UX 预期：

- 保留原始阅读顺序；
- 保留图文相邻关系；
- 普通文字尽量进入 text/paragraph block；
- 公式尽量进入 formula block 或 LaTeX candidate；
- 手绘图、图表、截图区域保留 image crop；
- 无法确定的区域显示 warning，不静默丢弃；
- 结果先进入 preview/proposal，不静默覆盖正式 note；
- 用户可以选择把导入结果保存为新 note，或作为 later source / reference material 保留。

导入后的后续工作流：

```text
Imported weekly note
  -> reconstruct as editable note
  -> attach textbook pages or source references
  -> create relation candidates
  -> merge with week 2 / week 3 notes into semester note
```

```text
Agent briefing / human field note
  -> reconstruct or preserve as condensed source
  -> align with raw news/source reports
  -> mark evidence / interpretation / reasoning state
  -> produce a traceable briefing or report
```

第一版不做：

- full OCR/VLM production pipeline；
- 自动确认 ObjectRelation；
- 自动把 imported note 总结成另一篇 note；
- sentence-level imported note citation；
- full layout-perfect reconstruction。

### 4.4.2 Link / InternalLink 操作

| 操作 | 推荐入口 | 第一版行为 |
|---|---|---|
| Add internal link | text selection toolbar / slash / right-click | 创建到 note、block、page 或 view 的导航链接 |
| Open linked note/block | click link | 跳转到目标对象 |
| Copy link to note/block | right-click / command palette | 复制内部链接 |
| Remove link | text selection toolbar / inspector | 移除导航链接，不删除目标对象 |

Link 是 navigation，不是 source evidence，也不是 semantic relation。

```text
Link:
  去哪里看。

SourceReference:
  凭什么说。

ObjectRelation:
  它们是什么关系。
```

如果正文 link 同时也是证据来源，用户仍应 attach SourceReference。如果 link 代表前置阅读、推导、例子等语义关系，用户仍应创建或确认 ObjectRelation。

### 4.4.3 Structured Field 操作

Structured block 的字段分三层：

```text
FieldSchema:
  TemplateDefinition 定义有哪些字段。

FieldValue:
  用户在当前 NoteBlock 里填写的内容。

FieldLayout / RenderTemplate:
  字段在页面上怎么显示、移动、resize、隐藏、调整字体和边框。
```

普通 note 编辑允许：

- 编辑 field value；
- 选中 field box；
- 移动 field box；
- resize field box；
- 修改 field display style；
- 隐藏/显示可选字段；
- 调整字段在 block 内的视觉位置。

普通 note 编辑不允许：

- 删除字段定义；
- 新增底层字段定义；
- 重命名字段 key；
- 改变字段的数据类型。

这些 schema 级操作应进入 Template Studio。

### 4.5 Relation 操作

| 操作 | 推荐入口 | 第一版行为 |
|---|---|---|
| Create visual connector | selected block toolbar / layout mode / relation mode | 创建视觉箭头或线，不自动创建语义关系 |
| Add relation from block | selected block toolbar | 从当前 block 的连接点拉出 connector |
| Attach connector endpoint | drag connector endpoint to connection point | 两端都 attach 后才算视觉连接完成 |
| Bind semantic relation | connector inspector / relation mode | 用户选择 relation type、direction、source/target 后创建或绑定 ObjectRelation |
| Convert visual connector to relation | connector inspector | 把已有视觉 connector 升级为系统可读 relation |
| View related blocks | relation badge / inspector | 打开列表或 local graph |
| Hide relation layer | relation filter | 只改显示，不改 truth |
| Delete visual connector | right-click / inspector | 只删除视觉 connector，除非用户明确处理 semantic relation |
| Unbind relation | inspector | 解除 visual connector 与 ObjectRelation 的绑定，不删除对象 |

Relation 的基础分层：

```text
CanvasArrow / CanvasConnector:
  视觉对象。
  用户可以画、移动、换样式、删除。
  它可以只是视觉提示，不代表知识关系成立。

ObjectRelation:
  语义对象。
  系统和 AI 可以读取。
  必须由用户确认、AI proposal apply、或明确的 relation action 创建。
```

因此，用户在 canvas 上画箭头，不应该自动创建 `ObjectRelation`。几何连接只说明视觉上连上了，不说明这两个 `NoteBlock` 在知识上存在 `derives_to`、`supports`、`read_before` 等关系。

推荐流程：

```text
用户选中 NoteBlock
  -> 点击 selected toolbar 中的 Connect / Add relation
  -> 从该 block 的 connection point 拉出视觉 connector
  -> 拖到另一个 block 的 connection point
  -> 创建 attached visual connector
  -> 用户在 inspector / relation mode 中选择是否绑定 semantic relation
```

按钮命名可以后续细定，但 UX 上应避免让用户以为“画一条线就已经创建知识边”。更准确的分层是：

```text
Connect:
  创建视觉连接。

Bind as relation:
  创建或绑定语义关系。
```

Relation mode 和 Layout mode 都可以编辑 relation，但主任务不同：

```text
Layout mode:
  以 block 排版为主。
  可以编辑视觉 connector，但不强制显示所有隐藏 relation。

Relation mode:
  以 relation 显示、审查、批量编辑为主。
  应显示可视 connector、隐藏 relation、未绑定 connector、relation-backed connector。
  允许批量审查、绑定、解绑、隐藏、筛选 relation layer。
```

Relation mode 是一种 relation-focused view/mode，不只是画线工具。它可以和 layout mode 有交集，但不能完全合并，因为用户需要一个专门理解和整理关系的工作状态。

连接点规则：

```text
ConnectionPoint:
  属于 BlockBox / placement 的交互控制点。
  用于 connector endpoint attach。
  不属于 NoteBlock 内容本身。
```

第一版推荐：

- 每个 block 默认不常驻显示 connection points；
- selected / layout mode / relation mode 时显示；
- 用户点击 `Connect` 时，在最接近鼠标位置的 block 边缘创建或激活 connection point；
- connection point 可以沿 block 边框/轮廓移动；
- 不建议第一版允许 connection point 任意落在文字内容内部，避免被文字覆盖、点不到、或影响阅读；
- 一个 connection point 可以挂载多条 connector；
- 当同一点连接多条线时，视觉渲染需要轻微 fan-out / offset，避免所有线完全重叠；
- 用户可以为一个 block 创建多个 connection points，用于连接上、下、左、右不同方向的 blocks；
- connection point 的位置应存为相对 placement 的坐标或边缘参数，这样 resize 后仍能保持合理位置。

待后续研究：

- connection point 是否允许进入 block 内部非文字区域；
- connection point 是否支持不同样式、颜色或语义标签；
- 多条 connector 挂在同一点时的自动分叉规则；
- relation-backed connector 是否需要和 visual-only connector 有明显但克制的视觉差异。

### 4.6 Export / Visibility 操作

| 操作 | 推荐入口 | 第一版行为 |
|---|---|---|
| Include in export | inspector / right-click | 设置 export_role |
| Exclude from export | inspector / right-click | 页面外默认 exclude |
| Mark as scratch | right-click / inspector | 转为草稿层，默认不导出 |
| Mark as formal content | right-click / inspector | 转为正式层，默认参与导出 |
| AI visible | inspector | 设置 AI visibility |
| AI hidden | inspector | 仍保存，但 AI 不默认读取 |
| Export preview | topbar | 显示哪些对象会导出 |

### 4.7 危险操作

| 操作 | 推荐入口 | 安全规则 |
|---|---|---|
| Delete block | Delete / Backspace / right-click | 直接删除 block，但必须支持 undo |
| Remove source reference | inspector / right-click | 只移除当前 block 的某条 source reference，保留 history |
| Clear all source references | inspector / right-click | 清空当前 block 的全部来源，需轻确认 |
| Delete source document/version | Source Library | 危险操作，必须影响预览、二次确认，并产生 broken/degraded warning |
| Hard template migration | Template Studio | proposal-first |
| Package import apply | Package Studio | preview-first |
| Domain refinement apply | Studio | proposal-first |

Block 删除应该符合普通编辑软件心智。用户创建 block 可能很随意，因此删除也需要足够直接。

推荐规则：

```text
Delete / Backspace:
  删除当前 selected block 或 selected blocks。

Ctrl+Z:
  撤回删除，恢复 block 和它的 placement。

Ctrl+Y:
  重做删除。
```

这里的“直接删除”是用户体验意义上的删除。工程上仍应通过 undo stack / operation history / short-lived recovery record 保证可恢复，而不是每次删除都弹出强确认。

第一版不提供 `Remove from page` 作为普通用户操作。

原因：

- 如果只是移除 projection，不删除背后的 NoteBlock，用户会看不到对象但数据仍存在；
- 在没有 block library / reusable block / multi-placement 管理入口前，这会制造幽灵 block；
- 普通笔记编辑心智里，删除就是删除，恢复依赖 undo / redo。

未来如果引入一个 NoteBlock 被多个 page / view 复用的模型，再重新评估 `Remove placement from this page`。

---

## 5. 控件与入口分层

### 5.1 App Shell / Sidebar

常驻：

- app logo；
- Projects；
- Notes 或最近 notes；
- Favorites；
- Search；
- Sources；
- Templates / Studio；
- Settings。

不常驻：

- selected object scope；
- canvas node id；
- source board 细节；
- relation layer debug；
- package import/export 细节；
- proposal apply 细节。

### 5.2 Page Topbar

常驻或一级入口：

- back / breadcrumb；
- note title；
- view mode；
- undo / redo；
- search in note；
- export / preview；
- inspector toggle；
- more menu。

放入 more 或弱显示：

- page size；
- zoom；
- snap toggle；
- batch selection mode；
- layout mode；
- relation mode；
- relation visibility；
- source panel toggle；
- debug mode。

不建议常驻：

- Plan layout；
- Use composition；
- Source Board；
- operation batch；
- template id；
- selected object scope。

### 5.3 Caret / Slash Command

Slash command 的触发符使用 `/`。

入口示例：

- `/text`
- `/heading`
- `/definition`
- `/formula`
- `/image`
- `/code`
- `/table`
- `/quote`
- `/callout`
- `/source quote`

菜单结构：

```text
一级:
  block category

二级:
  concrete block type / template variant
```

键盘规则：

- Up / Down: 在当前层移动；
- Enter: 选择当前项或进入当前类目；
- Left: 返回上一级；
- Esc: 关闭菜单；
- 鼠标左键: 选择或进入类目。

第一版不需要把所有 `TemplateDefinition` 全部铺开。推荐先展示高频 template、最近使用和搜索结果。用户自定义 template 必须能被搜到，并归入对应 category。

### 5.4 Text Selection Toolbar

只在选中文字时出现：

- bold；
- italic；
- underline；
- font size；
- font family；
- align left；
- align center；
- align right；
- inline code；
- inline formula；
- link；
- comment；
- text color 或 highlight，第一版可推后。

### 5.5 Block Hover

hover 显示轻量 affordance：

- 弱边框；
- drag handle seed；
- source count badge；
- relation count badge；
- comment / note badge；
- type hint，避免常驻。

Hover 不应该显示所有危险操作。

### 5.6 Selected Block Floating Toolbar

选中 block 后出现：

- block type；
- duplicate；
- convert；
- attach source；
- connect；
- bind relation，放入 more 或 inspector；
- layout；
- more。

如果 block 正在文本编辑，toolbar 应避免挡住输入。

### 5.7 Layout Edit Mode

Layout mode 是一个轻量批量排版模式。

推荐触发：

```text
按一次快捷键进入；
再按一次同一快捷键退出。
```

这个模式不应该像重型设计软件。它的核心用途是让用户快速调整多个 `NoteBlock` 的位置、大小、导出状态和对齐关系。

Layout mode 也可以编辑 visual connector 和 connection point，但它的重点仍然是 block 的布局排版。它不应该自动展开所有隐藏 semantic relations，也不应该把关系审查变成默认任务。

Layout mode 中的点击规则：

```text
单击 NoteBlock:
  选中 block，允许移动、resize、查看状态。

双击 NoteBlock:
  进入该 block 的内容编辑。
```

因此，在 layout mode 里，单击 text block 不应该直接把光标放进文字里。这个模式服务的是批量布局，不是逐字写作。

Layout mode 应显示：

- 所有 block box 边界；
- resize handles；
- drag handles；
- alignment guides；
- snap hints；
- page margins；
- export boundary；
- outside workspace boundary；
- scratch / excluded-from-export 标记。

Layout mode 不应该默认修改内容。

对于不会被导出的 block，显示方式应该非常轻：

```text
正式内容:
  不需要常驻标签。

scratch / excluded:
  在角落显示轻量 scratch 图标。
  hover 或点击图标时显示 tooltip:
    This block is not included in export.
```

将正式 block 转为 scratch，或将 scratch 转为正式内容，应该放在右键菜单和 inspector 中，而不是做成常驻按钮。

### 5.8 Relation Mode

Relation mode 是 relation-focused mode。

它的目的不是替代 layout mode，而是让用户集中查看和编辑关系：

```text
显示所有可见 connector；
显示隐藏 relation 的轻量线索；
显示 visual-only connector；
显示 relation-backed connector；
显示 incomplete / unbound connector；
允许筛选 relation layer；
允许批量 bind / unbind / hide / delete visual connector。
```

Relation mode 中：

- block 仍然可以被选中；
- connector 和 connection point 的显示优先级高于 block resize handle；
- 用户可以从 block connection point 拉出新 connector；
- 用户可以选中 connector 打开 relation inspector；
- 双击 block 仍可进入内容编辑，但不是此模式主任务；
- 未绑定语义关系的 visual connector 应有轻量提示；
- 已绑定 `ObjectRelation` 的 connector 应可在 inspector 中看到 relation type、direction、source/target、layer。

Relation mode 应避免把页面变成一团线。默认可以按 layer、范围、selected block 相关性做显示限制。

### 5.9 Context Menu

右键菜单适合：

- duplicate；
- copy；
- delete block；
- attach source；
- attach source to selection；
- open source；
- create relation；
- export intent；
- mark as scratch；
- mark as formal content；
- AI visibility；
- properties；
- debug info，只有 debug mode 下出现。

### 5.10 Inspector

Inspector 是结构信息主入口。

建议 tab：

- Content；
- Layout；
- Source；
- Relation；
- Template；
- Export；
- AI；
- History；
- Debug。

Inspector 不是普通写作入口。它是解释、审查和高级修改入口。

### 5.11 Debug / Agent Context

只在 debug mode 或 agent command preview 中显示：

- ids；
- target_type / target_id；
- template_definition_id；
- source ids；
- relation ids；
- operation batch；
- proposal payload；
- snapshot status。

### 5.12 Batch Selection Mode

Batch selection mode 是一个明确按钮或菜单项启动的批处理模式。

推荐入口：

- topbar more menu；
- selected toolbar 的 `Select multiple`；
- inspector 或 command palette；
- 必须预留快捷键，但具体按键暂不锁定。

进入后：

```text
单击 block:
  toggle selected for batch。

再次单击 selected block:
  从 batch selection 中移除。

Esc:
  退出 batch mode。
```

Batch mode 的 toolbar 应只显示批量动作，不显示空间拖动提示。

推荐批量动作：

- attach source；
- detach source，需确认；
- include / exclude from export；
- show / hide to AI；
- mark as scratch / formal；
- duplicate；
- delete blocks。

限制：

- 不支持拖动整组选区移动；
- 不支持 resize 整组选区；
- 不默认显示每个 block 的全部 metadata；
- 跨页面/跨 surface 选择时，应通过列表、outline 或 batch tray 显示已选对象。

---

## 6. 状态机

### 6.1 Reading Mode

默认状态。

显示：

- 内容；
- 轻量 source/relation badge，必要时；
- caption / attribution。

隐藏：

- 强边框；
- resize handles；
- debug metadata；
- action buttons。

### 6.2 Hover State

显示：

- 轻边框；
- 小 handle；
- badge；
- tooltip。

不显示：

- 大量按钮；
- debug ids；
- 危险操作。

### 6.3 Selected State

显示：

- 清晰边框；
- local toolbar；
- resize handle；
- source/relation/template badge；
- inspector 可同步更新。

Selected state 分三种：

```text
single selected:
  一个 block 被选中，可编辑 layout、source、relation、export、AI visibility。

spatial multi-selected:
  多个同一 page / surface 内的 blocks 被选中。
  可以作为空间组一起移动，保持相对位置。

batch selected:
  一个或多个 blocks 被加入批量操作。
  可以执行 attach source、delete、duplicate、export/AI visibility 等批量动作。
  不作为空间组移动。
```

### 6.4 Text Editing State

显示：

- caret；
- text selection toolbar；
- slash command；
- minimal block boundary。

避免：

- 大边框闪烁；
- toolbar 遮挡输入；
- 每个 block 都像表单。

### 6.5 Layout Edit Mode

显示：

- 所有 block boundaries；
- handles；
- snap lines；
- page margins；
- export boundary；
- scratch / excluded-from-export 角标。

适合：

- move；
- resize；
- align；
- multi-select；
- export role quick edits。

交互规则：

- 单击 block 只选中，不进入文本编辑；
- 双击 block 才进入内容编辑；
- shortcut toggle 进入和退出；
- 所有 scratch / excluded block 都需要轻量可见，避免用户误以为它会被导出。

### 6.6 Relation Mode State

显示：

- visual-only connectors；
- relation-backed connectors；
- incomplete / unbound connectors；
- connection points；
- relation layer filter；
- selected connector inspector。

行为：

- 可以创建 visual connector；
- 可以把 visual connector bind 成 semantic relation；
- 可以 unbind relation；
- 可以 hide/show relation layer；
- 可以批量审查 relation；
- 可以按 selected block 过滤相关关系；
- 不应默认显示所有跨页、跨文档关系，避免视觉混乱。

### 6.7 Resizing State

行为：

- width 更新；
- text reflow；
- height auto grow；
- 不吞文字；
- 不改 NoteBlock content；
- 显示尺寸提示和 snap line。

### 6.8 Dragging State

行为：

- 显示 alignment guide；
- 避免意外覆盖，至少在第一版给出碰撞提示；
- page-in / page-out 状态要可见；
- 拖到页面外时 export role 默认可能改变为 scratch，需要提示。

### 6.9 Context Menu State

行为：

- 锁定当前对象；
- 提供完整对象操作；
- 不影响 selection；
- 危险操作进入确认。

### 6.10 Export Preview State

显示：

- included objects；
- excluded objects；
- page boundary；
- source/citation summary；
- warnings。

### 6.11 Debug Mode

显示：

- ids；
- metadata；
- relation state；
- source state；
- operation/history。

Debug mode 必须明显区别于普通使用。

---

## 7. Block 默认样式决策

### 7.1 Paragraph

默认：

- 无强边框；
- 像正文；
- 宽度默认 formal page content width；
- selected 后显示边框和 toolbar；
- layout mode 显示完整 box。

### 7.2 Heading

默认：

- 更大字号和层级间距；
- 不显示 type pill；
- 可通过 slash 或 toolbar 设置层级。

### 7.3 Formula

默认：

- display formula 居中或按 block alignment；
- inline formula 走富文本内容；
- 错误 LaTeX 显示 warning，但不阻止保存原文；
- selected 后可以显示公式操作；
- editing 后显示 raw input + rendered preview。

Formula block 更接近“可编辑源码的视觉对象”，而不是普通 paragraph。

编辑状态建议：

```text
Reading:
  只显示渲染后的公式。

Selected:
  显示轻边框、resize handle、formula toolbar。

Editing:
  上方或左侧显示 rendered preview。
  下方或右侧显示 raw LaTeX input。
```

约束：

- raw LaTeX input 不支持普通富文本样式；
- rendered formula 的大小优先通过 resize block 控制；
- formula alignment 可以通过 block alignment 控制；
- formula font family / advanced rendering style 暂不作为第一阶段重点；
- resize 不应该吞掉公式源码；
- LaTeX parse error 应显示 warning，并保留用户原始输入。

### 7.4 Image / Figure

默认：

- 可 resize；
- 可 caption；
- selected 后显示 crop / replace / caption / source 操作；
- 第一版可以不做复杂 crop editor。

### 7.5 Code

默认：

- monospace；
- 语言 label 弱显示；
- copy button hover 或 selected 才出现；
- 不做重型 IDE。

### 7.6 Quote / Source Quote

默认：

- quote visual；
- source badge；
- attribution 可选显示；
- source details 进 inspector。

### 7.7 Sticky / Scratch

决策：

- Sticky Note 和 Scratch Note 都是 `NoteBlock`；
- 二者不需要拆成两个底层对象；
- 差异主要来自长度、外观、位置、导出状态和使用场景；
- 页面外默认不导出；
- 页面内也可以被用户设为 scratch，因此同样可以不导出；
- 页面外 scratch 也可以和正式内容建立 relation。

第一版 UX 可以把它们作为特殊 appearance 的 NoteBlock：

```text
content truth:
  NoteBlock

layout truth:
  BlockBox / placement

export intent:
  excluded by default

appearance:
  sticky / scratch style
```

未来可以增加一种更进阶的 handwriting scratch block。它仍然可以是 NoteBlock，但内部打开后是一个可放大的手写画布。这个方向主要服务 iPad 或手写设备，不属于当前 Better Notebook 第一阶段重点。

---

## 8. 空白点击与空间插入规则

### 8.1 空白 note 第一次点击

规则：

```text
用户点击 formal page 正文区域
  -> 出现 caret
  -> 创建 local draft insertion
  -> 用户输入后持久化 text NoteBlock + BlockBox
```

不要在没有内容时写入大量空 NoteBlock。

### 8.2 双击空白处

规则：

```text
双击空白处
  -> 创建独立 block draft
  -> 位置取用户点击附近的可用矩形
```

如果用户在页面外双击，则创建 scratch placement。

scratch placement 仍然对应 `NoteBlock`。它不是临时图形，也不是丢弃式草稿。区别是默认不进入正式导出。

### 8.3 邻近空白处创建并排 block

当页面中已经存在一个或多个 block，用户在某个邻近空白区域点击或双击：

```text
找到点击位置所在的可用矩形
  -> 创建新 block draft
  -> 尽量与邻近 block 顶部、文本 baseline、边缘或 page margin 对齐
  -> width 使用该可用矩形的合理宽度
```

这是 Coincides 区别于传统单列 editor 的核心体验。

典型场景：

```text
页面中间已有一个 block。
左侧有空白，右侧也有空白。

用户点击左侧空白:
  在左侧可用区域创建 caret / draft block。

用户点击右侧空白:
  在右侧可用区域创建 caret / draft block。
```

如果该空白区域上方或下方也有其他 block，系统需要识别它是一个有限矩形，而不是简单地跳到页面下一行或页面底部。

### 8.4 避免覆盖

第一版可以使用简单 collision rule：

- 不自动创建会覆盖已有 block 的新 block；
- 可用宽度太小时，显示 insertion hint 或落到下一行；
- 后续再研究智能绕图和复杂 text flow。

---

## 9. Resize 与 Reflow 合同

Text block resize 后：

```text
NoteBlock plain_text 不变。
NoteBlock content_json 不变。
BlockBox width 改变。
渲染时文字按新宽度 reflow。
height 默认 auto grow。
导出按视觉宽度渲染。
AI 默认读取内容 truth，不按视觉换行读取。
```

第一版优先：

- auto height；
- min width；
- max width；
- no text clipping；
- resize preview；
- snap to nearby guides。

推后：

- fixed height overflow；
- multi-column flow；
- non-rectangular text wrap；
- ruler-like paragraph controls。

---

## 10. 对齐与吸附

第一版至少需要：

- page margin guide；
- nearby block edge snap；
- horizontal guide；
- vertical guide；
- same width hint；
- same height hint；
- text top guide；
- baseline guide，至少作为研究目标；
- snap toggle。

默认建议：

```text
普通写作:
  吸附默认开启，但保持轻量。

Layout mode:
  开启明显 guide。

用户拖拽时:
  临时显示对齐线。
```

Snap toggle 规则：

```text
默认:
  开启。

用户手动关闭:
  当前 note/session 中关闭。

重新打开 note:
  默认重新开启。
```

关闭入口：

- 右键点击画布空白处；
- context menu 中提供 `Snap to guides` toggle；
- 后续也可以放在 topbar more menu 或 layout mode 工具区。

用户需要关闭吸附的典型场景：

- 两个 block 的边界需要部分重叠，但实际内容不重叠；
- 用户要做非常细的位置微调；
- 用户在页面外 scratch 区做自由排布。

---

## 11. 文案与命名规则

当前 `Hide`、`Archive`、`Delete` 容易混淆，后续必须统一。

建议语义：

| 文案 | 行为 |
|---|---|
| Hide from page | 当前页面隐藏 projection |
| Restore to page | 恢复 projection |
| Delete block | 删除当前 block，可用 Ctrl+Z 撤回 |
| Exclude from export | 不导出 |
| Include in export | 导出 |
| Hide from AI | 默认 AI 不读取 |
| Show to AI | 允许 AI 读取 |

第一版不要把 `Remove from page` 暴露为普通用户命令。后续只有在明确存在 block library / reusable block / multi-placement 管理入口时，才重新考虑 `Remove placement from this page`。

不要用一个 `Archive` 代表所有删除/隐藏/移除行为。

---

## 12. 版本落点建议

### v2.6.0 或 BN-0

优先使用本文件做：

- 当前 UI command inventory；
- 当前组件地图；
- 当前页面入口盘点；
- action risk classification；
- phase plan 准备。

### v2.6.1 或 BN-1

使用本文件的 App Shell / Sidebar / Topbar 部分。

目标：

- Project / Note / Favorites；
- note-first 主工作区；
- advanced tools 后移。

### v2.6.2 或 BN-2

使用本文件的空白点击、slash、writing state。

目标：

- 点击即写；
- draft insertion；
- text NoteBlock；
- slash command。

### v2.6.3 或 BN-3

使用本文件的 BlockBox、resize、right-side insertion、snap。

目标：

- block 可 resize；
- text reflow；
- 左文右图；
- layout mode。

### v2.6.4 或 BN-4

使用本文件的 page/canvas/export boundary。

目标：

- formal page；
- outside workspace；
- export role；
- AI visibility。

### v2.6.5 或 BN-5

使用本文件的 visual language 和 controls。

目标：

- reading / hover / selected / layout state；
- toolbar；
- right-click；
- inspector；
- metadata 退到幕后。

---

## 13. 第一版不解决的问题

以下问题重要，但不应塞进第一版 UX inventory 实现：

- 完整 Style Studio；
- 完整 Role Studio；
- 完整 Concept system；
- 完整 SourceRegion；
- 完整 OCR/VLM source import，Formula block 的图片转 LaTeX 可作为较小能力单独提前；
- Microsoft GraphRAG product adoption；
- Neo4j migration；
- full AFFiNE fork；
- external agent API；
- iPad handwriting；
- handwriting scratch block；
- full PDF visual rendering；
- marketplace。

---

## 14. 待 Henry 审阅的问题

1. 空白 note 第一次是单击即写，还是双击才创建 block？
2. Enter 默认是当前 block 内新段落，还是创建 sibling block？
3. 左侧 block 缩窄后，右侧空白单击是否也创建 block，还是必须双击？
4. Layout mode 的默认快捷键用哪一个？
5. Source badge 在 reading mode 是否常驻弱显示，还是 hover 才显示？
6. Relation badge 是否常驻弱显示，还是 selected 才显示？
7. Page 外 scratch 是否默认 AI visible？
8. 未来是否需要 `Remove placement from this page`，以及它依赖的 block library / multi-placement 管理入口是什么？
9. 第一版是否需要多选，还是推到后续？
10. Handwriting scratch block 何时进入 iPad / stylus 路线？

---

## 15. 初版结论

Better Notebook 的 UX 重写不能从“做一个更漂亮的 Canvas”开始。

它应该从一份明确的 inventory 开始：

```text
对象清楚；
操作清楚；
入口清楚；
状态清楚；
危险程度清楚；
数据 owner 清楚。
```

这份文档的核心判断是：

```text
Coincides 可以是 canvas-backed，
但用户第一感觉必须是 notebook。

Coincides 可以拥有 NoteBlock / Source / Relation / Template / Proposal，
但这些结构必须按需显露。

Coincides 可以自由排版，
但自由排版必须有对齐、吸附、导出边界和数据恢复规则。
```

下一步如果 Henry 认可，本文件应成为 `v2.6.0 / BN-0` 的启动 reference，并在每个 UX 版本完成后继续回写。
