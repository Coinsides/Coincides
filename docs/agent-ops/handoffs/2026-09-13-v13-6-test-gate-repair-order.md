> **状态 (Status)**: done(补遗二三轮终态达成;保留25条已裁归单1 Canvas红+2条已知环境红;HQ收口补跑git/secrets)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-13
> **单号**: 13.6 · 单2 · 测试门修复(TD-22 置顶还款)
> **上游**: `analysis/2026-09-13-v13-6-adjudication.md`(裁决档,执行以其为准);tech-debt.md TD-22/TD-6/TD-21 行

# 单2 · 测试门修复:漏挂发现机关+24 文件接门

**背景**:69 个 server 测试文件中 24 个不被任何 npm script 引用——其中含 TD-6 的 killer(`v13AtomicTextSave`)、TD-21 的字素守护(`v13GraphemeTextRanges`)、TD-7 的退役闸(`v13CanvasRetirement`)。"一个绿的、没人跑的契约测试,和不存在的契约测试,在 CI 里是同一回事"(TD-22 原文)。本单先修网,单1(死码大单)随后动刀。

## 一 · 漏挂发现机关(新静态门)

1. 新脚本(如 `server/scripts/check-test-wiring.mjs` 或按仓惯例落位):扫描 server 测试目录全部 `*.test.ts`,与 package.json 全部 script 引用的文件列表比对;**存在未被任何 script 引用的测试文件即红**,输出漏挂清单;
2. 显式豁免机制:确需排除的文件走豁免清单(带理由注释),⛔静默跳过;
3. 接入 `verify:v2-bn8-runtime` 链(秒级);
4. **⛔改用 glob 跑测试**——"curated gate"语义维持,glob 改法候裁(TD-22 原文),本单只做"发现机关"。

## 二 · 24 漏挂文件接门

1. 以机关首跑输出为准,逐个核每个漏挂文件:①还测得到现物吗(被测物没死)②跑起来绿吗;
2. 绿且有效→接入 `test:v2`(或其所属既有分组 script);红→逐个诊断:陈旧(被测物已退役)→列入"候单1同批处置"清单⛔本单删;真红→停线举证;
3. 特别确认三件接门后绿:`v13AtomicTextSave`(TD-6 killer)、`v13GraphemeTextRanges`(TD-21 守护)、`v13CanvasRetirement`(TD-7 退役闸——注意单1 将拆桥,本单先接门,拆桥时该测试随单1 改写);
4. 接门后 server 全量跑一遍申报数字(14700F 姑息:如需降并发按既定节奏)。

## 三 · check:tech-debt-table 接总门

根 package.json 的 `check:tech-debt-table` 现不在 `verify:v2-bn8-runtime` 链——接入(秒级;三行历史豁免语义零动)。

## 四 · 禁区

⛔删任何测试文件(陈旧者列清单交单1);⛔改被测产品代码;⛔glob 化测试入口;⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库接触。registry/parity 等含安全语义断言的套件若在漏挂名单:**接门照做**(它们属既有回归套件,例行整跑不违例),⛔name-pattern 过滤子例,⛔为接门而修改其内容。

## 五 · 验收

1. 新机关:阳性对照(临时造一个未挂测试文件→红→删除→绿,证据留档)+接入 verify 链;
2. 24 文件处置台账:逐文件(接门 script/陈旧候单1/停线)三分类,零遗漏;
3. server 全量数字+typecheck/build 绿;`check:tech-debt-table` 在 verify 链内跑绿;
4. 证据落 `docs/audits/2026-09-13-testgate-builder/`(⛔构建产物)。

## 六 · 申报义务

Result 必含:交付清单+numstat、机关阳性对照证据、24 文件三分类台账、接门前后 script 对照、全量测试数字、未做项。冲突停线举证⛔自作主张。

## Result

**Codex builder：停线，未完成接门，状态保持 ready。** 漏挂首跑发现三份仍有效的套件有 fixture / 迁移终点漂移，共四条失败；它们不符合本单“陈旧(被测物已退役)→候单1”的许可。按“冲突停线举证”停止施工，没有修改、过滤或豁免这些套件，也没有把该结果冒充产品真红或全门通过。

