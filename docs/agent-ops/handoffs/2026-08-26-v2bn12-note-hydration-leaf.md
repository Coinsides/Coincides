> from: claude(opus,工程调度会话) | to: codex(builder) | status: draft(排 S4-3 之后;⚠️ 含一处对裁定的事实更正待 Fable 过目) | re: v2bn12-noteHydration | date: 2026-08-26

# V2.BN.12:`hydrateNote` / `hydrateBlock` 下沉为叶子模块

## 定位

`routes/notes.ts` 里的两个 hydrate helper 被 route 与 service 双方消费,而 `services/notes.ts` **反向 import 了 route**(TD-16 的 ESM 环)。本单把这对 helper 下沉为**叶子模块**,route 与 service 同时依赖叶子。

**授权链**:TD-16 明写「**正解是把两个 helper 下沉为叶子模块**……⚠️ **不在本单改** —— 下沉会触及同文件其他 route 的调用点,**属独立改动面**」。⇒ 它要的就是一张独立单,本单即是。Fable 2026-08-26 裁定采 (C) 并收紧边界。

## ⚠️ 一处必须先说清的事实更正(⛔ 不要按「环清掉」理解)

裁定原文有一句「(环清掉)」。**我发单前核过,本单收紧后的范围做不到清环**:

`services/notes.ts:3` 是 `import { getOwnedCourse, getOwnedNote, hydrateNote } from '../routes/notes.js';` —— **三个符号**,其中 `getOwnedNote` 用在 `:49`、`getOwnedCourse` 用在 `:116`。
⇒ 只搬 `hydrateNote` **只拆掉三条边里的一条**,环**仍然存在**。

**而那两个也不能顺手搬**,理由与裁定否掉 (A)(B) 时同源:
- `getOwnedCourse` **全仓五份同名实现、签名各异**(TD-15 点名),TD-15 明写「**收敛前提是先定权威签名**」;
- `getOwnedNote` **同病**:`services/annotationTruths.ts:238` 另有一份 `getOwnedNote(db, userId, noteId)`,与 route 版 `getOwnedNote(noteId, userId)` **参数顺序与签名都不同**。

⇒ **本单如实定位为:拆掉环的一条边,不是清环。** TD-16 **保持未清**,其剩余面收窄为「`getOwnedCourse` / `getOwnedNote` 两个 ownership helper,随 TD-15 的权威签名裁定一并处理」。
⛔ **回执与任何记录里不得写「TD-16 已清 / ESM 环已消除」**;只许写「hydrate 边已拆,ownership 两边仍在」。

## 交付物

### 1. 新建叶子模块 `server/src/services/noteHydration.ts`

- 把 `routes/notes.ts:88` 的 `hydrateNote` 与 `:95` 的 `hydrateBlock` **原样搬进来**并导出。
- 连带搬入它们**私有依赖**的 `parseJson`(`routes/notes.ts:37`)。
  ⭐ **发单方已预核(2026-08-26)**:该 `parseJson` 在 `routes/notes.ts` 内的消费者**只有这两个 hydrate 函数**(`:91` 在 `hydrateNote`;`:98`/`:99`/`:100`/`:101` 在 `hydrateBlock`),**无第三方消费者** ⇒ 它可以**整体随体搬走,route 侧零残留**,不会产生重复。
  ⚠️ **仍请你复核一遍**(行号不是免检金牌):**若你实测发现还有别的消费者**,则两侧各留一份就是新重复 ⇒ **停手写 `needs: claude`**,⛔ 别自行决定复制还是导出。
- **叶子约束**:该模块 ⛔ **不得 import 任何 `routes/**`**(它是叶子,这正是本单的点)。
- ⭐ **零语义**:函数体逐字节搬运,⛔ 不改行为、不改签名、不"顺手优化"、不加类型收紧。

### 2. 回接调用点

- `routes/notes.ts`:删掉两个本地定义,改为从叶子 import;**回接全部调用点** —— `hydrateNote` 三处(`:142` `:159` `:192`)、`hydrateBlock` 三处(`:280` `:307` `:394`)。⚠️ `hydrateNote` **原本是 `export` 的**:route 侧是否继续 re-export 由你按最小改动决定,但**必须保证既有外部 import 不断**。
- `services/notes.ts:3`:`hydrateNote` 的 import **改道到叶子**;⛔ **`getOwnedCourse` / `getOwnedNote` 两个保持原样从 route import**(见上文更正)。

### 3. ⛔ 明确不碰

- **`server/src/routes/noteBlocks.ts:37` 那份私有 `hydrateBlock` 副本,本单一个字节都不碰。**
  **理由(Fable 裁定原文之意)**:动它就是 TD-15 的收敛,而**两份副本从未验证过逐 token 等价,合并等于赌它们行为一致**;字节等价 killer 确实会抓住差异,但**让 killer 变红来发现范围划错了,不如一开始就不划进来**。
  ⭐ **若你顺路发现两份副本 token 级完全相同,请记进回执**(作为 TD-15 将来收敛的证据),**但仍然不动它**。
