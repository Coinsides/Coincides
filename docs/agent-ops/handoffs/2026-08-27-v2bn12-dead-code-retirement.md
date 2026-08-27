> from: claude(opus,工程调度会话) | to: codex(builder) | status: ready | re: v2bn12-dead-code-retirement | date: 2026-08-27

# 收口批:两处死码退役(`proposalStore` + `loadRelation`)

## 定位

两处**零引用死码**,同形状同风险,合成一单做完。**⛔ 但必须两个独立 hunk + 两条独立断言** —— 它们各自有一个**近名物陷阱**,合并断言会踩雷。

**授权链**:TD-27(⭐ 发单前逐字重读过,不照记忆)· Fable 2026-08-26 裁定「并入收口批,两笔:`rm` + 全仓零引用断言,**断言用精确词**」· Fable 2026-08-26 追加「`loadRelation` 前缀会连数 `loadRelations`/`loadRelationTypes`,**进单时写成 killer**」。

## ⚠️ 两个近名物陷阱(⭐ 现物实测,不是提醒,是数据)

### 陷阱 A:`proposalStore` vs `/api/proposals`

- **要删的**:`client/src/stores/proposalStore.ts` —— 实测 `grep -rn "proposalStore"` 于 `client/src` + `server/src`(含测试)**除自身外零命中**。
- ⛔ **严禁一起清的活系统**:`server/src/routes/proposals.ts`(`index.ts:138` 已挂载)承载**领域提案**,有真实客户端消费者 —— `CourseDetail.tsx` 的 material-map(`:612`)/ organized-note(`:629`)/ material-reconciliation(`:650`)/ `apply`(`:676`)/ `discard`(`:698`),以及 `TemplateStudio.tsx:526` 的 template-migration。
- ⇒ **断言词必须是 `proposalStore`,⛔ 绝不可用 `proposal` 前缀。**

### 陷阱 B:`loadRelation` 的词边界(⭐ **发单方实测数据,请自己复现一次**)

| 匹配方式 | `relationRepository.ts` | `ContentGroupPanel.tsx` | 结论 |
|---|---:|---:|---|
| **前缀** `loadRelation` | **3** | **5** | ❌ 看上去「在用」—— 实为连数了 `loadRelations` / `loadRelationTypes` |
| **词边界** `\bloadRelation\b` | **1**(仅 `:40` 自身定义) | **0** | ✅ 真实:零调用者 |

⇒ **用前缀写的「零引用」断言永远不会通过**,而一个粗心的读法会得出「它在用,不能删」的相反结论。
⛔ **`loadRelations` 与 `loadRelationTypes` 是在用的**(`ContentGroupPanel.tsx:448` `:612` `:449`),**一个字节都不许动**。

## 交付物

### Hunk 1:退役 `client/src/stores/proposalStore.ts`

- 删除该文件。
- **常驻断言 A**:全仓(client + server,含测试)对 **`proposalStore`** 的引用数为 **0**。⛔ 断言词精确,不得用 `proposal` 前缀。

### Hunk 2:退役 `loadRelation`(仅该函数,不是文件)

- 从 `client/src/pages/Notes/canvasEngine/relationRepository.ts` 删除 `loadRelation`(`:40-42`)及**仅供它使用**的 import(若有)。
- ⛔ **文件本身保留**;⛔ `loadRelations` / `loadRelationTypes` / `createRelation` / `revokeRelation` / `reaffirmRelation` 一字不动。
- **常驻断言 B**:全仓对 **`\bloadRelation\b`**(⭐ **词边界**)的引用数为 **0**。

### 断言的落点

两条断言放**同一个新建或既有的 client 测试文件**均可,但:
- **必须在常驻门内被跑到**(📌 TD-22:显式列表漏挂没有任何机关会提示)—— client 侧是 `npm run test:unit`(vitest),⚠️ **请自己核实该套件的收集方式**(glob 还是显式列表),据此接门;
- **两条断言必须彼此独立**(各自能单独红),⛔ 不要合成一条「两个名字都为 0」的复合断言 —— 复合断言红时分不清是哪一个。

### 台账

`current-state/deferred-tests.md` 追加一行,成对写。

## 必红判据

- **K-1(断言 A 有鉴别力)**:临时新建一个引用 `proposalStore` 的文件(⚠️ **须语法合法**,例如一行 `import '../stores/proposalStore';` 的临时 ts)⇒ **断言 A 必须红**;删掉该临时文件后绿。
- ⭐ **K-2(断言 B 的词边界,本单的灵魂刀)**:**把断言 B 的匹配从词边界改成前缀**(`loadRelation` 不带 `\b`)⇒ **它必须因为数到 `loadRelations` / `loadRelationTypes` 而红**。
  ⇒ 这证明**词边界是承重的**,不是写着好看。恢复词边界后绿。
  ⚠️ 若你实现断言用的不是正则(例如 AST/精确标识符比对),**那更好** —— 此时把 K-2 改为:**临时把断言目标改成 `loadRelations`** ⇒ 必须红(因为它真的在用);恢复后绿。**如实写明你用的是哪种实现与对应的刀。**
- **K-3(不误伤)**:`loadRelations` / `loadRelationTypes` 的既有调用点在删除后**仍然工作** —— 至少 `npm run test:unit` 与 client `tsc --noEmit` 全绿;若有覆盖 `ContentGroupPanel` 的既有测试,点名它仍绿。
- 既有 `test:unit` / `test:v2` / `test:mcp-transport` / parity 两门 / 契约专项 / `verify:v2-bn8-runtime` 全部复跑仍绿。

## 边界(触及面申报)

**允许**:删除 `client/src/stores/proposalStore.ts` · `client/src/pages/Notes/canvasEngine/relationRepository.ts`(**仅删 `loadRelation` 及其专属 import**)· 承载两条断言的 client 测试文件(既有或新建)· 若新建测试文件且 client 套件是显式列表,则相应配置 +1 · `docs/agent-ops/current-state/deferred-tests.md`(+1 行)。

**禁区**:`server/src/routes/proposals.ts` 与整个领域提案系统 · `CourseDetail.tsx` · `TemplateStudio.tsx` · `panels/ContentGroupPanel.tsx` · `relationRepository.ts` 的**其余全部导出** · `server/**` 的任何产品码 · 注册表 / binding / transport / manifest · `shared/` · 任何 migration/schema · 任何 tsconfig · `pretest:v2` / `scripts/run-server-test-suite.mjs` / `server/package.json` · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**三个:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` —— 判真用 `git hash-object --filters --path` 对 HEAD blob 比对。
- ⚠️ **mutation 必须先证明它自己可编译/可运行**。语法坏掉造成的红只证明树被改坏,**不证明测试有鉴别力**。
- 📌 `server/src/__tests__/v2TestV2ManifestHook.test.ts` **不可独立运行**(断言 `npm_execpath`)⇒ 走 `npm run test:v2`。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。桌面应用识别 = **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`**;⛔ 不用整条命令行做子串匹配,⛔ 不按 PID 数字认。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若红在 `docs/agent-ops/INDEX.md` 过期 ⇒ **发单方的活**,如实记 exit 与原因。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2` → `test:mcp-transport` → parity 两门 → 契约专项 → `verify:v2-bn8-runtime`。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`:**你自己复现的词边界对照数据**(前缀 vs 词边界各自的命中数)· K-1/K-2/K-3 各一段(贴红点原文与行号;K-2 注明你用的是正则还是 AST 及对应刀)· **两条断言各自的接门方式**(client 套件如何收集到它们)· `git diff --numstat` 对照边界 · 显式范围排除。

⏱ 预估 20–30 分钟。
