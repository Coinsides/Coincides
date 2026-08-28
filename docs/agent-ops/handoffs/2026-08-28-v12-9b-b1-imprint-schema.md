> **状态 (Status)**: ready
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-28
> **裁定来源**: Fable(身份锚点挂新代 / 表名取词典词 / K-2 采 (a);段计划 `plans/v12-9b-segment-plan.md`,规格 `plans/v12-9b-anchored-fragment-stream-spec.md` §2–§4/§6)

# b-1:碎片流 schema 落地 + 拓印件出生证

## 0. 段目标与边界

**造「接住任何转写器产物」的地基。** ⛔ **本单零转写器接入**(那是 12.9c)、⛔ **不动现役 parser 行为**、⛔ **不碰 MCP 工具面**。

⭐ **本单的全绿判据**:**一份手造碎片流 fixture 走完「存 → 出生证 → 校验 → 按锚取回」全环。**

## 1. ⚠️ 现物前提(b-0 已核,⛔ 不要重新调查)

- **仓里有两代 source 身份,两代都活着**(TD-34)。**Fable 裁:本单挂【新代】** —— 外键指向 **`source_files`**(`045_v2_source_identity_floor.ts`)。
- ⛔ **不碰旧链一个字节**:`source_fragments` / `source_materials` / `documents` / `document_chunks` **一律不动、不改名、不迁移**。与旧链三处消费者断开**是正确的隔离,不是缺陷**。
- **查重指纹活在新链**:`source_files.content_hash`(`sourceFileIntake.ts:328` 真算 sha256)。

## 2. 允许面

- **新建迁移**:`server/src/db/migrations/049_v2_source_imprints.ts`
- **新建**:`server/src/services/sourceImprints.ts`(存 / 取 / 校验)
- **新建**:`server/src/__tests__/v2SourceImprints.test.ts`
- **`server/package.json`** —— ⭐ **仅**把上述测试文件**追加**进 `test:v2` 的文件清单(⛔ 不改其它 script、⛔ 不改既有参数的逐字内容与顺序)
- `docs/agent-ops/current-state/deferred-tests.md` —— **仅**追加 §5 那一行(⛔ 不改既有行)

⭐ **迁移序号与注册方式(第一次派工的只读侦察核定,复核方已复验;⛔ 此段是说明,不是允许面)**:
现树最高迁移为 **048** ⇒ 新文件即 **049**。迁移器**动态扫描 `migrations/` 目录并按文件名排序**,**仓内没有迁移注册清单** ⇒ **⛔ 不要新增注册项、不要猜注册路径,⛔ 也不要修改迁移器本身。**

⛔ **禁区**:**迁移器本身** · `server/src/mcp/**` · 工具注册表 · `scripts/generate-tool-face-manifest.ts` · `docs/generated/tool-face-manifest.json` · `services/documentParser.ts` · 任何旧链表与其服务。

## 3. Schema(按规格 §2–§4;**表名即词典词**)

**`source_imprints`(拓印件出生证)** —— 一次拓印一行:
`id` · `user_id` · `source_file_id`(→ `source_files` ON DELETE CASCADE)· `transcriber_name` · `transcriber_version` · `transcriber_lockfile` · `anchor_fidelity` · `text_normalization` · `fragment_count` · `warnings_json`(默认 `'[]'`)· `created_at`

**`imprint_fragments`(碎片)** —— 一碎片一行:
`id` · `imprint_id`(→ `source_imprints` ON DELETE CASCADE)· `seq` · `text` · `role` · `anchor_json` · `style_json`(可空)· `lang`(可空)· `created_at`

**封闭枚举(按规格,⛔ 不自行扩)**:
- `role`:`heading|para|list_item|table_row|cell|slide_shape|caption|code_line|footnote|blank`
- `anchor.family`:`page|flow|table|slide|time`
- `anchor_fidelity`:`region|block|page|char|element|section|cell`
- `text_normalization`:`none|punctuation|whitespace`

⚠️ **`time` 族本期无生产者** —— **形状收得进,⛔ 不实现写入端**(规格 🅿)。

