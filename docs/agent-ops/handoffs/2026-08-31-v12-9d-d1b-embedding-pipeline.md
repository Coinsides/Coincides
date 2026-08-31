> **状态 (Status)**: done(2026-08-31 总部翻牌:K 判据全绿+门禁全过,e8ea3c4 已提交;历程=首派凭证事件作废停线 → 二派崩机死于半程(遗产 5 件代码面全绿)→ 续跑段完成运行时半程收工)
> **from**: claude(opus,工程调度会话 coincides-8b) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31「照准,一字不改派 d-1b」。⛔ **不是 Henry。**
> **上游**: `handoffs/2026-08-31-v12-9d-d1a-corpus-seed.md`(⭐ 先读,含复核批注与粒度发现)· `analysis/2026-08-31-v12-9d-d0-provider-smoke.md`(⭐ 含 endpoint 实测)

# d-1b:新代向量表 + 嵌入工序(⛔ 只到"存得下",检索 API 归 d-2)

## 0. ⛔⛔ 先读这七句

1. **⛔ 新代码零 join 旧代表。** `documents` / `document_chunks` / `doc_chunk_vec` / `agent_memories` / `agent_memory_vec` **一概不碰、不读、不 join**。两代并存期各查各的。
2. **⛔ 旧代 Voyage 机关一根手指不碰**:`embedding/index.ts` 的 `getEmbeddingProvider`、`embedding/vectorStore.ts`、`embedding/voyage.ts`、`routes/embedding.ts` **全在禁区**。新代要 provider 就**新写一个**,⛔ 不许改旧代那道门。
3. **endpoint 是常量,写死为国际站**:`https://dashscope-intl.aliyuncs.com/compatible-mode/v1/embeddings`。⭐ 这有 d-0 实测背书(北京域名同 key 同 payload 返 **401**,国际站返 **200 / 1024 维**)。
4. **⛔ FTS 半边不进本单。** 只做 KNN 所需的向量落库。
5. **⚠️ 会真花钱。硬上限:累计 ≤ 30 次 API 调用、≤ 150,000 输入字符。** 超限即停线上报,⛔ 不许"再跑一轮补齐"。(现存语料 110 碎片 / 114,066 字符,批量调用下远低于此上限。)
6. **⛔ key 值零出境**:日志 / 回执 / 报告 / 报错栈一律不许出现任何片段。只许申报存在与长度。出现即本单作废。
7. **⛔ `D:/Coinsides/v12.9-selection/**` 只读,本单根本不需要碰它。**

## 1. 允许面(⛔ 只这些)

- **新建** `server/src/db/migrations/052_v2_imprint_fragment_vectors.ts`
- **新建** `server/src/embedding/dashscope.ts`(新代 provider,⛔ 独立于旧代 provider 选择)
- **新建** `server/src/services/imprintEmbedding.ts`(新代嵌入工序)
- **新建** `server/src/__tests__/v2ImprintEmbedding.test.ts`
- **新建** `scripts/embed-imprint-fragments.mjs`(跑批入口)
- **新建** `docs/agent-ops/analysis/2026-08-31-v12-9d-d1b-embedding-coverage.md`(覆盖率报告)
- **修改** `server/package.json` 的 `test:v2` 文件列表(⭐ 仅为挂上新测试文件;⛔ 不许改依赖)
- **追加**:本单 `## Result`

⛔ **禁区(零 diff 自证)**:`server/src/db/init.ts` · `server/src/embedding/index.ts` · `server/src/embedding/vectorStore.ts` · `server/src/embedding/voyage.ts` · `server/src/routes/embedding.ts` · `server/src/agent/**` · `server/src/services/documentParser.ts` · `client/src/**` · 根 `package.json` · `.env` · `.env.experiment` · `docs/agent-ops/current-state/**` · `docs/agent-ops/handoffs/plans/**`

