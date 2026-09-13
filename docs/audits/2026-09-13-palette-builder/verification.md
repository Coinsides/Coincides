> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Builder 验证收据
> **日期 (Updated)**: 2026-09-13
> **权威 (Authoritative)**: 否（执行证据；不是放行裁定）

# 调色板施工验证

七节工程实现已交付，服务端全量验收尚未通过，工单保留 ready。补遗一已解决旧 preflight 的规格疑问；本次剩余阻塞是测试运行环境。

## 已通过

| 验证 | 结果 |
|---|---|
| shared `tsc -b shared` | 通过，类型声明构建完成 |
| client `npm run build:client` | 通过，包含 TypeScript 检查与 Vite 构建；保留既有大 bundle 提示 |
| server `npm run build` | 通过，包含 TypeScript 检查、manifest 检查与复制 |
| client 全库 `npm run test:unit` | **154 文件 / 1602 测试通过**；无过滤、无 skip |
| 新增服务端 palette 套件 | **7/7**，已登记进既有 `test:v2` |
| palette + 既有 paper skin + manifest lifecycle 三套完整文件复跑 | **15/15**（7 + 6 + 2） |
| 取色器部件与分组/recent/sort | **17/17** |
| 调色板共享状态、引用降级与并发保存 | **5/5** |
| 既有夹具定向普查回归 | **25 文件 / 269 测试通过**；后续两条生命周期补测包含在最终全库中 |
| 实际应用 + 实际 API + 隔离 SQLite + Chrome | **13 项检查 / 73 请求 / 73 成功响应 / 0 runtime exceptions** |

`verify:v2-bn8-runtime` 中允许执行的段逐项执行，未以整条命令调用它：

- `check:test-wiring`：76/76 登记，0 缺漏。
- `check:tech-debt-table`。
- `test:tool-face-registry`、`test:tool-face-manifest`、`check:tool-face-manifest`。
- `test:tool-face-parity`、`check:tool-face-parity`。
- `check:server-shared-runtime-import`。
- `check:canvas-runtime-boundary`、`check:group-gallery-shell`、`check:groups-rail-shell`、`check:single-editor-shell`。
- `check:source-experience`、`check:v2-bn11-legacy-shutdown`、`check:v2-bn11-relation-freshness`。
- `smoke:canvas-engine-model-contract`、`smoke:canvas-engine-performance`。
- `docs:check`：首次发现两份生成件过期，运行仓内生成器更新 `docs/agent-ops/INDEX.md` 与 `docs/generated/object-inventory.md` 后通过。

Git diff 与 secrets 两段由 HQ 收口补跑，不计为通过。

## 服务端全量两次原样执行

执行集为 `server/src` 与 `server/scripts` 下全部 **76 个 `.test.ts` 文件**，通过既有 `scripts/run-server-test-suite.mjs` 运行。包含所有既有安全语义断言；没有修改这些断言、筛除套件或过滤子例。

1. **首次整跑完成：653 测试，650 通过、3 失败、0 skipped、0 cancelled。** 失败为：
   - `v2SourceMineruWiring.test.ts`：顶层发现 Python 时 `spawnSync python.exe ENOENT`。
   - `v2SourceRegionCells.test.ts`：其硬编码的 `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe` 无法启动所引用的 CPython 3.12.11。直接执行对应解释器也得到「拒绝访问」。未改外部运行时、其配置或该套件。
   - `v2TestV2ManifestHook.test.ts` T-1：直接 Node 启动缺 `npm_execpath`。补上实际 npm CLI 路径后，完整 lifecycle 套件随 15 项复跑通过。
2. **补齐可用 Python PATH 与 npm 生命周期变量后，仍按相同 76 文件原样整跑。** 可用 Python 来自仓内 `.codex-tools/uv-tools-codex-python/browser-harness/Scripts`，无需安装或读取凭证。执行在 `v2SourceMineruWiring.test.ts` 处长期未返回；缓冲 TAP 停在其前一个套件的第 569 项，不能将此中间状态作为全量通过数。等待数分钟无新输出后，通过该自有 exec session 的 Ctrl+C 终止，未按名称广杀 Node/Python。

只读诊断发现，既有 MinerU 套件的 Windows 进程探测、taskkill 和子进程清理等待没有强制上限；其“8 秒轮询”无法中断一次已挂起的探测，fixture 又包含无限休眠父子进程。**缓冲日志不能证明当前具体停在哪个 await**，这里只申报可证实的套件未返回和无界等待路径。没有为取得绿色结果而改动套件或这些生产清理路径。

复核位置：`server/src/__tests__/v2SourceMineruWiring.test.ts:179`、`:198`、`:208`、`:293`、`:491`；`server/src/services/sourceMineruParser.ts:392`、`:433`、`:471`、`:486`；`server/src/services/sourceArtifact.ts:443`。

HQ 需要在具有固定 MinerU 运行时执行权限、Windows 进程探测可正常返回的环境中，完成未过滤的服务端全量复跑；此项通过前不翻 done。

## 隔离与证据边界

- 客户端 `COINCIDES_VALIDATION_ENV_DIR` 指向合成空目录；服务端 `DOTENV_CONFIG_PATH` 指向合成空文件，DB 和资产路径显式隔离。迁移只在合成库执行，未接触用户数据库。
- 浏览器完整流程和运行参数见 [smoke.md](smoke.md)，数据见 [smoke-receipts.json](smoke-receipts.json)。普通 Chrome/Edge 的 renderer 操作超时后，使用仓内既有测试模式的 `--isolated-chrome-no-sandbox`，仅作用于新的临时 profile 与 localhost 合成应用；未更改用户浏览器或工具/文件系统 sandbox。
- 启动首批工具时**误执行过一次只读 `git status --short --branch`**，这是本单禁 Git 边界的执行偏差。该调用读取仓库状态，没有 Git 写操作；发现本单具体禁令后未再次调用 Git，未 commit/push/PR。不将此轮描述为“Git 零触碰”。
- browser-harness 的用户 Chrome 连接尝试被拒绝读取 `DevToolsActivePort`，未读到用户 profile 内容；该工具自动查找的两处 `.env` 均不存在。未读取真实 `.env` key 值。
- 原始日志留在 `.tmp/palette-validation/`：`client-full-final.log`、`server-full.log`、`server-full-rerun.log`、`server-directed-final.log`、三端 build 日志与各 gate 日志。此目录不作为构建产物交付。
- [numstat.json](numstat.json) 使用编辑前文件系统镜像逐行比较，未运行 Git；审计目录中的新证据件单列，不混入代码 numstat。
