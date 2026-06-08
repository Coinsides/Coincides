# R5 - 编辑控制、工具栏、右键菜单与快捷键

## 0. 报告定位

本报告承接 R3 的 page/canvas/export 边界，以及 R4 的 block 视觉语言。R5 只回答一个问题：

```text
当 Coincides 变成一个自然可用的 Better Notebook 时，
哪些能力应该放在页面表面，
哪些能力应该在 hover / selected / slash / right-click / inspector / debug mode 中按需出现？
```

这不是单纯的 UI 美化问题，而是产品心智问题。Coincides 当前已经有很多工程能力：Canvas Document、Add block、Connect、Plan layout、Use composition、Hide/Restore、Relation Layers、Selected Object Scope、Template Studio、Package Studio 等。问题不是能力太少，而是这些能力仍然以工程面板的方式暴露给用户。

R5 的目标是把这些能力重新分配到合适的控制层，让用户先感觉自己是在写一份文档，而不是在操作数据库后台。

## 1. 本轮参考材料

R5 参考以下材料：

- `R1-notion-affine-mature-notebook-baseline.md`
- `R2-better-notebook-core-interaction-spec.md`
- `R3-page-canvas-export-boundary-spec.md`
- `R4-block-visual-language-and-content-types.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`
- `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`
- `docs/brainstorm/产品完善/PI-046 Research/R7-affine-product-experience-review.md`
- `docs/brainstorm/产品完善/product-improvement-issue-register.md` 中 PI-043 以及按钮 inventory 相关条目

同时观察当前 Coincides 页面和代码：

- `client/src/pages/Courses/LearningCanvasSurface.tsx`
- `client/src/pages/Courses/LearningCanvasSurface.module.css`
- `client/src/pages/Courses/CourseDetail.tsx`
- `client/src/pages/Notes/NoteDetail.tsx`
- `client/src/pages/Notes/NoteDetail.module.css`

本轮 Browser Harness 只观察页面，不创建、移动、删除或编辑任何数据。

## 2. 当前现状观察

登录后的 Course Detail 页面已经能看到：

- 左侧主导航；
- Canvas Document 主区；
- canvas tab；
- Add block；
- Connect；
- zoom；
- Plan layout；
- Use composition；
- Focus canvas；
- selected node；
- node resize handles；
- node ports；
- visible relation lines；
- Open / Hide；
- Relation Layers；
- Hidden nodes；
- Selected Object Scope。

这说明 v2.x 已经把大量底层功能打出来了。

但从 Better Notebook 视角看，当前有四个明显问题。

### 2.1 控件过早暴露

节点内部直接显示 `source board node`、Open、Hide、连接点、resize handle。对于工程测试，这是清楚的；对于真实用户，这会让 block 看起来像后台管理卡片，而不是笔记内容。

### 2.2 重要能力和低频能力混在一起

Add block、Connect、Plan layout、Use composition、Source Board、Hidden nodes、Selected Object Scope 都在同一个工作流附近出现。它们的重要性、频率和风险完全不同，却在视觉上接近同级。

### 2.3 Debug 信息没有被隔离

`canvas_node_id`、`target_id`、edge state、relation id 这类信息对开发和 AI command 很重要，但不应在普通阅读/写作状态里占据主要空间。它们应该进入 inspector 或 debug mode。

### 2.4 Hide / Archive / Delete 的语义容易混淆

用户看到 Hide、Archive、Delete 时，很容易不知道自己是在：

- 删除内容本身；
- 从当前页面移除投影；
- 隐藏视觉对象；
- 归档 relation；
- 排除导出；
- 还是只是临时收起。

这件事必须在 UI 语言和数据行为上统一，否则用户会失去信任。

## 3. R5 总原则

R5 建议采用以下原则。

### 3.1 常用、安全、低风险的入口可以显性

例如：

- 写字；
- slash command；
- undo / redo；
- search；
- export；
- view mode；
- add block；
- basic formatting。

这些可以靠近页面顶部、光标、选中工具栏或键盘快捷键。

### 3.2 对象相关操作应靠近对象出现

例如：

- convert block type；
- attach source；
- attach relation；
- duplicate；
- comment；
- include/exclude export；
- open inspector；
- remove from page。

这些不应该常驻页面顶部，而应该在 block 被 hover、selected 或右键时出现。

### 3.3 低频、结构化、解释性信息进入 inspector

