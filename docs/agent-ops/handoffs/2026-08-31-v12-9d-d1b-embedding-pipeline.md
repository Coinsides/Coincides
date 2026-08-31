> **状态 (Status)**: ready(M3/12.9d 第三单;新代向量表 + DashScope 嵌入工序 + 覆盖率申报)
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
