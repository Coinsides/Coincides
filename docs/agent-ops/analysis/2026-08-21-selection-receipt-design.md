> **状态 (Status)**: draft(Fable 设计稿 v0;Opus 一读挑刺 → Fable 拍板 → plan 12.3)
> **层 (Layer)**: 分析 / Analysis(必修③ 设计稿)
> **日期 (Updated)**: 2026-08-21
> **上游**: 宪章 §8(选区收据=还没保存的锚)· 12.2 设计稿 v0.4 §2.1(指代语汇,已拍板)· Source-Ladder A-1..A-5 · 既有 `selectionDraftService.ts` / `selectionRangeService.ts`

# 必修③ 选区收据系统设计稿 v0(薄——它是 12.2 §2.1 的持久化,不是新系统)

## 0. 一句话

**把客户端已有的 `SelectionDraftV1` 投影为可持久化、可指代、可晋升为锚的 `SelectionReceipt`——一切手势归一,零 OCR,零模型。** 12.2 已拍板指代语汇,本稿只定三件:生命周期、持久化位置、晋升为锚的路径。

## 1. 不变式(直接继承)

- 形状=12.2 §2.1(`refs` 由 owner 三元组派生;`text_ranges` 原样继承 `CapturedSelectionRange` 含摘录;`geometry` 取 anchorRect+unit;`at`)。**不另造字段。**
- 选区收据**不含语义**(Source-Ladder A-2 对等):它说「圈了哪里」,不说「圈的是什么」。
- 零 OCR(宪章 §8):用户亲手画/选的,按对象身份解析,不看像素;视觉仅兜底无身份像素。
- 机械、零 token(零模型荣誉榜)。

## 2. 生命周期(三态,与既有 phase 对齐)

```text
capturing(手势进行中,既有 SelectionDraftPhase)
  → draft(手势结束,内存态 SelectionDraftV1)
  → receipt(显式动作后持久化:圈选→锚 / 交给工具 / 保存为标记)   ← 本稿新增的唯一状态
  → (晋升) anchor(item_anchors / 源侧 typed anchor,Source-Ladder §4)
```

- **不自动持久化每一次选区**(噪声)。持久化触发=用户或工具对该选区做了「有后果的动作」——与「选区收据=还没保存的锚」一致:没人要它时它就是 draft。
- receipt 不可变(A-3 对等):改选=新 receipt。

## 3. 持久化位置(裁定倾向,待 Opus 证伪)

- **不建新表**。receipt 住两处既有轴之一:①作为 `item_anchors` 的「原料池」态(11.3 已有 pool/claim 机制:pool=未认领锚)——选区收据**就是**未认领锚的前半生,语义完全对齐;②短寿命的 UI 级 receipt(如交给工具入参)走 `operation_batches.metadata`(随工具调用收据一起落,不单独成行)。
- **平行机关自问**:是否在 item_anchors pool 之外另造存储?答:不;receipt=pool 态锚的 payload 形状,新增的是投影函数与触发时机,不是表。**请 Opus 证伪**:pool 机制是否要求 pool_scope=content_group(现 validator `pool_scope_kind: 'content_group'`)——若是,无 ContentGroup 语境的选区收据落哪?(可能需要 pool_scope 扩一个取值,属词汇扩展非 schema 变更——待核 schema。)

## 4. 晋升为锚

- receipt → `item_anchors` 认领(claim)=既有流程;源侧 receipt(层0/层1 原件上圈选)→ Source-Ladder §4 typed anchor(12.5 落码后)。
- 晋升凭使用(§6 成长律):被铸卡/被引用/被工具消费的 receipt 才值得成为锚;其余随 session 过期。

## 5. 与 12.2 / 12.4 的接缝

- 12.2 `resolve_selection(SelectionReceipt)`=本系统的消费端;本系统提供生产端(投影函数+触发)。
- 12.4 流式装配面的多选/框选手势必须产出同一 receipt 形状——**形状定于此,面在 12.4 接**。

## 6. 不做

- 不做红笔圈(自由笔迹)的像素识别;不做跨 note 选区;不做选区历史 UI。

## 7. 请 Opus 证伪的三点

1. §3 的 pool_scope 约束(`content_group` 强制?)是否让「无组选区」无处落——查 validator/schema,给出是否需词汇扩展。
2. `SelectionDraftV1.anchorRect: DOMRect` 持久化时的坐标系归一(px vs pdf_pt vs canvas world)——与 Source-Ladder A-5「单位显式」对齐,现有 draft 是否带 frame 语境。
3. 本稿是否有任何「申报宽于实现」的倾向性措辞。
