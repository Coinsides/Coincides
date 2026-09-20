# C4a 二轮：UI 动词与收据证据

2026-09-20 · Codex builder 子任务回执。依据工单「补遗一」；不是 HQ 放行。本文仅覆盖服务端、共享协议、两动词相关 prompt/注册投影与定向场景；客户端、说明书及全量验证由主线程汇总。

## 注册与不变边界

- `server/src/toolFace/uiActions.ts:24` 单独注册 `AGENT_UI_TOOLS`，只有 `ui_open_note`、`ui_focus_object`。不加入 `AGENT_ACTION_TOOLS`，不扩大域写权；internal exposure，scopes 仅既有 `notes:read` / `boards:read`。总注册表由 35 → 37，provider definitions 由 41 → 43；公开 MCP 面仍 14 项。
- `server/src/agent/tools/effectClassification.ts:7` 将这两项机械投影到 channel_write：该集合由 2 → 4；原 door_write / read 的成员与语义零变，read 仍 22 项。分类是向人发出的呈现请求，并非内容、布局、判断写入；没有第四类。完整性闸继续核验漏项、陈旧、交叠与重复。
- `shared/types/agentUiCommand.ts:2` 定义仅会话流通的协议；`server/src/agent/tools/uiCommands.ts:27` 复用 owned note / block / page / board 读取器解析目标。没有 schema、迁移、真相表、域写门、权限配置或新依赖变化。
- 既有 server/shared 运行时边界禁止产品端 runtime import shared；服务端只 import type。8/1000 常量由普通跨端合同测试对齐，不改变该门。

## 协议、频控与收据

`ui_open_note` 输入 `{note_id}`；`ui_focus_object` 输入 `{target}`，target 是下列之一：

| target.type | 必需身份 |
|---|---|
| `note_block` | `note_id, block_id` |
| `note_page` | `note_id, page_index`（零基） |
| `board_member` | `board_id, member_id`（已放置且所在层可见） |

SSE `ui_command` 为 `{command_id, turn_id, conversation_id, kind, target}`；kind=`open_note` 或 `focus_object`，open_note 的 target 为 `{type:'note', note_id}`。成功仅表示 issued/dispatched，**不表示客户端已经应用或人已看见**；工具结果与 prompt 明说客户端可因人正在输入而延后。历史消息只投影收据，不重放导航。

- 每次 `runAgent` 建独立状态，**一次用户轮次累计最多 8 次实际下发**（跨 provider 工具轮共用）；同动词同目标 **1000 ms** 内防抖。防抖返回 `dispatched:false, reason:'debounced'`，无 command，不消耗额外次数；现有调用/结果收据照记幂等成功。超额显式失败；下一轮重新计数。
- 隐藏 Base 或命名层成员返回 409，缺失/未放置成员返回 404；不打开可见性、不写 viewport、不创建对象。
- `orchestrator.ts` 先事务保存调用/结果对，再发 `tool_end` 与 `ui_command`；已中断的轮次将尚未下发 UI 结果改成失败并保存，不假记成功。统一 turn receipt 仍从已提交历史派生，两动词进入既有 channel_write 收据路径。
- `routes/agent.ts` 为既有 tool_start 追加可选 `target_activity`（仅现有已解析参数里的 note_id/board_id 或 target 对应字段），供标签在场徽章读现役调用生命周期；没有新持久活动机关。tool_end 结构保持原样。
- `server/src/agent/uiPrompt.ts` 是本单唯一新增操作说明段。现役 prompt 的还原 SHA-256 门保持原值；自动 roster 只新增两个授权名称；原产品说明估计上限 **2000** 未放宽。

## 定向场景断言

测试源：`server/src/__tests__/v14UiCommands.test.ts`。全部使用临时 `:memory:` 数据库，stub provider，不读用户库、不调用真实模型。唯一新合成凭据 `syn-ui`（6 字符）。

| 场景 | 断言 |
|---|---|
| 注册与分类 | 恰好两个独立 UI 动词；原 door/read 集不变；43 项完整性闸；两端 8/1000 相等 |
| 四种合法目标 | 打开笔记、块、页、板成员都产生带本轮身份的 issued command；全表逐行快照不变，`total_changes()` 也完全不变 |
| 反例 | 笔记/块/页/成员不可用、缺失轮次 context 均失败；无 dispatch、全表不变 |
| 防抖与频控 | 1 秒内同目标第二次无 command；共用 8 次上限；第 9 次另一动词失败；新轮恢复额度 |
| 隐藏成员 | 隐藏 Base 与命名层都显式失败；可见性及全部域状态逐行不变 |
| **scripted SSE 完整场景** | 6 次调用：四种合法目标、1 个超范围页、重复打开笔记；实际 **4 条 ui_command**；收据 **5 成功 / 1 失败**（含1次幂等防抖成功），read=0；每条 command 发出时已查到对应已提交结果；调用 ID、turn ID、历史/实时收据一致；所有表除聊天消息/会话行外逐行不变；末尾 done |

