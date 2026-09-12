> **状态 (Status)**: done(2026-09-12 Codex builder 六件施工与功能验收完成；待 HQ 复核/放行；原施工授权与裁定不变)
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

## Result

**执行者**：Codex builder；**日期**：2026-09-12。六件施工完成，工作树交 HQ；此处 done 表示工程交付，不替代 HQ 复核与主观放行。证据入口：[B1e builder README](../../audits/2026-09-12-b1e-builder/README.md)。未 commit，未使用 Git 或访问 `.git`，未执行安全类测试，未读取 `.env` 的 key 值，未改旧 audits 冻结副本。

### 六件完成态

| 项 | 状态 | 交付与验证 |
| --- | --- | --- |
| 1. 外观入口搬家 | 完成 | Layout 与 More 之间新增 Palette「外观」按钮，aria-label 为「笔记外观」。`appearance` 走共享 FloatingOverlayLayer 与 closeOverlay 互斥链路；四张 paper 底色/desk 边色卡一键替换整套 preset、当前态高亮。原 More 内 details + SkinEditor 移入面板，详细颜色编辑可用，More 旧入口删除。Settings 改为一行默认外观，import 归顶。浏览器逐一切四预设、详细编辑保存均通过。 |
| 2. 墙编辑并入 Layout | 完成 | 渲染、hook、history boundary 三门均加入 Layout 条件（详见下节）；hover 亮线只在 interactive=true 显影，idle 材质不动。离开 Layout 会取消正在进行的墙拖动，不追加保存或 history。浏览器非 Layout 拖过墙后边距仍为 72；Layout 拖墙 72 → 121.81224489795918，Ctrl+Z 恢复 72。 |
| 3. 表头分隔线第五开关 | 完成 | shared 枚举、四预设默认 visible、server strict zod、CSS token/消费点、中文文案及五键台账同步。默认/静墨下 visible 恢复原 outline、hidden 为 none；暖纸与封面既有 outline:none 分支保持。默认 visible 最终实测颜色为模板的 rgb(42,47,56)。 |
| 4. 暖纸桌面铺满 | 完成 | 先确认实际 page 阅读态没有 canvas-runtime-lock，28px content padding 仍在。仅在 NoteDetail 的 page host 抵消该 inset，至少铺满 100vh，并用无模糊实色 spread 覆盖高倍缩放横向溢出后的桌面背景；由既有 main scrollport 裁切。三档阅读模式 × 16 个缩放步 × 顶/底共 96 次测量，另原生滚到高倍最右下角截图，内容视口未露黑。 |
| 5. Settings 居中 | 完成 | `.page` 只补 `margin-inline:auto`，无版面重排。浏览器页面宽 600px、左右 margin 均 492px。 |
| 6. Provider 收折叠 | 完成 | 原生 details 默认关闭，summary 为「AI Provider 凭据(N 已配置)」，按有效 has_key 计数；展开后原六行可用。表单逻辑和路由不变；未填写或提交真实凭据。 |

### 三门接线申报

- **渲染门**：`NoteWritingSurfaceLayer.tsx:3625` 为 `interactive={layoutMode && !contentReadOnly && Boolean(onPageFrameWallPointerDown)}`。非 Layout 时 DOM 明示 `data-page-frame-wall-interactive='false'`，现有 pointer-events:none 生效。
- **hook 门**：`useNoteCanvasRuntimeController.ts:194` 的 enabled 为 `layoutMode && surfaceMode === 'page' && !loading && !sourceProjectionPolicy.contentReadOnly`；`usePageFrameWalls` 在 enabled 关闭时撤销拖动状态。
- **history 门**：runtime `:202` 仍通过 `wallBoundaryRef.current()` 延迟取 boundary，`:306` 为 `() => layoutMode && textHistory.boundary()`；非 Layout 不开墙 history boundary。runtime controller 定向测试覆盖开/关两态。
- `PageFrameWallLayer.module.css` 的 hover 亮线及 hover 隐藏 idle 选择器均要求 interactive=true；`--sk-wall-idle` 及闲置绘制没有改动。既有 paperInkEnabled 中 `!layoutMode` 保留，墙与墨水互斥。

### 台账与现物差异申报

- 五键全等断言全部同步：`SkinEditor.test.tsx`、`skinPresets.test.ts`、`server/src/__tests__/v13PaperSkin.test.ts`。新增 `SkinControls.test.tsx` 与 `skinComponentStyles.test.ts`，验证中文第五开关、Settings 精简参数及 visible/hidden token；四个 preset 均断言 headerRule=visible。
- 工单列出的 overlay 链路之外，现物还要求同步 `interactionController.ts` 的 `RuntimeInteractionState.panel` 联合类型。首轮 typecheck 揭示此处遗漏，现已补 appearance；没有从 runtimeController 直接 import 下层 controller，也没有把面板塞进 runtime host。
- 现物 SkinControls 的 advanced=false 原本仍显示部件选择，因此增加默认保持原行为的 `showComponents` / `presetLabel` 参数，Settings 使用 `advanced={false} surface="all" showComponents={false} presetLabel="默认外观"` 达成一行。保留其它调用方部件编辑。
- headerRule 的 visible token 用 CSS `initial`，让消费点的 `var(--sk-header-rule, 原 outline)` 在纸面上解析既有 fallback。初版把含 var() 的完整 outline 放祖先，浏览器发现模板颜色过早回退，已修正并重验。hidden 仍直接为 none。
- 暖纸黑圈实际包含两部分：page 阅读态仍有 28px inset，以及高缩放横向最右下方超出 page 背景绘制宽度。最终仅改 `.page[data-note-host-mode='page']:not(.pageCanvas)`，保留原 `var(--sk-desk, transparent)`；AppLayout、全站 padding/main 背景、BoardNoteModal、缩放/测量算法未修改。曾试验的 min-width:fit-content 已撤销，不在交付中。

