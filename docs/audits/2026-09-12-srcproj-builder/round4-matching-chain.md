> **状态 (Status)**: evidence
> **日期 (Updated)**: 2026-09-12
> **作者**: codex builder 子代理（只读独立审计）
> **依据**: 工单补遗三第 1–2 步；`current-state/page-frame-and-layout-contract.md`（active）
> **边界**: 此清单的行号为四轮修复前现物；仅源码读取，无数据库访问、Git 操作、`.env` 读取或测试执行。

# 四轮 hydration 匹配键双向清单

结论：`applyCanvasLayoutsToBlocks` 中 Map 建键与查询是本单所需唯一产品修改点。归一化只能存在于函数私有的读匹配键；`NoteBlock.placement_id`、`CanvasBlockLayoutRecord.placement_id`、独立 `CanvasPlacement.placementId` 及所有写口均保留原值。

CodeGraph：主代理已确认根 `.codegraph/` 存在，但 CLI 不在 PATH，且本次工具目录没有 CodeGraph MCP。子代理执行 `rg` 亦不在 PATH，随后使用 PowerShell `Get-ChildItem` 与 `Select-String` 读取列明源码目录。搜索仅限 `client/src`、已定位的 server 服务/路由及权威文档，没有递归读取配置值或数据库。

## 1. 产生与 API（全不改）

| 消费/产生点 | 文件与修前行号 | 实际身份/行为 |
| --- | --- | --- |
| source 投影 note placement | `server/src/services/sourceProjectionMaterializer.ts:211,216,550` | `notePlacementId = uuidv4()`；写入 `note_block_placements.id`。 |
| source 投影 canvas placement | 同文件 `218,593` | `canvasPlacementId = 'canvas-placement:' + notePlacementId`；写入 `canvas_placements.id`。 |
| 帧 placement 身份 | 同文件 `453`；`server/src/services/canvasObjects.ts:282` | `canvas-placement:<noteId>:page-frame:<frameId>`；属于 PageFrame，与 blockLayouts 匹配不混用。 |
| blocks API | `server/src/services/notes.ts:151–153` | `nbp.id AS placement_id`，原样裸 UUID。 |
| canvas API blockLayouts | `server/src/services/canvasObjects.ts:1747–1779` | 通过 `canvas_placements` 和 `content_mounts` 找块；`placement_id: row.id` 原样前缀形，不是 note placement ID。 |
| client DTO normalizer | `client/src/pages/Notes/canvasEngine/canvasPersistenceNormalizer.ts:362–369,393` | 过滤合法 `placement_id`/`block_id` 字符串与 layout，不改 ID。 |
| 普通 placement normalizer | 同文件 `135` | 读取 `placementId` / `placement_id` / `id`，继续保留原 placement 身份；不是本单归一化落点。 |

这里是当前工作树源码事实；既有 HEAD 对照与五行隔离 SQL 是三轮证据，不冒称本子代理重新跑过它们。

## 2. hydration 读匹配与全部直接调用

| 位置 | 修前行号 | 行为/约束 |
| --- | --- | --- |
| `canvasObjectRepository.ts` 的 `applyCanvasLayoutsToBlocks` | `60–83` | 先按 block ID 与 placement ID 各建 Map。 |
| 唯一 placement Map 建键 | `74–77` | 当前 `item.placement_id` 精确键；允许在此只归一化 lookup key。 |
| 唯一 placement Map 查询 | `79–81` | 有 `block.placement_id` 时只查 placement Map；无 ID 才按 `block.id` fallback。允许在此归一化 lookup key。 |
| hydration 结果 | `82` | `{ ...block, canvas_layout: layout }`；必须保留 block 的原 placement ID，且不能改入参。 |
| 首次/切 note 装载 | `hooks/useNoteCanvasDataAdapter.ts:659–678` | 分别读 note/blocks、canvas persistence，调用 hydration 后装载状态；这是存量投影重新打开即可受益的路径。 |
| tray/变更后刷新 | 同文件 `2250–2264` | 重读 blocks 与 persistence，再调用 hydration；仍保留两侧 DTO。 |

在 `client/src` 产品 `.ts/.tsx` 的函数名搜索中，以上是 `applyCanvasLayoutsToBlocks` 的全部调用。其余出现于测试。hydration 后的排版、导航、exportPreview 等按 `block.id → canvas_layout` 消费布局，不再次使用这张 placement Map。

## 3. 写回与关联读消费（全部零动）

以下 client 文件除另注均在 `client/src/pages/Notes/canvasEngine/`。

