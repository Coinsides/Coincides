> **from**: claude(Main_Designer)
> **to**: 临时工程对话1(builder)
> **status**: ready(排队件:F7 收口后开工)
> **单号**: VPS-F8 · 设置页初始化竞态 + 采纳刷新 + 笔记列举工具三修单
> **上游**: Tester(1) round-02 报告(A-14/R2-07④/A-15,docs/brainstorm/field-tests/round-02/)

# VPS-F8 · 三修单

## 一 · 修一(A-14):设置页整页加载显示错误提供方(潜在误写)

- **现象**:甲账号实际 deepseek,`#/settings` 整页刷新后 Provider 下拉显示 Anthropic+claude-sonnet-4(2/2);站内跳转则正确;此时点 Save 会把 Anthropic 写成显式选择(未验证,Tester 没点)。
- **根因方向**(Tester 推断):表单在用户设置/default_chat_provider 加载完成前用硬编码默认值初始化——F4-1 的「显示生效者」只在站内跳转路径成立。
- **修法**:表单初始化等数据到齐(loading 态或 effect 同步),⛔以硬编码默认值作首渲染值;加载中 Save 应禁用;
- **测试**:整页加载时序 mock(settings 晚到)→ 下拉最终显示生效者、加载中不可 Save;站内路径回归。

## 二 · 修二(R2-07④):Agent 提案采纳后宿主列表不刷新

- **现象**:采纳笔记提案后项目页笔记数不变(10 秒+关面板仍旧);卡组页采纳卡片提案同样不刷新;整页刷新才见。
- **修法**:把 F4-3 的失效信号机制延伸到提案采纳路径(采纳成功→通知宿主 store/回调重拉),⛔另造第二套机制;笔记与卡两处都要;
- **测试**:采纳笔记提案→项目页笔记列表即时出现;采纳卡提案→卡组列表即时出现。

## 三 · 修三(A-15):Agent 缺笔记列举能力且断言「没有」(设计已拍)

- **现象**:工具链只有 search_documents/read_content_groups,无列举/搜索用户自写笔记的工具;Agent 于是断言「项目里没有笔记」,并在后续轮引用该错误结论(比 R1 的「列不出要 ID」更糟)。
- **设计(Main_Designer 拍定)**:
  1. 新增**只读工具 `list_notes`**:按 course_id(可选,缺省=当前上下文项目;无项目上下文时要求参数)列用户笔记——返回 id/title/note_class/updated_at,上限 50 条按 updated_at 倒序,超限注明总数;⛔返回正文(读正文走 read_note);⛔列其他用户;
  2. **system-prompt 诚实条款**:工具做不到的事,如实声明边界,⛔据空结果断言用户内容不存在——措辞你拟,追加式 amendment,冻结用例按 C2/C4a/F6 先例登记;
  3. definitions 工具描述与 read_note 的接法写清。
- **测试**:list_notes 正常列举/课程过滤/上限与总数注明/不含正文/跨用户隔离(用既有隔离测试同形写法,属功能回归);提示词 amendment 哈希纪律;search_documents 行为不变。

## 三甲 · 修四(F7 侦察转正,Main_Designer 核准):「Source locked」标签错配

- 按 F7 回执建议执行:chrome 锁标签只看 `sourceProjectionPolicy.contentReadOnly`(单独传 `sourceLocked`),瞬时忙态(headingStructure.busy 等)另用无文案 busy 态,⛔再让用户自己的笔记闪「Source locked」;约 5 行+一条用例(转标题期间锁标签不出现)。

## 四 · 验收与测试面

client+server 定向;正门纪律;阳性对照≥1(荐修三:工具摘除→列举用例红);⛔真实模型调用;⛔全库马拉松。

## 五 · 纪律

照抄现役全套(⛔git 写/⛔.env 值/⛔用户库/⛔动锁文件/⛔安全对抗类用例/合成值规矩/措辞中性)。

## 六 · 回执协议

本文件尾部 `## Result` 五件套;证据 `docs/audits/2026-11-01-vps-f8-builder/`;完工短讯。

## 七 · 不在射程

