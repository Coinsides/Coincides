> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 2026-08-23 裁「机械级,Opus 发只写测试的修正单」;范围按两个符号) | re: v2bn12-2b-3-fix | date: 2026-08-23

# V2.BN.12.2b-3-fix:锁住**生产默认 executor 的身份**(两个符号)

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。
> ⛔ **只写测试。产品码零改动** —— b-3 复核已确认**当前生产行为正确**,FAIL 来自回归护栏不承重,不是实现走错。

## 上游

- b-3 工单及其 `## Review`(判定 **FAIL(方向成立) 0B/1H/0M/0L**,唯一发现 **HIGH-1**)。
- Fable 2026-08-23 裁定:机械级、只写测试、**范围两个符号**、不回抛 reviewer 补刀。

---

## HIGH-1 是什么(复核亲验)

`toolReceipts.ts` 的注入 seam:

```ts
:93  const trashNoteExecutor = options.trashNoteExecutor ?? trashNoteAsUser;
:94  const revertReceipt     = options.revertReceipt     ?? revertTrashNotesReceipt;
```

**复核施刀**:保留 canonical import、保留注入 seam、保留事务内调用与可编译性,**只把默认绑定换成等价内联实现** ⇒ **36/36 全绿,mutation 存活**。

**根因**:测试传入的计数 wrapper **顶掉了生产默认分支**。既有护栏各差一格 —— A-1 只证 import 存在且来源正确;H-5 只看事务回调内那个**名叫** `trashNoteExecutor` 的调用;K-2 有鉴别力却**注入了**;K-1 不注入却**只验行为**(行为等价的内联实现照样过)。

> **这一次的形状**(【理由·Opus 补】):**证明工具本身制造了盲区** —— 注入计数 wrapper 是为了证明「走了 canonical」,而**注入这个动作恰好顶掉了它声称要验的那条分支**。越精心造的探针,越容易把被测对象换成探针自己。

---

## ⭐ 调度方亲验:同一 seam 有**两个**符号(复核只点名了第一个)

| 符号 | 有鉴别力的测试 | 是否注入 |
|---|---|---|
| `trashNoteExecutor` | **K-2**(source-projection 守卫) | ⭐ **注入了** |
| `revertReceipt` | **K-5b 成功路径**(`:393` 恢复 note + 收据 reverted) | ⭐ **注入了** |

另三条不注入的 K-5b(`:419/:436/:453`)**只断言 403 / 409 / 409 三种拒绝 + note 不变** —— **任何抛同样错的实现都能过,对默认分支身份零鉴别力**。

⇒ **两侧同病,本单两侧同修。**

> ⚠️ 此条为**调度方结构推断,非亲验红**(施 mutation 是复核方的活)。**Fable 裁定不回抛 reviewer,改为写成本单必红判据由 builder 前置自查,修正复核时 reviewer 亲刀坐实。**

---

## ⛔ 必红判据的一处更正(**发单方须先说清,否则你会去追一个追不到的红**)

Fable 口述形状时写的是「默认换内联 revert ⇒ **四条 K-5b 须红**」。**按结构这不成立,本单不照此写**:

**若内联复制是忠实的**(复刻全部守卫),那么:

| 断言 | 忠实复制下 | 说明 |
|---|---|---|
| **AST 身份锁(S1)** | ⭐ **红** | **唯一能杀死忠实复制的** |
| 行为正控(S2) | **仍绿** | 行为等价 ⇒ 观察不到差别 |
| 三条拒绝 K-5b | **仍绿** | 本就零鉴别力 |

**若内联复制不忠实**(例如丢掉 source-projection 守卫),S2 才会一起红。

⇒ **本单的必红分两档,⛔ 不得合并申报**(见 K 系)。**这正是「一条锁身份、一条锁行为」两条都要的原因**:行为锁挡不住忠实复制,身份锁挡不住行为漂移。

---

## S1:AST 锁**默认 fallback 的 symbol 身份**(两个符号)

