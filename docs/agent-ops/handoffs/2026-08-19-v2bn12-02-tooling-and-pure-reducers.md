> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: ready | re: v2bn12-02-tooling | date: 2026-08-19

# V2.BN.12 工单 02:测试工装最小集 + pure reducer 抽取 + RED #1 落地

## 背景

工单 01 侦查闭环(builder Result + reviewer Review PASS/4MED + Opus Review-2,见同目录 01 号文件)。诊断确认修复须以测试先行,而 client 无组件级 runner(Review §6)。本单=工装前置,**不修任何 root cause**——为 03/04/05 的 RED 铺路。分支 `fable/v2-bn12-exoskeleton`。

## 任务

1. **client 测试 runner 最小集**:装 Vitest + @testing-library/react + jsdom(dev deps,pin 版本);`client/package.json` 加 `test:unit`;根 `package.json` 转发;**不装 Playwright**(浏览器层后续另单)。配置最小化——不引 Tailwind/不改构建链。
2. **Pure reducer 抽取(只搬逻辑不改行为)**:
   a. 编辑生命周期:从 `useDraftBlockController` / 相关 hook 中抽出可纯测的状态转换核(对应 Review 建议的 `idle→ephemeral-mounted→focused→dirty→persisted` 判定逻辑中**当前已存在**的部分——不实现新状态机,那是 04 的活);
   b. 斜杠事务:从 `useSlashCommandController` 抽 pure reducer(trigger 写入/移除/各退出路径的现状行为),为 05 的 SlashSession 改造建立行为基线快照。
   抽取纪律:行为零变化,`verify:v2-bn8-runtime` 与 `test:v2` 244 基线全绿为证。
3. **RED #1 落地(surface 链 model contract)——验收条件按 MED-2 修正版,一字不许软化**:
   - fixture **必须**使用 persisted entity PageFrame 形状:`{frame.x: 0, contentInset.left: 72, pageOffsetX: 0}`(CourseDetail/entity seed 实测值;**禁用** runtime fallback frame `x=-72`——同一输入在两种 fixture 下分类相反,fallback fixture 会造修前假绿,Review MED-2 + Review-2 ①已双重证实);
   - 断言链:`default Page local layout → project → build payload → hydrate → Page visibility`,期望 `formal_page` 且 Page 可见——**当前应 RED**(在 payload 重分类处失败);
   - **反向正控**:真正拖出 Page 边界的 layout 必须仍被重分类为 `canvas_workspace`——防"永远信 explicit surface"式假修;
   - 现状行为快照测试(非 RED):斜杠各退出路径的 trigger 残留现状、prompt 门计数现状,作为 03/04/05 的对照基线。
4. **申报**:≤10 行顺手修同 01 规矩;RED #1 的 fail 输出原文贴进回执。

## 边界

- **不修 RC-A/B/C/D 本体**;不碰 schema;不装 Playwright/browser 层;不动 `NoteWritingSurfaceLayer` 渲染结构(抽取允许的机械搬移除外)。
- 03/04 拆单预告(供你理解本单地位,不属本单):**RC-A 与 RC-B 将同批修复或带显式存量迁移路径**——Review-2 ②证实症状 2 死胡同是 RC-A.5×RC-B.3 合取,单修任一会留存量笔记半死。

## 验证

`test:v2` 244 基线 + `verify:v2-bn8-runtime` 全绿;新 `test:unit` 跑通且 RED #1 如期红。回执追加 `## Result`,不自评 PASS。
