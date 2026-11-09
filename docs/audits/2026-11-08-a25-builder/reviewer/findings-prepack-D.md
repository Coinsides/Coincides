> **状态 (Status)**: active
> **层 (Layer)**: 审计 / Audit(Reviewer 发现,只出发现不裁定)
> **日期 (Updated)**: 2026-11-09
> **权威 (Authoritative)**: 否(发现);裁定归 Main_Designer

# A-25 ②a (iv) D 封前读 · Reviewer 发现

**总判:建议封前改两处(D1、D2),其余成立。**
- **D1(确认,建议 🅰)**:「已同」的出口不止精确相等一种。一条**只删字**的回执,mergeTypedText 返回原样的服务器文(不是 null),于是被判成「全部已同」:条目被忘掉,一字不写,Apply 返回 true。
  - 今天这种情形是一个冲突项,还能 Replay;D 之后它直接消失。
  - 这违反不变量 ① 和 ③。
- **D2(确认,建议 🅰)**:合并后的 flow 只替换了单元文字,`inline_structures` 没有随插入的字重算偏移。合并单元里若有行内链接,写到服务器的链接区间会错位。
  - 批注区间和板区间都重算了,唯独行内结构没有。
- 其余:④ 和 ⑤ 成立;② 除 D1 之外成立;⑥ 两张表确实可能不同,但 D 只用适配器那张,安全;另有观察 O1–O4。

**读法与范围**
- 快照:`<ops>/packages/a25-prepack-snapshot/src/`,`sha256sum -c` 6/6 OK。
- 前缀:A = `hooks/useNoteCanvasDataAdapter.ts`,HSC = `hooks/useHeadingStructureController.ts`(都在 `client/src/pages/Notes/canvasEngine/` 下)。行号都对快照。不在快照里的文件读共享树,标「共享树」。
- 我拿 A 对 A-20b 包里的适配器逐行比过:D 的改动是 +1 import、:416–463(两个 helper 加合并函数)、:516–518(表)、:785–794(水化记表)、:2396–2452(Apply 末尾);(ii)、B、C 和收声另有改动行,不在本次核点。
- 纯读码,不跑测试、不构建、不取锁,没起子代理。token:不可得。

---

## 发现

### D1(确认;建议 🅰):只删字的回执走进了「已同」出口,条目被忘,今天的冲突项消失

**不变量**(按 (iv) D 末节的改写):已同 = 服务器单元字 === 回执单元字,先于合并判定;其余一律走 `mergeTypedText`,返回 null 即不可锚。由此推出:**一个与打开时不同、也不等于服务器文的单元,合并后必然改变服务器文,否则就是不可锚**。

**实情**
- A:454 `unit.text === opened` 和 A:456 `live.text === unit.text` 之后,其余单元进入 A:457 `mergeTypedText(live, opened, typed, …)`。
- HSC:73 只在 `live === initial` 时返回 typed。
- 服务器那行变过,而回执相对打开时**只删了字**(例如删掉一句)时:typed 是 opened 去掉一段,算出的 `inserted` 为空,HSC:80 `if (!inserted) return { text: live, … }` 返回**原样的服务器文**,不是 null。
- A:459 把它记成「合并结果」。若别的单元也都 continue 或同样是 no-op,A:422 的 `every(...)` 为真,于是 A:423 忘掉条目,A:425 返回 true,**不写任何东西**。

**触发序列**
1. 上次访问在某行删掉一句,保存失败,留下回执。
2. 重开后,本次访问在这一行另打了字(服务器版本前进,(iv) A 保护的正是这种情形)。
3. 点 Apply,遇 409,进入 D,上面那条路径把条目忘掉,Apply 返回 true。

**后果**
- 没有字丢失:删掉的那句还在服务器上。
- 但人删掉的意图被静默放弃,恢复项从队列里消失(没有成功提示,但项没了)。
- 今天(D 之前),这是一个 409 冲突项,还有 View differences / Replay(整块替换,能实现那次删除)/ Discard 三个出口。D 改变了「非全可锚」情形下今天的行为,违反 ①。
- 「部分已同」也说明 A:422 的判法不准:它比的是合并结果与服务器文,而不是 A:456 的精确相等。

