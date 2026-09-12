> **状态 (Status)**: complete
> **层 (Layer)**: 验证收据 / Evidence
> **日期 (Updated)**: 2026-09-12
> **权威 (Authoritative)**: 否；本单施工证据，不代替 HQ 复核与放行

# B1e 外观清扫施工证据

工单：`docs/agent-ops/handoffs/2026-09-12-v13-5-b1e-appearance-cleanup-order.md`。六项施工与指定功能冒烟完成。没有使用 Git，没有读取 `.env` 值，没有执行安全类测试，没有改动旧 audits 冻结副本。

## 最新验证入口

- client 全库：`client-all-final.log`，144 文件 / 1538 tests，全部通过。
- 最终 client typecheck/build：`desk-build-final.log`；server/shared：`build-server.log` / `build-shared-result.json`，均 exit 0。
- 最终 canvas 边界：`desk-boundary-final.log`，168 checks PASS。其余静态/模型/性能门见 `build-and-static-gates.md`、`static-gates-results.json`。
- 外观：`appearance-unit.log`，23 tests；墙：`walls-targeted.log`，26 tests；皮肤：`skin-client-tests-final.log`，27 tests；服务端皮肤：`skin-server-tests.log`，6 tests。定向数字包含于全库的部分不能重复相加。
- 补充 manifest 测试 10/10：`test-tool-face-manifest.log`。manifest / parity 静态门、server/shared import（230 文件 / 0 违规）、docs inventory、glossary 均 PASS，各有同名日志。
- `docs-check.log` 记录额外文档门的既有失败：`docs/agent-ops/INDEX.md` 过期。发现时工单尚未写 Result、所有文档均未修改；本单未改该索引。不能将此报告表述成整个总验证脚本全绿。

## 隔离浏览器冒烟

实际 Chrome 标签页，使用 CUA 原生点击、拖动、键盘、滚动，以及只读 DOM/CSS 测量。browser-harness 首次连接因不能读取 Chrome DevToolsActivePort 失败，随后改用可用的 Chrome 扩展通道，未调整任何权限。独立前端 `http://127.0.0.1:5279` 代理独立后端 `http://127.0.0.1:3109`，仅使用 `.tmp/b1e/smoke.sqlite` 与合成 `b1e@example.invalid` 用户。服务器使用允许名单环境、不存在的 dotenv 路径、空 Provider 目录和独立上传目录。真实应用 5173/3001 未操作。

隔离库新建后默认为 v1；墙仅在 v2 契约下存在，因此仅把该合成库的 `database_meta.coordinate_contract` 设为 v2 后重载做墙验收。没有运行真实库迁移。完整 fixture 脚本保留于 `.tmp/b1e/seed.ts`、`launch.cjs`、`vite.mjs`；只有本次启动的服务在验收后停止。

`browser-functional.json` 记录最终功能值：

1. 外观按钮打开共享浮层，四个预设逐一切换、高亮；详细编辑正文色 `#302A24` 生效；More 无旧入口。
2. 默认/静墨分隔线 hidden 为 none、visible 为原模板边框；暖纸两种开关仍为材质规定的 none。最终 default 的 outline 是 `rgb(42, 47, 56) solid 1px`，对应模板 `#2a2f38`。
3. Settings 600px 宽，左右 margin 均 492px；默认外观 1 个 select、0 个 details。默认外观选择可保存。
4. Provider 默认 `open=false`，展开可见 6 行；未填写或提交凭据、未调用真实 Provider。
5. 非 Layout：墙 pointer-events none、亮线 opacity 0，原生拖过墙后边距保持 72。Layout：两侧 interactive true，右墙原生拖动使右边距 72 → 121.81224489795918，Ctrl+Z 恢复 72；离开 Layout 时墨水工具恢复可用。
6. 暖纸几何与绘制证据如下。

截图：`appearance-warm.png`、`header-rule.png`、`settings-default-appearance.png`、`settings-closed.png`、`providers-open.png`、`wall-layout-drag.png`、`warm-high-zoom-right-bottom.png`。早期截图包含诊断阶段，最终功能以 JSON 和高倍右下截图为准。

## 暖纸诊断与覆盖范围

实际页面是 page 阅读态，body 没有 canvas-runtime-lock；因此 content 的 28px padding 尚在。1920×1080 视口、展开导航时 main 从 x=270 起，纸页原从 x=298、y=28 起，四周露出 main 的 `rgb(15,15,16)`。先以 page host 的负 margin 消除四周空隙，再发现高缩放横向最右下角仍露底：fit_width step=2 时 scrollLeft=650、scrollTop=2346、scrollWidth=2290，原 page 背景宽度只有 1640。

最终仅在 `.page[data-note-host-mode='page']:not(.pageCanvas)` 抵消 28px 并保持至少 100vh，用零模糊 solid spread 绘制横向溢出后的桌面色；现有 main scrollport 裁切绘制。没有改 AppLayout，没有改阅读测量宽度/缩放算法，也未改变 BoardNoteModal。短暂试验的 min-width:fit-content 已撤销，不在交付代码中。

`warm-fit-page.json`、`warm-fit-width.json`、`warm-physical.json` 分别覆盖三种阅读档位，各含 0.5–2.0 全部 16 步 × 顶部/底部 = 32 次，共 96 次。每次 scrollTop 均确实到 0 或 maxScroll；均有内容视口覆盖。前两份记录针对负 margin 后的几何，后加 solid spread 不改变该几何；另以原生横向滚动验证最终高倍右下角，截图已保存。覆盖口径为 main 的内容视口，不把原生滚动条、应用导航栏当作纸面背景。

## 初轮失败与修复

- client 首轮 TypeScript 检出 panel 联合遗漏 appearance 和测试的 exact 类型错误；已补 interactionController 类型并修测试，后续完整 client build 与全库均通过。
- headerRule 初版在祖先定义含 var() 的完整 outline，使模板子元素颜色过早回退；最终 visible 使用 guaranteed-invalid `initial`，由 CSS 消费点解析既有 outline fallback，hidden 为 none。功能已重新在浏览器核实。
- `.tmp` 冒烟启动先遇到 TypeScript 模块格式与 Vite 插件文件扩展名错误，均只在临时启动脚本中修正。

## 未执行项与统计口径

未运行 `verify:v2-bn8-runtime` 聚合命令，因为其尾部会执行 Git 和 secrets 扫描。registry/parity 测试套件含安全语义断言，按本单禁区不执行；正常 manifest 与生产 parity 静态门已单独通过。没有做安全测试、真实 Provider 请求、真实数据迁移、commit/push/PR、主观放行。打印/Board 弹窗未新增浏览器专项，既有结构与边界检查保持；打印 CSS 隐藏屏幕 host，故新增桌面绘制不进入打印树。

`numstat.json` 的比较基准是本次施工前工作树快照，**不是 HEAD**；CRLF 归一后按 LCS 计算增删行。`source-baseline.json` 保存实际改动文件的开工字节（base64）及其哈希，便于不依赖 Git 复核；未触及文件不在该归档中。产品源码/测试合计 29 文件、+431/-52；工单 Result 另计。日志、截图及机器测量均为证据，构建产物未收入本目录。

在仓库根运行 `node docs/audits/2026-09-12-b1e-builder/reproduce-numstat.cjs` 可仅使用本目录归档重算统计，无需 `.tmp` 或 Git。最终工单另计 +79/-1，源码与工单合计 30 文件、+510/-53；此口径不将验证日志/图片/基准本身混入产品代码统计。
