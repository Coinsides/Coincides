> **From**: fable
> **To**: codex
> **Status**: done(2026-09-12 状态头补翻:交付与 Result 早已在案,头未跟上;派发期原头:ready;两层制;13.1 单 3=3a 打印通道 v1 + 3b 保真判据;段内最后一单)
> **日期 (Date)**: 2026-09-07
> **性质**: 施工单(client,中单;冻结裁定 4 的降级梯在案)

# 13.1 · 单 3 · 打印通道 v1 + K-比例保真

## 〇 · 上游(先读,顺序)

1. 段 plan 冻结裁定 4(单 3 两步制与降级梯):`plans/v13-1-paper-viewport-plan.md`;
2. K-0 报告 §三(现物无最终 PDF 输出链;print profile 已进几何;Preview 是统计层不是导出器);
3. 单 1/单 2 已交付现物:physicalScale(print profile 全精度)、page 档位通道、`client/scripts/pageReadingSmoke/` 冒烟 fixture(可复用扩展)。

## 一 · 口径(冻结)

**3a · 打印通道 v1(浏览器打印即导出,⛔ 造 PDF 引擎⛔ 新依赖):**

1. `@media print` 样式路径,page 模式下生效:隐藏 app chrome/控件/托盘类 UI,只呈现页栈;每个 page frame=一张打印页,frame 间强制分页(`break-after: page`);
2. **纸族页物理严格**:`@page` size 按 pageSize(A4 portrait / Letter portrait),margin 0;frame 内容按 **physicalScale 全精度**缩放落到物理尺寸——屏幕档位(gear/stepFactor)⛔ 影响打印,打印永远物理;
3. **网页族页 v1 实用主义**:`@page` A4 portrait,内容 fit A4 可用宽(缩放比现算);此判走查①可改;
4. 打印路径⛔ 改动屏显 DOM 结构语义(print CSS + 必要的打印专用包装类为限);⛔ 触碰导出 Preview 统计层语义。

**3b · K-比例保真判据(降级梯,按序尝试,申报停在哪级):**

1. **首选**:若 client 已有可用的 headless 打印通道(如 playwright/puppeteer 依赖已在)——用 Chrome print-to-PDF 出一号样本(冒烟 fixture 笔记),对 100% 物理档屏显做布局盒对齐断言(容差=抗锯齿);**⛔ 为此新装依赖**;
2. **无 headless 时(预期路径)**:机械判据=打印样式计算值断言(单测):frame 打印宽高=物理 mm 换算值 ±0.5px、分页规则、chrome 隐藏、gear 不泄漏进 print;外加冒烟 fixture 扩展一个"打印预览检查页"(列出应见/不应见清单),供走查①人眼对照;
3. 真实一号证物笔记(Henry 库内)⛔ builder 触碰——走查①时 Henry 亲眼验,本单只备 fixture 样本+检查单。

## 二 · 验证(段纪律)

1. client typecheck/build;
2. 单测:print 样式计算(纸族物理尺寸/网页族 fit 宽/分页/gear 不泄漏);
3. 一条功能冒烟:fixture 打开打印预览路径,纸族 frame 物理尺寸与 physicalScale 相符(以计算样式采样为证)。

## 三 · 回执与边界

完工 apply_patch 追加 `## Result`(numstat+验证输出摘要+3b 停在降级梯哪一级+未做清单);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印任何 key;⛔ 动 server;⛔ 查询用户数据。现物冲突(如 print CSS 与现有导出 Preview 样式打架)⇒ 停线举证。

## 停线

2026-09-07 · Codex builder。**施工未完成，status 保持 ready；产品代码零修改，不追加完工 Result。** 已按 §〇 顺序核对段 plan 冻结裁定 4、K-0 §三与单 1/单 2 现物。停线依据为本单 §三及段 plan 裁定 4 的「3a 试做遇深坑即停线」：现役 page DOM 并非逐 frame 的页栈投影，仅补 print CSS 与包装不能完整兑现 §一.3a.1，而增建内容投影超出 §一.3a.4 的限制。以下含独立只读复核与内存合成样本实跑，不以单帧文本可打印冒充完整交付。

