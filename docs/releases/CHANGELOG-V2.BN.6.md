# CHANGELOG - V2.BN.6

## Added

- 新增 `docs/contracts/Source-Reconstruction-Contract-Intake.md`。
- 新增 `docs/contracts/Canvas-Page-Surface-Contract.md`。
- 新增 `docs/contracts/Source-Provenance-Contract.md`。
- 新增 `docs/contracts/Link-Source-Relation-Boundary-Contract.md`。
- 新增 `docs/contracts/Template-Category-Contract.md`。
- 新增 `docs/contracts/Editor-State-Rebuild-Contract.md`。
- 新增 `docs/internal/V2.BN.6-Truth-Layer-Audit-And-Recommendations.md`。
- 新增 V2.BN.6 engineering spec、review、experience review。
- 新增 V2.BN.7 Editor Runtime Spike Gate 中文 plan。

## Changed

- 更新 `docs/contracts/Block-Contract.md`，将其提升为 V2.BN.6 contract。
- 将 structured block conversion 改为保守字段转移，不再依赖脆弱的冒号、美元符号或脚本猜测。
- 更新 `docs/PRD.md`，对齐保守转换和更窄的第一版 structured block defaults。
- 更新 `docs/DATA_MODEL.md`，补充 TemplateVariant、TemplateCategoryMembership、EditorSnapshot、OperationBatch 和 rebuild boundaries。
- 更新 `docs/internal/Better-Notebook-Implementation-Reality-Check.md`，记录 V2.BN.6 gap mapping。
- 更新 `docs/Coincides-Better-Notebook-Roadmap.md`，加入 Canvas Engine clean branch / fallback、relation budget / CandidateRelation 说明。
- 更新 UX Inventory，补充 block control bar 和 preview/debug overlay 规则。
- 更新今晚 brainstorm note，补充 relation budget 和反 relation 噪声的 GraphRAG 思路。

## Not Changed

- V2.BN.6 contract work 没有有意修改产品代码。
- 没有新增 migration。
- 没有实现 GraphRAG adapter。
- 没有实现 source reconstruction pipeline。
- 没有启动 Canvas Engine rewrite。
