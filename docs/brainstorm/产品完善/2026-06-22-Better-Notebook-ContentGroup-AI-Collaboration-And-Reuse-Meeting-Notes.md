# 2026-06-22 Better Notebook / ContentGroup AI 协作与复用会议记录

status: live brainstorm note
date: 2026-06-22 America/Toronto
scope: ContentGroup System、AI 协作整理、目的驱动知识塑形、笔记/报告复用、condensed source 方向

> 这份记录来自 2026-06-22 新线程交接后的产品闲聊。
> 记录目标不是立即形成最终合同，而是把 Henry 对 ContentGroup System、AI 参与、笔记复用和 condensed source 的当前判断沉淀下来，方便后续正式同步到产品文档、contract 或实现计划。

## 1. 工作模式记录

Henry 更倾向于用中文直接讨论产品和开发过程，也希望 Codex 默认用中文回复。

后续协作原则：

- 日常对话优先中文。
- 会议记录、报告、patch note 尽量中文撰写。
- 代码、命令、文件名、类型名、已有英文产品术语保留英文。
- 如果需要写对外英文文档，再单独说明。

Henry 是数学系学生，也是 Coincides / Better Notebook 的个人独立开发者。对话中偶尔会用“我们”指代项目协作语境，但实际产品开发主体是 Henry 自己。

## 2. Better Notebook 模型演化回顾

早期问题是：

```text
用户交互的最小单位是什么？
```

第一阶段曾经认为最小单位是 `NoteBlock`。

这一路线自然产生了很多具有固定结构字段的 block，例如 definition block、formula block、code block 等。但后续发现 block-first 会限制自由写作，让用户在写笔记时像是在填写结构化牢房。

第二阶段转向 `annotation-first`。

当时的判断是：annotation 比 block 更自由，也许能承担结构化字段的角色。但后续继续发现，annotation 更适合作为正文中的轻量标记和高亮，不适合作为严肃知识包或结构化字段本体。

当前阶段回到：

```text
TextFlow first
```

新的分工是：

```text
TextFlow
  负责自然写作和正文内容真相。

ContentRange
  负责定位和可追踪地址。

Label / AnnotationTruth
  负责正文侧可见标记和可复用 range package。

ContentGroup
  负责把选中的内容、label、block 或未来 media region 收成目的驱动的内容包。

Petal
  负责 ContentGroup 内部的局部角色和 AI 侧结构线索。

GroupFolder
  负责 ContentGroup 的组织路径、浏览边界和未来 relation / GraphRAG 工作范围。

Relation
  负责把被确认的思考关系记录成可追踪边。
```

本轮对话形成的简短判断：

```text
ContentGroup 不是从数据结构里硬造出来的。
它是 NoteBlock-first 和 annotation-first 两条路线都不够稳定之后，自然长出来的中间层。
```

## 3. ContentGroup System 的根本意义

ContentGroup System 包含：

- ContentGroup；
- GroupFolder；
- Single ContentGroup Editor；
- Gallery / Rail / Editor 三层界面；
- 未来 Petal、Relation、GraphRAG、AI-readable projection 相关能力。

它不是单纯为了“用户能整理笔记”。

如果只面向人类数学学习，Better Notebook 在自然写作、标记和基础整理阶段已经有较强价值。现在继续推进 ContentGroup System，是因为 Coincides 的目标更进一步：

```text
让人类和 AI 共同协作，对信息进行高精度加工。
```

因此 ContentGroup 需要同时服务两类读者：

```text
对人类：
  它是整理盒子、思路外化、知识包、复习和写作材料。

对 AI：
  它是可读取、可复用、可重组、可建立 relation 的结构化中间协议。
```

当前核心判断：

```text
ContentGroup 是人类思路和 AI 读取之间的中间层。
```

AI 不应该只能直接读原始长文本并猜测结构；人类也不应该被迫一开始就按照机器 schema 写作。ContentGroup 正好处在中间：先保留人的自然写作，再把被认为有价值的内容逐步收纳、命名、细分、连接。

## 4. 目的驱动的知识塑形

本轮讨论中一个关键判断是：

```text
知识本身没有固定形状。
目的会给知识临时塑形。
```

同一份材料，例如某本教材 Chapter 1 到 Chapter 3 的整理笔记，在不同目的下会形成完全不同的 ContentGroup。

如果目标是日常学习，ContentGroup 可能按以下角色组织：

```text
definition
theorem
lemma
example
practice problem
proof idea
counterexample
```

对应的 relation 也会比较直白：

```text
A derives_to B
A is an example of D
A plus B derives_to C
theorem uses definition
example demonstrates theorem
```

如果目标是期中或期末复习，同一份材料可能被重新整理为：

```text
must know
high-risk mistakes
common exam traps
proof templates
weak concepts
formula checklist
practice pattern
```

如果目标是产品调研，结构又可能变成：

```text
competitor feature
pricing model
positioning
interaction pattern
market gap
evidence
recommendation
```

因此 ContentGroup 不应该被设计成固定 schema。它应该是：

```text
purpose-driven content package
```

也就是服务于某个理解目标、写作目标、复习目标、调研目标或推理目标的内容包。

## 5. 场景一：人先整理，AI 做反思伙伴

第一种核心场景是：

```text
用户先写
  -> 用户自己整理 ContentGroup
  -> 用户进一步整理 Petal
  -> 用户询问 AI：我这样整理得怎么样？
```

用户可能问：

```text
我的 ContentGroup 做得怎么样？
它们是否服务于我的目的？
我到底是为了什么目的整理它们？
有哪些 ContentGroup 太大？
有哪些 ContentGroup 角色混乱，需要拆开？
有哪些 ContentGroup 可以合并？
哪些内容在当前目的里是多余的？
哪些 Petal 缺失？
哪些 relation 应该建立但还没有建立？
```

