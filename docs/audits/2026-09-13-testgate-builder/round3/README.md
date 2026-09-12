# 补遗二三轮执行证据

**终态判据已达成，builder 工单翻 done。** Server 全量只剩补遗二已裁定的 **25 条 Canvas 陈旧红（已裁归单1）+ 2 条 Python 环境红（13.6 总测已知基线，候总测）**；其余全绿。本页为本轮结论，前两轮停线回执保留为历史。done 表示本单工程终态达成，不代替 HQ 放行或宣称 server 全绿。

## 本轮交付与语义保全

| 文件 | 改动 | numstat |
|---|---|---|
| `server/src/__tests__/v2MaterialLibrary.test.ts` | 对齐现役四模板，含媒体先遣的 `media.image`；保留数量、重复 seed 幂等、版本、来源、作用域断言，补三路精确键集对照 | +6 / -1 |
| `server/src/__tests__/v13BoardIdentity.test.ts` | 真实 startup ledger 给出动态终点；补录 pre-065 夹具已运行历史迁移，再用真实 runner 跑 pending；保留 base-schema 重放、全部原 PRAGMA、唯一性、FK、NULL 断言及其他 065 定点测试 | +18 / -1 |
| `server/scripts/v13WildernessExecute.test.ts` | 按 D1 现役墙契约，缺 page_size 时保留逐帧墙；top=96、Source candidate.y=0；增加完整 contentInset 等值断言 | +8 / -4 |
| `server/src/__tests__/v2NotesLifecycle.test.ts` | PUT handler 锁更新至合法 B1c 不可改纸型交付，附 commit 收据和精确差异出处；全部原断言保留 | +8 / -2 |
| `server/src/toolFace/registry.ts` | `list_note_blocks` 输出仅补必填 `text_save_revision: z.number().int().nonnegative()` | +1 / -0 |
| `docs/generated/tool-face-manifest.json` | 既有生成器重生成，仅增加相同字段声明及 required 项 | +5 / -0 |

上述六文件合计 **+46 / -8**；工单追加及全部证据的完整增删行数见 [numstat.tsv](numstat.tsv)。基线为 `before/` 的本轮施工前字节，**不是 Git HEAD**；快照与日志单独计为证据新增。

工单翻 done 后，文档末检提示 `docs/agent-ops/INDEX.md` 状态条目过期（[原始失败](final-docs-check.log)）。已按既有生成器同步索引，仅该索引有变、其他八份不变；[生成日志](generate-docs-index.log) 和 [随后复验](final-docs-check-after-index.log) 一并留存。该机械生成的状态变更也计入 numstat。

Handler 新 SHA-256 为 `0dfd76eb9fa0f7c0f8002596663a4ff2fa052f0aa8c7e7d01318d1436f559b57`。合法交付由 B1c 工单 Result、09-09 日志 §115“B1c 已 commit”和 B1c `product-changes.patch` 共同定位；将该 patch 的 owned-note binding 与 immutable guard 在内存精确逆向，恰好恢复旧 B1a SHA-256 `69f60628e10e2930a2c8ab540a85b25a1b569957f9e1e48da33f9af87b2c916e`。**Docs 收据未刊 B1c commit ID**，未为取 ID 访问 `.git`，亦未把 blob hash 冒充 commit ID。出处行号、逆向证据和检索射程见 [handler-hash-provenance.json](handler-hash-provenance.json)。

Manifest 的完整结构对照证明：只有 `list_note_blocks` 改变，其他 **13** 工具完整对象不变；本工具除了该必填非负整数声明，其余字段不变。见 [mcp-manifest-delta.json](mcp-manifest-delta.json)；生成命令和退出码见 [generate-mcp-manifest.log](generate-mcp-manifest.log)。构建后的生产 manifest 与生成源逐字节等同。

## 前两轮交付持续有效

- 补遗一三份测试 `v13AtomicTextSaveMigration` / `v13EventsLedger` / `v13ProjectDeletionReferences` 本轮字节不变，全部随完整 server 套件跑绿。动态终点和全部活断言保留。
- **已接门25 / 陈旧候单1（漏挂集合内）0 / 未接停线0**。原 Result 的25文件逐项台账继续成立；其中 TD-6 killer、TD-21 字素守护、TD-7 退役闸均随整套通过。新旧 [server-inventory.json](server-inventory.json) 完全相同：57 test:v2 + 18 supplemental = 75 唯一文件；无重复、glob 或子例过滤。
- 两 package、本轮前已有的漏挂机关、tech-debt 门及三条历史豁免字节不变。`check:test-wiring` 当前 **75 / 75 wired / 0 exempted / 0 unwired，exit 0**。机关豁免表仍空。
- 机关阳性对照沿用二轮已落档的 [12项真实对照](../round2/wiring-controls.json)：基线绿 → 临时漏挂红 → 六类假引用仍红 → 三类真实 runner 引用绿 → 删除临时文件、恢复 package 后绿。机关与输入 scripts 本轮不变，未重复制造临时文件。
- 接门前后完整 script 对照继续见二轮 [test-v2-scripts.json](../round2/test-v2-scripts.json) 和 [verify-scripts.json](../round2/verify-scripts.json)：原32逐字前缀追加25成为57；verify 前置两新门、旧链及 HQ 尾门保留。本轮两新门再次亲跑绿。

