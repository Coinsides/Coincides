> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: B2 调查 TF-08(证据:selectionReceiptProjection.ts:19-25 slice 切片)+TF-09 契约整理子集;Henry 过夜清债令⑧收尾
> **单号**: 13.5 · B9 · 字素安全切片(TF-08)+ TextFlow 契约冻结子集(TF-09)

# 13.5 B9 · 切片与契约

## 一 · TF-08 字素安全切片

**坐标裁定(HQ 已拍,⛔复议)**:**存储坐标单位=UTF-16 offset 保持不变**(兼容全部既有锚,⛔数据迁移);**交互与切片=字素簇(grapheme cluster)边界**——

1. **摘录切片字素安全**:offset 落在代理对/组合簇(ZWJ emoji/组合变音)内部时,摘录**扩到包含完整簇**,⛔切裂字符;builder 侦察申报全部切片点(selection receipt/板范围 excerpt/annotation excerpt/复制拼接等)统一处理;
2. **选区与光标字素吸附**:B5/B6 的 offset 产生点(方向键/Shift 延伸/点击命中)吸附字素边界(Shift+→ 一步跨过整个 emoji);
3. 纯 ASCII/CJK 单码点路径行为逐字节不变;
4. 实现建议 `Intl.Segmenter`(grapheme 粒度,现代运行时内建);⛔引第三方分词库。

## 二 · TF-09 契约冻结子集(文档工作)

- `docs/contracts/TextFlow-Contract.md` 从 draft 推进:**照现物写实**——units/roles/inline 字段现状语义 + B4-B8 新立行为(历史封组规则/原子保存与 revision/inline 生命周期与降级/文档级选区模型/字素切片口径);
- **⛔发明新语义⛔写富样式**(候裁);状态头按文档系统规范(状态/层/日期/权威);与代码现物一致性自查申报。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟五条:①代理对 emoji/ZWJ 序列/组合变音在摘录切片不被切裂(修前断言现状红:slice 切裂);②Shift+→ 一步跨整 emoji,光标不落簇内;③纯 ASCII/CJK 既有路径行为逐字节不变;④B4-B8 全回归+全库;⑤契约文档 docs 检查过+现物一致自查申报。

## 四 · Result 格式

`## Result`:切片点侦察申报 + numstat + 五冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

2026-09-10 · Codex builder · B9 实现完成，待 HQ 复核；本回执不代替放行。

### 切片点侦察与实现申报

侦察射程：client/src 的 TS/TSX 切片调用，重点逐项核对 Notes/canvasEngine、Boards；server 的 TextFlow/selection/board/annotation 消费点，以及 shared/types。仓库有 .codegraph，但当前 CodeGraph CLI 与 MCP 均不可用；rg 也不可用，已回退到限定源码目录的 Get-ChildItem / Select-String。未索引仓库、未搜索用户资产。

