> **状态 (Status)**: **v2**（2026-07-11；按 Plan v3 §0 开工同步门升级——四层数据脊柱 + 六项协议补清;v1.1 的单表脊柱/四段横切/"可重建"表述至此**作废**,其代码盘点与守卫核查结论保留）
> **层 (Layer)**: 现状 / Current-State（Agent 分析 · 实现设计,V2.BN.10 的实现细节权威）
> **上游**: `docs/releases/V2.BN.10-plan.md` **v3**（范围/子版本/验收权威）+ 会议记录 07-05/07-10/07-11 + 两轮对抗核查（wvwfq3gs6 / wk3ht4b5l,行号实证仍有效）
> **Henry 拍板（2026-07-11,六项）**: 四层数据脊柱 / Placement 进 v1 / durable materialization run / 动态删除默认 / 撤回可重建承诺 / 五段纵切

# 引用源存储形态设计 · v2

> **一句话**：一个全局 Source 身份（`source_records`），四种独立生命周期各归其表（身份 / 事实附件 / 物化 run / Project 镜头）；投影 = 复用 Note 内容引擎的 `source_projection` 文档类别（**源内容锁定,解释与组织可编辑**,服务端事实）;删除全为硬删 + 文件补偿协议;course-scoped 表策略注册表让"15 张表"从人肉清单变成机器不变量。

---

## 0. 决定轨迹（怎么走到 v2 的）

- v0→v1：方案 A（投影=真·note）胜出（B=第二块真相宇宙必迁移;C=半拆墙更糟）——**此判决不变**,投影仍复用 notes/note_blocks。
- v1→v2：Codex 第三批审视证实**单表 `source_files` 一行背四种身份**（文件/身份/解析任务/投影指针）,与 1:N 附件、重解析、版次、多镜头结构性冲突;Henry 拍四层拆分。v1.1 的 A-d 出身护栏、"15 表手写清单"、`reference_note_id`、`is_system` 均被本版取代。
- 仍然有效的 v1.1 核查资产（行号实证）：写守卫粒度矩阵、5 台扫描机清单、canvas_backing 前向路径、pdf-parse 2.x API 陷阱、multer 独立实例要求、认证 blob 打开习语、stale 枚举修复指位、canvas 卫星表拓扑与 release 顺序教训。

## 1. Migration 045 · 精确 Schema

```sql
-- ============ 四层数据脊柱 ============
CREATE TABLE IF NOT EXISTS source_records (          -- ①全局 Source 身份(用户心智条目)
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,                        -- 同名撞车时后缀 (1)(2) 打在这里
  origin_course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  origin_course_name_snapshot TEXT,                  -- Origin 收据:project 删后仍知"从哪进来"
  origin_entry_kind TEXT NOT NULL DEFAULT 'project_upload'
    CHECK (origin_entry_kind IN ('project_upload','library_upload','import')),
  metadata TEXT NOT NULL DEFAULT '{}',               -- 本版闭集 key:无(预留空对象);不作垃圾场
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_source_records_user ON source_records(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS source_files (            -- ②不可变事实附件
  id TEXT PRIMARY KEY,
  source_record_id TEXT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,                         -- <SOURCE_BLOB_DIR>/<userId>/<fileId><ext>;永不按外部路径引用
  storage_state TEXT NOT NULL DEFAULT 'staging'
    CHECK (storage_state IN ('staging','ready')),    -- 仅内部提交状态;绝不演化成产品软删
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL DEFAULT 0,
  content_hash TEXT NOT NULL,                        -- 服务端流式 SHA-256(最终裁判)
  file_mtime TEXT,
  uploaded_at TEXT NOT NULL,                         -- UTC 精确到分,显示转本地时区
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_files_user_hash
  ON source_files(user_id, content_hash);            -- 去重的数据库真约束(precheck 只是体验)
CREATE INDEX IF NOT EXISTS idx_source_files_record ON source_files(source_record_id);

CREATE TABLE IF NOT EXISTS source_materializations ( -- ③durable parse/materialization run
  id TEXT PRIMARY KEY,
  source_record_id TEXT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  source_file_id TEXT NOT NULL REFERENCES source_files(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parser_key TEXT NOT NULL,                          -- 'native-pdf'|'native-docx'|'native-text'|'native-image'
  parser_version TEXT NOT NULL,                      -- 依赖包版本字符串;未来重物化的可验证依据
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','parsing','publishing','materialized','failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  projection_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
  error_code TEXT,                                   -- 'unsupported_format'|'invalid_or_corrupt'|'resource_limit'|'parser_failure'|'internal_interrupted'
  error_message TEXT,
  started_at TEXT, completed_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (status = 'materialized' AND projection_note_id IS NOT NULL)
    OR (status != 'materialized' AND projection_note_id IS NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_mat_one_per_record
  ON source_materializations(source_record_id);      -- ★v1 简化:每 Source 恰一 run 行(见 §2.2)
                                                     --   未来重解析时代:降级为 partial unique(仅 in-flight)+完成行多版本

CREATE TABLE IF NOT EXISTS source_project_placements ( -- ④Project 镜头可见关系
  id TEXT PRIMARY KEY,
  source_record_id TEXT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_placement_unique
  ON source_project_placements(source_record_id, course_id);
CREATE INDEX IF NOT EXISTS idx_source_placement_course ON source_project_placements(user_id, course_id);

-- ============ 既有表 alter(全部 safeAlter + 事后列断言,断言失败则 throw) ============
ALTER TABLE notes ADD COLUMN note_class TEXT NOT NULL DEFAULT 'user';
--   合法值 'user'|'source_projection'|'system'(validator/constructor/服务三层约束;DB 无 CHECK——safeAlter 加不了)
--   backfill:UPDATE notes SET note_class='system' WHERE page_format='canvas_backing'(列判据即全集,无 status 过滤)
--   ★前向路径:learningCanvases/compositionTemplates 两个 backing INSERT 补写 note_class='system'
ALTER TABLE note_block_sources ADD COLUMN source_record_id TEXT;           -- 薄引用指稳定身份
ALTER TABLE note_block_sources ADD COLUMN source_materialization_id TEXT;  -- 精确投影定位(可空)
--   删除语义:应用层置 NULL(SQLite safeAlter 无法补 FK;由 Source 硬删事务显式 UPDATE ... SET NULL)
--   收据列(source_excerpt/locator/模式)永不随删清空
ALTER TABLE courses ADD COLUMN system_kind TEXT;     -- 'home'|NULL;不用语义模糊的 is_system
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_system_kind
  ON courses(user_id, system_kind) WHERE system_kind IS NOT NULL;          -- 每用户每种系统容器至多一个
```

