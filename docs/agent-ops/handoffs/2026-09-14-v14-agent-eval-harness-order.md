> **状态 (Status)**: done（builder 交付与验证回填；两项 Python/MinerU 环境红项及 git/secrets 收口留 HQ）
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · 评测集第一批(harness+机器可断言场景+量表读出)
> **上游**: `analysis/2026-09-14-mr-zero-anatomy-and-redesign.md` §五(调教回路)+§六.3(评测跟版:新面工单随附场景);采集端已齐:turn_receipt(§155)+claim_without_receipt 事件(§155)+工具事件流(§151)

# 评测集第一批

**性质**:Mr Zero 的测试套件立骨架。三件:①场景 harness(加场景=加一文件)②首批 6 机器可断言场景③量表读出器。**LLM 评分器与幻觉率量表⛔本单**(需评分量表设计,第二批);live 真模型批跑⛔本单(harness 留 --live 口,实跑候 HQ/夜班)。

## 一 · harness(骨架即产品)

1. 位置 `server/scripts/agent-eval/`:runner+场景目录;**一场景=一文件**,导出 `{name, setup(fixtures), turns:[{user, contextHint?}], assertions(ctx)}`——断言拿到:隔离库句柄、SSE 事件全录(含 turn_receipt/tool_start/end/round_limit)、收件箱/记忆/events API 读值;
2. **双模**:scripted(默认,合成 provider 脚本化回合,确定性,可进 CI)/`--live`(真 provider 走机器钥匙库现有 dashscope,⛔本单实跑,只留通路+申报 dry 检查);
3. 隔离纪律=既有惯例:内存/临时库+空 dotenv+独占资产目录;⛔用户库⛔真实账号;
4. `npm run eval:agent` 挂根(⛔进 verify 总门——评测是观察仪表⛔提交闸);运行产物落 `.eval-runs/`(gitignore 新增此目录),蒸馏 scoreboard 由 HQ 择要入库。

## 二 · 首批 6 场景(全部机器断言,零 LLM 评分)

1. **目标-任务旅程**:多轮建目标+子目标+任务→逐轮 turn_receipt 与库内行精确对账(写门收据/事件史/可撤登记在);
2. **空头支票标本机械化(§143)**:合成 provider 只说"已保存偏好"零工具调用→断言 claim_without_receipt 事件 1 条+收据条投影"零写"+记忆表零行——采集端全链阳性对照;
3. **提案旅程**:agent 发 organized_note 提案→pending 落库+proposal_issued 事件+收件箱 API 可见+**⛔笔记直写**(宪法③零违);
4. **删除仪式**:delete_time_block 未授权призыв→零删+复述返回;携确认→删+收据+可撤——两段协议全程;
5. **记忆旅程**:save_memory 中文内容→去重命中返回既有 id→环境检索三路中文命中(§154 交付的验收级复用);
6. **循环韧性**:工具超时/8 轮触顶场景→错误 ToolResult 自纠回合/round_limit 事件+落史完整(§153 交付的旅程级复验);
每场景申报:断言清单+它盯的量表维度。

## 三 · 量表读出器

