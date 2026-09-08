> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.3 单 2=板 UI MVP,client 大单)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单(允许多轮内部推进,公共接线一人顺序整合)

# 13.3 · 单 2 · 板 UI MVP + 旧 Purpose 消费面对齐

## 〇 · 上游(先读,顺序)

1. 段 plan 单 2:`plans/v13-3-board-mvp-plan.md`;
2. 单 1 Result §2(HTTP 契约表,本单唯一后端接口来源)与 §4(client 受影响消费面清单,本单首块任务书):`handoffs/2026-09-08-v13-3-s1-data-layer-order.md`;
3. 图二 §一/§四(板与成员语义);单 0 报告 §二(UI 挂点侦察)。

## 一 · 口径(冻结)

**首块 · 旧 Purpose 消费面对齐**(单 1 §4 清单逐项核销):DTO nullable/sealed 三态保真;旧 writer 出口摘除(纸内 savePurposeFrames/成员增删角色排序、Gallery 的 upsertDefaultPurposeRoleForContentGroup 与 saveGalleryRecord 的 purposes 出口);410 面⛔ 吞成保存成功(出口摘除后自然无 410 可见);Relation 出生魂选择改库级魂来源(⛔ 连出生引用一起退役);删除后果文案两处对齐库级弱标签语义;⛔ 借机重做纸行为。

**板 UI MVP:**

1. 路由与入口:`#/boards`(列表)+`#/boards/:boardId`(板页);侧栏库级 "Boards" 入口(UTILITIES 或 PROJECTS 同层,K-0 §二 挂点侦察为准);
2. **开板立魂(排气式)**:新开板=一个输入框(那句人话)+可选"挂靠已有魂"选择器(列库级魂);魂被占→409 提示换魂或进那块板;⛔ 表单仪式⛔ 多步向导;
3. 板面:note/content_group 投影上板(缩影卡:标题+摘要行,真相不搬家)、拖拽摆放/缩放/z 序/pinned、成员间连线(board_edges)、**双击成员进纸**(/notes/:id);
4. 板视口:自由平移缩放(PATCH viewport 持久化);**⛔ 触碰纸的三档与纸内排版**(两把标尺各回各家=本段核心判据);
5. 画笔基础档:freehand 落 visuals API(points/path/style),板上绘制/删除;
6. ⛔ 面:删板 UI/改魂 UI/准备区搬迁(单 3)/item·text_range 成员/事件面扩展/纸行为。

## 二 · 验证(段纪律)

1. client typecheck/build;
2. 单测:board repository/types/hooks + 首块对齐回归(旧 writer 出口摘除后 Gallery/纸保存链零 410 报错);
3. 一条冒烟(fixture 或 jsdom):开板立魂→三篇笔记上板连线→重开不丢;板 viewport 缩放后开纸,纸内几何与三档零变化(判据申报采样值)。

## 三 · 回执与边界

apply_patch 追加 ## Result(numstat+验证+未做);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印 key;⛔ 用户库;⛔ server 施工(契约不够用=停线举证,⛔ 自行加端点);不动 3001/5173。现物冲突⇒停线举证。
