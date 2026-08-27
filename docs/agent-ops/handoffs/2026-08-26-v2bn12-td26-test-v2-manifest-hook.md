> from: claude(opus,工程调度会话) | to: codex(builder) | status: done | re: v2bn12-TD-26-fix | date: 2026-08-26

# TD-26 清债:`test:v2` 补 manifest 副本前置钩子

## 定位(一行)

`test:v2` 现在依赖一个 **gitignored 的手工生成物**(`server/dist/tool-face-manifest.json`),干净克隆下必炸 —— 而**洁净室复核用的就是干净克隆**。本单给它补一个显式前置钩子。**⏱ 预估 10–15 分钟,一处 package.json 改动 + 一条测试。**

## 病因(现物,已由发单方亲验;⛔ 不必重新调查,但可复核)

- `server/src/mcp/manifest.ts:18` 的 `TOOL_FACE_MANIFEST_URL` 指向 `server/dist/tool-face-manifest.json`;该路径被 `.gitignore:5` 的 `dist/` 排除。
- **没有任何 test script 跑 `copy:tool-face-manifest`**(只有 `predev` 与 `build` 跑)。
- `server/src/__tests__/v2DevQuickLogin.test.ts` **spawn 真实服务端**(`:103`,`node --import jiti/register src/index.ts`),那个子进程会加载上述 dist 副本 ⇒ **`test:v2` 因此继承了这个依赖**。
- 两个症状都已实证:①dist **陈旧** ⇒ `Tool binding parity mismatch (extra: …)`;②dist **缺失** ⇒ `Error: ENOENT … at loadToolFaceManifest (manifest.ts:26:54)`。

### ⭐ 范围已收窄(发单方实测,⛔ 不要扩大)

`test:mcp-transport` **不同病,不要给它加钩子** —— `v2McpTransport.test.ts:215` 的 `canonicalManifest()` 读的是**真相源** `docs/generated/tool-face-manifest.json`,不是 dist 副本。**实测**:把 dist 副本移走后 `npm run test:mcp-transport` 仍 **40/40**。
⇒ **本单只动 `test:v2` 一个脚本。**

## 交付物(就这两样)

### 1. `server/package.json` 加一个前置钩子

新增 `pretest:v2`,内容**与既有 `predev` 逐字同形**:

```
"pretest:v2": "npm run check:tool-face-manifest && npm run copy:tool-face-manifest"
```

- ⭐ **必须含 `check` 那一半**,不要只 copy:`copy` 只是把 `docs/generated/` 的字节搬到 `dist/`;若**真相源自己陈旧**(注册表改了但没重生成),只 copy 会**把陈旧原样搬过去**,病换个地方复发。`predev` 就是这么写的,照抄它。
- ⛔ 不改 `test:v2` 本身的文件列表;⛔ 不给任何其他脚本加钩子;⛔ 不改 `predev`/`build`/`copy:tool-face-manifest`/`check:tool-face-manifest` 任何一个。

### 2. 一条常驻测试(位置随你,但**必须接门**)

**T-1**:证明「dist 副本缺失时,`test:v2` 这条链仍能起来」。
- 允许的做法举例(择一,以你能做干净的为准):在测试里把 dist 副本移到临时位置 → 跑 `copy:tool-face-manifest` → 断言目标文件重新存在且**字节等于** `docs/generated/tool-face-manifest.json` → 还原。
- ⚠️ **该测试必须自清**:无论成败都要把 dist 副本还原(`try/finally`),⛔ 不得留下缺失状态污染后续测试。
- 📌 **TD-22**:若新建测试文件,**必须同时接进 `server/package.json` 的 `test:v2` 显式列表**(漏挂没有任何机关会提示你)。

## 必红判据

- **K-1(灵魂刀,Fable 指定;⭐ 这一刀就是发单方那个阳性对照反过来当验收)**:
  1. 把 `server/dist/tool-face-manifest.json` **移走**;
  2. 直接跑 `npm run test:v2` ⇒ **必须绿**(钩子把它补回来了)。
  3. 再把 `pretest:v2` **临时删掉**、dist 副本再次移走 ⇒ **`test:v2` 必须红**,且红在 `ENOENT … loadToolFaceManifest`(证明绿是钩子挣来的,不是碰巧)。
  4. 恢复钩子与 dist 副本,`test:v2` 复绿。
  **四步的 exit 与红点原文都要贴。**