| 路径 | 文件与修前行号 | 保留的 ID 形状/用途 |
| --- | --- | --- |
| 单块保存 URL | `canvasObjectRepository.ts:160–186`，尤其 `169` | `/block-placements/${input.block.placement_id}` 原 NoteBlock ID；返回响应只 reconcile layout，`...response.data` 原 ID 保留。 |
| 页墙 clamp 批量写 | 同文件 `132–143,153` | `layout_updates[].placement_id = block.placement_id`，原 NoteBlock ID。 |
| 通用对象墙 clamp 批量写 | 同文件 `144–147,154` | `object_layout_updates[].placement_id = placementId`，原 CanvasPlacement ID。不可用 block 匹配 helper。 |
| 通用对象单写 | 同文件 `189–203` | payload placement 经过既有坐标转换/校验，不改 ID；非 blockLayouts hydration 写入口。 |
| clamp 前后快照 | `pageFrameWallService.ts:64–77` | 只捕获违规 manual 块，before/after 都从 `block.placement_id` 原样复制。auto 不产生更新。 |
| 通用对象 clamp 快照/投影 | 同文件 `49,79–92` | `placement.placementId` 原样查快照/写快照；freehand/page_frame/paragraph 投影不入通用对象 clamp。 |
| 墙保存与撤销/重做重放 | `hooks/useNoteCanvasDataAdapter.ts:1132–1164` | `1148` 把 snapshot 传 repository；`1159–1161` 用 snapshot 原 `block.placement_id` 匹配当前 blocks。两侧同一 NoteBlock 域，不归一。 |
| 初创、恢复、续写块保存 | 同文件 `1325,1413,1462,1507` | 调用同一 `saveBlockCanvasPlacementForNote`；仍传原 created/block/durableBlock，不采用响应 ID 替换 NoteBlock 身份。 |
| 手势等布局保存 | 同文件 `2267–2285` | `2273` 调单块 writer；成功后只把 `savedLayout.layout` 写回 block，ID 继续原样。 |
| block reorder | 同文件 `2622–2638` | 按原 `block.placement_id` 找项，`2632` 写 `/notes/:id/blocks/reorder`；不可受读归一 helper 影响。 |
| tray 移动与提升 | `hooks/useTrayController.ts:92,154` | 单块走同一 repository writer；placement_ids 传原 CanvasPlacement 身份。 |
| runtime block placement | `placementService.ts:589` | `placementId: block.placement_id || 'placement:' + block.id`；不能把新读键暴露成 runtime 身份。 |
| 通用对象投影身份 | `freehandService.ts:111`、`imageObjectService.ts:137`、`tableObjectService.ts:397`、`visualConnectorService.ts:106`、`layers/NoteWritingSurfaceLayer.tsx:477` | `placement_id: placement.placementId`，均保留原通用 CanvasPlacement 域。 |
| 临时 block/shape 投影身份 | `blockProjectionService.ts:84`、`shapeProjectionService.ts:179` | `placement-${blockId}`；不是 source materializer 裸 UUID/前缀配对。 |
| 页面集合无布局保存调用 | repository `99`；adapter `603,1119`；`client/src/pages/Courses/CourseDetail.tsx:616` | 不携带 block placement 更新，原行为保留。 |
| server 批量 block writer | `server/src/services/canvasObjects.ts:1951–1955` | 同事务内原 `update.placement_id` 调 `saveBlockCanvasPlacement`。 |
| server 单块 writer | 同文件 `2108–2114,2123,2131` | 以入参原 ID 派生 object ID、写 canvas placement，并以同 ID 查/改 note placement 的旧 layout overrides。 |
| server 通用对象批量 writer | 同文件 `1958–1973` | 精确 `cp.id` 查询、同 `update.placement_id` 规范化坐标。 |
| server 通用单写 | 同文件 `2012–2019` | 原 payload placement ID，缺省才用 `${objectId}:placement`。 |

## 4. 相邻匹配及射程判断

`trayService.ts:19–27` 有另一个跨 `NoteBlock.placement_id` 与 `CanvasPlacement.placementId` 的精确匹配，仅对 `surface === 'tray'` 的 placement 生效，同时要求 block ID 与 mount target 一致。这不是本单 `blockLayouts` hydration 函数内 Map 的消费，source 投影 `formal_page` 不走它。按 HQ「client 读匹配单点」射程登记而不改；用现有 tray 回归确认此次变更未破坏其既有行为。

墙 snapshot 的 Map 与 reorder 则都在 NoteBlock ID 域内，根本不需要归一。把归一化放到 DTO normalizer、NoteBlock 属性赋值、通用 CanvasPlacement normalizer 或 writer 中，会越过补遗三明确边界。

## 5. 最小修与定向建议

1. 私有纯函数只去掉一个开头的精确 `canvas-placement:` 前缀；只用在 hydration placement Map 建键和查询。无关 ID 保持原样，不 trim、不大小写变换、不泛化剥任意前缀。
2. 断言同形裸值、同形前缀值、裸→前缀、前缀→裸均命中；不同 placement 即使 block ID 相同也不误配，保留无 placement ID 时的旧 block fallback。
3. 同一块的多个 placement 给不同 frame，确认仍按 placement 分配；入参/输出 ID 原样，payload 不被改变。
4. 读后单块保存 URL、墙 `layout_updates`、通用对象 `object_layout_updates` 断言继续携带输入原 ID；覆盖读取后触发 clamp 的序列，避免只是孤立测试 writer。
5. 既有受影响回归可选：`trayService.test.ts`、`surfacePersistenceContract.test.ts`、`coordinateContractIntegration.test.tsx`、`coordinateContractSession.test.ts`、`hooks/autoWidthFrameSave.test.tsx`、`hooks/pageFrameWallsPersistence.test.tsx`、`pageFrameWallService.test.ts`、`boundaryAccount.test.tsx`，之后按工单跑 client 全库（安全禁令豁免如实记数）。

这份审计没有实现或测试结果；实现、client 全库、浏览器页对齐与不重投影存量实证由根代理执行并在四轮 Result 汇总。
