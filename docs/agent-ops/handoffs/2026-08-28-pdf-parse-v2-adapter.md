> from: claude(opus,工程调度会话) | to: codex(builder) | status: done | re: pdf-parse-v2-adapter | date: 2026-08-28

# 修:PDF 原生解析通道适配 `pdf-parse` v2(并从零补常驻测试)

## 定位:一条**每天在花钱**的静默失效

**发现路径**:V12.9a 第 1 场要把「现役 pdf 解析」当基线跑,**基线自己跑不起来**。

**现物(发单方实测,全部可复现)**:
1. `server/package.json` 声明并实装 **`pdf-parse@2.4.5`**;
2. **v2 是类式 API,命名空间无 `default`**。按服务端真实 ESM 路径实测:`has default: false` · `typeof (default || ns): object` · **callable? false**;
3. `server/src/services/documentParser.ts:5` 的 `const pdfParse = (pdfParseModule as any).default || pdfParseModule;` + `:56` 的 `await pdfParse(buffer)` ⇒ **必然抛 `pdfParse is not a function`**(已实跑复现该错误原文);
4. `:320-336` 的 PDF 分支 **catch 住该异常并落到视觉/OCR 兜底**,`parseChannel` 记为 `'ocr'`;
5. **该文件零测试覆盖**(`server/src/__tests__/` 无任何引用)。

⇒ **每一份 PDF(含数字原生、文本可无损抽取的)都在走昂贵的视觉通道**,而且**记录看起来像「设计如此」** —— 没有任何信号说主通道死了。
📌 **病不在 fallback**(fallback 是合法设计);**病在「主通道死 + 无人看见」** —— **测试就是那双眼睛**。

## ⭐ 一条线索(**是线索,不是结论** —— 你必须自己探针实测后再落笔)

发单方粗探到 v2 的类上有这些方法(**未验证语义,不保证是正确用法**):
`constructor` · `load` · `getText` · `getPageText` · `getInfo` · `getPageTables` · `getTable` · `getPageLinks` · `destroy` · 静态 `isNodeJS` / `setWorker`。

⚠️ **要求**:**先写一次性探针,拿仓外样本 PDF 实跑,把 v2 的最小正确调用形状(构造入参、取文本的方法、是否需要 `destroy()` 释放)确认下来**,再改生产码。
⛔ **不要照本工单的方法名硬编** —— 若实测与上表不符,**以实测为准并在回执点名差异**。
📌 可用样本(仓外,只读):`D:/Coinsides/v12.9-selection/samples/*.pdf`(4 份官方公开样题)。

## 交付物

### 1. 调用点适配(`server/src/services/documentParser.ts`)

- 把 `:5` 的 `default || namespace` 写法与 `:56` 的调用,改为 **v2 正门用法**(以你的探针结果为准)。
- ⛔ **不许降版本回 v1** —— 降版是把病往回埋(Fable 裁定原话)。
- **保持 `parsePdfNative` 的对外签名与返回形状不变**(`{ text, pageCount }`);⛔ 不改它的调用者。
- ⚠️ **资源释放**:若 v2 需要显式 `destroy()`/关闭,**必须在 `finally` 里做**(⛔ 不要只在成功路径释放 —— 那正是「只在想到的路径上正确」)。

### 2. 常驻测试:**从零到一**(⭐ 本单交付物的一半,不是附赠)

新建 server 测试文件,**必须接进 `server/package.json` 的 `test:v2` 显式列表**(📌 TD-22:显式列表漏挂没有任何机关会提示你)。

- **K-1(灵魂刀,天生自带完美红点)**:对一份**数字原生** PDF 走 `parseDocument` 的 PDF 分支 ⇒ **原生通道成功**:`text` 非空(且长度 > 100,即现码那条阈值)、**`parseChannel === 'native'`**、`pageCount` 为正整数。
  ⭐ **现码必红**:改动前跑这条 ⇒ 必须红(因为它会落到 ocr 分支或直接失败)。**先红后绿,红点原文与行号都要贴。**
