> **状态 (Status)**: active(**v1,Fable 2026-08-24 拍板**;v0 的 §7 三问由 `2026-08-24-selection-receipt-precheck.md` 核实答毕,四处「申报宽于实现」措辞已修)
> **层 (Layer)**: 分析 / Analysis(必修③ 设计稿)
> **日期 (Updated)**: 2026-08-24
> **上游**: 宪章 §8(选区收据=还没保存的锚)· 12.2 设计稿 v0.4 §2.1(指代语汇,已拍板)· Source-Ladder A-1..A-5 · 既有 `selectionDraftService.ts` / `selectionRangeService.ts` · 核实报告 `2026-08-24-selection-receipt-precheck.md`

# 必修③ 选区收据系统设计稿 v1(薄——它是 12.2 §2.1 的持久化,不是新系统)

## 0. 一句话

**把客户端已有的 `SelectionDraftV1` 投影为可传递、可指代的 `SelectionReceiptV1`——收据是值,不是行;零几何,零 OCR,零模型。** 12.2 已拍板指代语汇,本稿定三件:生命周期、持久化位置、晋升为锚的路径(v1:前两件拍死,第三件整体推迟)。

## 1. 不变式(直接继承,v1 修订几何句)

- 形状=12.2 §2.1:`refs` 由 owner 三元组(`blockId/textFlowId/textUnitId`)派生;`text_ranges` 原样继承 `CapturedSelectionRange`(offsets+摘录);`at`;信封带 `note_id`。**不另造字段。**
- **几何:v1 拍死不含**。核实证明 `anchorRect` 是手势瞬间相对 viewport 的 CSS px,仅供浮层定位,滚动/缩放/改窗宽即失效——**身份从来不靠它**(三元组+offsets 已是完整身份且 frame-free)。若未来要几何,须新增捕获(单位标签/frame 身份/zoom),`anchorRect` 不作为持久化来源;文档/源件上的圈选几何归源侧(层0/层1,pdf_pt+页号天然),12.5。
- 选区收据**不含语义**(Source-Ladder A-2 对等):它说「圈了哪里」,不说「圈的是什么」。
- 零 OCR(宪章 §8);机械、零 token(零模型荣誉榜)。

## 2. 生命周期(draft 枚举不动;receipt=导出快照)

```text
capturing → draft → active(既有 SelectionDraftPhase,一字不动)
                      │
                      └─(显式动作时按需投影)→ SelectionReceiptV1(不可变值)
                                                  └─ 随工具调用收据(intended_input)落盘
```

- **`receipt` 不是 draft 的第四态**:既有枚举已是三态(`capturing|draft|active`,`active`=「点击激活以便后续动作」),receipt 与它们不同层——是投影函数的**输出值**,改选=重新投影。
- **不自动持久化每一次选区**(噪声)。v1 唯一的持久化触发=「交给工具」:收据作为工具入参,随既有收据轴的 `intended_input` 一起落盘,**零新机关**。「圈选→锚」「保存为标记」触发推迟(§4)。
- receipt 不可变(A-3 对等):值语义天然成立。

## 3. 持久化位置(v1 拍死:不建表,不动锚池)

- **不建新表;不动 `item_anchors` pool。** 核实报告证实:pool 的 `pool_scope_kind` 词汇扩展虽零 DDL,但 `content_group` 硬编码有 **9 处**(2 处 zod literal、2 处运行时抛出、4 处 TS/实参、**1 处静默 SQL 字面量**——INSERT 无视入参写死 `'content_group'`),且 ownership 校验打 `content_groups` 表——**换 ownership 验证源是设计决定,不是机械替换**。此工程与工具面主线无关,整体推迟。
- v1 的收据存在形态:①内存值(投影输出);②工具调用收据 `metadata.intended_input` 内的 JSON(既有轴,免费持久化)。

## 4. 晋升为锚(v1:整体推迟,现状记实)

- 核实报告证实:认领只发生在 `castItem` 内部且**必然创建 Item**,**没有「只认领不铸 Item」的路径**;另一条路只有 `discardPoolItemAnchor`(删除)。
- 「receipt → 锚」的正道 = 源侧 typed anchor(Source-Ladder §4,12.5 落码后)或届时专项;晋升凭使用(§6 成长律)原则不变,**路径本版不建**。

## 5. 与 12.2 / 12.4 的接缝

- 12.2c `resolve_selection(SelectionReceiptV1)`=消费端(只读解析:按 range 逐条 found / missing / text_drifted;ownership 拒绝形状按 c-0 核实定);本系统提供生产端(投影函数+导出口)。
- 12.4 流式装配面的多选/框选手势必须产出同一 receipt 形状——**形状定于此,面在 12.4 接**。
- 客户端已有 `reconcileCapturedSelectionTextOwner` 重定位机制;server 侧解析路径由 c-0 核实后点名。

## 6. 不做

- 不做红笔圈(自由笔迹)像素识别;不做跨 note 选区;不做选区历史 UI;不做几何持久化;不动 pool 九处硬编码;不做锚晋升路径。

## 7. 三问(v0 遗留)——已答毕

见 `2026-08-24-selection-receipt-precheck.md`:Q1 零 DDL 成立但真障碍是 ownership 验证源+静默字面量(→ §3 推迟);Q2 anchorRect 不可持久化(→ §1 零几何);Q3 四处措辞已在本 v1 修正(几何句、「只是投影函数」句、receipt/active 关系、认领路径宽窄)。
