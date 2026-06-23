# Text First, Structure Aware Notebook Philosophy

```text
date: 2026-06-14
discussion time: around 20:45 America/Toronto
status: brainstorm / product philosophy record
scope: TextBlock, TextUnit, InlineStructuredObject, NoteBlock, Relation Endpoint, AI Readable Projection
```

本文记录一次重要的产品哲学梳理：Coincides 不应该只是一个 block-first notebook，也不应该退化成普通富文本编辑器。它要解决的是 AI 时代笔记软件的一个核心矛盾：

```text
人类需要自然连续书写。
AI 需要结构化、可寻址、可检索的数据。
```

这次讨论形成的核心方向是：

```text
Coincides = text-first, structure-aware, canvas-capable notebook
```

更产品化地说：

```text
Human writes naturally.
Coincides structures quietly.
AI reads clearly.
Canvas organizes spatially.
Relations keep knowledge alive.
```

## 1. 为什么这个问题出现

最初的问题看起来只是 block taxonomy：

```text
paragraph / heading / formula / definition / code / source quote
到底哪些应该是 NoteBlock type？
哪些只是 text role？
哪些应该进入 slash menu？
```

但继续往下推，会发现这个问题问得太浅。真正的问题是：

```text
用户平常写笔记时，真的会频繁主动创建很多 block 吗？
```

答案大概率是否定的。

如果用户只是在写一篇自然笔记，尤其是学习笔记、教材整理、课堂记录、研究草稿、日记式材料整理，他们通常不希望为了每一个 definition、formula、example、source marker 都停下来新建一个独立 block。

人类的自然写作经常是连续的：

```text
上文解释背景。
某一句其实是 definition。
后文继续举例、解释、推导。
```

如果强迫用户拆成：

```text
ParagraphBlock before
DefinitionBlock
ParagraphBlock after
```

会打断自然写作。

但反过来，如果整篇笔记只是一个普通富文本大字符串，AI、relation、source provenance、local graph 又很难稳定读取其中的知识颗粒。

因此我们需要一个折中模型。

## 2. 第一层：TextBlock 是默认写作容器

TextBlock 是用户自然书写的默认世界。

它不是狭义的 paragraph。它应该是一个能承载连续写作、轻结构写作、局部结构化知识的容器。

```text
TextBlock
  承载连续文本
  承载段落层级
  承载 heading / list / quote 等轻结构
  承载 inline formula / inline definition / inline source marker
  承载普通 rich text span
```

这意味着：如果用户没有复杂排版需求，理论上可以用一个 TextBlock 写完一整篇 note。

这和 block-first 的设计不同。Block-first 会让用户不断创建和管理许多独立对象；Text-first 则允许用户先顺着自己的思路写。

## 3. 第二层：TextUnit 是 TextBlock 内部的编辑结构

TextBlock 不能只是一个巨大字符串。否则用户难以局部操作，AI 也难以分层阅读。

因此 TextBlock 内部需要 TextUnit。

TextUnit 是 TextBlock 内部的自然写作单位：

```text
paragraph
heading
list item
todo item
toggle item
quote line
child paragraph
```

类似 Notion / AFFiNE 中的体验：

```text
Enter
  创建新的同级文本单元。

Tab
  当前文本单元缩进，成为上一单元的 child。

点击父级 handle
  可以选中父级和它的 children。
```

这背后可以理解为 TextUnit tree：

```text
TextBlock
  TextUnit 1: heading
  TextUnit 2: paragraph
  TextUnit 3: list item
    TextUnit 4: child explanation
```

TextUnit 主要服务：

```text
自然编辑
层级组织
局部选择
AI 分段阅读
未来 block split / promote
```

但普通 TextUnit 默认不一定是 relation 节点。否则每一行、每一段都会变成图节点，系统会过重。

## 4. 第三层：InlineStructuredObject 是知识颗粒

这是 Coincides 真正区别于普通 notebook 的关键。

在 TextUnit 内部，某一小段文字可以被结构化标记为知识对象：

```text
InlineDefinition
InlineFormula
InlineCode
InlineSourceMarker
InlineClaim
InlineExample
```

例如用户写：

```text
Power series is a series of the form ...
```

它可以仍然留在自然段里，同时获得结构化字段：

```text
kind: definition
concept_name: power series
description: a series of the form ...
anchor_text: 原文片段
parent_text_unit_id: ...
parent_block_id: ...
```

这样用户不需要把自然段硬拆开，但 AI 可以明确知道：

```text
这里有一个 definition。
它定义的概念是什么。
它的描述是什么。
它位于哪一段上下文里。
```

这不是普通高亮，也不是简单样式。它是结构化知识颗粒。

## 5. 第四层：NoteBlock 是独立布局对象

NoteBlock 不再是所有知识的唯一单位。它更像页面/画布上的独立布局对象。

什么时候需要 NoteBlock？

```text
需要单独移动
需要 resize
需要图文并排
需要放到 canvas workspace
需要作为独立卡片
需要大公式居中
需要表格、图片、代码块
需要被用户明确当作一个对象操作
```

因此形成一个重要原则：

```text
Inline first.
Block when needed.
```

用户平常自然写作时，很多知识颗粒可以先留在 TextBlock 内部；当用户需要排版、强调、拆分、独立引用、图文并排时，再把它们提升成独立 NoteBlock。

## 6. 第五层：Split / Promote / Demote 是桥梁

如果用户一开始把很多内容都写在一个 TextBlock 里，后面需要复杂排版，系统必须提供从文本流到独立 block 的桥梁。

关键操作包括：

```text
Split Block
Promote Selection To Block
Demote Block To Inline
Extract TextUnit To Block
```

### Split Block

如果光标在一个 TextBlock 中间：

```text
上半部分 -> TextBlock A
下半部分 -> TextBlock B
```

如果用户选中中间一段内容：

```text
选区前 -> TextBlock A
选中内容 -> 新 NoteBlock B
选区后 -> TextBlock C
```

这非常关键。它允许用户先自然写，再根据排版需求拆开，而不是从一开始就被迫规划复杂 block 结构。

### Promote Selection To Block

选中的 InlineDefinition 可以提升为独立 DefinitionBlock。

选中的 InlineFormula 可以提升为独立 FormulaBlock。

选中的多行 code 可以提升为 CodeBlock。

### Demote Block To Inline

独立 DefinitionBlock 也可能被降回某个 TextBlock 中的 InlineDefinition。

独立 FormulaBlock 也可能被降回 inline formula。

这让 block 和 inline 之间不是单向迁移，而是可逆的内容组织策略。

## 7. 第六层：Addressable Knowledge Object 改写 relation 节点定义

以前默认假设：

```text
Relation endpoint = NoteBlock
```

现在更成熟的假设是：

```text
Relation endpoint = Addressable Knowledge Object
```

它可以是：

```text
NoteBlock
TextUnit
InlineStructuredObject
SourceArtifact
SourceRegion future
ConceptEntity future
CanvasObject / Region future
```

但必须有约束：

```text
普通文字不是 relation 节点。
只有被结构化、被 source 绑定、被 relation 指向、被用户确认、或被 AI proposal 接受的对象，才获得稳定 identity。
```

如果一个 InlineDefinition 被 relation 指向，它就不能只是普通 rich text span。它必须拥有可追踪身份：

```text
inline_object_id
parent_block_id
parent_text_unit_id
semantic_kind
field_values
anchor_range / anchor_text
status
```