例如：

- source provenance；
- relation details；
- template identity；
- domain/classification；
- export intent；
- AI visibility；
- history/provenance；
- debug ids。

这些信息非常重要，但不应该打断阅读。

### 3.4 危险操作必须分层

危险操作不能只靠一个普通按钮。例如：

- Delete truth；
- hard migration；
- source detach；
- relation delete；
- template structural edit；
- package import apply。

这些必须有确认、trash/recovery、proposal-first 或 operation batch 记录。

### 3.5 控件出现时机比控件数量更重要

Better Notebook 不一定功能少。它可以功能很多，但要做到：

```text
阅读时少；
写作时近；
选中时够；
布局时显；
右键时全；
inspector 中可解释；
debug mode 中可追踪。
```

## 4. 建议的控制层模型

R5 建议把 Coincides 的控制面分成十层。

```text
1. App shell / sidebar
2. Page topbar
3. Caret / slash command
4. Text selection toolbar
5. Block hover affordance
6. Selected block floating toolbar
7. Layout edit mode
8. Context menu
9. Right inspector
10. Debug / Agent command context
```

这十层不是十个可见面板，而是不同交互状态下的入口分工。

## 5. App Shell / Sidebar

App shell 负责导航，不负责具体 block 操作。

应该常驻：

- workspace / app logo；
- Projects；
- Favorites；
- Search；
- Template Studio / Developer tools；
- Settings；
- current project shortcuts。

不应该常驻：

- source scope 操作；
- block 操作；
- relation 操作；
- proposal apply；
- canvas node debug；
- package import/export 细节。

### 5.1 Favorites 的价值

Favorites 应该作为 note/project 快捷入口，而不是仅仅做装饰。用户可能每天都看某几份笔记或报告，应该能从 sidebar 直接打开。

第一版可以支持：

- favorite note；
- favorite project；
- favorite canvas/document。

template/package/source board 可以后续再扩展。

## 6. Page Topbar

Page topbar 是当前 note/document 的控制中心。

建议常驻：

- 返回 / project breadcrumb；
- note title；
- view mode：Page / Canvas / Focus / Preview；
- undo / redo；
- search in note；
- export / share；
- inspector toggle；
- more menu。

可以弱显示或放入 more：

- page size；
- zoom；
- snap toggle；
- layout mode toggle；
- relation visibility；
- source panel toggle。

不建议常驻：

- selected object scope；
- operation batch；
- template ids；
- source board details；
- plan layout；
- use composition；
- package controls。

### 6.1 `Plan layout` 和 `Use composition` 的位置

`Plan layout` 是中频 AI/规则辅助操作，不应像普通写作按钮一样常驻在页面显眼位置。建议放在：

- topbar more menu；
- selected multi-block toolbar；
- command palette；
- inspector 的 proposal section。

`Use composition` 属于结构化插入。建议放在：

- slash command；
- add block menu；
- composition picker；
- command palette。

## 7. Caret / Slash Command

Slash command 是 block 类型和结构化插入的第一入口。

用户在空白处点击出现光标后，默认创建 text block。输入 `/` 后可以选择：

- Text；
- Heading；
- Definition；
- Formula；
- Theorem；
- Proof；
- Example；
- Exercise；
- Source Quote；
- Callout；
- Sticky / Scratch Note；
- Image；
- Table；
- Code；
- Composition；
- Source Insert；
- Divider / Frame。

### 7.1 Slash command 的职责

Slash command 负责：

- 创建 block；
- 转换当前空 block；
- 插入常见结构；
- 调用模板；
- 调用 composition；
- 插入 source quote。

Slash command 不负责：

- 复杂 source 绑定；
- relation layer 管理；
- template migration；
- package import；
- debug 信息；
- 数据库级删除。

### 7.2 Slash command 与模板选择

模板很多时，slash menu 不应该一次性列出全部模板。建议分层：

```text
/formula
  Formula Basic
  Formula Math
  Formula Engineering

/definition
  Definition Basic
  Definition Math
  Definition Research Term
```

第一版可以先只列常用系统模板和用户 favorite templates。

## 8. Text Selection Toolbar

当用户选中文本时，出现小型文字工具栏。

建议包含：

- bold；
- italic；
- underline；
- link；
- inline formula；
- comment；
- highlight；
- convert to source quote；
- copy。

不建议包含：

