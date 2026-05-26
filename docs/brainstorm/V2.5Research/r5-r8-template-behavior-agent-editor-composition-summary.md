# R5-R8 阶段总结 - 模板行为、AI 理解、用户编辑与组合结构

**Created**: 2026-05-23
**Status**: Stage summary after R5-R8
**Scope**: v2.5.0-v2.5.2 模板系统从行为边界、AI 使用、用户编辑到组合结构的衔接结论

---

## 1. 来源报告

本总结压缩以下四份报告：

- `r5-template-source-relation-proposal-behavior.md`
- `r6-agent-facing-template-summary.md`
- `r7-user-facing-template-editor-requirements.md`
- `r8-composition-section-template-model.md`

它们共同回答一个问题：

```text
当模板从静态列表升级为 Coincides 的产品基础设施后，
模板能做什么、AI 怎么读它、人怎么编辑它、
多个模板又怎么组成可复用的 section？
```

---

## 2. 总体结论

R5-R8 把模板系统从“单个 NoteBlock 的类型说明”推进到了“可被系统、AI、人类、组合结构共同使用的 runtime contract”。

核心链条是：

```text
R5: 模板行为边界
  -> source_behavior / relation_behavior / proposal_behavior

R6: AI 理解模板
  -> summary_for_agent

R7: 用户安全编辑模板
  -> guided template editor + lifecycle + preview + compatibility warnings

R8: 多模板组成结构
  -> CompositionTemplate / section recipe / proposal-first apply
```

一句话总结：

```text
v2.5 的模板系统必须同时对系统可约束、对 AI 可读、对用户可编辑、对结构可组合。
```

如果缺 R5，模板会变成没有行为边界的 UI 配置。

如果缺 R6，AI 只能靠 hardcoded list 或 prompt vibes 选模板。

如果缺 R7，模板系统无法安全交给用户。

如果缺 R8，模板只能生成单个 block，无法形成公式表、证明链、证据表、报告段落这类高阶结构。

---

## 3. R5 解决了什么：模板能做什么，不能做什么

R5 的中心问题是：

```text
这个模板允许怎样使用 source、relation 和 proposal？
```

R5 建议在 `TemplateDefinition` 中加入三类结构化行为字段：

```text
source_behavior
relation_behavior
proposal_behavior
```

它们分别回答：

- 这个模板是否需要 source grounding？
- source reference 应该是 forbidden、allowed、recommended、required，还是 source_is_content？
- 这个模板能不能参与 ObjectRelation？
- 它适合作为 relation 的 source、target，还是两者都可以？
- 哪些 relation type 有意义？
- 哪些用户操作可以 direct edit？
- 哪些 AI / bulk / migration 操作必须 proposal-first？

R5 最重要的边界是：

```text
source_behavior 只描述 source 期待，不拥有 source truth。
relation_behavior 只描述 relation eligibility，不创建 ObjectRelation。
proposal_behavior 只描述 review 规则，不绕过 proposal-first。
```

因此：

- source truth 仍然在 `note_block_sources`、`SourceAnchor`、`SourceScope` 等表里；
- semantic relation truth 仍然在 `ObjectRelation`；
- CanvasEdge 仍然只是 visual/projection connector；
- AI 不能因为模板允许某种行为就直接静默改写语义内容。

R5 对 v2.5.0 的影响：

- `template_definitions` 需要保存行为 JSON。
- seed templates 必须有初始 source/relation/proposal behavior。
- compatibility report 要能发现缺失或危险行为。
- proposal creation helper 要能读取模板行为。
- v2.5.0 不做自动 relation extraction，不做完整 source/relation editor，不自动迁移旧块。

---

## 4. R6 解决了什么：AI 怎么读模板

R6 的中心是：

```text
AI 不应该靠硬编码列表或 prompt vibes 选择模板。
```

每个 runtime `TemplateDefinition` 都应该有结构化的：

```text
summary_for_agent
```

它告诉 AI：

- 什么时候该用这个模板；
- 什么时候不该用；
- 应该填哪些字段；
- 需要什么 source evidence；
- 可以建议哪些 relation；
- 哪些操作必须 proposal-first；
- 不确定时如何 fallback；
- 这个模板有什么视觉风险或导出风险。

