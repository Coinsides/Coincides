> **状态 (Status)**: active（2026-11-07 首版由「个人学习讨论」会话起草，Main_Designer 核过接管）
> **层 (Layer)**: 现状 / Current-State（跨角色看板）
> **日期 (Updated)**: 2026-11-07
> **权威 (Authoritative)**: 是（只对「此刻在哪、谁持有、下一步」这一层；细节以每行指向的文件为准）
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# 看板：岛上是什么、在办什么、等谁

> **这张看板是四个角色共同的事实来源。** Main_Designer、Tester、builder、Reviewer 都从这里读同一组事实，不各自另记一份。
> **谁写**：前三块（白话、岛上、等 Henry 拍板）只有 Main_Designer 手写；「在办的单」现在暂由 Main_Designer 手抄，门禁脚本上线后由脚本从各单单卡生成。
> **每一行都指向证据**：看板只放结论和指针，细节在被指的文件里。
> 设计依据：`docs/agent-ops/analysis/2026-11-07-role-records-design.md`。

## 给 Henry 的白话

- **岛上现在**：第二十轮。笔记里「文字 / 原件页面」的切换键回到了顺手的位置；Word 里的公式导入后，要么原样保留（上下标、粗体都在），要么明确告诉你「这个没法转」，不会再悄悄写错。
- **你会碰到**：以前导入的 Word 文件要在 Source Library 行尾点一次 Rebuild 才能用上新的公式导入（代价见说明书：笔记编号变、批注不迁移、标签/链接/外观丢、页图不重渲）；原样重传同一文件拿不到新结果。写字修复还没上：Tester 上一轮挖出的几处（保存卡住十几秒后标题正文分不开；留下来的字框来回切换后出现两个；第二行里补打的字整页刷新时丢；字刚落地、保存还没回来就关页会丢）builder 都修了、第二版包在 Tester 复测中；复测又发现留下来的字框在页面滚动或顶部横幅出现后不跟着走、会盖住上一行，builder 已补；复测又量出留下的字框会让别处的打字每秒多发一次保存、撤销被切碎，也修了（r2.2）；最后一版（r2.3）已交 Tester 复测：标题建块失败后的字照旧自动回原位，留下的字框不盖字、两个框不叠。复测过了才上岛。在那之前：新笔记第一段写完等几秒再回车；`# ` 后等它变成标题再接着打；新笔记第一行别直接用输入法打。Group Gallery 在几百篇以上的账号会加载失败（TD-53），你 3 篇笔记碰不到。
- **你要做的**：没有急事。要你拍板的事都列在下面「等 Henry 拍板」。

## 岛上

```text
版本: 412565b6 · 部署于 2026-11-07 03:00Z（第二十轮：F3b + V2）
Tester 部署后核对: 已核（F3b 见 docs/audits/2026-11-05-toggle-formula-builder/review-tester.md 第十三节；V2 见 docs/audits/2026-11-06-v2-builder/review-tester.md「部署后岛上复走」，证据在同目录 tester/island-postdeploy/。依据：records/tester/verdicts.md，Tester 2026-11-07 已核）
锁: 见私有 ops 目录里的锁记录（不进仓库）
服务器细节: 见私有 ops 目录里的服务器手册（不进仓库）
```

## 等 Henry 拍板

- **purpose 设计**（停导入自动卡、手建目的、goal 合并、平目的+标签）· 你说「先不动、用着看」，等你说「拍」或「写」→ `design/loose-ideas-ledger.md` L-002…L-009

## 在办的单（门禁脚本上线前由 Main_Designer 手抄）

阶段只用：`排队 | 施工 | 待验 | 返修 | 待裁 | 待收割 | 待部署 | 已上岛 | 已核 | 关闭`。持有者只用：`Main_Designer | Tester | builder | Henry`。

<!-- board:items:start -->
| 单号 | 项 | 阶段 | 持有者 | 下一步 | 现行正本 | 更新 |
|---|---|---|---|---|---|---|
| a19-a20-image-pages-and-idle-save | 编辑器组返修（A-18 残留、A-21、A-24） | 待验 | Tester(1) | **r2.3c 已交**(主 JS `index-BVrO4Ql1.js`;改控制器 + 测试,框只差两个 title/aria 字符串):后台落地按笔记串行队列、一条一任务在 effect 外(TWO2 覆盖写机理 = effect 内 flushSync 不提交,下一条读旧流整块写回;旧码 3/3 红新码 3/3 绿);G1 框持焦点不落;G2 守卫;文案。2680/2680;矩阵 ①22 ②4 ③0。Tester 控制器臂全跑、几何沿用(自核 diff);Reviewer 并行复核。放行尺 = Henry 11-08;放行后拷回(COPY-BACK.md r2.3c)→ 收割 → 第 21 次部署 → 转 A-19;留住状态改边栏另开小单(L-018) | 订单尾部「r2.3c 回执收讫(Main_Designer 2026-11-08)」;回执「编辑器组 r2.3c Result」;证据 `docs/audits/2026-11-05-a21-builder/builder/matrix-10-r2.3c/`;Reviewer `docs/audits/2026-11-05-a21-builder/reviewer/findings.md` | 2026-11-08 |
| a19-a20-image-pages-and-idle-save | A-25（新笔记第一行用输入法打字，拼音写进笔记） | 排队 | Main_Designer | 排期派单 | 订单「## A-25 · 新笔记第一行用输入法打字,拼音被写进笔记(🅰,既有,2026-11-06 Tester 编辑器组核验中发现)」 | 2026-11-07 |
| a19-a20-image-pages-and-idle-save | A-19（图片页面） | 排队 | Main_Designer | 编辑器组之后 | 订单开头 A-19 规格 | 2026-11-07 |
| a19-a20-image-pages-and-idle-save | A-20（闲置保存） | 排队 | Main_Designer | 编辑器组之后 | 订单开头 A-20 规格 | 2026-11-07 |
| role-records-gates | 门禁脚本 check-role-records（R1–R9）、重活锁脚本、本机路径闸 | 排队 | Main_Designer | 编辑器组第二轮收割后派 builder | 订单「2026-11-07-role-records-gates-order.md」规格 A/B/C | 2026-11-07 |
<!-- board:items:end -->

### 未建卡的事项（手写）

| 项 | 阶段 | 持有者 | 下一步 | 正本 | 更新 |
|---|---|---|---|---|---|
| 编辑器旧债单（leads-0/4/6/8、leads-5/7、handoff-2、「/」转文本把多行并成一单元、空残块、**激活行左缘盖住删除按钮→误删**） | 待开单 | Main_Designer | 编辑器组收割后开单;误删那条排第一 | 订单尾部「编辑器组判语与返修裁定」的处置表 + 「编辑器组第二轮补充裁定」第 7 条 | 2026-11-07 |
| TD-53 Group Gallery 按笔记逐篇发请求 | 触发时开单 | Main_Designer | 触发条件到了再开单 | `current-state/tech-debt.md` 的 TD-53 行 | 2026-11-07 |

### 本周关闭

- F3b（Word 公式导入）· 2026-11-07 岛上复走全过 → `docs/audits/2026-11-05-toggle-formula-builder/review-tester.md` 第十三节
- V2（B-78、B-79、A-22）· 2026-11-07 岛上复走全过 → `docs/audits/2026-11-06-v2-builder/review-tester.md`「部署后岛上复走」

> 单号 = 订单文件名去掉日期和 `-order.md`。一个订单文件里有几项的，按项分行。