- block resize；
- source board；
- relation layer；
- export package；
- template migration。

这是文字编辑工具，不是对象管理工具。

## 9. Block Hover Affordance

Hover 是轻量提示层，不应该承载复杂操作。

建议 hover 显示：

- very subtle block boundary；
- drag handle；
- small type badge；
- source badge count；
- relation badge count；
- comment badge；
- more icon。

不建议 hover 显示：

- full source title list；
- full relation list；
- Open / Hide / Archive 大按钮；
- debug ids；
- canvas_node_id；
- target_id；
- template_definition_id。

### 9.1 Type badge

R4 已经提出 block type 不应常驻正文。R5 建议：

```text
Reading: hidden
Hover: tiny badge, optional
Selected: visible type / role
Inspector: full template / system type / learning role
Debug: ids and raw metadata
```

## 10. Selected Block Floating Toolbar

选中 block 后出现 floating toolbar。这是对象级高频操作入口。

建议包含：

- convert type；
- format；
- duplicate；
- attach source；
- relation；
- comment；
- include / exclude export；
- layout edit；
- open inspector；
- more。

如果 block 是 image/table/code/formula，可以出现类型专属按钮：

- image：crop、caption、replace；
- formula：edit latex、display/inline；
- code：language、copy；
- table：add row/column。

### 10.1 Floating toolbar 不应过宽

第一层只放 5-7 个常用按钮。其他进入 more 或 inspector。

建议第一层：

```text
Convert | Format | Source | Relation | Comment | Layout | More
```

### 10.2 Source 按钮

Source 按钮应打开轻量 source attach popover：

- attach current selected source；
- attach recent source；
- search source；
- attach SourceScope；
- attach SourceAnchor；
- batch attach selected source scopes；
- open source inspector。

Source attach 不应只服务 AI 生成的 block。手写 block 也可以主动绑定来源。

### 10.3 Relation 按钮

Relation 按钮应打开轻量 relation popover：

- create relation to selected block；
- pick relation type；
- open local graph；
- show relation list；
- hide/show visible connector；
- open relation inspector。

跨页 relation 不应默认画成长线。Relation 按钮可以让用户看到关系存在，但不强迫页面视觉连线。

## 11. Layout Edit Mode

Layout edit mode 是 Better Notebook 区别于 Notion/AFFiNE page flow 的关键。普通写作状态应该像文档，layout mode 才像排版工具。

进入方式可以是：

- topbar toggle；
- selected block 的 Layout 按钮；
- shortcut；
- drag/resize handle 自动进入短暂 layout state。

Layout mode 显示：

- block boundaries；
- resize handles；
- drag handles；
- alignment guides；
- snap lines；
- margin guides；
- page boundary；
- z-index / arrange controls；
- lock/unlock；
- group/frame；
- export boundary hints。

Layout mode 不应该显示：

- debug ids；
- source raw metadata；
- template raw schema；
- proposal internals。

### 11.1 Snap toggle

Snap 是布局辅助，不是全局强制。建议：

- 默认开启轻量 snap；
- 用户可用 shortcut 临时禁用；
- topbar or layout toolbar 可切换；
- inspector 可设置更细规则。

建议 snap 规则：

- page margin；
- page center；
- nearby block edge；
- nearby block baseline；
- equal width；
- equal height；
- row / column guide。

### 11.2 Alignment guides

用户拖动 block 时应出现临时辅助线，而不是常驻网格。

辅助线应帮助：

- 水平对齐；
- 垂直对齐；
- 左右边缘对齐；
- baseline 对齐；
- 图片与文字 block 顶部对齐；
- 多个 block 均分。

## 12. Context Menu

右键菜单用于不常用但重要的对象操作。它比 hover 更完整，比 inspector 更快捷。

### 12.1 Block context menu

建议包含：

- Edit；
- Convert type；
- Duplicate；
- Copy；
- Copy as Markdown；
- Copy as source-grounded snippet；
- Move to page；
- Move to scratch；
- Include in export；
- Exclude from export；
- Attach source；
- Detach source；
- Create relation；
- Open local graph；
- Lock position；
- Bring to front；
- Send to back；
- Open inspector；
- Remove from current page；
- Move to trash。

### 12.2 Canvas / empty area context menu

右键空白处建议包含：

- New text block here；
- Insert image；
- Insert formula；
- Use composition；
- Paste；
- Toggle layout mode；
- Toggle snap；
- Show page boundary；
- Add sticky note；
- Add frame；
- Open page settings。