### 交付清单与 numstat

基准为**本次施工前的工作树快照，不是 HEAD**；未使用 Git。按 CRLF 归一后的 LCS 统计，产品源码/测试 **29 文件，+431/-52**。下表路径以仓库根为基准，`CE/` 代表 `client/src/pages/Notes/canvasEngine/`。工单 Result 另计，完整路径、逐文件前后 SHA-256 与最终工单增删行见 [numstat.json](../../audits/2026-09-12-b1e-builder/numstat.json)；改动文件原始字节保存在同目录 `source-baseline.json`，证据目录无构建产物。

| 文件 | + | - |
| --- | ---: | ---: |
| client/src/components/Skin/SkinControls.test.tsx（新增） | 29 | 0 |
| client/src/components/Skin/SkinControls.tsx | 7 | 6 |
| client/src/components/Skin/SkinEditor.test.tsx | 4 | 3 |
| client/src/pages/Notes/NoteDetail.module.css | 14 | 2 |
| CE/hooks/useFloatingOverlayController.ts | 3 | 1 |
| CE/hooks/useNoteCanvasLayerProps.ts | 2 | 0 |
| CE/hooks/useNoteCanvasRuntimeController.test.tsx | 45 | 1 |
| CE/hooks/useNoteCanvasRuntimeController.ts | 6 | 2 |
| CE/hooks/usePageFrameWalls.test.tsx | 37 | 4 |
| CE/hooks/usePageFrameWalls.ts | 3 | 0 |
| CE/hooks/useRuntimeSurfaceStateController.ts | 4 | 0 |
| CE/interactionController.ts | 1 | 1 |
| CE/layers/NoteAppearance.module.css（新增） | 27 | 0 |
| CE/layers/NoteChromeLayer.test.tsx | 94 | 1 |
| CE/layers/NoteChromeLayer.tsx | 52 | 5 |
| CE/layers/NoteWritingSurfaceLayer.tsx | 1 | 1 |
| CE/layers/PageFrameWallLayer.module.css | 3 | 3 |
| CE/layers/PageFrameWallLayer.test.tsx | 30 | 5 |
| client/src/pages/Settings/AppearanceSection.tsx | 12 | 8 |
| client/src/pages/Settings/ProvidersSection.test.tsx | 6 | 1 |
| client/src/pages/Settings/ProvidersSection.tsx | 3 | 1 |
| client/src/pages/Settings/Settings.module.css | 12 | 0 |
| client/src/styles/skinComponentStyles.test.ts（新增） | 12 | 0 |
| client/src/styles/skinComponentStyles.ts | 3 | 0 |
| client/src/styles/skinPresets.test.ts | 14 | 2 |
| client/src/styles/skinPresets.ts | 2 | 2 |
| server/src/__tests__/v13PaperSkin.test.ts | 3 | 3 |
| server/src/validators/skin.ts | 1 | 0 |
| shared/types/skin.ts | 1 | 0 |

另交付本工单 Result 与 `docs/audits/2026-09-12-b1e-builder/` 的日志、JSON 测量、截图、基准和说明。隔离冒烟脚本/库保留在 `.tmp/b1e/` 供复核，不是产品交付；本次 3109/5279 服务已停止，端口已确认关闭。

### 验证数字与未做项

- client/server/shared typecheck + build 均 PASS；最终 client 日志 `desk-build-final.log`，只有既有 bundle-size 提示。
- client 全库 **144/144 文件、1538/1538 tests PASS**。定向：外观与 ViewOptions **23**、墙三文件 **26**、SkinControls/SkinEditor/skinPresets/skinComponentStyles **27**，均 PASS；定向 client 数字已包含于全库，不重复累加。服务端 `v13PaperSkin` **6/6 PASS**；manifest 补充 **10/10 PASS**。
- 最终 canvasRuntimeBoundaryCheck **168 checks PASS**；group gallery **8**、canvas model **60 组**、performance **5 场景（合计 14.25ms）** 均 PASS；single-editor、groups-rail、legacy-shutdown、relation-freshness、source-experience 静态/模型门均 PASS。manifest/parity 生产静态门 **14 entries / 14 public**，server/shared import **230 文件 / 0 违规**，docs inventory/glossary PASS。
- 真 Chrome + 独立端口、独立 SQLite、合成用户完成六项功能冒烟，最终浏览器 console error 为 0。仅合成库将 coordinate_contract 设为 v2 以验墙；真实 5173/3001 应用、真实库/Provider 未操作。暖纸三档 96 次测量及最终高倍右下截图已归档。
- **未运行聚合 `npm run verify:v2-bn8-runtime`**：其包含 Git 与 secrets 扫描，与本单明示禁区冲突；允许的构成项已拆开执行。registry/parity 测试套件包含安全语义断言，未执行；不宣称聚合全绿。
- **额外 docs-check 存在既有失败**：`docs/agent-ops/INDEX.md` 陈旧，发现时尚未修改任何文档，详见 `docs-check.log`；没有越单重建索引。后续独立 inventory/glossary 通过。
- 未新增打印/Board 弹窗浏览器专项，打印隔离仅做源码检查；没有安全类测试、真实 Provider 请求、真实库迁移、commit/push/PR 或主观验收放行。所有已知初轮失败、修复与验证范围见证据 README。
