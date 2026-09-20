> **状态 (Status)**: evidence / Builder 验证已收口，HQ 两组件待验
> **日期 (Updated)**: 2026-09-19
> **口径**: 工单补遗一；Builder 跑非 git/secrets 的 23 组件，另外两组件留 HQ。

# A1 验证组件执行记录

此处没有执行或宣称通过完整 `verify:v2-bn8-runtime`。从当前根 `package.json` 原命令按 ` && ` 分解，排除且仅排除 `git diff --check`、`npm run check:changed-file-secrets` 后为 **23 个组件**。门脚本、package 配置和检测标准未改。

**最终：非 git/secrets 的 23 个组件全部 PASS。** 全量客户端 183 文件、1853 测试通过；另外执行的服务端全量仍留两项既有 Python/MinerU 环境失败，详见下方，未将其宣称为绿。完整验证门需 HQ 补齐两组件后裁定。

其余 22 组件按门顺序逐项执行，不因中途失败停止后续组件。原始记录目录：`.codex-tmp/a1-pagination/builder-components-2026-09-19T23-45-55-333Z/`，逐项命令、时间、exit code 均在对应日志和 `summary.json` 中。`test:unit` 复用独立完整客户端执行，精确命令为 `npm.cmd --prefix client run test:unit -- --maxWorkers=2`；两 worker 只限制并发，不过滤文件或用例。

| 门序 | 组件 | 执行与收口 |
|---|---|---|
| 1 | check:test-wiring | PASS |
| 2 | test:agent-knowledge | PASS |
| 3 | check:agent-knowledge | PASS |
| 4 | check:tech-debt-table | PASS |
| 5 | test:unit | 首轮 1 失败、1828 通过；产品冻结后最终完整复跑 **183 文件、1853 测试 PASS** |
| 6 | test:tool-face-registry | PASS |
| 7 | test:tool-face-manifest | PASS |
| 8 | check:tool-face-manifest | PASS |
| 9 | test:tool-face-parity | PASS |
| 10 | check:tool-face-parity | PASS |
| 11 | check:server-shared-runtime-import | PASS |
| 12 | check:canvas-runtime-boundary | PASS |
| 13 | check:group-gallery-shell | PASS |
| 14 | check:groups-rail-shell | PASS |
| 15 | check:single-editor-shell | PASS |
| 16 | check:source-experience | PASS |
| 17 | check:v2-bn11-legacy-shutdown | PASS |
| 18 | check:v2-bn11-relation-freshness | PASS |
| 19 | smoke:canvas-engine-model-contract | PASS |
| 20 | build:client | 首轮 FAIL：新增测试 `.at()` 与项目 ES2020 目标不兼容；改索引访问后复跑 PASS |
| 21 | build | PASS |
| 22 | smoke:canvas-engine-performance | PASS |
| 23 | docs:check | 首轮 FAIL：docs/agent-ops/INDEX.md 过期；既有生成命令更新后最终复跑 PASS |

首次汇总为 **20 PASS / 3 FAIL**（包含独立完整客户端测试），失败原件保留，不覆写成绿。

修复后首次客户端全量 `.codex-tmp/a1-pagination/client-full-two-workers-final.log` 为 181 文件、1832 测试 PASS。纳入后续 Shift+Enter 尾部空行、显式 A4/Letter 矮页与 hook 收敛用例后，再用同一完整命令验证当时工作树：**182 文件、1840 测试 PASS，113.01 秒，exit 0**，日志 `.codex-tmp/a1-pagination/client-full-final-tree.log`；该日志文件名包含 final，但晚于其执行的来源、撤销光标、硬换行显示及角色字号修复需以末次全量收口。同期 `tsc --noEmit` 同样 exit 0，日志 `measurement-final-typecheck.log`。client build 复跑 `.codex-tmp/a1-pagination/build-client-final.log` exit 0，矮页修复之后再次完整 build `.codex-tmp/a1-pagination/build-client-after-short-page.log` 同样 exit 0。矮页修复定向 `.codex-tmp/a1-pagination/engine-and-short-page-final.log` 为 4 文件、28 测试 PASS。渲染静态门 `.codex-tmp/a1-pagination/canvas-boundary-final.log` 为 174 checks PASS。

20:09 墨水原页与同源投影定向 **2 文件、8 测试 PASS**，日志 `pagination-ink-affiliation-final.log`；新两项覆盖正文首片改籍及新增续页后的 Overview/print 墨水页籍。首次原件 `pagination-ink-affiliation.log` 的原有可见 value 拼接断言失败保留，canonical/display 范围区分和修复说明见同目录 `engine-and-content-adapter.md`。

