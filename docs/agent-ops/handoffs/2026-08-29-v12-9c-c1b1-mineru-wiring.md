> **状态 (Status)**: ready(c-1b-0 承重件已落,MinerU 写出的第一份出生证即带真指纹)
> **from**: claude(opus,工程调度会话) · **to**: codex(builder) · **date**: 2026-08-29
> **裁定来源**: Fable 2026-08-29「c-1 拆三张」+ 并发闸三件套照准 + 降级须与永不拒收对齐 · c-1a 体检报告 · v0.7.2

# c-1b-1:MinerU 接线(⭐ 这是**接线**单,⛔ 不是语义单)

## 0. ⛔⛔ 先读这五句

> **① 本单只做「接上」,⛔ 不做「做好」。** region 语义验证、TD-30 表格碎片、计数口径结构化 —— 全在 **c-1b-2**。本单产出**最小可信的 page 族碎片流**即可。
>
> **② ⭐⭐ 现有超时【杀不死任何东西】。** `sourceArtifact.ts:320-324` 的 `withTimeout` 是一个 **`Promise.race`** —— 它只 reject 外层 promise,**对底下的活什么也不做**。对进程内 parser 只是浪费;**对子进程就是泄漏**:MinerU 那个 **1 GB** 的 Python 进程会在超时后**继续跑**。⇒ **MinerU parser 必须自己负责杀,⛔ 不能指望 `withTimeout`。**
>
> **③ ⚠️ 两个既有限额互相矛盾,必须校准。** `DEFAULT_LIMITS` 是 `timeoutMs: 120_000` 与 `maxPdfPages: 1000`。而 c-1a 实测 MinerU **温启 13.18 秒/页** ⇒ 120 秒只够 **约 9 页**。⇒ **`maxPdfPages: 1000` 对 MinerU 是一条【永远触发不到的死条文】**。本单必须让两者**互相校准**(见 K-3)。
>
> **④ 降级必须与「永不拒收」对齐(Fable 裁)。** 转写失败(崩溃/超时/非零退出)**⛔ 不得让 materialization 整体报错、⛔ 不得让 intake 拒收**。该件如实留在**已收未拓**态。
> ⭐ **机制已存在,⛔ 别新建**:`MaterializationStatus = 'received' | 'parsing' | 'publishing' | 'materialized' | 'failed'`,失败落 `status='failed'` + `error_code` + `error_message`,并由 `isSourceArtifactErrorRetryable(error_code)` 分类。**本单的任务是【证明 MinerU 的失败真的落进这套既有机制】,不是造一套新的。**
>
> **⑤ 申报义务两问已过(Fable 裁,记录在此以免重推)**:失败记录**决策依赖它**(是否重试 / 是否降级)⇒ **有申报义务**。住所按 v0.4 原则:它是**这次拓印尝试**的属性 ⇒ 住在 `source_materializations` 行上(`error_code`/`error_message`/retryable),**⛔ 不住在出生证上**(此时根本没有出生证)。

## 1. 允许面(⛔ 只这些)

- `server/src/services/sourceMineruParser.ts`(**新建**:MinerU parser + 子进程调用 + 杀进程树)
- `server/src/services/sourceArtifact.ts`(⚠️ **仅**:把新 parser 注册进 `PARSERS`、按需扩 `SourceArtifactLimits`;⛔ 不动既有 parser 的解析逻辑、⛔ 不动 `withTimeout` 对既有 parser 的行为)
- `server/src/services/sourceMaterializationConcurrency.ts`(**新建**:并发闸)
- `server/src/services/sourceMaterialization.ts`(⚠️ **仅**:接上并发闸;⛔ 不动认领/状态机/投影发布)
- `server/src/__tests__/v2SourceMineruWiring.test.ts`(**新建**)
- `server/package.json`(**仅**:把新测试追加到 `test:v2` **尾部**)

