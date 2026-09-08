> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.3 单 2=板 UI MVP,client 大单)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单(允许多轮内部推进,公共接线一人顺序整合)

# 13.3 · 单 2 · 板 UI MVP + 旧 Purpose 消费面对齐

## 〇 · 上游(先读,顺序)

1. 段 plan 单 2:`plans/v13-3-board-mvp-plan.md`;
2. 单 1 Result §2(HTTP 契约表,本单唯一后端接口来源)与 §4(client 受影响消费面清单,本单首块任务书):`handoffs/2026-09-08-v13-3-s1-data-layer-order.md`;
3. 图二 §一/§四(板与成员语义);单 0 报告 §二(UI 挂点侦察)。

## 一 · 口径(冻结)

**首块 · 旧 Purpose 消费面对齐**(单 1 §4 清单逐项核销):DTO nullable/sealed 三态保真;旧 writer 出口摘除(纸内 savePurposeFrames/成员增删角色排序、Gallery 的 upsertDefaultPurposeRoleForContentGroup 与 saveGalleryRecord 的 purposes 出口);410 面⛔ 吞成保存成功(出口摘除后自然无 410 可见);Relation 出生魂选择改库级魂来源(⛔ 连出生引用一起退役);删除后果文案两处对齐库级弱标签语义;⛔ 借机重做纸行为。

**板 UI MVP:**

1. 路由与入口:`#/boards`(列表)+`#/boards/:boardId`(板页);侧栏库级 "Boards" 入口(UTILITIES 或 PROJECTS 同层,K-0 §二 挂点侦察为准);
2. **开板立魂(排气式)**:新开板=一个输入框(那句人话)+可选"挂靠已有魂"选择器(列库级魂);魂被占→409 提示换魂或进那块板;⛔ 表单仪式⛔ 多步向导;
3. 板面:note/content_group 投影上板(缩影卡:标题+摘要行,真相不搬家)、拖拽摆放/缩放/z 序/pinned、成员间连线(board_edges)、**双击成员进纸**(/notes/:id);
4. 板视口:自由平移缩放(PATCH viewport 持久化);**⛔ 触碰纸的三档与纸内排版**(两把标尺各回各家=本段核心判据);
5. 画笔基础档:freehand 落 visuals API(points/path/style),板上绘制/删除;
6. ⛔ 面:删板 UI/改魂 UI/准备区搬迁(单 3)/item·text_range 成员/事件面扩展/纸行为。

## 二 · 验证(段纪律)

1. client typecheck/build;
2. 单测:board repository/types/hooks + 首块对齐回归(旧 writer 出口摘除后 Gallery/纸保存链零 410 报错);
3. 一条冒烟(fixture 或 jsdom):开板立魂→三篇笔记上板连线→重开不丢;板 viewport 缩放后开纸,纸内几何与三档零变化(判据申报采样值)。

## 三 · 回执与边界

apply_patch 追加 ## Result(numstat+验证+未做);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印 key;⛔ 用户库;⛔ server 施工(契约不够用=停线举证,⛔ 自行加端点);不动 3001/5173。现物冲突⇒停线举证。

## Result

> **From**: codex（builder）
> **日期**: 2026-09-08
> **交付状态**: 本单 client 施工与定向验证完成；工作树交 HQ 复核、翻牌，未 commit。保留本单 header，不代替 HQ 放行或 Henry 走查。
> **统计**: client 代码/测试 32 文件，**+2488 / -532**；另仅向本工单追加本 Result。

### 1. 首块逐项核销（单 1 Result §4）

以下 E = `client/src/pages/Notes/canvasEngine/`。首块完成并通过 typecheck / 定向回归后，才开始板页面施工。