### 交付与 numstat

- 新增 `server/scripts/check-test-wiring.mjs` 初稿：递归扫描 `server/src`、`server/scripts` 的 `.test.ts`，与根及 server package 全部 scripts 的显式文件路径比对；未挂即红。显式豁免表当前为空；空理由、失效路径、已接门却仍豁免会报红。不执行测试，不展开 glob。
- 证据目录：[2026-09-13-testgate-builder](../../audits/2026-09-13-testgate-builder/README.md)，含首次漏挂输出、完整 TAP 日志、失败摘录、机器摘要、package/工单施工前快照与源码完整性快照，无构建产物。
- 本 Result 为追加，原单正文未改；两份 package 未改。完整交付增删行数见 [numstat.tsv](../../audits/2026-09-13-testgate-builder/numstat.tsv)。统计基线是本轮施工前字节快照，**不是 Git HEAD**；本轮未执行 Git 命令、未访问 `.git`。

### 新机关与阳性对照

首跑实际输出为 **75 文件 / 50 已挂 / 0 豁免 / 25 漏挂，exit 1**，见 [wiring-before.log](../../audits/2026-09-13-testgate-builder/wiring-before.log)。工单原口径仍精确成立：`server/src/__tests__` 69 文件、24 漏挂；扩大到整个 server 源码/脚本目录后另发现 `server/src/agent/providers/index.test.ts`，没有静默忽略。

**阳性对照未做，接入 verify 未做。** 当前仓库基线本来就红，尚未达到“新增临时漏挂→红→删除→绿”的验收前提；未制造假绿。机关初稿的边界也如实申报：当前识别 script 的字面量文件引用，尚需收紧为已知测试 runner 的命令段，避免普通文本命令中出现路径被误计；未宣称机关已经完整验收。

### 24 文件三分类台账

下表文件均在 `server/src/__tests__/`。分类统计：**已接门 0 / 陈旧候单1 0 / 停线 24**。其中 21 份本次完整套件实跑通过，拟接 `server/package.json#test:v2`，但因全单停线尚未修改脚本；另 3 份是需上游定修复归属的活套件。

| 文件 | 本次套件结果 | 处置分类 / 接门状态 |
|---|---|---|
| `providerCredentials.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13AgentMemories.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13AtomicTextSave.test.ts` | 通过，TD-6 killer | 停线；拟 test:v2，未接 |
| `v13AtomicTextSaveMigration.test.ts` | 2 条失败 | 停线；活的迁移套件，边界需裁定 |
| `v13BoardChalk.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13BoardStaging.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13BoardTextRanges.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13BoardTrayRelocation.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13BoardViewportBookmarks.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13CanvasRetirement.test.ts` | 通过，TD-7 退役闸 | 停线；拟 test:v2，未接 |
| `v13EventsLedger.test.ts` | 1 条失败 | 停线；活的账本套件，边界需裁定 |
| `v13GraphemeTextRanges.test.ts` | 通过，TD-21 字节等同守护 | 停线；拟 test:v2，未接 |
| `v13ItemRefBlocks.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13MediaBlocks.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13NoteMetadata.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13PagePresets.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13PaperInk.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13PaperSkin.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13ProjectDeletionReferences.test.ts` | 1 条失败 | 停线；活的删除阻断套件，fixture 需裁定 |
| `v13SourceProjectionRepair.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13SourceReprojection.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13Tray.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13TrayOrder.test.ts` | 通过 | 停线；拟 test:v2，未接 |
| `v13WallCollectionBatch.test.ts` | 通过 | 停线；拟 test:v2，未接 |

额外第 25 份 `server/src/agent/providers/index.test.ts`：完整套件通过，停线待接 test:v2。以上全部相对 import 与字面量源码目标已只读核实存在，没有发现被测现物退役；含安全语义断言的既有功能回归均整套原样运行，未做额外安全测试，未用 name-pattern 过滤，未改内容。

### 失败定位与需裁定事项

