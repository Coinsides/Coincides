> from: claude(opus,工程调度会话) | to: codex(builder) | status: done | re: v2bn12-dead-code-retirement | date: 2026-08-27

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

## Result

完成。两笔退役保持为独立代码 hunk：删除 `client/src/stores/proposalStore.ts`；从 `relationRepository.ts` 只删除 singular `loadRelation` 五行（函数四行及其后空行）。没有专属于该函数的 import：`api`、`RelationV1` 与 `requireRelation` 均继续被其余活导出使用，因此未删 import。新增 `client/src/deadCodeRetirement.test.ts` 两条彼此独立的常驻断言，并在 `current-state/deferred-tests.md` 成对登记本单未扩的行为级矩阵。

### 开工前词边界对照（亲自复现）

删除前使用 PowerShell/.NET `[regex]::Matches` 分别统计前缀 `loadRelation` 与正则 `\bloadRelation\b`，结果为：

| 文件 | 前缀 `loadRelation` | 词边界 `\bloadRelation\b` |
|---|---:|---:|
| `relationRepository.ts` | **3**（`:35` `loadRelationTypes`、`:40` `loadRelation`、`:45` `loadRelations`） | **1**（仅 `:40` 自身定义） |
| `ContentGroupPanel.tsx` | **5**（`:72`、`:73`、`:448`、`:449`、`:612`） | **0** |

对照与工单现物数据逐项一致：前缀会把活的 plural 名称连数，词边界确实承重。

### 常驻断言与接门

- 断言 A 位于 `client/src/deadCodeRetirement.test.ts:64-67`：目标名由 `['proposal', 'Store'].join('')` 构造，按精确字符串扫描 client/server 代码；没有使用 `proposal` 前缀。
- 断言 B 位于 `client/src/deadCodeRetirement.test.ts:69-73`：目标名由 `['load', 'Relation'].join('')` 构造，实际正则在 `:70` 明写 `\b...\b`。
- 扫描面为 `client/` + `server/` 的 `.cjs/.js/.jsx/.mjs/.ts/.tsx`，包含 `scripts` 与测试；只排除依赖、生成物和覆盖物目录 `node_modules/dist/coverage`。分段构造目标名，故断言文件本身不会用字面量自命中。
- 接门链为 root `npm run test:unit` → `cd client && npm run test:unit` → `vitest run`。`client/vitest.config.ts` 没有 `include` 或显式文件列表，使用 Vitest 默认 glob；正式输出已实际收集 `src/deadCodeRetirement.test.ts (2 tests)`，无需配置 +1。

### K-1：断言 A 鉴别力

先临时建立可编译的 `client/src/deadCodeRetirementMutation.ts`：

```ts
const proposalStore = {};
void proposalStore;
export {};
```

该 mutation 自身先经 client `npx tsc --noEmit`，**exit 0**；随后只跑 A，**exit 1**，红点原文为：

```text
AssertionError: proposalStore references must remain at zero: expected [ …(2) ] to deeply equal []
+ "client/src/deadCodeRetirementMutation.ts:1:7"
+ "client/src/deadCodeRetirementMutation.ts:2:6"
❯ src/deadCodeRetirement.test.ts:66:75
```

删除临时文件后只跑 A，**exit 0**（1 passed / 1 skipped）；临时文件终态不存在。

### K-2：断言 B 的词边界

实现类别是**正则**。对应刀为临时把 `new RegExp(\`\\b${...}\\b\`, 'g')` 改成无边界前缀 `new RegExp(..., 'g')`。该 mutation 自身先经 client `npx tsc --noEmit`，**exit 0**；随后只跑 B，**exit 1**，红点原文为：

```text
AssertionError: loadRelation references must remain at zero: expected [ …(10) ] to deeply equal []
+ "client/scripts/v2Bn11RelationFreshnessContractCheck.mjs:44:4"
+ "client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.tsx:72:3"
+ "client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.tsx:73:3"
+ "client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.tsx:448:7"
+ "client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.tsx:449:7"
+ "client/src/pages/Notes/canvasEngine/panels/ContentGroupPanel.tsx:612:29"
+ "client/src/pages/Notes/canvasEngine/relationRepository.ts:35:23"
+ "client/src/pages/Notes/canvasEngine/relationRepository.ts:40:23"
+ "server/src/toolFace/registry.ts:744:84"
+ "server/src/toolFace/registry.ts:758:84"
❯ src/deadCodeRetirement.test.ts:72:84
```

命中均是 `loadRelations` / `loadRelationTypes` 或承载这些 plural 词的契约/registry 文本。恢复 `\b...\b` 后，client tsc **exit 0**，两条 targeted 测试 **2/2、exit 0**。

### K-3：plural 不误伤