**投影笔记的 course 归属**：projection note 建在其**创建时刻的 placement course**（Project 上传=该 Project;库上传=Home）。多镜头打开走 `source_record → current materialization → projection_note_id` 的 by-id 链,与 note 列表无关（GET /:id 不过滤）。move-to-Home 时按策略注册表整体迁移。

## 2. 六项协议（Plan v3 §0 点名件）

### 2.1 上传与文件补偿协议（选定:协议一「DB staging → rename → DB ready」）

```text
1  流式收到 temp（<SOURCE_BLOB_DIR>/.tmp/<uuid>）,边收边算 SHA-256;
   校验:扩展名+MIME+magic-byte+50MB 上限(全版本统一)+parser 安全限(页数/解压膨胀,见 §3.5)
2  单事务:按 (user_id, hash) 查——
   命中 ready 行 → 幂等 INSERT OR IGNORE 当前 Project placement;COMMIT;删 temp;返回既有 Source
   命中 staging 陈旧行(>1h) → 删旧行(其 blob 交清扫);按未命中续
   未命中 → INSERT source_records + source_files(staging,storage_key=终位) + placement
            + source_materializations(received);COMMIT
   (UNIQUE 竞态冲突 → 重查按命中处理;绝不 500)
3  rename temp → storage_key(同盘原子)
4  UPDATE source_files SET storage_state='ready'
5  此刻才返回「已收」——收永远成功的承诺以 ready 为准
补偿:
- 第2步后崩 → staging 行无 blob → 启动清扫:storage_key 无文件的 staging 行连带 record 删除
- 第3步败 → 补偿事务删本次 insert 的行;temp 交清扫;返回"上传失败请重试"(从未声称已收)
- 第3/4步间崩 → blob 在终位+行 staging → 启动清扫:文件存在则补 flip ready(恢复),不存在则删行
- temp 孤儿 → 启动清扫删 .tmp/ 下 >1h 文件
- ready 行读时 blob 缺失 → 条目标错(error_code='blob_missing'),绝不 500
```

### 2.2 Current materialization 唯一规则 + 原子发布与 retry 协议

