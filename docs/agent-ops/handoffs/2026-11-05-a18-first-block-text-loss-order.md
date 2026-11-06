> **from**: Main_Designer
> **to**: 临时工程对话1(builder);核验 Tester(1)
> **status**: ready
> **日期**: 2026-11-05
> **性质**: 🅰 静默丢用户文字,优先级高于 round-04 其余发现

## 现象(Tester round-04,真 Chrome,b7ebfb5b)

新笔记首块打完字很快回车,偶尔丢字或错位,**服务器也存成错的**:

- 真键盘打 `abcdef` 后回车,间隔 120-400ms,30 次错 3 次:`abcde / xyf`(f 跑到下一行),`abcde / xy`(f 丢了)。
- 模拟 IME 整段提交后回车,间隔 250-350ms,19 次错 5 次:第二行插到第一行头;回车被吞且第二行消失;拆出旧半截。
- `# 标题甲` 路径:第一段回车、打标题,300ms 内回车,结果 `[heading_1]标题甲第一段`,光标复位到 0。
- **射程**:只在新笔记首块、首次落库窗口内。同一块先存过(等 4 秒)再连打,90 行 0 错。

证据目录:`C:\Users\henry\AppData\Local\Temp\claude\363545182cb476c7\5f423a4a-8153-4287-865a-65e4015ae36d\scratchpad\f9`(keys.log、enter-window.json、enter-matrix.json、hash-matrix.json、lines.json)。Tester 未查根因,也未确认是否本版引入。

## 要做

1. **先复现,再查根因**:用同样的真键事件矩阵在本机 v2 新库复现。射程指向首块第一次落库与回车拆块的竞态,这只是入口,以实证为准。
2. **判定来源**:在 scratch 副本对照早期版本(如 11-01 单写者手术前后),写明是否回归。⛔共享树换码。这是「一个真相一个写者」第四次发作,回执写明为什么前三次没堵住这条。
3. **修根因**:⛔靠加延迟、加防抖或拦截回车绕过。用户的每个按键都不能丢,也不能错位,服务器与 DOM 必须一致。
4. **验收**:同一矩阵修后 0 错,修前有红,样本数不低于 Tester 的量并写明;IME 和 `# ` 路径同测;已落库块的既有路径不回归;回归测试放进仓库且在未修代码上红。IME 是模拟事件,真输入法验不到就如实申报。

红线:⛔git 写操作、⛔真实模型、⛔碰岛、⛔扩修。新 server 测试同批挂载。工作树里 V1、F1、F2 候核验未提交,**不要动它们**,回执列出本单改动的文件清单,收割要分开。证据落 `docs/audits/2026-11-05-a18-builder/`。量级超出就停件上报。Result 写单尾并短讯 Main_Designer。

---

## Result(builder 2026-11-05)

**执行状态**:完工,未提交。未碰岛和 Henry 的文件,零真实模型,无新依赖。**有一类症状我本地没复现,修复对它只是推理,见「没验到」第 1 条,请 Tester 重点核。**

### 本单文件清单(收割用,和 F3 分开)
- `client/src/pages/Notes/canvasEngine/hooks/useDraftBlockController.ts`
- `client/src/pages/Notes/canvasEngine/hooks/useSlashCommandController.ts`
- `client/src/pages/Notes/canvasEngine/headingInputService.ts`
- `client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx`
- `client/src/pages/Notes/canvasEngine/hooks/draftFastEnter.test.tsx`
- `client/src/pages/Notes/canvasEngine/hooks/useRuntimeNaturalWritingController.test.tsx`
- `client/src/pages/Notes/canvasEngine/headingInputService.draftText.test.ts`(新)
- `docs/audits/2026-11-05-a18-builder/`(新)

`docs/brainstorm/field-tests/round-04/` 的改动不是我的。

### 根因

不是首次落库和回车拆块抢写。**存盘的内容经常是对的,错的是交接那一刻,光标和未保存的回车没有被准确带到持久编辑器。**有三处:

1. **`trimEnd` 吃掉回车**:草稿保存和交接都用裁掉结尾的文本建 flow。回车后没再打字时,`第一段\n` 存成一个 unit,光标按「第二行」算却只有一个 unit,落到第一个 unit 的偏移 0。下一个字就插到第一行开头。Tester 的「第二行插到第一行头」「回车被吞」都是它,`# ` 路径的 `标题甲第一段` 也是同一原因。
2. **交接不是原子的**:光标在 `persistDraft` 尾部算好,但聚焦要等 React 下一次渲染,中间的按键落在快要失去焦点的草稿框里。
3. **`flushSync` 够不到发布**:`saveBlock` 把新 flow 发布到权威用的是默认优先级。聚焦那一帧 DOM 里还没有目标 unit,`BlockEditorLayer` 就退回第一个 textarea。我第一版修复只改了前两处,这条是逐帧追踪抓到的。

**修法**(无延迟、无防抖、不拦截回车):
- flow 用未裁剪的文本建,回车就是一个真实的空 unit。
- 循环确认无新按键后,在同一个任务内读光标、发布 flow、渲染并聚焦(`flushSync`),按键插不进去。
- 同一文本只生成一份 flow,保存、权威、光标用的是同一组 unit。
- 目标 unit 还没渲染时不再聚焦到别的 unit。
- 草稿里打的 `# ` 走持久编辑器已有的标题请求,没有另写一条路。

### 验收(同一矩阵,新库 v2,真 Chrome,CDP 真键事件,每样本一篇新笔记)

| 构建 | 往返 | 样本 | 错 |
|---|---|---|---|
| 修前 | 80ms | 146 | **24**(`pause` 16/40、`hash` 4/6、`hashEnter` 4/4) |
| 修后 | 80ms | 146 | **0** |
| 修前 | 400ms | 60 | **5**(`hash` 3/3、`hashEnter` 2/2) |
| 修后 | 200ms | 60 | **0** |

样本数高于 Tester 的 30+19+7。DOM 和服务器都比对,逐条结果在 `matrix-summary.txt`,脚本 `matrix.mjs`、`proxy.mjs`、`trace.mjs` 一并留存。已落库块的 `settled` 修前修后都 0 错。

回归测试 `draftFastEnter.test.tsx`:在 scratch 副本恢复裁剪、去掉发布,各红 1 条(`positive-controls.txt`)。

**闸**:tsc 0,`canvas-runtime-boundary`、secrets 过。客户端全量 2592 过 2591,红的是 `BoardPage.selection`,单跑 7/7(`red-files-alone.txt`),它不碰草稿路径,上一单也出现过,原因仍未查明。服务端未改,没有重跑。

### 是否回归:不是

scratch 副本构建旧客户端,同一组 `pause` 和 `hash`:
| 版本 | 样本 | 错 |
|---|---|---|
| `89c94fdb~1`(手术前) | 23 | 23(直接丢字) |
| `89c94fdb`(手术后) | 23 | 11 |

光标错位在手术前就存在,被丢字盖住了;手术修好丢字后才露出来。

### 前三次为什么没堵住

- `7628bc82`:让草稿重放丢的按键,但重放用的还是裁剪后的文本。
- `89c94fdb`:把内容收归一个权威,杀手测试证明旧内容不会复活。**这个不变量只管内容,不管光标和未存的回车,而且 `trimEnd` 被当成无害清理留了下来。**
- `3cc2a0e4`:排队标题结构提交期间的按键,不管草稿交接。

共同的盲点:三次都在问「谁拥有这段文字」,没问「用户的下一个键会落在哪」。`draftFastEnter` 的旧用例回车后立刻打字,而这个缺陷需要回车后停 120ms 以上,所以一直绿。我自己的矩阵一开始也是回车后等 25ms,0 错;是 Tester 脚本里的 150ms 指出了差别。**回车后停顿现在进了矩阵和回归测试。**

### 空闲保存(A-20)能否走同一路径:可以,有四个条件。以下读代码得出,未实测