⛔ **禁区(逐条零 diff)**:`client/**`、`sourceImprints.ts`、`sourceTextCanonical.ts`、`sourceFileIntake.ts`、既有迁移(**本单不加迁移**)、`documentParser.ts` 家族、MCP、工具注册、`operation_batches`、`docs/agent-ops/INDEX.md`、本工单顶部状态行、以及 **`D:/Coinsides/v12.9-selection/**`(证据本体,只读)**。

## 2. 判据

### ⭐⭐ K-1 杀得死(**本单最重的一刀;Fable 预定抽检**)

- 用一个**会挂住不返回**的 fixture 触发超时。
- **超时后必须:①`parse` 以 `resource_limit`(或等价可重试码)失败;② 那个 Python 子进程【在进程表里真的消失】。**
- ⭐ **⛔ 不接受「promise 被 reject 了」当作通过** —— **必须【数进程】**:触发前一次、超时并落定后一次,**进程数回到基线**。
- ⚠️ **Windows 上必须杀【进程树】** —— MinerU 会派生子进程(c-1a 实测撞过 `multiprocessing`),**只杀直接子进程会留下孤儿**。这是经典漏,⛔ 别只杀 pid。
- 📌 允许用一个**假的挂死可执行体**(如一段 `time.sleep` 的 python)做 fixture,⛔ 不必真跑 MinerU —— 本刀验的是**杀的能力**,不是识别能力。

### ⭐ K-2 第一份真出生证的指纹**由第三方独立算得出**(Fable 预定抽检)

- MinerU 写出的出生证,其 `transcriber_lockfile_hash` 必须 = **`_external_tools/mineru/uv.lock` 原始字节的 sha256**。
- **测试必须独立重算**(自己 `readFileSync` 那份 lock 再 hash),⛔ 不许 import 生产端的 hash helper、⛔ 不许写死常量。
- ⚠️ **`transcriber_name` / `version` 也要如实**:`mineru` / `3.4.5`(取自 lock,⛔ 不写死在代码里;若只能写死,**在回执里申报这是写死的**)。

### ⭐ K-3 两个限额**互相校准**(⛔ 不许留死条文)

- 为 MinerU 定一组**自己的**限额,并在回执里**写出算术**:`有效页上限 = 超时 ÷ 每页耗时`,取 c-1a 实测的 **13.18 秒/页(温启)** 作依据。
- **判据**:MinerU 路径下,**页数上限与超时必须能【互相解释】** —— ⛔ 不得出现「页数上限永远触发不到」或「超时永远先于页数上限」的死条文。
- ⭐ **两个方向的刀都要有**:①给一个**超过页数上限**的输入 ⇒ 以**页数超限**失败(⛔ 不是超时);②给一个**页数内但挂住**的输入 ⇒ 以**超时**失败。**两条错误码必须不同**,否则说明其中一条是死的。

### K-4 并发闸:**同时只允许一个 MinerU 子进程**

- 现物:`claimSourceMaterialization` 只防**同一 source** 重跑;**不同 source 之间无上限**,而 `scheduleSourceMaterialization` 用 `setImmediate` 即发即忘。
- 要求:并发上限 **1**(本机现状的诚实;将来放宽须带自己的实测撑腰)。
- ⭐ **红点**:并发发起 **N ≥ 3** 个 MinerU 物料化,断言**任一时刻活着的 MinerU 子进程数 ≤ 1**,且**全部最终都被处理**(⛔ 不许有被静默丢弃的)。
- ⛔ 闸**只管 MinerU 路径**,⛔ 不得给既有轻量 parser(`native-pdf`/`docx`/`text`/`image`)加上串行化 —— 那会拖慢现役通路。

### ⭐ K-5 降级:失败**不上浮**(⛔ 与永不拒收对齐)

- 三种失败各取一刀:**子进程崩溃 / 超时 / 非零退出**。
- **每一种都必须**:①`source_materializations.status = 'failed'` 且 `error_code` 已分类;②**intake 不受影响**(该件仍是已收状态,⛔ 未被拒);③**⛔ 不向调用方抛出**、⛔ 不产生 HTTP 5xx;④**⛔ 不写出生证**(此时没有可信的拓印)。
- ⭐ **反例半边**:成功路径必须**照常**写出生证并发布投影 —— ⛔ 只证明「失败不炸」不够,还要证明**没把成功路径一起吞掉**。