1. `v13AtomicTextSaveMigration.test.ts:77`：fresh fixture 已到当前迁移终点，upgrade 只补 063，却比较全部 retained table schema；缺后续 065 的 `boards.item_id` 和 068 的 `boards.skin`。同文件 110 行期望完整 runner 只执行 1 个，实际 063–069 共 7 个；后续 ledger 数量及 retained rows 断言亦绑定旧终点，不能仅改数字。
2. `v13EventsLedger.test.ts:100`：硬编码 054–062 共 9 个，当前 runner 实际执行 054–069 共 16 个。账本本体与其余断言仍活。
3. `v13ProjectDeletionReferences.test.ts:127–128`：fixture 只补 057–062，就调用当前 createBoard；当前路径 `boards.ts:335` → `items.ts:369` 需要 065 新增的 `item_id`，在构造 fixture 阶段报 `no such column: item_id`。真正 legacy soul 阻断仍存在于 `courseLifecycle.ts:314–327`，未执行到该断言。

原始日志失败位置分别为 **2115 / 2321 / 2611 / 4351 行**，见 [failures.log](../../audits/2026-09-13-testgate-builder/failures.log)。需上游明确这三份活套件的 fixture / 迁移边界修复归属；本单没有自行扩大到改测试或豁免活语义。裁决中留给单1的 `v2CanvasPersistenceCutover` 25 条陈旧红是另一项，本次未跑、未改。

### Scripts 前后对照、测试数字与未做项

| 项目 | 施工前 | 停线时 |
|---|---|---|
| server `test:v2` | curated runner + 显式 32 文件 | 字节不变，未追加漏挂文件 |
| 根 `verify:v2-bn8-runtime` | 无 test-wiring / tech-debt-table | 字节不变，两门均未接 |
| `check:tech-debt-table` | 独立脚本，三条历史豁免 | 原样保留，未执行 |
| 全部既有测试 / 产品源码 | 施工前哈希快照 | 见 integrity.json；本轮零内容修改、零测试删除 |

首跑命令是既有 `run-server-test-suite.mjs` 加完整显式漏挂清单，使用 `--test-concurrency=1 --test-reporter=tap`；实跑 **148 tests / 144 pass / 4 fail / 0 skipped / 0 cancelled / 0 todo，exit 1**。原始命令及用时 23.627 秒在 [missing-suites.log](../../audits/2026-09-13-testgate-builder/missing-suites.log) 首行。**这是漏挂 25 套件的数字，不是 server 全量数字。**

停线后未跑全量 server、typecheck、build、verify；未做机关阳性对照；未接任一漏挂或新增总门；未添加豁免；未更新 current-state、生成文档、单1或上游裁决；未 commit / push / PR / merge。

另有独立验收冲突：原 verify 末尾含 `git diff --check` 和 `check:changed-file-secrets`，后者也会调用 Git 并读取文件做秘密扫描，与本单禁区冲突，均未执行。DB 使用内存或新建临时夹具，设置空 dotenv / Vite env 目录及隔离 app-data、资产/blob/upload 目录，清空六个 provider API key 环境变量；未读取 `.env` key 值、真实 credential 文件或用户库。没有“总门全绿”或“本单已完成”的申报。

---

## 补遗一(HQ 裁定,2026-09-13 二轮)

停线举证成立收货。三份活套件的 4 条失败判定:**测试 fixture/期望落后于现役迁移终点的过期红**(TD-22 的直接受害者——从未被跑,13.5 加迁移 063-069 时无人知其存在),⛔产品真红。裁定:

1. **授权本单修这三份测试自身**(⛔碰产品代码的禁区不涉及测试文件):
   - 原则=对齐现役迁移终点且**活语义零放宽**:绑定迁移终点的断言优先改为**从 migration runner 现算**(动态终点,后续加迁移不再腐烂);做不到动态处补齐到现役终点并留"新迁移须同步"注释;
   - `v13AtomicTextSaveMigration`:fixture 与 retained-schema/ledger/rows 断言按上原则修;迁移升级验证语义保全;
   - `v13EventsLedger`:054-062 硬编码按上原则改;账本断言零动;
   - `v13ProjectDeletionReferences`:fixture 迁移补齐到现役终点(跑全量迁移),legacy soul 阻断断言零动;
   - ⛔删断言⛔放宽语义⛔豁免。
