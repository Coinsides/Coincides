# R4 - Block 视觉语言与内容类型

**Created**: 2026-06-05
**Status**: Complete
**Scope**: Better Notebook Research R4
**Evidence Level**: Existing Coincides research, current Coincides code/CSS evidence, Browser Harness screenshot observation, design inference

## 目的

R4 要回答的是：Better Notebook 里的 NoteBlock 应该怎样“长得像内容”，而不是长得像工程卡片。

R2 已经锁定自然输入和 freeform block-box。R3 已经锁定 formal page、outside scratch、export intent 和 AI visibility。R4 在这个基础上继续回答：

```text
不同内容类型在页面上应该怎样呈现？
什么时候显示 block type？
什么时候显示 source / relation / template metadata？
哪些信息应该进入 inspector，而不是常驻正文？
```

R4 不设计完整 theme editor，不做自定义样式 Studio，不决定采用 AFFiNE / BlockSuite / 自研路线。R4 只定义 Better Notebook 第一阶段必须拥有的 block 视觉语法。

## 本报告必须回答的问题

- 普通 paragraph 是否默认无边框？
- 什么时候显示 block type？
- block type 是 hover 显示、选中显示，还是 inspector 显示？
- formula block 如何同时支持 inline 和 display？
- image block 如何 resize / crop / caption？
- sticky note 与普通 NoteBlock 的区别是什么？
- source quote 如何显示来源？
- debug metadata 如何隐藏到 inspector？
- 用户自定义 block style 应在什么时候进入 roadmap？

## 本阶段必须读取的旧 reference

R4 继承 R0 的 reference 选择规则，实际使用了：

- `docs/brainstorm/BetterNoteBook Research/R1-notion-affine-mature-notebook-baseline.md`
- `docs/brainstorm/BetterNoteBook Research/R2-better-notebook-core-interaction-spec.md`
- `docs/brainstorm/BetterNoteBook Research/R3-page-canvas-export-boundary-spec.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-manual-notebook-minimum-usable-experience.md`
- `docs/brainstorm/产品完善/PI-046 Research/R5-page-editor-freeform-block-box-requirements.md`
- `docs/brainstorm/产品完善/PI-046 Research/R4-R5-补充调研.md`
- `docs/brainstorm/产品完善/PI-046 Research/R7-affine-product-experience-review.md`
- `docs/brainstorm/产品完善/product-improvement-issue-register.md`

R4 也读取了当前实现证据：

- `client/src/pages/Notes/NoteDetail.tsx`
- `client/src/pages/Notes/NoteDetail.module.css`
- `client/src/pages/Courses/LearningCanvasSurface.tsx`
- `client/src/pages/Courses/LearningCanvasSurface.module.css`
- `shared/types/index.ts`
- `server/src/lib/noteBlockTemplates.ts`

## PI-046 Consistency / Conflict Check

R4 不推翻 PI-046。R4 把 PI-046 R4/R5/R7 中关于自然写作、block-box、AFFiNE 体验参考的判断转成视觉规格。

继承的 PI-046 结论：

- 当前 NoteDetail 是工程 seed，不是成熟 editor。
- 当前 Canvas 节点像工程卡片，不像最终笔记内容。
- 普通写作状态下 block 边界应弱化。
- layout edit mode 下才应显示边框、resize handle、drag handle、alignment guide。
- AFFiNE 的价值不只是好看，而是它证明成熟编辑器需要自然输入、toolbar、selection、resize、style、connector、frame、sticky/note 等完整交互层。
- Coincides 不能让外部 editor 吞掉 source / relation / template / proposal truth。

R4 的新增收束是：

```text
Block 的视觉语言必须由内容用途和交互状态共同决定，
不能由数据库类型标签常驻决定。
```

## Browser Harness Observation Log

### 观察对象

- 当前本地 Coincides：`http://localhost:5173/#/courses/9581258b-79da-41b5-a309-87cbf723a8b7`
- 当前页面：`Real Material Smoke Course`
- 当前状态：Henry 已手动登录测试账号，Browser Harness 可读取并截图当前页面。

### 可观察视觉状态

当前 Canvas Document 截图显示：

