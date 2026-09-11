> **状态 (Status)**: active
> **层 (Layer)**: builder 合成浏览器证据（非 HQ 放行）
> **日期**: 2026-09-11
> **工单**: [13.5 E1](../../agent-ops/handoffs/2026-09-11-v13-5-e1-menu-debox-order.md)

# E1 合成浏览器冒烟

最终 [smoke-report.json](smoke-report.json)：**55 passed / 0 failed**；**8 种浮层、16 份 rest/hover 样式采样、55 个强制 hover 控件**。所有采样的嵌套边框、嵌套阴影、后代圆角和静态卡底均为 **0**。rest 采样共 **11 条单侧水平 1px 发丝线**，按工单允许的分组分隔计算。浏览器无运行时异常。

这里直接渲染生产 `NoteChromeLayer`（含 `ExportPreviewLayer`）、`ViewOptionsMenu`、`NoteFloatingPanelLayer`、`FloatingOverlayLayer` 和实际 CSS；浮层互斥使用生产 `useFloatingOverlayController`。所有笔记、块、PageStack、来源及导出分组均由 [browser-fixture.tsx](browser-fixture.tsx) 合成，业务回调只写内存账本，没有服务端或数据库。

这是组件浏览器验证，未挂载完整 `NoteWritingSurfaceLayer` / `NoteCanvasRuntime`，也不宣称保存、数据库恢复或完整纸面渲染已由这个 fixture 验证。Layout 行动作验证传出的 frame/stack ID；删除、恢复验证原组件调用及合成结果；视图选择验证 gear、选中态和生产 `derivePageReadingViewport` 的缩放计算。完整 runtime 绑定由工单 Result 中的定向测试补充。此 fixture 不包含 Overview、Write/Pen/Eraser 或缩放步进工具，未对它们做新测试或改动。

## 重放

在仓库根目录的两个终端执行：

```powershell
node docs/audits/2026-09-11-e1-builder/serve.mjs
node docs/audits/2026-09-11-e1-builder/smoke.mjs
```

第一条只在 `127.0.0.1:5187` 提供合成 fixture（可手动打开）。第二条通过 Node 内置 WebSocket/CDP 驱动本机 Chrome 152，视口 **1280 × 960**，报告及截图写回本目录；不安装依赖。默认 Chrome 路径为 `C:/Program Files/Google/Chrome/Application/chrome.exe`，可用 `E1_CHROME_PATH` 指定其他路径。CDP 端口为 9337，专属测试 profile 在 `.codex-tmp/e1-synthetic-chrome`，不使用用户 Chrome profile。

本机受管环境拒绝普通 Chrome renderer/GPU 子进程；可复现脚本为此给**这一个合成 headless 测试进程**传入 `--no-sandbox` / `--in-process-gpu`，并关闭后台网络活动。没有修改系统、仓库或用户浏览器的权限配置。browser-harness 因无法读取用户 profile 的 `DevToolsActivePort` 未被用于取证。停止 fixture 服务可在第一终端按 Ctrl+C；脚本结束会关闭自己的 Chrome。

## 样式断言

[smoke.mjs](smoke.mjs) 在实际浮层根节点内遍历全部 DOM 后代，读取 `getComputedStyle` 的四侧 border width。只有**恰好一侧、水平、宽度 ≤ 1px**的规则被计为发丝线；垂直边、多侧边都失败。同时检查后代 `box-shadow`、四角半径及非 hover/focus 元素的非透明底色，避免边框删了却仍是圆角卡片。

同一检查再以 CDP `CSS.forcePseudoState` 对该浮层所有可用 button、role=button、summary、input、select 强制 hover 重跑；不会触发业务 handler。CSS 伪元素不属于 DOM 后代计数；图标、tooltip 伪元素与键盘 focus outline 未冒充条目边框。Export 的实际 pointer hover 另有截图和不横向溢出的断言。

| 浮层 | DOM 后代数（单次） | 发丝线（rest） | 截图 |
|---|---:|---:|---|
| More / Typography | 67 | 1 | [More](01-more.png)、[改值](02-typography.png) |
| Info | 22 | 0 | [Info](03-info.png) |
| Deleted blocks | 17 | 0 | [回收站](04-trash.png) |
| Layout / PageStack | 187 | 2 | [Layout](05-layout.png) |
| Export preview（7 个 details 全开） | 149 | 8 | [导出](06-export.png)、[展开分组](07-export-all-details.png)、[帮助 hover](07b-export-help.png) |
| Delete confirmation | 5 | 0 | [居中确认框](08-delete.png) |
| View options | 11 | 0 | [视图菜单](09-view-menu.png) |
| Source snapshot | 12 | 0 | [来源快照](11-source-snapshot.png) |

八类浮层每次的嵌套边框计数都是 **0**。Export 最终 `clientWidth=418` / `scrollWidth=418`，帮助 hover 后仍为 418/418。最初分组纵向展开时，居中的 tooltip 导致 488/418 横向溢出；[初始几何记录](initial-export-overflow.json)保留诊断，最终截图与报告均为右边对齐修复后的结果。删除确认框新增居中后的几何断言通过。

## 行为证据

- More 打开/关闭；死占位文字不在 DOM；New PageStack、收藏分别触发原回调。
- Typography 的 size=20、line=32、spacing=12 通过实际鼠标/键盘输入，Georgia 通过原 select change；各项接到保存回调并显示新值，Reset 恢复默认 profile。未宣称此内存 fixture 做了持久化。
- Info 内容、More → Info、More → Deleted blocks 切换；恢复回调收到完整合成块后，抽屉显示 `Nothing to restore.`。
- Layout 开/关；新增下页、拆栈、复制、主页面、脱离、删页、合并、折叠及行选择均验证原 handler 传出的目标 ID。
- Export 四个 overlay toggle 的 `aria-pressed` 均反转，7 个 details 的内容与跨界/scratch 警告都可读，帮助 hover 不溢出。
- Delete 打开先不调用；Cancel 不调用；Move to Trash 仅调用一次并关闭原 dialog。
- Fit width / Fit page / 100% physical 完整文字可见，各自生效、关闭菜单，重开后唯一 `aria-checked=true` 与当前 gear 一致。对应固定合成尺寸的 displayScale 分别为 900/794、600/1123、1。见 [width](10-view-fit_width.png)、[page](10-view-fit_page.png)、[physical](10-view-physical.png)。
- View 向上锚定；View 与 More、Preview 双向切换保持互斥；Escape 关闭并回焦 icon。Source snapshot 可打开/关闭。
- 原 readonly Typography/New PageStack/Delete 禁用，以及 modal host Delete 禁用与 `Open full page to use this` 提示保持。见 [readonly](12-readonly.png)。

本目录新增的是工单要求的合成冒烟脚本和证据；未修改既有测试。D2 / View 定向套件、typecheck、build 数字和既有测试的唯一断言调整请见工单 `## Result` 与 `validation/`。未运行安全类测试，没有 git commit 或 `.git` 写入。
