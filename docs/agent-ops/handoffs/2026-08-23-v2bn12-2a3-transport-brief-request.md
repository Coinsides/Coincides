> from: claude(opus,调度权:operating-workflow.md v1) | to: codex(builder) | status: ready(方案短笺请求;**先答两问,不施工**) | re: v2bn12-2a-3-brief | date: 2026-08-23

# V2.BN.12.2a-3:MCP transport 骨架 —— **方案短笺(先答两问,不写代码)**

> ⚠️ header 的 `ready` 由 Opus 依调度授权链翻牌,**不代表 Henry 本人逐张批过**。
> ⛔ **本单不是施工单。** 交付物是**一份方案短笺**,不是代码。**产品代码 diff 必须为 0。**

## 为什么先要短笺

`adjudication-discipline.md §1` 规定:**大架构面工单开工前,裁定方必须先答两问才放行施工。** transport 层是 12.2 里最容易「另造一套」的地方 —— 它天然想要自己的会话、自己的错误模型、自己的鉴权。**故先答两问。**

---

## 你要答的两问(**逐条答,不得合并**)

### Q1 平行机关问

> **本方案是否在既有正门之外,另造了承载同类职责的机关?若是,为什么正门不够?**

**必须逐项对照的既有正门**(不得只答「没有」):

| 职责 | 既有正门 | 你的方案是否另造? |
|---|---|---|
| 鉴权 | 现有 Express 中间件(`server/src/routes/**` 的鉴权链) | |
| 入参校验 | `server/src/validators/**`(zod) | |
| 工具目录 | **`server/src/toolFace/registry.ts` = 唯一权威**;`docs/generated/tool-face-manifest.json` = 忠实投影 | |
| 收据 | `server/src/services/toolFaceReceipts.ts`(`source_type='mcp'`,tier→status) | |
| 错误模型 | 现有 `AppError` + HTTP 状态码 | |
| 会话/状态 | **MCP 2026-07-28 已移除协议级 session** —— 若你的方案引入任何服务端会话状态,**必须在此显式申报并说明为什么无状态不够** | |

### Q2 基线保证问

> **本方案是否试图在局部制造它所依附的基线不提供的保证?若是,正解在基线层,不在局部机关。**

**已知的基线缺口(不得在 transport 层假装解决)**:

- **TD-6**:正文 + annotation 双 PUT **无跨资源 durable 耦合**,任一失败可半提交。**transport 层不得声称提供跨资源原子性** —— 那是基线缺口,归专项设计单。
- **TD-8 残余**:`applied_at`/`reverted_at` 靠**约定**而非机关维持单一格式。
- **TD-10**:manifest 的「单一 mapper」是约定不是结构锁。

**⇒ 若你的方案需要上述任一保证,答案是「在基线层补」,不是「在 transport 层兜」。**

---

## 设计约束(已拍板,短笺须在其内)

| # | 约束 | 出处 |
|---|---|---|
| C-1 | **MCP 2026-07-28 无状态核心**:移除协议级 session 与 `Mcp-Session-Id`;`tools/list` 不随连接变化 | 设计稿 §2.1 |
| C-2 | **MRTR 工具级 elicitation**(SEP-2322):`resultType:"input_required"` + `inputResponses` 重试原调用 | 同上 |
| C-3 | **能力协商降级**:client **未宣告** `input_required` 支持时,**confirm 档降级为 propose**(写 `proposed` 收据,等人审),**不得静默执行** | plan S3 |
| C-4 | **只暴露 `exposure==='public'` 且剔 `__` 前缀** | 设计不变量 08-22 补注(过滤只许在①机械门 killer ②本处 `tools/list`) |
| C-5 | **消费 manifest,不消费注册表** | 同上;注册表住 server 是权威,transport 读派生物 |
| C-6 | **范围**:本阶段只做 `ping` + `resolve_selection` 两个工具面入口;**不做写操作工具** | plan S3 |

---

## 短笺须包含(除两问外)

1. **transport 选型与理由**:`StreamableHTTPServerTransport`(官方 TS SDK)架在现有 Express 之后 vs 其他;**须说明 Host/Origin 校验由谁做**(Node transport 直用时须自实现)。
2. **`tools/list` 的派生路径**:从 manifest 到 MCP tool 描述的字段映射;**`__` 与非 public 的过滤发生在哪一步**,以及**如何证明它发生了**(将来的 killer 靶点)。
3. **C-3 降级的判定点**:在哪一层读 client 能力、降级后收据写什么、**人审入口是哪个**(与 12.2a-2 的 `proposed` 收据如何衔接)。
4. **错误映射表**:MCP 错误 ↔ 既有 `AppError`/HTTP 状态。**若需新错误类型,按 Q1 申报。**
5. **⚠️ 生产打包问题**(12.2a-1b 复核 M7 遗留,**至今无人处置**):server 目前只 `tsc src → dist`,而 manifest 在 `docs/generated/`。**生产 artifact 如何携带/定位 manifest?** 短笺须给方案或明确标为待裁。
6. **不做什么**:显式列出本阶段范围外的项。

---

## 边界

**允许**:**只写这一份短笺**(追加到本文件 `## Brief` 节)。

**⛔ 不得**:写任何产品代码 · 新增依赖 · 改 `package.json` · 碰 12.2a-1/a-2 已闭环面 · 碰 12.1 线 / v1 线 · 改 schema/migration。

**产品代码 diff 必须为 0**,回执须附阳性对照证明探针有效。

---

## D. 探针先过阳性对照 / 锁纪律

阴性断言前先让同一探针看见已知阳性;**确认命中不是来自你自己刚写进去的东西**。
**锁非你所有** —— 不取锁、不写 `owner.json`、不删锁;取锁失败即停,不得覆盖既有 owner。
📌 本环境:porcelain 对 `client/.../useNoteCanvasRuntimeController.ts` 有 stat/EOL 假阳性;判文件是否真改用 blob 哈希或 `git diff --numstat`;管道会遮蔽退出码;`grep -c` 数行数不是出现数。

## 回执

**⭐ 写 `## Brief` 是本单交付物,不需确认,直接写(UTF-8)。** header 保持 `ready`,不翻牌。

**须含**:Q1 逐行对照表(六项全填)· Q2 逐条 · 六项短笺内容 · 产品码 diff=0 的证明 · 显式范围排除。