### 现物与冲突

下文 `E/` = `client/src/pages/Notes/canvasEngine/`，行号均为本次未修改的工作树源码。

| 现物 | 证据 | 对施工的影响 |
|---|---|---|
| page 仅有一个主帧纸盒，文本块共用一个 blockList | `E/layers/NoteWritingSurfaceLayer.tsx:3298–3314,3732–3750`；逐 frame 边界 map 仅在 `:3363` 的 canvas 条件内 | 缺少逐 frame 的分页容器。普通单归属文本可考虑补包装，**单凭这一项尚不足以断言不能做**。 |
| 跨帧裁片已有模型，没有逐片内容 DOM | `E/pageStackBlockFragmentService.ts:64–85` 计算每帧 visibleRect；`E/layers/NoteWritingSurfaceLayer.tsx:875–882,3750` 把同一块的多个 fragment 一起传入；`E/layers/BlockEditorLayer.tsx:183–192,333–344,376–382` 只渲染一个 article 与续页 badge | 一个 article 不能仅靠新增外层包装同时成为不同打印页中各自裁剪、重定位的内容。需新挂载/复制内容裁片或建立打印专用投影；把一个长盒交给浏览器自然分页，不能保证按已有 frame 边界、间距与坐标分页。 |
| page 未挂载部分对象内容层 | `E/layers/NoteWritingSurfaceLayer.tsx:3569,3593,3625,3679` 的 Connector / Image / Table / Shape 均限 canvas | CSS 无法显示未挂载的页内对象；补齐需要内容渲染接线，不能描述成单纯隐藏 app chrome。 |
| 当前纸盒还会随内容增长 | `E/hooks/usePageReadingPresentation.ts:22` 取 max(frame.height, pageContentHeight + inset.top) | 不能直接把这个长盒整体乘 physicalScale，便宣称每 frame 已对应一张固定物理页。 |

**范围纠正**：非主帧普通文本不一定被过滤。`E/modePolicyService.ts:116–127` 允许与其他 frame 关联的普通块进入 visibleBlocks；问题是它们共用当前纸盒，而不是「次帧内容全部未挂 DOM」。未发现已有 print CSS 与 Preview 样式打架；本次停线理由是上述实际投影缺口，不是照抄工单举例。

**不构成停线的项**：单 2 physicalScale 全精度可用。默认 A4 904×1278 映射为 793.700787×1122.068149px，相对 210×297mm 的高差 −0.451536px；Letter 904×1170 映射为 816×1056.106195px，高差 +0.106195px，均在 ±0.5px 内。未以 preset 舍入为由重开已裁精度规则。

### 合成样本实跑

在现有 `NoteRuntimeDocumentLayer.test.tsx` 的**内存转换结果**后追加一个临时探针，用既有 Vitest/jsdom 与真实 `derivePageStackBlockFragments`、`NoteRuntimeDocumentLayer` 渲染；未修改该测试文件或产品源码。样本为两张默认 A4，第二帧 y=1358（1278+80），一个 x=0/y=1100/w=760/h=420 的合成块，world offset X=72。两个 frame 的 fragment 由生产函数推导，不手填 fragment 数量。继承原测试的 floating panel mock，ResizeObserver 为局部 stub；不加载账号或数据库。

实跑输出：

```text
S3_STOP_LINE_EVIDENCE {"frames":2,"fragments":2,"paperContainers":1,"articles":1,"continuationMarkers":1,"secondaryFrameNodes":0}
Test Files  1 passed (1)
Tests       1 passed | 3 skipped (4)
Duration    1.71s
exit        0
```

三个既有用例由 `testNamePattern: 'S3 stop-line specimen'` 排除，**不申报它们通过**。该探针证明真实组件对两个裁片仍只挂一个纸盒/一个 article；这是停线取证，**不是 print 计算样式测试、浏览器打印冒烟或打印保真 PASS**。

