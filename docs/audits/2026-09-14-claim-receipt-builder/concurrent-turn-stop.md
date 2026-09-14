> **状态 (Status)**: blocked（builder 停线证据，未交付）
> **日期**: 2026-09-14
> **范围**: 第二次复工后的施工现物、并发轮次归属冲突与验证边界；只放蒸馏件

# 同会话并发历史收据串账

本次停线不是分类争议。HQ 第二次补正已落实：三类覆盖 **34/34**，read 路径核对 **22/22**。新冲突在于工单同时要求「一次 runAgent 为单位」「历史读时同形投影」，但现有持久消息没有 run 归属，POST 又允许同会话重叠执行。不能从未保存的信息中恢复准确归属。

## 可复现反例

使用真实 `runAgent`、真实 `executeTool(save_memory)`、SQLite `:memory:` 和真实 GET handler，仅 provider 输出使用合成 fixture。先让 A、B 两次调用都存下 user 行，再依次放行 A 和 B。A 实际保存一条记忆，B 只回复普通文本。

| 轮次 | live write_ok_count | GET 历史 write_ok_count | 实际效果 |
|---|---:|---:|---|
| A | 1 | 1 | 保存一条记忆 |
| B | 0 | 1 | 没有工具调用，却借到 A 的成功写 |

实际落库六行：`user A → user B → assistant A(tool_calls) → user(tool_results) → assistant A final → assistant B final`。call/result ID 只能连接工具对子，不能连接 final assistant 与原始 user；全是同一个 conversation，随机 message UUID 不带父关系。改按 rowid 排序只能保序，不能恢复归属。

- 复现程序：`.codex-tmp/claim-receipt-builder/concurrent-preflight/reproduce.test.ts:35` 建内存库，`:69`/`:71` 两次真实调用，`:74` 断言双 user 先入库，`:78`/`:80` 放行，`:86`–`:90` 核 live 与真实记忆，`:98` 调实际 GET，`:103`/`:104` 核历史串账。
- 原始结果：同目录 `reproduce.log:84` 起；**1 test / 1 pass / 0 fail / 0 skipped / exit 0 是“缺陷复现成立”，不是验收通过**。全量合成落库行留原始日志，不复制进本目录。
- 原始源码、schema 和 SHA256：同目录 `schema-evidence.log`；新建合成 provider key 为 `syn-overlap`（11 字符），无外部 API 或用户库。

## 来源缺口及需裁定处

`server/src/db/schema.sql:265`–`:274` 的消息列只有 id/conversation_id/role/content/tool_calls/tool_results/token_count/created_at；`server/src/agent/memory/manager.ts:101` 逐行产生 UUID，`:104`–`:105` 无 run 关联。`server/src/agent/orchestrator.ts:140`–`:149` 新增的 `persistedIds` 仅住本次调用闭包，因此 live 能正确隔离，结束后不可供历史重用。`server/src/routes/agent.ts:52`–`:55` 读史，`:68`/`:90`/`:140` 的 POST 每请求独立执行，无同会话互斥。当前 `server/src/agent/turnReceipt.ts:64`–`:80` 按真实 user 边界切段，在上述序列会串账。

请 HQ 明确未来轮次关联的合法持久载体，或同会话串行化的排队/拒绝语义；**无论未来选哪种，既有缺关联的重叠旧史仍需诚实降级口径**。builder 未自行改 message UUID 含义、挪用正文/token_count、增加 run 列、改写门或引入串行化规则。仅换纯投影算法不能解决信息缺失。

## 已施工但未交付的现物

| 落点 | 现物与边界 |
|---|---|
| `server/src/agent/tools/effectClassification.ts:5`/`:6`/`:7` | door=AGENT_ACTION_TOOLS import 投影；channel=save_memory/create_proposal；read=AGENT_READ_TOOLS import 投影+18 legacy，无复制注册数组 |
| 同文件 `:27`；`server/src/__tests__/v14ClaimReceipt.test.ts:19`/`:28`/`:33` | 完整性闸读取实际 toolDefinitions，检查遗漏、陈旧分类、交叠、重复定义；未分类合成工具确实抛错；当前34/34 |
| `server/src/agent/turnReceipt.ts:35` | 按本轮相邻 call/result 行及 ID 配对；缺失、重复结果或重复调用 ID 不计成功；删除复述无删除收据不计成功；未知旧工具不猜类 |
| `shared/types/agentTurnReceipt.ts:1`/`:7`；`shared/types/index.ts:378`/`:388` | 摘要类型与 AgentMessage 可选字段，无新 SQL 列 |
| `server/src/agent/orchestrator.ts:141`/`:145`/`:173`/`:241`/`:341`/`:356`；`memory/manager.ts:99`/`:109` | 记录本调用保存的消息 ID，结束时回读事实源；正常及受控失败分支发收据。异常持久化/extractMemories 抛错的兜底收据仍待补 |
| `server/src/agent/providers/types.ts:42`；`server/src/routes/agent.ts:52`/`:161` | turn_receipt 扩展、历史读时出口、SSE 转发；历史并发缺陷未修，不能交付 |
| `server/src/agent/claimObservation.ts:6`/`:9`/`:23`/`:40`/`:50`/`:60` | 窄词表，零成功写才计事件，meta 指向会话/命中消息，不改变模型回复；写观测失败只出固定诊断 |
| `server/src/db/recordEvent.ts:29`；`server/src/db/migrations/076_v14_claim_without_receipt_event.ts:6` | 只扩指定观测 verb/CHECK；事务中重建现有 events，最终持久表/列不增加，历史/seq/索引/append-only 保全；只在合成库跑 |
| `client/src/stores/agentStore.ts:33`/`:68`/`:224`/`:241`/`:267`/`:294`/`:316` | live 接收与 done/error/EOF 保留，未知摘要不伪装无写 |
| `client/src/components/AgentPanel/AgentPanel.tsx:28`/`:64`/`:220`；`MessageBubble.tsx:107`/`:137`/`:140`/`:162`；`MessageBubble.module.css:41`/`:53` | 既有 token 收据条，写/无写文本/纯读/未知状态，无交互或新面板 |
| `server/package.json:33` | 两份新测试接入 test:v2；试过 shared 预编译前缀后已撤销，原 build 命令保留 |
| `docs/agent-ops/current-state/app-operating-manual.md:53`/`:55` | §五保留操作者纪律；新增读法明确标“施工中，尚未交付”，并警告并发历史不可核销宣称 |

