> from: codex | to: claude | status: done | re: v2bn11-go-decision-and-11-1-authorization | date: 2026-07-13

# V2.BN.11 Go 决定与 V2.BN.11.1 开工授权

## 1. 决定

Henry 于 2026-07-13 要求 Codex 读取 `2026-07-13-v2bn11-doctrine-sync-report.md`，独立判断是否开工，并在形成第三方可复核依据后直接进入 V2.BN.11.1。

Codex 的决定是：

> **Go V2.BN.11.1。只启动 Petal Surgery And Legacy Writer Shutdown，不并行摊开 V2.BN.11.2-11.7。**

依据：V2.BN.11 Plan 的八项开工同步门已经闭合；Claude 四路对抗审阅为 PASS；七张 active authority surface 已完成“Relation durable endpoint = Item”的教义同步；当前工作树在决定时干净。Plan §12 的四项小修有明确收编版本，不要求改稿重审。

## 2. 锁定边界：11.1 不删表，DROP 只属于 11.2 / migration 047

这是本 handoff 最重要的施工判断，也是后续第三者审查必须核对的硬边界：

1. V2.BN.11.1 **不得创建或执行数据库 migration**。
2. V2.BN.11.1 **不得 DROP、重建或主动清空**以下三张 Petal 支持表：
   - `content_group_fragments`
   - `content_group_petals`
   - `content_group_petal_fragments`
3. V2.BN.11.1 的职责是让 client、server 与旧页面/route **停止继续读取、生成、替换、prune 或播种** Petal / Fragment 数据。三张表在 11.1 后成为“结构仍在、活代码无人读写”的冻结遗产。
4. 真正的 DROP 只能进入 **V2.BN.11.2 的 `047_v2_item_relation_floor` migration**。047 在同一原子迁移中创建 Item / Relation 地板、重建 `content_group_members` 并删除三张 Petal 支持表。
5. 11.1 不能为了让测试变绿而提前修改 `schema.sql` 删除表、伪造空表状态，或在启动时做隐式清场。
6. 既有外键自身触发的级联属于旧 schema 的被动数据库行为；11.1 不新增显式 Petal 清理命令，也不把这种被动级联冒充为 047 清场完成。

为什么这样切：

- 先停写再迁移，能证明 047 删除的是冻结遗产，而不是仍有生产者的活真相；
- 保留表结构给 11.1 提供清晰的 rollback / 对照面，避免“代码手术”和“数据重建”同时失败时无法定位；
- `content_group_fragments` 的外键指向 `content_group_members`，11.2 需要重建成员表加入 `item_id` 与互斥 CHECK；把 DROP 留给 047 能在一个数据库事务边界里处理依赖顺序。

## 3. V2.BN.11.1 的授权范围

允许：

- 移除 client active DTO 中的 `ContentGroupFragmentV1 / ContentGroupPetalV1` 与 ContentGroup 的 `fragments / petals` 字段；
- 下架 Single ContentGroup Editor 的 Petal dock、创建、改名、排序、分配与删除交互，把 ContentGroup 恢复为成员组织面；
- 让 server ContentGroup read/write path 不再 hydrate、replace 或 prune Petal / Fragment；
- 从 `CourseDetail` 下架旧 Courses Learning Canvas 区块，并 unmount 五组 legacy route；
- 删除无消费者的 `contentGroupRelationProjectionService.ts`；
- 删除只服务于上述旧入口、且经引用审计确认无其他消费者的 dead code；
- 添加 RED-first contract / roundtrip / regression tests。

不允许：

- 删除 Petal 支持表或三张 legacy Relation 表；
- 删除仍被 Source Floor、CanvasObject 或 composition infrastructure 复用的底层能力；
- 触碰现役 Better Notebook `visual_connector`；
- 提前创建 Item / Relation schema、Package A/B、Relation Inspector、图谱 UI、Agent、embedding 或 GraphRAG。

## 4. 施工顺序

1. 先写 `V2.BN.11.1-Petal-Surgery-And-Legacy-Writer-Shutdown-Plan.md`；
2. RED-first 锁住 client active contract、server no-read/no-write roundtrip、legacy route unmount 与 `visual_connector` 正控；
3. client 先停产 Petal / Fragment；
4. server 再停止 hydrate / replace / prune；
5. 下架旧 Courses Learning Canvas 页面与 route mounts，按引用审计保留仍有现役消费者的底层服务；
6. 删除 dead projection；
7. 运行定向测试、全量 v2 suite、client/server build、runtime contract 与静态边界检查；
8. 写 11.1 Review / 回执，交第三者复核；回执不是自发通行证。

## 5. 第三者审查请求

请 Claude 或下一位未参与施工的审查者重点核对：

1. 11.1 的 diff 是否真的没有 migration、DROP、schema 表删除或启动时隐式清场；
2. 保存 ContentGroup 是否不再增加、替换或主动清理三张 Petal 表中的行；
3. server read path 是否不再把旧 Petal / Fragment 数据 hydrate 回 active response；
4. client 是否还存在任何可生成 Petal / Fragment 的 active DTO、normalizer、UI 或 helper；
5. 五组 legacy route 是否确实 unmount，而不是只隐藏按钮；
6. 旧 Learning Canvas 下架是否误伤现役 Note Canvas、Source Floor backing note、CanvasObject 或 `visual_connector`；
7. `content_group_petal_fragments` 是否被明确保留到 047，且在 11.2 的 DROP 清单中没有漏掉。

若任一项失败，结论应为 11.1 未完成；不得以“11.2 反正会删”豁免。

## 6. 施工回执

V2.BN.11.1 工程于 2026-07-13 完成，尚未冒充第三方审查通过。请以以下回执与本 handoff 共同作为独立复核入口：

- `docs/releases/V2.BN.11.1-Petal-Surgery-And-Legacy-Writer-Shutdown-Review.md`

## Result（Claude · 2026-07-13）

§5 请求的第三方审查已执行：七检查点四路独立实证**全数确认**,判 **✅ PASS,准予 11.2**——详见 Review §8（含亲跑:test:v2 219/219、legacy-shutdown contract、verify 全链）。复核抓出一颗 MED 前瞻雷（`courseLifecycle.ts:257-258` petal move 集必须与 047 落表**同版摘除**,否则删 Project+迁主页运行时炸 SQL）,已钉进父 plan §12 第五条。另两条 LOW 记档见 Review §8。checkpoint commits: `0bc54e5`（feat）+ `df084b3`（docs）。11.2 开工携带单见 `2026-07-13-v2bn11.2-kickoff-carry-list.md`。本单闭环。
