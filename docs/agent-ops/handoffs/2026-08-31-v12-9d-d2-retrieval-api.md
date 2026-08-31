> **状态 (Status)**: ready(顶班调度按总部 2026-08-31 续办令翻牌;裁定出处:骨架 §一.3/§五 + 总部当日续办令;不代表 Henry 逐张批过)
> **from**: claude(fable5,顶班调度会话 bc871bf7) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31 续办令「d-2(检索 API + 水合)——12.9d 收官件,c-3 触发器开门件」。⛔ **不是 Henry。**
> **上游**: `handoffs/2026-08-31-v12-9d-d1b-embedding-pipeline.md`(⭐ 先读,110 向量已落库)· `handoffs/plans/v12-9d-retrieval-foundation-skeleton.md` §一.3/§五 · `handoffs/2026-08-31-v12-9d-d1a-corpus-seed.md`(四卷 imprint 身份)

# d-2:最小检索 API + 经锚水合(⛔ 不做 UI;c-3 开门件)

## 0. ⛔⛔ 先读这七句

1. **⛔ 新代码零 join 旧代表**:`documents` / `document_chunks` / `doc_chunk_vec` / `agent_memories` / `agent_memory_vec` 一概不碰不读不 join。旧代检索机关(`embedding/index.ts` / `vectorStore.ts` / `voyage.ts` / `routes/embedding.ts` / `routes/documents.ts`)一根手指不碰。
2. **水合唯一路径 = `getImprintFragmentsByAnchor`**(`server/src/services/sourceImprints.ts:898`,签名 `(db, userId, imprintId, query)`)。⭐ 它落地为生产读者之日 = c-3 触发器开门之时。⛔ **`sourceImprints.ts` 本身零 diff** —— 只 import 只调用。
3. **KNN 复用 `searchImprintFragmentVectors`**(`server/src/services/imprintEmbedding.ts`,d-1b 已过隔离判据)。⛔ 不新写 KNN SQL,⛔ 不改 `imprintEmbedding.ts` / `dashscope.ts` / 迁移 052。
4. **query 嵌入走 `createDashScopeEmbeddingProvider`**,endpoint 已是国际站常量。⛔ key 值零出境:任何输出只许申报存在性与长度,出现片段即本单作废。
5. **⚠️ 会真花钱,只在走查脚本**:硬上限 **≤10 次 API 调用、≤5,000 输入字符**(query 文本很短,3 条走查 query ≈ 3 次调用)。**测试零真实调用**(一律 fake provider)。超限停线。
6. **⛔ FTS / UI / 识别器引用模式 / 引用校验闸 / 粒度升级 / 嵌入终选,一概不进本单。**
7. **⛔ `D:/Coinsides/v12.9-selection/**` 与 `~/.codex/sessions` 全程不碰。**

## 1. 允许面(⛔ 只这些)

- **新建** `server/src/services/imprintRetrieval.ts`(检索服务:embed query → KNN → 归属过滤 → 经门水合)
- **新建** `server/src/routes/imprintRetrieval.ts`(薄路由:解析入参 → 调服务 → res.json;范式出处见 §2.6)
- **修改** `server/src/index.ts`(⭐ **只许净增 2 行**:1 行 import + 1 行 `app.use('/api/imprint-retrieval', authMiddleware, …)`;机械判据 `git diff --numstat -- server/src/index.ts` = `2 0`)
- **新建** `server/src/__tests__/v2ImprintRetrieval.test.ts`
- **修改** `server/package.json`(⭐ 仅 `test:v2` 列表挂新测试文件;⛔ 不改依赖)
- **新建** `scripts/query-imprint-fragments.mjs`(走查脚本;⚠️ 从 server 目录以 `node --env-file=.env --import tsx ../scripts/query-imprint-fragments.mjs "<query>"` 运行 —— d-1b 续跑已证仓库根解析不到 tsx)
- **新建** `docs/agent-ops/analysis/2026-08-31-v12-9d-d2-retrieval-walkthrough.md`(走查报告)
- **追加**:本单 `## Result`

