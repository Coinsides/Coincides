> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Audit（Reviewer 发现，只出发现不裁定）
> **日期 (Updated)**: 2026-11-09

# A-25 终核 · Reviewer 发现

**总判：不挡。一条 🅰 候选（M1，指示文案对被拒停的块不真），其余是 🅱 和观察。**

**读码对象与口径**

- ops 包 `a25-ime-save-failure/src/`，`src.sha256` 本身的 sha256 = `0afec3d1…`，19/19 核过。
- 包里 6 个文件与最后一份快照（`2457c771…`）逐字节相同，今天已读过，不重读。
- 其余 13 个文件对共享树 diff：HEAD `bec9115f`，源码与 `dfbcce8e`（A-20b r2）相同。
- 行号对包内 `src/`。简称：A = `useNoteCanvasDataAdapter.ts`，H = `useTextFlowHistory.ts`，HSC = `useHeadingStructureController.ts`，D = `useDraftBlockController.ts`，R = `useRuntimeNaturalWritingController.ts`，P = `draftBlockPersistence.ts`。
- 没跑测试，没构建。tokens：不可得。

## 1 · 快照 6 文件

确认：D、HSC、HSC 测试、H、H 测试、`DraftBlockEditorLayer.tsx` 与快照 `2457c771…` 逐字节相同。

## 发现

### M1 · 确认（读码）· 建议 🅰 · 指示写「trying again」，对被拒停的块不是真话

- **裁定要求**：指示「文案真话」。
- **现状**：`BlockSaveFailedMark.tsx:23` 对每个失败块都写「Not saved yet · trying again」。
- **反例**：r3 F3 之后，4xx（401 / 403 / 409）只拒停本块：定时器跳过它（H `refusedBlocks`，跳过在 `retryFailedSaves` 的循环里），只有 Retry、online 或本块一次成功才会再问。
- **触发序列**：
  1. 块 X 的封口保存 409（块在服务器上已被改过）。
  2. X 进入 `failures` 和 `refusedBlocks`，指示亮起，写「trying again」。
  3. 此后没有任何自动重试。409 的重试用的还是原来的 base，再问也只会 409。人会等一个不会发生的重试。
- **改法供裁**：
  - 最便宜：文案去掉「trying again」，只留「Not saved yet」+ Retry + Copy。只动 `BlockSaveFailedMark.tsx`，不碰已冻结的 H。
  - 或者把被拒停的块单独交给 UI，分两种文案。要动 H。

### M2 · 确认 · 建议 🅱 · 「A previous block edit is queued for recovery」仍然弹

- **裁定**：(iii) 注里写了「这条提示与横幅重复，归 (e) 收声」。
- **现状**：A:830 仍在打开笔记时，对每条别次访问的回执 `addToast('info', …)` 一次。
- 它不是失败时的提示，所以不违反「一次失败 = 0 toast + 1 指示」；只是没按裁定收掉。由裁定决定这一轮收不收，还是记 TD。

### M3 · 测试缺口 · 建议 🅱 · (iv) B 与 (iv) C 没有专门的测试

- 读码核过两处都正确：
  - B 在 A:2093–2101：Apply / Replay 写进被 apply 条目的槽，序号取 `max(本页序号, 原条目序号 + 1)`；
  - C 在 A:2633：模板转换只收本次访问的条目。
- 包里没有钉住它们的单测：没有「Apply 遇 409 仍只有一项」，也没有「模板转换后别次条目仍在」。
- 后者在 Tester 的 A-25 臂里（「模板转换后别次条目仍在」）。

## 逐条核对

### ①(a) 组合中不建块

