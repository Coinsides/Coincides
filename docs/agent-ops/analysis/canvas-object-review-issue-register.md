> **状态 (Status)**: active（审查登记册 · Claude 工作区，持续追加）
> **层 (Layer)**: 现状 / Current-State（分析）
> **日期 (Updated)**: 2026-06-30
> **权威 (Authoritative)**: 否（评估视角；以各审查 doc 的 file:line 为准）

# Canvas Object Family — 审查问题登记册

> **协议**：**不在 V2.BN.8.11 收口前动手修。** 8.11 全部小版本审完后，**一版一版照本册排查烧单**。每审一个小版本，把问题追加进来。
> **状态流转**：`☐ 待排查` → `◐ 修复中` → `☑ 已修` / `✗ 不修(记理由)` / `⤴ 已闭环(被后续版本修掉)`。
> **完整证据/修法**：见对应审查 doc（本册只做可烧的清单）。

## 图例
- **严重度**：🔴 HIGH（必修，多在数据/AI 层或产品红线）｜🟡 MED｜🟢 LOW
- **类别**：`pit`（坑/潜在 bug）｜`improve`（可完善）｜`feature-gap`（功能缺口）

## 汇总（截至 2026-06-30）

| 小版本 | 🔴 HIGH | 🟡 MED | 🟢 LOW | 小计 | 审查 doc |
|---|---|---|---|---|---|
| 8.11.1/.1.1 Cutover（地基） | 1 | 4 | 6 | 11 | 见本册 §V2.BN.8.11.1 |
| 8.11.1.2/.1.3 | 0 | 0 | 1(+3 可选) | 1 | handoff §11-13 |
| 8.11.3 Shape | 1 | 1 | 5 | 7 | 2026-06-29-review-8.11.3-and-8.11.4.md |
| 8.11.3.1 PageFrame Hydration | 1 | 1 | 0 | 2 | 见本册 §V2.BN.8.11.3.1 |
| 8.11.4 Block-Backed | 1 | 7 | 7 | 15 | 同上 |
| 8.11.5 Style+Sticky | 0 | 4 | 6 | 10 | 见本册 §V2.BN.8.11.5 |
| 8.11.6 Visual Connector | 0 | 2 | 6 | 8 | 见本册 §V2.BN.8.11.6 |
| 8.11.7 Image | 0 | 4 | 7 | 11 | 见本册 §V2.BN.8.11.7 |
| 8.11.8 Table | 0 | 4 | 6 | 10 | 见本册 §V2.BN.8.11.8 |
| 8.11.9 Inspector | 0 | 5 | 5 | 10 | 见本册 §V2.BN.8.11.9 |
| **合计（新坑，不含跨版本继承）** | **4** | **32** | **49** | **85** | |

## 审查进度
- ☑ 8.11.1 / .1.1 Cutover 地基（补审 2026-06-30：迁移数据安全 + annotation 层 + import-once + 身份/mount 溯源 + 休眠 seed）
- ☑ 8.11.1.2 / .1.3（已审 + H1–H5 已闭环）
- ☑ 8.11.3 Shape
- ☑ 8.11.3.1 PageFrame Extensionless Hydration（补审 2026-06-30）
- ☑ 8.11.4 Block-Backed Shape（+ migration 039）
- ☑ 8.11.5 Style Preset + Sticky Note
- ☑ 8.11.6 Visual Connector
- ☑ 8.11.7 Image（asset-backed + migration 041）
- ☑ 8.11.8 Table（structured-backed + migration 042）
- ☑ 8.11.9 Object Inspector + Context Actions
- **→ 8.11 object-family 审查全部收口（见本册末"已收口"段）**

---

## V2.BN.8.11.1.2 / .1.3（已闭环 + 残留）

> H1（mount join 歧义）、H5（kind-flip 旁路）已由 8.11.1.3（migration 038 + 守卫）修掉；H2–H4 测试已补。残留：

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| CR-8.11.1.2-01 | 🟢 LOW | pit | validator/index.ts:588-593 + KIND_HANDLERS | `__test_probe` 在**生产** validator union + handler 上线、无 NODE_ENV 守卫，用户可经 generic PUT 写 __test_probe 对象 | ☐ |
| CR-8.11.1.3-01 | 🟢 LOW(可选) | improve | canvasObjects 守卫 | kind-flip 守卫只覆盖 `status='active'` 行（当前不可达） | ☐ |
| CR-8.11.1.3-02 | 🟢 LOW(可选) | improve | migration 038 | 唯一索引键不含 note_id（object_id 天然 note-unique，不可达，加上更自证） | ☐ |

---

## V2.BN.8.11.3 — Shape（首个真对象 + 接入 generic 持久化通路）

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| **CR-8.11.3-01** | 🔴 **HIGH** | pit | engineModel.ts:388-416 / placementService.ts:242 / canvasObjects.ts:1406-1411 | **双真相源**：接 generic 持久化数组时漏 kind 过滤；dedup 按 objectId 但 runtime id(`block.id`/`pageFrame.id`)≠ 持久化 id(`canvas-object:…`)→ 持久化的 page_frame/block_projection **泄成重复**，AI 快照每块每页两个节点。**修：generic 只留 shape/image/table/connector，排除 page_frame/block_projection + boundary 断言。** **⤵ 地基补审已溯源确认（2026-06-30）**：根因=8.11.1.1 的 per-placement 合成身份方案让持久化 id 偏离 runtime builder id；server cutover 测试虽对抗充分，但 **client `buildNoteCanvasRuntimeModel` 的 merge/dedup（坑所在）零测试** → 加 client 回归：喂合成 id 的 page_frame+block-projection 进 genericCanvasObjects，断言每块/每帧 AI 快照恰一节点 | ☑ 8.11.12 Stage1：kind 过滤 + client 回归 |
| CR-8.11.3-02 | 🟢 LOW | pit | canvasPersistenceNormalizer.ts:124-174 | normalizer 静默丢 placement.metadata(layout_policy) + mount.metadata（对 shape 无害，未来 kind 会丢） | ☐ |
| CR-8.11.3-03 | 🟢 LOW | pit | canvasPersistenceNormalizer.ts:86-93 / ShapeObjectLayer.tsx:62-66 | 未知 shape_type 静默被渲染成 rectangle（无信号） | ☐ |
| CR-8.11.3-04 | 🟡 MED | feature-gap | commandSurfaceService.ts:321 / NoteWritingSurfaceLayer 门控 | 可发现性差：建 shape / Add-text 只在右键菜单、只在 canvas mode，无工具栏/快捷键，page mode 看不见 | ☐ |
| CR-8.11.3-05 | 🟢 LOW | feature-gap | objectStyleService.ts:124-149 | 样式固定 v1（无色/描边/边框控制；preset 仅 default/sticky） | ☐ |
| CR-8.11.3-06 | 🟢 LOW | improve | NoteWritingSurfaceLayer.tsx:1559-1632 | resize 仅 14px 单角手柄、无键盘/max-clamp（smoke 的 CDP timeout 即撞此） | ☐ |
| CR-8.11.3-07 | 🟢 LOW | improve | v2CanvasPersistenceCutover.test.ts:912 | shape delete-cascade 测试用 existence 而非 `COUNT=0`（block 路径已用 COUNT，可对齐） | ☐ |

---

## V2.BN.8.11.4 — Block-Backed Shape（图形里写字 + migration 039）

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| **CR-8.11.4-01** | 🔴 **HIGH** | pit | routes/projections.ts:59-79 | **隐藏块泄进 AI projections**：backing 块隐藏规则只在 client filter，server `buildSnapshotFromNote` 选所有块、无 render_scope 过滤 → shape 文本以脱离 shape 的孤立块漏进 AI 快照。**修：hide 规则下沉数据层。** | ☑ 8.11.12 Stage1：server snapshot 过滤 backing block |
| **CR-8.11.4-02** | 🟡 MED | pit | canvasObjects.ts:710 / noteBlocks.ts:112 | demote/delete 只置 backing 块 status=trashed，**从不删 note_block_placements 行** → 累积孤儿、吃 order_index 槽 | ☑ 8.11.13：shape demote/delete 软 trash backing block 时清 `content_mounts` + `note_block_placements`，不 hard-delete |
| **CR-8.11.4-03** | 🟡 MED | pit(铁律) | useNoteCanvasDataAdapter.ts:847-883 | **restore 孤儿（相对不焊绝对违例）**：trashed backing 块带 render_scope 元数据，从回收站恢复后变"看不见、删不掉、改不了"的死块；render_scope(目的相对)焊在块(绝对身份)上、关系没了它还在 | ☑ 8.11.13：restore status active 下沉 server，按 live shape ownership 派生；无 owner 时剥 canvas backing metadata 并恢复普通 placement |
| CR-8.11.4-04 | 🟡 MED | pit | NoteWritingSurfaceLayer.tsx:1509/2477 | 非原子双 trash：server 已 trash + client 又 onTrashBlock 一次，部分失败 client/server 发散 | ☑ 8.11.13：delete shape 后 client 不再二次 DELETE/trash backing block，仅本地撤出，server cleanup 为权威 |
| CR-8.11.4-05 | 🟡 MED | improve | NoteWritingSurfaceLayer.tsx:1418 | re-promote 无界累积：remove-text 再 add-text 时 reuse guard 看不见 trashed 块 → 每轮新建一个 backing 块 | ☑ 8.11.13：shape metadata 记录 `last_backing_block_id`，re-promote 优先恢复/复用历史 backing block |
| **CR-8.11.4-06** | 🟡 MED（产品红线） | feature-gap | NoteWritingSurfaceLayer.tsx:1509 | **demote 销毁用户文本**：remove-text 把承载文本的唯一块 trash 掉，只有 toast → 用户写的内容静默丢失。建议"留成普通块/丢弃"+确认 | ☑ 8.11.13：非空 demote 前弹确认；取消不丢；空文本无确认 |
| CR-8.11.4-07 | 🟡 MED | feature-gap | useNoteCanvasLayoutModel.ts:252 | block-backed shape 文本**不进导出**（buildExportPreviewModel 喂 visibleBlocks、排除 backing 块）→ 静默死路 | ☐ |
| CR-8.11.4-08 | 🟡 MED | pit/feature-gap | NoteWritingSurfaceLayer.tsx:3163 | 空文本残留：清空 shape 文本不 auto-demote，留 active 空块、仍喂 AI/搜索 | ☑ 8.11.13：shape text 保存为空时自动 demote，避免 active 空 backing block |
| CR-8.11.4-09 | 🟢 LOW | pit | canvasObjects.ts:715-725 | shape_object_id 未复核：cleanup 仅在 metadata.shape_object_id===objectId 才 trash；不匹配则跳过但仍删 mount/object → 留 active-but-hidden 孤儿 | ☐ |
| CR-8.11.4-10 | 🟢 LOW | improve | client + server 双 trash | backing 块清理双源 → 应让 server 单一权威、client 从响应 reconcile | ☐ |
| CR-8.11.4-11 | 🟢 LOW | improve | shapeProjectionService vs shapeTextMountService | 两处 backing 元数据构造器 key 集不一致（2-key vs 3-key），client filter 用 OR、server validate 用 AND → 会漂 | ☐ |
| CR-8.11.4-12 | 🟢 LOW | pit | noteBlocks.ts:62-67 metadata merge | backing 元数据三连可被任何 metadata 覆写路径（模板重应用）清掉、un-hide 块 | ☐ |
| CR-8.11.4-13 | 🟢 LOW | feature-gap | notes.ts:277-279 | order_index 槽被 shape-text churn 泄漏（backing 块占文档序号、demote 不回收） | ☐ |
| CR-8.11.4-14 | 🟢 LOW | improve | migration 039:48 | `INSERT OR REPLACE` 理论上静默有损（老 schema 保证无 dup，可接受；硬化可加 count 断言） | ☐ |
| CR-8.11.4-15 | 🟢 LOW | improve | migration 039:66 | `page_frame_extensions.object_id` 索引非唯一、1:1 靠 savePageFrameCollection 全删重插约定（object_id 已 note-unique，可上 UNIQUE 固化结构） | ☐ |

---

## V2.BN.8.11.5 — Object-Style Preset + Sticky Note