- `ContentGroupPanel.tsx` 一个字节未改；filtered worktree hash 与 HEAD 均为 `757a520ffe0a88422cb4330e99ba1e91b5d8fbaa`。其 `loadRelations` import/调用仍在 `:72/:448/:612`，`loadRelationTypes` import/调用仍在 `:73/:449`。
- `relationRepository.ts` 仍导出 `loadRelationTypes`（现 `:35`）、`loadRelations`（现 `:40`）、`createRelation`、`revokeRelation`、`reaffirmRelation`；最终 diff 只有 singular 函数的删除。
- client `tsc --noEmit` exit 0；完整 `test:unit` **23 files / 224 tests、exit 0**。总门内既有 `check:v2-bn11-relation-freshness` 亦通过，继续静态要求 panel 保有 `loadRelations`。
- 仓库没有直接渲染/交互覆盖 `ContentGroupPanel` 的既有 Vitest；没有虚构该覆盖。未新增的 plural UI 交互矩阵已按降档台账成对登记。

### mutation 运行完整性

首次测试骨架用 `fileURLToPath(import.meta.url)` 定位仓库，在 Vitest/jsdom 收集期报 `TypeError: The URL must be of scheme file`，当时 **no tests**；该红只证明测试骨架不可运行，未计作 killer。改为门禁真实 `cwd=client` 后，先取得 client tsc exit 0 + targeted 2/2，再执行上述 K-1/K-2。两把 mutation 均遵守“先证明可编译，再观察断言红”。

### 正式验证（docs-first）

| 门 | exit | 结果 |
|---|---:|---|
| root `npm run docs:check` | 0 | index + inventory 均最新 |
| client `npx tsc --noEmit` | 0 | — |
| server `npx tsc --noEmit` | 0 | — |
| root `npm run test:unit` | 0 | 23 files / 224 tests |
| server `npm run test:v2` | 0 | 280/280；经规定入口运行 `v2TestV2ManifestHook` |
| server `npm run test:mcp-transport` | 0 | 49/49 |
| root `npm run test:tool-face-parity` | 0 | 10/10 |
| root `npm run check:tool-face-parity` | 0 | 14 public entries checked |
| server `node --import tsx --test src/__tests__/textFlowIdentityContract.test.ts` | 0 | 4/4 |
| root `npm run verify:v2-bn8-runtime` | 0 | 42.4s；含 client/server build、Relation freshness、docs、`git diff --check` 与 secret scan |

`test:v2` 首次调用超过工具单次 30 秒回传窗，末段 exit 未被调用包装层保留，故未拿截断输出冒充证据；自然落定后完整重跑，以上 **280/280、exit 0** 是可确认的正式结果。`docs:check` 在总门中再次 exit 0。

### `git diff --numstat`、边界与并行现场

追加本 Result 前，tracked implementation delta 精确为：

```text
0  5   client/src/pages/Notes/canvasEngine/relationRepository.ts
0  60  client/src/stores/proposalStore.ts
1  0   docs/agent-ops/current-state/deferred-tests.md
```

新测试当时为 untracked，故不出现在 `git diff --numstat`；其终态为 **74 行**（手工等价 `74/0`）。本 handoff 在该快照中尚无 diff；写回只包含 header `ready → done` 与本 `## Result`。

禁区集合执行 `git diff --numstat` 输出为空：`server/**`、`shared/**`、`server/package.json`、双端 tsconfig、`scripts/run-server-test-suite.mjs`、`server/src/routes/proposals.ts`、`CourseDetail.tsx`、`TemplateStudio.tsx`、`ContentGroupPanel.tsx`。四个近名重点文件 filtered hash 均等于 HEAD：

- `server/src/routes/proposals.ts` = `4d08d5179516c3ec6ac1982d6fa788fedf53912f`
- `CourseDetail.tsx` = `ddbb913ad2569e410aab04630bfb5d35952acc42`
- `TemplateStudio.tsx` = `81d62d259e1867438158711748a6b8ec6bdfb8e2`
- `ContentGroupPanel.tsx` = `757a520ffe0a88422cb4330e99ba1e91b5d8fbaa`

三处 EOL porcelain 假阳性按规定以 `git hash-object --filters --path` 对当前 HEAD blob，全部相等：runtime controller `3efe5f820e2077850611b54d4d09482845e89545`；selection toolbar `29de8952e37a29bda051d6f82e17508d8c694637`；projections route `561902a449b50ce254b650de5a337973a8fbc26d`。

工作期间发单方/文档方连续把 HEAD 从开工时基线推进至 `5bb7b56c357a7594234cb2e42e0a4fee57e9b0ca`（TD-17/本工单入库及 V12.9 文档提交）；本单没有回滚或吸收这些并行改动。另有 `.claude/settings.local.json` 与 `2026-08-27-v2bn12-precommit-docs-warn.md` 等他人 untracked 现场，均未触碰。

