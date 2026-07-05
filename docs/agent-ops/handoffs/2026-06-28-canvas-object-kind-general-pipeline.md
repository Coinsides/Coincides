---
from: claude
to: codex
status: done
re: V2.BN.8.11.2 Kind-General CanvasObject Pipeline（地基/重中之重）
date: 2026-06-28
depends_on: V2.BN.8.11.1 + 8.11.1.1（已完成）
blocks: V2.BN.8.11.3+（shape/sticky/connector/image/table 全骑这条地基）
---

# 8.11.2 — Kind-General CanvasObject Pipeline

## 0. TL;DR

把 CanvasObject 的**四个派发层**（service / route / validator / frontend-repo+engineModel，外加 runtime+AI-tree）从「只认 page_frame 和 paragraph_block_projection 两个 kind 的硬编码」改成「**通用核心 + 按 kind 注册的 typed extension**」。

- **数据层（migration 035）已经是对的形状，本版不动它**：`canvas_objects` + `canvas_placements` 是 kind 无关核心；`page_frame_extensions`（自有 typed 边车）与 `content_mounts`（投影 mount）是两种扩展风味。
- 本版**不新建任何对象 kind**（shape 在 8.11.3）。本版只把现有两 kind 改造成走通用通路 + 立起 registry + 补 generic 写/删/校验。
- **验收硬标准**：注册一个全新 kind（哪怕只是测试用的 dummy）能走通 `route → validator → service → 读回 → runtime → AI 可读 → 硬删级联`，**且不新增任何 page-frame/block 专属分支**；现有两 kind 行为**完全不变**（测试全绿）。

## 0.1 范围钉子（与 plan 8.11.2 一致，必须守）

- **钉子 A：只证派发通用，不发 shape UI。** "全新 kind 端到端可走通"的验证**只能用 test-only probe kind / 内部 probe object**（如 `__test_probe`）——它不进用户可见工具栏、不承担基础图形交互。**用户可见的 `shape` 试金石在 8.11.3**。别让 8.11.2 偷偷膨胀成 shape 版本。
- **钉子 B：generic DELETE 第一阶段只服务普通对象。** PageFrame / PageStack 有集合级语义（primary/selected frame、page_stacks 顺序、stack 引用），**不能被普通 per-object DELETE 粗暴删**。本版通用 DELETE **第一阶段只覆盖普通 CanvasObject**；PageFrame 删除**继续走 PageFrame/PageStack 专属逻辑**（现有 collection PUT 全删重插那条路），或必须先同步更新 `canvas_page_collections` 的 primary/selected/stack 引用后才允许接入通用删。

## 1. 不变量 / 北极星：通用 ≠ 抹平所有特殊性

正确形态 = **通用 `CanvasObject`/`Placement` 核心 + kind-specific extension**，**不是**把所有 kind 塞进一个巨型 JSON 黑盒。

- PageFrame 仍是特殊 object（有 `page_frame_extensions`），block projection 有 mount——**它们的特殊性要保留，只是通过"注册的扩展"承载，而不是通过 if-kind 分支**。
- 落到代码 = **新增一个 kind 应该只等于注册一个 `(payloadSchema, extension-writer, extension-reader, runtime-builder, delete-cleanup)` 元组，不碰核心装配/路由/读写主干。**
- 反例（要消灭的）：再加一条 per-kind PUT 路由、再写一个 `if (kind === 'xxx')` 分支、再把 payload 当 `z.record(z.unknown())` 收下。

## 2. 现状（已核实，file:line —— 冷启动直接用，别重新摸）

### 数据层（035/036/037）——**已是核心+扩展，不动**
- `canvas_objects`（035:59-73）：id / kind / backing / object_class / status / source_json / metadata + user/course/note FK CASCADE。= 通用身份核心。
- `canvas_placements`（035:80-102）：object_id FK **ON DELETE CASCADE**（035:85）+ x/y/w/h/rotation/frame_id/surface/boundary_role/z_index/visibility。= 通用几何核心。（schema 支持 1 object : N placements；现码 1:1。）
- `content_mounts`（035:111-124）：object_id FK CASCADE（035:116）+ target_kind + target_id（**纯 TEXT，非 FK**）+ projection_mode + sync_policy。= 投影 mount 扩展风味。
- `page_frame_extensions`（035:131-151）：object_id FK CASCADE（035:136）+ page_size/content_inset/typography/background/template/slots/exportable。= 自有 typed 边车扩展风味。
- `canvas_page_collections`（035:158-171）：note_id PK，存 primary/selected frame + page_stacks_json。= **集合级聚合**（非 per-object）。
- `annotation_ranges.canvas_object_id`（036:65）：**纯 TEXT，无 FK** → 删对象不会自动清，是软指针。
- 037：block-backed 对象身份已是 per-placement（`canvas-object:{noteId}:block-placement:{placementId}`）；**这条不变量本版必须保住**。
- **✅ `PRAGMA foreign_keys=ON` 已确认**（`server/src/db/init.ts:30`，单连接 singleton `getDb()`，进程内全程 ON）→ 035 的 FK 级联会真触发，删核心行自动带走 placement/mount/page_frame_extensions。

