> **状态 (Status)**: complete（侦察完成；末章删除计划仍为 `draft`，候总部翻牌）
> **层 (Layer)**: 分析 / Analysis（非权威）
> **日期 (Updated)**: 2026-08-31
> **工单**: `docs/agent-ops/handoffs/2026-08-31-v12-10-k0-template-studio-recon.md`
> **边界**: 全程只读产品码、迁移、配置与 dev DB；未调用 API；未删除或修改任何运行时对象。

# 12.10 K-0：Template Studio 面侦察

## 0. 结论先行

1. 「6 路由」现物成立：它指向 `composition/package/domain` 六个工作室专属挂载，不含必须保留的 `/api/templates` 与 `/api/study-templates`。
2. 「18 表」现物成立：迁移 `026–030` 共建 18 张表；`025` 的 `template_definitions` 是运行时表，必须留。初扫的 17 张混入了 3 张明确运行时表，同时漏了 4 张 package import/export 表；第 18 张不是单纯补一张即可，而是口径集合本身需要纠正。
3. 「~4600 行」不是完整删除面。五个工作室服务文件当前合计 **4637 行**，几乎正好解释该估计；加上工作室 UI 2182 行和六个 route wrapper 210 行，核心 whole-file 现物为 **7029 行**。若再列历史建表迁移 475 行，则为 7504 行；测试另列，不混入产品面。
4. 18 表中 **5 张有数据**，最大行数为 20；全部只属于 d-1a 已申报的测试账号 `3f346a00-c53e-4ed9-8202-e869c65e8cf9`。本报告不替总部选择导出、直删或迁移。
5. `packagePortability.ts` 三个空指纹仍精确位于 361 / 441 / 659；生产直接调用方只有两个工作室路由，另有一个专用测试。若该服务与两个路由整体删除，TD-33「债随码销」成立。
6. 明确运行时保留：`template_definitions` 读/合并内核、`study_mode_templates`、`time_block_template_sets`、`time_block_templates`、`CardTemplateContent.tsx`、`db/init.ts` 的 `SYSTEM_TEMPLATES` 种子。

## 1. 枚举方法与射程

从三类根开始，按边收敛，不按文件名猜：

- client 根：`client/src/App.tsx:14,98` → `TemplateStudio.tsx` → CSS 与实际 API 消费。
- server 根：`server/src/index.ts:51-57,142,159-165` → route mount → route import 的 service → service 间 import。
- DB 根：工作室 service 中的 SQL 表名 → `schema.sql` / 迁移 `025–030` 的建表出处 → `PRAGMA foreign_key_list` 元信息。

反向边使用 CodeGraph 后再以仓内相对路径 `rg` 核行号；行数使用 `wc -l`。dev DB 由 `.codex-tmp/template-studio-db-recon.mjs` 通过指向 `server/package.json` 的 `createRequire` 解析 `better-sqlite3`，并以：

```js
new Database(resolve('server/coincides.db'), { readonly: true, fileMustExist: true })
```

打开。查询只投影表/列/FK 元信息、行数、`created_at` 边界、`user_id` 去重数与按 user id 的行数；没有读取或输出其它内容字段值。

## 2. R-1：工作室面现物

### 2.1 核心 whole-file 清单

| 层 | 文件 | `wc -l` | 归类 |
|---|---|---:|---|
| client | `client/src/pages/Templates/TemplateStudio.tsx` | 1462 | 工作室 UI |
| client | `client/src/pages/Templates/TemplateStudio.module.css` | 720 | 工作室 UI |
| server route | `server/src/routes/compositionTemplates.ts` | 35 | 工作室专属挂载 |
| server route | `server/src/routes/packageManifests.ts` | 39 | 工作室专属挂载 |
| server route | `server/src/routes/domainBlockSets.ts` | 35 | 工作室专属挂载 |
| server route | `server/src/routes/packageExports.ts` | 38 | 工作室专属挂载 |
| server route | `server/src/routes/packageImports.ts` | 34 | 工作室专属挂载 |
| server route | `server/src/routes/domainRefinements.ts` | 29 | 工作室专属挂载 |
| server service | `server/src/services/compositionTemplates.ts` | 928 | 工作室服务族；带未接活生产入口的 composition 实例化能力，见含糊区 |
| server service | `server/src/services/domainPackages.ts` | 752 | 工作室服务族 |
| server service | `server/src/services/packagePortability.ts` | 1272 | 工作室服务族；TD-33 所在 |
| server service | `server/src/services/templateMigrationProposals.ts` | 586 | 工作室治理族；由共享 proposals 路由接入 |
| server service | `server/src/services/domainRefinementProposals.ts` | 1099 | 工作室治理族；由共享 proposals 路由接入 |
|  | **核心 whole-file 合计** | **7029** | UI 2182 + routes 210 + services 4637 |

