> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(Fable 2026-08-24 裁 (A),log #11 `1654a1d`) | re: v2bn12-2c-1a | date: 2026-08-24

# V2.BN.12.2c-1a:给 `shared/` 加 `package.json` = `{"type":"module"}`(**极小构建单**)

> ⚠️ header 由 Opus 依调度授权链管理,**不代表 Henry 本人逐张批过**。

## 为什么

c-1b v2 的 S1 实测:server 测试里**静态具名 import** `shared` 的值,在 tsx 下失败 ——

```
SyntaxError: The requested module '@shared/types/canvasSurfaceAuthority'
does not provide an export named 'classifyCanvasSurfaceAuthority'
```

模块 namespace **只有 `default`**,函数套在 `default.classifyCanvasSurfaceAuthority`,**`default` 里带 `__esModule`** —— 那是 **CJS 转译产物的签名**。

**调度方复验的根因**:`shared/` **没有 `package.json`** ⇒ 就近解析落到**根** `package.json`,而根**未声明 `type`** ⇒ **`shared/types/*.ts` 按 CommonJS 解析**。
(对照:`server` 与 `client` 的 `package.json` **都是 `"type": "module"`**。)

⇒ **本单只补这一个字段**,解开 A1′ 的唯一阻塞。

## S1:唯一改动

**新建** `shared/package.json`,内容**只含一个字段**:

```json
{
  "type": "module"
}
```

⛔ **写死:只加这一个文件,只含这一个字段。**
⛔ **不得顺手加 `name` / `version` / `exports` / `main` / `types`** —— **那是 TD-21 的正餐(「把 shared 变成真包」),不是本单的事。**
⛔ 不改 tsconfig · 不改任何构建脚本 · 不改任何产品码 · 不加打包步骤 · 不改 `paths`。

## K 系 killer(三刀;**K-1 是本单灵魂**)

| # | killer | 必红判据 |
|---|---|---|
| **K-1** ⭐⭐ **阳性对照:证明修的是这个病,不是碰巧绿** | 写一个临时测试,**静态具名 import** `shared` 里任一既有运行时导出并断言 `typeof === 'function'` ⇒ **须绿**。<br>⭐ **然后把 `shared/package.json` 删掉/改回,重跑 ⇒ 必须复现原来那条 `SyntaxError: does not provide an export named ...`** | ⛔ **两步都做完才算验到**。只做前半只证明「现在能跑」,**证明不了「是这个字段让它能跑」** |
| **K-2** ⭐ **既有消费点不退化** | `check:tool-face-manifest` 与 `test:tool-face-manifest` **仍绿** | ⚠️ **`scripts/generate-tool-face-manifest.{ts,test.ts}` 从 `'../shared/types/toolFaceManifest.js'` 取的是值(不是 `import type`)** ⇒ **它们是本单唯一的真实风险面**,而这两道门正是它们的守卫 |
| **K-3** | 全门禁绿 | 见下 |

**红的性质**:目标 `AssertionError` 或**点名的那条 `SyntaxError` 原文**;⛔ K-1 后半步的红**必须是那条具名导出错**,若红成别的形状 ⇒ **说明根因判断有误,停手上报**。

## 边界

**允许**:**新** `shared/package.json`(**仅 `type` 一字段**)· K-1 的临时测试(**用完撤净**)。
**⛔ 不得**:其它一切。
**越界即停,标 `needs: claude`。**

## 🔴 临时测试撤净:**双面自证**

⚠️ **编译报错但仍 emit** ⇒ 失败的构建照样写产物(c-1b 第 1 版实证)。
⇒ ①源码 blob 等于 HEAD;②**产物面** —— 临时测试符号在 `server/dist/**` 无命中(或重建产物后复验)。**⛔ 只报源码面 = 未撤净。**

## ⭐ 请申报(不必测)

**加了 `type: module` 之后,`shared` 的 `.ts` 在三个世界里的解析各变成了什么?**
(dev = jiti · 测试 = tsx · 产物 = 裸 node;基线矩阵见 **TD-21**。)
**只要观感与你顺手观察到的现象**,⛔ 不要为此专门做实验 —— 但**若你观察到 TD-21 矩阵里任何一格与基线不同,请点名**,那是 TD-21 的直接更新输入。

## 📌 本单按新档(P0–P3)略过的东西(**成对写**)

| 略过了什么 | 本来会挡什么 | 档 |
|---|---|---|
| **完整包化**(`name`/`exports`/条件导出矩阵)及其测试 | 「shared 作为真包的解析正确性」 | **本单明令不做**(TD-21 正餐) |
| 多轮 refute / 自由巡猎 | 「点名 killer 之外的未知漏径」 | P3 停做 |

## ⚠️ 基线缺口:不得代偿

TD-21(**构建体系本段不修,⛔ 不得声称已修** —— 本单只补 `type` 一个字段,**产物世界的 `@shared/*` 别名仍解析不了**)· TD-14 · TD-6 · TD-19/20 · TD-16 · TD-12。

## D. 探针 / 锁 / 环境

⭐ 凡阴性结论至少要有第二个独立来源同意。
📌 **`npx` 会被 PowerShell execution policy 挡在 `npx.ps1` 层 ⇒ 用 `npx.cmd`。**
⚠️ **已知 EOL 假阳性三个**:`useNoteCanvasRuntimeController.ts` / `server/src/routes/projections.ts` / `SelectionToolbarLayer.tsx` ⇒ 判真用 blob 哈希或 `--numstat`,⛔ 不用 porcelain。
📌 提交完整性:改了文档跑 `docs:index` 一起交;生成件是 tracked 的 ` M` 不在 `??` 里;**门禁跑在工作树、提交的是暂存树,可以一绿一红**。
📌 dev 服务在 `:3001`/`:5173`(调度方所有,⛔ 不要杀)。
📌 **PID 8292 的 codex.exe 是 Henry 的桌面应用 —— ⛔ 不得杀、不得干扰。**
锁由发单方(opus)持有 —— ⛔ 不取锁、不写 owner.json、不删锁。
⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。

## 验证与回执

门禁 docs-first:`docs:check` → `verify:v2-bn8-runtime` → 双 `tsc --noEmit` → `test:unit` → `test:v2` → 五道 tool-face 门。
**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-2 header 不由你翻**。
