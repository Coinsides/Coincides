> **状态 (Status)**: done(2026-09-12 状态头补翻:交付与 Result 早已在案,头未跟上;派发期原头:ready)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: B2 调查 TF-03(L 档,证据在案);B4(历史)/B5(穿行)为前序地基;Henry 过夜清债令
> **单号**: 13.5 · B6 · 跨 TextUnit 选择 + 跨 block 光标导航(TF-03)

# 13.5 B6 · 跨界选择与导航

**使命**:①同 block 内**跨 TextUnit 选择**(Shift 选区跨过 textarea 边界);②**跨 block 光标导航**(块尾穿行进下一文本块);③跨 block **选择**=尽力项,工程爆炸即停线拆单⛔硬吞。

## 零 · 规则(HQ 已拍;实现细节裁量申报)

1. **选区模型**:flow 内 (unit,offset)→(unit,offset) 起止对;渲染=自绘高亮层(跨 textarea 无原生选区,几何可复用 B5 的 mirror 测量;方案裁量申报);
2. **跨 unit 选择手势**:Shift+方向键越界延伸;Shift+Click 跨 unit 设定终点;点击/Esc/输入非 Shift 方向=清选区或按语义收敛;
3. **跨选区操作**:Ctrl/Cmd+C=拼接文本(unit 边界以换行连接);Delete/Backspace=删除选区并按既有 merge 语义并接;打字=替换(删+插);Ctrl/Cmd+X=复制+删除——**全部入 B4 历史为独立组,范围快照沿 B4 规则,undo 逐字段恢复**(含 unit 身份);
4. **跨 block 导航**:末 unit 末行 ↓/→ 进入下一**文本**块首 unit(B5 交互规则延伸,sticky column 沿用);顺序=Layout 阅读序(visibleBlocks 渲染序);**item_ref/投影/媒体/只读块跳过⛔停留⛔选入**;
5. **跨 block 选择**:若与现物(每块独立编辑器/历史作用域)冲突过大→交付①②④,③举证停线拆单;
6. **IME**:组字中⛔跨界选择与跨界操作(三重守卫沿用);
7. ⛔改 B4 历史语义⛔改 B5 单元内行为⛔动只读/投影块的可编辑性。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟六条:①Shift+↓/→ 跨 unit 选区正确延伸,高亮几何与文本一致,Ctrl+C 拼接正确(修前断言现状:选区停在边界);②跨选区打字=替换,undo 恢复原文与 unit 身份;③Delete 跨 unit 删除并接,undo/redo 逐字段;④跨 block 导航:块尾 ↓ 进下一文本块,item_ref/投影块跳过;⑤IME 组字中 Shift 方向不动选区;⑥B4 历史/B5 穿行/Enter-Backspace-Tab 全回归+全库整跑。

## 二 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 裁量申报 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

> **日期**: 2026-09-10 · **执行者**: Codex builder
> **交付状态**: 同 block 跨 TextUnit 选择、复制/剪切/删除/替换及跨 block 光标导航已落工作树；六冒烟通过。**跨 block 选择按 §零 5 举证停线拆单**，docs INDEX 收口与复核放行留 HQ；本单保留 ready，不代签验收。
> **分支 / 收尾 HEAD**: `fable/v2-bn12-exoskeleton` / `0253fe8286bdcb995d30ebf604dc2279d652a7e5`。未 stage / commit / push；暂存 diff 为空。

### 1. 落地与 numstat

选区以 flow 内 anchor/focus 两个 `(unitId, offset)` 暂存，跨 textarea 时绘制独立高亮；只在单元边界接管 Shift 箭头，已有跨区可继续在目标单元的视觉行中延伸。Shift+Click 以完整文本 mirror 命中终点，保留软换行行亲和。跨选区写入走现有 `onTextFlowChange` → B4 `applyEdit`，每次修改是一个 structural entry；未改 B4 历史生产模块、保存队列或范围恢复算法。

跨 block 导航由 `NoteWritingSurfaceLayer` 按实际 `visibleBlocks` 顺序协调各编辑器，目标编辑器负责自身首/末可见 TextUnit 与 B5 sticky column。没有排序副本、没有改只读/投影编辑权限。

下表 `N/` = `client/src/pages/Notes/canvasEngine/`。已跟踪文件取未暂存 `git diff --numstat`；新文件取 `git diff --no-index --numstat -- NUL <path>`，未通过 stage 凑统计。

