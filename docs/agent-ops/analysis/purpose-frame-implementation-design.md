> **状态 (Status)**: **v1 定稿**（2026-07-05；v0 经 4 维对抗核查 wrjge82ql 全 CONFIRMED 修正回填；Henry 已拍全部判断点）
> **层 (Layer)**: 现状 / Current-State（Agent 分析 · 实现设计）
> **权威 (Authoritative)**: 实现设计=是（`docs/releases/V2.BN.9-plan.md` 的技术底稿）；模型框架以会议记录 §七.6–七.11 + `purpose-frame-build-decomposition.md` 为准
> **第一约束**: **尽量少返工** —— 每个决定标注它为 U3 快照 / U4 词表池 / U5 拆墙 / 装配管线留的口子。
> **核查记录**: 4 维（迁移数据安全 / 服务端契合 / 客户端消费面 / 少返工语法）全 sound-with-fixes；行号锚点已逐一实证。本 v1 已整合全部 CONFIRMED 修正——关键翻案见 §6-c'。

# 目的（purposes / 圈）实现设计 · v1 定稿

> **一句话**：新建 `purposes` 节点表 + `purpose_members` 边表（role/fitness/序住边上），content_groups 补 `identity_type` 轴、冻结 `identity_role`（COPY 不删、停写停发+过渡兼容），每篇笔记懒建默认目的；**传输走独立 `GET/PUT /api/purposes/by-note/:noteId` 路由对**（镜像 annotationTruths 真先例）；客户端 rebind 全部 role 读点到 type/边；UI 地板近乎无感。

---

## 0. 框架回顾（已拍定模型，一页）

```
item/member（标量：type+topic 内在、在节点）
   —(purpose_members 边：role + fitness + order_index)→  目的 purposes（意图/范围/简介）
      —渲染(apply)→  正文 note（1 目的 : 1 已提交正文）
```
- 组织=镜片（可叠多目的、非破坏）；正文=提交成品（新目的成稿=兄弟笔记）。
- 每篇笔记至少一个（主）目的；主=默认非父。
- 三轴：type=是什么（内在·节点）/ topic=讲什么（内在·节点）/ role=派什么用（**语境·边上**）。
- 本设计不碰 Source；三真相字段留在 content_group_members、边不吸收（U3 的事）。

---

## 1. Schema（migration `044_v2_purposes`）

> 迁移机制（核查实证）：runner 按文件名字典序加载、`db_migrations` 记账、**每个迁移已由 runner 包事务**（migrate.ts:111-116）→ **044 内不得自开 db.transaction**；044 号位空闲；`foreign_keys=ON`（init.ts:30）；partial unique index 受支持（better-sqlite3 ^11.7 内置 SQLite ≥3.24）。

### 1.1 `purposes`
```sql
CREATE TABLE IF NOT EXISTS purposes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,   -- nullable：镜头非墙（U5-ready）
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,        -- ⚠ 语义=「生命周期宿主」ONLY，见 §1.1.1
  title TEXT NOT NULL,
  intent TEXT,
  scope_note TEXT,
  status TEXT NOT NULL DEFAULT 'active',                      -- active | archived
  is_note_default INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT 'human',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CHECK (is_note_default = 0 OR note_id IS NOT NULL)          -- ★ 核查新增：现在免费；SQLite 事后加 CHECK=整表重建
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purposes_note_default
  ON purposes(note_id) WHERE is_note_default = 1;             -- 每笔记至多一个主目的（note id 为全局 uuid，故不含 user_id 也安全——刻意）
CREATE INDEX IF NOT EXISTS idx_purposes_user_note ON purposes(user_id, note_id, status);
CREATE INDEX IF NOT EXISTS idx_purposes_user_course ON purposes(user_id, course_id, status);
```