### 12.3 Edge / relation context menu

建议包含：

- Edit visual edge；
- Bind semantic relation；
- Change relation type；
- Change layer；
- Hide visual line；
- Show in local graph；
- Open relation inspector；
- Archive edge；
- Unbind relation。

## 13. Right Inspector

Inspector 是结构化细节层。它应该像属性面板，而不是命令堆叠区。

建议分 tab：

```text
Overview
Content
Source
Relations
Layout
Export
AI
History
Debug
```

第一版不一定全部做完，但分层应从一开始清楚。

### 13.1 Overview

显示：

- block title / first line；
- type；
- role；
- source count；
- relation count；
- export intent；
- AI visibility；
- status。

### 13.2 Source

显示：

- attached sources；
- page / page label；
- source scope；
- source anchor；
- future SourceRegion；
- confidence；
- jump target；
- detach。

### 13.3 Relations

显示：

- incoming relations；
- outgoing relations；
- relation type；
- relation layer；
- visible connector state；
- semantic relation binding；
- stale/broken warnings。

### 13.4 Layout

显示：

- x / y；
- width / height；
- auto height / fixed height；
- z-index；
- lock；
- page role；
- formal/scratch/private placement；
- snap behavior。

### 13.5 Export

显示：

- export intent；
- include in PDF；
- include in project package；
- include in AI context export；
- scratch/private policy；
- page label。

### 13.6 AI

显示：

- AI readable；
- private by default；
- readable with context；
- user note / scratch note；
- source-grounded / user-authored；
- summary for agent。

### 13.7 Debug

显示：

- NoteBlock id；
- placement id；
- CanvasNode id；
- target id；
- template_definition_id；
- object_relation_id；
- operation batch；
- raw metadata。

Debug tab 默认隐藏，或只在 developer mode 显示。

## 14. Hide / Archive / Delete / Remove / Exclude 的区分

这是 R5 最关键的治理问题之一。

### 14.1 Delete / Move to trash

Delete 影响内容 truth。对于 NoteBlock，真正删除意味着这段内容从笔记知识结构中消失。

建议第一版 UI 避免直接叫 Delete，使用：

```text
Move to trash
```

规则：

- 需要确认；
- 可恢复；
- 写 operation batch；
- 不应由单次误触触发；
- 如果 block 有 source/relation/proposal 引用，应显示 warning。

### 14.2 Remove from page / Remove placement

Remove from page 只移除当前页面/画布投影，不删除 NoteBlock truth。

适用场景：

- 一个 NoteBlock 不想在当前 canvas 上显示；
- 用户想把 block 从正式页移出；
- block 仍保留在 note library / hidden placements / outline 中。

这比 `Hide node` 更符合用户心智。

### 14.3 Hide

Hide 更像临时显示状态：

- 隐藏某条 relation line；
- 隐藏某个 layer；
- 隐藏 debug labels；
- 隐藏 selection handles；
- 隐藏 inspector。

Hide 不应该用来表示“从当前文档移除内容”。

### 14.4 Archive

Archive 是对象生命周期状态，适合：

- archived CanvasEdge；
- archived SourceScope；
- archived SourceBoardNode；
- archived old visual object；
- deprecated/archived template。

Archive 不应作为用户删除 NoteBlock 的默认文案。

### 14.5 Exclude from export

Exclude from export 只影响输出，不影响页面显示和 AI 可读性。

典型场景：

- 页面外 scratch note；
- 私人备注；
- 学习疑问；
- 不想分享给同学/老师的内容。

这应该是 export intent，而不是 hide。

### 14.6 建议命名

```text
Move to trash = 删除内容 truth，危险，可恢复
Remove from page = 移出当前 projection，truth 保留
Hide line/layer = 临时视觉隐藏
Archive edge/scope = 生命周期归档
Exclude from export = 导出策略
```

当前 `Hide node` 应在 Better Notebook 中改名为 `Remove from page` 或 `Hide from this canvas`，并在 inspector 中明确说明内容仍保留。

## 15. Source Attach 控件位置

Source attach 应同时支持轻量和深度入口。

### 15.1 轻量入口

Selected block toolbar：

```text
Source
```

点击打开 popover：

- attach current source selection；
- attach selected source scopes；
- search source；
- recent sources；
- open source picker。

