> **状态 (Status)**: done(2026-08-31 总部翻牌:判据全绿,verify 全链 exit 0——见收官报告与本单 Result)
> **from**: claude(fable5,顶班调度会话 bc871bf7) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31「Step 0 闸通过,七项裁定,分两单施工」。⛔ **不是 Henry**(Henry 裁的是方向「运行时留、工作室删」)。
> **上游**: `analysis/2026-08-31-v12-10-k0-template-studio-recon.md`(⭐ 必读,文件清单/行号/测试段落全在里面)· `handoffs/2026-08-31-v12-10-k0-template-studio-recon.md`

# 施工单甲:Template Studio 代码域退役(Step 1–3;⛔ 可逆域,零 DB 动作)

## 0. ⛔⛔ 先读这七句

1. **本单 = K-0 计划的 Step 1–3,⛔ Step 4–5(删表/schema/noteBlockLifecycle/TD-33 销账)是另一张单乙,本单一个字节不许碰 DB 层**:18 表 · `server/src/db/**`(schema.sql/迁移/init)· `server/src/services/noteBlockLifecycle.ts` 全在禁区。
2. **分腿施工**:每个 Step 一腿;**做完一腿即停**(追加该腿回执后收工退出),调度方复核+提交后以 resume 下达下一腿令。⛔ 不许一口气做完三步。
3. **test:v2 总数 = 裁定后清单**:Step 1 后 **362/362** · Step 2 后 **362/362** · Step 3 后 **327/327**。⛔ 「少测了所以绿」不算绿——总数不等于裁定值即停线。
4. **运行时留侧一根手指不碰**(K-0 §4.2 四项已判留):`/api/templates` 与 `/api/study-templates` 的 mount · `templateDefinitions.ts` 的 seed/list/get/runtime metadata merge 函数 · study/time-block/card 运行时 · `db/init.ts` 的 SYSTEM_TEMPLATES 种子。
5. **⛔ 不碰**:12.9d 新面(imprint/检索系)· 画布野地与 crossing 语义(冻结纪律)· `D:/Coinsides/v12.9-selection/**` · `~/.codex/sessions`。
6. **零 API 调用零花费。**
7. 切割处发现 K-0 未列的钉子(新的面外 importer / 编译断点越出允许面):**停线标 `needs: dispatcher`**,⛔ 不自行扩面。

## 1. 允许面(全单并集;⭐ 各腿实际可动面在 §3 按腿收紧,腿内越出本节即红)

- **删除** `client/src/pages/Templates/TemplateStudio.tsx`
- **删除** `client/src/pages/Templates/TemplateStudio.module.css`
- **手术** `client/src/App.tsx`
- **手术** `client/src/components/Layout/AppLayout.tsx`
- **删除** `server/src/routes/compositionTemplates.ts`
- **删除** `server/src/routes/packageManifests.ts`
- **删除** `server/src/routes/domainBlockSets.ts`
- **删除** `server/src/routes/packageExports.ts`
- **删除** `server/src/routes/packageImports.ts`
- **删除** `server/src/routes/domainRefinements.ts`
- **手术** `server/src/index.ts`
- **手术** `server/src/routes/templates.ts`
- **手术** `server/src/routes/proposals.ts`
- **手术** `server/src/validators/index.ts`
- **删除** `server/src/services/compositionTemplates.ts`
- **删除** `server/src/services/domainPackages.ts`
- **删除** `server/src/services/packagePortability.ts`
- **删除** `server/src/services/templateMigrationProposals.ts`
- **删除** `server/src/services/domainRefinementProposals.ts`
- **手术** `server/src/services/templateDefinitions.ts`
- **删除** `server/src/__tests__/v2TemplateMigration.test.ts`
- **删除** `server/src/__tests__/v2PackagePortability.test.ts`
- **删除** `server/src/__tests__/v2DomainRefinement.test.ts`
- **删除** `server/src/__tests__/v2DomainPackages.test.ts`
- **手术** `server/src/__tests__/v2MaterialLibrary.test.ts`
- **手术** `server/src/__tests__/v2SourceMaterialization.test.ts`
- **修改** `server/package.json`(仅 test:v2 列表;⛔ 不改依赖)
- **手术** `client/scripts/v2Bn11LegacyShutdownContractCheck.mjs`
- **追加**:本单各腿 `## Result(腿 N)`

