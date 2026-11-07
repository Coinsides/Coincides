> **状态 (Status)**: active（2026-11-07 首版由「个人学习讨论」会话起草，Main_Designer 核过接管）
> **层 (Layer)**: 现状 / Current-State（跨角色看板）
> **日期 (Updated)**: 2026-11-08
> **权威 (Authoritative)**: 是（只对「此刻在哪、谁持有、下一步」这一层；细节以每行指向的文件为准）
> **取代 (Supersedes)**: —
> **被取代 (Superseded by)**: —

# 看板：岛上是什么、在办什么、等谁

> **这张看板是四个角色共同的事实来源。** Main_Designer、Tester、builder、Reviewer 都从这里读同一组事实，不各自另记一份。
> **谁写**：前三块（白话、岛上、等 Henry 拍板）只有 Main_Designer 手写；「在办的单」现在暂由 Main_Designer 手抄，门禁脚本上线后由脚本从各单单卡生成。
> **每一行都指向证据**：看板只放结论和指针，细节在被指的文件里。
> 设计依据：`docs/agent-ops/analysis/2026-11-07-role-records-design.md`。

## 给 Henry 的白话

- **岛上现在**：第二十一轮——写字修复（编辑器组 r2.3c）已上岛，Tester 岛上复核已过。标题建块失败时字不丢，留在「Not in the note yet」小框里多半自己回去；框不盖字、两个框不叠；留下的字框不再让别处打字多发保存。
- **你会碰到**：以前导入的 Word 文件要在 Source Library 行尾点一次 Rebuild 才能用上新的公式导入（代价见说明书：笔记编号变、批注不迁移、标签/链接/外观丢、页图不重渲）；原样重传同一文件拿不到新结果。**写字修复已上岛**：按你 11-08 定的尺——真丢字 0、落错位置 0、误删 0——r2.3c 全过，八项「要保住的」没退。说明书 §一「留字框」写了三条，其中「已知」第一条你最可能碰到：离开再回来后标题和正文可能暂时同在一块，下次编辑那块就自动分开，字不缺。还没修、排在 A-25 的：**保存失败（比如断网）时整篇不接受输入，而且应用不会自己重试——网络好了以后，先点一下正在写的那行、再点一下笔记外面，字才落回、才能继续打**（屏上有横幅但没有 Retry 按钮）；新笔记第一行用输入法打字拼音进笔记。Group Gallery 在几百篇以上的账号会加载失败（TD-53），你 3 篇笔记碰不到。
- **你要做的**：没有急事。要你拍板的事都列在下面「等 Henry 拍板」。

## 岛上

```text
版本: fdeacb5d · 部署于 2026-11-07 21:34Z（第二十一轮：编辑器组返修 r2.3c，主 JS index-BVrO4Ql1.js；纯前端重建，依赖未动）
Tester 部署后核对: 已核（63/63 逐字节一致；代表臂 54 行三类全 0；见 docs/audits/2026-11-05-a21-builder/review-tester.md 第十五节，证据 tester-evidence/postdeploy-21/；依据 records/tester/verdicts.md）
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
| a19-a20-image-pages-and-idle-save | 编辑器组返修（A-18 残留、A-21、A-24） | 已核 | Main_Designer | **r2.3c 已上岛并经 Tester 岛上复核(第 21 轮,fdeacb5d,主 JS index-BVrO4Ql1.js;63/63、代表臂 54 行三类全 0)。本单关闭**;余项去处:A-25、L-018、TD-55、TD-56。**r2.3c Tester 放行**(主 JS `index-BVrO4Ql1.js`;Henry 11-08 尺:丢 0 / 落错 0 / 误删 0,八项不退,同源 22/22、63/63,守恒闸 13/13,客户端全量 2680 绿,旧矩阵 294 行 0 坏;Reviewer H1–H3 入 A-25)。两条归类:RJ 既有 → TD-56;LANDFAIL 整篇拒键 → A-25 不算 ①。⚠️ 口令事件见订单「收割记」与台账 §333(岛上无该账号;历史重写归 Henry)。L-018 边栏另开小单 | 订单尾部「r2.3c 判语收讫(Main_Designer 2026-11-08)」;判语 `docs/audits/2026-11-05-a21-builder/review-tester.md` 〇〇节;说明书 §一「留字框」三条 | 2026-11-08 |
| a19-a20-image-pages-and-idle-save | A-25（新笔记第一行用输入法打字，拼音写进笔记） | 排队 | Main_Designer | 排期派单 | 订单「## A-25 · 新笔记第一行用输入法打字,拼音被写进笔记(🅰,既有,2026-11-06 Tester 编辑器组核验中发现)」 | 2026-11-07 |
| a19-a20-image-pages-and-idle-save | A-19（图片页面） | 待验 | Tester | 包已封(ops `packages/a19-image-pages/`,15 文件,主 JS `index-Gswd3cHv.js`),回执「A-19 Result(builder 2026-11-08)」逐条有行号;**Reviewer 核包 src/ 与 Tester 验(自起修前/修后后端)并行** → Main_Designer 裁 → 拷回 → 第 22 次部署(server 变,重启服务,无依赖变动) | 订单开头 A-19 规格;订单尾部「A-19 派单(Main_Designer 2026-11-08)」 | 2026-11-08 |
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