R6 的关键价值是把模板变成 AI 可读的“稳定说明书”。

这让 AI 从：

```text
我大概知道有 definition / formula / example
```

变成：

```text
我知道 definition.basic 什么时候能用，
什么时候不能用，
缺 source 时要不要 warning，
它能不能成为 uses_definition 的 target，
不确定时应该 fallback 到 text.paragraph。
```

R6 对 v2.5.0 的影响：

- `summary_for_agent` 应进入 `template_definitions`。
- seed templates 必须有最小 agent summary。
- organized note / future AI command 应该从 runtime template catalog 读取模板说明。
- AI 可以建议内容、关系、布局，但不能绕过 R5 定义的 proposal-first 边界。

---

## 5. R7 解决了什么：用户怎么安全编辑模板

R7 的中心是：

```text
用户需要模板编辑器，但不能一上来暴露完整底层引擎。
```

v2.5.1 的模板编辑器应该是 guided editor，而不是 raw JSON editor。

最小可用版本应该包括：

- template library；
- template detail；
- copy-from-existing；
- field editor lite；
- render intent editor lite；
- source/relation policy presets；
- agent summary editor lite；
- reading / editing / debug / proposal preview；
- compatibility warnings；
- draft / active / deprecated / archived 生命周期。

R7 的核心边界：

```text
用户可以编辑 template variant。
Coincides 继续拥有底层 engine boundary。
```

因此：

- `system_type` 暂时仍然系统所有；
- 用户主要在 fixed system types 下面编辑 template variants；
- system templates 应该 copy-first；
- 会影响旧 NoteBlocks 的结构性修改必须显示 compatibility warning；
- 必要时进入 `TemplateProposal` 或 `TemplateMigrationProposal`。

R7 对 v2.5.1 的影响：

- v2.5.1 应做 Template Editor Seed。
- 不做完整模板 IDE。
- 不做 arbitrary low-level block type creation。
- 不做自动旧块迁移。
- 不做 full package marketplace。

---

## 6. R8 解决了什么：多个模板怎么组成 section

R8 的中心是：

```text
CompositionTemplate 不是更大的单个 block template，
而是多个对象协同工作的 section recipe。
```

`TemplateDefinition` 定义一个 NoteBlock。

`CompositionTemplate` 定义一组结构：

- slots；
- 每个 slot 可用哪些 TemplateDefinition；
- slot 是否 required / optional / repeatable；
- layout_behavior；
- relation_blueprint；
- source_behavior；
- proposal_behavior；
- summary_for_agent。

它适合表达：

- formula sheet；
- theorem-proof-example cluster；
- source quote + interpretation；
- evidence comparison section；
- briefing section；
- side-note cluster。

R8 最重要的产品意义是：它让 Coincides 从 block note editor 走向 structured information workspace。

R8 对 v2.5.2 的影响：

- v2.5.2 可以建立 `CompositionTemplate` runtime contract。
- composition 默认 proposal-first。
- apply 后可以创建 NoteBlocks、CanvasNodes、CanvasFrames、source references、suggested relations。
- relation blueprint 只是设计意图，不是 graph truth。
- confirmed `ObjectRelation` 仍然需要用户确认或明确 apply。

---

## 7. 四者之间的关系

R5-R8 是一条完整递进链：

```text
R5: Template behavior
  -> 系统知道模板允许什么、禁止什么、什么时候必须 review

R6: Agent summary
  -> AI 知道模板什么时候用、怎么填、怎么 fallback

R7: User editor
  -> 用户能安全复制、编辑、预览、激活、归档模板

R8: Composition template
  -> 多个模板能组成可复用 section，并通过 proposal-first 落地
```

完整结构可以理解为：

```text
TemplateDefinition
  -> field_schema
  -> render_hints
  -> source_behavior
  -> relation_behavior
  -> proposal_behavior
  -> summary_for_agent

User-facing Template Editor
  -> edits safe parts of TemplateDefinition
  -> previews impact
  -> warns about compatibility

CompositionTemplate
  -> references TemplateDefinition slots
  -> proposes multi-block structures
  -> maps to CanvasNodes / CanvasFrames
  -> may suggest ObjectRelations
```

