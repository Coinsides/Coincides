> **状态 (Status)**: active(c-0 前置核实;**读码不写码**,产品零改动)
> **层 (Layer)**: 分析 / Analysis(12.2c c-0)
> **日期 (Updated)**: 2026-08-24
> **权威 (Authoritative)**: 否(事实核实;结论供 Fable 在 c-2 单拍死)
> **上游**: `plans/v2-bn12-2c-selection-receipts-and-resolve.md` c-0 · 设计 v1 `2026-08-21-selection-receipt-design.md`

# c-0:`resolve_selection` 的 server 侧现实路径

**基线** `31cd00d`。**未写产品码、未碰协议文件、未动 auth。**

---

## 0. 一句话

**三元组里只有 `blockId` 有 SQL 路;`textFlowId` 是纯派生(零身份);`textUnitId` 没有查询路,必须读行解 JSON。重建当前文本可行,机械件已存在。拒绝形状建议逐条 `missing` —— 工具面已有先例且不泄露。**

---

## 1. 三元组逐个的现实路径

| 字段 | 有没有 SQL 路 | 事实 |
|---|---|---|
| **`blockId`** | ✅ **有** | `note_blocks.id`,且 **`user_id` 就在同一行**(`schema.sql:985` 区)⇒ **存在性与归属一次查询同时解决**。既有先例:`items.ts` 的 `ensureOwnedBlock` = `SELECT id FROM note_blocks WHERE id = ? AND user_id = ?` |
| **`textFlowId`** | ⭐ **不需要** | **它是纯派生**:`textFlowService.ts:16` `textFlowIdForBlock(blockId) => \`textflow-${blockId}\``。**全仓 5 个产地全部走这一个函数**(TextBlockProjection:495 · useBlockTextFlowEditController:68 · useSlashBlockRollbackController:105 · BlockEditorLayer:186 · ShapeObjectLayer:119)⇒ **零独立身份,信息量为 0** |
| **`textUnitId`** | ⛔ **没有** | **全库没有 `text_flow` / `text_unit` 表**(已逐表核)。unit 住在 `note_blocks.content_json` 这个 TEXT 列的 JSON 里 ⇒ **验存在性必须「读出该行 + 解析 JSON + 遍历 units」** |

### ⭐ 由此得到的第一条给 c-2 的事实

**「按三元组查」实际是「按 `blockId` 查一行,再在该行的 JSON 里找 unit」。**
⇒ **归属在第一步就解决了**(`user_id` 在行上),**第二步纯属内存操作,不再涉及权限**。这对 c-2 是好消息:**不存在「unit 属于另一个用户」这种情形** —— unit 的归属完全由它所在的 block 决定。

### ⚠️ 现有代码**没有任何一处**验证 unit 存在性

最接近的先例 `verifyAnchorTarget`(`items.ts`)对 `content_range` 锚只做:

```ts
if (input.target_kind === 'content_range' && !blockId) throw AppError(400, '...require range_json.block_id');
if (blockId) { ensureOwnedBlock(db, userId, blockId); ... }
```

⇒ **只验到 block 粒度,从不检查 `text_unit_id` 是否真在 content_json 里。**
⇒ c-2 的 `found / missing` 三态里,**「unit 级 missing」是全新能力**,没有现成实现可复用。

---

## 2. excerpt / 当前文本的 server 侧重建:**可行,且机械件已存在**

`server/src/services/items.ts:139`:

```ts
function textFlowProjection(body: Record<string, unknown>): string | null {
  const textFlow = recordValue(body.text_flow);
  if (!textFlow || !Array.isArray(textFlow.units)) return null;
  const units = textFlow.units
    .map((unit) => recordValue(unit))
    .filter((unit): unit is Record<string, unknown> => Boolean(unit))
    .filter((unit) => unit.status !== 'deleted' && typeof unit.text === 'string')
    .sort((left, right) => Number(left.order_index || 0) - Number(right.order_index || 0));
  return canonicalPlainText(units.map((unit) => String(unit.text)).join('\n'));
}
```

**⇒ server 已经会走 `text_flow.units[]`、滤 `status !== 'deleted'`、按 `order_index` 排序、取 `text`。**

**但它今天做的是「聚合整块」,不是「按 id 取一个 unit」**:
- 现用途 = Item body 的投影(不是 note_blocks);
- 它**不接受 unit id**,也不返回单个 unit。

⇒ **c-2 需要的是同一段解析逻辑的另一种取法**(按 `unit.id` 找一个),**不是新能力,是新取法**。
📌 **建议 c-2 明写「复用 `text_flow.units[]` 的既有解析约定(含 `status !== 'deleted'` 过滤与 `order_index` 语义)」** —— 否则两处对「什么算一个有效 unit」会各自演化,而**这类分歧不会立刻出错**(与 TD-15 `getOwnedCourse` 五份同名实现同形)。

### ⚠️ `status !== 'deleted'` 这条过滤是 `text_drifted` / `missing` 的分界所在

