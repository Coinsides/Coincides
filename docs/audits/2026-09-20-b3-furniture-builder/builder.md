> **状态 (Status)**: active
> **层 (Layer)**: 审计证据 / Builder receipt
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否；工作树交 HQ，非放行

# V14 B3 builder 交付

工单为 `docs/agent-ops/handoffs/2026-09-20-v14-b3-furniture-skin-order.md`。实现引文/提示框两种段落外观、表头下缘线三开关、第五出厂皮「绢本」及笔记页 chrome 去盒。零新块型、零新逻辑真相表、零新依赖；未进行 git 写操作、commit、push 或 PR。

## 现物考古

- CodeGraph 索引目录存在，但当前 shell 无 `codegraph` 可执行文件、工具清单无可调用 CodeGraph；失败留 `codegraph-initial.log`。`rg` 也不在 PATH，随后限定路径使用 PowerShell 读取与检索。
- 皮的 B1a 九 token、B1b 四个板 token、三级挂点、完整 suite 快照与旧四预设的逐行保留证据见 [skin.md](skin.md)。原始 `skin-archaeology.log`、`skin-preservation.log`。
- 段落读写继续消费 placement 的 `display_overrides_json`；服务端现役 PUT 与 GET 已存取整个 JSON，正文分列独立，无需另开写路由。API/数据库重开证据见 [paragraph-server.md](paragraph-server.md)。
- 现役 `headerRule` 曾被整纸 outline 消费，表头带原无真正下缘线；本单新增独立 separator 消费节点，未把墙或纸框改成长短线。考古与逐件行号见 [header.md](header.md)。
- Note Actions 已有菜单行结构；去盒范围为笔记页浮层/面板，点位、五处方和禁区排除见 [chrome.md](chrome.md)。

## 段落外观与代码路径

`display_overrides_json.paragraph_furniture_v1` 仅保存以下二选一：

```json
{"variant":"quote","source":"范仲淹《岳阳楼记》"}
```

```json
{"variant":"callout","label":"注"}
```

恢复「正文」只删除家具键，保留其余 display overrides。块 id、placement id、正文 TextFlow、角色、顺序及坐标无新增持久真相。适用于现役 `paragraph` 与呈现为 paragraph 的 legacy `text`。

| 文件与行号 | 实现 |
|---|---|
| `client/src/pages/Notes/canvasEngine/paragraphFurniture.ts:15` | 适用块判断、纯文本读值、只改家具键；`:38` 为展示预留空间 |
| `client/src/pages/Notes/canvasEngine/blocks/ParagraphFurnitureEditor.tsx:6` | 原块工具条「引」入口；`:19` 样式/出处/标签草稿、取消、保存及失败保留 |
| `client/src/pages/Notes/canvasEngine/blocks/ParagraphFurnitureDecoration.tsx:5` | 每片浅底/边线；字签/标签只首片、出处只末片 |
| `client/src/pages/Notes/canvasEngine/blocks/ParagraphFurniture.module.css:1` | 汝青浅底、朱印、批注金浅底、虚线、右对齐出处，全用皮 token，打印保色 |
| `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:1773` | 调用现役 placement PUT，使用既有写排水和路由代际保护，不新建服务端写门 |
| `client/src/pages/Notes/canvasEngine/hooks/useParagraphFurnitureHistory.ts:6` | 挂现役串行历史，一次保存一次 undo/redo；重放使用最新 placement，保留其他覆写 |
| `client/src/pages/Notes/canvasEngine/documentPageFlowService.ts:187` | A1 分页按装饰内缩量测行，装饰高度仅存在投影中 |
| `client/src/pages/Notes/canvasEngine/notePageFlowService.ts:45`、`measurementService.ts:117` | flow 与非分页估高同读外观 |
| `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx:257` | 纸面、缩略、只读打印共享装饰与文字片段投影 |

UI 出处最多1000字符，标签最多32字符，空标签读为「注」。这两个长度只约束输入面，没有新增正文 schema。首片 source-reference 行仍保留原空间。为跨页切换纸宽时保持安全余量，每片预留完整出处高度，而出处文字只在末片；长出处可能产生额外留白，应在目标纸型检查。

## 浏览器证据与边界

截图均为 Chrome 中直接导入现役 React 组件的本地 fixture；使用固定域数据与本地回调，不冒充登录后生产 API 全旅程。服务端持久性由独立 HTTP/SQLite 回归覆盖。

