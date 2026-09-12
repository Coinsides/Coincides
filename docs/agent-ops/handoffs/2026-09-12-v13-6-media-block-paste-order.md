> **状态 (Status)**: ready(施工夜第三单;13.6 媒体块复活的先遣件,Henry 睡前令提前开工)
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