> ⭐ **为什么向量表走迁移而不是 `db/init.ts`**:`db/init.ts` 在**第 45–74 行**加载 sqlite-vec 并建旧代 vec0 表,**第 155 行**才跑迁移 ⇒ 迁移运行时扩展**已加载**,可以建 vec0 表。⛔ **并且不许抄 `db/init.ts` 那两处 `catch (_e) {}` 的静默吞异常** —— 建表失败必须炸,⛔ 不许让应用带着一张不存在的表照常启动。

## 2. 判据(⭐ 全部机械可核)

### K-1 ⭐⭐⭐ `model_id` 是承重件,⛔ 不是装饰

d-0 实测:DashScope `text-embedding-v4` 返回 **1024 维**,与旧代 `doc_chunk_vec` 的 `float[1024]` **完全同形** ⇒ **混表是一个不报错就能做成的动作**。因此:

1. 每一行向量**必须**带 `model_id`(至少含模型名 + 维度;版本可辨即可);
2. **查询路径必须按 `model_id` 过滤** —— ⛔ 不许出现"取全表做 KNN"的代码路径;
3. **⛔ 不许原地覆写**:同一 fragment 换模型 = **新身份新行**,旧行保留或显式作废,⛔ 不许 UPDATE 掉。
4. ⭐ **须有测试**:构造两个不同 `model_id` 的向量,断言按 A 查**不会**返回 B 的行。**这条测试是本单的真判据** —— 没有它,`model_id` 就只是一个存着没人用的字段。

### K-2 嵌入也是转写器:身份四件套入行

每行须记:**fragment 身份**(fragment_id) · **模型标识** · **维度** · **归一化参数/口径**(是否 L2 归一化、`encoding_format` 等,按实申报)。沿用「转写器身份」同族纪律。

### K-3 ⭐⭐ 分母义务:覆盖率申报

报告须给出**分卷 + 合计**:`imprint_fragments` **总数** / **已嵌** / **跳过**,且**跳过必须逐条给原因**(超长?空文本?调用失败?)。⛔ **分母里不许有静默缺失**;数字须来自查库并贴 SQL。

### K-4 预算台账

回执须报:**实际调用次数** · **实际输入字符数** · 批大小 · 是否触发重试。⛔ 上限 30 次 / 150,000 字符,超限停线。

### K-5 ⭐⭐⭐ 硬声明(总部指定原文照写)

报告须**逐字**含:**「本轮检索质量只代表 page 级地板上的检索质量,⛔ 不代表本产品的检索质量。」**
并附 d-1a 已证的粒度事实:同四卷 MinerU 侧 **808** 碎片 vs 本代 **110**,**7.35 倍**;`role` 分布 `para` 110 / `heading` 0。

### K-6 ⛔ 声明本单没做什么

至少:检索 API 与水合(归 d-2)· FTS 半边 · 粒度升级(另单,⛔ **切 MinerU 默认路径始终是它自己的显式单,不随任何单夹带**)· 嵌入模型终选(延 V14)。

### K-7 门禁与禁区

`npm --prefix server run test:v2`(基线 **351/351**;本单**会**增加,须报增量与新总数)· `npm exec --prefix server -- tsc --noEmit -p server` · 禁区逐一 `git diff --quiet` 贴 exit code。
⚠️ `server/src/routes/projections.ts` 有**开工前即存在**的 EOL 状态噪音(` M` 但零内容 diff),⛔ 不许触碰。

## 3. 回执(`## Result`)

K-1 四条(含那条隔离测试的名字与断言)· K-2 入行字段 · K-3 覆盖率**连同 SQL** · K-4 预算台账 · K-5 声明已写入的位置 · K-6 清单 · K-7 三项 · 任何停线点。
⚠️ **回执里出现 key 任何片段 = 本单作废。**
## 4. ⚠️ 第二次派工的修订(2026-08-31;第一次派工因凭证事件作废停线)

> **本节写在 `## Result` 之前,因为闸只看 Result 之前的内容。** 第一次派工的经过与处置见 `current-state/tech-debt.md` 的 **TD-39**(已清偿)。⛔ **不要去读、不要去动那份 codex 会话记录** —— Henry 明令保留,后续任何单不得触碰。