复跑方法：在 client 目录用 `node --input-type=module` 从 stdin 执行 `startVitest('test', ['src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx'], {run:true,testNamePattern:'S3 stop-line specimen'}, {envFile:false,plugins:[probePlugin]})`；`probePlugin` 为 `enforce:'pre'` 的 transform，仅对上述文件追加测试。测试复用其 `writingSurfaceProps`/`codeBlock`/`runtimeModel`，把 `pageFrames`、`primaryPageFrame`、`pageStacks` 和生产函数生成的 `blockFragmentProjections` 传入真实 document layer。断言选择器依次为 `[data-page-display-scale]`、`article[data-note-block-shell]`、`[data-cross-page-continuation-marker]`、`[data-page-frame-id="specimen-frame-1"]`，数量为 1/1/1/0。此记录给出输入、生产入口与全部判据；未新增常驻测试或基建。

### 3b 降级梯申报

已检查第一级前提：client/package.json 未声明 playwright/puppeteer；client/node_modules 与 root node_modules 均无 playwright、playwright-core、puppeteer、puppeteer-core 的 package.json；client/scripts 未发现对应 headless 打印入口。结论只限 **client 已有通道未发现**，不代表系统没有 Chrome/CDP。

**停点：3a 结构冲突；3b 第一级前提不成立，第二级尚未实施，不能申报降级验收通过。** 不能因为无 headless 就越过 3a 缺口，把屏显样本换个标签当作打印计算样式证据。工单预期的第二级仍可作为 HQ 补裁后续工的验证路径。

### 待 HQ 补裁与交付边界

需冻结是否允许**仅打印时使用的独立页栈投影**：复用内容渲染与有效 typography，按现有 frame/fragment 做裁片、重定位并补齐页内对象，屏显 DOM 与 Preview 统计语义保持现状。该方案仍可使用浏览器打印、无需 PDF 引擎或新依赖，但范围超过当前「print CSS + 必要包装类」。若收窄为仅主帧文本单页，须显式改判 §一.3a.1；builder 未自行选择或实施任一分支。

- 仅本工单追加停线证据，`git diff --numstat` 为 **53 additions / 0 deletions**，限定该文件的 `git diff --check` 通过；产品代码与常驻测试为 **0 / 0**。无 agent 指令/权限配置变更，status 未前翻。
- 未执行 §二 client typecheck/build、print 单测、打印预览功能冒烟；未生成 PDF、未做人眼/真实笔记验收；未跑完整 runtime 验证门、安全类测试或马拉松。上述一条探针不替代任何完工验证。
- 未使用或扩展一帧的 pageReadingSmoke fixture 冒充多帧打印样本；未实施 3a/3b，未改 Preview 或物理映射。
- 未新装依赖、未读 .env、未打印 key、未动 server、未查询用户数据；探针显式 envFile:false。CodeGraph CLI 与 rg 不可用，按定向 PowerShell 读取回退，未索引或安装工具。
- 未 commit/push/PR/merge；开工已有 server/src/routes/projections.ts 修改及三份未跟踪材料保持原状。停线证据随工作树交 HQ。

## 补遗一(2026-09-07,发单方 Fable,针对 ## 停线;停线成立,四项现物举证有效)

1. **批准打印专用纸叠投影**(builder 提案分支):新建 print-only 挂载的逐帧分页投影——复用现有块渲染与单 2 有效 typography,按 `pageStackBlockFragmentService` 的逐帧 visibleRect 做**裁片重定位**(fragments 模型正是为此而生);屏显 DOM 结构与 Preview 统计语义**零变化**(投影仅在打印路径挂载);仍走浏览器打印,⛔ PDF 引擎⛔ 新依赖。§一.3a.4 的"print CSS+必要包装类"限制**由本条显式放宽至打印投影**;
2. **canvas 对象层⛔ 不入打印投影**:停线证据里 Connector/Image/Table/Shape 属 canvas_objects 内容层——那是野地财产、13.2 退役对象,纸的打印 v1 只管纸上块内容(文本/媒体块经现有块渲染);块可见性沿用 page 现行规则(modePolicyService),⛔ 新造可见性判定;
3. **每帧=固定物理页**:打印投影按 frame 冻结几何取**固定物理高**(A4/Letter 映射值),溢出内容凭 fragment 裁片归属各帧;屏显那个随内容增长的纸盒(usePageReadingPresentation:22)⛔ 进打印;
4. **3b 直接走第二级**(第一级前提已证不成立):机械判据=打印投影计算样式断言(逐帧物理宽高 ±0.5px/打印页数=帧数/gear 与 stepFactor 不泄漏进 print)+ fixture 打印预览检查页供走查①人眼;
5. **规模改判**:本单由中单升格中大单,允许多轮内部推进;实施中再遇结构级缺口照停线条款;
6. 其余口径不变(网页族 fit A4 宽、§二、§三)。按本补遗续作至完工 Result。

