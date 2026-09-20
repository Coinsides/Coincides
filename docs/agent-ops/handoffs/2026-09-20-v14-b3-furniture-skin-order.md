> **状态 (Status)**: done(builder 一轮交付+HQ 收口全绿,2026-09-20:client 215 文件 2210/2210 亲跑定案(含 HQ 的 headrule token 改名);git diff --check+secrets 双门绿(sk- 长串假阳性以改名根治,⛔放宽扫描器);server 余 2=Python/MinerU 基线,wilderness 27/27 复跑恢复)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-20
> **单号**: V14 组件墙 · B3 部件三件+绢本皮+去盒卫生(小合单)
> **上游**: 09-11 设计日 §一(去盒纪律,Henry 拍病根)+§五(部件节制线)+ 09-12 §三(表头分隔线入部件注册表首批)+ `plans/v14-remainder-roadmap.md` N4(引文块/提示框=部件注册表两行块样式)+N5(绢本·汝青皮移植,Henry 拍「按样本作为目标」)+ 宋史手册基准件(引文块/冷知识框/整套 token 为样张)+ 皮系统现物(B1a 九 token 三级挂点+四预设)。**设计裁量已完成,照拍施工⛔重开设计。**

# B3 · 部件三件+绢本皮+去盒卫生

**性质**:三件小活合单,全部纸面外观域,零新真相表。

## 一 · 部件注册表三行(块样式,⛔新块型)

1. **引文块样式**:段落块的样式变体(存 display/样式标志位,申报存法——建议挂现役 display_overrides 族⛔新列):左缘印章徽(「引」字签,token 化)+浅底纹+右对齐出处行(纯文本);宋史手册引文块为视觉样张;
2. **提示框样式**:段落块样式变体:虚线边框+标签词(默认「注」,可改,纯文本)+浅暖底;宋史手册冷知识框为样张;
3. **表头分隔线部件**(09-12 §三 已拍):表头带下缘分隔线可见性/长短/样式三开关,吃 palette,默认值由皮定;墙贯穿⛔调长短;
4. 三件全走 token(⛔hex),亮暗两份;导出/打印跟随。

## 二 · 出厂皮第五预设「绢本·汝青」(N5,白捡件)

1. 按皮系统纪律(九 token 三级挂点)新增出厂预设,取值从宋史手册 token 系统移植(亮暗两份):
   - 亮:桌面 #e7dfcf/纸 #faf5e9/墨 #2d2418/弱墨 #6a5c46/强调 #5f8f81(汝青)/批注金 #9a7016/发丝线 #d8cbae/危险 #a63b2a(朱);
   - 暗:桌面 #17130e/纸 #f2ead7(纸在暗桌上保持暖亮,与现役暗皮同法)/发丝线 #d2c4a2;墨族沿亮值;其余同族微调申报;
2. token 值进预设表与「默认/静墨/暖纸/工作台」同列;⛔动既有四预设一字;命名「绢本」或「汝青」builder 择一申报(UI 显示名);
3. 预设卡缩略示意随现役机制自动生成。

## 三 · 去盒卫生工程(09-11 §一 B 静墨纪律,已拍待施)

1. **射程=笔记页 chrome**(Note Actions 菜单及笔记页内浮层/面板;⛔全应用大扫除——那是收口视觉大检的事);
2. 五条处方逐条落:容器只许一层皮(嵌套框拆)/条目是行不是卡/分组用间距与发丝线/悬浮用极淡底色/危险项用颜色不用边框;
3. 纯 CSS/结构微调,零行为变;改前后截图对比入证据。

## 四 · 验收与禁区

1. 定向:两样式变体存取往返+渲染 token 断言+表头分隔线三开关+新皮预设亮暗切换+四既有预设零变+去盒点位前后对比;client 全库+server 全量;既有回归零破(A1-B2 七砖/皮引擎/部件层);
2. **说明书义务**:`current-state/app-operating-manual.md` 补引文/提示框用法一条;
3. 证据落 `docs/audits/2026-09-20-b3-furniture-builder/`(蒸馏件+去盒前后截图),原始日志留 `.codex-tmp/b3-furniture/`;
4. **禁区(全部带射程)**:⛔一切 git 写操作(add/commit/push/reset/改 `.git` 目录);**只读 git 子命令明文允许**(含验证门脚本内部调用);`verify:v2-bn8-runtime` 的 git 检查+secrets 扫描两组件留 HQ 收口,其余组件照跑并按「非 git/secrets 的 N 组件」申报,⛔宣称完整门已绿;⛔碰 Relation 域/写门/注册表/Agent 机关;⛔动 TextFlow 真相 schema;⛔动 page_frame_local 坐标契约九条;⛔新依赖;⛔新块型⛔新真相表;⛔新设计安全对抗类用例(射程=只禁新设计对抗用例;既有功能回归含全库整跑明文允许,零排除);builder 新造凭据形合成值 ≤20 字符(域数据字符串不在射程,长度边界用例照跑)。Result:样式存法申报+皮 token 表+去盒点位清单+逐件行号+测试数字+说明书申报+未做项。冲突停线举证。

## Result

2026-09-20 · from: codex(builder) · 实现交付,工作树交 HQ。**未 commit、未进行任何 git 写操作。server 全量仍有未通过项,本回执不构成放行。** 总证据：[builder.md](../../audits/2026-09-20-b3-furniture-builder/builder.md)。未遇到须改动禁区才能完成实现的工单冲突。

### 三件与存法

