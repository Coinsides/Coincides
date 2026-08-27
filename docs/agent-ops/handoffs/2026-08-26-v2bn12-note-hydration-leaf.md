> from: claude(opus,工程调度会话) | to: codex(builder) | status: done | re: v2bn12-noteHydration | date: 2026-08-26

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

## Result

**结论**：已把 `parseJson`、`hydrateNote`、`hydrateBlock` 零语义下沉到 `server/src/services/noteHydration.ts`，route 保留 `hydrateNote` re-export，`services/notes.ts` 的 hydrate import 已改道叶子。**只拆掉了 hydrate 这一条边；`getOwnedCourse` / `getOwnedNote` 两条 ownership import 仍从 route 进入 service，ownership 两边仍在，TD-16 保持未清，ESM 环仍存在。**

### 实现与边界

- `parseJson` 在提取前的 route 内只有两个 hydrate 消费者；它随体搬入叶子，route 侧零残留、无第二份副本。AST 对 HEAD 原实现与叶子逐函数比较，`parseJson` / `hydrateNote` / `hydrateBlock` 的签名与函数体三项均相等。
- `server/src/routes/notes.ts` 只增加叶子 import + `hydrateNote` re-export，并删除原三项定义；六个既有调用点不改业务逻辑。
- `server/src/services/notes.ts` 只拆分 import：`hydrateNote` 从叶子导入，`getOwnedCourse` / `getOwnedNote` 仍从 route 导入。
- `GET /:id/blocks` 的 `source_references` 去 null 过滤仍原位留在 route 的 hydrate 后处理，未移入叶子、未删除；其 SQL 未动。
- 叶子对 `routes/**` 的 import 数为 0。
- `server/src/routes/noteBlocks.ts` 私有 `hydrateBlock` **不是 token 级相同**：去掉新叶子的 `export` modifier 后，叶子 64 tokens、私有副本 40 tokens；首个实质差异是叶子继续处理 `display_overrides_json` / `source_references`，私有副本在 `metadata` 后结束。按禁区要求一个字节未动该文件。

### K-1：六端点原始响应字节等价

方法：在 `.codex-tmp/note-hydration-k1.ts` 用同一确定性 SQLite fixture；在动态 import route 前冻结 `globalThis.Date` 与 `node:crypto.randomUUID`，每相位重建同一 fixture，以 `response.arrayBuffer()` 捕获原始 body bytes，并保存 status、相关 headers、长度、SHA-256、hex 到：

- 提取前：`.codex-tmp/note-hydration-k1-before.json`
- 提取后：`.codex-tmp/note-hydration-k1-after.json`

两份证物各 14,787 bytes，整文件 SHA-256 均为 `1a18640b84b0b1ea4708805129dbcc06f30f2b834b47ade72b82f2c0a438d8fa`，二进制比较 `True`。POST block 取普通创建分支（原调用点 `:394`）。GET blocks fixture 另显式断言无 source 行经 route 过滤后为 `source_references: []`。

| 端点 | status 前/后 | body bytes 前/后 | body SHA-256（前后相同） | 逐字节 |
|---|---:|---:|---|---|
| `GET /api/notes?course_id=…` | 200 / 200 | 471 / 471 | `f9f0b9a358ac0e2cdc7a96e7551399f8f0dc46d4a1c8f3fa989407a0d95742a9` | 相同 |
| `POST /api/notes` | 201 / 201 | 509 / 509 | `e440bf3eecaa9c2679c02cf677d3ac1ffcbbdb9b24a2314b867a29cb856db060` | 相同 |
| `GET /api/notes/:id` | 200 / 200 | 469 / 469 | `17238274a10f6f200119bbdcf9d52542df3366eb6de23bf904293ff0de9f7f2b` | 相同 |
| `PUT /api/notes/:id` | 200 / 200 | 476 / 476 | `9653af7c18c1f972489d0d0102ae1ec900382aaed0bad50b3d7aa5a856de1236` | 相同 |
| `GET /api/notes/:id/blocks` | 200 / 200 | 792 / 792 | `b025fc87d9eee37c0e590b0873cdb4a43073810b657d95803b227d94e632039e` | 相同 |
| `POST /api/notes/:id/blocks` | 201 / 201 | 1118 / 1118 | `64c5c51b96118dfb736b8ac9abb0ab4eb9679e3cf2e4e2ddfc3fe4e4c6fddb67` | 相同 |

### K-2：同源锁 mutation