⛔ **禁区(零 diff 自证)**:`server/src/services/sourceImprints.ts` · `server/src/services/imprintEmbedding.ts` · `server/src/embedding/dashscope.ts` · `server/src/db/init.ts` · `server/src/db/migrations/**` · `server/src/embedding/index.ts` · `server/src/embedding/vectorStore.ts` · `server/src/embedding/voyage.ts` · `server/src/routes/embedding.ts` · `server/src/routes/documents.ts` · `server/src/agent/**` · `client/src/**` · `.env` · `.env.experiment` · `docs/agent-ops/current-state/**` · `docs/agent-ops/handoffs/plans/**`
⚠️ 根 `package.json` 亦禁区(闸对根级文件有盲区,此项人工核过)。

## 2. 设计要点(⭐ 侦察已验连接,写成动作)

服务函数形态(名字可调,职责不可调):`retrieveImprintFragments(db, userId, { query, k, provider? })`:

1. **embed**:`provider.embed([query])` 得 1024 维查询向量(1 次调用;provider 可注入以便测试 fake);
2. **KNN**:`searchImprintFragmentVectors(db, { modelId: provider.modelId, dimensions, embedding, limit: min(k*5, 100) })` —— 超采样是因为 vec 表无 user_id,归属过滤在下一步;
3. **归属过滤(数据归属=功能判据)**:命中的 `fragmentId` join `imprint_fragments → source_imprints(user_id) → source_files`,**只保留 `source_imprints.user_id = userId` 的行**,截取前 k 条;⚠️ 此 join 的 SELECT **⛔ 不得投影 `imprint_fragments.text`** —— 文本只许经门取(见 4);
4. **经门水合**:对每条保留命中,取其 `anchor_json` 解析为锚,调 `getImprintFragmentsByAnchor(db, userId, imprint_id, { match: 'exact', anchor })`,从返回集中按 fragment id 取本体,并记 `anchor_match_count`(同锚碎片数)。⛔ 命中不在自己锚的水合结果里 = 抛错,不静默丢;
5. **响应每条含**(K-1 出处链):`fragment`(id/seq/role/text/anchor/lang)· `imprint`(id/transcriber_name/transcriber_version/transcriber_lockfile_hash/anchor_fidelity/text_normalization)· `source_file`(id/original_filename/content_hash)· `retrieval`(model_id/distance/anchor_match_count)。
6. 路由:`POST /api/imprint-retrieval/query`,body `{ query: string, k?: number }`,k 默认 5、限 1..20,空 query 400。路由文件范式(`AuthRequest` + `getDb()` + 薄转发)照现役 source 系路由(如 sourceBoards 那只)写,⛔ 但那些文件本身在禁区之外也不许改——引用只为范式。

## 3. 判据(⭐ 全部机械可核)

### K-1 ⭐⭐ 出处链完整

测试用真链种子(或 in-memory 全套表)断言:每条命中的上述四组字段**逐个非空且与种子一致**(lockfile_hash 与 content_hash 逐字节)。⛔ 任何字段以 `null`/占位冒充 = 红。

### K-2 ⭐⭐⭐ 锚可复放 & 水合走门

1. **结构判据**:`imprintRetrieval.ts` 自己的 SQL **不得出现 `text` 投影**(`grep -n "text" server/src/services/imprintRetrieval.ts` 里只允许出现在类型/响应组装,不允许在 SELECT 列表);文本唯一来源 = `getImprintFragmentsByAnchor` 返回集。
2. **复放测试**:种子造**同一 exact 锚下两个碎片**;检索命中其一;断言水合结果含命中本体、`anchor_match_count = 2`——只有走门才能得到同锚集合,这条测试红/绿直接判定门是否真是水合路径。
3. **复放失败必炸测试**:构造锚不匹配情形(如篡改内存中锚后调用内部水合函数,或直接断言服务对孤儿收据抛错),断言抛 `retrieval` 族错误而非静默返回。

### K-3 ⭐⭐ 双重过滤(中性措辞:功能性数据过滤)

1. **model_id**:两个 model 各存向量,B 组与查询向量**严格更近**;按 A 检索,断言只返回 A 组(沿用 d-1b 测试家族的构造法)。
2. **数据归属**:两个用户各有碎片与向量,用户 B 的向量与查询**严格更近**;以用户 A 身份检索,断言结果只含 A 拥有的碎片,且在超采样窗口内仍补足 k(或如实断言返回数 < k 的申报行为)。

### K-4 预算台账

走查脚本回执报:实际调用次数 · 实际输入字符数 · 每条 query 原文。⛔ 上限 10 次 / 5,000 字符,超限停线。测试断言 fake provider 每次检索恰好 1 次 embed 调用。

