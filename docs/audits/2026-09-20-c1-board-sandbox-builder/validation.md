> **状态 (Status)**: active（builder 验证记录，非放行）
> **日期 (Updated)**: 2026-09-20

# C1 验证收据

**C1 定向、scripted 场景、Agent 族、client 全库及 23 个非 git/secrets 门组件通过；server 全量未绿。** 服务端全部 102 文件均已执行，最终 99 文件通过，两个 Python 相关失败、一个旧 wilderness 文件超时保留。没有删除、跳过或改写这些测试来凑绿。逐文件日志索引、计数、23 门映射和场景 scoreboard 见 [test-results.json](test-results.json)。

| 射程 | 最终结果 | 原始证据（均在 `.codex-tmp/c1-board/`） |
|---|---|---|
| C1 七动词及可逆/同事务/批次/诊断 | 15/15 通过 | `targeted-1789892705089.log`、`server-file-v14BoardSandbox.log` |
| Agent 族 | 16 文件、289 测试通过 | `agent-family.log`、`agent-family-files.json` |
| client 全库 | 219 文件、2254 测试通过 | `client-full-final.log` |
| server 全量发现清单 | 102 文件全部执行：99 通过、3 未过；TAP 1014 项中 1011 pass / 2 fail / 1 cancelled / 0 skipped | `server-files-inventory.json`、`server-file-*.log` |
| 概念图场景 07 | 9/9；2 用户轮、2 tool rounds | `eval-c1-final.log`、`eval-final/` |
| 整批撤销场景 08 | 12/12；2 用户轮、2 tool rounds | 同上，另 `eval-final-worker-logs/` |
| eval harness 自测 / 类型检查 | 14/14 / exit 0 | `eval-selftest.log`、`typecheck-eval-final.log` |
| client / server 构建 | exit 0 / exit 0 | `client-build-final.log`、`server-build-last.log` |
| runtime 非 git/secrets 组件 | 23/23，各组件成功日志在 JSON 逐项映射 | `gate-*.log` + 下述明确重跑 |

服务端数字按每文件最后一次完整执行收据计算，未重复累加重跑。1014 是 TAP 输出项数：MineruWiring 在文件加载阶段失败，wilderness 在文件级超时，二者内部测试未完整枚举，**不能声称所有服务端测试用例都执行完毕或通过**。服务端原 `npm test:v2` 也实际执行过（`server-test-v2-final.log` exit 1），但它的手写清单覆盖面较窄且遇 Node IPC 自动重试；最终扩大为 `server/src`、`server/scripts` 中全部 102 个 `.test.ts` 文件，使用原 `run-server-test-suite.mjs` 逐文件执行、3 进程并行，每文件 120 秒上限。

## 保留的三项红灯

| 文件 | 实际失败 | 处置与限制 |
|---|---|---|
| `server/src/__tests__/v2SourceMineruWiring.test.ts` | `spawnSync python.exe ENOENT`，加载阶段失败 | Python 环境不可用；未改源码或测试，未安装依赖 |
| `server/src/__tests__/v2SourceRegionCells.test.ts` | MinerU code 101，旧 venv 指向的 uv Python 进程无法创建 | 原测试的 Python 启动限制；未触碰用户 Python 安装或改变测试语义 |
| `server/scripts/v13WildernessExecute.test.ts` | `test timed out after 120000ms` | 原测试文件未改；具体根因未判定，未以超时推断 C1 无关或判绿 |

前两项在原 npm 清单执行中同样失败；wilderness 在合并全量与最终单文件执行中均超时。原始文件分别为 `server-file-v2SourceMineruWiring.log`、`server-file-v2SourceRegionCells.log`、`server-file-v13WildernessExecute.log`。这些限制交 HQ 复核，builder 不作放行判定。

## 门组件与重跑口径

`verify:v2-bn8-runtime` 原链 25 组件，按工单剔除 `git diff --check` 与 `check:changed-file-secrets`，实际逐项执行剩余 **23 非 git/secrets 组件**。没有运行那两个留 HQ 的组件，没有把本次分组件执行称为完整 verify 总门。

首轮 23 组件中 19 项通过；四项经修复或调整执行环境后通过：知识预算由 `knowledge-rerun.log` 确认；client 全库由 `client-full-final.log` 确认（仅限制为 2 workers，未减清单）；client 构建由 `client-build-final.log` 确认；文档索引更新后由 `docs-check-delivery.log` 确认。server 构建另在最后测试断言同步后重跑，见 `server-build-last.log`。23 项完整名称、最终 exit code 和日志映射见 `test-results.json.runtimeGate.components`。

首轮失败和中断均保留：高并发 client 超时；七名自动投影超旧预算；旧 34 工具计数、claim/event 枚举断言；新增测试类型问题；初版 repo 内测试凭据目录被现役 resolver 拒绝；合并 server 全量出现 Node IPC/诊断 JSON 截断与旧 wilderness 超时。逐文件 runner 最初遗漏 npm 生命周期变量，manifest-hook 1/2 红，随后补入当前实际 npm 二进制路径，`server-file-v2TestV2ManifestHook-1789893790740.log` 为 2/2 绿。产品源码与该测试未因 runner 问题修改。

## 隔离与未做项

原始日志、临时 runner、复算脚本、逐文件清单、场景 JSON/SSE 均留 `.codex-tmp/c1-board/`。runner 仅继承系统环境白名单，使用内存 SQLite、空 dotenv、独占临时资产和空凭据目录；模型 key 置空。现役凭据 resolver 禁止仓库内目录，最终回归使用新分配的空 OS-temp 目录，结束后清理本轮独占临时目录。未读取机器凭据或用户库，场景全部 scripted，无真实模型请求。

未做 git 写操作、commit、真实模型评测、用户数据迁移或主观视觉验收。git 检查与 secrets 扫描按工单留 HQ。后续人采纳/后改导致的撤销冲突、估算标签矩形等产品边界见 [README.md](README.md)，没有宣称无条件覆盖人后改或视觉验收已完成。
