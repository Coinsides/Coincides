> **状态 (Status)**: active(对谈参考档;结论候 Henry 商量,⛔ 据此直接派工)
> **层 (Layer)**: 分析 / 设计对谈
> **日期 (Updated)**: 2026-09-09
> **权威 (Authoritative)**: 否;现物证据以代码为准,裁定以段 plan 冻结版为准
> **来源**: Henry 三问(开发者期待/自由编辑功能/Agent 可否操控)→ 八路调查(四读现物+四设计镜头),HQ 合成

# 编辑成熟度与 Agent 对称 —— 对谈分析档

## 一 · 现物三债(四路侦察的合流发现)

成熟编辑器的及格线是三份契约,现物三份全欠:

1. **所见皆可选(多选)**:两面选择态皆单值(`BoardPage.tsx` Selection 单值、`useBlockSelectionController.ts:32` selectedBlockId);板上五张卡挪位要拖五次;笔记唯一多选=tray 勾选列表。
2. **所做皆可撤**:笔记撤销栈只认四类(布局/建块/删块/表格结构,`historyService.ts:6-25`),**打字不入栈**(只剩浏览器 textarea 原生 undo,逐框隔离、切焦即断);板级 Ctrl+Z 不存在(唯一撤销=tray 搬迁批次,入口还在笔记侧)。
3. **所选皆可携**:剪贴板半残(Cut/Paste/Link 全 disabled 占位);跨面搬运唯一通路=tray 五步流程。

**代码自己承认这些是欠条**:Delete unit 禁用理由白纸黑字"needs undo and merge rules first"(`commandSurfaceService.ts:352`);十余条 "reserved for a later TextFlow pass" IOU 在册,而 "TextFlow pass" 从未立项——账实不符。

### 附账:幽灵与死物

- **幽灵编辑器**:整套 canvas 物件动词(图/表/形状/连线)代码在、路由在、门锁死(CANVAS_MODE_RETIRED);后果=**page 模式今日无任何插图/插表途径**(slash 无 image/table 命令)——学习软件写不进一张图,硬伤。
- **板上死物**:freehand 与搬迁物落板后只能选中和删除;`PATCH /boards/:id/visuals`(移动/旋转)**有路由无 UI 接线**;同类 API-only 还有板改名 PATCH、edge label/style PATCH。
- **生命周期残缺**:无删板路由;笔记 More 浮层 delete/archive/duplicate 全是 aria-disabled 占位——用户连删除笔记都做不到。
- **板制度性昂贵**:建板必铸 purpose(一魂一板唯一)、不可删不可改名 → "珍贵板"心态,劝退试错,与思考器官定位对撞。

## 二 · Agent 面现物(三问之三的地基)

- 工具面=29 动词单注册表 + **~900 行单 switch 直写 SQL**(59 处 db 调用),绕过 routes 层 zod 与 services——与人类路径双轨,已在漂移;
- 射程只覆盖学习规划半区;**整个知识工作台(notes/boards/CG/annotations/relations)对 Agent 全盲**——号称"AI 半区"的 ContentGroup 反而是 Agent 触不到的域;
- **现役红线违章**:`agent_memories` Agent 可写(save_memory),人类无任何 CRUD 路由/UI(routes 仅 embedding.ts 触及)——"Agent 能编辑的人类必须 100% 能编辑"今天就在被违反;修复成本约一条路由+一个列表页;
- contextHint 缝单向、自由字符串、全仓仅 3 个发射点(deck/calendar/onboarding),notes/boards 页面零发射;
- 提案两族(agent 5 型 vs 材料库 3 型)共用 apply 路由但入口/枚举分立。

## 三 · 设计上游悬账(宪章与方向档)

- 宪章 V12 必修件无计划槽位:**选区收据通用层**(必修③)、AI-readable tree、意图路由器;仓里已有两套互不相认的选择序列化,13.4 单 2 若按现路径实现即第三套;
- **文档级冲突未批注**:宪章待拍-2(page frame 退役为取景框)已被 08-30 纸与板(页框叠=根容器)实质推翻;"流式装配面=默认" vs "页内自由摆放"两份权威档并立未裁;
- 09-04 会议纪要(draft)事实上在驱动设计想象,13 条开放问题无回填立项痕迹。

## 四 · 四镜头合流点(全体一致)

