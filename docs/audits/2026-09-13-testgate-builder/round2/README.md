# 补遗一二轮执行证据

当前结论：**三份授权测试修绿、25 份接门、两道静态门接 verify 已完成；全量发现额外 MCP 活契约真红，按原单停线，工单保持 ready，未翻 done。** 本目录为第二轮证据；上一层首轮停线记录保留不改。

## 已交付与语义复核

- `v13AtomicTextSaveMigration.test.ts` 从真实 `initDb(':memory:')` 的 runner 账本取得动态终点。保留 063 首次迁移及重跑的完整历史 rows、revision=0/7、FK 与精确 PRAGMA 断言；空历史夹具和带历史行的升级夹具均通过完整 runner 到当前终点，并与真实 startup 比较完整逻辑 schema。只规范化无语义的物理列/FK/index 编号，列约束、复合 FK 分组、索引列顺序与属性全部比较。
- `v13EventsLedger.test.ts` 动态计算 pending 数；原事件账本断言逐字保留。
- `v13ProjectDeletionReferences.test.ts` 为手工夹具补录已经执行的历史迁移，再由完整 runner 跑全部 pending；legacy soul 的两种删除操作、409、整组 rows 不变与 soul_id 断言逐字保留。
- 三份完整套件最终 **12/12**：`repaired-suites.log`。修复期间的两次失败及复核前通过日志单独保留；没有覆盖失败证据。
- server `test:v2` 保留原 runner 与 32 文件逐字前缀，追加全部 25 文件，成为 **57 文件**；剩余既有分组 **18 文件**单独显式整跑，共 **75 唯一文件**，无 glob、过滤、重复计数或测试删除。清单见 `server-inventory.json`，脚本前后全文见 `test-v2-scripts.json`。
- `check-test-wiring.mjs` 只计真实 Node `--test` 或精确解析到根 `scripts/run-server-test-suite.mjs` 的文件操作数；支持字面量/引号/`&&`/段首 `cd`，选项值不计挂，未知复杂 shell 不猜测、不执行、不展开。豁免表为空。
- 根 verify 前置 `check:test-wiring`、`check:tech-debt-table`，原链及末尾两项完整保留。tech-debt-table 脚本及 TD-6/TD-12/TD-28 三项历史豁免字节未改。前后全文见 `verify-scripts.json`。
- `docs/generated/object-inventory.md` 由既有生成器刷新验证门清单；未手改 current-state、索引、上游裁决或权限文件。

## 机关阳性对照

`check-wiring-controls.mjs` 亲跑 **12 项通过**；逐项日志为 `wiring-*.log`，汇总为 `wiring-controls.json`。

1. 基线：75 / 75 wired / 0 exempted / 0 unwired，exit 0。
2. 创建含空格路径的临时未挂 `.test.ts`：76 / 75 / 0 / 1，exit 1。
3. 仅在 echo、echo runner、普通 Node 程序、import 参数值、reporter 参数值、echo cd 中出现路径，六种均维持红，未误计。
4. 真 Node test、精确 curated wrapper、`cd server &&` wrapper 三种均绿：76 / 76 / 0 / 0。
5. 删除本次临时文件并按字节恢复 package 后，再次 75 / 75 / 0 / 0，exit 0。

临时测试没有被执行；测试发现机关本身是唯一执行对象。

## 验证数字

| 验证 | 数字 / 结果 | 证据 |
|---|---|---|
| 授权三套件最终整跑 | 12 tests / 12 pass / 0 fail | `repaired-suites.log` |
| server test:v2，57 文件 | 466 tests / 438 pass / 28 fail，exit 1 | `server-test-v2.log` |
| server 补充，18 文件 | 179 tests / 175 pass / 4 fail，exit 1 | `server-supplemental.log` |
| server 合计，75 文件尝试执行 | **645 tests / 613 pass / 32 fail / 0 skipped / 0 cancelled / 0 todo** | `validation-summary.json` |
| client unit | 151 文件 / 1590 tests，全部通过 | `verify-test-unit.log` |
| server typecheck | `tsc --noEmit`，exit 0 | `typecheck-server.log` |
| client typecheck | `tsc -b`，exit 0 | `typecheck-client.log` |
| client / server build | 两端 exit 0 | `verify-build-client.log` / `verify-build.log` |
| verify 允许的全部子门 | **21/21 exit 0**，含新增两门与 docs:check | `verify-results.json`、各 `verify-*.log` |

完整 server 两批均由既有隔离 wrapper 执行，`--test-concurrency=1 --test-reporter=tap`；test:v2 真实 npm pretest 钩子也执行。645 是 Node 实际 TAP 口径，**含一项模块加载失败**：MineruWiring 的测试尚未注册，不能把 0 skipped 理解成所有内部用例已执行。新增接入的 25 份均通过；root manifest/parity 和 client 单测另列，不重复累加进 server 75 文件。

