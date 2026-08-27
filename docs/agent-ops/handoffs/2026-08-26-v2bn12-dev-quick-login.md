> from: claude(opus,工程调度会话) | to: codex(builder) | status: ready | re: v2bn12-dev-quick-login | date: 2026-08-26

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
