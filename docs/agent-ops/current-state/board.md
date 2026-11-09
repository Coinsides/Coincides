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

- **岛上现在**：第二十二轮——图片 Source 的笔记不再是空的（A-19）已上岛，Tester 岛上复核已过。导入 png / jpeg / webp 后打开笔记首屏就是图本身，比例对、大图缩到栏宽不撑破、小图按原尺寸；以前导入的图片打开是「Generate original page images」按钮，点一下出图。图片笔记没有「文本/原页」切换（一张图没有可读文字）。上一轮的写字修复（r2.3c）仍在。
- **你会碰到**：以前导入的 Word 文件要在 Source Library 行尾点一次 Rebuild 才能用上新的公式导入（代价见说明书：笔记编号变、批注不迁移、标签/链接/外观丢、页图不重渲）；原样重传同一文件拿不到新结果。**写字修复已上岛**：按你 11-08 定的尺——真丢字 0、落错位置 0、误删 0——r2.3c 全过，八项「要保住的」没退。说明书 §一「留字框」写了三条，其中「已知」第一条你最可能碰到：离开再回来后标题和正文可能暂时同在一块，下次编辑那块就自动分开，字不缺。还没修、排在 A-25 的：**保存失败（比如断网）时整篇不接受输入，而且应用不会自己重试——网络好了以后，先点一下正在写的那行、再点一下笔记外面，字才落回、才能继续打**（屏上有横幅但没有 Retry 按钮）；新笔记第一行用输入法打字拼音进笔记。Group Gallery 在几百篇以上的账号会加载失败（TD-53），你 3 篇笔记碰不到。
- **你要做的**：没有急事。阶段一「写字不丢」按你 11-08 的 7 天排：D2 A-20（换笔记 / 过期不丢字 + 停两秒就存、撤销不变）上第 23 轮，你开始日用；D5 A-25 必修（输入法拼音写进笔记、保存失败不再整篇拒键且有常驻重试、后台落地两处健壮性）上第 24 轮；D6 阶段末回归 + 封版；D7 缓冲。**D6 若 A-25 没全绿只上绿的部分**，你在大陆期间无法修。离日前关云机。要你拍板的小事列在下面「等 Henry 拍板」。

## 岛上