摘要形状：`{write_calls:[{name:string,ok:boolean}],read_calls:[{name:string,ok:boolean}],write_ok_count:number,write_fail_count:number,unclassified_calls?:[{name:string,ok:boolean}]}`。最后一项仅在未知/已退役工具存在时出现，client 不据此断言无写。成功表示该工具结果成功；`create_proposal` 成功不表示人已采纳。摘要本身不落库。

最终已落代码的词表全文：中文 **已保存、已创建、已记住、已记录、已更新、已删除、已完成**；英文 **saved、created、remembered、recorded、updated、deleted、completed**，各7项。中文字面子串，英文不区分大小写且带单词边界；不作语义判断。事件 meta：`{conversation_id,message_id,matched_terms,message_ids?}`，actor_kind=system/channel=chat。system prompt 未修改，字节差 **0**。

read 全链、四 V2 读器及簿记全集见 [read-effects-audit.md](read-effects-audit.md) 第87行起，唯一工具自身簿记是 search_memories 的 last_accessed UPDATE 与同内容 FTS 维护。事件子模块证据见 [claim-events.md](claim-events.md)。本轮显式经手文件清单、字节数与 SHA 留 `.codex-tmp/claim-receipt-builder/stop-inventory.json`；这不是 git diff 或全工作区改动普查。

## 验证账本（不合并冒充最终全绿）

| 验证 | 实际结果 | 射程 / 原始日志（均相对 .codex-tmp/claim-receipt-builder） |
|---|---|---|
| 当前定向收据+观测 | **27/27，0 skipped，exit0** | `checks/targeted-third/claim-receipt.log`；已含重复call ID保守失败与真正成功纯读 fixture |
| 观测+既有events | **17/17，0 skipped，exit0** | `events/targeted-2.log`；含迁移历史/高水位/约束/回滚 |
| 两份既有loop/route | **24/24，0 skipped，exit0** | `regression-compat/targeted-final.log`；未排除旧断言 |
| Agent族 | **251/251，0 skipped，exit0** | `checks/agent-first/agent-family.log`；早于最后重复call ID/纯读fixture补丁，非最终整树重跑 |
| server test:v2 | **725 tests，723 pass，2 fail，0 skipped，exit1** | `checks/server-first/server-suite.log`；MinerU wiring启动找不到python.exe，region-cells的既有Python底层路径不可用；没有排除失败项。未补跑server其余独立脚本族，不能称完整server已通过 |
| client全库 | **172 files / 1758 tests 全过** | `checks/runtime-first/test-unit.log`；早于最后纯读空白视觉小修 |
| client最终定向+TS | **27/27，tsc exit0** | `client/targeted-final-visual-fix.log`、`client/typecheck-final.log`；合成420px深色/320px浅色Chrome亲看，未接应用API，截图仅工具图无本地PNG |
| runtime门授权范围 | **18步pass，第19步build失败** | `checks/runtime-first/results.jsonl`；server新shared类型缺预编译产物TS6305。尝试预编译另遇shared/dist写入EPERM，日志 `checks/server-build-after-shared.log`，临时build前缀已撤销。后续performance/docs步骤未跑 |
| 并发缺陷复现 | **1/1证明缺陷存在** | `concurrent-preflight/reproduce.log`；不可记为验收绿 |

runtime 严格按根脚本的原有顺序执行组成步骤，git diff/changed-file-secrets 因本单禁碰.git且指定HQ收口而未运行；未改门脚本或加排除。完整 runtime 门未通过。

启动错误/失败尝试全部保留：root首次driver cwd误算未启动测试，修正后才得到27/27；事件首跑16/17为seq fixture重复行错误；loop/route首跑23/24为新增read成功断言误认空参数；各修正及最终日志均留原目录。未删除失败日志、未将启动错误计成有效覆盖测试。

## 停线后未做项

轮次关联/歧义旧史待HQ裁定；持久化及extractMemories意外异常路径兜底仍欠；shared构建与Python环境问题未解决；最终agent/server/client全量及剩余runtime门未完成；主观验收、真实API、用户库迁移、git/secrets、commit/push/PR/merge均未做。保留施工补丁，不将半成品标done，不写完成版Result。未碰工具注册表本体、写门、仪式机关、.git、.env key或用户库，未加依赖/工具写动词/最终持久表列。