| 核点 | 结果 |
|---|---|
| 草稿框（`DraftBlockEditorLayer.tsx` :86–95） | compositionstart 置标志；组合中的 change 带 `{ composing }`（另用 `isComposing` 兜底）；compositionend 每次都以不带 input 的方式再调一次 `onChange` |
| `DraftWritingEntryLayer.tsx`、`NoteWritingSurfaceLayer.tsx` 的 `onDraftChange` | 只改了类型，透传 `DraftInput` 一跳不漏 |
| POST /blocks 不在组合中发出 | R:451 组合中不调 `persistDraft`；R:449 每次 change 都报组合状态 |
| 交接等 compositionend；追赶不存组合中的文本 | D 的追赶循环与交接（r2 已核） |
| 组合期间不挪焦点 | 交接是唯一的焦点移动，只在组合结束之后。D 里另一处焦点调用是 `draftActive` / `draftFocusNonce` 的效应，与组合无关 |
| 等待者放行不丢字 | r2 O1 与 r3 已核：重置时 `requestIsCurrent` 为假而退出；卸载时由 history 的 boundary 拒发 |

**O1（🅱，不在 A-25 的 diff 里）**：草稿框 `onBlur`（:97–102）对有内容的草稿调 `onPersist(text)`，不看 `composingRef`。

- 如果浏览器在组合中先发 blur、后发 compositionend，这次 POST 带的是组合中的文本。
- Chrome 的顺序没有核实。而且组合中离开输入框时，输入法常把字母原样提交，所以价值有限，记一笔。

### ②a 指示 UI

| 核点 | 结果 |
|---|---|
| 亮灭同源 | runtime :674 `failedSaveBlockIds` = `textHistory.failedTypingBlockIds`（H:1410），源锁定笔记为空 → NoteWritingSurfaceLayer :1990 `saveFailed` → BlockEditorLayer :538 渲染。与 H:1410 同源。HSC 静音用的 `holdsFailedSave` 也同源（已核） |
| 文案真话 | **见 M1** |
| 复制取该块当前文字 | `text` = `blockTextDrafts[block.id] ?? textFromContent(block)`（NoteWritingSurfaceLayer :1969），编辑器每键都会发布，所以是当前文字。成立 |
| 指示在屏期间零 toast | 打字保存在 H:429 带 `quietFailure: true`，A:2338 因此不弹。H 的 `onSaveFailure` 只剩块已不在（:400，那时块不在屏上，不会有指示）以及 template / document 路径（:533、:615、:704、:774、:1161），这些不亮指示，弹 toast 正确。本块结构被拒静音（已核）。成立 |
| 成功即消失 | 成功分支有失败时重绘；`failureGone` 也重绘（已核）。成立 |

**O2（🅱）**：Copy（`BlockSaveFailedMark.tsx:27`）成功或失败都不给任何反馈；在没有剪贴板 API 的环境里（非安全上下文），可选链短路后什么也不做，也不报错。

### (e) 收声两处

- **适配器**：A:2338 改为 `!options.quietFailure` 才弹。只有 history 的打字保存传 `quietFailure`（H:429）。不经 history persist 的保存仍会弹，比如草稿追赶经 history `saveBlock` 的 else 支，这正合裁定「不经 history 的保存（表单字段等）不变」。F17 改断「无提示且块进入 `failedTypingBlockIds`」（A 测试 :944）。成立。
- **history**：打字失败不再调 `onSaveFailure`（只剩块已不在那一处）；runtime :399 的 toast 只服务于 template / document / 块不在。成立。
- 「A previous block edit is queued」见 M2。

### (iv) A / B / C / D（含 D1–D3），终版行号

| 项 | 行号 | 核 |
|---|---|---|
| A 每个块每次访问一个槽 | P:149（键 = note + block + mountNonce + creationGeneration），P:480 列出时按槽去重，P:520 写入只替换同槽 | 成立。测试 P 测试 :814；A 测试 :3497、:3524、:3552 |
| B Apply / Replay 继承槽 | A:2093–2101 | 成立（读码），无测试，见 M3 |
| C 模板转换只收本次访问的条目 | A:2633 | 成立（读码），无测试，见 M3 |
| D 只在 409 时合并 | A:2410 成功直接返回；随后只有 `rejected` + 有回执 + `isStaleRevisionError`（A:431）才往下 | 成立 |
| D 全有或全无 | `mergeRecoveryOntoCurrent` A:442：结构不同、单元已不在、`mergeTypedText` 为 null，都返回 null → 不写 | 成立 |
| D 已同 = 精确相等 | A:458 | 成立 |
| D1 | A:463 `placed.text === live.text → null` | 成立。「已同」只剩 A:458 一个入口，A:2443 的 every 与之等价 |
| D2 | A:465–475，逐单元 `replaceTextUnitText` 以插入为 edit | 成立 |
| D3 | A:2435–2437 规范化后比较字段，不等返回 false；A:2461 回执无字段时写出仍为无 | 成立 |
| D 第二次 409 即停 | A:2455 唯一一次合并保存，此后不再写 | 成立 |
| 测试 | A 测试 :1163（D 五例）、:1265（D1–D3 五例） | 都在 |

