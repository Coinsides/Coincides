> **状态 (Status)**: complete
> **层 (Layer)**: 实测 / V12.9d「检索地基」d-1a
> **日期 (Updated)**: 2026-08-31
> **权威 (Authoritative)**: 本次 dev DB 与四份只读语料在 `native-pdf@2.4.5` 默认路径下的观测结果为是；不代表 MinerU 或其他语料
> **上游**: `analysis/2026-08-31-v12-9d-d0-provider-smoke.md` · `handoffs/2026-08-31-v12-9d-d1a-corpus-seed.md`

# 12.9d · d-1a：四卷默认解析路径的语料规模实测

## 〇 · 结论与边界

四份 IELTS PDF 经生产真链
`intakeSourceTempFile → scheduleSourceMaterialization → storeSourceImprint`
产出 4 个 accepted imprint、110 个 fragment、114,066 个 SQLite `length(text)` 字符。四卷实际解析器均为 `native-pdf@2.4.5`，anchor fidelity 均为 `page`；每个 imprint 的声明 fragment_count 与数据库实际 fragment 行数逐件相等。

这是**当前生产默认 native-pdf 路径在这四份语料上的规模**，不是“PDF 的普遍规模”，也不是 MinerU 规模。全程 API 调用 0、花费 0；没有调用 DashScope 或嵌入接口，没有创建 `imprint_fragment_vec`，没有写向量。脚本直接只打开既有 DB，不调用会执行 vec DDL 的 `initDb()`；灌数脚本自身没有手写 `INSERT`，碎片只由服务真链产生。

## 一 · K-1：证据本体只读

灌数前：`2026-08-31T11:46:38.8906910Z`；灌数后：`2026-08-31T11:49:20.8006146Z`。

| PDF | 灌数前 SHA256 | 灌数后 SHA256 | 相等 |
|---|---|---|---|
| `ielts-academic-reading-sample-tasks-2023.pdf` | `61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f` | `61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f` | 是 |
| `ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf` | `cb320fda1d1eb3311900747a856c6c01520203357b1951be466dcac7f2ee9e72` | `cb320fda1d1eb3311900747a856c6c01520203357b1951be466dcac7f2ee9e72` | 是 |
| `ielts-academic-writing-sample-tasks-2023.pdf` | `f9b5b43fbb3f070741f970ecf2adbfaaef8b2f520eb5e2d350bae39557b1c7af` | `f9b5b43fbb3f070741f970ecf2adbfaaef8b2f520eb5e2d350bae39557b1c7af` | 是 |
| `ielts-listening-sample-tasks-2023.pdf` | `1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e` | `1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e` | 是 |

四份均为灌前 = 灌后。脚本只从 `D:/Coinsides/v12.9-selection/samples` 读取，再复制到仓库内受管的 `server/uploads/source-blobs/.tmp`；没有在证据树创建临时文件或执行写操作。

## 二 · 账号、执行方式与幂等边界

使用既有账号 `test@test.com`（user id `3f346a00-c53e-4ed9-8202-e869c65e8cf9`，name `test1`）及其既有课程 `Test`（course id `94319709-12f9-4f1a-b355-396f27487d72`）。账号由 dev DB 的安全投影取得，只查询 `id/email/name` 与既有课程的 `id/name`，没有查询、打印任何凭证字段，也没有创建用户或课程：

```sql
SELECT
  u.id AS user_id, u.email, u.name AS user_name,
  c.id AS course_id, c.name AS course_name
FROM users u
JOIN courses c ON c.user_id = u.id
WHERE u.email = ?
ORDER BY c.created_at ASC, c.id ASC
LIMIT 1;
-- binding: test@test.com
```

执行命令（从 `server` 目录加载现役 TypeScript 服务源码）：

```powershell
node --import tsx ../scripts/seed-imprint-corpus.mjs
```

成功路径以 user/content hash/source identity 与 transcriber identity 复用，故相同账号、语料和 lockfile 下可重跑且不会重复产出 accepted imprint。它不是对所有失败态的无条件 no-op：生产链对可重试 failure 可能增加 `attempt_count`，失败过程中也可能留下 rejected imprint；脚本会逐件对账并带 `volume/step/code` 停线，不把失败态伪装成成功幂等。

