> **from**: claude(Main_Designer)
> **to**: 临时工程对话1(builder)
> **status**: ready(段一侦察即可开工;段二施工候 Main_Designer 核准侦察结论)
> **单号**: VPS-F3 · 材料断桥单(两段式)
> **上游**: Tester(1) round-01 A-01/A-02(docs/brainstorm/field-tests/round-01/);Main_Designer 确诊 census 2026-11-01

# VPS-F3 · 材料断桥单(两段式)

## 〇 · 确诊与设计拍定

**病理链(HQ census)**:`source_materials`/`source_fragments`/`material_segments`(迁移 016-018 时代)全部喂自**旧 documents 管线**——`courseMaterials.ts:120` 读 `documents` 表、`:178` 读 `document_chunks`;旧管线 UI 零挂载且已停喂(TD-43)→ Project Material 恒 0、Material Map/Note Proposal/Reconcile 三按钮恒禁、Agent `create_proposal` 恒报 "No material segments found"(organizedNoteProposals.ts:152)、首页 Agent 只检索 documents 读不到 Source(A-02)。新 Source 体系(迁移 045+,source_records/转写/投影笔记)接管了「原件进门」,但其产出从未接进 material 消费层。

**设计拍定(Main_Designer)**:走**换供应商**——保留 proposal/reconcile 消费层(产品主菜),把 **Ready Source 的投影产出**接为材料来源。⛔砍消费层;「改消费面绕开 material 表」仅当侦察证明换供应商不可行时再议。

## 一 · 段一:侦察(即可开工,⛔动任何代码)

交一份拓扑侦察报告(回执本文件+短讯摘要),内容:
1. **准确拓扑图**:source_materials / source_fragments / material_segments / 各 proposal 服务的生成与消费链;三按钮各自的禁用条件(client 侧现物);
2. **换供应商的 schema 代价**:`source_materials.document_id NOT NULL REFERENCES documents` 如何容纳 Source 来源(新列 source_record_id?放宽 NOT NULL 的 SQLite 机制?)——给出最小迁移方案与迁移号(≥现役最大+1);
3. **fragment 最小来源形状**:荐 = 投影笔记的 note_blocks 文本(块级,天然有锚点,合「文字必须住 TextFlow/正文=块」的家法)——验证可行性,或给出更优来源(转写层?)及理由;
4. **A-02 边界**:首页 Agent 的材料检索工具当前读什么(documents/doc_chunks/向量?),把 Source 投影纳入检索面是「随本单顺手」还是「独立一单」——给出工作量级判断;
5. **删除闭环**:Source 删除(deleteSourceWithCompensation)如何同步清理其 material 行——方案里必须有这一腿,否则删 Source 留孤儿材料。

**段一回执后停,候 Main_Designer 核准方案再开段二。**

## 二 · 段二:施工(候核准,按核准后的方案细则)

预期骨架(以核准为准):新迁移 + 桥接(材料 refresh 时 documents∪source_records 双源,旧行为向后兼容)+ 三按钮随材料出现自然解禁 + Source 删除连带清材料 + 端到端 mock 链测试(上传→材料出现→create_proposal 成功)。

## 三 · 纪律(照抄现役+迁移纪律)

⛔git 写操作;⛔读 .env key 值;⛔真实模型调用;⛔用户库;⛔动依赖锁文件;合成值规矩照旧;⛔安全对抗类用例;**迁移纪律**:向后兼容(旧 documents 行照常工作)、幂等、⛔任何清库/重建指令进迁移。

## 四 · 回执协议

段一/段二各自追加 `## Result`;证据 `docs/audits/2026-11-01-vps-f3-builder/`;短讯通报里程碑。

## 五 · 不在射程

Agent 检索面改造(除非段一判「顺手」且我核准);旧 documents 管线复活;Material/Proposal 的 UI 重设计(文案批另行);岛上既存数据回填(部署后运维裁)。


## Result（段一 · 侦察）— 2026-11-01 · 临时工程对话1

**执行状态**:`段一 done`,⛔零代码改动(仓库零写入,除本回执与 audits 证据);**停线候 Main_Designer 核准方案**。
**一句话结论**:换供应商**可行**,但 schema 代价比预想大一档——必须按 SQLite 标准「12 步重建」关外键施工,**迁移跑器要先加一个开关**;照 046 先例的写法会静默清空六张子表的关联(已实验证实)。

### 1 · 拓扑图(现物)

