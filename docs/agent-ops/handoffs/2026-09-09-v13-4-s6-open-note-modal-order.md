> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次三单 6;现物证据=单 0 侦察附录⑦(`analysis/2026-09-09-v13-4-s0-recon.md`:运行时可独立挂载,但 overlay portal/window 键盘/body lock 三处全局假设未隔离)
> **单号**: 13.4 单 6 · Open note 弹窗(就地开箱)

# 13.4 单 6 · Open note 弹窗

**使命**:纸板关系第三态落地——缩影卡(远观)→ **Open(板上弹窗,不丢现场)** → Enter(全身跳转)。弹窗内=**真笔记运行时,可读可编辑**(⛔ 只读快照)。

## 零 · HQ 已裁(⛔ 复议)

1. **手势重划**:板上双击 note 卡=**Open 弹窗**(取代现跳转);**Enter(跳转 /notes/:id)**收进 selectionBar(现"Open note"钮改文案"Enter note")+弹窗右上角"Open full page"钮;Escape/X 关弹窗回板;text_range/item 卡双击行为不变;
2. **单实例**:同时最多一个弹窗;弹窗开着时双击另一张 note 卡=先关前者(未存草稿走既有失焦 flush)再开新的;⛔ 多弹窗;
3. **焦点归属(三处全局假设的裁法)**:
   a. **键盘**:弹窗打开期间,板层全部键盘快捷键(Delete/Backspace/箭头/undo 族)**停用**——弹窗内运行时是唯一活跃编辑实例;运行时自身 window 级监听(usePlacementHistory 等)保留即可(板已让位,无冲突源);
   b. **浮层**:运行时 FloatingOverlayLayer 照旧 portal 到 body,z 序保证压在弹窗之上(单实例前提下无歧义);
   c. **body 滚动锁**:modal 层自己接管 body lock(开锁一次/关恢复);若 NoteCanvasRuntime 自身的 body lock 逻辑与之冲突,给运行时加最小宿主开关(如 `hostMode: 'page'|'modal'`,modal 下跳过其 body lock)——**⛔ 大改运行时**,改造面超出"一个开关+监听域让位"的射程就停线举证;
4. **弹窗形态**:大居中 modal(约视口 90% 高/75~85% 宽,留边见板),内滚动;与装卸区的挤压联动布局候单 7,本单⛔;
5. **拖出到装卸区⛔本单**(装卸区未建);弹窗 v1 能力=看+编辑+全屏入口;
6. 编辑保存走既有链零改动;关弹窗回板后板卡内容更新沿既有 GET 复放(⛔ 新推送机制)。

## 一 · 交付面

- BoardPage:弹窗容器+手势重划+板层键盘让位+selectionBar 文案;
- 弹窗内容:NoteCanvasRuntimeProvider 显式 noteId 挂载真运行时(pageReadingSmoke 装配面为可行性参照,生产化);
- 关闭路径:Escape/X/开另一张/Open full page 四条全要干净(草稿 flush+body lock 恢复+监听解绑)。

## 二 · 裁量与停线

- 停线举证不改判;运行时隔离改造超射程(见零.3c)→停线;
- ⛔ 动笔记页(/notes/:id)自身行为;⛔ 动 text_range/item 卡双击;⛔ 新 event verb。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Boards+canvasEngine 相关)不破;
- 冒烟六条:①双击 note 卡→弹窗开,真笔记内容可见;②弹窗内编辑文字并保存→关弹窗→进笔记页(Enter)验证已存;③弹窗打开时按 Delete/箭头→板成员毫发无损(键盘已让位);④"Open full page"跳转 /notes/:id 同笔记;⑤Escape 关弹窗回板,板上该笔记缩影卡显新内容(重开板 GET 复放);⑥弹窗内编辑 text_range 引用的源段→回板该引卡跟变(跨面链顺路验证)。

## 四 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(凭据扫描留 HQ)。

## Result

> **执行者**: codex(builder) · **日期**: 2026-09-09
> **结果**: **停线，未完成施工**。按 §零.3c / §二举证；六条已裁事项未改判。上方派单 header 保留原样，本 Result 不表示 done 或放行。

### 停线事项：关闭宿主缺少可等待的既有 flush