迁移出处另列，不把历史迁移行数伪装成产品运行时代码：

| 文件 | `wc -l` | 建表数 |
|---|---:|---:|
| `server/src/db/migrations/026_v2_composition_templates.ts` | 78 | 3 |
| `server/src/db/migrations/027_v2_domain_packages.ts` | 105 | 4 |
| `server/src/db/migrations/028_v2_template_migration_proposals.ts` | 80 | 3 |
| `server/src/db/migrations/029_v2_package_import_export.ts` | 92 | 4 |
| `server/src/db/migrations/030_v2_domain_refinement_proposals.ts` | 120 | 4 |
| **合计** | **475** | **18** |

专用测试 whole-file 另列：`v2TemplateMigration.test.ts` 250、`v2PackagePortability.test.ts` 208、`v2DomainRefinement.test.ts` 222、`v2DomainPackages.test.ts` 139，共 819 行。`v2MaterialLibrary.test.ts` 还含 5 条 composition 测试；`v2SourceMaterialization.test.ts` 有 1 条混合 scanner 测试。测试不计入 7029 产品面。

### 2.2 必须手术而不能 whole-file 删除的共享钉子

| 文件与行号 | 共享原因 / 未来施工点 |
|---|---|
| `client/src/App.tsx:14,98` | 导入并挂载工作室页；App 本身保留 |
| `client/src/components/Layout/AppLayout.tsx:30` | `/templates` 导航项；布局保留 |
| `server/src/index.ts:52-57,160-165` | 六个 route import/mount；server shell 保留 |
| `server/src/routes/templates.ts` | `/api/templates` 同时承载运行时 GET 与工作室 CRUD/lifecycle；不能 whole-file 删 |
| `server/src/services/templateDefinitions.ts:410-1072` | seed/list/get/metadata merge 是运行时；create/copy/update/lifecycle/usage/compatibility 是切割线钉子 |
| `server/src/routes/proposals.ts:9-10,18-19,117-142,185-191` | template/domain proposal 只是共享路由的一部分 |
| `server/src/validators/index.ts:340-385` | template/domain proposal schema 只是共享 validator 的一部分 |
| `server/src/services/noteBlockLifecycle.ts:740-789` | 运行时删除保护仍查询 5 张候删表；删表前必须同步改掉查询与 blocker 词 |
| `server/src/db/schema.sql:1241-1678` | 基础 schema 仍声明 18 表；不能只加 DROP 而让 fresh DB 重建回来 |
| `server/package.json:22` | `test:v2` 显式列出 4 个专用测试文件 |
| `client/scripts/v2Bn11LegacyShutdownContractCheck.mjs:100-103` | `check:v2-bn11-legacy-shutdown` 主动读取 `templateMigrationProposals.ts`；文件删除后检查本身会报错 |
| `server/src/__tests__/v2MaterialLibrary.test.ts:908-1092,2314-2465` | 6 条模板工作室 CRUD/usage 测试 + 5 条 composition 测试；运行时模板测试须留 |
| `server/src/__tests__/v2SourceMaterialization.test.ts:664-720` | 混合 scanner 测试引用 template migration/domain 服务；测试主体属 Source 运行时，不能 whole-file 删 |

### 2.3 路由挂载对账

六个工作室专属挂载：

