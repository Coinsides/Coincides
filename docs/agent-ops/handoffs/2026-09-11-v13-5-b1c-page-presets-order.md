> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · B1c · 纸型预设 + 建纸选型
> **上游**: token spec §六;13.5 plan 波次 B B1 条(纸型预设 A4/Letter/Web 长页+建纸时选型);现物=pageFramePrintScaleService 预设族(a4_portrait/letter_portrait/screen_note,client 内存定义未持久化选型)

# B1c · 纸型预设

## 零 · 裁定原文

1. **三纸型**:A4(现役缺省)/Letter/**Web 长页**(定宽不限长不分页——单帧持续生长,打印面按既有"Web 长页"语汇分页);现物预设几何为准,⛔改现有 A4 帧几何;
2. **建纸时选型**:新建笔记入口(project 页/板上 New note)加纸型选择(缺省 A4,安静 UI——一个小选择器⛔向导);选型落 note(现物 page_format 列或 metadata,勘定申报);
3. **既有纸零迁移**:存量笔记维持现状;纸型建后 v1 ⛔改型(改型=候后续裁);
4. 墙(contentInset)默认值随纸型(spec §六),建后可调(D1 现役);
5. **双常备条款**:挂载期新请求→全夹具普查;改产品代码→client 全库必跑。

## 一 · 禁区

⛔改现役 A4 几何/打印刻度语义;⛔存量迁移;⛔建后改型;⛔Agent 面;⛔安全类测试;⛔碰 .git;⛔改权限配置。收口跑受影响静态门。

## 二 · 验收

- 两端 typecheck+build 绿;定向+全库绿;
- 冒烟(真浏览器+隔离库):①三型各建一纸,几何正确(Letter 比例/Web 长页定宽持续生长不分页);②Web 长页打字超长不切页,打印预览按 Web 语汇分页;③墙默认随型且可调;④存量纸零变;
- 证据落 `docs/audits/2026-09-11-b1c-builder/`。

## 三 · 申报义务

Result 必含:交付清单+diff、选型持久化勘定申报、Web 长页生长机制说明、冒烟证据、全库数字。冲突停线⛔自作主张。

## Result

**From**: codex(builder) · **日期**: 2026-09-11（Toronto） · **状态**: 施工与自动验证完成；主观验收、放行留 Fable。未 commit。

### 交付清单与 diff

- Project 页与 Board 的 New note 共用 `NotePagePresetSelect`，原生小选择器、默认 A4；创建时同时送选型与对应现役 frame seed。Board 忙碌态禁用选型、失败重试保留选择。
- 新增 `notePagePresetService`，复用现役 `createPrimaryPageFrame` / collection seed；没有修改预设族、A4 帧几何或已有打印刻度。Note runtime 读取 note 选型，Web 单帧随正文、草稿及归属本帧的通用对象向下增长；Web 的新建/插入/复制/删除页、增建 PageStack、改外框尺寸入口关闭，墙仍走 D1 现役调整。
- Web 新纸的初挂正文宽度直接取已载主帧的墙内宽度，修复 Loading 后未触发 resize 时仍停留在 760 的问题；默认立即为 992，墙更新即重算。该修理只作用于 `page_format=screen_note`，旧纸路径保留。
- 打印层对新 Web 纸按既有 Web→A4 定宽缩放派生物理页切片；复用只读正文 renderer，跨切片内容连续裁切，末页不追加空白页。运行时仍是一个 frame。已有历史 Web 模板纸不自动获得新行为。
- server Board ceremony 写入现物 note 字段；note PUT 对新预设的改型返回 `409 / note_page_preset_immutable`，原值重送及普通编辑仍可。没有新 schema migration、Agent 面或权限配置改动。
- 测试覆盖三型创建、默认/忙碌/失败重试、保存重载、旧纸边界、Web 草稿与通用对象增长、单帧续写、初挂与调墙宽度、打印首尾切片、改型拒绝；静态门同步真实的新建 seed 与 runtime 高度数据流断言。

完整产品/测试差异见 [`product-changes.patch`](../../audits/2026-09-11-b1c-builder/product-changes.patch)，共 31 个文件（含 6 个新增文件）；逐文件清单见 [`product-change-inventory.json`](../../audits/2026-09-11-b1c-builder/product-change-inventory.json)。审计夹具、日志与截图另在证据目录。工单改 done 后已通过现役脚本同步 `docs/agent-ops/INDEX.md`，只更新本单状态行。

### 选型持久化勘定申报

使用既有 `notes.page_format`，值为 `a4_portrait` / `letter_portrait` / `screen_note`。没有新增列，也没有把选型藏进 metadata。既有 GET note 已返回该列；client Note 类型补可选字段，兼容旧 fixture 与旧对象。

| 纸型 | note.page_format | 初始外框 | 默认墙（上 / 右 / 下 / 左） |
| --- | --- | --- | --- |
| A4（缺省） | a4_portrait | 904 × 1278 | 0 / 72 / 96 / 72 |
| Letter | letter_portrait | 904 × 1170 | 0 / 72 / 96 / 72 |
| Web 长页 | screen_note | 1120 × 720（高度地板） | 48 / 64 / 64 / 64 |

Project 延用 POST note + PUT page-frame-collection；Board 延用 ceremony-note 事务同时落 note 与 collection。两条入口均提交匹配的字段与 frame seed。旧请求省略选型仍按既有 `flow` 默认，不批量回填、不迁移存量。新预设建后无改型 UI，服务端还拒绝新预设与其他值之间的 PUT 改型；旧值之间的既有更新行为不扩裁。

### Web 长页生长机制

存储的 frame 是高度地板。每次渲染/重开，按归属该帧的 block layout、活动草稿、通用 placement 的世界坐标底边，加底墙，取最大值派生当前 frame.height；宽度与 frame ID 不变。排除 tray、workspace 和其他帧的内容，不设 A4 的最低阅读高度/760 宽过滤，也不为生长逐键写 collection。自然续写绕过纸页分流，继续落同一 frame。内容与墙仍按既有接口持久化，因此重开可以重建长页。

打印只派生切片，不新建持久页：既有 Web 缩放 `793.700787 / 1120 ≈ 0.7086614`，A4 物理页对应 1584 个内部高度单位。最终样本运行时一帧宽 1120、高 5859，打印为 4 页，offset 为 0 / 1584 / 3168 / 4752。历史 A4/Letter 和未选择新预设的旧 Web 仍使用旧打印分支。

### 冒烟与双常备条款

证据入口：[`README.md`](../../audits/2026-09-11-b1c-builder/README.md)、[`browser-summary.json`](../../audits/2026-09-11-b1c-builder/browser-summary.json)、[`fixture-census.md`](../../audits/2026-09-11-b1c-builder/fixture-census.md)。真实 Chrome + 真实 React 页面/人面 API，数据只在 `.codex-tmp/b1c-browser/run-XMLvw2/fixture.sqlite`；全新空夹具在种子前声明 coordinate v2，未运行存量迁移。

- A4/Letter 从 Project 创建，Web 从 Board 创建；另外从 Project 创建 Web 复核修理后的首次输入。实际请求与落库几何、三型默认墙均吻合。
- 最终 Web 保存 15,869 字符长段落与 76 字符续写块，超过初始高度仍 `1 / 1`，墙内宽 992；正文编辑器扣除既有 padding 后宽 972。左墙拖动样本从 64 落库为 94.85714285714286，外宽保持 1120。
- 隔离库关闭并重开，6 张夹具 note/canvas 深度相等；最终正文逐项相等。历史 `flow` A4 的 note+canvas 与建纸前 baseline 深度相等，保留 x=84、904×1278 与不对称墙 24/56/110/88。
- 实际 `window.print()` 的原生 `beforeprint` 已捕获产品打印 DOM，4 页切片与 992 宽片段正确；冻结屏幕展示可见首页、长段结束标记与末页续块。**观测边界**：浏览器原生打印对话框阻塞自动读取，使用 reload 退出；`afterprint` 未确认、取样时 print media 尚未切换。截图明确标为原生 beforeprint 产物的冻结展示，不冒充原生预览截图或 PDF。
- 保留真实失败记录：夹具重启遗留旧 Board 请求 404 × 1；首轮单块 29,057/29,057/29,101 字符超过既有 20,000 字符上限，400 × 3。后续使用限内正文完成。既有文本高度估算和续块坐标可能保留中间留白，打印保留当前版面；本单未另改旧文本排版或单块长度上限。
- 无新增挂载期 endpoint。按全夹具条款普查 client 源码、所有测试 mock、审计及脚本 fixture，核对 14 个挂载调用消费者；修改创建 payload 的相关 fixture，不用宽泛兜底吞新请求。详见 census。

### 验证数字

- **最终 client 全库：142 个测试文件，1,517 个测试通过，0 失败、0 跳过。** 日志 [`runtime-gate-final-width.log`](../../audits/2026-09-11-b1c-builder/runtime-gate-final-width.log)。前轮 141/1516 与更早失败修复日志保留作为过程证据，不作为最终数字。
- server 定向：**6/6 通过**（三型 Project/Board 创建、改型不变量、旧默认与 Board ceremony），见 `server-directed-tests.log`。
- 两端 `tsc --noEmit` 通过，见 `client-typecheck.log` / `server-typecheck.log`；两端 build 通过。
- 根 `npm run verify:v2-bn8-runtime` **exit 0**：运行时边界 **168** 项、模型契约 **60** 组、相关 shell/source/legacy/relation 静态门、既有 tool-face 一致性门、性能 seed、docs check、diff check 通过。该必跑脚本还执行现有 changed-file secret 静态扫描；没有新增或单独运行安全测试套件。
- `node docs/audits/2026-09-11-b1c-builder/verify-browser-state.mjs` 通过，核对三型存储、墙值、同库重开、旧纸零变、长文与打印切片。

没有发现需改裁定才能继续的冲突。未操作 commit / push / PR / merge；未改权限文件或覆盖开工前已有的无关未跟踪文件。
