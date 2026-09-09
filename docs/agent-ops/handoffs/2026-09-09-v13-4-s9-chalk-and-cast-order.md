> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次三单 9;裁定依据=对谈拍定一(铸造论:板上写字升格目标=item ⛔随手成笔记)+量水深报告题三(`analysis/2026-09-09-v13-4-s1-item-depth.md` §三)
> **单号**: 13.4 单 9 · 板上写字(粉笔 + 铸卡)

# 13.4 单 9 · 粉笔 + 铸卡

**使命**:板上能写字——**粉笔**(板自有短注记,不进知识体系)与**铸卡**(粉笔升格为 item,领户口)。

## 零 · HQ 已裁(⛔ 复议)

1. **粉笔=board_visuals 新 kind `sticky`**:纯文本短注记,⛔ 富文本/⛔ 字号面板(简陋是立场);长度上限 280 字符(常量,可调);⛔ 被引用/⛔ 进组/⛔ 进准备区——想进知识体系唯一出路=铸卡;
2. **入口**:select 工具下**双击板面空白**=原位起草粉笔(输入框就地,Escape 弃,失焦/Enter 存);双击既有粉笔=编辑;拖移/删除/pinned 走单 A 已通的 visual 通道;
3. **铸卡=board 域新端点单事务**:createItem(body=粉笔文本,origin=板)→ mount item member(几何继承粉笔位置,z 保留)→ 删粉笔 visual→记 mounted(既有通用记账,⛔ 新 verb);入口=选中粉笔的 selectionBar "Cast to item"(右键有则同挂);
4. **origin 扩展(量水深题三定案)**:新迁移 `items.origin_board_id` nullable FK REFERENCES boards **ON DELETE SET NULL**;resolveOrigins 扩 board(同用户校验);**note/board 出生地互斥**(schema 校验两者不同时给);**course 留空**(⛔ 从板弱标签快照);createItem 写门开 origin_board_id;**castItem ⛔ 动**(board ⛔ 冒充 CG pool);
5. 消费面:Item Inspector 与摘要 DTO 补出生板显示("Born on board <name>";板已删=出生地不可达降级文案,item 正文照常);板生 item=standalone(无 origin note),沿单 1 已裁"双击禁用有提示"。

## 一 · 交付面

- 迁移+base schema(origin_board_id)+validators/DTO/hydrate/资源链(量水深 §三.3 生产者清单按实需接线,⛔ 顺手扩所有清单);
- sticky visual:schema data(text)+渲染(便签样式小卡,与 item 卡明显区别:无徽章无源名)+就地起草/编辑 UI+280 上限(超限拒绝有提示);
- cast 端点+client 接线(selectionBar 按钮→确认或直接执行→板上原位换卡)。

## 二 · 裁量与停线

- 停线举证不改判;⛔ 动 047 既有列/castItem/annotation 面;⛔ 新 event verb;
- sticky 的 data schema 沿 board_visuals data JSON 惯例(freehand 先例);
- 铸卡后粉笔文本若超 item 正文规约(空白等),normalizeItemBody 拒绝时给用户可读错误,⛔ 静默吞。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Boards/items 测试面)不破;
- 冒烟五条:①双击空白写粉笔,重开仍在;②粉笔可拖/可编辑/可删/可 pin;③选中粉笔铸卡:粉笔消失、原位 item 卡、GET /items 可见该 item 且 origin_board 正确;④Inspector/摘要显示出生板名;⑤删出生板(单 A DELETE):item 仍在、origin 降级显示、正文无损。

## 四 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(凭据扫描留 HQ)。
