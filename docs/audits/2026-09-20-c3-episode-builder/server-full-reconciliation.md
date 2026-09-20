> **状态 (Status)**: active
> **层 (Layer)**: Audit / C3 server 全量执行对账
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否；原始运行证据的只读汇总

# Server 全量对账

最终批次 `server-full-2026-09-20T09-51-16-479Z-31344` 于 `2026-09-20T10:05:34.192Z` 完成。**107 / 107 个文件全部执行；TAP 可见测试总数1077，其中1075通过、2失败，取消/跳过/todo均0。全量结果为 FAIL，不申报全绿。** 两失败属于既有 Python / MinerU 运行环境问题，且同日 C2 原始全量日志中已有同签名失败；该比较不豁免失败。

本次只读对账重新发现 `server/src` 与 `server/scripts` 的全部 `.test.ts`，与本批次执行清单逐项一致，缺失0、重复0；逐文件读取原始日志中 tests/pass/fail/cancelled/skipped/todo 六项，与 `server-full-summary.json` 的计数全部一致，差异0、缺 TAP 摘要0。1077是本次实际发出的 TAP 测试分母；环境启动失败的文件未展开其后续子用例，不能将它解释为修好环境后的预期断言总量。

## 子集与长文件

| 面 | 文件数 | tests / pass / fail | 结论 |
|---|---:|---:|---|
| server 全量 | 107 | 1077 / 1075 / 2 | FAIL，两个环境失败保留 |
| Agent 族（现役本单 runner targeted 规则） | 22 | 341 / 341 / 0 | PASS；取消/跳过/todo均0 |
| v13WildernessExecute | 1 | 27 / 27 / 0 | PASS，无超时 |

Agent 子集按 `run-validation.mjs:32` 的 `Agent|Episode|Intent|NotePatch|Attention|ContextHint|Claim|Memory|TurnIdentity|Proposal|BoardSandbox|LoopRobustness|AtomicTextSave` 匹配，加 `/agent/` 路径与 `agent-eval/harness.test.ts`，只从已完成全量证据选取，未另跑或筛掉全量文件。22文件为：harness、v13AgentMemories、v13AtomicTextSave、v13AtomicTextSaveMigration、v14AgentKnowledgeProjection、v14AgentRouteLifecycle、v14AgentVerbTransfer、v14AgentWriteDoor、v14AttentionContext、v14BoardSandbox、v14ClaimObservation、v14ClaimReceipt、v14ContextHint、v14EpisodeContext、v14EpisodeStorage、v14IntentRouter、v14LoopRobustness、v14MemoryQuickwins、v14NotePatch、v14ProposalUnification、v14TurnIdentity、agent/providers/index。

Wilderness 外层实际耗时 **448296 ms（448.296 s）**，TAP 耗时448180.2652 ms；Node测试预算600000 ms，外层文件预算660000 ms，未采用120s判红。原始日志 `.codex-tmp/c3-episode/server-full-2026-09-20T09-51-16-479Z-31344/005-server_scripts_v13WildernessExecute.test.ts.log:165` 为27 tests，`:167` 为27 pass，`:168` 为0 fail，`:172` 为TAP耗时。

## 两失败与 C2 基线逐项比较

同日 C2 批次为 `server-full-2026-09-20T09-18-15-875Z-32056`，摘要记录1060 tests / 1058 pass / 2 fail。它与本单失败文件清单完全一致；只对照既有日志，没有重跑C2或改动其证据。

| 文件 | C3 原始错误 | C2 原始错误 | 判断 |
|---|---|---|---|
| `v2SourceMineruWiring.test.ts` | `spawnSync python.exe ENOENT`，模块加载失败 | 同样 `spawnSync python.exe ENOENT` | 相同缺失解释器故障；不是C3断言失败 |
| `v2SourceRegionCells.test.ts` | MinerU code101，固定venv启动器无法启动其 Python 3.12.11基础解释器 | 相同code101、相同基础解释器绝对路径，仅临时fixture目录不同 | 相同固定运行环境故障；该测试未完成 |

精确原始路径与行号：

- C3 MineruWiring：`.codex-tmp/c3-episode/server-full-2026-09-20T09-51-16-479Z-31344/101-server_src___tests___v2SourceMineruWiring.test.ts.log:5` 为ENOENT，`:28` 为文件失败，`:40`/`:42`/`:43` 为1 test / 0 pass / 1 fail。
- C2 MineruWiring：`.codex-tmp/c2-intent/server-full-2026-09-20T09-18-15-875Z-32056/099-server_src___tests___v2SourceMineruWiring.test.ts.log:5` 为同ENOENT，`:28` 为文件失败，`:40`/`:42`/`:43` 为相同计数。
- C3 RegionCells：`.codex-tmp/c3-episode/server-full-2026-09-20T09-51-16-479Z-31344/103-server_src___tests___v2SourceRegionCells.test.ts.log:9` 为code101与无法启动路径，`:19`/`:21`/`:22` 为1 test / 0 pass / 1 fail。
- C2 RegionCells：`.codex-tmp/c2-intent/server-full-2026-09-20T09-18-15-875Z-32056/101-server_src___tests___v2SourceRegionCells.test.ts.log:9` 为同code101与路径，`:19`/`:21`/`:22` 为相同计数。

两次RegionCells指向的基础解释器均为 `C:/Users/70208/AppData/Roaming/uv/python/cpython-3.12.11-windows-x86_64-none/python.exe`。两失败均 `timedOut:false`、`flaky-retries:0`，未触发也未滥用IPC限定重试。

## 环境保留项

只读检查 `Get-Command python,python3,py` 未找到现役命令；常见候选 `C:/Users/70208/AppData/Local/Programs/Python`、`C:/Program Files/Python`、`C:/Python311`、`C:/Python312`、`C:/Python313` 均不存在。`C:/Users/70208/AppData/Roaming/uv/python` 存在但未列出安装目录，当前仓库 `_external_tools/mineru/.venv/Scripts/python.exe` 不存在。该有界检查未找到可直接替换的兼容解释器，不作全磁盘不存在Python的推论。

此外 `server/src/__tests__/v2SourceMineruWiring.test.ts:60` 在模块加载时直接调用 `python.exe`；`v2SourceRegionCells.test.ts:38` 固定 `D:/Coinsides/v12.9-selection`，`:40` 构造其venv路径，`:196` 在测试内覆写 `COINCIDES_MINERU_PYTHON` 为该固定路径，`:128` 也直接调用该解释器。因此仅从外层给RegionCells设置另一个 `COINCIDES_MINERU_PYTHON` 不能改变它实际采用的固定运行时。

本次未安装依赖/解释器、未改机器配置、未改既有测试或产品文件，未读取用户库。没有发现满足本单限制的现役解释器恢复路径，两个失败继续作为明确环境保留项交HQ；没有制造补跑PASS或覆盖原全量红日志。
