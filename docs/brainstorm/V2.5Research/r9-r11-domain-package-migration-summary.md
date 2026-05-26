# R9-R11 阶段总结 - 领域图谱、模板包、迁移治理与工程包

**Created**: 2026-05-23
**Status**: Stage summary after R9-R11
**Scope**: v2.5.3-v2.5.5 的领域扩展、模板包、迁移审阅、Package Studio Lite 与 `.coincides` 工程包理论总结

---

## 1. 来源报告与补充讨论

本总结压缩以下三份调研报告：

- `r9-domain-block-set-and-package-manifest.md`
- `r10-template-proposal-and-migration-proposal.md`
- `r11-package-studio-lite-export-import-foundation.md`

并补充报告之后讨论出的关键概念：

- `DomainBlockSet` 不应是僵硬分类树，而应是可组合领域图谱；
- `Template Coverage Check` / `Domain Fit Check` 应在 AI 生成笔记前发生；
- 领域结构必须允许早期粗糙、后期修正；
- domain key / template key 可以迁移，但 stable identity 和 provenance 必须保留；
- 迁移应分为 alias/mapping、soft migration、hard cascade migration 三档；
- package / migration / import/export 需要为未来 graph-native 重建保留证据。

---

## 2. 总体结论

R9-R11 解决的是：

```text
模板生态如何扩展？
模板变化如何治理？
模板和工作区如何打包、迁移、恢复？
```

三份报告的核心链条是：

```text
R9: DomainBlockSet + PackageManifest
  -> 让模板可以按领域成套组织和分发

R10: TemplateProposal + TemplateMigrationProposal
  -> 让模板变化和旧数据迁移可审阅、可恢复

R11: Package Studio Lite + .coincides package
  -> 让模板、source、canvas、relation、proposal 成为可分享的工程包
```

后续讨论进一步补齐了一个更大的原则：

```text
Coincides 的领域扩展系统必须允许知识结构自然生长、犯错、修正和迁移。
```

这让 Coincides 不只是“有模板”，而是开始具备一个可治理的模板生态。

---

## 3. R9 解决了什么：领域如何成套扩展

R9 的核心结论是：

```text
DomainBlockSet 是领域模板集合。
PackageManifest 是可导入、可验证、可迁移的包边界。
Package 在 v2.5 阶段必须是数据，不是插件。
```

它回答了为什么数学、医学、工程、游戏资料、调研、简报不能都靠新增底层 `system_type`。

正确做法是：

```text
stable system_type
  -> text / latex / code / media / table / source_quote

template variants
  -> definition.math / formula.ode_solution / symptom.medical / item-stat.game

DomainBlockSet
  -> academic.math / academic.medicine / game.guide / research.literature
```

底层 `system_type` 应尽量稳定。

真正增长的是：

- `TemplateDefinition`
- `CompositionTemplate`
- `DomainBlockSet`
- `PackageManifest`

这让未来 AI 总管可以在陌生领域中先判断有没有合适的模板包，而不是直接污染核心系统。

---

## 4. R10 解决了什么：变化如何安全发生

R10 的核心结论是：

```text
TemplateProposal 审阅模板定义变化。
TemplateMigrationProposal 审阅已有内容迁移。
直接编辑只适合安全描述性改动。
语义、source、relation、package、bulk migration 必须 proposal-first。
```

这很重要，因为模板一旦成为 runtime infrastructure，它就会影响：

- NoteBlock 字段；
- source requirement；
- relation behavior；
- proposal-first 规则；
- AI 选择；
- canvas display；
- package import/export；
- future graph-native migration。

因此危险变化不能走普通保存。

需要让用户或 AI 看到：

- diff；
- affected object count；
- sample before/after；
- source impact；
- relation impact；
- render impact；
- rollback/recovery metadata。

R10 让模板系统可以演化，而不是一改模板就引发全库风险。

---

## 5. R11 解决了什么：成果如何携带、分享、恢复

R11 的核心结论是：

```text
.coincides package 应该先成为可验证、可预览、可恢复的工程包契约。
Package Studio Lite 是内嵌制作/导入导出入口。
底层 package engine 应保持 headless，未来可拆。
```

它解决的是：

- 如何导出可编辑工程，而不只是 PDF/PNG/HTML；
- source 是 omit、reference、snapshot，还是 bundle original；
- Light / Trusted / Full package 如何区分；
- import 之前如何 preview；
- missing source、broken CanvasEdge、stale ObjectRelation 如何恢复；
- Package Studio Lite 如何保持高级入口，不污染日常写笔记界面。

R11 让 Coincides 逐渐具备“工程文件”能力。

---

## 6. 重要补充：DomainBlockSet 不是僵硬分类树

报告之后最重要的补充是：

```text
DomainBlockSet should be a composable domain graph, not a rigid taxonomy tree.
```

中文说法：

```text
DomainBlockSet 应该是可组合的领域图谱，不是僵硬的分类树。
```

原因是：真实知识领域不会永远待在一棵固定树里。

