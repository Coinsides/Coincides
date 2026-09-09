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
