# R2 - Better Notebook 核心交互规格

**Created**: 2026-06-05
**Status**: Complete
**Scope**: Better Notebook Research R2
**Evidence Level**: Existing Coincides research, current Coincides code evidence, Browser Harness limited observation, design inference

## 目的

R2 要把 Better Notebook 的核心体验从“想法”变成“规格”。

R1 已经说明成熟笔记软件的第一层体验应该是：用户打开页面后先感觉自己能写，而不是先看到工程对象。R2 在此基础上进一步回答：

```text
Coincides 的 NoteBlock 既然是内容 truth，
那它怎样才能在用户面前像自然文档和自由文本框一样工作？
```

R2 不讨论完整 UI 美化，不讨论 Agent note generation，也不决定最终采用 BlockSuite、自研 editor 还是 hybrid。R2 只锁定第一组核心交互规则，作为后续 R3-R10 和新版 Better Notebook roadmap 的基础。

## 本报告必须回答的问题

- Coincides 是否应该单击就创建 block，还是双击更安全？
- 如何避免用户误点生成大量空 block？
- 默认 block 宽度应该是整页、半页，还是当前位置到右边界？
- 用户缩窄左侧 block 后，在右侧空白处点击/双击应该发生什么？
- 同一行多个 block 的 baseline / top alignment 如何处理？
- block resize 后文字如何 reflow，height 如何增长？
- normal writing mode、selection state、layout edit mode 怎样分工？
- slash command 如何连接 runtime `TemplateDefinition`，但不暴露工程字段？
- block resize / movement 是否影响 source、relation、template truth？

## 本阶段必须读取的旧 reference

R2 继承 R0 的 reference 选择规则，实际使用了：

- `docs/brainstorm/BetterNoteBook Research/R0-reference-index-and-research-intake.md`
- `docs/brainstorm/BetterNoteBook Research/R1-notion-affine-mature-notebook-baseline.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`
- `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`

R2 也读取了当前实现证据：

- `client/src/pages/Notes/NoteDetail.tsx`
- `client/src/pages/Courses/LearningCanvasSurface.tsx`

## PI-046 Consistency / Conflict Check

R2 不推翻 PI-046。R2 把 PI-046 R4/R5 和 R4-R5 补充调研里的判断正式规格化。

继承的 PI-046 结论：

- 当前 NoteDetail 是工程 seed，不是成熟 editor。
- 当前 Canvas 有 move/resize/pan/zoom 种子，但还不是自然 page editor。
- `NoteBlock = 内容 truth`。
- `BlockBox / Placement / CanvasNode = layout / projection truth`。
- 用户应像写文档一样开始，而不是先选择模板、填 textarea、点 Add block。
- Coincides 需要二维 page layout：左文右图、左右段落、公式/图片/文本并排是核心能力，不是装饰。

R2 的新增判断是：
PI-046 里尚未完全锁定的“单击还是双击”“右侧空白创建 block”“临时空 block 如何避免持久化”等问题，需要在 Better Notebook 第一阶段就给出默认规则，否则工程实现会继续退回面板式 Add Block。

## Browser Harness Observation Log

### 观察对象

- 当前本地 Coincides：`http://localhost:5173/#/courses/9581258b-79da-41b5-a309-87cbf723a8b7`
- 当前页面：`Real Material Smoke Course`
- 当前浏览器能力：Browser Harness 可以连接 Henry 的 Chrome，并读取页面状态。

### 操作结果

Browser Harness 最初打开本地 Coincides 时进入登录页；Henry 手动登录测试账号后，Browser Harness 成功读取认证后的 Course / Canvas 页面。

可观察到的主界面状态：

```text
Canvas Document
Canvas is the primary document surface.
Source panels remain reference tools; the canvas should not live inside the growing material rail.
Plan layout
Use composition
Focus canvas
A4 portrait
5 nodes
Connect
83%
Add block
Hide / Restore
Relation Layers
Selected Object Scope
Course Material
Source snapshots
Selected source scopes
Source Board
```

R2 由此确认：当前 Coincides 已经比早期 Course Detail 右侧小气泡前进了一步，Canvas Document 已是 Course Detail 的主工作区之一，并且已经具备 Add block、Connect、Plan layout、Use composition、Hide/Restore、Relation Layers、Selected Object Scope 等工程能力。

但它仍不是 Better Notebook 所需的自然 page editor：