如果父 TextBlock 被编辑导致 anchor 失效，它应该进入：

```text
stale
degraded
broken
```

而不是静默消失。

这会让 relation 连接真正的信息颗粒，而不是只能粗暴连接整个 NoteBlock。

## 8. 第七层：AI Readable Projection

AI 不应该只读一个两三千字的大 blob，也不应该只读碎片化 block。

它应该读一个分层投影：

```text
Note
  NoteBlock
    TextUnit tree
      InlineStructuredObject
      SourceReference
      RelationEndpoint
```

AI 可以先看结构：

```text
哪里是 heading
哪里是自然段
哪里是 list
哪里有 inline definition
哪里有 inline formula
哪里绑定 source
哪里是 relation endpoint
```

再决定深入读取哪一层。

这会让 AI 的阅读自然程度提高。它不需要靠猜测从普通文字中识别 definition、formula、claim、source marker，而可以直接读取系统保存的结构化投影。

这也服务检索。

普通关键词搜索可以找到“草莓”这个词；但如果用户问“哪一段写到了我那天吃草莓的故事”，AI 需要理解叙事片段。TextUnit 可以作为更自然的检索单位，比整个 TextBlock 更细，又不会像每句话都拆成 NoteBlock 那样夸张。

## 9. Slash Command 的新定位

Slash menu 不应该只是 block picker，而应该是：

```text
Writing Command Palette
```

它有四类动作：

```text
create_block
convert_block
insert_structure
inline_action
```

同一个 command 在不同上下文下含义不同。

### /definition

```text
空 block
  -> 创建独立 DefinitionBlock

选中文字
  -> 标记为 InlineDefinition

当前 TextUnit
  -> 将当前句子/段落标记为 InlineDefinition

选中一段并要求排版
  -> Promote to DefinitionBlock
```

### /formula

```text
空 block
  -> 创建独立 FormulaBlock

选中文字
  -> 标记为 InlineFormula

当前行
  -> 提升为 FormulaBlock
```

### /code

```text
选中文字
  -> 标记为 InlineCode

多行内容
  -> 提升为 CodeBlock
```

### /source

```text
选中文字
  -> 添加 SourceReference / InlineSourceMarker

整个 block
  -> 添加 block-level SourceReference
```

因此 slash command 必须理解上下文，不能只是把所有命令当成“插入某种 block”。

## 10. 与 Notion / AFFiNE 的区别

Notion / AFFiNE 的 block 系统主要服务：

```text
编辑体验
页面组织
视觉结构
协作
```

它们不需要让每个局部知识点都天然成为 AI / relation / provenance 可读的结构对象。

Coincides 的差异不应该只是“有更多 block type”，而是：

```text
视觉上像自然笔记。
数据上是可寻址知识结构。
```

如果太 block-first，用户写作会被切碎。

如果太 text-only，系统会退化成普通富文本，AI 只能猜。

Coincides 的中间路线是：

```text
默认连续写作。
需要结构时加 inline object。
需要层级时用 TextUnit。
需要布局时拆成 NoteBlock。
需要语义连接时把可寻址对象提升为 relation endpoint。
```

## 11. 成熟产品哲学总句

这次讨论形成的长期原则：

```text
自然文本承载知识。
TextUnit 承载层级。
InlineStructure 提取知识。
独立 Block 承载布局。
Canvas 承载空间关系。
Relation 承载语义连接。
AI Projection 承载机器阅读。
```

或者：

```text
人类自然写。
系统安静结构化。
AI 清楚阅读。
画布组织空间。
关系保持知识活性。
```

这不是单纯的 V2.BN.8.3 局部设计，而是整个 Coincides 面向 AI 时代的产品主轴之一。

## 12. 对后续文档的影响

这套思路后续应该影响：

```text
PRODUCT.md
docs/PRD.md
docs/contracts/Block-Contract.md
docs/contracts/Canvas-Page-Surface-Contract.md
docs/contracts/Link-Source-Relation-Boundary-Contract.md
docs/Coincides-Relation-Product-Design.md
docs/releases/V2.BN.8/V2.BN.8.3-Text-Block-And-Slash-Command-Foundation-Plan.md
docs/releases/V2.BN.8/Canvas-Engine-State-And-Data-Contract.md
docs/releases/V2.BN.8/Canvas-Engine-Interaction-Contract.md
```

尤其要新增或重写以下契约：

```text
TextFlow / TextUnit Contract
InlineStructuredObject Contract
Addressable Knowledge Object / Relation Endpoint Contract
AI Readable Projection Contract
Split / Promote / Demote Operation Contract
```

## 13. 待继续讨论的问题

- TextBlock 是否应该成为所有普通自然写作的唯一默认容器？
- TextUnit 是否需要稳定 ID，还是只在被引用、被 relation 指向、被 source 绑定时才 promotion 出稳定 identity？
- InlineStructuredObject 的 anchor 该如何在文本编辑后保持稳定？
- InlineDefinition 和独立 DefinitionBlock 是否共享同一套 semantic payload？
- InlineFormula 和 FormulaBlock 的转换是否可逆？
- SourceReference 是否可以绑定到 TextUnit / InlineStructuredObject，而不是只绑定 NoteBlock？
- Relation endpoint 的最低可寻址单位应该是什么？
- AI Readable Projection 是实时生成，还是保存索引快照？
- Split / Promote / Demote 是否需要完整 undo/redo 和 provenance 保留？
- 这套模型什么时候进入正式 Data Model，而不是只停留在 brainstorm？

## 14. 当前判断

这套模型基本可以解决目前看到的主要矛盾：

```text
用户可以像普通笔记软件一样自然写。
系统仍然可以保存结构化知识。
AI 可以读得比普通富文本更清楚。
Relation 可以连接真正的信息颗粒。
Canvas 和独立 NoteBlock 仍然保留复杂排版能力。
```

因此它应该被视为 Coincides 的重要产品哲学突破，而不是普通小版本的功能补丁。

## 15. 追加升级：Split 之后必须有 Merge

前面的讨论中，我们把 `Split Block` 视为 TextBlock 和 NoteBlock 之间的桥梁。但这套桥梁不能只有拆分，必须同时存在融合。

如果系统只支持 split，内容会越来越碎，用户最后会被迫管理大量零散 block。这违背自然写作的初衷。因此 TextFlow Operations 至少应该包含一组双向操作：

```text
Split Block
Merge Blocks
Promote Selection To Block
Demote Block To Inline
Extract TextUnit To Block
```

其中 `Split Block` 和 `Merge Blocks` 是一对。

### Merge Blocks

`Merge Blocks` 的第一版可以这样理解：

```text
用户多选两个或多个 TextBlock
  -> 执行 Merge
  -> 系统按当前视觉阅读顺序合并
  -> 生成一个 TextBlock
  -> 原来的每个 block 内容变成新的 TextUnit / TextUnit subtree
```

重点不是把文字粗暴拼接成一坨，而是保留原本的自然段、列表、heading、inline structure 和 source / relation anchor。

例如：

```text
TextBlock A
  TextUnit A1: paragraph

TextBlock B
  TextUnit B1: paragraph
  TextUnit B2: inline formula

TextBlock C
  TextUnit C1: list item
```

合并后应该是：

```text
TextBlock Merged
  TextUnit A1: paragraph
  TextUnit B1: paragraph
  TextUnit B2: inline formula
  TextUnit C1: list item
```

