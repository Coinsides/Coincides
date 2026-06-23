# 2026-06-17 ContentGroup / KnowledgeObject 临时整理稿

> 2026-06-18 correction: this is a historical brainstorm note. Its old `KnowledgeObject` / `KnowledgeIndex` wording has been retired in the active product model.
>
> Current vocabulary:
> - `ContentGroup` is the serious content package.
> - Accepted/reviewed identity is a state on `ContentGroup`, not a separate object.
> - `ContentGroupIndex / Group Index` is a derived view over ContentGroups, not a truth table.
> - Relation endpoints should prefer `ContentGroup`, accepted ContentGroup identity, or future composite endpoints.
>
> Keep the body as history unless a later cleanup explicitly rewrites it.

status: temporary brainstorm note
date: 2026-06-17
scope: 本文只记录本轮讨论已经相对确定的结构性判断。后续会融合进正式 Product / Contract / Open Issue 文档。

## 0. 为什么要写这份临时文档

V2.BN.8.6.x 之后，Coincides 的 Better Notebook 结构经历了一次根部重排。

最初的设计更接近 `Block-first`：

```text
Block = 信息载体 / 知识节点 / 角色容器
```

例如 Definition Block、Formula Block、Code Block 等，每一种 block 都承担一种显式角色。

但这个方向逐渐暴露出问题：

- 真实写作不会总是按 block 类型切分。
- 一个自然段里可能同时包含 definition、example、paraphrase、warning、formula、user thought。
- Definition 这类结构在不同学科里有无数呈现形式，强行做固定字段会进入字段地狱。
- Paragraph / TextBlock 可能很长，如果里面没有进一步的可定位结构，AI 仍然只能重新通读。
- 用户不应该承担完整的 knowledge role 分类工作。

后续讨论逐步把根从 `Block` 下沉到 `TextFlow`，又从 `Annotation-first` 进一步修正为：

```text
TextFlow-rooted
ContentRange-addressable
ContentGroup-aware
Annotation-assisted
KnowledgeObject-interpreted
Relation-projected
```

这份文档用来临时固定这套新理解。

## 1. TextFlow 是内容根

TextFlow 是 notebook 里最重要的内容根。

它回答的是：

```text
用户或 AI 写下来的内容到底是什么？
```

TextFlow 是正文内容本身。它可以被显示成自然笔记，也可以被 AI 读取、解释、拆分、重组。

在新的理解里：

- Block 不再是知识分类根。
- Annotation 不再是知识对象根。
- TextFlow 才是内容真相。

Block 更像页面 / canvas 上的空间与渲染外壳：

```text
Block answers:
- 这个对象摆在哪里？
- 它需要什么外壳？
- 它是否需要特殊渲染？
- 它是否需要独立 resize / move / canvas behavior？
```

TextFlow answers:

```text
- 内容是什么？
- 它由哪些 TextUnit / inline structure / ranges 构成？
- 它有哪些可以被定位、标记、解释、关联的内容范围？
```

## 2. ContentRange 是定位根

ContentRange 不是用户直接关心的产品对象。

它是底层 anchor / coordinate。

它回答的是：

```text
这一段内容到底在哪里？
```

最典型的 ContentRange 是：

```text
block_id
text_unit_id
start_offset
end_offset
```

它也可以逐渐扩展到：

- 跨多个 TextUnit 的 range。
- 整个 TextUnit。
- 整个 Block。
- Source document 中的某页 / 某段 / 某个抽取区域。
- 未来 CanvasObject 中的某个区域。
- 未来图片、表格、画笔对象、media region 的局部。

ContentRange 的意义在于：

- Annotation 要落到 range 上。
- ContentGroup 要由 range 组成。
- KnowledgeObject 要能追溯到 range。
- Relation endpoint 不能是空泛概念，也要能追溯到 range 或由 range 支撑的对象。
- Source citation / provenance 也需要 range。

一句话：

```text
TextFlow 是地图。
ContentRange 是地图上的坐标范围。
```

## 3. SelectionDraft 是创建 ContentRange 的临时入口

SelectionDraft 是用户正在框选时的临时状态。

它不是稳定 truth。

它回答的是：

```text
用户现在正在选中哪里？
```

当用户确认操作之后，SelectionDraft 可以被提交为稳定的 ContentRange。

```text
SelectionDraft -> commit -> ContentRange
```

这解释了为什么 SelectionDraft 很重要：

