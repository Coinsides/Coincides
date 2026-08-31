> **状态 (Status)**: done(2026-08-31 收工;复核 PASS —— 全部数字独立查库复算;⚠️ 撞出设计级发现:碎片粒度是页级,较 MinerU 粗 7.35 倍)
> **from**: claude(opus,工程调度会话 coincides-8b) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31「d-1 直接开,不补骨架」+ 调度方按姑息模式(本机 CPU 退化嫌疑)拆为 d-1a/d-1b 小步落盘。⛔ **不是 Henry。**
> **上游**: `analysis/2026-08-31-v12-9d-d0-provider-smoke.md`(⭐ 先读,含现役接线图)· `analysis/2026-08-31-v12-9d-k0-recon.md`

# d-1a:走真链灌四卷,把「规模」从假设变成实测(⛔ 零 API 调用)

## 0. ⛔⛔ 先读这六句

1. **本单零 API 调用、零花费。** ⛔ 不碰 DashScope、不碰任何嵌入接口 —— 那是 d-1b。
2. **⛔ 不建 `imprint_fragment_vec`、不写任何向量。** 本单只造碎片。
3. **⛔⛔ `D:/Coinsides/v12.9-selection/**` 是证据本体,全程只读,一个字节不许写**(含不许在其中建临时文件、不许改 mtime)。要用就**复制出来**再用。
4. **⛔ 不许直接 `INSERT` 造数据。** 碎片必须**经真链产生**:`intakeSourceTempFile` → `scheduleSourceMaterialization` → `storeSourceImprint`。手写 INSERT 造出来的数不是实测,是布景。
5. **⛔ 不设 `COINCIDES_PDF_PARSER`。** 本单要的是**当前生产默认路径**(`native-pdf@2.4.5`)的诚实数字,不是 MinerU 的。
6. **⛔ 不新建生产用户。** 用库里已有的账号,并在回执申报你用的是哪个、怎么拿到的(⛔ 不许打印任何凭证)。

## 1. 语料(四卷,只读)

```text
D:/Coinsides/v12.9-selection/samples/ielts-academic-reading-sample-tasks-2023.pdf
D:/Coinsides/v12.9-selection/samples/ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf
D:/Coinsides/v12.9-selection/samples/ielts-academic-writing-sample-tasks-2023.pdf
D:/Coinsides/v12.9-selection/samples/ielts-listening-sample-tasks-2023.pdf
```

## 2. 允许面(⛔ 只这些)

- **新建**:`scripts/seed-imprint-corpus.mjs`(灌数脚本;可重跑,须幂等或明确申报不幂等)
- **新建**:`docs/agent-ops/analysis/2026-08-31-v12-9d-d1a-corpus-scale.md`(规模实测报告)
- **追加**:本单 `## Result`

⛔ **禁区(零 diff 自证)**:`server/src/**` · `client/src/**` · `package.json` · `server/package.json` · `.env` · `.env.experiment` · `docs/agent-ops/current-state/**` · `docs/agent-ops/handoffs/plans/**` · `D:/Coinsides/v12.9-selection/**`

> ⚠️ 若你认为**必须**改 `server/src` 才能灌数(例如缺一个可编程入口),**停线上报,⛔ 不要自行改**。发单方要知道这件事。

## 3. 判据(⭐ 全部机械可核)

### K-1 证据本体只读自证

灌数**前后**各算一次四份 PDF 的 sha256,回执贴两组值并申明相等。⛔ 不许在证据树里建任何文件。

### K-2 ⭐⭐ 必须走真链,且要能自证走过

回执须给出**每卷的链路留痕**:`source_files.id` → `source_materializations` 的 `parser_key` / `parser_version` → `source_imprints.id` / `status` / `anchor_fidelity` / `transcriber_lockfile_hash` → `imprint_fragments` 行数。
⭐ **自证判据**:`source_imprints.fragment_count` 必须**逐件等于**该 imprint 在 `imprint_fragments` 里的实际行数。不等即停线。

### K-3 ⭐⭐⭐ 规模实测(本单的产出本体)+ 分母义务

报告须给出,**每一项都分卷 + 合计**:

