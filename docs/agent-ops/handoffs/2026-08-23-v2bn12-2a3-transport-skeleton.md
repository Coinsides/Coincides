> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(设计裁定:design §11 九项,Fable log 08-23 #7) | re: v2bn12-2a-3 | date: 2026-08-23

# V2.BN.12.2a-3:MCP transport 骨架(S0→S3 四步)

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。

## 上游与前提

- **方案短笺**:`2026-08-23-v2bn12-2a3-transport-brief-request.md` 的 `## 短笺`(**九节全文是本单的设计依据,不重述**)。
- **裁定**:`analysis/2026-08-21-mcp-tool-face-design.md` **§12「12.2a-3 传输层裁定」**(Fable log 08-23 #7)。
  > ⚠️ **更正(2026-08-23)**:本单初版误写 **§11** —— 那一节是「与 Henry 相关的决定」,内容无关。**重编号提交 `f31c319` 在本单 `acc7035` 之前就已推送,是调度方发单时引用了旧编号。**
  > 📌 **builder 已自行找到 §12**(日志中 §11 与 §12 两节均被读到),**未因此误读**;更正为存档准确,不影响已发指令。

### ⭐ C-6 改裁(**决定本单形状,先读**)

> **phase 1 唯一工具 = `list_notes`。** `ping` **取消**(无 truth 不进注册表);`resolve_selection` **推 12.2b**(随 selection 设计一并做)。

**含义**:`list_notes` 已在 12.2a-1b 闭环并有真实 route + 真实 client 调用点。
⇒ **本单在 transport 面上不需要任何新 schema、新 service、新 handler 逻辑。**
⇒ 短笺 §Q1 里「`resolve_selection` 的 schema 与 handler 当前不存在」的风险**本单不适用**;**但硬闸仍然生效**(见下)。

### 调度方已亲验的三条实况(2026-08-23)

| # | 实况 |
|---|---|
| 1 | `docs/generated/tool-face-manifest.json` **当前自报 `"$schema": "http://json-schema.org/draft-07/schema#"`** ⇒ S0 确有活要干 |
| 2 | **MCP 官方 SDK 未安装**(`server/node_modules/@modelcontextprotocol` 不存在)⇒ S1 须含安装,且**入口名须对照 `.d.ts` 核实** |
| 3 | 触及面见短笺 §7(已列 `[待建]` 项),本单按其授权 |

---

## S0:dialect 改 2020-12 兼容,且不再自报 draft-07

**位置**:`scripts/generate-tool-face-manifest.ts` 的 zod→JSON Schema 转换处(**生成器侧,不是 transport 侧**)。

**要求**:
1. 输出改为 **2020-12 兼容**;**不再写 `$schema: draft-07`**。
2. **`docs/generated/tool-face-manifest.json` 须随之重生成**并提交(否则 `check:tool-face-manifest` 会红 —— 那是它该红)。
3. **既有五门必须仍绿**(尤其 `test:tool-face-manifest` 的忠实投影断言与 `check:tool-face-parity`)。

⛔ **不得**在 transport 侧做 dialect 转换 —— 那会造出第二个 schema 权威。

---

## S1:transport 骨架

**要求**(短笺 §2/§3/§4/§5 已给方案,**照做**):

1. **同一 Express app 挂 `/api/mcp`**,复用既有 `authMiddleware`(Bearer JWT),把已验证的 `req.userId` 搬入当次 MCP request context。**不引入 MCP token、账号表、二次验 JWT。**
2. **每请求 fresh MCP server/handler**:**无 `Mcp-Session-Id`、无 transport/server 复用缓存、无 capability cache、无 pending approval map**(2026-07-28 无状态核心)。
3. **`tools/list` 只消费 manifest**,过滤 `exposure==='public'` **且**剔 `__` 前缀。
4. **binding 只保存 `name -> function`** —— **不得重复 description/schema/tier/exposure/scopes/human_entry**(防第二目录)。
5. **C-3 降级**:谓词 = **现代请求且 `elicitation.form`**;不满足则 `confirm` 档**降级为 propose**(写 `proposed` 收据),**不得静默执行**。**降级原因字段暂不加**(裁定)。
6. **Host/Origin 门**:窄 guard,不允许即 **HTTP 403、无 MCP body、无收据**。allowlist 走 `server/src/db/validateConfig.ts` 或现有等价配置正门做启动校验。
7. **错误映射**:协议/envelope 错误归 SDK;领域失败仍是 `AppError`,在 `tools/call` 中投影为 MCP tool error。**不新增领域错误枚举或 `AppError` 子类。**

### ⛔ SDK 入口名核实(**硬闸**)

官方 SDK **未安装**,且短笺提到「v2 分包」。**安装后须对照 `.d.ts` 核实实际导出名与入口路径,并把核实输出贴进回执。**

> ⛔ **若文档/记忆里的名称与 `.d.ts` 不符 —— 即停,标 `needs: claude`,不要凭印象改写或自造 shim。**

---

## S2:七条 killer

| # | killer | 必红判据 |
|---|---|---|
| K-1 | `exposure!=='public'` 条目**不得**出现在 `tools/list` | 令过滤失效 ⇒ 红 |
| K-2 | `__` 前缀条目**不得**出现在 `tools/list` | 同上,**与 K-1 各自独立可触发**(不得合并成一个条件) |
| K-3 | Host/Origin 不在 allowlist ⇒ **403、无 MCP body、无收据** | 去掉 guard ⇒ 红 |
| K-4 | binding 与 manifest 的 **name 集合相等** | binding 多一个/少一个 ⇒ 红(防第二目录) |
| K-5 | **MRTR 降级**:无 `elicitation.form` 时 confirm ⇒ 写 `proposed` 收据、**不执行** | 令谓词恒真(视作支持)⇒ 红 |
| K-6 | **artifact loader**:在**无 repo `docs/`** 的最小 production 布局、**任意 cwd** 下启动 | 删 copy step ⇒ 红 |
| K-7 | **打包件保留非 public 条目** | 打包时若过滤 ⇒ 红 |

> ⭐ **K-7 与 K-1/K-2 方向相反,不是矛盾**:manifest 是**忠实投影**,过滤只许发生在 `tools/list`。**若打包时顺手过滤,K-1/K-2 将永远收不到靶子** —— 与 12.2a-1b HIGH-1 同形。

**红的性质**:必须来自「机关存在但被改坏」,**不得是 `ReferenceError`/`SyntaxError`/`ERR_MODULE_NOT_FOUND`**;施刀前后跑 `tsc` 证明语法完好。
**从生产入口触发**:HTTP 层的 killer 走真实 Express;不接受只测内部 helper(**同族漏层本项目已五次**)。

---

## S3:build copy(短笺 §6 五步,**原样写死**)

1. production build **先跑 canonical manifest freshness check**;失败即停止。
2. `tsc` 成功后由**跨平台 Node copy step 按字节复制** canonical manifest 到 `server/dist/tool-face-manifest.json`;**复制不生成、不筛选、不重映射**。
3. compiled loader **只用 `import.meta.url` 相对 `dist` 定位**;缺失/JSON 破损即**启动失败**。⛔ **production 禁止按 cwd 回退读 repo `docs/`**;⛔ **禁止为省打包而运行时 import registry**。
4. **artifact killer**:比较源/复制件 bytes/hash 完全相同,并在**任意 cwd、无 repo docs 的最小 production 布局**启动 loader;**删 copy step 必须红**。
5. **`internal`/`test`/`__` 条目在打包件中仍须保留**,证明过滤没有偷跑到 build。

> 📌 **第 3 步与第 5 步是「省事时最先被砍掉、砍掉后不会立刻出错」的两条。** 请勿简化。

---

## 硬闸(**三条,越界即停**)

| # | 禁令 |
|---|---|
| **H-1** | **不得在 transport 内造 schema** —— 所有 schema 来自 manifest(其权威是 `server/src/toolFace/registry.ts`)。 |
| **H-2** | **不得在 transport 内造白名单** —— 过滤依据只能是 manifest 的 `exposure` 与 `__` 前缀;**不得硬编码工具名清单**。 |
| **H-3** | **不得在 transport 内造内存状态** —— 无 session、无 capability cache、无 pending approval map。若使用 `requestState`,只能是**客户端携回且经完整性校验的显式值**,不得指向服务端 session。 |

**若某项要求非违反上述之一不可实现:停手,标 `needs: claude`,写明「需要什么、为什么」。**

## ⚠️ 已知基线缺口:**不得在本层代偿**

- **`scopes` 未强制**(TD-14):JWT 只有 `userId`、无 scope。manifest 的 `scopes` **只作描述**,**回执不得声称已强制授权**。
- **TD-6** 跨资源原子性 · **TD-8 残余** 时间戳靠约定 · **TD-10** 单 mapper 是约定非结构锁 —— **三条均不得在 transport 层假装解决**。

---

## D. 探针 / 锁 / 环境

阴性断言前先让同一探针看见已知阳性;**确认命中不是来自你自己刚写进去的东西**。
**锁非你所有** —— 不取锁、不写 `owner.json`、不删锁;取锁失败即停,**不得覆盖既有 owner**。
📌 porcelain 对 `client/.../useNoteCanvasRuntimeController.ts` 有 stat/EOL 假阳性;判文件是否真改用 blob 哈希或 `git diff --numstat`;管道遮蔽退出码;`grep -c` 数行数不是出现数;**新增文档先跑 `docs:index`,改 `package.json` 跑 `docs:inventory`**。

## 验证与回执

门禁 **docs-first**:`docs:check` → `verify:v2-bn8-runtime` → client/server 双 `tsc --noEmit` → `test:unit` → server `test:v2` → 五道 tool-face 门 → 新增的 MCP/killer 测试。

**回执纪律**:README Builder 侧 1–3(含 **UTF-8**)+ **M-1 mutation 归复核方** + **M-2 header 不由你翻**。
**⭐ 写 `## Result` 是本单交付物之一,不需确认,直接写。**

**回执须含**:**SDK 入口名的 `.d.ts` 核实输出**(硬闸)· S0 前后 manifest dialect 对照 · **七条 killer 各自的先红后绿两段输出**(K-1/K-2 须分别独立,不得合并)· S3 五步逐条证明(尤其第 3、5 步)· 门禁逐条收据 · 触及面 diff vs 短笺 §7 申报 · 显式范围排除 · **每条阴性断言的阳性对照**。
