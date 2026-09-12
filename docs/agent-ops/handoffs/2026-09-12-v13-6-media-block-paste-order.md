> **状态 (Status)**: done（builder 工程施工与申报完成；待 HQ/reviewer 复核，非主观放行）
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-12
> **单号**: 13.6 · 媒体块先遣 · 粘贴图片进纸
> **上游**: 块终局方向档 §四(媒体=四族之一,"13.5 粘贴图片候裁")+修宪记录一;`current-state/page-frame-and-layout-contract.md` §一.8(媒体块不入铺满、同受墙 clamp);claude-log §拍定"image/table 复活走媒体块型通道,旧 generic object 形态入删路线"

# 媒体块先遣 · 粘贴图片进纸

**路线裁定(HQ,依既有拍板)**:走 **NoteBlock 媒体块**路线(与 ItemRefBlockProjection 同构进 BlockEditorLayer 分发);**⛔复活 generic CanvasObject image 面**(CANVAS_MODE_RETIRED 休眠面维持原状,旧符号原地保留——静态门断言它们,13.6 清册随册裁)。上传/资产/回收全部复用现成机器(**零新上传路由**;canvas_assets+image_object_extensions 表既有——本单 note_block 侧如需挂 asset 引用,用 block metadata 存 asset_id,⛔新扩展表)。

## 一 · 块型契约(三处枚举对齐)

1. `shared/types/index.ts`:NOTE_BLOCK_TEMPLATES 加 media 模板(system_type 'media' 枚举已在 :477-484);`legacy_block_type` 联合加 `'media'`;
2. `server/src/validators/index.ts:47-59` noteBlockTypeSchema 加 `'media'`;createNoteBlockSchema superRefine 照 item_ref 先例(:721-732)加按类型校验:media 块必带 `metadata.media.asset_id`(uuid)+naturalWidth/naturalHeight;
3. note_blocks.block_type 裸 TEXT 无 CHECK——**零迁移**;
4. media 块删除走 `releaseAssetReference`/`finalizeCanvasAssetCleanup`(`services/canvasAssets.ts`;image_object_extensions.asset_id 是 RESTRICT,但本单 asset 引用在 block metadata,回收依 canvas_assets 引用计数语义接入,实装口径 builder 勘定申报)。

## 二 · 粘贴通道(唯一插入点)