- Label / Annotation 创建依赖它。
- 跨 TextUnit label 依赖它。
- 未来 ContentGroup 创建依赖它。
- 未来用户把某段内容交给 AI 分析，也会依赖它。
- 未来跨 block / source viewer / canvas object 的选择，也会需要同类机制。

现阶段 SelectionDraft 的主要问题：

- 目前 TextUnit 仍像独立输入面，跨 TextUnit drag selection 还不成熟。
- 这会阻碍自然的多行 label、ContentGroup 创建和 TextUnitGroup / Group 类操作。

因此后续需要把 browser selection 降级为 pointer / offset input，把真实选区 truth 放到 Coincides 自己的 SelectionDraft 里。

## 4. Annotation 是标记层，不是内容根

Annotation 的定位需要下调。

它不是所有 object 的内容真相。

它回答的是：

```text
这段内容被谁用什么 label 标记了？
```

Annotation 可以来自：

- 用户。
- AI。
- Source import / structured extraction。
- 后续 agent proposal。

Annotation 可以表达：

- definition
- important
- hard
- unclear
- exam
- review later
- user thought
- AI suggested concept
- temporary test label

这意味着 Annotation 非常自由，也可能非常混乱。

因此不能把所有 Annotation 都直接当成 KnowledgeObject 或 relation node。

新的判断是：

```text
Annotation = label / marker / human-visible signal
```

而不是：

```text
Annotation = knowledge object truth
```

Annotation 的价值在于：

- 给用户一个可见的标记体验。
- 给 AI 一个高权重的人类意图信号。
- 作为 ContentGroup / KnowledgeObject 候选生成的输入之一。
- 让同一段内容能被不同视角标记。

但 Annotation 不是全集。

用户没有标出来的内容，也可能是重要知识对象的一部分。

## 5. ContentGroup 是更严肃的内容包

ContentGroup 是本轮讨论里最重要的新中间层。

它回答的是：

```text
哪些内容范围应该被打包在一起，作为一个知识对象候选？
```

它可以由多个 ContentRange 组成。

这些 range 可以包括：

- 一个短 text range。
- 一个完整 TextUnit。
- 多个 TextUnit。
- 用户已经 label 过的 annotation range。
- AI 识别出的、但用户没有 label 的 text range。
- 某段 definition 加上后面的 paraphrase。
- 某个 theorem statement 加上适用条件。
- 某个 formula 加上解释句。
- Source document 中的对应片段。
- 未来 CanvasObject / image region / table region。

ContentGroup 的重点不是 `TextUnit`，而是 `Group`。

它本质上是：

```text
relation-ready content pack
knowledge object candidate content pack
```

也就是说，它不是为了让用户在视觉上把几行捆起来。

它更重要的职责是：

- 帮 AI 把分散内容聚合为一个可理解对象。
- 帮 relation endpoint 拥有足够上下文。
- 帮 KnowledgeObject 有可追溯内容基座。
- 帮用户以后查看“这个知识点到底由哪些内容支撑”。

## 6. Annotation 和 ContentGroup 的关系

Annotation 可以参与 ContentGroup，但 Annotation 不等于 ContentGroup。

更合理的关系是：

```text
Annotation -> may promote to ContentGroup input
ContentRange -> may join ContentGroup
ContentGroup -> may support KnowledgeObject
```

用户标一个 `hard`：

```text
Annotation(label = "hard")
```

它可能只是个人阅读标记，不应该自动进入严肃的知识对象候选。

用户或 AI 标一个 `Demand definition`：

```text
Annotation(label = "Demand definition")
```

AI 可能判断它具备知识对象价值，于是将它对应的 range 作为 ContentGroup 的一部分。

ContentGroup 可以显示成 annotation-like highlight，但不是所有 Annotation 都应该升级为 ContentGroup。

关键规则：

```text
所有 ContentGroup 都可以拥有可见标记表现。
但不是所有 Annotation 都是 ContentGroup。
```

## 7. KnowledgeObject 是解释后的知识对象

KnowledgeObject 和 ContentGroup 应该拆开。

ContentGroup 回答：

```text
哪些内容被打包在一起？
```

KnowledgeObject 回答：

```text
这一包内容在知识系统里是什么？
```

例如：

```text
ContentGroup:
- range 1: demand definition sentence
- range 2: paraphrase sentence
- range 3: source paragraph
```

AI 可以解释为：