笔记全文搜索/语义搜索(向量版另案);B-39(材料区上传后刷新,🅱 批);其余 🅱;A-10/A-11(F6 已修候复测);A-12/A-13(F7 在工)。

## Result — 2026-11-01 · 临时工程对话1

**执行状态**:修一至修四 `done`。交工作树,未 commit(client 10 改 + 1 新、server 9 改 + 2 新、current-state 2 改;+204/−35,新文件 315 行)。证据 `docs/audits/2026-11-01-vps-f8-builder/`(`evidence-summary.md` 为可提交索引,`*.log` 被 .gitignore 忽略)。

### 修一(A-14):设置页整页加载竞态

- **根因确认**:整页加载时 `user` 晚于首渲染到达;表单 `useState` 以 `'anthropic'` 初始化,而 F4-1 的同步 effect 只在 `settings.active_provider` 为空时取 `default_chat_provider`。用户设置随后到达时 effect 直接 return,**已存选择永远不被写回表单**,于是显示 Anthropic,此时点 Save 会把它写成显式选择。
- **修法**:新增 `providerReady`。在 user 到达前,下拉禁用,Save 显示「Loading...」且禁用。user 到达后,有已存选择则按已存同步 provider/model/baseUrl,无则取 `default_chat_provider`(失败兜底静态默认),两种情况都随后置 ready。同族隐患一并收:**Agent 名**(晚到时 blur 会用「Mr. Zero」覆盖已存名)与 **Embedding**(挂载时用空 settings 判断生效者)改为 user 到达后同步,Embedding 的 Save 在 user 与状态到齐前禁用。
- **浏览器实证**(临时实例,scratch 库):显式存 DashScope → 整页 reload → 下拉 DashScope / qwen-plus,Save 可用(截图在证据目录)。之后已改回 DeepSeek。

### 修二(R2-07④):采纳后宿主列表即时刷新

- **沿 F4-3 同一机制**(宿主订阅共享 store,变化时静默重拉),未另造事件:收件箱采纳成功后刷新 `courseStore.fetchCourses()` 与新增的 `deckStore.refreshLoadedDecks()`。
  - 项目页在既有 goals/decks 订阅上加订本项目的 `recent_note`(id+updated_at 原始值),变化时同时重拉 summary 与笔记列表。
  - 卡组页订阅本卡组 `card_count`,变化时重拉卡与分区。
- **取舍申报**:没有用无过滤的 `fetchDecks()` / `fetchGoals()`。Decks 页与 Goals 页按课程过滤载入同一 store,无过滤重拉会把别的项目的条目混进来。`refreshLoadedDecks` 只更新已在列的卡组,不改成员与过滤。**目标类提案(goal_breakdown/study_plan)的宿主刷新不在本单射程**(order 只点笔记与卡),如需另立。
- 测试 `AgentPanel.adoptionRefresh.test.tsx`(真实 AgentPanel + 真实宿主页 + 真实 store,只 mock HTTP)2/2:
  - 项目页采纳笔记提案 → 新笔记即时出现;
  - 卡组页采纳卡提案 → 卡即时出现。

### 修三(A-15):`list_notes` + 诚实条款

- **⚠️ 命名撞车(申报)**:`TOOL_REGISTRY` 已有一个**公开 MCP 工具 `list_notes`**(course_id 必填,返回完整 note 行,无上限)。注册表禁止重名(manifest 生成直接抛错)。为保留单上指定的名字,Agent 侧 `list_notes` 走与 `list_decks` / `list_cards` 同一条 legacy 定义路径(definitions + executor switch + `READ_TOOLS`),不进注册表、不动 manifest。两者分属 Agent chat 与 MCP 两个面,命名空间不交叉;如设计更愿意改名(例如 `list_project_notes`),只改三处字面量和测试。
- **行为**:
  - 返回 `{course_id, notes:[{id,title,note_class,updated_at}], total, truncated, note?}`,只含 active 笔记,`updated_at` 倒序(同刻按 rowid),上限 50,超限给 total 与一句说明;
  - ⛔正文与描述;
  - 他人项目一律 `Project not found`。
  - 「当前项目」由服务端从语境提示解出(note_view / deck / board_view 所在项目,只认本人对象),经 `AgentActionContext.contextCourseId` 传入,只作读默认值,不构成授权。**项目页本身不发语境提示**(AgentContextHint 无 course 型),所以在项目页需要模型自己传 course_id;无语境时返回「course_id is required…call list_courses」。如要在项目页也缺省,需加一个 hint 类型(client/shared 契约改动),建议另立。
