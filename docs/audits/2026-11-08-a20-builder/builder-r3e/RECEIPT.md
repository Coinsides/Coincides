# A-20 r3e 回执(builder,2026-11-09)

> 包:`<home>/.claude/ops/packages/a20-idle-save-r3e`(已封,封后不动)。底 = r3d 包。行号对包内 `src/` 快照。

## 封包数

| 项 | 值 |
|---|---|
| 主 JS | `index-Dkbj0u5K.js`,sha256 `5cd1a787773dbbf853321f8f3ec078b38cd9df1c62cd6eb1cbe93eac9fd18055`(= Tester 冻结的 `dist-r3e-preseal`) |
| `src.sha256` 自身 | `4bdd46b18273805623f584af5a5cdd929faadacce23430be9fa1abe88b822887`(17 行) |
| `dist.sha256` 自身 | `0fccf6cfa7635e01e46e5debb9b0c6291f4cd9f7d72e09a7a09fe509f4926ff3`(63 行) |
| 文件数 | src 17(对 r3d 包变 7:4 源 + 3 测试;其余 10 字节同 r3d),dist 63 |
| 基线 / 共享树 | `04f6f822`;共享树 HEAD `0b837c08`,其间无提交触及 client/src、server/src、shared;17 文件中 16 个 = 04f6f822,1 个新增(leave 测试) |
| 服务端 | 不动 |

## 验证

- `tsc --noEmit`:0(`tsc-r3e.txt`)。
- client 全量:259 文件、2763/2763 过;exit 1 只因 1 个 unhandled error = 已知 teardown 竞态(`structureTypingBuffer.ts:316` `document is not defined`,来自 `useHeadingStructureController.test.tsx`;r3d2、r3d3 全量里同样出现;Main_Designer 已裁不修)。该文件单跑 3 次 68/68 干净。(`client-full-r3e.txt`)
- vite build:0。
- kit 16 段(s10*)全 0 红;`s10c.base` 4 红为已知基线。(`kit/`)
- 阳性对照 7/7:r3d 上全红,r3e 上全绿(`positive-controls-r3e.txt`)。
- Tester 预封(`runs/r3eps-n`,13 行 0 红):applyslow 两形各 ×2 终态 `['warmup bbb','aaa']`、无 409;MENTER ×2 两条都不落;`#/Notes/<id>`(脚本 / 地址栏)与 `#/NOTES/<id>/` 各 ×2 都不算离开;putback ×1 读数同 r3d 与 pre。

## 代码回答

### ① `applying` 盖 Apply 与 Replay 两处

- 标记:`useNoteCanvasDataAdapter.ts:2116` `applying: !!options.recoveryKey`,在登记进行中保存时写入(`:2111–2117`)。
- 传 `recoveryKey` 的 saveBlock 调用只有两处:Apply `:2294–2303`(`recoveryKey: receipt.recoveryKey` `:2299`,`baseRevision: receipt.baseRevision`)与 Replay `:2366–2370`(`recoveryKey` 简写 `:2368`,`baseRevision: block.text_save_revision`)。全 `client/src` 非测试代码里再无别的调用方传它(`draftBlockPersistence.ts:200` 是读回执字段,`:2007` 是建新回执的 key)。所以普通打字 / 收口 / 落字保存一律 `applying: false`。
- 名单:`:645–648`。`recoveryReceiptsKeptWordsWaitFor` = 未挂起的回执 ∪ 挂起中且属 applying 操作的回执。队列(提供 Apply 的横幅)仍读 `blockEditRecoveryReceipts`(`:643–644`,不变)。
- 接线:`useNoteCanvasRuntimeController.ts:141` 解构,`:417–419` 喂给 HSC 的 `recoveryReceipts`(仍滤掉本次访问自己的回执);队列 `:614` 仍是 `offeredRecoveryReceipts`(`:407`),界面列表不变。
- 交接无缝:Apply 写的新回执替掉被提供的那张(同块一张)。在下一次渲染前 HSC 看到的仍是旧那张,内容相同,所以等待不断档。Apply 200 → 回执被忘(`:2162–2163` / `:2213–2214`),下一次重试落字;Apply 409 → 回执留作冲突项,字继续等。

### ② P2 条件与三张账的交集