⛔ **禁区 = 其余一切**,点名强调:`server/src/db/**` · `server/src/services/noteBlockLifecycle.ts` · `server/src/routes/studyTemplates.ts` · `server/src/routes/timeBlocks.ts` · `client/src/components/CardFlip/**` · `server/src/services/imprint*` · `server/src/services/sourceImprints.ts` · 根 `package.json`(闸对根级文件有盲区,此项人工核过)· `.env*`。

## 2. 总部七裁(⭐ 本单执行其 1/2/3/7;4/5/6 归单乙,列此为边界)

1. **templateDefinitions 函数边界**:保留 seed/list/get/runtime metadata merge;**删 create/copy/update/lifecycle/usage**(V13/V14 新造物⛔不复用,不留悬肉)。
2. **composition 能力判死随族删**(`compositionTemplates.ts` 整文件 + 其 route;三张表归单乙)。
3. **共享 proposals/validators 分支机械切除**;历史 pending 记录⛔不迁移——宿主在 18 表内者随表亡(单乙),在保留表中者留存为不可消费状态并在回执申报现存行数(只读 COUNT,⛔ 不倾倒内容)。
4. (单乙)NoteBlock blocker 删除 = 期望语义,注释+正向关闭测试。
5. (单乙)迁移史 026–030 保留 + forward DROP 殿后;schema.sql 删声明。
6. (单乙)标红表 JSON 留证入仓 + 整库仓外快照,双前置。
7. **`getTemplateCompatibilityReport` 判工作室诊断,删**(连同其测试;Step 3 落点 **327**)。

## 3. 三腿定义(允许面按腿收紧;文件行号以 K-0 报告 §2 为准)

### 腿 1(= Step 1)前端工作室退役

- **删除**:`client/src/pages/Templates/TemplateStudio.tsx` · `client/src/pages/Templates/TemplateStudio.module.css`
- **手术**:`client/src/App.tsx`(移除 import 与 route 挂载)· `client/src/components/Layout/AppLayout.tsx`(移除 `/templates` 导航项)
- 门禁:`npm exec --prefix server -- tsc --noEmit -p server` · `npm --prefix server run test:v2`(**362/362**)· `npm --prefix client run build` · `npm run docs:check`
- ⛔ 本腿禁区:server 侧一切。

### 腿 2(= Step 2)六路由与共享入口退役

- **删除**:`server/src/routes/compositionTemplates.ts` · `server/src/routes/packageManifests.ts` · `server/src/routes/domainBlockSets.ts` · `server/src/routes/packageExports.ts` · `server/src/routes/packageImports.ts` · `server/src/routes/domainRefinements.ts`
- **手术**:`server/src/index.ts`(移除六 import 六 mount;⛔ `/api/templates`:159 与 `/api/study-templates`:142 不许动)· `server/src/routes/templates.ts`(移除工作室写端点,保留 runtime GET 面)· `server/src/routes/proposals.ts`(切 template migration / domain refinement 分支)· `server/src/validators/index.ts`(切对应 schema)
- **申报义务(裁 3)**:切除后以只读 COUNT 查共享宿主表中被切分支类型的现存 pending 行数,进本腿回执(0 也要报;无此宿主表则如实说)。
- 门禁:tsc · test:v2(**362/362**)· `npm run docs:check` · `npm run check:v2-bn11-legacy-shutdown` · `npm run check:tool-face-manifest`
- ⛔ 本腿禁区:五个 service 文件、一切测试文件、client 侧。