- 用户看到的是一个课程级工作台，而不是打开空白 note 后的自然页面；
- `Add block` 仍是命令/面板入口，而不是“点击页面出现光标”的写作入口；
- Source snapshots、Selected source scopes、Source Board、Course Material 等参考区仍然在同一页面内大量占据视觉空间；
- Canvas node 显示仍带有 `source board node`、`note block`、Open、Hide 等工程对象痕迹；
- 当前页面可以作为 canvas/projection seed，但还不能作为成熟 notebook surface 的最终体验。

### 限制说明

- 本轮没有提交新 block、移动节点或改变数据，只做非破坏性观察。
- 本轮没有进入独立 NoteDetail 页面做空白 note 输入测试；NoteDetail 的判断仍主要来自源码。
- Browser Harness 截图只作为本地临时证据，不提交进仓库。
- 后续实现阶段仍应补一轮 authenticated smoke：空白 note、首次点击、slash command、右侧空白创建并排 block、resize/reflow、reload persistence。

## Notion / AFFiNE 观察

R2 直接复用 R1 的成熟体验基线：

- Notion 的成熟点是“先写，后理解 block”。
- Notion 的 slash command 把 block type 入口放在光标附近。
- Notion 的 hover handle / selected text toolbar / block menu 证明复杂结构可以按需显露。
- AFFiNE 的成熟点是 page 与 edgeless / whiteboard 可以在同一 workspace 里共存。
- AFFiNE 的 frame、connector、sticky note、toolbar、sidebar/favorite 是空间工具和 app shell 的参考。

但 Coincides 不能照搬 Notion 单列 block flow，也不能照搬 AFFiNE 把 visual connector 当 semantic relation。Coincides 的核心体验应是：

```text
文档一样自然开始；
文本框一样自由排版；
画布一样可移动/缩放；
source/relation/template truth 仍由 Coincides 自己掌握。
```

## Coincides 当前实现对照

### NoteDetail 当前状态

`NoteDetail.tsx` 当前是表单/卡片式编辑：

```text
模板下拉
  -> textarea 输入
  -> Add block
  -> block card list
  -> 每个 block 内部 textarea 编辑
  -> Move up / Move down / Save / Move to trash
```

这证明当前后端和前端已经能创建、编辑、排序、保存、trash NoteBlock，但用户仍然明显感知自己在操作 block 数据对象，而不是在写一篇文档。

### LearningCanvasSurface 当前状态

`LearningCanvasSurface.tsx` 已具备可复用的 canvas seed：

- pan / zoom；
- node move；
- node resize；
- connect mode；
- edge inspector；
- Add block panel；
- Plan layout；
- runtime template options。

但它的 Add block 仍是面板式：

```text
打开 Add block panel
  -> 选择 template
  -> 填 title / textarea
  -> 点 Add block
```

这可以作为 layout/projection 的底座，但还不是 Better Notebook 的自然写作入口。

## 可复用旧成果

R2 建议保留以下 v2.x 成果作为 Better Notebook 的底层 seed：

- `NoteBlock` 创建、更新、trash；
- `note_block_placements`；
- `canvas_nodes` 的 `x/y/width/height/z_index`；
- runtime `TemplateDefinition` options；
- source reference / source jump；
- operation batch；
- canvas viewport；
- canvas move/resize 交互种子；
- ObjectRelation / CanvasEdge 的语义分层。

R2 建议冻结或重做以下表层：

- NoteDetail 的“模板下拉 + textarea + Add block”作为主入口；
- 每个 block 大卡片 + metadata 常驻；
- Move up / Move down 作为主要排版方式；
- Course Detail 中把 canvas/source/proposal 全部堆在右侧长面板的方式；
- Add block panel 作为唯一创建入口。

## 新增设计判断

### 判断 1：空白 note 首次单击应该进入写作，但不立即持久化空 block

Better Notebook 的空白页第一步应是：

```text
用户打开空白 note
  -> 单击 formal page 正文区域
  -> 页面出现 caret / insertion focus
  -> 系统创建一个 draft text block session
  -> 用户输入第一个字符或选择 slash command 后
  -> 持久化 NoteBlock + placement
```

理由：

- 用户期待单击即可写作。
- 直接持久化空 NoteBlock 会制造大量空记录。
- draft insertion focus 可以兼顾自然体验和数据清洁。

