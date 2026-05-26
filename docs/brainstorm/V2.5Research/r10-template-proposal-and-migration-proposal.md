# R10 - Template Proposal And Migration Proposal

**Created**: 2026-05-23
**Status**: Research complete for Group 4
**Scope**: v2.5.4 TemplateProposal + TemplateMigrationProposal model

---

## 1. 总览

R10 的核心问题是：

```text
当模板变成 runtime infrastructure 后，
模板修改怎样才能安全地影响已有 NoteBlocks？
```

建议方向：

- 定义 `TemplateProposal`：审阅一个新模板、模板修改、composition 修改或 domain package 修改。
- 定义 `TemplateMigrationProposal`：审阅现有 NoteBlocks 从旧模板/旧字段迁移到新模板/新字段。
- 直接安全编辑与 proposal-required migration 必须分开。
- 用户必须能看到 diff、影响范围、风险、fallback 和 rollback/recovery 记录。
- apply 必须写 operation batch，不允许静默批量改旧内容。

R10 是 v2.5 从“可编辑模板”走向“可治理模板”的关键。

---

## 2. 为什么需要 TemplateProposal

如果模板只是 UI 配置，直接保存就够了。

但在 Coincides 里，模板会影响：

- NoteBlock 的字段结构；
- source requirement；
- relation eligibility；
- proposal-first 规则；
- AI 选择和生成；
- canvas display；
- package import/export；
- future graph-native migration。

因此模板变化不能全部走普通 Save。

有些改动可以直接保存：

- label；
- description；
- help text；
- non-breaking preview notes；
- default content for future new blocks。

但有些改动必须审阅：

- 删除字段；
- 改变字段类型；
- 新增 required field；
- 改变 source requirement；
- 改变 relation behavior；
- 改变 proposal behavior；
- 批量把旧 NoteBlocks 映射到新模板；
- package import 里覆盖已有模板。

这就是 `TemplateProposal` 和 `TemplateMigrationProposal` 的边界。

---

## 3. TemplateProposal 是什么

`TemplateProposal` 是针对模板定义本身的审阅对象。

它可以表示：

```text
create_template
update_template
archive_template
restore_template
create_composition_template
update_composition_template
install_package_templates
```

它不一定改变旧 NoteBlocks。

它主要回答：

```text
这个模板定义的变化是否合理？
是否安全？
是否应该进入 active 状态？
是否会影响未来 AI/template selection？
```

---

## 4. TemplateMigrationProposal 是什么

`TemplateMigrationProposal` 是针对已有内容的审阅对象。

它表示：

```text
已有 NoteBlocks / CanvasNodes / Composition instances
是否应该从旧模板或旧字段结构迁移到新模板或新字段结构？
```

它必须包含：

- affected objects；
- before/after template；
- before/after field shape；
- source impact；
- relation impact；
- render impact；
- confidence；
- warnings；
- rollback/recovery plan。

它比 `TemplateProposal` 更危险，因为它会影响已有语义内容。

---

## 5. Direct Safe Edit vs Proposal-Required

### Direct safe edit

可以直接保存的修改：

- template label；
- description；
- UI help text；
- placeholder；
- optional default content；
- display density hint；
- non-breaking `summary_for_agent` wording；
- draft template 的编辑。

前提：

- 不影响 active existing blocks；
- 不改变字段意义；
- 不改变 source/relation/proposal enforcement；
- 不改变 template identity。

### Proposal-required edit

必须 proposal-first 的修改：

- active template 删除字段；
- 字段 kind 改变；
- optional field 改 required；
- source policy 从 optional/recommended 改 required；
- relation behavior 放宽或收紧；
- proposal behavior 放宽；
- template key/version merge；
- package import 覆盖已有模板；
- bulk migration；
- AI 建议重构模板；
- composition blueprint 改变已使用结构。

原则：

```text
直接编辑用于安全局部改动。
Proposal 用于语义、source、relation、migration、package 级改动。
```

---

## 6. 用户应该看到什么 diff

Template diff 应该包括：

```text
Identity
  -> template_key, version, origin, status

Field Schema
  -> added, removed, changed fields

Render Hints
  -> display mode / density / primary field changes

Source Behavior
  -> policy / granularity / missing source behavior changes

Relation Behavior
  -> endpoint policy / allowed relation changes

Proposal Behavior
  -> direct/proposal-required operation changes

Agent Summary
  -> use_when / avoid_when / fallback / warnings changes

Affected Objects
  -> number and examples of existing NoteBlocks / proposals / compositions

Risk Summary
  -> safe, needs review, high risk, blocked
```

Migration diff 应该显示：

- old content；
- proposed new content；
- preserved unknown fields；
- dropped fields；
- generated default fields；
- source links preserved/lost；
- relation links preserved/lost；
- canvas projection impact；
- compatibility warnings。

---

## 7. Candidate Proposal JSON

候选结构：