### K-6 回归

- `npm --prefix server run test:v2` 全绿(基线 **338**,回执须报追加后计数)。
- `npm exec -- tsc --noEmit`(cwd=`server`)零诊断。
- ⭐ **既有 parser 零行为变化**:`native-pdf` / `docx` / `text` / `image` 的既有测试**全绿且计数不变**。

## 3. 回执

> **⚠️ 第一件事:无论结果如何,退出前必须把回执写进本工单的 `## Result` 段;若预算紧张,先写 Result 再做别的。**

须含:**K-1 的进程数前后两组实测**(⛔ 缺「数进程」不算)、K-2 的独立重算比对、**K-3 的算术与两个方向的不同错误码**、K-4 的并发实测(峰值进程数)、K-5 三种失败各自的四项断言 + 成功路径反例、K-6 前后计数与既有 parser 计数不变、以及任何停线点。
⛔ 不许 commit,⛔ 不许翻本工单顶部状态行。⚠️ 任何署名按**实际来源**写(本单裁定来自 **Fable**,由调度方转写;⛔ 不得写成 Henry)。

## ⭐ 第二次派工的修订(2026-08-29,调度方;⛔ 第一次派工的停线是对的)

**builder 第一次停线,两条主张我逐条核实,全部为真** —— **本单第一版不可满足,是发单方的错。**

| 它说 | 我核实 |
|---|---|
| `sourceMaterialization.ts:257` 写死 `const paged = artifact.parser_key === 'native-pdf'` | ✅ 属实。MinerU 的 page 族 block 会被送进 `flowAnchorForBlock`,因 `page_index !== null` 以 `parser_failure` 被拒 |
| `transcriber.lockfile` / `lockfile_hash` **无条件**是 `server/package-lock.json` 及其 sha256 | ✅ 属实(`:262-263`)⇒ K-2 在原允许面内**不可表达** |
| `sourceFileIntake.ts:67-76` 把所有 `.pdf` 钉死 `parserKey:'native-pdf'`,而该文件是原禁区 | ✅ 属实 ⇒ **注册了 parser 也没有生产输入会选中它** |

### ⭐⭐ 病根具名:**「有一个注册表」≠「有人会注册到它」≠「有人会选中它」**

我拆单时查了 `PARSERS[input.parser_key]` 这个注册表,就下了「接缝干净」的结论 —— ⚠️ **却从没查【谁来设 `parser_key`】。**
⇒ **注册表是【形状】,选择才是【接线】。** 这正是本仓自己的法:**形状比接线便宜,所以常跑在前面**;**字段在 ≠ 有人用**。
⇒ **机械化**:审插件式接缝时,**三个事实必须分别取证**,⛔ 不许由前一个推后一个:
1. **有注册表吗?**(grep 注册表定义)
2. **有人注册进去吗?**(grep 注册语句)
3. ⭐ **有人会【选中】它吗?**(grep **写入 key 的那一处** —— 本例是 `SOURCE_FORMATS`)
📌 第 3 条是最常漏的,因为前两条**看起来就是接线**。

### ⚠️⚠️ 顺带挖出一个【现存的正确性隐患】,本单一并修

`sourceArtifactImprintInput` **给每一个 parser 都发同一份身份**:`lockfile = server/package-lock.json`。
- 对 `native-pdf` 尚且说得过去(`pdf-parse` 确是 npm 依赖);
- **对 MinerU 是【平白的错】** —— 它的依赖住在 `uv.lock`;
- ⚠️ **而在 v0.7.2 之后,这是【身份错配】**:两个**真正不同**的转写器会因为**共用 `package-lock.json` 的指纹**而被判「**同一转写器**」。

