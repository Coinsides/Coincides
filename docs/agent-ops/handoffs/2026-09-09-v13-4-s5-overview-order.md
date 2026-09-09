> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次四单 5;现物证据=单 0 侦察 §五(页/裁片/只读打印渲染均有;⛔靠 fit-page 无限缩;旧选页处理有写副作用);停车场 H 区(一行 3~4 页,有限小,方便选择不方便阅读)
> **单号**: 13.4 单 5 · 铺陈统揽视图

# 13.4 单 5 · 铺陈统揽视图

**使命**:多页笔记的 Word 式并列全览——方便选页,不方便阅读;**有限小**,⛔ 无限缩小硬塞。

## 零 · HQ 已裁(⛔ 复议)

1. **入口=独立 overview 开关**(三档旁的独立按钮,⛔ 塞进既有三档 enum);开关状态按 noteId 局部,⛔ 持久化;
2. **网格参数**:CSS grid,宽屏 4 列/中屏 3 列/窄屏 2 列;缩略最小宽 **160px** 下限(常量可调),超容量**翻页**(上一屏/下一屏),⛔ 为塞完全部页无限缩;
3. **渲染=复用只读裁片内核**:提炼 NotePrintLayer 的 PrintPages 思路为共享只读页内容组件(frame+fragments+BlockEditorLayer 只读),⛔ 直接显示打印根(其生命周期是 print 事件专用);**保真边界如实申报**(fragments 为主,annotations 空、generic objects 覆盖按现物,Result 写明);
4. **点击语义=选页返回阅读**:点某页缩略→关 overview→正常阅读视图滚动定位到该页;**⛔ 沿用旧选页处理**(`useRuntimePresentationController:207` 的 onSavePageFrameCollection 写副作用)——纯展示导航,拆用局部滚动/聚焦动作;
5. **零写不变量**:overview 打开/翻页/关闭全程⛔ 写 placement/排版/TextFlow/frame(测试断言零写);打印链不动;
6. ⛔ 缩略图内编辑器;⛔ 无限画布;准备区/跨页裁片排除沿 engineModel 既有;⛔ 新 event verb。

## 一 · 交付面

- 共享只读页渲染组件(从打印层提炼,双消费者:打印照旧+overview);
- overview 层(grid+翻页+点击定位)+开关按钮;
- 与弹窗兼容:open-note 弹窗内也可用 overview(同一运行时,免费则做,贵则 Result 记未做⛔硬啃)。

## 二 · 裁量与停线

- 停线举证不改判;打印层提炼若牵动打印快照生命周期→停线;
- 长页(fit_width 降级那类)在 overview 里按比例截显+"long page"标识即可,⛔ 特殊引擎。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(canvasEngine+打印面)不破;
- 冒烟五条:①1 页/4 页/9 页笔记开 overview,列数按宽自适应,缩略不低于下限,9 页触发翻页;②点击第 N 页→回阅读视图定位到该页;③overview 全程零写断言(placement/排版/frame 无任何 PUT);④打印(NotePrintLayer)回归不破;⑤窄屏降列不缩过下限。

## 四 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 保真边界申报 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

2026-09-09 · Codex builder。施工完成，工作树交 HQ 代账；本回执不是 HQ 放行。§零六条裁决未改，验证总门的冲突见末段。

### 实现与 numstat

- 独立 Overview 按钮位于原三档旁；状态按 noteId / 当前运行实例隔离，切笔记或离开 page 模式复位，无持久化、无 enum 扩张。
- CSS grid 按实际容器宽 4 / 3 / 2 列，每屏最多两行（8 / 6 / 4 页），缩略宽 160–220px；小于双列容纳宽度时仅网格局部横滚。长页以原比例截显顶部，标识 Long page，不缩小硬塞。
- 从 PrintPages 提炼 `NoteReadOnlyPageContent`，打印和统揽双消费。`NotePrintLayer` 的 beforeprint / afterprint / matchMedia / 快照 / portal 生命周期保持原样。
- 选页关闭统揽，以布局恢复后的 DOM scale 局部滚动到目标 frame；不调用旧 `onSelectPageFrame` / `onSavePageFrameCollection`。只关闭则恢复之前的阅读滚动位置。空白尾页计入纯展示纸高，不改 frame / placement。
- 原阅读 DOM 保持挂载和排版宽度；统揽暂停阅读测量与 blur-save，保留未存草稿。返回时恢复原 caret（preventScroll），普通后续 blur 仍按原流程保存。排除了全局 `transition: all` 对可见性的延迟，修复真实浏览器焦点恢复。
- 普通返回 Project / 弹窗离开流程先恢复暂停的编辑器，再由离开动作 blur 并等待已有保存；这是离开笔记的保存边界，不是统揽开关、选页或翻页写入。弹窗补实际滚动容器标记，复用同一 overview。

