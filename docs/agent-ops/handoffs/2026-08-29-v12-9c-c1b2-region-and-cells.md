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

## ⭐ 第二次派工的修订(2026-08-29,按 Fable v0.7.5 三裁;⛔ 第一次派工的停线是对的)

**builder 第一次停线,主张我逐条独立核实,全部为真,且比它自述的更精确** ——
- `model/table/rec/slanet_plus/main.py:70` **确实**返回 `PaddleTableOutput(pred_html, cell_bboxes, logic_points, elapse)`;
- 而 `backend/pipeline/batch_analyze.py:684` 是 `table_res_dict["table_res"]["html"] = ...` —— **只留 `.html`,cell 几何就在这一行被丢弃**。
⇒ **「MinerU 3.4.5 的标准落盘输出没有 cell bbox」属实。** 它拒绝用整表 bbox 凑绿、也拒绝从 HTML 行列或 block 序均分几何,**两条拒绝都对**。

### ⭐ 裁定 ①:采**诚实版**(⛔ 不做单元格几何)

- **表级碎片**:带**真实整表** region 锚(bbox 来自 MinerU 实际输出),`role` 取 `table_row` 或 `cell` 按**实际粒度**如实申报。
- **cell 文本**:以**结构化**形式随碎片携带(从 MinerU 自己的 HTML 读,⛔ 不推算几何)。
- **单元格级【几何】寻址**:**如实申报「本转写器不可达」** —— ⛔ 不许用任何方式伪装成可达。
- ⭐ **判词(入宪)**:**「做得少」可以如实申报,「说得假」不能 —— 保真阶梯的全部意义就在这一句。**

### ⭐⭐ 裁定 ②:K-1 补上**排他半边**(⛔ 我原来的 killer 有洞)

**原 K-1 有洞**:「按 bbox 取矩形文本**必须命中**碎片文本」—— 若把整表 bbox 复制给每个 cell,该断言**平凡通过**(cell 文本本就是整表文本的子串)。builder 实测坐实:整表 crop 含 `Cinema 2`,**同时含 `Wednesday`/`Gallery 1`/`free`**。

⇒ **改判为(法域升格,⛔ 不只管表格,管【全部】锚真实性验证)**:
> 按锚取回的文本,须 **① 命中该碎片文本** **∧ ② ⛔ 不得包含同拓印件【其它碎片】的独有文本**。

⭐ **通例**:**「包含」型断言天然被更大范围平凡满足** —— **凡验【定位】必配【排他】,否则验的是「在不在里面」,不是「在哪」。**
⚠️ ⇒ **本单的 K-1 具体形态**:表级碎片的锚必须**只**命中该表,⛔ 不得同时命中同页其它碎片(正文段落等)的独有文本。

### ⭐ 裁定 ③:TD-30 诚实拆分 + **第三出口**(⚠️ 这条务必写进代码注释或回执,别让它失传)

TD-30 的「单元格**几何**可寻址」记为 **本转写器不可达**,触发器**三条**:
1. 换用能给 cell 几何的转写器;
2. MinerU 上游把 `cell_bboxes` 纳入**标准输出**;
3. ⭐ **补丁版以【独立转写器身份】申报** —— `transcriber_name` **自成一家**(⛔ 不叫 `mineru`),补丁本身**进 lockfile 指纹**。
   ⚠️ **这是打补丁的唯一合法形态**:**v0.7.2 禁的不是打补丁,是【打了补丁还自称原版】。**
   ⛔ **静默补丁永禁。**

### 允许面(不变,仍 5 项)

⚠️ 本次修订**不扩允许面** —— 诚实版落在原面内。

### 判据调整

