> **状态 (Status)**: active
> **层 (Layer)**: 分析 / Analysis（Claude 工作区）
> **日期 (Updated)**: 2026-07-18
> **权威 (Authoritative)**: 否（工具调研结论;采纳决定待 Henry 拍板后进 V12 概念稿）

# V12 体验侧工具栈调研（2026-07-18)

> 背景:Henry 点名 browser-harness / taste / impeccable 三样,并要求扫描 GitHub 高分同类。
> 方法:4 路并行研究 + 每个候选独立存在性核验(拉取真实仓库/npm 原文比对),共 18 agents。
> 所有 star 数与活跃度为 2026-07-18 实测值。

## 一、Henry 点名的三样——判定

### 1. browser-harness（browser-use 出品,已装于 `_external_tools/browser-harness`)——✅ 收,改变一个既定假设

- CDP 直连真 Chrome,一条 websocket,无截图—猜坐标循环;agent 可在执行中自写缺失 helper(`agent-workspace/agent_helpers.py`)。
- 自带交互技能库正中我们痛点:**拖拽、上传、对话框、视口、shadow DOM、iframe、网络请求**——拖拽与上传恰是截图式操作最弱、我们(画布/Source)最核心的两个动作。
- **动摇的假设**:"Claude 只做简单短流程"的依据是截图式浏览器限制;CDP 直连后我可承接的流程复杂度上一个台阶。Henry 的长流程分工不变(人类体感无可替代)。
- 纪律:默认连用户正开着的真 Chrome——测试必须用独立 profile/窗口,不碰 Henry 的标签页。

### 2. "taste"——同名之下有三个东西,旗舰对我们是个陷阱

| 仓库 | 规模 | 判定 |
|---|---|---|
| **Leonxlnx/taste-skill**(大名鼎鼎那个) | 64.9k★,2026-02 创建,Vercel OSS 赞助 | 旗舰 skill(design-taste-frontend)**明确自我声明只管 landing page,显式排除 dashboards/data tables/editors——就是排除我们这类产品**。整包装上会把落地页审美压到应用 UI 上。可取件:anti-slop 禁令表、三个 1-10 拨盘词汇(VISUAL_DENSITY 尤其)、pre-flight checklist 模式 |
| 其中的 **redesign-skill** 变体 | 同仓 | **家族中真正契合我们的一件**:Scan→Diagnose→Fix 既有应用,明文"不换栈、不破坏功能、每改必测",审计面覆盖 sidebar/空态/数据密集 UI。给 Codex 的 polish 轮用 |
| **senlindesign/taste-skill**(同名不同物) | 238★,活跃 | `/taste <url>` 逆向参考站点→输出 Design Map(精确 token)+ "Taste DNA"(原则+trade-off)。**品味分析器不是风格管教器**:可拿它从 Linear/Notion/Craft 提炼我们的成文参考文档,喂给 design-system 和 Codex handoff |

另:研究中证实与"taste"高度混淆的 **emilkowalski/skills**(见下)其实是内容契合度最高的一家。

### 3. impeccable（pbakaus,jQuery UI 作者)——✅ 本轮单件最高价值

- 47.8k★,Apache-2.0,v3.9.1,发布当天仍在推(活跃);明文承认"从 Anthropic frontend-design 出发"的继任者。
- **双 register 是关键**:brand(营销面,设计即产品)vs **product(应用面,设计服务产品,标准='earned familiarity'——Linear/Figma/Notion 用户是否立刻信任)**。product register 的规则表正对我们:单一无衬线、150-250ms 过渡、动效只示意状态、**每个元素七态齐全(default/hover/focus/active/disabled/loading/error)缺一即视为未完工**、skeleton 优于 spinner、禁自定义滚动条/重造 modal。七态规则 = 🅱 友好度总账的现成检查表。
- **46 规则确定性检测器**:`npx impeccable detect client/src/`(静态扫 JSX/TSX/CSS)或 detect <url>(活页),**无 LLM 无 API key**;可装 hook 在 UI 文件被改后自动跑。**这是"可执行手册"哲学在设计层的对应物——设计 lint,机械收据。**
- **双 harness 发行**:同一 skill 装进 Claude Code 和 Codex CLI(reference/codex.md 实存)——两个 agent 共享一套设计词汇,品味教义的"两个品味留缝"有了公共语言。
- 边界与注意:检测器只见 DOM/CSS,**canvas 内绘制物不可见**(canvas 内容审美仍走 harness 截图循环);与 design:* 词汇有重叠(评审口径归谁要定);OKLCH 等 opinionated 默认须让位于既有 token(它自己的工作流第 3 步也这么说);版本快跑,**采纳时 pin 版本**;需先 `/impeccable init`(要 PRODUCT.md)。

## 二、研究队另挖到的(按契合度排)