**(ii) 与决定 3 一并核**：

- (ii) A:423 `receiptIsOnServer` 按单元精确相等，只在打开笔记时（A:820）对别次访问的回执判；相等就忘掉，不再提供。测试 A 测试 :4933。成立。
- 决定 3 A:2261：路由已离开且回来的块与发出的一致时，判 `matches_requested`。测试 A 测试 :3252。成立。

### 单写者、自动重试、拒键范围、H1 / H2、测试债

| 核点 | 结果 |
|---|---|
| 单写者 | 自动重试、Retry、online、失焦都走同一条写道（r2 护栏已核）。D 的合并写是同一个人动作在适配器里的第二次请求，按裁定算同一写者，并且只有一次 |
| 拒键范围只在那一块 | 普通打字：只有持失败的那块被拒（k25c LANDFAIL-other 实测）。结构键：注意写入登记的 `whenIdle`（共享树 `inFlightWriteRegistry.ts` :9–17）只要**任何**写入有失败记录就 reject，所以失败期间别块的结构键（比如标题行 Enter）仍会被拒并弹 toast。这正是裁定「②b 跨块隔离不做」和护栏「别块持失败 → 弹 1」的形状，与裁定一致，不算发现。手册「已知」若写「别的块照常」，宜限定为打字 |
| H1 | HSC:243–250，定时器体包 try / finally，队列不断。测试 HSC 测试 :1735 |
| H2 | HSC:536–541，切笔记后对仍在框里的条目重排 `retryTimer`。测试 HSC 测试 :1766 |
| S2 测试债 | HSC 测试 :1548 在 |
| O4 测试债 | H 测试 :1193 在 |
| 修前红的测试都在包里 | 回执「阳性对照」表列的各例，在包内对应位置都找到了：r2 四组、F1–F4、R1、O4、②b 浏览器形、收窄、D1–D3、S2 / O4、①（R 测试 :831 / :852 / :892，草稿框测试 :298 / :341）、(iv) A、(ii)、决定 3。B / C 无，见 M3 |

### 3 · BlockEditorLayer 与 runtime 的改动范围

- `BlockEditorLayer.tsx` 改 7 行：import、两个 props（`saveFailed`、`onRetryFailedSave`）、:538 一行渲染指示。
- `useNoteCanvasRuntimeController.ts` 改 2 行（:674–675），把 `failedTypingBlockIds` 与 `retryFailedSavesNow` 接到层 props。
- `useNoteCanvasLayerProps.ts` 透传 2 行。
- 三个文件都没有别的改动，与回执「只接指示」一致。回执没有单列这两个文件的说明，范围以 diff 为准。

## M1 重封核（2026-11-09 追加）

**结论：成立。**

- 重封后 `src.sha256` 本身的 sha256 = `08d0cb0d…`，19/19 核过。
- 与重封前的哈希清单逐行比对，只有 `layers/BlockSaveFailedMark.tsx` 一行变了，其余 18 个文件哈希不变。
- 改动只有两处：
  - :24 文案改为 `Not saved yet`；
  - :1–4 头注释说明为什么不承诺自动再问（服务器拒过的 401 / 403 / 409 不会再问）。
- 包内 `src/` 里不再有「trying again」字样，没有测试或别处引用旧文案。