| 消费面 | 核销结果 |
|---|---|
| DTO / 归一化 | E/runtimeDataTypes.ts、purposeService.ts：project_id/course_id 保留 NULL；仅字段缺失才使用别名回退。active/sealed/archived 三态保真；历史成员 order_index 原值读取，默认魂不再优先排序。删除四个成员/默认角色 draft writer helper，保留历史身份与只读映射。 |
| 旧 HTTP writer/read | E/purposeRepository.ts：删除 savePurposeFramesForNote / PUT 出口；新增 loadLibraryPurposes → GET /purposes。旧 by-note helper 可读空数组，不补默认魂；未接活 UI 的 compiled-scope helper 保持错误传播，410 不伪装成功。 |
| 纸内活 writer | E/hooks/useNoteCanvasDataAdapter.ts：删除 savePurposeFrames、专属保存世代与返回出口；读魂改库级 GET。E/panels/ContentGroupPanel.tsx：删除成员增删、role/fitness、排序、草稿 effect 与保存 prop/handler/UI；没有空函数、吞错或假成功替身。 |
| 显式装配透传 | E/hooks/useNoteCanvasRuntimeController.ts、useNoteCanvasLayerProps.ts、E/layers/NoteWritingSurfaceLayer.tsx 摘除保存回调。 |
| 自然收口的透传 | useRuntimeDocumentDataController 经 ...documentData；useRuntimePresentationController 经继承类型与 ...options；NoteRuntimeDocumentLayer 经 WritingSurface props 类型/spread。上述三个文件无需另改，已重新核对。 |
| 纸路由/导出壳 | NoteDetail.tsx、E/NoteCanvasRuntime.tsx、E/index.ts 无独立 writer，保留活装配与类型导出，无需修改；不按 canvas 目录名判断死亡。 |
| Gallery | groupGalleryData.ts 删除按 Project→notes 读魂、GalleryRecord.purposes 与 saveGalleryRecord 的 purposes 参数/保存支路。SingleContentGroupEditor 删除默认角色输入、事实行、upsert 与二次保存，只保存 group/folders。GroupGallery.tsx 本来只传三个参数，无独立魂消费，核销无需改。 |
| Relation 出生引用 | E/runtimeDataTypes.ts、relationRepository.ts、relationService.ts 的 origin_purpose_id / purpose_id 身份契约保留；Panel 出生选择来自库级魂，并亲点新 Relation 核验 origin_purpose_id。活读取仍按 item_id，未复活 Purpose 范围读取。 |
| 未接通辅助 | readingInterpretationService 的 projectContentGroupsForReading 与旧 compiled helper 保留只读身份；没有把旧名单缓存当新材料集接入 UI。 |
| 删除后果文案 | ProjectDeleteDialog、SourceDeleteDialog 改为库级魂/板与 Project 弱标签语义；明确旧 note FK 尚存：未挂板旧魂仍可能级联，已挂板旧魂会阻断硬删，现预览不能识别这些历史链接。没有声称 server 已解除该限制。 |
| 新板挂点 | App.tsx 加 /boards、/boards/:boardId；AppLayout 加库级 Boards 主导航与独立满高视口样式，侧栏保留；不改 DailyBrief、纸导航或纸三档。 |

最终限定生产 client/src 检索旧 savePurposeFrames / onSavePurposeFrames / 四个成员 writer 符号为零命中。常驻模型检查脚本对应旧 writer 断言改为历史只读、NULL、sealed 与顺序保真断言；未执行该脚本所在的广泛模型套件。

### 2. 板 MVP 交付

- **开板立魂**：一个 300 字上限的句子输入（与现物 purpose.title 上限一致）；同次 POST /boards 新立魂或可选挂靠库级已有魂，无多步向导。409 purpose_already_has_board 明示换魂/进入既有板；因响应不带板 ID，按冻结 GET /boards 重读并用 soul_id 找入口，不增加 server 契约。
- **投影**：库级只读聚合现有 /courses → /notes 与 /content-groups；不调用 metadata import，也不复制内容到板。note 与有宿主纸的 content_group 可上板，缩影读标题/摘要。无宿主 CG 不作为本 MVP 可选新成员；读回既有无宿主/失联引用时保留几何并诚实展示无法进纸，不伪造 note ID。
- **几何与连线**：指针拖拽、缩影 resize / scale、前后 z 序、pinned；成员实例之间连线与删除，显式下板只删投影及相关板边。双击或 Open note 经 /notes/:id 进入原纸；连线模式亦可键盘选卡后 Enter。
- **板视口**：独立坐标转换、空白/Space/中键平移，滚轮平移、修饰键滚轮锚点缩放及缩放按钮。平移无纸边界；连续 zoom 的 UI 数值范围 0.01–100，独立于纸三档。仅 PATCH boards.viewport；不写纸坐标、排版或 typography。
- **freehand**：Pen 绘制，points/path/style 经 visuals API 保存；相对点、包围盒、笔迹路径保留；选择与删除后重开不复现。画物只落板层。
- **保存与竞态**：读写串行、失败固定文案可见；切板/卸载后已发起动作仍保存原板，旧响应不写新板。视口 debounce 尾值离开时提交；进纸等待保存，旧异步 leave 不覆盖新导航。成员 capture 归成员元素，慢拖拽响应不清下一次草稿；相对几何按钮在保存中禁用，SVG 键盘事件不串入旧成员导航。
- 无新增依赖、无外部画布引擎；沿用自有 DOM/SVG/CSS transform 与仓库主题 token。AppLayout 的板尺寸分支与纸行为分离。

### 3. 验证实跑

所有 Vitest 使用 jsdom / 合成内存 fixture，整个 API 模块或 repository 在测试边界 mock；没有真实 HTTP、DB 或应用服务。每次构建/测试把 `COINCIDES_VALIDATION_ENV_DIR` 指向本次新建的空目录 `.codex-tmp/v13-s2-empty-env`（repository 子任务也使用了独立空目录），避免 Vite 自动读取 .env。

