> **状态 (Status)**: done（纯调查回执；候裁方案未施工）
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: 13.5 段 plan 波次 B2(立项裁量=调查单,不吃专场门控);块终局方向档 §四(formula/code 收编进 TextFlow,候专场转正);V14 硬前置 2(打字入撤销栈=机械闸法源)
> **单号**: 13.5 · B2 · TextFlow 欠条清算立项调查(⛔施工)

# 13.5 B2 · TextFlow 欠条清算立项调查

**性质**:**纯调查单,⛔ 改任何生产代码**。产出=欠条清册+工程量评估,供 Henry 专场与 13.5/13.6 排产裁量。

## 一 · 调查射程

1. **TextFlow 欠条清册**:盘点 TextFlow 相关的已知欠账现物——打字不入撤销栈(V14 机械闸法源,硬前置)、跨单元光标(13.5 候裁在案)、以及代码中 TODO/欠条注释、tech-debt.md 相关条目;每条:现物位置+现状行为+受害面;
2. **formula/code 收编评估**(块终局档 §四方案,⛔当已拍——专场候转正):若 formula/code 块型收编为 TextFlow 行内结构,盘点现有 formula/code 块的:数量级(代码面推断,⛔查用户库)、渲染/编辑/保存链现物、收编需动的面与迁移形状;
3. **打字入撤销栈**工程量:现有 historyService/canvasCommandService 与文本编辑链的织合点,最小可行方案 1-2 案(各自改动面/风险/与板级 undo 的对称性);
4. 每项给 S/M/L 工程量档 + 依赖关系 + 建议排期(13.5 内/13.6/V14)。

## 二 · 纪律

- **⛔ 改生产代码⛔改测试**(纯读);⛔ 读 .env;⛔ 用户库接触;⛔ 安全类测试;
- 产出=本工单追加 `## Result`(清册表+各项评估+建议排期+证据行号);⛔ commit。

## Result

> **完成日期**: 2026-09-10 · **执行者**: Codex builder
> **性质**: 纯调查完成；以下方案、工程量和排期均为建议，不构成施工授权、专场转正或验收放行。
> **代码基线**: `fable/v2-bn12-exoskeleton`，HEAD `85cfdc8d1ffec12e7692d1fa713d7ae3a982d45e`。行号对应本次工作树。
> **执行边界**: 仅本工单状态头与 Result 写回；未改生产代码或测试，未 stage/commit/push，未读取 .env 或 key 值，未接触用户库，未调用业务 API，未运行测试或构建。

### 1. 立项结论与估量口径

建议 **13.5 收口调查、确定撤销施工边界，13.6 首批清偿打字撤销；V14 写权开启前必须完成该前置**。若另发 ready 施工单且档期允许，推荐方案 A 可提前到 13.5。本单不把“B2 立项调查”升级为“本段全部清债”。formula/code 收编另依专场转正，不能因调查完成自动启动。

三个影响排产的现物：

1. **打字未进入应用撤销栈**。聚焦 textarea 内可能仍有浏览器原生撤销；它不等于应用能够跨失焦、结构编辑和布局动作按时间顺序撤销。现有 runtime 双栈可以复用，但需补文本会话、输入路由、范围快照和保存结果。
2. **code 并不是独立的 block_type**。`code.snippet` 实际是 paragraph 块的模板/呈现分支；formula 则有独立 formula 块型。两者收编的迁移量不同。
3. **inline 目前主要是模型与寻址预留**。插入命令仍禁用，编辑器尚未接通专用渲染与完整坐标维护；现有 split/merge 还有清空或错挂 inline 的静态风险。不能据 current-state 中“inline structures”一句概述，认定收编底座已经可用。

**S/M/L** 按工程边界估量：S＝局部规则或文档收敛；M＝多个既有机件织合、有限数据映射；L＝跨真相资源、编辑契约或兼容迁移的系统工作。含未来施工必要的功能验证与回归成本，不含专场等待、用户数据实测或迁移执行；不承诺人日。表内父项与子项有重叠，不能直接相加。