**§1.1.1 note_id 语义声明（核查修正·防兄弟笔记返工）**：`note_id` = **生命周期宿主 ONLY**，**不是**"渲染目标"。未来兄弟笔记（目的 P2 在 note A 上组织、apply 产出 note B）的渲染绑定 = **将来 additive**（`render_note_id` 列或 apply 时新建 `purpose_renders` 行），不复用 note_id。**客户端不得假设 purpose_members.member_id 都能在当前 note payload 里解析**（`roleForMember` 对解析不到的成员返回 null、不 throw）。改绑规则：UPDATE note_id 时若目标 note 已有默认目的，必须先清 is_note_default。

**§1.1.2 笔记回收站语义（核查修正）**：notes **没有硬删**（DELETE /api/notes/:id = 软 trash，routes/notes.ts:193-201）→ note_id CASCADE 只在 course/user 硬删时触发。**trash note → 其目的+边原样休眠（note-scoped 读取自然不再返回）→ restore 即复活**。此为设计语义，配 RED 测试锁（§2 测试 #7）。

**§1.1.3 U5 遗留提示**：未来跨 course 目的（note_id NULL）在 course 硬删时经 SET NULL 存活、但其 member CG 被 `content_groups.course_id NOT NULL CASCADE` 硬删 → **U5 spec 必须给 course teardown 加 purpose_members 清扫（或读时悬空过滤）** —— image-asset 孤儿教训的同型，先记在此。v1 不可达（所有目的 note-hosted、随 note 级联死）。

### 1.2 `purpose_members`（边 —— role 的新家）
```sql
CREATE TABLE IF NOT EXISTS purpose_members (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose_id TEXT NOT NULL REFERENCES purposes(id) ON DELETE CASCADE,
  member_kind TEXT NOT NULL DEFAULT 'content_group',          -- v1 只 'content_group'；多态留口（先例 033:29-30 kind+target_id 无 FK）
  member_id TEXT NOT NULL,                                    -- ⚠ CG id 非 uuid：validator 用 string(1..180)，勿用 .uuid()
  role TEXT,
  fitness TEXT NOT NULL DEFAULT 'unknown',                    -- v1 只读直通（read-only passthrough）：不建 UI、不写测试断言，状态机后置
  order_index INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(purpose_id, member_kind, member_id)
);
CREATE INDEX IF NOT EXISTS idx_purpose_members_order ON purpose_members(user_id, purpose_id, order_index);
CREATE INDEX IF NOT EXISTS idx_purpose_members_member ON purpose_members(user_id, member_kind, member_id);
```
- 命名用"members"避开 folder-placement 词汇撞车；边不吸收三真相。
- **因复合 UNIQUE 存在，replace 语义不得镜像 replaceContentGroupMembers 的 ON CONFLICT(id) upsert**（客户端惯例会给既有 (purpose,member) 对 mint 新边 id → SQLITE_CONSTRAINT 500）。**采 annotationTruths 的 delete-all+insert 全量替换习语**（annotationTruths.ts:387-416，payload 带 created_at）+ 服务端 payload 去重。

### 1.3 content_groups 改动（同一 migration）
```sql
-- ★ 核查修正：必须用 house safeAlter try/catch（002_task_upgrade.ts:3-5 先例）——
--    schema.sql 每次启动先于迁移执行且含 content_groups 全定义（init.ts:32-43），裸 ALTER 是潜在 duplicate-column 启动雷
safeAlter(db, 'ALTER TABLE content_groups ADD COLUMN identity_type TEXT;');
UPDATE content_groups SET identity_type = identity_role
  WHERE identity_role IS NOT NULL AND identity_type IS NULL;   -- COPY 非 MOVE、幂等
-- identity_role 列物理保留、冻结（停写停发）；后续版本再 DROP
```
- **明确指令：不改 schema.sql**（其与迁移的同步止于 ~034；035+ 的表只活在迁移里）。
- 冻结面（核查实证仅 4 处）：contentGroups.ts:344(hydrate 读)/:380(dbValues)/:847,:856,:871(upsert SQL)。validator 是非 strict z.object → 旧客户端多发的 role 键被静默剥、不 400。
- **过渡兼容（核查新增·堵 stale-client 清空窗）**：freeze 窗口内 `contentGroupDbValues` 写 `identity_type = optionalText(identity.type) ?? optionalText(identity.role)`（旧 payload 兜住）；`hydrateContentGroup` **双发** `type` 与 `role`（都读 identity_type）直到 P3 落地；物理 DROP identity_role 的那个未来迁移再拆双路。