- 总碎片数;
- 按 `role` 分布(`para` / `heading` / 其他,逐一列出,⛔ 不许合并成"其他 N 个");
- 按 `anchor_fidelity` 分布;
- 碎片文本长度分布:**min / median / max / 总字符数**(⭐ 总字符数是 d-1b 估算嵌入成本的输入,必须给);
- **未产出碎片的输入及其原因**(若有):哪一卷、哪一步、什么 code。⛔ 分母里不许有静默缺失。

⛔ **这些数字必须来自查库,不许来自脚本内存里的计数器** —— 回执须贴出你用的 SQL。

### K-4 转写器身份如实申报

回执须申明:`COINCIDES_PDF_PARSER` **未设置**(贴出你怎么确认的),实际 `parser_key` / `parser_version`,以及 `transcriber_lockfile_hash` 四卷是否相同。

### K-5 ⛔ 与 K-3 对照:声明本单**没有**测什么

至少须列:MinerU 路径下的碎片规模(未测)、region 级 fidelity(未触发)、d-1b 的嵌入成本(未算,只给字符数输入)。⚠️ **未测就写未测,⛔ 不许用默认路径的数字冒充"这就是规模"。**

### K-6 门禁与禁区

收工前:`npm --prefix server run test:v2`(基线 **351/351**,本单**不应**改变它——若变了,申报为什么)· `npm exec --prefix server -- tsc --noEmit -p server` · 禁区逐一 `git diff --quiet` 贴 exit code。
⚠️ `server/src/routes/projections.ts` 有**开工前即存在**的 EOL 状态噪音(` M` 但零内容 diff),⛔ 不许触碰。

## 4. 回执(`## Result`)

K-1 两组哈希 · K-2 四卷链路留痕 + fragment_count 自证 · K-3 全部数字**连同 SQL** · K-4 身份申报 · K-5 未测清单 · K-6 三项结果 · 用的账号(⛔ 不打印凭证)· 任何停线点。

## Result

**结论：完成，无停线点。** 四份输入经
`intakeSourceTempFile → scheduleSourceMaterialization → storeSourceImprint`
真链产出 4 个 accepted `native-pdf@2.4.5` imprint、110 个 fragment、114,066 字符。API 调用 0、花费 0；没有调用 DashScope/嵌入接口，没有创建 `imprint_fragment_vec`，没有写向量，也没有修改 `server/src`。

完整规模报告：`docs/agent-ops/analysis/2026-08-31-v12-9d-d1a-corpus-scale.md`；可重跑脚本：`scripts/seed-imprint-corpus.mjs`。

### K-1 · 两组证据哈希

灌前 `2026-08-31T11:46:38.8906910Z`，灌后 `2026-08-31T11:49:20.8006146Z`：

| PDF | 灌前 SHA256 | 灌后 SHA256 | 相等 |
|---|---|---|---|
| reading | `61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f` | `61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f` | 是 |
| writing-example-responses | `cb320fda1d1eb3311900747a856c6c01520203357b1951be466dcac7f2ee9e72` | `cb320fda1d1eb3311900747a856c6c01520203357b1951be466dcac7f2ee9e72` | 是 |
| writing-tasks | `f9b5b43fbb3f070741f970ecf2adbfaaef8b2f520eb5e2d350bae39557b1c7af` | `f9b5b43fbb3f070741f970ecf2adbfaaef8b2f520eb5e2d350bae39557b1c7af` | 是 |
| listening | `1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e` | `1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e` | 是 |

四份逐件相等。证据树内没有建文件；脚本只读源 PDF，再复制到仓库内受管 `.tmp` 后交给 intake。

### 账号与执行口径

使用 dev DB 既有账号 `test@test.com`（user id `3f346a00-c53e-4ed9-8202-e869c65e8cf9`，name `test1`）及既有课程 `Test`（course id `94319709-12f9-4f1a-b355-396f27487d72`）。通过只投影 `users.id/email/name` 与既有 `courses.id/name` 的查询取得；没有查询或打印凭证字段，没有创建账号或课程。

脚本从 `server` 目录以 `node --import tsx ../scripts/seed-imprint-corpus.mjs` 执行。相同成功 identity 下由 production content/transcriber identity 去重，可重跑；可重试失败态可能增加 attempt 或 rejected imprint，因此不是对所有失败状态的无条件 no-op，脚本会带 `volume/step/code` 停线。