```text
版本: dfbcce8e · 部署于 2026-11-09 08:08Z（第二十四轮：A-20b r2 保险带覆盖缺口——多行粘贴首段不丢、同单元集文字变的组入账、`#notes/<id>` 无前导斜杠同篇、Shift+Enter 软换行原样落地，主 JS index-Db4qSSYo.js；纯前端、服务未重启（仍 11-08 01:32Z 那次）；依赖未动；dist 63/63 对包逐字节同；上一轮 29b1d456 = A-20 r3e）
Tester 部署后核对: 已核（63/63 与包一致，经隧道逐个取岛上实际服务文件再算 63 同；代表臂 10/10 与本地 r2 读数一致：IDLE 3.5 s 在服务器、K1-close、HEADCLOSE aaa 横幅 + bbb 框、applyslow 无 409、MENTER KEPT、`#/Notes` 字取回、N6B 字未到 B；本轮 SHIFTENTER-typed-close ONE `["abc
d","qr"]`、MULTIPASTE-close 服务器 `abcXQdef` + 框 YQ/def（TD-66 形）、`#notes/<id>` HELD-PROCEED；只用测试账号、未点 Replay；留档 tester/postdeploy-24/）
锁: 见私有 ops 目录里的锁记录（不进仓库）
服务器细节: 见私有 ops 目录里的服务器手册（不进仓库）
```

## 云机时长账(Henry 2026-11-08 要求;**按工程段计,不按天**;每个里程碑更新)

| 周期 | 已用 | 本段预算 | 本段剩余预估 | 段后剩余(再规划) |
|---|---|---|---|---|
| 11-06 → 12-06(每月 6 号重置,250 h) | 34 h(至 11-08) | 阶段一:银座 7 日不断机 = **最多 168 h**(agent 昼夜连跑;实际工时估 40–50 h,其余是空转) | A-20 收尾、A-25 必修三条、阶段末回归 + 两轮部署 | ≈ 48 h(11-15 → 12-06,Henry 日用期几乎不开机) |

> 无影 VM 只在 Henry 连接时计时(断连 10 分钟挂起),所以 **agent 的工程时间 = Henry 在线时间**。Henry 11-08:日用期几乎不开云机、也不保证每天开机(人在日本),所以**集中做完一段再规划剩余**;工程按「他在线时推进、离线自然停」走,Main_Designer 保证他每次上线时下一步已备好、不等裁定。工程管理应用:不建(账就是这张表,随里程碑更新;见台账 §351)。agent 搬常驻机:若搬只选支持地区(东京 / 新加坡),⛔ 香港岛与大陆;度假期间不动工程。

## 等 Henry 拍板

- **阶段一「写字不丢」已拍(Henry 2026-11-08)**:A-20 两半 + **A-25 必修三条**(输入法拼音 / 保存失败死路 / H1·H2;Henry 11-08「A-25 也进队」,内务八项出阶段——我切的,候他看一眼);7 天日程在订单 `2026-11-08-a25-…` 「流程与阶段一日程」;**每单验过即上岛**(Henry:「上岛之前我无法参与测试」);阶段末一次全量回归 → 封版 → 日用期(长度 Henry 定,建议 ≥1–2 周)。流程精简八条已批,写在 `operating-workflow.md` §6 与四张角色卡。候 Henry 的只剩:A-25 必修 / 内务的切法认不认
- **候拍三小件**:扫描脚本挂不挂 pre-commit(硬闸 / 软闸);全量日志进库要不要立「只收尾 200 行」;两处旧泄漏(邮箱、会话槽名)与口令事件的历史重写(我不建议)
- **云机防火墙**:三个配置都关着,开不开(我建议开;临时进程侧已清干净)
- **purpose 设计**（停导入自动卡、手建目的、goal 合并、平目的+标签）· 你说「先不动、用着看」，等你说「拍」或「写」→ `design/loose-ideas-ledger.md` L-002…L-009

## 在办的单（门禁脚本上线前由 Main_Designer 手抄）

阶段只用：`排队 | 施工 | 待验 | 返修 | 待裁 | 待收割 | 待部署 | 已上岛 | 已核 | 关闭`。持有者只用：`Main_Designer | Tester | builder | Henry`。

<!-- board:items:start -->
| 单号 | 项 | 阶段 | 持有者 | 下一步 | 现行正本 | 更新 |
|---|---|---|---|---|---|---|
| a19-a20-image-pages-and-idle-save | 编辑器组返修（A-18 残留、A-21、A-24） | 已核(r2.3c 第 21 轮 `fdeacb5d`;本单关闭) | Main_Designer | **r2.3c 已上岛并经 Tester 岛上复核(第 21 轮,fdeacb5d,主 JS index-BVrO4Ql1.js;63/63、代表臂 54 行三类全 0)。本单关闭**;余项去处:A-25、L-018、TD-55、TD-56。**r2.3c Tester 放行**(主 JS `index-BVrO4Ql1.js`;Henry 11-08 尺:丢 0 / 落错 0 / 误删 0,八项不退,同源 22/22、63/63,守恒闸 13/13,客户端全量 2680 绿,旧矩阵 294 行 0 坏;Reviewer H1–H3 入 A-25)。两条归类:RJ 既有 → TD-56;LANDFAIL 整篇拒键 → A-25 不算 ①。⚠️ 口令事件见订单「收割记」与台账 §333(岛上无该账号;历史重写归 Henry)。L-018 边栏另开小单 | 订单尾部「r2.3c 判语收讫(Main_Designer 2026-11-08)」;判语 `docs/audits/2026-11-05-a21-builder/review-tester.md` 〇〇节;说明书 §一「留字框」三条 | 2026-11-09 |
| a20b-safety-belt-coverage | A-20b 保险带覆盖缺口(Reviewer r3e Q2 多行粘贴首行片段不入账 / Q3 单元集合不变的 structural 组不入账 / Q4 谓词前导斜杠 / Q5 两条测试债) | **已核(第 24 轮 `dfbcce8e`,主 JS `index-Db4qSSYo.js`,纯前端,dist 63/63 同包;Tester 岛上代表臂 10/10 绿)。本单关闭**;r2 放行依据:9 对 + 第 10 对、链 190 对 r3e 0 差(1 行 prep 污染)、a20m 6/6、a20n 旧臂同 r3e 新臂 22 行全合预期;光标跳探针两遍无证据 r2 高于 r3e(唯一一跳在 r3e);Reviewer 两条小核不挡 + 差异不在光标跳路径 | Main_Designer | **光标跳 → TD-77(岛上既有,阶段一开单先探后改);MULTIPASTE / SURROGATE 框内副本 → TD-66 附;S1 → TD-73 附;S2/O4 测试债随 A-25。r2 = R1 说法 + R2 一例 + R3 退一位 + R4 `''` 行 + 乙(HSC placeTyped 只对 window 来源切换行符,edit/split 原样;source 存储↔entry 往返不变)+ 六例两控制;Tester 新臂 SHIFTENTER ×2 ONE / SURROGATE 干净 / WINDOWENTER SPLIT / MULTIPASTE 两形。** **底 = A-20 r3e 包;独立 scratch;两条修法都小(H:796 公共前缀、H:691 一支)+ Q4 一行 + Q5 两测试;各一条 r3e 上红的对照;Tester 新臂 MULTIPASTE-close / LISTPASTE-close / `#notes/<id>`;排 A-25 ② 之前 = 第 24 轮。不挡 r3e(四条都不比修前差、是「没保住」不是「写错」)。** | 订单 `2026-11-09-a20b-safety-belt-coverage-order.md` | 2026-11-09 |
| a25-ime-and-save-failure | A-25 必修（①输入法拼音写进笔记 ②保存失败死路 ③H1/H2） | **②a (iv) D 做完(c+b+d1;:456 精确相等前判收);Reviewer 封前读 D:D1/D2 🅰 + D3 折进;候 A-20b r2 封后折进 → 全量 + build + kit → 封** | builder | **(iv) 四决定 A(a1)/B(b1)/C/D(d1);D 两问裁 (c) 锚不到留冲突项 / (b) 全有或全无;D1 只删字回执 → null;D2 inline_structures 经 replaceTextUnitText 重算;D3 fieldValues 不等 → null。** **查报收讫、四决定已裁(11-08,订单末节「第一段查报收讫 · 裁定」):①选 (a) 组合中不建块;②a 自动重试 + 块上常驻指示 + 收声;②b 准收窄 flush(三条件);准改适配器 `route_receipt_stale`;CHAIN 看调用方普查;leads-2 留阶段二。施工在 A-20 r3 封包后开(同文件)。** Tester 等 A-20 包的空档写三组探针交 builder;builder 封完 A-20 包开第一段「查」(Q1–Q4)→ 裁 → 修 → 包 `a25-ime-save-failure` → Reviewer ∥ Tester → 第 24 轮。内务八项(结构事务化、KRO、Y1、leads-2、H3、TD-58、恢复面合一、G4)出阶段 | 订单 `2026-11-08-a25-ime-and-save-failure-order.md` | 2026-11-09 |
| a19-a20-image-pages-and-idle-save | A-19（图片页面） | 已核 | Main_Designer | **A-19 已上岛并经 Tester 岛上复核(第 22 轮,`04f6f822`,主 JS `index-Gswd3cHv.js`;63/63;代表臂全过)。本单关闭**;余项去处:TD-59(三份字节)、TD-60(读取器四分支测试)、TD-61(登记加载失败空白页)、L-021(图片无解释面)。Tester 放行判语、我点名五项、1a 回归、J1 坐实表见判语 〇;一条判不挡 → TD-61;说明书 §二两条 | 订单尾部「A-19 判语收讫(Main_Designer 2026-11-08)」;判语 `docs/audits/2026-11-06-a19-builder/review-tester.md` 〇 + 第四节 | 2026-11-08 |
| a19-a20-image-pages-and-idle-save | A-20（闲置保存，连 B-81）**🅰** | **已上岛(第 23 轮 `29b1d456`,主 JS `index-Dkbj0u5K.js`,前端 only、服务未重启,dist 63/63 同包);Tester 部署后核对 7/7 已核;r3e 放行(Tester 2026-11-09,无一臂比修前差;Reviewer 五条无 r3e 引入缺陷);本单余项 → A-20b(r2)/ A-25 / TD-71–76** | Main_Designer | **r3e 判语 `tester-r3e/review-tester.md` 〇:放行;链 190/190 对 r3 0 差,a20m 全绿,P1 4/4 P2 2/2,9 对红行都在修前红里,第 10 对 0/20:0/20;已裁三条(heldhead-undo 🅱、putback ②a(iv)、MENTER ②a(ii));单列 SHIFTENTER-typed-close(r3e 成单独一段多一手柄 +3 px,修前丢字,不比修前差,A-20b r2 乙修)。手册 §一 A-20 条 + 已知 14 条已写;TD-64/66/68/69 附、TD-71–76 新增。** **r3d = N1(单元变少的组记录永不自动落地)+ N2(同篇地址谓词与路由同解析)+ N3(一个 pending 一个失败提示)+ N5((乙) 撤回从未暴露到真 handle,heldhead 真机 +9..+12 ms 删坐实)+ N6/N6a/N6b(同块别次挂载回执且文字 ≠ 服务器现文时 kept 字进框不顶掉回执;快照按 noteId 重取),见订单末节「P1 / P2 证实…开 r3e」及其上各节;Tester r3 判语:挡(N1),r3d 判语:挡(P1 / P2,真机各红 2/2),r3d 链 190/0 作 r3e 参照;⑤(横幅提供期间在那行打字丢横幅字,修前同)→ A-25 ②a (iv) + 手册已知,r3 链 190/0 作 r3d 参照;「先放回再 Apply」= 409 不覆盖,④⑤ 归 A-25 ②a。Tester 判语 → copy-back → 收割 → 手册 → 第 23 轮。** **r3 包 `a20-idle-save-r3`(`index-nLSUOG48.js`)已核收(15/15、63/63),派单见订单末节「r3 包收讫」;Tester 判语 → copy-back → 收割 → 第 23 轮。** **r2 已封包 `a20-idle-save-r2`(`index-DGn86c1V.js`);Reviewer 复核完:M1 确认 ①(打列表时中间行丢,修前同丢)、M2 疑似 ②(应用内后退 + 保存失败 → 人被留下而记录冻结 → 撤销后复活)等六条 → 开 r3(M1–M4 必修,原则「冻结的记录只属于已不在的会话」);**Tester 判语:r2 挡放行(BACKIN-undo 复活 2/2,修前 0/2;假 LEFT_UNSAVED;`released` 卡死坐实)→ r2 不发,r3 = 第 23 轮;r2 链跑完作参照,回归对直接在 r3 上跑。** **升 🅰(11-08)**:Tester 修前旁证——应用内改地址换笔记、令牌过期跳登录,没回车的字各 2/2 真丢(整页导航不丢);🅰 半边已裁开修:机理 = 路由守卫不拦「只改 #」的导航(含在笔记里粘贴另一篇链接),没人封口零请求;修法 = 守卫接住 + 留字框保险带;401 的恢复回执从 sessionStorage 挪 localStorage。**先查后修两段**:第一段查报 Q1 空闲 seal 接入点与 A-18 四条件 / Q2 hash 跳转丢字(属实升 🅰)/ Q3 B-81 假 toast 来源 / Q4 pagehide 留档扩展与守恒闸放宽取消 / Q5 写放大基线 → 我裁;**撤销路 Henry 选 (B) 只落库不封口(11-08):把 seal 里绑在一起的「切撤销组」与「落库」拆开;包 `a20-idle-save` 已封(`index-BkYnVk7W.js`;全量 2707 过;四路离开 10/10、撤销逐步同修前、硬杀停 2.6 秒有字)→ **Reviewer K1/K2 挡放行(保险带把服务器已有的中间段再落一遍;撤销后离开被撤的字落回,都是 ②)→ r2 返修;Tester 再抓 SPLIT(回车劈单元后保险带整段替换删掉已存的字)/ RETRY 两类 ① 比修前差 → **r2 改法:保险带只记未封口的字,已封口未确认一律走回执** → 第二段修 + 包 `a20-idle-save` → Reviewer ∥ Tester → 第 23 次部署。基线 `04f6f822`,证据 `docs/audits/2026-11-08-a20-builder/` | 订单开头 A-20 规格;订单尾部「A-20 派单(Main_Designer 2026-11-08)」 | 2026-11-08 |
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
