> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: B6 停线拆单建议(现物证据:textFlowEditSession 单 blockId 事务/applyEdit(block,...) 单块边界);Henry 过夜清债令③的收尾
> **单号**: 13.5 · B6b · 跨 block 选择(文档级选区)

# 13.5 B6b · 跨块选择

**使命**:Shift 选区跨过 block 边界,复制/删除/替换可作用于跨块区间,一次操作=一条可逆历史。

## 零 · 文档级选区模型(HQ 已裁,⛔复议)

1. **端点** = `(blockId, unitId, offset)` 两端;跨块区间按 B6 既有阅读序(visibleBlocks 渲染序);
2. **连续文本段规则**:跨块选区只在**连续的文本块段**内延伸——遇 item_ref/投影/媒体/只读块即停止,⛔跨过⛔选入(避免"删除范围含图"的歧义语义);
3. **多块单 entry**:entry = 按序的逐块 {完整 flow before/after + 触及范围快照} 列表;一次跨块操作=**一条** runtime history entry;undo/redo 逐块逐字段恢复;
4. **执行与失败语义**:逐块走既有单块正门串行保存;任一块失败→整 entry 留栈、明码报错、重试补齐未完成块(B4 失败语义的多块延伸);**⛔宣称服务端原子**(TD-6 另案);
5. **操作语义**:复制=块间以空行(\n\n)连接、块内 unit 间以 \n(与 B6 一致);删除=各块删除所选文本,**⛔自动跨块并块**(首尾块保持独立,块合并是另一种结构手术⛔本单);打字/粘贴替换=删除选区+首端插入;剪切=复制+删除;
6. IME/清选区/Note 隔离边界沿 B4/B6 规则;⛔改 B4 单块语义⛔TD-6⛔TF-07。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟五条:①Shift 选区跨两个文本块(高亮跨块正确),Ctrl+C 块间空行连接(修前断言现状:选区停在块界);②跨块 Delete=各块删所选、块不合并,undo 一步恢复全部块逐字段;③跨块打字替换,undo/redo;④选区延伸遇 item_ref/图片块停止;⑤任一块保存失败注入→entry 留栈可重试,B4/B5/B6 全回归+全库。

## 二 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

2026-09-10 · Codex builder · 实现与单内验证完成，待 HQ/reviewer 复核；未 stage / commit / push。

**实现**：Note 级选区持有 `(blockId, unitId, offset)` 两端，按 `visibleBlocks` 阅读序裁出连续可编辑文本段；沿用 B6 的单块选区计算与高亮。跨块复制使用 `\n\n`、块内使用 `\n`；删除不并块，输入/粘贴在前端点替换，剪切走复制加删除。多块完整 flow 与触及 annotation/board ranges 快照压成一个 `reversibleEdit` entry，沿现有单块保存正门串行执行；失败留栈、显式报错、重试补未完成块。没有服务端原子性承诺。

**numstat**（代码及测试 12 文件合计 `+1436 / -29`；本工单回执 `+38 / -1`，全单 13 文件 `+1474 / -30`；新增文件按完整行数计入，未暂存；下列路径均相对 `client/src/pages/Notes/canvasEngine/`）：

| + | - | 文件 |
|---:|---:|---|
| 102 | 15 | `blocks/TextBlockProjection.tsx` |
| 143 | 0 | `documentTextFlowSelection.ts`（新增） |
| 196 | 0 | `documentTextFlowSelection.test.ts`（新增） |
| 102 | 0 | `hooks/useDocumentTextFlowSelection.ts`（新增） |
| 165 | 8 | `hooks/useTextFlowHistory.ts` |
| 272 | 0 | `hooks/useTextFlowHistory.document.test.tsx`（新增） |
| 1 | 0 | `hooks/useNoteCanvasLayerProps.ts` |
| 1 | 0 | `hooks/useNoteCanvasRuntimeController.ts` |
| 8 | 0 | `layers/NoteWritingSurfaceLayer.tsx` |
| 7 | 1 | `textFlowBlockNavigation.ts` |
| 260 | 5 | `textFlowBlockNavigation.test.tsx` |
| 179 | 0 | `textFlowDocumentHistory.integration.test.tsx`（新增） |

