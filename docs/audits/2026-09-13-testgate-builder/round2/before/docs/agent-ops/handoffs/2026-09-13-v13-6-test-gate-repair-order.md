> **状态 (Status)**: ready(13.6 裁决半场执行单2,先行;Henry 2026-09-13 拍板"单2先行单1在后")
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