### K-2 · 四卷真链留痕与逐件对账

| 卷 | source_file_id | materialization_id · parser · status | imprint_id · status · fidelity | lockfile hash | declared / actual |
|---|---|---|---|---|---:|
| academic-reading | `3e0cd18f-265f-4038-9f5c-fc99d3a3c8b3` | `d8b2d465-c0e3-46d6-b4f8-51a15aad6dac` · `native-pdf@2.4.5` · materialized | `d5247f8f-a4ff-4dce-8273-c62d4114425c` · accepted · page | `891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95` | 46 / 46 |
| academic-writing-responses | `51169d5b-896a-4e2a-a373-e7e9898232b6` | `3e3cd707-4479-4f01-b2e0-ad8fa21f05ec` · `native-pdf@2.4.5` · materialized | `d238deb2-e80d-4378-b693-40f1f4c90c71` · accepted · page | `891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95` | 5 / 5 |
| academic-writing-tasks | `b4ee4db8-ba5c-46a3-b714-2f9a66ce4cdf` | `2c60f066-2308-4e92-9e5b-13826eb0fa24` · `native-pdf@2.4.5` · materialized | `b5df948c-d1c1-4448-a32d-b18ecadbf31e` · accepted · page | `891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95` | 26 / 26 |
| academic-listening | `3c5bc81c-16eb-4407-8bcc-755997bc3ff0` | `3ae16921-c135-4cb3-aa67-6e4c1b62c01e` · `native-pdf@2.4.5` · materialized | `1d1d8c63-f7ab-459c-a871-cfdf9739a89a` · accepted · page | `891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95` | 33 / 33 |

四个 materialization 的 `error_code` 都是 NULL。对本单四份 source 的**全部 imprint**（没有先筛 accepted）执行下列硬停线核账，返回 0 行：

```sql
WITH corpus(volume, filename, sha256) AS (VALUES
  ('academic-reading', 'ielts-academic-reading-sample-tasks-2023.pdf', '61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f'),
  ('academic-writing-responses', 'ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf', 'cb320fda1d1eb3311900747a856c6c01520203357b1951be466dcac7f2ee9e72'),
  ('academic-writing-tasks', 'ielts-academic-writing-sample-tasks-2023.pdf', 'f9b5b43fbb3f070741f970ecf2adbfaaef8b2f520eb5e2d350bae39557b1c7af'),
  ('academic-listening', 'ielts-listening-sample-tasks-2023.pdf', '1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e')
), actual AS (
  SELECT imprint_id, COUNT(*) AS actual_fragment_count
  FROM imprint_fragments GROUP BY imprint_id
)
SELECT c.volume, si.id AS imprint_id,
       si.fragment_count AS declared,
       COALESCE(a.actual_fragment_count, 0) AS actual
FROM corpus c
JOIN source_files sf
  ON sf.user_id = '3f346a00-c53e-4ed9-8202-e869c65e8cf9'
 AND sf.original_filename = c.filename
 AND sf.content_hash = lower(c.sha256)
JOIN source_imprints si
  ON si.source_file_id = sf.id AND si.user_id = sf.user_id
LEFT JOIN actual a ON a.imprint_id = si.id
WHERE si.fragment_count <> COALESCE(a.actual_fragment_count, 0);
-- 0 rows
```

### K-3 · 查库规模数字

四个 exact target 均为不同的 accepted `native-pdf@2.4.5` imprint；基数 SQL得到 matched imprints 4、distinct volumes 4、distinct imprint ids 4。

#### 碎片数与长度

`length(text)` 为 SQLite 字符数；偶数样本 median 取中间两项平均值。

| scope | fragments | min | median | max | total chars |
|---|---:|---:|---:|---:|---:|
| academic-reading | 46 | 24 | 732 | 3,675 | 55,905 |
| academic-writing-responses | 5 | 1,502 | 2,113 | 3,491 | 12,408 |
| academic-writing-tasks | 26 | 75 | 609 | 3,502 | 20,141 |
| academic-listening | 33 | 60 | 459 | 2,474 | 25,612 |
| **TOTAL** | **110** | **24** | **637** | **3,675** | **114,066** |

#### role 分布（每个词典值单列）

