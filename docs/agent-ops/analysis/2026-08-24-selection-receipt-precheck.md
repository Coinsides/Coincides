> **状态 (Status)**: active(核实报告;**读码不写码**,零产品改动)
> **层 (Layer)**: 分析 / Analysis(12.2c 前置核实)
> **日期 (Updated)**: 2026-08-24
> **权威 (Authoritative)**: 否(事实核实;结论供 Fable 拍 12.2c 设计 v1)
> **回应**: `analysis/2026-08-21-selection-receipt-design.md` §7 三问 + Fable 2026-08-24 核实单

# 12.2c 前置核实报告:选区收据 §7 三问

**方法**:CodeGraph + 直读源码。**未写产品代码、未碰协议文件、未动 auth。**
**基线**:`c2db993`。

---

## Q1 — pool_scope 约束:**词汇扩展成立(零 DDL),但闸比设计稿说的多得多**

### ✅ DDL 侧:零约束,词汇扩展成立

`server/src/db/schema.sql:985` 与 `migrations/047_v2_item_relation_floor.ts:55` 一致:

```sql
pool_scope_kind TEXT,          -- ⭐ 无 CHECK、无枚举
pool_scope_id   TEXT,
...
CHECK (
  (item_id IS NOT NULL AND pool_scope_kind IS NULL AND pool_scope_id IS NULL)
  OR
  (item_id IS NULL AND pool_scope_kind IS NOT NULL AND pool_scope_id IS NOT NULL)
)
```

**唯一的 CHECK 是「已认领 XOR 池中」的互斥不变式,与取值无关。**
⇒ **加一个 `pool_scope_kind` 取值 = 纯词汇扩展,零 DDL、零 migration**(与 b-3 的 `dismissed` 同形)。**设计稿 §3 的猜测正确。**

📌 `pool_scope_id` 的校验是 `contentGroupRuntimeIdSchema = z.string().min(1).max(180)`(`validators/index.ts:416`)—— **只是通用字符串,不是 CG 专属格式**。⇒ 非 CG 的 scope id **不会**被它挡住。

### ⛔ 但设计稿说的「validator `pool_scope_kind: 'content_group'`」是单数 —— 实际有 **9 处**

| # | 位置 | 形式 | 性质 |
|---|---|---|---|
| 1 | `validators/index.ts:563` | `z.literal('content_group')`(`collectItemAnchorSchema`,且 `.strict()`) | 400 |
| 2 | `validators/index.ts:590` | `z.literal('content_group')`(`itemPoolQuerySchema`) | 400 |
| 3 | ⭐ `services/items.ts:566` | `if (input.pool_scope_kind !== 'content_group') throw AppError(400, 'Only content_group Item pools are supported in this version')` | **运行时抛出** |
| 4 | ⭐ `services/items.ts:674` | 同上,在 `castItem`(认领路径) | **运行时抛出** |
| 5 | ⭐⭐ `services/items.ts` INSERT | `VALUES (?, ?, NULL, 'content_group', ?, …)` | **SQL 字面量** |
| 6 | `services/items.ts:39` | `CollectItemAnchorInput.pool_scope_kind: 'content_group'` | TS 类型 |
| 7 | `client/.../itemRepository.ts:9` | 同上 | TS 类型 |
| 8 | `client/.../itemRepository.ts:66` | `pool_scope_kind: 'content_group'` 写死在 list 查询参数 | 硬编码实参 |
| 9 | `client/.../panels/ContentGroupPanel.tsx:191` | `'content_group' as const` | 硬编码实参 |

### ⭐⭐ 第 5 条是最危险的一条 —— 它**静默**

`collectItemAnchor` 的 INSERT **把 `pool_scope_kind` 写成了 SQL 字面量**,**入参的那个字段根本没有被用**:

```sql
) VALUES (
  ?, ?, NULL, 'content_group', ?,
```

⇒ **即便把第 1–4、6–9 全部放开,写进库的仍然是 `content_group`,而且不报错。**
**这正是「置换分则」的镜像**:参数被接受、被类型检查、被 zod 校验,**然后被忽略**。⛔ 12.2c 若只改类型与 validator,会得到一个「看起来通了、库里全是 content_group」的假绿。

### ⭐ 真正承重的耦合不是字面量,是 ownership 校验

`collectItemAnchor` 紧接着调 **`getOwnedContentGroup(db, userId, input.pool_scope_id)`** —— **ownership 是打到 `content_groups` 表的**。
`castItem` 亦然(`:678`)。

