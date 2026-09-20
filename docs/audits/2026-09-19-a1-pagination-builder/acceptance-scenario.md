> **状态 (Status)**: active（builder 验收剧本与机器证据；非 HQ 放行）
> **层 (Layer)**: audit / 蒸馏证据
> **日期 (Updated)**: 2026-09-19
> **上游**: `handoffs/2026-09-19-v14-a1-pagination-order.md` 及补遗一；`design/note-page-design.md`；`current-state/page-frame-and-layout-contract.md`

# A1 长中文分页验收剧本

## 夹具与现场

HQ 原文为 `.codex-tmp/a1-pagination/ch1-fixture.txt`，非空行 31 行、完整 UTF-16 长度 2686，标题为「立国:陈桥兵变与祖宗之法」。SHA-256 为 `5F0D1942E61D65952FFE83B2D3E419A3F207023E587275FAD7E54242ED1479D7`，原文件未改。浏览器源码为同目录 `browser-fixture.tsx`，最终实测使用静态入口 `fixture-bundle.html`；浏览器夹具把原文解析为逻辑 TextUnit，并附加 `index % 4` 缩进，另加一段长于单页的中文逻辑 unit，以覆盖同一 unit 跨页的片缝。补充段与 HQ 正文在夹具中分为两个逻辑块，另设结尾块供跨块选区。

浏览器夹具直接使用产品 `BlockEditorLayer`、`resolveDocumentPageFlowPlan`、DOM 测量源、`DocumentTextFlowSelectionContext`、`useTextFlowHistory` 和 `usePlacementHistory`。保存端是内存回执，不作为服务端持久化/刷新恢复证据；服务端既有全量套件另账。打印/Overview 开关使用产品 `NoteReadOnlyPageContent` 与同一 plan 的 fragment 投影。

从仓库根目录分别构建、启动本地静态服务：

```text
node .codex-tmp/a1-pagination/build-fixture.cjs
node .codex-tmp/a1-pagination/serve-fixture.cjs
```

打开 `http://127.0.0.1:5177/fixture-bundle.html`。构建使用现有 client esbuild，不新增依赖；服务仅监听 `127.0.0.1`。初期 Vite 入口及运行日志保留，最终旅程以这里的静态 bundle 为准。重新验收代码变更须先重建 bundle，避免旧产物误报。

## 可复现步骤与判据

| 步骤 | 操作 | 判据 |
|---|---|---|
| 1 灌文 | 打开夹具，保持 A4、16 px；查看页数和各页文本 | 至少 3 页；长 unit 保持一个 blockId/unitId，但有多片 textarea；片段按完整逻辑 UTF-16 范围连续覆盖，没有字/行中切开，没有遗漏/重复 |
| 2 水平片缝 | 在长 unit 第一片末尾按右，再在下一片开头按左 | 光标在两页之间连续穿行；逻辑 unit 身份不变；没有 TextFlow 写入 |
| 3 垂直片缝 | 在片尾行中部按下，再按上 | 光标保持测量列并跨页；异形页按目标版心宽重新换行 |
| 4 同块选区 | 从长 unit 中间按 Shift+下跨片，复制，再删除 | 剪贴板只有所选逻辑字串；删除只改范围，一次编辑写完整逻辑 flow；没有按片重复复制 |
| 5 跨块选区 | 继续 Shift+下到下一逻辑块，复制，再删除 | 原块中段到下一块中段正确；块间分隔保留现役 B9 语义；中间分片不形成额外内容块 |
| 6 撤销重做 | 执行一次 Undo / Redo | 生产 history 恢复完整 flow 与选区；页数/片数重新收敛；unit 全局光标 offset 减片起点后落在正确 textarea |
| 7 输入 | 在 continuation 中间打字、退格、Enter、粘贴；输入法连续组词 | 打字只拼接该片范围；片首退格删上页前字；Enter 在 unit 全局位置拆分；普通单行粘贴不额外拆 unit；IME 期间不换挂载节点，结束后重排，尾随重复 input 不二次插字 |
| 8 重排 | 依次点调墙、字号、Letter、异形第二页，最后回 A4 | 自动重算收敛；逻辑文本/存储坐标不因重排改变；异形页目标宽生效；无往返抖动 |
| 9 输出 | 在各形状切打印/Overview 投影并比对文本范围、页数 | 吃同一 flow plan；范围与编辑面一致；无单独分页真相 |
| 10 既有边界 | 结合现役定向/全库测试检查 manual、Web、墨水、墙、Layout、把手 | manual/覆盖件不入 reflow；Web 单帧生长；墨水页籍不随文字片移动；把手和标注章每逻辑项只一份可点入口 |

