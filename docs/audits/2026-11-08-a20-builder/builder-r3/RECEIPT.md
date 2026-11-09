### A-20 r3 Result(builder 2026-11-08)

> 包:ops `packages/a20-idle-save-r3/`。主 JS `index-nLSUOG48.js`。`src/` 共 15 个文件(清单 `files.list`,与 r2 同一组路径),`src.sha256` 15 行,`dist.sha256` 63 行,另有 `COPY-BACK.md`、`MANUAL-SECTION.md`。基线 `04f6f822`。server 未改,包里没有 dist/server;依赖、锁文件未动。r3 取代 r2 与 r1(两者都未回拷,只拷本包)。
> - `src.sha256` 文件本身的 sha256:`386253c8f020c7a8c5877bf8f5d90810ac6b5fa0df2ce81bd4417d6013f9e970`
> - `dist.sha256` 文件本身的 sha256:`4476a22414c95fb2300755079c5e2ef0e1731db8934e679db8922cc3073c27b1`
> 证据:本目录。`kit/` 是 Tester 套件各段分析(`kit-s5*`,r2 闸全链 + Tester 20:34 版 a20m 全部 BACKIN 变体;`kit-s5c.base` 是对基线 b0c 的 UNDO 对照),`runs/` 是对应 rows.jsonl 与等待期截图,`runs/q5u`、`q5r`、`q2r` 是回执臂(见代码回答 5–6);阳性对照 `positive-controls-r3.txt`;全量 `client-full-r3.txt`、`server-full-r3.txt`。`pre-harvest-scan` ⛔ 0。
> 包在 scratch 副本里建、测、封,没碰共享树代码,没碰 `edfix` / `edacc`。共享树 HEAD `1b9517cd`:15 个文件里 14 个与 `04f6f822` 相同,1 个是新文件;`client/src`、`server/src` 无未提交改动。

#### 验证

- client:`tsc --noEmit` 0;vitest 全量 2744/2744(259 文件),exit 0(`--pool=forks`,maxForks 3)。
- server:源码自 r3 首轮全量后未动,未重跑。那一轮 `test:v2` 有 9 条非 ok:MinerU / Python / PDF 解析 / dist 拷贝几条环境红,加上 `v2CanvasPersistenceCutover`、`v2SourceImprints` 的 worker 反序列化抖动(`Unable to deserialize cloned data`)。`v2SourceImprints` 单独重跑 12/12 通过。本包不含 server 文件。
- Tester 套件(真 Chrome + 本地后端 + 57 ms 代理,主 JS `index-nLSUOG48.js`):**全部闸行绿,total red 0**(s5a–s5pe2 共 16 段)。
  - a20m(Tester 20:34 版判官,探针已按其要求重建,逐字节同 Tester):BACKIN-fail / -recover / -sealed / -refail 各 2/2,-idlefirst / -fast / -neterr 各 5/5,第二次离开均为 **REFUSED**(按 Main_Designer:r3 在 BACKIN 失败后第二次离开的预期形就是 REFUSED);LEFT_UNSAVED 0;kept 0。BACKIN-undo 2/2。对照 ctl = HELD-PROCEED、ctlfail = REFUSED、ctlclean = INSTANT-PROCEED,都与期望一致。LIST-close / -back / -addr 各 2/2。
  - `kit-s5c.base` 里的 4 行红是对照底 b0c **没有** UNDOSEQ、IME 两行(`BASE has no … row`),不是回退;UNDOPAUSE 与底四步全等。
- 回执臂:UNDOREDO ×20(r3)全绿;RELOADHELD ×3 在 r3 与 r2 上行为一致(见代码回答 2)。

#### 阳性对照(`positive-controls-r3.txt`;scratch 工作副本里临时换码,跑完从包还原,`sha256sum -c src.sha256` OK)

- C0 封包的 r3:3 个文件 81/81 绿。
- C1 r2 源码 + r3 测试:13 条红。单元测试里 LIST、CLICKBACK、HANDOVER-one-home、refused-unsent、BFCACHE、BACKIN-undo、BACKIN (A)、BACKIN-fail (B)、BACKIN-fail-sealed、LEFT_UNSAVED-once 都红;守恒闸里 LIST、REFUSE、BFCACHE 三臂红。闸里的 CLICKBACK、BACKIN-fail、BACKIN-undo、HANDOVER 四臂在 r2 上不红,这四条由单元测试兜。
- C2 r3 首版边界(修 b 之前,带 (甲))+ r3c leave 测试:BACKIN (A) 与两条 S3 测试红(3 条)。
- C3 r3b 边界(修 c 之前)+ r3c leave 测试:只有两条 S3 测试红。

#### 代码回答(行号对包 `src/`,目录 `client/src/pages/Notes/canvasEngine/`)

**r3 改动**

