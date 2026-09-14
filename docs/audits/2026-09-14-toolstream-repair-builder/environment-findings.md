> **状态 (Status)**: active
> **层 (Layer)**: 施工验证证据
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否（日志摘录与只读复核，不代替 HQ 放行）

# Python / MinerU 环境红与验证证据复核

本文仅检查本单已生成日志及仓内相关测试源码；未重新运行测试，未进入机器 Python 目录、读取 `.env`、用户库或修改环境。下述两项符合 Henry 本单明确允许“Python/MinerU 环境红按例申报留 HQ”的范围；申报失败，不计通过。

## 两项具体环境失败

原始证据：[首轮 server 全量日志](server-full-2026-09-14T07-20-11-312Z-40056/04-server-full.log)。

| 失败项 | 源码与日志位置 | 已证实原因及验证范围 |
| --- | --- | --- |
| `v2SourceMineruWiring.test.ts` 整文件启动失败 | `server/src/__tests__/v2SourceMineruWiring.test.ts:60`；日志 `:41958`、`:41962`、`:41967`、`:41981` | 模块顶层执行 `execFileSync('python.exe', ['-c', 'import sys; print(sys.executable)'])` 时抛 `spawnSync python.exe ENOENT`，errno `-4058`、pid `0`、status `null`。子进程未能启动，文件内用例未展开。只能判定该测试进程无法找到/启动该命令，未进一步推断机器上是否安装了 Python。 |
| `V12.9c c-1b-2 keeps MinerU table regions honest and declares cell geometry unavailable` | 用例起点 `server/src/__tests__/v2SourceRegionCells.test.ts:183`，失败调用 `:203`；日志 `:42749`、`:42755`、`:42760` | `parseSourceArtifact` 抛 `SourceArtifactError`，`code='parser_failure'`。MinerU 子进程退出码 `101`，明确报 `Unable to create process`，所引用解释器为 `%APPDATA%/uv/python/cpython-3.12.11-windows-x86_64-none/python.exe`。测试的固定 venv 入口由源码 `:40` 指定，`:196` 写入其测试环境；失败发生于解析器启动阶段，尚未执行表格几何断言与后续数据库落地。未检查该解释器路径本体。 |

这些错误来自解释器启动，并非本单工具参数断言失败。既有全量没有排除这些文件或用例；无需改 parser、Python 安装、期望值或测试机关。环境恢复与复验留 HQ。

## 首轮聚合运行与后续逐文件运行

首轮日志 `:45640-45646` 的统计为 **797 tests / 794 pass / 3 fail / 0 cancelled / 0 skipped**。除上述两项环境失败，`v2MaterialLibrary.test.ts` 在日志 `:28047-28063` 报 Node 测试运行器 IPC 反序列化异常：`Unable to deserialize cloned data due to invalid or unsupported version.`，栈位于 `node:internal/test_runner/runner`。首轮统计不作为最终全量覆盖结论。

root 已启动 [84 文件逐文件全量运行](server-full-serial-2026-09-14T07-23-41-188Z-10420/summary.json)，没有排除任何既有回归。本文编写时该运行仍在进行；最终文件覆盖、通过/失败数及 IPC 是否消失由 root 在完成后补入 Result。

**root 完成后补记**：84/84 文件均已启动，82 文件通过、2 文件环境失败；815 tests / 813 pass / 2 fail / 0 cancelled / 0 skipped。[aggregate.json](server-full-serial-2026-09-14T07-23-41-188Z-10420/aggregate.json) 由全部测试文件步骤逐项累加，无排除。`v2MaterialLibrary.test.ts` 逐文件通过，未复现 IPC 异常。两项环境错误原样复现：该目录 `78-server_src___tests___v2SourceMineruWiring.test.ts.log:5` 为 python.exe ENOENT，`80-server_src___tests___v2SourceRegionCells.test.ts.log:9` 为 MinerU code 101 / Unable to create process。源码与环境均未为此改动。

## 21 项非 Git / secrets 组成门

已核 [gates summary](gates-2026-09-14T07-15-39-975Z-35160/summary.json)：包含全部 **21 项**非 Git / secrets 组成门，每项都有现存原始日志。除首次 `check:test-wiring` 外，其余 **20 项 exit 0**；另有 shared build 前置检查 exit 0。

首次接线门准确报 `85 files / 84 wired / 0 exempted / 1 unwired`，唯一未接线文件为临时独立的 `server/src/agent/providers/openai.test.ts`。将新场景合入既有已接线 suite 后，[独立复跑日志](closeout-2026-09-14T07-20-11-507Z-38764/01-check-test-wiring-final-layout.log) 明确为 **84 files / 84 wired / 0 exempted / 0 unwired，PASS**；对应 [closeout summary](closeout-2026-09-14T07-20-11-507Z-38764/summary.json) 记 exit 0。因此 21 项组成门的通过证据已齐；首轮失败记录保留，不改写成成功。

同一 closeout 的 server build 与 docs:check 也均 exit 0。client 全库证据位于 gates 的 `04-test_unit.log`：**171 文件 / 1746 tests 全通过**。文档状态/Result 若在这次 docs:check 之后变动，须由 root 最后更新索引并再次检查，不能把早先通过描述成对未来文档状态的验证。

完整 `verify:v2-bn8-runtime` 未直接执行，因为尾部包含用户明确禁止的 `git diff --check` 与会调用 Git 的 `check:changed-file-secrets`。两项均在 gates summary 记为 `not_run`、留 HQ；21 项通过不等于完整总门已绿。