例如 probability 早期可能挂在：

```text
academic.math.probability
```

但随着用户深入研究，它可能逐渐成为：

```text
academic.probability
  -> probability.biology
  -> probability.psychology
  -> probability.finance
  -> probability.physics
  -> probability.medicine
```

而 `probability.biology` 又可能同时和这些领域有关：

```text
academic.math
academic.biology
research.statistics
medical.evidence
```

因此不要只设计单父级路径。

更好的方式是多维度：

```text
stable_id
domain_key
display_name
aliases
parent_domain_ids
related_domain_ids
facets
status
migration_history
```

其中：

- `stable_id` 是永久身份；
- `domain_key` 是当前推荐路径；
- `aliases` 让旧路径继续可解析；
- `parent_domain_ids` 支持多父级；
- `related_domain_ids` 支持相关领域；
- `facets` 支持应用领域、用途、难度、source policy 等维度；
- `migration_history` 记录领域结构如何演化。

---

## 7. 扩展颗粒度：不要无限层级，要多维标签和可借用关系

我们不应该让领域路径无限变长：

```text
academic.math.probability.biology.organic_biology.xxx
```

这种树会很快腐烂。

更健康的模型是：

```text
domain: probability
subdomain: biological_probability
application_domain: biology
usage: learning / research / report
level: intro / advanced / expert
source_policy: recommended / required
relation_policy: evidence_heavy / learning_logic
```

也就是说，扩展不是只往下钻树，而是在多个维度上增加描述。

这让一个模板可以同时属于多个上下文：

```text
formula.probability
  -> academic.math
  -> academic.probability
  -> biology.statistics
  -> research.evidence
```

Agent 判断时不应只问：

```text
有没有 probability.biology 这个路径？
```

而应该问：

```text
这批资料需要哪些模板能力？
现有 DomainBlockSet 覆盖哪些能力？
哪些模板可以直接用？
哪些模板需要借用？
哪些模板需要 fork？
是否需要生成 draft domain package？
```

---

## 8. Template Coverage Check / Domain Fit Check

未来 AI 生成笔记前，应该先做一个适配判断。

可以叫：

```text
Template Coverage Check
Domain Fit Check
```

它的流程是：

```text
1. 识别资料领域和用途。
2. 找到最接近的 DomainBlockSet。
3. 检查 required template roles 是否存在。
4. 检查 CompositionTemplate 是否足够。
5. 检查 source/relation/proposal behavior 是否匹配。
6. 找出 template gaps。
7. 判断是否可从相邻领域借用。
8. 判断是否需要 fork template variant。
9. 判断是否需要创建 draft domain package。
10. 生成 proposal / warning / recommendation，再进入 note proposal。
```

这让 agent 不再只是“拿现有模板硬套材料”。

它可以判断：

- 够用；
- 不够用；
- 可借用；
- 应 fork；
- 应新建；
- 应先让 Henry 审阅模板包。

这也是 DomainBlockSet 从静态包升级为智能适配层的关键。

---

## 9. 领域结构必须允许犯错和修正

个人知识库早期一定会粗糙。

AI 会判断错，人也会判断错。

系统不能假设第一次分类就是永久正确。

所以 Coincides 必须允许：

- 领域早期粗分类；
- 后期细分；
- 领域提升；
- 领域拆分；
- 领域合并；
- 模板 fork；
- 模板重新归类；
- 旧笔记 current classification 更新；
- 保留历史 provenance。

可以形成一个原则：

```text
Coincides must allow knowledge-structure correction.
```

中文：

```text
Coincides 必须允许知识结构被修正。
```

这不是给 AI 犯错开后门，而是让错误可以被吸收、审阅、修正，而不是污染系统一辈子。

---

## 10. DomainRefinementProposal

为了支持这种修正，未来需要一个概念：

```text
DomainRefinementProposal
```

它可以覆盖：

```text
promote domain
split domain
merge domain
rename domain key
deprecate domain
fork template variant
reclassify templates
reclassify existing notes
```

它和 `TemplateMigrationProposal` 类似，但处理的是领域组织层。

例如：

```text
Promote academic.math.probability -> academic.probability
Split academic.probability -> probability.biology / probability.finance
Fork formula.math -> formula.probability_biology
Reclassify some old notes from math probability to medical evidence probability
```

这类操作不能静默发生。

它需要：

- affected object count；
- before/after mapping；
- sample diff；
- confidence；
- warnings；
- alias plan；
- migration mode；
- recovery evidence；
- user/Henry acceptance。

---

## 11. 旧痕迹、当前分类与迁移历史必须分层

当领域或模板结构改变时，不能简单全库替换旧标签。

每个内容对象至少应分成三层：

```text
created_with
  -> 当时用什么 template/domain/package 创建

current_classification
  -> 现在系统推荐按什么结构理解

classification_history
  -> 发生过哪些迁移、谁批准、为什么
```

例如早期：

```text
created_with_domain = academic.math.probability
current_domain = academic.math.probability
```

后期 probability 被提升：