- **K-2**:把 `pretest:v2` 里的 `check:tool-face-manifest` 那一半删掉(只留 copy),**人为让真相源陈旧**(如临时改注册表一条 description 而不重生成)⇒ 该钩子**必须不再拦住陈旧**(即 `test:v2` 起得来但 manifest 是旧的);恢复后 `check` 那半应当**拦下并报「过期」**。⚠️ 若你判断这一刀无法做干净(例如陈旧会被别的门先拦下),**如实写「未做 + 理由」,⛔ 不要编一个红点**。
- 既有 `test:unit` / `test:v2` / `test:mcp-transport` / `test:tool-face-registry` / `test:tool-face-manifest` / `check:tool-face-manifest` / parity 两门 / 契约专项 全部复跑仍绿。

## 边界(触及面申报)

**允许**:`server/package.json`(**仅新增 `pretest:v2` 一行;若新建测试文件则 `test:v2` 列表 +1 个文件名**)· 新测试文件(位置随你)· `docs/agent-ops/current-state/deferred-tests.md`(加一行台账)。

**禁区**:`server/src/mcp/manifest.ts`(⛔ **不得改 `TOOL_FACE_MANIFEST_URL`,不得加任何回退逻辑** —— Fable 已裁「⛔ 不采回退型」:让测试世界静默读文档世界 = 第二真相源,且 dist 里躺着旧副本时回退**不触发**,mismatch 照样咬人)· `.gitignore` · `scripts/copy-tool-face-manifest.mjs` · `scripts/generate-tool-face-manifest.ts` · `server/src/toolFace/registry.ts` · `server/src/mcp/bindings.ts` · `server/src/dev/**` · 任何 route/service · `shared/` · 任何 tsconfig · 客户端全部 · `.claude/**` · 其他 handoff/analysis 文档。

## D 段(探针 / 锁 / 环境)

- 📌 **EOL 假阳性**三个:`useNoteCanvasRuntimeController.ts` · `SelectionToolbarLayer.tsx` · `routes/projections.ts` —— **判真用 `git hash-object --filters --path` 对 HEAD blob 比对,⛔ 不用 porcelain**。
- 📌 `server/dist/tool-face-manifest.json` 是 **ignored 运行时工件**,不形成 tracked diff —— 你对它的移动/还原**不会**出现在 numstat 里,**所以还原与否必须自己核对**(`ls` 一下),⛔ 不能靠 git 状态帮你发现。
- `.codex-tmp/builder.lock.d` 由发单方持有:⛔ 不取锁、不覆盖 `owner.json`、不删锁。
- ⛔ **不要杀任何 codex 进程**。桌面应用识别 = **exe 实际路径前缀含 `Program Files\WindowsApps\OpenAI.Codex_`**;⛔ 不用整条命令行做子串匹配,⛔ 不按 PID 数字认。
- ⛔ 不 commit、不 push、不碰 main。
- `docs:check` 若红在 `docs/agent-ops/INDEX.md` 过期 ⇒ **发单方的活**,如实记 exit 与原因,⛔ 不自己改 docs。

## 验证与回执

门禁 docs-first:`docs:check` → 双端 `tsc --noEmit` → `test:unit` → server `test:v2`(隔离资产目录)→ `test:mcp-transport` → `test:tool-face-registry` → `test:tool-face-manifest` → `check:tool-face-manifest` → parity 两门 → 契约专项。逐门 exit 入表。

回执 **UTF-8** 追加 `## Result`:K-1 四步的 exit 与红点原文 · K-2(或其「未做 + 理由」)· **dist 副本最终状态的自核**(`ls` 输出或等价)· `git diff --numstat` 对照边界 · 显式范围排除。

## Result

### 交付

- `server/package.json` 新增：
  ```json
  "pretest:v2": "npm run check:tool-face-manifest && npm run copy:tool-face-manifest"
  ```
  与既有 `predev` 逐字同形；`test:v2` 本体只追加 `src/__tests__/v2TestV2ManifestHook.test.ts` 一个显式文件名，未改其余列表。
