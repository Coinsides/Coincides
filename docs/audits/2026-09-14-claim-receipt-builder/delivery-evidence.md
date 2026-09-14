> **状态 (Status)**: active（builder 续建证据，非 HQ 放行）
> **日期**: 2026-09-14
> **范围**: 第三次复工令的出生归属、异常尾部、完整性闸及验证射程；仅蒸馏件

# 出生登记后的宣称收据对账

施工依据是 [工单](../../agent-ops/handoffs/2026-09-14-v14-claim-receipt-order.md) 尾部 HQ 裁定三；最终全量落点、测试总账与未做项见该单新增 `## Result`。三次停线记录保留为当时事实，不回改成通过记录。

## 1. 持久归属与投影

- `077_v14_agent_message_turn_id.ts:6` 仅增加 `agent_messages.turn_id TEXT`，可空、无默认值、零回填、零索引；旧行维持 NULL。baseline schema 不改，fresh init 仍走既有 schema + versioned migrations。
- `orchestrator.ts:40` 每次调用生成一个 UUID；`:141` 的统一保存入口向 `MemoryManager.saveMessage` 第六可选参数传该身份，覆盖首 user、工具 assistant/result 对子、final、interrupted。消息本身的 UUID 含义不变。
- live 在 `orchestrator.ts:144` 按 conversation_id + turn_id 回读已提交行；历史 `turnReceipt.ts:65` 按 turn_id 精确分组，组内配对工具结果，仅最后 assistant 挂一份摘要；NULL/缺失归属不出条，不推测相邻 user 的所属关系。
- 没有新增同会话串行化、排队或拒绝语义。已落史的 assistant 中间文字保留；收据挂末条是呈现选择，不迁移或合并历史消息。

`v14TurnIdentity.test.ts:37/:54` 证明：唯一新增列的完整 PRAGMA 形状、历史行除新 NULL 列外原样、total_changes 不增、其他 schema/索引/FK 不变、幂等及调用方事务回滚。`:121` 真实 fresh init + saveMessage 验新旧调用；`:136` 真实 GET 验同毫秒 rowid 顺序、旧史缺省及零写投影。

## 2. 原并发复现转为定向验收

原失败标本 `.codex-tmp/claim-receipt-builder/concurrent-preflight/reproduce.test.ts` 留作停线原始证据；其真实 runAgent / save_memory / SQLite 内存库 / GET 路由机制已迁入常驻 `v14ClaimReceipt.test.ts:262`。旧程序不再用来宣称当前缺陷存在。

| 场景 | 实际工具效果 | live | GET 历史 | 额外断言 |
|---|---|---|---|---|
| A/B 两条 user 均已落史，A 先结束 | A 保存一条 memory；B 普通回复 | A 写成功 1，B 0 | 分别逐字段等于各自 live | 两个不同 turn_id；A 四行/B 两行；仅两条末 assistant 有摘要 |
| 同样交叠，B 先结束 | A 保存一条 memory；B 无工具却说“已保存” | A 写成功 1，B 0 | 分别逐字段等于各自 live | 只有 B 的 message_id 产生红旗；A 的写不能为 B 核销 |
| 跨轮相同 call ID，A 成功/B 失败，A 再读一次 | 合成持久行 | 不涉及 live | A 成功 1+读 1，B 失败 1 | `v14TurnIdentity.test.ts:74` 刻意交错 call/result 行，不跨 turn 借结果 |

两次真实 run 的 provider 由独立闩控制，第二条 user 必须在任一 provider 放行前落库，因此新增测试同时证明没有偷偷引入串行化。provider 输出为合成 fixture；工具、持久化及路由为真实实现。

## 3. 异常收据与可传输边界

`orchestrator.ts:155` 起统一捕获落史及 extractMemories 异常，`:358` 只生成一次尾部摘要，然后发 error 或 done。`v14ClaimReceipt.test.ts:321` 的六个独立注入场景覆盖首 user 写失败、工具对子事务回滚、final 写失败、interrupted 写失败、最终消息已写但会话 updated_at 簿记失败、extractMemories 抛错。真实 POST 必须收到 `turn_receipt → error → done` 且各一次，摘要逐字段等于已提交历史投影。

**摘要的分母是已持久化的工具调用/结果，不是全数据库效果。** 注入工具对子落史失败时，真实 save_memory 已提交一条记忆，而工具对子事务回滚，摘要为空；测试显式核对二者，未用回显伪造落史成功。说明书要求结合错误和收据/events 检查，空条不能当作回滚证明。提案成功也不等于人采纳，删除复述不等于删除完成。

连接已关闭或既有 requestTimer 已结束 transport 时，无法保证 live 条还能送达；路由仍 drain 已开始执行，归属历史可回看。初始化阶段尚无消息/工具证据的失败不伪造历史 assistant；数据库本身不可读取时也没有伪造空收据兜底。