| 工具 | 规模/信誉 | 判定 |
|---|---|---|
| **emilkowalski/skills** | 17.3k★;Sonner/Vaul 作者,animations.dev | ✅ 收。**动效轴——现有栈(design:* 全家)完全未覆盖的轴**。时长带(按钮反馈 100-160ms/dropdown 150-250ms/硬上限 <300ms)、缓动流程图("UI 永不 ease-in")、scale 从 0.9 起不从 0 起。正对 canvas 对象过渡、面板开合、拖拽反馈。review-animations 给 UX 评分一把动效尺子;animation-vocabulary 让给 Codex 的动效 spec 有精确词汇。注意:核验发现其宣传中"排版规则"不实(仓内纯动效),只按动效包采纳 |
| **vercel-labs/agent-skills → web-design-guidelines** | 29.2k★,Vercel 官方 | ✅ 收。100+ 规则机械审计(a11y/焦点/表单/动效/排版/响应式),**file:line 引用违规**——打眼审查的机器助手,不开浏览器即可扫 client/src。盲区:canvas 指针交互。注意:规则文档运行时联网拉取 |
| **Playwright `toHaveScreenshot`** | Microsoft,事实标准 | ✅ 收(12.x 起)。**视觉回归基线——browser-harness 唯一真缺口**(有截图无基线/diff/断言)。固定视口+种子数据+容差应对 canvas 抗锯齿抖动。正好承接"旅程脚本化=体验层契约测试"的构想 |
| **playwright-mcp**(microsoft 官方) | 35.2k★,当天仍在发版 | ✅ 收,但定位明确:对 Claude ~70% 冗余(已有内置浏览器+harness);**真正价值 = Codex 的眼睛**(Codex 无内置浏览器)+ `--caps=testing` 把探索会话固化成 Playwright 定位器/断言 |
| **axe-core** | Deque,v4.12.1 活跃 | ✅ 收(零新组件):经 harness 的 js() 直接注入 axe.min.js 即可;WCAG 机械扫描补 design:accessibility-review 的判断盲量。跳过付费 axe MCP 与社区包装 |
| **DevTools Recorder + @puppeteer/replay** | Chrome 内置 | ✅ 采纳做法(零安装)。**唯一"Henry 亲手示范"的工具**:你把黄金流程做一遍,导出可版本化 JSON,agents 重放+逐步截图。与你的长流程角色天然配对——路线册的"预期旅程"可以由你亲手录制而非仅文字 |
| **OneRedOak design-review** | 3.3k★,2025-09 后停更 | 📖 抄方法论不装:分阶段清单(交互流→响应式→视觉→WCAG→健壮性)+ "设计原则文档为评审权威"模式,移植到 harness 上;仓库本身停更且绑 Playwright MCP |
| **chrome-devtools-mcp**(Google 官方) | 47.1k★ | ⏸ 缓:浏览器控制面与现有栈全冗余;唯一不冗余件=**性能 trace 自动洞察**("拖 50 个对象时卡在哪")。首次 canvas 卡顿排查时再装 |
| **anthropics frontend-design** | 677.9K 安装,官方 | 选择性用:生成时品味的生态默认件,但调性偏大胆 boutique;知识工具要安静,只当词汇/镜头用,不整包压上 |
| **ibelick/ui-skills → fixing-motion-performance** | 4.8k★ | 选择性收这一件:compositor-only/layout-thrash 审计,canvas 顺滑度的 CSS 侧;其 a11y 件与现有重复,跳过 |
| **ui-ux-pro-max** | 107k★(!) | ❌ 跳过:greenfield 风格选择器,虚火(病毒式传播≠评审级品味);我们已有既定设计语法。唯一可挖:其 98 条 UX guidelines 数据库当审计清单原料 |
| **design-for-ai** | 255★ | 📖 教义库偶查:journey-mapping/行为设计章节 + "抛弃式 mockup"阶段(Claude 先渲 disposable 原型对齐 Henry 再写 spec)值得借 |
| **BackstopJS / lost-pixel** | stale 2024-09 / **已归档** | ❌ 跳过(证据确凿的死物;toHaveScreenshot 全覆盖) |

## 三、拼图(更新版工具栈)

```text
生成时(Codex 施工):   impeccable(product register)+ redesign-skill + emilkowalski 动效规则
                        ← senlindesign /taste 提炼的参考文档 + 我们自己的设计语法(压倒一切)
机械闸(无 LLM):       npx impeccable detect(hook 在 UI 改动后)+ axe 注入 + web-design-guidelines 扫描
评审时(Claude 审计):  design:* 全家 + emil review-animations 尺子 + harness 截图循环(canvas 唯一覆盖者)
回归(12.x 收口):      Playwright toHaveScreenshot 基线套件 ← Recorder 录制的 Henry 黄金流程
Codex 的眼睛:          playwright-mcp
场地:                  本地(部署真相=本地);测试专用 profile+种子/重置脚本
```

分层原理:taste 类作用于**生成时**(Codex 建的时候),design:*/audit 类作用于**评审时**(Claude 审的时候)——不同层,不冲突;唯一要拍的是"critique 口径归谁"(建议:impeccable 词汇为共同语言,design:* 做流程,冲突时本产品 token 与设计语法压倒一切外部默认)。

## 四、安装批次建议(待 Henry 拍)

- **第一批(概念稿前即可装,纯 skill 无运行时)**:impeccable(pin v3.9.1)+ redesign-skill + emilkowalski/skills + web-design-guidelines;senlindesign /taste 跑一次 Linear/Notion 出参考文档。
- **第二批(随 12.x 需要)**:@playwright/test(视觉基线)+ playwright-mcp(给 Codex)+ axe 注入 + Recorder 黄金流程实践。
- **明确不装**:ui-ux-pro-max、BackstopJS、lost-pixel、付费 axe MCP;chrome-devtools-mcp 缓装。
