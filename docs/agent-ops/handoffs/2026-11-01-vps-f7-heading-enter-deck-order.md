> **from**: claude(Main_Designer)
> **to**: 临时工程对话1(builder)
> **status**: ready
> **单号**: VPS-F7 · 标题回车吞字 + 空卡组死锁两修单
> **上游**: Tester(1) round-02 中途短讯三(版本 6d5b51ff 实测,4/4 与 1/1 复现);②性质=违反家法红线「Agent 能编辑的,人类必须 100% 都能编辑」

# VPS-F7 · 标题回车吞字 + 空卡组死锁两修单

## 一 · 修一:标题末尾回车吞字(A-04 族新入口,4/4,与时间窗无关)

- **现象**:Turn into → Heading 转出的标题块,末尾 End+Enter 后打字**全部丢失**;每回车多一个空 paragraph,焦点不进新行;手动点进空行再打则正常。服务器留 3 个空 paragraph。对照:普通段落 Enter 已被 F4-2 修好(R2-06 七次零丢)。
- **判读**:F4-2 的唯一真相源覆盖了段落路径;标题块的 Enter 分裂/焦点交接走了另一条路——新块创建了(空 paragraph 为证)但**焦点交接没完成**,后续键无人接。
- **修法**:侦察标题路径的 Enter 处理与焦点交接,按 F4-2 同一法度收口(新块创建后焦点必达,窗口键入队重放⛔丢弃);若根因与 F4-2 的权威发布缺口同族,用同一机制,⛔另造一套。
- **顺手侦察(申报⛔强修)**:转标题瞬间底栏闪「Source locked」约 1 秒、Layout/装订变灰——这是用户自己的笔记,查明该状态为何闪现,结论进回执。
- **测试**:标题末尾 Enter→焦点进新段+键入保留(对应 4/4 场景);段落路径回归(R2-06 形);转标题本身回归。

## 二 · 修二:空卡组加不了第一张卡(鸡生蛋死锁)

- **现象**:New Card 必选 Section;「No sections…Create a section first.」;而 Add section 按钮无反应——`DeckDetail.tsx` 约 :201 在 `cards.length===0` 时不渲染 SectionList,建分区输入框恰在 SectionList 里。Create Card 静默零请求;Ctrl+K 同困。Agent 经 create_section 工具可绕(它能,人不能)。
- **性质**:违反红线「Agent 能编辑的,人类必须 100% 都能编辑」——本单最高优先级依据。
- **修法**:空卡组状态下分区创建必须可达(渲染条件修正或把分区创建搬出 SectionList,你judge,申报);Create Card 在无分区时的静默失败改为明确引导;
- **测试**:空卡组→UI 建分区→UI 建卡全链(人路);Agent 路回归不破。

## 三 · 搭车侦察(⛔强修):0 块源文档离开误报

- 0 块的 png 源文档改网址离开→「Changes could not be saved」1/4 复现;控制台每次都有 react-router blocker-on-POP 警告。查触发条件,低价修则修,贵则报结论(R2-09 四路径已 0/4,此为残余新路径)。

## 四 · 验收与测试面

client 定向(canvasEngine 标题/焦点族+DeckDetail 族)+必要服务端邻接;正门纪律;阳性对照≥1(荐修一:焦点交接摘除→用例红);⛔真实模型调用;⛔全库马拉松。

## 五 · 纪律

照抄现役全套(⛔git 写/⛔.env 值/⛔用户库/⛔动锁文件/⛔安全对抗类用例/合成值规矩/措辞中性)。

## 六 · 回执协议

本文件尾部 `## Result` 五件套;证据 `docs/audits/2026-11-01-vps-f7-builder/`;完工短讯。

## 七 · 不在射程

卡组 UI 其余体验(🅱 批);A-12 列举能力(设计题候 Main_Designer 方案);A-13(候 Tester 对照实验);复习流其余。


## Result — 2026-11-01 · 临时工程对话1

**执行状态**:修一、修二 `done`;两项顺手/搭车侦察给结论,未强修。交工作树,未 commit(client 5 改 + 1 新,+183/−12)。

### 修二(最高优先级):空卡组死锁 —— 人路打通