## 三 · K-2：真链留痕与逐件对账

| 卷 | source_file_id | materialization_id · parser · status | imprint_id · status · fidelity | lockfile hash | declared / actual |
|---|---|---|---|---|---:|
| academic-reading | `3e0cd18f-265f-4038-9f5c-fc99d3a3c8b3` | `d8b2d465-c0e3-46d6-b4f8-51a15aad6dac` · `native-pdf@2.4.5` · materialized | `d5247f8f-a4ff-4dce-8273-c62d4114425c` · accepted · page | `891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95` | 46 / 46 |
| academic-writing-responses | `51169d5b-896a-4e2a-a373-e7e9898232b6` | `3e3cd707-4479-4f01-b2e0-ad8fa21f05ec` · `native-pdf@2.4.5` · materialized | `d238deb2-e80d-4378-b693-40f1f4c90c71` · accepted · page | `891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95` | 5 / 5 |
| academic-writing-tasks | `b4ee4db8-ba5c-46a3-b714-2f9a66ce4cdf` | `2c60f066-2308-4e92-9e5b-13826eb0fa24` · `native-pdf@2.4.5` · materialized | `b5df948c-d1c1-4448-a32d-b18ecadbf31e` · accepted · page | `891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95` | 26 / 26 |
| academic-listening | `3c5bc81c-16eb-4407-8bcc-755997bc3ff0` | `3ae16921-c135-4cb3-aa67-6e4c1b62c01e` · `native-pdf@2.4.5` · materialized | `1d1d8c63-f7ab-459c-a871-cfdf9739a89a` · accepted · page | `891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95` | 33 / 33 |

所有 materialization 的 `error_code` 均为 NULL。逐件不等即停线查询返回 **0 行**。

K-2 链路与声明/实际行数查询：

```sql
WITH corpus(ord, volume, filename, sha256) AS (VALUES
  (1, 'academic-reading', 'ielts-academic-reading-sample-tasks-2023.pdf', '61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f'),
  (2, 'academic-writing-responses', 'ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf', 'cb320fda1d1eb3311900747a856c6c01520203357b1951be466dcac7f2ee9e72'),
  (3, 'academic-writing-tasks', 'ielts-academic-writing-sample-tasks-2023.pdf', 'f9b5b43fbb3f070741f970ecf2adbfaaef8b2f520eb5e2d350bae39557b1c7af'),
  (4, 'academic-listening', 'ielts-listening-sample-tasks-2023.pdf', '1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e')
), target_user(user_id) AS (
  VALUES ('3f346a00-c53e-4ed9-8202-e869c65e8cf9')
), actual AS (
  SELECT imprint_id, COUNT(*) AS actual_fragment_count
  FROM imprint_fragments GROUP BY imprint_id
)
SELECT c.volume, c.filename,
       sf.source_record_id, sf.id AS source_file_id, sf.storage_state,
       sm.id AS materialization_id, sm.parser_key, sm.parser_version,
       sm.status AS materialization_status, sm.error_code,
       si.id AS imprint_id, si.status AS imprint_status,
       si.anchor_fidelity, si.transcriber_name, si.transcriber_version,
       si.transcriber_lockfile_hash,
       si.fragment_count AS declared_fragment_count,
       COALESCE(a.actual_fragment_count, 0) AS actual_fragment_count,
       CASE WHEN si.id IS NULL THEN NULL
            WHEN si.fragment_count = COALESCE(a.actual_fragment_count, 0) THEN 1
            ELSE 0 END AS fragment_count_matches
FROM corpus c CROSS JOIN target_user u
LEFT JOIN source_files sf
  ON sf.user_id = u.user_id
 AND sf.original_filename = c.filename
 AND sf.content_hash = lower(c.sha256)
LEFT JOIN source_materializations sm
  ON sm.source_file_id = sf.id AND sm.user_id = sf.user_id
LEFT JOIN source_imprints si
  ON si.source_file_id = sf.id AND si.user_id = sf.user_id
LEFT JOIN actual a ON a.imprint_id = si.id
ORDER BY c.ord, si.created_at, si.id;
```