### K-5 ⭐⭐⭐ 硬声明(逐字沿用)

走查报告须**逐字**含:**「本轮检索质量只代表 page 级地板上的检索质量,⛔ 不代表本产品的检索质量。」**
并沿用粒度事实:同四卷 MinerU 侧 **808** 碎片 vs 本代 **110**,**7.35 倍**;`role` 分布 `para` 110 / `heading` 0。

### K-6 ⛔ 声明本单没做什么

至少:UI · 识别器引用模式与引用校验闸(c-3 的肉,门开后另单)· FTS 半边 · 粒度升级(切 MinerU 默认路径永远是显式单)· 嵌入模型终选(延 V14)· HTTP 全链路端到端测试(走查脚本走 in-process 服务路径,路由为薄壳)· 跨库语境(V14)。

### K-7 门禁与禁区

`npm --prefix server run test:v2`(基线 **358/358**;本单会增,报增量与新总数)· `npm exec --prefix server -- tsc --noEmit -p server` · `npm run docs:check` · 禁区逐一 `git diff --quiet` 贴 exit code · `git diff --numstat -- server/src/index.ts` 贴原文(须 `2 0`)。
⚠️ `server/src/routes/projections.ts` 有开工前即存在的 EOL 状态噪音(` M` 但零内容 diff),⛔ 不许触碰。

## 4. 走查(报告内容义务)

从 server 目录以既有账号(d-1a 申报的 dev 账号,⛔ 不打印凭证)跑 **3 条英文短 query**(雅思语料相关,如 "academic reading passage about ..."),每条展示 top-3 命中的**完整出处链四组字段**与 distance;报告附:每条 query 的调用与字符台账合计、K-5 硬声明、K-6 清单。数字与字段值**来自脚本实际输出**,⛔ 不得手编。

## 5. 通用纪律(沿 d-1b,全文有效)

- **搜索纪律**:先 cd 仓库根;仓内相对路径;⛔ 裸盘符不入搜索命令;⛔ PowerShell 反引号续行;输出现仓外路径即停线上报。唯一仓外例外:走查命令里 `--env-file=.env` 由 node 自读,⛔ 不许 cat/grep 它。
- **回执 UTF-8**:`## Result` 用 node `fs.appendFileSync(p, s, 'utf8')` 追加,⛔ 不用 PowerShell `>>`/`Out-File`。
- ⛔ 不 commit 不 push(提交归调度方);⛔ 不翻状态头;⛔ 不改 `.claude/**`、`AGENTS.md`、`CLAUDE.md`;锁非你所有(`.codex-tmp/builder.lock.d` 调度方持有,⛔ 不取不覆盖不删)。
- 遇本单字面自相矛盾或允许面不够:⛔ 不猜不自行撑开,摊开事实标 `needs: dispatcher` 停线交回。

## 6. 回执(`## Result`)

K-1 字段清单与测试名 · K-2 三条(结构判据 grep 原文/复放测试名与断言/必炸测试名)· K-3 两条测试名与构造 · K-4 台账 · K-5 声明位置 · K-6 清单 · K-7 五项(含 numstat 原文)· 走查报告路径 · 任何停线点。


## Result

**needs: dispatcher ? docs ?????????,????,????**

### ????

npm run docs:check exit 1,????? docs/agent-ops/INDEX.md ??,???????? node scripts/docs-index.mjs??????? docs/agent-ops/INDEX.md,??? ?1 ?????? ???????????????;???????? analysis ????,???????????????????????? K-7?docs:check ????????????? ?5 ??????????,?????

### ?????????

- ????????????fake-provider ???????,??????server/src/index.ts numstat ??? 2 0 server/src/index.ts?
- K-1/K-2/K-3 ?????? 4/4 ??;npm --prefix server run test:v2 exit 0,tests 362 / pass 362 / fail 0 / skipped 0,?? 358/358 ?? +4?
- npm exec --prefix server -- tsc --noEmit -p server exit 0,????
- K-2 ?? grep ? text ???????????;?? SQL ??? imprint_fragments.text,???? getImprintFragmentsByAnchor?
- ???????;?? API ?? 0,?????? 0,?????????????,K-5/K-6 ?????,???????????
- ? commit?? push??????;??????????????????


## Result (UTF-8 correction; authoritative continuation)

