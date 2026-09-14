> **状态 (Status)**: complete（builder 定向施工证据，非 HQ 放行）
> **日期**: 2026-09-14
> **范围**: 窄词表红旗观测与 events 词表扩容；仅蒸馏证据

# Claim 观测事件

`server/src/agent/claimObservation.ts:23` 接收本次 run 的已落库消息与同一份 `AgentTurnReceipt`。仅在 `write_ok_count === 0`（`:30`）且本轮 assistant 文本命中时，一次调用追加一条 `claim_without_receipt`，不按词数或消息数增加事件条数。`message_id` 指向第一条实际命中消息；多个命中消息附 `message_ids`。user/tool 文字不进入匹配。

词表全文（`:6`、`:9`，中英各 7 项）：

- 中文：`已保存`、`已创建`、`已记住`、`已记录`、`已更新`、`已删除`、`已完成`。
- 英文：`saved`、`created`、`remembered`、`recorded`、`updated`、`deleted`、`completed`。

中文是字面子串匹配，英文为不区分大小写的单词边界匹配（`:13`）。重复命中去重；不分析否定、引用或真实语义，允许词表误报。词表只影响计数，不改写文本、不注入提示、不阻断回复。

事件写入（`:40`）使用现有 `recordEvent`，由观察器开启事务，`actor_kind=system`、`channel=chat`。`meta`（`:50`）形状：`{conversation_id:string,message_id:string,matched_terms:string[],message_ids?:string[]}`；`objects` 指向会话与命中消息；固定 summary 不复制回复正文。台账写入失败时仅输出固定告警码（`:60`），不输出正文、标识符或数据库错误细节，并允许回复继续。

## 数据库边界

`server/src/db/recordEvent.ts:29` 只增加观测事件 verb。`server/src/db/migrations/076_v14_claim_without_receipt_event.ts:6` 按 073/074 的迁移模式扩 events 的封闭 CHECK（`:28`）。重建所需中间表随后改回原名，最终持久表数及列数均不变；无新工具写动词、无注册表/写门/075 仪式机件修改。历史行原样复制（`:34`），两索引与两 append-only trigger 恢复（`:40`、`:42`、`:46`），AUTOINCREMENT 高水位保全（`:51`）。不执行用户库。

## 定向验证

最终命令在 `server/` 执行：`node --import tsx --test src/__tests__/v14ClaimObservation.test.ts src/__tests__/v13EventsLedger.test.ts`。

- **17 tests / 17 pass / 0 fail / 0 skipped / exit 0**：新观测/迁移测试 9 项，既有 events ledger 测试 8 项。
- 新测试：词表与英文边界（`v14ClaimObservation.test.ts:40`）；零写命中、消息锚、正文不变（`:51`）；door/channel 成功抑制（`:82`）；失败写与成功读不冒充写成功（`:92`）；空/不命中/非 assistant 不记（`:104`）；多词单轮一条、两轮两条（`:114`）；失败不阻断与固定诊断（`:124`）；旧行/seq/列/表/索引/触发器/重跑保全（`:136`）；空账本高水位与迁移事务回滚（`:167`）。
- 既有测试仍遍历完整词表，扩为 24 项（`v13EventsLedger.test.ts:225`），未排除回归。
- 首跑 **16/17**：空账本测试错误地 INSERT 了一条重复 `sqlite_sequence` 记录，导致 `.get()` 读到原有 0；fixture 改为 UPDATE 现有行后通过。首次失败如实保留，不当作产品错误或最终通过。

原始日志仅在 `.codex-tmp/claim-receipt-builder/events/targeted-1.log` 与 `targeted-2.log`。数据库全部为 `:memory:` 合成实例；无合成凭据、真实网络、`.env` key、用户库、`.git` 或 git/commit 操作。本件只证明该子任务；整体 SSE 接线、全量测试和工单 Result 由主 builder 汇总。
