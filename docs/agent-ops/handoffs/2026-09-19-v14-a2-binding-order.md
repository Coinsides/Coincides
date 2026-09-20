> **状态 (Status)**: done(builder 交付+HQ 收口全绿,2026-09-19:client 188 文件 1896/1896 亲跑定案;三未绿逐一过堂——契约闸旧断言按已拍「每页异形」新法更新、server 正式 build 由 HQ 补 shared 项目构建后绿(v2McpArtifact 2/2 复活)、板 wave1 两断言跟上板视觉 v1 现役回执(7/7);git/secrets 双门绿;应用内两砖合验冒烟过:真笔记自动翻页+页缝+页脚页码+装订面板;余 2 红=既有 Python/MinerU 环境基线)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-19
> **单号**: V14 纸面线 · A2 装订面三件套+折缝
> **上游**: `design/note-page-design.md` §2.3(装订面,全拍)+§四.1(折缝,拍)+§〇公理二(树是内容页是容器,三根线:版心/装订段/计数器)+ A1 页流引擎已入库(`documentPageFlowService`/`useNotePageFlow`,commit 63292986)。**设计裁量已完成,照拍施工⛔重开设计。**

# A2 · 装订面三件套+折缝

**性质**:纸的装订阶段——页眉/页码/折缝。装订面服务气质、非必要、**整体可关**;后于内容产出,⛔侵入内容真相。

## 一 · 装订段

1. **装订段=页区间+一套装订设置**(页眉文案/显示页码起始与制式/槽位微调/槽级样式覆写);**设置存笔记级**(建模申报:migration 编号顺延、字段与默认值全表申报;⛔页级存储——页零存储,段内每页同位同构;既有笔记零迁移成本=单默认段自动生效);
2. v1 射程:单默认段覆盖全笔记 + 可增段(按机械页区间切分,段界申报数据形);
3. **封面档钩子留位**:装订三件套对「第 0 页/封面档」静默(drop folio)的开关语义先留接口,⛔实装封面页本身(那是下一单 A3)。

## 二 · 双页码

1. **机械页码=页帧序号**(系统真相永在,内部寻址用,⛔用户改)≠**显示页码=装订段计数器投影**(起始可设);
2. 制式三种:阿拉伯/小写罗马/大写罗马;**中文数字⛔**(Henry 已裁);
3. **页码模板槽=`'前缀'+N+'后缀'`**(N 不可删);
4. 与 A1 集成:分页重算(增删页/换纸型/异形页)后显示页码**自动重投影**,零手工。

## 三 · 六槽

1. 眉左/中/右+脚左/中/右六槽;**现物先考古**:`pageFrameSlotService` 槽族(header/footer/page_number)已存在——复用/扩展,⛔平行第二套槽系统;
2. 段级微调(槽位偏移)+样式两级=**默认吃皮 token+槽级覆写**(书名槽与章名槽异装天然支持);
3. **页眉纯手填**(文案来自装订设置);自动吸收章名(mark)**⛔立项**(一页多章即废规则,Henry 已裁);
4. 页码默认住脚中槽,可换槽;
5. 默认档:施工期页眉页码全开(成品默认关的开关语义在,档位切换留给发布前夕)。

## 四 · 折缝

1. **页间空白可折叠**=页间件+「视图」菜单开关;显缝=所见即打印,折缝=分页世界呈现为连续长页(沉浸书写);
2. 折缝**只动呈现**:⛔动分页计算、⛔动真相、⛔动打印/导出(二者永远显缝形态);
3. Web 长页(单帧生长)无缝可折——开关对其禁用或隐藏,申报选择。

## 五 · 验收与禁区

1. 定向:装订段建模+增段/段界+页码制式三种+模板槽前后缀+六槽渲染与换槽+皮/槽级两层样式+折缝开合与打印不受折缝影响+**A1 集成**(重分页后显示页码自动重投影)+封面静默钩子;client 全库+server 全量;既有回归零破(A1 分页面/打印 Overview 同源/墙九条/manual 块/墨水/Web 长页);
2. **说明书义务**:`current-state/app-operating-manual.md` §一 补装订面与折缝用法条目;
3. 证据落 `docs/audits/2026-09-19-a2-binding-builder/`(蒸馏件),原始日志留 `.codex-tmp/a2-binding/`;
4. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 `.git` 目录);**只读 git 子命令明文允许**(含验证门脚本内部调用);`verify:v2-bn8-runtime` 的 git 检查+secrets 扫描两组件留 HQ 收口,其余组件照跑并按「非 git/secrets 的 N 组件」申报,⛔宣称完整门已绿;⛔碰 Relation 域/写门/注册表/Agent 机关;⛔动 TextFlow 真相 schema;⛔动 page_frame_local 坐标契约九条;⛔新依赖;⛔新设计安全对抗类用例(射程=只禁新设计对抗用例;既有功能回归含全库整跑明文允许,零排除);builder 新造凭据形合成值 ≤20 字符(域数据字符串不在射程,长度边界用例照跑)。Result:建模申报+逐件行号+测试数字+说明书申报+未做项。冲突停线举证。