**needs: dispatcher ? stopped because the allowed file surface is insufficient; work is not complete.**

The preceding Result block was appended with fs.appendFileSync(..., utf8), but the PowerShell-to-Node stdin transport replaced its non-ASCII characters with question marks before Node received them. Append-only discipline leaves that malformed block in place. This ASCII continuation is valid UTF-8 and is the authoritative stop receipt.

### Blocking fact

npm run docs:check exited 1. Its only failure was: docs/agent-ops/INDEX.md is stale; the checker instructs running node scripts/docs-index.mjs. That repair modifies docs/agent-ops/INDEX.md, which is absent from the work order section 1 closed allow-list. The still-required new analysis walkthrough report would also create an index update obligation. Therefore the closed allow-list and K-7 docs:check success cannot both be satisfied. Section 5 says not to guess or expand the surface, so work stopped.

### Completed work that is not represented as closeout

- Added the retrieval service, thin route, fake-provider tests, walkthrough script, and route mount. server/src/index.ts numstat is exactly: 2 0 server/src/index.ts.
- The four new K-1/K-2/K-3 tests pass. npm --prefix server run test:v2 exited 0 with tests 362, pass 362, fail 0, skipped 0: +4 from the 358/358 baseline.
- npm exec --prefix server -- tsc --noEmit -p server exited 0 with no output.
- The K-2 structural grep finds text only in types and response assembly. The ownership SQL does not project imprint_fragments.text. Hydration calls getImprintFragmentsByAnchor.
- The real walkthrough was not run. Actual API calls: 0. Actual input characters: 0. No budget was consumed. The walkthrough report, K-5 statement, K-6 report section, and final forbidden-path audit remain undone.
- No commit, push, status-header change, lock operation, credential-value output, evidence-tree access, or session-record access occurred.


## Result(续跑二段,2026-08-31)

**结论：完成，无新增停线点。乱码 `## Result` 段不作判据，前一 ASCII 停线更正段仅记录当时停线事实；以本续跑二段为最终权威回执。**

调度方已裁定 INDEX/inventory 重生成归调度方，并把 K-7 文档门口径改为「报告前应绿；报告后如实申报仅因新 analysis 文档未入 INDEX 而红」。本段按该裁定续跑，未修改 `docs/agent-ops/INDEX.md` 或 `docs/generated/object-inventory.md`；当前两者的工作树修改由调度方持有。

完整走查报告：`docs/agent-ops/analysis/2026-08-31-v12-9d-d2-retrieval-walkthrough.md`。

### K-1 · 完整出处链

测试 `K-1 complete provenance chain is returned and K-2 exact-anchor replay counts siblings` 逐字段断言：

- `fragment`：`id / seq / role / text / anchor / lang`；
- `imprint`：`id / transcriber_name / transcriber_version / transcriber_lockfile_hash / anchor_fidelity / text_normalization`；
- `source_file`：`id / original_filename / content_hash`；
- `retrieval`：`model_id / distance / anchor_match_count`。

测试对 64-hex `transcriber_lockfile_hash` 与 `content_hash` 逐字相等，并遍历四组字段断言没有 `null` 冒充（契约允许的 `fragment.lang` fixture 明确为 `en`）。真实走查 9 条结果也全部带上述四组字段。

### K-2 · 锚复放与唯一路径

1. 结构判据 `rg -n "text" server/src/services/imprintRetrieval.ts` 原文：

```text
40:  text_normalization: SourceImprintTextNormalization;
57:    text: string;
67:    text_normalization: SourceImprintTextNormalization;
184:      text: fragment.text,
206:      text_normalization: match.ownership.text_normalization,
```

命中只在类型与响应组装；归属 SQL 未投影 `imprint_fragments.text`。生产文本唯一来自对 `getImprintFragmentsByAnchor` 的调用；`sourceImprints.ts` 零 diff。

2. 复放测试 `K-1 complete provenance chain is returned and K-2 exact-anchor replay counts siblings` 在同一 exact page 锚下造两个碎片、只给其中一个向量；断言命中本体完整返回且 `anchor_match_count === 2`。
3. 必炸测试 `K-2 orphaned anchor replay throws a retrieval hydration error instead of dropping the hit` 篡改内存 match 锚为不存在的 page 999；断言抛 `ImprintRetrievalError`、`code === 'hydration_failed'`，且 message 命中 `absent from its anchor replay`，没有静默丢弃。