K-2 硬停线查询（没有先筛 accepted，因此 rejected imprint 也在核账面）：

```sql
WITH corpus(ord, volume, filename, sha256) AS (VALUES
  (1, 'academic-reading', 'ielts-academic-reading-sample-tasks-2023.pdf', '61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f'),
  (2, 'academic-writing-responses', 'ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf', 'cb320fda1d1eb3311900747a856c6c01520203357b1951be466dcac7f2ee9e72'),
  (3, 'academic-writing-tasks', 'ielts-academic-writing-sample-tasks-2023.pdf', 'f9b5b43fbb3f070741f970ecf2adbfaaef8b2f520eb5e2d350bae39557b1c7af'),
  (4, 'academic-listening', 'ielts-listening-sample-tasks-2023.pdf', '1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e')
), target_user(user_id) AS (
  VALUES ('3f346a00-c53e-4ed9-8202-e869c65e8cf9')
), actual AS (
  SELECT imprint_id, COUNT(*) AS actual_fragment_count
  FROM imprint_fragments GROUP BY imprint_id
)
SELECT c.volume, si.id AS imprint_id,
       si.fragment_count AS declared_fragment_count,
       COALESCE(a.actual_fragment_count, 0) AS actual_fragment_count
FROM corpus c CROSS JOIN target_user u
JOIN source_files sf
  ON sf.user_id = u.user_id
 AND sf.original_filename = c.filename
 AND sf.content_hash = lower(c.sha256)
JOIN source_imprints si
  ON si.source_file_id = sf.id AND si.user_id = sf.user_id
LEFT JOIN actual a ON a.imprint_id = si.id
WHERE si.fragment_count <> COALESCE(a.actual_fragment_count, 0)
ORDER BY c.ord, si.created_at, si.id;
```

## 四 · K-3：数据库规模实测

下列统计只使用上节锁定的四个不同 accepted `native-pdf@2.4.5` imprint id。目标基数 SQL 得到 `matched=4 / distinct volumes=4 / distinct imprint ids=4`。

### 4.1 碎片数与文本长度

SQLite `length(text)` 按字符计数；偶数样本的 median 是中间两项的平均值。

| scope | fragments | min | median | max | total chars |
|---|---:|---:|---:|---:|---:|
| academic-reading | 46 | 24 | 732 | 3,675 | 55,905 |
| academic-writing-responses | 5 | 1,502 | 2,113 | 3,491 | 12,408 |
| academic-writing-tasks | 26 | 75 | 609 | 3,502 | 20,141 |
| academic-listening | 33 | 60 | 459 | 2,474 | 25,612 |
| **TOTAL** | **110** | **24** | **637** | **3,675** | **114,066** |

### 4.2 role 分布

| scope | heading | para | list_item | table_row | cell | slide_shape | caption | code_line | footnote | blank |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| academic-reading | 0 | 46 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| academic-writing-responses | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| academic-writing-tasks | 0 | 26 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| academic-listening | 0 | 33 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **TOTAL** | **0** | **110** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

### 4.3 anchor_fidelity 分布

每格为 `imprint_count / fragment_count`。

| scope | region | block | page | char | element | section | cell |
|---|---:|---:|---:|---:|---:|---:|---:|
| academic-reading | 0 / 0 | 0 / 0 | 1 / 46 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| academic-writing-responses | 0 / 0 | 0 / 0 | 1 / 5 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| academic-writing-tasks | 0 / 0 | 0 / 0 | 1 / 26 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| academic-listening | 0 / 0 | 0 / 0 | 1 / 33 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| **TOTAL** | **0 / 0** | **0 / 0** | **4 / 110** | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** |

### 4.4 K-3 统计 SQL

三条统计共用这个 exact target（以下各 SQL 独立执行时把该 CTE 放在 `WITH` 开头）：