```text
KnowledgeObject:
name: Demand
role: definition
topic: microeconomics
confidence: 0.86
source: AI interpretation
```

如果后续 AI 重新理解，它可能把 role 改成：

```text
concept_explanation
```

但 ContentGroup 仍然是那一组 ranges。

拆分的价值：

- ContentGroup 稳定、可追溯。
- KnowledgeObject 可刷新、可解释、可被 AI 重算。
- 用户或 AI 可以调整解释，而不一定改内容包。
- 用户或 AI 可以调整内容包，而不一定立即改解释层。
- Relation 可以连接确认后的 KnowledgeObject，也可以在 proposal 阶段引用 ContentGroup。

## 8. KnowledgeRole 不再交给用户强制维护

用户不应该被迫判断：

- 这是 definition 还是 explanation？
- 这是 theorem 还是 rule？
- 这是 example 还是 case？
- 这个 role 应该属于哪个全局 schema？

这些判断应该主要属于 AI 的 Reading Interpretation。

用户可以：

- 写内容。
- 标记自己关心的内容。
- 修改 AI 给出的 label / role / object name。
- 接受或拒绝 AI 的整理结果。

但用户不应该被拖进 knowledge role 分类地狱。

KnowledgeRole 是 AI 对 ContentGroup / KnowledgeObject 的解释结果。

弱模型可能只能粗略判断：

```text
definition / example / summary
```

强模型可能能判断：

```text
反例 / theorem condition / proof sketch / prerequisite / application / paraphrase
```

这也意味着 KnowledgeRole 应该允许：

- 被刷新。
- 有置信度。
- 有模型来源。
- 有解释依据。
- 被用户修正。

## 9. KnowledgeIndex 是用户真正想要的清单视图

用户大多数情况下并不想手工维护 AnnotationSet。

他们真正想要的是：

```text
给我看这一章所有 definition。
给我看这一章所有 theorem。
给我看所有 example。
给我看所有 practice problem。
给我看 definition + theorem 的组合清单。
```

这不是静态 set，而是动态 view / query。

例如：

```text
scope: current note / chapter 1 / source section 1-3
filter: role in [definition, theorem]
result: KnowledgeObject list
```

KnowledgeIndex 应该基于：

- TextFlow。
- ContentGroup。
- KnowledgeObject。
- Reading Interpretation。
- 用户确认 / 修正。

而不是要求用户创建无数 AnnotationSet。

## 10. AnnotationSet 的定位下调

AnnotationSet 当前形态很可能偏工程化。

它试图解决：

- 多个 annotation 的集合。
- relation composite endpoint。
- 用户标签整理。
- set kind / sequence / all_of。

但这些职责现在可以被拆开：

- 多段内容组成知识对象候选：ContentGroup。
- 用户查看清单：KnowledgeIndex view。
- Relation 的复合前提：CompositeEndpoint / RelationEndpoint。
- Label 显示和管理：Annotation display / Annotation layer。

因此 AnnotationSet 可以暂时退场，或者保留为 debug / legacy / advanced organizer，而不作为普通用户学习视角的主对象。

初步结论：

```text
AnnotationSet is not the main user-facing learning list.
```

它不应承担 KnowledgeIndex 的职责。

## 11. Relation 是对内容的解释性投影

Relation 不是笔记内容的同构。

它不是：

```text
Note content <-> Relation graph
```

之间的 lossless isomorphism。

更准确地说：

```text
Relation graph 是对 TextFlow / ContentGroup / KnowledgeObject 的有损、有目的、可追溯投影。
```

它不要求覆盖全文。

它也不要求能从 graph 还原原文。

它要求：

- 关键对象可定位。
- 关键关系可解释。
- 每个 relation endpoint 可追溯到 ContentGroup / ContentRange / source range。
- AI 可以提出 relation proposal。
- 用户可以确认、修正、删除。

Relation 的 endpoint 不应该只停留在 Block。

更合理的是：

```text
Relation endpoint -> KnowledgeObject / ContentGroup / CompositeEndpoint
```

例如：

```text
A = ContentGroup: Power series definition + paraphrase + formula
B = ContentGroup: Radius of convergence theorem + condition
C = ContentGroup: Example problem + solution sketch

Relation proposal:
A + B -> C
type: prerequisite_for / used_by / explains_solution
```

这比旧的 `Block -> Block` 更接近真实知识结构。

