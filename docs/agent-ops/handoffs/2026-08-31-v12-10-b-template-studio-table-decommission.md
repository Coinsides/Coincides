> **状态 (Status)**: ready(顶班调度按总部 2026-08-31 Step-0 闸裁定翻牌;裁定出处:总部七裁之 4/5/6 + K-0 计划 §7 Step 4–5;不代表 Henry 逐张批过本单)
> **from**: claude(fable5,顶班调度会话 bc871bf7) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31「分两单;单乙 = Step 4–5 不可逆域,快照双前置齐才开工」。⛔ **不是 Henry。**
> **上游**: `analysis/2026-08-31-v12-10-k0-template-studio-recon.md`(§2.4 表清单/§7 Step 4–5)· 单甲(`…-v12-10-a-…`,三腿已收 `b15ab2a`/`cdd41c9`/`bb8ed8f`,test:v2 现基线 **327/327**)

# 施工单乙:18 表 forward decommission(⛔ 不可逆域;双前置已齐)

## 0. ⛔⛔ 先读这七句

1. **本单含不可逆动作**(dev 库 DROP 18 表)。**双前置已齐**:①标红表 JSON 留证由你在本单第一动作完成(见 §2.1);②仓外整库快照**调度方已办**:`D:/Coinsides/v2.x/coincides-db-snapshots/2026-08-31-pre-template-studio-drop/`(sha256 `2ceb16da087a63d1a2d889d56ff56442c5978be671b9d010c201b981dc99c65d`,MANIFEST 在内,留存至 12.10 收官)。⛔ 该快照目录只读,你不碰。
2. **顺序是判据**:留证(§2.1)完成并自检通过**之前**,⛔ 不许创建迁移 053、不许对 dev 库做任何写动作。
3. **迁移史不可涂改**(裁 5):`026–030` 五个历史迁移文件**零 diff**;退役走**新增** `053` forward DROP 殿后;`schema.sql` 删 18 表声明(fresh 库先建后删几毫秒,换迁移史完整,总部判值)。
4. **blocker 摘除 = 期望语义**(裁 4):`noteBlockLifecycle.ts` 对五张候删表的查询/blocker 同步删除,删除处留注释申报缘由(保护对象已亡),关闭测试**正向断言**该五类不再阻止 NoteBlock 删除——语义变更显式化,⛔ 静默消失。
5. **运行时表一根手指不碰**:`template_definitions` · `study_mode_templates` · `time_block_templates` · `time_block_template_sets` 及其种子/路由。`db/init.ts` 零 diff。
6. **test:v2 恰 +1**:327 → **328/328**(唯一新增 = 关闭测试)。⛔「少测了所以绿」判红。
7. **零 API 调用零花费**;⛔ 不碰 `D:/Coinsides/v12.9-selection/**`、`~/.codex/sessions`、12.9d 新面、画布野地/crossing。

## 1. 允许面(⛔ 只这些)

- **新建** `docs/agent-ops/handoffs/evidence/2026-08-31-template-studio-table-snapshot.json`
- **新建** `server/src/db/migrations/053_v2_template_studio_decommission.ts`
- **手术** `server/src/db/schema.sql`(仅删 18 表建表段,K-0 记 :1241-1678 一带,以现物为准)
- **手术** `server/src/services/noteBlockLifecycle.ts`(仅 §0.4 所述摘除+注释)
- **新建** `server/src/__tests__/v2TemplateStudioDecommission.test.ts`
- **修改** `server/package.json`(仅 test:v2 挂新测试;⛔ 不改依赖)
- **追加**:本单 `## Result`
- (dev 库 `server/coincides.db` 将因 053 实迁而变——这是本单的目的,porcelain 不涉它,gitignore 内)

⛔ **禁区(逐项零 diff 自证)**:`server/src/db/migrations/026_v2_composition_templates.ts` · `027_v2_domain_packages.ts` · `028_v2_template_migration_proposals.ts` · `029_v2_package_import_export.ts` · `030_v2_domain_refinement_proposals.ts` · `server/src/db/init.ts` · `server/src/db/migrate.ts` · `server/src/services/templateDefinitions.ts` · `server/src/services/sourceImprints.ts` · `server/src/services/imprintEmbedding.ts` · `server/src/routes/**` · `client/**` · 根 `package.json`(闸盲区,人工核过)· `.env*` · `docs/agent-ops/current-state/**`(TD-33 台账收口归调度方)。

