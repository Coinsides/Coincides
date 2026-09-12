> **From**: fable
> **To**: codex
> **Status**: done(2026-09-12 状态头补翻:交付与 Result 早已在案,头未跟上;派发期原头:ready;两层制;13.3 单 4=走查③打磨,client 小单)
> **日期 (Date)**: 2026-09-09
> **性质**: 施工单(Henry 走查③ findings 当场修)

# 13.3 · 单 4 · 走查③打磨(板名独立/入口淡化/两件收起)

## 〇 · 上游

单 2/单 3 Result(板 UI 现物);claude-log 2026-09-09 §1(findings 与裁定)。

## 一 · 口径(冻结)

1. **板名独立于魂句**:开板对话只填**板名**(必填,短);新立魂时魂 title=板名(排气式,⛔ 逼写目的宣言);"挂靠已有魂"折叠为高级展开项(默认收起);board.title 与魂解耦展示(列表/板头显示板名);
2. **⛔ purpose library 页面**:不建独立魂列表页;挂靠选择器仅存在于开板高级项内;
3. **进板自动收起左 navigator**:进入 /boards/:boardId 时侧栏自动收起(用户手动展开则本板会话内尊重其选择;离开板恢复原状);
4. **笔记选择栏可收起**:添加笔记的选择栏加收起/关闭按钮;
5. ⛔ 面:server 契约/魂数据语义/纸行为/工具族扩展(橡皮擦撤回归 13.4)。

## 二 · 验证(段纪律)

client typecheck/build;定向单测(创建对话板名流/navigator 收起行为);一条冒烟:开板(仅板名)→魂同名出生→navigator 自动收起→选笔记栏开合。

## 三 · 回执与边界

apply_patch 追加 ## Result;⛔ commit;⛔ 读 .env;⛔ 打印 key;⛔ 用户库;不动 3001/5173。现物冲突⇒停线举证。

## Result

> **From**: codex（builder）
> **日期**: 2026-09-09
> **交付状态**: 本单 client 施工与 §二 定向验证完成；未提交工作树交 HQ 复核、翻牌。保留 header，不代替 HQ 放行或 Henry 主观验收。
> **分支 / HEAD**: `fable/v2-bn12-exoskeleton` / `63c4745`（交付时读取）。
> **统计**: client 代码与测试 7 文件，**+348 / -29**；另仅向本工单追加本 Result。

### 1. 五条口径核销

| 口径 | 交付 |
|---|---|
| 板名独立于魂句 | 开板入口改为唯一必填 `Board name`，短名称输入上限80字符（仅 client 创建入口，不改 server 上限或既有名称）；空白名不提交，提交前 trim。新立魂沿用现有 `{title, purpose:{title}}`，两处同为板名；选择已有魂或切回新魂均不覆盖已填板名。 |
| 高级挂靠 / 不建魂库页面 | 现有原生 details 保持默认收起，标注 `Advanced: use an existing purpose`；选择器只在开板高级项内。未新增 purpose library 页面或路由。板列表去掉魂句副标题，板头继续使用 `board.title`，不反写魂标题。 |
| 进板收 navigator | AppLayout 按 boardId 的进入/退出保存并恢复原 sidebarOpen。进入直接链接或另一块板均自动收起；本板内手动展开/收起在重渲染、query/hash、尾斜杠变化后保留。离板/卸载恢复进入前状态（原先展开/收起均覆盖），未改 uiStore 契约。按钮补展开/收起可访问名与 aria-expanded。 |
| 笔记选择栏可收起 | 选择栏标题旁增加关闭按钮，仍可由 `Add notes` 重开；补 aria-controls/expanded。栏内 Escape 同样关闭，关闭后焦点回到 Add notes；重开保留搜索条件，已上板成员不变。 |
| 禁动面 | server/shared 零 diff；魂身份、状态、出生/挂靠 HTTP 语义不变。未改纸行为、纸三档、几何、工具族、橡皮擦或撤回。 |

已按 §〇 读取单2/单3 Result 与 claude-log 2026-09-09 §1。现物已有独立 board.title 字段、挂靠 details 与 sidebar setter；本单无需新增端点或改变冻结裁定，未遇到须停线的现物冲突。

### 2. 验证实跑

client 测试、构建使用 `COINCIDES_VALIDATION_ENV_DIR` 指向新建空目录 `client/.codex-tmp/v13-s4-empty-env`，避免 Vite/Vitest 自动读取 .env。navigator 子任务独跑使用 `client/.codex-tmp/v13-s4-navigator-empty-env`。测试均为 jsdom/合成内存 fixture；没有真实 HTTP、数据库或应用服务。