施刀前 server `tsc --noEmit` exit 0；临时去掉叶子 `hydrateNote` 的 `metadata: parseJson(...)` 后，mutation 树再次 `tsc --noEmit` exit 0，排除语法/类型破坏。随后单跑 `node --import tsx --test src/__tests__/v2NotesListService.test.ts`，exit 1，真实红点原文：

```text
not ok 6 - A-3 GET /api/notes keeps the pre-extraction response bytes, default status, hydrate mapping, and DESC order
error: Expected values to be strictly deep-equal:
+ Buffer(903) [Uint8Array]
- Buffer(881) [Uint8Array]
stack: v2NotesListService.test.ts:705:12
```

恢复原函数后，server `tsc --noEmit` exit 0；同一专项 exit 0，7/7 通过。

### K-3：叶子性 mutation

**无现成机关可证，未做。** 根 / client / server package 文件中无 madge、dependency-cruiser、dpdm 或同类环检测门；`tsc` 不提供可鉴别的环判定，且 ownership 环本来仍存在，观察到「任意环」不能证明临时 import 新增的那条边。按工单未新建检测工具。缺口已追加到 `docs/agent-ops/current-state/deferred-tests.md`。

### 验证

按 docs-first 顺序执行；`v2TestV2ManifestHook.test.ts` 只经 `npm run test:v2` 启动，未独跑。server 全套设置独立 `CANVAS_ASSET_DIR`。

| 门 | 结果 |
|---|---|
| `npm.cmd run docs:check` | exit 0 |
| client `tsc --noEmit` | exit 0 |
| server `tsc --noEmit` | exit 0 |
| `npm.cmd run test:unit` | exit 0；22 files / 222 tests |
| server `npm.cmd run test:v2`（隔离资产目录） | exit 0；279/279 |
| server `npm.cmd run test:mcp-transport` | exit 0；46/46 |
| `npm.cmd run test:tool-face-registry` | exit 0；5/5 |
| `npm.cmd run test:tool-face-manifest` | exit 0；10/10 |
| `npm.cmd run check:tool-face-manifest` | exit 0；12 public entries，未过期 |
| `npm.cmd run test:tool-face-parity` | exit 0；10/10 |
| `npm.cmd run check:tool-face-parity` | exit 0；12 public entries |
| `node --import tsx --test src/__tests__/textFlowIdentityContract.test.ts` | exit 0；4/4 |
| `node --import tsx --test src/__tests__/v2NotesListService.test.ts` | exit 0；7/7 |
| `git diff --check` | exit 0 |
| 回执写入后 `docs:check` 复跑 | `POST_RECEIPT_DOCS_EXIT=0` |

`server/dist/tool-face-manifest.json` 未移动，收工核对存在；其 SHA-256 与 `docs/generated/tool-face-manifest.json` 同为 `87b40ac34cf31361f818cd9bcf1a354479fa1829ef4e746f7e4e82a841dc6616`。

### `git diff --numstat` 与范围排除

| 文件 | 最终 numstat / 说明 |
|---|---|
| `docs/agent-ops/current-state/deferred-tests.md` | `1 0` |
| `docs/agent-ops/handoffs/2026-08-26-v2bn12-note-hydration-leaf.md` | `NUMSTAT_HANDOFF_ADD=88 DEL=1` |
| `server/src/routes/notes.ts` | `3 26` |
| `server/src/services/notes.ts` | `2 1` |
| `server/src/services/noteHydration.ts` | untracked 新文件，`git diff --numstat` 不枚举；25 lines |

三个已知 EOL porcelain `M` 经 `git hash-object --filters --path` 复核仍逐个等于 HEAD blob；它们不出现在真实 numstat。`.claude/settings.local.json` 为既有他人未跟踪文件，未碰。

显式未碰：`server/src/routes/noteBlocks.ts`、`server/src/services/annotationTruths.ts`、任何 `getOwnedCourse` / `getOwnedNote` 定义或签名、blocks SQL 与 route 业务逻辑、注册表 / binding / transport / tracked manifest、`shared/`、migration/schema、tsconfig、`server/package.json`、client、`.claude/**`、其他 handoff/analysis 文档。未 commit、未 push、未碰 main；未取/删/改写 `.codex-tmp/builder.lock.d`，未杀任何 Codex 进程。

## Review

> reviewer: claude(opus,工程调度会话) | date: 2026-08-27 | verdict: **PASS 0/0/0/0**

### 1. 收工判定(两条并用)

进程 `35464` **消失** ∧ **交付物出现**(新建 `server/src/services/noteHydration.ts` · `routes/notes.ts` +3/−26 · `services/notes.ts` +2/−1)。