- 左侧 app sidebar 已经比较稳定；
- Canvas Document 区域有 A4 portrait、5 nodes、1 hidden、Source Board 标识；
- 节点被渲染为明显卡片；
- 节点内部常驻显示 title、`source board node`、page、Open、Hide；
- 选中节点时显示强边框、四向连接点、resize handle；
- 多条 relation lines 在节点附近可见；
- 右侧仍有 inspector / command context / hidden nodes / relation layers；
- 整体仍明显是工程工作台，而不是最终阅读/写作页。

R4 由此确认：当前 Canvas seed 的交互能力有价值，但节点视觉不应作为 Better Notebook 的默认 block 视觉。

### 限制说明

- 本轮没有创建、移动、删除或编辑任何数据。
- 本轮只使用截图和 DOM 文本作为非破坏性视觉证据。
- 本轮没有重新进入 Notion / AFFiNE 做新截图，R4 复用 R1/R7 的公开资料和旧观察。

## 当前 Coincides 视觉实现对照

### NoteDetail 当前视觉

当前 NoteDetail 的主流程是：

```text
template select
textarea
Add block
block card list
block toolbar
block type pill
block textarea
KaTeX preview
source reference pills
```

CSS 证据显示：

- `.block` 是带 border、radius、glass surface 的卡片；
- `.blockToolbar` 常驻；
- `.blockType` 是高亮 pill；
- `.blockText` 是可 resize textarea；
- `.preview` 是单独边框 preview；
- source reference 是 pill。

这适合作为工程调试和 seed editor，但不适合 Better Notebook 主体验。

### Canvas 当前视觉

当前 Canvas node 的主结构是：

```text
article.node
  title
  node type label
  summary
  Open / Hide buttons
  resize handle
  connect ports when selected / connect mode
```

CSS 证据显示：

- `.node` 是带背景、边框、阴影、padding 的卡片；
- `.nodeSelected` 使用 accent border 和 glow；
- `.nodePort` 是四向圆点；
- `.resizeHandle` 常驻在 node 右下角；
- node summary 有 line clamp。

这同样适合作为 projection debug seed，但不适合最终阅读态。

### 当前模板系统

当前默认 NoteBlock templates 已有：

```text
text.paragraph
text.heading
concept.basic
definition.basic
theorem.basic
proof.basic
formula.math
example.general
exercise.general
answer.general
source.quote
warning.callout
code.snippet
```

系统类型已预留：

```text
text
latex
code
source_quote
task
media
table
```

但当前默认模板里尚未形成成熟的 `image`、`table`、`figure`、`caption`、`sticky note`、`scratch note`、`side note` 视觉块。这是 R4 的重要 roadmap gap。

## 核心视觉原则

### 原则 1：阅读态优先像内容

普通阅读状态下，block 不应该像数据库 row。

默认应该隐藏：

- block type pill；
- template key；
- node type；
- target id；
- Open / Hide 等工程按钮；
- source/relation/debug metadata；
- resize handle；
- connect port。

默认应该显示：

- 内容本身；
- 必要的排版差异；
- 轻量 source / warning / relation 状态 indicator；
- 对阅读有帮助的 caption / quote attribution。

### 原则 2：结构信息按需显露

结构信息不消失，只是收纳到合适层级：

```text
阅读态: 内容 + 极弱提示
hover: 弱边框 + drag handle seed + small badges
选中态: visible frame + local toolbar + resize handles
layout edit mode: full box boundary + alignment guides + placement controls
inspector/debug: template/source/relation/provenance/history/details
```

### 原则 3：内容类型不是强装饰

Definition、Theorem、Proof、Formula、Example 等需要有视觉差异，但差异应该帮助阅读，不应该把页面做成一堆彩色卡片。

推荐：

- 用 typography、spacing、left rule、subtle label、caption、background tint 做差异；
- 避免每个块都有厚重边框；
- 避免所有 block 都是同一种 card；
- 避免用过多颜色表达语义。

### 原则 4：visual style 不等于 semantic truth

`definition.basic` 可以有 definition 视觉样式，但视觉样式不是 truth。

底层 truth 仍是：

```text
NoteBlock content
TemplateDefinition
learning_role
source references
ObjectRelation
placement/export/AI visibility
```

视觉样式是 render policy / style profile / block appearance，不应反向改写内容 truth。

### 原则 5：source-grounded 只需要轻提示，不需要常驻大面板

Source quote、source-backed block、user-authored block、AI-condensed block 应该可区分，但不应常驻占据正文。

推荐：

```text
small provenance badge
source count chip
hover preview
click -> source inspector / jump
```

