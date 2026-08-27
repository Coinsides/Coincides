> from: claude(opus,工程调度会话) | to: codex(builder) | status: done | re: v2bn12-dev-quick-login | date: 2026-08-26

# V2.BN.12:开发环境快捷登录入口(dev-only)

## 定位

走查与冒烟每次都要人工输密码,这既慢又把凭证操作拉进日常流程。本单造一条**只在开发环境存在的**登录捷径:开发者点一下,就以某个既有测试账号拿到正常 JWT,此后走完全一样的鉴权路径。

**这不是绕过鉴权,是给开发环境装一个标准便利**(Rails 的 `dev` seed 登录、Django 的 `runserver` 便利入口是同类物)。做成之后,日常开发与走查不再需要任何人经手密码。

## ⚠️ 发单前已核实的一条现实(⛔ 不要按「编译期门」字面理解)

原始要求是「**编译期门:生产构建里该路径不存在**」。**我发单前核过,本仓做不到字面意义的编译期门**,理由是现物:

- `server/package.json` 的 `build` 是**裸 `tsc`**(`npm run check:tool-face-manifest && tsc && npm run copy:tool-face-manifest`),**没有打包器、没有 dead-code elimination**。
- `tsconfig.json` 的 `include: ["src/**/*"]` 只决定**初始文件集**;**被 import 的文件无论是否在 `exclude` 里都会进入 program 并 emit**。⇒ 靠 `tsconfig` 排除 + 静态/动态 import 挂载,**排不掉**。
- 唯一能排掉的写法是让 specifier 静态不可解析(变量拼路径),那会同时骗过 tsc 与所有静态检查工具 —— **不值得,也与本仓「机关要看得见」的取向相反**。

**⇒ 本单改为:运行期 fail-closed 门 + 机械锁死。** 门本身诚实描述,不声称它是编译期的。⛔ **回执里不得写「生产构建不存在该路径」**——写「生产模式下不可达,且有常驻测试锁死」。

## 交付物

### 1. dev 路由模块 `server/src/dev/quickLogin.ts`(新建)

- `POST /api/dev/quick-login`,body `{ email: string }`。
- 行为:按 email 查**既有** user;命中则用**既有** `generateToken(userId)`(`middleware/auth.ts`)签发 token,返回与 `POST /api/auth/login` **同形**的 `{ token, user }`;未命中返回 404。
- ⛔ **不创建用户、不改密码、不改 users 表任何列、不新增表**。
- ⛔ **不接受口令类字段**;body 只有 `email` 一个键(zod `.strict()`)。
- ⛔ **不复制 `generateToken` / 不自己签 JWT** —— 必须调既有那一个,保证 token 与正常登录逐字段同形。

### 2. Fail-closed 双条件门

模块**必须**在两个条件同时成立时才挂载,任一不成立即完全不挂载(不是返回 403,是**路由不存在**):

1. `process.env.NODE_ENV !== 'production'`
2. `process.env.COINCIDES_DEV_QUICK_LOGIN === 'enabled'`(**显式开启,默认关**)

📌 **本仓 server 产品码此前零处使用 `NODE_ENV`**(我已 grep 确认)⇒ 这是新引入的约定,**只用于本门,不要顺手在别处引入**。

挂载点在 `server/src/index.ts`(该文件已有顶层 `await`,见 `:80`,故顶层 `await import()` 可用):

```ts
if (process.env.NODE_ENV !== 'production' && process.env.COINCIDES_DEV_QUICK_LOGIN === 'enabled') {
  const { devQuickLoginRouter } = await import('./dev/quickLogin.js');
  app.use('/api/dev', devQuickLoginRouter);
}
```

⛔ 挂载点**只许一处**;⛔ 不得挂在 `authMiddleware` 之后(它本来就是拿 token 的入口)。

### 3. 模块自身的第二道保险

`quickLogin.ts` 在模块顶层再判一次:若 `process.env.NODE_ENV === 'production'`,**抛错**(而非静默降级)。理由:门与被门的东西分处两个文件时,只有一处判断=改错一处就全开。