第一版可以采用更保守实现：前端先创建本地 draft block，只有满足以下任一条件才写入后端：

- 用户输入非空文本；
- 用户选择 `/image`、`/formula`、`/code` 等明确 block type；
- 用户粘贴内容；
- 用户手动确认创建。

### 判断 2：双击空白处用于创建独立空间 block

单击的语义是“我要开始写”。
双击空白处的语义应是“我要在这个空间位置新开一个独立 block”。

推荐分工：

```text
Enter = 当前 block 的编辑器语义，可能是新段落或 sibling block；
Shift+Enter = 当前 block 内软换行；
单击空白 = 放置 insertion focus，适合自然写作；
双击空白 = 在该空间位置创建独立 block draft；
```

这继承 R4-R5 补充调研的判断：用户在下方或右侧空白处双击，不是在当前段落内换行，而是在空间上创建新对象。

### 判断 3：默认 text block 宽度取“当前可用矩形”

新 text block 不应永远半页，也不应永远整页。它应根据点击位置的可用空间决定。

规则建议：

1. 如果 formal page 当前行带没有横向阻挡物：
   新 block 从 page content left margin 到 right margin，默认 full content width。
2. 如果鼠标所在 y band 左侧有图片、block、formula、sticky note 等阻挡物：
   新 block 从最近阻挡物右侧加 gutter 开始，到 page right margin 或下一个阻挡物前。
3. 如果鼠标点击的是页面右侧空白区域，且与左侧已有 block 的垂直范围重叠：
   新 block 与左侧 block 顶部或文本基线对齐，宽度使用右侧可用空白。
4. 如果可用宽度低于最小阈值：
   不创建重叠 block，提示用户或落到下一可用行带。

第一版不需要复杂自动绕图，只需要矩形避让和不要覆盖已有内容。

### 判断 4：右侧空白创建并排 block 是第一阶段核心能力

R2 明确把以下场景列为 Better Notebook 第一阶段必测场景：

```text
用户写一个 paragraph
  -> 进入 layout edit mode
  -> 把 paragraph 缩窄到左半页
  -> 在右侧空白处单击/双击
  -> 创建新的 text/image/formula block
  -> 新 block 与左侧 block 自然对齐
```

这不是高级排版功能，而是 Coincides 与 Notion 单列 block flow 的核心差异。

### 判断 5：resize 改 layout，不改内容 truth

当用户拖动 text block 的右边界：

```text
改变的是 placement / BlockBox / CanvasNode width；
不改变 NoteBlock plain_text；
不改变 content_json；
不改变 source reference；
不改变 relation；
不改变 template identity；
```

渲染层应在新的 width 内自动重排文本。默认 height 应是 auto grow，避免内容被吞掉。

第一版高度建议：

```text
height_mode: auto
min_height: optional
fixed_height: deferred
overflow warning: deferred unless fixed height exists
```

理由：用户最不能接受的是 resize 后内容不可见。固定高度、滚动、collapse、overset warning 可以留到后续。

### 判断 6：同一行 block 默认 top alignment，文本 block 可追加 baseline guide

R2 推荐第一版采用：

```text
不同类型 block 并排：top alignment；
相同字体/字号 text block 并排：可显示 text top / baseline guide；
图片与文字并排：默认 top alignment，可手动微调；
公式与解释并排：默认 top alignment，可通过 snap guide 对齐公式中心或顶部；
```

不要第一版就承诺完整排版软件级 baseline engine。但需要保留 guide / snap 设计空间。

### 判断 7：normal writing mode 与 layout edit mode 必须分层

Better Notebook 至少应有四种状态：

#### Reading state

- block 边框隐藏或极弱；
- source / relation / template metadata 不常驻；
- 页面像一篇可读文档；
- 页面外 scratch 可以弱化。

#### Writing state

- caret 可见；
- slash command 可用；
- selected text toolbar 可用；
- 当前 block 有轻量 focus outline；
- 不显示全局 resize handles。

#### Selection state

- 选中 block 显示边界；
- 显示 drag handle / mini toolbar；
- 显示 source / relation / export intent badge；
- 可以打开 inspector。

#### Layout edit mode

- 多个 block 可见边界；
- resize handles 可见；
- snap guides / alignment lines 可见；
- 可多选、移动、resize；
- 可以调 export intent；
- 可以切换 formal / scratch placement。