这样拆分和融合都不会破坏内部结构。

这意味着 `TextFlow Operations` 不只是编辑便利功能，而是 Coincides 在自然写作、结构化知识和空间排版之间移动内容的基础机制。

## 16. 追加升级：TextUnitGroup 可以成为 relation endpoint

前面我们提出：

```text
Relation endpoint = Addressable Knowledge Object
```

这一步讨论继续向前推进后，出现了一个非常关键的对象：

```text
TextUnitGroup
```

它的意义是：relation endpoint 不必只能是一个完整 NoteBlock，也不必直接下降到脆弱的句子级 offset。多个 TextUnit 可以被打包为一个稳定的知识对象。

例如一个 TextBlock 内部可能有：

```text
TextUnit A: definition 背景
TextUnit B: 核心定义
TextUnit C: 解释
TextUnit D: example
```

用户可以把：

```text
TextUnit B
```

作为 endpoint，也可以把：

```text
TextUnit B + TextUnit C
```

打包为：

```text
TextUnitGroup: definition_body
```

然后让 relation 指向这个 group。

这比强迫用户拆出一个独立 DefinitionBlock 更自然，也比直接锚定某一句话更稳定。

### Endpoint 粒度建议

第一版可以采用分层策略：

```text
默认 endpoint:
  NoteBlock
  InlineStructuredObject

细粒度 endpoint:
  TextUnit
  TextUnitGroup

高风险 endpoint:
  AnchoredSpan
```

`AnchoredSpan` 可以表示一句话或短语，但它必须是显式创建的稳定对象，而不是直接依赖字符 offset。

原因是文字会被编辑。直接用 offset 记录 “第 128 到第 160 个字符” 非常脆弱；一旦用户改写前文，endpoint 就可能漂移。

因此句子级 endpoint 如果存在，应该被包装成：

```text
AnchoredSpan
  id
  block_id
  text_unit_id
  selected_text_snapshot
  anchor_strategy
  status
```

当 anchor 失效时，状态可以进入：

```text
stale
needs_review
recovered
broken
```

这和 source chain / provenance 里面的 degraded 思路是一致的。

### 重要原则

不是所有文本都会默认成为图节点。

只有被用户、模板、AI proposal、source reference 或 relation 行为明确提升的内容，才成为 Addressable Knowledge Object。

这可以避免 graph 爆炸，同时保留细颗粒 relation 的可能性。

## 17. 追加升级：DefinitionBlock 不应再被硬编码成特殊字段块

这一轮讨论最有趣的升级，是对 `DefinitionBlock` 的重新理解。

早期我们设想：

```text
DefinitionBlock
  concept_name
  description
```

这种设计的优点是清晰，AI 很容易读取；缺点是它会把用户写作锁进固定字段。

现在引入 `TextUnitGroup` 后，定义对象可以不再依赖硬编码字段，而是变成：

```text
DefinitionBlock = 带有 definition role 的 TextBlock / TextUnitGroup 呈现模板
```

也就是说：

```text
TextUnitGroup: definition
  TextUnit: concept label
  TextUnit: definition body
  TextUnit: example / note / condition
```

这仍然能让 AI 读出：

```text
concept_name
description
example
condition
```

但这些字段不再必须是底层内容真相，而可以是机器读取时生成的 slot mapping / projection。

因此新的三层模型应该是：

```text
内容真相:
  用户写下来的 TextUnit / InlineStructure

结构标注:
  哪些 TextUnit 被打包成 definition / theorem / formula explanation

机器投影:
  AI / graph / export 读取时生成 concept_name / description / label 等字段视图
```

这意味着：

```text
concept_name 和 description 仍然存在
但它们更像 AI Readable Projection
而不是强迫用户填写的 canonical content truth
```

### 哪些 block 仍然需要特殊结构

这并不代表所有 structured block 都可以取消。

以下对象仍然应该保留独立结构：

```text
Table
Image
Code
大型 FormulaBlock
Source Snapshot / Source Quote
CanvasObject
```

因为它们涉及网格、资源引用、渲染模式、文件对象、代码语法或独立交互。

但像 `Definition` 这种文字知识对象，最适合下沉为：

```text
TextUnitGroup + semantic role + render template
```

这样 Coincides 就不是一个 “很多 block type 的集合”，而是一个 “自然文本可以逐层结构化” 的系统。

## 18. 这次升级后的核心判断

这两次追加讨论让前面的模型又推进了一层。

原来的重点是：

```text
TextBlock 是自然写作容器
InlineStructuredObject 是局部知识对象
NoteBlock 承载排版
Relation endpoint 不应只等于 NoteBlock
```

现在进一步变成：

```text
TextFlow 可以拆分，也可以融合。
TextUnit 可以被打包成 TextUnitGroup。
TextUnitGroup 可以成为 relation endpoint。
DefinitionBlock 可以下沉成 semantic role + render template。
结构化字段可以从 canonical truth 退到 AI readable projection。
```

这是一条非常关键的升级路径：

```text
固定字段 block
  -> 自然文本
  -> TextUnit
  -> TextUnitGroup
  -> Semantic role
  -> Addressable Knowledge Object
  -> Relation endpoint
  -> AI Readable Projection
```

它保留了 structured block 的机器可读优势，同时避免让用户在自然写作时被字段表单绑住。

最终原则可以更新为：

```text
结构不是用户一开始必须服从的格式。
结构可以从自然写作里被提取、打包、提升和投影出来。
```

## 19. 追加升级：八个发散点的详细例子版

这一节记录 2026-06-14 晚上进一步脑暴出来的八个发散点。

写这一节的目的不是压缩观点，而是防止第二天醒来之后遗忘当时的推理路径。因此每一点都保留概念、解释、例子和产品意义。

### 19.1 结构不是格式，而是状态

早期容易把 `DefinitionBlock`、`FormulaBlock`、`TheoremBlock` 理解成“格式”。

例如：

```text
DefinitionBlock
  concept_name
  description
```

这像是在要求用户填写一个固定表单。但这一轮讨论后，更成熟的理解是：

```text
definition 不首先是一种格式。
definition 是一段内容被系统理解后的状态。
```

#### 例子

用户自然写下：

```text
A power series is an infinite series of the form sum a_n(x-c)^n.
```

最开始它只是普通文字：

```text
TextBlock
  TextUnit: ordinary paragraph
```

然后 Mr.Zero 扫描笔记，提出：

```text
这句话看起来像是 Power Series 的定义。
```

此时它不是立刻变成正式 definition，而是进入一个候选状态：

```text
candidate_definition
```

用户确认后，它变成：

```text
confirmed_definition
```

后来这段内容被另一篇 note 引用，它又进入：

```text
referenced
```

后来它和 `Taylor Series` 建立关系，它继续进入：

```text
connected
```

如果用户后来改写这句话，使系统无法确认它是否还是原本那个 definition，它可以进入：

```text
stale
needs_review
```

因此，结构不是用户一开始必须套用的外观模板，而是一段内容在使用、确认、引用、连接中逐渐获得的状态。

#### 产品意义

这样做可以避免用户被固定字段绑住。

用户写作时仍然是自然文本；系统内部可以逐渐理解它、标记它、连接它。

### 19.2 Promotion Economy：只有重要内容才获得身份

这一点可以叫：

```text
Promotion Economy
```

也可以暂时翻译为：

```text
身份提升经济
```