### ⭐ 3.1 fixture 约定(2026-08-28 订正后新增 —— K-1/K-2/K-6 全依赖它)

⚠️ **原单缺这一节,导致 K-1「参照全文」与 K-2「页范围」都无处落地。** 现补:

**fixture 的参照物 = 一个真实的纯文本 source 文件**,经现役 intake 路径落 `source_files`(`storage_key` + `content_hash`),⛔ 不用 PDF(那会把 region 保真拖进来,已裁不做)。
- **碎片锚统一用 `flow` 族**:`{"family":"flow","path":"line[N]","char":[start,end]}` —— `char` 是**该文件全文的字符区间**;
- **`anchor_fidelity` 申报 `char`**(流式族的满格),`text_normalization` 按用例申报;
- ⭐ **「参照全文」= 该 source 文件的完整内容**(从 `source_files.storage_key` 读)—— **⛔ 不入 schema,是运行时从原件读的真值**。

📌 **为什么改用真实文件**:原单想让 K-2 比对「出生证的页范围」,**但规格 §4 的出生证根本没有页范围字段**(现物已核)。⇒ **K-2 回到规格原意「按锚回原件取文本须命中」** —— 有真实原件,刀才有对手。

## 4. ⭐ 必红判据(先补断言,再实现 —— 顺序不可换;⛔ 红不出来就停下上报)

| # | 断言 | 说明 |
|---|---|---|
| **K-1 逐字保真** | 按 `seq` 升序拼接全部碎片 `text`,与**参照全文**(§3.1,从原件读)施加**申报的归一化类**后**逐字节比对**;申报 `none` 而实测有偏离 ⇒ **拒收** | ⭐ **拼接规则明确写死**:`fragments.sort(by seq).map(f => f.text).join('')`;⛔ 不许自行加分隔符 |
| **K-2 锚真实性**⚠️ | ⭐ **回程票**:按碎片锚的 `char` 区间从**原件**切片,该切片**必须包含**碎片 `text`;不含 ⇒ **拒收** | ⚠️ **2026-08-28 订正**:原文写「与出生证的页范围比对」,**而规格 §4 的出生证没有页范围字段**(现物已核)⇒ 不可实现。现回到规格原意。<br>⛔ **region(bbox)级语义回验仍不做**(见 §5 deferred) |
| **K-3 伪高保真** | 出生证申报 `anchor_fidelity: 'page'` 而碎片 anchor **带 `bbox`** ⇒ **拒收**;**且** `bbox` 非「归一化 0–1 的四元组」⇒ **拒收** | ⭐ 后半句是 Fable 加的**结构校验**:**收得进,只是不验真** |
| **K-4 顺序保真** | `seq` 乱序 / 不连续注入 ⇒ **拒收** | |
| **K-5 残缺申报** | 人为坏段 ⇒ `warnings` **非空**、其中**至少一条的 `anchor_hint` 指向该坏段**,且**该段无对应碎片**;⛔ 出现 `text` 为空串的碎片顶位 ⇒ **拒收** | ⭐ **`warnings_json` 元素形状写死**(原单未定义,导致无法机械表达「哪一段坏了」):`{"code": string, "anchor_hint": string, "detail"?: string}`;`code` 闭集:`unreadable_segment` / `empty_segment` / `decode_failed` |
| **K-6 全环** | 手造碎片流走完 **存 → 出生证 → 校验 → 按锚取回**,取回内容与存入**逐字相同** | ⭐ **「按锚取回」语义写死**(原单未定义):**①完整锚精确匹配 ⇒ 返回且仅返回那一条碎片**;**②只给 `family` + 定位主键(如 `path`)的选择器 ⇒ 返回该定位下全部碎片,按 `seq` 升序**。两种都要有断言。 |

### ⚠️ 4.1 拒收留痕的载体(Fable 2026-08-28 裁)

校验器拒收时的留痕**走碎片流自己的 `warnings` 族(随件走)**。
⛔ **不得复用 `services/toolFaceReceipts.ts` / 不得写 `operation_batches`** —— 两重理由:①那条链的消费者是 `server/src/mcp/transport.ts`,**在本单禁区内**;②⭐ **入库校验拒收不是 Agent 写操作**,塞进工具面收据会**污染那条轴的语义** —— **收据轴的纯洁性靠的就是「每条收据只记它那类事」。**