**同族,裁定已接受的部分(只作记录)**:回执相对打开时是「替换」(删 + 插)时,插入的字落地,删除被丢,写成功后条目被忘。这正是 (d1)「只插不删 → 最坏多字不丢字」接受的代价。与 D1 不同的是,那种情形至少写了插入的字;D1 一字不写就把条目忘了。

**建议(一行)**:A:458 之后加 `if (placed.text === live.text) return null;`。到这里 `live.text !== unit.text` 已成立,所以 no-op 合并只可能来自「只删」或「插入的字已在缝里」(HSC:95 那条也返回 null)。这样「已同」只剩 A:456 一个入口,与改写后的不变量逐字一致;只删字的回执走今天的冲突项。
- 测试补一例:回执只删一句、服务器那行另有增字,Apply 遇 409 → 不写,冲突项仍在。

### D2(确认;建议 🅰):合并 flow 没有重算 `inline_structures` 的偏移,行内链接的区间写错

**不变量**:写到服务器的块,其 `inline_structures[*].anchor_range` 要与同一份 flow 里该单元的文字对齐。客户端的常规改字都经 `replaceTextUnitText`(`textFlowService.ts:203–224`,共享树)调用 `remapUnitInlineStructures`;服务器自己改字时也会重算(`notePatchProposals.ts:119–127`,共享树)。

**实情**
- A:461–462 `{ ...currentFlow, units: currentFlow.units.map(… text: merged …) }` 只替换文字,`inline_structures` 原样沿用 currentFlow 的偏移。
- 合并在链接之前(或链接内部)插入字时,链接区间不随着移动。
- 合并只插不删,区间不会越界,所以 `hasInlineLinkRange`(`inlineLinkService.ts:29–33`,共享树)照样认它,链接会挂到错的字上。
- A:2434 的写入用 `merged` 走 `contentForEditedTextFlowBlock(current, merged)`,错位的区间就这样写进服务器。
- 同一次写入里,批注区间(A:2440 `recoveryReplayAnnotationRanges`)和板区间(A:2443 `rebaseBoardTextRanges`)都按 previous/next flow 重算了,只有行内结构漏掉。

**触发**:合并的单元里有行内链接,且回执插入的位置在链接结尾之前。
**后果**:服务器上的链接错位。字不丢,但写进了错的结构数据;下次打开就是错的。

**建议**:用 `replaceTextUnitText` 逐单元构造 merged,带上 `edit: { editedStartOffset: at, editedEndOffset: at, replacementText: inserted }`。其中 `at = placed.caret - inserted.length`:HSC:96 返回的 caret 就是插入点之后。这样链接偏移由现成函数重算。
- 测试补一例:单元 `alpha [beta]`(链接在 beta 上),回执在 alpha 前插字,合并后链接仍落在 `beta` 上。

---

## 六条逐核

### ① D 只在「每个单元都能锚」时比今天多做一步,其余 = 今天的 409 行为

| 支 | D 之前(今天) | D 之后 | 结论 |
|---|---|---|---|
| Apply 成功 | A:2396 返回 true | 同 | ✓ |
| 非 409 的失败(网络、5xx、401 等),或无回执 | 返回 false | A:2398 返回 false | ✓ |
| 409:首次 saveBlock 在 A:2313 标冲突、弹「Failed to save block」 | 冲突项,返回 false | 先多做一次 **GET**(A:2408),不是写;以下各支: | 见下 |
| ↳ GET 失败、块不在、revision 不合法 | — | A:2411 / :2414 返回 false | ✓ 与今天同 |
| ↳ 离开、换路由、换挂载、条目已被 Discard 或 Replay 换键 | — | A:2416 返回 false | ✓ |
| ↳ 合并为 null(结构不同、单元没了、锚不到) | — | A:2420 返回 false | ✓ |
| ↳ **合并为 no-op(只删字)** | 冲突项 | **忘掉条目,返回 true** | ✗,即 D1 |
| ↳ 精确已同 | 冲突项 | 忘掉,返回 true | 裁定内的新增出口 ✓ |
| ↳ 有可写 | 冲突项 | 一次写(A:2434) | 裁定内 ✓;合并内容见 D2 |

