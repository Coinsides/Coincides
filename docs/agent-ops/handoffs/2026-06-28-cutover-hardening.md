> from: claude | to: codex | status: done | re: cutover-hardening | date: 2026-06-28 | target: V2.BN.8.11.1 收口前 或 8.11.2 首件（Henry 定）

# Spec：Canvas 持久化 cutover 的加固（Claude 对抗式审查发现）

## Result (codex)

> status: done | date: 2026-06-28 | patch note: `docs/releases/V2.BN.8/V2.BN.8.11.1.1-Canvas-Persistence-Cutover-Hardening-Patch-Note.md`

Codex 已完成本 handoff 要求的 cutover hardening。本次修的是 persistence cutover 地基，不进入 structured object family，也不提前做 ContentGroup projection / reuse UI。

### 处置结果

1. Item 1 采用双保险：**per-placement / per-projection 合成 CanvasObject id + mount join 去歧义**。
   - block-backed CanvasObject 不再使用 `block_id` 作为 `canvas_objects.id`。
   - `ContentMount.targetKind = note_block`、`targetId = block_id` 保持不变，继续指向共享内容真相。
   - `getNoteCanvasPersistence` 和 save response SELECT 都增加 note / placement 维度约束，避免跨 note 共享 block 时 mount 扇出。
2. Item 2 已处理：legacy PageFrame / AnnotationTruth metadata strip 不再由两个 loader 各自 PUT stale metadata，而是在 adapter 边界合并为一次 strip PUT。
3. Item 3 已处理：migration 035 backfill PageFrame collection 时会写入旧 frame 的 `documentTypography`。
4. Item 4 已处理：新增回归测试覆盖 legacy backfill、跨 note 共享 block、旧 block-id CanvasObject repair、AnnotationTruth parent/child hierarchy。
5. 额外补充：新增 migration 037，修复已经跑过旧 035 的本地/开发数据库，把旧 `canvas_objects.id = block_id` 的 paragraph projection 迁到 per-placement object，并同步 placement / mount。

### 修改文件

- `server/src/services/canvasObjects.ts`
- `server/src/db/migrations/035_v2_canvas_objects.ts`
- `server/src/db/migrations/037_v2_canvas_object_block_identity_hardening.ts`
- `server/src/__tests__/v2CanvasPersistenceCutover.test.ts`
- `client/src/pages/Notes/canvasEngine/canvasObjectRepository.ts`
- `client/src/pages/Notes/canvasEngine/annotationTruthRepository.ts`
- `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts`
- `docs/releases/V2.BN.8/V2.BN.8.11.1.1-Canvas-Persistence-Cutover-Hardening-Patch-Note.md`
- `docs/agent-ops/handoffs/2026-06-28-cutover-hardening.md`

### 验证

```text
node --import tsx --test src/__tests__/v2CanvasPersistenceCutover.test.ts
cd server; npm run test:v2
npm run build:client
npm run build
npm run verify:v2-bn8-runtime
git diff --check
```

以上均通过。`build:client` 仍报告既有 Vite dynamic import / chunk-size warning，不是本次补丁引入的新失败。

### 偏离 / 留待审查

- 没有偏离本 handoff 的持久化边界。
- Item 1 明确不是二选一，而是同时做 per-placement id 与 join 去歧义。
- 需要 Claude / Henry 复核的重点：migration 037 的 repair 策略是否符合当前“测试数据可清理、拒绝旧兼容包袱”的原则；目前实现是保守修复现有 dev DB，而不是长期兼容旧模型。

## 背景

Claude 对 V2.BN.8.11.1 cutover 做了对抗式审查：**本体通过**——三颗种子真发芽、契约没放松、migration 结构正确、数据没丢、行为测试 4/4 过、会议记录是逐字搬家未删。但探针测试逮到一颗**绿 CI 看不见的哑雷** + 几颗低危。