### 15.2 深度入口

Inspector 的 Source tab：

- 多 source 列表；
- page/page range；
- SourceScope；
- SourceAnchor；
- future SourceRegion；
- confidence；
- source quote preview；
- detach；
- jump target。

### 15.3 右键入口

Block context menu：

- Attach source；
- Attach selected source scopes；
- Detach source；
- Open source。

### 15.4 不建议

不建议把 source attach 做成页面常驻大面板。Source 是 provenance，不是所有用户每秒都要看的主内容。

## 16. Relation Attach 控件位置

Relation 是 Coincides 的核心能力，但不应该总是视觉化成线。

### 16.1 轻量入口

Selected block toolbar：

```text
Relation
```

点击打开 popover：

- create relation to another selected block；
- search target block；
- choose relation type；
- choose relation layer；
- show existing relations；
- open local graph。

### 16.2 视觉入口

Layout / relation edit mode 中显示 connector ports。

普通阅读状态下：

- 不显示 ports；
- 不默认显示跨页长线；
- 同页、近距离、用户明确可见的 relation 可显示线。

### 16.3 Inspector 入口

Relations tab 显示完整关系：

- incoming；
- outgoing；
- grouped / conditional；
- relation layer；
- visual line state；
- semantic binding；
- stale/broken state。

### 16.4 Local graph

对于跨页或关系复杂的内容，建议使用 local graph，而不是在正文画布上画满线。

入口：

- selected block toolbar 的 Relation；
- right-click；
- inspector；
- command palette。

## 17. Export Intent Toggle

Export intent 是 R3 的关键结论。R5 建议它有两个入口。

### 17.1 Selected toolbar 小入口

选中 block 时显示一个简洁图标：

```text
Include / Exclude
```

或者：

```text
Formal / Scratch / Private
```

第一版不建议太复杂，可以只做：

- include in export；
- exclude from export。

### 17.2 Inspector 深入口

Inspector 的 Export tab 显示：

- formal；
- scratch；
- private_note；
- annotation；
- hidden；
- include in PDF；
- include in project package；
- include in AI context。

### 17.3 默认规则

```text
formal page 内 block: include in export
page 外 scratch block: exclude from export
用户显式切换: explicit metadata overrides position
```

## 18. Keyboard Shortcuts

快捷键应该服务高频动作，不应该成为隐藏功能的唯一入口。

建议第一阶段：

```text
/                  slash command
Enter              new block
Shift+Enter        line break inside block
Esc                clear selection / close transient panel
Ctrl/Cmd+Z         undo
Ctrl/Cmd+Y         redo
Ctrl/Cmd+B/I/U     text format
Ctrl/Cmd+K         link
Delete/Backspace   delete selection or text, with state-aware behavior
Ctrl/Cmd+D         duplicate selected block
Ctrl/Cmd+F         search in note
Ctrl/Cmd+Shift+L   toggle layout mode
Space while drag   pan canvas, if canvas mode needs it
```

### 18.1 Delete / Backspace 状态规则

Delete 行为必须取决于状态：

- caret inside text：删除文字；
- empty block selected：move to trash or remove placement, depending setting；
- non-empty block selected：show confirmation or move to trash；
- canvas placement selected：remove from page；
- edge selected：archive edge or hide visual edge；
- relation selected：unbind/archive requires confirmation。

不要让 Delete 一键默默删除 truth。

## 19. Command Palette

R5 建议后续加入 command palette，但不一定是第一版。

它适合：

- search commands；
- run proposal；
- create layout proposal；
- use composition；
- seed from source；
- open template studio；
- open local graph；
- export；
- toggle debug mode。

Command palette 可以给高级用户和 AI agent command 建同一套 command registry。

## 20. Agent Command Context

Selected Object Scope 是 v2.4 的好 seed，但在 Better Notebook 中应该从普通用户视图隐藏到 agent/debug 层。

建议：

- 普通用户看到：selected block title/type/source/relation summary；
- Inspector debug tab 看到：stable ids；
- Agent 读取：structured selected context。

Agent command 不应该直接变成可见的工程按钮堆。

## 21. 当前代码对 R5 的启发

### 21.1 可保留的 seed

当前代码已有：

- command item list；
- shortcut 字段；
- selected node / selected edge；
- inspector；
- hidden nodes；
- relation layers；
- connect mode；
- add block；
- move/resize；
- edge inspector。