- M1 排队的 Enter:封口时记顺序 `hooks/useTextFlowHistory.ts:169`、`:684`;`keepOpenEdit` 按封口顺序重放排队组与开着的组,`:769`。服务器没有的单元记成 `split`(空起点、无角色,永不自动落地);被排队 Enter 切过的单元,以切后文字为起点。
- M2 / (乙) 被扣回的离开:blocker 效应里 `scope.kept` 时清 `kept`、`leftUnsaved`、`released`,并调用 `withdrawKeptEdit`,`hooks/useNoteRouteSaveBoundary.tsx:131-136`。之后走 `flushForLeave`;失败则留在笔记并提示 SAVE_FAILURE,`:145-150`。撤回本体 `withdrawKept` 在 `hooks/useTextFlowHistory.ts:820`;handle 透传 `hooks/useNoteCanvasRuntimeController.ts:893`、`NoteCanvasRuntime.tsx:24`。
- M3 交接即归回执:交给适配器前调 `settleKept(block.id, sent)`,`hooks/useTextFlowHistory.ts:297`。
- M4 bfcache:`pageshow` 且 persisted 时撤回 `pagehide` 留下的记录,`:881-884`。
- M5 发前被拒:没有回执的拒绝,组回到 unsent,handed 回到原值,`:305-309`。
- 修 b:导航进本笔记永远不算离开,`hooks/useNoteRouteSaveBoundary.tsx:217`(`beforeHashChange` 开头)。traverse 分支一律先 `keepAndLeave`,若路由 blocker 随后扣住,由上面 M2 撤回,`:235`。
- 修 c(S3):`keepAndLeave` 的失败回调在笔记仍挂载时只记 `leftUnsaved`,`:202-206`;真正卸载时才说 LEFT_UNSAVED,`:160`;blocker 撤回时清掉,`:133`。

**Main_Designer 五问**

1. 提前返回的判定(`:217`):URL 的 hash 去掉 `#`、去掉 `?` 之后,与 `/notes/${noteId}` 比较。真实 URL 的 pathname、search 不看,hash 里的 query 不看。笔记内锚点如 `#/notes/A#x` 不相等,照旧走后面的分支。
2. reload 的 navigate 事件 `hashChange=false`。修前:非扣留期在 `!navigate.hashChange` 处返回;扣留期则走 TWICE 分支的 `keepAndLeave`。修后在开头就返回,改由 `beforeunload`(`flushForLeave(runtime, true)`)与 history 的 `pagehide` → `keepOpenEdit` 承接。r2 闸里没有覆盖 reload 的臂(PAUSEEXIT-unload / PAGEHIDE 用 CDP 跳 about:blank,不触发 navigate)。补测 RELOADHELD(扣住的 hash 离开 → `location.reload()` → 放行 → 重开):r3 ×3 与 r2 ×3 行行一致。服务器仍为 `["warmup",""]`,字以恢复横幅「A block edit is waiting for recovery … Apply / Dismiss」出现,留字盒空,count 0。行为未变。
3. 同一笔记的 hash 变化:非扣留期 `leaving()` 本来就返回 null(`:187`),行为不变。扣留期:修前 TWICE 分支会扣住它并把 `heldTo` 设成同一笔记;修后提前返回,原目的地不变。
4. UNDOREDO(r3,20 次):20/20 四步都是 `[["warmup","aaabbb"],["warmup",""],["warmup"],[]]`。三次撤销后服务器 `[]`(最后一次撤销撤的是建块);Ctrl+Y ×3 编辑器与服务器逐步回到 `["warmup"]` → `["warmup",""]` → `["warmup","aaabbb"]`。本轮没有红次,所以没有红次的服务器态可报;红次形状仍是此前那行 `[["warmup","aaabbb"],["warmup",""],[],[]]`(第 3 步早到 `[]`)。
5. 数字放在下面「已有发现」。

**S3 两问(Main_Designer 已收)**

- 不需要防御性复位。三个 `keepAndLeave` 入口都要求 `!released`;`released` 回到 false 只有 blocker 的 kept 分支一处(`:134`),它同时清 `leftUnsaved`(`:133`)。bfcache 不碰边界的标志。
- 卸载 ⇔ 路由离开、noteId 变化、token 丢失(→ /login)或页面卸载。核过 4 处:`NoteDetail.tsx:21` 是唯一挂载点(路由 `notes/:noteId`,`App.tsx:111`,无 key);`AppLayout.tsx:239` 的 `<Outlet/>` 无条件;`ProtectedRoute`(`App.tsx:37-41`)只在 token 丢失时卸载;StrictMode 只在 dev。

#### 已有发现(不阻塞 r3,Main_Designer 已同意)

- UNDOPAUSE 间歇红:r2 2/40,r3 7/51,X 2/14。本次套件 2/2 绿,UNDOREDO 前四步 20/20 绿。修前未测,见 Tester 第 10 对。
- 过程中抓到的两处:
  - 旧判官的 BACKIN-fail 分析恒为 ok(读行字段发现;Tester 已修判官)。
  - (甲) 是假绿:单元测试的 mock 把 router 的 idx 放进了 Navigation API 的 `getState()`,真浏览器里那里从来没有它。(甲) 已删,traverse 分支注释写明原因。

#### 已知残余

- CHAIN(同一次渲染前的上一键编辑被渲染期调用方读旧流)不在 A-20,登记 TD-65,见 `docs/audits/2026-11-08-a25-builder/caller-census.md`。
- 一次失败弹两条提示、`route_receipt_stale`(TD-62)、重开时的旧横幅,照旧归 A-25。