而不是：

```text
每个 block 顶部常驻大量 source metadata
```

## Block 状态视觉规格

### Reading State

用户只是阅读。

显示：

- 文本、公式、图片、代码、表格等内容；
- 必要 caption；
- 很弱的 source/relation indicator；
- 仅在重要 warning 时显示 warning mark。

隐藏：

- block type；
- template key；
- resize handle；
- drag handle；
- Open / Hide；
- target id；
- debug code。

### Writing State

用户正在编辑某个 block。

显示：

- caret；
- inline formatting toolbar；
- slash command menu；
- 当前 block 的弱边界；
- 必要的 formula/code editor affordance。

隐藏：

- 与当前编辑无关的 source board / command context；
- 大量工程 metadata。

### Hover State

用户鼠标停在 block 上。

显示：

- subtle boundary；
- small drag handle；
- source/relation count badge；
- warning badge；
- maybe block role tooltip。

不建议显示完整 block type label 和所有操作按钮。

### Selected State

用户选中 block。

显示：

- visible frame；
- resize handles；
- local toolbar；
- block type / role small label；
- source/relation/provenance badges；
- open inspector affordance。

Selected state 是 reveal metadata 的第一层。

### Layout Edit Mode

用户正在排版。

显示：

- full block-box boundary；
- resize handles；
- drag handles；
- alignment guides；
- snap hints；
- page margin guides；
- export role badge；
- formal/scratch/private status。

此时看见边框是合理的，因为用户正在处理 layout。

### Inspector / Debug State

用户打开属性面板或开发者/debug 模式。

显示：

- template definition；
- system type / learning role；
- source references；
- relation list；
- export visibility；
- AI visibility；
- operation history；
- proposal / migration metadata；
- canvas node id / note block id 等 debug 信息。

这些不应该常驻正文。

## 内容类型视觉规格

### Paragraph / Text

默认视觉：

```text
无明显边框
自然正文排版
宽度由 block-box 决定
height auto grow
```

编辑态：

- 显示 caret；
- 可 inline format；
- hover 时弱边界；
- selected/layout mode 显示边框和 handles。

R4 判断：

```text
普通 paragraph 默认应无边框。
```

否则 Better Notebook 会继续像工程卡片。

### Heading

默认视觉：

- 使用层级 typography；
- 与下方内容有清晰 spacing；
- 可进入 outline；
- 不需要 card。

建议：

- heading block 可以显示 collapse affordance；
- heading 的 block type 不常驻显示；
- hover/selected 时显示 heading level。

### Definition

默认视觉：

- 比 paragraph 更有结构感；
- 可使用轻左边线、轻背景或 small label；
- 正文仍应优先。

建议形态：

```text
Definition. [term] ...
```

或：

```text
Definition
content...
```

R4 不建议每个 definition 都是厚重卡片。数学笔记里 definition 很多，厚卡片会拖慢阅读节奏。

### Theorem

默认视觉：

- 可以比 definition 更正式；
- 支持 theorem title / number / conditions；
- 可折叠 proof；
- 可显示 prerequisite / relation badge。

建议：

- Theorem statement 应清晰；
- source/proof/relation 进入 hover/inspector；
- 如果来自 source，可显示 subtle source indicator。

### Proof

默认视觉：

- 更接近连续文本；
- 可支持 step indentation；
- 可折叠；
- 可显示 QED marker / proof end marker。

R4 建议：

- Proof 不应该默认变成带强色卡片；
- Proof 的关键是结构层级和可折叠性。

### Formula / LaTeX

需要同时支持：

```text
inline formula
display formula block
```

Inline formula：

- 属于 paragraph / theorem / proof 文本内部；
- 不应该强行变成独立 block。

Display formula block：

- 居中或根据 block alignment；
- 可编号；
- 可 resize block width；
- 可显示 LaTeX source 编辑入口；
- 错误时显示 warning，不吞内容。

R4 结论：

```text
formula.math 是第一阶段必须打磨的重点块。
```

当前 KaTeX preview 是好种子，但最终应从 textarea + preview 分离升级成“编辑时看源码/预览，阅读时只看公式”。

### Image / Figure

当前默认模板缺成熟 image block。R4 建议 Better Notebook 第一阶段至少规划 image / figure。

默认视觉：

