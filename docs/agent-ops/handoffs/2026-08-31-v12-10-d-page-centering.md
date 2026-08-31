> **状态 (Status)**: done(2026-08-31 总部翻牌:判据全绿——见本单 Result 与收官报告)
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

## Result

### K-1 诊断先行(修复前草段)

- **病灶**:`client/src/pages/Notes/NoteDetail.module.css:104-109`。`.documentShell` 以 `margin: 0 auto` 居中到当前 containing block,所以它服从的是侧栏之后的 main 内容盒中心,不是浏览器视口中心。
- **偏移量**:侧栏展开宽 `270px`、收起宽 `60px`(`client/src/styles/global.css:143-144`);若 main 没有纵向滚动槽,页框中心相对视口中心分别右偏 `270 / 2 = 135px`、`60 / 2 = 30px`。若 main 的纵向滚动槽占宽 `g px`,实际右偏分别是 `(270 - g) / 2 px`、`(60 - g) / 2 px`。
- **成因链**:`AppLayout.tsx:102-103` 在 note 路由保留侧栏 → `AppLayout.module.css:12-24` 给侧栏 `270px / 60px` 固定宽 → `AppLayout.module.css:203-205` 让 `.main` 只占剩余宽度并自行纵向滚动 → `AppLayout.module.css:218-224` 给内容盒左右各 `28px` 对称 padding(不产生左右差,会相消)→ `.documentShell` 的 auto margin 只看这个 post-sidebar 内容盒 → `.writingSurface` 虽在壳内对称(`:1021-1029`),整张页仍随壳右偏。
- **已排除**:`viewportService.ts:30-32` 的 page offset 为 `0`;`.writingSurface` 常规与移动断点左右 padding 对称;`.blockListPage` 宽度本身对称;因此修复必须改变 page 壳的居中参考系,不能改 placement / affiliation / guide / modePolicy / blockProjection / export / crossing。
- **拟修同因**:page 模式按当前 main 的真实 `left + clientWidth / 2` 与 `window.innerWidth / 2` 之差施加反向展示偏移;这样同时覆盖侧栏展开/收起、侧栏过渡和 main 滚动槽宽度。canvas 分支不应用该偏移。

### 实施与修后几何

- `viewportService.ts:34-40` 新增纯展示几何函数:`viewportWidth / 2 - (containerLeft + containerClientWidth / 2)`。
- `NoteWritingSurfaceLayer.tsx:987-1003` 只在 `surfaceMode === 'page'` 时读取 main 的实时 `left/clientWidth`,写入 CSS 变量并用 `ResizeObserver` 跟随侧栏宽度、窗口宽度与滚动槽变化;cleanup 断观察并删变量。
- `NoteDetail.module.css:1023,1034` 让 page surface 使用该偏移,canvas 后置规则明确 `left: 0`。修后页框中心 = `mainCenter + (viewportCenter - mainCenter) = viewportCenter`,理论偏移恒为 `0px`。

### K-2 canvas 零变化与边界门

- `viewportService.ts` 的新增函数是无副作用纯函数,既有 `getPrimaryPageOffsetX` 与 Canvas viewport/world 路径未改。
- `NoteWritingSurfaceLayer.tsx` 新 effect 的首闸是 `surfaceMode !== 'page'` 即退出,canvas 不建 observer、不写变量。
- `NoteDetail.module.css` 的 `.writingSurfaceCanvas` 在共享规则之后强制 `left: 0`;即使模式切换 cleanup 尚未执行,canvas 的展示几何也不吃 page 偏移。
- placement / affiliation / guide / modePolicy / blockProjection / export / crossing 文件零 diff。
- `npm run check:canvas-runtime-boundary`:**exit 0**(159/159 passed)。
- `npm run smoke:canvas-engine-model-contract`:**exit 0**(60/60 groups passed)。

### K-3 静态断言红绿自证

- 新建 `pageCenteringContract.test.ts`:数值锁住展开 `-135px`、收起 `-30px`、17px 滚动槽 `-126.5px`;源码锁住 page-only 接线、精确几何函数调用、CSS 变量承重行与 canvas `left: 0` 覆盖。
- 绿(修复在):定向测试 **3/3,exit 0**。
- 红(真实反证):经 `apply_patch` 临时删除 `.writingSurface` 的 `left: var(--page-centering-offset-x, 0px)`,原测试未改;定向测试 **1 failed / 2 passed,exit 1**,失败点正是 page 偏移承重行缺失。
- 恢复(仍经 `apply_patch`):定向测试回到 **3/3,exit 0**。因此断言会拦住本病回归,不是装饰性存在检查。

### K-4 门禁与总闸

- `npm --prefix client run build`:**exit 0**。
- `npm run test:unit`:**exit 0**(35 files,291/291 tests passed)。
- `npm run docs:check`:**exit 0**。
- `npm --prefix server run test:v2`:**exit 0**(328/328 passed,基线不动)。
- 仓库必跑总闸 `npm run verify:v2-bn8-runtime`:**exit 0**;其中再次覆盖上述 unit、Canvas 两门、client/server build、performance smoke、docs、`git diff --check` 与 changed-file secret scan。
- 独立 `git diff --check`:**exit 0**。

### K-5 视觉终验申报

视觉居中的体感终验归 Henry 本人下次走查,本单只交付几何论证与回归断言。

本单遵令未运行 browser-harness 截图。

### K-6 本单明确没做

- 未裁、未改 crossing 三选一悬案;仍候 Henry。
- 未调整 canvas 模式任何行为或几何。
- 未处理走查其余条目。
- 零 API 调用、零花费;未碰 server 交付面;未 commit、未 push、未翻状态头、未杀进程。

### 最终 porcelain(全文)

```text
 M client/src/pages/Notes/NoteDetail.module.css
 M client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx
 M client/src/pages/Notes/canvasEngine/viewportService.ts
 M docs/agent-ops/handoffs/2026-08-31-v12-10-d-page-centering.md
 M server/src/routes/projections.ts
?? client/src/pages/Notes/canvasEngine/pageCenteringContract.test.ts
```

`server/src/routes/projections.ts` 是开工前已存在噪音行,本单未读写;其余均在允许面内。停线点:无;`needs: dispatcher`:否。