核心意思是：所有文字一开始都是轻量的、平等的、便宜的。

它们不是一写出来就拥有 graph identity、relation endpoint identity、source identity。

只有当某段内容被使用时，它才逐渐获得更稳定的身份。

#### 例子

一篇 note 里有一百句话。

如果每句话都自动变成 graph node，系统会非常重：

```text
100 sentences
  -> 100 graph nodes
  -> many possible edges
  -> relation discovery cost explodes
```

但实际上用户和 AI 真正关心的可能只有其中五句话：

```text
1 个核心 definition
1 个 formula
1 个 theorem statement
1 个 important example
1 个 source-backed claim
```

所以默认状态应该是：

```text
ordinary TextUnit
```

只有当它发生以下行为时才被提升：

```text
被用户选中并标记
被 Mr.Zero 识别为 candidate
被用户确认
被 source reference 绑定
被其他 note 引用
被 relation 指向
被导出或加入 AI context
```

提升路径可以是：

```text
plain TextUnit
  -> candidate object
  -> confirmed object
  -> referenced object
  -> connected object
  -> reusable knowledge object
```

#### 产品意义

不是整个知识库都被一口气结构化，而是：

```text
用到哪里，结构化到哪里。
重要到哪里，提升到哪里。
```

这可以控制性能、控制 graph 噪音，也符合用户心智。

人类写笔记时也不是每句话同等重要。只有反复被解释、引用、连接、复用的内容，才真正变成知识节点。

### 19.3 知识对象生命周期

Promotion Economy 自然引出生命周期。

一个知识对象不是静态的。它会经历从普通文本到候选对象，再到确认对象、引用对象、连接对象的过程。

#### 建议生命周期

```text
ordinary
candidate
confirmed
referenced
connected
stale
needs_review
recovered
deprecated
```

#### 例子

用户写下：

```text
Green's theorem converts a line integral around a curve into a double integral over a region.
```

一开始：

```text
ordinary TextUnit
```

Mr.Zero 扫描后认为它像 theorem explanation：

```text
candidate_theorem_explanation
```

用户点确认：

```text
confirmed_theorem_explanation
```

用户把它和一个 formula block 连接：

```text
connected
```

后来用户把这句话改成另外一种表达，系统发现原 relation 的 anchor 可能漂移：

```text
stale
needs_review
```

用户重新确认后：

```text
recovered
```

#### 产品意义

这给 AI proposal 留出了合理空间。

AI 不需要一开始就有最终决定权。它可以提出 candidate，用户确认后才进入正式结构。

这比自动结构化更安全，也比完全手动更高效。

### 19.4 Relation endpoint 不是点，而是可变焦区域

传统 graph 里，endpoint 通常像一个点：

```text
Node A -> Node B
```

但在 Coincides 里，relation endpoint 更适合被理解为一个可变焦区域。

它可以大，也可以小。

#### Green's Theorem 例子

一个 TextBlock 里写：

```text
Green's Theorem states that ...

∮ P dx + Q dy = ∬(∂Q/∂x - ∂P/∂y)dA

where D is a positively oriented region.

This theorem connects line integrals and double integrals.
```

拉远看，relation 可以指向整个 block：

```text
Endpoint = Green's Theorem NoteBlock
```

中等粒度看，relation 可以指向定理陈述：

```text
Endpoint = TextUnitGroup: theorem_statement
```

再拉近，relation 可以指向公式：

```text
Endpoint = InlineFormula / FormulaObject
```

再拉近，relation 可以指向条件：

```text
Endpoint = TextUnit: positively oriented region
```

所以 endpoint 不是固定点，而是可以根据用户和 AI 的需要落在不同层级：

```text
Note
PageFrame
NoteBlock
TextUnitGroup
TextUnit
InlineStructuredObject
AnchoredSpan
```

#### 产品意义

视觉上 canvas 可以 zoom。

语义上 relation endpoint 也可以 zoom。

用户平时看到的是一个 block；AI、relation inspector、local graph 可以看到更细的 endpoint。

这让 Coincides 的 relation 不是粗糙地连接大块内容，而是可以连接真正的信息颗粒。

### 19.5 结构化字段退到投影层

这是本轮讨论中非常关键的变化。

早期模型可能是：

```text
DefinitionBlock truth = concept_name + description
```

这会让用户像填表一样写笔记。

新的模型应该是：

```text
Definition truth = TextUnitGroup
concept_name / description = AI Readable Projection
```

#### 例子

用户自然写：

```text
A power series is an infinite series of the form sum a_n(x-c)^n.
It is centered at c, and the coefficients a_n determine the series.
```

底层内容真相是：

```text
TextUnitGroup: definition
  TextUnit 1: definition body
  TextUnit 2: explanation
```

AI 读取时可以投影为：

```text
concept_name: Power Series
description: A power series is an infinite series of the form ...
condition: centered at c
```

这里的 `concept_name` 和 `description` 仍然存在，但它们不是用户必须填写的底层字段，而是系统对自然文本的读取结果。

如果 AI 读错了，用户可以修正 projection 或 semantic mapping，而不是被迫改写正文。

#### 产品意义

字段是机器读取视角，不是用户写作枷锁。

这可以同时满足：

```text
用户自然写作
AI 清楚读取
relation 精准连接
export 可以结构化
```

### 19.6 Slash Command 应该变成结构化意图入口

Slash command 不能只是 block picker。

如果所有功能都塞进一个 `/` 菜单，会变成选单地狱。

但 slash command 仍然可以成为结构化意图入口。

#### 不同上下文下的同一个命令

同样是 `/definition`：

```text
空白位置输入 /definition
  -> 创建一个 definition role 的 TextBlock / template

选中一段文字后输入 /definition
  -> 把选区标记为 InlineDefinition

选中多个 TextUnit 后输入 /definition
  -> 打包为 TextUnitGroup: definition

选中一个 block 后输入 /definition
  -> 将当前 block 转换为 definition role block
```

同样是 `/formula`：

```text
空白处
  -> 创建 FormulaBlock

选中文本中的 latex
  -> 转成 InlineFormula

选中一段推导
  -> 打包为 formula_explanation group
```

#### Slash 不应该承担全部入口

为了避免 slash menu 过重，未来需要多个入口分担：

```text
Slash command:
  给熟练用户快速输入

Context menu:
  给选区、右键、自然操作

Side palette:
  给可发现性和常用工具按钮

AI proposal:
  由 Mr.Zero 主动提出结构化建议
```

甚至可以有命令前缀：

```text
/create
/insert
/mark
/source
/relate
```

但这只是未来方向，不能在第一版把用户逼进复杂命令系统。

#### 产品意义

Slash command 的本质不只是“插入东西”，而是表达用户的结构化意图：

```text
创建
转换
插入
标记
提升
绑定
连接
```

### 19.7 用户写作视图和 AI 读取视图应彻底分离

这是早期产品设想之一，但现在终于有了更具体的工程路径。

用户看到的是：

```text
自然文本
公式
图
表
排版
canvas workspace
```

AI 看到的是：

```text
TextBlock
TextUnit tree
InlineStructuredObject
TextUnitGroup
Semantic role
SourceReference
Relation endpoint
AI Readable Projection
```

#### 例子

用户视图里只看到：

```text
Green's theorem connects line integrals and double integrals.
```

AI 读取视图里可能看到：