这个分层能解决 R1 提到的成熟体验问题：复杂结构必须存在，但不能常驻压在用户脸上。

### 判断 8：Slash command 是 runtime template 的人类入口

用户输入 `/` 后看到的应是：

```text
Text
Heading
Formula / LaTeX
Image
Code
Table
Quote
Source quote
Callout
Sticky note
```

而不是：

```text
template_definition_id
legacy_block_type
taxonomy_version
source_behavior_json
```

实现上，slash menu 可以通过 `/api/templates` 获取 runtime templates，但 UI 必须按人类可理解的类别分组：

- 基础内容；
- 数学 / LaTeX；
- 媒体；
- 代码；
- source-backed；
- callout / side note；
- domain-specific custom templates。

第一版建议：

- 默认 block 是 `text.paragraph`。
- `/formula` 创建或转换为 formula-like template。
- `/image` 创建 image block draft。
- `/code` 创建 code block。
- `/source quote` 创建 source quote block，但 source picker 可以后续完成。
- 自定义 template 在搜索结果中出现，但不要一开始铺满主菜单。

### 判断 9：block movement / resize 不影响 source、relation、template truth

R2 明确禁止：

- 拖动 block 改写 source anchor；
- resize block 改写 source scope；
- move block 改写 ObjectRelation；
- 改变 visual position 自动改 template；
- 页面外移动自动删除 source / relation。

允许：

- layout/projection records 更新；
- export intent 更新；
- `current_view_context` / `placement metadata` 更新；
- future AI 可以把 layout 作为辅助 context 读取。

关系应保持：

```text
NoteBlock 内容 truth
  + Placement/BlockBox layout truth
  + SourceAnchor/SourceRegion evidence truth
  + ObjectRelation semantic truth
  + TemplateDefinition capability contract
```

### 判断 10：空 block 清理必须内建

因为 Better Notebook 要支持点击/双击自然创建 draft block，必须定义空 block 生命周期。

建议规则：

- draft block 未输入内容，不写数据库；
- draft block 失焦且为空，直接丢弃；
- 用户按 Esc，取消 draft；
- 用户输入 `/` 后选择非文本 block，按对应 type 创建；
- 已持久化 block 如果被清空：
  - 短时间内可以保持为 empty editable block；
  - 离开页面时提示或自动转为 trash/draft history；
  - 不应静默制造大量空正式 block。

这可以避免“自然点击体验”变成数据库污染源。

## 最小规格草案

### 空白 note 首次输入

验收场景：

```text
打开一篇没有 block 的 note
  -> 单击 formal page 正文区域
  -> 左上正文边界出现 caret
  -> 输入 hello
  -> 系统创建一个 text NoteBlock
  -> refresh 后内容仍在
```

内部动作：

```text
create NoteBlock
create Placement / BlockBox
template = text.paragraph
width = formal page content width
height_mode = auto
export_role = formal
```

### 下方空白创建新 block

验收场景：

```text
已有一个 paragraph
  -> 用户在它下方空白区域双击
  -> 出现新的 caret
  -> 输入内容
  -> 系统创建独立 NoteBlock
```

区别：

- Enter 是文本编辑动作；
- 下方空白双击是空间创建动作。

### 右侧空白创建并排 block

验收场景：

```text
已有 paragraph，宽度为半页
  -> 用户在右侧空白处双击
  -> 新 text block 出现在右侧
  -> 新 block 与左侧 block 顶部对齐
  -> 用户输入后持久化
```

内部动作：

```text
detect usable rect
create draft block at x/y
persist only after content/type selected
placement.width = available right-side width
```

### Resize / Reflow

验收场景：

```text
已有长 paragraph
  -> 用户拖右边界到半页宽
  -> 文本自动提前换行
  -> block 高度自动增加
  -> 内容不被裁掉
  -> source/relation/template 不变
```

### Slash command

验收场景：

```text
空白 caret 输入 /
  -> 弹出 block type menu
  -> 选择 Formula
  -> 当前 draft 转为 formula block
  -> 输入 LaTeX
  -> 预览/保存
```

### Layout edit mode

验收场景：

```text
普通阅读时 block 无强边框
  -> 用户选中一个 block
  -> 显示弱边框和 mini toolbar
  -> 用户进入 layout edit mode
  -> 显示 resize handle、snap guide、drag handle
  -> 用户移动/resize
  -> layout persistence 生效
```

## 数据含义草案