- 新增常驻测试 `server/src/__tests__/v2TestV2ManifestHook.test.ts`：用既有 `TOOL_FACE_COPY_TEST_DESTINATION` 测试口把目标定向到 OS 临时目录中一个起始不存在的 `dist/tool-face-manifest.json`，运行真实 `copy:tool-face-manifest`，断言目标出现且与 `docs/generated/tool-face-manifest.json` 字节全等；`try/finally` 递归自清临时根。真实 `test:v2` 生命周期接线由下列 K-1 四步验证。采用隔离目标是为了避免 Node 多测试文件并发时短暂移走共享 dist，从而与会启动真实服务端的 `v2DevQuickLogin` 竞态。
- 未新增平行机关：测试只调用既有 copy 正门及其既有 test-only override；未改 `deferred-tests.md`（K-2 已实做，无降档项）。

### K-1：缺失真实 dist 副本的四步

1. 将真实 `server/dist/tool-face-manifest.json` 移到独立 OS 临时目录：移动命令 exit `0`；自核 `SOURCE_EXISTS=False`、`BACKUP_EXISTS=True`。
2. 保留 `pretest:v2`，直接运行 server `npm.cmd run test:v2`：exit `0`，`278/278`；prehook 先报 manifest 未过期，再把副本补回真实 dist。
3. 临时删掉 `pretest:v2`，再次移走真实 dist 后运行同一命令：exit `1`，`268 pass / 4 fail`。要求的红点原文为：
   ```text
   Error: ENOENT: no such file or directory, open 'D:\Coinsides\v2.x\Coincides\server\dist\tool-face-manifest.json'
       at loadToolFaceManifest (D:\Coinsides\v2.x\Coincides\server\src\mcp\manifest.ts:26:54)
   ```
   三条 `v2DevQuickLogin` 服务启动测试均命中该红点；常驻 copy 测试自身仍绿。
4. 恢复钩子并把开工前原副本移回真实 dist：恢复命令 exit `0`；再跑 `test:v2` exit `0`，`278/278`。K-1 临时目录随后经「位于 OS temp、名称前缀正确、无 ReparsePoint、真实 dist 已存在」四项核对后删除，自核 `TEMP_EXISTS_AFTER=False`。

结论：K-1 阴性确由缺钩导致 `loadToolFaceManifest` 读取缺失工件而红；阳性不是碰巧读到残留副本。

### K-2：`check` 半钩的陈旧拦截

1. 临时把钩子缩成只含 `copy:tool-face-manifest`，并只在运行时注册表的 `list_notes.description` 加一个未重生成的 sentinel，使 `docs/generated` 成为陈旧真相源。
2. 运行 `test:v2`：exit `0`，`278/278`；输出只有 copy，证明只 copy 会把陈旧真相源照搬到 dist 而不拦截。
3. 保持同一陈旧态，只恢复 `check:tool-face-manifest && copy:tool-face-manifest` 后再跑 `test:v2`：exit `1`，在进入测试前由 prehook 拦下，原文：
   ```text
   过期: docs/generated/tool-face-manifest.json
   请运行: npm run docs:tool-face-manifest
   ```
4. 恢复注册表原字节；`git hash-object --filters --path` 与 HEAD blob 均为 `4c7a4787abd82d52cfe0f307786d90cf357a0536`。恢复后 `check:tool-face-manifest` exit `0`，报 6 条 public 且 manifest 未过期；canonical 与 dist SHA-256 全等。

### 门禁（docs-first，逐门 exit）

| # | 门 | exit | 结果 |
|---:|---|---:|---|
| 1 | root `npm.cmd run docs:check` | 0 | `docs-index` + inventory 均 current；`docs/agent-ops/INDEX.md` 未触发过期红 |
| 2 | client `npm.cmd exec tsc -- --noEmit` | 0 | 无诊断 |
| 3 | server `npm.cmd exec tsc -- --noEmit` | 0 | 无诊断 |
| 4 | root `npm.cmd run test:unit` | 0 | 22 files / 222 tests |
| 5 | server `npm.cmd run test:v2`（隔离资产目录） | 0 | 278/278；隔离根 `C:\Users\70208\AppData\Local\Temp\coincides-td26-final-v2-52d42ab37e5e419db64d75178c4ee795`，收尾 `TEMP_EXISTS_AFTER=False` |
| 6 | server `npm.cmd run test:mcp-transport` | 0 | 40/40 |
| 7 | root `npm.cmd run test:tool-face-registry` | 0 | 5/5 |
| 8 | root `npm.cmd run test:tool-face-manifest` | 0 | 10/10 |
| 9 | root `npm.cmd run check:tool-face-manifest` | 0 | 6 条、全部 public、fresh |
| 10 | root `npm.cmd run test:tool-face-parity` | 0 | 10/10 |
| 11 | root `npm.cmd run check:tool-face-parity` | 0 | 6 条 public 必要条件通过；门自身仍明确 human reachability 未由此证明 |
| 12 | server `node --import tsx --test src/__tests__/textFlowIdentityContract.test.ts` | 0 | 4/4 |