完成工单、开工上下文及侦察附录⑦核读后，确认 body lock 可用一个 `hostMode` 开关解决，body portal 也可通过 modal 层序避让；阻塞发生在四条关闭路径要求的草稿 flush 与保存后 GET 复放交界。

- `client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx:1152`：文本失焦会调用并 await `onSave`，但这个 Promise 没有返回给触发 `activeElement.blur()` 的外部宿主。
- `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts:516`：只向宿主返回 `layerProps / loading / note`，没有可等待的关闭或统一 flush 接口。
- `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:1557`：先 await 正文 PUT，再在 `:1561` await board text_range 保存。宿主若失焦后立即卸载、GET 或导航，读取可以先于任一写入完成；卸载后的旧请求仍可完成（`:1566` 进入 stale receipt 处理），**这不是“卸载必丢正文”的结论**。
- `client/src/pages/Notes/canvasEngine/layers/DraftBlockEditorLayer.tsx:83`：草稿失焦在 `slashTargetActive` 时直接返回，不能把 blur 等同于所有草稿均已 flush。普通有效输入已有自动持久化，亦不能据此断言所有新草稿丢失。
- 只在外层截取 `onSaveBlock / onPersistDraft` 的 Promise，不能覆盖 controller 内部发起的保存和其它编辑路径。补完整宿主关闭/保存收尾接口及相应接线，已经超出“一个开关＋监听域让位”；因此未开始产品码修改。没有用固定延时、轮询 GET 或新推送机制替代该接口，也没有更改笔记页行为。

### 停线实验证据（不是六冒烟验收）

实跑既有合成数据测试 `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx:1035`：`keeps a remounted save recoverable when the old mount settles before the new save rejects`。

测试持有旧实例 PUT → `:1078` 卸载旧实例 → 新实例 GET → 放行旧 PUT → `:1120` 仍断言新实例正文为 `server old`。**结果：1 passed / 39 skipped，exit 0**。这是对现有卸载/重挂与异步保存交错的验证，不是对尚未实现 modal 的浏览器验证；text_range 第二写窗口另由上述源码链举证。

执行命令：先在仓内 `.codex-tmp/v13-4-s6-validation/` 新建空目录并将 `COINCIDES_VALIDATION_ENV_DIR` 设为其绝对路径，再运行：

```text
npm.cmd --prefix client run test:unit -- src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx -t "keeps a remounted save recoverable when the old mount settles before the new save rejects"
```

Vite/Vitest 的既有 `envDir` 接缝指向该空目录；测试 mock API，只使用合成内存数据及 jsdom sessionStorage，无服务端或用户数据库。首次调用 `npm` 被 PowerShell 的脚本执行策略拦住，改用 `npm.cmd` 后得到上述结果，未修改执行策略。

### 六冒烟逐条

| # | 工单要求 | 本次结果 |
|---|---|---|
| ① | 双击 note 卡打开 modal，真笔记内容可见 | **未执行**；产品施工前触发停线。 |
| ② | 弹窗编辑保存，关闭后 Enter 验证已存 | **未执行**；上述旧实例测试不替代该冒烟。 |
| ③ | 弹窗中 Delete / 箭头不伤板成员 | **未执行**；板键盘让位尚未施工。 |
| ④ | Open full page 到同一 `/notes/:id` | **未执行**；入口尚未施工。 |
| ⑤ | Escape 回板，GET 复放后 note 缩影显示新内容 | **未执行**；保存与首次重读的交界为停线事项。 |
| ⑥ | 编辑被 text_range 引用的源段，回板引卡跟变 | **未执行**；正文后第二写的完成尚无宿主等待接口。 |

### numstat 与未做

- 本次 tracked diff 的 `git diff --numstat`：**48 / 0**，文件为 `docs/agent-ops/handoffs/2026-09-09-v13-4-s6-open-note-modal-order.md`；仅本工单追加 Result，产品源码 **0 / 0**。`git diff --check` 通过。开工既有未跟踪文件未读未改；另建上述两个空的临时验证目录（首次命令失败所建一个，重跑所建一个），未入 tracked diff。
- 未做 modal、手势重划、宿主开关、板键盘让位及刷新接线；未建设装卸区、拖出能力、多实例、新 event verb 或推送机制。
- 停线发生在产品码修改前，未跑 typecheck、build、Boards + canvasEngine 全部定向回归及浏览器六冒烟；只跑上述 1 条停线取证测试。
- 未跑原样 `npm run verify:v2-bn8-runtime`：`package.json:41` 的尾项调用 `check:changed-file-secrets`（`:35` 为凭据扫描），与本单禁安全类测试直接冲突；本单未修改门禁、未宣称该总门通过，凭据扫描仍留 HQ。
- 未 git commit / push / PR / merge；未读任何 `.env`，未输出或传出 key，未接触用户数据库，未启动后端，未设计或执行安全类测试。工作树交 HQ；后续由 HQ 处理已举证的范围边界，本回执不自行扩大授权。