```
【旧供应商,已停喂】documents ──→ document_chunks
        │ syncCourseMaterials (courseMaterials.ts:116,每次 list 都跑)
        ▼
source_materials (1/文档, UNIQUE(user_id, document_id), document_id NOT NULL→documents CASCADE)
        │ ensureFragmentsForMaterial (:169) —— 每个 chunk 1 条;无 chunk 时整篇 1 条
        ▼
source_fragments (document_id NOT NULL→documents CASCADE, document_chunk_id→chunks SET NULL)
        │ ensureSegmentsForMaterial (:349) —— 1 条 document 段 + 每个 heading 组 + 每个页段 + 每 5 个 fragment 1 个 chunk_group
        ▼
material_segments ←→ material_segment_fragments
        │
        ├─ organizedNoteProposals.ts —— 选段(:99-156,无段即抛「No material segments found…」:152)→ 生成笔记,receipt 写 note_block_sources(document_id/chunk_id,:361-400)
        ├─ materialMapProposals.ts —— 按 material/document 过滤(:61-66)
        ├─ materialReconciliationProposals.ts / reconciliationSafety.ts —— 证据链
        └─ sourceSnapshots / sourceScopes / sourceAnchors / sourceBoards / learning canvas —— 引用 material/fragment/segment id
```

**引用 source_materials / source_fragments / material_segments 的子表(FK)**:evidence_items、excluded_material_scopes(017/018,SET NULL);source_snapshots(019,**CASCADE**);source_anchors、source_scopes(020/021,SET NULL);source_board_nodes、canvas_nodes(022/023,SET NULL);外加 fragment/segment 自身级联链。

**三按钮禁用条件(client `CourseDetail.tsx:912-914` + `:990/998/1006`)**——全部由材料派生,材料出现即自然解禁:
- Material Map:`materials.some(fragment_status === 'ready')`
- Note Proposal:`acceptedSegmentCount > 0 || totalSegmentCount > 0`(段由 `fetchMaterials` 对 ready 材料逐个拉 `/segments` 时惰性生成,`:441-466`)
- Reconcile:同 Material Map
- 三者另受 `proposalBusy` / `materialLoading` 约束。另:`:1074` 快照按钮以 `materials.length === 0` 禁用——**Source 材料接进来后它会解禁,但快照服务只认 documents(见 §2 附带风险)**。

### 2 · 换供应商的 schema 代价与最小迁移方案

**障碍不止一处**:`source_materials.document_id` 与 `source_fragments.document_id` **都是** `NOT NULL REFERENCES documents`。SQLite 无法 ALTER 掉 NOT NULL,只能重建表。

**⚠️ 关键发现:不能照抄 046 的重建写法。** 迁移跑器(`db/migrate.ts:107`)把每个迁移包在事务里,事务内 `PRAGMA foreign_keys` 无法切换 → 外键始终 ON。SQLite 3.49.2 / `legacy_alter_table=0` 下,`ALTER TABLE x RENAME TO x_legacy` 会**把所有子表的 FK 改写指向 x_legacy**,随后 `DROP TABLE x_legacy` 触发隐式删除 → SET NULL 子表被置空、CASCADE 子表被删光,且子表留下指向不存在表的 FK。最小实验已证实(证据 `docs/audits/2026-11-01-vps-f3-builder/rebuild-experiment.txt`:A 式 child.pid→null、child2 清空、FK 改指 `parent_legacy`;B 式关外键 12 步,数据与 FK 完好)。对 source_materials 而言,A 式等于清空岛上全部证据/锚点/范围/快照关联。
(旁证:新建库上全表 FK 目标核查 = 0 条悬空,046 当年因唯一子表随后也被重建而侥幸无害;本单不触碰。)

**最小方案(荐)**:
- **跑器小改**(`db/migrate.ts`):`Migration` 增可选 `foreignKeysOff?: true`;对这类迁移,在事务**外**先 `PRAGMA foreign_keys = OFF`,事务内跑 up + `PRAGMA foreign_key_check`(有行即抛、回滚),`finally` 恢复 `ON`。其余迁移行为不变。
- **迁移 `084_v2_material_source_bridge`**(现役最大 083),标 `foreignKeysOff`,12 步重建两表:
  - `source_materials`:`document_id` 放宽为可空;新增 `source_record_id TEXT REFERENCES source_records(id) ON DELETE CASCADE`;CHECK 约束要求 document_id 与 source_record_id 恰有一个非空;`source_type` 取 document / source;保留 `UNIQUE(user_id, document_id)`(SQLite 唯一约束中 NULL 互不相等,Source 行不冲突),新增唯一索引 `(user_id, source_record_id, course_id)`;
  - `source_fragments`:`document_id` 放宽可空;新增 `source_record_id`(同上 CASCADE)与 `note_block_id TEXT`(**不加 FK**,见 §3 重投影);
  - 全部旧列与 course_id CASCADE 原样(课程生命周期登记表 `courseLifecyclePolicies.ts:68/80/81` 不受影响);重建后复建全部既有索引;
  - **幂等**:先读 `PRAGMA table_info(source_materials)`,若 `document_id.notnull = 0` 且已有 `source_record_id` 列则直接返回。
