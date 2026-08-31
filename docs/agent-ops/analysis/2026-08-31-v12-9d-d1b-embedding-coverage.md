> **状态 (Status)**: frozen
> **层 (Layer)**: 分析 / Analysis（运行时覆盖率收据）
> **日期 (Updated)**: 2026-08-31
> **权威 (Authoritative)**: 否；数字为本次开发库查询快照

# V12.9d d-1b 嵌入覆盖率报告

## 结论

052 已应用。指定四卷共有 110 个 `imprint_fragments`，模型
`dashscope:text-embedding-v4:1024` 已完整写入 110 份身份收据与 110 份
sqlite-vec payload；剩余 0，跳过 0。覆盖率、身份字段和 role 数字均来自下列
SQL 的开发库实查结果；跑批 stdout 只用于 K-4 调用预算台账。

## 052 迁移收据

| id | applied_at |
|---|---|
| `052_v2_imprint_fragment_vectors` | `2026-08-31 20:15:46` |

## 分卷覆盖率

| 卷 | imprint_id | fragments 总数 | 已嵌 | 剩余 | 跳过 | 输入字符 |
|---|---|---:|---:|---:|---:|---:|
| reading | `d5247f8f-a4ff-4dce-8273-c62d4114425c` | 46 | 46 | 0 | 0 | 55,905 |
| writing-responses | `d238deb2-e80d-4378-b693-40f1f4c90c71` | 5 | 5 | 0 | 0 | 12,408 |
| writing-tasks | `b5df948c-d1c1-4448-a32d-b18ecadbf31e` | 26 | 26 | 0 | 0 | 20,141 |
| listening | `1d1d8c63-f7ab-459c-a871-cfdf9739a89a` | 33 | 33 | 0 | 0 | 25,612 |
| **合计** | — | **110** | **110** | **0** | **0** | **114,066** |

跳过明细查询返回 0 行，因此没有可逐条列出的跳过 fragment 或原因；不存在静默缺失。
查询把空文本、缺身份收据、缺向量 payload 分别申报为 `blank_text`、
`missing_vector_receipt`、`missing_vector_payload`，三类均未命中。

## K-2 · 向量身份申报

| 表 | 行数 | distinct `model_id` | `model_id` 值 |
|---|---:|---:|---|
| `imprint_fragment_vectors` | 110 | 1 | `dashscope:text-embedding-v4:1024` |
| `imprint_fragment_vec` | 110 | 1 | `dashscope:text-embedding-v4:1024` |

`imprint_fragment_vectors` 的 distinct 身份值：

| 字段 | distinct 数 | 值 |
|---|---:|---|
| `dimensions` | 1 | `1024` |
| `l2_normalized` | 1 | `0`（否） |
| `encoding_format` | 1 | `float` |
| `normalization` | 1 | `none` |

sqlite schema 同时申报 `imprint_fragment_vec.embedding` 为
`FLOAT[1024] distance_metric=cosine`，`model_id` 为 `NOT NULL PARTITION KEY`。
每行身份四件套为 fragment 身份 `fragment_id`、模型标识 `model_id`、维度
`dimensions`、归一化口径 `l2_normalized / encoding_format / normalization`。

## K-4 · 预算台账

跑批完成 event JSON 申报：实际 API 调用 **11** 次，实际输入字符
**114,066**，批大小 **10**，重试 **0** 次；未触发 30 次 / 150,000 字符硬上限。
查库覆盖率与之互证：110 个 fragment 全部已有双表向量，数据库文本字符合计
114,066，remaining 0。

## K-5 · 粒度边界

「本轮检索质量只代表 page 级地板上的检索质量,⛔ 不代表本产品的检索质量。」

d-1a 复核批注已证同四卷 MinerU 侧 808 个碎片，本代 page 级路径 110 个碎片，
粒度比为 7.35 倍。当前库对这四个 exact imprint 的 role 查询结果为
`para` 110 / `heading` 0。MinerU 的 808 是 d-1a 复核批注的上游事实；本代 110
与 role 分布由本报告 SQL 再查库确认。

## K-6 · 本单没有做

- 检索 API 与水合：未做，归 d-2。
- FTS 半边：未做。
- 粒度升级：未做；切 MinerU 默认路径必须是它自己的显式单，不随本单夹带。
- 嵌入模型终选：未做，延至 V14。

## 实际查询 SQL

迁移收据：

```sql
SELECT id, applied_at
FROM db_migrations
WHERE id = '052_v2_imprint_fragment_vectors';
```

分卷覆盖率与字符数：

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

跳过与缺失逐条枚举：

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

身份收据表：

```sql
SELECT
  COUNT(*) AS row_count,
  COUNT(DISTINCT model_id) AS distinct_model_id_count,
  group_concat(DISTINCT model_id) AS model_ids,
  COUNT(DISTINCT dimensions) AS distinct_dimensions_count,
  group_concat(DISTINCT dimensions) AS dimensions,
  COUNT(DISTINCT l2_normalized) AS distinct_l2_normalized_count,
  group_concat(DISTINCT l2_normalized) AS l2_normalized,
  COUNT(DISTINCT encoding_format) AS distinct_encoding_format_count,
  group_concat(DISTINCT encoding_format) AS encoding_formats,
  COUNT(DISTINCT normalization) AS distinct_normalization_count,
  group_concat(DISTINCT normalization) AS normalizations
FROM imprint_fragment_vectors;
```

向量 payload 表：

```sql
SELECT
  COUNT(*) AS row_count,
  COUNT(DISTINCT model_id) AS distinct_model_id_count,
  group_concat(DISTINCT model_id) AS model_ids
FROM imprint_fragment_vec;
```

两表 schema：

```sql
SELECT name, sql
FROM sqlite_master
WHERE name IN ('imprint_fragment_vectors', 'imprint_fragment_vec')
ORDER BY name;
```

指定四卷的 `para / heading` 分布：

```sql
WITH target(imprint_id) AS (VALUES
  ('d5247f8f-a4ff-4dce-8273-c62d4114425c'),
  ('d238deb2-e80d-4378-b693-40f1f4c90c71'),
  ('b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  ('1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
), roles(role) AS (VALUES ('para'), ('heading'))
SELECT roles.role, COUNT(f.id) AS fragment_count
FROM roles
LEFT JOIN target t ON 1 = 1
LEFT JOIN imprint_fragments f
  ON f.imprint_id = t.imprint_id
 AND f.role = roles.role
GROUP BY roles.role
ORDER BY CASE roles.role WHEN 'para' THEN 1 ELSE 2 END;
```