在既有 `v2NotesListService.test.ts` 的 TypeScript 上下文里新增断言。**`getServerTypeScriptContext()` 已提供真 `program` + `checker`,用它做符号解析**。

对 `server/src/routes/toolReceipts.ts` 各立一条:

| # | 变量 | 默认 fallback 必须是 | 来源模块 |
|---|---|---|---|
| **I-1** | `trashNoteExecutor` | `trashNoteAsUser` | `../services/notes.js` |
| **I-2** | `revertReceipt` | `revertTrashNotesReceipt` | `../services/toolFaceReceiptRevert.js` |

**断言须走到符号,不得停在文本**:定位该变量声明 → 初始化器是 `??` 二元表达式 → **取右操作数的标识符 → `checker.getSymbolAtLocation` → 解析别名 → 断言其声明就是该 canonical named import**(并复用既有的**解析后比 `resolvedFileName`** 判来源,⛔ 不得字符串相等)。

⛔ **不得**只断言「右操作数的文本叫 `trashNoteAsUser`」—— 那样一个同名的本地函数或复制模块就能骗过,**等于把 HIGH-1 原样搬进新断言**。

## S2:**不注入**的真实 Express 行为正控(两侧各一)

| # | 侧 | 做法 |
|---|---|---|
| **B-1** | trash | **就是 K-2 去掉注入** ——`withToolReceiptsHttp({}, …)`,`activateNote(db, NOTE_A, 'source_projection')`,apply ⇒ **note 保持 `active`**,收据 resources = `[{kind:'note', id, outcome:'skipped', reason:'read_only_projection'}]` |
| **B-2** | revert | **不注入**,applied 收据 ⇒ revert ⇒ **note 真的回来(`active`)** + 收据 `reverted` |

⛔ **B-1/B-2 不得注入任何 `options`**(`withToolReceiptsHttp({}, …)`)—— 注入即失去全部意义。
📌 **既有的 K-2 与 K-5b 成功路径保留不动**(它们仍验注入 seam 本身),B-1/B-2 是**增设**,不是替换。

---

## K 系必红(**两档,⛔ 不得合并申报**)

| # | 施刀 | 必红 | 必须**仍绿**的 |
|---|---|---|---|
| **X-1** ⭐ | 把 `?? trashNoteAsUser` 换成**忠实**内联复制(可编译、行为等价) | **I-1 红** | **B-1 绿、K-1/K-2 绿** —— 须显式申报「行为锁挡不住忠实复制」 |
| **X-2** ⭐ | 把 `?? revertTrashNotesReceipt` 换成**忠实**内联复制 | **I-2 红** | **B-2 绿、四条 K-5b 全绿** |
| **X-3** | 把 `?? trashNoteAsUser` 换成**丢掉 source-projection 守卫**的内联实现 | **I-1 红 且 B-1 红** | — |
| **X-4** | 把 I-1/I-2 的断言退化成「右操作数文本相等」,再施 X-1/X-2 | **该断言变绿 ⇒ 证明退化可骗** ⇒ 说明解析承重 | — |
| **X-5** | 恢复全部后 | **全绿** | — |