在这个场景中，AI 的角色不是替用户总结文本，而是帮助用户反思自己的整理结构。

产品判断：

```text
ContentGroup 是用户思路的外化。
AI 评价 ContentGroup，就是在评价用户当前的理解结构。
```

如果 ContentGroup 或 Petal 成为 relation endpoint，那么建立 relation 就相当于把思考过程降为记录下来的边关系。

因此 relation 不是装饰线，也不是单纯图谱 UI。它代表：

```text
用户或 AI 确认过的一段思考关系。
```

## 6. 场景二：AI 先整理，人做导演和审稿人

第二种核心场景是：

```text
用户上传原始文档
  -> AI 阅读材料
  -> AI 澄清整理目的
  -> AI 生成笔记或报告
  -> AI 同时生成一套或多套 ContentGroup / Petal / Relation
  -> 用户审阅并要求加深、改写、扩充或换视角
```

这里 AI 不应该一上来就直接输出唯一版本。

更合理的流程是：

```text
1. AI 先读材料。
2. AI 判断这些材料可能支持哪些整理目的。
3. AI 问用户：你想为了什么目的整理？
4. AI 给出可选方向，用户可以单选或多选。
5. AI 根据目的生成笔记 / 报告 / ContentGroup System。
6. 用户阅读后提出反馈。
7. AI 回到原始材料或已有 note，扩充、重组、补证据、补例子、补推导。
```

用户可能要求：

- 某一套 ContentGroup 太浅，需要回到原始文档补内容。
- 需要更多例子。
- 需要更多解释。
- 需要更多推导过程。
- 需要更多 practice problem。
- 需要把某些 ContentGroup 拆开。
- 需要把某些视角改成考试复习、报告写作或产品分析。

这个场景中的用户不是被动接受 AI 结果，而是像导演一样不断调整整理目标。

## 7. 补充场景：同一份材料的多视角重组

同一篇 note 或同一批材料，后续可能被不同目的反复复用。

例如用户已经按日常学习整理出一套 ContentGroup，后来要期末复习，可以让 AI 生成：

```text
exam review view
```

它不需要破坏原有结构，而是可以基于原 ContentGroup 生成另一套 GroupFolder / temporary view / derived ContentGroup set。

推荐心智：

```text
旧结构不被推翻。
新目的生成新的整理视角。
满意则保存。
不满意则丢弃。
```

这与未来 AI temporary GroupFolder、AI proposal、GraphRAG projection 很契合。

## 8. 补充场景：学习诊断

当用户积累了一批 ContentGroup 和 Relation 后，AI 可以诊断结构缺口。

例如：

```text
你有 theorem，但没有 example。
你有 formula，但没有条件说明。
你有 derives_to，但缺少反向直觉解释。
你有很多 practice problem，但没有抽象 solving pattern。
你有 definition，但没有 counterexample。
你有 proof，但没有 proof strategy summary。
```

这类诊断不是普通错题本，而是基于用户已经整理出来的知识结构进行分析。

对数学学习而言，它可以帮助用户发现：

- 概念是否只是会背，不会用；
- 证明是否只是抄写，没有形成策略；
- 题目是否只是堆积，没有抽象出 pattern；
- relation 是否只是线性依赖，没有形成局部图谱。

## 9. 补充场景：从问题反向生成阅读路径

用户也可能不是从文件开始，而是从一个问题开始：

```text
我想理解 compactness 为什么在 analysis 里重要。
```

AI 可以从已有 note / ContentGroup / Relation 中找到相关材料，临时组织一条阅读路径：

```text
Open cover definition
Heine-Borel theorem
Sequential compactness
Extreme value theorem
Uniform continuity theorem
Counterexamples
Applications
```

这是一种 GraphRAG 场景，但用户看到的不应该是数据库查询结果，而是：

```text
为了回答某个问题而生成的局部知识路径。
```

## 10. 补充场景：报告 / 论文 / 调研写作

当用户写报告、论文、调研文档时，AI 可以根据已有 source、note、ContentGroup 和 Relation 生成草稿。

但草稿不应该是无源文本。

每个关键段落都应能追溯到：

```text
direct source
root evidence
intermediate note / report / ContentGroup
relation judgment
```

这会让 Coincides 从普通学习笔记扩展为高可信写作工具。

## 11. 笔记和报告也应该成为可复用 source

本轮后续讨论强调：

```text
原始文档不是唯一可以作为 source 的东西。
已经整理出来的笔记、报告、briefing、学习材料，也有被复用的价值。
```

也就是说，Coincides 中至少需要区分：

```text
外部原始文档
  用户上传的 textbook / paper / webpage / report / PDF 等。

内部加工文档
  用户或 AI 已经整理过的 note / report / section / ContentGroup。

Condensed Source
  已经包含人类或 AI 理解、判断、摘要和推理状态的材料。
```

关键判断：

```text
一份已经整理好的 note 或 report，也可以成为另一份 note / report 的 source。
```

例如：

```text
Textbook Chapter 1-3
  -> AI / 用户整理成 Study Note A
  -> Study Note A 作为 condensed source
  -> 被复用进 Exam Review Note B
  -> Exam Review Note B 再被复用进 Final Report C
```

这意味着 source chain 不能只保存“最终文本引用了哪个原始 PDF”。

它还需要保存：

```text
full internal processing chain
```

也就是这段内容从原始材料到中间笔记、再到最终报告的加工路径。

## 12. Condensed Source 的产品意义

Condensed Source 不是“低质量摘要”。

它可能包含：

```text
Evidence
  外部事实基础。

Interpretation
  人类或 AI 的解释、总结、判断、理解。

Reasoning State
  当时的推理过程、取舍、结构化视角、关系判断。
```

因此导入一份已有笔记、lecture note、Markdown note、Notion export、AI briefing 或 draft report 时，默认目标不应该是把它重新总结掉。

