> **状态 (Status)**: done(HQ 机补验+应用内实测通过,2026-09-16)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-16
> **单号**: V14 平行线 · 板视觉 v1(轻量便签+连线族+边标签+排版体检器)
> **上游**: `analysis/2026-09-16-board-visual-grammar-benchmark.md`(对标调研,v1 节全获 Henry 拍)+会议记录 2026-09-16 §三点五/§三点六(逐项拍板)+`field-notes/2026-09-16-specimen-001`(发端标本)。**设计裁量已全部完成,本单照拍施工⛔重开设计**。

# 板视觉 v1

**性质**:板(Board)的思考图能力升级,五件套。全部为板域(纯投影)工程;⛔碰 Relation 域⛔碰写门/注册表/Agent 机关。**板上的线=纯视觉,零存储语义**(Henry 铁拍,任何实现不得把视觉线接进 relations 表)。

## 一 · 轻量便签节点件(sticky)

1. 新板居民:**便签**——可连边的一等公民(⛔note/⛔item,零出处包袱,内容住板上);数据=新表(migration,含 board_id/text/x/y/w/h/color_index NULL/weight 1-3 默认1);⛔进材料库⛔进 item 域⛔可被 ContentGroup 引用("转正成笔记"候 v2);
2. 形态(照调研稿):定宽两档(方/宽),文字只纵向长高,字号恒定,正文 Medium 字重;默认**中性底**(`--bg-elevated` 级 token)+`--border-default` 描边——⛔随机派色;
3. 卡重三档渲染:轻(默认,中性)/中(浅底+描边)/重(实底+反衬字);v1 色槽=中性+现有 `--accent-primary` 单槽(六槽色值候设计场,数据字段 color_index 留位);
4. 边的端点家族扩展:边可连 member 与 sticky(端点=多态引用,申报建模方案);
5. UI:板工具栏加便签创建;双击编辑;删除=板域轻仪式(与现有 visuals 同级)。

## 二 · 连线族 v1(现有 edges 升级)

1. **线型=弧线一种**:两端点+bend 标量,bend=0 即直线(⛔单列直线型);渲染三点圆弧,单弯度手柄编辑;
2. 样式轴(全部封闭枚举,migration 扩 edges 列):`dash: solid|dashed`(默认 solid)/`weight: 1|2|3`(默认1)/`cap_start,cap_end: none|arrow|dot`(默认 none/none)/`color_index: NULL|…`(v1 渲染中性;NULL=中性);
3. **中性三档 token**:`--board-line-1/2/3` 挂现有 token 体系(1=`--border-subtle`,2=`--text-muted`,3=`--text-secondary`,亮暗各一份);线重与灰阶同向联动(粗的也更深);箭头/端点色永远随线色;
4. **端接与绑定**:默认绑整卡——朝对方中心瞄,出点=瞄准线与圆角矩形轮廓求交,箭头端回退小间隙;拖端点近卡→**淡色轮廓高亮**预告;Alt 拖=不吸附;已绑线有显式解绑;卡移动线自动跟随;
5. **锚位 v1**:每端存 `anchor: auto|n|e|s|w`(⛔像素坐标);悬停/选中时淡显四边中点把手,从把手起笔=钉该锚,线端拖近把手放大吸附;
6. **生成时避让**:建线时一次性计算——默认路径与非端点卡矩形相交→自动置 bend 绕开(选绕行短侧+呼吸边距),之后**永不自动重算**;边菜单加「重新取道」显式动作重算一次;⛔持续避让⛔肘线路由⛔避让曲线;
7. **样式惯性**:新线沿用上一条线的样式(会话内记忆即可)。

## 三 · 边标签 v1(现有 label 升级)

1. 标签属于线对象;双击线身即建/即编;
2. 锚定=0-1 沿线标量(默认 0.5),可拖,拖近中点吸回;**永远水平**⛔随线旋转;
3. 可读性=**标签矩形内断线**(绘制时跳过标签占据段,⛔垫底色映射);长标签 ~120px 自动折行;
4. 字级低于卡内正文一级,字色 `--text-secondary`;格式纯文本(至多换行)。

## 四 · 排版体检器(Henry 新立原则:生成只是初版,生成完必须检查)

1. 新服务(server 侧纯函数,吃板的几何投影):检测并报告——①标签×卡片重叠②标签×标签重叠③线穿非端点卡(未避让)④卡×卡重叠(超阈值)⑤线段近平行重叠;输出结构化报告(项目/坐标/严重度);
2. 挂法:内部 service+定向测试;**⛔阻断任何操作**——它是体检不是门;后续消费者(Agent 布线自检/评测场景)本单⛔接,只留干净接口;
3. 阳性对照:故意重叠夹具→逐类检出;干净板→零报告。

## 五 · 验收与禁区