## 补遗一(HQ 裁定,2026-09-09:停线成立,批准扩射程,续工令)

1. **停线举证采纳**:关闭宿主确需可等待收尾;§零.3c 的射程约束就地放宽如下,⛔ 其余六裁不变;
2. **批准新机制:adapter 层在途写注册表 + `whenIdle()`**——在 `useNoteCanvasDataAdapter` 的写请求汇流处(正文 PUT/board text_range PUT/草稿持久化/placement 写等一切变更请求)登记 in-flight 计数,暴露可等待的 `whenIdle(): Promise<void>`;经 runtime controller 返回面透出给宿主(如 `flushPendingSaves`)。⛔ 只在外层截 onSaveBlock Promise(builder 已证覆盖不全);⛔ 固定延时/轮询 GET/新推送机制;
3. **关闭四路径协议**(Escape/X/开另一张/Open full page):①先走既有 Escape 级联收掉 slash 菜单与浮层;②blur 活跃编辑器;③await whenIdle(期间弹窗显既有 pending/Saving 指示);④成功→卸载(回板路径随后 GET 复放天然读到新正文);**失败→关闭中止**,留在弹窗内显既有保存错误面,并出现"Close anyway"显式出口(用户知情弃单才放行);空草稿按既有语义丢弃不算失败;
4. **附带认可**:builder 实证的"卸载后旧实例保存竞态"是现有笔记页也存在的一般性风险,whenIdle 机制是通用资产——但本单⛔顺手改笔记页关闭行为(记入 Result 未做即可,归 13.5-13.6 候裁);
5. **续工:按原单+本补遗全做**,typecheck/build+六冒烟+定向回归,新 Result 追加于本补遗之后(完工判据认新 Result+产品码 numstat,⛔ 认上方停线回执)。

## Result

> **执行者**: codex(builder) · **日期**: 2026-09-09
> **结果**: **部分施工已落地，新的运行时隔离边界触发停线；单 6 未完成，不申报 done / 放行。**
> **需要**: HQ 裁定下述 adapter 外操作与直接导航的宿主边界。原六裁及补遗一未改判；未自行删除这些入口、改造这些子系统或改笔记页关闭行为。

### 已实施的范围

- `BoardPage` note 卡双击改为 Open modal；selectionBar 改为 Enter note，保留全页入口；item / text_range 双击原路径不变。单一 noteId、按 noteId keyed 实例；切换请求复用前一实例的关闭 Promise，成功后再挂新实例。
- `BoardNoteModal` 挂载真实 `NoteCanvasRuntimeProvider` + `NoteCanvasRuntime`，82vw / 90dvh 居中、内滚动、边缘留板；body portal 层序高于 modal。modal 自行保存/恢复 body overflow；provider 的 `hostMode='modal'` 令 runtime 跳过自己的 body lock，默认 page 分支保留。
- 板的键盘、普通操作按钮、指针、wheel、粘贴让位；保留边缘另一张 note 双击切换。已在 await clipboard Blob 返回后再次检查宿主/visit，避免旧粘贴续段在 modal 中写板。modal 另拦外部 DOM 点击导航；**它不等于拦住运行时内部的程序式 navigate，见停线事项**。
- X / Escape / 切换另一 note / Open full page 共用关闭入口：复用 slash 的 Escape 退出策略与浮层 Escape 清理 → React 同步提交收起 → 等既有 slash 焦点恢复微任务 → blur → `flushPendingSaves()` → 成功卸载；已登记写失败则保留实例、原错误面和 Close anyway，且保留原关闭目的地。等待时显示 Saving。这里没有固定保存延时或轮询。
- adapter 新增 `inFlightWriteRegistry`：24 个复合作用域、35 个请求/仓库汇流登记点，包含正文后 board range 第二写、草稿创建与 placement、排队 annotation 与修复写。提供 `whenIdle()`；失败按写目标保留，成功同目标重试解除。`trackPendingWrite` 也已导出，**尚未接到 adapter 外子系统**。不改原保存返回值、toast 或回滚语义。
- controller 的 `flushPendingSaves` 先等 draft controller 既有 `persistPromiseRef` 暴露的 `whenDraftIdle()`，再等 adapter `whenIdle()`，覆盖 create 收据后才调度 saveLatest 的续段。另已把 CanvasObject 的异步写上下文解析纳入同一 track；6/6 处相关解析调用均在登记范围中，前置解析失败也阻止关闭。
- 成功回板后复用 board / candidates GET；发现旧 note 缩影只读 note.description，正文 PUT 不会改它，因此新增既有 `GET /notes/:id/blocks` 的定向重读，用既有 `textFromContent` 生成该卡展示摘要。本地摘要仅为当前板 visit 的呈现缓存，未反写 description、未建推送或持久化副本；未声称板重新卸载/挂载后所有 note 摘要均已改造。