| 切片点 / 消费链 | B9 处理 |
|---|---|
| shared/graphemes.ts；server/src/services/graphemes.ts | Intl.Segmenter 字素粒度；所有返回坐标仍是 UTF-16。非空摘录向外扩边，空区间保持空；光标 nearest 同距向前。slice 支持原负数/越界索引与反向空片段。server 保留同字节实现，受跨端一致测试约束，避免违反既有 shared runtime import 门。 |
| selectionReceiptProjection.ts → server selectionResolve.ts | 摘录扩到完整簇，原 startOffset/endOffset 不改。resolve 同时接受完整摘录或旧 raw slice，避免把未变化历史收据误判为漂移。 |
| Boards/boardTextRangeClipboard.ts；boardTextRangeEditSession.ts → server boardTextRanges.ts | 新 clipboard 范围先吸附再生成 UTF-16 地址/摘录；既有板范围重定位保留坐标单位，并接受旧/新摘录核对。server replay 以完整簇显示，GET 不反写历史坐标/快照。 |
| selectionRangeService.ts；annotationRenderService.ts | 新批注/DOM 选区归一到字素边界；历史高亮先统一区间端点，再按去重断点分段，避免逐片扩边造成字素重复或丢失。原 annotation range 不变。 |
| annotationEditorService.ts | 子批注预览范围在已有缓存内吸附，再切摘录。该 helper 未找到现役客户端调用；它没有完整源文，不能从已经扩大的历史缓存反推旧 parentStart 的簇首，未冒称完成此种遗留重定位。 |
| contentGroupService.ts；layers/NoteWritingSurfaceLayer.tsx | Group 范围预览、选区摘录拼接使用完整簇切片。 |
| textFlowSelection.ts；documentTextFlowSelection.ts | 先排序原端点，再按所选区间向外吸附；复制/删除/替换复用同一范围，跨 unit 用换行、跨 block 用双换行，保持 B6/B6b 的分块与方向模型。 |
| textUnitEditorService.ts；inlineLifecycle.ts | split、Enter、paste、纯文本插入在切片前吸附一次，同一边界用于 B8 retained text/inline remap；降级证据的源文切片扩到完整簇，既有 anchor_text/最早证据保留。 |
| rangeRebaseService.ts；blocks/TextBlockProjection.tsx | 普通 diff 的保留前后缀落在旧/新文本共同字素边界；精确 beforeinput 仍按真实编辑区间重建。不可取消 input 优先用 data 或可逐字节重建的插入意图，删除用空串，防止共享代理前缀切裂，以及组合变音/ZWJ 连接时重复邻接字符。 |
| TextBlockProjection.tsx；textareaNavigation.ts；overlayService.ts；hooks/useDocumentTextFlowSelection.ts | 方向键/Shift/点击命中/原生选区捕获/焦点恢复/IME 结束吸附。旧命中坐标算法保留，span 改为完整字素并携原 UTF-16 index；垂直上游探针用前一完整字素。composition 中不抢改选区。 |
| Boards/boardRepository.ts；server boards.ts；exportPreviewService.ts；trayService.ts；layers/NoteChromeLayer.tsx | TextFlow 正文在板摘要、导出预览、托盘/导航中的定长摘录也扩到完整簇；原 whitespace/标题优先逻辑保留。 |

仍存在的 raw slice 已按用途核对：数组与 ID/hash 操作；slash/Markdown/LaTeX 等语法 token 提取；原生精确编辑意图/重建校验；已经统一好边界后的渲染分区和编辑 prefix/suffix；历史摘录兼容核对。这些不逐片盲目扩边。未扩大到 Item/日历/聊天摘要、外部 Source 解析、formula/code 块型或 F1 候裁坐标域。

### numstat

tracked 文件用 git diff --numstat；新增文件按 git diff --no-index --numstat -- NUL <file> 的 +N/−0 口径补计，未 stage。包含本回执与两份自动索引；不含开工即存在的无关 untracked 配置、审计及会议记录。