| `server/src/index.ts` | mount |
|---:|---|
| 160 | `/api/composition-templates` |
| 161 | `/api/package-manifests` |
| 162 | `/api/domain-block-sets` |
| 163 | `/api/package-exports` |
| 164 | `/api/package-imports` |
| 165 | `/api/domain-refinements` |

候选中的另两个必须留：

- `server/src/index.ts:159` `/api/templates`：`client/src/services/templateOptions.ts:84` 被 Notes canvas `useNoteCanvasDataAdapter.ts:659` 调用；server 的 `notes.ts:269`、`noteBlocks.ts:91` 也消费同一 runtime metadata 内核。只允许裁掉 CRUD/lifecycle 子路由，不得删 mount。
- `server/src/index.ts:142` `/api/study-templates`：由 study route 读取，且 `server/src/agent/tools/executor.ts:245` 直接查询同表。

### 2.4 18 表与迁移出处

| 表 | 建表出处 |
|---|---|
| `composition_templates` | `026_v2_composition_templates.ts:8` |
| `composition_instances` | `026_v2_composition_templates.ts:35` |
| `composition_instance_slots` | `026_v2_composition_templates.ts:56` |
| `package_manifests` | `027_v2_domain_packages.ts:8` |
| `domain_block_sets` | `027_v2_domain_packages.ts:39` |
| `domain_block_set_templates` | `027_v2_domain_packages.ts:68` |
| `domain_block_set_compositions` | `027_v2_domain_packages.ts:86` |
| `template_migration_mappings` | `028_v2_template_migration_proposals.ts:8` |
| `template_migration_records` | `028_v2_template_migration_proposals.ts:30` |
| `template_migration_record_items` | `028_v2_template_migration_proposals.ts:58` |
| `package_exports` | `029_v2_package_import_export.ts:8` |
| `package_import_previews` | `029_v2_package_import_export.ts:29` |
| `package_import_records` | `029_v2_package_import_export.ts:53` |
| `package_import_record_items` | `029_v2_package_import_export.ts:74` |
| `domain_refinement_mappings` | `030_v2_domain_refinement_proposals.ts:8` |
| `domain_refinement_records` | `030_v2_domain_refinement_proposals.ts:35` |
| `domain_refinement_record_items` | `030_v2_domain_refinement_proposals.ts:67` |
| `domain_object_classifications` | `030_v2_domain_refinement_proposals.ts:87` |

`template_definitions` 出自 `025_v2_template_definitions.ts:8`，但它是运行时模板真相，不在 18 表删除集合。`study_mode_templates` 出自基础 `schema.sql:327`；两个 time-block 表出自迁移 012；三者也不在 18 表集合。

### 2.5 三口径对账

| 口径 | 总部估计 | 现物 | 差异解释 |
|---|---:|---:|---|
| 行数 | ~4600 | 核心 whole-file 7029；其中五个 service 恰为 4637 | ~4600 是 service 子集估计，不是完整 UI+route+service 删除面；迁移与测试另列 |
| 路由 | 6 | 6 个专属 mount | 初核 8 个中，`/api/templates` 与 `/api/study-templates` 是运行时共享/专属面，排除后正好 6 |
| 表 | 18 | 18 | 正确集合是迁移 026–030；初扫 17 张漏 4 张 package I/O 表、却混入 3 张 runtime 表，集合替换后为 18 |

## 3. R-2：18 表数据现状

所有 18 表都有 `created_at` 与 `user_id` 列。`—` 表示零行，不是漏查。

