> **From**: fable
> **To**: codex
> **Status**: ready(两层制;13.2 单 5=双模退役,13.2 最后一张工程单)
> **日期 (Date)**: 2026-09-08
> **性质**: 施工单(client+server;迁移已落地(旗标 v2),野地面已清零)

# 13.2 · 单 5 · 双模退役(canvas 入口摘除 + 新写禁令)

## 〇 · 上游(先读,顺序)

1. 段 plan 单 5:`plans/v13-2-wilderness-retirement-plan.md`;
2. 图三 §四(退役语义:退役=新写禁令,⛔ 删值删列):`analysis/2026-09-07-wilderness-migration-mapping.md`;
3. 单 0 侦察第 1 题(workspace/crossing 字面量登记面全表——本单要封的每个写口):`analysis/2026-09-07-v13-2-s0-recon.md`。

## 一 · 口径(冻结)

1. **canvas 模式入口摘除**:page/canvas 切换控件从 UI 移除(page 唯一);任何持久化/深链里的 mode='canvas' 读到即静默落 page;canvas 模式的代码本体⛔ 删除(归清册);
2. **新写禁令**:server validator 拒收新写 `surface='canvas_workspace'` 与 `boundary_role='crossing'`(4xx 带明确错误名);client 写路径类型收窄;既存历史行**读取照旧**(⛔ 删枚举值⛔ 删列⛔ 动历史数据);
3. **登记面逐口封**:按单 0 第 1 题表逐一处置仍可产生 workspace/crossing 新写的现役口(含修复脚本类)——封新写,⛔ 动其读取/历史职能;逐口在 Result 申报处置;
4. **死代码清册**:canvas 模式 UI/手势/控制器/样式的文件+行级清单落 `docs/agent-ops/analysis/2026-09-08-v13-2-canvas-deadcode-inventory.md`(13.6 收官删除时用),⛔ 本单删除任何代码;
5. **零变化面**:page 全行为、准备区、坐标契约 v2 语义、执行器、史记、Source 只读策略。

## 二 · 验证(段纪律)

1. client+server typecheck/build;
2. 单测:validator 拒收两值(错误名断言)+ mode='canvas' 深链落 page;
3. 一条冒烟(fixture):切换控件不存在;带 canvas mode 的旧路由/持久态打开即 page;尝试新写 workspace 被 4xx 且零落库。

## 三 · 回执与边界

apply_patch 追加 ## Result(逐口处置表+numstat+验证输出+未做);⛔ commit(工作树交 HQ);⛔ 读 .env;⛔ 打印 key;⛔ 接触用户库;不动 3001/5173。现物冲突⇒停线举证。