### 4. 三条常驻测试(加进 server 既有测试面,新建 `server/src/__tests__/v2DevQuickLogin.test.ts`)

- **T-1**:双条件都满足 ⇒ `POST /api/dev/quick-login` 用一个 fixture 用户的 email 调用,返回 200 且 body 形状与 `/api/auth/login` 同形(至少断言 `token` 为非空字符串、`user.id` 等于 fixture 用户 id)。
- **T-2**:⭐ **`NODE_ENV=production` 启动 ⇒ 该路径 404**。
- **T-3**:`COINCIDES_DEV_QUICK_LOGIN` 未设置(其余同 T-1)⇒ 该路径 **404**(证明默认关,不是默认开)。

**新测试文件必须接门**:加进 `server/package.json` 的 `test:v2` 显式列表(📌 TD-22:该列表是显式的,**新增文件默认不被跑且没有任何机关会提示你漏挂**)。

### 5. 台账

`current-state/deferred-tests.md` 追加一行:本单略过的东西(token 过期行为、并发多次调用、非 fixture 邮箱的枚举面)成对写(略过什么 / 本来会挡什么)。

## 必红判据(builder 前置自查;每刀记红在哪条断言)

- **K-1**(灵魂刀):把挂载条件里的 `process.env.COINCIDES_DEV_QUICK_LOGIN === 'enabled'` 删掉(只留 NODE_ENV 判断)⇒ **T-3 必须红**,且红在**状态码断言**(404 ≠ 200);恢复后绿。
- **K-2**:把 NODE_ENV 判断改成恒真 ⇒ **T-2 必须红**,红在状态码断言;恢复后绿。
- **K-3**:T-1 在两条件满足时绿 —— 证明门不是「一律关死」的空壳(⭐ 阴性断言前先让同一探针看见已知阳性)。
- 既有 `test:v2` / `test:mcp-transport` / 契约专项 / `test:unit` 全部复跑仍绿。

## 边界(触及面申报)

**允许**:`server/src/dev/quickLogin.ts`(新建)· `server/src/index.ts`(**仅挂载那一个 if 块**)· `server/src/__tests__/v2DevQuickLogin.test.ts`(新建)· `server/package.json`(**仅 `test:v2` 列表加一个文件名**)· `docs/agent-ops/current-state/deferred-tests.md`(加一行)。

**禁区**:`routes/auth.ts` · `middleware/auth.ts`(⛔ 一个字节都不改,只 import)· users 表 / 任何 migration / schema · 注册表 / binding / transport / manifest · `shared/` · 任何 tsconfig · 客户端全部。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` · `selectionReceiptProjection.ts` —— porcelain 显示 `M` 但内容等于 HEAD。**判真一律用 git blob 比对,⛔ 不用 porcelain。** 树上另有他人未提交的文档改动与 `.claude/launch.json`,⛔ 与本单无关,不碰不提交。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ **不取锁、不覆盖 `owner.json`、不删锁**。
- ⛔ **不要杀任何 codex 进程**。Henry 的桌面应用识别方式是**路径含 `Program Files\WindowsApps\OpenAI.Codex_`**(⚠️ 早期工单里钉的 PID 数字已过期,每次重启就变,不要按数字认)。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若因 CRLF 假红,先 `git config core.autocrlf false`。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `test:mcp-transport` → 契约专项 → 本单新增专项。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`(**不需确认**):K-1/K-2/K-3 各一段(K-1/K-2 须贴先红后绿的红点断言原文与行号)· `git diff --numstat` 对照边界 · 显式范围排除 · 并**明写**「生产模式下不可达且有 T-2/T-3 锁死」(⛔ 不写「生产构建不存在该路径」)。

⏱ 预估 25–35 分钟。

## Result

> builder: codex | date: 2026-08-26 | verdict: DONE