- **v1 唯一规则**：`UNIQUE(source_record_id)` —— 每 Source **恰一** run 行（1 文件×1 parser 的 v1 现实）;**current projection = 该行 status='materialized' 时的 projection_note_id**,别无二义。retry **复用同一行**（attempt_count++）,永不产生第二行/第二投影。未来重解析时代的扩展路径已注释在索引旁（partial unique 只锁 in-flight,完成行按 completed_at 选 current）——additive,不动身份根。
- **状态机**：`received → parsing → publishing → materialized | failed`
  - **claim**（防并发重试）：`UPDATE ... SET status='parsing', attempt_count=attempt_count+1, started_at=now WHERE id=? AND status IN ('received','failed')` —— 单语句抢占,输者 no-op;
  - **parse 在发布事务外**运行,产出 transient SourceArtifact（内存 JSON,不落表）;
  - **原子发布**：`status='publishing'` 后单事务完成 投影 note + blocks + placements + canvas 对象 + note_block_sources 收据 + operation_batch + `SET projection_note_id, status='materialized', completed_at` → COMMIT。better-sqlite3 同步事务 = 半成品零暴露窗;
  - **不变量**：`projection_note_id IS NOT NULL ⇔ status='materialized'`（CHECK 已建);
  - **启动 sweep**：`parsing`/`publishing` 超时行（>10min）→ `failed, error_code='internal_interrupted'`（可重试);
  - **typed errors**：`unsupported_format | invalid_or_corrupt | resource_limit`（不可重试,不显示 retry 按钮）/ `parser_failure | internal_interrupted`（可重试）。

### 2.3 Source 硬删除补偿协议（quarantine 模式）

```text
1  统计影响:placements 数 / projection 有无 / note_block_sources 引用数 → 可见警告
2  blob:storage_key → quarantine/<fileId>(同盘原子 rename)
3  单事务:UPDATE note_block_sources SET source_record_id=NULL, source_materialization_id=NULL
          WHERE source_record_id=?(收据列原样保留);
          内部服务路径删 projection note+卫星(绕过用户路由的 4xx 守卫,walk 策略注册表 'move' 表集);
          DELETE source_records(CASCADE 清 files/materializations/placements);COMMIT
4  commit 成功 → unlink quarantine(best-effort;失败进启动清扫:quarantine/ 下 >24h 文件删除)
   commit 失败 → blob 从 quarantine 移回原位,零损
```
Project 删除的资产侧同理分阶段：**事务内只做 DB 决策**（迁移 UPDATE 先于 releaseCourseCanvasAssets——v1.1 那条顺序教训不变）,**物理 unlink 在 commit 后**走 quarantine/清扫。

### 2.4 `has_user_work` 查询定义（动态删除默认的判据,闭集）

对 doomed course 内每个 source projection note,以下**任一**成立 ⇒ 有用户劳动 ⇒ 对话默认「迁移到 Home」:
```sql
EXISTS(SELECT 1 FROM annotation_truths WHERE note_id=:n)                              -- 1 任何标注
OR EXISTS(SELECT 1 FROM content_groups WHERE note_id=:n AND status='active')          -- 2 任何活 CG
OR EXISTS(SELECT 1 FROM purposes WHERE note_id=:n AND is_note_default=0)              -- 3 非默认目的
OR EXISTS(SELECT 1 FROM note_block_placements p JOIN notes nn ON nn.id=p.note_id
          WHERE p.note_id=:n AND p.display_overrides_json IS NOT NULL
            AND p.display_overrides_json NOT IN ('','{}'))                            -- 4 表现层人工覆盖
OR (SELECT COUNT(*) FROM json_each((SELECT metadata FROM notes WHERE id=:n))
    WHERE key IN ('annotationProposals','readingInterpretations')) > 0               -- 5 metadata 赠品键(以代码常量为准)
```
**明确不算**：懒建的默认 Purpose 及其 bootstrap 边(机器产物)、物化器写入的一切、阅读位置类瞬态 metadata。**另一独立条件**：`source_record` 在其他 course 还有 placement ⇒ 同样默认迁移（保护多镜头）。两条件均否 ⇒ 默认删除投影。

### 2.5 Course-scoped 表生命周期策略注册表

新文件 `server/src/db/courseLifecyclePolicies.ts`:每张含 `course_id`（或 FK 及 courses）的表声明 `move | delete | preserve | fk-derived`:
```text
move(随投影迁 Home,15 张):  notes / note_blocks / annotation_truths / annotation_ranges /
  content_groups / content_group_members / content_group_fragments / content_group_petals /
  purposes / canvas_objects / canvas_placements / content_mounts / page_frame_extensions /
  canvas_page_collections / image_object_extensions
delete(镜头级,随 course 消亡): source_project_placements + 全部既有业务级联表(goals/decks/documents/... 维持现状语义)
preserve(SET NULL 活下来):    source_records(origin) / canvas_assets(course_id 本就 nullable)
fk-derived(骑 FK 不单独处理): note_block_placements / note_block_sources / purpose_members
```
**Contract test**：PRAGMA 扫全 schema 找 course 关联表 → 每张必须在注册表有条目,新表未登记即 fail。**迁移事务的 UPDATE 集合从注册表 'move' 集生成**——15 张清单从人肉记忆变机器不变量（6→15 的教训制度化）。

