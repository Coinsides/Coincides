> **状态 (Status)**: active
> **层 (Layer)**: builder 验证收据
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否；产品事实仍以操作说明书为准

# V14 Agent 产品说明 · builder 证据

本单实现仅修改 [system-prompt.ts](../../../server/src/agent/system-prompt.ts) 与既有 [v14ContextHint.test.ts](../../../server/src/__tests__/v14ContextHint.test.ts)。新增「产品说明」节，同时修正原提示词中三处指向不存在的 Proposal panel 的句子；未改工具、注册表、执行机关、依赖或说明书。工单 Result 保存新节全文。

## 事实来源与兼容性

内容权威：[app-operating-manual.md](../../agent-ops/current-state/app-operating-manual.md)，active v1。

| 新节内容 | 说明书依据 |
|---|---|
| 笔记块序列、封面、板投影、卡片提案唯一、两库与上传建议 | 〇、一、二、四 |
| chat 提案无可见界面、材料三型项目页处理、apply 仍须人门 | 〇、三、五；工单一·2允许询问 chat 确认 |
| 写动作凭工具成功与收据/事件、失败说明、save_memory | 五；工单一·3明确失败和保存纪律 |
| 用户原话确认任务完成、删除时间块两段复述确认 | 五；工单一·4要求提前说明流程 |
| 笔记正文、直建卡、人类判断、无仪式不可逆删除边界 | 一、五 |

新增 8 项测试：五类关键词断言、旧提示词兼容、长度预算、Source 问答接线。沿用既有测试文件及 fixture，原有 5 项回归未删除、未排除；该文件现有 13 项。未新增安全对抗用例。

旧提示词兼容使用修改生产文件前捕获的 6 份渲染 SHA-256：空/非空课程、空 code、记忆、材料、卡组有/无分区、缺省/空 decks、中文/英文/跟随语言、L1 开关、energy 输入均在固定输入矩阵中。测试仅剥掉新节，并复原明确列出的三句旧面板指引，然后验证整个旧输出逐字节一致；因此课程/卡组/语境/L1 等其余内容未变。hash 与输入保存在测试内。

| 文件 | 修改前 SHA-256 | 完工 SHA-256 |
|---|---|---|
| system-prompt.ts | cfaa899389dbabaa594d3a986453fe93ac8615aef32c334af6a822eb1438e11c | ebbdad96cf59113b6774e86f1a4d61fffba9c9320eba27be2eacb1e2fe765b58 |
| v14ContextHint.test.ts | d4af5b4f7c0190c51e169809ebc0874ab5c54d787385577229c5c0337c57778b | d091f7e96002cc216ea86b1daedbb94a26729470af60cc5318c32e18093d2168 |
| app-operating-manual.md | 339659bc3533c34767d159e3a30964697c4844096b1ba06ee7da1d4ef2de857f | 339659bc3533c34767d159e3a30964697c4844096b1ba06ee7da1d4ef2de857f |

新节含标题和分隔空行为 **951 Unicode 字符**：525 汉字、426 其他字符。以汉字每字 1–2 token、其他每 4 字符约 1 token 粗估，约 **632–1157 token**；测试预算为估计值不超过 2000。未安装 tokenizer、未调用真实模型，此数不是精确计费 token。空语境整个 prompt 从 22642 增至 23759 字符，净增 1117，包含三句面板修正。

## 行为抽测

输入：`你能读我 Source Library 里的文件吗`。

沿用内存 SQLite、合成 post-auth 用户、空临时凭据目录、OpenAIProvider stub，通过真实 `/api/agent/conversations/:id/messages` 路由走 orchestrator。stub 首先检查收到的新节包含 Source Library 边界及材料库上传建议，再返回：

> 目前我不能检索或读取 Source Library 里的文件。我能通过 search_documents / get_document_content 检索和读取材料库；请经材料库上传需要我使用的文件。

断言 HTTP 200、SSE text/done、无工具或错误事件、provider 单轮、原始问题完整传递，以及数据库保存内容与流式回复一致。此抽测证明提示词传递、SSE 与持久化；**不证明真实模型的遵从性**。未访问真实 provider 或用户库。

## 验证结果

各测试范围有交叉，数字不相加。

