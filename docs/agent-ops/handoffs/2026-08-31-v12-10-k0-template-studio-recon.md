> **状态 (Status)**: done(2026-08-31 总部翻牌:判据全绿,verify 全链 exit 0——见收官报告与本单 Result)
> **from**: claude(fable5,顶班调度会话 bc871bf7) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31「M4 第一单:Template Studio 降级切口——侦察先行,施工后置」。⛔ **不是 Henry**(Henry 裁的是方向「运行时留、工作室删」,不是本单)。
> **上游**: `plans/v12-closeout-milestones.md` §M4 · `current-state/tech-debt.md` TD-33

# 12.10 K-0:Template Studio 面侦察(⛔⛔ 全程只读,零删除零改动)

## 0. ⛔⛔ 先读这六句

1. **本单是侦察,⛔ 不是施工。** 产出=报告+删除计划**草案**;任何删除动作(文件/路由/表/行)都在总部翻牌闸之后的**另一张单**里。⛔ 本单出现任何产品码 diff = 本单作废。
2. **总部口径(待你对现物)**:工作室删除面 ≈ **~4600 行 + 6 路由 + 18 表**。⚠️ 这三个数是**裁定时的估计,⛔ 不是判据**——你的任务是给出**现物清单**;对不上就如实报差异(初核线索:`client/src/pages/Templates/TemplateStudio.tsx` 实测 1462 行,单文件对不上 ~4600 ⇒ 口径大概率是**面合计**,以你的枚举为准)。
3. **切割线 = 「运行时留、工作室删」**(Henry 裁定射程原文)。含糊处**⛔ 不自裁**:逐条列进报告的「切割线含糊区」段,交总部。
4. **dev 库只读**:一切查询以 `better-sqlite3` **`{ readonly: true }`** 打开 `server/coincides.db`;⛔ 不写不建不改任何表;⛔ 行数与元信息之外不倾倒任何表内容字段值。
5. **⛔ 不碰**:`D:/Coinsides/v12.9-selection/**` · `~/.codex/sessions` · 12.9d 新面(imprint 系/检索系)· 画布野地与 crossing 语义相关文件(冻结纪律,连「顺手看看要不要修」都不要)。
6. **零 API 调用零花费。**

## 1. 允许面(⛔ 只这两处可写)

- **新建** `docs/agent-ops/analysis/2026-08-31-v12-10-k0-template-studio-recon.md`(侦察报告)
- **追加**:本单 `## Result`
- (工作性临时查询脚本只许放 `.codex-tmp/` 下,不属交付物,收工留在原地即可)

⛔ **禁区 = 其余一切**(含 `client/src/**` · `server/src/**` · 两份 `package.json` · 迁移目录 · `.env*` · `docs/agent-ops/current-state/**` · `docs/agent-ops/handoffs/plans/**`)。收工须以 `git status --porcelain` 全文贴进回执自证:除上述两文件外零改动。

## 2. 侦察任务(⭐ 四件,全部机械可核)

### R-1 ⭐⭐ 工作室面完整枚举(现物,不是口径)

1. **文件清单**:凡属 Template Studio 工作室面的 client/server 文件逐一点名 + `wc -l` 实测行数 + 合计;并与 ~4600 口径对账(差异如实报)。枚举法要写进报告:从哪些根(页面路由/`index.ts` 挂载/迁移文件)出发、按什么边(import/挂载/外键)收敛;⛔ 不许只按文件名含 `template` 猜。
2. **路由清单**:`server/src/index.ts` 里属于工作室面的挂载**逐行点名**(行号+路径);与「6 路由」口径对账。初核候选(⛔ 待你按消费方核实,不是答案):`/api/templates` · `/api/composition-templates` · `/api/study-templates` · `/api/package-manifests` · `/api/package-exports` · `/api/package-imports` · `/api/domain-block-sets` · `/api/domain-refinements` —— 候选有 8 个而口径是 6,**这个差就是本单要回答的问题之一**。
3. **表清单**:逐表点名 + 建表迁移文件出处;与「18 表」口径对账。初扫已见 17 张(`composition_instance_slots / composition_instances / composition_templates / domain_block_set_compositions / domain_block_set_templates / domain_block_sets / domain_object_classifications / domain_refinement_mappings / domain_refinement_record_items / domain_refinement_records / study_mode_templates / template_definitions / template_migration_mappings / template_migration_record_items / template_migration_records / time_block_template_sets / time_block_templates`)——**第 18 张在哪、或口径多算了哪张,由你答**。⚠️ `time_block_*` 与 `study_mode_templates` 疑似骑在切割线上(运行时消费嫌疑),见 R-3。

