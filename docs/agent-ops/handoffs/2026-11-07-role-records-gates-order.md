> **状态 (Status)**: active
> **层 (Layer)**: 交接 / Handoff(订单)
> **日期 (Updated)**: 2026-11-07
> **权威 (Authoritative)**: 规格与单卡里的现行裁定是施工依据
> **from**: Main_Designer | **to**: builder;核验 Tester
> **起草**: 「个人学习讨论」会话按 Main_Designer 2026-11-07 的要求起草规格草稿;Main_Designer 审定、排期后派单

## 单卡(现行,覆盖写)

> 只记「现在」,历史在尾部。每块一个主人,只用 Edit 改自己那块,⛔ 整个文件覆盖写,⛔ 在副本里改。「阶段 / 持有者 / 下一步」谁交出谁改。

### 状态(Main_Designer)

| 项 | 阶段 | 持有者 | 下一步 | 更新 |
|---|---|---|---|---|
| 角色记录门禁与锁脚本(+ 规格 C 本机路径闸) | 排队 | Main_Designer | 编辑器组第二轮收割后派 builder;派单前完成「前置」两件 | 2026-11-07 |

**现行有效的裁定**(一条一行;被推翻的直接删,历史在尾部)

- 门禁照规格 A 施工,挂进 docs:check,所以 pre-commit 真拦会连带拦它 ← 「规格 A · 门禁脚本 check-role-records」
- 锁照规格 B 施工;推荐的用法是「取、跑、放」一条命令 ← 「规格 B · 锁脚本 heavy-lock」
- 派单前 Main_Designer 先做两件文档活 ← 「前置(Main_Designer 派单前做)」
- 本机路径模式进 `check:changed-file-secrets`,带夹具与自测,放行 `<home>`/`<tmp>`/`<session>` 占位;不扩到盘符路径与 IP ← 「规格 C · 本机路径进 `check:changed-file-secrets`(2026-11-07 追加)」

**已读到**:「交付」

### 已否决的做法(Main_Designer)

- 把隐私检查并进 check:changed-file-secrets:否。那条只挂在重型的 verify 链上,并进去就离开了轻量的 docs:check ← 「规格 A · 门禁脚本 check-role-records」
- 用日期比较判断单卡是否过期:否。同一天常有好几节裁定,日期只精确到天,查不出来;改按「已读到」等于最后一个标题来比 ← 「规格 A · 门禁脚本 check-role-records」

### 改动清单(builder)

- 基线 commit:
- 改了哪些文件:
- 冻结清单外的文件:

### 自报数字(builder)

> 一个数字一行,出处写全;没有出处的数字不写。证据文件写仓库内相对路径(在 `docs/audits/` 下),⛔ 会话临时目录和本机路径。

| 数字 | 命令 | 环境/版本 | 证据文件 |
|---|---|---|---|

### 待办(builder)

-

### 验收条件(Tester)

-

## 背景

Henry 2026-11-07 拍板了角色记录体系,依据是 `docs/agent-ops/analysis/2026-11-07-role-records-design.md` 第四节和第六节第 7、8 步。纯文档部分已经落地:看板、单卡、Tester 记录、角色卡、台账按月分文件。本单把**两样机械化的东西**做出来:

1. 一个门禁脚本:检查角色记录的形状和新鲜度,并且由它从单卡生成看板上「在办的单」那张表;
2. 一个锁脚本:让共享重活锁的取锁、写 owner、记日志、放锁变成机械动作,不再靠记性(11-06 一把孤儿锁挡了 Tester 17 小时)。

写法照 `scripts/check-tech-debt-table.mjs`:零依赖的 Node ESM;中文报错并写明修法;遗留问题放进只许缩短的豁免名单;文件头注释写明这道闸为什么存在。

## 前置(Main_Designer 派单前做)

1. 在 `docs/agent-ops/current-state/board.md` 的「在办的单」一节里插入两行标记 `<!-- board:items:start -->` 和 `<!-- board:items:end -->`,把生成区放在两行之间。**还没有单卡的事项**(待开单、TD 触发单、没建卡的旧单)移到标记下方,另起一张手写表「未建卡的事项(手写)」。门禁只管标记之间的内容。
2. 决定 `test:role-records` 要不要进 `verify:v2-bn8-runtime` 链。它很轻,推荐加。

