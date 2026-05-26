# R9 - Domain Block Set And Package Manifest

**Created**: 2026-05-23
**Status**: Research complete for Group 4
**Scope**: v2.5.3 Domain Block Set + Package Manifest model

---

## 1. 总览

R9 的核心问题是：

```text
当 Coincides 需要支持医学、数学、工程、法律、游戏资料、情报整理等不同领域时，
这些模板、composition、样式、source/relation 行为应该怎样打包？
```

建议方向：

- 建立 `DomainBlockSet` 作为领域模板集合。
- 建立 `PackageManifest` 作为可导入、可验证、可迁移的包描述。
- v2.5.3 先做 schema-first 的 package model，不做 marketplace。
- 包可以包含模板、composition templates、render/style hints、source behavior、relation behavior、proposal behavior、agent summaries。
- 包不能在 v2.5 阶段变成可执行插件。

这个方向直接服务于 Henry 提到的场景：当未来 AI 总管要帮用户学习一个陌生领域，例如医学，而现有数学模板不够用时，系统应该能制作或导入一个医学领域包，再用它生成更适合医学材料的笔记和 canvas 结构。

---

## 2. 为什么需要 Domain Block Set

单个模板解决的是：

```text
一个 block 应该长什么样、包含什么字段、能参与什么行为。
```

Domain Block Set 解决的是：

```text
某个领域通常需要哪些模板、composition、关系类型、source 习惯和 AI 选择规则。
```

例如：

数学领域可能需要：

- theorem；
- proof；
- formula；
- worked example；
- exercise；
- answer；
- formula sheet；
- theorem-proof-example cluster。

医学领域可能需要：

- anatomy term；
- symptom；
- diagnosis criterion；
- treatment plan；
- contraindication；
- case note；
- evidence grade；
- drug interaction table。

游戏资料领域可能需要：

- item stat；
- character build；
- quest step；
- mechanic explanation；
- resource route；
- boss pattern；
- patch note comparison。

这些不应该全都做成底层 system type。它们应该是固定 system types 下面的 domain-specific template variants 和 composition templates。

---

## 3. Domain Block Set 的边界

`DomainBlockSet` 不是数据库迁移脚本，不是插件，不是模型 provider，不是 UI theme。

它是一个领域配置集合。

它可以包含：

```text
TemplateDefinition refs or definitions
CompositionTemplate refs or definitions
Style/render hint presets
Relation behavior presets
Source behavior presets
Proposal behavior presets
Agent summary guidance
Example materials
Compatibility requirements
Recommended views
```

它不应该包含：

```text
arbitrary executable code
database mutation scripts
unreviewed AI prompts that can mutate data
provider API keys
private user source files by default
unsafe external network calls
```

这能保证 Domain Block Set 是安全可导入的产品资产，而不是插件系统。

---

## 4. 不同领域包的差异

### Learning Set

面向学习笔记。

常见对象：

- concept；
- definition；
- theorem；
- formula；
- proof；
- example；
- exercise；
- answer；
- review summary。

重点：

- 学习角色清晰；
- source grounding 推荐；
- relation layer 偏学习逻辑；
- composition 偏知识结构。

### Research Set

面向调研和文献整理。

常见对象：

- research question；
- source claim；
- evidence quote；
- counterpoint；
- method note；
- literature summary；
- unresolved question。

重点：

- source required 或 recommended；
- evidence comparison；
- contradiction / supports relation；
- source trust / provenance。

### Briefing Set

面向快报、简报、报告。

常见对象：

- headline；
- key finding；
- implication；
- timeline item；
- risk；
- recommendation；
- source appendix。

重点：

- composition template 很重要；
- export/view behavior 很重要；
- source 可以隐藏在引用层，但必须可追溯。

### Evidence / Investigation Set

面向证据板、线索图、事件分析。

常见对象：

- claim；
- evidence；
- suspect/entity；
- timeline event；
- contradiction；
- location；
- missing link。

重点：

- ObjectRelation 和 RelationLayer 很重要；
- graph-native 未来价值高；
- source and recovery 必须强。

### Game Guide Set

面向游戏资料整理。

常见对象：

- item；
- build；
- route；
- quest；
- mechanic；
- enemy；
- patch change；
- comparison table。

重点：

- 表格和 composition 很重要；
- source 可能来自网页快照或游戏数据库；
- 更新和版本对比很重要。

---

## 5. PackageManifest 的职责

`PackageManifest` 是导入、导出、校验、预览和迁移的入口。

它应该回答：

```text
这个包是谁做的？
它包含什么？
它需要哪些 Coincides 功能？
它适用于什么版本？
它信任级别如何？
它会新增哪些模板、composition、domain sets？
它是否包含 source snapshots 或只包含引用？
导入后哪些对象可能降级？
```

推荐 manifest 分类：

```text
identity
author
version
compatibility
contents
dependencies
trust
license
source_policy
import_policy
export_policy
graph_migration_hints
metadata
```

---

## 6. Candidate PackageManifest Shape

候选 JSON 结构：