### ignored dist 副本最终自核

```text
FullName         : D:\Coinsides\v2.x\Coincides\server\dist\tool-face-manifest.json
Length           : 47288
LastWriteTimeUtc : 2026/8/27 3:20:08
CANONICAL_SHA256 : 27FCA0212FA2D75DF4E45D3263170BCC10E60C77208A11317D16BCBD8D939360
DIST_SHA256      : 27FCA0212FA2D75DF4E45D3263170BCC10E60C77208A11317D16BCBD8D939360
DIST_EQUALS_CANONICAL=True
```

副本存在、回到真实路径且字节为当前 canonical；因其 ignored，以上由 `Get-Item` / `Get-FileHash` 独立核对，不依赖 git 状态。

### `git diff --numstat` 与边界

追加本回执前，本单产品/测试改动精确为：

```text
2  1  server/package.json
69 0  NUL => server/src/__tests__/v2TestV2ManifestHook.test.ts
```

禁区集合（`.gitignore`、copy/generate 脚本、`server/src/mcp/manifest.ts`、registry、bindings、`server/src/dev/**`、routes/services、`shared/**`、client）执行 `git diff --numstat` 输出为空。三处已知 EOL porcelain 假阳性再次按 filtered blob 判真，均与 HEAD 相等：

```text
useNoteCanvasRuntimeController.ts  3efe5f820e2077850611b54d4d09482845e89545 == HEAD
SelectionToolbarLayer.tsx          29de8952e37a29bda051d6f82e17508d8c694637 == HEAD
server/src/routes/projections.ts   561902a449b50ce254b650de5a337973a8fbc26d == HEAD
```

共享工作树另有 `docs/agent-ops/INDEX.md`、`current-state/tech-debt.md`、S4-2 / note-hydration handoff、`.claude/settings.local.json` 等非本单变动，均未触碰。本工单文件开工时本就是 untracked，故上表不把其既有正文算作施工 numstat；本次只按协议前推 header `ready → done` 并 UTF-8 追加本 `## Result`。

显式排除：未改 `test:mcp-transport` 或任何其他 script 的钩子；未改 manifest URL / 回退语义；未改生成器、注册表、bindings、dev、route/service、shared、tsconfig、客户端或其他 handoff/analysis；未取/覆盖/删除 builder lock；未检查或结束任何 Codex 进程；未 commit、未 push、未碰 main。

## Review

> reviewer: claude(opus,工程调度会话) | date: 2026-08-26 | verdict: **PASS 0/0/0/1(LOW-1 见 §4)**

### 1. 收工判定(两条并用)

进程 `29904` **消失** ∧ **本单交付物出现**(`server/package.json` 2/1 + 新建 `server/src/__tests__/v2TestV2ManifestHook.test.ts`)。⛔ 未用 `## Result` 计数当判据。

### 2. 位点复核(⭐ 亲手施刀,不吃回执)