2. 三份修绿后:**25 份全部接入 `server/package.json#test:v2`**;
3. 机关收紧(你自报的字面量误计边界→收紧为测试 runner 命令段识别)+豁免表保持空+**阳性对照**(基线绿后:临时未挂文件→红→删→绿,证据留档)+接入 `verify:v2-bn8-runtime`;
4. `check:tech-debt-table` 同批接 verify 链;
5. **验收冲突裁定**:verify 链末端 git diff --check 与 secrets 扫描按 B1e 先例——builder 拆开执行允许子门,该两项由 HQ 收口补跑,⛔算你未验;
6. 完成后:server 全量+typecheck/build 数字,Result 更新,status 翻 done。

## Result（补遗一 · 二轮执行）

**Codex builder：补遗前四步完成，全量数字已取得；发现额外 MCP 活接口契约真红，按原单停线举证，status 保持 ready，未翻 done。** 三份获准修复的套件已全绿、25 份全部接入 test:v2、新机关阳性对照与两门接 verify 已完成。停止扩大修改的直接依据是原单「真红→停线举证」与「⛔改被测产品代码」；本次真实 MCP 失败不能靠测试 fixture 或放宽断言修复。

本节为当前回执；上方首次停线 Result 原样保留为历史。详细证据：[round2/README.md](../../audits/2026-09-13-testgate-builder/round2/README.md)。

### 交付与语义保全

- `v13AtomicTextSaveMigration.test.ts`：真实 initDb / migration runner 账本计算动态终点；保留 063 默认 revision、历史完整 rows、重跑不改 revision、FK 与原精确 PRAGMA 断言；加入空历史夹具、带历史数据升级夹具、真实 startup 的三路径 schema 对照。逻辑对照仅规范化物理编号，完整列约束、FK 分组和索引语义不放宽。
- `v13EventsLedger.test.ts`：以真实 runner 的 pending 账本替代 054–062 数量硬编码；事件账本断言逐字不动。
- `v13ProjectDeletionReferences.test.ts`：补录手工夹具已执行的历史迁移，再跑完整 runner 的全部 pending；legacy soul 两分支、409、整组 rows 不变和 soul_id 断言逐字不动。
- `server/package.json`：保留原 test:v2 runner + 32 文件的逐字前缀，追加全部 25 文件，成为 57；无删除、重复、glob、子例过滤。
- `server/scripts/check-test-wiring.mjs`：收紧至真实 Node --test / 精确解析的既有隔离 wrapper 命令段；普通文本与选项值不计挂，未知复杂 shell 不猜测，空豁免表保持不变。
- 根 `package.json`：verify 前置 `check:test-wiring` 与 `check:tech-debt-table`；旧链和 HQ 末尾两项完整保留，tech-debt-table 脚本及三条历史豁免零动。
- `docs/generated/object-inventory.md`：运行既有生成器，同步验证门清单；无手改权威现状或权限文件。

完整增删行数：[round2/numstat.tsv](../../audits/2026-09-13-testgate-builder/round2/numstat.tsv)，基线为本轮施工前字节快照，**不是 Git HEAD**。限定 1003 个源码文件的完整性核对：999 字节不变，仅上述三份测试与机关改变，零删除、零新增源码。见 [integrity.json](../../audits/2026-09-13-testgate-builder/round2/integrity.json)。

### 25 文件处置台账

**已接门 25 / 陈旧候单1 0 / 未接停线 0**，以下均整套通过并接入 `server/package.json#test:v2`。全单停线由后述额外全量失败触发，不是这 25 份仍未接门。