**前置已办(Main_Designer 2026-11-07)**:①看板标记已插入,未建卡的两项移到「未建卡的事项(手写)」,已关闭的两项移到「本周关闭」;生成区现有 5 行(a19-a20 四项 + 本单)。②`test:role-records` **加进** `verify:v2-bn8-runtime` 链,放在链尾;它只读文档、秒级完成,红了说明看板或单卡与订单脱节,这正是该在版本收口前拦住的。③派单时机:编辑器组收割之后;builder 当前手里的单不动。

## 规格 A · 门禁脚本 check-role-records

**位置与形态**:`scripts/check-role-records.mjs`,零依赖 ESM,Node 22,从仓库根目录运行,只读(`--write-board` 除外)。三种用法:

| 用法 | 作用 | 退出码 |
|---|---|---|
| `node scripts/check-role-records.mjs` | 检查,只报不改 | 0 通过 / 1 有违规 / 2 用法错 |
| `node scripts/check-role-records.mjs --write-board` | 重新生成看板标记之间的表 | 0 / 2 |
| `node scripts/check-role-records.mjs --self-test` | 对 `scripts/fixtures/role-records/` 跑全部阳性对照 | 0 全部按预期红绿 / 1 |

报错格式:`❌ [规则编号] <文件>:<行> <问题>`,下一行 `   修法:<具体命令或改法>`。全部通过时打印一行汇总。

**「有单卡的订单」的定义**:`docs/agent-ops/handoffs/*-order.md` 中含有标题 `## 单卡(现行,覆盖写)` 的文件。括号和逗号的全角、半角都要认。没有单卡的旧订单一律不查。订单模板 `ORDER-TEMPLATE.md` 的文件名不以 `-order.md` 结尾,不在范围内。**单号** = 文件名去掉开头的 `YYYY-MM-DD-` 和结尾的 `-order.md`。

**规则**:

- **R1 看板生成区一致**:`board.md` 两行标记之间的内容,必须等于由全部有单卡、且状态头 `状态` 是 active 的订单生成的表,逐字比较(行尾空白不计)。不一致 → 报红,修法 `node scripts/check-role-records.mjs --write-board`。
  - 生成规则:每个状态表行生成看板一行;列 = `单号 | 项 | 阶段 | 持有者 | 下一步 | 现行正本 | 更新`;「现行正本」写 `` `<订单路径>` 单卡 ``;按阶段的枚举顺序排,同阶段按单号,同单号按单卡里的行序。
  - `--write-board` 只改两行标记之间,两次连跑不得产生差异。
- **R2 单卡状态表合法**:状态表的列固定为 `项 | 阶段 | 持有者 | 下一步 | 更新`。阶段 ∈ `排队 施工 待验 返修 待裁 待收割 待部署 已上岛 已核 关闭`;持有者 ∈ `Main_Designer Tester builder Henry`;「更新」是 `YYYY-MM-DD`。
- **R3 单卡新鲜度**:「已读到」后面「」里的文字,必须**等于**文件里最后一个 `##` 或 `###` 标题去掉井号和空格后的原文。⛔ 比日期:同一天常有好几节裁定。
- **R4 裁定引用存在**:「现行有效的裁定」和「已否决的做法」里,每行**第一个「←」之后**的每个「…」,都必须等于文件里某个 `##` 或 `###` 标题的原文。
  - ⚠️ 标题本身常带嵌套引号,比如 `编辑器组返修裁定:「改地址离开」一臂…`,所以要按「」配对计数来取,⛔ 用非贪婪正则。
  - 「←」之前的正文里也可能出现「」,那些不是引用,不查(2026-11-07 起草时手工核对撞到过一次这种误报)。
