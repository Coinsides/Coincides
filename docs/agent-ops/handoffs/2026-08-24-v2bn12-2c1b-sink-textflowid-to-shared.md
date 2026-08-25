> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 2026-08-24 裁 A1,log #8 `529a59a`) | re: v2bn12-2c-1b | date: 2026-08-24

# V2.BN.12.2c-1b:`textFlowIdForBlock` 下沉 `shared/`(纯 import 改道,零语义)

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。

## 为什么有这一单

c-2 撞墙:C 裁定要求 resolve **import 同一个** `textFlowIdForBlock`,而该函数**只住客户端**,server `rootDir: "./src"` 够不着。**Fable 裁 A1:下沉 `shared/`** —— 跨端身份约定住 shared,与 `SelectionReceiptV1` 同理。⛔ 不采行为锁替身份锁(C 自废),⛔ 不采本段不校验(正是 C 要防的「字段在没人用」)。

## 调度方已亲验的五条实况(**行号会漂,按符号定位**)

| # | 实况 |
|---|---|
| 1 | ⭐ **本体零依赖**:`textFlowIdForBlock` 是纯 2 行 `` return `textflow-${blockId}` ``,**不引用同文件任何东西** ⇒ 下沉不拖别的 |
| 2 | **调用面**:`client/src/pages/Notes/canvasEngine/textFlowService.ts` 定义,**5 个客户端文件**引用(`TextBlockProjection.tsx` / `useBlockTextFlowEditController.ts` / `useSlashBlockRollbackController.ts` / `BlockEditorLayer.tsx` / `ShapeObjectLayer.tsx`);**server 侧零引用** |
| 3 | ⭐ **shared 已有运行时代码先例**:`classifyCanvasSurfaceAuthority`(`shared/types/canvasSurfaceAuthority.ts`)被客户端**运行时**消费 ⇒ shared 放函数不是新形态 |
| 4 | 🔴 **但 server 至今只有一处 shared import,且是 `import type`**(`server/src/mcp/manifest.ts:8`,编译时擦除)⇒ **server 运行时值跨界零先例** |
| 5 | **server 跑法**:`dev`/全部测试走 `jiti`/`tsx`(不 emit)⇒ 运行时解析无碍;**但 `build` 是裸 `tsc`**,`rootDir: "./src"`,**运行时 import 会被 emit** |

---

## 🔴 S1:**先做构建探针,再动手**(本单唯一的未知)

**问题**:server 用**运行时**(非 `import type`)引用 shared 的函数,能否过 `tsc`?
⚠️ `rootDir: "./src"` 下,emit 的相对 import 指向 src 之外,**可能触发 TS6059「not under rootDir」**。server tsconfig **已配** `paths: { "@shared/*": ["../shared/*"] }` 与 `references: [{ path: "../shared" }]`,**但从未被运行时值用过**。

**做法**:在 server 侧任选一个既有文件加一行运行时 import(可用 `@shared/...` 形式),跑 `cd server && npx tsc --noEmit` 与 `npm run build`,**记录实况后把探针撤掉**。

- ✅ **过了** ⇒ 按 S2 施工,并在 Result 里写明**用的是哪种 import 形式**(`@shared/*` 还是相对路径)。
- 🔴 **没过** ⇒ ⛔ **停手,标 `needs: claude`**,把**报错原文**写进 Result。
  ⚠️ **允许的唯一自救**:改用**已配好的 `@shared/*` 形式**再试一次。
  ⛔ **不得**改 `tsconfig.json` 的 `rootDir`/`paths`/`references`、不得改构建脚本、不得加打包步骤 —— **那是构建体系变更,设计级,不在本单授权内。**

📌 **这一条是本单的估时枢纽**,请优先做、单独报。

## S2:下沉(S1 通过后)

1. **新建** `shared/types/textFlow.ts`,把 `textFlowIdForBlock` **移**进去(⛔ 移动,不是复制)。
2. `client/.../textFlowService.ts` **删除该函数定义**。
3. **回接全部 5 个客户端调用点**,改为从 shared import。
   ⚠️ 有的文件是**与其它符号写在同一条 import 里**(如 `ShapeObjectLayer.tsx`),需拆分 import 语句 —— **只拆这一个符号,其余原样**。
