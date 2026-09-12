> **状态 (Status)**: done（builder 工作树交付；待 HQ 复核与主观放行）
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · B1b · 板面变量化 + 板皮 + 部件层开关
> **上游**: token spec(`plans/v13-5-b1-skin-token-spec.md` §三/§四/§七)+B1a 现役引擎(四预设/三级合并/`--sk-*` 语法);专场收口 §7(板皮并入,展览墙=板默认预设)

# B1b · 板皮 + 部件层

## 零 · 裁定原文

1. **板面变量化**:spec §三的 4 板专属 token(board-desk/card/edge/chalk)+复用 token,板页全部现役面(台面/卡/连线/粉笔/侧栏/书签列/工具面)硬编码色变量化;**「默认」预设=板现役色忠实收敛(零变基准)**;展览墙气质并入静墨/各预设的板列值(spec §三);
2. **板挂点**:三级合并同引擎扩展 board(全局→project→单板覆写,board 覆写存 boards 记录或 metadata,B1a 同形);板级入口=板 More 菜单一项;
3. **部件层四开关**(spec §四):标题衬线/标签等宽/菜单密度/把手样式——枚举开关进皮形状(preset 携默认值:暖纸→衬线题,工作台→等宽标签+紧凑菜单+铆钉把手),Settings 外观节扩展+各级覆写同语法;B1a 冒烟②的暖纸衬线题在本单生效;
4. **常备条款两条**:挂载期新请求→全夹具台账普查;改产品代码→交付前 client 全库必跑(低并发可)。

## 一 · 禁区

⛔app 壳;⛔纸型预设(B1c);⛔自由 CSS 注入;⛔Agent 面;⛔安全类测试;⛔碰 .git;⛔改权限配置。收口跑受影响秒级静态门+E1 审计复跑(四预设)。

## 二 · 验收

- 两端 typecheck+build 绿;定向绿+新增:板挂点合并/部件开关持久化/预设携默认用例;client 全库绿;
- 冒烟(真浏览器):①默认下板页逐面零变;②切暖纸→板台面暖石墨卡米白+**纸页标题变衬线**;切工作台→蓝图台面琥珀 edge+等宽标签+铆钉把手;③单板覆写压过上层,清除回落;④书签列/粉笔/连线各预设下可辨;⑤刷新持久;
- 证据落 `docs/audits/2026-09-11-b1b-builder/`(四预设板页+纸页衬线截图)。

## 三 · 申报义务

Result 必含:交付清单+diff、板面变量化覆盖清单、部件开关接线、持久化申报、普查证据、全库数字。冲突停线⛔自作主张。

## Result

2026-09-11，Codex builder 完成工作树交付。按本单裁定及 spec §七保留「默认」为现役零变基准；静墨/暖纸/工作台使用 §三板列值。无规格或并行施工冲突。未 commit、push、PR、merge；未改 app 壳、纸型预设、Agent 产品面或权限配置，未写 Git index。HQ 复核与主观放行仍待执行。

### 1. 交付清单与 diff

- 共 **38 个产品/测试文件：32 个现有文件修改、6 个新增**。完整 [delivery.patch](../../audits/2026-09-11-b1b-builder/delivery.patch) 包含未跟踪新增文件；[delivery-manifest.json](../../audits/2026-09-11-b1b-builder/delivery-manifest.json) 列出各文件 SHA256。补丁 SHA256：`a5e9799b8d13d16a7f86037a4f17937cb6ef25afccb3490ac2defe6f26bd1a12`。
- 新增 `boardSkinStyles.ts`、`useBoardSkin.ts` 及对应测试、`skinComponentStyles.ts`、迁移 `068_v13_board_skin.ts`；扩展现役共享 skin 类型/校验/四预设，以及 Settings、CourseModal、纸 More、板 More 的同形控件。
- 默认四板值为 `#0b0b0c / #151516 / #b7b8bd / #f5f5f5`。未改动的默认角色继续继承现役深/浅主题 alias；不会因引入皮引擎将浅色板强制变成暗色。
- 文档仅本 Result、审计目录与自动生成的 `docs/agent-ops/INDEX.md`；索引原先遗漏本工单，按生成器补齐并同步 done 状态。原有不相关未跟踪文件保持原样。

### 2. 板面变量化覆盖