> sticky = block-backed shape + `object_style` preset，**因此继承 8.11.4 的全部生命周期坑**（见末"继承"）。本节只列**新坑**。
> 〔Claude 裁定〕审查曾报一颗 HIGH"preset 静默降级"——因 validator 把 `preset_id` 锁成 enum、未知 preset 写不进 → **当前不可达，降为 LOW(前向兼容)**。新坑里**没有 live HIGH**；最该警惕的是继承的 CR-8.11.4-06（对 sticky 升级为 HIGH）。

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| **CR-8.11.5-01** | 🟡 MED | pit | validators/index.ts:602-617 / canvasObjects.ts:524 | object_style + 父 shape metadata 都是 `.passthrough()`（非 strict）→ 任意未知 key 持久化进 canvas_objects.metadata，已登录用户可塞垃圾。修：object_style 用 `.strict()` 或 service 白名单 | ☐ |
| **CR-8.11.5-02** | 🟡 MED | pit | NoteWritingSurfaceLayer.tsx:1458-1480 / commandSurfaceService.ts:596-602 | apply-sticky 给 block-backed **椭圆** → server 拒(sticky 要 rectangle)，但**失败被吞、无任何用户反馈**（菜单对任意 block-backed 都给 sticky；不强制 rectangle；只 `if(saved)`）。修：非矩形隐藏/禁用，或切 sticky 时强制 rectangle + 暴露失败 | ☐ |
| CR-8.11.5-03 | 🟡 MED(潜在) | pit(铁律) | objectStyleService.ts:124-149 / ShapeObjectLayer | style 解析只看 `preset_id`、**不看 backing/objectClass** → 不一致行(pure+sticky)会渲染成 sticky、而 isSticky 判它非 sticky（渲染/逻辑分歧）。今 save+validator 防住、潜在。修：resolveStyle 与 DOM marker 用与 isSticky 同一谓词 | ☐ |
| CR-8.11.5-04 | 🟡 MED | improve | validators/index.ts:623-678 | sticky 校验欠正向规则：无"sticky ⇒ backing=note_block + block_backed + mount"单条断言，靠通用错误涌现。加一条 sticky 专属 superRefine | ☐ |
| CR-8.11.5-05 | 🟢 LOW | pit | objectStyleService.ts:43-45 | (原报 HIGH，裁为 LOW) 未知/未来 preset 静默降级成 default、move 时永久写回。**当前不可达**(validator enum 锁 preset)，前向兼容隐患 | ☐ |
| CR-8.11.5-06 | 🟢 LOW | improve | objectStyleService.ts:46-60 / validators:605-606 | variant/text_inset 被 validator 当独立字段验，但 client read 从 preset_id 重派生/重 clamp、切 preset 时重置 → 装饰字段(单一真相源违例) | ☐ |
| CR-8.11.5-07 | 🟢 LOW | improve | objectStyleService.ts:132-133 | sticky fill/stroke 硬编码字面值；`--canvas-sticky-note-fill/stroke` CSS 变量**从未声明** → 非主题感知、字面值恒胜 | ☐ |
| CR-8.11.5-08 | 🟢 LOW | feature-gap | shapeProjectionService.ts:161 | sticky 无法设为 AI-hidden（画布对象无 ai_visibility 开关，不像普通块）→ 纯装饰/私密 sticky 也必进 AI 快照 | ☐ |
| CR-8.11.5-09 | 🟢 LOW | feature-gap | commandSurfaceService.ts:421/596 | 可发现性：create/make/reset sticky 只右键、只 canvas mode；pure shape 不给"make sticky"(须先 Add text) | ☐ |
| CR-8.11.5-10 | 🟢 LOW | improve | v2CanvasPersistenceCutover.test.ts | 测试缺：object_style move/resize 往返；block_backed+sticky+ellipse 拒绝；route 级 400；demote-后-style-reset | ☐ |

**继承自 8.11.4 / 8.11.3（确认影响 sticky，不重复计数）：**
- **CR-8.11.4-06 demote 销毁文本 → 对 sticky 升级为 🔴 HIGH**：sticky 全部价值=那段文本，"Remove text" 无确认、无 undo 静默毁掉。**sticky 工作流最该先修的一条。**
- CR-8.11.4-01 backing 文本泄进 AI projections —— 确认影响 sticky。
- CR-8.11.4-02/03 孤儿 placement + restore 孤儿 —— 确认影响 sticky。
- CR-8.11.3-01 双真相源 —— 数据通路里 live，但**不复制 sticky**（sticky 是 shape、无重建孪生）。

---

## V2.BN.8.11.6 — Visual Connector（视觉连接线 + 端点模型）

> **本版目前最干净**：删端点级联 / visual_only 边界 / 铁律身份 三项 **PASS，无 HIGH**。**visual_only 边界守得极好**——三锁(validator literal + handler 复检 + DB CHECK)、零耦合 RelationEndpointReserve/relation 表、无任何 name/type/weight/evidence 语义字段；我之前提醒的"端点别被 relation 复用"**完全做到**。无双源(connector 是独立 kind、单节点)。

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| **CR-8.11.6-01** | 🟡 MED | pit | NoteWritingSurfaceLayer.tsx:935-946 | **连接草稿被孤立、无可见态**：Start connect 后点空白处**不清草稿**(只 Escape 清)、且无 rubber-band/源高亮 → 下次 finish 从一个看不见的旧源静默连线。用户中途被困。修：空白点击清草稿 + 画 pending 态 | ☐ |
| **CR-8.11.6-02** | 🟡 MED | pit | migration 040:16,22 / canvasObjects.ts:1521(savePageFrameCollection) | **端点级联覆盖不全**：端点软指针(无 FK)，清理只在 deleteCanvasObject；page_frame 走 savePageFrameCollection 全删重插**不清连接线**，validator 又不限端点 kind → 连到 page_frame 再删帧 = 孤儿线渲染到 (0,0)。**可达性窄(UI 连 shape→shape，page_frame 端点只 API 可达)→ 裁 MED**。修：端点限非 page_frame，或 collection 删时清连接线 | ☐ |
| CR-8.11.6-03 | 🟢 LOW | improve | migration 040:27 / VisualConnectorLayer.tsx:75-85 / validators:709,714 | line_style 无 DB CHECK(只 Zod)；dashed/dotted 持久化但**渲染和 solid 一样**(无 dasharray)；'dot' marker 在 client type 但被 server enum 拒 → 死/跛的样式面 | ☐ |
| CR-8.11.6-04 | 🟢 LOW | improve | engineModel.ts:425 | 持久化的 connector placement bbox 是派生值、server 不重算(client 每次重算)→ 非权威缓存(轻微相对不焊绝对)；直接读 server placement 的消费者会见 stale 几何 | ☐ |
| CR-8.11.6-05 | 🟢 LOW | pit | canvasObjects.ts:740-741 | point 端点 normalizer 接受 NaN 坐标(只 Zod finite() 守)，service 无独立 NaN 守卫 | ☐ |
| CR-8.11.6-06 | 🟢 LOW | feature-gap | visualConnectorService.ts:13 | anchor 仅 center(n/e/s/w/auto 已建模、持久化但无 UI)→ 线穿过 shape 体而非贴边 | ☐ |
| CR-8.11.6-07 | 🟢 LOW | improve | migration 040:32 / metadata.connector_type | relation_kind 列是死重前向接缝、需注释"勿扩成 relation 类型"；connector_type metadata 标签漂移('visual_only' vs 'straight') | ☐ |
| CR-8.11.6-08 | 🟢 LOW | improve | v2CanvasPersistenceCutover.test.ts:1086 | 级联测试只覆盖删 START shape + 单连接线；END 侧分支 + 一 shape 多连接线 的 loop 未测 | ☐ |

---

## V2.BN.8.11.7 — Image（asset-backed CanvasObject + canvas 资产存储 + migration 041）