```text
TextUnitGroup:
  role: theorem_explanation
  label: Green's theorem explanation
  related_concepts:
    - line integral
    - double integral
  possible_relation:
    Green's theorem derives connection between line integral and double integral
  source_reference:
    textbook.pdf p.42
```

用户不一定需要看到这套结构。

只有当用户打开：

```text
AI visibility overlay
structure inspector
relation inspector
source inspector
```

这些结构才显出来。

#### 产品意义

用户不应该被系统内部结构打扰。

AI 也不应该被普通富文本的模糊性困住。

同一份内容应该有两种投影：

```text
Human Writing View
AI Reading View
```

这不是欺骗用户，而是让人类和 AI 各自使用最适合自己的表示方式。

### 19.8 知识不是被输入成结构的，而是被逐渐结构化的

这是本轮讨论最重要的产品哲学句子之一。

```text
Knowledge is not forced into structure.
It gradually becomes structured through use.
```

中文可以写成：

```text
知识不是一开始就被迫输入成结构。
知识是在写作、引用、连接、复用、确认的过程中逐渐显出结构的。
```

#### 完整例子

用户第一天只是写：

```text
Power series is important. It looks like sum a_n(x-c)^n.
```

这时它只是普通文字。

第二天，用户让 Mr.Zero 整理笔记。

Mr.Zero 提出：

```text
这可能是 Power Series 的 definition。
这里有一个 formula。
这里可能和 Taylor Series 有关系。
```

这些都是 candidate。

用户确认 definition：

```text
confirmed_definition
```

用户确认 formula：

```text
InlineFormula / FormulaObject
```

用户暂时不确认 Taylor Series relation：

```text
candidate_relation remains unconfirmed
```

第三天，用户在另一篇 note 里引用 Power Series。

这段内容变成：

```text
referenced knowledge object
```

后来用户把它和 Radius of Convergence 连接。

它变成：

```text
connected knowledge object
```

再后来，用户把多个 TextUnit 打包成：

```text
TextUnitGroup: power_series_definition
```

AI 读取时投影为：

```text
concept_name: Power Series
description: ...
formula: sum a_n(x-c)^n
related_to:
  - Taylor Series
  - Radius of Convergence
```

这整条路径说明：知识不是一开始被填进 rigid schema，而是在使用中逐渐显出结构。

#### 产品意义

Coincides 不应该只是：

```text
一个有 AI 的笔记软件
```

也不应该只是：

```text
一个有 graph 的笔记软件
```

它更像：

```text
自然写作层
  -> 安静结构化层
  -> AI readable projection 层
  -> relation / graph / provenance 层
  -> canvas 空间表达层
```

这就是 AI 时代 notebook 的一种新形态。

## 20. 这一轮之后的阶段性结论

到这里，Coincides 的核心设计不再只是：

```text
Block + Canvas + Relation
```

而是更完整地变成：

```text
Human writes naturally.
System structures quietly.
AI reads through projection.
Relations connect promoted knowledge objects.
Canvas gives knowledge spatial form.
```

也就是说：

```text
人类自然写作。
系统安静结构化。
AI 通过投影视图读取。
Relation 连接被提升的知识对象。
Canvas 赋予知识空间形态。
```

这套模型的价值在于，它没有强迫用户从一开始就像数据库管理员一样输入内容，也没有把 AI 留在普通富文本猜谜里。

它允许知识从自然写作中逐渐长出结构。

这可能是 Coincides 和普通 notebook 软件真正分叉的地方。

## 21. 追加升级：Source As Raw Note / Structured Source Snapshot

这一轮讨论继续从 `TextUnitGroup`、可变焦 endpoint 和 AI readable projection 往外推，推到了 source ingestion。

核心想法是：

```text
上传的 raw source 不应该只是一个文件附件。
它也不应该只被抽成 plain markdown snapshot。
它可以被投影成一篇只读或半只读的 structured raw note。
```

这个方向可以暂时叫：

```text
Source As Raw Note
```

更精确一点可以叫：

```text
Structured Source Snapshot
```

### 21.1 原始文件必须仍然是唯一 evidence truth

必须先冷静地划清边界。

无论 parser、OCR、VLM、AI extraction 做得多好，它们都会出错。

因此：

```text
Original Source File = evidence truth
Structured Source Snapshot = readable projection
```

原始文件是唯一原始证据。

它不需要被定义为“对”或“错”，因为所有后续理解、摘录、整理、引用和 relation 都基于它。

如果 snapshot 错了，应该回原始文件校验；不能让 snapshot 取代原始 source。

### 21.2 Structured Source Snapshot 是 raw source 在 Coincides 结构里的投影

现在比较 plain 的 snapshot 思路大概是：

```text
source file
  -> plain text / markdown snapshot
```

这种做法便宜、快，但会丢掉很多信息：

```text
表格结构
公式区域
图片位置
页码
段落层级
原始版面顺序
手写批注
图文相对位置
```

Structured Source Snapshot 的想法是：

```text
source file
  -> SourceVersion
  -> Structured Source Snapshot
  -> SourceSnapshotNote
```

这个 `SourceSnapshotNote` 不是用户精加工后的笔记，而是原始文档在 Coincides 结构系统里的只读投影。

它内部可以包含：

```text
SourceTextBlock
SourceFormulaBlock
SourceTableBlock
SourceImageRegion
SourceDiagramRegion
SourceFootnoteBlock
SourceTextUnit
SourceTextUnitGroup
```

每个对象都需要尽量保留回原始 source 的 anchor：

```text
source_id
source_version_id
page
region
text snapshot
parser confidence
original render reference
```

### 21.3 它和可变焦 endpoint 的关系

这套 source snapshot 思路和可变焦 endpoint 是同一个模型的自然延伸。

如果 source 只是 markdown 文本，那么引用通常只能做到：

```text
引用了某个 source
引用了某一页
引用了某段纯文本
```

但如果 source 被投影成 Structured Source Snapshot，就可以做到：

```text
引用了 textbook.pdf 第 42 页的某个 formula
引用了 lecture.docx 中某个 table row
引用了 handwritten note 中某个 diagram crop
引用了 source snapshot 中的一个 TextUnitGroup
引用了某个 paragraph 里的某一行 explanation
```

这不是强行精确到行，而是因为 source snapshot 本身已经被结构化成可寻址对象。

也就是说：

```text
UserNote 的 endpoint 可以 zoom。
SourceSnapshotNote 的 endpoint 也可以 zoom。
```

引用链可以从粗到细：

```text
SourceDocument
  -> SourceVersion
    -> Page
      -> SourceBlock
        -> SourceTextUnitGroup
          -> SourceTextUnit
            -> AnchoredSpan
```

这会让 source provenance 的精度大幅提升。

### 21.4 Source As Raw Note 的产品体验

用户上传一份 lecture note、textbook chapter、research report 或手写 PDF 后，系统不是只说：

```text
上传成功。
```

而是生成：

```text
这是一篇 raw source note。
你可以像读普通 note 一样阅读它。
你可以选中其中的段落、公式、表格、图。
你可以把它们引用到自己的 UserNote。
你可以让 Mr.Zero 基于它生成整理笔记。
你可以保留 source -> snapshot -> user note -> relation 的证据链。
```

例如：

```text
textbook.pdf p.42
  SourceFormulaBlock: Green's theorem formula
  SourceTextUnitGroup: theorem statement
  SourceTextUnit: positively oriented region condition

UserNote B
  TextUnitGroup: explanation of Green's theorem
  SourceReference -> SourceTextUnitGroup: theorem statement
  SourceReference -> SourceFormulaBlock: Green's theorem formula
```

