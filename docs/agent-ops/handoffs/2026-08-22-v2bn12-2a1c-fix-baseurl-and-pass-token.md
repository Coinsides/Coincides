> from: claude(fable,上将军代发——Opus 调度会话 20:54 起离线;授权:claude-log/2026-08-19.md 条目1 代理权) | to: codex(builder) | status: ready(Fable 本人翻牌;上游:1c Review FAIL(方向成立)0B/0H/2M) | re: v2bn12-2a-1c-fix | date: 2026-08-22

# 12.2a-1c-fix:机械门两处护栏缺口(baseURL 混合分支 fail-open · P7 裸 PASS 逃逸)

## 定位

修正链第 2 轮。1c 主单 `2026-08-22-v2bn12-2a1c-parity-gate-rewrite.md` 复核 **FAIL(方向成立)0B/0H/2M**:manifest-only、组合 route graph、symbol 内 method+URL 核验、0-public 中性输出、G-5 三 killer、package 接线(P1–P6)**全部成立,不许动**。本单只封两处:

| # | 缺口(复核原文为准) | 交付 |
|---|---|---|
| **MED-1** | `evaluateStaticStrings()`(`check-tool-face-parity.mjs:235-269`)对 conditional 只拼接「能求出的分支」,不携带「某分支不可求」状态;`:310-318` 只要最后恰有一个 unique path 就接受 ⇒ `isDeployed ? import.meta.env.VITE_API_BASE : '/api'` 这种**混合分支仍 PASS**(fail-open)。 | 静态求值返回 `{ values, complete }`:identifier / template / conditional / binary 任一可达子表达式未知即 `complete=false`;`resolveProjectApiBasePath` 在 `complete=false` 时**语义红**(报「base path not fully static」类信息,exit 1)。常驻测试补两条:①纯 env(整体未知)红;②**未知分支 + literal fallback 也红**。现有正控(两支全静态归一 `/api`)必须仍绿。 |
| **MED-2** | `check-tool-face-parity.test.mjs:221-228` 只 `doesNotMatch(/\[PASS\]/)`;在 `[INFO]` 后加裸文本 `PASS remains unproven` 仍 8/8 绿。工单 P7 是「不得含 PASS 字样」。 | 对 **empty manifest** 与 **含 1 条 `exposure:test` 的 0-public manifest** 两个 production CLI 收据的**完整 stdout+stderr** 断言 `/PASS/i` 不命中(或锁定唯一允许的 INFO 文案);**先用 1-public 正控证明同一 probe 能看见 `[PASS]`**(阳性对照写进测试本身)。 |

**必红判据(builder 前置自查;终判归 reviewer)**:①复刻 MED-1 的混合 ternary mutation → 新测试红在「base path not fully static」;②复刻 MED-2 的裸 `PASS` 插入 → 新测试红在 `/PASS/i` 命中;两者还原后全绿。**红必须来自「门存在但判错」,不是函数缺失/语法错**(12.1 线教训 1)。

## 硬闸
- ⛔ 不改 G-1/G-2 其余逻辑、不改 G-5 killer、不改 package 接线、不改 manifest 生成器/注册表/manifest JSON、不碰 `docs/`(INDEX 由调度方已重生成)。
- ⛔ 若封 MED-1 必须改动 route graph 或 client 核验的其他分支:停手,header 不动,回执 `needs: claude` + 理由。
- 回执叙述性主张逐条对照源码抄取(上轮 LOW 教训),不按命名推断。

## 边界(触及面申报)
允许:`scripts/check-tool-face-parity.mjs`(仅 `evaluateStaticStrings` / `resolveProjectApiBasePath` 及其直接调用处的 completeness 传递)· `scripts/check-tool-face-parity.test.mjs`。其余禁区。

## D 段(`adjudication §7`,含反面分则)
阴性断言前先让同一探针看见已知阳性;命中后先问「这个字符串是谁写进去的」(裸 `PASS` 测试尤其:确认命中的是 CLI 输出不是你的 fixture 文案)。📌 共享树 `client/.../useNoteCanvasRuntimeController.ts` EOL 假阳性 `.M`,不是越界;判真改用 `git diff --numstat`。

## 验证与回执
门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → client/server `tsc --noEmit` → `test:unit` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest` → `test:tool-face-parity` → `check:tool-face-parity`,逐门 exit 入表。回执 **UTF-8** 追加 `## Result`;含两段先红后绿输出(红在哪条断言)· 十门表 · `git diff --numstat` 对照边界 · 显式范围排除。**M-1** mutation 终判归 reviewer;**M-2** header 保持 `ready`;不 commit、不 push、不碰 main。
