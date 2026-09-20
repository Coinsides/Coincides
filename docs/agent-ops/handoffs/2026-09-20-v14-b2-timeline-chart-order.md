> **状态 (Status)**: ready(HQ 按代理权翻牌;上游全拍)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-20
> **单号**: V14 组件墙 · B2 时间线件+图表件 v1(组件块第四族首批)
> **上游**: `design/note-page-design.md` §1.3(组件族=修宪记录一,随行法四条;判据「行为独异才配当块型」——时间线折叠交互/图表数据绘制均过判据)+ 方向档修宪记录一(组件块入籍类型系统)+ 产房三段律(骨/皮/实参=组件 payload 通用格式)+ 宋史手册基准件(时间线七条/财政柱图为阳性样张)+ B1 表格块先例(媒体族建模链路,commit 15f36573)。**设计裁量已完成,照拍施工⛔重开设计。**

# B2 · 时间线件+图表件 v1

**性质**:组件块第四族的**首批两名内置公民**。⛔产房⛔OpenDesign 接线——这两件是手工闭集内置件(第四族的地基验证),自由组件候产房批。

## 一 · 组件块族地基(第四族入籍,一次立法两件受益)

1. 新 block_type `component`(第四族;修宪记录一已铺),`content_json` 照产房三段律:`{ component_kind: string, params: object }`(骨=component_kind 指向内置注册项;皮=渲染取 token;实参=params);
2. **内置件注册表(手工闭集)**:v1 仅 `timeline`/`chart_bar`/`chart_line` 三 kind;未知 kind=占位渲染(显示 kind 名+「未注册组件」)⛔崩;⛔任何动态加载⛔自由 HTML;
3. 分页:照 A1 媒体规则(整块不裂/顶爆下移/超高独占);
4. read_note 投影:照 B1 先例走现役 schema(kind 照实,text 键装扁平化内容;结构化槽记账 C 波);
5. 检索:组件内文本(时间线条目/图表标签与标题)入现役检索面。

## 二 · 时间线件(timeline)

1. params=`{ title?: string, entries: [{ year: string, label: string, detail?: string }] }`(上限申报,建议 ≤64 条);
2. 渲染:纵向轴线+年份铅锤+条目标签,detail 折叠展开(呈现态⛔真相);token 化(轴线=发丝线族,年份=强调色族);
3. 编辑:浮层编辑器(增删条目/上下移/逐字段编辑),入现役撤销栈;
4. 阳性样张:宋史手册第一章年表(960-997,13 条)等价内容自铸夹具。

## 三 · 图表件(chart_bar / chart_line)

1. params=`{ title?: string, x_labels: string[], series: [{ name: string, values: number[] }], y_label?: string }`(series ≤4,点数 ≤32,校验申报);
2. 渲染:SVG 同一坐标系(轴/刻度/图例/数值标注),token 配色(⛔hex;系列色从皮的强调/中性族派生申报);分组柱状与折线两种 kind 共用轴系;
3. 编辑:浮层编辑器(表格式数据网格编辑 x/series,增删列与系列),入撤销栈;
4. 阳性样张:宋史手册「岁入的换血」(三期两系列分组柱)等价数据自铸夹具;
5. ⛔自由图表 DSL⛔第三方图表库(⛔新依赖照旧)。

## 四 · 验收与禁区

1. 定向:第四族建模+未知 kind 占位+两件 params 校验边界+编辑器全动作+撤销+分页三态+打印导出 Overview 同源+检索命中+两张阳性样张复刻渲染;client 全库+server 全量;既有回归零破(A1-A5/B1/媒体族/墙九条);
2. **说明书义务**:`current-state/app-operating-manual.md` §一 补组件块条目(含「内置件=闭集,自由组件候产房」边界);
3. 证据落 `docs/audits/2026-09-20-b2-component-builder/`(蒸馏件),原始日志留 `.codex-tmp/b2-component/`;
4. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 `.git` 目录);**只读 git 子命令明文允许**(含验证门脚本内部调用);`verify:v2-bn8-runtime` 的 git 检查+secrets 扫描两组件留 HQ 收口,其余组件照跑并按「非 git/secrets 的 N 组件」申报,⛔宣称完整门已绿;⛔碰 Relation 域/写门/注册表/Agent 机关(read_note 走现役 schema,零新键);⛔动 TextFlow 真相 schema;⛔动 page_frame_local 坐标契约九条;⛔新依赖;⛔新设计安全对抗类用例(射程=只禁新设计对抗用例;既有功能回归含全库整跑明文允许,零排除);builder 新造凭据形合成值 ≤20 字符(域数据字符串不在射程,长度边界用例照跑)。Result:第四族建模申报+两件 params 校验表+逐件行号+测试数字+说明书申报+未做项。冲突停线举证。