这样 UserNote B 不只是“引用了 textbook.pdf”，而是精确知道它引用了原始 source 中哪一块信息。

### 21.5 它和精加工信息处理平台的关系

这非常符合 Coincides 的产品定义：

```text
Coincides 是精加工的信息处理平台。
```

精加工不是把文件随便 OCR 成文本，而是：

```text
保留原始证据
识别结构
保留版面 anchor
允许用户修正
允许引用到精确信息颗粒
允许 AI 读取结构投影
允许 relation 连接可寻址对象
```

如果一个文件不重要，它不一定值得进入这个流程。

但如果用户选择让某个 source 进入精加工流程，就意味着它对用户有足够高的价值。

这时慢和贵不是羞耻，而是精加工的代价。

回报是：

```text
无与伦比的信息精度
可追溯的证据链
可校验的 AI projection
更可靠的 relation endpoint
更强的复用能力
```

### 21.6 成本与风险

这条路线必须记录代价。

主要成本包括：

```text
解析成本更高
OCR / VLM 成本更高
数据对象数量更多
source snapshot 存储更重
anchor 维护更复杂
版本替换更复杂
用户修正 workflow 更复杂
引用链 broken / degraded 状态更多
```

主要风险包括：

```text
parser 把表格拆坏
OCR 识别公式错误
VLM 错认图表区域
markdown 化导致结构丢失
source page region anchor 漂移
用户误以为 snapshot 就是原始真相
AI projection 过度自信
```

因此第一原则必须是：

```text
Structured Source Snapshot 永远不能取代 Original Source File。
```

第二原则是：

```text
系统不能承诺 projection 零误差。
系统只能提供 confidence、校验入口、用户修正和回原文能力。
```

### 21.7 和底层工具的关系

LlamaParse、Docling、Unstructured 这类工具不是 Coincides 的竞争对象。

它们更可能是底层 ingestion 工具。

Coincides 的产品价值不是重新造最好的 parser，而是：

```text
parser 输出结构之后，Coincides 如何接收它
如何保留原始 source truth
如何生成 structured source snapshot
如何让用户修正
如何让 snapshot 里的对象被引用
如何让它们成为 variable-granularity endpoint
如何进入 AI readable projection
如何和 UserNote / Relation / Canvas 连接
```

也就是说：

```text
底层工具负责抽取。
Coincides 负责把抽取结果变成可验证、可引用、可复用、可连接的信息资产。
```

### 21.8 暂不属于 V2.BN.8.3 的范围

这条路线非常重要，但不属于当前小版本要完整实现的内容。

V2.BN.8.3 的重点仍然应该是：

```text
TextBlock
TextUnit
InlineStructuredObject
Slash Command Foundation
自然写作如何逐渐结构化
```

`Structured Source Snapshot` 应该先作为产品哲学和后续 source 体系设计的参考，未来再进入 source ingestion / provenance / raw source processing 的版本。

当前要做的是保留这个方向，防止后续 source 系统继续退化成 plain markdown snapshot。

## 22. 这一轮 source 讨论后的阶段性判断

这一轮讨论让 Coincides 的“精加工信息处理平台”定义更清楚了。

它不是：

```text
上传文件
抽文本
让 AI 问答
```

而是：

```text
保存原始证据真相
生成结构化 source projection
把 source projection 变成可读 raw note
让用户从 raw note 中引用精确信息颗粒
让 UserNote 继承 source evidence chain
让 relation endpoint 能指向 source / note 中不同尺度的信息对象
```

所以 source ingestion、TextUnitGroup、zoomable endpoint、AI readable projection、provenance chain 实际上是同一条主线的不同侧面。

这条线的最终目标不是便宜，而是精确。

```text
不是所有信息都值得精加工。
但被用户选中精加工的信息，应该获得最高级别的结构保真、引用精度和证据可追溯性。
```

## 23. 基础定义收束：TextBlock / TextUnit / InlineStructure / TextUnitGroup

这一节记录当前已经基本确认的底层概念定义。

这些定义后续应该择机升级到正式产品文档、PRD、Block Contract 或新的 TextFlow Contract 中。

### 23.1 TextBlock

`TextBlock` 不是 paragraph 本身。

它是自然写作的默认容器。

```text
TextBlock = writing container + layout object
```

它负责：

```text
承载连续文字
承载 TextUnit tree
在 page / canvas 上拥有位置、大小、布局
允许用户像普通笔记一样顺着写
作为拆分、融合、提升、降级等 TextFlow Operations 的承载对象
```

因此 `TextBlock` 不是最小知识单位。

真正更细的信息颗粒存在于它内部：

```text
TextUnit
InlineStructuredObject
TextUnitGroup
```

### 23.2 TextUnit

`TextUnit` 是 `TextBlock` 内部的自然写作单位。

它可以是：

```text
一个自然段
一个 heading row
一个 bullet item
一个 numbered item
一个 quote row
一个 toggle child
一个 table caption / image caption
一个公式解释行
```

`TextUnit` 是 AI 阅读、结构识别、局部引用和后续 relation endpoint 精细化的基础切片。

但它默认不是 graph node。

默认状态下：

```text
TextUnit = lightweight content unit
```

只有当它被用户、AI proposal、source reference、internal link、relation、export、template 或 reuse 行为明确提升时，它才获得更稳定的可寻址身份。

### 23.3 InlineStructure / InlineStructuredObject

`InlineStructure` 是 `TextUnit` 内部被标记出来的局部结构对象。

它解决的问题是：用户不想拆散自然段，但自然段内部确实包含公式、定义、source marker、claim、link 或 concept mention。

可能类型包括：

```text
InlineFormula
InlineDefinition
InlineSourceMarker
InlineLink
InlineConceptMention
InlineClaim
InlineTerm
```

它的定位是：

```text
不破坏自然写作
但让局部知识可读、可引用、可连接、可投影
```

例如：

```text
Power series is defined as sum a_n(x-c)^n, and it is centered at c.
```

这里可以在同一个 TextUnit 里存在：

```text
InlineDefinition: Power series
InlineFormula: sum a_n(x-c)^n
InlineConceptMention: center c
```

用户仍然看到一段自然文本，系统内部则有更细的结构。

### 23.4 TextUnitGroup

`TextUnitGroup` 是多个 `TextUnit` 或其他 `TextUnitGroup` 被打包后形成的可寻址知识区域。

它不是简单的一层 group。

当前确认的定义是：

```text
TextUnitGroup = 一个可递归的、可命名的、可寻址的知识区域。
```

它可以包含：

```text
TextUnit
TextUnitGroup
```

不要新增 `GroupOfTextUnitGroup` 这种单独概念，否则概念会膨胀。

更好的做法是让 `TextUnitGroup` 自身支持递归 children：

```text
TextUnitGroup
  children:
    - TextUnit
    - TextUnitGroup
```

#### 递归例子

一个 TextBlock 内有九行内容：

```text
TextUnit 1
TextUnit 2
TextUnit 3
TextUnit 4
TextUnit 5
TextUnit 6
TextUnit 7
TextUnit 8
TextUnit 9
```

每三行可以被打包成一个 group：