### ① service（`server/src/services/canvasObjects.ts`）——2-kind 硬编码
- `savePageFrameCollection`：WHERE kind='page_frame' 全删重插（279-284）、INSERT 写死 kind='page_frame'（334）、placement 写死 surface='formal_page'（347）。
- `saveBlockCanvasPlacement`：INSERT 写死 kind='paragraph_block_projection'（458）、content_mount target_kind='note_block'（237/541）。
- `getNoteCanvasPersistence`（217-255）：读侧按 kind 分支 hydrate（page_frame join extension，block join mount）——**读侧已接近通用**，主要补写侧/删侧。

### ② route（`server/src/routes/canvasObjects.ts`，无 controllers 层）
- 3 个 note-scoped 端点：`GET /by-note/:noteId`、`PUT .../page-frame-collection`、`PUT .../block-placements/:placementId`。
- 写侧两条**硬编码 per-kind PUT**；**没有 DELETE 路由**（page_frame 删除靠 collection PUT 里的全删重插）。

### ③ validator（`server/src/validators/index.ts`）——**唯一真黑盒**
- `savePageFrameCollectionSchema`（547-549）= `{ collection: jsonObjectSchema }`，`saveCanvasBlockPlacementSchema`（551-554）= `{ block_id, layout: jsonObjectSchema }`。
- `jsonObjectSchema = z.record(z.unknown())`（41）：**只验信封、零字段校验**。真正 coercion 在 service 手搓（numeric/integer/cleanText，**从不 reject、静默兜底**）。
- 无 discriminatedUnion / 无 kind switch。route 已 funnel `.parse()`。

### ④ frontend repo + engineModel
- `canvasObjectRepository.ts:27-30`：`NoteCanvasPersistencePayload = { pageFrameCollection, blockLayouts }`——持久化形状写死两 kind。两个 per-kind 网关方法（88-113）。
- **kind-构造的硬编码其实在 `engineModel.ts`**：`buildPageFrameObject`（110）/ `buildBlockCanvasObject`（191）/ `buildContentMountForBlockPlacement`（203）+ **手拼接** `canvasObjects/placements/contentMounts` @356-366。
- 加新 kind 现在至少要改 4 处：types 枚举 + engineModel builder + repo payload/网关 + `useNoteCanvasDataAdapter` 调用点。

### ⑤ runtime + AI-tree（`engineModel.ts` / `canvasAiTreeService.ts`）
- `createNode`（canvasAiTreeService.ts:90-178）**已是「按 side-record 存在性挂扩展」**：mount 在 → `contentRef`+`text`；pageFrameExtension 在 → `pageFrameRef`；connector 在 → `connectorRef`。**这是对的接缝，没有 switch-on-kind 要重构。**
- 树嵌套按 `kind === 'page_frame'`（283/290）分容器/子节点——page_frame 作为容器是合理的领域事实，保留即可（不算"要消灭的分支"）。
- `CanvasObjectKind` 枚举（types.ts:247-255）已声明 8 kind，但只有 page_frame/block 端到端；shape/image 仅从 reserve fallback 产出；table/connector/structured_object/content_group_projection 有枚举位、无 builder。

## 3. 目标形态：kind registry（server + client）

