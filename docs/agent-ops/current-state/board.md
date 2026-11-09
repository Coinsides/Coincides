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

- **岛上现在**:第二十五轮——A-25 必修三条已上岛,Tester 岛上核对在跑。**输入法**:新笔记第一行用拼音打,组字期间不建块、上屏才建,拼音不再进笔记(CDP 模拟输入法 48/48;真输入法等你自检)。**保存失败**:不再整篇拒键、不弹一串提示;失败的那一块旁出「Not saved yet · Retry / Copy」,它自己按 2 s / 4 s… 退避重试、网络回来立刻再试,别的块照常停笔即存;关页字进本机恢复。**恢复横幅**:你刚打的字不再顶掉别次留下的横幅;Apply 时服务器已变就按行接上一次写入,接不上的一字不写留作冲突项(View differences / Replay / Discard)。上一轮(A-20b r2)与 A-20、r2.3c 都在。
- **你会碰到**:① 真断网(连读取也不通)时每次自动重试会弹一条「Block save result could not be reconciled」,联网后自动补上,不用动——这是 A-25 唯一比上一轮多出来的噪音,我判不挡(TD-80);你若觉得该挡就说,改一行。② 双击新起一块马上打字,偶尔头一两个字跑到后面、接着回车会把头一行推到后面(TD-77,所有版本都有,很少见)——你拍了挪下阶段。③ 点 Apply 后可能先见「Failed to save block」紧接「Recovered block edit applied」,以后者为准。④ 在打开时的空行上打的字,横幅 Apply 接不上会留作冲突项而不是合并(TD-69 ⑥);Replay 整块替换会盖掉你后打的字,先 View differences。⑤ **新发现(11-10 阶段末回归,TD-85,🅰 候选):点 Apply 后字还没出现就在同一块接着打字,Apply 的字会被你那次保存静默盖掉、哪里都不留**——先等字出现再打;反过来先打字再 Apply 不丢。Tester 在补计数和修前对照,是否本周修候你。说明书 §一已按 A-25 改(停顿保存失败 / 输入法新块 / 已知 2·4·5·6·8·9·10·12·13)。以前导入的 Word 文件要在 Source Library 行尾点一次 Rebuild 才能用上新的公式导入;Group Gallery 在几百篇以上的账号会加载失败(TD-53),你 3 篇笔记碰不到。
- **你要做的**:**开始日用**——先用输入法在新笔记打几行,再断一下网打几个字看「Not saved yet」会不会自己消掉;有摩擦直接说,使用摩擦是唯一订单来源。阶段一按你 11-08 的 7 天:D2 A-20 上第 23 轮 ✅、A-20b r2 第 24 轮 ✅、D5 A-25 第 25 轮 ✅(11-09,比排程早一天);接下来 **D6 阶段末回归 + 封版只 Tester 跑**(builder / Reviewer 已停,省额度),我只在判语 / 封版时出声;TD-77 下周或额度有余再做(你 11-09 拍)。离日前关云机。要你拍板的小事列在下面「等 Henry 拍板」。

## 岛上