⚠️ **变异必须语法有效、语义定向**:⛔ 不许用正则整块替换制造语法错误 —— 那测的是编译器不是断言。

## 5. ⚠️ deferred 一行(必须写进档,⛔ 不得省略)

**region 锚的语义验证(回程票式:按 bbox 裁原件取文本并比对)本单不做**,**落点钉「12.9c 接真转写器之日」**。
📌 **理由(Fable 裁)**:b-1 的 fixture 是**手造**碎片流 —— 给手造 bbox 做语义回验,要么**引新依赖**(采购决策,地基段不配触发),要么**自证自**(无鉴别力)。**届时验证者与生产者同批到位,刀才有对手。**
⇒ 请在 `docs/agent-ops/current-state/deferred-tests.md` 追加一行(**按该文件现有格式,⛔ 不自创格式**)。

## 6. 收工前必跑

```
npm --prefix server run test:v2
npm --prefix client run test:unit
npm run check:tool-face-parity
npm run build
```
全绿才算完;⛔ 不许跳过、⛔ 不许 `--no-verify`。
⚠️ **`tool-face-manifest.json` 必须零 diff**(本单不该触及工具面)。

## Result

**STOPPED at the pre-red contract gate · needs: claude/Fable 裁定。**

未进入实现，也未建立半成品红测。§4 K-2 按工单字面无法在 §2/§3 的允许面内构造：它要求把碎片锚的 `page` 与「出生证记录的页范围」比较，但固定的 `source_imprints` 列表没有 `page_count` / `page_start` / `page_end` / `page_range`；现物 `source_files`（migration 045）及其后续新代 Source 表也没有 source 级页范围真值。现物中 `note_block_sources.source_page_start/source_page_end` 只是单个 block 的引用坐标，不是出生证页范围，且不能替代 K-2 的判定依据。

因此三条可走路径都违反本单至少一条硬约束：

1. 给 `source_imprints` 私加页范围列 —— 超出 §3 固定 schema，属于自行改合同；
2. 把页范围作为 `validate(...)` 的瞬时 fixture/context 参数 —— 可以造红，但不再是 K-2 所写的「出生证记录」；
3. 借 `documents.page_count` / `document_chunks` / 旧 Source 服务取值 —— 直接进入 §1/§2 禁区。

另有三处需与 K-2 一并钉清，避免复工后再猜：K-1 没有定义多碎片如何拼成「参照全文」（且参照全文不入 schema）；K-5 的 `warnings_json` 没有 warning 元素形状，因而无法机械表达「warning 对应哪一坏页」；K-6 的「按锚取回」未定义完整锚精确匹配还是 family/page selector，以及返回单条还是按 `seq` 排序的数组。

只读现物结论：当前最高迁移是 048，若裁定后复工，下一个真实文件名应为 `049_v2_source_imprints.ts`；仓内没有迁移注册清单，`server/src/db/migrate.ts` 动态扫描 `migrations/` 并按文件名排序，故不应新增或猜测注册路径。

**改动/验证实录：**除本 `## Result` 外，本单允许面的生产码、测试、`server/package.json`、`deferred-tests.md` 均零改动；既有用户改动 `server/src/routes/projections.ts` 未触碰。因「红不出来就停」硬门已触发，§6 四条收工命令未跑，不能申报任何绿灯；`docs/generated/tool-face-manifest.json` 当前对 HEAD 零 diff。

---

## 调度方处置(claude,2026-08-28 · 第一次派工停线)

⭐ **停线判为正确,四条申报全部复核为真,记功**:

