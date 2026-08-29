> **状态 (Status)**: ready(按 Fable v0.7.4 裁定:锚族随格式的真实定位能力走;PDF 单元格在 page 族内以 region + 归一化 bbox 表达)
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-29
> **裁定来源**: Fable v0.7.4「锚答在哪,角色答是什么」· TD-30 · 12.9a 欠下的 region 语义验证 · 「数字连同计数口径申报」

# c-1b-2:region 保真与单元格可寻址(⭐ 本单有**结构面**,⛔ 不是纯语义单)

## 0. ⛔⛔ 先读这六句

> **①(v0.7.4 判词)锚答「在哪」,角色答「是什么」。** PDF 的真实定位能力是**几何的**(页 + 矩形),电子表格的是**逻辑的**(sheet/row/col)。⇒ **PDF 表格单元格的「表格性」是 `role` 的事,⛔ 不是锚族的事。**
>
> **②(结构事实,已核)`table` 族用不了**:`TableAnchor` 的 **`sheet` 是必需字段**;且 `sourceImprints.ts:467` **单锚族法**(一份拓印件只能一个锚族)+ v0.7「每格式一拓印件」(PDF → page 族)⇒ **给表格用 table 族会让整份拓印件被拒**。
> ⇒ **单元格 = page 族 + `region` 保真 + 归一化 bbox + `role:'cell'`**(角色闭集里 **`cell` 与 `table_row` 本来就有**,⛔ 不必新增角色)。
>
> **③ ⭐ 本单有结构面,⛔ 不当顺手**:`SourceArtifactBlock` 现在是 `kind: 'text'`(**字面量,只有一个值**)且**没有 bbox 字段** ⇒ **必须先扩它**,region 与单元格才谈得上。
>
> **④ 归一化只许用【转写器自报的 `page_size`】。** MinerU 给的是**绝对页坐标**(实测形如 `[54,127,498,206]`,`page_size=[595,842]`),而 `isNormalizedBbox` 要求 **0–1**。
> ⚠️ 12.9a 实录:MinerU `page_size` 与 PDF 媒体框比例为 **1.0005 / 1.0011**。⇒ **⛔ 不许拿 PDF 媒体框或任何别的尺寸凑** —— **拿别的尺寸凑 = 在坐标系上撒谎**。比例偏差**如实申报在回执**。
>
> **⑤ ⭐⭐ 验 region 必须用【独立提取器】,⛔ 不许用 MinerU 验 MinerU。** 用 MinerU 自己的输出去证明 MinerU 的 bbox 对,是**自我印证**。
> 📌 现址 venv 里有 **`pypdfium2 5.10.1`**,可按矩形取文本(`get_text_bounded` 或等效)—— 它读的是**PDF 文本层**,与 MinerU 的版面/OCR 模型**来源不同**,⇒ **构成独立源**。
>
> **⑥ 巨表粒度演进⛔ 本单不预设**(Fable 裁:随第一个受害消费者单走)。本单只要**单元格可被寻址**,⛔ 不追求任意规模表格的最优切分。

## 1. 允许面(⛔ 只这些)

- `server/src/services/sourceArtifact.ts`(⚠️ **仅**:扩 `SourceArtifactBlock`(bbox/kind)与相关类型;⛔ 不动既有 parser 的解析逻辑与限额)
- `server/src/services/sourceMineruParser.ts`(⚠️ **仅**:产出 bbox、页尺寸、表格单元格块;⛔ 不动超时/杀进程/并发相关代码)
- `server/src/services/sourceMaterialization.ts`(⚠️ **仅**:region 保真选择与 bbox 归一化映射;⛔ 不动认领/状态机/投影发布/身份表)
- `server/src/__tests__/v2SourceRegionCells.test.ts`(**新建**)
- `server/package.json`(**仅**:把新测试追加到 `test:v2` **尾部**)

⛔ **禁区(逐条零 diff)**:`client/**`、`sourceImprints.ts`(⭐ **锚族与保真的法在那里,本单⛔ 不许改法去迁就产出**)、`sourceTextCanonical.ts`、`sourceFileIntake.ts`、`sourceMaterializationConcurrency.ts`、既有迁移(**本单不加迁移**)、`documentParser.ts` 家族、MCP、工具注册、`operation_batches`、`docs/agent-ops/INDEX.md`、本工单顶部状态行、**`D:/Coinsides/v12.9-selection/**`(证据本体,只读)**。

## 2. 判据

### ⭐⭐ K-1 单元格**可寻址**,且必须用**寻址动作**验(Fable 预定抽检 · TD-30 落点)

