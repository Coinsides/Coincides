> **状态 (Status)**: implemented / verification-incomplete — 服务端施工已落地；首次全量有失败，模板预期已修且定向通过，两项 Python 环境阻塞未消解
> **层 (Layer)**: 审计 / builder 服务端蒸馏证据
> **日期**: 2026-09-20
> **工单**: [B1 表格块工单及补遗一](../../agent-ops/handoffs/2026-09-20-v14-b1-table-block-order.md)
> **署名**: Codex builder / server_table
> **行号口径**: 2026-09-20 二轮当前工作树；不是 commit 快照

# B1 表格块：服务端实现与验证证据

## 1. Payload、创建、更新与读取

原生块使用 `block_type = table`，`content_json` 严格为 `{ caption?: string, headers: string[], rows: string[][] }`。约束由 `server/src/validators/tableBlock.ts:3–26` 实施：

- 列数为 **1–64**；`headers=[]` 表示无表头，否则表头的长度确定列数。
- 数据行 `rows` 为 **0–64 行**；可只有表头，也可无表头，但表头和数据不能同时为空。上限为 64 数据行加一行可选表头。
- 每个数据行与表头或首数据行等宽，至少一格。caption、表头、数据单元格均为字符串。
- caption、headers、rows 的全部字符串长度之和 **≤65536 UTF-16 code units**；以 JS `string.length` 计数，不计 JSON 标点，不静默截断。换行可保留在存储内容中。
- `.strict()` 拒绝 payload 顶层的其他键；未加入公式、合并单元格、列类型或 TextFlow 内容。

| 环节 | 当前源码位置 | 已落地行为 |
|---|---|---|
| 块型枚举与普通创建校验 | `server/src/validators/index.ts:66`、`:771–774` | 接纳 `table`，使用专属 payload schema；HTTP 创建继续走现役 NoteBlock 路由 |
| client-create 服务校验 | `server/src/services/noteBlockLifecycle.ts:439` | 新建前校验 table payload；沿用创建收据与重放/丢弃流程 |
| 更新校验 | `server/src/services/noteBlockContent.ts:31–35` | 将请求类型/内容与存量块合成后校验，单独更新 `content_json` 也不会漏检 |
| 校验辅助函数 | `server/src/services/tableBlocks.ts:3–5` | 仅 `block_type=table` 应用表格 schema |
| 模板家族 | `server/src/lib/noteBlockTemplates.ts:125–145` | `media.table`，`system_type=media`，`legacy_block_type=table`；这是 NoteBlock 模板定义，未改 toolFace 注册表 |
| 重开 hydration | `server/src/services/noteHydration.ts:21–28`、`server/src/services/noteBlockContent.ts:19–21` | 既有泛型 JSON hydration 完整保留二维字符串数组；无需修改 hydration 代码 |
| 封面 | `server/src/services/noteCoverRules.ts:74–88` | 既有展示分类已允许 native table；未改封面规则，新增阳性验证 |
| 常规测试清单 | `server/package.json:35` | `test:v2` 显式清单已纳入 `v14TableBlocks.test.ts` |

现役服务端没有供纸内搜索调用的 NoteBlock 文本检索接口；B1 的 caption 与单元格文本检索由 client 的 `noteNavigationSearch.loadedBlockText` 接入。未把 Item 检索接口改造成表格检索，也未触 Relation 域。

## 2. read_note：补遗一允许的扁平投影

实现接线为 `server/src/services/agentReadSurfaces.ts:79–97`，其中第 91 行只替换既有 `text` 的取值。实际输出 `kind = "table"`、`role = null`；其余沿用既有块身份字段。`server/src/services/tableBlocks.ts:8–18` 的格式如下：

1. 非空 caption 独占第一行；缺省或空 caption 不输出这一行。
2. 非空 headers 使用 TAB 分隔，独占下一行；`headers=[]` 时不输出表头行。
3. 每个数据行使用 TAB 分隔，各行之间使用 LF。
4. caption/单元格内部的 CRLF、单独 TAB、CR、LF 分别替换为单个空格，确保一个表格行只占投影的一行。此为有意的有损读面，存储 payload 不变。

示例：`熙宁新法表\n新法\t内容\t作用\n青苗法\t青黄不接时贷给农户钱粮\t减轻高利贷负担`。

`read_note` 仍经过 `server/src/toolFace/registry.ts:833–845` 的现役严格输出 schema；其 blocks 子对象在第 842 行 `.strict()`。`server/src/agent/tools/executor.ts:49` 仍执行 `readTool.output_schema.parse(result)`。表格阳性测试直接用这份 schema 解析结果，并核对单块键仅为 `id / placement_id / kind / role / text`（`server/src/__tests__/v14TableBlocks.test.ts:135–145`）。

**零新输出键、零 toolFace 注册表改动、零 executor 改动、零新动词。** 未借用 `text_units` 或 `media` 冒充结构化表；真正的 rows/headers 输出槽按补遗一留 C 波，本单未实施。TextFlow 真相 schema、Agent 机关、写门、Relation、page_frame_local 坐标契约及依赖均未因服务端 B1 改动。

## 3. 已执行验证及实际数字

