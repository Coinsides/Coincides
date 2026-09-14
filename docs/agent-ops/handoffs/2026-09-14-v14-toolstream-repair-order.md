> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · 工具流修复单(空枪三处+流边缘)
> **上游**: claude-log §147 provider 路审计(空参三连真凶坐实,行号在案)

# 工具流修复单

**性质**:openai.ts 参数拼装把"累积为空"与"解析失败"静默吞成 `{}`,orchestrator 真值判断再吞增量——修"无声空枪"全链。⛔改 chunk 契约形状(types.ts 语义不动),行为修复+可观测。

## 一 · 修复清单

1. **openai.ts 吞错**(~119-125/170-177):解析失败或累积为空=⛔静默 `{}`——发 tool_call_end 时附错误标记(或 error chunk),内容含工具名/finish_reason/原始串长度与前缀(**⛔记录完整参数原文**,防敏感);orchestrator 将其转为 ToolResult 错误喂回模型(模型可见可自纠);
2. **finish_reason 捕获**:读 choices[0].finish_reason;`length`=参数被截断,按 1 的错误路处理并注明截断;请求体显式设 max_tokens(与 anthropic 16384 对齐,申报取值);
3. **index 校验**:`typeof index === 'number'` 校验;缺失时挂到最近注册的调用(OpenAI 续块惯例)⛔挂 undefined 键;
4. **name/id 迟到补登**:后续 delta 携 name/id 而存值为空时补登;fallback id 全局唯一(随机+流内序)⛔跨轮碰撞;
5. **parallel_tool_calls 显式 true**(dashscope 默认关);
6. **SSE 边缘**:读尽后残余 buffer 补解析+decoder 终刷;`data:` 前缀放宽 `/^data:\s?/`;
7. **orchestrator L177 真值坑**:`chunk.tool_call?.arguments` 改语义判空——非空对象才采用;否则解析累积 JSON;解析败=生成工具级错误结果(⛔静默空参);
8. **SSE 事件带 id**:routes/agent.ts tool_start/tool_end 载荷加 tool_call id+tool_end 加 ok 标志(client AgentPanel 兼容改动申报,展示可后续)。

## 二 · 验收

定向:①空串/坏 JSON/截断三情形→模型收到可读错误⛔空参落地②并行同名调用 id 区分③index 缺失回落④parallel 显式⑤anthropic 路零回归;既有 agent/provider 测试全绿;server 全量+client 全库;真机冒烟(隔离库):重放"整理笔记"类长参数场景,空枪率=0 或错误可见。证据落 `docs/audits/2026-09-14-toolstream-repair-builder/`;git/secrets HQ 收口。

## 三 · 禁区与申报

⛔改工具语义/注册表/机关;⛔新设计安全对抗类用例;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;合成凭据 ≤20 字符。Result:逐处修复行号申报+三情形测试证据+未做项。冲突停线举证。

## Result

**Codex builder · 2026-09-14**：清单八项及 Henry 附加的 organized_note 回执话术已完成。`status=done` 表示本单施工与证据回填完成；Python/MinerU 环境红、Git/secrets 和放行仍留 HQ，不申报完整总门全绿。

### 逐处修复与行号