- **definitions 描述**写明「无正文,用 id 走 read_note」以及「空列表只代表该项目无 active 笔记」。
- **诚实条款**放在 `## Things You Must NEVER Do` 末尾(英文一行,追加式),未放进「宣称纪律」:
  - 产品说明区有 ≤2000 token 的声明预算,原状已约 1982,中文条款会推到 2182,我不擅自抬预算;
  - 该段在产品说明区之外,已用断言锁定「条款不进产品说明」;
  - 措辞:不得据空结果或越界结果断言内容不存在,列笔记用 list_notes(正文 read_note),如实说明无工具可做的事(如按正文搜笔记)。
- **冻结登记**:`v14AgentKnowledgeProjection` 的移除链加入 F8 行,base hash `44affa4b…` 仍复现;`v14ContextHint` 新增条款断言。`v14ClaimReceipt` / `v14UiCommands` 里钉死的工具计数 43→44、READ 22→23,是有意的新增绊线,已更新并注明 F8。
- **知识门**:说明书「能」段补 list_notes 条目,并修正 F5 后已失效的「(⚠️只见材料库)」;状态头日期改为 2026-11-01;`check:agent-knowledge -- --update` 显式更新指纹(6db84dc9…)。
- 测试 `vpsF8ListNotes.test.ts` 6/6:定义与分类 / 只列身份不含正文、排除 trashed、DB 字节不变 / 课程过滤 / 上限 50 与总数 55 / 语境缺省与无语境报错 / 跨用户隔离(显式参数与语境两路)。`search_documents` 不变:`vpsF5SourceDiscovery` 全绿。

### 修四:「Source locked」标签错配

- `NoteChromeLayer` 新增必填 `sourceLocked`,由运行时控制器取 `sourceProjectionPolicy.contentReadOnly` 经 layer props 传入。锁标签与回收站「Source-projection blocks…」说明只看它。瞬时忙态仍置灰原控件,只在工具条上标 `aria-busy`,没有任何文案。
- 用例:忙态(`contentReadOnly` 真、`sourceLocked` 假,即转标题期间的形状)时不出现「Source locked」且 `aria-busy=true`;真 Source 锁时出现。chrome 文件 20/20。

### 测试与对照(实跑实报)

- **阳性对照 ×3**,均已还原并核验无残留:
  - 关采纳刷新 → 两条采纳用例红;
  - 摘 list_notes 执行分支 → 五条列举用例红;
  - 去 Save 加载门 → 两条晚到用例红。
- **client 回归**:191 文件,2098 pass / 1 fail。唯一失败是 PaginationProjection 满载 5000ms 超时(老面孔),单跑 5/5。
- **server 定向**:Agent / 读面 / 冻结 / F 系列 / MCP / trash 共 17 文件全绿。v2McpTransport 在一次与 vitest 并跑时出现测试进程 IPC 反序列化异常(非断言失败),单跑 49/49。
- **门禁**:`check:agent-knowledge` PASS、`check:tool-face-manifest` 未过期、`test:agent-knowledge` 29/29;tsc client 0、server 87(基线);`git diff --check` 干净。

### 环境与纪律申报

- 临时实例启动配置已原样还原(diff 0);数据只在我的 scratchpad 库;scratch 账号的 provider 在实测中改过,已改回 DeepSeek。
- **工作树里 `docs/brainstorm/field-tests/round-02/` 的两处修改与四张新截图(58–61)不是我改的**(应为 Tester 会话),未触碰,收割时请分开。其中截图 59 文件名为「f7-heading-enter-kept-but-display-order-diverges」,疑似 F7 复测新发现,提请留意。
- 未读 `.env`;无 git 写操作;无真实模型调用;无用户库接触;未动依赖或锁文件。

## Main_Designer 收口 — 2026-11-01

