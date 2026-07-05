> from: claude | to: codex | status: done | re: canvas-persistence-cutover | date: 2026-06-27 | target: V2.BN.8.11.1

> 2026-06-28 routing update: `V2.BN.8.11.1 Canvas Persistence Cutover Gate` remains completed shared infrastructure. The rest of V2.BN.8.11 now routes to ordinary / structured CanvasObject family work, while ContentGroup projection and reuse moves to V2.BN.8.12.

# Spec：三颗承重持久化种子的 DB 发芽（V2.BN.8.11 收口前的最后实质工作）

## Decision (Henry + Codex)

2026-06-27 已确认：这不是 V2.BN.8.10 Typography 的 patch，也不是普通 bugfix。它是 `V2.BN.8.11 Object Projection And Reuse` 之前必须补上的工程地基小版本。

当前版本归属：

- `V2.BN.8.10` 继续保持 TextFlow Typography Maturity 边界，不塞入 Canvas persistence cutover。
- `V2.BN.8.11.1` 改为 `Canvas Persistence Cutover Gate`，先把 PageFrame / PageStack、per-block layout、AnnotationTruth 从 transitional seed 发芽到正式 DB truth。
- 原 `V2.BN.8.11.1 CanvasObject Projection Usage Boundary` 顺延为 `V2.BN.8.11.2`，后续 ContentGroup projection / reuse / Petal reserve / shape tools / image table seed 依次顺延。
- 本 spec 进入 8.11.1 plan 的依据文件；实现完成后再把本文件 status 改为 `done` 并追加 `## Result (codex)`。

已确认的两个实现判断：

- `canvas_placements` 使用统一表，不拆 page-frame placement / block placement 分表。
- `annotation_ranges` 使用子表，不只塞 `ranges_json` 列。

## 背景与目标

当前 canvas engine 的整个 notebook 持久化都骑在 `note.metadata` 的 JSON blob 上，没有 durable 表。其中**三颗是承重种子**，且身份与几何被焊死——这正是 `CanvasObject / CanvasPlacement / ContentMount` 模型本该拆开的：

| # | 种子 | 现在存哪 | 危险 |
|---|------|---------|------|
| 1 | page frames + page stacks | `note.metadata['canvas_engine_page_frames_v1']` | 承重；id+role+几何焊死 |
| 2 | per-block layout | 每个 placement 的 `display_overrides_json['better_notebook_layout']` | 承重；block 身份与几何焊死 |
| 3 | annotations (AnnotationTruth) | `note.metadata['canvas_engine_annotations_v1']` | **承重 + 孤儿**（核心真相却无 DB 排期） |

**Henry 决定**：8.11 不收口，先把这三颗**完整发芽**（拆形状 + 搬进 DB 表）再关。这是 8.11 收口前的最后一件实质工作。

**关键事实**：**没有真实用户数据**（测试数据可丢）。所以走「germinate-then-delete-blob」的干净 cutover，**不需要**向后兼容的双读 shim。

**目标形状**（运行时类型 `types.ts` 已经是拆开的，runtime model 也已是拆开的——只有持久化还焊着；DB 只需镜像这些既有类型）：
- **身份** → `CanvasObject`（`objectId, canvasId, kind, backing, objectClass, status, source`）—— 无几何、无 mount。
- **几何** → `CanvasPlacement`（`placementId, objectId(FK), canvasId, x, y, width, height, rotation, frameId?, surface, boundaryRole, zIndex, snapState?, visibilityState?, renderVisibility?`）。注意 `x/y/width/height` 是从 `CanvasRect` **继承**来的，接口体里看不到——**别漏列这四列**。
- **挂载** → `ContentMount`（`mountId, objectId(FK), targetKind, targetId, projectionMode, syncPolicy`）。`backing='none'` 的对象（如 page frame）**没有** ContentMount。
- **page frame 富属性** → `PageFrameExtension`（typography / template / slots / pageStack 联系，`frameId+objectId` 主键；重子对象存 JSON 列）。
- **annotation** → 独立 `annotation_truths` 表（镜像 `AnnotationTruthV1`），ranges 建议拆 `annotation_ranges` 子表。

> 逐字类型定义见本仓库 `client/src/pages/Notes/canvasEngine/types.ts`（CanvasObject L307-317、CanvasPlacement L319-331、ContentMount L333-340、PageFrameExtension L342-365、各 union L247-295）与 `runtimeDataTypes.ts`（AnnotationTruthV1 L152-169、AnnotationRangeV1 L138-150、枚举 L102-112）。**DB 列直接照这些字段镜像，不要发明新形状。**