- **根因**:`DeckDetail.tsx` 在 `cards.length === 0` 时只渲染空态,SectionList 连同其中的「新建分区」输入框都不出现;header 的 Add section 只翻转 `showNewSection`,而该状态只在 SectionList 内部生效,所以按钮看起来无反应。建卡对话框在无分区时只显示一行字,提交只弹一个容易错过的 toast,表现为静默。
- **修法**(我的取舍):
  1. 空态只在「无卡且无分区且没点新建」时显示,其余情况一律渲染 SectionList,空分区也可见,可以往里加卡;空态内加「Add section」按钮,文案改为「Create a section, then add your first flashcard.」;
  2. **建卡对话框内联建分区**:无分区时直接给「分区名 + Create section」,建好后自动选中。这样 Ctrl+K 等任何入口都没有死胡同。保存按钮在无分区时禁用,提交兜底 toast 改为「Create a section for this card first」;
  3. 顺手修正一个跨卡组错配:分区 store 是全局的,存的是最后一次加载的那个卡组的分区,对话框原样展示。经 Ctrl+K 从别处打开时会列出**别的卡组**的分区。现改为按 `deck_id` 过滤。
- Agent 路(`create_section`)是服务端工具,本单零改动。

### 修一:标题末尾回车吞字

- **复现**(本地临时实例,数据全在 scratchpad;按操作手册用 `# ` 建标题):标题末尾 End+Enter 后立刻打字 → 新空段落出现,焦点最终落进去,**但期间打的字全部丢失**,服务器只有空段落。
- **根因**:标题后回车不是 F4-2 修的段内分裂,而是 `useHeadingStructureController.commitStructure` 的异步结构提交。它要跨多帧,经过 applyEdit、flush、extractUnit 新建块、moveUnit、reorder。整个窗口期 `headingStructure.isBusy()` 都挂在各条编辑边界上(`useNoteCanvasRuntimeController` 里的 `beforeHistoryBoundary` / `boundary` 等),**所有键入都被边界拒收丢弃**;窗口里再按 Enter 又会触发一次标题回车,于是每次回车多一个空段落。我实测这一版焦点最终能送达,Tester 看到的「焦点不达」正是窗口内连续回车造成的。
- **修法**(F4-2 同一法度:入队重放,⛔丢弃,经同一权威):
  - 结构提交开始时,在 window 捕获阶段拦下发往笔记编辑器(`data-runtime-textflow-editor`)的 `beforeinput insertText` 与 Enter keydown,入队;
  - 焦点送达新段落后,经编辑器自己的 `textHistory.applyEdit` 重放进权威,跟普通键入同一路,可撤销;队列里的 Enter 用同一个 `splitTextUnitForEnter` 拆段;
  - **同时把文本半边写进权威**(`setBlockTextDrafts`)。实证:只写 flow 时,`alignFlowWithText` 会以旧的 text 草稿为准把 flow 对齐回去,页面仍是空的。这与 F4-2 定下的恒定律同族:凡不经权威发布的写入,必须把结果发布进权威,text 与 flow 两半都要。
  - 输入法组字(composition)不拦截,以免打断输入法;结构提交失败时队列随失败 toast 一并放弃(此时没有可跟随的新块)——均申报。
- **浏览器实证**:标题末尾回车后立刻打「Body after heading」→ 落定后续打「 more」→ blur。服务器在标题后的新段落为 **「Body after heading more」**。

### 顺手侦察:转标题瞬间闪「Source locked」(结论,未修)

- 底栏的锁标签按 `contentReadOnly` 显示(`NoteChromeLayer.tsx:412`),而 `contentReadOnly` 是**多个瞬时忙态与真正 Source 锁的并集**(`useNoteCanvasRuntimeController.ts:645`:`sourceProjectionPolicy.contentReadOnly || textHistory.replaying || historyReplaying || walls.saving || headingStructure.busy || chapters.isMoving`)。
- 转标题期间 `headingStructure.busy` 约 1 秒为真,于是用户自己的笔记显示「Source locked」,Layout / 装订被置灰。**是标签错配,不是真锁。**
- 低价修法建议:给 chrome 单独传 `sourceLocked = sourceProjectionPolicy.contentReadOnly`,锁标签只看它,瞬时忙态另用无文案的 busy 态。约 5 行,候裁。

### 搭车侦察:0 块源文档改网址离开的 1/4 误报(结论,未修)