## Result

> from: codex(builder) | date: 2026-09-19 | needs: HQ（未绿项与最终验收）

装订段、双页码、六槽与折缝实现已交工作树。`done` 只表示 builder 已交付实现和验证回执，**不表示验收放行**。没有 git 写操作或 commit。非 git/secrets 的 **23 组件已全部执行，最终 21 PASS / 2 FAIL**；git 检查与 secrets 扫描两组件留 HQ，未宣称完整 `verify:v2-bn8-runtime` 已绿。未发现需要变更本单合同的冲突；现有门断言不一致和环境阻塞分别列在下文，未越界改掉。

### 建模与考古申报

先读 `documentPageFlowService.ts:114` 与 `hooks/useNotePageFlow.ts:11`，再接其当前机械页序列，二者零修改。扩展现役 `pageFrameSlotService`：六位置 entries + 同对象兼容别名，统一枚举避免重复渲染；没有第二套槽系统。CodeGraph/rg 在本环境不可调用，采用限定目录 PowerShell 考古，未重建索引。

Migration 顺延为 **079_v14_note_binding**；唯一新增存储为 **notes.binding_settings_json TEXT DEFAULT NULL**。既有笔记不回填，每次读 null 即投影单默认段，页上零新增存储。设置 version=1，enabled=true、dropFolioOnCover=true；默认段 startPage=1，手填槽与页码开，页码 startAt=1 / arabic / footer-center，前后缀空，六槽文案空、偏移 0、style={} 继承皮。段仅存 startPage，结束于下一段起点前一页，末段延伸尾页；超出现有页数的段界保留但不制造页。**完整字段 / 限制 / 默认值表**见 [server-model.md](../../audits/2026-09-19-a2-binding-builder/server-model.md)。

新增独立人用 `GET/PUT /api/notes/:id/binding-settings`；通用 Note GET/list/PUT 和 Agent 工具响应保持旧形状。保存复用原 data adapter 的 `writeRegistry.hold`，没有改写门或注册表；同笔记串行保存、异步响应隔离与重试均有测试。封面只预留机械第 0 页 / isCover 静默入口，不创建 A3 封面页。

### 逐件行号

以下 client 路径相对 `client/src/pages/Notes/canvasEngine/`；更完整接线表见 [implementation.md](../../audits/2026-09-19-a2-binding-builder/implementation.md)。

| 交付 | 定位 |
|---|---|
| 设置形状 / 默认工厂 | `shared/types/noteBinding.ts:36`, `:46`, `:54`, `:67` |
| migration / 校验 / 人用 API | `server/src/db/migrations/079_v14_note_binding.ts:4`; `server/src/validators/noteBinding.ts:40`; `server/src/routes/noteBinding.ts:10` |
| 段界 / 三制式 / 前后缀 / 封面钩子 / 六槽换槽 | `pageFrameSlotService.ts:59`, `:78`, `:191`, `:249` |
| A1 自动重投影 | `engineModel.ts:195`, `:363`; `pageFrameSlotService.test.ts:165` |
| 独立设置读 / 保存顺序 / 设置面 | `hooks/useNoteBinding.ts:9`; `hooks/useNoteCanvasDataAdapter.ts:910`; `layers/NoteBindingPanel.tsx:11`; `layers/NoteChromeLayer.tsx:450`, `:759` |
| 皮 token / 槽覆写 / 打印 Overview 同源 | `layers/PageFrameSlotsLayer.tsx:7`; `layers/NoteReadOnlyPageContent.tsx:44`; `layers/NotePrintLayer.tsx:52`; `layers/NotePageThumbnail.tsx:40` |
| 折缝开合 / Web 隐藏 / 原始打印几何 | `pageFramePresentationService.ts:5`; `layers/NotePageGapLayer.tsx:4`; `layers/ViewOptionsMenu.tsx:82`; `layers/NoteRuntimeDocumentLayer.tsx:59` |
| 跨缝 manual 拖动反解 / 显示 / 墨水保持原帧 | `layers/NoteWritingSurfaceLayer.tsx:475`, `:1345`, `:1615`; `hooks/useBlockPlacementInteractions.ts:150`, `:166` |

