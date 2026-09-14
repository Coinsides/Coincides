> **状态 (Status)**: done(施工与证据回填完成；真机命中与环境红项留 HQ)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · prompt 缓存单(cache_control)
> **上游**: claude-log §147(8 轮×~7K 静态体零缓存,TTFT+成本可砍 60-90%)

# prompt 缓存单

**性质**:anthropic.ts 加 cache_control ephemeral 断点——system 静态块+tools 数组+对话前缀;8 轮循环是缓存的理想形状。小改,大赚。

1. anthropic.ts:system 与 tools 设 cache_control(SDK 现版语法,申报);对话前缀断点按 SDK 支持度裁量(申报做/不做及原因);
2. openai 路:dashscope 兼容层若支持上下文缓存参数则申报评估,⛔本单实装(不同机制);
3. 验收:定向断言请求体含 cache_control;anthropic 路行为零变(回复/工具流);server 受影响面+全量;真机一次多轮对话,申报 usage 中 cache 命中字段读数(有 key 机器);
4. 禁区照常(⛔机关/⛔注册表/⛔.git/⛔commit/⛔key 值/⛔新依赖;合成凭据 ≤20)。Result:断点位置+命中读数+测试数字。冲突停线举证。

## Result

**Codex builder · 2026-09-14**：Anthropic 缓存施工完成，SDK 原生语法、请求体和行为回归已验；`done` 表示施工与回填，不代表完整验收放行。server 全量两处 Python/MinerU 环境红、Anthropic 真机前置与 Git/secrets 收口明确留 HQ。

### 交付清单与断点

| 位置 | 交付 |
| --- | --- |
| `server/src/agent/providers/anthropic.ts:112` | 仅最后一个映射后的 tool 加 `cache_control:{type:'ephemeral'}`，覆盖全部工具前缀；不改变工具顺序、schema、共享定义 |
| `anthropic.ts:120` | 非空 system 原文转成一个 text block 并加 ephemeral；空字符串沿用原表示，避免造空文本块 |
| `anthropic.ts:124` | 请求顶层 ephemeral：**对话前缀已做**，由 automatic caching 在最后可缓存块落点并随历史前移；无需修改消息整理逻辑 |
| `server/src/agent/providers/index.test.ts:427、456、471` | 新增 3 条真实 SDK + mock fetch/SSE 定向测试，涵盖三断点、6 tools 仅末项、空 system/tools、8 轮历史、输入不变、安全配对过滤、回复/工具事件顺序；更新已有工具请求断言 |
| `docs/audits/2026-09-14-prompt-cache-builder/` | README、findings、验证/真机复跑脚本以及 7 份 summary；目录内无原始日志 |
| `docs/agent-ops/INDEX.md` | 现有生成器仅同步本工单 ready→done 状态行；其余 8 个索引无变化，未改生成器 |

安装 SDK **0.79.0** 的 `TextBlockParam`、`Tool`、`MessageCreateParamsBase.cache_control` 与 `CacheControlEphemeral` 已声明上述语法。显式 tools/system + 自动对话断点最多占 **3/4** 槽，默认 TTL **5m**；未加 beta header、未换依赖。消息映射/安全过滤与完整 stream/error 处理相对开工快照一致。[SDK 及官方依据、缓存失效边界](../../audits/2026-09-14-prompt-cache-builder/README.md)

**OpenAI/DashScope 路只评估，未实装**：官方兼容示例允许在 messages 的 content block 设置 ephemeral；隐式缓存不需开关，命中不保证，字段为 `usage.prompt_tokens_details.cached_tokens`。模型/地域支持需单独确认，不能直接移植本次 Anthropic 顶层/tools 语法。`openai.ts` 和相关设置未改，未调用 DashScope。[评估与来源](../../audits/2026-09-14-prompt-cache-builder/README.md)

### 命中读数与 HQ 基数修正

- 真机预检时间 **2026-09-14T07:42:53Z**；应用正常来源（继承环境、server/.env、现有 provider resolver）未解析到 Anthropic key，**外部请求 0 次**。`cache_creation_input_tokens=N/A`、`cache_read_input_tokens=N/A`，不是观测到 0 命中；未遍历其他凭据位置、未回显任何 key 值或尾字符。[live-summary](../../audits/2026-09-14-prompt-cache-builder/live-summary.json)
- [live-cache.mjs](../../audits/2026-09-14-prompt-cache-builder/live-cache.mjs) 留给有 key 的机器：一次三请求连续对话，真实 adapter + 现有 system/tools + 合成上下文；不执行工具或写用户数据。仅保留 usage 数字、首文本时间和状态，失败即停，禁自动重试；复跑前按 README 准备既有 manifest。
- 采用上单修缮后 **S=4,939–5,874 token** 字符代理估算，未沿用 §147 的旧 ~7K。按 Sonnet 4.6 5m 写入 1.25 倍/读取 0.1 倍、八轮且后七轮全命中的假设，静态部分 `8S→1.95S`，理论节省 **75.625%**，约 **29,881–35,538 普通输入 token 的费用等值**。这不是实测 usage、整轮成本或 TTFT 降幅；动态上下文、tools、输出与失效未计入。[详细口径](../../audits/2026-09-14-prompt-cache-builder/README.md)