| 现役面 | 接线与基准 |
| --- | --- |
| 板台面、空板引导 | `board-desk`；工作台派生 24px 网格。空板标题、说明及按钮 hover 使用台面 chalk/弱字派生，暖纸暗台面保持可辨。 |
| Note/Item/其他成员卡、迁移图像/表格外壳 | `card` + 复用 ink/ink-muted/hairline/accent；保持成员数据、缩放与尺寸。 |
| 板连线、箭头、连线文字、迁移 connector 缺省 stroke | `edge`；箭头 marker 与线同步。连线文字使用 chalk。已有迁移对象显式 stroke 原样保留。 |
| 普通粉笔、自由手绘 | `chalk`；粉笔底色由板台面派生。默认普通粉笔保持 bg-elevated。 |
| 迁移 sticky shape、普通 shape | sticky 的现役 `#2f2817/#d8a429` 基准独立保留，非默认派生 annotation/card；普通 shape 非默认以 card 混合强调色，保证暖纸深字可辨，默认保持原透明强调底。 |
| 顶部工具栏、More、身份区、选中条、候选 picker | 固定映射复用 ink/ink-muted/accent/hairline/danger；More 新增折叠「板面外观」。 |
| 图层、选择侧栏、Staging、书签列及编辑/错误状态 | 继承板作用域的 card/文字/分隔线/交互角色，标签字开关贯通。 |
| 新建纸、删除板/图层、Open note 弹层 | 原生 dialog 与 portal 显式保留板作用域；遮罩保留现役 alpha。内部纸 runtime 独立解析自己的皮。 |

独立只读复核覆盖 31 个现役板源码文件；剩余颜色字面量为默认值/变量 fallback，没有漏接裸色。未将 authored 对象样式当成板皮覆写保存。

### 3. 部件开关接线

`SkinSelection.components` 为有限枚举：`titleFont: sans|serif`、`labelFont: system|mono`、`menuDensity: comfortable|compact`、`handleStyle: capsule|rivet`；只经固定 enum→CSS 变量映射，未提供自由 CSS。

| 开关 | 实际落点 |
| --- | --- |
| 标题字 | 纸标题、板标题/卡标题；静墨细体、暖纸衬线、工作台重体。sans 使用局部重置，防止暖纸板 portal 污染单纸覆写。 |
| 标签/刻度字 | 纸页标签/状态/页码、板卡类别/连线标签/缩放与工具提示/侧栏/书签标签。正文 Typography 四参独立。 |
| 菜单密度 | 纸 More padding、上下文菜单行高/间距、板 More 行高/padding 与外观控件行高。 |
| 把手样式 | 纸 TextUnit gutter 与 resize 标记、板成员/visual resize、图层 grip；只改样式，保留既有命中范围和拖动逻辑。 |

默认/静墨：sans + system + comfortable + capsule；暖纸：serif + system + comfortable + capsule；工作台：sans + mono + compact + rivet。四级入口都显示实际继承值；在继承状态改一个颜色/开关会保留实际上层预设及其其他覆写，重置/清除同 B1a 语义。

### 4. 持久化申报

- 全局仍为 `users.settings.skin`，项目仍为 `courses.skin`，纸仍为 `notes.metadata.skin`；单板新增 nullable `boards.skin TEXT`，存同形 `{preset, overrides?, components?}`。`null` 清除并回落；下级选中预设使用 B1a 的整份预设快照语义。
- 迁移 068 仅加一列，旧板默认 null；新增测试覆盖重复执行、已有行/viewport 保留、已存 skin 不被重跑覆盖。仅对一次性测试 SQLite 执行迁移，未迁移 app 数据库。
- 板读取经既有 board hydrate；写入使用既有 `PATCH /boards/:id`、原 `useBoard.updateBoard` 排队与 route 事务，无第二条 writer。只有显式 skin 输入才写该列；其他 viewport/标题等修改不重置 skin。
- 服务器真实 HTTP 测试对全局/项目/纸/板四挂点逐一保存四预设、四板色覆写和四个部件枚举，重开数据库核对；板清除回落、无关写入保留，以及身份/场景/几何不变均覆盖。浏览器另亲跑 More 覆写、项目压过全局、DB reopen + 页面刷新。

### 5. 挂载请求全夹具普查

新增 `useBoardSkin → GET /courses/:projectId/summary` 仅对有项目板触发。`CourseModal → authStore` 只读 global skin，不增加请求。证据：[request-census.md](../../audits/2026-09-11-b1b-builder/request-census.md)、可复跑 [mock-census.cjs](../../audits/2026-09-11-b1b-builder/mock-census.cjs) 与逐行 [mock-census.json](../../audits/2026-09-11-b1b-builder/mock-census.json)。