### 1.4 默认目的（懒建）
- `ensureNoteDefaultPurpose`：**住在 `listNotePurposes` 里**（新 GET 的 handler 调用），**不碰 getNoteCanvasPersistence**（它是纯读、且被 savePageFrameCollection 的写事务内部调用——不得给它焊写入）。先 `getOwnedNote` 归属校验。
- 写法（核查修正·防 GET 并发 500）：单事务内 `INSERT ... ON CONFLICT DO NOTHING` 后 re-select；成员 bootstrap 同事务、`INSERT OR IGNORE`。
- **bootstrap 查询必须滤活**：`WHERE user_id=? AND note_id=? AND status='active' ORDER BY created_at ASC, id ASC`（软删 CG 行仍在表里，不滤=开局挂墓碑成员）。
- **成员漂移规则（核查新增·拍定）**：bootstrap 是一次性的；此后 **role 写接口 upsert 边**——对无边的 (默认目的, CG) 写 role 时自动建边（order_index=append）→ 边惰性一致。新 CG 自动入默认目的 = P4 随目的管理 UI 一起议。

---

## 2. 服务端面（P1）

| 件 | 做法（核查修正后） |
|---|---|
| **路由（★核查翻案）** | **新建 `routes/purposes.ts`：`GET/PUT /api/purposes/by-note/:noteId`，镜像 `routes/annotationTruths.ts:23-40`**（那才是真先例——annotation truths **不**走 canvas persistence，各 truth 各有 by-note 路由对；canvas persistence 根本没有整体 PUT）。挂载进 index.ts 路由块。**v1 仍不开 /api/purposes/:id 通用 CRUD**。 |
| `services/purposes.ts` | `ensureNoteDefaultPurpose` / `listNotePurposes`（含边、hydrate 嵌套 DTO；ensure 在此）/ `replaceNotePurposes`（**delete-all+insert** 全量替换 + 去重，annotationTruths 习语） |
| contentGroups 改 | hydrate：identity **发 type**（过渡期双发 role=identity_type）；dbValues/upsert 列：identity_role→identity_type（过渡 coalesce）；`replaceNoteContentGroups` 不变 |
| validator | identity schema：+type（过渡期 role 保留为 accepted-deprecated）；新 `replaceNotePurposesSchema`：显式 shape、`member_id` string(1..180)、purposes `.max(100)`、每 purpose members `.max(500)`（house 界限惯例） |
| **CG 软删与边（★判断点 c 翻案）** | **CG 只有软删（status='deleted'，可经 upsert 复活）、无硬删路径** → **不得在软删时清边**（清了=可撤销的删除变不可逆丢 role/fitness/序=红线）。**边保留；hydrate/roleForMember 读时过滤 member 为 status='deleted' 的边**（= deleteCanvasObject 先例的 detach 精神 + 相对不焊读时派生）。物理清边只留给真硬删（course/user CASCADE 已覆盖）。 |

**RED-first 测试锁（P1 验收，核查修正后 8 条）**：
1. backfill 保真：identity_role='definition' → 044 → identity_type='definition' 且旧列仍在；
2. 主目的唯一：二次 ensure 不重复（partial unique + ON CONFLICT DO NOTHING 路径）；
3. 边全量替换往返：增/改序/删；payload 重复成员被去重不 500；
4. **CG 软删→边存活**：软删 CG → 边仍在但 hydrate 过滤；**复活 CG（upsert status='active'）→ role/fitness/序原样回来**；
5. 级联：删 course → note → 目的 → 边全链清；
6. 目的删除 ≠ 内容删除：删目的只删边，CG/member 无损；
7. **note trash→restore**：默认目的+边休眠后原样复活；
8. hydrate 契约：identity 含 type（过渡期双发 role）；purposes[] 形状；bootstrap 只挂 active CG。