| scope | heading | para | list_item | table_row | cell | slide_shape | caption | code_line | footnote | blank |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| academic-reading | 0 | 46 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| academic-writing-responses | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| academic-writing-tasks | 0 | 26 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| academic-listening | 0 | 33 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **TOTAL** | **0** | **110** | **0** | **0** | **0** | **0** | **0** | **0** | **0** | **0** |

#### anchor_fidelity 分布

每格为 `imprint_count / fragment_count`。

| scope | region | block | page | char | element | section | cell |
|---|---:|---:|---:|---:|---:|---:|---:|
| academic-reading | 0 / 0 | 0 / 0 | 1 / 46 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| academic-writing-responses | 0 / 0 | 0 / 0 | 1 / 5 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| academic-writing-tasks | 0 / 0 | 0 / 0 | 1 / 26 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| academic-listening | 0 / 0 | 0 / 0 | 1 / 33 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| **TOTAL** | **0 / 0** | **0 / 0** | **4 / 110** | **0 / 0** | **0 / 0** | **0 / 0** | **0 / 0** |

#### 实际统计 SQL

长度/总数：

```sql
WITH target(ord, volume, imprint_id) AS (VALUES
  (1, 'academic-reading', 'd5247f8f-a4ff-4dce-8273-c62d4114425c'),
  (2, 'academic-writing-responses', 'd238deb2-e80d-4378-b693-40f1f4c90c71'),
  (3, 'academic-writing-tasks', 'b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  (4, 'academic-listening', '1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
), scopes(ord, scope) AS (
  SELECT ord, volume FROM target UNION ALL SELECT 5, 'TOTAL'
), lens(ord, scope, n) AS (
  SELECT t.ord, t.volume, length(f.text)
  FROM target t
  JOIN source_imprints si ON si.id = t.imprint_id
    AND si.user_id = '3f346a00-c53e-4ed9-8202-e869c65e8cf9'
    AND si.status = 'accepted'
  JOIN imprint_fragments f ON f.imprint_id = si.id
  UNION ALL
  SELECT 5, 'TOTAL', length(f.text)
  FROM target t
  JOIN source_imprints si ON si.id = t.imprint_id
    AND si.user_id = '3f346a00-c53e-4ed9-8202-e869c65e8cf9'
    AND si.status = 'accepted'
  JOIN imprint_fragments f ON f.imprint_id = si.id
), ranked AS (
  SELECT ord, scope, n,
         row_number() OVER (PARTITION BY ord, scope ORDER BY n) rn,
         count(*) OVER (PARTITION BY ord, scope) cnt
  FROM lens
), agg AS (
  SELECT ord, scope, count(*) fragment_count, min(n) min_chars,
         avg(CASE WHEN rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
                  THEN 1.0 * n END) median_chars,
         max(n) max_chars, sum(n) total_chars
  FROM ranked GROUP BY ord, scope
)
SELECT s.scope, COALESCE(a.fragment_count, 0) fragment_count,
       a.min_chars, a.median_chars, a.max_chars,
       COALESCE(a.total_chars, 0) total_chars
FROM scopes s LEFT JOIN agg a ON a.ord = s.ord AND a.scope = s.scope
ORDER BY s.ord;
```

role：

```sql
WITH target(ord, volume, imprint_id) AS (VALUES
  (1, 'academic-reading', 'd5247f8f-a4ff-4dce-8273-c62d4114425c'),
  (2, 'academic-writing-responses', 'd238deb2-e80d-4378-b693-40f1f4c90c71'),
  (3, 'academic-writing-tasks', 'b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  (4, 'academic-listening', '1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
), roles(rord, role) AS (VALUES
  (1, 'heading'), (2, 'para'), (3, 'list_item'), (4, 'table_row'), (5, 'cell'),
  (6, 'slide_shape'), (7, 'caption'), (8, 'code_line'), (9, 'footnote'), (10, 'blank')
), scopes(ord, scope) AS (
  SELECT ord, volume FROM target UNION ALL SELECT 5, 'TOTAL'
), counts AS (
  SELECT t.ord, t.volume scope, f.role, count(*) n
  FROM target t
  JOIN source_imprints si ON si.id = t.imprint_id
    AND si.user_id = '3f346a00-c53e-4ed9-8202-e869c65e8cf9'
    AND si.status = 'accepted'
  JOIN imprint_fragments f ON f.imprint_id = si.id
  GROUP BY t.ord, t.volume, f.role
  UNION ALL
  SELECT 5, 'TOTAL', f.role, count(*)
  FROM target t
  JOIN source_imprints si ON si.id = t.imprint_id
    AND si.user_id = '3f346a00-c53e-4ed9-8202-e869c65e8cf9'
    AND si.status = 'accepted'
  JOIN imprint_fragments f ON f.imprint_id = si.id
  GROUP BY f.role
)
SELECT s.scope, r.role, COALESCE(c.n, 0) fragment_count
FROM scopes s CROSS JOIN roles r
LEFT JOIN counts c
  ON c.ord = s.ord AND c.scope = s.scope AND c.role = r.role
ORDER BY s.ord, r.rord;
```

