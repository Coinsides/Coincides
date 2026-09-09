> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次四单 3;现物证据=单 0 侦察 §三(order_index 已有 055/重排写入口缺/拖入命中链缺/正名清单四处)
> **单号**: 13.4 单 3 · 笔记准备区二件 + 正名

# 13.4 单 3 · 准备区二件 + 正名(笔记侧)

**使命**:笔记级准备区补齐两件手感(盘内重排/拖入),文案正名 Staging/准备区。**⛔ 动板级装卸区(单 7 已收)。**

## 零 · HQ 已裁(⛔ 复议)

1. **盘内重排=全混合 entries**(block/object/mount 一视同仁):按单 0 侦察建议,新增**只写本 note tray placements 排序的小端点**(note-scoped 原子 order 更新,沿既有归属与只读策略);⛔ 为改 order 全量重写 object extensions;⛔ 复用块 PUT 冒充全盘;
2. **拖入手势**:沿 beginMoveBlock 的 onEnd(event) 判准备区目标——命中后清临时布局/吸附,调用移入动作(明确 blockId+拖前 layout),跳过普通纸面几何保存,复用既有 flush 与撤回;**拖中临时推挤必须还原**(撤回=回拖动前布局);pointercancel 清理补上(侦察点名只有 pointerup);
3. **正名射程=只改可见文案**(英 Staging/中准备区):侦察清单四处——NoteRuntimeDocumentLayer 入口"Tray (n)"、NoteTraySidebar 标题/aria/按钮/空态/手势说明、useTrayController 错误与刷新提示、boardRepository 搬板错误提示;**⛔ 动**代码标识符/surface 值/MIME/data 属性/路由/operation_batch 标识/历史数据 label;
4. Sidebar 重排交互形态从简(行拖拽+插入位指示即可,⛔ 动画军备)。

## 一 · 交付面

- server 小端点+validator(note tray 排序批量原子写)+service;
- NoteTraySidebar:行 draggable 全类型化+drop 重排+插入指示;
- 拖入:onEnd 命中判定+移入动作+撤回接线;
- 正名四处文案。

## 二 · 裁量与停线

- 停线举证不改判;⛔ 动板级 staging/搬迁批次/单 7 代码;
- 重排失败=整批拒绝留原序(⛔ 半成功假排序)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(tray 族+canvasEngine 相关)不破;
- 冒烟五条:①混合 entries(块+画物+mount)盘内拖拽重排,重载同序;②重排请求失败→原序保留有错误提示;③纸面块拖进准备区(手势),落盘为 tray 行,撤回回拖前位置(含推挤还原);④未存内容先 flush 再移入;⑤文案四处已正名,拖回纸/split/搬板旧功能照常。

## 四 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(凭据扫描留 HQ)。