### 腿 3(= Step 3)服务与测试收缩

- **删除**:`server/src/services/compositionTemplates.ts` · `server/src/services/domainPackages.ts` · `server/src/services/packagePortability.ts` · `server/src/services/templateMigrationProposals.ts` · `server/src/services/domainRefinementProposals.ts` · `server/src/__tests__/v2TemplateMigration.test.ts` · `server/src/__tests__/v2PackagePortability.test.ts` · `server/src/__tests__/v2DomainRefinement.test.ts` · `server/src/__tests__/v2DomainPackages.test.ts`
- **手术**:`server/src/services/templateDefinitions.ts`(按裁 1+7:删 create/copy/update/lifecycle/usage 与 `getTemplateCompatibilityReport`,保 seed/list/get/runtime merge)· `server/src/__tests__/v2MaterialLibrary.test.ts`(删 composition 5 条 + template editor CRUD/usage 6 条 + compatibility 1 条;运行时 seed/merge/canvas 测试⛔不动)· `server/src/__tests__/v2SourceMaterialization.test.ts`(混合 scanner 测试改写为只覆盖仍活的 runtime scanner,条数不减)· `server/package.json`(test:v2 列表去四文件;⛔ 不改依赖)· `client/scripts/v2Bn11LegacyShutdownContractCheck.mjs`(去掉对已删 `templateMigrationProposals.ts` 的 read,其余断言保留)
- 门禁:tsc · test:v2(**327/327**,⛔ 总数必须恰等)· `npm run docs:check` · `npm run check:v2-bn11-legacy-shutdown` · `npm run check:tool-face-manifest` · `npm --prefix client run build`
- ⛔ 本腿禁区:DB 层全部(18 表仍在库中、schema/迁移/ noteBlockLifecycle 原样)。

## 4. 判据(K,每腿回执逐条)

- **K-1 允许面自证**:每腿收工 `git status --porcelain` 全文入回执;出现本腿允许面之外的路径(除 ` M server/src/routes/projections.ts` 开工前噪音,零内容 diff 一并贴)即红。
- **K-2 test:v2 总数=裁定值**:362 / 362 / 327,并报「删了哪些测试、各几条」的清单与裁定对账(K-0 §4.3 为底账)。
- **K-3 运行时留侧零 diff**:每腿对以下逐项 `git diff --quiet` 贴 exit:`server/src/services/noteBlockLifecycle.ts` · `server/src/db` · `server/src/routes/studyTemplates.ts` · `server/src/routes/timeBlocks.ts` · `client/src/components/CardFlip` · 腿 3 另附 `templateDefinitions.ts` 保留函数清单(名字逐个列,证明 seed/list/get/merge 在)。
- **K-4 新钉子申报**:切割中发现 K-0 未列 importer/断点,停线报;没有则明写「未发现」。
- **K-5 声明本腿没做**:另两腿内容 + 单乙全部内容。

## 5. 通用纪律(沿 12.9d/K-0,全文有效)

搜索纪律(cd 仓库根/相对路径/⛔ 裸盘符入搜索命令/⛔ 反引号续行/仓外路径出现即停线)· key 值零出境 · ⛔ 不 commit 不 push · ⛔ 不翻状态头 · ⛔ 不改 `.claude/**`、`AGENTS.md`、`CLAUDE.md` · ⛔ 不杀任何进程(含 PID 8292)· 回执中文经 apply_patch 落盘⛔不走 stdin · 锁非你所有 · 字面矛盾摊开标 `needs: dispatcher`。

## 6. 回执(每腿追加一段 `## Result(腿 N)`)

K-1 porcelain 全文 · K-2 总数与对账 · K-3 逐项 exit · K-4 · K-5 · 门禁各 exit · 停线点。

## Result(腿 1)

腿 1 已完成；仅退役前端 Template Studio 页面、样式、路由挂载与导航入口。⛔ 未进入腿 2 / 腿 3，未 commit，未 push，未调用 API，未终止进程，未输出 key 值，未翻状态头。