| 表 | 行数 | created_at 最早 / 最晚 | DISTINCT user_id | 按 user id 行数 |
|---|---:|---|---:|---|
| 🔴 `composition_templates` | **6** | 2026-06-22 21:33:31 / 同时 | 1 | 测试账号 `3f346a00-c53e-4ed9-8202-e869c65e8cf9`: 6 |
| `composition_instances` | 0 | — | 0 | — |
| `composition_instance_slots` | 0 | — | 0 | — |
| 🔴 `package_manifests` | **1** | 2026-08-24 15:19:34 / 同时 | 1 | 测试账号同上: 1 |
| 🔴 `domain_block_sets` | **3** | 2026-08-24 15:19:34 / 同时 | 1 | 测试账号同上: 3 |
| 🔴 `domain_block_set_templates` | **20** | 2026-08-29 04:36:10 / 同时 | 1 | 测试账号同上: 20 |
| 🔴 `domain_block_set_compositions` | **7** | 2026-08-29 04:36:10 / 同时 | 1 | 测试账号同上: 7 |
| `template_migration_mappings` | 0 | — | 0 | — |
| `template_migration_records` | 0 | — | 0 | — |
| `template_migration_record_items` | 0 | — | 0 | — |
| `package_exports` | 0 | — | 0 | — |
| `package_import_previews` | 0 | — | 0 | — |
| `package_import_records` | 0 | — | 0 | — |
| `package_import_record_items` | 0 | — | 0 | — |
| `domain_refinement_mappings` | 0 | — | 0 | — |
| `domain_refinement_records` | 0 | — | 0 | — |
| `domain_refinement_record_items` | 0 | — | 0 | — |
| `domain_object_classifications` | 0 | — | 0 | — |

注：有数据表实际为 5 张；其中 4 个数据族（composition、manifest、domain、domain membership）。“标红表汇总”按物理表计为 **5/18**，最大 20 行。

### 3.1 标红表的数据处置选项（只列不选）

| 标红表 | 选项 A | 选项 B | 选项 C |
|---|---|---|---|
| `composition_templates` | 导出留证后删 | 测试账号数据直接随表删 | 迁入只读历史表/外部归档 |
| `package_manifests` | 导出留证后删 | 测试账号数据直接随表删 | 迁入只读历史表/外部归档 |
| `domain_block_sets` | 与 manifest/membership 一起导出留证 | 测试账号数据直接随表删 | 迁入只读历史表/外部归档 |
| `domain_block_set_templates` | 与 domain set 一起导出留证 | 测试账号数据直接随表删 | 迁入只读历史表/外部归档 |
| `domain_block_set_compositions` | 与 domain/composition 一起导出留证 | 测试账号数据直接随表删 | 迁入只读历史表/外部归档 |

### 3.2 本次执行的 SQL 原文

下列每组四条均由只读连接逐条执行；没有 `SELECT *`，没有投影业务内容列。