## 核心指令：复刻 content_groups 那次实体 cutover（8.7.1–8.7.4）

这条路**已经走通过**。请把同一套 5 步法照搬到本次三颗种子上——**这是本 spec 的主指令**，不要从零设计：

| 步 | 模板（content_groups / group_folders） | 本次照做 |
|---|---|---|
| 1. 建表 | `server/src/db/migrations/031_v2_content_groups.ts`、`032_v2_group_folders.ts`（实体表 + 独立 placement 连接表 + partial-UNIQUE「one primary」索引） | **新建 `035_v2_canvas_objects.ts`**：`canvas_objects` + `canvas_placements` + `content_mounts` + `page_frame_extensions`；**`036_v2_annotation_truths.ts`**：`annotation_truths`(+`annotation_ranges`) |
| 1b. 迁移内 backfill | `033_v2_content_group_members.ts:56`（`SELECT ...json WHERE != '[]'` → `INSERT OR IGNORE` → `UPDATE parent SET json='[]'`，全在 `db.transaction`） | page_frames / annotations 在 `note.metadata`、layout 在 `note_block_placements.display_overrides_json`——**都能在 SQL 里直接 SELECT，照 033 的「迁移内 backfill + 清零」做** |
| 2. 路由 | `routes/contentGroups.ts`（`GET /`、`PUT /by-note/:noteId`、`POST /import-note-metadata`、`/:id` CRUD），注册于 `server/src/index.ts:124-125` | `routes/canvasObjects.ts`（对象+placement+mount）、`routes/annotationTruths.ts`，照样注册 |
| 2b. 服务 | `services/contentGroups.ts:928 replaceNoteContentGroups`（事务内 upsert keep-set，再 soft-delete 不在 keepIds 的） | `services/canvasObjects.ts`、`services/annotationTruths.ts`，同样的 replace-all-by-note 语义 |
| 2c. 校验 | `validators/index.ts`（`replaceNoteContentGroupsSchema` 等；**用 `contentGroupRuntimeIdSchema` = `z.string().min(1).max(180)`，不要 `.uuid()`**——runtime id 如 `page-frame-2` 不是 UUID） | 加平行 schema |
| 3. 客户端 repo | `contentGroupRepository.ts`（GET 实体 → 缺则导入 → merge）、`groupFolderRepository.ts`（**strip 旧 key**） | `canvasObjectRepository.ts`、`annotationTruthRepository.ts` |
| 4. 一次性导入 | `contentGroupEntityCutoverService.ts`（纯函数 `shouldImport` + `merge`，单测友好） | 各建一个 cutover-gate 纯函数模块 |
| 5. 删旧 key | `groupFolderRepository.ts:30 stripImportedLegacyGroupFolderMetadata`（导入后 `PUT /notes/:id` 删掉旧 key） | 删 `canvas_engine_page_frames_v1`、`canvas_engine_annotations_v1`；layout 的旧 key 在 placement 级（见下） |

> migration runner（`server/src/db/migrate.ts`）按文件名排序自动加载、各自事务跑一次，**无中央注册表**——加 035/036 文件即可，每个 `export default { id, description, up(db) }`，全用 `CREATE TABLE IF NOT EXISTS`。下一个可用编号 = **035**（现有到 034）。

## 三颗种子的精确映射

**① page frames** （`pageFrameCollectionService.ts`：读 `pageFrameCollectionFromMetadata`@312、写 `writePageFrameCollectionMetadata`@334）
- 每个 `PageFrameModel` → `CanvasObject(kind='page_frame', backing='none', objectClass='pure')` + `CanvasPlacement(surface='formal_page'，x/y/w/h)` + `PageFrameExtension(template/pageSize/background/contentInset/typography/slots/pageStack…)`。
- **别丢 pageStacks**：blob 同时含 `pageStacks[]` 和 `primaryFrameId/selectedFrameId/primaryStackId/selectedStackId`——collection header（primary/selection + pageStacks）需要一个落点（建议一张轻 `canvas_page_collections` 或挂在 note 的 canvas 上，你定）。