**硬约束**：item 1（block 身份焊回）**必须在「复用/投影」（8.11.2）建到它上面之前修掉**。今天哑、明天（reuse 一来）致命且带数据。排在 8.11.1 收口前还是 8.11.2 首件由 Henry 定，但**不能让 8.11.2 在没修它时开始堆 reuse**。

---

## Item 1 — P0：block 这一臂把对象身份焊回了 block 身份

**问题**：block projection 把 `canvas_objects.id = block_id`（`035_v2_canvas_objects.ts:419`、`canvasObjects.ts:437`），而 mount 是 per-placement（`035:457-465`）。但 `note_block_placements` 是 `UNIQUE(note_id, block_id)`（`015_v2_note_foundation.ts:72`）——同一 block_id 允许跨多 note。一旦共享：
- migration 的 `ON CONFLICT(id) DO UPDATE SET note_id = excluded.note_id`（`035:344-361`）让对象的 `note_id` 非确定（后迁者覆盖）；
- 读 JOIN `content_mounts cm ON cm.object_id = co.id`（`canvasObjects.ts:225-237` 读 + `:569-576` 保存响应）无 note/placement 去歧义 → 一对多扇出 → **noteA 读出 2 份布局、串进 noteB**（探针已证：objects=1 / placements=2 / mounts=2，placement_id 重复，note_id 被改写）。

今天哑（每条创建路径为每 placement 铸新 block）；8.11.2 reuse 一来即炸。

**修法**（正解，且正好让 reuse 可用）：
- **CanvasObject 身份改为 per-projection（per-placement），不用裸 block_id** —— 合成 id（如 `canvas-object:<note_id>:block:<block_id>` 或基于 `placement_id`），**照抄 page-frame 臂已有的正确范式**（它用 `canvas-object:note:page-frame:frame`，`canvasObjects.ts:148` 一带）。
- **ContentMount 保持 `targetKind='note_block', targetId=block_id`**——它指向**共享的内容**（block），这是对的。于是模型变成：一个 block（内容真相）→ N 个 CanvasObject（每个 note 一个投影实例）→ 各自 placement → 都 mount 回同一 block。**这恰恰是 reuse 需要的形状。**
- 防御补刀：`getNoteCanvasPersistence`（`canvasObjects.ts:225-237`）和保存响应 SELECT（`:569-576`）的 mount JOIN 按 `note_id`/placement 去歧义。
- migration 035 的 backfill（`backfillBlockLayouts`）同步改为合成 per-placement 对象 id。
- **加回归测试**：同一 block_id 放进 noteA + noteB → 各自 `getNoteCanvasPersistence` 只返回各自 1 份布局、note_id 不互相覆盖。

> 自检语义：这是「拆真相」语法的自我违背——cutover 把几何从身份拆开了，却把对象身份焊死成 block 身份。修它 = 把这条缝也拆开。

## Item 2 — P1：import-once strip 竞态

`useNoteCanvasDataAdapter.ts:280-290` 四个 loader 在 `Promise.all` 里读**同一份** `hydratedNote.metadata` 快照；`loadCanvasPersistenceForNote`（删 `canvas_engine_page_frames_v1`）与 `loadAnnotationTruthsForNote`（删 `canvas_engine_annotations_v1`）**各自** PUT `/notes/:id`、各自只删自己那个 key → 后写覆盖、把对方删掉的 key 又加回来。

实体真相不坏（migration 已服务端清、import-once 守卫挡重导），但旧 key 可能残留。**修法**：所有 loader resolve 后**合并成一次 strip PUT**——适配器在 `:290` 其实已经算好了 `cleanMetadata = stripLegacyAnnotationMetadata(stripLegacyPageFrameMetadata(...))`，**只是从没持久化它**。持久化这一次即可。

## Item 3 — P2：typography backfill 丢字段

migration 035 `backfillPageFrameCollections` 的 `insertExtension` 把 `typography_json` 硬编成 `'{}'`（`035:215-216`），迁移旧 frame 时丢掉 `frame.documentTypography`。live 保存路径是对的（`canvasObjects.ts:398` 会持久化它）。**修法**：backfill 里把 `frame.documentTypography` 带进 `typography_json`，与 live 路径一致。