| 文件（默认位于 server/src/__tests__/） | 分类 / 接门 |
|---|---|
| `providerCredentials.test.ts` | 已接 test:v2，整套通过 |
| `v13AgentMemories.test.ts` | 已接 test:v2，整套通过 |
| `v13AtomicTextSave.test.ts` | 已接 test:v2，TD-6 killer 通过 |
| `v13AtomicTextSaveMigration.test.ts` | 授权修复；已接 test:v2，整套通过 |
| `v13BoardChalk.test.ts` | 已接 test:v2，整套通过 |
| `v13BoardStaging.test.ts` | 已接 test:v2，整套通过 |
| `v13BoardTextRanges.test.ts` | 已接 test:v2，整套通过 |
| `v13BoardTrayRelocation.test.ts` | 已接 test:v2，整套通过 |
| `v13BoardViewportBookmarks.test.ts` | 已接 test:v2，整套通过 |
| `v13CanvasRetirement.test.ts` | 已接 test:v2，TD-7 退役闸通过 |
| `v13EventsLedger.test.ts` | 授权修复；已接 test:v2，整套通过 |
| `v13GraphemeTextRanges.test.ts` | 已接 test:v2，TD-21 守护通过 |
| `v13ItemRefBlocks.test.ts` | 已接 test:v2，整套通过 |
| `v13MediaBlocks.test.ts` | 已接 test:v2，整套通过 |
| `v13NoteMetadata.test.ts` | 已接 test:v2，整套通过 |
| `v13PagePresets.test.ts` | 已接 test:v2，整套通过 |
| `v13PaperInk.test.ts` | 已接 test:v2，整套通过 |
| `v13PaperSkin.test.ts` | 已接 test:v2，整套通过 |
| `v13ProjectDeletionReferences.test.ts` | 授权修复；已接 test:v2，整套通过 |
| `v13SourceProjectionRepair.test.ts` | 已接 test:v2，整套通过 |
| `v13SourceReprojection.test.ts` | 已接 test:v2，整套通过 |
| `v13Tray.test.ts` | 已接 test:v2，整套通过 |
| `v13TrayOrder.test.ts` | 已接 test:v2，整套通过 |
| `v13WallCollectionBatch.test.ts` | 已接 test:v2，整套通过 |
| `server/src/agent/providers/index.test.ts` | 额外第25份；已接 test:v2，整套通过 |

### 机关阳性对照与 scripts 对照

阳性对照 **12 项通过**：基线 75/75/0/0 → 新增临时未挂文件 76/75/0/1（exit 1）→ 六种普通文本/选项值假引用仍红 → 三种真实 runner 显式接门绿 → 删除临时文件、字节恢复 package 后 75/75/0/0（exit 0）。未执行临时测试本身。逐项原始日志及汇总：[wiring-controls.json](../../audits/2026-09-13-testgate-builder/round2/wiring-controls.json)。

| Script | 施工前 | 本轮后 |
|---|---|---|
| server `test:v2` | curated runner + 32 显式文件 | 原命令逐字前缀 + 25，合计57 |
| 根 `verify:v2-bn8-runtime` | 旧链，缺两门 | test-wiring + tech-debt-table + 完整旧链 |
| `check:tech-debt-table` | 独立脚本、三项历史豁免 | 定义及豁免不变，已进入 verify 并跑绿 |

完整命令前后：[test-v2-scripts.json](../../audits/2026-09-13-testgate-builder/round2/test-v2-scripts.json)、[verify-scripts.json](../../audits/2026-09-13-testgate-builder/round2/verify-scripts.json)。

### 全量验证数字

| 项目 | 本次实跑 |
|---|---|
| 三份授权套件最终复验 | 12 tests / 12 pass / 0 fail |
| server test:v2，57 文件 | 466 tests / 438 pass / 28 fail，exit 1 |
| server 其余18唯一文件 | 179 tests / 175 pass / 4 fail，exit 1 |
| server 合计75文件尝试执行 | **645 tests / 613 pass / 32 fail / 0 skipped / 0 cancelled / 0 todo** |
| client unit | 151 文件、1590 tests，全通过 |
| server / client typecheck | 两端 exit 0 |
| server / client build | 两端 exit 0 |
| verify 允许的完整子门集合 | **21/21 exit 0**；含新两门与 docs:check |

