# T7 server 全量验证记录

2026-09-21 · Codex builder。**全量完成，1118 / 1120 通过；两项 Python 环境阻断，非全绿。** 按 T5 补遗一继续施工及其余验证，没有排除、豁免或隐藏环境红。

## 定向增量

仅在 `server/src/__tests__/v14NoteBinding.test.ts` 增加共享 materializer 引用（第 14 行）及一个普通功能用例（第 167 行），不新建测试文件，不新增安全对抗用例：

- `createManualBindingPreset` 取现役笔记标题，产页眉中标题、页脚中「第 N 纸」、可选页脚右文案；保留既有 cover/coverPage，单段装订，不修改输入。
- 经真实 `PUT /api/notes/:id/binding-settings` 写入；数据库关闭重开后，真实 GET 与 `binding_settings_json` 都和套用值相同。
- 随后通过普通 PUT 修改页眉、页脚、页码前后缀；再次关闭重开，GET 与数据库仍和编辑值相同，预设没有锁定设置。

本文件 7 个用例均通过；新增用例 PASS 见原始 stdout 第 **27344–27349** 行（311.0873 ms）。本用例保留性断言覆盖空 cover 与 `coverPage.exportIncluded=false`，不冒称验证了非空资产。

## 全量口径与结果

| 项目 | 事实 |
| --- | --- |
| 枚举 | 递归 `server/src` 与 `server/scripts` 全部 `.test.ts`，**111 文件** |
| 明示包含 | `scripts/v13WildernessExecute.test.ts`、`v2SourceMineruWiring.test.ts`、`v2SourceRegionCells.test.ts` |
| 排除 / 跳过 / 取消 | **0 / 0 / 0** |
| 单文件预算 | **600000 ms**，未按 120 秒判红 |
| 并发 | 4 |
| Node | v22.22.1 |
| 启动 / 结束 UTC | 2026-09-21T22:38:53.955Z / 2026-09-21T22:46:38.997Z |
| 总数 | **1120 tests / 1118 pass / 2 fail / 0 todo** |
| Node 汇总耗时 | 461657.2834 ms |
| 启动器墙钟耗时 | 465042 ms |
| 退出码 / flaky retries | **1 / 0** |

执行入口为仓根 `node .codex-tmp/t7-presets/server-runner.mjs`。私有启动器在 server cwd 调用现役 `../scripts/run-server-test-suite.mjs --test-timeout=600000 --test-concurrency=4`，后附完整 111 文件列表。没有使用仅覆盖子集的 `npm run test:v2` 代替全量。

## 两项环境阻断

| 用例 | 失败原因 | 原始 stdout 行号 |
| --- | --- | --- |
| `v2SourceMineruWiring.test.ts` | 启动 `python.exe` 返回 `ENOENT`，文件初始化失败 | 61969、61992–62002 |
| `v2SourceRegionCells.test.ts` 的 MinerU 表格几何用例 | pinned Python 无法创建进程，MinerU 退出 **101** | 62832–62846 |

两项符合 T5 补遗一已知沙箱 Python 病的环境阻断口径，交 HQ 机器复验收口；未修外部 Python、未改权限或依赖、未重写断言。`v2TestV2ManifestHook` 保持通过（stdout 63907–63913），本次没有 `npm_execpath` 缺失失败。

## 基建分账与原始证据

私有 runner 复制 T6 先例，仅将输出目录改为 `.codex-tmp/t7-presets/`、系统临时目录前缀改为 `coincides-t7-server-`。其余参数和现役 server runner 均未修改。仓外唯一临时数据根配空 dotenv，传 `NODE_ENV=test`、`DB_PATH=:memory:`、`COINCIDES_APP_DATA_DIR`、`DOTENV_CONFIG_PATH`、`COINCIDES_VALIDATION_ENV_DIR` 与明确的 `npm_execpath`；清除继承凭据环境和 `NODE_OPTIONS`。现役 runner 另外隔离 canvas-assets 与 source-blobs。全量执行期间未并行其他 server build。

原始文件保留在 `.codex-tmp/t7-presets/`：

- `server-runner.mjs`：私有启动器。
- `server-inventory.json`：完整 111 文件清单，零排除。
- `server-metadata.json`：完整调用参数及隔离目录。
- `server-full.stdout.log`：完整 TAP，汇总见 66094–66104 行。
- `server-full.stderr.log`：空文件，子测试诊断由现役 reporter 记录在 stdout。
- `server-result.json`：完整结束收据与退出码。

SHA-256：测试文件 `FA8ADD3A24244B66B4621F845678409D67E8E8816CFFFE2DC7D165B5F5C4A43E`；私有 runner `C1F677CEC93221FECA7065E1BAFE89A75E1B5841880661ED3166841C573DC3F5`；原始 stdout `D8C17E8BDA379C5FCE8A3A3263B74E3BB3107ED20BA5F5BC3015A0E25B55A021`。

本记录只覆盖 server 定向与全量，client、非 git/secrets 25 组件由总回执另行申报；git 检查和 secrets 两组件留 HQ。没有 git 写操作、用户库操作或真实远程模型调用。