```sql
-- composition_templates
SELECT COUNT(*) AS row_count FROM "composition_templates";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "composition_templates";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "composition_templates";
SELECT user_id, COUNT(*) AS row_count FROM "composition_templates" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- composition_instances
SELECT COUNT(*) AS row_count FROM "composition_instances";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "composition_instances";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "composition_instances";
SELECT user_id, COUNT(*) AS row_count FROM "composition_instances" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- composition_instance_slots
SELECT COUNT(*) AS row_count FROM "composition_instance_slots";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "composition_instance_slots";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "composition_instance_slots";
SELECT user_id, COUNT(*) AS row_count FROM "composition_instance_slots" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- package_manifests
SELECT COUNT(*) AS row_count FROM "package_manifests";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "package_manifests";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "package_manifests";
SELECT user_id, COUNT(*) AS row_count FROM "package_manifests" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- domain_block_sets
SELECT COUNT(*) AS row_count FROM "domain_block_sets";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "domain_block_sets";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "domain_block_sets";
SELECT user_id, COUNT(*) AS row_count FROM "domain_block_sets" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- domain_block_set_templates
SELECT COUNT(*) AS row_count FROM "domain_block_set_templates";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "domain_block_set_templates";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "domain_block_set_templates";
SELECT user_id, COUNT(*) AS row_count FROM "domain_block_set_templates" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- domain_block_set_compositions
SELECT COUNT(*) AS row_count FROM "domain_block_set_compositions";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "domain_block_set_compositions";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "domain_block_set_compositions";
SELECT user_id, COUNT(*) AS row_count FROM "domain_block_set_compositions" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- template_migration_mappings
SELECT COUNT(*) AS row_count FROM "template_migration_mappings";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "template_migration_mappings";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "template_migration_mappings";
SELECT user_id, COUNT(*) AS row_count FROM "template_migration_mappings" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- template_migration_records
SELECT COUNT(*) AS row_count FROM "template_migration_records";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "template_migration_records";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "template_migration_records";
SELECT user_id, COUNT(*) AS row_count FROM "template_migration_records" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- template_migration_record_items
SELECT COUNT(*) AS row_count FROM "template_migration_record_items";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "template_migration_record_items";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "template_migration_record_items";
SELECT user_id, COUNT(*) AS row_count FROM "template_migration_record_items" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- package_exports
SELECT COUNT(*) AS row_count FROM "package_exports";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "package_exports";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "package_exports";
SELECT user_id, COUNT(*) AS row_count FROM "package_exports" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- package_import_previews
SELECT COUNT(*) AS row_count FROM "package_import_previews";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "package_import_previews";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "package_import_previews";
SELECT user_id, COUNT(*) AS row_count FROM "package_import_previews" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- package_import_records
SELECT COUNT(*) AS row_count FROM "package_import_records";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "package_import_records";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "package_import_records";
SELECT user_id, COUNT(*) AS row_count FROM "package_import_records" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- package_import_record_items
SELECT COUNT(*) AS row_count FROM "package_import_record_items";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "package_import_record_items";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "package_import_record_items";
SELECT user_id, COUNT(*) AS row_count FROM "package_import_record_items" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- domain_refinement_mappings
SELECT COUNT(*) AS row_count FROM "domain_refinement_mappings";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "domain_refinement_mappings";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "domain_refinement_mappings";
SELECT user_id, COUNT(*) AS row_count FROM "domain_refinement_mappings" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- domain_refinement_records
SELECT COUNT(*) AS row_count FROM "domain_refinement_records";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "domain_refinement_records";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "domain_refinement_records";
SELECT user_id, COUNT(*) AS row_count FROM "domain_refinement_records" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- domain_refinement_record_items
SELECT COUNT(*) AS row_count FROM "domain_refinement_record_items";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "domain_refinement_record_items";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "domain_refinement_record_items";
SELECT user_id, COUNT(*) AS row_count FROM "domain_refinement_record_items" GROUP BY user_id ORDER BY row_count DESC, user_id;
-- domain_object_classifications
SELECT COUNT(*) AS row_count FROM "domain_object_classifications";
SELECT MIN(created_at) AS earliest_created_at, MAX(created_at) AS latest_created_at FROM "domain_object_classifications";
SELECT COUNT(DISTINCT user_id) AS distinct_user_id FROM "domain_object_classifications";
SELECT user_id, COUNT(*) AS row_count FROM "domain_object_classifications" GROUP BY user_id ORDER BY row_count DESC, user_id;
```

另执行两类纯元信息 SQL：逐表 `PRAGMA table_info("<table>")`，以及对仓内表逐一执行 `PRAGMA foreign_key_list("<table>")`。后者确认 18 表之间共有 18 条入向 FK，未发现 18 表集合外的 DB 表通过声明式 FK 指向它们；代码级外部查询仍见 `noteBlockLifecycle.ts`，不能以“无外部 FK”代替运行时反查。

## 4. R-3：反向 import 与运行时依赖

### 4.1 whole-file 反向图

| 被 import 文件 | 面内 importer | 面外生产 importer | 测试/门禁 importer | 结论 |
|---|---|---|---|---|
| `TemplateStudio.tsx` | — | `client/src/App.tsx:14` | — | App 钉子；删页同时拆 route |
| `TemplateStudio.module.css` | `TemplateStudio.tsx:22` | 0 | 0 | 可随页删 |
| 六个 route 文件 | — | `server/src/index.ts:52-57` | 0 | index 钉子 |
| `compositionTemplates.ts` | composition route、`domainPackages.ts:10-13`、`packagePortability.ts:13` | 0 | `v2MaterialLibrary.test.ts` | 当前无面外生产 importer；但文件内部有 composition 实例化能力，列入含糊区 |
| `domainPackages.ts` | package/domain routes、`domainRefinementProposals.ts:5-8`、`packagePortability.ts:5-11` | 0 | 三个专用测试 + `v2SourceMaterialization.test.ts:42` | 生产调用全在工作室族内 |
| `packagePortability.ts` | package export/import routes | 0 | `v2PackagePortability.test.ts` | 生产调用全在工作室族内 |
| `templateMigrationProposals.ts` | — | `routes/proposals.ts:19`（共享路由） | 专用测试 + `v2SourceMaterialization.test.ts:41` | proposals 与 Source 测试钉子 |
| `domainRefinementProposals.ts` | `domainRefinements.ts:7` | `routes/proposals.ts:18`（共享路由） | 专用测试 + `v2SourceMaterialization.test.ts:43` | proposals 与 Source 测试钉子 |
| 迁移 `026–030` | — | `db/migrate.ts:61-74` 动态加载整个目录 | fresh-DB 测试 | 不能简单删历史文件；见含糊区 |

