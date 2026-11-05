> **状态 (Status)**: active
> **层 (Layer)**: 核验报告
> **日期 (Updated)**: 2026-11-05
> **权威 (Authoritative)**: 否（判语归 Main_Designer）

# V1、F1、F2 核验报告（Tester(1)）

单据：`docs/agent-ops/handoffs/2026-11-05-view-toggle-and-docx-text-formula-order.md`。

## 判语

**建议放行收割和部署，没有阻断项。** V1、F1、F2 的验收都过了，全量已重跑。另有 6 条小问题，都不丢用户数据，其中 2 条是一两行的修法，可以顺手带上（见第三节）。

**还不能说「Henry 的问题解决了」。** 两条复现路径都修好了，但 Henry 走的是哪条仍未确认。上岛后要请他本人再试一次。

## 一、核验对象与环境

- 对象：HEAD `2f85f9cc` 加工作树 15 个文件，单独冻成快照再测，没有碰共享树。各文件哈希见 `tester-snapshot-hashes.txt`。交报告前复核过，工作树这 15 个文件与快照一致。
- 运行：快照的服务端和构建后的客户端，本机独立端口，全新数据库，真 LibreOffice，没有模型密钥，零真实模型调用。
- 浏览器：无头真 Chrome，真鼠标事件，真键盘事件。

## 二、验收对账

### V1 · 文本切回原页

| 验收项 | 结果 | 证据 |
|---|---|---|
| 窄窗口来回切 | ✅ docx、PDF × 1440、1024、761、760、700、400，每组 3 来回，按钮都是最上层元素，0 个页面错误 | `tester-walk-v1-a-d.log` A 段 |
| 我复现的 Layout 路径 | ✅ docx、PDF × 1440、1024。手写笔记开 Layout，点 tab 到投影：Layout 已关，无虚线框，来回 3 轮都通 | 同上 B 段 |
| 回手写笔记 | ✅ Layout 是关的，按钮可用，能再打开。两篇手写之间保持开启（行为变化与回执一致） | 同上 B 段 |
| 手动选择不被默认判决覆盖 | ✅ 真转换窗口内：不操作，8.9s 首页到达后翻原页；手点 Text，完成后仍是文本；滚到 600，完成后仍是文本且位置不动 | `tester-walk-v1-e-i.log` |
| 记忆 | ✅ 回到同一页页顶（2400→1342），与修前同为页级；选文本后离开再回，仍是文本；刷新回默认原页 | a-d.log C 段 |
| T-D2-1 | ✅ 文本态直达另一篇没开 tab 的投影，再回来，记忆没有串 | a-d.log C 段 |
| stale-jump 类：血缘标跳页 | ✅ PDF p.3、p.7、p.11 都精确落页（页顶偏移 0），跳完能切回文本 | `tester-walk-rebuild-chips.log` |
| 无切换的格式 | ✅ md、png、手写都没有切换入口 | a-d.log C 段 |
| 挡字 | 见 T-V1-2 | 截图 |
| 键盘 | ✅ Shift+Tab 可达，Enter 能切换 | e-i.log |
| Overview、Preview、打印 | ✅ Overview 中可点，切原页后退出 Overview，再切回文本正常；打印时与工具栏一样隐藏 | a-d.log D 段、e-i.log |
| 单元回归 | ✅ 含两条新测试，全量全绿 | 第四节 |

Agent 面板打开时切换按钮不可点，但这个面板是带遮罩的模态层，页面所有元素都被盖住，不算本单问题。

### F1 · docx 文本层保住公式

| 验收项 | 结果 | 证据 |
|---|---|---|
| 无 `= =` | ✅ 全结构样本 65 式、金融讲义、公式压力：都没有 `= =` | `tester-f1-output.txt` |
| 单据点名的结构 | ✅ 分式、上下标、根号、求和积分、括号、函数、矩阵、重音都对，另测了前置上下标、极限、方程组、线性和无线分式 | 同上 |
| 字符守恒 | ✅ 我另写的按序核对（去掉转换器加的命令名后比对原始 `m:t`）：只差 `w:del` 里本来就该去掉的内容。第二来源（LibreOffice 重导出的 OMML）65 式 280 字全部保留 | `f1_oracle.mjs` 在 scratch，结论见此 |
| 无公式文档不变 | ✅ `xml` 不含 `oMath` 时返回同一个 buffer（读码），规整文档投影正常 | |
| 预处理失败不影响导入 | ✅ builder 的阳性对照已证，我未另造失败 | `positive-controls.txt` |
| 文件形态 | ✅ BOM、无声明头、CRLF、未声明前缀属性、非 `m` 前缀、严格命名空间、注释和 PI、控制字符，都正常转换 | |
| 特殊位置 | ✅ 表格、超链接、内容控件、修订插入都保留；修订删除的整个公式正确消失；空公式不留 `$$`；同段多式；正文直挂的公式 | `tester-f1-output.txt` |
| `assertDocxExpansionSafe` | ✅ 对原文件执行（读码：`sourceArtifact.ts:330`） | |
| 依赖 | ✅ 只多 `jszip`、`@xmldom/xmldom`，lock 只多 2 行，`npm ci --dry-run` 通过，tsx 下导入正常 | |
| 原件不动 | ✅ Rebuild 前后 blob 哈希相同，页影像资产 ID 相同 | rebuild log |
| 真转换 | ✅ 全结构 3 页、金融讲义 6 页、PDF 12 页，都 complete | |