更合理的目标是：

```text
reconstruct
preserve
structure
align
relate
make editable
make AI-readable
```

即：

```text
把已经凝缩过的人类/AI 工作保留下来，
并让它继续成为后续加工的材料。
```

## 13. ContentGroup 与复用 source 的关系

如果 note / report 可以成为后续 source，那么 ContentGroup 的复用价值会进一步增强。

ContentGroup 可以扮演三种角色：

```text
作为当前 note 的整理包
  收纳当前 TextFlow 中的 ranges / labels / blocks。

作为跨 note 的可加工素材
  被 duplicate 到新的 note / project 中继续改写和扩充。

作为 AI 读取的结构化 source segment
  被 AI 用于生成新笔记、报告、复习结构或 relation proposal。
```

这与之前 6 月 20 日讨论中的判断一致：

```text
ContentGroup 让重点内容成组。
Petal 让重点内容可复用。
GroupFolder 让 ContentGroup 成为可组织、可浏览、可跨上下文使用的独立单位。
```

## 14. 复用时需要保留层级来源

如果一段内容来自一个已经整理过的 note，而这个 note 又来自某个 textbook，那么系统应该能区分：

```text
direct source
  当前内容直接引用 / 复制 / 改写自哪份 note、report、section 或 ContentGroup。

root evidence
  这条内容最深层能追溯到哪些原始文档、PDF、网页、source snapshot。

processing chain
  中间经过了哪些用户或 AI 加工材料。
```

这可以避免两个极端：

```text
只看 root evidence
  会丢失中间笔记和报告的解释价值。

只看 direct source
  会丢失最终事实依据和证据链。
```

推荐心智：

```text
内部 note / report 可以成为 source。
但它们不是证据链终点。
它们是加工链上的可引用节点。
```

## 15. 与 SourceArtifact / SourceReference 的关系

当前 Source-Provenance 方向已经给出一条可接续的模型：

```text
SourceArtifact
  Coincides 内部可被引用对象：
  Note / Report / Section / NoteBlock。

SourceReference
  NoteBlock / Note / Relation / Section 对 external SourceVersion 或 internal SourceArtifact 的引用。

SourceChain
  direct source / root source / full internal processing chain。
```

本轮讨论补充的重点是：

```text
ContentGroup 也应该进入这套复用和引用思路。
```

后续需要继续判断：

- ContentGroup 是否应成为 SourceArtifact 的一种？
- ContentGroup member 是否天然可以引用 internal SourceArtifact？
- 一份 note 作为 condensed source 被拆成多个 ContentGroup 时，如何保存源 note 的解释状态？
- AI 生成的 ContentGroup / Relation proposal 是否也应进入 source chain？
- 用户接受 AI proposal 后，source chain 如何从 candidate 升级为 confirmed？

## 16. 当前产品判断

本轮对话形成的高层判断：

```text
Coincides 不只是帮用户写笔记。
它要让自然写作逐步获得可复用的结构身份。
```

更具体地说：

```text
同一批材料
  在不同目的下
  被组织成不同 ContentGroup / Petal / Relation 结构
  并且每个结构都能回到原始证据和中间加工链。
```

因此长期核心不应被描述为“自动生成知识图谱”。

更准确的描述是：

```text
purpose-driven knowledge shaping
```

即：

```text
目的驱动的知识塑形。
```

Graph database / GraphRAG 是后续实现形态之一，但不是产品语义本身。真正的产品语义是：

- 用户和 AI 为什么要整理这批内容；
- 这批内容被整理成哪些 ContentGroup；
- 每个 ContentGroup 服务什么目的；
- 它内部有哪些 Petal；
- 它和其他 ContentGroup / Petal 有哪些已确认 relation；
- 它直接来自哪里；
- 它最深层的证据在哪里；
- 它未来如何被再次复用。

## 17. ContentGroup System 的当前体验断层

本轮后续闲聊中，Henry 暂时把这一整套能力称为：

```text
ContentGroup System
```

后续也可以评估是否叫 `ContentGroup Engine`，但当前先使用 `ContentGroup System`，避免概念过早散开。

目前已经围绕 ContentGroup System 打磨了约三十个小版本，其中包含路线转向、机会成本和试错。这些试错不是浪费，而是帮助系统从 NoteBlock-first、annotation-first，逐步走到 TextFlow-first / ContentGroup-aware。

当前明显问题是：

```text
UX 心智仍然混乱。
视觉效果和界面职责还没有把产品内核表达出来。
```

现在主要入口有三类：

```text
Groups Rail
  侧边栏入口，负责轻量收纳和快速进入。

Group Gallery
  资源管理器，负责组织、浏览、GroupFolder 管理。

Single Group Editor
  完整深加工台，负责 members、Petals、summary、topic、role、identity 和 source/refinement。
```

但三者都还没有达到理想状态：

- Rail 容易被塞成 mini editor。
- Gallery 还没有完全像资源管理器。
- Single Group Editor 容易和自然写作现场断开。
- GroupFolder 是必要概念，但它也增加了用户心智负担。

因此 8.6.31 的 OpenDesign visual parity 不是单纯美化，而是要修正用户到底处在哪个整理层级的问题。

## 18. Canvas 轻量 ContentGroup 工作窗想法

Henry 在本轮讨论中提出了一个新的 UX 方向：

```text
成熟的 ContentGroup System 不能和自然写作体验完全割裂。
```

当前如果用户想做 ContentGroup 的细节操作，往往必须离开当前写作现场，进入 Single Group Editor。这会形成两层世界：

```text
自然写作世界
  TextFlow / Page / Canvas

深度整理世界
  Single Group Editor / Gallery
```

这种断裂会让 ContentGroup System 看起来像外部管理工具，而不是自然写作过程的一部分。

一个可能的中间层是：