### R-2 ⭐⭐⭐ 18 表数据现状申报(分母义务)

对 R-1.3 定稿的**每一张**表:`SELECT COUNT(*)` 行数;行数 > 0 的表**标红**并补三项元信息(⛔ 不倾倒内容):`created_at` 最早/最晚 · `DISTINCT user_id` 数(无 user_id 列则如实说)· 该表行数在哪个用户下(只报 user id,⛔ 不报 email 之外任何画像字段;user id 与 d-1a 申报的 dev 账号对得上就注明「测试账号」)。**报告须给「标红表 → 删除计划如何处置其数据」的对照行**(处置本身候总部裁,你只列选项:导出留证/直接随表删/迁移)。SQL 原文全部贴报告。

### R-3 ⭐⭐⭐ 运行时依赖反查(切割线可行性)

1. **反向 import 图**:对 R-1.1 每个工作室文件,列出**谁 import 它**(client 与 server 各自);把 importer 二分为「工作室面内」与「面外(=运行时)」。**面外 importer ≠ 0 的文件就是切割线上的钉子**,逐个点名。
2. **运行时消费嫌疑重点核查**(⛔ 初核线索,须逐一证实/证伪):`study_mode_templates`(review/study 运行时?)· `time_block_templates` / `time_block_template_sets`(timeBlocks 运行时?)· `CardTemplateContent.tsx`(卡片渲染运行时?)· `db/init.ts` 里的 `SYSTEM_TEMPLATES` 种子(`insertMany`)。每项给出:消费方文件:行号 + 「删了它运行时会断什么」一句话。
3. **门禁反查**:`test:v2` 列表里的 `v2TemplateMigration.test.ts` / `v2DomainPackages.test.ts` / `v2TemplateMigration` 等模板族测试逐个点名——删除面动了它们测什么、删除计划里它们怎么办(删/改/留),列进计划草案。

### R-4 TD-33 关联项清点(「债随码销」的前提核实)

`packagePortability.ts` 三处空指纹(台账记 `:361` `null` · `:441` `''` · `:659` `''`)**现状行号重对**;该文件及其全部调用方(routes/packageManifests·packageExports·packageImports 等)是否**整体落在删除面内**——是,则「TD-33 随码销」成立并写进计划;**有任何调用方在运行时留侧,则「随码销」不成立,标红报总部**。

## 3. 交付:报告 + 分步删除计划草案

报告末章写**分步删除计划(草案,status: draft,候总部翻牌)**:
- 分几步、每步删什么(文件/路由/表分层还是按功能族分)、每步的允许面与禁区;
- **每步门禁**:`tsc --noEmit` · `test:v2`(报每步预期减多少条测试)· `docs:check` · 契约检查(现役 `check:*` 里与模板族相关的逐个点名怎么办);
- 表删除步的**不可逆声明**与回滚点设计(删表前是否留 `.codex-tmp` 快照——列选项候裁,⛔ 不自决);
- R-2 标红表的数据处置选项对照;
- R-3 切割线钉子的逐钉处置建议(改 import / 留文件 / 停线问)。

## 4. 判据(K)

- **K-1 零改动自证**:`git status --porcelain` 全文入回执,除以下三行外空:允许面两文件(本单 ` M` + 报告 `??`)与**开工前即存在**的 ` M server/src/routes/projections.ts`(EOL 状态噪音,零内容 diff,⛔ 不许触碰;`git diff -- server/src/routes/projections.ts` 行数为 0 一并贴)。
- **K-2 三口径对账**:~4600 行 / 6 路由 / 18 表 各给「口径 vs 现物 vs 差异解释」一行,⛔ 不许把口径当现物抄。
- **K-3 分母义务**:R-2 逐表全列,零静默缺失;数字来自查库,SQL 入报告。
- **K-4 切割线含糊区**:凡「运行时留/工作室删」判不动的项,逐条列出并**只列不判**。
- **K-5 门禁**:收工前跑 `npm exec --prefix server -- tsc --noEmit -p server` 与 `npm --prefix server run test:v2`(本单零改动 ⇒ 应与基线一致:**362/362**;不一致即停线报告)。
- **K-6 声明本单没做**:未删任何东西 · 未裁任何含糊项 · 删除计划是草案未生效 · OD/i18n/走查 4a 不在本单。

