> **状态 (Status)**: active(**活文档,持续追加**)
> **层 (Layer)**: 分析 / Analysis(Claude 工作区)
> **日期 (Updated)**: 2026-08-16
> **权威 (Authoritative)**: 否(登记与调研结论;采纳一律另行拍板)

# 外部候选登记册(External Candidate Registry)

> **协议(Henry 2026-08-16 定)**:对话中每出现一个外部工具/harness/skill 候选,**边说边调研、查过即登记,永不重查**。每条含:身份/许可/形态判定(点菜型=可约束到我们的组件词汇 vs 下厨型=直接产血团)/候选位置/核验状态/结论。深度调研档案另存时在此留指针。
> **配套教义**:三层不绑架(大脑/穿戴者/外骨骼);穿戴者只许点菜不许下厨;fork 纪律=pin 版本、最小 diff、skill 优先于手术。

## 一、穿戴者候选(harness,接 MCP 工具面)

| 名称 | 身份/许可 | 形态与位置判定 | 核验状态 | 结论/去向 |
|---|---|---|---|---|
| **OpenClaw(小龙虾)** | `openclaw/openclaw`,386.6k★,"personal AI assistant... The lobster way 🦞";含会话循环/记忆/skill/工具调度/多渠道网关 | 编排 harness → **外部管家层的现成身体**(08-08 卷 §三之二);修修改改=改装而非自造 | ✅ **许可已证:MIT**(2026-08-19 直读 LICENSE 文件确认,OpenClaw Foundation 版权;先前 GitHub API NOASSERTION 系误报)——fork 前置闸解除 | 管家层首选改装底;三条边界纪律已钉;许可复核=fork 前置闸 |
| **OpenCode** | `anomalyco/opencode`(SST 系,org 改名 Anomaly),**MIT**,~199k★,v1.18.18(2026-08-13)近日更 | 供应商无关 client/server 编码 agent——**工程穿戴者候选(强)**;亦可作组件工坊工程师 | ✅ 已核验(2026-08-18,wf_a45fab67) | 穿戴者候选池在册;Agent 版评测轴对照项 |
| **Open Design** | `nexu-io/open-design`(open-design.ai,官方别名含 OpenDesign/OD),**Apache-2.0**,88.5k★,2026-04 创,v0.19.2 活跃。**架构=harness 驱动器**:本地 daemon(Express+SQLite!)+Electron+`od` CLI,把 ~27 家编码 agent CLI(Claude Code/OpenClaw/OpenCode…)当"设计引擎"驱动;agent 直接写真实 HTML/CSS 文件;导出 HTML/PDF/PPTX/MP4;带 stdio MCP server+插件体系(277 官方插件,采 SKILL.md 约定) | **判定:默认下厨型**(本体就是让 agent 写 HTML 文件);约束机制=design-system 包(DESIGN.md 品牌契约+tokens.css+组件 fixtures,151 个品牌包;0.19.2 起"Design System 3.0 结构化运行时"在硬化)——**软约束(prompt 契约+token),非 schema 强制** | ✅ 已核验(2026-08-18);同名消歧:manalkaff/opendesign(245★ skill 包,趋停)与 open-codesign(7.7k★)为别项目 | **不作投影管线件**(投影必须从对象 schema 强制编译);三个正确用途:①**逆向车间/样式工坊台**(驱动多 harness 出 token 包与组件设计提案→慢道);②其 **design-system 包格式=我们订单规格/token 包格式的先行艺术**(151 包=格式判例,值得研读);③其本地 daemon+驱动 CLI 架构与我们同构=形态旁证 |
| **Claude Code / Codex** | 商业 harness(现役开发双侧) | 现役工程穿戴者;Agent 版评测轴的基准参照 | 日用中 | harness 跑分基准 |

## 二、生成时品味 skill(已采购,详见 [2026-08-07-cloud-server-survey](2026-08-07-cloud-server-survey.md) 同期的 [07-18 工具栈调研](2026-08-07-cloud-server-survey.md))

> 完整核验档案:`analysis/2026-07-18-v12-ux-tooling-survey.md` + 安装单 `handoffs/2026-07-18-v12-ux-tooling-stack.md`。此处只留索引。