```text
从 Groups Rail 拖出某个 ContentGroup
  -> 在 Canvas 上生成一个轻量 ContentGroup 工作窗
  -> 用户在当前写作现场做简略编辑和收纳
  -> 需要深度加工时展开为完整 Single Group Editor
  -> 保存后轻量窗口可以消失或回到 Rail / Gallery
```

这个轻量窗口可以理解为：

```text
mini Single Group Editor
```

但它不应该复制完整 Single Group Editor 的所有复杂功能。

它可能只负责：

- 显示 display name / identity / topic / role 的简略状态；
- 显示少量 members；
- 接收当前 selection / label / block；
- 提供快速 rename / add / remove；
- 提供打开完整 Single Group Editor 的入口；
- 在 Canvas 上保留一个临时整理焦点。

它不应该负责：

- 完整 Petal 管理；
- 复杂 source chain 查看；
- 大规模 folder 管理；
- relation graph 编辑；
- 让 Canvas 变成另一套 Gallery。

这个想法的产品意义不是“做一个酷炫拖拽窗口”，而是：

```text
把 ContentGroup 的整理动作拉回自然写作现场。
```

如果做得好，用户体验会从：

```text
我写作 -> 我离开写作 -> 我去管理 ContentGroup
```

变成：

```text
我写作 -> 我把旁边的 ContentGroup 拿到画布上 -> 我在写作现场整理 -> 需要时再进入深加工台
```

## 19. ContentGroup 拖入笔记的两层语义

本轮继续讨论后，形成了一个更稳定的交互拆分：

```text
不要让“把 ContentGroup 拖进笔记”这个动作一次性决定所有事情。
```

它应该分成两层：

```text
第一层：
  把 ContentGroup 从 Rail / Gallery 拖到当前 note / canvas。
  它先作为一个对象存在。

第二层：
  用户再决定这个对象在当前 note 中的用途。
```

也就是说，ContentGroup 被拖入当前写作现场后，不应该立刻被拆成 blocks，也不应该立刻写入正文。更自然的默认状态是：

```text
ContentGroup Tile / ContentGroup Capsule / ContentGroup Canvas Projection
```

这个对象可以借用 Group Gallery card 的视觉心智：像一个小 folder / file card，有 display name、role tab、topic color signal、source hint、identity status。

但它不应该直接叫 `folder`，因为 `GroupFolder` 已经是正式组织对象。更准确的说法是：

```text
它不是 GroupFolder。
它是 ContentGroup 在当前 Canvas / Note 里的可操作投影。
```

第一层拖入后的默认含义是：

```text
让这个 ContentGroup 来到当前写作现场。
```

第二层才决定用途：

```text
点击 / 双击 Tile
  展开轻量编辑窗口。

收起窗口
  回到 Tile 状态。

拖到 TextFlow / block 上
  建立 reference / link。

右键 Tile -> 写入笔记
  materialize，把 members 转成 blocks。

打开完整编辑器
  进入 Single Group Editor。
```

这条设计的核心价值是：

```text
先让 ContentGroup 存在，再让用户决定它怎么被使用。
```

这样可以避免把“编辑”“引用”“复用”“写入正文”全部挤进同一个拖拽动作里。

## 20. ContentGroup 的 CanvasObject 形态

如果 ContentGroup 被放到 Canvas 上，它在画布表现层可以被理解为一种 `CanvasObject`。

但这里必须区分本体和投影：

```text
ContentGroup
  知识包本体。
  回答：它是什么？它有哪些 members / petals / summary / topic / role / identity？它的来源链是什么？

CanvasObject: ContentGroupTile
  画布上的投影 / placement。
  回答：它在这个 canvas 上摆在哪里？现在折叠还是展开？显示成什么大小？当前视觉状态是什么？

GroupFolderPlacement
  Gallery / folder 系统里的组织位置。
  回答：它在资源管理器路径里归在哪里？
```

因此不应该说：

```text
ContentGroup 本质上是 CanvasObject。
```

更准确的规则是：

```text
ContentGroup 可以拥有 CanvasObject 形态。
```

同一个 ContentGroup 可以有多种投影：

```text
Rail row
Gallery card
Single Editor page
Canvas tile
TextFlow reference link
Materialized blocks
```

这些形态不是同一层级的对象。它们是同一个 ContentGroup 在不同 surface 中的使用方式。

这也解释了为什么 Canvas 上的 Tile 即使只是摆在那里，也可以成立：

```text
它可以是空间记忆。
它可以是临时整理对象。
它可以是引用入口。
它可以是等待被 materialize 的知识包。
```

只要 ContentGroup 本体、Canvas placement 和 GroupFolder placement 三者分清，Canvas 上的存在就不会污染正文和资源管理器语义。

## 21. 跨上下文复用与本地副本

如果用户把另一个 note / project 里的 ContentGroup 拖入当前 note，后续编辑不应该默认修改母本。

更稳的规则是：

```text
同一 note 中的 ContentGroup
  结构编辑可以默认写回这个 ContentGroup 本体。

跨 note / 跨 project 复用
  默认生成当前上下文中的本地副本。

Reference / link
  只作为入口，不编辑原对象。
```

如果生成副本，副本应该：

- 有自己的 `id`；
- 保留 `derived_from_group_id`；
- 保留 direct source / root evidence / source snapshot；
- 可以选择存放到当前 note / project 的某个 GroupFolder；
- 后续编辑不影响母本 ContentGroup。

当前心智：

```text
拿来改 = Duplicate / local copy。
只是看见或引用 = Reference。
写进正文 = Materialize。
```

这与之前 Duplicate / Reference / Materialize 的区分一致。

## 22. Member 与 ContentRange 必须分离

本轮讨论中最关键的稳定结论是：

```text
编辑 ContentGroup 与编辑原文不是一件事。
```

更底层的规则是：

```text
ContentGroupMember 与 ContentRange 必须区分。
```