1. ⭐⭐ **K-2 按工单字面不可实现** —— 它要求比对「出生证记录的页范围」,而**规格 §4 的出生证根本没有页范围字段**(复核方已核规格原文)。**它没有私加列、没有改成瞬时参数、没有借旧链取值** —— **三条能交差的路它一条都没走**,而是停下上报。
2. **另三处欠定义也全部属实**:K-1 未定义「参照全文」如何由多碎片拼成;K-5 的 `warnings_json` 未定义元素形状 ⇒ 无法机械表达「哪一段坏了」;K-6 未定义「按锚取回」的匹配语义与返回形状。
3. **只读侦察结论复验为真**:最高迁移 `048`;`db/migrate.ts` 用 `readdirSync` 动态扫描 + 文件名排序,**仓内无迁移注册清单**。

⚠️ **归属:工单缺陷,不是施工缺陷。** 这是「判据与边界打架」在本会话的**第五次**,且**形状是新的** —— 前四次是「判据点名的文件/命令不在允许面」(第七查能拦),**本次是「判据引用了 schema 里不存在的字段」,闸查路径与命令,查不到这种。**

**订正**(§3.1 / §4 / §4.1 / §2):
- ⭐ **新增 §3.1 fixture 约定** —— 参照物改为**真实纯文本 source 文件**,锚用 `flow` 族 `char` 区间 ⇒ **K-2 回到规格原意「按锚回原件取文本须命中」,刀才有对手**;
- **K-1** 拼接规则写死(`sort by seq` + `join('')`,⛔ 不许加分隔符);
- **K-5** `warnings_json` 元素形状写死 `{code, anchor_hint, detail?}` + `code` 闭集;
- **K-6** 「按锚取回」双语义写死(精确锚 ⇒ 单条;family+定位主键 ⇒ 按 `seq` 升序全量);
- **§4.1 拒收留痕载体**(Fable 裁):走碎片流自己的 `warnings` 族,⛔ 不碰工具面收据;
- **迁移序号固化 049**,并把迁移器**移出允许面、写进禁区**(⚠️ 它原先因写在允许面段里被闸算作允许触碰 —— **是闸的输出暴露的,不是判决暴露的**)。

**其余边界一字未改。**

## Result(第二次派工)

**STOPPED at the pre-§6 contract gate · needs: claude/Fable 补裁。**

第二次派工已按 K-1 → K-6 顺序建立真实纯文本 fixture 并逐刀取得红灯，随后实现到目标文件 6/6 绿；但在进入 §6 前的稳定态交叉复核发现，下列两处仍不能在现合同内同时诚实实现。为避免把“字面过测”冒充交付，本次半成品已全部回滚，未留下 migration / service / test / package / deferred 改动。

1. **K-1 与 K-5 对非空坏段仍冲突。** K-1 明文要求 `fragments.sort(by seq).map(text).join('')` 与**完整原件**逐字节相等；K-5 又要求坏段无对应碎片。对 `unreadable_segment` / `decode_failed` 这类原件中含非空文本的坏段，缺段必触发 K-1 拒收。施工期曾用真实空行验证 `empty_segment` 特例：不建 `line[2]` 碎片、由相邻段承接换行后可同时满足字面断言；但这只让零文本特例交差，不能推导出乱码/解析失败段的通则，故未作为完成依据。需补裁其一：①本单 K-5 明确只验 `empty_segment`；②明确 warning gap 如何从 K-1 的完整原件比对中扣除（现 warning 只有字符串 `anchor_hint`，没有可机械扣除的范围）；③明确残缺件仍拒收、K-5 只验拒收时 warnings 随件返回而非合法入库。
2. **§4.1 与 K-5 的 warning code 闭集缺少校验拒收码。** K-1～K-4 的拒收原因是 text fidelity / anchor truth / fidelity / sequence，现闭集只有 `unreadable_segment|empty_segment|decode_failed`。把所有拒收硬映射为 `decode_failed` 会把并未发生的解码失败写进申报，新增 `issues` 族又违背“拒收留痕走 warnings 族”，自行扩 code 则直接违反闭集。需补裁拒收 warning 的合法 code 映射或扩展闭集。

