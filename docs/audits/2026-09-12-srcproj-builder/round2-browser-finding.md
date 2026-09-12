> **状态 (Status)**: frozen
> **层 (Layer)**: 验证收据 / Evidence
> **日期 (Updated)**: 2026-09-12
> **权威 (Authoritative)**: 否；记录本轮隔离样本的观察和代码定位，不新增施工授权。

# 二轮浏览器页对齐阻断：note placement 与 canvas placement 身份失配

**判定：裁一 server 几何修复与持久化一页一帧已经生效，但浏览器没有消费这些块的持久化 frame/y。不能将数据库 5 帧或“重投影前后同貌”写成浏览器原页对应验收通过。当前需保留工单 ready，等待这处新发现的修复授权；本次定位零产品代码修改。**

## 隔离对象与只读方法

- 明确目标：本轮合成 server `http://127.0.0.1:52002`，source `d2ef33a3-8964-44b8-8c7c-a26b62197e23`，二次重投影后的 note `f1da6fbd-c389-453f-9c91-c2adf926e054`。
- 使用本轮 `current-smoke.json` 中的合成账号正常登录，随后仅 GET `/api/notes/:id/blocks` 与 `/api/canvas-objects/by-note/:id`。没有直接查询数据库，没有读取用户库或 `.env`，没有测试权限/凭据/拒绝策略，没有调用 Git 或接触 `.git`。
- API 证据只保留块/placement/frame 身份与几何字段，未写出账号密码或登录 token：[round2-browser-hydration-api.json](round2-browser-hydration-api.json)。
- 已依 AGENTS 指令先尝试 CodeGraph；当前工具清单无 `codegraph_explore`，shell `codegraph` 不在 PATH，因此以精确文件路径只读定位。

## 观察与可复核数据

API 返回 **5 个 blocks、5 个 blockLayouts、5 个 pageFrames**。每个块都存在正确的同 block_id 布局：frame 末段分别为 `source-page-1` 至 `source-page-5`，每块局部 `x=0,y=0,width=760,coordinate_space=page_frame_local`。但 **5/5 个 note placement_id 都无法匹配 blockLayouts[].placement_id**。

第一块的具体例子：

| 字段 | 实测值 |
|---|---|
| block_id | `ae29362f-344e-5615-baba-cb0431e9aac3` |
| `/notes/:id/blocks` 的 placement_id | `96aea1d0-b2ae-4917-b59e-b2f24354dc8b` |
| 对应 blockLayouts 的 placement_id | `canvas-placement:96aea1d0-b2ae-4917-b59e-b2f24354dc8b` |
| block 原始 canvas_layout | 无有效布局 |
| block display_overrides_json | 空对象 |

其余四块呈完全相同的前缀失配；完整身份值在 API 证据中。

root 已完成的真浏览器观察也有独立证据：

- [round2-after-dom-geometry.json](round2-after-dom-geometry.json)：五个 ARTICLE 的 inline `top` 依次为 **0 / 276 / 552 / 828 / 1104px**，`width=760px`，`min-height=276px`，表现为一条连续正文。
- [round2-before-preview-ax.txt](round2-before-preview-ax.txt)：Boundary seed 显示 Primary PageFrame 1 含 **5** 块，Secondary PageFrame 2–5 各 **0** 块。
- [round2-after-overview.json](round2-after-overview.json) 记录五个 Read page 入口；root 的总览与 Read page 3 实测显示第 2–5 页为空、跳第 3 页为空白，截图见 [round2-after-overview.png](round2-after-overview.png) 与 [round2-after-read-page3.png](round2-after-read-page3.png)。本定位没有重新操作浏览器，截图观察由 root 执行。

## 现役代码因果链

1. `server/src/services/sourceProjectionMaterializer.ts:211` 生成 note placement UUID；`:218` 明确生成 `canvasPlacementId = canvas-placement:${notePlacementId}`。两套身份分别在 `:550` 与 `:593` 写入 note placement 和 canvas placement。该段没有在本轮几何修改中变化。
2. `server/src/services/canvasObjects.ts:1747` 查询 `canvas_placements cp.*`；`:1776` 返回 `blockLayouts` 时将 `row.id`（canvas placement ID）放入 `placement_id`，同时保留正确 `block_id`。
3. `client/src/pages/Notes/canvasEngine/canvasObjectRepository.ts:68` 至 `:82` 将上述布局建立两个 Map，但 `applyCanvasLayoutsToBlocks` 的分支是：**block 有 placement_id 就只查 layoutsByPlacementId；只有 block 没有 placement_id 才查 layoutsByBlockId**。当前样本五个 block 均有 UUID placement_id，全部失配后原样返回，正确的按 block_id 布局没有回退机会。
4. `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:671` 调用该 hydration；`:282` 将缺失的原始 canvas_layout 归一为 null。
5. `client/src/pages/Notes/canvasEngine/placementService.ts:405` 用 `readStoredLayout(block) ?? fallback`。本样本原始 canvas_layout 缺失且 overrides 为空，遂落入 `buildDefaultBlockLayouts`（`:516`）：从 `cursorY=0` 按 `height + DEFAULT_BLOCK_GAP` 累加，默认值没有 frame_id。`runtimeLayout.ts:76` 的 DEFAULT_BLOCK_GAP 为 0；结合 DOM 所见每块 276 高，与 0/276/552/828/1104 完全吻合。
6. 这不是“有有效 frame_id 时仍有意全部重流”的 Source 专用行为：`placementService.ts:438` 起保留有效持久布局的 requestedY，`:458` 保留 frame_id；`placementContractService.ts:44` 让 v2 显式 frame_id 优先选择对应帧，`:81` 将 frame-local y 投射到世界/阅读坐标。因此按现役代码，有效附着成功应消费不同源页的 frame。
7. Export preview 读取的是 `useNoteCanvasLayoutModel.ts:329` 传入的运行时 blockPlacements，`exportPreviewService.ts:244` 按派生 pageFrameId 分组；其 Primary=5、Secondary=0 是客户端运行时结果，不是对数据库持久化页归属的直读。

## 验收边界

- 可以申报：隔离 server 的 904/1278/760/inset 镜像值生效、SQL/API 保留 5 帧及正确源页归属、浏览器块宽 760 与纸宽 904、封面和重投影前后确定性身份/同貌等各自有证据的事实。
- **不能申报：浏览器原页 N 的正文位于投影页 N**。五个空有导航的帧不满足工单首页明确的 Henry 验收基准；相同错误页貌在重投影后重现也不能消除此问题。
- 当前失配位于 API→client hydration 的既有读取路径，独立于本轮 A4 数值镜像。未追查引入历史，未运行 Git，因而不对最初引入版本作断言。
- 修复需要超出“裁一接线＋定向三红转绿＋裁二冒烟＋Result”的明确二轮变更面。本次只记新阻断与证据，**不改 client、不改 serializer、不改 materializer 身份机制、不降测试预期、不将工单翻 done**。
