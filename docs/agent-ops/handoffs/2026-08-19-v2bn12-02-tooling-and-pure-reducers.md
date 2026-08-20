> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: done | re: v2bn12-02-tooling | date: 2026-08-19

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

## Result

> executor: Codex(builder) | date: 2026-08-20 | branch: `fable/v2-bn12-exoskeleton`

### 落地

- client runner 最小集已落地：精确锁定 `vitest@3.2.7`、`@testing-library/react@15.0.7`、`jsdom@26.1.0`，client/root 各加 `test:unit`；新增合并既有 Vite 配置的最小 `vitest.config.ts` 与显式 RTL cleanup。未安装 Playwright、未改 Tailwind 或构建链。lock 与 package 同步；旧 lock 节点零升级、零删除，仅新增测试栈 closure。
- 编辑生命周期已机械抽为 `draftBlockLifecycleReducer.ts`：只拥有现存五字段及现存 transition；同步 refs、async I/O、focus/callback/finally 顺序仍留在 hook。`setDraftText` / `setDraftLayout` API 形状保留，setter no-op 保留 React state identity。prompt selector 仍精确使用 raw `sortedBlocks.length`，未引入 visible/meaningful/creating 判定。
- 斜杠状态已机械抽为 `slashCommandReducer.ts`：只拥有 `{target, activeIndex}`、现存 trigger 文本策略与退出策略。writing-role 的 TextFlow 专用删除路径、disabled/missing/escape/Ctrl+Enter/external-clear 现状及 async null/reject 无 rollback 均保留；deferred hook 测试确认 handler 等待 save receipt。
- MED-2 RED #1 独立落在 `surfacePersistenceContract.test.ts`：literal persisted PageFrame 为 `x=0`、`contentInset.left=72`、`pageOffsetX=0`，真实贯穿 project → payload → normalize/hydrate → Page policy；真越界 stale-`formal_page` 反向正控保持绿色。未修改 RC-A/B/C/D、schema 或 surface 渲染结构。
- 顺手修：0 行。

### 验证收据

- `npm --prefix server run test:v2`：exit 0，244/244。
- `npm run verify:v2-bn8-runtime`：exit 0；159 项 runtime boundary、relation freshness、60 组 model contract、client/server build、performance、diff check、changed-file secret scan 均完成。
- `npm --prefix client run test:unit -- src/pages/Notes/canvasEngine/draftBlockLifecycleReducer.test.ts src/pages/Notes/canvasEngine/slashCommandReducer.test.ts src/pages/Notes/canvasEngine/hooks/useSlashCommandController.test.tsx`：3 files，22/22，exit 0。
- `npm --prefix client exec tsc -- --project tsconfig.json --noEmit`：exit 0。
- `npm run test:unit`：按本工单预期 exit 1；4 files 中 3 green / 1 RED，23/24 tests green；唯一失败为 MED-2 RED #1。原始失败输出：

```text
FAIL  src/pages/Notes/canvasEngine/surfacePersistenceContract.test.ts > Page surface persistence contract > keeps default Page-local layout formal and Page-visible across projection, payload, and hydrate
AssertionError: expected { …(2) } to deeply equal { payloadSurface: 'formal_page', …(1) }

- Expected
+ Received

  {
-   "pageVisibleBlockIds": [
-     "default-page-block",
-   ],
-   "payloadSurface": "formal_page",
+   "pageVisibleBlockIds": [],
+   "payloadSurface": "canvas_workspace",
  }

 ❯ src/pages/Notes/canvasEngine/surfacePersistenceContract.test.ts:104:8
    102|       payloadSurface: result.payload.surface,
    103|       pageVisibleBlockIds: result.pageVisibleBlocks.map((block) => blo…
    104|     }).toEqual({
       |        ^
    105|       payloadSurface: 'formal_page',
    106|       pageVisibleBlockIds: ['default-page-block'],

Test Files  1 failed | 3 passed (4)
Tests  1 failed | 23 passed (24)
```
