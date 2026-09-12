> **状态 (Status)**: active
> **层 (Layer)**: B1a builder 交付证据，非 HQ 主观验收 / 放行
> **日期**: 2026-09-11

# B1a 二轮交付索引

按工单补遗一交付四预设：默认 / 静墨 / 暖纸 / 工作台。默认收敛现役逐面色值；其余三款逐字取附件九色。全部沿用系统字体；Typography 仍独立。

## 代码与判定依据

- [delivery-manifest.json](delivery-manifest.json)：54 个代码 / 测试 / 常备夹具文件，19 新增、35 修改，逐文件 before / after SHA-256 与行数。
- [delivery.diff](delivery.diff)：无需 `.git` 的统一 diff。基于开工前快照；8 个常备夹具和 Print integration 的 before 为明确标注的精确逆向重构。CourseModal 测试是复查修改前现场快照。不是声称来自 git 的全仓差异。
- [documentation.diff](documentation.diff)：工单 Result / 状态翻 done，以及原 docs-index 脚本相应生成的 INDEX 元数据同步；不计入上述 54 个代码 / 测试文件。
- [make-delivery-diff.mjs](make-delivery-diff.mjs)：显式文件清单与重建方法；[fixture-edit-provenance.json](fixture-edit-provenance.json) 记录夹具逐段变更。
- [variable-coverage.md](variable-coverage.md)：逐面原色盘点、9 token 私有派生、SVG / portal / 打印覆盖。
- [server-persistence.md](server-persistence.md)：共享类型、migration 067、三个既有路由挂点、数据库往返、标准构建限制。
- [fixture-census.md](fixture-census.md)：8 个既有账本、10 个浏览器入口和 1 个真实 runtime 测试；逐项说明其他消费面为何无需新增 GET。

## 最终验证收据

| 验证 | 最终结果 | 证据 |
|---|---|---|
| Client 定向功能及受影响回归 | 14 文件，183 / 183 | [JSON](client-final-tests.json)、[日志](client-final-tests.log) |
| Server 新增皮往返 | 4 / 4，实际临时 SQLite 关闭 / 重开 | [日志](server-skin-tests.log) |
| Server 既有 Note / Course 正常路径 | 4 + 1 / 5 | [Note](server-skin-regression.log)、[Course](server-skin-course-regression.log) |
| 真 Chrome、生产组件、合成 API / localStorage | 37 / 37；失败请求 0、保存错误 toast 0、未捕获异常 0 | [报告](skin-smoke-report.json)、[日志](skin-smoke-final.log) |
| 四皮 E1 | 252 / 252；嵌套边框 / 后代阴影 / 圆角 / 静态卡底均 0 | [说明与四色截图](e1-recheck/README.md)、[汇总](e1-recheck/summary.json) |
| 默认像素回归 | 1,584,000 像素，差异 0，最大通道差 0 | [报告](default-regression.json)、[当前](default-regression.png)、[改前](baseline-paper.png) |
| 受影响静态及文档门 | 全部 exit 0；runtime boundary 167、gallery 8 | [命令 / exit 收据](static-checks.json)，对应 static-*.log |
| Client 最终 typecheck + build | 原 npm 管线，审计输出目录，exit 0 | [日志](client-final-build.log)、client-final-build/ |
| Server / shared 完整源码 typecheck + emit | exit 0；原 manifest check / copy 通过，14 public tools | [同源配置](server-skin-typecheck.json)、[编译日志](server-skin-build-local.log)、[manifest copy](server-skin-manifest-copy-local.log) |

Client 183 包含皮引擎 8、皮 hook 7、皮 adapter 10、原 adapter 105、颜色映射 4、Ink 19、Settings 1、CourseModal 4、SkinEditor 2、runtime controller 4、Print 15、真实 Board modal/unboxing 4。新增并发用例覆盖晚到 Typography 成功 / 失败回滚、阅读解释和批注建议的旧 metadata 响应：只能更新其自身字段，保留最新皮选择；切页 / 重载后旧响应不得污染当前纸。失败保存留预览及重试状态，切路由须等候注册队列。

原标准 server build 的受限路径失败仍保留在 server-skin-build.log：shared/dist 写入 EPERM 导致新增声明文件缺失。未改 ACL、权限或生产 tsconfig；同一套 server/shared 源码在审计输出目录完成全量 typecheck 和 JS / declaration emit，再用原 manifest copy 脚本产出完整独立包。Client 首次最终构建发现测试 metadata 可选链类型错误，修正后完整管线通过；前次诊断保留于 client-final-build-prefixed-test-types.log。

按本工单明确的“受影响静态门 + E1”及禁安全类测试 / `.git` 范围执行，未调用包含这些额外步骤的聚合 verify:v2-bn8-runtime。先前亲跑 canvas model contract 60 组通过；上表仅以有持久日志的最终门为准，不将同一测试的多次运行相加。

## 浏览器与像素证据边界

最终四皮整页截图：[默认](02-default-full.png)、[静墨](02-quiet-ink-full.png)、[暖纸](02-warm-paper-full.png)、[工作台](02-workbench-full.png)。[全局设置与高级覆盖](07-advanced.png)、[Project 皮](04-project-workbench.png)、[纸级刷新](05-paper-refresh.png)、[逐层清除](06-clear-inherits.png)、[打印预览](09-print-preview.png)、[暖纸 PDF](warm-paper-print.pdf)。截图已亲看；系统标题字体与 sidebar 底色在四色循环中均有断言。

默认像素对比使用原 D2 夹具、相同视口、当前生产代码、禁用浏览器缓存，并检查根上实际存在默认预设与 --sk-paper。两张 PNG SHA-256 均为 `50c64c0298dac821ac3335747191134cc9f0df5a22ae65064b2df2ed2ecb611d`。该精确像素结果限于已捕获的默认闭合纸页 / 桌面状态；浮层由逐面旧值盘点和 E1 单独覆盖，未声称每种组合都做像素穷举。Info 旧嵌套框按本单 E1 要求另作修复，打印原先强制白纸改为跟合成皮，均不冒称与旧画面完全相同。

最终 smoke 在既有 data router 内导航，触发真实保存边界；预设 select 用浏览器 DOM change 事件，其他按钮用 CDP 鼠标事件。早期 runner 使用外部 Page.navigate 改 hash，绕过 Router 的可阻塞历史记录，卸载后的旧 history scope 产生已 catch 的保存提示，旧 26 项报告不能证明无 toast。最终改走 router.navigate，并新增失败请求 / toast 断言，37 项全部通过；没有通过隐藏或清除错误提示取证。浏览器的刷新往返限于合成 localStorage；真实数据库持久化另由 server 临时 SQLite 测试承担，未写用户数据库。

## 重放

在仓库根启动 `node docs/audits/2026-09-11-b1a-builder/serve.mjs`（127.0.0.1:5191），另一个终端运行 `node docs/audits/2026-09-11-b1a-builder/smoke.mjs`。运行默认像素检查用 `node docs/audits/2026-09-11-b1a-builder/default-regression.mjs`；E1 的 5192 服务与四色命令见其 README。全部使用专用合成 Chrome profile，不连接用户浏览器资料。

静态门可用 `node docs/audits/2026-09-11-b1a-builder/validate-static.mjs` 重放。详细构建命令见 [engine-hook-and-build.md](engine-hook-and-build.md)。历史 stop-report 与中间诊断保留溯源，最终结论取本索引和工单 Result。