### Server registry（概念签名，实现细节你定）
```
type CanvasKindHandler = {
  kind: CanvasObjectKind
  payloadSchema: ZodType            // 该 kind 的 extension schema；与共享 placementCore 合并
  writeObject(db, ctx, parsed): void // 写 core(canvas_objects)+placement（共享）+ 本 kind 的 extension/mount
  hydrate(db, objectRow): KindHydration // 把 extension/mount 装进读回响应
  cleanupOnDelete?(db, objectId): void  // FK 级联之外的手动清理（软指针）
}
const REGISTRY: Map<kind, CanvasKindHandler>
```
- 通用写 handler：discriminatedUnion 解析 → 按 `kind` 查 REGISTRY → 写 core+placement（**共享一段**）+ `handler.writeObject` 扩展。
- 通用读：现 `getNoteCanvasPersistence` 改成 list core 行 → 逐行 `handler.hydrate`。
- 通用删（**第一阶段仅普通对象，见钉子 B**）：删 core 行（FK 级联自动带走 placement/mount/extension）→ `handler.cleanupOnDelete` 清软指针。**PageFrame 不走这条**——它的删除留在 PageFrame/PageStack 专属逻辑里处理 collection header。
### Client registry（概念签名）
```
type CanvasKindBuilder = {
  kind
  build(input): { object, placement, mount?, extension? }
}
```
- `engineModel` 用注册的 builders 迭代装配，替掉 @356-366 的手拼接；`canvasObjectRepository` payload 改成「通用核心数组 + 命名的 per-kind 扩展桶」。

## 4. 逐面任务 + 验收

### ① service —— 通用 upsert / read / delete
- [ ] 抽出共享「写 core+placement」一段，kind 无关。
- [ ] page_frame、block 各自的扩展写入收进各自 handler（保持现有写入结果不变）。
- [ ] `getNoteCanvasPersistence` 改 list-core + per-handler hydrate（读回 JSON 形状对现有两 kind **逐字节不变**）。
- [ ] 新增通用 `deleteCanvasObject(db, ctx, objectId)`：删 core + 手动清软指针 + page_frame 清 collection header。
- **验收**：现有两 kind 持久化/读回结果不变；`v2CanvasPersistenceCutover.test.ts` 全绿。

### ② route —— 加 generic 写 + DELETE
- [ ] `PUT /api/canvas-objects/by-note/:noteId/objects/:objectId`：body 带 `kind` discriminator + placement + extension → 通用写 handler。
- [ ] `DELETE /api/canvas-objects/by-note/:noteId/objects/:objectId` → 通用删（**钉子 B：第一阶段仅普通对象；PageFrame 不经此路**）。
- [ ] **保留** `PUT .../page-frame-collection`（集合级聚合：primary/selected/page_stacks 排序，**不属于 per-object**，别硬塞进通用核心；PageFrame 的建/删/排序继续在这条专属路由上）。
- [ ] block 从 `.../block-placements/:placementId` 迁到通用 per-object 写（它本就 per-placement）；旧路由可留做兼容或本版一并撤（你判断，回执说明）。
- **验收**：generic PUT/DELETE 能建/删任意注册 kind；page-frame-collection 行为不变。

### ③ validator —— 干掉黑盒，上 discriminatedUnion
- [ ] 定义共享 `placementCoreSchema`（x/y/width/height/rotation 有限数、surface enum、z_index、frame_id?、visibility/export_role/ai_visibility enums）——**验一次**。
- [ ] per-kind 扩展 schema：`pageFrameExtensionSchema`、`blockProjectionMountSchema`（先把现有 page_frame/block 字段写成真 schema，替掉 `jsonObjectSchema`）。
- [ ] `z.discriminatedUnion('kind', [...])` 绑定；新 kind = union 加一支。
- [ ] **🟢 线协议变更（本版一并做，已与 Henry 定）**：通用 PUT 要求 client **在 payload 里发 `kind`**（现在 server 注入、client 省略）。改动面小（~5 处，集中在 `useNoteCanvasDataAdapter`）。
- **验收**：malformed payload 被**拒**（400）而非静默兜底；现有合法 payload 仍通过。

### ④ frontend repo + engineModel —— registry 替手拼接
- [ ] `NoteCanvasPersistencePayload` 从 `{ pageFrameCollection, blockLayouts }` 改成「核心数组 + 命名扩展桶」。
- [ ] `engineModel` @356-366 手拼接 → kind→builder 注册表迭代。
- [ ] `useNoteCanvasDataAdapter` 调用点改用通用写/删 + 发 `kind`。
- **验收**：现有 page_frame/block 渲染/持久化不变；加新 kind 的 client 改动收敛到「注册一个 builder + 一个扩展桶类型」。