**真实旧笔记升级（Henry 的实际路径）**：我用修前代码同库导入，得到真旧笔记 `PV =  = 面值`，再切到修后版本：

- 重传同一文件：去重，还是旧笔记，还是 `= =`。**所以重传拿不到公式。**
- Source Library 行尾的 Rebuild：弹窗列出批注、标签、内容组等计数和后果，确认后公式出现，横幅和 Incomplete 徽标消失，旧笔记 ID 返回 404，开着的旧 tab 自动指向新笔记，默认进原页。
- **入口只在 Source Library**，项目页的 Source 面板没有。

### F2 · 横幅误报

| 文档 | 期望 | `has_parser_messages` | 文本视图横幅 | 原页视图 |
|---|---|---|---|---|
| 仅样式告警（段落、字符、表格，文档带 `styles.xml`） | 不提示 | false | 无 | 无 |
| 纯公式 | 不提示 | false | 无 | 无 |
| 公式加 `fldSimple` 丢字 | 提示 | true | 有 | 无 |
| 样式加 `ruby` 丢字 | 提示 | true | 有 | 无 |
| 规整文档、金融讲义、全结构 | 不提示 | false | 无 | 无 |

builder 申报的 Table 样式无端到端测试，这里补上了：带 `styles.xml` 时走通，mammoth 报 `Table style with ID ... was referenced but not defined`，被正确过滤。

## 三、发现（都不阻断）

| 编号 | 级别 | 现象 | 复现或证据 | 建议 |
|---|---|---|---|---|
| T-F1-1 | minor | 命令型定界符后面紧跟字母时，生成的 LaTeX 非法：`\left\langlex\right\rangle`。`\lfloor`、`\lceil` 同样。KaTeX 报 `Undefined control sequence`。今天文本视图不渲染，只影响复制出去和 Agent 解析；以后要渲染公式就会炸 | `tester-katex.log` | 一行：`DELIMITERS` 里命令型的值带尾空格，如 `'\\langle '` |
| T-F1-2 | minor | `m:bar` 没有 `m:pos` 时写成 `\overline`。LibreOffice 按下横线导入。**下横线会变成上横线，语义相反**。没有 MS Word，所以 Word 本身没测 | 全结构「下横线bar无pos」；LibreOffice 重导出后写成显式 `bot` | 一行：`pos === 'top' ? overline : underline` |
| T-F1-3 | minor | 公式**内部**的修订删除文字会留下：`$keepgoneadded$`（`gone` 是被删的）。整个公式被删时正确 | 全结构「式内修订」 | 遍历时跳过 `w:del`、`w:moveFrom`。守恒兜底要同步排除，否则会退回全文 |
| T-F1-4 | minor | `m:groupChr` 非括号字符丢语义：`→` 组变成 `\overbrace{a}`。箭头重音变 `{v}^{→}`（字符还在，只是不好看） | 全结构「箭头组」「箭头acc」 | 可缓 |
| T-V1-1 | minor | Groups 面板打开时盖住右上角的切换。旧版切换在底部工具栏，不受影响。关掉面板就能点 | `D-groups.jpg` | 可缓，入 tech-debt |
| T-V1-2 | minor | **挡字答复**：1440 不挡；1024 按钮与全宽行约重叠 15px，截图里没看到压字；700 宽滚动时盖住视口顶部 2～3 行的行尾，滚走就露出来。builder 已申报 | `A-docx-1024-text-scrolled.jpg`、`A-pdf-700-text-scrolled.jpg` | 接受 |

**规模实测（不算问题）**：到块上限的文档（5000 段，约 1 万个公式）解析 2445ms，事件循环最长停 1826ms；同文档无公式 307ms、168ms。这是一次导入一次的开销，这台机器上的数。岛上长驻单进程，这段时间其他请求会等，记录备查。

## 四、全量

| 端 | 结果 |
|---|---|
| 客户端 | 251 文件，2588 条，全绿 |
| 服务端（`src`、`scripts` 下全部测试） | 1301 条，1286 过，15 红 |

15 条红逐条归类（`tester-server-full.txt`）：