- 图片本体；
- 可选 caption；
- 可选 source indicator；
- resize handles 在 selected/layout mode 显示；
- crop 进入后续图像工具，不必第一阶段完整实现。

最小需求：

```text
insert image
resize
caption
source/provenance
align with text block
```

不建议：

- 把 image 当普通 source card；
- 默认显示大量文件名、id、metadata。

### Code

默认视觉：

- monospace；
- language label 可弱显示；
- 复制按钮 hover / selected 时出现；
- 可折叠长代码；
- source/provenance 进入 badge/inspector。

当前 `code.snippet` 已有模板 seed，但视觉渲染仍需独立于普通 paragraph。

### Table

当前系统类型有 `table`，但默认模板和 UI 不成熟。

R4 建议：

- 第一阶段不做完整 table editor；
- 但需要保留 table block 视觉语言；
- table 可以先作为 read-only / simple editable structured block；
- source reconstruction 后的表格应先进入 proposal 或 source region，不要强行手写完整 spreadsheet。

### Source Quote

Source quote 是 Coincides 的核心差异块。

默认视觉：

- 像 quote / excerpt；
- 引用内容清晰；
- source indicator 清楚但克制；
- 点击 source badge 可跳转 source inspector；
- 多 source 时显示 source count，不常驻展开所有 source。

建议显示：

```text
quote content
source badge: 2 sources / p.3 / source scope
```

不建议：

```text
Source reference page x-y + full IDs + action buttons 常驻正文
```

### Callout / Warning

默认视觉：

- 轻背景；
- 小 icon；
- 用于 warning、note、reminder、important；
- 不应过多使用鲜艳颜色。

Callout 与 sticky note 的区别：

```text
Callout = formal page content block
Sticky note = workspace/scratch visual form
```

同一内容可以使用相似文本，但 export/AI role 不同。

### Sticky Note / Side Note

Sticky note 是视觉形式，不必一定是新 truth type。

R4 建议第一阶段把它理解为：

```text
NoteBlock 或 CanvasRemark 的 scratch/sidebar presentation
```

关键差异不是文本内容，而是 placement/export/AI role：

```text
export_role = scratch / annotation / private_note
export_visibility = do_not_export / export_if_selected
ai_visibility = readable_with_context / private_by_default
```

视觉：

- 可有轻纸片感；
- 可有颜色变体；
- 可 auto height；
- 可在页面外或 margin 区；
- 可 relation 到 formal block。

但 R4 不建议第一阶段做复杂贴纸/图钉视觉。先做干净 sticky note，后续交给 Visual Style Studio / style pack。

### Scratch Note

Scratch note 更偏用户临时推导。

视觉：

- 比 sticky note 更弱、更临时；
- 可放页面外；
- 默认不导出；
- AI 可读时需要上下文标记；
- 可手动提升为 formal content。

R5/R8 后续需要定义：

- move to formal page；
- include in export；
- mark private；
- link to theorem/proof/formula。

### Future Custom Template Block

自定义 block style 不应在第一阶段全面开放。

原因：

- 用户样式系统一旦开放，必须处理主题、导出、HTML/PDF、AI 可读、package、兼容性；
- 过早开放会让产品视觉混乱；
- 当前最紧急的是先把默认 blocks 做成熟。

R4 建议路线：

```text
Phase A: 固定核心 block 视觉语言
Phase B: block render hint / style preset
Phase C: Visual Style Studio seed
Phase D: packageable style packs
```

开放用户自定义时，要受 TemplateDefinition / render_hints / style preset 约束，而不是让用户直接改所有 CSS。

## Metadata 显示规则

### Block type

R4 结论：

```text
Block type 不应常驻显示。
```

显示层级：

- Reading：不显示或极弱显示；
- Hover：可显示 small role badge；
- Selected：显示 block type / template label；
- Inspector：显示完整 template/system type/learning role；
- Debug：显示 template id、block id、target id。

### Source

显示层级：

- Reading：source badge / citation marker；
- Hover：source count / page label；
- Selected：source action；
- Inspector：完整 source refs、anchors、scopes、jump target；
- Debug：source ids。

### Relation

显示层级：

- Reading：默认不显示长线，除非同页短关系且用户开启；
- Hover/Selected：显示 relation count；
- Inspector：relation list；
- Local graph：展开关系网络；
- Debug：ObjectRelation / CanvasEdge IDs。

### Template / Domain / Proposal / Provenance

默认都不应常驻正文。