```text
版本: b734197e · 部署于 2026-11-09 14:24Z（第二十五轮:A-25——输入法在新块组字完才建块;保存失败只标自己的块「Not saved yet · Retry / Copy」并退避自动重试、别块照常停笔即存、失败 toast 0;静音拒键看失败账;恢复项一块每访问一条、Apply 遇 409 按锚合并全有或全无、与服务器相同的旧回执自动忘;主 JS index-4nEsyJNA.js;纯前端、服务未重启（仍 11-08 01:32Z 那次）;依赖未动;dist 63/63 对包同;上一轮 dfbcce8e = A-20b r2）
Tester 部署后核对: 已核（经隧道取岛上实际服务文件重算,与 A-25 包 63 同 0 差 0 缺,两次运行;部署前空跑 61 同 2 不同、守卫停下 = 阳性对照;代表臂 7/7 绿:IME-new 拼音 0 服务器「第一测试」交接在组字外、SAVEFAIL-500-direct (a)–(e) toast 0 补上 5.5 s、ONEFAIL-500 B 2.36 s / A 7.54 s、D-anchor、HEADCLOSE-putback 冲突项形未点 Replay、K1-close、IDLE;只用测试账号;留档 tester/postdeploy-25/）
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
- **TD-82 / TD-83 两条既有丢字形(🅰 候选)**:acc10 `HL-saveNotSentThenClose`、acc13 `N-b2-headingAboveLineSameWord`,r3e 起每轮两侧都红,被「⊆ 底」规则放过四轮、无账,阶段末口径下立案(Tester 正写操作序列)。**要你拍:本周召回 builder 开单修,还是阶段二**;不挡封版。规则缺陷 TD-84(⊆ 放过的红必须带指针)候你入 operating-workflow §6
- **TD-85 Apply 后同块打字静默盖掉 Apply 的字(🅰 候选,阶段末新臂 APPLYTYPE-applyfirst 1/1 红)**:Apply 的 PUT 落地并弹成功提示后,紧接的打字保存带编辑器文本(无 Apply 字)与 Apply 的 revision 写入、无 409 → 服务器被盖。Tester 正补 2 轮计数 + A-20b r2 底对照:底也丢 = 既有(与 82/83 同列);底不丢 = A-25 新引入,我会建议本周修。**要你拍的与 82/83 同一问:本周召回 builder,还是阶段二**;不挡封版
- **TD-80 真离线对账提示重复**:A-25 唯一比上一轮多的噪音,我判 🅱 上岛;你若定 🅰 就另起一轮(改一行)
- **候拍三小件**:扫描脚本挂不挂 pre-commit(硬闸 / 软闸);全量日志进库要不要立「只收尾 200 行」;两处旧泄漏(邮箱、会话槽名)与口令事件的历史重写(我不建议)
- **云机防火墙**:三个配置都关着,开不开(我建议开;临时进程侧已清干净)
- **purpose 设计**（停导入自动卡、手建目的、goal 合并、平目的+标签）· 你说「先不动、用着看」，等你说「拍」或「写」→ `design/loose-ideas-ledger.md` L-002…L-009

## 在办的单（门禁脚本上线前由 Main_Designer 手抄）

阶段只用：`排队 | 施工 | 待验 | 返修 | 待裁 | 待收割 | 待部署 | 已上岛 | 已核 | 关闭`。持有者只用：`Main_Designer | Tester | builder | Henry`。

<!-- board:items:start -->
| 单号 | 项 | 阶段 | 持有者 | 下一步 | 现行正本 | 更新 |
|---|---|---|---|---|---|---|
| stage-one-seal-regression | 阶段一阶段末回归 + 封版(基线 = 岛上 `b734197e` 自己;只 Tester 跑) | 施工 | Tester | **P1 开跑**(同源哈希 → k25 + D → 链 190 / LANDOTHER / a20n → 第 10 对 ×20 新闸 → 9 对单侧 → r2.3c 链 + 旧矩阵 → A-19 代表组 → 客户端 + 服务端全量 → 三条新臂 C-convert / IME 守卫 / Apply 同块打字 → ≈10 条「从界面保存一次」DOM 冒烟 → void 臂逐条分类 → 判语 + Opus 复核);Main_Designer 裁了 PLAN §三 1–8(P1 收窄:27 条接口往返不做;口径 = 已知形 + A-25 侧读数 + 既有裁定 + **每条红必有 TD / 手册说法**;TD-82 / 83 既有丢字形立案、TD-84 规则缺陷;two2 三轮判语更正;手册 7 处不一致已改);判语后 Main_Designer 封版(版本 + 哈希 + 已知清单 + 未覆盖清单 + 备份核)→ Henry 日用期 | 订单 `2026-11-10-stage-one-seal-regression-order.md`;Tester PLAN `<scratch>/stage-end/PLAN.md`(收割时进 `docs/audits/2026-11-10-stage-one-seal/tester/`) | 2026-11-10 |
| a19-a20-image-pages-and-idle-save | 编辑器组返修（A-18 残留、A-21、A-24） | 已核(r2.3c 第 21 轮 `fdeacb5d`;本单关闭) | Main_Designer | **r2.3c 已上岛并经 Tester 岛上复核(第 21 轮,fdeacb5d,主 JS index-BVrO4Ql1.js;63/63、代表臂 54 行三类全 0)。本单关闭**;余项去处:A-25、L-018、TD-55、TD-56。**r2.3c Tester 放行**(主 JS `index-BVrO4Ql1.js`;Henry 11-08 尺:丢 0 / 落错 0 / 误删 0,八项不退,同源 22/22、63/63,守恒闸 13/13,客户端全量 2680 绿,旧矩阵 294 行 0 坏;Reviewer H1–H3 入 A-25)。两条归类:RJ 既有 → TD-56;LANDFAIL 整篇拒键 → A-25 不算 ①。⚠️ 口令事件见订单「收割记」与台账 §333(岛上无该账号;历史重写归 Henry)。L-018 边栏另开小单 | 订单尾部「r2.3c 判语收讫(Main_Designer 2026-11-08)」;判语 `docs/audits/2026-11-05-a21-builder/review-tester.md` 〇〇节;说明书 §一「留字框」三条 | 2026-11-09 |
| a20b-safety-belt-coverage | A-20b 保险带覆盖缺口(Reviewer r3e Q2 多行粘贴首行片段不入账 / Q3 单元集合不变的 structural 组不入账 / Q4 谓词前导斜杠 / Q5 两条测试债) | **已核(第 24 轮 `dfbcce8e`,主 JS `index-Db4qSSYo.js`,纯前端,dist 63/63 同包;Tester 岛上代表臂 10/10 绿)。本单关闭**;r2 放行依据:9 对 + 第 10 对、链 190 对 r3e 0 差(1 行 prep 污染)、a20m 6/6、a20n 旧臂同 r3e 新臂 22 行全合预期;光标跳探针两遍无证据 r2 高于 r3e(唯一一跳在 r3e);Reviewer 两条小核不挡 + 差异不在光标跳路径 | Main_Designer | **光标跳 → TD-77(岛上既有,阶段一开单先探后改);MULTIPASTE / SURROGATE 框内副本 → TD-66 附;S1 → TD-73 附;S2/O4 测试债随 A-25。r2 = R1 说法 + R2 一例 + R3 退一位 + R4 `''` 行 + 乙(HSC placeTyped 只对 window 来源切换行符,edit/split 原样;source 存储↔entry 往返不变)+ 六例两控制;Tester 新臂 SHIFTENTER ×2 ONE / SURROGATE 干净 / WINDOWENTER SPLIT / MULTIPASTE 两形。** **底 = A-20 r3e 包;独立 scratch;两条修法都小(H:796 公共前缀、H:691 一支)+ Q4 一行 + Q5 两测试;各一条 r3e 上红的对照;Tester 新臂 MULTIPASTE-close / LISTPASTE-close / `#notes/<id>`;排 A-25 ② 之前 = 第 24 轮。不挡 r3e(四条都不比修前差、是「没保住」不是「写错」)。** | 订单 `2026-11-09-a20b-safety-belt-coverage-order.md` | 2026-11-09 |
| a25-ime-and-save-failure | A-25 必修（①输入法拼音写进笔记 ②保存失败死路 ③H1/H2） | **已核(第 25 轮 `b734197e`,主 JS `index-4nEsyJNA.js`,纯前端,dist 63/63 同包;Tester 岛上代表臂 7/7 绿、隧道取文件 63 同)。本单关闭**;余项去处:TD-77(阶段二,Henry 拍)、TD-78 / 79 / 80 / 81 新增,TD-69 ⑥⑦、TD-63 附,TD-67 / 73 S1 / 74 / 75。**Tester 放行(2026-11-09 判语 `docs/audits/2026-11-08-a25-builder/tester/review-tester.md` 〇;Opus 复核 4 读者 ×4 核对者 31 条全确认):比线上 A-20b r2 差的只一条 = 真离线对账提示重复(🅱 TD-80);k25 门全绿(IME 48/48、SAVEFAIL 8/8、ONEFAIL 4/4、LANDFAIL 11/11、CHAIN、H1/H2 冻结版红·包绿独立核过)、D 出口 16/16、链 190 宽注记 0 差(多出的差全在 A-25 好的一边)、a20m 含补闸 11 行全绿、a20n、9 对 ⊆ 底红(唯一例外 `D:lines30-1` 两读归既有 TD-77,旧构建四次同签名旁证)、第 10 对 2/20 `['wa']` 归 TD-63;未覆盖两臂写明记 TD-79。**收割 `b734197e`(19 文件拷回 sha 19/19、tsc 0);已上岛(第 25 轮 `b734197e`,2026-11-09 14:24Z,主 JS `index-4nEsyJNA.js`,纯前端、服务未重启,dist 63/63 同包);Tester 岛上核对候。** 封包史:已封包 `a25-ime-save-failure`(主 JS `index-BngbSlvd.js`,18 改 + 1 新,server 不变,主设计核过);Reviewer 终核(13 未读文件)∥ Tester 验收(k25 正本 + D 八臂 + A-20/A-20b 整套回归 + 9 对,约 4.5 h,基线 = 岛上 `dfbcce8e`)在跑 → 第 25 轮。封前经 r1 门红(k25a 36/78)→ 四裁(按块闸 / ②b 乙 / IME 追赶与交接等组合 / 双发撤)→ Reviewer 三轮封前读(F1 F2 🅰、F3 F4 R1 O4 🅱 全折进)→ 乙浏览器形诊断(whenWritesIdle 抛原错误先于 flush)→ 看账不看类型 + 收窄到亮指示的两种失败;k25c 全门绿;全量 2853/2853 exit 1 = TD-74** | Main_Designer | **三问裁(判语前)**:第 10 对 `['wa']` 归 TD-63 只记数(不变量 = 三次 Ctrl+Z 后文是 `warmup` 前缀);HEADCLOSE-putback :188 预期改成冲突项(与 (c)/(b)/emptyMatches false 一致,主设计没回头改 = 判断点;修向记 TD-69 ⑥);两条 (iv) 臂写「未覆盖」不挡(决定 C Reviewer 按码核过)。Tester 核数更正四处就地标。TD-78 至 TD-81 新增,TD-63/69/77 附;手册 §一 停顿保存失败 / 输入法新块 / 已知 2·4·5·6·8·9·10·12·13 改。**(iv) 四决定 A(a1)/B(b1)/C/D(d1);D 两问裁 (c) 锚不到留冲突项 / (b) 全有或全无;D1 只删字回执 → null;D2 inline_structures 经 replaceTextUnitText 重算;D3 fieldValues 不等 → null。** **查报收讫、四决定已裁(11-08,订单末节「第一段查报收讫 · 裁定」):①选 (a) 组合中不建块;②a 自动重试 + 块上常驻指示 + 收声;②b 准收窄 flush(三条件);准改适配器 `route_receipt_stale`;CHAIN 看调用方普查;leads-2 留阶段二。施工在 A-20 r3 封包后开(同文件)。** Tester 等 A-20 包的空档写三组探针交 builder;builder 封完 A-20 包开第一段「查」(Q1–Q4)→ 裁 → 修 → 包 `a25-ime-save-failure` → Reviewer ∥ Tester → 第 24 轮。内务八项(结构事务化、KRO、Y1、leads-2、H3、TD-58、恢复面合一、G4)出阶段 | 订单 `2026-11-08-a25-ime-and-save-failure-order.md` | 2026-11-09 |
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