```json
{
  "manifest_version": "v2.5.3",
  "package_id": "domain.learning.math.calculus.basic",
  "package_name": "Calculus Learning Templates",
  "package_kind": "domain_block_set",
  "version": "0.1.0",
  "author": {
    "name": "Coincides",
    "homepage": null
  },
  "compatibility": {
    "min_app_version": "2.5.3",
    "requires_features": [
      "template_definitions",
      "composition_templates",
      "source_behavior",
      "relation_behavior"
    ]
  },
  "contents": {
    "domain_block_sets": [],
    "template_definitions": [],
    "composition_templates": [],
    "style_packs": [],
    "relation_presets": []
  },
  "trust": {
    "level": "local_untrusted",
    "contains_executable_code": false,
    "contains_private_sources": false
  },
  "license": {
    "type": "personal",
    "text": null
  },
  "import_policy": {
    "default_mode": "preview_required",
    "allow_overwrite": false,
    "namespace_strategy": "preserve_with_conflict_suffix"
  },
  "metadata": {}
}
```

v2.5.3 不需要把这个结构一次做满，但 plan 应该围绕这个方向收束。

---

## 7. Package Trust Levels

建议定义包信任层级：

```text
local_untrusted
local_trusted
system_seed
user_owned
community_unverified
community_verified
```

v2.5 阶段不做社区 marketplace，但应该预留 trust 字段。

初始规则：

- system seed package 可以自动安装；
- user-owned package 可以导入但需要 preview；
- unknown package 必须 preview；
- executable code 一律不允许；
- provider key 不允许进 package；
- private sources 默认不打包，除非用户明确选择。

---

## 8. Package 内容对象

一个 package 可以包含：

### TemplateDefinition

单个 block 的模板。

### CompositionTemplate

多个 block / frame / relation / source 行为组成的 section recipe。

### DomainBlockSet

领域级集合，引用一组 templates 和 compositions。

### StylePack

未来可以存在，但 v2.5.3 不必实现完整样式系统。

### RelationPreset

某个领域常用 relation type / layer / direction 的组合。

### SourcePolicyPreset

例如医学包可能默认 source required，游戏包可能默认 source recommended。

### AgentGuidance

领域级 agent summary，告诉 AI 该领域如何选择模板和 composition。

---

## 9. Package 不应太早变成插件

R9 的重要结论：

```text
Package is data, not executable plugin.
```

原因：

- 插件会引入安全边界；
- 插件会污染主应用稳定性；
- 插件会让 package import/export 难以验证；
- 插件会让未来 graph-native 迁移复杂化；
- 当前 v2.5 的目标是模板生态，不是扩展运行时生态。

因此 v2.5.3 的 package 只应该包含 schema-defined data。

如果未来需要插件，应该在 package safety、permission、sandbox、review 机制成熟之后再考虑。

---

## 10. Domain Block Set 与 AI 总管

Henry 提到的医学学习场景可以变成标准流程：

```text
用户想学习医学材料
  -> AI 检查现有 DomainBlockSet
  -> 发现数学模板不适合医学材料
  -> AI 建议创建或导入 medical domain package
  -> Template / Package Studio 生成 draft package
  -> 用户审阅
  -> package 安装到 Coincides
  -> 后续 source extraction / note generation / canvas layout 使用医学模板
```

这里 AI 不应该直接随手生成一堆模板并污染系统。

它应该通过：

- draft package；
- preview；
- validation；
- compatibility report；
- user acceptance。

这让模板生态可控，也让以后社区模板库成为可能。

---

## 11. v2.5.3 应该实现什么

建议 v2.5.3 实现：

- `DomainBlockSet` conceptual/runtime schema；
- `PackageManifest` schema；
- package validation helper；
- seed domain package；
- package preview contract；
- package identity / version / compatibility fields；
- package content summary；
- no-executable-code rule；
- graph-native hints fields；
- docs and tests。

v2.5.3 不应该实现：

- marketplace；
- remote package registry；
- executable plugins；
- paid package/license enforcement；
- full visual StylePack editor；
- automatic domain research agent；
- automatic installation without preview；
- full `.coincides` project export。

---

## 12. Test Plan Implications

自动测试应覆盖：

- valid package manifest passes validation；
- missing required identity fields fails；
- incompatible app version warns or blocks；
- executable code flag blocks import；
- package can list template definitions；
- package can list composition templates；
- package can list domain block sets；
- duplicate template keys generate conflict warnings；
- import preview does not mutate runtime tables；
- seed package can be loaded idempotently。

文档检查应覆盖：

- package 不是插件；
- package import 必须 preview；
- private source 默认不包含；
- provider keys 不允许进入 package。

---

## 13. Graph-Native 迁移启发

未来 graph-native 里，package 可能成为：

```text
(:PackageManifest)
(:DomainBlockSet)
(:TemplateDefinition)
(:CompositionTemplate)
```

可能的边：

```text
(:PackageManifest)-[:CONTAINS]->(:TemplateDefinition)
(:DomainBlockSet)-[:INCLUDES_TEMPLATE]->(:TemplateDefinition)
(:DomainBlockSet)-[:INCLUDES_COMPOSITION]->(:CompositionTemplate)
(:TemplateDefinition)-[:BELONGS_TO_DOMAIN]->(:DomainBlockSet)
```

v2.5 应记录：

- 哪些 package 被导入；
- 哪些 template 来自哪个 package；
- 哪些 user template 是从 package template 派生；
- 哪些 package import 出现冲突；
- 哪些 domain block set 被 AI 实际使用。

---

## 14. R9 结论

R9 的结论是：

```text
DomainBlockSet 是领域模板集合。
PackageManifest 是可导入、可验证、可迁移的包边界。
Package 在 v2.5 阶段必须是数据，不是插件。
```

这让 Coincides 能从“内置模板工具”走向“可扩展模板生态”，同时不把主应用变成混乱的制作平台。