| 名称 | 一句话 | 状态 |
|---|---|---|
| **impeccable**(pbakaus,47.8k★,Apache-2.0) | product register+七态规则+46 规则无 LLM 检测器;双发行 Claude+Codex=公共设计词汇 | 已核验,安装单在册(pin v3.9.1) |
| **redesign-existing-projects**(Leonxlnx 家族) | 既有应用 Scan→Diagnose→Fix,不换栈不破坏功能 | 已核验,安装单在册 |
| **emilkowalski/skills**(17.3k★) | 动效轴唯一覆盖(时长带/缓动/scale≥0.9);⚠️ 只按动效包采纳 | 已核验,安装单在册 |
| **web-design-guidelines**(vercel-labs,29.2k★) | 100+ 规则机械审计,file:line 违规 | 已核验,安装单在册 |
| ⚠️ **Leonxlnx 旗舰 / frontend-design 整包** | 明文只管 landing page,排除 editors——**明确不装** | 已核验排除 |
| ❌ **ui-ux-pro-max**(107k★)/BackstopJS/lost-pixel | 虚火 greenfield 选择器 / 停更 / 已归档 | 已核验排除 |

## 三、专用工具(一次性/管线件)

| 名称 | 一句话 | 状态 |
|---|---|---|
| **senlindesign /taste**(238★) | 参考站点逆向→token 包+设计原则("品味分析器");**逆向车间样式层的现成件**(08-16 卷 §六) | 已核验;Agent 版取用 |
| **browser-harness**(browser-use) | CDP 直连真 Chrome,拖拽/上传技能库;已装 `_external_tools/` | 已核验,日用 |
| **Playwright test + toHaveScreenshot / playwright-mcp** | 视觉回归基线 / Codex 的眼睛 | 已核验,第二批安装位 |
| **compute-engine + Mafs**(MIT×2) | 公式→交互图管线(表示变换第一员);⚠️ Desmos/GeoGebra 非商用陷阱明确不碰 | 已核验(08-04 卷 §二十) |
| **axe-core / DevTools Recorder / chrome-devtools-mcp** | a11y 注入 / Henry 录黄金流程 / canvas 卡顿排查(缓装) | 已核验,分批在册 |
| **TiddlyWiki(模式参照)** | 单文件自编辑自保存 HTML 的二十年先例——homing projection 的可行性背书 | 模式参照,非依赖 |
| **Obsidian / JSON Canvas(模式参照)** | 四可取(零仪式双链入口/file-over-app→工程包赎回/jsoncanvas.org 开放画布格式=工程包画布部分先行艺术/插件生态=组件成长路径人类版)+两警示(囤积症展览馆→目的=终止条件反证;Markdown 无块身份=其十年之痛恰为我们地板)+一实惠(旧 vault=.md 走 Source 零阻力,双链转关系候选)。定位:它=文件里的真相,我们=真相投影成文件 | 模式参照(2026-08-18);工程包设计时读 JSON Canvas 规范 |
| **Obsidian 可用性判定(追问回填)** | ⚠️ **本体闭源**(专有 Electron,个人免费)——非 OpenClaw 族:不可嵌不可 fork,进不了穿戴者池与组件库 | 可用仅三边角:①**导出口味+1「vault 变体」**(Purpose/Project→.md 文件夹+frontmatter+双链降维+块 ID 注;逃生舱可信度实物化;**铁律严格单向**,双向同步=两真相陷阱明确不做);②旧 vault 导入(被动);③JSON Canvas 规范(已记)。桥接插件停车场;当过渡期主力不值(无 AI 闭环,不解决 artifact 工作流完胜的那个差距) | 判定完结(2026-08-18) |
| **Pix2Text-MFR / TexTeller 等本地识别** | ⚠️ 随 08-07 云化拍定**作废**(改走前沿 VLM 同缝) | 已核验后作废 |


## 三之二、抽取器与 UI 原语(2026-08-18 回填,wf_80ebd521)

### 便宜机械抽取道(层0/层1;验收标准=给不给坐标/页码)