1. **契约先于物种**:13.4 往欠账面上放新物种(text_range/item/弹窗/分层),每个物种落地即继承三笔债,债随物种数线性放大;
2. **接线批是全仓性价比最高的存货**:板改名/落板物可动/edge label 编辑——server 契约已付费,只差 UI;
3. **agent_memories 违章即刻清偿**,不搭 V14 的车;
4. **打字进撤销栈=最大单一债**,且是四个自锁动词+Agent 改文字权的共同前置;
5. **同门同钥**:Agent 扩面前先把 executor 双轨切到人类 routes/services 路径;粗意图做编译器(意图路由器)不做工具。

## 五 · 分歧与 HQ 倾向

| 题 | 分歧 | HQ 倾向 |
|---|---|---|
| 板分层(单8) | skeptic:进停车场(为无设计稿的 14.x 预铺);workbench:砍成线性"阶段"序 | 保留但**排段尾+砍成 v1 最小**(层清单/归属/显隐/顺序,⛔锁定/⛔面板全家桶);侦察⑨已证它连带渲染次序重构,不便宜 |
| 弹窗(单6) | skeptic:后移(焦点债翻倍);其余:做 | 做,但**解禁前置=焦点归属显式裁定**(侦察⑦三处全局假设:portal/window 键盘/body lock),⛔全修四🅰 |
| 装卸区(单7) | skeptic:等 tray 使用证据;symmetry:现在建且**预铸 actor/provenance 字段** | 做(Henry 核心设计),补 triage 三动词(落位/退回/丢弃)+来源标签;actor 字段现在就留 |
| 板上写字 | workbench:label/sticky 注记 register;skeptic:板原生文本永不 | 折中=**就地起草真笔记+自动挂投影**(双击空白→最小起草框→建 scratch 笔记→挂引卡),守真相分离;与弹窗可并件;候 Henry 拍 |

## 六 · 对三问的 HQ 合成答案(要点)

**Q1 期待**:成为"重组成本最低的思考器官"——真相分离+投影本体罕见正确;期待的不是动词数量,是三契约成立+幽灵/死物清账后的**可信度**;顶点体验=同一条 text_range 同时活在多板语境中,原文一改处处跟变。

**Q2 自由编辑**:板=多选群移(聚类假设)/落板物可动/连线长成命题(label→升格 Relation,自动留最小判断收据)/板便宜化(可删可改名)/吸附对齐;笔记=打字入栈(解锁四自锁动词)/跨单元光标航行/剪贴板=选区收据运输层(笔记 Ctrl+C→板 Ctrl+V=引卡)/粘贴图片进纸。效果=摆放→顿悟、装卸区→延迟分类、incremental formalization 梯子(墨迹→注记→带谓词连线→Relation)。

**Q3 Agent 操控**:能,而且必须——但顺序是"先知觉后手、先沙箱后真相、先还账后扩面":①清 agent_memories 违章;②contextHint schema 化+notes/boards 发射点;③永久禁区四条(判断域只可 propose/不可逆删除/直写用户文字/模拟 UI 输入);④**机械闸:人类撤销覆盖不到的域,Agent 不开写权**;⑤板=首个写沙箱(纯投影零真相损失+batch 整撤,复用搬迁模式);⑥粗意图=编译成域动词清单+预览放行,⛔做成工具。

## 七 · 13.4 修订二候选(候 Henry 商量)

- **新增"接线批+生命周期批"**(便宜置顶):板改名 UI/PATCH visuals 接线/edge label 编辑/删板/删笔记(走 trash 语义);
- 单 2 补验收:同一 range 可上多板;引卡常显源名+锚健康态;失效给"回源修复"入口;**引卡手势建成剪贴板契约**(通用收据第一实例,⛔板专用件);
- 单 7 补 triage 动词+actor 字段;单 8 砍 v1 面+排段尾;单 6 加焦点归属前置;
- **13.5-13.6 立项候选**:TextFlow 欠条清算(打字入栈→按依赖解禁)/agent_memories 人类 CRUD/跨单元光标/粘贴图片进纸/板吸附对齐/板级 undo 脊柱(若 13.4 未含);
- **候 Henry 拍的文档裁定**:流式 vs 自由摆放并立、待拍-2 supersedes 批注、板上就地起草折中案、休眠 canvas 13.6"删或复活"二选一。