**红的性质**:须来自目标 `AssertionError`,**不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`**;行为红须**从真实 Express 触发**。
⛔ **施刀期间对产品码的临时改动必须全部还原**;交付 diff 里 `server/src/routes/` **必须零改动**。

---

## 边界

**允许**:改 `server/src/__tests__/v2NotesListService.test.ts`(增 I-1/I-2 与其 helper)· 改 `server/src/__tests__/v2TrashNotesTool.test.ts`(增 B-1/B-2)。

**⛔ 不得**:改**任何**产品码(尤其 `server/src/routes/toolReceipts.ts`、`services/notes.ts`、`services/toolFaceReceiptRevert.ts`)· 改 schema/migration · 删改既有 K-1…K-5b 与 A-1 六条 · 另写一套 import 断言 helper(I-1/I-2 是**新语义**,可新增,但**来源比对须复用既有的解析后比对**)· 碰 b-2b-2 / 12.1 线 / v1 其余线。

**越界即停,标 `needs: claude`。**

## ⚠️ 基线缺口:不得代偿

`scopes` 未强制(TD-14)· TD-6 跨资源原子性(**多资源 revert 仍非原子,复核 §4-6 已点名**)· TD-12(EPERM:`test:v2` 首跑 5 个 image fixture 会 EPERM,须用 `CANVAS_ASSET_DIR` 指向 OS temp 绕开,**这不是产品缺陷,⛔ 不得改测试或产品语义来代偿**)· TD-16。

## D. 探针 / 锁 / 环境

阴性断言前先让同一探针看见已知阳性;**确认命中不是来自你自己刚写进去的东西**。
**锁**:取锁失败即停,⛔ 不得覆盖既有 `owner.json`,不删非你所写的锁。
📌 porcelain 对 `client/.../useNoteCanvasRuntimeController.ts`、`server/src/routes/projections.ts` 有 stat/EOL 假阳性(**blob 哈希分别为 `3efe5f82…`、`561902a4…`,等于 HEAD**);判文件真改用 blob 哈希或 `git diff --numstat`(**`--stat` 看不见 untracked**);管道遮蔽退出码;`grep -c` 数**行数**不是**出现数**;单行 regex 抓不到跨行 import。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit` → server `test:v2` → 五道 tool-face 门。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方**(本单 X-1…X-5 是**前置自查**,仍须在回执逐条给输出)+ **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:X-1…X-5 **各自**输出,**且 X-1/X-2 必须显式申报「哪些断言仍绿及为何」**(⛔ 不得把「B-1 仍绿」当失败去修) · I-1/I-2 走到 symbol 而非文本的证明 · B-1/B-2 **零注入**的证明 · **`server/src/` 全目录 `git diff --numstat` 为空的证明** · 门禁逐条收据 · 触及面 diff vs 申报 · 显式范围排除 · **每条阴性断言的阳性对照**。

## Result

> builder: codex | date: 2026-08-23 | outcome: PASS

### 实现

- server/src/__tests__/v2NotesListService.test.ts：增强既有 canonical named-import helper，使其返回 import binding、alias target 与 ImportSpecifier；新增 I-1 / I-2 默认 fallback 身份锁。
- I-1 / I-2 均先定位 createToolReceiptsRouter 直接函数体内的唯一声明，确认 initializer 为 ?? 且 RHS 为 Identifier，再依次执行 checker.getSymbolAtLocation(RHS) → 校验 SymbolFlags.Alias → checker.getAliasedSymbol。最终同时比较 binding symbol 对象、canonical ImportSpecifier declaration 与 alias target symbol。
- import 来源判定未另造文本 helper，直接复用既有 ts.resolveModuleName(...).resolvedFileName 比对。
- server/src/__tests__/v2TrashNotesTool.test.ts：新增 B-1 / B-2；两条均以 withToolReceiptsHttp({}, …) 进入真实 Express 路径，options 零注入。既有 K-1…K-5b 未改。

### X-1…X-5 前置 mutation 自查

所有 mutant 均先通过 server tsc --noEmit，再执行目标测试；临时产品刀与 X-4 测试刀均用逆 patch 完整还原。

| 刀 | 结果 |
|---|---|
| X-1 | 在 router factory 内加入与 canonical import 同名、行为忠实的局部 trashNoteAsUser，RHS 文本仍为 trashNoteAsUser。tsc exit 0；I-1 / B-1 / K-1 / K-2 共 4 条：exit 1，3 绿 1 红。唯一红为 I-1 的目标 AssertionError：trashNoteExecutor default fallback must resolve through the canonical import alias。B-1、K-1、K-2 仍绿；这是预期，因为行为等价的忠实复制无法被行为正控观察到。 |
| X-2 | 同法加入与 canonical import 同名、行为忠实的局部 revertTrashNotesReceipt。tsc exit 0；I-2 / B-2 / 四条 K-5b 共 6 条：exit 1，5 绿 1 红。唯一红为 I-2 的目标 AssertionError：revertReceipt default fallback must resolve through the canonical import alias。B-2 与四条 K-5b 仍绿；这是预期，因为复制行为等价。 |
| X-3 | 加入同名 trash 实现，但故意删掉 source-projection 守卫。tsc exit 0；I-1 / B-1：exit 1，0 绿 2 红。I-1 为同一目标 AssertionError；B-1 从真实 Express 路径红，actual = trashed、expected = active。 |
| X-4 | 临时把 I helper 退化为只比较 RHS 文本，同时施加 X-1 / X-2 的同名忠实 shadow。tsc exit 0；I-1 / I-2：exit 0，2/2 绿，证明文本比较会被同名替身骗过，symbol / alias / declaration 解析实际承重。 |
| X-5 | 全部临时刀逆 patch 归复。server tsc exit 0；test:trash-notes-tool exit 0，40/40。toolReceipts.ts 恢复为与 HEAD 相同的 blob。 |