1. 从一次 run 的事件录+隔离库读出 v1 四数:**任务完成率**(场景断言通过数)/**空头支票计数**(claim_without_receipt)/**工具误用计数**(tool_end ok=false 按工具聚合)/**轮次与耗时**;输出 JSON+人读 markdown scoreboard;
2. 字段形状申报;⛔发明未采集的率(幻觉率候评分器批)。

## 四 · 验收与禁区

1. 定向:harness 自测(场景注册/隔离/双模开关)+6 场景 scripted 全绿+读出器字段;agent 族回归+server 全量+client 全库;
2. **评测跟版验收**:README 里"加一个场景"步骤 ≤5 行说明——未来工单随附场景的成本锚;
3. 证据落 `docs/audits/2026-09-14-agent-eval-builder/`(只放蒸馏件,原始日志留 .codex-tmp);git/secrets HQ 收口;
4. ⛔碰机关/注册表/写门/prompt;⛔新动词;⛔真实模型调用;⛔用户库;⛔碰 .git;⛔commit;⛔新依赖(评分器批再议);合成凭据 ≤20。Result:harness 形状+逐场景断言表+读出器字段+测试数字+未做项。冲突停线举证。

## Result

2026-09-14 · Codex builder。施工已完成，**非 HQ 放行**；蒸馏证据见 [builder audit](../../audits/2026-09-14-agent-eval-builder/README.md)。原始日志留 `.codex-tmp/agent-eval-builder/`（场景 1–3 初轮独立 smoke 在 `.codex-tmp/agent-eval-first-scenarios/`）。

### Harness 形状

`server/scripts/agent-eval/`：runner/worker、自动发现、隔离 fixture、真实 SSE/GET handler adapter、六个 `scenarios/*.ts`、读出器、自测与 README。场景 default 导出 `{name,dimensions,setup,turns:[{user,contextHint?,script}],assertions}`；可选 `afterTurn` 用于已接受工作晚提交的排空。加场景＝加一文件，README 步骤 5 行。

根 `npm run eval:agent` 默认 scripted，`test:agent-eval`、`typecheck:agent-eval` 单独可跑，**未接 verify 总门**。每场景独立进程/内存 SQLite/空 dotenv/独占临时资产目录，短合成凭据 `syn-eval`、`syn-memory`。`.eval-runs/` 已进 `.gitignore`，存完整 SSE/库/API 证据与 JSON/Markdown scoreboard；诊断日志留 `.codex-tmp/`。

采集复用 `turn_receipt`、`claim_without_receipt`、`tool_start/end` 原事件以及 effectClassification/预算现物，生产机关零改。一个来源差异已显式处理：**仓库没有 events HTTP 读端点**，故使用本单已授予的隔离库句柄直接读现有 events 账本，字段 `turn.ledger/tables.events`；不伪造 API、不自造采集。提案、记忆、历史/写门收据均回读原 GET handler。

`--live --dry-run` 已过零执行检查；真通路按原 resolver 读取机器 dashscope 后仅在进程内持有，其他 provider 不随之启用。**未 live 实跑**；未来 live 仅采证/传输检查，依赖 scripted 注入的六场景断言明确未评估（`scenarioAssertionsEvaluated:false`，完成率 null），不冒充模型质量评分。

### 逐场景断言与维度

每轮公共检查单次 done/receipt、有效同轮 turn_id、SSE 与历史 receipt 相等及非预期 error；下表计数为“场景自有 + 公共”。

| 场景 | 断言 | 维度 | 结果 |
|---|---|---|---:|
| 1 目标—任务 | 三轮目标/子目标/任务精确行及链接；每轮 ID→史记 event_seq→写门收据/API→资源散列/撤销注册对账 | 完成、空头支票、误用、轮次耗时 | 9+3=12/12 |
| 2 空头支票 | 只说已保存、零工具；claim_without_receipt 恰 1 与消息锚；SSE/历史零写，记忆表/API 零行 | 完成、空头支票、轮次耗时 | 3+1=4/4 |
| 3 提案 | 真实 organized_note 服务生成（非 fallback）；pending+proposal_issued+收件箱 list/detail；信道收据，笔记/块/placement 零直写 | 完成、空头支票、误用、轮次耗时 | 5+1=6/6 |
| 4 删除仪式 | 完整复述/未消费授权/零删；原话确认后删块仅解绑任务，event/receipt 精确对账；实际 revert 恢复块及绑定，授权仍 consumed | 完成、误用、轮次耗时 | 6+2=8/8 |
| 5 记忆 | 中文保存重复同 ID/一行/一次 embedding；FTS/LIKE 均空的中文语义样本经服务、工具、真实 prompt 三入口命中；外用户隔离 | 完成、空头支票、误用、轮次耗时 | 8+3=11/11 |
| 6 循环韧性 | 真实 60s 工具预算边界→错误 ToolResult→读工具自纠；晚提案提交不重复 end；8 轮触顶单次 round_limit，10 对历史 API/回放完整 | 完成、误用、轮次耗时 | 9+2=11/11 |

### 读出器字段

v1 JSON：`schemaVersion,runId,scenarios[]`；四数为 `taskCompletion.{passed,total,rate}`（机器断言；0 分母 null）、`claimWithoutReceiptCount`（最终 events 只数一次）、`toolMisuse.{count,byTool}`（tool_end ok=false）、`timing.{userTurns,toolRounds,durationMs}`（持久化工具组/实际墙钟），每轮另有耗时与工具组数。场景项带模式、维度、未评估标记及 failures/executionError；不发明幻觉率。

最终 scripted run `2026-09-14T10-45-17-283Z-b6a54834`：**52/52、claim 1、失败工具 1（create_proposal 超时阳性）、12 用户轮/19 工具轮、3114.6132ms**。阳性计数不是应归零的故障。完整 scoreboard 留 `.eval-runs/` 供 HQ 择要入库。

### 测试数字与剩余边界

- 六场景 **6/6，52/52**；harness/量表自测 **14/14**；typecheck PASS；live dry/list 通过“不许 spawn/fetch/读钥匙库”的自测 guard。损坏场景 2 的原 claim 证据后原断言确实变红。
- Agent 族 **274/274**；client **172 文件、1762/1762**；server/client 构建及运行时边界/性能检查通过。
- Server 全量初跑 **743：740 pass / 3 fail**；其中 Node IPC 文件失败由既有 wrapper 单次隔离复跑 **49/49** 恢复，**最终仍 exit 1**。余两项：`v2SourceMineruWiring.test.ts:60` 的 `python.exe ENOENT`；`v2SourceRegionCells.test.ts:203` 固定 MinerU Python 启动 code 101。保留失败，不安装依赖、不改生产机关或跳过测试，留 HQ 环境补验。重试数字不并入唯一测试分母。
- 按现行 `verify:v2-bn8-runtime` 顺序执行非 git/secrets **23 组件**：22 首次 PASS；docs:check 依次发现 `docs/agent-ops/INDEX.md` 与 `docs/generated/object-inventory.md` 过期，按原生成器仅重生成这两件后补验 **PASS，最终 23/23**。依用户显式边界，未调用包含 git/secrets 的完整串行命令；这两项留 HQ。

未做：LLM 评分器、幻觉率、live 真模型调用、主观验收、git/secrets 收口。未碰 `.git`、未 commit/push/PR/merge、未改 agent 操作指令/权限、未读真实凭据或用户库、未新增动词或依赖。**应用操作说明书：无涉**（只增开发评测命令）。

### D4 第二轮 · live segments 挂账核查实况（2026-09-20）

按 [D4 工单及补遗一](2026-09-20-v14-d4-three-smalls-order.md) 对 live 夹具 segments 播种遗留项补验：**现物通路已证通，零生产/场景/harness 改动，提交 HQ 复核，不自标债务已清**。`harness.ts:65` 两模式共用 setup；`scenarios/03-proposal-journey.ts:22–23`、`06-loop-resilience.ts:41–44` 均在模式分支前执行 `listCourseMaterials → ensureSegmentsForMaterial`。

第一轮 03 live / 03 scripted / 06 live setup 各 **3/3**；本轮补跑 06 scripted setup **3/3**，矩阵合计 **4 份、12/12**。每份均有四种 segments、四条真实 fragment 链接，零 provider turn；请求模式仅传给原场景 setup，外层始终使用真实 scripted 隔离 harness，不进入 live provider 或机器凭据路径。原 `--live --dry-run` **13 场景计划、exit 0** 只表示计划通路，不冒充播种证据。

claim 实现稳定后的完整 `npm.cmd run eval:agent`，最终 run `2026-09-20T18-27-45-687Z-0eb7f14d`：**13/13 场景、122/122 断言、0 失败、exit 0**，36 用户轮 / 29 工具轮。其中 03 **6/6**、06 **11/11**；02 空头支票仍为 **4/4、claim 1**，09 记忆直令仍为 **5/5、claim 0**。未执行真实模型；未对模型能力作评分或主观放行。证据见 [D4 live segments audit](../../audits/2026-09-20-d4-smalls-builder/eval-segments.md)，原始日志和完整结果位于 `.codex-tmp/d4-smalls/r2-eval-*`。