```text
TextUnitGroup A
  TextUnit 1
  TextUnit 2
  TextUnit 3

TextUnitGroup B
  TextUnit 4
  TextUnit 5
  TextUnit 6

TextUnitGroup C
  TextUnit 7
  TextUnit 8
  TextUnit 9
```

然后 A、B、C 又可以被打包成一个更高阶 group：

```text
TextUnitGroup ABC
  TextUnitGroup A
  TextUnitGroup B
  TextUnitGroup C
```

这样可以表达：

```text
A + B + C 共同构成一个章节
A + B + C 是理解 D 的前置条件
A、B、C 是同一证明的三个步骤
A、B、C 是一个例题的完整解题链
A、B、C 是一个 source claim 的完整证据段
```

### 23.5 TextUnitGroup 的组织方式

`TextUnitGroup` 不能只表达“包含”。

它还需要记录 group 内部的组织方式。

可能的 `group_mode`：

```text
ordered
unordered
hierarchical
alternative
```

例如：

```text
proof_step_group
  group_mode: ordered
```

表示步骤顺序重要。

```text
condition_set
  group_mode: unordered
```

表示几个条件共同成立，但顺序不重要。

```text
alternative_solution_group
  group_mode: alternative
```

表示多个方法是并列选择。

### 23.6 TextUnitGroup 与 relation endpoint

TextUnitGroup 可以成为 relation endpoint。

例如：

```text
TextUnitGroup ABC -> prerequisite_for -> TextUnitGroup D
```

这比为 A、B、C 分别画三条 relation 更清楚。

如果 A/B/C 总是作为一个整体被使用，就应该允许系统或用户把它们打包为一个 endpoint。

这意味着 relation endpoint 的定义继续保持：

```text
Relation endpoint = Addressable Knowledge Object
```

而 Addressable Knowledge Object 可以包括：

```text
Note
PageFrame
NoteBlock
TextUnit
TextUnitGroup
InlineStructuredObject
AnchoredSpan
SourceSnapshotObject
```

### 23.7 TextUnitGroup 是结构层，不是默认 UI 层

虽然 `TextUnitGroup` 可以递归，但不能让用户默认看到一堆层层嵌套的结构。

默认写作视图应该仍然是自然文本。

TextUnitGroup 层级主要在以下地方显现：

```text
structure inspector
relation inspector
AI reading view
source inspector
local graph view
selection / grouping UI
```

也就是说：

```text
它必须存在。
但它不应该默认打扰用户写作。
```

### 23.8 Slash Command 暂列为后续 open issue

Slash command 的新定位已经基本明确：

```text
Slash command = context-aware writing command palette
```

但它具体如何承载：

```text
create block
convert current block
insert structure
inline / selection action
mark role
bind source
create relation
promote selection
group TextUnit
```

目前还不能完全定死。

原因是 `TextBlock`、`TextUnit`、`InlineStructure`、`TextUnitGroup` 这些底层定义刚刚成形，还没有进入正式工程实现。

因此 slash command 具体交互应该先放入 open issue，后续单独设计，避免把它过早设计成菜单地狱。

### 23.9 自然写作逐渐结构化的链条确认成立

当前可以确认的主链条是：

```text
用户自然写
  -> 系统切成 TextUnit
  -> 用户 / AI 发现 InlineStructure
  -> 重要内容被 promoted
  -> TextUnitGroup 形成
  -> relation / source / AI projection 接入
```

也可以写成：

```text
自然写作
  -> 轻量切片
  -> 局部标记
  -> 知识提升
  -> 结构打包
  -> 语义连接
  -> 机器投影
```

这条链条是 V2.BN.8.3 以及后续产品哲学的核心。

## 24. 追加收束：writing_role / knowledge_role / semantic_kind 必须分开

这一轮讨论进一步确认：用户不应该知道 `TextUnit` 这个工程概念。

用户看到的是自然写作对象：

```text
一段话
一个标题
一个 bullet item
一个 numbered item
一个 toggle item
一个 quote
```

系统内部可以把这些统一表示为 `TextUnit`，但 UI 不应该把这个词直接抛给普通用户。

### 24.1 TextUnit 不等于屏幕上的一行

一个重要校准是：

```text
TextUnit 不等于视觉上的一行。
TextUnit 是一个语义写作单位。
```

例如一个很长的 paragraph 在屏幕上可能自动换成五行，但它仍然可能只是一个 `TextUnit`。

更准确的规则是：

```text
Enter 创建新的 TextUnit。
自动换行 / 软换行不创建新的 TextUnit。
```

因此用户的感受是：

```text
按回车 -> 进入下一段 / 下一项 / 下一行写作
```

系统内部则是：

```text
按回车 -> 创建下一个 TextUnit
```

### 24.2 writing_role 是写作和排版结构

`writing_role` 表示这个 TextUnit 在写作和视觉上如何呈现。

可能值包括：

```text
paragraph
heading
bullet_item
numbered_item
toggle_item
quote
callout_line
caption
```

这些是用户熟悉的写作对象。

用户不需要说“我要创建一个 TextUnit”，而是说：

```text
变成标题
变成项目符号
变成编号列表
变成引用
变成折叠项
```

这些操作本质上是在修改：

```text
TextUnit.writing_role
```

### 24.3 knowledge_role 是知识语义角色

`knowledge_role` 表示某个 TextUnit 或 TextUnitGroup 在知识结构里扮演什么角色。

可能值包括：

```text
definition
explanation
example
proof_step
evidence
argument
claim
condition
custom
```

这和写作格式不是一回事。

例如：

```text
- For example, a power series centered at 0 is ...
```

它可以同时是：

```text
writing_role: bullet_item
knowledge_role: example
```

再比如：

```text
Power series
```

它视觉上可能是 heading：

```text
writing_role: heading
```

但它在知识语义上可能是：

```text
knowledge_role: concept_label
```

因此 `writing_role` 和 `knowledge_role` 必须分开。

### 24.4 semantic_kind 是 inline object 的对象类型

`semantic_kind` 用来描述 InlineStructuredObject 本身是什么。

可能值包括：

```text
inline_formula
inline_definition
inline_source_marker
inline_link
inline_concept_mention
inline_claim
inline_term
```

例如一段普通文字中：

```text
The power series sum a_n(x-c)^n is centered at c.
```

可以有：

```text
InlineFormula
  semantic_kind: inline_formula
  text: sum a_n(x-c)^n

InlineConceptMention
  semantic_kind: inline_concept_mention
  text: c
```

这和 TextUnit 的 writing_role、knowledge_role 都不同。

### 24.5 三者的稳定分工

当前建议的分工是：

```text
writing_role
  = 它如何作为文本被写和显示

knowledge_role
  = 它在知识结构里扮演什么角色

semantic_kind
  = 它作为局部 inline 对象是什么
```

这三层不能混。

如果混在一起，会出现以下问题：

```text
heading 被误认为一定是 concept
bullet item 被误认为不能是 example
definition 被误认为必须是独立 block
inline formula 被误认为必须变成 FormulaBlock
```

拆开之后，系统可以表达更自然的组合：

```text
TextUnit:
  writing_role: bullet_item
  knowledge_role: evidence

TextUnitGroup:
  knowledge_role: argument
  group_mode: ordered

InlineStructuredObject:
  semantic_kind: inline_formula
```

### 24.6 对产品体验的影响

用户操作时看到的应该是自然语言和熟悉动作：

```text
Turn into heading
Turn into bullet list
Mark as definition
Mark as example
Create group
Add source
Relate to...
```

