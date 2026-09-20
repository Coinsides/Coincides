> **状态 (Status)**: active
> **日期 (Updated)**: 2026-09-20
> **层 (Layer)**: 审计 / Builder 验证证据

# Server 全量执行与例外

现存 **98 个 server 测试文件全部完成执行，零排除**。范围为 `server/src` 与 `server/scripts` 下现役测试，通过官方脚本覆盖；清单与映射见 [server-coverage-inventory.log](../../../.codex-tmp/a5-paper/server-coverage-inventory.log)。本回执不宣称 server 全绿。

| 执行范围 | 结果 | 原始证据 |
|---|---|---|
| `server test:v2`，79 文件 | 首轮 TAP 778 项：774 pass、4 fail；既有 runner 隔离重试恢复两项 IPC 故障，最终仍 exit1 | [server-v2-full.log](../../../.codex-tmp/a5-paper/server-v2-full.log) |
| 其余 11 个 server 官方脚本 | 203/203 pass，全部 exit0 | [server-extra-suite-summary.log](../../../.codex-tmp/a5-paper/server-extra-suite-summary.log) |
| 根 `test:agent-eval` | 14/14 pass，exit0 | [server-agent-eval-official.log](../../../.codex-tmp/a5-paper/server-agent-eval-official.log) |
| 新增纸型存储往返 | 1/1 pass，包含于主套件 | 主日志 `ok 401 - paper defaults and single-page geometry round-trip through the existing collection store` |

以上是各次 TAP 口径；脚本之间有少量重叠文件，隔离重试也会重复执行。**不将这些数值相加成去重用例总数**。

未通过的两项为环境执行失败：

- `v2SourceMineruWiring.test.ts`：启动 `python.exe` 报 `ENOENT`。
- `v2SourceRegionCells.test.ts` 的 `V12.9c c-1b-2`：MinerU exit101，无法创建 uv Python 进程。该解释器位置在当前受限环境不可执行。

两项 IPC 故障分别为 `v2CanvasPersistenceCutover`、`v2MaterialLibrary` 的 Node 数据反序列化错误；既有 runner 的隔离重试分别 49/49、59/59 通过。没有更改 runner、测试跳过条件或 Python 环境。

`v13WildernessExecute.test.ts` 最终官方完整执行 **27/27 pass**，耗时 346498.6ms（约 5 分 46 秒），见 [server-wilderness-executor-long.log](../../../.codex-tmp/a5-paper/server-wilderness-executor-long.log)。早期整跑在无 TAP 输出时被止测，留下了中间日志；后续诊断与完整执行覆盖该中间状态，不能把它称为死锁或最终未完成。只读旧换算代码对照同样耗时；独立 census SQL 单次约 2.6 秒，定位证据为 [wilderness-census-timing-probe.log](../../../.codex-tmp/a5-paper/wilderness-census-timing-probe.log) 与 [wilderness-baseline-probe.log](../../../.codex-tmp/a5-paper/wilderness-baseline-probe.log)。未改迁移器或 census 查询。

留 HQ：在具备可运行 Python/MinerU 的环境复跑上述两项，并进行最终放行判断。