**② per-block layout** （`runtimeLayout.ts:13-23,40` 的 `BlockBoxLayout`/`NOTE_LAYOUT_KEY`；`placementService.ts`：读 `readStoredLayout`@77、写 `buildLayoutPayload`@302/`writeLayoutOverride`@318）
- block 身份已在 `note_blocks`；几何现在焊在 `note_block_placements.display_overrides_json['better_notebook_layout']`。
- → `CanvasObject(kind='paragraph_block_projection', backing='note_block', objectClass='block_backed')` + `CanvasPlacement(几何)` + `ContentMount(targetKind='note_block', targetId=blockId, projectionMode='owned')`。runtime 已有 `BlockPlacementModel`（extends CanvasPlacement + blockId）正是这一行的形状。
- **非 1:1 映射，必须定义转换函数**：`export_role`('included'|'excluded'|'scratch') + `ai_visibility`('visible'|'hidden') + `width_mode` → `CanvasPlacement.visibilityState`('normal'|'scratch'|'ai_hidden'|'export_hidden') + `renderVisibility`。`buildLayoutPayload` 还会把几何 round 成整数、并从 `getBoundaryKind` 派生 `surface`——保留这些语义。
- **建议** `canvas_placements` 是**统一表**（page frame 和 block 共用），这正是「一张 placement 表托所有 canvas 对象」的本意。

**③ annotations** （`useNoteCanvasDataAdapter.ts`：读 `annotationTruthsFromMetadata`@170、写 `saveAnnotationTruths`@371；key `canvas_engine_annotations_v1` 在 `contentGroupMetadataService.ts:16`；工厂 `annotationTruthService.ts:87`）
- `AnnotationTruthV1` → `annotation_truths`（`id, note_id, canvas_id, raw_label, parent_annotation_id, child_annotation_ids(json 或 join), visual_style.color_token, visual_style.marker_kind, created_by, status, created_at, updated_at, metadata`）。
- **建议** ranges 拆 `annotation_ranges` 子表（镜像 033 members 的子表做法），按 `block_id/text_unit_id/canvas_object_id` 建索引——为将来 rebase 留路；`canvas_object_id` FK 让注解能寻址新的 CanvasObject。
- 读路径保留 `normalizeAnnotationHierarchy`（parent/child 修复）。

## 适配器接缝（`hooks/useNoteCanvasDataAdapter.ts` 要改的点）
- `fetchNote`：L298 `setAnnotationTruths(annotationTruthsFromMetadata(...))`、L301 `setPageFrameCollection(pageFrameCollectionFromMetadata(...))` → 改为 await repository load（仿已有的 `loadContentGroupsForNote`/`loadGroupFoldersForNote`，L292-295）。
- 保存：`savePageFrameCollection`(462-493)、`saveAnnotationTruths`(371-406) 现在 `PUT /notes/:id {metadata}` → 换成 repository 保存；`persistBlockLayout`(699-716) 现在写 block-placements 端点 → 改写 CanvasPlacement。
- **必须原样保留 save-generation 乐观模式**：每次保存 `gen = ref.current+1` → 置 ref → 乐观 setState → 响应里 `if (ref.current !== gen) return`（丢弃过期）→ 出错回滚。refs 在 L251-254。content_groups 的 repository 版保存（408-429）就是现成的「repo + generation guard」范例。

## 约束 / 边界
- **三表拆分就是交付物**——`CanvasObject` ⊥ `CanvasPlacement` ⊥ `ContentMount` **绝不能再合回一张表**。
- **不要双写几何**：layout 搬进 `canvas_placements` 后，停止往 `display_overrides_json['better_notebook_layout']` 写，并 strip 该子 key（placement 级，不是 note.metadata 级）。
- 无真实数据 → backfill 可 best-effort（`INSERT OR IGNORE`、跳过坏条目，照 033/034），但**机制必须实现且测试**（收口定义是「完整发芽 + annotations」，不是空表）。
- 三个 reserve（`CanvasObjectReserve`、`RelationEndpointReserve`、各预留 kind）**不在本次范围**——新表别把它们 precluded 掉，但本次不需持久化它们。
- **不动 roadmap、不碰红线**（push/PR/merge/密钥/主观验收归 Henry）。