最终联测：UI 6 + contextHint 35 + claimReceipt 26 + knowledge projection 9 = **76 / 76 PASS**，文件预算 `--test-timeout=600000`，0 skip / cancel / flaky retries。原始日志 `.codex-tmp/c4a-shell/ui-verbs-final-integration-3.log` 及同名 `.result.json`。全量 server/client 不在本子任务重复执行，交验证线程汇总。

## 编译与运行时闸：原命令与替代分开记

| 检查 | 实际结果 / 原始记录 |
|---|---|
| manifest `--check` 与 copy | 真 exit 0；`ui-verbs-final-manifest-check.log`、`ui-verbs-final-manifest-copy.log` |
| server/shared runtime import gate | PASS，`ui-verbs-shared-runtime-gate.log` |
| 原 shared `tsc --build` | **未通过**：写 `shared/dist` 的新声明/JS及 buildinfo 得到 EPERM；`ui-verbs-shared-typecheck.log`。只读检查：目录非symlink、文件非ReadOnly、列出的ACL均Allow；无自动审批拒绝消息，原因未归因，未改权限或配置 |
| 原 server `tsc --noEmit` | **未通过**：新 shared 模块未生成声明导致 TS6305；`ui-verbs-server-typecheck.log`。原 server build 不含 shared prebuild；不能把替代检查记成原 build PASS |
| shared 替代编译 | PASS；保持原严格选项，输出到授权临时目录 `.codex-tmp/c4a-shell/shared-build`；`ui-verbs-shared-alternate-build.log` |
| server + shared 全源 noEmit | PASS；临时 config 继承原 server 严格选项，包含原两端源，references=[]避免未生成引用声明，`ui-verbs-source-typecheck.log` |
| server + shared 严格实际 emit | PASS；同样源/选项，rootDir 指根目录、outDir 仅 `.codex-tmp/c4a-shell/server-build`，真实生成 436 JS + 436 declarations 及映射；临时配置 `ui-verbs-build-tsconfig.json`，日志 `ui-verbs-server-alternate-build-final.log` |

初轮定向 fixture 缺调用者事务导致4个失败，修复 fixture 后40/40通过；全量随后揭出新增 prompt 超预算及 read_note 的 tool_start 新字段期望未同步，分别压缩**仅本单新增**段、精准增加已知 note_id 期望后76/76通过。保留所有失败日志，没有删用例、扩大预算或过滤未知字段。首次 PowerShell `*>` 对既有 Zod warning 产生 NativeCommandError 包装，manifest 实际已生成；后续统一用临时 Node runner 将 stdout/stderr直接写日志，旁存真实 process exit code。

## 集成追加：独立第 13 场景、客户端真实接收、知识指纹

1. 已新增标准自动发现路径 `server/scripts/agent-eval/scenarios/13-ui-shell-journey.ts`，并通过现役 runner 跑 **8 / 8**（1条公共传输断言+7条场景断言）。四种目标/6次工具调用、4条 UI command、5成功1失败收据（重复防抖计成功）、工具结束与command先后、target_activity、全体非聊天表逐行不变、零域收据、2个provider回合均有断言。运行 `2026-09-20T17-21-46-874Z-fde64558`；原始 CLI `.codex-tmp/c4a-shell/ui-verbs-eval-13-final.log`，完整结果/SSE/快照复制为同目录 `ui-verbs-eval-13-result.json`。初跑 helper 在每条工具后附done，导致只执行首条（3/8），已按现役多工具场景模式只保留整组最后done；失败记录保留。
2. `server/package.json` 新增 `test:v14-c4a-shell`，显式调用既有 server runner 与 `--test-timeout=600000`，覆盖 `v14UiCommands.test.ts`。`check:test-wiring` 最终通过，见 `ui-verbs-final-test-wiring.log`，没有豁免测试文件。
3. 按主线程追加委派新增 `client/src/stores/agentUiStream.test.tsx`；真实 `sendMessage` 消费受控 `ReadableStream`，未mock store的方法。**5 / 5**：分片 start/end/UI command/receipt/done；板徽章到done清除；网络失败清除；历史 fetchMessages 不重放；并行动词按 call_id 独立清灯。结果 `ui-verbs-client-sse-final.log`。该联测发现客户端 catch 残灯、单值activity无法表示并行目标；主线程修复产品实现为 call_id 活动表后通过，本子任务仅修改新测试。client库不支持 Array.at，测试已用下标兼容原配置。
4. 知识指纹首次更新被旧戳 `v1 / 2026-09-20` 拒绝，原日志 `ui-verbs-knowledge-update.log` 保留；说明书由主线程升 **v2 / 2026-09-20** 后，显式 `--update` 与普通check均 exit 0。新hash：`85acce270a2224893e4c011ce4e46e1625f01d5ceba81f7f393cca7aa2a78b15`。事实差集仅注册表、channel_write、provider definitions各增加两UI动词，退出0、door/read集合0变；记录见 `ui-verbs-knowledge-update-2.log`、`ui-verbs-knowledge-check.log`。
5. 最终严格 server/shared 替代emit另跑 `ui-verbs-server-final-build.log`；它仍是前述授权临时输出编译，不能替代声称原 `shared/dist` 命令成功。标准场景harness、脚本typecheck及全量汇总由verification线程复核。
