> **状态 (Status)**: 第二轮保留 HQ 已收最小修并执行全量回归；整单验收以第二轮记录为准，清债留 HQ
> **日期**: 2026-09-20
> **来源**: `docs/agent-ops/handoffs/2026-09-20-v14-d4-three-smalls-order.md` §一
> **边界**: 本文仅记录 builder 子任务①的实测；清债与放行权留 HQ。

# castItem 出生即入包核查

## 结论与 specimen

修前为断路：隔离 `initDb(':memory:')` 经现役迁移建库，创建合成用户、项目、笔记、块、ContentGroup，采集一枚 Anchor 后调用真实 `castItem`。Item 和 Snapshot 已生成，Anchor 已认领（`item_id` 指向新 Item，`pool_scope_kind/pool_scope_id` 已清空），但 `content_group_members` 按包与 Item 查询为零行，`getContentGroup(...).members` 同为零。未接触用户库。

- 取证脚本：`.codex-tmp/d4-smalls/cast-specimen.mts`。
- 修前原始日志：`.codex-tmp/d4-smalls/cast-specimen-before.log:90`，成员零行见第 93 行，断言 PASS 见第 249 行。
- 修后原始日志：`.codex-tmp/d4-smalls/cast-specimen-after.log:90`，成员实体行见第 93 行；新 Item `24450c63-27ac-425e-9d49-e48e3435ad14` 恰有一行所属包成员，hydration 同样返回该 Item，断言 PASS 见第 285 行。

两次命令均在 `server/` 下执行，退出码均为 0：

```powershell
node --import tsx ../.codex-tmp/d4-smalls/cast-specimen.mts before
node --import tsx ../.codex-tmp/d4-smalls/cast-specimen.mts after
```

## 最小修与字段语义

`server/src/services/items.ts:741` 的现役 `castItem` 已有事务，修法仅在该事务内于认领 Anchor 后插入所属包的成员行，写点 `items.ts:795`；原有 `after_anchor_claim` fault hook 位于成员插入后（第 808 行），可证明整组写入共同回滚。

字段对齐 `server/src/services/contentGroups.ts:284` 的现役成员值转换与成员表约束：

| 字段 | 本次写入与理由 |
| --- | --- |
| `id` | `content-group-member-${uuid}`，沿用现役成员 ID 前缀 |
| `user_id/content_group_id/course_id/note_id` | 当前用户与 Anchor 原所属 ContentGroup 的现役归属字段 |
| `kind/item_id/target_id` | `item` / 新 Item ID / `NULL`，符合 Item 成员约束 |
| `source_sync_status` | `fresh`，沿用缺省成员状态 |
| `order_index` | 该用户该包 `MAX(order_index)+1`，空包从 0 开始；不重写旧成员 |
| `metadata` | `{}` |
| `created_at/updated_at` | 与本次 Anchor claim 使用同一个 `now` |
| 其余可空字段 | 保留现役 `NULL` 默认值，不复制 Item 内容成为第二真相 |

现役成员表没有独立 `role` 列；本次角色/种类取 `kind='item'`，不自造 role 或 metadata 角色词表。没有新表、新列、新依赖，也没有修改 ContentGroup service、Relation、TextFlow、工具面或 prompt。

## 定向回归

`server/src/__tests__/v2Items.test.ts:284` 新增「出生即入包」回归：包中保留原成员，两个 Anchor 的融合 cast 只追加一个 Item 成员，实际实体行验证用户、包、项目、笔记、kind、Item 引用、空 target、fresh、尾序和 metadata。`v2Items.test.ts:329` 扩既有故障回滚测试：在 `after_anchor_claim` 检查成员已写入，故障后确认成员数量、Item、Snapshot 与 Anchor 均回滚。

```powershell
node ../scripts/run-server-test-suite.mjs --test-timeout=600000 src/__tests__/v2Items.test.ts src/__tests__/v2ContentGroups.test.ts
```

结果：**20 tests / 20 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo / 0 flaky retries**，退出码 0。原始日志 `.codex-tmp/d4-smalls/cast-targeted.log:1757`。文件预算 600000ms。

## 停线与未做

在以上局部修改与定向测试完成后，主 builder 通报③的工单条件与原始 live 标本存在矛盾：工单要求「本轮成功检索/记忆命中」且原标本转为零红旗，而原标本第 3 轮无 `search_memories`，相关记忆 `last_accessed` 仍为 `NULL`。依工单「冲突停线举证」停止新增实现与测试；具体③矛盾证据以主 builder 工单 `## Result` 为准。

**整单未完成、未验收，不申报已清。** ①代码与回归保留在工作树交 HQ；agent 族、client 全库、server 全量补集（含 `v13WildernessExecute`）及非 git/secrets 验证门在停线时未由本子任务执行。未做 git 写操作、commit、push、PR、merge、真实模型调用或用户库写入。会议待办等共享台账由主 builder 汇总，子任务未改。

## 第二轮（2026-09-20）

HQ 补遗一已收下①现有最小修；本轮保留 `items.ts` 与 `v2Items.test.ts` 原有工作树改动，没有再改该实现。它们已进入按 `--test-timeout=600000` 执行的 server 109 文件全量集合，castItem / ContentGroup 对应断言没有失败；整批结果与环境阻塞如实记在 [第二轮验收](verification-r2.md)，不把本项通过写成全库通过。

已按工单台账义务在 09-16 会议原卷末追加「§三点九出生即入包待办实况」，原会议判断与历史文本保留，不自标已清。没有执行 git 写操作；代码留当前工作树交 HQ。
