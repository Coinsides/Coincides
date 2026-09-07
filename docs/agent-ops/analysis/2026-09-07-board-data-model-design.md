> **状态 (Status)**: active(13.0 施工图二 · 板数据模型;13.3/13.4 拆单依据)
> **层 (Layer)**: 分析 / 设计
> **日期 (Updated)**: 2026-09-07
> **权威 (Authoritative)**: 是(板与魂的骨相);工程细节以拆单 K-0 侦察为准
> **上游**: `2026-08-30-paper-and-board-direction.md`(方向档)· 工程日记 §十六~二十四(目的全案/两轴/一魂三态/四器官)· v13 总 plan 战役令(史记 v0 提前进版)

# 13.0 图二 · 板数据模型 —— 板、魂、钢的骨相

## 〇 · 定位

本图管三样东西的表结构与边界:**板**(独立的无限画布)、**魂**(purpose,丙案形态)、**史记 v0**(append-only 事件账)。供 13.3(板 MVP)与 13.4(投影/item 化)拆单;13.2 迁移的账本前提也在此(账本先于历史出生)。⛔ 不管纸内三层同体(归图四与 14.x)、⛔ 不管册实体(产出轴只留缝)。

## 一 · 板(boards)

**裁定:板=一等实体,身份挂 item 族**(方向档开口 1 落定;走查③时 Henry 可翻)。

```sql
boards: id, user_id, title, soul_id NOT NULL REFERENCES purposes(id),
        project_id NULL,          -- 弱关联仅供检索,⛔ 不构成容器边界
        viewport JSON,            -- 板自己的缩放/平移状态(板的标尺归板)
        created_at, updated_at
```

- **板必有魂**(丙案):`soul_id NOT NULL`——开板动作本身携带立魂或挂靠既有魂(轻:一句人话;或挂靠已有);魂不必有板(无形态目的合法,purposes 独立存在);
- 板不入容器轴(页⊂笔记⊂project⊂库不加层)——板是**动词场所**,库级浮游;`project_id` 只是弱标签;
- 板可多张、可与同一个魂多对一?**⛔ 否:一板一魂,一魂至多一板(作坊态唯一)**——一魂三态的"作坊态"是状态不是集合;同一求知开两块板=实为两个魂,该立就立。

## 二 · 魂(purposes 表改造)

现物(迁移 044)是旧世界观,三件遗物逐一处置:

| 现物 | 判决 | 理由 |
|---|---|---|
| `note_id … ON DELETE CASCADE` | **退役**(列保留作历史,新写⛔) | 魂随纸殉葬=目的还是笔记的胶水;丙案下魂是库级公民 |
| `project_id`(实际 NOT NULL 语义) | **放宽为 NULL** | 库级公民,跨 project 抓材料(会议记录 §九 旧裁) |
| `is_note_default` + 部分唯一索引 | **退役** | "纸自带默认魂"违「纸无目的字段」;存量处置归图三 |

新骨相:

- **本体=一句人话**:`title` 即那句话(必填);`intent`/`scope_note` 保留为可选补充——⛔ 不新增字段,征用现物;
- **状态机**:存储态只需 `active / sealed / archived`(sealed=定卷,由出版事件自动盖;archived=显式搁置)。**"冷却"⛔ 不是存储态**——由 `updated_at` 现推(排气原则:不维护可推导的状态);
- **唯一锚定变量**:人随改;**Agent 工具面上不存在 update-purpose 工具**(通道即权限——Agent 改魂走 proposal,人批准后由人侧通道落笔);每次改动上钢(事件引用新旧两句原文),句子地层在钢上,零新表;
- **出生签名**:`created_by` 枚举现物(human/ai/system/ai_proposal/importer)直接续用;⛔ AI 私立(`ai` 直立仅限系统性场合,涌现走 `ai_proposal`);
- ⛔ **无 parent_id,永不加**(目的树禁令,§二十一.4)。

## 三 · 名单注销:purpose_members 降格为编译缓存

**裁定:`purpose_members` 从"维护账"改判"编译缓存表"**——真相是三本自动账,材料集=现算合成视图:

1. **在场**:`board_members`(魂的作坊现状);
2. **用过**:出处边(relations / 生育事件的参考清单,书记官自动记);
3. **生于**:`relations.origin_purpose_id`(现物 schema.sql:1031,征用不动)+ 产物自身的出生签名。

`purpose_members` 的唯一合法写入者=编译器(重算即重建,可整表重建不心疼);`PurposeCompiledMembershipKind` 族类型(runtimeDataTypes.ts:405+)征用为缓存的输出契约。⛔ 用户/Agent 直写成员表;⛔ 上板/下板带任何名单副作用(下板除名问题已溶解,零立法)。