anchor fidelity：

```sql
WITH target(ord, volume, imprint_id) AS (VALUES
  (1, 'academic-reading', 'd5247f8f-a4ff-4dce-8273-c62d4114425c'),
  (2, 'academic-writing-responses', 'd238deb2-e80d-4378-b693-40f1f4c90c71'),
  (3, 'academic-writing-tasks', 'b5df948c-d1c1-4448-a32d-b18ecadbf31e'),
  (4, 'academic-listening', '1d1d8c63-f7ab-459c-a871-cfdf9739a89a')
), fidelities(ford, fidelity) AS (VALUES
  (1, 'region'), (2, 'block'), (3, 'page'), (4, 'char'),
  (5, 'element'), (6, 'section'), (7, 'cell')
), scopes(ord, scope) AS (
  SELECT ord, volume FROM target UNION ALL SELECT 5, 'TOTAL'
), counts AS (
  SELECT t.ord, t.volume scope, si.anchor_fidelity fidelity,
         count(DISTINCT si.id) imprint_count, count(f.id) fragment_count
  FROM target t
  JOIN source_imprints si ON si.id = t.imprint_id
    AND si.user_id = '3f346a00-c53e-4ed9-8202-e869c65e8cf9'
    AND si.status = 'accepted'
  LEFT JOIN imprint_fragments f ON f.imprint_id = si.id
  GROUP BY t.ord, t.volume, si.anchor_fidelity
  UNION ALL
  SELECT 5, 'TOTAL', si.anchor_fidelity,
         count(DISTINCT si.id), count(f.id)
  FROM target t
  JOIN source_imprints si ON si.id = t.imprint_id
    AND si.user_id = '3f346a00-c53e-4ed9-8202-e869c65e8cf9'
    AND si.status = 'accepted'
  LEFT JOIN imprint_fragments f ON f.imprint_id = si.id
  GROUP BY si.anchor_fidelity
)
SELECT s.scope, d.fidelity,
       COALESCE(c.imprint_count, 0) imprint_count,
       COALESCE(c.fragment_count, 0) fragment_count
FROM scopes s CROSS JOIN fidelities d
LEFT JOIN counts c
  ON c.ord = s.ord AND c.scope = s.scope AND c.fidelity = d.fidelity
ORDER BY s.ord, d.ford;
```

#### 分母与无静默缺失

失败枚举 SQL 返回 **0 行**，所以未产出碎片的输入为“无”；四卷全在分母中。`audit:*` 是审计派生 code，不冒充 production error code：