| 文件（相对 repo 根） | + | − |
|---|---:|---:|
| client/src/pages/Boards/boardRepository.ts | 2 | 1 |
| client/src/pages/Boards/boardTextRangeClipboard.ts | 5 | 3 |
| client/src/pages/Notes/canvasEngine/annotationEditorService.ts | 7 | 4 |
| client/src/pages/Notes/canvasEngine/annotationRenderService.ts | 3 | 1 |
| client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.input.test.tsx | 96 | 0 |
| client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx | 74 | 17 |
| client/src/pages/Notes/canvasEngine/boardTextRangeEditSession.test.ts | 11 | 0 |
| client/src/pages/Notes/canvasEngine/boardTextRangeEditSession.ts | 4 | 2 |
| client/src/pages/Notes/canvasEngine/contentGroupService.ts | 2 | 1 |
| client/src/pages/Notes/canvasEngine/documentTextFlowSelection.test.ts | 24 | 1 |
| client/src/pages/Notes/canvasEngine/documentTextFlowSelection.ts | 26 | 21 |
| client/src/pages/Notes/canvasEngine/exportPreviewService.ts | 2 | 1 |
| client/src/pages/Notes/canvasEngine/graphemeExcerpts.test.ts | 123 | 0 |
| client/src/pages/Notes/canvasEngine/graphemes.test.ts | 48 | 0 |
| client/src/pages/Notes/canvasEngine/hooks/useDocumentTextFlowSelection.ts | 7 | 0 |
| client/src/pages/Notes/canvasEngine/inlineLifecycle.ts | 2 | 1 |
| client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.tsx | 2 | 1 |
| client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx | 2 | 1 |
| client/src/pages/Notes/canvasEngine/overlayService.ts | 3 | 2 |
| client/src/pages/Notes/canvasEngine/rangeRebaseService.ts | 24 | 4 |
| client/src/pages/Notes/canvasEngine/selectionRangeService.ts | 9 | 0 |
| client/src/pages/Notes/canvasEngine/selectionReceiptProjection.test.ts | 14 | 0 |
| client/src/pages/Notes/canvasEngine/selectionReceiptProjection.ts | 2 | 1 |
| client/src/pages/Notes/canvasEngine/textareaNavigation.ts | 4 | 3 |
| client/src/pages/Notes/canvasEngine/textFlowBlockNavigation.test.tsx | 21 | 0 |
| client/src/pages/Notes/canvasEngine/textFlowSelection.test.ts | 51 | 0 |
| client/src/pages/Notes/canvasEngine/textFlowSelection.ts | 13 | 3 |
| client/src/pages/Notes/canvasEngine/textUnitEditorService.ts | 7 | 6 |
| client/src/pages/Notes/canvasEngine/trayService.ts | 2 | 1 |
| docs/agent-ops/handoffs/2026-09-10-v13-5-b9-grapheme-and-contract-order.md | 100 | 1 |
| docs/agent-ops/INDEX.md | 7 | 2 |
| docs/contracts/INDEX.md | 2 | 2 |
| docs/contracts/TextFlow-Contract.md | 109 | 374 |
| server/src/__tests__/v13GraphemeTextRanges.test.ts | 64 | 0 |
| server/src/services/boards.ts | 2 | 1 |
| server/src/services/boardTextRanges.ts | 6 | 2 |
| server/src/services/graphemes.ts | 66 | 0 |
| server/src/services/selectionResolve.ts | 5 | 2 |
| shared/graphemes.ts | 66 | 0 |
| **合计（39 文件）** | **1017** | **459** |

源码/测试小计：**35 文件，+799 / −80**。新增 helper/测试五文件已补计；全单统计包含本表。

### 五冒烟

1. **① 字素摘录：PASS，修前红已先实跑。** 只新增 selectionReceiptProjection 三条断言、生产代码未改时，client 全库 **104 files：103 passed / 1 failed；1040 tests：1037 passed / 3 failed**。实际分别返回孤立代理半段、ZWJ 半段与孤立组合符，三条都红；日志 `.codex-tmp/b9-red.log`。修后三条全绿，另覆盖 emoji/ZWJ/组合变音每个内部切点、旗帜、肤色、空/反向区间、两端越界。板摘录、批注/Group 预览、高亮分区、复制/剪切、结构切分和 legacy replay 均有对应断言。原收据/历史范围字段不被读路径重写。
2. **② Shift 与光标：PASS。** jsdom 真实 TextBlockProjection 事件覆盖初始/已扩展 Shift+左右、普通左右键、跨 unit/block 延伸与点击、原生选择和 IME guard；一步跨完整 emoji/ZWJ/组合簇，不落簇内。新增不可取消 input 的 emoji、组合变音、ZWJ 有/无 data 与删除用例，验证没有切裂或重复上下文。
3. **③ ASCII/CJK：PASS。** 对 ASCII、多行 LF、纯 CJK、混合文本穷举原 slice 索引窗口和 caret 步进；选区正反方向复制/替换矩阵保留原字节。原单码点箭头仍走原生路径。首次整合曾使四条既有 pageTextCoordinates 点击位置失败；已恢复原测量方式、仅更换字素标记，**未弱化旧断言**，四项最终全绿。
4. **④ B4–B8 与全库：PASS。** 最终 `npm.cmd run test:unit` 无过滤整跑 **106 files / 1098 tests，全部 PASS，无 skipped**（原 B8 基线 1037 项保留，新增 61 项）；日志 `.codex-tmp/b9-client-final.log`。包括 B4 输入封组/失败恢复/undo-redo、B5 导航、B6/B6b 文档选择、B7 adapter 原子保存、B8 inline 生命周期与逐字段历史快照。服务端完整文件 `v13AtomicTextSave.test.ts` + `v13AtomicTextSaveMigration.test.ts` + `v13GraphemeTextRanges.test.ts` **14/14 PASS**；`v13BoardTextRanges.test.ts` **5/5 PASS**。全部合成内存库，日志 `.codex-tmp/b9-server-tests.log`、`b9-board-ranges.log`。
5. **⑤ 契约与 docs：PASS。** TextFlow-Contract.md 状态推进为 `frozen`，权威明确只覆盖 B9 现物子集；逐项对照 runtime 字段/roles/status/inline、B4 封组、B7 单块事务/revision、B8 降级与 B5/B6/B9 选区坐标，源码对应表见契约 §8。删除旧 draft 的未实现推测，未加入富样式/新语义。明确无跨 block 服务端事务、无幂等重试承诺、无新 inline 入口。用原 `node scripts/docs-index.mjs` 只刷新实际过期的 agent-ops/INDEX 与 contracts/INDEX；`npm.cmd run docs:check` 完整通过，含 inventory 和 glossary，日志 `.codex-tmp/b9-docs-check.log`。