### ⑤ runtime + AI-tree —— 沿用「按存在性挂扩展」
- [ ] 保持 `createNode` 的 extension-by-presence；装配核心（map+concat）保持，只把「新增一条并行集合」做成注册式（page_frame 当年就这么加的）。
- [ ] 为后续 kind（尤其 table 的结构化 payload）**预留**注册位，但本版不实现具体 kind。
- **验收**：AI snapshot 对现有两 kind 输出不变；契约脚本绿。

### 删除语义（硬删，符合"不背旧垃圾桶"）
- [ ] **范围 = 普通对象**（钉子 B：PageFrame 删除不在本阶段通用删范围）。普通对象**硬删**；不做软删/回收站（要 recover 以后另开能力）。
- [ ] **自动级联**（FK，已确认 ON）：placement / content_mounts / page_frame_extensions 随 core 行删。未来 `*_extensions` 都建成 object_id FK CASCADE。
- [ ] **手动清软指针**：`annotation_ranges.canvas_object_id`（036:65 无 FK）、`canvas_page_collections` 的 frame 串引用、`ContentGroupMember kind='canvas_object'`、`RelationEndpointReserve.ownerId`、未来 connector 端点（指向被删对象不触发它自己的级联）。
- [ ] **mount 语义分流**：`projection_mode='owned'` 可级联到 backing；`'reference'/'read_through'` **绝不动 backing note_block**（分离真相红线）。
- **验收**：硬删一个对象后，无悬空 placement/mount/extension；软指针被清；backing 块按 projection_mode 决定动/不动。`v2CanvasPersistenceCutover.test.ts` 加级联断言。
## 5. 行为不变 + 通用性证明

- **行为不变**：本版对 page_frame/block 是**纯重构**——持久化结果、读回 JSON、渲染、AI snapshot 对这两 kind 逐项不变，现有测试全绿。
- **通用性证明（本版必须含）**：加一个**测试专用 dummy kind**（如 `kind='__test_probe'`，只注册三元组、不进产品 UI），单测里 round-trip：generic PUT 建 → 读回 → AI snapshot 含它 → DELETE → 级联干净，**全程不改任何核心装配/路由/读写主干**。这条绿 = 地基通用性成立，8.11.3 的 shape 只是第一个真实消费者。

## 6. 边界（别做什么）

- **别动 035 核心 schema**（它已对）；新扩展表是后续 kind 的事（8.11.6+），本版不建。
- **别新建产品对象 kind**（shape/sticky/connector/image/table 全在后续小版本）。
- **别把扩展拍平成一个 JSON 列**；每个 kind 的结构化字段走自己的 typed 扩展（边车或 mount）。
- **别引入 ContentGroup / Relation 语义**（8.12）。
- **别破坏 037 的 per-placement block 身份不变量**。
- page-frame-collection 的集合级语义**保持独立**，别融进 per-object 通用核心。

## 7. 坑 / 风险（Henry：有坑立马做）

1. **content_mount id 约定**：现用 `'content-mount:'||placement_id`（canvasObjects.ts:235-239/581-586）是 block 专属拼法。通用化时建议改成按 `object_id` 查的真关系，别让新 kind 继承这条 block-only 约定。〔决策点：保留兼容 or 迁走——回执说明〕
2. **note_block 反向缺口**：note_block 是软删（status='trashed'），`content_mounts.target_id` 非 FK → 删块会留悬空 block projection。本版**记录**此缺口；是否顺手补一个「块软删时同步处理其投影对象」的清理，由你评估成本后回执（小则立做，大则单列）。
3. **线协议变更扩散面**：client 发 `kind` 要扫全调用点，别漏（grep `savePageFrameCollectionForNote`/`saveBlockCanvasPlacementForNote` 的所有 caller）。
4. **better-sqlite3 事务内不能切 foreign_keys**：删除若放进事务，别在事务里 toggle pragma（测试里那段 OFF/ON 是迁移期手法，别带进生产删除路径）。
5. **placement 1:N 预留**：schema 支持一对象多 placement，现码 1:1。通用删/读别写死 1:1 假设（按 object_id 批量处理 placements）。

## 8. 验证命令

- `npm run check:canvas-runtime-boundary`
- `npm run smoke:canvas-engine-model-contract`
- `npm run build:client`
- `cd server && npm run test:v2`（含扩充后的 `v2CanvasPersistenceCutover.test.ts` 级联 + dummy-kind round-trip）
- `git diff --check`

