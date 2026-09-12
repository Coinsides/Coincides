> **状态 (Status)**: done（builder 已交付；待 HQ 复核 / 主观验收）
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · B1a · 皮 token 引擎 + 纸面变量化 + 三预设切换
> **上游**: **设计附件=`plans/v13-5-b1-skin-token-spec.md`(色值/纪律/持久化形状,约束力等同裁定原文)**;设计日 §一/§二+专场收口 §6/§7;B1 拆三:B1a(本单)→B1b(板面+部件层)→B1c(纸型预设)

# B1a · 皮引擎(纸面)

## 零 · 裁定原文

1. **token 引擎**:spec §二的纸面 9 token 成为 CSS 变量(`--sk-*`),**三级合并**(全局默认→project 皮→单张纸覆写,下层缺省继承)后注入笔记页根;组件只消费变量;
2. **纸面变量化射程=笔记页全部现役面**(纸/表头/块/把手/墙/浮层/工具条/标注章/墨水选中态/恢复横幅/Overview 外壳)——逐处把硬编码色替换为对应 token 变量;**静墨预设值=现役色收敛**(即默认皮下视觉零变,以此为回归基准);
3. **三预设**:暖纸/静墨/工作台,值逐字取 spec §二(⛔自创色);预设=命名快照,用户切预设+高级抽屉逐 token 覆写;
4. **挂点最小 UI**:Settings 增「外观」节(全局预设选择+高级 token 抽屉);纸级覆写入口=⋯菜单一项(选预设/清除覆写);project 皮=project 设置一项;**⛔Agent 面**(形状预留:皮走人面路由,V14 同门接);
5. 持久化按 spec §五(用户 settings/project/note 三层,server 最小扩面走既有路由族);打印跟纸的合成皮;Typography 独立⛔并入;
6. **常备条款**:挂载期新增任何请求→交付前对消费面全部既有测试夹具台账普查补记。

## 一 · 禁区

⛔app 壳(sidebar/home)变量化(不在射程);⛔板面(归 B1b);⛔部件层开关(归 B1b);⛔纸型预设(归 B1c);⛔自由 CSS 注入面;⛔TextFlow 面;⛔安全类测试;⛔碰 .git;⛔改权限配置。收口跑受影响秒级静态门+E1 零嵌套边框审计复跑。

## 二 · 验收

- typecheck+build 两端绿;定向绿+新增:三级合并优先级/预设切换/覆写清除/持久化往返用例;
- 冒烟(真浏览器):①默认(静墨)下与改前逐面像素级近似(回归基准);②切暖纸→纸变米白衬线题墨绿点缀,切工作台→蓝图台面琥珀,再切回;③纸级覆写压过 project 压过全局,清除即回落;④刷新持久;⑤打印预览跟皮(暖纸打印呈浅纸);⑥高级抽屉改单 token 即时生效;
- 证据落 `docs/audits/2026-09-11-b1a-builder/`(含三预设整页截图)。

## 三 · 申报义务

Result 必含:交付清单+diff、变量化覆盖清单(逐面)、三级合并实现点、持久化路由申报、夹具普查证据、测试数字。冲突停线⛔自作主张。

## Blocker

2026-09-11 · codex builder · 实施前按「冲突停线」申报，未修改产品代码、未执行测试、未 commit；本单未完成，状态不翻 done。

- 静墨现役零变与三预设逐字取 spec 同时要求：现役纸 `#101114` / 主字 `#f5f5f5` / description `#b7b8bd` / 强调 `#2563eb`，附件静墨对应 `#17181C` / `#E7E8EB` / `#8B909A` / `#7FA3D7`。需要统一静墨色值与回归基准。
- 暖纸冒烟要求衬线标题，但标题字体属于附件 §四部件层，而本单与用户指示排除部件层。需要统一本单字体验收边界。
- 源码链、行号、现场与未执行项见 [停线申报](../../audits/2026-09-11-b1a-builder/stop-report.md)。未追加完成态 `## Result`。

## 补遗一(HQ 裁定,2026-09-11;解除停线——两处均为 HQ 起草矛盾,builder 免责)

### A · 预设改四个,矛盾拆开