## 2. 施工定义

### 2.1 第一动作:标红表 JSON 留证(裁 6)

以只读连接导出 5 张标红表**全部行、全部列**入允许面 JSON(结构:`{table: {rows: [...], row_count: n}}` 五键 + 顶层 `exported_at`/`source_db`/`user_scope` 注记):`composition_templates`(6)· `package_manifests`(1)· `domain_block_sets`(3)· `domain_block_set_templates`(20)· `domain_block_set_compositions`(7)。**自检**:行数逐表对上 K-0 §3(合计 37);文件 sha256 算出并写进回执。⛔ 此文件是证据本体,写完后本单内不得再改。

### 2.2 迁移 053(裁 5)

`053_v2_template_studio_decommission.ts`:按 FK 子→父顺序 `DROP TABLE IF EXISTS` 恰 18 张(K-0 §2.4 清单逐名);建表失败式静默⛔——每张 DROP 后以 `sqlite_master` 断言不存在,仍在即抛;迁移头注释引用本单与裁 5。⛔ 不 DROP 任何清单外表。

### 2.3 schema.sql 与 noteBlockLifecycle 手术

- `schema.sql`:删 18 张建表段;⛔ 运行时表声明与其它段一字不动;收工 `grep -c "CREATE TABLE.*<各表名>"` 应为 0(逐表)。
- `noteBlockLifecycle.ts`(K-0 记 :740-789 一带):删除对五张候删表(按现物点名)的查询与 blocker 词;删除处注释:`// 12.10-b 裁 4:Template Studio 已退役,历史引用不再阻止删除(保护对象已亡,枷锁不留);见 handoffs/2026-08-31-v12-10-b-*.md`。

### 2.4 关闭测试(恰一条,裁 4)

`v2TemplateStudioDecommission.test.ts` 单条 test 覆盖:①fresh 路径(schema.sql 建库)18 表逐一不存在;②upgrade 路径(scratch 库跑 026–030 建出 18 表,再跑 053)18 表逐一不存在;③两路径下四张运行时表逐一存在;④**正向断言**:造 note+block 后删除成功,且 lifecycle 模块的 blocker 枚举不再含五类词(逐词断言不在)。

### 2.5 dev 库实迁与对账

留证与代码全部就位、test:v2 328/328 之后:以 `initDb(server/coincides.db 绝对路径)` 触发 053 实迁(node 一次性脚本放 `.codex-tmp/`)。随后查库回执:`db_migrations` 含 053(applied_at)· 18 表在 `sqlite_master` 计 0 · 四运行时表在且 `template_definitions` 仍 **6** 行 · `imprint_fragments` 仍 **110** 行、`imprint_fragment_vectors` 仍 **110** 行(⭐ 12.9d 面无伤旁证)。SQL 原文入回执。

## 3. 判据(K)

- **K-1 顺序与留证**:JSON 先行自检(37 行+sha256)→ 才有 053;回执按时间叙述并贴自检数字。
- **K-2 DROP 恰 18**:迁移文件逐名对 K-0 §2.4;多一张少一张皆红。
- **K-3 test:v2 恰 328/328**;新增恰 1 条。
- **K-4 dev 库对账**:§2.5 四组数字齐。
- **K-5 TD-33 佐证**:`rg` 三处空指纹模式与 `packagePortability` 零命中(单甲已删,此为终审);台账收口归调度方,⛔ 你不碰 current-state。
- **K-6 禁区逐项 `git diff --quiet` 贴 exit**(§1 禁区清单)+ porcelain 全文(允许面六文件 + 本单 M + 既有噪音行 ` M server/src/routes/projections.ts` 之外应空)。
- **K-7 门禁**:tsc · test:v2(328/328)· `npm run docs:check`(生成件过期按「申报即可,重生成归调度方」口径)· `npm run check:v2-bn11-legacy-shutdown` · `npm run check:tool-face-manifest`。
- **K-8 声明本单没做**:UI/检索面/粒度/i18n/OD;026–030 未动;快照目录未动。

## 4. 通用纪律(沿单甲 §5,一字不减)