- ⛔ 不碰 `getOwnedCourse` / `getOwnedNote` 的任何定义或签名。
- ⛔ 不碰 `GET /:id/blocks` 那条 SQL、不碰任何 route 的业务逻辑。
- ⚠️ `GET /:id/blocks` 在 `hydrateBlock` **之后**还有一步 `source_references` 去 null 过滤(`routes/notes.ts:281-283`)—— **那一步留在 route 里不动**(它不是 hydrate 的一部分);⛔ 不要把它搬进叶子,也不要把它删掉。

## 必红判据

- **K-1(命门,字节等价)**:提取**前后**,以同一 fixture 对**六个受影响端点**的 REST 响应做**字节级比对**,必须逐位相同。至少覆盖:`GET /api/notes/:id`、`GET /api/notes/:id/blocks`、`POST /api/notes`(:142 路径)、`PUT /api/notes/:id`(:192 路径)、`POST /api/notes/:id/blocks`(:307/:394 路径中的至少一条)。
  **取法**:提取前先跑一遍存快照,提取后重跑比对(快照存 `.codex-tmp/`,⛔ 不入库)。
- **K-2(同源锁)**:把叶子里的 `hydrateNote` 改成返回 `{...row}`(去掉 `metadata: parseJson(...)`)⇒ **既有 note 相关测试必须红**;恢复后绿。**证明 route 与 service 走的是同一份实现**,不是各自的副本。
  ⭐ **发单方已预核该刀可行**:`server/src/__tests__/v2NotesListService.test.ts` 的字节基线断言里,`metadata` 是**已解析的对象**(`:102` `{ marker: 'newest', items: ['a','b'] }`、`:118` `{ marker: 'older', nested: { value: 1 } }`)⇒ 一旦 `hydrateNote` 不再 parse,该断言会拿到 JSON 字符串而变红。**这一刀有真实执行点,不是空指令。**
- **K-3(叶子性)**:在 `noteHydration.ts` 里加一行 `import '../routes/notes.js';` ⇒ 应当能观察到环重新出现(`madge`/`tsc` 或你能做干净的任一方式);⚠️ **若本仓没有现成的环检测机关,如实写「无机关可证,未做」,⛔ 不要为此新建检测工具**(那是另一张单)。
- 既有 `test:unit` / `test:v2` / `test:mcp-transport` / `test:tool-face-registry` / `test:tool-face-manifest` / `check:tool-face-manifest` / parity 两门 / 契约专项 全部复跑仍绿。

## 止损位(Fable 预置,免得翻车时现场议)

**若本单施工翻车**(字节等价拿不到 / 出现无法零语义搬运的纠缠):**停手**,并按下述退回 —— **S4-4 退回只做 `get_note`**(它用已导出的 `hydrateNote`,不依赖本单),**`list_note_blocks` 挂 TD 等本单重做**。⛔ 不要在本单里边打补丁边推进。

## 边界(触及面申报)

**允许**:`server/src/services/noteHydration.ts`(新建)· `server/src/routes/notes.ts`(**仅删两个定义 + 加 import + 回接六处调用点**)· `server/src/services/notes.ts`(**仅第 3 行 import 拆分改道**)· `docs/agent-ops/current-state/deferred-tests.md`(加一行台账)。

**禁区**:`server/src/routes/noteBlocks.ts` · `server/src/services/annotationTruths.ts` · 任何 `getOwnedCourse`/`getOwnedNote` 的定义 · 注册表 / binding / transport / manifest · `shared/` · 任何 migration/schema · 任何 tsconfig · `server/package.json` · 客户端全部 · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**三个:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` —— **判真用 `git hash-object --filters --path` 对 HEAD blob 比对,⛔ 不用 porcelain**。
- 📌 `server/dist/tool-face-manifest.json` 是 ignored 工件,不进 numstat;若你移动它,**收工前自己 `ls` 核对还原**。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。桌面应用识别 = **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`**;⛔ 不用整条命令行做子串匹配,⛔ 不按 PID 数字认。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若红在 `docs/agent-ops/INDEX.md` 过期 ⇒ **发单方的活**,如实记 exit 与原因,⛔ 不自己改 docs。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `test:mcp-transport` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest` → parity 两门 → 契约专项。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`:K-1 的**字节比对方法与结果**(六端点逐条)· K-2 红点原文与行号 · K-3(或其「无机关可证,未做」)· `parseJson` 的处置说明 · (若发现)`noteBlocks.ts` 那份副本的 token 级异同结论 · `git diff --numstat` 对照边界 · 显式范围排除 · **⛔ 不得声称 TD-16 已清**。

⏱ 预估 30–45 分钟。