最终复核还发现 `turn_receipt → error → done` 在 client 重复挂条：`agentStore.ts:280` 让 error 泡消费已携带摘要，后续 done 保留模型原文且不复制摘要。原 round_limit 的 `error → turn_receipt → done` 仍由末条 assistant 收条。`AgentPanel.turnReceipt.test.tsx:170` 两种顺序 × 有/无文字共 4 例；修前定向 16 例中 2 例失败，修后三文件 31/31，TypeScript exit0。

## 4. 分类完整性与 read 核对

现役集合：door_write **10**（AGENT_ACTION_TOOLS import 投影）、channel_write **2**（save_memory/create_proposal）、read **22**（AGENT_READ_TOOLS import 的 4 个 + HQ 明列 legacy 18 个），总计 **34/34**。注册表本体不改。`effectClassification.ts:27` 的常驻闸检查未覆盖、陈旧分类、交叠和重复定义；`v14ClaimReceipt.test.ts:21/:30/:35` 直接读取 toolDefinitions。

另跑独立进程探针 `.codex-tmp/claim-receipt-builder/resume-third/coverage-probe.ts`：实际表 **exit0**；只在传入集合追加 `synthetic_unclassified_tool` 后 **exit1**，missing 精确为该名，其他三个差集为空。这是预期红闸证据，不是产品验收失败，也没有修改注册表以制造反例。

[read-effects-audit.md](read-effects-audit.md) §6 的 **22/22 静态全链审计**继续有效。旧 32 文件快照有 30 个 SHA256 与本次一致，只有本单改动的 orchestrator/manager 不同；所有 executor、四 V2 读器和底层业务读取路径一致。唯一工具自身簿记例外为 search_memories 的 last_accessed UPDATE 及同内容 FTS 维护；collect_preferences 只发表单 marker，不持久保存偏好。通用会话落史/update_at 及既有用户模式自动抽取不冒充 read 工具的域写。此证据不是对真实用户库的动态无写证明。

## 5. 原始证据索引与纪律

以下路径均相对 `.codex-tmp/claim-receipt-builder/`，本审计目录无原始日志或数据副本：

| 原始件 | 射程 |
|---|---|
| `resume-third/targeted/claim-first.log` | 最终 server 新定向 42/42（26 收据 + 9 观测 + 7 身份） |
| `resume-third/targeted/loop-route-final.log` | 既有 loop/route 24/24，保留旧消费者与 timer 清理断言 |
| `resume-third/targeted/coverage-green.log`、`coverage-red.log`、`coverage-exits.json` | 现物绿/未分类红两个独立进程 |
| `resume-third/migration-history/turn-identity-test.log` | 077/历史单独 7/7 |
| `resume-third/review/client-terminal-before-fix.log`、`client-terminal-after-fix.log`、`client-terminal-typecheck.log` | 重复条先红后绿及类型检查 |
| `resume-third/review/read-audit-current-comparison.json` | read 审计 32 文件当前对照 |
| `resume-third/final-source-inventory.json`、`source-inventory.mjs` | 明列 25 个经手/继承源文件及 4 个只读参照，字节/SHA 与前次停线对照；不是 git diff 或全工作区普查 |
| `third-resume-env/final-agent/`、`final-agent-second/` | 首跑旧异常顺序断言失败；修正后完整 agent 266/266 |
| `third-resume-env/final-server/`、`final-server-v2-second/` | 全部 13 个 server test 脚本；test:v2 IPC 初跑错误及原命令完整复跑均保留 |
| `third-resume-env/final-runtime/`、`final-runtime-second/` | runtime 授权原序步骤及 scope/commands/results；首跑 Board 选择测试失败及整序复跑记录均保留；最终数字见工单 Result |
| `third-resume-env/python-probe.json`、`probe-python.mjs` | 裸 python.exe ENOENT；底层 Python EPERM；固定 MinerU launcher exit101 |
| `resume-third/targeted/launch-error.txt` | 第一次定向启动因日志目录 cwd 错误没有运行测试；修正后才计 42/42 |

注册表、definitions、executor、system prompt 与上次停线 SHA 均相同；prompt 字节差 **0**。本轮未碰 `.git`、未运行 git/commit/push/PR/merge，未读 `.env` key、机器钥匙或用户库，未增加依赖、工具写动词或新持久表；唯一新列为 HQ 点准的 077 turn_id。076 是已保留的 events CHECK 扩容，历史/seq/索引/append-only 保全证据仍见 [claim-events.md](claim-events.md)。迁移只在合成内存测试库执行，未对用户库扣动迁移扳机；git/secrets 收口留 HQ。