⇒ **非 CG 语境的 pool 需要回答的真问题是:「谁来验这个 scope 的归属?」** 换字面量是十分钟的事;**换 ownership 验证源是设计决定**,必须在 v1 里拍死。

### 认领(claim)机制实况

`castItem` 内:

```sql
UPDATE item_anchors
SET item_id = ?, pool_scope_kind = NULL, pool_scope_id = NULL,
    claimed_at = ?, claimed_by = ?, updated_at = ?
WHERE id = ? AND user_id = ? AND item_id IS NULL
```

⇒ **认领 = 那条 XOR 不变式的翻面**,干净。
⚠️ **但没有「裸认领」** —— 认领**只发生在 `castItem` 内部**,且该路径**必然创建一个 Item**(`insertItem` 在前)。另有 `discardPoolItemAnchor`(删除)。**没有第三条路。**

---

## Q2 — 坐标系归一:**anchorRect 是瞬时 UI 定位物,不是可持久化几何**

### 逐字段形状

```ts
// selectionRangeService.ts:9  —— ⭐ 零几何、零单位、零 frame
export type CapturedSelectionRange = {
  blockId: string; textFlowId: string; textUnitId: string;
  startOffset: number; endOffset: number; text: string;
};

// selectionDraftService.ts:16
export interface SelectionDraftRangeV1 extends CapturedSelectionRange { id: string; }

// selectionDraftService.ts:20
export interface SelectionDraftV1 {
  id: string;
  phase: 'capturing' | 'draft' | 'active';
  mode: 'replace' | 'additive';
  ranges: SelectionDraftRangeV1[];
  anchorRect: DOMRect;          // ⭐ 唯一的几何
  parentAnnotationId?: string;
  createdAt: string; updatedAt: string;
}
```

### anchorRect 产自哪:**裸 `getBoundingClientRect()`**

`client/.../blocks/TextBlockProjection.tsx:681`:

```ts
const anchorRect = textarea?.getBoundingClientRect();
if (!anchorRect) return;
onTextUnitSelection(selectionRangeForTextUnit(unit), anchorRect);
```

⇒ **手势那一刻、相对 viewport 的 CSS px。** 当时**没有**任何 frame / unit / zoom 语境被一并记录。

### 它今天被谁消费:**只有三个 UI 定位层**

`SelectionToolbarLayer` · `AnnotationContextMenuLayer` · `SelectionTypographyToolbarLayer` —— **全部用于把浮层摆在选区旁边**。
⇒ **它从来不是身份的一部分**;身份**完全**由 `CapturedSelectionRange` 的三元组 + offsets 承担,**而那部分是 frame-free 的、可持久化的**。

### 若要持久化几何,现有信息**不够**,缺四样

| 缺什么 | 为什么必需 |
|---|---|
| **单位标签** | `css_px` / `pdf_pt` / `canvas_world` 三选一,现在无标注(Source-Ladder A-5 要的正是这个) |
| **frame / 原点身份** | rect 相对 **viewport**,而 viewport 随滚动移动 ⇒ **滚一下这组数就没有意义了** |
| **zoom / scale** | canvas 侧有 `viewportTransform`(含 zoom,见 `useViewportTransformController`),但 **anchorRect 不记录它** |
| **窗口/设备语境** | 同一文档在不同窗宽下 rect 不同 |

### ⇒ 给 Fable 的建议(供拍板,非我自决)

**选区收据的身份不需要几何。** 建议 v1 二选一并写死:

- **A(推荐,零新增捕获)**:文本选区的 receipt **不含 geometry**;`refs` + `text_ranges` 已构成完整身份。几何留给「源侧圈选」(层0/层1 原件,那里天然有 pdf_pt 与页号)。
- **B**:要几何就**新捕获**:在手势点同时记录 `{unit, frame_id, zoom, origin}`,**anchorRect 本身不入库**(它是派生的、易腐的)。

⛔ **不建议**照 §1 现文「`geometry` 取 anchorRect+unit」直接落 —— 见 Q3-③。

---

## Q3 — 申报宽于实现:**逐条对抗性读,四处**

### ⛔ ③ 最严重:`geometry` 取 anchorRect+unit(§1)

> 原文:「`geometry` 取 **anchorRect+unit**」