持久编辑器里,停止输入后调用既有的 `session.seal()`(`useTextFlowHistory.ts:655`,和失焦同一个入口),走 `onSeal` → `enqueueRuntimeHistoryOperation` → `persist`,串行队列,带 `base_revision`,不是第二个写者。
1. **只 seal,不直接保存**,否则就是第二个写者。
2. **草稿期不加定时器**:保存循环已经逐版本在写,再加就是这次病根的翻版。
3. **结构提交期间跳过**(`busy` 或 boundary 关闭时)。输入法组合中 `seal()` 本来就返回 false,有测试。
4. **代价要裁定**:每次 seal 产生一个撤销项,所以停顿 2 秒会切开撤销分组,行为会变。

### 行为变化
- **尾随空格保留**:以前保存时裁掉,光标在空格后会错位。为此改了 `useRuntimeNaturalWritingController` 一条旧断言(`'draft'` → `'draft '`)。此时 `plain_text` 仍是裁剪的,flow 不裁,两者差一个结尾空白。
- 回车后离开,会存下一个空 unit,和持久编辑器回车一致。

### 临时行为(A-21 修后收回)
草稿窗口里的 `# `,**只有在它是最后一行时才转标题**;后面还有正文时保留字面 `# 标题甲`,不丢字、不错位。矩阵的 `hashEnter` 按此计过。这是为了不把新路径引到 A-21。

### 没验到
1. **`abcde / xyf` 这类(丢或错位 `f`)本地没复现**:`keys`、`slow`、`kpause` 共 72 个修前样本都 0 错,CPU 节流到 6 倍也没有。Tester 的 `chars300`(`第 / 第一段甲乙丙\n第二行`)同样没复现。原子交接在机理上覆盖它们,但**没有修前红,这部分只是推理**,需要 Tester 在岛上用原脚本核。
2. **真输入法**:IME 是 `Input.insertText` 模拟,没有真实组合事件,也没有用 `imeSetComposition`。
3. **岛上网络**:往返由 scratch 代理模拟,岛上没测。
4. **修前 400ms 的 `pause` 0/20**:这个往返下窗口落在别处,所以我用 80ms 作主对照;修后没有再跑 400ms 全量(只跑了 `hash` 两组,10 样本 0 错)。
5. `hash` 的 `第一段\n# ` 只验了中文。

## 中期判语(Main_Designer 2026-11-05,依 Tester docs/audits/2026-11-05-a18-builder/review-tester.md)

**A-18 不放行。** 修好了它修的那类(真键 `abcdef` 回车 6/30 → 0/30,回车后停顿 3/3 → 0/3),但有回退,修后版本反而更差的地方必须先清:

| 路径(修前 → 修后,同一真后端) | 结果 |
|---|---|
| 连写几行、每步停 300ms,形如 `["aa","","cc","dd","eebb"]` | 1/8 → **5/8**,本地 7/8,变差 |
| 快速 `# head` | 修前错但不丢字母;修后 8 次 1 次丢 `h`,本地 4/8 是 `ead`,**新增丢字** |
| 英文句子 `hello␠` 停 `world␠`,字打到空格前面 | 7/8 → 8/8,未改善 |
| 回车后屏幕上两个框,`abc` 显示两遍,至少 5 秒 | 修后新增 |

**验收矩阵固定加三项,全部接真后端**:人类节奏连写(每步停 300ms)、真键打标题、英文句子(带空格停顿)。builder 原矩阵三项都没有,146 错 0 不能代表这些路径。编辑器一组一起验收时,修前修后都要跑,修后不得比修前差。

## 编辑器组回执指针(builder 2026-11-06)

A-18 残留与 A-21、A-24 同批交付,回执在 `2026-11-05-a19-a20-image-pages-and-idle-save-order.md` 尾部「编辑器组 Result」。本单上方 Result 有两处已更正:文本半边的 `trimEnd` 不是无害差异,而是回退的根因;`plain_text` 仍裁剪的说法不实。
