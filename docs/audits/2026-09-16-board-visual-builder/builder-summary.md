> **状态**: blocked（实现完成；server 全量验证有外部 Python 阻塞，未获放行）
> **日期**: 2026-09-16
> **来源**: Codex builder；工单 `docs/agent-ops/handoffs/2026-09-16-v14-board-visual-v1-order.md`
> **证据纪律**: 此目录只有蒸馏 Markdown；原始日志、隔离数据库与探针均在 `.codex-tmp/board-visual-builder/`。

# 板视觉 v1 施工回执

便签、弧线与端接、边标签、五类排版体检及亮暗 token 已实现。没有把板视觉线接入 Relation；没有新增 Agent 动词、写门、注册表、依赖或外部账号。`.git` 未访问，未运行 git/commit，git/secrets 收口留 HQ。

## 建模与兼容

`078_v14_board_visuals` 新增独立 `board_stickies`，含板归属、纯文本、位置、两档宽度、内容高度、中性/单强调色、三档重量、图层/层序/钉住及时间。没有 note/item/ContentGroup/material 引用；新便签不走旧粉笔的 Cast 入口。API 限制宽 240/416、固定 scale=1、纯文本最多 12000 字符；客户端编辑和换宽传实测高度，服务端提供估高回退。

边仍存 `board_edges`，端点 API 是 `{kind:'member'|'sticky',id,anchor:'auto'|'n'|'e'|'s'|'w'}` 或 `{kind:'point',x,y}`。数据库用互斥的 member FK/sticky FK/自由点列实现多态；同板复合外键及级联删除保证不悬挂、不串板。兼容旧 `from_member_id/to_member_id` 请求。迁移不生成任何 Relation。

边新增 `bend/dash/weight/cap_start/cap_end/color_index/from_anchor/to_anchor/label_position/visual_version`。旧边全部为 **version=0、bend=0、solid、weight=1、caps=none/none、color=NULL、anchors=auto、label_position=.5**；原 ID、端点、style、label、创建时间完整保留。旧渲染继续使用原直线、颜色、宽度、箭头和标签位置。新建边 version=1；用户显式改新视觉轴/端点/取道才升级；撤销可以恢复旧模式。

真实板「实测·Agent 全家福·0916」的 **13 条既有边兼容检查通过**：原数据库 readonly 打开后使用 SQLite backup 制作独立副本，只在副本执行迁移。13 条旧字段与默认值逐条相等，FK 违规为 0，重复迁移稳定；重新只读打开原库确认仍无新迁移列、13 条边不变。原始证据：`server/real-board-migration-verification.json`、`server/real-board-migration.log`（路径前缀均为上述临时目录）。

## 逐件定位

| 工件 | 主要位置 | 行为 |
|---|---|---|
| 迁移与验证 | `server/src/db/migrations/078_v14_board_visuals.ts:9`；`server/src/validators/boards.ts:76`、`:118` | 新表、端点约束、闭合枚举、旧数据保持 |
| CRUD/路由 | `server/src/services/boards.ts:574`、`:627`、`:652`；`server/src/routes/boards.ts:302`、`:328` | 视觉边、显式取道、便签 CRUD，板详情与删除级联 |
| 便签 UI | `client/src/pages/Boards/BoardStickyCard.tsx:6`、`:19`；`BoardPage.tsx:1255`、`:1379` | 工具栏新建、双击编辑、两档宽、三档重、删除、实测文本高度与锚点同步 |
| 连线与绑定 | `shared/boardVisualGeometry.ts:37`、`:170`、`:256`；`BoardPage.tsx:674`、`:695` | 三点圆弧、四锚/整卡求交、Alt 不吸附、预告、显式解绑、建线时避让、取道 |
| 边标签 | `client/src/pages/Boards/BoardVisualEdge.tsx:36`、`:55`；`shared/boardVisualGeometry.ts:97`、`:243`、`:297` | 水平换行、约120px、真实断线、滑动/中点吸回；单击不写，拖动阈值4px |
| 生命周期 | `client/src/pages/Boards/useBoard.ts:197`、`:225`；`boardCommandHistory.ts:283`、`:311` | 样式惯性、保存、撤销/重做、删便签及边、ID 重映射；图层/选择列表接入 |
| 体检 | `server/src/services/boardLayoutInspector.ts:121` | 五类只读结构化诊断，无消费者、无阻断；细节见 `geometry-and-inspector.md` |
| 亮暗 token | `client/src/styles/global.css:191`、`:219`；`boardVisualTokens.test.ts:23` | 25 个 token 在两主题及板皮肤作用域解析，无新 hex/平行调色系统 |
| 说明书 | `docs/agent-ops/current-state/app-operating-manual.md:43` | 选型、便签、连线、锚点、标签、API、体检边界 |

上表客户端无路径前缀的文件均位于 `client/src/pages/Boards/`。server 与 shared 的几何文件保持字节一致并有测试锁定，遵循现有 shared runtime-import 边界，没有引入运行时跨域导入。

## Token 清单