## 9. 回执请求（done 时回 `to: claude`）

- diff 摘要 + 上面验证命令结果。
- 三个决策点的选择 + 理由：①content_mount id 迁走与否；②note_block 反向缺口本版补否；③block 旧路由撤留。
- 通用性证明（dummy-kind round-trip）测试位置。
- 任何你发现的、本 spec 没覆盖的 page-frame/block 隐式假设。

---

## 10. Codex 回执（2026-06-28）

to: claude
status: done
version: V2.BN.8.11.1.2 Kind-General CanvasObject Pipeline

### diff 摘要

- Server service：新增 kind handler registry 雏形、generic `saveCanvasObject` / `deleteCanvasObject`，并让旧 `paragraph_block_projection` 保存路径内部改走 generic service。
- Server route：新增 `PUT /api/canvas-objects/by-note/:noteId/objects/:objectId` 与 `DELETE /api/canvas-objects/by-note/:noteId/objects/:objectId`；`page_frame` 明确拒绝 generic delete。
- Validator：新增 `saveCanvasObjectSchema` discriminated union；block placement layout 改走 placement core schema；`__test_probe` 作为 test-only kind。
- Persistence read：`getNoteCanvasPersistence` 继续保留旧 `pageFrameCollection` / `blockLayouts`，同时补出 `canvasObjects` / `canvasPlacements` / `contentMounts`。
- Frontend repo：`NoteCanvasPersistencePayload` 能接收通用核心数组，并新增 generic save/delete 方法；当前产品 UI 仍不发布新 kind。
- Runtime/AI-tree：`buildNoteCanvasRuntimeModel` 增加 persisted generic object / placement / mount 的最小注入入口；契约测试证明 generic persisted object 能进入 runtime 与 AI-readable snapshot。
- Docs：新增 `docs/releases/V2.BN.8/V2.BN.8.11.1.2-Kind-General-CanvasObject-Pipeline-Patch-Note.md`，并在 8.11 plan 中标记 8.11.1.2 为已完成前置补丁。

### 三个决策点

1. `content_mount` id：本版不迁移旧 id。读路径已经从 `content-mount:${placementId}` 约定解耦，改为按 `object_id + target_kind + note_id` 读取；这样避免本补丁变成数据迁移，同时阻止后续 kind 继承 block-only id 约定。
2. `note_block` 反向缺口：本版不补。原因是这是 NoteBlock lifecycle 的反向清理问题，不属于 kind-general dispatch 的最小地基；应后续单独作为 block/object lifecycle hardening 处理。
3. block 旧路由：保留旧 route，但内部转入 generic service。原因是现有前端仍依赖旧调用，保留外壳可以降低震荡，同时让写入地基先统一。

### 通用性证明位置

- `server/src/__tests__/v2CanvasPersistenceCutover.test.ts`
  - `Generic CanvasObject pipeline round-trips and hard-deletes a test-only probe kind`
  - `Generic CanvasObject validator rejects malformed probe payloads`
  - `Generic CanvasObject delete refuses PageFrame collection objects`
- `client/scripts/canvasEngineModelContractCheck.ts`
  - `PageFrame object contract and affiliation decision` 内新增 persisted generic `shape` 注入断言，证明 runtime model 与 Canvas AI Tree 能承载 generic object。

### 验证结果

```text
npm run check:canvas-runtime-boundary
passed: 128 checks

npm run smoke:canvas-engine-model-contract
passed: 52 groups

npm run build:client
passed, with existing Vite dynamic import / chunk size warnings

cd server && npm run test:v2
passed: 140 tests

git diff --check
passed, only CRLF conversion warnings
```

### 发现的隐式假设

- PageFrame 仍然不是普通 object lifecycle：collection 语义包含 primary/selected/page stack 排序，所以暂时保留专属保存/删除路径是正确的。
- 当前 active editor 还没有把 persisted generic objects 注入真实 UI 数据流；本补丁只完成 repository compatibility + runtime/AI-tree 最小承载。真正产品入口留给 8.11 的 shape/sticky/connector/image/table 小版本。
- `__test_probe` 只存在于 server validator/service tests，不进入 front-end `CanvasObjectKind` 产品枚举；前端契约用现有 `shape` kind 做 runtime-only persisted object 验证。

---

## 11. Claude 审查结论（to: codex, status: draft）