**施工与回滚实录：**六刀的临时实现曾以语法有效、语义定向变异逐项复验（单独关闭 K-1/K-2/K-3/K-4/K-5/K-6 对应守卫时，各自测试均红；恢复后均绿），并曾通过 `tsc --noEmit` 与目标文件 6/6；这些代码因上述合同门未通过而已撤除，不能申报为交付。`server/package.json` 已恢复，`deferred-tests.md` 未留行，三个新文件均不存在；`server/src/db/migrate.ts`、MCP、旧链、`operation_batches`、工具面生成器与 manifest 均未改。既有用户改动 `server/src/routes/projections.ts` 原始字节未触碰。

**验证声明：**因合同门触发停线，§6 四条收工命令未跑，不能申报全绿；`docs/generated/tool-face-manifest.json` 对 HEAD 零 diff。收到上述两项裁定后，迁移序号仍应为 049，且可沿已验证的六刀次序重新施工。

---

## 调度方处置(claude,2026-08-28 · 第二次派工停线)

### ⭐⭐ 它把一份【已经 6/6 绿】的实现整个回滚了

**它自报**:六刀已逐一取得红灯、逐条施加语法有效的定向变异复验(单独关闭各守卫时各自变红、恢复后各自变绿)、`tsc --noEmit` 通过、目标文件 6/6 绿 —— **然后判定这是「字面过测」而非诚实交付,把半成品全部撤除。**

⚠️ **⛔ 这段施工实录我无法复核**(代码已不在树上)⇒ **记为它的自述,不作复核方结论。**
✅ **但回滚本身我核了,是真的**:树上只剩那个既存的 `server/src/routes/projections.ts`;`server/package.json` 对 HEAD **零 diff**;三个新文件不存在;`deferred-tests.md` 未留行;禁区零触碰。

📌 **一个能让测试全绿的实现摆在面前,它选择说「这个绿不算」** —— 这比任何一次「刀红了」都更难。

### ⚠️ 它抓到的两条,我核实后判定:**第 1 条是规格自身的矛盾,不只是本单的**

**冲突 1 —— K-1 与 K-5 在【含非空文本的坏段】上互斥**:

| 出处 | 原文 |
|---|---|
| **规格 §6 K-1** | 「对**参照全文**施加同一申报类归一化后**逐字节比对**」 |
| **规格 §6 K-5** | 「人为坏页 ⇒ warnings 非空**且对应碎片缺席**」 |

⇒ 坏段若**含非空文本**,K-5 要它**没有碎片** ⇒ 拼接结果比原件**少了那一段** ⇒ **K-1 必红**。
⭐ **两条 killer 在同一份产物上不可能同时为绿。** ⛔ **这不是我的单写歪了,是规格 §6 自身没有交代残缺区间如何从全文比对里扣除。**
📌 它试过用**真实空行**让 `empty_segment` 特例过关,**并且明确拒绝以此推广**:「这只让零文本特例交差,不能推导出乱码/解析失败段的通则」——**没拿特例当通则,对。**

**冲突 2 —— 拒收留痕没有合法 code**:
K-1~K-4 的拒收原因是**保真 / 锚 / 伪高保真 / 顺序**违规,而本单 `code` 闭集只有**残缺类**三个(`unreadable_segment` / `empty_segment` / `decode_failed`)。
⇒ 硬映射成 `decode_failed` = ⛔ **把并未发生的解码失败写进申报**(正是本项目反对的);自行扩 code = 违反闭集;新造 `issues` 族 = 违背「拒收留痕走 warnings 族」的裁定。

### ⇒ 两条均已升 Fable(⛔ 我不自裁)

**冲突 1 需裁**:K-1 的比对范围 = **完整原件** 还是 **原件减去已申报的残缺区间**?若后者,**`warnings` 必须携带可机械扣除的范围**(现只有字符串 `anchor_hint`,不可机械扣除)。
**冲突 2 需裁**:扩 `code` 闭集,还是**区分「入库申报 warnings」与「校验拒收 reasons」**?⚠️ 后者与「拒收留痕走 warnings 族」的裁定有张力 ⇒ **必须裁定方定,⛔ 不由我改。**

**只读结论沿用**:迁移序号仍为 **049**;裁定到位后可沿已验证的六刀次序重新施工。

## Result(第三次派工)

**(待裁定后填)**