另外两点:
- 同一次人的动作里,首次 409 已在 A:2313 弹过「Failed to save block」。D 成功时,人会先看到失败、再看到「Recovered block edit applied」。见 O2。
- D 期间多出的等待:首次 409 之后,冲突标记已经亮了(A:2313),但 Apply 还没返回(在 GET 和读区间)。这期间人若点 Replay 或 Discard,条目会被换键或删掉,A:2416 / :2431 的 stillHere 能接住。我核过这两种时序,不会出现双写。

### ② 全有或全无,在任何 saveBlock 之前判完

- **纯函数**:`mergeRecoveryOntoCurrent`(A:440–463)只读三个参数,外加纯函数 `mergeTypedText`(HSC:68–97)。不读 ref,不写状态。✓
- **遍历全部单元**:A:450 遍历回执里全部非 deleted 单元,遇到一个 null 整条返回 null(A:445 / :448 / :452 / :458)。成功时一次性返回整块。✓
- **判完在写之前**:A:2419–2425 都在 A:2434 之前,A:2427–2430 只是读。✓
- **null 的来源**:A:445(三个参数缺一;块无 text flow 时打开表存的是 null,经 `?? undefined` 进来,也在此)、A:448(结构不同)、A:452(服务器上该单元没了)、A:458(mergeTypedText 返回 null:空单元不作锚 HSC:73 / :88;两侧都找不到 HSC:91;字已在缝里 HSC:95)。
- **第四种「锚不到却不返回 null」**:**有**,即 HSC:80 的 `!inserted`(只删字),见 D1。没找到别的。
  - 回执单元 === 打开时文字 → A:454 continue,用服务器的字。正确。
  - 服务器多出单元 → 按 id 合并,多出的单元保留。正确。
  - 服务器重排单元 → 不检查,merged 沿用服务器的顺序。只动字,可接受。
- 「只动字不动结构」:回执里只改了角色、字段、行内结构的部分都不进 merged(D2 是反方向:服务器自己的结构没随字移动)。另,A:2439 带的是 `receipt.fieldValues`:对 formula 块,这会用回执的字段值写回服务器,与「只动字」略有出入,只在 formula 块上出现。

### ③ A:456 精确相等前判

- A:456 是 `live.text === unit.text`,严格相等,不放宽锚定,不影响 A:457 起的锚定。✓
- 两条出口:「全部已同 → 忘条目」在 A:2422–2425;「部分已同,其余合并 → 一次写」在 A:2434(已同的单元在 A:456 continue,沿用服务器文)。✓
- 但 A:2422 判的是「合并结果 == 服务器文」,不是「每个单元都是 A:456 已同」。两者之差正是 D1。按 D1 的建议修后,两者等价。

### ④ 合并写的槽、base 与第三次写

- 槽:A:2437 `recoveryKey: conflictKey` → saveBlock 的 B 逻辑(A:2077–2087)找到 `appliedReceipt`(conflictKey 那一条,stillHere 刚确认它在),继承它的 mountNonce、generation,sequence 取较大值加一。新条目写进同一个槽(A:2115),替换冲突条目。仍是一项。✓
- 在等待列表里:A:2200 `applying: !!options.recoveryKey` 为真 → P1 的列表(A:698–701)含它,框里的字在写期间被扣住。✓ GET 期间这条是非 pending 的冲突条目,也在列表里。✓
- base:A:2438 `baseRevision: current.text_save_revision`,取自 A:2408 刚读到的块。✓
- 再遇 409:合并那次 saveBlock 在 A:2313 给**它自己的新键**标冲突,然后 A:2452 返回结果。之后没有代码再写;saveBlock 内部没有重试,history 的退避只管打字失败,不碰恢复条目。✓ 没有第三次写。
- 注意:再 409 后,冲突项的**正文是 merged**(服务器在 GET 时的文 + 回执插入的字),不再是原回执。原回执里被丢的删除、角色改动,从此也不在项里了。形状与今天相同,内容不同。见 O3。