- **K-1** 按裁定 ② 改为**命中 ∧ 排他**;⭐ **红点**:把表级锚换成**整页 bbox** ⇒ **排他半边必须红**(它会同时命中正文碎片)。⛔ 只验命中的旧形态不再接受。
- **K-3 正向**改为:**整表 bbox 必须来自 MinerU 实际输出**;红点仍是**推算补造**(如按序号均分)⇒ 必红。**反向两刀不变**(page 级带 bbox 必拒 / region 缺 bbox 必拒,且须在真实拓印上验)。
- **K-5 不变**(计数口径闭集 + 两个口径给出不同的数)。⭐ 本单正好有现成的多口径:**表级碎片数 / cell 文本数 / 非空 `<td>` 数** —— 实测该表为 **4 行 × 5 列、20 个非空 `<td>`**,与表级碎片数必然不同。
- **新增 K-7**:**不可达必须被【申报】,而不是被【省略】** —— 产出里须有一处明确记载「单元格几何寻址:本转写器不可达」及其三条触发器。⛔ 悄悄不做 ≠ 如实申报。

## Result

> **回执（Codex builder，2026-08-29）** · **STOP / `needs: claude`**。已按工单「假设不符时停线、不要猜」停在实现前；未改任何生产码、测试码、`server/package.json` 或禁区文件，未 commit，未翻顶部状态行。裁定来源为 **Fable v0.7.4**，由 Claude 工程调度会话转写。

### 停线点：MinerU 标准落盘输出没有 cell/row bbox

只读复验与工单「产出单元格块，并让每个单元格可按自己的 bbox 回原件寻址」之间出现了结构性缺口：MinerU 3.4.5 的标准 `content_list` / `middle` / 开启后的 `model` 落盘结果都只给出**整表 bbox + HTML**，没有逐 `td` 或逐行 bbox。把同一个整表 bbox 复制给每个 cell，K-1 的 substring 检查可能表面命中，但锚回答的是「整张表在哪」，不是「这个 cell 在哪」；按 HTML 行列或 block 序均分几何则正是 K-3 禁止的推算补造。因此没有用这两种方式凑绿。

需 Claude/Fable 明判后才能续工：

1. 是否明确允许多个 `role:'cell'` 碎片共享 MinerU 的整表 bbox（这会把实际几何粒度如实限定为 table region，而非 cell region）；或
2. 是否把生产 runner 捕获 MinerU 运行期内部、标准输出前会丢失的 table-model `cell_bboxes` 纳入本单。后者虽可物理留在 `sourceMineruParser.ts`，但会依赖 MinerU 私有内部 API，明显深于工单已钉的标准输出假设。

在此裁定前，K-5 的计数口径闭集也未擅自命名或落码；避免把未拍口径写成契约。

### K-1 / K-3 / K-4 只读实录（证明为何不能交差）

- 原件：`D:/Coinsides/v12.9-selection/samples/ielts-listening-sample-tasks-2023.pdf`，原 PDF 第 30 页（zero-based `page_idx=29`），真表为 4 行 × 5 列，20 个非空 `<td>`；抽取对象候选为 row 2 / col 3 的 `Cinema 2`（row/col 均 zero-based）。
- 探针只把该页复制到系统 TEMP，再用 pinned MinerU 3.4.5、`pipeline + parse_method='ocr' + table_enable=True` 跑一页；唯一写入在 `C:/Users/70208/AppData/Local/Temp/coincides-mineru-cell-probe-1cd3891275204687a4b638fe9a26b5aa/**`，没有写 selection。
- 同一次真实 MinerU 输出的坐标面：
  - `content_list`：整表 bbox=`[94,156,892,386]`，不带 `page_size`；
  - `middle`：`page_size=[595,841]`，整表 bbox=`[56,132,531,325]`；
  - `model`：`page_info=1654x2339`，整表 bbox=`[157,367,1477,903]`。