只有在刚创建 ContentGroup 的那一刻，可以认为：

```text
member initial content == source ContentRange text
```

但从那之后，它们就可以分叉。

推荐定义：

```text
ContentRange
  原文里的位置 / address truth / source anchor。

ContentGroupMember
  ContentGroup 内部的材料单位 / group-local content truth。
```

因此：

```text
编辑 Member
  不代表修改 ContentRange。

编辑 TextFlow / ContentRange 所在原文
  不代表自动修改 Member。
```

这条规则让逻辑顺很多。因为 ContentGroup 不是原文的实时镜像，而是从原文中抽取出来、进入整理系统后的材料包。它保留来源链，但拥有自己的整理生命。

更短的原则是：

```text
Member 保留来源链，但不等于原文。
```

Single Group Editor、Canvas Tile 展开窗口、Gallery 进入的编辑状态，默认都应该编辑 `ContentGroupMember` 层，而不是直接编辑 TextFlow 原文。

如果用户确实需要同步，应该提供显式动作：

```text
Compare with source
Refresh member from source
Replace member with source
Apply member back to source
```

但这些都不应该默认发生。

这保护了两种真相：

```text
TextFlow 是正文真相。
ContentGroupMember 是整理真相。
```

二者有关联，但不是同一个东西。

## 23. Materialize 的朴素版与未来版

当用户选择把 Canvas 上的 ContentGroup Tile “写入笔记”时，第一版可以采用最朴素、最安全的规则：

```text
one member = one block
```

原因是每个 member 是独立材料单位，把它们转成独立 block 是安全、可解释、容易回溯的。

但这不应该被理解为最终形态。

更准确的分层是：

```text
Write into note
  朴素写入。
  one member = one block。

Compose into note
  高级写入。
  根据 purpose / role / Petal / summary / AI 生成可读 section。
```

未来可以支持：

- 按 Petal 写入；
- 按 summary + members 写入；
- 按当前 note 目的生成 section；
- 按 definition / theorem / example 模板组织正文；
- 由 AI compose 成更自然的段落。

当前阶段先不要把这些能力混在一起。

第一版 materialize 只需要清楚表达：

```text
把这个 ContentGroup 的 member 作为 blocks 放进当前 note 或 scratch area。
```

## 24. 轻量工作窗的风险

这个方向也有风险。

第一，Canvas 本身还没有完全成熟，如果太早把 mini editor 放上去，可能会让 Page / Canvas / Rail / Gallery / Editor 五套心智一起混乱。

第二，mini editor 很容易膨胀。如果它开始支持完整 summary、topic、role、Petal、member detail、source preview，就会重新变成一个小型 Single Group Editor，破坏 Rail 和 Editor 的分工。

第三，用户可能不清楚轻量窗口里的修改是临时状态、正式保存，还是对 Gallery 中对象的直接修改。

因此如果后续推进，需要先定义几个边界：

```text
轻量窗口是临时工作窗，还是正式 canvas object？
保存后它是否消失？
它是否能长期留在 Canvas 上？
它和 ContentGroup 本体是什么关系？
它和 CanvasObject / NoteBlock placement 是什么关系？
它是否进入导出内容？
```

当前更稳的阶段性判断：

```text
Canvas 轻量 ContentGroup 工作窗可以作为未来桥接体验候选。
但 8.6.31 仍应先完成三层界面的视觉和职责校准。
```

也就是说，这个想法很有价值，但不应该倒灌进当前 OpenDesign visual parity 小版本里，避免再次把 8.6.31 做散。

## 25. 开发者反思

本轮闲聊也记录了一个开发者层面的感受：

```text
开发不是简单地把功能写出来。
```

一个产品能力会同时牵涉：

- 哲学判断；
- 用户心智；
- 操作流程；
- 信息架构；
- 视觉设计；
- 美学；
- 前端；
- 后端；
- 数据模型；
- 服务器；
- 打包和发布方式。

ContentGroup System 正是这种复杂性的集中体现。

它既要保持自然写作，又要支持 AI 读取；既要让用户轻松收纳，又要让深度结构可用；既要未来能进入 GraphRAG，又不能把用户过早拖进工程化结构。

这也是为什么当前小版本看起来很多，但本质上是在逐步打磨一套语言和心智模型。

## 26. ContentGroup 数据库实体拆分判断

本轮讨论中又确认了一个重要架构判断：

```text
ContentGroup 不应长期只是 note metadata 的一部分。
它应该逐步变成独立的知识包实体。
```

拆分原则不是“哪个 UI 上看起来像对象，哪个就建表”，而是：

```text
谁有独立生命周期，谁就应该成为数据库实体。
```

当前可以先形成以下实体候选列表。

### 26.1 ContentGroup

`ContentGroup` 必须成为独立实体。

它是可复用知识材料本体，不应该只是某篇 note metadata 里的数组项。

它需要拥有自己的稳定身份、workspace / project scope、display name、topic、role、summary、status、version、created_from 等信息。

原因是它未来会被 Gallery 管理、被别的 note 引用、被 AI 读取、被 Graph / RAG 系统当作节点或上下文包使用。

### 26.2 ContentGroupMember

`ContentGroupMember` 应成为独立子实体，属于某个 `ContentGroup`。

它不是原文 range 的别名，而是 group 内部的整理内容单元。

因此它需要表达：

- 当前整理内容；
- 显示用 preview；
- 顺序；
- 类型；
- 来源状态；
- 和原始 source 的关系。

这支撑前面已经确认的规则：

```text
编辑 Member 不等于编辑原文。
编辑原文也不等于自动修改 Member。
```

### 26.3 ContentGroupPetal

`ContentGroupPetal` 应成为独立子实体，至少需要稳定 id。

Petal 是 ContentGroup 内部结构，不是 source text 上的高亮，也不是 Label。