```sql
target(ord, volume, imprint_id) AS (VALUES
  (1, 'academic-reading', 'd5247f8f-a4ff-4dce-8273-c62d4114425c'),
  (2, 'academic-writing-responses', 'd238deb2-e80d-4378-b693-40f1f4c90c71'),
  (3, 'academic-writing-tasks', 'b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  (4, 'academic-listening', '1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
), target_user(user_id) AS (
  VALUES ('3f346a00-c53e-4ed9-8202-e869c65e8cf9')
)
```

目标基数：

```sql
WITH target(ord, volume, imprint_id) AS (VALUES
  (1, 'academic-reading', 'd5247f8f-a4ff-4dce-8273-c62d4114425c'),
  (2, 'academic-writing-responses', 'd238deb2-e80d-4378-b693-40f1f4c90c71'),
  (3, 'academic-writing-tasks', 'b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  (4, 'academic-listening', '1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
), target_user(user_id) AS (
  VALUES ('3f346a00-c53e-4ed9-8202-e869c65e8cf9')
)
SELECT COUNT(*) AS matched_imprint_count,
       COUNT(DISTINCT t.volume) AS distinct_volumes,
       COUNT(DISTINCT si.id) AS distinct_imprint_ids,
       CASE WHEN COUNT(*) = 4
              AND COUNT(DISTINCT t.volume) = 4
              AND COUNT(DISTINCT si.id) = 4
            THEN 1 ELSE 0 END AS target_is_four_distinct_accepted_imprints
FROM target t CROSS JOIN target_user u
JOIN source_imprints si
  ON si.id = t.imprint_id AND si.user_id = u.user_id
WHERE si.status = 'accepted'
  AND si.transcriber_name = 'native-pdf'
  AND si.transcriber_version = '2.4.5';
```

碎片数与长度：

```sql
WITH target(ord, volume, imprint_id) AS (VALUES
  (1, 'academic-reading', 'd5247f8f-a4ff-4dce-8273-c62d4114425c'),
  (2, 'academic-writing-responses', 'd238deb2-e80d-4378-b693-40f1f4c90c71'),
  (3, 'academic-writing-tasks', 'b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  (4, 'academic-listening', '1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
), target_user(user_id) AS (
  VALUES ('3f346a00-c53e-4ed9-8202-e869c65e8cf9')
), scopes(ord, scope) AS (
  SELECT ord, volume FROM target UNION ALL SELECT 5, 'TOTAL'
), lens(ord, scope, n) AS (
  SELECT t.ord, t.volume, length(f.text)
  FROM target t CROSS JOIN target_user u
  JOIN source_imprints si
    ON si.id = t.imprint_id AND si.user_id = u.user_id AND si.status = 'accepted'
  JOIN imprint_fragments f ON f.imprint_id = si.id
  UNION ALL
  SELECT 5, 'TOTAL', length(f.text)
  FROM target t CROSS JOIN target_user u
  JOIN source_imprints si
    ON si.id = t.imprint_id AND si.user_id = u.user_id AND si.status = 'accepted'
  JOIN imprint_fragments f ON f.imprint_id = si.id
), ranked AS (
  SELECT ord, scope, n,
         row_number() OVER (PARTITION BY ord, scope ORDER BY n) AS rn,
         count(*) OVER (PARTITION BY ord, scope) AS cnt
  FROM lens
), agg AS (
  SELECT ord, scope, count(*) AS fragment_count, min(n) AS min_chars,
         avg(CASE WHEN rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
                  THEN 1.0 * n END) AS median_chars,
         max(n) AS max_chars, sum(n) AS total_chars
  FROM ranked GROUP BY ord, scope
)
SELECT s.scope, COALESCE(a.fragment_count, 0) AS fragment_count,
       a.min_chars, a.median_chars, a.max_chars,
       COALESCE(a.total_chars, 0) AS total_chars
FROM scopes s
LEFT JOIN agg a ON a.ord = s.ord AND a.scope = s.scope
ORDER BY s.ord;
```