## 12. AI 生成笔记时的结构流程

如果用户上传 source，让 AI 整理成笔记，理想流程不是直接生成一篇死文本。

更合理的流程是：

```text
Source material
-> AI reads material type and scope
-> AI builds source map
-> AI identifies local roles and important ranges
-> AI generates natural TextFlow
-> AI creates ContentRanges / ContentGroups
-> AI creates Reading Interpretation
-> AI proposes KnowledgeObjects
-> AI proposes Relations
-> User reviews / edits / accepts
```

用户看到的是自然笔记。

系统内部知道：

- 哪些内容来自哪里。
- 哪些内容是 definition / theorem / example / practice problem。
- 哪些内容是 AI 判断的重要内容包。
- 哪些对象之间可能有关系。

这让 AI 生成的笔记不是单纯摘要，而是可追溯、可标记、可组合、可建关系的学习材料。

## 13. 用户自己写笔记时的结构流程

如果用户自己写笔记，流程也类似，但起点不同。

```text
User writes natural TextFlow
-> User may label important ranges
-> AI reads TextFlow + labels
-> AI treats user labels as high-weight hints, not complete truth
-> AI discovers additional important ranges
-> AI proposes ContentGroups / KnowledgeObjects
-> AI builds KnowledgeIndex views
-> AI proposes relations
-> User reviews / edits / accepts
```

用户不会标完整篇文章。

他们只会标自己关心的地方。

因此 AI 不能只依赖 Annotation。

它必须回到 TextFlow 内容根，并结合 Annotation 作为线索。

## 14. 当前对象关系临时图

```text
TextFlow
  -> TextUnit
  -> ContentRange
  -> SelectionDraft
  -> Annotation
  -> ContentGroup
  -> KnowledgeObject
  -> KnowledgeIndex
  -> RelationProposal
  -> RelationTruth
```

更准确地说：

```text
TextFlow
  contains TextUnit

ContentRange
  anchors into TextFlow / Source / future CanvasObject

SelectionDraft
  creates ContentRange during user interaction

Annotation
  labels ContentRange
  may inform ContentGroup

ContentGroup
  groups ContentRanges
  may support KnowledgeObject

KnowledgeObject
  interprets ContentGroup
  may appear in KnowledgeIndex
  may become Relation endpoint

RelationProposal
  uses KnowledgeObject / ContentGroup / CompositeEndpoint

RelationTruth
  stores confirmed relation with traceable endpoints
```

## 15. 待讨论问题

这些问题本文件暂不下定论：

- ContentGroup 是否需要替代现有 TextUnitGroup 命名。
- Annotation 是否作为底层对象继续保留，还是逐渐变为 ContentGroup 的 visual label layer。
- ContentGroup 是否需要用户可见的独立 inspector。
- KnowledgeObject 是否必须显式存储，还是一开始作为 Reading Interpretation projection。
- Relation endpoint 第一版到底接受 ContentGroup、KnowledgeObject，还是二者都接受。
- Source document 的 selection / range model 是否复用 SelectionDraft，还是单独做 SourceSelectionDraft。
- 现有 AnnotationSet 是删除、迁移、隐藏，还是仅保留为 debug / advanced organizer。
- KnowledgeIndex 的第一版 UI 应该在哪里出现。

## 16. 当前阶段性结论

本轮讨论之后，较稳定的判断是：

```text
TextFlow 是内容根。
ContentRange 是定位根。
Annotation 是标记层。
ContentGroup 是知识对象候选内容包。
KnowledgeObject 是解释后的知识对象。
KnowledgeIndex 是用户真正想要的清单视图。
Relation 是对 KnowledgeObject / ContentGroup 的解释性投影。
AnnotationSet 不再适合作为主线用户对象。
```

这套结构比 Block-first 和 Annotation-first 都更稳。

它允许用户自然写作，也允许 AI 在不破坏用户写作自由的情况下，逐步建立可追溯、可解释、可关联的知识结构。

## 17. 2026-06-18 补充：ContentGroup 双入口与 KnowledgeObject 解释层

本轮继续明确了一点：

```text
ContentGroup 必须是双入口对象。
```

它可以由 AI 创建，也可以由用户创建。

但 ContentGroup 仍然不能直接等同于 KnowledgeObject。

### 17.1 ContentGroup 和 KnowledgeObject 的分工

ContentGroup 回答的是：

```text
哪些内容应该被放在同一个内容包里？
```