搜索纪律 · key 值零出境 · ⛔ 不 commit 不 push · ⛔ 不翻状态头 · ⛔ 不改 `.claude/**`、`AGENTS.md`、`CLAUDE.md` · ⛔ 不杀任何进程(含 PID 8292)· 回执经 apply_patch 落盘⛔不走 stdin · 锁非你所有 · 字面矛盾摊开标 `needs: dispatcher` 停线交回。

## 5. 回执(`## Result`)

K-1 至 K-8 逐项 · 留证 sha256 · 053 applied_at · 四组对账 SQL 与数字 · 门禁 exit · 停线点。

## Result

**needs: dispatcher — 停线，未实迁 dev 库。** `test:v2` 的测试总数已恰为 328，但 9 条既有测试被同一个允许面缺口击穿：`server/src/services/courseLifecyclePolicies.ts` 仍登记 6 个已由 053 删除的 Project 引用，运行时覆盖检查报 `stale`。该文件不在本单允许面；依本单 §4「允许面不够则停线交回」，未擅自修改。

### K-1 顺序与留证

- 第一项施工动作是以 `readonly + query_only` 打开 `server/coincides.db`，于 `2026-08-31T22:45:53.363Z` 新建 `docs/agent-ops/handoffs/evidence/2026-08-31-template-studio-table-snapshot.json`；第一次因目标目录不存在而 `ENOENT`，仅创建指定 `evidence/` 目录后以 `flag: 'wx'` 新建成功。其间未创建 053、未写 dev 库。
- 全行全列自检：`composition_templates=6`（21 列）、`package_manifests=1`（25 列）、`domain_block_sets=3`（22 列）、`domain_block_set_templates=20`（12 列）、`domain_block_set_compositions=7`（12 列）；逐表 JSON 键集合与 `PRAGMA table_info` 完全一致，合计 `37`。
- 证据 SHA-256：`b93a1b686f7af5c27acab22aafaf63aace41059117c1b2611874bc99e2492b4f`。收尾复算相同；证据本体创建后未再修改。

### K-2 DROP 恰 18

- 新建 `053_v2_template_studio_decommission.ts`，按 FK 子→父顺序逐张 `DROP TABLE IF EXISTS`，每张 DROP 后立刻查 `sqlite_master`，仍存在即抛。
- 机械对账：`drop_count=18`、`unique=18`、`missing=[]`、`extra=[]`；集合逐名等于 K-0 §2.4。
- `schema.sql` 中 18 张退役表的 `CREATE TABLE IF NOT EXISTS` 计数为 `0`。
- `026–030` 五个历史迁移均 `git diff --quiet` exit `0`。

### K-3 test:v2

- 唯一新增测试文件只有一条 `test(...)`；专项直跑 `1/1` PASS；server `npx tsc --noEmit` exit `0`。
- 全量 `npm run test:v2`：**tests 328 / pass 319 / fail 9 / exit 1**，不满足 `328/328`，故停线。
- 9 红同因：`assertCourseLifecyclePolicyCoverage` 报以下 6 个静态登记已 stale：
  - `composition_instance_slots.course_id`
  - `composition_instances.course_id`
  - `domain_object_classifications.course_id`
  - `domain_refinement_records.course_id`
  - `template_migration_record_items.course_id`
  - `template_migration_records.course_id`
- 受影响测试：Canvas Persistence 3 条、Item Relation Floor 1 条、Relation Lifecycle Closure 1 条、Source Lifecycle Closure 4 条。要恢复 328/328，调度方需裁定是否把 `server/src/services/courseLifecyclePolicies.ts` 加入允许面，以摘除上述 6 个已亡表登记；本回合未猜、未动。

### K-4 dev 库对账

- **未执行 053 实迁**：工单 §2.5 要求先有 `test:v2 328/328`，当前前置未过。
- 停线时只读确认：`053 applied=no`、18 张退役表仍为 `18`、四运行时表为 `4`、`template_definitions=6`、`imprint_fragments=110`、`imprint_fragment_vectors=110`。因此无 `053 applied_at`，也不伪造迁后 SQL 结果。

### K-5 TD-33 佐证

- `rg -n "packagePortability" server/src server/package.json` exit `1`（零命中）；单甲删除结果保持。
- `docs/agent-ops/current-state/**` 未动，台账收口留给调度方。

### K-6 禁区与 porcelain

