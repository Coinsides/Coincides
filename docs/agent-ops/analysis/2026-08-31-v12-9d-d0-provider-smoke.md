> **状态 (Status)**: complete(d-0 接线侦察 + 供应商冒烟;⭐ 401 已由复核定因=区域端点,见文末复核补充 —— 国际站端点实测 200/1024 维)
> **层 (Layer)**: 侦察 / V12.9d「检索地基」
> **日期 (Updated)**: 2026-08-31
> **权威 (Authoritative)**: 现物调用链与本次探针结果为是；未来接线仅为本单隔离建议，不是生产实现
> **上游**: `analysis/2026-08-31-v12-9d-k0-recon.md` · `handoffs/2026-08-31-v12-9d-d0-wiring-and-smoke.md`

# 12.9d · d-0：现役检索接线图与 DashScope 嵌入冒烟

## 〇 · 结论与停线点

现役语义检索的真实 HTTP 入口是 Agent 消息路由，不是 `/api/embedding/status` 或 `/api/embedding/backfill`。它从 Agent tool call 进入 `VectorStore`，在 `doc_chunk_vec` / `agent_memory_vec` 做 KNN，再回接 TD-34 旧代 `document_chunks` / `documents` 或 `agent_memories`。**新代 `imprint_fragments` 在这张现役检索调用图中的位置 = 不存在。**

DashScope 冒烟只执行了一次：固定测试文本 `canvas engine`，请求 `text-embedding-v4` 的 1024 维浮点向量。接口返回 `HTTP 401`，未返回可验向量或模型标识；线上累计 **1 次调用 / 13 个输入字符**，随即按工单停线。没有换模型、换 endpoint、重试或改用 Voyage。

## 一 · K-1 现役检索调用链

### 1. 文档语义检索：逐跳现物

```text
POST /api/agent/conversations/:id/messages
  → server/src/index.ts:137
    挂载 /api/agent + authMiddleware + agentRoutes
  → server/src/routes/agent.ts:65-66
    Agent 消息 SSE 路由
  → server/src/routes/agent.ts:99-105
    runAgent(userId, conversationId, message, ...)
  → server/src/agent/orchestrator.ts:213-215
    模型产生 tool call 后 executeTool(tc.name, tc.arguments, userId)
  → server/src/agent/tools/executor.ts:610-612
    case 'search_documents'，实例化 VectorStore
  → server/src/agent/tools/executor.ts:653-660
    provider.embed([query], 'query')
    → store.searchChunksWithContent(queryEmbedding, 10, userId)
  → server/src/embedding/vectorStore.ts:122-129
    对 doc_chunk_vec 执行 v.embedding MATCH ? 的 vec0 KNN
  → doc_chunk_vec(chunk_id, embedding float[1024])
    [启动/schema 前置，不是请求期调用：
     server/src/db/init.ts:45-61 加载 sqlite-vec 并创建该表]
  → server/src/embedding/vectorStore.ts:139-146
    v.chunk_id → document_chunks.id
    → document_chunks.document_id → documents.id，并按 documents.user_id 过滤
  → server/src/embedding/vectorStore.ts:150-160
    未切块旧文档旁路：v.chunk_id → documents.id
  → server/src/agent/tools/executor.ts:622-632
    documents → courses，补齐返回元数据
```

旧代向量身份链是：

```text
doc_chunk_vec.chunk_id
  → document_chunks.id
  → document_chunks.document_id
  → documents.id
```

未切块旧文档的兼容身份链是 `doc_chunk_vec.chunk_id → documents.id`。两条都没有经过 `imprint_fragments`。

### 2. Agent memory 的并行语义分支

它复用同一个 Agent HTTP / tool-call 入口，分支如下：

```text
executeTool('search_memories', ...)
  → server/src/agent/tools/executor.ts:413-415
    实例化 VectorStore
  → server/src/agent/tools/executor.ts:429-436
    provider.embed([query], 'query')
    → store.searchMemoriesWithContent(...)
  → server/src/embedding/vectorStore.ts:216-232
    对 agent_memory_vec 执行 vec0 KNN
  → agent_memory_vec(memory_id, embedding float[1024])
    [启动/schema 前置，不是请求期调用：
     server/src/db/init.ts:45-52,66-72 加载扩展并创建该表]
  → server/src/embedding/vectorStore.ts:239-246
    agent_memory_vec.memory_id → agent_memories.id，并按 user_id 过滤
```