> 战役级备注(HQ 自记,非 builder 义务):本停线揭示屏显 page 模式的"真纸叠 DOM 化"尚未发生——本单的打印投影即其原型,屏显侧迁移候 13.x 排期,走查①一并向 Henry 报。

## Result

2026-09-07 · Codex builder · **补遗一续作后的再次停线回执，不是完工 Result；status 保持 ready，未前翻 done。** 已完整重读原单、第一次停线与补遗一，按获批范围试做 print-only 纸叠投影。§二类型检查、构建、定向单测已实跑；真实浏览器打印媒体冒烟暴露内容坐标归属失败。按补遗一第 5 条及 §三停止扩建，以下草稿随工作树交 HQ，**不可据单测绿灯放行**。

### 已实施的草稿与边界

- 新建 `E/pagePrintProjectionService.ts`、`E/layers/NotePrintLayer.tsx` 与 `.css`（`E/` 仍指 `client/src/pages/Notes/canvasEngine/`）：由 `beforeprint` / print media 挂载只读 portal，`afterprint` / 返回 screen 卸载；固定 A4/Letter 物理页、全精度 paper scale、网页族 fit A4 宽；复用 `BlockEditorLayer` 与有效 document typography，按 runtime fragments 的 visibleRect 裁剪并重定位。仅消费现有 page `visibleBlocks`，不增加 export-role 或对象可见性判断，不挂载 canvas 对象层。**当前 fragment 输入存在下述结构缺口，内容归页仍错误。**
- `NoteRuntimeDocumentLayer.tsx` 只增加 import 与独立打印层调用；常态打印层返回 null。打印期间隐藏屏显采用 `position:fixed + visibility:hidden`，保持原编辑器可测量，避免 `display:none` 使 ResizeObserver 将屏显高度写成零。六次浏览器采样中原节点身份、布局、frame 与 textarea 尺寸均保持；未改屏显 DOM 结构、Preview、原 physicalScale 算法或共享 hydration 实现。
- 扩展现有内存 mock，新增 `print.html` / `printFixture.tsx` / `printSpecimen.ts`：两帧 A4、Letter、web 合成笔记，分别有首帧页标、次帧页标、跨帧 code；显示应见/不应见检查单及实际 print media 的 computed-style 收据。沿用无后端 fixture，任何未被 mock 的 `/api` 请求本地失败，非白名单写请求报错；既有白名单 POST `/source-anchors/generate` 只返回内存空响应。
- 新增 12 项打印单测；既有 document-layer 测试只收紧 recovery 状态定位（此前单 1 的阅读比例 `<output>` 也有 status 角色，旧 `getByRole('status')` 本身已不唯一；移除打印接线的内存基线探针同样失败）。现有 3 项复跑通过。

### 新结构级缺口：运行时无法区分局部 y 与已保留的世界 y

