> **状态 (Status)**: done(builder 一轮交付+HQ 收口全绿,2026-09-19:client 199 文件 2014/2014 亲跑定案;git diff --check+secrets(63 文件)双门绿;server 余 2 红=Python/MinerU 环境基线;契约 amendment 落 docs/contracts/TextFlow-Contract.md:177 冻结正文零改;实浏览器走查并入下次纸面线冒烟)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-19
> **单号**: V14 纸面线 · A4 heading 角色+章投影+导航标题树
> **上游**: `design/note-page-design.md` §1.2(树:章节结构,全拍)+ 09-12 规划场 §四/§六/§八(heading=writing_role 三级/章=派生域⛔实体容器/单行标题块方案已消解「块中 heading」细则)+ F17 先例通道(writing_role 扩展=契约 amendment,正文随实装单铸进契约)+ 导航窗格现物(壳+页面/搜索两签已落,09-13 nav-pane 单;标题树签=本单)+ A1 页流/A3 封面已入库。**设计裁量已完成,照拍施工⛔重开设计。**

# A4 · heading 角色+章投影+导航标题树

**性质**:纸获得章节骨架。铁律三句:**树是内容,页是容器**(章零页概念);**章=派生域**(从标题块到下一同级标题块之间的块序列,⛔实体容器⛔「块属谁章」第二真相——Word .docx 无章容器为证);**显示归部件,真相归流**。

## 一 · heading 角色(TextFlow 契约 amendment,明门)