## 四 · 板面成员(board_members)与连线(board_edges)

```sql
board_members: id, board_id, member_kind, member_id,
               x, y, w, h, scale, z_index, pinned,
               metadata JSON, created_at, updated_at
board_edges:   id, board_id, from_member_id, to_member_id,
               style JSON, label TEXT NULL, created_at
```

- `member_kind`:`note | item | content_group | text_range`(粒度自由=「兼容非包容」的机械形态:板可只圈这篇的第三节);
- **成员=投影(mount)**:引用+几何,**⛔ 真相不搬家、⛔ 内容复制**——双击进纸,纸活自家(引卡不引形态);
- 板缩放只动 board.viewport,⛔ 不触 member 内容排版(两把标尺各回各家,比例无解定理的机械保证);
- 上板 INSERT / 下板 DELETE 各自上钢(事件),此外零副作用。

## 五 · 两轴的账面位置

容器轴(页⊂笔记⊂project⊂库)本图零改动。产出轴在 v0 只留两道缝:①出版事件是钢上的一个 verb(`published`);②魂的 `sealed` 由它驱动。册实体、出版史视图=后续图/版,⛔ 本图不建表。

## 六 · 史记 v0(events)

```sql
events: seq INTEGER PRIMARY KEY AUTOINCREMENT,
        ts, user_id,
        actor_kind,        -- 'human' | 'agent:<岗位>' | 'system'
        channel,           -- 写入通道名(MCP 工具名/UI 动作名/迁移脚本名)= 印章
        verb,              -- 落定点枚举(见下)
        objects JSON,      -- [{kind,id},…] 一事件可涉多对象(传导/融合多父)
        summary TEXT,      -- 执行者自述交接词,引用体;书记官⛔ 转述
        meta JSON
-- 触发器:BEFORE UPDATE / BEFORE DELETE ON events → RAISE(ABORT)
```

- **verb v0 枚举**(落定点=事件型边界,⛔ 语义型):`migrated / note_created / board_created / mounted / unmounted / purpose_created / purpose_amended / purpose_sealed / proposal_issued / proposal_approved / proposal_rejected / published / rolled_back`——增补走迁移,⛔ 自由字符串;
- **书记官=server 路由层中间件(确定性代码,⛔ 非模型)**:与动作同一 SQLite 事务写入,同生共死,零竞态;
- **通道即印章**:`actor_kind`/`channel` 由中间件按认证态与调用通道填,⛔ 不收调用方自报;
- Agent 工具面:**写钢的工具不存在**;读钢只经专用查询工具(按对象/时段/verb 筛+分页),⛔ 通读;
- v0 边界:⛔ 熔炉模式(候消费者)、⛔ 哈希链(可选档,候需要)、⛔ 编年史缓存(V14)、⛔ client 操作栈入钢(撤回弹簧是 UI 域,本来就不到 server);
- **13.2 迁移是钢上第一批车辙**:迁移脚本经书记官记 `migrated` 事件(channel=脚本名),迁移核对单获得永久出处。

## 七 · 家规(⛔ 面汇总)

⛔ 目的树 · ⛔ 纸上目的字段 · ⛔ 维护式成员名单 · ⛔ Agent 改魂/写钢工具 · ⛔ 板入容器轴 · ⛔ 板面内容复制(投影唯一) · ⛔ 魂随纸殉葬 · ⛔ 可推导状态入库(冷却/名单皆现算) · ⛔ 安全类测试(全版红线)。

## 八 · 迁移注意(交图三承接)

1. 044 表改造走新迁移(放宽 project_id/退役 note_id 语义);**存量 note-default purposes 的处置矩阵归图三**(候选:有实义者转独立魂,空壳者退役);
2. **TD-34 对表义务**:凡回填 relations/出处边,先对表两代 source 身份(会议记录 §十三雷区,悬案在停车场 E);
3. events 表随 13.3 首单建,13.2 若先行则迁移单自带 events 建表前置(账本先于历史)。

## 九 · K-0 侦察清单(13.3 拆单必做)

1. purposes 现役消费者全名单:routes/purposes.ts、services/purposes.ts、validators、**courseLifecyclePolicies.ts(字面量登记面!0831 教训:表名字符串不在 import 反向图上)**、client PurposeFrame 消费面;
2. canvas_workspace 族现物范围与 13.2 退役边界对表;
3. notes 表现状与 board_members.member_kind='note' 的引用完整性方案;
4. 迁移编号续位(现最高 047+)与 schema.sql/migrations 双轨纪律现状;
5. events 触发器在 better-sqlite3 下的语法与事务内插入实测(书记官中间件挂点=现有路由结构侦察)。