role（全部现役词典值逐项列出，含 0）：

```sql
WITH target(ord, volume, imprint_id) AS (VALUES
  (1, 'academic-reading', 'd5247f8f-a4ff-4dce-8273-c62d4114425c'),
  (2, 'academic-writing-responses', 'd238deb2-e80d-4378-b693-40f1f4c90c71'),
  (3, 'academic-writing-tasks', 'b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  (4, 'academic-listening', '1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
), target_user(user_id) AS (
  VALUES ('3f346a00-c53e-4ed9-8202-e869c65e8cf9')
), roles(rord, role) AS (VALUES
  (1, 'heading'), (2, 'para'), (3, 'list_item'), (4, 'table_row'), (5, 'cell'),
  (6, 'slide_shape'), (7, 'caption'), (8, 'code_line'), (9, 'footnote'), (10, 'blank')
), scopes(ord, scope) AS (
  SELECT ord, volume FROM target UNION ALL SELECT 5, 'TOTAL'
), counts AS (
  SELECT t.ord, t.volume AS scope, f.role, count(*) AS n
  FROM target t CROSS JOIN target_user u
  JOIN source_imprints si
    ON si.id = t.imprint_id AND si.user_id = u.user_id AND si.status = 'accepted'
  JOIN imprint_fragments f ON f.imprint_id = si.id
  GROUP BY t.ord, t.volume, f.role
  UNION ALL
  SELECT 5, 'TOTAL', f.role, count(*)
  FROM target t CROSS JOIN target_user u
  JOIN source_imprints si
    ON si.id = t.imprint_id AND si.user_id = u.user_id AND si.status = 'accepted'
  JOIN imprint_fragments f ON f.imprint_id = si.id
  GROUP BY f.role
)
SELECT s.scope, r.role, COALESCE(c.n, 0) AS fragment_count
FROM scopes s CROSS JOIN roles r
LEFT JOIN counts c
  ON c.ord = s.ord AND c.scope = s.scope AND c.role = r.role
ORDER BY s.ord, r.rord;
```

anchor fidelity（同时给 imprint 与 fragment 口径）：

```sql
WITH target(ord, volume, imprint_id) AS (VALUES
  (1, 'academic-reading', 'd5247f8f-a4ff-4dce-8273-c62d4114425c'),
  (2, 'academic-writing-responses', 'd238deb2-e80d-4378-b693-40f1f4c90c71'),
  (3, 'academic-writing-tasks', 'b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  (4, 'academic-listening', '1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
), target_user(user_id) AS (
  VALUES ('3f346a00-c53e-4ed9-8202-e869c65e8cf9')
), fidelities(ford, fidelity) AS (VALUES
  (1, 'region'), (2, 'block'), (3, 'page'), (4, 'char'),
  (5, 'element'), (6, 'section'), (7, 'cell')
), scopes(ord, scope) AS (
  SELECT ord, volume FROM target UNION ALL SELECT 5, 'TOTAL'
), counts AS (
  SELECT t.ord, t.volume AS scope, si.anchor_fidelity AS fidelity,
         count(DISTINCT si.id) AS imprint_count, count(f.id) AS fragment_count
  FROM target t CROSS JOIN target_user u
  JOIN source_imprints si
    ON si.id = t.imprint_id AND si.user_id = u.user_id AND si.status = 'accepted'
  LEFT JOIN imprint_fragments f ON f.imprint_id = si.id
  GROUP BY t.ord, t.volume, si.anchor_fidelity
  UNION ALL
  SELECT 5, 'TOTAL', si.anchor_fidelity,
         count(DISTINCT si.id), count(f.id)
  FROM target t CROSS JOIN target_user u
  JOIN source_imprints si
    ON si.id = t.imprint_id AND si.user_id = u.user_id AND si.status = 'accepted'
  LEFT JOIN imprint_fragments f ON f.imprint_id = si.id
  GROUP BY si.anchor_fidelity
)
SELECT s.scope, d.fidelity,
       COALESCE(c.imprint_count, 0) AS imprint_count,
       COALESCE(c.fragment_count, 0) AS fragment_count
FROM scopes s CROSS JOIN fidelities d
LEFT JOIN counts c
  ON c.ord = s.ord AND c.scope = s.scope AND c.fidelity = d.fidelity
ORDER BY s.ord, d.ford;
```