以下为产品/测试文件相对开工基线的 numstat；新文件按全量新增计，合计 **20 文件，+1273 / -110**。不含本 Result / 状态头，也不含开工已有未跟踪文件。

```text
11   6   client/scripts/pageReadingSmoke/mockApi.ts
2    1   client/scripts/pageReadingSmoke/start.mjs
12   0   client/scripts/pageReadingSmoke/overview.html
120  0   client/scripts/pageReadingSmoke/overviewFixture.tsx
73   0   client/scripts/pageReadingSmoke/overviewSpecimen.ts
224  0   client/scripts/pageReadingSmoke/verifyOverview.mjs
4    0   client/scripts/pageReadingSmoke/tsconfig.overview.json
3    0   client/src/pages/Boards/BoardNoteModal.test.tsx
1    1   client/src/pages/Boards/BoardNoteModal.tsx
23   0   client/src/pages/Notes/NoteDetail.module.css
33   5   client/src/pages/Notes/canvasEngine/NoteCanvasRuntime.tsx
101  0   client/src/pages/Notes/canvasEngine/hooks/useNoteOverviewController.ts
6    2   client/src/pages/Notes/canvasEngine/hooks/usePageReadingPresentation.ts
144  0   client/src/pages/Notes/canvasEngine/layers/NoteOverviewLayer.css
185  0   client/src/pages/Notes/canvasEngine/layers/NoteOverviewLayer.tsx
103  0   client/src/pages/Notes/canvasEngine/layers/NoteReadOnlyPageContent.tsx
12   81  client/src/pages/Notes/canvasEngine/layers/NotePrintLayer.tsx
175  4   client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx
23   6   client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.tsx
18   4   client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx
```

### 五条冒烟逐条

合成浏览器证据：`.codex-tmp/overview-smoke/run-QdNj8w/receipts.json` 及同目录截图；完整 `verifyOverview.mjs` **13 场景 PASS**，不是用例过滤。只使用内存笔记、独立 Chrome 临时 profile、无后端的 127.0.0.1:5181 夹具。已亲看最终宽/窄截图。

1. **1 / 4 / 9 页打开：PASS。** 1440px 视口中实际 4 列、缩略 220px；1 / 4 页一屏，9 页两屏（8 + 1）。900px 为 3 列、9 页两屏；640px 为 2 列、9 页三屏。上一屏/下一屏可遍历每个 frame，无遗漏。
2. **点第 N 页返回阅读并定位：PASS。** 真实鼠标点击第 4 / 9 页后正文处于阅读视口内；空白第 9 页亦能定位。overview 中从宽屏调到 640px 后选第 5 页通过；1 / 4 页 fit_page 路径通过。关闭统揽恢复打开前滚动位置。单测额外确认不走旧选页写回调，并验证 noteId / mode 隔离。
3. **全程零写：PASS。** 13 场景所有 PUT 尝试为 0，统揽交互窗口内所有非 GET 请求为 0；source rows、frame 和 block layout 前后逐项相同。包含跨页裁片、准备区排除及实际编辑正文后立即打开统揽；草稿保留、原 textarea 身份及焦点恢复。单测覆盖 text / TextFlow / 排版 / placement / frame 写回调零调用，随后普通 blur 恰保存一次，避免把正常保存也抑制掉。
4. **打印回归：PASS。** 既有 `verifyPrint.mjs` 整跑，A4 / Letter / web × fit_width / physical 共 6 场景全绿，跨页裁片、物理尺寸、页标签、屏幕几何和原 DOM 保留、零意外写入均通过；零 PDF 产出。证据 `.codex-tmp/print-revival/`、`.codex-tmp/v13-4-s5-print.log`；既有 NotePrintLayer 单测随前端整套通过。统揽交互时打印根始终未挂载。
5. **窄屏降列与下限：PASS。** 640px 实际 2 列；360px 实际 2 列、缩略精确 160px，网格局部横滚而不继续缩小；翻页及返回阅读通过。