```json
{
  "proposal_kind": "template_migration",
  "template_proposal": {
    "operation": "migrate_existing_blocks",
    "from_template_key": "definition.basic",
    "to_template_key": "definition.medical_term",
    "template_diff": {},
    "affected_summary": {
      "note_blocks": 42,
      "source_references": 39,
      "object_relations": 8,
      "canvas_nodes": 42
    },
    "sample_diffs": [],
    "warnings": [],
    "risk_level": "medium",
    "apply_behavior": "review_required"
  }
}
```

v2.5.4 可以复用现有 `proposals` 表承载 JSON，除非 engineering spec 证明需要专门表。

---

## 8. Apply 行为

Apply 必须：

- 创建 operation batch；
- 记录 proposal id；
- 记录 affected object ids；
- 保存 before/after 快照或可恢复 diff；
- 保留 unknown fields，除非 proposal 明确删除；
- 保留 source references，除非 proposal 明确说明无法保留；
- 保留 ObjectRelations，除非 relation eligibility 不再成立并进入 warning/recovery；
- 标记 proposal applied。

Apply 不应：

- 静默删除 NoteBlocks；
- 静默删除 source references；
- 静默删除 ObjectRelations；
- 静默覆盖用户模板；
- 静默修改 package-owned template；
- 让 AI 直接绕过 proposal。

---

## 9. Rollback / Recovery

v2.5.4 不一定要做完整 rollback UI，但 proposal apply 必须留下 recovery evidence。

最低要求：

```text
operation_batch_id
proposal_id
affected_object_ids
previous_template_id/key/version
next_template_id/key/version
field_mapping
preserved_unknown_fields
warnings
status
```

未来 recovery 可以做：

- revert migration；
- reopen migration；
- compare old/new block；
- restore deprecated template；
- mark relation stale；
- repair source references。

这和 v2.2.2 recovery 思路一致：先保留可追踪记录，再逐步增强恢复 UI。

---

## 10. 与 Package Import 的关系

Package import 可能带来大量模板变化。

因此 R10 与 R11 强相关。

导入 package 时可能发生：

- 新增 template；
- 新增 composition；
- 覆盖同 key template；
- 同 key 不同 version；
- source behavior 冲突；
- relation behavior 冲突；
- package trust 不足；
- app feature 不兼容。

这些不应该直接 apply。

应先生成：

```text
PackageImportPreview
  -> TemplateProposal
  -> TemplateMigrationProposal if existing blocks affected
```

---

## 11. v2.5.4 应该实现什么

建议 v2.5.4 实现：

- `template` proposal kind；
- `template_migration` proposal kind；
- template diff generator；
- migration impact analyzer；
- affected NoteBlock summary；
- sample diff preview；
- proposal apply behavior；
- operation batch record；
- basic recovery metadata；
- tests。

v2.5.4 不应该实现：

- full visual diff editor；
- automatic AI-driven template migration without review；
- full rollback UI；
- marketplace package migration；
- graph database migration；
- executable migration scripts。

---

## 12. Test Plan Implications

自动测试应覆盖：

- direct safe edit does not create migration proposal；
- removing field from active template creates warning/proposal requirement；
- changing source behavior to required reports affected blocks without source；
- migration proposal preserves unknown content fields；
- applying proposal updates template refs only after review；
- applying migration writes operation batch；
- discard leaves templates and blocks unchanged；
- invalid proposal fails without partial writes；
- package import conflict produces proposal preview, not direct overwrite。

浏览器 smoke 可覆盖：

- edit template label directly；
- attempt risky field change；
- see migration warning；
- create migration proposal；
- preview affected blocks；
- apply or discard。

---

## 13. Graph-Native 迁移启发

未来 graph-native 中：

```text
(:TemplateProposal)
(:TemplateMigrationProposal)
(:OperationBatch)
```

可能的边：

```text
(:TemplateMigrationProposal)-[:AFFECTS]->(:NoteBlock)
(:TemplateMigrationProposal)-[:FROM_TEMPLATE]->(:TemplateDefinition)
(:TemplateMigrationProposal)-[:TO_TEMPLATE]->(:TemplateDefinition)
(:OperationBatch)-[:APPLIED_PROPOSAL]->(:TemplateMigrationProposal)
```

重要的是：migration proposal 是历史事实和审阅记录，不只是临时 UI。

v2.5 应记录：

- 哪些模板变更需要 proposal；
- 哪些 migration 被拒绝；
- 哪些 migration 被应用；
- 哪些 fields 最常造成冲突；
- source/relation 在 migration 中如何降级或保留。

---

## 14. R10 结论

R10 的结论是：

```text
TemplateProposal 审阅模板定义变化。
TemplateMigrationProposal 审阅已有内容迁移。
直接编辑只适合安全描述性改动。
语义、source、relation、package、bulk migration 必须 proposal-first。
```

这让 Coincides 的模板系统能演化，而不是一改模板就把旧笔记变成不可控风险。