| 名称 | 身份 | 判定 |
|---|---|---|
| **MarkItDown**(微软,Henry 半记之名确认) | MIT,174.5k★,Python,活跃 | ⚠️ **锚测不合格**:PDF 路径输出扁平 Markdown,无页码无坐标(自述"非高保真");只当**快速 Markdown 预览件**,不当道骨干 |
| **pdf.js / pdfjs-dist** | Apache-2.0,53.7k★,Node 原生进程内 | ✅ **PDF 道首选**:每文字项带 transform 坐标+页码白送,确定性,CJK 好;只给几何不给语义(语义归 VLM 道,正确分工) |
| **mammoth.js** | BSD-2,6.3k★,Node 原生 | ✅ **DOCX 道首选**:样式映射出语义 HTML/Markdown;无坐标——但 **DOCX 是流式格式无真页面几何,元素路径+偏移才是它的正确锚模型** |
| **SheetJS / JSZip+XML** | Node 原生 | ✅ Excel(**单元格地址天然是锚**)/PPTX(slide+EMU 偏移=原生锚) |
| **Kreuzberg/Xberg** | MIT,9.1k★,Rust 核+官方 TS 绑定,101 格式 | 🔍 野牌:自称最快 doc→Markdown;**坐标输出未文档化——1 天 spike 验证后才许采纳**;v1 刚改名有 API 抖动险 |
| unstructured(fast 档) | Apache-2.0,15.3k★,Python sidecar | 备选:统一元素 JSON(带 page_number+bbox);依赖树重、厂商转付费平台 |
| Apache Tika(server) | Apache-2.0,20 年老兵 | 长尾兜底 sidecar(1000+ 格式;分页有坐标无) |
| Docling | MIT,65.1k★ | ❌ 不属此道:生数字 PDF 也跑 ML 布局模型——它和已定的 VLM 道竞争,非便宜机械道 |
| PyMuPDF | **AGPL 毒丸** | ❌ 许可门挡(除非买商业证);Pandoc 无 PDF 输入;Extractous 停更——皆跳过 |

**架构结论**:无单件同时满足多格式+结构+坐标+Node 原生 ⇒ **按格式配 Node 原生机械抽取器,统一写进我们自己的层0 schema(锚契约我们own)**;Tika/unstructured 作可选长尾 sidecar。**重要设计输入:锚模型是格式原生的**——PDF=页+bbox,DOCX=元素路径+偏移,XLSX=单元格地址,PPTX=slide+形状偏移;"多记坐标"须按格式各记各的坐标系。

### UI 原语与组件库(app chrome + 组件语言地板;教义=own the code/a11y 强/token 驱动/现用 CSS modules)

| 名称 | 身份 | 判定 |
|---|---|---|
| **Base UI** ⭐首选 | MIT,~10.7k★,ex-Radix 团队在 MUI 全职造,v1.0(2025-12);2026-07 起 **shadcn 默认原语**;Paper/Zed/Unsplash 在产 | ✅ **行为原语直用+我们自己的 CSS modules 皮+我们的 token**——唯一允许的行为依赖,markup/视觉 100% 自有,零 Tailwind |
| **React Aria Components**(Adobe) | Apache-2.0,50+ 组件,NVDA/JAWS/VoiceOver/TalkBack 全测 | ✅ a11y 深度之最,样式无关;API 较重——a11y 优先时的替补首选 |
| **shadcn/ui** | MIT,121.6k★,已进化为"代码分发平台"(CLI 拷源进仓+registry 体系+MCP server) | ⚠️ **成套采纳=采纳 Tailwind**(样式层纯 Tailwind,无官方 CSS modules 路径)——不成套用;**两个可挖件**:MIT 参考实现随便抄;**registry 格式=我们案例库/组件语言分发的先行艺术** |
| Ark UI | MIT,Zag 状态机,样式无关 | 备选第三原语 |
| Radix 直用 | MIT,WorkOS 接盘再投资 | 老兵可用,但原班人马已去 Base UI——新采纳动能不在此 |
| Mantine | MIT,活跃,讽刺地内部用 CSS modules | ❌ 成品 npm 依赖模型违 own-the-code |
| Park UI / HeroUI / Catalyst / daisyUI | — | ❌ 各违一条(Panda CSS 二套样式系/成品依赖/付费闭源/纯 CSS 无行为) |