补充验证：长页比例截显及标识、预览 inert / 不可聚焦 / 无可见可写控件、modal 运行上下文全部通过。真实弹窗滚动容器与四条既有离开路径由 `BoardNoteModal.test.tsx` 覆盖；未将合成 modal 上下文冒充真实用户板弹窗端到端验收。

### 其它验证

- `npm.cmd --prefix client run test:unit`：**81 文件 / 708 测试 PASS**，完整既有套件，无筛选；`.codex-tmp/v13-4-s5-unit-final.log`。
- `npm.cmd --prefix client run build`：**PASS**（含 tsc -b）；`npm.cmd run build`：**PASS**（server tsc / manifest 检查 / 复制）；日志 `.codex-tmp/v13-4-s5-build-final.log`、`v13-4-s5-server-build.log`。保留既有 bundle-size / manifest recursive-schema 提示，不当失败或新功能。
- 新浏览器夹具 `tsc.cmd --project client/scripts/pageReadingSmoke/tsconfig.overview.json --pretty false`：**PASS**。
- `smoke:canvas-engine-model-contract`：**60 组 PASS**；`smoke:canvas-engine-performance`：**5 场景 PASS**；`check:canvas-runtime-boundary`：**159 项 PASS**；`git diff --check`：**PASS**。
- Vite 构建/单测的 `COINCIDES_VALIDATION_ENV_DIR` 指向本次空目录 `.codex-tmp/v13-4-s5-empty-env`；浏览器夹具原有 `envFile:false` 保留并关闭 HMR，避免并行改动造成热更新假失败。Chrome 默认隔离启动曾发生 CDP 超时，沿既有打印脚本支持的 `--isolated-chrome-no-sandbox` 临时 profile 参数重跑；没有修改用户 Chrome 或产品配置。

### 保真边界申报

- 只读组件渲染 engineModel 已派生的 **block fragments**，使用 frame 局部双向裁切坐标、documentTypography 与当前 block / TextFlow / field 草稿。跨页 code block 在前两页各呈对应裁片已实测；准备区排除沿原规则。
- **annotations 仍为空；generic canvas objects、独立 shape / image / table / connector、页槽及特殊页背景未新增覆盖。** 不宣称全对象或所有任意布局保真；跨多个 stack 被既有 fragment 引擎排除的布局未另造投影引擎。
- BlockEditorLayer 的现有文本只读分支仍包含 **readonly textarea**，隐藏 gutter 中仍可能有 select DOM；它们不是可操作的缩略编辑器。预览整体 inert、aria-hidden、pointer-events:none，所有写/测量回调 no-op；真实浏览器验证可见可写控件为 0、焦点不能进入预览。选页按钮是预览的兄弟覆盖层。
- overview 采用当前主题，打印仍采用原打印配色；代码强制白底只作用于 print fragment，避免暗色统揽出现浅字白底。长页超出 1.6 宽高比的部分裁去，明确 Long page；不把截显宣称完整可读。

### 未做与停线事项

- **未 commit / push / PR / merge**，未动用户数据库，未读 `.env`，未进行 key 出境或凭据扫描；未设计/新增安全类测试。没有变更 agent 指令/权限配置、server 业务代码、DB schema 或 event verb。未改其它工单 / current-state，未处理开工已有未跟踪文件。
- 未做真实用户笔记、真实用户板弹窗的主观验收；没有启动/接触产品后端 3001。未扩展上述未覆盖对象，也未做任意外部路由/浏览器关闭的全局未保存编辑治理。
- **验证总门停线证据**：根 `package.json` 的 `verify:v2-bn8-runtime` 末尾直接调用 `npm run check:changed-file-secrets`；本单明确“凭据扫描留 HQ”。因此没有直接执行该总门，也没有改脚本、移除末项或伪报整门通过。上述获准独立整套测试/构建/冒烟照实执行，**总门及凭据扫描留 HQ 裁处与执行**。
- 没有触发打印快照生命周期改动停线，也没有剩余已复现的本单五条冒烟失败；开关 blur-save、空白末页、resize 导航和可见性焦点问题已修复并保留失败/成功证据。放行权留 HQ。