1. 定向:①sticky 生命周期+连边②弧线/样式轴/锚位枚举③绑定求交+跟随④生成时避让(挡卡→bend 非零绕开;无挡→微弯默认;重新取道)⑤标签断线+滑动锚⑥体检器五类阳性对照;client 全库+server 全量;板既有回归零破(members/visuals/chalk/现有 edges 数据兼容——**既有边零 bend 零新样式照旧渲染**,migration 默认值申报);
2. **说明书义务**(防腐条款):§四板条目更新(便签/锚位/线族/标签用法+「铺概念图用便签⛔每节点一笔记」);标本 #001 去处栏可勾销项随附申报;
3. 证据落 `docs/audits/2026-09-16-board-visual-builder/`(只放蒸馏件,原始日志留 .codex-tmp);git/secrets HQ 收口;
4. ⛔碰 Relation 域/写门/注册表/Agent 机关;⛔新 Agent 动词(板写动词归 14.3 另单);⛔碰 .git;⛔commit;⛔新依赖;合成凭据 ≤20。Result:建模申报(sticky 表+端点多态+edges 扩列)+逐件行号+token 清单+测试数字+说明书申报+未做项。冲突停线举证。

## Result

**2026-09-16 · from: codex(builder) · 实现完成，验证阻塞，状态保留 ready。** 五件套按既定规格落地；尚不能标 done：server 全量有两项 Python 环境失败，证据如下。没有跳过失败测试或将其改成绿色，未更改系统环境/权限。git/secrets 仍留 HQ；未访问 `.git`、未运行 git、未 commit。

### 建模申报与既有数据兼容

- migration `server/src/db/migrations/078_v14_board_visuals.ts:9` 新增独立 `board_stickies`：`id/board_id/text/x/y/w/h/color_index/weight/layer_id/z_index/pinned/created_at/updated_at`。固定宽240/416，scale=1，纯文本上限12000；中性NULL/单强调槽1，重量1–3。不生成 note、Item、ContentGroup、材料库记录，也没有转正入口。旧粉笔及其既有流程保留。
- 同文件`:31` 重建板域 `board_edges`：member FK/sticky FK/自由点三者互斥；同板复合FK保证绑定归属与级联。API端点 `{kind:'member'|'sticky',id,anchor}` 或 `{kind:'point',x,y}`，旧 member_id 请求兼容；锚位 `auto|n|e|s|w`。**所有线只存板视觉数据，不接 relations 域。**
- 扩列 `bend/dash/weight/cap_start/cap_end/color_index/from_anchor/to_anchor/label_position/visual_version`。迁移旧边默认 `0/solid/1/none/none/NULL/auto/auto/.5/0`；保留原ID、两端member、style、label、created_at。version0按旧直线、颜色、线宽、箭头与标签渲染；显式编辑新视觉轴/端点/取道才升级version1，撤销可恢复旧版。
- **真实「实测·Agent 全家福·0916」13条旧边通过**：从readonly原库backup到临时隔离副本，仅在副本执行078；旧字段与新默认值逐条一致，FK错误0、重复迁移稳定。复查原库仍未迁移、13条边未变。另有客户端13边原渲染/无写入/重载回归。原始证据在 `.codex-tmp/board-visual-builder/server/real-board-migration-verification.json`。

### 逐件行号

| 项 | 定位 | 实物 |
|---|---|---|
| 便签 | `server/src/services/boards.ts:645`、`:652`；`server/src/routes/boards.ts:328`；`client/src/pages/Boards/BoardStickyCard.tsx:6`、`:19`；`BoardPage.tsx:1255`、`:1379` | CRUD、双击编辑、两宽三重、中性/强调、实测文字高度、删除/撤销/图层 |
| 连线族/锚位 | `shared/boardVisualGeometry.ts:37`、`:170`、`:256`；`server/src/services/boards.ts:574`、`:627`；`BoardPage.tsx:674`、`:695`、`:1403` | 单弧线/bend手柄、样式枚举、圆角求交、箭头间隙、四锚预告、Alt、显式解绑、创建避让/显式取道 |
| 边标签 | `client/src/pages/Boards/BoardVisualEdge.tsx:36`、`:55`；`shared/boardVisualGeometry.ts:97`、`:243`、`:297` | 水平纯文本/约120px折行、真实断线、滑动/中点吸回；单击与拖动分离 |
| 排版体检 | `server/src/services/boardLayoutInspector.ts:121` | 五类阳性及干净零报告；纯几何服务，结构化项目/坐标/严重度，无消费者/阻断 |
| 样式惯性/历史 | `client/src/pages/Boards/useBoard.ts:197`、`:225`；`boardCommandHistory.ts:283`、`:311` | 会话样式沿用、undo/redo、删便签恢复关联边与ID重映射 |
| Token/兼容 | `client/src/styles/global.css:191`、`:219`；`BoardVisualEdge.tsx:17`；`boardVisualTokens.test.ts:23` | 亮暗双份、板皮肤作用域解析、旧渲染隔离、无新hex |

表中无路径前缀的客户端文件均在 `client/src/pages/Boards/`。`server/src/validators/boards.ts:76`、`:118` 锁闭合枚举。几何server/shared字节一致并有测试锁定，符合已有server/shared运行时边界。

### Token 清单

新增25个，全部在现有 `global.css` 明暗两份；以下名称均含完整前缀 `--board-`：