- **1 条既有**：`real empty-claim journey`（harness），签名与 builder 回执相同。
- **14 条是我的快照环境造成，补齐后都过**，与代码无关：
  - `v13MediaBlocks` 11 条：缺 `CANVAS_ASSET_DIR`。
  - `v14ClaimObservation` 1 条：`.eval-runs` 被 git 忽略，快照里没有。
  - `v2TestV2ManifestHook` 1 条：不是经 npm 启动，缺 `npm_execpath`。
  - `v14OwnershipContract` 文件级 1 条：我把 `shared/dist` 做成联接，检查脚本拒绝读链接；换真目录后 12/12。

条数比 builder 的 1310 少 9 条，是文件清单口径不同，我没有逐条对差。根 `scripts` 下的 3 个测试文件另跑：31 条，5 条红（`check-tool-face-parity` 文件级 1 条加 `docs:tool-face-manifest` 那组，同样缺 `npm_execpath`）；补上后 `check-tool-face-parity` 10/10，全量的另外两个文件没有再整体重跑。

门禁：server `tsc -b` 0，client `build`（含 `tsc -b`）过，`check:owned-helper-contract` PASS。`check:test-wiring` 在快照里没跑成（脚本路径不对），只核了 `docxOmmlText.test.ts` 已写进 `test:v2`，其余沿用 builder 的 `gates.txt`。

## 五、切不回这条的漏因

这条在 1a 复核、1a-乙复核、补丁核验和 round-04 第一段走查里都没被抓到。原因是我的走法有结构性盲区：

1. **我的探针每次都用 `?r=` 整页刷新进笔记。** Layout 状态是 `useState('off')`，刷新就复位，所以「把 Layout 从手写笔记带进投影」在我的走法里根本走不到。这是方法问题，不是运气。
2. **宽度矩阵没有 ≤760。** 我的走查都在 1024～1440，内置面板固定 1280x800。折叠规则 09-20 就在，切换按钮 11-02 放进那一组，一直没人在窄窗口下看过。
3. **只审 diff，没追禁用条件的来源。** `pagesDisabled={layoutMode}` 来自 `ad108ef2`，不在 1a-乙的 diff 里。D2 把默认改成原页后，「文本切回原页」从支线变成主路径，这时应该重新问一遍「什么会挡住回去」，我没问。
4. **第一段走查看到了线索没追。** 我记过「文本视图的切换在底部工具条，原页在右上」，只当位置差异记录，没有去想这个工具条什么时候会不可用。
5. **单元测试层面**，工具栏被 mock，测的是控制器，没有测按钮够不够得着。

**以后怎么走**（我自己的走查清单）：

- 进笔记要同时走「整页刷新」和「站内导航带状态」两种。
- 带状态至少覆盖 Layout 开、面板开。
- 宽度矩阵固定含 ≤760。
- 默认行为一变，就把被它推上主路径的支线重新审一遍。

这轮走查已按这个清单走，也因此第一次跑 A 段就暴露了我自己探针的问题：新账号的欢迎弹窗盖住了点击，而探针把「没切走」记成了 ok。那一轮已作废，改成两个方向都核对后重跑。

## 六、没有验到

- **Henry 走的是哪条路径**：他的症状确认还没回。上岛后请他重试；如果两条都不是，V1 就还没解决。
- **真实 Word 文档**：这里没有 MS Word，样本是按 Word 写法手造的，加 LibreOffice 重导出。Henry 的真实金融文档可能有没覆盖到的结构，那种情况退回 `m:t` 拼接，不丢字但不好看。
- **Linux 上的 LibreOffice**：转换走的是 Windows。岛上的转换器这轮没变，第十七轮已实测。
- **切窗口**、真实输入法：无头环境测不了。

## 七、部署与收割提醒

1. **收割要和 A-18 分开。** builder 已在同一棵树上开工（`.claude/launch.json` 里有它的 scratch 配置，这个文件不要收）。我验过的是 `tester-snapshot-hashes.txt` 里的版本；如果 A-18 动到这些文件，收割后的内容就不是我验过的。
2. `server/package-lock.json` 变了，岛上要 `npm ci`。此后新解析的文档会记录新的转写器指纹（builder 已申报，既有机制）。
3. **Henry 的旧文档要手动 Rebuild 才有公式**，重传没用。入口只在 Source Library 的行尾图标。代价：批注不迁入（留快照回执），标签、链接、外观不保留，内容组失去实时链接，笔记 ID 变；被其他笔记或白板引用时会被拦住。弹窗会列出计数。**是否对他的文档执行由他本人决定。**
4. 上岛后我再走一遍：Layout 路径、窄窗口、含公式 docx 新导入、横幅矩阵、一次 Rebuild（只在我自己的账号）。

## 过程留痕

- 为了按规定用 preview 工具起验证服务器，我两次在 `.claude/launch.json` 临时加一条配置，起完立刻撤回。现在这个文件里只剩 builder 的改动。
- 快照和测试数据都在系统临时目录，收尾时清理。联接目录用 `rmdir` 拆，不穿透。
- 全程没有碰岛、Henry 的账号和数据，没有改产品代码，没有 git 写操作。