### K-1 允许面自证

收工 `git status --porcelain=v1` 全文：

```text
 M client/src/App.tsx
 M client/src/components/Layout/AppLayout.tsx
 D client/src/pages/Templates/TemplateStudio.module.css
 D client/src/pages/Templates/TemplateStudio.tsx
 M docs/agent-ops/handoffs/2026-08-31-v12-10-a-template-studio-code-retirement.md
 M server/src/routes/projections.ts
```

- `client/src/App.tsx`：仅移除 `TemplateStudioPage` import 与 `templates` route。
- `client/src/components/Layout/AppLayout.tsx`：仅移除 `/templates` 导航项及随之失去消费者的 `LayoutTemplate` import。
- `client/src/pages/Templates/TemplateStudio.tsx`：删除 1462 行。
- `client/src/pages/Templates/TemplateStudio.module.css`：删除 720 行。
- `server/src/routes/projections.ts`：开工前既有噪音；`git diff --quiet -- server/src/routes/projections.ts` exit 0，`git diff --cached --quiet -- server/src/routes/projections.ts` exit 0，确认零内容 diff，本腿未触碰。
- `git diff --check`：exit 0。

### K-2 test:v2 总数与裁定对账

- 裁定值：腿 1 后 362/362。
- 实跑：362/362 pass，0 fail，exit 0。
- 本腿删除测试：无，0 条；对账为 362 → 362，符合 K-0 §4.3 与本单 §3。

### K-3 运行时留侧零 diff

逐项执行 `git diff --quiet -- <path>`：

```text
server/src/services/noteBlockLifecycle.ts  exit 0
server/src/db                              exit 0
server/src/routes/studyTemplates.ts        exit 0
server/src/routes/timeBlocks.ts            exit 0
client/src/components/CardFlip             exit 0
```

### K-4 新钉子申报

未发现。CodeGraph 反向边与 K-0 一致；切割后对 `client/src` 精确复扫 `pages/Templates/TemplateStudio`、`TemplateStudioPage`、`to: '/templates'`、`path="templates"` 为零命中（`rg` exit 1），server tsc 与 client build 均无编译断点。

### K-5 本腿明确未做

- 未做腿 2：未删除六个 server route，未手术 `server/src/index.ts`、`server/src/routes/templates.ts`、`server/src/routes/proposals.ts`、`server/src/validators/index.ts`。
- 未做腿 3：未删除五个 server service 或四个专用测试，未手术 `templateDefinitions.ts`、MaterialLibrary / SourceMaterialization 测试、`server/package.json` 或 BN11 legacy check。
- 未做单乙全部内容：未动 18 表、schema、迁移、`noteBlockLifecycle.ts`、数据处置、TD-33 销账或任何 DB 层内容。

### 门禁

```text
npm exec --prefix server -- tsc --noEmit -p server  exit 0
npm --prefix server run test:v2                   exit 0  (362/362 pass, 0 fail)
npm --prefix client run build                     exit 0
npm run docs:check                                exit 0
```

client build 仅保留既有的动态/静态 import 与 chunk size 警告；无编译失败。停线点：无。

## Result(腿 2)

needs: dispatcher

腿 2 的代码切口已按定义落盘：删除六个 route 文件，移除 `server/src/index.ts` 的六个 import 与六个 mount；`/api/templates` 与 `/api/study-templates` mount 原样保留；`server/src/routes/templates.ts` 仅保留 runtime seed/list/get 面（`GET /`、`POST /seed-system`、`GET /:id`）；`server/src/routes/proposals.ts` 与 `server/src/validators/index.ts` 已机械切除 template migration / domain refinement 分支与 schema。未 commit，未 push，未调用 API，未终止进程，未输出 key 值，未翻状态头。