系统内部再分别修改：

```text
writing_role
knowledge_role
semantic_kind
group membership
relation endpoint identity
AI readable projection
```

这会让 Coincides 既像普通笔记软件一样自然，又保留 AI 和 relation 所需要的结构清晰度。

### 24.7 当前阶段判断

这组三分法应该进入后续正式契约：

```text
TextFlow / TextUnit Contract
InlineStructuredObject Contract
Addressable Knowledge Object Contract
AI Readable Projection Contract
Slash Command Foundation
```

尤其在 V2.BN.8.3 中，必须避免把 `paragraph`、`definition`、`inline_formula` 全都混成同一类 block type。

更稳的模型是：

```text
TextBlock 承载写作。
TextUnit 承载写作单位。
writing_role 控制写作样式。
knowledge_role 控制知识语义。
semantic_kind 控制 inline object 类型。
TextUnitGroup 负责打包和可寻址。
```

## 25. 追加机制：Role Slot Mapping Interaction

这一轮讨论进一步补齐了 `knowledge_role` 如何传达给用户的问题。

前面已经确认：

```text
knowledge_role 告诉系统“这一组是什么”。
role slots 告诉系统“这种东西通常由哪些部分组成”。
slot mapping 告诉系统“当前这组内容里，哪些部分对应哪些 slot”。
```

这一节关注的是用户怎么自然地完成 slot mapping。

### 25.1 不让脚本猜，AI 以后只做 proposal

在没有 Mr.Zero / AI 接入之前，系统不应该用脚本去猜：

```text
哪一行是 name
哪一段是 description
哪个公式是 equation
```

脚本规则很容易错。即使 AI 以后也可能错，更何况冒号、换行、正则这类弱规则。

因此前期原则是：

```text
系统不猜。
用户手动绑定。
AI 以后只做 proposal。
```

未来 Mr.Zero 可以提出：

```text
Name = Power Series
Description = TextUnit 2-3
Equation = InlineFormula 1
```

但这只是 candidate，用户确认后才进入 confirmed。

### 25.2 KnowledgeRoleDefinition 定义 role 需要哪些 slots

用户或系统可以定义一个 knowledge role。

例如：

```text
knowledge_role: definition_math
display_name: Math Definition
slots:
  - name
  - description
  - equation
```

每个 slot 可以有基本属性：

```text
name:
  required: true
  accepts: TextUnit / InlineSpan

description:
  required: true
  accepts: TextUnit / TextUnitGroup / AnchoredSpan

equation:
  required: false
  accepts: InlineFormula / FormulaBlock / AnchoredSpan
```

这意味着 `definition_math` 不再是一个硬编码 block type，而是一个用户可定义的知识角色模板。

### 25.3 用户操作：Create group 后显示 slot chips

用户选中几行或几段：

```text
选中多个 TextUnit
  -> Create group
  -> 选择 role: Math Definition
```

系统不弹大型遮挡面板，而是在选区附近显示轻量 slot chips：

```text
[Name required]
[Description required]
[Equation optional]
```

颜色可以表达状态：

```text
红色 / warning = required but empty
蓝色 / neutral = optional
绿色 / filled = 已绑定
灰色 = skipped / not applicable
```

用户接下来通过自然选择完成绑定：

```text
选中 Power Series -> 点 Name
选中两段解释 -> 点 Description
选中公式 -> 点 Equation
```

这不是填表，而是：

```text
选内容 -> 贴 slot 标签
```

### 25.4 一个完整 TextUnitGroup 的例子

用户写：

```text
Power Series
A power series is an infinite series of the form sum a_n(x-c)^n.
It is centered at c.
```

用户选中三行，创建 `Math Definition` group。

然后手动绑定：

```text
Name -> TextUnit 1
Description -> TextUnit 2 + TextUnit 3
Equation -> empty / optional
```

系统内部形成：

```text
TextUnitGroup
  knowledge_role: definition_math
  semantic_slots:
    name -> TextUnit 1
    description -> TextUnit 2 + TextUnit 3
    equation -> null
  status: confirmed
```

### 25.5 一个自然段内部 span-level slot 的例子

更复杂也更现实的情况是：一个自然段里只有局部内容属于这个 definition。

例如：

```text
In calculus, a power series is an infinite series of the form sum a_n(x-c)^n, centered at c.
```

如果 group 只能包含完整 TextUnit，就会很笨。

因为这个 TextUnit 里同时包含：

```text
背景: In calculus
name: power series
description: an infinite series of the form ...
equation: sum a_n(x-c)^n
extra condition: centered at c
```

因此 slot target 必须允许更细粒度：

```text
SemanticSlot target:
  TextUnit
  TextUnitGroup
  InlineStructuredObject
  AnchoredSpan
```

用户可以：

```text
选中 power series -> 点 Name
选中 an infinite series of the form... -> 点 Description
选中 sum a_n(x-c)^n -> 点 Equation
```

系统内部形成：

```text
TextUnitGroup
  knowledge_role: definition_math
  scope: TextUnit 1
  semantic_slots:
    name -> AnchoredSpan("power series")
    description -> AnchoredSpan("an infinite series of the form...")
    equation -> InlineFormula / AnchoredSpan("sum a_n(x-c)^n")
```

用户看到的仍然是一段自然文本。

系统内部则知道这一段里有一个 `definition_math` 的语义结构。

### 25.6 Semantic Overlay Group

这里出现一个重要机制：

```text
Semantic Overlay Group
```

它表示：

```text
不改变文本排版，只在语义层覆盖一组 slot mapping。
```

因此内部可以有两类 group：

```text
Structural TextUnitGroup
  由完整 TextUnit / TextUnitGroup 组成

Semantic Overlay Group
  可以由 TextUnit 内部的 AnchoredSpan / InlineObject 组成
```

但这两个名字不应该暴露给普通用户。

用户只需要知道：

```text
选内容
Create group
选 role
按 slot chip 标注
完成
```

系统内部再决定它属于完整 TextUnit group，还是 span-level overlay group。

### 25.7 Incomplete role instance

如果 required slot 没有填完，这个 group 不应该被强行 confirmed。

它可以保存，但状态应该是：

```text
incomplete
```

例如：

```text
Math Definition
Name: filled
Description: missing
Equation: optional
status: incomplete
```

系统可以轻量提醒：

```text
This definition is incomplete.
```

但不要阻止用户继续写作。

后续用户可以补齐，Mr.Zero 也可以提出 proposal。

### 25.8 用户视角和系统视角

用户视角非常简单：

```text
我选中了几段。
我把它标成 Math Definition。
系统告诉我还缺 Name / Description。
我选中对应文字，点对应 chip。
完成。
```

系统视角则很复杂：

```text
KnowledgeRoleDefinition
TextUnitGroup
SemanticSlotMapping
AnchoredSpan
InlineStructuredObject
status: incomplete / confirmed
AI Readable Projection
Relation endpoint identity
```

这是合理的。

复杂性应该由系统承担，而不是丢给用户。

### 25.9 当前阶段判断

这套机制非常适合后续进入：

```text
TextFlow / TextUnit Contract
KnowledgeRoleDefinition Contract
InlineStructuredObject Contract
AI Readable Projection Contract
Slash Command Foundation
```

它也进一步证明：Coincides 不是不要结构化，而是把结构化从硬编码字段升级为用户可定义、可绑定、可投影的知识角色系统。