**五冒烟**（自动化使用纯内存夹具；另以真实 Chrome 的键盘/剪贴板事件走查本地合成页面，无后端或用户库）：

1. **PASS，修前红已先验**：改生产码前整跑 client，100 文件、924 PASS / 1 FAIL，唯一失败是新冒烟①的 Shift+Down 仍留在 first block，没有到 last；日志 `.codex-tmp/b6b/red-client.log`。修后真实浏览器从 `first paragraph` offset 2 Shift+Down 到 `second text` offset 2，两块高亮正确，Ctrl+C 回执严格为 `rst paragraph\n\nse`。自动化另覆盖三块、反向、块内跨 unit 后再跨 block、Shift+click 保留原 anchor。
2. **PASS**：真实 Delete 得 `first=fi`、`second=cond text`，其余块不变且块保持独立，undo entry 仅 1 条；一次 Ctrl+Z 恢复两块。浏览器将撤销后的全部 flow 字段与 Reset 初值比较为相等；自动化额外逐字段断言 annotation/board ranges、unit/inline/flow metadata 恢复。
3. **PASS**：真实跨块输入 `XY` 得 `first=fiXY`、`second=cond text`，仅 1 entry；Ctrl+Z 恢复、Ctrl+Y 重做。自动化覆盖 beforeinput、非 cancelable input 回退、粘贴、剪切、Backspace、保存等待期间立即回首端；初次保存/重试完成不再夺焦点。
4. **PASS**：真实第三块 Shift+Down 停在 item_ref 前；末块反向 Shift+Up 停在图片后，障碍及后方正文未选入。自动化另覆盖投影、只读、正反方向；区间外只读块不误清合法选区。Esc、普通箭头、鼠标、IME、Note 切换及收缩回 caret 的清区规则通过。
5. **PASS**：真实第二块保存失败后显示明确错误，undo=1、redo=0，首块已保存、第二块 rejected；Retry 只新增一次 second 保存，错误消失、entry 仍为 1，之后一次 Undo 恢复全部块。自动化覆盖首/中/末块失败、undo/redo 中失败、annotation 保存失败、串行顺序、前序 B4 typing 失败恢复、Note/generation 围栏。B4/B5/B6 既有测试连同新增测试全库整跑无过滤：**103 文件、972/972 PASS**（15.90s），日志 `.codex-tmp/b6b/client-final.log`。

**验证**：独立 client `tsc --noEmit` PASS（`typecheck-final.log`）；最终 client build PASS（`build-client-final.log`）；server build（含 tsc/manifest）PASS（`build-server.log`）。以上日志均在 `.codex-tmp/b6b/`。`check:canvas-runtime-boundary`、`check:single-editor-shell`、`smoke:canvas-engine-model-contract`（60 groups）及 `git diff --check` PASS。client 测试和 Vite build 使用既有 `COINCIDES_VALIDATION_ENV_DIR` 指向空目录，未读取仓库 `.env`。

**未做**：未 stage/commit/push；未读取 `.env`/key 值、未接触用户库、未新增或专项运行安全类测试、未运行凭据扫描（留 HQ）。未执行包含凭据扫描的 `verify:v2-bn8-runtime` 总入口，不能据上述单项结果宣称总门全绿；既有 client 套件始终整跑、没有过滤测试。未改 B4 单块分组语义、未改 `textFlowEditSession.ts`、未做跨块并块、TD-6 服务端原子/OCC 或 TF-07；未跑用户数据端到端、未代做主观验收。真实浏览器证据来自生产编辑/历史机件接纯内存保存；保存服务本身不是本单改动。临时合成夹具位于 `.codex-tmp/b6b/browser-*`，测试服务和标签页已关闭。

**停线**：本单范围内无未解决停线。CodeGraph CLI/MCP 当前不可用，已尝试后转本地检索；直接 CDP 受 DevToolsActivePort 文件权限阻挡，改用现有 Chrome 扩展通道完成冒烟。TD-6/TF-07 与凭据扫描继续留原负责方；复核待 reviewer，放行留 HQ。
