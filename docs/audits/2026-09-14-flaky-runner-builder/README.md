> **状态 (Status)**: blocked
> **日期 (Updated)**: 2026-09-14
> **性质**: Builder 蒸馏回执；非 HQ 放行

# IPC 窄签名复跑：实现完成，正常全绿验收停线

仅修改 `scripts/run-server-test-suite.mjs`。最终定向对照 **9/9 PASS**（核心三条全部通过）；正式 `server` 的 `npm run test:v2` 为 **72 文件、740 tests、738 pass、2 fail、0 cancelled/skipped/todo、exit 1、flaky-retries 0**。两项 Python/MinerU 环境失败不属于 IPC 签名，不能通过本单复跑规则消除。工单要求“全绿库跑一遍”尚未满足，按“冲突停线举证”保留 `ready`。

## 实现落点

| 位置 | 行为 |
| --- | --- |
| `scripts/run-server-test-suite.mjs:7,11,31` | 精确签名常量；独立 reporter 消费 Node 结构化事件；流完整结束才写完成标识，不解析测试 stdout。 |
| `scripts/run-server-test-suite.mjs:34` | 必须是同一文件路径的 name/file、nesting=0、line/column=1、failureType=uncaughtException、message 完整相等；显式排除 ERR_ASSERTION。 |
| `scripts/run-server-test-suite.mjs:50,114,122` | 保留 tsx、原测试列表/并发、cwd、环境和临时资产隔离；每个命中文件只另起进程复跑一次，无递归重试。 |
| `scripts/run-server-test-suite.mjs:119,125,127,133,143` | 保留初跑和复跑原始输出；警报包含文件、签名、PASS/FAIL/ERROR；汇总触发数；任何非候选失败/取消/缺失诊断/复跑失败均不能翻绿。 |
| `scripts/run-server-test-suite.mjs:109` | 旧 Node 22 缺少 test:summary 时，正常退出码保持不变；红跑不自动恢复，避免缺乏总账时误绿。当前实机 Node **22.22.1**。 |

## 定向对照

| 对照 | 退出码 | 复跑次数 | 结果 |
| --- | ---: | ---: | --- |
| 核心① 损坏 IPC 帧 → 隔离绿 | 0 | 1 | PASS；警报含完整签名、文件及 retry=PASS；测试进程 PID/父 PID 证明另起进程且仅复跑原文件。 |
| 核心② 真断言、错误文本与 IPC 签名完全相同 | 1 | 0 | PASS；原生 failureType=testCodeFailure，没有 FLAKY 警报。 |
| 核心③ 初跑和复跑均损坏 IPC 帧 | 1 | 1 | PASS；retry=FAIL，无第三次执行。 |
| 相近反序列化错误文本 | 1 | 0 | PASS |
| 测试用例级 uncaughtException + 精确签名 | 1 | 0 | PASS |
| IPC 文件 + 另一个真实断言失败 | 1 | 1 | PASS；IPC 恢复不掩盖断言失败。 |
| 正常绿路径 | 0 | 0 | PASS |
| 无 summary 的正常绿 / IPC 红 | 0 / 1 | 0 / 0 | 两条 PASS；用临时 runner 副本抑制 summary，属于事件缺失模拟，未宣称亲跑旧 Node 二进制。 |

核心 IPC 对照通过临时子进程向 fd 1 写损坏 V8 帧，异常实际来自 Node 的 `FileTest.#processRawBuffer`，没有伪造 TAP 或直接喂伪造失败事件。断言对照使用原生 `assert.fail`。夹具与控制脚本仅位于临时证据目录，既有测试文件与测试机关未改。

## 全量实跑与停线证据

1. **首跑：直接调用 package test:v2 中的 runner 命令，72 文件。** 初跑 706 tests / 701 pass / 5 fail；`v2CanvasPersistenceCutover.test.ts`、`v2MaterialLibrary.test.ts` 真实命中 IPC，分别隔离 **49/49**、**59/59** 通过；`flaky-retries 2`、recovered 2/2，整体仍 exit 1。各轮 test 数独立记账，不相加冒充唯一测试数。
2. **调用入口纠正：正式 npm run test:v2，含原 pretest。** 直接 node 首跑缺少 `npm_execpath`，导致 manifest hook 对照多一项断言失败；这是 builder 的调用方式问题，不能当作产品故障。正式 npm 入口消除了这一项，最终 **740 tests / 738 pass / 2 fail / flaky-retries 0 / exit 1**。
3. **剩余非 IPC 红项：** `v2SourceMineruWiring.test.ts:60` 顶层 `spawnSync python.exe ENOENT`；`v2SourceRegionCells.test.ts:203` 为 MinerU Python 进程启动失败，code 101 / parser_failure。正式日志失败标题位于 `hq-npm-full.stdout.log:43675,44461`。它们均未触发复跑。
4. 全量记录发生在末次“旧 Node 缺 summary 保留退出码”兼容补丁前；该补丁后 syntax check 与最终 **9/9** 定向对照通过。环境红项未修，未重复全量冒充最终全绿。

## 证据与复跑

- 原始根目录：[`.codex-tmp/2026-09-14-flaky-runner-builder/`](../../../.codex-tmp/2026-09-14-flaky-runner-builder/)。包括各控制 stdout/stderr、子进程身份、初始失败探针、两轮全量日志、执行元数据与 runner 前后快照。原始日志不进入本 audit 目录。
- 定向复跑（仓库根）：`node .codex-tmp/2026-09-14-flaky-runner-builder/controls.mjs`。
- 正式回归：在 `server` 执行 `npm run test:v2`，保留 npm 生命周期环境。未把 72 文件口径称为 server 所有目录测试的动态普查。
- [summary.json](summary.json) 只存计数、源版本和关键原始件 SHA-256。本目录只有此 README 与 summary。

## 未做项

- Python/MinerU 环境修复与环境恢复后的正常全绿回归待 HQ；没有安装依赖、改解释器、排除用例或放宽签名。
- 通用 `verify:v2-bn8-runtime` 未运行：其尾部包含 `git diff --check` 和 changed-file-secrets；按本单更具体禁区不调用。未运行 git 命令、未读写 `.git`、未 commit/push/PR/merge。
- 没有修改 package scripts、既有测试文件、权限文件；新造凭据 **0**、外部模型请求 **0**。
- 复跑参数为单文件；本单正式 package 入口仅传文件列表。额外 CLI 筛选参数继承、覆盖率模式和旧 Node 二进制实跑不在本次验证范围。
- CodeGraph 已先尝试，CLI/MCP 不可用后回退限定源读取；独立只读复核发现的旧 Node 正常路径误红已修复。