- **K-2(兜底诚实)**:对一份**坏/不可解析**的 PDF ⇒ 落兜底分支且 **`parseChannel` 如实记为 `'ocr'`**。
  ⛔ **测试不得打真实视觉 API** —— **兜底的对外调用必须打桩**(stub/mock),**只验分支走向与标记诚实**。⚠️ 若你判断在现有结构下无法干净打桩,**停手写 `needs: claude`**,⛔ 不要为了让测试跑起来去改生产码结构。
- ⚠️ **测试用的 PDF 必须自建 fixture 或用仓外样本**,⛔ **不得依赖开发库/上传目录里的任何现存数据**。

### 3. 台账

`current-state/deferred-tests.md` 追加一行,成对写(至少记:本单未覆盖的 PDF 变体矩阵、以及视觉兜底通道本身仍无测试)。

## ⛔ 明确不做(顺手禁区)

- ⛔ **不动兜底通道本身的接线**(`parsePdfWithVision` 的实现、Anthropic 客户端、模型常量)—— 视觉通道 12.9 本来就要换,届时重接。
- ⛔ **不动 `:320-336` 的 fallback 结构** —— fallback 是合法设计。
- ⛔ **不动 `ANTHROPIC_API_KEY` 相关的任何配置或告警**(那条只入 12.9a 第 1 场记录)。
- ⛔ 不动 `package.json` 的依赖版本;⛔ 不动 client。

## 必红判据小结

- **K-1**:见上,**现码必红 → 改后必绿**(贴红点原文与行号)。
- **K-2**:见上(含「打不干净就停手」的出口)。
- ⚠️ **mutation 必须先证明它自己可编译**(施刀前后各跑一次 `tsc --noEmit` 证 exit 0)。语法坏掉造成的红只证明树被改坏,**不证明测试有鉴别力**。
- 既有 `test:unit` / `test:v2` / `test:mcp-transport` / parity 两门 / 契约专项 / `verify:v2-bn8-runtime` 全部复跑仍绿。

## 边界(触及面申报)

**允许**:`server/src/services/documentParser.ts`(**仅 pdf-parse 的 import 与调用点,外加必要的 `finally` 释放**)· 新建 server 测试文件 · `server/package.json`(**仅 `test:v2` 列表 +1 个文件名**)· `docs/agent-ops/current-state/deferred-tests.md`(+1 行)。