### 其他验证

- client `npm.cmd run build:client`（tsc -b + Vite）与 server `npm.cmd run build`（manifest check + tsc + artifact copy）均 exit 0；日志 `.codex-tmp/b9-client-build.log`、`b9-server-build.log`。保留既有大 bundle / recursive-schema 提示。client 测试及构建的 COINCIDES_VALIDATION_ENV_DIR 均指向本轮新建空目录 `.codex-tmp/b9-empty-env`。
- 获准 runtime 原组成项：registry **5/5**、manifest **10/10**、parity **10/10**；tool-face parity、server shared import **217 files / 0 违规**、canvas boundary **159 checks**、三个 shell、Source experience、V11 legacy/freshness 均通过；Canvas model **60 groups**、performance **5 scenarios** 通过。日志 `.codex-tmp/b9-check-*.log`。首次 model 检查暴露 @shared 别名在 CommonJS 产物无法解析，已改为真实相对 import，原命令重跑通过。
- `git diff --check` 通过，index 无 staged diff。B4–B8 历史/保存核心未改；本轮为选区边界接入，不新增持久 schema、迁移或依赖。

### 未做

- 未 stage/commit/push；未修改权限或 agent 操作指令；未读 .env/key 值、未扫描凭据、未接触用户库/用户资产。
- 未设计或运行安全专项测试；获准既有套件均整跑，未过滤、skip 或改写聚合门来冒充通过。未开启 inline 插入/渲染、富样式、formula/code 收编、F1 新语义。
- 未做真实浏览器/操作系统原生输入的主观体验签收；本次冒烟证据是模型、jsdom 实际组件事件与合成内存库。单 unit collapsed 原生 Backspace/Delete 保留浏览器行为。
- 未迁移历史坐标或修复早已损坏的历史摘录。SQLite TEXT 无法逐字节往返孤立 UTF-16 代理半段；旧 raw 兼容实测覆盖内存收据及可存储的 ZWJ/组合符快照，不冒称能还原已被 UTF-8 转换损坏的数据。上表无完整源文的 orphan 子批注 helper 限制仍在。
- 未处理工单外其他 ready 项，也未修改其状态；自动索引只是反映当前文件头。

### 停线 / HQ 待接

本单代码无未解决阻断，五冒烟、typecheck/build、docs 检查已完成。**不宣称原总门通过**：`verify:v2-bn8-runtime` 末项包含本单明禁的 `check:changed-file-secrets`，故原聚合命令未运行；上列获准原组成项分别执行并如实记录。凭据扫描、完整总门及最终放行留 HQ；不越过禁令。