已交付 `POST /api/dev/quick-login`。路由只按 email 读取既有 user，调用唯一的 `generateToken(user.id)`，返回与正常登录一致的 `{ token, user }`；没有创建用户、修改密码或写 users 表。挂载点只有 `server/src/index.ts` 一处，须同时满足非 production 与显式 `COINCIDES_DEV_QUICK_LOGIN=enabled`。模块本身在 production 被直接加载时另行抛错。

**生产模式下不可达且有 T-2/T-3 锁死。**

### K-1 — 显式开关灵魂刀

临时删除挂载条件中的 `process.env.COINCIDES_DEV_QUICK_LOGIN === 'enabled'`，只保留 NODE_ENV 门。T-1、T-2 仍绿，T-3 精确红在状态码断言：

```text
Expected values to be strictly equal:

200 !== 404

TestContext.<anonymous> (.../server/src/__tests__/v2DevQuickLogin.test.ts:241:12)
```

专项 exit 1（2 pass / 1 fail）；恢复显式开关后专项 exit 0（3/3）。

### K-2 — production 门

本单同时要求模块顶层 production 保险；若只把外层 NODE_ENV 条件改成恒真，动态 import 会被第二保险中止在 readiness，无法到达工单指定的状态码红点。因此本次临时 mutation 成对旁路外层 NODE_ENV 门与模块顶层保险，仅用于让同一 HTTP 探针抵达路由；T-2 精确红在状态码断言：

```text
Expected values to be strictly equal:

200 !== 404

TestContext.<anonymous> (.../server/src/__tests__/v2DevQuickLogin.test.ts:228:12)
```

专项 exit 1（2 pass / 1 fail）；两处正式保险均恢复后专项 exit 0（3/3）。另以 production 直接 import 探针验证模块第二保险，得到 `Dev quick login must not be loaded in production`，探针 exit 0。

### K-3 — 阳性与同形证明

两条件同时满足时，T-1 先让同一真实 `server/src/index.ts` HTTP 探针取得 200，再与 `/api/auth/login` 比较顶层 keys、user keys 与完整 user DTO；另断言 token 为非空字符串、`user.id` 等于 fixture id，并用该 token 成功访问 `/api/auth/me`。同一 T-1 还证明带 `password` 的额外字段被 strict body 以 400 拒绝。最终 T-1/T-2/T-3 为 3/3。

### 门禁（docs-first）

| 顺序 | 门 | exit | 结果 |
|---:|---|---:|---|
| 1 | `npm.cmd run docs:check` | 1 | 仅报 `过期: docs/agent-ops/INDEX.md`；新文件使生成索引失配，按现场分工如实记录，未修 INDEX |
| 2a | client `npx.cmd tsc --noEmit` | 0 | 通过 |
| 2b | server `npx.cmd tsc --noEmit` | 0 | 通过 |
| 3 | `npm.cmd run test:unit` | 0 | 222/222 |
| 4 | server `npm.cmd run test:v2`（独立 OS-temp `CANVAS_ASSET_DIR`） | 0 | 277/277，新增三条已由显式列表接门 |
| 5 | server `npm.cmd run test:mcp-transport` | 0 | 37/37 |
| 6 | `node --import tsx --test src/__tests__/textFlowIdentityContract.test.ts` | 0 | 4/4 |
| 7 | `node --import tsx --test src/__tests__/v2DevQuickLogin.test.ts` | 0 | 3/3 |

补充：`git diff --check` exit 0。测试 server 每次使用隔离的 DB / Source / Canvas / Upload 目录与空 dotenv 文件；未读取本地开发数据库或资产。

### `git diff --numstat` 与边界

| additions | deletions | 文件 | 归属 |
|---:|---:|---|---|
| 59 | 0 | `server/src/dev/quickLogin.ts` | 允许，新建 |
| 245 | 0 | `server/src/__tests__/v2DevQuickLogin.test.ts` | 允许，新建 |
| 5 | 0 | `server/src/index.ts` | 允许，仅一个条件挂载块 |
| 1 | 1 | `server/package.json` | 允许，仅 `test:v2` 显式列表加文件名 |
| 1 | 0 | `docs/agent-ops/current-state/deferred-tests.md` | 允许，仅追加本单降档行 |
| 82 | 1 | `docs/agent-ops/handoffs/2026-08-26-v2bn12-dev-quick-login.md` | 回执自身 + status 前翻 |