- `paragraph-light.png` / `paragraph-dark.png`：绢本亮暗、引文、可改标签提示框与普通正文并排。
- `paragraph-editor.png`：原块工具条中的实际样式面；浏览器亲点引文→提示框、改为「史料札记」并保存，草稿关闭、纸面更新、正文保留。
- `paragraph-multipage.png` / `paragraph-print.png`：18段正文跨三页，三个 quote 片、一个字签、一个末片出处；实际 NotePrintLayer 三页跟随，末页提示框与普通正文保留。原始 DOM/几何在 `paragraph-browser-checks.json`。
- `header-light.png`：现役题名带与只读打印投影。三开关测量见 `header-browser-checks.json`，首张打印表头下缘等于正文上缘，无覆盖。
- `before-*` / `after-*`：13组去盒对比，Actions/Layout/Trash/Skin/Binding/Table/Timeline/Chart/Context/Annotation/Tray/Tools/Navigation。前11组修改前拍摄；后2组使用原CSS基线+当前组件补拍，明确不是旧代码全版本快照。

无封面的首张打印增加197px题名带，并将该张正文等比装进原物理页；因此首张正文比后页略小。它不重写 frame、分页 plan 或 placement。旧逻辑有封面即退出表头，包括不导出封面的情形。详见 [header.md](header.md)。

## 验证结果

- 段落家具/分页/历史定向：3文件31例通过；末次家具+NoteChrome 2文件28例通过。
- 皮定向：5文件62例、服务端6例通过。旧四皮9行原定义逐行一致（归一行尾），哈希记录在 `skin-preservation.log`。
- 表头及A3/A5定向：7文件88例通过。三开关真实浏览器量测通过。
- 最终 client 全库：**215文件、2210/2210例通过，零排除**；仅将 worker 数限制为2，未放宽timeout或修改测试配置。原始 `gate-05-test-unit-final-workers2.log`。初轮并发超时、旧四皮测试断言及本次CSS测试文件定位错误均修正/重跑，失败日志保留。
- 服务端101个测试文件零排除执行：82文件 `test:v2` +19文件补集；最后仅保留 **Python启动两项失败**。本次引入的编译问题已修复，B3+McpArtifact最终6/6通过（含两次server build）。Wilderness先前120秒取消，后独立以600秒上限运行原文件，**27/27 PASS、0失败/取消/跳过，实际459.059秒**；日志 `wilderness-isolated-final.log`，未改源码/测试。详细原始计数和重跑口径见 [paragraph-server.md](paragraph-server.md)，不把文件级重跑与主批数字相加冒充独立用例数。
- runtime门仅执行**非 git/secrets 的23组件，23/23 PASS**；包括client/server build与docs检查整链。生成仅更新 `docs/agent-ops/INDEX.md`，对象清单无变化。最终逐项状态及历次结果在 `.codex-tmp/b3-furniture/gate-summary.json`。git检查、secrets扫描明确留HQ，不宣称完整门已绿。

| 非 git/secrets 组件 | 最终状态 |
|---|---|
| check:test-wiring | PASS（101/101 wired，0 exempted/unwired） |
| test:agent-knowledge | PASS |
| check:agent-knowledge | PASS |
| check:tech-debt-table | PASS |
| test:unit | PASS（215文件，2210例） |
| test:tool-face-registry | PASS |
| test:tool-face-manifest | PASS |
| check:tool-face-manifest | PASS |
| test:tool-face-parity | PASS |
| check:tool-face-parity | PASS |
| check:server-shared-runtime-import | PASS |
| check:canvas-runtime-boundary | PASS |
| check:group-gallery-shell | PASS |
| check:groups-rail-shell | PASS |
| check:single-editor-shell | PASS |
| check:source-experience | PASS |
| check:v2-bn11-legacy-shutdown | PASS |
| check:v2-bn11-relation-freshness | PASS |
| smoke:canvas-engine-model-contract | PASS |
| build:client | PASS（既有大chunk提示保留） |
| build | PASS |
| smoke:canvas-engine-performance | PASS |
| docs:check | PASS（index/inventory/glossary整链） |

## 说明书与交接

`docs/agent-ops/current-state/app-operating-manual.md:37` 已补引文/提示框入口、display存法、分页、绢本、表头三开关与首张打印差异。

新增 migration080仅扩既有 `skin_suites.material_preset` CHECK，保留原七列/行/rowid/索引/trigger/外键，历史072未改；临时重建表无残留。用户已有运行中的服务未重启，套装保存需按原启动流程加载080。迁移回归包括五旧值（四皮+null）逐行无损、重复执行与silk插入。

Relation 域、工具注册表、Agent 机关、TextFlow schema、page_frame_local九条坐标契约及操作权限配置均未修改。没有新设计安全对抗用例、没有合成长凭据。既有安全回归随全量执行。ContentGroup与Relation共面部分依禁区不动；全应用去盒、主观验收、git/secrets及放行均留HQ。

原始日志统一在 `.codex-tmp/b3-furniture/`，蒸馏/图片在本目录（5份Markdown、32张PNG）；工作树交HQ，无commit。本次自建5189/5190截图服务已停止，脚本保留可重现，用户服务未触碰。只读工作树末次清单在 `git-status-final.log`；开工时已存在的 `.claude/settings.local.json` 与09-07/09-09审计文件保持原样。