⇒ ⭐ **本单必须把它改成【每个 parser 显式申报身份】,并且:⛔ 未申报身份的 parser 不得回退到 `package-lock.json`,必须【拒绝写出生证】。**
📌 理由:**一个错得合理的默认值,比没有默认值危险** —— 它让「忘了申报」这件事**看起来像正常工作**。同族:「说谎的类型声明」「不可复核的声明比没有更危险」。

### 允许面**扩充**

- `server/src/services/sourceMaterialization.ts`(⚠️ 由「仅接上并发闸」扩为:**并发闸 + `sourceArtifactImprintInput` 的身份选择与 page-family 识别**;⛔ 仍不动认领/状态机/投影发布)
- `server/src/services/sourceFileIntake.ts`(⚠️ **仅**:PDF 的 **parser 选择策略**;⛔ **不得**在此新增任何拓印/分段/校验工序 —— **c-0 的工序前移禁令仍然有效**。**选 parser 本来就是 intake 今天在做的事**,本单只是让它能选第二个)

### 补充判据

#### ⭐ K-7 选择策略:MinerU **⛔ 不是默认**

- **默认仍是 `native-pdf`** —— ⛔ 不许把所有 PDF 切到 MinerU(那会改变全部现役 PDF 行为,且与 K-6「既有 parser 零行为变化」直接冲突)。
- MinerU **显式启用**(如环境开关);**未启用时行为与今天逐字节相同**。
- ⭐ **正反两刀**:①开关关 ⇒ PDF 仍走 `native-pdf`(**且既有 PDF 测试计数与结果不变**);②开关开 ⇒ **真实生产路径**(intake → materialization)选中 `mineru` 并走完。
- ⛔ **不许**靠测试直接造一条 `parser_key='mineru'` 的库行来充当「接上」 —— **那是假绿,builder 自己已经指出过,记它一功。**

#### ⭐⭐ K-8 转写器身份**每个 parser 显式申报**(⛔ 无默认回退)

- 建立 parser → `{lockfile, 指纹取法}` 的**显式申报**;`native-pdf` 申报 `server/package-lock.json`,`mineru` 申报 `_external_tools/mineru/uv.lock`。
- ⭐ **反例(⛔ 缺它本刀不算完成)**:构造一个**已注册但未申报身份**的 parser ⇒ **必须拒绝写出生证并落 `failed`**,⛔ **不得**回退到 `package-lock.json`、⛔ 不得静默写入。
- **回归**:`native-pdf` 现有出生证的 `lockfile` 与 `lockfile_hash` **逐字节不变**(⛔ 这条不许"顺手改进")。

#### K-9 错误码取自现物(builder 已侦察,采纳)

- 现物:`resource_limit` **不可重试**,`internal_interrupted` **可重试**。
- ⇒ K-3 两方向可用:**页超限 = `resource_limit`**(改输入才有救,不该重试);**超时 = `internal_interrupted`**(可重试)。
- ⚠️ **⛔ 仍须实测两向各取一次红,不许把这条建议当成结果** —— 它只是**免去猜错一轮**,不是证据。**记 builder 一功:它明确写了「不把建议冒充结果」。**

## Result

> **STOPPED · needs: claude（Codex builder，2026-08-29）**：开工现物核对发现，本单允许面内无法同时满足 K-2、K-5 成功反例与“真正接线”；遵照“假设不符不要猜”停线。未创建 MinerU parser / 并发闸 / 新测试，未改生产码，工单顶部状态行未动，也未 commit。

### 硬冲突 1：MinerU 出生证在允许面内不可表达

`server/src/services/sourceMaterialization.ts:252-275` 的 `sourceArtifactImprintInput` 当前同时写死三件事：

1. `paged` 只认 `artifact.parser_key === 'native-pdf'`；MinerU 的 page 族 block 会被送入 `flowAnchorForBlock`，因 `page_index !== null` 以 `parser_failure` 被拒，成功路径到不了投影发布。
2. `transcriber.name/version` 虽取自 artifact，但 `transcriber.lockfile` 无条件是 `server/package-lock.json`。
3. `transcriber.lockfile_hash` 无条件是上述 `server/package-lock.json` 原始字节的 SHA-256。

