> **状态 (Status)**: active
> **层 (Layer)**: Builder 验证证据
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否；施工回执见工单 Result，放行留 HQ

# 循环健壮性批验证

工单：[2026-09-14-v14-loop-robustness-order.md](../../agent-ops/handoffs/2026-09-14-v14-loop-robustness-order.md)。代码按工具流与缓存两轮施工后的现物重定位；未使用审计旧行号替代当前源代码。

## 实现与取值

| 工单项 | 实现 | 取值 / 边界 |
| --- | --- | --- |
| 1 流挂起 | 每个 `iterator.next()` 与中断 Promise 竞争；父信号和计时均 abort provider；cleanup 不等待挂起的 `return()` | 每轮上限 300,000ms，受请求绝对 deadline 限制；Anthropic SDK 与四个 OpenAI-compatible provider 名均贯通 |
| 2 慢工具 | `executeTool` 外围 Promise.race；沿既有 catch 生成同 ID 的错误 ToolResult | 60,000ms，实际等待上限为 `min(60,000ms, 请求剩余时间)` |
| 3 八轮耗尽 | 最后一轮工具结果落史后发送 `round_limit`，随后 `done` | 选独立事件方案；无第九次模型收尾调用；路由同时发送带 `code: round_limit` 的 error 提示供现有 client 显示 |
| 4 错误落史 | 错误 yield 前保存原 textBuffer + `\n\n[interrupted]`；未执行工具不落 tool_calls；已执行工具成对事务落史，早于 tool_end | 标记使用普通 assistant 正文，不增 schema/未知 content block；历史查询加 `rowid DESC`，防同毫秒配对倒置 |
| 5 总预算与断线 | route 传绝对 deadline + signal；轮间与每次 next 前后核 deadline；断线继续 drain 已接受工具批次 | 请求/SSE/主循环模型预算 300,000ms；断线或超时不取消已接受写作业，真实写门照常提交收据，禁止开启后续主循环模型轮 |

**提交边界**：工具等待超时是等待方收尾，不是事务撤销。已接受工具可能在 SSE 关闭或错误 ToolResult 落史之后完成；错误文字明确提示可能晚完成并要求重试前查看收据。真实 `create_proposal(organized_note)` 延迟夹具验证了晚完成仍写 pending 提案和 `proposal_issued` 事件，未自动应用提案。进程退出后的恢复不在本单射程；Promise.race 也不能抢占阻塞事件循环的同步代码。

**配对修复**：原 `ORDER BY created_at DESC` 再 reverse 在同毫秒时会翻转 tool_use/result。两路独立用真实内存 SQLite 复现，故第 4 项最小补 `memory/manager.ts` 的稳定排序；没有改变记忆检索/提取策略或 sanitizer 配对规则。

## 复跑与证据

最终计数见 [summary.json](summary.json)：

| 检查 | 最终结果 |
| --- | --- |
| 五项定向 | 循环 14/14、路由 10/10、provider 49/49；本单新增 42 例 |
| Agent 族回归 | 10 文件、207/207，通过数从最终 server 全量的同族文件逐项累加；初轮 targeted 为 206/206，随后路由增加一例 |
| server 全量 | 86/86 文件已运行；860 tests、858 pass、2 fail、0 cancelled/skipped/todo；2 项 Python/MinerU 环境失败见 findings |
| client 全库 | 171/171 文件、1746/1746 tests 全部通过 |
| runtime 子检查 | 21/21 非 Git/secrets 子检查通过，含双端构建；Git/secrets 两项未跑 |
| 测试接线 | 86/86，0 豁免，0 未接线 |

从仓库根运行：

```powershell
node docs/audits/2026-09-14-loop-robustness-builder/run-validation.mjs targeted
node docs/audits/2026-09-14-loop-robustness-builder/run-validation.mjs server-full-serial
node docs/audits/2026-09-14-loop-robustness-builder/run-validation.mjs gates
node docs/audits/2026-09-14-loop-robustness-builder/run-validation.mjs closeout
node docs/audits/2026-09-14-loop-robustness-builder/run-validation.mjs docs-final
```

- `targeted`：动态枚举后选 provider、Agent memory/write/verb、context hint、删除仪式、提案、读工具、本单循环与路由族。
- `server-full-serial`：动态枚举 `server/src`、`server/scripts` 全部 `.test.ts`，逐文件独立进程，文件内无过滤或豁免。接线总数由既有 `check:test-wiring` 复核。
- `gates`：核对原 `verify:v2-bn8-runtime` 命令文本后执行全部 21 个非 Git/secrets 子检查，包含 client 全库（仅限 worker=2）与双端构建。两个 Git/secrets 尾门留 HQ；未宣称聚合门完整通过。
- `closeout`：最终接线、server build、docs check；不改门定义。`docs-final` 在工单 status 回填后调用既有索引生成器同步过期派生 INDEX，再做 docs check。可另用 `client-full` 重跑 client 全库。

执行器使用操作系统环境白名单、内存数据库、独占系统临时 appdata/assets/source-blobs/uploads、空 dotenv 与空 Vite env 目录；不会继承 provider key 或 NODE_OPTIONS。新造凭据形值均不超过 20 字符，无真实模型调用。仅删除自建且经绝对路径包含关系核验的系统临时目录。

原始跑批日志只在 `.codex-tmp/2026-09-14-loop-robustness-builder/`（含 provider-abort、loop-tests、route 与各全量 run 子目录）。本目录只保存 README、findings、计数 summary 与复跑脚本。详见 [验证发现](findings.md)；各 summary 保留命令、文件分母、退出码、计数及原始日志路径。

## 范围申报

未修改工具 executor、注册定义、权限/仪式机关、prompt 内容或缓存策略；client 无施工变更。应用操作说明书无新操作面，条目无涉。测试新增两个文件已接入现有 server `test:v2`，无接线豁免。未运行 git 命令、未读写 `.git`、未 commit；git/secrets 与主观验收留 HQ。
