> from: claude | to: codex | status: draft | re: v2bn11-plan-commission | date: 2026-07-12

# V2.BN.11 Plan 委托单

## 目的

概念设计已达 **v1.1**,§6 判断点 a–k 全部由 Henry 拍定,设计侧闭环。请你按 V10 模式撰写 `docs/releases/V2.BN.11-plan.md`——切法与工程细节归你,本单只钉边界与必含项。

## 输入(按序读)

1. `docs/agent-ops/analysis/relation-item-graph-concept-design.md`(**v1.1**,模型权威;§6 拍板记录全清)
2. `docs/agent-ops/handoffs/2026-07-12-v2bn11-codex-design-reflection-third-party-review.md` Result(你的五项工程加硬的修正版收编:M1–M5;三桩 H1–H3)
3. `docs/agent-ops/analysis/dissent-register.md`(D-002/D-003 与你直接相关;D-003 给你留了重开权)
4. 你自己的八批复述记录(07-12 会议卷)——§九 五项、§B 四问的裁决线已折入设计 v1.1

## Plan 必含项(不重复设计稿,只列硬约束)

1. **开工同步门**(沿 V10 plan v3 先例):列出施工前置事实清单,含——047 迁移号、复合 FK 为库内首例(**迁移必须带行为断言测试**,SQLite 复合 FK 行为如与预期不符,走 D-003 重开)、包 C(花瓣手术)先行的顺序红利(034 花瓣表 FK 指向 content_group_members,先手术后重建加 CHECK 更便宜)。
2. **原子触点包纪律**(设计 §7):包 A(member_kind='item',~7 触点 client+server 同版)/包 B(item_id,5 触点+互斥 CHECK)/包 C(花瓣手术,§5 顺序)。两条持久化路径皆客户端权威全量替换——部分上线会绞杀,plan 的分段必须尊重包边界。
3. **地板三桩**(设计 §3):relation_assessments 表随 047;机械新鲜度随 read model;最小认领入口(存在性必达,形态从简,精修归实测)。判定模型(本地小模型)明确不在本版。
4. **重申协议**:单事务(两端快照 upsert+双指针+affirmed_at);assessment 无失效旗(派生工单公式自然盖过)。
5. **用户可见行为变化必须写明**:删 Project 不再抹掉生于它的知识(卡/关系 origin SET NULL 存活)。
6. **生命周期注册表登记**(V10 §4.5 既成机制):items=preserve(origin SET NULL);item_snapshots/item_anchors/relations/relation_assessments=user-scoped 无 course 列——契约测试会抓漏登。
7. **遗产清场**(设计 §5,判断点 c 已拍):三表落表+legacy 学习画布页整体下架(路由/页面/服务/播种器)+顺手清尸 contentGroupRelationProjectionService;**只删表不下架端点会复活或崩页**。
8. **RED-first 与收口**:沿 V10 纪律(先 RED 后实现、test:v2 全绿、回执不自发通行证);浏览器体验门按既定决定并入 Relation 后的联动磨合期,工程门照常机器验证。

## 边界

- 明确不做(设计 §0):图谱 UI/微观射线界面、GraphRAG/embedding、RelationProposal 机器、血统面板、情景方向、出版/版次。
- 交互层一律 ⚠️实测(设计 §4);V11 读取面只到 inspector 列表级(判断点 e)。
- 契约同步(Link-Source-Relation-Boundary-Contract 更新、老 Relation 设计文档 superseded-in-part、06-28 端点教义替换)归 Claude 随版,plan 里留一行提及即可,不算你的交付。

## 交付

`docs/releases/V2.BN.11-plan.md`(status: draft)→ Henry 翻牌后按你的分段开工。对 v1.1 折入的任何修正有异议:小的记 plan 偏离声明,大的走 dissent-register 或 handoff 提回。