共享 `templateDefinitions.ts` 的面外生产消费者很多：`notes.ts:269`、`noteBlocks.ts:91`、`noteBlockLifecycle.ts:436`、`organizedNoteProposals.ts:195-196,260,483`、`learningCanvases.ts:551,573`，以及 client runtime option 链。因此它与 `template_definitions` 必须保留，只能按函数切。

### 4.2 四个运行时嫌疑逐项核实

| 项 | 消费证据 | 删除后会断什么 |
|---|---|---|
| `study_mode_templates` | `routes/studyTemplates.ts:22,35`；`agent/tools/executor.ts:245`；mount `index.ts:142` | study template REST 与 agent 的 study-template 读取同时失效 |
| `time_block_template_sets` / `time_block_templates` | `routes/timeBlocks.ts:261-387`；`timeBlockStore.ts:83-130`；`TemplateEditorModal.tsx:18-20,267-289`；mount `index.ts:145` | Calendar 的模板集 CRUD、模板项保存与按日期套用全部失效 |
| `CardTemplateContent.tsx` | `CardFlip.tsx:5,83` | 卡片翻面内容按 definition/theorem/formula/general 类型渲染的运行时 import/build 断裂 |
| `db/init.ts` `SYSTEM_TEMPLATES` | 常量 `:179`；transaction `:238`；`insertMany(SYSTEM_TEMPLATES)` `:244`；启动调用 `:159` | 系统 study 模板不再播种；若只删表而留种子，启动时直接 SQL 失败 |

判定：四项全部是「运行时留」，不属于 18 表或六路由删除面。

### 4.3 test:v2 与契约门禁反查

| 测试/检查 | 当前条数 | 测什么 | 删除草案处理 |
|---|---:|---|---|
| `v2DomainPackages.test.ts` | 5 | 迁移、seed、preview、安全过滤、兼容性 | 随 domain package 服务删；从 `test:v2` 列表移除 |
| `v2TemplateMigration.test.ts` | 6 | 迁移、proposal、三种 apply/阻断、active edit 治理 | 随 migration governance 删；从列表移除 |
| `v2PackagePortability.test.ts` | 7 | 迁移、light/trusted export、hash、preview/apply/discard | 随 portability 删；从列表移除 |
| `v2DomainRefinement.test.ts` | 5 | 迁移、preview、alias/soft/hard 行为 | 随 refinement 删；从列表移除 |
| `v2MaterialLibrary.test.ts:2314-2465` | 5 | composition 迁移/seed/proposal/apply/discard | 只删这 5 条，保留文件其它运行时测试 |
| `v2MaterialLibrary.test.ts:908-1092` | 6 | template editor copy/update/activate/archive/usage | 若删工作室 CRUD/usage，则删这 6 条；运行时 seed/merge/canvas 测试保留 |
| `v2SourceMaterialization.test.ts:664-720` | 1（混合） | projection block 被旧 template/domain/usage/scanner 排除 | 测试本身保留并改成只覆盖仍活的 runtime scanner；条数不减 |
| `check:v2-bn11-legacy-shutdown` | 非 test:v2 | 读取 `templateMigrationProposals.ts` 做 Relation 旧词禁入 | 删除该文件时同步删其 read 目标；其余断言保留 |

