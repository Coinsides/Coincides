> **状态 (Status)**: done(2026-09-21 HQ 收官:builder 环境两红=Python 系,HQ 机 server 主集真全绿含该两文件;client 2339/2339 逐字对上;docs 索引收口后 25 组件门全绿;双门绿)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-21
> **单号**: V14 收尾批 · T1 目录块(G2)
> **上游**: ①样张对齐缺口清单 G2(2026-09-20,Henry 已拍收尾批开工):样张目录页点击跳章,产品纸上无目录块;A4 交付时言明 agenda 聚合投影接口已在、「目录页本身⛔本单」——本单即那张后续单;②Henry 洞见:目录块与导航窗格**平行不冗余**——印刷品公民 vs 工作台器官,目录随纸走;③视觉设计宪章(active,2026-09-21)第四条血统法——本单为**出生公约首个执行件**。

# T1 · 目录块(agenda 投影的块化消费者)

## 一 · 真相形状

1. 新 block_type `toc`,归**投影族**(同族先例 note_ref):**零新真相**——目录内容=本笔记 heading 派生章树(A4 既有 agenda 聚合投影)的现场投影,⛔任何章数据落库⛔缓存成真相;块行本身只存在/不存在+placement;**明门**:块型闭集住 `server/src/validators/index.ts:53` 的 `noteBlockTypeSchema` Zod 枚举(HQ 已核,无 DB CHECK)——扩一项 `toc` 属现役枚举扩项,⛔新表新列条款**不拦**此扩;
2. content 载荷极小(允许空对象或仅显示参数);**显示参数走出生公约**(见§四);
3. 判据自查:目录块「行为独异」(点击跳章/导出静态页码)故配当块型——⛔借道 text 块。

## 二 · 三面行为

1. **编辑/阅读面**:插入即活——渲染当前章树(标题+层级缩进);点击条目跳该章首页(沿现役导航跳转通道,⛔新滚动机制);章树变化即时反映(派生投影的应然);空章树渲染占位提示;
2. **打印/导出面**:静态化——条目+**页码**(页码从现役 DocumentPageFlowPlan 现算,⛔存);样式与正文同源(token);
3. **插入入口**:接现役「+插入」菜单与斜杠通道,照 C4a 同词双入口纪律(菜单项与斜杠命令同词同执行器);现役 15+7 斜杠对象级零变,新增仅此一项,申报菜单/斜杠双处行号;
4. **read_note 投影**:目录块以 flat text 投影(B1 表格先例:行级文本,如「目录: 章一 / 章二…」);⛔扩 read_note 输出 schema 键(注册表 .strict() 禁区,B1 停线教训);结构化槽照旧记账给 C 波遗留,⛔本单。

## 三 · Agent 面

1. 本单⛔扩 organized_note 提案载荷(目录块型入提案=G6 富块管线射程,别抢跑);
2. 现役 Agent 读工具看到目录块的 flat 投影即可;⛔新工具⛔prompt 改动。

## 四 · 出生公约(宪章第四条,本单首执行)

1. 目录块全部视觉取值:色只从 skin token 取(ink/ink-muted/accent 族),字体只按角色取(titleFont/labelFont),间距走现役排印刻度,发丝线走系统常量;
2. **⛔字面 hex⛔硬编码字体族⛔私有间距常量**;实现里出现任一字面视觉值=违约,Result 须申报「出生公约自查:零字面值」并给出取值点行号清单;
3. 换皮肤(default/quiet-ink/warm-paper/workbench/silk)目录块应自动着装——补一条最小断言(token 引用存在性级即可,⛔截图对比)。

## 五 · 验收与禁区

1. 定向:目录块渲染/跳章/导出页码/空树/皮肤断言+插入双入口;回归:client 全库+server 全量(**全量补集含 v13WildernessExecute,实测 ~460s,文件预算 ≥600s,⛔按 120s 超时判红**)+agent 族回归(read_note 投影动了);
2. 证据落 `docs/audits/2026-09-21-t1-toc-builder/`,原始日志留 `.codex-tmp/t1-toc/`;
3. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 .git 目录);只读 git 子命令明文允许(含验证门脚本内部调用);verify 门的 git 检查+secrets 扫描两组件留 HQ 收口,builder 跑其余组件按「非 git/secrets 的 N 组件」申报;⛔新表新列(块行走现役 note_blocks)⛔TextFlow 真相 schema⛔坐标契约⛔章数据落库⛔read_note schema 扩键⛔organized_note 载荷⛔新工具⛔prompt 改动⛔Relation/判定域⛔新依赖⛔用户库⛔真实模型调用;⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符;
4. Result:各节结论+逐件行号+测试数字+出生公约自查+未做项;冲突停线举证。