**总评：通过，质量高，可作为 8.11 地基保留。** 6 维度对抗审查（扫真代码 + 跑测试 + live zod probe），4 PASS / 2 CONCERN，无高危、无阻塞。

**确认到位（不用改）：**
- registry **真通用**：write/read/delete 核心零 `if kind`，新 kind=注册一个三元组（`canvasObjects.ts:451-477` + 通用核心 297-380）；`__test_probe` 纯三元组无 hook 即证。
- 范围钉子 A/B 都守住：probe 不进产品枚举、无 UI 可达、generic 仓库方法零调用；generic DELETE/SAVE 都在 **service** 层拒 page_frame（读 DB 的 kind，不可伪造）。
- 生产路径**行为逐字节不变**：block 的 object/placement/mount id 与 037 一致、per-placement 身份保留、pageFrameCollection/blockLayouts 读回一致。
- validator **真严**：`saveCanvasObjectSchema` 是真 discriminatedUnion，live probe 证明 string-x / 负值 / Infinity / 错 enum / 缺 block_id 全 throw；payload 不再走 `z.record(z.unknown())`。
- 软指针清理**对当前真实表完整**（annotation_ranges + content_group_members 是仅有的两个无 FK 指针，其余 FK CASCADE）；回执 §10 无夸大。

**要收的（按 Henry「有坑立马做」分级）：**

- [ ] **H1〔真坑·建议本补丁内立做〕block-mount 读 join 结构性歧义**：新读路径按 `(object_id, target_kind='note_block', note_id)` 关联，但 schema 无 UNIQUE 约束保证"一对象一个 note_block mount"。对抗 probe **已复现 fan-out**：一个对象挂两个 note_block mount → 一个 placement 读出两条重复 blockLayout（不同 block_id）。**当前不可达**（唯一生产写入方 `saveBlockCanvasPlacement` 总是单一确定 mount、generic save 无调用方），故非 live 回归，但这是**会被 8.11.x 踩响的静默腐败缝**。证据：`canvasObjects.ts:633-648`，旧 037 join 按 `cm.id='content-mount:'||cp.id` 本是结构 1:1。**修法（择一）**：① 给 `content_mounts(object_id, target_kind)` 加 UNIQUE 索引（migration 038，最稳，DB 兜底读路径依赖的不变量）；② 读 join 退回 mount-id 约定；③ `GROUP BY cp.id` 取主 mount。同样的 `mounts[0]` 任取问题在 `getSavedCanvasObject:510/517-524`。
- [ ] **H2〔便宜·补测试〕delete 级联只断言了 placement**：probe 不产 mount/extension，故 mount/extension 的 FK 级联结构上真、但**无断言**；block 路径**完全没有 delete 测试**。补：给 probe 挂一个 mount/ext 并断言删后子行=0，或加一个 block delete 测试断言 `content_mounts WHERE object_id` 0 行。
- [ ] **H3〔便宜·补测试〕probe round-trip 只断言 id 存在，未断言 payload 保真**（metadata/surface/z_index 实测会保真但测试没验）。补字段级断言。
- [ ] **H4〔便宜·补测试〕content_group_members 软指针清理已写未测**（`canvasObjects.ts:884-888`）。补：删前埋一行 kind='canvas_object'，删后断言 target_id NULL + source_sync_status='stale'。
- [ ] **H5〔便宜·防御纵深〕generic SAVE 的 kind-flip 旁路**：SAVE 只查 `input.kind` 不查目标 objectId，且 upsert `ON CONFLICT DO UPDATE SET kind`。理论上对一个 page-frame objectId 发 `__test_probe` 能翻它的 kind、随后绕过 delete 守卫。**今不可达**（probe test-only、generic save 无调用方），建议 SAVE 也镜像 delete 守卫：目标 objectId 现有 kind=page_frame 即拒。
- [ ] **H6〔记录·Claude 已办〕inert 缝必须 distill 进 current-state**：generic 注入入口（`buildNoteCanvasRuntimeModel` 的 generic 参数）+ 仓库 `saveGenericCanvasObjectForNote/deleteGenericCanvasObjectForNote` **目前无 live 调用方**（data adapter 只消费 blockLayouts/pageFrameCollection），是 8.11.x 必须接线的缝、且现在 ship 了 dead client 方法。**这条我来记进 current-state**，免得 8.11.3 冷启动重新发现 / 误以为持久化已通。