| 验证 | 最终结果 |
|---|---|
| client `node node_modules/typescript/bin/tsc --noEmit` | PASS；首块与初次板装配时实跑 |
| client `npm.cmd run build` | **PASS**；最终源码和全部新增测试经 tsc -b + Vite 生产构建。已有 taskStore 动静态混用与 chunk >500kB 提示保留，无构建错误 |
| boardRepository.test.ts | **9/9 PASS**：DTO/types、全部冻结 API unwrap、失败传播、跨 Project 只读候选聚合与空库/失败区分 |
| useBoard.test.tsx | **5/5 PASS**：队列、失败恢复、切板、卸载尾保存、成员/边/画物更新 |
| BoardPage.smoke.test.tsx | **5/5 PASS**：全链、占魂409、连续拖拽慢响应、旧 leave 不覆盖新导航、CG/resize/pan/freehand 删除 |
| purposeRetirement.test.ts | **3/3 PASS**：NULL/sealed/历史顺序、空列表与 writer 不存在、compiled 410 拒绝传播 |
| ContentGroupPanel.test.tsx | **2/2 PASS**：真实 panel 库级魂出生选择与 Relation payload；无魂也能用现有 Item 保存入口，旧名单控件消失 |
| groupGalleryPurposeRetirement.test.tsx | **3/3 PASS**：真实 Gallery loader/save/editor；任何旧 purposes 请求由 fixture 返回410，实际零请求 |
| useNoteCanvasDataAdapter.test.tsx -t 'V13 S2' | **1 PASS / 37 skipped**：真实纸 adapter 改标题保存，零 Purpose PUT/零410错误 |
| 原 GroupGallery.test.tsx -t K-4 | **7 PASS / 10 skipped**；子任务已实跑，未扩为全文件 |
| 最终合并定向执行 | 上述六个本单专属文件 **27/27 PASS**，加 adapter 选择用例合计 **28/28**；Gallery 原7项另计。最后类型修正后烟囱5项单独复跑仍全绿 |
| 工作树边界 | 普通 `git diff --check` PASS；server/shared 零 diff、暂存区空；已有个人/审计未跟踪文件原样保留 |

**实跑链与两把标尺采样：**

基线纸先经真实 useNoteCanvasDataAdapter → useNoteCanvasResolvedLayoutModel / useNoteCanvasFrameModel → usePageReadingPresentation 计算；随后 UI 输入句子开板、新立魂 → 三篇跨 Project 笔记上板 → 两条成员连线 → 拖拽 (80,70)→(128,94)、scale=1.1、z=4、pinned → 三点 freehand → 返回列表、重开保持 → 板 zoom=1.2 → 双击成员进入同一真实纸 hook 链。前后完整采样对象相等，fixture 原 note/block/canvas payload 未变，非预期纸写数组为空。

| 纸采样 | 操作前 | 板缩放后进纸 |
|---|---|---|
| 纸宽×高 / 内容宽 | 904×1278 / 760 | 完全相同 |
| 块存储及 resolved 几何 | x=0,y=40,w=760,h=88；formal_page / page_frame_local / frame-a / inside | 完全相同 |
| 字号 / 行高 | 16.7 / 24.5 px | 完全相同 |
| fit_width baseScale / displayScale | 1.25 / 1.25 | 完全相同 |
| fit_page baseScale / displayScale | 0.704225352112676 / 同值 | 完全相同 |
| physical baseScale / displayScale | 0.8779875966831581 / 同值 | 完全相同 |
| 三档 stepFactor | 各1 | 各1 |

另一个 UI 用例：freehand 删除后重开不复现；有宿主 CG 在 zoom=1.2 下屏幕 resize Δ(120,60) 精确换算为 w=260→360、h=156→206；空白平移 Δ(30,40) 持久化，重开保持视口/尺寸；双击 CG 进宿主纸仍为同一 formal_page 几何。以上是 **fixture/jsdom 的真实生产 hook 与 UI 采样**，不是完整浏览器渲染/用户库实测或 Henry 走查。

复现本单专属测试（client 目录，先设上述空 env 目录变量）：

```text
node node_modules/vitest/vitest.mjs run src/pages/Boards/boardRepository.test.ts src/pages/Boards/useBoard.test.tsx src/pages/Boards/BoardPage.smoke.test.tsx src/pages/Notes/canvasEngine/purposeRetirement.test.ts src/pages/Notes/canvasEngine/panels/ContentGroupPanel.test.tsx src/pages/GroupGallery/groupGalleryPurposeRetirement.test.tsx
node node_modules/vitest/vitest.mjs run src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx -t "V13 S2"
npm.cmd run build
```

### 4. 实跑中发现的现物、修复与未做