### 新停线事项：真实运行时不是所有写都汇流 adapter，且有额外直接导航

当前 `useNoteCanvasRuntimeController.ts:525` 只等待 draft 工作流与 adapter 注册表。以下均是当前可见入口，不是未挂载旧代码：

| 入口 | 代码证据（本次工作树行号） | 未闭合后果 |
|---|---|---|
| Groups → Open Group Gallery / 编辑器，以及 Item / Relation workbench | `client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.tsx:784` / `:794` 直接 navigate；`:857` 可见 Gallery 按钮；`:472` / `:488` / `:510` / `:614` / `:641` / `:656` / `:670` / `:698` 有直接 Item/Relation 写；`:1100` 挂 workbench | 内部导航可绕过关闭协议；面板直接写也不在 adapter 注册表中。 |
| Tray 操作及链接 | `client/src/pages/Notes/canvasEngine/hooks/useTrayController.ts:65` 的 run；`:77` placement 保存及后续 split / relocate / undo；`layers/NoteTraySidebar.tsx:67` / `:73` / `:79` 直接 Link | Tray 在途任务、错误与导航需额外收尾接线；当前 whenIdle 不能覆盖。 |
| 图片插入 | `client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx:1556` 起先 await 图片尺寸，再在 `:1558` 调 uploadCanvasImageAsset，之后才调用 onPersistCanvasObject | 上传前半未进入 adapter；关闭可先完成，后续仍可能创建对象。 |
| More → Delete note → Move to Trash | `layers/NoteChromeLayer.tsx:199` 调 onTrashNote；`hooks/useNoteTrashAction.ts:23` 直接 DELETE、`:26` 直接 navigate | 不经过宿主收尾即导航离开。未擅自隐藏入口或改笔记页删除/关闭语义。 |
| 加载失败 | `hooks/useNoteCanvasDataAdapter.ts:662` catch 直接 navigate('/projects') | modal 加载错误仍可能带离板现场。 |

补齐上述链会涉及 Tray、Groups/Item/Relation 面板、图片异步生命周期和导航策略；这超出原 §零.3c 的一个宿主开关/监听让位，以及补遗一明确扩出的 adapter 注册表。**不能把“已登记的写全部完成”改判为“真运行时全部任务已收尾”，也不能自行把原运行时入口裁掉来获得窄绿。** 据此停线交 HQ。

### 浏览器停线实证（合成数据，无用户库）

通过会话 Chrome 控制工具，在本次新增 `client/scripts/boardOpenNoteSmoke/` 独立页面实跑：

1. 在板上配置 Hold next body write，双击源 note，正文末尾输入 ` Pending bypass probe.`。
2. 点击 Groups 触发正文失焦保存；该笔 `PUT /note-blocks/open-smoke-block-a` 被内存 transport 持有。
3. 点击可见 Open Group Gallery。生产面板 callback 直接 navigate 到 `/group-gallery?...`；fixture 未装 Gallery 路由，随后由其 fallback 回到板。
4. **modal 已卸载，诊断仍为 `heldWrite: "body"`，存储正文仍没有 probe。** 保存序号 82 尚未完成，板已重读。随后点击 Reject held write 收束合成请求，序号 82 变为 rejected，宿主没有重新出现。