| 文件 | + | - |
|---|---:|---:|
| `N/blocks/TextBlockProjection.tsx` | 254 | 3 |
| `N/blocks/TextBlockProjection.input.test.tsx` | 276 | 4 |
| `N/blocks/TextFlowSelectionLayer.tsx`（新） | 50 | 0 |
| `N/blocks/TextFlowSelectionLayer.module.css`（新） | 13 | 0 |
| `N/hooks/useTextFlowHistory.test.tsx` | 116 | 4 |
| `N/layers/BlockEditorLayer.tsx` | 12 | 0 |
| `N/layers/NoteWritingSurfaceLayer.tsx` | 13 | 0 |
| `N/textareaNavigation.ts` | 127 | 3 |
| `N/textFlowSelection.ts`（新） | 86 | 0 |
| `N/textFlowSelection.test.ts`（新） | 154 | 0 |
| `N/textFlowBlockNavigation.ts`（新） | 49 | 0 |
| `N/textFlowBlockNavigation.test.tsx`（新） | 207 | 0 |

代码与测试合计 **12 文件，+1457/-14**。本工单仅追加 Result，**+64/-0**；含回执共 **13 文件，+1521/-14**。临时合成浏览器与日志在 `.codex-tmp/b6-browser/`、`.codex-tmp/b6-validation/`，不计生产改动。保留开工已有未跟踪审计/研究稿及 `.claude/settings.local.json`，未读权限配置正文、未改上述文件。

### 2. 六项冒烟

| # | 结果 | 证据与边界 |
|---|---|---|
| ① | **修前红 → PASS** | 生产修改前新增真实组件断言：3 个 textarea，`tu-1:2` 按 Shift+↓ 期望 `tu-2`、实际仍 `tu-1`。整库 **1 failed / 878 passed**（07:36:47，14.56s），唯一红为本断言。修后 Shift+↓/→/↑/← 延伸、反向收回同单元、Shift+Click 正反端点和复制均通过。Chrome 合成页实际键盘从 `first paragraph:2` 到 `second text:2`，复制 `rst paragraph\nse`；软换行选至 offset 58，复制内容与逐行高亮一致；1.5 倍 page scale 三单元高亮贴合；显式换行与空 unit 的分隔符保留。 |
| ② | **PASS** | 真实 `TextBlockProjection + useTextFlowHistory + usePlacementHistory` 内存集成，以 native cancelable beforeinput 输入 X 替换三 unit 范围，保留首 unit、删除中/尾 unit。undo/redo 对原 flow/unit 角色、缩进、身份、嵌套 metadata、inline 字段逐字段断言。紧接后续打字另成一组，先撤打字再撤替换。Chrome 软换行范围键入 x 实测只产生 **1 次编辑**、焦点回首 unit offset 3。非 cancelable beforeinput 另验仅由后续 input fallback 替换一次。 |
| ③ | **PASS** | Delete、Backspace、Ctrl/Cmd+X 剪贴板事件分别走三 unit 合并，undo/redo 全量 flow 字段与 unit 身份恢复；后续输入与删除恰为两个 entry，保存序列逐次核对。剪切复制按 unit 边界换行。Chrome Shift+Click 选三 unit 后 Delete，仅余首 unit 的 `fi`，caret=2、编辑次数=1。原 B4 annotation/board 范围恢复及失败留栈套件保留通过；本次未增加范围重算或反向 rebase。 |
| ④ | **PASS** | 实际 BlockEditorLayer + 生产 coordinator 测试按渲染数组顺序穿行，故意令 order_index/ID 与渲染序冲突；跳过 item_ref、source_projection、image、只读及不可用目标。Chrome 独立合成场景实走首块 → 短块 → 末块，长块 offset 9 经短块 offset 2 后恢复末块 offset 9，再双 ↑ 返回首块 offset 9，内容编辑次数为 0。投影/只读 textarea 实际显示只读；item/media 是明确标记的 inert 占位，无查询请求。 |
| ⑤ | **PASS（合成 IME）** | compositionStart 清跨区后组字，四个 Shift 箭头均不跨界；分别注入 native isComposing 与 keyCode 229，已有跨区的复制范围不变、无跨界修改。composition 中 paste/cut 不发修改；原 B4 composition 输入、封组、Enter/Tab/paste、最终 input 两种次序回归保留。未声称使用 OS 候选窗。 |
| ⑥ | **PASS** | 最终 `npm run test:unit` **100 文件 / 924 测试全部通过**（07:52:27，15.16s，exit 0），从未加测试过滤参数。原 B4/B5 历史、穿行、Enter 选区拆分、Backspace merge、Tab/Shift+Tab、范围恢复、失败恢复、Note 隔离与板历史全回归。B5 原测试中“Shift 边界必须原生”一项已由本单获批能力取代，改为 Ctrl/Meta/Alt 保持原生，并新增单元内 Shift 原生及跨区用例；没有删减套件。 |

修前日志：`.codex-tmp/b6-validation/red-client.log`。中间两轮分别暴露旧 B5 Shift 边界预期和新测试错误地要求“导航不保存”；后者已纠正为 B5 合法 blur 保存原 flow，另断言导航无 undo/redo entry，再检查编辑保存序列。第三轮 900/900，追加 24 个事件边界后最终日志 `client-final.log` 为 924/924。不把夹具错误当功能红证据。

### 3. 裁量申报