## 5. 通用纪律(沿 12.9d,全文有效)

搜索纪律(cd 仓库根/仓内相对路径/⛔ 裸盘符入搜索命令/⛔ 反引号续行/输出现仓外路径即停线)· key 值零出境 · ⛔ 不 commit 不 push · ⛔ 不翻状态头 · ⛔ 不改 `.claude/**`、`AGENTS.md`、`CLAUDE.md` · ⛔ 不杀任何进程(含 PID 8292)· 回执 UTF-8 经 apply_patch 或脚本落盘,⛔ 不走 PowerShell/stdin 传中文 · 锁非你所有 · 单内字面矛盾则摊开事实标 `needs: dispatcher` 停线交回。

## 6. 回执(`## Result`)

K-1 porcelain 全文 · K-2 三行对账 · K-3 标红表汇总(几张有数据、最大行数)· K-4 含糊区条数 · K-5 两门 exit · K-6 清单 · 报告路径 · 任何停线点。

## Result

### K-1 零改动自证

`git status --porcelain` 全文：

```text
 M docs/agent-ops/handoffs/2026-08-31-v12-10-k0-template-studio-recon.md
 M server/src/routes/projections.ts
?? docs/agent-ops/analysis/2026-08-31-v12-10-k0-template-studio-recon.md
```

允许面只有本工单回执与新报告。`server/src/routes/projections.ts` 为开工前已存在的 EOL 状态噪音；`git diff --numstat -- server/src/routes/projections.ts` 无 numstat 行，`git diff -- server/src/routes/projections.ts | Measure-Object -Line` = `0`，本单未触碰。

### K-2 三口径对账

- 行数：口径 ~4600；现物核心 whole-file 7029（UI 2182 + 六 route 210 + 五 service 4637）；差异解释为 ~4600 几乎精确对应五 service 子集，未含 UI/route。迁移另 475 行、测试另列。
- 路由：口径 6；现物 6 个专属 mount（`composition-templates`、`package-manifests`、`domain-block-sets`、`package-exports`、`package-imports`、`domain-refinements`）；初核另两项 `/api/templates`、`/api/study-templates` 有运行时消费者，排除。
- 表：口径 18；现物 18，即迁移 026–030 的 3+4+3+4+4 张；初扫 17 张漏了 4 张 package I/O 表并混入 3 张 runtime 表，集合纠正后为 18。

### K-3 分母与标红汇总

18/18 表逐表只读查询完成，无静默缺失。5 张有数据：`composition_templates` 6、`package_manifests` 1、`domain_block_sets` 3、`domain_block_set_templates` 20、`domain_block_set_compositions` 7；最大 20。全部属于 d-1a 已申报测试账号 user id `3f346a00-c53e-4ed9-8202-e869c65e8cf9`。SQL 原文及三类处置选项已入报告。

### K-4 含糊区

共 **7 项**，全部只列不判：template runtime/CRUD 函数切面、composition 能力、共享 proposals/validators、NoteBlock lifecycle blocker、历史迁移策略、五张标红表数据处置、template compatibility report 归属。

### K-5 门禁

- `npm exec --prefix server -- tsc --noEmit -p server`：exit `0`。
- `npm --prefix server run test:v2`：exit `0`，`362/362` pass，`0` fail。

### K-6 本单明确没做

- 未删除任何东西。
- 未裁任何含糊项。
- 删除计划为 `status: draft`，未生效。
- OD / i18n / 走查 4a 不在本单。
- 未调用 API、未 commit、未 push、未杀进程、未输出 key 值、未翻状态头。

报告：`docs/agent-ops/analysis/2026-08-31-v12-10-k0-template-studio-recon.md`。

停线点：无。TD-33 的条件结论为：`packagePortability.ts` 三处空指纹仍在 361/441/659；其生产调用方全在工作室删除族，因此只在该族整体删除后「债随码销」成立。