- **「默认」预设**(新增,rollout 缺省):值=**现役色的忠实收敛**(builder 从现 CSS 盘点取值:纸 #101114/主字 #f5f5f5/description #b7b8bd/强调 #2563eb 等,逐面取现物⛔美化)——零视觉变化承诺由它承担;
- **「静墨」**=spec §二原值(打样精修版),作可选预设;是否将来升任缺省,候 Henry 眼验后于 13.6 品控另裁;
- 暖纸/工作台照旧。spec 文档由 HQ 随后补「默认」列注记。

### B · B1a 一律系统字,衬线归 B1b

- 冒烟②中"衬线题"字样**删除**:B1a 的暖纸=纯色彩换肤(标题仍系统字);衬线开关随 B1b 部件层到货后,暖纸预设的部件层默认才生效;
- 验收②改为:切暖纸→纸变米白、题字墨色、强调墨绿;切工作台→蓝图台面琥珀;再切回默认零变。

按原单其余条款+本补遗续工。

## Result

2026-09-11 · codex builder · 按补遗一完成二轮施工。四预设为「默认 / 静墨 / 暖纸 / 工作台」，rollout 缺省是默认，另三款九色逐字取 spec；所有预设沿用系统字，Typography 独立。未 commit，未操作 `.git`，未改权限配置；本 Result 为施工交付，不代 HQ 放行。

### 交付清单与 diff

完整证据入口：[B1a README](../../audits/2026-09-11-b1a-builder/README.md)。[逐文件清单与 SHA-256](../../audits/2026-09-11-b1a-builder/delivery-manifest.json) 共 **54 文件：19 新增、35 修改**；[统一 diff](../../audits/2026-09-11-b1a-builder/delivery.diff) 由现场源码快照生成，不调用 git。8 个常备夹具及 Print integration 的 before 为逐项声明的逆向重构，方法 / 精确增量随证据交付；不伪称原始 checkout diff。

本 Result 及状态对应的生成 INDEX 元数据同步另见 [文档 diff](../../audits/2026-09-11-b1a-builder/documentation.diff)，不计入上述 54 个代码 / 测试文件。

| 交付域 | 实现点 |
|---|---|
| 封闭九 token / 四快照 / 合成 | `shared/types/skin.ts`；`client/src/styles/skinPresets.ts` |
| 现役色逐面收敛 / 命名皮派生 | `paperSkinStyles.ts`、`paperSkinDefaults.css`；原色集中保留为私有别名，不扩张用户 token 或 CSS 注入面 |
| 全局 / Project / 单纸入口 | Settings `AppearanceSection`；既有 `CourseModal`；More 内 `SkinEditor` / `SkinControls`，含继承、清除和九色高级覆盖 |
| runtime 注入 / portal / 打印 | `useNoteSkin` → runtime controller → `PaperSkinContext`；纸根、FloatingOverlay portal 与 Print portal 同值，打印开始冻结合成皮 |
| 可靠保存 | adapter 绑定纸 id 串行排队并注册离页屏障；失败保留预览及重试；metadata 晚到响应保留最新皮；Project 编辑回传新值，重开不退回旧皮 |
| Server / DB / 类型 | `067_v13_paper_skin.ts`、schema、skin validator / service、既有 settings / courses / notes 路由；不增加 Agent 面 |

### 变量化逐面覆盖

完整旧色盘点与消费文件见 [variable-coverage.md](../../audits/2026-09-11-b1a-builder/variable-coverage.md)。纸面现役 10 个 CSS 消费文件内 raw hex/rgb 为零；固定色表只留在私有默认 / 派生层。

| 面 | 覆盖 |
|---|---|
| 桌面、纸、表头、描述 | desk / paper / ink / ink-muted；默认保留现役 template 存储色，非默认皮覆盖绘制消费端，不改模板数据 |
| 块、把手、Groups / Item rail、链接 / 表格 / code | ink / ink-muted / accent / hairline 的现役私有映射 |
| 边墙与选中 | wall / accent；墙宽、布局和交互几何不改 |
| 浮层、工具栏、恢复 / 模板提示 | paper / ink / annotation / danger；body portal 显式带合成变量，原生 popover 继承 DOM |
| 批注章、墨水及其选中态 | 默认黄色随 annotation，作者显式选择的其他批注语义色保留；墨水取 sk-ink，选中取 accent |
| Overview 外壳 / 预览 | desk / paper / ink / hairline，复用既有只读投影 |
| 打印 | 同一合成皮的 paper / ink / code 背景，保留分页及内容投影；暖纸输出为浅纸 |

默认零变化证据：当前注入已断言加载，原 D2 闭合整页截图 **1,584,000 像素中 0 差异，最大通道差 0**，见 [像素报告](../../audits/2026-09-11-b1a-builder/default-regression.json)。此精确数字限已捕获状态，不外推所有菜单组合；逐面颜色盘点与四色 E1 补充其他面。Info 的旧 input / button 嵌套框在 E1 复跑中实报失败后按原纪律修复；打印旧强制白色按本单改跟皮。这两项另行申报，不混入旧画面逐像素相同承诺。

### 三级合并与持久化路由申报

`resolveSkin(global, project, paper)` 按全局 → Project → 单纸取有效层；缺省 / null 继承，三个挂点全空落默认。每层选择是「命名快照 + 本层 overrides」，切预设丢弃旧 overrides，清除本层立即回落上层；下层命名快照不意外携带上层旧改色。`useNoteSkin` 复用 authStore 和 note metadata，仅新增已存在的 Project summary 读取，晚到跨 Project 响应作废。

| 层 | 既有写路由 | 存储 / 读来源 |
|---|---|---|
| 全局 | `PUT /api/settings`，`{settings:{skin}}` | `users.settings.skin`；既有 settings / authStore |
| Project | `PUT /api/courses/:id`，`{skin}` | 新增可空 JSON TEXT `courses.skin`；既有 courses 列表及 `/api/courses/:id/summary` 的 `course.skin` |
| 单纸 | `PUT /api/notes/:id`，`{skin}` | `notes.metadata.skin`；既有 note 单取 / 列表；Note 顶层 DTO 与 MCP 严格输出不扩张 |

POST Project / note 同样支持。旧 metadata / Typography 写入无论漏带 skin 或带旧值，server 保留当前 skin；client 同样隔离晚到整笔响应。皮形状不含字体、板面或部件层。manifest 仍为 **14 public tools**。详见 [持久化收据](../../audits/2026-09-11-b1a-builder/server-persistence.md)。

### 常备夹具普查与验证数字

新增挂载请求精确为 `GET /courses/:courseId/summary`。已普查并补齐 **8 个既有账本，覆盖 10 个浏览器入口 + 1 个真实 runtime 测试**；没有 Settings 新挂载 GET，也没有给 adapter-only 测试乱加响应。未知 URL 继续严格报错。逐个消费者 / 排除理由见 [台账](../../audits/2026-09-11-b1a-builder/fixture-census.md)；旧 D2 仅补可执行夹具，不覆写历史验收证据。

- **Client 183 / 183**：14 文件，涵盖引擎、合并 / 清除、hook 切页、保存队列 / 失败重试 / metadata 竞态、现役 adapter 105 项、Settings / Project / More、Ink、Print 与真实 Board modal/unboxing。[最终 JSON](../../audits/2026-09-11-b1a-builder/client-final-tests.json)
- **Server 9 / 9**：新增 4、既有正常 Note 4 / Course 1；四皮三级配置实际临时 SQLite 关闭 / 重开，覆盖九色、切换、清除及 metadata 保留。未运行安全类测试。
- **真浏览器 37 / 37**：四色整页、系统字体与 sidebar 恒定、三级优先级 / 清除、刷新、高级单 token、浅纸打印；真实 Router 保存边界路径下失败请求 / 保存错误 toast / 未捕获异常均 0。[报告及截图清单](../../audits/2026-09-11-b1a-builder/skin-smoke-report.json)、[暖纸 PDF](../../audits/2026-09-11-b1a-builder/warm-paper-print.pdf)。API / localStorage 为隔离合成数据，真实 DB 往返由 server 用例证明。
- **E1 252 / 252**：四色各 63，8 类浮层、80 份 rest / hover 样式采样、328 个强制 hover 控件；嵌套边框 / 后代阴影 / 圆角 / 静态卡底均 0，运行时 / console error 均 0。[最终汇总](../../audits/2026-09-11-b1a-builder/e1-recheck/summary.json)
- **受影响静态门通过**：runtime boundary 167、gallery 8、groups rail、single editor、source experience、server/shared runtime import；docs index / inventory / glossary 均 exit 0。[命令和收据](../../audits/2026-09-11-b1a-builder/static-checks.json)
- **Client 最终 typecheck + build 通过**：原 `tsc -b && vite build` 管线，输出至审计目录。[日志](../../audits/2026-09-11-b1a-builder/client-final-build.log)
- **Server/shared 完整源码 typecheck + emit 通过，原 manifest check / copy 通过**。标准 `shared/dist` 写入 EPERM，导致原 server build 缺新增声明而失败；未改权限，使用同源审计输出配置完成编译与产物，不将标准路径伪报为绿。[构建方式及原失败记录](../../audits/2026-09-11-b1a-builder/server-persistence.md)

验证范围按本单“受影响秒级静态门 + E1”及禁安全类测试 / `.git` 执行；含禁项的 `verify:v2-bn8-runtime` 聚合入口未调用，逐项替代记录在台账。App 壳 / board / TextFlow 实现 / 字体 / 权限配置未改；B1b / B1c 留在原边界。无未裁规格冲突。
