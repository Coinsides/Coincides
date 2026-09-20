> **状态 (Status)**: active（builder 验证事实；全量存在两项失败，未放行）
> **日期 (Updated)**: 2026-09-20
> **层 (Layer)**: Evidence / 只读环境核查

# C2 server 全量与环境失败

本轮递归发现并执行 `server/src`、`server/scripts` 的全部 **105文件**，无排除、无跳过：**1060 tests / 1058 pass / 2 fail**，cancelled / skipped / todo 均0。全量结果为失败，不能以已知环境原因将两项算作通过。

`v13WildernessExecute.test.ts` **27/27通过，444.175秒**。Node预算600000ms、文件外部预算660000ms，没有120秒截断。完整结果见 [server-full-summary.json](server-full-summary.json)。[独立计数审计](server-full-count-audit.json) 重新读取105份原始TAP，并与当前全树清单、summary逐文件计数核对：无漏文件、无缺TAP、无计数差；计数审计通过不等于测试全绿。

全量中的 Agent 路由测试运行早于最后一处多轮回答正文修复。最终冻结后的补验为 **20文件325/325通过**，其中 `v14AttentionContext.test.ts` **6/6通过**，覆盖最后修改的 orchestrator / `message_meta.content` 与新增第6个多轮读工具回答正文、持久历史一致性用例。证据 [targeted-summary.json](targeted-summary.json)，run `targeted-2026-09-20T09-28-51-878Z-2644`；这轮与全量重叠，数字不相加。

| 失败文件 | 原始日志的直接原因 | 实际失败边界 |
|---|---|---|
| `v2SourceMineruWiring.test.ts` | `spawnSync python.exe ENOENT` | 测试文件第60行在模块顶层执行 Python discovery，未进入测试正文；TAP记录一个模块失败 |
| `v2SourceRegionCells.test.ts` | `MinerU exited abnormally (code 101): Unable to create process using '"C:\\Users\\70208\\AppData\\Roaming\\uv\\python\\cpython-3.12.11-windows-x86_64-none\\python.exe" -B …'` | 固定虚拟环境的 Python 启动失败；服务在 `sourceMineruParser.ts:495` 将非零进程退出转为 `parser_failure`，不是本轮数据断言差异 |

上述原始日志分别位于 `.codex-tmp/c2-intent/server-full-2026-09-20T09-18-15-875Z-32056/099-server_src___tests___v2SourceMineruWiring.test.ts.log` 与同目录 `101-server_src___tests___v2SourceRegionCells.test.ts.log`。

2026-09-20 09:34 UTC 补做只读核查：

- `Get-Command python.exe -CommandType Application -All` 无结果，符合本轮第一项的 `ENOENT`。
- `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe` 存在；同目录上层 `pyvenv.cfg` 存在，其 `home` 指向日志中的 uv CPython 3.12.11 目录；该基础 `python.exe` 也存在。
- `D:/Coinsides/v12.9-selection/samples/ielts-listening-sample-tasks-2023.pdf` 存在。因此第二项不是已证实的文件缺失；目前只把原因落到解释器进程启动失败，未越过证据推断具体权限配置。
- `git diff HEAD --name-only -- <核查路径>` 退出0、没有变更路径。核查覆盖两份失败测试、`sourceMineruParser.ts`、`sourceArtifact.ts`、`sourceMaterialization.ts`、`sourceFileIntake.ts`、`sourceImprints.ts`、`routes/sources.ts`、既有 `scripts/run-server-test-suite.mjs` 及 `_external_tools/mineru/`。这些被核查原件相对HEAD未改。Git同时报告无法读取用户级 `.config/git/ignore` 的警告，原样保留于原始诊断，未修改Git配置。

只读核查原始数据：`.codex-tmp/c2-intent/server-environment-readonly.json`，Git诊断 `server-environment-git-readonly.log`。没有执行 Python、安装依赖、改变PATH或机器权限、修改 Source/MinerU 代码，也没有再次运行长期全库。两项环境失败按失败移交 HQ；git/secrets 两组件仍留 HQ。