- Gallery 保存回归发现 SingleContentGroupEditor 四处 onChange 在 React state updater 内读 event.currentTarget.value，导致延迟执行时 null.value。已在该保存链内改为先取值再 setDraft；随后真实编辑/保存/重开通过。没有扩写纸行为。
- **未修的既有纸内缺陷**：ContentGroupPanel 原有 Item 正文 onChange（当前约1254–1257行）及 type/topic 同模式仍在 updater 内读 event.currentTarget。子任务首次尝试改 Item body 时复现 null.value。该缺陷与 Purpose writer 退役/板 HTTP 契约无关，保留供 HQ 另单；本单未宣称 Item 正文编辑验证通过。最终 Panel 用例只测本单出生引用、名单出口退役与既有保存入口。
- 开发过程中的 fixture 类型/查询选项错误、连线选择态测试时序已修正；最后构建还补全 freehand bounds reduce 的累加器类型，并去掉测试 ByRoleOptions 不支持的 exact 字段。最终 typecheck/build 与定向测试均为修正后结果。
- 未遇到必须新增 server 端点或改变冻结裁定才能继续的契约缺口。单1已声明的旧 note-FK 删除限制不在本单暗修，只修文案；未碰历史魂迁移。
- 未实施删板 UI、改魂 UI、准备区搬迁、其他画物制作 UI、item/text_range 新成员、事件面扩展、编译材料集、纸三档/几何/行为或13.2执行器。没有把只读 CG 的无宿主状态包装成可进纸。
- **未运行整套 `npm run verify:v2-bn8-runtime`**：本单按点名的段内验证与段 plan 禁广泛/安全类测试纪律执行；根命令包含全量测试、server 构建和 changed-file-secrets 扫描。未将整套门记作 PASS 或已豁免。
- 未运行用户库迁移、浏览器/Henry主观走查或生产应用服务。未读 .env、未打印凭证/key、未触用户库、未操作3001/5173。server/shared 无施工；未暂存、未 commit/push/PR。
- CodeGraph 先尝试但 CLI/MCP 不可用，rg 也不在 PATH；限定源码检索回退 PowerShell。检索没有读取数据库、审计数据或环境文件。

### 5. Numstat

已跟踪文件按 `git diff --numstat -- client`；新文件未暂存，按完整新增行计。合计 **32文件，+2488 / -532**，不含本工单仅追加的 Result。

| 文件（相对仓根） | + | - |
|---|---:|---:|
| client/scripts/canvasEngineModelContractCheck.ts | 16 | 40 |
| client/src/App.tsx | 4 | 0 |
| client/src/components/Layout/AppLayout.module.css | 6 | 0 |
| client/src/components/Layout/AppLayout.tsx | 5 | 2 |
| client/src/pages/Courses/ProjectDeleteDialog.tsx | 3 | 1 |
| client/src/pages/GroupGallery/GroupGallery.test.tsx | 0 | 3 |
| client/src/pages/GroupGallery/SingleContentGroupEditor.tsx | 17 | 31 |
| client/src/pages/GroupGallery/groupGalleryData.ts | 2 | 20 |
| client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx | 34 | 22 |
| client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts | 2 | 30 |
| client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayerProps.ts | 0 | 1 |
| client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts | 0 | 2 |
| client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.test.tsx | 0 | 1 |
| client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx | 0 | 3 |
| client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.tsx | 1 | 222 |
| client/src/pages/Notes/canvasEngine/purposeRepository.ts | 3 | 8 |
| client/src/pages/Notes/canvasEngine/purposeService.ts | 4 | 143 |
| client/src/pages/Notes/canvasEngine/runtimeDataTypes.ts | 2 | 2 |
| client/src/pages/Sources/SourceDeleteDialog.tsx | 3 | 1 |
| client/src/pages/Boards/BoardList.tsx | 110 | 0 |
| client/src/pages/Boards/BoardPage.smoke.test.tsx | 491 | 0 |
| client/src/pages/Boards/BoardPage.tsx | 424 | 0 |
| client/src/pages/Boards/Boards.module.css | 111 | 0 |
| client/src/pages/Boards/boardRepository.test.ts | 190 | 0 |
| client/src/pages/Boards/boardRepository.ts | 134 | 0 |
| client/src/pages/Boards/boardTypes.ts | 144 | 0 |
| client/src/pages/Boards/boardViewport.ts | 18 | 0 |
| client/src/pages/Boards/useBoard.test.tsx | 203 | 0 |
| client/src/pages/Boards/useBoard.ts | 186 | 0 |
| client/src/pages/GroupGallery/groupGalleryPurposeRetirement.test.tsx | 117 | 0 |
| client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.test.tsx | 213 | 0 |
| client/src/pages/Notes/canvasEngine/purposeRetirement.test.ts | 45 | 0 |