全 client **530 源文件、140 test/spec、65 含 mock 文件、111 次 mock、46 API mock**；46 闭合为 **14 可达真实 named-export 且齐备 + 32 被替身隔离**，缺失出口 **0**。相对 API mock、doMock、非字面量、手工 `__mocks__` 各 0；7 browser mockApi 出口齐备。独立只读 agent 普查结果一致。

13 个既有真实 BoardPage 测试入口逐个核对：12 个板无项目；`useTrayRelocation.test.tsx` 精确补齐 other-project/source-project summary。modal/staging 两份 API mock 改 typed importOriginal，保留现役隔离；其余按实际可达路径申报，未吞未知请求或跳过套件。4 个常备板浏览器夹具及 B4v 均无板项目；纸面既有 summary 承接保留。本单 browser fixture 挂真实路由，未知 API 显式 404，交付报告无失败 HTTP 或浏览器错误。

### 6. 验证数字

| 验证 | 最终结果/证据 |
| --- | --- |
| `npm run verify:v2-bn8-runtime` | **exit 0**，完整门通过，85.301s；[runtime-gate.log](../../audits/2026-09-11-b1b-builder/runtime-gate.log) / [命令与退出码](../../audits/2026-09-11-b1b-builder/runtime-gate.json)。 |
| client 全库 | **140/140 文件、1497/1497 测试通过，0 失败/跳过**；并发 4，已覆盖最终产品修改。 |
| 定向 client | 30 文件/228 测试通过；其后新增的继承显示用例及最终修改由上面的全库再次覆盖。 |
| 定向 server | **12/12 通过**，含 B1b 四挂点持久化及迁移幂等；[directed-server.log](../../audits/2026-09-11-b1b-builder/directed-server.log)。 |
| 两端 typecheck + build | 完整门内 client `tsc -b && vite build`、server build/typecheck 均通过。 |
| 受影响静态门 | runtime boundary **167 checks**、model contract **60 groups**、gallery/rail/single editor/source/legacy/relation freshness、server shared import、现役 manifest/parity、性能、docs 与 diff 检查均通过；见完整门日志。 |
| 真实浏览器 | **14/14 断言通过，0 浏览器错误**；四预设板页、层级覆盖/清除/刷新与场景不变；[browser-report.json](../../audits/2026-09-11-b1b-builder/browser-report.json)。 |
| 默认逐像素回归 | **5 组 1440×1000 原始 PNG 全部 0 变化像素、0 最大通道差**：深色板、浅色板、图层、选择侧栏、书签编辑。计算样式同时对比；无缩放、无容差；[default-regression.json](../../audits/2026-09-11-b1b-builder/default-regression.json)。 |
| E1 四预设复跑 | 每预设 **65/65**；合计 **260/260**，8 类 overlay、每预设 11 named states，88 次样式采样，456 个强制 hover 目标；嵌套边框 **0**，保留 68 条 hairline separator；[汇总](../../audits/2026-09-11-b1b-builder/e1-recheck/summary.json)。 |

### 7. 截图与复跑入口

- 四预设板页：[默认](../../audits/2026-09-11-b1b-builder/01-default-board.png)、[静墨](../../audits/2026-09-11-b1b-builder/02-quiet-ink-board.png)、[暖纸](../../audits/2026-09-11-b1b-builder/02-warm-paper-board.png)、[工作台](../../audits/2026-09-11-b1b-builder/02-workbench-board.png)。各预设另有 layers/selection/bookmarks 面板截图。
- [暖纸纸页衬线标题](../../audits/2026-09-11-b1b-builder/03-warm-paper-serif-title.png)、[单纸 sans 独立重置](../../audits/2026-09-11-b1b-builder/04-nested-paper-independent.png)、[单板 More 覆写](../../audits/2026-09-11-b1b-builder/05-board-override.png)、[刷新读回](../../audits/2026-09-11-b1b-builder/06-refreshed-persistent-board.png)、[清除回项目](../../audits/2026-09-11-b1b-builder/07-clear-falls-back.png)。
- [审计 README](../../audits/2026-09-11-b1b-builder/README.md) 说明独立 Chrome profile、一次性 SQLite、基准提取与全部复跑命令。浏览器场景是合成 fixture，生产页面/路由真实；E1 为 leaf 样式审计，持久化由主浏览器和 server 测试覆盖。