这直接证明当前产品接线可绕过等待，不是仅凭六冒烟范围外代码猜测。其余上述旁路为源码证据，未冒充逐项浏览器复现。标签页已关闭，独立 fixture 服务已停止。

### 六冒烟逐条

以下为**合成 transport + 真 BoardPage / 真笔记运行时**浏览器结果，不能外推为真实后端、用户库或全运行时隔离验收。全页目的地沿现有 pageReadingSmoke 的 controller/chrome/document 装配，不冒称验证了完整生产 AppLayout/NoteDetail 导航系统。

| # | 实跑结果 |
|---|---|
| ① | **PASS**：双击 Synthetic source note，路由仍在板；大居中 modal 内出现可编辑真正文，截图确认尺寸与留边。 |
| ② | **PASS**：追加 ` Modal save verified.`，X 关闭后板卡显新正文；Enter note 到 `/notes/open-smoke-note-a`，全页运行时重读保留修改。 |
| ③ | **PASS**：modal 获焦时实按 Delete、右/下箭头、Ctrl+Z；三张成员卡的 x/y/w/h/scale 与初值一致，诊断 `boardWrites: []`。其余板键盘/粘贴守卫另有定向单测；未把未实按组合列为浏览器实跑。 |
| ④ | **PASS**：打开 Synthetic second note，Open full page 到 `/notes/open-smoke-note-b`，显示同一笔记正文，modal 消失。 |
| ⑤ | **PASS**：在源段修改后按 Escape；回板 note 缩影显示 `Preface. The selected passage remains editable. Closing words.`。诊断显示正文 PUT 62、range PUT 63 均 committed 后，才开始正文预览 GET 66 与 board GET 67。 |
| ⑥ | **PASS**：有效 Live 引用起点下，将 `stays alive` 替换为 `remains editable`；Escape 后引用卡仍为 Live，excerpt 为 `The selected passage remains editable.`，end_offset 由 42 变为 47。生产 rebase 生成更新，fixture 只保存/复放结果。 |

fixture 初稿曾有 import alias 和引用 end_offset 算错，均在本次自测中修复；⑥已 Reset sample 后以 Live 起点重跑。它们不是产品修复或待修条目。单实例、四路径 deferred/失败/Close anyway、body overflow/focus 恢复及 transient UI 顺序另由下述单测覆盖，未冒称额外浏览器验收。

### 验证命令与结果

Vite/Vitest 命令的 `COINCIDES_VALIDATION_ENV_DIR` 显式指向仓内新建空目录；fixture 用 `configFile:false, envFile:false` 并替换 API transport，未启动业务后端。

| 验证 | 结果 |
|---|---|
| `npm.cmd --prefix client run build` | **PASS**：含 `tsc -b` 与 Vite production build；最终构建成功，保留大于 500kB 的 bundle 提示，未顺手做拆包。日志 `.codex-tmp/v13-4-s6-build.log`。 |
| `client/node_modules/.bin/tsc.cmd -p server/tsconfig.json --noEmit` | **PASS**；无服务端产品改动，不启动服务或数据库。 |
| `client/node_modules/.bin/tsc.cmd --noEmit -p client/scripts/boardOpenNoteSmoke/tsconfig.json` | **PASS**；fixture 专用类型检查。 |
| `npm.cmd --prefix client run test:unit -- src/pages/Boards src/pages/Notes/canvasEngine --maxWorkers=1 --no-file-parallelism` | **PASS：62 files / 548 tests**，最终源代码回归；日志 `.codex-tmp/v13-4-s6-regression.log`。含 modal 12 条、BoardPage host 6 条、adapter 43 条、registry 5 条。 |
| `npm.cmd --prefix client run check:canvas-runtime-boundary` | **PASS：159 checks**；日志 `.codex-tmp/v13-4-s6-boundary.log`。 |
| `npm.cmd --prefix client run smoke:canvas-engine-model-contract` | **PASS：60 groups**。 |
| `npm.cmd --prefix client run smoke:canvas-engine-performance` | **PASS：5 scenarios**。 |
| `git diff --check` | **PASS**；git 的 CRLF 提示不是内容错误。 |

