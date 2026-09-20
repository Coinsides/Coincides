> **状态 (Status)**: evidence / builder 定向验证
> **日期 (Updated)**: 2026-09-19
> **范围**: A1 分页纯函数、内容适配、说明书；不代替整门或 HQ 验收。

# 分页引擎与内容适配证据

`client/src/pages/Notes/canvasEngine/documentPageFlowService.ts:114` 的 `resolveDocumentPageFlowPlan` 接收完整块序列、逐帧几何、Typography 和共享行度量函数。`PageFlowBlock` 可携单位的全块 UTF-16 范围、缩进、writing role、折叠可见性；单位间换行计入前一单位的范围。首片来源条使用 `pageFlowSourceReferenceService` 共享的 56px 固定预算，分页来源条保持单行、数量过多时横向滚动；首次使用的旧 34px 估值已在浏览器复核后替换。

返回 `DocumentPageFlowPlan`：

```text
collection                          所有原页 + 必需续页，原页不自动删除
frames[{frame,fragments}]            逐帧结果
fragments[{id,blockId,frameId,startFrameId,fragmentIndex,isFirst,isLast,
  textRange,lineRange,lines,layout}] 后续片均为派生投影
placementUpdates[{blockId,frameId,layout}]
                                    只改首片 frame_id，其余储存坐标与宽高保留
appendedFrameIds / excludedBlockIds / overflows
```

引擎每个 stack 从首帧顺序灌排，旧 `frame_id` 只选择所属 stack，不阻止删字后的正文回缩。逐页 `deriveFrameLocalAutoWidth` 是唯一 auto 宽度来源；续页继承末页纸型、墙与所属 stack 间距。`appendPageFrameToStack` 的页 ID 按既有集合确定性派生，不读时钟或随机数。手摆/画布/托盘/非流覆盖件被排除。Web 模板或 screen 背景作为无限纵向可用区，只长高不续页。超高不可裂块或单行保留原高度，并返回结构化溢出数值。

`notePageFlowService.ts:12` 将现有 NoteBlock / TextFlow 草稿适配为上述输入。普通文字草稿先更新而 TextFlow 草稿尚未更新时，按既有编辑器的逐行对齐方式计算完整范围，新增后缀不会漏排。折叠子单位只停止生成可见行，逻辑文本及之后单位的偏移不改。`pageFlowFragmentProjections` 保留同一 `flowFragment` 对象引用，让 Overview/Canvas 消费相同行计划。

2026-09-19 定向执行：

```powershell
npm.cmd --prefix client run test:unit -- src/pages/Notes/canvasEngine/documentPageFlowService.test.ts src/pages/Notes/canvasEngine/notePageFlowService.test.ts src/pages/Notes/canvasEngine/pageStackContentFlowService.test.ts
```

结果 **3 文件、23 测试通过**：新引擎 16；内容适配 5；旧草稿入口 2。原始日志 `.codex-tmp/a1-pagination/engine-tests.log`。覆盖多页异宽重新断行、全行/Unicode 边界、媒体/投影/组件整块下移、超高独占及报告、manual/覆盖件排除、Web 单帧、独立 stack、implicit auto/v1、保存续页后的固定点、墙/字号变化、折叠单位、新文字草稿后缀、首片来源预算、相同计划投影、尾部空单位。

说明书 `current-state/app-operating-manual.md` §一新增纸型自动分页、改版/页籍、跨片编辑、整块溢出、自由摆放/墨水五条。跨片编辑及打印 UI 的端到端结论、估高偏差和全量回归以本审计目录的总报告为准；本定向报告不将纯函数测试当作浏览器验收。

后续逐帧几何核查发现 `normalizePageFramePrintBaseline` 原先把显式 A4/Letter 页高静默提升到预设最小高，导致较矮异形页进计划前失真。A1 最小修复令已有 `pageSize` 的 width/height 都保持逐帧显式值；缺省纸型的历史回填和 Custom 分支行为不变，不改坐标契约。新增 A4、Letter 两项从 `normalizePageFrameCollection` 直到行分页的回归，验证 400px 矮页原高保留、重算固定点及跨页范围。最终定向 **4 文件、28 测试 PASS**，日志 `.codex-tmp/a1-pagination/engine-and-short-page-final.log`；这是原 23 项加既有纸型 3 项及新增 2 项，不与完整客户端总数重复累计。

同源墨水页籍回归新增在 `layers/PaginationProjection.test.tsx`：由整页不可裂块占满原纸页，迫使逻辑正文首片改籍并新建多张续页；随后通过真实 `useNoteCanvasFrameModel` 与 `NoteReadOnlyPageContent` 分别验证 Overview 和 print。两种表面均保留原 `CanvasPlacement.frameId`、位置和旋转，原笔迹只在原页出现，正文所有新续页不携带该墨水。未改产品墨水路径。联合既有 `PaperInkProjection.test.tsx` 为 **2 文件、8 测试 PASS**，原始日志 `.codex-tmp/a1-pagination/pagination-ink-affiliation-final.log`。

该轮首次运行保留于 `pagination-ink-affiliation.log`：新增墨水两项通过，但原完整正文投影测试按 textarea 可见 value 拼接，未区分新修复的页缝硬换行显示范围而失败。测试现同时验证 `displayEnd` 对应的可见文本、被物理页缝替代的尾缀只允许换行符，以及原 canonical range 完整连续覆盖正文；Overview 与 print 的范围及可见文本仍逐项相等。