## 本子任务已经亲跑的机器证据

`editing-targeted-final.log` 原始日志位于 `.codex-tmp/a1-pagination/`。命令在 `client/` 执行：

```text
npm.cmd run test:unit -- --run src/pages/Notes/canvasEngine/paginationEditingService.test.ts src/pages/Notes/canvasEngine/blocks/PaginatedTextBlockProjection.test.tsx src/pages/Notes/canvasEngine/blocks/TextBlockProjection.input.test.tsx src/pages/Notes/canvasEngine/blocks/TextBlockProjection.unitHandle.test.tsx src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.test.tsx
```

2026-09-19 19:53（本机 America/Toronto）：**5 文件、129/129 测试通过**。包括新增 service 3 项、新投影 12 项、既有输入 67 项、把手 27 项、生产 history 20 项。

新增投影测试覆盖 continuation 输入的 unit 全局历史 offset、左右/上下跨片、Shift 选区复制删除、片首退格、Enter、输入法固定挂载及尾随 input、普通粘贴、单份把手/标注章、通过现役 DocumentSelection 注册的一次跨块编辑，以及把手拖到后续页仍判为逻辑重排（不误触抽出）。新增真实 history 集成直接连接 `useTextFlowHistory` + `usePlacementHistory`：跨片删除只一条 history；Undo/Redo 恢复完整 flow；continuation 打字后的 Undo 将全局 offset 5 恢复到第二片 local offset 1。

这些 jsdom 测试对字体换行镜像作了显式 mock，证明事件路由和逻辑偏移，不冒充真实浏览器字体/纸面几何验证。真实测量数字见 `typography-measurement-evidence.md`；浏览器旅程执行结果由主线程实测后另行落证。

### 浏览器复核后的修正与复测

- **history 光标仲裁**：真实浏览器发现 Undo 恢复完整文本后，下一次父层渲染可能把光标拉回旧位置。生产 history 集成测试增加「Undo 后无关父层重渲染」，先真实失败（期望 continuation local 1，实际 2），再修复。投影现在仅在实际片区几何改变或显式编辑焦点请求时恢复光标；单纯新数组身份不覆盖 history 已恢复的光标。原红/绿日志分别为 `source-caret-before-fix.log`（18 pass / 1 fail）、`source-caret-after-fix.log`（19/19）。
- **片尾硬换行**：plan 的 `slice.end` 继续覆盖逻辑 LF/CRLF，新增的 `displayEnd` 只是本次渲染端点；续片前终端换行不再生成一个 textarea 隐藏空行。拼接只替显示范围，换行留在原逻辑后缀；跨片复制仍包含换行，片缝两侧 Delete/Backspace 删除同一逻辑换行。新增 LF/CRLF、跨缝复制/删除、两侧删换行和边缘插字用例，`source-caret-hardbreak-after-fix.log` 为 4 文件 28/28。
- **来源条带预算**：分页首片来源区由任意换行改为可横向滚动的单行带；28px chip、22px View 按钮、18px 原生滚动条预留、10px 顶间距，共享预算为 56px。`pageFlowSourceReferenceService.ts` 同时供渲染和 flow adapter 使用。18 个来源的每个 View 仍留在 DOM 且逐一可触发，忙碌项仅自身禁用；legacy 非分页布局继续换行。新测试既断言固定总高，也逐个触发全部可用 View；空来源预算为零。
- **软换行处的垂直光标 affinity**：下一片首行末和第二行首可以具有同一个 UTF-16 offset。程序跨页落点现在保留片键、局部 offset 和视觉 lineY，下一次行镜像使用 preferredY；同时复用现役 `textareaBoundaryCaret` 的 `nativeLineEndFrom` / `nativeColumnSeed` 在浏览器中保持行末与竖直列。新测试让同一 offset 显式有两种行解释，验证 Down 到下一片首行末后，Up 立即回上一页，不先退到下一页第一行开头。