1. writing_role 封闭枚举扩 **heading_1/heading_2/heading_3**(⛔新块型;标题=单行 heading 块,存储仍 unit writing_role);
2. **本单对「⛔动 TextFlow 真相 schema」开一扇明门且仅此一扇**:walking F17 先例通道——amendment 正文随本单铸进 TextFlow 契约文档(builder 找到契约现档,补 amendment 节,申报路径与措辞);其余 TextFlow 真相仍⛔;
3. 输入路径:行首 `# `/`## `/`### ` 即立章(TF-05 域,打 # 立章即分裂);斜杠菜单 /h1/h2/h3;既有段落可升格/降格/还原为正文;
4. 字级行高:heading 按既有 15/22 默认比例派生三级(皮 Typography 四参联动),⛔硬编码孤值。

## 二 · 章投影服务(一等派生对象)

1. **纯派生**:输入=块序列(heading 单元位置),输出=章树(层级由 heading 级别推断,实叶推枝);零新表零新列,重算即新;
2. UI 与 Agent 同吃一份投影:本单只接 UI 消费者;**Agent 章级动词⛔本单**(接口留净,归 14.3/14.4 批);
3. **删标题块=章解散**(内容归上一级,零删内容);**拖标题把手=搬整章**(展开为既有块级移动的批量,走现役撤销栈);
4. 呈现部件化:章编号(可开关)/折叠箭头(折叠=呈现态⛔真相)/章锚——显示归部件,⛔视觉容器箱;
5. 章折叠与 A1 分页共处方案申报(折叠章不参与排版时页序列如何重算——纯呈现层处理优先)。

## 三 · agenda 聚合投影+导航标题树签

1. agenda=heading 单元聚合投影(零新真相),供封面/目录消费的干净接口(目录页本身⛔本单);
2. **导航窗格补第三签「标题树」**:章投影服务供给,点击跳章锚,当前章高亮;窗格壳与页面/搜索两签现物零改;
3. 标题树随编辑实时刷新(与页面签同源的刷新机制,⛔轮询)。

## 四 · 验收与禁区

1. 定向:heading 三级输入路径(#/斜杠/升降格)+契约 amendment 文本落档+章树推断(多级/缺级/首块非标题)+删标题解散零删+搬章批量与撤销+折叠呈现+agenda 聚合+标题树签跳转高亮;client 全库+server 全量;既有回归零破(A1 分页跨片/A2 装订/A3 封面(封面档白名单⛔heading?申报封面页与 heading 的关系——建议封面白名单不含 heading,照 §四.2 白名单原文)/打印 Overview/墙九条);
2. **说明书义务**:`current-state/app-operating-manual.md` §一 更新(heading 用法替换「章题暂用【】段落」旧条目);
3. 证据落 `docs/audits/2026-09-19-a4-heading-builder/`(蒸馏件),原始日志留 `.codex-tmp/a4-heading/`;
4. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 `.git` 目录);**只读 git 子命令明文允许**(含验证门脚本内部调用);`verify:v2-bn8-runtime` 的 git 检查+secrets 扫描两组件留 HQ 收口,其余组件照跑并按「非 git/secrets 的 N 组件」申报,⛔宣称完整门已绿;⛔碰 Relation 域/写门/注册表/Agent 机关(章级动词留接口⛔接线);TextFlow 真相除本单 §一 明门外仍⛔;⛔动 page_frame_local 坐标契约九条;⛔新依赖;⛔新设计安全对抗类用例(射程=只禁新设计对抗用例;既有功能回归含全库整跑明文允许,零排除);builder 新造凭据形合成值 ≤20 字符(域数据字符串不在射程,长度边界用例照跑)。Result:amendment 申报(契约路径+措辞)+章投影数据形+逐件行号+测试数字+说明书申报+未做项。冲突停线举证。

## Result

Codex builder · 2026-09-19。施工与证据已留工作树，未做 git 写操作或 commit；放行仍归 HQ。

- **契约 amendment**：`docs/contracts/TextFlow-Contract.md:177`，新增 `Amendment — 2026-09-19 · V14 A4 heading roles and derived chapters`。核心措辞为 “The closed `TextUnit.writing_role` union additionally accepts `heading_1`, `heading_2` and `heading_3`.” 以及 “There is no persisted chapter identity, parent, membership, page association or agenda copy.” 历史 frozen 正文未改，其他 TextFlow 真相 schema 未扩。
- **标题**：三级前缀、`/h1 /h2 /h3 /body`、升降格、Enter/Shift+Enter 后正文、粘贴/拖入/跨块选区及多行 draft 均接既有单元拆分/转移入口，单硬行标题独立块；同一现役 undo entry。Typography 按原 15/22 四参比例派生。定位 `headingInputService.ts:9`、`hooks/useHeadingStructureController.ts:24`、`typographyMeasurementService.ts:15`（均在 `client/src/pages/Notes/canvasEngine/`）。
- **章投影**：`chapterProjectionService.ts:40` 输出 `{roots, chapters, agenda}`；节点 `{id, blockId, unitId, level, title, parentId, number, children, startIndex, endIndex, blockIds}`。id/range 全派生，不储存归属。删独立标题块只解散章；标题把手批量移动块序与必要 placement，沿用现役撤销栈。编号/折叠是会话呈现，Agent 只留纯接口。
- **分页与导航**：`hooks/useNotePageFlow.ts:75` 折叠单算阅读 plan，完整 plan 仍持久化 affiliation 并供搜索/打印；保留既有空页。`layers/NoteNavigationHeadings.tsx:60` 接标题树，事件刷新无轮询；点击先展开祖先再跳转、滚动高亮。Pages/Results 界面保留，隐藏正文仍可搜索。逐件行号与 manual 跨页 affiliation 边界详见[蒸馏证据](../../audits/2026-09-19-a4-heading-builder/README.md)。
- **封面/说明书**：内容面 heading 控件与章消费者排除 cover resident；现有服务端白名单仍按 text 家族，不增加服务器 role 写规则。`current-state/app-operating-manual.md:24` 已替换「章题暂用【】」旧条目。
- **验证**：client 全库 **199 文件 2014/2014**；client/server 正式 build 通过。runtime 门拆跑 **非 git/secrets 的 23 组件**，逐项退出码见证据目录 `validation.json`，不宣称完整门绿。定向：章投影 11/11、搬章真实撤销 13/13、导航 52/52、折叠导出 5/5、服务端 text-save 26/26（新增三级角色 3 项）；其他输入/历史证据见 README。
- **服务端全量仍红**：已完整运行 `test:v2`，首轮 767 项 763 pass / 4 fail；两项 Node IPC flaky 由既有 wrapper 重跑通过，另两项 Python/MinerU 环境失败各自重跑复现。`python.exe` 为 ENOENT，固定 venv 退出 101，其基础 Python 单独启动为 EPERM；相关测试/产品/环境未改。不得将这轮写成全量绿。
- **未做**：Agent 章级动词、Relation/中央写门/注册表、新表新列、目录页、新依赖、git 写操作、commit 均未做。无新增安全对抗用例或凭据形合成值。实浏览器验收被本地登录墙阻塞，未登录或操作账号；测试 Vite/标签页已关闭。HQ 仍需 git/secrets 双门与主观验收。早期子任务误跑过一次只读 `git diff --check`，未计入本次门证据；secrets 未跑。

原始日志：`.codex-tmp/a4-heading/`。蒸馏证据：`docs/audits/2026-09-19-a4-heading-builder/`。本次未发现需要按工单冲突停线的依据；实现中发现的普通功能缺口均修复后重验，环境与验收未完成项如上保留。
