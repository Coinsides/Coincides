> **状态 (Status)**: active
> **层 (Layer)**: 验证证据 / Builder evidence
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否；施工回执见工单 Result，放行留 HQ

# Prompt 缓存施工证据

工单：[prompt-cache-order](../../agent-ops/handoffs/2026-09-14-v14-prompt-cache-order.md)。本目录仅放复跑脚本、发现与计数摘要。原始输出、逐轮记录与开工快照仅留 `.codex-tmp/2026-09-14-prompt-cache-builder/`；没有将上单原始日志复制进来。

## 断点与 SDK 依据

安装版本为 `@anthropic-ai/sdk 0.79.0`，未升级依赖。`resources/messages/messages.d.ts` 的 `CacheControlEphemeral`、`TextBlockParam`、`Tool` 以及 `MessageCreateParamsBase.cache_control` 原生声明本次所用字段。

| 请求位置 | 实装 |
| --- | --- |
| `system[0].cache_control` | 非空 system 字符串原文转为单个 text block，标记 `{type:'ephemeral'}`；空字符串保留原表示，不产生空 text block |
| `tools[tools.length-1].cache_control` | 只标记最后一个映射后的 tool，覆盖整段工具前缀；不改变工具顺序、schema 或共享定义，不按工具数量累积断点 |
| 顶层 `cache_control` | 使用 SDK 支持的 automatic caching，在最后可缓存的对话块自动落点并随历史前移；无需重写历史消息 |

三处均使用默认 5 分钟 TTL，最多占 3 个断点槽。自动缓存可与显式块断点并用；模型最低缓存长度、完全相同前缀和回看窗口等条件仍适用。[Anthropic 官方文档](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

本单没有拆分或重排 prompt 内部的动态上下文。orchestrator 在工具循环前构造一次 system，八轮内原样复用；另一次用户对话若上下文变化，会影响 system 及其后缀缓存，独立的 tools 断点仍可复用。消息映射、配对安全过滤及流式回复/工具/错误处理与开工快照一致。

## DashScope 评估（未实装）

官方 OpenAI 兼容示例支持在 `messages[].content[]` 放 `cache_control:{type:'ephemeral'}`，不是把 Anthropic 的 tools/顶层参数直接移植；支持范围需按模型和地域确认。隐式缓存无需额外配置，命中概率不保证；兼容响应的命中字段是 `usage.prompt_tokens_details.cached_tokens`。本仓 `openai.ts`、DashScope 设置、流式 usage 处理均未改，未发 DashScope 请求。[Alibaba Cloud 官方说明](https://www.alibabacloud.com/help/en/model-studio/context-cache)

## 真机读数与收益口径

[live-summary.json](live-summary.json) 记录本次预检：应用正常凭据来源（继承环境、`server/.env`、现有 provider resolver）没有 Anthropic key，**API 请求 0 次**。`cache_creation_input_tokens` 与 `cache_read_input_tokens` 均为 **N/A（未实测，不是 0 命中）**。未遍历其他凭据路径；没有回显 key、mask、尾字符、请求头或 provider 原始错误。

已准备 [live-cache.mjs](live-cache.mjs)：有 key 时执行一次三请求的连续对话，经真实 `AnthropicProvider` 和现有 system/tools，使用纯合成学生上下文；不执行工具或写应用状态。每轮只保留数字 usage、首文本时间、完成/失败状态，不保留模型原文。无 key 时明确跳过。首文本时间不是服务端精确 TTFT，且本单没有无缓存对照，不能据此申报延迟降低比例。

HQ 更正后的静态体来自上单 [token-estimates.json](../2026-09-14-prompt-repair-builder/token-estimates.json)：**4,939–5,874 token**，是字符代理估算，不是 provider usage。以 Sonnet 4.6 的 5m 写入 1.25 倍、命中 0.1 倍输入价格为例，假设八次请求静态体相同且后七次全命中：静态部分从 `8S` 变成 `1.95S`，理论节省 **75.625%**，约 **29,881–35,538 个普通输入 token 的费用等值**。这不含工具 schema、动态上下文、输出、缓存失效或实际 TTFT，不能冒充整轮账单或真机收益。[Anthropic 缓存价格与规则](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)

## 验证与复跑

- [targeted-summary.json](targeted-summary.json)：provider + Agent route **65/65 pass**，0 fail/skip；其中 provider **31/31**，含 3 条新测试。
- [server-full-serial-summary.json](server-full-serial-summary.json)：84/84 文件启动，818 tests / 816 pass / 2 fail / 0 skipped；两处 Python/MinerU 环境失败见 [findings.md](findings.md)。
- [gates-summary.json](gates-summary.json)：21 个非 Git/secrets 门全部运行，首轮 20 项通过，client unit 1 项失败；选区定向复跑 7/7，随后 [client 全量复跑](client-full-summary.json) 171 文件 / 1746 tests 全通过。21 项现均有通过证据；首轮失败未覆盖，见 [findings.md](findings.md)。最终构建/接线/文档核对见 [closeout-summary.json](closeout-summary.json)。
- 三条新增测试经真实 SDK + 本地 fetch/SSE 桩验证三断点、6 tools 仅末项、空 system/tools、8 轮增长历史、输入对象不变、错配过滤以及原有文本/工具事件顺序。没有用桩的 usage 冒充真机读数。

从仓库根执行以下模式（每项独立运行）：

```powershell
node docs/audits/2026-09-14-prompt-cache-builder/run-validation.mjs targeted
node docs/audits/2026-09-14-prompt-cache-builder/run-validation.mjs server-full-serial
node docs/audits/2026-09-14-prompt-cache-builder/run-validation.mjs gates
node docs/audits/2026-09-14-prompt-cache-builder/run-validation.mjs closeout
node docs/audits/2026-09-14-prompt-cache-builder/run-validation.mjs client-selection
node docs/audits/2026-09-14-prompt-cache-builder/run-validation.mjs client-full
```

执行器沿用既有 server 测试 runner，动态枚举 `server/src` 与 `server/scripts` 的全部 `.test.ts` 并逐文件运行；不筛选用例、不豁免文件。采用内存 DB、空 dotenv/Vite env、独占系统临时 appdata/assets/uploads；凭据库按现有规则必须在仓外，原始日志则始终在本单 `.codex-tmp/`。临时清理前检查绝对路径归属。测试子进程仅继承系统路径环境，不继承真实凭据。

真机复跑从 `server/` 执行；先准备现有运行时 manifest，再执行探针：

```powershell
npm run check:tool-face-manifest
npm run copy:tool-face-manifest
node --import tsx ../docs/audits/2026-09-14-prompt-cache-builder/live-cache.mjs
```

## 边界

完整 `verify:v2-bn8-runtime` 未直接运行；本次执行其前 21 个非 Git/secrets 子检查，尾部 `git diff --check` 与 `check:changed-file-secrets` 按用户明确分工留 HQ。未改机关、注册表、package、依赖或 agent 指令，未运行 git、未碰 `.git`、未 commit。本单 numstat 以开工快照计算（派生 INDEX 采用刷新前快照），不冒充整个工作区的 Git 差异。