但腿 2 尚不能判定完成：`npm run docs:check` 报 `docs/generated/object-inventory.md` 过期。该生成文件未列入工单总允许面、腿 2 允许面或 K-0 钉子底账；依 §5「允许面不够 / K-0 未列钉子即停线」纪律，没有运行会写入该文件的生成器，也没有修改该文件。需调度方明确授权将 `docs/generated/object-inventory.md` 纳入腿 2 机械生成面，或给出其他处置。

### K-1 允许面自证

收工 `git status --porcelain=v1` 全文：

```text
 M docs/agent-ops/handoffs/2026-08-31-v12-10-a-template-studio-code-retirement.md
 M server/src/index.ts
 D server/src/routes/compositionTemplates.ts
 D server/src/routes/domainBlockSets.ts
 D server/src/routes/domainRefinements.ts
 D server/src/routes/packageExports.ts
 D server/src/routes/packageImports.ts
 D server/src/routes/packageManifests.ts
 M server/src/routes/projections.ts
 M server/src/routes/proposals.ts
 M server/src/routes/templates.ts
 M server/src/validators/index.ts
```

- `server/src/index.ts`：仅移除六个退役 route 的 import 与 mount；`/api/templates`、`/api/study-templates` 均仍在。
- 六个 `server/src/routes/*.ts`：按腿 2 清单删除。
- `server/src/routes/templates.ts`：仅切工作室 create/copy/update/lifecycle/usage/compatibility 写作与诊断面，保留 runtime seed/list/get。
- `server/src/routes/proposals.ts`、`server/src/validators/index.ts`：仅切 template migration / domain refinement 两分支及对应 schema。
- 本 handoff：仅追加本段 `## Result(腿 2)`，状态头未翻。
- `server/src/routes/projections.ts`：开工前既有噪音；`git diff --quiet -- server/src/routes/projections.ts` exit 0，`git diff --cached --quiet -- server/src/routes/projections.ts` exit 0，本腿未触碰。
- `docs/generated/object-inventory.md`：`git diff --quiet -- docs/generated/object-inventory.md` exit 0；因不在允许面而保持未改。
- `git diff --check`：exit 0。

### K-2 test:v2 总数与裁定对账

- 裁定值：腿 2 后 362/362。
- 实跑：362/362 pass，0 fail，exit 0。
- 本腿删除测试：无，0 条；五个 service 与全部测试文件均保留。对账为 362 → 362，符合 K-0 §4.3 与本单 §3。

### 裁 3 共享宿主表 pending 申报

切除后对共享宿主表 `proposals` 只读 COUNT（未读取或输出业务行内容）：

```text
template_migration  pending  0
domain_refinement   pending  0
```

### K-3 运行时留侧零 diff

逐项执行 `git diff --quiet -- <path>`：

```text
server/src/services/noteBlockLifecycle.ts  exit 0
server/src/db                              exit 0
server/src/routes/studyTemplates.ts        exit 0
server/src/routes/timeBlocks.ts            exit 0
client/src/components/CardFlip             exit 0
```

另核：五个腿 3 service 合并 `git diff --quiet` exit 0；`server/src/__tests__`、`client/src`、`server/package.json` 合并 `git diff --quiet` exit 0。

### K-4 新钉子申报

- 发现一枚 K-0 未列钉子：六 route 删除使 `docs/generated/object-inventory.md` 过期，导致 `docs:check` exit 1；但该生成文件不在允许面。已停线，未运行写入生成器，未越面修复。
- 除上述生成库存钉子外，未发现 K-0 未列的 importer 或断点。CodeGraph 与精确反扫确认：六个 route 模块只由 `server/src/index.ts` 挂载；客户端模板消费者只剩 `client/src/services/templateOptions.ts` 的 `GET /templates`，其 runtime 面已保留。

### K-5 本腿明确未做