## 3. 服务端面（v1.1 核查资产,继续有效）

- **写守卫粒度**（只拒 `note_class='source_projection'`;'system' 全可写,RED 锁）：notes PUT **字段级**（拒 title/description/page_format/status,放行 metadata-only——阅读诠释/标注提案/排版骑 metadata）;notes DELETE(trash)→4xx;块创建/重排+noteBlocks PUT/DELETE 按块 `source_kind`;**canvas-objects create/update/delete→4xx**（物化图片的旁路）;block-placement display-override PUT 放行（表现层,记录为决定）。目的/标注/CG 专用路由开放。Source 硬删走**内部服务路径**绕守卫。
- **5 台扫描机 must-exclude**：模板迁移(126-145)/领域细化(228-246,×2 写路径)/模板用量(692)/兼容报告(1021)+ **source-anchors/generate**（source_projection 查看跳过 fetch + 候选查询加 `document_id IS NOT NULL`）。
- **物化器**：★新建 service 直接 INSERT（形状照 organizedNoteProposals.ts:433-490),**不复用任何既有插入助手**（四条现存路径全盖模板 metadata 章);块 metadata 携 page_index/provider（bbox/confidence 留位）。
- **解析后端 pin**：PDF=**pdf-parse 2.x `PDFParse#getText` → `result.pages`** 驱动分页与 page_index（勿抄 documentParser.ts:55 的 1.x 死 API）;docx=mammoth 段落流 page_index=null;txt/md 直读;**image=物化为可查看 image object,本版不承诺 OCR/vision 文本**（Plan v3 口径）。
- **上传管线**：★新建独立 multer disk-temp 实例（勿动 legacy middleware/upload.ts）;mime 集=能力1(pdf/docx/txt/md/jpg/png/webp)+能力0(pptx 全名 mime/xlsx/csv 带扩展名兜底——Windows 报 application/vnd.ms-excel);50MB 统一。
- **双开打开习语**：认证 fetch → objectURL → window.open（Bearer-only 下裸 URL 必 401;照 canvasAssetRepository.ts:74）。
- **stale 枚举修**：normalizeSourceSyncStatus（contentGroups.ts:165-176）加 'stale';写方 canvasObjects.ts:1944/:1961 勿动;测试=stale 行经 读→组保存往返 不被洗成 fresh。
- **资源边界**：50MB 上限 + PDF 页数上限(建议 1000)+Block 数上限(建议 5000)+解压膨胀上限(zip 型格式建议 5×)+解析超时(建议 120s→resource_limit)。

## 4. v1 行为简化声明（限制在服务层,地基不装 1:1 假设）

每 Source 一个事实文件、一个 run、一个投影;去重对话两选项（"作为新版本"随出版机器后置）;重物化无 UI（孤儿态文案="原件仍在;重建能力后续提供"——**不承诺可重建**）;placement 无手动管理 UI（上传/去重自动建,course 删自动清）。全部为服务层限制,schema 不假设。

## 5. 与 Plan v3 的对表记录（2026-07-11 短审查）

- 逐节比对 Plan §2-§4 与本 v2:四层职责/FK 方向/UNIQUE 集/状态机枚举/删除协议/has_user_work/注册表——**无冲突**。
- 两处 v1.1→v2 的**有意变更**已同步：①`note_block_sources` 指 `source_record_id`(+materialization_id),不再是 v1.1 的 source_file_id;②image 能力1 不再含 vision 文本地板（Plan v3 明确"不承诺 OCR 文本理解",与"太简单的 API 链不值得背验收债"同判据）。
- 一处 Plan 未明说、本 v2 补位的决定：**投影 note 的 course 归属 = 创建时刻的 placement course**（§1 末段)——如 Codex 有异议在 10.1 提出。
- 一处 Plan 的条件字段本 v2 **有意不加**：`source_block_id`（Plan §3.5"需要精确投影定位时"）——Codex 自己的审视 12.6-7 即建议删除无读路径的 speculative 字段;v1 块级定位骑既有 CG member/annotation 文法（target_id）,文档级收据由 source_record_id+materialization_id 承担。将来需要时 additive 补列,零迁移。
