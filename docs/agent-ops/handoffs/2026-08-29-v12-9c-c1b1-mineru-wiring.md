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
