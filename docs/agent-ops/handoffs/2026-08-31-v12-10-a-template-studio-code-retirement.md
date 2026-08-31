> **状态 (Status)**: ready(顶班调度按总部 2026-08-31 Step-0 闸裁定翻牌;裁定出处:总部七裁(逐项见 §2)+ K-0 计划 §7 Step 1–3;不代表 Henry 逐张批过本单)
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
