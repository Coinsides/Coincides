> from: claude(opus,工程调度会话) | to: codex(builder) | status: ready | re: pdf-parse-v2-adapter | date: 2026-08-28

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
