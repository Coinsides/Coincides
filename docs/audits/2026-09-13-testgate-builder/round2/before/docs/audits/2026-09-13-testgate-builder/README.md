> **状态 (Status)**: stopped
> **层 (Layer)**: 审计证据 / Builder receipt
> **权威 (Authoritative)**: 否；运行事实见日志，裁决归上游

# 13.6 单2：漏挂首跑停线证据

本次未完成接门。首跑发现三份活套件的 fixture / 迁移终点陈旧，合计四条失败；工单仅允许把“被测物已退役”的陈旧测试列为候单1，不能把这三份活套件自行豁免或改写。工单状态保持 ready，Result 已追加停线回执。

## 清点与实跑

- 新机关初稿：`server/scripts/check-test-wiring.mjs`，只读扫描 `server/src` 与 `server/scripts` 的 `.test.ts`，比对根/server package 全部 scripts 的显式路径；不执行测试、不展开 glob。
- 机关首跑：75 文件 = 50 已挂 + 25 漏挂，豁免 0；退出码 1。原工单口径 `server/src/__tests__` 为 69 文件、24 漏挂；另发现 `server/src/agent/providers/index.test.ts`。
- 首跑完整名单、原始输出：`wiring-before.log`；实际测试参数：`missing-files.json`。
- 25 漏挂套件整体实跑：148 tests，144 pass，4 fail，0 skipped/cancelled/todo；退出码 1，23.627 秒。完整日志 `missing-suites.log`，四条失败原文及原始行号 `failures.log`，机器摘要 `validation-summary.json`。
- `v13AtomicTextSave`、`v13GraphemeTextRanges`、`v13CanvasRetirement` 均在本次整跑中通过，未过滤子例。它们尚未接门，不能申报“接门后绿”。

## 四条失败定位

| 文件 / 失败 | 现物证据 | 结论 |
|---|---|---|
| `v13AtomicTextSaveMigration.test.ts` 首例 | 测试 64 行 fresh 为当前 schema，66 行 upgrade 停在 063 前，74 行只补 063，77 行比较全部表。`helpers/v13BoardsFixture.ts:60` 截断后续迁移；065 增加 `boards.item_id`，068 增加 `boards.skin`。原日志 2115 行。 | 测试两侧迁移终点不同；063 revision 语义仍活，不能归退役。 |
| 同文件第二例 | 101 行只记 001–062 已跑，110 行期望全量 runner 返回 1；`db/migrate.ts:99` 选全部 pending，实际 063–069 共 7。111/115/116 行还假设新增 ledger 仅一条、保留表完全不变；065 会合法回填 board identity。原日志 2321 行。 | 不能只把 1 改成 7，需要重新界定该例迁移范围。 |
| `v13EventsLedger.test.ts` 首例 | 100 行硬编码 9，注释明确 054–062；现有 runner 执行 054–069 共 16。原日志 2611 行。 | 账本与迁移语义仍活，是终点断言陈旧。 |
| `v13ProjectDeletionReferences.test.ts` legacy soul 例 | 124 行造 pre-057 fixture，127 行只补 057–062，128 行调用当前 createBoard；`boards.ts:335` → `items.ts:369` 查询尚未由 065 添加的 `item_id`。真正 legacy 阻断仍在 `courseLifecycle.ts:314–327`。原日志 4351 行。 | fixture 建立时失败，尚未执行到活的删除阻断断言。 |

以上不是已证实的产品回归；也不符合工单“被测物已退役”的处置许可。需上游明确三份活套件的 fixture / 迁移边界修复归属。裁决中已许可留给单1的 `v2CanvasPersistenceCutover` 25 条陈旧红是另一项，本次未运行、未改动该文件。

## 隔离与边界

实跑从仓库根通过临时验证脚本调用 `scripts/run-server-test-suite.mjs`，完整显式参数在原始日志首行；Node v22.22.1，`--test-concurrency=1 --test-reporter=tap`。未通过 name-pattern 筛选，已有安全语义断言随功能回归原样执行。

DB fixtures 采用内存或新建临时库。运行器设置 `DB_PATH=:memory:`、新建空 dotenv 文件、空 Vite env 目录、仓外临时 app-data、临时资产/blob/upload 目录，并清空六个 provider API key 环境变量；未读取仓库 `.env`、真实 credential 文件或用户库。测试中的 provider HTTP 使用既有 mock。首次实跑沿用原运行环境的其他变量；后续未重跑。

CodeGraph 已优先尝试，CLI 和 MCP 均不可用；rg 也不在 PATH，采用 Node / PowerShell 限定目录读查。未使用任何 Git 命令或访问 `.git`；numstat 与完整性证据以本轮施工前字节快照为基线，不声称相对 Git HEAD。

## 未完成项

1. 新机关仍为初稿：未接 verify，未完成仓库阳性对照。其当前口径是 script 中的显式路径引用；尚需把识别收紧至已知测试 runner 命令段，避免普通文本命令中的路径被误计为执行参数。
2. 24 项及额外 1 项均未接门，零豁免。两份 package 与基线字节相同，前后 script 对照为“无变化”。
3. 未接 `check:tech-debt-table`，原脚本及 TD-6/TD-12/TD-28 历史豁免未改。
4. 停线后未跑 server 全量、typecheck、build、verify 或额外安全测试；148 是漏挂套件数，绝不是全量数。
5. 原 verify 的 `git diff --check` 与 `check:changed-file-secrets` 本身和本单禁区冲突，未执行；本次无“总门全绿”结论。
6. 未更新 current-state、生成文档、单1或上游裁决；未 commit、push、PR、merge。

交付/停线文件台账及逐文件处置见工单 Result；完整文件增删行数见 `numstat.tsv`。本目录只含证据和施工前快照，无构建产物。