| 项 | 实现位置 | 完成行为 |
| --- | --- | --- |
| 1 · 空串/坏 JSON 不再吞成成功 `{}` | `server/src/agent/providers/tool-arguments.ts:L7、L20`；`server/src/agent/providers/openai.ts:L187`；`server/src/agent/orchestrator.ts:L187、L236` | 统一参数解析；失败的 `tool_call_end` 使用现有 `error` 字段，转为对应 ID 的 ToolResult 错误，跳过 executor。错误调用仍保留 assistant/tool-result 配对，历史中的 `{}` 仅为错误调用协议占位，不会落入执行器。 |
| 诊断范围 | `tool-arguments.ts:L13` | 含工具名、finish_reason、原串 JS 长度、最多 32 个 UTF-16 code units 的前缀；短串也至少省去末一个 code unit，不完整回显参数，不引用 JSON.parse 异常原文。 |
| 2 · finish_reason 与预算 | `openai.ts:L76、L126`；`tool-arguments.ts:L25` | 独立捕获 finish-only 帧；`length` 即使参数恰好是合法 JSON 也按截断报错。显式 **`max_tokens=16384`**，与 Anthropic 对齐。 |
| 3 · index 校验与回落 | `openai.ts:L135、L140` | 校验 number、整数、非负；缺失/无效值归最近**注册**的调用，首个缺 index 的调用使用数值 0；不建 undefined 键。 |
| 4 · name/id 迟到与 fallback | `openai.ts:L107、L143、L149、L181` | 空 name/id 后续补登；身份补齐前缓存参数，随后一次回放，start/delta/end 保持同一 ID。始终缺 ID 时采用每流随机 UUID + 流内序号，跨轮不重复。 |
| 5 · parallel 显式 | `openai.ts:L80` | 有工具定义的请求显式 **`parallel_tool_calls=true`**；无工具请求不附工具开关。 |
| 6 · SSE 边缘 | `openai.ts:L113、L162、L166` | `/^data:\s?/` 支持无空格/单空白；decoder 在 EOF 终刷，残留最后一行补解析；DONE 与无 DONE 的收尾复用同一参数解析路径。 |
| 7 · orchestrator 语义判空与并行累积 | `orchestrator.ts:L146、L148、L184` | 仅采用非空对象；否则解析对应调用 ID 的累积 JSON。空/坏串进入工具错误链；合法原串 `'{}'` 仍可用于无参工具。由单个临时槽改为按 ID 累积，避免并行同名调用覆盖。 |
| 8 · SSE ID/结果状态 | `server/src/routes/agent.ts:L110、L112`；`orchestrator.ts:L249、L270、L278` | `tool_start={id,name}`；`tool_end={id,name,ok}`。参数错误、executor 返回 `{error}`、executor 抛错都产生 `ok:false`；正常结果为 true。 |
| Anthropic 兼容补偿 | `server/src/agent/providers/anthropic.ts:L123、L135、L147、L160、L182` | 复核发现：合法无参工具可能只有起始 `input:{}`、没有 JSON delta。现仅在收到初始对象且从未收到任何 JSON delta 时回放初始 JSON，供共享累积逻辑解析；收到任何 delta 后均不回退初始 input。正常非空流与无参流均有 HTTP 集成回归。 |
| Henry 附加项 | `server/src/agent/tools/executor.ts:L285` | organized_note 成功回执改为 Agent panel 的 **Proposals inbox（「提案」收件箱）**，不再指 project materials review/apply。 |

`providers/types.ts`、工具定义/注册表、守卫与确认/授权/撤销机关、package scripts 和依赖均未修改。client 没有兼容性改动：`client/src/stores/agentStore.ts:L186` 的既有处理忽略新增字段，`AgentPanel` 仍展示单个工具名；按 ID 展示并发与使用 ok 呈现失败态留后续，未冒充已完成展示。

### 三情形与定向证据

新增普通功能回归 **28 条**，全部合入已有接线的测试文件，未增加或排除安全对抗用例：`providers/index.test.ts:L148` 起 15 条；`__tests__/v14ContextHint.test.ts:L406` 起 13 条。另在既有 `v14AgentVerbTransfer.test.ts:L271` 的 8 个 HTTP 成功流程断言 id/ok，并在既有 `v14ProposalUnification.test.ts:L258` 断言收件箱回执。临时新建的独立 provider 测试文件已撤回，其全部用例保留在 `index.test.ts`，没有修改接线门、package 或豁免表。

| 情形 | 协议层与 HTTP 断言 | 证据位置 |
| --- | --- | --- |
| 空串 | DONE/EOF 两种收尾均有工具错误；真实 route 的下一轮模型请求含对应 ToolResult，SSE ok=false，deck/events/operation_batches 均零新增 | `index.test.ts:L240`、`v14ContextHint.test.ts:L519`；定向日志中的 `empty arguments` |
| 坏 JSON | 不静默变空对象；错误持久化与下一轮喂回相同，零实体/收据新增；orchestrator 自身收到 end.arguments={} 也不能吞掉坏累积 | 同上；`v14ContextHint.test.ts:L573` 起；日志中的 `unfinished JSON` / `unfinished accumulated JSON` |
| 截断 | finish-only `length` 可识别，甚至完整合法 JSON 仍拒执行并明确 `truncated`；模型可随后提交正确调用成功 | `tool-arguments.ts:L25`、`v14ContextHint.test.ts:L519、L537`；日志中的 `length truncation despite valid JSON` |

上述两份 provider/Agent route suite 定向 **62 tests / 62 pass / 0 fail / 0 skipped**。涵盖并行同名 ID、index 缺失、name/id 迟到、跨轮 fallback 唯一、SSE 无空格/UTF-8 分块/EOF 残行、显式预算/parallel，以及 Anthropic 两条正常链路。[定向 summary](../../audits/2026-09-14-toolstream-repair-builder/targeted-2026-09-14T07-19-40-098Z-30224/summary.json)，原始 `04-targeted.log` 同目录。