**⚠️ a11y 诚实注**:任何原语只修角色/焦点/键盘/aria 状态;**"按钮无名"是署名纪律,库不救**——配 eslint-plugin-jsx-a11y 强制。

## 三之三、MCP 工具面协议栈（2026-08-20 回填，必修① 前置调研）

> **登记缘由**：此前本册只有「**别人的** MCP server」条目（playwright-mcp / chrome-devtools-mcp / shadcn registry / Open Design stdio server）；**MCP 协议本体、TS SDK、guard-consent 模式从未登记**。V2.BN.12 必修① 首次需要它，故按协议「查过即登记」立此节。
> **调研盘全文**：`2026-08-20-mcp-tool-face-survey.md` §2。
> ⚠️ **事实来源**：2026-08-20 外部检索，**非训练知识**（知识截止早于 2026-07-28 修订版）。已由 Fable 独立上网复核，与官方 changelog 一致。

| 候选 | 现状（2026-08-20 核） | 判定 | 用途 / 注 |
|---|---|---|---|
| **MCP 协议本体** | **2026-07-28 修订版**（自发布以来最大一次）：**无状态核心**（移除协议级 session 与 `Mcp-Session-Id`，list 端点不再随连接变化）· ⭐ **MRTR 工具级 elicitation（SEP-2322）**：server 返 `resultType:"input_required"` + 待答请求，client 带 `inputResponses` 重试原调用 · 缓存 `ttlMs`/`cacheScope`（SEP-2549）· MCP Apps（server 渲染 UI）/ Tasks（长任务）扩展 · **正式弃用策略** | ✅ **采纳为工具面协议** | 无状态核心与我们「后端保持服务形态」天然契合，工具面可直接架在现有 Express 上，**不必为 MCP 引入会话层**；**MRTR 是宪章 §8 三档放行里「需确认」档的协议原生落点**（最难自造的那档已是协议一级公民）；弃用策略与待拍-4「格式即承诺」同构 |
| **`@modelcontextprotocol/sdk`（官方 TS SDK）** | `StreamableHTTPServerTransport` 可架于 Express 之后 | ✅ 采纳候选 | 与既有 Node + Express + TS 后端同栈，无新语言/运行时 |
| **MCP 授权模式** | `/.well-known/oauth-protected-resource`（RFC 9728）· bearer + RFC 8707 resource indicators · **每个 tool handler 内部检 `authInfo.scopes`** · Origin/`allowedOrigins` 保护（自建 transport 时 **Host header 校验须自实现**） | 🔍 **形态参考，非成套采纳** | 我们是本机/私有云单用户，OAuth 全套未必需要；**但「每个 handler 内检 scope」的形制值得照搬** —— 它把守卫放在最靠近操作的地方，与「工具 + 守卫 + 收据」同构 |
| **外部守卫教义** | **「工具输入来自 LLM，不是直接来自用户 —— 一律当不可信」**；通用清单：校验 · 认证 · 限流 · 超时 · 允许清单 · 审计日志 | ✅ **采纳为守卫层前提** | ⭐ **它改变了红线的读法**：「同门同钥」保证**权限对等**，**不保证输入可信度对等** —— 人点按钮的输入过 UI 约束，LLM 调工具的输入是模型生成的字符串。与宪章 §6「外来导入 JS 永不执行 / 请求出身不同待遇不同」是同一纪律的两次出现 |