---

## 3. 客户端面（P2+P3）

### 3.1 模型（runtimeDataTypes.ts）
- `ContentGroupIdentityV1`：删 role、加 type（identity 是嵌套对象、局部改动）。
- 新 `PurposeV1` / `PurposeMemberV1`（同 v0，fitness 标记 passthrough）。

### 3.2 服务与传输
- **新 `purposeRepository.ts`**：镜像 `annotationTruthRepository.ts:48,68` 的 by-note GET/PUT。
- **adapter**：useNoteCanvasDataAdapter 照既有"四个 by-note repository 并列"模式（imports :59-:79）挂第五个；乐观保存+独立回滚+toast（:465-509 既有 per-domain 模式）。
- `purposeService.ts`：normalize / roleForMember（**唯一 role 读口；解析不到返回 null**）/ 边操作（**写 role 时无边则 upsert 边**）。
- `contentGroupService.ts`：normalize 的 type 取值 = **三段回退 `existing.type ?? existing.role ?? interpretation.role`**（核查新增——legacy note-metadata 导入路径 contentGroupRepository.ts:32-38 仍活着，只喂 interpretation.role 会静默丢用户 role 值）+ 契约断言锁；`updateContentGroupIdentityDraft` 拆两支（type/topic/summary→节点；role→purposeService 边接口）。
- **双写手语义（核查拍定）**：编辑器一次 Save = **两个独立乐观写**（① group PUT 先、② purposes PUT 后），各自回滚+toast，**v1 不要求跨写原子**（= house per-domain 既有风格）；role 从 `ContentGroupEditorDraft` 移除、编辑器持独立 edge-draft。
- **v1 role 粒度诚实声明（核查新增）**：v1 边只到 member_kind='content_group' → **group 级候选从边取 role；member/petal 级候选 = 继承组的边 role（或 null）**，真 per-item role 等 member_kind 扩枚举（P4）。投影/契约断言按此 shape 写，防"假 per-member"复发。

### 3.3 消费面 rebind（核查后穷尽版·17 处）
| 消费点 | 改法 |
|---|---|
| contentGroupRailShellModel.ts:67 roleLabel + :106 haystack | → typeLabel（值原样） |
| ContentGroupPanel.tsx:105-109 sort + :493 badge（+RailViewMode :67-74 本地 state 非持久） | → type |
| **GroupGallery mode（枚举有两份！）**：`GalleryMode`（groupGalleryData.ts:24，**实际被 import 的那份**）+ `GalleryShellMode`（shellModel:15）+ tabs :62 + `safeGalleryMode` URL 白名单 :112-114 + params.set :384 + label :31-35 | 'role'→'type'；**safeGalleryMode 加 legacy 映射 `'role'→'type'`**（旧 URL/书签不降级成 folder 视图）；两份枚举建议顺手合一 |
| GroupGallery.tsx:239 搜索 haystack | role→type |
| SingleContentGroupEditor.tsx:178-359 + **:668** + singleContentGroupEditorService.ts:10-45（EditorDraft 含 role→移除）+ **singleContentGroupEditorShellModel.ts:23,66** | type 选择/输入；role 编辑=独立 edge-draft（双写语义见 §3.2） |
| contentGroupRelationProjectionService.ts:48,70,87（假 per-member 三处） | group 级从边取；member/petal 继承或 null（§3.2 粒度声明） |
| contentGroupIndexService.ts:49-50 索引 + :74,82 **role filter 参数及其 caller** | →type |
| readingInterpretationService.ts:164-202 投影 | 投 type/topic + role-from-edge 输入参数；**核查实证：零生产消费者、仅契约测试调用 → v1 标记 contract-only**，真 AI 接线属 Agent 时代 |
| 契约检查（真实跨度）：4613-4623 / 4647-4671 / 4827-4846 / 4980-4987 / 5331-5346 / 5384-5391 | 重写 + 新增断言：role-on-edge 往返 / type-on-node / 三段回退 normalize / 默认目的 ensure / 软删边存活 / 目的删除≠内容删除 |
| 服务端测试 fixtures：v2ContentGroups.test.ts:97-108、v2GroupFolders.test.ts:81（identity 构造含 role:null） | 更新 shape |

