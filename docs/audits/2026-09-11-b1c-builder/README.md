> **状态 (Status)**: active
> **层 (Layer)**: B1c builder 审计证据说明
> **日期**: 2026-09-11
> **权威 (Authoritative)**: 否；builder 交付验证记录，非 HQ 放行

# B1c 证据索引与边界

本目录保存三纸型选型、真实人类创建入口、Web 单帧书写、打印投影、墙调整与历史 A4 对照的施工证据。Web 首次写入正文误用 760 内容宽的问题已修补；最终新纸从首次草稿即使用 992 内容宽，并重取 `14`–`20` 截图与打印 JSON/HTML。最终 client 142 文件 / 1517 测试通过，server 定向 6/6；原生 afterprint 与原生预览截图仍未确认。

## 启动与隔离

从仓库的 `server` 目录运行：

```powershell
node --import tsx ../docs/audits/2026-09-11-b1c-builder/serve.mjs
```

浏览器打开 `http://127.0.0.1:5197`。`main.tsx` 挂载真实 `CourseDetailPage`、`BoardPage`、`NoteDetailPage`，分别使用 `#/projects/:id`、`#/boards/:id`、`#/notes/:id`。人类 API 路由在隔离服务器中执行，owner 为 synthetic fixture 用户；未知 API 显式 404。没有 mock 未知请求为空成功。

每次启动由 `mkdtemp` 创建新的 run 目录。现有证据对应：

```text
D:/Coinsides/v2.x/Coincides/.codex-tmp/b1c-browser/run-XMLvw2/fixture.sqlite
```

canvas asset / source blob 目录也在该 run 内。空新库在种子前显式设置 `database_meta.coordinate_contract='v2'`，与现役纸墨 fixture 做法一致；没有迁移应用库或已有笔记。再次启动会创建不同 ID / run，因此旧 bootstrap URL 不能沿用。

- `GET /__fixture/bootstrap`：当前 project、board、legacy note、member ID 与 synthetic 用户。
- `GET /__fixture/state`：notes 原始行、真实 canvas persistence、legacyBaseline、全部 API 请求状态。
- `POST /__fixture/reopen`：关闭并重新打开同一隔离库，供持久化复核。

上述启动会重写本目录 `browser-seed.json`。若需保留这次 run 的完整原始证据，应先将现有 seed/状态收据归档至同一审计目录的另一个明确文件名，再启动新的 run。

## 当前纸与已知结果

| 纸 | ID | 当前证据 |
| --- | --- | --- |
| 历史 A4 | `05827ac4-9213-461f-869d-800dee82671c` | `page_format='flow'`，904×1278；墙 L88/R56/T24/B110；pre/post-reopen 的 note+canvas 均与 legacyBaseline 深度相同。 |
| 新 A4 | `1cdcbbb7-60a2-4011-8280-4d602bc75fda` | `a4_portrait`，904×1278；墙 T0/R72/B96/L72。 |
| 新 Letter | `759916c1-5e6a-4b31-bbb7-db07f300f3ed` | `letter_portrait`，904×1170；墙 T0/R72/B96/L72。 |
| 首次 Web 尝试 | `1a7fdd10-d7ee-400b-af9f-9cf512d51e48` | `screen_note`；超限草稿保存失败，另留墙调整前后截图；不能把该草稿当作成功持久化长文。 |
| 中间 clean Web | `5764dbdb-d654-4f79-8710-22df4430ebe1` | 宽度修补前的中间纸；保留作迭代记录，不作为最终宽度证据。 |
| 最终 Web | `c7e9a0c9-82ae-4808-8043-982c3bb2430c` | `screen_note`；首次草稿即为 992 内容宽；15,869 字符长文与 76 字符续写、同帧增长、四页打印投影及同库重开均有最终证据。 |

Web 的数据库 frame 高度 720 是初始种子高度，阅读 / 打印使用内容测量派生的增长高度；不要把 JSON 内 seed 高度直接当作屏幕上没有增长。最终 Web `beforeprint` 捕获的 canvas 为 1120×5859、正文片段宽 992，四片打印页均指向同一 `primary-page-frame`。屏幕书写保持一个持续生长的帧，分页只发生在打印投影。