### 显式范围排除

未改 `/api/proposals` 活系统、`server/src/routes/proposals.ts`、`CourseDetail.tsx`、`TemplateStudio.tsx`、`ContentGroupPanel.tsx`；未改 `relationRepository.ts` 的 plural/创建/撤销/重申导出；未改任何 server 产品码、registry、binding、transport、manifest 真相源、`shared/`、migration/schema、tsconfig、`pretest:v2`、runner、`server/package.json`、`.claude/**` 或其他 handoff/analysis 文档。

未取、未覆盖、未删除发单方持有的 `.codex-tmp/builder.lock.d`；未杀任何 Codex 进程；未 commit、未 push、未碰 main。

## Review

> reviewer: claude(opus,工程调度会话) | date: 2026-08-27 | verdict: **PASS 0/0/0/0**

### 1. 收工判定(两条并用)

进程 `17080` **消失** ∧ 交付物出现(`proposalStore.ts` **−60(整文件删除)** · `relationRepository.ts` **−5** · 新建 `client/src/deadCodeRetirement.test.ts` · `deferred-tests.md` +1)。

### 2. 位点复核(⭐ 亲手施刀,不吃回执)

| 位点 | 复核方验证 | 结果 |
|---|---|---|
| **Hunk 1** | `ls` | `client/src/stores/proposalStore.ts` **已删** |
| **Hunk 2** | `git diff --numstat` | `relationRepository.ts` **仅 −5**(函数四行 + 空行),**零新增** |
| **词边界零引用** | `grep -rn "\bloadRelation\b" client/src server/src`(排除断言文件自身) | **零命中** |
| **⛔ 未误伤** | `grep -c` | `loadRelations` / `loadRelationTypes` 在 `relationRepository.ts` **2 处**、`ContentGroupPanel.tsx` **5 处**,**均在** |
| **接门(TD-22)** | 实跑 | `client/vitest.config.ts` **无 `include`/显式列表,走默认 glob** ⇒ 自动收集;实测 `src/deadCodeRetirement.test.ts (2 tests)` 被跑到,`test:unit` **23 files / 224 passed**(此前 22 / 222 ⇒ +1 文件 +2 用例) |
| ⭐ **K-1(复核方亲施)** | 建一个引用 `proposalStore` 的临时探针文件(⚠️ **语法合法**:`const proposalStore = {}; void proposalStore; export {};`) | **断言 A 红**,并**逐条报出 `client/src/__reviewer_probe.ts:1:7` 等 file:line:column**;⭐ **同轮断言 B 仍绿** ⇒ **两条断言确实彼此独立**(工单的独立性要求被实证,不是声称);探针删除后复绿 |

### 3. ⭐ 实现里有一处比工单要求更好的设计(记功)

**断言目标名用 `['proposal','Store'].join('')` / `['load','Relation'].join('')` 分段构造** ⇒ **字面量从不完整出现在断言文件里**,因此:
- **断言文件自身被纳入扫描面**(`ignoredDirectories` 只排除 `coverage` / `dist` / `node_modules`),**却不会自命中**。

⚠️ **为什么这比「把断言文件排除在扫描面外」好**:后者会造成**盲区** —— 有人日后在测试码里重新引入这两个符号,断言永远看不见。⭐ **它用「让探针不出现在自己的视野里」替代了「让探针闭上一只眼」** —— 与本轮反复出现的「探针照见自己」是同一个问题,而这是**正解**。
📌 顺带:发单方本人今夜正是在这个坑上栽过一次(用整条命令行匹配 `WindowsApps`,把提示词正文里的字符串也算了进去)。

### 4. builder 的两处诚实

1. **词边界对照数据自己复现了一遍**(用 `[regex]::Matches` 分别统计前缀与 `\b...\b`),**与工单现物逐项一致** —— 没有直接照抄工单的数字当结论。
2. **K-2 如实说明实现类别是正则**(而非 AST),并据此选了对应的刀(去掉 `\b` ⇒ 必须红);其红点列出的 **10 处命中**里包含 `server/src/toolFace/registry.ts:744` / `:758` —— 那是 `human_entry.client_call_site` 字符串里出现的 `loadRelations` / `loadRelationTypes`,**证明前缀匹配的污染面比工单举的两个文件还宽**。

### 5. 结论

**PASS 0/0/0/0**。两笔退役各自独立、断言各自独立且都有鉴别力、活的近名物一字未动、接门方式实测确认。
⇒ **TD-27 的退役动作已完成**;其「近名物防误杀」的**常设约束部分保留**(凡未来出现「proposal 退场/清理」字样的单仍须先引用该分辨)。