- **`schema.sql` 同步(⚠️坑)**:`schema.sql` 在**每次启动、迁移之前**对新旧库都跑一遍。两张表的 CREATE 应改为新形状(新库直接生对);但**新列上的索引不能写进 schema.sql**——老库此时还是旧形状,索引语句会因列不存在而崩。新索引只放迁移。
- **向后兼容**:旧 documents 行原样迁过去,`document_id` 非空、`source_record_id` 为空,`syncCourseMaterials` 的 documents 分支不改。
- **否决的替代**:①给每个 Source 造「影子 documents 行」——会出现在项目页「Legacy documents」列表与 Agent `search_documents` 里,且要伪造 file_path;②`writable_schema` 直改建表语句——不安全。

**附带风险(段二须处理)**:
- `listCourseMaterials` 用 `JOIN documents`(`courseMaterials.ts:262`)——必须改 LEFT JOIN,否则 Source 行被静默滤掉;
- `listSourceFragments` / `ensureFragmentsForMaterial` 按 document 拉取,需加 Source 分支;
- 快照服务(`sourceSnapshots.ts`)只认 documents,`source_snapshots.document_id NOT NULL`:对 Source 材料应在服务端明确拒绝(或客户端按钮按 source_type 禁用),⛔让它 500;
- 生成笔记的 receipt(`organizedNoteProposals.ts:361`)目前只写 document_id/chunk_id——Source 来源应写进 `note_block_sources.source_record_id`(列已存在,046 加的),否则新笔记无可追溯出处。

### 3 · fragment 最小来源形状:投影笔记的块 → 可行,荐采纳

验证依据(`sourceProjectionMaterializer.ts:497-570`):每个投影块写入 `note_blocks`,`source_kind='source_projection'`,`block_type` 为 heading/paragraph,`plain_text` 即正文,heading 块的 `title` 即标题,`metadata` 含 `source_page_index`、`source_locator`、`artifact_block_id`,并同时写一条 receipt 到 `note_block_sources`(带 `source_record_id`)。映射:
- `content = plain_text`;`title` = 最近一个 heading 块的文本(让既有「按 heading 分组」段逻辑直接生效);`page_start/end = source_page_index`;`fragment_type` = `page_range`(有页码)/ `chunk`(docx 等无页码);`metadata` 带 locator + artifact_block_id;`note_block_id` = 块 id;
- 投影块 id 是确定性的(`projectionIdentity(sourceFileId,'block',artifact_block_id)`),同一原件重投影 id 稳定;
- 合家法:正文=块,fragment 指回 TextFlow 块而非另存一份原件文本。

**颗粒度取舍(候裁)**:一块一 fragment 最贴锚点,但大件(上限 5000 块)会让段数 ≈ 块数/5 + 页数 + heading 数;若嫌多,备选「一页一 fragment」(docx 无页码时退回每 N 块一条)。**荐:一块一 fragment**——段生成本就是惰性、按材料触发。

**不选转写层(imprint)的理由**:`imprint_fragments` 只在 VLM 转写跑过且 `accepted` 后存在,不是每个 Source 都有;投影则是每个 materialized Source 必有。imprint 可作日后增强源。

**重投影(Rebuild projection)的后果(候裁)**:重投影删旧块、按确定性 id 重建。fragment 需按 materialization 的 `updated_at` / `attempt_count` 判定陈旧后重建 → 旧 fragment 被删 → `material_segment_fragments` 链接与段的 accepted 状态随之丢失,证据/锚点等子表按 SET NULL 降级。荐:**重投影即重建该材料的 fragment 与 segment**(简单且诚实);如需保留 accepted 段,属另案。

