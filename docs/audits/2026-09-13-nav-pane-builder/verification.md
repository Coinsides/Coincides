> **状态 (Status)**: active
> **层 (Layer)**: 本单验证判据 / Verification evidence
> **日期 (Updated)**: 2026-09-13
> **范围**: 单5 导航窗格二轮；builder 施工与验证回执，不代替 HQ 放行

# 单5 二轮验证

按[工单全文与补遗一](../../agent-ops/handoffs/2026-09-13-v14-nav-pane-order.md)实现导航窗格。client 全库零排除通过；原有凭据设置 UI 功能回归包含在内，没有新增安全对抗类用例。

## 交付行为

- `NoteRuntimeDocumentLayer` 内新增左侧非模态窗格，原纸面编辑器持续挂载。开关位于 `NoteWritingSurfaceLayer` 的 Page reading controls 内，紧邻既有 View options，名称为 Navigation pane，使用 PanelLeft 图标。
- 宽屏固定 256px，不提供宽度调整，因此无可调宽度持久化。开合偏好保存至 localStorage 的 `coincides:note-navigation:open`；页签保留在当前 runtime 会话内，关开窗格不丢失；重载默认 Pages。
- `max-width: 900px` 时变为文档区内绝对定位的 288px 抽屉，停靠占位宽度为 0，无遮罩和模态语义。未覆盖原 navigator；未改右舷 Staging/Groups 实现。Esc 不关闭窗格。
- 页签依次为 Headings / Pages / Results；支持方向键、Home、End 切签。Headings 仅有一句占位文案。
- Pages 单列缩略复用 `NotePageThumbnail → NoteReadOnlyPageContent`；E4 改为调用同一组件，块与 ink 仍使用原只读投影。按可见范围懒挂载，纸面滚动更新当前页，高亮页在缩略窗格内跟随；点击缩略调用既有纸面滚动服务。
- Results 在 180ms 防抖后搜索当前笔记已加载纸内文本及实时草稿，含页头标题/描述、普通文字、代码和公式字段；命中片段加亮、显示机械页码，点击跳块并提供 2.2 秒临时高亮。零结果和清空状态均已实现。
- 跨页块缺少字符到页的映射，结果如实显示该块所在页集合，并跳至第一片段；未伪造精确词页码。侧桌内容、媒体资产及另外读取的 ItemSummary 不作为纸内正文搜索源。
- 实际浏览器暴露并已修复：runtime 数据对象刷新会将用户手动浏览的缩略列表拉回当前纸页，导致远页点击落错页。现在仅在当前页或视口尺寸真正变化时执行列表跟随；新增回归覆盖数据对象连续重建、手动浏览页位置保留和真实当前页改变。

## 测试判据

最终执行 `npm run test:unit`：**167 个测试文件、1722 项测试全部通过，0 排除**。包含 `ProvidersSection.test.tsx` 的 4 项既有功能回归。

本单新增 28 项定向用例，均包含于上述整跑：

| 范围 | 新增数 | 覆盖 |
| --- | ---: | --- |
| `noteNavigationSearch.test.ts` | 10 | 已加载文字/草稿、公式代码、字面匹配、页头、跨页与坐标、边距、侧桌排除、空结果 |
| `useNoteNavigationController.test.tsx` | 3 | 页头实际 DOM 跳转、高亮清理、跨笔记清理 |
| `NoteNavigationPages.test.tsx` | 6 | E4 同源、单列与比例、懒挂载、当前页跟随、浏览位置保留、点击与编辑焦点 |
| `NoteNavigationPages.requests.test.tsx` | 2 | 真实 renderer 的媒体/引用请求次数与卸载；text+ink 零请求 |
| `NoteRuntimeDocumentLayer.test.tsx` | 7 | 开关与持久化、会话页签、非模态编辑/Esc、跳页、搜索/跳块/清空/零结果、窄屏样式 |

E4 `NoteOverviewLayer.test.tsx` 原 14 项及 runtime document 文件全部 22 项同时通过；没有用定向测试替代全库。

### runtime 门禁

原 `verify:v2-bn8-runtime` 总链有 23 个子项，其中末尾 Git 与 changed-file secrets 两项按工单五.4交 HQ；builder 未调用整条入口。其余 **21/21 个子项分别执行通过**：