### 全量、验证门与隔离冒烟

- **server 全量**：动态枚举 `server/src` + `server/scripts`，全部 **84/84 文件实际启动**，零文件豁免、零用例过滤。首轮 Node 多文件测试 IPC 反序列化异常，保留日志并逐文件重跑全量；最终 **82 文件通过、2 文件环境失败，815 tests / 813 pass / 2 fail / 0 cancelled / 0 skipped**。原 IPC 失败的 `v2MaterialLibrary.test.ts` 逐文件通过；所有 Agent/provider 文件通过。计数包含 Python 顶层启动失败的一条文件级失败，其内部用例没有展开，不冒充已通过。[逐文件 summary](../../audits/2026-09-14-toolstream-repair-builder/server-full-serial-2026-09-14T07-23-41-188Z-10420/summary.json) 与 [aggregate](../../audits/2026-09-14-toolstream-repair-builder/server-full-serial-2026-09-14T07-23-41-188Z-10420/aggregate.json)。
- **client 全库**：**171 文件 / 1746 tests 全通过**，同次运行即 runtime 门的 `test:unit`，未重复缩减口径。[gates summary](../../audits/2026-09-14-toolstream-repair-builder/gates-2026-09-14T07-15-39-975Z-35160/summary.json)，`04-test_unit.log` 同目录。
- **runtime 验证门**：完整执行前置的 **21 个非 Git/secrets 子检查**。首次接线门因临时新测试文件失败，布局修正后独立复跑 **84/84 wired、0 exempted、0 unwired，PASS**；其他 20 项均通过，server/client 构建通过。[接线复跑与最终 server build](../../audits/2026-09-14-toolstream-repair-builder/closeout-2026-09-14T07-20-11-507Z-38764/summary.json)。未直接执行总命令尾部两项 Git/secrets，不能称完整总门全绿；按本单明确分工留 HQ。
- **隔离长参数冒烟**：本机真实 HTTP 分块兼容 provider → OpenAIProvider → orchestrator → executor → organized_note 服务 → 内存 SQLite → pending inbox API；384 份普通合成材料。**15110 字符成功**创建 1 条 pending 提案，`generation_mode=ai`，384 个 source materials、1 个 block，收件箱 API 可见且回执指向正确；**15091 字符截断**向模型返回可读错误，SSE 同 ID/ok=false，0 提案、0 内部生成请求。**空枪 0/2**。5 次本机 provider 请求均 max_tokens=16384，有工具的 4 次均 parallel=true；同时重放了迟到 name/id、缺 index 续块、无空格 data、EOF 残行和 127-byte HTTP 写块。[结果 JSON](../../audits/2026-09-14-toolstream-repair-builder/smoke-long-arguments-result.json)，[可复跑脚本](../../audits/2026-09-14-toolstream-repair-builder/smoke-long-arguments.ts)。

证据总入口：[README](../../audits/2026-09-14-toolstream-repair-builder/README.md)。所有验证采用独占临时环境、空 dotenv/Vite env、内存 DB 与隔离 provider store；没有读真实 `.env` key、用户库或机器凭据。新造凭据形合成值 ≤20 字符。未运行任何 git 命令，未触碰 `.git`，未 commit、push、PR 或新增依赖；未改工具语义/注册表/机关。

### 未做项 / HQ 留项

1. **Python/MinerU 环境红，按 Henry 本轮指令留 HQ**：`v2SourceMineruWiring.test.ts:L60` 顶层启动 `python.exe` 报 `ENOENT`，内部用例未展开；`v2SourceRegionCells.test.ts:L203` 的 MinerU 启动报 code 101 / `Unable to create process`，未到几何断言。两条全量与逐文件均保留失败，未换解释器、安装依赖、改期望或排除测试。具体源码/日志行号见 [environment-findings](../../audits/2026-09-14-toolstream-repair-builder/environment-findings.md)。
2. **Git/secrets 收口**：`git diff --check` 与 `check:changed-file-secrets` 均未执行（后者会调用 git），按工单留 HQ；不存在 commit。
3. **外部模型与浏览器体验**：本机冒烟为合成 provider 的实际应用链路重放，`liveModelCall=false`、`authenticatedBrowserJourney=false`；没有调用真实 DashScope/OpenAI/Anthropic，没有登录真实用户或浏览器主观验收。0/2 仅适用于本次两次重放，不外推真实模型空枪率。
4. **client 展示**：SSE 已带 id/ok，现有消费者兼容；并发身份/失败态的面板展示未扩做。HQ/Fable 主观放行未代做。