- 条件:`useTextFlowHistory.ts:798` `if (split && was === undefined) joined.add(key);`,`was` 取自该组 `before` 的活单元(`:787–789`)。即「这一组新建的单元」。
- 三张账:split 账 `cutText`(`:796`,`split && was !== undefined`,与 P2 互斥,同一组里一个单元不可能同时有、无 `was`);N1 账 `joined`(`:794`,removes 组改过的单元);M1 账 = `sealedOrder` 排序的队列(`:779`)。`joined` 是跨组并集,所以 M1 的先后不改变结论。
- 同一单元既被创建又被移除(Enter 生出 tu-n,后一组 Backspace 又并掉它):创建那组已把它记进 `joined` 和 `ends`;移除那组的 `after` 里没有它,不再迭代,`ends` 留着创建时的文本。末尾循环(`:808`)走 kept-as-split 分支,`initialText: ''`,不落。这与 r3d 在 id 是全新时的结果一样(r3d 走 `server && !onServer`);P2 只改变「服务器恰好有同 id(被并掉的那行)」这一种。残余:被并入的那行也在 `joined`,所以盒里可能两条都含这些字(一条旧 tu-n 片段、一条并后整行)。此行为 r3/N1 起就有,P2 未增未减;创建后立刻被并、文本为空的则 `if (!end.text) continue` 不记。
- 撤销 / 重做后的 id:撤销重做重放原快照(组的 `before` / `after` 原样),不生成新组的新 id。重做创建组时 `before` 里仍没有该单元,所以 `was === undefined`,仍记进 `joined`;撤销掉创建时,该单元不在 `after`,不迭代。id 就是原来那个,不会因撤销重做被重新分配。
- (甲)与范围 / 批注锚定 → TD-70 阶段二,本包未动契约。

### ③ P3 参数边

- `useNoteRouteSaveBoundary.tsx:28–31`:`/notes/` 段不分大小写(路由 `notes/:noteId` 无 caseSensitive),id 按原样比较(路由参数原样交出)。
- `#/notes/NOTE-A` 而当前是 `note-a`:路由去的是另一张笔记,谓词判为离开 → 拦下先存,方向安全。
- `#/notes/`(空参数)→ 路径 `/notes`,不匹配 → 离开,先存。
- 登录 / 注册同理(`:32–34`,`/login`、`/register` 不分大小写),用在 `:223` 与 TWICE 检查 `:257`。离开判断 `:221–222`、早退 `:248–252`。

### P4

- `:17–26`:先去 query 和第二个 `#`,再逐段 `decodeURIComponent`,段内的 `/` 回写成 `%2F`(同 router `decodePath`),去尾斜杠。`#/notes%2Fnote-a` 是一段,不是本笔记;`#/notes/note-a%2F` 是笔记 `note-a/`,不是本笔记。两者都算离开,先存。解码抛错时原样保留,与路由一致。

## 前两条答(给 Main_Designer)

1. **r3e P1 窄修在慢 Apply 两形下的路**:Apply 在途期间它的回执留在 HSC 等候名单上,与本次开笔记时服务器文本不同,所以每次重试都等,不落字、不存。请求在到服务器前被扣(req 形):放行 → 200 → 草稿取恢复文本、回执被忘 → 下次重试落 bbb。到了服务器但回复晚(resp 形):一直等到回复 → 同上。两形终态都是 `['warmup bbb','aaa']`。Apply 409 → 冲突项留着,字继续等。读数要在 Apply 200 后 ≥12 s(重试间隔最长 10 s)。Tester 实测:bbb 在回复后约 1.3–1.4 s 落。
2. **Apply 在途时还有谁会存同一块**:自动的只有 HSC 落字,即 r3e 堵住的那条。其余都是人在那块上的动作(打字、撤销重做、标题变更、斜杠命令、接受 agent 建议、移动块)→ 已归 A-25 ②a (iv)。重复点 Apply 不可能(在途时条目被隐藏);新建块存的是另一块,不算。

## Tester 读数说明 / 已知残余

- **putback 更正**:r3d 回执和我给 Tester 的短讯里把 putback 写成「409 冲突项」,不对。Tester 追踪:放回那次保存把回执存储重写为只剩自己的回执,aaa 的条目在能点 Apply 前就消失,aaa 丢失;pre 一样。已裁 A-25 ②a (iv)。
- **MANUAL-SECTION 的 Replay 句**(r3d 沿用):末句「This can happen if you put words back from the kept-words box and then press Apply on the same block.」按上条读数,放回之后 Apply 已点不到,此触发说法不准。本包按令只加横幅句,未改此句;改不改、怎么改候 Main_Designer。
- **MENTER-close 横幅从「仅通知」变成提供 Apply**:Tester 读到 r3e 的条目 "A block edit is waiting for recovery abx cd" 带 Apply(= 在途保存的冗余回执,同 pre),r3d 是无 Apply 的通知行。原因判断:r3d 上 Z 被当作 tu-2 落在 "cd" 上(P2 的错),那次落字保存驱逐了在途保存的回执,于是只剩通知;r3e 不再落 Z,回执留着、照常提供。与 A-25 (iii) 的发现一致(「仅通知」来自驱逐)。按此条 Apply 应是 409 或等同服务器内容,不丢字;未单独实测。
- teardown 竞态:见「验证」,不修。

## 证据

`tsc-r3e.txt`、`client-full-r3e.txt`、`exits.txt`、`positive-controls-r3e.txt`、`kit/kit-s10*.analysis.txt`。
