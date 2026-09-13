> **状态 (Status)**: active
> **层 (Layer)**: 验证收据 / Audit evidence
> **日期 (Updated)**: 2026-09-13
> **执行者**: Codex builder / skin_suite_server

# 浮卡套装后端验证收据

## 范围与隔离

本单新增迁移 071、用户套装 CRUD、`suite:<uuid>` 契约、删除时全挂点字面快照及事务内 palette 回执。新增套装测试使用 `:memory:` 数据库；全量等价测试通过既有 `scripts/run-server-test-suite.mjs` 为 canvas assets / Source blobs 创建隔离临时目录。没有接触用户库、读取 `.env` 值、执行 git 或修改安全类测试。新增合成密码哈希为 `synthetic`（9 字符）。

## 执行结果

| 检查 | 命令（cwd = `server/`） | 结果 | 证据 |
|---|---|---|---|
| skin / palette / suite 定向回归 | `node --import tsx --test src/__tests__/v13PaperSkin.test.ts src/__tests__/v14PaletteColors.test.ts src/__tests__/v14SkinSuites.test.ts` | 20/20 PASS；此轮在 palette 删除回执增补前执行 | 原执行工具 chunk `035a9c`；同一测试集亦包含在全量日志 |
| 最终套装定向 | `node --import tsx --test src/__tests__/v14SkinSuites.test.ts` | 7/7 PASS，含事务回滚、所有人面挂点 round-trip、删套装后池色再变仍保持冻结值 | [最终套装测试](server-logs/suite-palette-receipt-tests.log) |
| server + shared 源级 typecheck | `npx.cmd tsc -p .floatcard-check/tsconfig.json --noEmit` | exit 0 | [输出](server-logs/server-typecheck.log)、[退出码回执](server-logs/execution-receipts.json) |
| server + shared 隔离输出 build | `npx.cmd tsc -p .floatcard-check/tsconfig.json` | exit 0 | [输出](server-logs/server-build.log)、[退出码回执](server-logs/execution-receipts.json) |
| 非安全全量等价运行 | `node ../scripts/run-server-test-suite.mjs <inventory.files>` | 56 文件；460 tests，457 PASS，3 FAIL，exit 1 | [完整日志](server-logs/server-suite.log)、[精确文件清单](server-logs/server-test-inventory.json) |
| manifest 环境修正定向补跑 | `node ../scripts/run-server-test-suite.mjs src/__tests__/v2TestV2ManifestHook.test.ts`，进程内设置 `npm_execpath` 为当前 npm CLI 路径 | 2/2 PASS，清除原 3 FAIL 中的 manifest 启动环境失败 | [补跑日志](server-logs/manifest-retry.log) |

早期常规 shared build 的既存 `shared/dist` 文件写入报 EPERM，当时使用临时配置直接纳入 `server/src` 与 `shared/types` 源文件，产物输出到 `server/.floatcard-check/dist`，未改正式 tsconfig。随后 runtime 门已成功刷新 shared 产物，并通过**正式 shared 与 server 常规构建**，见 [runtime-gates.md](runtime-gates.md)。本目录的隔离编译日志仅保留早期验证轨迹；TypeScript 成功无输出，退出码见 [execution-receipts.json](server-logs/execution-receipts.json)。复制的 [tsconfig.json](server-logs/tsconfig.json) 按原 `server/.floatcard-check/tsconfig.json` 位置解释相对路径。

## 全量剩余环境阻断

原 460 项全量没有补称为全绿；manifest 单独补跑后仍有以下两项环境阻断，均位于本单未修改的 Python / MinerU 测试：

1. `src/__tests__/v2SourceMineruWiring.test.ts` 在模块初始化执行 `python.exe -c ...` 时失败：`spawnSync python.exe ENOENT`。该文件未能进入内部用例枚举，Node 将文件作为一个失败项记录。
2. `V12.9c c-1b-2 keeps MinerU table regions honest and declares cell geometry unavailable`（`v2SourceRegionCells.test.ts`）返回 `parser_failure`：MinerU Python 启动器退出码 101，无法启动其引用的 `C:\Users\70208\AppData\Roaming\uv\python\cpython-3.12.11-windows-x86_64-none\python.exe`。

原第三项失败 `T-1 manifest copy recreates a missing dist target byte-for-byte` 是直接调用 Node 时没有 npm 生命周期注入的 `npm_execpath`；仅补齐当前 npm CLI 路径后该文件 2/2 PASS。未为这些环境问题改写被测代码或跳过失败断言。

## 明确未执行的安全文件

按用户禁区过滤以下 `server/package.json` 原 `test:v2` 成员，交 HQ 收口；本收据的“非安全全量”不包含它们：

- `src/__tests__/providerCredentials.test.ts`
- `src/__tests__/v2DevQuickLogin.test.ts`
- `src/agent/providers/index.test.ts`

其余精确 56 文件列在 [server-test-inventory.json](server-logs/server-test-inventory.json)。未执行 git / secrets 收口门。

## 删除事务等价性

`deleteSkinSuite` 使用 SQLite immediate transaction，同一事务读取当前套装整包与 owner 的池色字典，逐一重写 `users.settings.skin`、`courses.skin`、`notes.metadata.skin`（含垃圾箱）及 `boards.skin`。每个消费者以自己的 overrides / components 优先合并，活 palette 引用转为当时字面值，缺失引用保留套装基线，然后删除套装。任意挂点更新失败将回滚先前所有改写及套装删除。响应携带相同 palette 快照，供仍持旧引用的客户端冻结其局部覆盖；新增断言证明之后修改池色不改变该回执或持久消费者的已冻结值。