## 打印证据的实际含义

`printProbe.ts` 是仅用于审计的观察器；它调用真实 `window.print()`，监听浏览器原生 `beforeprint`，读取产品已生成的 `[data-note-print-root]`、页片和正文片段，并保存 HTML / JSON。它没有合成 `beforeprint` 事件。收据通过 localStorage 保留，以免取消打印时刷新页面导致证据丢失。

当前 `native-print-receipt.json` 明确记录：

- `trigger='window.print'`，`beforeprintSeen=true`；
- `afterprintSeen=false`，`printMediaAtCapture=false`，`restoredFromLocalStorage=true`；
- note 是最终 Web `c7e9a0c9-82ae-4808-8043-982c3bb2430c`，四片同帧，sliceIndex 0/1/2/3；偏移 0/1584/3168/4752；
- A4 打印盒约 793.69×1122.52 CSS px，比例约 0.708661；前三页 `breakAfter='page'`，末页 `auto`；
- 长文的 CLEAN-WEB-BEGIN / CLEAN-WEB-END 及末页续写片段均有记录。

这是**真实 beforeprint 时产品打印投影的捕获**。最终 `16-native-beforeprint-final.png` 显示审计状态；`17`–`19` 是有标签的冻结投影屏幕呈现。它们都不是 Chrome 原生打印预览窗口的截图；`native-print-capture.html` 是冻结的产品打印 DOM，也不是原生预览。当前没有确认原生 `afterprint` 返回，不能声称完整原生预览关闭往返已验证。早期 `08` / `10` 是中间观察，不能冒充最终截图。

既有文字高度估算为内容保留的空间超过实际字形占用，续块继续按既有坐标打印，因此四页中可见中间留白。该现象在 `browser-summary.json.caveats` 明记；本单没有改旧排版 / 文字估高或打印刻度，也没有把续块重新排紧来修饰截图。正文结束标记与续写的保存 / 同库重开结果均完整。

## 请求失败尝试

最终 `browser-summary.json` 记录 364 次请求、6 张纸；同库重开前后 notes/canvas 与文本严格相同。请求日志保留此前四次失败，不能声明整个日志零 4xx：

| 数量 | 请求 | 原因与证据归属 |
| ---: | --- | --- |
| 1 | `GET /api/boards/aa67fbff-862d-4ce7-a602-eccf03940f9c` → 404 | 夹具重建后沿用前一 run 的 board ID。当前 board ID 为 `638a8de2-62f0-4925-8935-cdb7f8384b19`。 |
| 2 | 首次 Web 的 `POST /blocks` → 400 | `plain_text` / body 均为 29,057 字符的超限草稿。 |
| 1 | 同上 → 400 | 再次尝试的草稿为 29,101 字符。 |

这些是夹具建立 / 失败尝试，原日志照留。后续分别建立中间 clean Web 与宽度修补后的最终 Web，避免将失败草稿和成功保存证据混在同一张纸上。最终状态验证通过，整个保存区间内仍只有表中这四次既有失败；它们未被删去或记成成功。

## 文件索引

