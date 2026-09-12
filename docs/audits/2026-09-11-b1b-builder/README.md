> **状态 (Status)**: active
> **层 (Layer)**: 审计证据 / Audit Evidence
> **日期 (Updated)**: 2026-09-11
> **权威 (Authoritative)**: 否；本单 builder 验证记录

# B1b builder 证据入口

工单：`docs/agent-ops/handoffs/2026-09-11-v13-5-b1b-board-skin-order.md`。实现清单、覆盖、持久化与最终数字以该工单 `## Result` 为准；本目录提供可复跑证据，不代表 HQ 主观放行。

| 证据 | 用途 |
| --- | --- |
| `delivery.patch`、`delivery-manifest.json` | 本单产品源码/测试 diff（包括未跟踪的新文件）与 SHA256；不写 Git index。 |
| `runtime-gate.log/.json` | 最终完整 `npm run verify:v2-bn8-runtime` 的命令、时间、退出码及全量输出；包含 client 全库、两端构建和现役静态门。 |
| `directed-client.log/.json`、`directed-server.log/.json` | 定向测试；后续新增 client 用例以完整门结果为准。 |
| `mock-census.cjs/.json`、`request-census.md` | 全 client 替身模块图普查与逐挂载入口请求分类。 |
| `browser-report.json`、`browser.log/.json` | Chrome/CDP、生产 BoardPage/纸 runtime/Settings/CourseModal、真实 Express 路由与一次性 SQLite；三级覆写、清除、重开、刷新、场景不变、全部请求记录。 |
| `baseline-manifest.json`、`baseline/` | 开工 tracked tree clean，使用 HEAD 提取现役板源码；仅改审计复制品的相对 Notes import 路径。 |
| `default-regression.mjs/.json` | 原始 PNG 解码逐像素对比；无缩放、无容差。 |
| `00-baseline-*`、`01-default-*` | 默认深/浅主题与现役对照，另有图层、选择侧栏、书签编辑状态。 |
| `02-{quiet-ink,warm-paper,workbench}-*` | 三个非默认预设的板面及图层、选择、书签状态；原始 PNG。 |
| `03-warm-paper-serif-title.png`、`04-nested-paper-independent.png` | 暖纸标题衬线、单纸 default/sans 在暖纸板弹层中的独立重置。 |
| `05-board-override.png`、`06-refreshed-persistent-board.png`、`07-clear-falls-back.png` | 单板 More 覆写、数据库重开刷新读回、清除回项目。 |
| `e1-recheck/summary.json` | 四预设 E1 汇总；每预设有完整断言、所有后代样式检查、hover 强制态及截图。 |

复跑：在 server 目录以 `node --import tsx ../docs/audits/2026-09-11-b1b-builder/serve.mjs` 启动 5196 服务，再在根目录运行 `node docs/audits/2026-09-11-b1b-builder/smoke.mjs`。每次服务启动新建 `.codex-tmp/b1b-browser/run-*/fixture.sqlite`；只用合成账号与新 Chrome profile，不连接 app 数据库或用户 Chrome。`prepare-audit.mjs` 只重建基准副本；E1 的 B1b 适配文件直接保存在本目录，避免生成脚本覆盖它们。

E1：在根目录启动 `node docs/audits/2026-09-11-b1b-builder/e1-recheck/serve.mjs`（5197），依次运行 `e1-recheck/smoke.mjs default|quiet-ink|warm-paper|workbench`（每次传一个预设），最后运行 `e1-recheck/aggregate.mjs`。这是 leaf 样式审计，持久化由主浏览器和服务器测试单独覆盖。

验证中曾修正审计夹具：同 URL 的 Page.navigate 不会重新挂载，因此刷新验证加入唯一 mount 参数；CourseModal 只在 store 中 modal 存在时挂载；互相遮挡的板面板逐个打开审计。曾修正 readonly 组件类型推导；最终日志对应修后实现。中途失败截图不作为交付证据。