| 执行 | 实际结果 | 证据 |
|---|---|---|
| B1 专项 `node --import tsx --test src/__tests__/v14TableBlocks.test.ts` | **9 tests / 9 pass / 0 fail**，0 skipped/cancelled | [server-table-directed.log](../../../.codex-tmp/b1-table/server-table-directed.log) |
| 服务端 `npx.cmd tsc --noEmit` | exit 0，无诊断输出 | [server-typecheck.log](../../../.codex-tmp/b1-table/server-typecheck.log)（空日志与工具退出码共同记录通过） |
| 首次全量的 manifest 准备 | exit 0 | [server-manifest-prepare.log](../../../.codex-tmp/b1-table/server-manifest-prepare.log) |
| 首次服务端全量 `node .codex-tmp/b1-table/run-validation.mjs --server` | **101 测试文件；1038 tests / 1035 pass / 3 fail**；0 skipped/cancelled/todo，flaky-retries=0，runner exit 1 | [初次全量原始日志](../../../.codex-tmp/b1-table/server-all-initial.log)、[初次状态回执](../../../.codex-tmp/b1-table/server-results-initial.json)、[101 文件库存](../../../.codex-tmp/b1-table/verification-inventory.json) |
| 模板预期修复后，`node --import tsx --test src/__tests__/v2MaterialLibrary.test.ts` | **59 tests / 59 pass / 0 fail**，0 skipped/cancelled | [server-template-regression.log](../../../.codex-tmp/b1-table/server-template-regression.log) |

B1 专项覆盖：模板与 shared 对齐（第 60 行）、行列/矩形边界（第 71 行）、封面阳性（第 87 行）、UTF-16 总预算边界（第 92 行）、创建/重放/hydration/丢弃（第 100 行）、存量类型更新与恢复（第 118 行）、既有严格 read_note schema（第 135 行）、扁平化格式（第 148 行）、普通 HTTP 创建/更新/重开/删除（第 154 行）。`v14TableBlocks.test.ts:24–39` 的「熙宁新法表」是 **9 数据行 × 3 列**的中文阳性样张。

全量库存枚举 `server/src`、`server/scripts` 下所有 `.test.ts`，并加入根目录 `check-agent-knowledge.test.ts`、`generate-tool-face-manifest.test.ts`，没有把 `test:v2` 的显式子集冒称全量。runner 采用隔离环境、内存 DB 和临时资产目录。首次全量耗时：Node test summary **322659.3263 ms**，外层执行回执 **324549 ms**。

**没有在修复模板预期后重跑服务端全量。** 59/59 是单独的修复后定向结果，不能与首次全量数字合成为一次实际运行，不能申报「1036/1038 实测通过」。当前也不能申报服务端全绿或完整 runtime gate 通过。

## 4. 首次全量三个失败的处置

### 4.1 已修复：模板预期清单

初次日志第 **35403–35424 行**：`v2.5 template runtime seeds system templates idempotently` 在 `server/src/__tests__/v2MaterialLibrary.test.ts:816` 报 `5 !== 4`。测试维护的现役模板清单缺少新加的 `media.table`。

修复位于该测试第 **814–820 行**：保留明确模板清单及幂等校验，将 `media.table` 加入期望集合。产品模板逻辑未为测试改变。随后该文件独立执行 **59/59**，证据见上表。

### 4.2 未消解：MinerU Wiring 找不到 Python

- 入口：`server/src/__tests__/v2SourceMineruWiring.test.ts:59–61` 在 Windows 顶层初始化中调用 `execFileSync('python.exe', ['-c', 'import sys; print(sys.executable)'])`。
- 初次日志第 **52964–53000 行**：`spawnSync python.exe ENOENT`，该测试文件整体以 exit 1 结束，未成功进入文件内测试。
- 环境只读核对：`Get-Command python.exe,python3.exe,py.exe` 未发现可调用 Python；`uv.exe` 存在于 `C:\Users\70208\.local\bin\uv.exe`。这不是跳过用例或业务断言通过。

### 4.3 未消解：固定 MinerU venv 的基座 Python 拒绝访问

- 固定解释器定义：`server/src/__tests__/v2SourceRegionCells.test.ts:38–40`，路径为 `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe`；第 **196 行**写入该次测试的 `COINCIDES_MINERU_PYTHON`，第 **203 行**调用 `parseSourceArtifact`。
- 初次日志第 **53795–53808 行**：`V12.9c c-1b-2 keeps MinerU table regions honest and declares cell geometry unavailable` 失败；MinerU exit code **101**，无法创建底层 Python 进程。
- 该既有 venv 的 `pyvenv.cfg` 指定 home 为 `C:\Users\70208\AppData\Roaming\uv\python\cpython-3.12.11-windows-x86_64-none`。
- 已知基座 `python.exe` 存在（91648 bytes），但直接以完整路径执行 `--version` 返回 **拒绝访问**；固定 venv 的 `python.exe --version` 同样无法创建该基座进程；`uv --no-cache python find --offline` 读取该安装目录也返回 **Access denied**。

这些观察表明，单纯为 runner 增补 PATH 不能恢复固定 Python 基座的访问。没有安装依赖、搬移/复制运行时、修改已有 MinerU 测试以规避失败或申请权限绕过；runner、产品解析器与 MinerU 测试均未修改。环境观察单独保存在 [server-python-environment.log](../../../.codex-tmp/b1-table/server-python-environment.log)，它是诊断观察记录；首次真实失败的原始进程输出保留在初次全量日志中。Python 可执行环境恢复后仍需亲跑上述失败项，结果留后续收口。

## 5. 交付边界

本服务端子任务无 git 写操作、无 commit；只读 Git 检查不等于 HQ 的完整门签收。没有新设计安全对抗用例；首次全量包含现有回归，未因既有用例类型作排除。client 的编辑器、CSV/TSV、分页、打印/Overview 和检索最终验收由本次主线证据汇总，本文件不代替这些前端验收。