首次 adapter 定向测试用默认多 worker 遇 Node 原生证书初始化断言，改为单 worker 后通过；没有读证书、扫描凭据、改安全设置或追加安全测试。browser-harness 因 Chrome DevToolsActivePort 读取权限无法连接，改用会话浏览器控制工具完成上述 UI 验证，未改权限。

**未原样执行 `npm run verify:v2-bn8-runtime`**：该聚合门仍包含 `check:changed-file-secrets`，与本次明确禁安全类测试/凭据扫描冲突。未修改门禁，未宣称总门通过；凭据扫描及其它未列门项留 HQ，以上只申报实际执行项目。

### numstat

使用默认 `git diff --numstat`，并将本次新增但未暂存文件按 0 → 当前 UTF-8 文件逐行计入；**没有 git add / commit**。开工已存在的未跟踪文件不计入本次。

| 分类 | 文件数 | 新增 | 删除 |
|---|---:|---:|---:|
| 产品源码（含新 modal/CSS/registry） | 12 | **580** | **127** |
| 单测 | 6 | **595** | **3** |
| 独立浏览器 fixture 与说明 | 6 | **346** | **0** |
| 合计，不含本回执 | 24 | **1521** | **130** |

产品逐文件（新增/删除）：BoardPage.tsx **74/5**；boardRepository.ts **8/1**；BoardNoteModal.tsx **162/0**；BoardNoteModal.module.css **60/0**；NoteCanvasRuntime.tsx **19/7**；NoteCanvasRuntimeProvider.tsx **4/1**；useDraftBlockController.ts **1/0**；useNoteCanvasDataAdapter.ts **141/113**；useNoteCanvasRuntimeController.ts **18/0**；useRuntimeNaturalWritingController.ts **4/0**；useSlashCommandController.ts **1/0**；inFlightWriteRegistry.ts **88/0**。明细另存 `.codex-tmp/v13-4-s6-numstat.json`，仅工程文件行数。

### 未做与交接边界

- 上述 adapter 外任务与直接导航尚未隔离；这是当前单 6 不能完工的阻塞，不以六冒烟通过抵消。
- 未改变笔记页自身关闭行为；补遗认可的旧实例保存竞态仍留 13.5–13.6 候裁。
- 未建装卸区、拖出能力、多弹窗、新产品 event verb、推送、固定保存延时或轮询 GET。
- 未动服务端产品码、用户数据库、已有未跟踪用户文件或 agent 权限/操作指令；未读取任何 `.env`，未输出/传出 key；未 git commit / push / PR / merge，未运行安全类测试。
- 工作树保留可复核的部分实现、测试与 fixture。**本 Result 是新停线回执，不是完成或放行依据。**

## 补遗二(HQ 裁定,2026-09-09:停线采纳,v1 弹窗定性=专注编辑面,续工令)

1. **产品裁定(非窄绿)**:v1 Open 弹窗=**专注编辑面**——"Open=就地开箱看货改货,Enter=全身进屋用全套设施"是本单隐喻本义。据此 `hostMode='modal'` 下**禁用跨页导航入口**:ContentGroupPanel 的 Open Group Gallery/编辑器/workbench 导航钮、Tray 侧栏 Link、More 菜单内导航与 Delete note 项;禁用带 title 提示("Open full page to use this");
2. **加载失败⛔带离板现场**:modal 内加载错误就地显示+关闭回板,⛔ navigate('/projects')(仅 modal 分支,笔记页 catch 原样);
3. **modal 内仍可达的 adapter 外写路径接 `trackPendingWrite`**(已导出,机械接线):ContentGroupPanel 直接 Item/Relation 写、Tray 移入/placement 等——凡弹窗内可达的写,进注册表;某路径接线面大→禁用该入口并在 Result 申报,⛔ 硬啃;
4. 图片插入链若在 page 模式本不可达(CANVAS_MODE_RETIRED 门),Result 记一笔即可;可达则按 3 处理;
5. 笔记页(/notes/:id)行为照旧⛔动;
6. **续工验证**:typecheck/build+定向回归;冒烟③⑤复验+**新增冒烟⑦**:用你自己的 boardOpenNoteSmoke 旁路复现器验证——压住 body 写后,弹窗内已无任何可导航出口能造成"卸载而写在途"(bypass 闭合的直接证据);新 Result 追加于本补遗后。
