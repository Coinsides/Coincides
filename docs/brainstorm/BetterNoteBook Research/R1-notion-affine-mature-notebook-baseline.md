# R1 - Notion / AFFiNE 成熟笔记体验基线

**Created**: 2026-06-05
**Status**: Complete
**Scope**: Better Notebook Research R1
**Evidence Level**: Existing Coincides research, Browser Harness direct observation, official product documentation, Henry-provided AFFiNE screenshots, design inference

## 目的

R1 要回答的是：

```text
为什么普通用户会觉得 Notion / AFFiNE 比当前 Coincides 更像一款成熟笔记软件？
```

本报告不判断 Coincides 采用哪条技术路线，也不研究 BlockSuite 是否能承载 Coincides 的数据主权。R1 只建立体验基线：成熟笔记软件应该怎样让用户开始写、创建 block、插入媒体、调整结构、进入画布、收纳工具、隐藏复杂性。

R1 的结论会直接服务 R2-R5：

- R2：Coincides Better Notebook 核心交互规格；
- R3：Page / Canvas / Export 边界；
- R4：Block 视觉语言与内容类型；
- R5：编辑控制、工具栏、右键菜单与快捷键。

## 本报告必须回答的问题

- 成熟笔记软件的第一屏如何降低用户开始写作的摩擦？
- Notion / AFFiNE 如何隐藏 block 结构，让用户先感觉是在写文档？
- slash command、hover handle、右键菜单、floating toolbar 分别承担什么职责？
- 哪些控件常驻，哪些只在选中或 hover 时出现？
- Notion 的单列 block 心智和 AFFiNE 的 page/edgeless 心智分别适合什么？
- Coincides 需要接近哪些体验，哪些体验不应该照搬？
- 这些观察如何支撑后续 R2 的 freeform NoteBlock 规格？

## 本阶段必须读取的旧 reference

本阶段继承 R0 的 reference selection 规则，实际使用以下旧材料：

- `docs/brainstorm/BetterNoteBook Research/R0-reference-index-and-research-intake.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`
- `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`
- `docs/brainstorm/产品完善/PI-046 Research/R7-affine-product-experience-review.md`
- `docs/brainstorm/产品完善/PI-046 Research/S1-r0-r2-method-inventory-product-reset-summary.md`
- `docs/brainstorm/产品完善/PI-046 Research/S3-r7-r11-affine-blocksuite-adoption-summary.md`
- `docs/brainstorm/产品完善/product-improvement-issue-register.md`

R1 也参考了官方公开资料：