> **安全面（真风险层）整体过关**（5-agent 一致 + Claude 亲验 handler/upload）：blob 读在 authMiddleware 后（index.ts:130）、IDOR 已闭（`WHERE id=? AND user_id=?`，canvasAssets.ts:159-163）、upload mime 白名单(png/jpeg/webp/gif，**SVG 排除**)+10MB 上限、storage_key server 生成(`userId/uuid.ext`)**无路径穿越**、单 kind **无双源**(image 自有 kind、无重建孪生)。**无 ship-blocking 安全洞**。坑集中在 **asset GC** 与几处"静默死路"。

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| **CR-8.11.7-01** | 🟡 MED | pit | canvasObjects.ts:1196-1205(image handler) / v2CanvasPersistenceCutover.test.ts:402-404 / migration 041:38 | **无 asset GC**：删 image 对象只 CASCADE 掉 extension 行，`canvas_assets` 行 + 磁盘 blob **永久孤儿**。image handler **无 cleanupOnDelete**（亲验；对比 shape 在 1182-1184 有）；测试把"asset 删后存活"**写死成预期**；`asset_id` ON DELETE RESTRICT → 无界磁盘+DB 增长。〔1 agent 评 HIGH(磁盘泄漏+删除留痕/erasure)；**裁 MED**：已知 gap、无腐败、local-first 单用户削弱隐私角度；但"删了图、字节仍躺盘上"对**成熟(删即删)**相关〕**⚠ 8.11.9 已放大**（image duplicate 共享 asset，见 CR-8.11.9-05）→ **GC 从此强制 refcount**。修：image cleanupOnDelete 按 asset_id refcount 删最后引用的 asset 行 + unlink blob(best-effort 吞 ENOENT)；user/note 删时枚举 storage_key 先 unlink | ☐ |
| **CR-8.11.7-02** | 🟡 MED | pit | canvasAssets.ts:99-137(POST /images) / imageObjectService 客户端流 | **上传即留零引用孤儿**：POST /images **先写盘(106)+先插 canvas_assets 行(111-135)**(亲验)，image CanvasObject 是**之后另一次 saveCanvasObject** 才建 → 取消/导航离开/save 失败/**替换图**都留**零引用** asset(连挂在 extensions 上的 refcount GC 都扫不到)。`origin_note_id` ON DELETE SET NULL(126)→删 note 也不删。修：上传 provenance sweep(零引用 + 超时)，或 defer 写盘到 object commit，或 asset+object 单事务端点 | ☐ |
| **CR-8.11.7-03** | 🟡 MED | feature-gap | exportPreviewService.ts(零 image 处理) | **image 静默不进导出**：export 管线对 imageObjects 零消费 → 把图放正式页、导出看不到、**无任何提示**。同 CR-8.11.4-07(shape 文本不进导出)的同一"静默死路"模式。修：导出嵌 blob，或显式标 canvas-only 并告知 | ☐ |
| **CR-8.11.7-04** | 🟡 MED | pit/feature-gap | NoteWritingSurfaceLayer.tsx:1391-1393 / createImageObjectAtPoint:1332-1378 | **上传失败=静默死路**：`createImageObjectAtPoint(...).catch` **只 console.error**，无 toast/loading/placeholder。挑了 renamed/非图/超 10MB → server 400 被吞，**用户啥都没看到**。〔1 agent 评 HIGH〕同"静默死路"成熟墙(但无数据丢失 → 裁 MED)。修：catch 出 toast(区分 too-large/wrong-type/network) + 选图到 asset-ready 间画 loading placeholder | ☐ |
| CR-8.11.7-05 | 🟢 LOW | security | canvasAssets.ts:100,129 / routes/canvasAssets.ts:19-25 / blob route:57-61 | upload **信客户端声明 mime、无 magic-byte sniff**，blob route **无 `X-Content-Type-Options:nosniff`**(无 helmet) → 可塞任意字节标 image/*。**bounded**：served content-type 强制为 image + client 走 `<img>` blob: URL 渲染 + SVG 已排除 + IDOR-scoped(self-only)。〔1-2 agent 评 MED；**裁 LOW**：缓解强、self-XSS only〕修：sniff 魔数(repo 的 documents.ts 已有该能力) + 加 nosniff 头 | ☐ |
| CR-8.11.7-06 | 🟢 LOW | security/improve | canvasAssets.ts:60-77 + canvasObjects.ts:379-393(重复 serializer) | **storage_key 泄给 client**：内部 `userId/uuid.ext` 相对路径(含 userId)被序列化进 asset DTO + getNoteCanvasPersistence.imageObjects，client **从不消费**(normalizer 不读)。非绝对路径(无绝对路径泄漏)，但泄内部存储布局；且 serializer **两处重复**易漂。修：DTO 去掉 storage_key + 收成单一 serializer | ☐ |
| CR-8.11.7-07 | 🟢 LOW | pit | ImageObjectLayer.tsx:65-67,80 | **死的 401 fallback**：blob fetch 失败时 fallback 到 raw `/api/canvas-assets/:id/blob`，`<img>` 无 Authorization 头 → **必 401、永远渲染不出**(blob route 要 Bearer)。fallback 是死路+误导。修：失败渲染显式 broken/retry 态 | ☐ |
| CR-8.11.7-08 | 🟢 LOW | pit | routes/canvasAssets.ts:57-61 / canvasAssets.ts:167 | blob stream **无 error handler**：`pipe(res)` 无 `.on('error')`；`existsSync`→open 有 **TOCTOU 窗口**(外部 GC 删盘时流错误未处理→挂起响应)。修：pipe 前挂 `stream.on('error', next)` | ☐ |
| CR-8.11.7-09 | 🟢 LOW | feature-gap | v2CanvasPersistenceCutover.test.ts:342-405 | 测试缺：**cross-user IDOR 负例**(user B 读 user A assetId → 404、跨用户 note upload → 404) + **path-leak 契约**(persistence 不含 storage_key)。今 scoping 正确但负例无守，未来 refactor 掉 user_id 谓词无人挡 | ☐ |
| CR-8.11.7-10 | 🟢 LOW | improve | routes/canvasAssets.ts:60 / canvasAssets.ts:109 | Content-Disposition filename 仅剥双引号、用户控的 originalname；CR/LF 等头部不安全字符未处理(低危:Express/Node 防头注入 + inline)。修：RFC 5987 `filename*` 或严格 ASCII 回退、剥控制字符 | ☐ |
| CR-8.11.7-11 | 🟢 LOW | feature-gap | NoteWritingSurfaceLayer.tsx:2736-2812(右键 caption/alt) | 无 object inspector：选中对象看不到 kind/backing/assetId/fit/caption/alt/AI-readout；caption/alt 编辑仅右键 canvas mode。**⤴ 8.11.9 已半闭环**：inspector 给了 identity/kind/backing/geometry/AI-status/safe-actions，但 image **asset-detail（assetId/filename/caption/alt/尺寸）仍未渲染** → 残项转 CR-8.11.9-04 | ◐ |

---

## V2.BN.8.11.8 — Table（structured-backed CanvasObject + migration 042 + table.v1 payload）

> **本版数据层是本家族最干净的之一**：5 维度 **3 PASS（持久化/双源、payload 校验、铁律身份）+ 2 CONCERN（mutation 边缘、feature/导出/测试）**。**无双源**（单 objectId 贯穿 projection/object/placement/persist，runtime id==持久化 id，结构上根除 8.11.3 坑）；**payload 校验本家族防得最严**——三层（Zod + service normalizer + DB CHECK），rows≤50/cols≤20/cells≤1000/cell≤2000 字符 → 最大 ~2MB、**无 DoS**，jagged/重复(row,col)/索引不连续全拒；删级联干净、min-1×1 floor 双侧守住；scope 守住（无 formula/sort/filter/freeze/merge/CSV）。坑集中在 **cell 编辑交互层** 与 **删行列无 undo**。
> 〔3-bucket〕🔴 真缺陷：CR-8.11.8-01/-02（删数据无 undo、Esc 被 blur 盖）；🟡 已知-在路上：导出缺席（无真 export-to-file 管线）、可发现性、前向兼容接缝；⚪ 正确推迟：scope 边界守住。

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| **CR-8.11.8-01** | 🟡 MED（产品红线） | pit/feature-gap | tableObjectService.ts:263-295 / historyService.ts:4-7 / commandSurfaceService.ts:458-475 | **删行/删列不可逆毁数据、无 undo、无确认**：deleteTableRow/Column 硬 `.filter()` 掉行列**及其 cells**（亲验，无 trash/无 restore → **比 demote 更不可恢复**）；`RuntimeHistoryEntry` 无 structured/table 类型（亲验）→ Ctrl+Z 对表格 mutation **完全无效**，而画布对 layout/block **有** undo → 用户"Ctrl+Z 能救"心智静默失灵。右键菜单可达。〔1 agent 评 HIGH；**裁 MED**：删列是具名销毁命令、惊讶度低于 demote；但"具名销毁却完全不可恢复 + 画布他处有 undo"是真红线，**置数据丢失 tier 顶**〕修(on-grammar)：RuntimeHistoryEntry 加 structured-mutation 类型进 Ctrl+Z；floor：非空行/列删除加确认 | ☑ 8.11.14：table 结构 mutation 纳入 structuredMutation undo/redo；before/after payload by-value；非空 row/column 删除确认；1x1 floor 保持 |
| **CR-8.11.8-02** | 🟡 MED | pit | TableObjectLayer.tsx:98-107,228-229 / NoteWritingSurfaceLayer.tsx:3340 | **Esc-cancel 被 blur-save 覆盖**：Escape→onCancelCellEdit 卸载 textarea，同一 textarea onBlur=commitEditingCell；commitEditingCell 只看 stale-closure editingCell（卸载前仍真）、**无 cancel-guard ref** → 浏览器卸载时触发 native blur 即 commit 那段被取消的 draft、盖掉丢弃意图（intent 被 autosave 静默焊掉）。修：cancelledRef 让 Escape 权威、commit 早返回 + 回归测试 | ☑ 8.11.14：TableObjectLayer 增加 Escape cancel guard；cancel 路径优先于 blur commit，正常 blur 仍提交 |
| **CR-8.11.8-03** | 🟡 MED | improve（测试缺口） | （无）tableObjectService.ts 无 *.test.* | **客户端 table mutation 模块零单测**：normalize/add/del row-col/updateCell 全无单测；index 重编号 + cell 回填只经未测的 normalize 路径；server 测按值断言但**从不跑 client add/del/edit** → client index 数学回归会静默上线。修：加 tableObjectService 按值单测（addRowBelow rowCount+1 且新 cell 空、deleteColumn 保留其余列文本且索引连续、updateCell 只改一格、≤1 floor） | ☑ 8.11.14：model contract 增加 table mutation math 回归，覆盖 add row、delete column、update cell、1x1 floor、normalize 修复 |
| CR-8.11.8-04 | 🟢 LOW | pit | NoteWritingSurfaceLayer.tsx:3353 / TableObjectLayer.tsx:213-219 | in-flight cell draft 右键删行列时静默丢：onTableContextMenu→setEditingTableCell(null) 不 commit；后续 add/del 在无 draft 的 payload 上跑 → 正打的字无反馈消失。修：开菜单/结构 mutation 前先 commit 在编辑的 cell | ☑ 8.11.14：TableObjectLayer 将 pending cell edit 传给 writing surface；打开 table context menu 前先提交 draft |
| **CR-8.11.8-05** | 🟡 MED | feature-gap | exportPreviewService.ts:192-234 / useNoteCanvasLayoutModel.ts:251-258 | **table 不进 export-preview 模型**：buildExportPreviewModel 只走 NoteBlock+blockPlacements，从不传 structuredObjects → 表格静默缺席导出预览。**注：systemic 于所有 CanvasObject（shape/image 同），且无真 export-to-file 管线（无 jsPDF/html2canvas）→ 是"尚未建"边界、非已上线导出的数据丢失**。同 CR-8.11.3 / -8.11.4-07 / -8.11.7-03 一族。修：export 管线成熟时按 export role + page-frame 归属枚举 CanvasObjects | ☐ |
| CR-8.11.8-06 | 🟢 LOW | improve | canvasObjects.ts:901 / canvasAiTreeService.ts:188 | cell 文本进 AI tree 无控制字符规范化：仅 `.slice(0,2000)`、无控制字符/换行剥离，verbatim 嵌进 structuredRef.payload（bounded ~2MB）→ 控制字符/prompt-injection 形状串可落进 AI 上下文。修：构建 structuredRef 时剥控制字符 | ☐ |
| CR-8.11.8-07 | 🟢 LOW | improve | canvasObjects.ts:959,1111 / migration 042:19 | extension.metadata 无界 passthrough blob：verbatim 存进无长度上限的 metadata TEXT 列，Zod 无 max；今不进 AI tree、但削弱"typed sidecar"保证、潜在 bloat/abuse。修：白名单 key 或限序列化大小 | ☐ |
| CR-8.11.8-08 | 🟢 LOW | pit（前向兼容） | canvasPersistenceNormalizer.ts:310 / canvasObjects.ts:423-429 | non-v1 schemaVersion **静默丢表**：normalizer `if(structuredKind!=='table'||schemaVersion!=='table.v1') return null` → table.v2 上线那天老表 reload 静默从画布消失、无反馈。〔server 侧亦有镜像坑：structuredObjectFromRow 对 unparseable data_json 回退空表、掩盖腐败（今不可达：CHECK+NOT NULL+validator）〕修：版本化 hydration 分支或 unknown version 时 log/toast | ☐ |
| CR-8.11.8-09 | 🟢 LOW | improve（前向兼容） | canvasObjects.ts:1090,1095-1096 / migration 042:14-15 | "generic"结构层其实**焊死 table**：upsert 把 structured_kind/schema_version 写成 SQL 字面 'table'/'table.v1'（忽略 validation 返回值），CHECK 锁死 → 未来 kanban/chart 须改 migration + 改 writer，patch note 宣传的"未来结构 kind 可注册"只半实现。修：upsert 绑定 validation 的 @structured_kind/@schema_version，CHECK 换 allow-list | ☐ |
| CR-8.11.8-10 | 🟢 LOW | feature-gap | commandSurfaceService.ts:413-419 / NoteWritingSurfaceLayer surfaceMode 门控 | 可发现性薄：建表只能 canvas mode 右键空白/页框，无工具栏/快捷键/全局组件菜单，page mode 建表菜单不开 → page-first 用户可能永不知有表格。**⤴ 注：8.11.9 加了 inspector/context actions 但未加 create 入口；全局组件菜单仍 deferred** | ☐ |

> **继承/重复（不重复计数）**：`__test_probe` 在生产 union+handler 无 NODE_ENV 守卫——8.11.8 校验维再次撞见，即 **CR-8.11.1.2-01**（table schema 本身不含它，但同一生产攻击面）。

---

## V2.BN.8.11.9 — Object Inspector + Context Actions（对象读数 + 安全动作 + 右键 parity）

> **5 维度：2 PASS（duplicate 身份 / AI-tree flatten）+ 2 CONCERN（availability / feature）+ 1 FAIL（export-visibility 报 3 HIGH）。**
> 〔Claude 裁定·重要〕**duplicate 维 = PASS（亲验最高危面）**：table 复制**每个 id（object/row/col/cell）真重生、cells 从重生数组重建** → 无共享 id、无串扰；sticky/block-backed 在 draft factory **真禁**（`createCanvasObjectDuplicateDraft` 返回 null，每个入口都过它，无 API/键盘旁路）；clone placement +32/+32 offset、原子持久化。**flatten-then-index 修复经实证正确、无 CR-8.11.3-01 双源回归、containment 保留**。
> 〔Claude 裁定·定级回正〕**export-visibility 维报 3 HIGH，我逐一亲验后无一是 live HIGH**：HIGH-A(open_original→ghost)→ MED(导航死路非数据丢失)；HIGH-B(hide-from-export no-op)→ MED(假控件);HIGH-C(枚举 clobber)→ **LOW**——亲验 scratch/ai_hidden 只在 block-projection 路径(placementService.ts:228 `BlockPlacementModel`)产生，inspector toggle 只碰 generic CanvasPlacement，后者今只 normal/export_hidden → **静默状态丢失当前不可达**（仅"未被产生"非"被守住"）。

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| **CR-8.11.9-01** | 🟡 MED（铁律/restore-orphan 家族） | pit | objectInspectorService.ts:147 / NoteWritingSurfaceLayer.tsx:2612-2619 / useNoteCanvasDataAdapter.ts:822 / noteBlocks.ts:112 | **open_original 导航到 trashed/ghost 块**：gating + handler 都只查 targetKind+targetId、**不查块 liveness**（亲验）；trash 软删不级联 content_mount → open_original 仍 enabled、focus 一个 ghost id、什么都不聚焦。CR-8.11.4-03 经新动作复现。〔1 agent 评 HIGH；**裁 MED**：坏的导航死路、非数据丢失〕修：read 时按 live 块解析 targetId、trashed 则 disable("原块已删")，或 trash 时剪 mount；**别把 liveness 焊进 mount 身份**、read 时派生 | ☐ |
| **CR-8.11.9-02** | 🟡 MED | feature-gap | objectInspectorService.ts:240-246 / exportPreviewService.ts | **"Hide from export" 是持久化 no-op 假控件**：toggle 写 placement.visibilityState='export_hidden'（亲验），但**导出管线从不读它**（exportPreviewService 只读 exportRole/NoteBlock，grep 零 visibilityState 消费），且 toggle 保 renderVisibility='visible' → 连画布都不藏 → 用户翻开关、label 变、**零可观测结果**。〔dim3 评 HIGH / dim5 评 MED；裁 MED：假控件 UX 死路、无数据损伤〕同"对象不进导出"一族但更糟——多了个**会撒谎的控件**。修：管线消费 export_hidden，或管线建好前禁用/标注 | ☐ |
| **CR-8.11.9-03** | 🟡 MED | pit（单一边界破裂） | objectInspectorService.ts:192-197 / commandSurfaceService.ts:495,557,629,647 | **delete 不走"唯一边界"**：本版宣称 objectInspectorService 是 inspector+右键共享的唯一 availability 边界，**但 delete(+inspect)没走它**——每个 shell 菜单硬编码 always-enabled delete，inspector 却 gate 它 → 两套真相源。下一个该 delete-保护的 kind（未来 locked/linked 对象）会在 inspector 禁用但右键自由删——正是本版要消灭的"各说各话"。今良性（唯一 gated kind=page_frame 在这些面不可达）。修：delete/inspect 也走 ObjectContextActionAvailability 投影 + handler 加 enabled 守卫 | ☐ |
| **CR-8.11.9-04** | 🟡 MED | feature-gap | ObjectInspectorLayer.tsx:107-116 / canvasAiTreeService.ts:170-180 | **inspector 只半闭环 CR-8.11.7-11**：image inspector **只显 fit**；assetId/filename/caption/altText/自然尺寸 都算进 model.imageRef 但 layer 从不渲染 → 用户看不到哪个 asset 撑着对象、看不到 caption/alt。"看得懂"目标只兑现一半。修：渲染 image asset-detail 行 + sticky presentation 行 | ☐ |
| **CR-8.11.9-05** | 🟡 MED | feature-gap（放大 CR-8.11.7-01） | objectInspectorService.ts:341-349 / migration 041:38 | **image duplicate 共享 asset → 放大无-GC 债**：duplicate 复用同一 asset_id（亲验），N 对象→1 asset 行；叠加 CR-8.11.7-01（删不释放 asset、asset_id ON DELETE RESTRICT）→ **未来 asset GC 从此强制 refcount**：天真的"删图即释放"会 RESTRICT-fail 或孤立幸存副本。修：GC 必须按 asset_id refcount，归零才删行+unlink；duplicate 处注释共享不变量 | ☐ |
| CR-8.11.9-06 | 🟢 LOW | pit（结构/相对不焊·前向） | types.ts:280-284 / objectInspectorService.ts:243 / placementService.ts:228-237 | visibilityState **重载枚举**（normal\|scratch\|ai_hidden\|export_hidden 一个槽扛 4 正交关切）+ toggle 把任何非 export_hidden 值一律设 export_hidden。**亲验：scratch/ai_hidden 只在 block-projection（BlockPlacementModel）产生，inspector toggle 只碰 generic placement（今只 normal/export_hidden）→ 静默状态丢失当前不可达**，但**非被守、仅未被产生**（脆弱不可达）：一旦 generic placement 能带 scratch/ai_hidden 即真静默吞状态。〔1 agent 评 HIGH；裁 LOW：今不可达、前向结构 hazard；**是 Henry 在意的相对不焊设计气味**〕修：export-hidden/AI-hidden/scratch 拆正交 flag | ☐ |
| CR-8.11.9-07 | 🟢 LOW | pit | objectInspectorService.ts:275-307 | table clone 按 rowIndex:columnIndex 取源 cell、**不先 normalizeTablePayload**（异于所有 mutation helper）→ 漂移 payload 会让副本错位/空格（原表不动，仅 copy-fidelity）。修：clone 顶部先 normalize | ☐ |
| CR-8.11.9-08 | 🟢 LOW | improve | objectInspectorService.ts:117-120,166 | isExportVisible 把 export label 耦合 renderVisibility（AND visibilityState≠export_hidden + renderVisibility=visible）→ render-collapsed 对象误标 export 动作。修：label 只看 visibilityState==='export_hidden' | ☐ |
| CR-8.11.9-09 | 🟢 LOW | improve | objectInspectorService.ts:268,347,367 | duplicated_from 写进 clone metadata（provenance 可接受，但 context-relative 属性落对象记录）→ 须确保永不被当身份读回（dedup/welding）防未来相对不焊回归。修：加注/测试断言无 identity-resolution 路径 key on duplicated_from | ☐ |
| CR-8.11.9-10 | 🟢 LOW | improve（测试缺口） | canvasEngineModelContractCheck.ts:3171-3304 | 契约测试缺：① inspector↔右键 availability **parity** 无测；② table **column-id 重生**无测（只测 row/cell）；③ nested-table 只 .find() 不断言**单次出现/containment**（CR-8.11.3-01 类回归漏网）；④ inspector flatten-resolved aiNode 路径**端到端无测**；⑤ flatten helper 三处重复易漂。修：补断言 + 导出单一 flatten helper | ☐ |

> **闭环/状态联动**：① **CR-8.11.7-11（无 inspector）→ ◐ 半闭环**：inspector 已给 identity/kind/backing/geometry/AI-status/safe-actions，但 image asset-detail 未渲染（残项=CR-8.11.9-04）。② **CR-8.11.3-04 / CR-8.11.5-09（建对象可发现性）→ 未闭环**：inspect≠create-discovery，仍 canvas-mode-only、无工具栏/全局组件菜单。③ **CR-8.11.7-01（asset 无 GC）→ 未闭环且被放大**（见 CR-8.11.9-05）。④ **CR-8.11.4-03（restore-orphan 铁律）→ 经 open_original 复现**（CR-8.11.9-01）。

---

## V2.BN.8.11.1 / .1.1 — Canvas Persistence Cutover（地基·补审 2026-06-30）

> **整个家族坐在这套 cutover 上，前面 7 版对象都建于此。补审 6 维度。结论：持久化层主体扎实**——import-once **销毁顺序安全**（strip 严格 gated 在 durable 实体写之后，写失败则导航离开、绝不 strip → legacy 不会无副本丢失）= **PASS**；strip **竞态真消除**（adapter 边界单次 strip PUT）= **PASS**；`canvas_layout` 确为单一运行时投影、无第二真相；**休眠 seed 复活担忧已澄清**（writeLayoutOverride 等证今不可达）。**但 035 migration 炸出一颗真·HIGH 数据丢失**（亲验），annotation 真相层欠约束。
> 〔3-bucket〕🔴 真缺陷：CR-8.11.1-01（035 塌缩·数据丢失）；🟡 结构欠账：annotation range 焊 offset / parent-child 零完整性 / trash-block 孤儿；其余多为 LOW 硬化。

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| **CR-8.11.1-01** | 🔴 **HIGH** | pit（迁移数据丢失） | migration 035:132,210 / engineModel.ts:70 / 039:48-59 | **035 page_frame_extensions 跨 note 塌缩（亲验）**：PK=`frame_id` 单列 + backfill `INSERT OR REPLACE` + 主框 id 是常量 `'primary-page-frame'`（每篇 note 都用）→ 单事务循环所有 note 时每篇被后一篇**覆盖**、塌成每 frame id 一行 → **每篇非末位 note 永久丢 page_size / content_inset(margins) / background / template / exportable**；legacy 同事务 strip(035:322-324) → **不可恢复**；039 note-scope PK 太晚、只拷幸存行救不回。**是 8.11.3.1 extensionless bug 的根**。〔血量边界（诚实标注）：仅伤 pre-cutover 且**自定义过页样式**的 note（默认样式 note 丢的是默认值、LEFT-JOIN 兜回一致）；local-dev 单用户 pre-release；**结构性复发已被 039 堵死**——但历史自定义样式不可逆 + re-save tail 仍 live（见 CR-8.11.3.1-01）〕修：repair migration 从 placement + 残留 legacy blob 重建 note-scoped extension | ☑ 8.11.12 Stage1：043 repair migration |
| **CR-8.11.1-02** | 🟡 MED | pit（迁移数据丢失·窄） | migration 036:116-127 / annotationTruthService.ts:13-16 | **036 annotation backfill 跨 note 碰撞覆盖**：`INSERT OR REPLACE` 全局 PK + legacy annotation id 非 note-namespaced 且弱唯一(`annotation-{ms}-{7char}`)→ 两 note 带相同 id 时第二篇静默覆盖第一篇、不可恢复(legacy 同 pass strip)。〔reachability 窄：需 id 碰撞——仅当未来"复制 note"连 annotation metadata 一并克隆时可达；今近乎不可达，但对任何未来 duplicate-note 是**潜伏地雷**（同 035 一个病根）〕修：backfill 用 note-scoped id 或 `INSERT`(非 OR REPLACE)碰撞即响 | ☑ 8.11.15：036 预扫重复 id、纯 INSERT、strip 后移 |
| **CR-8.11.1-03** | 🟡 MED | pit（相对不焊·offset） | migration 036:61 / noteBlocks.ts:112 / annotationTruths | **annotation_ranges 焊死绝对 offset**：start/end_offset + block_id **无 FK**，block 编辑/split/merge 后 offset 静默越界/错位，block trash 软删不级联 range → 孤儿；range_text_cache 存了却从不用来检漂移。对比 canvas_object delete 会 SET NULL `annotation_ranges.canvas_object_id`(canvasObjects.ts:1747-1751)、block 路径却没有。修：block mutation 时 rebase/invalidate range、block trash 时 null/标记 | ☑ 8.11.15 + 修正单：读时 pending + overlap 存 pre_edit_offsets + code/formula/shape 接 rebase。**曾发现 BLOCKER 红线（pending 焊死 durable）→ 修正单双向 strip 已真封死**（活探证实 fail-before）。残：新 HIGH CR-8.11.15-07（null-offset 漏渲染·同族·待小修） |
| **CR-8.11.1-04** | 🟡 MED | pit | migration 036:39-40 / annotationTruths.ts:216-220 | **annotation parent/child 零服务端完整性**：parent_annotation_id 无 FK/CHECK/cycle 检查；replaceNoteAnnotationTruths 原样存 parent + 反规范化 child_ids、不核对一致性；完整性全在 client(annotationHierarchyService) → 直接 API / client bug 可存悬空/跨 note/成环层级。修：txn 内校验 parent 存在+同 note、二者取一为单一真相源、拒环 | ☑ 8.11.15：服务端规范化 parent 真相、child 重算、repair-and-persist |
| **CR-8.11.1-05** | 🟡 MED | pit（NEW·AI 层） | noteBlocks.ts:107-115 / canvasObjects.ts:1464-1479 | **trash block 留孤儿 projection、漏进 AI 快照**：DELETE 只置 note_blocks.status=trashed、**不级联** content_mount/canvas_placement/paragraph_block_projection object；读路径只 `co.status='active'`、从不 join note_blocks.status → trashed block 的投影(stale mount 指向死块)持续被 getNoteCanvasPersistence 返回、当 **ghost 节点漏进 AI 快照、无界累积**。修：block trash 连带 trash 其 projection+placement+mount，或读路径 join note_blocks 排除非 active backing | ☑ 8.11.12 Stage1：read-time liveness 过滤 |
| CR-8.11.1-06 | 🟢 LOW | pit | notes.ts:165 | note metadata PUT 是**无脑整块覆盖、无 server 读合并** → strip/typography/proposals 竞态安全全靠 client 自律、server 零防御；未来任何从 pre-strip 快照构建的第二 metadata writer 会复活已 strip 的 legacy key。修：server JSON merge-patch 或"每 note 同时只一个 metadata writer"不变量 | ☐ |
| CR-8.11.1-07 | 🟢 LOW | pit | 035:419-475 / client adapter | block-layout legacy key(better_notebook_layout)**无 adapter import-once 兜底**(仅 migration 035)、不对称于 page-frame/annotation；若 display_overrides 还有该 key 但 placement 行缺失(部分/失败迁移)→ block 位置静默丢失无恢复。修：加对称 adapter 兜底或迁移完整性断言 | ☐ |
| CR-8.11.1-08 | 🟢 LOW | improve | 035:314 / canvasObjects.ts:1646,1320-1341 | typography_json/template_json/slots_json 是**只写不读 phantom 列**（写于 035+save、hydratePageFrameCollection 从不读回）。非用户数据丢失(per-frame typography 非持久真相、note-level metadata 才是)，但 phantom 写面致"typography 真相在哪"困惑 + 让 8.11.3.1 测试的"typography 存活"无法经公共读 API 验证。修：要么读回、要么停写 | ☐ |
| CR-8.11.1-09 | 🟢 LOW | improve | 037:83-88 | 037 deleteOrphanObjects 是**无 scope 全局 DELETE**(今正确：只匹配无 placement 无 mount 的 paragraph_block_projection；但 cutover txn 里的全局删是利器，未来任何合法瞬时无引用的投影会被扫)。修：scope 到 repair loop 触及的 note_ids | ☐ |
| CR-8.11.1-10 | 🟢 LOW | pit | annotationTruths.ts:175,178-189 | replaceNoteAnnotationTruths **note-scoped DELETE + 全局 PK INSERT** → 跨 note id 碰撞时 delete 清不掉、INSERT 撞 PK → 整 txn 抛、save 被拒 500（身份与操作 scope 不一致）。修：note-namespaced id 或复合 PK | ☐ |
| CR-8.11.1-11 | 🟢 LOW | improve（休眠） | placementService.ts:321 / pageFrameCollectionService.ts:334 | 休眠 seed 仍在树里：writeLayoutOverride（所在函数无 runtime caller）、writePageFrameCollectionMetadata（0 caller）、legacy parser（import-once only）——**已证今不可达**，但保留 legacy 写能力、距复活一个接线错误；8.11.1 自己的"剩余注意点"也旗标了。修：删掉，或加 runtime-boundary 断言（任何这些函数获得 reachable caller 且 PUT legacy key 即 fail） | ☐ |

---

## V2.BN.8.11.3.1 — PageFrame Extensionless Hydration（补审 2026-06-30）

> **审查问题：是真修还是盖 bug？结论：read-time MASK，盖住 CR-8.11.1-01 的 035 塌缩，且把丢失永久化。** live save 路径(savePageFrameCollection)本身是原子的、非缺失源；缺失源就是 035。

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| **CR-8.11.3.1-01** | 🔴 **HIGH** | pit（数据丢失·LIVE tail） | canvasObjects.ts:1382-1397,1330 / useNoteCanvasDataAdapter.ts:542-556 / canvasObjects.ts:1635-1653 | **8.11.3.1 是 read-time mask 而非 fix，且 re-save 把丢失永久化**：LEFT-JOIN 只救几何+exportable，extension 缺失时 content_inset **退死默认 96/72**、pageSize/background/templateId→undefined；**adapter 立即把兜底后的 collection 再存回 → savePageFrameCollection 写入新 extension 时把默认值/空值固化 → 用户自定义 margins/A3/landscape/背景永久丢失、无错无 undo**。根因=CR-8.11.1-01。**这条是 LIVE tail**：任何当前 extensionless frame 一旦开+存就烤死默认。修：hydration 兜底标 frame=recovered/degraded、save 拒用默认覆盖真 extension；或读前先 repair extension | ☑ 8.11.12 Stage1：043 repair 修历史语料 + recovered/degraded 标记随 043 写入的行保留（load-save 存活已测）；**采 spec 的 option(a)——一次性 migration，未建 runtime 读时标记**（marker 仅存于 043 写的行，read-time LEFT-JOIN 兜底仍退默认无标记）。post-043 危险态经通用 save/delete **不可再生**（亲验 canvasObjects.ts:1700-1710 硬拒 page_frame）→ 功能闭环；防御纵深残尾见 §8.11.12 CR-8.11.12-01 |
| **CR-8.11.3.1-02** | 🟡 MED | improve（测试缺口） | v2CanvasPersistenceCutover.test.ts:538-577 | 8.11.3.1 回归测试**不复现根因、只断言可恢复字段**：存单 frame→手删 extension→只断言 length/primaryFrameId/x/width；不复现跨 note 共享 frame_id 的 OR REPLACE 碰撞，也从不断言 typography/pageSize/background/contentInset 丢失 → **测试通过而腐败仍在**。修：加双 note 共享 'primary-page-frame' 经 035 backfill 的测试(今会失败、暴露塌缩) + recovery 测试断言 contentInset/pageSize 保留或显式标 recovered | ◐ 8.11.12 Stage1：双 note 塌缩 fixture ✔（真复现 035 OR REPLACE、修前 fail）；**但 handoff 指名要扩的 read-time 测试 test:580-620 未扩**——仍只断言 length/primaryFrameId/x/width，read-time-fallback 的 style-loss 断言缺口存活（亲验 2026-07-02）→ 见 §8.11.12 CR-8.11.12-02 |

---

## ✅ 8.11 object-family 审查已收口（2026-06-30）
> 8.11.1.2/.1.3 → 8.11.3 → 8.11.4 → 8.11.5 → 8.11.6 → 8.11.7 → 8.11.8 → 8.11.9 全部审完。**下一步等 Henry 发话：8.11 收口后照本册一版一版烧单。** 若 Codex 续落 8.11.10+/新版本，再增审查段。

---

## V2.BN.8.11.12 — Highrisk Burndown Stage 1 验证残尾（Claude 对抗核查 2026-07-02）

> **背景**：8.11.12 是第 1 份高危 burn-down handoff 的执行结果（Codex 落地），修 4 HIGH + 2 连续项。Claude 5 维对抗核查（含实跑 cutover 34/34、model-contract 55 groups、server test:v2 **163/163**、runtime-boundary 156，及"禁用过滤看测试是否真 fail"活探）。**结论：4 HIGH 在今可达路径上真修，B2 那颗最危险的 NULL 陷阱 Codex 躲过了（COALESCE 兜底）。** 但留下 1 颗**新坑**（由 B3 liveness 过滤引入）+ 4 条 spec-deviation/测试缺口——都是**残尾非阻断**（危险态今不可达），作 Stage-2 烧单。
> **过度声称校正**：CR-8.11.3.1-02 已从 ☑ 降 ◐（指名要扩的 read-time 测试未扩）；CR-8.11.3.1-01 ☑ 保留但标注"仅 migration、无 runtime 守卫"。

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| **CR-8.11.12-01** | 🟡 MED | 新坑（由 B3 引入·可恢复） | canvasObjects.ts:1440 / notes.ts:253 / noteBlocks.ts:107-115 | **trash 掉 block-backed shape 的 backing 块 → 整个用户画的图形消失**：B3 liveness 过滤按 `co.backing='note_block'` 筛，**连 block-backed shape/sticky 一起罩**（不只 paragraph_block_projection）。backing 块**可独立 trash**：GET /notes/:id/blocks **不过滤** render_scope、backing 块仍现身线性块列表，DELETE /note-blocks/:id 无守卫直接 trash → 图形+placement+mount 从画布/AI 快照整体消失。**修前**图形留着（死文本 mount）、**修后**整体消失——图形视觉身份被和文本 backing liveness 混为一谈。〔缓解（已验）：正常 demote 先写 backing='none' 再 trash 块→不撞过滤；shape delete 本就硬删；read-derived、块 restore 即自愈→**可恢复非数据丢失**。Codex 测试 test:1450 把"消失"编码为 intended〕**需 Henry 定语义**：(a) 守 DELETE/PUT-status on render_scope=canvas_object_backing 块；或 (b) GET blocks 过滤掉 backing 块；或 (c) liveness 过滤收窄到 kind='paragraph_block_projection'、shape 只藏 mount/text | ☑ 8.11.13：Henry 裁定走 C1+C2；写侧按 live shape ownership 守卫，读侧 block-backed shape 死 backing 时保留 geometry、只卸 mount |
| **CR-8.11.12-02** | 🟡 MED | spec-deviation（测试缺口） | v2CanvasPersistenceCutover.test.ts:580-620 | **A3② 未做**：handoff 明确要求扩**这条** read-time extensionless 测试断言 contentInset/pageSize 保留或标 recovered；该测试**原样未动**、仍只断言 length/primaryFrameId/x/width（亲验）。新的 by-value 断言只落在 migration 路径的两条新测试（test:729/804）→ **纯 read-time 兜底路径仍无 style 断言、仍掩盖丢失**。修：扩 test:580 断言兜底 frame 的 contentInset/pageSize 保留或带 recovered 标记（也是 CR-8.11.12-03 的回归锁） | ☑ 8.11.13：extensionless hydration 测试扩为断言 `recovered/degraded/recovered_reason` |
| **CR-8.11.12-03** | 🟡 MED | spec-deviation（残尾·防御纵深） | canvasObjects.ts:1315-1353,1389-1397,1664-1682 | **A1 read-time 守卫未建**：extensionless frame 经 LEFT-JOIN 兜底仍退默认（inset 96/72、pageSize undefined）**无 recovered/degraded 标记**；savePageFrameCollection 无"拒用默认覆盖真 extension"守卫。修全靠一次性 043。〔post-043 该态经已知 API 不可达（saveCanvasObject/deleteCanvasObject 硬拒 page_frame、collection save 原子）→ 非阻断；但若未来 partial-restore/新 bug 令该态复发，原 HIGH live tail 无标记重演，且 client 端 pageSize=undefined 会触发 A4 preset 把 width/height/inset 拍平(pageFramePrintScaleService.ts:79-85)〕修：hydration 给 LEFT-JOIN 兜底 frame 标 recovered/degraded（read-derived、守相对不焊） | ☑ 8.11.13：`hydratePageFrameCollection` 对 missing extension read-time frame 加 `recovered/degraded/recovered_reason` marker |
| **CR-8.11.12-04** | 🟢 LOW | improve（测试正控缺失） | v2CanvasPersistenceCutover.test.ts:1412-1448 | **B2 回归只断言排除、无正控**：fixture 只含 backing 块、只断言它 absent。一个"丢 COALESCE、排除所有正常块、清空每篇 AI 快照"的灾难回归**照样通过全套**——无任何测试断言正常块 IS present in buildSnapshotFromNote。**这是全补丁最危险坑的锁**，极廉价。修：同 fixture 加 1 个正常段落块、断言它 present in snapshot.blocks | ☑ 8.11.13：projection snapshot fixture 增加正常 block 正控，锁住 absent/present 双向断言 |
| CR-8.11.12-05 | 🟢 LOW | pit（残尾·悬挂引用） | canvasObjects.ts:1446-1451 | **liveness 过滤留悬挂连接线**：visualConnectors 无条件返回，端点指向被 liveness 隐藏对象的 connector 仍进 persistence/AI 快照、端点悬空（破坏"connector 端点必存"不变量，real-delete 有 cascade 保证、trash-backing 无）。client 降级读存储点坐标、AI tree 仍点名隐藏 id → 轻度运行时/AI 不一致、块 restore 自愈。修：读时把端点在 inactiveBackingObjectIds 的 connector 降级为 point-kind 端点 | ☐ |
| CR-8.11.12-06 | 🟢 LOW | improve（marker 卫生） | pageFrameCollectionService.ts:170-176 / updatePageFrameInCollection:243-265 | **recovered marker 三宗小病**：① 复制/插入 recovered frame 会把 `recovered:true/repaired_by:'043…'` 抄到全新 frame id（伪诊断）；② 用户重新自定义 margins 后 marker 从不清除（诊断腐化成噪声）；③ marker 在 client 靠 untyped object spread 存活（PageFrameModel 无 metadata 字段）、任何 explicit-field 重建会静默抹掉、零测试信号。修：createInsertedFrame 剥 recovered 键；updatePageFrameInCollection 触碰 inset/pageSize 时清 marker；PageFrameModel 加 `metadata?` 显式承载 + client 契约测试 | ☐ |
| CR-8.11.12-07 | 🟢 LOW | improve（迁移卫生） | 043:79-186 / 175-176 | **043 legacy 路径小疵**（不阻断）：① 缺字段时把 A4/96·72 当真值烤、未标 degraded（轻违相对不焊，对比 035 存 NULL/'{}'）；② 消费 legacy blob 后**未 strip** notes.metadata（不同于 035 的 strip-after-consume）→ 留惰性双源；③ 幂等/塌缩安全/marker 一致均 PASS。修：legacy 路径存 NULL page_size + verbatim inset；strip 已消费的 blob 或注明有意留作 forensic | ☐ |

> **Stage-2 handoff 种子**：上表 CR-8.11.12-01/02/03/04 为该修项（1 MED 新坑待 Henry 语义 + 2 MED spec-deviation + 1 LOW 但极廉价的灾难锁），05/06/07 为 LOW 硬化。可与原计划的第 2 阶段 MED（demote 销毁文本 CR-8.11.4-06 / 删行列无 undo / restore 孤儿 CR-8.11.4-03 / annotation rebase）合成一份。
> **→ 已写成 `docs/agent-ops/handoffs/2026-07-02-8.11-lifecycle-burndown.md`（done，2026-07-02）**：并进 block-backed-shape 生命周期主簇。簇 C（服务端脊椎：C1 note-block 生命周期守卫 / C2 kind-aware liveness 退化 / C3 cascade）+ 簇 D（客户端：D1 demote 非破坏 / D2 re-promote 复用 / D3 空文本 auto-demote / D4 restore 剥焊）+ 簇 E（本表 CR-8.11.12-02/03/04 残尾锁）。**CR-8.11.12-01 裁决 = C1 写侧守卫（按 live shape 拥有判定，非 render_scope）+ C2 读侧退成无文本图形**。CR-8.11.12-05/06/07 + annotation/table/LOW 明确留 Stage-3。脊椎原则：backing 块身份读时从 live shape 拥有派生、render_scope 只是缓存（相对不焊绝对）。Henry 已裁定 demote UX 采用“确认后丢弃（可恢复）”。

---

## V2.BN.8.11.13 验证残尾（Claude 对抗核查 2026-07-02）

> **结论：PASS（高置信）。** Claude 亲核六块承重件（C1 live-owner 守卫 / C2 kind-aware liveness 退化 / C3 软 trash 级联 / D1 demote 确认 / D2 复用 / D4 剥焊）代码正确、三处跨修法张力（C3 软删 vs D2 复用、C1 守卫 vs demote/rollback、D4 剥焊 vs D2 重连）均解开；四套数字实跑复核对上（cutover **38** / model-contract **55** / boundary **156** / test:v2 **167**）；新测试 fail-before/pass-after 断言质量高（1532 守卫抛+demote 放行双断言、1491 图形存活、1549 软 trash+清 placement/mount、1569 剥焊+重建 placement、1467 补 E3 正控）。Codex 的 register 记账准确、无过度声称。
> **过程诚实标注**：承诺的"多 agent 对抗重跑"因 session limit 风险改为 Claude 主循环亲自对抗挖坑（非多 agent）。下列 2 颗 LOW 为亲挖所得；若要更高置信可 limit 重置后补跑多 agent cross-check。

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| CR-8.11.13-01 | 🟢 LOW（plausible·待确认） | pit（remember 机制新边） | NoteWritingSurfaceLayer.tsx:1518-1543 / shapeTextMountService.ts | **re-promote 疑似"偷回"已 restore 到正文并编辑过的块**：序列 demote（shape 记 `last_backing_block_id=B`、B 软 trash）→ 用户从回收站 restore B（D4 剥焊、B 成正文普通块、编辑）→ 对同一 shape re-add-text → D2 读 remembered B、`onRestoreBlockById(B)` 把已 active 的 B 重新焊成 shape backing、从正文流抽走。无数据丢失（B 内容留），但语义意外。窄序列。〔未逐行验 `onRestoreBlockById` 对 active 块行为，标 plausible；亦可争论为特性"你的文字回来了"〕修：re-promote 前校验 remembered 块当前无独立正文 placement / 未被 orphan-restore 剥焊；或 orphan-restore 时令 shape 侧 remembered id 失效 | ☐ |
| CR-8.11.13-02 | 🟢 LOW | improve（metadata 卫生） | canvasObjects.ts:789-795 stripCanvasBackingMetadata | **orphan restore 不剥 `canvas_lifecycle`**：strip 只清 render_scope/projection_kind/shape_object_id，保留 `canvas_lifecycle.{restorable_note_id,restore_order_index,source_canvas_object_id}` → restore 出的普通块留惰性 provenance 元数据（同 CR-8.11.12-06 marker-never-cleared 一类，无害）。修：strip 时一并清 canvas_lifecycle，或注明有意留作 provenance | ☐ |

> **不阻断收口**：两条皆 LOW、无数据丢失、窄可达；归 Stage-3 硬化。

---

## V2.BN.8.11.14 验证残尾（Claude 5 维对抗核查 2026-07-02）

> **结论：PASS（高置信）。** Codex 表格 mutation 完整性（Stage-3）落地，**5 维全 PASS、零 blocker/high/medium**。头号干扰点（structuredMutation 必须在 undo/redo 两函数里都置于 trashedBlock 兜底前）**处理正确**，且他把 undo/redo 抽成 historyService.ts 两个可测纯函数（比 spec 建议更好）。persistStructuredObject 真接进 persistCanvasObject 保存路径（非空接口）。四套数字**实跑复核对上**：model-contract 57 / boundary 159 / test:v2 167；**两条承重验收有真 fail-before/pass-after 锁**（破坏 deleteColumn 重编号→契约 fail；删 undo 分支→连编译都过不了）。CR-8.11.8-01/02/03/04 已由 Codex 标 ☑ 8.11.14、措辞准确。
> **过程观察（供 Henry）**：整批 8.11.x 改动仍**未提交**（working-tree only），且 smoke 首跑因 stale `.codex-tmp` 增量构建 flaky-fail、二/三跑才过——收口 commit 时须**干净构建跑 CI**，别让 flaky 首跑掩盖真回归。

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| CR-8.11.14-01 | 🟢 LOW（plausible） | pit | NoteWritingSurfaceLayer.tsx:2937 / persistTableMutationPayload no-op guard | **no-op/1×1-floor 删除留假 undo 项**：`before` 取的是**未 normalize** 的 payload、`after` 是 normalize 过的 → no-op 守卫 `JSON.stringify(before)===JSON.stringify(after)` 可能判为"变了" → 对一个啥都没删的 floor-blocked 删除产生**多余 persist + 多余 history 项**（Ctrl+Z 撤一个空操作）。修：守卫里比 `normalizeTablePayload(before)` vs after，或 before 也取 normalized | ☐ |
| CR-8.11.14-02 | 🟢 LOW（plausible） | pit | NoteWritingSurfaceLayer.tsx:3000 handleTableCellTextCommit / TableObjectLayer.tsx:106-113,240-249 | **程序化 commit 后冗余双 commit**：programmatic commit 先 `setEditingTableCell(null)` 再 persist；卸载 focused textarea 触发 native blur → commitEditingCell 闭包仍见 editingCell truthy + cancelledEditRef=false → **同值第二次 commit**（幂等无害、但多一次 persist）。修：committedRef 守卫防重入 | ☐ |
| CR-8.11.14-03 | 🟢 LOW | improve | usePlacementHistory.ts:58-69 | **undo 栈按引用存 before/after、非深快照**：今安全（所有表格 mutation 路径 immutable、normalize 出新对象），但依赖未强制的 immutability 不变量——未来任何 in-place cell 编辑（如性能优化）会静默腐化已入栈快照。修：capture 时 deep-clone，或在 push 处注明不变量 | ☐ |
| CR-8.11.14-04 | 🟢 LOW | test-gap | canvasRuntimeBoundaryCheck.mjs:1062-1148 / 无 call-site 单测 | **T2/T4/确认 floor 只字符串存在锁、无行为测试**：boundary check 只 assertContainsAll 源码子串（cancelledEditRef / onBlur / pendingEdit 等），逻辑回归（改行为但留标识符）测不出；call-site 谓词（tableRowHasText/columnHasText/confirm 门）零单测。修：抽 rowHasText/columnHasText 成纯 helper + 按值单测；加 commitEditingCell 的 Escape-vs-blur 行为测试 | ☐ |

> **不阻断收口**：四条皆 LOW、无数据丢失；01/02 是 plausible 小瑕、04 是测试硬化。归 Stage-3 尾/硬化扫。

---

## V2.BN.8.11.15 验证残尾（Claude 5 维对抗核查 2026-07-02）· 🩹 修正已落、红线已封、留 1 HIGH 残留

> **【修正后更新 2026-07-02】红线 BLOCKER 已真封死（亲验 + 活探确认）。** Codex 修正单（`2026-07-02-8.11-annotation-truth-fix.md`）落地：写侧 `stringifyJson(stripDerivedAnchorMetadata(range.metadata))`(annotationTruths.ts:460) + 读侧先剥后重算(:249) + helper(:65-69)。**双向权威、durable 永不含 anchor_*、每读重算。** 4 维复核：red-line round-trip 真复活、消费者覆盖(highlight/badge/marker/preview/ContentGroup Rail/drag/ReadingInterpretation-AI)、overlap 存 pre_edit_offsets provenance——**全 PASS**；**活探证实红线锁真 fail-before**（去掉写剥→红线测试 fail；恢复→cutover 42/42、test:v2 171、model-contract 57）。CR-8.11.15-01/03/04 ✅ 真修（见下）。**但对抗第 4 维挖出新 HIGH 残留 CR-8.11.15-07（同族·null-offset 漏渲染）+ MED/LOW 若干。**
>
> **【原始结论·存档】CONCERN——1 BLOCKER 红线数据丢失（亲验确认），Stage-4 不能算 done。** 簇 1（backfill 纯 INSERT+预扫+单事务·CR-8.11.1-02）、簇 2（服务端规范化闸 parent 真相+repair-not-reject+幂等·CR-8.11.1-04）**真 PASS**；"块软删不删 range 行"也守住了。**但簇 3 的读时失效机制本身破了**：pending advisory 被烤进读 DTO + 保存 verbatim 持久化 + 健康块不 strip → 相对不焊被违、红线重现。四套数字实跑对上（cutover 40/model-contract 57/test:v2 169/boundary 159），**但红线零测试锁**——活探证实（把 trash 分支改成返回裸 metadata，40/40 仍全过）。**待 Codex 修方可收口**；CR-8.11.1-03 已从 ☑ 降 ◐。

| ID | 严重 | 类别 | 部位 | 问题 | 状态 |
|---|---|---|---|---|---|
| **CR-8.11.15-01** | 🔴 **BLOCKER** | pit（红线·相对不焊） | annotationTruths.ts:238-275 deriveRangeMetadata / :299 hydrate / :453 persist | **读时 pending 被焊死→trash/restore 后高亮永久消失（亲验）**：`deriveRangeMetadata` 对 trashed/OOB 块返回 `{...metadata, anchor_status:'pending'}`；`hydrateAnnotationTruth`(299) 把它塞进读 DTO 的 range.metadata；`replaceNoteAnnotationTruths`(453) 下次保存 **verbatim 持久化** pending 进 annotation_ranges.metadata；健康块 deriveRangeMetadata(274) **原样返回、不 strip**。环：trash 块→读一次→任何标注保存→pending durable→restore 块→仍 pending→**高亮永不回来**（块+文本完好也没用）。这正是本 stage 要根除的红线。**修：deriveRangeMetadata 双向权威——健康+在界时 STRIP anchor_status/anchor_reason（真读时派生、每读重算不信存储）；纵深：save 前剥 anchor_* 不 durable 存。** | ☑ 修正单：写侧 460 strip + 读侧 249 先剥后重算 + helper 65-69；**活探证实红线锁 fail-before**（去写剥→测试 fail）；亲验双向权威 |
| **CR-8.11.15-02** | 🟡 **HIGH** | pit（消费者漏 pending） | TextBlockProjection.tsx:269-274,283-293,957-963 | **高亮抑制了、badge/marker 没抑制**：pending range 的高亮正确不画，但同 range 的标注 badge/marker 仍渲染、且在 stale/归零 offset 上（`annotationRangesForTextUnit`/`annotationStartOffsetInTextUnit`/`unitAnnotations`/`previewFromRanges` 都不调 `annotationRangeIsPending`）。修：这些消费路径统一过 `annotationRangeIsPending`。〔并核：导出/AI 快照/搜索是否也漏 pending〕 | ◐ 修正单：**pending 消费者已全覆盖**（badge/marker/preview/ContentGroup Rail/drag/ReadingInterpretation-AI 都过 annotationRangeIsPending）；**但 null-offset range 未覆盖**（门用 !isPending 而非 isRenderable）→ 见 CR-8.11.15-07 |
| CR-8.11.15-03 | 🟡 MED | pit（无 re-anchor 路径） | rangeRebaseService.ts:176-183 | overlap 失效**永久 null offset**（连"正常编辑只是重叠 range"也是）→ 叠加 -01 的烤死，被合法编辑穿过的 range **永不能重锚**。修：留 re-anchor 路径（存 pre-edit offset 进 metadata advisory + 保 range_text_cache），别一刀永久 null | ☑ 修正单：overlap 存 pre_edit_offsets + range_text_cache（provenance 可 durable）；自动 re-anchor 引擎留后续 |
| **CR-8.11.15-04** | 🟡 **HIGH** | test-gap | v2CanvasPersistenceCutover.test.ts | **红线 round-trip 零测试锁**：trash→pending 不删→restore→复活，**无任何测试**；活探把 trash 分支改坏 40/40 仍过。另：offset_out_of_bounds pending 未测；dup-id 断言未含两 note id；服务端闸缺 rows-not-dropped 计数断言；幂等正控只比 parent/child triple 不含 range metadata（正好漏掉 -01 的脏写）。修：补红线往返测试（含 -01 的 save-between-trash-and-restore 才暴露）+ 上述断言 | ☑ 修正单：红线 round-trip 测试(含 save-between) + OOB + dup-id 两 id + row-count；**活探证实 fail-before**。残：读侧 strip 未独立测（预污染 DB 场景）→ CR-8.11.15-09 |
| CR-8.11.15-05 | 🟢 LOW | spec-deviation | annotationTruths.ts:194-204 | **跨 note parent 静默清空**：Codex 采"严格 intra-note"。~~需 Henry 确认~~ | ✗ 确认安全·不需改（Explore 亲扫 2026-07-02）：**跨 note 层级不可能存在**——① 存储按 note（annotation_truths.note_id、legacy blob 每 note 一份）；② 创建 UI 永远单 note、无跨 note 选 parent 的入口（annotationTruthService.ts:87-114 baked note_id）；③ 036 dedup 保证每 id 归一 note（跨 note 撞即 throw）；④ 无 clone/import 搬层级。静默清空只会命中损坏/异常、绝不误删合法关系。可选纵深：加一条清跨 note 时的 log（非必须） |
| CR-8.11.15-06 | 🟢 LOW | pit（诊断质量） | 036:129-137 | 预扫漏空/合成 id 的跨 note 碰撞（落成裸 SQLite UNIQUE 错、非友好 throw）；intra-note 重复 id 的报错把同一 note 名两次。**安全/红线不破**（都在单事务里 throw-abort、可重跑），仅诊断质量。修：按解析后的合成 id 预扫 + `existingNoteId===note.id` 区分 intra/cross 消息 | ☐ |
| **CR-8.11.15-07** | 🟡 **HIGH**（NEW·修正核查挖出） | pit（同 -02 家族·渲染污染+AI） | annotationDisplayService.ts:51-62 / TextBlockProjection.tsx 消费者 / NoteWritingSurfaceLayer.tsx:2305-2311 copy / AnnotationInspectorPanel.tsx:288-292 | **overlap 失效的 null-offset range（健康块、非 pending）漏进消费者、画在坐标 0 + 喂 stale 文本**：`deriveRangeMetadata` 只对 offset 是 number 的越界才标 pending（:264-265），overlap 后 offset=null 的 range 在健康块上**非 pending**；而 F2 消费者门用 `!annotationRangeIsPending`（只看 anchor_status）**放过它** → badge/marker/hit-test/preview/AI 投影用 null(→0) offset + range_text_cache stale 渲染。**正是 -02 要封的"画在错位/喂 stale 给 AI"的另一触发。** 亲验：`annotationRangeIsRenderable`(:56-62) **已正确排除 null-offset**，但消费者没用它。修：badge/marker/preview/hit-test/AI 消费门从 `!annotationRangeIsPending` **换成 `annotationRangeIsRenderable`**；copy action + inspector 也过（inspector 不隐藏、标"未锚定"以便重锚） | ☑ fix-2：消费门**全换 `isRenderable`**（全树 grep 零 `!isPending` 残留）；inspector 显示+`Needs review` 不隐藏；**活探证实无过度抑制**（数字 offset 要求只作用 text_span、其它 5 kind 放行、正控有效 range 照渲） |
| CR-8.11.15-08 | 🟡 MED（defused） | pit（写路径不对称） | 036_v2_annotation_truths.ts:216 | **036 backfill 持久化 range.metadata 不 strip anchor_***（对比服务端 :460 strip）→ legacy blob 若带焊死的 anchor_status，cutover 时 durable 烤入。**已被读侧 :249 每读重算 defuse（健康块必读净），非红线**；仅"durable at-rest 不干净"。修：036:216 也 `stripDerivedAnchorMetadata` 求对称 | ☑ fix-2：036 也 strip 对称 |
| CR-8.11.15-09 | 🟢 LOW | test-gap | v2CanvasPersistenceCutover.test.ts | **读侧 strip 未独立测**：活探把 :249 读剥去掉 42/42 仍过（写剥使 durable 恒净、无场景 seed 预污染行）→ 兼容"存量已污染 DB"的目的没锁。另：range.metadata 幂等未作专门断言（隐含在红线/OOB 测里）。修：直接 INSERT 一条 metadata 已含 anchor_status 的 healthy 块 range → 断言读出不 pending | ☑ fix-2：读侧 strip 锁 + null-offset 拒渲染测 + 有效 offset 正控 |
| CR-8.11.15-10 | 🟢 LOW | improve（fix-2 核查·残） | contentGroupService.ts:981-1008 / NoteWritingSurfaceLayer.tsx:2308-2314 copy | fix-2 后两处小残（皆不漏）：① `resolveRangePreviewFromBlocks` 对 null-offset 靠 `slice(0,0)=''` 偶然不漏、非显式 gate（建议加 `if text_span && !isRenderable return null` 显式化）；② copy handler 正确 filter 但无专属回归锁（复用 drag 的锁、风险低）。均纵深/测试，非泄漏 | ☐ |

> **收口判断【fix-2 后·终】**：**Stage-4 整个收口、对抗核查全 PASS。** CR-8.11.15-01 红线双向 strip 封死（活探 fail-before）；-07 消费门全换 `isRenderable`、**无过度抑制**（数字 offset 只约束 text_span、其它 kind 放行、正控有效 range 照渲）、inspector 显示+needs-review 不隐藏；-02/03/04/08/09 ✅；-05 确认跨 note 不可能存在（✗ 不需改）。四套数字 fix-2 后：cutover 43 / model-contract 57 / boundary 159 / test:v2 172。残 LOW：-06（诊断质量）、-10（两处纵深/测试）。**burn-down 第一单未一次通过 → 经修正单 + 续修单收口——对抗核查全程三轮各兑现价值**：①红线（40/40 绿测漏）②null-offset 残留（覆盖维自判 PASS·纯对抗维挖出）③收尾确认无过度抑制反向红线。
> **⚠ 跨 stage 反复出现的过程风险（供收口 commit）**：smoke（canvas-engine-model-contract）依赖 `.codex-tmp` 增量 tsc，stale 构建会 **假 fail 或掩盖真 fail**（Stage-3 CR-8.11.14 + 本轮均撞）——**收口 commit 必须干净构建跑 CI**（清 `.codex-tmp` 或用可靠 incremental），别让 stale 产物掩盖回归。

## 排查时的建议优先级（8.11 收口后）

> **⚠ 更新 2026-07-04（Claude 逐行复核）**：下方 §0/§1/§2 的 🔴 HIGH 红线簇**已被 8.11.12–14 burndown 全部清掉**。本清单是 burndown *之前* 写的、**已过时**，仅留作历史脉络。**当前实况：0 个 open 🔴**（`🔴.*☐` 零匹配 + 逐行复核每颗 🔴 皆 ☑）。已修清单：CR-8.11.1-01 ☑(043 repair) · CR-8.11.3.1-01 ☑(save 硬拒 page_frame·功能闭环) · CR-8.11.3-01 ☑(kind 过滤+client 回归) · CR-8.11.4-01 ☑(server snapshot 过滤 backing) · CR-8.11.1-05 ☑(read-time liveness 过滤) · CR-8.11.4-06 ☑ + CR-8.11.4-03 ☑(8.11.13) · CR-8.11.8-01 ☑(8.11.14 structured-mutation undo+确认)。**当前 open ≈ 19 MED + 63 LOW，全为 🅱 友好性/硬化/feature-gap/测试缺口 —— foundation 期正确 defer**；唯一成群的实质待办是 §3 导出族（待 export 管线建起一并做）。残尾 test-gap：CR-8.11.12-02（page_frame read-time style-loss 断言未扩）、CR-8.11.3.1-02（◐）。

0. **🔴 数据丢失·真 HIGH（最紧，因仍 live + 不可逆 + 直撞"心爱之物不可凭空消失"）**：**CR-8.11.1-01（035 page_frame 塌缩）+ CR-8.11.3.1-01（8.11.3.1 mask + re-save 永久化）**——两者同根。先修 **live tail**（hydration 标 recovered + save 拒默认覆盖），再 ship **repair migration**（从 placement+残留 legacy 重建 note-scoped extension）。次级 CR-8.11.1-02（annotation backfill 碰撞·窄）。
1. **🔴 AI 层双源/泄漏 HIGH（Agent 时代前必清）**：CR-8.11.3-01（双真相源，已溯源到 8.11.1.1 身份方案）+ CR-8.11.4-01（隐藏块泄 AI）+ CR-8.11.1-05（trash-block 孤儿 ghost 漏进 AI 快照，同族）。
2. **数据丢失·产品红线**（"Agent 能编辑的人也能编辑 / 心爱之物不可凭空消失"）：CR-8.11.4-06（demote 销毁文本）、**CR-8.11.8-01（删行列不可逆毁数据、无 undo）**、CR-8.11.4-03（restore 孤儿·铁律）。on-grammar 修：把这些销毁动作纳入 Ctrl+Z / 加确认 / 留可恢复态。
3. **"静默死路"成熟墙群**（真用户旅程会撞、且跨版本同模式）：
   - **导出族**（一次性统一补，别逐版打补丁）：CR-8.11.4-07 + CR-8.11.7-03 + CR-8.11.8-05（形/图/表不进导出）+ **CR-8.11.9-02（hide-from-export 假控件 no-op）——待 export 管线建起一并解决**。
   - **失败/死路无反馈**：CR-8.11.7-04（上传失败）、CR-8.11.5-02（apply-sticky 吞）、CR-8.11.6-01（连接草稿孤立）、CR-8.11.4-08（空文本残留）、CR-8.11.8-02/-04（cell 编辑 Esc/draft 丢）、**CR-8.11.9-01（open_original→ghost 块·铁律族）**、各版"可发现性"。
4. **资源生命周期/GC**：CR-8.11.7-01（asset 孤儿，**8.11.9 放大 → refcount 强制**）+ CR-8.11.7-02（上传零引用孤儿）、CR-8.11.4-02（孤儿 placement）。
5. **架构一致性**：CR-8.11.9-03（delete 绕过"唯一边界"→ 补全单一 availability 投影）、CR-8.11.9-04（inspector 半闭环·补 asset-detail）。
6. 其余 MED（CR-8.11.5-01/03/04、CR-8.11.6-02 等）+ LOW（含 CR-8.11.9-06 相对不焊重载枚举·结构）凑批。
## Codex Follow-up Result - V2.BN.8.11.15 AnnotationTruth Fix (2026-07-02)

Source: `docs/agent-ops/handoffs/2026-07-02-8.11-annotation-truth-fix.md`

Result:

- `CR-8.11.1-03`: Stage-4 redline scope is fixed. Pending AnnotationTruth state is now read-time derived, not durable truth; overlap invalidation also keeps re-anchor provenance.
- `CR-8.11.15-01`: fixed. `anchor_status` / `anchor_reason` are stripped on write and recomputed on read.
- `CR-8.11.15-02`: fixed for current consumers. Pending ranges no longer create badges, markers, previews, ContentGroup Rail text, drag text, or ReadingInterpretation / AI-readable annotation projection text.
- `CR-8.11.15-03`: fixed for provenance preservation. Overlap invalidation keeps `pre_edit_offsets` and `range_text_cache`; automatic re-anchor remains future work.
- `CR-8.11.15-04`: fixed. Added redline server tests plus client model-contract checks for pending filtering and re-anchor provenance.
- `CR-8.11.15-05`: remains a Henry / legacy-data judgment about cross-note annotation parent hierarchy.
- `CR-8.11.15-06`: remains low-priority diagnostic hardening for synthesized legacy ids.

Validation:

- `node --import tsx --test src/__tests__/v2CanvasPersistenceCutover.test.ts` passed: 42 / 42.
- `npm run smoke:canvas-engine-model-contract` passed: 57 groups.
- `npm run check:canvas-runtime-boundary` passed: 159 checks.
- `cd server; npm run test:v2` passed: 171 / 171 tests.
- `git diff --check` passed with Windows line-ending warnings only.
- `npm run verify:v2-bn8-runtime` passed, including client/server build, performance smoke, whitespace check, and changed-file secret scan.

## Codex Follow-up Result - V2.BN.8.11.15 AnnotationTruth Fix 2 (2026-07-02)

Source: `docs/agent-ops/handoffs/2026-07-02-8.11-annotation-truth-fix-2.md`

Result:

- `CR-8.11.15-07`: fixed. Annotation text-span consumers now use `annotationRangeIsRenderable`, so null-offset ranges no longer enter badge, marker hit-test, highlight, ContentGroup preview, drag text, annotation-copy text, or ReadingInterpretation / AI-readable projection paths. The Inspector remains the repair surface and shows these ranges as `Needs review`.
- `CR-8.11.15-08`: fixed. Migration `036_v2_annotation_truths` strips derived `anchor_status` / `anchor_reason` before durable insert, matching the service write/read boundary.
- `CR-8.11.15-09`: fixed. Regression coverage now includes read-side stripping of stale durable anchor metadata, legacy migration stripping, and null-offset renderability locks in the model contract.
- `CR-8.11.1-03`: remains complete.
- `CR-8.11.15-05` and `CR-8.11.15-06`: unchanged; they are not part of this follow-up.

Validation:

- `node --import tsx --test src/__tests__/v2CanvasPersistenceCutover.test.ts` passed: 43 / 43.
- `npm run smoke:canvas-engine-model-contract` passed: 57 groups.
- `npm run check:canvas-runtime-boundary` passed: 159 checks.
- `cd server; npm run test:v2` passed: 172 / 172 tests.
- `git diff --check` passed with Windows line-ending warnings only.
- `npm run verify:v2-bn8-runtime` passed, including client/server build, performance smoke, whitespace check, and changed-file secret scan.

## Codex Follow-up Result - V2.BN.8.11.16 Image Asset Lifecycle Burndown (2026-07-02)

Source: `docs/agent-ops/handoffs/2026-07-02-8.11-image-asset-lifecycle-burndown.md`

Result:

- `CR-8.11.7-01`: fixed for image object delete lifecycle. Deleting the final image object reference now releases the `canvas_assets` row and best-effort unlinks the real local blob file.
- `CR-8.11.9-05`: fixed. Image duplicate remains shared-asset by design, and the server cleanup path counts live image references before deleting the asset.
- `CR-8.11.7-02`: still open. Zero-reference upload orphan sweep was not implemented in this patch; the release/unlink primitive now exists for a follow-up sweep.
- `CR-8.11.7-04`: still open. Upload failure toast / friendly error feedback remains deferred to the failure-feedback pass.

Validation:

- RED confirmed first: `node --import tsx --test src/__tests__/v2CanvasPersistenceCutover.test.ts` failed on asset row remaining after image delete and shared asset final-delete cleanup.
- `node --import tsx --test src/__tests__/v2CanvasPersistenceCutover.test.ts` passed: 44 / 44.
- `npm run smoke:canvas-engine-model-contract` passed: 57 groups.
- `npm run check:canvas-runtime-boundary` passed: 159 checks.
- `cd server; npm run test:v2` passed: 173 / 173 tests.
- `npm run verify:v2-bn8-runtime` passed, including client/server build, performance smoke, `git diff --check`, and changed-file secret scan.

### Claude 对抗验证残留 — V2.BN.8.11.16 (2026-07-03，4-agent adversarial + 亲验)

> **结论：核心修复 PASS（扎实、测试对抗锁牢），但对抗维挖出一条我自己 handoff 错判的当前泄漏。**
> **核心亲验通过**：`releaseAssetReference`(canvasAssets.ts:179-221) exclude-self、**user-scoped**(无 note_id 谓词，带注释)、remaining>0 不删、归零删行 + best-effort unlink(吞 ENOENT、绝不 throw 挂事务)。image `cleanupOnDelete`(canvasObjects.ts:1344-1356) 在 canvas_objects DELETE(1961) **之前**触发(1950)，先删 self-extension(1351-1354) 再 release(传 self 作 excludeObjectId) → self 行既物理删又排除，sole-ref 归零 GC、shared duplicate 保活到末删。migration 041:38 RESTRICT 永不触发(canvas_assets 是 SET NULL 非 DELETE)。duplicate 建**独立第二 extension 行**(041:33 object_id PK + upsert ON CONFLICT(object_id))→ refcount 看得到 2，删一存删尽释。
> **测试对抗锁真**：单引用删是**非空跑真 blob 正控**(seed writeBlob 真写 33 bytes、删前 existsSync=true 删后=false、路径与生产 unlink 对齐)；duplicate 负控真(删一存删尽释)。**活探**：把 release 变 no-op / 破 exclude-self → cutover 双双转红(42/2)，还原 44/44 零残差 diff。四 suite 实跑绿：cutover 44、test:v2 173、model-contract 57、boundary 159。

| CR | 级别 | 类型 | 位置 | 描述 | 状态 |
|----|------|------|------|------|------|
| **CR-8.11.16-01** | 🟡 MED | pit（**CONFIRMED 当前泄漏**） | routes/courses.ts:164 + migration 041:11-12 vs 35-36 | **删课程 = image 资产孤儿（当前泄漏，非未来 gap）。** `DELETE FROM courses` 是 live、auth-guarded 硬删靠 FK 级联。`image_object_extensions.course_id/note_id` 是 **CASCADE**(扩展行随删)，但 `canvas_assets.course_id/origin_note_id` 只 **SET NULL** → canvas_assets 行 + 磁盘 blob **永久孤儿**(扩展行没了 → 再无引用可 GC)；`cleanupOnDelete` **只在 deleteCanvasObject 跑、FK 级联不触发**(foreign_keys=ON)。**⚠ 这打脸我写的 handoff**(2026-07-02-8.11-image-asset-lifecycle-burndown 只 grep notes 软删 + 缺失 user 路由，漏了 courses 级联，错判成"未来 gap 非当前泄漏")；patch note 的 deferred「no note/user bulk teardown」亦未点名 courses、未标 active。**非红线**(是资源泄漏/磁盘膨胀，非"心爱之物消失"——课程连同内容是用户主动删的，只是清理不全)。修：course 删路径接一个复用 `releaseAssetReference` 的 refcount 资产 teardown（先删 self-ext 再 release、跑在 cascade 之前、user-scoped 守跨 course 共享）。**修复 handoff 已写**：`docs/agent-ops/handoffs/2026-07-03-8.11-course-asset-teardown.md`（draft，含 -02/-03/-04 顺带小修，待 Henry 翻牌 ready）。 | ☑ 8.11.17; closeout 454f7c9 |
| CR-8.11.16-02 | 🟢 LOW | pit/seam（PLAUSIBLE） | canvasObjects.ts:1187-1196 | **原地换 asset 静默漏旧引用（潜伏 under-release）。** `upsertImageObjectExtension` ON CONFLICT(object_id) DO UPDATE SET asset_id 若同一 object 被重存成不同 asset_id，旧 asset_id 被覆盖而**不调 release** → 旧 asset+blob 孤儿(若无他引)。今**无 live client flow 触发**(client 每次上传新 objectId)。修：将来若加"原地替换图"必须走 release；今补注释锁死"每图新 objectId"假设。 | ☑ 8.11.17; closeout 454f7c9 |
| CR-8.11.16-03 | 🟢 LOW | test-hygiene（CONFIRMED） | server/src/__tests__/v2CanvasPersistenceCutover.test.ts | **承重红线测试文件 untracked。** `git status` 报 `??`、`git ls-files --error-unmatch` 失败，但已挂进 `test:v2`(server/package.json)。本地 173/173 绿，但 fresh checkout / CI clone **没有此文件** → GC 红线覆盖不随代码走。8.11 收口 commit 前必须 `git add`。 | ☑ closeout 454f7c9 tracked |
| CR-8.11.16-04 | 🟢 LOW | test-hygiene（PLAUSIBLE） | v2CanvasPersistenceCutover.test.ts:27 + 共享 blob 目录 | **测试路径不镜像生产 env-aware 解析 + 共享盘目录状态敏感。** 测试硬编 `CANVAS_ASSET_DIR=join(cwd,'uploads','canvas-assets')`，生产读 `process.env.CANVAS_ASSET_DIR || join(...)`；若该 env 被设，正控会静默解耦(seed 与 unlink 打不同目录、existsSync=false 空跑通过)。且共享盘目录 + existsSync 使 image 测试对顺序/残留敏感(back-to-back 整档跑观测到一次瞬时 'fail 2'，隔离跑稳定)。修：测试读同一 env-aware 解析(或 setup 里 delete 该 env) + per-test 临时目录/beforeEach 清盘。 | ☑ 8.11.17; closeout 454f7c9 |

## Codex Follow-up Result - V2.BN.8.11.17 Course Asset Teardown (2026-07-03)

Source: `docs/agent-ops/handoffs/2026-07-03-8.11-course-asset-teardown.md`

Result:

- `CR-8.11.16-01`: fixed. Course hard delete now releases course image assets before FK cascade removes image extension rows. The fix reuses `releaseAssetReference` and preserves user-scoped shared-asset refcount semantics.
- `CR-8.11.16-02`: fixed as a seam guard. `upsertImageObjectExtension` now documents that any future in-place image replacement must release the previous asset first.
- `CR-8.11.16-03`: fixed for this patch. The teardown redline test file is staged together with the implementation files.
- `CR-8.11.16-04`: fixed for env-aware path resolution in the test helper; per-test blob cleanup still uses the unique test user id directory.
- `CR-8.11.7-02`: still deferred. Zero-reference upload orphan sweep was not part of this patch.
- `CR-8.11.7-04`: still deferred. Upload failure toast / friendly feedback was not part of this patch.

Validation:

- RED confirmed first: `node --import tsx --test --test-name-pattern "Course delete" src/__tests__/v2CanvasPersistenceCutover.test.ts` failed on `canvas_assets` rows remaining after course delete.
- GREEN: `node --import tsx --test --test-name-pattern "Course delete" src/__tests__/v2CanvasPersistenceCutover.test.ts` passed: 3 / 3.
- `node --import tsx --test src/__tests__/v2CanvasPersistenceCutover.test.ts` passed: 47 / 47.
- `cd server; npm run test:v2` passed: 176 / 176 tests.
- `npm run verify:v2-bn8-runtime` passed, including runtime boundary, model contract, client/server build, performance smoke, `git diff --check`, and changed-file secret scan.

> **对抗清白项(CONFIRMED 安全)**：over-release 无(唯一 caller 传对 excludeObjectId、无 asset-delete/replace 路由)；path-traversal 无(storage_key 全服务端生成 `userId/uuid.ext`、扩展名白名单)；txn 安全(unlink 在 DB 事务外、best-effort、绝不回滚删除)；CR-8.11.7-02(零引用上传孤儿)确认**明确挂账 deferred**、unlink 原语已就位。第二删路径 `savePageFrameCollection:1722` 只删 page_frame(非 asset-backed)、主删路径清 connector/annotation/CG-member 引用 —— 均对图片资产无泄漏。

## Codex Closeout Result - V2.BN.8.11 (2026-07-05)

Closeout commit: `454f7c9` (`feat: land v2 bn canvas engine through 8.11`).

Clean-build evidence:

- Cleared `.codex-tmp/canvas-engine-contract` and `.codex-tmp/canvas-engine-performance` before the final verification run.
- `server/src/__tests__/v2CanvasPersistenceCutover.test.ts` is now tracked in the closeout commit.
- No untracked files remain under `client/` or `server/` after staging the closeout source/test set.

Validation:

- `cd server; npm run test:v2` passed: 176 / 176.
- `npm run smoke:canvas-engine-model-contract` passed: 57 groups.
- `npm run check:canvas-runtime-boundary` passed: 159 checks.
- `cd server; node --import tsx --test src/__tests__/v2CanvasPersistenceCutover.test.ts` passed: 47 / 47.
- `npm run verify:v2-bn8-runtime` passed, including runtime boundary, model contract, client/server build, performance smoke, `git diff --check`, and changed-file secret scan.