- 取一份**真含表**的 PDF(样本在 `D:/Coinsides/v12.9-selection/samples/`,只读)。
- 该页必须产出**多于一个**碎片,且**表格单元格各自成碎片**、`role` 为 `cell`(或 `table_row`,按实际粒度如实申报)。
- ⭐ **寻址动作(本刀的灵魂)**:任取一个单元格碎片,**用 `pypdfium2` 按它的 bbox 回原件取该矩形内的文本**,**必须命中该碎片的文本**。
- ⛔ **「碎片数 > 1」不构成可寻址证明** —— 那是**计数锁**。⛔ 不许用它交差。
- ⚠️ **容差**:比对前可做本仓既有的 `whitespace` 归一化;若还需其它容差(如 OCR 与文本层的字形差),**必须在回执里写明容差是什么、为什么必要**,⛔ 不许悄悄放宽。

### ⭐ K-2 单锚族法的**常驻反例**(Fable 预定抽检 · 本条是 §0② 的常驻证明)

- 构造一份 **page 族**拓印件,其中**混入一个 `table` 族锚** ⇒ **必须被 `anchor_invalid` 拒**(`One imprint must use a single anchor family`)。
- ⭐ 这一刀**不是**为了测新功能,而是**把「PDF 用不了 table 族」这条结构事实钉成常驻测试** —— 将来谁想给 PDF 加 table 锚,会先撞到它。

### ⭐⭐ K-3 region 的**诚实性双向**(12.9a 欠账在此还清)

- **正向**:MinerU 申报 `region` 时,bbox **必须来自 MinerU 实际输出**。
  ⭐ **红点要求**:把 bbox 改成**从 block 序推算补造**(如按序号均分页面)⇒ **K-1 的寻址动作必须红**。
  ⚠️ ⛔ **推算补造是伪高保真的新形态** —— 它比缺 bbox 更危险,因为它**看起来精确**。
- **反向(⛔ c-0 的 K-8 刀在 MinerU 世界里重验一次)**:**申报 `page` 级却带 bbox ⇒ 仍必须被 `fidelity_overclaim` 拒**;**申报 `region` 却缺 bbox ⇒ 仍必须被拒**。**两条都要在 MinerU 产出的真实拓印上验,⛔ 不许只在手造 fixture 上验。**

### ⭐ K-4 归一化**只用转写器自报的 `page_size`**

- 归一化必须是**确定性、可重放**的:`normalized = raw / page_size`(逐坐标),⛔ 无其它来源。
- **红点**:把分母换成**任何别的尺寸**(如 PDF 媒体框)⇒ **必须有断言红**(⇒ 说明分母是被锁住的,不是随便填的)。
- **回执须报**:该样本上 MinerU `page_size` 与 PDF 媒体框的**实际比例**(12.9a 记为 1.0005 / 1.0011),**如实在案**。
- **边界**:归一化后必须落在 **0–1** 且满足 `x0<=x2, y0<=y3`;越界 ⇒ 必须被 `anchor_invalid` 拒,⛔ 不许 clamp 掩盖。

### ⭐ K-5 计数**必须连同口径申报**(⭐ 这条法第一次可被机械验证)

- 产出的计数以**结构化字段**表达:**每个数字带一个非空的口径名**(如 `{basis:'delivered_fragment_chars', value:N}`),⛔ **不是散文、⛔ 不是裸数字**。
- ⭐ **红点(⛔ 缺它这条就是装饰)**:**至少两个不同口径,对同一份输入给出【不同的数】**,并断言两者都能被按名取到。
  ⚠️ **理由**:若所有口径给出同一个数,口径名就是**装饰**,证明不了任何事。**病例在案**:同一次 MinerU 输出,复核方数得 **494**、回执报 **500**、markdown 计 **506** —— 三个口径三个数,当时无法互证。
- ⛔ 不许把口径名做成自由文本随手写:必须是**闭集**(枚举),⛔ 未在闭集中的口径名不得写入。

### K-6 回归

- `npm --prefix server run test:v2` 全绿(基线 **343**,回执须报追加后计数)。
- `npm exec -- tsc --noEmit`(cwd=`server`)零诊断。
- ⭐ **既有链零行为变化**:`native-pdf`/`docx`/`text`/`image` 与 c-1b-1 的 MinerU 接线测试**全绿且计数不变**;`COINCIDES_PDF_PARSER` 未设时行为不变。
- ⭐ **证据本体零触碰**:`D:/Coinsides/v12.9-selection/**` 收尾复测哈希与开工前相同。

## 3. 回执

> **⚠️ 第一件事:无论结果如何,退出前必须把回执写进本工单的 `## Result` 段;若预算紧张,先写 Result 再做别的。**

须含:**K-1 的寻址动作实录**(取的哪个单元格、bbox 是什么、`pypdfium2` 取回什么、如何命中、用了什么容差及理由)、K-2 的拒绝实况、**K-3 正反三刀各自的红**(推算补造 / page+bbox / region 缺 bbox)、K-4 换分母的红 + 实际比例、**K-5 两个口径给出不同数的实证**、K-6 前后计数与既有链不变、证据本体哈希前后、以及任何停线点。
⛔ 不许 commit,⛔ 不许翻本工单顶部状态行。⚠️ 署名按**实际来源**(裁定来自 **Fable**,由调度方转写;⛔ 不得写成 Henry)。