## 32 条失败逐组归因与停线依据

| 文件 / 数量 | 证据与归因 | 处置 |
|---|---|---|
| `v2CanvasPersistenceCutover.test.ts` / 25 | 旧 `canvas_workspace` fixture 与退役策略冲突；上游裁决已明确交单1。主日志 6515 起。 | 原样保留，候单1；本单未改。 |
| `v2MaterialLibrary.test.ts` / 1 | :814 固定 seed 数量 3；当前四个注册模板包含已授权媒体模板 `media.image`。主日志 15293：4 != 3。现役媒体模板断言通过。 | 活 runtime 的过期期待，超出三份授权，需 HQ 定归属。 |
| `v13BoardIdentity.test.ts` / 1 | :65–80 的 fresh 跑当前终点、upgrade 只补 065；068 才加 `skin`。补充日志 314。 | 活迁移 fixture 终点过期，超出授权，需 HQ 定归属。 |
| `v13WildernessExecute.test.ts` / 1 | :258–265 清空 page_size 却期待已有 top=96 变0；现役规范化保留逐帧 contentInset。补充日志 100：96 != 0。后续 candidate.y 期待也沿旧规则，未执行到，未申报通过。 | 活契约旧期待，超出授权，需 HQ 定归属。 |
| `v2NotesLifecycle.test.ts` / 1 | :417–428 锁旧 B1a PUT handler hash；只在内存撤去已授权 B1c page-preset guard 可精确恢复旧 hash。现役 PagePresets 测试通过。补充日志 5420。 | 活 handler 静态锁过期，超出授权，需 HQ 定归属。 |
| `v2SourceMineruWiring.test.ts` / 1 | :59–60 顶层 `spawnSync python.exe` ENOENT，五个顶层测试尚未注册。主日志 26266。 | 本次执行环境无法找到可启动 Python；未修改环境工具链或用过滤规避。 |
| `v2SourceRegionCells.test.ts` / 1 | :183–203 强制使用既定 pinned venv，launcher 存在但无法启动其绑定的 uv Python（exit 101）。主日志 27009。 | 环境前置失败，尚未进入表格/锚语义断言；未擅自修仓外工具链。 |
| **`v2McpTransport.test.ts` / 1** | 补充日志 1295：`list_note_blocks` structuredContent 为 undefined。`services/notes.ts:173` 返回 `text_save_revision`，`noteHydration.ts:19` 保留；`toolFace/registry.ts:109–132` 严格输出 schema 缺该字段，manifest 也禁止额外字段。fixture 已跑全部迁移，service 直接读取断言已通过。 | **活产品接口契约真红：必须停线；禁止用改 fixture 或放宽断言消红。产品修复归 HQ 裁定。** |

MCP 错误响应无 structuredContent 的原因结合 SDK 输出校验源码定位；日志没有打印原始 MCP error content，不能把推断的 SDK 错误正文冒充运行输出。此处可确定的是服务输出和严格 schema 的冲突，以及真实 MCP 既有测试失败。

## 范围与未做项

`source-hashes.before.json` / `integrity.json` 的限定范围为 server/src、server/scripts、client/src、client/scripts、shared、scripts 的 ts/tsx/mjs/js/json/css/sql：1003 基线文件，999 字节不变，只有三份授权测试与机关脚本改变，零删除、零新增源码。package 差异仅上述 scripts。numstat 基于本轮施工前字节快照，**不是 Git HEAD**，见 `numstat.tsv`；本目录含快照、验证脚本和日志，不含构建产物。

所有 DB 采用内存/临时合成夹具；空 dotenv 和 Vite env 目录、临时 app-data/assets/blobs/uploads、清空 provider key 的隔离说明及实际命令在日志首行。未读真实 `.env`/credential/用户库、未做安全专项测试、未改其他既有套件、未使用 name-pattern、未执行 Git 或访问 `.git`、未 commit/push/PR/merge。

按补遗第5条，**git diff --check 与 secrets 扫描由 HQ 收口补跑，属于已裁定分工，不计 builder 漏验**。此外四份活过期测试、两项 Python 环境问题和 MCP 活契约修复尚未处置；这是全量发现的新结果。按原单“真红→停线举证”及产品代码禁区，当前不能翻 done；未申报 server 全绿或整体验收通过。

最终字节核对另观察到 `docs/agent-ops/INDEX.md` 中 ownership-signature 裁定稿一行由 draft 变 active；本 builder 未执行索引生成或写入该文件，未回退这项并行文档变化，也未把它计入本轮 builder numstat。见 `concurrent-document-change.json`。本次临时夹具目录的清理命令被自动审批以 blocked by policy 拒绝，未换路删除，目录保留，见 `temporary-cleanup.log`。