## 实跑结果

| 验证 | 结果 | 证据 |
|---|---|---|
| Server test:v2，57文件，含真实 npm pretest manifest 钩子 | 466 tests / 439 pass / 27 fail，exit 1 | [server-test-v2.log](server-test-v2.log) |
| Server 其余18唯一文件，完整套件 | 179 tests / 179 pass / 0 fail，exit 0 | [server-supplemental.log](server-supplemental.log) |
| Server 合计75文件尝试执行 | **645 tests / 618 pass / 27 fail / 0 skipped / 0 cancelled / 0 todo** | [validation-summary.json](validation-summary.json) |
| Client unit | 151文件 / 1590 tests，全绿 | [verify-test-unit.log](verify-test-unit.log) |
| Server / client typecheck | 两端 exit 0 | [typecheck-results.json](typecheck-results.json) |
| Server / client build | 两端 exit 0 | [verify-results.json](verify-results.json) |
| verify 允许完整子门集合 | **21/21 exit 0**，含两新门、registry、manifest、parity、docs | [verify-results.json](verify-results.json) |

完整测试均用既有隔离 wrapper，`--test-concurrency=1 --test-reporter=tap`，未过滤子例。`v2McpTransport` 整套（含真实 `list_note_blocks` 调用）已转绿，未改该套件。七份修复测试均随上表全量通过，未将子集重复累加进总数。

**TAP 645 的边界**：其中含 MineruWiring 的一项模块加载失败，其内部五个测试尚未注册；0 skipped 不代表这些内部用例已执行。不得用此数字申报 server 全绿。

## 保留27红的四类裁定账

| 裁定类别 | 本轮结果 | 处置 |
|---|---|---|
| Canvas 陈旧红 | `v2CanvasPersistenceCutover.test.ts` 25条，仍红 | **已裁归单1**，原文件未动 |
| Python 环境红 | `v2SourceMineruWiring.test.ts` 1项（Python ENOENT 模块加载）；`v2SourceRegionCells.test.ts` c-1b-2 1条（pinned Python 无法启动，exit101） | **已知基线红，候13.6总测**，测试及环境均未改 |
| 四份活测试腐烂 | MaterialLibrary / BoardIdentity / WildernessExecute / NotesLifecycle 原4红消失 | 按补遗二授权修复，零放宽 |
| MCP 严格输出 schema 漏声明 | `v2McpTransport` 原1红消失 | 仅如实声明真实返回；manifest/parity 全绿 |

每条失败的测试名、日志行号、文件和原始诊断块见 [failures.json](failures.json)。机器摘要同时强制断言失败集合恰为 **25/1/1**，没有把新失败混入豁免类别。

## 完整性与未做项

限定源码射程：`server/src`、`server/scripts`、`client/src`、`client/scripts`、`shared`、`scripts` 的 ts/tsx/mjs/js/json/css/sql。1003份基线文件中 **998字节不变**，仅4测试+registry改变，**新增0/删除0**；两份 package、补遗一三测试、机关、tech-debt 门和 object inventory 字节不变。机械检查见 [integrity.json](integrity.json)，复算配方为 [summarize-results.mjs](summarize-results.mjs)。

所有 DB 使用内存或临时合成夹具；空 dotenv / Vite env、临时 app-data/assets/blobs/uploads、清空 provider key 的设置及完整命令见各日志首行和 [run-validation.mjs](run-validation.mjs)。本轮未读真实 `.env` key 值、凭证文件或用户库；未改其他工具 schema、产品行为、Canvas 套件、Python 工具链、权限文件或 current-state；未删测试、增豁免、glob 化、做安全专项或 name-pattern 过滤；未执行 Git、访问 `.git`、commit/push/PR/merge。临时合成目录保留在临时区，构建产物未入 audits。

**`git diff --check` 与 secrets 扫描按 HQ 补遗由 HQ 收口补跑，不计 builder 漏验。** 本轮按裁定拆开运行允许的完整子门集合，未改 verify 尾链，也未将这21门冒充含HQ两项的整链全绿。