**两处宽于实现**:
1. **「取 anchorRect」** 读起来像「那个值已经在、可直接用」。实况:它是**瞬时 viewport px**,只服务浮层定位,**滚动/缩放/改窗宽后即失效**。持久化它 = 存一个**明天就不对**的数。
2. **「+unit」** 读起来像「unit 已存在,一并取」。实况:**代码里没有任何 unit 字段**。它得**被发明**,不是被取。

⇒ 建议 v1 改写为:「几何**待定**:文本选区暂不含几何(身份已足);若需几何须新增捕获(单位/frame/zoom),**anchorRect 不作为持久化来源**。」

### ⛔ ① 次严重:「新增的是投影函数与触发时机,不是表」(§3)

**「不是表」为真**(零 DDL,已证)。**但「新增的只是投影函数与触发时机」宽于实现** —— 实际还要:
- 放开 **2 处 zod literal**、**2 处运行时抛出**、**4 处 TS/实参硬编码**;
- ⭐ **修掉 1 处 SQL 字面量**(否则静默写错值);
- ⭐⭐ **重新设计 ownership 验证源**(现在打 `content_groups` 表)—— **这是设计决定,不是机械替换**。

⇒ 建议 v1 明写这九处,并**把 ownership 那条单列为待拍问题**。

### ⚠️ ② 「三态,与既有 phase 对齐」(§2)

既有枚举**已经是三态**:`'capturing' | 'draft' | 'active'`。设计稿的三态是 `capturing → draft → receipt`。
⇒ **`receipt` 与既有的 `active` 是什么关系没说**:是第四态?还是取代 `active`?
📌 `active` 现有语义 = 「draft 被点击激活以便后续动作」(契约脚本 `:5710`:*clicking inside a draft can activate it for follow-up actions*)。**两者不是同一件事**,建议 v1 点明。

### ⚠️ ④ 「receipt → `item_anchors` 认领(claim)=既有流程」(§4)

**「既有流程」为真,但它比设计稿暗示的窄**:
- 认领**只在 `castItem` 内部发生**,且该路径**必然创建一个 Item**;
- **没有「只认领、不铸 Item」的路径**;另一条出路只有 `discardPoolItemAnchor`(删除)。

⇒ 若 v1 设想「receipt 晋升为锚但先不铸 Item」,**那条路今天不存在**,须新增或明确不做。

### ✅ 一处应当记功:§3 括号里的自我限定

> 「(可能需要 pool_scope 扩一个取值,属词汇扩展非 schema 变更——**待核 schema**)」

**这句是对的,且它自己标了「待核」而不是断言。** ⇒ 设计稿在**它自己知道不确定的地方**做了正确标注;上面四条恰恰都是**没标「待核」而直接断言**的地方。

---

## 附带:两个 service 的现状

| 项 | 事实 |
|---|---|
| **活/休眠** | ⭐ **活的**。`selectionDraftService` 被 **8 个消费者**引用:`useSelectionDraftController` · `NoteWritingSurfaceLayer` · `TextBlockProjection` · `BlockEditorLayer` · `SelectionToolbarLayer` · `SelectionTypographyToolbarLayer` · `AnnotationContextMenuLayer` · `annotationRenderService` |
| **测试覆盖** | `client/.../textFocusReceipt.test.ts`(单测)+ `client/scripts/canvasEngineModelContractCheck.ts` 的 `testSelectionDraftEngine()`(契约门,在 `verify` 链内)。**⚠️ CodeGraph 对多数选区符号报「no covering tests found」** —— 覆盖集中在 draft 引擎的合并/命中测试,**不覆盖 anchorRect 语义** |
| **owner 三元组** | `blockId / textFlowId / textUnitId`,由 `textFocusReceiptsEqual` 比对;`reconcileCapturedSelectionTextOwner` 在 owner 变更时改写三元组(**已有重定位机制**,`resolve_selection` 的消费端可复用) |
| **offsets 归一** | `normalizeSelectionOffsets` 已做;零长度选区被 `createSelectionDraftRangeFromCapturedSelection` 挡掉(返回 `null`) |

---

## 一句话给 Fable

**Q1 的结论(零 DDL)成立,但真障碍不是 schema 而是 ownership 验证源与那条静默的 SQL 字面量;Q2 的 anchorRect 根本不是可持久化几何,`geometry 取 anchorRect+unit` 这句要改;Q3 另有三处「没标待核就断言」。**

**⛔ 本报告只核实,不建议任何具体工单形状 —— 那是你 v1 的活。**