| 范围 | 结果 |
|---|---|
| server 受影响面，8 文件 | 123/123 通过；0 失败/跳过/取消；exit 0；8792.252 ms |
| server 全量，所有 test:* 去重 85 文件 | 786 个 TAP 结果：784 pass、2 fail、0 skip/cancel/todo；exit 1，signal null；105630.8037 ms |
| client 全库 | 170 文件、1737/1737 通过；0 失败/跳过；exit 0；Vitest 28.05 s |
| test wiring | 84/84 server 树内测试文件 wired，0 exempted/unwired；另 1 个 manifest 测试在根 scripts，共 85 |
| tool-face registry / manifest / parity 测试 | 5/5、10/10、10/10 通过 |
| manifest / parity 检查 | 28 条 manifest、14 public；parity 14 public 通过 |
| shared runtime import | 262 产品源文件，0 违规 |
| tech-debt 表格 | 通过，沿用原有历史豁免；本单未加豁免 |
| canvas / gallery / rail / single editor / source / legacy / freshness | 全部通过；canvas 174 checks，gallery 8 checks |
| canvas model / performance | 60 groups 通过；5 性能场景通过 |
| client build | tsc + Vite 通过，2345 modules；既有重复导入/chunk 大小提醒 |
| server build | 全量内 K-6/K-7 的两次 `npm run build` 均通过，等同根 build 委托的 server 命令 |
| docs:check | exit 1：3 份 INDEX 过期；下列两个后续子检查另行执行通过 |
| docs inventory / glossary | object-inventory 最新；glossary K-1 至 K-3 通过 |

server 全量覆盖清单见 [server-test-files.json](server-test-files.json)，实际运行清单与其完整比对一致；最终退出与统计见 [server-verification.json](server-verification.json)。**786 是本轮实际输出分母**：MinerU wiring 文件加载失败，其内部子测未能枚举，不宣称预期全部子测已执行。

两项环境红原样申报给 HQ：

1. `server/src/__tests__/v2SourceMineruWiring.test.ts:60`：模块加载时 `spawnSync python.exe ENOENT`，整文件加载失败。
2. `v2SourceRegionCells.test.ts` 的 `V12.9c c-1b-2 keeps MinerU table regions honest and declares cell geometry unavailable`：`parser_failure` / MinerU exit 101。虚拟环境启动器引用缺失的 `C:/Users/70208/AppData/Roaming/uv/python/cpython-3.12.11-windows-x86_64-none/python.exe`，无法创建进程。

三份索引在本单尚未写入任何文档前已被 `docs:check` 判为过期：`docs/agent-ops/INDEX.md`、`docs/agent-ops/current-state/INDEX.md`、`docs/brainstorm/INDEX.md`。本单不扩大范围再生索引；Result 状态回写后亦复查申报。**不能据此宣称总验证门全绿。**

首轮全量同样输出 786/784/2、0 skip/cancel/todo（108443.0744 ms），但 PowerShell 重定向外层迟迟未返回。仅中断该自有会话；中断后的会话码 1 不作为测试进程正常退出证明。为解决退出不明，用完全相同的 85 文件、隔离环境和测试参数重跑，Node 父进程将 stdout/stderr 直接接临时日志文件 fd，并监听 exit/close。最终一轮真实 code=1、signal=null 已独立核实；两轮失败一致，未修改或排除测试。

## 复跑与范围声明

server 定向（server cwd）：

```text
node --import tsx --test --test-reporter=tap src/__tests__/v14ContextHint.test.ts src/__tests__/v14ReadTools.test.ts src/__tests__/v14ProposalUnification.test.ts src/__tests__/v14AgentWriteDoor.test.ts src/__tests__/v14AgentVerbTransfer.test.ts src/__tests__/v14DeleteCeremony.test.ts src/__tests__/v13AgentMemories.test.ts src/agent/providers/index.test.ts
```

server 全量（server cwd）：`node --import tsx --test --test-reporter=tap --test-concurrency=4`，后接 server-test-files.json 的全部 85 个 `files` 参数。清单来自 `server/package.json` 的所有 `test:*` 脚本中 `.test.ts` 字面路径，去重排序，不排除文件。client 使用 `npm.cmd run test:unit`；其余 runtime 子项按根 package.json 对应 `npm.cmd run <script>` 执行。

测试进程覆写 DOTENV_CONFIG_PATH 至空/不存在的临时文件，COINCIDES_APP_DATA_DIR/上传与资产目录至独立临时目录，DB_PATH 为内存或临时库；client 的 COINCIDES_VALIDATION_ENV_DIR 指向空目录。全量补 npm_execpath 供既有 hook 测试调用 npm。新增凭据形测试环境值为 `manual-test` / `v14-local`，均不超过 20 字符；既有测试凭据保持原样。首次 npm.ps1 被执行策略拦截后使用 npm.cmd，不记为测试失败。

零 git 命令，未触碰 `.git`、未 commit，未读 `.env` 密钥值，未碰用户库，未增依赖。根 `verify:v2-bn8-runtime` 含 `git diff --check` 和 secrets 扫描，依工单由 HQ 收口；本单执行其余子项，未直接调用该聚合脚本。CodeGraph 目录存在，但本会话无 callable MCP/CLI；使用精确路径读取与有界检索。

说明书条目：**未改**，源文件 SHA-256 前后一致；本单只将既有事实接入 prompt。Python/MinerU 环境修复、3 份索引再生、git/secrets、真实模型评估与主观放行均未做。证据目录仅存摘要和结构化清单/退出收据；原始日志在系统 temp，构建产物仍在既有 dist/.codex-tmp 位置。