| 位点 | 复核方的独立验证 | 结果 |
|---|---|---|
| **钩子内容** | 读 diff | `"pretest:v2": "npm run check:tool-face-manifest && npm run copy:tool-face-manifest"` —— **与 `predev` 逐字同形**,`check` 半边在,⛔ 没写成只 copy |
| **`test:v2` 列表** | 读 diff | 只追加 `v2TestV2ManifestHook.test.ts` 一个文件名,其余列表一字未动;TD-22 照做 |
| ⭐ **K-1 阳性半(复核方亲跑)** | 把真实 `server/dist/tool-face-manifest.json` **移走**,直接跑 `npm run test:v2` | **exit 0,278/278**;输出可见钩子先报 `tool-face manifest 未过期:6 条条目,其中 6 条 public`,再 `Copied tool-face manifest bytes to …\server\dist\tool-face-manifest.json` ⇒ **绿是钩子挣来的,不是残留副本** |
| ⭐ **K-1 阴性半(复核方先前已亲验)** | 发单**之前**的阳性对照:同样移走 dist,但**绕过钩子**直跑 `node --import tsx --test v2DevQuickLogin.test.ts` | `Error: ENOENT … at loadToolFaceManifest (manifest.ts:26:54)`,exit 1 ⇒ **一正一反成对,病因与疗效都实证** |
| **副本保真** | 三方 sha256 对照 | 钩子补回的 dist = `27fca021…d939360`,与真相源 `docs/generated/tool-face-manifest.json` **逐位相同**,亦与移走前的原副本**逐位相同**(47288 B)⇒ 钩子没搬错东西 |
| **常驻测试形状** | 通读 `v2TestV2ManifestHook.test.ts` | 用**既有** test-only override `TOOL_FACE_COPY_TEST_DESTINATION` 把目标定向到 OS temp 的隔离路径;`try/finally` 递归自清;断言目标由无到有且与真相源**字节全等**;走 `npm_execpath` 正门。⭐ **隔离目标是对的**:若它去移共享的真实 dist,会与同批并发、要启动真实服务端的 `v2DevQuickLogin` **竞态** —— builder 主动申报了这个理由 |
| **树的最终状态** | `git status` / `ls` | 产品面只有 `server/package.json` + 一个新测试文件;`server/dist/tool-face-manifest.json` **在位**(ignored 工件,builder 自核 + 我复核) |

### 3. builder 的两处诚实,记功

- **K-2 真做了,没走「未做+理由」的便宜路**:它临时把钩子缩成只 copy、给注册表 `list_notes.description` 加了个未重生成的 sentinel 制造陈旧真相源 ⇒ 实证**只 copy 会把陈旧照搬进 dist 而不拦**(exit 0);恢复 `check` 半边后**在进入测试前被 prehook 拦下**,原文 `过期: docs/generated/tool-face-manifest.json`。⇒ **「钩子必须含 check 半边」这条要求被实证是承重的,不是我拍脑袋加的。**
- **sentinel 收尾自证**:恢复注册表后以 `git hash-object --filters --path` 对 HEAD blob 比对得 `4c7a4787…0536`,并复跑 `check` 为 fresh。⇒ **人为制造的陈旧被干净还原,没留痕。**

### 4. ⚠️ LOW-1(声明边界,非缺陷):**没有任何常驻机关守着「钩子还在」**

常驻测试证的是「`copy:tool-face-manifest` 能把缺失的目标按字节重建」;**它不检查 `pretest:v2` 是否还挂在 `test:v2` 上**。真正证明「钩子已接线」的是 K-1 那四步 —— 而那是**一次性人工验证,不是守卫**。
⇒ **若将来有人删掉 `pretest:v2`,没有任何测试会红**;症状会重演为「干净克隆下 `test:v2` 炸」。
📌 **与 TD-22 同族**(显式列表漏挂无发现机关)、亦与本轮多次出现的「机关在,但没有守机关的机关」同形。
**不在本单补**(⛔ 那是新增交付物)。**候选做法**:在同一测试文件加一条断言 —— 读 `server/package.json`,断言 `scripts["pretest:v2"]` 同时包含 `check:tool-face-manifest` 与 `copy:tool-face-manifest`。**一行断言,可随下一张触及 server 测试面的单顺带。** 是否立项由 Fable 定;按家法**第一次发现不建闸**,故本轮只声明。

### 5. 一处已声明的轻微偏离(接受)

工单 §5 要求「`deferred-tests.md` 追加一行台账」。builder **未加**,理由写在回执:**K-2 已实做,无降档项**。⇒ 台账的语义是「记略过了什么」,**没略过就没有行可记**;写一行「本单无略过」是噪声。**判为合理偏离,接受**,不作 finding。

### 6. 结论

**PASS 0/0/0/1**。TD-26 的两个症状(dist 陈旧 / dist 缺失)**均已由该钩子覆盖并各有实证**;LOW-1 为声明边界,已记于 §4。
⇒ **TD-26 可标已清**(清偿收据 = 本 Review + 上方 `## Result`),但 ⛔ **清偿描述里不得写「已不可能复发」** —— §4 那条口子还开着。