1. **高亮**：复用 B5 单 text-node mirror，DOM Range rectangles 渲染为 token 色背景，包含换行/空 unit 的小分隔符标记；随 resize、scroll、字体加载重测，`aria-hidden` 且穿透指针。未按字符数假算几何，未新增内容真相或持久选区。
2. **选区收敛**：回到同 unit 时交还原生 selection 并保留方向；普通箭头按方向收敛到起/终点，Esc 收敛到 focus，普通点击/外部 blur 清除。Ctrl/Meta/Alt+Shift 箭头先清逻辑跨区再交还原生，避免旧高亮与原生选区同时存活。Shift+Click 记录 y affinity，避免软换行误跳行。
3. **历史**：复制是只读，不造空历史。每次删/剪切/替换作为一个独立 structural entry；沿 B4 完整 flow 与触及范围快照、80 条会话历史及保存异常策略。B4 原生 selection 只表示单 unit，undo 恢复到本次 anchor caret；**未承诺 undo 重新显示跨 textarea 高亮**。同内容 flow 的引用变化不清选区，实际 unit 身份/正文变更或只读切换才清；已测真实层 focus 触发父重渲染仍能跨区复制。
4. **合并**：按完整 `flow.units` 区间取文，折叠后代虽然不作为导航终点，处于两端之间仍属于选中文本。保留首 unit 身份/角色/metadata，与既有 merge 一致；inline 保持既有字段策略，不夹带 TF-07 生命周期修改。跨区粘贴按纯文本替换（多行保留 LF）；跨区 Enter 替换为 LF，不扩成另一套结构化粘贴规则；单 unit 既有 Enter/paste 不变。
5. **块资格**：仅现有 TextBlockProjection 文本种类参与（text/paragraph/heading/definition/theorem/proof/example/exercise/answer/sidenote），双向导航沿 B5 扩展。独立 CodeBlockProjection、公式字段编辑器没有首/末 TextUnit 协议，跳过，未改其编辑行为或假装纳入本单导航。

### 4. 其他验证

- 最终 client `npm run build:client`（tsc -b + Vite）exit 0，日志 `build-client-final.log`；server `npm run build` exit 0，日志 `build-server.log`。保留既有 chunk 大小及 schema 转换 warning。所有 Vite/Vitest 以 `COINCIDES_VALIDATION_ENV_DIR` 指本次仓内空目录，未读取 .env；未启动业务服务。
- 非安全 runtime 子门完整逐项跑：canvas boundary（159 checks）、Gallery/Rail/SingleEditor shell、source experience（静态+模型）、legacy shutdown、relation freshness、canvas model（60 groups）、performance（5 scenarios）、server/shared runtime import（213 files/0 violations）均 exit 0。日志在 `b6-validation/gates/`。`git diff --check` PASS，暂存 diff 为空。
- CodeGraph CLI/MCP 不可用且 rg 不可用，已先尝试，再回退限定目录读取。browser-harness 因本地 DevToolsActivePort 权限失败，改用已提供 CUA Chrome 通道，未更改权限。几何证据来自真实浏览器合成页，jsdom mock 仅用于事件路由。

### 5. 未做与停线

1. **跨 block 选择停线拆单（§零 5）**：现物 `TextBlockProjection` 的 unitRefs/选区归每块实例；`textFlowEditSession.ts:4` 的 selection 仅 `(unitId,start,end)`，transaction 在 `:36` 仅一个 blockId；`useTextFlowHistory.ts:242` 的 `applyEdit(block, flow, ...)`、范围捕获与保存/重试也以单 block 作为事务边界。跨 block 剪切/替换若硬拼数次 applyEdit，会变成多条历史及可部分保存，不满足一次跨区操作的可逆性；只画跨块高亮又不支持操作同样是假交付。因此止于跨块光标，不将多个 block 放进当前 flow。**后续拆单建议**：HQ 先裁定文档级 selection 的 block/unit 端点、多块单 entry 的 before/after 载荷、范围归属、保存失败/重试与 Note 切换边界，再独立建与复核；本单未自行改 B4 历史语义或 TD-6 原子性。
2. **验证门停线**：`docs:check` exit 1，`docs/agent-ops/INDEX.md` 过期，后续 inventory/glossary 未因该 && 链执行；沿前序 B4 HQ 裁定由 HQ 重生成，未改索引/current-state。**完整 `verify:v2-bn8-runtime` 未执行、未宣称 PASS**：含本单明禁的 `check:changed-file-secrets`；未过滤/修改聚合脚本制造全绿。凭据扫描与最终总门留 HQ。
3. **未做**：stage/commit/push/PR；.env/key 值读取；用户库或真实笔记/API；安全类专项测试与凭据扫描；OS IME、Firefox/Safari、人工主观验收；跨 block 选择；跨会话历史、TF-07 inline 生命周期、TD-6 服务端原子性。B4/B5 原工单未修改。