```sql
WITH corpus(ord, volume, filename, sha256) AS (VALUES
  (1, 'academic-reading', 'ielts-academic-reading-sample-tasks-2023.pdf', '61035d701cbc12b8aff41c6df25bc25d2d394f6e915ea258c82d2b384be7ed8f'),
  (2, 'academic-writing-responses', 'ielts-academic-writing-example-responses-to-parts-1-and-2-with-band-scores-and-examiner-comments.pdf', 'cb320fda1d1eb3311900747a856c6c01520203357b1951be466dcac7f2ee9e72'),
  (3, 'academic-writing-tasks', 'ielts-academic-writing-sample-tasks-2023.pdf', 'f9b5b43fbb3f070741f970ecf2adbfaaef8b2f520eb5e2d350bae39557b1c7af'),
  (4, 'academic-listening', 'ielts-listening-sample-tasks-2023.pdf', '1c260de1460889397d04a73f297bb1d62d6401210dcfe72584373968c45a9d3e')
), default_imprints AS (
  SELECT si.*,
         row_number() OVER (
           PARTITION BY si.user_id, si.source_file_id
           ORDER BY si.created_at DESC, si.id DESC
         ) rn
  FROM source_imprints si
  WHERE si.transcriber_name = 'native-pdf'
    AND si.transcriber_version = '2.4.5'
), actual AS (
  SELECT imprint_id, count(*) fragment_count
  FROM imprint_fragments GROUP BY imprint_id
)
SELECT c.volume, c.filename,
       CASE
         WHEN sf.id IS NULL OR sf.storage_state <> 'ready' THEN 'intakeSourceTempFile'
         WHEN sm.id IS NULL OR sm.status <> 'materialized' THEN 'scheduleSourceMaterialization'
         ELSE 'storeSourceImprint'
       END failure_step,
       CASE
         WHEN sf.id IS NULL THEN 'audit:no_source_file_row'
         WHEN sf.storage_state <> 'ready' THEN 'audit:source_file_not_ready'
         WHEN sm.id IS NULL THEN 'audit:no_materialization_row'
         WHEN sm.status = 'failed' THEN COALESCE(sm.error_code, 'audit:failed_without_error_code')
         WHEN sm.status <> 'materialized' THEN 'audit:nonterminal_' || sm.status
         WHEN di.id IS NULL THEN 'audit:no_default_imprint'
         WHEN di.status = 'rejected' THEN COALESCE(sm.error_code, 'audit:imprint_rejected_without_materialization_code')
         ELSE 'audit:accepted_default_imprint_zero_fragments'
       END code,
       sm.status materialization_status, sm.error_code persisted_error_code,
       di.id latest_default_imprint_id, di.status latest_default_imprint_status,
       di.rejection_reasons_json,
       COALESCE(a.fragment_count, 0) actual_fragment_count
FROM corpus c
LEFT JOIN source_files sf
  ON sf.user_id = '3f346a00-c53e-4ed9-8202-e869c65e8cf9'
 AND sf.original_filename = c.filename
 AND sf.content_hash = lower(c.sha256)
LEFT JOIN source_materializations sm
  ON sm.source_file_id = sf.id AND sm.user_id = sf.user_id
LEFT JOIN default_imprints di
  ON di.source_file_id = sf.id AND di.user_id = sf.user_id AND di.rn = 1
LEFT JOIN actual a ON a.imprint_id = di.id
WHERE sf.id IS NULL OR sf.storage_state <> 'ready'
   OR sm.id IS NULL OR sm.status <> 'materialized'
   OR di.id IS NULL OR di.status <> 'accepted'
   OR COALESCE(a.fragment_count, 0) = 0
ORDER BY c.ord;
-- 0 rows
```

### K-4 · 转写器身份

`COINCIDES_PDF_PARSER` **未设置**。灌数前只查 key 存在性（不打印任何值）：当前 process key 不存在；根 `.env`、根 `.env.experiment`、`server/.env` 的定义命中数都是 0，`server/.env.experiment` 不存在。脚本入口另以 `hasOwnProperty(process.env, 'COINCIDES_PDF_PARSER') === false` 硬断言。

实际四卷 `parser_key/parser_version` 都是 `native-pdf/2.4.5`。`transcriber_lockfile_hash` distinct count = 1，四卷均为 `891f3c048bc81e417e6f8317ac413bfc648f369fbf8b2586f50bce6073e02d95`，并与 `server/package-lock.json` 的现场 SHA256 相等。

`SELECT count(*) ... count(DISTINCT transcriber_lockfile_hash) ...` 对四个 exact imprint 返回 `imprint_count=4 / distinct_hashes=1 / all_four_same=1`。`sqlite_master` guard 对 `name='imprint_fragment_vec'` 返回 0。

### K-5 · 明确未测

- MinerU 路径下的碎片规模：**未测**；不能用上述 native-pdf 数字冒充。
- region 级 fidelity：**未触发、未测**；本次四卷都是 page。
- d-1b 嵌入成本：**未算**；没有调用嵌入 API，只给 114,066 字符作为后续输入。
- 其他 PDF、parser 版本、lockfile、账号/语料组合均未测；110 不是通用规模常数。

### K-6 · 门禁与禁区