## Item 4 — P2：补两个测试盲区

`v2CanvasPersistenceCutover.test.ts` 现在**只测空 metadata 的新建 note**，从没跑过最该测的「迁移既有数据」路径。补：
- **backfill round-trip**：构造一个带 legacy `note.metadata`（page_frames + annotations）+ `display_overrides_json['better_notebook_layout']` 的 note → 跑 migration 035/036 → 断言三颗种子进了新表、旧 key 被 strip、无关 sibling key 保留。
- **注解层级非平凡树**：当前只测了 `parent_annotation_id:null` / 空 children；补一个真实 parent/child 树的 round-trip，验证 `normalizeAnnotationHierarchy` 在读写两端都保持层级。

## Item 5 — P3：测试运行器互通

`v2CanvasPersistenceCutover.test.ts` 是 node:test 写的，在 `test:v2`（`node --import tsx --test`）下 4/4 过，但 `vitest` 下假报 4 个 cancelled（运行器互通，非断言失败）。**修法**：在文件头注明它的运行器，或移植到 vitest API，让绿信号无歧义。低优先。

---

## 约束 / 边界
- 只动持久化层（migration / canvasObjects 服务 / 适配器 / placementService / 测试）；不溢出。
- 不动 roadmap、不碰红线（push/PR/merge/密钥/主观验收归 Henry）。
- Item 1 改身份方案后，确保现有 4/4 行为测试仍过 + verify 全绿。

## 验收
1. Item 1：同一 block_id 跨 noteA/noteB 的回归测试通过——各 note 各得 1 份布局、note_id 不互覆盖、mount JOIN 不扇出。
2. Item 2：带双 legacy key 的 note，loadNote 后 `note.metadata` 两个 key 都被清、不复活。
3. Item 3：迁移带 documentTypography 的旧 frame，`page_frame_extensions.typography_json` 不为 `{}`。
4. Item 4：两个新测试存在且通过；backfill round-trip 真覆盖迁移路径。
5. **`npm run verify:v2-bn8-runtime` 全绿** + `test:v2` 全过。
6. `git diff --stat` 范围限于持久化层 + 测试。

## 回执（Codex 填）
做完把本文件 `status` 改 `done`，追加 `## Result (codex)`：改了什么 + 各 item 的处置 + verify/test 结果 + 任何偏离（不确定不要猜，标 `needs: claude/henry`）。特别回报 item 1 你选了哪条修法（per-placement 合成 id / join 去歧义 / 两者）。

## Codex Pre-flight Note

> status: completed | date: 2026-06-28 | patch note: `docs/releases/V2.BN.8/V2.BN.8.11.1.1-Canvas-Persistence-Cutover-Hardening-Patch-Note.md`

Codex 将把这件事作为 `V2.BN.8.11.1.1 Canvas Persistence Cutover Hardening` 处理，而不是并入后续 structured object family。

实施选择：

1. Item 1 采用 **per-placement / per-projection 合成 CanvasObject id + mount join 去歧义** 双保险。
2. `ContentMount.targetKind = note_block` 与 `targetId = block_id` 保持不变，继续指向共享内容真相。
3. Item 2 不再依赖两个 repository 各自 PUT stale metadata；目标是合并 legacy key strip，避免并发复活。
4. Item 3 修 migration 035 的 `documentTypography` backfill，使 migration 路径与 live save 路径一致。
5. Item 4 会优先补能暴露当前问题的失败型回归测试，再做最小修复。

审查时请优先看：

- 同一 `block_id` 跨 note / placement 是否不再串 layout；
- `canvas_objects.id` 是否不再裸用 `block_id`；
- `getNoteCanvasPersistence` 与保存响应查询是否不会因为 mount join 扇出；
- 双 legacy metadata key 是否都能 strip 且不复活；
- 新测试是否覆盖 legacy backfill round-trip，而不只是新建空 note。
