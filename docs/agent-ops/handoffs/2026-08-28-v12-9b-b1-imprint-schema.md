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

- **新建迁移**:`server/src/db/migrations/<下一个序号>_v2_source_imprints.ts`(**序号按现物取,⛔ 不要照搬本单猜测**)
- **新建**:`server/src/services/sourceImprints.ts`(存 / 取 / 校验)
- **新建**:`server/src/__tests__/v2SourceImprints.test.ts`
- **`server/package.json`** —— ⭐ **仅**把上述测试文件**追加**进 `test:v2` 的文件清单(⛔ 不改其它 script、⛔ 不改既有参数的逐字内容与顺序)
- 迁移注册处(若仓内有迁移清单文件,**按现物找,⛔ 不猜路径**)
- `docs/agent-ops/current-state/deferred-tests.md` —— **仅**追加 §5 那一行(⛔ 不改既有行)

⛔ **禁区**:`server/src/mcp/**` · 工具注册表 · `scripts/generate-tool-face-manifest.ts` · `docs/generated/tool-face-manifest.json` · `services/documentParser.ts` · 任何旧链表与其服务。

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

## 4. ⭐ 必红判据(先补断言,再实现 —— 顺序不可换;⛔ 红不出来就停下上报)

| # | 断言 | 说明 |
|---|---|---|
| **K-1 逐字保真** | 出生证申报 `text_normalization: 'none'`,而碎片 `text` 与参照全文**逐字节不同** ⇒ **校验器拒收** | ⭐ **参照全文由 fixture 自带**(手造,⛔ 不接真转写器) |
| **K-2 锚真实性**⚠️ | **仅 page/block 级**:碎片锚声明的 `page` 超出出生证记录的页范围 ⇒ **拒收** | ⚠️ **region 级只做结构校验**(见 K-3),**语义回验(回程票式)本单不做** |
| **K-3 伪高保真** | 出生证申报 `anchor_fidelity: 'page'` 而碎片 anchor **带 `bbox`** ⇒ **拒收**;**且** `bbox` 非「归一化 0–1 的四元组」⇒ **拒收** | ⭐ 后半句是 Fable 加的**结构校验**:**收得进,只是不验真** |
| **K-4 顺序保真** | `seq` 乱序 / 不连续注入 ⇒ **拒收** | |
| **K-5 残缺申报** | 人为坏页 ⇒ `warnings` **非空** 且**对应碎片缺席**;⛔ **不得以空 `text` 碎片顶位**(出现空 text 碎片顶位 ⇒ 拒收) | |
| **K-6 全环** | 手造 fixture 走完 **存 → 出生证 → 校验 → 按锚取回**,取回内容与存入逐字相同 | 段计划点名的全绿判据 |

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