### K-3 · 双重功能过滤

1. `K-3 model_id filtering excludes a strictly closer vector from another model`：MODEL_A 存 unit-0，MODEL_B 存与 query 相同的 unit-1（B 严格更近）；provider 身份为 A。断言只返回 A、`model_id === MODEL_A`，B 不在结果中。KNN 只调用既有 `searchImprintFragmentVectors`；`imprintEmbedding.ts` 零 diff。
2. `K-3 ownership filtering discards a closer foreign hit and oversampling replenishes k`：用户 B 向量与 query 相同，用户 A 向量严格更远；以 A、`k=1` 检索。`k*5` 超采样窗口先含 B 与 A，归属过滤丢 B 后仍补足 1 条 A；断言 fragment 与 source_file 均属于 A。

所有检索测试均注入 fake provider；每次服务检索断言恰好一次 `embed([query])`，测试零真实 API 调用。

### K-4 · 真实走查预算

从 `server` 目录按指定命令运行：

| query 原文 | API 调用 | 输入字符 | 返回 |
|---|---:|---:|---:|
| `academic reading passage about climate and scientific research` | 1 | 62 | top-3 |
| `IELTS writing task about charts and population change` | 1 | 53 | top-3 |
| `listening test conversation about university study` | 1 | 50 | top-3 |
| **合计** | **3** | **165** | **9 条** |

实际重试 0 次；未触发 10 次 / 5,000 字符硬上限。凭证只申报存在与有效长度 116，未输出任何 key 值或片段。

### K-5 · 粒度硬声明

走查报告 `K-5 · 粒度边界` 已逐字写入：

「本轮检索质量只代表 page 级地板上的检索质量,⛔ 不代表本产品的检索质量。」

同节记录：同四卷 MinerU 侧 808 碎片 vs 本代 110，7.35 倍；`role` 分布 `para` 110 / `heading` 0。

### K-6 · 本单没有做

- UI：未做。
- 识别器引用模式与引用校验闸：未做；归 c-3 另单。
- FTS 半边：未做。
- 粒度升级：未做；切 MinerU 默认路径仍须独立显式工单。
- 嵌入模型终选：未做，延 V14。
- HTTP 全链路端到端测试：未做；走查走 in-process 服务路径，路由为薄壳。
- 跨库语境：未做，延 V14。

### K-7 · 门禁、禁区与 numstat

1. `npm --prefix server run test:v2`：exit 0；tests **362** / pass **362** / fail 0 / skipped 0。相对 358/358 基线增量 **+4**。
2. `npm exec --prefix server -- tsc --noEmit -p server`：exit 0，无输出。
3. `npm run docs:check`：走查报告创建前 exit 0；报告创建后 exit 1，且唯一原因为新增 `docs/agent-ops/analysis/2026-08-31-v12-9d-d2-retrieval-walkthrough.md` 尚未进入 `docs/agent-ops/INDEX.md`。按调度方续跑裁定，重生成归调度方；本次未碰 INDEX/inventory。
4. 禁区逐项 `git diff --quiet -- <path>`：

| 禁区 | exit code |
|---|---:|
| `server/src/services/sourceImprints.ts` | 0 |
| `server/src/services/imprintEmbedding.ts` | 0 |
| `server/src/embedding/dashscope.ts` | 0 |
| `server/src/db/init.ts` | 0 |
| `server/src/db/migrations` | 0 |
| `server/src/embedding/index.ts` | 0 |
| `server/src/embedding/vectorStore.ts` | 0 |
| `server/src/embedding/voyage.ts` | 0 |
| `server/src/routes/embedding.ts` | 0 |
| `server/src/routes/documents.ts` | 0 |
| `server/src/agent` | 0 |
| `client/src` | 0 |
| `.env` | 0 |
| `.env.experiment` | 0 |
| `docs/agent-ops/current-state` | 0 |
| `docs/agent-ops/handoffs/plans` | 0 |
| 根 `package.json` | 0 |
| `server/src/routes/projections.ts`（开工前 EOL 噪音，内容 diff） | 0 |

5. `git diff --numstat -- server/src/index.ts` 原文：

```text
2	0	server/src/index.ts
```

`git diff --check` exit 0。未 commit、未 push、未翻状态头；未碰锁、证据树或会话记录。