折缝只压缩页帧间正 gap，保留页高和四界墙，状态属于当前笔记阅读视图；Web 隐藏开关。打印/Overview 缩略图使用原始帧和同一槽投影。最后复核修复了跨折缝拖动少计间隙的问题；手势先还原 canonical y 再走原局部坐标与保存路径，未改 page_frame_local 契约。详情及手势实测见 [fold-evidence.md](../../audits/2026-09-19-a2-binding-builder/fold-evidence.md)。

### 测试数字与未绿证据

- **client 最终全库：188 文件，1896 / 1896 tests 通过，0 排除**。最终 client noEmit、build 均 exit 0，runtime boundary **175 checks** 通过。槽服务 18 例；折缝初轮 7 文件 / 86 例，最终手势补验 3 文件 / 56 例，均包含在全库内，不叠加计数。
- **server 全量：96 个 inventory 文件全部尝试，0 排除**。主套件 77 文件首次 749 tests / 744 pass / 5 fail，3 个 IPC 文件按原 wrapper 复验恢复；其余 19 文件首次 193 / 183 / 10。修复本次 Note 输出形状回归后，A2+Note/MCP 四文件复验 **75 / 75** 通过；A2 六项+既有定向 **21 / 21** 通过。各轮范围重叠，不能相加为唯一测试总数。
- server 最终剩 **4 文件 / 6 个未通过执行节点**：`v2SourceMineruWiring.test.ts:60` Python ENOENT 模块加载失败；`v2SourceRegionCells.test.ts:183`（调用 `:203`）旧 Python venv 启动失败；`v2McpArtifact.test.ts:56`, `:114` 两个正式构建叶子失败；`v13BoardWave1.test.ts:129`（断言 `:155`）和 `:163`（失败 `:165`）旧回执缺 `0 stickies` 的断言及连锁失败。Board 父 test 汇总不另计；未注册 / 未到达的测试不算通过。
- **非 git/secrets 的 23 组件：21 通过、2 未通过**。① `smoke:canvas-engine-model-contract` 的 `canvasEngineModelContractCheck.ts:1642` 仍期待短页 400 抬至 1278，而现物返回 400；门与 `pageFramePrintScaleService.ts:99` / `pageFrameService.ts` 均无本单 diff，未放宽旧门或改分页规则。②正式 server `build` 缺 shared 新声明 TS6305；前置 shared build 写 `shared/dist` 遇 EPERM。任务目录同源 noEmit 通过只是补证，不替代正式 build。
- 文档门通过；说明书 **`current-state/app-operating-manual.md:31` 起六条**已补装订入口、段界、模板槽、两层样式、API/封面预留、折缝/Web/打印用法。INDEX 只按现役生成脚本同步来源元数据。

蒸馏账本：[verification.md](../../audits/2026-09-19-a2-binding-builder/verification.md)；建模及 server 精确失败名字见 [server-model.md](../../audits/2026-09-19-a2-binding-builder/server-model.md)。原始日志全留 `.codex-tmp/a2-binding/`，初跑 gate 结果为 `gate-results.json`，最终复验映射为 `gate-results-final.json`；client 为 `client-full-final.log`，server 为 `server-full.log` / `server-remaining.log` / `server-contract-regression.log`。未把重复执行数字合并包装全绿。

### 未做与 HQ 接手项

未做 A3 真封面页、自动章名、中文数字、发布前默认关闭切换、浏览器像素或 Henry 主观验收。未动 Relation 域、写门实现、Agent 注册/能力清单、TextFlow 真相 schema、page_frame_local 九条；没有新依赖或新安全对抗测试。新增凭据形合成值在 ≤20 字符范围，域字符串及正常长度边界用例照跑。

HQ 接工作树并处理上述未绿项，补 git/secrets 两组件后再定放行；本单没有 commit / push / PR / git 写入。上游设计档反向同步和验收归 HQ。