---

## 8. 对 roadmap 的直接影响

R5-R8 支持当前 v2.5 拆分：

```text
v2.5.0
  -> Template Definition Runtime
  -> 必须包含 source_behavior / relation_behavior / proposal_behavior
  -> 必须包含 summary_for_agent
  -> 不做完整用户模板编辑器

v2.5.1
  -> User-facing Template Editor Seed
  -> guided editor
  -> draft/active/archive lifecycle
  -> preview + compatibility warning

v2.5.2
  -> Composition / Section Template Seed
  -> slot schema
  -> layout behavior
  -> source/relation blueprint
  -> proposal-first composition preview/apply
```

不要把 v2.5.1 和 v2.5.2 的东西塞进 v2.5.0。

v2.5.0 的职责是先把 runtime 地基打稳：

- persistent `template_definitions`；
- seed import；
- resolver；
- compatibility report；
- field schema；
- render hints；
- source/relation/proposal behavior；
- summary_for_agent。

---

## 9. 已经确定的原则

### 9.1 模板不是代码

模板可以指导 AI、UI 和 proposal，但不应该成为隐藏执行逻辑。

### 9.2 行为字段是约束，不是真相存储

`source_behavior` 不存 source truth。

`relation_behavior` 不存 semantic relation truth。

`proposal_behavior` 不代表自动授权 mutation。

### 9.3 用户编辑的是变体，不是底层系统类型

普通用户可以改 template variant，不直接创造新的 low-level system type。

### 9.4 AI 使用模板必须可解释

AI 选择模板时应该能解释：

- 为什么选；
- 为什么不选其他模板；
- source 是否足够；
- confidence 是多少；
- 有哪些 warnings。

### 9.5 Composition 必须 proposal-first

只要 composition 会创建或重排语义内容，就不能静默修改。

### 9.6 Relation blueprint 不是语义真相

composition 可以建议 relation，但 confirmed `ObjectRelation` 仍然需要 review/apply。

### 9.7 Preview 是模板系统的核心能力

模板编辑和 composition 编辑都必须能预览，否则用户无法判断改动是否安全、可读、可用。

### 9.8 底层引擎应独立，产品界面先内嵌

模板能力应该分成三层：

```text
Coincides 主应用
  -> 日常使用模板、生成笔记、查看 canvas、审阅 proposal

内嵌 Template / Package Studio
  -> 高级用户或 agent 制作模板、composition、domain package

底层 Template Runtime Engine
  -> 独立、可测试、可导入导出、可被主应用和未来外部制作工具调用
```

短期不需要把 Template Studio 做成独立 app，但底层 engine 不能和 Coincides 页面 UI 缠死。

这样做的原因是：用户日常使用的 Coincides 应该保持干净。普通用户不应该在写笔记、读 canvas、审 source 的时候被大量模板制作、字段定义、source policy、relation blueprint、package manifest 的复杂操作打扰。

但制作能力又必须足够强。未来当用户或 AI 总管进入一个新领域，例如医学、生物、有机化学、工程或游戏资料整理时，默认数学倾向模板可能不够用。这个时候系统需要能：

- 判断现有模板库是否覆盖该领域；
- 研究这个领域的常见笔记结构；
- 新建或调整 domain templates；
- 制作 composition templates；
- 打包成 domain block set；
- 导入主应用后再用于 source extraction、note generation、canvas layout 和 proposal review。

这更像一个制作台，而不是普通阅读/写作界面的一部分。

因此 v2.5 的策略应该是：

```text
先内嵌 Studio，后保留可拆分能力。
```

也就是说，v2.5 可以在 Coincides 内做一个高级入口，例如 `Template Studio` 或 `Package Studio Lite`。但它调用的底层 runtime、校验、preview、proposal、package import/export 能力都应保持 headless，未来可以自然拆成独立工具，而不需要重写核心逻辑。

这能同时满足：