server 两批显式文件集合互不重复，使用 `--test-concurrency=1 --test-reporter=tap`；保留 test:v2 真实 npm pretest 钩子。645 为 TAP 实际数字，含一个模块加载失败（MineruWiring 内部用例未注册），不能称全部内部用例已跑。原始日志、各门退出码和用时：[validation-summary.json](../../audits/2026-09-13-testgate-builder/round2/validation-summary.json)。

### 新停线证据与未做项

32 条失败分为：**25 条上游已交单1的 Canvas 陈旧红 + 4 条额外活测试过期 + 2 项 Python 环境前置失败 + 1 条 MCP 活产品契约真红**。逐文件、行号与定位详见 [二轮证据表](../../audits/2026-09-13-testgate-builder/round2/README.md)。四份额外活测试为 `v2MaterialLibrary`（模板3→4）、`v13BoardIdentity`（升级停065缺068 skin）、`v13WildernessExecute`（旧缺省墙期待）、`v2NotesLifecycle`（B1a旧handler hash未跟B1c改型保护）；均超出补遗列出的三份修复授权，没有擅自改断言或归退役。

**直接停线项：`v2McpTransport.test.ts` 的 `list_note_blocks` 真实调用失败。** `services/notes.ts:173` 返回 `text_save_revision`，hydration 保留该字段；`toolFace/registry.ts:109–132` 的严格输出 schema 未声明该字段，生产 manifest 也拒绝额外字段。fixture 已跑当前全部迁移，直接 service 的两块/来源断言通过，MCP 响应却无 structuredContent（[server-supplemental.log](../../audits/2026-09-13-testgate-builder/round2/server-supplemental.log) 1295 附近）。接口契约冲突由运行失败结合现物确证；日志未打印原始 MCP error content，具体 SDK 错误正文不冒充亲见。

未修上述产品契约、四份额外测试或仓外 Python 工具链；未改任何其他既有测试或产品源码；未做安全专项测试、name-pattern 过滤、测试豁免、用户库操作、真实凭证读取、Git/.git、commit/push/PR/merge。构建产物未进入 audits。

**git diff --check 和 secrets 扫描按补遗第5条由 HQ 收口补跑，不计 builder 漏验。** 这与本轮另发现的活契约真红是两件事。原单禁止产品修改且要求真红停线，所以不以 21 道允许子门全绿代替 server 全量通过，亦不将本单翻 done；待 HQ 裁定新的修复归属与收口条件。

---

## 补遗二(HQ 裁定,2026-09-13 三轮)

二轮停线举证成立收货。32 红四类裁定:

1. **25 条 Canvas 陈旧红=单1 既裁域**(裁决档 A3:fixture surface→formal_page),⛔本单碰;全量数字中标注"已裁归单1"即可;
2. **2 条 Python 环境红(MineruWiring/c-1b-2)=13.6 总测基线既档**(w4-fix6 判环境候查),⛔本单碰;申报为已知基线红;
3. **4 条额外活测试过期:授权本单修**(与补遗一同族=测试腐烂,发现即修):
   - `v2MaterialLibrary`(模板 3→4:媒体先遣加 media 模板的合法涟漪)——断言对齐现役模板集;
   - `v13BoardIdentity`(升级夹具停 065 缺 068 skin)——迁移终点按补遗一"动态终点优先"原则修;
   - `v13WildernessExecute`(旧缺省墙期待)——对齐 D1 后现役墙缺省;
   - `v2NotesLifecycle`(handler hash 未跟 B1c 改型保护)——更新 hash 并注明对应合法交付(B1c commit),⛔无注更新;
   - 一律活语义零放宽⛔删断言;
4. **MCP 严格输出 schema 漏声明=真产品缺陷,授权本单修**(B7 的收尾遗漏):`toolFace/registry.ts` 的 `list_note_blocks` 输出 schema 补声明 `text_save_revision`(如实声明真实返回,零语义变更);manifest 按既有生成器重生成;parity/manifest 门须绿;`v2McpTransport` 转绿;⛔顺手动其他工具 schema。

**终态判据**:server 全量红仅剩 25(canvas,候单1)+2(环境,候总测),其余全绿;三份+四份修复测试、25 接门、机关、两新门全在;Result 更新;status 翻 done。

## Result（补遗二 · 三轮执行）