### 测试数字

| 验证 | 实跑结果 |
| --- | --- |
| provider 定向 | **31/31 pass**，含 3 条新增；无 fail/skip |
| server 受影响面（provider + Agent route） | **65/65 pass**，0 fail/cancelled/skipped；[summary](../../audits/2026-09-14-prompt-cache-builder/targeted-summary.json) |
| server 全量 | 两树动态发现 **84/84 文件全部逐文件启动**，82 文件通过、2 文件环境失败；**818 tests / 816 pass / 2 fail / 0 cancelled / 0 skipped**。其他 .test/.spec 后缀 0；不滤用例、不豁免；[summary](../../audits/2026-09-14-prompt-cache-builder/server-full-serial-summary.json) |
| runtime 非 Git/secrets 门 | **21 项全部执行**。首轮 20 项通过，client unit 一项失败；其他门含 registry **5/5**、manifest **10/10**、parity **10/10**、接线 **84 wired / 0 exempted / 0 unwired**、两端构建均通过；[首轮 summary](../../audits/2026-09-14-prompt-cache-builder/gates-summary.json) |
| client 首轮及复跑 | 首轮 **171 文件 / 1746 tests，1745 pass / 1 fail**（板面选区工具栏）。不改代码/测试/参数，定向 **7/7**；随后同配置全量 **171 文件 / 1746 tests 全通过**。21 门现均有通过记录，首轮失败未覆盖；[全量复跑](../../audits/2026-09-14-prompt-cache-builder/client-full-summary.json) |
| 收尾核对 | shared build、接线、server build、文档检查 **4/4 pass**；[summary](../../audits/2026-09-14-prompt-cache-builder/closeout-summary.json)。Result 回填后文档门先报本单状态索引过期；现有生成器同步该行后最终复验通过，原始记录为本单临时目录的 `docs-final.log`、`docs-index-refresh.log`、`docs-final-recheck.log` |

**仍红的两项**：`v2SourceMineruWiring.test.ts:60` 顶层 `python.exe ENOENT`（内部用例未展开）；`v2SourceRegionCells.test.ts:203` MinerU code 101 / `Unable to create process`（未到几何断言）。与上单同形，未改配置/依赖/期望使其变绿。client 选区失败的初始化时序仅为待证假设，复跑通过不等于已修复。[发现与原始日志定位](../../audits/2026-09-14-prompt-cache-builder/findings.md)

### numstat 与证据纪律

以下为**本单快照的行级 LCS numstat（统一 CRLF/LF）**：源文件/工单对开工快照，派生 INDEX 对刷新前快照，新证据对空文件。没有运行 git，不冒充工作区整体差异；不计已有其他改动、临时件及构建派生输出。量具与逐文件 SHA 留在 `.codex-tmp/2026-09-14-prompt-cache-builder/measure-scope.mjs` 和 `scope-summary.json`。

| 文件/范围 | added | deleted |
| --- | ---: | ---: |
| `server/src/agent/providers/anthropic.ts` | 10 | 1 |
| `server/src/agent/providers/index.test.ts` | 137 | 4 |
| 本工单（状态头 + Result） | 61 | 1 |
| `docs/agent-ops/INDEX.md`（派生状态行） | 1 | 1 |
| 本单证据目录 11 文件（README/findings、2 脚本、7 summaries） | 4302 | 0 |
| 合计 15 文件 | 4511 | 7 |

全部原始跑批日志、逐轮记录与开工快照只留 **`.codex-tmp/2026-09-14-prompt-cache-builder/`**；`docs/audits/` 本单目录只有蒸馏件。测试采用空 dotenv/Vite env、内存 DB 和独占临时资产/凭据库；新合成凭据均 ≤20 字符。

### 未做项 / HQ 留项

1. 真实 Anthropic 多轮命中及 TTFT/成本实测：正常凭据来源无 key，留有 key 机器跑已交付脚本；不使用 mock 冒充。
2. 两处 Python/MinerU 环境红，及 client 初始选区失败的根因修复：本单只留证据，未扩改环境、client 或测试机关。
3. `git diff --check` 与 `check:changed-file-secrets` 按用户指示留 HQ，因此不宣称完整 `verify:v2-bn8-runtime` 全绿。**未运行任何 git 命令，未碰 `.git`，未 commit/push/PR/merge**。
4. DashScope 缓存实装、共享 usage 接口/UI 展示、prompt 动态段拆分、1h TTL、模型/依赖升级均未做；未改注册表、机关、权限指令或凭据配置。放行与主观验收仍由 HQ/Fable 决定。