一个被标 `deleted` 的 unit:**行还在、JSON 里还在,但既有解析约定把它排除**。
⇒ c-2 要拍:**它算 `missing` 还是算 `text_drifted`?** 我倾向 `missing`(它已不在有效正文里),**但这是设计裁定,不是我能定的**。

---

## 3. `annotation_ranges` —— 同形状已有 server 持久化先例

`server/src/services/annotationTruths.ts` 的行类型与 INSERT(`:404`)含:

```
block_id, text_flow_id, text_unit_id, inline_structure_id,
canvas_object_id, source_region_id, start_offset, end_offset
```

⇒ **owner 三元组 + offsets 这个形状,server 侧已经存了一份**(标注真相)。
**这对 c-2 的意义**:receipt 的 `text_ranges` 不是新形状,**它与 `annotation_ranges` 同构** —— 若将来 receipt 要晋升为标注,是同构映射而非转换。

⚠️ **但 `annotation_ranges` 没有任何索引**(`grep idx_annotation_ranges` 零命中)。⇒ **不要**把它当作「按 text_unit_id 反查」的现成路;它是写入侧的记录,不是查询侧的索引。

---

## 4. 非本用户 ref 的拒绝形状:**建议逐条 `missing`;工具面已有先例,且不泄露**

### 两种形状在本仓都存在

| 形状 | 先例 | 行为 |
|---|---|---|
| **整体 4xx** | `ensureOwnedBlock` / `ensureOwnedCanvasObject`(`items.ts`) | `SELECT ... WHERE id = ? AND user_id = ?` 无行 ⇒ `throw AppError(404, 'Block not found')` |
| **逐条 outcome** | ⭐ `trashNoteAsUser`(`services/notes.ts`,**工具面正在用的那条**) | `ownedNoteOrMissing(target)` 无行 ⇒ `return { outcome: 'missing' }` |

### ⭐ 关键事实:**两种先例都已经把「非本用户」和「不存在」折叠成同一个回答**

- `ensureOwnedBlock` → 一律 `404 'Block not found'`;
- `trashNoteAsUser` → 一律 `{ outcome: 'missing' }`。

⇒ **逐条 `missing` 不泄露任何跨用户存在性** —— 因为 foreign 与 nonexistent **不可区分**。

### ⛔ 但有一条硬约束必须写进 c-2

**若设计把 `missing` 再细分出 `forbidden` / `not_owned` 之类,就会当场泄露他人对象的存在性。**
⇒ **建议 c-2 写死:foreign ⇒ `missing`,与 nonexistent 逐字节相同,⛔ 不得增设可区分的第四态。**

### 我倾向逐条,理由两条(供裁)

1. **`resolve_selection` 是只读的「报告漂移」工具**(设计 v1 ④)。**一条 ref 坏掉就整单 4xx,会让它在最需要它的场合失效** —— 收据里混着 stale/foreign ref 正是常态。
2. **工具面的既有语汇就是逐条**(`trashed`/`missing`/`skipped`),`trash_notes` 已经这么用;逐条 `found`/`missing`/`text_drifted` 与之同族。

📌 **整体 4xx 仍应保留给「入参本身坏了」**(schema 不合法、ref 数超限等),**不用于 ref 解析**。

---

## 5. 给 c-2 的四条待拍(我不自决)

| # | 待拍 | 为什么不能我定 |
|---|---|---|
| **A** | `status === 'deleted'` 的 unit ⇒ `missing` 还是 `text_drifted`? | 语义裁定 |
| **B** | 拒绝形状:逐条 `missing`(我倾向)还是整体 4xx? | 契约裁定;**但「不得增设可区分的 forbidden 态」这条是硬约束,建议无论选哪种都写死** |
| **C** | 是否在 receipt 里**保留 `textFlowId`**? | 它信息量为 0(纯派生)。保留=与 `annotation_ranges` 同构、将来晋升零转换;去掉=形状更诚实。**取舍在你** |
| **D** | 解析约定是否**显式共用**(复用 `text_flow.units[]` 的 `deleted` 过滤与 `order_index` 语义)? | 若不显式,两处会各自演化,而**分歧不会立刻出错** |

---

## 6. 按新档(P0–P3)本单略过的东西

**无。** 本单是读码核实,不产出测试,**没有因降档略过任何本来会写的测试**。
📌 c-2 拆单时的略过项(ownership 矩阵不扩等)我会按新规矩**成对记进工单的「本单按新档略过」小节 + 台账一行指针**。

---

## 7. 一条我自己的更正(留痕)

核实过程中我一度断言「**server 侧没有任何 text_flow 解析**」—— **错了**。实际 6 个 server 文件命中 `text_flow`,其中 `items.ts:139` 就是一个完整的 units 解析器。
**怎么发现的**:我用「有没有独立表」推出了「没有解析路」,**把「没有表」当成了「没有能力」**。
⇒ 记此:**schema 的缺席不等于能力的缺席** —— JSON 列里的东西没有表,但完全可能已经有成熟的解析约定。