- 引文/提示框复用 placement `display_overrides_json.paragraph_furniture_v1`：`{variant:'quote',source:'纯文本'}` 或 `{variant:'callout',label:'注'}`。恢复正文仅删除该键、保留其他 overrides；现役 placement PUT 保存,既有历史通道一次撤销/重做。零新块型、列或正文真相。读写/展示几何 `client/src/pages/Notes/canvasEngine/paragraphFurniture.ts:15`；编辑器 `blocks/ParagraphFurnitureEditor.tsx:6`；token 装饰 `blocks/ParagraphFurnitureDecoration.tsx:5`；adapter `hooks/useNoteCanvasDataAdapter.ts:1773`；history `hooks/useParagraphFurnitureHistory.ts:6`（后四路径均相对 canvasEngine）。长段分页共用 A1,首片字签/标签、末片出处；每片保守预留出处高度,长出处会增加留白。
- 表头线沿 `skin.components.headerRule`,增加可选 `headerRuleLength(full/content/short)`、`headerRuleStyle(solid/dashed/dotted)`；现役三级 skin/suite JSON 存取。`client/src/styles/skinComponentStyles.ts:5`、`canvasEngine/layers/NoteHeaderSeparator.tsx:5`；纸面/打印同件、同 hairline token。长短不改四界墙。逐件行号与打印申报见 [header.md](../../audits/2026-09-20-b3-furniture-builder/header.md)。现役打印原无表头,无封面首张增加197px只读题名带并等比缩放该页正文；不改页数、flow plan、TextFlow 或持久坐标,后页比例不变。
- 第五预设枚举 `silk`,UI 名 **绢本**；`client/src/styles/skinPresets.ts:10`（暗）、`:14`（亮）、`:24`（部件默认）、`:29`（名称）。旧四皮9行原定义字节一致（仅归一行尾）,原证据 `skin-preservation.log`。九基础 token 如下；现役板四token申报同桌/纸/汝青,粉笔亮用墨、暗用暖亮纸。完整表与三级挂点考古见 [skin.md](../../audits/2026-09-20-b3-furniture-builder/skin.md)。

| token | 亮 | 暗 |
|---|---|---|
| desk | #e7dfcf | #17130e |
| paper | #faf5e9 | #f2ead7 |
| ink | #2d2418 | #2d2418 |
| ink-muted | #6a5c46 | #6a5c46 |
| accent | #5f8f81 | #5f8f81 |
| annotation | #9a7016 | #9a7016 |
| hairline | #d8cbae | #d2c4a2 |
| danger | #a63b2a | #a63b2a |
| wall | #d8cbae | #d2c4a2 |

服务端正向套装测试发现旧072 CHECK只认四皮,新增 `server/src/db/migrations/080_v14_silk_skin_material.ts:9` 仅扩现役外观列枚举。历史072未改,原七列/行/rowid/索引/trigger/外键保留,临时替换表执行后消失,零新增逻辑真相表。用户运行中的服务未重启,下次按原流程启动会加载080。

### 去盒与说明书

Note Actions/Layout/导出/垃圾箱、Annotation/Context、工具条/Slash/Tray、SkinFloatCard、装订、表格/时间线/图表编辑、Navigation 共13组前后图。实施为7 CSS+1个危险样式class,零handler改动；五处方逐项落地。逐点文件行号见 [chrome.md](../../audits/2026-09-20-b3-furniture-builder/chrome.md)。前11组改前拍摄,Tools/Navigation用原CSS基线补拍,均为真实组件本地fixture；HTTP持久性另由服务端回归覆盖。Relation/ContentGroup共面部分依禁区不动。

说明书已更新 `docs/agent-ops/current-state/app-operating-manual.md:37` 三条：入口/取消保存/撤销、存法/分页、绢本/表头/首张打印差异。

### 验证与未做项

- 家具/分页/历史定向3文件31例PASS；最终家具+Chrome 2文件28例PASS。皮定向5文件62例+服务端6例PASS；表头/A3/A5定向7文件88例PASS。
- **client全库215文件、2210/2210 PASS、零排除**。最终用workers=2,未改timeout或测试配置；初次高并发失败及本次测试兼容修复的原日志全部保留。
- 服务端**101文件零排除执行**：test:v2的82文件主批761项757过/4失败（其中2个Node IPC文件自动重跑59/59、25/25恢复）；其余19文件补集167项164过/2失败/1取消。两条本次编译失败已修复,最终B3+McpArtifact6/6通过且client/server build均PASS。Wilderness先前120秒取消,后独立原文件以600秒上限复跑：**27/27 PASS,耗时459.059秒,零失败/取消/跳过**,源码与测试未改。最终仅余MinerU两项Python启动失败（ENOENT、Access denied）。精确日志与口径见 [paragraph-server.md](../../audits/2026-09-20-b3-furniture-builder/paragraph-server.md)；**不宣称server全量已绿**。
- `verify:v2-bn8-runtime` 按§四.4拆成**非 git/secrets 的23组件,23/23 PASS**；docs-index已生成,inventory无变化,docs检查整链通过。逐项/历次退出码在 `.codex-tmp/b3-furniture/gate-summary.json`。git检查与secrets扫描两项留HQ,**不宣称完整门已绿**。
- 未修改Relation、工具注册表、Agent机关、TextFlow schema、page_frame_local九条、权限操作指令；无新依赖、新设计安全对抗用例或长合成凭据。全应用扫除、主观验收、git/secrets与最终放行均未做。

原始日志：`.codex-tmp/b3-furniture/`；蒸馏证据、13组去盒对照及家具亮暗/跨页/打印截图：`docs/audits/2026-09-20-b3-furniture-builder/`。