**来源**：[2026-07-28 规范](https://blog.modelcontextprotocol.io/posts/2026-07-28/) · [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog) · [TS SDK](https://github.com/modelcontextprotocol/typescript-sdk) · [Authorization 教程](https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/authorization) · [Server Guide V2](https://ts.sdk.modelcontextprotocol.io/v2/documents/Documents.Server_Guide.html)


## 三之四、模型血统冗余（2026-08-21 回填；调研全文 `2026-08-21-builder-lineage-redundancy-survey.md`）

> **缘由**：Codex 周额一天用掉 75%（昨日 34 场 / 1,627 万 tokens），Henry 要备胎。
> **价格与实耗**由 Fable 亲查，见 `claude-log/2026-08-21.md` 条目 2；本节只登能力/接入/订阅关系。

| 候选 | 现状（2026-08-21 核） | 判定 | 用途 / 注 |
|---|---|---|---|
| **GPT-5.3-Codex-Spark** | **延迟优先服务档**（跑在 Cerebras WSE-3），**128K 上下文**、**纯文本**、**研究预览**；**无 API，仅 Pro 套餐经 Codex 可用** | ⚠️ **备胎资格存疑，须实测** | ⛔ **官方称「独立 rate limit 不计入标准额度」，但实现不符**：`openai/codex` **#19868**（主额度 0% 时 Spark 100% 仍被挡）**closed as not planned**；#20122 并入其中；#33216 称 Spark 计量器成功使用后仍显 100%。**⇒「5.6 用完再切 Spark」在文档记载上不成立**。适合面：机械级修正轮 / 小单；**不适合大单与复核岗**（128K 装不下通读全链） |
| **Grok 4.6（复核岗）** | SuperGrok **不含 API 额度**，xAI API 需另开 `console.x.ai` 按 token 计费（**二手一致，非官方原文**） | 🔍 **复核岗备胎候选** | 异血统在复核岗是**独立性**不是分叉；⚠️ 接 Codex 需网关（见下），工具调用可靠性**未核到当前代次** |
| **Gemini 3 Pro（复核岗）** | **官方原文**：Google AI 计划的开发者福利**只在 AI Studio 网页界面内**生效，「直接使用 Gemini API（API key / 外部应用）**单独计费与管理**」⇒ **订阅不含 API 额度** | 🔍 **复核岗备胎候选** | 同上；两家**并列未分先后** —— 决定性变量是工具调用可靠性，未核前排序等于猜 |
| **Codex CLI 自定义 provider（接入形制）** | CLI **硬编码假设**对端说 **OpenAI Responses API**；直连 Anthropic/Google 端点 → **401 或畸形 function-call 块**；通行解法是**架 AI 网关**翻译请求体与 tool-call JSON。⚠️ **自定义 provider 会移除正常 Codex/OpenAI 模型目录 ——「看起来像扩展点，行为上是完全覆盖」** | ⚠️ **有真实门槛** | ⇒ 「builder 用 5.6 / 复核用 Grok」同装并存**需配置隔离**，形制未核。网关本身经手 API key 与全部代码上下文，**属供应链信任面**，采纳前须单独评估 |

**⭐ 一条反直觉结论（值得记进选型直觉）**：对**备胎**用途，「套餐内更省心」是错的 —— 套餐内的 Spark **会用完且与主力共用同一道配额闸**（失效时刻与主力重合，这是备胎最不该有的性质）；**API 按量不会用完，只会花钱**。**备胎的价值不在便宜，在于不与主力共享失效模式。**

**⚠️ 已知不覆盖**：builder 岗的**故障类风险**（账号锁 / CLI 版本死锁 / 区域不可达）目前**无覆盖** —— Spark 同门共用全部这些绳子，第三方线按裁定只用于复核岗。这不是反对该裁定（代码风格一致性是真约束），而是**该记成已知缺口而非留白**。先例：2026-08-19 builder 首启失败（账号档位与 CLI 版本耦合成死锁）。


## 四、待办

- [x] OpenDesign/OpenCode 已回填(2026-08-18);
- [x] 抽取器道+UI 原语道已回填(2026-08-18,wf_80ebd521);
- [ ] Kreuzberg/Xberg 坐标输出 1 天 spike(采纳前置);
- [ ] 研读 shadcn registry 格式(案例库分发先行艺术);
- [x] OpenClaw 许可已证 MIT(2026-08-19,直读 LICENSE);
- [ ] Agent 版评估期:OpenClaw 架构实查(gateway 形态/skill 体系/MCP 客户端能力);研读 Open Design 的 design-system 包格式(订单规格先行艺术);
- [x] **MCP 协议栈已回填(2026-08-20,必修① 前置;Fable 独立复核)**;
- [x] **模型血统冗余已回填(2026-08-21)**;
- [ ] **Spark 配额闸实测**(建议在周额未到 100% 时验:`/status` 两表是否独立走数 + 小单实跑);
- [ ] **Grok/Gemini 当前代次的 Codex 工具调用可靠性实测**(未核前不排序);
- [ ] 新候选出现时:先查本册,未登记才调研。
