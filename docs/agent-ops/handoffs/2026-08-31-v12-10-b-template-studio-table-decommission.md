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