R2 不锁最终表结构，但明确最小 layout record 必须能表达：

```text
note_id / notebook_surface_id
note_block_id
page_id
x
y
width
height_mode
height
z_index
export_role
placement_kind: formal | scratch | private | annotation
created_by
updated_by
layout_metadata
```

如果沿用现有结构：

- `note_block_placements` 可以继续表达 note 内 placement/order；
- `canvas_nodes` 可以继续承载 x/y/width/height seed；
- 但 Better Notebook 可能需要更明确的 `BlockBox` / `PageLayoutPlacement` 层，R6 再正式判断。

## 风险与未决问题

### 风险 1：自然输入和自由排版互相干扰

如果所有点击都创建 block，用户会误触；如果所有创建都要点按钮，体验又回到工程表单。R2 的 draft insertion focus 是折中，但需要实现细节验证。

### 风险 2：collision-aware insertion 可能复杂

第一版只做矩形空白检测，避免覆盖已有 block。复杂自动重排、绕图排版、多列 flow 留到后续。

### 风险 3：layout state 和 canvas state 可能重复

当前 `canvas_nodes` 已有 layout，但 note page editor 可能需要 page-aware placement。R6 必须处理这个分层，避免 `note_block_placements` 与 `canvas_nodes` 双写失控。

### 风险 4：slash menu 容易被模板系统淹没

v2.5 已经有 TemplateDefinition / DomainBlockSet / PackageManifest。Better Notebook UI 必须只显示人类可理解的模板命令，并通过搜索/筛选隐藏复杂系统模板。

### 风险 5：对齐体验如果缺失，自由排版会显得廉价

left/right side-by-side 一旦出现，snap guide、margin guide、top alignment、edge alignment 就会变成基础体验，而不是后期 polish。

## Roadmap Draft Impact

R2 建议新版 Better Notebook roadmap 的第一批工程阶段必须包含：

```text
Natural Page Editing + Freeform NoteBlock Box
```

第一阶段验收标准应包括：

- 空白 note 单击即可出现写作 caret；
- 输入后自动创建 `text.paragraph` NoteBlock；
- draft block 不输入内容不持久化；
- slash command 可切换基础 block type；
- text block 可 resize；
- resize 后文字 reflow，height auto grow；
- 左侧 block 缩窄后，右侧空白可创建并排 block；
- reading / writing / selection / layout edit mode 分层；
- block movement / resize 只更新 layout/projection；
- source / relation / template truth 不被 layout 操作改写。

R2 也建议 roadmap 把以下内容推后：

- 完整 rich text style editor；
- 复杂自动绕图；
- 多列自动 flow；
- 完整 table editor；
- AI note assembly；
- GraphRAG；
- Source Reconstruction。

这些能力很重要，但必须建立在自然 notebook surface 上。

## Backfeed Notes

R2 不反补 R0。

R2 对 R1 的收束是：

- Notion 的自然写作基线进入 Coincides 的单击/caret/draft block 规则；
- Notion 的 slash command 进入 runtime template 的人类入口；
- AFFiNE 的空间编辑基线进入 layout edit mode / canvas-like block-box；
- 但 Coincides 仍保留自己的 semantic truth 分层。

R2 对后续 R3-R5 的要求：

- R3 必须定义 formal page、outside scratch、多页和 export boundary 与 R2 block placement 的关系；
- R4 必须定义 text、formula、image、code、source quote、sticky note 等 block 的视觉语言；
- R5 必须定义 toolbar、hover、right-click、inspector、shortcut、delete/archive/hide 的分工。

## R2 结论

Better Notebook 的核心交互不是“能不能创建 NoteBlock”，而是：

```text
用户能不能像写普通文档一样开始，
又能像操作文本框一样调整 NoteBlock，
同时系统仍然清楚区分内容 truth、layout truth、source truth、relation truth 和 template contract。
```

R2 的推荐默认规则是：

```text
单击空白 formal page = 创建 draft insertion focus；
输入内容或选择 slash command = 持久化 NoteBlock；
双击空白区域 = 在该空间位置创建独立 block draft；
右侧空白可创建并排 block；
resize 只改 layout，文字 reflow，height auto grow；
layout edit mode 才显示强边界、handles 和 snap guides；
slash command 是 runtime template 的人类入口。
```

这组规则应成为新版 Better Notebook roadmap 的第一块地基。