专属族明确减少 **28 条**（23 个四专用文件 + 5 个 composition 混合测试）；若同时移除 template editor CRUD/usage，则再减 6 条，合计 **34 条**，362 → **328**。`getTemplateCompatibilityReport` 是否属工作室仍需总部裁；若也删，其测试再减 1，变 327。数据库 drop 应新增至少 1 条“18 表 fresh/upgrade 后均不存在、runtime 表仍存在”的关闭测试，届时净总数相应 +1。

## 5. R-4：TD-33

现状行号与台账完全一致：

- `server/src/services/packagePortability.ts:361` → `content_hash: null`
- `server/src/services/packagePortability.ts:441` → `content_hash: ''`
- `server/src/services/packagePortability.ts:659` → `content_hash: ''`

直接 importers 全量：

- 生产：`routes/packageExports.ts:9`、`routes/packageImports.ts:10`
- 测试：`v2PackagePortability.test.ts:14`

`routes/packageManifests.ts` 不是 `packagePortability.ts` 的直接调用方；它通过 `domainPackages.ts` 属于同一工作室删除族。没有发现运行时留侧直接或间接进入 `packagePortability.ts`。因此在“服务文件 + export/import 两路由 + 专用测试整体删除”的前提下，**TD-33 随码销成立**；若总部决定保留任何 package import/export 能力，则本结论立即失效，必须另修三处空指纹。

## 6. K-4：切割线含糊区（7 项，只列不判）

1. `/api/templates` mount 与 `templateDefinitions.ts` 内部函数边界：runtime list/get/seed/merge 必留，CRUD/lifecycle/usage/compatibility 的精确去留需逐函数翻牌。
2. `compositionTemplates.ts` 与三张 composition 表：当前无面外生产 importer，但文件内部能生成 NoteBlock/CanvasNode/instance；“能力存在但入口已死”是否算运行时，不在本单自裁。
3. 共享 `routes/proposals.ts` / validators 中的 template migration、domain refinement 分支：可机械切除，但历史 pending proposal 的处置语义未裁。
4. `noteBlockLifecycle.ts:740-789` 的五类 blocker：删表后必须删查询；对应“历史引用不再阻止 NoteBlock 删除”是否就是期望语义，需总部确认。
5. 迁移策略：保留 `026–030` 历史文件再加 forward DROP，还是从 fresh schema/迁移链物理移除旧迁移；两者影响 fresh DB 与迁移史，不自决。
6. 五张标红表的数据处置：导出留证、直接随表删、迁移三选一；本单只列选项。
7. `getTemplateCompatibilityReport` 及其测试：没有当前 client 消费，但它读 runtime `template_definitions`；归“工作室诊断”还是“运行时健康检查”需总部裁。

## 7. 分步删除计划（`status: draft`，候总部翻牌）

### Step 0：裁定闸（零代码）

- 总部逐项裁第 6 节 7 个含糊项，尤其是 composition 能力、template compatibility、五张有数据表的处置与迁移史策略。
- 允许面：只更新正式施工单/裁定记录。
- 禁区：产品码、DB、迁移；没有裁定不得进入 Step 1。
- 门禁：无测试变化；记录基线 `tsc=0`、`test:v2=362/362`。

### Step 1：前端工作室退役

- 删除 `TemplateStudio.tsx` 与 CSS；从 `App.tsx` 移除 import/route；从 `AppLayout.tsx` 移除 nav。
- 允许面：上述四个 client 文件及对应前端测试（现物未见专用测试）。
- 禁区：runtime template options、Notes canvas、CardFlip、Calendar/time-block UI。
- 预期 test:v2 变化：0，仍 362。
- 门禁：`tsc --noEmit`、`test:v2`、`docs:check`；另跑 client build。现役 `check:*` 无 TemplateStudio 专项，仍全跑通用门禁。

### Step 2：六路由与共享 proposal 入口退役