| 子项 | 结果 |
| --- | --- |
| `check:test-wiring` | 78 文件全部接线；0 豁免、0 漏接 |
| `check:tech-debt-table` | PASS |
| `test:unit` | 167 文件 / 1722 测试 PASS |
| `test:tool-face-registry` | 5/5 PASS |
| `test:tool-face-manifest` | 10/10 PASS |
| `check:tool-face-manifest` | 14 条，全部 public，未过期 |
| `test:tool-face-parity` | 10/10 PASS |
| `check:tool-face-parity` | 14 条 public 的必要条件检查 PASS；不宣称人类旅程全部验证 |
| `check:server-shared-runtime-import` | 246 产品源文件，0 违规 |
| `check:canvas-runtime-boundary` | 174 checks PASS |
| `check:group-gallery-shell` | 8 checks PASS |
| `check:groups-rail-shell` | PASS |
| `check:single-editor-shell` | PASS |
| `check:source-experience` | 静态与 model PASS |
| `check:v2-bn11-legacy-shutdown` | PASS |
| `check:v2-bn11-relation-freshness` | PASS |
| `smoke:canvas-engine-model-contract` | 60 组 PASS |
| `build:client` | PASS；Vite 既有大 chunk 提示，不影响退出码 |
| `build`（server） | PASS |
| `smoke:canvas-engine-performance` | 5 场景 PASS；本次汇总 13.51ms |
| `docs:check` | 索引、object inventory、glossary K1–K3 PASS |

另外 client/shared/server 三端 typecheck 与 shared build 均 PASS。性能场景为 50、200、80（长段落）、120（公式密集）、160（page/workspace 混合）blocks，不将这些模型测量描述为浏览器体验指标。

第一次 docs 检查发现 `docs/agent-ops/INDEX.md` 已过期；保留编辑前镜像后由既有 `scripts/docs-index.mjs` 更新，重跑通过。旧运行收据中的 exit 1 保留，最终判定采用修复后的复验结果；工单状态更新后再次生成索引并复验。

## 真浏览器冒烟

使用 Chrome 的独立测试标签页，连接本次新建本地测试服务：Vite 49730、server 49729。所有数据为新造六页、18 个文字块的隔离夹具；数据库、上传和资源目录均在本次 `.codex-tmp/nav-pane-round2/` 临时区域，provider 目录单独新建于系统 TEMP，dotenv 指向新建空配置。没有读取现有 `.env` key 或用户库。初始夹具坐标契约校准为本项目既有 v2 坐标模式后进行以下正式复验。

| 操作 | 实际观察与判定 |
| --- | --- |
| 开窗格 / Pages | 左侧显示六页单列缩略，当前页有 `aria-current=page`；纸面仍挂载，原 navigator 保留 |
| 点击第五页缩略 | 稳定跳至第 5 页；纸面主滚动量约 4408px，当前页为 5 |
| 继续滚动纸面 | 第 6 页成为当前页；主滚动量约 5853px，窗格仍停靠于顶部 16px |
| Results 搜索 `cobalt` | 2 个结果：Section 2 在 Page 1，Section 15 在 Page 5；命中词加亮 |
| 点击第二结果 | 跳到 Section 15；块顶距视口约 23.8px，DOM 临时高亮标记存在 |
| 窗格开着编辑纸面 | 在 Section 15 通过真实编辑器输入 `browser edit`，Results 找到 Page 5；刷新后仍能检索，确认正常保存 |
| 零结果 / 清空 | `no-match-nav` 显示无结果；Ctrl+A、Backspace 清空后列表立即清空并恢复搜索提示 |
| Headings / Esc / 关开 | 仅占位句；Esc 后窗格仍在；关开仍保留 Headings 页签 |
| 800×900 窄屏 | 抽屉 288px、停靠占位 0；纸面与原 navigator 均保留，无 aria-modal |
| 901px / 900px 边界 | 901px 时停靠 256px；900px 时绝对定位抽屉 288px、占位 0 |
| 跨刷新开合记忆 | 开启时刷新仍开；关闭时刷新仍闭，`aria-expanded=false`，窗格 DOM 数为 0 |

真浏览器项已执行，不需要以“浏览器不可用”转交 HQ。媒体与 Item 引用请求用真实 renderer 的单元夹具验证，未冒称它们也在此文字浏览器夹具中验证。浏览器视口覆盖已恢复。

## 请求台账与未做项

新增 endpoint 为 0；普通文本、公式、代码、ink 和搜索本身无额外挂载读取。媒体与 Item 引用缩略会沿用 `GET /canvas-assets/:assetId/blob`、`POST /items/summaries` 两种既有读取，并增加调用次数。准确生命周期、参数、懒挂载重读次数与全部 167 个 client 测试文件的相关夹具普查见 [mount-request-census.md](mount-request-census.md)。不申报“所有内容类型零新增挂载请求”。

未做标题树及 heading 铺垫，未变更 writing_role/TextFlow 契约、桌面壳、右舷实现、Agent 面、server 检索、embedding、跨笔记检索；未新增依赖。全程零 Git 命令、未接触 `.git`、无 commit。新写合成凭据常量均不超过 20 字符；原有测试中的值按补遗一保持原样。

Git 差异检查与 changed-file secrets 检查留 HQ 收口，主观验收与放行也留 HQ。审计目录只保留本判据、请求台账与镜像 numstat；原始日志、隔离夹具与构建产物不放入审计目录。

numstat 以 `.codex-tmp/nav-pane-round2/before/` 编辑前字节镜像为基准，使用换行归一化的逐行 LCS，文件 SHA-256 见 [numstat.json](numstat.json)。它不是 Git diff；机器生成的 numstat 文件自身不计入自身统计。