- `model` 中 table 对象只有 `cls_id,label,score,bbox,index,html`；递归查 `cell_bboxes|logic_points|wireless|wired` 为 0 命中。即便开启 model dump，标准落盘输出仍没有 cell bbox。
- K-4 同源分母事实：只用 `middle` 自报尺寸时，确定性归一化为 `[0.09411764705882353,0.15695600475624258,0.892436974789916,0.3864447086801427]`。若把 `content_list` bbox 错配 `middle.page_size`，`x2=892/595=1.499...`，必越界并应被 `anchor_invalid` 拒；这证明不能跨坐标面凑分母或 bbox。
- 独立提取器：`pypdfium2 5.10.1` 读取原 PDF 文本层。原页媒体框=`[595.3200073242188,841.9199829101562]`；与 MinerU `page_size` 的比例=`[1.0005378274356618,1.0010939154698648]`（四舍五入 `1.0005 / 1.0011`）。媒体框只用于**独立验证器**把 MinerU top-left raw bbox 换到 PDFium bottom-left 坐标，不作为生产归一化分母。
- 独立验证 crop=`[56.03011833639706,516.5644603824502,531.2855863683365,709.7755860681341]`；`get_text_bounded` 取回整表文本，直接逐字包含 `Cinema 2`，也同时包含 `Wednesday`、`Gallery 1`、`free` 等其它 cell。无需 NFKC/OCR/标点容差，直接 substring 即命中；本仓 `whitespace` 归一化可用但本次并不需要。
- 结论：这张回程票只证明**整表 region**可寻址，不能证明 `Cinema 2` 这个 cell 有自己的 region。若把整表 bbox 填给 20 个 cell，正会把「整表命中」冒充「单元格可寻址」，故 K-1 未过；推算 cell bbox 的 K-3 红点也没有被绕开。

### K-2 ～ K-5

- K-2 单锚族常驻反例：结构事实已读到现物（`TableAnchor.sheet` 必需，单锚族法仍在），但因上游 K-1 生产粒度停线，未新建测试、未用局部半成品交差。
- K-3 三刀：真实 MinerU 的正向 cell bbox 前提缺失；未补造 bbox，也未写 page+bbox / region 缺 bbox 的新测试。
- K-4：上面的真实坐标面对照已把错误分母红点坐实；未落生产映射或常驻断言。
- K-5：未落结构化计数及闭集，未制造自由文本口径。

### K-6 与树状态

- 停线前基线：`npm --prefix server run test:v2` = **343/343 pass**（工单追加测试数 0，故仍为 343）；`npm exec -- tsc --noEmit`（cwd=`server`）= exit 0、零诊断。既有 `v2SourceMaterialization.test.ts` + `v2SourceMineruWiring.test.ts` 链为 **16/16 pass**（11 + 5，计数不变），覆盖 native PDF / DOCX / text / image 与 c-1b-1 MinerU 接线；`COINCIDES_PDF_PARSER` 未设的 native-pdf 正控也全绿。
- 开工前已有、且全程避开的用户改动：`server/src/routes/projections.ts`。
- 本单允许面的三个生产文件、新测试文件与 `server/package.json` 均零 diff；禁区逐条零 diff。唯一仓库 diff 是本工单本 `## Result` 回执，以及用户原有的 `projections.ts`。
- `D:/Coinsides/v12.9-selection/samples/**` 四份 SHA-256 开工/探针结束相同：
  - reading `61035D701CBC12B8AFF41C6DF25BC25D2D394F6E915EA258C82D2B384BE7ED8F`
  - writing responses `CB320FDA1D1EB3311900747A856C6C01520203357B1951BE466DCAC7F2EE9E72`
  - writing tasks `F9B5B43FBB3F070741F970ECF2ADBFAAEF8B2F520EB5E2D350BAE39557B1C7AF`
  - listening `1C260DE1460889397D04A73F297BB1D62D6401210DCFE72584373968C45A9D3E`
- 只读探针开始时刻之后，`D:/Coinsides/v12.9-selection/**` 无 `LastWriteTime` 变化；证据本体零触碰。