### 阳性对照

- 归复后的 I-1 / I-2 均绿，canonical import 能被同一 symbol 探针解析。
- X-1 中 K-1 能真实 trash，B-1 / K-2 对完整 source-projection 语义均绿；因此 I-1 的红不是未执行或不可编译造成。
- B-2 在请求前显式锁定 receipt = applied、note = trashed，请求后锁定 note = active 且 receipt = reverted；归复链现行全绿。
- X-2 中 B-2 与四条 K-5b 均绿；因此 I-2 的红只来自 executor 身份漂移。

### 门禁

| 门禁 | 收据 |
|---|---|
| root npm run docs:check | PASS，exit 0 |
| root npm run verify:v2-bn8-runtime | PASS；完整链运行至 changed-file secret scan 并通过 |
| client / server tsc --noEmit | PASS，双方 exit 0 |
| root npm run test:unit | PASS，20 files / 211 tests |
| server npm run test:v2 | PASS，270/270；CANVAS_ASSET_DIR 指向 C:/Users/70208/AppData/Local/Temp/coincides-v2bn12-2b3-fix-assets 的 OS temp 实体目录。首次带递归清理的包装命令在测试启动前被执行策略拒绝，随后只改运行环境、不改测试或产品语义。 |
| test:tool-face-registry | PASS，4/4 |
| test:tool-face-manifest | PASS，10/10 |
| check:tool-face-manifest | PASS，inventory fresh，2 public tools |
| test:tool-face-parity | PASS，10/10 |
| check:tool-face-parity | PASS；仅为必要条件，human reachability 未申报 |
| server npm run test:trash-notes-tool | PASS，40/40 |
| git diff --check | PASS |

### 触及面与归复证明

- 本单永久触及仅两份测试文件与本 Result。测试 numstat：v2NotesListService.test.ts = 100/3；v2TrashNotesTool.test.ts = 48/0。
- git diff --numstat -- server/src/routes server/src/services 为空；两目录无 untracked；git diff --quiet HEAD -- server/src/routes server/src/services exit 0。
- git diff --quiet HEAD -- server/src 排除 server/src/__tests__ 后 exit 0。按字面执行 server/src 全目录 numstat 会列出上述两份获准测试，故不虚报“全目录为空”；排除测试后的产品码全空，且工单特别要求的 routes / services 为零改动。
- 产品 blob HEAD = worktree：toolReceipts.ts 5fe1c42080d3f6ec775448d396df4b9217295014；projections.ts 561902a449b50ce254b650de5a337973a8fbc26d；notes.ts 4e79067c1a72c55fe9d274439905cdbda5204a4e；toolFaceReceiptRevert.ts 74e4d2e94c28ffb075a6cb10b56dcc3288c8947b。
- 已知 porcelain 假阳性的 useNoteCanvasRuntimeController.ts 亦以 blob 判真：HEAD = worktree = 3efe5f820e2077850611b54d4d09482845e89545。
- 显式排除：未改任何产品码、schema / migration、b-2b-2、12.1 或 v1 其余线；未取锁、未写或删除 owner.json；未 commit、push 或切 main。
- 本文件保持 UTF-8，header 保持 ready，未由 builder 翻转。
