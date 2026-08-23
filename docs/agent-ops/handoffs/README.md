> **状态 (Status)**: active
> **层 (Layer)**: 现状 / Current-State（协作协议）
> **日期 (Updated)**: 2026-06-27
> **权威 (Authoritative)**: 是

# handoffs —— Henry × Claude × Codex 三方交接区

## 为什么存在

让三方协作**不靠人肉转述**。Henry 不再把一个 agent 的话复制粘贴给另一个 —— 交换单位是**仓库里的一份交接文件（spec / 结果 / 问题）**，各 agent 直接读写。

这套设计直接来自 Coincides 自己的产品原则：

- **共享基底**：repo 之于我们，如同 ContentGroup 之于人 + AI —— 同一份结构化产物，谁都不替对方翻译。
- **Proposal → Review → Apply**：Claude 写 spec（proposal）→ Henry 审/改（review）→ 翻牌 `ready` 后 Codex 执行（apply）。
- **不替用户决定**：Henry 仍是导演 —— 他审每一份交接，但只做「点头 + 触发」，不做转述。

## 文件格式

一份交接 = 一个 md。文件名：`YYYY-MM-DD-<slug>.md`。顶部一行 header：

```
> from: <claude|codex|henry> | to: <claude|codex|henry> | status: <draft|ready|done|closed> | re: <slug> | date: <YYYY-MM-DD>
```

正文 = spec / 结果 / 问题本身。**写成 spec（文件、契约、验收标准、约束），不是聊天语气** —— spec 没有口音，任何 agent 读起来一样。

## 状态流转

- `draft` —— 作者写好；若是「要建的活」，需 Henry 审过才能往下。
- `ready` —— **Henry 已批准**；目标 agent 可以执行。（这是唯一的人工闸：Henry 把 `draft` 翻成 `ready`。）
- `done` —— 目标 agent 做完，在同文件追加 `## Result`，或另写一份回执交接。
- `closed` —— 已确认收口，可留档。

## 流程

1. Claude 写 spec → `from: claude / to: codex / status: draft`。
2. Henry 读、改、把 `status` 翻成 `ready`。
3. Codex 开工时（由根 `AGENTS.md` 指引）扫到 `ready` 的活，执行，写回 `status: done` + `## Result`。
4. Claude 读回执，审 diff，给结论。

## 约定

- **不删原文**：交接是 append-only；状态只在 header 里改。
- 一份交接只干一件事（一个 `re:`）。
- 遇到与 spec 假设不符的情况**不要猜** —— 在 `## Result` 里记下、标 `needs: claude/henry`。
- `done` / `closed` 的交接可移到 `archive/` 子目录，或留原地。


## Builder 侧回执纪律(2026-08-20 增,05 链教训)

1. **回执语言不得宽于实现**:申报「全部/一律/零触碰」前逐字核对实现射程;窄绿不得扩写成全闭合(V12 期间四犯记录在案:01 MED-1/03.3 自述过宽/05.4 范围表/05.6 保存口径)。承重结论与装饰数字自行分开标注。
2. **平行机关申报**:新造任何承载既有机关同类职责的机关(状态存储/恢复载体/守卫层/事务边界),须在方案短笺与回执中显式申报「为什么既有正门不够」;未申报的平行机关=复核即记 finding。
3. **回执写入必须 UTF-8**(2026-08-21 增,Spark 首单事故):Windows 下 PowerShell `>>`/`Out-File` 默认编码会把回执写成 GBK 混入 UTF-8 文件。写 handoff 一律用 UTF-8 显式编码(`Set-Content -Encoding utf8` / node `fs.appendFileSync(p, s, 'utf8')`),写后自检 `file`/首行非乱码。

## 翻牌来源标注(2026-08-21 增,调度下沉后)

`ready` 的翻牌方有两种,**工单文首必须注明是哪一种**:①**Henry 本人**批准;②**调度方(Opus)按 Henry 亲授的下沉工作流**翻牌(注明设计裁定出处,如「Fable 裁定 §x」),并明写「不代表 Henry 逐张批过」。理由:两张牌的授权强度不同,将来回看必须分得出来(Henry 保留全量推翻权,逐张可翻)。

## 同树串行原则(2026-08-21 增)

共享工作树上**同一时刻只跑一个 builder**;两单触及面重叠(尤其 `server/`、生成件、同一条 verify 链)时一律串行;隔离 worktree 因 Windows 下 node_modules 成本不作默认。判据=正确性与配额,不是墙钟。理由:并行同树=宽 add 事故的放大版,改动归因不可能。

## 验证链接线规则(2026-08-21 增,S1 FAIL 产物遗留事故定形)

`verify:*` / `check:*` 主链的定义是**验收基础设施**,不是普通代码:①新门**只在复核 PASS 后**由调度方接线,builder 工单里「接入 verify 链」一律理解为「交付可接线的门 + 接线 diff」,接线生效归复核后;②判 FAIL 的门若已生效,**撤接线**(产物可随 FAIL 判定存档,但不得承重);③撤/接属裁定方定义权,调度方执行须留字据。理由:链里掺一条空转断言,每次「verify 全绿」回执都在说谎(5-4 证人须承载答案);FAIL 单的产物留在任何承重位都是洗白。

