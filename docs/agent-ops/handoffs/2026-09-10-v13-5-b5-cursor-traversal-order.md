> **状态 (Status)**: done(builder 施工回执;完整 runtime 总门/凭据扫描留 HQ)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: B2 调查 TF-02(证据行号在案);Henry 09-10 过夜清债令;B4(打字撤销)为前序同域单
> **单号**: 13.5 · B5 · 同 block 跨 TextUnit 光标穿行(TF-02)

# 13.5 B5 · 光标穿行

**使命**:同一文本块内,方向键连续穿行所有 TextUnit——多段/列表的键盘写作手感连续。**射程=同 block 内**(跨 block 归 B6)。

## 零 · 交互规则(HQ 已拍,按主流编辑器惯例;⛔复议,实现细节裁量申报)

1. 单元顺序=flow 文档序(渲染序);
2. **↓** 在 unit 末视觉行→下一 unit 首视觉行;**↑** 首视觉行→上一 unit 末视觉行;**保留横向目标列**(sticky column,按视觉列,穿行途中不漂移);
3. **→** 在 unit 末→下一 unit 首;**←** 在 unit 首→上一 unit 末;
4. 软换行内的上下移动=textarea 原生行为不动,只接管**跨界那一步**;
5. 折叠/隐藏 unit 跳过;不可编辑成分不停留;
6. **IME 组字中方向键⛔触发跨界**(composition guard 与 B4 同源);
7. 穿行=纯光标移动⛔入历史;但切 unit=B4 封组边界(B4 已立,验不破即可);
8. Home/End/PageUp/PageDown 单元内行为不动,⛔本单扩接管面。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟六条:①三段落块内 ↑↓ 连续穿行(修前断言现状:边界死住);②sticky column:长行→短行→长行,横向列保持;③←→ 在边界跨 unit;④软换行多视觉行 unit 内原生、跨界接管,不跳段;⑤IME 组字中按方向键不跨界不破组字;⑥B4 撤销回归(穿行不入栈/切 unit 封组)+Enter/Backspace/Tab 既有特殊键回归+全库。

## 二 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

2026-09-10 · Codex builder。B5 同 block 穿行已施工并验证；本回执不代替 HQ 放行。无 stage / commit / push。

### 实现裁量申报

- 只处理无修饰键、折叠光标的四个方向键；父级 `onKeyDown` / `defaultPrevented` 优先级保留。选区、修饰方向键、Home/End/PageUp/PageDown 保留原生行为。
- 候选直接复用 `visibleUnitEntries` 的渲染序及本实例 `unitRefs`，不搜索其它 block；跳过折叠后代、隐藏/无布局、inert、disabled、readOnly 的目标。
- 新 `textareaNavigation.ts` 用同宽、同排版的完整文本 DOM mirror + Range 测实际视觉行及横向像素；目标只选 grapheme 边界，不用字符数估算列。mirror 用后移除，无持久化。
- 软换行同一 UTF-16 offset 可有上一行末/下一行首两个光标位置：只观察原生按键和点击结果，记录视觉行，修正 `End → ↓` 提前跳段；Home/End 本身不 preventDefault、不代执行。
- 跨入短首/末行时，如目标 unit 的其它行更宽，在**跨界这一步**用 `Selection.modify(..., 'line')` 从可保持原目标列的位置原生移到首/末行，保存浏览器自身目标列；随后单元内方向键完全原生。必要时原生 `lineboundary` 保留首行末端位置。缺少原生 selection motion 能力时退到边界位置，避免停在中间的定位位置；非 Chromium 浏览器未实走。
- 方向键穿行不调用 `emitFlowChange`；真实 blur/focus 复用 B4 封组与保存。目标 caret 设置后同步 `selectionRef`。IME 三重守卫仍为原 `compositionRef` / `nativeEvent.isComposing` / `keyCode === 229`。B4 历史生产模块未改。

### numstat

未暂存 diff；新文件以 `git diff --no-index --numstat -- NUL <path>` 补计。

| + | - | 文件 |
|---:|---:|---|
| 192 | 3 | `client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.input.test.tsx` |
| 98 | 1 | `client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx` |
| 119 | 10 | `client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.test.tsx` |
| 148 | 0 | `client/src/pages/Notes/canvasEngine/textareaNavigation.ts`（新增） |
| 54 | 1 | 本工单（状态 + Result） |

代码及测试小计 **+557 / -14**，含回执合计 **+611 / -15**。既有未跟踪的审计/研究文件及 `.claude/settings.local.json` 未改、未暂存。

### 六条冒烟