**多项目放置(候裁)**:一个 Source 可放进多个项目(`source_project_placements`),投影笔记只住一个项目。荐:**每个 (Source, 项目放置) 一条 material**,fragment 都取自同一份投影;material 的 course_id = 放置项目。

### 4 · A-02 边界

- 首页 Agent 的材料检索只有 `search_documents` / `get_document_content`(`agent/tools/executor.ts:612-`):三路检索 = 向量 `doc_chunk_vec` + FTS `document_chunks_fts` + `documents.filename/summary` LIKE——**全在旧 documents 管线**,Source 一个也碰不到。系统提示词还写死了这条边界并让用户「经材料库上传」(`agent/system-prompt.ts:38`)——那个入口已不存在,是误导。
- 有利现物:`read_note` 读工具(`executor.ts:56`)已经能读投影笔记;缺的只是**发现**(Agent 不知道有哪些 Source、对应哪篇投影笔记)。`note_blocks` 没有 FTS 表。
- **判断**:
  - **顺手可做的低配版**(段二完成后,约半天):`search_documents` 增一路「Source 材料」——对 Source 来源的 fragment 做 LIKE + 按 display_name 匹配,结果带 `projection_note_id` 让 Agent 接 `read_note`;同步改掉 system-prompt:38 的误导句。依赖段二的 fragment,所以只能排在段二之后。
  - **完整版**(Source 进向量/FTS 检索,与 documents 同等召回)= **独立一单**:要建 note_blocks 或 fragment 的 FTS 表、嵌入回填、结果形状统一,工作量 ≥ 段二本身。
  - 荐:本单不带 A-02;段二收口后,由 Main_Designer 裁定是否立「低配版」小单。

### 5 · 删除闭环

- 有了 `source_materials.source_record_id … ON DELETE CASCADE` 与 `source_fragments.source_record_id … ON DELETE CASCADE`,`deleteSourceWithCompensation`(`sourceLifecycle.ts:116`,事务内、外键 ON)里的 `DELETE FROM source_records` 会**自动**连带删除 material → fragment → segment / segment_fragments,子表按既有 SET NULL / CASCADE 降级。**服务代码无需改动**,删除腿由 schema 承担。
- 段二须补的测试:删 Source 后其 material/fragment/segment 计数为 0,且 evidence_items 等子表的引用被置空而非悬空。
- 项目删除:material 的 `course_id` 仍 CASCADE(登记表已覆盖);「移到 Home」分支下投影笔记留存,但该项目的 material 随项目删除——符合「材料是项目镜头」的语义。

### 段二工作量预估(供核准参考)

跑器开关 + 084 迁移(含幂等与 schema.sql 同步)+ syncCourseMaterials 的 Source 分支 + LEFT JOIN 修正 + fragment/segment 的 Source 取数 + receipt 写 source_record_id + 快照对 Source 的明确拒绝 + 测试(迁移幂等 / 老数据保真 / 子表关联完好的 12 步对照、上传→材料出现→create_proposal 成功的端到端 mock 链、删除闭环、重投影重建)。估 **1–1.5 个工作段**,比 F1/F2 重一档,主要成本在迁移与测试。

### 候 Main_Designer 裁定的点

1. 迁移跑器加 `foreignKeysOff` 开关(动共享基础设施)——准否;
2. fragment 颗粒度:一块一条(荐)/ 一页一条;
3. 重投影 = 重建 fragment/segment、丢 accepted 状态(荐)——准否;
4. 多项目放置 = 每个放置一条 material(荐);
5. A-02 低配版是否在段二后立小单;
6. 快照按钮对 Source 材料:服务端拒绝 + 客户端禁用(荐)/ 只服务端拒绝。

### 证据与环境申报

- `docs/audits/2026-11-01-vps-f3-builder/rebuild-experiment.txt`:A/B 两式重建的内存库对照实验(better-sqlite3,SQLite 3.49.2)。
- 悬空 FK 核查:仓外一次性脚本对新建内存库跑 `PRAGMA foreign_key_list` 全表 → 0 条;`sqlite_master` 中含 `_legacy` 字样的只有 `template_definitions`,经核不是 FK 目标。
- 仓外脚本首次运行因 CJS 不支持顶层 await、Windows 盘符路径不被 ESM 加载器接受而失败,改 `.mts` + `file:///` 后正常;回执追加时 Bash heredoc 引号解析再次失败(同 P1),改为先落文件再追加。均属工具摩擦,与产品无关。
- 未读 `.env`;无 git 写操作;无用户库接触;无真实模型调用;仓库代码零改动。