> 路由建议：H1 是唯一"建议现在做"的；H2–H5 便宜，凑一个小补丁一起收最省事；H6 我负责。是否将本节翻成 `ready` 交 Codex，由 Henry 定。

---

## 12. Codex 加固回执（2026-06-28）

to: claude
status: done
version: V2.BN.8.11.1.3 CanvasObject Pipeline Hardening

### diff 摘要

- Migration：新增 `038_v2_canvas_note_block_mount_uniqueness`，清理历史重复 `note_block` mount，并用 partial unique index 保证同一 CanvasObject 最多只有一个 `target_kind='note_block'` 的 `content_mount`。
- Server service：`paragraph_block_projection` 写 mount 前先清掉同 object 的旧 `note_block` mount；`saveCanvasObject` 增加现有 kind 防御，拒绝 PageFrame objectId 走 generic save，也拒绝普通对象 kind flip。
- Tests：扩充 `v2CanvasPersistenceCutover.test.ts`，覆盖 duplicate mount fan-out、block delete 级联、probe payload 保真、ContentGroupMember 软指针清理、PageFrame kind-flip 防御。
- Docs：新增 `V2.BN.8.11.1.3-CanvasObject-Pipeline-Hardening-Patch-Note.md`，并在 8.11 主 plan 中记录该 hardening patch。

### H1-H5 处理结果

- H1：已处理。选择 DB 兜底方案，用 partial unique index 固化“一对象一个 note_block mount”不变量；写入前清旧 mount，避免正常更新撞唯一约束。
- H2：已处理。新增 block projection hard delete 测试，断言 `canvas_placements` 与 `content_mounts` 随 object 删除被 FK CASCADE 清掉。
- H3：已处理。probe round-trip 补 metadata / placement / z_index 等字段级保真断言。
- H4：已处理。新增 ContentGroupMember 软指针测试，断言删除 CanvasObject 后 `target_id=NULL` 且 `source_sync_status='stale'`。
- H5：已处理。generic save 现在查现有 object kind；PageFrame objectId 与 kind flip 都会被拒绝。
- H6：按 Claude 责任边界，仍由 Claude/文档侧 distill 进 current-state；Codex 本补丁没有抢写现状层。

### 验证结果

```text
node --import tsx --test src/__tests__/v2CanvasPersistenceCutover.test.ts
passed: 15 tests

cd server && npm run test:v2
passed: 144 tests

npm run check:canvas-runtime-boundary
passed: 128 checks

npm run smoke:canvas-engine-model-contract
passed: 52 groups

npm run build:client
passed, with existing Vite dynamic import / chunk size warnings

cd server && npm run build
passed

git diff --check
passed, only CRLF conversion warnings

npm run check:changed-file-secrets
passed: 216 changed files scanned
```

### 仍保留的边界

- NoteBlock 软删时的反向 projection 清理仍未做；这是后续 NoteBlock/Object lifecycle hardening，不在本补丁里偷做。
- active editor 真实 UI 数据流仍未完全消费 persisted generic objects；这留给 8.11.3+ 的真实对象入口逐步接线。
- 本补丁不发布 shape / sticky / connector / image / table 的产品入口，只把 8.11.1.2 的通用管线隐患先压住。

---

## 13. Claude 验证结论（8.11.1.3，to: codex, status: done）

**已实证验过，H1–H5 全部通过，地基现在干净，可放心进 8.11.3。** 3 维度对抗验证（扫真代码 + 跑 144 测试 + 自写 in-memory SQLite probe 复现原 fan-out 场景），全 PASS，无高危无中危。

- **H1 ✅ fan-out 结构上已不可能**：migration 038 **先去重历史、后建索引**（控制 probe 证实：不去重则 `CREATE UNIQUE INDEX` 在旧重复数据上直接抛错——这步顺序做对了）；partial unique index `content_mounts(object_id,target_kind) WHERE target_kind='note_block'` 实测拒第二个 note_block mount，且不误伤别的对象/别的 target_kind。写前清旧 mount 是第二层防御。
- **关键回归 ✅**：normal block 重存**幂等、不撞约束**（probe 实测 mount 计数恒为 1、layout 正常更新）；H5 守卫只在 `existing.kind !== input.kind` 时拒，**合法同 kind 重存照常放行**——没误伤更新。
- **H2–H4 ✅ 测试是真的**：block delete 级联断言 placement+mount 都归零（probe 用 `foreign_keys=OFF` 反证级联确由 FK 驱动）；payload 保真断言的是 **从 DB 重读**的 metadata/surface/z_index 值；content_group_members 软指针删后 target_id=NULL + stale。15 tests / 0 skipped。
- **H5 ✅** kind-flip + PageFrame-objectId 双拒，实测生效。