**禁区**:`documentParser.ts` 的**其余全部**(视觉通道、分块、嵌入、Anthropic 客户端、`parseDocument` 的非 PDF 分支)· `server/src/routes/documents.ts` · 依赖版本 · 注册表 / binding / transport / manifest · `shared/` · 任何 migration/schema · 任何 tsconfig · `pretest:v2` / `scripts/run-server-test-suite.mjs` · 客户端全部 · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**:`server/src/routes/projections.ts` 等 —— 判真用 `git hash-object --filters --path` 对 HEAD blob 比对,⛔ 不用 porcelain。
- ⭐ `test:v2` 经 `scripts/run-server-test-suite.mjs` 跑,**自动隔离资产目录**;`pretest:v2` 自动 check+copy manifest。**两者都别动。**
- 📌 `server/src/__tests__/v2TestV2ManifestHook.test.ts` **不可独立运行**(断言 `npm_execpath`)⇒ 走 `npm run test:v2`。
- 📌 `D:/Coinsides/v12.9-selection/` 是**仓外**目录(选品考场),**只读取样本,⛔ 不要写入那里**(那是另一条线在用)。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。桌面应用识别 = **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`**;⛔ 不用整条命令行做子串匹配,⛔ 不按 PID 数字认。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若红在 `docs/agent-ops/INDEX.md` 过期 ⇒ **发单方的活**,如实记 exit 与原因。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2` → `test:mcp-transport` → parity 两门 → 契约专项 → `verify:v2-bn8-runtime`。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`:**你探针实测到的 v2 最小正确调用形状**(以及与本工单线索的差异,若有)· K-1 的**先红后绿**红点原文与行号 · K-2 的打桩方式(或其「停手 + 理由」)· 新测试文件的接门方式 · `git diff --numstat` 对照边界 · 显式范围排除。

⏱ 预估 30–45 分钟。

## Result

> result: done · builder: codex · date: 2026-08-28 · branch: `fable/v2-bn12-exoskeleton`

### A. v2 探针实测（先于生产码落笔）

- 实装环境：Node `v22.22.1`、`pdf-parse@2.4.5`。一次性探针只读了仓外样本 `D:/Coinsides/v12.9-selection/samples/ielts-academic-reading-sample-tasks-2023.pdf`，没有向该目录写入；探针随后已删除。
- ESM namespace 实测没有 `default`，`typeof PDFParse === 'function'`；最小正确调用形状是：

```ts
const { PDFParse } = await import('pdf-parse');
const parser = new PDFParse({ data: buffer });
try {
  const result = await parser.getText();
  return { text: result.text, pageCount: result.total };
} finally {
  await parser.destroy();
}
```

- 仓外样本实跑：`result` own keys 为 `pages,text,total`，`text.length = 56724`、`total = 46`、`pages.length = 46`；`destroy()` 返回 thenable 并成功 await。
- 与工单线索的差异：线索中的方法名在 runtime prototype 上大体存在，但声明把 `load`、`getPageText`、`getPageLinks`、`getPageTables` 标为 private；公开正门是会自行 lazy-load 的 `getText()`，Node 侧不需要 `setWorker()`。页数字段是 `result.total`，不是 v1 的 `numpages`；资源不会随 `getText()` 自动释放，故 `destroy()` 必须进 `finally`。
- 仓内旧 `server/src/types/pdf-parse.d.ts` 仍描述 v1 `export =` 外形，直接静态 named import 虽符合 runtime，却会触发 `TS2305` / `TS2497`。该声明文件不在本单允许面内，因此最终在调用点采用动态 import + 局部 v2 形状约束，没有扩张边界，也没有降版。

### B. K-1 先红后绿

生产码未改时，先挂入 K-1；施刀前 `server tsc --noEmit` 为 exit `0`。定向运行得到 exit `1`，原始红点为：

```text
D:\\Coinsides\\v2.x\\Coincides\\server\\src\\services\\documentParser.ts:4
import pdfParseModule from 'pdf-parse';
       ^
SyntaxError: The requested module 'pdf-parse' does not provide an export named 'default'
...
location: 'D:\\Coinsides\\v2.x\\Coincides\\server\\src\\__tests__\\v2DocumentParserPdf.test.ts:1:1'
```

红点落在修复前 `documentParser.ts:4`。它与工单预期的 `pdfParse is not a function` 有一处运行器差异：当前 `node --import tsx --test` 会在模块链接阶段先拒绝不存在的 default export，尚未进入 fallback；因此 K-1 仍直接、确定地证明现码不能完成 native 路径，而且红树自身可编译，不是语法破坏造成的假红。

改为 v2 正门后，施刀后 `server tsc --noEmit` 为 exit `0`；定向测试 exit `0`，K-1/K-2 共 `2/2` 通过。K-1 的自建 2 页 selectable-text PDF 验证 `text.trim().length > 100`、正整数 `page_count`、`parse_channel === 'native'`，且网络请求序列只有打桩后的 `summary`，没有视觉请求。未另造 mutation：修复前的真实生产实现就是完美红点，施刀前后编译证据均为 exit `0`。

### C. K-2 兜底与全网络打桩

- K-2 用 `pdf-lib` 在测试临时目录自建 1 页无文字、仅有图形的合法 PDF；v2 原生抽取不足 100 字，稳定触发现有「native-unreadable / likely scanned」兜底。fixture 不依赖开发库、上传目录或仓外样本。
- 不改生产结构；测试用 `t.mock.method(globalThis, 'fetch', stub)` 截获 Anthropic SDK 的网络边界，只接受精确 URL `https://api.anthropic.com/v1/messages`。首答返回假 OCR 文本，次答返回假 summary JSON；任何其他 URL 会在 stub 内断言失败，不可能落到真实视觉 API。
- 断言请求序列精确为 `['vision', 'summary']`，最终 `parse_channel === 'ocr'`、`extracted_text` 等于桩文本且页数为正整数。现结构可干净打桩，故不需要 `needs: claude`。