- 主应用清爽；
- 制作能力强；
- 模板生态可扩展；
- agent 可参与模板生产；
- 未来社区模板库或素材库可以接入；
- v3.x graph-native 迁移时不会被 UI 结构绑死。

---

## 10. 还没有完全解决的问题

R5-R8 还没有最终回答这些问题：

- `source_behavior`、`relation_behavior`、`proposal_behavior` 的最小字段是否会过大？
- `summary_for_agent` 的最小字段是否会过大？
- 模板编辑器第一版 UI 应该是页面、drawer、modal，还是 canvas-adjacent inspector？
- 内嵌 Template / Package Studio 的入口、权限和 UI 层级应该怎样设计，才不会污染主应用日常使用路径？
- 底层 headless Template Runtime Engine 需要暴露哪些稳定接口，才能支持未来独立制作工具？
- 用户修改 source/relation presets 时，什么程度算安全直接保存？
- `CompositionTemplate` 是否需要独立表，还是先用 proposals / JSON contract 过渡？
- composition apply 后是否应创建 `CompositionInstance`？
- relation blueprint 如何与 v2.4.4 `RelationLayer` 最终对齐？
- template editor 和 package import/export 的权限边界如何设计？

这些问题应交给 R9-R11、后续 UX reference research，以及具体 v2.5.1/v2.5.2 plan 继续收束。

---

## 11. Graph-Native 迁移启发

R5-R8 对 v3.x Neo4j / graph-native 迁移很重要。

可能的未来节点：

```text
(:TemplateDefinition)
(:CompositionTemplate)
(:CompositionInstance)
(:NoteBlock)
(:RelationType)
```

可能的未来边：

```text
(:NoteBlock)-[:USES_TEMPLATE]->(:TemplateDefinition)
(:CompositionTemplate)-[:USES_TEMPLATE]->(:TemplateDefinition)
(:CompositionInstance)-[:HAS_SLOT]->(:NoteBlock)
(:AgentOperation)-[:USED_TEMPLATE_GUIDANCE]->(:TemplateDefinition)
(:TemplateDefinition)-[:ALLOWS_RELATION_TYPE]->(:RelationType)
```

但要注意：

- `summary_for_agent` 不是 graph truth；
- `render_hints` 不是 graph truth；
- `source_behavior` 和 `relation_behavior` 是 policy/eligibility，不是已发生事实；
- `relation_blueprint` 不是 confirmed edge；
- confirmed `ObjectRelation` 才是更接近 graph edge 的候选。

v2.5 应继续记录：

- 哪些模板最常被 AI 使用；
- 哪些模板被用户修改；
- 哪些模板修改需要 proposal；
- 哪些模板产生 source-backed blocks；
- 哪些模板参与 accepted ObjectRelations；
- 哪些 composition slot 被填充或跳过；
- 哪些 suggested relations 最终变成 confirmed ObjectRelations。

这些会帮助 v3.x 判断哪些对象应该成为 graph node，哪些关系应该成为 graph edge。

---

## 12. 下一步

R5-R8 之后，下一组研究应该进入：

```text
R9: Domain Block Set And Package Manifest
R10: Template Proposal And Migration Proposal
R11: Package Studio Lite / Export-Import Foundation
```

这组三个报告要解决：

- 模板如何打包；
- 不同领域的 block set 如何组织；
- 用户/系统/包之间的模板身份如何管理；
- 模板修改和迁移如何 proposal-first；
- 工程文件、分享、导入导出如何承接模板生态；
- 内嵌 Template / Package Studio 如何调用独立底层 engine；
- 未来如果拆出独立制作工具，需要哪些 package、preview、validation 和 import/export 边界。

---

## 13. 阶段结论

R5-R8 的最终结论可以压缩成一句话：

```text
v2.5 的模板系统必须同时有行为边界、AI 说明书、用户编辑器、组合结构。
```

如果只做行为字段，它会变成后台配置。

如果只做 AI 可读，它会变成 prompt 辅助材料。

如果只做用户可编辑，它会变成脆弱的表单编辑器。

如果只做 composition，它会缺少单块模板和行为边界的稳定基础。

四者合起来，Coincides 才会拥有真正可扩展的 template engine。