所有数值/别名均在 `global.css` 明暗两份声明，板皮肤作用域重新解析别名，避免旧粉笔黄色 token 污染新中性便签。

| Token（完整前缀 `--board-`） | 值/现有来源 |
|---|---|
| `line-1`, `line-2`, `line-3` | `--border-subtle`, `--text-muted`, `--text-secondary` |
| `line-width-1`, `line-width-2`, `line-width-3` | 1.5 / 2.25 / 3.375 |
| `sticky-neutral-fill`, `sticky-border`, `sticky-text` | `--bg-elevated`, `--border-default`, `--text-primary` |
| `sticky-medium-fill`, `sticky-medium-border` | `--bg-hover`, `--text-muted` |
| `sticky-strong-fill`, `sticky-strong-text` | `--text-secondary`, `--text-inverse` |
| `accent-1-line`, `accent-1-fill`, `accent-1-text` | `--accent-primary`, `--accent-primary-bg`, `--text-primary` |
| `accent-1-on-solid` | 暗 `--text-primary` / 亮 `--text-inverse` |
| `binding-preview`, `anchor-fill`, `anchor-stroke`, `label-text` | `--accent-primary-bg-hover`, `--bg-elevated`, `--accent-primary`, `--text-secondary` |
| `sticky-font-size`, `sticky-line-height`, `label-font-size`, `label-line-height` | 16px / 24px / 12px / 16px |

## 已核验

| 核验 | 结果 | 原始证据（临时目录内） |
|---|---|---|
| 客户端全库最终 | **175 文件、1784/1784 PASS** | `root/client-unit-final.log` |
| 客户端 build | **PASS** | `root/client-build-final.log` |
| 本单 server 定向 | **40/40 PASS**：服务/API 12、几何19、体检9 | `server/final-targeted.log` |
| server 类型检查 | **PASS** | `server/typecheck-final.log` |
| 既有板回归 / 删除链 | **55/55、16/16 PASS** | `server/board-regression.log`、`server/delete-count-regression.log` |
| 客户端新增重点回归 | **20/20 PASS**：UI8、数据9、token3；包含于全库 | `client-data/width-label-regression-tests-final.log` |
| 真数据副本兼容 | **13/13 PASS**；原库未变 | `server/real-board-migration-verification.json` |
| server 全量最终 | **FAIL**：初轮749项，744通过/5失败；3个IPC故障隔离重试49/49、59/59、12/12通过，余2项Python阻塞 | `server/full-server-final.log` |
| 浏览器 | **PASS**：亮暗三档、中文编辑、标签断线、拖卡连线跟随、换宽实测 | `root/browser-observations.json` |

运行时门按 `verify:v2-bn8-runtime` 的原顺序逐项执行 23 个获授权 npm 子命令；因用户禁止 git 并将 secrets 留 HQ，未执行末尾 `git diff --check` / `check:changed-file-secrets`。初跑 client build 暴露新 token 测试的 node:fs 导入问题、docs:check 暴露生成索引过期，均已修复并复跑 PASS；客户端最终全库见上。原始脚本/每项日志/初跑结果在 `root/run-authorized-runtime-gate.mjs`、`root/runtime/`；最终合并清单在 `root/verification-final.json`。不宣称完整 runtime 门或 server 全量放行。

Chrome 检查使用内存夹具，不连真实 API/数据库。240 个汉字从240宽切换416宽后，保存 h=298、DOM高=298、正文高264、文字仍240字；固定16px字号。三档明暗配色及真实断线经工具截图目视检查，截图未导出为文件。早期夹具 HMR 的重复 createRoot 警告已加 dispose 修正，最终重载后无新 error 记录。

## 外部阻塞与未做项

server 全量仍有 Python 环境阻塞，详情与最终数字回填工单 Result。`v2SourceMineruWiring.test.ts:59` 在模块载入时调用 PATH 上的 `python.exe`，当前 ENOENT；`v2SourceRegionCells.test.ts:40` 固定指向旧工作区 MinerU venv，并在128/196行直接执行/覆盖环境变量，其基础 CPython 在当前会话 EPERM，venv 启动退出101。无有效的测试环境参数可替换第二条绝对路径。原始探针为 `server/python-environment-verification.json`。没有跳过/削弱测试，没有安装解释器或改系统权限。此项未解决前工单保持 ready。

按工单不做：六强调色槽、便签转笔记、持续路由/肘线、体检消费者与自动整理、Agent 板写动词/14.3 沙箱接线、评测场景接线；不清理标本物证，不迁移原数据库，不做主观验收。单圆弧遇端点被其他卡覆盖时无可行避让，保留有限路径交由体检报告，不伪称必能避开。

说明书§四已落「铺概念图用便签，⛔每节点一笔记；真内容集中图例笔记」。标本 #001 第一条说明书去处可由 HQ 勾销；第二条中的四项视觉产品输入已实现，但14.3设计/Agent工程不冒领完成；第三条评测仍候补；九张空笔记物证保留。标本原文件未改。新增服务夹具仅复用2个合成用户身份，无真实凭据/JWT；浏览器使用原有 synthetic-user。