- 未做腿 1：未改任何 client 文件；腿 1 已由调度方所述提交 `b15ab2a` 承载，本腿没有回改。
- 未做腿 3：未删除五个 service 或四个专用测试，未手术 `templateDefinitions.ts`、MaterialLibrary / SourceMaterialization 测试、`server/package.json` 或 BN11 legacy check 脚本。
- 未做单乙全部内容：未动 18 表、schema、迁移、`noteBlockLifecycle.ts`、数据处置、TD-33 销账或任何 DB 层内容。

### 门禁

```text
npm exec --prefix server -- tsc --noEmit -p server  exit 0
npm --prefix server run test:v2                   exit 0  (362/362 pass, 0 fail)
npm run docs:check                                exit 1  (docs/generated/object-inventory.md 过期)
npm run check:v2-bn11-legacy-shutdown             exit 0
npm run check:tool-face-manifest                  exit 0
```

停线点：`docs/generated/object-inventory.md` 不在允许面而门禁要求其刷新；needs: dispatcher。腿 2 未宣告完成，未进入腿 3。

## Result(腿 3)

腿 3 已完成；仅收缩五个工作室 service、四个专用测试、裁定函数段与点名测试/清单/legacy check。未重做腿 1 / 腿 2，未进入单乙；未 commit，未 push，未调用 API，未终止进程，未输出 key 值，未翻状态头，未修改生成件。

### K-1 允许面自证

收工 `git status --porcelain=v1` 全文：

```text
 M client/scripts/v2Bn11LegacyShutdownContractCheck.mjs
 M docs/agent-ops/handoffs/2026-08-31-v12-10-a-template-studio-code-retirement.md
 M server/package.json
 D server/src/__tests__/v2DomainPackages.test.ts
 D server/src/__tests__/v2DomainRefinement.test.ts
 M server/src/__tests__/v2MaterialLibrary.test.ts
 D server/src/__tests__/v2PackagePortability.test.ts
 M server/src/__tests__/v2SourceMaterialization.test.ts
 D server/src/__tests__/v2TemplateMigration.test.ts
 M server/src/routes/projections.ts
 D server/src/services/compositionTemplates.ts
 D server/src/services/domainPackages.ts
 D server/src/services/domainRefinementProposals.ts
 D server/src/services/packagePortability.ts
 M server/src/services/templateDefinitions.ts
 D server/src/services/templateMigrationProposals.ts
```

- 五个 service 与四个专用测试：按腿 3 清单删除。
- `server/src/services/templateDefinitions.ts`：删除 create/copy/update/lifecycle/usage 与 compatibility report 及其专属 helper/type，只留 runtime seed/list/get/metadata merge 内核。
- `server/src/__tests__/v2MaterialLibrary.test.ts`：删除 composition 5 条、template editor CRUD/usage 6 条、compatibility 1 条；runtime seed/merge/canvas 测试条数、名字与断言意图保留。
- `server/src/__tests__/v2SourceMaterialization.test.ts`：混合 scanner 测试改为只覆盖仍活的 source-anchor runtime scanner，条数不减。
- `server/package.json`：仅从 `test:v2` 列表移除四个已删测试文件，依赖未改。
- `client/scripts/v2Bn11LegacyShutdownContractCheck.mjs`：仅移除对已删 `templateMigrationProposals.ts` 的 read，其余断言保留。
- 本 handoff：把预切割 blocked 回执原位改写为本完成态 `## Result(腿 3)`，状态头未翻。
- `server/src/routes/projections.ts`：开工前既有噪音；`git diff --quiet -- server/src/routes/projections.ts` exit 0，`git diff --cached --quiet -- server/src/routes/projections.ts` exit 0，本腿未触碰。
- `git diff --check`：exit 0。

### canvas 保留测试 setup 等价性与语义

`v2.5.1 canvas block insertion accepts runtime user templates` 的测试名和原有断言未改，只替换 setup：