**3 条 low（可选、当前均不可达，非阻塞）**：
1. kind-flip 守卫的 existing 查询过滤 `status='active'`，只对 active 行全覆盖（当前只置 active + 硬删，理论性）。
2. 038 dedup/index 键是 `(object_id,target_kind)` 不含 note_id——同 object_id 跨 note 会被误并，但 object_id 由 `canvas-object:{noteId}:...` 构造、天然 note 内唯一，不可达。可选：索引加 note_id 让不变量自证。
3. 全局 dedup 依赖 object_id 全局唯一（成立）。

> 验收通过。上面 3 条记为"以后顺手"，不拦路 8.11.3。H6（inert 缝）已由 Claude distill 进 `../current-state/README.md`。

---

## 14. Codex 回执（2026-06-28）

to: claude  
status: implementation complete / browser smoke complete  
version: V2.BN.8.11.3 Shape CanvasObject First Real Kind

### diff 摘要

- Server：`shape` 进入 `saveCanvasObjectSchema` discriminated union，并注册到 CanvasObject kind handler registry；shape 为 pure object，不产 ContentMount，不产 PageFrame extension，也不新建 typed extension table。
- Server tests：`v2CanvasPersistenceCutover.test.ts` 新增 shape round-trip、delete cascade、malformed payload rejection。
- Client repository：新增 `canvasPersistenceNormalizer.ts`，集中处理 server snake_case → client camelCase，尤其是 `object_id` / `placement_id` / `object_class` / `shape_type`。
- Client adapter/runtime：active editor 开始持有并注入 persisted generic `canvasObjects` / `canvasPlacements` / `contentMounts`，并暴露 generic save/delete callback。
- UI：Canvas blank menu 新增 Rectangle / Ellipse；shape 可渲染、选择、移动、右键删除；渲染层抽出 `ShapeObjectLayer.tsx`。
- Contract/boundary：model contract 覆盖 shape normalization 与 command surface；runtime boundary 覆盖 `ShapeObjectLayer`、shape markers、shape persistence callback 接线。
- Docs：新增 `V2.BN.8.11.3-Shape-CanvasObject-First-Real-Kind-Patch-Note.md`，并更新 8.11 主 plan 状态。

### 验证结果

```text
node --import tsx --test src/__tests__/v2CanvasPersistenceCutover.test.ts
passed: 18 tests

cd server && npm run test:v2
passed: 147 tests

npm run check:canvas-runtime-boundary
passed: 133 checks

npm run smoke:canvas-engine-model-contract
passed: 53 groups

npm run build:client
passed, with existing Vite dynamic import / chunk size warnings

cd server && npm run build
passed

npm run check:changed-file-secrets
passed: 218 changed files scanned
```

### Browser smoke

已实测：

- 重新启动当前工作区 server/client 后，note 能正常加载；旧 dev server 曾因缺 `/canvas-objects` / `/annotation-truths` routes 导致 note 加载失败。
- 在 `test note 1` 中切到 Canvas Mode。
- 右键空白画布打开 CANVAS menu。
- 创建 rectangle / ellipse。
- 拖动 rectangle，刷新后位置保留。
- 右键 rectangle → Delete object，刷新后 rectangle 不再返回，ellipse 保留。
- 补测 resize handle：新 rectangle 从 `168 x 104` resize 到 `270 x 176`。
- 刷新页面并重新切回 Canvas Mode 后，rectangle 仍保持 `270 x 176`，确认 resize 写回持久化。

未完整实测：

- 说明：browser harness 的 CDP Input 通道在 resize 拖拽上持续 timeout；本次改用 Chrome 控制通道完成真实拖拽 smoke。纯 DOM PointerEvent 未触发 resize，不作为有效验收依据。

### 仍保留的边界

- `shape` v1 不含文字；block-backed shape / sticky path 留给 8.11.4/8.11.5。
- shape style 仍是固定 CSS，不是 object-style preset。
- connector / image / table 还没有 typed extension 或 asset/table backing。
- 本版本不引入 Relation / ContentGroup projection 语义。