### 3. `/api/embedding` 不是现役检索入口

- `server/src/index.ts:143` 挂载 `/api/embedding`。
- `GET /api/embedding/status` 位于 `server/src/routes/embedding.ts:13-84`；它不实例化 `VectorStore`，只用 SQL 统计 `doc_chunk_vec → document_chunks → documents`（`:35-42`）、`doc_chunk_vec → documents`（`:45-51`）与 `agent_memory_vec → agent_memories`（`:59-65`）。
- `POST /api/embedding/backfill` 位于 `server/src/routes/embedding.ts:90-170`；它在 `:100` 实例化 `VectorStore`，从旧表取内容（`:106-123`），调用 provider 后写入旧代向量表（`:129-156`）。它做回填，不做 KNN 检索。

### 4. 新代位置与隔离接线建议

**新代 `imprint_fragments` 在这张现役检索调用图中的位置 = 不存在。** 现物证据：

- `imprint_fragments` 目前是 `server/src/db/migrations/049_v2_source_imprints.ts:52-76` 创建的关系表；
- 生产 service 只在 `server/src/services/sourceImprints.ts:807-812` 读取，在 `:860-880` 写入；
- `VectorStore`、Agent tool executor 与 `/api/embedding` 路由都没有把它接入检索；全仓当前也没有 `imprint_fragment_vec`。

建议保持「机关共用、表与空间分代」：

```text
未来新代检索调用者
  → 共用现有 sqlite-vec 扩展
  → 新代专属 VectorStore 方法
  → imprint_fragment_vec(fragment_id, embedding, model_id)
  → imprint_fragments.id
  → source_imprints.id
  → source_files.id
  → 按 source_imprints.user_id 做所有权过滤
```

本单没有实施这张建议图。

## 二 · K-2 DashScope 单次可用性冒烟

### 1. 官方模型现物确认方法

本单把唯一请求模型固定为 `text-embedding-v4`，没有 fallback。确认方法是于 2026-08-31 交叉核对阿里云官方材料：