## 上游方向未证因果须标明并授权推翻(2026-08-21 增,12.1.1 先例)

工单引用的上游判断若只是相关而未证因果(如「强指向 `order_index`」),调度方必须**在单里标为未证,并明确授权 builder 证伪**。理由:写成「根因」builder 会去凑解释而不是去证伪;12.1.1 正因写了这句,builder 做了真实验把它推翻,省掉一轮错修。

## 触及面申报前先验连接(2026-08-21 增,12.1.2 两次越界定形;阳性对照升层到写单)

调度方宣称「允许触及面够用」之前,**先验证所需的数据/调用连接确实存在于面内**(探针先命中面内一个已知连接,再断言所需连接在/不在),依据写进工单。理由:12.1.2 两条越界(A 的 controller 无数据输入且调用顺序晚 69 行;B 的「单一 helper」不存在)都是一条 grep 的事,却花了两次 5.6 全程——边界划错的成本由 builder 整轮支付。

### 同树串行的机械锁(2026-08-22 增,双发事故定形)

事故:Opus 离线 1.5h 后 Fable 代发 fix2 builder;Opus 恰在同一分钟醒来读到已提交的工单并自行起 builder——**两个 builder 同树并跑 21 秒**(Fable 发现后杀掉自己那只)。原则靠消息协调挡不住时差,改用机械锁:**起 builder 前 `ls .codex-tmp/builder.lock`,存在即不起;起时写入 `{单号, PID, 发单方, 时间}`;builder 退出后由发单方删锁。** 代发的一方必须在起之前再看一次调度方 scratchpad 的最新文件(`ls -t`),不是只看消息。

#### 机械锁加固(2026-08-22 晚,Opus 明知锁在仍覆盖一案后,Fable 判定采纳)

锁是文件,能被看见不能阻止被覆盖——自律挡不住时差也挡不住「查了没停」。改为**原子取锁**:①取锁用 `mkdir .codex-tmp/builder.lock.d`(原子,已存在即失败)再在其中写 `{单号, PID, 发单方, 时间}`;**失败即不得起进程**,把拒绝写进日志;②陈旧锁判据=目录内 PID 已死且 ≥20 分钟,此时才可清;③**锁只由写锁者删,删前核对发单方字段**——守护/监视器不得删别人的锁(Fable 的守护此前亦有「任意 codex 退出即删锁」的同病,同改);④builder/reviewer「结束」判据=**进程消失 + 20 秒落定**,`## Result` 出现不算结束(2b00fe6 中途快照事故)。旧的 `builder.lock` 文件形式废止。

#### 取锁必须是一步(2026-08-22 深夜,12.2a-2 builder 覆盖 owner 一案)

**事故**:12.2a-2 builder 开工时跑取锁流程,`.codex-tmp/builder.lock.d` 已存在(调度方持有),取锁**正确失败**;但**紧随其后的 owner 写入照常执行**,把既有 `owner.json` 覆盖成自己的(`dispatcher: user-direct`),原 owner 字段不可恢复。
> ⚠️ **该 builder 的后续处置是对的**:它**没有删锁**,并标 `needs: claude/dispatcher` 交回发单方核对。**问题不在它,在流程。**
> ⚠️ **归因更正**:调度方(Opus)当时据此判为「第三次双发/有第三方」,**判错了** —— 没有第三方,是同一只 builder 的取锁流程。**锁被改写不等于有人抢跑;先读 owner 再下结论。**

**根因**:取锁(`mkdir`)与宣称所有权(写 `owner.json`)是**两步**,失败与否不联动 —— **原子的只有前一步**。另:该 builder 用的是 PowerShell `New-Item -LiteralPath`,在本机 PowerShell 5.1 上不可用,失败原因被淹没。

**规则**:

1. **取锁与写 owner 必须在同一条命令链里,前者失败则整链中止**。Git Bash 推荐:
   ```bash
   mkdir .codex-tmp/builder.lock.d 2>/dev/null      && printf '%s
' '{"order":"...","pid":"...","dispatcher":"...","started":"..."}' > .codex-tmp/builder.lock.d/owner.json      || { echo "⛔ 取锁失败,不得起进程"; cat .codex-tmp/builder.lock.d/owner.json 2>/dev/null; exit 1; }
   ```
   PowerShell 侧**不得用 `New-Item -LiteralPath`**(5.1 不支持);用 `New-Item -Path -ItemType Directory -ErrorAction Stop` 并置于 `try/catch`,catch 内**只报错不写 owner**。
2. **owner.json 一旦存在即不得覆盖**。写入前须 `test -e` 或 `set -o noclobber`;**已存在 = 取锁失败**,按 §③ 处置。
3. **builder / reviewer 提示词须明写**:「**锁非你所有,取锁失败即停,不得覆盖 owner,不得删锁**」——发单方持锁是常态,被派方本就不该取锁。

> **本条与上一条同源**:凡「靠自觉不去覆盖」的环节迟早会被覆盖。**能原子的就原子,不能原子的就让它整链失败。**