- **R5 自报数字有出处**:「自报数字」表每个数据行的「命令」「证据文件」都不能为空;证据文件必须是以 `docs/audits/` 开头的仓库内相对路径,并且文件真实存在。以 `/`、盘符、`~` 开头的,含 `<ops>`、`<home>`、`AppData`、`Temp` 的,一律报红。
- **R6 判语台账**:`docs/agent-ops/records/tester/verdicts.md` 表头固定 8 列(单号、项、判语、条件和尾巴、依据、快照哈希清单、部署核对、日期),每个数据行 8 格(照 check-tech-debt-table 的做法,防止 `|` 让列移位)。凡存在 `docs/audits/*/tester/review.md`(新布局)的单,台账「依据」列里至少要有一行含那个路径。旧的 `review-tester.md` 不查。
- **R7 台账编号**:只查月文件 `docs/agent-ops/claude-log/YYYY-MM.md`,标题按 `^## §(\d+)\s` 解析。所有月文件按名字排序后,编号从「冻结旧文件 `2026-09-09.md` 里最大的 §N 加 1」开始(现在是 §298),跨文件严格加 1、不重复;每一条从标题到下一个 `## ` 之间必须含「判断点」。
- **R8 状态头**:`docs/agent-ops/records/**`、`docs/agent-ops/roles/**` 下每个 `.md`,以及每个有单卡的订单,开头的引用块里都要有 `(Status)` 字段,而且它的值包含一个已知状态词。已知状态词照 `scripts/docs-index.mjs` 里的 `KNOWN_STATUSES`,判定方式与它的 `normalizeStatus` 相同。
- **R9 隐私闸**:只查**改动过和未跟踪**的文件,取法照 `scripts/changedFileSecretScan.mjs` 的 `uniqueChangedFiles`。那个文件一加载就会执行扫描,不能直接 import,把那几行复制过来。
  - 范围:`docs/agent-ops/records/**`、`docs/agent-ops/roles/**`、`docs/agent-ops/handoffs/**`、`docs/agent-ops/current-state/board.md`、`docs/audits/**`。⛔ 查 `docs/agent-ops/analysis/**`:设计稿描述规则时会写出这些模式。
  - 跳过二进制文件和超过 1MB 的文件。
  - **`.md` 文件**报红:
    - IPv4,但放行 `127.0.0.1`、`0.0.0.0` 和形如 `N.0.0.0` 的浏览器版本号;
    - 本机路径,四种:
      - Windows 用户目录,正则 `[A-Za-z]:[\\/]Users[\\/]`
      - Git Bash 的盘符写法,正则 `/[a-z]/Users/`
      - 正则 `AppData[\\/]`
      - 主目录下 .claude 里的 ops 目录,正则 `\.claude[\\/]ops`
    - ⚠️ 这一节写的都是正则原文,本身不会被自己命中。写进夹具时要用真实路径的形状,不要照抄正则。本单文件也在 R9 的范围里,修改时别写出真实路径;
    - 邮箱,但放行 `example.*`、`*.test`、`*.invalid`、`*.example` 这些保留域。
  - **`.txt`、`.log`、`.json`** 只查 IPv4 和邮箱,不查本机路径:原始日志难免带上副本路径。
  - 占位写法 `<home>`、`<ops>` 本来就不会命中。
- **豁免名单**:一开始为空,只许缩短。确需豁免的,写明规则编号、文件和理由。

**挂接**(只改根目录 `package.json` 的 scripts 字段,⛔ 动依赖):

- 新增两个 npm 脚本:`check:role-records` = `node scripts/check-role-records.mjs`;`test:role-records` = `node scripts/check-role-records.mjs --self-test`。
- 现有的 `docs:check` 末尾追加 ` && node scripts/check-role-records.mjs`。pre-commit 钩子跑的就是 docs:check(60 秒超时),所以挂上就等于提交时真拦。
- 是否加进 `verify:v2-bn8-runtime`,按「前置」第 2 条的决定。

**性能**:在当前仓库上跑一次不超过 2 秒,只调 3 次以内的 git、不联网。超出就停下来回报。

## 规格 B · 锁脚本 heavy-lock