- **实质验收**:HQ 复跑 server 85/85(含绊线与冻结套件)+client 79/79+tsc 双零基线;三阳性对照照单全收;门禁三件(agent-knowledge/tool-face-manifest/29 绊线)PASS 采信;
- **四项申报裁定**:①list_notes 名称保留、走 legacy 定义路径(两个面命名空间不交叉,改名不值得);②诚实条款英文置 Never-Do 段——不擅抬 2000 预算的处置正确,条款位置与断言锁定核准;③目标类提案的宿主刷新与项目页 course 语境提示=两条候补件记档,⛔本轮展开;④说明书与知识指纹的显式更新(含修正 F5 后失效的旧注)正合 steward 规矩;
- **范围卫生**:Tester 在途重组的 round-02 文件与截图 58-61 不随本批收割(builder 申报提醒生效,分开处理);截图 59 所示 A-16(显示序≠存储序)已在案候 F9;
- F8 全单闭合,随收口第十轮部署。

### 补充令之一、之二(Main_Designer 2026-11-01,完工后到达)执行情况

**上游**:Main_Designer 补充令两道(源自 Tester 只读复核)。到达时四修已完工并回执;下列为按补充令的增量。

- **③ 修一扩范围**:三处(Provider 写错、Agent 名失焦回写 Mr. Zero、向量模型被重置)本单原交付里已经同修,见上文修一。时序与补充令之二所述一致:请求只在 active_provider 为空时发出,user 晚到后 effect 直接 return。无需增量。按指示不带数据修补(运维侧已核零误写)。
- **① 修三改「复用」**:Agent 的 `list_notes` 改为**直接调用与项目页、公开 MCP `list_notes` 同一个 `listNotes` 服务**(services/notes.ts),不再自写 SQL,所以 Agent 看到的就是人看到的那张表。在其上只做三件 Agent 专属的事:投影成 id/title/note_class/updated_at(`note_class` 区分 Source 投影与自写);上限 50 加 total/truncated;语境缺省 course_id。
  - **没有把注册表里那个 public 条目原样开给 chat**,理由:它 course_id 必填、返回整行(含 description/metadata)、无上限,与 F8 原单的「上限 50、超限注明、缺省当前项目」规格冲突,对大项目会把整表塞进上下文。
  - `get_note` / `list_note_blocks` 未开放:正文已有 `read_note`(分页、截断声明)覆盖,再开一条整块读路会出现两条正文通道。
  - 名字仍是 legacy 定义路径上的 `list_notes`;注册表重名约束不变。
  - 标题过滤未加(补充令标「可选」)。
- **② search_documents 诚实度**:
  - 定义描述改为如实:documents 有嵌入时语义,另有全文/文件名关键词;Sources **仅名称/关键词,非语义**。query 参数说明同步改。
  - **`total` 成因坐实**:原返回 `total: results.length` 只数 documents。只有 Source 命中时是 `total: 0` 配非空 `source_results`,模型容易读成「没找到」。现改为分列 `document_total` 与 `source_total`。
  - 空结果 message 改为「这些词没命中,不能证明内容不存在;Source 按关键词匹配,可换更短或更准的词」。
  - F5 用例补断言:Source-only 命中时 document_total=0、source_total=1;空库时两个总数皆 0 且新 message。
  - 阳性对照:回退成单一 `total` 时该用例红(`positive-control-search-totals-reverted.log`),已还原。
  - 冻结提示词中 Document Questions 段那句「uses semantic similarity; relevant_chunks…」说的是 documents 的 chunk 路,对其仍成立,未动。
- **④ A-13 分词**:未展开(按令)。空结果 message 只提示「换更短或更准的词」,不改匹配逻辑。
- **说明书**:list_notes 条目注明复用同一服务,search_documents 注明分列总数。工具名集合未变,知识指纹无漂移(PASS 6db84dc9…)。
- **复跑**:server 定向 7 文件 101/101;tsc server 87 基线;`git diff --check` 干净。
- **补充令之二 ③(F7 拖柄 Turn into 补测)**:截至本回执未收到补测结果。如回红,按令在本单附申报,不自行扩射程。