### 4.5 分母义务：无静默缺失

下列失败枚举 SQL 返回 **0 行**：四卷均产出非零碎片，没有需要列出的缺失卷。`audit:*` 是本次审计派生 code，不冒充生产 `error_code`；若有 production failure，查询同时保留 `persisted_error_code` 和 `rejection_reasons_json`。

```sql
WITH corpus(ord, volume, filename, sha256) AS (VALUES
  (1, 'academic-reading', 'ielts-academic-reading-sample-tasks-2023.pdf', '61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f'),
  (2, 'academic-writing-responses', 'ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf', 'cb320fda1d1eb3311900747a856c6c01520203357b1951be466dcac7f2ee9e72'),
  (3, 'academic-writing-tasks', 'ielts-academic-writing-sample-tasks-2023.pdf', 'f9b5b43fbb3f070741f970ecf2adbfaaef8b2f520eb5e2d350bae39557b1c7af'),
  (4, 'academic-listening', 'ielts-listening-sample-tasks-2023.pdf', '1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e')
), target_user(user_id) AS (
  VALUES ('3f346a00-c53e-4ed9-8202-e869c65e8cf9')
), default_imprints AS (
  SELECT si.*,
         row_number() OVER (
           PARTITION BY si.user_id, si.source_file_id
           ORDER BY si.created_at DESC, si.id DESC
         ) AS rn
  FROM source_imprints si
  WHERE si.transcriber_name = 'native-pdf'
    AND si.transcriber_version = '2.4.5'
), actual AS (
  SELECT imprint_id, count(*) AS fragment_count
  FROM imprint_fragments GROUP BY imprint_id
)
SELECT c.volume, c.filename,
       CASE
         WHEN sf.id IS NULL OR sf.storage_state <> 'ready' THEN 'intakeSourceTempFile'
         WHEN sm.id IS NULL OR sm.status <> 'materialized' THEN 'scheduleSourceMaterialization'
         ELSE 'storeSourceImprint'
       END AS failure_step,
       CASE
         WHEN sf.id IS NULL THEN 'audit:no_source_file_row'
         WHEN sf.storage_state <> 'ready' THEN 'audit:source_file_not_ready'
         WHEN sm.id IS NULL THEN 'audit:no_materialization_row'
         WHEN sm.status = 'failed' THEN COALESCE(sm.error_code, 'audit:failed_without_error_code')
         WHEN sm.status <> 'materialized' THEN 'audit:nonterminal_' || sm.status
         WHEN di.id IS NULL THEN 'audit:no_default_imprint'
         WHEN di.status = 'rejected' THEN COALESCE(sm.error_code, 'audit:imprint_rejected_without_materialization_code')
         ELSE 'audit:accepted_default_imprint_zero_fragments'
       END AS code,
       sm.status AS materialization_status,
       sm.error_code AS persisted_error_code,
       di.id AS latest_default_imprint_id,
       di.status AS latest_default_imprint_status,
       di.rejection_reasons_json,
       COALESCE(a.fragment_count, 0) AS actual_fragment_count
FROM corpus c CROSS JOIN target_user u
LEFT JOIN source_files sf
  ON sf.user_id = u.user_id
 AND sf.original_filename = c.filename
 AND sf.content_hash = lower(c.sha256)
LEFT JOIN source_materializations sm
  ON sm.source_file_id = sf.id AND sm.user_id = sf.user_id
LEFT JOIN default_imprints di
  ON di.source_file_id = sf.id AND di.user_id = sf.user_id AND di.rn = 1
LEFT JOIN actual a ON a.imprint_id = di.id
WHERE sf.id IS NULL
   OR sf.storage_state <> 'ready'
   OR sm.id IS NULL
   OR sm.status <> 'materialized'
   OR di.id IS NULL
   OR di.status <> 'accepted'
   OR COALESCE(a.fragment_count, 0) = 0
ORDER BY c.ord;
```