## 验收（= V2.BN.8.11 收口证据）
1. `035`/`036` migration 建表成功；migrate 幂等。
2. 服务层 round-trip：upsert → 读回一致（page frame / block placement / annotation 各一）。
3. **import-once**：从 legacy blob 发芽一次 → 第二次 load **不**重复导入；导入后三个 legacy key（含 placement 级 `better_notebook_layout`）已被 strip、不复活。
4. 几何不双写；pageStacks/primary/selection 未丢。
5. 测试镜像 `server/src/__tests__/v2GroupFolders.test.ts`（建表 / round-trip / import-once / strip）。
6. **`npm run verify:v2-bn8-runtime` 全绿**（boundary + model-contract smoke + 双端 build + perf smoke + diff check + secret scan）。
7. `git diff --stat` 范围合理：新 migration/route/service/validator/repository/cutover-gate + 改 `useNoteCanvasDataAdapter` / `placementService` / `pageFrameCollectionService` + 测试；不溢出到无关文件。

## 回执（Codex 填）
做完把本文件 header `status` 改为 `done`，下方追加 `## Result (codex)`：新建/改动文件清单 + `git diff --stat` + verify 结果 + 任何偏离本 spec 假设的地方（**不确定不要猜**，标 `needs: claude/henry`）。

特别请回报两个我留给你的实现判断：① `canvas_placements` 用统一表还是 page-frame/block 分表；② annotation ranges 用子表还是 `ranges_json` 列。
## Result (codex)

2026-06-27 / V2.BN.8.11.1 已按本 spec 落地为 `Canvas Persistence Cutover Gate`。

核心结果：

- 已采用统一 `canvas_placements` 表，没有拆成 page-frame placement / block placement 两套表。
- 已采用 `annotation_ranges` 子表，没有只把 ranges 塞成 `ranges_json`。
- 新增 `canvas_objects / canvas_placements / content_mounts / page_frame_extensions / canvas_page_collections`。
- 新增 `annotation_truths / annotation_ranges`。
- Active Note editor 已从旧 metadata / override 写入路径切到 repository + entity route。
- New Note 创建不再写 `canvas_engine_page_frames_v1`，而是在 note 创建后保存 PageFrame collection entity。
- 旧 block-placement route 会剥离 `better_notebook_layout`，防止 stale caller 复活旧 seed。
- PageFrame hydrate 以 `canvas_page_collections.primary_frame_id` 为主副身份权威，不再让旧 extension metadata 里的 `role` 覆盖 collection truth。

新增/重点修改文件：

- `server/src/db/migrations/035_v2_canvas_objects.ts`
- `server/src/db/migrations/036_v2_annotation_truths.ts`
- `server/src/services/canvasObjects.ts`
- `server/src/services/annotationTruths.ts`
- `server/src/routes/canvasObjects.ts`
- `server/src/routes/annotationTruths.ts`
- `server/src/validators/index.ts`
- `server/src/index.ts`
- `server/src/routes/notes.ts`
- `server/src/__tests__/v2CanvasPersistenceCutover.test.ts`
- `server/package.json`
- `client/src/pages/Notes/canvasEngine/canvasObjectRepository.ts`
- `client/src/pages/Notes/canvasEngine/annotationTruthRepository.ts`
- `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts`
- `client/src/pages/Notes/canvasEngine/placementService.ts`
- `client/src/pages/Notes/canvasEngine/runtimeDataTypes.ts`
- `client/src/pages/Courses/CourseDetail.tsx`
- `client/scripts/canvasRuntimeBoundaryCheck.mjs`

验证结果：

- `npm run verify:v2-bn8-runtime` passed.
- `npm run build` passed.
- `npm run build:client` passed.
- `npm run check:canvas-runtime-boundary` passed, 128 checks.
- `npm run smoke:canvas-engine-model-contract` passed, 52 groups.
- `cd server; node --import tsx --test src/__tests__/v2CanvasPersistenceCutover.test.ts` passed, 4 tests.
- `cd server; npm run test:v2` passed, 133 tests.

已知偏离 / carry-forward：

- `blockProjectionService.ts` 和 `shapeProjectionService.ts` 仍引用 `writeLayoutOverride`。它们属于休眠 projection seed，不是 active Note editor persistence path。本次没有提升 shape/connector 持久化。
- `pageFrameCollectionService.ts` 仍保留 legacy parser/writer，供 import-once / 历史 seed / 测试脚本使用。Active editor 已不再通过它写 note metadata。
- 没有做 ContentGroup as CanvasObject projection、CanvasObject reuse UI、PageSlice extraction UI、relation runtime。
