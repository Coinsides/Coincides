> **状态 (Status)**: done(builder 二轮施工交工作树；client 209 文件 2109/2109；非 git/secrets 23 组件分次验证；server 两项 Python 环境红、HQ 双门与放行待收口)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-20
> **单号**: V14 组件墙 · B1 表格块 v1(媒体族第二客户)
> **上游**: `design/note-page-design.md` §1.3(类型表冻结四族,**媒体族=image/table——table 早已在冻结表内,零修宪**;此处勘误 `plans/v14-remainder-roadmap.md` N1 的「第四族组件承载」记载,以设计档为准)+ 宋史手册基准件(新法表/对照表为阳性样张)+ A1 分页规则(媒体块整块不裂)已入库。**设计裁量已完成(N1 方案要点经族别勘误后全部保留),照拍施工⛔重开设计。**

# B1 · 表格块 v1

**性质**:笔记获得原生表格。媒体族第二客户(image 之后),⛔动 TextFlow——单元格=纯文本 payload,单元格内 TextFlow/item 锚归 V15+。

## 一 · 块型与 payload

1. 新 block_type `table`(媒体族;冻结类型表已含,零修宪):`content_json` 载 `{ caption?: string, headers: string[], rows: string[][] }`,单元格纯文本(至多换行);申报尺寸上限(建议行列各 ≤64、总字符预算申报)与校验;
2. ⛔公式⛔合并单元格⛔列类型 v1;
3. server:validators/hydration/read_note 投影形状申报(Agent 读面看到结构化表,零新动词零机关接线);检索:caption+单元格文本入现役检索面(接线点申报)。

## 二 · 编辑与导入

1. 双击开简易编辑器(浮层):单元格编辑、增删行/列、表头行开关;Esc 取消 Ctrl+Enter 保存;
2. **CSV/TSV 粘贴导入**:编辑器内粘贴多行制表/逗号文本自动解析成网格(解析规则申报;引号包裹逗号的常见 CSV 情形处理或明报不支持);
3. 全部结构与单元格编辑入现役撤销栈。

## 三 · 渲染与分页

1. token 化样式(皮联动零 hex):表头行加重底纹、发丝线行界、隔行可读;字级低于正文一级;
2. 列宽自动;**宽表块内横向滚动**(⛔纸面横滚);
3. 分页:照 A1 媒体块规则——整块不裂,顶爆下移,超高单页独占+结构化溢出申报(⛔跨页断行 v1);
4. 打印/导出/Overview 同源(共用 flow plan;打印态横滚表按块宽裁切申报方案)。

## 四 · 验收与禁区

1. 定向:payload 校验边界+编辑器全动作+CSV/TSV 导入+撤销+分页三态(正常/下移/超高独占)+打印 Overview 同源+检索命中;**阳性样张=宋史手册「熙宁新法表」**(9 行 3 列中文,builder 以等价内容自铸夹具)复刻渲染;client 全库+server 全量;既有回归零破(A1-A5 五砖/媒体 image 块/墙九条);
2. **说明书义务**:`current-state/app-operating-manual.md` §一 补表格块条目;
3. 证据落 `docs/audits/2026-09-20-b1-table-builder/`(蒸馏件),原始日志留 `.codex-tmp/b1-table/`;
4. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 `.git` 目录);**只读 git 子命令明文允许**(含验证门脚本内部调用);`verify:v2-bn8-runtime` 的 git 检查+secrets 扫描两组件留 HQ 收口,其余组件照跑并按「非 git/secrets 的 N 组件」申报,⛔宣称完整门已绿;⛔碰 Relation 域/写门/注册表/Agent 机关;⛔动 TextFlow 真相 schema;⛔动 page_frame_local 坐标契约九条;⛔新依赖;⛔新设计安全对抗类用例(射程=只禁新设计对抗用例;既有功能回归含全库整跑明文允许,零排除);builder 新造凭据形合成值 ≤20 字符(域数据字符串不在射程,长度边界用例照跑)。Result:payload 校验申报+逐件行号+测试数字+说明书申报+未做项。冲突停线举证。

## Result

**2026-09-20 · Codex builder · 停线（工单冲突，未实施，未完成）**

§一.3 要求 `read_note` 的 Agent 读面看到结构化表，但现役输出契约没有此槽，扩展必触 §四.4 的注册表禁区：

- `server/src/services/agentReadSurfaces.ts:78–112` 的块投影仅有 text/text_units、media、item_ref 等既有字段，没有 table/content_json 扩展槽。
- `server/src/toolFace/registry.ts:833–845` 定义 `readNoteOutputSchema`；第 837–842 行将单块键限定为 id/placement_id/kind/role/text/text_units/media/item_ref，并在第 842 行 `.strict()`；第 895–899 行将该 schema 绑定现役 `read_note`。
- `server/src/agent/tools/executor.ts:39–49` 证明该约束实际执行：第 44 行读取笔记，第 49 行经 `readTool.output_schema.parse(result)` 才返回。仅给读取服务增加结构化 table 键会被拒绝。

按「冲突停线举证」停止；没有用字符串化 text 或 TextFlow text_units 冒充表结构，没有擅改注册表或绕开输出校验。待工单消解 `read_note` 既有输出 schema 的扩展权限冲突再续工，原状态头保留，未标 done。

**申报**：产品代码改动 0，新增测试 0，运行测试 0；runtime gate 应为「非 git/secrets 的 **23 组件**」，本轮停线 **0/23 执行**，不宣称完整门绿。payload 的行列/总字符预算未实施、未验证；说明书未修改（功能未交付）；表格编辑/CSV/TSV/撤销/渲染/分页接线/打印导出 Overview/检索/9×3 阳性夹具及 client/server 验证均未完成。git 写操作与 commit 均为 0。