它未来可能成为：

- group 内部的角色分区；
- AI 解释和重组的结构入口；
- relation endpoint；
- GraphRAG 中可引用的局部节点。

因此它需要独立保存 name、role、order、summary、fragment membership 等信息。

### 26.4 GroupFolder 与 FolderPlacement

`GroupFolder` 必须成为独立实体。

它是资源管理器层的组织边界，不应该只是某篇 note 的局部 metadata。

更进一步，`ContentGroup` 与 `GroupFolder` 的关系最好不要只做成一个 `folder_id` 字段，而是可以考虑独立的 placement / membership 关系。

这样未来同一个 ContentGroup 可以有 canonical home，也可以出现在复习集合、跨项目调研集合、saved graph scope 等不同组织视图中。

### 26.5 SourceArtifact

`SourceArtifact` 必须成为独立实体。

它用于统一表达所有可以成为 source 的东西：

- 用户上传的原始文档；
- note；
- AI 生成的 report；
- 已整理出来、可以再次被复用的 internal note；
- 未来可能被 snapshot 化的 ContentGroup。

这个实体是“笔记和报告也可以成为其他笔记 source”的基础。

### 26.6 SourceAnchor / ContentRangeAnchor

`SourceAnchor` 可以理解为“来源定位钉”。

它不是内容本身，而是记录：

```text
这个 Member 当初来自哪份 source 的哪一段。
```

它大致需要保存 source_artifact_id、block_id、range、snapshot_text、hash、locator、status 等信息。

它的作用是：

- 找回原文；
- 对比原文是否变化；
- 支持 refresh member from source；
- 支持 apply member back to source；
- 支持跨 note / project 复用时仍然保留来源链。

早期它可以先作为 `member.source_ref` 嵌在 Member 中；等跨 note、跨 project、同步、RAG 需求变强后，再升级为独立实体。

### 26.7 MemberSourceLink

`MemberSourceLink` 用于表达 `ContentGroupMember` 和 `SourceAnchor` 之间的关系。

它可以让一个 member 明确知道自己来自哪里，但又不把 member 和原文强行绑定成同一个东西。

这层关系未来也可以支持多来源 member，例如一个整理后的 member 同时综合了几段原文或几份 source。

### 26.8 ContentGroupProjection / Usage

当 ContentGroup 被拖进某篇 note 或 canvas 后，不应该修改 ContentGroup 本体，而应该生成一次 usage / projection。

可能的 projection 包括：

- Canvas 上的 `ContentGroupTile`；
- TextFlow 里的 reference link；
- materialize 后生成的一组 blocks；
- scratch area 里的临时工作对象。

这层实体回答的是：

```text
这个 ContentGroup 在哪里、以什么形态被使用。
```

而不是回答：

```text
这个 ContentGroup 本身是什么。
```

### 26.9 KnowledgeRelation / GraphEdge

当系统进入 Graph Database / GraphRAG 阶段后，relation 必须成为独立实体。

它的 endpoint 可以是：

- ContentGroup；
- Petal；
- Member；
- SourceArtifact；
- NoteBlock；
- Label / Annotation。

这层不用在当前小版本急着实现，但需要在数据设计里留位置。

### 26.10 阶段性拆分顺序

更稳的拆分顺序是：

```text
第一阶段：
  ContentGroup
  ContentGroupMember
  ContentGroupPetal
  GroupFolder
  FolderPlacement

第二阶段：
  SourceArtifact
  SourceAnchor / ContentRangeAnchor
  MemberSourceLink

第三阶段：
  ContentGroupProjection / Usage
  TextFlowReference
  Materialization

第四阶段：
  KnowledgeRelation / GraphEdge
  RAG index / graph index
```

也就是说，当前最重要的判断是：

```text
ContentGroup 不是 note 的 metadata。
note 只是它的来源之一，也可能是它未来被投影、引用和复用的地方之一。
```

## 27. 8.7 ContentGroup System Maturity 目标

本轮讨论后，版本边界需要重新判断。

当前正式文档中，`V2.BN.8.7` 原本安排为 `CanvasObject / Media Annotation / Drawing Tool / Image Insert Seed`，`V2.BN.8.8` 原本安排为 `Canvas Reliability / Scale / Export Reserve Closure`。

但新的判断是：

```text
8.7 应该腾出来做 ContentGroup System 的成熟化。
原 8.7 CanvasObject seed 顺延到 8.8 或后续 Canvas track。
原 8.8 Canvas reliability / scale / export reserve 顺延到 8.9+。
```

原因是 CanvasObject 未来会大量引用 ContentGroup、SourceArtifact、Member、Petal、Reference / Fork / Materialize 等能力。

如果 ContentGroup System 自己还没有稳定，Canvas 会变成第二个混乱入口，而不是自然延伸。

因此 8.7 的目标可以暂定为：

```text
ContentGroup System 1.0:
让 ContentGroup 成为一个稳定、可理解、可复用、可被未来 Canvas 引用的知识包。
```

它不追求现在就完成 GraphRAG、跨项目 CanvasObject reuse 或完整数据库实体迁移。

它追求的是对象边界成熟：

```text
用户可以从 TextFlow 创建 ContentGroup，
在 Rail 里快速收集，
在 Gallery 里组织，
在 Single Editor 里精修，
并且清楚知道它和原文、folder、future canvas projection 的关系。
```

### 27.1 三层入口收束

8.7 需要把 ContentGroup 的三个主要入口压清楚：

```text
Rail:
  当前 note 内快速收集、快速查看、快速进入。

Gallery:
  跨 note / project 的组织、搜索、folder 管理。

Single Editor:
  深度编辑 members、petals、summary、role、source relationship。
```

现在的问题不是没有功能，而是 Rail、Gallery、Single Editor 都容易长成“半个总控制台”。

8.7 应该让用户一眼知道：