### 3.4 UI 地板（不变）
用户可见变化 ≈ 0：badge/分组换名 type、值原样；目的 v1 隐形；role 书写入口只留编辑器语境行。视图族/切换器/管理 UI = P4。

---

## 4. 分阶段（修正：P1–P3 = 一个部署单元）

> 核查结论：P1 单独 ship 会让未升级客户端在保存时清空 identity_type → **P1/P2/P3 作为一个版本单元交付**（V2.BN.9 内部子版本可分，但对外一起上）；§1.3 的过渡 coalesce/双发仍要做（防"开着的旧标签页"）。

| 阶段 | 内容 | 验收 |
|---|---|---|
| **P1 服务器真相** | 044 + services/purposes + **routes/purposes** + hydrate/validator 改 + 冻结&过渡兼容 | §2 八条 RED-first + 四套 suite 绿 |
| **P2 客户端模型+传输** | 类型 + purposeRepository + adapter 第五仓 + purposeService + contentGroupService 拆写手 | model-contract 新断言绿 |
| **P3 消费面 rebind + UI 地板** | §3.3 十七处 + URL legacy 映射 + 编辑器 type/edge-draft | boundary/contract 绿 + 手工冒烟（badge 值不变、旧 ?mode=role URL 不降级） |
| **P4（后续版本）** | U4 词表池（additive）；目的切换器/软木板/大纲/关系图；跨笔记圈+render 绑定（§1.1.1 预埋）；member_kind 扩 item 级；fitness 状态机+UI；新 CG 自动入默认目的 | — |

**少返工预埋口（v1 后共六）**：member_kind 多态 / course_id nullable / U4 additive 词表 / 边序=draft 序 / **note_id=host-only+render 绑定另列** / **CHECK 提前埋**（SQLite 事后加=整表重建）。

## 5. 不做什么（边界，同 v0 + 两条新增）
- （同 v0 全部：不建目的管理 UI/视图族/词表池/三真相/petals.role/物理 DROP identity_role/跨笔记圈）
- **不在 CG 软删时清边**（判断点 c 翻案，见 §2）。
- **不给 getNoteCanvasPersistence 加写入或 purposes[] 载荷**（读也不加——client normalizer :324 会剥未知键；一律走专用路由对）。

## 6. 判断点拍定记录
- a–e 同 v0（Henry 2026-07-05 拍定：`purposes` 命名 / bootstrap 自动挂 / ~~软删清边~~ / role 值迁 type / is_note_default 在 purpose 行）。
- **c' 翻案（核查 CONFIRMED，替代 c）**：原拍"删 CG 同事务清边"依据的硬删路径**不存在**（CG 只有可复活软删）→ 照原拍实现会把可撤销删除变成不可逆丢边数据（红线）。**改为：软删不清边、读时过滤、复活即恢复**（§2 表末行 + 测试 #4）。**待 Henry 复核确认。**
- **f 新增（核查驱动）**：note_id = 生命周期宿主 ONLY，渲染绑定将来 additive（§1.1.1）。
- **g 新增**：fitness v1 = read-only passthrough（列在、无 UI 无断言）。

## 7. 核查台账
v0 → v1 共整合：2 BLOCKER（传输先例错误→专用路由对；——）、4 HIGH（软删清边红线陷阱 / P1 独立 ship 清空窗 / replace 撞复合 UNIQUE / 假 per-member 粒度）、9 MED、8 LOW；核查同时**实证确认**：迁移机制/号位/backfill 安全、服务端血溅面恰如 v0 所列、~15 处 rebind 行号 85% 准确（补齐至 17 处）、四个少返工口子全部真 additive、"今天 role 值=type 值"有契约测试实证。完整台账见 workflow wrjge82ql 输出。