## 五 · K-4：转写器身份

`COINCIDES_PDF_PARSER` 未设置。灌数前按“只查键名、不打印值”确认：当前进程中该 key 不存在；根 `.env`、根 `.env.experiment`、`server/.env` 中匹配定义数均为 0（`server/.env.experiment` 不存在）。脚本入口还以 `hasOwnProperty(process.env, 'COINCIDES_PDF_PARSER') === false` 作硬断言。

数据库实测四卷 `parser_key/parser_version = native-pdf/2.4.5`。四卷 `transcriber_lockfile_hash` 的 distinct count = 1，均为：

```text
891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95
```

它与现场 `server/package-lock.json` 的 SHA256 相等。查询为：

```sql
WITH target(ord, volume, imprint_id) AS (VALUES
  (1, 'academic-reading', 'd5247f8f-a4ff-4dce-8273-c62d4114425c'),
  (2, 'academic-writing-responses', 'd238deb2-e80d-4378-b693-40f1f4c90c71'),
  (3, 'academic-writing-tasks', 'b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  (4, 'academic-listening', '1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
), target_user(user_id) AS (
  VALUES ('3f346a00-c53e-4ed9-8202-e869c65e8cf9')
)
SELECT count(*) AS imprint_count,
       count(DISTINCT si.transcriber_lockfile_hash) AS distinct_lockfile_hashes,
       min(si.transcriber_lockfile_hash) AS transcriber_lockfile_hash,
       CASE WHEN count(*) = 4
              AND count(DISTINCT si.transcriber_lockfile_hash) = 1
            THEN 1 ELSE 0 END AS all_four_same
FROM target t CROSS JOIN target_user u
JOIN source_imprints si
  ON si.id = t.imprint_id AND si.user_id = u.user_id;
```

`imprint_fragment_vec` 收工前 schema guard：

```sql
SELECT count(*) AS imprint_fragment_vec_schema_objects
FROM sqlite_master
WHERE name = 'imprint_fragment_vec';
-- result: 0
```

## 六 · K-5：本单明确没有测什么

- **MinerU 路径下的碎片规模：未测。** 没有设置 `COINCIDES_PDF_PARSER`，不能拿上述默认 native-pdf 数字冒充 MinerU 数字。
- **region 级 fidelity：未触发、未测。** 四个 imprint 都是 `page`；region 的 0 只是本路径本语料的观测，不说明 MinerU region 行为。
- **d-1b 嵌入成本：未计算。** 本单没有调用嵌入 API、没有生成/写入向量，只提供总字符数 114,066 作为 d-1b 的估算输入。
- 没有测其他 PDF、其他 parser 版本、其他 lockfile 或其他账号/语料组合，不能把 110 fragments 当作通用容量常数。

## 七 · K-6

运行门：

- `npm --prefix server run test:v2`：exit 0；tests 351 / pass 351 / fail 0 / skipped 0，保持 351/351 基线。
- `npm exec --prefix server -- tsc --noEmit -p server`：exit 0，无输出。

禁区逐项 `git diff --quiet -- <path>`：

| 禁区 | exit code |
|---|---:|
| `server/src` | 0 |
| `client/src` | 0 |
| `package.json` | 0 |
| `server/package.json` | 0 |
| `.env` | 0 |
| `.env.experiment` | 0 |
| `docs/agent-ops/current-state` | 0 |
| `docs/agent-ops/handoffs/plans` | 0 |
| `server/src/routes/projections.ts`（开工前 EOL 状态噪音，内容 diff） | 0 |

外部证据树 `D:/Coinsides/v12.9-selection` 不是 Git worktree（repo probe exit 128），故没有可诚实申报的 `git diff --quiet` code；K-1 的四份 PDF 灌前/灌后 SHA256 逐件相等是该禁区的字节级自证。没有停线点。

规模数字不依赖任何脚本内存计数器，以上均来自 readonly/query-only DB SQL。