```text
这个入口是收集。
这个入口是组织。
这个入口是精修。
```

### 27.2 Member 与 Source 边界落地

8.7 需要把已经确认的原则变成产品事实：

```text
ContentGroupMember 是整理真相。
ContentRange / SourceAnchor 是来源定位。
二者有关联，但不自动同步。
```

因此后续模型和服务层至少需要开始表达：

```text
member current content
source reference
source snapshot
sync status
refresh from source
apply member back to source
```

不一定立刻完成完整数据库迁移，但需要避免继续把 `preview_text`、`content_range` 和 `member 内容本体` 混在一起。

### 27.3 Folder / Gallery 像资源管理器

`GroupFolder` 需要从 note metadata 里的组织字段，逐渐升级为资源管理器层。

8.7 至少需要让用户理解：

```text
ContentGroup 在哪里被组织。
它属于哪个 folder。
它是否可以被移动。
它是否可能未来出现在多个组织视图中。
```

当前阶段不一定马上做完整多 placement，但心智上要从“局部分类”走向“知识包资源管理器”。

### 27.4 基础复用动作定语言

Canvas 之前，必须先把 ContentGroup 的复用语言定住：

```text
Reference:
  引用原 group，不改本体。

Duplicate / Fork:
  复制成当前上下文自己的版本。

Materialize:
  把 members 写进 note，第一版通常 one member = one block。

Open original:
  回到来源对象或来源 note。
```

这些词未来会直接被 CanvasObject reuse、Source Card、Evidence Card、AI 召回旧对象复用。

如果这些词在 8.7 内仍不稳定，8.8+ 的 Canvas 会继承混乱。

### 27.5 视觉和心智变清楚

8.6.31 仍然可以继续承担 OpenDesign visual parity 的收束。

8.7 则应该在此基础上，把 ContentGroup System 做到：

```text
看得懂。
找得到。
改得动。
知道改的是 group 还是原文。
知道引用、复制、写入分别意味着什么。
```

这比继续堆更多功能更重要。

### 27.6 进入 Canvas 前的验收问题

ContentGroup System 能稳定回答下面这些问题时，再进入 Canvas 会更稳：

```text
我是谁？
我在哪里被组织？
我的 members 是什么？
我来自哪里？
我和原文是否同步？
我被引用、复制、写入时分别发生什么？
```

这些问题回答清楚后，Canvas 才会变成 ContentGroup 的自然延伸。

如果这些问题没回答清楚，Canvas 就会变成第二个混乱入口。

## 28. 8.8+ CanvasObject Reuse 问题

本轮讨论中也明确了一件事：

```text
CanvasObject reuse 属于 8.8+ / 后续 Canvas track 问题，
不应该倒灌进 8.6.31 或 8.7 ContentGroup System maturity 范围。
```

顺延后的 Canvas 版本目标不是简单支持“跨 note 复制一个矩形”，而是支持：

```text
跨 note / cross-project 复用一个带语义、带来源、带关系的 canvas object。
```

更准确地说，复用的通常不是同一个 `CanvasObject` 本身，而是在新 canvas 上生成一个新的 projection / placement，并指向同一个底层对象。

例如：

```text
原项目 CanvasObject A
  -> 指向 ContentGroup X

新项目 CanvasObject B
  -> 也指向 ContentGroup X
  -> 记录 origin_canvas_object_id = A
```

原因是位置、大小、折叠状态、所在 canvas、展示模式属于当前 canvas；而 ContentGroup、SourceArtifact、Asset 等才是可共享的内容本体。

### 28.1 复习画布场景

用户平时在不同课程笔记里整理出很多 ContentGroup。

到期中或期末复习时，可以新建一个 review canvas，把以前的 definition、theorem、proof sketch、practice group 都拖进来。

这个 canvas 像一个临时知识战场：

```text
Power Series Definition
Radius of Convergence
Taylor Remainder
Practice: Series Expansion
Common Mistakes
```

用户可以在这个 canvas 上重新排列、建立 relation、让 AI 生成复习路线。

这里复用的是已有知识包，而不是重新写一遍正文。

### 28.2 跨项目调研报告场景

跨项目调研里的 reuse 不是把 `Backlink`、`Graph View`、`Local-first Storage` 这些抽象词拖进新项目，而是把之前围绕这些主题整理出来的对象拖进来。

例如在 `Obsidian Research` 项目里已经存在：

```text
ContentGroup: Obsidian - Graph View
members:
  - 官方文档里关于 Graph View 的说明
  - 用户体验笔记
  - 截图
  - 优点
  - 缺点
summary:
  Obsidian 的 Graph View 更像探索工具，不一定适合高精度结构化知识管理。
```

当用户在 `Notebook Product Comparison` 项目中复用它时，它可以变成当前 canvas 上的一个 source card / evidence card。

`Source Card` 更强调：

```text
它来自哪里。
```

例如：

```text
[Obsidian - Graph View]
From:
  Obsidian Research / Graph Features note
Contains:
  4 members, 1 screenshot, 2 source excerpts
Status:
  Live reference
```

`Evidence Card` 更强调：

```text
它在当前报告里证明什么。
```

例如：

```text
[Evidence] Obsidian Graph View
Claim:
  Graph View helps users discover note relationships,
  but can become noisy in large vaults.
Source:
  Obsidian Research / Graph Features note
Use in this report:
  Graph-based navigation comparison
```

这两者都不是新正文，也不是简单复制原文，而是当前项目中的“可引用调研证据对象”。

### 28.3 编辑边界

跨项目复用后，需要区分三层编辑：

```text
编辑当前 CanvasObject
  只改它在当前 canvas 中的位置、大小、标题别名、备注、连接关系、展示状态。

编辑原始对象
  需要明确进入原项目或原对象，避免误改 shared source。

Fork 到当前项目
  复制成当前项目自己的版本，再允许自由编辑。
```