- 删除六 route modules，移除 `index.ts:52-57,160-165`；从共享 proposals/validators 只切 template migration/domain refinement 分支。
- `/api/templates` 与 `/api/study-templates` mount 明确禁止删除；`/api/templates` 先仅移除已裁工作室写端点，保留 runtime GET。
- 允许面：六 route、`index.ts`、`routes/templates.ts`、`routes/proposals.ts`、validators。
- 禁区：五个 service、18 表、study/time-block/card runtime。
- 预期 test:v2 变化：0（service-level tests 暂留），仍 362。
- 门禁：`tsc --noEmit`、`test:v2`、`docs:check`、`check:v2-bn11-legacy-shutdown`、`check:tool-face-manifest`/parity（证实无 tool 注册残挂）。

### Step 3：服务与测试收缩

- 删除五个工作室 service；按裁定从 `templateDefinitions.ts` 移除 editor CRUD/lifecycle/usage，保留 seed/list/get/runtime merge；改写 Source 混合 scanner 测试；更新 `server/package.json` 测试清单与 BN11 legacy check。
- 允许面：五 service、templateDefinitions 的裁定函数段、四专用测试、MaterialLibrary/SourceMaterialization 对应测试段、server package 脚本、legacy check。
- 禁区：18 表与 schema；study/time-block/card runtime；其它 Source/canvas 逻辑。
- 预期 test:v2：专属族 -28，template editor -6，净 **362 → 328**；若总部另裁 compatibility report 删除，则 **327**。不得用“少测了所以绿”代替清单核对。
- 门禁：`tsc --noEmit`、`test:v2`（总数必须等于裁定后的 328 或 327）、`docs:check`、全部现役 `check:*`；`check:v2-bn11-legacy-shutdown` 保留但去掉已删除文件 read。

### Step 4：18 表 forward decommission（不可逆步）

- 用新迁移按 FK 子表→父表顺序 DROP 18 表；同步从 `schema.sql` 删除建表段；同步移除 `noteBlockLifecycle.ts:740-789` 对候删表的查询/blocker；历史迁移 `026–030` 如何处理按 Step 0 裁定。
- 允许面：新迁移、schema、noteBlockLifecycle、专门的关闭测试。
- 禁区：`template_definitions`、`study_mode_templates`、`time_block_template_*` 及其种子/路由；其它真相层表。
- 不可逆声明：DROP 后仅靠 git 回滚不能恢复表内数据。
- 回滚点候选（只列不选）：A. 操作前复制整个 `server/coincides.db` 到 `.codex-tmp`；B. 只导出 18 表 SQL/JSON 留证到 `.codex-tmp`；C. 先迁入只读 archive 表再 DROP；D. 对测试账号数据直接 DROP、无数据迁移。A/B 的 `.codex-tmp` 均不是长期备份，若需持久留证必须另定受管位置。
- 预期 test:v2：删除旧测试不再减；新增至少 1 条关闭测试，故相对 Step 3 **+1**（329 或 328）。
- 门禁：`tsc --noEmit`、`test:v2`、`docs:check`、全部 `check:*`；额外在 fresh DB 与现有 DB upgrade 两条路径断言 18 表不存在、三个明确 runtime 表与 `template_definitions` 仍存在。

### Step 5：TD-33 与文档收口

- 只有在 `packagePortability.ts` 与全部生产调用方确已删除时，把 TD-33 标为“随码销”；若任一调用方保留则停线，另开修债单。
- 更新 current-state/tech-debt、相关现状文档与施工回执；这是未来施工单的允许面，不是 K-0 的写入授权。
- 预期 test:v2 变化：0。
- 门禁：全门禁 + `git diff --check`；复核不存在六 mount、五 service import、18 表声明与 TD-33 三处空指纹。

## 8. K-5 基线与 K-6 声明

- `npm exec --prefix server -- tsc --noEmit -p server`：exit 0。
- `npm --prefix server run test:v2`：exit 0，362/362 pass，0 fail。
- 本单未删除任何东西。
- 本单未裁任何含糊项；第 6 节 7 项全部交总部。
- 第 7 节删除计划是 `draft`，未生效。
- OD / i18n / 走查 4a 不在本单。
- 没有 API 调用、commit、push、进程终止、key 值输出或状态头翻牌。
