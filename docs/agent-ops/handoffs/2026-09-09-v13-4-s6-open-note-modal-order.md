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