**位置**:`scripts/heavy-lock.mjs`,零依赖 ESM。锁的位置**不写死在仓库里**:默认由运行时拼出(从 `os.homedir()` 起,依次拼上 `.claude`、`ops`、`heavy-job.lock` 三段,也就是现在大家手工用的那个私有锁目录),可以用环境变量 `COINCIDES_HEAVY_LOCK` 指定锁目录的完整路径来覆盖。日志 `heavy-job.log` 放在锁目录的上一级。锁仍然是「一个目录加一个 `owner.txt`」,现有直接 `mkdir` / `rmdir` 的脚本照样兼容。

| 子命令 | 行为 |
|---|---|
| `take --session <名> --purpose <一句> --order <单号或 -> --expect <分钟> [--wait]` | 用非递归 `mkdirSync` 原子取锁,写 `owner.txt`,在日志里追加一行。锁已被占时打印持有者、持有时长、进程是否还活着、是否已超过预计结束时间,退出码 3;带 `--wait` 则每 30 秒重试一次,每 5 分钟打印一行等待提示 |
| `drop --session <名> [--force --reason <一句>]` | `owner.txt` 里的 session 一致才放锁(先删 `owner.txt` 再 `rmdir`),日志追加一行并记下持有时长;不一致就拒绝,除非带 `--force` 加理由,日志里写明是强制放的 |
| `run --session … --purpose … --order … --expect <分钟> -- <命令…>` | **推荐用法**:取锁(默认 `--wait`)→ 起子进程跑命令 → 子进程结束、出错或收到中断时**一定**在 `finally` 里放锁 → 以子进程的退出码退出。`owner.txt` 里的 pid 记子进程的 |
| `status` | 打印「空闲」或持有者信息。进程已不在 → 标「疑似孤儿锁」;超过预计结束时间 → 标「超时」。**只提示,⛔ 自动删锁**,并给出 `drop --force --reason` 的修法 |

- **`owner.txt` 格式**:一行一个 `键: 值`,键是 `session`、`pid`、`taken`(ISO 时间)、`expect_until`、`purpose`、`order`。旧式 `owner.txt` 缺字段时,`status` 照样能读,标「字段不全(旧式取锁)」。
- **日志一行的格式**:`<ISO 时间>\t<take|drop|force-drop>\t<session>\t<order>\t<purpose>\t<持有时长或 expect_until>`。
- **判断进程是否还活着**:用 `process.kill(pid, 0)`(Windows 上也可用)。
- **自测** `--self-test`:用环境变量把锁指到系统临时目录下的一个新子目录,⛔ 碰真锁。覆盖六件事:
  1. 取锁成功
  2. 重复取锁被拒,退出码 3
  3. 不是持有者的 session 放锁被拒
  4. `run` 在子进程失败时也会放锁
  5. 持有者 pid 已不在时,`status` 标出孤儿锁
  6. 日志行数和动作一一对应

## 规格 C · 本机路径进 `check:changed-file-secrets`(2026-11-07 追加;第二次独立重发现即建闸)

**起因**:2026-11-07 Tester 与 Main_Designer 先后在公开仓已入库文件里发现本机路径(Windows 用户名、`AppData\Local\Temp` 下的临时目录、会话目录),共 82 个文件、约 400 处,已向前清掉(`51115479`)。这是同一类泄漏第二次被人手发现(F3 一次、这次一次),按「第二次重发现即机械化」,进现有的变更文件扫描。

**位置**:`scripts/changedFileSecretScan.mjs` 的 `patterns` 数组追加三条,其余逻辑不动:

| 名 | 模式(意图;写法由 builder 定,须有夹具) | 必须放行 |
|---|---|---|
| `windows user home path` | 盘符 + `Users` + 用户名,分隔符为任意深度的反斜杠或斜杠(JSON 里的 `\\` 也要中);以及 `/c/Users/<名>` | `<home>` 占位;`Users` 后面紧跟 `<` 的占位写法 |
| `windows temp path` | `AppData` + `Local` + `Temp`,同样的分隔符规则,不要求前面有用户名 | `<tmp>` 占位;文档里把中间写成省略号的说明(如「AppData…Temp」) |
| `agent session directory` | `claude` + 16 位十六进制 + UUID 的目录段,两种分隔符 | `<session>` 占位 |