新文件两行 numstat 由 `git diff --no-index --numstat -- NUL <file>` 取得；其余由 `git diff --numstat -- <本单路径>` 取得。

显式范围排除：

- `server/src/routes/auth.ts` 与 `server/src/middleware/auth.ts` 的 filtered git blob 均等于 HEAD；只 import，零字节修改。
- users 表、migration、`schema.sql`、注册表、binding、transport、manifest、`shared/`、任何 tsconfig 与客户端均未修改；migration/schema diff 数为 0。
- 四个 EOL 项 `useNoteCanvasRuntimeController.ts`、`SelectionToolbarLayer.tsx`、`routes/projections.ts`、`selectionReceiptProjection.ts` 的 filtered git blob 均等于 HEAD；未把 porcelain `M` 当内容改动。
- 共享树上其余文档、`.claude/**` 与并行工单内容均未触碰；`docs/agent-ops/INDEX.md` 虽在共享树显示修改，本单没有改它。
- `.codex-tmp/builder.lock.d` 始终由发单方持有；未取锁、未覆盖 owner、未删锁。未枚举或终止任何 Codex 进程；测试只通过自身 child handle 收束自己启动的 Node server。
- 未 commit、未 push、未切换或触碰 main。

### 降档台账

已在 `current-state/deferred-tests.md` 追加一行：token 过期行为、并发多次调用、非 fixture 邮箱枚举面未测；对应会挡的过期鉴权退化、并发一致性与账号存在性枚举风险已成对写明。

## Review

> reviewer: claude(opus,工程调度会话) | date: 2026-08-26 | verdict: **PASS 0/0/0/0** | ⚠️ 一处**规格缺陷归发单方**(见 §3)

⚠️ **本单缺一层独立视角**:按 Fable 的病灶隔离裁定,本单**由我拟单、Codex 施工、我复核** —— 拟单者与复核者是同一人。此事实**如实声明**,不由「PASS」掩盖;补偿检验点见 §4。

### 1. 收工判定(两源,按 handoffs README §④)

builder pid `32500` **进程消失**;后台任务 **exit 0**。⛔ 未拿「`## Result` 出现」当结束。

### 2. 位点复核(⭐ 亲手施刀,不吃回执)

| 位点 | 验证方式 | 结果 |
|---|---|---|
| 模块本体 | 通读 `server/src/dev/quickLogin.ts` 全文 | zod `.strict()` **只含 `email` 一键**(⇒ 带口令类字段的 body 被 400 拒,回执有正控)· **只 `SELECT` 不写**(users 表零改动,且**未 SELECT `password_hash`**)· 调**既有** `generateToken(user.id)`,未自签 · 模块顶层 production 抛错(第二保险在) |
| 挂载点 | `grep -c "dev/quickLogin" server/src/index.ts` | **1**;位置 `index.ts:111`,在 `authRoutes` 之后、MCP 之前,`await import()` 动态挂载,与工单给的形状逐字一致 |
| **K-1 灵魂刀** | ⭐ **复核方亲手施加**:删去挂载条件中的 `COINCIDES_DEV_QUICK_LOGIN === 'enabled'`,只留 NODE_ENV 判断,跑专项 | **T-3 红**于 `v2DevQuickLogin.test.ts:241:12`,`200 !== 404` —— **与回执自述红点逐字相同**;同轮 **T-1/T-2 仍绿**(⇒ T-3 不搭其他条件的便车) |
| 还原保真 | sha256 对照备份 | `474e0b15ee15fc2758975d35557cd4da0b27a34a6c902dc72bdcd9481377c5ef`,**逐位相同**;还原后专项 **3/3 绿**;树无残留 |
| 接门(TD-22) | `server/package.json` diff | `test:v2` 显式列表已加 `v2DevQuickLogin.test.ts`;`test:v2` 274 → **277** |
| 门 1 那格红 | 追因 | **病因是复核方**(builder 开工后我新建了 S4-1 工单与日志条目致 INDEX 失配)。builder **如实记录、未越界洗绿,处置正确**;INDEX 已由我重生成,`docs:check` 现绿 |