1. [text-embedding-v4 独立模型页](https://help.aliyun.com/zh/model-studio/text-embedding-v4)给出精确模型 ID；
2. [OpenAI Embedding 兼容接口页](https://help.aliyun.com/zh/model-studio/embedding-interfaces-compatible-with-openai/)的支持表、请求示例与成功响应都使用同一 ID，并列出 v4 支持 1024 维；
3. [文本嵌入同步接口参考](https://help.aliyun.com/zh/model-studio/text-embedding-synchronous-api/)确认 `model`、`input`、`dimensions`、`encoding_format` 与响应模型字段的契约。

探针据此固定调用北京 OpenAI-compatible endpoint `POST https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings`，显式请求 `dimensions: 1024` 与 `encoding_format: "float"`。官方兼容页注明这个既有共享域名仍可正常使用；本次该 endpoint 返回 `HTTP 401`，在认证层即停，不能据此证明 key 对该模型有调用权限或请求已到达模型推理层。

### 2. 输入、key 与返回事实

探针只显式读取仓库根 `.env.experiment`，不读取 `.env`，也不依赖环境加载顺序。它不打印响应正文、异常对象或 stack。

| 事实 | 本次结果 |
|---|---|
| key 存在 | 是 |
| key 长度 | 116 |
| 测试输入 | 固定测试文本 `canvas engine` |
| 请求模型标识 | `text-embedding-v4` |
| 请求维度 | 1024 |
| HTTP 状态 | 401 |
| 返回向量维度 | 不可得（响应未提供可验向量） |
| 返回模型标识 | 不可得（响应未回显可验模型） |
| 单次延迟 | 800 ms |
| 本单累计调用次数 | 1 |
| 本单累计输入字符数 | 13 |

停线点：`HTTP 401`。无法仅凭受控标量区分 key 无效、权限不足或其他认证侧原因；为遵守零泄漏与失败即停，本单不输出响应正文，也不作第二次调用。

## 三 · K-3 同维不等于同空间

**显式回答：同维不等于同空间。** 本次因 `HTTP 401` 没有得到向量，所以冒烟**实测返回维度 = 不可得**；请求中的 1024 只是请求参数，不能冒充实测结果。

即使后续成功调用返回 1024，也必须写成：**维度相同⛔不构成可混表**。现役 `doc_chunk_vec` / `agent_memory_vec` 的 `float[1024]` 只约束形状，不证明它们与 DashScope `text-embedding-v4` 共享坐标系、训练目标或版本身份。把不同模型产物放进同一 KNN 空间会得到无意义且可能不报错的距离。

隔离方案是新建 `imprint_fragment_vec`，不复用 `doc_chunk_vec`；每行记录精确 `model_id`，查询和回填都按同一模型身份隔离。模型或版本变化按新身份处理，不把旧向量与新向量混算。

## 四 · K-4 规模上限假设

K-0 对 dev 库的现物实测是以下 7 张相关表**全 0 行**：`imprint_fragments`、`source_imprints`、`source_files`、`document_chunks`、`documents`、`doc_chunk_vec`、`agent_memory_vec`。本单复述该现物，不把 0 行外推为未来规模。

雅思四卷语料的容量上限采用透明假设：每卷不超过 200 页、每页不超过 60 个可寻址碎片，则上限为 `4 × 200 × 60 = 48,000` 个碎片。若容量预算暂按每条 1024 维 `float32`，仅原始向量载荷约为 `48,000 × 1024 × 4 = 196,608,000 bytes = 187.5 MiB`；这不含 vec0 索引、行元数据、模型标识、FTS 与原文。

**这是假设,实测在 d-1**。

## 五 · 本单未触及的设计条款

- FTS 半边；
- 真建表；
- 真嵌入回填；
- 检索 API。

此外，本单没有把 DashScope 接入生产 provider，没有修改任何生产代码或门禁。
---

## ⭐ 复核补充(调度方 coincides-8b,2026-08-31):401 已定因 —— 是区域端点,不是 key

⚠️ **本节改变了第〇节的结论,请连同本节一起读。** 第〇节的「停于 HTTP 401」在本单判据下是**正确的停线**(工单明令不许换端点重试),⛔ 但它**不是最终事实**。

复核方在**工单声明的预算内**(builder 用 1 次/13 字符,复核方再用 1 次/13 字符,**累计 2 次 / 26 字符**,上限 3 次 / 200 字符)做了一次**单变量对照**:同一把 key、同一模型 `text-embedding-v4`、同一 payload、同一请求头,**只更换主机名**。

| 端点 | HTTP | 返回向量维度 | 返回模型标识 | 延迟 |
|---|---|---|---|---|
| `https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings`(北京) | **401** | 不可得 | 不可得 | 800 ms |
| `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/embeddings`(国际站) | **200** | **1024** | **`text-embedding-v4`** | 879 ms |

**⇒ 结论三条**:

1. **key 有效**,`text-embedding-v4` **可用且有权限**;401 的成因是**区域端点不匹配**,⛔ 不是 key 无效、不是欠费、不是无权限。
2. **本仓调用 DashScope 必须走国际站端点 `dashscope-intl.aliyuncs.com`。** 这不止管嵌入 —— **`qwen-vl-max`(c-3 识别器已定单选)用的是同一把 key**,⇒ **c-3 会撞上同一堵墙**,应在 c-3 开单前就把端点钉死,⛔ 不要等它再 401 一次。
3. ⭐⭐ **K-3 的陷阱从假设变成了现实**:实测返回维度**就是 1024**,与现役 `doc_chunk_vec` / `agent_memory_vec` 的 `float[1024]` **完全同形**。⇒ 「维度相同⛔不构成可混表」不再是纸上条款,**混表现在是一个不报错就能做成的动作**。d-1 建 `imprint_fragment_vec` 时,**行内记 `model_id` 是承重件,不是装饰**。

**⛔ 复核方没有做的**:未改动探针脚本(对照跑在仓外的一次性脚本里,⛔ 未进仓)、未打印 key 任何片段、未用任何用户内容(测试文本仍是 `canvas engine`)、未做第三次调用。

**📌 给 builder 记功**:第〇节的停线**完全正确** —— 工单写的是「不可用就如实申报并停在那里,不许换模型凑成功」,它照做了,并且**如实写下「不能据此证明 key 无效」**,没有把一个认证层的 401 越权解释成账号结论。**停对了线,并且没有替下一个人下结论 —— 这正是停线该有的样子。**