20:06 完整定向复测为 **7 文件、142/142**，见 `editing-source-hardbreak-regression.log`（新投影 16、偏移 service 5、来源条 2、flow adapter 5，加原输入/把手/history 114）。真实浏览器修正后结果由主线程另证；不得把本节 jsdom 成功当成浏览器几何实测。

20:09 软行 affinity 修正后的同组复测为 **7 文件、143/143**（新投影增至 17），原始日志 `editing-affinity-regression.log`；此前日志原样保留。

该最终组的可复跑命令（在 `client/` 执行）：

```text
npm.cmd run test:unit -- --run src/pages/Notes/canvasEngine/paginationEditingService.test.ts src/pages/Notes/canvasEngine/blocks/PaginatedTextBlockProjection.test.tsx src/pages/Notes/canvasEngine/layers/BlockSourceReferenceLayer.test.tsx src/pages/Notes/canvasEngine/notePageFlowService.test.ts src/pages/Notes/canvasEngine/blocks/TextBlockProjection.input.test.tsx src/pages/Notes/canvasEngine/blocks/TextBlockProjection.unitHandle.test.tsx src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.test.tsx
```

## 主线程真实 Chrome 旅程记录

本节按主线程实际 UI/键盘操作和只读 DOM 快照蒸馏；原始记录为 `.codex-tmp/a1-pagination/browser-journey-evidence.json`、`browser-final-boundaries.json`。前者明确保留最终字号/硬换行修正之前的旅程及失败；后者记录修正后边界与冻结树的重排旅程。

- A4/16px 初始为 **5 页、7 片**，三个逻辑块字符数为 `[3600,2672,9]`。第一片末端 1932 按右，到第二片 start 1932、local caret 0。
- continuation 输入「验收」后的 Undo 恢复原 3600 字；修正后的真实键盘复测恢复到第二片 start 1932、local caret 0。跨块选择复制 1774 字与逻辑范围逐字一致；删除后 4 页/5 片，Undo 恢复 5 页/7 片且全文完全一致。
- 片尾 Shift+Enter 后首片 canonical end 1933、displayEnd 1932，`clientHeight = scrollHeight = 1143`；下一片 start 1933、caret 0。按左回首片 caret 1932、scrollTop 0，再按右回续片 caret 0。原先隐藏额外一行的 `scrollHeight 1170` 留在初始日志。
- 软换行垂直往返：首片 caret 1932 → Down 到续片 start 1932、caret 46 → Up 回首片 start 0、caret 1932。修正前 Up 错落续片 caret 0，前后结果均保留。
- 最终重排：A4 为 5 页/7 片、Letter 为 5 页/6 片、异形第二页为 8 页/10 片，正文宽分别为 760、786、以及 760/480；异形加墙和 21px 字号变为 14 页/16 片。回 A4/16px 后，文字与所有原范围完全一致；打印/Overview 同 plan 的 65 个 textarea slice 逐项一致。

来源条每个 View 的可达性、IME 事件序列、拖把手及各边缘编辑操作由上述定向机器测试覆盖；本节没有将这些条目另行声称为真实操作系统 IME 或真实浏览器拖拽验收。

异形页横向坐标经主线程回查现役 placement 契约：`resolveScreenRect` 在 v2 阅读列使用 `layout.x + pageOffsetX`，纸张投影相应使用 `pageOffset - contentInset.left`；跨片编辑器的横向差因此取 frame-local layout 差。纵向使用 world rect 差；只读打印由各页的 world clip 吸收自身 inset。未将两种投影坐标混用为同一原点，也未为本轮新增存储坐标真相。

## 验证门的执行边界

补遗一明定：builder 申报 runtime 门的非 git/secrets 23 组件，git 检查及 secrets 扫描留 HQ 收口。`.codex-tmp/a1-pagination/run-verification.mjs` 从 `package.json` 拆出这 23 项，不改门源。最终各组件及 server 全量结论见 `verification-components.md`，本剧本不替其宣称完整门已绿。

开工 server 基线 `baseline-server-2026-09-19T23-31-32-020Z/01-npm_run_test_v2.log` 原样保留：774 tests、771 pass、3 fail；其中 Node IPC cloned-data 问题经现役 runner 孤立重试 59/59 恢复，另两项涉及环境 Python/MinerU 路径。后续如有环境修正及重跑，以最终组件报告为准，不用后续结果抹掉原红日志。