- 以下逐项 `git diff --quiet` 均 exit `0`：026、027、028、029、030、`db/init.ts`、`db/migrate.ts`、`templateDefinitions.ts`、`sourceImprints.ts`、`imprintEmbedding.ts`、`server/src/routes/**`、`client/**`、根 `package.json`、`.env`、`.env.experiment`、`server/.env`、`docs/agent-ops/current-state/**`。
- 停线前 porcelain：

```text
 M server/package.json
 M server/src/db/schema.sql
 M server/src/routes/projections.ts
 M server/src/services/noteBlockLifecycle.ts
?? docs/agent-ops/handoffs/evidence/
?? server/src/__tests__/v2TemplateStudioDecommission.test.ts
?? server/src/db/migrations/053_v2_template_studio_decommission.ts
```

其中 `server/src/routes/projections.ts` 是开工前既有噪音；该路径 `git diff --quiet` exit `0`，本单未触碰。追加本回执后，本工单自身另为 `M`。

### K-7 门禁

- `npx tsc --noEmit`：exit `0`。
- 专项关闭测试：`1/1` PASS。
- `npm run check:tool-face-manifest`：作为 `pretest:v2` 执行，exit `0`（14/14 public，未过期）。
- `npm run test:v2`：exit `1`，328 中 9 红，停线点如 K-3。
- 因主门已红，未继续跑 `docs:check` 与 `check:v2-bn11-legacy-shutdown`，也未进入 dev 实迁。

### K-8 本单没做

- 未做 UI、检索面、粒度、i18n、OD；未改 026–030；未访问或修改仓外快照目录；未碰 12.9d 新面、画布野地/crossing、`D:/Coinsides/v12.9-selection/**`、`~/.codex/sessions`、`.claude/**`、`AGENTS.md`、`CLAUDE.md`。
- 零 API 调用、零模型花费；未杀任何进程；未 commit、未 push；未翻状态头。

## Result(续)

调度方 2026-08-31「单乙续」已把 `server/src/services/courseLifecyclePolicies.ts` 扩入允许面；上方原停线段原文保留。本续回合仅摘除调度方逐名批准的 6 条已亡表 `course_id` 登记，并完成此前被前置门阻断的 dev 实迁、对账与全门禁。

### K-1 顺序与留证（续核）

- 顺序事实不变：先于 053 和任何 dev 写动作完成五表全行全列 JSON 留证、自检 37 行，才创建 053；原段时间线继续有效。
- 证据终检 SHA-256 仍为 `b93a1b686f7af5c27acab22aafaf63aace41059117c1b2611874bc99e2492b4f`，与首次创建后哈希一致；本续回合未改证据本体。

### K-2 DROP 恰 18（续核）

- `053_v2_template_studio_decommission.ts` 的 `DROP TABLE IF EXISTS` 机械计数仍为 `18`；集合仍逐名等于 K-0 §2.4，且统一经 `dropAndAssert` 在每次 DROP 后查询 `sqlite_master`、残留即抛。
- `schema.sql` 对这 18 张表的 `CREATE TABLE IF NOT EXISTS` 搜索 exit `1`（零命中）。
- `026`、`027`、`028`、`029`、`030` 逐文件 `git diff --quiet` 均 exit `0`。

### K-3 test:v2 恰 328/328（续核）

- 扩面手术：`git diff --numstat -- server/src/services/courseLifecyclePolicies.ts` 为 **`1 6`**。diff 仅删除调度方点名的 6 条登记，并在原第一处留下：`// 12.10-b:六表已由 053 退役,登记随亡;见 handoffs/2026-08-31-v12-10-b-*.md`；6 个表名在该文件搜索 exit `1`（零命中），其余登记与逻辑未改。
- 实迁前重跑 `npm run test:v2`：**tests 328 / pass 328 / fail 0 / exit 0**（`duration_ms 37978`），满足 §2.5 写库前置。
- 实迁后 K-7 再跑 `npm run test:v2`：**tests 328 / pass 328 / fail 0 / exit 0**（`duration_ms 35828.6894`）。
- 新增关闭测试仍恰一条 `test(...)`；四组断言均通过：fresh 无 18 表、upgrade 无 18 表、四运行时表在、NoteBlock 正向删除成功且 blocker 枚举无五类词。

### K-4 dev 库实迁与四组对账

- 以 `.codex-tmp/run-v12-10-b-dev-migration.ts` 调用 `initDb` 的绝对 dev DB 目标完成实迁；迁移器只发现并应用 1 条 pending：`053_v2_template_studio_decommission`，exit `0`。
- 对账连接使用 `readonly + query_only`。SQL 原文与结果如下：