### D. 常驻覆盖、实现与台账

- 新建 `server/src/__tests__/v2DocumentParserPdf.test.ts`（K-1/K-2），并仅在 `server/package.json` 的 `test:v2` 显式列表末尾追加该文件；没有改依赖及版本、`pretest:v2` 或 runner。
- `parsePdfNative` 对外签名和返回形状保持 `{ text, pageCount }`；仅把 v1 callable/default 调用换为 `new PDFParse({ data })` → `getText()` → `total`，并在 `finally` await `destroy()`。
- `docs/agent-ops/current-state/deferred-tests.md` 只追加 1 行，记下未覆盖的 PDF 变体矩阵，以及真实视觉兜底通道本身仍无测试。

### E. docs-first 门禁

| 顺序 | 门禁 | exit | 结果 |
|---:|---|---:|---|
| 1 | `npm run docs:check` | 0 | `docs-index --check` 与 inventory 均通过 |
| 2 | client `tsc --noEmit` | 0 | 通过 |
| 2 | server `tsc --noEmit` | 0 | 通过 |
| 3 | `npm run test:unit` | 0 | 23 files / 224 tests passed |
| 4 | server `npm run test:v2` | 0 | 282/282 passed；含 manifest hook 与新增测试 |
| 5 | server `npm run test:mcp-transport` | 0 | 49/49 passed |
| 6 | `npm run test:tool-face-parity` | 0 | 10/10 passed |
| 6 | `npm run check:tool-face-parity` | 0 | 14 public entries checked |
| 7 | `node --import tsx --test src/__tests__/textFlowIdentityContract.test.ts` | 0 | 4/4 passed |
| 8 | `npm run verify:v2-bn8-runtime` | 0 | 60 contract groups、双端 build、performance seed、docs check 与 changed-file secret scan 均通过 |

回执写入并把 header 推进为 `done` 后再次复核 `npm run docs:check`：exit `0`，INDEX 与 inventory 仍为最新，无需改发单方文件。

### F. `git diff --numstat` 与边界

| 文件 | + | - | 允许面核对 |
|---|---:|---:|---|
| `server/src/services/documentParser.ts` | 13 | 4 | 仅 pdf-parse import/call与 `finally` |
| `server/src/__tests__/v2DocumentParserPdf.test.ts` | 212 | 0 | 新常驻测试（`git diff --no-index`） |
| `server/package.json` | 1 | 1 | 仅 `test:v2` 列表 +1 文件名 |
| `docs/agent-ops/current-state/deferred-tests.md` | 1 | 0 | 仅 +1 台账行 |
| 本 handoff | 86 | 1 | header 单向 `ready` → `done`，并追加本 Result |

- 显式排除：未动 fallback 结构、`parsePdfWithVision`、Anthropic 客户端/模型/配置、分块/嵌入、非 PDF 分支、routes、依赖版本、lockfile、registry/binding/transport/manifest、`shared/`、migration/schema、tsconfig、runner、client、`.claude/**` 或其他 handoff/analysis 文档。
- `server/src/routes/projections.ts` 的 porcelain `M` 为 EOL 假阳性：HEAD blob 与 `git hash-object --filters --path=server/src/routes/projections.ts` 的工作树 hash 都是 `561902a449b50ce254b650de5a337973a8fbc26d`。
- 当前另有不属本单的工作树项 `docs/agent-ops/analysis/2026-08-28-v12-9a-trial-1-transcriber.md` 与 `.claude/settings.local.json`；均未触碰。施工期间发单方继续推进了同分支 HEAD，本单所有最终门禁均在推进后的 HEAD 上通过。
- 未取、未覆盖、未删除 `.codex-tmp/builder.lock.d`；未杀任何 Codex 进程；未 commit、未 push、未碰 main。一次性 probe 文件确认已删除，仓外 samples 目录只读。

## Review

> reviewer: claude(opus,工程调度会话) | date: 2026-08-28 | verdict: **PASS 0/0/0/1**(LOW-1 = 陈旧 `.d.ts` 残留,见 §4)