### 2. 位点复核(⭐ 亲手施刀,不吃回执)

| 位点 | 复核方验证 | 结果 |
|---|---|---|
| **叶子纯净** | `grep -c "routes/" server/src/services/noteHydration.ts` | **0** —— 且该文件**一个 import 都没有**,是真叶子 |
| **`parseJson` 随体搬走** | 读文件 | 三个函数(`parseJson` / `hydrateNote` / `hydrateBlock`)都在叶子里,**route 侧零残留**,未产生第二份副本 |
| ⭐ **去 null 过滤留在 route** | `grep -n "filter" routes/notes.ts` | **`:258`** `hydrated.source_references = hydrated.source_references.filter(...)` —— **仍在 route,未搬进叶子、未删除**,与工单要求一致 |
| **import 拆分** | 读 `services/notes.ts:1-5` | `hydrateNote` 来自 `./noteHydration.js`;**`getOwnedCourse` / `getOwnedNote` 仍来自 `../routes/notes.js`** ⇒ **环仍在,与申报一致** |
| ⭐ **K-2 同源锁(复核方亲施)** | 去掉叶子 `hydrateNote` 的 `metadata: parseJson(...)`;⭐ **先跑 `tsc --noEmit` 证 mutation 自身 exit 0** | **红在** `v2NotesListService.test.ts:705`,`A-3 GET /api/notes keeps the pre-extraction response bytes …`,`Buffer(903)` vs `Buffer(881)` —— **两个字节数与回执自述逐字相同**。⇒ 证明 **route 与 service 走的是同一份 hydrate**,不是各自副本 |
| **还原保真** | sha256 对照 | 叶子与备份**逐位相同**;`v2NotesListService` **7/7**、`test:mcp-transport` **46/46**(复核方自跑) |

### 3. ⭐ 本轮最值钱的三处(记功)

1. **K-1 的取证方法是本项目迄今最强的字节等价**:
   - 用 `response.arrayBuffer()` 抓**原始 body bytes**(不是 JSON 再序列化);
   - ⭐ **冻结 `globalThis.Date` 与 `node:crypto.randomUUID`** 使响应确定性可比 —— 否则时间戳/uuid 会让「字节等价」永远失败或需要豁免字段,**豁免字段正是这类比对最容易被掏空的地方**;
   - 六端点前后两份证物**整文件 SHA-256 相同**(`1a18640b…38d8fa`,各 14,787 B),另附逐端点 status / 长度 / body SHA-256;
   - **fixture 特意覆盖了「无 source 行 ⇒ `source_references: []`」** —— 即工单点名的那步过滤,没让它落进覆盖盲区。
2. ⭐ **K-3 它没做,理由比我写的更准**:我在单里允许「无机关可证则如实写未做」,它照做了,**并补了一层我没想到的**——「**ownership 环本来就还在,观察到『任意环』不能证明临时 import 新增的那条边**」。⇒ 即便装了环检测工具,那把刀**在当前状态下也是钝的**。缺口已入 `deferred-tests.md`。
3. ⭐ **`noteBlocks.ts` 私有副本:实测 token 级不同** —— 叶子 64 tokens vs 私有副本 40 tokens,首个实质差异是**私有副本在 `metadata` 之后就结束了**(不处理 `display_overrides_json` / `source_references`)。
   ⚠️ **这条追溯验证了把它排除在外的裁定是对的**:若当初顺手合并,**合的是两个行为不同的函数**,而合并动作本身不会立刻报错。⇒ 「**两份副本没验证过逐 token 等价,合并等于赌它们行为一致**」这句从**推断**变成了**实证**。⛔ 该文件一个字节未动。

### 4. 申报诚实性

- **⛔ 未声称 TD-16 已清**:结论段第一句就写明「**只拆掉 hydrate 这一条边;ownership 两边仍在,TD-16 保持未清,ESM 环仍存在**」。
- 边界零越界:禁区文件(`noteBlocks.ts` / `annotationTruths.ts` / ownership 定义)**全部零 diff**。
- `v2TestV2ManifestHook.test.ts` **只经 `npm run test:v2` 启动,未独跑** —— 我在提示词里给的那条提醒被照做了。

### 5. 结论

**PASS 0/0/0/0**。**TD-16 剩余面**(`getOwnedCourse` / `getOwnedNote`,随 TD-15 权威签名裁定)按收口批第 8 项改写;⛔ 改写时不得标清。
⇒ **S4-4 的硬依赖已满足**:`server/src/services/noteHydration.ts` 存在且导出 `hydrateNote` / `hydrateBlock`。