进入：

- inspector；
- debug panel；
- proposal preview；
- compatibility report；
- migration UI；
- future agent-readable audit panel。

## 视觉层与数据层的推荐关系

R4 建议把视觉语言拆成四层：

```text
content_role: paragraph / definition / theorem / proof / formula / image / ...
placement_role: formal / scratch / side_note / private / annotation
interaction_state: reading / writing / hover / selected / layout_edit / debug
style_profile: default / compact / presentation / high_contrast / user_style_pack
```

这比把所有东西塞进 `block_type` 更稳。

例子：

```text
content_role = theorem
placement_role = formal
interaction_state = reading
style_profile = default
```

会渲染为正式 theorem statement。

另一个例子：

```text
content_role = paragraph
placement_role = scratch
interaction_state = selected
style_profile = sticky
```

会渲染为页面外 sticky note，并显示可移动边框。

## 第一阶段工程边界建议

### 第一阶段必须做

- paragraph 默认无明显边框；
- heading / definition / theorem / proof / formula / quote / callout / code 有基础视觉差异；
- block type 常驻隐藏，selected/hover/inspector 显示；
- source indicator 克制显示；
- selected state 显示边框、toolbar、resize handle；
- layout edit mode 显示完整 block-box；
- display formula 渲染更像内容；
- code block 独立视觉；
- source quote 有 citation/source badge；
- sticky/scratch note 有最小视觉和 export/AI role 区分；
- debug metadata 进入 inspector/debug mode。

### 第一阶段可以不做

- 完整 custom block style editor；
- 完整 table editor；
- 完整 image crop editor；
- full theme system；
- user CSS；
- style pack marketplace；
- complex hand-drawn sticky/pin visuals；
- relation line style editor；
- full formula editor with autocomplete；
- block animation。

## Roadmap Draft Impact

R4 建议新版 Better Notebook roadmap 加入一个明确阶段：

```text
Phase A3 - Block Visual Language Pass
```

它可以和 R2/R3 形成连续链：

```text
Phase A1 - Natural Page Editing + Freeform NoteBlock Box
Phase A2 - Page Boundary and Export Intent Seed
Phase A3 - Block Visual Language Pass
```

R4 对 R5 的直接要求：

- R5 必须决定 block type、source、relation、export intent、AI visibility、debug info 分别放在 hover、selected toolbar、right-click、inspector、debug mode 的哪里。
- R5 必须区分 normal block actions 与 layout actions。
- R5 必须区分 Hide、Archive、Delete、Remove from projection、Exclude from export。

R4 对 R6 的直接要求：

- R6 数据契约必须支持 content role、placement role、interaction state、style profile 或等价字段。
- R6 需要决定 visual style 是放在 `render_hints`、placement metadata、style profile，还是未来 StyleDefinition。

R4 对 R7/R8 的直接要求：

- 如果评估 AFFiNE / BlockSuite，不能只看它是否能显示 block；必须验证它能否隐藏 debug metadata、弱化 block 边界、支持 selected/layout state、支持 Coincides source/relation/template badges。

## Backfeed Notes

R4 不反补 R0-R3，但会强化 R3：

R3 定义：

```text
formal page / outside scratch / export intent / AI visibility
```

R4 补充：

```text
formal 和 scratch 不只是数据字段，也必须有克制但可理解的视觉差异。
```

R4 也强化 R2：

```text
用户不应先理解 NoteBlock；
用户也不应一直看见 NoteBlock 的工程边框。
```

## R4 结论

Better Notebook 的 block 视觉语言应从“工程卡片”升级为“内容优先、结构按需显露”。

当前 Coincides 已经有模板、NoteBlock、CanvasNode、KaTeX、source refs、relation layers，这些都是好地基。但默认视觉仍然是：

```text
卡片
边框
type pill
Open / Hide
textarea
preview
debug scope
```

R4 的最终建议是：

```text
阅读态像文档内容；
hover 态弱显结构；
选中态显示局部控制；
layout edit mode 显示完整 block-box；
inspector/debug 才显示 metadata。
```

第一阶段不要急着开放完整样式编辑器。先把 paragraph、heading、definition、theorem、proof、formula、image、code、table、source quote、callout、sticky/scratch note 的默认视觉语言打磨成熟。这样 Coincides 才会从“能管理 NoteBlock”变成“真的能读、能写、能排版的一款笔记软件”。