### ⑤ (d1) 水化表与 stillHere

- 开表:A:786 键 = `${requestedNoteId}@${routeRequestGenerationRef.current}`,键变才换新表(A:787)。路由代只在 noteId 变化时推进(A:588–593 `advanceRouteRequestGeneration`),所以同篇同代里再次水化不会换表。✓
- 每块首次水化记一次:A:789 已有就跳过,值取自 `hydratedBlocks`(服务器文,不含草稿),只记非 deleted 单元并保持顺序。✓
- 本次访问新建的块不在表里 → 表查不到 → A:445 返回 null → 今天的冲突项。✓
- stillHere(A:2402–2404):挂载在、note 与路由都是 activeNoteId、开表键未变、冲突条目仍在。在**读现块之后**判一次(A:2416),在**读区间之后、写之前**又判一次(A:2431);之后同步调用 saveBlock,saveBlock 在第一个 await 之前写条目。✓
- 小处(O1):`openingKey` 和 `openedTexts` 是在**首次 saveBlock 返回之后**才取的(A:2400–2401),不是点击时取的。若首次保存期间发生 A→B→A,D 会用**新一次打开**的表继续做(新键下 stillHere 自洽)。锚点是新打开时的服务器文,按 (d1) 仍正确;若新打开的水化还没落地,表里没有这块 → null → 冲突项。都安全,只是与「Apply 发起时的打开」不是同一次。

### ⑥ 与 N6a `openedTexts` 同尺度

- 尺度:两张表都只取非 deleted 单元、保持顺序、文字精确比较(A:791–793 与 HSC:169 的 `unitTexts`)。✓
- **可能给出不同的「首见」**:会。
  - HSC 按 `input.noteId` 换表(HSC:167),然后对**每次渲染**的 `input.blocks` 补记首见(HSC:168–170)。在 A→B→A 且 A 的 fetch 还没落地时,`blocks` 仍是上次访问留下的客户端副本(r3d P6 那种),HSC 的首见会取到它。
  - 适配器只在 fetch 落地时用 `hydratedBlocks` 记表,首见是真的服务器文。
  - 两者在「上次访问离开时在途的保存,后来落地了」这类情形下会不同。
- **D 会怎样**:D 只读适配器那张表,锚点按 (d1) 正确。HSC 那张表只影响「框里的字扣不扣」:
  - HSC 若因首见不同而**不扣**,框里的字就会在 D 期间落地 → 本次访问一次保存推进了 revision → D 的合并写 409 → 停在冲突项(④)。不覆盖、不丢。
  - HSC 若**多扣**,只是框里的字晚落。
  - 结论:不同首见不会让 D 写错,最坏是 D 多停一次。

---

## 观察(不是发现)

- **O1**:openingKey 取于首次保存之后,见 ⑤。安全,只作记录。
- **O2**:D 成功的路径上,人先看到「Failed to save block」(首次 409,A:2324 非 quiet),再看到「Recovered block edit applied」。若要收,可以在 Apply 的首次保存上带 `quietFailure`,由 D 的结局决定提示什么。这属于 (e) 收声的范围,不碰 D 的逻辑。
- **O3**:合并写再遇 409 后,冲突项的正文变成 merged,不再是原回执(④)。之后 Replay 整块替换,落下的是「服务器在 GET 时的文 + 回执插入的字」,而不是原回执。字不丢,但项的内容变了;Tester「合并写再 409 → 停、冲突项」那条臂,最好在形状之外加一条正文断言。
- **O4**:D 的五个测试(A.test:1163–1263 的 describe)都不含只删字的回执,也不含行内链接,所以 D1、D2 不会被它们捉到。按两条建议各补一例,都能做成「pre-fix 红」。