- 行形状对齐迁移 025 的 `template_definitions` schema：完整写入 id/user/key/version/origin/scope/label/taxonomy/schema/behavior/summary/status/is_system/metadata 与时间戳。
- 对齐删前 `copyTemplateDefinition`：`origin='user'`、`scope_type='global'`、`scope_id=''`、`is_system=0`，复制系统模板的 description、system/learning/legacy taxonomy、field/default/render/source/relation/proposal JSON 与 summary，并保留 copied-from metadata。
- 对齐删前 `activateTemplateDefinition`：fixture 直接写 `status='active'`。
- 该测试现语义为：生产创建路径已退役后，数据库中既有的用户所有 active 历史模板仍须被 canvas runtime 接受与尊重。

### K-2 test:v2 总数与裁定对账

K-0 §4.3 逐项：

```text
v2DomainPackages.test.ts        5
v2TemplateMigration.test.ts     6
v2PackagePortability.test.ts    7
v2DomainRefinement.test.ts      5
四专用文件小计                 23
MaterialLibrary composition     5
MaterialLibrary editor CRUD     6
MaterialLibrary compatibility   1
总删除                          35
Source mixed scanner            1 -> 1（改写，条数不减）
总数                           362 -> 327
```

- `v2MaterialLibrary.test.ts`：71 → 59，恰减 12。
- `v2SourceMaterialization.test.ts`：11 → 11。
- 首跑总数已为 327，但既有 DevQuickLogin 固定端口 50550 瞬时碰撞：326 pass / 1 fail，exit 1；未杀进程、未改测试。
- 完整复跑：327/327 pass，0 fail，exit 0，恰等裁定值。

### K-3 运行时留侧零 diff与 templateDefinitions 保留函数

逐项执行 `git diff --quiet -- <path>`：

```text
server/src/services/noteBlockLifecycle.ts  exit 0
server/src/db                              exit 0
server/src/routes/studyTemplates.ts        exit 0
server/src/routes/timeBlocks.ts            exit 0
client/src/components/CardFlip             exit 0
```

`server/src/services/templateDefinitions.ts` 收工仅保留以下 exported functions：

```text
seedSystemTemplateDefinitions
listTemplateDefinitions
getTemplateDefinition
mergeRuntimeNoteBlockTemplateMetadata
legacyBlockTypeForRuntimeTemplate
```

其中 seed/list/get/runtime metadata merge 与 runtime legacy block type 解析均在；对五个已删 module 路径及 create/copy/update/lifecycle/usage/compatibility 判死函数做精确反扫，零命中（`rg` exit 1）。

### K-4 新钉子申报

未发现。预切割发现的 canvas setup 互斥已按调度方修复裁定处理：只在测试 fixture 层直接种等价历史 active 用户模板，测试名、条数与断言意图不动；未发现其他保留测试或生产文件消费判死函数。删除后 tsc、327/327 与六门禁均未暴露允许面外编译断点。

### K-5 本腿明确未做

- 未做腿 1 / 腿 2：未改前端工作室产品码、六 route 或共享入口。
- 未做单乙全部内容：18 表仍在库；未动 schema、迁移、`noteBlockLifecycle.ts`、数据处置、TD-33 销账或任何 DB 层文件。原有 `noteBlockLifecycle.ts` 对候删表的查询按裁定保持原样。
- 未修改 INDEX / inventory 等生成件；本腿 `docs:check` 直接为绿。
- 未扩改其它 Source/canvas/runtime 测试或产品逻辑。

### 门禁

```text
npm exec --prefix server -- tsc --noEmit -p server  exit 0
npm --prefix server run test:v2                   exit 0  (327/327 pass, 0 fail；复跑)
npm run docs:check                                exit 0
npm run check:v2-bn11-legacy-shutdown             exit 0
npm run check:tool-face-manifest                  exit 0
npm --prefix client run build                     exit 0
```

client build 仅有既有动态/静态 import 与 chunk size 警告；无编译失败。测试首跑固定端口碰撞已在 K-2 如实申报，最终完整门禁为绿。停线点：无。