| 验证 | 结果 |
|---|---|
| client `node node_modules/typescript/bin/tsc --noEmit` | PASS |
| client `npm.cmd run build` | PASS，tsc -b + Vite 生产构建完成；既有 taskStore 动静态混用、大 chunk 提示保留 |
| BoardList.test.tsx | **3/3 PASS**：短必填/空白拒绝/trim/新魂同名 payload；挂靠选择不覆盖板名；列表显示板名且选择器留在默认收起的高级项 |
| AppLayout.test.tsx | **6/6 PASS**：进板收起、手动选择、重渲染/query/hash/尾斜杠、连续切板、原先收起/展开、重入/卸载、StrictMode effect 重放 |
| BoardPage.smoke.test.tsx | **6/6 PASS**：本单新增完整打磨链1项 + 单2原冒烟5项（含占魂409、几何/持久化/进纸等） |
| 主线程合并定向执行 | 上述3文件 **15/15 PASS**；navigator 子任务另一次6/6已通过，不重复计入总数 |
| 独立只读复核 | 限定7个改动文件，未发现实质缺陷或五条口径缺口；不代替 HQ 放行 |
| 工作树检查 | `git diff --check` PASS；server/shared 无改动，暂存区空；开工已有个人/审计/研究未跟踪文件保留 |

**本单实跑链**：真实 AppLayout + uiStore + BoardList/BoardPage + board repository/useBoard，HTTP 与无关全局初始化 mock。板列表 navigator 初始展开 → 只输入 `  Exam revision  ` → POST `{title:'Exam revision',purpose:{title:'Exam revision'}}` → fixture 新魂 title=`Exam revision` 且 soul_id 正确挂板 → navigator 自动收起 → 手动展开 → 打开笔记选择栏、搜索并将一篇笔记上板 → 栏内关闭、重开保留搜索/成员 → Escape 关闭、焦点回 Add notes → 返回列表恢复原 navigator。板内操作期间手动展开持续有效，非预期写入数组为空。

这条链证明生产 client 装配与请求/响应消费；**魂出生由 HTTP fixture 模拟，不宣称本单实跑真实 server 出生事务**。未进行完整浏览器渲染或 Henry 主观走查。

单2原纸回归仍通过：板 zoom=1.2、三笔记/两连线/一笔迹后回纸，纸幅904×1278、内容宽760、块 `(0,40,760,88)`、字号16.7/行高24.5、三档完整采样均与板操作前相等。

复现（client 目录；先将上述环境变量设为新建空目录的绝对路径）：

```text
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run src/pages/Boards/BoardList.test.tsx src/components/Layout/AppLayout.test.tsx src/pages/Boards/BoardPage.smoke.test.tsx
npm.cmd run build
```

### 3. 边界与未做

- **未运行整套 `npm run verify:v2-bn8-runtime`**：按本单 §二 与 active 段 plan `handoffs/plans/v13-3-board-mvp-plan.md` 的定向、禁马拉松/安全类测试纪律执行，沿用单2/单3范围。整套含广泛测试、server build、changed-file-secrets 扫描，扫描会读取工作树 modified/staged/untracked 文件，不适用于本单限定范围。未把整套门记作 PASS 或豁免。
- 未读 .env、未输出 key、未接触用户库；未启动/访问/调整3001或5173。未暂存、commit、push、PR；未改 current-state、历史结果、操作指令或权限配置。
- CodeGraph 先尝试，CLI/MCP 均不可用；rg 亦不在 PATH，随后限定所需源码与指名文档使用 PowerShell 检索。界面沿用现有主题 token、原生 details 与组件样式，无新增依赖。

### 4. Numstat

已跟踪文件取普通 `git diff --numstat -- client`；两个未暂存新测试按全文新增行计。不含本工单追加 Result。

| 文件（相对仓根） | + | - |
|---|---:|---:|
| client/src/components/Layout/AppLayout.tsx | 18 | 2 |
| client/src/components/Layout/AppLayout.test.tsx | 162 | 0 |
| client/src/pages/Boards/BoardList.tsx | 14 | 17 |
| client/src/pages/Boards/BoardList.test.tsx | 71 | 0 |
| client/src/pages/Boards/BoardPage.tsx | 18 | 4 |
| client/src/pages/Boards/BoardPage.smoke.test.tsx | 63 | 6 |
| client/src/pages/Boards/Boards.module.css | 2 | 0 |