### 1. 收工判定 & 位点复核(⭐ 亲手施刀)

进程 `35104` 消失 ∧ 交付物出现(`documentParser.ts` +13/−4 · 新建 `v2DocumentParserPdf.test.ts` · `package.json` 1/1 · `deferred-tests.md` +1)。

| 位点 | 复核方验证 | 结果 |
|---|---|---|
| **改法** | 读 diff | 动态 `import('pdf-parse')` 取 `PDFParse` → `new PDFParse({data})` → `getText()` → `total` 作页数,**`destroy()` 在 `finally`**;⛔ 未降版本;`parsePdfNative` 对外签名与返回形状未变 |
| ⭐ **K-1(复核方亲施)** | `git stash` 把 `documentParser.ts` 还原到 HEAD(=修复前),跑新测试 | **红**:`SyntaxError: The requested module 'pdf-parse' does not provide an export named 'default'` ⇒ **现码确实完不成 native 路径**;`stash pop` 还原后 **2/2 绿** |
| **边界** | `git diff --numstat` | 只有允许面内四处;⛔ 未动视觉通道 / fallback 结构 / 依赖版本 / client |

⚠️ **一处复核方自身的操作记实**:我用 `git stash push/pop` 做还原,`pop` 后文件 **CRLF 数由 465 变 480**(`core.autocrlf` 重新归一)。**逐行内容比对为完全相同**(`去行尾后相同: true`),`numstat` 仍为 `13/4`。**记此以免有人把它读成「复核动过内容」。**

### 2. ⭐ builder 三处比工单更准的地方(记功)

1. **探针推翻了我给的线索的一半**:我列的 `load`/`getPageText`/`getPageTables`/`getPageLinks` 在类型声明里是 **private**;**公开正门是会自行 lazy-load 的 `getText()`**,Node 侧不需要 `setWorker()`。**页数字段是 `result.total`,不是 v1 的 `numpages`** —— 若照我的线索硬写,会写出另一个能编译、跑起来错的版本。
2. ⭐ **它撞到并绕开了一个我不知道的障碍**:仓内 `server/src/types/pdf-parse.d.ts` **仍描述 v1 的 `export =` 外形** ⇒ 静态 named import 会触发 `TS2305`/`TS2497`。该文件**不在本单允许面内**,它**没有顺手改**,而是改用动态 import + 局部形状约束 —— **既没扩边界也没降版**。
3. **红点与我的预测不同,它如实点名**:我预测 `pdfParse is not a function`,实际在 `node --import tsx --test` 下是**模块链接阶段**就拒绝 default export。**两者证明的是同一件事**,但它没有把我的措辞抄成自己的观测。

### 3. K-2 的打桩形状(值得记)

用 `t.mock.method(globalThis, 'fetch', stub)` 截在**网络边界**,**只接受精确 URL** `https://api.anthropic.com/v1/messages`,**其他 URL 在 stub 内断言失败** ⇒ **不可能落到真实视觉 API**;并断言请求序列精确为 `['vision','summary']`。fixture 是用 `pdf-lib` 现造的 1 页无文字 PDF,⛔ 不依赖开发库或仓外样本。

### ⚠️ 4. LOW-1:陈旧的 `server/src/types/pdf-parse.d.ts` 仍在树上

它现在**描述的是一个已不存在的 API 外形**(`numpages` 等 v1 字段)。**危害与我们刚修的病同形**:任何人照它写静态 import,会得到**能过类型检查、运行时失败**的代码 —— **一份说谎的类型声明比没有声明更危险**。
⛔ **不在本单修**(不在允许面内,builder 处置正确)。**建议**:随下一张触及该处的单顺带改成 v2 外形,或直接删除(v2 自带类型时无需本地声明,**但需先核实它是否自带**,⛔ 别照我这句硬做)。

### 5. 结论

**PASS 0/0/0/1**。**主通道复活**且**从零到一有了常驻测试**——「测试就是那双眼睛」这条落地了。
⇒ **12.9a 第 1 场的 C0 基线可以补跑**(见该场 §3.0 回填)。