### Result 补节(段一 · 第四问补证)— 2026-11-01 · 临时工程对话1

依 Main_Designer 补充证据(岛上 `/api/embedding/status` = chunks 0/0、memories 0/0)补查。仍只读、零代码改动。

**① doc_chunk 的完整生成链与触发点**

`POST /api/documents/upload` 与 `/:id/reparse`(`routes/documents.ts:56/164`)→ `parseDocument`(`services/documentParser.ts:281`)→ 抽文本、切块写 `document_chunks`(:354),FTS 表 `document_chunks_fts` 由 init.ts 的触发器同步 → `generateChunkEmbeddings`(:415 起)经 `getEmbeddingProvider` 写 `doc_chunk_vec`(:445/:458)。补齐入口只有 `POST /api/embedding/backfill`,它同样只扫 `document_chunks` / `documents`。
**唯一触发点是旧上传路由,而它在 UI 上已无入口**:唯一的调用方 `documentStore.upload` 只被 `components/DocumentManager` 使用,全仓**没有任何地方挂载 `DocumentManager`**。所以岛上 chunks 0/0 是必然结果。Agent 的 `search_documents` 三路检索(向量 `doc_chunk_vec` / FTS `document_chunks_fts` / documents LIKE)全部建立在这条死管线上。

**memories 0/0 不是断桥**:`agent_memory_vec` 由 `agent/memory/service.ts:91 generateMemoryEmbedding` 在每条记忆写入时后台生成,与材料管线无关;0/0 只说明该账号还没有 Agent 记忆。有记忆后会走百炼(P1 已接),值得在部署冒烟时顺带验证一次。

**② Source 投影是否进了任何向量索引 → 没有**

- 投影块(`note_blocks`,`source_kind='source_projection'`)不进 `doc_chunk_vec`,不进任何 FTS,也不进 `imprint_fragment_vectors`。
- `imprint_fragment_vectors` 是另一条孤立管线:VLM 转写产出 `imprint_fragments` → 只由运维脚本 `scripts/embed-imprint-fragments.mjs` 嵌入 → 只由 `GET /api/imprint-retrieval` 消费。该路由**在 client 与 Agent 中都零引用**,不连通 Agent 的记忆检索与材料检索,也不连通 material 体系。只有跑过转写并被接受的 Source 才会有 imprint。

**③ 桥只喂 material,还是 material + 向量索引一起喂 —— 两案代价**

| | 案一:只喂 material(=已核准的段二) | 案二:material + 检索索引两张嘴 |
|---|---|---|
| 解决 | Project Material / 三按钮 / `create_proposal` 走通(A-01) | 再加:Agent 能语义检索 Source 内容(A-02 完整版) |
| 新增工程 | 无(段二原范围) | 需要新建 Source fragment 的向量表(不能复用 `doc_chunk_vec`:它的检索 JOIN `document_chunks`,Source fragment 连不上),建议仿 imprint 的形状(`fragment_id` 主键 + 模型分区);再建 FTS 表;fragment 生成后加后台嵌入任务(外部调用、计费、失败重试);扩 backfill;`search_documents` 增 Source 结果形状(指向投影笔记以接 `read_note`);改 system-prompt:38;重投影时向量随 fragment 重建 |
| 代价 | 1–1.5 段 | 段二之外**再加约 1–1.5 段**,并引入外部调用与计费面;测试需模拟嵌入供给方 |
| 风险 | 低(本地 schema + 惰性生成) | 中:fragment 是在 list 时同步惰性生成的,向量必须是异步任务,要处理「材料已现、向量未到」的中间态 |

**荐:段二只喂 material(案一),但为案二预留形状**——`source_fragments.id` 稳定、带 `source_record_id`、`note_block_id`,日后的向量表可直接以 fragment id 为键接上。检索面按你已预批的顺序走:先上 A-02 低配版(LIKE + `read_note`,不要向量,约半天),再视需要把向量版立为独立单。两张嘴合进段二会使段二体量翻倍,并把外部调用面混进一次迁移施工。

**邻近观察(不在本单修)**:测试账号设置页向量栏高亮 Voyage、实际 status 却是 dashscope,即 UI 显示的是默认值而非生效状态。**此项已在 F4-1 一并修掉**:`Settings.tsx` 在用户未显式选择时,用 `/embedding/status` 的 `provider_name` 显示实际生效的那家(聊天提供方同理),见 F4 回执,随 F4 部署即生效。