KnowledgeObject 回答的是：

```text
这一包内容在知识系统里到底是什么？
```

因此：

```text
ContentGroup = 被打包的内容
KnowledgeObject = 对这个内容包的解释身份
```

ContentGroup 是材料包，KnowledgeObject 是解释层。

### 17.2 用户可以创建 ContentGroup

用户应该可以创建 ContentGroup，因为用户有时比 AI 更清楚自己想表达什么。

例如，用户可以选中：

- 一句 definition。
- 后面一句类比解释。
- 一个公式。
- 一个例题中的关键条件。

然后把它们放在同一个 ContentGroup 里。

这不一定意味着用户已经定义了严格 knowledge role。

用户可能只是想说：

```text
这几块内容应该作为一包。
```

这时 ContentGroup 可以先保持为内容包，而不是立刻成为 KnowledgeObject。

### 17.3 AI 也可以创建 ContentGroup

AI 读完一篇 note、source section 或 chapter 后，也可以提出 ContentGroup。

例如 AI 可能发现：

- 某一句是核心定义。
- 后面两句是 paraphrase。
- 一个公式是这个定义的操作形式。
- 一个 example 引用了这个定义。

于是 AI 提出：

```text
AI proposed ContentGroup:
Power Series concept pack
```

这个 ContentGroup 仍然应先是 proposal。

用户可以接受、拒绝、改名、拆分、合并或编辑它的范围。

### 17.4 Annotation 不能直接等于 ContentGroup

Annotation 是轻标记。

ContentGroup 是重打包。

用户可以随手标记：

- hard
- unclear
- test
- funny
- review later
- important

这些 annotation 合法，但它们不应该自动变成严肃的知识对象候选。

因此不能写成：

```text
Annotation = ContentGroup
```

更稳的关系是：

```text
Annotation -> may inform ContentGroup
Annotation -> may be promoted into ContentGroup input
ContentGroup -> may support KnowledgeObject
```

也就是说，Annotation 可以成为 ContentGroup 的输入线索，但不是所有 Annotation 都会升级成 ContentGroup。

### 17.5 ContentGroup 到 KnowledgeObject 不是强制升级，而是附加解释

ContentGroup 不一定必须立刻变成 KnowledgeObject。

更准确地说：

```text
KnowledgeObject 是 ContentGroup 上的一层 interpretation。
```

同一个 ContentGroup 在不同场景下可能有不同解释：

- 学习视角：definition。
- 考试视角：key review point。
- relation 视角：prerequisite。
- source tracing 视角：derived concept。

因此 ContentGroup 应该保持稳定，KnowledgeObject / interpretation 可以刷新、重算、被用户修正。

### 17.6 用户和 AI 的职责

用户负责：

- 选择内容。
- 给内容打 label。
- 手动创建 ContentGroup。
- 接受、拒绝、修改 AI 提出的 ContentGroup。
- 修正 AI 给出的 KnowledgeObject 解释。

AI 负责：

- 从 TextFlow 和 source 中发现重要 range。
- 根据用户 label 作为高权重线索。
- 提出 ContentGroup。
- 解释 ContentGroup，生成 KnowledgeObject。
- 基于 KnowledgeObject / ContentGroup 提出 relation proposal。

这个分工延续当前产品原则：

```text
用户负责意图和修正。
AI 负责结构化理解。
系统负责保存 truth 和可追溯对象。
```

### 17.7 AnnotationSet 的进一步降级

在这个新结构下，AnnotationSet 更不适合作为主线对象。

它原本承担的职责会被拆分：

- 多个 annotation / range 被打包：ContentGroup。
- 用户想看的知识清单：KnowledgeIndex。
- relation 的复合端点：CompositeEndpoint / RelationEndpoint。
- 可见 label 管理：Annotation display layer。

因此 AnnotationSet 可以继续退到 debug / legacy / advanced organizer，不应该继续成为用户普通学习流程的中心。

### 17.8 临时工程形态

短期内可以考虑一个过渡形态：

```text
ContentGroupV1:
  id
  note_id
  ranges
  label
  created_by
  status: draft / proposed / active / rejected
  source_annotation_ids
  interpretation?: {
    name
    role
    confidence
    model
  }
```

这里的 `interpretation` 暂时可以作为轻量字段。

等结构稳定后，再考虑把它抽成正式 KnowledgeObject 表或 Reading Interpretation projection。