- 扫描对象不变(工作区改动 + 暂存 + 未跟踪),所以老文件不会被重扫;历史已向前清。
- **夹具**:`scripts/fixtures/changed-file-secrets/` 下,每条模式一份坏样本(含 JSON 四重反斜杠形态一份)、一份全部用占位的好样本;加 `--self-test`(或同等机制)让坏样本红在自己那条、好样本绿。现有七条模式各补一份坏样本顺带把老闸也盖住。
- **当前仓库**:加完后在当前树上跑 `npm run check:changed-file-secrets` 必须退出 0——若红,红的那处要么是真漏网(清掉),要么是说明文字(改写),回执里逐条列。
- 本规格不扩到 `D:\…` 这类盘符路径(仓库自身路径到处都是,信息量低);不扩到 IP(另有人工 grep,岛的地址从未进仓)。

## 允许面

- `scripts/check-role-records.mjs`
- `scripts/heavy-lock.mjs`
- `scripts/changedFileSecretScan.mjs`(只加模式与自测,规格 C)
- `scripts/fixtures/role-records/**`、`scripts/fixtures/changed-file-secrets/**`
- `package.json`:只改 scripts 字段(新增两个脚本、docs:check 末尾追加一段;规格 C 若需要自测入口再加一个)
- `docs/audits/2026-11-07-role-records-gates/**`:证据放在其下的 `builder/`
- 不许触碰:`package-lock.json` 和任何依赖、看板 board.md(归 Main_Designer)、其余文档和规矩文件、产品代码

## 必红判据

- **阳性对照夹具**:`scripts/fixtures/role-records/` 下,R1 到 R9 每条规则至少一份**只违反这一条**的坏样本,外加一份全部合规的好样本。`node scripts/check-role-records.mjs --self-test` 必须让每份坏样本**红在自己那条规则上**(按规则编号核对,不只看退出码),让好样本绿。
- **R3、R4 的专门样本**:单卡落后一节,但日期相同,必须红;标题带嵌套「」的引用,对的必须绿,错一个字必须红;「←」之前正文里的「」不得误报。
- **变异落地证明**:对 R3、R4、R5、R9,各把检查逻辑临时改坏一次(在副本里改,⛔ 在交付件上改),证明相应的坏样本因此转绿,再还原。输出存进证据目录。这证明的是规则真在起作用,不是摆设。
- **锁**:`node scripts/heavy-lock.mjs --self-test` 六项全过。把 `run` 里放锁的那段临时去掉,第 4 项必须红(同样在副本里做)。
- **当前仓库**:「前置」做完后,`node scripts/check-role-records.mjs` 在当前树上退出 0;`npm run docs:check` 退出 0。

## 验收

1. 上面「必红判据」全部有证据文件,数字按单卡「自报数字」的格式写:一个数字一行,写全命令、环境和证据文件。
2. 当前树上的运行时长(2 秒以内)和 docs:check 的总时长都写进证据。
3. `--write-board` 连跑两次没有差异,标记之外的内容一个字不动。
4. Windows 上 Git Bash 和 PowerShell 各跑一遍门禁和锁自测。
5. 没有新依赖,`package-lock.json` 字节不变。
6. 锁自测前后,真锁目录和日志的状态不变(给出前后对比)。

## 交付

证据落 `docs/audits/2026-11-07-role-records-gates/builder/`。红线:⛔ git 写操作、⛔ 真实模型、⛔ 碰岛、⛔ 读 key、⛔ 动依赖锁、⛔ 扩修。跑自测前按现行规矩取共享重活锁(本单交付之前,还是手工 `mkdir` 加 `owner.txt`)。回执追加在本文件尾部 `## 角色记录门禁与锁脚本 Result(builder YYYY-MM-DD)`,并把单卡状态改成「待验 · Tester」。

Tester 复核时的重点:独立跑两个自测;想办法让一张过期的单卡通过检查(比如同一天新加一节裁定);检查嵌套「」的标题引用;确认 pre-commit 钩子在违规时真的拦下提交(在副本里做)。