- [Notion writing and editing basics](https://www.notion.com/help/writing-and-editing-basics)
- [Notion keyboard shortcuts](https://www.notion.com/help/keyboard-shortcuts)
- [Notion slash commands guide](https://www.notion.com/en-gb/help/guides/using-slash-commands)
- [Notion block basics](https://www.notion.com/help/what-is-a-block)
- [Notion style and customize](https://www.notion.com/help/customize-and-style-your-content)
- [AFFiNE Notion alternative overview](https://affine.pro/blog/affine-the-next-gen-knowledge-base-to-notion-and-miro)
- [BlockSuite affine model API reference](https://blocksuite.io/api/%40blocksuite/affine-model)

## PI-046 Consistency / Conflict Check

R1 没有推翻 PI-046，反而强化了 PI-046 的主判断：

- Coincides 当前最大短板不是底层对象不够，而是用户无法自然进入写作状态。
- Notion 证明 block editor 可以把 block 结构隐藏在自然写作体验后面。
- AFFiNE 证明 page 与 edgeless canvas 可以在一个产品中并存，但这种并存不自动等于 Coincides 的目标。
- Coincides 仍不应 full fork AFFiNE，也不应把 source / relation / template / proposal truth 交给外部 editor runtime。

本报告对 PI-046 的补充是：后续 Better Notebook roadmap 的第一阶段必须用成熟产品体验做验收标准，而不是只验收“能创建 NoteBlock / CanvasNode / API”。

## Browser Harness Observation Log

本阶段最初写作时 Browser Harness 尚未稳定启动。2026-06-05 已完成补观察：Browser Harness 已能连接 Henry 当前 Chrome，并返回页面状态、正文摘要和截图路径。因此 R1 的证据边界从“仅官方文档 + 旧截图”升级为“官方文档 + 真实浏览器状态观察 + 旧研究”。

本轮补观察没有创建、删除、编辑任何 Notion / AFFiNE 内容，只打开新标签、读取页面状态，并记录可观察范围。

### 观察对象与状态

#### Notion official writing / slash docs

Browser Harness 打开并读取：

- `https://www.notion.com/help/writing-and-editing-basics`
- `https://www.notion.com/help/keyboard-shortcuts`
- `https://www.notion.com/en-gb/help/guides/using-slash-commands`

可观察状态：

- Notion 官方 writing/editing 页面可读取到 `+` 插入入口、`⋮⋮` block handle、block move / turn into / duplicate / delete / comment / AI 等动作说明。
- slash command 页面可读取到 `/image`、`/quote`、`/callout`、`/web`、颜色、turn、comment、duplicate 等命令入口说明。
- 这些状态强化了 R1 的判断：Notion 并不是没有 block，而是把 block 创建、类型切换和操作收纳在光标附近、hover handle 和 slash menu 中。

#### Notion authenticated workspace

Browser Harness 打开 `https://www.notion.so` 后，Chrome 登录态进入 Henry 的 Notion workspace。为避免把私人页面内容写入研究文档，本报告只记录 UI 结构，不引用具体页面正文。

可观察状态：

- 左侧存在 workspace sidebar、Home / Chat / Inbox / Recents / New page / Private / Trash 等导航入口。
- 页面顶部存在 Share、Add icon、Add cover、comment / app prompt 等文档级入口。
- 正文区域呈现为自然文档，而不是工程面板；block 操作与页面内容不是常驻大面板形态。

这进一步支持 R1 的判断：成熟笔记产品的第一屏必须先让用户觉得“我可以直接写”，而不是“我正在管理一组数据库对象”。

#### AFFiNE app / public overview

Browser Harness 打开并读取：

- `https://app.affine.pro`
- `https://affine.pro/blog/affine-the-next-gen-knowledge-base-to-notion-and-miro`
- `https://affine.pro/edgeless`，当前会跳转到 `https://affine.pro/whiteboard`
- `https://toeverything-affine.mintlify.app/introduction`

可观察状态：

- `app.affine.pro` 可进入 Demo Workspace，并显示 “Open in AFFiNE app” 类桌面 app 提示，说明 web app shell 可观察，但本轮未深入创建或编辑文档。
- AFFiNE public overview 可读取到其把 rich-text paragraphs、Kanban、tables 作为 building blocks，并把 pages / whiteboards 放进统一 workspace 的产品定位。
- 最初尝试打开旧路径 `https://docs.affine.pro/features/edgeless` 时返回 404；后续从 AFFiNE 官网导航和搜索补查后确认，这是旧路径问题，不是 Edgeless/Whiteboard 资料缺失。当前官网入口 `https://affine.pro/edgeless` 会跳转到 `https://affine.pro/whiteboard`，页面明确描述从 page 到 canvas 的转换、freeform canvas、multi-doc canvas 和 Edgeless whiteboard。
- 当前 AFFiNE 文档索引可在 `https://toeverything-affine.mintlify.app/introduction` 访问，索引中包含 Editor、Whiteboard、Database、Collaboration、AI Assistant、Local-First Architecture 等入口。R7 技术路线再评估时应优先从该索引重新定位 Whiteboard / Editor 相关文档，而不是沿用旧 `docs.affine.pro/features/edgeless` 路径。

### 限制说明

- 本轮没有在 Notion 私有 workspace 中新建空白页，因此 Notion blank-page 首次点击的精确光标行为仍来自官方 docs、常规产品行为和间接观察；R2 写具体单击/双击规则时需要把这部分转成 Coincides 自己的产品决策，而不是声称完全复刻 Notion。
- 本轮 AFFiNE app 观察停留在 Demo Workspace / app shell 层，没有对 page mode / edgeless mode 做破坏性编辑测试；R7 如果涉及 BlockSuite / AFFiNE 技术路线，应补做更细的 page/edgeless 操作观察。
- Browser Harness 截图默认保存在系统临时目录，本报告不把临时截图提交进仓库；报告记录的是页面状态和可观察结论。

## Notion 观察

### 1. Notion 的第一原则：先写，后理解 block

Notion 的成熟之处不是“没有 block”，而是用户开始时不需要思考 block。

官方文档明确把 Notion 描述成由 block 构成的页面：文字、图片、表格等都是 block。用户创建第一页并开始输入时，实际上已经创建了一个 text block。但这个事实没有被产品放在用户面前成为负担。

这给 Coincides 的启发很明确：

```text
底层可以是 NoteBlock；
表层必须是“我在写一篇文档”。
```

当前 Coincides 的工程界面让用户先选择 template、输入 textarea、点击 Add block，再看到卡片式 block 列表。这是数据库对象管理心智，不是写作心智。

Better Notebook 第一阶段必须把入口改成：

```text
打开空白 note
  -> 点击页面
  -> 光标出现
  -> 开始输入
  -> 系统在背后创建默认 text NoteBlock
```

### 2. Slash command 是内容类型入口，而不是主要导航

Notion 的 `/` 命令承担了非常重要的职责：

- 新增 block；
- 转换当前 block；
- 快速筛选 block type；
- 应用动作，如 delete / duplicate；
- 应用颜色；
- 进入图片、PDF、code、math equation 等内容类型。

Notion 的关键不是 slash menu 有多复杂，而是它让用户留在当前写作位置，不需要离开正文去侧栏或工程面板里找功能。

Coincides 应继承这个原则：

- 新 block 默认是 text；
- `/` 是切换 block type 的入口；
- `/formula`、`/latex`、`/image`、`/code`、`/table`、`/quote` 应成为第一阶段必备候选；
- runtime template / domain template 不应全部铺在页面上，而应通过 slash/search/filter 被调用。

### 3. Hover handle 把结构操作藏起来

Notion 的 block 可以拖拽、转换、复制、删除、改颜色，但这些操作并不常驻占据视觉空间。

官方文档反复提到 hover 左侧出现的 `⋮⋮` handle：

- 用于拖拽 block；
- 用于打开 block 菜单；
- 用于 Turn into；
- 用于颜色、删除、复制等操作；
- 用于在页面中重排内容。

这种设计值得 Coincides 学习。Better Notebook 中：

- 普通阅读/写作时不应显示每个 block 的工程卡片边框；
- hover / selection 时才显示 block handle；
- layout edit mode 才显示 resize handle、drag handle、alignment guide；
- source / relation / template metadata 不应一直压在 block 顶部。

### 4. Notion 的 block 类型很广，但常用入口很克制

Notion 的 block types 包括：

- basic blocks：text、page、to-do、headings、lists、quote、divider、callout；
- database blocks：table、board、gallery、list、calendar；
- media blocks：image、video、audio、file、code、web bookmark；
- embeds：PDF、Figma、GitHub Gist、Google Drive 等；
- advanced blocks：inline equation、button、breadcrumb、table of contents。

这说明成熟笔记软件不需要把所有类型都做成表面按钮。它可以支持很多类型，但入口通过 slash、hover、菜单、toolbar 收纳。

Coincides 后续即使有 TemplateDefinition、CompositionTemplate、DomainBlockSet，也不能把所有模板像工程下拉框一样直接堆在用户面前。用户第一眼应该看到文档，用户需要时才召唤类型系统。

### 5. Notion 的并排能力是 columns，不是自由 block-box

Notion 支持 columns：用户可以拖拽 block 到另一列，蓝色 guide 辅助落位。它也支持调整列宽。但这仍是文档流内的 column layout，不是任意二维坐标的 freeform block-box。

这正好暴露 Coincides 的机会：

```text
Notion 能让文档自然；
但 Notion 的左右排版仍偏 column flow。
Coincides 想要的是 page-first freeform block-box。
```

因此 Coincides 不应仅仅复制 Notion columns。它需要：

- 默认像 Notion 一样自然输入；
- 允许用户把 text block resize 到半页；
- 允许右侧空白点击生成并排 block；
- 允许图片、公式、文本、source quote 在同一 formal page 中自由排版；
- 同时保留 page boundary 和 export intent。

### 6. Notion 的文本样式遵循“选中后出现”的原则

Notion 的 text styling 以选中文字后的浮动编辑条为主，也支持常见快捷键和 Markdown-like 输入。

对 Coincides 的启发：

- bold / italic / underline / code inline / comment 等不应做成常驻大按钮区；
- 选中文字后显示 inline toolbar；
- block 级样式放到 block handle / inspector；
- 页面级字体、small text、full width 类设置放在页面菜单；
- 第一阶段不需要开放完整 CSS / style studio，但需要有干净的 visual language。

## AFFiNE 观察

### 1. AFFiNE 的价值在于 page 与 edgeless 的组合

AFFiNE 官方公开介绍强调它同时提供结构化 page 和 boundless / edgeless surface，并能在同一 page 中切换结构化写作和白板式思考。

PI-046 R7 已经记录：AFFiNE 有稳定 app shell、page mode、edgeless mode、toolbar、frame、connector、shape、sticky/note、favorite/sidebar 等能力。Henry 提供的截图也显示：

- 左侧 workspace navigation 很清楚；
- 中央有文档页面；
- edgeless 下页面被放进更大的点阵画布中；
- 底部有画布工具条；
- 周围可放 frame、图形、connector、其他对象；
- favorite / all docs / journals / import / template 等入口在 sidebar 中，而不是堆进正文。

这说明 AFFiNE 的成熟感来自“工作区壳 + 写作面 + 画布面 + 工具收纳”的组合，不只是某个 block 功能。

### 2. AFFiNE 的 page mode 提醒我们：普通写作入口不能丢

即使 Coincides 坚持 canvas-first，也不能让用户感觉一打开就是白板和工程卡片。

AFFiNE 的 page mode 更接近 Notion：标题、正文、block、toolbar、markdown-like 输入、折叠、转换、拖拽，这些都是普通用户理解的写作体验。

Coincides 不一定要做 AFFiNE 式双模式切换，但必须提供同等心智：

```text
默认进入时像一篇文档；
需要排版时像一个可以自由放 block 的页面；
需要思考时可以扩展到 canvas/scratch；
导出时按 formal page / export intent。
```

### 3. AFFiNE 的 edgeless mode 是空间操作参考，不是语义模型答案

AFFiNE edgeless 的成熟点包括：

- select / move / pan / zoom；
- frame；
- shape；
- text；
- connector；
- note；
- bottom / floating toolbar；
- resize / collapse / z-index；
- visual object style。

这些都是 Coincides 当前自研 canvas seed 最缺的东西。

但 AFFiNE connector、shape、frame 在产品体验上首先是 visual / canvas object。Coincides 需要继续分层：

```text
CanvasEdge = 视觉连接
ObjectRelation = 语义关系
RelationLayer = 显示和用途组织层
```

R1 的结论是：AFFiNE 可以作为交互成熟度参考，但不能替 Coincides 决定 relation truth。

### 4. AFFiNE app shell 对 Coincides 很重要

当前 Coincides 最大的 UI 问题之一是：Course Detail 承载了太多功能。

AFFiNE 的截图和 PI-046 观察提醒我们，一个成熟知识/笔记软件需要清楚的 app shell：

- workspace；
- search；
- all docs；
- journals；
- favorites；
- folders；
- tags；
- import；
- template；
- settings。

这些入口不是装饰，它们降低了用户查找和返回常用文档的成本。

Coincides 新路线至少要吸收：

- Project / Note navigation；
- note-level favorite；
- project-level favorite；
- template / package / developer tools 不应混进日常 note surface；
- source inspection 应作为侧栏/inspector，而不是无限展开的右侧气泡；
- canvas/page 是主工作区，不是 Course Detail 的一个内嵌小 panel。

### 5. AFFiNE 的模式切换对 Coincides 的启发与限制

AFFiNE 的 page / edgeless 双模式很有启发，但 Coincides 不一定要照搬双模式。

Coincides 更合适的方向可能是：

```text
同一 Better Notebook surface
  -> formal page area
  -> outside scratch area
  -> layout edit mode
  -> relation/local graph/inspector layers
```

用户可以感知为“一个文档表面”，而不是必须理解两个完全不同模式。

但 R1 不能直接锁定这一点。R3/R7 仍需要研究：

- 是否需要显式 page/canvas mode；
- 是否用 locked page / open canvas toggle；
- 是否用 layout edit mode 代替 AFFiNE 式模式切换；
- 是否让 outside scratch 始终存在但默认收敛。

## 成熟体验模式提炼

### 模式一：直接写作入口

成熟产品不会要求用户先创建工程对象。用户打开页面后，核心动作是：

```text
点击
输入
回车
继续输入
```

Coincides 后续必须把 NoteBlock 创建藏到这个动作背后。

### 模式二：按需显露结构

成熟产品承认 block 存在，但不会把 block 永远暴露成卡片：

- 默认状态：像正文；
- hover：出现 handle / plus；
- selection：出现 toolbar；
- layout mode：出现边框、拖拽点、resize handle；
- inspector：显示 source / relation / template / metadata。

### 模式三：命令入口靠近光标

Slash command 的价值在于它出现在用户正在写的地方。Coincides 的模板、公式、图片、code、quote、source quote、composition entry 都应优先从光标附近召唤，而不是从页面外的大面板启动。

### 模式四：常用操作轻、复杂操作深

成熟工具会把操作分层：

- 常驻：最少量导航和页面标题；
- hover：block handle、insert plus；
- selected text：inline formatting；
- selected block：block toolbar；
- right click / more：duplicate、delete、turn into、source attach；
- inspector：source/relation/template/debug；
- studio：template/package/developer configuration。

Coincides 当前很多东西都放在同一层，这是 UI 失控的来源。

### 模式五：文档流与空间排版需要分层

Notion 擅长文档流；AFFiNE 擅长文档 + edgeless；Coincides 需要的是：

```text
文档一样自然开始；
画布一样自由排版；
source/relation/template/proposal 一样可追踪。
```

这要求 Coincides 做自己的 product model，而不是简单复制任一产品。

## Coincides 需求对照

### 必须接近 Notion 的部分

- 空白页自然输入；
- 默认 text block；
- slash command；
- hover handle；
- selected text toolbar；
- block type conversion；
- drag/drop 重排；
- 图片、code、table、math、quote、callout 等基础类型；
- column / side-by-side 思维的低摩擦入口；
- 页面级字体、宽度、样式入口收纳。

### 必须接近 AFFiNE 的部分

- 清晰 app shell；
- favorite/sidebar；
- page 与 canvas 的工作流区分；
- frame / connector / sticky / shape / note 等空间工具；
- canvas 工具条收纳；
- page-like object embedded in larger canvas；
- visual object selection、move、resize、pan、zoom；
- 空间思考和文档写作可以在同一 workspace 内切换。

### 不能照搬 Notion 的部分

- 不能被单列 block flow 限死；
- 不能只支持 columns 而不支持 freeform block-box；
- 不能把 source/reference 当普通 link；
- 不能让 template/domain/package 变成普通页面属性；
- 不能用 Markdown export 作为主要工程分享格式。

### 不能照搬 AFFiNE 的部分

- 不能把 edgeless visual connector 自动当 ObjectRelation；
- 不能让 BlockSuite / AFFiNE block model 拥有 Coincides semantic truth；
- 不能把 page/edgeless 双模式照搬成用户必须理解的产品结构；
- 不能牺牲 proposal-first、source provenance、operation/recovery；
- 不能因为 AFFiNE 成熟就直接 full fork。

## 新增设计判断

### 判断 1：Better Notebook 第一阶段必须先做“可写性”

如果用户打开一篇空白笔记不能直接写，后面的 Source、GraphRAG、Template、AI note assembly 都会失去产品承载面。

第一阶段验收不应是：

```text
API 能创建 block
CanvasNode 能保存位置
```

而应是：

```text
用户打开 note 后，不需要读说明，也能像写文档一样开始写。
```

### 判断 2：Coincides 的 block 边界要比 Notion 更强，但只在需要时显露

Notion 主要有上下 block boundary；Coincides 因为支持自由左右排版，必须有左右边界、resize handle、alignment guide。

但这些边界不应常驻。它们应属于：

- selection state；
- layout edit mode；
- drag/resize operation；
- debug/inspector state。

### 判断 3：Coincides 的 slash menu 应连接 TemplateDefinition，但不要暴露工程细节

用户看到的应是：

```text
/formula
/definition
/image
/quote
/source quote
```

而不是：

```text
template_definition_id
legacy_block_type
taxonomy_version
source_behavior_json
```

TemplateDefinition runtime 是强地基，但 UI 上必须翻译成人类可理解的命令。

### 判断 4：AFFiNE 的 page/edgeless 给 Coincides 的启发是“工作模式分层”，不是“双模式照搬”

Coincides 可以采用：

- normal writing mode；
- layout edit mode；
- open canvas / scratch workspace；
- relation/local graph mode；
- source inspection mode。

这些模式可以比 AFFiNE 的 page/edgeless 更贴近 Coincides 的 source-grounded notebook。

### 判断 5：R2 必须把“右侧空白创建 block”正式写成规格候选

Notion 的 columns 给了 side-by-side 的轻量解法，AFFiNE 给了 canvas object 的解法。Coincides 需要的独特体验是：

```text
左侧 NoteBlock 缩窄后，
右侧空白点击/双击可以自然创建并排 NoteBlock。
```

这应进入 R2 的核心交互规格，而不是后续高级功能。

## 风险与未决问题

### 风险 1：成熟体验可能被“工程功能完整”掩盖

Coincides 已经有很多底层能力，但如果继续沿当前 Course Detail 工程面板扩张，用户仍然会觉得难用。

### 风险 2：Notion 的自然写作和 Coincides 的自由排版存在张力

自然写作强调连续输入；自由排版强调对象操作。R2/R5 必须定义普通写作模式与 layout edit mode 的切换，否则会变成既不像文档也不像画布。

### 风险 3：AFFiNE 的成熟画布可能诱导我们交出数据主权

越成熟的 editor runtime 越容易让业务对象被它吞掉。R7 技术路线必须继续使用 v2.5 R12 的 adapter gates。

### 风险 4：Browser Harness 观察缺失需要补测

本轮由于工具限制，没有完成新的自动化截图观察。R2/R3/R5 如果进入细规格，仍应补充可视证据，尤其是：

- Notion 空白页真实点击行为；
- Notion column resize 与 drag guides；
- AFFiNE page/edgeless 当前版本切换；
- AFFiNE connector/frame/sticky note 当前工具条；
- Coincides 当前同任务对比。

## Roadmap Draft Impact

新版 Better Notebook roadmap 的第一阶段应增加一个明确的产品目标：

```text
Notebook Surface Must Feel Writable Before It Feels Powerful
```

建议 roadmap 第一阶段的验收项包括：

- 空白 note 能自然开始输入；
- 首个 text NoteBlock 自动创建；
- slash command 可插入基础 block type；
- block 默认弱边界，选中后出现 handle；
- selected text 出现 inline toolbar；
- block 可以转换类型；
- 图片、公式、code、quote 至少有一版插入路径；
- sidebar/favorite/project note navigation 有清楚位置；
- Template/Source/Relation debug 信息不常驻污染正文；
- layout edit mode 的边框/resize/snap 进入后续阶段，但 R1/R2 必须先定义。

R1 也建议 roadmap 在 startup reference 中明确：

- Notion 是自然写作与 block 命令基线；
- AFFiNE 是 page/canvas coexistence 与 app shell 基线；
- Coincides 目标是从两者吸收成熟体验，但保留 source-grounded semantic truth。

## Backfeed Notes

R1 不需要反补 R0 的 reference index。

R1 对 R2 的直接要求：

- R2 必须把“空白页首次点击/双击规则”写成具体规格；
- R2 必须区分 normal writing mode 和 layout edit mode；
- R2 必须处理 right-side blank area create block；
- R2 必须明确 slash command 与 runtime template 的关系；
- R2 必须定义哪些操作是 hover、selection、right-click、inspector，而不是都做成按钮。