| 文件 | 用途 |
| --- | --- |
| `serve.mjs` / `index.html` / `main.tsx` | 隔离真实路由服务器、前端入口与打印审计入口。 |
| `fixture-census.md` | 全 client mock / 请求夹具射程、施工前数字、已补 payload 承接及最终验证回填。 |
| `browser-seed.json` | 当前 run、种子 IDs、历史 note+canvas baseline。 |
| `browser-server.log` | 该隔离服务器启动与请求过程的原始日志。 |
| `browser-pre-reopen.json` / `browser-post-reopen.json` | 最终同库重开前后 notes/canvas 严格相同，历史纸与 baseline 相同。 |
| `browser-final-blocks.json` | 最终 Web 两个正文块的保存文本，长度分别 15,869 / 76，重开后 exact equality。 |
| `browser-observations.json` | 分阶段实际 DOM 观察，包含最终 Web 首次草稿与持续生长；每项带 label，早期记录不冒充 final。 |
| `verify-browser-state.mjs` / `browser-summary.json` | 已通过的真实隔离状态验证器与汇总：6 notes、364 requests、三项 exact equality=true、最终 992 内容宽 / 四片打印。 |
| `01-project-selector.png` / `02-a4.png` / `03-letter.png` | Project 安静选择器、新 A4 与 Letter 页面。 |
| `04-board-selector.png` / `05-web-modal.png` | Board New note 选择器和新 Web modal。 |
| `06-web-long-tail.png` / `07-web-wall-adjusted.png` | 首次 Web 改用限内正文并保存后的尾部与墙调整；此前超限草稿失败单列，不冒充成功。 |
| `08-native-beforeprint-status.png` | 首次原生 beforeprint 观察状态；不是原生预览截图。 |
| `09-web-clean-long.png` / `10-native-beforeprint-clean.png` | 中间 clean Web 的长文 / 打印观察状态，保留作迭代记录。 |
| `13-legacy-unchanged.png` | 历史 A4 特殊墙页面对照，持久化结论以 JSON 为准。 |
| `14-web-final-head.png` / `15-web-final-tail.png` | 宽度修复后全新 Web 的正文开头 / 尾部，单帧 992 内容宽。 |
| `16-native-beforeprint-final.png` | 最终真实 beforeprint 审计状态；原生 afterprint 未确认。 |
| `17-frozen-print-first.png` / `18-frozen-print-last.png` / `19-frozen-print-text-end.png` | 最终冻结打印投影首页、末页、文字结束标记；不是原生预览窗口。 |
| `20-web-after-database-reopen.png` | 最终 Web 在同一隔离数据库重开后的页面。 |
| `printProbe.ts` / `native-print-receipt.json` / `native-print-capture.html` | 原生 beforeprint 观察器、四页投影收据和冻结 DOM；afterprint 未确认。 |
| `runtime-gate.log` | 首轮全库两个失败的诊断记录，保留历史。 |
| `runtime-gate-final.log` | 中间一轮 141 文件 / 1515 测试通过。 |
| `runtime-gate-closure.log` | 内容宽度修补前一轮 141 文件 / 1516 测试通过；不是最终补丁验证。 |
| `runtime-gate-final-width.log` | 宽度补丁后最终 runtime gate 退出 0：142 文件 / 1517 测试、168 boundary、60 model、两端 build。 |
| `server-directed-tests.log` | server 定向 6/6，通过、无失败/跳过/取消。 |
| `client-typecheck.log` / `server-typecheck.log` | 最终两端独立 `tsc --noEmit` 通过。 |
| `product-changes.patch` / `product-change-inventory.json` | 31 个产品/测试/静态门文件的完整 diff（含 6 个新增文件）与清单。 |
| `final-docs-check.log` | Result 与生成索引同步后的 docs 检查。 |

上述 runtime 聚合日志含必要条件门自身的负控输出，不能仅搜索 `[FAIL]` 就推断整套失败；应按对应测试总结、命令退出码判断。日志也记载执行过 changed-file scan；本说明不将其隐藏或改写成“未运行”。本稿作者仅做证据阅读与归档说明，没有重新运行该扫描。

## 最终验证与保留边界

最终 `npm run verify:v2-bn8-runtime` 由主 builder 执行并报告退出 0，日志为 `runtime-gate-final-width.log`：client **142 文件 / 1517 测试全部通过**，canvas boundary **168**，model contract **60**，两端 build（含 TypeScript 编译）通过。server 定向 **6/6**。这些数字只计最终一轮，不累计早期运行。

`verify-browser-state.mjs` 已通过，结果落 `browser-summary.json`；宽度修复后的最终 Web 已重新取证。原生打印预览截图与 afterprint 返回仍未确认；打印证据止于真实 beforeprint 投影捕获、冻结可视化以及同库文本保存校验。既有文字估高导致的中间留白与既有续块坐标照实保留。工单 Result 与后续独立复核据此判断放行。