这些都可以保留为能力 seed。

### 21.2 需要产品化改造

需要改造：

- `Command context` 不应是普通页面核心；
- `Open target` 应变成 source/target jump 的 contextual action；
- `Hide node` 应改为 remove/hide/export 语义之一；
- `Archive edge` 应进入 edge inspector 或 right-click；
- stable ids 进入 debug；
- relation layer toggle 进入 inspector/local graph panel；
- Add block 应从工具按钮升级为自然点击 + slash command。

### 21.3 NoteDetail 的问题

当前 NoteDetail 仍偏表单：

- Add block 是表单按钮；
- 每个 block 是卡片；
- textarea / preview 分开；
- Move up/down 是主要排序手段；
- Move to trash 常驻按钮。

Better Notebook 应转向：

- 空白页点击即写；
- inline editor；
- block hover handle；
- selected toolbar；
- layout mode；
- natural trash/recovery。

## 22. 控件分配矩阵

| 能力 | 推荐主入口 | 备用入口 | 是否常驻 | 风险 |
| --- | --- | --- | --- | --- |
| 新建 text block | 点击空白 / Enter | slash menu | 否 | 低 |
| 切换 block type | slash / selected toolbar | right-click / inspector | 否 | 低 |
| 文本格式 | text selection toolbar | shortcut | 否 | 低 |
| 插入公式 | slash | toolbar | 否 | 低 |
| 插入图片 | slash / empty context menu | topbar insert | 否 | 低 |
| 移动 block | drag handle / layout mode | shortcut | 否 | 中 |
| resize block | layout mode / selected handles | inspector | 否 | 中 |
| duplicate | selected toolbar | right-click / shortcut | 否 | 低 |
| attach source | selected toolbar | right-click / inspector | 否 | 中 |
| detach source | inspector | right-click | 否 | 中 |
| create relation | selected toolbar / relation mode | right-click / inspector | 否 | 中 |
| hide relation line | relation inspector | right-click | 否 | 低 |
| bind ObjectRelation | relation inspector | proposal/action panel | 否 | 中 |
| export include/exclude | selected toolbar | inspector | 否 | 低 |
| remove from page | right-click | inspector | 否 | 中 |
| move to trash | right-click / inspector | shortcut with confirm | 否 | 高 |
| plan layout | command palette / more | inspector proposal tab | 否 | 中 |
| use composition | slash / command palette | topbar more | 否 | 中 |
| debug ids | debug inspector | developer mode | 否 | 低 |

## 23. 如何避免界面像工程后台

R5 建议遵守以下产品规则。

### 23.1 不把对象类型当正文

正文里不常驻显示：

- `source board node`；
- `canvas_node`；
- `proposal_entry`；
- ids。

对象类型是系统信息，不是用户主要阅读内容。

### 23.2 不把每个功能都做成按钮

按钮太多时，用户会认为自己需要先理解系统，才能写笔记。Better Notebook 的第一感觉应该是：

```text
点一下，就能写。
选中之后，才出现更多能力。
需要细节时，打开 inspector。
```

### 23.3 不把 source / relation / template 显示成三套并列面板

它们是 block 的属性和能力，不应该永远挤在主阅读流旁边。

### 23.4 用文案替换工程词

建议文案：

```text
Open target -> Open source / Open linked item
Hide node -> Remove from page / Hide from this canvas
Archive edge -> Archive link
Bind relation -> Make semantic link
Selected object scope -> Details / Debug context
Canvas Document -> Notebook page / Document canvas
```

具体文案后续还要 UX polish，但方向应该从工程实体转向用户动作。

## 24. R5 对 R6 的要求

R6 数据契约必须支持这些状态：

- content truth；
- placement/projection；
- visible/hidden placement；
- export intent；
- AI visibility；
- source attachments；
- relation attachments；
- visual relation state；
- semantic relation state；
- debug identity；
- operation history。

尤其要明确：

```text
Move to trash != Remove from page != Hide line != Exclude from export
```

如果 R6 数据契约不能区分这些，UI 再漂亮也会产生误删和误解。

## 25. R5 对 R7/R8 的要求

后续若继续评估 AFFiNE / BlockSuite，必须验证：