因此，source card / evidence card 可以编辑，但默认编辑的是当前 canvas 上的 usage state，而不是原始 ContentGroup 本体。

如果用户想改写内容，应提供明确动作：

```text
Fork to current project
Open original
Reference only
Materialize into note
Compose into report section
```

### 28.4 三种复用模式

未来最有价值的复用模式可能是：

```text
Live Reference
  继续指向原对象，适合证据、引用、只读材料。

Fork / Local Copy
  复制成当前项目版本，适合跨项目改写。

Snapshot
  冻结当时状态，适合报告、引用、可追溯证据。
```

顺延后的 CanvasObject seed 可以先在底层保留这三种语义，但 UI 上不一定一开始全部暴露。

早期比较稳的方式是先暴露：

```text
Reference
Duplicate / Fork
```

`Snapshot` 可以作为后续更严格的 source / report / audit 能力。

### 28.5 AI 召回旧对象

当 CanvasObject reuse 成熟后，AI 不应该只从原文重新生成内容，也可以从已有可复用对象里召回材料。

例如用户说：

```text
帮我做一张关于 power series exam review 的 canvas。
```

AI 可以搜索已有的 ContentGroup、CanvasObject projection、source card、evidence card，然后建议：

```text
我找到了 8 个相关对象：
- Radius of Convergence
- Interval Endpoint Check
- Taylor Polynomial Remainder
- Rewrite as Power Series

要不要把它们放进新的复习 canvas？
```

这意味着 cross-note / cross-project CanvasObject reuse 未来会成为 AI 整理能力的一部分。

### 28.6 阶段性判断

顺延后的 CanvasObject 版本最重要的底层判断是：

```text
CanvasObject 应该入库。
但它入库的身份是 canvas 上的 projection / placement / usage，
不是所有内容的最终本体。
```

例如 `ContentGroupTile` 的 canvas object 不应复制 ContentGroup 的 members 和 petals，而应指向 ContentGroup 本体，并保存当前 canvas 中的显示状态。

可以先采用统一的 `canvas_objects` 表，保存：

- canvas_id；
- kind；
- source_entity_kind；
- source_entity_id；
- x / y / width / height；
- z_index；
- display state；
- payload_json。

等某些对象成熟后，再考虑拆 typed table。

也就是说，8.8+ 的 CanvasObject track 可以朝最终的 cross-note / cross-project reuse 设计，但实现上仍应分阶段推进。

## 29. 后续待继续讨论的问题

- [ ] ContentGroup 是否正式进入 SourceArtifact 范围？
- [ ] Condensed Source 与普通 internal note / report 的边界是什么？
- [ ] AI 生成 note 时，是否默认同时生成多套目的不同的 ContentGroup？
- [ ] 多套 ContentGroup 之间如何共享 source chain，但不互相污染结构？
- [ ] 用户要求“加深某套 ContentGroup”时，AI 应该怎样回到 root source 和 intermediate source？
- [ ] Relation 是否应记录 purpose context，例如 exam review relation、daily learning relation、product research relation？
- [ ] AI proposal 生成的 temporary GroupFolder / temporary ContentGroup 何时转正？
- [ ] 已经被复用多次的 note/report 删除或改写时，如何给下游内容显示 degraded / changed / outdated？
- [ ] ContentGroup Duplicate / Reference / Materialize 与 SourceReference 的边界如何统一？
- [ ] Canvas 轻量 ContentGroup 工作窗是否应该成为正式交互方向？
- [ ] 轻量工作窗是临时 projection、正式 CanvasObject，还是两者之间的新对象？
- [ ] 如何避免轻量工作窗重新膨胀成 mini Single Group Editor？
- [ ] 8.6.31 之后，是否需要单独开一个小版本研究 Canvas 上的 ContentGroup bridge？
- [ ] ContentGroup Tile 在 Canvas 上长期存在时，是否参与导出？
- [ ] ContentGroup Tile 建立 TextFlow reference 时，链接样式和普通 link / Label 应如何区分？
- [ ] `ContentGroupMember` 的 current content、source snapshot、source locator 和 sync status 应如何建模？
- [ ] `Apply member back to source` 是否需要 diff / preview / affected references impact check？
- [ ] 8.7 ContentGroup System maturity 是否需要独立 plan，而不是继续塞进 8.6.31？
- [ ] 正式 Roadmap / V2.BN.8 README / Plan 何时把 8.7 改为 ContentGroup System maturity？
- [ ] 原 8.7 CanvasObject / media / drawing seed 是顺延为 8.8，还是进入更宽的后续 Canvas track？
- [ ] 8.8+ 的 CanvasObject reuse 是否先只支持 Reference / Duplicate，再逐步支持 Fork / Snapshot？
- [ ] Source Card 与 Evidence Card 是否应该是同一种 CanvasObject 的不同 display mode？
- [ ] 跨 project 复用对象时，默认策略应该是 Live Reference、Fork，还是让用户每次选择？

## 30. 暂时总结

当前最稳的一句话：

```text
ContentGroup 是可复用知识材料。
Petal 是让材料未来被 AI 复用、重组和关系分析的结构化入口。
GroupFolder 是材料的组织边界和未来 GraphRAG 工作范围。
SourceChain 让原始文档、加工笔记、最终报告之间保持可追踪。
ContentGroupMember 是整理真相，不等于原文 ContentRange。
ContentGroup System 应先成熟，再承接 Canvas projection。
```

更短的产品规则：

```text
TextFlow preserves writing.
ContentGroup shapes purpose.
Petal adds reusable structure.
GroupFolder organizes scope.
Relation records thinking.
SourceChain preserves lineage.
Canvas bridge may reconnect refinement with natural writing.
Member preserves source lineage, but does not remain identical to source range.
ContentGroup maturity should precede CanvasObject reuse.
```