4. ⛔ **零语义**:`` `textflow-${blockId}` `` 一个字符不许变。

⛔ **不做**:不动 `textFlowService.ts` 的其它 11 个导出 · 不动 server(本单 server 侧零改动,c-2 才 import) · 不改 tsconfig/构建 · 不碰 selection 相关任何文件。

---

## K 系 killer(**均为对点名机关的单刀验红;⛔ 单刀、不自由巡猎、不多轮**)

| # | killer | 必红判据 |
|---|---|---|
| **K-1** ⭐ **零语义** | 派生结果逐字节不变 | 令 shared 版返回 `` `tf-${blockId}` `` ⇒ **须红** |
| **K-2** ⭐⭐ **是移动不是复制** | 全仓 `textFlowIdForBlock` **定义只此一份** | 令 `textFlowService.ts` 留一份同名副本 ⇒ **须红**;⭐ 断言须锁**定义处数量**(AST/源码枚举),⛔ 不得只断行为 |
| **K-3** ⭐ **5 个调用点全部改道** | 5 个文件均从 shared 解析到该符号 | 令任一文件仍从 `./textFlowService` 取 ⇒ **须红**(⛔ 若那里已无定义则应是编译错,**编译错不算合格的红**,须改为可断言的形状) |
| **K-4** | **既有测试全绿不退化** | `test:unit` 与 `test:v2` 数量与结果**与基线一致** |

**红的性质**:目标 `AssertionError`,⛔ **不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`**;每刀独立恢复后再取绿。

## 边界

**允许**:**新** `shared/types/textFlow.ts` · `client/.../textFlowService.ts`(仅删该函数 + 必要 import 整理)· **5 个调用点文件**(仅该符号的 import 改道)· 相应测试 · S1 探针(**用完撤掉**)。
**⛔ 不得**:改 tsconfig / 构建脚本 · 动 server 任何文件(S1 探针除外,且须撤) · 碰 selection 任何文件 · 碰 `docs/agent-ops/`(唯一例外:向本工单追加 `## Result`)。
**越界即停,标 `needs: claude`。**

## 📌 本单按新档(P0–P3)略过的东西(**成对写**)

| 略过了什么 | 本来会挡什么 | 档 |
|---|---|---|
| **下沉后的跨端一致性模糊矩阵**(空 blockId / 超长 id / 含特殊字符的 id) | 「派生函数对畸形输入的行为」 | P2 不扩 |
| **多轮 refute / 自由巡猎** | 「点名 killer 之外的未知漏径」 | P3 停做 |

⭐ **另请申报(不必测)**:下沉到 shared 后,**server 与 client 的构建产物是否各自持有一份该函数的副本**(打包/emit 层面)?若是,「同源」在源码层成立、在产物层可能不成立 —— **只要你的观感,不要你去验。**

## ⚠️ 基线缺口:不得代偿

`scopes` 未强制(TD-14)· TD-6 · TD-19/20 · TD-16 · TD-12(EPERM:`test:v2` 用 `CANVAS_ASSET_DIR` 指向 OS temp 绕开,⛔ 不得改测试或产品语义代偿)。

## D. 探针 / 锁 / 环境

阴性断言前先过阳性对照;⭐ **凡阴性结论至少要有第二个独立来源同意**。
⚠️ **已知 EOL 假阳性三个**:`useNoteCanvasRuntimeController.ts` / `server/src/routes/projections.ts` / `SelectionToolbarLayer.tsx` ⇒ 判真用 blob 哈希或 `--numstat`,⛔ 不用 porcelain。
📌 提交完整性:改了文档跑 `docs:index` 一起交;生成件是 tracked 的 ` M` 不在 `??` 里;**门禁跑在工作树、提交的是暂存树,可以一绿一红**。
📌 dev 服务在 `:3001`/`:5173`(调度方所有,⛔ 不要杀)。
📌 **PID 8292 的 codex.exe 是 Henry 的桌面应用 —— ⛔ 不得杀、不得干扰。**
锁由发单方(opus)持有 —— ⛔ 不取锁、不写 owner.json、不删锁。
⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。

## 验证与回执

门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → 双 `tsc --noEmit` → `test:unit` → `test:v2` → 五道 tool-face 门。
**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-2 header 不由你翻**。
