> **状态 (Status)**: **v1**（2026-07-11;v0 经 3 维对抗核查 wplywx5yb 修正回填〔1 BLOCKER+6 HIGH 全收编〕;待 Henry 拍 §6 判断点 → 喂 V2.BN.11 plan〔Codex 撰写〕）
> **层 (Layer)**: 现状 / Current-State（Agent 分析 · 概念设计,V2.BN.11 模型权威）
> **模型来源**: Relation 会议记录 2026-07-11（§一~§二十,Henry 全部拍板）+ 老设计文档 + 07-10 稀疏教义;**核查台账**: 旧表活性盘点/V9-V10 接缝/schema 健全性,行号全实证
> **实测免责横幅**: 数据模型层=硬结论;交互行为层=假设(标 ⚠️实测 者一律待模拟用户实测校准)

# Relation · Item · 图谱 —— V2.BN.11 概念设计 v1

---

## 0. V2.BN.11 拿来做什么

**一句话:立起知识层的最后一根真相线。** V11 之后五真相全部落地(TextFlow/ContentGroup/Canvas/Source/**Relation**),BN 底座闭合,进入 V12 打磨。

**交付四样:**
1. **Item 独立成卡**——知识点一等公民:卡=本体+type/topic+N 锚收据;收集与成卡两段式(原料池→铸卡);CG 回归纯捆;**卡只退役不硬删**(retire-not-delete,核查 BLOCKER 修正);
2. **关系真相**——卡↔卡语义边+判断收据(关系三真相),漂移可见永不静默;无向关系一等公民(规范化存序);
3. **维护泵地板**——改动/阅读两触发器+派生工单(不建队列表)+AI 署名判定;**刻意不follow source_sync_status 的存储列模式**(读时派生,防 stale-PI 老病复发);
4. **遗产处置**——v2.4.4 三表(object_relations/canvas_edges/relation_layers)**数据全死(0 行,核查实证)**,清场=下架代码+落表;**花瓣退役=专项代码手术**(活写入环仍在,见 §5)。

**明确不做:** 图谱 UI/微观射线完整界面(归实测);GraphRAG/embedding;RelationProposal 机器(留缝);血统面板;情景方向(零工作量,行程现算存 V9 圈边 order);出版/版次(S1)。

**一条用户可见行为变化(plan 必须写明)**:V11 后删 course 不再抹掉生于该 course 的知识(卡/关系 origin SET NULL 存活)——跨域拍板的直接后果。

**分段轮廓(供 plan 参考,切法归 Codex):** 身份地板(items+锚+快照+进圈)→ 关系真相 → 维护泵 → 最小读取面(inspector 级)→ 花瓣手术与遗产清场收口。

## 1. 概念模型(已拍汇编)

```
四层楼:   原料池 ──铸卡──▶ 卡 ──捆绑──▶ 捆(CG) ──进圈──▶ 圈(Purpose)
三层结构: 内容层(会漂)→ 身份层(卡,不漂,跨笔记)→ 判断层(关系,端点只认卡)
```
- 卡=member 形状:**本体(可编辑作品)**+type/topic(固有标量)+N 锚;"用原句"=N=1 退化;
- 收集≠成卡;原料=可重建派生物(不受心爱红线辖);铸卡=快铸/融铸(模式:直引/转述/蒸馏);
- **卡只退役不硬删**;合并=新卡承锚+旧卡退役;卡与卡永不融合只捆绑;
- 端点=卡,句号;关系三真相(身份对/判断收据/关系本体);
- 方向二分:内在方向住边,情景方向住圈边 order(现算);对称关系无向(等价/类比/对比/伴生=跨域主力);
- 图谱域=圈(图纸一张,行程一目的一份);**物理在场成员=读时派生,只存手动场外拉入**(核查 HIGH:全量替换写路径会绞杀服务端自动写入的成员);
- 自治分层:真相层 proposal-first;工作台层 Agent 自治(可见/署名/可重建);
- 非强制维护:"爱核不核";账本常开法庭不开。

## 2. 数据形状(migration **047** —— 046 已被 V2.BN.10.5 占用;核查修正版)

```sql
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body_json TEXT NOT NULL DEFAULT '{}',   -- ★TextFlow 双列惯例(公式卡=旗舰用例;块编辑器未来可复用,零迁移)
  plain_text TEXT NOT NULL,               -- ★快照/hash/收据一律按 plain_text 算(格式抖动不假漂移)
  item_type TEXT, topic TEXT,             -- 固有标量(自由文本;U4 池后置)
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),  -- ★退役不硬删
  origin_course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  origin_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL DEFAULT 'user',
  metadata TEXT NOT NULL DEFAULT '{}', created_at, updated_at
);

CREATE TABLE item_snapshots (              -- 快照去重(收据全文;未来版次链雏形)
  id, item_id REFERENCES items ON DELETE CASCADE, user_id,
  content TEXT NOT NULL,                   -- = plain_text at snapshot time
  content_hash TEXT NOT NULL, created_at,
  UNIQUE(item_id, content_hash)            -- 重申未变=复用行(ON CONFLICT DO NOTHING+SELECT)
);

CREATE TABLE item_anchors (                -- 锚集+原料池(一表两态,§十五拍定"两种住法非新实体")
  id, user_id,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,      -- NULL=原料(躺池);认领=UPDATE 移入(非复制)
  pool_scope_kind TEXT, pool_scope_id TEXT,                 -- 原料躺哪个池(判断点 d)
  target_kind TEXT NOT NULL,               -- ★'block'|'content_range'|'canvas_object'|'table_region'|'image_region'
                                           --   (与 member 靶类语法共用词表/共享模块;'note_block'方言禁用)
  target_id TEXT NOT NULL, range_json TEXT,
  excerpt TEXT NOT NULL,                   -- 收据摘录(自足;target 死了降级为仅收据,**不进任何删除 sweep**——
                                           --   刻意不学 content_group_members 的 detach sweep,那套已被证明是漏的)
  reference_mode TEXT NOT NULL DEFAULT 'quote',
  source_record_id TEXT,                   -- 终端规则:锚定时从 note_block_sources 抄冻(copy-on-anchor,永不同步)
  collected_for TEXT,                      -- ★账本:为哪个任务/目的收的(§十七 出身分级退场依据)
  metadata TEXT NOT NULL DEFAULT '{}', created_by, created_at, updated_at,  -- ★updated_at=多久没动
  CHECK ((item_id IS NOT NULL AND pool_scope_kind IS NULL)
      OR (item_id IS NULL AND pool_scope_kind IS NOT NULL))  -- ★两态互斥
);

CREATE TABLE relations (
  id, user_id,
  from_item_id TEXT NOT NULL REFERENCES items(id),   -- ★NO ACTION(裸删活关系的卡=响亮失败;正路=退役)
  to_item_id   TEXT NOT NULL REFERENCES items(id),
  relation_type TEXT NOT NULL,
  directionality TEXT NOT NULL DEFAULT 'directed' CHECK (directionality IN ('directed','undirected')),
  from_snapshot_id TEXT NOT NULL REFERENCES item_snapshots(id),  -- ★判断收据;RESTRICT 语义:快照 GC 永不孤儿化收据
  to_snapshot_id   TEXT NOT NULL REFERENCES item_snapshots(id),
  note TEXT, created_by,
  status TEXT NOT NULL DEFAULT 'active',   -- 'active'|'revoked'(撤销留痕,稀疏教义)
  created_at, updated_at,
  affirmed_at TEXT NOT NULL,               -- ★NOT NULL,insert 时=created_at(创建即首次人判)
  CHECK (from_item_id != to_item_id),                                  -- ★禁自环
  CHECK (directionality = 'directed' OR from_item_id < to_item_id)     -- ★无向边规范化存序(服务层换序)
);
CREATE UNIQUE INDEX idx_relations_active
  ON relations(from_item_id, to_item_id, relation_type) WHERE status = 'active';  -- ★部分唯一:撤销后可重建

CREATE TABLE relation_assessments (        -- AI 署名判定(人判永不代签)
  id, relation_id REFERENCES relations ON DELETE CASCADE, user_id,   -- ★user_id 补上(全库惯例)
  verdict TEXT NOT NULL CHECK (verdict IN ('still_holds','questionable')),
  model_key TEXT NOT NULL, created_at
);

-- 既有表(全部 additive):
--   purpose_members.member_kind 加 'item' —— ★非一行改动:原子触点包 A(§7)
--   content_group_members 加 item_id REFERENCES items(id) ON DELETE SET NULL —— ★原子触点包 B(§7)
```

**派生工单**:待体检边 = `endpoint.updated_at > max(relation.affirmed_at, 最新 assessment.created_at)`(affirmed_at NOT NULL 保证无 NULL 陷阱)。
**新鲜度四档读时派生;无存储 sync 列**——刻意背离 content_group_members.source_sync_status 模式(存储列+人肉 sweep = stale-PI 老病的形状)。

## 3. 维护泵地板

改动触发(本体保存防抖)+阅读触发(读取时就地体检);空闲消化器 11.x 后置;判定=本地小模型/embedding(4060);原料纪律=协议非结构(AI 契约内建"有用才收"/人乱是权利/账本常开/AI 剩料自理署名/人堆策展提示);具名动词预留:重新盘点(re-inventory)。

## 4. 交互层假设(⚠️实测)

认领入口(划选快铸/池选融铸)⚠️;inspector 关系列表 ⚠️;新鲜度就地显示无全局红点 ⚠️;微观射线(内容渲染/主线支线读时排/侧栏浮层)⚠️;原料区形态与策展措辞 ⚠️。V11 只落 inspector 级列表。

## 5. 遗产处置(核查活性盘点后的定案)

- **v2.4.4 三表全 DEAD(实证:live DB 各 0 行,learning_canvases 也 0)**:object_relations(唯一写者=legacy Courses 学习画布页)/canvas_edges(同;**BN 画布的视觉线不在它上面**——现役视觉线=canvas_objects kind='visual_connector'+extensions〔040〕,v0 的"保留视觉真相"预案作废)/relation_layers(僵尸:READ 路径自动播种 5 个默认层——**只删表不下架端点会复活或崩页**)。**清场 = 下架 legacy 学习画布代码(路由+页面区块+服务)+ 落三表** —— 需 Henry 确认 legacy Courses 学习画布页(/projects 下)可整体下架(判断点 c)。
- **★花瓣退役 = 专项代码手术,非清数据(核查 HIGH)**:活写入环仍在——BN 画布每次存 CG 都 delete+reinsert 花瓣行(useNoteCanvasDataAdapter:519→contentGroups.ts:902)、petals_json 双写(:888)、SingleContentGroupEditor 花瓣改名 UI 在路由上(App.tsx:101)。**手术顺序**:client 模型剥离(contentGroupService 花瓣 CRUD ~1479-1758)→ server 路径摘除(replaceContentGroupFragmentsAndPetals/prune)→ 046 落表。只删数据会被下一次 CG 保存原样重写。
- **顺手清尸**:contentGroupRelationProjectionService.ts(零消费者,dead code)。
- **词汇表**:item_anchors ≠ source_anchors(后者=V10 已冻结的 legacy,V11 不碰)。
- **生命周期注册表对表(与 10.5 的顺序依赖)**:V10 §4.5 的注册表尚未建成(10.5 交付)——V11 落地时注册:items=preserve(origin SET NULL);item_snapshots/item_anchors/relations/relation_assessments=user-scoped 无 course 列。谁后落地谁负责补登记。
- 契约同步(Claude 随版):Link-Source-Relation-Boundary-Contract(端点=卡/三真相);老 Relation 设计文档标 superseded-in-part;06-28 端点教义正式替换。

## 6. 判断点(Henry 拍)

- **a. 卡与关系全局无墙** ✅推荐维持(source_records 先例逐字适用,核查证实无 course-JOIN 面会漏;唯一用户可见变化=删 course 不再抹知识,plan 写明)。
- **b. 类型词表**:种子九类+对称性内建(derives_to/depends_on/supports/contradicts/example_of 有向;equivalent_to/analogous_to/contrasts_with/companion_of 无向)+自由扩展留缝。
- **c. 遗产清场范围**:三表落表 + **legacy Courses 学习画布页整体下架**(数据 0 行,代码活着)——请确认该页可下架。
- **d. 原料池宿主**:CG 区起步(pool_scope_kind='content_group')。
- **e. 读取面深度**:inspector 列表级,图形零。

## 7. 原子触点包(给 plan 的施工纪律——核查三 HIGH 的直接产物)

- **包 A · member_kind='item'(~7 触点,client+server 同版原子上线)**:server 类型(purposes.ts:7)+**读路径 throw 的 normalizeMemberKind(:83-94,分支而非放行——部分上线会砖掉整个笔记的目的读取)**+insertPurposeMember 存在性检查分支(:164-169,items vs CG)+zod enum(validators:464)+**listVisiblePurposeMemberRows 加 items 活性过滤**(镜像 CG 软删过滤;退役卡不永驻圈)+client 类型+client normalizer(purposeService:45-47 的静默强转必须改);hiddenEdges 抢救逻辑扩到 item kind。
- **包 B · content_group_members.item_id(5 触点原子)**:DB 列(FK SET NULL)+server dbValues/INSERT/ON CONFLICT+hydrate 白名单+client ContentGroupMemberV1+client normalizer(kind 强转 'content_range' 的老逻辑须知晓新 kind)。
- **包 C · 花瓣手术**(§5 顺序,client 先行)。
- **纪律共识**:两条持久化路径(purposes/content-groups)皆为**客户端权威全量替换**——任何服务端自写的行都会被旧客户端下一次保存绞杀;故凡新成员类,client+server 必须同版;凡服务端自动写入,必须走读时派生而非落行。