**Codex builder：补遗二终态判据已达成，status 翻 done。** Server 全量75文件尝试执行，**645 tests / 618 pass / 27 fail**；失败集合严格为 **25条 Canvas 陈旧红（已裁归单1）+2条 Python 已知环境红（候13.6总测）**，其他全绿。done 是本单工程终态，不代替 HQ 放行；未申报 server 全绿。

本节为最新回执；前两轮停线 Result 原样保留为历史。详细证据：[round3/README.md](../../audits/2026-09-13-testgate-builder/round3/README.md)。

### 交付与活语义保全

| 文件 | 本轮修复 | numstat |
|---|---|---|
| `server/src/__tests__/v2MaterialLibrary.test.ts` | 对齐包含媒体先遣 `media.image` 的现役四模板集；保留原数量、幂等、版本、来源及作用域断言，补三路精确键集校验 | +6/-1 |
| `server/src/__tests__/v13BoardIdentity.test.ts` | 从真实 startup ledger 取得动态终点，补录已手工运行的 pre-065 历史后跑完整 runner；base-schema 重放、原 PRAGMA、唯一性、FK、NULL 及其他065定点测试全保留 | +18/-1 |
| `server/scripts/v13WildernessExecute.test.ts` | 按 D1 后墙契约，缺 page_size 保留持久墙 top=96，Source candidate.y=0；增加完整 contentInset 等值断言 | +8/-4 |
| `server/src/__tests__/v2NotesLifecycle.test.ts` | handler hash 对齐合法 B1c 不可改纸型交付，附 commit 收据、工单和精确patch出处；原断言保留 | +8/-2 |
| `server/src/toolFace/registry.ts` | 仅给 `list_note_blocks` 输出补必填非负整数 `text_save_revision` | +1/-0 |
| `docs/generated/tool-face-manifest.json` | 按既有生成器重生成，仅投影该字段及 required 项 | +5/-0 |

上述六文件合计 **+46/-8**。连同本工单状态/追加回执及证据的完整增删行数见 [round3/numstat.tsv](../../audits/2026-09-13-testgate-builder/round3/numstat.tsv)；基线为施工前字节快照，**不是 Git HEAD**。

工单翻done后文档末检提示自动索引状态过期，已运行既有 `docs:index` 生成器，仅同步 `docs/agent-ops/INDEX.md` 的本工单状态条目；其他八份索引未变。原始失败、生成输出和随后绿色复验分别存于 round3 的 `final-docs-check.log` / `generate-docs-index.log` / `final-docs-check-after-index.log`，索引变更计入完整numstat。

**B1c hash 署名**：新 SHA 为 `0dfd76eb9fa0f7c0f8002596663a4ff2fa052f0aa8c7e7d01318d1436f559b57`；代码注释指出 B1c 工单 Result、09-09 日志 §115“B1c 已 commit”及 B1c `product-changes.patch`。将该合法交付的 owned-note binding 与 immutable guard 在内存精确逆向，即恢复旧 B1a SHA `69f60628e10e2930a2c8ab540a85b25a1b569957f9e1e48da33f9af87b2c916e`，没有借更新hash吞掉其他handler漂移。**Docs 收据未刊 commit ID**，未访问 `.git` 求值或伪造ID；出处行号与核对证据见 [handler-hash-provenance.json](../../audits/2026-09-13-testgate-builder/round3/handler-hash-provenance.json)。

**MCP 限界**：manifest完整结构对照证明仅 `list_note_blocks` 增加该声明，其他13工具完整对象不变；registry删除新增一行即与before字节等同。`v2McpTransport` 整套及真实 `list_note_blocks` 调用转绿，未改该测试；manifest/registry/parity各门均绿，生产manifest与生成源字节等同。证据：[mcp-manifest-delta.json](../../audits/2026-09-13-testgate-builder/round3/mcp-manifest-delta.json)。

### 接门台账、机关与 scripts 保全