### 修订 A ⭐⭐ 搜索范围界定:**写成动作,不是叮嘱**

第一次派工作废的直接成因是**一条搜索命令逸出仓库范围**。⇒ 本次把范围界定写成**可照抄的动作**:

1. **先 `cd` 进仓库根**(`D:/Coinsides/v2.x/Coincides`),⛔ 不在别处发起搜索;
2. **一切路径用仓内相对路径**(`server/src/...`、`docs/...`),⛔ **不许出现裸盘符**(`C:\`、`D:\`)于任何搜索/遍历命令;
3. ⚠️ **PowerShell 续行(反引号)是本次的凶器** —— 若必须多行,**改用单行命令或脚本文件**,⛔ 不用反引号续行;
4. **⛔ 唯一允许的绝对路径例外:无。** 本单不需要访问仓外任何东西。

⇒ **若某次搜索的输出里出现了仓外路径,那本身就是逸出的信号:立即停下、上报,⛔ 不要继续。**

### 修订 B 嵌入 provider 的 key 来源改为 `server/.env`

- provider 读 **`process.env.DASHSCOPE_API_KEY`**,由 server 既有的 `import 'dotenv/config'` 从 **`server/.env`** 注入(该文件已就位,DASHSCOPE 有效长度 **116**,已 gitignore 且未被 git 跟踪);
- ⛔ **不要显式去读 `.env.experiment`** —— d-0 的探针那样做是探针的事,生产码走 `process.env`;
- endpoint 常量仍为 `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/embeddings`(判据 §0.3 不变)。

### 其余一切不变

§0 七句(含 **§0.6「key 值零出境……出现即本单作废」**)、§1 允许面与禁区、§2 判据 K-1~K-7、§3 回执要求**全部照旧**。
⭐ **§0.6 上次真的生效了** —— builder 撞上后立即停线、零调用、零文件、且拒写 `## Result` 以免把作废工单冒充完成。**本次同样按此执行。**


## Result

**needs: dispatcher — 本次续跑已停线，未收工。**

### 现实对齐

第二次派工 builder 死于 app 重启；其遗产为 `server/src/db/migrations/052_v2_imprint_fragment_vectors.ts`、`server/src/embedding/dashscope.ts`、`server/src/services/imprintEmbedding.ts`、`server/src/__tests__/v2ImprintEmbedding.test.ts`、`scripts/embed-imprint-fragments.mjs`、`server/package.json`（仅 `test:v2` 挂新测试文件）。本次对这 6 处零改动。本次是第三次派工的续跑运行时半程，起点为 052 未入库、嵌入行数为 0。

### 停线点

在仓库根原样执行 `node --env-file=server/.env --import tsx scripts/embed-imprint-fragments.mjs`，Node 在脚本入口执行前以 `ERR_MODULE_NOT_FOUND` 失败：无法从仓库根解析包 `tsx`；exit code 1。失败发生在脚本模块装载前，因此未进入 052 迁移、未发出 DashScope API 调用、未写入向量，也没有脚本 event JSON 可记录。输出未包含任何 key 片段。按工单“任何失败即停线”，本次未改变命令形态、未重试、未自修遗产代码。

### K-1

遗产测试与断言本次未改、未复跑：包括按 `model_id` 隔离检索的测试，以及每行带 `model_id`、换模型不原地覆写、查询按 `model_id` 过滤的既有断言。由于跑批入口在模块解析阶段失败，本次不冒充完成 K-1 运行时复核。

### K-2

未执行入行；无新增 `fragment_id` / `model_id` / `dimensions` / `l2_normalized` / `encoding_format` / `normalization` 数据可申报。

### K-3

未执行跑批后的查库对账，未新建覆盖率报告，未产生可贴入报告的 SQL 结果；不得用预期值或 stdout 计数器冒充查库数字。

### K-4

实际 API 调用次数 0；实际输入字符数 0；批大小未进入运行；重试次数 0。没有触发 30 次 / 150,000 字符预算上限。

### K-5

覆盖率报告未生成，故硬声明尚未写入报告。

### K-6

本次没有做检索 API 与水合（归 d-2）、FTS 半边、粒度升级（切 MinerU 默认路径须另立显式单）、嵌入模型终选（延 V14）；也没有夹带任何这些工作。

### K-7

因跑批失败触发停线，`npm --prefix server run test:v2`、`npm exec --prefix server -- tsc --noEmit -p server` 与禁区逐项 `git diff --quiet` 均未执行；不得把第二次派工已过的门禁冒充本次结果。`server/src/routes/projections.ts` 未触碰。

### 调度所需处置

请调度方裁定指定的仓库根命令如何获得可解析的 `tsx`，或重新签发允许的调用方式；本单不自行修改依赖、脚本或命令。


## Result(续跑二段,2026-08-31)

**结论：完成，无新增停线点。** 前一停线段的病根系调度方签发的仓库根命令形态错误（仓库根无法解析安装于 `server/node_modules` 的 `tsx`），已由续跑二段更正令解除；遗产代码无缺陷、零修改需求。前一停线段按 append-only 纪律原样保留。

### 现实对齐

第二次派工 builder 死于 app 重启；其遗产仍为 `server/src/db/migrations/052_v2_imprint_fragment_vectors.ts`、`server/src/embedding/dashscope.ts`、`server/src/services/imprintEmbedding.ts`、`server/src/__tests__/v2ImprintEmbedding.test.ts`、`scripts/embed-imprint-fragments.mjs`、`server/package.json`（仅 `test:v2` 挂新测试文件）。本次续跑二段对这 6 处零改动；只执行跑批、查库、写覆盖率报告、跑门禁并追加本回执。

从 `server` 目录原样执行 `node --env-file=.env --import tsx ../scripts/embed-imprint-fragments.mjs`，exit 0。凭证只申报存在与有效长度 116，未输出任何 key 值或片段。052 应用 1 次；完成 event 为 `model_id=dashscope:text-embedding-v4:1024`、`total_fragments=110`、`pending_fragments=110`、`inserted=110`、`already_embedded=0`、`skipped=[]`。

完整覆盖率报告：`docs/agent-ops/analysis/2026-08-31-v12-9d-d1b-embedding-coverage.md`。

### K-1 · model_id 四条

1. **每行带模型身份。** 迁移测试 `migration 052 fixes identity columns, vec0 partition shape, and idempotence` 断言身份收据列精确包含 `fragment_id / model_id / dimensions / l2_normalized / encoding_format / normalization`，并断言 vec0 schema 含 `model_id TEXT NOT NULL PARTITION KEY` 与 `FLOAT[1024] distance_metric=cosine`。查库再证两表各 110 行、distinct `model_id` 都为 1，值均为 `dashscope:text-embedding-v4:1024`。
2. **查询路径按模型过滤。** 隔离测试 `K-1 model partition filters inside KNN: querying A cannot return closer model B` 构造 MODEL_A 与 MODEL_B 两行，并故意用更接近 B 的 query；断言结果仅 1 行、fragment 为 A、`modelId=MODEL_A`、B 不在结果中，且 A 的 distance 为 1。
3. **换模型新身份、不原地覆写。** 测试 `K-1 model change creates a new identity and same-model rerun never overwrites` 断言同模型第二次写入返回 `existing` 且 id 不变；换 MODEL_B 得到不同 id，同 fragment 共 2 条身份行；随后用原 A 向量检索仍命中首个 A id、distance 为 0，证明第二次同模型调用没有覆写原向量。
4. **隔离测试是真判据。** 上述 A/B 隔离测试直接断言“按 A 查不会返回 B”，不是只检查 `model_id` 字段存在。新代服务未 join 旧代表，旧代 Voyage 机关保持禁区零 diff。

### K-2 · 入行身份

查库 distinct 值：

- fragment 身份：`fragment_id`，每条收据指向对应 `imprint_fragments.id`；
- 模型标识：`model_id=dashscope:text-embedding-v4:1024`；
- 维度：`dimensions=1024`，vec0 payload schema 亦为 `FLOAT[1024]`；
- 归一化口径：`l2_normalized=0`、`encoding_format=float`、`normalization=none`。

两张表分别为 `imprint_fragment_vectors=110` 行、`imprint_fragment_vec=110` 行；各自 distinct `model_id` 数均为 1。

### K-3 · 覆盖率与 SQL

`db_migrations` 查得：`id=052_v2_imprint_fragment_vectors`，`applied_at=2026-08-31 20:15:46`。

| 卷 | imprint_id | fragments 总数 | 已嵌 | 剩余 | 跳过 |
|---|---|---:|---:|---:|---:|
| reading | `d5247f8f-a4ff-4dce-8273-c62d4114425c` | 46 | 46 | 0 | 0 |
| writing-responses | `d238deb2-e80d-4378-b693-40f1f4c90c71` | 5 | 5 | 0 | 0 |
| writing-tasks | `b5df948c-d1c1-4448-a32d-b18ecadbf31e` | 26 | 26 | 0 | 0 |
| listening | `1d1d8c63-f7ab-459c-a871-cfdf9739a89a` | 33 | 33 | 0 | 0 |
| **合计** | — | **110** | **110** | **0** | **0** |

跳过明细 SQL 返回 0 行；所以没有可逐条列出的跳过 fragment 或原因。查询显式枚举 `blank_text / missing_vector_receipt / missing_vector_payload` 三类原因，均未命中。

覆盖率原 SQL：

```sql
WITH target(ord, volume, imprint_id) AS (VALUES
  (1, 'reading', 'd5247f8f-a4ff-4dce-8273-c62d4114425c'),
  (2, 'writing-responses', 'd238deb2-e80d-4378-b693-40f1f4c90c71'),
  (3, 'writing-tasks', 'b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  (4, 'listening', '1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
), scoped AS (
  SELECT t.ord, t.volume, f.id AS fragment_id, f.text,
         r.id AS receipt_id, v.vector_id AS payload_id
  FROM target t
  LEFT JOIN imprint_fragments f ON f.imprint_id = t.imprint_id
  LEFT JOIN imprint_fragment_vectors r
    ON r.fragment_id = f.id
   AND r.model_id = 'dashscope:text-embedding-v4:1024'
  LEFT JOIN imprint_fragment_vec v
    ON v.vector_id = r.id
   AND v.model_id = r.model_id
), coverage AS (
  SELECT ord, volume,
         COUNT(fragment_id) AS total_fragments,
         SUM(CASE WHEN receipt_id IS NOT NULL AND payload_id IS NOT NULL THEN 1 ELSE 0 END) AS embedded,
         SUM(CASE WHEN fragment_id IS NOT NULL AND (receipt_id IS NULL OR payload_id IS NULL) THEN 1 ELSE 0 END) AS remaining,
         SUM(CASE WHEN fragment_id IS NOT NULL AND trim(text) = '' THEN 1 ELSE 0 END) AS blank_text,
         SUM(length(text)) AS input_characters
  FROM scoped
  GROUP BY ord, volume
  UNION ALL
  SELECT 5, 'TOTAL',
         COUNT(fragment_id),
         SUM(CASE WHEN receipt_id IS NOT NULL AND payload_id IS NOT NULL THEN 1 ELSE 0 END),
         SUM(CASE WHEN fragment_id IS NOT NULL AND (receipt_id IS NULL OR payload_id IS NULL) THEN 1 ELSE 0 END),
         SUM(CASE WHEN fragment_id IS NOT NULL AND trim(text) = '' THEN 1 ELSE 0 END),
         SUM(length(text))
  FROM scoped
)
SELECT ord, volume, total_fragments, embedded, remaining,
       blank_text, input_characters
FROM coverage
ORDER BY ord;
```

跳过与缺失原 SQL：

```sql
WITH target(ord, volume, imprint_id) AS (VALUES
  (1, 'reading', 'd5247f8f-a4ff-4dce-8273-c62d4114425c'),
  (2, 'writing-responses', 'd238deb2-e80d-4378-b693-40f1f4c90c71'),
  (3, 'writing-tasks', 'b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  (4, 'listening', '1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
)
SELECT t.volume, f.id AS fragment_id,
       CASE
         WHEN trim(f.text) = '' THEN 'blank_text'
         WHEN r.id IS NULL THEN 'missing_vector_receipt'
         WHEN v.vector_id IS NULL THEN 'missing_vector_payload'
       END AS reason
FROM target t
JOIN imprint_fragments f ON f.imprint_id = t.imprint_id
LEFT JOIN imprint_fragment_vectors r
  ON r.fragment_id = f.id
 AND r.model_id = 'dashscope:text-embedding-v4:1024'
LEFT JOIN imprint_fragment_vec v
  ON v.vector_id = r.id
 AND v.model_id = r.model_id
WHERE trim(f.text) = ''
   OR r.id IS NULL
   OR v.vector_id IS NULL
ORDER BY t.ord, f.seq, f.id;
-- 0 rows
```

迁移、双表身份、schema 与 role 的其余实际 SQL 原文及查询结果均收录于覆盖率报告。

### K-4 · 预算台账

跑批 event JSON：实际 API 调用 **11** 次，实际输入字符 **114,066**，批大小 **10**，重试 **0** 次；未触发 30 次 / 150,000 字符硬上限。数据库文本字符合计同为 114,066，且双表 110/110 行与 remaining 0 互证。

### K-5 · 声明位置与粒度事实

硬声明已逐字写入 `docs/agent-ops/analysis/2026-08-31-v12-9d-d1b-embedding-coverage.md` 的“K-5 · 粒度边界”：

「本轮检索质量只代表 page 级地板上的检索质量,⛔ 不代表本产品的检索质量。」

同节记录 d-1a 已证事实：同四卷 MinerU 侧 808 碎片 vs 本代 110，7.35 倍；本次查库 role 分布为 `para 110 / heading 0`。

### K-6 · 本单没做

- 检索 API 与水合：未做，归 d-2。
- FTS 半边：未做。
- 粒度升级：未做；切 MinerU 默认路径是它自己的显式单，不随本单夹带。
- 嵌入模型终选：未做，延 V14。

### K-7 · 门禁与禁区

- `npm --prefix server run test:v2`：exit 0；tests **358** / pass **358** / fail 0 / skipped 0。相对基线 351/351，增量 **+7**，新总数 **358/358**。
- `npm exec --prefix server -- tsc --noEmit -p server`：exit 0，无输出。
- 工单 §1 禁区逐项 `git diff --quiet -- <path>`：

| 禁区 | exit code |
|---|---:|
| `server/src/db/init.ts` | 0 |
| `server/src/embedding/index.ts` | 0 |
| `server/src/embedding/vectorStore.ts` | 0 |
| `server/src/embedding/voyage.ts` | 0 |
| `server/src/routes/embedding.ts` | 0 |
| `server/src/agent` | 0 |
| `server/src/services/documentParser.ts` | 0 |
| `client/src` | 0 |
| `package.json` | 0 |
| `.env` | 0 |
| `.env.experiment` | 0 |
| `docs/agent-ops/current-state` | 0 |
| `docs/agent-ops/handoffs/plans` | 0 |

`server/src/routes/projections.ts` 的内容 diff 另验 exit 0；开工前 EOL 状态噪音保留，本次未触碰。

### 停线点

前一段唯一停线点（错误 cwd 下无法解析 `tsx`）已由调度更正令解除。本续跑二段跑批、查库与门禁均成功，无新增停线点；未 commit、未 push。