## Result

> **From**: codex(builder)
> **日期**: 2026-09-21
> **判定**: **STOP — 实现与定向验证已落；全量验收受环境权限阻断，未收口，不翻 done，不代 HQ 放行。**
> **证据目录**: `docs/audits/2026-09-21-t1-toc-builder/`
> **原始日志**: `.codex-tmp/t1-toc/`

### 一 · 真相形状结论

`toc` 已作为投影族独立块型接入。内容固定 strict `{}`，没有显示参数、章副本或页码字段；沿现役块行、placement、创建/删除/恢复与撤销履历。目录有独立点击/打印行为，不借 text 块。

| 逐件 | 落点 |
|---|---|
| 现役枚举仅增 `toc` | `server/src/validators/index.ts:67` |
| 空载荷与拒绝复制正文/标题 | `server/src/validators/tocBlock.ts:4`；`server/src/validators/index.ts:775`；`server/src/services/tocBlocks.ts:4` |
| 创建、更新走原生命周期，防止模板回退为 text | `server/src/services/noteBlockLifecycle.ts:443`、`:451`；`server/src/services/noteBlockContent.ts:40`、`:94`；`server/src/routes/notes.ts:290` |
| 客户端空内容仍算可呈现内容；文字编辑适配器不注入 TextFlow | `client/src/pages/Notes/canvasEngine/blockContentService.ts:181`、`:197`、`:210`、`:227`、`:240` |
| 空 metadata、placement 失败沿原撤回通道、普通保存屏障 no-op、禁止文字模板转换 | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:1420`、`:1427`、`:1905`、`:2429` |
| 作为不可分投影消费现役页流，不新增分页算法 | `client/src/pages/Notes/canvasEngine/notePageFlowService.ts:23` |

### 二 · 三面行为结论

| 逐件 | 实现与验收行号 | 结论 |
|---|---|---|
| 当前章树、缩进、空树 | `client/src/pages/Notes/canvasEngine/TocProjectionContext.tsx:4`；`blocks/TocBlockProjection.tsx:6`、`:19`、`:27`（后两路径均在 canvasEngine 下） | 消费既有 A4 agenda；无内容缓存；空树显示提示。 |
| 动态草稿、只读点击、折叠祖先展开后跳章 | `client/src/pages/Notes/canvasEngine/layers/NoteRuntimeDocumentLayer.tsx:115`、`:218`；同目录 `NoteRuntimeDocumentLayer.test.tsx:478`、`:495` | 目录与导航窗格共用原 `selectChapter`→`navigation.selectHeading`；未新增滚动机制。 |
| 编辑器接线、关闭正文 Save/插段入口 | `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx:285`、`:540`、`:546`、`:599` | TOC 独立渲染，保留普通块位置/撤销操作。 |
| 打印静态条目与现算页码 | `client/src/pages/Notes/canvasEngine/tocProjectionService.ts:8`、`:17`、`:26`、`:37`；`layers/NotePrintLayer.tsx:30`、`:37`、`:38`、`:44`；`layers/NoteReadOnlyPageContent.tsx:73` | 首片归属来自当前 DocumentPageFlowPlan；封面不计正文页号；Web 长页复用既有 getPagePrintSlices 累计物理页数；不存页码。 |
| 折叠不缩减打印内容来源 | `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayoutModel.ts:359`；`noteNavigationSearch.ts:22`；`layers/NoteRuntimeDocumentLayer.tsx:210` | 从既有完整 search/export source 传递 fullPlan，打印层沿原冻结生命周期消费。 |
| 打印定向 | `client/src/pages/Notes/canvasEngine/layers/TocPrint.test.tsx:49`、`:73`、`:87` | 无/有封面、实际 print portal、跨页首片、重新分页、manual heading、Web 切片页号均通过。 |
| 菜单与 slash 同词同执行器 | **菜单** `client/src/pages/Notes/canvasEngine/layers/NoteInsertMenu.tsx:66`、`:70`；**slash** `client/src/pages/Notes/canvasEngine/hooks/useSlashCommandController.ts:488`；共同新增对象 `client/src/pages/Notes/noteSlashCommands.ts:44` | “目录”；`/目录`、`/toc`、`/contents`、`/agenda` 同一项；原 15+7 slash 对象及原 7 菜单对象全字段 deepEqual 不变。 |
| 创建执行与撤销收据 | `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:1575`、`:1590`；`hooks/useNoteCanvasLayerProps.ts:233`；`hooks/useNoteCanvasRuntimeController.ts:662`、`:666`、`:670` | 同一 host，空 content、原 defaultDraftLayout、原 history 队列。 |
| `read_note` flat 投影 | `server/src/services/tocBlocks.ts:19`、`:32`；`server/src/services/agentReadSurfaces.ts:94`、`:161`、`:163`、`:165`、`:180` | 从整本当前块序、每块首个存活 heading 派生；排除封面/纸外/tray；在页过滤及 cap 之前取章，单读目录页仍看到后页标题；只使用既有 text 字段。 |

插入逐点证据见 `insert-entry-evidence.md`；服务端生命周期、HTTP、read_note strict schema 与跨页证据见 `server-evidence.md`（均在本单证据目录）。

### 三 · Agent 面结论

只改 `read_note` 内部文本投影。`server/src/toolFace`、`server/src/agent`、`server/src/db`、`shared` 及既有 TextFlow/坐标服务的只读 diff 检查无改动（原始记录 `protected-path-diff.txt`）；未扩注册表输出 schema、organized_note 提案载荷、工具或 prompt，未进入 Relation/判定域。Agent 回归从本次服务端全量日志按明确 25 文件清单统计 **383/383 PASS**，不是另外虚加的测试数量。

### 四 · 出生公约自查

**出生公约自查：零字面值（本单新增视觉实现范围）**。目录 CSS 无 hex、硬编码字体族或数值尺寸；没有新增 `--sk-` token。间距/字号/行高引用现役 document 排印值；层级深度是数据，缩进单位取现役排印常量。未画新发丝线；焦点用浏览器 `outline: auto`。

| 取值点 | 行号 |
|---|---|
| 正文色 `--sk-ink`、交互色 `--sk-accent`、页码/空态色 `--sk-ink-muted` | `client/src/pages/Notes/canvasEngine/blocks/TocBlockProjection.module.css:2`、`:19`、`:22` |
| 角色字体 `--sk-title-font`、`--sk-label-font` | 同文件 `:8`、`:21`、`:22` |
| 字号、行高、间距 | 同文件 `:3`、`:4`、`:5`、`:9`、`:15`、`:16` |
| 系统缩进刻度 | `client/src/pages/Notes/canvasEngine/blocks/TocBlockProjection.tsx:2`、`:19` → 既有 `typographyMeasurementService.ts:11` |
| 五皮肤 token 引用断言 | `client/src/pages/Notes/canvasEngine/blocks/TocBlockProjection.test.tsx:98`；default/quiet-ink/warm-paper/workbench/silk **5/5**，未做截图对比 |

交叉复核发现的正文工具栏排除遗漏与 Web 切片页号遗漏，均在 client 全库运行前修复；最终编译与全库覆盖了修复后的代码。此前定向与编译失败日志均保留（测试 helper 类型/导入修正），不据早期通过结果冒认最终状态。

### 五 · 验证数字、冲突与射程

| 验证 | 结果 | 原始日志（均在 `.codex-tmp/t1-toc/`） |
|---|---|---|
| 插入双入口及现役相邻行为 | 3 文件 **92/92 PASS** | `insert-targeted.log`；对象不变证明 `insert-slash-object-equality.log` |
| 目录组件 | 1 文件 **9/9 PASS**（含五皮肤） | `toc-projection-unit-final.log` |
| 导航/打印/分页相邻首轮 | 4 文件 **56/56 PASS** | `render-targeted.log` |
| 补齐 Web 切片后导航/打印 | 2 文件 **32/32 PASS** | `render-final.log` |
| 服务端 TOC 定向 / 相邻六文件 | **6/6 / 70/70 PASS**，后者包含前者 | `server-toc-directed.log`；`server-toc-neighbors.log` |
| client 全库 | **229 文件，2339/2339 PASS**，34.51s | `gate-05-test-unit.log` |
| server 全量零排除 | **110/110 文件覆盖，1109 tests：1107 pass / 2 fail / 0 skipped / 0 cancelled；0 flaky retries**，107.603s | `server-all.log`、`server-all-events.json`、`server-all-summary.json` |
| Wilderness（已含全量） | **27/27 PASS**，106.617s；文件预算 **600000ms**，未按120s判红 | 同上 |
| Agent 族（已含全量） | **25/25 文件，383/383 PASS** | 同上 summary 的 agentFamily |
| verify 门 | **非 git/secrets 的 25 组件全部尝试：24 PASS / 1 FAIL**；client/server build 均 PASS | `gate-result.json`、`gate-01` 至 `gate-25` 各日志 |

这些集合重叠，不能相加为独立测试总数。新增服务端测试已接 `server/package.json:40` 的现役 test:v2，测试接线门 PASS。机器汇总见证据目录 `validation-summary.json`；31 个本单源码/测试/package 文件的 SHA-256 清单见 `source-manifest.json`，包括普通 git diff 不显示的新文件。

**停线冲突：工单要求服务端全量通过，而当前执行权限无法启动既有 MinerU 的固定 Python 环境。**

1. `v2SourceMineruWiring.test.ts:60` 在文件加载时找不到 `python.exe`（ENOENT）；原始 `server-all.log:61215`、`:61238`。这是文件级失败，其内部测试未全部运行，不能用文件覆盖率冒充测试完成。
2. `v2SourceRegionCells.test.ts:196` 固定使用旧 v12.9 MinerU venv；其 uv CPython 基程序虽存在，启动探测返回**拒绝访问**，测试返回 code 101。原始 `server-all.log:62078`、`:62084`；权限调查见 `verification-blocker.md`。未安装新依赖、改旧环境/用例、绕过拒绝或排除这两文件。
3. 已启动的非 git/secrets 验证门最后返回 `docs:check` FAIL：`docs/agent-ops/INDEX.md` 过期（`gate-25-docs-check.log:6`）；其后串联 inventory/glossary 子步未执行。当时本单对 `docs/agent-ops` 尚无 diff，未擅自生成或改写该索引；本 Result 是停线后追加的收据。

权限拒绝确认后停止源码施工与测试重跑，仅整理既有证据和本 Result。工单保持 ready；这不是验收完成声明。

**禁区射程申报**：本单只读 git status/diff，没有 add/commit/push/reset/写 `.git`；完整 verify 的 git 检查与 secrets 扫描两组件留 HQ。零新表/列、零真相或坐标契约改动、零新依赖、零用户库或真实模型调用；测试数据库/资产/凭据目录为隔离合成夹具，新合成凭据不超过20字符。未设计安全对抗用例；既有全库回归按明文授权零排除。开工已有的 `.claude/settings.local.json`、旧 audits 与其他用户未跟踪文件未改。

### 未做项与继续条件

- 服务端全量 **未通过**；需要在能合法执行现有 Python/MinerU 的环境复跑两红及必要完整性验证。没有请求提升权限或绕过当前执行限制。
- 非 git/secrets 验证门 **未全绿**；docs 索引漂移需 HQ 收口，inventory/glossary 子步须补跑。git 检查/secrets 扫描仍由 HQ 完成。
- 未做真实浏览器主观验收、截图对比、用户库/真实模型调用；未替 reviewer/HQ 放行。
- 未扩结构化 read_note 槽、organized_note TOC 写入、工具/prompt、显示参数；没有额外开发超长 TOC 的条目级拆页，沿现役不可分投影 overflow 处理。
- 本单源码与证据留工作区，未提交。恢复后以 `source-manifest.json` 和现有原始日志为审查起点。