- 是否支持 hover handle；
- 是否支持 selected toolbar；
- 是否支持 context menu；
- 是否支持 inspector；
- 是否支持 layout edit mode；
- 是否支持 block resize；
- 是否支持 source/relation/template badge；
- 是否支持 debug metadata 隐藏；
- 是否支持 command registry / shortcut；
- 是否能把 delete/remove/hide/export intent 分开；
- 是否能让 Coincides 保留 proposal-first 和 operation batch。

不能只看它是否“好看”或是否“能写字”。

## 26. Roadmap Impact

R5 建议新 roadmap 加入一个独立阶段：

```text
Phase A4 - Command Surface / Inspector / Control Layer
```

该阶段应放在：

```text
Natural Page Writing
-> Freeform BlockBox Layout
-> Page/Canvas Export Boundary
-> Block Visual Language
-> Command Surface / Inspector / Control Layer
-> Data Contract
```

### Phase A4 最小验收

- Page topbar 只保留当前 note/document 的高频操作；
- slash command 能创建/转换 block；
- selected block 有 floating toolbar；
- hover 显示轻量 handle/badge；
- right-click menu 有对象操作；
- inspector 能显示 source/relation/layout/export/debug；
- layout mode 显示 resize/snap/alignment；
- Hide/Archive/Delete/Remove/Exclude 文案和行为不混淆；
- debug ids 不常驻阅读界面；
- 当前工程命令能被重新安置，不丢能力。

## 27. R5 解决的问题

R5 解决了：

1. 哪些能力应该常驻：导航、title、view、undo/redo、search、export、inspector toggle。
2. 哪些只在选中 block 后出现：convert、source、relation、comment、layout、duplicate、export intent。
3. 哪些只在 layout mode 出现：resize handles、drag handles、alignment guides、snap、z-index、lock。
4. 哪些放进右键菜单：duplicate、copy、move、remove、trash、attach source、relation、export intent、local graph。
5. 哪些放进 inspector：source、relation、layout、export、AI visibility、history、debug metadata。
6. Hide / Archive / Delete / Remove / Exclude 必须分开。
7. 普通页面不能像工程后台，debug 和 id 应进入 inspector/debug mode。

## 28. 暴露的风险

### 28.1 Command registry 风险

如果 UI 控件和底层 command 没有统一注册，未来会出现按钮、快捷键、agent action、right-click menu 行为不一致。

建议后续建立 command registry：

```text
command_id
label
target_type
visibility
risk_level
primary_surface
shortcut
requires_confirmation
agent_allowed
proposal_required
```

### 28.2 误删风险

如果 `Delete`、`Hide`、`Archive` 混用，用户会不知道内容是否还在。Better Notebook 第一阶段就必须统一文案。

### 28.3 Inspector 过重风险

Inspector 如果塞满所有东西，也会变成工程后台。必须分 tab，并默认显示 Overview，debug 只在 developer mode 展开。

### 28.4 快捷键冲突风险

浏览器、系统、未来桌面版/iPad 版快捷键可能冲突。第一版只做最通用快捷键，复杂快捷键后续再配置。

## 29. 反补前序报告

R5 不需要改写 R0-R4，但它反补了三点：

- R2 的自然写作必须配合 command surface，否则“点击即写”后仍然会被工程按钮打断；
- R3 的 export boundary 必须有 selected toolbar 和 inspector 入口，否则用户无法理解 formal/scratch/private；
- R4 的 block visual language 必须依赖 hover/selected/layout/debug 状态，否则 metadata 隐藏后用户会找不到能力。

S2 总结时应把 R3/R4/R5 收束成一个完整的 page/canvas/block/control 决策包。

## 30. R5 结论

Better Notebook 的控制层应该是：

```text
常驻 topbar: 只放 note/page 级高频操作
光标 / slash: 负责自然创建和类型转换
hover: 轻量 handle 和 badge
selected toolbar: block 级高频操作
layout mode: resize / move / snap / alignment
right-click: 低频但重要的对象操作
inspector: source / relation / export / AI / history / debug
debug mode: ids 和 raw metadata
agent command: 读取 structured context，不污染普通界面
```

Coincides 不缺功能，缺的是控制层秩序。R5 的核心建议是：不要继续把所有能力铺在页面上，而是按频率、风险、对象、上下文分层。这样 Better Notebook 才能同时保留 Coincides 的 source-grounded / relation-aware / proposal-first 能力，又让用户第一眼觉得它是一份可以自然书写、自然排版、自然阅读的笔记。