现物考古已记录 image 实际块型 `media` 的建模/校验/hydration、A1 整块处置和纸内检索入口；范围与逐件行号见 [停线证据](../../audits/2026-09-20-b1-table-builder/STOP-REPORT.md)。原始日志在 `.codex-tmp/b1-table/`，蒸馏件在 `docs/audits/2026-09-20-b1-table-builder/`。


## 补遗一(2026-09-20 · HQ 裁定:read_note 投影口径,消解 §一.3 × §四.4 冲突)

停线成立,合同缺陷在 HQ(义务撞禁区——与 A1 一轮停线同族的第二型)。裁定即时生效:

1. **§一.3 的「Agent 读面看到结构化表」收窄为 v1 口径**:表格块经**现役** read_note schema 投影——`kind` 照实(申报实际值),内容装进**既有 `text` 键**(扁平化:caption 一行 + 表头一行 + 逐行制表符分隔;格式申报),**零新键、零注册表改动、零 executor 改动**;
2. 结构化 table 投影槽(真 rows/headers 键)**记账给 C 波注册表批**(14.3/14.4 随行,届时注册表在射程内)——本单⛔碰;
3. 检索接线照旧(caption+单元格文本入现役检索面,与 read_note 无涉);
4. 其余条款原字不动。一轮停线 Result 保留为档;续派恢复施工,完工后另起「## Result(二轮)」。

## Result(二轮)

**2026-09-20 · Codex builder · 按补遗一完成施工，工作树交 HQ；环境验证余项明列，不代表放行。**

- **块型/payload**：`table` 属媒体族，模板 `media.table`；`content_json={caption?:string,headers:string[],rows:string[][]}`。1–64 列，0–64 数据行另可有表头，无表头至少一数据行；矩形且纯字符串；caption+headers+rows 合计 ≤65,536 UTF-16 code units，严格三键。创建/重放/更新校验与 generic hydration 已接。
- **read_note**：实际 `kind:'table'`，仅既有 `text` 扁平化。非空 caption 一行、存在 headers 则 TAB 分隔一行、rows 逐行 TAB 分隔；单元格/caption 内 CRLF、TAB、CR、LF 折为空格。严格 schema 实测通过，零新输出键、零注册表/executor 改动；结构化 table 槽留 C 波，本单未碰。
- **编辑/导入/历史**：Table 创建入口、双击浮层、caption/单元格、增删行列、表头升降、Esc 取消与 Ctrl/Cmd+Enter 保存；CSV/TSV 支持常见引号包裹/转义/换行、BOM、短行补空，错误保留原表。每次保存携全部结构与格子修改入现役撤销栈；创建与失败回滚也沿既有生命周期。
- **渲染/分页/读取**：token 皮联动、文档字号减一级、表头加重底纹、1px 发丝线、隔行轻底纹；宽表只在块内横滚。A1 媒体整块三态与 overflow 复用，Overview/打印/导出共享 flow plan 和表格组件；打印从左侧按块宽裁切。检索读取当前 caption/header/cell。九行三列中文样张、三皮同源静态 HTML 已交付。
- **测试数字**：新增客户端 43 项、服务端 9 项功能测试。client 最终全库 **209 文件 2109/2109**；UI **26/26**；集成+表格历史+既有历史 **22/22**；server B1 **9/9**。server 首次完整库存 **101 文件、1038 项，1035 pass / 3 fail**；其中模板清单缺 `media.table` 已修，定向 **59/59**，另两项 Python/MinerU 环境阻塞。未重跑 server 全量，不把分次数字折算成全量绿。
- **验证门**：非 git/secrets 的 **23 组件全部执行**；首轮 20 绿/3 红（client 初次负载超时、新集成测试类型漏项、文档索引陈旧），随后原样 client 全库、修复后的生产构建、索引同步后的 docs 检查分别补验；精确回执见蒸馏报告。git/secrets 两组件留 HQ，⛔宣称完整门绿。
- **实机与说明书**：隔离 v2 数据库亲跑 TSV 创建、完整 Overview、单元格搜索命中 Page 1、十列块内横滚、整次结构编辑撤销及刷新持久化。首次夹具误用默认 v1 的 72px 裁切已作为夹具问题记录，未改坐标契约。`current-state/app-operating-manual.md` §一新增五条表格操作/API/格式/边界说明。原生打印预览/PDF 未实机亲跑，打印证据为真实 NotePrintLayer 集成与同源几何/DOM/CSS。
- **未做/禁区**：两项 Python 环境验证、HQ git/secrets 双门和主观验收待收口；C 波结构化读槽未做。零 Relation/写门机制/Agent 机关/注册表/executor/TextFlow schema/坐标九条修改，零新依赖，零新设计安全对抗用例；新造凭据形合成值均 ≤20 字符。**git 写操作 0、commit 0**。

逐件行号、完整结果与局限：[BUILDER-REPORT.md](../../audits/2026-09-20-b1-table-builder/BUILDER-REPORT.md)、[SERVER-TABLE-EVIDENCE.md](../../audits/2026-09-20-b1-table-builder/SERVER-TABLE-EVIDENCE.md)、[UI-TABLE-EVIDENCE.md](../../audits/2026-09-20-b1-table-builder/UI-TABLE-EVIDENCE.md)。阳性件：[xining-table.html](../../audits/2026-09-20-b1-table-builder/xining-table.html)。原始日志：`.codex-tmp/b1-table/`。一轮 Result 与补遗一均保留。