浏览器修复通过并冻结产品树后，受影响静态门再执行：`check:canvas-runtime-boundary` **174 checks PASS**，`check:single-editor-shell` **PASS**，`check:source-experience`（静态契约和 model）**PASS**；日志分别为 `canvas-boundary-final-frozen.log`、`single-editor-final-frozen.log`、`source-experience-final-frozen.log`，全部 exit 0。

冻结树的最后 `npm.cmd run build:client`（`tsc -b && vite build`）**PASS，exit 0**，日志 `build-client-final-frozen.log`。构建仅保留现有超大 chunk 提示，没有 TypeScript 或 bundling 错误。

产品冻结后，以 `npm.cmd --prefix client run test:unit -- --maxWorkers=2` 最后完整执行全部客户端测试：**183 文件、1853 测试 PASS，114.37 秒，exit 0**，原始日志 `client-final-handoff.log`。同时独立 `node.exe client/node_modules/typescript/bin/tsc -p client/tsconfig.json --noEmit --pretty false` **exit 0，36.58 秒**，日志 `client-final-handoff-typecheck.log`。最终全量已包含来源条高度、撤销光标、页缝硬换行、上下行软换行 affinity、角色字号缩放和墨水原页回归。

工单二轮 Result 与各审计件冻结后，按既有 `docs:index`、`docs:inventory`、`docs:check` 顺序执行，**三命令均 exit 0**。唯一生成内容变化为 `docs/agent-ops/INDEX.md`；另外八份 INDEX 与 `docs/generated/object-inventory.md` 内容无变化。`docs:check` 同时覆盖索引、对象清单及 glossary K-1 至 K-3 断言。原始日志 `docs-index-final.log`、`docs-inventory-final.log`、`docs-check-final.log`。生成脚本、权限和操作指令文件均未改。

## Server 全量

基线使用现役 `npm run test:v2`（不筛选测试）。原始日志 `.codex-tmp/a1-pagination/baseline-server-2026-09-19T23-31-32-020Z/01-npm_run_test_v2.log`：初始 774 测试，771 通过、3 失败；其中 `v2MaterialLibrary` 为 Node 测试 IPC 反序列化错误，现役 runner 自带一次隔离复跑 59/59 通过。另两项为启动环境：`python.exe ENOENT`、固定 MinerU venv 指向不存在的旧 Python。

先尝试仅该进程的 `PATH` 前置仓内已存在且实测可启动的 `.codex-tools/uv-tools-codex-python/browser-harness/Scripts`，没有安装依赖或修改系统环境。日志 `.codex-tmp/a1-pagination/server-final-python-path.log`。这次 MinerU wiring 能启动 Python，但本执行环境拒绝 `Get-CimInstance Win32_Process`（HRESULT `0x80041003`），现役 Windows 清理器拿不到进程树并等候未退出的夹具进程，因而挂起。Builder 对自己的整轮执行发 Ctrl-C，并清理自己的残留测试进程；该轮明确记 **ABORTED，不能算 PASS**。取证 `.codex-tmp/a1-pagination/server-python-environment-probe.json`。

随后以不覆写 PATH 的标准 `npm.cmd --prefix server run test:v2` 再次执行完整名单，使既有启动环境失败正常退出而保留其余用例结果；原始日志 `.codex-tmp/a1-pagination/server-final-standard.log`，**exit 1**。首遍 **779 测试、776 通过、3 失败、0 skipped、0 cancelled**，46.62 秒；同样三项失败，其中 MaterialLibrary 的 Node IPC 错误经现役 runner 一次隔离复跑 **59/59 通过**，38.51 秒，最终仍留两个已存在的 Python/MinerU 环境失败。IPC 会截断某文件的初始测试输出，不把两个阶段的测试数机械相加或改写成全量绿。

环境取证：`v2SourceRegionCells.test.ts` 固定 `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe`，该 venv 的 `pyvenv.cfg` 固定不存在的 `C:/Users/70208/AppData/Roaming/uv/python/cpython-3.12.11-windows-x86_64-none`。仅进程 `PYTHONHOME` 指向现有 Python 也仍无法创建旧目标进程。Builder 没有改外部环境、测试断言或测试名单来绕过此项。

## 交 HQ 欠项

- 冻结树客户端全量、build 和受影响静态门均通过，此前各轮记录保留。
- 最终文档索引已生成，docs:check 复跑通过，Builder 侧 23 组件已收口。
- Server 已完整执行；Python/MinerU 环境失败留作环境欠项，未修改不属本单的 Source 代码或测试。
- Git diff 检查与 changed-file secrets 扫描仍由 HQ 补齐；本档不能作为完整门已绿的声明。
