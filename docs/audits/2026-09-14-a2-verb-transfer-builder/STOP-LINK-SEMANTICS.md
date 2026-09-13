> **状态 (Status)**: blocked（施工前真冲突；未完工）
> **From**: codex builder
> **To / needs**: fable(HQ) / claude
> **工单日期**: 2026-09-14
> **核证时间**: 2026-09-13T07:59:28Z
> **工单**: `../../agent-ops/handoffs/2026-09-14-v14-1-a2-verb-transfer-order.md`

# A2 停线证据：link_task_cards 的裁定前提与人门现物相反

## 判定

按用户及工单的“真冲突停线举证，禁止自作主张”停线。尚未实施任何产品代码、迁移或测试变更；8 动词过户及 create_card 退役均未完成。工单保持 ready，不翻 done。本档是待 HQ 处理的停线证据，不是交付验收。

裁定⑨要求“跟人门现语义”，却把旧 executor 的批量跳过行为写成人门现语义。按现物保持人门会违反明写的跳过条款；按括号中的跳过条款统一两门又会改变人门现有 404/409 行为。工单没有像 section order 条款那样明确授权改变这部分人门行为，builder 不自行选择。

## 逐点证据

行号对应本次读取的工作树；未查询提交或 `.git`。

| 来源 | 行号 | 事实 |
|---|---|---|
| `docs/agent-ops/analysis/2026-09-14-v14-1-census-adjudication.md` | 22 | ⑨原文：“裁**跟人门现语义**(INSERT OR IGNORE 跳过+计数)”。 |
| `docs/agent-ops/handoffs/2026-09-14-v14-1-a2-verb-transfer-order.md` | 21 | link_task_cards 条款：“跳过语义跟人门”；要求实际创建链接 ID 清单。 |
| `docs/agent-ops/analysis/2026-09-14-v14-1-executor-census.md` | 427–434 | 明确记人门单项、缺卡 404、重复 409；executor 批量 INSERT OR IGNORE、只返 created/skipped；批量策略候 HQ 裁，不自行选。 |
| 同上 | 501 | §6.2 抽取点仍是 R/tasks.ts:296–333，复杂度含单项查重/NULL、批量失败政策。 |
| `server/src/index.ts` | 19、124 | taskRoutes 挂载于 `/api/tasks`。 |
| `server/src/routes/tasks.ts` | 295–303 | POST `/:taskId/cards` 接收单个 card_id；缺失为 400。 |
| 同上 | 305–314 | task/card 均核当前用户归属，不存在的 card 抛 404。 |
| 同上 | 317–323 | `checklist_index IS ?` 显式查重，重复返回 409。 |
| 同上 | 326–332 | 普通 `INSERT INTO task_cards`，201 返回新链接完整行。 |
| `server/src/agent/tools/executor.ts` | 905–937 | 旧 Agent 批量入口；918 为 INSERT OR IGNORE，925–932 跳过或计数，937 返回 created/skipped。 |

独立只读复核得出同一结论：在 `server/src` 的 TypeScript 源码中核查 task_cards 写入口，仅找到上述 route 与 executor 两处 INSERT，没有另一条现成人门批量入口可消解此矛盾。根会话另核 `server/src/routes`、`server/src/services` 及 `client/src` 的对应调用。此结论仅覆盖所述源码射程，不声称检查了仓外或用户库。

## 需要 HQ 更正的内容

请在裁定⑨和工单正文中明确统一后的政策：保留当前人门的单项 404/409 并规定批量如何失败，或明确批准将人门改为跳过并计数。需同时说明不存在卡片、重复链接（含 NULL checklist_index）如何计数或报错；本档未替 HQ 选择任何方案。

若 HQ 最终保留跳过政策，还需明确全跳过时的事件/收据语义：实际创建链接 ID 清单会为空，而 A1 `server/src/services/recordAgentAction.ts:47–50` 拒绝空 resources。本单禁止改变该机关本体，builder 未通过改机关、伪造创建 ID 或自行添加另一种资源来消解该边界。

## 源码指纹

| 文件 | SHA-256 |
|---|---|
| `server/src/routes/tasks.ts` | `4ED4E9E6320A524FC7C246B8634DEE8B34960F404C9EC61CF809EE24322774D9` |
| `server/src/agent/tools/executor.ts` | `D37549243E10F9F5955D63FED129DBB4999FA9024518D85B36577C56F7CC257D` |
| `server/src/services/recordAgentAction.ts` | `5E3CA115010ABBE6C9A5B5ADD9406115990944B2DFECCD2D272832078C8CA7B9` |
| `docs/agent-ops/analysis/2026-09-14-v14-1-census-adjudication.md` | `BA3EF63CF67CC384F136E921831E07E6509D2689132DDD2717F4837963C5B5E8` |
| `docs/agent-ops/analysis/2026-09-14-v14-1-executor-census.md` | `EA4D7361D53DC21596FA86AF1DEDACD9B30F37CB16BE18264BAF4DE0577CD43C` |

## 执行及未做项

- 已读取工单、上游裁定/普查与 A1 recordAgentAction/createGoal/撤销现物，发现冲突后只做证据核查。
- 未改产品代码、schema、迁移、注册表、definitions、system prompt、任何 agent 指令或权限配置；未新增 API、依赖或凭据形合成值。
- 未执行 git 命令，未访问 `.git`，未 commit；未读取 `.env` 的 key 值或用户库。
- 未新设计或执行安全对抗用例；既有测试、三端 typecheck/build、静态门、server/client 全量与隔离 API 冒烟均未启动，测试数为 0。不是全绿，也没有通过排除测试获得结果。
- 迁移 074 未创建，事件拼法、各动词 revert、转录变体均未实施；create_card 清理射程为 0；产品行为变化为 0。
- Python/MinerU：未运行相关测试，不能申报为已复现的环境测试红。仅在准备源码备份时发现 `python` 不在 PATH；改用现有 Node 完成临时备份，没有安装或修复环境。
- 已在系统临时目录保留一次 1708 文件源码/文档开工快照，供不用 git 的后续差分；未包含 `.env`、`.git` 或用户库。审计目录只含本 Markdown 证据，无构建产物或原始日志目录。
- 待 HQ 更正⑨后，继续全部 A2 实施与验收；git/secrets 收口仍留 HQ。
