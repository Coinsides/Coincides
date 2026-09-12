> **状态 (Status)**: ready(施工夜;Henry 09-12 睡前令"施工类全清";六件裁定原文=09-12 会议记录 §一/§三/§四)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-12
> **单号**: 13.5 · B1e · 外观清扫小单(13.5 末单)
> **上游**: 09-12 规划场(Henry 拍:入口搬家/墙编辑并入 Layout/分隔线入部件/杂项四件);`current-state/page-frame-and-layout-contract.md` §二(Layout 态定位)

# B1e · 外观清扫小单

六件独立小活,一单打包。HQ 已完成代码侦察,下述文件/行号为现物;若与工作树不符以现物为准并在 Result 申报。

## 一 · 外观入口搬家(Henry 拍原文:"外观控制撤出 Settings,纸上「笔记外观」钮=快选条+详细编辑;Settings 瘦身为一行默认外观")

1. **笔记页工具条加「外观」pill**:`NoteChromeLayer.tsx` 的 toolbarActions(:390)内,Layout pill(:415-428)与 More(:429-436)之间加一颗 modePill(建议 Palette icon,aria-label「笔记外观」);
2. **新 overlay 面板** `data-note-overlay="appearance"`:走现役 FloatingOverlayLayer 弹层通道;overlay key 顺链路加 `'appearance'`:`useFloatingOverlayController.ts:12` 枚举 → 返回值(:52-72)→ `useRuntimeSurfaceStateController.ts`(:38-58/:186-207)→ `useNoteCanvasLayerProps.ts`(:69-110)→ `NoteChromeLayerProps`(:46-99)——⛔ 本地 useState 旁路(必须吃 closeOverlay 互斥语义);
3. **面板内容**=顶部预设快选条(四预设各一枚小色卡钮:底色=该预设 paper 色+desk 边,一键切整套 preset,当前态高亮)+其下现有 `SkinEditor`(把 More 弹层里 :590-593 的 `<details data-paper-appearance>` 整段搬进来,More 里删除);
4. **Settings 瘦身**:`AppearanceSection.tsx` 撤 `advanced preview` 的大编辑器,换成一行——label「默认外观」+ `SkinControls`(advanced=false,surface="all")。⚠️ 该文件 import 写在文件底部(:21-22),动它时把 import 归位文件顶部。

## 二 · 墙编辑并入 Layout 态(Henry 拍;契约档 §二.2)

现状三门:渲染层 `interactive`(`NoteWritingSurfaceLayer.tsx:3625`,现=paperInkTool==='selection')、hook 层 `enabled`(`useNoteCanvasRuntimeController.ts:192`)、runtime `boundary()`(:200/:304)。改为:

1. 墙可交互 ⟺ `layoutMode === true`(三门同改,互相一致);平时 `data-page-frame-wall-interactive='false'`(pointer-events:none,唯一关命中开关,`PageFrameWallLayer.module.css:11-13`)——**误触绝除**;
2. **hover 亮线显影**(`.wall:hover .line`)只在 interactive 时有效(CSS 选择器加 `[data-page-frame-wall-interactive='true']` 门控);**idle 材质显影(--sk-wall-idle)是皮的事,零改**;
3. paperInkEnabled 已含 `!layoutMode`(:709-711)——墙编辑入 Layout 后与墨水工具天然互斥,确认零冲突即可;
4. 同步测试:`PageFrameWallLayer.test.tsx`(:16-38 像素断言/:40-50 事件吞噬)与 `usePageFrameWalls.test.tsx`(enabled 门控前置)。

## 三 · 表头分隔线可见性开关(部件层第五开关,先行件)

最小改动面六处(HQ 侦察定):