**文档效力**：本 ready 工单及用户本轮指令授权调查。13.5 plan 仍 draft（`docs/agent-ops/handoffs/plans/v13-5-layout-credentials-plan.md:1-4,31-38`）；块终局档明确“权威＝否、候专场转正”（`docs/agent-ops/analysis/2026-09-09-block-endgame-direction.md:1-5,28-46`）。V14 草案的硬前置/机械闸见 `docs/agent-ops/handoffs/plans/v14-agent-era-plan-draft.md:24-34`，本工单已点名承接；本轮未认定该草案已经转正或闸已经实现。

下文证据路径缩写：**N/**＝`client/src/pages/Notes/canvasEngine/`；**S/**＝`server/src/`；**C/**＝`docs/agent-ops/current-state/`。例如 `N/historyService.ts:35-51` 是真实源码路径及行号范围。

### 2. TextFlow 欠条清册

“源码风险”表示当前分支可见该缺口，但本轮没有运行复现；不把它写成已发生的用户数据事故。

| ID / 状态 | 现物、当前行为与受害面 | 工程量 / 依赖 / 建议排期 | 证据 |
|---|---|---|---|
| TF-01 **open：打字不入应用历史** | 受控 textarea 更新 flow/plain-text draft，blur 保存；没有文本 history entry。全局 undo 排除可编辑 DOM。受影响：连续输入、失焦后的撤销，以及文字/布局交错的历史顺序。 | **M（偏上，方案 A）**；依赖 TF-05 的范围恢复语义、TF-06 的结果判定。13.5 定施工单，13.6 首批完成，**V14 前硬前置**。 | `N/blocks/TextBlockProjection.tsx:605-633,1125-1159`；`N/hooks/useBlockTextFlowEditController.ts:51-80`；`N/historyService.ts:5-15,35-51` |
| TF-02 **open：同 block 跨 TextUnit 光标** | 每 unit 独立 textarea；keydown 仅接 Enter、行首 Backspace、Tab。现有 refs/focus 方法可复用，普通方向键没有跨 unit 接续。受影响：多段、列表连续键盘写作。 | **M**；先定义可见 unit 顺序、软换行首尾、上下移动保留横向位置、折叠跳过及 IME 边界。13.5 候裁，13.6 实施。 | `N/blocks/TextBlockProjection.tsx:480-529,792-833,1125-1157`；`N/hooks/useSlashCommandController.ts:520-545,570-592` 的上下键仅处理菜单 |
| TF-03 **另项：跨 unit 选择 / 跨 block 导航与选择** | 当前 text selection/caret 由单 textarea 承担；TF-02 的 focus 接续不能提供跨 textarea 的 Shift 选区。跨 block 还须定义纸上阅读顺序、投影/媒体不可编辑边界及块身份。 | **L**；依赖 TF-02、输入/选区模型与专场表面裁定。13.6 独立立项；若延期到 V14 或以后，相关结构写权保持未开放，不能借 TF-01 销账。 | `N/blocks/TextBlockProjection.tsx:1125-1157`；候裁出处 `docs/agent-ops/analysis/2026-09-09-block-endgame-direction.md:40-46` |
| TF-04 **源码风险：结构输入的 selection / IME 边界** | Enter 与结构化 paste 只把 selectionStart 传给拆分/粘贴函数，未携 selectionEnd；service 保留起点之后的 suffix，缺少替换整个选区的信息。所查 keydown 未见 composition guard。受影响：选中文字后 Enter/多行粘贴、输入法确认。IME 失误尚未运行复现。 | 选区替换 **S/M**，与 IME/typing 分组一起 **M**；建议随 TF-01 施工，避免录下错误的输入事务。 | `N/blocks/TextBlockProjection.tsx:797-807,886-896`；`N/textUnitEditorService.ts:141-168,359-405`；`N/hooks/useSlashCommandController.ts:538-541,585-590` |
| TF-05 **源码风险：结构手术与范围恢复不完整** | 合并会移除当前 unit；annotation rebase 遇到消失 unit 直接跳过，未迁移/降级其坐标。重叠编辑会清 annotation offsets；板引用变 drifted 后不再参与普通 rebase，因此逆向改回正文不会自动恢复引用。受影响：带批注/板文字引用的 split、merge、替换及 undo。 | 有界的身份映射和受影响范围快照 **M**；全跨单元/inline 手术 **L**。13.6 与 TF-01 同批处理其必要子集，formula 收编前定完整规则。 | `N/hooks/useBlockTextFlowEditController.ts:65-75`；`N/textUnitEditorService.ts:176-198`；`N/rangeRebaseService.ts:130-133,182-197`；`N/boardTextRangeEditSession.ts:6-16,26-42` |
| TF-06 **TD-6 未清：正文 + annotation 跨资源持久一致** | annotation 先走独立保存，正文另走 block PUT；当前还存在“正文已存、板范围同步失败”的同形分支。registry/reconciliation 是客户端结果管理，不能兑现服务端原子撤销/OCC。受影响：带侧挂范围的保存、重试与撤销。 | **L 专项**；operation receipt / 原子端点 / revision 条件写一起设计。建议13.6。TF-01 至少补结果可判断、失败留栈与局部恢复；若要求跨资源持久原子性，则本项成为其额外硬依赖。 | `C/tech-debt.md:17`；`N/hooks/useBlockTextFlowEditController.ts:51-80`；`N/annotationTruthRepository.ts:107-115`；`N/hooks/useNoteCanvasDataAdapter.ts:1472-1483,1619-1626` |
| TF-07 **open：inline 生命周期欠条** | Inline formula/code 命令禁用；常规文本编辑不重定位 inline range。按 unit 拆 flow 清空 inline；合并 flow 重命名冲突 unit 后未同步重映射 inline parent/id。受影响：未来行内公式/代码、inline 锚及存量收编。 | **L**；依赖坐标契约、TF-01/05，专场转正后13.6主单；详见下一节。 | `N/commandSurfaceService.ts:171-188`；`N/textFlowService.ts:83-103,198-210`；`N/textUnitEditorService.ts:86-94,437-482` |
| TF-08 **台账在案 + 源码机制确认：UTF-16 切片边界** | selection receipt 用 JS slice(startOffset,endOffset) 取摘录；若偏移落在代理对/组合字形内部，可能切裂字符。只读确认切片机制，未重新实测全部来源路径。受影响：emoji/组合字形的摘录与地址一致性。 | **M**；先定“存储坐标单位”与“交互可选边界”，投影/解析必须同口径。建议13.6随坐标契约处理。本单不设计或执行安全输入测试。 | `C/deferred-tests.md:22-23`；`N/selectionReceiptProjection.ts:19-25` |
| TF-09 **方向欠条：富选区样式、契约冻结** | 当前工具条修改 DocumentTypographyProfile；局部富样式真相仍未落定。TextFlow 契约仍 draft。受影响：局部样式及收编后的字段/行为契约。 | 富样式 **L**；契约整理 **S**（依赖先裁定实际语义）。13.6冻结必要子集，富样式 V14/后续候裁；不挤占打字前置。 | `C/README.md:85,129`；`N/layers/SelectionTypographyToolbarLayer.tsx:24-30,57-79,140`；`docs/contracts/TextFlow-Contract.md:1-4` |
| TF-10 **方向欠条：排版测量成熟度** | 字符均宽、字符数折行和固定行高仍用于排版估计。混合字体、CJK、公式/代码的精确容量与打印裁片需额外工程；本轮没有观测到新的溢出事故。 | **L**；依赖最终 inline 形态与共享渲染。V14/后续导出专项候裁；收编本身须覆盖新增形态的基本高度/打印回归。 | `N/typographyMeasurementService.ts:45-62`；`N/measurementService.ts:78-104`；`C/README.md:85,129` |

**清册之外的已登记边界**：TD-28 是“跨会话块恢复入口”债，不能由会话内 typing undo 清偿（`C/tech-debt.md:39`）；TD-31 已关闭，不因旧推导复活（同文件 `:44`）。current-state/ADR 的 transformed-canvas 编辑风险仍是历史承重风险，本轮未作浏览器验证，不新增一个“已复现缺陷”（`C/README.md:106,133`）。

**TODO/欠条注释搜索**：限定 `client/src`、`server/src`、`shared/types` 的非测试 TS/TSX/JS/JSX/MJS/CSS 源码，以大小写敏感 `\bTODO\b|\bFIXME\b|\bHACK\b|\bXXX\b|欠条|欠账` 扫描，无命中；`todo_item` 属业务角色。该结果只说明这些标记未出现，清册仍由真实控制流、disabled 说明和台账得出，不宣称不存在其他债。

### 3. formula/code 收编评估（候裁）

#### 3.1 数量级：只量代码，用户存量未知

| 分母 | 代码面结果 | 能据此推断的范围 / 证据 |
|---|---|---|
| 源码内置模板表 | 3项，其中目标2项：formula.math、code.snippet | `S/lib/noteBlockTemplates.ts:61-112`；不是运行时自定义模板总数，更不是用户块数。 |
| REST block_type 枚举 | 11项，含 formula，无 code；code.snippet 对应 paragraph | `S/validators/index.ts:43-55`；`S/lib/noteBlockTemplates.ts:100-110`。code 收编主要迁呈现判别与内容语义。 |
| 专用投影组件 | FormulaBlockProjection 188行、CodeBlockProjection 61行，共249行 | 两个叶子组件的源码规模。实际改动还跨编辑、保存、寻址、打印和旧生产者，整体按 L 估量。 |
| REST create/update plain_text 限制 | 两条请求路径均限制20,000 | `S/validators/index.ts:706,731`；仅说明请求限制，不能推出全部历史内容大小。 |

**无法从源码估计的量**：实际 formula/code 块数、字节分布、挂锚比例、脏格式比例、迁移耗时均未知。本轮没有用模板数量或文件命中数冒充用户数据量。

#### 3.2 当前链路与收编触点

| 阶段 | 现物 | 收编需处理的面 |
|---|---|---|
| 创建 | Slash Formula/Code 指向两个模板；adapter 构造 content/metadata/plain text 后 POST block，placement 可另保存。证据：`client/src/pages/Notes/noteSlashCommands.ts:126,146`；`N/hooks/useNoteCanvasDataAdapter.ts:1079-1113`。 | 前端菜单与 server 模板/校验同口径；禁止仅隐藏菜单而让其他生产者继续制造不兼容形状。 |
| Formula 载荷与编辑 | `field_values.latex_input/formula_name/explanation`，并有 structured_fields 等兼容来源；KaTeX预览 + LaTeX textarea；blur/paste 规范化包裹符并保存字段。证据：`N/blockContentService.ts:41-48,66-80,130-150`；`N/blocks/FormulaBlockProjection.tsx:83-121,124-185`。 | 保留名称、说明、原 LaTeX；明确 display/inline，不能只搬公式字符串而丢附属字段。 |
| Code 载荷与编辑 | `{body,language}`；客户端初始 flow 使用 code_line 角色，初始 tu-1 文本可含换行；专用 textarea 带行号。证据：`N/blockContentService.ts:117-127,198-206`；`N/textFlowService.ts:106-123`；`N/blocks/CodeBlockProjection.tsx:32-58`。 | 多行 code_line 与短 inline_code 分开定；language迁至明确的flow/unit语义。保持空白/缩进、复制行为及现有unit身份。 |
| 渲染分流 | BlockEditorLayer 先判formula再判code；模板标记或language可触发旧分支。证据：`N/layers/BlockEditorLayer.tsx:428-449`；`N/blockContentService.ts:51-63`。 | 仅改block_type不能完成收编；要处理template_key/template_id/legacy_template_id及language判别，兼容旧读。 |
| TextFlow 接桥 | 当前 plain-text backed 写入会生成/更新flow；已有flow时替换第一unit文本。证据：`N/layers/NoteWritingSurfaceLayer.tsx:2278-2319`。 | **不能假设所有formula没有flow，或所有code都须重新造unit**。迁移必须分“已有flow/无flow”。 |
| 保存 | adapter 汇合flow、formula字段与plain text，并同步板范围；server PUT写JSON/plain text等，metadata与当前值合并后归一模板。证据：`N/hooks/useNoteCanvasDataAdapter.ts:1442-1483`；`S/routes/noteBlocks.ts:54-105,118-125`。 | 旧模板标记须显式转换；正文、引用副作用和失败回执纳入同一迁移设计。 |

#### 3.3 目标底座与迁移建议

模型已有 `inline_formula/inline_code`、`parent_text_unit_id/anchor_range/field_values`，且能投影为可寻址对象（`N/runtimeDataTypes.ts:80-102,505-508`；`N/textFlowService.ts:224-256`）。当前文本主编辑器的 overlay 服务 annotation，正文仍是 `textarea value={unit.text}`，尚无对应的专用 inline 编辑/渲染支路（`N/blocks/TextBlockProjection.tsx:993-997,1073-1164`）。投影 plain_text 只拼接 unit.text（`N/textFlowService.ts:281-290`）。

建议的实施分解如下；每一步都待后续施工单授权：

| 子项 | 形状与必须保持的事实 | 档位 / 依赖 / 建议排期 |
|---|---|---|
| F1 坐标与字段契约 | 裁定公式占原LaTeX范围还是一个占位字符；display/inline、复制与摘录语义、formula_name/explanation保留处；code_line/inline_code及language归属。占位字符若入unit.text，另需可读plain text投影，并对齐锚/选区坐标。 | **M**；专场前后13.5完成裁量材料与契约范围。 |
| F2 Inline 生命周期 | 插入/编辑/删除、光标穿越、split/merge/rebase、范围复制、撤销、打印共同接通。先消除TF-07，才能解禁入口。 | **L 主体**；依赖F1、TF-01/05；13.6候裁主单。 |
| F3 Code呈现收敛 | 原paragraph块保留；迁模板判别与language到flow/unit语义，复用code_line。可先保持已有单unit多行text，不搭车按换行重新铸unit。 | **M**；依赖输入/历史与字段契约；13.6可拆单，不必等所有短inline_code交互一并完成。 |
| F4 存量转换 | **原块原地转表达**，保block.id、placement/mount、出处和引用身份；已有flow优先保unit.id，缺flow才确定性创建。公式原字符范围压缩时必须产旧→新坐标映射；无法保持精确范围则明确降级并保留摘录/旧载荷。 | **M**；若顺便跨块合并升 **L**，建议不合并。依赖F1/F2和兼容读；13.6后段。实际用户库迁移另需Henry授权，本单不执行。 |
| F5 生产者与兼容消费 | 同步模板、normalize、organized note/material reconciliation、只读与打印；新写新形状、旧形状可读，转换版本标记/幂等/失败收据/可逆记录齐备。 | **M**，与F4有重叠；13.6随主单。若新表达不能被现有内容版本无损描述，先定版本化/双读，不静默改外部格式。 |

**SQL判断**：现有content_json可以承载TextFlow/inline，表达收编本身未必要求新增表列；转换存量JSON/metadata仍属于正式数据迁移。若需持久坐标映射或新的版本载体，是否加schema需裁定，不能承诺“零schema改动”。

**必须纳入评审的消费面**：

- annotation有 `inline_structure_id`（`S/services/annotationTruths.ts:130-155,406-412`）；板范围按note/block/flow/unit/offset解析，摘录取unit.text.slice（`S/services/boardTextRanges.ts:39-57,89-118`）；selection resolve也切unit text（`S/services/selectionResolve.ts:83`）。因此“保block ID”不足以证明锚仍正确。
- 块生命周期已检查Source、annotation、ContentGroup、Item/Relation及canvas placement/mount/connector引用（`S/services/noteBlockLifecycle.ts:671-779,790-890`）。迁移不通过删旧建新绕开这些身份关系。
- 只读/打印复用BlockEditorLayer；公式高度仍按块型/模板判定（`N/layers/NoteReadOnlyPageContent.tsx:65-100`；`N/measurementService.ts:78-104`；`N/pagePrintProjectionService.ts:24-43`）。
- 老格式生产者仍在模板、shared类型、Agent normalize、organized note与material reconciliation中（`S/lib/noteBlockTemplates.ts:76-110`；`shared/types/index.ts:551-563`；`S/agent/tools/normalizeContent.ts:59`；`S/services/organizedNoteProposals.ts:314`；`S/services/materialReconciliationProposals.ts:148`）。这里仅调查其形状，不修改Agent能力或开放写权。

### 4. 打字入撤销栈：两案

#### 4.1 现有织合点

- **输入与before来源**：TextBlockProjection → NoteWritingSurfaceLayer → applyBlockTextFlowEdit / plain-text draft → saveBlock。`useBlockDraftAuthority` 已同步维护draft ref并提供readBlockDraftSnapshot，可用作首次before的来源（`N/hooks/useBlockDraftAuthority.ts:46-64`；`N/layers/NoteWritingSurfaceLayer.tsx:2271-2276,3875-3891`）。
- **现有history容器**：RuntimeHistoryEntry已有通用 `reversibleEdit`；双栈80条、新写清redo，但没有typing合并组（`N/historyService.ts:5-15,55-63`；`N/hooks/usePlacementHistory.ts:33-40`）。不用另造一根文本专用的竞争栈。
- **CanvasCommand边界**：kind/dispatch当前是空间对象create/move/resize/style/delete，不含TextFlow mutation（`N/types.ts:628-642`；`N/canvasCommandService.ts:430-452`）。可借before/after形式；文本真相应仍由TextFlow拥有。
- **失败/作用域需补**：usePlacementHistory先pop，false会放回、throw只有finally；无noteId/reset参数。NoteDetail参数变化仅更新Provider值，无key。新文本entry须显式note/mount/generation隔离，并保证异常不吞entry；本轮未复现跨Note撤销（`N/hooks/usePlacementHistory.ts:14-22,33-40,74-122`；`client/src/pages/Notes/NoteDetail.tsx:5-11`）。
- **已有保存结果可借，不能误读**：saveBlock已带route/hydration围栏与恢复收据（`N/hooks/useNoteCanvasDataAdapter.ts:1414-1440,1628-1665,1691-1723`）；annotation回调却是Promise<void>，reconciliation失败可能仍resolve并保乐观态（同文件 `:779-895`，尤其 `:871-879`）。需补可判定结果，不能把await结束当成全部保存成功。`inFlightWriteRegistry` 是在途计数/失败集合，**不是串行队列**（`N/inFlightWriteRegistry.ts:30-59,80-85`）。

| 方案 | 改动面与回放形状 | 风险与覆盖边界 | 工程量 / 排期 |
|---|---|---|---|
| **A：同Note会话快照，接现有runtime history（推荐）** | 新建编辑会话聚合器，首次before + 连续输入after；记录note/block、flow前后、selection前后、**本次受影响annotation/board range的前后快照**。包装reversibleEdit或明确textFlowMutation；复用现有保存正门，回放禁二次录史。编辑组件、controller、draft/save边界、history键盘路由与结果接口接线。 | 限当前Note会话，重开不保留历史；按ID局部reconcile侧挂范围，不能整Note覆盖后来新建批注。统一排队typing finalize/save/undo，失败/部分成功留entry和恢复收据；成功才移栈。**可清有界打字撤销，不因此清偿TD-6服务端原子性。** | **M（偏上）**，上述范围快照/失败语义均包含，不能删去它们降成S。13.5若另发单可先做；基线建议13.6首批、V14前完成。 |
| **B：TextFlow领域命令 + 共用执行调度** | 定义replace range/split/merge/role/inline等typed command与可逆delta；slash、粘贴、格式、未来inline都从同一领域入口走，再适配runtime history。与CanvasCommand并列复用调度/结果概念，保持TextFlow内容归属。 | 含A全部义务，另须收敛直接setter入口、跨unit/inline身份与坐标。便于未来note_patch按操作声明覆盖；不是现成CanvasCommand加一分支就够。若要求跨资源持久原子撤销，仍需TD-6专项。 | **L**；13.6与结构/inline收敛候裁。可在A后渐进实现，不能让等待B成为延后V14打字前置的理由。 |

#### 4.2 两案共同的最小验收边界（后续功能验收建议，本轮未执行）

1. **分组与顺序**：同Note/block/unit、连续选区、相同输入类别才合并。选区移动、切unit/block、粘贴、Enter/merge、role/indent、slash结构动作、布局动作、blur/离开Note及undo/redo前封组；不得跨一次布局操作把前后两段打字合成同一entry。
2. **输入法与快捷键归属**：composition期间不提前封组或执行结构拆分；compositionend形成一次完整输入。只为受管TextFlow编辑器接管Ctrl/Cmd+Z/Y，其他表单保持既有行为，避免原生undo与应用undo同时执行。
3. **范围可逆**：不仅恢复字符串，还恢复unit身份、被该编辑触及的annotation/board range状态与坐标。drifted/清空offset并非可逆函数，反向rebase不能代替before快照。结构动作独立成entry。
4. **保存与异常**：普通输入、blur save、undo save必须有序；busyRef只防undo/redo互撞不够。部分成功、抛异常、stale_epoch时不丢entry、不虚报成功；保留恢复入口，重试不重复造历史。
5. **Note与离开边界**：按note及generation隔离；旧响应不得进入新Note。已有返回项目路径是blur → flushPendingSaves → 导航（`N/NoteCanvasRuntime.tsx:29-42`），typing封组须接入同一边界。只给当前内容模型申报覆盖，不顺带声称跨会话持久史记。

#### 4.3 与板级undo的对称性

板端已有按挂载board scope建立的内存双栈、80条上限、成功后移栈、undo逆序/redo正序、逐HTTP写失败补偿（`client/src/pages/Boards/boardCommandHistory.ts:42-59,136-173`）；useBoard让读写及undo/redo共用队列并保护scope（`client/src/pages/Boards/useBoard.ts:39-52,55-101,252-256`）。

A应达到相同的**作用域、顺序、结果可判断与失败保史**。文本另加IME、光标和范围真相恢复。两者可以共用行为契约，各自保留宿主作用域；不要求合成跨Note/Board的全局历史。板端仍是内存历史 + 多HTTP/补偿，member mount/placed、layer等存在不入史边界（`client/src/pages/Boards/boardCommandHistory.ts:97-125,185-195,222-239`），不能用它背书“全部CRUD可撤销”或“持久原子撤销”。

### 5. 建议排期与依赖

| 时段 | 建议交付 / 工程量 | 进入下一步的条件 |
|---|---|---|
| **13.5 本单** | **S：调查与立项材料，已交付**。选择A/B边界；准备F1坐标/字段决策材料（后续 **M**）。TF-02候裁。 | 本Result只供裁量；formula/code转正仍走专场；施工另发ready。 |
| **13.6 首批** | **M：A + TF-04必要输入边界 + TF-05受影响范围可逆子集**；同block跨unit导航TF-02可拆 **M**。 | 打字、失焦、结构动作与布局交错、失败重试及切Note的功能覆盖被独立确认；否则V14相应写权不启。 |
| **13.6 后续** | **L：TD-6持久耦合专项**；专场批准后 **L：F2/领域命令收敛**，再做 **M：code呈现/F4-F5兼容转换**；TF-03跨边界选择单列 **L**。 | 先定坐标/身份，再修编辑生命周期，再转换存量。用户库扳机不包含在本调查授权中。 |
| **V14 / 后续候裁** | 消费已经清偿的撤销能力；富样式/精确测量等 **L** 专项按使用需求排。 | **不得把打字撤销债带入V14并同时开放相应写权**。若13.6未完成formula/code收编，保持旧读兼容与明确能力边界，不在Agent施工中暗做迁移。 |

依赖主链：**输入/坐标语义 → 有界文本历史与范围恢复 → inline生命周期 → 兼容生产者/读取 → 存量表达迁移 → Agent按已验覆盖开写权**。TD-6原子性是独立服务端主线；是否将其全部提升为某类写权的前置，应在施工规格写明。只承诺客户端可观察恢复的方案，不能以措辞升级成持久原子承诺。

### 6. 调查与交付核验

- 已读开工路由、方向宪章、current-state相关条目、active ADR-0001及本单上游候裁材料；draft/候裁档只作调查对象。未改current-state、契约、计划或权限文件。
- `.codegraph/`存在；已先尝试CodeGraph，当前CLI不可用且无可调用MCP；rg同样不可用，回退限定源码/文档目录的只读枚举与Select-String。未建索引，未加载生产模块。
- 证据来自源码、台账和现物接口形状；未作浏览器、数据库、网络或故障注入验证。“源码风险”保留待验证标签。
- **未运行 `npm run verify:v2-bn8-runtime`、安全类测试或其他测试/构建**：本单是用户明确限定的纯调查，未发生代码变更；不申报runtime gate PASS或施工验收完成。
- 交付核对限定为本工单UTF-8、追加结构、证据路径/行号有效性与工作树改动范围；本次仅更新本工单状态头并追加Result，保留开工时已有的其他未跟踪文件。