| 后缀 | 值/现有token来源 |
|---|---|
| `line-1/line-2/line-3` | border-subtle / text-muted / text-secondary |
| `line-width-1/line-width-2/line-width-3` | 1.5 / 2.25 / 3.375 |
| `sticky-neutral-fill/sticky-border/sticky-text` | bg-elevated / border-default / text-primary |
| `sticky-medium-fill/sticky-medium-border` | bg-hover / text-muted |
| `sticky-strong-fill/sticky-strong-text` | text-secondary / text-inverse |
| `accent-1-line/accent-1-fill/accent-1-text` | accent-primary / accent-primary-bg / text-primary |
| `accent-1-on-solid` | 暗text-primary / 亮text-inverse |
| `binding-preview/anchor-fill/anchor-stroke/label-text` | accent-primary-bg-hover / bg-elevated / accent-primary / text-secondary |
| `sticky-font-size/sticky-line-height/label-font-size/label-line-height` | 16px / 24px / 12px / 16px |

### 测试数字与阻塞证据

- 客户端最终全库 **175文件、1784/1784 PASS**，build PASS；本单重点UI8+数据9+token3=20/20已包含于全库。
- 本单server定向 **40/40 PASS**（服务/API12+几何19+体检9），server类型检查PASS；既有板回归55/55、删除链16/16 PASS。
- server最终全量 `test:v2` **exit1**：初轮749项、744pass/5fail；既有wrapper对3个Node IPC故障文件各一次隔离重试49/49、59/59、12/12全过，剩下2个Python环境失败。不同批次数字未相加冒充独立用例。
- 未过① `server/src/__tests__/v2SourceMineruWiring.test.ts:59`：模块载入调用 `python.exe`，PATH中找不到，ENOENT。未过② `v2SourceRegionCells.test.ts:40`：硬编码 `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe`，`:128`直接执行、`:196`覆盖环境变量；其基础CPython当前EPERM/拒绝访问，venv退出101，没有可用参数在本工作区修复该绝对路径。原始日志 `server/full-server-final.log`、`server/python-environment-verification.json`（前缀 `.codex-tmp/board-visual-builder/`）。**需要环境所有者恢复可执行Python后复跑全量，再回收状态；本单不改无关测试来绕过。**
- 运行时门按 `verify:v2-bn8-runtime` 原顺序执行23个获授权npm子命令；初跑client build与生成文档检查问题已修复，相关复跑PASS。末尾git检查和secrets检查按本单明确分工未执行，留HQ收口，故不宣称完整门已绿。逐项原日志在 `root/runtime/`，最终合并清单 `root/verification-final.json`。
- 真数据副本13/13兼容PASS；Chrome内存夹具验证亮暗三档、弧线/端帽/标签真断线、拖卡跟线、便签编辑和换宽。240汉字换416宽：保存h298=DOM高298，正文264，字号16px、文字完整；不连接真实后端。复核发现的旧标签事件、单击误写、宽便签高度偏差均已修复并补回归。
- 新增服务测试复用2个合成身份/无真实凭据或JWT，浏览器使用已有synthetic-user；无新依赖。

### 说明书申报与未做项

`docs/agent-ops/current-state/app-operating-manual.md:43` 起已补便签、锚位、线族、标签、API、体检边界及「**铺概念图用便签，⛔每节点一笔记；真内容集中图例笔记**」。生成的 `docs/agent-ops/INDEX.md`、`docs/generated/object-inventory.md` 已刷新以通过docs:check。

标本#001去处申报：第一条说明书义务可由HQ勾销；第二条四项视觉产品输入已实现，14.3沙箱设计/Agent写入口另单；第三条评测候补未接；第四条九张空笔记物证保留。没有改标本原文件或清理真实数据。

按规格未做：六色槽、便签转笔记、持续避让/肘线、体检消费者/自动整理、新Agent动词、14.3接线、评测场景接线。单圆弧在端点被其他卡覆盖等不可避情形保留有限路径，由体检报告。未对原库执行migration、未做主观放行；完整server验证及HQ git/secrets仍待收口。

蒸馏证据：`docs/audits/2026-09-16-board-visual-builder/builder-summary.md`、`geometry-and-inspector.md`；原始日志、探针及隔离副本全部留 `.codex-tmp/board-visual-builder/`，未混入审计目录。

## HQ 收口裁定(2026-09-16)

**builder 保留 ready 的唯一阻塞(两 Python/MinerU 环境红)按例归 HQ**:HQ 机全量 **EXIT 0**(762 项聚合 760 绿+2 处 IPC 毛刺由 flaky 机关自动隔离双恢复——本轮发作含 v2SourceImprints,**第三个不同文件**,签名域设计三连验证)。**应用内实测通过(标本 #001 正解兑现)**:重启 dev server 加载新代码后,「实测·Agent 全家福 v2·0916」板以 9 便签+1 图例笔记+14 条新族边重画全家福——sticky×sticky 与 sticky×member 混合端点、四中点锚钉用、dash/weight/cap 样式轴、**14/14 边非零 bend**(默认微弯+生成时避让在真板上工作)。标本 #001 去处:说明书条目✅勾销(builder 已落);视觉产品输入四项✅勾销(本单落地);评测场景仍候补。状态改 done。