因此，即使只在 `sourceArtifact.ts` 注册一个 `mineru` parser，K-2 所要求的 `{name:'mineru', version:'3.4.5', lockfile:'_external_tools/mineru/uv.lock', lockfile_hash:sha256(uv.lock 原始字节)}` 仍无法写入；K-5 的成功反例也会在写出生证阶段失败。修复必须改 `sourceMaterialization.ts` 的出生证选择 / page-family 识别，但本单允许面对该文件的明文限制是“**仅接上并发闸**”。继续修改会越权，故未猜测扩面。

### 硬冲突 2：生产 intake 没有 MinerU 选择路径

`server/src/services/sourceFileIntake.ts:67-76` 把所有 PDF 固定为 `parserKey:'native-pdf'` / `parserVersion:'2.4.5'`，并在 `:1200-1217` 将 inspected parser identity 原样写入 `source_materializations`。该文件是本单禁区。故新增 `PARSERS['mineru']` 没有真实生产输入能选中；把 `PARSERS['native-pdf']` 替换为 MinerU 又违反“既有 native-pdf 零行为变化”与“只注册 parser”。靠测试直接造一条 `parser_key='mineru'` 的数据库行只能得到假绿，不能证明“接上”，所以未这样做。

### 所需裁定

请 Claude/Fable 明确补足以下最小施工缝后再派：

1. 扩充 `sourceMaterialization.ts` 允许面，允许按 artifact/transcriber identity 选择 MinerU 的 lockfile + hash，并把 MinerU 识别为 page-family；或提供一条已经存在、无需改该逻辑的等价缝。
2. 明确生产 PDF 何时选择 `mineru`（扩 `sourceFileIntake.ts` 允许面、增加已授权的选择层，或明确本单只注册但**不声称生产已接上**）。

### K-1～K-5 实测状态（未伪报）

- **K-1**：未实施，故没有超时前/后 Python 进程计数；不声称“promise reject”通过。
- **K-2**：未产生 MinerU 出生证，故没有可与独立 `readFileSync(_external_tools/mineru/uv.lock)` 重算值比较的落库值；不以常量或生产 helper 冒充独立比对。
- **K-3**：未实施专属限额，故没有页超限 / 超时两向实测或算术可申报。只读核对确认现有 `resource_limit` **不可重试**，而 `internal_interrupted` 可重试；若重派，可用页超限=`resource_limit`、超时=`internal_interrupted` 形成不同错误码，但本轮未把建议冒充结果。
- **K-4**：未实施并发闸，故没有 N≥3 或峰值进程数实测。
- **K-5**：崩溃 / 超时 / 非零退出及成功反例均未实施、未声称通过；尤其没有为通过失败半边而吞掉成功路径。

### K-6 开工基线与工作树边界

- `npm --prefix server run test:v2`：exit 0，**338 tests / 338 pass / 0 fail / 0 skipped / 0 todo / 0 cancelled**（TAP 顶层 `1..331`）。因停线没有追加后计数。
- `npm exec -- tsc --noEmit`（cwd=`server`）：exit 0，零诊断。
- 既有核心回归 `v2SourceMaterialization.test.ts`：**11/11**。按实际触发生产 parser 的顶层测试计（共享用例有重叠）：`native-pdf` **2/2**、`native-docx` **2/2**、`native-text` **5/5**、`native-image` **3/3**；支撑回归为 `v2SourceT0Alignment` **10/10**、`v2DocumentParserPdf` **2/2**、`v2SourceNeverReject` **9/9**。
- 开工前已有 `server/src/routes/projections.ts` 修改；它不在本单允许面，保持未触碰。本轮唯一落盘内容是本 `## Result` 回执。裁定来源按工单如实记为 **Fable，由调度方转写**，未写成 Henry。