1. **① PASS，先红后绿。** 修前先断言实际渲染 **3 个 textarea**；第一段 offset 0 按 ↓，预期 `tu-2`、实为 `tu-1`，证明边界死住。修前完整 client：**1 failed + 863 passed / 98 文件**，唯一失败为新增冒烟①。修后上下贯穿三段、反向返回、不改变正文；Chrome 合成页面亦实走。红日志：`.codex-tmp/b5-red-client.log`。
2. **② PASS。** Chrome 长→短→长 `tu-1:9 → tu-2:2 → tu-3:9`，反向回 `tu-1:9`。比例字体 `WWWWWWiiiiiiii` offset 6 穿过 `x` 后到 `iiiiiiiiWWWWWW` offset 12，再返回 offset 6，证明保留视觉像素而非字符下标。补验短首行夹长行：原目标列 21 跨入 `tiny ` 首行末 offset 5，下一次**原生** ↓ 到第二行 offset 26（仍列 21）；向上跨入短末行后原生 ↑ 也恢复列 21。点击/输入/非纵向键重新起算目标列。
3. **③ PASS。** 单元末 → 下一单元 offset 0；单元首 ← 上一单元末。Chrome 折叠场景 `tu-2:6 → tu-4:0 → tu-2:6`，隐藏的 `tu-3` 不停留；↑↓ 同样跳过。首/末 unit 外侧无本单跨 block 行为。合成测试另验隐藏祖先及父级已处理的方向键。
4. **④ PASS。** Chrome 多视觉行 unit 内依次向下 offset `9 → 37 → … → 90 → 116` 仍在 `tu-2`，再 ↓ 才到 `tu-3:9`。专验倒数第二行 End 后 `tu-2:107 → ↓ tu-2:131 → ↓ tu-3:15`，不提前跳段；首行末落点与原生 End 相同。显式换行+空末行 `tu-2:5 → 16 → 23 → tu-3:5`，空视觉行不漏。jsdom 几何桩仅验证事件路由，视觉排版结论来自真实 Chrome 合成页。
5. **⑤ PASS（合成 composition 事件）。** compositionStart 后四个方向键均不跨界、不发正文变更、不额外封组；单独 native isComposing / keyCode 229 也拦截。原 B4 组字更新、blur 延迟、compositionend 前后最终 input 两种顺序、composition 中 Enter/Tab/paste 测试整库保留并通过。未声称执行了操作系统中文候选窗体验验收。
6. **⑥ PASS。** 新增真实 `TextBlockProjection + useTextFlowHistory + usePlacementHistory` 内存集成：双/三 unit 纯穿行没有 undo/redo；A 输入→跨 B→B 输入恰好两组，逐次 undo/redo 恢复正文、unit 身份及 caret；A→B→A 同 caret 再输入仍拆组。Enter 选区替换/拆段、Backspace 合并、Tab/Shift+Tab 缩进及原 B4 历史/IME/范围恢复测试通过。最终 **client 98 文件 / 878 测试全部通过**（`npm run test:unit`，从未加过滤参数）。

### 验证记录与证据边界

- 最终 client 整库：`.codex-tmp/b5-final-client.log`，exit 0，878/878。
- 最终 `npm run build:client`：`.codex-tmp/b5-final-build-client.log`，exit 0，含 `tsc -b` + Vite。`npm run build`：`.codex-tmp/b5-build-server.log`，exit 0，含 server tsc 与 manifest 检查/复制。既有大 chunk 与 schema 转换 warning 保留；`git diff --check` 通过，暂存 diff 为空。
- 中间一轮 **874/875**：既有 `BoardPage.selection.test.tsx:108` 首次框选工具栏未出现。未改该测试、未过滤；保留 `.codex-tmp/b5-client-intermediate-failure.log`。随后整库 875/875、最终 878/878 均绿；未证明该单次失败成因，不将其冒充修复或直接断言为偶发。
- 测试数据全部合成/内存；Chrome 页面为 `.codex-tmp/b5-browser/` 的独立 Vite fixture（`127.0.0.1:5186`，无后端连接），直接挂载生产组件。浏览器操作来自 CUA 实际方向键，临时 fixture 不计生产改动。所有 Vite/Vitest 命令以 `COINCIDES_VALIDATION_ENV_DIR` 指向本次空目录，未读 `.env`。
- CodeGraph CLI 不可用且无对应 MCP，先尝试后限定路径回退读取；browser-harness 连接受本地 DevToolsActivePort 权限阻挡，改用已提供的 CUA 浏览器通道，未改权限。

### 未做

- 未 stage / commit / push；未读 `.env` 或 key 值，未运行凭据扫描，未访问用户库、未启动应用后端。未设计或额外执行安全类测试；既有 client 套件完整执行，无删减/过滤。
- 未扩到 B6 跨 block、跨 unit 选区、修饰方向键；未做 OS IME 候选窗、Firefox/Safari、真实用户笔记体感验收。权威 current-state 及最终放行留 HQ。

### 停线

- **本单功能检查无剩余阻断。完整 `npm run verify:v2-bn8-runtime` 未执行、未宣称通过**：其原命令尾部包含 `check:changed-file-secrets`，与本单「凭据扫描留 HQ」冲突；没有删除该步骤或过滤总门来制造全绿。完整总门/扫描与抽检放行留 HQ。
