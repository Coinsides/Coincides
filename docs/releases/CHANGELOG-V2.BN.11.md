# CHANGELOG - V2.BN.11

> **状态 (Status)**: engineering complete；待第三方独立 Closure Gate 复验
> **日期 (Updated)**: 2026-07-14

## Item Identity And Relation Truth

V2.BN.11 将知识身份与 Relation 真相从旧 Petal / ObjectRelation 模型迁移到独立 Item 层，并保持 Canvas visual connector 与知识 Relation 分离。

### Added

- `items / item_snapshots / item_anchors / relations / relation_assessments` 数据脊柱；
- ContentGroup Item membership（Package B）与 Purpose direct Item membership（Package A）；
- Item create / edit / retire / successor、单 Anchor 快铸与多 Anchor 融铸；
- Purpose compiled Item scope 与用户级 Item search；
- 九个 seed Relation types、create / list / revoke / reaffirm 与双 Snapshot 判断收据；
- Relation 四态 mechanical freshness 与 latest-assessment checkpoint；
- Item Inspector 内的 active Relation 维护面；
- Project / Note / Purpose / ContentGroup / Item 生命周期 Closure Gate。

### Changed

- ContentGroup 重新定位为 Item 的组织方式；Purpose 作为情景与成员边，不拥有 Relation applicability truth；
- Petal / Fragment 精修层退役；Relation durable endpoint 统一为 Item；
- Purpose full replacement 改为 identity-preserving reconcile，普通保存不再洗掉 Relation origin receipt；
- active template relation metadata 改为 Item Relation vocabulary；
- Relation freshness 只在读取时由当前 Item hash 与判断 Snapshot hash 派生。

### Removed

- Petal / Fragment active 写路径及三张支持表；
- `object_relations / canvas_edges / relation_layers` 表；
- 未挂载的 legacy Learning Canvas Relation routes；
- `learningCanvases.ts` 中依赖退役表的 edge/layer/ObjectRelation helper 与 seed。

### Verified

- Full server V2 suite：`244/244`；
- Canvas engine model contract：60 groups；
- server/client build、Canvas performance seed、legacy shutdown contract、总 runtime gate、diff 与 secret scan：PASS；
- 26 项 V11 engineering Closure Gate 已由 Codex 建证，等待第三方独立复验。

### Deferred

- Source / Purpose / Relation / ContentGroup / Canvas 的集中浏览器体验验收；
- Relation graph、Relation Mode、GraphRAG、AI assessment 与 proposal engine；
- 自定义 RelationType、freshness background pump 与 Snapshot/assessment history UI。