| 现物 | 源码证据 | 后果 |
|---|---|---|
| page runtime placement 没有完整 frame-local → world 转换 | `E/viewportService.ts:30–31` 的 pageOffsetX=0；`E/placementService.ts:483–484` 仅对 local x 加该 offset，y 原样；`E/engineModel.ts:367–373` 用这些 placement 派生 fragments | 合法局部坐标被当成 world 裁片坐标：A4/Letter 次帧页标落入第一页，首行左侧少 72px 被裁掉。 |
| 已有完整转换 helper，但不能直接对所有 hydrated local 再调用 | `E/placementService.ts:496–522` 的 `projectPageFrameLocalLayoutToCanvasLayout` 加 frame content-left 及 frame.y+inset.top；`E/hooks/useRuntimeNaturalWritingController.ts:47–75` 可解析 frame 并避免显式 world 重复投影 | helper 本身可复用；问题不在缺少加法或 frame 查找。 |
| hydration 将 world 标成 local，却只减 x、不减 y | `E/placementService.ts:254–267`；原 local 路径 `:270–298` 也保留 y | 两种来源落入相同 `coordinate_space/frame_id` 表达，不能再无歧义恢复正确 world y。 |
| 打印入口拿不到转换前的来源 | `E/canvasObjectRepository.ts:41–48` 用 reconciled layout 覆盖 block；`E/hooks/useNoteCanvasDataAdapter.ts:591–601` 只保留 hydrated blocks 等状态，未保留 raw blockLayouts | 仅在打印投影加转换，会修好原 local 样本，却把正常写入后重载的次页内容再次下移。不能用 y 大小猜来源。 |

独立只读合成探针使用真实 project / hydrate helper，次帧 y=1358、inset.top=0、content-left=72，结果为：

```text
local          x=0,  y=314,  page_frame_local
project        x=72, y=1672, canvas_world
hydrate        x=0,  y=1672, page_frame_local
project again  x=72, y=3030, canvas_world
Tests          1 passed | 12 skipped (13), exit 0
```

探针仅在内存向既有测试注入，`envFile:false`，未改产品/常驻测试；仓库根复跑 `node .codex-tmp/print-smoke/coordinateProbe.mjs`。该 PASS 表示**复现歧义成立**，不是打印功能通过。网页样本还暴露既有屏显碰撞把次帧 local 页标 y=420 推到 821；其变化发生在打印前，不是投影副作用。未通过伪改 fixture 为 world、挪页标、加行数或放宽归页断言掩盖问题。

需要 HQ 裁定并补单：统一/修复客户端 hydration 的坐标契约，或明确保留并传递可权威解释的原始坐标来源，再为打印提供正确的 world fragments。前者会触及本单冻结的共享屏显运行时行为，后者新增数据流且须覆盖重载及未保存编辑；当前批准的“按现有 fragments 裁片”不足以裁定二者。builder 未实施任何分支，也未改 server。

### §二实跑与 3b 第二级结果

| 验证 | 实跑结果与限度 |
|---|---|
| client typecheck | client 目录 `node node_modules/typescript/bin/tsc -b`，exit 0。 |
| client build | client 目录通过 Node 调用 `vite.build({envFile:false})`，exit 0，2190 modules，7.13s。保留 Vite 的 taskStore 静态/动态混合导入及 >500kB chunk 提示。 |
| 定向测试 | `startVitest('test', ['src/pages/Notes/canvasEngine/layers/NotePrintLayer.test.tsx', 'src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx'], {run:true}, {envFile:false})` 后关闭 ctx；2 files / 15 tests passed，2.06s，exit 0。fixture 另作 TypeScript program 检查，0 diagnostics。 |
| 真实浏览器机械冒烟 | 系统已安装的 Chrome + Node 原生 CDP，隔离临时 profile，仅访问合成 fixture；`Emulation.setEmulatedMedia('print')` 实际触发打印媒体与投影。保存 6 次收据，**6 次整体 FAIL，runner exit 1**。未生成 PDF。 |
| 尺寸与样式 | A4/web 每页实测 793.688×1122.52px，Letter 816×1056px，均在 ±0.5px 内；paper scale 分别 0.8779875966831581 / 0.9026548672566371，web 0.7086614173228347。每次 2 个固定 print page DOM、break/clipping 规则、隐藏 chrome、排除 workspace/backing block、零非白名单写请求、原屏显节点/几何保持均通过；白名单 POST 仅为上述内存空响应，无后台写入。 |
| 内容与档位 | A4/Letter 次帧页标归属 FAIL；web 跨帧块仅 1 个 fragment，FAIL。A4 与 web 确实覆盖 fit_width/step=1 和 physical/step=1.1，打印尺寸/scale 不变。**Letter 第二次收据实际仍是 fit_width/1，不计作 physical 档覆盖。** 停线后仅为诊断脚本补上 actual gear/step 等待和断言，语法检查通过，未重跑该修订版。 |
| 原生预览路径 | 合成 fixture 点击真实 `window.print()` 已触发 beforeprint；原生打印模态阻塞当前 UI 自动化，未取得可验证的原生预览内容或完整关闭收据。随后关闭本次创建的 fixture tab。**不申报原生预览/人工验收成功。** 后续机械证据来自上述 Chrome print-media emulation。 |

