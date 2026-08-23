> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(12.2a-1b 已复核 PASS 并接入主链,manifest 已在;Fable 放行 log 08-22 #9) | re: v2bn12-2a-1c | date: 2026-08-22

# V2.BN.12.2a-1c:机械门重写(只吃 manifest)

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。
> **开工条件已满足**:12.2a-1b 主单/fix/fix2 三张均已 `done`(复核 PASS 0B/0H/0M/1L),`docs/generated/tool-face-manifest.json` 已存在并由三道门守着(`test:tool-face-registry` / `test:tool-face-manifest` / `check:tool-face-manifest`,均已接入 `verify:v2-bn8-runtime`)。

## 定位

前身 `scripts/check-tool-face-parity.mjs` 复核判 **FAIL(方向不成立)**:它从源码截片 + `new Function` 取条目,`routeMounted()` 只做前缀命中,`rawMethod` 根本不参与判断,client 侧只验「有个同名 symbol」。**reviewer 在隔离 worktree 用 `POST /api/health/not-real` + 伪 call-site 实测,门仍 `[PASS]` exit 0。**

> **本单是重写,不是修补。** 请按「只吃 manifest」重新设计,**不要试图救活旧实现的路径**。

## 上游

`analysis/2026-08-21-mcp-tool-face-design.md` **v0.5 §3.1「机械门口径随之修正」**(三条)+ 前身工单 `## Review` HIGH-1 / MED-1 / MED-2。

## ⭐ 上游设计不变量(2026-08-22 新立,直接决定本单职责)

> **manifest = 注册表的忠实投影,不是暴露清单。**
> **过滤只许发生在两处:①本单的机械门 killer ②12.2b 的 MCP `tools/list`(`exposure==='public'` 且剔 `__` kind,TD-4)。**

**这条对本单的含义要说透**:

manifest 里**会**出现 `exposure:'test'` 与 `__` 前缀的条目 —— **这是刻意的,不是上游没滤干净。** 若生成器提前滤掉,**你的两条 killer 将永远见不到靶子,门会变成永远不会红的绿灯** —— **那正是 S1 第一版失败的形状(对伪造数据判绿)。**

⇒ **本单是「拒绝」这件事第一次真正发生的地方。** 你的门必须**主动认出并拒绝**它们,而不是假设上游已经处理过。

## 交付物

**重写 `scripts/check-tool-face-parity.mjs`**:输入**只有** `docs/generated/tool-face-manifest.json`。**⛔ 禁止 `new Function`、禁止解析任何源码取条目。**

### 判据(必须真的成立,不是形式上跑一遍)

| # | 要求 |
|---|---|
| **G-1 route 须组合验证** | 建立 `{method, fullPath, mountedRouterModule}` 路由图:组合 `server/src/index.ts` 的 mount 与对应 router 模块的 leaf route,**`method` 必须参与比较**(前身 `rawMethod` 只进报错文字)。**前缀命中不算命中。** |
| **G-2 client 侧须验构造** | containment 用 `path.relative()` **严格限定在 `client/src`**(前身 `CLIENT_ROOT` 实为 `client/`,与报错文字自相矛盾);且须在声明的 file/symbol **内部**至少核对**相同 method + 规范化 URL 字面/模板前缀** —— **「存在同名 symbol」不构成「该 symbol 构造了该 URL」。** |
| **G-3 空表不得 PASS** | manifest 为空或 0 条 public 时,输出「0 条 public 条目受检,未证明任何 parity」并 exit 0,**不得输出 PASS 字样**。 |
| **G-4 成功输出须自陈边界** | 成功输出须形如 `[PASS] tool-face necessary-condition gate: N public entries checked; human reachability NOT VERIFIED; journey pending`。**必须报条目数**;**不得宣称证明了「人类可达」**——那是必要条件,充分性由 S7 旅程补。 |
| **G-5 三条独立 killer** | ①真实 route 正控(用真实存在的 route + 真实 client 调用点,须绿)②`exposure:'test'` 条目进 public 派生面须红 ③`__` 前缀条目进 public 须红。**②③ 必须彼此独立可触发**(前身条件 `public && test` 恒假)。 |

## ⭐ 本单是「单交付物」

**只重写 `scripts/check-tool-face-parity.mjs` 一件。** 设计已拍死(§3.1 及其 08-22 补注),不留设计余地;**若你认为设计有问题,停手标 `needs: claude`,不要自行改设计。**

## 可顺带清理的两项(**非必须,做了要申报**)

| 项 | 说明 |
|---|---|
| **旧脚本的死引用** | 现 `scripts/check-tool-face-parity.mjs:8` 仍 import 已删除的 `shared/types/toolRegistry`,独立手跑 exit 1(「未找到 ToolRegistry」)。**本单重写它,该引用自然消失** —— 请确认重写后全仓对 `shared/types/toolRegistry` 的引用为 **0**(阳性对照:先证明探针能命中重写前的那一处)。 |
| **fixture 名实不符**(TD-1b 清理项) | `scripts/generate-tool-face-manifest.test.ts` 里 `internal_probe` 的 exposure 实为 `public`。**上一轮正因有人按名字推断而写出不实叙述。** 若你触及该文件可顺带对齐名实(**killer 强度不得下降** —— 基数断言须在加过滤时仍红);**不触及则不动**。 |

## 边界

**允许**:`scripts/check-tool-face-parity.mjs` 重写 · 相应常驻测试 · `package.json` 脚本条目。
**⛔ 不得**:改 `server/src/toolFace/registry.ts` 或 manifest 生成器(**上游权威,你只消费**;若 manifest 缺字段,**停下标 `needs: claude`,不要自行加字段或绕过**)· 接线进 `verify:v2-bn8-runtime`(待复核 PASS 后由调度方接)· 碰 12.1 线 / v1 线 / legacy `toolDefinitions`。

> ⭐ **本单最重要的边界**:你手里除了 manifest 什么都没有。**若你发现自己想去读源码取工具信息,那就是前身失败的那条路** —— 停下,报缺字段。

## ⭐ 12.1 线四轮的实证教训(本单直接吃,不是套话)

| # | 教训 | 出处 |
|---|---|---|
| 1 | **「API 不存在」的红不承重** —— 红必须来自「实现存在但写错」,不是「函数没定义」 | 12.1.3 复核 FAIL 的直接原因 |
| 2 | **测了逻辑 ≠ 测了接线** —— 6 条测试全绿,而删掉生产调用者后**依然全绿** | 12.1.3 复核 X3 |
| 3 | **mock 掉正门 = 护栏自证** —— harness 整体 mock 生产中间层,把该正门关键入参改坏仍 209/209 全绿 | 12.1.4 复核 FAIL 落点 |

**对本单的具体要求**:G-5 三条 killer 的红,**必须由「门存在但判错」触发**;若你的测试是「门函数不存在所以报错」,不算数。**并且须有一条能杀死「门根本没被调用」。**

## D. 探针先过阳性对照(`adjudication §7`,含反面分则)

- **正面**:任何阴性断言前,先让同一探针看见一个已知阳性实例。
- ⭐ **反面(2026-08-22 新立)**:**先确认探针的命中不是来自你自己刚写进去的东西。** 阳性对照防「探针瞎了」,防不了「探针照见了自己」。
- 📌 **本环境陷阱**:`.git/index` 只读 ⇒ `git status` porcelain 有 stat/EOL 假阳性 `.M`;`git diff --stat` **不显示 untracked**。**判文件是否真改用 blob 哈希或 `--numstat`。**

## 验证与回执

门禁 docs-first 顺序;回执纪律 README Builder 1–3(含 **UTF-8**);**M-1 mutation 归复核方**(你的 self-test 只作前置自查)、**M-2 header 不由你翻**。

**回执须含**:G-1..G-5 逐条如何满足(**G-5 三条 killer 各给一段实际输出**)· 路由图构建方式 · manifest 消费方式(证明零源码解析)· 四门逐条收据 · 触及面 diff vs 申报 · 显式范围排除。
