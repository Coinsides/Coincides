> **状态 (Status)**: ready(HQ 按代理权翻牌;族别按权威档勘误)
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