```sql
SELECT id, applied_at
FROM db_migrations
WHERE id = '053_v2_template_studio_decommission';
-- id=053_v2_template_studio_decommission, applied_at=2026-08-31 23:01:14

SELECT COUNT(*) AS retired_table_count
FROM sqlite_master
WHERE type = 'table'
  AND name IN (
    'template_migration_record_items', 'package_import_record_items',
    'domain_refinement_record_items', 'domain_object_classifications',
    'composition_instance_slots', 'domain_block_set_templates',
    'domain_block_set_compositions', 'template_migration_records',
    'package_import_records', 'domain_refinement_records',
    'composition_instances', 'package_exports',
    'domain_refinement_mappings', 'template_migration_mappings',
    'package_import_previews', 'domain_block_sets',
    'package_manifests', 'composition_templates'
  );
-- retired_table_count=0

SELECT COUNT(*) AS runtime_table_count
FROM sqlite_master
WHERE type = 'table'
  AND name IN (
    'template_definitions', 'study_mode_templates',
    'time_block_templates', 'time_block_template_sets'
  );
-- runtime_table_count=4

SELECT COUNT(*) AS template_definition_count FROM template_definitions;
-- template_definition_count=6

SELECT COUNT(*) AS imprint_fragment_count FROM imprint_fragments;
-- imprint_fragment_count=110

SELECT COUNT(*) AS imprint_vector_count FROM imprint_fragment_vectors;
-- imprint_vector_count=110
```

### K-5 TD-33 佐证（续核）

- `server/src/services/packagePortability.ts` 不存在；`rg -n "packagePortability" server/src server/package.json` exit `1`（零命中），故该已删文件原 361/441/659 三处空指纹模式也不再存在。
- `docs/agent-ops/current-state/**` `git diff --quiet` exit `0`；台账收口仍归调度方。

### K-6 禁区与最终 porcelain（续核）

- 逐项 `git diff --quiet` 均 exit `0`：026、027、028、029、030、`db/init.ts`、`db/migrate.ts`、`templateDefinitions.ts`、`sourceImprints.ts`、`imprintEmbedding.ts`、`server/src/routes/**`、`client/**`、根 `package.json`、全部 `.env*`、`docs/agent-ops/current-state/**`。
- `git diff --check` exit `0`。
- 最终 porcelain（追加本续回执前；追加后路径集合不变）：

```text
 M docs/agent-ops/handoffs/2026-08-31-v12-10-b-template-studio-table-decommission.md
 M server/package.json
 M server/src/db/schema.sql
 M server/src/routes/projections.ts
 M server/src/services/courseLifecyclePolicies.ts
 M server/src/services/noteBlockLifecycle.ts
?? docs/agent-ops/handoffs/evidence/
?? server/src/__tests__/v2TemplateStudioDecommission.test.ts
?? server/src/db/migrations/053_v2_template_studio_decommission.ts
```

`server/src/routes/projections.ts` 仍为开工前既有 status 噪音；其路径 `git diff --quiet` exit `0`，本单未触碰。

### K-7 门禁（续核）

- `server: npx tsc --noEmit`：exit `0`。
- `server: npm run test:v2`：**328/328**，exit `0`。
- `npm run docs:check`：exit `1`，唯一红项为获准申报的生成件 `docs/generated/object-inventory.md` 过期；未重生成。该命令因 `&&` 在 inventory 处短路，故另跑 `npm run check:glossary-shape-vs-capability`，K-1 至 K-3 全过、exit `0`；docs index 已在到达 inventory 前通过。无其它红项。
- `npm run check:v2-bn11-legacy-shutdown`：exit `0`。
- `npm run check:tool-face-manifest`：exit `0`，14/14 public，未过期。

### K-8 本单没做（续声明）

- 未做 UI、检索面、粒度、i18n、OD；未改 026–030；未访问或修改仓外快照目录；未碰 12.9d 新面、画布野地/crossing、`D:/Coinsides/v12.9-selection/**`、`~/.codex/sessions`、`.claude/**`、`AGENTS.md`、`CLAUDE.md`。
- 零 API 调用、零模型花费；未杀任何进程（含 PID 8292）；未取、覆盖或删除任何锁；未 commit、未 push；未翻状态头；key 值零出境。
