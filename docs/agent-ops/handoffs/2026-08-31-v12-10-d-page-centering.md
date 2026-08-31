> **状态 (Status)**: ready(顶班调度按总部 2026-08-31 M4 余量令翻牌;裁定出处:走查 #4a(🅱 老病在案)+ 总部当日续办令;不代表 Henry 逐张批过本单)
> **from**: claude(fable5,顶班调度会话 bc871bf7) · **to**: codex(builder) · **date**: 2026-08-31
> **裁定来源**: 总部(Fable)2026-08-31「走查 4a 居中不中:侦察定位现物,小修」。⛔ **不是 Henry**(病历是他的原话:「居中的不是很中」)。
> **上游**: `analysis/2026-08-29-ux-walkthrough-findings.md` §4(a)· 调度方侦察(本单 §2)

# 施工单丁:page 模式「居中不是很中」诊断与小修(走查 #4a)

## 0. ⛔⛔ 先读这六句

1. **先诊断后动刀**:病灶未锁定(见 §2 已排除项)。诊断结论(哪个文件哪行造成偏移、偏移量多少 px、为何)**先写进回执草段**再实施修复;修复必须与诊断同因。
2. **⛔ 冻结纪律**:凡触碰画布野地 / crossing 语义(placement/affiliation/boundary/export 判定)一律不做——本单只许**展示层几何**(CSS/居中偏移常量/类绑定)。canvas 模式行为零变化。
3. **小修**:diff 以十行计,⛔ 不重构。诊断指向允许面(§1)之外的文件即停线标 `needs: dispatcher`。
4. **证据口径(调度方判,报总部备案)**:数字化 before/after(修前偏移量与成因推导、修后对称性论证)+ 可表达处加一条静态回归断言;⛔ 不跑 browser-harness 截图(重器);**视觉终验按家规归 Henry 本人下次体感走查**,回执明写此申报。
5. **零 API 调用零花费。**
6. ⛔ 不碰 server、不碰 12.9d/M4.1/单丙交付面。

## 2. 调度方侦察底账(已排除/已知)

- page 模式 `pageOffsetX = getPrimaryPageOffsetX('page') = 0`(`viewportService.ts:30-32`)⇒ 偏移非来自 policy 常量;
- `.writingSurface`(`NoteDetail.module.css:1021`)flex `justify-content: center`,padding `54px 72px 72px` 左右对称;移动断点 `:4345` padding `32px 22px 52px` 亦左右对称 ⇒ 明面 CSS 未见不对称;
- TD-32 的类绑定病已清(`19a6410`),与本病无涉;
- 候选嫌疑(⛔ 未证,逐一查):①页面级容器(NoteDetail 布局列/侧栏/面板)造成的**视口级**不对称(页框对容器居中但容器对视口不居中);②纵向滚动条出现后容器内容宽收窄未补偿(scrollbar gutter);③块的绝对定位 x 基准与页框内容盒 inset 的错位;④`justify-content:center` 的居中对象与页框可视边界(border/shadow/inset)不一致。

## 1. 允许面(⛔ 只这些;诊断可读全仓,动刀只许这里)

- **手术** `client/src/pages/Notes/NoteDetail.module.css`
- **手术** `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx`
- **手术** `client/src/pages/Notes/NoteDetail.tsx`
- **手术** `client/src/pages/Notes/canvasEngine/viewportService.ts`
- **新建** `client/src/pages/Notes/canvasEngine/pageCenteringContract.test.ts`(静态回归断言;若断言不可诚实表达则不建,回执说明为何)
- **修改** `client/package.json`(⭐ 仅当新测试需挂 `test:unit` 列表;⛔ 不改依赖;不需要则零 diff)
- **追加**:本单 `## Result`

⛔ **禁区 = 其余一切**,点名:`placementService` · `pageFrameAffiliationService` · `pageFrameGuideService` · `modePolicyService` · `blockProjectionService` · 一切 export/crossing 相关 · `client/scripts/canvasRuntimeBoundaryCheck.mjs`(契约闸若因你改动而红 = 你越界的信号,停线)。

## 3. 判据(K)

- **K-1 诊断先行**:回执含「病灶文件:行 + 偏移量 px + 成因链」;修复 diff 与诊断同因,⛔ 不许「顺手多修」。
- **K-2 canvas 零变化**:`git diff` 内凡触及共享代码处,回执逐处论证 canvas 模式行为不变;`npm run check:canvas-runtime-boundary`(若存在于根 package.json,以现物为准)与 `npm run smoke:canvas-engine-model-contract` 贴 exit。
- **K-3 静态断言**:新断言红/绿自证(注掉修复该断言变红的验证过程写进回执);不可诚实表达则如实申报并不建(⛔ 装饰性断言更糟)。
- **K-4 门禁**:`npm --prefix client run build` · `npm run test:unit` · `npm run docs:check`(生成件口径照旧)· `npm --prefix server run test:v2`(**328/328** 不动)。
- **K-5 视觉终验申报**:逐字含「视觉居中的体感终验归 Henry 本人下次走查,本单只交付几何论证与回归断言。」
- **K-6 声明本单没做**:crossing 三选一悬案(仍候 Henry)· canvas 模式任何调整 · 走查其余条目。

## 4. 通用纪律(沿本节各单,一字不减)

搜索纪律 · key 值零出境 · ⛔ 不 commit 不 push · ⛔ 不翻状态头 · ⛔ 不改 `.claude/**`、`AGENTS.md`、`CLAUDE.md` · ⛔ 不杀任何进程(含 PID 8292)· 回执经 apply_patch 落盘⛔不走 stdin · 锁非你所有 · 字面矛盾摊开标 `needs: dispatcher` 停线交回。

## 5. 回执(`## Result`)

K-1 诊断链 · K-2 论证与 exit · K-3 红绿自证 · K-4 各 exit · K-5 逐字申报 · K-6 · porcelain 全文(允许面 + 本单 M + 噪音行 ` M server/src/routes/projections.ts` 外应空)· 停线点。
