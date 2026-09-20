> **状态 (Status)**: evidence
> **层 (Layer)**: Builder 验证蒸馏件（非产品权威）
> **日期 (Updated)**: 2026-09-20
> **工单**: `docs/agent-ops/handoffs/2026-09-20-v14-c3-episode-memory-order.md`

# C3 episode 存储与机械锚证据

## 建模与删除申报

- `server/src/db/migrations/083_v14_agent_episodes.ts:8` 唯一新增业务表 `agent_episodes`，字段为 id / user_id / conversation_id / seq / summary_text / message_range / anchor_manifest / token_estimate / created_at。JSON 保存首末 message id、起止时间和完整五类 ID 数组；原文 ID 不截断。
- 同文件第 18、21 行分别建立 conversation + seq 唯一约束、conversation + 首末 message id 唯一索引。seq 取该段首条原始消息 rowid，删掉 episode 后重压仍复用此 seq。
- 同文件第 24 行为 summary_text 的 FTS5 外部内容索引，第 27 行起插入/删除/更新触发器仅维护索引；无原始消息迁移、更新或删除。
- `server/src/agent/memory/episodes.ts:129` 插入在 IMMEDIATE 事务里读取属主会话原始消息，核实连续段，已有同段直接返回；与任何现有段重叠则拒绝。锚从重新读取的原始段机械抽取。
- `server/src/agent/memory/episodes.ts:181` 删除仅 DELETE agent_episodes；FTS 同步去掉该 projection。原始消息继续留存，可在后续超过阈值时重新压缩。
- `server/src/routes/settings.ts:15` 挂载 `/api/settings/agent-episodes`；`server/src/routes/agentEpisodes.ts:9` GET 返回带会话标题的完整 episode DTO 数组，第 13 行 DELETE `/:id` 成功返回 204。无编辑入口。

## 现物锚对账

抽取入口：`server/src/agent/memory/episodes.ts:50`。来源仅为 tool_calls.arguments、tool_results.content 解码后的结构和 message.meta；不从自然语言猜测 ID。首末消息和 raw JSON 保留于原始 agent_messages，不依赖摘要模型保留 ID。

| 现物结构 | manifest 结果 |
|---|---|
| read_note 的 note.id、blocks[].item_ref.item_id | note_ids / item_ids |
| get_note 裸 id；list_notes 的数组裸 id | note_ids，按相邻工具调用名称定型 |
| read_board 的 board.id 与 members[].member_kind + member_id | board_ids 与对应 note_ids / item_ids |
| read_content_groups 的 groups[].note_id、members[].item_id | note_ids / item_ids；不把 group/member 行 id 当 Item |
| get_item / list_items 裸 id；嵌套 origin_note_id / origin_board_id / item_id 等 | item_ids 及所指类型数组 |
| create_proposal / save_memory 裸 id | proposal_ids / memory_ids，按相邻工具调用名称定型 |
| search_memories 数组裸 id | memory_ids；kind=episode 的行 id 不当 memory_id，仍提取其 anchor_manifest |
| 工具收据 metadata.resources 中 kind + id | 按 note / board / item / proposal / memory 类型保存 |
| board_member 资源的 before/after.member_kind + member_id | 对应 note_ids / item_ids；资源自身 membership id 不冒充 Item |
| C2 answer_card.selection.note_id；intent_plan.proposal_id、steps.anchor.board_id、steps.arguments 内 typed targets | 对应 note_ids / board_ids / proposal_ids；无类型 object_id 不猜 |
| C1 layout_report.report.issues[].itemIds | 不采为知识 Item：现物该字段指 member / sticky / edge 视觉标识 |

工具结果按已注册 turn_id 内相邻 assistant calls → user results 局部匹配；NULL legacy 只沿全局邻接。交错双轮或复用 callId 的后续轮不会重分类早先结果。原文去重保持首次遇见顺序，无 UUID 限制，不截 ID。正常功能夹具含 605 字符 note ID，验证完整保留。

## 定向结果

在 `server/` 执行：

```text
node --import tsx --test --test-timeout=600000 src/__tests__/v14EpisodeStorage.test.ts
```

最新运行：**6 tests / 6 pass / 0 fail / 0 cancelled / 0 skipped，810 ms**。原始日志：`.codex-tmp/c3-episode/storage-tests.log`。

| 测试入口 | 普通功能断言 |
|---|---|
| `v14EpisodeStorage.test.ts:40` | read/get/board/groups/proposal/memory/meta 的真实 DTO 形状；长 ID 不丢；视觉/member/receipt ID 不混成 Item |
| `v14EpisodeStorage.test.ts:82` | 收据 resource refs、C2 mount targets、跨轮复用 callId 的类别正确 |
| `v14EpisodeStorage.test.ts:105` | 已注册双轮交错、复用 callId、NULL legacy 邻接：裸 ID 按真实工具归类，遇见顺序不变 |
| `v14EpisodeStorage.test.ts:122` | 083 migration 应用；同段幂等；断段/重叠拒绝；删除再压 seq 稳定；SELECT rowid,* 全行前后 deepEqual |
| `v14EpisodeStorage.test.ts:148` | 旧 episode FTS 命中；FTS 不检索 raw messages；删除后索引无条目；原始消息全行不变 |
| `v14EpisodeStorage.test.ts:164` | Settings GET 查摘要/范围/锚/会话；DELETE 204 后列表与索引消失；消息全行不变 |

测试数据库均为 `:memory:`，未打开用户库；存储测试无任何 provider。全量回归与最终 typecheck 数字由总验收报告统一记账。

## 只读接线复核

复核 `episode-context.ts` 的 turn span 合并、末 4 组保护、按存活 range 求未压缩段、整条 episode 预算截老、测试摘要 provider 硬短路。原回退实现曾取每条文本消息首句，已反馈 builder 主线程并由其收束到每轮首个有文本消息首句；未在存储分支改动 runtime。未改 C1/C2 交付。