### 17.9 当前补充结论

本轮补充后的短句定义：

```text
Annotation 是“我标了这里”。
ContentGroup 是“这些内容属于一包”。
KnowledgeObject 是“这一包内容是什么”。
```

这是目前最清楚的一组三层关系。

## 18. 2026-06-18 补充：ContentGroup 成熟修正

本轮继续把模型收窄到更清晰的一版。

核心变化：

```text
TextUnitGroup 退出主线。
AnnotationSet 退出主线。
ChildLabel 退出主线。
Annotation 降级为 label / highlight / source hint。
ContentGroup 成为严肃内容包。
Petal 接管 ContentGroup 内部局部结构。
```

### 18.1 TextUnitGroup 没有继续独立存在的必要

TextUnitGroup 是 ContentGroup 的前身和启发物。

它现在继续作为独立对象会产生两个问题：

- 负面作用：为了 row group / gutter 操作而挤压写作区域，影响用户自然写作体验。
- 概念重复：它想解决的“把若干文字/行/范围捆成一包”的问题，已经被 ContentGroup 更完整地覆盖。

因此新的判断是：

```text
TextUnitGroup should be removed, or rewritten into ContentGroup.
```

如果现有代码可以平滑改造成 ContentGroup seed，就改造。

如果不能，就应该删除重建。

它不应该继续作为和 ContentGroup 并列的长期对象。

### 18.2 AnnotationSet 和 ChildLabel 的命运

AnnotationSet 要隐退。

原因：

- 它只能组织 annotation，范围太窄。
- 用户真正需要的是内容包 / 知识清单，而不是手动管理 label 集合。
- 它的有用职责应该迁移到 ContentGroup、KnowledgeIndex、RelationEndpoint / CompositeEndpoint。

ChildLabel 也要隐退。

原因：

- ChildLabel 原本服务于“大 annotation 内部继续拆语义部分”。
- 但 annotation 已经降级为高光和素材线索，不应该继续承担知识包内部结构。
- 这个职责现在由 ContentGroup 内部的 Petal 承担。

新的分工：

```text
Annotation / Label
  visible highlight, marker, draggable source hint

ContentGroup
  serious content package

Petal
  local semantic part inside a ContentGroup
```

### 18.3 Annotation 的降级

Annotation 继续存在，但它不再是知识本体。

它的定位是：

- 用户标记过的内容。
- 可见高光。
- 可拖拽素材。
- AI 的高权重提示。
- ContentGroup 的可能来源之一。

它可以被拖入 ContentGroup。

但它自己不等于 ContentGroup，也不等于 KnowledgeObject。

### 18.4 ContentGroup 的当前字段草案

ContentGroup 应该是一个严肃内容包 / 知识对象候选。

当前字段草案：

```text
ContentGroup:
  id
  project_id
  note_id?
  parent_group_id?
  depth
  title
  status
  created_by
  created_at
  updated_at
  members[]
  petals[]
  interpretation?
  view_state?
```

字段说明：

- `id`：系统唯一身份。
- `project_id`：所属 Project。因为 `depth = 0` 从 Project 开始，未来跨 project relation 不能被堵死。
- `note_id`：所属 Note。对于 project-level group 可以为空或作为范围约束。
- `parent_group_id`：上级 ContentGroup。
- `depth`：颗粒度深度，不是语义角色。
- `title`：用户唯一直接命名字段。用户可以叫“小狗”，系统不拦。
- `status`：draft / proposed / active / archived / rejected 等。
- `created_by`：human / ai / system。
- `members[]`：这个 group 里包含的内容来源。
- `petals[]`：这个 group 内部的局部组成。
- `interpretation`：AI / system / human 对这个 group 的解释层。

### 18.5 `depth` 的定义

`depth` 表示 ContentGroup 在 Project / Note / Content 层级里的颗粒度。

```text
depth = 0
  Project-level scope

depth = 1
  Note-level scope

depth >= 2
  Content-level groups, progressively finer
```

`depth` 不表示：

- chapter
- topic
- theorem
- definition
- example
- practice problem

这些都是 interpretation / KnowledgeObject 的语义判断。

`depth` 只回答：

```text
这个内容包有多粗或多细？
```

### 18.6 ContentGroup 的命名

ContentGroup 不应该有两个用户可输入名字。

不要同时保留：

```text
content_group_name
display_name
```

这会导致两个“小狗”。