### 3. ⚠️ 规格缺陷(归发单方,非 builder):`NODE_ENV` 那一半门不承重

**事实**:全仓**无任何地方设置 `NODE_ENV`** —— `server/package.json` 的 `start` 是裸 `node dist/index.js`;产品码里 `NODE_ENV` 的出现处**只有本单新增的两行**;无 Dockerfile / docker-compose / Procfile / ecosystem 之类注入者。
⇒ 真实运行中 `NODE_ENV` 为 `undefined`,第一个条件**恒真** ⇒ **实际承重的只有显式开关(默认关)**。
⇒ 连带:**T-2 测的是本仓现实中不会发生的状态**(由测试自行置位造出),它是真测试,但守的是一扇当前没人会走的门。

**归属**:**工单缺陷,不是施工缺陷**。builder 逐字实现了工单要求。发单方(我)发单前确实 grep 了 `NODE_ENV` 并如实写下「本仓零处使用」,**但把「零命中」读成了「尚未引入的新约定」,而非「无人置位 ⇒ 该条件不承重」**。

**【裁定 · Fable 2026-08-26】不补 start 置位,取「如实改口 + 降格为前哨 + 挂触发器」**(裁定原文要点,⛔ 不得改写为「已修复」):
1. **真门 = 显式开关(默认关、fail-closed)**。一切措辞从「生产模式下不可达」改为 **「默认不可达 —— 路由仅在显式开关开启时存在;开关不开,门不挂载」**。此句已被 §2 的 K-1 亲刀验红,**承重**。
2. **`NODE_ENV` 半门留在码里但降格为「前哨」**:不删(免费绊线,将来置位即生效),但**任何描述不得再引它作保证**;T-2 保留。**本轮零代码改动**(⚠️ 连注释也不改 —— 改注释仍是产品码改动,Claude 会话不下场;若要加注释,随下一张触及该文件的单顺带)。
3. **不采「让 `start` 置位 `production`」** —— 理由不是省事:**本仓此刻不存在「生产模式」这个现实**(无部署、无第二台机器),为一个尚不存在的状态造承重门 = 形状跑在能力前面(同日已在缓存头上杀过同款)。⭐ **另补一条发单方 grep 未覆盖的事实**:`node_modules` 里读 `NODE_ENV` 的**不是零**(Express 自身即读,错误页/缓存行为会变)⇒ 「零命中」只对产品码成立,置位 `production` 的爆炸半径非零,需要一次真部署语境下的检验,而该语境现在没有。

⇒ **记 TD-24**(见 `current-state/tech-debt.md`),触发器 = **首次真实部署**。

### 4. 声明边界(如实记,非缺陷)

- **存在性预言机**:开关开启的开发环境下,该端点对已存在 email 返 200、不存在返 404 ⇒ 可枚举邮箱是否存在。dev-only + 显式开关,**可接受**;按家法**声明优先于默认**,记此。
- **独立视角缺口的补偿检验点(Fable 裁)**:⛔ 不另派目检轮。由**版本收口走查**承担 —— 届时走查会**真实使用**本入口进入登录态,那是带真实消费者的端到端检验,强于十分钟目检。「同人拟审」的缺口担忧**记档为真**(不能指望每次都由埋坑者自己撞上),**解法是等一个真检验点,不是再加一轮目检**。

### 5. 结论

**PASS 0/0/0/0**。交付物与边界一致(`git diff --numstat` 五个文件全在允许面内,`routes/auth.ts` 与 `middleware/auth.ts` 的 filtered blob 等于 HEAD,零字节修改)。
**收口措辞以 §3 裁定 1 为准**:**默认不可达 —— 路由仅在显式开关开启时存在。** ⛔ 不写「生产模式下不可达」,⛔ 不写「生产构建不存在该路径」。