**已接门25 / 陈旧候单1（漏挂集合内）0 / 未接停线0**，前节25文件逐项台账全部继续成立；TD-6 killer、TD-21字素守护、TD-7退役闸及补遗一三份修复测试本轮均整套通过。补遗一三测试、两package、机关和tech-debt门均与本轮before字节相同；无测试删除、语义放宽或豁免。

Server `test:v2` 仍为原32逐字前缀追加25后的57显式文件；其余18唯一文件完整补跑，合计75，清单与二轮全等。verify仍为两新门+完整旧链+HQ两尾门。前后全文继续见 [test-v2-scripts.json](../../audits/2026-09-13-testgate-builder/round2/test-v2-scripts.json) / [verify-scripts.json](../../audits/2026-09-13-testgate-builder/round2/verify-scripts.json)。

机关本轮亲跑 **75/75 wired/0 exempted/0 unwired，exit0**；豁免表保持空。二轮已完成的 [12项阳性对照](../../audits/2026-09-13-testgate-builder/round2/wiring-controls.json) 继续有效：基线绿→临时漏挂红→六类假引用仍红→三类真实runner引用绿→删除临时文件、恢复package后绿；本轮机关与scripts不变，未重复制造临时文件。`check:test-wiring`、`check:tech-debt-table` 均仍在verify且本轮跑绿，tech-debt三条历史豁免零动。

### 全量验证数字与四类裁定

| 项目 | 本轮实跑 |
|---|---|
| Server test:v2，57文件，保留真实npm pretest钩子 | 466 tests / 439 pass / 27 fail，exit1 |
| Server其余18唯一文件，完整套件 | 179 tests / 179 pass / 0 fail，exit0 |
| Server合计75文件尝试执行 | **645 tests / 618 pass / 27 fail / 0 skipped / 0 cancelled / 0 todo** |
| Client unit | 151文件、1590 tests，全通过 |
| Server / client typecheck | 两端exit0 |
| Server / client build | 两端exit0 |
| verify允许的完整子门集合 | **21/21 exit0**，含两新门、registry/manifest/parity、docs:check |

全部完整套件使用 `--test-concurrency=1 --test-reporter=tap`，无name-pattern或其他子例过滤；七份修复测试和25接门都在全量集合内，不重复累加。645为真实TAP计数，**含MineruWiring模块加载失败，其内部五用例未注册**，不以0 skipped冒充内部全跑。完整命令、用时和退出码：[validation-summary.json](../../audits/2026-09-13-testgate-builder/round3/validation-summary.json)。

1. **25 Canvas红：已裁归单1**。全部位于 `v2CanvasPersistenceCutover.test.ts`，文件未改。
2. **2环境红：已知基线红，候13.6总测**。`v2SourceMineruWiring.test.ts` Python ENOENT；`v2SourceRegionCells.test.ts` 的c-1b-2 pinned Python无法启动（exit101）；测试和环境均未改。
3. **4份活测试腐烂：获准修复并转绿**，活语义零放宽。
4. **MCP真产品缺陷：仅补真实字段声明并转绿**，其他工具schema零动。

逐条失败名称、文件、原始诊断和日志行号：[failures.json](../../audits/2026-09-13-testgate-builder/round3/failures.json)。机器摘要强制核对仅25/1/1，没有把额外失败塞进裁定类别。

### 完整性与未做项

限定源码射程1003文件中998字节不变，仅4测试+registry改变，新增0/删除0；两package、补遗一三测试、机关、tech-debt门与object inventory均字节不变。证据：[integrity.json](../../audits/2026-09-13-testgate-builder/round3/integrity.json)。

DB全部为内存/临时合成夹具；空dotenv/Vite env、临时app-data/assets/blobs/uploads、清空provider key的设置与命令留档。未读真实.env key值、凭证或用户库；未改Canvas/环境红、其他产品实现或工具schema、current-state、权限文件；未删测试、增豁免、glob化、做安全专项或子例过滤；未执行Git、访问.git、commit/push/PR/merge。临时合成目录留在临时区，构建产物未进audits。

**git diff --check与secrets扫描按HQ补遗由HQ收口补跑，不计builder漏验。** 本单终态已达成，故按补遗二翻done；保留的27红、HQ尾门及最终放行权均如实留给既定承接方。