- 「blocker on a POP navigation not created by @remix-run/router」警告来自**手改地址栏 / hash** 触发的 POP 导航:路由 blocker 拦不住这类导航,`useNoteRouteSaveBoundary` 的离开前排空(flushForLeave)不会运行,只能走卸载后的兜底路径(`useLayoutEffect` 清理里 `queueMicrotask(() => flushPendingSaves().catch(→「Changes could not be saved」))`)。
- 推断(未逐步验证,1/4 的时序特征吻合):兜底 flush 时编辑器正在卸载,`useTextFlowHistory.flush` 的 `scope.current()` 可能已为假而直接抛「Text changes could not be saved」。该笔记 0 块、本无待存内容,却被报失败;成败取决于微任务与卸载清理的先后。
- 修法方向:卸载兜底路径只在**确有待存内容**时报失败(例如先查写注册表与 history 的 failures / 未确认事务)。这涉及离开纪律,不宜搭车硬改;建议另立小单,配确定性复现(手改 hash 离开 0 块投影笔记)。

### 测试(实跑实报)

- **新 / 扩用例**:
  - `useHeadingStructureController.test.tsx` 新增「replays text and Enter typed while Enter after a heading is still committing」:真实 history / 拆分 / 移动 hook,结构提交窗口内派发 `Body` / Enter / `Next` → 新块 flow 为 `['Body','Next']`,text 草稿为 `'Body\nNext'`;提交后再打字恢复为普通输入。该文件 **5/5**;
  - 新 `pages/Decks/EmptyDeckFirstCard.test.tsx` **2/2**:空卡组页 → Add section → 输入 → 建分区,空分区仍可见;建卡对话框不列别的卡组的分区 → 内联建分区 → 自动选中 → 提交带 `section_id` 建卡(提交用 form submit,绕开模板内容字段的原生 required 校验,本用例只测分区链)。
- **阳性对照 ×2**,均已还原:
  - 关掉输入捕获 → 仅重放用例红(`positive-control-capture-off.log`);
  - 空态条件退回 `cards.length === 0` → 仅「从卡组页建分区」用例红(`positive-control-empty-deck-gate.log`)。
- **回归**:`client/src/pages/Notes/canvasEngine/` + `pages/Decks/` + `components/` + `stores/` 共 182 文件,**2025 pass / 1 fail**。唯一失败是 `PaginationProjection.test.tsx` 的 5000ms 满载超时,与 F4 时同一条;单跑两次均 5/5。证据 `client-targeted-vitest.log`。
- **类型检查**:client 0(`client-tsc.log`)。
- 段落路径(F4-2 的 R2-06 形)由 `useDraftBlockController` 与 `useNoteCanvasDataAdapter` 的既有用例覆盖,包含在上述回归内,全绿。

### 环境申报

- 本地临时实例的启动配置(`.claude/launch.json` 临时条目)已原样还原,diff 0;临时库是我自己的 scratchpad 库;复现时在临时块上误点过一次「Hide from AI context」,已立即点回。
- **工作树里 `docs/agent-ops/current-state/app-operating-manual.md` 呈已修改状态,不是我改的**(应是别的会话在编辑),我未触碰,收割时请留意。
- 一次 Python 内联转义把换行写进了测试字面量(esbuild 报错),已用 Edit 修正。
- 未读 `.env`;无 git 写操作;无真实模型调用;无用户库接触。

## Main_Designer 收口 — 2026-11-01

- **实质验收**:HQ 复跑 heading 控制器+Decks+fast-enter 回归 9/9、tsc 0;182 文件 2025/2026 采信(唯一 fail=PaginationProjection 满载超时惯犯,单跑绿);两处阳性对照照单全收;
- **修一法度核准**:根因(结构提交忙态使编辑边界拒收键入)与修法(捕获入队→经 textHistory.applyEdit 重放进权威,text 与 flow **两半都发布**)把 F4-2 恒定律补成完整形——「凡不经权威发布的写入,结果必须发布进权威,双半皆然」,立为定律终形;IME 不拦截与失败弃队列两申报核准;
- **修二红线修复核准**:人路三门全开(空态条件/内联建分区/跨卡组分区错配顺手修),Agent 路零动——红线「Agent 能编辑的人类必须 100% 能编辑」恢复守恒;
- **两侦察处置**:「Source locked」标签错配五行修**转正进 F8 修四**;0 块改址离开误报=另立小单候排(需确定性复现,低优先,记台账);
- **manual 改动澄清**:builder 看到的 app-operating-manual 修改是 Main_Designer 的 steward 除旧(81bf7fbe 已入库),树净;
- F7 闭合,随收口第九轮部署。