```text
created_with_domain = academic.math.probability
current_domain = academic.probability
classification_status = migrated
migration_id = domain-migration-001
```

普通 UI 默认显示 current classification。

Debug / history 视图显示 provenance 和 migration history。

这能避免两个极端：

- 旧数据永远留在错误分类；
- 强行全库改写导致历史不可追踪。

---

## 12. 三档迁移模式

我们讨论出的迁移模式可以分为三档。

### 12.1 Alias / Mapping

不改旧块，只建立映射。

适合大多数领域重组：

```text
academic.math.probability -> academic.probability
```

旧 block 仍保存旧路径，但系统能解析到新结构。

优点：

- 安全；
- 可恢复；
- 不污染历史；
- 适合判断性迁移。

### 12.2 Soft Migration

更新 current classification，但保留 created_with 和 migration history。

适合系统比较确定，但仍要留痕的迁移：

```text
created_with_domain = old
current_domain = new
migration_id = xxx
```

普通用户看到新分类，高级/debug 可以看到旧分类和原因。

### 12.3 Hard Cascade Migration

强一致性级联改写。

适合机械、确定、低争议的迁移：

```text
template key typo fix
field key rename
system enum rename
package namespace rename
```

它必须满足：

- 有 proposal；
- 有 dry run；
- 有 affected object count；
- 有 before/after sample diff；
- 有 lock / transaction / operation batch；
- 有 rollback 或 recovery record；
- 失败时整批停止或进入明确 recovery 状态。

Hard migration 不应成为默认。

知识分类、领域归属、模板语义判断通常应该走 alias 或 soft migration。

---

## 13. 对 v2.5.x roadmap 的影响

R9-R11 和后续讨论支持当前大致拆分，但建议增强每个版本的关注点。

### v2.5.3

Domain Block Set + Package Manifest。

应预留：

- `stable_id`；
- `domain_key`；
- aliases；
- parent/related domains；
- package identity；
- manifest compatibility；
- package as data, not plugin；
- future domain graph hints。

不一定要实现完整 DomainRefinementProposal。

### v2.5.4

Template Proposal + Migration Proposal。

应覆盖：

- template proposal；
- template migration proposal；
- direct safe edit vs proposal-required；
- operation batch；
- recovery metadata；
- basic migration modes。

可以开始记录 domain refinement 的概念，但不一定实现完整领域重组 UI。

### v2.5.5

Package Studio Lite / export-import。

应覆盖：

- Light / Trusted / Full package；
- import/export preview；
- source inclusion choices；
- broken visual/semantic binding recovery；
- package conflict detection；
- package operation batch；
- headless package engine。

### v2.5.x 后续或 v2.6

可以考虑：

- Domain Fit Check；
- Template Coverage Check；
- DomainRefinementProposal；
- broader product UX reference research；
- more advanced Package Studio。

---

## 14. Graph-Native 迁移启发

R9-R11 非常接近未来 graph-native 的边界。

可能的未来节点：

```text
(:DomainBlockSet)
(:PackageManifest)
(:TemplateProposal)
(:TemplateMigrationProposal)
(:DomainRefinementProposal)
(:PackageImport)
(:PackageExport)
(:TemplateDefinition)
(:CompositionTemplate)
```

可能的未来边：

```text
(:DomainBlockSet)-[:INCLUDES_TEMPLATE]->(:TemplateDefinition)
(:DomainBlockSet)-[:RELATED_TO]->(:DomainBlockSet)
(:DomainBlockSet)-[:BORROWS_FROM]->(:DomainBlockSet)
(:DomainBlockSet)-[:FORKED_FROM]->(:DomainBlockSet)
(:TemplateMigrationProposal)-[:AFFECTS]->(:NoteBlock)
(:DomainRefinementProposal)-[:RECLASSIFIES]->(:TemplateDefinition)
(:PackageManifest)-[:CONTAINS]->(:TemplateDefinition)
(:PackageImport)-[:CREATED]->(:OperationBatch)
```

重要判断：

- domain path 不是永久身份；
- stable id 才是身份；
- aliases 和 migration history 是兼容层；
- package import/export 是未来 graph migration 的重要边界；
- proposal history 是系统如何演化的证据。

---

## 15. 阶段结论

R9-R11 的最终结论可以压缩成一句话：

```text
Coincides 的模板生态必须可扩展、可审阅、可迁移、可打包、可修正。
```

R9 让模板生态按领域组织。

R10 让模板和旧数据变化可治理。

R11 让模板、source、canvas、relation、proposal 成为可携带工程。

后续讨论进一步明确：

```text
领域不是死目录，而是可演化的领域图谱。
模板不是静态列表，而是可以被 coverage check 和 domain fit check 调度的能力集合。
迁移不是简单全库替换，而是 alias、soft migration、hard cascade migration 的分层选择。
```

这让 v2.5 不只是模板阶段，而是 Coincides 从“个人笔记系统”走向“可扩展 AI 信息工作台”的关键基础设施阶段。