1. `TextBlockProjection.tsx:1426-1444` handleUnitPaste,在 :1430 `if (!pastedText) return;` **之前**分流:clipboardData 含 image/* 文件且无 text/plain → preventDefault → 上传 → 建媒体块;其余路径零改动(⛔碰 TextFlow 编辑语义/撤销粒度/textFlowEditSession);
2. 上传走现成 `uploadCanvasImageAsset`(`canvasAssetRepository.ts:54-71`,POST /api/canvas-assets/images,10MB 白名单 png/jpeg/webp/gif);上传前用 Image 对象量 natural 尺寸;
3. 建块走现役 createBlock 通道(`useNoteCanvasDataAdapter.ts:1306` 族),block_type 'media',置于当前块之后;失败给可读提示(上传失败⛔留半块);
4. ⛔ surface 层 capture paste 监听(与保存边界/引卡剪贴板抢事件);草稿编辑器/空白面拖拽本单⛔做(记 Result 未做,归媒体块主单)。

## 三 · 渲染(MediaBlockProjection)

1. 新组件 `MediaBlockProjection`,以 `ItemRefBlockProjection` 为形状样板(只读、文字流穿不过、可选中可拖);`BlockEditorLayer.tsx:502-532` 分发点加 media 旁路(照 :224 itemReference 先例);
2. img 加载复用 `loadCanvasImageAssetBlobUrl`(blobUrl 惰性+objectURL 回收——照 `ImageObjectLayer.tsx:48-91` CanvasImageMedia 模式**新写**,⛔改 ImageObjectLayer 本体);alt 文案+加载失败态;
3. 样式新类(⛔改 NoteDetail.module.css 现有 canvasImage* 六类——静态门断言)。

## 四 · 布局契约(契约档 §一.8 逐条落)

1. **width_mode 显式 'manual'**(媒体不入铺满——auto 会被派生盒吃掉宽高比,`placementContractService.ts:25-34` 门槛是 layout 形状不看块型);初始宽=min(naturalWidth, 内容区 760),高按宽高比;
2. **墙 clamp 白嫖**:NoteBlock manual 分支(`buildPageFrameWallEdit` :67-78)现成,确认媒体块入 clamp+撤销栈即可;
3. **估高分流**(本单唯一动现役派生逻辑处):estimateHeight 链按 block_type==='media' 早分流,返回 storedHeight/宽高比推高,⛔吃文字估高(`measurementService.ts:92-114`;`placementService.ts:440-442/:502-509` 的 max() 对矮图会撑大且不可缩——分流后媒体块高度=自身真相);
4. 坐标写 page_frame_local+surface 'formal_page'+boundary_role 'inside'(⛔ canvas_workspace——写闸两端拒收)。

## 五 · 打印/导出(诚实降级)

打印/导出通道对图片是空白区(ExportPreview/NotePrintLayer 无 image 分支)。先遣裁定:媒体块在打印/导出预览中渲染**占位框**(边框+alt/「图片」字样,尺寸按块 rect)——⛔崩⛔空洞;完整图打印归媒体块主单。Result 如实记未做。

## 六 · 台账义务(常备条款)

媒体块渲染引入挂载期新请求 `GET /canvas-assets/:id/blob`:交付前**全夹具台账普查**——unboxing 严格请求台账、Board 族夹具、其余登记制测试夹具,凡可能渲染 media 块的场景显式登记或 mock;client **全库必跑**。

## 七 · 禁区

⛔复活 canvas 模式/generic image 面(NoteWritingSurfaceLayer:3865/2794/2816 休眠门维持);⛔删改静态门断言的旧 image 符号(imageObjectService 五导出/十 token/六 CSS 类原地保留);⛔动 TextFlow 契约面;⛔新迁移⛔新上传路由;⛔源投影 materializer(第二单射程,若本单与其同工作树先后施工,以先落者为准逐一 rebase 申报);⛔安全类测试;⛔碰 .git;⛔commit;⛔读 .env key 值。

## 八 · 验收

1. typecheck+build 绿;受影响静态门(canvasRuntimeBoundaryCheck/canvasEngineModelContract 等)PASS——**旧 image 断言全数存活**;
2. 定向新增:①三处枚举对齐+schema 校验(缺 asset_id 拒)②paste 分流(纯图入/图文混不动文/纯文零变)③MediaBlockProjection 渲染+失败态④manual 布局+估高分流(矮图不被撑大)⑤墙 clamp 入撤销栈⑥删块资产回收;TextBlockProjection.input 族/textFlowDocumentHistory 族回归绿;client **全库**绿;
3. 冒烟(隔离库+真浏览器):截图粘贴进文本块→图现于纸、宽高比正确、可拖动、墙内收 clamp、撤销恢复、删块后 blob 回收、打印预览占位不崩;
4. 证据落 `docs/audits/2026-09-12-media-builder/`(⛔构建产物)。

## 九 · 申报义务

Result 必含:交付清单+numstat、asset 回收接入口径、台账普查清单、测试数字、未做项(拖拽/空白面粘贴/完整打印/表格)。冲突停线举证⛔自作主张。

## Result

**2026-09-12 · codex builder：本单九节施工完成，交 HQ/reviewer 复核。** 走 NoteBlock `media`，未复活 generic canvas 面。全部证据位于 [2026-09-12-media-builder](../../audits/2026-09-12-media-builder/)，无 commit、无 Git/.git 操作、无安全类测试、无 `.env` key 读取、无用户库操作。

### 交付清单与 numstat

| 交付面 | 实装 |
|---|---|
| 块契约 | shared media 模板与 legacy 类型、server schema 对齐；额外同步现役 server 独立模板注册表。`metadata.media` 持有 UUID asset_id、正 naturalWidth/naturalHeight、可选 alt；创建与更新均检查可用 asset。零 migration、零新表、零新上传路由。 |
| 粘贴 | 唯一入口为 `TextBlockProjection.handleUnitPaste` 的空文本 return 之前。仅 image/* 且无 text/plain 分流；图文混合、纯文字以及显式空 text/plain 留在原路径。先量 natural 尺寸，再调现役上传 repository，再走普通 createBlock；普通 reorder 把新块放在当前块之后，几何位置找当前块下方同页不重叠空位。 |
| 失败与会话 | 量图失败/上传失败不建块；缺帧、上传、建块、placement、排序失败均有可读提示。placement/排序失败回滚已建媒体块，成功回滚后确认相应失败写入登记，`whenIdle()` 可正常结束；回滚失败保留失败登记并提示重新打开。路由切换防止旧响应写入新笔记。 |
| 投影 | 新 `MediaBlockProjection` 和独立 CSS，真实 blob reader、alt、加载/错误态、卸载及迟到响应 objectURL 回收；BlockEditorLayer 媒体旁路，保持选择与块拖动，禁文本测量与 resize handle。Overview 复用只读媒体投影。 |
| 布局 | 显式 manual；初始宽=min(naturalWidth,760,当前内容区宽)，高按比例；存 page_frame_local/formal_page/inside。媒体估高早分流，矮图不吃文字最小高度；墙 clamp 与现役 undo 栈工作。 |
| 打印/导出 | NotePrint 与 ExportPreview 用块 rect 的边框+alt 占位；不发图片 blob 请求、不留空洞。完整图片打印未做。 |
| 夹具 | 固定 UUID→PNG Blob helper、7套脚本 transport 显式登记、严格 unboxing 媒体跨宿主回读、两份文档层 reader 隔离；未知请求仍报错。 |
| 派生文档 | 按既有脚本刷新 object-inventory 与状态索引，使文档新鲜度门与新增 media 模板一致。 |

代码/测试/夹具共 **46 文件，+1318 / -28**；工单与生成文档 **3 文件，+51 / -3**；合计 **49 文件，+1369 / -31**。逐文件见 [numstat.tsv](../../audits/2026-09-12-media-builder/numstat.tsv)；前后 SHA-256 与分类合计见 [numstat.json](../../audits/2026-09-12-media-builder/numstat.json)。口径为开工现物快照的逐行 LCS（CRLF 归一），不是 HEAD diff；7份原有脚本夹具以精确剥除本次新增行还原基线，其余源码直接取开工快照。审计证据、临时文件与构建输出不计源码 numstat。

### Asset 回收接入口径

- 复用 `releaseAssetReference` / `finalizeCanvasAssetCleanup`。引用数按 user 内 `image_object_extensions` + **非 trashed 的 media NoteBlock 行** + 既有 Board image visual 计算；同一 block 的多个 placement 不重复计数，多个 block 共用 asset 则分别计数。
- block DELETE/改为 trashed、替换 asset、转出 media、create-discard 在事务中释放旧引用，事务提交后删 blob。归档 block、trash/archive Note、tray/跨 Note placement 转移仍保留 block 引用；移除最后 placement 才走块生命周期。Note/Project 硬删除沿现役聚合回收入口；跨容器仍有活引用的 asset 保留。
- 调用方持有外层事务时，清理任务写入既有 `managed_file_cleanup_jobs`，由既有启动 sweep 执行；文件 I/O 失败也沿该机制重试。未改 TextFlow 保存服务。
- **删除语义限界**：最后活引用释放会实际删除 asset/blob；因此恢复这个 trashed media 块时，若 asset 已不存在，返回可读 `409 media_asset_unavailable`，要求重贴，不恢复成破图。若其他活引用仍保留 asset，则可恢复。Note trash/restore 本身不丢图。
- **上传成功但建块前失败/切页的限界**：现役 API 没有「删除未引用上传」路由；这时没有半块，但可能留下未引用 asset，待原 Note/Project 硬删除回收。本单遵守零新路由，不声称即时清理此窗口。
- 只读复核另见既存 Board 旧 image visual 最后引用删除/替换未接释放，可能遗留资源；本单 media NoteBlock 被现役 Board 搬运策略挡在该路径外，未扩改 generic Board 删除线。

### 台账普查

完整扫描 `client/src`、`client/test`、`client/scripts`：**544 源文件、151 测试文件、25 Board 测试、170 测试/夹具条目**。逐文件库存及人工路径判定见 [fixture-inventory.json](../../audits/2026-09-12-media-builder/fixture-inventory.json) 与 [fixture-ledger.md](../../audits/2026-09-12-media-builder/fixture-ledger.md)。

显式新增登记：`BoardPage.unboxing.test.tsx`；`boardToolsSmoke`、`boardOpenNoteSmoke`、`boardTextRangeSmoke`、`cFix1Smoke`、`pageFrameHealingSmoke`、`pageReadingSmoke`、`paperInkSmoke` 的 transport；`NoteRuntimeDocumentLayer.test.tsx`、`pageFrameAlignment.test.tsx` 的 reader mock。其他 Board 25文件和登记式夹具逐项分为现成 reader mock、已覆盖共用 transport、或媒体 renderer 不可达；没有放宽成任意 asset ID 通配。

### 验证数字与冒烟

- 最终 client 全库：**151/151 文件、1590/1590 测试 PASS**（47.54s）。其中 TextBlockProjection.input **67**、textFlowDocumentHistory.integration **4**、useTextFlowHistory 五文件 **58**、adapter **108**；媒体投影 **4**、paste service **6**、media layout **3**、BlockEditor **17**、PageFrameWalls **17**、NotePrint **18**、ExportPreview.media **1**、unboxing **5**、运输夹具 **7**，均是全库子集，不重复累加。
- server：媒体/schema/回收 **11**，item_ref/生命周期 **12**，既有 TextFlow **14**，共 **37 PASS**。client `tsc -b + vite build`、server `tsc + build` PASS。
- runtime 允许子门逐项执行：registry 功能子集 **4**、manifest **10**、parity **10**；canvas runtime boundary **168 checks**、model contract **60 groups**、performance **5 scenarios**；其余 shell/source/legacy/relation/runtime-import 静态门及 docs:check 均见 [validation-summary.md](../../audits/2026-09-12-media-builder/validation-summary.md) 与日志。
- **门禁执行例外**：Henry 的直接禁令优先；未执行复合脚本末尾 `git diff --check`、`check:changed-file-secrets`，registry 中含信息泄露断言的 `resolve_selection registers…` 一例也过滤。其余允许子门已跑；不申报 `verify:v2-bn8-runtime` 原复合命令完整 PASS，未删除或改写这些门。
- 真浏览器隔离冒烟：API 直传图片后，隔离上传返回适配器接回真实 clipboard paste/create/placement/reorder/blob/render 链；验证比例、块拖动、墙内收、撤销、export 占位、真实 beforeprint 占位、UI删除后 asset行消失/blob文件删除/GET 404。**没有浏览器 UI 上传**。原生打印对话框无法截图，证据为真实 beforeprint 时的生产打印树与760×137占位 rect；不声称已视觉验收原生打印预览。完整过程、截图与限制见 [browser-smoke.md](../../audits/2026-09-12-media-builder/browser-smoke.md)。隔离服务和本单浏览器标签页已关闭。

### 前单边界与未做项

B1e 与源投影单按开工现物保留，没有 Git rebase。16份源投影相关实现/测试/migration及旧 image 引擎文件与基线 **16/16 字节一致**，见 [source-projection-boundary.json](../../audits/2026-09-12-media-builder/source-projection-boundary.json)；`NoteWritingSurfaceLayer` 的本次差异仅新媒体粘贴接线，未改已有 B1e 外观与 CANVAS_MODE_RETIRED 休眠门。旧 image 五导出/十 token/六 CSS 断言保持并通过。

未做：图片文件拖放导入、草稿编辑器/空白面粘贴、媒体 resize/crop、完整图片打印/导出、表格；这些留媒体主单。已做的「块拖动」不等于「文件拖拽上传」。不新增媒体菜单入口、不动 TextFlow 编辑语义/撤销粒度、不动源投影 materializer。本 Result 是 builder 工程回执，主观放行仍归 HQ。