- `npm --prefix server run test:v2`：exit 0；tests 351 / pass 351 / fail 0 / skipped 0，基线仍为 351/351。
- `npm exec --prefix server -- tsc --noEmit -p server`：exit 0，无输出。

逐项 `git diff --quiet -- <path>`：

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

`D:/Coinsides/v12.9-selection` 不是 Git worktree（probe exit 128），故 `git diff --quiet` 不适用；没有伪造 code，以 K-1 灌前/灌后四份 PDF SHA256 逐件相等作为该禁区的字节自证。
## 复核批注(调度方 coincides-8b,2026-08-31)

**判定:PASS。** 复核方**未采信回执任何数字**,全部独立查库复算(⛔ 且未看 builder 贴的 SQL,自写查询):

| 项 | 回执 | 复核方独立复算 | |
|---|---:|---:|---|
| `imprint_fragments` 总行数 | 110 | **110** | ✅ |
| 总字符数 | 114,066 | **114,066** | ✅ |
| accepted / rejected | 4 / — | **4 / 0** | ✅ |
| `fragment_count` declared=actual | 逐件相等 | **46/46 · 5/5 · 26/26 · 33/33**,和=110 | ✅ |
| `anchor_fidelity` | 全 page | **page × 4** | ✅ |
| 转写器身份 | `native-pdf@2.4.5` | 四件同一 lockfile `891f3c04…` | ✅ |
| `imprint_fragment_vec` | 未建 | **表不存在** | ✅ |

**证据本体只读**:复核方独立算的四份 PDF 当前 SHA-256,与回执的**灌前**、**灌后**两组**逐件相等**(`61035d70…` / `cb320fda…` / `f9b5b43f…` / `1c260de1…`)。⇒ 三方一致,只读成立。

**禁区**:八处复核方逐一 `git diff --quiet`,**exit 全 0**。

**⭐⭐ 一处值得单记的 builder 表现:它拒绝伪造一个 exit code。** 证据树 `D:/Coinsides/v12.9-selection` 不是 git worktree(`git diff --quiet` 返 128),它**没有把 128 当成 0 写进表、也没有省略这一行**,而是明写「不适用,改以 K-1 前后 SHA 逐件相等作为该禁区的字节自证」。⇒ **一个不适用的量具,它的输出不是证据。** 这正是本仓「便宜量具只配排除」的正面执行。

---

## ⚠️⚠️ 复核撞出的设计级发现:**碎片粒度是「页」,不是「块」**(⛔ 已上报总部)

| 事实 | 数字 |
|---|---|
| `role` 分布 | **`para` 110 / `heading` 0** —— 100% 单一角色 |
| 文本长度 | min **24** · median **643** · max **3,675** 字符 |
| 同四卷 MinerU 侧碎片数(c-2 普查 §1.1 已入档) | reading **320** · writing-responses **69** · writing-tasks **152** · listening **267** = **808** |
| 本单 native-pdf 侧 | 46 · 5 · 26 · 33 = **110** |
| **粒度比** | **808 / 110 = 7.35×**;最悬殊一卷 writing-responses **69/5 = 13.8×** |

⇒ **d-1b 若在这 110 个碎片上建检索,一次命中返回的是「大半页」,不是「一个可寻址单元」。** page 级是保真阶梯的**地板**(宪法明写"低保真合法"),⛔ 但它把 12.9d 的检索质量预先钉在了地板上。

⚠️ **⛔ 这不改变 d-1b 该不该做** —— 管线正确性与碎片粒度是两条独立的轴,110 个碎片足够把「嵌入→建表→检索→水合」全链跑通,且成本近零(114,066 字符 ≈ 3 万 token,不到 ¥0.02)。**但 d-1b 的产出必须声明:本轮检索质量不代表本产品的检索质量,只代表 page 级地板上的检索质量。**

📌 **另一处校准**:d-0 报告按上限假设估的是 **48,000** 碎片 / 187.5 MiB,实测 **110**。⇒ 假设高出实测 **436 倍**。存储选型在此规模下**根本不承重**(110 条向量,暴力余弦与 sqlite-vec 无差别)——⛔ 但这不构成推翻「另起表 + `model_id` 入行」的理由:那条是**正确性**要求(同维不同空间),与规模无关。