更稳的结构是：

```text
ContentGroup:
  title: 用户起的名字
  interpretation:
    role
    topic
    brief
```

例子：

```text
ContentGroup:
  title: 小狗
  depth: 4

interpretation:
  role: definition
  topic: Power Series
  brief: Power Series 的定义内容
```

用户可以自由命名，系统通过 `id` 保持唯一身份，通过 interpretation 保持语义清醒。

### 18.7 Petal 是 ContentGroup 内部的花瓣

Petal 接管旧 ChildLabel 真正想解决的问题。

它不是固定 schema field，也不是全局字段。

它是某个 ContentGroup 内部的局部组成。

例如 theorem ContentGroup：

```text
ContentGroup:
  title: Green Theorem Pack
  depth: 4

petals:
  - label: condition
  - label: statement
  - label: proof idea
  - label: example
```

Petal 可以锚定到 ContentRange、Annotation、TextUnit、Block 或未来的表格/图片区域。

Petal 只在当前 ContentGroup 内有意义。

### 18.8 ContentRange 与 ContentGroup 的关系

ContentRange 不应该被 ContentGroup 吞掉。

它应该独立存在，作为定位根。

原因：

- 同一个 ContentRange 可以被多个 Annotation 引用。
- 同一个 ContentRange 可以进入多个 ContentGroup。
- 同一个 ContentRange 可以成为 Petal 的 anchor。
- Relation / source provenance / AI interpretation 都需要稳定定位。

因此更稳的是：

```text
ContentRange
  independent anchor object / address

ContentGroup.members[]
  references ContentRange or other member objects

Petal.members[]
  references ContentRange or other member objects
```

ContentGroup 里当然要有成员字段，但这个字段应该引用 ContentRange，而不是把 ContentRange 的概念直接塞成内嵌文本字段。

一句话：

```text
ContentRange 是坐标。
ContentGroup 是用坐标和对象打出来的一包内容。
```

### 18.9 ContentGroup 和 Petal 都应该使用 member reference

ContentGroup 不直接“包含文字”。

它包含的是一组可追溯的引用。

```text
ContentGroup.members[]
  - kind: content_range
    range_id
    role_hint?

  - kind: annotation
    annotation_id
    role_hint?

  - kind: block
    block_id
    role_hint?

  - kind: future_object
    object_id
    role_hint?
```

其中最核心的是 `content_range`。

一个 ContentGroup 里如果包含多个目标，就保存多个 member reference。

每个 member 自己追溯到它的定位对象：

```text
ContentRange:
  id
  source_kind
  project_id
  note_id?
  block_id?
  text_unit_id?
  start_offset?
  end_offset?
```

这样：

```text
ContentGroup 负责“这一包里有什么”。
ContentRange 负责“每个东西原文在哪里”。
```

Petal 也应该走同样的模型。

也就是说，Petal 不只是一个名字，也不只是 `ranges[]`。

它也应该有自己的 `members[]`：

```text
Petal:
  id
  content_group_id
  label
  order
  members[]
```

例如 theorem group：

```text
ContentGroup: Green's Theorem
  members:
    - range A
    - range B
    - range C

  petals:
    condition:
      members:
        - range A

    statement:
      members:
        - range B

    explanation:
      members:
        - range C
```

这让 ContentGroup 和 Petal 都保持可追溯。

区别只是：

```text
ContentGroup.members[]
  这一整个内容包由哪些内容组成。

Petal.members[]
  这个内容包内部某一片花瓣由哪些内容组成。
```

这也说明 Petal 不是旧 ChildLabel 的简单改名。

ChildLabel 是 annotation 内部的子标签。

Petal 是 ContentGroup 内部的局部组成，并且它也可以引用多个可追溯内容目标。

### 18.10 当前成熟短句

```text
TextFlow 是内容根。
ContentRange 是定位根。
Annotation 是高光和素材线索。
ContentGroup 是严肃内容包。
Petal 是内容包内部花瓣，也有自己的 members。
KnowledgeObject 是解释后的知识身份。
Relation 是这些知识身份之间的连接。
```

### 18.11 临时文档合并说明

2026-06-18 的 `ContentGroup depth granularity` 临时碎片已经合并回本文件。

后续关于 ContentGroup、depth、Petal、ContentRange、AnnotationSet 隐退、ChildLabel 隐退的临时讨论，优先继续写入本文件，避免多个活文档同时漂移。
