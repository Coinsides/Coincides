> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次四单 8;现物证据=单 0 侦察附录⑨(z_index 分类各排,跨类型统一层序不存在——分层连带渲染次序重构+edges 跨层规则);Henry 拍定(分层砍薄白话版无异议)
> **单号**: 13.4 单 8 · 板分层薄版

# 13.4 单 8 · 板分层(薄版)

**使命**:板长出图层——"第一层要什么,第二层要什么"的认知外化;**顺带把跨类型层序糊涂账理顺**。v1 薄版:加/删/改名/排序/显隐;⛔ 锁定/透明度/缩略图/揭示播放(14.x)。

## 零 · HQ 已裁(⛔ 复议)

1. **数据**:新迁移 `board_layers`(id/board_id/user_id/name/order_index/visible 默认 1);board_members 与 board_visuals 加 **layer_id nullable FK**——**NULL=默认层**(旧数据零迁移痛);默认层=虚拟行(不占表),面板显示为"Base",可见性可切但⛔可删⛔可排到别处(恒最底);
2. **统一渲染次序(糊涂账清算)**:渲染=按层序低→高逐层容器化(SVG/DOM 分层容器),**层内**沿既有类内次序(edges/freehand 同层内先边后笔、visuals/members 按 z_index)——既有板观感在"全默认层"时不变;
3. **edges 跨层规则**:边渲染归**两端点中较高的层**;任一端点所在层隐藏→边隐藏;
4. **显隐语义**:隐藏层的对象不渲染、不命中(框选/点选/删除/连线起点全排除);staging 名单不受层影响;
5. **UI**:图层面板(chrome 按钮唤出的小浮层):列表(自定义层+Base)、Add layer、双击改名、拖序、眼睛 toggle;**活动层**概念:面板选中的层=新建对象(pen/chalk/搬迁落板/staging Place)的归属层(默认=Base);对象归层:选中(含多选)→selectionBar "Move to layer" 下拉;
6. **删层**:层内对象全部迁回默认层(⛔ 删对象),确认框明示 N 件将迁回;
7. **undo 栈**:对象换层=PATCH 入单 4 命令栈(generic);层自身增删改名排序⛔入栈(v1);
8. ⛔ 新 event verb;⛔ 动 staging/搬迁批次;层数上限 12(常量,防失控)。

## 一 · 交付面

- 迁移+base schema+validators/DTO/hydrate(layers CRUD 路由+member/visual PATCH 收 layer_id);
- 渲染容器化重构(BoardPage 分层渲染管线);
- 图层面板+活动层+Move to layer+显隐+删层迁回。

## 二 · 裁量与停线

- 停线举证不改判;渲染重构若与单 4 命令栈/多选命中织合出乱序或命中错层→停线;
- 全默认层时观感回归:既有 smoke 断言不破(层序清算⛔改变默认观感)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Boards 全目录+modal/staging/tools)不破;
- 冒烟六条:①建两层,两卡各归一层,拖层序→前后遮挡关系互换,重开保持;②隐藏一层→层内对象不可见不可框选,跨层边(端点在该层)隐藏;恢复显示全回;③删自定义层→N 件确认→对象迁回 Base 不丢,几何不变;④活动层选自定义层→新画一笔/新 chalk 落该层;⑤多选三对象 Move to layer 一步归层,Ctrl+Z 回原层;⑥旧板(全 NULL)渲染观感与既有 smoke 一致。

## 四 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。