**覆盖限制**：12 项新增单测通过 `placement()` 手填正确 world placements，再用真实 engine 派生 fragments；未经过持久化 hydration。它们证明打印生命周期、固定容器/样式规则及**world 输入正确时**的裁片重定位，不证明实际 local 输入的内容归属或首字符完整性。visibleBlocks 测试仅证明尊重传入集合；页数是打印 DOM 容器数，非 PDF 页数。CSSOM 与浏览器媒体样式证据不冒充物理输出或人眼验收。**3b 依补遗直接走第二级，但第二级与 3a 均未验收通过。**

浏览器证据在 `.codex-tmp/print-smoke/receipts.json`、`A4-fit_width-print.png` 等六张 print-media 截图及三张屏显截图（忽略的工作区取证文件，非产品资产）。截图还可见 code 块深色背景残留；视觉检查尚未收尾。复跑先在 client 目录启动 `node scripts/pageReadingSmoke/start.mjs`，检查页为 `http://127.0.0.1:5181/scripts/pageReadingSmoke/print.html?paper=A4`；另开进程运行 `node scripts/pageReadingSmoke/verifyPrint.mjs`。本 Windows 受限环境的隔离 Chrome renderer 只有显式 `--isolated-chrome-no-sandbox` 才能工作；该开关只作用于新建临时合成样本 profile，不修改用户浏览器配置，脚本默认不关闭 sandbox。本次临时 profile 已清理，fixture Vite 已停止；原有 `start.mjs` 未修改。

### 变更量、未做与交付

客户端源码/fixture/测试合计 **1150 additions / 5 deletions**：已跟踪 3 文件 `git diff --numstat` 为 11/5；8 个新文件按完整新增行计为 1139/0（普通 git diff 不计 untracked，未用 git add）。其中新文件行数依次为：`print.html` 12、`printFixture.tsx` 234、`printSpecimen.ts` 92、`verifyPrint.mjs` 149、`NotePrintLayer.css` 80、`NotePrintLayer.test.tsx` 372、`NotePrintLayer.tsx` 156、`pagePrintProjectionService.ts` 44。本工单本次追加 **58/0**，本单总计 **1208/5**；限定本单已跟踪文件的 `git diff --check` 与 8 个新文件的空白/末尾换行检查均通过。开工既有 server 修改和三份未跟踪材料不计入本单。

- 未完成：坐标契约缺口、正确内容归页/首字符完整性、web 跨帧完整性、Letter physical 档浏览器覆盖、原生预览可验证全流程、剩余视觉检查。未产出 PDF、未触碰 Henry 真实笔记、未做人眼主观验收；完整 runtime、安全类与马拉松验证未跑，遵守段 plan 的定向验证口径。
- 停线后仅整理诊断脚本与本回执，未修共享 placement/hydration、未新增坐标启发式、未扩建产品。工作树保留连入 document layer 的**未完成草稿**，HQ 续作前须看此停线结论。
- 未 commit/push/PR/merge、未装依赖、未读 .env、未打印 key、未动 server、未查询用户数据、未修改 agent 指令或权限配置。CodeGraph CLI 与 rg 不可用，按定向 PowerShell 读取回退，未索引或安装工具。