1. `shared/types/skin.ts:12-17` SKIN_COMPONENT_OPTIONS 加 `headerRule: ['visible','hidden']`;
2. `client/src/styles/skinPresets.ts:11-17` defaultComponents 与各预设给默认(全部 'visible');
3. `server/src/validators/skin.ts:23-28` 同步加 zod 枚举(⚠️ strict——不加保存 400);
4. `client/src/styles/skinComponentStyles.ts` 产出 `--sk-header-rule`(hidden→'none';visible→既有 outline 值);
5. `NoteDetail.module.css:1151-1164` `.pageReadingHeaderBand`/`.pageReadingPaper` 的 outline 改读该变量;⚠️ warm-paper 分支(:1168-1183)已 outline:none 属材质既定,零动;有封面时 paper 被强制 outline:none(`NoteWritingSurfaceLayer.tsx:3561`)也零动;
6. `SkinControls.tsx:7-8` 补 componentLabels/optionLabels 中文文案(缺 label 渲染 undefined)。

**台账义务**:四键全等断言升五键——`SkinEditor.test.tsx:15-23`、`skinPresets.test.ts:16/24/27/30/75-76`、`server/src/__tests__/v13PaperSkin.test.ts:74/187` 全部同步。

## 四 · 暖纸桌面铺满修复(棕外黑圈)

外圈黑=App 壳 `.main` 的 --bg-gradient / `.content` 28px padding(`AppLayout.module.css:203-226`)在笔记页边缘露出。**先诊断后修**:body.canvas-runtime-lock 已去 padding(`global.css:29-35`),确认黑圈实际来源(疑 .main 背景在 .page 未覆盖处露出)。修法限笔记页容器射程(如 .page 铺满修正/canvas-runtime-lock 下 .main 背景随 --sk-desk);**⛔ 动全站 .content padding/.main 背景**(App 壳资产,波及全站)。验收=暖纸下笔记页视口内零 --bg-gradient 露出(含滚动到底/缩放各档)。⚠️ `.page` 的 `var(--sk-desk, transparent)` 兜底保留(BoardNoteModal 也挂 runtime)。

## 五 · Settings 内容居中

`Settings.module.css` `.page`(max-width:600px 无 auto margin)加 `margin-inline: auto`。单点修,⛔ 连带改版面。

## 六 · Provider 凭据区收折叠

`ProvidersSection.tsx`(:177-201)六条 ProviderRow 包进原生 `<details>`(复用 SkinControls.module.css `.advanced` 的 summary 样式模式或就地新建等价类):默认收起,summary=「AI Provider 凭据(N 已配置)」;展开后列表照旧。⛔ 改动表单行为/路由。

## 禁区

⛔ `docs/audits/2026-09-11-b1d-builder/baseline-source/**` 冻结副本(grep 命中≠可改);⛔ 动 AppLayout 全站面;⛔ canvasRuntimeBoundaryCheck 禁令面(新面板⛔塞 runtime host,⛔ runtimeController 直 import 下层 controller);⛔ 复活 CANVAS_MODE_RETIRED 关掉的 canvas pill;⛔ 安全类测试;⛔ 碰 .git;⛔ commit(工作树交 HQ);⛔ 读 .env 的 provider key 值。

## 验收

1. typecheck+build 绿(client/server/shared);
2. 定向:SkinControls/SkinEditor/skinPresets/skinComponentStyles/v13PaperSkin/NoteChromeLayer/PageFrameWallLayer/usePageFrameWalls 族全绿(含五键升级后);**client 全库必跑**(常备条款);受影响秒级静态门(canvasRuntimeBoundaryCheck 等)PASS;
3. 冒烟(隔离库+真浏览器):①纸上「外观」钮开面板,快选条切四预设逐一生效、SkinEditor 详细编辑可用、More 里旧入口已除;②Settings 一行默认外观+整页居中;③Provider 区默认收起可展开;④非 Layout 态墙 hover 无亮线无命中、Layout 态可拖墙且撤销正常;⑤headerRule 开关 visible/hidden 生效(默认/静墨预设下),暖纸不受扰;⑥暖纸下笔记页无黑圈;
4. 证据落 `docs/audits/2026-09-12-b1e-builder/`(⛔ 构建产物入内)。

## 申报义务

Result 必含:交付清单+numstat、六件逐件完成态、三门同改的接线申报、台账同步清单、测试数字、未做项。冲突停线举证⛔自作主张。
